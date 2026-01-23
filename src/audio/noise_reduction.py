"""
Noise Reduction Module

This module provides functionality for reducing noise in audio signals.
"""

import numpy as np
from scipy import signal

class NoiseReduction:
    """Noise reduction processor for audio signals."""

    def __init__(self, sample_rate=44100):
        """
        Initialize the noise reduction processor.

        Args:
            sample_rate (int): Audio sample rate in Hz
        """
        self.sample_rate = sample_rate

    def apply_noise_gate(self, audio_data, threshold=0.01, ratio=2.0):
        """
        Apply noise gate to audio data.

        Args:
            audio_data (numpy.ndarray): Input audio signal
            threshold (float): Noise gate threshold
            ratio (float): Compression ratio

        Returns:
            numpy.ndarray: Processed audio signal
        """
        # Calculate RMS
        rms = np.sqrt(np.mean(audio_data**2))
        
        if rms < threshold:
            # Apply compression
            gain = 1.0 / (1.0 + ratio * (threshold / (rms + 1e-10)))
            return audio_data * gain
        else:
            return audio_data

    def apply_spectral_subtraction(self, audio_data, noise_profile=None):
        """
        Apply spectral subtraction for noise reduction.

        Args:
            audio_data (numpy.ndarray): Input audio signal
            noise_profile (numpy.ndarray): Noise profile (optional)

        Returns:
            numpy.ndarray: Processed audio signal
        """
        # Apply FFT
        fft_result = np.fft.rfft(audio_data)
        magnitude = np.abs(fft_result)
        phase = np.angle(fft_result)

        # If no noise profile provided, estimate from first part of signal
        if noise_profile is None:
            noise_profile = np.mean(magnitude[:len(magnitude)//10], axis=0)

        # Apply spectral subtraction
        cleaned_magnitude = np.maximum(magnitude - noise_profile, 0)

        # Reconstruct signal
        cleaned_fft = cleaned_magnitude * np.exp(1j * phase)
        cleaned_audio = np.fft.irfft(cleaned_fft, len(audio_data))

        return cleaned_audio