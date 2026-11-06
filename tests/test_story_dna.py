"""Contract evidence; the public Harbour fixture remains explicitly mocked."""

import copy
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

import pytest
from jsonschema import Draft202012Validator

from src.story_dna import (
    StoryDNAError, dumps_story_dna, loads_story_dna, validate_story_dna,
)

ROOT = Path(__file__).resolve().parents[1]
FIXTURE = ROOT / "tests/fixtures/story_dna/harbour-lanterns.json"


def fixture():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def graph():
    document = fixture()
    document["events"].append({
        "id": "event-next", "participants": ["char-mei"],
        "causes": ["shot-1-1"], "consequences": [],
    })
    document["events"][0]["consequences"] = ["event-next"]
    document["arcs"] = [{
        "id": "arc-test", "event_ids": ["shot-1-1", "event-next"],
        "entity_ids": ["char-mei"], "summary": "Synthetic contract test only",
    }]
    document["open_questions"] = ["Où mène cette lumière ?"]
    document["extensions"] = {
        "secrets": [{"known_by": ["char-mei"], "text": "灯り"}],
        "nested": {"z": False, "a": [None, 1, 1.5, {"label": "é"}]},
    }
    return document


def reverse_object_keys(value):
    if isinstance(value, dict):
        return {k: reverse_object_keys(v) for k, v in reversed(list(value.items()))}
    if isinstance(value, list):
        return [reverse_object_keys(v) for v in value]
    return value


def test_schema_is_valid_draft_2020_12_and_accepts_existing_fixture():
    schema = json.loads((ROOT / "schemas/story-dna-v0.schema.json").read_text())
    Draft202012Validator.check_schema(schema)
    Draft202012Validator(schema).validate(fixture())
    validate_story_dna(fixture())


def test_fixture_matches_existing_harbour_facts_and_mock_provenance():
    document = fixture()
    raw = (ROOT / document["provenance"]["source_path"]).read_bytes()
    blob = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\0" + raw).hexdigest()
    assert blob == document["provenance"]["source_git_blob_sha"]
    source = json.loads(json.loads(raw)["result"]["content"]["text"])
    character, place = document["entities"]
    scene, = source["scenes"]
    shot, = scene["shots"]
    assert document["story_id"] == source["project"]["id"]
    assert document["title"] == source["project"]["title"]
    assert character["id"] == source["characters"][0]["id"]
    assert character["name"] == source["characters"][0]["name"]
    for field in ("role", "goal", "conflict"):
        assert character["traits"][field] == source["characters"][0][field]
    assert place["id"] == scene["locationId"] == source["locations"][0]["id"]
    assert place["name"] == source["locations"][0]["name"]
    assert place["traits"]["purpose"] == source["locations"][0]["purpose"]
    event, = document["events"]
    assert event["id"] == shot["id"]
    assert event["summary"] == shot["action"]
    assert event["order"] == shot["order"]
    assert event["participants"] == shot["characterIds"]
    assert event["location_id"] == scene["locationId"]
    assert document["provenance"]["mock"] is source["metadata"]["mock"] is True
    # The fixture provides neither a causal graph nor a complete narrative arc.
    assert event["causes"] == event["consequences"] == document["arcs"] == []


def test_round_trip_is_lossless_and_does_not_mutate_input():
    document = graph()
    before = copy.deepcopy(document)
    wire = dumps_story_dna(document)
    restored = loads_story_dna(wire.encode("utf-8"))
    assert restored == before
    assert document == before
    assert dumps_story_dna(restored) == wire
    assert "灯り" in wire and "Où" in wire


