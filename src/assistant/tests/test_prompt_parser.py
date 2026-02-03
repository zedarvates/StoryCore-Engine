"""
Unit tests for PromptParser.

Tests the natural language prompt parsing functionality including
multi-language support and LLM integration.
"""

import pytest
import json
from pathlib import Path

from src.assistant.prompt_parser import (
    PromptParser,
    MockLLMClient,
    OpenAIClient,
    AnthropicClient,
    LLMClient
)
from src.assistant.models import ParsedPrompt
from src.assistant.exceptions import ValidationError


class TestMockLLMClient:
    """Test the mock LLM client."""
    
    def test_mock_client_returns_structured_data(self):
        """Test that mock client returns valid JSON."""
        client = MockLLMClient()
        result = client.complete("Analyze this prompt")
        
        # Should return valid JSON
        data = json.loads(result)
        assert "genre" in data
        assert "characters" in data
        assert "scenes" in data
    
    def test_mock_client_tracks_calls(self):
        """Test that mock client tracks call count."""
        client = MockLLMClient()
        assert client.call_count == 0
        
        client.complete("Test prompt 1")
        assert client.call_count == 1
        
        client.complete("Test prompt 2")
        assert client.call_count == 2
    
    def test_mock_client_stores_last_prompt(self):
        """Test that mock client stores the last prompt."""
        client = MockLLMClient()
        
        prompt = "Test prompt"
        client.complete(prompt)
        
        assert client.last_prompt == prompt


