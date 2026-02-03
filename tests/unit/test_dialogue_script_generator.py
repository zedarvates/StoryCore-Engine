"""
Unit tests for DialogueScriptGenerator.

Tests dialogue generation, character voice consistency, and scene organization.
"""

import pytest
from src.end_to_end.dialogue_script_generator import DialogueScriptGenerator
from src.end_to_end.data_models import (
    ParsedPrompt, CharacterInfo, StoryStructure, Act, EmotionalBeat, Character
)


@pytest.fixture
def dialogue_generator():
    """Create DialogueScriptGenerator instance"""
    return DialogueScriptGenerator()


@pytest.fixture
def sample_parsed_prompt():
    """Create sample parsed prompt"""
    return ParsedPrompt(
        project_title="Test Story",
        genre="thriller",
        video_type="short_film",
        mood=["tense"],
        setting="Dark City",
        time_period="present",
        characters=[
            CharacterInfo(name="Alex", role="protagonist", description="Detective"),
            CharacterInfo(name="Morgan", role="antagonist", description="Criminal")
        ],
        key_elements=["mystery"],
        visual_style=["noir"],
        aspect_ratio="16:9",
        duration_seconds=120,
        raw_prompt="A thriller...",
        confidence_scores={}
    )


@pytest.fixture
def sample_story_structure():
    """Create sample story structure"""
    return StoryStructure(
        story_id="story-123",
        title="Test Story",
        logline="A detective hunts a criminal",
        acts=[
            Act(
                act_number=1,
                name="Setup",
                description="Introduce the detective",
                duration=30,
                scenes=["scene-1-1", "scene-1-2"]
            ),
            Act(
                act_number=2,
                name="Confrontation",
                description="The hunt begins",
                duration=60,
                scenes=["scene-2-1", "scene-2-2", "scene-2-3"]
            ),
            Act(
                act_number=3,
                name="Resolution",
                description="Final showdown",
                duration=30,
                scenes=["scene-3-1", "scene-3-2"]
            )
        ],
        themes=["justice", "morality"],
        emotional_arc=[
            EmotionalBeat(beat_id="b1", emotion="setup", intensity=0.3, timestamp=0.0),
            EmotionalBeat(beat_id="b2", emotion="climax", intensity=1.0, timestamp=90.0)
        ]
    )


@pytest.fixture
def sample_characters():
    """Create sample characters"""
    return [
        Character(
            character_id="char-1",
            name="Alex",
            role="protagonist",
            description="A detective",
            visual_description="Sharp features",
            personality_traits=["determined", "analytical"],
            relationships={"char-2": "adversary"}
        ),
        Character(
            character_id="char-2",
            name="Morgan",
            role="antagonist",
            description="A criminal",
            visual_description="Menacing presence",
            personality_traits=["cunning", "ruthless"],
            relationships={"char-1": "nemesis"}
        )
    ]


def test_generate_dialogue_script_basic(dialogue_generator, sample_parsed_prompt, sample_story_structure, sample_characters):
    """Test basic dialogue script generation"""
    script = dialogue_generator.generate_dialogue_script(
        sample_parsed_prompt,
        sample_story_structure,
        sample_characters
    )
    
    assert script.script_id
    assert len(script.scenes) > 0
    assert script.total_lines >= 0
    assert script.estimated_duration >= 0


def test_dialogue_scenes_match_story_acts(dialogue_generator, sample_parsed_prompt, sample_story_structure, sample_characters):
    """Test dialogue scenes match story structure"""
    script = dialogue_generator.generate_dialogue_script(
        sample_parsed_prompt,
        sample_story_structure,
        sample_characters
    )
    
    # Should have scenes for each scene in story structure
    total_story_scenes = sum(len(act.scenes) for act in sample_story_structure.acts)
    assert len(script.scenes) == total_story_scenes


def test_dialogue_lines_have_required_fields(dialogue_generator, sample_parsed_prompt, sample_story_structure, sample_characters):
    """Test dialogue lines have all required fields"""
    script = dialogue_generator.generate_dialogue_script(
        sample_parsed_prompt,
        sample_story_structure,
        sample_characters
    )
    
    for scene in script.scenes:
        for line in scene.dialogue_lines:
            assert line.line_id
            assert line.character_id
            assert line.character_name
            assert line.text
            assert line.emotion
            assert line.delivery_notes


def test_character_voice_consistency(dialogue_generator, sample_parsed_prompt, sample_story_structure, sample_characters):
    """Test character voice remains consistent"""
    script = dialogue_generator.generate_dialogue_script(
        sample_parsed_prompt,
        sample_story_structure,
        sample_characters
    )
    
    # Collect all lines by character
    lines_by_character = {}
    for scene in script.scenes:
        for line in scene.dialogue_lines:
            if line.character_id not in lines_by_character:
                lines_by_character[line.character_id] = []
            lines_by_character[line.character_id].append(line)
    
    # Check each character has consistent delivery style
    for char_id, lines in lines_by_character.items():
        if len(lines) > 1:
            # All lines should have delivery notes
            assert all(line.delivery_notes for line in lines)


def test_scene_has_location_and_time(dialogue_generator, sample_parsed_prompt, sample_story_structure, sample_characters):
    """Test scenes have location and time information"""
    script = dialogue_generator.generate_dialogue_script(
        sample_parsed_prompt,
        sample_story_structure,
        sample_characters
    )
    
    for scene in script.scenes:
        assert scene.location
        assert scene.time
        assert len(scene.location) > 0
        assert len(scene.time) > 0


