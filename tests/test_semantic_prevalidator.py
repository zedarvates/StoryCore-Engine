from pathlib import Path

from src.video_validation.semantic_prevalidator import (
    SemanticPrevalidator,
    SemanticVerdict,
)


class FakeScorer:
    provider_id = "fake-viclip"

    def __init__(self, score: float = 0.9, *, fail: bool = False):
        self.value = score
        self.fail = fail
        self.calls = 0

    def score(self, text: str, clip_path: Path) -> float:
        self.calls += 1
        if self.fail:
            raise RuntimeError("provider unavailable")
        return self.value


def _clip(tmp_path, payload=b"fake-video"):
    path = tmp_path / "clip.mp4"
    path.write_bytes(payload)
    return path


def test_high_score_passes_without_defect_signal(tmp_path):
    scorer = FakeScorer(0.92)
    gate = SemanticPrevalidator(scorer)
    result = gate.validate("A knight enters the room", _clip(tmp_path))
    assert result.verdict == SemanticVerdict.PASS
    assert result.score == 0.92
    assert result.provider_id == "fake-viclip"


def test_defect_signal_forces_escalation_even_with_high_score(tmp_path):
    scorer = FakeScorer(0.99)
    gate = SemanticPrevalidator(scorer)
    result = gate.validate(
        "Two characters shake hands",
        _clip(tmp_path),
        defect_signals=["identity_drift"],
    )
    assert result.verdict == SemanticVerdict.ESCALATE
    assert "external_defect_signal" in result.reasons


def test_low_and_ambiguous_scores_escalate(tmp_path):
    clip = _clip(tmp_path)
    low = SemanticPrevalidator(FakeScorer(0.2)).validate("A red car", clip)
    mid = SemanticPrevalidator(FakeScorer(0.65)).validate("A red car", clip)
    assert low.verdict == SemanticVerdict.ESCALATE
    assert mid.verdict == SemanticVerdict.ESCALATE


def test_missing_clip_or_empty_spec_is_uncertain(tmp_path):
    gate = SemanticPrevalidator(FakeScorer())
    missing = gate.validate("A scene", tmp_path / "missing.mp4")
    empty = gate.validate("   ", _clip(tmp_path))
    assert missing.verdict == SemanticVerdict.UNCERTAIN
    assert empty.verdict == SemanticVerdict.UNCERTAIN


def test_provider_failure_fails_safe(tmp_path):
    gate = SemanticPrevalidator(FakeScorer(fail=True))
    result = gate.validate("A scene", _clip(tmp_path))
    assert result.verdict == SemanticVerdict.UNCERTAIN
    assert result.score is None
    assert result.metadata["error_type"] == "RuntimeError"


def test_cache_avoids_duplicate_provider_call(tmp_path):
    scorer = FakeScorer(0.9)
    gate = SemanticPrevalidator(scorer)
    clip = _clip(tmp_path)
    first = gate.validate("A scene", clip)
    second = gate.validate("A scene", clip)
    assert first == second
    assert scorer.calls == 1


def test_changed_defect_signals_recompute_verdict_without_semantic_pass(tmp_path):
    scorer = FakeScorer(0.9)
    gate = SemanticPrevalidator(scorer)
    clip = _clip(tmp_path)
    assert gate.validate("A scene", clip).verdict == SemanticVerdict.PASS
    escalated = gate.validate("A scene", clip, defect_signals=["camera_mismatch"])
    assert escalated.verdict == SemanticVerdict.ESCALATE
    assert scorer.calls == 2


def test_score_out_of_range_is_uncertain(tmp_path):
    gate = SemanticPrevalidator(FakeScorer(1.5))
    result = gate.validate("A scene", _clip(tmp_path))
    assert result.verdict == SemanticVerdict.UNCERTAIN
    assert "score_out_of_range" in result.reasons
