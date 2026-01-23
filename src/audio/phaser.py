"""
Phaser Effect Module

This module provides phaser effect functionality for audio processing.
"""

import numpy as np
from scipy import signal

class Phaser:
    """Phaser effect processor for audio signals."""

    def __init__(self, sample_rate=44100, stages=4, rate=1.0, depth=0.5):
        """
        Initialize the phaser effect.

        Args:
            sample_rate (int): Audio sample rate in Hz
            stages (int): Number of phaser stages
            rate (float): LFO rate in Hz
            depth (float): Modulation depth (0 to 1)
        """
        self.sample_rate = sample_rate
        self.stages = stages
        self.rate = rate
        self.depth = depth
        self.phase = 0

    def _create_allpass_filters(self, center_freq, bandwidth):
        """
        Create allpass filters for phaser effect.

        Args:
            center_freq (float): Center frequency in Hz
            bandwidth (float): Bandwidth in Hz

        Returns:
            list: List of allpass filter coefficients
        """
        filters = []
        nyquist = 0.5 * self.sample_rate
        
        for _ in range(self.stages):
            # Calculate filter coefficients
            freq = center_freq / nyquist
            bw = bandwidth / nyquist
            
            # Create allpass filter
            b, a = signal.iirnotch(freq, bw)
            filters.append((b, a))

        return filters

    def apply_phaser(self, audio_data):
        """
        Apply phaser effect to audio data.

        Args:
            audio_data (numpy.ndarray): Input audio signal

        Returns:
            numpy.ndarray: Processed audio signal with phaser effect
        """
        # Create LFO for modulation
        num_samples = len(audio_data)
        time_array = np.linspace(0, num_samples / self.sample_rate, num_samples)
        lfo_signal = 0.5 * (1 + np.sin(2 * np.pi * self.rate * time_array))

        # Apply phaser effect
        output = np.zeros_like(audio_data)
        
        for i in range(num_samples):
            # Calculate modulated center frequency
            center_freq = 500 + 2000 * lfo_signal[i] * self.depth
            bandwidth = 500
            
            # Create and apply allpass filters
            filters = self._create_allpass_filters(center_freq, bandwidth)
            
            signal_processed = audio_data[i]
            for b, a in filters:
                # Apply allpass filter (simplified)
                if i > 0:
                    signal_processed = b[0] * signal_processed + b[1] * audio_data[i-1] - a[1] * output[i-1]
                else:
                    signal_processed = b[0] * signal_processed

            output[i] = signal_processed

        return output