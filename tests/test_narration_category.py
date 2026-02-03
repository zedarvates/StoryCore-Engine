"""
Integration tests for Narration Category API endpoints.

Tests all 18 narration endpoints with valid inputs and error handling.
"""

import pytest
from src.api import (
    APIRouter,
    APIConfig,
    RequestContext,
    NarrationCategoryHandler,
)
from src.api.categories.narration_models import LLMConfig


@pytest.fixture
def api_config():
    """Create API configuration for testing."""
    return APIConfig(
        version="v1",
        host="localhost",
        port=8000,
        enable_auth=False,
        enable_rate_limiting=False,
        log_level="INFO",
    )


@pytest.fixture
def router(api_config):
    """Create API router."""
    return APIRouter(api_config)


@pytest.fixture
def llm_config():
    """Create LLM configuration for testing (using mock)."""
    return LLMConfig(provider="mock")


@pytest.fixture
def narration_handler(api_config, router, llm_config):
    """Create narration category handler."""
    handler = NarrationCategoryHandler(api_config, router, llm_config)
    # Ensure endpoints are registered
    return handler


@pytest.fixture
def context():
    """Create request context."""
    return RequestContext(endpoint="test", method="POST")


class TestCoreNarrationEndpoints:
    """Test core narration endpoints (4 endpoints)."""
    
    def test_generate_narrative(self, narration_handler, router, context):
        """Test storycore.narration.generate endpoint."""
        params = {
            "prompt": "A scientist discovers a mysterious artifact",
            "options": {
                "genre": "science fiction",
                "tone": "mysterious",
                "length": 200
            }
        }
        
        response = router.route_request(
            "storycore.narration.generate",
            "POST",
            params,
            context
        )
        
        assert response.status == "success"
        assert "content" in response.data
        assert "metadata" in response.data
        assert response.data["metadata"]["prompt"] == params["prompt"]
    
    def test_analyze_narrative(self, narration_handler, router, context):
        """Test storycore.narration.analyze endpoint."""
        params = {
            "text": "Once upon a time, a hero embarked on a journey. They faced challenges and grew stronger. In the end, they returned home transformed."
        }
        
        response = router.route_request(
            "storycore.narration.analyze",
            "POST",
            params,
            context
        )
        
        assert response.status == "success"
        assert "acts" in response.data
        assert "beats" in response.data
        assert "pacing" in response.data
        assert "themes" in response.data
    
    def test_expand_scene(self, narration_handler, router, context):
        """Test storycore.narration.expand endpoint."""
        params = {
            "scene": "The detective entered the room.",
            "focus": "description"
        }
        
        response = router.route_request(
            "storycore.narration.expand",
            "POST",
            params,
            context
        )
        
        assert response.status == "success"
        assert "original_scene" in response.data
        assert "expanded_scene" in response.data
        assert response.data["focus"] == "description"
    
    def test_summarize_text(self, narration_handler, router, context):
        """Test storycore.narration.summarize endpoint."""
        params = {
            "text": "This is a long story about many things that happen over time. There are characters and events and conflicts and resolutions. It's quite detailed and comprehensive.",
            "length": "short"
        }
        
        response = router.route_request(
            "storycore.narration.summarize",
            "POST",
            params,
            context
        )
        
        assert response.status == "success"
        assert "summary" in response.data
        assert "length" in response.data
        assert response.data["length"] == "short"


class TestDialogueEndpoints:
    """Test dialogue generation endpoints (2 endpoints)."""
    
    def test_generate_dialogue(self, narration_handler, router, context):
        """Test storycore.narration.dialogue.generate endpoint."""
        params = {
            "character": "Detective Sarah",
            "context": "Interrogating a suspect",
            "tone": "stern",
            "num_lines": 3
        }
        
        response = router.route_request(
            "storycore.narration.dialogue.generate",
            "POST",
            params,
            context
        )
        
        assert response.status == "success"
        assert "character" in response.data
        assert "lines" in response.data
        assert isinstance(response.data["lines"], list)
    
    def test_refine_dialogue(self, narration_handler, router, context):
        """Test storycore.narration.dialogue.refine endpoint."""
        params = {
            "dialogue": "Hey, what's up? I found something weird.",
            "goals": ["naturalness", "character_voice"]
        }
        
        response = router.route_request(
            "storycore.narration.dialogue.refine",
            "POST",
            params,
            context
        )
        
        assert response.status == "success"
        assert "original" in response.data
        assert "refined" in response.data
        assert "improvements" in response.data


