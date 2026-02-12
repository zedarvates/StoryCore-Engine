"""
Video Editor Types for StoryCore

Comprehensive type definitions for the video/image editor with CapCut-like features.
Supports multi-track timeline, effects, transitions, text, and AI features.

Author: StoryCore Team
Version: 1.0.0
"""

from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
import uuid


# =============================================================================
# Enums
# =============================================================================

class EditorMode(Enum):
    """Editor mode selection."""
    VIDEO = "video"
    IMAGE = "image"
    AUDIO = "audio"


class TrackType(Enum):
    """Types of tracks in the timeline."""
    VIDEO = "video"
    AUDIO = "audio"
    TEXT = "text"
    EFFECTS = "effects"
    TRANSITIONS = "transitions"
    OVERLAY = "overlay"


class BlendMode(Enum):
    """Video blend modes."""
    NORMAL = "normal"
    MULTIPLY = "multiply"
    SCREEN = "screen"
    OVERLAY = "overlay"
    DARKEN = "darken"
    LIGHTEN = "lighten"
    COLOR_DODGE = "color_dodge"
    COLOR_BURN = "color_burn"
    HARD_LIGHT = "hard_light"
    SOFT_LIGHT = "soft_light"
    DIFFERENCE = "difference"
    EXCLUSION = "exclusion"
    HUE = "hue"
    SATURATION = "saturation"
    COLOR = "color"
    LUMINOSITY = "luminosity"


class ExportFormat(Enum):
    """Video export formats."""
    MP4 = "mp4"
    WEBM = "webm"
    MOV = "mov"
    GIF = "gif"
    MKV = "mkv"


class ExportCodec(Enum):
    """Video codec options."""
    H264 = "libx264"
    H265 = "libx265"
    VP9 = "libvpx-vp9"
    AV1 = "libaom-av1"
    PRORES = "prores_ks"
    GIF = "gif"


class AspectRatio(Enum):
    """Aspect ratio presets."""
    RATIO_16_9 = (16, 9)  # YouTube, standard
    RATIO_9_16 = (9, 16)  # TikTok, Reels, Shorts
    RATIO_1_1 = (1, 1)    # Instagram square
    RATIO_4_5 = (4, 5)    # Instagram portrait
    RATIO_4_3 = (4, 3)    # Standard TV
    RATIO_21_9 = (21, 9)  # Ultrawide
    RATIO_9_21 = (9, 21)  # Vertical ultrawide
    FREE = (0, 0)         # Custom


class TransitionType(Enum):
    """Transition types."""
    FADE = "fade"
    DISSOLVE = "dissolve"
    WIPE = "wipe"
    SLIDE = "slide"
    ZOOM = "zoom"
    BLUR = "blur"
    SLIDE_LEFT = "slide_left"
    SLIDE_RIGHT = "slide_right"
    SLIDE_UP = "slide_up"
    SLIDE_DOWN = "slide_down"
    FADE_TO_BLACK = "fade_to_black"
    FADE_TO_WHITE = "fade_to_white"


class TextAnimationType(Enum):
    """Text animation types."""
    NONE = "none"
    FADE_IN = "fade_in"
    FADE_OUT = "fade_out"
    SLIDE_IN_LEFT = "slide_in_left"
    SLIDE_IN_RIGHT = "slide_in_right"
    SLIDE_IN_TOP = "slide_in_top"
    SLIDE_IN_BOTTOM = "slide_in_bottom"
    SLIDE_OUT_LEFT = "slide_out_left"
    SLIDE_OUT_RIGHT = "slide_out_right"
    TYPEWRITER = "typewriter"
    BOUNCE = "bounce"
    SCALE_IN = "scale_in"
    SCALE_OUT = "scale_out"
    ROTATE_IN = "rotate_in"


class FilterType(Enum):
    """Video/image filter types."""
    NONE = "none"
    BLACK_WHITE = "black_white"
    SEPIA = "sepia"
    VINTAGE = "vintage"
    COLD = "cold"
    WARM = "warm"
    VIVID = "vivid"
    NOIR = "noir"
    VIGNETTE = "vignette"
    BLUR = "blur"
    SHARPEN = "sharpen"
    GAUSS = "gauss"
    EMBOSS = "emboss"
    EDGE_DETECT = "edge_detect"


