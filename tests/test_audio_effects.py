#!/usr/bin/env python3
"""
Test suite for audio modification effects.

This module provides comprehensive unit tests for all audio effects
implemented in the AudioModificationEngine.
"""

import numpy as np
import pytest
from src.audio_modification_engine import AudioModificationEngine


class TestAudioEffects:
    """Test suite for audio effects functionality."""
    
    def setup_method(self):
        """Setup test fixtures."""
        self.engine = AudioModificationEngine(sample_rate=44100)
        
        # Create test audio (sine wave)
        self.duration = 1.0
        self.t = np.linspace(0, self.duration, int(self.duration * 44100))
        self.frequency = 440  # A4 note
        self.test_audio = 0.5 * np.sin(2 * np.pi * self.frequency * self.t)
        
    def test_gain_application(self):
        """Test gain adjustment functionality."""
        # Test positive gain
        result = self.engine.apply_gain(self.test_audio, 6.0)
        assert len(result) == len(self.test_audio)
        assert np.max(np.abs(result)) > np.max(np.abs(self.test_audio))
        
        # Test negative gain
        result = self.engine.apply_gain(self.test_audio, -6.0)
        assert len(result) == len(self.test_audio)
        assert np.max(np.abs(result)) < np.max(np.abs(self.test_audio))
        
        # Test zero gain
        result = self.engine.apply_gain(self.test_audio, 0.0)
        np.testing.assert_array_almost_equal(result, self.test_audio)
        
    def test_equalization(self):
        """Test 3-band equalization."""
        result = self.engine.apply_equalization(
            self.test_audio,
            low_gain=6.0, mid_gain=-3.0, high_gain=3.0
        )
        assert len(result) == len(self.test_audio)
        assert not np.array_equal(result, self.test_audio)
        
    def test_compression(self):
        """Test dynamic range compression."""
        # Create audio with varying levels
        loud_audio = self.test_audio * 0.8
        quiet_audio = self.test_audio * 0.1
        combined = np.concatenate([loud_audio, quiet_audio])
        
        result = self.engine.apply_compression(
            combined,
            threshold_db=-20.0,
            ratio=4.0,
            attack_time=0.01,
            release_time=0.1
        )
        
        assert len(result) == len(combined)
        # Compression should reduce dynamic range
        loud_part = result[:len(loud_audio)]
        quiet_part = result[len(loud_audio):]
        assert np.max(np.abs(loud_part)) < np.max(np.abs(loud_audio))
        assert np.max(np.abs(quiet_part)) > np.max(np.abs(quiet_audio))
        
    def test_reverb(self):
        """Test reverb effect."""
        result = self.engine.apply_reverb(
            self.test_audio,
            room_size=0.5,
            damping=0.5,
            wet_level=0.3,
            dry_level=0.7
        )
        assert len(result) == len(self.test_audio)
        assert not np.array_equal(result, self.test_audio)
        
    def test_fade_in_out(self):
        """Test fade in and fade out effects."""
        # Test fade in
        result = self.engine.apply_fade_in(self.test_audio, 0.2, 'linear')
        assert len(result) == len(self.test_audio)
        assert np.all(result[:100] == 0)  # First samples should be zero
        
        # Test fade out
        result = self.engine.apply_fade_out(self.test_audio, 0.2, 'linear')
        assert len(result) == len(self.test_audio)
        assert np.all(result[-100:] == 0)  # Last samples should be zero
        
    def test_normalization(self):
        """Test audio normalization."""
        quiet_audio = self.test_audio * 0.1
        result = self.engine.normalize_audio(quiet_audio, target_peak=0.95)
        
        assert len(result) == len(quiet_audio)
        assert np.max(np.abs(result)) <= 0.95
        assert np.max(np.abs(result)) > np.max(np.abs(quiet_audio))
        
    def test_filter_effects(self):
        """Test various filter effects."""
        # Test low pass filter
        result = self.engine.apply_low_pass_filter(self.test_audio, 1000)
        assert len(result) == len(self.test_audio)
        
        # Test high pass filter
        result = self.engine.apply_high_pass_filter(self.test_audio, 500)
        assert len(result) == len(self.test_audio)
        
        # Test band pass filter
        result = self.engine.apply_band_pass_filter(self.test_audio, 300, 2000)
        assert len(result) == len(self.test_audio)
        
    def test_effect_chain(self):
        """Test effect chaining functionality."""
        chain = [
            {'type': 'gain', 'gain_db': 3.0},
            {'type': 'compression', 'threshold_db': -18.0, 'ratio': 3.0},
            {'type': 'reverb', 'room_size': 0.3, 'wet_level': 0.2},
            {'type': 'normalize'}
        ]
        
        result = self.engine.apply_effect_chain(self.test_audio, chain)
        assert len(result) == len(self.test_audio)
        assert np.max(np.abs(result)) <= 1.0  # Should be normalized
        
    def test_dc_correction(self):
        """Test DC offset removal."""
        # Add DC offset
        audio_with_offset = self.test_audio + 0.1
        result = self.engine.apply_dc_correction(audio_with_offset)
        
        assert len(result) == len(audio_with_offset)
        assert abs(np.mean(result)) < 0.01  # DC offset should be removed
        
    def test_inversion(self):
        """Test audio inversion."""
        result = self.engine.invert_audio(self.test_audio)
        expected = -self.test_audio
        np.testing.assert_array_almost_equal(result, expected)
        
    def test_amplification(self):
        """Test linear amplification."""
        result = self.engine.apply_amplification(self.test_audio, 2.0)
        expected = self.test_audio * 2.0
        np.testing.assert_array_almost_equal(result, expected)
        
    def test_noise_reduction(self):
        """Test noise reduction."""
        # Add some noise
        noisy_audio = self.test_audio + np.random.normal(0, 0.05, len(self.test_audio))
        result = self.engine.apply_noise_reduction(noisy_audio, reduction_db=-15.0)
        
        assert len(result) == len(noisy_audio)
        # Noise should be reduced (simplified check)
        assert np.std(result) < np.std(noisy_audio)
        
    def test_clicks_pops_removal(self):
        """Test clicks and pops removal."""
        # Add some clicks
        audio_with_clicks = self.test_audio.copy()
        audio_with_clicks[1000] = 0.9  # Add a click
        audio_with_clicks[5000] = -0.8  # Add another click
        
        result = self.engine.remove_clicks_pops(audio_with_clicks, threshold=0.7)
        
        assert len(result) == len(audio_with_clicks)
        # Clicks should be removed or reduced
        assert abs(result[1000]) < 0.5
        assert abs(result[5000]) < 0.5
        
    def test_pitch_shift(self):
        """Test pitch shifting."""
        result = self.engine.apply_pitch_shift(self.test_audio, semitones=2.0)
        assert len(result) == len(self.test_audio)
        assert not np.array_equal(result, self.test_audio)
        
    def test_vibrato(self):
        """Test vibrato effect."""
        result = self.engine.apply_vibrato(
            self.test_audio,
            rate=5.0,
            depth=0.5,
            wet_level=0.5,
            dry_level=0.5
        )
        assert len(result) == len(self.test_audio)
        assert not np.array_equal(result, self.test_audio)
        
    def test_tremolo(self):
        """Test tremolo effect."""
        result = self.engine.apply_tremolo(
            self.test_audio,
            rate=5.0,
            depth=0.5,
            shape='sine',
            wet_level=0.5,
            dry_level=0.5
        )
        assert len(result) == len(self.test_audio)
        assert not np.array_equal(result, self.test_audio)
        
    def test_distortion(self):
        """Test distortion effect."""
        result = self.engine.apply_distortion(
            self.test_audio,
            drive=3.0,
            tone=0.5,
            wet_level=0.5,
            dry_level=0.5
        )
        assert len(result) == len(self.test_audio)
        assert not np.array_equal(result, self.test_audio)
        
    def test_chorus(self):
        """Test chorus effect."""
        result = self.engine.apply_chorus(
            self.test_audio,
            rate=0.25,
            depth=0.5,
            delay_time=0.025,
            wet_level=0.3,
            dry_level=0.7
        )
        assert len(result) == len(self.test_audio)
        assert not np.array_equal(result, self.test_audio)
        
    def test_wah_wah(self):
        """Test wah-wah effect."""
        result = self.engine.apply_wah_wah(
            self.test_audio,
            rate=2.0,
            depth=0.7,
            resonance=2.0,
            wet_level=0.5,
            dry_level=0.5
        )
        assert len(result) == len(self.test_audio)
        assert not np.array_equal(result, self.test_audio)
        
    def test_phaser(self):
        """Test phaser effect."""
        result = self.engine.apply_phaser(
            self.test_audio,
            rate=0.5,
            depth=0.7,
            feedback=0.7,
            wet_level=0.5,
            dry_level=0.5
        )
        assert len(result) == len(self.test_audio)
        assert not np.array_equal(result, self.test_audio)
        
    def test_delay(self):
        """Test delay effect."""
        result = self.engine.apply_delay(
            self.test_audio,
            delay_time=0.3,
            feedback=0.4,
            wet_level=0.3,
            dry_level=0.7
        )
        assert len(result) == len(self.test_audio)
        assert not np.array_equal(result, self.test_audio)
        
    def test_limiter(self):
        """Test limiter effect."""
        # Create audio with peaks
        loud_audio = self.test_audio * 1.5  # This will clip
        result = self.engine.apply_limiter(loud_audio, threshold_db=-6.0)
        
        assert len(result) == len(loud_audio)
        assert np.max(np.abs(result)) <= 1.0  # Should be limited
        
    def test_speed_change(self):
        """Test speed change without pitch shift."""
        result = self.engine.change_speed(self.test_audio, speed_ratio=1.5)
        assert len(result) == len(self.test_audio)
        assert not np.array_equal(result, self.test_audio)
        
    def test_doppler_effect(self):
        """Test Doppler effect."""
        result = self.engine.apply_doppler_effect(
            self.test_audio,
            speed=10.0,
            direction='approaching'
        )
        assert len(result) == len(self.test_audio)
        assert not np.array_equal(result, self.test_audio)
        
    def test_voice_modification(self):
        """Test voice modification."""
        result = self.engine.modify_voice(
            self.test_audio,
            pitch_shift=2.0,
            formant_shift=0.5,
            gender_change=False
        )
        assert len(result) == len(self.test_audio)
        assert not np.array_equal(result, self.test_audio)
        
    def test_auto_tune(self):
        """Test auto-tune effect."""
        result = self.engine.apply_auto_tune(
            self.test_audio,
            key='C',
            scale='major',
            correction_speed=0.5,
            retune_amount=1.0
        )
        assert len(result) == len(self.test_audio)
        # Auto-tune should modify the audio
        assert not np.array_equal(result, self.test_audio)
        
    def test_channel_operations(self):
        """Test stereo channel operations."""
        # Create stereo audio
        stereo_audio = np.column_stack([self.test_audio, self.test_audio * 0.8])
        
        # Test channel swap
        result = self.engine.swap_channels(stereo_audio)
        assert result.shape == stereo_audio.shape
        np.testing.assert_array_almost_equal(result[:, 0], stereo_audio[:, 1])
        np.testing.assert_array_almost_equal(result[:, 1], stereo_audio[:, 0])
        
        # Test channel inversion
        result = self.engine.invert_channels(stereo_audio)
        expected = -stereo_audio
        np.testing.assert_array_almost_equal(result, expected)
        
    def test_edge_cases(self):
        """Test edge cases and error handling."""
        # Test empty audio
        empty_audio = np.array([])
        result = self.engine.apply_gain(empty_audio, 6.0)
        assert len(result) == 0
        
        # Test very short audio
        short_audio = np.array([0.1, -0.1, 0.2])
        result = self.engine.apply_gain(short_audio, 3.0)
        assert len(result) == len(short_audio)
        
        # Test with different sample types
        int_audio = (self.test_audio * 32767).astype(np.int16)
        result = self.engine.apply_gain(int_audio, -3.0)
        assert len(result) == len(int_audio)
        
    def test_parameter_validation(self):
        """Test parameter validation."""
        # Test extreme gain values
        result = self.engine.apply_gain(self.test_audio, 100.0)
        assert not np.isnan(result).any()
        
        result = self.engine.apply_gain(self.test_audio, -100.0)
        assert not np.isnan(result).any()
        
        # Test extreme filter frequencies
        result = self.engine.apply_low_pass_filter(self.test_audio, 10)
        assert len(result) == len(self.test_audio)
        
        result = self.engine.apply_high_pass_filter(self.test_audio, 20000)
        assert len(result) == len(self.test_audio)
        
    def test_performance(self):
        """Test performance of effects."""
        import time
        
        # Create longer audio for performance testing
        long_audio = np.tile(self.test_audio, 10)  # 10 seconds
        
        start_time = time.time()
        result = self.engine.apply_gain(long_audio, 3.0)
        gain_time = time.time() - start_time
        
        start_time = time.time()
        result = self.engine.apply_compression(long_audio)
        compression_time = time.time() - start_time
        
        start_time = time.time()
        result = self.engine.apply_reverb(long_audio)
        reverb_time = time.time() - start_time
        
        print(f"\nPerformance metrics:")
        print(f"Gain processing: {gain_time:.4f}s for 10s audio")
        print(f"Compression processing: {compression_time:.4f}s for 10s audio")
        print(f"Reverb processing: {reverb_time:.4f}s for 10s audio")
        
        # Effects should process in reasonable time
        assert gain_time < 1.0  # Should be very fast
        assert compression_time < 5.0  # Should be reasonably fast
        assert reverb_time < 10.0  # Reverb can be slower


def run_all_tests():
    """Run all tests and report results."""
    print("Running Audio Effects Test Suite...")
    print("=" * 60)
    
    # Create test instance
    test_suite = TestAudioEffects()
    test_suite.setup_method()
    
    # Run all test methods
    test_methods = [method for method in dir(test_suite) if method.startswith('test_')]
    
    passed = 0
    failed = 0
    
    for method_name in test_methods:
        try:
            method = getattr(test_suite, method_name)
            method()
            print(f"✓ {method_name}")
            passed += 1
        except Exception as e:
            print(f"✗ {method_name}: {e}")
            failed += 1
    
    print("=" * 60)
    print(f"Test Results: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All tests passed!")
        return True
    else:
        print("❌ Some tests failed!")
        return False


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)