"""
Qualifier Service - HSL Color Selection for StoryCore-Engine

Implements secondary color correction selection tools inspired by DaVinci Resolve:
- HSL Qualifier (select by hue, saturation, luminance)
- Color range selection with softness
- Matte refinement (shrink, expand, blur)
- Edge processing for clean mattes

Author: StoryCore Team
Version: 1.0.0
"""

from dataclasses import dataclass
from typing import List, Optional, Tuple
from enum import Enum
import numpy as np
import logging

logger = logging.getLogger(__name__)


class SelectionMode(Enum):
    """Selection modes for qualifier"""

    ADD = "add"
    SUBTRACT = "subtract"
    REPLACE = "replace"
    INTERSECT = "intersect"


@dataclass
class HSLQualifier:
    """
    HSL Qualifier settings for color selection.

    Allows selecting colors based on:
    - Hue range (color)
    - Saturation range (color intensity)
    - Luminance range (brightness)
    """

    # Hue range (0-360 degrees)
    hue_center: float = 0.0
    hue_width: float = 30.0  # Total width (center ± width/2)
    hue_softness: float = 10.0  # Feather at edges

    # Saturation range (0-1)
    sat_low: float = 0.0
    sat_high: float = 1.0
    sat_soft_low: float = 0.1
    sat_soft_high: float = 0.1

    # Luminance range (0-1)
    lum_low: float = 0.0
    lum_high: float = 1.0
    lum_soft_low: float = 0.1
    lum_soft_high: float = 0.1

    # Global softness
    softness: float = 0.0

    # Preview mode
    enabled: bool = True
    show_matte: bool = False


@dataclass
class MatteResult:
    """Result of a matte generation operation"""

    matte: np.ndarray  # Single channel mask (H, W), values 0-1
    preview: Optional[np.ndarray] = None  # RGB preview if requested
    coverage: float = 0.0  # Percentage of image selected