class TestPromptParser:
    """Test the PromptParser class."""
    
    def test_parser_initialization_with_mock_client(self):
        """Test parser initializes with mock client by default."""
        parser = PromptParser()
        assert isinstance(parser.llm, MockLLMClient)
    
    def test_parser_initialization_with_custom_client(self):
        """Test parser initializes with custom client."""
        client = MockLLMClient()
        parser = PromptParser(llm_client=client)
        assert parser.llm is client
    
    def test_parse_simple_english_prompt(self):
        """Test parsing a simple English prompt."""
        parser = PromptParser()
        prompt = "Create a sci-fi thriller about AI rebellion"
        
        result = parser.parse_prompt(prompt, language="en")
        
        assert isinstance(result, ParsedPrompt)
        assert result.genre is not None
        assert result.tone is not None
        assert len(result.characters) > 0
        assert len(result.scenes) > 0
        assert result.setting is not None
        assert result.visual_style is not None
        assert result.language == "en"
        assert result.raw_prompt == prompt
    
    def test_parse_french_prompt(self):
        """Test parsing a French prompt."""
        parser = PromptParser()
        prompt = "Crée une bande-annonce western post-apocalyptique avec un cowboy solitaire"
        
        result = parser.parse_prompt(prompt, language="fr")
        
        assert isinstance(result, ParsedPrompt)
        assert result.language == "fr"
        assert result.raw_prompt == prompt
        assert len(result.characters) > 0
        assert len(result.scenes) > 0
    
    def test_parse_spanish_prompt(self):
        """Test parsing a Spanish prompt."""
        parser = PromptParser()
        prompt = "Crea un tráiler de ciencia ficción sobre una invasión alienígena"
        
        result = parser.parse_prompt(prompt, language="es")
        
        assert isinstance(result, ParsedPrompt)
        assert result.language == "es"
        assert result.raw_prompt == prompt
        assert len(result.characters) > 0
        assert len(result.scenes) > 0
    
    def test_parse_german_prompt(self):
        """Test parsing a German prompt."""
        parser = PromptParser()
        prompt = "Erstelle einen Fantasy-Trailer über einen mutigen Ritter"
        
        result = parser.parse_prompt(prompt, language="de")
        
        assert isinstance(result, ParsedPrompt)
        assert result.language == "de"
        assert len(result.characters) > 0
    
    def test_parse_japanese_prompt(self):
        """Test parsing a Japanese prompt."""
        parser = PromptParser()
        prompt = "サイバーパンクの世界でハッカーの物語を作成してください"
        
        result = parser.parse_prompt(prompt, language="ja")
        
        assert isinstance(result, ParsedPrompt)
        assert result.language == "ja"
    
    def test_parsed_prompt_has_all_required_fields(self):
        """Test that parsed prompt contains all required fields."""
        parser = PromptParser()
        prompt = "Create a fantasy adventure"
        
        result = parser.parse_prompt(prompt)
        
        # Check all required fields
        assert result.genre is not None
        assert result.tone is not None
        assert isinstance(result.characters, list)
        assert len(result.characters) > 0
        assert result.setting is not None
        assert isinstance(result.scenes, list)
        assert len(result.scenes) > 0
        assert result.visual_style is not None
        assert result.language is not None
        assert result.raw_prompt == prompt
    
    def test_parsed_prompt_characters_have_required_fields(self):
        """Test that parsed characters have required fields."""
        parser = PromptParser()
        prompt = "Create a story with a hero and villain"
        
        result = parser.parse_prompt(prompt)
        
        for character in result.characters:
            assert "name" in character
            assert "role" in character
            assert "description" in character
    
    def test_parsed_prompt_scenes_have_required_fields(self):
        """Test that parsed scenes have required fields."""
        parser = PromptParser()
        prompt = "Create a three-act story"
        
        result = parser.parse_prompt(prompt)
        
        for scene in result.scenes:
            assert "title" in scene
            assert "description" in scene
            assert "location" in scene
            assert "time_of_day" in scene
            assert "duration" in scene
            assert "characters" in scene
            assert "actions" in scene
    
    def test_parse_prompt_with_invalid_json_response(self):
        """Test handling of invalid JSON response from LLM."""
        
        class BadLLMClient(LLMClient):
            def complete(self, prompt: str, **kwargs) -> str:
                return "This is not JSON"
        
        parser = PromptParser(llm_client=BadLLMClient())
        
        with pytest.raises(ValidationError, match="Prompt parsing failed"):
            parser.parse_prompt("Test prompt")
    
    def test_parse_prompt_with_missing_required_fields(self):
        """Test handling of response missing required fields."""
        
        class IncompleteLLMClient(LLMClient):
            def complete(self, prompt: str, **kwargs) -> str:
                return json.dumps({
                    "genre": "sci-fi",
                    # Missing other required fields
                })
        
        parser = PromptParser(llm_client=IncompleteLLMClient())
        
        with pytest.raises(ValidationError, match="Missing required fields"):
            parser.parse_prompt("Test prompt")
    
    def test_parse_prompt_with_no_characters(self):
        """Test handling of response with no characters."""
        
        class NoCharactersClient(LLMClient):
            def complete(self, prompt: str, **kwargs) -> str:
                return json.dumps({
                    "genre": "sci-fi",
                    "tone": "dark",
                    "characters": [],  # Empty characters
                    "setting": "Space",
                    "scenes": [{"title": "Scene 1"}],
                    "visual_style": "Dark"
                })
        
        parser = PromptParser(llm_client=NoCharactersClient())
        
        with pytest.raises(ValidationError, match="At least one character is required"):
            parser.parse_prompt("Test prompt")
    
    def test_parse_prompt_with_no_scenes(self):
        """Test handling of response with no scenes."""
        
        class NoScenesClient(LLMClient):
            def complete(self, prompt: str, **kwargs) -> str:
                return json.dumps({
                    "genre": "sci-fi",
                    "tone": "dark",
                    "characters": [{"name": "Hero"}],
                    "setting": "Space",
                    "scenes": [],  # Empty scenes
                    "visual_style": "Dark"
                })
        
        parser = PromptParser(llm_client=NoScenesClient())
        
        with pytest.raises(ValidationError, match="At least one scene is required"):
            parser.parse_prompt("Test prompt")
    
    def test_parse_prompt_extracts_json_from_text(self):
        """Test that parser can extract JSON from text with extra content."""
        
        class VerboseLLMClient(LLMClient):
            def complete(self, prompt: str, **kwargs) -> str:
                return """Here is the analysis:
                
                {
                    "genre": "sci-fi",
                    "tone": "dark",
                    "characters": [{"name": "Hero", "role": "protagonist", "description": "A hero"}],
                    "setting": "Space",
                    "scenes": [{"title": "Scene 1", "description": "Desc", "location": "Lab", 
                               "time_of_day": "night", "duration": 3.0, "characters": ["Hero"], 
                               "actions": ["action1"]}],
                    "visual_style": "Dark"
                }
                
                This should work well for your project!"""
        
        parser = PromptParser(llm_client=VerboseLLMClient())
        result = parser.parse_prompt("Test prompt")
        
        assert result.genre == "sci-fi"
        assert result.tone == "dark"
    
    def test_create_client_factory_mock(self):
        """Test factory method creates mock client."""
        client = PromptParser.create_client("mock")
        assert isinstance(client, MockLLMClient)
    
    def test_create_client_factory_invalid_provider(self):
        """Test factory method raises error for invalid provider."""
        with pytest.raises(ValueError, match="Unsupported LLM provider"):
            PromptParser.create_client("invalid_provider")
    
    def test_parse_prompt_with_optional_duration(self):
        """Test that optional duration field is handled correctly."""
        parser = PromptParser()
        prompt = "Create a short story"
        
        result = parser.parse_prompt(prompt)
        
        # Duration is optional, can be None or a float
        assert result.duration is None or isinstance(result.duration, (int, float))
    
    def test_parse_complex_prompt_with_multiple_characters(self):
        """Test parsing a complex prompt with multiple characters."""
        parser = PromptParser()
        prompt = """Create an epic fantasy adventure featuring:
        - A brave knight named Sir Roland
        - A wise wizard named Merlin
        - An evil sorcerer named Malakar
        Set in a medieval kingdom under siege"""
        
        result = parser.parse_prompt(prompt)
        
        assert len(result.characters) >= 2  # At least 2 characters
        assert result.genre is not None
        assert result.setting is not None
    
    def test_parse_prompt_preserves_raw_prompt(self):
        """Test that raw prompt is preserved exactly."""
        parser = PromptParser()
        prompt = "Create a story with special characters: @#$%^&*()"
        
        result = parser.parse_prompt(prompt)
        
        assert result.raw_prompt == prompt
    
    def test_default_language_is_english(self):
        """Test that default language is English."""
        parser = PromptParser()
        prompt = "Create a story"
        
        result = parser.parse_prompt(prompt)
        
        assert result.language == "en"


