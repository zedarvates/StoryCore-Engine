"""
Emotional Arc Types

Data structures for emotional tracking and arc analysis.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class EmotionType(Enum):
    """Primary emotion types."""
    JOY = "joy"
    SADNESS = "sadness"
    ANGER = "anger"
    FEAR = "fear"
    SURPRISE = "surprise"
    DISGUST = "disgust"
    TRUST = "trust"
    ANTICIPATION = "anticipation"
    LOVE = "love"
    HATE = "hate"
    HOPE = "hope"
    DESPAIR = "despair"
    CALM = "calm"
    ANXIETY = "anxiety"
    NEUTRAL = "neutral"


class EmotionCategory(Enum):
    """Broad emotion categories."""
    POSITIVE = "positive"
    NEGATIVE = "negative"
    NEUTRAL = "neutral"
    AMBIVALENT = "ambivalent"


class ArcType(Enum):
    """Story arc types based on emotional progression."""
    HEROS_JOURNEY = "heros_journey"
    TRAGEDY = "tragedy"
    ROMANCE = "romance"
    RISE = "rise"
    FALL = "fall"
    FLAT = "flat"
    COMPLEX = "complex"


@dataclass
class EmotionBeat:
    """A single emotional moment in the story."""
    scene_number: int
    emotion: EmotionType
    intensity: float  # 0.0 to 1.0
    source: str  # "dialogue", "action", "description"
    text_sample: str
    characters: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_number": self.scene_number,
            "emotion": self.emotion.value,
            "intensity": round(self.intensity, 2),
            "source": self.source,
            "text_sample": self.text_sample[:100],
            "characters": self.characters
        }


@dataclass
class EmotionTransition:
    """Transition between two emotions."""
    from_emotion: EmotionType
    to_emotion: EmotionType
    scene_number: int
    transition_type: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "from": self.from_emotion.value,
            "to": self.to_emotion.value,
            "scene": self.scene_number,
            "type": self.transition_type
        }


@dataclass
class CharacterEmotionArc:
    """Emotional arc for a single character."""
    character_name: str
    beats: List[EmotionBeat] = field(default_factory=list)
    transitions: List[EmotionTransition] = field(default_factory=list)
    dominant_emotion: Optional[EmotionType] = None
    arc_type: Optional[ArcType] = None
    emotional_range: float = 0.0
    arc_description: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "character_name": self.character_name,
            "dominant_emotion": self.dominant_emotion.value if self.dominant_emotion else None,
            "arc_type": self.arc_type.value if self.arc_type else None,
            "total_beats": len(self.beats),
            "arc_description": self.arc_description,
        }


@dataclass
class SceneEmotionProfile:
    """Emotional profile for a scene."""
    scene_number: int
    primary_emotion: Optional[EmotionType] = None
    secondary_emotion: Optional[EmotionType] = None
    intensity: float = 0.0
    tension_level: float = 0.0
    characters_present: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_number": self.scene_number,
            "primary_emotion": self.primary_emotion.value if self.primary_emotion else None,
            "intensity": round(self.intensity, 2),
            "tension_level": round(self.tension_level, 2),
        }


@dataclass
class EmotionalArcAnalysis:
    """Complete emotional arc analysis for a script."""
    story_arc_type: Optional[ArcType] = None
    overall_emotional_trend: str = ""
    character_arcs: Dict[str, CharacterEmotionArc] = field(default_factory=dict)
    scene_profiles: List[SceneEmotionProfile] = field(default_factory=list)
    peak_moments: List[EmotionBeat] = field(default_factory=list)
    turning_points: List[EmotionTransition] = field(default_factory=list)
    total_beats: int = 0
    avg_intensity: float = 0.0
    dominant_emotion: Optional[EmotionType] = None
    analyzed_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "story_arc_type": self.story_arc_type.value if self.story_arc_type else None,
            "total_beats": self.total_beats,
            "avg_intensity": round(self.avg_intensity, 2),
            "character_count": len(self.character_arcs),
            "analyzed_at": self.analyzed_at.isoformat()
        }

