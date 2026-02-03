"""
Property-based tests for DataContractValidator.

These tests verify universal properties of Data Contract validation across
randomly generated project structures.
"""

import pytest
from hypothesis import given, settings, strategies as st
from pathlib import Path
from datetime import datetime
import tempfile

from src.assistant.validator import DataContractValidator
from src.assistant.models import (
    Project, ProjectMetadata, Scene, Character, Sequence, Shot
)


# Strategies for generating valid data
valid_id_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'), whitelist_characters='_-'),
    min_size=1,
    max_size=20
)

valid_name_strategy = st.text(
    alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd'), whitelist_characters=' '),
    min_size=1,
    max_size=50
)

valid_description_strategy = st.text(min_size=10, max_size=200)

valid_duration_strategy = st.floats(min_value=0.1, max_value=60.0)

valid_shot_type_strategy = st.sampled_from(["wide", "medium", "close-up", "extreme-close-up"])

valid_camera_movement_strategy = st.sampled_from(["static", "pan", "tilt", "dolly", "crane"])

valid_status_strategy = st.sampled_from(["pending", "done", "failed", "passed"])


def generate_valid_shot(shot_number: int, sequence_id: str) -> st.SearchStrategy[Shot]:
    """Generate a valid shot."""
    return st.builds(
        Shot,
        id=st.just(f"{sequence_id}_shot_{shot_number}"),
        number=st.just(shot_number),
        type=valid_shot_type_strategy,
        camera_movement=valid_camera_movement_strategy,
        duration=valid_duration_strategy,
        description=valid_description_strategy,
        visual_style=valid_name_strategy
    )


def generate_valid_sequence(scene_id: str, seq_number: int) -> st.SearchStrategy[Sequence]:
    """Generate a valid sequence with shots."""
    return st.builds(
        Sequence,
        id=st.just(f"seq_{seq_number}"),
        scene_id=st.just(scene_id),
        shots=st.lists(
            st.integers(min_value=1, max_value=5).flatmap(
                lambda n: generate_valid_shot(n, f"seq_{seq_number}")
            ),
            min_size=1,
            max_size=5
        ),
        total_duration=valid_duration_strategy
    ).map(lambda seq: Sequence(
        id=seq.id,
        scene_id=seq.scene_id,
        shots=seq.shots,
        total_duration=sum(shot.duration for shot in seq.shots)  # Ensure consistency
    ))


def generate_valid_scene(scene_number: int) -> st.SearchStrategy[Scene]:
    """Generate a valid scene."""
    return st.builds(
        Scene,
        id=st.just(f"scene_{scene_number}"),
        number=st.just(scene_number),
        title=valid_name_strategy,
        description=valid_description_strategy,
        location=valid_name_strategy,
        time_of_day=st.sampled_from(["morning", "afternoon", "evening", "night"]),
        duration=valid_duration_strategy,
        characters=st.lists(valid_id_strategy, min_size=0, max_size=5),
        key_actions=st.lists(valid_description_strategy, min_size=0, max_size=5),
        visual_notes=st.one_of(st.none(), valid_description_strategy)
    )


def generate_valid_character(char_number: int) -> st.SearchStrategy[Character]:
    """Generate a valid character."""
    return st.builds(
        Character,
        id=st.just(f"char_{char_number}"),
        name=valid_name_strategy,
        role=valid_name_strategy,
        description=valid_description_strategy,
        appearance=valid_description_strategy,
        personality=valid_description_strategy,
        visual_reference=st.one_of(st.none(), valid_name_strategy)
    )


def generate_valid_metadata() -> st.SearchStrategy[ProjectMetadata]:
    """Generate valid project metadata."""
    return st.builds(
        ProjectMetadata,
        schema_version=st.just("1.0"),
        project_name=valid_name_strategy,
        capabilities=st.just({
            "grid_generation": True,
            "promotion_engine": True,
            "qa_engine": True,
            "autofix_engine": True
        }),
        generation_status=st.dictionaries(
            keys=st.sampled_from(["grid", "promotion"]),
            values=valid_status_strategy,
            min_size=1,
            max_size=2
        )
    )


