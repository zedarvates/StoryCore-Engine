"""
Speed Changer Module

This module provides functionality for changing audio playback speed
without affecting pitch.
"""

import numpy as np
import librosa

class SpeedChanger:
    """Audio speed changer with pitch preservation."""

    def __init__(self, sample_rate=44100):
        """
        Initialize the speed changer.

        Args:
            sample_rate (int): Audio sample rate in Hz
        """
        self.sample_rate = sample_rate

    def change_speed(self, audio_data, speed_factor=1.0):
        """
        Change audio playback speed without affecting pitch.

        Args:
            audio_data (numpy.ndarray): Input audio signal
            speed_factor (float): Speed factor (1.0 = original speed)

        Returns:
            numpy.ndarray: Speed-adjusted audio signal
        """
        # Use librosa's time-stretching algorithm
        return librosa.effects.time_stretch(audio_data, rate=speed_factor)

    def change_speed_with_pitch(self, audio_data, speed_factor=1.0, pitch_factor=1.0):
        """
        Change audio playback speed with pitch adjustment.

        Args:
            audio_data (numpy.ndarray): Input audio signal
            speed_factor (float): Speed factor (1.0 = original speed)
            pitch_factor (float): Pitch factor (1.0 = original pitch)

        Returns:
            numpy.ndarray: Speed and pitch adjusted audio signal
        """
        # First apply time stretching
        stretched_audio = librosa.effects.time_stretch(audio_data, rate=speed_factor)
        
        # Then apply pitch shifting
        pitch_shifted_audio = librosa.effects.pitch_shift(
            stretched_audio, 
            sr=self.sample_rate, 
            n_steps=np.log2(pitch_factor)
        )
        
        return pitch_shifted_audio