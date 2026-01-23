"""
Channel Inverter Module

This module provides functionality for inverting audio channels.
"""

import numpy as np

class ChannelInverter:
    """Audio channel inverter for stereo signals."""

    def __init__(self, sample_rate=44100):
        """
        Initialize the channel inverter.

        Args:
            sample_rate (int): Audio sample rate in Hz
        """
        self.sample_rate = sample_rate

    def invert_channels(self, audio_data):
        """
        Invert phase of audio channels.

        Args:
            audio_data (numpy.ndarray): Input audio signal

        Returns:
            numpy.ndarray: Audio signal with inverted channels
        """
        if len(audio_data.shape) == 1:
            # Mono audio - invert phase
            return -audio_data
        
        # For stereo audio - invert both channels
        inverted_audio = np.zeros_like(audio_data)
        inverted_audio[0] = -audio_data[0]
        inverted_audio[1] = -audio_data[1]
        
        return inverted_audio