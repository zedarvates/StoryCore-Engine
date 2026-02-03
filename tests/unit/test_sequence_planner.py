"""
Unit tests for SequencePlanner.

Tests sequence planning, shot distribution, and camera selection.
"""

import pytest
from src.end_to_end.sequence_planner import SequencePlanner
from src.end_to_end.data_models import (
    ParsedPrompt, CharacterInfo, StoryStructure, Act, EmotionalBeat,
    DialogueScript, DialogueScene, DialogueLine, WorldConfig, ColorPalette, Location
)


@pytest.fixture
def sequence_planner():
    """Create SequencePlanner instance"""
    return SequencePlanner()


@pytest.fixture
def sample_parsed_prompt():
    """Create sample parsed prompt"""
    return ParsedPrompt(
        project_title="Test Film",
        genre="thriller",
        video_type="trailer",
        mood=["tense", "dark"],
        setting="Urban City",
        time_period="present",
        characters=[CharacterInfo(name="Alex", role="protagonist", description="Hero")],
        key_elements=["action"],
        visual_style=["cinematic", "gritty"],
        aspect_ratio="16:9",
        duration_seconds=60,
        raw_prompt="A thriller trailer...",
        confidence_scores={}
    )


@pytest.fixture
def sample_story_structure():
    """Create sample story structure"""
    return StoryStructure(
        story_id="story-123",
        title="Test Film",
        logline="A hero's journey",
        acts=[
            Act(act_number=1, name="Setup", description="Intro", duration=15, scenes=["scene-1-1"]),
            Act(act_number=2, name="Build", description="Conflict", duration=30, scenes=["scene-2-1"]),
            Act(act_number=3, name="Climax", description="Resolution", duration=15, scenes=["scene-3-1"])
        ],
        themes=["justice"],
        emotional_arc=[EmotionalBeat(beat_id="b1", emotion="setup", intensity=0.3, timestamp=0.0)]
    )


@pytest.fixture
def sample_dialogue_script():
    """Create sample dialogue script"""
    return DialogueScript(
        script_id="script-123",
        scenes=[
            DialogueScene(
                scene_id="scene-1-1",
                scene_name="Opening",
                location="City",
                time="Day",
                characters_present=["char-1"],
                dialogue_lines=[
                    DialogueLine(
                        line_id="line-1",
                        character_id="char-1",
                        character_name="Alex",
                        text="This is the beginning.",
                        emotion="determined",
                        delivery_notes="confident"
                    )
                ],
                action_notes=["Character enters"]
            )
        ],
        total_lines=1,
        estimated_duration=5
    )


@pytest.fixture
def sample_world_config():
    """Create sample world config"""
    return WorldConfig(
        world_id="world-123",
        name="Urban World",
        genre="thriller",
        setting="City",
        time_period="present",
        visual_style=["gritty", "realistic"],
        color_palette=ColorPalette(
            primary="gray",
            secondary="blue",
            accent="red",
            background="black"
        ),
        lighting_style="dramatic shadows",
        atmosphere="tense",
        key_locations=[Location(location_id="loc-1", name="Street", description="Dark street", visual_description="Moody")]
    )


def test_plan_sequences_basic(sequence_planner, sample_parsed_prompt, sample_story_structure, sample_dialogue_script, sample_world_config):
    """Test basic sequence planning"""
    plan = sequence_planner.plan_sequences(
        sample_parsed_prompt,
        sample_story_structure,
        sample_dialogue_script,
        sample_world_config
    )
    
    assert plan.sequence_id
    assert plan.total_duration == 60
    assert len(plan.sequences) > 0
    assert plan.total_shots > 0


def test_sequences_match_acts(sequence_planner, sample_parsed_prompt, sample_story_structure, sample_dialogue_script, sample_world_config):
    """Test sequences match story acts"""
    plan = sequence_planner.plan_sequences(
        sample_parsed_prompt,
        sample_story_structure,
        sample_dialogue_script,
        sample_world_config
    )
    
    assert len(plan.sequences) == len(sample_story_structure.acts)


def test_each_sequence_has_shots(sequence_planner, sample_parsed_prompt, sample_story_structure, sample_dialogue_script, sample_world_config):
    """Test each sequence has shots"""
    plan = sequence_planner.plan_sequences(
        sample_parsed_prompt,
        sample_story_structure,
        sample_dialogue_script,
        sample_world_config
    )
    
    for sequence in plan.sequences:
        assert len(sequence.shots) >= 2


def test_shots_have_required_fields(sequence_planner, sample_parsed_prompt, sample_story_structure, sample_dialogue_script, sample_world_config):
    """Test shots have all required fields"""
    plan = sequence_planner.plan_sequences(
        sample_parsed_prompt,
        sample_story_structure,
        sample_dialogue_script,
        sample_world_config
    )
    
    for sequence in plan.sequences:
        for shot in sequence.shots:
            assert shot.shot_id
            assert shot.shot_number > 0
            assert shot.duration > 0
            assert shot.description
            assert shot.camera_angle
            assert shot.camera_movement
            assert shot.lighting
            assert shot.composition


def test_shot_numbers_sequential(sequence_planner, sample_parsed_prompt, sample_story_structure, sample_dialogue_script, sample_world_config):
    """Test shot numbers are sequential"""
    plan = sequence_planner.plan_sequences(
        sample_parsed_prompt,
        sample_story_structure,
        sample_dialogue_script,
        sample_world_config
    )
    
    for sequence in plan.sequences:
        shot_numbers = [shot.shot_number for shot in sequence.shots]
        assert shot_numbers == list(range(1, len(shot_numbers) + 1))


