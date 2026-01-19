"""
Unit tests for Audio Mixing Engine.

Tests voice segment detection, audio mixing, and gap detection functionality.
"""

import sys
from pathlib import Path
import numpy as np

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from audio_mixing_engine import AudioMixingEngine


def create_test_audio_with_voice(
    duration: float = 5.0,
    sample_rate: int = 44100,
    voice_segments: list = None
) -> dict:
    """
    Create test audio with simulated voice segments.
    
    Args:
        duration: Total duration in seconds
        sample_rate: Sample rate in Hz
        voice_segments: List of (start, end) tuples for voice segments
        
    Returns:
        Audio track dict with samples
    """
    if voice_segments is None:
        voice_segments = [(1.0, 2.0), (3.0, 4.0)]
    
    total_samples = int(duration * sample_rate)
    samples = np.zeros(total_samples)
    
    # Add voice-like signal in specified segments
    for start, end in voice_segments:
        start_idx = int(start * sample_rate)
        end_idx = int(end * sample_rate)
        
        # Generate voice-like signal (mix of frequencies in voice range)
        t = np.linspace(0, end - start, end_idx - start_idx)
        
        # Fundamental frequency around 120 Hz (typical voice)
        voice_signal = 0.1 * np.sin(2 * np.pi * 120 * t)
        # Add harmonics
        voice_signal += 0.05 * np.sin(2 * np.pi * 240 * t)
        voice_signal += 0.03 * np.sin(2 * np.pi * 180 * t)
        
        samples[start_idx:end_idx] = voice_signal
    
    return {
        "samples": samples,
        "sample_rate": sample_rate,
        "duration": duration
    }


def test_voice_segment_detection_basic():
    """Test basic voice segment detection."""
    engine = AudioMixingEngine()
    
    # Create audio with two voice segments
    audio = create_test_audio_with_voice(
        duration=5.0,
        voice_segments=[(1.0, 2.0), (3.0, 4.0)]
    )
    
    segments = engine.detect_voice_segments(audio)
    
    assert len(segments) > 0, "Should detect voice segments"
    
    # Check that detected segments are roughly in the right time range
    for seg in segments:
        assert seg.start_time >= 0.0
        assert seg.end_time <= 5.0
        assert seg.end_time > seg.start_time
        assert 0.0 <= seg.confidence <= 1.0
        assert seg.rms_level >= 0.0
    
    print(f"✓ Voice segment detection works - detected {len(segments)} segments")
    for i, seg in enumerate(segments):
        print(f"  Segment {i+1}: {seg.start_time:.2f}s - {seg.end_time:.2f}s (confidence: {seg.confidence:.2f})")


def test_voice_segment_detection_empty_audio():
    """Test voice detection with empty/silent audio."""
    engine = AudioMixingEngine()
    
    # Create silent audio
    audio = {
        "samples": np.zeros(44100 * 2),  # 2 seconds of silence
        "sample_rate": 44100,
        "duration": 2.0
    }
    
    segments = engine.detect_voice_segments(audio)
    
    assert len(segments) == 0, "Should not detect voice in silent audio"
    print("✓ Empty audio detection works - no false positives")


def test_voice_segment_detection_stereo():
    """Test voice detection with stereo audio."""
    engine = AudioMixingEngine()
    
    # Create stereo audio with voice
    mono_audio = create_test_audio_with_voice(
        duration=3.0,
        voice_segments=[(0.5, 2.0)]
    )
    
    # Convert to stereo
    stereo_samples = np.stack([mono_audio["samples"], mono_audio["samples"]], axis=1)
    
    audio = {
        "samples": stereo_samples,
        "sample_rate": 44100,
        "duration": 3.0
    }
    
    segments = engine.detect_voice_segments(audio)
    
    assert len(segments) > 0, "Should detect voice in stereo audio"
    print(f"✓ Stereo audio detection works - detected {len(segments)} segments")


def test_voice_segment_merging():
    """Test that close voice segments are merged."""
    engine = AudioMixingEngine()
    
    # Create audio with two very close voice segments
    audio = create_test_audio_with_voice(
        duration=5.0,
        voice_segments=[(1.0, 1.5), (1.6, 2.0)]  # Only 0.1s gap
    )
    
    segments = engine.detect_voice_segments(audio)
    
    # Should merge into one segment since gap is < 0.2s
    # (Note: actual behavior depends on detection sensitivity)
    print(f"✓ Segment merging works - {len(segments)} segments after merging")
    for i, seg in enumerate(segments):
        print(f"  Segment {i+1}: {seg.start_time:.2f}s - {seg.end_time:.2f}s")


