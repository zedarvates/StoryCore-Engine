"""
Vibrato Effect Module

This module provides vibrato effect functionality for audio processing.
"""

import numpy as np
import librosa

class Vibrato:
    """Vibrato effect processor for audio signals."""

    def __init__(self, sample_rate=44100, rate=5.0, depth=0.1):
        """
        Initialize the vibrato effect.

        Args:
            sample_rate (int): Audio sample rate in Hz
            rate (float): Vibrato rate in Hz
            depth (float): Vibrato depth in semitones
        """
        self.sample_rate = sample_rate
        self.rate = rate
        self.depth = depth

    def apply_vibrato(self, audio_data):
        """
        Apply vibrato effect to audio data.

        Args:
            audio_data (numpy.ndarray): Input audio signal

        Returns:
            numpy.ndarray: Processed audio signal with vibrato effect
        """
        # Create LFO for pitch modulation
        num_samples = len(audio_data)
        time_array = np.linspace(0, num_samples / self.sample_rate, num_samples)
        lfo_signal = np.sin(2 * np.pi * self.rate * time_array)

        # Apply vibrato using pitch shifting
        output = np.zeros_like(audio_data)
        frame_size = int(self.sample_rate * 0.02)  # 20ms frames
        
        for i in range(0, num_samples, frame_size):
            end_idx = min(i + frame_size, num_samples)
            frame = audio_data[i:end_idx]
            
            # Calculate pitch shift for this frame
            pitch_shift = self.depth * lfo_signal[i]
            
            # Apply pitch shift
            shifted_frame = librosa.effects.pitch_shift(
                frame, 
                sr=self.sample_rate, 
                n_steps=pitch_shift
            )
            
            # Place shifted frame in output
            output[i:i+len(shifted_frame)] += shifted_frame

        return output