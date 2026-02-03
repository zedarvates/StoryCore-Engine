"""
AI Character Engine - Advanced character generation with personality traits.

This module provides AI-powered character generation capabilities including
personality traits, appearance generation, and character consistency management.
"""

import asyncio
import logging
import random
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Any, Optional, Tuple, Union
from pathlib import Path
import json
import time
from datetime import datetime
import uuid

try:
    from .circuit_breaker import CircuitBreaker, CircuitBreakerConfig
    from .ai_enhancement_engine import AIEnhancementEngine, AIConfig
except ImportError:
    from circuit_breaker import CircuitBreaker, CircuitBreakerConfig
    from ai_enhancement_engine import AIEnhancementEngine, AIConfig


class CharacterArchetype(Enum):
    """Character archetype types for personality generation."""
    HERO = "hero"
    VILLAIN = "villain"
    MENTOR = "mentor"
    COMIC_RELIEF = "comic_relief"
    SIDEKICK = "sidekick"
    ANTAGONIST = "antagonist"
    PROTAGONIST = "protagonist"
    TRANSFORMER = "transformer"


class PersonalityTrait(Enum):
    """
    Core personality traits for character generation.
    
    Based on the Big Five (OCEAN) model plus additional narrative-relevant traits.
    Each trait is scored from 0.0 to 1.0 where:
    - 0.0 = Low/absent expression of the trait
    - 0.5 = Moderate/neutral expression
    - 1.0 = High/strong expression of the trait
    """
    # Big Five Personality Traits (OCEAN Model)
    OPENNESS = "openness"              # Open to experience vs. conventional
    CONSCIENTIOUSNESS = "conscientiousness"  # Organized vs. spontaneous
    EXTRAVERSION = "extraversion"      # Outgoing vs. reserved
    AGREEABLENESS = "agreeableness"    # Cooperative vs. antagonistic
    NEUROTICISM = "neuroticism"        # Emotional vs. stable
    
    # Additional Narrative Traits
    COURAGE = "courage"                # Brave vs. timid
    INTELLIGENCE = "intelligence"      # Analytical vs. instinctive
    CHARISMA = "charisma"              # Persuasive vs. quiet
    HUMILITY = "humility"              # Modest vs. arrogant
    AMBITION = "ambition"              # Driven vs. content
    LOYALTY = "loyalty"                # Faithful vs. fickle
    CUNNING = "cunning"                # Shrewd vs. naive
    COMPASSION = "compassion"          # Empathetic vs. detached
    HONESTY = "honesty"                # Truthful vs. deceptive
    PATIENCE = "patience"              # Tolerant vs. impatient
    TEMPER = "temper"                  # Calm vs. volatile
    GENEROSITY = "generosity"          # Giving vs. selfish
    INDEPENDENCE = "independence"      # Self-reliant vs. dependent


# Trait categories for organization and correlation analysis
TRAIT_CATEGORIES = {
    'big_five': [
        PersonalityTrait.OPENNESS,
        PersonalityTrait.CONSCIENTIOUSNESS,
        PersonalityTrait.EXTRAVERSION,
        PersonalityTrait.AGREEABLENESS,
        PersonalityTrait.NEUROTICISM
    ],
    'moral': [
        PersonalityTrait.HONESTY,
        PersonalityTrait.LOYALTY,
        PersonalityTrait.COMPASSION,
        PersonalityTrait.GENEROSITY,
        PersonalityTrait.HUMILITY
    ],
    'action': [
        PersonalityTrait.COURAGE,
        PersonalityTrait.AMBITION,
        PersonalityTrait.CONSCIENTIOUSNESS,
        PersonalityTrait.PATIENCE,
        PersonalityTrait.TEMPER
    ],
    'social': [
        PersonalityTrait.EXTRAVERSION,
        PersonalityTrait.CHARISMA,
        PersonalityTrait.AGREEABLENESS,
        PersonalityTrait.COMPASSION,
        PersonalityTrait.INDEPENDENCE
    ],
    'cognitive': [
        PersonalityTrait.INTELLIGENCE,
        PersonalityTrait.OPENNESS,
        PersonalityTrait.CUNNING,
        PersonalityTrait.PATIENCE,
        PersonalityTrait.HONESTY
    ]
}


# Trait correlations: positive correlations (high in one = high in other)
TRAIT_CORRELATIONS = {
    # Positive correlations (trait -> [correlated traits])
    PersonalityTrait.OPENNESS: [PersonalityTrait.INTELLIGENCE, PersonalityTrait.CREATIVITY],
    PersonalityTrait.CONSCIENTIOUSNESS: [PersonalityTrait.HONESTY, PersonalityTrait.AMBITION],
    PersonalityTrait.EXTRAVERSION: [PersonalityTrait.CHARISMA, PersonalityTrait.GENEROSITY],
    PersonalityTrait.AGREEABLENESS: [PersonalityTrait.COMPASSION, PersonalityTrait.LOYALTY],
    PersonalityTrait.NEUROTICISM: [PersonalityTrait.TEMPER, PersonalityTrait.ANXIETY],
    PersonalityTrait.COURAGE: [PersonalityTrait.EXTRAVERSION, PersonalityTrait.AMBITION],
    PersonalityTrait.INTELLIGENCE: [PersonalityTrait.OPENNESS, PersonalityTrait.PATIENCE],
    PersonalityTrait.CHARISMA: [PersonalityTrait.EXTRAVERSION, PersonalityTrait.AGREEABLENESS],
    PersonalityTrait.HUMILITY: [PersonalityTrait.AGREEABLENESS, PersonalityTrait.COMPASSION],
    PersonalityTrait.AMBITION: [PersonalityTrait.CONSCIENTIOUSNESS, PersonalityTrait.COURAGE],
    PersonalityTrait.LOYALTY: [PersonalityTrait.AGREEABLENESS, PersonalityTrait.HONESTY],
    PersonalityTrait.CUNNING: [PersonalityTrait.INTELLIGENCE, PersonalityTrait.NEUROTICISM],
    PersonalityTrait.COMPASSION: [PersonalityTrait.AGREEABLENESS, PersonalityTrait.GENEROSITY],
    PersonalityTrait.HONESTY: [PersonalityTrait.LOYALTY, PersonalityTrait.CONSCIENTIOUSNESS],
    PersonalityTrait.PATIENCE: [PersonalityTrait.AGREEABLENESS, PersonalityTrait.CONSCIENTIOUSNESS],
    PersonalityTrait.TEMPER: [PersonalityTrait.NEUROTICISM, PersonalityTrait.COURAGE],
    PersonalityTrait.GENEROSITY: [PersonalityTrait.COMPASSION, PersonalityTrait.EXTRAVERSION],
    PersonalityTrait.INDEPENDENCE: [PersonalityTrait.OPENNESS, PersonalityTrait.COURAGE],
}

# Contradictory traits (high in one = low in other)
TRAIT_CONTRADICTIONS = {
    PersonalityTrait.HONESTY: [PersonalityTrait.CUNNING],
    PersonalityTrait.CUNNING: [PersonalityTrait.HONESTY],
    PersonalityTrait.HUMILITY: [PersonalityTrait.AMBITION, PersonalityTrait.CHARISMA],
    PersonalityTrait.AMBITION: [PersonalityTrait.HUMILITY],
    PersonalityTrait.LOYALTY: [PersonalityTrait.INDEPENDENCE],
    PersonalityTrait.INDEPENDENCE: [PersonalityTrait.LOYALTY],
    PersonalityTrait.PATIENCE: [PersonalityTrait.TEMPER],
    PersonalityTrait.TEMPER: [PersonalityTrait.PATIENCE],
    PersonalityTrait.COMPASSION: [PersonalityTrait.CUNNING],
    PersonalityTrait.CUNNING: [PersonalityTrait.COMPASSION],
}

