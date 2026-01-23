"""
Noise Suppression Module

This module provides functionality for suppressing noise in audio signals.
"""

import numpy as np
from scipy import signal

class NoiseSuppression:
    """Noise suppression processor for audio signals."""

    def __init__(self, sample_rate=44100):
        """
        Initialize the noise suppression processor.

        Args:
            sample_rate (int): Audio sample rate in Hz
        """
        self.sample_rate = sample_rate

    def apply_noise_suppression(self, audio_data, threshold=0.05):
        """
        Apply noise suppression to audio data.

        Args:
            audio_data (numpy.ndarray): Input audio signal
            threshold (float): Noise suppression threshold

        Returns:
            numpy.ndarray: Processed audio signal with suppressed noise
        """
        # Apply spectral gating
        fft_result = np.fft.rfft(audio_data)
        magnitude = np.abs(fft_result)
        phase = np.angle(fft_result)

        # Apply thresholding
        suppressed_magnitude = np.where(magnitude > threshold, magnitude, 0)

        # Reconstruct signal
        suppressed_fft = suppressed_magnitude * np.exp(1j * phase)
        suppressed_audio = np.fft.irfft(suppressed_fft, len(audio_data))

        return suppressed_audio