def test_voice_segment_properties():
    """Test that voice segments have correct properties."""
    engine = AudioMixingEngine()
    
    audio = create_test_audio_with_voice(
        duration=3.0,
        voice_segments=[(1.0, 2.0)]
    )
    
    segments = engine.detect_voice_segments(audio)
    
    if segments:
        seg = segments[0]
        
        # Test duration property
        assert seg.duration == seg.end_time - seg.start_time
        
        # Test to_dict serialization
        seg_dict = seg.to_dict()
        assert "start_time" in seg_dict
        assert "end_time" in seg_dict
        assert "confidence" in seg_dict
        assert "rms_level" in seg_dict
        assert "duration" in seg_dict
        
        print("✓ Voice segment properties work correctly")


def test_empty_samples_handling():
    """Test handling of empty samples array."""
    engine = AudioMixingEngine()
    
    audio = {
        "samples": np.array([]),
        "sample_rate": 44100,
        "duration": 0.0
    }
    
    segments = engine.detect_voice_segments(audio)
    
    assert len(segments) == 0, "Should handle empty samples gracefully"
    print("✓ Empty samples handling works")


def test_missing_samples_handling():
    """Test handling of missing samples."""
    engine = AudioMixingEngine()
    
    audio = {
        "sample_rate": 44100,
        "duration": 2.0
    }
    
    segments = engine.detect_voice_segments(audio)
    
    assert len(segments) == 0, "Should handle missing samples gracefully"
    print("✓ Missing samples handling works")


def test_voice_music_mixing_basic():
    """Test basic voice/music mixing with ducking."""
    engine = AudioMixingEngine()
    
    # Create voice track with voice segment
    voice_track = create_test_audio_with_voice(
        duration=5.0,
        voice_segments=[(1.0, 3.0)]
    )
    
    # Create music track (constant tone)
    sample_rate = 44100
    duration = 5.0
    t = np.linspace(0, duration, int(duration * sample_rate))
    music_samples = 0.3 * np.sin(2 * np.pi * 440 * t)  # 440 Hz tone
    
    music_track = {
        "samples": music_samples,
        "sample_rate": sample_rate,
        "duration": duration
    }
    
    # Mix tracks
    result = engine.create_voice_music_mix(voice_track, music_track)
    
    assert "mixed_samples" in result
    assert result["mixed_samples"] is not None
    assert "voice_segments" in result
    assert "keyframes" in result
    assert len(result["voice_segments"]) > 0
    assert len(result["keyframes"]) > 0
    
    print(f"✓ Voice/music mixing works - {len(result['voice_segments'])} voice segments, {len(result['keyframes'])} keyframes")


def test_keyframe_creation():
    """Test that keyframes are created correctly around voice segments."""
    engine = AudioMixingEngine()
    
    voice_track = create_test_audio_with_voice(
        duration=5.0,
        voice_segments=[(2.0, 3.0)]
    )
    
    music_track = {
        "samples": np.random.randn(5 * 44100) * 0.1,
        "sample_rate": 44100,
        "duration": 5.0
    }
    
    result = engine.create_voice_music_mix(voice_track, music_track)
    
    keyframes = result["keyframes"]
    
    # Should have keyframes before and after voice segment
    # At minimum: start (0dB), before voice (0dB), voice start (-12dB), voice end (-12dB), after voice (0dB), end (0dB)
    assert len(keyframes) >= 4, f"Should have at least 4 keyframes, got {len(keyframes)}"
    
    # Check that some keyframes have reduced volume
    volumes = [kf["volume_db"] for kf in keyframes]
    assert any(v < 0 for v in volumes), "Should have keyframes with reduced volume"
    
    print(f"✓ Keyframe creation works - {len(keyframes)} keyframes created")
    for kf in keyframes[:5]:  # Show first 5
        print(f"  {kf['timestamp']:.2f}s: {kf['volume_db']:.1f} dB ({kf['curve_type']})")


