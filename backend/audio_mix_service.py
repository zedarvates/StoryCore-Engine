"""
StoryCore AudioMixService

This module implements automatic audio mixing rules and workflows.
Handles priority-based mixing, volume automation, and phase management.
Enhanced with multichannel support, audio effects, and advanced export.

Requirements: AUDIO & SFX STORYCORE ENGINE (VERSION MULTIPISTE) - Section 10
"""

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional, Tuple, Union
from datetime import datetime
import asyncio
import numpy as np

logger = logging.getLogger(__name__)


# =============================================================================
# MULTICHANNEL SUPPORT
# =============================================================================

class AudioChannel(Enum):
    """Audio channel configurations"""
    MONO = "mono"
    STEREO = "stereo"
    SURROUND_51 = "5.1"
    SURROUND_71 = "7.1"


# Channel layouts for different configurations
CHANNEL_LAYOUTS = {
    AudioChannel.MONO: ["center"],
    AudioChannel.STEREO: ["left", "right"],
    AudioChannel.SURROUND_51: ["left", "center", "right", "left_surround", "right_surround", "lfe"],
    AudioChannel.SURROUND_71: ["left", "center", "right", "left_surround", "right_surround", "left_rear", "right_rear", "lfe"],
}


@dataclass
class MixConfig:
    """Multichannel mix configuration"""
    channel_layout: AudioChannel = AudioChannel.STEREO
    sample_rate: int = 48000
    bit_depth: int = 24
    master_volume: float = 1.0
    normalization: bool = True
    output_format: str = "wav"


# =============================================================================
# AUDIO EFFECTS
# =============================================================================

