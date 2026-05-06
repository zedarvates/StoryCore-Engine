"""
Scopes Service - Professional Video Scopes for StoryCore-Engine

Implements professional video scopes inspired by DaVinci Resolve:
- Waveform (Luma, RGB, YUV)
- Vectorscope
- Histogram
- RGB Parade
- False Color

These scopes provide essential visual feedback for color grading.

Author: StoryCore Team
Version: 1.0.0
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from enum import Enum
import numpy as np
import logging

logger = logging.getLogger(__name__)


class ScopeType(Enum):
    """Types of video scopes available"""

    WAVEFORM_LUMA = "waveform_luma"
    WAVEFORM_RGB = "waveform_rgb"
    WAVEFORM_YUV = "waveform_yuv"
    VECTORSCOPE = "vectorscope"
    HISTOGRAM = "histogram"
    RGB_PARADE = "rgb_parade"
    FALSE_COLOR = "false_color"


class WaveformMode(Enum):
    """Waveform display modes"""

    LUMA = "luma"
    RGB = "rgb"
    YUV = "yuv"


@dataclass
class ScopesConfig:
    """Configuration for scope generation"""

    # Waveform settings
    waveform_height: int = 256
    waveform_brightness: float = 1.0

    # Vectorscope settings
    vectorscope_size: int = 256
    vectorscope_brightness: float = 1.0
    show_skin_line: bool = True

    # Histogram settings
    histogram_bins: int = 256
    histogram_log_scale: bool = True

    # General settings
    gpu_acceleration: bool = True


class ScopesService:
    """
    Professional video scopes service for color analysis.

    Provides real-time visual feedback for color grading:
    - Waveform monitors for exposure and contrast analysis
    - Vectorscope for color saturation and hue analysis
    - Histogram for tonal distribution
    - RGB Parade for individual channel analysis
    - False Color for exposure visualization

    Example usage:
        service = ScopesService()
        waveform = service.waveform(frame, mode='luma')
        vectorscope = service.vectorscope(frame)
    """

    # Standard IRE levels
    IRE_BLACK = 0.0
    IRE_WHITE = 100.0
    IRE_SUPER_BLACK = -7.5
    IRE_SUPER_WHITE = 109.0

    # Rec.709 luma coefficients
    LUMA_COEFFS = np.array([0.2126, 0.7152, 0.0722])

    # Color bars reference (for vectorscope calibration)
    COLOR_BARS_HUE = {
        "yellow": 60,
        "cyan": 180,
        "green": 120,
        "magenta": 300,
        "red": 0,
        "blue": 240,
    }

    def __init__(self, config: Optional[ScopesConfig] = None):
        """
        Initialize the scopes service.

        Args:
            config: Optional configuration for scope generation
        """
        self.config = config or ScopesConfig()

    def waveform(self, frame: np.ndarray, mode: str = "luma") -> np.ndarray:
        """
        Generate a waveform monitor display.

        Args:
            frame: Input frame as numpy array (H, W, 3) RGB
            mode: Waveform mode - 'luma', 'rgb', or 'yuv'

        Returns:
            Waveform image as numpy array (height, width, 3)
        """
        if frame.dtype == np.uint8:
            frame = frame.astype(np.float32) / 255.0
        else:
            frame = frame.astype(np.float32)

        # Get frame dimensions
        height, width = frame.shape[:2]

        # Output waveform dimensions
        wave_height = self.config.waveform_height
        wave_width = width

        # Initialize output
        waveform = np.zeros((wave_height, wave_width, 3), dtype=np.float32)

        if mode == "luma":
            # Calculate luma for each column
            luma = self._rgb_to_luma(frame)

            # Create histogram for each column
            for x in range(width):
                col_histogram = self._column_waveform(luma[:, x], wave_height)
                waveform[:, x, 0] = col_histogram
                waveform[:, x, 1] = col_histogram
                waveform[:, x, 2] = col_histogram

        elif mode == "rgb":
            # RGB overlay waveform
            colors = [(0, 1, 0, 0), (1, 0, 1, 0), (2, 0, 0, 1)]  # (channel, r, g, b)

            for channel, r, g, b in colors:
                for x in range(width):
                    col_histogram = self._column_waveform(
                        frame[:, x, channel], wave_height
                    )
                    waveform[:, x, 0] += col_histogram * r
                    waveform[:, x, 1] += col_histogram * g
                    waveform[:, x, 2] += col_histogram * b

        elif mode == "yuv":
            # YUV waveform (Y, U, V)
            yuv = self._rgb_to_yuv(frame)

            # Y channel (green)
            for x in range(width):
                col_histogram = self._column_waveform(yuv[:, x, 0], wave_height)
                waveform[:, x, 1] = col_histogram

            # U channel (blue)
            u_wave = np.zeros((wave_height, wave_width), dtype=np.float32)
            for x in range(width):
                u_wave[:, x] = self._column_waveform(
                    (yuv[:, x, 1] + 0.5) / 1.0, wave_height
                )
            waveform[:, :, 2] = np.maximum(waveform[:, :, 2], u_wave * 0.5)

            # V channel (red)
            for x in range(width):
                v_histogram = self._column_waveform(
                    (yuv[:, x, 2] + 0.5) / 1.0, wave_height
                )
                waveform[:, x, 0] = v_histogram * 0.5

        # Apply brightness
        waveform *= self.config.waveform_brightness

        # Add graticule (reference lines)
        waveform = self._add_waveform_graticule(waveform)

        return np.clip(waveform, 0, 1)

    def _column_waveform(self, column: np.ndarray, output_height: int) -> np.ndarray:
        """
        Generate waveform for a single column.

        Creates a vertical histogram showing pixel value distribution.
        """
        # Create histogram bins
        histogram = np.zeros(output_height, dtype=np.float32)

        # Scale values to output height
        indices = np.clip(column * (output_height - 1), 0, output_height - 1).astype(
            int
        )

        # Count occurrences
        for idx in indices:
            histogram[output_height - 1 - idx] += 1

        # Normalize
        if histogram.max() > 0:
            histogram = histogram / histogram.max()

        # Apply gaussian blur for smoother display
        histogram = self._gaussian_blur_1d(histogram, sigma=1.5)

        return histogram

    def _gaussian_blur_1d(self, data: np.ndarray, sigma: float = 1.0) -> np.ndarray:
        """Apply 1D gaussian blur"""
        size = int(sigma * 3) * 2 + 1
        x = np.arange(size) - size // 2
        kernel = np.exp(-(x**2) / (2 * sigma**2))
        kernel = kernel / kernel.sum()

        return np.convolve(data, kernel, mode="same")

    def _add_waveform_graticule(self, waveform: np.ndarray) -> np.ndarray:
        """Add reference lines to waveform"""
        height = waveform.shape[0]

        # Add 0% and 100% IRE lines
        waveform[0, :, :] = np.maximum(waveform[0, :, :], 0.3)  # 0 IRE
        waveform[height - 1, :, :] = np.maximum(
            waveform[height - 1, :, :], 0.3
        )  # 100 IRE

        # Add 50% gray line
        mid = height // 2
        waveform[mid, :, :] = np.maximum(waveform[mid, :, :], 0.2)

        return waveform

    def vectorscope(self, frame: np.ndarray, size: Optional[int] = None) -> np.ndarray:
        """
        Generate a vectorscope display.

        Shows color saturation (distance from center) and hue (angle).

        Args:
            frame: Input frame as numpy array (H, W, 3) RGB
            size: Output size (default from config)

        Returns:
            Vectorscope image as numpy array (size, size, 3)
        """
        if frame.dtype == np.uint8:
            frame = frame.astype(np.float32) / 255.0
        else:
            frame = frame.astype(np.float32)

        size = size or self.config.vectorscope_size

        # Convert RGB to YCbCr (similar to YUV but standard for vectorscope)
        y, cb, cr = self._rgb_to_ycbcr(frame)

        # Scale Cb and Cr to vectorscope coordinates
        # Cb is horizontal (blue-yellow axis)
        # Cr is vertical (red-cyan axis)

        # Initialize vectorscope
        vectorscope = np.zeros((size, size, 3), dtype=np.float32)

        # Calculate center and scale
        center = size // 2
        scale = (size // 2) - 10  # Leave margin for graticule

        # Map Cb, Cr to vectorscope coordinates
        # Cb: -0.5 to 0.5 -> 0 to size
        # Cr: -0.5 to 0.5 -> 0 to size (inverted Y for image coordinates)

        # Flatten arrays for faster processing
        cb_flat = cb.flatten()
        cr_flat = cr.flatten()

        # Calculate polar coordinates for binning
        x_coords = np.clip(center + cb_flat * scale * 2, 0, size - 1).astype(int)
        y_coords = np.clip(center - cr_flat * scale * 2, 0, size - 1).astype(int)

        # Bin the values
        for x, y in zip(x_coords, y_coords):
            vectorscope[y, x, 1] += 1  # Green channel for display

        # Normalize
        if vectorscope[:, :, 1].max() > 0:
            vectorscope[:, :, 1] = vectorscope[:, :, 1] / vectorscope[:, :, 1].max()

        # Apply brightness
        vectorscope *= self.config.vectorscope_brightness

        # Add graticule with color references
        vectorscope = self._add_vectorscope_graticule(vectorscope)

        return np.clip(vectorscope, 0, 1)

    def _add_vectorscope_graticule(self, vectorscope: np.ndarray) -> np.ndarray:
        """Add reference circles and color targets to vectorscope"""
        size = vectorscope.shape[0]
        center = size // 2

        # Create coordinate grids
        y, x = np.ogrid[:size, :size]
        dist = np.sqrt((x - center) ** 2 + (y - center) ** 2)

        # Draw circles at 25%, 50%, 75%, 100%
        for radius_pct in [0.25, 0.5, 0.75, 1.0]:
            radius = (size // 2 - 10) * radius_pct
            circle_mask = np.abs(dist - radius) < 1
            vectorscope[circle_mask, :] = np.maximum(
                vectorscope[circle_mask, :], [0.3, 0.3, 0.3]
            )

        # Add skin tone line (approximately 123 degrees on vectorscope)
        if self.config.show_skin_line:
            angle = np.radians(123)
            length = size // 2 - 20
            for r in range(length):
                x = int(center + r * np.cos(angle))
                y = int(center - r * np.sin(angle))
                if 0 <= x < size and 0 <= y < size:
                    vectorscope[y, x, :] = np.maximum(
                        vectorscope[y, x, :], [0.5, 0.3, 0.3]
                    )

        # Add color targets at standard positions
        colors_hue = [
            (0, [1, 0, 0]),  # Red
            (60, [1, 1, 0]),  # Yellow
            (120, [0, 1, 0]),  # Green
            (180, [0, 1, 1]),  # Cyan
            (240, [0, 0, 1]),  # Blue
            (300, [1, 0, 1]),  # Magenta
        ]

        radius = (size // 2 - 10) * 0.75  # 75% radius for color targets
        for hue_deg, color in colors_hue:
            angle = np.radians(hue_deg - 90)  # Adjust for image coordinates
            x = int(center + radius * np.cos(angle))
            y = int(center + radius * np.sin(angle))

            # Draw small target
            for dx in range(-3, 4):
                for dy in range(-3, 4):
                    if 0 <= x + dx < size and 0 <= y + dy < size:
                        vectorscope[y + dy, x + dx, :] = np.maximum(
                            vectorscope[y + dy, x + dx, :], color
                        )

        return vectorscope

    def histogram(
        self, frame: np.ndarray, mode: str = "luma", bins: Optional[int] = None
    ) -> np.ndarray:
        """
        Generate a histogram display.

        Args:
            frame: Input frame as numpy array (H, W, 3) RGB
            mode: Histogram mode - 'luma' or 'rgb'
            bins: Number of histogram bins (default from config)

        Returns:
            Histogram image as numpy array (height, bins, 3)
        """
        if frame.dtype == np.uint8:
            frame = frame.astype(np.float32) / 255.0
        else:
            frame = frame.astype(np.float32)

        bins = bins or self.config.histogram_bins
        height = bins  # Make histogram square-ish

        # Initialize output
        histogram_img = np.zeros((height, bins, 3), dtype=np.float32)

        if mode == "luma":
            # Luma histogram
            luma = self._rgb_to_luma(frame)
            hist, _ = np.histogram(luma, bins=bins, range=(0, 1))

            # Normalize
            if hist.max() > 0:
                hist = hist / hist.max()

            # Apply log scale if enabled
            if self.config.histogram_log_scale:
                hist = np.log1p(hist * 100) / np.log1p(100)

            # Draw histogram
            for i, val in enumerate(hist):
                bar_height = int(val * (height - 1))
                histogram_img[height - bar_height :, i, :] = [1, 1, 1]

        elif mode == "rgb":
            # RGB overlay histogram
            colors = [(0, [1, 0, 0]), (1, [0, 1, 0]), (2, [0, 0, 1])]

            for channel, color in colors:
                hist, _ = np.histogram(frame[:, :, channel], bins=bins, range=(0, 1))

                if hist.max() > 0:
                    hist = hist / hist.max()

                if self.config.histogram_log_scale:
                    hist = np.log1p(hist * 100) / np.log1p(100)

                # Draw histogram
                for i, val in enumerate(hist):
                    bar_height = int(val * (height - 1))
                    histogram_img[height - bar_height :, i, :] = np.maximum(
                        histogram_img[height - bar_height :, i, :], color
                    )

        return histogram_img

    def rgb_parade(self, frame: np.ndarray) -> np.ndarray:
        """
        Generate an RGB Parade display.

        Shows waveform for each RGB channel side by side.

        Args:
            frame: Input frame as numpy array (H, W, 3) RGB

        Returns:
            RGB Parade image as numpy array
        """
        if frame.dtype == np.uint8:
            frame = frame.astype(np.float32) / 255.0
        else:
            frame = frame.astype(np.float32)

        height, width = frame.shape[:2]
        wave_height = self.config.waveform_height

        # Each channel gets 1/3 of the width
        channel_width = width

        # Initialize output (3 channels side by side)
        parade = np.zeros((wave_height, channel_width * 3, 3), dtype=np.float32)

        # Generate waveform for each channel
        for ch in range(3):
            start_x = ch * channel_width

            # Calculate waveform for this channel
            for x in range(channel_width):
                col_histogram = self._column_waveform(frame[:, x, ch], wave_height)

                # Set appropriate color
                if ch == 0:
                    parade[:, start_x + x, 0] = col_histogram
                elif ch == 1:
                    parade[:, start_x + x, 1] = col_histogram
                else:
                    parade[:, start_x + x, 2] = col_histogram

        # Add separator lines
        for ch in range(1, 3):
            sep_x = ch * channel_width
            parade[:, sep_x - 2 : sep_x + 2, :] = 0.3

        # Add graticules
        parade = self._add_waveform_graticule(parade)

        return parade

    def false_color(self, frame: np.ndarray, preset: str = "default") -> np.ndarray:
        """
        Generate a false color display for exposure analysis.

        Maps luminance values to specific colors for easy exposure reading.

        Args:
            frame: Input frame as numpy array (H, W, 3) RGB
            preset: Color preset - 'default', 'ELZONE', 'arri'

        Returns:
            False color image as numpy array
        """
        if frame.dtype == np.uint8:
            frame = frame.astype(np.float32) / 255.0
        else:
            frame = frame.astype(np.float32)

        # Calculate luma
        luma = self._rgb_to_luma(frame)

        # Initialize output
        false_color = np.zeros_like(frame)

        # Define color mapping (standard false color scale)
        if preset == "default":
            # Standard video false color scale
            color_map = [
                (0.00, [0.0, 0.0, 0.5]),  # Below 0%: Dark Blue
                (0.05, [0.0, 0.0, 1.0]),  # 0-5%: Blue
                (0.10, [0.0, 0.5, 1.0]),  # 5-10%: Light Blue
                (0.20, [0.0, 1.0, 1.0]),  # 10-20%: Cyan
                (0.30, [0.0, 1.0, 0.5]),  # 20-30%: Cyan-Green
                (0.40, [0.0, 1.0, 0.0]),  # 30-40%: Green
                (0.50, [0.5, 1.0, 0.0]),  # 40-50%: Yellow-Green
                (0.60, [1.0, 1.0, 0.0]),  # 50-60%: Yellow
                (0.70, [1.0, 0.5, 0.0]),  # 60-70%: Orange
                (0.80, [1.0, 0.0, 0.0]),  # 70-80%: Red
                (0.90, [1.0, 0.0, 0.5]),  # 80-90%: Pink
                (0.95, [1.0, 0.0, 1.0]),  # 90-95%: Magenta
                (1.00, [1.0, 1.0, 1.0]),  # 95-100%: White
                (1.10, [1.0, 1.0, 1.0]),  # Over 100%: White (clipped)
            ]
        elif preset == "ELZONE":
            # Zone system based (Ansel Adams inspired)
            zones = [
                (0.0, [0.0, 0.0, 0.0]),  # Zone 0: Black
                (0.14, [0.2, 0.2, 0.4]),  # Zone I
                (0.28, [0.3, 0.3, 0.6]),  # Zone II
                (0.42, [0.4, 0.5, 0.7]),  # Zone III
                (0.50, [0.5, 0.7, 0.5]),  # Zone IV (middle gray)
                (0.62, [0.7, 0.8, 0.4]),  # Zone V
                (0.76, [0.9, 0.8, 0.3]),  # Zone VI
                (0.87, [0.95, 0.6, 0.2]),  # Zone VII
                (0.95, [1.0, 0.4, 0.2]),  # Zone VIII
                (1.0, [1.0, 1.0, 1.0]),  # Zone IX: White
            ]
            color_map = zones
        else:  # arri style
            color_map = [
                (0.0, [0.0, 0.0, 0.0]),
                (0.18, [0.0, 0.0, 1.0]),  # Middle gray: Blue
                (0.5, [0.0, 1.0, 0.0]),  # Midtones: Green
                (0.75, [1.0, 1.0, 0.0]),  # Highlights: Yellow
                (0.9, [1.0, 0.5, 0.0]),  # Bright: Orange
                (1.0, [1.0, 0.0, 0.0]),  # Clipped: Red
            ]

        # Apply color mapping
        for i in range(len(color_map) - 1):
            low_val, low_color = color_map[i]
            high_val, high_color = color_map[i + 1]

            mask = (luma >= low_val) & (luma < high_val)

            if mask.any():
                # Linear interpolation between colors
                t = (luma[mask] - low_val) / (high_val - low_val + 1e-6)

                for c in range(3):
                    false_color[mask, c] = low_color[c] + t * (
                        high_color[c] - low_color[c]
                    )

        # Handle values above 1.0 (clipped)
        clipped_mask = luma >= 1.0
        false_color[clipped_mask] = [1.0, 0.0, 0.0]  # Red for clipped

        return false_color

    def _rgb_to_luma(self, frame: np.ndarray) -> np.ndarray:
        """Convert RGB to luma using Rec.709 coefficients"""
        return np.dot(frame, self.LUMA_COEFFS)

    def _rgb_to_yuv(self, frame: np.ndarray) -> np.ndarray:
        """
        Convert RGB to YUV color space using Rec.709 coefficients.

        Formula:
        Y = 0.2126R + 0.7152G + 0.0722B
        U = (B - Y) / 1.8556
        V = (R - Y) / 1.5748
        """
        y = self._rgb_to_luma(frame)

        # Rec.709 U and V scaling factors
        u = (frame[:, :, 2] - y) / 1.8556
        v = (frame[:, :, 0] - y) / 1.5748

        return np.stack([y, u, v], axis=-1)

    def _rgb_to_ycbcr(
        self, frame: np.ndarray
    ) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Convert RGB to YCbCr color space (for vectorscope)"""
        # Rec.709 YCbCr
        y = np.dot(frame, [0.2126, 0.7152, 0.0722])
        cb = (frame[:, :, 2] - y) * 0.5 / (1 - 0.0722)
        cr = (frame[:, :, 0] - y) * 0.5 / (1 - 0.2126)
        return y, cb, cr

    def analyze_exposure(self, frame: np.ndarray) -> Dict:
        """
        Analyze exposure and provide statistics.

        Args:
            frame: Input frame as numpy array

        Returns:
            Dictionary with exposure statistics
        """
        if frame.dtype == np.uint8:
            frame = frame.astype(np.float32) / 255.0

        luma = self._rgb_to_luma(frame)

        return {
            "mean_luma": float(np.mean(luma)),
            "median_luma": float(np.median(luma)),
            "min_luma": float(np.min(luma)),
            "max_luma": float(np.max(luma)),
            "std_luma": float(np.std(luma)),
            "clipped_high": float(np.mean(luma >= 1.0) * 100),
            "clipped_low": float(np.mean(luma <= 0.0) * 100),
            "dynamic_range": float(np.max(luma) - np.min(luma)),
        }

    def analyze_color(self, frame: np.ndarray) -> Dict:
        """
        Analyze color distribution.

        Args:
            frame: Input frame as numpy array

        Returns:
            Dictionary with color statistics
        """
        if frame.dtype == np.uint8:
            frame = frame.astype(np.float32) / 255.0

        # Calculate average RGB
        rgb_mean = [float(np.mean(frame[:, :, i])) for i in range(3)]

        # Calculate saturation average
        hsv = self._rgb_to_hsv(frame)
        avg_saturation = float(np.mean(hsv[:, :, 1]))

        # Calculate dominant hue
        hsv_saturated = hsv[:, :, 1] > 0.1  # Only consider saturated pixels
        if hsv_saturated.any():
            dominant_hue = float(np.median(hsv[hsv_saturated, 0]) * 360)
        else:
            dominant_hue = 0.0

        return {
            "rgb_mean": rgb_mean,
            "avg_saturation": avg_saturation,
            "dominant_hue": dominant_hue,
            "color_cast": self._detect_color_cast(rgb_mean),
        }

    def _detect_color_cast(self, rgb_mean: List[float]) -> str:
        """Detect if there's a color cast"""
        diff_r_g = rgb_mean[0] - rgb_mean[1]
        diff_b_g = rgb_mean[2] - rgb_mean[1]

        threshold = 0.05

        if diff_r_g > threshold:
            return "red"
        elif -diff_r_g > threshold:
            return "green"
        elif diff_b_g > threshold:
            return "blue"
        elif -diff_b_g > threshold:
            return "yellow"
        else:
            return "neutral"

    def _rgb_to_hsv(self, frame: np.ndarray) -> np.ndarray:
        """Convert RGB to HSV color space"""
        hsv = np.zeros_like(frame)

        r, g, b = frame[:, :, 0], frame[:, :, 1], frame[:, :, 2]

        max_val = np.maximum(np.maximum(r, g), b)
        min_val = np.minimum(np.minimum(r, g), b)
        delta = max_val - min_val

        hsv[:, :, 2] = max_val
        hsv[:, :, 1] = np.where(max_val != 0, delta / max_val, 0)

        mask = delta != 0

        r_max = mask & (max_val == r)
        hsv[r_max, 0] = ((g[r_max] - b[r_max]) / delta[r_max]) % 6

        g_max = mask & (max_val == g)
        hsv[g_max, 0] = (b[g_max] - r[g_max]) / delta[g_max] + 2

        b_max = mask & (max_val == b)
        hsv[b_max, 0] = (r[b_max] - g[b_max]) / delta[b_max] + 4

        hsv[:, :, 0] = (hsv[:, :, 0] / 6.0) % 1.0

        return hsv
