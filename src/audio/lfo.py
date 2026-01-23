"""
Low-Frequency Oscillator (LFO) Module

This module provides functionality for generating low-frequency signals
used in audio modulation effects like vibrato, tremolo, and phaser.
"""

import numpy as np

class LFO:
    """Low-Frequency Oscillator for audio modulation effects."""

    def __init__(self, sample_rate=44100, frequency=1.0, waveform='sine'):
        """
        Initialize the LFO.

        Args:
            sample_rate (int): Audio sample rate in Hz
            frequency (float): LFO frequency in Hz
            waveform (str): Waveform type ('sine', 'square', 'triangle', 'sawtooth')
        """
        self.sample_rate = sample_rate
        self.frequency = frequency
        self.waveform = waveform
        self.phase = 0
        self.time = 0

    def generate(self, duration):
        """
        Generate LFO signal for specified duration.

        Args:
            duration (float): Duration in seconds

        Returns:
            numpy.ndarray: LFO signal
        """
        num_samples = int(duration * self.sample_rate)
        time_array = np.linspace(0, duration, num_samples, endpoint=False)

        if self.waveform == 'sine':
            signal = np.sin(2 * np.pi * self.frequency * time_array + self.phase)
        elif self.waveform == 'square':
            signal = np.sign(np.sin(2 * np.pi * self.frequency * time_array + self.phase))
        elif self.waveform == 'triangle':
            signal = 2 * np.abs(2 * (time_array * self.frequency + self.phase / (2 * np.pi)) % 1 - 1) - 1
        elif self.waveform == 'sawtooth':
            signal = 2 * ((time_array * self.frequency + self.phase / (2 * np.pi)) % 1 - 0.5)
        else:
            raise ValueError(f"Unknown waveform: {self.waveform}")

        return signal

    def modulate_frequency(self, audio_data, depth=10.0):
        """
        Apply frequency modulation to audio data.

        Args:
            audio_data (numpy.ndarray): Input audio signal
            depth (float): Modulation depth in Hz

        Returns:
            numpy.ndarray: Frequency modulated audio signal
        """
        lfo_signal = self.generate(len(audio_data) / self.sample_rate)
        modulated_signal = np.zeros_like(audio_data)

        for i in range(len(audio_data)):
            # Simple frequency modulation using phase modulation
            phase_modulation = depth * lfo_signal[i]
            modulated_signal[i] = audio_data[i] * np.cos(2 * np.pi * phase_modulation)

        return modulated_signal

    def modulate_amplitude(self, audio_data, depth=0.5):
        """
        Apply amplitude modulation to audio data.

        Args:
            audio_data (numpy.ndarray): Input audio signal
            depth (float): Modulation depth (0 to 1)

        Returns:
            numpy.ndarray: Amplitude modulated audio signal
        """
        lfo_signal = self.generate(len(audio_data) / self.sample_rate)
        # Normalize LFO signal to [0, 1] range for amplitude modulation
        lfo_normalized = (lfo_signal + 1) / 2
        # Apply modulation
        modulated_signal = audio_data * (1 + depth * lfo_normalized)
        return modulated_signal