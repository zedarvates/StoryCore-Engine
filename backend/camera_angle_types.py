"""
StoryCore-Engine Camera Angle Editor Types

This module defines the types, enums, and Pydantic models for the camera angle
editor feature. Supports AI-powered camera angle transformations for images.

Requirements: Q1 2026 - Camera Angle Editor Feature
"""

from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field


# ============================================================================
# Enums
# ============================================================================

class CameraAnglePreset(str, Enum):
    """Camera angle preset identifiers (Legacy / Shortcuts)"""
    FRONT = "front"
    LEFT = "left"
    RIGHT = "right"
    SIDE_LEFT = "side_left"
    SIDE_RIGHT = "side_right"
    THREE_QUARTER = "three_quarter"
    TOP = "top"
    BOTTOM = "bottom"
    ISOMETRIC = "isometric"
    BACK = "back"
    CLOSE_UP = "close_up"
    WIDE_SHOT = "wide_shot"
    BIRD_EYE = "bird_eye"
    WORM_EYE = "worm_eye"


class LensType(str, Enum):
    """Camera lens/objective types and characteristics"""
    STANDARD = "standard"
    ANAMORPHIC_CLASSIC = "anamorphic_classic"
    ANAMORPHIC_DELRAMA = "anamorphic_delrama"
    VINTAGE_8MM = "vintage_8mm"
    MACRO_DIOPTER = "macro_diopter"


class Azimuth(str, Enum):
    """Horizontal rotation angles"""
    FRONT = "front view shot"
    FRONT_LEFT = "front-left side view shot"
    LEFT = "left side view shot"
    BACK_LEFT = "back-left side view shot"
    BACK = "back side view shot"
    BACK_RIGHT = "back-right side view shot"
    RIGHT = "right side view shot"
    FRONT_RIGHT = "front-right side view shot"


class Elevation(str, Enum):
    """Vertical rotation angles"""
    EYE_LEVEL = "eye level shot"
    LOW_ANGLE = "low angle shot"
    HIGH_ANGLE = "high angle shot"


class Distance(str, Enum):
    """Camera distance settings"""
    CLOSEUP = "closeup"
    MEDIUM = "medium shot"
    WIDE = "wide shot"