class AudioEffects:
    """Static class for audio effect processing"""
    
    @staticmethod
    def apply_reverb(
        audio_data: np.ndarray,
        room_size: float = 0.5,
        wet_dry: float = 0.3,
        sample_rate: int = 48000
    ) -> np.ndarray:
        """
        Apply reverb effect to audio.
        
        Args:
            audio_data: Input audio samples
            room_size: Room size (0.0 to 1.0)
            wet_dry: Wet/dry mix ratio (0.0 to 1.0)
            sample_rate: Sample rate in Hz
            
        Returns:
            Audio with reverb applied
        """
        if room_size <= 0:
            return audio_data
            
        # Generate impulse response
        reverb_length = int(sample_rate * (room_size * 3.0))
        impulse = np.random.randn(reverb_length) * np.exp(
            -np.arange(reverb_length) / (sample_rate * room_size)
        )
        impulse = impulse / np.max(np.abs(impulse))
        
        # Apply convolution reverb
        wet = np.convolve(audio_data, impulse, mode='full')[:len(audio_data)]
        
        # Mix wet and dry
        output = (1 - wet_dry) * audio_data + wet_dry * wet
        
        return output
    
    @staticmethod
    def apply_delay(
        audio_data: np.ndarray,
        delay_ms: float = 100,
        feedback: float = 0.3,
        sample_rate: int = 48000
    ) -> np.ndarray:
        """
        Apply delay effect to audio.
        
        Args:
            audio_data: Input audio samples
            delay_ms: Delay time in milliseconds
            feedback: Feedback amount (0.0 to 1.0)
            sample_rate: Sample rate in Hz
            
        Returns:
            Audio with delay applied
        """
        delay_samples = int(sample_rate * delay_ms / 1000.0)
        output = audio_data.copy()
        
        for i in range(delay_samples, len(audio_data)):
            output[i] += feedback * output[i - delay_samples]
        
        return output
    
    @staticmethod
    def apply_eq(
        audio_data: np.ndarray,
        low_gain: float = 0,
        mid_gain: float = 0,
        high_gain: float = 0,
        sample_rate: int = 48000
    ) -> np.ndarray:
        """
        Apply 3-band EQ to audio.
        
        Args:
            audio_data: Input audio samples
            low_gain: Low frequency gain in dB
            mid_gain: Mid frequency gain in dB
            high_gain: High frequency gain in dB
            sample_rate: Sample rate in Hz
            
        Returns:
            Audio with EQ applied
        """
        from scipy.signal import butter, lfilter
        
        def apply_band(data, lowcut, highcut, gain, order=2):
            if gain == 0:
                return data
            nyq = sample_rate / 2
            low = lowcut / nyq
            high = min(highcut / nyq, 0.99)
            b, a = butter(order, [low, high], btype='band')
            return data + gain * lfilter(b, a, data)
        
        output = audio_data.copy()
        output = apply_band(output, 20, 250, low_gain)      # Low band
        output = apply_band(output, 250, 4000, mid_gain)   # Mid band
        output = apply_band(output, 4000, 20000, high_gain) # High band
        
        return output
    
    @staticmethod
    def apply_compressor(
        audio_data: np.ndarray,
        threshold_db: float = -24.0,
        ratio: float = 4.0,
        attack_ms: float = 10.0,
        release_ms: float = 100.0,
        sample_rate: int = 48000
    ) -> np.ndarray:
        """
        Apply dynamic compressor to audio.
        
        Args:
            audio_data: Input audio samples
            threshold_db: Threshold in dB
            ratio: Compression ratio
            attack_ms: Attack time in milliseconds
            release_ms: Release time in milliseconds
            sample_rate: Sample rate in Hz
            
        Returns:
            Audio with compression applied
        """
        threshold = 10 ** (threshold_db / 20)
        attack_samples = int(sample_rate * attack_ms / 1000.0)
        release_samples = int(sample_rate * release_ms / 1000.0)
        
        # Calculate gain reduction
        envelope = np.abs(audio_data)
        gain = np.ones_like(audio_data)
        
        for i in range(len(audio_data)):
            if envelope[i] > threshold:
                # Calculate desired gain
                desired_gain = threshold * (envelope[i] / threshold) ** (-1 + 1/ratio) / envelope[i]
                
                # Smooth gain change
                if i > 0:
                    alpha = 1.0 / attack_samples if envelope[i] > envelope[i-1] else 1.0 / release_samples
                    gain[i] = gain[i-1] + alpha * (desired_gain - gain[i-1])
            else:
                # Recovery
                if i > 0:
                    gain[i] = gain[i-1] + (1.0 / release_samples) * (1.0 - gain[i-1])
        
        return audio_data * gain
    
    @staticmethod
    def apply_gain(
        audio_data: np.ndarray,
        gain_db: float = 0.0
    ) -> np.ndarray:
        """
        Apply gain to audio.
        
        Args:
            audio_data: Input audio samples
            gain_db: Gain in dB
            
        Returns:
            Audio with gain applied
        """
        linear_gain = 10 ** (gain_db / 20.0)
        return audio_data * linear_gain
    
    @staticmethod
    def normalize(
        audio_data: np.ndarray,
        target_db: float = -3.0
    ) -> np.ndarray:
        """
        Normalize audio to target peak level.
        
        Args:
            audio_data: Input audio samples
            target_db: Target peak level in dB
            
        Returns:
            Normalized audio
        """
        current_max = np.max(np.abs(audio_data))
        if current_max == 0:
            return audio_data
            
        target_linear = 10 ** (target_db / 20.0)
        gain = target_linear / current_max
        return audio_data * gain
    
    @staticmethod
    def apply_limiter(
        audio_data: np.ndarray,
        threshold_db: float = -1.0,
        release_ms: float = 10.0,
        sample_rate: int = 48000
    ) -> np.ndarray:
        """
        Apply hard limiter to audio.
        
        Args:
            audio_data: Input audio samples
            threshold_db: Threshold in dB
            release_ms: Release time in milliseconds
            sample_rate: Sample rate in Hz
            
        Returns:
            Limited audio
        """
        threshold = 10 ** (threshold_db / 20.0)
        release_samples = int(sample_rate * release_ms / 1000.0)
        
        output = audio_data.copy()
        envelope = np.abs(audio_data)
        
        for i in range(len(audio_data)):
            if envelope[i] > threshold:
                gain = threshold / envelope[i]
                # Smooth release
                if i > 0:
                    release_rate = 1.0 / release_samples
                    output[i] *= output[i-1] + release_rate * (gain * audio_data[i] - output[i-1])
                else:
                    output[i] *= gain
        
        return output


# =============================================================================
# TRACK PRIORITY (Section 10)
# =============================================================================

class TrackPriority(Enum):
    """Mix priority - higher values = higher priority"""
    AMBIANCE = 1
    MUSIC = 2
    SFX = 3
    CRITICAL_SFX = 4
    DIALOGUE = 5


