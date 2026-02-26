"""
MusicLyricsWizard Service

This module provides services for generating song lyrics and musical style prompts
using Large Language Models. It integrates with the StoryCore LLM API.

Requirements: PLAN_MUSIC_LYRICS_WIZARDS.md
"""

import logging
import json
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
from backend.llm_api import (
    generate_text, 
    LLMRequest, 
    PromptTemplateType, 
    prompt_templates
)

# Configure logging
logger = logging.getLogger(__name__)

class LyricsGenerationRequest(BaseModel):
    """Request model for lyrics generation"""
    theme: str = Field(..., description="The main theme of the song")
    style: str = Field(..., description="Musical style (rap, pop, rock, ballad, folk)")
    mood: List[str] = Field(default_factory=list, description="List of moods")
    length: str = Field("medium", description="Length of the lyrics (short, medium, long)")
    characters: Optional[List[str]] = Field(None, description="Characters to include in the lyrics")
    shots: Optional[List[str]] = Field(None, description="Shot IDs to integrate with")

class MusicStyleRequest(BaseModel):
    """Request model for music style prompt generation"""
    prompt: str = Field(..., description="Base prompt for the music")
    style: str = Field(..., description="Musical style")
    duration: int = Field(60, description="Duration in seconds")
    mood: List[str] = Field(default_factory=list, description="List of moods")
    instrumentation: Optional[List[str]] = Field(None, description="List of instruments")
    bpm: Optional[int] = Field(None, description="Beats per minute")
    key: Optional[str] = Field(None, description="Musical key")

class LyricsResponse(BaseModel):
    """Response model for lyrics generation"""
    lyrics: str
    structure: Dict[str, Any]
    raw_llm_response: Optional[str] = None

class MusicStyleResponse(BaseModel):
    """Response model for music style generation"""
    suno_prompt: str
    udio_prompt: str
    technical_specs: Dict[str, Any]

class MusicLyricsService:
    """
    Service for generating music-related content using LLMs.
    """

    def __init__(self):
        self.default_model = "gpt-4" # Default to high quality for lyrics

    async def generate_lyrics(
        self, 
        request: LyricsGenerationRequest, 
        user_id: str = "system"
    ) -> LyricsResponse:
        """
        Generate song lyrics based on theme, style, and mood.
        """
        logger.info(f"Generating lyrics for theme: {request.theme}, style: {request.style}")

        # Prepare variables for the template
        variables = {
            "theme": request.theme,
            "style": request.style,
            "mood": ", ".join(request.mood),
            "length": request.length
        }

        # Add characters and shots if provided
        if request.characters:
            variables["theme"] += f" (featuring characters: {', '.join(request.characters)})"
        
        if request.shots:
            variables["theme"] += f" (integrated with shots: {', '.join(request.shots)})"

        # Use the existing template if available, otherwise construct a prompt
        template_name = "music_lyrics_generation"
        template = prompt_templates.get(template_name)
        
        if template:
            # Render template manually to avoid circular dependency or complex API calls
            prompt = template.template
            for key, value in variables.items():
                prompt = prompt.replace(f"{{{key}}}", str(value))
        else:
            # Fallback prompt if template is missing
            prompt = f"""You are a professional songwriter. Create song lyrics based on:
Theme: {variables['theme']}
Style: {variables['style']}
Mood: {variables['mood']}
Length: {variables['length']}

Provide the lyrics with clear structure (Verse, Chorus, Bridge) and meta-information.
Respond in JSON format:
{{
  "lyrics": "Full song lyrics here...",
  "structure": {{
    "bpm_guess": 120,
    "energy_level": "high|medium|low",
    "key": "C Major"
  }}
}}"""

        llm_request = LLMRequest(
            prompt=prompt,
            model=self.default_model,
            temperature=0.7
        )

        try:
            response = await generate_text(llm_request, user_id)
            
            # Parse JSON response
            try:
                # Clean response text in case LLM added markdown blocks
                clean_text = response.text.strip()
                if clean_text.startswith("```json"):
                    clean_text = clean_text[7:-3].strip()
                elif clean_text.startswith("```"):
                    clean_text = clean_text[3:-3].strip()
                
                data = json.loads(clean_text)
                return LyricsResponse(
                    lyrics=data.get("lyrics", ""),
                    structure=data.get("structure", {}),
                    raw_llm_response=response.text
                )
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse LLM response as JSON: {e}")
                # Fallback if JSON parsing fails
                return LyricsResponse(
                    lyrics=response.text,
                    structure={"error": "JSON parsing failed", "raw": response.text},
                    raw_llm_response=response.text
                )

        except Exception as e:
            logger.error(f"Error calling LLM for lyrics generation: {e}")
            raise

    async def generate_music_style(
        self, 
        request: MusicStyleRequest, 
        user_id: str = "system"
    ) -> MusicStyleResponse:
        """
        Generate precise musical style prompts for Suno/Udio.
        """
        logger.info(f"Generating music style for: {request.prompt}, style: {request.style}")

        prompt = f"""You are a music production expert. Generate precise prompts for AI music generators like Suno or Udio.
Base Request: {request.prompt}
Style: {request.style}
Mood: {', '.join(request.mood)}
Instrumentation: {', '.join(request.instrumentation) if request.instrumentation else 'Any'}
BPM: {request.bpm or 'Auto'}
Key: {request.key or 'Auto'}

Generate two versions:
1. A descriptive prompt for Suno (tags-based).
2. A descriptive prompt for Udio (natural language).

Respond in JSON format:
{{
  "suno_prompt": "tags, like: cinematic, epic, orchestral, 120bpm",
  "udio_prompt": "A cinematic and epic orchestral piece with...",
  "technical_specs": {{
    "bpm": 120,
    "key": "C Major",
    "energy": "high"
  }}
}}"""

        llm_request = LLMRequest(
            prompt=prompt,
            model=self.default_model,
            temperature=0.5
        )

        try:
            response = await generate_text(llm_request, user_id)
            
            # Parse JSON response
            try:
                clean_text = response.text.strip()
                if clean_text.startswith("```json"):
                    clean_text = clean_text[7:-3].strip()
                elif clean_text.startswith("```"):
                    clean_text = clean_text[3:-3].strip()
                
                data = json.loads(clean_text)
                return MusicStyleResponse(
                    suno_prompt=data.get("suno_prompt", ""),
                    udio_prompt=data.get("udio_prompt", ""),
                    technical_specs=data.get("technical_specs", {})
                )
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse LLM response as JSON: {e}")
                raise ValueError(f"Invalid LLM response format: {e}")

        except Exception as e:
            logger.error(f"Error calling LLM for music style generation: {e}")
            raise
