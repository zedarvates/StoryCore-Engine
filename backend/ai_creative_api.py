"""
AI Creative API Endpoints for StoryCore-Engine

FastAPI routes for AI-powered creative tools:
- Animation presets without keyframes
- AI Start-to-End Frame (pose interpolation)
- AI Music Remix (duration adaptation)
- Thumbnail hook animation

Phase 6: Creative Tools & Workflow Enhancement
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime
from enum import Enum
import os
import json

from backend.ai_creative_service import (
    AnimationPreset,
    AnimationCategory,
    MusicRemixMode,
    AnimationConfig,
    MusicRemixConfig,
    ThumbnailHookConfig,
    get_animation_service,
    get_pose_service,
    get_remix_service,
    get_thumbnail_service
)


router = APIRouter(prefix="/api/ai/creative", tags=["ai-creative"])


# =============================================================================
# Request/Response Models
# =============================================================================

class ApplyAnimationRequest(BaseModel):
    """Request to apply animation preset"""
    input_path: str
    output_path: str
    preset: str = "ken_burns"
    duration: float = 3.0
    intensity: float = 1.0
    easing: str = "ease_in_out"
    fps: int = 30


class AnimationPresetResponse(BaseModel):
    """Response for a single animation preset"""
    id: str
    name: str
    category: str
    description: str
    default_duration: float


class ApplyAnimationResponse(BaseModel):
    """Response for animation application"""
    success: bool
    message: str
    output_path: Optional[str] = None


class PoseInterpolationRequest(BaseModel):
    """Request for pose interpolation"""
    start_image_path: str
    end_image_path: str
    start_description: Optional[str] = None
    end_description: Optional[str] = None
    num_frames: int = 30
    fps: int = 30
    interpolation_mode: str = "ease"
    style: str = "realistic"
    output_dir: str = "./output/pose_animation"


class PoseInterpolationResponse(BaseModel):
    """Response for pose interpolation"""
    success: bool
    message: str
    num_frames: int
    keypoints_file: Optional[str] = None
    prompts_file: Optional[str] = None


class MusicRemixRequest(BaseModel):
    """Request for music remix"""
    input_path: str
    output_path: str
    target_duration: float
    mode: str = "remix"
    preserve_ending: bool = True
    fade_in: float = 0.5
    fade_out: float = 1.0
    bpm: Optional[float] = None


class MusicRemixResponse(BaseModel):
    """Response for music remix"""
    success: bool
    message: str
    output_path: Optional[str] = None
    original_duration: Optional[float] = None
    target_duration: Optional[float] = None
    detected_bpm: Optional[float] = None


class MusicAnalysisResponse(BaseModel):
    """Response for music analysis"""
    duration: float
    bpm: float
    sections: List[Dict[str, Any]]


class ThumbnailHookRequest(BaseModel):
    """Request for thumbnail hook creation"""
    image_path: str
    output_path: str
    duration: float = 3.0
    animation_type: str = "zoom_breath"
    intensity: float = 0.5
    add_text: Optional[str] = None
    text_position: str = "center"


class ThumbnailHookResponse(BaseModel):
    """Response for thumbnail hook creation"""
    success: bool
    message: str
    output_path: Optional[str] = None


# =============================================================================
# Animation Presets Endpoints
# =============================================================================

@router.post("/animate", response_model=ApplyAnimationResponse)
async def apply_animation_preset(request: ApplyAnimationRequest):
    """
    Apply an animation preset to an image or video.
    
    Creates animated content without manual keyframing.
    Perfect for quick visual effects and transitions.
    
    Available presets:
    - **motion**: zoom_in, zoom_out, spin, ken_burns
    - **transition**: fade, dissolve, slide_left, slide_right, whip_pan
    - **effect**: pulse, shake, glitch, flash
    - **entrance**: bounce, elastic
    
    Easing options: linear, ease_in, ease_out, ease_in_out, bounce
    """
    try:
        if not os.path.exists(request.input_path):
            raise HTTPException(status_code=404, detail=f"Input file not found: {request.input_path}")
        
        service = get_animation_service()
        
        # Convert preset string to enum
        try:
            preset = AnimationPreset(request.preset)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Unknown preset: {request.preset}")
        
        config = AnimationConfig(
            preset=preset,
            duration=request.duration,
            intensity=request.intensity,
            easing=request.easing
        )
        
        # Determine if input is image or video
        image_extensions = ('.jpg', '.jpeg', '.png', '.webp', '.bmp', '.gif')
        is_image = request.input_path.lower().endswith(image_extensions)
        
        if is_image:
            success, message = service.apply_animation_to_image(
                request.input_path,
                request.output_path,
                config,
                request.fps
            )
        else:
            success, message = service.apply_animation_to_video(
                request.input_path,
                request.output_path,
                config
            )
        
        return ApplyAnimationResponse(
            success=success,
            message=message,
            output_path=request.output_path if success else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/animations", response_model=List[AnimationPresetResponse])
async def list_animation_presets(
    category: Optional[str] = None
):
    """
    List all available animation presets.
    
    Optionally filter by category:
    - transition
    - motion
    - effect
    - entrance
    - exit
    """
    service = get_animation_service()
    
    cat_filter = None
    if category:
        try:
            cat_filter = AnimationCategory(category)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Unknown category: {category}")
    
    presets = service.list_presets(cat_filter)
    return presets


@router.get("/animations/{preset_id}")
async def get_animation_preset_info(preset_id: str):
    """Get detailed information about a specific animation preset."""
    try:
        preset = AnimationPreset(preset_id)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Preset not found: {preset_id}")
    
    service = get_animation_service()
    info = service.get_preset_info(preset)
    
    # Add filter preview
    config = AnimationConfig(preset=preset, duration=3.0, intensity=1.0)
    filter_str = service.generate_animation_filter(config)
    
    return {
        **info,
        "filter_preview": filter_str
    }


# =============================================================================
# Pose Interpolation Endpoints
# =============================================================================

@router.post("/pose-interpolate", response_model=PoseInterpolationResponse)
async def create_pose_interpolation(request: PoseInterpolationRequest):
    """
    Generate animation between two poses.
    
    Detects poses in both images and generates:
    1. Interpolated keypoints for each frame
    2. Text prompts for AI image generation
    
    Perfect for creating action animations between two key poses.
    """
    try:
        if not os.path.exists(request.start_image_path):
            raise HTTPException(status_code=404, detail=f"Start image not found: {request.start_image_path}")
        if not os.path.exists(request.end_image_path):
            raise HTTPException(status_code=404, detail=f"End image not found: {request.end_image_path}")
        
        service = get_pose_service()
        
        from backend.ai_creative_service import PoseFrame, PoseInterpolationConfig
        
        start_pose = PoseFrame(
            image_path=request.start_image_path,
            description=request.start_description
        )
        end_pose = PoseFrame(
            image_path=request.end_image_path,
            description=request.end_description
        )
        
        config = PoseInterpolationConfig(
            start_pose=start_pose,
            end_pose=end_pose,
            num_frames=request.num_frames,
            fps=request.fps,
            interpolation_mode=request.interpolation_mode,
            style=request.style
        )
        
        success, message, files = service.create_pose_animation(
            config,
            request.output_dir
        )
        
        keypoints_file = None
        prompts_file = None
        
        for f in files:
            if "keypoints" in f:
                keypoints_file = f
            elif "prompts" in f:
                prompts_file = f
        
        return PoseInterpolationResponse(
            success=success,
            message=message,
            num_frames=request.num_frames,
            keypoints_file=keypoints_file,
            prompts_file=prompts_file
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pose-detect")
async def detect_pose_in_image(image_path: str):
    """
    Detect pose keypoints in an image.
    
    Returns body landmark positions (MediaPipe pose format).
    """
    try:
        if not os.path.exists(image_path):
            raise HTTPException(status_code=404, detail=f"Image not found: {image_path}")
        
        service = get_pose_service()
        keypoints = service.detect_pose(image_path)
        
        if keypoints is None:
            return {
                "success": False,
                "message": "No pose detected in image",
                "keypoints": None
            }
        
        return {
            "success": True,
            "message": f"Detected {len(keypoints)} keypoints",
            "keypoints": keypoints
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/pose-prompts")
async def generate_pose_animation_prompts(
    start_description: str,
    end_description: str,
    num_frames: int = 30,
    style: str = "realistic"
):
    """
    Generate prompts for pose-to-pose animation.
    
    Creates a series of prompts describing the transition
    from start pose to end pose for AI image generation.
    """
    try:
        service = get_pose_service()
        prompts = service.generate_animation_prompts(
            start_description,
            end_description,
            num_frames,
            style
        )
        
        return {
            "start_description": start_description,
            "end_description": end_description,
            "num_frames": num_frames,
            "style": style,
            "prompts": prompts
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Music Remix Endpoints
# =============================================================================

@router.post("/music-remix", response_model=MusicRemixResponse)
async def remix_music(request: MusicRemixRequest):
    """
    Remix music to fit a target duration.
    
    Automatically extends or shortens music intelligently:
    - **stretch**: Time-stretch with pitch preservation
    - **cut**: Intelligent section cutting
    - **remix**: Beat-synced intelligent remix
    - **loop**: Smart loop extension
    
    Perfect for matching background music to video length.
    """
    try:
        if not os.path.exists(request.input_path):
            raise HTTPException(status_code=404, detail=f"Audio file not found: {request.input_path}")
        
        service = get_remix_service()
        
        # Get original info
        original_duration = service.get_audio_duration(request.input_path)
        detected_bpm = service.get_audio_bpm(request.input_path) if not request.bpm else request.bpm
        
        # Convert mode
        try:
            mode = MusicRemixMode(request.mode)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Unknown remix mode: {request.mode}")
        
        config = MusicRemixConfig(
            input_path=request.input_path,
            output_path=request.output_path,
            target_duration=request.target_duration,
            mode=mode,
            preserve_ending=request.preserve_ending,
            fade_in=request.fade_in,
            fade_out=request.fade_out,
            bpm=request.bpm or detected_bpm
        )
        
        success, message = service.remix_music(config)
        
        return MusicRemixResponse(
            success=success,
            message=message,
            output_path=request.output_path if success else None,
            original_duration=original_duration,
            target_duration=request.target_duration,
            detected_bpm=detected_bpm
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/music-analyze/{audio_path:path}", response_model=MusicAnalysisResponse)
async def analyze_music(audio_path: str):
    """
    Analyze music file for remix preparation.
    
    Returns:
    - Duration
    - Detected BPM
    - Detected sections (intro, verse, chorus, etc.)
    """
    try:
        if not os.path.exists(audio_path):
            raise HTTPException(status_code=404, detail=f"Audio file not found: {audio_path}")
        
        service = get_remix_service()
        
        duration = service.get_audio_duration(audio_path)
        bpm = service.get_audio_bpm(audio_path)
        sections = service.detect_music_sections(audio_path)
        
        return MusicAnalysisResponse(
            duration=duration,
            bpm=bpm,
            sections=sections
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/music-stretch")
async def stretch_music(
    input_path: str,
    output_path: str,
    target_duration: float,
    preserve_pitch: bool = True
):
    """
    Simple time-stretch of audio to target duration.
    
    Preserves pitch by default using atempo filter.
    """
    try:
        if not os.path.exists(input_path):
            raise HTTPException(status_code=404, detail=f"Audio file not found: {input_path}")
        
        service = get_remix_service()
        success, message = service.stretch_audio(
            input_path,
            output_path,
            target_duration,
            preserve_pitch
        )
        
        return {
            "success": success,
            "message": message,
            "output_path": output_path if success else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Thumbnail Hook Endpoints
# =============================================================================

@router.post("/thumbnail-hook", response_model=ThumbnailHookResponse)
async def create_thumbnail_hook(request: ThumbnailHookRequest):
    """
    Create an animated thumbnail hook.
    
    Generates attention-grabbing animated thumbnails for video intros.
    
    Animation types:
    - **zoom_breath**: Subtle zoom in/out breathing effect
    - **parallax**: Horizontal parallax shift
    - **pulse**: Pulsing glow effect
    - **glitch**: Digital glitch effect
    - **ken_burns**: Classic Ken Burns slow zoom
    """
    try:
        if not os.path.exists(request.image_path):
            raise HTTPException(status_code=404, detail=f"Image not found: {request.image_path}")
        
        service = get_thumbnail_service()
        
        config = ThumbnailHookConfig(
            image_path=request.image_path,
            output_path=request.output_path,
            duration=request.duration,
            animation_type=request.animation_type,
            intensity=request.intensity,
            add_text=request.add_text,
            text_position=request.text_position
        )
        
        success, message = service.create_thumbnail_hook(config)
        
        return ThumbnailHookResponse(
            success=success,
            message=message,
            output_path=request.output_path if success else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/thumbnail-animations")
async def list_thumbnail_animations():
    """List available animation types for thumbnail hooks."""
    service = get_thumbnail_service()
    return {
        "animation_types": service.list_animation_types()
    }


# =============================================================================
# Health Check
# =============================================================================

@router.get("/health")
async def creative_service_health():
    """Check health status of AI creative services."""
    services_status = {
        "animation_presets": "available",
        "pose_interpolation": "available",
        "music_remix": "available",
        "thumbnail_hook": "available"
    }
    
    # Check optional dependencies
    try:
        import librosa
        services_status["music_remix"] = "librosa_available"
    except ImportError:
        services_status["music_remix"] = "basic_only"
    
    try:
        import mediapipe
        services_status["pose_interpolation"] = "mediapipe_available"
    except ImportError:
        services_status["pose_interpolation"] = "prompts_only"
    
    try:
        import cv2
        services_status["animation_presets"] = "opencv_available"
    except ImportError:
        pass
    
    return {
        "status": "healthy",
        "service": "StoryCore AI Creative",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "services": services_status
    }