def test_scene_has_characters_present(dialogue_generator, sample_parsed_prompt, sample_story_structure, sample_characters):
    """Test scenes list characters present"""
    script = dialogue_generator.generate_dialogue_script(
        sample_parsed_prompt,
        sample_story_structure,
        sample_characters
    )
    
    for scene in script.scenes:
        assert len(scene.characters_present) > 0
        # Characters should be valid IDs
        assert all(isinstance(char_id, str) for char_id in scene.characters_present)


def test_scene_has_action_notes(dialogue_generator, sample_parsed_prompt, sample_story_structure, sample_characters):
    """Test scenes have action notes"""
    script = dialogue_generator.generate_dialogue_script(
        sample_parsed_prompt,
        sample_story_structure,
        sample_characters
    )
    
    for scene in script.scenes:
        assert len(scene.action_notes) > 0
        assert all(isinstance(note, str) for note in scene.action_notes)


def test_total_lines_count_accurate(dialogue_generator, sample_parsed_prompt, sample_story_structure, sample_characters):
    """Test total lines count is accurate"""
    script = dialogue_generator.generate_dialogue_script(
        sample_parsed_prompt,
        sample_story_structure,
        sample_characters
    )
    
    actual_lines = sum(len(scene.dialogue_lines) for scene in script.scenes)
    assert script.total_lines == actual_lines


def test_no_dialogue_for_music_video(dialogue_generator, sample_story_structure, sample_characters):
    """Test music videos don't generate dialogue"""
    music_prompt = ParsedPrompt(
        project_title="Music Video",
        genre="music",
        video_type="music_video",
        mood=["energetic"],
        setting="Stage",
        time_period="present",
        characters=[],
        key_elements=["performance"],
        visual_style=["colorful"],
        aspect_ratio="16:9",
        duration_seconds=180,
        raw_prompt="A music video...",
        confidence_scores={}
    )
    
    script = dialogue_generator.generate_dialogue_script(
        music_prompt,
        sample_story_structure,
        sample_characters
    )
    
    # Music videos typically don't need dialogue
    assert script.total_lines == 0 or len(script.scenes) == 0


def test_empty_characters_list(dialogue_generator, sample_parsed_prompt, sample_story_structure):
    """Test handling of empty characters list"""
    script = dialogue_generator.generate_dialogue_script(
        sample_parsed_prompt,
        sample_story_structure,
        []
    )
    
    # Should still create scenes but with no dialogue
    assert script.script_id
    # Scenes may be empty or have no dialogue lines
    for scene in script.scenes:
        assert len(scene.dialogue_lines) == 0


def test_emotion_progression(dialogue_generator, sample_parsed_prompt, sample_story_structure, sample_characters):
    """Test emotions progress through story"""
    script = dialogue_generator.generate_dialogue_script(
        sample_parsed_prompt,
        sample_story_structure,
        sample_characters
    )
    
    # Collect emotions from all scenes
    all_emotions = []
    for scene in script.scenes:
        for line in scene.dialogue_lines:
            all_emotions.append(line.emotion)
    
    # Should have variety of emotions
    unique_emotions = set(all_emotions)
    assert len(unique_emotions) >= 2


def test_delivery_notes_match_character_role(dialogue_generator, sample_parsed_prompt, sample_story_structure, sample_characters):
    """Test delivery notes are appropriate for character roles"""
    script = dialogue_generator.generate_dialogue_script(
        sample_parsed_prompt,
        sample_story_structure,
        sample_characters
    )
    
    # Find protagonist lines
    protagonist = sample_characters[0]
    protagonist_lines = []
    for scene in script.scenes:
        for line in scene.dialogue_lines:
            if line.character_id == protagonist.character_id:
                protagonist_lines.append(line)
    
    # Protagonist should have appropriate delivery notes
    if protagonist_lines:
        for line in protagonist_lines:
            assert line.delivery_notes
            # Should be meaningful
            assert len(line.delivery_notes) > 5


def test_estimated_duration_reasonable(dialogue_generator, sample_parsed_prompt, sample_story_structure, sample_characters):
    """Test estimated duration is reasonable"""
    script = dialogue_generator.generate_dialogue_script(
        sample_parsed_prompt,
        sample_story_structure,
        sample_characters
    )
    
    if script.total_lines > 0:
        # Duration should be positive
        assert script.estimated_duration > 0
        # Should be reasonable (not too short or too long)
        assert script.estimated_duration < sample_parsed_prompt.duration_seconds * 2


def test_scene_ids_match_story_structure(dialogue_generator, sample_parsed_prompt, sample_story_structure, sample_characters):
    """Test scene IDs match story structure"""
    script = dialogue_generator.generate_dialogue_script(
        sample_parsed_prompt,
        sample_story_structure,
        sample_characters
    )
    
    # Collect all scene IDs from story
    story_scene_ids = []
    for act in sample_story_structure.acts:
        story_scene_ids.extend(act.scenes)
    
    # Collect all scene IDs from script
    script_scene_ids = [scene.scene_id for scene in script.scenes]
    
    # Should match
    assert set(script_scene_ids) == set(story_scene_ids)


def test_dialogue_text_not_empty(dialogue_generator, sample_parsed_prompt, sample_story_structure, sample_characters):
    """Test dialogue text is not empty"""
    script = dialogue_generator.generate_dialogue_script(
        sample_parsed_prompt,
        sample_story_structure,
        sample_characters
    )
    
    for scene in script.scenes:
        for line in scene.dialogue_lines:
            assert len(line.text) > 0
            assert len(line.text) > 5  # Should be meaningful
