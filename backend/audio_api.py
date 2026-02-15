"""
StoryCore-Engine Audio Processing API

This module provides REST API endpoints for audio generation and processing.
Supports text-to-speech, audio mixing, and waveform generation.

Endpoints:
- POST /api/audio/generate - Generate audio from text
- POST /api/audio/sync - Sync audio to video
- GET /api/audio/:id/waveform - Get waveform data
- POST /api/audio/mix - Mix multiple audio tracks

Requirements: Q1 2026 - Audio Processing API
"""
import logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

import asyncio
import os
import json
import logging
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from enum import Enum

from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

from backend.auth import verify_jwt_token
from backend.storage import JSONFileStorage
from backend.config import settings as app_settings

# Logger already configured at top of file; duplicate configuration removed.

# Create router
router = APIRouter()


class Settings(BaseSettings):
    """Application settings for audio processing"""
    audio_output_directory: str = Field(default="./data/audio")
    max_audio_duration_seconds: float = Field(default=600)
    default_sample_rate: int = Field(default=44100)
    
    # Timeout settings (can be overridden from centralized config)
    audio_generation_timeout: int = Field(default=300)
    audio_mix_timeout: int = Field(default=180)
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra environment variables
    
    @classmethod
    def from_central_config(cls) -> 'Settings':
        """Create settings instance with values from centralized config"""
        return cls(
            audio_generation_timeout=app_settings.AUDIO_GENERATION_TIMEOUT,
            audio_mix_timeout=app_settings.AUDIO_MIX_TIMEOUT,
        )


try:
    settings = Settings()
except Exception:
    settings = Settings()


class AudioType(str, Enum):
    """Audio type enumeration"""
    MUSIC = "music"
    SFX = "sfx"
    VOICE = "voice"
    AMBIENT = "ambient"
    MIX = "mix"


class AudioFormat(str, Enum):
    """Audio format enumeration"""
    MP3 = "mp3"
    WAV = "wav"
    OGG = "ogg"
    FLAC = "flac"


class TTSVoice(str, Enum):
    """TTS voice options"""
    FEMALE = "female"
    MALE = "male"
    NARRATOR = "narrator"


class AudioGenerationRequest(BaseModel):
    """Request model for audio generation"""
    project_id: str = Field(..., min_length=1)
    text: str = Field(..., min_length=1)
    audio_type: AudioType = AudioType.VOICE
    voice: Optional[TTSVoice] = None
    duration_seconds: Optional[float] = None
    format: AudioFormat = AudioFormat.MP3
    settings: Dict[str, Any] = {}


class AudioTrack(BaseModel):
    """Audio track model for mixing"""
    id: str
    type: AudioType
    volume: float = Field(default=1.0, ge=0.0, le=2.0)
    fade_in_seconds: float = Field(default=0.0, ge=0.0)
    fade_out_seconds: float = Field(default=0.0, ge=0.0)
    start_time_seconds: float = Field(default=0.0, ge=0.0)


class AudioMixRequest(BaseModel):
    """Request model for audio mixing"""
    project_id: str = Field(..., min_length=1)
    tracks: List[AudioTrack]
    output_format: AudioFormat = AudioFormat.MP3
    output_duration_seconds: Optional[float] = None


class AudioSyncRequest(BaseModel):
    """Request model for audio-video sync"""
    project_id: str = Field(..., min_length=1)
    audio_id: str
    video_id: str
    offset_seconds: float = Field(default=0.0)


class AudioResponse(BaseModel):
    """Response model for audio data"""
    id: str
    project_id: str
    type: AudioType
    format: AudioFormat
    duration_seconds: float
    file_size_bytes: int
    file_url: Optional[str]
    sample_rate: int
    channels: int
    status: str
    created_at: datetime


class AudioGenerationJobResponse(BaseModel):
    """Response model for audio generation job"""
    job_id: str
    status: str
    progress: int
    estimated_time_seconds: Optional[int]


# Initialize shared storage with LRU cache (max 500 audio entries)
audio_storage = JSONFileStorage(settings.audio_output_directory, max_cache_size=500)

# In-memory audio file paths (not JSON data)
audio_files: Dict[str, str] = {}


