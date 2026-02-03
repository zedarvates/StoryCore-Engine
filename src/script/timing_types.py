"""
Scene Timing Estimation Types

Data structures for script timing analysis.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class TimingUnit(Enum):
    """Timing unit types."""
    SECONDS = "seconds"
    MINUTES = "minutes"
    PAGES = "pages"


class ComplexityLevel(Enum):
    """Scene complexity levels."""
    SIMPLE = "simple"
    MODERATE = "moderate"
    COMPLEX = "complex"
    VERY_COMPLEX = "very_complex"


class ActionIntensity(Enum):
    """Action intensity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


class DialogueSpeed(Enum):
    """Dialogue delivery speeds."""
    SLOW = 2.5
    NORMAL = 3.0
    FAST = 3.5
    VERY_FAST = 4.0


@dataclass
class DialogueTiming:
    """Dialogue timing breakdown."""
    word_count: int = 0
    estimated_seconds: float = 0.0
    dialogue_lines: int = 0
    speakers: List[str] = field(default_factory=list)
    speed_setting: DialogueSpeed = DialogueSpeed.NORMAL
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "words": self.word_count,
            "seconds": round(self.estimated_seconds, 1),
            "lines": self.dialogue_lines,
            "speakers": self.speakers,
            "speed": self.speed_setting.name
        }


@dataclass
class ActionTiming:
    """Action timing breakdown."""
    line_count: int = 0
    estimated_seconds: float = 0.0
    intensity: ActionIntensity = ActionIntensity.MEDIUM
    movements: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "lines": self.line_count,
            "seconds": round(self.estimated_seconds, 1),
            "intensity": self.intensity.value,
            "movements": self.movements
        }


@dataclass
class SceneComplexity:
    """Scene complexity assessment."""
    level: ComplexityLevel = ComplexityLevel.MODERATE
    score: float = 0.5
    factors: List[str] = field(default_factory=list)
    adjustment_factor: float = 1.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "level": self.level.value,
            "score": round(self.score, 2),
            "factors": self.factors,
            "adjustment": round(self.adjustment_factor, 2)
        }


@dataclass
class SceneTiming:
    """Timing estimate for a single scene."""
    scene_number: int
    scene_heading: str
    total_lines: int = 0
    word_count: int = 0
    dialogue_timing: DialogueTiming = field(default_factory=DialogueTiming)
    action_timing: ActionTiming = field(default_factory=ActionTiming)
    complexity: SceneComplexity = field(default_factory=SceneComplexity)
    estimated_duration_seconds: float = 0.0
    estimated_pages: float = 0.0
    dialogue_seconds: float = 0.0
    action_seconds: float = 0.0
    transition_seconds: float = 5.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_number": self.scene_number,
            "heading": self.scene_heading,
            "lines": self.total_lines,
            "words": self.word_count,
            "dialogue_seconds": round(self.dialogue_seconds, 1),
            "action_seconds": round(self.action_seconds, 1),
            "total_seconds": round(self.estimated_duration_seconds, 1),
            "total_minutes": round(self.estimated_duration_seconds / 60, 2),
            "pages": round(self.estimated_pages, 2),
            "complexity": self.complexity.to_dict()
        }


@dataclass
class ScriptTimingReport:
    """Complete script timing report."""
    script_title: str = ""
    analyzed_at: datetime = field(default_factory=datetime.now)
    scene_timings: List[SceneTiming] = field(default_factory=list)
    total_scenes: int = 0
    total_duration_seconds: float = 0.0
    total_duration_minutes: float = 0.0
    estimated_pages: float = 0.0
    avg_scene_duration: float = 0.0
    longest_scene: Optional[SceneTiming] = None
    shortest_scene: Optional[SceneTiming] = None
    total_dialogue_seconds: float = 0.0
    total_action_seconds: float = 0.0
    dialogue_percentage: float = 0.0
    action_percentage: float = 0.0
    complexity_distribution: Dict[str, int] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.script_title,
            "total_scenes": self.total_scenes,
            "total_minutes": round(self.total_duration_minutes, 1),
            "estimated_pages": round(self.estimated_pages, 1),
            "dialogue_minutes": round(self.total_dialogue_seconds / 60, 1),
            "action_minutes": round(self.total_action_seconds / 60, 1),
            "dialogue_pct": round(self.dialogue_percentage, 1),
            "action_pct": round(self.action_percentage, 1),
            "avg_scene_minutes": round(self.avg_scene_duration / 60, 1),
            "complexity_distribution": self.complexity_distribution,
            "scenes": [s.to_dict() for s in self.scene_timings],
            "analyzed_at": self.analyzed_at.isoformat()
        }


@dataclass
class TimingVisualization:
    """Visualization data for timing."""
    timeline_data: Dict[str, Any] = field(default_factory=dict)
    breakdown_data: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "timeline": self.timeline_data,
            "breakdown": self.breakdown_data
        }

