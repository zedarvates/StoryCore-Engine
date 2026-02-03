"""
Shot Breakdown Types

Data structures for script-to-shot conversion.

Author: StoryCore-Engine Team
Version: 1.0.0
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional


class ShotType(Enum):
    """Cinematic shot types."""
    EXTREME_WIDE_SHOT = "ews"
    WIDE_SHOT = "ws"
    FULL_SHOT = "fs"
    MEDIUM_SHOT = "ms"
    MEDIUM_CLOSE_UP = "mcu"
    CLOSE_UP = "cu"
    EXTREME_CLOSE_UP = "ecu"
    OVER_SHOULDER = "os"
    POINT_OF_VIEW = "pov"
    INSERT = "insert"
    CUTAWAY = "cutaway"
    ESTABLISHING = "est"
    TWO_SHOT = "two"
    GROUP_SHOT = "group"


class CameraMovement(Enum):
    """Camera movement types."""
    STATIC = "static"
    PAN_LEFT = "pan_left"
    PAN_RIGHT = "pan_right"
    TILT_UP = "tilt_up"
    TILT_DOWN = "tilt_down"
    DOLLY_IN = "dolly_in"
    DOLLY_OUT = "dolly_out"
    TRACKING = "tracking"
    CRANE_UP = "crane_up"
    CRANE_DOWN = "crane_down"
    ZOOM_IN = "zoom_in"
    ZOOM_OUT = "zoom_out"
    HANDHELD = "handheld"
    STEADICAM = "steadicam"


class CameraAngle(Enum):
    """Camera angle types."""
    EYE_LEVEL = "eye_level"
    LOW_ANGLE = "low_angle"
    HIGH_ANGLE = "high_angle"
    BIRD_EYE = "bird_eye"
    WORM_EYE = "worm_eye"
    DUTCH_ANGLE = "dutch_angle"


class ShotDuration(Enum):
    """Shot duration estimates."""
    VERY_SHORT = "very_short"
    SHORT = "short"
    MEDIUM = "medium"
    LONG = "long"
    EXTENDED = "extended"


@dataclass
class ShotContent:
    """Content description for a shot."""
    action_description: str = ""
    dialogue: Optional[str] = None
    characters: List[str] = field(default_factory=list)
    props: List[str] = field(default_factory=list)
    location_hint: str = ""
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "action": self.action_description,
            "dialogue": self.dialogue,
            "characters": self.characters,
            "props": self.props,
            "location": self.location_hint
        }


@dataclass
class Shot:
    """A single shot in the breakdown."""
    shot_number: int
    scene_number: int
    shot_type: ShotType
    camera_movement: CameraMovement = CameraMovement.STATIC
    camera_angle: CameraAngle = CameraAngle.EYE_LEVEL
    content: ShotContent = field(default_factory=ShotContent)
    estimated_duration: float = 5.0
    duration_category: ShotDuration = ShotDuration.MEDIUM
    description: str = ""
    camera_notes: str = ""
    lighting_notes: str = ""
    confidence: float = 0.8
    reasoning: List[str] = field(default_factory=list)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "shot_number": self.shot_number,
            "scene_number": self.scene_number,
            "shot_type": self.shot_type.value,
            "camera_movement": self.camera_movement.value,
            "camera_angle": self.camera_angle.value,
            "content": self.content.to_dict(),
            "duration": self.estimated_duration,
            "description": self.description,
            "confidence": round(self.confidence, 2),
        }


@dataclass
class SceneShotBreakdown:
    """Shot breakdown for a single scene."""
    scene_number: int
    scene_heading: str
    shots: List[Shot] = field(default_factory=list)
    total_duration: float = 0.0
    shot_count: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "scene_number": self.scene_number,
            "scene_heading": self.scene_heading,
            "shots": [s.to_dict() for s in self.shots],
            "total_duration": round(self.total_duration, 1),
            "shot_count": self.shot_count
        }


@dataclass
class ShotBreakdownAnalysis:
    """Complete shot breakdown analysis for a script."""
    script_title: str = ""
    total_scenes: int = 0
    total_shots: int = 0
    scene_breakdowns: List[SceneShotBreakdown] = field(default_factory=list)
    total_duration: float = 0.0
    avg_shots_per_scene: float = 0.0
    avg_shot_duration: float = 0.0
    shot_type_counts: Dict[str, int] = field(default_factory=dict)
    camera_movement_counts: Dict[str, int] = field(default_factory=dict)
    key_shots: List[Shot] = field(default_factory=list)
    analyzed_at: datetime = field(default_factory=datetime.now)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.script_title,
            "total_scenes": self.total_scenes,
            "total_shots": self.total_shots,
            "total_duration_minutes": round(self.total_duration / 60, 1),
            "shot_distribution": self.shot_type_counts,
            "scene_breakdowns": [sb.to_dict() for sb in self.scene_breakdowns],
            "analyzed_at": self.analyzed_at.isoformat()
        }


@dataclass
class ShotListExport:
    """Export format for shot list."""
    script_title: str = ""
    export_format: str = "csv"
    rows: List[Dict[str, Any]] = field(default_factory=list)
    
    def to_csv(self) -> str:
        if not self.rows:
            return ""
        headers = ["Shot", "Scene", "Type", "Movement", "Angle", "Duration", "Description"]
        lines = [",".join(headers)]
        for row in self.rows:
            line = [
                str(row.get("shot_number", "")),
                str(row.get("scene_number", "")),
                row.get("shot_type", ""),
                row.get("camera_movement", ""),
                row.get("camera_angle", ""),
                str(row.get("estimated_duration", "")),
                row.get("description", "").replace(",", ";")
            ]
            lines.append(",".join(line))
        return "\n".join(lines)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "title": self.script_title,
            "format": self.export_format,
            "row_count": len(self.rows)
        }

