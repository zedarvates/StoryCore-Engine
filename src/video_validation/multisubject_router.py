from __future__ import annotations

from dataclasses import dataclass
from enum import Enum


class GenerationStrategy(str, Enum):
    DIRECT = "DIRECT"
    PARALLEL = "PARALLEL"
    SEQUENTIAL = "SEQUENTIAL"


@dataclass(frozen=True)
class MultiSubjectShot:
    subject_count: int
    interaction_strength: float = 0.0
    contact_required: bool = False
    occlusion_level: float = 0.0
    identity_criticality: float = 0.5
    camera_motion: float = 0.0
    temporal_dependency: float = 0.0
    compute_budget: float = 0.5

    def __post_init__(self) -> None:
        if self.subject_count < 0:
            raise ValueError("subject_count must be non-negative")
        for name in (
            "interaction_strength",
            "occlusion_level",
            "identity_criticality",
            "camera_motion",
            "temporal_dependency",
            "compute_budget",
        ):
            value = getattr(self, name)
            if not 0.0 <= value <= 1.0:
                raise ValueError(f"{name} must be in [0, 1]")


@dataclass(frozen=True)
class RoutingDecision:
    strategy: GenerationStrategy
    confidence: float
    reasons: tuple[str, ...]
    requires_intermediate_validation: bool


def route_multi_subject_shot(shot: MultiSubjectShot) -> RoutingDecision:
    """Choose a generation strategy using deterministic, explainable rules.

    The router does not call a model and does not generate media. It only
    chooses the safest/cheapest generation topology for the supplied shot
    complexity. Downstream validators still decide whether the result passes.
    """

    reasons: list[str] = []

    if shot.subject_count <= 1:
        return RoutingDecision(
            strategy=GenerationStrategy.DIRECT,
            confidence=0.98,
            reasons=("single_or_no_subject",),
            requires_intermediate_validation=False,
        )

    # Strong physical/spatial coupling is the clearest case for staged
    # generation because independent branches cannot reliably preserve contact.
    if shot.contact_required:
        reasons.append("contact_required")
    if shot.interaction_strength >= 0.7:
        reasons.append("strong_subject_interaction")
    if shot.occlusion_level >= 0.75:
        reasons.append("heavy_occlusion")
    if shot.temporal_dependency >= 0.8:
        reasons.append("strong_temporal_dependency")

    if reasons:
        confidence = min(0.98, 0.80 + 0.04 * len(reasons))
        return RoutingDecision(
            strategy=GenerationStrategy.SEQUENTIAL,
            confidence=confidence,
            reasons=tuple(reasons),
            requires_intermediate_validation=True,
        )

    # Independent subjects with high identity requirements benefit from
    # separate generation branches followed by composition/reconciliation.
    parallel_score = 0.0
    if shot.identity_criticality >= 0.7:
        parallel_score += 0.45
        reasons.append("identity_critical")
    if shot.subject_count >= 3:
        parallel_score += 0.25
        reasons.append("many_subjects")
    if shot.interaction_strength <= 0.35:
        parallel_score += 0.20
        reasons.append("weak_subject_interaction")
    if shot.occlusion_level <= 0.35:
        parallel_score += 0.10
        reasons.append("low_occlusion")

    if parallel_score >= 0.65:
        return RoutingDecision(
            strategy=GenerationStrategy.PARALLEL,
            confidence=min(0.95, 0.70 + parallel_score * 0.25),
            reasons=tuple(reasons),
            requires_intermediate_validation=True,
        )

    # Complex camera motion and previous-shot continuity can still favor a
    # staged build even without direct contact between subjects.
    if shot.camera_motion >= 0.75 and shot.temporal_dependency >= 0.55:
        return RoutingDecision(
            strategy=GenerationStrategy.SEQUENTIAL,
            confidence=0.78,
            reasons=("camera_motion_with_temporal_dependency",),
            requires_intermediate_validation=True,
        )

    # When compute is severely constrained, use the single-pass baseline and
    # rely on validators rather than multiplying generation branches.
    if shot.compute_budget <= 0.2:
        return RoutingDecision(
            strategy=GenerationStrategy.DIRECT,
            confidence=0.72,
            reasons=("compute_budget_constrained",),
            requires_intermediate_validation=False,
        )

    return RoutingDecision(
        strategy=GenerationStrategy.DIRECT,
        confidence=0.70,
        reasons=("low_interaction_complexity",),
        requires_intermediate_validation=False,
    )
