"""
Data models for Audio API category.

This module defines all data structures used by audio production endpoints.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from datetime import datetime


@dataclass
class VoiceGenerationRequest:
    """Request for voice generation."""
    text: str
    output_format: str = "wav"
    sample_rate: int = 44100
    voice_id: Optional[str] = None
    voice_parameters: Optional[Dict[str, Any]] = None  # pitch, speed, emotion, etc.
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VoiceGenerationResult:
    """Result of voice generation."""
    audio_path: str
    text: str
    duration_seconds: float
    sample_rate: int
    format: str
    file_size_bytes: int
    generation_time_ms: float
    voice_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MusicGenerationRequest:
    """Request for music generation."""
    mood: str  # e.g., "upbeat", "melancholic", "tense", "peaceful"
    duration_seconds: float
    output_format: str = "wav"
    sample_rate: int = 44100
    genre: Optional[str] = None
    tempo: Optional[int] = None  # BPM
    key: Optional[str] = None  # Musical key
    instruments: Optional[List[str]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class MusicGenerationResult:
    """Result of music generation."""
    audio_path: str
    mood: str
    duration_seconds: float
    sample_rate: int
    format: str
    file_size_bytes: int
    generation_time_ms: float
    genre: Optional[str] = None
    tempo: Optional[int] = None
    key: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AudioEffectRequest:
    """Request to add audio effects."""
    audio_path: str
    effect_type: str  # e.g., "reverb", "echo", "fade_in", "fade_out", "normalize"
    effect_parameters: Optional[Dict[str, Any]] = None
    output_path: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AudioEffectResult:
    """Result of audio effect application."""
    audio_path: str
    original_path: str
    effect_type: str
    effect_parameters: Dict[str, Any]
    duration_seconds: float
    processing_time_ms: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AudioTrack:
    """Audio track for mixing."""
    path: str
    name: str
    volume: float = 1.0  # 0.0 to 1.0
    pan: float = 0.0  # -1.0 (left) to 1.0 (right)
    start_time_seconds: float = 0.0
    fade_in_seconds: float = 0.0
    fade_out_seconds: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AudioMixRequest:
    """Request to mix audio tracks."""
    tracks: List[AudioTrack]
    output_path: str
    output_format: str = "wav"
    sample_rate: int = 44100
    normalize: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AudioMixResult:
    """Result of audio mixing."""
    audio_path: str
    track_count: int
    duration_seconds: float
    sample_rate: int
    format: str
    file_size_bytes: int
    processing_time_ms: float
    peak_level: float
    rms_level: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AudioSyncRequest:
    """Request to synchronize audio with video."""
    audio_path: str
    video_path: str
    output_path: str
    sync_method: str = "auto"  # "auto", "manual", "timecode"
    offset_seconds: float = 0.0
    trim_audio: bool = True
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AudioSyncResult:
    """Result of audio-video synchronization."""
    output_path: str
    audio_path: str
    video_path: str
    sync_offset_seconds: float
    audio_duration_seconds: float
    video_duration_seconds: float
    sync_quality_score: float  # 0.0 to 1.0
    processing_time_ms: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AudioQualityMetrics:
    """Audio quality analysis metrics."""
    audio_path: str
    duration_seconds: float
    sample_rate: int
    bit_depth: int
    channels: int
    format: str
    file_size_bytes: int
    
    # Quality metrics
    peak_level: float  # dB
    rms_level: float  # dB
    dynamic_range: float  # dB
    signal_to_noise_ratio: Optional[float] = None  # dB
    
    # Frequency analysis
    frequency_range: Optional[Dict[str, float]] = None  # min, max, dominant
    spectral_centroid: Optional[float] = None
    
    # Issues detected
    clipping_detected: bool = False
    silence_detected: bool = False
    noise_level: Optional[float] = None
    
    # Overall scores
    clarity_score: float = 0.0  # 0.0 to 1.0
    quality_score: float = 0.0  # 0.0 to 1.0
    
    analysis_time_ms: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AudioAnalysisResult:
    """Result of audio analysis."""
    metrics: AudioQualityMetrics
    recommendations: List[str] = field(default_factory=list)
    issues: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