class AudioTransitionType(Enum):
    """Audio transition types."""
    CROSSFADE = "crossfade"
    FADE_IN = "fade_in"
    FADE_OUT = "fade_out"


class ExportPreset(Enum):
    """Social media export presets."""
    YOUTUBE_1080P = "youtube_1080p"
    YOUTUBE_4K = "youtube_4k"
    TIKTOK = "tiktok"
    INSTAGRAM_FEED = "instagram_feed"
    INSTAGRAM_STORY = "instagram_story"
    REELS = "reels"
    TWITTER = "twitter"
    FACEBOOK = "facebook"
    LINKEDIN = "linkedin"
    CUSTOM = "custom"


# =============================================================================
# Data Classes - Core Objects
# =============================================================================

@dataclass
class TimeRange:
    """Time range for clips and regions."""
    start: float  # Start time in seconds
    duration: float  # Duration in seconds
    
    @property
    def end(self) -> float:
        return self.start + self.duration
    
    def overlaps(self, other: 'TimeRange') -> bool:
        return self.start < other.end and self.end > other.start
    
    def contains(self, time: float) -> bool:
        return self.start <= time <= self.end
    
    def trim(self, new_start: float, new_end: float) -> 'TimeRange':
        """Create a trimmed version of this range."""
        return TimeRange(
            start=max(self.start, new_start),
            duration=min(self.end, new_end) - max(self.start, new_start)
        )


@dataclass
class Resolution:
    """Video/image resolution."""
    width: int
    height: int
    
    @property
    def aspect_ratio(self) -> float:
        return self.width / self.height
    
    def __str__(self) -> str:
        return f"{self.width}x{self.height}"


@dataclass
class MediaMetadata:
    """Metadata for media files."""
    path: str
    filename: str
    file_type: str  # video, audio, image
    format: str
    duration: Optional[float] = None
    resolution: Optional[Resolution] = None
    frame_rate: Optional[float] = None
    codec: Optional[str] = None
    audio_codec: Optional[str] = None
    bitrate: Optional[int] = None
    file_size: int = 0
    thumbnail_path: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    modified_at: datetime = field(default_factory=datetime.now)


@dataclass
class Transform:
    """Transform properties for clips."""
    position_x: float = 0.0  # X position (percentage or pixels)
    position_y: float = 0.0  # Y position (percentage or pixels)
    scale_x: float = 1.0  # Scale factor X
    scale_y: float = 1.0  # Scale factor Y
    rotation: float = 0.0  # Rotation in degrees
    anchor_x: float = 0.5  # Anchor point X (0-1)
    anchor_y: float = 0.5  # Anchor point Y (0-1)
    opacity: float = 1.0  # Opacity (0-1)


@dataclass
class Keyframe:
    """Animation keyframe."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    time: float = 0.0  # Time in seconds
    property_name: str = ""
    value: float = 0.0
    easing: str = "linear"  # linear, ease_in, ease_out, ease_in_out, bezier
    bezier_control_points: Optional[Tuple[float, float, float, float]] = None  # cp1x, cp1y, cp2x, cp2y


@dataclass
class ColorCorrection:
    """Color correction settings."""
    brightness: float = 0.0  # -100 to 100
    contrast: float = 0.0  # -100 to 100
    saturation: float = 0.0  # -100 to 100
    hue: float = 0.0  # -180 to 180
    temperature: float = 0.0  # -100 to 100 (warm/cool)
    tint: float = 0.0  # -100 to 100
    highlights: float = 0.0  # -100 to 100
    shadows: float = 0.0  # -100 to 100
    whites: float = 0.0  # -100 to 100
    blacks: float = 0.0  # -100 to 100
    gamma: float = 1.0  # 0.1 to 3.0
    exposure: float = 0.0  # -5 to 5


@dataclass
class Filter:
    """Video/image filter."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    type: FilterType = FilterType.NONE
    intensity: float = 1.0  # 0 to 1
    parameters: Dict[str, float] = field(default_factory=dict)


