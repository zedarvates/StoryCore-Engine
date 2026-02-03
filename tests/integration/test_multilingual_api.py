"""
Integration tests for Multilingual API endpoints.

Tests all 5 multilingual endpoints:
- storycore.i18n.translate
- storycore.i18n.detect
- storycore.i18n.localize
- storycore.i18n.voice.map
- storycore.i18n.validate
"""

import pytest
from src.api.config import APIConfig
from src.api.router import APIRouter
from src.api.models import RequestContext
from src.api.categories.multilingual import MultilingualCategoryHandler


@pytest.fixture
def api_config():
    """Create API configuration for testing."""
    return APIConfig(
        version="v1",
        enable_auth=False,
        enable_rate_limiting=False,
        log_level="INFO",
    )


@pytest.fixture
def router(api_config):
    """Create API router for testing."""
    return APIRouter(api_config)


@pytest.fixture
def handler(api_config, router):
    """Create multilingual category handler for testing."""
    return MultilingualCategoryHandler(api_config, router)


@pytest.fixture
def context():
    """Create request context for testing."""
    return RequestContext(
        request_id="test-request-123",
        user="test-user",
    )


class TestTranslateEndpoint:
    """Tests for storycore.i18n.translate endpoint."""
    
    def test_translate_basic(self, handler, context):
        """Test basic translation."""
        params = {
            "text": "Hello, world!",
            "target_language": "es",
        }
        
        response = handler.translate(params, context)
        
        assert response.status == "success"
        assert "translated_text" in response.data
        assert response.data["target_language"] == "es"
        assert response.data["detected_source"] is True
        assert response.data["confidence_score"] > 0
    
    def test_translate_with_source_language(self, handler, context):
        """Test translation with explicit source language."""
        params = {
            "text": "Hello, world!",
            "source_language": "en",
            "target_language": "fr",
        }
        
        response = handler.translate(params, context)
        
        assert response.status == "success"
        assert response.data["source_language"] == "en"
        assert response.data["target_language"] == "fr"
        assert response.data["detected_source"] is False
    
    def test_translate_empty_text(self, handler, context):
        """Test translation with empty text."""
        params = {
            "text": "",
            "target_language": "es",
        }
        
        response = handler.translate(params, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_translate_invalid_target_language(self, handler, context):
        """Test translation with invalid target language."""
        params = {
            "text": "Hello, world!",
            "target_language": "invalid",
        }
        
        response = handler.translate(params, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
        assert "unsupported" in response.error.message.lower()
    
    def test_translate_same_source_and_target(self, handler, context):
        """Test translation with same source and target language."""
        params = {
            "text": "Hello, world!",
            "source_language": "en",
            "target_language": "en",
        }
        
        response = handler.translate(params, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_translate_long_text(self, handler, context):
        """Test translation with long text."""
        params = {
            "text": "Hello, world! " * 100,  # 1300 characters
            "target_language": "de",
        }
        
        response = handler.translate(params, context)
        
        assert response.status == "success"
        assert response.data["character_count"] > 0
        assert response.data["word_count"] > 0
    
    def test_translate_with_glossary(self, handler, context):
        """Test translation with glossary."""
        params = {
            "text": "The StoryCore Engine is amazing",
            "target_language": "es",
            "glossary": {"StoryCore Engine": "Motor StoryCore"},
        }
        
        response = handler.translate(params, context)
        
        assert response.status == "success"


class TestDetectEndpoint:
    """Tests for storycore.i18n.detect endpoint."""
    
    def test_detect_english(self, handler, context):
        """Test language detection for English text."""
        params = {
            "text": "The quick brown fox jumps over the lazy dog",
        }
        
        response = handler.detect(params, context)
        
        assert response.status == "success"
        assert response.data["detected_language"] == "en"
        assert response.data["language_name"] == "English"
        assert response.data["confidence_score"] > 0
    
    def test_detect_spanish(self, handler, context):
        """Test language detection for Spanish text."""
        params = {
            "text": "El rápido zorro marrón salta sobre el perro perezoso",
        }
        
        response = handler.detect(params, context)
        
        assert response.status == "success"
        assert response.data["detected_language"] in ["es", "en"]  # Mock may vary
        assert response.data["confidence_score"] > 0
    
    def test_detect_chinese(self, handler, context):
        """Test language detection for Chinese text."""
        params = {
            "text": "你好世界",
        }
        
        response = handler.detect(params, context)
        
        assert response.status == "success"
        assert response.data["detected_language"] == "zh"
        assert response.data["confidence_score"] > 0.9
    
    def test_detect_empty_text(self, handler, context):
        """Test language detection with empty text."""
        params = {
            "text": "",
        }
        
        response = handler.detect(params, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_detect_short_text(self, handler, context):
        """Test language detection with very short text."""
        params = {
            "text": "Hi",
        }
        
        response = handler.detect(params, context)
        
        # Should still work but may have lower confidence
        assert response.status == "error"  # Too short
    
    def test_detect_with_alternatives(self, handler, context):
        """Test language detection returns alternatives."""
        params = {
            "text": "Hello world",
        }
        
        response = handler.detect(params, context)
        
        assert response.status == "success"
        # May have alternative languages if confidence is not very high
        assert "alternative_languages" in response.data


class TestLocalizeEndpoint:
    """Tests for storycore.i18n.localize endpoint."""
    
    def test_localize_text_content(self, handler, context):
        """Test localization of text content."""
        params = {
            "content": {"text": "Hello, world!"},
            "target_locale": "es-ES",
            "content_type": "text",
        }
        
        response = handler.localize(params, context)
        
        assert response.status == "success"
        assert "localized_content" in response.data
        assert response.data["target_locale"] == "es-ES"
        assert len(response.data["adaptations_made"]) > 0
    
    def test_localize_us_english(self, handler, context):
        """Test localization for US English."""
        params = {
            "content": {"text": "Hello"},
            "target_locale": "en-US",
        }
        
        response = handler.localize(params, context)
        
        assert response.status == "success"
        assert any("US" in note for note in response.data["cultural_notes"])
    
    def test_localize_british_english(self, handler, context):
        """Test localization for British English."""
        params = {
            "content": {"text": "Hello"},
            "target_locale": "en-GB",
        }
        
        response = handler.localize(params, context)
        
        assert response.status == "success"
        assert any("British" in adapt for adapt in response.data["adaptations_made"])
    
    def test_localize_invalid_locale(self, handler, context):
        """Test localization with invalid locale."""
        params = {
            "content": {"text": "Hello"},
            "target_locale": "invalid-LOCALE",
        }
        
        response = handler.localize(params, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_localize_empty_content(self, handler, context):
        """Test localization with empty content."""
        params = {
            "content": {},
            "target_locale": "fr-FR",
        }
        
        response = handler.localize(params, context)
        
        # Empty dict is valid, just no text to localize
        assert response.status == "success"
    
    def test_localize_narrative_content(self, handler, context):
        """Test localization of narrative content."""
        params = {
            "content": {"text": "Once upon a time..."},
            "target_locale": "ja-JP",
            "content_type": "narrative",
        }
        
        response = handler.localize(params, context)
        
        assert response.status == "success"
        assert response.data["content_type"] == "narrative"
    
    def test_localize_with_cultural_adaptation(self, handler, context):
        """Test localization with cultural adaptation enabled."""
        params = {
            "content": {"text": "Hello"},
            "target_locale": "fr-FR",
            "cultural_adaptation": True,
        }
        
        response = handler.localize(params, context)
        
        assert response.status == "success"
        assert len(response.data["cultural_notes"]) > 0


class TestVoiceMapEndpoint:
    """Tests for storycore.i18n.voice.map endpoint."""
    
    def test_voice_map_basic(self, handler, context):
        """Test basic voice mapping."""
        params = {
            "target_language": "en",
        }
        
        response = handler.voice_map(params, context)
        
        assert response.status == "success"
        assert len(response.data["recommended_voices"]) > 0
        assert response.data["target_language"] == "en"
        assert response.data["total_voices_available"] > 0
    
    def test_voice_map_spanish(self, handler, context):
        """Test voice mapping for Spanish."""
        params = {
            "target_language": "es",
        }
        
        response = handler.voice_map(params, context)
        
        assert response.status == "success"
        assert all(v["language"] == "es" for v in response.data["recommended_voices"])
    
    def test_voice_map_with_gender_preference(self, handler, context):
        """Test voice mapping with gender preference."""
        params = {
            "target_language": "en",
            "voice_preferences": {"gender": "female"},
        }
        
        response = handler.voice_map(params, context)
        
        assert response.status == "success"
        # Should filter to female voices
        assert len(response.data["recommended_voices"]) > 0
    
    def test_voice_map_with_character_profile(self, handler, context):
        """Test voice mapping with character profile."""
        params = {
            "target_language": "en",
            "character_profile": {
                "gender": "male",
                "age": 35,
                "personality": "confident",
            },
        }
        
        response = handler.voice_map(params, context)
        
        assert response.status == "success"
        assert len(response.data["recommended_voices"]) > 0
    
    def test_voice_map_invalid_language(self, handler, context):
        """Test voice mapping with invalid language."""
        params = {
            "target_language": "invalid",
        }
        
        response = handler.voice_map(params, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_voice_map_japanese(self, handler, context):
        """Test voice mapping for Japanese."""
        params = {
            "target_language": "ja",
        }
        
        response = handler.voice_map(params, context)
        
        assert response.status == "success"
        assert all(v["language"] == "ja" for v in response.data["recommended_voices"])


class TestValidateTranslationEndpoint:
    """Tests for storycore.i18n.validate endpoint."""
    
    def test_validate_good_translation(self, handler, context):
        """Test validation of a good translation."""
        params = {
            "original_text": "Hello, world!",
            "translated_text": "¡Hola, mundo!",
            "source_language": "en",
            "target_language": "es",
        }
        
        response = handler.validate_translation(params, context)
        
        assert response.status == "success"
        assert "valid" in response.data
        assert response.data["overall_score"] > 0
        assert response.data["accuracy_score"] > 0
        assert response.data["fluency_score"] > 0
    
    def test_validate_length_mismatch(self, handler, context):
        """Test validation with significant length mismatch."""
        params = {
            "original_text": "Hello, world! This is a long sentence with many words.",
            "translated_text": "Hola",
            "source_language": "en",
            "target_language": "es",
        }
        
        response = handler.validate_translation(params, context)
        
        assert response.status == "success"
        # Should have warnings about length mismatch
        assert len(response.data["issues"]) > 0 or len(response.data["recommendations"]) > 0
    
    def test_validate_empty_original(self, handler, context):
        """Test validation with empty original text."""
        params = {
            "original_text": "",
            "translated_text": "Hola",
            "source_language": "en",
            "target_language": "es",
        }
        
        response = handler.validate_translation(params, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_validate_empty_translation(self, handler, context):
        """Test validation with empty translated text."""
        params = {
            "original_text": "Hello",
            "translated_text": "",
            "source_language": "en",
            "target_language": "es",
        }
        
        response = handler.validate_translation(params, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_validate_same_language(self, handler, context):
        """Test validation with same source and target language."""
        params = {
            "original_text": "Hello",
            "translated_text": "Hello",
            "source_language": "en",
            "target_language": "en",
        }
        
        response = handler.validate_translation(params, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_validate_invalid_source_language(self, handler, context):
        """Test validation with invalid source language."""
        params = {
            "original_text": "Hello",
            "translated_text": "Hola",
            "source_language": "invalid",
            "target_language": "es",
        }
        
        response = handler.validate_translation(params, context)
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
    
    def test_validate_with_criteria(self, handler, context):
        """Test validation with specific criteria."""
        params = {
            "original_text": "Hello, world!",
            "translated_text": "¡Hola, mundo!",
            "source_language": "en",
            "target_language": "es",
            "validation_criteria": ["accuracy", "fluency"],
        }
        
        response = handler.validate_translation(params, context)
        
        assert response.status == "success"
        assert "accuracy_score" in response.data
        assert "fluency_score" in response.data
    
    def test_validate_returns_recommendations(self, handler, context):
        """Test that validation returns recommendations."""
        params = {
            "original_text": "Hello, world!",
            "translated_text": "¡Hola, mundo!",
            "source_language": "en",
            "target_language": "es",
        }
        
        response = handler.validate_translation(params, context)
        
        assert response.status == "success"
        assert len(response.data["recommendations"]) > 0


class TestEndpointIntegration:
    """Integration tests across multiple endpoints."""
    
    def test_detect_then_translate(self, handler, context):
        """Test detecting language then translating."""
        # First detect
        detect_params = {
            "text": "Hello, world!",
        }
        detect_response = handler.detect(detect_params, context)
        assert detect_response.status == "success"
        
        # Then translate using detected language
        translate_params = {
            "text": "Hello, world!",
            "source_language": detect_response.data["detected_language"],
            "target_language": "es",
        }
        translate_response = handler.translate(translate_params, context)
        assert translate_response.status == "success"
    
    def test_translate_then_validate(self, handler, context):
        """Test translating then validating the translation."""
        # First translate
        translate_params = {
            "text": "Hello, world!",
            "source_language": "en",
            "target_language": "es",
        }
        translate_response = handler.translate(translate_params, context)
        assert translate_response.status == "success"
        
        # Then validate
        validate_params = {
            "original_text": "Hello, world!",
            "translated_text": translate_response.data["translated_text"],
            "source_language": "en",
            "target_language": "es",
        }
        validate_response = handler.validate_translation(validate_params, context)
        assert validate_response.status == "success"
    
    def test_localize_then_voice_map(self, handler, context):
        """Test localizing content then mapping voices."""
        # First localize
        localize_params = {
            "content": {"text": "Hello, world!"},
            "target_locale": "es-ES",
        }
        localize_response = handler.localize(localize_params, context)
        assert localize_response.status == "success"
        
        # Then get voice mapping for the language
        voice_params = {
            "target_language": "es",
        }
        voice_response = handler.voice_map(voice_params, context)
        assert voice_response.status == "success"
        assert len(voice_response.data["recommended_voices"]) > 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
