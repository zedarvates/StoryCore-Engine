"""
Property-Based Tests for Character Data Contract Compliance

**Feature: character-setup-wizard, Property 9: Data Contract Compliance**

**Validates: Requirements 9.1, 9.2**

Property 9: Data Contract Compliance
For any character data storage operation, the saved data should comply with 
Data_Contract_v1 format and include all required ComfyUI integration fields.
"""

import pytest
import json
import uuid
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
from hypothesis import given, settings, strategies as st, HealthCheck
from hypothesis import assume

# Add src to path for imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from character_wizard.models import (
    CharacterProfile,
    VisualIdentity,
    PersonalityProfile,
    VoiceIdentity,
    BackstoryProfile,
    CoherenceAnchors,
    ColorPalette,
    CreationMethod,
    PuppetCategory,
    FormalityLevel,
    HumorStyle
)
from character_wizard.integration_manager import (
    CharacterIntegrationManager,
    CharacterLibraryManager
)


# Strategy for generating valid character profiles
@st.composite
def character_profile_strategy(draw):
    """Generate valid character profiles for testing"""
    profile = CharacterProfile()
    
    # Basic information
    profile.character_id = str(uuid.uuid4())
    profile.name = draw(st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('L', 'N'), whitelist_characters=' ')))
    profile.creation_method = draw(st.sampled_from(list(CreationMethod)))
    profile.creation_timestamp = datetime.now().isoformat()
    profile.version = "1.0"
    
    # Visual identity
    profile.visual_identity = VisualIdentity()
    profile.visual_identity.hair_color = draw(st.sampled_from(["black", "brown", "blonde", "red", "white", "gray"]))
    profile.visual_identity.hair_style = draw(st.sampled_from(["short", "long", "curly", "straight", "wavy"]))
    profile.visual_identity.hair_length = draw(st.sampled_from(["short", "medium", "long"]))
    profile.visual_identity.eye_color = draw(st.sampled_from(["brown", "blue", "green", "hazel", "gray"]))
    profile.visual_identity.eye_shape = draw(st.sampled_from(["round", "almond", "narrow"]))
    profile.visual_identity.skin_tone = draw(st.sampled_from(["fair", "medium", "tan", "dark"]))
    profile.visual_identity.facial_structure = draw(st.sampled_from(["oval", "round", "square", "heart"]))
    profile.visual_identity.age_range = draw(st.sampled_from(["child", "teen", "young_adult", "adult", "elderly"]))
    profile.visual_identity.height = draw(st.sampled_from(["short", "average", "tall"]))
    profile.visual_identity.build = draw(st.sampled_from(["slim", "average", "athletic", "heavy"]))
    profile.visual_identity.clothing_style = draw(st.sampled_from(["casual", "formal", "fantasy", "modern"]))
    profile.visual_identity.art_style = draw(st.sampled_from(["realistic", "anime", "cartoon", "artistic"]))
    profile.visual_identity.rendering_style = draw(st.sampled_from(["photorealistic", "stylized", "painterly"]))
    profile.visual_identity.quality_level = "high"
    
    # Color palette
    profile.visual_identity.color_palette = ColorPalette()
    profile.visual_identity.color_palette.primary_colors = ["#" + draw(st.text(min_size=6, max_size=6, alphabet="0123456789ABCDEF"))]
    profile.visual_identity.color_palette.color_harmony = "complementary"
    
    # Personality profile
    profile.personality_profile = PersonalityProfile()
    profile.personality_profile.openness = draw(st.floats(min_value=0.0, max_value=1.0))
    profile.personality_profile.conscientiousness = draw(st.floats(min_value=0.0, max_value=1.0))
    profile.personality_profile.extraversion = draw(st.floats(min_value=0.0, max_value=1.0))
    profile.personality_profile.agreeableness = draw(st.floats(min_value=0.0, max_value=1.0))
    profile.personality_profile.neuroticism = draw(st.floats(min_value=0.0, max_value=1.0))
    profile.personality_profile.primary_traits = draw(st.lists(st.text(min_size=3, max_size=20), min_size=1, max_size=5))
    profile.personality_profile.strengths = draw(st.lists(st.text(min_size=3, max_size=20), min_size=1, max_size=3))
    profile.personality_profile.flaws = draw(st.lists(st.text(min_size=3, max_size=20), min_size=1, max_size=3))
    
    # Voice identity
    profile.voice_identity = VoiceIdentity()
    profile.voice_identity.speech_patterns = draw(st.text(min_size=5, max_size=50))
    profile.voice_identity.vocabulary_level = draw(st.sampled_from(["simple", "moderate", "advanced"]))
    profile.voice_identity.formality_level = draw(st.sampled_from(list(FormalityLevel)))
    profile.voice_identity.humor_style = draw(st.sampled_from(list(HumorStyle)))
    
    # Backstory profile
    profile.backstory_profile = BackstoryProfile()
    profile.backstory_profile.origin_story = draw(st.text(min_size=10, max_size=200))
    profile.backstory_profile.occupation = draw(st.text(min_size=3, max_size=50))
    profile.backstory_profile.education_level = draw(st.sampled_from(["none", "basic", "high school", "college", "advanced"]))
    
    # Coherence anchors
    profile.coherence_anchors = CoherenceAnchors()
    profile.coherence_anchors.character_descriptor = f"{profile.name}, {profile.visual_identity.age_range}"
    profile.coherence_anchors.seed_base = draw(st.integers(min_value=0, max_value=999999))
    profile.coherence_anchors.cfg_scale = draw(st.floats(min_value=1.0, max_value=20.0))
    profile.coherence_anchors.denoising_strength = draw(st.floats(min_value=0.1, max_value=1.0))
    
    # Integration data
    profile.puppet_category = draw(st.sampled_from(list(PuppetCategory)))
    profile.genre_tags = draw(st.lists(st.text(min_size=3, max_size=20), min_size=0, max_size=5))
    profile.style_tags = draw(st.lists(st.text(min_size=3, max_size=20), min_size=0, max_size=5))
    
    # Quality scores
    profile.quality_score = draw(st.floats(min_value=0.0, max_value=5.0))
    profile.consistency_score = draw(st.floats(min_value=0.0, max_value=5.0))
    
    return profile