# These are placeholder traits that need to be added to the enum
try:
    PersonalityTrait.CREATIVITY
except AttributeError:
    pass  # Will be handled in trait normalization


class TraitCorrelationError(Exception):
    """Exception raised when trait correlation logic fails."""
    pass


class TraitNormalizationError(Exception):
    """Exception raised when trait normalization fails."""
    pass


class BehaviorPattern(Enum):
    """
    Character behavior patterns that emerge from trait combinations.
    
    These patterns describe how characters typically act in various situations
    based on their underlying personality traits.
    """
    # Heroic behaviors
    RISES_TO_CHALLENGE = "rises_to_challenge"  # Courage + Responsibility
    PROTECTS_WEAK = "protects_weak"  # Compassion + Courage
    LEADS_BY_EXAMPLE = "leads_by_example"  # Extraversion + Integrity
    
    # Villainous behaviors
    MANIPULATES_OTHERS = "manipulates_others"  # Cunning + Low Agreeableness
    SEEKS_POWER = "seeks_power"  # Ambition + Ruthlessness
    EXPLOITS_WEAKNESS = "exploits_weakness"  # Cunning + Cruelty
    
    # Mentor behaviors
    PATIENTLY_GUIDES = "patiently_guides"  # Patience + Wisdom
    OBSERVES_BEFORE_ACTING = "observes_before_acting"  # Caution + Intelligence
    SHARES_KNOWLEDGE = "shares_knowledge"  # Generosity + Intelligence
    
    # Comic relief behaviors
    MAKES_LIGHT_OF_DANGER = "makes_light_of_danger"  # Humor + Low Neuroticism
    BREAKS_TENSION = "breaks_tension"  # Social awareness + Humor
    UNINTENTIONALLY_HUMOROUS = "unintentionally_humorous"  # Awkwardness + Honesty
    
    # Sidekick behaviors
    LOYALTY_UNWAVERING = "loyalty_unwavering"  # Loyalty + Dependability
    SUPPORTS_LEADER = "supports_leader"  # Agreeableness + Respect
    BRAVE_IN_SECRET = "brave_in_secret"  # Hidden courage + Modesty
    
    # Antagonist behaviors
    CALCULATING_PLAN = "calculating_plan"  # Intelligence + Patience
    DESTROYS_OPPOSITION = "destroys_opposition"  # Ruthlessness + Power
    SHADOWS_RIVALS = "shadows_rivals"  # Observation + Patience
    
    # Protagonist behaviors
    SEEKS_ADVENTURE = "seeks_adventure"  # Openness + Curiosity
    GROWS_THROUGH_TRIALS = "grows_through_trials"  # Resilience + Learning
    FINDS_ALLIES = "finds_allies"  # Social skills + Charisma
    
    # Transformer behaviors
    ADAPTS_QUICKLY = "adapts_quickly"  # Flexibility + Intelligence
    QUESTION_NORMS = "question_norms"  # Openness + Independence
    TRANSFORMS_SITUATIONS = "transforms_situations"  # Creativity + Action


class StressResponse(Enum):
    """How characters respond to stress and pressure."""
    CONFRONTS = "confronts"    # Face problems directly
    AVOIDS = "avoids"          # Escape or ignore
    SEEKS_SUPPORT = "seeks_support"  # Look to others for help
    RATIONALIZES = "rationalizes"    # Find logical solutions
    EMOTIONAL_OUTBURST = "emotional_outburst"  # Express feelings strongly
    WITHDRAWS = "withdraws"    # Go inward, become quiet
    DEFLECTS = "deflects"      # Use humor or distraction
    BECOMES_DETERMINED = "becomes_determined"  # Get more focused


class ConflictStyle(Enum):
    """How characters handle interpersonal conflict."""
    DIRECT = "direct"          # Address conflict head-on
    DIPLOMATIC = "diplomatic"  # Find compromise
    AGGRESSIVE = "aggressive"  # Attack or dominate
    PASSIVE_AGGRESSIVE = "passive_aggressive"  # Indirect resistance
    AVOIDANT = "avoidant"      # Sidestep or change subject
    COLLABORATIVE = "collaborative"  # Work together to resolve
    SUBMISSIVE = "submissive"  # Yield to others
    COMPETITIVE = "competitive"  # Win at all costs


class DecisionMakingStyle(Enum):
    """How characters make decisions."""
    ANALYTICAL = "analytical"  # Weigh all options carefully
    INTUITIVE = "intuitive"    # Go with gut feeling
    SPONTANEOUS = "spontaneous"  # Decide quickly, act now
    CAUTIOUS = "cautious"      # Consider all consequences
    AUTHORITATIVE = "authoritative"  # Decide based on authority/role
    CONSENSUAL = "consensual"  # Seek group input
    EMOTIONAL = "emotional"    # Decide based on feelings
    PRINCIPLED = "principled"  # Based on values/ethics


class EmotionalExpression(Enum):
    """How openly characters express emotions."""
    RESERVED = "reserved"      # Keep emotions private
    EXPRESSIVE = "expressive"  # Show emotions freely
    CONTROLLED = "controlled"  # Moderate emotional display
    INTENSE = "intense"        # Strong emotional expressions
    VARIABLE = "variable"      # Depends on context
    SUPPRESSED = "suppressed"  # Hide true feelings


class SocialPreference(Enum):
    """Character preferences for social interaction."""
    EXTRAVERTED = "extraverted"    # Seek social interaction
    INTROVERTED = "introverted"    # Prefer solitude
    SITUATIONAL = "situational"    # Depends on context
    SELECTIVE = "selective"        # Few close relationships
    NETWORKS = "networks"          # Many acquaintances
    PROTECTS_SPACE = "protects_space"  # Need personal space


# ============================================================================
# Behavior Pattern Templates by Archetype
# ============================================================================

