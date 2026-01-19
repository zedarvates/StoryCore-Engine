"""
Wan Video Integration Package

Provides modular integration with Wan Video 2.2 models for various video processing tasks.
"""

from .enums import InpaintingStage, AlphaChannelMode
from .models import InpaintingMask, DualImageGuidance, CompositeLayer
from .utils import inject_workflow_inputs
from .inpainting import VideoInpaintingProcessor
from .alpha import AlphaChannelGenerator
from .lora import LoRAAdapter
from .guidance import DualImageGuidanceSystem
from .compositing import CompositingPipeline
from .core import WanVideoIntegration
from .convenience import generate_inpainted_video, generate_transparent_video

# Import mixins for the main class
from .workflows import WanVideoWorkflowsMixin
from .generation import WanVideoGenerationMixin
from .info import WanVideoInfoMixin

__all__ = [
    'InpaintingStage',
    'AlphaChannelMode',
    'InpaintingMask',
    'DualImageGuidance',
    'CompositeLayer',
    'inject_workflow_inputs',
    'VideoInpaintingProcessor',
    'AlphaChannelGenerator',
    'LoRAAdapter',
    'DualImageGuidanceSystem',
    'CompositingPipeline',
    'WanVideoIntegration',
    'generate_inpainted_video',
    'generate_transparent_video',
]