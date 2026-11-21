"""Experimental, media-neutral Story DNA validation and lossless JSON round-trip.

No generator, provider, migration, renderer, or runtime adapter is implied.
"""

from __future__ import annotations

import json
import math
from functools import lru_cache
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, ValidationError


class StoryDNAError(ValueError):
    """Invalid structure, ambiguous JSON, or an unresolved graph reference."""


@lru_cache(maxsize=1)
def _validator() -> Draft202012Validator:
    path = Path(__file__).resolve().parents[1] / "schemas/story-dna-v0.schema.json"
    schema = json.loads(path.read_text(encoding="utf-8"))
    Draft202012Validator.check_schema(schema)
    return Draft202012Validator(schema)


def _require_json(value: Any, path: str = "$") -> None:
    if value is None or type(value) in (str, bool, int):
        return
    if type(value) is float and math.isfinite(value):
        return
    if type(value) is list:
        for index, item in enumerate(value):
            _require_json(item, f"{path}[{index}]")
        return
    if type(value) is dict:
        for key, item in value.items():
            if type(key) is not str:
                raise StoryDNAError(f"{path}: JSON object keys must be strings")
            _require_json(item, f"{path}.{key}")
        return
    raise StoryDNAError(f"{path}: must be finite JSON data")


def validate_story_dna(document: Any) -> None:
    """Check the schema, unique graph IDs and typed references without editing data."""
    _require_json(document)
    try:
        _validator().validate(document)
    except ValidationError as error:
        path = ".".join(map(str, error.absolute_path)) or "$"
        raise StoryDNAError(f"{path}: {error.message}") from error

    seen: set[str] = set()
    for collection in ("entities", "events", "relationships", "arcs"):
        for entry in document.get(collection, []):
            identifier = entry["id"]
            if identifier in seen:
                raise StoryDNAError(f"{collection}: duplicate graph id: {identifier}")
            seen.add(identifier)
    entities = {entry["id"]: entry for entry in document["entities"]}
    events = {entry["id"] for entry in document["events"]}

    def require_reference(identifier: str, allowed: Any, path: str) -> None:
        if identifier not in allowed:
            raise StoryDNAError(f"{path}: unresolved reference: {identifier}")

    for index, event in enumerate(document["events"]):
        for field, allowed in (
            ("participants", entities), ("causes", events), ("consequences", events)
        ):
            for identifier in event.get(field, []):
                require_reference(identifier, allowed, f"events[{index}].{field}")
        if "location_id" in event:
            identifier = event["location_id"]
            require_reference(identifier, entities, f"events[{index}].location_id")
            if entities[identifier]["type"] != "place":
                raise StoryDNAError(f"events[{index}].location_id: must reference a place")
    for index, relationship in enumerate(document.get("relationships", [])):
        for field in ("source_id", "target_id"):
            require_reference(
                relationship[field], entities, f"relationships[{index}].{field}"
            )
    for index, arc in enumerate(document.get("arcs", [])):
        for field, allowed in (("entity_ids", entities), ("event_ids", events)):
            for identifier in arc.get(field, []):
                require_reference(identifier, allowed, f"arcs[{index}].{field}")


def dumps_story_dna(document: Any) -> str:
    """Emit stable UTF-8-ready JSON; preserve array order and every extension field."""
    validate_story_dna(document)
    return json.dumps(
        document, ensure_ascii=False, sort_keys=True,
        separators=(",", ":"), allow_nan=False,
    ) + "\n"


def _unique_object(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for key, value in pairs:
        if key in result:
            raise StoryDNAError(f"duplicate JSON key: {key}")
        result[key] = value
    return result


def _reject_constant(value: str) -> None:
    raise StoryDNAError(f"non-finite JSON constant: {value}")


def loads_story_dna(payload: str | bytes) -> dict[str, Any]:
    """Read strict JSON and validate the graph, rejecting silent data loss."""
    try:
        if isinstance(payload, bytes):
            payload = payload.decode("utf-8")
        document = json.loads(
            payload, object_pairs_hook=_unique_object, parse_constant=_reject_constant
        )
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise StoryDNAError(f"invalid UTF-8 JSON: {error}") from error
    validate_story_dna(document)
    return document
