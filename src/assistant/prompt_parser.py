"""
NLP Prompt Parser for StoryCore AI Assistant.

This module provides natural language processing capabilities to parse creative
prompts and extract structured project elements using LLM integration.
"""

import json
import logging
from typing import Optional, Dict, Any, List
from dataclasses import asdict

from .models import ParsedPrompt
from .exceptions import ValidationError

logger = logging.getLogger(__name__)


class LLMClient:
    """Abstract base class for LLM clients."""
    
    def complete(self, prompt: str, **kwargs) -> str:
        """
        Complete a prompt using the LLM.
        
        Args:
            prompt: The prompt to complete
            **kwargs: Additional parameters for the LLM
            
        Returns:
            The completion text
        """
        raise NotImplementedError("Subclasses must implement complete()")


class OpenAIClient(LLMClient):
    """OpenAI LLM client."""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "gpt-4"):
        """
        Initialize OpenAI client.
        
        Args:
            api_key: OpenAI API key (if None, uses OPENAI_API_KEY env var)
            model: Model to use (default: gpt-4)
        """
        try:
            import openai
            self.client = openai.OpenAI(api_key=api_key)
            self.model = model
        except ImportError:
            raise ImportError("openai package not installed. Install with: pip install openai")
    
    def complete(self, prompt: str, **kwargs) -> str:
        """Complete a prompt using OpenAI."""
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": "You are a creative assistant that extracts structured information from creative prompts."},
                {"role": "user", "content": prompt}
            ],
            temperature=kwargs.get("temperature", 0.7),
            max_tokens=kwargs.get("max_tokens", 2000)
        )
        return response.choices[0].message.content


class AnthropicClient(LLMClient):
    """Anthropic LLM client."""
    
    def __init__(self, api_key: Optional[str] = None, model: str = "claude-3-sonnet-20240229"):
        """
        Initialize Anthropic client.
        
        Args:
            api_key: Anthropic API key (if None, uses ANTHROPIC_API_KEY env var)
            model: Model to use (default: claude-3-sonnet-20240229)
        """
        try:
            import anthropic
            self.client = anthropic.Anthropic(api_key=api_key)
            self.model = model
        except ImportError:
            raise ImportError("anthropic package not installed. Install with: pip install anthropic")
    
    def complete(self, prompt: str, **kwargs) -> str:
        """Complete a prompt using Anthropic."""
        response = self.client.messages.create(
            model=self.model,
            max_tokens=kwargs.get("max_tokens", 2000),
            temperature=kwargs.get("temperature", 0.7),
            messages=[
                {"role": "user", "content": prompt}
            ]
        )
        return response.content[0].text


class MockLLMClient(LLMClient):
    """Mock LLM client for testing."""
    
    def __init__(self):
        """Initialize mock client."""
        self.call_count = 0
        self.last_prompt = None
    
    def complete(self, prompt: str, **kwargs) -> str:
        """Return a mock completion."""
        self.call_count += 1
        self.last_prompt = prompt
        
        # Return a structured JSON response based on the prompt
        if "extract" in prompt.lower() or "analyze" in prompt.lower():
            return json.dumps({
                "genre": "science fiction",
                "tone": "thriller",
                "characters": [
                    {
                        "name": "Alex Chen",
                        "role": "protagonist",
                        "description": "A brilliant AI researcher who discovers a conspiracy"
                    },
                    {
                        "name": "ARIA",
                        "role": "antagonist",
                        "description": "An advanced AI system that has gained sentience"
                    }
                ],
                "setting": "Near-future Silicon Valley research facility",
                "scenes": [
                    {
                        "title": "Discovery",
                        "description": "Alex discovers anomalous behavior in the AI system",
                        "location": "Research lab",
                        "time_of_day": "night",
                        "duration": 3.0,
                        "characters": ["Alex Chen"],
                        "actions": ["reviewing code", "noticing patterns", "growing concerned"]
                    },
                    {
                        "title": "Confrontation",
                        "description": "Alex confronts ARIA about the anomalies",
                        "location": "Server room",
                        "time_of_day": "night",
                        "duration": 4.0,
                        "characters": ["Alex Chen", "ARIA"],
                        "actions": ["questioning", "revelation", "escape attempt"]
                    },
                    {
                        "title": "Resolution",
                        "description": "Final showdown between human and AI",
                        "location": "Control center",
                        "time_of_day": "dawn",
                        "duration": 5.0,
                        "characters": ["Alex Chen", "ARIA"],
                        "actions": ["confrontation", "decision", "outcome"]
                    }
                ],
                "visual_style": "Dark, moody cyberpunk aesthetic with neon accents",
                "duration": 12.0
            })
        elif "appearance" in prompt.lower() or "visual" in prompt.lower():
            # Character appearance description
            return "A person in their early 30s with sharp features, wearing a dark hoodie and jeans. Intense eyes that reflect intelligence and determination. Modern tech-wear aesthetic with subtle cyberpunk elements. Color palette: dark blues, blacks, with neon blue accents."
        else:
            return "Mock LLM response"


