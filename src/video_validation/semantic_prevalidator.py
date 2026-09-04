from __future__ import annotations

import hashlib
import math
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Protocol, Sequence


class SemanticVerdict(str, Enum):
    PASS = "PASS"
    ESCALATE = "ESCALATE"
    UNCERTAIN = "UNCERTAIN"


class VideoTextScorer(Protocol):
    """Provider interface for ViCLIP-like video/text similarity backends."""

    @property
    def provider_id(self) -> str: ...

    def score(self, text: str, clip_path: Path) -> float:
        """Return a normalized semantic-alignment score in [0, 1]."""


@dataclass(frozen=True)
class SemanticValidationResult:
    verdict: SemanticVerdict
    score: float | None
    provider_id: str
    cache_key: str
    reasons: tuple[str, ...] = ()
    defect_signals: tuple[str, ...] = ()
    metadata: dict[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class _SemanticScore:
    score: float | None
    reasons: tuple[str, ...]
    metadata: dict[str, object]


class SemanticPrevalidator:
    """Cheap semantic gate before expensive VLM/temporal validation.

    A semantic PASS only means the clip is text-aligned enough to avoid an
    immediate semantic escalation. It never overrides downstream structural,
    identity, safety, or temporal validators.

    Semantic scoring is cached independently from external defect signals. This
    means a newly reported identity/camera/temporal defect can force escalation
    without re-running a potentially expensive local video encoder.
    """

    def __init__(
        self,
        scorer: VideoTextScorer,
        *,
        pass_threshold: float = 0.78,
        uncertain_threshold: float = 0.55,
    ) -> None:
        if not 0 <= uncertain_threshold <= pass_threshold <= 1:
            raise ValueError("expected 0 <= uncertain_threshold <= pass_threshold <= 1")
        self.scorer = scorer
        self.pass_threshold = pass_threshold
        self.uncertain_threshold = uncertain_threshold
        self._score_cache: dict[str, _SemanticScore] = {}

    def validate(
        self,
        shot_spec: str,
        clip_path: str | Path,
        *,
        defect_signals: Sequence[str] = (),
        force_refresh: bool = False,
    ) -> SemanticValidationResult:
        path = Path(clip_path)
        defects = tuple(sorted({signal.strip() for signal in defect_signals if signal.strip()}))

        if not shot_spec.strip():
            return SemanticValidationResult(
                verdict=SemanticVerdict.UNCERTAIN,
                score=None,
                provider_id=self.scorer.provider_id,
                cache_key="",
                reasons=("empty_shot_spec",),
                defect_signals=defects,
            )
        if not path.is_file():
            return SemanticValidationResult(
                verdict=SemanticVerdict.UNCERTAIN,
                score=None,
                provider_id=self.scorer.provider_id,
                cache_key="",
                reasons=("clip_missing",),
                defect_signals=defects,
            )

        cache_key = self._make_cache_key(shot_spec, path)
        semantic = None if force_refresh else self._score_cache.get(cache_key)
        cache_hit = semantic is not None
        if semantic is None:
            semantic = self._score(shot_spec, path)
            self._score_cache[cache_key] = semantic

        if semantic.score is None:
            return SemanticValidationResult(
                verdict=SemanticVerdict.UNCERTAIN,
                score=None,
                provider_id=self.scorer.provider_id,
                cache_key=cache_key,
                reasons=semantic.reasons,
                defect_signals=defects,
                metadata={**semantic.metadata, "semantic_cache_hit": cache_hit},
            )

        score = semantic.score
        if defects:
            verdict = SemanticVerdict.ESCALATE
            reasons = ("external_defect_signal",)
        elif score >= self.pass_threshold:
            verdict = SemanticVerdict.PASS
            reasons = ("semantic_alignment_high",)
        elif score >= self.uncertain_threshold:
            verdict = SemanticVerdict.ESCALATE
            reasons = ("semantic_alignment_ambiguous",)
        else:
            verdict = SemanticVerdict.ESCALATE
            reasons = ("semantic_alignment_low",)

        return SemanticValidationResult(
            verdict=verdict,
            score=score,
            provider_id=self.scorer.provider_id,
            cache_key=cache_key,
            reasons=reasons,
            defect_signals=defects,
            metadata={
                "pass_threshold": self.pass_threshold,
                "uncertain_threshold": self.uncertain_threshold,
                "semantic_cache_hit": cache_hit,
            },
        )

    def _score(self, shot_spec: str, path: Path) -> _SemanticScore:
        try:
            score = float(self.scorer.score(shot_spec, path))
        except Exception as exc:  # provider failure must fail safe
            return _SemanticScore(
                score=None,
                reasons=("provider_error",),
                metadata={"error_type": type(exc).__name__},
            )

        if not math.isfinite(score) or not 0 <= score <= 1:
            return _SemanticScore(
                score=None,
                reasons=("score_out_of_range",),
                metadata={"raw_score": score},
            )
        return _SemanticScore(score=score, reasons=(), metadata={})

    @staticmethod
    def _make_cache_key(shot_spec: str, clip_path: Path) -> str:
        digest = hashlib.sha256()
        digest.update(shot_spec.strip().encode("utf-8"))
        digest.update(b"\0")
        with clip_path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()