def test_prompt_modules_complete(sequence_planner, sample_parsed_prompt, sample_story_structure, sample_dialogue_script, sample_world_config):
    """Test prompt modules are complete"""
    plan = sequence_planner.plan_sequences(
        sample_parsed_prompt,
        sample_story_structure,
        sample_dialogue_script,
        sample_world_config
    )
    
    for sequence in plan.sequences:
        for shot in sequence.shots:
            assert shot.prompt_modules.base
            assert shot.prompt_modules.style
            assert shot.prompt_modules.lighting
            assert shot.prompt_modules.composition
            assert shot.prompt_modules.camera


def test_camera_angles_valid(sequence_planner, sample_parsed_prompt, sample_story_structure, sample_dialogue_script, sample_world_config):
    """Test camera angles are valid"""
    plan = sequence_planner.plan_sequences(
        sample_parsed_prompt,
        sample_story_structure,
        sample_dialogue_script,
        sample_world_config
    )
    
    valid_angles = sequence_planner.camera_angles
    
    for sequence in plan.sequences:
        for shot in sequence.shots:
            assert shot.camera_angle in valid_angles


def test_camera_movements_valid(sequence_planner, sample_parsed_prompt, sample_story_structure, sample_dialogue_script, sample_world_config):
    """Test camera movements are valid"""
    plan = sequence_planner.plan_sequences(
        sample_parsed_prompt,
        sample_story_structure,
        sample_dialogue_script,
        sample_world_config
    )
    
    valid_movements = sequence_planner.camera_movements
    
    for sequence in plan.sequences:
        for shot in sequence.shots:
            assert shot.camera_movement in valid_movements


def test_sequence_durations_match_acts(sequence_planner, sample_parsed_prompt, sample_story_structure, sample_dialogue_script, sample_world_config):
    """Test sequence durations match act durations"""
    plan = sequence_planner.plan_sequences(
        sample_parsed_prompt,
        sample_story_structure,
        sample_dialogue_script,
        sample_world_config
    )
    
    for i, sequence in enumerate(plan.sequences):
        assert sequence.duration == sample_story_structure.acts[i].duration


def test_total_shots_accurate(sequence_planner, sample_parsed_prompt, sample_story_structure, sample_dialogue_script, sample_world_config):
    """Test total shots count is accurate"""
    plan = sequence_planner.plan_sequences(
        sample_parsed_prompt,
        sample_story_structure,
        sample_dialogue_script,
        sample_world_config
    )
    
    actual_shots = sum(len(seq.shots) for seq in plan.sequences)
    assert plan.total_shots == actual_shots


def test_sequences_have_mood(sequence_planner, sample_parsed_prompt, sample_story_structure, sample_dialogue_script, sample_world_config):
    """Test sequences have mood"""
    plan = sequence_planner.plan_sequences(
        sample_parsed_prompt,
        sample_story_structure,
        sample_dialogue_script,
        sample_world_config
    )
    
    for sequence in plan.sequences:
        assert sequence.mood
        assert len(sequence.mood) > 0


def test_sequences_have_visual_direction(sequence_planner, sample_parsed_prompt, sample_story_structure, sample_dialogue_script, sample_world_config):
    """Test sequences have visual direction"""
    plan = sequence_planner.plan_sequences(
        sample_parsed_prompt,
        sample_story_structure,
        sample_dialogue_script,
        sample_world_config
    )
    
    for sequence in plan.sequences:
        assert sequence.visual_direction
        assert len(sequence.visual_direction) > 0


def test_shot_descriptions_meaningful(sequence_planner, sample_parsed_prompt, sample_story_structure, sample_dialogue_script, sample_world_config):
    """Test shot descriptions are meaningful"""
    plan = sequence_planner.plan_sequences(
        sample_parsed_prompt,
        sample_story_structure,
        sample_dialogue_script,
        sample_world_config
    )
    
    for sequence in plan.sequences:
        for shot in sequence.shots:
            assert len(shot.description) > 20
            # Should mention setting
            assert sample_parsed_prompt.setting in shot.description


def test_first_shot_is_establishing(sequence_planner, sample_parsed_prompt, sample_story_structure, sample_dialogue_script, sample_world_config):
    """Test first shot in sequence is establishing"""
    plan = sequence_planner.plan_sequences(
        sample_parsed_prompt,
        sample_story_structure,
        sample_dialogue_script,
        sample_world_config
    )
    
    for sequence in plan.sequences:
        first_shot = sequence.shots[0]
        assert first_shot.shot_number == 1
        # Establishing shots typically use high angle and dolly in
        assert "establishing" in first_shot.description.lower() or first_shot.camera_angle == "high angle"


def test_shot_count_appropriate_for_duration(sequence_planner, sample_parsed_prompt, sample_story_structure, sample_dialogue_script, sample_world_config):
    """Test shot count is appropriate for sequence duration"""
    plan = sequence_planner.plan_sequences(
        sample_parsed_prompt,
        sample_story_structure,
        sample_dialogue_script,
        sample_world_config
    )
    
    for sequence in plan.sequences:
        # Each shot should be at least 2 seconds
        avg_shot_duration = sequence.duration / len(sequence.shots)
        assert avg_shot_duration >= 2
        # And not too long (max 10 seconds for trailer)
        assert avg_shot_duration <= 15
