import pytest

from src.video_validation.multisubject_router import (
    GenerationStrategy,
    MultiSubjectShot,
    route_multi_subject_shot,
)


def test_single_subject_uses_direct():
    decision = route_multi_subject_shot(MultiSubjectShot(subject_count=1))
    assert decision.strategy == GenerationStrategy.DIRECT
    assert decision.requires_intermediate_validation is False


def test_contact_required_uses_sequential():
    decision = route_multi_subject_shot(
        MultiSubjectShot(subject_count=2, contact_required=True)
    )
    assert decision.strategy == GenerationStrategy.SEQUENTIAL
    assert "contact_required" in decision.reasons
    assert decision.requires_intermediate_validation is True


def test_strong_interaction_uses_sequential():
    decision = route_multi_subject_shot(
        MultiSubjectShot(subject_count=2, interaction_strength=0.85)
    )
    assert decision.strategy == GenerationStrategy.SEQUENTIAL
    assert "strong_subject_interaction" in decision.reasons


def test_identity_critical_independent_subjects_use_parallel():
    decision = route_multi_subject_shot(
        MultiSubjectShot(
            subject_count=3,
            identity_criticality=0.95,
            interaction_strength=0.1,
            occlusion_level=0.1,
        )
    )
    assert decision.strategy == GenerationStrategy.PARALLEL
    assert decision.requires_intermediate_validation is True
    assert "identity_critical" in decision.reasons


def test_camera_motion_plus_continuity_uses_sequential():
    decision = route_multi_subject_shot(
        MultiSubjectShot(
            subject_count=2,
            interaction_strength=0.5,
            occlusion_level=0.5,
            identity_criticality=0.5,
            camera_motion=0.9,
            temporal_dependency=0.6,
        )
    )
    assert decision.strategy == GenerationStrategy.SEQUENTIAL
    assert decision.reasons == ("camera_motion_with_temporal_dependency",)


def test_simple_two_subject_scene_defaults_direct():
    decision = route_multi_subject_shot(
        MultiSubjectShot(
            subject_count=2,
            interaction_strength=0.45,
            occlusion_level=0.2,
            identity_criticality=0.45,
        )
    )
    assert decision.strategy == GenerationStrategy.DIRECT
    assert decision.reasons == ("low_interaction_complexity",)


def test_compute_constrained_scene_can_stay_direct():
    decision = route_multi_subject_shot(
        MultiSubjectShot(
            subject_count=2,
            interaction_strength=0.4,
            occlusion_level=0.4,
            identity_criticality=0.5,
            compute_budget=0.1,
        )
    )
    assert decision.strategy == GenerationStrategy.DIRECT
    assert decision.reasons == ("compute_budget_constrained",)


def test_invalid_inputs_fail_closed():
    with pytest.raises(ValueError):
        MultiSubjectShot(subject_count=-1)
    with pytest.raises(ValueError):
        MultiSubjectShot(subject_count=2, interaction_strength=1.1)
