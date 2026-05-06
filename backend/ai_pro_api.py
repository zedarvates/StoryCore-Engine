"""
AI Pro API Endpoints for StoryCore-Engine

FastAPI routes for professional features:
- Color Grading & LUTs
- Speed Ramping
- Scene Detection
- Keyframe System

Phase 10: Pro Features
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from datetime import datetime

from backend.ai_pro_service import (
    ColorGradePreset,
    SpeedRampType,
    SceneDetectionMethod,
    get_color_grading_service,
    get_speed_ramping_service,
    get_scene_detection_service,
    get_keyframe_service,
)


router = APIRouter(prefix="/api/ai/pro", tags=["ai-pro"])


# =============================================================================
# Request/Response Models
# =============================================================================


class ColorGradeRequest(BaseModel):
    """Request for color grading"""

    input_path: str
    output_path: str
    preset: str = "cinematic"
    lut_path: Optional[str] = None
    lut_intensity: float = 1.0
    contrast: float = 1.0
    saturation: float = 1.0
    brightness: float = 0.0
    gamma: float = 1.0
    highlights: float = 0.0
    shadows: float = 0.0
    temperature: float = 0.0
    tint: float = 0.0


class ColorGradeResponse(BaseModel):
    """Response for color grading"""

    success: bool
    message: str
    output_path: Optional[str] = None


class SpeedRampPoint(BaseModel):
    """A point in speed ramp curve"""

    time: float
    speed: float
    curve_type: str = "linear"


class SpeedRampRequest(BaseModel):
    """Request for speed ramping"""

    input_path: str
    output_path: str
    points: List[SpeedRampPoint]
    preserve_pitch: bool = True
    frame_interpolation: bool = False


class SpeedRampResponse(BaseModel):
    """Response for speed ramping"""

    success: bool
    message: str
    output_path: Optional[str] = None
    curve: Optional[List[Dict[str, float]]] = None


class SceneDetectionRequest(BaseModel):
    """Request for scene detection"""

    input_path: str
    method: str = "content"
    threshold: float = 0.3
    min_scene_duration: float = 1.0
    output_json: Optional[str] = None


class SceneInfo(BaseModel):
    """Information about a detected scene"""

    index: int
    start_time: float
    end_time: float
    duration: float
    frame_start: int
    frame_end: int
    score: float


class SceneDetectionResponse(BaseModel):
    """Response for scene detection"""

    success: bool
    message: str
    scenes: List[SceneInfo] = []


class KeyframeData(BaseModel):
    """Keyframe data"""

    time: float
    property_name: str
    value: Any
    easing: str = "linear"
    interpolation: str = "linear"


class AddKeyframeRequest(BaseModel):
    """Request to add a keyframe"""

    property_name: str
    time: float
    value: Any
    easing: str = "linear"
    interpolation: str = "linear"


class GetKeyframeValueRequest(BaseModel):
    """Request to get interpolated value"""

    property_name: str
    time: float


# =============================================================================
# Color Grading Endpoints
# =============================================================================


@router.post("/color-grade", response_model=ColorGradeResponse)
async def apply_color_grading(request: ColorGradeRequest):
    """
    Apply color grading to video/image.

    Presets: cinematic, vintage, teal_orange, noir, warm, cool, hdr, custom

    Custom adjustments:
    - contrast: 0.5-2.0 (1.0 = normal)
    - saturation: 0.0-2.0 (1.0 = normal)
    - brightness: -1.0 to 1.0
    - gamma: 0.5-2.0
    - temperature: -100 (cool) to 100 (warm)
    - tint: -100 (green) to 100 (magenta)
    """
    try:
        if not request.input_path:
            raise HTTPException(status_code=400, detail="input_path required")

        service = get_color_grading_service()

        from backend.ai_pro_service import ColorGradeConfig

        # Convert preset
        try:
            preset = ColorGradePreset(request.preset)
        except ValueError:
            preset = ColorGradePreset.CUSTOM

        config = ColorGradeConfig(
            input_path=request.input_path,
            output_path=request.output_path,
            preset=preset,
            lut_path=request.lut_path,
            lut_intensity=request.lut_intensity,
            contrast=request.contrast,
            saturation=request.saturation,
            brightness=request.brightness,
            gamma=request.gamma,
            highlights=request.highlights,
            shadows=request.shadows,
            temperature=request.temperature,
            tint=request.tint,
        )

        success, message = service.apply_color_grade(config)

        return ColorGradeResponse(
            success=success,
            message=message,
            output_path=request.output_path if success else None,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/color-grade/presets")
async def list_color_presets():
    """List available color grading presets."""
    service = get_color_grading_service()
    presets = service.list_presets()

    return {"presets": presets}


@router.get("/color-grade/luts")
async def list_available_luts(luts_dir: str = "./luts"):
    """List available LUT files."""
    service = get_color_grading_service()
    luts = service.list_luts(luts_dir)

    return {"luts": luts}


# =============================================================================
# Speed Ramping Endpoints
# =============================================================================


@router.post("/speed-ramp", response_model=SpeedRampResponse)
async def apply_speed_ramping(request: SpeedRampRequest):
    """
    Apply speed ramping to video.

    Create smooth speed variations using control points.

    Speed values:
    - 1.0 = normal speed
    - 0.5 = half speed (slow motion)
    - 2.0 = double speed (fast forward)

    Curve types: linear, ease_in, ease_out, ease_in_out, exponential
    """
    try:
        if not request.input_path:
            raise HTTPException(status_code=400, detail="input_path required")

        if len(request.points) < 2:
            raise HTTPException(status_code=400, detail="At least 2 points required")

        service = get_speed_ramping_service()

        from backend.ai_pro_service import SpeedRampConfig, SpeedRampPoint as SRP

        # Convert points
        points = [
            SRP(time=p.time, speed=p.speed, curve_type=SpeedRampType(p.curve_type))
            for p in request.points
        ]

        config = SpeedRampConfig(
            input_path=request.input_path,
            output_path=request.output_path,
            points=points,
            preserve_pitch=request.preserve_pitch,
            frame_interpolation=request.frame_interpolation,
        )

        success, message = service.apply_speed_ramp(config)

        # Generate curve for response
        curve = None
        if success:
            curve_data = service.create_ramp_curve(points)
            curve = [{"time": t, "speed": s} for t, s in curve_data]

        return SpeedRampResponse(
            success=success,
            message=message,
            output_path=request.output_path if success else None,
            curve=curve,
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/speed-ramp/curve")
async def generate_speed_curve(points: List[SpeedRampPoint], num_samples: int = 100):
    """Generate speed curve from control points."""
    try:
        service = get_speed_ramping_service()

        from backend.ai_pro_service import SpeedRampPoint as SRP

        converted_points = [
            SRP(time=p.time, speed=p.speed, curve_type=SpeedRampType(p.curve_type))
            for p in points
        ]

        curve = service.create_ramp_curve(converted_points, num_samples)

        return {"curve": [{"time": t, "speed": s} for t, s in curve]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Scene Detection Endpoints
# =============================================================================


@router.post("/scene-detect", response_model=SceneDetectionResponse)
async def detect_video_scenes(request: SceneDetectionRequest):
    """
    Detect scene changes in video.

    Methods:
    - **threshold**: Simple threshold-based detection
    - **content**: Content-aware detection (OpenCV)
    - **adaptive**: Adaptive threshold adjustment

    Returns list of detected scenes with timestamps.
    """
    try:
        if not request.input_path:
            raise HTTPException(status_code=400, detail="input_path required")

        service = get_scene_detection_service()

        from backend.ai_pro_service import SceneDetectionConfig

        # Convert method
        try:
            method = SceneDetectionMethod(request.method)
        except ValueError:
            method = SceneDetectionMethod.CONTENT

        config = SceneDetectionConfig(
            input_path=request.input_path,
            method=method,
            threshold=request.threshold,
            min_scene_duration=request.min_scene_duration,
            output_json=request.output_json,
        )

        success, message, scenes = service.detect_scenes(config)

        return SceneDetectionResponse(
            success=success,
            message=message,
            scenes=[
                SceneInfo(
                    index=s.index,
                    start_time=s.start_time,
                    end_time=s.end_time,
                    duration=s.duration,
                    frame_start=s.frame_start,
                    frame_end=s.frame_end,
                    score=s.score,
                )
                for s in scenes
            ],
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/scene-detect/methods")
async def list_detection_methods():
    """List available scene detection methods."""
    return {
        "methods": [
            {"id": "threshold", "description": "Simple threshold-based detection"},
            {
                "id": "content",
                "description": "Content-aware detection using frame differences",
            },
            {"id": "adaptive", "description": "Adaptive threshold adjustment"},
            {"id": "histogram", "description": "Histogram comparison (planned)"},
        ]
    }


# =============================================================================
# Keyframe System Endpoints
# =============================================================================


@router.post("/keyframes/add")
async def add_keyframe(request: AddKeyframeRequest):
    """Add a keyframe to a track."""
    try:
        service = get_keyframe_service()

        keyframe = service.add_keyframe(
            property_name=request.property_name,
            time=request.time,
            value=request.value,
            easing=request.easing,
            interpolation=request.interpolation,
        )

        return {
            "success": True,
            "keyframe": {
                "time": keyframe.time,
                "property_name": keyframe.property_name,
                "value": keyframe.value,
                "easing": keyframe.easing,
                "interpolation": keyframe.interpolation,
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/keyframes/value")
async def get_keyframe_value(request: GetKeyframeValueRequest):
    """Get interpolated value at a specific time."""
    try:
        service = get_keyframe_service()
        value = service.get_value_at_time(request.property_name, request.time)

        return {
            "property_name": request.property_name,
            "time": request.time,
            "value": value,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/keyframes/tracks")
async def list_keyframe_tracks():
    """List all keyframe tracks."""
    service = get_keyframe_service()

    tracks = []
    for prop_name, track in service._tracks.items():
        tracks.append(
            {
                "property_name": prop_name,
                "keyframe_count": len(track.keyframes),
                "time_range": {
                    "start": track.keyframes[0].time if track.keyframes else 0,
                    "end": track.keyframes[-1].time if track.keyframes else 0,
                },
            }
        )

    return {"tracks": tracks}


@router.post("/keyframes/export")
async def export_keyframes(json_path: str):
    """Export all keyframes to JSON."""
    try:
        service = get_keyframe_service()
        success = service.export_to_json(json_path)

        return {"success": success, "path": json_path if success else None}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/keyframes/import")
async def import_keyframes(json_path: str):
    """Import keyframes from JSON."""
    try:
        service = get_keyframe_service()
        success = service.import_from_json(json_path)

        return {
            "success": success,
            "message": "Keyframes imported" if success else "Import failed",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/keyframes/tracks/{property_name}")
async def clear_keyframe_track(property_name: str):
    """Clear all keyframes for a property."""
    service = get_keyframe_service()

    if property_name in service._tracks:
        del service._tracks[property_name]
        return {"success": True, "message": f"Track '{property_name}' cleared"}

    return {"success": False, "message": f"Track '{property_name}' not found"}


# =============================================================================
# Health Check
# =============================================================================


@router.get("/health")
async def pro_service_health():
    """Check health status of Pro services."""
    services_status = {
        "color_grading": "available",
        "speed_ramping": "available",
        "scene_detection": "available",
        "keyframe_system": "available",
    }

    # Check optional dependencies
    try:
        import cv2

        services_status["scene_detection"] = "opencv_available"
    except ImportError:
        services_status["scene_detection"] = "basic_only"

    return {
        "status": "healthy",
        "service": "StoryCore AI Pro",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "services": services_status,
    }
