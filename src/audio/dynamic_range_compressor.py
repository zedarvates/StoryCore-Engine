"""
Dynamic Range Compressor Module

This module provides dynamic range compression functionality for audio processing.
"""

import numpy as np

class DynamicRangeCompressor:
    """Dynamic range compressor for audio signals."""

    def __init__(self, sample_rate=44100, threshold=-20.0, ratio=4.0, attack=0.01, release=0.1):
        """
        Initialize the dynamic range compressor.

        Args:
            sample_rate (int): Audio sample rate in Hz
            threshold (float): Compression threshold in dB
            ratio (float): Compression ratio
            attack (float): Attack time in seconds
            release (float): Release time in seconds
        """
        self.sample_rate = sample_rate
        self.threshold = threshold
        self.ratio = ratio
        self.attack = attack
        self.release = release
        self.gain = 1.0

    def apply_compression(self, audio_data):
        """
        Apply dynamic range compression to audio data.

        Args:
            audio_data (numpy.ndarray): Input audio signal

        Returns:
            numpy.ndarray: Processed audio signal with compression applied
        """
        # Convert threshold to linear scale
        threshold_linear = 10 ** (self.threshold / 20)
        
        # Calculate attack and release coefficients
        attack_coeff = np.exp(-1.0 / (self.attack * self.sample_rate))
        release_coeff = np.exp(-1.0 / (self.release * self.sample_rate))
        
        # Initialize output
        compressed_audio = np.zeros_like(audio_data)
        
        # Apply compression
        for i in range(len(audio_data)):
            # Calculate input level
            input_level = np.abs(audio_data[i])
            
            # Calculate gain reduction
            if input_level > threshold_linear:
                gain_reduction = threshold_linear + (input_level - threshold_linear) / self.ratio
                target_gain = gain_reduction / input_level
            else:
                target_gain = 1.0
            
            # Apply attack/release smoothing
            if target_gain < self.gain:
                # Attack phase
                self.gain = attack_coeff * self.gain + (1 - attack_coeff) * target_gain
            else:
                # Release phase
                self.gain = release_coeff * self.gain + (1 - release_coeff) * target_gain
            
            # Apply gain
            compressed_audio[i] = audio_data[i] * self.gain
        
        return compressed_audio