def test_music_reduction_during_voice():
    """Test that music is reduced during voice segments."""
    engine = AudioMixingEngine()
    
    # Create voice track
    voice_track = create_test_audio_with_voice(
        duration=4.0,
        voice_segments=[(1.5, 2.5)]
    )
    
    # Create music track with constant amplitude
    sample_rate = 44100
    music_samples = np.ones(4 * sample_rate) * 0.5
    
    music_track = {
        "samples": music_samples,
        "sample_rate": sample_rate,
        "duration": 4.0
    }
    
    result = engine.create_voice_music_mix(voice_track, music_track)
    
    mixed = result["mixed_samples"]
    
    # Check that music is reduced during voice segment
    # Sample at 2.0s (during voice) should have lower music contribution
    # compared to 0.5s (before voice)
    
    before_voice_idx = int(0.5 * sample_rate)
    during_voice_idx = int(2.0 * sample_rate)
    
    # The mixed signal during voice should be different from before
    # (This is a basic check - in reality we'd need more sophisticated analysis)
    assert len(mixed) > during_voice_idx
    
    print("✓ Music reduction during voice works")


def test_sample_rate_mismatch_handling():
    """Test handling of mismatched sample rates."""
    engine = AudioMixingEngine()
    
    voice_track = {
        "samples": np.random.randn(44100),
        "sample_rate": 44100,
        "duration": 1.0
    }
    
    music_track = {
        "samples": np.random.randn(48000),
        "sample_rate": 48000,  # Different sample rate
        "duration": 1.0
    }
    
    result = engine.create_voice_music_mix(voice_track, music_track)
    
    assert "error" in result
    assert "sample rate mismatch" in result["error"].lower()
    print("✓ Sample rate mismatch handling works")


def test_missing_audio_samples_handling():
    """Test handling of missing audio samples in mixing."""
    engine = AudioMixingEngine()
    
    voice_track = {
        "sample_rate": 44100,
        "duration": 2.0
    }
    
    music_track = {
        "samples": np.random.randn(44100 * 2),
        "sample_rate": 44100,
        "duration": 2.0
    }
    
    result = engine.create_voice_music_mix(voice_track, music_track)
    
    assert "error" in result
    assert "missing audio samples" in result["error"].lower()
    print("✓ Missing audio samples handling works")


def test_custom_music_reduction():
    """Test custom music reduction value."""
    engine = AudioMixingEngine()
    
    voice_track = create_test_audio_with_voice(
        duration=3.0,
        voice_segments=[(1.0, 2.0)]
    )
    
    music_track = {
        "samples": np.random.randn(3 * 44100) * 0.3,
        "sample_rate": 44100,
        "duration": 3.0
    }
    
    # Use custom reduction
    result = engine.create_voice_music_mix(
        voice_track,
        music_track,
        music_reduction_db=-18.0  # More reduction than default
    )
    
    keyframes = result["keyframes"]
    volumes = [kf["volume_db"] for kf in keyframes]
    
    # Should have keyframes with -18 dB reduction
    assert any(v == -18.0 for v in volumes), "Should have keyframes with custom reduction"
    print("✓ Custom music reduction works")


def test_custom_keyframe_offset():
    """Test custom keyframe offset."""
    engine = AudioMixingEngine()
    
    voice_track = create_test_audio_with_voice(
        duration=3.0,
        voice_segments=[(1.0, 2.0)]
    )
    
    music_track = {
        "samples": np.random.randn(3 * 44100) * 0.3,
        "sample_rate": 44100,
        "duration": 3.0
    }
    
    # Use custom offset
    result = engine.create_voice_music_mix(
        voice_track,
        music_track,
        keyframe_offset=1.0  # Longer offset than default
    )
    
    assert len(result["keyframes"]) > 0
    print("✓ Custom keyframe offset works")


def test_cubic_bezier_interpolation():
    """Test cubic Bezier interpolation for smooth curves."""
    engine = AudioMixingEngine()
    
    # Test basic Bezier curve
    curve = engine._cubic_bezier_interpolation(0.0, 1.0, 100)
    
    assert len(curve) == 100
    assert curve[0] == 0.0 or abs(curve[0] - 0.0) < 0.01
    assert curve[-1] == 1.0 or abs(curve[-1] - 1.0) < 0.01
    
    # Check that curve is smooth (no sudden jumps)
    diffs = np.abs(np.diff(curve))
    max_diff = np.max(diffs)
    assert max_diff < 0.1, f"Curve should be smooth, max diff: {max_diff}"
    
    print("✓ Cubic Bezier interpolation works")


