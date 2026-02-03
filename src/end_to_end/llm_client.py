"""
LLM Client abstraction for advanced prompt parsing.

Provides a unified interface for different LLM providers (OpenAI, Claude, etc.)
with fallback to rule-based parsing when LLM is unavailable.
"""

import os
import json
from typing import Optional, Dict, Any, List
from abc import ABC, abstractmethod
from dataclasses import asdict


class LLMClient(ABC):
    """
    Abstract base class for LLM clients.
    
    Provides a unified interface for different LLM providers.
    """
    
    @abstractmethod
    async def parse_prompt(self, prompt: str) -> Dict[str, Any]:
        """
        Parse a user prompt using LLM.
        
        Args:
            prompt: User input text
            
        Returns:
            Dictionary with parsed fields
            
        Raises:
            LLMError: If LLM request fails
        """
        pass
    
    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if LLM client is available and configured.
        
        Returns:
            True if client can be used, False otherwise
        """
        pass


class LLMError(Exception):
    """Exception raised when LLM request fails"""
    pass


class OpenAIClient(LLMClient):
    """
    OpenAI API client for prompt parsing.
    
    Uses GPT models to parse prompts with structured output.
    """
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4"):
        """
        Initialize OpenAI client.
        
        Args:
            api_key: OpenAI API key (defaults to OPENAI_API_KEY env var)
            model: Model to use (default: gpt-4)
        """
        self.api_key = api_key or os.environ.get("OPENAI_API_KEY")
        self.model = model
        self._client = None
        
        if self.api_key:
            try:
                import openai
                self._client = openai.OpenAI(api_key=self.api_key)
            except ImportError:
                # OpenAI library not installed
                pass
    
    def is_available(self) -> bool:
        """Check if OpenAI client is available"""
        return self._client is not None and self.api_key is not None
    
    async def parse_prompt(self, prompt: str) -> Dict[str, Any]:
        """
        Parse prompt using OpenAI API.
        
        Args:
            prompt: User input text
            
        Returns:
            Dictionary with parsed fields
            
        Raises:
            LLMError: If API request fails
        """
        if not self.is_available():
            raise LLMError("OpenAI client not available")
        
        system_prompt = self._get_system_prompt()
        
        try:
            response = self._client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.3,
                max_tokens=2000
            )
            
            content = response.choices[0].message.content
            parsed_data = json.loads(content)
            
            return parsed_data
            
        except Exception as e:
            raise LLMError(f"OpenAI API request failed: {str(e)}")
    
    def _get_system_prompt(self) -> str:
        """Get system prompt for parsing"""
        return """You are a video project analyzer. Parse the user's prompt and extract structured information.

Return a JSON object with these fields:
{
  "project_title": "string - title of the project",
  "genre": "string - genre (cyberpunk, fantasy, horror, sci-fi, western, thriller, etc.)",
  "video_type": "string - type (trailer, teaser, short_film, music_video, commercial, scene)",
  "mood": ["array of strings - moods (dark, mysterious, epic, intimate, etc.)"],
  "setting": "string - primary setting (city, forest, desert, space, etc.)",
  "time_period": "string - time period (future, present, past, specific year, etc.)",
  "characters": [
    {
      "name": "string - character name",
      "role": "string - role (main, antagonist, supporting)",
      "description": "string - brief description"
    }
  ],
  "key_elements": ["array of strings - key visual/narrative elements"],
  "visual_style": ["array of strings - visual styles (neon, gritty, elegant, etc.)"],
  "aspect_ratio": "string - aspect ratio (16:9, 9:16, 1:1, 4:3, 21:9)",
  "duration_seconds": "integer - duration in seconds"
}

Be intelligent about defaults:
- If no duration specified, use 60 seconds for trailers, 30 for teasers, 180 for short films
- If no aspect ratio specified, use 16:9 for cinematic content, 9:16 for mobile/social
- Extract all relevant moods and visual styles from the prompt
- Identify all mentioned characters with their roles
- Be creative but accurate in extracting information"""


class ClaudeClient(LLMClient):
    """
    Anthropic Claude API client for prompt parsing.
    
    Uses Claude models to parse prompts with structured output.
    """
    
    def __init__(self, api_key: Optional[str] = None, model: str = "claude-3-5-sonnet-20241022"):
        """
        Initialize Claude client.
        
        Args:
            api_key: Anthropic API key (defaults to ANTHROPIC_API_KEY env var)
            model: Model to use (default: claude-3-5-sonnet-20241022)
        """
        self.api_key = api_key or os.environ.get("ANTHROPIC_API_KEY")
        self.model = model
        self._client = None
        
        if self.api_key:
            try:
                import anthropic
                self._client = anthropic.Anthropic(api_key=self.api_key)
            except ImportError:
                # Anthropic library not installed
                pass
    
    def is_available(self) -> bool:
        """Check if Claude client is available"""
        return self._client is not None and self.api_key is not None
    
    async def parse_prompt(self, prompt: str) -> Dict[str, Any]:
        """
        Parse prompt using Claude API.
        
        Args:
            prompt: User input text
            
        Returns:
            Dictionary with parsed fields
            
        Raises:
            LLMError: If API request fails
        """
        if not self.is_available():
            raise LLMError("Claude client not available")
        
        system_prompt = self._get_system_prompt()
        
        try:
            response = self._client.messages.create(
                model=self.model,
                max_tokens=2000,
                temperature=0.3,
                system=system_prompt,
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            
            content = response.content[0].text
            
            # Extract JSON from response (Claude might wrap it in markdown)
            json_match = content
            if "```json" in content:
                json_match = content.split("```json")[1].split("```")[0].strip()
            elif "```" in content:
                json_match = content.split("```")[1].split("```")[0].strip()
            
            parsed_data = json.loads(json_match)
            
            return parsed_data
            
        except Exception as e:
            raise LLMError(f"Claude API request failed: {str(e)}")
    
    def _get_system_prompt(self) -> str:
        """Get system prompt for parsing"""
        return """You are a video project analyzer. Parse the user's prompt and extract structured information.

