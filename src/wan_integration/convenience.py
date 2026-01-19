"""
Convenience Functions for Wan Video Integration
"""

import asyncio
from typing import List, Optional

from PIL import Image

from .models import InpaintingMask
from .core import WanVideoIntegration

try:
    from .advanced_workflow_config import WanVideoConfig
except ImportError:
    from advanced_workflow_config import WanVideoConfig


async def generate_inpainted_video(
    prompt: str,
    video_frames: List[Image.Image],
    mask: InpaintingMask,
    config: Optional[WanVideoConfig] = None,
    **kwargs
) -> List[Image.Image]:
    """
    Convenience function for video inpainting

    Args:
        prompt: Text prompt for inpainting
        video_frames: Input video frames
        mask: Inpainting mask
        config: Wan Video configuration (uses default if None)
        **kwargs: Additional parameters

    Returns:
        Inpainted video frames
    """
    if config is None:
        config = WanVideoConfig()

    integration = WanVideoIntegration(config)

    try:
        result = await integration.generate_video_with_inpainting(
            prompt, video_frames, mask, **kwargs
        )
        return result
    finally:
        await integration.cleanup()


async def generate_transparent_video(
    prompt: str,
    config: Optional[WanVideoConfig] = None,
    **kwargs
) -> List[Image.Image]:
    """
    Convenience function for transparent video generation

    Args:
        prompt: Text prompt for generation
        config: Wan Video configuration (uses default if None)
        **kwargs: Additional parameters

    Returns:
        RGBA video frames with transparency
    """
    if config is None:
        config = WanVideoConfig()

    integration = WanVideoIntegration(config)

    try:
        result = await integration.create_transparent_video(prompt, **kwargs)
        return result
    finally:
        await integration.cleanup()