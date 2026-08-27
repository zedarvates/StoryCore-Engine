from dataclasses import dataclass, field

import pytest

from src.video_validation.multisubject_router import GenerationStrategy
from src.video_validation.shot_spec_adapter import (
    extract_multi_subject_shot,
    route_shot_spec,
)


@dataclass
class ShotLike:
    camera_movement: str = "static"
    metadata: dict = field(default_factory=dict)


def test_single_subject_existing_shot_routes_direct():
    decision = route_shot_spec(ShotLike(camera_movement="static"), subjects=["hero"])
    assert decision.strategy is GenerationStrategy.DIRECT


def test_scene_characters_present_can_supply_subject_count():
    spec = {
        "characters_present": ["hero", "rival"],
        "camera_movement": "static",
        "metadata": {
            "multi_subject_routing": {
                "contact_required": True,
                "interaction_strength": 0.9,
            }
        },
    }
    decision = route_shot_spec(spec)
    assert decision.strategy is GenerationStrategy.SEQUENTIAL
    assert decision.requires_intermediate_validation is True


def test_identity_critical_independent_subjects_route_parallel():
    shot = ShotLike(camera_movement="tracking")
    decision = route_shot_spec(
        shot,
        subjects=["a", "b", "c"],
        overrides={
            "identity_criticality": 0.95,
            "interaction_strength": 0.1,
            "occlusion_level": 0.1,
        },
    )
    assert decision.strategy is GenerationStrategy.PARALLEL


def test_camera_motion_text_is_normalized_deterministically():
    routing_input = extract_multi_subject_shot(
        ShotLike(camera_movement="fast orbit camera"),
        subjects=["a", "b"],
        overrides={"temporal_dependency": 0.7},
    )
    assert routing_input.camera_motion == 0.75
    decision = route_shot_spec(
        ShotLike(camera_movement="fast orbit camera"),
        subjects=["a", "b"],
        overrides={"temporal_dependency": 0.7},
    )
    assert decision.strategy is GenerationStrategy.SEQUENTIAL


def test_unknown_subject_count_fails_closed():
    with pytest.raises(ValueError, match="subject_count is required"):
        route_shot_spec(ShotLike())


def test_routing_metadata_can_override_subject_count_and_budget():
    spec = {
        "camera_movement": "pan",
        "metadata": {
            "multi_subject_routing": {
                "subject_count": 2,
                "compute_budget": 0.1,
                "interaction_strength": 0.4,
                "occlusion_level": 0.4,
            }
        },
    }
    decision = route_shot_spec(spec)
    assert decision.strategy is GenerationStrategy.DIRECT
    assert "compute_budget_constrained" in decision.reasons


def test_invalid_score_fails_closed():
    with pytest.raises(ValueError, match="interaction_strength"):
        extract_multi_subject_shot(
            ShotLike(),
            subjects=["a", "b"],
            overrides={"interaction_strength": 1.2},
        )
