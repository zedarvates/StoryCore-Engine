"""
Audio Cleaner Module

This module provides functionality for cleaning audio signals by removing
background noise and artifacts.
"""

import numpy as np
from scipy import signal

class Cleaner:
    """Audio cleaner for removing background noise and artifacts."""

    def __init__(self, sample_rate=44100):
        """
        Initialize the audio cleaner.

        Args:
            sample_rate (int): Audio sample rate in Hz
        """
        self.sample_rate = sample_rate

    def remove_dc_offset(self, audio_data):
        """
        Remove DC offset from audio signal.

        Args:
            audio_data (numpy.ndarray): Input audio signal

        Returns:
            numpy.ndarray: Audio signal with DC offset removed
        """
        # Calculate mean (DC offset)
        dc_offset = np.mean(audio_data)
        # Remove DC offset
        return audio_data - dc_offset

    def apply_bandpass_filter(self, audio_data, low_cut=80, high_cut=12000):
        """
        Apply bandpass filter to audio signal.

        Args:
            audio_data (numpy.ndarray): Input audio signal
            low_cut (float): Low cutoff frequency in Hz
            high_cut (float): High cutoff frequency in Hz

        Returns:
            numpy.ndarray: Filtered audio signal
        """
        # Design bandpass filter
        nyquist = 0.5 * self.sample_rate
        low = low_cut / nyquist
        high = high_cut / nyquist
        
        # Create butterworth filter
        b, a = signal.butter(4, [low, high], btype='band')
        
        # Apply filter
        return signal.filtfilt(b, a, audio_data)

    def clean_audio(self, audio_data):
        """
        Apply comprehensive cleaning to audio signal.

        Args:
            audio_data (numpy.ndarray): Input audio signal

        Returns:
            numpy.ndarray: Cleaned audio signal
        """
        # Remove DC offset
        audio_data = self.remove_dc_offset(audio_data)
        
        # Apply bandpass filter
        audio_data = self.apply_bandpass_filter(audio_data)
        
        return audio_data