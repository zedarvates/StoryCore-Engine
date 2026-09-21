"""Schemas are contracts: every persisted structure validates against its JSON Schema."""

import json
from pathlib import Path

import pytest
from jsonschema import Draft202012Validator

from src.narrative_integrity import (
    CanonInput,
    IntegrityInput,
    NarrativeIntegrityEngine,
    SceneInput,
)
from src.narrative_integrity.slop import SlopRegistry
from src.narrative_integrity.style_profile import build_profile, lock_profile

SCHEMA_DIR = (
    Path(__file__).resolve().parents[2]
    / "src"
    / "narrative_integrity"
    / "schemas"
)


def load_schema(name):
    return json.loads((SCHEMA_DIR / name).read_text(encoding="utf-8"))


def validate(name, payload):
    Draft202012Validator(load_schema(name)).validate(payload)


def build_report():
    engine = NarrativeIntegrityEngine()
    integrity_input = IntegrityInput(
        project_id="schema-test",
        artifact="scenes.md",
        text=(
            "Dans un monde ou tout change, il est important de noter que cela joue un "
            "role crucial. Non seulement cela transforme tout, mais cela ouvre la voie "
            "a d'innombrables possibilites. En conclusion, c'est un veritable "
            "temoignage de l'ingeniosite humaine, riche et complexe. "
        )
        * 3,
        scenes=[
            SceneInput(index=0, scene_id="s0", pov="Ida", characters=["Ida"], function="goal"),
            SceneInput(index=1, scene_id="s1", pov="Marc", characters=["Ida"]),
        ],
        canon=CanonInput(entities=[{"name": "Ida"}], version="v1"),
        canon_ref="v1",
    )
    profile = build_profile([integrity_input.text], engine.thresholds)
    return engine.run(integrity_input, now="2026-09-21T00:00:00", profile=profile)


def test_report_validates_against_its_schema():
    report = build_report().to_dict()
    validate("integrity_report.schema.json", report)


def test_every_finding_validates_against_its_schema():
    report = build_report().to_dict()
    findings = [f for layer in report["layers"] for f in layer["findings"]]
    assert findings, "the fixture must produce findings for this test to mean anything"
    for finding in findings:
        validate("finding.schema.json", finding)


def test_report_is_serialisable_without_loss():
    report = build_report().to_dict()
    assert json.loads(json.dumps(report, ensure_ascii=False))["report_id"] == report["report_id"]


def test_catalogue_signatures_validate_against_their_schema():
    registry = SlopRegistry.default()
    assert registry.signatures
    for signature in registry.signatures:
        validate("slop_signature.schema.json", signature.to_dict())


def test_reference_profile_validates_against_its_schema():
    engine = NarrativeIntegrityEngine()
    profile = build_profile(["Un texte de reference suffisamment long pour mesurer."], engine.thresholds)
    validate("reference_profile.schema.json", profile)


def test_uncalibrated_claims_are_declared_not_hidden():
    registry = SlopRegistry.default()
    assert registry.ref()["calibrated"] is False
    profile = build_profile(["Un texte de reference."], NarrativeIntegrityEngine().thresholds)
    assert profile["calibrated"] is False
    settings = NarrativeIntegrityEngine().thresholds
    assert settings.get("style.calibrated") is False
    assert settings.get("score_model.calibrated") is False


def test_locked_profile_validates_and_records_its_sources():
    engine = NarrativeIntegrityEngine()
    profile = lock_profile(
        ["Un texte de reference suffisamment long pour mesurer quelque chose."],
        engine.thresholds,
        sources=["reference.md"],
    )
    validate("reference_profile.schema.json", profile)
    assert profile["locked"] is True
    assert profile["derived_from"] == ["reference.md"]
    record = profile["derived_from_records"][0]
    assert record["source"] == "reference.md"
    assert len(record["sha256"]) == 64
    assert record["words"] > 0
