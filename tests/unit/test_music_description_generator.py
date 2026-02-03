"""
Unit tests for MusicDescriptionGenerator.

Tests music description generation, timeline cues, and sound effects.
"""

import pytest
from src.end_to_end.music_description_generator import MusicDescriptionGenerator
from src.end_to_end.data_models import (
    ParsedPrompt, CharacterInfo, StoryStructure, Act, EmotionalBeat
)


@pytest.fixture
def music_generator():
    """Create MusicDescriptionGenerator instance"""
    return MusicDescriptionGenerator()


@pytest.fixture
def sample_parsed_prompt():
    """Create sample parsed prompt"""
    return ParsedPrompt(
        project_title="Epic Adventure",
        genre="fantasy",
        video_type="trailer",
        mood=["heroic", "epic"],
        setting="Medieval Kingdom",
        time_period="medieval",
        characters=[CharacterInfo(name="Hero", role="protagonist", description="Knight")],
        key_elements=["quest"],
        visual_style=["epic", "cinematic"],
        aspect_ratio="16:9",
        duration_seconds=90,
        raw_prompt="A fantasy trailer...",
        confidence_scores={}
    )


@pytest.fixture
def sample_story_structure():
    """Create sample story structure"""
    return StoryStructure(
        story_id="story-123",
        title="Epic Adventure",
        logline="A hero's quest",
        acts=[
            Act(act_number=1, name="Setup", description="Intro", duration=22, scenes=["scene-1-1"]),
            Act(act_number=2, name="Build", description="Quest", duration=45, scenes=["scene-2-1"]),
            Act(act_number=3, name="Climax", description="Battle", duration=23, scenes=["scene-3-1"])
        ],
        themes=["heroism"],
        emotional_arc=[EmotionalBeat(beat_id="b1", emotion="setup", intensity=0.3, timestamp=0.0)]
    )


def test_generate_music_description_basic(music_generator, sample_parsed_prompt, sample_story_structure):
    """Test basic music description generation"""
    music = music_generator.generate_music_description(
        sample_parsed_prompt,
        sample_story_structure
    )
    
    assert music.music_id
    assert music.genre
    assert len(music.mood) > 0
    assert music.tempo
    assert len(music.instruments) > 0
    assert len(music.sound_effects) > 0
    assert len(music.timeline) > 0


def test_genre_matches_prompt(music_generator, sample_parsed_prompt, sample_story_structure):
    """Test music genre matches prompt genre"""
    music = music_generator.generate_music_description(
        sample_parsed_prompt,
        sample_story_structure
    )
    
    # Fantasy should have orchestral music
    assert "orchestral" in music.genre.lower() or "epic" in music.genre.lower()


def test_mood_includes_prompt_moods(music_generator, sample_parsed_prompt, sample_story_structure):
    """Test mood includes prompt moods"""
    music = music_generator.generate_music_description(
        sample_parsed_prompt,
        sample_story_structure
    )
    
    # Should include at least one mood from prompt
    prompt_moods = [m.lower() for m in sample_parsed_prompt.mood]
    music_moods = [m.lower() for m in music.mood]
    assert any(pm in music_moods for pm in prompt_moods)


def test_instruments_appropriate_for_genre(music_generator, sample_parsed_prompt, sample_story_structure):
    """Test instruments are appropriate for genre"""
    music = music_generator.generate_music_description(
        sample_parsed_prompt,
        sample_story_structure
    )
    
    # Fantasy should have orchestral instruments
    instruments_str = " ".join(music.instruments).lower()
    assert "orchestra" in instruments_str or "strings" in instruments_str or "brass" in instruments_str


def test_sound_effects_generated(music_generator, sample_parsed_prompt, sample_story_structure):
    """Test sound effects are generated"""
    music = music_generator.generate_music_description(
        sample_parsed_prompt,
        sample_story_structure
    )
    
    assert len(music.sound_effects) > 0
    for effect in music.sound_effects:
        assert effect.effect_id
        assert effect.name
        assert effect.description
        assert effect.timestamp >= 0


def test_timeline_cues_generated(music_generator, sample_parsed_prompt, sample_story_structure):
    """Test timeline cues are generated"""
    music = music_generator.generate_music_description(
        sample_parsed_prompt,
        sample_story_structure
    )
    
    # Should have cues for each act plus final cue
    assert len(music.timeline) >= len(sample_story_structure.acts)
    
    for cue in music.timeline:
        assert cue.cue_id
        assert cue.timestamp >= 0
        assert cue.description
        assert 0.0 <= cue.intensity <= 1.0