@settings(max_examples=100, deadline=None)
@given(
    scene_count=st.integers(min_value=1, max_value=10),
    char_count=st.integers(min_value=1, max_value=5)
)
def test_valid_project_passes_validation_property(scene_count, char_count):
    """
    Property 6: Data Contract Validation on Load
    
    For any project that is properly constructed with all required fields,
    the validation should pass with no errors.
    
    **Validates: Requirements 4.2, 4.6**
    """
    # Feature: storycore-ai-assistant, Property 6: Data Contract Validation (valid projects)
    
    # Generate valid scenes
    scenes = [
        Scene(
            id=f"scene_{i}",
            number=i,
            title=f"Scene {i}",
            description=f"Description for scene {i}",
            location=f"Location {i}",
            time_of_day="morning",
            duration=3.0,
            characters=[f"char_{j}" for j in range(min(char_count, 2))],
            key_actions=[f"Action {j}" for j in range(2)],
            visual_notes=None
        )
        for i in range(1, scene_count + 1)
    ]
    
    # Generate valid characters
    characters = [
        Character(
            id=f"char_{i}",
            name=f"Character {i}",
            role=f"Role {i}",
            description=f"Description for character {i}",
            appearance=f"Appearance for character {i}",
            personality=f"Personality for character {i}",
            visual_reference=None
        )
        for i in range(1, char_count + 1)
    ]
    
    # Generate valid sequences (one per scene)
    sequences = []
    for i, scene in enumerate(scenes, 1):
        shots = [
            Shot(
                id=f"seq_{i}_shot_{j}",
                number=j,
                type="medium",
                camera_movement="static",
                duration=1.0,
                description=f"Shot {j} description",
                visual_style="cinematic"
            )
            for j in range(1, 4)
        ]
        
        sequence = Sequence(
            id=f"seq_{i}",
            scene_id=scene.id,
            shots=shots,
            total_duration=sum(shot.duration for shot in shots)
        )
        sequences.append(sequence)
    
    # Create valid metadata
    metadata = ProjectMetadata(
        schema_version="1.0",
        project_name="Test Project",
        capabilities={
            "grid_generation": True,
            "promotion_engine": True,
            "qa_engine": True,
            "autofix_engine": True
        },
        generation_status={
            "grid": "pending",
            "promotion": "pending"
        }
    )
    
    # Create project
    with tempfile.TemporaryDirectory() as temp_dir:
        project = Project(
            name="test_project",
            path=Path(temp_dir) / "test_project",
            metadata=metadata,
            scenes=scenes,
            characters=characters,
            sequences=sequences,
            created_at=datetime.now(),
            modified_at=datetime.now()
        )
        
        # Validate
        validator = DataContractValidator()
        result = validator.validate_project(project)
        
        # Valid project should pass validation
        assert result.valid, f"Valid project failed validation with errors: {result.errors}"
        assert len(result.errors) == 0


