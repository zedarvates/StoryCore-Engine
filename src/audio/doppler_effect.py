"""
Doppler Effect Module

This module provides Doppler effect functionality for audio processing.
"""

import numpy as np
import librosa

class DopplerEffect:
    """Doppler effect processor for audio signals."""

    def __init__(self, sample_rate=44100, speed=10.0, direction='approaching'):
        """
        Initialize the Doppler effect.

        Args:
            sample_rate (int): Audio sample rate in Hz
            speed (float): Speed of sound source in m/s
            direction (str): Direction ('approaching' or 'receding')
        """
        self.sample_rate = sample_rate
        self.speed = speed
        self.direction = direction
        self.speed_of_sound = 343.0  # m/s at 20°C

    def apply_doppler_effect(self, audio_data):
        """
        Apply Doppler effect to audio data.

        Args:
            audio_data (numpy.ndarray): Input audio signal

        Returns:
            numpy.ndarray: Processed audio signal with Doppler effect
        """
        # Calculate Doppler shift factor
        if self.direction == 'approaching':
            factor = self.speed_of_sound / (self.speed_of_sound - self.speed)
        else:  # receding
            factor = self.speed_of_sound / (self.speed_of_sound + self.speed)

        # Apply pitch shift based on Doppler effect
        return librosa.effects.pitch_shift(
            audio_data, 
            sr=self.sample_rate, 
            n_steps=np.log2(factor)
        )