class TestDataContractCompliance:
    """Property-based tests for Data Contract v1 compliance"""
    
    @given(profile=character_profile_strategy())
    @settings(max_examples=100, deadline=5000, suppress_health_check=[HealthCheck.function_scoped_fixture])
    def test_property_9_data_contract_compliance(self, profile):
        """
        Property 9: Data Contract Compliance
        
        For any character data storage operation, the saved data should comply with 
        Data_Contract_v1 format and include all required ComfyUI integration fields.
        
        **Validates: Requirements 9.1, 9.2**
        """
        # Create temporary directory for this test
        tmp_path = Path(tempfile.mkdtemp())
        
        try:
            # Create integration manager with temporary path
            integration_manager = CharacterIntegrationManager(tmp_path)
            
            # Integrate character (which includes saving to library)
            result = integration_manager.integrate_character(profile)
            
            # Property: Integration should succeed for valid profiles
            assert result.success, f"Integration failed: {result.integration_errors}"
            
            # Property: Character file should exist in library
            character_file = tmp_path / "characters" / f"{profile.character_id}.json"
            assert character_file.exists(), "Character file not created in library"
            
            # Load saved character data
            with open(character_file, 'r', encoding='utf-8') as f:
                saved_data = json.load(f)
            
            # Property: Saved data must include schema_version field
            assert "schema_version" in saved_data, "Missing schema_version field"
            assert saved_data["schema_version"] == "1.0", "Invalid schema version"
            
            # Property: All required Data Contract v1 fields must be present
            required_fields = [
                "character_id", "name", "creation_method", "creation_timestamp", "version",
                "visual_identity", "personality_profile", "voice_identity", "backstory_profile",
                "coherence_anchors", "puppet_category", "genre_tags", "style_tags",
                "reference_images", "quality_score", "consistency_score", "metadata"
            ]
            
            for field in required_fields:
                assert field in saved_data, f"Missing required field: {field}"
            
            # Property: character_id must be valid UUID format
            try:
                uuid.UUID(saved_data["character_id"])
            except ValueError:
                pytest.fail(f"Invalid UUID format for character_id: {saved_data['character_id']}")
            
            # Property: Saved data must be deserializable back to same values
            assert saved_data["character_id"] == profile.character_id
            assert saved_data["name"] == profile.name
            
        finally:
            # Clean up temporary directory
            shutil.rmtree(tmp_path, ignore_errors=True)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
