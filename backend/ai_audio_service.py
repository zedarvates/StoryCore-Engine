"""
AI Audio Service for StoryCore-Engine

Provides AI-powered audio analysis and processing:
- Beat detection for music synchronization
- Auto-ducking with sidechain compression
- Voice isolation and noise reduction
- Transcription-based navigation
- Audio worldization (environment simulation)

Phase 1 & 4: Core Efficiency + Audio Mastering
"""

import asyncio
import logging
import os
import subprocess
import tempfile
import wave
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple, Union

import numpy as np

logger = logging.getLogger(__name__)


# =============================================================================
# Enums and Data Classes
# =============================================================================

class BeatDetectionMethod(str, Enum):
    """Beat detection algorithms"""
    LIBROSA = "librosa"  # ML-based, most accurate
    ENERGY_BASED = "energy"  # Simple energy-based
    SPECTRAL = "spectral"  # Spectral flux


class AudioEnvironment(str, Enum):
    """Audio environment simulations for worldization"""
    PHONE = "phone"
    STADIUM = "stadium"
    CAVE = "cave"
    CONCERT_HALL = "concert_hall"
    SMALL_ROOM = "small_room"
    BATHROOM = "bathroom"
    CAR = "car"
    FOREST = "forest"
    UNDERWATER = "underwater"


class VoiceIsolationMethod(str, Enum):
    """Voice isolation methods"""
    SPECTRAL_SUBTRACTION = "spectral_subtraction"
    WIENER_FILTER = "wiener"
    DEMUCS = "demucs"  # ML-based separation
    SPEAKER_Buddy = "speakerbeam"


@dataclass
class BeatInfo:
    """Information about a detected beat"""
    timestamp: float  # seconds
    confidence: float  # 0-1
    beat_type: str  # "downbeat", "beat", "upbeat"
    tempo: float  # BPM at this point


@dataclass
class BeatDetectionResult:
    """Result of beat detection"""
    success: bool
    tempo: float  # Average BPM
    tempo_confidence: float
    beats: List[BeatInfo]
    downbeats: List[float]  # Timestamps of downbeats
    time_signature: str  # "4/4", "3/4", etc.
    duration: float


@dataclass
class TranscriptionWord:
    """A word in the transcription"""
    word: str
    start_time: float
    end_time: float
    confidence: float
    speaker_id: Optional[str] = None


@dataclass
class TranscriptionResult:
    """Result of audio transcription"""
    success: bool
    text: str
    words: List[TranscriptionWord]
    language: str
    duration: float
    speakers: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class DuckingConfig:
    """Configuration for auto-ducking"""
    threshold_db: float = -30.0
    duck_amount_db: float = -12.0
    attack_ms: float = 5.0
    release_ms: float = 100.0
    hold_ms: float = 50.0
    sidechain_source: str = "dialogue"  # Track to trigger ducking


@dataclass
class VoiceIsolationConfig:
    """Configuration for voice isolation"""
    method: VoiceIsolationMethod = VoiceIsolationMethod.SPECTRAL_SUBTRACTION
    noise_reduction_db: float = 20.0
    preserve_voice_quality: bool = True
    remove_music: bool = False


# =============================================================================
# Beat Detection Service
# =============================================================================