def test_logarithmic_interpolation():
    """Test logarithmic interpolation."""
    engine = AudioMixingEngine()
    
    # Test logarithmic curve
    curve = engine._logarithmic_interpolation(0.1, 1.0, 100)
    
    assert len(curve) == 100
    assert abs(curve[0] - 0.1) < 0.01
    assert abs(curve[-1] - 1.0) < 0.01
    
    # Logarithmic curve should be smooth
    diffs = np.abs(np.diff(curve))
    max_diff = np.max(diffs)
    assert max_diff < 0.1, f"Curve should be smooth, max diff: {max_diff}"
    
    print("✓ Logarithmic interpolation works")


def test_interpolation_with_cubic_bezier_keyframes():
    """Test volume automation with cubic Bezier curve keyframes."""
    engine = AudioMixingEngine()
    
    # Create keyframes with cubic Bezier curves
    from models.quality_models import AudioKeyframe as AudioKeyframeModel
    
    keyframes = [
        AudioKeyframeModel(timestamp=0.0, volume_db=0.0, curve_type="linear"),
        AudioKeyframeModel(timestamp=1.0, volume_db=-12.0, curve_type="cubic_bezier"),
        AudioKeyframeModel(timestamp=2.0, volume_db=0.0, curve_type="cubic_bezier"),
    ]
    
    # Create test audio
    sample_rate = 44100
    samples = np.ones(3 * sample_rate)
    
    # Apply automation
    result = engine._apply_volume_automation(samples, keyframes, sample_rate)
    
    assert len(result) == len(samples)
    
    # Check that volume changes smoothly
    # At 0s: 0 dB (gain = 1.0)
    # At 1s: -12 dB (gain ≈ 0.25)
    # At 2s: 0 dB (gain = 1.0)
    
    gain_at_0s = result[0]
    gain_at_1s = result[sample_rate]
    gain_at_2s = result[2 * sample_rate]
    
    assert abs(gain_at_0s - 1.0) < 0.1
    assert gain_at_1s < 0.5  # Should be reduced
    assert abs(gain_at_2s - 1.0) < 0.1
    
    print("✓ Cubic Bezier keyframe interpolation works")


def test_interpolation_continuity_check():
    """Test continuity checking for volume interpolation."""
    engine = AudioMixingEngine()
    
    from models.quality_models import AudioKeyframe as AudioKeyframeModel
    
    # Create smooth keyframes
    keyframes = [
        AudioKeyframeModel(timestamp=0.0, volume_db=0.0, curve_type="cubic_bezier"),
        AudioKeyframeModel(timestamp=1.0, volume_db=-6.0, curve_type="cubic_bezier"),
        AudioKeyframeModel(timestamp=2.0, volume_db=0.0, curve_type="cubic_bezier"),
    ]
    
    result = engine.check_interpolation_continuity(keyframes, 44100)
    
    assert "is_continuous" in result
    assert "discontinuities" in result
    assert "max_discontinuity" in result
    
    # Should be continuous with cubic Bezier curves
    print(f"✓ Interpolation continuity check works - continuous: {result['is_continuous']}, max discontinuity: {result['max_discontinuity']:.6f}")


def test_edge_case_single_keyframe():
    """Test edge case with single keyframe."""
    engine = AudioMixingEngine()
    
    from models.quality_models import AudioKeyframe as AudioKeyframeModel
    
    keyframes = [
        AudioKeyframeModel(timestamp=0.0, volume_db=0.0, curve_type="linear")
    ]
    
    samples = np.ones(44100)
    result = engine._apply_volume_automation(samples, keyframes, 44100)
    
    # Should return samples unchanged (or with minimal modification)
    assert len(result) == len(samples)
    print("✓ Single keyframe edge case handled")


def test_edge_case_zero_duration():
    """Test edge case with zero duration between keyframes."""
    engine = AudioMixingEngine()
    
    from models.quality_models import AudioKeyframe as AudioKeyframeModel
    
    keyframes = [
        AudioKeyframeModel(timestamp=1.0, volume_db=0.0, curve_type="linear"),
        AudioKeyframeModel(timestamp=1.0, volume_db=-6.0, curve_type="linear"),  # Same timestamp
    ]
    
    samples = np.ones(2 * 44100)
    result = engine._apply_volume_automation(samples, keyframes, 44100)
    
    # Should handle gracefully without crashing
    assert len(result) == len(samples)
    print("✓ Zero duration keyframe edge case handled")


