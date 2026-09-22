"""The slop catalogue: weighted classes, tolerance, floor, bands and truncation."""

import json

import pytest

from src.narrative_integrity.slop import SlopRegistry
from src.narrative_integrity.thresholds import Thresholds

EM = "—"
REGISTRY = SlopRegistry.default()
THRESHOLDS = Thresholds.default()


def thresholds_with(tmp_path, **overrides):
    data = json.loads(json.dumps(Thresholds.default().data))
    for dotted, value in overrides.items():
        node = data
        parts = dotted.split(".")
        for part in parts[:-1]:
            node = node.setdefault(part, {})
        node[parts[-1]] = value
    path = tmp_path / "narrative_integrity_v1.json"
    path.write_text(json.dumps(data), encoding="utf-8")
    return Thresholds.from_file(path)


def entry(score, signature_id):
    for item in score["flagged"]:
        if item["signature_id"] == signature_id:
            return item
    return None


def test_catalogue_is_declarative_versioned_and_french():
    ref = REGISTRY.ref()
    assert ref["language"] == "fr"
    assert ref["signatures"] == len(REGISTRY.signatures) == 26
    assert len(ref["sha256"]) == 64
    assert ref["calibrated"] is False


def test_every_signature_documents_itself():
    for signature in REGISTRY.signatures:
        assert signature.note, signature.signature_id + " has no note"
        assert signature.weight_class in {
            "decisive", "strong", "soft", "report_only", "style_only"
        }
        assert signature.max_per_1000_words >= 0


def test_report_only_class_is_reported_but_cannot_move_the_score():
    text = "En conclusion, " * 12
    score = REGISTRY.score(text, THRESHOLDS)
    assert entry(score, "fr_concl_compulsive") is not None
    assert score["content_load"] == 0.0
    assert score["score"] == 0.0
    assert score["band"] == "clean"


def test_style_only_class_is_reported_but_cannot_move_the_score():
    text = ("Un texte " + EM + " avec des tirets " + EM + " partout. ") * 10
    score = REGISTRY.score(text, THRESHOLDS)
    assert entry(score, "fr_tiret_cadratin") is not None
    assert score["content_load"] == 0.0
    assert score["score"] == 0.0


def test_tolerance_absorbs_a_single_occurrence():
    filler = "Le chat dort sur le tapis rouge et blanc. " * 250
    text = filler + "Cela change véritablement le rapport."
    score = REGISTRY.score(text, THRESHOLDS)
    item = entry(score, "fr_adv_gonflant")
    assert item is not None
    assert item["count"] == 1
    assert item["above_tolerance"] is False
    assert score["content_load"] < 1.0


def test_tolerance_reacts_once_the_rate_exceeds_it():
    filler = "Le chat dort sur le tapis rouge et blanc. " * 250
    text = filler + "Cela change véritablement le rapport. " * 6
    score = REGISTRY.score(text, THRESHOLDS)
    item = entry(score, "fr_adv_gonflant")
    assert item is not None
    assert item["count"] == 6
    assert item["above_tolerance"] is True
    assert score["content_load"] > 0


def test_short_text_is_declared_unreliable_rather_than_silent():
    score = REGISTRY.score("Un texte bref.", THRESHOLDS)
    assert score["confidence"] == "low"
    assert "floor" in score["confidence_reason"] or "evidence" in score["confidence_reason"]


def test_bands_follow_the_settings_file():
    assert THRESHOLDS.band_for(0) == "clean"
    assert THRESHOLDS.band_for(19.9) == "clean"
    assert THRESHOLDS.band_for(20) == "light_tells"
    assert THRESHOLDS.band_for(40) == "mixed"
    assert THRESHOLDS.band_for(60) == "heavy_tells"
    assert THRESHOLDS.band_for(80) == "pervasive_tells"
    assert THRESHOLDS.band_for(100) == "pervasive_tells"


def test_truncation_is_declared_not_hidden(tmp_path):
    custom = thresholds_with(tmp_path, **{"scan.cap_chars": 400})
    text = "Dans un monde ou tout change, il est important de noter cela. " * 40
    score = REGISTRY.score(text, custom)
    assert score["truncated"] is True
    assert score["scanned_chars"] == 400


def test_score_is_monotone_in_the_amount_of_slop():
    neutral = "Le chat dort sur le tapis rouge. " * 30
    sloppier = neutral + "Dans un monde ou tout change, il est important de noter cela. " * 5
    assert REGISTRY.score(neutral, THRESHOLDS)["score"] <= REGISTRY.score(sloppier, THRESHOLDS)["score"]


def test_findings_carry_exact_excerpts_from_the_source():
    text = "Il est important de noter que ce point compte vraiment."
    findings = REGISTRY.findings(text, THRESHOLDS, "hash")
    assert findings
    for finding in findings:
        for evidence in finding.evidence:
            assert evidence.excerpt in text


def test_signatures_never_overlap_into_a_single_verdict():
    text = "Dans un monde ou tout change, il est important de noter cela."
    findings = REGISTRY.findings(text, THRESHOLDS, "hash")
    detectors = {f.detector_id for f in findings}
    assert len(detectors) == len(findings), "one finding per signature, never merged"
