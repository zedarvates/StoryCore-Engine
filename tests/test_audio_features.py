"""
Test suite for audio processing features.

This module contains unit tests for all audio processing functionalities.
"""

import unittest
import numpy as np
from src.audio import (
    LFO, AutoTune, NoiseReduction, Cleaner, Phaser, SpeedChanger,
    Amplifier, WahWah, Vibrato, Tremolo, Distortion, Chorus,
    DopplerEffect, Inverter, VocalReduction, VoiceIsolation,
    ClickPopReduction, NoiseSuppression, VoiceModification,
    HighPassFilter, LowPassFilter, DCOffsetCorrection,
    ChannelSwapper, ChannelInverter, DynamicRangeCompressor
)

class TestAudioFeatures(unittest.TestCase):
    """Test cases for audio processing features."""

    def setUp(self):
        """Set up test fixtures."""
        self.sample_rate = 44100
        self.test_audio = np.random.uniform(-0.5, 0.5, 44100)  # 1 second of audio
        self.stereo_audio = np.array([self.test_audio, self.test_audio])

    def test_lfo(self):
        """Test LFO functionality."""
        lfo = LFO(sample_rate=self.sample_rate, frequency=1.0, waveform='sine')
        
        # Test signal generation
        signal = lfo.generate(1.0)
        self.assertEqual(len(signal), self.sample_rate)
        self.assertTrue(np.all(np.abs(signal) <= 1.0))
        
        # Test frequency modulation
        modulated = lfo.modulate_frequency(self.test_audio, depth=10.0)
        self.assertEqual(len(modulated), len(self.test_audio))
        
        # Test amplitude modulation
        modulated_amp = lfo.modulate_amplitude(self.test_audio, depth=0.5)
        self.assertEqual(len(modulated_amp), len(self.test_audio))

    def test_autotune(self):
        """Test AutoTune functionality."""
        autotune = AutoTune(sample_rate=self.sample_rate, target_notes=[440.0])
        
        # Test pitch detection
        pitches = autotune.detect_pitch(self.test_audio)
        self.assertTrue(len(pitches) > 0)
        
        # Test pitch correction
        corrected = autotune.correct_pitch(self.test_audio, correction_strength=0.5)
        self.assertEqual(len(corrected), len(self.test_audio))

    def test_noise_reduction(self):
        """Test noise reduction functionality."""
        noise_reduction = NoiseReduction(sample_rate=self.sample_rate)
        
        # Test noise gate
        gated = noise_reduction.apply_noise_gate(self.test_audio, threshold=0.01, ratio=2.0)
        self.assertEqual(len(gated), len(self.test_audio))
        
        # Test spectral subtraction
        cleaned = noise_reduction.apply_spectral_subtraction(self.test_audio)
        self.assertEqual(len(cleaned), len(self.test_audio))

    def test_cleaner(self):
        """Test audio cleaner functionality."""
        cleaner = Cleaner(sample_rate=self.sample_rate)
        
        # Test DC offset removal
        cleaned = cleaner.remove_dc_offset(self.test_audio)
        self.assertAlmostEqual(np.mean(cleaned), 0.0, places=5)
        
        # Test bandpass filter
        filtered = cleaner.apply_bandpass_filter(self.test_audio)
        self.assertEqual(len(filtered), len(self.test_audio))
        
        # Test comprehensive cleaning
        comprehensive = cleaner.clean_audio(self.test_audio)
        self.assertEqual(len(comprehensive), len(self.test_audio))

    def test_phaser(self):
        """Test phaser effect functionality."""
        phaser = Phaser(sample_rate=self.sample_rate)
        
        # Test phaser effect
        phased = phaser.apply_phaser(self.test_audio)
        self.assertEqual(len(phased), len(self.test_audio))

    def test_speed_changer(self):
        """Test speed changer functionality."""
        speed_changer = SpeedChanger(sample_rate=self.sample_rate)
        
        # Test speed change
        sped_up = speed_changer.change_speed(self.test_audio, speed_factor=1.5)
        self.assertTrue(len(sped_up) < len(self.test_audio))
        
        # Test speed change with pitch
        modified = speed_changer.change_speed_with_pitch(self.test_audio, speed_factor=1.2, pitch_factor=0.8)
        self.assertTrue(len(modified) < len(self.test_audio))

    def test_amplifier(self):
        """Test amplifier functionality."""
        amplifier = Amplifier(sample_rate=self.sample_rate)
        
        # Test amplification
        amplified = amplifier.amplify(self.test_audio, gain_db=6.0)
        self.assertEqual(len(amplified), len(self.test_audio))
        
        # Test normalization
        normalized = amplifier.normalize(self.test_audio, target_db=-3.0)
        self.assertEqual(len(normalized), len(self.test_audio))

    def test_wah_wah(self):
        """Test wah-wah effect functionality."""
        wah_wah = WahWah(sample_rate=self.sample_rate)
        
        # Test wah-wah effect
        wah_effect = wah_wah.apply_wah_wah(self.test_audio)
        self.assertEqual(len(wah_effect), len(self.test_audio))

    def test_vibrato(self):
        """Test vibrato effect functionality."""
        vibrato = Vibrato(sample_rate=self.sample_rate)
        
        # Test vibrato effect
        vibrato_effect = vibrato.apply_vibrato(self.test_audio)
        self.assertEqual(len(vibrato_effect), len(self.test_audio))

    def test_tremolo(self):
        """Test tremolo effect functionality."""
        tremolo = Tremolo(sample_rate=self.sample_rate)
        
        # Test tremolo effect
        tremolo_effect = tremolo.apply_tremolo(self.test_audio)
        self.assertEqual(len(tremolo_effect), len(self.test_audio))

    def test_distortion(self):
        """Test distortion effect functionality."""
        distortion = Distortion(sample_rate=self.sample_rate)
        
        # Test distortion effect
        distorted = distortion.apply_distortion(self.test_audio)
        self.assertEqual(len(distorted), len(self.test_audio))

    def test_chorus(self):
        """Test chorus effect functionality."""
        chorus = Chorus(sample_rate=self.sample_rate)
        
        # Test chorus effect
        chorus_effect = chorus.apply_chorus(self.test_audio)
        self.assertEqual(len(chorus_effect), len(self.test_audio))

    def test_doppler_effect(self):
        """Test Doppler effect functionality."""
        doppler = DopplerEffect(sample_rate=self.sample_rate)
        
        # Test Doppler effect
        doppler_effect = doppler.apply_doppler_effect(self.test_audio)
        self.assertEqual(len(doppler_effect), len(self.test_audio))

    def test_inverter(self):
        """Test inverter functionality."""
        inverter = Inverter(sample_rate=self.sample_rate)
        
        # Test audio inversion
        inverted = inverter.invert_audio(self.test_audio)
        self.assertEqual(len(inverted), len(self.test_audio))
        
        # Test phase inversion
        phase_inverted = inverter.invert_phase(self.test_audio)
        self.assertEqual(len(phase_inverted), len(self.test_audio))

    def test_vocal_reduction(self):
        """Test vocal reduction functionality."""
        vocal_reduction = VocalReduction(sample_rate=self.sample_rate)
        
        # Test vocal reduction
        reduced = vocal_reduction.apply_vocal_reduction(self.stereo_audio)
        self.assertEqual(reduced.shape, self.stereo_audio.shape)

    def test_voice_isolation(self):
        """Test voice isolation functionality."""
        voice_isolation = VoiceIsolation(sample_rate=self.sample_rate)
        
        # Test voice isolation
        isolated = voice_isolation.apply_voice_isolation(self.stereo_audio)
        self.assertEqual(isolated.shape, self.stereo_audio.shape)

    def test_click_pop_reduction(self):
        """Test click/pop reduction functionality."""
        click_pop = ClickPopReduction(sample_rate=self.sample_rate)
        
        # Test click detection
        clicks = click_pop.detect_clicks(self.test_audio)
        self.assertIsInstance(clicks, list)
        
        # Test click reduction
        reduced = click_pop.apply_click_reduction(self.test_audio)
        self.assertEqual(len(reduced), len(self.test_audio))

    def test_noise_suppression(self):
        """Test noise suppression functionality."""
        noise_suppression = NoiseSuppression(sample_rate=self.sample_rate)
        
        # Test noise suppression
        suppressed = noise_suppression.apply_noise_suppression(self.test_audio)
        self.assertEqual(len(suppressed), len(self.test_audio))

    def test_voice_modification(self):
        """Test voice modification functionality."""
        voice_mod = VoiceModification(sample_rate=self.sample_rate)
        
        # Test voice modification
        modified = voice_mod.modify_voice(self.test_audio, pitch_factor=1.2, formant_factor=0.9)
        self.assertEqual(len(modified), len(self.test_audio))

    def test_high_pass_filter(self):
        """Test high-pass filter functionality."""
        high_pass = HighPassFilter(sample_rate=self.sample_rate)
        
        # Test high-pass filter
        filtered = high_pass.apply_high_pass_filter(self.test_audio)
        self.assertEqual(len(filtered), len(self.test_audio))

    def test_low_pass_filter(self):
        """Test low-pass filter functionality."""
        low_pass = LowPassFilter(sample_rate=self.sample_rate)
        
        # Test low-pass filter
        filtered = low_pass.apply_low_pass_filter(self.test_audio)
        self.assertEqual(len(filtered), len(self.test_audio))

    def test_dc_offset_correction(self):
        """Test DC offset correction functionality."""
        dc_corrector = DCOffsetCorrection(sample_rate=self.sample_rate)
        
        # Test DC offset correction
        corrected = dc_corrector.correct_dc_offset(self.test_audio)
        self.assertAlmostEqual(np.mean(corrected), 0.0, places=5)

    def test_channel_swapper(self):
        """Test channel swapper functionality."""
        channel_swapper = ChannelSwapper(sample_rate=self.sample_rate)
        
        # Test channel swapping
        swapped = channel_swapper.swap_channels(self.stereo_audio)
        self.assertEqual(swapped.shape, self.stereo_audio.shape)

    def test_channel_inverter(self):
        """Test channel inverter functionality."""
        channel_inverter = ChannelInverter(sample_rate=self.sample_rate)
        
        # Test channel inversion
        inverted = channel_inverter.invert_channels(self.test_audio)
        self.assertEqual(len(inverted), len(self.test_audio))

    def test_dynamic_range_compressor(self):
        """Test dynamic range compressor functionality."""
        compressor = DynamicRangeCompressor(sample_rate=self.sample_rate)
        
        # Test compression
        compressed = compressor.apply_compression(self.test_audio)
        self.assertEqual(len(compressed), len(self.test_audio))

if __name__ == '__main__':
    unittest.main()