class TrackCategory(Enum):
    """Category for mix rules"""
    DIALOGUE = "dialogue"
    SFX = "sfx"
    MUSIC = "music"
    AMBIENT = "ambient"


# =============================================================================
# VOLUME LEVELS (Section 10)
# =============================================================================

@dataclass
class VolumeLevel:
    """Volume configuration for a track"""
    base_volume: float = 0.0  # dB
    min_volume: float = -60.0  # dB
    max_volume: float = 6.0    # dB
    fade_in: float = 0.0      # seconds
    fade_out: float = 0.0     # seconds


# Standard volume levels from Section 10
STANDARD_VOLUMES: Dict[str, VolumeLevel] = {
    "impact": VolumeLevel(base_volume=4.0, min_volume=-6.0, max_volume=6.0),
    "tir": VolumeLevel(base_volume=3.0, min_volume=-6.0, max_volume=4.0),
    "ambiance": VolumeLevel(base_volume=-16.0, min_volume=-20.0, max_volume=-12.0),
    "musique_action": VolumeLevel(base_volume=-6.0, min_volume=-12.0, max_volume=0.0),
    "musique_tension": VolumeLevel(base_volume=-3.0, min_volume=-9.0, max_volume=0.0),
    "musique_emotion": VolumeLevel(base_volume=0.0, min_volume=-6.0, max_volume=3.0),
    "dialogue": VolumeLevel(base_volume=0.0, min_volume=-12.0, max_volume=3.0),
    "default": VolumeLevel(base_volume=-6.0, min_volume=-60.0, max_volume=6.0)
}


# =============================================================================
# MIX CONFIGURATION
# =============================================================================

@dataclass
class MixNode:
    """Individual track in the mix"""
    id: str
    name: str
    category: TrackCategory
    priority: TrackPriority
    volume: float = 0.0  # dB
    pan: float = 0.0     # -1 to 1 (left to right)
    muted: bool = False
    solo: bool = False
    effects: List[Dict[str, Any]] = field(default_factory=list)
    automation: List[Dict[str, Any]] = field(default_factory=list)
    phase: str = "stereo"  # "mono" or "stereo"
    channels: List[str] = field(default_factory=list)  # For surround mixing


@dataclass
class MixConfiguration:
    """Complete mix configuration"""
    id: str
    project_id: str
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = datetime.now()
    
    # Master settings
    master_volume: float = 0.0  # dB
    master_limit: bool = True
    master_limiter_threshold: float = -1.0  # dB
    
    # Tracks
    tracks: List[MixNode] = field(default_factory=list)
    
    # Multichannel settings
    mix_config: MixConfig = field(default_factory=MixConfig)
    
    # Mix settings
    auto_mix_enabled: bool = True
    ducking_enabled: bool = True
    ducking_threshold: float = -20.0  # dB
    ducking_release: float = 0.05     # seconds


@dataclass
class MixResult:
    """Result of a mix operation"""
    success: bool
    configuration: Optional[MixConfiguration] = None
    warnings: List[str] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)
    rendered_at: Optional[datetime] = None


# =============================================================================
# AUDIO MIX SERVICE
# =============================================================================

