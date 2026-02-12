"""
Transcription API Routes - FastAPI endpoints for audio transcription
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
    from transcription_engine import (
        TranscriptionEngine,
        Transcript,
        MontageRequest,
        MontageResult,
        SegmentType
    )
except ImportError:
    from ..transcription_engine import (
        TranscriptionEngine,
        Transcript,
        MontageRequest,
        MontageResult,
        SegmentType
    )

# Create router
transcription_router = APIRouter()

# Global engine instance
_engine: Optional[TranscriptionEngine] = None

def get_engine() -> TranscriptionEngine:
    """Get or create the transcription engine."""
    global _engine
    if _engine is None:
        _engine = TranscriptionEngine()
    return _engine


# Request/Response Models
class TranscribeRequest(BaseModel):
    audio_url: str
    language: str = "fr"
    enable_speaker_diarization: bool = True


class MontageRequestModel(BaseModel):
    transcript_id: str
    style: str = "chronological"
    include_speakers: Optional[List[str]] = None
    exclude_speakers: Optional[List[str]] = None
    max_duration: Optional[float] = None


class HealthResponse(BaseModel):
    status: str
    is_initialized: bool
    available_languages: List[str]


class LanguagesResponse(BaseModel):
    languages: List[Dict[str, str]]


class TranscribeResponse(BaseModel):
    transcript_id: str
    audio_url: str
    language: str
    duration: float
    word_count: int
    speaker_count: int
    segments: List[Dict[str, Any]]
    processing_time: float


class TranscriptResponse(BaseModel):
    transcript_id: str
    audio_url: str
    language: str
    duration: float
    word_count: int
    speaker_count: int
    segments: List[Dict[str, Any]]


class MontageResponse(BaseModel):
    transcript_id: str
    style: str
    total_duration: float
    shots: List[Dict[str, Any]]
    summary: str


@transcription_router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    try:
        engine = get_engine()
        return HealthResponse(
            status="healthy",
            is_initialized=engine.is_initialized,
            available_languages=["fr", "en", "es", "de"]
        )
    except Exception as e:
        return HealthResponse(
            status="error",
            is_initialized=False,
            available_languages=[]
        )


@transcription_router.get("/languages", response_model=LanguagesResponse)
async def get_supported_languages():
    """Get supported languages for transcription."""
    languages = [
        {"code": "fr", "name": "Français"},
        {"code": "en", "name": "English"},
        {"code": "es", "name": "Español"},
        {"code": "de", "name": "Deutsch"},
        {"code": "auto", "name": "Auto-detection"}
    ]
    return LanguagesResponse(languages=languages)


@transcription_router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(request: TranscribeRequest):
    """
    Transcribe an audio file to text.
    
    Example:
    ```
    POST /api/v1/transcription/transcribe
    {
        "audio_url": "/assets/audio.wav",
        "language": "fr",
        "enable_speaker_diarization": true
    }
    ```
    """
    start_time = time.time()
    
    try:
        engine = get_engine()
        transcript = await engine.transcribe(
            audio_url=request.audio_url,
            language=request.language,
            enable_speaker_diarization=request.enable_speaker_diarization
        )
        
        return TranscribeResponse(
            transcript_id=transcript.transcript_id,
            audio_url=request.audio_url,
            language=request.language,
            duration=transcript.duration,
            word_count=transcript.word_count,
            speaker_count=transcript.speaker_count,
            segments=[{
                "segment_id": s.segment_id,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "text": s.text,
                "speaker": {
                    "speaker_id": s.speaker.speaker_id,
                    "speaker_label": s.speaker.speaker_label
                } if s.speaker else None,
                "confidence": s.confidence,
                "segment_type": s.segment_type.value if s.segment_type else None
            } for s in transcript.segments],
            processing_time=time.time() - start_time
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription failed: {str(e)}"
        )


@transcription_router.get("/{transcript_id}", response_model=TranscriptResponse)
async def get_transcript(transcript_id: str):
    """
    Get an existing transcript by ID.
    
    Example:
    ```
    GET /api/v1/transcription/transcript_123
    ```
    """
    try:
        engine = get_engine()
        transcript = engine.get_transcript(transcript_id)
        
        if not transcript:
            raise HTTPException(
                status_code=404,
                detail=f"Transcript not found: {transcript_id}"
            )
        
        return TranscriptResponse(
            transcript_id=transcript.transcript_id,
            audio_url=transcript.audio_url,
            language=transcript.language,
            duration=transcript.duration,
            word_count=transcript.word_count,
            speaker_count=transcript.speaker_count,
            segments=[{
                "segment_id": s.segment_id,
                "start_time": s.start_time,
                "end_time": s.end_time,
                "text": s.text,
                "speaker": {
                    "speaker_id": s.speaker.speaker_id,
                    "speaker_label": s.speaker.speaker_label
                } if s.speaker else None,
                "confidence": s.confidence,
                "segment_type": s.segment_type.value if s.segment_type else None
            } for s in transcript.segments]
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get transcript: {str(e)}"
        )


@transcription_router.get("/{transcript_id}/export/srt")
async def export_srt(transcript_id: str):
    """
    Export transcript as SRT subtitle format.
    
    Example:
    ```
    GET /api/v1/transcription/transcript_123/export/srt
    ```
    """
    try:
        engine = get_engine()
        transcript = engine.get_transcript(transcript_id)
        
        if not transcript:
            raise HTTPException(
                status_code=404,
                detail=f"Transcript not found: {transcript_id}"
            )
        
        srt_content = engine.export_srt(transcript_id)
        
        return Response(
            content=srt_content,
            media_type="text/plain",
            headers={
                "Content-Disposition": f'attachment; filename="{transcript_id}.srt"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export SRT: {str(e)}"
        )


@transcription_router.get("/{transcript_id}/export/vtt")
async def export_vtt(transcript_id: str):
    """
    Export transcript as VTT subtitle format.
    ```
    GET /api/v1    
    Example:
/transcription/transcript_123/export/vtt
    ```
    """
    try:
        engine = get_engine()
        transcript = engine.get_transcript(transcript_id)
        
        if not transcript:
            raise HTTPException(
                status_code=404,
                detail=f"Transcript not found: {transcript_id}"
            )
        
        vtt_content = engine.export_vtt(transcript_id)
        
        return Response(
            content=vtt_content,
            media_type="text/plain",
            headers={
                "Content-Disposition": f'attachment; filename="{transcript_id}.vtt"'
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to export VTT: {str(e)}"
        )


@transcription_router.post("/generate-montage", response_model=MontageResponse)
async def generate_montage(request: MontageRequestModel):
    """
    Generate a video montage based on transcript text.
    
    Example:
    ```
    POST /api/v1/transcription/generate-montage
    {
        "transcript_id": "transcript_123",
        "style": "chronological"
    }
    ```
    """
    try:
        engine = get_engine()
        result = await engine.generate_montage(
            transcript_id=request.transcript_id,
            style=request.style,
            include_speakers=request.include_speakers,
            exclude_speakers=request.exclude_speakers,
            max_duration=request.max_duration
        )
        
        return MontageResponse(
            transcript_id=request.transcript_id,
            style=request.style,
            total_duration=result.total_duration,
            shots=[{
                "shot_id": shot.shot_id,
                "source_start": shot.source_start,
                "source_end": shot.source_end,
                "text": shot.text,
                "speaker": shot.speaker
            } for shot in result.shots],
            summary=result.summary
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Montage generation failed: {str(e)}"
        )


# Import Response for export endpoints
from fastapi.responses import Response
