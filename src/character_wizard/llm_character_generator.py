"""
LLM Character Generator - AI-Powered Character Generation

This module provides AI-powered character generation capabilities including:
- Character description generation
- Personality narrative creation
- Backstory elaboration
- Dialogue sample generation

Author: StoryCore-Engine Team
Version: 1.0.0
"""

import asyncio
import logging
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from enum import Enum

from .llm_client import (
    LLMManager, GenerationConfig, Message, MessageRole,
    LLMProvider, GenerationResult
)
from .llm_prompts import (
    PromptType, get_prompt, get_system_prompt, PROMPT_TEMPLATES
)

logger = logging.getLogger(__name__)


class CharacterGenerationError(Exception):
    """Exception raised for character generation errors."""
    pass


@dataclass
class CharacterContext:
    """Complete context for character generation."""
    name: str
    archetype: str
    role: str
    
    # Big Five Traits (0.0-1.0)
    openness: float = 0.5
    conscientiousness: float = 0.5
    extraversion: float = 0.5
    agreeableness: float = 0.5
    neuroticism: float = 0.5
    
    # Derived traits
    primary_traits: List[str] = field(default_factory=list)
    strengths: List[str] = field(default_factory=list)
    flaws: List[str] = field(default_factory=list)
    
    # Goals and motivations
    external_goal: str = ""
    internal_need: str = ""
    fears: List[str] = field(default_factory=list)
    values: List[str] = field(default_factory=list)
    
    # Background
    skills: List[str] = field(default_factory=list)
    background: str = ""
    age: str = "adult"
    gender: str = ""
    build: str = ""
    height: str = ""
    
    # Style
    clothing_style: str = ""
    color_palette: str = ""
    accessories: List[str] = field(default_factory=list)
    
    # Behavior patterns
    communication_style: str = ""
    conflict_style: str = ""
    stress_response: str = ""
    
    # Context
    genre: str = "modern"
    tone: str = "neutral"
    situation: str = ""
    emotional_state: str = ""
    
    def get_trait_dict(self) -> Dict[str, float]:
        """Get Big Five traits as dictionary."""
        return {
            "openness": self.openness,
            "conscientiousness": self.conscientiousness,
            "extraversion": self.extraversion,
            "agreeableness": self.agreeableness,
            "neuroticism": self.neuroticism
        }
    
    def get_personality_summary(self) -> str:
        """Get a brief personality summary."""
        traits = []
        if self.openness > 0.7: traits.append("open and curious")
        elif self.openness < 0.3: traits.append("traditional and cautious")
        
        if self.conscientiousness > 0.7: traits.append("organized and disciplined")
        elif self.conscientiousness < 0.3: traits.append("flexible and spontaneous")
        
        if self.extraversion > 0.7: traits.append("outgoing and energetic")
        elif self.extraversion < 0.3: traits.append("reserved and reflective")
        
        if self.agreeableness > 0.7: traits.append("cooperative and warm")
        elif self.agreeableness < 0.3: traits.append("competitive and direct")
        
        if self.neuroticism > 0.7: traits.append("sensitive and emotional")
        elif self.neuroticism < 0.3: traits.append("calm and resilient")
        
        return ", ".join(traits) if traits else "balanced"


@dataclass
class CharacterGenerationResult:
    """Result of character generation."""
    description: str = ""
    personality_narrative: str = ""
    backstory: str = ""
    dialogue: str = ""
    motivations: str = ""
    appearance_description: str = ""
    voice_style: str = ""
    
    # Metadata
    success: bool = True
    errors: List[str] = field(default_factory=list)
    generation_time: float = 0.0
    provider_used: str = ""
    model_used: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "description": self.description,
            "personality_narrative": self.personality_narrative,
            "backstory": self.backstory,
            "dialogue": self.dialogue,
            "motivations": self.motivations,
            "appearance_description": self.appearance_description,
            "voice_style": self.voice_style,
            "success": self.success,
            "errors": self.errors,
            "generation_time": self.generation_time,
            "provider_used": self.provider_used,
            "model_used": self.model_used
        }


