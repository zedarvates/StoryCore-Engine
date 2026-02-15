#!/usr/bin/env python3
"""
Result handlers for Qwen TTS ComfyUI operations.

This module provides classes for handling and processing results
from ComfyUI Qwen TTS workflow executions.
"""

from .audio import AudioResult
from .checkpoint import TrainingResult

__all__ = [
    "AudioResult",
    "TrainingResult",
]
