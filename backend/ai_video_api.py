"""
AI Video API Endpoints for StoryCore-Engine

FastAPI routes for AI-powered video services:
- Smart Pan & Scan with face tracking
- Multi-angle camera prompt generation
- Character consistency sheets
- Smooth cut transitions

Phase 4 & 5: Audio Mastering + Multi-Angle & Character Consistency
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
from datetime import datetime
import os

from backend.ai_video_service import (
    CameraAngle,
    CharacterView,
    TrackingMode,
    SmartCropConfig,
    CharacterSheetConfig,
    get_smart_crop_service,
    get_multi_angle_service,
    get_character_consistency_service,
    get_smooth_cut_service,
)


router = APIRouter(prefix="/api/ai/video", tags=["ai-video"])


# =============================================================================
# Request/Response Models
# =============================================================================


class SmartCropRequest(BaseModel):
    """Request for smart pan & scan"""

    input_path: str
    output_path: str
    target_aspect_width: int = 9
    target_aspect_height: int = 16
    tracking_mode: str = "main_subject"
    smoothing: float = 0.3
    padding: float = 0.1
    min_face_size: int = 50


class SmartCropResponse(BaseModel):
    """Response for smart pan & scan"""

    success: bool
    message: str
    output_path: Optional[str] = None
    frames_processed: int = 0


class MultiAngleRequest(BaseModel):
    """Request for multi-angle prompt generation"""

    base_prompt: str = Field(..., min_length=10, description="Base scene description")
    angles: Optional[List[str]] = None  # Camera angle names
    lens: str = "normal"
    style: str = "cinematic"


class CameraAnglePromptResponse(BaseModel):
    """Single camera angle prompt"""

    angle: str
    prompt: str
    negative_prompt: str
    description: str
    composition_notes: List[str]


class MultiAngleResponse(BaseModel):
    """Response for multi-angle prompt generation"""

    base_prompt: str
    prompts: List[CameraAnglePromptResponse]
    total_angles: int


class ShotListRequest(BaseModel):
    """Request for shot list generation"""

    scene_description: str
    scene_type: str = "dialogue"
    num_shots: int = 5


class ShotResponse(BaseModel):
    """Single shot in shot list"""

    shot_number: int
    angle: str
    description: str
    prompt: str
    negative_prompt: str
    notes: List[str]
    estimated_duration: float


class ShotListResponse(BaseModel):
    """Response for shot list generation"""

    scene_description: str
    scene_type: str
    total_shots: int
    estimated_duration: float
    shot_list: List[ShotResponse]


class CharacterSheetRequest(BaseModel):
    """Request for character consistency sheet"""

    character_id: str
    character_name: str
    character_description: str
    views: Optional[List[str]] = None
    expressions: Optional[List[str]] = None
    outfit: str = "default"
    style: str = "realistic"
    resolution: int = 1024


class CharacterSheetResponse(BaseModel):
    """Response for character sheet generation"""

    character_id: str
    character_name: str
    prompts: Dict[str, str]
    total_views: int
    expressions: Optional[Dict[str, str]] = None


class ConsistencyPromptRequest(BaseModel):
    """Request for consistency prompt with reference"""

    base_prompt: str
    reference_image_path: str
    strength: float = 0.8


class SmoothCutRequest(BaseModel):
    """Request for smooth cut transition"""

    video1_path: str
    video2_path: str
    output_path: str
    transition_frames: int = 12
    method: str = "blend"


class SmoothCutResponse(BaseModel):
    """Response for smooth cut"""

    success: bool
    message: str
    output_path: Optional[str] = None


class FrameInterpolationRequest(BaseModel):
    """Request for frame interpolation"""

    input_path: str
    output_path: str
    target_fps: int = 60
    method: str = "minterpolate"


# =============================================================================
# Smart Pan & Scan Endpoints
# =============================================================================


@router.post("/smart-crop", response_model=SmartCropResponse)
async def apply_smart_crop(request: SmartCropRequest):
    """
    Apply smart pan & scan with face tracking.

    Automatically recrops video to follow faces for different aspect ratios.
    Perfect for converting horizontal video to vertical format (9:16).

    Tracking modes:
    - **single_face**: Track the first detected face
    - **multiple_faces**: Track all faces
    - **main_subject**: Track the largest/most prominent face
    """
    try:
        if not os.path.exists(request.input_path):
            raise HTTPException(
                status_code=404, detail=f"Input video not found: {request.input_path}"
            )

        service = get_smart_crop_service()
        config = SmartCropConfig(
            target_aspect=(request.target_aspect_width, request.target_aspect_height),
            tracking_mode=TrackingMode(request.tracking_mode),
            smoothing=request.smoothing,
            padding=request.padding,
            min_face_size=request.min_face_size,
        )

        success, message = service.apply_smart_crop(
            request.input_path, request.output_path, config
        )

        return SmartCropResponse(
            success=success,
            message=message,
            output_path=request.output_path if success else None,
            frames_processed=0,  # Would need to track this
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid parameter: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/detect-faces")
async def detect_faces_in_video(video_path: str):
    """
    Detect and track faces throughout a video.

    Returns face positions and confidence scores for each frame.
    Useful for previewing smart crop behavior.
    """
    try:
        if not os.path.exists(video_path):
            raise HTTPException(
                status_code=404, detail=f"Video not found: {video_path}"
            )

        service = get_smart_crop_service()
        results = service.track_faces_in_video(video_path)

        return {
            "video_path": video_path,
            "total_frames": len(results),
            "faces_per_frame": [
                {
                    "frame_number": r.frame_number,
                    "face_count": len(r.faces),
                    "main_face_index": r.main_face_index,
                    "confidence": r.confidence,
                    "faces": r.faces,
                }
                for r in results[:100]  # Limit to first 100 frames for response
            ],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Multi-Angle Camera Endpoints
# =============================================================================


@router.post("/multi-angle", response_model=MultiAngleResponse)
async def generate_multi_angle_prompts(request: MultiAngleRequest):
    """
    Generate prompts for multiple camera angles of the same scene.

    Helps create dynamic montages without manual prompt engineering.

    Available angles:
    - eye_level, low_angle, high_angle, dutch_angle
    - over_shoulder, pov, bird_eye, worm_eye
    - drone, close_up, medium_shot, wide_shot

    Lens options: wide, normal, telephoto, macro, anamorphic
    """
    try:
        service = get_multi_angle_service()

        # Convert angle strings to enum
        angles = None
        if request.angles:
            angles = [CameraAngle(a) for a in request.angles]

        prompts = service.generate_multi_angle_prompts(
            request.base_prompt, angles, request.lens, request.style
        )

        return MultiAngleResponse(
            base_prompt=request.base_prompt,
            prompts=[
                CameraAnglePromptResponse(
                    angle=p.angle.value,
                    prompt=p.prompt,
                    negative_prompt=p.negative_prompt,
                    description=p.description,
                    composition_notes=p.composition_notes,
                )
                for p in prompts
            ],
            total_angles=len(prompts),
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid angle: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/shot-list", response_model=ShotListResponse)
async def generate_shot_list(request: ShotListRequest):
    """
    Generate a complete shot list for a scene.

    Returns recommended camera angles, prompts, and timing based on scene type.

    Scene types:
    - **dialogue**: Conversation between characters
    - **action**: Dynamic action sequence
    - **revelation**: Dramatic reveal moment
    - **chase**: Chase sequence
    - **horror**: Horror/suspense scene
    """
    try:
        service = get_multi_angle_service()
        result = service.generate_shot_list(
            request.scene_description, request.scene_type, request.num_shots
        )

        return ShotListResponse(
            scene_description=result["scene_description"],
            scene_type=result["scene_type"],
            total_shots=result["total_shots"],
            estimated_duration=result["estimated_duration"],
            shot_list=[
                ShotResponse(
                    shot_number=s["shot_number"],
                    angle=s["angle"],
                    description=s["description"],
                    prompt=s["prompt"],
                    negative_prompt=s["negative_prompt"],
                    notes=s["notes"],
                    estimated_duration=s["estimated_duration"],
                )
                for s in result["shot_list"]
            ],
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/camera-angles")
async def list_camera_angles():
    """List all available camera angles with descriptions."""
    service = get_multi_angle_service()
    angles = []

    for angle in CameraAngle:
        modifier = service.angle_modifiers.get(angle, {})
        angles.append(
            {
                "id": angle.value,
                "description": modifier.get("description", ""),
                "notes": modifier.get("notes", []),
            }
        )

    return {"angles": angles, "total": len(angles)}


@router.get("/lens-types")
async def list_lens_types():
    """List all available lens types."""
    service = get_multi_angle_service()
    return {
        "lenses": [{"id": k, "description": v} for k, v in service.lens_effects.items()]
    }


@router.get("/scene-sequences/{scene_type}")
async def get_scene_sequence(scene_type: str):
    """
    Get recommended camera angle sequence for a scene type.

    Returns the recommended shot progression for the specified scene type.
    """
    try:
        service = get_multi_angle_service()
        sequence = service.get_angle_sequence(scene_type)

        return {
            "scene_type": scene_type,
            "sequence": [angle.value for angle in sequence],
            "total_shots": len(sequence),
        }

    except Exception:
        raise HTTPException(status_code=404, detail=f"Unknown scene type: {scene_type}")


# =============================================================================
# Character Consistency Endpoints
# =============================================================================


@router.post("/character-sheet", response_model=CharacterSheetResponse)
async def generate_character_sheet(request: CharacterSheetRequest):
    """
    Generate prompts for a character consistency sheet.

    Creates prompts for multiple views of a character to ensure
    visual consistency across different scenes and angles.

    Default views:
    - front, three_quarter_left, three_quarter_right
    - profile_left, profile_right, back, back_three_quarter

    Default expressions:
    - neutral, happy, angry, surprised
    """
    try:
        service = get_character_consistency_service()

        # Convert view strings to enum
        views = None
        if request.views:
            views = [CharacterView(v) for v in request.views]

        config = CharacterSheetConfig(
            character_id=request.character_id,
            character_name=request.character_name,
            views=views,
            expressions=request.expressions
            or ["neutral", "happy", "angry", "surprised"],
            outfit=request.outfit,
            style=request.style,
            resolution=request.resolution,
        )

        prompts = service.generate_character_sheet_prompts(
            request.character_description, config
        )

        # Also generate expression prompts
        expression_prompts = service.generate_expression_sheet_prompts(
            request.character_description, config.expressions, config.style
        )

        return CharacterSheetResponse(
            character_id=request.character_id,
            character_name=request.character_name,
            prompts={k: v.prompt for k, v in prompts.items()},
            total_views=len(prompts),
            expressions=expression_prompts,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid view: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/consistency-prompt")
async def create_consistency_prompt(request: ConsistencyPromptRequest):
    """
    Create a prompt configuration for consistent character generation.

    Uses a reference image (character sheet) to maintain consistency
    across different scenes and poses.

    Returns configuration for:
    - Base prompt with negative prompts
    - ControlNet settings
    - IP-Adapter settings
    """
    try:
        if not os.path.exists(request.reference_image_path):
            raise HTTPException(
                status_code=404,
                detail=f"Reference image not found: {request.reference_image_path}",
            )

        service = get_character_consistency_service()
        result = service.create_consistency_prompt(
            request.base_prompt, request.reference_image_path, request.strength
        )

        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/turnaround-prompt")
async def generate_turnaround_prompt(
    character_description: str, num_views: int = 8, style: str = "realistic"
):
    """
    Generate a single prompt for a character turnaround sheet.

    Creates a prompt for generating multiple character views in a single image.
    """
    try:
        service = get_character_consistency_service()
        prompt = service.generate_turnaround_prompt(
            character_description, num_views, style
        )

        return {
            "prompt": prompt,
            "negative_prompt": "blurry, low quality, inconsistent, different face, altered features, distorted, deformed",
            "num_views": num_views,
            "style": style,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/character-views")
async def list_character_views():
    """List all available character view angles."""
    return {
        "views": [
            {"id": view.value, "name": view.value.replace("_", " ").title()}
            for view in CharacterView
        ]
    }


@router.get("/expressions")
async def list_expressions():
    """List all available expression types."""
    service = get_character_consistency_service()
    return {
        "expressions": [
            {"id": k, "prompt_modifier": v}
            for k, v in service.expression_prompts.items()
        ]
    }


# =============================================================================
# Smooth Cut Endpoints
# =============================================================================


@router.post("/smooth-cut", response_model=SmoothCutResponse)
async def create_smooth_cut(request: SmoothCutRequest):
    """
    Create a smooth transition between two video clips.

    Uses frame interpolation to avoid jarring jump cuts.

    Methods:
    - **blend**: Simple blend between clips
    - **crossfade**: Crossfade transition
    - **morph**: Morph between frames (requires RIFE)
    """
    try:
        if not os.path.exists(request.video1_path):
            raise HTTPException(
                status_code=404, detail=f"Video 1 not found: {request.video1_path}"
            )
        if not os.path.exists(request.video2_path):
            raise HTTPException(
                status_code=404, detail=f"Video 2 not found: {request.video2_path}"
            )

        service = get_smooth_cut_service()
        success, message = service.create_smooth_cut(
            request.video1_path,
            request.video2_path,
            request.output_path,
            request.transition_frames,
            request.method,
        )

        return SmoothCutResponse(
            success=success,
            message=message,
            output_path=request.output_path if success else None,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/interpolate-frames")
async def interpolate_frames(request: FrameInterpolationRequest):
    """
    Interpolate frames for smoother motion.

    Increases frame rate by generating intermediate frames.

    Methods:
    - **minterpolate**: FFmpeg motion-compensated interpolation
    - **simple**: Simple frame duplication/blend
    """
    try:
        if not os.path.exists(request.input_path):
            raise HTTPException(
                status_code=404, detail=f"Input video not found: {request.input_path}"
            )

        service = get_smooth_cut_service()
        success, message = service.interpolate_frames(
            request.input_path, request.output_path, request.target_fps, request.method
        )

        return {
            "success": success,
            "message": message,
            "output_path": request.output_path if success else None,
            "target_fps": request.target_fps,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Health Check
# =============================================================================


@router.get("/health")
async def video_service_health():
    """Check health status of AI video services."""
    services_status = {
        "smart_crop": "available",
        "multi_angle": "available",
        "character_consistency": "available",
        "smooth_cut": "available",
    }

    # Check optional dependencies
    try:
        import cv2

        services_status["smart_crop"] = "opencv_available"
    except ImportError:
        services_status["smart_crop"] = "fallback_only"

    try:
        import mediapipe

        services_status["smart_crop"] = "mediapipe_available"
    except ImportError:
        pass

    return {
        "status": "healthy",
        "service": "StoryCore AI Video",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "services": services_status,
    }
