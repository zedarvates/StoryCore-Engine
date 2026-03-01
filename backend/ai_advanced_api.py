"""
AI Advanced API Endpoints for StoryCore-Engine

FastAPI routes for advanced AI-powered tools:
- Magic Mask / Rotoscopie
- Depth Map Generation
- Bloom/Anamorphic Effects
- AI Subtitle Generator
- Background Replacement

Phase 7: Advanced AI Tools
"""

from fastapi import APIRouter, HTTPException, UploadFile, File, Query, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
from datetime import datetime
from enum import Enum
import os

from backend.ai_advanced_service import (
    MaskType,
    SubtitleStyle,
    BloomIntensity,
    DepthMapMethod,
    get_mask_service,
    get_depth_service,
    get_bloom_service,
    get_subtitle_service,
    get_background_service
)


router = APIRouter(prefix="/api/ai/advanced", tags=["ai-advanced"])


# =============================================================================
# Request/Response Models
# =============================================================================

class GenerateMaskRequest(BaseModel):
    """Request for mask generation"""
    input_path: str
    output_path: str
    mask_type: str = "person"
    refine_edges: bool = True
    feather: int = 5


class GenerateMaskResponse(BaseModel):
    """Response for mask generation"""
    success: bool
    message: str
    output_path: Optional[str] = None


class RotoscopeRequest(BaseModel):
    """Request for video rotoscoping"""
    video_path: str
    output_dir: str
    mask_type: str = "person"
    refine_edges: bool = True
    apply_to_video: bool = False
    output_video_path: Optional[str] = None


class RotoscopeResponse(BaseModel):
    """Response for rotoscoping"""
    success: bool
    message: str
    masks_generated: int
    mask_dir: Optional[str] = None
    output_video: Optional[str] = None


class DepthMapRequest(BaseModel):
    """Request for depth map generation"""
    input_path: str
    output_path: str
    method: str = "simple"
    normalize: bool = True
    invert: bool = False
    blur: int = 0


class DepthMapResponse(BaseModel):
    """Response for depth map generation"""
    success: bool
    message: str
    output_path: Optional[str] = None


class BloomEffectRequest(BaseModel):
    """Request for bloom effect"""
    input_path: str
    output_path: str
    intensity: str = "moderate"
    threshold: float = 0.7
    radius: int = 20
    strength: float = 0.5


class BloomEffectResponse(BaseModel):
    """Response for bloom effect"""
    success: bool
    message: str
    output_path: Optional[str] = None


class AnamorphicFlareRequest(BaseModel):
    """Request for anamorphic flare"""
    input_path: str
    output_path: str
    intensity: float = 0.5
    horizontal_stretch: float = 2.35


class SubtitleRequest(BaseModel):
    """Request for subtitle generation"""
    video_path: str
    output_path: str
    style: str = "default"
    font_size: int = 24
    font_color: str = "white"
    outline_color: str = "black"
    outline_width: int = 2
    position: str = "bottom"
    margin: int = 50
    language: str = "auto"


class SubtitleResponse(BaseModel):
    """Response for subtitle generation"""
    success: bool
    message: str
    output_path: Optional[str] = None
    srt_path: Optional[str] = None


class TranscribeRequest(BaseModel):
    """Request for transcription only"""
    video_path: str
    output_srt: str
    language: str = "auto"


class BackgroundReplaceRequest(BaseModel):
    """Request for background replacement"""
    input_path: str
    output_path: str
    new_background: str
    mask_path: Optional[str] = None
    blend_edges: int = 10
    color_match: bool = True
    lighting_match: bool = True


class BackgroundReplaceResponse(BaseModel):
    """Response for background replacement"""
    success: bool
    message: str
    output_path: Optional[str] = None


# =============================================================================
# Magic Mask / Rotoscopie Endpoints
# =============================================================================

