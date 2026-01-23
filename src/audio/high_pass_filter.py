"""
High-Pass Filter Module

This module provides high-pass filtering functionality for audio processing.
"""

import numpy as np
from scipy import signal

class HighPassFilter:
    """High-pass filter processor for audio signals."""

    def __init__(self, sample_rate=44100, cutoff_freq=1000):
        """
        Initialize the high-pass filter.

        Args:
            sample_rate (int): Audio sample rate in Hz
            cutoff_freq (float): Cutoff frequency in Hz
        """
        self.sample_rate = sample_rate
        self.cutoff_freq = cutoff_freq

    def apply_high_pass_filter(self, audio_data):
        """
        Apply high-pass filter to audio data.

        Args:
            audio_data (numpy.ndarray): Input audio signal

        Returns:
            numpy.ndarray: Processed audio signal with high-pass filter applied
        """
        # Design high-pass filter
        nyquist = 0.5 * self.sample_rate
        cutoff = self.cutoff_freq / nyquist
        
        # Create butterworth filter
        b, a = signal.butter(4, cutoff, btype='high', analog=False)
        
        # Apply filter
        return signal.filtfilt(b, a, audio_data)