class AudioMixService:
    """
    Automatic audio mixing service with priority-based rules.
    
    Enhanced with:
    - Multichannel support (mono, stereo, 5.1, 7.1)
    - Audio effects (reverb, delay, EQ, compressor, limiter)
    - Advanced export options
    """
    
    def __init__(self):
        logger.info("AudioMixService initialized")
        self.mix_config = MixConfig()
    
    # -------------------------------------------------------------------------
    # MULTICHANNEL CONFIGURATION
    # -------------------------------------------------------------------------
    
    def set_mix_config(self, config: MixConfig) -> None:
        """Set multichannel mix configuration"""
        self.mix_config = config
        logger.info(f"Mix config updated: {config.channel_layout.value}, {config.sample_rate}Hz")
    
    def get_channel_count(self) -> int:
        """Get number of output channels"""
        return len(CHANNEL_LAYOUTS[self.mix_config.channel_layout])
    
    def get_channel_layout(self) -> List[str]:
        """Get channel layout names"""
        return CHANNEL_LAYOUTS[self.mix_config.channel_layout]
    
    def configure_track_for_surround(
        self,
        track: MixNode,
        channel_mapping: Dict[str, float]
    ) -> MixNode:
        """
        Configure track for surround output.
        
        Args:
            track: Track to configure
            channel_mapping: Mapping of channel name to level (0.0 to 1.0)
        """
        track.channels = list(channel_mapping.keys())
        track.effects.append({
            "type": "surround_pan",
            "enabled": True,
            "mapping": channel_mapping
        })
        return track
    
    # -------------------------------------------------------------------------
    # PRIORITY MANAGEMENT
    # -------------------------------------------------------------------------
    
    def get_priority(self, category: TrackCategory) -> TrackPriority:
        """Get mix priority for a category (Section 10)"""
        priority_map = {
            TrackCategory.DIALOGUE: TrackPriority.DIALOGUE,
            TrackCategory.SFX: TrackPriority.SFX,
            TrackCategory.MUSIC: TrackPriority.MUSIC,
            TrackCategory.AMBIENT: TrackPriority.AMBIENT
        }
        return priority_map.get(category, TrackPriority.AMBIENT)
    
    def sort_by_priority(
        self,
        tracks: List[MixNode],
        descending: bool = True
    ) -> List[MixNode]:
        """Sort tracks by priority"""
        return sorted(tracks, key=lambda t: t.priority.value, reverse=descending)
    
    # -------------------------------------------------------------------------
    # VOLUME AUTOMATION
    # -------------------------------------------------------------------------
    
    def calculate_volume(
        self,
        category: str,
        context: str = "default"
    ) -> VolumeLevel:
        """Calculate volume level based on category and context"""
        
        if context == "action" and category == "music":
            return STANDARD_VOLUMES["musique_action"]
        elif context == "tension" and category == "music":
            return STANDARD_VOLUMES["musique_tension"]
        elif context == "emotion" and category == "music":
            return STANDARD_VOLUMES["musique_emotion"]
        elif category == "impact":
            return STANDARD_VOLUMES["impact"]
        elif category == "tir":
            return STANDARD_VOLUMES["tir"]
        elif category == "ambient":
            return STANDARD_VOLUMES["ambiance"]
        elif category == "dialogue":
            return STANDARD_VOLUMES["dialogue"]
        
        return STANDARD_VOLUMES.get(category, STANDARD_VOLUMES["default"])
    
    def apply_volume_curve(
        self,
        track: MixNode,
        curve_type: str = "linear",
        points: Optional[List[Tuple[float, float]]] = None
    ) -> MixNode:
        """
        Apply volume automation curve to track.
        
        Types:
        - linear: Linear fade
        - exponential: Exponential fade
        - s_curve: S-curve for smooth transitions
        - keyframe: Custom keyframes
        """
        if curve_type == "linear":
            track.automation = [
                {"type": "volume", "curve": "linear", "points": points or []}
            ]
        elif curve_type == "exponential":
            track.automation = [
                {"type": "volume", "curve": "exponential", "points": points or []}
            ]
        elif curve_type == "s_curve":
            track.automation = [
                {"type": "volume", "curve": "s_curve", "points": points or []}
            ]
        
        return track
    
    # -------------------------------------------------------------------------
    # AUDIO EFFECTS
    # -------------------------------------------------------------------------
    
    def apply_effects_to_track(
        self,
        track: MixNode,
        audio_data: np.ndarray
    ) -> np.ndarray:
        """
        Apply all configured effects to a track.
        
        Args:
            track: Track with effects configuration
            audio_data: Input audio samples
            
        Returns:
            Processed audio
        """
        if track.muted:
            return np.zeros_like(audio_data)
        
        output = audio_data.copy()
        
        for effect in track.effects:
            if not effect.get("enabled", True):
                continue
            
            effect_type = effect.get("type")
            
            if effect_type == "reverb":
                output = AudioEffects.apply_reverb(
                    output,
                    room_size=effect.get("room_size", 0.5),
                    wet_dry=effect.get("wet_dry", 0.3),
                    sample_rate=self.mix_config.sample_rate
                )
            elif effect_type == "delay":
                output = AudioEffects.apply_delay(
                    output,
                    delay_ms=effect.get("delay_ms", 100),
                    feedback=effect.get("feedback", 0.3),
                    sample_rate=self.mix_config.sample_rate
                )
            elif effect_type == "eq":
                output = AudioEffects.apply_eq(
                    output,
                    low_gain=effect.get("low_gain", 0),
                    mid_gain=effect.get("mid_gain", 0),
                    high_gain=effect.get("high_gain", 0),
                    sample_rate=self.mix_config.sample_rate
                )
            elif effect_type == "compressor":
                output = AudioEffects.apply_compressor(
                    output,
                    threshold_db=effect.get("threshold_db", -24),
                    ratio=effect.get("ratio", 4),
                    sample_rate=self.mix_config.sample_rate
                )
            elif effect_type == "gain":
                output = AudioEffects.apply_gain(
                    output,
                    gain_db=effect.get("gain_db", 0)
                )
            elif effect_type == "limiter":
                output = AudioEffects.apply_limiter(
                    output,
                    threshold_db=effect.get("threshold_db", -1),
                    sample_rate=self.mix_config.sample_rate
                )
        
        # Apply track volume
        output = AudioEffects.apply_gain(output, track.volume)
        
        return output
    
    # -------------------------------------------------------------------------
    # PHASE MANAGEMENT (Section 10)
    # -------------------------------------------------------------------------
    
    def apply_phase_rules(self, tracks: List[MixNode]) -> List[MixNode]:
        """
        Apply phase management rules.
        
        Section 10 Rules:
        - SFX graves en mono
        - jamais de stéréo large en basses
        """
        for track in tracks:
            if track.category == TrackCategory.SFX:
                track.effects.append({
                    "type": "mono_compat",
                    "enabled": True,
                    "low_freq_mono": True,
                    "crossover_freq": 120
                })
            elif track.category == TrackCategory.MUSIC:
                if "bass" in track.name.lower():
                    track.phase = "mono"
                    track.effects.append({
                        "type": "mono_compat",
                        "enabled": True,
                        "low_freq_mono": True,
                        "crossover_freq": 80
                    })
        
        return tracks
    
    def check_phase_coherence(self, tracks: List[MixNode]) -> List[str]:
        """Check for phase issues in the mix"""
        warnings = []
        
        for track in tracks:
            if track.phase == "stereo" and "bass" in track.name.lower():
                warnings.append(
                    f"Track '{track.name}': Stereo bass detected - may cause phase issues"
                )
        
        return warnings
    
    # -------------------------------------------------------------------------
    # DUCKING
    # -------------------------------------------------------------------------
    
    def apply_ducking(
        self,
        tracks: List[MixNode],
        target_category: TrackCategory,
        threshold_db: float = -20.0,
        ratio: float = 4.0,
        attack: float = 0.01,
        release: float = 0.05
    ) -> List[MixNode]:
        """Apply ducking to lower volume when target track is active."""
        target_priority = self.get_priority(target_category)
        
        for track in tracks:
            if track.priority.value < target_priority.value:
                track.effects.append({
                    "type": "ducking",
                    "enabled": True,
                    "trigger_category": target_category.value,
                    "threshold_db": threshold_db,
                    "ratio": ratio,
                    "attack_ms": attack * 1000,
                    "release_ms": release * 1000
                })
        
        logger.info(f"Applied ducking to {len(tracks)} tracks for {target_category.value}")
        return tracks
    
    # -------------------------------------------------------------------------
    # AUTO MIX
    # -------------------------------------------------------------------------
    
    def auto_mix(
        self,
        tracks: List[Dict[str, Any]],
        auto_mix_enabled: bool = True,
        ducking_enabled: bool = True
    ) -> MixResult:
        """Perform automatic mixing based on rules."""
        warnings = []
        errors = []
        
        try:
            mix_tracks = []
            for i, track_data in enumerate(tracks):
                category = TrackCategory(track_data.get("category", "ambient"))
                priority = self.get_priority(category)
                
                mix_track = MixNode(
                    id=track_data.get("id", f"track_{i}"),
                    name=track_data.get("name", f"Track {i}"),
                    category=category,
                    priority=priority,
                    volume=track_data.get("volume", 0.0),
                    pan=track_data.get("pan", 0.0),
                    muted=track_data.get("muted", False),
                    phase=track_data.get("phase", "stereo")
                )
                mix_tracks.append(mix_track)
            
            mix_tracks = self.sort_by_priority(mix_tracks)
            
            for track in mix_tracks:
                vol_level = self.calculate_volume(track.category.value)
                track.volume = vol_level.base_volume
            
            mix_tracks = self.apply_phase_rules(mix_tracks)
            
            phase_warnings = self.check_phase_coherence(mix_tracks)
            warnings.extend(phase_warnings)
            
            if ducking_enabled:
                if any(t.category == TrackCategory.DIALOGUE for t in mix_tracks):
                    mix_tracks = self.apply_ducking(
                        mix_tracks,
                        TrackCategory.DIALOGUE,
                        threshold_db=-20.0
                    )
            
            config = MixConfiguration(
                id=f"mix_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                project_id=tracks[0].get("project_id", "unknown") if tracks else "unknown",
                tracks=mix_tracks,
                auto_mix_enabled=auto_mix_enabled,
                ducking_enabled=ducking_enabled,
                mix_config=self.mix_config
            )
            
            logger.info(f"Auto-mix completed with {len(mix_tracks)} tracks")
            
            return MixResult(
                success=True,
                configuration=config,
                warnings=warnings,
                errors=errors
            )
            
        except Exception as e:
            logger.error(f"Auto-mix failed: {e}")
            return MixResult(
                success=False,
                warnings=warnings,
                errors=[str(e)]
            )
    
    # -------------------------------------------------------------------------
    # EXPORT
    # -------------------------------------------------------------------------
    
    async def export_mix(
        self,
        config: MixConfiguration,
        tracks_data: Dict[str, np.ndarray],
        output_path: str
    ) -> Tuple[bool, str]:
        """
        Export the mix to a file.
        
        Args:
            config: Mix configuration
            tracks_data: Dictionary of track ID to audio samples
            output_path: Output file path
            
        Returns:
            Tuple of (success, message)
        """
        import os
        import wave
        
        try:
            channel_count = self.get_channel_count()
            sample_rate = self.mix_config.sample_rate
            
            # Mix all tracks
            mixed_audio = None
            for track_id, audio_data in tracks_data.items():
                if mixed_audio is None:
                    mixed_audio = np.zeros(len(audio_data))
                mixed_audio += audio_data
            
            if mixed_audio is None:
                return False, "No audio tracks to mix"
            
            # Apply master volume
            mixed_audio = AudioEffects.apply_gain(
                mixed_audio,
                config.master_volume
            )
            
            # Apply limiter if enabled
            if config.master_limit:
                mixed_audio = AudioEffects.apply_limiter(
                    mixed_audio,
                    threshold_db=config.master_limiter_threshold,
                    sample_rate=sample_rate
                )
            
            # Normalize if enabled
            if self.mix_config.normalization:
                mixed_audio = AudioEffects.normalize(mixed_audio, -3.0)
            
            # Create output directory
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            
            # Determine output format and write file
            if self.mix_config.output_format == "wav":
                # Write WAV file
                with wave.open(output_path, 'wb') as wf:
                    wf.setnchannels(channel_count)
                    wf.setsampwidth(self.mix_config.bit_depth // 8)
                    wf.setframerate(sample_rate)
                    
                    # Convert float to appropriate integer format
                    if self.mix_config.bit_depth == 16:
                        audio_int = (mixed_audio * 32767).astype(np.int16)
                    elif self.mix_config.bit_depth == 24:
                        # 24-bit requires special handling
                        audio_int = (mixed_audio * 8388607).astype(np.int32)
                    else:
                        audio_int = (mixed_audio * 32767).astype(np.int16)
                    
                    # For mono input to multichannel output
                    if channel_count > 1:
                        # Expand mono to multichannel
                        expanded = np.zeros((len(audio_int), channel_count))
                        for ch in range(channel_count):
                            expanded[:, ch] = audio_int
                        audio_int = expanded.flatten()
                    
                    wf.writeframes(audio_int.tobytes())
            
            elif self.mix_config.output_format == "flac":
                # Would use flac library
                logger.info("FLAC export not yet implemented")
                return False, "FLAC export not yet implemented"
            
            elif self.mix_config.output_format == "mp3":
                # Would use ffmpeg or lame
                logger.info("MP3 export requires ffmpeg")
                return False, "MP3 export requires ffmpeg"
            
            logger.info(f"Mix exported to {output_path}")
            return True, f"Mix exported successfully to {output_path}"
            
        except Exception as e:
            logger.error(f"Export failed: {e}")
            return False, str(e)
    
    def generate_ffmpeg_command(
        self,
        config: MixConfiguration,
        input_files: List[str],
        output_path: str
    ) -> str:
        """Generate FFmpeg command for mixing"""
        import shlex
        
        channel_count = self.get_channel_count()
        filter_parts = []
        
        for i, track in enumerate(config.tracks):
            if track.muted:
                continue
            
            vol_adjust = f"volume={track.volume}dB"
            
            if track.phase == "mono":
                pan_filter = f"pan=mono|c0=c{i}"
            else:
                pan_filter = f"pan=stereo|c0=c{i}|c1=c{i}"
            
            filters = f"{vol_adjust},{pan_filter}"
            filter_parts.append(f"[{i}:a]{filters}[a{i}]")
        
        filter_complex = ";".join(filter_parts)
        
        cmd_parts = [
            "ffmpeg",
            "-y"
        ]
        
        for input_file in input_files:
            cmd_parts.extend(["-i", shlex.quote(input_file)])
        
        if filter_parts:
            cmd_parts.extend(["-filter_complex", filter_complex])
        
        cmd_parts.extend([
            "-map", "[a0]" if filter_parts else "0:a",
            "-c:a", "pcm_s24le" if config.mix_config.output_format == "wav" else "aac",
            "-ar", str(config.mix_config.sample_rate),
            "-ac", str(channel_count),
            shlex.quote(output_path)
        ])
        
        return " ".join(cmd_parts)
    
    async def export_with_ffmpeg(
        self,
        config: MixConfiguration,
        input_files: List[str],
        output_path: str,
        dry_run: bool = False
    ) -> Tuple[bool, str]:
        """
        Export using FFmpeg.
        
        Returns:
            Tuple of (success, message/command)
        """
        if dry_run:
            cmd = self.generate_ffmpeg_command(config, input_files, output_path)
            return True, f"DRY RUN - Command:\n{cmd}"
        
        import subprocess
        
        cmd = self.generate_ffmpeg_command(config, input_files, output_path)
        
        try:
            process = await asyncio.create_subprocess_shell(
                cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()
            
            if process.returncode == 0:
                return True, f"Mix exported successfully to {output_path}"
            else:
                return False, f"FFmpeg error: {stderr.decode()}"
                
        except Exception as e:
            return False, str(e)
    
    # -------------------------------------------------------------------------
    # VALIDATION
    # -------------------------------------------------------------------------
    
    def validate_mix(self, config: MixConfiguration) -> Tuple[bool, List[str]]:
        """Validate mix configuration"""
        issues = []
        
        max_volume = max(t.volume for t in config.tracks if not t.muted)
        if max_volume > 0:
            issues.append(
                f"Maximum track volume ({max_volume}dB) may cause clipping. "
                "Consider reducing."
            )
        
        mono_tracks = [t for t in config.tracks if t.phase == "mono"]
        stereo_tracks = [t for t in config.tracks if t.phase == "stereo"]
        
        if len(mono_tracks) == len(config.tracks) and len(stereo_tracks) == 0:
            issues.append("All tracks are mono - stereo image may be narrow")
        
        if all(t.muted for t in config.tracks):
            issues.append("All tracks are muted - no audio will be produced")
        
        return len(issues) == 0, issues


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def create_mix_config(
    channels: str = "stereo",
    sample_rate: int = 48000,
    bit_depth: int = 24,
    output_format: str = "wav"
) -> MixConfig:
    """
    Create a mix configuration.
    
    Args:
        channels: Channel configuration (mono, stereo, 5.1, 7.1)
        sample_rate: Sample rate in Hz
        bit_depth: Bit depth (16, 24, 32)
        output_format: Output format (wav, flac, mp3)
        
    Returns:
        MixConfig instance
    """
    channel_map = {
        "mono": AudioChannel.MONO,
        "stereo": AudioChannel.STEREO,
        "5.1": AudioChannel.SURROUND_51,
        "7.1": AudioChannel.SURROUND_71
    }
    
    return MixConfig(
        channel_layout=channel_map.get(channels, AudioChannel.STEREO),
        sample_rate=sample_rate,
        bit_depth=bit_depth,
        output_format=output_format
    )
