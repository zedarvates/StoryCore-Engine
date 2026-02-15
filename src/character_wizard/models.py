"""
Core data models and type definitions for Character Setup Wizard

This module defines all the data structures used throughout the character
creation system, ensuring type safety and Data Contract v1 compliance.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any, Union
from pathlib import Path
import datetime


class CreationMethod(Enum):
    """Character creation method enumeration"""
    AUTO_GENERATED = "auto_generated"
    IMAGE_REFERENCE = "image_reference"


class PuppetCategory(Enum):
    """Puppet System category assignment"""
    P1 = "P1"  # Primary characters, protagonists
    P2 = "P2"  # Secondary characters, important roles
    M1 = "M1"  # Minor characters, background elements


class FormalityLevel(Enum):
    """Voice formality level"""
    VERY_INFORMAL = "very_informal"
    INFORMAL = "informal"
    NEUTRAL = "neutral"
    FORMAL = "formal"
    VERY_FORMAL = "very_formal"


class HumorStyle(Enum):
    """Character humor style"""
    WITTY = "witty"
    SARCASTIC = "sarcastic"
    PLAYFUL = "playful"
    DRY = "dry"
    NONE = "none"


class Gender(Enum):
    """Character gender for prompt generation and character identity"""
    MALE = "male"
    FEMALE = "female"
    NON_BINARY = "non_binary"
    OTHER = "other"


@dataclass
class ColorPalette:
    """Color palette specification"""
    primary_colors: List[str] = field(default_factory=list)  # Hex color codes
    secondary_colors: List[str] = field(default_factory=list)
    accent_colors: List[str] = field(default_factory=list)
    color_harmony: str = "complementary"  # complementary, analogous, triadic, etc.


@dataclass
class VisualIdentity:
    """Visual appearance specifications"""
    
    # Facial Features
    hair_color: str = ""
    hair_style: str = ""
    hair_length: str = ""
    eye_color: str = ""
    eye_shape: str = ""
    skin_tone: str = ""
    facial_structure: str = ""
    distinctive_features: List[str] = field(default_factory=list)
    
    # Physical Characteristics
    age_range: str = ""
    height: str = ""
    build: str = ""
    posture: str = ""
    
    # Clothing and Style
    clothing_style: str = ""
    color_palette: ColorPalette = field(default_factory=ColorPalette)
    accessories: List[str] = field(default_factory=list)
    aesthetic: str = ""
    
    # Technical Specifications
    art_style: str = ""
    rendering_style: str = ""
    quality_level: str = "high"


@dataclass
class PersonalityProfile:
    """Comprehensive personality specification using Big Five model"""
    
    # Core Traits (Big Five Model - 0.0 to 1.0)
    openness: float = 0.5
    conscientiousness: float = 0.5
    extraversion: float = 0.5
    agreeableness: float = 0.5
    neuroticism: float = 0.5
    
    # Character Traits
    primary_traits: List[str] = field(default_factory=list)  # 3-5 main traits
    strengths: List[str] = field(default_factory=list)       # 2-3 strengths
    flaws: List[str] = field(default_factory=list)          # 2-3 flaws
    
    # Motivations and Goals
    external_goal: str = ""         # BUT 1 - what they want
    internal_need: str = ""         # BUT 2 - what they need
    fears: List[str] = field(default_factory=list)          # What they're afraid of
    values: List[str] = field(default_factory=list)         # What they value most
    
    # Behavioral Patterns
    stress_response: str = ""
    conflict_style: str = ""
    emotional_expression: str = ""
    decision_making_style: str = ""
    
    # Relationships
    attachment_style: str = ""
    social_preferences: str = ""
    trust_patterns: str = ""


@dataclass
class VoiceIdentity:
    """Voice and dialogue specifications"""
    
    # Speech Characteristics
    speech_patterns: str = ""
    vocabulary_level: str = ""
    sentence_complexity: str = ""
    speaking_pace: str = ""
    
    # Linguistic Features
    accent: Optional[str] = None
    dialect: Optional[str] = None
    formality_level: FormalityLevel = FormalityLevel.NEUTRAL
    
    # Emotional Expression
    humor_style: HumorStyle = HumorStyle.NONE
    emotional_range: str = ""
    vulnerability_expression: str = ""
    
    # Unique Elements
    catchphrases: List[str] = field(default_factory=list)
    verbal_tics: List[str] = field(default_factory=list)
    signature_expressions: List[str] = field(default_factory=list)
    
    # Technical Specifications
    voice_type: str = ""  # For TTS integration
    emotional_variance: float = 0.5


@dataclass
class BackstoryProfile:
    """Character history and background"""
    
    # Personal History
    origin_story: str = ""
    key_life_events: List[str] = field(default_factory=list)
    formative_experiences: List[str] = field(default_factory=list)
    
    # Relationships
    family_background: str = ""
    significant_relationships: List[str] = field(default_factory=list)
    relationship_patterns: str = ""
    
    # Professional/Social
    occupation: str = ""
    education_level: str = ""
    social_status: str = ""
    cultural_background: str = ""
    
    # Secrets and Mysteries
    hidden_aspects: List[str] = field(default_factory=list)
    secrets: List[str] = field(default_factory=list)
    unresolved_conflicts: List[str] = field(default_factory=list)
    
    # Character Arc Potential
    growth_opportunities: List[str] = field(default_factory=list)
    potential_conflicts: List[str] = field(default_factory=list)
    transformation_triggers: List[str] = field(default_factory=list)


@dataclass
class CoherenceAnchors:
    """Visual consistency anchors for image generation"""
    
    # Primary Descriptors
    character_descriptor: str = ""  # Main character description
    facial_anchors: List[str] = field(default_factory=list)  # Specific facial features
    clothing_anchors: List[str] = field(default_factory=list)  # Clothing descriptions
    style_anchors: List[str] = field(default_factory=list)   # Art style specifications
    
    # Color Specifications
    primary_colors: List[str] = field(default_factory=list)  # Hex color codes
    secondary_colors: List[str] = field(default_factory=list)
    color_harmony: str = ""         # Color scheme type
    
    # Technical Parameters
    positive_prompts: List[str] = field(default_factory=list)  # Always include these
    negative_prompts: List[str] = field(default_factory=list)  # Always exclude these
    style_strength: float = 1.0        # How strongly to apply style
    
    # Consistency Settings
    seed_base: int = 0              # Base seed for consistency
    cfg_scale: float = 7.5         # Classifier-free guidance scale
    denoising_strength: float = 0.7  # For img2img consistency


@dataclass
class CharacterProfile:
    """Complete character profile with all specifications"""
    
    # Basic Information
    character_id: str = ""
    name: str = ""
    creation_method: CreationMethod = CreationMethod.AUTO_GENERATED
    creation_timestamp: str = field(default_factory=lambda: datetime.datetime.now().isoformat())
    version: str = "1.0"
    
    # Gender Identity (for prompts and character identity)
    gender: Optional[Gender] = None
    gender_custom: str = ""  # For custom gender specification (e.g., alien genders)
    
    # Visual Identity
    visual_identity: VisualIdentity = field(default_factory=VisualIdentity)
    coherence_anchors: CoherenceAnchors = field(default_factory=CoherenceAnchors)
    reference_images: List[str] = field(default_factory=list)
    
    # Personality and Psychology
    personality_profile: PersonalityProfile = field(default_factory=PersonalityProfile)
    backstory_profile: BackstoryProfile = field(default_factory=BackstoryProfile)
    voice_identity: VoiceIdentity = field(default_factory=VoiceIdentity)
    
    # Integration Data
    puppet_category: PuppetCategory = PuppetCategory.M1
    genre_tags: List[str] = field(default_factory=list)
    style_tags: List[str] = field(default_factory=list)
    
    # Quality and Metadata
    quality_score: float = 0.0
    consistency_score: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AutoGenerationParams:
    """Parameters for automatic character generation"""
    role: str = ""  # protagonist, antagonist, supporting, etc.
    genre: str = ""  # fantasy, sci-fi, modern, etc.
    age_range: str = ""  # child, teen, adult, elderly
    gender: Optional[Gender] = None  # male, female, non_binary, other
    gender_custom: str = ""  # For custom gender specification (e.g., alien genders)
    style_preferences: Dict[str, str] = field(default_factory=dict)
    cultural_context: Optional[str] = None
    archetype: Optional[str] = None


@dataclass
class ImageAnalysisResult:
    """Result of reference image analysis"""
    image_path: str = ""
    visual_features: VisualIdentity = field(default_factory=VisualIdentity)
    extracted_colors: ColorPalette = field(default_factory=ColorPalette)
    style_classification: str = ""
    quality_score: float = 0.0
    analysis_confidence: float = 0.0
    processing_notes: List[str] = field(default_factory=list)


@dataclass
class CharacterCreationResult:
    """Result of character creation process"""
    success: bool = False
    character_profile: Optional[CharacterProfile] = None
    error_message: str = ""
    warnings: List[str] = field(default_factory=list)
    processing_time: float = 0.0
    integration_status: Dict[str, bool] = field(default_factory=dict)


@dataclass
class ValidationResult:
    """Result of character validation"""
    is_valid: bool = False
    quality_score: float = 0.0
    consistency_score: float = 0.0
    issues: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)


@dataclass
class WizardState:
    """State management for wizard sessions"""
    session_id: str = ""
    current_step: str = ""
    creation_method: Optional[CreationMethod] = None
    collected_data: Dict[str, Any] = field(default_factory=dict)
    character_profile: Optional[CharacterProfile] = None
    project_context: Optional[str] = None
    timestamp: str = field(default_factory=lambda: datetime.datetime.now().isoformat())