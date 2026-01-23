"""
Chorus Effect Module

This module provides chorus effect functionality for audio processing.
"""

import numpy as np

class Chorus:
    """Chorus effect processor for audio signals."""

    def __init__(self, sample_rate=44100, rate=1.0, depth=0.01, delay=0.02):
        """
        Initialize the chorus effect.

        Args:
            sample_rate (int): Audio sample rate in Hz
            rate (float): LFO rate in Hz
            depth (float): Modulation depth in seconds
            delay (float): Base delay in seconds
        """
        self.sample_rate = sample_rate
        self.rate = rate
        self.depth = depth
        self.delay = delay

    def apply_chorus(self, audio_data):
        """
        Apply chorus effect to audio data.

        Args:
            audio_data (numpy.ndarray): Input audio signal

        Returns:
            numpy.ndarray: Processed audio signal with chorus effect
        """
        # Create LFO for delay modulation
        num_samples = len(audio_data)
        time_array = np.linspace(0, num_samples / self.sample_rate, num_samples)
        lfo_signal = np.sin(2 * np.pi * self.rate * time_array)

        # Calculate modulated delay in samples
        base_delay_samples = int(self.delay * self.sample_rate)
        modulated_delay_samples = base_delay_samples + (self.depth * self.sample_rate * lfo_signal).astype(int)

        # Apply chorus effect
        output = np.zeros_like(audio_data)
        
        for i in range(num_samples):
            # Calculate delay index with wrapping
            delay_idx = i - modulated_delay_samples[i]
            if delay_idx < 0:
                delay_idx = 0
            
            # Mix original and delayed signal
            output[i] = 0.5 * audio_data[i] + 0.5 * audio_data[delay_idx]

        return output