@dataclass
class Transition:
    """Transition between clips."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    type: TransitionType = TransitionType.FADE
    duration: float = 0.5  # seconds
    easing: str = "ease_in_out"
    direction: str = "right"  # for directional transitions
    audio_fade: bool = True
    audio_fade_duration: float = 0.25


@dataclass
class TextStyle:
    """Text styling properties."""
    font_family: str = "Arial"
    font_size: int = 48
    font_weight: str = "normal"  # normal, bold
    font_style: str = "normal"  # normal, italic
    text_color: str = "#FFFFFF"
    background_color: Optional[str] = None
    outline_color: Optional[str] = None
    outline_width: float = 0
    shadow_color: Optional[str] = "#000000"
    shadow_offset_x: float = 2
    shadow_offset_y: float = 2
    shadow_blur: float = 4
    letter_spacing: int = 0
    line_spacing: float = 1.0
    alignment: str = "center"  # left, center, right
    vertical_alignment: str = "middle"  # top, middle, bottom


@dataclass
class TextAnimation:
    """Text animation settings."""
    type: TextAnimationType = TextAnimationType.NONE
    duration: float = 0.5
    delay: float = 0
    easing: str = "ease_out"
    character_delay: float = 0.05  # for typewriter effect


@dataclass
class TextLayer:
    """Text layer on the timeline."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Text Layer"
    track_id: str = ""
    start_time: float = 0.0
    duration: float = 5.0
    content: str = ""
    style: TextStyle = field(default_factory=TextStyle)
    animation: TextAnimation = field(default_factory=TextAnimation)
    transform: Transform = field(default_factory=Transform)
    keyframes: List[Keyframe] = field(default_factory=list)
    locked: bool = False
    hidden: bool = False


@dataclass
class AudioTrack:
    """Audio track configuration."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Audio Track"
    track_type: TrackType = TrackType.AUDIO
    volume: float = 1.0  # 0 to 1
    pan: float = 0.0  # -1 to 1
    muted: bool = False
    solo: bool = False
    locked: bool = False
    hidden: bool = False
    height: int = 40
    color: str = "#50C878"
    effects: List[AudioEffect] = field(default_factory=list)


@dataclass
class AudioEffect:
    """Audio effect."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    type: str = "eq"  # eq, compressor, limiter, reverb, noise_reduction, etc.
    enabled: bool = True
    parameters: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AudioClip:
    """Audio clip on the timeline."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Audio Clip"
    track_id: str = ""
    media_path: str = ""
    start_time: float = 0.0  # Position on timeline
    media_start_time: float = 0.0  # Offset into media file
    duration: float = 5.0
    volume: float = 1.0
    fade_in: float = 0.0
    fade_out: float = 0.0
    pan: float = 0.0
    keyframes: List[Keyframe] = field(default_factory=list)
    waveform_data: Optional[List[float]] = None
    locked: bool = False
    hidden: bool = False


@dataclass
class VideoClip:
    """Video clip on the timeline."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Video Clip"
    track_id: str = ""
    media_path: str = ""
    start_time: float = 0.0  # Position on timeline
    media_start_time: float = 0.0  # Offset into media file
    duration: float = 5.0
    original_duration: float = 5.0
    transform: Transform = field(default_factory=Transform)
    color_correction: ColorCorrection = field(default_factory=ColorCorrection)
    filters: List[Filter] = field(default_factory=list)
    blend_mode: BlendMode = BlendMode.NORMAL
    speed: float = 1.0  # Playback speed multiplier
    reverse: bool = False
    keyframes: List[Keyframe] = field(default_factory=list)
    thumbnail_path: Optional[str] = None
    in_point: Optional[float] = None  # Trim start
    out_point: Optional[float] = None  # Trim end
    locked: bool = False
    hidden: bool = False
    opacity: float = 1.0


@dataclass
class ImageClip:
    """Image clip on the timeline."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Image"
    track_id: str = ""
    media_path: str = ""
    start_time: float = 0.0
    duration: float = 5.0
    transform: Transform = field(default_factory=Transform)
    color_correction: ColorCorrection = field(default_factory=ColorCorrection)
    filters: List[Filter] = field(default_factory=list)
    blend_mode: BlendMode = BlendMode.NORMAL
    keyframes: List[Keyframe] = field(default_factory=list)
    locked: bool = False
    hidden: bool = False
    opacity: float = 1.0


@dataclass
class OverlayClip:
    """Overlay/watermark clip."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Overlay"
    track_id: str = ""
    media_path: str = ""
    start_time: float = 0.0
    duration: float = 5.0
    transform: Transform = field(default_factory=Transform)
    opacity: float = 0.5
    blend_mode: BlendMode = BlendMode.NORMAL
    locked: bool = False
    hidden: bool = False


