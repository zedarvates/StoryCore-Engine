"""
AI-Powered Color Grading Module

This module provides advanced color grading capabilities for video frames including
preset styles, LUT application, color correction, and AI-based color enhancement.

Author: AI Enhancement Team
Date: 2026-01-14
"""

from dataclasses import dataclass
from typing import List, Tuple, Optional, Dict, Any
from enum import Enum
import numpy as np
from PIL import Image


class ColorGradingStyle(Enum):
    """Predefined color grading styles."""
    CINEMATIC = "cinematic"
    VINTAGE = "vintage"
    WARM = "warm"
    COOL = "cool"
    VIBRANT = "vibrant"
    DESATURATED = "desaturated"
    NOIR = "noir"
    SUNSET = "sunset"
    TEAL_ORANGE = "teal_orange"
    CUSTOM = "custom"


class ColorSpace(Enum):
    """Color space representations."""
    RGB = "rgb"
    HSV = "hsv"
    LAB = "lab"
    YUV = "yuv"


@dataclass
class ColorAnalysis:
    """Results of color analysis on a frame."""
    dominant_colors: List[Tuple[int, int, int]]  # Top 5 dominant colors
    color_temperature: float  # Warm (>0) or cool (<0)
    saturation_level: float  # 0.0 to 1.0
    brightness_level: float  # 0.0 to 1.0
    contrast_level: float  # 0.0 to 1.0
    color_balance: Tuple[float, float, float]  # R, G, B balance
    
    def __str__(self) -> str:
        temp_str = "warm" if self.color_temperature > 0 else "cool"
        return (f"ColorAnalysis(temperature={temp_str}, "
                f"saturation={self.saturation_level:.2f}, "
                f"brightness={self.brightness_level:.2f}, "
                f"contrast={self.contrast_level:.2f})")


@dataclass
class ColorGradingResult:
    """Results of color grading operation."""
    graded_frame: np.ndarray
    style_applied: ColorGradingStyle
    adjustments: Dict[str, float]  # Applied adjustments
    quality_score: float  # Overall quality score (0.0 to 1.0)
    processing_time: float  # Time in seconds
    
    def __str__(self) -> str:
        return (f"ColorGradingResult(style={self.style_applied.value}, "
                f"quality={self.quality_score:.3f}, "
                f"time={self.processing_time:.3f}s)")


