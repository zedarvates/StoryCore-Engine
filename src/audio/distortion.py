"""
Distortion Effect Module

This module provides distortion effect functionality for audio processing.
"""

import numpy as np

class Distortion:
    """Distortion effect processor for audio signals."""

    def __init__(self, sample_rate=44100, drive=0.5, tone=0.5):
        """
        Initialize the distortion effect.

        Args:
            sample_rate (int): Audio sample rate in Hz
            drive (float): Distortion drive (0 to 1)
            tone (float): Tone control (0 to 1)
        """
        self.sample_rate = sample_rate
        self.drive = drive
        self.tone = tone

    def apply_distortion(self, audio_data):
        """
        Apply distortion effect to audio data.

        Args:
            audio_data (numpy.ndarray): Input audio signal

        Returns:
            numpy.ndarray: Processed audio signal with distortion effect
        """
        # Apply drive
        driven_signal = audio_data * (1 + self.drive * 10)
        
        # Apply clipping
        distorted_signal = np.tanh(driven_signal)
        
        # Apply tone control (simple low-pass filter)
        if self.tone < 0.5:
            # More bass
            alpha = 0.1 + self.tone * 0.4
        else:
            # More treble
            alpha = 0.5 + (self.tone - 0.5) * 0.4
        
        # Simple one-pole low-pass filter
        filtered_signal = np.zeros_like(distorted_signal)
        filtered_signal[0] = distorted_signal[0]
        
        for i in range(1, len(distorted_signal)):
            filtered_signal[i] = alpha * distorted_signal[i] + (1 - alpha) * filtered_signal[i-1]

        return filtered_signal