"""
Compositing Pipeline Module
"""

import logging
from typing import List, Tuple
from PIL import Image

try:
    from PIL import Image
    import numpy as np
except ImportError:
    Image = None
    np = None

from .models import CompositeLayer

logger = logging.getLogger(__name__)


class CompositingPipeline:
    """Handles video compositing with multiple layers"""

    def __init__(self, config):
        self.config = config

    def composite_layers(
        self,
        layers: List[CompositeLayer],
        background_color: Tuple[int, int, int, int] = (0, 0, 0, 0)
    ) -> List[Image.Image]:
        """
        Composite multiple video layers

        Args:
            layers: List of composite layers
            background_color: Background color (RGBA)

        Returns:
            Composited video frames
        """
        if not layers:
            raise ValueError("At least one layer required")

        # Validate all layers
        for i, layer in enumerate(layers):
            layer_errors = layer.validate()
            if layer_errors:
                raise ValueError(f"Invalid layer {i}: {', '.join(layer_errors)}")

        logger.info(f"Compositing {len(layers)} layers")

        # Determine output dimensions from first layer
        first_layer = layers[0]
        num_frames = len(first_layer.video_frames)

        if Image:
            width, height = first_layer.video_frames[0].size
        else:
            width, height = 720, 480

        logger.info(f"Output: {width}x{height}, {num_frames} frames")

        # Composite each frame
        composited_frames = []
        for frame_idx in range(num_frames):
            # Create background
            if Image:
                composite_frame = Image.new('RGBA', (width, height), background_color)
            else:
                composite_frame = None

            # Composite each layer
            for layer_idx, layer in enumerate(layers):
                if frame_idx >= len(layer.video_frames):
                    continue

                layer_frame = layer.video_frames[frame_idx]

                if Image and composite_frame:
                    # Apply alpha if available
                    if layer.alpha_channel and frame_idx < len(layer.alpha_channel):
                        alpha_mask = layer.alpha_channel[frame_idx]
                        if layer_frame.mode != 'RGBA':
                            layer_frame = layer_frame.convert('RGBA')
                        layer_frame.putalpha(alpha_mask)

                    # Apply opacity
                    if layer.opacity < 1.0:
                        # Adjust alpha channel for opacity
                        alpha = layer_frame.split()[-1]
                        alpha = alpha.point(lambda p: int(p * layer.opacity))
                        layer_frame.putalpha(alpha)

                    # Composite with offset
                    composite_frame.paste(
                        layer_frame,
                        (layer.offset_x, layer.offset_y),
                        layer_frame if layer_frame.mode == 'RGBA' else None
                    )

            composited_frames.append(composite_frame)

            if frame_idx % 10 == 0:
                logger.debug(f"Composited frame {frame_idx}/{num_frames}")

        logger.info(f"Compositing complete: {len(composited_frames)} frames")
        return composited_frames