ARCHETYPE_BEHAVIOR_PATTERNS = {
    CharacterArchetype.HERO: {
        'primary_behaviors': [
            BehaviorPattern.RISES_TO_CHALLENGE,
            BehaviorPattern.PROTECTS_WEAK,
            BehaviorPattern.LEADS_BY_EXAMPLE
        ],
        'stress_response': StressResponse.CONFRONTS,
        'conflict_style': ConflictStyle.DIRECT,
        'decision_making': DecisionMakingStyle.INTUITIVE,
        'emotional_expression': EmotionalExpression.CONTROLLED,
        'social_preference': SocialPreference.EXTRAVERTED,
        'typical_dialogue_patterns': [
            "We have to try",
            "I won't let anyone get hurt",
            "Together we can do this"
        ],
        'decision_approach': "Leads with courage, inspires others through action"
    },
    CharacterArchetype.VILLAIN: {
        'primary_behaviors': [
            BehaviorPattern.MANIPULATES_OTHERS,
            BehaviorPattern.SEEKS_POWER,
            BehaviorPattern.EXPLOITS_WEAKNESS
        ],
        'stress_response': StressResponse.BECOMES_DETERMINED,
        'conflict_style': ConflictStyle.AGGRESSIVE,
        'decision_making': DecisionMakingStyle.ANALYTICAL,
        'emotional_expression': EmotionalExpression.SUPPRESSED,
        'social_preference': SocialPreference.SELECTIVE,
        'typical_dialogue_patterns': [
            "You are powerless against me",
            "Everyone has a price",
            "I will have what I want"
        ],
        'decision_approach': "Calculates advantage, exploits others' weaknesses"
    },
    CharacterArchetype.MENTOR: {
        'primary_behaviors': [
            BehaviorPattern.PATIENTLY_GUIDES,
            BehaviorPattern.OBSERVES_BEFORE_ACTING,
            BehaviorPattern.SHARES_KNOWLEDGE
        ],
        'stress_response': StressResponse.RATIONALIZES,
        'conflict_style': ConflictStyle.DIPLOMATIC,
        'decision_making': DecisionMakingStyle.ANALYTICAL,
        'emotional_expression': EmotionalExpression.RESERVED,
        'social_preference': SocialPreference.SITUATIONAL,
        'typical_dialogue_patterns': [
            "Patience, young one",
            "The answer lies within",
            "Trust in the process"
        ],
        'decision_approach': "Observes long-term, guides others to discover solutions"
    },
    CharacterArchetype.COMIC_RELIEF: {
        'primary_behaviors': [
            BehaviorPattern.MAKES_LIGHT_OF_DANGER,
            BehaviorPattern.BREAKS_TENSION,
            BehaviorPattern.UNINTENTIONALLY_HUMOROUS
        ],
        'stress_response': StressResponse.DEFLECTS,
        'conflict_style': ConflictStyle.AVOIDANT,
        'decision_making': DecisionMakingStyle.SPONTANEOUS,
        'emotional_expression': EmotionalExpression.EXPRESSIVE,
        'social_preference': SocialPreference.EXTRAVERTED,
        'typical_dialogue_patterns': [
            "Well, this is awkward",
            "Did someone say snacks?",
            "I think I left the oven on"
        ],
        'decision_approach': "Impulsive, uses humor to navigate situations"
    },
    CharacterArchetype.SIDEKICK: {
        'primary_behaviors': [
            BehaviorPattern.LOYALTY_UNWAVERING,
            BehaviorPattern.SUPPORTS_LEADER,
            BehaviorPattern.BRAVE_IN_SECRET
        ],
        'stress_response': StressResponse.SEEKS_SUPPORT,
        'conflict_style': ConflictStyle.SUBMISSIVE,
        'decision_making': DecisionMakingStyle.CONSENSUAL,
        'emotional_expression': EmotionalExpression.CONTROLLED,
        'social_preference': SocialPreference.SELECTIVE,
        'typical_dialogue_patterns': [
            "I'm with you",
            "What do we do next?",
            "I'd follow you anywhere"
        ],
        'decision_approach': "Supports others, loyal to a fault"
    },
    CharacterArchetype.ANTAGONIST: {
        'primary_behaviors': [
            BehaviorPattern.CALCULATING_PLAN,
            BehaviorPattern.DESTROYS_OPPOSITION,
            BehaviorPattern.SHADOWS_RIVALS
        ],
        'stress_response': StressResponse.RATIONALIZES,
        'conflict_style': ConflictStyle.PASSIVE_AGGRESSIVE,
        'decision_making': DecisionMakingStyle.CAUTIOUS,
        'emotional_expression': EmotionalExpression.SUPPRESSED,
        'social_preference': SocialPreference.PROTECTS_SPACE,
        'typical_dialogue_patterns': [
            "You're making a mistake",
            "I was only trying to help",
            "We could have worked together"
        ],
        'decision_approach': "Plans meticulously, waits for perfect moment to strike"
    },
    CharacterArchetype.PROTAGONIST: {
        'primary_behaviors': [
            BehaviorPattern.SEEKS_ADVENTURE,
            BehaviorPattern.GROWS_THROUGH_TRIALS,
            BehaviorPattern.FINDS_ALLIES
        ],
        'stress_response': StressResponse.BECOMES_DETERMINED,
        'conflict_style': ConflictStyle.COLLABORATIVE,
        'decision_making': DecisionMakingStyle.INTUITIVE,
        'emotional_expression': EmotionalExpression.VARIABLE,
        'social_preference': SocialPreference.NETWORKS,
        'typical_dialogue_patterns': [
            "There's got to be another way",
            "I learned something today",
            "We need to stick together"
        ],
        'decision_approach': "Learns from experience, grows through challenges"
    },
    CharacterArchetype.TRANSFORMER: {
        'primary_behaviors': [
            BehaviorPattern.ADAPTS_QUICKLY,
            BehaviorPattern.QUESTION_NORMS,
            BehaviorPattern.TRANSFORMS_SITUATIONS
        ],
        'stress_response': StressResponse.ADAPTS,
        'conflict_style': ConflictStyle.COLLABORATIVE,
        'decision_making': DecisionMakingStyle.INTUITIVE,
        'emotional_expression': EmotionalExpression.VARIABLE,
        'social_preference': SocialPreference.SITUATIONAL,
        'typical_dialogue_patterns': [
            "What if we tried it differently?",
            "Rules were made to be questioned",
            "Change is the only constant"
        ],
        'decision_approach': "Flexible, sees possibilities where others see limits"
    }
}


class CharacterRole(Enum):
    """Character roles in story structure."""
    LEAD = "lead"
    SUPPORTING = "supporting"
    BACKGROUND = "background"
    MINOR = "minor"
    EPISODIC = "episodic"


@dataclass
class PersonalityProfile:
    """Character personality profile with trait values."""
    traits: Dict[PersonalityTrait, float] = field(default_factory=dict)
    core_beliefs: List[str] = field(default_factory=list)
    motivations: List[str] = field(default_factory=list)
    fears: List[str] = field(default_factory=list)
    strengths: List[str] = field(default_factory=list)
    weaknesses: List[str] = field(default_factory=list)
    speech_patterns: List[str] = field(default_factory=list)
    
    def get_trait_score(self, trait: PersonalityTrait) -> float:
        """Get trait score (0.0 to 1.0)."""
        return self.traits.get(trait, 0.5)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'traits': {trait.value: score for trait, score in self.traits.items()},
            'core_beliefs': self.core_beliefs,
            'motivations': self.motivations,
            'fears': self.fears,
            'strengths': self.strengths,
            'weaknesses': self.weaknesses,
            'speech_patterns': self.speech_patterns
        }


@dataclass
class CharacterAppearance:
    """Character visual appearance and physical characteristics."""
    age: int = 25
    gender: str = "non-binary"
    height_cm: int = 170
    build: str = "average"
    hair_color: str = "brown"
    hair_style: str = "short"
    eye_color: str = "brown"
    skin_tone: str = "medium"
    distinctive_features: List[str] = field(default_factory=list)
    clothing_style: str = "casual"
    accessories: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'age': self.age,
            'gender': self.gender,
            'height_cm': self.height_cm,
            'build': self.build,
            'hair_color': self.hair_color,
            'hair_style': self.hair_style,
            'eye_color': self.eye_color,
            'skin_tone': self.skin_tone,
            'distinctive_features': self.distinctive_features,
            'clothing_style': self.clothing_style,
            'accessories': self.accessories
        }


