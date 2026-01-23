"""
Voice Modification Module

This module provides functionality for modifying voice characteristics in audio signals.
"""

import numpy as np
import librosa

class VoiceModification:
    """Voice modification processor for audio signals."""

    def __init__(self, sample_rate=44100):
        """
        Initialize the voice modification processor.

        Args:
            sample_rate (int): Audio sample rate in Hz
        """
        self.sample_rate = sample_rate

    def modify_voice(self, audio_data, pitch_factor=1.0, formant_factor=1.0):
        """
        Apply voice modification to audio data.

        Args:
            audio_data (numpy.ndarray): Input audio signal
            pitch_factor (float): Pitch modification factor
            formant_factor (float): Formant modification factor

        Returns:
            numpy.ndarray: Processed audio signal with modified voice
        """
        # Apply pitch shifting
        pitch_shifted = librosa.effects.pitch_shift(
            audio_data, 
            sr=self.sample_rate, 
            n_steps=np.log2(pitch_factor)
        )
        
        # Apply formant shifting (simplified)
        if formant_factor != 1.0:
            # Resample to modify formants
            resampled = librosa.resample(
                pitch_shifted, 
                orig_sr=self.sample_rate, 
                target_sr=int(self.sample_rate * formant_factor)
            )
            
            # Resample back to original rate
            return librosa.resample(
                resampled, 
                orig_sr=int(self.sample_rate * formant_factor), 
                target_sr=self.sample_rate
            )
        
        return pitch_shifted