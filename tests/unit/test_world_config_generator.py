"""
Unit tests for WorldConfigGenerator.

Tests:
- World config generation from parsed prompts
- Genre-specific templates
- Color palette selection
- Location generation
- Visual style merging
"""

import pytest
from src.end_to_end.world_config_generator import WorldConfigGenerator
from src.end_to_end.data_models import ParsedPrompt, CharacterInfo


class TestWorldConfigGenerator:
    """Test suite for WorldConfigGenerator"""
    
    @pytest.fixture
    def generator(self):
        """Create WorldConfigGenerator instance"""
        return WorldConfigGenerator()
    
    @pytest.fixture
    def basic_prompt(self):
        """Create basic parsed prompt"""
        return ParsedPrompt(
            project_title="Test Project",
            genre="cyberpunk",
            video_type="trailer",
            mood=["dark", "mysterious"],
            setting="city",
            time_period="2048",
            characters=[
                CharacterInfo(name="Protagonist", role="main", description="Main character")
            ],
            key_elements=["technology", "neon"],
            visual_style=["neon", "gritty"],
            aspect_ratio="16:9",
            duration_seconds=60,
            raw_prompt="A cyberpunk trailer set in 2048"
        )
    
    def test_generate_creates_world_config(self, generator, basic_prompt):
        """Test that generate creates a valid WorldConfig"""
        world_config = generator.generate(basic_prompt)
        
        # Check all required fields are present
        assert world_config.world_id is not None
        assert world_config.name is not None
        assert world_config.genre == "cyberpunk"
        assert world_config.setting == "city"
        assert world_config.time_period == "2048"
        assert len(world_config.visual_style) > 0
        assert world_config.color_palette is not None
        assert world_config.lighting_style is not None
        assert world_config.atmosphere is not None
        assert len(world_config.key_locations) > 0
    
    def test_world_id_is_unique(self, generator, basic_prompt):
        """Test that each generated world has a unique ID"""
        world1 = generator.generate(basic_prompt)
        world2 = generator.generate(basic_prompt)
        
        assert world1.world_id != world2.world_id
    
    def test_world_name_generation(self, generator, basic_prompt):
        """Test world name generation"""
        world_config = generator.generate(basic_prompt)
        
        # Should include project title
        assert "Test Project" in world_config.name
        assert world_config.name.startswith("World of")
    
    def test_world_name_with_generic_title(self, generator, basic_prompt):
        """Test world name generation with generic title"""
        basic_prompt.project_title = "Untitled Project"
        world_config = generator.generate(basic_prompt)
        
        # Should use genre and setting
        assert "Cyberpunk" in world_config.name or "City" in world_config.name
    
    def test_genre_template_cyberpunk(self, generator, basic_prompt):
        """Test cyberpunk genre template application"""
        world_config = generator.generate(basic_prompt)
        
        # Check cyberpunk-specific attributes
        assert "neon" in world_config.lighting_style.lower() or "neon" in world_config.visual_style
        assert any(loc.name.lower() in ['megacity', 'underground', 'corporate tower', 'downtown district', 'city street', 'rooftop'] 
                   for loc in world_config.key_locations)
    
    def test_genre_template_fantasy(self, generator, basic_prompt):
        """Test fantasy genre template application"""
        basic_prompt.genre = "fantasy"
        basic_prompt.setting = "forest"
        basic_prompt.mood = ["mysterious", "epic"]
        
        world_config = generator.generate(basic_prompt)
        
        # Check fantasy-specific attributes
        assert world_config.genre == "fantasy"
        assert "magical" in world_config.lighting_style.lower() or "mystical" in world_config.atmosphere.lower()
    
    def test_genre_template_horror(self, generator, basic_prompt):
        """Test horror genre template application"""
        basic_prompt.genre = "horror"
        basic_prompt.setting = "forest"
        basic_prompt.mood = ["dark", "eerie"]
        
        world_config = generator.generate(basic_prompt)
        
        # Check horror-specific attributes
        assert world_config.genre == "horror"
        assert "shadow" in world_config.lighting_style.lower() or "eerie" in world_config.atmosphere.lower()
    
    def test_color_palette_selection_by_mood(self, generator, basic_prompt):
        """Test color palette selection based on mood"""
        basic_prompt.mood = ["dark"]
        world_config = generator.generate(basic_prompt)
        
        # Check that palette is appropriate for dark mood
        palette = world_config.color_palette
        assert palette.primary is not None
        assert palette.secondary is not None
        assert palette.accent is not None
        assert palette.background is not None
        
        # Dark palette should have dark colors (low RGB values)
        # Check that background is darker than primary
        assert len(palette.background) == 7  # Hex color format
        assert palette.background.startswith('#')
    
    def test_color_palette_selection_by_genre(self, generator, basic_prompt):
        """Test color palette selection based on genre"""
        basic_prompt.mood = []  # No mood, should fall back to genre
        world_config = generator.generate(basic_prompt)
        
        # Should use cyberpunk palette
        palette = world_config.color_palette
        assert palette is not None
        assert all(hasattr(palette, attr) for attr in ['primary', 'secondary', 'accent', 'background'])
    
    def test_color_palette_has_additional_colors(self, generator, basic_prompt):
        """Test that color palette includes additional colors"""
        world_config = generator.generate(basic_prompt)
        
        palette = world_config.color_palette
        assert isinstance(palette.additional, list)
        # Additional colors are optional but should be a list
        assert len(palette.additional) >= 0
    
    def test_visual_style_merging(self, generator, basic_prompt):
        """Test that visual styles from prompt and template are merged"""
        basic_prompt.visual_style = ["neon", "gritty"]
        world_config = generator.generate(basic_prompt)
        
        # Should include both prompt styles and template additions
        assert "neon" in world_config.visual_style
        assert "gritty" in world_config.visual_style
        
        # Should not have duplicates
        assert len(world_config.visual_style) == len(set(world_config.visual_style))
    
    def test_visual_style_limit(self, generator, basic_prompt):
        """Test that visual styles are limited to reasonable number"""
        basic_prompt.visual_style = ["style1", "style2", "style3", "style4", "style5", "style6"]
        world_config = generator.generate(basic_prompt)
        
        # Should be limited to 5 styles
        assert len(world_config.visual_style) <= 5
    
    def test_lighting_style_generation(self, generator, basic_prompt):
        """Test lighting style generation"""
        world_config = generator.generate(basic_prompt)
        
        assert world_config.lighting_style is not None
        assert len(world_config.lighting_style) > 0
    
    def test_lighting_style_with_dark_mood(self, generator, basic_prompt):
        """Test lighting style adjustment for dark mood"""
        basic_prompt.mood = ["dark"]
        world_config = generator.generate(basic_prompt)
        
        # Should include low-key or dark lighting
        assert "low-key" in world_config.lighting_style.lower() or "dark" in world_config.lighting_style.lower()
    
    def test_lighting_style_with_uplifting_mood(self, generator, basic_prompt):
        """Test lighting style adjustment for uplifting mood"""
        basic_prompt.mood = ["uplifting"]
        world_config = generator.generate(basic_prompt)
        
        # Should include bright lighting
        assert "bright" in world_config.lighting_style.lower()
    
    def test_atmosphere_generation(self, generator, basic_prompt):
        """Test atmosphere generation"""
        world_config = generator.generate(basic_prompt)
        
        assert world_config.atmosphere is not None
        assert len(world_config.atmosphere) > 0
    
    def test_atmosphere_includes_mood_descriptors(self, generator, basic_prompt):
        """Test that atmosphere includes mood descriptors"""
        basic_prompt.mood = ["dark", "mysterious"]
        world_config = generator.generate(basic_prompt)
        
        # Should include mood-related words
        atmosphere_lower = world_config.atmosphere.lower()
        assert any(word in atmosphere_lower for word in ["shadow", "enigmatic", "dark", "mysterious", "gritty", "technological"])
    
    def test_location_generation_from_setting(self, generator, basic_prompt):
        """Test location generation based on setting"""
        basic_prompt.setting = "city"
        world_config = generator.generate(basic_prompt)
        
        # Should have city-related locations
        location_names = [loc.name.lower() for loc in world_config.key_locations]
        assert any("city" in name or "street" in name or "downtown" in name or "rooftop" in name 
                   for name in location_names)
    
    def test_location_generation_forest_setting(self, generator, basic_prompt):
        """Test location generation for forest setting"""
        basic_prompt.setting = "forest"
        world_config = generator.generate(basic_prompt)
        
        # Should have forest-related locations
        location_names = [loc.name.lower() for loc in world_config.key_locations]
        assert any("forest" in name or "wood" in name or "tree" in name or "clearing" in name 
                   for name in location_names)
    
    def test_location_generation_space_setting(self, generator, basic_prompt):
        """Test location generation for space setting"""
        basic_prompt.setting = "space"
        world_config = generator.generate(basic_prompt)
        
        # Should have space-related locations
        location_names = [loc.name.lower() for loc in world_config.key_locations]
        assert any("space" in name or "station" in name or "ship" in name or "planet" in name 
                   for name in location_names)
    
    def test_location_count_limit(self, generator, basic_prompt):
        """Test that locations are limited to reasonable number"""
        world_config = generator.generate(basic_prompt)
        
        # Should have at most 5 locations
        assert len(world_config.key_locations) <= 5
        # Should have at least 1 location
        assert len(world_config.key_locations) >= 1
    
    def test_location_has_required_fields(self, generator, basic_prompt):
        """Test that each location has all required fields"""
        world_config = generator.generate(basic_prompt)
        
        for location in world_config.key_locations:
            assert location.location_id is not None
            assert location.name is not None
            assert len(location.name) > 0
            assert location.description is not None
            assert len(location.description) > 0
            assert location.visual_description is not None
            assert len(location.visual_description) > 0
    
    def test_location_ids_are_unique(self, generator, basic_prompt):
        """Test that each location has a unique ID"""
        world_config = generator.generate(basic_prompt)
        
        location_ids = [loc.location_id for loc in world_config.key_locations]
        assert len(location_ids) == len(set(location_ids))
    
    def test_location_visual_description_includes_genre(self, generator, basic_prompt):
        """Test that location visual descriptions reference genre"""
        world_config = generator.generate(basic_prompt)
        
        # At least one location should mention the genre
        visual_descriptions = [loc.visual_description.lower() for loc in world_config.key_locations]
        assert any(basic_prompt.genre in desc for desc in visual_descriptions)
    
    def test_genre_specific_locations_added(self, generator, basic_prompt):
        """Test that genre-specific locations are added"""
        basic_prompt.genre = "fantasy"
        basic_prompt.setting = "city"  # Different from fantasy default
        
        world_config = generator.generate(basic_prompt)
        
        # Should include some fantasy-specific locations
        location_names = [loc.name.lower() for loc in world_config.key_locations]
        # Either setting locations or genre locations should be present
        assert len(location_names) > 0
    
    def test_unknown_genre_uses_default(self, generator, basic_prompt):
        """Test that unknown genre uses default template"""
        basic_prompt.genre = "unknown_genre_xyz"
        
        # Should not raise error
        world_config = generator.generate(basic_prompt)
        
        # Should still generate valid config
        assert world_config is not None
        assert world_config.genre == "unknown_genre_xyz"
        assert len(world_config.key_locations) > 0
    
    def test_unknown_setting_uses_default(self, generator, basic_prompt):
        """Test that unknown setting uses default locations"""
        basic_prompt.setting = "unknown_setting_xyz"
        
        # Should not raise error
        world_config = generator.generate(basic_prompt)
        
        # Should still generate valid config with default city locations
        assert world_config is not None
        assert len(world_config.key_locations) > 0
    
    def test_empty_mood_list(self, generator, basic_prompt):
        """Test handling of empty mood list"""
        basic_prompt.mood = []
        
        # Should not raise error
        world_config = generator.generate(basic_prompt)
        
        # Should use genre-based palette
        assert world_config.color_palette is not None
    
    def test_empty_visual_style_list(self, generator, basic_prompt):
        """Test handling of empty visual style list"""
        basic_prompt.visual_style = []
        
        # Should not raise error
        world_config = generator.generate(basic_prompt)
        
        # Should add genre template styles
        assert len(world_config.visual_style) > 0
    
    def test_multiple_moods_uses_first(self, generator, basic_prompt):
        """Test that multiple moods uses first for palette selection"""
        basic_prompt.mood = ["peaceful", "dark", "mysterious"]
        
        world_config = generator.generate(basic_prompt)
        
        # Should use first mood (peaceful) for palette
        # Peaceful palette should have lighter colors
        assert world_config.color_palette is not None
    
    def test_all_genres_have_templates(self, generator):
        """Test that all common genres have templates"""
        common_genres = [
            "cyberpunk", "fantasy", "horror", "sci-fi", "western",
            "thriller", "romance", "action", "comedy", "drama"
        ]
        
        for genre in common_genres:
            template = generator._get_genre_template(genre)
            assert template is not None
            assert 'lighting_style' in template
            assert 'atmosphere' in template
    
    def test_color_palette_format(self, generator, basic_prompt):
        """Test that color palette uses correct hex format"""
        world_config = generator.generate(basic_prompt)
        
        palette = world_config.color_palette
        
        # Check hex color format
        for color in [palette.primary, palette.secondary, palette.accent, palette.background]:
            assert color.startswith('#')
            assert len(color) == 7
            # Check valid hex characters
            assert all(c in '0123456789abcdefABCDEF' for c in color[1:])
        
        # Check additional colors
        for color in palette.additional:
            assert color.startswith('#')
            assert len(color) == 7
    
    def test_consistent_generation_with_same_input(self, generator, basic_prompt):
        """Test that generation is consistent (except for UUIDs)"""
        world1 = generator.generate(basic_prompt)
        world2 = generator.generate(basic_prompt)
        
        # These should be the same
        assert world1.genre == world2.genre
        assert world1.setting == world2.setting
        assert world1.time_period == world2.time_period
        assert world1.lighting_style == world2.lighting_style
        assert world1.atmosphere == world2.atmosphere
        
        # Color palettes should be the same
        assert world1.color_palette.primary == world2.color_palette.primary
        assert world1.color_palette.secondary == world2.color_palette.secondary
        
        # Visual styles should be the same (order might differ)
        assert set(world1.visual_style) == set(world2.visual_style)
        
        # Location count should be the same
        assert len(world1.key_locations) == len(world2.key_locations)
    
    def test_integration_with_real_prompt(self, generator):
        """Test with a realistic prompt"""
        prompt = ParsedPrompt(
            project_title="Blanche-Neige Cyberpunk 2048",
            genre="cyberpunk",
            video_type="trailer",
            mood=["dark", "mysterious", "epic"],
            setting="city",
            time_period="2048",
            characters=[
                CharacterInfo(name="Snow White", role="main", description="Cyberpunk Snow White"),
                CharacterInfo(name="Queen", role="antagonist", description="Evil AI Queen")
            ],
            key_elements=["neon", "technology", "magic"],
            visual_style=["neon", "gritty", "industrial"],
            aspect_ratio="16:9",
            duration_seconds=60,
            raw_prompt="Blanche-Neige reimagined in cyberpunk 2048"
        )
        
        world_config = generator.generate(prompt)
        
        # Validate complete world config
        assert world_config.world_id is not None
        assert "Blanche-Neige" in world_config.name or "Snow White" in world_config.name
        assert world_config.genre == "cyberpunk"
        assert world_config.setting == "city"
        assert world_config.time_period == "2048"
        assert len(world_config.visual_style) >= 3
        assert world_config.color_palette is not None
        assert world_config.lighting_style is not None
        assert world_config.atmosphere is not None
        assert len(world_config.key_locations) > 0
        
        # Check cyberpunk-specific elements
        assert any(style in ["neon", "gritty", "industrial"] for style in world_config.visual_style)
