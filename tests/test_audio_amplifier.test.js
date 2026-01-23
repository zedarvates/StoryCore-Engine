"""
Test cases for the audio amplifier module.
"""
import unittest
import numpy as np
from src.audio.amplifier import Amplifier


class TestAmplifier(unittest.TestCase):
    """Test cases for the Amplifier class."""

    def setUp(self):
        """Set up test fixtures."""
        self.amplifier = Amplifier(sample_rate=44100)
        self.test_audio = np.array([0.1, 0.2, 0.3, -0.1, -0.2, -0.3])

    def test_amplify_basic(self):
        """Test basic amplification functionality."""
        result = self.amplifier.amplify(self.test_audio, gain_db=6.0)
        
        # Check that the result is amplified
        self.assertTrue(np.all(np.abs(result) > np.abs(self.test_audio)))
        
        # Check that the result is clipped to [-1.0, 1.0]
        self.assertTrue(np.all(result <= 1.0))
        self.assertTrue(np.all(result >= -1.0))

    def test_amplify_zero_gain(self):
        """Test amplification with zero gain."""
        result = self.amplifier.amplify(self.test_audio, gain_db=0.0)
        
        # Should remain unchanged
        np.testing.assert_array_almost_equal(result, self.test_audio)

    def test_amplify_negative_gain(self):
        """Test amplification with negative gain (attenuation)."""
        result = self.amplifier.amplify(self.test_audio, gain_db=-6.0)
        
        # Check that the result is attenuated
        self.assertTrue(np.all(np.abs(result) < np.abs(self.test_audio)))

    def test_amplify_clipping(self):
        """Test that amplification clips to prevent overflow."""
        # Create audio that would overflow with high gain
        high_audio = np.array([0.8, 0.9, 1.0])
        result = self.amplifier.amplify(high_audio, gain_db=12.0)
        
        # Check that values are clipped to [-1.0, 1.0]
        self.assertTrue(np.all(result <= 1.0))
        self.assertTrue(np.all(result >= -1.0))

    def test_normalize_basic(self):
        """Test basic normalization functionality."""
        result = self.amplifier.normalize(self.test_audio, target_db=-3.0)
        
        # Calculate RMS of result
        rms = np.sqrt(np.mean(result**2))
        target_rms = 10 ** (-3.0 / 20)  # Convert target dB to RMS
        
        # Check that RMS is close to target
        self.assertAlmostEqual(rms, target_rms, places=1)

    def test_normalize_zero_audio(self):
        """Test normalization with zero audio input."""
        zero_audio = np.zeros(100)
        result = self.amplifier.normalize(zero_audio, target_db=-3.0)
        
        # Should return unchanged zero audio
        np.testing.assert_array_equal(result, zero_audio)

    def test_normalize_different_target(self):
        """Test normalization with different target dB levels."""
        result_quiet = self.amplifier.normalize(self.test_audio, target_db=-12.0)
        result_loud = self.amplifier.normalize(self.test_audio, target_db=-0.5)
        
        # Quiet version should have lower RMS
        rms_quiet = np.sqrt(np.mean(result_quiet**2))
        rms_loud = np.sqrt(np.mean(result_loud**2))
        
        self.assertTrue(rms_quiet < rms_loud)


if __name__ == '__main__':
    unittest.main()