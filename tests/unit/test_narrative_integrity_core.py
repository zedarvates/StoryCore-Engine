"""Core contracts: identity stability, immune policy, provenance, judge seam.

These tests pin the promises the engine makes: a finding is never applied, a judge is
never invented, and provenance never hides inside prose.
"""

import json

import pytest

from src.narrative_integrity import (
    ControlFamily,
    Determinism,
    Evidence,
    Finding,
    IntegrityInput,
    NarrativeIntegrityEngine,
    NarrativeLayer,
    Severity,
)
from src.narrative_integrity.immune import response_for, summarize
from src.narrative_integrity.judge import JudgeUnavailable, NullJudge
from src.narrative_integrity.provenance import (
    ProvenanceWouldHideChannel,
    assert_prose_untouched,
    build_provenance,
)
from src.narrative_integrity.text_scan import hidden_channel_scan
from src.narrative_integrity.thresholds import Thresholds


def make_finding(**overrides):
    payload = dict(
        layer=NarrativeLayer.PROSE,
        control_family=ControlFamily.DETERMINISTIC,
        detector_id="test.detector",
        severity=Severity.HIGH,
        locus="prose:test",
        determinism=Determinism.DETERMINISTIC,
        evidence=[Evidence(excerpt="extrait", locus="chars:0-7", detail="detail")],
        input_hash="abcdef0123456789",
        remediation="Proposition, pas une ecriture.",
    )
    payload.update(overrides)
    return Finding(**payload)


def test_finding_id_is_stable_across_instances():
    assert make_finding().finding_id == make_finding().finding_id


def test_finding_id_changes_with_locus():
    assert make_finding().finding_id != make_finding(locus="prose:other").finding_id


def test_finding_id_changes_with_input():
    assert make_finding().finding_id != make_finding(input_hash="ffffffffffffffff").finding_id


def test_finding_cannot_be_marked_applied():
    with pytest.raises(ValueError):
        make_finding(applied=True)


def test_finding_dict_always_reports_applied_false():
    assert make_finding().to_dict()["applied"] is False


def test_high_severity_proposes_and_requires_confirmation():
    response = response_for(make_finding(severity=Severity.HIGH), Thresholds.default())
    assert response["action"] == "propose"
    assert response["requires_confirmation"] is True
    assert response["applied"] is False
    assert response["proposal"] is not None


def test_blocking_severity_blocks_promotion():
    response = response_for(make_finding(severity=Severity.BLOCKING), Thresholds.default())
    assert response["action"] == "block_promotion"
    assert response["requires_confirmation"] is True


def test_info_severity_only_observes():
    response = response_for(make_finding(severity=Severity.INFO), Thresholds.default())
    assert response["action"] == "observe"
    assert response["requires_confirmation"] is False
    assert response["proposal"] is None


def test_summarize_never_applies_anything():
    engine = NarrativeIntegrityEngine()
    report = engine.run(
        IntegrityInput(
            project_id="p",
            artifact="a.md",
            text="Dans un monde ou la technologie evolue, il est important de noter cela.",
        ),
        now="2026-09-21T00:00:00",
    )
    summary = summarize(report, engine.thresholds)
    assert summary["silent_write_forbidden"] is True
    assert summary["findings"] >= 1
    assert all(
        response["applied"] is False
        for response in [
            response_for(finding, engine.thresholds) for finding in report.findings
        ]
    )


def test_null_judge_declares_itself_unavailable():
    judge = NullJudge()
    assert judge.available() is False
    with pytest.raises(JudgeUnavailable):
        judge.assess({"text": "quelque chose"})


def test_engine_reports_judge_as_unavailable_without_inventing_one():
    engine = NarrativeIntegrityEngine()
    report = engine.run(
        IntegrityInput(project_id="p", artifact="a.md", text="Un texte court et calme."),
        now="2026-09-21T00:00:00",
    )
    prose = [layer for layer in report.to_dict()["layers"] if layer["layer"] == "L3"][0]
    assert prose["metrics"]["judge"]["status"] == "unavailable"
    assert not [f for f in report.findings if f.control_family is ControlFamily.LLM_JUDGE]


def test_provenance_is_visible_and_declares_no_marking():
    engine = NarrativeIntegrityEngine()
    integrity_input = IntegrityInput(
        project_id="projet", artifact="scenes.md", text="Un texte neutre pour la mesure."
    )
    report = engine.run(integrity_input, now="2026-09-21T00:00:00")
    record = build_provenance(integrity_input, report)
    assert record["hidden_lexical_marking"] is False
    assert record["integrity_report_id"] == report.report_id
    scan = hidden_channel_scan(json.dumps(record, ensure_ascii=False), {})
    assert scan["total_removable"] == 0


def test_provenance_refuses_to_carry_hidden_characters():
    engine = NarrativeIntegrityEngine()
    integrity_input = IntegrityInput(project_id="p", artifact="a.md", text="Texte.")
    report = engine.run(integrity_input, now="2026-09-21T00:00:00")
    with pytest.raises(ProvenanceWouldHideChannel):
        build_provenance(
            integrity_input, report, extra={"trace": "valeur" + chr(0x200B) + "cachee"}
        )


def test_provenance_step_leaves_prose_untouched():
    prose = "Le pont a porte du charbon jusqu'en 1958."
    assert_prose_untouched(prose, prose)
    with pytest.raises(ProvenanceWouldHideChannel):
        assert_prose_untouched(prose, prose + chr(0x200B))
