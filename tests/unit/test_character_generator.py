"""
Unit tests for CharacterGenerator.

Tests character generation, relationship mapping, and visual descriptions.
"""

import pytest
from src.end_to_end.character_generator import CharacterGenerator
from src.end_to_end.data_models import (
    ParsedPrompt, CharacterInfo, WorldConfig, ColorPalette, Location
)


@pytest.fixture
def character_generator():
    """Create CharacterGenerator instance"""
    return CharacterGenerator()


@pytest.fixture
def sample_parsed_prompt():
    """Create sample parsed prompt"""
    return ParsedPrompt(
        project_title="Cyberpunk Adventure",
        genre="cyberpunk",
        video_type="trailer",
        mood=["dark", "intense"],
        setting="Neo Tokyo",
        time_period="2048",
        characters=[
            CharacterInfo(
                name="Alex Chen",
                role="protagonist",
                description="A skilled hacker fighting against corporate control"
            ),
            CharacterInfo(
                name="Dr. Voss",
                role="antagonist",
                description="A ruthless corporate executive"
            ),
            CharacterInfo(
                name="Maya",
                role="sidekick",
                description="Alex's loyal tech specialist friend"
            )
        ],
        key_elements=["hacking", "rebellion", "technology"],
        visual_style=["neon", "dark", "futuristic"],
        aspect_ratio="16:9",
        duration_seconds=60,
        raw_prompt="Create a cyberpunk trailer about a hacker...",
        confidence_scores={"genre": 0.95}
    )


@pytest.fixture
def sample_world_config():
    """Create sample world config"""
    return WorldConfig(
        world_id="world-123",
        name="Neo Tokyo 2048",
        genre="cyberpunk",
        setting="Neo Tokyo",
        time_period="2048",
        visual_style=["neon", "dark", "futuristic"],
        color_palette=ColorPalette(
            primary="electric blue",
            secondary="neon pink",
            accent="cyber purple",
            background="dark gray",
            additional=["chrome silver"]
        ),
        lighting_style="neon-lit shadows",
        atmosphere="dystopian urban",
        key_locations=[
            Location(
                location_id="loc-1",
                name="Downtown",
                description="Neon-lit streets",
                visual_description="Towering skyscrapers with holographic ads"
            )
        ]
    )


def test_generate_characters_basic(character_generator, sample_parsed_prompt, sample_world_config):
    """Test basic character generation"""
    characters = character_generator.generate_characters(
        sample_parsed_prompt,
        sample_world_config
    )
    
    assert len(characters) == 3
    assert all(char.character_id for char in characters)
    assert all(char.name for char in characters)
    assert all(char.role for char in characters)


def test_character_has_personality_traits(character_generator, sample_parsed_prompt, sample_world_config):
    """Test that characters have personality traits"""
    characters = character_generator.generate_characters(
        sample_parsed_prompt,
        sample_world_config
    )
    
    for char in characters:
        assert len(char.personality_traits) > 0
        assert len(char.personality_traits) <= 5
        assert all(isinstance(trait, str) for trait in char.personality_traits)


def test_character_has_visual_description(character_generator, sample_parsed_prompt, sample_world_config):
    """Test that characters have visual descriptions"""
    characters = character_generator.generate_characters(
        sample_parsed_prompt,
        sample_world_config
    )
    
    for char in characters:
        assert char.visual_description
        assert len(char.visual_description) > 50
        # Should include genre elements
        assert "cyberpunk" in char.visual_description.lower() or "neon" in char.visual_description.lower()


def test_character_relationships_mapped(character_generator, sample_parsed_prompt, sample_world_config):
    """Test that character relationships are mapped"""
    characters = character_generator.generate_characters(
        sample_parsed_prompt,
        sample_world_config
    )
    
    # Each character should have relationships with others
    for char in characters:
        assert len(char.relationships) == len(characters) - 1
        
        # Check relationship types are appropriate
        for other_id, relationship in char.relationships.items():
            assert relationship in [
                "adversary", "nemesis", "ally", "student", "protégé",
                "romantic interest", "acquaintance", "rival", "colleague",
                "associate"
            ]


def test_protagonist_antagonist_relationship(character_generator, sample_parsed_prompt, sample_world_config):
    """Test protagonist-antagonist relationship"""
    characters = character_generator.generate_characters(
        sample_parsed_prompt,
        sample_world_config
    )
    
    # Find protagonist and antagonist
    protagonist = next(c for c in characters if "protagonist" in c.role.lower())
    antagonist = next(c for c in characters if "antagonist" in c.role.lower())
    
    # Check their relationship
    assert protagonist.relationships[antagonist.character_id] == "adversary"
    assert antagonist.relationships[protagonist.character_id] == "nemesis"


