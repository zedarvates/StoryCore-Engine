"""
Audio Mixing Engine Module for StoryCore-Engine.

This module performs professional audio mixing with automatic voice/music balancing,
keyframe-based volume automation, crossfade transitions, and audio gap detection.
"""

from pathlib import Path
from typing import List, Optional, Tuple, Dict, Any
from dataclasses import dataclass
import json
import numpy as np

# Import from models
import sys
sys.path.insert(0, str(Path(__file__).parent))
from models.quality_models import VoiceSegment as VoiceSegmentModel, AudioKeyframe as AudioKeyframeModel


class AudioMixingEngine:
    """Professional audio mixing with keyframes and crossfades."""
    
    def __init__(self):
        """Initialize the audio mixing engine."""
        self.default_music_reduction_db = -12.0
        self.default_keyframe_offset_seconds = 0.5
        self.default_gap_threshold_ms = 100
        self.voice_freq_min = 85  # Hz - minimum voice frequency
        self.voice_freq_max = 255  # Hz - maximum voice frequency
        self.voice_rms_threshold = 0.02  # RMS threshold for voice detection
    
    def detect_voice_segments(
        self,
        audio_track: Dict[str, Any]
    ) -> List[VoiceSegmentModel]:
        """
        Detects voice segments in audio track using spectral analysis.
        
        Focuses on 85-255 Hz frequency range for voice detection.
        Uses RMS energy analysis and spectral content to identify voice activity.
        
        Args:
            audio_track: Audio track dict with keys:
                - samples: np.ndarray of audio samples
                - sample_rate: int (samples per second)
                - duration: float (seconds)
                
        Returns:
            List of VoiceSegment objects with start/end timestamps
        """
        samples = audio_track.get("samples")
        sample_rate = audio_track.get("sample_rate", 44100)
        duration = audio_track.get("duration", 0.0)
        
        if samples is None or len(samples) == 0:
            return []
        
        # Convert to mono if stereo
        if len(samples.shape) > 1:
            samples = np.mean(samples, axis=1)
        
        # Parameters for analysis
        window_size = int(0.1 * sample_rate)  # 100ms windows
        hop_size = int(0.05 * sample_rate)  # 50ms hop (50% overlap)
        
        voice_segments = []
        current_segment_start = None
        current_segment_rms_values = []
        
        # Analyze audio in windows
        for i in range(0, len(samples) - window_size, hop_size):
            window = samples[i:i + window_size]
            timestamp = i / sample_rate
            
            # Calculate RMS energy
            rms = np.sqrt(np.mean(window ** 2))
            
            # Perform FFT for spectral analysis
            fft = np.fft.rfft(window)
            freqs = np.fft.rfftfreq(len(window), 1/sample_rate)
            magnitudes = np.abs(fft)
            
            # Focus on voice frequency range (85-255 Hz)
            voice_freq_mask = (freqs >= self.voice_freq_min) & (freqs <= self.voice_freq_max)
            voice_energy = np.sum(magnitudes[voice_freq_mask])
            total_energy = np.sum(magnitudes)
            
            # Calculate voice confidence based on energy in voice frequency range
            if total_energy > 0:
                voice_ratio = voice_energy / total_energy
            else:
                voice_ratio = 0.0
            
            # Detect voice activity
            is_voice = (rms > self.voice_rms_threshold) and (voice_ratio > 0.1)
            
            if is_voice:
                if current_segment_start is None:
                    # Start new segment
                    current_segment_start = timestamp
                    current_segment_rms_values = [rms]
                else:
                    # Continue current segment
                    current_segment_rms_values.append(rms)
            else:
                if current_segment_start is not None:
                    # End current segment
                    segment_end = timestamp
                    avg_rms = np.mean(current_segment_rms_values)
                    
                    # Calculate confidence based on RMS level and duration
                    segment_duration = segment_end - current_segment_start
                    confidence = min(1.0, (avg_rms / 0.1) * (segment_duration / 1.0))
                    confidence = max(0.0, min(1.0, confidence))
                    
                    voice_segments.append(VoiceSegmentModel(
                        start_time=current_segment_start,
                        end_time=segment_end,
                        confidence=confidence,
                        rms_level=float(avg_rms)
                    ))
                    
                    current_segment_start = None
                    current_segment_rms_values = []
        
        # Handle segment that extends to end of audio
        if current_segment_start is not None:
            segment_end = duration if duration > 0 else len(samples) / sample_rate
            avg_rms = np.mean(current_segment_rms_values) if current_segment_rms_values else 0.0
            segment_duration = segment_end - current_segment_start
            confidence = min(1.0, (avg_rms / 0.1) * (segment_duration / 1.0))
            confidence = max(0.0, min(1.0, confidence))
            
            voice_segments.append(VoiceSegmentModel(
                start_time=current_segment_start,
                end_time=segment_end,
                confidence=confidence,
                rms_level=float(avg_rms)
            ))
        
        # Merge segments that are very close together (< 0.2 seconds apart)
        merged_segments = self._merge_close_segments(voice_segments, gap_threshold=0.2)
        
        return merged_segments
    
    def _merge_close_segments(
        self,
        segments: List[VoiceSegmentModel],
        gap_threshold: float = 0.2
    ) -> List[VoiceSegmentModel]:
        """
        Merge voice segments that are very close together.
        
        Args:
            segments: List of voice segments
            gap_threshold: Maximum gap between segments to merge (seconds)
            
        Returns:
            List of merged voice segments
        """
        if not segments:
            return []
        
        # Sort segments by start time
        sorted_segments = sorted(segments, key=lambda s: s.start_time)
        
        merged = []
        current = sorted_segments[0]
        
        for next_seg in sorted_segments[1:]:
            gap = next_seg.start_time - current.end_time
            
            if gap <= gap_threshold:
                # Merge segments
                current = VoiceSegmentModel(
                    start_time=current.start_time,
                    end_time=next_seg.end_time,
                    confidence=max(current.confidence, next_seg.confidence),
                    rms_level=max(current.rms_level, next_seg.rms_level)
                )
            else:
                # Save current and start new
                merged.append(current)
                current = next_seg
        
        # Add last segment
        merged.append(current)
        
        return merged
    
    def create_voice_music_mix(
        self,
        voice_track: Dict[str, Any],
        music_track: Dict[str, Any],
        music_reduction_db: Optional[float] = None,
        keyframe_offset: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Creates professional voice/music mix with automatic ducking.
        
        Process:
        1. Detect voice segments in voice track
        2. Create keyframes 0.5s before/after each voice segment
        3. Reduce music to -12 dB during voice
        4. Apply smooth interpolation curves
        
        Args:
            voice_track: Voice/narration audio dict with keys:
                - samples: np.ndarray
                - sample_rate: int
                - duration: float
            music_track: Background music audio dict (same structure)
            music_reduction_db: Music volume reduction during voice (default: -12 dB)
            keyframe_offset: Time offset for keyframes before/after voice (default: 0.5s)
            
        Returns:
            Dict with mixed audio and metadata:
                - mixed_samples: np.ndarray of mixed audio
                - voice_segments: List of detected voice segments
                - keyframes: List of audio keyframes
                - sample_rate: int
                - duration: float
        """
        if music_reduction_db is None:
            music_reduction_db = self.default_music_reduction_db
        
        if keyframe_offset is None:
            keyframe_offset = self.default_keyframe_offset_seconds
        
        # Get audio data
        voice_samples = voice_track.get("samples")
        music_samples = music_track.get("samples")
        voice_sample_rate = voice_track.get("sample_rate", 44100)
        music_sample_rate = music_track.get("sample_rate", 44100)
        
        if voice_samples is None or music_samples is None:
            return {
                "error": "Missing audio samples",
                "mixed_samples": None,
                "voice_segments": [],
                "keyframes": []
            }
        
        # Ensure both tracks have the same sample rate
        if voice_sample_rate != music_sample_rate:
            return {
                "error": f"Sample rate mismatch: voice={voice_sample_rate}, music={music_sample_rate}",
                "mixed_samples": None,
                "voice_segments": [],
                "keyframes": []
            }
        
        sample_rate = voice_sample_rate
        
        # Convert to mono if needed
        if len(voice_samples.shape) > 1:
            voice_samples = np.mean(voice_samples, axis=1)
        if len(music_samples.shape) > 1:
            music_samples = np.mean(music_samples, axis=1)
        
        # Detect voice segments
        voice_segments = self.detect_voice_segments(voice_track)
        
        # Create keyframes for music volume automation
        keyframes = self._create_ducking_keyframes(
            voice_segments,
            music_reduction_db,
            keyframe_offset,
            max(len(voice_samples), len(music_samples)) / sample_rate
        )
        
        # Apply volume automation to music track
        music_automated = self._apply_volume_automation(
            music_samples,
            keyframes,
            sample_rate
        )
        
        # Mix voice and automated music
        # Ensure both tracks are the same length
        max_length = max(len(voice_samples), len(music_automated))
        
        voice_padded = np.zeros(max_length)
        voice_padded[:len(voice_samples)] = voice_samples
        
        music_padded = np.zeros(max_length)
        music_padded[:len(music_automated)] = music_automated
        
        # Mix with proper gain staging
        mixed_samples = voice_padded + music_padded
        
        # Normalize to prevent clipping
        max_amplitude = np.max(np.abs(mixed_samples))
        if max_amplitude > 0.95:
            mixed_samples = mixed_samples * (0.95 / max_amplitude)
        
        return {
            "mixed_samples": mixed_samples,
            "voice_segments": [seg.to_dict() for seg in voice_segments],
            "keyframes": [kf.to_dict() for kf in keyframes],
            "sample_rate": sample_rate,
            "duration": max_length / sample_rate
        }
    
    def _create_ducking_keyframes(
        self,
        voice_segments: List[VoiceSegmentModel],
        reduction_db: float,
        offset: float,
        total_duration: float
    ) -> List[AudioKeyframeModel]:
        """
        Create keyframes for music ducking based on voice segments.
        
        Args:
            voice_segments: List of detected voice segments
            reduction_db: Volume reduction in dB during voice
            offset: Time offset before/after voice segments
            total_duration: Total duration of audio
            
        Returns:
            List of AudioKeyframe objects
        """
        keyframes = []
        
        # Start with music at full volume (0 dB)
        keyframes.append(AudioKeyframeModel(
            timestamp=0.0,
            volume_db=0.0,
            curve_type="linear"
        ))
        
        for segment in voice_segments:
            # Keyframe before voice starts (fade down)
            fade_down_time = max(0.0, segment.start_time - offset)
            keyframes.append(AudioKeyframeModel(
                timestamp=fade_down_time,
                volume_db=0.0,
                curve_type="exponential"
            ))
            
            # Keyframe at voice start (reduced volume)
            keyframes.append(AudioKeyframeModel(
                timestamp=segment.start_time,
                volume_db=reduction_db,
                curve_type="exponential"
            ))
            
            # Keyframe at voice end (still reduced)
            keyframes.append(AudioKeyframeModel(
                timestamp=segment.end_time,
                volume_db=reduction_db,
                curve_type="exponential"
            ))
            
            # Keyframe after voice ends (fade up)
            fade_up_time = min(total_duration, segment.end_time + offset)
            keyframes.append(AudioKeyframeModel(
                timestamp=fade_up_time,
                volume_db=0.0,
                curve_type="exponential"
            ))
        
        # End with music at full volume
        if not keyframes or keyframes[-1].timestamp < total_duration:
            keyframes.append(AudioKeyframeModel(
                timestamp=total_duration,
                volume_db=0.0,
                curve_type="linear"
            ))
        
        # Sort by timestamp and remove duplicates
        keyframes = sorted(keyframes, key=lambda k: k.timestamp)
        
        return keyframes
    
    def _apply_volume_automation(
        self,
        samples: np.ndarray,
        keyframes: List[AudioKeyframeModel],
        sample_rate: int
    ) -> np.ndarray:
        """
        Apply volume automation to audio samples based on keyframes.
        
        Supports multiple interpolation curves:
        - linear: Simple linear interpolation
        - exponential: Natural-sounding exponential curve
        - cubic_bezier: Smooth cubic Bezier curve with no discontinuities
        - logarithmic: Logarithmic curve for perceptual volume changes
        
        Args:
            samples: Audio samples to process
            keyframes: List of volume keyframes
            sample_rate: Sample rate in Hz
            
        Returns:
            Processed audio samples with volume automation applied
        """
        if not keyframes:
            return samples
        
        # Create volume envelope
        num_samples = len(samples)
        volume_envelope = np.ones(num_samples)
        
        # Sort keyframes by timestamp
        sorted_keyframes = sorted(keyframes, key=lambda k: k.timestamp)
        
        # Interpolate between keyframes
        for i in range(len(sorted_keyframes) - 1):
            kf_start = sorted_keyframes[i]
            kf_end = sorted_keyframes[i + 1]
            
            start_sample = int(kf_start.timestamp * sample_rate)
            end_sample = int(kf_end.timestamp * sample_rate)
            
            # Ensure indices are within bounds
            start_sample = max(0, min(start_sample, num_samples - 1))
            end_sample = max(0, min(end_sample, num_samples))
            
            if start_sample >= end_sample:
                continue
            
            # Convert dB to linear gain
            start_gain = self._db_to_linear(kf_start.volume_db)
            end_gain = self._db_to_linear(kf_end.volume_db)
            
            # Create interpolation curve based on curve type
            num_points = end_sample - start_sample
            curve_type = kf_end.curve_type.lower()
            
            if curve_type == "cubic_bezier" or curve_type == "cubic":
                # Cubic Bezier curve for smooth, natural transitions
                curve = self._cubic_bezier_interpolation(
                    start_gain, end_gain, num_points
                )
            elif curve_type == "exponential":
                # Exponential curve for natural-sounding fades
                t = np.linspace(0, 1, num_points)
                if start_gain > 0 and end_gain > 0:
                    curve = start_gain * np.power(end_gain / start_gain, t)
                else:
                    # Fallback to linear if either gain is zero
                    curve = np.linspace(start_gain, end_gain, num_points)
            elif curve_type == "logarithmic":
                # Logarithmic curve for perceptual volume changes
                curve = self._logarithmic_interpolation(
                    start_gain, end_gain, num_points
                )
            else:
                # Linear interpolation (default)
                curve = np.linspace(start_gain, end_gain, num_points)
            
            volume_envelope[start_sample:end_sample] = curve
        
        # Apply volume envelope to samples
        return samples * volume_envelope
    
    def _cubic_bezier_interpolation(
        self,
        start_value: float,
        end_value: float,
        num_points: int,
        control_point_1: float = 0.42,
        control_point_2: float = 0.58
    ) -> np.ndarray:
        """
        Create smooth cubic Bezier interpolation curve.
        
        Uses cubic Bezier curve with configurable control points for
        smooth, natural-sounding volume transitions with no discontinuities.
        
        Default control points (0.42, 0.58) create an "ease-in-out" curve
        similar to CSS ease-in-out timing function.
        
        Args:
            start_value: Starting value
            end_value: Ending value
            num_points: Number of points in the curve
            control_point_1: First control point (0-1, default 0.42)
            control_point_2: Second control point (0-1, default 0.58)
            
        Returns:
            Array of interpolated values
        """
        if num_points <= 0:
            return np.array([])
        
        if num_points == 1:
            return np.array([end_value])
        
        # Create time parameter t from 0 to 1
        t = np.linspace(0, 1, num_points)
        
        # Cubic Bezier formula: B(t) = (1-t)³P₀ + 3(1-t)²tP₁ + 3(1-t)t²P₂ + t³P₃
        # For our case: P₀ = 0, P₁ = control_point_1, P₂ = control_point_2, P₃ = 1
        
        # Calculate Bezier curve for time mapping
        bezier_t = (
            3 * (1 - t)**2 * t * control_point_1 +
            3 * (1 - t) * t**2 * control_point_2 +
            t**3
        )
        
        # Apply the Bezier-mapped time to interpolate between start and end values
        curve = start_value + (end_value - start_value) * bezier_t
        
        return curve
    
    def _logarithmic_interpolation(
        self,
        start_value: float,
        end_value: float,
        num_points: int
    ) -> np.ndarray:
        """
        Create logarithmic interpolation curve.
        
        Logarithmic curves are useful for perceptual volume changes,
        as human hearing perceives volume changes logarithmically.
        
        Args:
            start_value: Starting value
            end_value: Ending value
            num_points: Number of points in the curve
            
        Returns:
            Array of interpolated values
        """
        if num_points <= 0:
            return np.array([])
        
        if num_points == 1:
            return np.array([end_value])
        
        # Avoid log(0) by using a small epsilon
        epsilon = 1e-10
        start_safe = max(start_value, epsilon)
        end_safe = max(end_value, epsilon)
        
        # Create logarithmic space
        t = np.linspace(0, 1, num_points)
        
        # Logarithmic interpolation
        log_start = np.log10(start_safe)
        log_end = np.log10(end_safe)
        
        curve = np.power(10, log_start + (log_end - log_start) * t)
        
        # Handle case where original values were zero
        if start_value == 0:
            curve[0] = 0
        if end_value == 0:
            curve[-1] = 0
        
        return curve
    
    def check_interpolation_continuity(
        self,
        keyframes: List[AudioKeyframeModel],
        sample_rate: int,
        tolerance: float = 1e-6
    ) -> Dict[str, Any]:
        """
        Check that volume interpolation has no discontinuities.
        
        Verifies that the volume envelope is continuous at all keyframe
        boundaries, ensuring smooth transitions without clicks or pops.
        
        Args:
            keyframes: List of volume keyframes
            sample_rate: Sample rate in Hz
            tolerance: Maximum allowed discontinuity (default: 1e-6)
            
        Returns:
            Dict with continuity check results:
                - is_continuous: bool
                - discontinuities: List of detected discontinuities
                - max_discontinuity: float (maximum discontinuity found)
        """
        if len(keyframes) < 2:
            return {
                "is_continuous": True,
                "discontinuities": [],
                "max_discontinuity": 0.0
            }
        
        sorted_keyframes = sorted(keyframes, key=lambda k: k.timestamp)
        discontinuities = []
        max_discontinuity = 0.0
        
        # Check each keyframe boundary
        for i in range(len(sorted_keyframes) - 1):
            kf_current = sorted_keyframes[i]
            kf_next = sorted_keyframes[i + 1]
            
            # Get the gain values at the boundary
            current_gain = self._db_to_linear(kf_current.volume_db)
            next_gain = self._db_to_linear(kf_next.volume_db)
            
            # For continuous interpolation, the end of one segment should
            # match the start of the next segment
            # (This is automatically true in our implementation, but we check anyway)
            
            # Check if there's a time gap (which would create a discontinuity)
            time_gap = kf_next.timestamp - kf_current.timestamp
            if time_gap < 0:
                discontinuities.append({
                    "timestamp": kf_next.timestamp,
                    "type": "negative_time_gap",
                    "description": "Keyframes out of order"
                })
        
        # Create a test envelope to check for actual discontinuities
        test_duration = sorted_keyframes[-1].timestamp
        test_samples = int(test_duration * sample_rate) + 1
        test_audio = np.ones(test_samples)
        
        envelope = self._apply_volume_automation(
            test_audio,
            keyframes,
            sample_rate
        )
        
        # Check for sudden jumps in the envelope
        if len(envelope) > 1:
            diff = np.abs(np.diff(envelope))
            max_diff = np.max(diff)
            max_discontinuity = max_diff
            
            # Find discontinuities above tolerance
            discontinuity_indices = np.where(diff > tolerance)[0]
            
            for idx in discontinuity_indices:
                timestamp = idx / sample_rate
                discontinuities.append({
                    "timestamp": timestamp,
                    "type": "volume_jump",
                    "magnitude": float(diff[idx]),
                    "description": f"Volume jump of {diff[idx]:.6f} at {timestamp:.3f}s"
                })
        
        return {
            "is_continuous": len(discontinuities) == 0,
            "discontinuities": discontinuities,
            "max_discontinuity": float(max_discontinuity)
        }
    
    def _db_to_linear(self, db: float) -> float:
        """
        Convert decibels to linear gain.
        
        Args:
            db: Volume in decibels
            
        Returns:
            Linear gain value
        """
        return np.power(10.0, db / 20.0)
    
    def apply_crossfade(
        self,
        clip_a: Dict[str, Any],
        clip_b: Dict[str, Any],
        duration: float = 1.0,
        curve: str = "exponential",
        overlap_position: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Applies crossfade transition with 0 dB gain compensation.
        
        A crossfade smoothly transitions from one audio clip to another by
        simultaneously fading out the first clip and fading in the second clip.
        The 0 dB gain compensation ensures that the perceived loudness remains
        constant during the transition (equal-power crossfade).
        
        Args:
            clip_a: First audio clip dict with keys:
                - samples: np.ndarray
                - sample_rate: int
                - duration: float
            clip_b: Second audio clip dict (same structure)
            duration: Crossfade duration in seconds (default: 1.0)
            curve: Interpolation curve type:
                - "linear": Simple linear crossfade
                - "exponential": Natural-sounding exponential curve
                - "equal_power": Equal-power crossfade (constant perceived loudness)
            overlap_position: Position where clips overlap (default: end of clip_a)
            
        Returns:
            Dict with crossfaded audio:
                - crossfaded_samples: np.ndarray of crossfaded audio
                - sample_rate: int
                - duration: float
                - fade_start: float (timestamp where fade starts)
                - fade_end: float (timestamp where fade ends)
                - gain_compensation: float (dB)
                - curve_type: str
        """
        # Get audio data
        samples_a = clip_a.get("samples")
        samples_b = clip_b.get("samples")
        sample_rate_a = clip_a.get("sample_rate", 44100)
        sample_rate_b = clip_b.get("sample_rate", 44100)
        
        if samples_a is None or samples_b is None:
            return {
                "error": "Missing audio samples",
                "crossfaded_samples": None
            }
        
        # Ensure both clips have the same sample rate
        if sample_rate_a != sample_rate_b:
            return {
                "error": f"Sample rate mismatch: clip_a={sample_rate_a}, clip_b={sample_rate_b}",
                "crossfaded_samples": None
            }
        
        sample_rate = sample_rate_a
        
        # Convert to mono if needed
        if len(samples_a.shape) > 1:
            samples_a = np.mean(samples_a, axis=1)
        if len(samples_b.shape) > 1:
            samples_b = np.mean(samples_b, axis=1)
        
        # Calculate crossfade parameters
        fade_samples = int(duration * sample_rate)
        
        # Determine overlap position
        if overlap_position is None:
            # Default: crossfade at the end of clip_a
            overlap_start = len(samples_a) - fade_samples
        else:
            overlap_start = int(overlap_position * sample_rate)
        
        # Ensure overlap_start is valid
        overlap_start = max(0, min(overlap_start, len(samples_a) - fade_samples))
        
        # Create fade curves with gain compensation
        fade_out_curve, fade_in_curve = self._create_crossfade_curves(
            fade_samples, curve
        )
        
        # Apply crossfade
        # Part 1: Clip A before crossfade
        before_fade = samples_a[:overlap_start].copy()
        
        # Part 2: Crossfade region
        fade_region_a = samples_a[overlap_start:overlap_start + fade_samples]
        fade_region_b = samples_b[:min(fade_samples, len(samples_b))]
        
        # Ensure both fade regions are the same length
        actual_fade_samples = min(len(fade_region_a), len(fade_region_b))
        fade_region_a = fade_region_a[:actual_fade_samples]
        fade_region_b = fade_region_b[:actual_fade_samples]
        fade_out_curve = fade_out_curve[:actual_fade_samples]
        fade_in_curve = fade_in_curve[:actual_fade_samples]
        
        # Apply fades and mix
        crossfade_region = (fade_region_a * fade_out_curve + 
                           fade_region_b * fade_in_curve)
        
        # Part 3: Clip B after crossfade
        after_fade = samples_b[actual_fade_samples:]
        
        # Concatenate all parts
        crossfaded_samples = np.concatenate([
            before_fade,
            crossfade_region,
            after_fade
        ])
        
        # Calculate actual timestamps
        fade_start = overlap_start / sample_rate
        fade_end = (overlap_start + actual_fade_samples) / sample_rate
        
        return {
            "crossfaded_samples": crossfaded_samples,
            "sample_rate": sample_rate,
            "duration": len(crossfaded_samples) / sample_rate,
            "fade_start": fade_start,
            "fade_end": fade_end,
            "fade_duration": actual_fade_samples / sample_rate,
            "gain_compensation": 0.0,  # Equal-power crossfade maintains 0 dB
            "curve_type": curve
        }
    
    def _create_crossfade_curves(
        self,
        num_samples: int,
        curve_type: str = "exponential"
    ) -> Tuple[np.ndarray, np.ndarray]:
        """
        Create fade-out and fade-in curves for crossfading.
        
        Uses equal-power crossfade formulas to maintain constant perceived
        loudness during the transition (0 dB gain compensation).
        
        For equal-power crossfade:
        - fade_out = cos(t * π/2)
        - fade_in = sin(t * π/2)
        - Where t goes from 0 to 1
        
        This ensures: fade_out² + fade_in² = 1 (constant power)
        
        Args:
            num_samples: Number of samples in the crossfade
            curve_type: Type of curve:
                - "linear": Simple linear crossfade
                - "exponential": Exponential curve
                - "equal_power": Equal-power crossfade (recommended)
                
        Returns:
            Tuple of (fade_out_curve, fade_in_curve)
        """
        if num_samples <= 0:
            return np.array([]), np.array([])
        
        t = np.linspace(0, 1, num_samples)
        
        if curve_type == "equal_power":
            # Equal-power crossfade (constant perceived loudness)
            fade_out = np.cos(t * np.pi / 2)
            fade_in = np.sin(t * np.pi / 2)
        elif curve_type == "exponential":
            # Exponential curves (natural-sounding)
            fade_out = np.power(1 - t, 2)  # Quadratic fade out
            fade_in = np.power(t, 2)  # Quadratic fade in
            
            # Normalize to maintain approximate constant power
            normalization = np.sqrt(fade_out**2 + fade_in**2)
            fade_out = fade_out / normalization
            fade_in = fade_in / normalization
        else:
            # Linear crossfade (simple but can have a dip in the middle)
            fade_out = 1 - t
            fade_in = t
        
        return fade_out, fade_in
    
    def create_crossfade_sequence(
        self,
        clips: List[Dict[str, Any]],
        crossfade_duration: float = 1.0,
        curve: str = "equal_power"
    ) -> Dict[str, Any]:
        """
        Create a sequence of audio clips with crossfades between them.
        
        Args:
            clips: List of audio clip dicts
            crossfade_duration: Duration of each crossfade in seconds
            curve: Crossfade curve type
            
        Returns:
            Dict with sequenced audio and metadata
        """
        if not clips:
            return {
                "error": "No clips provided",
                "sequenced_samples": None
            }
        
        if len(clips) == 1:
            # Single clip, no crossfade needed
            return {
                "sequenced_samples": clips[0].get("samples"),
                "sample_rate": clips[0].get("sample_rate", 44100),
                "duration": clips[0].get("duration", 0.0),
                "num_crossfades": 0
            }
        
        # Start with first clip
        result = clips[0].copy()
        num_crossfades = 0
        
        # Apply crossfades between consecutive clips
        for i in range(1, len(clips)):
            crossfade_result = self.apply_crossfade(
                result,
                clips[i],
                duration=crossfade_duration,
                curve=curve
            )
            
            if "error" in crossfade_result:
                return crossfade_result
            
            # Update result for next iteration
            result = {
                "samples": crossfade_result["crossfaded_samples"],
                "sample_rate": crossfade_result["sample_rate"],
                "duration": crossfade_result["duration"]
            }
            num_crossfades += 1
        
        return {
            "sequenced_samples": result["samples"],
            "sample_rate": result["sample_rate"],
            "duration": result["duration"],
            "num_crossfades": num_crossfades,
            "crossfade_duration": crossfade_duration,
            "curve_type": curve
        }
    
    def detect_and_fill_gaps(
        self,
        timeline: Dict[str, Any],
        threshold_ms: int = 100,
        fill_method: str = "ambient",
        ambient_level_db: float = -40.0
    ) -> Dict[str, Any]:
        """
        Detects audio gaps and fills with ambient audio or extends crossfades.
        
        Analyzes an audio timeline to find silence gaps longer than the threshold
        and fills them with appropriate audio to maintain continuity.
        
        Args:
            timeline: Audio timeline dict with keys:
                - samples: np.ndarray of audio samples
                - sample_rate: int
                - duration: float
                - clips: Optional[List] of clip boundaries
            threshold_ms: Minimum gap duration to flag (milliseconds, default: 100)
            fill_method: Method to fill gaps:
                - "ambient": Fill with low-level ambient noise
                - "crossfade": Extend crossfades to cover gaps
                - "silence": Leave as silence (just detect)
            ambient_level_db: Level of ambient fill in dB (default: -40 dB)
            
        Returns:
            Dict with gap detection and filling results:
                - filled_samples: np.ndarray with gaps filled
                - gaps_detected: List of detected gaps
                - gaps_filled: int (number of gaps filled)
                - total_gap_duration: float (seconds)
                - gap_percentage: float (percentage of timeline)
                - sample_rate: int
                - duration: float
        """
        samples = timeline.get("samples")
        sample_rate = timeline.get("sample_rate", 44100)
        duration = timeline.get("duration", 0.0)
        
        if samples is None or len(samples) == 0:
            return {
                "error": "Missing or empty audio samples",
                "filled_samples": None,
                "gaps_detected": [],
                "gaps_filled": 0
            }
        
        # Convert to mono if stereo
        if len(samples.shape) > 1:
            samples = np.mean(samples, axis=1)
        
        # Detect gaps using RMS threshold
        gaps = self._detect_silence_gaps(samples, sample_rate, threshold_ms)
        
        # Fill gaps based on method
        filled_samples = samples.copy()
        gaps_filled = 0
        
        if fill_method != "silence" and gaps:
            for gap in gaps:
                if fill_method == "ambient":
                    filled_samples = self._fill_gap_with_ambient(
                        filled_samples,
                        gap,
                        sample_rate,
                        ambient_level_db
                    )
                    gaps_filled += 1
                elif fill_method == "crossfade":
                    filled_samples = self._fill_gap_with_crossfade(
                        filled_samples,
                        gap,
                        sample_rate
                    )
                    gaps_filled += 1
        
        # Calculate statistics
        total_gap_duration = sum(gap["duration"] for gap in gaps)
        gap_percentage = (total_gap_duration / duration * 100) if duration > 0 else 0.0
        
        return {
            "filled_samples": filled_samples,
            "gaps_detected": gaps,
            "gaps_filled": gaps_filled,
            "total_gap_duration": total_gap_duration,
            "gap_percentage": gap_percentage,
            "sample_rate": sample_rate,
            "duration": len(filled_samples) / sample_rate,
            "fill_method": fill_method
        }
    
    def _detect_silence_gaps(
        self,
        samples: np.ndarray,
        sample_rate: int,
        threshold_ms: int,
        rms_threshold: float = 0.01
    ) -> List[Dict[str, Any]]:
        """
        Detect silence gaps in audio using RMS threshold analysis.
        
        Args:
            samples: Audio samples
            sample_rate: Sample rate in Hz
            threshold_ms: Minimum gap duration in milliseconds
            rms_threshold: RMS threshold for silence detection
            
        Returns:
            List of detected gaps with metadata
        """
        gaps = []
        
        # Parameters for analysis
        window_size = int(0.05 * sample_rate)  # 50ms windows
        hop_size = int(0.025 * sample_rate)  # 25ms hop
        threshold_samples = int(threshold_ms / 1000.0 * sample_rate)
        
        in_gap = False
        gap_start = None
        gap_start_sample = None
        
        # Analyze audio in windows
        for i in range(0, len(samples) - window_size, hop_size):
            window = samples[i:i + window_size]
            timestamp = i / sample_rate
            
            # Calculate RMS energy
            rms = np.sqrt(np.mean(window ** 2))
            
            # Detect silence
            is_silent = rms < rms_threshold
            
            if is_silent and not in_gap:
                # Start of gap
                in_gap = True
                gap_start = timestamp
                gap_start_sample = i
            elif not is_silent and in_gap:
                # End of gap
                gap_end = timestamp
                gap_end_sample = i
                gap_duration = gap_end - gap_start
                gap_duration_samples = gap_end_sample - gap_start_sample
                
                # Only record if longer than threshold
                if gap_duration_samples >= threshold_samples:
                    gaps.append({
                        "start_time": gap_start,
                        "end_time": gap_end,
                        "duration": gap_duration,
                        "start_sample": gap_start_sample,
                        "end_sample": gap_end_sample,
                        "type": "silence"
                    })
                
                in_gap = False
                gap_start = None
                gap_start_sample = None
        
        # Handle gap extending to end of audio
        if in_gap and gap_start is not None:
            gap_end = len(samples) / sample_rate
            gap_end_sample = len(samples)
            gap_duration = gap_end - gap_start
            gap_duration_samples = gap_end_sample - gap_start_sample
            
            if gap_duration_samples >= threshold_samples:
                gaps.append({
                    "start_time": gap_start,
                    "end_time": gap_end,
                    "duration": gap_duration,
                    "start_sample": gap_start_sample,
                    "end_sample": gap_end_sample,
                    "type": "silence"
                })
        
        return gaps
    
    def _fill_gap_with_ambient(
        self,
        samples: np.ndarray,
        gap: Dict[str, Any],
        sample_rate: int,
        level_db: float
    ) -> np.ndarray:
        """
        Fill a gap with low-level ambient noise.
        
        Args:
            samples: Audio samples
            gap: Gap metadata dict
            sample_rate: Sample rate in Hz
            level_db: Ambient noise level in dB
            
        Returns:
            Audio samples with gap filled
        """
        start_sample = gap["start_sample"]
        end_sample = gap["end_sample"]
        
        # Generate ambient noise
        gap_length = end_sample - start_sample
        ambient_gain = self._db_to_linear(level_db)
        ambient_noise = np.random.randn(gap_length) * ambient_gain
        
        # Apply fade in/out to avoid clicks
        fade_length = min(int(0.01 * sample_rate), gap_length // 4)  # 10ms or 25% of gap
        
        if fade_length > 0:
            fade_in = np.linspace(0, 1, fade_length)
            fade_out = np.linspace(1, 0, fade_length)
            
            ambient_noise[:fade_length] *= fade_in
            ambient_noise[-fade_length:] *= fade_out
        
        # Fill the gap
        filled_samples = samples.copy()
        filled_samples[start_sample:end_sample] = ambient_noise
        
        return filled_samples
    
    def _fill_gap_with_crossfade(
        self,
        samples: np.ndarray,
        gap: Dict[str, Any],
        sample_rate: int
    ) -> np.ndarray:
        """
        Fill a gap by extending crossfades from surrounding audio.
        
        Args:
            samples: Audio samples
            gap: Gap metadata dict
            sample_rate: Sample rate in Hz
            
        Returns:
            Audio samples with gap filled
        """
        start_sample = gap["start_sample"]
        end_sample = gap["end_sample"]
        gap_length = end_sample - start_sample
        
        # Get audio before and after gap
        before_length = min(gap_length, start_sample)
        after_length = min(gap_length, len(samples) - end_sample)
        
        if before_length == 0 or after_length == 0:
            # Can't crossfade, use ambient instead
            return self._fill_gap_with_ambient(samples, gap, sample_rate, -40.0)
        
        before_audio = samples[start_sample - before_length:start_sample]
        after_audio = samples[end_sample:end_sample + after_length]
        
        # Create crossfade
        crossfade_length = min(before_length, after_length, gap_length)
        t = np.linspace(0, 1, crossfade_length)
        
        # Equal-power crossfade
        fade_out = np.cos(t * np.pi / 2)
        fade_in = np.sin(t * np.pi / 2)
        
        crossfade = (before_audio[-crossfade_length:] * fade_out +
                    after_audio[:crossfade_length] * fade_in)
        
        # Fill the gap
        filled_samples = samples.copy()
        
        # Place crossfade in the middle of the gap
        gap_center = (start_sample + end_sample) // 2
        crossfade_start = gap_center - crossfade_length // 2
        crossfade_end = crossfade_start + crossfade_length
        
        # Ensure we don't go out of bounds
        crossfade_start = max(start_sample, crossfade_start)
        crossfade_end = min(end_sample, crossfade_end)
        actual_length = crossfade_end - crossfade_start
        
        filled_samples[crossfade_start:crossfade_end] = crossfade[:actual_length]
        
        return filled_samples