Return a JSON object with these fields:
{
  "project_title": "string - title of the project",
  "genre": "string - genre (cyberpunk, fantasy, horror, sci-fi, western, thriller, etc.)",
  "video_type": "string - type (trailer, teaser, short_film, music_video, commercial, scene)",
  "mood": ["array of strings - moods (dark, mysterious, epic, intimate, etc.)"],
  "setting": "string - primary setting (city, forest, desert, space, etc.)",
  "time_period": "string - time period (future, present, past, specific year, etc.)",
  "characters": [
    {
      "name": "string - character name",
      "role": "string - role (main, antagonist, supporting)",
      "description": "string - brief description"
    }
  ],
  "key_elements": ["array of strings - key visual/narrative elements"],
  "visual_style": ["array of strings - visual styles (neon, gritty, elegant, etc.)"],
  "aspect_ratio": "string - aspect ratio (16:9, 9:16, 1:1, 4:3, 21:9)",
  "duration_seconds": "integer - duration in seconds"
}

Be intelligent about defaults:
- If no duration specified, use 60 seconds for trailers, 30 for teasers, 180 for short films
- If no aspect ratio specified, use 16:9 for cinematic content, 9:16 for mobile/social
- Extract all relevant moods and visual styles from the prompt
- Identify all mentioned characters with their roles
- Be creative but accurate in extracting information

Return ONLY the JSON object, no additional text."""


class MockLLMClient(LLMClient):
    """
    Mock LLM client for testing.
    
    Returns predefined responses for testing purposes.
    """
    
    def __init__(self, responses: Optional[Dict[str, Dict[str, Any]]] = None):
        """
        Initialize mock client.
        
        Args:
            responses: Dictionary mapping prompts to responses
        """
        self.responses = responses or {}
        self._available = True
    
    def is_available(self) -> bool:
        """Check if mock client is available"""
        return self._available
    
    def set_available(self, available: bool):
        """Set availability for testing"""
        self._available = available
    
    async def parse_prompt(self, prompt: str) -> Dict[str, Any]:
        """
        Parse prompt using mock responses.
        
        Args:
            prompt: User input text
            
        Returns:
            Dictionary with parsed fields
            
        Raises:
            LLMError: If no mock response configured
        """
        if not self.is_available():
            raise LLMError("Mock client not available")
        
        # Return predefined response if available
        if prompt in self.responses:
            return self.responses[prompt]
        
        # Return generic response
        return {
            "project_title": "Mock Project",
            "genre": "sci-fi",
            "video_type": "trailer",
            "mood": ["mysterious", "epic"],
            "setting": "city",
            "time_period": "future",
            "characters": [
                {
                    "name": "Protagonist",
                    "role": "main",
                    "description": "Main character"
                }
            ],
            "key_elements": ["technology", "atmosphere"],
            "visual_style": ["neon", "gritty"],
            "aspect_ratio": "16:9",
            "duration_seconds": 60
        }


def create_llm_client(
    provider: str = "auto",
    api_key: Optional[str] = None,
    model: Optional[str] = None
) -> Optional[LLMClient]:
    """
    Factory function to create LLM client.
    
    Args:
        provider: Provider name ("openai", "claude", "auto", or "mock")
        api_key: API key for the provider
        model: Model name to use
        
    Returns:
        LLMClient instance or None if no provider available
    """
    if provider == "mock":
        return MockLLMClient()
    
    if provider == "openai" or provider == "auto":
        client = OpenAIClient(api_key=api_key, model=model or "gpt-4")
        if client.is_available():
            return client
    
    if provider == "claude" or provider == "auto":
        client = ClaudeClient(api_key=api_key, model=model or "claude-3-5-sonnet-20241022")
        if client.is_available():
            return client
    
    # No provider available
    return None
