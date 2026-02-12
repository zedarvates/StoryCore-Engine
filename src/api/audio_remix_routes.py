"""
Audio Remix API Routes - FastAPI endpoints for audio remixing
"""

import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import time

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

try:
    from auth import get_current_user, User, rate_limiter
except ImportError:
    try:
        from ..auth import get_current_user, User, rate_limiter
    except ImportError:
        # Mock for standalone testing
        class MockUser:
            def __init__(self):
                self.username = "test_user"
                self.role = "admin"
        
        def get_current_user():
            return MockUser()
        
        User = MockUser
        rate_limiter = None

try:
    from audio_remix_engine import (
        AudioRemixEngine,
        RemixStyle,
        RemixResult,
        MusicStructure
    )
except ImportError:
    from ..audio_remix_engine import (
        AudioRemixEngine,
        RemixStyle,
        RemixResult,
        MusicStructure
    )

# Create router
audio_router = APIRouter()

# Global engine instance
_engine: Optional[AudioRemixEngine] = None

def get_engine() -> AudioRemixEngine:
    """Get or create the audio remix engine."""
    global _engine
    if _engine is None:
        _engine = AudioRemixEngine()
    return _engine


# Request/Response Models
class AnalyzeStructureRequest(BaseModel):
    music_url: str


class RemixRequest(BaseModel):
    music_url: str
    target_duration: float
    style: str = "smooth"
    fade_duration: float = 2.0
    preserve_sections: Optional[List[str]] = None


class PreviewRequest(BaseModel):
    music_url: str
    target_duration: float
    style: str = "smooth"
    preview_start: float = 0.0
    preview_duration: float = 5.0


class HealthResponse(BaseModel):
    status: str
    is_initialized: bool


class StylesResponse(BaseModel):
    styles: List[Dict[str, str]]


class AnalyzeStructureResponse(BaseModel):
    music_url: str
    duration: float
    tempo: float
    key: str
    structure: Dict[str, Any]
    sections: List[Dict[str, Any]]


class RemixResponse(BaseModel):
    music_url: str
    original_duration: float
    target_duration: float
    remix_url: str
    style: str
    cuts: List[Dict[str, Any]]
    crossfades: List[Dict[str, Any]]
    processing_time: float


class PreviewResponse(BaseModel):
    preview_url: str
    duration: float
    processing_time: float


@audio_router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    try:
        engine = get_engine()
        return HealthResponse(
            status="healthy",
            is_initialized=engine.is_initialized
        )
    except Exception as e:
        return HealthResponse(
            status="error",
            is_initialized=False
        )


@audio_router.get("/styles", response_model=StylesResponse)
async def get_remix_styles():
    """Get available remix styles."""
    styles = [
        {
            "id": "smooth",
            "name": "Smooth",
            "description": "Crossfade fluide entre les sections"
        },
        {
            "id": "beat-cut",
            "name": "Beat Cut",
            "description": "Coupures sur les beats"
        },
        {
            "id": "structural",
            "name": "Structural",
            "description": "Préserve la structure musicale"
        },
        {
            "id": "dynamic",
            "name": "Dynamic",
            "description": "Adaptation dynamique"
        }
    ]
    return StylesResponse(styles=styles)


@audio_router.post("/analyze-structure", response_model=AnalyzeStructureResponse)
async def analyze_music_structure(request: AnalyzeStructureRequest):
    """
    Analyze the structure of a music file.
    
    Example:
    ```
    POST /api/v1/audio/analyze-structure
    {
        "music_url": "/assets/music.mp3"
    }
    ```
    """
    start_time = time.time()
    
    try:
        engine = get_engine()
        structure = await engine.analyze_structure(request.music_url)
        
        return AnalyzeStructureResponse(
            music_url=request.music_url,
            duration=structure.duration,
            tempo=structure.tempo,
            key=structure.key,
            structure={
                "intro_duration": structure.intro_duration,
                "verse_duration": structure.verse_duration,
                "chorus_duration": structure.chorus_duration,
                "bridge_duration": structure.bridge_duration,
                "outro_duration": structure.outro_duration,
                "has_intro": structure.has_intro,
                "has_outro": structure.has_outro
            },
            sections=[{
                "name": s.name,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "confidence": s.confidence
            } for s in structure.sections]
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Structure analysis failed: {str(e)}"
        )


@audio_router.post("/remix", response_model=RemixResponse)
async def remix_audio(request: RemixRequest):
    """
    Remix audio to match target duration.
    
    Example:
    ```
    POST /api/v1/audio/remix
    {
        "music_url": "/assets/music.mp3",
        "target_duration": 30.0,
        "style": "smooth",
        "fade_duration": 2.0
    }
    ```
    """
    start_time = time.time()
    
    # Validate style
    try:
        style = RemixStyle(request.style)
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid style. Supported: smooth, beat-cut, structural, dynamic"
        )
    
    try:
        engine = get_engine()
        result = await engine.remix(
            music_url=request.music_url,
            target_duration=request.target_duration,
            style=style,
            fade_duration=request.fade_duration,
            preserve_sections=request.preserve_sections
        )
        
        return RemixResponse(
            music_url=request.music_url,
            original_duration=result.original_duration,
            target_duration=result.target_duration,
            remix_url=result.remix_url,
            style=request.style,
            cuts=[{
                "start_time": c.start_time,
                "end_time": c.end_time,
                "reason": c.reason
            } for c in result.cuts],
            crossfades=[{
                "start_time": cf.start_time,
                "end_time": cf.end_time,
                "duration": cf.duration
            } for cf in result.crossfades],
            processing_time=time.time() - start_time
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Remix failed: {str(e)}"
        )


@audio_router.post("/preview", response_model=PreviewResponse)
async def preview_remix(request: PreviewRequest):
    """
    Generate a short preview of the remix.
    
    Example:
    ```
    POST /api/v1/audio/preview
    {
        "music_url": "/assets/music.mp3",
        "target_duration": 30.0,
        "style": "smooth",
        "preview_start": 10.0,
        "preview_duration": 5.0
    }
    ```
    """
    start_time = time.time()
    
    try:
        engine = get_engine()
        preview_url = await engine.generate_preview(
            music_url=request.music_url,
            target_duration=request.target_duration,
            style=request.style,
            start_time=request.preview_start,
            duration=request.preview_duration
        )
        
        return PreviewResponse(
            preview_url=preview_url,
            duration=request.preview_duration,
            processing_time=time.time() - start_time
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Preview generation failed: {str(e)}"
        )