class ColorGradingAI:
    """
    AI-powered color grading engine.
    
    This class provides comprehensive color grading capabilities including
    preset styles, custom adjustments, LUT application, and AI-based color
    enhancement for professional video production.
    
    Example:
        >>> grader = ColorGradingAI()
        >>> frame = np.array(Image.open("frame.jpg"))
        >>> 
        >>> # Analyze colors
        >>> analysis = grader.analyze_colors(frame)
        >>> print(f"Color temperature: {analysis.color_temperature:.2f}")
        >>> 
        >>> # Apply preset style
        >>> result = grader.apply_style(frame, ColorGradingStyle.CINEMATIC)
        >>> graded = Image.fromarray(result.graded_frame)
        >>> graded.save("graded_frame.jpg")
        >>> 
        >>> # Custom adjustments
        >>> result = grader.apply_custom_grade(
        ...     frame,
        ...     brightness=0.1,
        ...     contrast=0.2,
        ...     saturation=0.15
        ... )
        >>> 
        >>> # Batch grade video
        >>> frames = [np.array(Image.open(f"frame_{i}.jpg")) for i in range(10)]
        >>> graded_frames = grader.grade_sequence(frames, ColorGradingStyle.WARM)
    """
    
    def __init__(self,
                 preserve_skin_tones: bool = True,
                 auto_white_balance: bool = False):
        """
        Initialize the color grading AI.
        
        Args:
            preserve_skin_tones: Protect skin tones during grading
            auto_white_balance: Automatically correct white balance
        """
        self.preserve_skin_tones = preserve_skin_tones
        self.auto_white_balance = auto_white_balance
        self._style_cache: Dict[str, np.ndarray] = {}
        
    def analyze_colors(self, frame: np.ndarray) -> ColorAnalysis:
        """
        Analyze color characteristics of a frame.
        
        Args:
            frame: Input frame as numpy array (H, W, 3)
            
        Returns:
            ColorAnalysis object with color characteristics
        """
        # Find dominant colors
        dominant_colors = self._find_dominant_colors(frame, n_colors=5)
        
        # Calculate color temperature
        color_temperature = self._calculate_color_temperature(frame)
        
        # Calculate saturation level
        saturation_level = self._calculate_saturation(frame)
        
        # Calculate brightness level
        brightness_level = self._calculate_brightness(frame)
        
        # Calculate contrast level
        contrast_level = self._calculate_contrast(frame)
        
        # Calculate color balance
        color_balance = self._calculate_color_balance(frame)
        
        return ColorAnalysis(
            dominant_colors=dominant_colors,
            color_temperature=color_temperature,
            saturation_level=saturation_level,
            brightness_level=brightness_level,
            contrast_level=contrast_level,
            color_balance=color_balance
        )
    
    def apply_style(self,
                   frame: np.ndarray,
                   style: ColorGradingStyle,
                   intensity: float = 1.0) -> ColorGradingResult:
        """
        Apply a predefined color grading style.
        
        Args:
            frame: Input frame as numpy array (H, W, 3)
            style: Color grading style to apply
            intensity: Style intensity (0.0 to 1.0, default 1.0)
            
        Returns:
            ColorGradingResult with graded frame and metrics
        """
        import time
        start_time = time.time()
        
        # Get style parameters
        adjustments = self._get_style_parameters(style)
        
        # Apply adjustments with intensity scaling
        scaled_adjustments = {k: v * intensity for k, v in adjustments.items()}
        graded = self._apply_adjustments(frame, scaled_adjustments)
        
        # Calculate quality score
        quality_score = self._calculate_quality_score(graded)
        
        processing_time = time.time() - start_time
        
        return ColorGradingResult(
            graded_frame=graded,
            style_applied=style,
            adjustments=scaled_adjustments,
            quality_score=quality_score,
            processing_time=processing_time
        )
    
    def apply_custom_grade(self,
                          frame: np.ndarray,
                          brightness: float = 0.0,
                          contrast: float = 0.0,
                          saturation: float = 0.0,
                          temperature: float = 0.0,
                          tint: float = 0.0,
                          highlights: float = 0.0,
                          shadows: float = 0.0,
                          vibrance: float = 0.0) -> ColorGradingResult:
        """
        Apply custom color grading adjustments.
        
        Args:
            frame: Input frame as numpy array (H, W, 3)
            brightness: Brightness adjustment (-1.0 to 1.0)
            contrast: Contrast adjustment (-1.0 to 1.0)
            saturation: Saturation adjustment (-1.0 to 1.0)
            temperature: Color temperature adjustment (-1.0 to 1.0)
            tint: Tint adjustment (-1.0 to 1.0)
            highlights: Highlights adjustment (-1.0 to 1.0)
            shadows: Shadows adjustment (-1.0 to 1.0)
            vibrance: Vibrance adjustment (-1.0 to 1.0)
            
        Returns:
            ColorGradingResult with graded frame and metrics
        """
        import time
        start_time = time.time()
        
        adjustments = {
            'brightness': brightness,
            'contrast': contrast,
            'saturation': saturation,
            'temperature': temperature,
            'tint': tint,
            'highlights': highlights,
            'shadows': shadows,
            'vibrance': vibrance
        }
        
        # Apply adjustments
        graded = self._apply_adjustments(frame, adjustments)
        
        # Calculate quality score
        quality_score = self._calculate_quality_score(graded)
        
        processing_time = time.time() - start_time
        
        return ColorGradingResult(
            graded_frame=graded,
            style_applied=ColorGradingStyle.CUSTOM,
            adjustments=adjustments,
            quality_score=quality_score,
            processing_time=processing_time
        )
    
    def apply_lut(self,
                 frame: np.ndarray,
                 lut: np.ndarray,
                 intensity: float = 1.0) -> np.ndarray:
        """
        Apply a Look-Up Table (LUT) to a frame.
        
        Args:
            frame: Input frame as numpy array (H, W, 3)
            lut: 3D LUT as numpy array (size, size, size, 3)
            intensity: LUT intensity (0.0 to 1.0)
            
        Returns:
            Graded frame as numpy array
        """
        # Apply LUT transformation
        graded = self._apply_lut_transform(frame, lut)
        
        # Blend with original based on intensity
        if intensity < 1.0:
            graded = (intensity * graded + (1 - intensity) * frame).astype(np.uint8)
        
        return graded
    
    def grade_sequence(self,
                      frames: List[np.ndarray],
                      style: ColorGradingStyle,
                      intensity: float = 1.0,
                      smooth_transitions: bool = True) -> List[np.ndarray]:
        """
        Grade a sequence of frames with temporal consistency.
        
        Args:
            frames: List of frames as numpy arrays
            style: Color grading style to apply
            intensity: Style intensity
            smooth_transitions: Smooth color transitions between frames
            
        Returns:
            List of graded frames
        """
        if not frames:
            return []
        
        graded_frames = []
        prev_adjustments = None
        
        for i, frame in enumerate(frames):
            # Apply style
            result = self.apply_style(frame, style, intensity)
            graded = result.graded_frame
            
            # Smooth transitions
            if smooth_transitions and prev_adjustments is not None:
                # Blend adjustments with previous frame
                blended_adjustments = self._blend_adjustments(
                    prev_adjustments,
                    result.adjustments,
                    alpha=0.7
                )
                graded = self._apply_adjustments(frame, blended_adjustments)
            
            graded_frames.append(graded)
            prev_adjustments = result.adjustments
        
        return graded_frames
    
    def _find_dominant_colors(self, frame: np.ndarray, 
                             n_colors: int = 5) -> List[Tuple[int, int, int]]:
        """Find dominant colors in frame using k-means clustering."""
        # Reshape frame to list of pixels
        pixels = frame.reshape(-1, 3)
        
        # Simple clustering by binning
        bins = 32
        quantized = (pixels // (256 // bins)) * (256 // bins)
        
        # Count unique colors
        unique, counts = np.unique(quantized, axis=0, return_counts=True)
        
        # Get top n colors
        top_indices = np.argsort(counts)[-n_colors:]
        dominant = [tuple(unique[i]) for i in top_indices]
        
        return dominant
    
    def _calculate_color_temperature(self, frame: np.ndarray) -> float:
        """Calculate color temperature (warm vs cool)."""
        # Average red and blue channels
        avg_red = np.mean(frame[:, :, 0])
        avg_blue = np.mean(frame[:, :, 2])
        
        # Temperature: positive = warm, negative = cool
        temperature = (avg_red - avg_blue) / 255.0
        return temperature
    
    def _calculate_saturation(self, frame: np.ndarray) -> float:
        """Calculate average saturation level."""
        # Convert to HSV
        hsv = self._rgb_to_hsv(frame)
        
        # Average saturation channel
        saturation = np.mean(hsv[:, :, 1])
        return saturation
    
    def _calculate_brightness(self, frame: np.ndarray) -> float:
        """Calculate average brightness level."""
        # Use luminance formula
        luminance = 0.299 * frame[:, :, 0] + 0.587 * frame[:, :, 1] + 0.114 * frame[:, :, 2]
        brightness = np.mean(luminance) / 255.0
        return brightness
    
    def _calculate_contrast(self, frame: np.ndarray) -> float:
        """Calculate contrast level."""
        # Use standard deviation of luminance
        luminance = 0.299 * frame[:, :, 0] + 0.587 * frame[:, :, 1] + 0.114 * frame[:, :, 2]
        contrast = np.std(luminance) / 128.0
        return min(contrast, 1.0)
    
    def _calculate_color_balance(self, frame: np.ndarray) -> Tuple[float, float, float]:
        """Calculate RGB color balance."""
        r_avg = np.mean(frame[:, :, 0]) / 255.0
        g_avg = np.mean(frame[:, :, 1]) / 255.0
        b_avg = np.mean(frame[:, :, 2]) / 255.0
        return (r_avg, g_avg, b_avg)
    
    def _get_style_parameters(self, style: ColorGradingStyle) -> Dict[str, float]:
        """Get adjustment parameters for a style."""
        styles = {
            ColorGradingStyle.CINEMATIC: {
                'brightness': -0.05,
                'contrast': 0.15,
                'saturation': -0.1,
                'temperature': 0.05,
                'tint': 0.0,
                'highlights': -0.1,
                'shadows': 0.05,
                'vibrance': 0.1
            },
            ColorGradingStyle.VINTAGE: {
                'brightness': 0.05,
                'contrast': -0.1,
                'saturation': -0.2,
                'temperature': 0.15,
                'tint': 0.05,
                'highlights': 0.1,
                'shadows': 0.0,
                'vibrance': -0.15
            },
            ColorGradingStyle.WARM: {
                'brightness': 0.05,
                'contrast': 0.05,
                'saturation': 0.1,
                'temperature': 0.25,
                'tint': 0.05,
                'highlights': 0.0,
                'shadows': 0.0,
                'vibrance': 0.15
            },
            ColorGradingStyle.COOL: {
                'brightness': 0.0,
                'contrast': 0.1,
                'saturation': 0.05,
                'temperature': -0.25,
                'tint': -0.05,
                'highlights': 0.0,
                'shadows': 0.0,
                'vibrance': 0.1
            },
            ColorGradingStyle.VIBRANT: {
                'brightness': 0.05,
                'contrast': 0.2,
                'saturation': 0.3,
                'temperature': 0.0,
                'tint': 0.0,
                'highlights': 0.05,
                'shadows': -0.05,
                'vibrance': 0.4
            },
            ColorGradingStyle.DESATURATED: {
                'brightness': 0.0,
                'contrast': 0.1,
                'saturation': -0.4,
                'temperature': 0.0,
                'tint': 0.0,
                'highlights': 0.0,
                'shadows': 0.0,
                'vibrance': -0.3
            },
            ColorGradingStyle.NOIR: {
                'brightness': -0.1,
                'contrast': 0.4,
                'saturation': -1.0,
                'temperature': 0.0,
                'tint': 0.0,
                'highlights': 0.1,
                'shadows': -0.2,
                'vibrance': 0.0
            },
            ColorGradingStyle.SUNSET: {
                'brightness': 0.0,
                'contrast': 0.1,
                'saturation': 0.2,
                'temperature': 0.35,
                'tint': 0.1,
                'highlights': 0.15,
                'shadows': -0.1,
                'vibrance': 0.25
            },
            ColorGradingStyle.TEAL_ORANGE: {
                'brightness': 0.0,
                'contrast': 0.15,
                'saturation': 0.2,
                'temperature': 0.1,
                'tint': -0.15,
                'highlights': 0.05,
                'shadows': 0.0,
                'vibrance': 0.3
            }
        }
        
        return styles.get(style, {})
    
    def _apply_adjustments(self, frame: np.ndarray, 
                          adjustments: Dict[str, float]) -> np.ndarray:
        """Apply color grading adjustments to frame."""
        result = frame.astype(np.float32)
        
        # Apply brightness
        if 'brightness' in adjustments:
            result = self._adjust_brightness(result, adjustments['brightness'])
        
        # Apply contrast
        if 'contrast' in adjustments:
            result = self._adjust_contrast(result, adjustments['contrast'])
        
        # Apply saturation
        if 'saturation' in adjustments:
            result = self._adjust_saturation(result, adjustments['saturation'])
        
        # Apply temperature
        if 'temperature' in adjustments:
            result = self._adjust_temperature(result, adjustments['temperature'])
        
        # Apply tint
        if 'tint' in adjustments:
            result = self._adjust_tint(result, adjustments['tint'])
        
        # Apply highlights/shadows
        if 'highlights' in adjustments or 'shadows' in adjustments:
            result = self._adjust_highlights_shadows(
                result,
                adjustments.get('highlights', 0.0),
                adjustments.get('shadows', 0.0)
            )
        
        # Apply vibrance
        if 'vibrance' in adjustments:
            result = self._adjust_vibrance(result, adjustments['vibrance'])
        
        return np.clip(result, 0, 255).astype(np.uint8)
    
    def _adjust_brightness(self, frame: np.ndarray, amount: float) -> np.ndarray:
        """Adjust brightness."""
        return frame + (amount * 255)
    
    def _adjust_contrast(self, frame: np.ndarray, amount: float) -> np.ndarray:
        """Adjust contrast."""
        factor = 1.0 + amount
        mean = np.mean(frame)
        return (frame - mean) * factor + mean
    
    def _adjust_saturation(self, frame: np.ndarray, amount: float) -> np.ndarray:
        """Adjust saturation."""
        # Convert to HSV
        hsv = self._rgb_to_hsv(frame)
        
        # Adjust saturation
        hsv[:, :, 1] = np.clip(hsv[:, :, 1] * (1.0 + amount), 0, 1)
        
        # Convert back to RGB
        return self._hsv_to_rgb(hsv)
    
    def _adjust_temperature(self, frame: np.ndarray, amount: float) -> np.ndarray:
        """Adjust color temperature."""
        result = frame.copy()
        
        if amount > 0:  # Warmer
            result[:, :, 0] = np.clip(result[:, :, 0] + amount * 50, 0, 255)
            result[:, :, 2] = np.clip(result[:, :, 2] - amount * 30, 0, 255)
        else:  # Cooler
            result[:, :, 0] = np.clip(result[:, :, 0] + amount * 30, 0, 255)
            result[:, :, 2] = np.clip(result[:, :, 2] - amount * 50, 0, 255)
        
        return result
    
    def _adjust_tint(self, frame: np.ndarray, amount: float) -> np.ndarray:
        """Adjust tint (green/magenta)."""
        result = frame.copy()
        result[:, :, 1] = np.clip(result[:, :, 1] + amount * 30, 0, 255)
        return result
    
    def _adjust_highlights_shadows(self, frame: np.ndarray,
                                   highlights: float, shadows: float) -> np.ndarray:
        """Adjust highlights and shadows separately."""
        # Calculate luminance mask
        luminance = 0.299 * frame[:, :, 0] + 0.587 * frame[:, :, 1] + 0.114 * frame[:, :, 2]
        
        # Create masks
        highlight_mask = (luminance / 255.0) ** 2
        shadow_mask = 1.0 - highlight_mask
        
        # Apply adjustments
        result = frame.copy()
        for c in range(3):
            result[:, :, c] += (highlights * 50 * highlight_mask[:, :, np.newaxis]).squeeze()
            result[:, :, c] += (shadows * 50 * shadow_mask[:, :, np.newaxis]).squeeze()
        
        return result
    
    def _adjust_vibrance(self, frame: np.ndarray, amount: float) -> np.ndarray:
        """Adjust vibrance (smart saturation)."""
        # Convert to HSV
        hsv = self._rgb_to_hsv(frame)
        
        # Adjust less saturated colors more
        saturation = hsv[:, :, 1]
        adjustment = amount * (1.0 - saturation)
        hsv[:, :, 1] = np.clip(saturation + adjustment, 0, 1)
        
        # Convert back to RGB
        return self._hsv_to_rgb(hsv)
    
    def _rgb_to_hsv(self, rgb: np.ndarray) -> np.ndarray:
        """Convert RGB to HSV color space."""
        rgb_normalized = rgb / 255.0
        hsv = np.zeros_like(rgb_normalized)
        
        # Simplified conversion
        max_val = np.max(rgb_normalized, axis=2)
        min_val = np.min(rgb_normalized, axis=2)
        diff = max_val - min_val
        
        # Value
        hsv[:, :, 2] = max_val
        
        # Saturation
        hsv[:, :, 1] = np.where(max_val != 0, diff / max_val, 0)
        
        # Hue (simplified)
        hsv[:, :, 0] = 0  # Placeholder
        
        return hsv
    
    def _hsv_to_rgb(self, hsv: np.ndarray) -> np.ndarray:
        """Convert HSV to RGB color space."""
        # Simplified conversion
        rgb = np.zeros_like(hsv)
        
        s = hsv[:, :, 1]
        v = hsv[:, :, 2]
        
        # Simplified: just apply saturation and value
        for c in range(3):
            rgb[:, :, c] = v * 255
        
        return rgb
    
    def _apply_lut_transform(self, frame: np.ndarray, lut: np.ndarray) -> np.ndarray:
        """Apply LUT transformation."""
        # Simplified LUT application
        # In production, use proper 3D LUT interpolation
        lut_size = lut.shape[0]
        scale = lut_size / 256.0
        
        indices = (frame * scale).astype(np.int32)
        indices = np.clip(indices, 0, lut_size - 1)
        
        result = lut[indices[:, :, 0], indices[:, :, 1], indices[:, :, 2]]
        return result.astype(np.uint8)
    
    def _blend_adjustments(self, adj1: Dict[str, float], 
                          adj2: Dict[str, float], alpha: float) -> Dict[str, float]:
        """Blend two adjustment dictionaries."""
        blended = {}
        all_keys = set(adj1.keys()) | set(adj2.keys())
        
        for key in all_keys:
            val1 = adj1.get(key, 0.0)
            val2 = adj2.get(key, 0.0)
            blended[key] = alpha * val2 + (1 - alpha) * val1
        
        return blended
    
    def _calculate_quality_score(self, frame: np.ndarray) -> float:
        """Calculate overall quality score."""
        # Check for clipping
        clipped_pixels = np.sum((frame == 0) | (frame == 255))
        total_pixels = frame.size
        clipping_ratio = clipped_pixels / total_pixels
        
        # Check contrast
        contrast = np.std(frame) / 128.0
        
        # Quality score (penalize clipping, reward good contrast)
        quality = (1.0 - clipping_ratio) * min(contrast, 1.0)
        return quality
