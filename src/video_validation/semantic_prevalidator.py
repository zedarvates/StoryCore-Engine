from __future__ import annotations

import hashlib
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


class SemanticPrevalidator:
    """Cheap semantic gate before expensive VLM/temporal validation.

    A semantic PASS only means the clip is text-aligned enough to avoid an
    immediate semantic escalation. It never overrides downstream structural,
    identity, safety, or temporal validators.
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
        self._cache: dict[str, SemanticValidationResult] = {}

    def validate(
        self,
        shot_spec: str,
        clip_path: str | Path,
        *,
        defect_signals: Sequence[str] = (),
        force_refresh: bool = False,
    ) -> SemanticValidationResult:
        path = Path(clip_path)
        if not shot_spec.strip():
            return SemanticValidationResult(
                verdict=SemanticVerdict.UNCERTAIN,
                score=None,
                provider_id=self.scorer.provider_id,
                cache_key="",
                reasons=("empty_shot_spec",),
                defect_signals=tuple(defect_signals),
            )
        if not path.is_file():
            return SemanticValidationResult(
                verdict=SemanticVerdict.UNCERTAIN,
                score=None,
                provider_id=self.scorer.provider_id,
                cache_key="",
                reasons=("clip_missing",),
                defect_signals=tuple(defect_signals),
            )

        cache_key = self._make_cache_key(shot_spec, path)
        if not force_refresh and cache_key in self._cache:
            cached = self._cache[cache_key]
            if tuple(defect_signals) == cached.defect_signals:
                return cached

        try:
            score = float(self.scorer.score(shot_spec, path))
        except Exception as exc:  # provider failure must fail safe
            result = SemanticValidationResult(
                verdict=SemanticVerdict.UNCERTAIN,
                score=None,
                provider_id=self.scorer.provider_id,
                cache_key=cache_key,
                reasons=("provider_error",),
                defect_signals=tuple(defect_signals),
                metadata={"error_type": type(exc).__name__},
            )
            self._cache[cache_key] = result
            return result

        if not 0 <= score <= 1:
            result = SemanticValidationResult(
                verdict=SemanticVerdict.UNCERTAIN,
                score=score,
                provider_id=self.scorer.provider_id,
                cache_key=cache_key,
                reasons=("score_out_of_range",),
                defect_signals=tuple(defect_signals),
            )
            self._cache[cache_key] = result
            return result

        reasons: list[str] = []
        defects = tuple(sorted({signal.strip() for signal in defect_signals if signal.strip()}))

        if defects:
            verdict = SemanticVerdict.ESCALATE
            reasons.append("external_defect_signal")
        elif score >= self.pass_threshold:
            verdict = SemanticVerdict.PASS
            reasons.append("semantic_alignment_high")
        elif score >= self.uncertain_threshold:
            verdict = SemanticVerdict.ESCALATE
            reasons.append("semantic_alignment_ambiguous")
        else:
            verdict = SemanticVerdict.ESCALATE
            reasons.append("semantic_alignment_low")

        result = SemanticValidationResult(
            verdict=verdict,
            score=score,
            provider_id=self.scorer.provider_id,
            cache_key=cache_key,
            reasons=tuple(reasons),
            defect_signals=defects,
            metadata={
                "pass_threshold": self.pass_threshold,
                "uncertain_threshold": self.uncertain_threshold,
            },
        )
        self._cache[cache_key] = result
        return result

    @staticmethod
    def _make_cache_key(shot_spec: str, clip_path: Path) -> str:
        digest = hashlib.sha256()
        digest.update(shot_spec.strip().encode("utf-8"))
        digest.update(b"\0")
        with clip_path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        return digest.hexdigest()