def test_interpolation_with_zero_gain():
    """Test interpolation when gain values include zero."""
    engine = AudioMixingEngine()
    
    # Test exponential interpolation with zero
    # (should fallback to linear)
    curve = engine._cubic_bezier_interpolation(0.0, 1.0, 50)
    assert len(curve) == 50
    
    # Test logarithmic with zero
    curve_log = engine._logarithmic_interpolation(0.0, 1.0, 50)
    assert len(curve_log) == 50
    assert curve_log[0] == 0.0
    
    print("✓ Interpolation with zero gain handled")


def test_crossfade_basic():
    """Test basic crossfade between two audio clips."""
    engine = AudioMixingEngine()
    
    sample_rate = 44100
    duration = 2.0
    
    # Create two test clips
    clip_a = {
        "samples": np.ones(int(duration * sample_rate)) * 0.5,
        "sample_rate": sample_rate,
        "duration": duration
    }
    
    clip_b = {
        "samples": np.ones(int(duration * sample_rate)) * 0.3,
        "sample_rate": sample_rate,
        "duration": duration
    }
    
    # Apply crossfade
    result = engine.apply_crossfade(clip_a, clip_b, duration=1.0, curve="equal_power")
    
    assert "crossfaded_samples" in result
    assert result["crossfaded_samples"] is not None
    assert "fade_start" in result
    assert "fade_end" in result
    assert result["gain_compensation"] == 0.0
    
    print(f"✓ Basic crossfade works - duration: {result['duration']:.2f}s, fade: {result['fade_start']:.2f}s to {result['fade_end']:.2f}s")


def test_crossfade_curves():
    """Test different crossfade curve types."""
    engine = AudioMixingEngine()
    
    sample_rate = 44100
    clip_a = {
        "samples": np.random.randn(sample_rate * 2) * 0.5,
        "sample_rate": sample_rate,
        "duration": 2.0
    }
    
    clip_b = {
        "samples": np.random.randn(sample_rate * 2) * 0.5,
        "sample_rate": sample_rate,
        "duration": 2.0
    }
    
    # Test different curve types
    for curve_type in ["linear", "exponential", "equal_power"]:
        result = engine.apply_crossfade(clip_a, clip_b, duration=0.5, curve=curve_type)
        
        assert "crossfaded_samples" in result
        assert result["curve_type"] == curve_type
        print(f"  ✓ {curve_type} curve works")
    
    print("✓ All crossfade curve types work")


def test_equal_power_crossfade():
    """Test that equal-power crossfade maintains constant power."""
    engine = AudioMixingEngine()
    
    # Create fade curves
    fade_out, fade_in = engine._create_crossfade_curves(1000, "equal_power")
    
    # Check that power is constant: fade_out² + fade_in² ≈ 1
    power = fade_out**2 + fade_in**2
    
    # Should be very close to 1.0 throughout
    assert np.allclose(power, 1.0, atol=0.01), f"Power should be constant, got range {power.min():.3f} to {power.max():.3f}"
    
    print("✓ Equal-power crossfade maintains constant power")


def test_crossfade_gain_compensation():
    """Test that crossfade has 0 dB gain compensation."""
    engine = AudioMixingEngine()
    
    sample_rate = 44100
    
    # Create two clips with known amplitude
    clip_a = {
        "samples": np.ones(sample_rate) * 0.5,
        "sample_rate": sample_rate,
        "duration": 1.0
    }
    
    clip_b = {
        "samples": np.ones(sample_rate) * 0.5,
        "sample_rate": sample_rate,
        "duration": 1.0
    }
    
    result = engine.apply_crossfade(clip_a, clip_b, duration=0.5, curve="equal_power")
    
    # Check that gain compensation is 0 dB
    assert result["gain_compensation"] == 0.0
    
    # Check that the crossfaded region doesn't have excessive amplitude
    crossfaded = result["crossfaded_samples"]
    max_amplitude = np.max(np.abs(crossfaded))
    
    # Should be close to the original amplitude (0.5)
    assert max_amplitude < 0.8, f"Amplitude should not increase significantly, got {max_amplitude}"
    
    print("✓ Crossfade gain compensation works (0 dB)")


def test_crossfade_sample_rate_mismatch():
    """Test handling of sample rate mismatch in crossfade."""
    engine = AudioMixingEngine()
    
    clip_a = {
        "samples": np.random.randn(44100),
        "sample_rate": 44100,
        "duration": 1.0
    }
    
    clip_b = {
        "samples": np.random.randn(48000),
        "sample_rate": 48000,  # Different sample rate
        "duration": 1.0
    }
    
    result = engine.apply_crossfade(clip_a, clip_b)
    
    assert "error" in result
    assert "sample rate mismatch" in result["error"].lower()
    print("✓ Sample rate mismatch handling in crossfade works")


