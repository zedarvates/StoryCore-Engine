"""
Power Windows Service - Shape-based Masks for Targeted Corrections
StoryCore-Engine Color Module
"""

import numpy as np
import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import List, Tuple, Optional

logger = logging.getLogger(__name__)

class WindowType(Enum):
    CIRCULAR = "circular"
    RECTANGULAR = "rectangular"
    POLYGONAL = "polygonal"
    LINEAR = "linear"

@dataclass
class PowerWindow:
    id: str
    window_type: WindowType
    center: Tuple[float, float] = (0.5, 0.5)  # Normalized coordinates [0, 1]
    size: Tuple[float, float] = (0.2, 0.2)
    rotation: float = 0.0  # Degrees
    softness: float = 0.1
    opacity: float = 1.0
    invert: bool = False
    points: List[Tuple[float, float]] = field(default_factory=list)

class PowerWindowsService:
    """
    Handles shape-based masks for targeted color correction.
    Inspired by DaVinci Resolve's Power Windows.
    """
    
    def __init__(self):
        self.windows: List[PowerWindow] = []

    def create_mask(self, window: PowerWindow, width: int, height: int) -> np.ndarray:
        """
        Generate a mask array for a given PowerWindow.
        """
        mask = np.zeros((height, width), dtype=np.float32)
        
        if window.window_type == WindowType.CIRCULAR:
            mask = self._create_circular_mask(window, width, height)
        elif window.window_type == WindowType.RECTANGULAR:
            mask = self._create_rectangular_mask(window, width, height)
        # Add other types as needed
        
        if window.invert:
            mask = 1.0 - mask
            
        return mask * window.opacity

    def _create_circular_mask(self, window: PowerWindow, width: int, height: int) -> np.ndarray:
        y, x = np.ogrid[:height, :width]
        cx, cy = window.center[0] * width, window.center[1] * height
        rx, ry = window.size[0] * width / 2, window.size[1] * height / 2
        
        # Ellipse formula: (x-cx)^2/rx^2 + (y-cy)^2/ry^2 <= 1
        dist = ((x - cx)**2 / (rx**2 + 1e-6)) + ((y - cy)**2 / (ry**2 + 1e-6))
        
        # Softness
        if window.softness > 0:
            mask = np.clip((1.0 - dist) / (window.softness + 1e-6), 0, 1)
        else:
            mask = (dist <= 1.0).astype(np.float32)
            
        return mask

    def _create_rectangular_mask(self, window: PowerWindow, width: int, height: int) -> np.ndarray:
        y, x = np.ogrid[:height, :width]
        cx, cy = window.center[0] * width, window.center[1] * height
        half_w, half_h = window.size[0] * width / 2, window.size[1] * height / 2
        
        # Simple rectangle (without rotation for now)
        mask_x = np.clip((half_w - np.abs(x - cx)) / (window.softness * width + 1e-6), 0, 1)
        mask_y = np.clip((half_h - np.abs(y - cy)) / (window.softness * height + 1e-6), 0, 1)
        
        return mask_x * mask_y