"""
LLM Prompt Templates for Character Generation

This module contains all prompt templates used for AI-powered character generation.
Each template is designed to produce consistent, high-quality outputs.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

from dataclasses import dataclass
from typing import List, Optional
from enum import Enum


class PromptType(Enum):
    """Types of prompts available."""
    CHARACTER_DESCRIPTION = "character_description"
    PERSONALITY_NARRATIVE = "personality_narrative"
    BACKSTORY = "backstory"
    DIALOGUE = "dialogue"
    MOTIVATIONS = "motivations"
    FEARS = "fears"
    STRENGTHS_FLAWS = "strengths_flaws"
    RELATIONSHIPS = "relationships"
    APPEARANCE_DESCRIPTION = "appearance_description"
    VOICE_STYLE = "voice_style"


@dataclass
class PromptTemplate:
    """A prompt template with variables."""
    template: str
    description: str
    required_vars: List[str]
    optional_vars: List[str]
    system_prompt: Optional[str] = None
    max_tokens: int = 1024
    temperature: float = 0.7


# System prompt for all character generation
CHARACTER_GENERATION_SYSTEM = """You are an expert character development assistant for creative writing.
Your task is to create compelling, consistent, and authentic characters for stories.

Guidelines:
- Stay true to the character's established personality traits
- Create vivid, specific details rather than generic descriptions
- Consider the character's background and motivations
- Write in a style appropriate to the genre
- Include sensory details and emotional depth
- Be creative but maintain consistency with provided traits

Output only the requested content in your response."""


# Character Description Templates
CHARACTER_DESCRIPTION_TEMPLATE = PromptTemplate(
    template="""Create a detailed character description based on the following traits:

**Character Name:** {name}
**Archetype:** {archetype}
**Role:** {role}

**Personality Profile (Big Five Model 0-1 scale):**
- Openness: {openness} (creative, curious, open to new experiences)
- Conscientiousness: {conscientiousness} (organized, dependable, disciplined)
- Extraversion: {extraversion} (sociable, assertive, energetic)
- Agreeableness: {agreeableness} (cooperative, trusting, compassionate)
- Neuroticism: {neuroticism} (anxious, emotionally unstable)

**Primary Traits:** {primary_traits}

Please write a comprehensive character description (150-250 words) that:
1. Introduces the character's presence and demeanor
2. Describes their most notable physical features
3. Captures their personality essence
4. Hints at their deeper nature and motivations
5. Suggests how others perceive them

Genre: {genre}
Tone: {tone}""",
    description="Generate a comprehensive character description",
    required_vars=["name", "archetype", "role", "openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism", "primary_traits"],
    optional_vars=["genre", "tone"],
    system_prompt=CHARACTER_GENERATION_SYSTEM,
    max_tokens=512,
    temperature=0.7
)


# Personality Narrative Templates
PERSONALITY_NARRATIVE_TEMPLATE = PromptTemplate(
    template="""Write a personality narrative for this character that reveals their inner life:

**Character:** {name}
**Archetype:** {archetype}

**Core Traits:**
- {primary_traits}

**Strengths:** {strengths}
**Flaws:** {flaws}

**External Goal:** {external_goal}
**Internal Need:** {internal_need}
**Fears:** {fears}

Write a first-person or close third-person internal monologue (100-200 words) that:
1. Reveals their thought patterns and worldview
2. Shows how their traits manifest in their daily life
3. Demonstrates their decision-making style
4. Reveals their emotional responses under pressure
5. Hints at their deepest desires and conflicts

The narrative should feel authentic and consistent with the personality profile.""",
    description="Generate personality narrative revealing inner life",
    required_vars=["name", "archetype", "primary_traits", "strengths", "flaws", "external_goal", "internal_need", "fears"],
    optional_vars=[],
    system_prompt=CHARACTER_GENERATION_SYSTEM,
    max_tokens=512,
    temperature=0.8
)


# Backstory Templates
BACKSTORY_TEMPLATE = PromptTemplate(
    template="""Create a detailed backstory for this character:

