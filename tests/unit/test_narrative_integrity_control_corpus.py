"""The versioned control corpus: a negative proof and a positive proof."""

import json
from pathlib import Path

import pytest

from src.narrative_integrity import IntegrityInput, NarrativeIntegrityEngine
from src.narrative_integrity.taxonomy import Severity, severity_rank
from src.narrative_integrity.text_scan import hidden_channel_scan

FIXTURE = (
    Path(__file__).resolve().parents[1]
    / "data"
    / "narrative_integrity"
    / "control_corpora_fr_v1.json"
)
ENGINE = NarrativeIntegrityEngine()
FIXED_NOW = "2026-09-21T00:00:00"


def load_corpus():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def sample(role):
    for entry in load_corpus()["samples"]:
        if entry["role"] == role:
            return entry
    raise AssertionError("missing role: " + role)


def report_for(entry):
    return ENGINE.run(
        IntegrityInput(
            project_id="control", artifact=entry["id"], text=entry["text"]
        ),
        now=FIXED_NOW,
    )


def test_corpus_declares_its_own_provenance_and_roles():
    data = load_corpus()
    assert "Original" in data["provenance"]
    assert {entry["role"] for entry in data["samples"]} == {
        "human_control",
        "machine_control",
    }


def test_the_corpus_carries_no_removable_hidden_channel():
    for entry in load_corpus()["samples"]:
        scan = hidden_channel_scan(entry["text"], {})
        assert scan["total_removable"] == 0, entry["id"]
        assert scan["nonstandard_spaces_french"] > 0 or entry["role"] == "machine_control"


def test_human_control_is_never_treated_as_defective():
    report = report_for(sample("human_control"))
    assert report.aggregates["prose"]["band"] == "clean"
    assert report.aggregates["blocked"] is False
    severe = [f for f in report.findings if severity_rank(f.severity) >= severity_rank(Severity.MEDIUM)]
    assert severe == [], [f.detector_id for f in severe]


def test_machine_control_is_caught():
    report = report_for(sample("machine_control"))
    assert report.aggregates["prose"]["score"] >= 60.0
    signatures = [f for f in report.findings if f.detector_id.startswith("slop.")]
    assert len(signatures) >= 3


def test_declared_expectations_are_honoured():
    for entry in load_corpus()["samples"]:
        expected = entry["expected"]
        report = report_for(entry)
        prose = report.aggregates["prose"]
        if "band" in expected:
            assert prose["band"] == expected["band"], entry["id"]
        if "band_any_of" in expected:
            assert prose["band"] in expected["band_any_of"], entry["id"]
        if "score_max" in expected:
            assert prose["score"] <= expected["score_max"], entry["id"]
        if "score_min" in expected:
            assert prose["score"] >= expected["score_min"], entry["id"]
        if "max_severity" in expected:
            limit = severity_rank(Severity(expected["max_severity"]))
            for finding in report.findings:
                assert severity_rank(finding.severity) <= limit, (entry["id"], finding.detector_id)
        if "min_signature_findings" in expected:
            found = [f for f in report.findings if f.detector_id.startswith("slop.")]
            assert len(found) >= expected["min_signature_findings"], entry["id"]

def test_report_is_serialisable_and_marked_inert():
    report = report_for(sample("machine_control"))
    assert all(f.applied is False for f in report.findings)
    json.dumps(report.to_dict(), ensure_ascii=False)