@settings(max_examples=100, deadline=None)
@given(
    schema_version=st.text(min_size=1, max_size=10).filter(lambda x: x != "1.0"),
    missing_field=st.sampled_from(["project_name", "scenes", "characters"])
)
def test_invalid_project_fails_validation_property(schema_version, missing_field):
    """
    Property 6 (Extended): Data Contract Validation Rejects Invalid Projects
    
    For any project file that violates Data Contract v1 schema (missing required
    fields, invalid status values, incorrect schema version), the load operation
    should fail with specific validation errors.
    
    **Validates: Requirements 4.2, 4.6**
    """
    # Feature: storycore-ai-assistant, Property 6: Data Contract Validation (invalid projects)
    
    # Create a base valid project
    scene = Scene(
        id="scene_1",
        number=1,
        title="Scene 1",
        description="Description",
        location="Location",
        time_of_day="morning",
        duration=3.0,
        characters=["char_1"],
        key_actions=["Action 1"],
        visual_notes=None
    )
    
    character = Character(
        id="char_1",
        name="Character 1",
        role="Role 1",
        description="Description",
        appearance="Appearance",
        personality="Personality",
        visual_reference=None
    )
    
    shot = Shot(
        id="seq_1_shot_1",
        number=1,
        type="medium",
        camera_movement="static",
        duration=3.0,
        description="Shot description",
        visual_style="cinematic"
    )
    
    sequence = Sequence(
        id="seq_1",
        scene_id="scene_1",
        shots=[shot],
        total_duration=3.0
    )
    
    # Create metadata with invalid schema version
    metadata = ProjectMetadata(
        schema_version=schema_version,
        project_name="Test Project" if missing_field != "project_name" else "",
        capabilities={
            "grid_generation": True,
            "promotion_engine": True,
            "qa_engine": True,
            "autofix_engine": True
        },
        generation_status={
            "grid": "pending",
            "promotion": "pending"
        }
    )
    
    # Create project with intentional violations
    with tempfile.TemporaryDirectory() as temp_dir:
        project = Project(
            name="test_project",
            path=Path(temp_dir) / "test_project",
            metadata=metadata,
            scenes=[] if missing_field == "scenes" else [scene],
            characters=[] if missing_field == "characters" else [character],
            sequences=[sequence],
            created_at=datetime.now(),
            modified_at=datetime.now()
        )
        
        # Validate
        validator = DataContractValidator()
        result = validator.validate_project(project)
        
        # Invalid project should fail validation
        # Either errors or warnings should be present
        has_issues = len(result.errors) > 0 or len(result.warnings) > 0
        assert has_issues, "Invalid project passed validation without errors or warnings"
        
        # Check for specific error/warning based on violation
        if schema_version != "1.0":
            assert any("schema version" in err.lower() for err in result.errors), \
                "Expected schema version error"
        
        if missing_field == "project_name":
            assert any("project_name" in err.lower() for err in result.errors), \
                "Expected project_name error"
        
        if missing_field == "scenes":
            assert any("no scenes" in warn.lower() for warn in result.warnings), \
                "Expected scenes warning"
        
        if missing_field == "characters":
            assert any("no characters" in warn.lower() for warn in result.warnings), \
                "Expected characters warning"


@settings(max_examples=50, deadline=None)
@given(
    invalid_status=st.text(min_size=1, max_size=20).filter(
        lambda x: x not in ["pending", "done", "failed", "passed"]
    )
)
def test_invalid_status_fails_validation_property(invalid_status):
    """
    Property 6 (Extended): Invalid Status Values Rejected
    
    For any project with invalid generation status values, validation
    should fail with specific error messages.
    
    **Validates: Requirements 4.2, 4.6**
    """
    # Feature: storycore-ai-assistant, Property 6: Data Contract Validation (invalid status)
    
    # Create minimal valid project with invalid status
    scene = Scene(
        id="scene_1",
        number=1,
        title="Scene 1",
        description="Description",
        location="Location",
        time_of_day="morning",
        duration=3.0,
        characters=[],
        key_actions=[],
        visual_notes=None
    )
    
    character = Character(
        id="char_1",
        name="Character 1",
        role="Role 1",
        description="Description",
        appearance="Appearance",
        personality="Personality",
        visual_reference=None
    )
    
    shot = Shot(
        id="seq_1_shot_1",
        number=1,
        type="medium",
        camera_movement="static",
        duration=3.0,
        description="Shot description",
        visual_style="cinematic"
    )
    
    sequence = Sequence(
        id="seq_1",
        scene_id="scene_1",
        shots=[shot],
        total_duration=3.0
    )
    
    # Create metadata with invalid status
    metadata = ProjectMetadata(
        schema_version="1.0",
        project_name="Test Project",
        capabilities={
            "grid_generation": True,
            "promotion_engine": True,
            "qa_engine": True,
            "autofix_engine": True
        },
        generation_status={
            "grid": invalid_status,  # Invalid status
            "promotion": "pending"
        }
    )
    
    with tempfile.TemporaryDirectory() as temp_dir:
        project = Project(
            name="test_project",
            path=Path(temp_dir) / "test_project",
            metadata=metadata,
            scenes=[scene],
            characters=[character],
            sequences=[sequence],
            created_at=datetime.now(),
            modified_at=datetime.now()
        )
        
        # Validate
        validator = DataContractValidator()
        result = validator.validate_project(project)
        
        # Should have error about invalid status
        assert not result.valid, "Project with invalid status passed validation"
        assert any("invalid status" in err.lower() for err in result.errors), \
            f"Expected invalid status error, got: {result.errors}"
