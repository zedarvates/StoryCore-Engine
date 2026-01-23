"""
Click/Pop Reduction Module

This module provides functionality for reducing clicks and pops in audio signals.
"""

import numpy as np
from scipy import signal

class ClickPopReduction:
    """Click and pop reduction processor for audio signals."""

    def __init__(self, sample_rate=44100):
        """
        Initialize the click/pop reduction processor.

        Args:
            sample_rate (int): Audio sample rate in Hz
        """
        self.sample_rate = sample_rate

    def detect_clicks(self, audio_data, threshold=0.1):
        """
        Detect clicks in audio data.

        Args:
            audio_data (numpy.ndarray): Input audio signal
            threshold (float): Detection threshold

        Returns:
            list: Indices of detected clicks
        """
        # Calculate differences between consecutive samples
        diffs = np.diff(audio_data)
        
        # Find indices where differences exceed threshold
        click_indices = np.where(np.abs(diffs) > threshold)[0]
        
        return click_indices.tolist()

    def apply_click_reduction(self, audio_data, threshold=0.1, window_size=10):
        """
        Apply click reduction to audio data.

        Args:
            audio_data (numpy.ndarray): Input audio signal
            threshold (float): Detection threshold
            window_size (int): Window size for interpolation

        Returns:
            numpy.ndarray: Processed audio signal with reduced clicks
        """
        # Detect clicks
        click_indices = self.detect_clicks(audio_data, threshold)
        
        # Create copy for processing
        processed_audio = audio_data.copy()
        
        # Interpolate over detected clicks
        for idx in click_indices:
            start = max(0, idx - window_size)
            end = min(len(audio_data), idx + window_size + 1)
            
            # Linear interpolation
            x = np.arange(start, end)
            y = audio_data[[start, end-1]]
            
            processed_audio[start:end] = np.interp(x, [start, end-1], y)
        
        return processed_audio