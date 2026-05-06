"""
AI Audio API Endpoints for StoryCore-Engine

FastAPI routes for AI-powered audio services:
- Beat detection
- Voice isolation
- Auto-ducking
- Audio worldization
- Transcription

Phase 1 & 4: Core Efficiency + Audio Mastering
"""

import json
import logging
import os
import tempfile
from datetime import datetime
from typing import List, Optional, Tuple

from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from pydantic import BaseModel

from backend.ai_audio_service import (
    AudioEnvironment,
    BeatDetectionMethod,
    DuckingConfig,
    VoiceIsolationConfig,
    VoiceIsolationMethod,
    get_beat_service,
    get_cleaning_service,
    get_ducking_service,
    get_transcription_service,
    get_worldization_service,
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/ai/audio", tags=["ai-audio"])


# =============================================================================
# Request/Response Models
# =============================================================================


class BeatDetectionRequest(BaseModel):
    """Request for beat detection"""

    audio_path: str
    method: str = "librosa"  # "librosa", "energy", "spectral"


class BeatInfoResponse(BaseModel):
    """Single beat information"""

    timestamp: float
    confidence: float
    beat_type: str
    tempo: float


class BeatDetectionResponse(BaseModel):
    """Response for beat detection"""

    success: bool
    tempo: float
    tempo_confidence: float
    beats: List[BeatInfoResponse]
    downbeats: List[float]
    time_signature: str
    duration: float
    beat_count: int


class VoiceIsolationRequest(BaseModel):
    """Request for voice isolation"""

    input_path: str
    output_path: str
    method: str = "spectral_subtraction"
    noise_reduction_db: float = 20.0
    preserve_voice_quality: bool = True


class VoiceIsolationResponse(BaseModel):
    """Response for voice isolation"""

    success: bool
    message: str
    output_path: Optional[str] = None


class AutoDuckingRequest(BaseModel):
    """Request for auto-ducking"""

    music_path: str
    dialogue_path: str
    output_path: str
    threshold_db: float = -30.0
    duck_amount_db: float = -12.0
    attack_ms: float = 5.0
    release_ms: float = 100.0


class AutoDuckingResponse(BaseModel):
    """Response for auto-ducking"""

    success: bool
    message: str
    output_path: Optional[str] = None


class WorldizationRequest(BaseModel):
    """Request for audio worldization"""

    input_path: str
    output_path: str
    environment: str = "small_room"
    intensity: float = 1.0


class WorldizationResponse(BaseModel):
    """Response for audio worldization"""

    success: bool
    message: str
    environment: str


class TranscriptionRequest(BaseModel):
    """Request for transcription"""

    audio_path: str
    language: str = "auto"
    backend: str = "whisper"


class TranscriptionWordResponse(BaseModel):
    """Single word in transcription"""

    word: str
    start_time: float
    end_time: float
    confidence: float
    speaker_id: Optional[str] = None


class TranscriptionResponse(BaseModel):
    """Response for transcription"""

    success: bool
    text: str
    words: List[TranscriptionWordResponse]
    language: str
    duration: float
    word_count: int


class BeatAlignedCutsRequest(BaseModel):
    """Request for beat-aligned cuts"""

    beat_times: List[float]
    target_durations: List[float]
    tolerance: float = 0.2


class BeatAlignedCutsResponse(BaseModel):
    """Response for beat-aligned cuts"""

    cuts: List[Tuple[float, float]]
    total_cuts: int


class SpeechSegmentsRequest(BaseModel):
    """Request for speech segment detection"""

    audio_path: str
    threshold_db: float = -30.0
    min_duration: float = 0.1


class SpeechSegmentResponse(BaseModel):
    """Response for speech segment detection"""

    segments: List[Tuple[float, float]]
    total_segments: int
    total_speech_duration: float


# =============================================================================
# Beat Detection Endpoints
# =============================================================================


@router.post("/detect-beats", response_model=BeatDetectionResponse)
async def detect_beats(request: BeatDetectionRequest):
    """
    Detect beats in an audio file for music synchronization.

    Supports multiple detection methods:
    - **librosa**: ML-based, most accurate (requires librosa)
    - **energy**: Simple energy-based detection
    - **spectral**: Spectral flux detection

    Returns tempo, beat timestamps, and downbeat information.
    """
    try:
        if not os.path.exists(request.audio_path):
            raise HTTPException(
                status_code=404, detail=f"Audio file not found: {request.audio_path}"
            )

        service = get_beat_service()
        method = BeatDetectionMethod(request.method)

        result = service.detect_beats(request.audio_path, method)

        return BeatDetectionResponse(
            success=result.success,
            tempo=result.tempo,
            tempo_confidence=result.tempo_confidence,
            beats=[
                BeatInfoResponse(
                    timestamp=b.timestamp,
                    confidence=b.confidence,
                    beat_type=b.beat_type,
                    tempo=b.tempo,
                )
                for b in result.beats
            ],
            downbeats=result.downbeats,
            time_signature=result.time_signature,
            duration=result.duration,
            beat_count=len(result.beats),
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid parameter: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/beat-aligned-cuts", response_model=BeatAlignedCutsResponse)
async def get_beat_aligned_cuts(request: BeatAlignedCutsRequest):
    """
    Get cut points aligned to beats.

    Given a list of beat times and target durations, returns
    the optimal cut points that align with beats.
    """
    try:
        service = get_beat_service()
        cuts = service.get_beat_aligned_cuts(
            request.beat_times, request.target_durations, request.tolerance
        )

        return BeatAlignedCutsResponse(cuts=cuts, total_cuts=len(cuts))

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Voice Isolation Endpoints
# =============================================================================


@router.post("/isolate-voice", response_model=VoiceIsolationResponse)
async def isolate_voice(request: VoiceIsolationRequest):
    """
    Isolate voice from background noise and music.

    Methods:
    - **spectral_subtraction**: Removes noise using spectral analysis
    - **wiener**: Wiener filter for noise reduction
    - **demucs**: ML-based separation (requires demucs)

    Returns cleaned audio with isolated voice.
    """
    try:
        if not os.path.exists(request.input_path):
            raise HTTPException(
                status_code=404, detail=f"Input file not found: {request.input_path}"
            )

        service = get_cleaning_service()
        config = VoiceIsolationConfig(
            method=VoiceIsolationMethod(request.method),
            noise_reduction_db=request.noise_reduction_db,
            preserve_voice_quality=request.preserve_voice_quality,
        )

        success, message = service.isolate_voice(
            request.input_path, request.output_path, config
        )

        return VoiceIsolationResponse(
            success=success,
            message=message,
            output_path=request.output_path if success else None,
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid parameter: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reduce-noise")
async def reduce_noise(
    input_path: str,
    output_path: str,
    noise_reduction_db: float = 20.0,
    preserve_voice: bool = True,
):
    """
    Simple noise reduction without full voice isolation.

    Applies noise reduction filter optimized for voice preservation.
    """
    try:
        if not os.path.exists(input_path):
            raise HTTPException(
                status_code=404, detail=f"Input file not found: {input_path}"
            )

        service = get_cleaning_service()
        success, message = service.reduce_noise(
            input_path, output_path, noise_reduction_db, preserve_voice
        )

        return {
            "success": success,
            "message": message,
            "output_path": output_path if success else None,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Auto-Ducking Endpoints
# =============================================================================


@router.post("/auto-duck", response_model=AutoDuckingResponse)
async def apply_auto_ducking(request: AutoDuckingRequest):
    """
    Apply automatic ducking to music based on dialogue.

    Uses sidechain compression to automatically reduce music volume
    when dialogue is present.

    Parameters:
    - **threshold_db**: Level at which ducking starts
    - **attack_ms**: How quickly ducking responds
    - **release_ms**: How quickly volume returns to normal
    """
    try:
        if not os.path.exists(request.music_path):
            raise HTTPException(
                status_code=404, detail=f"Music file not found: {request.music_path}"
            )
        if not os.path.exists(request.dialogue_path):
            raise HTTPException(
                status_code=404,
                detail=f"Dialogue file not found: {request.dialogue_path}",
            )

        service = get_ducking_service()
        config = DuckingConfig(
            threshold_db=request.threshold_db,
            duck_amount_db=request.duck_amount_db,
            attack_ms=request.attack_ms,
            release_ms=request.release_ms,
        )

        success, message = service.apply_ducking(
            request.music_path, request.dialogue_path, request.output_path, config
        )

        return AutoDuckingResponse(
            success=success,
            message=message,
            output_path=request.output_path if success else None,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/auto-duck-video")
async def apply_auto_ducking_video(
    video_path: str,
    output_path: str,
    threshold_db: float = -30.0,
    duck_amount_db: float = -12.0,
):
    """
    Apply ducking to video's background music when voice is detected.

    Automatically extracts audio, detects voice, applies ducking,
    and remuxes with the original video.
    """
    try:
        if not os.path.exists(video_path):
            raise HTTPException(
                status_code=404, detail=f"Video file not found: {video_path}"
            )

        service = get_ducking_service()
        config = DuckingConfig(threshold_db=threshold_db, duck_amount_db=duck_amount_db)

        success, message = service.apply_ducking_video(video_path, output_path, config)

        return {
            "success": success,
            "message": message,
            "output_path": output_path if success else None,
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/detect-speech-segments", response_model=SpeechSegmentResponse)
async def detect_speech_segments(request: SpeechSegmentsRequest):
    """
    Detect segments with speech for ducking timing.

    Returns list of (start, end) times where speech is detected.
    """
    try:
        if not os.path.exists(request.audio_path):
            raise HTTPException(
                status_code=404, detail=f"Audio file not found: {request.audio_path}"
            )

        service = get_ducking_service()
        segments = service.detect_speech_segments(
            request.audio_path, request.threshold_db, request.min_duration
        )

        total_duration = sum(end - start for start, end in segments)

        return SpeechSegmentResponse(
            segments=segments,
            total_segments=len(segments),
            total_speech_duration=total_duration,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Audio Worldization Endpoints
# =============================================================================


@router.post("/worldize", response_model=WorldizationResponse)
async def apply_worldization(request: WorldizationRequest):
    """
    Apply environment acoustic simulation (worldization).

    Simulates how audio would sound in different environments:
    - **phone**: Telephone quality
    - **stadium**: Large stadium echo
    - **cave**: Cave reverb
    - **concert_hall**: Concert hall acoustics
    - **small_room**: Small room ambience
    - **bathroom**: Bathroom tile echo
    - **car**: Car interior
    - **forest**: Outdoor forest ambience
    - **underwater**: Underwater muffled sound
    """
    try:
        if not os.path.exists(request.input_path):
            raise HTTPException(
                status_code=404, detail=f"Input file not found: {request.input_path}"
            )

        service = get_worldization_service()
        environment = AudioEnvironment(request.environment)

        success, message = service.apply_environment(
            request.input_path, request.output_path, environment, request.intensity
        )

        return WorldizationResponse(
            success=success, message=message, environment=request.environment
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid environment: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/environments")
async def list_environments():
    """List available audio environment presets."""
    service = get_worldization_service()
    return {"environments": service.list_environments()}


# =============================================================================
# Transcription Endpoints
# =============================================================================


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(request: TranscriptionRequest):
    """
    Transcribe audio to text with timestamps.

    Supports multiple backends:
    - **whisper**: OpenAI Whisper (requires openai-whisper)
    - **vosk**: Offline transcription (requires vosk)

    Returns full text and word-level timestamps for navigation.
    """
    try:
        if not os.path.exists(request.audio_path):
            raise HTTPException(
                status_code=404, detail=f"Audio file not found: {request.audio_path}"
            )

        service = get_transcription_service()
        result = service.transcribe(
            request.audio_path, request.language, request.backend
        )

        return TranscriptionResponse(
            success=result.success,
            text=result.text,
            words=[
                TranscriptionWordResponse(
                    word=w.word,
                    start_time=w.start_time,
                    end_time=w.end_time,
                    confidence=w.confidence,
                    speaker_id=w.speaker_id,
                )
                for w in result.words
            ],
            language=result.language,
            duration=result.duration,
            word_count=len(result.words),
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transcribe-file", response_model=TranscriptionResponse)
async def transcribe_audio_file(
    file: UploadFile = File(...),
    language: str = Query("auto"),
    backend: str = Query("whisper"),
):
    """
    Transcribe an uploaded audio file.

    This saves the uploaded file to a temporary location and then
    runs the transcription service on it.
    """
    try:
        # Create a temporary file to store the upload
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=os.path.splitext(file.filename)[1]
        ) as temp:
            content = await file.read()
            temp.write(content)
            temp_path = temp.name

        try:
            service = get_transcription_service()
            result = service.transcribe(temp_path, language, backend)

            return TranscriptionResponse(
                success=result.success,
                text=result.text,
                words=[
                    TranscriptionWordResponse(
                        word=w.word,
                        start_time=w.start_time,
                        end_time=w.end_time,
                        confidence=w.confidence,
                        speaker_id=w.speaker_id,
                    )
                    for w in result.words
                ],
                language=result.language,
                duration=result.duration,
                word_count=len(result.words),
            )
        finally:
            # Always clean up the temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)

    except Exception as e:
        logger.error(f"File transcription error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transcribe/search")
async def search_transcription(transcription_json: str, query: str):
    """
    Search for words/phrases in a transcription.

    Returns list of matching words with their timestamps.
    """
    try:
        from backend.ai_audio_service import TranscriptionResult, TranscriptionWord

        # Parse transcription
        data = json.loads(transcription_json)
        transcription = TranscriptionResult(
            success=data.get("success", True),
            text=data.get("text", ""),
            words=[
                TranscriptionWord(
                    word=w["word"],
                    start_time=w["start_time"],
                    end_time=w["end_time"],
                    confidence=w.get("confidence", 0.9),
                    speaker_id=w.get("speaker_id"),
                )
                for w in data.get("words", [])
            ],
            language=data.get("language", "en"),
            duration=data.get("duration", 0.0),
        )

        service = get_transcription_service()
        results = service.search_in_transcription(transcription, query)

        return {
            "query": query,
            "matches": [
                {
                    "word": word.word,
                    "start_time": word.start_time,
                    "end_time": word.end_time,
                    "position": pos,
                }
                for word, pos in results
            ],
            "total_matches": len(results),
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON for transcription")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/transcribe/timestamp")
async def get_word_timestamp(transcription_json: str, word: str):
    """
    Get timestamp for a specific word in transcription.

    Useful for transcription-based navigation.
    """
    try:
        from backend.ai_audio_service import TranscriptionResult, TranscriptionWord

        data = json.loads(transcription_json)
        transcription = TranscriptionResult(
            success=data.get("success", True),
            text=data.get("text", ""),
            words=[
                TranscriptionWord(
                    word=w["word"],
                    start_time=w["start_time"],
                    end_time=w["end_time"],
                    confidence=w.get("confidence", 0.9),
                )
                for w in data.get("words", [])
            ],
            language=data.get("language", "en"),
            duration=data.get("duration", 0.0),
        )

        service = get_transcription_service()
        timestamp = service.get_timestamp_for_word(transcription, word)

        return {"word": word, "timestamp": timestamp, "found": timestamp is not None}

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON for transcription")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Auto-Trim Silence Endpoint (Phase 1)
# =============================================================================


@router.post("/auto-trim")
async def auto_trim_silence(
    input_path: str,
    output_path: str,
    silence_threshold_db: float = -50.0,
    min_silence_duration: float = 0.5,
    keep_silence: float = 0.1,
):
    """
    Automatically remove silence from audio/video.

    Phase 1 Core Efficiency feature for cleaning up narrations and dialogues.

    Parameters:
    - **silence_threshold_db**: Threshold for silence detection
    - **min_silence_duration**: Minimum silence duration to remove
    - **keep_silence**: Amount of silence to keep at cuts
    """
    try:
        if not os.path.exists(input_path):
            raise HTTPException(
                status_code=404, detail=f"Input file not found: {input_path}"
            )

        import subprocess

        # FFmpeg silenceremove filter
        cmd = [
            "ffmpeg",
            "-y",
            "-i",
            input_path,
            "-af",
            f"silenceremove=stop_periods=-1:stop_threshold={silence_threshold_db}dB:stop_duration={min_silence_duration}",
            "-c:v",
            "copy" if input_path.endswith((".mp4", ".mov", ".mkv")) else "none",
            "-c:a",
            "aac",
            "-b:a",
            "192k",
            output_path,
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)

        if result.returncode != 0:
            return {
                "success": False,
                "message": f"Auto-trim failed: {result.stderr}",
                "output_path": None,
            }

        return {
            "success": True,
            "message": f"Silence removed: {output_path}",
            "output_path": output_path,
        }

    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=504, detail="Auto-trim operation timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =============================================================================
# Health Check
# =============================================================================


@router.get("/health")
async def audio_service_health():
    """Check health status of AI audio services."""
    services_status = {
        "beat_detection": "available",
        "voice_isolation": "available",
        "auto_ducking": "available",
        "worldization": "available",
        "transcription": "available",
    }

    # Check optional dependencies
    try:
        import librosa

        services_status["beat_detection"] = "librosa_available"
    except ImportError:
        services_status["beat_detection"] = "fallback_only"

    try:
        import whisper

        services_status["transcription"] = "whisper_available"
    except ImportError:
        services_status["transcription"] = "fallback_only"

    try:
        import torch

        services_status["voice_isolation"] = "demucs_capable"
    except ImportError:
        pass

    return {
        "status": "healthy",
        "service": "StoryCore AI Audio",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "services": services_status,
    }