class CameraAngleJobStatus(str, Enum):
    """Camera angle generation job status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


# ============================================================================
# Camera Angle Preset Metadata
# ============================================================================

CAMERA_ANGLE_PRESET_METADATA: Dict[str, Dict[str, str]] = {
    CameraAnglePreset.FRONT.value: {
        "display_name": "Front View",
        "description": "Direct front-facing camera, eye-level shot",
        "icon": "camera_front",
        "prompt_suffix": "front view, facing the camera directly, eye-level shot"
    },
    CameraAnglePreset.LEFT.value: {
        "display_name": "Left View",
        "description": "Profile shot from the left, 90-degree angle",
        "icon": "camera_side",
        "prompt_suffix": "left side view, profile shot from the left, 90-degree angle"
    },
    CameraAnglePreset.SIDE_LEFT.value: {
        "display_name": "Side Left",
        "description": "Profile shot from the left side",
        "icon": "camera_side",
        "prompt_suffix": "left side view, side profile from left"
    },
    CameraAnglePreset.RIGHT.value: {
        "display_name": "Right View",
        "description": "Profile shot from the right, 90-degree angle",
        "icon": "camera_side",
        "prompt_suffix": "right side view, profile shot from the right, 90-degree angle"
    },
    CameraAnglePreset.SIDE_RIGHT.value: {
        "display_name": "Side Right",
        "description": "Profile shot from the right side",
        "icon": "camera_side",
        "prompt_suffix": "right side view, side profile from right"
    },
    CameraAnglePreset.THREE_QUARTER.value: {
        "display_name": "Three-Quarter View",
        "description": "45-degree angle between front and side",
        "icon": "camera_three_quarter",
        "prompt_suffix": "three-quarter view, 45-degree angle from front"
    },
    CameraAnglePreset.TOP.value: {
        "display_name": "Top View",
        "description": "Overhead shot, looking down from above",
        "icon": "camera_top",
        "prompt_suffix": "top-down view, overhead shot, bird's eye view, looking down"
    },
    CameraAnglePreset.BOTTOM.value: {
        "display_name": "Bottom View",
        "description": "Low angle view, looking up from below",
        "icon": "camera_bottom",
        "prompt_suffix": "low angle view, looking up, worm's eye view"
    },
    CameraAnglePreset.ISOMETRIC.value: {
        "display_name": "Isometric View",
        "description": "3D isometric perspective, diagonal angle",
        "icon": "camera_isometric",
        "prompt_suffix": "isometric view, 3D isometric perspective, diagonal angle"
    },
    CameraAnglePreset.BACK.value: {
        "display_name": "Back View",
        "description": "Rear perspective, from behind",
        "icon": "camera_back",
        "prompt_suffix": "rear view, from behind, back perspective"
    },
    CameraAnglePreset.CLOSE_UP.value: {
        "display_name": "Close-up",
        "description": "Zoomed-in detail view, macro shot",
        "icon": "camera_closeup",
        "prompt_suffix": "extreme close-up, macro shot, detailed view"
    },
    CameraAnglePreset.WIDE_SHOT.value: {
        "display_name": "Wide Shot",
        "description": "Pulled-back establishing view, full scene",
        "icon": "camera_wide",
        "prompt_suffix": "wide shot, establishing shot, full scene view, pulled back"
    },
    CameraAnglePreset.BIRD_EYE.value: {
        "display_name": "Bird's Eye View",
        "description": "High overhead view from far above",
        "icon": "camera_birdeye",
        "prompt_suffix": "bird's eye view, aerial view, high overhead shot"
    },
    CameraAnglePreset.WORM_EYE.value: {
        "display_name": "Worm's Eye View",
        "description": "Extreme low angle, ground level looking up",
        "icon": "camera_wormeye",
        "prompt_suffix": "worm's eye view, ground level shot, extreme low angle looking up"
    }
}


# ============================================================================
# Lens Metadata
# ============================================================================

LENS_TYPE_METADATA: Dict[str, Dict[str, str]] = {
    LensType.STANDARD.value: {
        "display_name": "Standard Spherical",
        "description": "Standard modern lens with natural perspective",
        "prompt_suffix": "standard spherical lens, natural perspective, clean optics"
    },
    LensType.ANAMORPHIC_CLASSIC.value: {
        "display_name": "Classic Anamorphic",
        "description": "Cylindrical anamorphic lens with oval bokeh and horizontal flares",
        "prompt_suffix": "anamorphic lens, cinematic widescreen, oval bokeh, blue horizontal lens flares, 2.39:1 aspect ratio"
    },
    LensType.ANAMORPHIC_DELRAMA.value: {
        "display_name": "Delrama (Prismatic)",
        "description": "Rare Oud Delft prismatic anamorphic adapter. 1.5x squeeze, surgical corner-to-corner sharpness, zero distortion, unique prismatic artifacts",
        "prompt_suffix": "shot through Delrama Oud Delft prism anamorphic adapter, 1.5x anamorphic squeeze, prismatic optics, surgical sharpness, zero distortion, no horizontal flares, unique prismatic light artifacts, technirama style"
    },
    LensType.VINTAGE_8MM.value: {
        "display_name": "Vintage 8mm",
        "description": "Classic home movie look, soft edges, visible grain, slight vignetting",
        "prompt_suffix": "vintage 8mm film look, old home movie, soft edges, heavy film grain, slight vignetting, aged color palette"
    },
    LensType.MACRO_DIOPTER.value: {
        "display_name": "Macro Diopter",
        "description": "Extended close-up capability using magnifying lenses",
        "prompt_suffix": "macro photography, shot with diopter close-up lens, extremely shallow depth of field, detailed textures"
    }
}


# ============================================================================
# Request Models
# ============================================================================

class GranularAngle(BaseModel):
    """Specific camera angle with multi-angle LoRA parameters"""
    azimuth: Azimuth = Field(default=Azimuth.FRONT)
    elevation: Elevation = Field(default=Elevation.EYE_LEVEL)
    distance: Distance = Field(default=Distance.MEDIUM)


class CameraAngleRequest(BaseModel):
    """Request model for camera angle generation"""
    image_base64: str = Field(
        ...,
        description="Base64 encoded source image"
    )
    angle_ids: Optional[List[CameraAnglePreset]] = Field(
        default=None,
        description="List of camera angle presets (Legacy)"
    )
    granular_angles: Optional[List[GranularAngle]] = Field(
        default=None,
        description="List of specific granular angles to generate"
    )
    preserve_style: bool = Field(
        default=True,
        description="Maintain original image style in generated variations"
    )
    quality: str = Field(
        default="standard",
        description="Generation quality: draft, standard, or high"
    )
    seed: Optional[int] = Field(
        default=None,
        description="Random seed for reproducible generation"
    )
    custom_prompt: Optional[str] = Field(
        default=None,
        description="Additional custom prompt to append to angle prompts"
    )
    lens_type: LensType = Field(
        default=LensType.STANDARD,
        description="Type of lens/objective to simulate"
    )
    comfyui_url: Optional[str] = Field(
        default=None,
        description="Optional ComfyUI server URL to use for this request"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "image_base64": "data:image/png;base64,iVBORw0KGgo...",
                "angle_ids": ["front", "left", "isometric"],
                "preserve_style": True,
                "quality": "standard",
                "seed": 42,
                "custom_prompt": "cinematic lighting, 4k quality"
            }
        }


# ============================================================================
# Job Models
# ============================================================================

class CameraAngleJob(BaseModel):
    """Camera angle generation job model"""
    id: str = Field(..., description="Unique job identifier")
    user_id: str = Field(..., description="User who created the job")
    image_base64: str = Field(..., description="Source image (base64)")
    angle_ids: List[CameraAnglePreset] = Field(default=[], description="Angles to generate (presets)")
    granular_angles: List[GranularAngle] = Field(default=[], description="Granular angles to generate")
    preserve_style: bool = Field(default=True, description="Style preservation flag")
    quality: str = Field(default="standard", description="Generation quality")
    seed: Optional[int] = Field(default=None, description="Random seed")
    custom_prompt: Optional[str] = Field(default=None, description="Custom prompt")
    lens_type: LensType = Field(default=LensType.STANDARD, description="Lens type")
    comfyui_url: Optional[str] = Field(default=None, description="ComfyUI server URL used for this job")
    status: CameraAngleJobStatus = Field(
        default=CameraAngleJobStatus.PENDING,
        description="Current job status"
    )
    progress: float = Field(default=0.0, ge=0.0, le=100.0, description="Progress percentage")
    current_step: Optional[str] = Field(default=None, description="Current processing step")
    completed_angles: List[str] = Field(
        default=[],
        description="Completed angle generations (IDs or strings)"
    )
    remaining_angles: List[str] = Field(
        default=[],
        description="Remaining angle generations"
    )
    error: Optional[str] = Field(default=None, description="Error message if failed")
    created_at: datetime = Field(
        default_factory=datetime.utcnow,
        description="Job creation timestamp"
    )
    started_at: Optional[datetime] = Field(default=None, description="Processing start timestamp")
    completed_at: Optional[datetime] = Field(default=None, description="Completion timestamp")
    priority: int = Field(
        default=5,
        ge=1,
        le=10,
        description="Job priority (1=highest, 10=lowest)"
    )


class CameraAngleJobResponse(BaseModel):
    """Response model for job status queries"""
    job_id: str = Field(..., description="Job identifier")
    status: CameraAngleJobStatus = Field(..., description="Current status")
    progress: float = Field(..., description="Progress percentage")
    current_step: Optional[str] = Field(default=None, description="Current step description")
    completed_angles: List[str] = Field(default=[], description="Completed angle IDs")
    remaining_angles: List[str] = Field(default=[], description="Remaining angle IDs")
    error: Optional[str] = Field(default=None, description="Error message if failed")
    created_at: str = Field(..., description="Creation timestamp (ISO format)")
    started_at: Optional[str] = Field(default=None, description="Start timestamp (ISO format)")
    completed_at: Optional[str] = Field(default=None, description="Completion timestamp (ISO format)")


# ============================================================================
# Result Models
# ============================================================================

class CameraAngleResult(BaseModel):
    """Single camera angle generation result"""
    id: str = Field(..., description="Unique result identifier")
    angle_id: CameraAnglePreset = Field(..., description="Camera angle preset used")
    original_image_base64: str = Field(..., description="Original source image")
    generated_image_base64: str = Field(..., description="Generated image (base64)")
    prompt_used: str = Field(..., description="Full prompt used for generation")
    generation_time_seconds: float = Field(..., description="Generation time in seconds")
    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata (model, steps, cfg_scale, etc.)"
    )


class CameraAngleResultResponse(BaseModel):
    """Response model for camera angle results"""
    job_id: str = Field(..., description="Job identifier")
    status: CameraAngleJobStatus = Field(..., description="Job status")
    results: List[CameraAngleResult] = Field(
        default=[],
        description="List of generated results"
    )
    total_generation_time: float = Field(
        default=0.0,
        description="Total generation time in seconds"
    )


# ============================================================================
# Preset Response Models
# ============================================================================

class CameraAnglePresetInfo(BaseModel):
    """Information about a single camera angle preset"""
    id: str = Field(..., description="Preset identifier")
    display_name: str = Field(..., description="Human-readable name")
    description: str = Field(..., description="Preset description")
    icon: str = Field(..., description="Icon identifier for UI")


class CameraAnglePresetsResponse(BaseModel):
    """Response model for available presets"""
    presets: List[CameraAnglePresetInfo] = Field(
        ...,
        description="List of available camera angle presets"
    )
    total: int = Field(..., description="Total number of presets")


# ============================================================================
# Cancel Response Model
# ============================================================================

class CameraAngleCancelResponse(BaseModel):
    """Response model for job cancellation"""
    job_id: str = Field(..., description="Job identifier")
    status: CameraAngleJobStatus = Field(..., description="Current job status")
    message: str = Field(..., description="Cancellation result message")
