"""
Story Structure Types

Data structures for story structure analysis and visualization.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class StructureType(Enum):
    """Story structure types."""
    THREE_ACT = "three_act"
    FIVE_ACT = "five_act"
    HEROS_JOURNEY = "heros_journey"
    SAVE_THE_CAT = "save_the_cat"
    SEVEN_POINT = "seven_point"


class PlotPointType(Enum):
    """Types of plot points."""
    INCITING_INCIDENT = "inciting_incident"
    MIDPOINT = "midpoint"
    ALL_IS_LOST = "all_is_lost"
    CLIMAX = "climax"
    RESOLUTION = "resolution"


@dataclass
class PlotPoint:
    """A significant plot point in the story."""
    name: str
    point_type: PlotPointType
    chapter: int
    description: str
    tension_level: float
    characters_involved: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "type": self.point_type.value,
            "chapter": self.chapter,
            "tension": round(self.tension_level, 2),
        }


@dataclass
class Act:
    """A structural act in the story."""
    act_number: int
    name: str
    start_chapter: int
    end_chapter: int
    description: str
    key_events: List[str] = field(default_factory=list)
    tension_start: float = 0.0
    tension_end: float = 0.0
    themes: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "act_number": self.act_number,
            "name": self.name,
            "start": self.start_chapter,
            "end": self.end_chapter,
            "description": self.description,
        }


@dataclass
class CharacterArc:
    """A character's journey through the story."""
    character_name: str
    role: str
    arc_type: str
    starting_state: str
    ending_state: str
    key_moments: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "character": self.character_name,
            "role": self.role,
            "arc_type": self.arc_type,
        }


@dataclass
class Theme:
    """A theme identified in the story."""
    name: str
    strength: float
    occurrences: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "strength": round(self.strength, 2),
        }


@dataclass
class TensionPoint:
    """A tension measurement at a specific point."""
    chapter: int
    tension_level: float
    event_summary: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "chapter": self.chapter,
            "tension": round(self.tension_level, 2),
            "event": self.event_summary
        }


@dataclass
class StoryStructureAnalysis:
    """Complete story structure analysis."""
    title: str = ""
    genre: str = ""
    total_chapters: int = 0
    structure_type: Optional[StructureType] = None
    acts: List[Act] = field(default_factory=list)
    plot_points: List[PlotPoint] = field(default_factory=list)
    character_arcs: List[CharacterArc] = field(default_factory=list)
    themes: List[Theme] = field(default_factory=list)
    tension_curve: List[TensionPoint] = field(default_factory=list)
    overall_tension_trend: str = ""
    complexity_score: float = 0.0
    pacing_assessment: str = ""
    analyzed_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.title,
            "genre": self.genre,
            "chapters": self.total_chapters,
            "structure": self.structure_type.value if self.structure_type else None,
            "acts": [a.to_dict() for a in self.acts],
            "plot_points": [p.to_dict() for p in self.plot_points],
            "themes": [t.to_dict() for t in self.themes],
            "trend": self.overall_tension_trend,
            "analyzed_at": self.analyzed_at.isoformat()
        }


@dataclass
class VisualizationData:
    """Data formatted for visualization libraries."""
    tension_chart: Dict[str, Any] = field(default_factory=dict)
    structure_chart: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "tension_chart": self.tension_chart,
            "structure_chart": self.structure_chart,
        }