class TestCharacterEndpoints:
    """Test character analysis endpoints (2 endpoints)."""
    
    def test_character_profile(self, narration_handler, router, context):
        """Test storycore.narration.character.profile endpoint."""
        params = {
            "character_description": "A brilliant but troubled scientist",
            "detail_level": "high"
        }
        
        response = router.route_request(
            "storycore.narration.character.profile",
            "POST",
            params,
            context
        )
        
        assert response.status == "success"
        assert "name" in response.data
        assert "description" in response.data
        assert "traits" in response.data
    
    def test_character_arc(self, narration_handler, router, context):
        """Test storycore.narration.character.arc endpoint."""
        params = {
            "character_name": "Dr. Sarah Chen",
            "story_context": "A scientist who discovers a quantum anomaly",
            "mode": "generate"
        }
        
        response = router.route_request(
            "storycore.narration.character.arc",
            "POST",
            params,
            context
        )
        
        assert response.status == "success"
        assert "character_name" in response.data
        assert "starting_state" in response.data
        assert "ending_state" in response.data
        assert "key_moments" in response.data


class TestSceneEndpoints:
    """Test scene processing endpoints (2 endpoints)."""
    
    def test_scene_breakdown(self, narration_handler, router, context):
        """Test storycore.narration.scene.breakdown endpoint."""
        params = {
            "script": "INT. LAB - NIGHT\nSarah discovers the anomaly.\n\nINT. OFFICE - DAY\nShe shares her findings."
        }
        
        response = router.route_request(
            "storycore.narration.scene.breakdown",
            "POST",
            params,
            context
        )
        
        assert response.status == "success"
        assert "scenes" in response.data
        assert "scene_count" in response.data
        assert isinstance(response.data["scenes"], list)
    
    def test_scene_enhance(self, narration_handler, router, context):
        """Test storycore.narration.scene.enhance endpoint."""
        params = {
            "scene": "The lab was quiet. Sarah worked at her desk.",
            "sensory_focus": ["visual", "auditory"]
        }
        
        response = router.route_request(
            "storycore.narration.scene.enhance",
            "POST",
            params,
            context
        )
        
        assert response.status == "success"
        assert "original_scene" in response.data
        assert "enhanced_scene" in response.data
        assert "sensory_details" in response.data


class TestToneAndStyleEndpoints:
    """Test tone and style endpoints (3 endpoints)."""
    
    def test_tone_analyze(self, narration_handler, router, context):
        """Test storycore.narration.tone.analyze endpoint."""
        params = {
            "text": "The shadows grew longer as night approached. Something was wrong, terribly wrong."
        }
        
        response = router.route_request(
            "storycore.narration.tone.analyze",
            "POST",
            params,
            context
        )
        
        assert response.status == "success"
        assert "primary_tone" in response.data
        assert "secondary_tones" in response.data
        assert "confidence" in response.data
    
    def test_tone_adjust(self, narration_handler, router, context):
        """Test storycore.narration.tone.adjust endpoint."""
        params = {
            "text": "The scientist found something interesting.",
            "target_tone": "suspenseful"
        }
        
        response = router.route_request(
            "storycore.narration.tone.adjust",
            "POST",
            params,
            context
        )
        
        assert response.status == "success"
        assert "original_text" in response.data
        assert "adjusted_text" in response.data
        assert "target_tone" in response.data
    
    def test_style_transfer(self, narration_handler, router, context):
        """Test storycore.narration.style.transfer endpoint."""
        params = {
            "text": "The scientist made a discovery.",
            "target_style": "Victorian literary"
        }
        
        response = router.route_request(
            "storycore.narration.style.transfer",
            "POST",
            params,
            context
        )
        
        assert response.status == "success"
        assert "original_text" in response.data
        assert "transferred_text" in response.data
        assert "target_style" in response.data