class TestLLMClientFactory:
    """Test LLM client factory and initialization."""
    
    def test_openai_client_requires_package(self):
        """Test that OpenAI client requires openai package."""
        # This test will pass if openai is installed, or raise ImportError if not
        try:
            client = OpenAIClient(api_key="test_key")
            assert client.model == "gpt-4"
        except ImportError as e:
            assert "openai package not installed" in str(e)
    
    def test_anthropic_client_requires_package(self):
        """Test that Anthropic client requires anthropic package."""
        # This test will pass if anthropic is installed, or raise ImportError if not
        try:
            client = AnthropicClient(api_key="test_key")
            assert "claude" in client.model
        except ImportError as e:
            assert "anthropic package not installed" in str(e)
    
    def test_create_client_with_custom_model(self):
        """Test creating client with custom model."""
        try:
            client = PromptParser.create_client("openai", model="gpt-3.5-turbo")
            assert client.model == "gpt-3.5-turbo"
        except ImportError:
            # Skip if openai not installed
            pytest.skip("openai package not installed")


class TestPromptParserEdgeCases:
    """Test edge cases and error handling."""
    
    def test_parse_empty_prompt(self):
        """Test parsing an empty prompt."""
        parser = PromptParser()
        
        # Should still work with mock client
        result = parser.parse_prompt("")
        assert isinstance(result, ParsedPrompt)
    
    def test_parse_very_long_prompt(self):
        """Test parsing a very long prompt."""
        parser = PromptParser()
        prompt = "Create a story. " * 1000  # Very long prompt
        
        result = parser.parse_prompt(prompt)
        assert isinstance(result, ParsedPrompt)
        assert result.raw_prompt == prompt
    
    def test_parse_prompt_with_unicode_characters(self):
        """Test parsing prompt with unicode characters."""
        parser = PromptParser()
        prompt = "Create a story with émojis 🎬🎥🎞️ and spëcial çharacters"
        
        result = parser.parse_prompt(prompt)
        assert result.raw_prompt == prompt
    
    def test_parse_prompt_with_newlines(self):
        """Test parsing prompt with newlines."""
        parser = PromptParser()
        prompt = """Create a story with:
        - Multiple lines
        - Bullet points
        - Formatting"""
        
        result = parser.parse_prompt(prompt)
        assert result.raw_prompt == prompt
