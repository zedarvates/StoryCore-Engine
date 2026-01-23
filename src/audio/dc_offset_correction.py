"""
DC Offset Correction Module

This module provides functionality for correcting DC offset in audio signals.
"""

import numpy as np

class DCOffsetCorrection:
    """DC offset correction processor for audio signals."""

    def __init__(self, sample_rate=44100):
        """
        Initialize the DC offset correction processor.

        Args:
            sample_rate (int): Audio sample rate in Hz
        """
        self.sample_rate = sample_rate

    def correct_dc_offset(self, audio_data):
        """
        Correct DC offset in audio data.

        Args:
            audio_data (numpy.ndarray): Input audio signal

        Returns:
            numpy.ndarray: Processed audio signal with DC offset corrected
        """
        # Calculate mean (DC offset)
        dc_offset = np.mean(audio_data)
        
        # Remove DC offset
        return audio_data - dc_offset