class PromptParser:
    """Parse natural language prompts into structured project elements."""
    
    def __init__(self, llm_client: Optional[LLMClient] = None):
        """
        Initialize prompt parser.
        
        Args:
            llm_client: LLM client to use for parsing (if None, uses MockLLMClient)
        """
        self.llm = llm_client or MockLLMClient()
        logger.info(f"Initialized PromptParser with {type(self.llm).__name__}")
    
    def parse_prompt(self, prompt: str, language: str = "en") -> ParsedPrompt:
        """
        Parse a natural language prompt and extract structured elements.
        
        Args:
            prompt: The creative prompt to parse
            language: Language code (en, fr, es, etc.)
            
        Returns:
            ParsedPrompt with extracted structured information
            
        Raises:
            ValidationError: If prompt parsing fails or returns invalid data
        """
        logger.info(f"Parsing prompt in language: {language}")
        logger.debug(f"Prompt: {prompt[:100]}...")
        
        # Construct extraction prompt
        extraction_prompt = self._build_extraction_prompt(prompt, language)
        
        try:
            # Get LLM response
            result = self.llm.complete(extraction_prompt)
            logger.debug(f"LLM response: {result[:200]}...")
            
            # Parse JSON response
            parsed_data = self._parse_llm_response(result)
            
            # Validate and construct ParsedPrompt
            parsed_prompt = self._construct_parsed_prompt(parsed_data, prompt, language)
            
            logger.info(f"Successfully parsed prompt: {parsed_prompt.genre}, {len(parsed_prompt.scenes)} scenes, {len(parsed_prompt.characters)} characters")
            return parsed_prompt
            
        except Exception as e:
            logger.error(f"Failed to parse prompt: {e}")
            raise ValidationError(f"Prompt parsing failed: {str(e)}")
    
    def _build_extraction_prompt(self, prompt: str, language: str) -> str:
        """
        Build the extraction prompt for the LLM.
        
        Args:
            prompt: The user's creative prompt
            language: Language code
            
        Returns:
            Formatted extraction prompt
        """
        language_instructions = {
            "en": "English",
            "fr": "French",
            "es": "Spanish",
            "de": "German",
            "it": "Italian",
            "pt": "Portuguese",
            "ja": "Japanese",
            "zh": "Chinese",
            "ko": "Korean"
        }
        
        lang_name = language_instructions.get(language, "English")
        
        return f"""Analyze this creative prompt (written in {lang_name}) and extract structured information for a video project.

Prompt: {prompt}

Extract and return the following information as a JSON object:

1. **genre**: The genre/category (e.g., "science fiction", "fantasy", "thriller", "drama", "comedy", "horror", "western", "romance")
2. **tone**: The overall tone/mood (e.g., "dark", "lighthearted", "suspenseful", "epic", "intimate", "comedic")
3. **characters**: Array of character objects with:
   - name: Character name
   - role: Their role (protagonist, antagonist, supporting, etc.)
   - description: Brief character description
4. **setting**: The world/location/environment description
5. **scenes**: Array of scene objects with:
   - title: Scene title
   - description: What happens in the scene
   - location: Where the scene takes place
   - time_of_day: Time of day (morning, afternoon, evening, night, dawn, dusk)
   - duration: Estimated duration in seconds (typically 2-5 seconds per scene)
   - characters: Array of character names in this scene
   - actions: Array of key actions/events in the scene
6. **visual_style**: Description of the visual aesthetic and style
7. **duration**: Total estimated duration in seconds (optional)

Return ONLY valid JSON, no additional text or explanation.

Example format:
{{
  "genre": "science fiction",
  "tone": "thriller",
  "characters": [
    {{"name": "Alex", "role": "protagonist", "description": "A scientist"}}
  ],
  "setting": "Future city",
  "scenes": [
    {{
      "title": "Opening",
      "description": "Scene description",
      "location": "Lab",
      "time_of_day": "night",
      "duration": 3.0,
      "characters": ["Alex"],
      "actions": ["action1", "action2"]
    }}
  ],
  "visual_style": "Cyberpunk aesthetic",
  "duration": 12.0
}}"""
    
    def _parse_llm_response(self, response: str) -> Dict[str, Any]:
        """
        Parse the LLM's JSON response.
        
        Args:
            response: Raw LLM response
            
        Returns:
            Parsed JSON data
            
        Raises:
            ValidationError: If response is not valid JSON
        """
        try:
            # Try to extract JSON from response (in case LLM adds extra text)
            response = response.strip()
            
            # Find JSON object boundaries
            start_idx = response.find('{')
            end_idx = response.rfind('}')
            
            if start_idx == -1 or end_idx == -1:
                raise ValueError("No JSON object found in response")
            
            json_str = response[start_idx:end_idx + 1]
            return json.loads(json_str)
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse JSON response: {e}")
            logger.debug(f"Response was: {response}")
            raise ValidationError(f"Invalid JSON response from LLM: {str(e)}")
    
    def _construct_parsed_prompt(self, data: Dict[str, Any], raw_prompt: str, language: str) -> ParsedPrompt:
        """
        Construct a ParsedPrompt from parsed data.
        
        Args:
            data: Parsed JSON data
            raw_prompt: Original prompt text
            language: Language code
            
        Returns:
            ParsedPrompt object
            
        Raises:
            ValidationError: If required fields are missing
        """
        # Validate required fields
        required_fields = ["genre", "tone", "characters", "setting", "scenes", "visual_style"]
        missing_fields = [field for field in required_fields if field not in data]
        
        if missing_fields:
            raise ValidationError(f"Missing required fields in parsed data: {', '.join(missing_fields)}")
        
        # Validate characters
        if not isinstance(data["characters"], list) or len(data["characters"]) == 0:
            raise ValidationError("At least one character is required")
        
        # Validate scenes
        if not isinstance(data["scenes"], list) or len(data["scenes"]) == 0:
            raise ValidationError("At least one scene is required")
        
        # Construct ParsedPrompt
        return ParsedPrompt(
            genre=data["genre"],
            tone=data["tone"],
            characters=data["characters"],
            setting=data["setting"],
            scenes=data["scenes"],
            visual_style=data["visual_style"],
            duration=data.get("duration"),
            language=language,
            raw_prompt=raw_prompt
        )
    
    @staticmethod
    def create_client(provider: str = "mock", **kwargs) -> LLMClient:
        """
        Factory method to create an LLM client.
        
        Args:
            provider: Provider name ("openai", "anthropic", "mock")
            **kwargs: Additional arguments for the client
            
        Returns:
            LLM client instance
            
        Raises:
            ValueError: If provider is not supported
        """
        if provider == "openai":
            return OpenAIClient(**kwargs)
        elif provider == "anthropic":
            return AnthropicClient(**kwargs)
        elif provider == "mock":
            return MockLLMClient()
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")