async def run_audio_generation(job_id: str, request: AudioGenerationRequest):
    """
    Background task to run audio generation.
    
    In production, this would integrate with TTS and audio processing services.
    Uses timeout from centralized configuration.
    """
    logger.info(f"Starting audio generation job {job_id}")
    
    async def _generate():
        # Simulate generation steps
        steps = [
            ("Preparing text", 10),
            ("Generating audio", 50),
            ("Encoding output", 80),
            ("Finalizing", 95)
        ]
        
        for step_name, progress in steps:
            logger.info(f"Audio generation {job_id}: {step_name} ({progress}%)")
            await asyncio.sleep(0.5)
        
        # Create mock audio file
        audio_id = job_id
        now = datetime.utcnow()
        
        audio_data = {
            "id": audio_id,
            "project_id": request.project_id,
            "type": request.audio_type.value if hasattr(request.audio_type, 'value') else request.audio_type,
            "format": request.format.value if hasattr(request.format, 'value') else request.format,
            "duration_seconds": request.duration_seconds or 10.0,
            "file_size_bytes": 1024000,
            "file_url": f"/api/audio/{audio_id}/download",
            "sample_rate": settings.default_sample_rate,
            "channels": 2,
            "status": "completed",
            "created_at": now.isoformat()
        }
        
        try:
            audio_storage.save(audio_id, audio_data)
        except (IOError, json.JSONDecodeError) as e:
            logger.exception(f"Failed to save audio data for {audio_id}: {e}")
            raise HTTPException(status_code=500, detail="Failed to persist audio data")
        except Exception as e:
            logger.exception(f"Unexpected error saving audio data for {audio_id}: {e}")
            raise HTTPException(status_code=500, detail="Unexpected error while saving audio data")
        audio_files[audio_id] = os.path.join(settings.audio_output_directory, f"{audio_id}.wav")
        
        logger.info(f"Audio generation job {job_id} completed")
    
    try:
        # Run generation with timeout from configuration
        await asyncio.wait_for(_generate(), timeout=settings.audio_generation_timeout)
    except asyncio.TimeoutError:
        logger.error(f"Audio generation job {job_id} timed out after {settings.audio_generation_timeout} seconds")
    except Exception as e:
        logger.exception(f"Audio generation job {job_id} failed: {e}")


@router.post("/audio/generate", response_model=AudioGenerationJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_audio(
    request: AudioGenerationRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(verify_jwt_token)
) -> AudioGenerationJobResponse:
    """
    Generate audio from text.
    
    Args:
        request: Audio generation parameters
        background_tasks: FastAPI background tasks
        user_id: Authenticated user ID
    
    Returns:
        Generation job response with job ID
    
    Raises:
        HTTPException: If validation fails
    """
    logger.info(f"Starting audio generation for project {request.project_id}")
    
    # Validate text length
    if len(request.text) > 5000:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Text too long. Maximum 5000 characters."
        )
    
    # Create job
    job_id = str(uuid.uuid4())
    
    # Start background generation
    background_tasks.add_task(run_audio_generation, job_id, request)
    
    logger.info(f"Audio generation job {job_id} created")
    
    estimated_time = max(5, len(request.text) // 100)  # Estimate based on text length
    
    return AudioGenerationJobResponse(
        job_id=job_id,
        status="processing",
        progress=0,
        estimated_time_seconds=estimated_time
    )


@router.get("/audio/{audio_id}", response_model=AudioResponse)
async def get_audio(
    audio_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> AudioResponse:
    """
    Get audio metadata by ID.
    
    Args:
        audio_id: Audio ID
        user_id: Authenticated user ID
    
    Returns:
        Audio metadata
    
    Raises:
        HTTPException: If audio not found
    """
    audio = load_audio(audio_id)
    
    if not audio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio not found"
        )
    
    return AudioResponse(**audio)


@router.post("/audio/mix", response_model=AudioResponse)
async def mix_audio_tracks(
    request: AudioMixRequest,
    user_id: str = Depends(verify_jwt_token)
) -> AudioResponse:
    """
    Mix multiple audio tracks into a single output.
    
    Args:
        request: Audio mixing parameters
        user_id: Authenticated user ID
    
    Returns:
        Mixed audio metadata
    
    Raises:
        HTTPException: If validation fails
    """
    logger.info(f"Mixing {len(request.tracks)} tracks for project {request.project_id}")
    
    # Validate tracks
    if len(request.tracks) < 2:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least 2 tracks required for mixing"
        )
    
    # Create mixed audio
    audio_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    # Calculate total duration
    max_duration = 0
    for track in request.tracks:
        max_duration = max(max_duration, track.start_time_seconds + 10)  # Assume 10s per track
    
    audio_data = {
        "id": audio_id,
        "project_id": request.project_id,
        "type": AudioType.MIX.value,
        "format": request.output_format.value if hasattr(request.output_format, 'value') else request.output_format,
        "duration_seconds": request.output_duration_seconds or max_duration,
        "file_size_bytes": 2048000,
        "file_url": f"/api/audio/{audio_id}/download",
        "sample_rate": settings.default_sample_rate,
        "channels": 2,
        "status": "completed",
        "created_at": now.isoformat()
    }
    
    save_audio(audio_id, audio_data)
    
    logger.info(f"Audio mix {audio_id} created successfully")
    
    return AudioResponse(**audio_data)


