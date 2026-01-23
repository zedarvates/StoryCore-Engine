"""
Amplifier Module

This module provides functionality for amplifying audio signals.
"""

import numpy as np

class Amplifier:
    """Audio amplifier for increasing signal amplitude."""

    def __init__(self, sample_rate=44100):
        """
        Initialize the amplifier.

        Args:
            sample_rate (int): Audio sample rate in Hz
        """
        self.sample_rate = sample_rate

    def amplify(self, audio_data, gain_db=6.0):
        """
        Amplify audio signal by specified gain in decibels.

        Args:
            audio_data (numpy.ndarray): Input audio signal
            gain_db (float): Gain in decibels

        Returns:
            numpy.ndarray: Amplified audio signal
        """
        # Convert dB to linear scale
        linear_gain = 10 ** (gain_db / 20)
        
        # Apply gain
        amplified_audio = audio_data * linear_gain
        
        # Clip to prevent overflow
        return np.clip(amplified_audio, -1.0, 1.0)

    def normalize(self, audio_data, target_db=-3.0):
        """
        Normalize audio signal to target decibel level.

        Args:
            audio_data (numpy.ndarray): Input audio signal
            target_db (float): Target decibel level

        Returns:
            numpy.ndarray: Normalized audio signal
        """
        # Calculate current RMS
        rms = np.sqrt(np.mean(audio_data**2))
        
        if rms > 0:
            # Calculate required gain
            current_db = 20 * np.log10(rms)
            gain_db = target_db - current_db
            
            # Apply amplification
            return self.amplify(audio_data, gain_db)
        else:
            return audio_data