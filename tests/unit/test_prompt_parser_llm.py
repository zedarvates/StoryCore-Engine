"""
Unit tests for PromptParser with LLM integration.

Tests the LLM parsing functionality and fallback behavior.
"""

import pytest
from src.end_to_end.prompt_parser import PromptParser
from src.end_to_end.llm_client import MockLLMClient, LLMError
from src.end_to_end.data_models import ParsedPrompt


class TestPromptParserWithLLM:
    """Test PromptParser with LLM integration"""
    
    def test_parser_uses_llm_when_available(self):
        """Test that parser uses LLM when available"""
        # Create mock LLM client with predefined response
        responses = {
            "Cyberpunk Snow White 2048": {
                "project_title": "Cyberpunk Snow White 2048",
                "genre": "cyberpunk",
                "video_type": "trailer",
                "mood": ["dark", "neon", "mysterious"],
                "setting": "city",
                "time_period": "2048",
                "characters": [
                    {
                        "name": "Snow White",
                        "role": "main",
                        "description": "Cyberpunk protagonist"
                    }
                ],
                "key_elements": ["technology", "neon", "android"],
                "visual_style": ["neon", "gritty", "cyberpunk"],
                "aspect_ratio": "16:9",
                "duration_seconds": 90
            }
        }
        
        llm_client = MockLLMClient(responses=responses)
        parser = PromptParser(llm_client=llm_client, use_llm=True)
        
        result = parser.parse("Cyberpunk Snow White 2048")
        
        # Verify LLM response was used
        assert result.project_title == "Cyberpunk Snow White 2048"
        assert result.genre == "cyberpunk"
        assert result.time_period == "2048"
        assert result.duration_seconds == 90
        assert "neon" in result.mood
        assert len(result.characters) == 1
        assert result.characters[0].name == "Snow White"
        
        # LLM parsing should have high confidence
        assert result.confidence_scores["title"] >= 0.9
    
    def test_parser_falls_back_to_rule_based_when_llm_unavailable(self):
        """Test that parser falls back to rule-based when LLM unavailable"""
        # Create unavailable mock client
        llm_client = MockLLMClient()
        llm_client.set_available(False)
        
        parser = PromptParser(llm_client=llm_client, use_llm=True)
        
        result = parser.parse("Cyberpunk Snow White 2048")
        
        # Should still get valid result from rule-based parsing
        assert result.project_title is not None
        assert result.genre == "cyberpunk"
        assert "Snow White" in [c.name for c in result.characters]
        
        # Rule-based parsing has lower confidence for most fields
        # Title will be high (0.9) because it's extracted from the prompt
        # But other fields should have medium confidence (0.6-0.8)
        assert result.confidence_scores["genre"] <= 0.8
        assert result.confidence_scores["video_type"] <= 0.8
    
    def test_parser_uses_rule_based_when_use_llm_false(self):
        """Test that parser uses rule-based when use_llm=False"""
        llm_client = MockLLMClient()
        parser = PromptParser(llm_client=llm_client, use_llm=False)
        
        result = parser.parse("Cyberpunk Snow White 2048")
        
        # Should use rule-based parsing
        assert result.project_title is not None
        assert result.genre == "cyberpunk"
    
    def test_parser_works_without_llm_client(self):
        """Test that parser works without LLM client"""
        parser = PromptParser(llm_client=None, use_llm=True)
        
        result = parser.parse("Cyberpunk Snow White 2048")
        
        # Should use rule-based parsing
        assert result.project_title is not None
        assert result.genre == "cyberpunk"
    
    def test_parser_handles_llm_parsing_errors_gracefully(self):
        """Test that parser handles LLM errors and falls back"""
        # Create mock client that will raise error
        llm_client = MockLLMClient()
        
        # Override parse_prompt to raise error
        async def failing_parse(prompt):
            raise LLMError("Simulated LLM error")
        
        llm_client.parse_prompt = failing_parse
        
        parser = PromptParser(llm_client=llm_client, use_llm=True)
        
        # Should fall back to rule-based and not crash
        result = parser.parse("Cyberpunk Snow White 2048")
        
        assert result.project_title is not None
        assert result.genre == "cyberpunk"
    
    def test_llm_response_fills_defaults_for_missing_fields(self):
        """Test that LLM response with missing fields gets defaults filled"""
        # Create mock with incomplete response
        responses = {
            "Test prompt": {
                "project_title": "Test Project",
                "genre": "sci-fi",
                # Missing many fields
            }
        }
        
        llm_client = MockLLMClient(responses=responses)
        parser = PromptParser(llm_client=llm_client, use_llm=True)
        
        result = parser.parse("Test prompt")
        
        # Should have defaults filled
        assert result.project_title == "Test Project"
        assert result.genre == "sci-fi"
        assert result.video_type is not None
        assert len(result.mood) > 0
        assert result.setting is not None
        assert result.time_period is not None
        assert len(result.characters) > 0
        assert result.aspect_ratio is not None
        assert result.duration_seconds > 0
    
    def test_llm_response_with_empty_characters_gets_default(self):
        """Test that empty characters list gets default character"""
        responses = {
            "Test prompt": {
                "project_title": "Test Project",
                "genre": "sci-fi",
                "video_type": "trailer",
                "mood": ["mysterious"],
                "setting": "city",
                "time_period": "future",
                "characters": [],  # Empty
                "key_elements": ["tech"],
                "visual_style": ["neon"],
                "aspect_ratio": "16:9",
                "duration_seconds": 60
            }
        }
        
        llm_client = MockLLMClient(responses=responses)
        parser = PromptParser(llm_client=llm_client, use_llm=True)
        
        result = parser.parse("Test prompt")
        
        # Should have default character
        assert len(result.characters) == 1
        assert result.characters[0].name == "Protagonist"
    
    def test_llm_response_converts_characters_correctly(self):
        """Test that LLM character data is converted to CharacterInfo"""
        responses = {
            "Test prompt": {
                "project_title": "Test Project",
                "genre": "fantasy",
                "video_type": "trailer",
                "mood": ["epic"],
                "setting": "castle",
                "time_period": "medieval",
                "characters": [
                    {
                        "name": "Hero",
                        "role": "main",
                        "description": "Brave knight"
                    },
                    {
                        "name": "Villain",
                        "role": "antagonist",
                        "description": "Dark sorcerer"
                    }
                ],
                "key_elements": ["magic", "sword"],
                "visual_style": ["epic", "dramatic"],
                "aspect_ratio": "16:9",
                "duration_seconds": 120
            }
        }
        
        llm_client = MockLLMClient(responses=responses)
        parser = PromptParser(llm_client=llm_client, use_llm=True)
        
        result = parser.parse("Test prompt")
        
        # Verify characters are converted correctly
        assert len(result.characters) == 2
        assert result.characters[0].name == "Hero"
        assert result.characters[0].role == "main"
        assert result.characters[0].description == "Brave knight"
        assert result.characters[1].name == "Villain"
        assert result.characters[1].role == "antagonist"


