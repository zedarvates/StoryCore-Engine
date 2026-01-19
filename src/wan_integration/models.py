"""
Data models for Wan Video Integration
"""

from dataclasses import dataclass
from typing import Any, List, Optional


@dataclass
class InpaintingMask:
    """Represents an inpainting mask"""
    mask_image: Any  # PIL Image or numpy array
    blur_radius: int = 4
    feather_amount: int = 2
    invert: bool = False

    def validate(self) -> List[str]:
        """Validate mask parameters"""
        errors = []

        if self.blur_radius < 0:
            errors.append("Blur radius must be non-negative")

        if self.feather_amount < 0:
            errors.append("Feather amount must be non-negative")

        return errors


@dataclass
class DualImageGuidance:
    """Dual image guidance for video generation"""
    reference_image: Any  # PIL Image
    style_image: Optional[Any] = None  # Optional style reference
    reference_strength: float = 0.8
    style_strength: float = 0.5
    blend_mode: str = "linear"  # linear, multiply, screen

    def validate(self) -> List[str]:
        """Validate guidance parameters"""
        errors = []

        if not 0 <= self.reference_strength <= 1:
            errors.append("Reference strength must be between 0 and 1")

        if not 0 <= self.style_strength <= 1:
            errors.append("Style strength must be between 0 and 1")

        if self.blend_mode not in ["linear", "multiply", "screen"]:
            errors.append("Blend mode must be linear, multiply, or screen")

        return errors


@dataclass
class CompositeLayer:
    """Layer for video compositing"""
    video_frames: List[Any]  # List of PIL Images
    alpha_channel: Optional[List[Any]] = None  # Optional alpha masks
    blend_mode: str = "normal"
    opacity: float = 1.0
    offset_x: int = 0
    offset_y: int = 0

    def validate(self) -> List[str]:
        """Validate layer parameters"""
        errors = []

        if not self.video_frames:
            errors.append("Video frames cannot be empty")

        if not 0 <= self.opacity <= 1:
            errors.append("Opacity must be between 0 and 1")

        if self.alpha_channel and len(self.alpha_channel) != len(self.video_frames):
            errors.append("Alpha channel must match video frame count")

        return errors