"""
Unit tests for StoryStructureGenerator.

Tests story structure generation, three-act structure, and emotional arcs.
"""

import pytest
from src.end_to_end.story_structure_generator import StoryStructureGenerator
from src.end_to_end.data_models import (
    ParsedPrompt, CharacterInfo, WorldConfig, ColorPalette,
    Location, Character
)


@pytest.fixture
def story_generator():
    """Create StoryStructureGenerator instance"""
    return StoryStructureGenerator()


@pytest.fixture
def sample_parsed_prompt():
    """Create sample parsed prompt"""
    return ParsedPrompt(
        project_title="Cyberpunk Revolution",
        genre="cyberpunk",
        video_type="trailer",
        mood=["dark", "intense"],
        setting="Neo Tokyo",
        time_period="2048",
        characters=[
            CharacterInfo(
                name="Alex",
                role="protagonist",
                description="A hacker"
            )
        ],
        key_elements=["rebellion", "technology"],
        visual_style=["neon", "dark"],
        aspect_ratio="16:9",
        duration_seconds=60,
        raw_prompt="Create a cyberpunk trailer...",
        confidence_scores={}
    )


@pytest.fixture
def sample_world_config():
    """Create sample world config"""
    return WorldConfig(
        world_id="world-123",
        name="Neo Tokyo",
        genre="cyberpunk",
        setting="Neo Tokyo",
        time_period="2048",
        visual_style=["neon"],
        color_palette=ColorPalette(
            primary="blue",
            secondary="pink",
            accent="purple",
            background="black"
        ),
        lighting_style="neon",
        atmosphere="dystopian",
        key_locations=[]
    )


@pytest.fixture
def sample_characters():
    """Create sample characters"""
    return [
        Character(
            character_id="char-1",
            name="Alex",
            role="protagonist",
            description="A skilled hacker",
            visual_description="Tech-savvy appearance",
            personality_traits=["determined", "rebellious"],
            relationships={}
        ),
        Character(
            character_id="char-2",
            name="Dr. Voss",
            role="antagonist",
            description="Corporate executive",
            visual_description="Imposing presence",
            personality_traits=["ruthless", "ambitious"],
            relationships={}
        )
    ]


def test_generate_story_structure_basic(story_generator, sample_parsed_prompt, sample_world_config, sample_characters):
    """Test basic story structure generation"""
    story = story_generator.generate_story_structure(
        sample_parsed_prompt,
        sample_world_config,
        sample_characters
    )
    
    assert story.story_id
    assert story.title == "Cyberpunk Revolution"
    assert story.logline
    assert len(story.acts) > 0
    assert len(story.themes) > 0
    assert len(story.emotional_arc) > 0


def test_story_has_three_acts_for_trailer(story_generator, sample_parsed_prompt, sample_world_config, sample_characters):
    """Test trailer has three acts"""
    story = story_generator.generate_story_structure(
        sample_parsed_prompt,
        sample_world_config,
        sample_characters
    )
    
    assert len(story.acts) == 3
    assert story.acts[0].act_number == 1
    assert story.acts[1].act_number == 2
    assert story.acts[2].act_number == 3


def test_act_durations_sum_to_total(story_generator, sample_parsed_prompt, sample_world_config, sample_characters):
    """Test that act durations sum to total duration"""
    story = story_generator.generate_story_structure(
        sample_parsed_prompt,
        sample_world_config,
        sample_characters
    )
    
    total_duration = sum(act.duration for act in story.acts)
    # Allow small rounding differences
    assert abs(total_duration - sample_parsed_prompt.duration_seconds) <= len(story.acts)


def test_acts_have_scenes(story_generator, sample_parsed_prompt, sample_world_config, sample_characters):
    """Test that acts have scene IDs"""
    story = story_generator.generate_story_structure(
        sample_parsed_prompt,
        sample_world_config,
        sample_characters
    )
    
    for act in story.acts:
        assert len(act.scenes) > 0
        assert all(isinstance(scene_id, str) for scene_id in act.scenes)
        assert all(scene_id.startswith("scene-") for scene_id in act.scenes)


def test_logline_includes_protagonist(story_generator, sample_parsed_prompt, sample_world_config, sample_characters):
    """Test logline includes protagonist name"""
    story = story_generator.generate_story_structure(
        sample_parsed_prompt,
        sample_world_config,
        sample_characters
    )
    
    assert "Alex" in story.logline


def test_logline_includes_setting(story_generator, sample_parsed_prompt, sample_world_config, sample_characters):
    """Test logline includes setting"""
    story = story_generator.generate_story_structure(
        sample_parsed_prompt,
        sample_world_config,
        sample_characters
    )
    
    assert "Neo Tokyo" in story.logline


def test_themes_are_genre_appropriate(story_generator, sample_parsed_prompt, sample_world_config, sample_characters):
    """Test themes match genre"""
    story = story_generator.generate_story_structure(
        sample_parsed_prompt,
        sample_world_config,
        sample_characters
    )
    
    # Cyberpunk themes
    cyberpunk_themes = ["technology", "corporate", "rebellion", "freedom", "identity"]
    assert any(
        any(theme_word in theme.lower() for theme_word in cyberpunk_themes)
        for theme in story.themes
    )


def test_emotional_arc_has_progression(story_generator, sample_parsed_prompt, sample_world_config, sample_characters):
    """Test emotional arc has proper progression"""
    story = story_generator.generate_story_structure(
        sample_parsed_prompt,
        sample_world_config,
        sample_characters
    )
    
    # Should have multiple beats
    assert len(story.emotional_arc) >= 3
    
    # Timestamps should be in order
    timestamps = [beat.timestamp for beat in story.emotional_arc]
    assert timestamps == sorted(timestamps)
    
    # Intensities should be between 0 and 1
    for beat in story.emotional_arc:
        assert 0.0 <= beat.intensity <= 1.0


