"""
Video Processing Data Models

This module defines data models for video processing endpoints.
"""

from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List
from datetime import datetime


@dataclass
class VideoShot:
    """Represents a video shot for assembly."""
    shot_id: str
    video_path: str
    start_time_seconds: float = 0.0
    end_time_seconds: Optional[float] = None
    duration_seconds: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VideoAssembleRequest:
    """Request to assemble video from shots."""
    project_name: str
    shots: List[VideoShot]
    output_path: str
    output_format: str = "mp4"
    resolution: str = "1920x1080"
    framerate: int = 30
    codec: str = "h264"
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VideoAssembleResult:
    """Result of video assembly."""
    video_path: str
    project_name: str
    total_shots: int
    duration_seconds: float
    resolution: str
    framerate: int
    format: str
    file_size_bytes: int
    processing_time_ms: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VideoTransition:
    """Represents a video transition."""
    transition_type: str  # "fade", "dissolve", "wipe", "cut"
    duration_seconds: float
    parameters: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TransitionAddRequest:
    """Request to add transition between shots."""
    video_path: str
    shot_index: int  # Index of shot after which to add transition
    transition: VideoTransition
    output_path: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TransitionAddResult:
    """Result of adding transition."""
    video_path: str
    original_path: str
    shot_index: int
    transition_type: str
    transition_duration_seconds: float
    total_duration_seconds: float
    processing_time_ms: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VideoEffect:
    """Represents a video effect."""
    effect_type: str  # "color_grade", "blur", "sharpen", "stabilize", "speed", "reverse"
    parameters: Dict[str, Any] = field(default_factory=dict)
    start_time_seconds: Optional[float] = None
    end_time_seconds: Optional[float] = None


@dataclass
class EffectsApplyRequest:
    """Request to apply video effects."""
    video_path: str
    effects: List[VideoEffect]
    output_path: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class EffectsApplyResult:
    """Result of applying effects."""
    video_path: str
    original_path: str
    effects_applied: int
    duration_seconds: float
    processing_time_ms: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VideoRenderRequest:
    """Request to render final video."""
    project_name: str
    video_path: str
    output_path: str
    output_format: str = "mp4"
    resolution: str = "1920x1080"
    framerate: int = 30
    codec: str = "h264"
    bitrate: Optional[str] = None  # e.g., "5M", "10M"
    quality: str = "high"  # "low", "medium", "high", "ultra"
    audio_codec: Optional[str] = None
    audio_bitrate: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VideoRenderResult:
    """Result of video rendering."""
    video_path: str
    project_name: str
    duration_seconds: float
    resolution: str
    framerate: int
    format: str
    codec: str
    bitrate: str
    file_size_bytes: int
    rendering_time_ms: float
    quality_score: float  # 0.0 to 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VideoPreviewRequest:
    """Request to generate video preview."""
    video_path: str
    output_path: Optional[str] = None
    resolution: str = "640x360"
    framerate: int = 15
    quality: str = "low"
    max_duration_seconds: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VideoPreviewResult:
    """Result of preview generation."""
    preview_path: str
    original_path: str
    duration_seconds: float
    resolution: str
    framerate: int
    file_size_bytes: int
    compression_ratio: float
    generation_time_ms: float
    metadata: Dict[str, Any] = field(default_factory=dict)
