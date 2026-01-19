"""
Enums for Wan Video Integration
"""

from enum import Enum


class InpaintingStage(Enum):
    """Inpainting processing stages"""
    HIGH_NOISE = "high_noise"  # Initial rough inpainting
    LOW_NOISE = "low_noise"    # Refinement stage


class AlphaChannelMode(Enum):
    """Alpha channel generation modes"""
    THRESHOLD = "threshold"      # Simple threshold-based
    EDGE_AWARE = "edge_aware"    # Edge-preserving alpha
    SEMANTIC = "semantic"        # Semantic segmentation-based