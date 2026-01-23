"""
Wah-Wah Effect Module

This module provides wah-wah effect functionality for audio processing.
"""

import numpy as np
from scipy import signal

class WahWah:
    """Wah-wah effect processor for audio signals."""

    def __init__(self, sample_rate=44100, rate=1.0, depth=0.5, center_freq=1000):
        """
        Initialize the wah-wah effect.

        Args:
            sample_rate (int): Audio sample rate in Hz
            rate (float): LFO rate in Hz
            depth (float): Modulation depth (0 to 1)
            center_freq (float): Center frequency in Hz
        """
        self.sample_rate = sample_rate
        self.rate = rate
        self.depth = depth
        self.center_freq = center_freq

    def apply_wah_wah(self, audio_data):
        """
        Apply wah-wah effect to audio data.

        Args:
            audio_data (numpy.ndarray): Input audio signal

        Returns:
            numpy.ndarray: Processed audio signal with wah-wah effect
        """
        # Create LFO for modulation
        num_samples = len(audio_data)
        time_array = np.linspace(0, num_samples / self.sample_rate, num_samples)
        lfo_signal = 0.5 * (1 + np.sin(2 * np.pi * self.rate * time_array))

        # Apply wah-wah effect
        output = np.zeros_like(audio_data)
        
        for i in range(num_samples):
            # Calculate modulated center frequency
            modulated_freq = self.center_freq + self.center_freq * lfo_signal[i] * self.depth
            
            # Ensure modulated frequency is within valid range
            modulated_freq = max(10.0, min(modulated_freq, self.sample_rate / 2 - 10.0))
            
            # Create bandpass filter
            nyquist = 0.5 * self.sample_rate
            freq = modulated_freq / nyquist
            bandwidth = 0.2  # Fixed bandwidth for wah-wah effect
            
            # Ensure bandwidth is valid
            lower_freq = freq - bandwidth/2
            upper_freq = freq + bandwidth/2
            
            if lower_freq <= 0 or upper_freq >= 1.0:
                # Skip filter if frequencies are out of bounds
                output[i] = audio_data[i]
                continue
            
            # Design bandpass filter
            b, a = signal.iirfilter(4, [lower_freq, upper_freq], btype='band', ftype='butter')
            
            # Apply filter (simplified)
            if i > 0:
                output[i] = b[0] * audio_data[i] + b[1] * audio_data[i-1] - a[1] * output[i-1]
            else:
                output[i] = b[0] * audio_data[i]

        return output