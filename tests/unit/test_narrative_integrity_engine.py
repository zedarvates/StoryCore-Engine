"""Engine behaviour: determinism, honest confidence, and a judge that cannot erase facts."""

import pytest
from hypothesis import HealthCheck, given, settings as hyp_settings, strategies as st

from src.narrative_integrity import (
    CanonInput,
    ControlFamily,
    IntegrityInput,
    NarrativeIntegrityEngine,
    SceneInput,
)
from src.narrative_integrity.style_profile import build_profile
from src.narrative_integrity.thresholds import Thresholds

ENGINE = NarrativeIntegrityEngine()

SLOP_FR = (
    "Dans un monde où la technologie évolue, il est important de noter que la communication "
    "joue un rôle crucial. Non seulement elle façonne nos interactions, mais elle transforme "
    "également notre perception. En conclusion, c'est un véritable témoignage de "
    "l'ingéniosité humaine, riche et complexe. "
) * 3

HUMAN_FR = (
    "Le pont a porté du charbon jusqu'en 1958. Ses six arches ont été montées en pierre. "
    "Deux fois, le mortier a été repris : après l'inondation de 1911, puis en 1963. "
    "Le parapet ouest garde la trace d'un camion. La circulation a été déviée en 1981, et depuis, "
    "seuls les piétons passent, avec l'occasionnel véhicule agricole autorisé sous trois tonnes. "
    "Une inspection récente a jugé la culée saine. Elle recommande cependant un rejointoiement dans les dix ans. "
    "La pierre venait d'Ashby, fermée depuis 1936. Le conseil a déposé deux demandes de subvention : "
    "la première a échoué sur un dossier incomplet. Des bénévoles curent les caniveaux chaque printemps, "
    "ce qui ralentit l'écaillage de la face nord."
)


class FakeJudge:
    name = "fake"

    def __init__(self, payload=None):
        self.payload = payload or []

    def available(self):
        return True

    def assess(self, payload):
        return self.payload


def run(text, **kwargs):
    return ENGINE.run(
        IntegrityInput(project_id="p", artifact="a.md", text=text),
        now="2026-09-21T00:00:00",
        **kwargs,
    )


def test_report_identity_is_stable_across_runs():
    first = run(SLOP_FR)
    second = run(SLOP_FR)
    assert first.report_id == second.report_id
    assert sorted(f.finding_id for f in first.findings) == sorted(
        f.finding_id for f in second.findings
    )


def test_report_identity_ignores_the_timestamp():
    a = ENGINE.run(IntegrityInput(project_id="p", artifact="a", text=SLOP_FR), now="2020-01-01T00:00:00")
    b = ENGINE.run(IntegrityInput(project_id="p", artifact="a", text=SLOP_FR), now="2031-12-31T23:59:59")
    assert a.report_id == b.report_id
    assert a.created_at != b.created_at


@hyp_settings(max_examples=20, deadline=None, suppress_health_check=[HealthCheck.too_slow])
@given(st.text(max_size=300))
def test_any_text_produces_a_stable_and_inert_report(text):
    first = run(text)
    second = run(text)
    assert first.report_id == second.report_id
    identifiers = [f.finding_id for f in first.findings]
    assert len(identifiers) == len(set(identifiers))
    assert all(f.applied is False for f in first.findings)


def test_human_control_corpus_produces_nothing_blocking():
    report = run(HUMAN_FR)
    assert report.aggregates["blocked"] is False
    assert report.aggregates["prose"]["band"] == "clean"
    assert report.aggregates["prose"]["score"] == 0.0
    severe = [f for f in report.findings if f.severity.value in ("medium", "high", "blocking")]
    assert severe == [], [f.detector_id for f in severe]


def test_slop_corpus_is_caught_and_scored():
    report = run(SLOP_FR)
    assert report.aggregates["prose"]["band"] == "pervasive_tells"
    assert report.aggregates["prose"]["score"] > 60
    assert report.findings


def test_layers_that_cannot_run_say_so_instead_of_guessing():
    report = run("Un texte neutre sans structure ni canon.")
    statuses = {item["layer"]: item["status"] for item in report.scope}
    assert statuses["L0"] == "skipped"
    assert statuses["L1"] == "skipped"
    assert statuses["L2"] == "skipped"
    assert statuses["S"] == "skipped"
    assert statuses["L3"] == "ran"


def test_full_input_runs_every_layer():
    integrity_input = IntegrityInput(
        project_id="p",
        artifact="a",
        text=SLOP_FR,
        scenes=[
            SceneInput(index=0, pov="Ida", characters=["Ida"], function="goal"),
            SceneInput(index=1, pov="Marc", characters=["Ida"], function="turn"),
        ],
        canon=CanonInput(entities=[{"name": "Ida"}], version="v1"),
        canon_ref="v1",
    )
    profile = build_profile([SLOP_FR], ENGINE.thresholds)
    report = ENGINE.run(integrity_input, now="2026-09-21T00:00:00", profile=profile)
    statuses = {item["layer"]: item["status"] for item in report.scope}
    assert statuses["L0"] == "ran"
    assert statuses["L1"] == "ran"
    assert statuses["L2"] == "ran"
    assert statuses["L3"] == "ran"
    assert statuses["S"] in ("ran", "partial")
    assert report.profile_ref == profile["profile_id"]


def test_a_judge_saying_nothing_cannot_erase_deterministic_findings():
    engine = NarrativeIntegrityEngine(judge=FakeJudge([]))
    report = engine.run(
        IntegrityInput(project_id="p", artifact="a", text=SLOP_FR), now="2026-09-21T00:00:00"
    )
    deterministic = [
        f for f in report.findings if f.control_family is not ControlFamily.LLM_JUDGE
    ]
    assert deterministic, "deterministic findings must survive a silent judge"
    prose = [layer for layer in report.to_dict()["layers"] if layer["layer"] == "L3"][0]
    assert prose["metrics"]["judge"]["status"] == "ran"


def test_a_judge_finding_is_labelled_probabilistic_and_isolated():
    judge = FakeJudge([
        {
            "layer": "L3",
            "detector_id": "tone",
            "severity": "low",
            "locus": "prose:tone",
            "confidence": 0.4,
            "excerpt": "extrait qualitatif",
            "detail": "registre inegal",
        }
    ])
    engine = NarrativeIntegrityEngine(judge=judge)
    report = engine.run(
        IntegrityInput(project_id="p", artifact="a", text="Un texte neutre."),
        now="2026-09-21T00:00:00",
    )
    judge_findings = [f for f in report.findings if f.control_family is ControlFamily.LLM_JUDGE]
    assert len(judge_findings) == 1
    assert judge_findings[0].determinism.value == "probabilistic"
    assert report.aggregates["by_control_family"]["llm_judge"] == 1


def test_short_text_is_reported_with_low_confidence():
    report = run("Un texte court.")
    assert report.confidence == "low"


def test_aggregates_and_immune_summary_agree_on_blocking():
    report = run(SLOP_FR)
    blocked = any(f.severity.value == "blocking" for f in report.findings)
    assert report.aggregates["blocked"] is blocked
    assert report.blocked() is blocked
    assert report.aggregates["immune"]["findings"] == len(report.findings)