class QualifierService:
    """
    Service for creating and refining color-based selections.

    Provides HSL qualifier functionality for secondary color correction:
    - Select colors by hue, saturation, and luminance ranges
    - Soft edges for natural transitions
    - Matte refinement tools

    Example usage:
        service = QualifierService()

        # Create qualifier for skin tones
        qualifier = HSLQualifier(
            hue_center=20.0,  # Orange-red
            hue_width=30.0,
            sat_low=0.2,
            lum_low=0.3,
            lum_high=0.8
        )

        # Generate matte
        result = service.qualify(frame, qualifier)

        # Refine matte
        refined = service.refine_matte(result.matte, softness=5)
    """

    def __init__(self):
        """Initialize the qualifier service"""
        self.current_qualifier: Optional[HSLQualifier] = None
        self.cached_matte: Optional[np.ndarray] = None

    def qualify(
        self,
        frame: np.ndarray,
        qualifier: HSLQualifier,
        selection_mode: SelectionMode = SelectionMode.REPLACE,
        existing_matte: Optional[np.ndarray] = None,
    ) -> MatteResult:
        """
        Generate a matte based on HSL qualifier settings.

        Args:
            frame: Input frame (H, W, 3) RGB
            qualifier: HSL qualifier settings
            selection_mode: How to combine with existing matte
            existing_matte: Existing matte to combine with

        Returns:
            MatteResult with generated matte and metadata
        """
        if frame.dtype == np.uint8:
            frame = frame.astype(np.float32) / 255.0
        else:
            frame = frame.astype(np.float32)

        # Convert to HSL
        hsl = self._rgb_to_hsl(frame)
        h, s, lightness = hsl[:, :, 0], hsl[:, :, 1], hsl[:, :, 2]

        # Generate matte from each component
        hue_matte = self._qualify_hue(h, qualifier)
        sat_matte = self._qualify_saturation(s, qualifier)
        lum_matte = self._qualify_luminance(lightness, qualifier)

        # Combine mattes (multiply - all conditions must be met)
        new_matte = hue_matte * sat_matte * lum_matte

        # Apply global softness
        if qualifier.softness > 0:
            new_matte = self._apply_softness(new_matte, qualifier.softness)

        # Combine with existing matte based on mode
        if existing_matte is not None:
            if selection_mode == SelectionMode.ADD:
                new_matte = np.maximum(existing_matte, new_matte)
            elif selection_mode == SelectionMode.SUBTRACT:
                new_matte = existing_matte * (1 - new_matte)
            elif selection_mode == SelectionMode.INTERSECT:
                new_matte = existing_matte * new_matte
            # REPLACE is default - do nothing

        # Calculate coverage
        coverage = float(np.mean(new_matte) * 100)

        # Generate preview if needed
        preview = None
        if qualifier.show_matte:
            preview = self._create_matte_preview(frame, new_matte)

        # Cache
        self.current_qualifier = qualifier
        self.cached_matte = new_matte

        return MatteResult(matte=new_matte, preview=preview, coverage=coverage)

    def _rgb_to_hsl(self, frame: np.ndarray) -> np.ndarray:
        """Convert RGB to HSL color space"""
        hsl = np.zeros_like(frame)

        r, g, b = frame[:, :, 0], frame[:, :, 1], frame[:, :, 2]

        max_val = np.maximum(np.maximum(r, g), b)
        min_val = np.minimum(np.minimum(r, g), b)
        delta = max_val - min_val

        # Luminance
        lightness = (max_val + min_val) / 2
        hsl[:, :, 2] = lightness

        # Saturation
        s = np.where(
            lightness < 0.5,
            delta / (max_val + min_val + 1e-6),
            delta / (2 - max_val - min_val + 1e-6),
        )
        hsl[:, :, 1] = np.where(delta > 0, s, 0)

        # Hue
        mask = delta > 0

        # Red is max
        r_max = mask & (max_val == r)
        hsl[r_max, 0] = ((g[r_max] - b[r_max]) / delta[r_max]) % 6

        # Green is max
        g_max = mask & (max_val == g)
        hsl[g_max, 0] = (b[g_max] - r[g_max]) / delta[g_max] + 2

        # Blue is max
        b_max = mask & (max_val == b)
        hsl[b_max, 0] = (r[b_max] - g[b_max]) / delta[b_max] + 4

        # Normalize hue to 0-360
        hsl[:, :, 0] = (hsl[:, :, 0] * 60) % 360

        return hsl

    def _qualify_hue(self, hue: np.ndarray, qualifier: HSLQualifier) -> np.ndarray:
        """Generate matte based on hue range"""
        center = qualifier.hue_center
        width = qualifier.hue_width
        softness = qualifier.hue_softness

        # Calculate distance from center (handle wrap-around at 360)
        half_width = width / 2

        # Distance considering hue circle
        dist1 = np.abs(hue - center)
        dist2 = 360 - dist1
        dist = np.minimum(dist1, dist2)

        # Create matte with softness
        if softness > 0:
            # Smooth transition
            inner_mask = dist <= half_width
            outer_mask = dist > half_width + softness

            # Transition zone
            transition = (dist - half_width) / softness
            transition = np.clip(transition, 0, 1)

            matte = np.where(inner_mask, 1.0, np.where(outer_mask, 0.0, 1 - transition))
        else:
            matte = (dist <= half_width).astype(np.float32)

        return matte

    def _qualify_saturation(
        self, sat: np.ndarray, qualifier: HSLQualifier
    ) -> np.ndarray:
        """Generate matte based on saturation range"""
        low = qualifier.sat_low
        high = qualifier.sat_high
        soft_low = qualifier.sat_soft_low
        soft_high = qualifier.sat_soft_high

        matte = np.ones_like(sat)

        # Lower bound with softness
        if low > 0:
            if soft_low > 0:
                transition = np.clip((sat - (low - soft_low)) / soft_low, 0, 1)
                matte = matte * transition
            else:
                matte = matte * (sat >= low).astype(np.float32)

        # Upper bound with softness
        if high < 1:
            if soft_high > 0:
                transition = np.clip(((high + soft_high) - sat) / soft_high, 0, 1)
                matte = matte * transition
            else:
                matte = matte * (sat <= high).astype(np.float32)

        return matte

    def _qualify_luminance(
        self, lum: np.ndarray, qualifier: HSLQualifier
    ) -> np.ndarray:
        """Generate matte based on luminance range"""
        low = qualifier.lum_low
        high = qualifier.lum_high
        soft_low = qualifier.lum_soft_low
        soft_high = qualifier.lum_soft_high

        matte = np.ones_like(lum)

        # Lower bound with softness
        if low > 0:
            if soft_low > 0:
                transition = np.clip((lum - (low - soft_low)) / soft_low, 0, 1)
                matte = matte * transition
            else:
                matte = matte * (lum >= low).astype(np.float32)

        # Upper bound with softness
        if high < 1:
            if soft_high > 0:
                transition = np.clip(((high + soft_high) - lum) / soft_high, 0, 1)
                matte = matte * transition
            else:
                matte = matte * (lum <= high).astype(np.float32)

        return matte

    def _apply_softness(self, matte: np.ndarray, softness: float) -> np.ndarray:
        """Apply gaussian blur for softness"""
        if softness <= 0:
            return matte

        # Gaussian blur
        sigma = softness
        size = int(sigma * 3) * 2 + 1
        x = np.arange(size) - size // 2
        kernel = np.exp(-(x**2) / (2 * sigma**2))
        kernel = kernel / kernel.sum()

        # Apply 2D blur
        from scipy.ndimage import convolve1d

        matte = convolve1d(matte, kernel, axis=0, mode="reflect")
        matte = convolve1d(matte, kernel, axis=1, mode="reflect")

        return matte

    def _create_matte_preview(self, frame: np.ndarray, matte: np.ndarray) -> np.ndarray:
        """Create a preview showing the matte overlay"""
        # Create red overlay for unselected areas
        preview = frame.copy()

        # Dim unselected areas
        unselected = matte < 0.5
        preview[unselected] = preview[unselected] * 0.3

        # Add red tint to unselected areas
        preview[unselected, 0] = np.minimum(preview[unselected, 0] + 0.2, 1.0)

        return preview

    def refine_matte(
        self,
        matte: np.ndarray,
        softness: float = 0.0,
        shrink: int = 0,
        expand: int = 0,
        contrast: float = 0.0,
    ) -> np.ndarray:
        """
        Refine a matte with various operations.

        Args:
            matte: Input matte (H, W)
            softness: Blur amount for soft edges
            shrink: Erode matte (pixels)
            expand: Dilate matte (pixels)
            contrast: Increase contrast of matte edges

        Returns:
            Refined matte
        """
        refined = matte.copy()

        # Shrink (erode)
        if shrink > 0:
            refined = self._erode_matte(refined, shrink)

        # Expand (dilate)
        if expand > 0:
            refined = self._dilate_matte(refined, expand)

        # Softness (blur)
        if softness > 0:
            refined = self._apply_softness(refined, softness)

        # Contrast adjustment
        if contrast != 0:
            refined = np.clip((refined - 0.5) * (1 + contrast) + 0.5, 0, 1)

        return refined

    def _erode_matte(self, matte: np.ndarray, pixels: int) -> np.ndarray:
        """Erode (shrink) the matte"""
        try:
            from scipy.ndimage import binary_erosion

            kernel = np.ones((pixels * 2 + 1, pixels * 2 + 1))
            result = binary_erosion(matte > 0.5, structure=kernel)
            return result.astype(np.float32)
        except ImportError:
            # Fallback without scipy
            return matte

    def _dilate_matte(self, matte: np.ndarray, pixels: int) -> np.ndarray:
        """Dilate (expand) the matte"""
        try:
            from scipy.ndimage import binary_dilation

            kernel = np.ones((pixels * 2 + 1, pixels * 2 + 1))
            result = binary_dilation(matte > 0.5, structure=kernel)
            return result.astype(np.float32)
        except ImportError:
            # Fallback without scipy
            return matte

    def sample_color(
        self, frame: np.ndarray, points: List[Tuple[int, int]], radius: int = 5
    ) -> HSLQualifier:
        """
        Sample color from frame points and create a qualifier.

        Args:
            frame: Input frame
            points: List of (x, y) sample points
            radius: Sample radius around each point

        Returns:
            HSLQualifier configured from sampled colors
        """
        if frame.dtype == np.uint8:
            frame = frame.astype(np.float32) / 255.0

        hsl = self._rgb_to_hsl(frame)

        # Collect samples
        h_samples = []
        s_samples = []
        l_samples = []

        for x, y in points:
            x, y = int(x), int(y)
            x_min = max(0, x - radius)
            x_max = min(frame.shape[1], x + radius + 1)
            y_min = max(0, y - radius)
            y_max = min(frame.shape[0], y + radius + 1)

            h_samples.extend(hsl[y_min:y_max, x_min:x_max, 0].flatten())
            s_samples.extend(hsl[y_min:y_max, x_min:x_max, 1].flatten())
            l_samples.extend(hsl[y_min:y_max, x_min:x_max, 2].flatten())

        h_samples = np.array(h_samples)
        s_samples = np.array(s_samples)
        l_samples = np.array(l_samples)

        # Calculate ranges with some padding
        h_center = np.mean(h_samples)
        h_range = np.max(h_samples) - np.min(h_samples)

        s_low = max(0, np.min(s_samples) - 0.1)
        s_high = min(1, np.max(s_samples) + 0.1)

        l_low = max(0, np.min(l_samples) - 0.1)
        l_high = min(1, np.max(l_samples) + 0.1)

        return HSLQualifier(
            hue_center=h_center,
            hue_width=max(h_range / 2 + 10, 15),
            hue_softness=5,
            sat_low=s_low,
            sat_high=s_high,
            sat_soft_low=0.05,
            sat_soft_high=0.05,
            lum_low=l_low,
            lum_high=l_high,
            lum_soft_low=0.05,
            lum_soft_high=0.05,
        )

    def invert_matte(self, matte: np.ndarray) -> np.ndarray:
        """Invert a matte"""
        return 1.0 - matte

    def feather_edges(
        self, matte: np.ndarray, inner_feather: float = 0.0, outer_feather: float = 0.0
    ) -> np.ndarray:
        """
        Apply different feathering to inner and outer edges.

        Args:
            matte: Input matte
            inner_feather: Feather amount for inner (0->1) edge
            outer_feather: Feather amount for outer (1->0) edge

        Returns:
            Feathered matte
        """
        result = matte.copy()

        if inner_feather > 0:
            # Find inner edge and feather
            result = self._feather_edge(result, inner_feather, inside=True)

        if outer_feather > 0:
            # Find outer edge and feather
            result = self._feather_edge(result, outer_feather, inside=False)

        return result

    def _feather_edge(
        self, matte: np.ndarray, amount: float, inside: bool
    ) -> np.ndarray:
        """Feather one edge of the matte"""
        # Create expanded/contracted version
        if inside:
            contracted = self._erode_matte(matte, int(amount))
            return matte * contracted + (1 - matte) * contracted
        else:
            expanded = self._dilate_matte(matte, int(amount))
            return matte * expanded + (1 - matte) * matte

    def edge_detect(self, matte: np.ndarray) -> np.ndarray:
        """
        Detect edges of a matte.

        Returns a mask of the edge pixels.
        """
        try:
            from scipy.ndimage import sobel

            # Sobel edge detection
            sx = sobel(matte, axis=0, mode="constant")
            sy = sobel(matte, axis=1, mode="constant")

            edges = np.sqrt(sx**2 + sy**2)
            edges = edges / edges.max() if edges.max() > 0 else edges

            return edges
        except ImportError:
            # Fallback: simple difference
            dx = np.diff(matte, axis=1, prepend=matte[:, :1])
            dy = np.diff(matte, axis=0, prepend=matte[:1, :])
            return np.sqrt(dx**2 + dy**2)
