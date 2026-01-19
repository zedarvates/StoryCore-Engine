"""
Tests for AI-Powered Character Name Generation

This test suite validates the CharacterNameGenerator functionality including:
- Basic name generation
- Cultural context handling
- Genre-specific naming
- Archetype-based naming
- Phonetic quality
- Name validation
"""

import pytest
from src.character_wizard.name_generator import CharacterNameGenerator, NameStyle


class TestCharacterNameGenerator:
    """Test suite for CharacterNameGenerator"""
    
    @pytest.fixture
    def generator(self):
        """Create a name generator instance"""
        return CharacterNameGenerator()
    
    def test_basic_name_generation(self, generator):
        """Test basic name generation produces valid names"""
        name = generator.generate_name()
        
        assert name is not None
        assert isinstance(name, str)
        assert len(name) >= 2
        assert len(name) <= 15
        assert name[0].isupper()  # First letter should be capitalized
    
    def test_fantasy_name_generation(self, generator):
        """Test fantasy genre name generation"""
        name = generator.generate_name(
            culture="fantasy",
            genre="fantasy",
            archetype_role="hero"
        )
        
        assert name is not None
        assert len(name) >= 3
        # Fantasy names often have specific characteristics
        assert any(c in name.lower() for c in 'aeiouy')  # Has vowels
    
    def test_scifi_name_generation(self, generator):
        """Test sci-fi genre name generation"""
        name = generator.generate_name(
            culture="western",
            genre="sci-fi",
            archetype_role="hero"
        )
        
        assert name is not None
        assert len(name) >= 2
    
    def test_modern_name_generation(self, generator):
        """Test modern genre name generation"""
        name = generator.generate_name(
            culture="western",
            genre="modern",
            archetype_role="ally"
        )
        
        assert name is not None
        assert len(name) >= 2
        assert name.isalpha() or name.replace('-', '').isalpha()
    
    def test_cultural_context_western(self, generator):
        """Test western cultural context"""
        name = generator.generate_name(
            culture="western",
            genre="modern",
            archetype_role="hero"
        )
        
        assert name is not None
        assert len(name) >= 2
    
    def test_cultural_context_fantasy(self, generator):
        """Test fantasy cultural context"""
        name = generator.generate_name(
            culture="fantasy",
            genre="fantasy",
            archetype_role="mentor"
        )
        
        assert name is not None
        assert len(name) >= 3
    
    def test_archetype_hero_naming(self, generator):
        """Test hero archetype produces appropriate names"""
        name = generator.generate_name(
            culture="western",
            genre="fantasy",
            archetype_role="hero"
        )
        
        assert name is not None
        assert len(name) >= 3
    
    def test_archetype_villain_naming(self, generator):
        """Test villain archetype produces appropriate names"""
        name = generator.generate_name(
            culture="western",
            genre="fantasy",
            archetype_role="villain"
        )
        
        assert name is not None
        assert len(name) >= 3
    
    def test_archetype_mentor_naming(self, generator):
        """Test mentor archetype produces appropriate names"""
        name = generator.generate_name(
            culture="western",
            genre="fantasy",
            archetype_role="mentor"
        )
        
        assert name is not None
        assert len(name) >= 3
    
    def test_personality_trait_influence(self, generator):
        """Test personality traits influence name generation"""
        name = generator.generate_name(
            culture="fantasy",
            genre="fantasy",
            archetype_role="hero",
            personality_traits=["brave", "loyal", "determined"]
        )
        
        assert name is not None
        assert len(name) >= 3
    
    def test_full_name_generation(self, generator):
        """Test full name generation (first + last)"""
        full_name = generator.generate_full_name(
            culture="western",
            genre="modern",
            archetype_role="hero"
        )
        
        assert full_name is not None
        assert ' ' in full_name  # Should have space between first and last
        parts = full_name.split()
        assert len(parts) >= 2  # At least first and last name
    
    def test_full_name_with_title(self, generator):
        """Test full name generation with title"""
        full_name = generator.generate_full_name(
            culture="western",
            genre="fantasy",
            archetype_role="hero",
            include_title=True
        )
        
        assert full_name is not None
        parts = full_name.split()
        assert len(parts) >= 3  # Title + first + last
    
    def test_name_pronounceability(self, generator):
        """Test generated names are pronounceable"""
        for _ in range(10):
            name = generator.generate_name(
                culture="fantasy",
                genre="fantasy",
                archetype_role="hero"
            )
            
            # Check for vowels (pronounceable names need vowels)
            assert any(c in name.lower() for c in 'aeiouy')
            
            # Check for reasonable consonant clusters
            consonant_count = 0
            for char in name.lower():
                if char not in 'aeiouy':
                    consonant_count += 1
                    assert consonant_count <= 3, f"Too many consecutive consonants in {name}"
                else:
                    consonant_count = 0
    
    def test_name_uniqueness(self, generator):
        """Test that generated names show variety"""
        names = set()
        for _ in range(20):
            name = generator.generate_name(
                culture="fantasy",
                genre="fantasy",
                archetype_role="hero"
            )
            names.add(name)
        
        # Should generate at least some unique names
        assert len(names) >= 10, "Name generation should produce variety"
    
    def test_name_length_constraints(self, generator):
        """Test names respect length constraints"""
        for _ in range(20):
            name = generator.generate_name()
            
            assert len(name) >= 2, f"Name too short: {name}"
            assert len(name) <= 15, f"Name too long: {name}"
    
    def test_style_preference_fantasy(self, generator):
        """Test explicit fantasy style preference"""
        name = generator.generate_name(
            culture="western",
            genre="modern",
            archetype_role="hero",
            style_preference=NameStyle.FANTASY
        )
        
        assert name is not None
        assert len(name) >= 3
    
    def test_style_preference_scifi(self, generator):
        """Test explicit sci-fi style preference"""
        name = generator.generate_name(
            culture="western",
            genre="modern",
            archetype_role="hero",
            style_preference=NameStyle.SCIFI
        )
        
        assert name is not None
        assert len(name) >= 2
    
    def test_multiple_generations_consistency(self, generator):
        """Test multiple generations with same parameters"""
        params = {
            "culture": "fantasy",
            "genre": "fantasy",
            "archetype_role": "hero",
            "personality_traits": ["brave", "loyal"]
        }
        
        names = [generator.generate_name(**params) for _ in range(5)]
        
        # All should be valid
        for name in names:
            assert name is not None
            assert len(name) >= 2
            assert len(name) <= 15
    
    def test_edge_case_empty_traits(self, generator):
        """Test generation with empty personality traits"""
        name = generator.generate_name(
            culture="western",
            genre="modern",
            archetype_role="hero",
            personality_traits=[]
        )
        
        assert name is not None
        assert len(name) >= 2
    
    def test_edge_case_none_traits(self, generator):
        """Test generation with None personality traits"""
        name = generator.generate_name(
            culture="western",
            genre="modern",
            archetype_role="hero",
            personality_traits=None
        )
        
        assert name is not None
        assert len(name) >= 2
    
    def test_fallback_to_simple_generation(self, generator):
        """Test fallback mechanism works"""
        # Test with unusual parameters that might trigger fallback
        name = generator.generate_name(
            culture="unknown_culture",
            genre="unknown_genre",
            archetype_role="unknown_role"
        )
        
        # Should still generate a valid name via fallback
        assert name is not None
        assert len(name) >= 2


