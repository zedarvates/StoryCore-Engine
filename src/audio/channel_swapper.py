"""
Channel Swapper Module

This module provides functionality for swapping audio channels.
"""

import numpy as np

class ChannelSwapper:
    """Audio channel swapper for stereo signals."""

    def __init__(self, sample_rate=44100):
        """
        Initialize the channel swapper.

        Args:
            sample_rate (int): Audio sample rate in Hz
        """
        self.sample_rate = sample_rate

    def swap_channels(self, audio_data):
        """
        Swap left and right channels in stereo audio.

        Args:
            audio_data (numpy.ndarray): Input stereo audio signal (2 channels)

        Returns:
            numpy.ndarray: Audio signal with swapped channels
        """
        if len(audio_data.shape) == 1:
            # Mono audio - nothing to swap
            return audio_data
        
        # For stereo audio
        left_channel = audio_data[0]
        right_channel = audio_data[1]
        
        return np.array([right_channel, left_channel])