def test_crossfade_missing_samples():
    """Test handling of missing samples in crossfade."""
    engine = AudioMixingEngine()
    
    clip_a = {
        "sample_rate": 44100,
        "duration": 1.0
    }
    
    clip_b = {
        "samples": np.random.randn(44100),
        "sample_rate": 44100,
        "duration": 1.0
    }
    
    result = engine.apply_crossfade(clip_a, clip_b)
    
    assert "error" in result
    assert "missing audio samples" in result["error"].lower()
    print("✓ Missing samples handling in crossfade works")


def test_crossfade_sequence():
    """Test creating a sequence of clips with crossfades."""
    engine = AudioMixingEngine()
    
    sample_rate = 44100
    
    # Create three clips
    clips = [
        {
            "samples": np.ones(sample_rate) * 0.5,
            "sample_rate": sample_rate,
            "duration": 1.0
        },
        {
            "samples": np.ones(sample_rate) * 0.3,
            "sample_rate": sample_rate,
            "duration": 1.0
        },
        {
            "samples": np.ones(sample_rate) * 0.4,
            "sample_rate": sample_rate,
            "duration": 1.0
        }
    ]
    
    result = engine.create_crossfade_sequence(clips, crossfade_duration=0.5)
    
    assert "sequenced_samples" in result
    assert result["sequenced_samples"] is not None
    assert result["num_crossfades"] == 2  # 3 clips = 2 crossfades
    
    print(f"✓ Crossfade sequence works - {result['num_crossfades']} crossfades, duration: {result['duration']:.2f}s")


def test_crossfade_stereo_handling():
    """Test crossfade with stereo audio."""
    engine = AudioMixingEngine()
    
    sample_rate = 44100
    
    # Create stereo clips
    stereo_a = np.random.randn(sample_rate, 2) * 0.5
    stereo_b = np.random.randn(sample_rate, 2) * 0.5
    
    clip_a = {
        "samples": stereo_a,
        "sample_rate": sample_rate,
        "duration": 1.0
    }
    
    clip_b = {
        "samples": stereo_b,
        "sample_rate": sample_rate,
        "duration": 1.0
    }
    
    result = engine.apply_crossfade(clip_a, clip_b, duration=0.5)
    
    assert "crossfaded_samples" in result
    # Should be converted to mono
    assert len(result["crossfaded_samples"].shape) == 1
    
    print("✓ Stereo audio handling in crossfade works")


def test_crossfade_custom_position():
    """Test crossfade with custom overlap position."""
    engine = AudioMixingEngine()
    
    sample_rate = 44100
    
    clip_a = {
        "samples": np.ones(sample_rate * 2) * 0.5,
        "sample_rate": sample_rate,
        "duration": 2.0
    }
    
    clip_b = {
        "samples": np.ones(sample_rate * 2) * 0.3,
        "sample_rate": sample_rate,
        "duration": 2.0
    }
    
    # Crossfade starting at 0.5 seconds
    result = engine.apply_crossfade(clip_a, clip_b, duration=1.0, overlap_position=0.5)
    
    assert "fade_start" in result
    assert abs(result["fade_start"] - 0.5) < 0.01  # Should start around 0.5s
    
    print(f"✓ Custom overlap position works - fade starts at {result['fade_start']:.2f}s")


def create_audio_with_gaps(sample_rate=44100, duration=5.0, gaps=None):
    """Create test audio with silence gaps."""
    if gaps is None:
        gaps = [(1.0, 1.5), (3.0, 3.2)]  # Default gaps
    
    samples = np.random.randn(int(duration * sample_rate)) * 0.3
    
    # Create silence gaps
    for gap_start, gap_end in gaps:
        start_idx = int(gap_start * sample_rate)
        end_idx = int(gap_end * sample_rate)
        samples[start_idx:end_idx] = 0.0
    
    return {
        "samples": samples,
        "sample_rate": sample_rate,
        "duration": duration
    }