@dataclass
class Track:
    """Timeline track."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Track"
    type: TrackType = TrackType.VIDEO
    clips: List[Union[VideoClip, AudioClip, ImageClip, OverlayClip]] = field(default_factory=list)
    locked: bool = False
    hidden: bool = False
    muted: bool = False
    solo: bool = False
    height: int = 60
    color: str = "#4A90E2"


@dataclass
class SubtitleEntry:
    """Subtitle entry (SRT format)."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    start_time: float = 0.0
    end_time: float = 0.0
    text: str = ""
    position_x: float = 0.5  # Percentage (0-1)
    position_y: float = 0.9  # Percentage (0-1)
    style: Optional[TextStyle] = None


@dataclass
class Marker:
    """Timeline marker."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    time: float = 0.0
    name: str = ""
    description: str = ""
    color: str = "#FF0000"


@dataclass
class ChapterPoint:
    """Chapter point for navigation."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    time: float = 0.0
    title: str = ""
    thumbnail_path: Optional[str] = None


# =============================================================================
# Project & Export Classes
# =============================================================================

@dataclass
class EditorProject:
    """Video editor project."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Untitled Project"
    path: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    modified_at: datetime = field(default_factory=datetime.now)
    
    # Project settings
    resolution: Resolution = field(default_factory=lambda: Resolution(1920, 1080))
    frame_rate: float = 30.0
    aspect_ratio: AspectRatio = AspectRatio.RATIO_16_9
    sample_rate: int = 44100
    channels: int = 2
    
    # Timeline data
    duration: float = 0.0
    tracks: List[Track] = field(default_factory=list)
    
    # Media library
    media_items: List[MediaMetadata] = field(default_factory=list)
    
    # Subtitles
    subtitles: List[SubtitleEntry] = field(default_factory=list)
    
    # Markers and chapters
    markers: List[Marker] = field(default_factory=list)
    chapters: List[ChapterPoint] = field(default_factory=list)
    
    # Export history
    export_history: List[Dict[str, Any]] = field(default_factory=list)
    
    # Project metadata
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ExportSettings:
    """Export configuration."""
    format: ExportFormat = ExportFormat.MP4
    codec: ExportCodec = ExportCodec.H264
    resolution: Optional[Resolution] = None
    frame_rate: Optional[float] = None
    bitrate_mode: str = "crf"  # crf, vbr, cbr
    quality: int = 23  # CRF value (0-51, lower is better)
    video_bitrate: Optional[str] = None  # e.g., "8M"
    audio_codec: str = "aac"
    audio_bitrate: str = "192k"
    audio_sample_rate: int = 44100
    audio_channels: int = 2
    preset: Optional[ExportPreset] = None
    gpu_acceleration: bool = False
    gpu_encoder: str = "none"  # nvenc, amf, vaapi
    add_subtitles: bool = False
    subtitle_track_id: Optional[str] = None
    export_entire_timeline: bool = True
    time_range: Optional[TimeRange] = None
    output_path: Optional[str] = None


@dataclass
class ExportJob:
    """Export job for queue management."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str = ""
    settings: ExportSettings = field(default_factory=ExportSettings)
    status: str = "pending"  # pending, processing, completed, failed, cancelled
    progress: float = 0.0
    message: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    output_path: Optional[str] = None
    error: Optional[str] = None


@dataclass
class ExportQueue:
    """Export job queue."""
    jobs: List[ExportJob] = field(default_factory=list)
    concurrent_exports: int = 1


# =============================================================================
# AI Feature Classes
# =============================================================================

@dataclass
class AutoCaptionSettings:
    """Auto captioning settings."""
    enabled: bool = False
    language: str = "auto"  # auto, en, fr, es, etc.
    model_size: str = "base"  # tiny, base, small, medium, large
    add_speakers: bool = False
    max_line_length: int = 42
    min_line_length: int = 10


@dataclass
class SmartCropSettings:
    """Smart crop settings for aspect ratio conversion."""
    enabled: bool = False
    target_ratio: AspectRatio = AspectRatio.RATIO_9_16
    focus_point: Tuple[float, float] = (0.5, 0.5)  # Center default
    algorithm: str = "center"  # center, face_detection, motion
    smooth_factor: float = 0.3


