"""
Audio Inverter Module

This module provides functionality for inverting audio signals.
"""

import numpy as np

class Inverter:
    """Audio inverter for reversing audio signals."""

    def __init__(self, sample_rate=44100):
        """
        Initialize the audio inverter.

        Args:
            sample_rate (int): Audio sample rate in Hz
        """
        self.sample_rate = sample_rate

    def invert_audio(self, audio_data):
        """
        Invert audio signal (reverse playback).

        Args:
            audio_data (numpy.ndarray): Input audio signal

        Returns:
            numpy.ndarray: Inverted audio signal
        """
        return np.flip(audio_data)

    def invert_phase(self, audio_data):
        """
        Invert phase of audio signal.

        Args:
            audio_data (numpy.ndarray): Input audio signal

        Returns:
            numpy.ndarray: Phase-inverted audio signal
        """
        return -audio_data