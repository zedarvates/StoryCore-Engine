"""The judge: usable, fail-closed, and never an authority on authorship."""

import json

import pytest

from src.narrative_integrity import (
    ControlFamily,
    IntegrityInput,
    NarrativeIntegrityEngine,
)
from src.narrative_integrity.judge import JudgeUnavailable
from src.narrative_integrity.llm_judge import (
    SYSTEM_PROMPT,
    LLMJudge,
    OllamaTransport,
    build_prompt,
    parse_findings,
)

TEXT = (
    "Le pont a porté du charbon jusqu'en 1958. Ses six arches ont été montées "
    "en pierre. Le mortier a été repris après l'inondation de 1911, puis en 1963."
)
EXCERPT = "Ses six arches ont été montées en pierre."
SLOP = "Dans un monde où tout change, il est important de noter cela. " * 6


class FakeTransport:
    name = "fake"
    model = "fake-model"

    def __init__(self, response=None, error=None):
        self.response = response
        self.error = error
        self.calls = []

    def complete(self, prompt, system):
        self.calls.append({"prompt": prompt, "system": system})
        if self.error is not None:
            raise self.error
        return self.response


def answer(items):
    return json.dumps({"findings": items}, ensure_ascii=False)


def item(**overrides):
    payload = {
        "layer": "L3",
        "severity": "low",
        "confidence": 0.4,
        "excerpt": EXCERPT,
        "detail": "registre inegal",
    }
    payload.update(overrides)
    return payload


def test_a_valid_answer_becomes_an_advisory_finding():
    judge = LLMJudge(FakeTransport(answer([item()])))
    findings, report = judge.assess_detailed({"text": TEXT})
    assert len(findings) == 1
    assert findings[0]["excerpt"] == EXCERPT
    assert report["status"] == "ran"
    assert report["accepted_items"] == 1


def test_json_embedded_in_surrounding_prose_is_accepted():
    response = "Voici mon analyse :\n" + answer([item()]) + "\nBonne journee."
    findings, _ = LLMJudge(FakeTransport(response)).assess_detailed({"text": TEXT})
    assert len(findings) == 1


def test_a_fabricated_excerpt_is_rejected():
    lying = item(excerpt="Une phrase qui n'existe pas dans le texte.")
    findings, report = LLMJudge(FakeTransport(answer([lying]))).assess_detailed(
        {"text": TEXT}
    )
    assert findings == []
    assert report["rejected_items"], "the rejection must be recorded, not swallowed"
    assert "does not appear" in report["rejected_items"][0]


def test_malformed_answer_fails_closed():
    with pytest.raises(JudgeUnavailable):
        LLMJudge(FakeTransport("je ne sais pas repondre")).assess_detailed({"text": TEXT})


def test_empty_answer_fails_closed():
    with pytest.raises(JudgeUnavailable):
        LLMJudge(FakeTransport("   ")).assess_detailed({"text": TEXT})


def test_an_unreachable_endpoint_fails_closed():
    judge = LLMJudge(OllamaTransport(model="absent", base_url="http://127.0.0.1:1", timeout=2))
    with pytest.raises(JudgeUnavailable):
        judge.assess_detailed({"text": TEXT})


def test_severity_aliases_are_normalised():
    findings, _ = LLMJudge(
        FakeTransport(answer([item(severity="moderate")]))
    ).assess_detailed({"text": TEXT})
    assert findings[0]["severity"] == "medium"


def test_an_unknown_severity_is_rejected():
    findings, report = LLMJudge(
        FakeTransport(answer([item(severity="catastrophique")]))
    ).assess_detailed({"text": TEXT})
    assert findings == []
    assert "unknown severity" in report["rejected_items"][0]


def test_items_beyond_the_cap_are_rejected():
    seven = [item() for _ in range(7)]
    findings, report = LLMJudge(FakeTransport(answer(seven)), max_items=5).assess_detailed(
        {"text": TEXT}
    )
    assert len(findings) == 5
    assert len(report["rejected_items"]) == 2
    assert "beyond the declared cap" in report["rejected_items"][0]


def test_confidence_is_clamped_to_the_unit_interval():
    findings, _ = LLMJudge(
        FakeTransport(answer([item(confidence=3), item(confidence=-2)]))
    ).assess_detailed({"text": TEXT})
    assert findings[0]["confidence"] == 1.0
    assert findings[1]["confidence"] == 0.0


def test_a_non_numeric_confidence_is_rejected():
    findings, report = LLMJudge(
        FakeTransport(answer([item(confidence="tres sur")]))
    ).assess_detailed({"text": TEXT})
    assert findings == []
    assert "confidence is not a number" in report["rejected_items"][0]


def test_prompt_demands_json_and_forbids_authorship_claims():
    prompt = build_prompt(TEXT, 5)
    assert TEXT in prompt
    assert "severity parmi info, low, medium, high" in prompt
    assert "mot pour mot" in prompt
    assert "auteur" in SYSTEM_PROMPT
    assert "origine" in SYSTEM_PROMPT
    assert "uniquement par un objet JSON" in SYSTEM_PROMPT


def test_truncation_is_declared():
    judge = LLMJudge(FakeTransport(answer([])), max_chars=40)
    _, report = judge.assess_detailed({"text": TEXT})
    assert report["truncated"] is True
    assert report["inspected_chars"] == 40


def test_the_engine_records_the_judge_metadata():
    engine = NarrativeIntegrityEngine(judge=LLMJudge(FakeTransport(answer([item()]))))
    report = engine.run(
        IntegrityInput(project_id="p", artifact="a", text=TEXT), now="2026-09-21T00:00:00"
    )
    prose = [layer for layer in report.to_dict()["layers"] if layer["layer"] == "L3"][0]
    assert prose["metrics"]["judge"]["status"] == "ran"
    assert prose["metrics"]["judge"]["model"] == "fake-model"
    judged = [f for f in report.findings if f.control_family is ControlFamily.LLM_JUDGE]
    assert len(judged) == 1
    assert judged[0].determinism.value == "probabilistic"


def test_a_judge_returning_nothing_cannot_erase_deterministic_findings():
    engine = NarrativeIntegrityEngine(judge=LLMJudge(FakeTransport(answer([]))))
    report = engine.run(
        IntegrityInput(project_id="p", artifact="a", text=SLOP), now="2026-09-21T00:00:00"
    )
    deterministic = [
        f for f in report.findings if f.control_family is not ControlFamily.LLM_JUDGE
    ]
    assert deterministic
    assert not [f for f in report.findings if f.control_family is ControlFamily.LLM_JUDGE]


def test_an_unreachable_judge_does_not_break_the_run():
    engine = NarrativeIntegrityEngine(
        judge=LLMJudge(OllamaTransport(model="absent", base_url="http://127.0.0.1:1", timeout=2))
    )
    report = engine.run(
        IntegrityInput(project_id="p", artifact="a", text=SLOP), now="2026-09-21T00:00:00"
    )
    prose = [layer for layer in report.to_dict()["layers"] if layer["layer"] == "L3"][0]
    assert prose["metrics"]["judge"]["status"] == "unavailable"
    assert report.aggregates["prose"]["score"] > 60, "deterministic scoring still ran"


def test_parse_findings_reports_every_rejection_reason():
    raw = json.dumps(
        {
            "findings": [
                "not an object",
                {"severity": "low"},
                {"severity": "low", "excerpt": "absent du texte"},
            ]
        }
    )
    accepted, rejected = parse_findings(raw, TEXT, 5)
    assert accepted == []
    assert len(rejected) == 3