class TestPromptParserLLMConfidence:
    """Test confidence scoring with LLM parsing"""
    
    def test_llm_parsing_has_high_confidence(self):
        """Test that LLM parsing results have high confidence scores"""
        llm_client = MockLLMClient()
        parser = PromptParser(llm_client=llm_client, use_llm=True)
        
        result = parser.parse("Test prompt")
        
        # LLM parsing should have high confidence for all fields
        for field, score in result.confidence_scores.items():
            assert score >= 0.9, f"Field {field} has low confidence: {score}"
    
    def test_rule_based_parsing_has_variable_confidence(self):
        """Test that rule-based parsing has variable confidence scores"""
        parser = PromptParser(llm_client=None, use_llm=False)
        
        result = parser.parse("Test prompt")
        
        # Rule-based parsing should have variable confidence
        # Some fields will have lower confidence
        confidence_values = list(result.confidence_scores.values())
        assert min(confidence_values) < 0.9, "All confidence scores are high"
        assert max(confidence_values) > 0.5, "All confidence scores are low"


class TestPromptParserValidation:
    """Test validation with LLM-parsed data"""
    
    def test_llm_parsed_data_passes_validation(self):
        """Test that LLM-parsed data passes validation"""
        llm_client = MockLLMClient()
        parser = PromptParser(llm_client=llm_client, use_llm=True)
        
        result = parser.parse("Test prompt")
        is_valid, errors = parser.validate_parsed_data(result)
        
        assert is_valid is True
        assert len(errors) == 0
    
    def test_invalid_llm_response_gets_corrected(self):
        """Test that invalid LLM response gets corrected by fill_defaults"""
        responses = {
            "Test prompt": {
                "project_title": "",  # Invalid
                "genre": "",  # Invalid
                "video_type": "invalid_type",
                "mood": [],  # Invalid
                "setting": "",  # Invalid
                "time_period": "",  # Invalid
                "characters": [],  # Invalid
                "key_elements": [],  # Invalid
                "visual_style": [],  # Invalid
                "aspect_ratio": "invalid",  # Invalid
                "duration_seconds": -10  # Invalid
            }
        }
        
        llm_client = MockLLMClient(responses=responses)
        parser = PromptParser(llm_client=llm_client, use_llm=True)
        
        result = parser.parse("Test prompt")
        
        # fill_defaults should have corrected invalid values
        assert result.project_title != ""
        assert result.genre != ""
        assert len(result.mood) > 0
        assert result.setting != ""
        assert result.time_period != ""
        assert len(result.characters) > 0
        assert result.aspect_ratio in ["16:9", "9:16", "1:1", "4:3", "21:9"]
        assert result.duration_seconds > 0