@dataclass
class CharacterBackstory:
    """Character backstory and history."""
    origin: str = ""
    key_events: List[str] = field(default_factory=list)
    relationships: Dict[str, str] = field(default_factory=dict)
    skills: List[str] = field(default_factory=list)
    secrets: List[str] = field(default_factory=list)
    goals: List[str] = field(default_factory=list)
    conflicts: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'origin': self.origin,
            'key_events': self.key_events,
            'relationships': self.relationships,
            'skills': self.skills,
            'secrets': self.secrets,
            'goals': self.goals,
            'conflicts': self.conflicts
        }


@dataclass
class CharacterConsistency:
    """Character consistency tracking for AI generation."""
    generation_id: str
    appearance_seed: int
    personality_seed: int
    last_modified: datetime
    consistency_score: float = 1.0
    variations: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'generation_id': self.generation_id,
            'appearance_seed': self.appearance_seed,
            'personality_seed': self.personality_seed,
            'last_modified': self.last_modified.isoformat(),
            'consistency_score': self.consistency_score,
            'variations': self.variations
        }


@dataclass
class GeneratedCharacter:
    """Complete generated character with all attributes."""
    character_id: str
    name: str
    archetype: CharacterArchetype
    role: CharacterRole
    personality: PersonalityProfile
    appearance: CharacterAppearance
    backstory: CharacterBackstory
    consistency: CharacterConsistency
    created_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'character_id': self.character_id,
            'name': self.name,
            'archetype': self.archetype.value,
            'role': self.role.value,
            'personality': self.personality.to_dict(),
            'appearance': self.appearance.to_dict(),
            'backstory': self.backstory.to_dict(),
            'consistency': self.consistency.to_dict(),
            'created_at': self.created_at.isoformat(),
            'metadata': self.metadata
        }


@dataclass
class CharacterGenerationConfig:
    """Configuration for character generation."""
    archetype: CharacterArchetype
    role: CharacterRole = CharacterRole.SUPPORTING
    personality_seeds: Dict[PersonalityTrait, float] = field(default_factory=dict)
    appearance_constraints: Dict[str, Any] = field(default_factory=dict)
    backstory_depth: int = 3
    consistency_enabled: bool = True
    generation_seed: Optional[int] = None
    quality_level: str = "high"


class CharacterGenerationError(Exception):
    """Custom exception for character generation errors."""
    pass