class BeatDetectionService:
    """
    Detect beats in audio for music synchronization.
    Supports multiple methods: librosa (ML), energy-based, spectral flux.
    """
    
    def __init__(self):
        self.sample_rate = 22050  # Standard for beat detection
        self.hop_length = 512
        
    def detect_beats(
        self,
        audio_path: str,
        method: BeatDetectionMethod = BeatDetectionMethod.LIBROSA,
        callback: Optional[Callable[[float], None]] = None
    ) -> BeatDetectionResult:
        """
        Detect beats in an audio file.
        
        Args:
            audio_path: Path to audio file
            method: Detection algorithm to use
            callback: Optional progress callback
            
        Returns:
            BeatDetectionResult with all beat information
        """
        try:
            # Load audio
            audio_data, sr = self._load_audio(audio_path)
            duration = len(audio_data) / sr
            
            if method == BeatDetectionMethod.LIBROSA:
                return self._detect_beats_librosa(audio_data, sr, duration)
            elif method == BeatDetectionMethod.ENERGY_BASED:
                return self._detect_beats_energy(audio_data, sr, duration)
            elif method == BeatDetectionMethod.SPECTRAL:
                return self._detect_beats_spectral(audio_data, sr, duration)
            else:
                return self._detect_beats_energy(audio_data, sr, duration)
                
        except Exception as e:
            logger.error(f"Beat detection failed: {e}")
            return BeatDetectionResult(
                success=False,
                tempo=0.0,
                tempo_confidence=0.0,
                beats=[],
                downbeats=[],
                time_signature="4/4",
                duration=0.0
            )
    
    def _load_audio(self, audio_path: str) -> Tuple[np.ndarray, int]:
        """Load audio file and convert to mono numpy array."""
        try:
            import librosa
            y, sr = librosa.load(audio_path, sr=self.sample_rate, mono=True)
            return y, sr
        except ImportError:
            logger.warning("librosa not installed, using fallback")
            return self._load_audio_fallback(audio_path)
    
    def _load_audio_fallback(self, audio_path: str) -> Tuple[np.ndarray, int]:
        """Fallback audio loading using wave module."""
        # Convert to wav if needed
        if not audio_path.endswith('.wav'):
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
                tmp_path = tmp.name
            subprocess.run([
                'ffmpeg', '-y', '-i', audio_path,
                '-acodec', 'pcm_s16le', '-ar', str(self.sample_rate),
                '-ac', '1', tmp_path
            ], capture_output=True)
            audio_path = tmp_path
        
        with wave.open(audio_path, 'rb') as wf:
            sr = wf.getframerate()
            frames = wf.readframes(wf.getnframes())
            audio_data = np.frombuffer(frames, dtype=np.int16).astype(np.float32)
            audio_data = audio_data / 32768.0  # Normalize
        
        return audio_data, sr
    
    def _detect_beats_librosa(
        self,
        audio_data: np.ndarray,
        sr: int,
        duration: float
    ) -> BeatDetectionResult:
        """Use librosa for accurate beat detection."""
        try:
            import librosa
            
            # Tempo and beat frames
            tempo, beat_frames = librosa.beat.beat_track(
                y=audio_data,
                sr=sr,
                hop_length=self.hop_length
            )
            
            # Convert frames to time
            beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=self.hop_length)
            
            # Get beat plp (pulse) for confidence
            onset_env = librosa.onset.onset_strength(
                y=audio_data,
                sr=sr,
                hop_length=self.hop_length
            )
            
            # Compute pulse
            pulse = librosa.beat.plp(onset_envelope=onset_env, sr=sr)
            beats_pulse = librosa.beat.beat_track(pulse, sr=sr)
            
            # Determine time signature (simple heuristic)
            time_signature = self._estimate_time_signature(beat_times)
            
            # Identify downbeats
            downbeats = self._identify_downbeats(beat_times, time_signature)
            
            # Build beat info
            beats = []
            for i, t in enumerate(beat_times):
                beat_type = "downbeat" if t in downbeats else "beat"
                confidence = float(pulse[i]) if i < len(pulse) else 0.5
                beats.append(BeatInfo(
                    timestamp=float(t),
                    confidence=min(confidence, 1.0),
                    beat_type=beat_type,
                    tempo=float(tempo) if isinstance(tempo, (int, float)) else float(tempo[0]) if len(tempo) > 0 else 120.0
                ))
            
            tempo_val = float(tempo) if isinstance(tempo, (int, float)) else float(tempo[0]) if len(tempo) > 0 else 120.0
            
            return BeatDetectionResult(
                success=True,
                tempo=tempo_val,
                tempo_confidence=0.8,  # librosa is generally reliable
                beats=beats,
                downbeats=list(downbeats),
                time_signature=time_signature,
                duration=duration
            )
            
        except ImportError:
            logger.warning("librosa not available, falling back to energy-based")
            return self._detect_beats_energy(audio_data, sr, duration)
    
    def _detect_beats_energy(
        self,
        audio_data: np.ndarray,
        sr: int,
        duration: float
    ) -> BeatDetectionResult:
        """Simple energy-based beat detection."""
        # Calculate energy in windows
        window_size = int(sr * 0.023)  # 23ms windows
        hop = window_size // 2
        
        energy = []
        for i in range(0, len(audio_data) - window_size, hop):
            window = audio_data[i:i + window_size]
            energy.append(np.sqrt(np.mean(window ** 2)))
        
        energy = np.array(energy)
        
        # Smooth energy
        kernel_size = 5
        energy_smooth = np.convolve(energy, np.ones(kernel_size)/kernel_size, mode='same')
        
        # Find peaks (beats)
        threshold = np.mean(energy_smooth) + 0.5 * np.std(energy_smooth)
        peaks = []
        
        for i in range(1, len(energy_smooth) - 1):
            if (energy_smooth[i] > energy_smooth[i-1] and 
                energy_smooth[i] > energy_smooth[i+1] and
                energy_smooth[i] > threshold):
                peaks.append(i)
        
        # Convert peak indices to time
        times = [p * hop / sr for p in peaks]
        
        # Estimate tempo
        if len(times) > 1:
            intervals = np.diff(times)
            avg_interval = np.median(intervals)
            tempo = 60.0 / avg_interval if avg_interval > 0 else 120.0
        else:
            tempo = 120.0
        
        # Build beat info
        beats = [
            BeatInfo(
                timestamp=t,
                confidence=0.6,  # Lower confidence for energy-based
                beat_type="beat",
                tempo=tempo
            )
            for t in times
        ]
        
        return BeatDetectionResult(
            success=True,
            tempo=tempo,
            tempo_confidence=0.5,
            beats=beats,
            downbeats=[],
            time_signature="4/4",
            duration=duration
        )
    
    def _detect_beats_spectral(
        self,
        audio_data: np.ndarray,
        sr: int,
        duration: float
    ) -> BeatDetectionResult:
        """Spectral flux beat detection."""
        try:
            import librosa
            
            # Compute STFT
            stft = np.abs(librosa.stft(audio_data))
            
            # Spectral flux
            flux = np.sum(np.diff(stft, axis=1) ** 2, axis=0)
            flux = np.maximum(flux, 0)  # Half-wave rectify
            
            # Normalize
            flux = (flux - np.min(flux)) / (np.max(flux) - np.min(flux) + 1e-10)
            
            # Find peaks
            threshold = np.mean(flux) + 0.3 * np.std(flux)
            peaks = []
            
            for i in range(1, len(flux) - 1):
                if flux[i] > flux[i-1] and flux[i] > flux[i+1] and flux[i] > threshold:
                    peaks.append(i)
            
            # Convert to time
            times = librosa.frames_to_time(peaks, sr=sr)
            
            # Estimate tempo
            if len(times) > 1:
                intervals = np.diff(times)
                avg_interval = np.median(intervals)
                tempo = 60.0 / avg_interval if avg_interval > 0 else 120.0
            else:
                tempo = 120.0
            
            beats = [
                BeatInfo(
                    timestamp=float(t),
                    confidence=0.7,
                    beat_type="beat",
                    tempo=tempo
                )
                for t in times
            ]
            
            return BeatDetectionResult(
                success=True,
                tempo=tempo,
                tempo_confidence=0.6,
                beats=beats,
                downbeats=[],
                time_signature="4/4",
                duration=duration
            )
            
        except ImportError:
            return self._detect_beats_energy(audio_data, sr, duration)
    
    def _estimate_time_signature(self, beat_times: np.ndarray) -> str:
        """Estimate time signature from beat pattern."""
        if len(beat_times) < 4:
            return "4/4"
        
        # Look at interval patterns
        intervals = np.diff(beat_times)
        
        # Group into measures (assuming 4/4 as default)
        avg_interval = np.mean(intervals)
        
        # Check for patterns suggesting 3/4 or 6/8
        # This is a simplified heuristic
        if len(intervals) >= 3:
            # Check for 3-beat pattern
            three_pattern = intervals[::3]
            if len(three_pattern) > 1 and np.std(three_pattern) < np.std(intervals):
                return "3/4"
        
        return "4/4"
    
    def _identify_downbeats(
        self,
        beat_times: np.ndarray,
        time_signature: str
    ) -> List[float]:
        """Identify downbeats (first beat of each measure)."""
        beats_per_measure = 4  # Default for 4/4
        if time_signature == "3/4":
            beats_per_measure = 3
        elif time_signature == "6/8":
            beats_per_measure = 6
        
        downbeats = beat_times[::beats_per_measure].tolist()
        return downbeats
    
    def get_beat_aligned_cuts(
        self,
        beat_times: List[float],
        target_durations: List[float],
        tolerance: float = 0.2
    ) -> List[Tuple[float, float]]:
        """
        Get cut points aligned to beats.
        
        Args:
            beat_times: List of beat timestamps
            target_durations: Desired durations for each cut
            tolerance: Allowed deviation from target
            
        Returns:
            List of (start, end) tuples for cuts
        """
        cuts = []
        current_time = 0.0
        beat_idx = 0
        
        for target in target_durations:
            ideal_end = current_time + target
            
            # Find nearest beat
            best_beat = ideal_end
            best_diff = float('inf')
            
            for i in range(beat_idx, len(beat_times)):
                diff = abs(beat_times[i] - ideal_end)
                if diff < best_diff and diff <= tolerance:
                    best_diff = diff
                    best_beat = beat_times[i]
                    beat_idx = i
            
            cuts.append((current_time, best_beat))
            current_time = best_beat
        
        return cuts


