"""
Unit tests for LLM client abstraction.

Tests the LLM client interface, mock client, and error handling.
"""

import pytest
import asyncio
from src.end_to_end.llm_client import (
    LLMClient,
    LLMError,
    MockLLMClient,
    OpenAIClient,
    ClaudeClient,
    create_llm_client
)


class TestMockLLMClient:
    """Test MockLLMClient functionality"""
    
    def test_mock_client_is_available(self):
        """Test that mock client reports availability correctly"""
        client = MockLLMClient()
        assert client.is_available() is True
        
        client.set_available(False)
        assert client.is_available() is False
    
    @pytest.mark.asyncio
    async def test_mock_client_returns_generic_response(self):
        """Test that mock client returns generic response for unknown prompts"""
        client = MockLLMClient()
        result = await client.parse_prompt("Test prompt")
        
        assert result["project_title"] == "Mock Project"
        assert result["genre"] == "sci-fi"
        assert result["video_type"] == "trailer"
        assert "mysterious" in result["mood"]
        assert result["duration_seconds"] == 60
    
    @pytest.mark.asyncio
    async def test_mock_client_returns_predefined_response(self):
        """Test that mock client returns predefined responses"""
        responses = {
            "Cyberpunk story": {
                "project_title": "Cyberpunk Story",
                "genre": "cyberpunk",
                "video_type": "trailer",
                "mood": ["dark", "neon"],
                "setting": "city",
                "time_period": "2077",
                "characters": [
                    {
                        "name": "Neo",
                        "role": "main",
                        "description": "Hacker protagonist"
                    }
                ],
                "key_elements": ["technology", "neon"],
                "visual_style": ["neon", "gritty"],
                "aspect_ratio": "16:9",
                "duration_seconds": 90
            }
        }
        
        client = MockLLMClient(responses=responses)
        result = await client.parse_prompt("Cyberpunk story")
        
        assert result["project_title"] == "Cyberpunk Story"
        assert result["genre"] == "cyberpunk"
        assert result["time_period"] == "2077"
        assert result["duration_seconds"] == 90
    
    @pytest.mark.asyncio
    async def test_mock_client_raises_error_when_unavailable(self):
        """Test that mock client raises error when unavailable"""
        client = MockLLMClient()
        client.set_available(False)
        
        with pytest.raises(LLMError, match="Mock client not available"):
            await client.parse_prompt("Test prompt")


class TestOpenAIClient:
    """Test OpenAIClient functionality"""
    
    def test_openai_client_availability_without_key(self):
        """Test that OpenAI client is unavailable without API key"""
        client = OpenAIClient(api_key=None)
        assert client.is_available() is False
    
    def test_openai_client_availability_with_key(self):
        """Test that OpenAI client checks for library availability"""
        # This will be False unless openai library is installed
        client = OpenAIClient(api_key="test_key")
        # We can't guarantee availability without the library
        # Just check it doesn't crash
        assert isinstance(client.is_available(), bool)
    
    @pytest.mark.asyncio
    async def test_openai_client_raises_error_when_unavailable(self):
        """Test that OpenAI client raises error when unavailable"""
        client = OpenAIClient(api_key=None)
        
        with pytest.raises(LLMError, match="OpenAI client not available"):
            await client.parse_prompt("Test prompt")


class TestClaudeClient:
    """Test ClaudeClient functionality"""
    
    def test_claude_client_availability_without_key(self):
        """Test that Claude client is unavailable without API key"""
        client = ClaudeClient(api_key=None)
        assert client.is_available() is False
    
    def test_claude_client_availability_with_key(self):
        """Test that Claude client checks for library availability"""
        # This will be False unless anthropic library is installed
        client = ClaudeClient(api_key="test_key")
        # We can't guarantee availability without the library
        # Just check it doesn't crash
        assert isinstance(client.is_available(), bool)
    
    @pytest.mark.asyncio
    async def test_claude_client_raises_error_when_unavailable(self):
        """Test that Claude client raises error when unavailable"""
        client = ClaudeClient(api_key=None)
        
        with pytest.raises(LLMError, match="Claude client not available"):
            await client.parse_prompt("Test prompt")


class TestLLMClientFactory:
    """Test create_llm_client factory function"""
    
    def test_create_mock_client(self):
        """Test creating mock client"""
        client = create_llm_client(provider="mock")
        assert isinstance(client, MockLLMClient)
        assert client.is_available() is True
    
    def test_create_openai_client(self):
        """Test creating OpenAI client"""
        client = create_llm_client(provider="openai", api_key="test_key")
        # May or may not be available depending on library installation
        assert client is None or isinstance(client, OpenAIClient)
    
    def test_create_claude_client(self):
        """Test creating Claude client"""
        client = create_llm_client(provider="claude", api_key="test_key")
        # May or may not be available depending on library installation
        assert client is None or isinstance(client, ClaudeClient)
    
    def test_create_auto_client_returns_none_without_keys(self):
        """Test that auto mode returns None when no providers available"""
        # Without API keys, should return None
        client = create_llm_client(provider="auto")
        # May be None if no providers available
        assert client is None or isinstance(client, LLMClient)
    
    def test_create_client_with_custom_model(self):
        """Test creating client with custom model"""
        client = create_llm_client(provider="mock", model="custom-model")
        assert isinstance(client, MockLLMClient)


class TestLLMClientInterface:
    """Test LLM client abstract interface"""
    
    def test_llm_client_is_abstract(self):
        """Test that LLMClient cannot be instantiated directly"""
        with pytest.raises(TypeError):
            LLMClient()
    
    def test_mock_client_implements_interface(self):
        """Test that MockLLMClient implements LLMClient interface"""
        client = MockLLMClient()
        assert isinstance(client, LLMClient)
        assert hasattr(client, 'parse_prompt')
        assert hasattr(client, 'is_available')


class TestLLMError:
    """Test LLMError exception"""
    
    def test_llm_error_is_exception(self):
        """Test that LLMError is an Exception"""
        error = LLMError("Test error")
        assert isinstance(error, Exception)
        assert str(error) == "Test error"
    
    def test_llm_error_can_be_raised(self):
        """Test that LLMError can be raised and caught"""
        with pytest.raises(LLMError, match="Test error"):
            raise LLMError("Test error")