class AICharacterEngine:
    """
    AI Character Engine for advanced character generation with personality traits.
    
    This engine generates complete characters with:
    - Personality profiles based on psychological models
    - Visual appearance generation
    - Backstory creation
    - Character consistency management
    - Integration with existing AI enhancement system
    """
    
    def __init__(self, ai_config: AIConfig):
        """Initialize AI Character Engine."""
        self.ai_config = ai_config
        self.logger = logging.getLogger(__name__)
        
        # Initialize circuit breaker for fault tolerance
        self.circuit_breaker = CircuitBreaker(ai_config.circuit_breaker_config)
        
        # Character generation state
        self.is_initialized = False
        self.character_cache = {}
        self.generation_history = []
        
        # Character templates and archetypes
        self.archetype_templates = self._load_archetype_templates()
        self.personality_templates = self._load_personality_templates()
        
        self.logger.info("AI Character Engine initialized")
    
    async def initialize(self) -> bool:
        """Initialize character engine components."""
        try:
            self.logger.info("Initializing AI Character Engine...")
            
            # Validate configuration
            if not self._validate_config():
                raise ValueError("Invalid character generation configuration")
            
            self.is_initialized = True
            self.logger.info("AI Character Engine initialization complete")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize AI Character Engine: {e}")
            return False
    
    def _validate_config(self) -> bool:
        """Validate character generation configuration."""
        try:
            # Basic validation - more detailed validation can be added
            return True
        except Exception as e:
            self.logger.error(f"Configuration validation failed: {e}")
            return False
    
    def _load_archetype_templates(self) -> Dict[CharacterArchetype, Dict[str, Any]]:
        """Load archetype templates for character generation."""
        return {
            CharacterArchetype.HERO: {
                'core_traits': [PersonalityTrait.COURAGE, PersonalityTrait.LOYALTY, PersonalityTrait.COMPASSION],
                'typical_motivations': ["Protect others", "Achieve justice", "Overcome adversity"],
                'common_weaknesses': ["Self-doubt", "Impulsiveness", "Overprotectiveness"],
                'speech_patterns': ["I believe in...", "We can do this", "For the greater good"]
            },
            CharacterArchetype.VILLAIN: {
                'core_traits': [PersonalityTrait.CUNNING, PersonalityTrait.AMBITION, PersonalityTrait.NEUROTICISM],
                'typical_motivations': ["Gain power", "Seek revenge", "Prove superiority"],
                'common_weaknesses': ["Arrogance", "Paranoia", "Lack of empathy"],
                'speech_patterns': ["You underestimate me", "Power is everything", "I will have my revenge"]
            },
            CharacterArchetype.MENTOR: {
                'core_traits': [PersonalityTrait.INTELLIGENCE, PersonalityTrait.WISDOM, PersonalityTrait.PATIENCE],
                'typical_motivations': ["Guide others", "Share knowledge", "Maintain balance"],
                'common_weaknesses': ["Overthinking", "Detachment", "Perfectionism"],
                'speech_patterns': ["Listen carefully", "There is much to learn", "The path is clear"]
            }
        }
    
    def _load_personality_templates(self) -> Dict[str, Dict[PersonalityTrait, float]]:
        """Load personality trait templates."""
        return {
            'heroic': {
                PersonalityTrait.COURAGE: 0.9,
                PersonalityTrait.LOYALTY: 0.8,
                PersonalityTrait.COMPASSION: 0.8,
                PersonalityTrait.HONESTY: 0.9,
                PersonalityTrait.NEUROTICISM: 0.2,
                PersonalityTrait.OPENNESS: 0.7,
                PersonalityTrait.CONSCIENTIOUSNESS: 0.8,
                PersonalityTrait.EXTRAVERSION: 0.7,
                PersonalityTrait.AGREEABLENESS: 0.8,
                PersonalityTrait.AMBITION: 0.7
            },
            'villainous': {
                PersonalityTrait.CUNNING: 0.9,
                PersonalityTrait.AMBITION: 0.9,
                PersonalityTrait.NEUROTICISM: 0.8,
                PersonalityTrait.AGREEABLENESS: 0.2,
                PersonalityTrait.COMPASSION: 0.1,
                PersonalityTrait.HONESTY: 0.2,
                PersonalityTrait.LOYALTY: 0.1,
                PersonalityTrait.TEMPER: 0.7,
                PersonalityTrait.CHARISMA: 0.6
            },
            'wise': {
                PersonalityTrait.INTELLIGENCE: 0.9,
                PersonalityTrait.OPENNESS: 0.8,
                PersonalityTrait.PATIENCE: 0.8,
                PersonalityTrait.WISDOM: 0.9,
                PersonalityTrait.NEUROTICISM: 0.1,
                PersonalityTrait.HUMILITY: 0.7,
                PersonalityTrait.CONSCIENTIOUSNESS: 0.8,
                PersonalityTrait.AGREEABLENESS: 0.7
            },
            'comic_relief': {
                PersonalityTrait.EXTRAVERSION: 0.9,
                PersonalityTrait.CHARISMA: 0.8,
                PersonalityTrait.OPENNESS: 0.7,
                PersonalityTrait.AGREEABLENESS: 0.6,
                PersonalityTrait.NEUROTICISM: 0.3,
                PersonalityTrait.TEMPER: 0.4,
                PersonalityTrait.HUMILITY: 0.8
            },
            'mentor': {
                PersonalityTrait.WISDOM: 0.9,
                PersonalityTrait.PATIENCE: 0.9,
                PersonalityTrait.INTELLIGENCE: 0.8,
                PersonalityTrait.COMPASSION: 0.8,
                PersonalityTrait.HONESTY: 0.9,
                PersonalityTrait.AGREEABLENESS: 0.8,
                PersonalityTrait.NEUROTICISM: 0.1,
                PersonalityTrait.CHARISMA: 0.7
            }
        }
    
    # =========================================================================
    # Trait Normalization and Correlation Methods (Task 7.1.1)
    # =========================================================================
    
    def normalize_trait_value(self, value: float, trait: Optional[PersonalityTrait] = None) -> float:
        """
        Normalize a trait value to the valid range [0.0, 1.0].
        
        Args:
            value: The raw trait value to normalize
            trait: Optional specific trait for trait-specific normalization rules
            
        Returns:
            Normalized value between 0.0 and 1.0
            
        Raises:
            TraitNormalizationError: If normalization fails
        """
        try:
            # Handle NaN and infinite values
            if value != value:  # NaN check
                value = 0.5
            if abs(value) == float('inf'):
                value = 0.5
            
            # Apply trait-specific bounds if provided
            if trait:
                bounds = self._get_trait_bounds(trait)
                min_val, max_val = bounds
                # Clamp to reasonable bounds first
                value = max(-0.5, min(1.5, value))
            else:
                # General bounds
                value = max(-0.5, min(1.5, value))
            
            # Normalize to 0.0-1.0 range
            normalized = (value + 0.5) / 2.0 if value < 0 else value
            normalized = max(0.0, min(1.0, normalized))
            
            return normalized
            
        except Exception as e:
            self.logger.error(f"Trait normalization failed: {e}")
            raise TraitNormalizationError(f"Failed to normalize trait value: {e}")
    
    def _get_trait_bounds(self, trait: PersonalityTrait) -> Tuple[float, float]:
        """
        Get the valid bounds for a specific trait.
        
        Some traits may have different valid ranges based on their nature.
        
        Args:
            trait: The personality trait to get bounds for
            
        Returns:
            Tuple of (min_bound, max_bound)
        """
        # Most traits use standard 0.0-1.0 bounds
        standard_bounds = (-0.2, 1.2)
        
        # Neuroticism often benefits from slightly wider range
        if trait == PersonalityTrait.NEUROTICISM:
            return (-0.1, 1.1)
        
        # Temper can be more variable
        if trait == PersonalityTrait.TEMPER:
            return (-0.3, 1.0)
        
        return standard_bounds
    
    def normalize_trait_dict(self, traits: Dict[PersonalityTrait, float]) -> Dict[PersonalityTrait, float]:
        """
        Normalize all trait values in a dictionary.
        
        Ensures all values are in valid range and applies trait-specific rules.
        
        Args:
            traits: Dictionary of trait to value mappings
            
        Returns:
            Dictionary with all normalized trait values
            
        Raises:
            TraitNormalizationError: If any normalization fails
        """
        normalized = {}
        for trait, value in traits.items():
            normalized[trait] = self.normalize_trait_value(value, trait)
        return normalized
    
    def apply_trait_correlations(self, traits: Dict[PersonalityTrait, float], 
                                  correlation_strength: float = 0.5) -> Dict[PersonalityTrait, float]:
        """
        Apply trait correlations to create a more coherent personality profile.
        
        When one trait is set, correlated traits are automatically adjusted
        to create a psychologically consistent character.
        
        Args:
            traits: Initial trait dictionary
            correlation_strength: How strongly to apply correlations (0.0 to 1.0)
            
        Returns:
            Updated trait dictionary with correlations applied
            
        Raises:
            TraitCorrelationError: If correlation application fails
        """
        try:
            if correlation_strength <= 0:
                return traits
            
            adjusted = traits.copy()
            
            for trait, value in traits.items():
                # Get correlated traits
                correlated = TRAIT_CORRELATIONS.get(trait, [])
                
                for corr_trait in correlated:
                    if corr_trait in adjusted:
                        # Skip if correlated trait is already explicitly set
                        continue
                    
                    # Apply correlation with some randomness
                    target_value = value * correlation_strength
                    variation = random.uniform(-0.1, 0.1)
                    adjusted[corr_trait] = self.normalize_trait_value(
                        target_value + variation, corr_trait
                    )
            
            # Apply contradictions (inverse correlations)
            for trait, value in traits.items():
                contradictions = TRAIT_CONTRADICTIONS.get(trait, [])
                
                for contra_trait in contradictions:
                    if contra_trait not in adjusted:
                        # Calculate inverse value
                        inverse = 1.0 - value
                        # Add some variation
                        variation = random.uniform(-0.15, 0.15)
                        adjusted[contra_trait] = self.normalize_trait_value(
                            inverse + variation, contra_trait
                        )
            
            return adjusted
            
        except Exception as e:
            self.logger.error(f"Trait correlation application failed: {e}")
            raise TraitCorrelationError(f"Failed to apply trait correlations: {e}")
    
    def calculate_trait_consistency(self, traits: Dict[PersonalityTrait, float]) -> float:
        """
        Calculate how consistent a set of traits is psychologically.
        
        Higher scores indicate more coherent personality profiles.
        
        Args:
            traits: Dictionary of trait to value mappings
            
        Returns:
            Consistency score between 0.0 and 1.0
        """
        if not traits:
            return 0.0
        
        score = 1.0
        deductions = 0.0
        
        # Check for contradictions
        for trait, value in traits.items():
            contradictions = TRAIT_CONTRADICTIONS.get(trait, [])
            
            for contra_trait in contradictions:
                if contra_trait in traits:
                    contra_value = traits[contra_trait]
                    # Calculate contradiction strength
                    # If both are high or both are low, that's a contradiction
                    combined = value + contra_value
                    if combined > 1.4 or combined < 0.6:
                        deductions += 0.1
        
        # Check for missing Big Five traits
        big_five = set(TRAIT_CATEGORIES['big_five'])
        present = set(traits.keys())
        missing = big_five - present
        
        if missing:
            deductions += len(missing) * 0.02
        
        # Check trait value distribution
        trait_values = list(traits.values())
        mean_val = sum(trait_values) / len(trait_values)
        variance = sum((v - mean_val) ** 2 for v in trait_values) / len(trait_values)
        
        # Too little variance suggests random distribution
        if variance < 0.01:
            deductions += 0.05
        # Extreme variance suggests inconsistency
        elif variance > 0.15:
            deductions += 0.1
        
        # Calculate final score
        score = max(0.0, score - deductions)
        return score
    
    def get_trait_summary(self, traits: Dict[PersonalityTrait, float]) -> Dict[str, Any]:
        """
        Generate a summary of trait distribution and key characteristics.
        
        Args:
            traits: Dictionary of trait to value mappings
            
        Returns:
            Summary dictionary with analysis results
        """
        # Calculate averages by category
        category_scores = {}
        for category_name, category_traits in TRAIT_CATEGORIES.items():
            scores = []
            for trait in category_traits:
                if trait in traits:
                    scores.append(traits[trait])
            if scores:
                category_scores[category_name] = sum(scores) / len(scores)
        
        # Find dominant traits (top 3)
        sorted_traits = sorted(traits.items(), key=lambda x: x[1], reverse=True)
        dominant = [
            {"trait": t.value, "score": v} 
            for t, v in sorted_traits[:3]
        ]
        
        # Find suppressed traits (bottom 3)
        suppressed = [
            {"trait": t.value, "score": v}
            for t, v in sorted_traits[-3:]
        ]
        
        # Identify extreme traits (very high or very low)
        extreme_high = [t.value for t, v in traits.items() if v > 0.8]
        extreme_low = [t.value for t, v in traits.items() if v < 0.2]
        
        # Calculate Big Five summary
        big_five_scores = {}
        for trait in TRAIT_CATEGORIES['big_five']:
            if trait in traits:
                big_five_scores[trait.value] = traits[trait]
        
        return {
            'total_traits': len(traits),
            'category_averages': category_scores,
            'dominant_traits': dominant,
            'suppressed_traits': suppressed,
            'extreme_high_traits': extreme_high,
            'extreme_low_traits': extreme_low,
            'consistency_score': self.calculate_trait_consistency(traits),
            'big_five_scores': big_five_scores,
            'personality_summary': self._generate_personality_summary(traits)
        }
    
    def _generate_personality_summary(self, traits: Dict[PersonalityTrait, float]) -> str:
        """Generate a natural language summary of the personality."""
        parts = []
        
        # Big Five summary
        if traits.get(PersonalityTrait.EXTRAVERSION, 0.5) > 0.6:
            parts.append("outgoing and energetic")
        elif traits.get(PersonalityTrait.EXTRAVERSION, 0.5) < 0.4:
            parts.append("reserved and introspective")
        
        if traits.get(PersonalityTrait.AGREEABLENESS, 0.5) > 0.6:
            parts.append("cooperative and empathetic")
        elif traits.get(PersonalityTrait.AGREEABLENESS, 0.5) < 0.4:
            parts.append("independent and assertive")
        
        if traits.get(PersonalityTrait.CONSCIENTIOUSNESS, 0.5) > 0.6:
            parts.append("organized and disciplined")
        elif traits.get(PersonalityTrait.CONSCIENTIOUSNESS, 0.5) < 0.4:
            parts.append("spontaneous and flexible")
        
        if traits.get(PersonalityTrait.OPENNESS, 0.5) > 0.6:
            parts.append("curious and open-minded")
        elif traits.get(PersonalityTrait.OPENNESS, 0.5) < 0.4:
            parts.append("traditional and practical")
        
        if traits.get(PersonalityTrait.NEUROTICISM, 0.5) > 0.6:
            parts.append("sensitive and emotional")
        elif traits.get(PersonalityTrait.NEUROTICISM, 0.5) < 0.4:
            parts.append("stable and resilient")
        
        if not parts:
            return "balanced and well-adjusted"
        
        return "; ".join(parts)
    
    def inherit_traits_from_archetype(self, archetype: CharacterArchetype, 
                                        base_traits: Optional[Dict[PersonalityTrait, float]] = None,
                                        variation_range: float = 0.15) -> Dict[PersonalityTrait, float]:
        """
        Generate traits based on character archetype with controlled variation.
        
        Archetypes have typical trait profiles, but individual characters
        within an archetype can vary within defined bounds.
        
        Args:
            archetype: The character archetype to base traits on
            base_traits: Optional base traits to inherit from (e.g., from LLM)
            variation_range: Maximum random variation to apply (0.0 to 1.0)
            
        Returns:
            Dictionary of trait values based on archetype with variation
        """
        # Get archetype template
        archetype_template = self._load_archetype_templates().get(archetype, {})
        
        # Start with archetype core traits
        traits = {}
        
        # Apply archetype core traits with variation
        core_traits = archetype_template.get('core_traits', [])
        for trait in core_traits:
            base_value = 0.8  # Base value for core traits
            variation = random.uniform(-variation_range, variation_range)
            traits[trait] = self.normalize_trait_value(base_value + variation, trait)
        
        # Add Big Five traits with archetype-specific biases
        archetype_biases = self._get_archetype_big_five_biases(archetype)
        for trait in TRAIT_CATEGORIES['big_five']:
            if trait not in traits:
                bias = archetype_biases.get(trait, 0.0)
                variation = random.uniform(-variation_range, variation_range)
                base_value = 0.5 + bias + variation
                traits[trait] = self.normalize_trait_value(base_value, trait)
        
        # Add additional narrative traits
        for trait in PersonalityTrait:
            if trait not in traits and trait not in TRAIT_CATEGORIES['big_five']:
                bias = self._get_archetype_additional_trait_bias(archetype, trait)
                if bias != 0:
                    variation = random.uniform(-variation_range/2, variation_range/2)
                    base_value = 0.5 + bias + variation
                    traits[trait] = self.normalize_trait_value(base_value, trait)
                else:
                    # Default random value for non-specified traits
                    traits[trait] = self.normalize_trait_value(
                        random.uniform(0.3, 0.7), trait
                    )
        
        # Override with base traits if provided
        if base_traits:
            for trait, value in base_traits.items():
                # Apply base traits with reduced variation
                override_variation = random.uniform(-0.05, 0.05)
                traits[trait] = self.normalize_trait_value(value + override_variation, trait)
        
        # Apply trait correlations for coherence
        traits = self.apply_trait_correlations(traits, correlation_strength=0.3)
        
        return traits
    
    def _get_archetype_big_five_biases(self, archetype: CharacterArchetype) -> Dict[PersonalityTrait, float]:
        """
        Get the Big Five trait biases for a specific archetype.
        
        Returns a dictionary of bias values to add to base 0.5 for each Big Five trait.
        """
        biases = {
            CharacterArchetype.HERO: {
                PersonalityTrait.EXTRAVERSION: 0.1,
                PersonalityTrait.AGREEABLENESS: 0.15,
                PersonalityTrait.CONSCIENTIOUSNESS: 0.1,
                PersonalityTrait.OPENNESS: 0.05,
                PersonalityTrait.NEUROTICISM: -0.15
            },
            CharacterArchetype.VILLAIN: {
                PersonalityTrait.EXTRAVERSION: 0.1,
                PersonalityTrait.AGREEABLENESS: -0.3,
                PersonalityTrait.CONSCIENTIOUSNESS: 0.1,
                PersonalityTrait.OPENNESS: 0.1,
                PersonalityTrait.NEUROTICISM: 0.2
            },
            CharacterArchetype.MENTOR: {
                PersonalityTrait.EXTRAVERSION: -0.1,
                PersonalityTrait.AGREEABLENESS: 0.15,
                PersonalityTrait.CONSCIENTIOUSNESS: 0.15,
                PersonalityTrait.OPENNESS: 0.2,
                PersonalityTrait.NEUROTICISM: -0.2
            },
            CharacterArchetype.COMIC_RELIEF: {
                PersonalityTrait.EXTRAVERSION: 0.25,
                PersonalityTrait.AGREEABLENESS: 0.05,
                PersonalityTrait.CONSCIENTIOUSNESS: -0.15,
                PersonalityTrait.OPENNESS: 0.1,
                PersonalityTrait.NEUROTICISM: -0.1
            },
            CharacterArchetype.SIDEKICK: {
                PersonalityTrait.EXTRAVERSION: 0.1,
                PersonalityTrait.AGREEABLENESS: 0.2,
                PersonalityTrait.CONSCIENTIOUSNESS: 0.05,
                PersonalityTrait.OPENNESS: -0.05,
                PersonalityTrait.NEUROTICISM: 0.0
            },
            CharacterArchetype.ANTAGONIST: {
                PersonalityTrait.EXTRAVERSION: 0.05,
                PersonalityTrait.AGREEABLENESS: -0.25,
                PersonalityTrait.CONSCIENTIOUSNESS: 0.15,
                PersonalityTrait.OPENNESS: 0.05,
                PersonalityTrait.NEUROTICISM: 0.15
            },
            CharacterArchetype.PROTAGONIST: {
                PersonalityTrait.EXTRAVERSION: 0.1,
                PersonalityTrait.AGREEABLENESS: 0.1,
                PersonalityTrait.CONSCIENTIOUSNESS: 0.1,
                PersonalityTrait.OPENNESS: 0.1,
                PersonalityTrait.NEUROTICISM: -0.1
            },
            CharacterArchetype.TRANSFORMER: {
                PersonalityTrait.EXTRAVERSION: 0.0,
                PersonalityTrait.AGREEABLENESS: 0.05,
                PersonalityTrait.CONSCIENTIOUSNESS: 0.0,
                PersonalityTrait.OPENNESS: 0.25,
                PersonalityTrait.NEUROTICISM: 0.0
            }
        }
        
        return biases.get(archetype, {})
    
    def _get_archetype_additional_trait_bias(self, archetype: CharacterArchetype, 
                                              trait: PersonalityTrait) -> float:
        """
        Get bias value for additional traits based on archetype.
        
        Returns 0 if no specific bias is defined.
        """
        additional_biases = {
            CharacterArchetype.HERO: {
                PersonalityTrait.COURAGE: 0.3,
                PersonalityTrait.LOYALTY: 0.25,
                PersonalityTrait.COMPASSION: 0.2,
                PersonalityTrait.HONESTY: 0.2
            },
            CharacterArchetype.VILLAIN: {
                PersonalityTrait.CUNNING: 0.3,
                PersonalityTrait.AMBITION: 0.3,
                PersonalityTrait.TEMPER: 0.15
            },
            CharacterArchetype.MENTOR: {
                PersonalityTrait.WISDOM: 0.35,
                PersonalityTrait.PATIENCE: 0.3,
                PersonalityTrait.INTELLIGENCE: 0.2
            },
            CharacterArchetype.COMIC_RELIEF: {
                PersonalityTrait.CHARISMA: 0.25,
                PersonalityTrait.TEMPER: 0.1,
                PersonalityTrait.HUMILITY: 0.15
            },
            CharacterArchetype.SIDEKICK: {
                PersonalityTrait.LOYALTY: 0.3,
                PersonalityTrait.COMPASSION: 0.15,
                PersonalityTrait.HONESTY: 0.15
            },
            CharacterArchetype.ANTAGONIST: {
                PersonalityTrait.CUNNING: 0.25,
                PersonalityTrait.AMBITION: 0.2,
                PersonalityTrait.CHARISMA: 0.1
            },
            CharacterArchetype.PROTAGONIST: {
                PersonalityTrait.COURAGE: 0.2,
                PersonalityTrait.AMBITION: 0.15,
                PersonalityTrait.LOYALTY: 0.15
            },
            CharacterArchetype.TRANSFORMER: {
                PersonalityTrait.OPENNESS: 0.3,
                PersonalityTrait.INDEPENDENCE: 0.25
            }
        }
        
        archetype_biases = additional_biases.get(archetype, {})
        return archetype_biases.get(trait, 0.0)
    
    async def generate_character(self, config: CharacterGenerationConfig) -> Optional[GeneratedCharacter]:
        """
        Generate a complete character with personality traits.
        
        Args:
            config: Character generation configuration
            
        Returns:
            Generated character or None if generation fails
        """
        if not self.is_initialized:
            self.logger.error("AI Character Engine not initialized")
            return None
        
        # Use circuit breaker for fault tolerance
        async def _generate_operation():
            try:
                # Generate character ID
                character_id = str(uuid.uuid4())
                
                # Generate character name
                name = await self._generate_character_name(config)
                
                # Generate personality profile
                personality = await self._generate_personality(config)
                
                # Generate appearance
                appearance = await self._generate_appearance(config)
                
                # Generate backstory
                backstory = await self._generate_backstory(config, personality)
                
                # Create consistency tracking
                consistency = CharacterConsistency(
                    generation_id=character_id,
                    appearance_seed=random.randint(1, 10000),
                    personality_seed=random.randint(1, 10000),
                    last_modified=datetime.now()
                )
                
                # Create complete character
                character = GeneratedCharacter(
                    character_id=character_id,
                    name=name,
                    archetype=config.archetype,
                    role=config.role,
                    personality=personality,
                    appearance=appearance,
                    backstory=backstory,
                    consistency=consistency
                )
                
                # Cache the character
                self.character_cache[character_id] = character
                self.generation_history.append(character_id)
                
                self.logger.info(f"Generated character: {name} ({config.archetype.value})")
                return character
                
            except Exception as e:
                self.logger.error(f"Character generation failed: {e}")
                raise
        
        try:
            return await self.circuit_breaker.call(_generate_operation)
        except Exception as e:
            self.logger.error(f"Circuit breaker blocked character generation: {e}")
            return None
    
    async def _generate_character_name(self, config: CharacterGenerationConfig) -> str:
        """Generate character name based on archetype and role."""
        # Mock name generation - in real implementation, this would use AI models
        name_templates = {
            CharacterArchetype.HERO: ["Aria", "Kael", "Lyra", "Thorne"],
            CharacterArchetype.VILLAIN: ["Malakor", "Seraphine", "Vex", "Nyx"],
            CharacterArchetype.MENTOR: ["Eldrin", "Morgana", "Thalor", "Aelwyn"]
        }
        
        names = name_templates.get(config.archetype, ["Character"])
        return f"{random.choice(names)} {random.randint(100, 999)}"
    
    async def _generate_personality(self, config: CharacterGenerationConfig) -> PersonalityProfile:
        """Generate personality profile with trait values."""
        # Get archetype template
        archetype_template = self.archetype_templates.get(config.archetype, {})
        
        # Initialize traits with base values
        traits = {trait: 0.5 for trait in PersonalityTrait}
        
        # Apply archetype influences
        core_traits = archetype_template.get('core_traits', [])
        for trait in core_traits:
            traits[trait] = random.uniform(0.7, 0.9)
        
        # Apply personality seeds
        for trait, seed_value in config.personality_seeds.items():
            traits[trait] = max(0.0, min(1.0, seed_value))
        
        # Generate additional traits
        traits[PersonalityTrait.OPENNESS] = random.uniform(0.3, 0.9)
        traits[PersonalityTrait.CONSCIENTIOUSNESS] = random.uniform(0.3, 0.9)
        traits[PersonalityTrait.EXTRAVERSION] = random.uniform(0.3, 0.9)
        traits[PersonalityTrait.AGREEABLENESS] = random.uniform(0.3, 0.9)
        traits[PersonalityTrait.NEUROTICISM] = random.uniform(0.1, 0.8)
        
        # Generate personality elements
        core_beliefs = archetype_template.get('typical_motivations', [])[:3]
        motivations = archetype_template.get('typical_motivations', [])[:3]
        fears = archetype_template.get('common_weaknesses', [])[:3]
        strengths = archetype_template.get('core_traits', [])[:3]
        weaknesses = archetype_template.get('common_weaknesses', [])[:3]
        speech_patterns = archetype_template.get('speech_patterns', [])[:3]
        
        return PersonalityProfile(
            traits=traits,
            core_beliefs=core_beliefs,
            motivations=motivations,
            fears=fears,
            strengths=strengths,
            weaknesses=weaknesses,
            speech_patterns=speech_patterns
        )
    
    async def _generate_appearance(self, config: CharacterGenerationConfig) -> CharacterAppearance:
        """Generate character appearance."""
        # Apply appearance constraints
        appearance = CharacterAppearance()
        
        for key, value in config.appearance_constraints.items():
            if hasattr(appearance, key):
                setattr(appearance, key, value)
        
        # Generate random appearance if no constraints
        if not config.appearance_constraints:
            appearance.age = random.randint(18, 65)
            appearance.height_cm = random.randint(150, 200)
            appearance.distinctive_features = random.sample(
                ["Scar", "Tattoo", "Piercing", "Birthmark", "Unique hairstyle"], 
                random.randint(0, 2)
            )
            appearance.accessories = random.sample(
                ["Necklace", "Ring", "Bracelet", "Hat", "Glasses"], 
                random.randint(0, 3)
            )
        
        return appearance
    
    async def _generate_backstory(self, config: CharacterGenerationConfig, 
                                 personality: PersonalityProfile) -> CharacterBackstory:
        """Generate character backstory."""
        # Generate origin
        origins = ["City", "Village", "Forest", "Mountain", "Desert", "Ocean"]
        origin = random.choice(origins)
        
        # Generate key events based on archetype
        archetype_template = self.archetype_templates.get(config.archetype, {})
        key_events = archetype_template.get('typical_motivations', [])[:config.backstory_depth]
        
        # Generate relationships
        relationships = {
            "family": random.choice(["Supportive", "Distant", "Lost", "Unknown"]),
            "friends": random.choice(["Many", "Few", "None", "Loyal"]),
            "enemies": random.choice(["None", "One", "Many", "Unknown"])
        }
        
        # Generate skills based on personality
        high_traits = [trait for trait, score in personality.traits.items() if score > 0.7]
        skills = []
        if PersonalityTrait.INTELLIGENCE in high_traits:
            skills.extend(["Strategy", "Analysis", "Problem-solving"])
        if PersonalityTrait.COURAGE in high_traits:
            skills.extend(["Combat", "Leadership", "Risk-taking"])
        if PersonalityTrait.CHARISMA in high_traits:
            skills.extend(["Persuasion", "Diplomacy", "Performance"])
        
        return CharacterBackstory(
            origin=origin,
            key_events=key_events,
            relationships=relationships,
            skills=skills[:3],
            secrets=[f"Secret {i+1}" for i in range(random.randint(1, 3))],
            goals=[f"Goal {i+1}" for i in range(random.randint(2, 4))],
            conflicts=[f"Conflict {i+1}" for i in range(random.randint(1, 3))]
        )
    
    async def enhance_character_visuals(self, character: GeneratedCharacter, 
                                      enhancement_type: str = "style_transfer") -> Optional[Dict[str, Any]]:
        """
        Enhance character visuals using AI enhancement engine.
        
        Args:
            character: Character to enhance
            enhancement_type: Type of enhancement to apply
            
        Returns:
            Enhancement result or None if enhancement fails
        """
        if not self.is_initialized:
            self.logger.error("AI Character Engine not initialized")
            return None
        
        try:
            # This would integrate with the AI Enhancement Engine
            # For now, return mock enhancement result
            enhancement_result = {
                'character_id': character.character_id,
                'enhancement_type': enhancement_type,
                'status': 'completed',
                'enhanced_features': ['appearance', 'details'],
                'processing_time': 0.5,
                'quality_score': 0.85
            }
            
            self.logger.info(f"Enhanced character visuals for {character.name}")
            return enhancement_result
            
        except Exception as e:
            self.logger.error(f"Character visual enhancement failed: {e}")
            return None
    
    def get_character_by_id(self, character_id: str) -> Optional[GeneratedCharacter]:
        """Get character by ID from cache."""
        return self.character_cache.get(character_id)
    
    def get_character_consistency_score(self, character_id: str) -> float:
        """Get character consistency score."""
        character = self.get_character_by_id(character_id)
        if character:
            return character.consistency.consistency_score
        return 0.0
    
    def update_character_consistency(self, character_id: str, variation: str) -> bool:
        """Update character consistency with new variation."""
        character = self.get_character_by_id(character_id)
        if character:
            character.consistency.variations.append(variation)
            character.consistency.last_modified = datetime.now()
            return True
        return False
    
    def get_generation_statistics(self) -> Dict[str, Any]:
        """Get character generation statistics."""
        return {
            'total_generated': len(self.generation_history),
            'cached_characters': len(self.character_cache),
            'archetype_distribution': self._get_archetype_distribution(),
            'average_consistency_score': self._get_average_consistency_score()
        }
    
    def _get_archetype_distribution(self) -> Dict[str, int]:
        """Get distribution of generated archetypes."""
        distribution = {}
        for character_id in self.generation_history:
            character = self.character_cache.get(character_id)
            if character:
                archetype = character.archetype.value
                distribution[archetype] = distribution.get(archetype, 0) + 1
        return distribution
    
    def _get_average_consistency_score(self) -> float:
        """Get average consistency score across all characters."""
        if not self.character_cache:
            return 0.0
        
        total_score = sum(char.consistency.consistency_score for char in self.character_cache.values())
        return total_score / len(self.character_cache)
    
    async def export_character(self, character_id: str, format: str = "json") -> Optional[Dict[str, Any]]:
        """Export character data in specified format."""
        character = self.get_character_by_id(character_id)
        if not character:
            return None
        
        if format == "json":
            return character.to_dict()
        elif format == "yaml":
            # Would need yaml library for actual YAML export
            return character.to_dict()
        else:
            self.logger.error(f"Unsupported export format: {format}")
            return None
    
    async def shutdown(self):
        """Shutdown character engine and cleanup resources."""
        self.logger.info("Shutting down AI Character Engine...")
        
        # Clear cache and history
        self.character_cache.clear()
        self.generation_history.clear()
        
        self.is_initialized = False
        self.logger.info("AI Character Engine shutdown complete")


# Factory function for easy initialization
def create_ai_character_engine(ai_config: AIConfig) -> AICharacterEngine:
    """
    Create and configure AI Character Engine.
    
    Args:
        ai_config: AI configuration from main engine
        
    Returns:
        Configured AI Character Engine
    """
    return AICharacterEngine(ai_config)