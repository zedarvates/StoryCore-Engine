"""
StoryCore-Engine 3D Sky Keyframe System

This package provides high-quality keyframe generation with scientifically
accurate skies and atmospheres for ComfyUI integration.

Modules:
    keyframe_generator: Main orchestrator for keyframe generation
    atmosphere_core: Physical atmospheric models
    render_engine: High-quality offline rendering
    camera: Camera positioning and projection
    world_presets: World type configurations (Earth, Mars, Titan, etc.)
"""

from .keyframe_generator import KeyframeGenerator, KeyframeResult
from .atmosphere_core import AtmosphereModel, AtmosphericConditions
from .world_presets import WorldPreset, get_preset, list_presets

__version__ = "1.0.0"
__all__ = [
    "KeyframeGenerator",
    "KeyframeResult", 
    "AtmosphereModel",
    "AtmosphericConditions",
    "WorldPreset",
    "get_preset",
    "list_presets",
]