def test_timeline_cues_in_order(music_generator, sample_parsed_prompt, sample_story_structure):
    """Test timeline cues are in chronological order"""
    music = music_generator.generate_music_description(
        sample_parsed_prompt,
        sample_story_structure
    )
    
    timestamps = [cue.timestamp for cue in music.timeline]
    assert timestamps == sorted(timestamps)


def test_intensity_progression(music_generator, sample_parsed_prompt, sample_story_structure):
    """Test intensity progresses through timeline"""
    music = music_generator.generate_music_description(
        sample_parsed_prompt,
        sample_story_structure
    )
    
    # Should have varying intensities
    intensities = [cue.intensity for cue in music.timeline]
    assert len(set(intensities)) > 1
    
    # Should reach high intensity
    assert max(intensities) >= 0.8


def test_tempo_appropriate_for_mood(music_generator, sample_parsed_prompt, sample_story_structure):
    """Test tempo is appropriate for mood"""
    music = music_generator.generate_music_description(
        sample_parsed_prompt,
        sample_story_structure
    )
    
    # Heroic/epic mood should have moderate to fast tempo
    assert music.tempo
    assert len(music.tempo) > 0


def test_cyberpunk_genre(music_generator, sample_story_structure):
    """Test cyberpunk genre music"""
    cyberpunk_prompt = ParsedPrompt(
        project_title="Cyber Future",
        genre="cyberpunk",
        video_type="trailer",
        mood=["dark", "intense"],
        setting="Neo City",
        time_period="2048",
        characters=[],
        key_elements=["tech"],
        visual_style=["neon"],
        aspect_ratio="16:9",
        duration_seconds=60,
        raw_prompt="Cyberpunk...",
        confidence_scores={}
    )
    
    music = music_generator.generate_music_description(
        cyberpunk_prompt,
        sample_story_structure
    )
    
    # Should have electronic/synth music
    assert "electronic" in music.genre.lower() or "synth" in music.genre.lower()
    
    # Should have synth instruments
    instruments_str = " ".join(music.instruments).lower()
    assert "synth" in instruments_str or "electronic" in instruments_str


def test_horror_genre(music_generator, sample_story_structure):
    """Test horror genre music"""
    horror_prompt = ParsedPrompt(
        project_title="Dark Terror",
        genre="horror",
        video_type="trailer",
        mood=["ominous", "tense"],
        setting="Haunted House",
        time_period="present",
        characters=[],
        key_elements=["fear"],
        visual_style=["dark"],
        aspect_ratio="16:9",
        duration_seconds=60,
        raw_prompt="Horror...",
        confidence_scores={}
    )
    
    music = music_generator.generate_music_description(
        horror_prompt,
        sample_story_structure
    )
    
    # Should have dark/ambient music
    assert "dark" in music.genre.lower() or "ambient" in music.genre.lower()


def test_mood_count_limited(music_generator, sample_parsed_prompt, sample_story_structure):
    """Test mood count is limited to 3"""
    music = music_generator.generate_music_description(
        sample_parsed_prompt,
        sample_story_structure
    )
    
    assert len(music.mood) <= 3


def test_final_cue_at_end(music_generator, sample_parsed_prompt, sample_story_structure):
    """Test final cue is at end of duration"""
    music = music_generator.generate_music_description(
        sample_parsed_prompt,
        sample_story_structure
    )
    
    # Last cue should be at or near total duration
    last_cue = music.timeline[-1]
    assert last_cue.timestamp >= sample_parsed_prompt.duration_seconds * 0.9


def test_sound_effect_timestamps_valid(music_generator, sample_parsed_prompt, sample_story_structure):
    """Test sound effect timestamps are within duration"""
    music = music_generator.generate_music_description(
        sample_parsed_prompt,
        sample_story_structure
    )
    
    for effect in music.sound_effects:
        assert 0 <= effect.timestamp <= sample_parsed_prompt.duration_seconds


def test_cue_descriptions_meaningful(music_generator, sample_parsed_prompt, sample_story_structure):
    """Test cue descriptions are meaningful"""
    music = music_generator.generate_music_description(
        sample_parsed_prompt,
        sample_story_structure
    )
    
    for cue in music.timeline:
        assert len(cue.description) > 10
        # Should mention act or music context
        assert any(word in cue.description.lower() for word in ["music", "theme", "intensity", "mood", "resolution"])
