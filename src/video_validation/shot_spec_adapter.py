from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from .multisubject_router import MultiSubjectShot, RoutingDecision, route_multi_subject_shot


_CAMERA_MOTION_INTENSITY = {
    "static": 0.0,
    "locked": 0.0,
    "none": 0.0,
    "pan": 0.35,
    "tilt": 0.35,
    "zoom": 0.45,
    "dolly": 0.55,
    "tracking": 0.6,
    "truck": 0.6,
    "pedestal": 0.55,
    "orbit": 0.75,
    "crane": 0.75,
    "handheld": 0.8,
    "whip": 0.9,
}


def _read(source: Any, key: str, default: Any = None) -> Any:
    if isinstance(source, Mapping):
        return source.get(key, default)
    return getattr(source, key, default)


def _routing_metadata(shot_spec: Any) -> Mapping[str, Any]:
    metadata = _read(shot_spec, "metadata", {})
    if not isinstance(metadata, Mapping):
        return {}
    routing = metadata.get("multi_subject_routing", {})
    return routing if isinstance(routing, Mapping) else {}


def _normalize_score(value: Any, *, name: str, default: float) -> float:
    if value is None:
        return default
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError(f"{name} must be numeric")
    score = float(value)
    if not 0.0 <= score <= 1.0:
        raise ValueError(f"{name} must be in [0, 1]")
    return score


def _camera_motion_score(value: Any) -> float:
    if value is None:
        return 0.0
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return _normalize_score(value, name="camera_motion", default=0.0)
    if not isinstance(value, str):
        raise ValueError("camera_motion must be numeric or text")

    normalized = value.lower().replace("-", " ").replace("_", " ")
    matched = [score for token, score in _CAMERA_MOTION_INTENSITY.items() if token in normalized]
    return max(matched, default=0.25 if normalized.strip() else 0.0)


def _subject_count(shot_spec: Any, *, subjects: Sequence[Any] | None, routing: Mapping[str, Any]) -> int:
    explicit = routing.get("subject_count", _read(shot_spec, "subject_count", None))
    if explicit is not None:
        if isinstance(explicit, bool) or not isinstance(explicit, int) or explicit < 0:
            raise ValueError("subject_count must be a non-negative integer")
        return explicit

    for key in ("characters_present", "subjects", "characters"):
        value = _read(shot_spec, key, None)
        if isinstance(value, Sequence) and not isinstance(value, (str, bytes, bytearray)):
            return len(value)

    if subjects is not None:
        return len(subjects)

    # Fail closed rather than silently treating an unknown multi-character shot
    # as a single-subject DIRECT generation.
    raise ValueError("subject_count is required when the shot spec has no subject list")


def extract_multi_subject_shot(
    shot_spec: Any,
    *,
    subjects: Sequence[Any] | None = None,
    overrides: Mapping[str, Any] | None = None,
) -> MultiSubjectShot:
    """Adapt an existing StoryCore shot/dict into the deterministic routing contract.

    Rich routing metadata can live under ``metadata.multi_subject_routing``.
    ``overrides`` is intended for the orchestration layer when scene context knows
    more than the shot object itself. No NLP guessing is performed here.
    """

    routing = dict(_routing_metadata(shot_spec))
    if overrides:
        routing.update(overrides)

    camera_value = routing.get(
        "camera_motion",
        _read(shot_spec, "camera_movement", _read(shot_spec, "camera_motion", None)),
    )

    return MultiSubjectShot(
        subject_count=_subject_count(shot_spec, subjects=subjects, routing=routing),
        interaction_strength=_normalize_score(
            routing.get("interaction_strength"), name="interaction_strength", default=0.0
        ),
        contact_required=bool(routing.get("contact_required", False)),
        occlusion_level=_normalize_score(
            routing.get("occlusion_level"), name="occlusion_level", default=0.0
        ),
        identity_criticality=_normalize_score(
            routing.get("identity_criticality"), name="identity_criticality", default=0.5
        ),
        camera_motion=_camera_motion_score(camera_value),
        temporal_dependency=_normalize_score(
            routing.get("temporal_dependency"), name="temporal_dependency", default=0.0
        ),
        compute_budget=_normalize_score(
            routing.get("compute_budget"), name="compute_budget", default=0.5
        ),
    )


def route_shot_spec(
    shot_spec: Any,
    *,
    subjects: Sequence[Any] | None = None,
    overrides: Mapping[str, Any] | None = None,
) -> RoutingDecision:
    """Extract a routing input from a StoryCore shot and choose its topology."""

    return route_multi_subject_shot(
        extract_multi_subject_shot(shot_spec, subjects=subjects, overrides=overrides)
    )