@router.post("/audio/sync")
async def sync_audio_to_video(
    request: AudioSyncRequest,
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    Synchronize audio track to video.
    
    Args:
        request: Audio-video sync parameters
        user_id: Authenticated user ID
    
    Returns:
        Sync result
    
    Raises:
        HTTPException: If audio or video not found
    """
    logger.info(f"Syncing audio {request.audio_id} to video {request.video_id}")
    
    audio = load_audio(request.audio_id)
    if not audio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio not found"
        )
    
    # In production, would validate video_id against video storage
    
    sync_data = {
        "audio_id": request.audio_id,
        "video_id": request.video_id,
        "offset_seconds": request.offset_seconds,
        "sync_status": "synced",
        "created_at": datetime.utcnow().isoformat()
    }
    
    return sync_data


@router.get("/audio/{audio_id}/waveform")
async def get_waveform_data(
    audio_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    Get waveform data for an audio file.
    
    Args:
        audio_id: Audio ID
        user_id: Authenticated user ID
    
    Returns:
        Waveform data points
    
    Raises:
        HTTPException: If audio not found
    """
    audio = load_audio(audio_id)
    
    if not audio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio not found"
        )
    
    # Generate mock waveform data
    # In production, would extract actual waveform from audio file
    duration = audio.get("duration_seconds", 10)
    sample_count = int(duration * 60)  # 60 samples per second
    
    import random
    waveform = [random.uniform(-1, 1) for _ in range(sample_count)]
    
    # Smooth the waveform - O(n) running average algorithm
    smoothed_waveform = []
    window_size = 5
    half_window = window_size // 2
    window_sum = sum(waveform[:window_size])
    
    for i in range(len(waveform)):
        start = max(0, i - half_window)
        end = min(len(waveform), i + half_window + 1)
        
        if i > half_window:
            window_sum += waveform[end-1] - waveform[start-1]
        
        smoothed_waveform.append(window_sum / (end - start))
    
    return {
        "audio_id": audio_id,
        "duration_seconds": duration,
        "sample_count": len(smoothed_waveform),
        "samples_per_second": 60,
        "waveform": smoothed_waveform[:1000],  # Return max 1000 points
        "peak_amplitude": max(abs(x) for x in smoothed_waveform) if smoothed_waveform else 0
    }


@router.get("/audio/{audio_id}/download")
async def download_audio(
    audio_id: str,
    user_id: str = Depends(verify_jwt_token)
):
    """
    Download an audio file.
    
    Args:
        audio_id: Audio ID
        user_id: Authenticated user ID
    
    Returns:
        Audio file
    
    Raises:
        HTTPException: If audio not found
    """
    audio = load_audio(audio_id)
    
    if not audio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Audio not found"
        )
    
    # In production, would return actual file
    # For now, return a mock response
    return {
        "message": f"Audio file {audio_id}",
        "format": audio.get("format"),
        "url": f"/api/audio/{audio_id}/download"
    }