def test_emotional_arc_reaches_climax(story_generator, sample_parsed_prompt, sample_world_config, sample_characters):
    """Test emotional arc reaches high intensity"""
    story = story_generator.generate_story_structure(
        sample_parsed_prompt,
        sample_world_config,
        sample_characters
    )
    
    max_intensity = max(beat.intensity for beat in story.emotional_arc)
    assert max_intensity >= 0.8


def test_teaser_has_two_acts(story_generator, sample_world_config, sample_characters):
    """Test teaser video type has two acts"""
    teaser_prompt = ParsedPrompt(
        project_title="Mystery Teaser",
        genre="thriller",
        video_type="teaser",
        mood=["suspenseful"],
        setting="City",
        time_period="present",
        characters=[CharacterInfo(name="John", role="protagonist", description="Detective")],
        key_elements=["mystery"],
        visual_style=["noir"],
        aspect_ratio="16:9",
        duration_seconds=30,
        raw_prompt="A teaser...",
        confidence_scores={}
    )
    
    story = story_generator.generate_story_structure(
        teaser_prompt,
        sample_world_config,
        sample_characters
    )
    
    assert len(story.acts) == 2


def test_short_film_structure(story_generator, sample_world_config, sample_characters):
    """Test short film has appropriate structure"""
    short_film_prompt = ParsedPrompt(
        project_title="Short Film",
        genre="drama",
        video_type="short_film",
        mood=["emotional"],
        setting="Small Town",
        time_period="present",
        characters=[CharacterInfo(name="Sarah", role="protagonist", description="Teacher")],
        key_elements=["redemption"],
        visual_style=["realistic"],
        aspect_ratio="16:9",
        duration_seconds=180,
        raw_prompt="A short film...",
        confidence_scores={}
    )
    
    story = story_generator.generate_story_structure(
        short_film_prompt,
        sample_world_config,
        sample_characters
    )
    
    assert len(story.acts) == 3
    # Short films should have more scenes
    total_scenes = sum(len(act.scenes) for act in story.acts)
    assert total_scenes >= 8


def test_act_names_match_video_type(story_generator, sample_parsed_prompt, sample_world_config, sample_characters):
    """Test act names are appropriate for video type"""
    story = story_generator.generate_story_structure(
        sample_parsed_prompt,
        sample_world_config,
        sample_characters
    )
    
    # Trailer should have Setup, Build, Climax
    assert "Setup" in story.acts[0].name or "Act I" in story.acts[0].name
    assert "Build" in story.acts[1].name or "Act II" in story.acts[1].name
    assert "Climax" in story.acts[2].name or "Act III" in story.acts[2].name


def test_act_descriptions_are_meaningful(story_generator, sample_parsed_prompt, sample_world_config, sample_characters):
    """Test act descriptions contain meaningful content"""
    story = story_generator.generate_story_structure(
        sample_parsed_prompt,
        sample_world_config,
        sample_characters
    )
    
    for act in story.acts:
        assert len(act.description) > 20
        # At least one act should mention protagonist or setting
    
    all_descriptions = " ".join(act.description for act in story.acts)
    assert "Alex" in all_descriptions or "Neo Tokyo" in all_descriptions or "protagonist" in all_descriptions


def test_empty_characters_list(story_generator, sample_world_config):
    """Test handling of empty characters list"""
    prompt = ParsedPrompt(
        project_title="Abstract",
        genre="experimental",
        video_type="trailer",
        mood=["surreal"],
        setting="Unknown",
        time_period="timeless",
        characters=[],
        key_elements=["abstract"],
        visual_style=["surreal"],
        aspect_ratio="1:1",
        duration_seconds=30,
        raw_prompt="Abstract video",
        confidence_scores={}
    )
    
    story = story_generator.generate_story_structure(
        prompt,
        sample_world_config,
        []
    )
    
    assert story.logline
    assert len(story.acts) > 0


def test_themes_include_key_elements(story_generator, sample_parsed_prompt, sample_world_config, sample_characters):
    """Test themes include key elements from prompt"""
    story = story_generator.generate_story_structure(
        sample_parsed_prompt,
        sample_world_config,
        sample_characters
    )
    
    # Should have at least 2 themes
    assert len(story.themes) >= 2
    
    # Themes should be meaningful strings
    for theme in story.themes:
        assert len(theme) > 5


def test_emotional_beats_have_unique_ids(story_generator, sample_parsed_prompt, sample_world_config, sample_characters):
    """Test emotional beats have unique IDs"""
    story = story_generator.generate_story_structure(
        sample_parsed_prompt,
        sample_world_config,
        sample_characters
    )
    
    beat_ids = [beat.beat_id for beat in story.emotional_arc]
    assert len(beat_ids) == len(set(beat_ids))


def test_commercial_structure(story_generator, sample_world_config, sample_characters):
    """Test commercial has appropriate structure"""
    commercial_prompt = ParsedPrompt(
        project_title="Product Commercial",
        genre="commercial",
        video_type="commercial",
        mood=["upbeat"],
        setting="Modern Office",
        time_period="present",
        characters=[],
        key_elements=["product"],
        visual_style=["clean"],
        aspect_ratio="16:9",
        duration_seconds=30,
        raw_prompt="A commercial...",
        confidence_scores={}
    )
    
    story = story_generator.generate_story_structure(
        commercial_prompt,
        sample_world_config,
        sample_characters
    )
    
    assert len(story.acts) == 3
    # Commercial acts should be Problem, Solution, Call-to-Action
    assert "Problem" in story.acts[0].name or "Act I" in story.acts[0].name
