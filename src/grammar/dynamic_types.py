"""
Dynamic Shot Suggestions Types

Defines emotional tones, context categories, and suggestion structures.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from typing_extensions import TypedDict


class EmotionalTone(Enum):
    """Emotional tone categories for shot selection."""
    TENSE = "tense"
    ROMANTIC = "romantic"
    ACTION = "action"
    MYSTERIOUS = "mysterious"
    HAPPY = "happy"
    SAD = "sad"
    NOSTALGIC = "nostalgic"
    HORROR = "horror"
    COMEDIC = "comedic"
    DRAMATIC = "dramatic"
    PEACEFUL = "peaceful"
    SURREAL = "surreal"


class NarrativeBeat(Enum):
    """Narrative beat types for story progression."""
    SETUP = "setup"
    INCITING_INCIDENT = "inciting"
    RISING_ACTION = "rising"
    MIDPOINT = "midpoint"
    CLIMAX = "climax"
    FALLING_ACTION = "falling"
    RESOLUTION = "resolution"
    THEME_STATEMENT = "theme"
    CHARACTER_MOMENT = "character"
    REVELATION = "revelation"
    CONFRONTATION = "confrontation"


class ShotVariation(Enum):
    """Shot variation types for visual variety."""
    ANGLE_HIGH = "high_angle"
    ANGLE_LOW = "low_angle"
    ANGLE_EYE = "eye_level"
    ANGLE_DUTCH = "dutch_angle"
    OVERHEAD = "overhead"
    POV = "pov"
    REFLECTION = "reflection"
    WINDOW_REFLECTION = "window_reflection"
    MIRROR_SHOT = "mirror"
    THIRD_PERSON = "third_person"


@dataclass
class ShotSuggestion:
    """A dynamic shot suggestion with full context."""
    shot_class: str  # From ShotType enum
    emotional_tone: EmotionalTone
    confidence: float
    reason: str
    variation: Optional[ShotVariation] = None
    camera_movement: Optional[str] = None
    duration_estimate: float = 3.0
    notes: List[str] = field(default_factory=list)
    alternatives: List[str] = field(default_factory=list)


@dataclass
class ShotSequence:
    """A sequence of shots with transitions."""
    sequence_id: str
    scene_id: str
    shots: List[ShotSuggestion]
    total_duration: float
    rhythm_score: float
    variety_score: float
    transitions: List[str] = field(default_factory=list)


@dataclass
class NarrativeContext:
    """Narrative context for shot decisions."""
    beat_type: NarrativeBeat
    beat_description: str
    intensity: float  # 0-1
    emotional_shift: Optional[str] = None
    character_focus: Optional[str] = None
    plot_relevance: str = "standard"


@dataclass
class DynamicSuggestions:
    """Complete dynamic suggestion set for a scene."""
    scene_id: str
    primary_tone: EmotionalTone
    secondary_tones: List[EmotionalTone] = field(default_factory=list)
    narrative_context: Optional[NarrativeContext] = None
    
    # Shot recommendations
    opening_shot: Optional[ShotSuggestion] = None
    closing_shot: Optional[ShotSuggestion] = None
    key_moments: List[ShotSuggestion] = field(default_factory=list)
    
    # Sequence
    suggested_sequence: Optional[ShotSequence] = None
    
    # Analysis
    tone_confidence: float = 0.0
    variety_notes: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)


@dataclass
class ContextIndicators:
    """Detected context indicators from script analysis."""
    action_words: List[str] = field(default_factory=list)
    emotional_words: List[str] = field(default_factory=list)
    dialogue_markers: List[str] = field(default_factory=list)
    location_indicators: List[str] = field(default_factory=list)
    time_indicators: List[str] = field(default_factory=list)
    character_actions: List[str] = field(default_factory=list)


@dataclass
def SuggestionRequest(TypedDict):
    """Request structure for dynamic suggestions."""
    scene_content: str
    scene_heading: str
    num_characters: int
    previous_shot: Optional[str]
    genre: str
    duration_estimate: float


@dataclass
def SuggestionResponse(TypedDict):
    """Response structure for dynamic suggestions."""
    suggestions: Dict
    sequence: Dict
    narrative_context: Optional[Dict]
    confidence_scores: Dict
    recommendations: List[str]


# Tone to shot mapping
TONE_SHOT_MAP = {
    EmotionalTone.TENSE: {
        "primary_shots": ["close_up", "medium_close"],
        "variations": ["low_angle", "dutch_angle"],
        "camera_movements": ["static", "handheld"],
        "duration_range": (2.0, 4.0),
    },
    EmotionalTone.ROMANTIC: {
        "primary_shots": ["medium_close", "full"],
        "variations": ["eye_level", "soft_focus"],
        "camera_movements": ["dolly_in", "crane_up"],
        "duration_range": (4.0, 8.0),
    },
    EmotionalTone.ACTION: {
        "primary_shots": ["wide", "full", "medium"],
        "variations": ["pov", "high_angle"],
        "camera_movements": ["steadicam", "dolly_in", "handheld"],
        "duration_range": (1.5, 3.0),
    },
    EmotionalTone.MYSTERIOUS: {
        "primary_shots": ["medium", "medium_close"],
        "variations": ["shadow_frame", "low_angle"],
        "camera_movements": ["static", "slow_pan"],
        "duration_range": (3.0, 6.0),
    },
    EmotionalTone.HAPPY: {
        "primary_shots": ["full", "medium"],
        "variations": ["eye_level", "high_angle"],
        "camera_movements": ["dolly_out", "static"],
        "duration_range": (3.0, 6.0),
    },
    EmotionalTone.SAD: {
        "primary_shots": ["close_up", "medium_close"],
        "variations": ["high_angle", "soft_focus"],
        "camera_movements": ["static", "tilt_down"],
        "duration_range": (4.0, 8.0),
    },
    EmotionalTone.HORROR: {
        "primary_shots": ["close_up", "extreme_close_up"],
        "variations": ["low_angle", "pov"],
        "camera_movements": ["static", "slow_zoom"],
        "duration_range": (2.0, 5.0),
    },
    EmotionalTone.COMEDIC: {
        "primary_shots": ["medium", "full"],
        "variations": ["overhead", "dutch_angle"],
        "camera_movements": ["static", "quick_pan"],
        "duration_range": (2.0, 4.0),
    },
}


# Beat to shot mapping
BEAT_SHOT_MAP = {
    NarrativeBeat.SETUP: {"shot": "wide", "movement": "static", "duration": 5.0},
    NarrativeBeat.INCITING_INCIDENT: {"shot": "medium", "movement": "dolly_in", "duration": 3.0},
    NarrativeBeat.RISING_ACTION: {"shot": "medium", "movement": "steadicam", "duration": 2.5},
    NarrativeBeat.MIDPOINT: {"shot": "close_up", "movement": "dolly_in", "duration": 3.0},
    NarrativeBeat.CLIMAX: {"shot": "wide", "movement": "crane_down", "duration": 4.0},
    NarrativeBeat.FALLING_ACTION: {"shot": "medium", "movement": "static", "duration": 3.0},
    NarrativeBeat.RESOLUTION: {"shot": "wide", "movement": "dolly_out", "duration": 5.0},
}