@dataclass
class SceneDetectionSettings:
    """Scene detection settings."""
    enabled: bool = False
    threshold: float = 30.0  # Scene change threshold
    min_scene_duration: float = 1.0
    add_markers: bool = True


@dataclass
class SilenceDetectionSettings:
    """Silence detection settings."""
    enabled: bool = False
    threshold_db: float = -50.0
    min_silence_duration: float = 0.5
    remove_silence: bool = False
    add_markers: bool = True


@dataclass
class TTSettings:
    """Text-to-speech settings."""
    enabled: bool = False
    engine: str = "local"  # local, api
    voice: str = ""
    language: str = "en"
    speed: float = 1.0
    pitch: float = 1.0
    volume: float = 1.0


@dataclass
class AIFeatures:
    """AI features configuration."""
    auto_captions: AutoCaptionSettings = field(default_factory=AutoCaptionSettings)
    smart_crop: SmartCropSettings = field(default_factory=SmartCropSettings)
    scene_detection: SceneDetectionSettings = field(default_factory=SceneDetectionSettings)
    silence_detection: SilenceDetectionSettings = field(default_factory=SilenceDetectionSettings)
    text_to_speech: TTSettings = field(default_factory=TTSettings)
    background_removal: bool = False
    upscaling: bool = False


# =============================================================================
# Timeline Operations
# =============================================================================

@dataclass
class ClipOperation:
    """Single clip operation for undo/redo."""
    type: str  # add, remove, move, trim, split, update
    track_id: str
    clip_id: str
    old_data: Optional[Dict[str, Any]] = None
    new_data: Optional[Dict[str, Any]] = None
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class TimelineHistory:
    """Timeline history for undo/redo."""
    operations: List[ClipOperation] = field(default_factory=list)
    current_index: int = -1
    max_history: int = 50


@dataclass
class Selection:
    """Timeline selection state."""
    selected_clip_ids: List[str] = field(default_factory=list)
    selected_track_ids: List[str] = field(default_factory=list)
    selected_time_range: Optional[TimeRange] = None


# =============================================================================
# Import/Export Formats
# =============================================================================

@dataclass
class SRTEntry:
    """SRT subtitle entry."""
    index: int
    start_time: str  # HH:MM:SS,mmm
    end_time: str
    text: str
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "index": self.index,
            "start_time": self.start_time,
            "end_time": self.end_time,
            "text": self.text
        }


@dataclass
class ProjectTemplate:
    """Project template."""
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = ""
    description: str = ""
    category: str = ""  # intro, outro, social, etc.
    thumbnail_path: Optional[str] = None
    tracks: List[Track] = field(default_factory=list)
    duration: float = 0.0
    aspect_ratio: AspectRatio = AspectRatio.RATIO_16_9
    resolution: Optional[Resolution] = None


# =============================================================================
# Utility Functions
# =============================================================================

def generate_thumbnail_path(project_path: str, media_path: str) -> str:
    """Generate thumbnail path for a media file."""
    import hashlib
    media_hash = hashlib.md5(media_path.encode()).hexdigest()[:8]
    return str(Path(project_path) / "thumbnails" / f"{media_hash}.jpg")


def format_timecode(seconds: float, fps: float = 30.0) -> str:
    """Convert seconds to timecode string."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    frames = int((seconds % 1) * fps)
    return f"{hours:02d}:{minutes:02d}:{secs:02d}:{frames:02d}"


def parse_timecode(timecode: str, fps: float = 30.0) -> float:
    """Parse timecode string to seconds."""
    parts = timecode.split(":")
    if len(parts) == 4:
        hours, minutes, seconds, frames = parts
        return int(hours) * 3600 + int(minutes) * 60 + int(seconds) + int(frames) / fps
    elif len(parts) == 3:
        hours, minutes, seconds = parts
        return int(hours) * 3600 + int(minutes) * 60 + float(seconds)
    return 0.0


def seconds_to_srt_time(seconds: float) -> str:
    """Convert seconds to SRT time format."""
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int((seconds % 1) * 1000)
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def srt_time_to_seconds(time_str: str) -> float:
    """Parse SRT time to seconds."""
    parts = time_str.replace(",", ":").split(":")
    if len(parts) == 4:
        hours, minutes, seconds, millis = parts
        return int(hours) * 3600 + int(minutes) * 60 + int(seconds) + int(millis) / 1000
    return 0.0