**Character:** {name}
**Archetype:** {archetype}
**Role:** {role}

**Personality Foundation:**
- Openness: {openness}
- Conscientiousness: {conscientiousness}
- Extraversion: {extraversion}
- Agreeableness: {agreeableness}
- Neuroticism: {neuroticism}

**Values:** {values}
**Skills:** {skills}

Write a backstory (200-350 words) covering:
1. **Origin:** Where they came from, family background, early environment
2. **Key Events:** 2-3 pivotal moments that shaped who they are
3. **Formative Experiences:** How they developed their core traits
4. **Current Situation:** Where they are now and what brought them here
5. **Hidden Depths:** A secret, fear, or unresolved issue they carry

Genre context: {genre}
Make the backstory emotionally resonant and consistent with their personality profile.""",
    description="Generate comprehensive character backstory",
    required_vars=["name", "archetype", "role", "openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism", "values", "skills"],
    optional_vars=["genre"],
    system_prompt=CHARACTER_GENERATION_SYSTEM,
    max_tokens=768,
    temperature=0.8
)


# Dialogue Generation Templates
DIALOGUE_TEMPLATE = PromptTemplate(
    template="""Write a dialogue sample for this character:

**Character:** {name}
**Archetype:** {archetype}

**Personality Profile:**
- Extraversion: {extraversion} | Agreeableness: {agreeableness}
- Neuroticism: {neuroticism} | Openness: {openness}

**Communication Style:** {communication_style}

**Current Situation:** {situation}
**Emotional State:** {emotional_state}

Write a natural dialogue (80-150 words) that:
1. Reflects their unique voice and speech patterns
2. Shows their emotional state and stress response
3. Demonstrates their conflict style ({conflict_style})
4. Reveals character through word choice and rhythm
5. Feels authentic to their personality traits

Write ONLY the dialogue, no narration or stage directions.""",
    description="Generate character dialogue sample",
    required_vars=["name", "archetype", "extraversion", "agreeableness", "neuroticism", "openness", "communication_style", "situation", "emotional_state", "conflict_style"],
    optional_vars=[],
    system_prompt="You are an expert dialogue writer. Create authentic, character-revealing dialogue.",
    max_tokens=384,
    temperature=0.75
)


# Motivation Generation
MOTIVATIONS_TEMPLATE = PromptTemplate(
    template="""Analyze and elaborate on this character's motivations:

**Character:** {name}
**Archetype:** {archetype}

**Profile:**
- External Goal: {external_goal}
- Internal Need: {internal_need}
- Values: {values}
- Fears: {fears}

Provide:
1. **Primary Motivation**: Their driving force (2-3 sentences)
2. **Underlying Need**: What they truly need vs. what they want (2-3 sentences)
3. **Motivation Conflicts**: Internal tensions between desires (2-3 sentences)
4. **How Motivation Manifests**: How this drives their actions and choices (2-3 sentences)

Keep analysis grounded in their personality traits and archetype.""",
    description="Generate motivation analysis",
    required_vars=["name", "archetype", "external_goal", "internal_need", "values", "fears"],
    optional_vars=[],
    system_prompt="You are an expert in character psychology and motivation.",
    max_tokens=512,
    temperature=0.7
)


# Appearance Description
APPEARANCE_TEMPLATE = PromptTemplate(
    template="""Write a visual description of this character:

**Character:** {name}
**Archetype:** {archetype}
**Role:** {role}

**Physical Attributes:**
- Age: {age}
- Gender: {gender}
- Build: {build}
- Height: {height}

**Visual Style:**
- Clothing Style: {clothing_style}
- Color Palette: {color_palette}
- Accessories: {accessories}

**Personality Influence:** The character's personality ({personality_summary}) 
should be reflected in their appearance choices.

Write a vivid physical description (100-200 words) covering:
1. Overall impression and presence
2. Face and distinctive features
3. Body language and posture
4. Clothing and accessories details
5. How their appearance reflects their personality