class TestNameGeneratorIntegration:
    """Integration tests for name generator with character generation"""
    
    def test_integration_with_auto_generator(self):
        """Test name generator integrates with AutoCharacterGenerator"""
        from src.character_wizard.auto_character_generator import AutoCharacterGenerator
        from src.character_wizard.models import AutoGenerationParams
        
        generator = AutoCharacterGenerator()
        
        # Create test parameters
        params = AutoGenerationParams(
            role="protagonist",
            genre="fantasy",
            age_range="adult",
            style_preferences={"art_style": "realistic"},
            cultural_context="western"
        )
        
        # Generate character
        character = generator.generate_character(params)
        
        # Verify name was generated
        assert character.name is not None
        assert len(character.name) >= 2
        assert isinstance(character.name, str)
    
    def test_multiple_character_name_uniqueness(self):
        """Test that multiple characters get different names"""
        from src.character_wizard.auto_character_generator import AutoCharacterGenerator
        from src.character_wizard.models import AutoGenerationParams
        
        generator = AutoCharacterGenerator()
        
        params = AutoGenerationParams(
            role="protagonist",
            genre="fantasy",
            age_range="adult",
            style_preferences={"art_style": "realistic"},
            cultural_context="western"
        )
        
        # Generate multiple characters
        names = set()
        for _ in range(5):
            character = generator.generate_character(params)
            names.add(character.name)
        
        # Should have some variety (at least 3 unique names out of 5)
        assert len(names) >= 3, "Character names should show variety"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
