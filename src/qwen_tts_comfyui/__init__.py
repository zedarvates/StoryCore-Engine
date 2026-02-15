#!/usr/bin/env python3
"""
Qwen TTS ComfyUI Integration Module

This module provides a Python interface to interact with Qwen TTS nodes
in ComfyUI for voice generation, voice cloning, and model fine-tuning.

Author: StoryCore Team
Version: 1.0.0
"""

from .config import (
    QwenTTSConfig,
    QwenTTSModelConfig,
    QwenTTSGenerationConfig,
    QwenTTSTrainingConfig,
    QwenTTSVoiceCloneConfig,
)
from .client import QwenTTSComfyUIClient
from .workflows import (
    CustomVoiceWorkflowBuilder,
    VoiceCloneWorkflowBuilder,
    TrainingWorkflowBuilder,
)
from .handlers import AudioResult, TrainingResult

__all__ = [
    # Configuration
    "QwenTTSConfig",
    "QwenTTSModelConfig",
    "QwenTTSGenerationConfig",
    "QwenTTSTrainingConfig",
    "QwenTTSVoiceCloneConfig",
    # Client
    "QwenTTSComfyUIClient",
    # Workflow Builders
    "CustomVoiceWorkflowBuilder",
    "VoiceCloneWorkflowBuilder",
    "TrainingWorkflowBuilder",
    # Results
    "AudioResult",
    "TrainingResult",
]

__version__ = "1.0.0"