def test_nested_key_order_and_process_hash_seed_do_not_change_bytes():
    document = graph()
    expected = dumps_story_dna(document).encode()
    assert dumps_story_dna(reverse_object_keys(document)).encode() == expected
    command = [
        sys.executable, "-c",
        "import sys; from src.story_dna import loads_story_dna, dumps_story_dna; "
        "sys.stdout.buffer.write(dumps_story_dna(loads_story_dna(sys.stdin.buffer.read())).encode())",
    ]
    for seed in ("1", "73"):
        result = subprocess.run(
            command, input=expected, cwd=ROOT, capture_output=True, check=True,
            env={**os.environ, "PYTHONHASHSEED": seed},
        )
        assert result.stdout == expected


def test_array_order_remains_meaningful():
    document = graph()
    first = dumps_story_dna(document)
    document["arcs"][0]["event_ids"].reverse()
    second = dumps_story_dna(document)
    assert first != second
    assert loads_story_dna(second)["arcs"][0]["event_ids"] == ["event-next", "shot-1-1"]


@pytest.mark.parametrize("collection", ["entities", "events", "relationships", "arcs"])
def test_duplicate_graph_ids_are_rejected(collection):
    document = graph()
    document[collection].append(copy.deepcopy(document[collection][0]))
    with pytest.raises(StoryDNAError, match="duplicate graph id"):
        dumps_story_dna(document)


def test_cross_collection_id_collision_is_rejected():
    document = fixture()
    document["events"][0]["id"] = "char-mei"
    with pytest.raises(StoryDNAError, match="duplicate graph id"):
        validate_story_dna(document)


@pytest.mark.parametrize("collection,field", [
    ("events", "participants"), ("events", "causes"), ("events", "consequences"),
    ("arcs", "event_ids"), ("arcs", "entity_ids"),
])
def test_unresolved_list_references_are_rejected(collection, field):
    document = graph()
    document[collection][0][field] = ["missing"]
    with pytest.raises(StoryDNAError, match="unresolved reference"):
        validate_story_dna(document)


@pytest.mark.parametrize("field", ["source_id", "target_id"])
def test_unresolved_relationship_endpoint_is_rejected(field):
    document = graph()
    document["relationships"][0][field] = "missing"
    with pytest.raises(StoryDNAError, match="unresolved reference"):
        validate_story_dna(document)


@pytest.mark.parametrize("identifier,reason", [
    ("missing", "unresolved reference"), ("char-mei", "must reference a place"),
])
def test_location_requires_existing_place(identifier, reason):
    document = fixture()
    document["events"][0]["location_id"] = identifier
    with pytest.raises(StoryDNAError, match=reason):
        validate_story_dna(document)


def test_entity_id_cannot_be_used_as_causal_event():
    document = fixture()
    document["events"][0]["causes"] = ["char-mei"]
    with pytest.raises(StoryDNAError, match="unresolved reference"):
        validate_story_dna(document)


@pytest.mark.parametrize("field,value", [
    ("schema_version", "1.0"), ("story_id", " "), ("entities", {}),
    ("events", None), ("relationships", [{}]), ("arcs", [{}]),
])
def test_schema_rejects_incomplete_or_wrongly_typed_contract(field, value):
    document = fixture()
    document[field] = value
    with pytest.raises(StoryDNAError):
        validate_story_dna(document)


def test_duplicate_participant_is_rejected():
    document = fixture()
    document["events"][0]["participants"] *= 2
    with pytest.raises(StoryDNAError):
        validate_story_dna(document)


@pytest.mark.parametrize("payload", [
    '{"story_id":"a","story_id":"b"}',
    '{"nested":{"secret":1,"secret":2}}',
    '{"extension":NaN}', '{"extension":Infinity}',
    '{"extension":1e999}', '{"unfinished":',
])
def test_ambiguous_or_non_finite_json_is_rejected(payload):
    with pytest.raises(StoryDNAError):
        loads_story_dna(payload)


@pytest.mark.parametrize("extension", [float("nan"), float("inf"), {1: "lossy"}, (1, 2)])
def test_extension_data_cannot_be_silently_coerced(extension):
    document = fixture()
    document["extension"] = extension
    with pytest.raises(StoryDNAError):
        dumps_story_dna(document)
