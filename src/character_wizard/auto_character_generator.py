"""
AI-Powered Character Generation System

This module implements intelligent character generation using genre-specific
templates, psychological models, and narrative coherence algorithms.
"""

import random
import uuid
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass
from enum import Enum

from .models import (
    CharacterProfile, VisualIdentity, PersonalityProfile, VoiceIdentity,
    BackstoryProfile, CoherenceAnchors, ColorPalette, CreationMethod,
    PuppetCategory, FormalityLevel, HumorStyle, AutoGenerationParams
)
from .name_generator import CharacterNameGenerator
from .archetypes import load_archetypes, ArchetypeRole
from .name_generation import NameGenerator
from .visual_generator import VisualGenerator
from .personality_generator import PersonalityGenerator
from .backstory_generator import BackstoryGenerator
from .voice_generator import VoiceGenerator
from .coherence_anchors import CoherenceAnchorsGenerator
from .quality_scorer import QualityScorer
from .utils import assign_puppet_category


class ArchetypeRole(Enum):
    """Character archetype roles"""
    HERO = "hero"
    MENTOR = "mentor"
    VILLAIN = "villain"
    ALLY = "ally"
    TRICKSTER = "trickster"
    GUARDIAN = "guardian"
    INNOCENT = "innocent"
    REBEL = "rebel"


@dataclass
class CharacterArchetype:
    """Character archetype definition"""
    role: ArchetypeRole
    name: str
    description: str
    typical_traits: List[str]
    strengths: List[str]
    flaws: List[str]
    motivations: List[str]
    fears: List[str]
    voice_style: str
    appearance_notes: str


class AutoCharacterGenerator:
    """
    AI-powered automatic character generation system

    Generates complete character profiles using:
    - Genre-specific archetypes and templates
    - Psychological trait modeling (Big Five)
    - Visual identity generation
    - Voice and dialogue patterns
    - Coherent backstory creation
    """

    def __init__(self):
        """Initialize the character generator"""
        self.archetypes = load_archetypes()
        # Initialize component generators
        self.name_gen = NameGenerator()
        self.visual_gen = VisualGenerator()
        self.personality_gen = PersonalityGenerator()
        self.backstory_gen = BackstoryGenerator()
        self.voice_gen = VoiceGenerator()
        self.coherence_gen = CoherenceAnchorsGenerator()
        self.quality_scorer = QualityScorer()

    def generate_character(self, params: AutoGenerationParams) -> CharacterProfile:
        """
        Generate complete character automatically

        Algorithm:
        1. Select appropriate archetype based on role and genre
        2. Generate name using cultural/genre context
        3. Create visual appearance based on genre conventions
        4. Generate personality using psychological models
        5. Create backstory using narrative structure templates
        6. Generate voice identity matching personality
        7. Validate internal consistency
        8. Apply genre-specific adjustments

        Args:
            params: Generation parameters (role, genre, age_range, etc.)

        Returns:
            Complete CharacterProfile object
        """
        # Step 1: Select archetype
        archetype = self._select_archetype(params.role, params.genre)

        # Step 2: Generate basic profile
        character = CharacterProfile()
        character.character_id = str(uuid.uuid4())
        character.creation_method = CreationMethod.AUTO_GENERATED
        character.genre_tags = [params.genre]
        character.style_tags = [params.style_preferences.get("art_style", "realistic")]

        # Step 3: Generate name
        character.name = self.name_gen.generate_character_name(params, archetype)

        # Step 4: Generate visual identity
        character.visual_identity = self.visual_gen.generate_visual_identity(params, archetype)

        # Step 5: Generate personality
        character.personality_profile = self.personality_gen.generate_personality(params, archetype)

        # Step 6: Generate backstory
        character.backstory_profile = self.backstory_gen.generate_backstory(params, archetype, character.personality_profile)

        # Step 7: Generate voice identity
        character.voice_identity = self.voice_gen.generate_voice_identity(character.personality_profile, archetype)

        # Step 8: Generate coherence anchors
        character.coherence_anchors = self.coherence_gen.generate_coherence_anchors(character.visual_identity)

        # Step 9: Assign puppet category
        character.puppet_category = assign_puppet_category(params.role)

        # Step 10: Calculate quality scores
        character.quality_score = self.quality_scorer.calculate_quality_score(character)
        character.consistency_score = self.quality_scorer.calculate_consistency_score(character)

        return character

    def _select_archetype(self, role: str, genre: str) -> CharacterArchetype:
        """Select appropriate archetype based on role and genre"""
        # Map role to archetype
        role_mapping = {
            "protagonist": ArchetypeRole.HERO,
            "antagonist": ArchetypeRole.VILLAIN,
            "supporting": ArchetypeRole.ALLY,
            "minor": ArchetypeRole.INNOCENT
        }

        archetype_role = role_mapping.get(role, ArchetypeRole.ALLY)

        # Get genre-specific variant if available
        genre_key = f"{genre}_{archetype_role.value}"
        if genre_key in self.archetypes:
            return self.archetypes[genre_key]

        # Fallback to base archetype
        return self.archetypes.get(archetype_role.value, self.archetypes["hero"])