class TestAdvancedEndpoints:
    """Test advanced narration endpoints (5 endpoints)."""
    
    def test_continuity_check(self, narration_handler, router, context):
        """Test storycore.narration.continuity.check endpoint."""
        params = {
            "narrative": "Chapter 1: Sarah has blue eyes. Chapter 5: Sarah's brown eyes sparkled."
        }
        
        response = router.route_request(
            "storycore.narration.continuity.check",
            "POST",
            params,
            context
        )
        
        assert response.status == "success"
        assert "issues" in response.data
        assert "overall_score" in response.data
    
    def test_world_expand(self, narration_handler, router, context):
        """Test storycore.narration.world.expand endpoint."""
        params = {
            "world_description": "A futuristic research facility",
            "aspects": ["locations", "cultures", "rules"]
        }
        
        response = router.route_request(
            "storycore.narration.world.expand",
            "POST",
            params,
            context
        )
        
        assert response.status == "success"
        assert "expanded_elements" in response.data
        assert "locations" in response.data
    
    def test_prompt_optimize(self, narration_handler, router, context):
        """Test storycore.narration.prompt.optimize endpoint."""
        params = {
            "prompt": "Make a story about science"
        }
        
        response = router.route_request(
            "storycore.narration.prompt.optimize",
            "POST",
            params,
            context
        )
        
        assert response.status == "success"
        assert "original_prompt" in response.data
        assert "optimized_prompt" in response.data
        assert "improvements" in response.data
    
    def test_feedback_generate(self, narration_handler, router, context):
        """Test storycore.narration.feedback.generate endpoint."""
        params = {
            "narrative": "A story about a hero who saves the day.",
            "focus_areas": ["plot", "characters"]
        }
        
        response = router.route_request(
            "storycore.narration.feedback.generate",
            "POST",
            params,
            context
        )
        
        assert response.status == "success"
        assert "strengths" in response.data
        assert "weaknesses" in response.data
        assert "suggestions" in response.data
    
    def test_alternatives_suggest(self, narration_handler, router, context):
        """Test storycore.narration.alternatives.suggest endpoint."""
        params = {
            "current_direction": "Scientist discovers quantum anomaly",
            "num_alternatives": 3
        }
        
        response = router.route_request(
            "storycore.narration.alternatives.suggest",
            "POST",
            params,
            context
        )
        
        assert response.status == "success"
        assert "alternatives" in response.data
        assert len(response.data["alternatives"]) >= 1


class TestErrorHandling:
    """Test error handling for narration endpoints."""
    
    def test_missing_required_parameter(self, narration_handler, router, context):
        """Test that missing required parameters return validation error."""
        params = {}  # Missing required 'prompt' parameter
        
        response = router.route_request(
            "storycore.narration.generate",
            "POST",
            params,
            context
        )
        
        assert response.status == "error"
        assert response.error.code == "VALIDATION_ERROR"
        assert "prompt" in response.error.message.lower()
    
    def test_invalid_endpoint(self, narration_handler, router, context):
        """Test that invalid endpoint returns not found error."""
        params = {"text": "test"}
        
        response = router.route_request(
            "storycore.narration.invalid",
            "POST",
            params,
            context
        )
        
        assert response.status == "error"
        assert response.error.code == "NOT_FOUND"


class TestEndpointRegistration:
    """Test that all endpoints are properly registered."""
    
    def test_all_18_endpoints_registered(self, narration_handler, router):
        """Verify all 18 narration endpoints are registered."""
        expected_endpoints = [
            # Core (4)
            "storycore.narration.generate",
            "storycore.narration.analyze",
            "storycore.narration.expand",
            "storycore.narration.summarize",
            # Dialogue (2)
            "storycore.narration.dialogue.generate",
            "storycore.narration.dialogue.refine",
            # Character (2)
            "storycore.narration.character.profile",
            "storycore.narration.character.arc",
            # Scene (2)
            "storycore.narration.scene.breakdown",
            "storycore.narration.scene.enhance",
            # Tone/Style (3)
            "storycore.narration.tone.analyze",
            "storycore.narration.tone.adjust",
            "storycore.narration.style.transfer",
            # Advanced (5)
            "storycore.narration.continuity.check",
            "storycore.narration.world.expand",
            "storycore.narration.prompt.optimize",
            "storycore.narration.feedback.generate",
            "storycore.narration.alternatives.suggest",
        ]
        
        registered_endpoints = [ep.path for ep in router.list_endpoints()]
        
        for endpoint in expected_endpoints:
            assert endpoint in registered_endpoints, f"Endpoint {endpoint} not registered"
        
        # Count narration endpoints
        narration_endpoints = [ep for ep in registered_endpoints if ep.startswith("storycore.narration")]
        assert len(narration_endpoints) == 18, f"Expected 18 narration endpoints, found {len(narration_endpoints)}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