Avoid overly generic descriptions - include specific, memorable details.""",
    description="Generate appearance description",
    required_vars=["name", "archetype", "role", "age", "gender", "build", "height", "clothing_style", "color_palette", "accessories", "personality_summary"],
    optional_vars=[],
    system_prompt="You are an expert visual storyteller. Create vivid, character-revealing descriptions.",
    max_tokens=512,
    temperature=0.7
)


# Voice and Speech Style
VOICE_TEMPLATE = PromptTemplate(
    template="""Define this character's voice and speech style:

**Character:** {name}
**Archetype:** {archetype}

**Personality:**
- Extraversion: {extraversion}
- Agreeableness: {agreeableness}
- Conscientiousness: {conscientiousness}
- Openness: {openness}
- Neuroticism: {neuroticism}

**Background:** {background}

Define their voice (100-150 words) covering:
1. **Vocabulary Level**: Formal, casual, technical, simple?
2. **Sentence Structure**: Long and complex or short and direct?
3. **Speech Patterns**: Any distinctive verbal habits?
4. **Emotional Expression**: How do they express (or suppress) emotions?
5. **Characteristic Phrases**: Any recurring expressions or quirks?

Provide concrete examples of how they would express different ideas.""",
    description="Define character voice and speech style",
    required_vars=["name", "archetype", "extraversion", "agreeableness", "conscientiousness", "openness", "neuroticism", "background"],
    optional_vars=[],
    system_prompt="You are an expert in character voice and dialogue development.",
    max_tokens=512,
    temperature=0.7
)


# Template Registry
PROMPT_TEMPLATES: dict[PromptType, PromptTemplate] = {
    PromptType.CHARACTER_DESCRIPTION: CHARACTER_DESCRIPTION_TEMPLATE,
    PromptType.PERSONALITY_NARRATIVE: PERSONALITY_NARRATIVE_TEMPLATE,
    PromptType.BACKSTORY: BACKSTORY_TEMPLATE,
    PromptType.DIALOGUE: DIALOGUE_TEMPLATE,
    PromptType.MOTIVATIONS: MOTIVATIONS_TEMPLATE,
    PromptType.APPEARANCE_DESCRIPTION: APPEARANCE_TEMPLATE,
    PromptType.VOICE_STYLE: VOICE_TEMPLATE,
}


def get_prompt(template: PromptType, **kwargs) -> str:
    """
    Get a filled-in prompt from a template.
    
    Args:
        template: The type of prompt to generate
        **kwargs: Variables to fill in the template
        
    Returns:
        Filled prompt string
        
    Raises:
        ValueError: If required variables are missing
    """
    prompt_template = PROMPT_TEMPLATES.get(template)
    if not prompt_template:
        raise ValueError(f"Unknown prompt type: {template}")
    
    # Check required variables
    for var in prompt_template.required_vars:
        if var not in kwargs:
            raise ValueError(f"Missing required variable: {var}")
    
    # Fill in template
    return prompt_template.template.format(**kwargs)


def get_prompt_with_fallbacks(
    template: PromptType,
    required_only: bool = False,
    **kwargs
) -> str:
    """
    Get a prompt with fallback values for missing variables.
    
    Args:
        template: Type of prompt
        required_only: Only use required variables
        **kwargs: Variables (some may be missing)
        
    Returns:
        Filled prompt string with defaults for missing optional vars
    """
    prompt_template = PROMPT_TEMPLATES.get(template)
    if not prompt_template:
        raise ValueError(f"Unknown prompt type: {template}")
    
    # Build context with defaults
    context = {}
    
    # Add required variables
    for var in prompt_template.required_vars:
        context[var] = kwargs.get(var, f"[{var.upper()}]")
    
    # Add optional variables if not required_only
    if not required_only:
        for var in prompt_template.optional_vars:
            context[var] = kwargs.get(var, "")
    
    return prompt_template.template.format(**context)


def get_system_prompt(template: PromptType) -> str:
    """Get the system prompt for a template type."""
    prompt_template = PROMPT_TEMPLATES.get(template)
    return prompt_template.system_prompt or CHARACTER_GENERATION_SYSTEM

