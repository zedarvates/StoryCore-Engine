# Audio Processing Module
# This module provides advanced audio processing functionalities for StoryCore Engine.

from .lfo import LFO
from .autotune import AutoTune
from .noise_reduction import NoiseReduction
from .cleaner import Cleaner
from .phaser import Phaser
from .speed_changer import SpeedChanger
from .amplifier import Amplifier
from .wah_wah import WahWah
from .vibrato import Vibrato
from .tremolo import Tremolo
from .distortion import Distortion
from .chorus import Chorus
from .doppler_effect import DopplerEffect
from .inverter import Inverter
from .vocal_reduction import VocalReduction
from .voice_isolation import VoiceIsolation
from .click_pop_reduction import ClickPopReduction
from .noise_suppression import NoiseSuppression
from .voice_modification import VoiceModification
from .high_pass_filter import HighPassFilter
from .low_pass_filter import LowPassFilter
from .dc_offset_correction import DCOffsetCorrection
from .channel_swapper import ChannelSwapper
from .channel_inverter import ChannelInverter
from .dynamic_range_compressor import DynamicRangeCompressor

__all__ = [
    "LFO",
    "AutoTune",
    "NoiseReduction",
    "Cleaner",
    "Phaser",
    "SpeedChanger",
    "Amplifier",
    "WahWah",
    "Vibrato",
    "Tremolo",
    "Distortion",
    "Chorus",
    "DopplerEffect",
    "Inverter",
    "VocalReduction",
    "VoiceIsolation",
    "ClickPopReduction",
    "NoiseSuppression",
    "VoiceModification",
    "HighPassFilter",
    "LowPassFilter",
    "DCOffsetCorrection",
    "ChannelSwapper",
    "ChannelInverter",
    "DynamicRangeCompressor",
]