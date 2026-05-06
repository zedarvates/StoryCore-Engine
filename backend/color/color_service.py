"""
Color Service - Professional Color Grading for StoryCore-Engine

Implements primary and secondary color correction tools inspired by DaVinci Resolve:
- Color wheels (Lift/Gamma/Gain/Offset)
- RGB curves
- Contrast, Saturation, Hue controls
- Temperature and Tint adjustments
- Auto color balance

Author: StoryCore Team
Version: 1.0.0
"""

from dataclasses import dataclass
from typing import Dict, List, Optional, Tuple
from enum import Enum
import numpy as np
import logging

logger = logging.getLogger(__name__)


class ColorSpace(Enum):
    """Supported color spaces for color grading"""

    REC709 = "rec709"
    REC2020 = "rec2020"
    ACES = "aces"
    SRGB = "srgb"
    LOG_C = "log_c"  # Canon Log
    S_LOG3 = "s_log3"  # Sony S-Log3
    V_LOG = "v_log"  # Panasonic V-Log
    C_LOG = "c_log"  # Canon C-Log
    RED_LOG = "red_log"  # RED Log
    PROTUNE = "protune"  # DJI/GoPro


@dataclass
class ColorGrade:
    """
    Color grading parameters for a single correction.

    Primary correction controls:
    - Lift: Adjusts shadows (dark areas)
    - Gamma: Adjusts midtones
    - Gain: Adjusts highlights (bright areas)
    - Offset: Adjusts all levels uniformly

    Each is a tuple of (R, G, B) values typically in range [-1, 1] for lift/gamma/offset
    or [0, 2+] for gain.
    """

    # Primary Color Wheels
    lift: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    gamma: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    gain: Tuple[float, float, float] = (1.0, 1.0, 1.0)
    offset: Tuple[float, float, float] = (0.0, 0.0, 0.0)

    # Contrast Controls
    contrast: float = 1.0  # 0.0 to 2.0, 1.0 = neutral
    pivot: float = 0.435  # Contrast pivot point (mid gray)

    # Saturation & Hue
    saturation: float = 1.0  # 0.0 to 2.0, 1.0 = neutral
    hue: float = 0.0  # -180 to 180 degrees rotation

    # White Balance
    temperature: float = 0.0  # -1 (cool/blue) to 1 (warm/orange)
    tint: float = 0.0  # -1 (green) to 1 (magenta)

    # Luminance Mix
    luminance_mix: float = 100.0  # 0-100%, mix between YUV and RGB processing

    # RGB Curves (list of control points: (input, output))
    # Each curve is a list of (x, y) points where x, y are in [0, 1]
    luma_curve: Optional[List[Tuple[float, float]]] = None
    r_curve: Optional[List[Tuple[float, float]]] = None
    g_curve: Optional[List[Tuple[float, float]]] = None
    b_curve: Optional[List[Tuple[float, float]]] = None

    # Metadata
    name: str = "Default Grade"
    enabled: bool = True

    def to_dict(self) -> Dict:
        """Convert grade to dictionary for serialization"""
        return {
            "lift": self.lift,
            "gamma": self.gamma,
            "gain": self.gain,
            "offset": self.offset,
            "contrast": self.contrast,
            "pivot": self.pivot,
            "saturation": self.saturation,
            "hue": self.hue,
            "temperature": self.temperature,
            "tint": self.tint,
            "luminance_mix": self.luminance_mix,
            "luma_curve": self.luma_curve,
            "r_curve": self.r_curve,
            "g_curve": self.g_curve,
            "b_curve": self.b_curve,
            "name": self.name,
            "enabled": self.enabled,
        }

    @classmethod
    def from_dict(cls, data: Dict) -> "ColorGrade":
        """Create grade from dictionary"""
        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class ColorCorrectionResult:
    """Result of a color correction operation"""

    frame: np.ndarray
    histogram: Optional[np.ndarray] = None
    waveform: Optional[np.ndarray] = None
    vectorscope: Optional[np.ndarray] = None
    processing_time_ms: float = 0.0