def test_genre_specific_personality_traits(character_generator):
    """Test genre-specific personality traits"""
    # Cyberpunk should have tech-related traits
    traits = character_generator._generate_personality_traits("cyberpunk", "protagonist")
    assert any(trait in ["tech-savvy", "rebellious", "street-smart"] for trait in traits)
    
    # Fantasy should have heroic traits
    traits = character_generator._generate_personality_traits("fantasy", "protagonist")
    assert any(trait in ["brave", "honorable", "adventurous"] for trait in traits)


def test_role_specific_traits(character_generator):
    """Test role-specific trait additions"""
    # Protagonist should have determined trait
    traits = character_generator._generate_personality_traits("cyberpunk", "protagonist")
    assert "determined" in traits or len(traits) == 5
    
    # Mentor should have wise trait
    traits = character_generator._generate_personality_traits("fantasy", "mentor")
    assert "wise" in traits or len(traits) == 5


def test_visual_description_includes_world_elements(character_generator, sample_parsed_prompt, sample_world_config):
    """Test visual description includes world elements"""
    char_info = sample_parsed_prompt.characters[0]
    visual_desc = character_generator._generate_visual_description(
        char_info,
        sample_parsed_prompt,
        sample_world_config
    )
    
    # Should include color palette
    assert "electric blue" in visual_desc or "neon pink" in visual_desc
    # Should include lighting style
    assert "neon-lit" in visual_desc or "lighting" in visual_desc


def test_single_character_no_relationships(character_generator, sample_world_config):
    """Test single character has no relationships"""
    single_char_prompt = ParsedPrompt(
        project_title="Solo Story",
        genre="thriller",
        video_type="short_film",
        mood=["tense"],
        setting="City",
        time_period="present",
        characters=[
            CharacterInfo(
                name="John",
                role="protagonist",
                description="A lone detective"
            )
        ],
        key_elements=["mystery"],
        visual_style=["noir"],
        aspect_ratio="16:9",
        duration_seconds=30,
        raw_prompt="A detective story",
        confidence_scores={}
    )
    
    characters = character_generator.generate_characters(
        single_char_prompt,
        sample_world_config
    )
    
    assert len(characters) == 1
    assert len(characters[0].relationships) == 0


def test_empty_characters_list(character_generator, sample_world_config):
    """Test handling of empty characters list"""
    empty_prompt = ParsedPrompt(
        project_title="No Characters",
        genre="abstract",
        video_type="experimental",
        mood=["surreal"],
        setting="Unknown",
        time_period="timeless",
        characters=[],
        key_elements=["abstract"],
        visual_style=["surreal"],
        aspect_ratio="1:1",
        duration_seconds=15,
        raw_prompt="Abstract video",
        confidence_scores={}
    )
    
    characters = character_generator.generate_characters(
        empty_prompt,
        sample_world_config
    )
    
    assert len(characters) == 0


def test_character_ids_are_unique(character_generator, sample_parsed_prompt, sample_world_config):
    """Test that all character IDs are unique"""
    characters = character_generator.generate_characters(
        sample_parsed_prompt,
        sample_world_config
    )
    
    char_ids = [char.character_id for char in characters]
    assert len(char_ids) == len(set(char_ids))


def test_genre_visual_elements(character_generator):
    """Test genre-specific visual elements"""
    # Test various genres
    cyberpunk_elements = character_generator._get_genre_visual_elements("cyberpunk")
    assert "neon" in cyberpunk_elements or "tech" in cyberpunk_elements
    
    fantasy_elements = character_generator._get_genre_visual_elements("fantasy")
    assert "medieval" in fantasy_elements or "mystical" in fantasy_elements
    
    # Test unknown genre
    unknown_elements = character_generator._get_genre_visual_elements("unknown_genre")
    assert "distinctive" in unknown_elements


def test_world_visual_elements(character_generator, sample_world_config):
    """Test world-specific visual elements extraction"""
    world_elements = character_generator._get_world_visual_elements(sample_world_config)
    
    assert "electric blue" in world_elements or "neon pink" in world_elements
    assert "neon-lit" in world_elements or "lighting" in world_elements