@router.post("/mask/generate", response_model=GenerateMaskResponse)
async def generate_mask(request: GenerateMaskRequest):
    """
    Generate a segmentation mask for an image.
    
    Detects and isolates subjects using AI segmentation.
    
    Mask types:
    - **person**: Full person segmentation
    - **face**: Face only mask
    - **body**: Body silhouette
    - **background**: Inverted mask (background only)
    """
    try:
        if not os.path.exists(request.input_path):
            raise HTTPException(status_code=404, detail=f"Input not found: {request.input_path}")
        
        service = get_mask_service()
        
        # Convert mask type
        try:
            mask_type = MaskType(request.mask_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Unknown mask type: {request.mask_type}")
        
        success, message = service.generate_mask_frame(
            request.input_path,
            request.output_path,
            mask_type,
            request.refine_edges
        )
        
        return GenerateMaskResponse(
            success=success,
            message=message,
            output_path=request.output_path if success else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/mask/rotoscope", response_model=RotoscopeResponse)
async def rotoscope_video(request: RotoscopeRequest):
    """
    Generate masks for entire video (rotoscoping).
    
    Creates frame-by-frame masks for video.
    Optionally applies masks to create transparent video.
    """
    try:
        if not os.path.exists(request.video_path):
            raise HTTPException(status_code=404, detail=f"Video not found: {request.video_path}")
        
        service = get_mask_service()
        
        # Convert mask type
        try:
            mask_type = MaskType(request.mask_type)
        except ValueError:
            mask_type = MaskType.PERSON
        
        from backend.ai_advanced_service import MaskConfig
        
        config = MaskConfig(
            input_path=request.video_path,
            output_path=request.output_dir,
            mask_type=mask_type,
            refine_edges=request.refine_edges
        )
        
        success, message, mask_paths = service.generate_mask_video(
            request.video_path,
            request.output_dir,
            config
        )
        
        output_video = None
        if success and request.apply_to_video and request.output_video_path:
            vid_success, vid_msg = service.apply_mask_to_video(
                request.video_path,
                request.output_dir,
                request.output_video_path
            )
            if vid_success:
                output_video = request.output_video_path
        
        return RotoscopeResponse(
            success=success,
            message=message,
            masks_generated=len(mask_paths),
            mask_dir=request.output_dir if success else None,
            output_video=output_video
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/mask/types")
async def list_mask_types():
    """List available mask types."""
    return {
        "mask_types": [
            {"id": "person", "description": "Full person segmentation"},
            {"id": "face", "description": "Face only mask"},
            {"id": "body", "description": "Body silhouette"},
            {"id": "hair", "description": "Hair segmentation"},
            {"id": "hands", "description": "Hands segmentation"},
            {"id": "background", "description": "Inverted mask (background only)"},
        ]
    }


# =============================================================================
# Depth Map Endpoints
# =============================================================================

@router.post("/depth-map", response_model=DepthMapResponse)
async def generate_depth_map(request: DepthMapRequest):
    """
    Generate depth map from an image.
    
    Creates a grayscale depth map for AI-guided generation.
    
    Methods:
    - **simple**: Gradient-based estimation (fast)
    - **midas**: MiDaS neural network (accurate, requires PyTorch)
    """
    try:
        if not os.path.exists(request.input_path):
            raise HTTPException(status_code=404, detail=f"Input not found: {request.input_path}")
        
        service = get_depth_service()
        
        # Convert method
        try:
            method = DepthMapMethod(request.method)
        except ValueError:
            method = DepthMapMethod.SIMPLE
        
        from backend.ai_advanced_service import DepthMapConfig
        
        config = DepthMapConfig(
            input_path=request.input_path,
            output_path=request.output_path,
            method=method,
            normalize=request.normalize,
            invert=request.invert,
            blur=request.blur
        )
        
        success, message = service.generate_depth_map(config)
        
        return DepthMapResponse(
            success=success,
            message=message,
            output_path=request.output_path if success else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/depth-prompt")
async def generate_depth_prompt(
    image_path: str,
    depth_path: str,
    style: str = "cinematic"
):
    """
    Generate AI prompt from image + depth map.
    
    Creates a prompt for depth-guided image generation.
    """
    try:
        service = get_depth_service()
        prompt = service.generate_depth_layout_prompt(image_path, depth_path, style)
        
        return {
            "prompt": prompt,
            "image_path": image_path,
            "depth_path": depth_path,
            "style": style
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Bloom/Anamorphic Effect Endpoints
# =============================================================================

@router.post("/bloom", response_model=BloomEffectResponse)
async def apply_bloom_effect(request: BloomEffectRequest):
    """
    Apply bloom effect to image/video.
    
    Creates light halo effect for cinematic look.
    
    Intensities:
    - **subtle**: Light bloom
    - **moderate**: Standard bloom
    - **strong**: Heavy bloom
    - **anamorphic**: Horizontal streaks
    """
    try:
        if not os.path.exists(request.input_path):
            raise HTTPException(status_code=404, detail=f"Input not found: {request.input_path}")
        
        service = get_bloom_service()
        
        # Convert intensity
        try:
            intensity = BloomIntensity(request.intensity)
        except ValueError:
            intensity = BloomIntensity.MODERATE
        
        from backend.ai_advanced_service import BloomConfig
        
        config = BloomConfig(
            input_path=request.input_path,
            output_path=request.output_path,
            intensity=intensity,
            threshold=request.threshold,
            radius=request.radius,
            strength=request.strength
        )
        
        success, message = service.apply_bloom(config)
        
        return BloomEffectResponse(
            success=success,
            message=message,
            output_path=request.output_path if success else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/anamorphic-flare", response_model=BloomEffectResponse)
async def apply_anamorphic_flare(request: AnamorphicFlareRequest):
    """
    Apply anamorphic lens flare effect.
    
    Creates horizontal light streaks for cinematic look.
    """
    try:
        if not os.path.exists(request.input_path):
            raise HTTPException(status_code=404, detail=f"Input not found: {request.input_path}")
        
        service = get_bloom_service()
        
        success, message = service.apply_anamorphic_flare(
            request.input_path,
            request.output_path,
            request.intensity,
            request.horizontal_stretch
        )
        
        return BloomEffectResponse(
            success=success,
            message=message,
            output_path=request.output_path if success else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bloom-presets")
async def list_bloom_presets():
    """List available bloom intensity presets."""
    return {
        "presets": [
            {"id": "subtle", "description": "Light bloom", "threshold": 0.8, "radius": 10, "strength": 0.3},
            {"id": "moderate", "description": "Standard bloom", "threshold": 0.7, "radius": 20, "strength": 0.5},
            {"id": "strong", "description": "Heavy bloom", "threshold": 0.6, "radius": 30, "strength": 0.7},
            {"id": "anamorphic", "description": "Horizontal streaks", "threshold": 0.7, "radius": 40, "strength": 0.6, "ratio": 2.35},
        ]
    }


# =============================================================================
# Subtitle Generator Endpoints
# =============================================================================

@router.post("/subtitles/generate", response_model=SubtitleResponse)
async def generate_subtitles(request: SubtitleRequest):
    """
    Generate and burn subtitles into video.
    
    Transcribes audio and burns styled subtitles.
    
    Styles:
    - **default**: Standard white text with black outline
    - **netflix**: Netflix-style bold subtitles
    - **youtube**: YouTube-style with shadow
    - **cinematic**: Large text with background box
    - **minimal**: Small text with thin outline
    - **bold**: Yellow bold text
    - **outline**: Blue thick outline
    - **glow**: Cyan glow effect
    """
    try:
        if not os.path.exists(request.video_path):
            raise HTTPException(status_code=404, detail=f"Video not found: {request.video_path}")
        
        service = get_subtitle_service()
        
        # Convert style
        try:
            style = SubtitleStyle(request.style)
        except ValueError:
            style = SubtitleStyle.DEFAULT
        
        from backend.ai_advanced_service import SubtitleConfig
        
        config = SubtitleConfig(
            video_path=request.video_path,
            output_path=request.output_path,
            style=style,
            font_size=request.font_size,
            font_color=request.font_color,
            outline_color=request.outline_color,
            outline_width=request.outline_width,
            position=request.position,
            margin=request.margin,
            language=request.language
        )
        
        success, message = service.apply_subtitles_to_video(config)
        
        return SubtitleResponse(
            success=success,
            message=message,
            output_path=request.output_path if success else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/subtitles/transcribe", response_model=SubtitleResponse)
async def transcribe_video(request: TranscribeRequest):
    """
    Transcribe video to SRT subtitles.
    
    Creates subtitle file without burning into video.
    """
    try:
        if not os.path.exists(request.video_path):
            raise HTTPException(status_code=404, detail=f"Video not found: {request.video_path}")
        
        service = get_subtitle_service()
        
        success, message = service.transcribe_video(
            request.video_path,
            request.output_srt,
            request.language
        )
        
        return SubtitleResponse(
            success=success,
            message=message,
            srt_path=request.output_srt if success else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/subtitles/translate")
async def translate_subtitles(
    srt_path: str,
    output_path: str,
    target_language: str
):
    """
    Translate existing subtitles.
    
    Uses LLM service for translation.
    """
    try:
        if not os.path.exists(srt_path):
            raise HTTPException(status_code=404, detail=f"SRT file not found: {srt_path}")
        
        service = get_subtitle_service()
        
        success, message = service.translate_subtitles(
            srt_path,
            output_path,
            target_language
        )
        
        return {
            "success": success,
            "message": message,
            "output_path": output_path if success else None
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/subtitle-styles")
async def list_subtitle_styles():
    """List available subtitle styles."""
    return {
        "styles": [
            {"id": "default", "description": "Standard white text with black outline", "font_size": 24},
            {"id": "netflix", "description": "Netflix-style bold subtitles", "font_size": 28},
            {"id": "youtube", "description": "YouTube-style with shadow", "font_size": 22},
            {"id": "cinematic", "description": "Large text with background box", "font_size": 32},
            {"id": "minimal", "description": "Small text with thin outline", "font_size": 20},
            {"id": "bold", "description": "Yellow bold text", "font_size": 26},
            {"id": "outline", "description": "Blue thick outline", "font_size": 24},
            {"id": "glow", "description": "Cyan glow effect", "font_size": 28},
        ]
    }


# =============================================================================
# Background Replacement Endpoints
# =============================================================================

@router.post("/background/replace", response_model=BackgroundReplaceResponse)
async def replace_background(request: BackgroundReplaceRequest):
    """
    Replace background in image/video.
    
    Uses AI segmentation to isolate subject and composite onto new background.
    
    Background can be:
    - Path to an image file
    - Color name (green, blue, red, white, black)
    - Hex color (#RRGGBB)
    """
    try:
        if not os.path.exists(request.input_path):
            raise HTTPException(status_code=404, detail=f"Input not found: {request.input_path}")
        
        service = get_background_service()
        
        from backend.ai_advanced_service import BackgroundReplacementConfig
        
        config = BackgroundReplacementConfig(
            input_path=request.input_path,
            output_path=request.output_path,
            new_background=request.new_background,
            mask_path=request.mask_path,
            blend_edges=request.blend_edges,
            color_match=request.color_match,
            lighting_match=request.lighting_match
        )
        
        success, message = service.replace_background(config)
        
        return BackgroundReplaceResponse(
            success=success,
            message=message,
            output_path=request.output_path if success else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/background/colors")
async def list_background_colors():
    """List predefined background colors."""
    return {
        "colors": [
            {"id": "green", "hex": "#00FF00", "description": "Chroma key green"},
            {"id": "blue", "hex": "#0000FF", "description": "Chroma key blue"},
            {"id": "white", "hex": "#FFFFFF", "description": "White background"},
            {"id": "black", "hex": "#000000", "description": "Black background"},
            {"id": "red", "hex": "#FF0000", "description": "Red background"},
        ],
        "usage": "Use hex color or color name as 'new_background' parameter"
    }


# =============================================================================
# Health Check
# =============================================================================

@router.get("/health")
async def advanced_service_health():
    """Check health status of AI advanced services."""
    services_status = {
        "magic_mask": "available",
        "depth_map": "available",
        "bloom_effect": "available",
        "subtitle_generator": "available",
        "background_replacement": "available"
    }
    
    # Check optional dependencies
    try:
        import mediapipe
        services_status["magic_mask"] = "mediapipe_available"
    except ImportError:
        services_status["magic_mask"] = "opencv_only"
    
    try:
        import torch
        services_status["depth_map"] = "torch_available"
    except ImportError:
        services_status["depth_map"] = "simple_only"
    
    try:
        import whisper
        services_status["subtitle_generator"] = "whisper_available"
    except ImportError:
        services_status["subtitle_generator"] = "fallback_only"
    
    try:
        import cv2
        services_status["background_replacement"] = "opencv_available"
    except ImportError:
        services_status["background_replacement"] = "limited"
    
    return {
        "status": "healthy",
        "service": "StoryCore AI Advanced",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "services": services_status
    }