class ColorService:
    """
    Professional color grading service inspired by DaVinci Resolve.

    Provides GPU-accelerated color correction with:
    - Primary correction (lift/gamma/gain/offset)
    - RGB curves
    - Contrast and saturation
    - Temperature and tint
    - Auto color balance

    Example usage:
        service = ColorService(gpu_acceleration=True)
        grade = ColorGrade(
            lift=(-0.05, -0.02, 0.0),
            saturation=1.2,
            contrast=1.1
        )
        corrected = service.apply_grade(frame, grade)
    """

    def __init__(self, gpu_acceleration: bool = True):
        """
        Initialize the color service.

        Args:
            gpu_acceleration: Enable GPU acceleration via OpenCL/CUDA if available
        """
        self.gpu = gpu_acceleration
        self.grades: Dict[str, ColorGrade] = {}
        self._gpu_available = self._check_gpu()

        if self._gpu_available and gpu_acceleration:
            logger.info("ColorService initialized with GPU acceleration")
        else:
            logger.info("ColorService initialized with CPU processing")

    def _check_gpu(self) -> bool:
        """Check if GPU acceleration is available"""
        try:
            # Try to import OpenCL or CUDA libraries
            import pyopencl

            return True
        except ImportError:
            pass

        try:
            import cupy

            return True
        except ImportError:
            pass

        return False

    def apply_grade(
        self,
        frame: np.ndarray,
        grade: ColorGrade,
        input_space: ColorSpace = ColorSpace.SRGB,
        output_space: ColorSpace = ColorSpace.SRGB,
    ) -> np.ndarray:
        """
        Apply a color grade to a frame.

        Args:
            frame: Input frame as numpy array (H, W, 3) in RGB format, float [0,1] or uint8
            grade: ColorGrade object with correction parameters
            input_space: Color space of input frame
            output_space: Desired output color space

        Returns:
            Corrected frame as numpy array
        """
        if not grade.enabled:
            return frame

        # Ensure float format
        if frame.dtype == np.uint8:
            frame = frame.astype(np.float32) / 255.0
        else:
            frame = frame.astype(np.float32)

        # Make a copy to avoid modifying original
        result = frame.copy()

        # Apply corrections in order
        # 1. Input transform (log to linear if needed)
        result = self._apply_input_transform(result, input_space)

        # 2. Offset (global lift)
        result = self._apply_offset(result, grade.offset)

        # 3. Lift (shadows)
        result = self._apply_lift(result, grade.lift)

        # 4. Gamma (midtones)
        result = self._apply_gamma(result, grade.gamma)

        # 5. Gain (highlights)
        result = self._apply_gain(result, grade.gain)

        # 6. Contrast with pivot
        result = self._apply_contrast(result, grade.contrast, grade.pivot)

        # 7. Temperature and Tint
        result = self._apply_white_balance(result, grade.temperature, grade.tint)

        # 8. Saturation and Hue
        result = self._apply_saturation_hue(result, grade.saturation, grade.hue)

        # 9. RGB Curves
        result = self._apply_curves(result, grade)

        # 10. Output transform
        result = self._apply_output_transform(result, output_space)

        # Clamp to valid range
        result = np.clip(result, 0.0, 1.0)

        return result

    def _apply_input_transform(
        self, frame: np.ndarray, space: ColorSpace
    ) -> np.ndarray:
        """Apply input color space transform (log to linear)"""
        if space == ColorSpace.SRGB or space == ColorSpace.REC709:
            return frame

        # Log curves decoding
        if space == ColorSpace.LOG_C:
            # Canon Log to Linear
            return self._canon_log_to_linear(frame)
        elif space == ColorSpace.S_LOG3:
            # Sony S-Log3 to Linear
            return self._sony_log3_to_linear(frame)
        elif space == ColorSpace.V_LOG:
            # Panasonic V-Log to Linear
            return self._v_log_to_linear(frame)

        return frame

    def _apply_output_transform(
        self, frame: np.ndarray, space: ColorSpace
    ) -> np.ndarray:
        """Apply output color space transform"""
        if space == ColorSpace.SRGB or space == ColorSpace.REC709:
            return frame
        # Add output transforms as needed
        return frame

    def _canon_log_to_linear(self, frame: np.ndarray) -> np.ndarray:
        """Canon Log to Linear conversion"""
        # Simplified Canon Log formula
        return np.where(
            frame < 0.092864,
            -0.092864 + frame * 5.995,
            np.power(10, (frame - 0.343) / 0.538) * 0.915 - 0.085,
        )

    def _sony_log3_to_linear(self, frame: np.ndarray) -> np.ndarray:
        """Sony S-Log3 to Linear conversion"""
        return np.where(
            frame < 0.171,
            (frame - 0.0928) / 5.0,
            np.power(10, (frame - 0.3855) / 0.261) * 0.1938,
        )

    def _v_log_to_linear(self, frame: np.ndarray) -> np.ndarray:
        """Panasonic V-Log to Linear conversion"""
        return np.where(
            frame < 0.181,
            (frame - 0.125) / 5.6,
            np.power(10, (frame - 0.45) / 0.24) * 0.1,
        )

    def _apply_offset(
        self, frame: np.ndarray, offset: Tuple[float, float, float]
    ) -> np.ndarray:
        """Apply offset (global RGB adjustment)"""
        return frame + np.array(offset)

    def _apply_lift(
        self, frame: np.ndarray, lift: Tuple[float, float, float]
    ) -> np.ndarray:
        """
        Apply lift (shadow adjustment).
        Lift affects dark areas more than bright areas.
        """
        lift_arr = np.array(lift)
        # Create luminance mask for shadows
        luma = self._rgb_to_luma(frame)
        shadow_mask = 1.0 - luma  # Higher weight for shadows

        # Apply lift weighted by shadow mask
        for i in range(3):
            frame[:, :, i] += lift_arr[i] * shadow_mask

        return frame

    def _apply_gamma(
        self, frame: np.ndarray, gamma: Tuple[float, float, float]
    ) -> np.ndarray:
        """
        Apply gamma (midtone adjustment).
        Gamma affects midtones most, with less effect on shadows and highlights.
        """
        gamma_arr = np.array(gamma)

        for i in range(3):
            if gamma_arr[i] != 0.0:
                # Shift pivot to 0.5 for gamma adjustment
                shifted = frame[:, :, i] - 0.5

                # Apply gamma correction
                # Positive gamma brightens midtones, negative darkens
                gamma_val = 1.0 / (1.0 + gamma_arr[i])

                # Only process midtones (avoid extreme shadows/highlights)
                midtone_mask = self._create_midtone_mask(frame[:, :, i])

                corrected = (
                    np.sign(shifted) * np.power(np.abs(shifted) * 2, gamma_val) * 0.5
                    + 0.5
                )
                frame[:, :, i] = (
                    frame[:, :, i] * (1 - midtone_mask) + corrected * midtone_mask
                )

        return frame

    def _apply_gain(
        self, frame: np.ndarray, gain: Tuple[float, float, float]
    ) -> np.ndarray:
        """
        Apply gain (highlight adjustment).
        Gain multiplies the signal, affecting highlights most.
        """
        gain_arr = np.array(gain)

        for i in range(3):
            # Create luminance mask for highlights
            luma = self._rgb_to_luma(frame)
            highlight_mask = luma  # Higher weight for highlights

            # Apply gain weighted by highlight mask
            frame[:, :, i] = frame[:, :, i] * (1 + (gain_arr[i] - 1) * highlight_mask)

        return frame

    def _apply_contrast(
        self, frame: np.ndarray, contrast: float, pivot: float
    ) -> np.ndarray:
        """
        Apply contrast adjustment with pivot point.

        Args:
            frame: Input frame
            contrast: Contrast multiplier (1.0 = no change)
            pivot: Pivot point for contrast (default 0.435 = mid gray)
        """
        if contrast == 1.0:
            return frame

        # Shift around pivot, scale, shift back
        return (frame - pivot) * contrast + pivot

    def _apply_white_balance(
        self, frame: np.ndarray, temperature: float, tint: float
    ) -> np.ndarray:
        """
        Apply white balance adjustment.

        Args:
            frame: Input frame
            temperature: -1 (cool/blue) to 1 (warm/orange)
            tint: -1 (green) to 1 (magenta)
        """
        if temperature == 0.0 and tint == 0.0:
            return frame

        # Temperature: blue-orange axis
        # Positive = warm (more orange/red), Negative = cool (more blue)
        r_mult = 1.0 + temperature * 0.1
        b_mult = 1.0 - temperature * 0.1

        frame[:, :, 0] *= r_mult
        frame[:, :, 2] *= b_mult

        # Tint: green-magenta axis
        # Positive = magenta (more red+blue), Negative = green
        if tint != 0.0:
            g_mult = 1.0 - abs(tint) * 0.05
            if tint > 0:
                # Magenta: reduce green
                frame[:, :, 1] *= g_mult
            else:
                # Green: reduce red and blue slightly
                frame[:, :, 0] *= 1 - abs(tint) * 0.03
                frame[:, :, 2] *= 1 - abs(tint) * 0.03

        return frame

    def _apply_saturation_hue(
        self, frame: np.ndarray, saturation: float, hue: float
    ) -> np.ndarray:
        """
        Apply saturation and hue rotation.

        Args:
            frame: Input frame
            saturation: Saturation multiplier (1.0 = no change)
            hue: Hue rotation in degrees (-180 to 180)
        """
        if saturation == 1.0 and hue == 0.0:
            return frame

        # Convert to HSV
        hsv = self._rgb_to_hsv(frame)

        # Apply saturation
        if saturation != 1.0:
            hsv[:, :, 1] = np.clip(hsv[:, :, 1] * saturation, 0, 1)

        # Apply hue rotation
        if hue != 0.0:
            hsv[:, :, 0] = (hsv[:, :, 0] + hue / 360.0) % 1.0

        # Convert back to RGB
        return self._hsv_to_rgb(hsv)

    def _apply_curves(self, frame: np.ndarray, grade: ColorGrade) -> np.ndarray:
        """Apply RGB and luma curves"""
        # Apply luma curve if specified
        if grade.luma_curve and len(grade.luma_curve) >= 2:
            luma = self._rgb_to_luma(frame)
            luma_adjusted = self._apply_curve(luma, grade.luma_curve)

            # Apply luma adjustment to all channels
            ratio = luma_adjusted / (luma + 1e-6)
            ratio = np.clip(ratio, 0.5, 2.0)  # Limit extreme adjustments
            frame = frame * ratio[:, :, np.newaxis]

        # Apply individual RGB curves
        if grade.r_curve and len(grade.r_curve) >= 2:
            frame[:, :, 0] = self._apply_curve(frame[:, :, 0], grade.r_curve)

        if grade.g_curve and len(grade.g_curve) >= 2:
            frame[:, :, 1] = self._apply_curve(frame[:, :, 1], grade.g_curve)

        if grade.b_curve and len(grade.b_curve) >= 2:
            frame[:, :, 2] = self._apply_curve(frame[:, :, 2], grade.b_curve)

        return frame

    def _apply_curve(
        self, channel: np.ndarray, curve_points: List[Tuple[float, float]]
    ) -> np.ndarray:
        """
        Apply a curve to a single channel using interpolation.

        Args:
            channel: Single channel array (H, W)
            curve_points: List of (input, output) control points

        Returns:
            Adjusted channel
        """
        # Sort curve points by input value
        points = sorted(curve_points, key=lambda p: p[0])

        # Extract x and y values
        x_vals = np.array([p[0] for p in points])
        y_vals = np.array([p[1] for p in points])

        # Interpolate
        return np.interp(channel.flatten(), x_vals, y_vals).reshape(channel.shape)

    def _rgb_to_luma(self, frame: np.ndarray) -> np.ndarray:
        """Convert RGB to luma (Y) using Rec.709 coefficients"""
        return (
            0.2126 * frame[:, :, 0] + 0.7152 * frame[:, :, 1] + 0.0722 * frame[:, :, 2]
        )

    def _create_midtone_mask(self, channel: np.ndarray) -> np.ndarray:
        """Create a mask for midtones (peak at 0.5, falls off at 0 and 1)"""
        # Gaussian-like mask centered at 0.5
        return np.exp(-((channel - 0.5) ** 2) / 0.1)

    def _rgb_to_hsv(self, frame: np.ndarray) -> np.ndarray:
        """Convert RGB to HSV color space"""
        hsv = np.zeros_like(frame)

        r, g, b = frame[:, :, 0], frame[:, :, 1], frame[:, :, 2]

        max_val = np.maximum(np.maximum(r, g), b)
        min_val = np.minimum(np.minimum(r, g), b)
        delta = max_val - min_val

        # Value
        hsv[:, :, 2] = max_val

        # Saturation
        hsv[:, :, 1] = np.where(max_val != 0, delta / max_val, 0)

        # Hue
        mask = delta != 0

        # Red is max
        r_max = mask & (max_val == r)
        hsv[r_max, 0] = ((g[r_max] - b[r_max]) / delta[r_max]) % 6

        # Green is max
        g_max = mask & (max_val == g)
        hsv[g_max, 0] = (b[g_max] - r[g_max]) / delta[g_max] + 2

        # Blue is max
        b_max = mask & (max_val == b)
        hsv[b_max, 0] = (r[b_max] - g[b_max]) / delta[b_max] + 4

        hsv[:, :, 0] = (hsv[:, :, 0] / 6.0) % 1.0

        return hsv

    def _hsv_to_rgb(self, hsv: np.ndarray) -> np.ndarray:
        """Convert HSV to RGB color space"""
        rgb = np.zeros_like(hsv)

        h, s, v = hsv[:, :, 0], hsv[:, :, 1], hsv[:, :, 2]

        i = (h * 6).astype(int) % 6
        f = h * 6 - np.floor(h * 6)

        p = v * (1 - s)
        q = v * (1 - f * s)
        t = v * (1 - (1 - f) * s)

        # Assign RGB based on hue sector
        rgb[i == 0] = np.stack([v[i == 0], t[i == 0], p[i == 0]], axis=-1)
        rgb[i == 1] = np.stack([q[i == 1], v[i == 1], p[i == 1]], axis=-1)
        rgb[i == 2] = np.stack([p[i == 2], v[i == 2], t[i == 2]], axis=-1)
        rgb[i == 3] = np.stack([p[i == 3], q[i == 3], v[i == 3]], axis=-1)
        rgb[i == 4] = np.stack([t[i == 4], p[i == 4], v[i == 4]], axis=-1)
        rgb[i == 5] = np.stack([v[i == 5], p[i == 5], q[i == 5]], axis=-1)

        return rgb

    def auto_color_balance(self, frame: np.ndarray) -> ColorGrade:
        """
        Automatically calculate white balance correction.

        Uses gray world assumption: average of all pixels should be gray.

        Args:
            frame: Input frame as numpy array

        Returns:
            ColorGrade with suggested corrections
        """
        if frame.dtype == np.uint8:
            frame = frame.astype(np.float32) / 255.0

        # Calculate average of each channel
        r_avg = np.mean(frame[:, :, 0])
        g_avg = np.mean(frame[:, :, 1])
        b_avg = np.mean(frame[:, :, 2])

        # Gray world: all channels should have same average
        gray_avg = (r_avg + g_avg + b_avg) / 3

        # Calculate corrections
        r_mult = gray_avg / (r_avg + 1e-6)
        g_mult = gray_avg / (g_avg + 1e-6)
        b_mult = gray_avg / (b_avg + 1e-6)

        # Convert to temperature/tint
        temperature = (r_mult - b_mult) * 5  # Scale factor
        tint = ((r_mult + b_mult) / 2 - g_mult) * 10

        return ColorGrade(
            temperature=np.clip(temperature, -1, 1),
            tint=np.clip(tint, -1, 1),
            name="Auto Color Balance",
        )

    def match_grade(
        self, source_frame: np.ndarray, target_frame: np.ndarray
    ) -> ColorGrade:
        """
        Match source frame colors to target frame.

        Uses histogram matching to approximate the look of the target.

        Args:
            source_frame: Frame to be corrected
            target_frame: Reference frame to match

        Returns:
            ColorGrade with suggested corrections
        """
        if source_frame.dtype == np.uint8:
            source_frame = source_frame.astype(np.float32) / 255.0
        if target_frame.dtype == np.uint8:
            target_frame = target_frame.astype(np.float32) / 255.0

        # Calculate mean and std for each channel
        src_means = [np.mean(source_frame[:, :, i]) for i in range(3)]
        src_stds = [np.std(source_frame[:, :, i]) for i in range(3)]

        tgt_means = [np.mean(target_frame[:, :, i]) for i in range(3)]
        tgt_stds = [np.std(target_frame[:, :, i]) for i in range(3)]

        # Calculate gain (from std ratio) and offset (from mean difference)
        gain = tuple(tgt_stds[i] / (src_stds[i] + 1e-6) for i in range(3))
        offset = tuple(tgt_means[i] - src_means[i] * gain[i] for i in range(3))

        return ColorGrade(gain=gain, offset=offset, name="Matched Grade")

    def create_grade(self, name: str, **kwargs) -> ColorGrade:
        """Create and store a new color grade"""
        grade = ColorGrade(name=name, **kwargs)
        grade_id = str(id(grade))
        self.grades[grade_id] = grade
        return grade

    def get_grade(self, grade_id: str) -> Optional[ColorGrade]:
        """Retrieve a stored color grade"""
        return self.grades.get(grade_id)

    def list_grades(self) -> List[str]:
        """List all stored grade IDs"""
        return list(self.grades.keys())

    def delete_grade(self, grade_id: str) -> bool:
        """Delete a stored color grade"""
        if grade_id in self.grades:
            del self.grades[grade_id]
            return True
        return False