class LLMCharacterGenerator:
    """
    AI-powered character generator.
    
    Uses LLM to generate rich, contextually appropriate character content
    based on personality profiles and archetypes.
    """

    def __init__(
        self,
        llm_manager: Optional[LLMManager] = None,
        default_provider: LLMProvider = LLMProvider.OLLAMA,
        default_model: str = "llama3.2"
    ):
        """
        Initialize the character generator.
        
        Args:
            llm_manager: LLM manager instance (creates default if None)
            default_provider: Default LLM provider to use
            default_model: Default model name
        """
        self.llm = llm_manager or LLMManager()
        self.default_provider = default_provider
        self.default_model = default_model
        
        # Track usage stats
        self._total_generations = 0
        self._total_errors = 0
        self._total_time = 0.0

    async def generate_complete_character(
        self,
        context: CharacterContext,
        provider: Optional[LLMProvider] = None,
        model: Optional[str] = None,
        generate_all: bool = True
    ) -> CharacterGenerationResult:
        """
        Generate all character content.
        
        Args:
            context: Character context with all relevant information
            provider: LLM provider to use
            model: Model name
            generate_all: Whether to generate all content types
            
        Returns:
            CharacterGenerationResult with all generated content
        """
        import time
        start_time = time.time()
        result = CharacterGenerationResult()
        
        try:
            # Get LLM client
            client = self.llm.get_client(provider or self.default_provider, model or self.default_model)
            
            if not client.is_connected:
                await client.connect()
            
            result.provider_used = client.provider.value if hasattr(client.provider, 'value') else str(client.provider)
            result.model_used = client.model
            
            if generate_all:
                # Generate all content in parallel
                tasks = [
                    self._generate_description(context, client),
                    self._generate_personality_narrative(context, client),
                    self._generate_backstory(context, client),
                    self._generate_dialogue(context, client),
                    self._generate_motivations(context, client),
                    self._generate_appearance_description(context, client),
                    self._generate_voice_style(context, client),
                ]
                
                results = await asyncio.gather(*tasks, return_exceptions=True)
                
                # Process results
                content_types = [
                    "description", "personality_narrative", "backstory",
                    "dialogue", "motivations", "appearance_description", "voice_style"
                ]
                
                for i, content in enumerate(results):
                    if isinstance(content, Exception):
                        result.errors.append(f"{content_types[i]}: {str(content)}")
                    else:
                        setattr(result, content_types[i], content)
            
            else:
                # Generate only description
                result.description = await self._generate_description(context, client)
            
            result.success = len(result.errors) == 0
            
        except Exception as e:
            logger.error(f"Character generation failed: {e}")
            result.success = False
            result.errors.append(f"Generation failed: {str(e)}")
        
        finally:
            result.generation_time = time.time() - start_time
            self._total_generations += 1
            self._total_time += result.generation_time
            if not result.success:
                self._total_errors += 1
        
        return result

    async def generate_description(
        self,
        context: CharacterContext,
        provider: Optional[LLMProvider] = None,
        model: Optional[str] = None
    ) -> str:
        """Generate character description."""
        client = self.llm.get_client(provider or self.default_provider, model or self.default_model)
        
        if not client.is_connected:
            await client.connect()
        
        return await self._generate_description(context, client)

    async def _generate_description(
        self,
        context: CharacterContext,
        client
    ) -> str:
        """Internal description generation."""
        prompt = get_prompt(
            PromptType.CHARACTER_DESCRIPTION,
            name=context.name,
            archetype=context.archetype,
            role=context.role,
            openness=context.openness,
            conscientiousness=context.conscientiousness,
            extraversion=context.extraversion,
            agreeableness=context.agreeableness,
            neuroticism=context.neuroticism,
            primary_traits=", ".join(context.primary_traits) if context.primary_traits else "balanced traits",
            genre=context.genre,
            tone=context.tone
        )
        
        system_prompt = get_system_prompt(PromptType.CHARACTER_DESCRIPTION)
        
        result = await client.generate(prompt, system_prompt)
        
        if result.success:
            return result.text.strip()
        else:
            raise CharacterGenerationError(f"Failed to generate description: {result.text}")

    async def _generate_personality_narrative(
        self,
        context: CharacterContext,
        client
    ) -> str:
        """Internal personality narrative generation."""
        prompt = get_prompt(
            PromptType.PERSONALITY_NARRATIVE,
            name=context.name,
            archetype=context.archetype,
            primary_traits=", ".join(context.primary_traits) if context.primary_traits else "balanced traits",
            strengths=", ".join(context.strengths) if context.strengths else "resilience",
            flaws=", ".join(context.flaws) if context.flaws else "self-doubt",
            external_goal=context.external_goal or "finding purpose",
            internal_need=context.internal_need or "self-acceptance",
            fears=", ".join(context.fears) if context.fears else "failure"
        )
        
        result = await client.generate(prompt)
        
        if result.success:
            return result.text.strip()
        else:
            raise CharacterGenerationError(f"Failed to generate narrative: {result.text}")

    async def _generate_backstory(
        self,
        context: CharacterContext,
        client
    ) -> str:
        """Internal backstory generation."""
        prompt = get_prompt(
            PromptType.BACKSTORY,
            name=context.name,
            archetype=context.archetype,
            role=context.role,
            openness=context.openness,
            conscientiousness=context.conscientiousness,
            extraversion=context.extraversion,
            agreeableness=context.agreeableness,
            neuroticism=context.neuroticism,
            values=", ".join(context.values) if context.values else "growth",
            skills=", ".join(context.skills) if context.skills else "adaptability",
            genre=context.genre
        )
        
        result = await client.generate(prompt)
        
        if result.success:
            return result.text.strip()
        else:
            raise CharacterGenerationError(f"Failed to generate backstory: {result.text}")

    async def _generate_dialogue(
        self,
        context: CharacterContext,
        client
    ) -> str:
        """Internal dialogue generation."""
        prompt = get_prompt(
            PromptType.DIALOGUE,
            name=context.name,
            archetype=context.archetype,
            extraversion=context.extraversion,
            agreeableness=context.agreeableness,
            neuroticism=context.neuroticism,
            openness=context.openness,
            communication_style=context.communication_style or "direct and thoughtful",
            situation=context.situation or "a quiet moment of reflection",
            emotional_state=context.emotional_state or "thoughtful",
            conflict_style=context.conflict_style or "collaborative"
        )
        
        result = await client.generate(prompt)
        
        if result.success:
            return result.text.strip()
        else:
            raise CharacterGenerationError(f"Failed to generate dialogue: {result.text}")

    async def _generate_motivations(
        self,
        context: CharacterContext,
        client
    ) -> str:
        """Internal motivations generation."""
        prompt = get_prompt(
            PromptType.MOTIVATIONS,
            name=context.name,
            archetype=context.archetype,
            external_goal=context.external_goal or "achieving their goals",
            internal_need=context.internal_need or "finding peace",
            values=", ".join(context.values) if context.values else "growth",
            fears=", ".join(context.fears) if context.fears else "failure"
        )
        
        result = await client.generate(prompt)
        
        if result.success:
            return result.text.strip()
        else:
            raise CharacterGenerationError(f"Failed to generate motivations: {result.text}")

    async def _generate_appearance_description(
        self,
        context: CharacterContext,
        client
    ) -> str:
        """Internal appearance description generation."""
        prompt = get_prompt(
            PromptType.APPEARANCE_DESCRIPTION,
            name=context.name,
            archetype=context.archetype,
            role=context.role,
            age=context.age,
            gender=context.gender,
            build=context.build,
            height=context.height,
            clothing_style=context.clothing_style or "casual",
            color_palette=context.color_palette or "neutral",
            accessories=", ".join(context.accessories) if context.accessories else "minimal",
            personality_summary=context.get_personality_summary()
        )
        
        result = await client.generate(prompt)
        
        if result.success:
            return result.text.strip()
        else:
            raise CharacterGenerationError(f"Failed to generate appearance: {result.text}")

    async def _generate_voice_style(
        self,
        context: CharacterContext,
        client
    ) -> str:
        """Internal voice style generation."""
        prompt = get_prompt(
            PromptType.VOICE_STYLE,
            name=context.name,
            archetype=context.archetype,
            extraversion=context.extraversion,
            agreeableness=context.agreeableness,
            conscientiousness=context.conscientiousness,
            openness=context.openness,
            neuroticism=context.neuroticism,
            background=context.background or "grew up in a supportive environment"
        )
        
        result = await client.generate(prompt)
        
        if result.success:
            return result.text.strip()
        else:
            raise CharacterGenerationError(f"Failed to generate voice: {result.text}")

    def get_stats(self) -> Dict[str, Any]:
        """Get generation statistics."""
        return {
            "total_generations": self._total_generations,
            "total_errors": self._total_errors,
            "total_time": self._total_time,
            "average_time": self._total_time / max(1, self._total_generations),
            "success_rate": 1.0 - (self._total_errors / max(1, self._total_generations))
        }


# Convenience function
async def generate_character_description(
    context: CharacterContext,
    provider: Optional[LLMProvider] = None,
    model: Optional[str] = None
) -> str:
    """
    Generate a character description.
    
    Args:
        context: Character context with personality and traits
        provider: LLM provider to use
        model: Model name
        
    Returns:
        Generated character description
    """
    generator = LLMCharacterGenerator()
    result = await generator.generate_description(context, provider, model)
    return result


async def generate_full_character(
    context: CharacterContext,
    provider: Optional[LLMProvider] = None,
    model: Optional[str] = None
) -> CharacterGenerationResult:
    """
    Generate complete character content.
    
    Args:
        context: Character context with personality and traits
        provider: LLM provider to use
        model: Model name
        
    Returns:
        Complete character generation result with all content
    """
    generator = LLMCharacterGenerator()
    return await generator.generate_complete_character(context, provider, model)

