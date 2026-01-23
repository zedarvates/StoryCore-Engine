"""
Vocal Reduction Module

This module provides functionality for reducing vocals in audio signals.
"""

import numpy as np

class VocalReduction:
    """Vocal reduction processor for audio signals."""

    def __init__(self, sample_rate=44100):
        """
        Initialize the vocal reduction processor.

        Args:
            sample_rate (int): Audio sample rate in Hz
        """
        self.sample_rate = sample_rate

    def apply_vocal_reduction(self, audio_data, reduction_strength=0.7):
        """
        Apply vocal reduction to audio data.

        Args:
            audio_data (numpy.ndarray): Input audio signal
            reduction_strength (float): Strength of vocal reduction (0 to 1)

        Returns:
            numpy.ndarray: Processed audio signal with reduced vocals
        """
        # Simple vocal reduction using phase cancellation
        # This assumes stereo audio where vocals are centered
        
        if len(audio_data.shape) == 1:
            # Mono audio - no vocal reduction possible
            return audio_data
        
        # For stereo audio
        left_channel = audio_data[0]
        right_channel = audio_data[1]
        
        # Apply phase cancellation
        reduced_left = left_channel - reduction_strength * right_channel
        reduced_right = right_channel - reduction_strength * left_channel
        
        return np.array([reduced_left, reduced_right])