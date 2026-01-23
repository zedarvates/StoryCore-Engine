"""
Tremolo Effect Module

This module provides tremolo effect functionality for audio processing.
"""

import numpy as np

class Tremolo:
    """Tremolo effect processor for audio signals."""

    def __init__(self, sample_rate=44100, rate=5.0, depth=0.5):
        """
        Initialize the tremolo effect.

        Args:
            sample_rate (int): Audio sample rate in Hz
            rate (float): Tremolo rate in Hz
            depth (float): Tremolo depth (0 to 1)
        """
        self.sample_rate = sample_rate
        self.rate = rate
        self.depth = depth

    def apply_tremolo(self, audio_data):
        """
        Apply tremolo effect to audio data.

        Args:
            audio_data (numpy.ndarray): Input audio signal

        Returns:
            numpy.ndarray: Processed audio signal with tremolo effect
        """
        # Create LFO for amplitude modulation
        num_samples = len(audio_data)
        time_array = np.linspace(0, num_samples / self.sample_rate, num_samples)
        lfo_signal = 0.5 * (1 + np.sin(2 * np.pi * self.rate * time_array))

        # Apply tremolo effect
        modulation = 1 - self.depth * (1 - lfo_signal)
        return audio_data * modulation