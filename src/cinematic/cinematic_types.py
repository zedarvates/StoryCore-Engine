"""
Cinematic Grammar Types

Defines shot types, camera movements, transitions, and pacing for cinematic language.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

from enum import Enum
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from typing_extensions import TypedDict


class ShotClass(Enum):
    """Shot classification by framing size."""
    EXTREME_WIDE = "extreme_wide"  # EWS
    WIDE = "wide"                   # WS
    FULL = "full"                   # FS
    MEDIUM_FULL = "medium_full"     # MFS
    MEDIUM = "medium"               # MS
    MEDIUM_CLOSE = "medium_close"   # MCS
    CLOSE_UP = "close_up"           # CU
    EXTREME_CLOSE_UP = "extreme_cu" # ECU
    INSERT = "insert"               # Insert shot
    CUTAWAY = "cutaway"             # Cutaway


class CameraMovement(Enum):
    """Camera movement types."""
    STATIC = "static"
    PAN_LEFT = "pan_left"
    PAN_RIGHT = "pan_right"
    TILT_UP = "tilt_up"
    TILT_DOWN = "tilt_down"
    DOLLY_IN = "dolly_in"
    DOLLY_OUT = "dolly_out"
    DOLLY_LEFT = "dolly_left"
    DOLLY_RIGHT = "dolly_right"
    TRUCK_LEFT = "truck_left"
    TRUCK_RIGHT = "truck_right"
    CRANE_UP = "crane_up"
    CRANE_DOWN = "crane_down"
    ARC_LEFT = "arc_left"
    ARC_RIGHT = "arc_right"
    ZOOM_IN = "zoom_in"
    ZOOM_OUT = "zoom_out"
    HANDHELD = "handheld"
    STEADICAM = "steadicam"
    DRONE = "drone"
    POV = "pov"
    WHIP_PAN = "whip_pan"
    RACK_FOCUS = "rack_focus"


class TransitionType(Enum):
    """Scene transition types."""
    CUT = "cut"
    DISSOLVE = "dissolve"
    WIPE = "wipe"
    FADE_TO_BLACK = "fade_black"
    FADE_TO_WHITE = "fade_white"
    MATCH_CUT = "match_cut"
    J_CUT = "j_cut"
    L_CUT = "l_cut"
    SMASH_CUT = "smash_cut"
    CROSS_DISSOLVE = "cross_dissolve"
    IRIS = "iris"
    SLIDE = "slide"


class PacingType(Enum):
    """Pacing classifications for emotional rhythm."""
    SLOW = "slow"
    MEDIUM_SLOW = "medium_slow"
    MEDIUM = "medium"
    MEDIUM_FAST = "medium_fast"
    FAST = "fast"
    FRANTIC = "frantic"


class RhythmPattern(Enum):
    """Scene rhythm patterns."""
    BUILDING = "building"
    CRESCENDO = "crescendo"
    STACCATO = "staccato"
    LEGATO = "legato"
    CALM_BEFORE_STORM = "calm_before_storm"
    STEADY = "steady"
    VARIED = "varied"


class SceneContext(Enum):
    """Scene context classifications."""
    ESTABLISHING = "establishing"
    ACTION = "action"
    DIALOGUE = "dialogue"
    REFLECTION = "reflection"
    TRANSITION = "transition"
    MONTAGE = "montage"
    FLASHBACK = "flashback"
    CLIMAX = "climax"
    RESOLUTION = "resolution"


@dataclass
class ShotRecommendation:
    """Recommended shot with justification."""
    shot_class: ShotClass
    confidence: float
    reason: str
    camera_movement: Optional[CameraMovement] = None
    notes: List[str] = field(default_factory=list)


@dataclass
class CameraMoveTemplate:
    """Camera movement template with parameters."""
    movement: CameraMovement
    duration_seconds: float
    start_position: Tuple[float, float, float]
    end_position: Tuple[float, float, float]
    start_angle: Tuple[float, float]
    end_angle: Tuple[float, float]
    ease_type: str = "ease_in_out"
    notes: str = ""


@dataclass
class TransitionRecommendation:
    """Recommended transition with justification."""
    transition_type: TransitionType
    duration_seconds: float
    reason: str
    next_scene_context: Optional[SceneContext] = None


@dataclass
class PacingRecommendation:
    """Pacing and rhythm recommendations."""
    pacing: PacingType
    rhythm: RhythmPattern
    shot_duration_range: Tuple[float, float]
    movement_intensity: float  # 0-1
    notes: List[str] = field(default_factory=list)


@dataclass
class CinematicPlan:
    """Complete cinematic plan for a scene."""
    scene_context: SceneContext
    shot_sequence: List[ShotRecommendation]
    transitions: List[TransitionRecommendation]
    pacing: PacingRecommendation
    camera_movements: List[CameraMoveTemplate] = field(default_factory=list)
    
    # Emotional arc
    emotional_arc: List[str] = field(default_factory=list)
    tension_level: float = 0.5  # 0-1
    
    # Technical notes
    technical_notes: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)


@dataclass
class EmotionalBeat:
    """An emotional beat within a scene."""
    beat_number: int
    description: str
    emotion: str
    intensity: float  # 0-1
    recommended_shot: Optional[ShotClass] = None
    duration_estimate: float = 0.0
    notes: str = ""


@dataclass
class SceneRhythmAnalysis:
    """Analysis of scene rhythm and pacing."""
    total_duration_seconds: float
    pacing_type: PacingType
    rhythm_pattern: RhythmPattern
    beat_count: int
    intensity_peaks: List[int]  # Beat numbers
    intensity_valleys: List[int]  # Beat numbers
    
    # Shot distribution
    shot_distribution: Dict[ShotClass, int] = field(default_factory=dict)
    avg_shot_duration: float
    
    # Recommendations
    pacing_suggestions: List[str] = field(default_factory=list)
    shot_selection_notes: List[str] = field(default_factory=list)


class CinematicRequest(TypedDict):
    """Request structure for cinematic analysis."""
    scene_content: str
    scene_heading: str
    num_characters: int
    mood_keywords: List[str]
    previous_scene_context: Optional[str]
    genre: str


class CinematicResponse(TypedDict):
    """Response structure for cinematic analysis."""
    scene_context: str
    cinematic_plan: Dict
    shot_recommendations: List[Dict]
    pacing_recommendation: Dict
    transition_suggestions: List[Dict]
    emotional_beats: List[Dict]


# Mood to visual technique mappings
MOOD_VISUAL_MAP = {
    "tense": {"shot_class": ShotClass.CLOSE_UP, "pacing": PacingType.FAST, "camera_movement": CameraMovement.HANDHELD},
    "romantic": {"shot_class": ShotClass.MEDIUM_CLOSE, "pacing": PacingType.SLOW, "camera_movement": CameraMovement.DOLLY_IN},
    "action": {"shot_class": ShotClass.WIDE, "pacing": PacingType.FRANTIC, "camera_movement": CameraMovement.STEADICAM},
    "mysterious": {"shot_class": ShotClass.EXTREME_CLOSE_UP, "pacing": PacingType.MEDIUM_SLOW, "camera_movement": CameraMovement.STATIC},
    "happy": {"shot_class": ShotClass.FULL, "pacing": PacingType.MEDIUM_FAST, "camera_movement": CameraMovement.DOLLY_OUT},
    "sad": {"shot_class": ShotClass.CLOSE_UP, "pacing": PacingType.SLOW, "camera_movement": CameraMovement.TILT_DOWN},
    "neutral": {"shot_class": ShotClass.MEDIUM, "pacing": PacingType.MEDIUM, "camera_movement": CameraMovement.STATIC},
}


# Scene context keywords
CONTEXT_KEYWORDS = {
    SceneContext.ESTABLISHING: ["establishing", "wide shot", "landscape", "city", "outside"],
    SceneContext.ACTION: ["fight", "chase", "run", "battle", "action"],
    SceneContext.DIALOGUE: ["says", "speaks", "talks", "conversation", "dialogue"],
    SceneContext.REFLECTION: ["thinks", "remembers", "reflects", "alone", "quiet"],
    SceneContext.TRANSITION: ["cut to", "later", "meanwhile", "time passes"],
    SceneContext.MONTAGE: ["montage", "series", "quick cuts", "over days"],
    SceneContext.CLIMAX: ["finally", "confrontation", "peak", "climax", "final battle"],
    SceneContext.RESOLUTION: ["finally", "ending", "conclusion", "lives happily", "aftermath"],
}