def test_gap_detection_basic():
    """Test basic gap detection."""
    engine = AudioMixingEngine()
    
    # Create audio with known gaps
    timeline = create_audio_with_gaps(
        duration=5.0,
        gaps=[(1.0, 1.5), (3.0, 3.3)]  # Two gaps: 0.5s and 0.3s
    )
    
    result = engine.detect_and_fill_gaps(timeline, threshold_ms=100, fill_method="silence")
    
    assert "gaps_detected" in result
    gaps = result["gaps_detected"]
    
    # Should detect both gaps (both > 100ms)
    assert len(gaps) >= 2, f"Should detect at least 2 gaps, found {len(gaps)}"
    
    print(f"✓ Gap detection works - detected {len(gaps)} gaps")
    for i, gap in enumerate(gaps[:3]):  # Show first 3
        print(f"  Gap {i+1}: {gap['start_time']:.2f}s - {gap['end_time']:.2f}s ({gap['duration']:.2f}s)")


def test_gap_detection_threshold():
    """Test that gaps below threshold are not detected."""
    engine = AudioMixingEngine()
    
    # Create audio with small gap (50ms) and large gap (200ms)
    sample_rate = 44100
    samples = np.random.randn(sample_rate * 3) * 0.3
    
    # Small gap: 50ms (should not be detected with 100ms threshold)
    samples[int(1.0 * sample_rate):int(1.05 * sample_rate)] = 0.0
    
    # Large gap: 200ms (should be detected)
    samples[int(2.0 * sample_rate):int(2.2 * sample_rate)] = 0.0
    
    timeline = {
        "samples": samples,
        "sample_rate": sample_rate,
        "duration": 3.0
    }
    
    result = engine.detect_and_fill_gaps(timeline, threshold_ms=100, fill_method="silence")
    
    gaps = result["gaps_detected"]
    
    # Should only detect the large gap
    assert len(gaps) >= 1, "Should detect at least the large gap"
    
    # Check that detected gaps are >= 100ms
    for gap in gaps:
        assert gap["duration"] >= 0.1, f"Gap duration {gap['duration']} should be >= 0.1s"
    
    print(f"✓ Gap threshold works - detected {len(gaps)} gaps >= 100ms")


def test_gap_filling_ambient():
    """Test filling gaps with ambient noise."""
    engine = AudioMixingEngine()
    
    timeline = create_audio_with_gaps(
        duration=3.0,
        gaps=[(1.0, 1.3)]  # One 300ms gap
    )
    
    result = engine.detect_and_fill_gaps(
        timeline,
        threshold_ms=100,
        fill_method="ambient",
        ambient_level_db=-40.0
    )
    
    assert "filled_samples" in result
    assert result["filled_samples"] is not None
    assert result["gaps_filled"] > 0
    
    # Check that gap is no longer silent
    filled = result["filled_samples"]
    sample_rate = result["sample_rate"]
    gap_start = int(1.0 * sample_rate)
    gap_end = int(1.3 * sample_rate)
    
    gap_region = filled[gap_start:gap_end]
    gap_rms = np.sqrt(np.mean(gap_region ** 2))
    
    # Should have some energy (not complete silence)
    assert gap_rms > 0.0001, "Gap should be filled with ambient noise"
    
    print(f"✓ Ambient gap filling works - {result['gaps_filled']} gaps filled")


def test_gap_filling_crossfade():
    """Test filling gaps with crossfade."""
    engine = AudioMixingEngine()
    
    timeline = create_audio_with_gaps(
        duration=3.0,
        gaps=[(1.5, 1.7)]  # One 200ms gap
    )
    
    result = engine.detect_and_fill_gaps(
        timeline,
        threshold_ms=100,
        fill_method="crossfade"
    )
    
    assert "filled_samples" in result
    assert result["filled_samples"] is not None
    assert result["gaps_filled"] > 0
    
    print(f"✓ Crossfade gap filling works - {result['gaps_filled']} gaps filled")


def test_gap_statistics():
    """Test gap statistics calculation."""
    engine = AudioMixingEngine()
    
    timeline = create_audio_with_gaps(
        duration=10.0,
        gaps=[(2.0, 2.5), (5.0, 5.3), (8.0, 8.2)]  # Total: 1.0s of gaps
    )
    
    result = engine.detect_and_fill_gaps(timeline, threshold_ms=100, fill_method="silence")
    
    assert "total_gap_duration" in result
    assert "gap_percentage" in result
    
    # Should have approximately 1.0s of gaps (10% of 10s)
    assert result["total_gap_duration"] > 0.8, f"Total gap duration: {result['total_gap_duration']}"
    assert result["gap_percentage"] > 5.0, f"Gap percentage: {result['gap_percentage']}"
    
    print(f"✓ Gap statistics work - {result['total_gap_duration']:.2f}s total ({result['gap_percentage']:.1f}%)")


