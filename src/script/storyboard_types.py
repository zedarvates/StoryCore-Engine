"""
Storyboard Types

Data structures for script-to-storyboard conversion.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class ShotType(Enum):
    """Types of shots for storyboard panels."""
    EXTREME_WIDE = "extreme_wide"
    WIDE = "wide"
    FULL = "full"
    MEDIUM = "medium"
    CLOSE_UP = "close_up"
    EXTREME_CLOSE_UP = "extreme_close_up"
    OVER_SHOULDER = "over_shoulder"
    POINT_OF_VIEW = "pov"
    TWO_SHOT = "two_shot"
    GROUP = "group"


class CameraMovement(Enum):
    """Camera movements for storyboard panels."""
    STATIC = "static"
    PAN_LEFT = "pan_left"
    PAN_RIGHT = "pan_right"
    TILT_UP = "tilt_up"
    TILT_DOWN = "tilt_down"
    ZOOM_IN = "zoom_in"
    ZOOM_OUT = "zoom_out"
    DOLLY_IN = "dolly_in"
    DOLLY_OUT = "dolly_out"
    TRACKING = "tracking"
    CRANE_UP = "crane_up"
    CRANE_DOWN = "crane_down"


class ScreenPosition(Enum):
    """Screen positions for character placement."""
    LEFT = "left"
    CENTER_LEFT = "center_left"
    CENTER = "center"
    CENTER_RIGHT = "center_right"
    RIGHT = "right"
    FOREGROUND = "foreground"
    BACKGROUND = "background"


class AspectRatio(Enum):
    """Aspect ratios for storyboard panels."""
    WIDESCREEN = "16:9"
    CINEMASCOPE = "2.39:1"
    STANDARD = "4:3"
    SQUARE = "1:1"
    PORTRAIT = "9:16"


@dataclass
class CharacterPosition:
    """Character position in a storyboard panel."""
    name: str
    position: ScreenPosition
    depth: int = 0
    size: str = "medium"
    facing: str = "front"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "position": self.position.value,
            "depth": self.depth,
            "size": self.size,
            "facing": self.facing
        }


@dataclass
class VisualElement:
    """Visual element in a storyboard panel."""
    type: str
    description: str
    position: Optional[str] = None
    importance: str = "background"
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.type,
            "description": self.description,
            "position": self.position,
            "importance": self.importance
        }


@dataclass
class StoryboardPanel:
    """A single storyboard panel."""
    panel_number: int
    scene_number: int
    shot_type: ShotType
    camera_movement: CameraMovement = CameraMovement.STATIC
    visual_description: str = ""
    lighting_description: str = ""
    mood: str = ""
    characters: List[CharacterPosition] = field(default_factory=list)
    visual_elements: List[VisualElement] = field(default_factory=list)
    estimated_duration_seconds: float = 0.0
    focal_length: int = 50
    aperture: str = "f/4"
    image_prompt: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "panel_number": self.panel_number,
            "scene_number": self.scene_number,
            "shot_type": self.shot_type.value,
            "camera_movement": self.camera_movement.value,
            "visual_description": self.visual_description,
            "lighting_description": self.lighting_description,
            "mood": self.mood,
            "characters": [c.to_dict() for c in self.characters],
            "visual_elements": [e.to_dict() for e in self.visual_elements],
            "estimated_duration_seconds": self.estimated_duration_seconds,
            "focal_length": self.focal_length,
            "aperture": self.aperture,
            "image_prompt": self.image_prompt
        }


@dataclass
class SceneStoryboard:
    """Storyboard for a complete scene."""
    scene_number: int
    scene_heading: str
    panels: List[StoryboardPanel] = field(default_factory=list)
    total_panels: int = 0
    total_duration_seconds: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_number": self.scene_number,
            "scene_heading": self.scene_heading,
            "total_panels": self.total_panels,
            "total_duration_seconds": round(self.total_duration_seconds, 1),
            "panels": [p.to_dict() for p in self.panels]
        }


@dataclass
class StoryboardReport:
    """Complete storyboard report for a script."""
    script_title: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    scene_storyboards: List[SceneStoryboard] = field(default_factory=list)
    total_panels: int = 0
    total_duration_seconds: float = 0.0
    total_duration_minutes: float = 0.0
    aspect_ratio: AspectRatio = AspectRatio.WIDESCREEN
    panel_style: str = "cinematic"
    shot_type_distribution: Dict[str, int] = field(default_factory=dict)
    character_coverage: Dict[str, int] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.script_title,
            "created_at": self.created_at.isoformat(),
            "total_panels": self.total_panels,
            "total_minutes": round(self.total_duration_minutes, 1),
            "aspect_ratio": self.aspect_ratio.value,
            "panel_style": self.panel_style,
            "shot_distribution": self.shot_type_distribution,
            "character_coverage": self.character_coverage,
            "scenes": [s.to_dict() for s in self.scene_storyboards]
        }


@dataclass
class StoryboardVisualization:
    """Visualization data for storyboard display."""
    panels_data: Dict[str, Any] = field(default_factory=dict)
    timeline_data: Dict[str, Any] = field(default_factory=dict)
    statistics_data: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "panels": self.panels_data,
            "timeline": self.timeline_data,
            "statistics": self.statistics_data
        }