@router.get("/projects/{project_id}/audio")
async def list_project_audio(
    project_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    List all audio files for a project.
    
    Args:
        project_id: Project ID
        user_id: Authenticated user ID
    
    Returns:
        List of audio files
    """
    project_audio = [
        {
            "id": audio["id"],
            "type": audio["type"],
            "format": audio["format"],
            "duration_seconds": audio["duration_seconds"],
            "created_at": audio["created_at"]
        }
        for audio in audio_db.values()
        if audio.get("project_id") == project_id
    ]
    
    return {
        "audio_files": project_audio,
        "total": len(project_audio)
    }


# =============================================================================
# MULTI-TRACK AUDIO ENDPOINTS (AUDIO & SFX STORYCORE ENGINE)
# =============================================================================

# Import profile builders
from backend.music_profile_builder import MusicProfileBuilder, MusicProfile
from backend.sfx_profile_builder import SFXProfileBuilder, SFXProfile
from backend.voice_profile_builder import VoiceProfileBuilder, VoiceProfile
from backend.prompt_composer import PromptComposer
from backend.audio_mix_service import AudioMixService, MixConfiguration


class ProfileType(str, Enum):
    """Profile type enumeration for multi-track"""
    MUSIC = "music"
    SFX = "sfx"
    VOICE = "voice"


class MultitrackGenerationRequest(BaseModel):
    """Request model for multi-track audio generation"""
    project_id: str = Field(..., min_length=1)
    profile_type: ProfileType
    # Music profile fields
    project_type: Optional[str] = None
    location: Optional[str] = None
    themes: List[str] = Field(default_factory=list)
    visual_style: Optional[str] = None
    emotional_intensity: Optional[str] = None
    action_type: Optional[str] = None
    action_intensity: Optional[str] = None
    visual_rhythm: Optional[str] = None
    duration_seconds: Optional[float] = None
    # SFX fields
    sfx_action_type: Optional[str] = None
    sfx_intensity: Optional[str] = None
    environment: Optional[str] = None
    muffling_enabled: bool = False
    # Voice fields
    voice_type: Optional[str] = None
    voice_style: Optional[str] = None
    text_content: Optional[str] = None
    language: str = "fr"
    # Options
    options: Dict[str, Any] = Field(default_factory=dict)


class MultitrackJobResponse(BaseModel):
    """Response model for multi-track generation job"""
    job_id: str
    status: str  # pending, processing, completed, failed
    progress: int
    profile_type: str
    tracks_generated: List[str]
    estimated_time_seconds: Optional[int]
    prompts: Optional[List[Dict[str, str]]] = None


class ProfileBuildResponse(BaseModel):
    """Response model for profile building"""
    success: bool
    profile_type: str
    profile: Dict[str, Any]
    errors: List[str] = Field(default_factory=list)


class AutoMixRequest(BaseModel):
    """Request model for auto-mix"""
    project_id: str = Field(..., min_length=1)
    track_ids: List[str]
    auto_mix_enabled: bool = True
    ducking_enabled: bool = True


class AutoMixResponse(BaseModel):
    """Response model for auto-mix"""
    success: bool
    configuration: Optional[Dict[str, Any]] = None
    warnings: List[str] = Field(default_factory=list)
    errors: List[str] = Field(default_factory=list)


# Initialize services
prompt_composer = PromptComposer()
audio_mix_service = AudioMixService()


async def run_multitrack_generation(
    job_id: str,
    request: MultitrackGenerationRequest
) -> MultitrackGenerationResponse:
    """
    Background task to run multi-track audio generation.
    """
    logger.info(f"Starting multi-track generation job {job_id}")
    
    try:
        # Build profile based on type
        if request.profile_type == ProfileType.MUSIC:
            builder = MusicProfileBuilder(request.project_id)
            if request.project_type:
                builder.set_project_type(request.project_type)
            if request.location:
                builder.set_location(request.location)
            for theme in request.themes:
                builder.add_theme(theme)
            if request.visual_style:
                builder.set_visual_style(request.visual_style)
            if request.emotional_intensity:
                builder.set_emotional_intensity(request.emotional_intensity)
            if request.action_type and request.action_intensity and request.visual_rhythm:
                builder.set_action(request.action_type, request.action_intensity, request.visual_rhythm)
            if request.duration_seconds:
                builder.set_duration(request.duration_seconds)
            
            profile = builder.build()
            prompts = prompt_composer.compose_all_music_prompts(profile)
            
        elif request.profile_type == ProfileType.SFX:
            builder = SFXProfileBuilder(request.project_id)
            if request.sfx_action_type:
                builder.set_action_type(request.sfx_action_type)
            if request.sfx_intensity:
                builder.set_intensity(request.sfx_intensity)
            if request.environment:
                builder.set_environment(request.environment)
            if request.muffling_enabled:
                builder.enable_muffling()
            if request.duration_seconds:
                builder.set_duration(request.duration_seconds)
            
            profile = builder.build()
            prompts = prompt_composer.compose_all_sfx_prompts(profile)
            
        elif request.profile_type == ProfileType.VOICE:
            builder = VoiceProfileBuilder(request.project_id)
            if request.voice_type:
                builder.set_voice_type(request.voice_type)
            if request.voice_style:
                builder.set_voice_style(request.voice_style)
            if request.text_content:
                builder.set_text(request.text_content)
            builder.set_language(request.language)
            if request.duration_seconds:
                builder.set_duration(request.duration_seconds)
            
            profile = builder.build()
            voice_prompt = prompt_composer.compose_voice_prompt(profile)
            prompts = [voice_prompt]
        
        # Generate mock track IDs
        track_ids = [f"{request.project_id}_{request.profile_type.value}_{i}" for i in range(len(prompts))]
        
        logger.info(f"Multi-track generation job {job_id} completed with {len(track_ids)} tracks")
        
        return MultitrackGenerationResponse(
            job_id=job_id,
            status="completed",
            progress=100,
            profile_type=request.profile_type.value,
            tracks_generated=track_ids,
            estimated_time_seconds=30,
            prompts=[
                {"track_name": p.track_name, "track_type": p.track_type, "prompt": p.prompt}
                for p in prompts
            ]
        )
        
    except Exception as e:
        logger.exception(f"Multi-track generation job {job_id} failed: {e}")
        return MultitrackGenerationResponse(
            job_id=job_id,
            status="failed",
            progress=0,
            profile_type=request.profile_type.value,
            tracks_generated=[],
            estimated_time_seconds=0
        )


@router.post("/audio/generate-multitrack", response_model=MultitrackJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_multitrack(
    request: MultitrackGenerationRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(verify_jwt_token)
) -> MultitrackJobResponse:
    """
    Generate multi-track audio (music, SFX, or voice).
    
    Args:
        request: Multi-track generation parameters
        background_tasks: FastAPI background tasks
        user_id: Authenticated user ID
    
    Returns:
        Generation job response with job ID
    """
    logger.info(f"Starting multi-track generation for project {request.project_id}")
    
    # Create job
    job_id = str(uuid.uuid4())
    
    # Start background generation
    background_tasks.add_task(run_multitrack_generation, job_id, request)
    
    logger.info(f"Multi-track generation job {job_id} created")
    
    return MultitrackJobResponse(
        job_id=job_id,
        status="processing",
        progress=0,
        profile_type=request.profile_type.value,
        tracks_generated=[],
        estimated_time_seconds=60
    )


@router.post("/audio/build-profile", response_model=ProfileBuildResponse)
async def build_profile(
    request: MultitrackGenerationRequest,
    user_id: str = Depends(verify_jwt_token)
) -> ProfileBuildResponse:
    """
    Build an audio profile without generating audio.
    
    Args:
        request: Profile building parameters
        user_id: Authenticated user ID
    
    Returns:
        Built profile as dictionary
    """
    logger.info(f"Building {request.profile_type.value} profile for project {request.project_id}")
    
    try:
        if request.profile_type == ProfileType.MUSIC:
            builder = MusicProfileBuilder(request.project_id)
            if request.project_type:
                builder.set_project_type(request.project_type)
            if request.location:
                builder.set_location(request.location)
            for theme in request.themes:
                builder.add_theme(theme)
            if request.visual_style:
                builder.set_visual_style(request.visual_style)
            if request.emotional_intensity:
                builder.set_emotional_intensity(request.emotional_intensity)
            if request.action_type and request.action_intensity and request.visual_rhythm:
                builder.set_action(request.action_type, request.action_intensity, request.visual_rhythm)
            if request.duration_seconds:
                builder.set_duration(request.duration_seconds)
            
            profile = builder.build()
            return ProfileBuildResponse(
                success=True,
                profile_type="music",
                profile=profile.to_dict() if hasattr(profile, 'to_dict') else profile.__dict__
            )
            
        elif request.profile_type == ProfileType.SFX:
            builder = SFXProfileBuilder(request.project_id)
            if request.sfx_action_type:
                builder.set_action_type(request.sfx_action_type)
            if request.sfx_intensity:
                builder.set_intensity(request.sfx_intensity)
            if request.environment:
                builder.set_environment(request.environment)
            if request.duration_seconds:
                builder.set_duration(request.duration_seconds)
            
            profile = builder.build()
            return ProfileBuildResponse(
                success=True,
                profile_type="sfx",
                profile=profile.to_dict() if hasattr(profile, 'to_dict') else profile.__dict__
            )
            
        elif request.profile_type == ProfileType.VOICE:
            builder = VoiceProfileBuilder(request.project_id)
            if request.voice_type:
                builder.set_voice_type(request.voice_type)
            if request.voice_style:
                builder.set_voice_style(request.voice_style)
            if request.text_content:
                builder.set_text(request.text_content)
            builder.set_language(request.language)
            if request.duration_seconds:
                builder.set_duration(request.duration_seconds)
            
            profile = builder.build()
            return ProfileBuildResponse(
                success=True,
                profile_type="voice",
                profile=profile.to_dict() if hasattr(profile, 'to_dict') else profile.__dict__
            )
        
        return ProfileBuildResponse(
            success=False,
            profile_type=request.profile_type.value,
            profile={},
            errors=["Unknown profile type"]
        )
        
    except Exception as e:
        logger.exception(f"Profile building failed: {e}")
        return ProfileBuildResponse(
            success=False,
            profile_type=request.profile_type.value,
            profile={},
            errors=[str(e)]
        )


@router.post("/audio/automix", response_model=AutoMixResponse)
async def apply_automix(
    request: AutoMixRequest,
    user_id: str = Depends(verify_jwt_token)
) -> AutoMixResponse:
    """
    Apply automatic mixing to a set of tracks.
    
    Args:
        request: Auto-mix parameters
        user_id: Authenticated user ID
    
    Returns:
        Mix configuration and any warnings
    """
    logger.info(f"Applying auto-mix to {len(request.track_ids)} tracks")
    
    try:
        # Build track list from IDs (mock data for now)
        tracks = [
            {
                "id": track_id,
                "name": f"Track {i}",
                "category": "music",
                "volume": 0.0,
                "pan": 0.0,
                "muted": False,
                "phase": "stereo",
                "project_id": request.project_id
            }
            for i, track_id in enumerate(request.track_ids)
        ]
        
        # Apply auto-mix
        result = audio_mix_service.auto_mix(
            tracks=tracks,
            auto_mix_enabled=request.auto_mix_enabled,
            ducking_enabled=request.ducking_enabled
        )
        
        if result.success and result.configuration:
            config_dict = {
                "id": result.configuration.id,
                "project_id": request.project_id,
                "master_volume": result.configuration.masterVolume,
                "tracks": [
                    {
                        "id": t.id,
                        "name": t.name,
                        "category": t.category.value,
                        "volume": t.volume,
                        "pan": t.pan,
                        "priority": t.priority.value
                    }
                    for t in result.configuration.tracks
                ],
                "auto_mix_enabled": result.configuration.autoMixEnabled,
                "ducking_enabled": result.configuration.duckingEnabled
            }
            
            return AutoMixResponse(
                success=True,
                configuration=config_dict,
                warnings=result.warnings,
                errors=[]
            )
        else:
            return AutoMixResponse(
                success=False,
                configuration=None,
                warnings=result.warnings,
                errors=result.errors
            )
            
    except Exception as e:
        logger.exception(f"Auto-mix failed: {e}")
        return AutoMixResponse(
            success=False,
            configuration=None,
            warnings=[],
            errors=[str(e)]
        )


@router.post("/audio/export-mix")
async def export_mix(
    project_id: str,
    format: str = "wav",
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    Export a mixed audio file.
    
    Args:
        project_id: Project ID
        format: Output format (wav, mp3, flac)
        user_id: Authenticated user ID
    
    Returns:
        Export result with file path
    """
    logger.info(f"Exporting mix for project {project_id} in format {format}")
    
    # Mock export result
    return {
        "success": True,
        "output_path": f"/exports/{project_id}/mix.{format}",
        "file_size_bytes": 10240000,
        "duration_seconds": 120.0,
        "format": format,
        "message": f"Mix exported successfully"
    }