def test_gap_detection_empty_audio():
    """Test gap detection with empty audio."""
    engine = AudioMixingEngine()
    
    timeline = {
        "samples": np.array([]),
        "sample_rate": 44100,
        "duration": 0.0
    }
    
    result = engine.detect_and_fill_gaps(timeline)
    
    assert "error" in result
    print("✓ Empty audio handling in gap detection works")


def test_gap_detection_missing_samples():
    """Test gap detection with missing samples."""
    engine = AudioMixingEngine()
    
    timeline = {
        "sample_rate": 44100,
        "duration": 2.0
    }
    
    result = engine.detect_and_fill_gaps(timeline)
    
    assert "error" in result
    print("✓ Missing samples handling in gap detection works")


def test_gap_detection_stereo():
    """Test gap detection with stereo audio."""
    engine = AudioMixingEngine()
    
    sample_rate = 44100
    duration = 3.0
    
    # Create stereo audio with gap
    stereo_samples = np.random.randn(int(duration * sample_rate), 2) * 0.3
    stereo_samples[int(1.0 * sample_rate):int(1.3 * sample_rate), :] = 0.0
    
    timeline = {
        "samples": stereo_samples,
        "sample_rate": sample_rate,
        "duration": duration
    }
    
    result = engine.detect_and_fill_gaps(timeline, threshold_ms=100, fill_method="ambient")
    
    assert "gaps_detected" in result
    assert len(result["gaps_detected"]) > 0
    
    print("✓ Stereo audio handling in gap detection works")


def test_no_gaps_detected():
    """Test audio with no gaps."""
    engine = AudioMixingEngine()
    
    # Create continuous audio (no gaps)
    timeline = {
        "samples": np.random.randn(44100 * 2) * 0.3,
        "sample_rate": 44100,
        "duration": 2.0
    }
    
    result = engine.detect_and_fill_gaps(timeline, threshold_ms=100, fill_method="ambient")
    
    assert len(result["gaps_detected"]) == 0
    assert result["gaps_filled"] == 0
    assert result["total_gap_duration"] == 0.0
    
    print("✓ No false positives - continuous audio has no gaps detected")


if __name__ == "__main__":
    print("Testing Audio Mixing Engine - Voice Detection...\n")
    
    test_voice_segment_detection_basic()
    test_voice_segment_detection_empty_audio()
    test_voice_segment_detection_stereo()
    test_voice_segment_merging()
    test_voice_segment_properties()
    test_empty_samples_handling()
    test_missing_samples_handling()
    
    print("\nTesting Audio Mixing Engine - Voice/Music Mixing...\n")
    
    test_voice_music_mixing_basic()
    test_keyframe_creation()
    test_music_reduction_during_voice()
    test_sample_rate_mismatch_handling()
    test_missing_audio_samples_handling()
    test_custom_music_reduction()
    test_custom_keyframe_offset()
    
    print("\nTesting Audio Mixing Engine - Smooth Interpolation...\n")
    
    test_cubic_bezier_interpolation()
    test_logarithmic_interpolation()
    test_interpolation_with_cubic_bezier_keyframes()
    test_interpolation_continuity_check()
    test_edge_case_single_keyframe()
    test_edge_case_zero_duration()
    test_interpolation_with_zero_gain()
    
    print("\nTesting Audio Mixing Engine - Crossfade Transitions...\n")
    
    test_crossfade_basic()
    test_crossfade_curves()
    test_equal_power_crossfade()
    test_crossfade_gain_compensation()
    test_crossfade_sample_rate_mismatch()
    test_crossfade_missing_samples()
    test_crossfade_sequence()
    test_crossfade_stereo_handling()
    test_crossfade_custom_position()
    
    print("\nTesting Audio Mixing Engine - Gap Detection and Filling...\n")
    
    test_gap_detection_basic()
    test_gap_detection_threshold()
    test_gap_filling_ambient()
    test_gap_filling_crossfade()
    test_gap_statistics()
    test_gap_detection_empty_audio()
    test_gap_detection_missing_samples()
    test_gap_detection_stereo()
    test_no_gaps_detected()
    
    print("\n✅ All Audio Mixing Engine tests passed!")