# =============================================================================
# Audio Cleaning Service (Voice Isolation)
# =============================================================================

class AudioCleaningService:
    """
    Audio cleaning and voice isolation service.
    Supports noise reduction, voice isolation, and audio enhancement.
    """
    
    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg = ffmpeg_path
        self.sample_rate = 44100
    
    def isolate_voice(
        self,
        input_path: str,
        output_path: str,
        config: VoiceIsolationConfig = None,
        callback: Optional[Callable[[float], None]] = None
    ) -> Tuple[bool, str]:
        """
        Isolate voice from background noise/music.
        
        Args:
            input_path: Input audio/video path
            output_path: Output path for cleaned audio
            config: Voice isolation configuration
            callback: Optional progress callback
            
        Returns:
            Tuple of (success, message)
        """
        config = config or VoiceIsolationConfig()
        
        if config.method == VoiceIsolationMethod.DEMUCS:
            return self._isolate_voice_demucs(input_path, output_path, config)
        elif config.method == VoiceIsolationMethod.SPECTRAL_SUBTRACTION:
            return self._isolate_voice_spectral(input_path, output_path, config)
        elif config.method == VoiceIsolationMethod.WIENER_FILTER:
            return self._isolate_voice_wiener(input_path, output_path, config)
        else:
            return self._isolate_voice_ffmpeg(input_path, output_path, config)
    
    def _isolate_voice_demucs(
        self,
        input_path: str,
        output_path: str,
        config: VoiceIsolationConfig
    ) -> Tuple[bool, str]:
        """Use Demucs ML model for voice separation."""
        try:
            import torch
            
            # Check if demucs is installed
            result = subprocess.run(
                ["python", "-c", "import demucs"],
                capture_output=True
            )
            
            if result.returncode != 0:
                logger.warning("Demucs not installed, falling back to FFmpeg")
                return self._isolate_voice_ffmpeg(input_path, output_path, config)
            
            # Run demucs
            output_dir = os.path.dirname(output_path)
            result = subprocess.run([
                "python", "-m", "demucs",
                "--two-stems=vocals",
                "-o", output_dir,
                input_path
            ], capture_output=True, text=True)
            
            if result.returncode != 0:
                return False, f"Demucs failed: {result.stderr}"
            
            # Move vocals to output path
            base_name = os.path.splitext(os.path.basename(input_path))[0]
            vocals_path = os.path.join(output_dir, "htdemucs", base_name, "vocals.wav")
            
            if os.path.exists(vocals_path):
                os.rename(vocals_path, output_path)
                return True, f"Voice isolated using Demucs: {output_path}"
            else:
                return False, "Demucs output not found"
                
        except Exception as e:
            logger.error(f"Demucs voice isolation failed: {e}")
            return self._isolate_voice_ffmpeg(input_path, output_path, config)
    
    def _isolate_voice_spectral(
        self,
        input_path: str,
        output_path: str,
        config: VoiceIsolationConfig
    ) -> Tuple[bool, str]:
        """Spectral subtraction for noise reduction."""
        try:
            import scipy.io.wavfile as wavfile
            from scipy.signal import stft, istft
            
            # Load audio
            audio_data, sr = self._load_audio_numpy(input_path)
            
            # STFT
            f, t, Zxx = stft(audio_data, sr, nperseg=1024)
            
            # Estimate noise profile from quietest 10% of frames
            frame_energies = np.sum(np.abs(Zxx) ** 2, axis=0)
            quiet_frames = np.argsort(frame_energies)[:len(frame_energies) // 10]
            noise_profile = np.mean(np.abs(Zxx[:, quiet_frames]), axis=1, keepdims=True)
            
            # Spectral subtraction
            reduction_factor = config.noise_reduction_db / 20.0
            Zxx_clean = np.maximum(
                np.abs(Zxx) - reduction_factor * noise_profile,
                0
            ) * np.exp(1j * np.angle(Zxx))
            
            # Inverse STFT
            _, audio_clean = istft(Zxx_clean, sr, nperseg=1024)
            
            # Save
            self._save_audio(audio_clean, sr, output_path)
            
            return True, f"Voice cleaned using spectral subtraction: {output_path}"
            
        except Exception as e:
            logger.error(f"Spectral subtraction failed: {e}")
            return self._isolate_voice_ffmpeg(input_path, output_path, config)
    
    def _isolate_voice_wiener(
        self,
        input_path: str,
        output_path: str,
        config: VoiceIsolationConfig
    ) -> Tuple[bool, str]:
        """Wiener filter for noise reduction."""
        try:
            # Load audio
            audio_data, sr = self._load_audio_numpy(input_path)
            
            # Wiener filter implementation
            # Estimate noise variance from first 100ms
            noise_samples = int(0.1 * sr)
            noise_var = np.var(audio_data[:noise_samples])
            
            # Signal variance
            signal_var = np.var(audio_data)
            
            # Wiener gain
            wiener_gain = 1 - (noise_var / (signal_var + 1e-10))
            
            # Apply filter
            audio_clean = audio_data * wiener_gain
            
            # Save
            self._save_audio(audio_clean, sr, output_path)
            
            return True, f"Voice cleaned using Wiener filter: {output_path}"
            
        except Exception as e:
            logger.error(f"Wiener filter failed: {e}")
            return self._isolate_voice_ffmpeg(input_path, output_path, config)
    
    def _isolate_voice_ffmpeg(
        self,
        input_path: str,
        output_path: str,
        config: VoiceIsolationConfig
    ) -> Tuple[bool, str]:
        """FFmpeg-based voice isolation (highpass, lowpass, compression)."""
        try:
            # Build filter chain for voice isolation
            filters = [
                "highpass=f=200",  # Remove low rumble
                "lowpass=f=3000",  # Focus on voice frequencies
                f"afftdn=nf=-{config.noise_reduction_db}:tn=1",  # Noise reduction
                "acompressor=threshold=-24dB:ratio=3:attack=5:release=50",  # Compression
                "loudnorm=I=-14:TP=-1:LRA=11"  # Normalization
            ]
            
            filter_str = ",".join(filters)
            
            cmd = [
                self.ffmpeg, "-y",
                "-i", input_path,
                "-af", filter_str,
                "-c:a", "aac",
                "-b:a", "192k",
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                return False, f"FFmpeg voice isolation failed: {result.stderr}"
            
            return True, f"Voice isolated using FFmpeg: {output_path}"
            
        except subprocess.TimeoutExpired:
            return False, "Voice isolation timed out"
        except Exception as e:
            return False, f"Voice isolation error: {e}"
    
    def reduce_noise(
        self,
        input_path: str,
        output_path: str,
        noise_reduction_db: float = 20.0,
        preserve_voice: bool = True
    ) -> Tuple[bool, str]:
        """
        Simple noise reduction without full voice isolation.
        
        Args:
            input_path: Input audio path
            output_path: Output audio path
            noise_reduction_db: Amount of noise reduction
            preserve_voice: Whether to preserve voice frequencies
            
        Returns:
            Tuple of (success, message)
        """
        try:
            if preserve_voice:
                # Target noise outside voice frequency range
                filters = [
                    f"afftdn=nf=-{noise_reduction_db}:tn=1",
                    "highpass=f=80",  # Remove sub-bass noise
                    "lowpass=f=8000"  # Keep full voice range
                ]
            else:
                filters = [f"afftdn=nf=-{noise_reduction_db}:tn=1"]
            
            filter_str = ",".join(filters)
            
            cmd = [
                self.ffmpeg, "-y",
                "-i", input_path,
                "-af", filter_str,
                "-c:a", "aac",
                "-b:a", "192k",
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                return False, f"Noise reduction failed: {result.stderr}"
            
            return True, f"Noise reduced: {output_path}"
            
        except Exception as e:
            return False, f"Noise reduction error: {e}"
    
    def _load_audio_numpy(self, audio_path: str) -> Tuple[np.ndarray, int]:
        """Load audio to numpy array."""
        # Convert to wav if needed
        if not audio_path.endswith('.wav'):
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
                tmp_path = tmp.name
            subprocess.run([
                self.ffmpeg, '-y', '-i', audio_path,
                '-acodec', 'pcm_s16le', '-ar', str(self.sample_rate),
                '-ac', '1', tmp_path
            ], capture_output=True)
            audio_path = tmp_path
        
        import scipy.io.wavfile as wavfile
        sr, audio_data = wavfile.read(audio_path)
        
        # Normalize to float
        if audio_data.dtype == np.int16:
            audio_data = audio_data.astype(np.float32) / 32768.0
        elif audio_data.dtype == np.int32:
            audio_data = audio_data.astype(np.float32) / 2147483648.0
        
        return audio_data, sr
    
    def _save_audio(self, audio_data: np.ndarray, sr: int, output_path: str):
        """Save numpy array to audio file."""
        # Ensure output is in valid range
        audio_data = np.clip(audio_data, -1.0, 1.0)
        audio_int = (audio_data * 32767).astype(np.int16)
        
        import scipy.io.wavfile as wavfile
        wavfile.write(output_path, sr, audio_int)


# =============================================================================
# Auto-Ducking Service
# =============================================================================

class AutoDuckingService:
    """
    Automatic audio ducking service.
    Implements sidechain compression for automatic volume reduction.
    """
    
    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg = ffmpeg_path
    
    def apply_ducking(
        self,
        music_path: str,
        dialogue_path: str,
        output_path: str,
        config: DuckingConfig = None,
        callback: Optional[Callable[[float], None]] = None
    ) -> Tuple[bool, str]:
        """
        Apply automatic ducking to music based on dialogue.
        
        Args:
            music_path: Path to music/ambient audio
            dialogue_path: Path to dialogue track (trigger)
            output_path: Output path for ducked music
            config: Ducking configuration
            callback: Optional progress callback
            
        Returns:
            Tuple of (success, message)
        """
        config = config or DuckingConfig()
        
        try:
            # Build sidechain compression filter
            # Using FFmpeg's sidechaincompress filter
            filter_complex = (
                f"[0:a][1:a]sidechaincompress="
                f"threshold={config.threshold_db}dB:"
                f"ratio=4:"
                f"attack={config.attack_ms}:"
                f"release={config.release_ms}:"
                f"makeup=1[ducked]"
            )
            
            cmd = [
                self.ffmpeg, "-y",
                "-i", music_path,       # Input 0: Music to duck
                "-i", dialogue_path,    # Input 1: Dialogue (trigger)
                "-filter_complex", filter_complex,
                "-map", "[ducked]",
                "-c:a", "aac",
                "-b:a", "192k",
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            
            if result.returncode != 0:
                return False, f"Ducking failed: {result.stderr}"
            
            return True, f"Ducking applied: {output_path}"
            
        except Exception as e:
            return False, f"Ducking error: {e}"
    
    def apply_ducking_video(
        self,
        video_path: str,
        output_path: str,
        config: DuckingConfig = None,
        callback: Optional[Callable[[float], None]] = None
    ) -> Tuple[bool, str]:
        """
        Apply ducking to video's background music when voice is detected.
        
        This extracts the audio, detects voice, applies ducking, and remuxes.
        
        Args:
            video_path: Input video with mixed audio
            output_path: Output video path
            config: Ducking configuration
            
        Returns:
            Tuple of (success, message)
        """
        config = config or DuckingConfig()
        
        try:
            # Extract audio
            with tempfile.TemporaryDirectory() as tmpdir:
                audio_path = os.path.join(tmpdir, "audio.wav")
                voice_path = os.path.join(tmpdir, "voice.wav")
                music_path = os.path.join(tmpdir, "music.wav")
                ducked_path = os.path.join(tmpdir, "ducked.wav")
                
                # Extract full audio
                subprocess.run([
                    self.ffmpeg, "-y", "-i", video_path,
                    "-vn", "-acodec", "pcm_s16le", audio_path
                ], capture_output=True)
                
                # Isolate voice for ducking trigger
                cleaning_service = AudioCleaningService(self.ffmpeg)
                success, _ = cleaning_service.isolate_voice(
                    audio_path, voice_path,
                    VoiceIsolationConfig(method=VoiceIsolationMethod.SPECTRAL_SUBTRACTION)
                )
                
                if not success:
                    # Fallback: use original audio
                    voice_path = audio_path
                
                # Extract music (invert voice)
                # Simple approach: apply high-pass and low-pass to isolate non-voice
                subprocess.run([
                    self.ffmpeg, "-y", "-i", audio_path,
                    "-af", "highpass=f=300,lowpass=f=8000",
                    music_path
                ], capture_output=True)
                
                # Apply ducking
                success, msg = self.apply_ducking(
                    music_path, voice_path, ducked_path, config, callback
                )
                
                if not success:
                    return False, msg
                
                # Mix ducked music with original voice
                mixed_path = os.path.join(tmpdir, "mixed.wav")
                subprocess.run([
                    self.ffmpeg, "-y",
                    "-i", voice_path,
                    "-i", ducked_path,
                    "-filter_complex", "[0:a][1:a]amix=inputs=2:duration=first",
                    "-c:a", "aac", "-b:a", "192k",
                    mixed_path
                ], capture_output=True)
                
                # Remux with video
                cmd = [
                    self.ffmpeg, "-y",
                    "-i", video_path,
                    "-i", mixed_path,
                    "-c:v", "copy",
                    "-map", "0:v",
                    "-map", "1:a",
                    output_path
                ]
                
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                if result.returncode != 0:
                    return False, f"Remux failed: {result.stderr}"
                
                return True, f"Video ducking applied: {output_path}"
                
        except Exception as e:
            return False, f"Video ducking error: {e}"
    
    def detect_speech_segments(
        self,
        audio_path: str,
        threshold_db: float = -30.0,
        min_duration: float = 0.1
    ) -> List[Tuple[float, float]]:
        """
        Detect segments with speech for ducking timing.
        
        Args:
            audio_path: Path to audio file
            threshold_db: Threshold for speech detection
            min_duration: Minimum duration for a segment
            
        Returns:
            List of (start, end) tuples for speech segments
        """
        try:
            # Use FFmpeg's silencedetect in reverse
            cmd = [
                self.ffmpeg, "-i", audio_path,
                "-af", f"silencedetect=noise={threshold_db}dB:d={min_duration}",
                "-f", "null", "-"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            
            # Parse silence detection output
            segments = []
            silence_starts = []
            silence_ends = []
            
            for line in result.stderr.split('\n'):
                if "silence_start:" in line:
                    start = float(line.split("silence_start:")[1].strip().split()[0])
                    silence_starts.append(start)
                elif "silence_end:" in line:
                    end = float(line.split("silence_end:")[1].strip().split()[0])
                    silence_ends.append(end)
            
            # Convert silence to speech segments
            audio_info = self._get_audio_duration(audio_path)
            
            silence_starts = sorted(silence_starts)
            silence_ends = sorted(silence_ends)
            
            # Speech is between silence_end and next silence_start
            for i, end in enumerate(silence_ends):
                if i < len(silence_starts):
                    segments.append((end, silence_starts[i]))
            
            return segments
            
        except Exception as e:
            logger.error(f"Speech detection error: {e}")
            return []
    
    def _get_audio_duration(self, audio_path: str) -> float:
        """Get audio duration."""
        try:
            cmd = [
                "ffprobe", "-v", "error",
                "-show_entries", "format=duration",
                "-of", "default=noprint_wrappers=1:nokey=1",
                audio_path
            ]
            result = subprocess.run(cmd, capture_output=True, text=True)
            return float(result.stdout.strip())
        except:
            return 0.0


# =============================================================================
# Audio Worldization Service
# =============================================================================

class AudioWorldizationService:
    """
    Apply environment audio effects (worldization).
    Simulates different acoustic environments.
    """
    
    def __init__(self, ffmpeg_path: str = "ffmpeg"):
        self.ffmpeg = ffmpeg_path
        
        # Environment presets
        self.environment_presets = {
            AudioEnvironment.PHONE: {
                "highpass": 300,
                "lowpass": 3400,
                "eq": "eq=f=1000:t=h:w=1:g=-6",
                "compression": "acompressor=threshold=-20dB:ratio=6"
            },
            AudioEnvironment.STADIUM: {
                "reverb": "aecho=0.8:0.9:1000:0.3",
                "delay": "adelay=500|500",
                "eq": "eq=f=200:t=l:w=1:g=3"
            },
            AudioEnvironment.CAVE: {
                "reverb": "aecho=0.9:0.95:2000:0.4",
                "eq": "eq=f=500:t=l:w=2:g=6"
            },
            AudioEnvironment.CONCERT_HALL: {
                "reverb": "aecho=0.7:0.8:500:0.2,aecho=0.6:0.7:1000:0.15",
                "eq": "eq=f=1000:t=h:w=1:g=2"
            },
            AudioEnvironment.SMALL_ROOM: {
                "reverb": "aecho=0.3:0.4:100:0.1",
                "eq": ""
            },
            AudioEnvironment.BATHROOM: {
                "reverb": "aecho=0.5:0.7:50:0.2,aecho=0.4:0.5:100:0.15",
                "eq": "eq=f=400:t=l:w=1:g=4"
            },
            AudioEnvironment.CAR: {
                "highpass": 100,
                "lowpass": 8000,
                "eq": "eq=f=200:t=l:w=1:g=3,eq=f=4000:t=h:w=1:g=-2"
            },
            AudioEnvironment.FOREST: {
                "reverb": "aecho=0.2:0.3:200:0.1",
                "eq": "eq=f=1000:t=h:w=2:g=1"
            },
            AudioEnvironment.UNDERWATER: {
                "lowpass": 1500,
                "eq": "eq=f=500:t=l:w=2:g=6",
                "reverb": "aecho=0.6:0.8:100:0.3"
            }
        }
    
    def apply_environment(
        self,
        input_path: str,
        output_path: str,
        environment: AudioEnvironment,
        intensity: float = 1.0
    ) -> Tuple[bool, str]:
        """
        Apply environment acoustic simulation.
        
        Args:
            input_path: Input audio path
            output_path: Output audio path
            environment: Target environment
            intensity: Effect intensity (0-1)
            
        Returns:
            Tuple of (success, message)
        """
        preset = self.environment_presets.get(environment, {})
        
        if not preset:
            return False, f"Unknown environment: {environment}"
        
        filters = []
        
        # Add filters based on preset
        if "highpass" in preset:
            filters.append(f"highpass=f={preset['highpass']}")
        
        if "lowpass" in preset:
            filters.append(f"lowpass=f={preset['lowpass']}")
        
        if "eq" in preset and preset["eq"]:
            filters.append(preset["eq"])
        
        if "reverb" in preset:
            filters.append(preset["reverb"])
        
        if "delay" in preset:
            filters.append(preset["delay"])
        
        if "compression" in preset:
            filters.append(preset["compression"])
        
        # Apply intensity
        if intensity < 1.0:
            # Mix dry and wet signals
            filters.append(f"volume={2 - intensity}")
        
        filter_str = ",".join(filters) if filters else "anull"
        
        try:
            cmd = [
                self.ffmpeg, "-y",
                "-i", input_path,
                "-af", filter_str,
                "-c:a", "aac",
                "-b:a", "192k",
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
            
            if result.returncode != 0:
                return False, f"Worldization failed: {result.stderr}"
            
            return True, f"Applied {environment.value} environment: {output_path}"
            
        except Exception as e:
            return False, f"Worldization error: {e}"
    
    def list_environments(self) -> List[Dict[str, str]]:
        """List available environment presets."""
        return [
            {"id": env.value, "name": env.value.replace("_", " ").title()}
            for env in AudioEnvironment
        ]


# =============================================================================
# Transcription Service
# =============================================================================

class TranscriptionService:
    """
    Audio transcription for navigation and editing.
    Supports multiple transcription backends.
    """
    
    def __init__(self):
        self.backends = ["whisper", "vosk", "google"]
    
    def transcribe(
        self,
        audio_path: str,
        language: str = "auto",
        backend: str = "whisper",
        callback: Optional[Callable[[float], None]] = None
    ) -> TranscriptionResult:
        """
        Transcribe audio to text with timestamps.
        
        Args:
            audio_path: Path to audio file
            language: Language code (auto for detection)
            backend: Transcription backend to use
            callback: Optional progress callback
            
        Returns:
            TranscriptionResult with text and word timestamps
        """
        if backend == "whisper":
            return self._transcribe_whisper(audio_path, language, callback)
        elif backend == "vosk":
            return self._transcribe_vosk(audio_path, language, callback)
        else:
            return self._transcribe_whisper(audio_path, language, callback)
    
    def _transcribe_whisper(
        self,
        audio_path: str,
        language: str,
        callback: Optional[Callable[[float], None]]
    ) -> TranscriptionResult:
        """Use OpenAI Whisper for transcription."""
        try:
            import whisper
            
            # Load model
            model = whisper.load_model("base")
            
            # Transcribe with word timestamps
            result = model.transcribe(
                audio_path,
                language=None if language == "auto" else language,
                word_timestamps=True
            )
            
            # Extract words
            words = []
            for segment in result.get("segments", []):
                for word_info in segment.get("words", []):
                    words.append(TranscriptionWord(
                        word=word_info["word"].strip(),
                        start_time=word_info["start"],
                        end_time=word_info["end"],
                        confidence=word_info.get("probability", 0.9)
                    ))
            
            return TranscriptionResult(
                success=True,
                text=result["text"],
                words=words,
                language=result.get("language", "en"),
                duration=max(w.end_time for w in words) if words else 0.0
            )
            
        except ImportError:
            logger.warning("Whisper not installed, using fallback")
            return self._transcribe_fallback(audio_path)
        except Exception as e:
            logger.error(f"Whisper transcription failed: {e}")
            return TranscriptionResult(
                success=False,
                text="",
                words=[],
                language="",
                duration=0.0
            )
    
    def _transcribe_vosk(
        self,
        audio_path: str,
        language: str,
        callback: Optional[Callable[[float], None]]
    ) -> TranscriptionResult:
        """Use Vosk for offline transcription."""
        try:
            from vosk import Model, KaldiRecognizer
            
            # Convert audio to required format
            with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as tmp:
                tmp_path = tmp.name
            
            subprocess.run([
                'ffmpeg', '-y', '-i', audio_path,
                '-ar', '16000', '-ac', '1', '-f', 'wav', tmp_path
            ], capture_output=True)
            
            # Load model
            model = Model("model")
            rec = KaldiRecognizer(model, 16000)
            
            # Process audio
            import wave
            wf = wave.open(tmp_path, "rb")
            
            words = []
            text_parts = []
            
            while True:
                data = wf.readframes(4000)
                if len(data) == 0:
                    break
                
                if rec.AcceptWaveform(data):
                    result = json.loads(rec.Result())
                    text_parts.append(result.get("text", ""))
                    
                    # Extract word timings
                    for word_info in result.get("result", []):
                        words.append(TranscriptionWord(
                            word=word_info["word"],
                            start_time=word_info["start"],
                            end_time=word_info["end"],
                            confidence=word_info.get("conf", 0.9)
                        ))
            
            # Final result
            final = json.loads(rec.FinalResult())
            text_parts.append(final.get("text", ""))
            
            return TranscriptionResult(
                success=True,
                text=" ".join(text_parts),
                words=words,
                language=language if language != "auto" else "en",
                duration=wf.getnframes() / wf.getframerate()
            )
            
        except ImportError:
            logger.warning("Vosk not installed")
            return TranscriptionResult(
                success=False,
                text="",
                words=[],
                language="",
                duration=0.0
            )
    
    def _transcribe_fallback(self, audio_path: str) -> TranscriptionResult:
        """Fallback transcription (dummy)."""
        return TranscriptionResult(
            success=False,
            text="",
            words=[],
            language="",
            duration=0.0,
            errors=["No transcription backend available"]
        )
    
    def get_timestamp_for_word(
        self,
        transcription: TranscriptionResult,
        word: str
    ) -> Optional[float]:
        """
        Get timestamp for a specific word.
        
        Args:
            transcription: Transcription result
            word: Word to find
            
        Returns:
            Timestamp in seconds or None
        """
        for w in transcription.words:
            if w.word.lower() == word.lower():
                return w.start_time
        return None
    
    def search_in_transcription(
        self,
        transcription: TranscriptionResult,
        query: str
    ) -> List[Tuple[TranscriptionWord, int]]:
        """
        Search for words/phrases in transcription.
        
        Args:
            transcription: Transcription result
            query: Search query
            
        Returns:
            List of (word, position) tuples
        """
        query_lower = query.lower()
        results = []
        
        for i, word in enumerate(transcription.words):
            if query_lower in word.word.lower():
                results.append((word, i))
        
        return results


# =============================================================================
# Factory Functions
# =============================================================================

def create_beat_detection_service() -> BeatDetectionService:
    """Create beat detection service instance."""
    return BeatDetectionService()

def create_audio_cleaning_service(ffmpeg_path: str = "ffmpeg") -> AudioCleaningService:
    """Create audio cleaning service instance."""
    return AudioCleaningService(ffmpeg_path)

def create_auto_ducking_service(ffmpeg_path: str = "ffmpeg") -> AutoDuckingService:
    """Create auto ducking service instance."""
    return AutoDuckingService(ffmpeg_path)

def create_worldization_service(ffmpeg_path: str = "ffmpeg") -> AudioWorldizationService:
    """Create worldization service instance."""
    return AudioWorldizationService(ffmpeg_path)

def create_transcription_service() -> TranscriptionService:
    """Create transcription service instance."""
    return TranscriptionService()


# =============================================================================
# Service Instances
# =============================================================================

_beat_service = None
_cleaning_service = None
_ducking_service = None
_worldization_service = None
_transcription_service = None

def get_beat_service() -> BeatDetectionService:
    """Get or create beat detection service."""
    global _beat_service
    if _beat_service is None:
        _beat_service = create_beat_detection_service()
    return _beat_service

def get_cleaning_service() -> AudioCleaningService:
    """Get or create audio cleaning service."""
    global _cleaning_service
    if _cleaning_service is None:
        _cleaning_service = create_audio_cleaning_service()
    return _cleaning_service

def get_ducking_service() -> AutoDuckingService:
    """Get or create auto ducking service."""
    global _ducking_service
    if _ducking_service is None:
        _ducking_service = create_auto_ducking_service()
    return _ducking_service

def get_worldization_service() -> AudioWorldizationService:
    """Get or create worldization service."""
    global _worldization_service
    if _worldization_service is None:
        _worldization_service = create_worldization_service()
    return _worldization_service

def get_transcription_service() -> TranscriptionService:
    """Get or create transcription service."""
    global _transcription_service
    if _transcription_service is None:
        _transcription_service = create_transcription_service()
    return _transcription_service