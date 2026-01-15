"""
Frame Rate Conversion Module

Converts video frame rates using intelligent interpolation.
Supports common conversions like 24→60fps, 30→120fps, etc.

Author: AI Enhancement Team
Date: 2026-01-14
"""

from dataclasses import dataclass
from typing import List, Optional, Dict, Tuple
import numpy as np
from PIL import Image
import logging

logger = logging.getLogger(__name__)


@dataclass
class FrameRateConversionResult:
    """Result of frame rate conversion."""
    converted_frames: List[np.ndarray]
    source_fps: float
    target_fps: float
    conversion_ratio: float
    interpolated_count: int
    original_count: int
    processing_time: float


class FrameRateConverter:
    """
    Intelligent frame rate conversion.
    
    Converts between different frame rates using advanced interpolation
    techniques. Handles common conversions and maintains temporal quality.
    
    Example:
        >>> converter = FrameRateConverter()
        >>> result = converter.convert(frames, source_fps=24, target_fps=60)
        >>> print(f"Converted {result.original_count} to {len(result.converted_frames)} frames")
    """
    
    def __init__(
        self,
        interpolation_quality: str = 'high',
        preserve_motion: bool = True,
        adaptive_interpolation: bool = True
    ):
        """
        Initialize frame rate converter.
        
        Args:
            interpolation_quality: Quality level ('low', 'medium', 'high')
            preserve_motion: Preserve motion characteristics
            adaptive_interpolation: Adapt interpolation to content
        """
        self.interpolation_quality = interpolation_quality
        self.preserve_motion = preserve_motion
        self.adaptive_interpolation = adaptive_interpolation
        
        # Quality settings
        self.quality_settings = {
            'low': {'context_frames': 1, 'blend_passes': 1},
            'medium': {'context_frames': 2, 'blend_passes': 2},
            'high': {'context_frames': 3, 'blend_passes': 3}
        }
        
        logger.info(f"FrameRateConverter initialized (quality={interpolation_quality})")
    
    def convert(
        self,
        frames: List[np.ndarray],
        source_fps: float,
        target_fps: float
    ) -> FrameRateConversionResult:
        """
        Convert frame rate from source to target FPS.
        
        Args:
            frames: Input frames
            source_fps: Source frame rate
            target_fps: Target frame rate
            
        Returns:
            FrameRateConversionResult with converted frames
        """
        import time
        start_time = time.time()
        
        if source_fps <= 0 or target_fps <= 0:
            logger.error("Invalid frame rates")
            return self._create_error_result(frames, source_fps, target_fps)
        
        conversion_ratio = target_fps / source_fps
        
        logger.info(f"Converting {source_fps}fps → {target_fps}fps (ratio={conversion_ratio:.2f})")
        
        if abs(conversion_ratio - 1.0) < 0.01:
            # No conversion needed
            logger.info("Frame rates are essentially equal, no conversion needed")
            return FrameRateConversionResult(
                converted_frames=frames,
                source_fps=source_fps,
                target_fps=target_fps,
                conversion_ratio=1.0,
                interpolated_count=0,
                original_count=len(frames),
                processing_time=0.0
            )
        
        # Calculate target frame count
        duration = len(frames) / source_fps
        target_count = int(duration * target_fps)
        
        # Perform conversion
        if conversion_ratio > 1.0:
            # Upsampling (interpolation)
            converted = self._upsample(frames, target_count)
        else:
            # Downsampling (decimation)
            converted = self._downsample(frames, target_count)
        
        processing_time = time.time() - start_time
        
        logger.info(f"Conversion complete: {len(frames)} → {len(converted)} frames in {processing_time:.2f}s")
        
        return FrameRateConversionResult(
            converted_frames=converted,
            source_fps=source_fps,
            target_fps=target_fps,
            conversion_ratio=conversion_ratio,
            interpolated_count=len(converted) - len(frames),
            original_count=len(frames),
            processing_time=processing_time
        )
    
    def _upsample(
        self,
        frames: List[np.ndarray],
        target_count: int
    ) -> List[np.ndarray]:
        """Upsample frames through interpolation."""
        settings = self.quality_settings[self.interpolation_quality]
        
        # Calculate interpolation positions
        positions = np.linspace(0, len(frames) - 1, target_count)
        
        upsampled = []
        
        for pos in positions:
            frame = self._interpolate_at_position(frames, pos, settings)
            upsampled.append(frame)
        
        return upsampled
    
    def _downsample(
        self,
        frames: List[np.ndarray],
        target_count: int
    ) -> List[np.ndarray]:
        """Downsample frames through intelligent selection."""
        if target_count >= len(frames):
            return frames
        
        # Calculate sampling positions
        positions = np.linspace(0, len(frames) - 1, target_count)
        
        downsampled = []
        
        for pos in positions:
            idx = int(round(pos))
            idx = min(idx, len(frames) - 1)
            downsampled.append(frames[idx].copy())
        
        return downsampled
    
    def _interpolate_at_position(
        self,
        frames: List[np.ndarray],
        position: float,
        settings: Dict
    ) -> np.ndarray:
        """Interpolate frame at specific position."""
        idx_before = int(np.floor(position))
        idx_after = int(np.ceil(position))
        
        # If position is on a frame, return it
        if idx_before == idx_after:
            return frames[idx_before].copy()
        
        weight = position - idx_before
        
        # Get context frames
        context_size = settings['context_frames']
        context_before = self._get_context(frames, idx_before, -1, context_size)
        context_after = self._get_context(frames, idx_after, 1, context_size)
        
        # Interpolate with multiple passes for quality
        frame = self._multi_pass_blend(
            context_before,
            context_after,
            weight,
            settings['blend_passes']
        )
        
        return frame
    
    def _get_context(
        self,
        frames: List[np.ndarray],
        center_idx: int,
        direction: int,
        size: int
    ) -> List[np.ndarray]:
        """Get context frames."""
        context = [frames[center_idx]]
        
        for i in range(1, size + 1):
            idx = center_idx + (i * direction)
            if 0 <= idx < len(frames):
                context.append(frames[idx])
        
        return context
    
    def _multi_pass_blend(
        self,
        context_before: List[np.ndarray],
        context_after: List[np.ndarray],
        weight: float,
        passes: int
    ) -> np.ndarray:
        """Multi-pass blending for higher quality."""
        frame_before = context_before[0]
        frame_after = context_after[0]
        
        # Initial blend
        result = (
            frame_before.astype(float) * (1.0 - weight) +
            frame_after.astype(float) * weight
        )
        
        # Additional passes with context
        for pass_num in range(1, passes):
            pass_weight = 0.3 / pass_num  # Decreasing influence
            
            # Blend with context frames
            context_blend = np.zeros_like(result)
            context_count = 0
            
            for i, frame in enumerate(context_before[1:], 1):
                w = (1.0 - weight) / (i + 1)
                context_blend += frame.astype(float) * w
                context_count += 1
            
            for i, frame in enumerate(context_after[1:], 1):
                w = weight / (i + 1)
                context_blend += frame.astype(float) * w
                context_count += 1
            
            if context_count > 0:
                context_blend /= context_count
                result = result * (1.0 - pass_weight) + context_blend * pass_weight
        
        return np.clip(result, 0, 255).astype(np.uint8)
    
    def convert_to_common_rates(
        self,
        frames: List[np.ndarray],
        source_fps: float,
        target_format: str
    ) -> FrameRateConversionResult:
        """
        Convert to common frame rates.
        
        Args:
            frames: Input frames
            source_fps: Source frame rate
            target_format: Target format ('cinema', 'tv', 'web', 'slow_motion')
            
        Returns:
            FrameRateConversionResult
        """
        format_fps = {
            'cinema': 24.0,
            'tv_ntsc': 29.97,
            'tv_pal': 25.0,
            'web': 30.0,
            'smooth': 60.0,
            'high_fps': 120.0,
            'slow_motion': 240.0
        }
        
        if target_format not in format_fps:
            logger.error(f"Unknown target format: {target_format}")
            return self._create_error_result(frames, source_fps, source_fps)
        
        target_fps = format_fps[target_format]
        
        return self.convert(frames, source_fps, target_fps)
    
    def create_slow_motion(
        self,
        frames: List[np.ndarray],
        source_fps: float,
        slowdown_factor: float
    ) -> FrameRateConversionResult:
        """
        Create slow-motion effect.
        
        Args:
            frames: Input frames
            source_fps: Source frame rate
            slowdown_factor: Slowdown factor (2.0 = half speed, 4.0 = quarter speed)
            
        Returns:
            FrameRateConversionResult with slow-motion frames
        """
        if slowdown_factor <= 0:
            logger.error("Invalid slowdown factor")
            return self._create_error_result(frames, source_fps, source_fps)
        
        # Calculate target frame count
        target_count = int(len(frames) * slowdown_factor)
        
        logger.info(f"Creating slow-motion: {slowdown_factor}x slower ({len(frames)} → {target_count} frames)")
        
        # Use high-quality interpolation for slow-motion
        original_quality = self.interpolation_quality
        self.interpolation_quality = 'high'
        
        result = self.convert(frames, source_fps, source_fps * slowdown_factor)
        
        # Restore original quality setting
        self.interpolation_quality = original_quality
        
        return result
    
    def create_time_lapse(
        self,
        frames: List[np.ndarray],
        source_fps: float,
        speedup_factor: float
    ) -> FrameRateConversionResult:
        """
        Create time-lapse effect.
        
        Args:
            frames: Input frames
            source_fps: Source frame rate
            speedup_factor: Speedup factor (2.0 = double speed, 10.0 = 10x speed)
            
        Returns:
            FrameRateConversionResult with time-lapse frames
        """
        if speedup_factor <= 0:
            logger.error("Invalid speedup factor")
            return self._create_error_result(frames, source_fps, source_fps)
        
        # Calculate target frame count
        target_count = max(2, int(len(frames) / speedup_factor))
        
        logger.info(f"Creating time-lapse: {speedup_factor}x faster ({len(frames)} → {target_count} frames)")
        
        result = self.convert(frames, source_fps, source_fps / speedup_factor)
        
        return result
    
    def _create_error_result(
        self,
        frames: List[np.ndarray],
        source_fps: float,
        target_fps: float
    ) -> FrameRateConversionResult:
        """Create error result."""
        return FrameRateConversionResult(
            converted_frames=frames,
            source_fps=source_fps,
            target_fps=target_fps,
            conversion_ratio=1.0,
            interpolated_count=0,
            original_count=len(frames),
            processing_time=0.0
        )
    
    def get_conversion_info(
        self,
        source_fps: float,
        target_fps: float,
        frame_count: int
    ) -> Dict[str, any]:
        """Get information about a potential conversion."""
        conversion_ratio = target_fps / source_fps
        duration = frame_count / source_fps
        target_count = int(duration * target_fps)
        
        return {
            'source_fps': source_fps,
            'target_fps': target_fps,
            'conversion_ratio': conversion_ratio,
            'conversion_type': 'upsample' if conversion_ratio > 1.0 else 'downsample',
            'source_frame_count': frame_count,
            'target_frame_count': target_count,
            'frames_to_interpolate': max(0, target_count - frame_count),
            'duration_seconds': duration,
            'estimated_processing_time': self._estimate_processing_time(
                frame_count, target_count
            )
        }
    
    def _estimate_processing_time(
        self,
        source_count: int,
        target_count: int
    ) -> float:
        """Estimate processing time for conversion."""
        # Rough estimate: 0.01s per output frame for high quality
        quality_multiplier = {
            'low': 0.005,
            'medium': 0.01,
            'high': 0.02
        }
        
        multiplier = quality_multiplier[self.interpolation_quality]
        estimated_time = target_count * multiplier
        
        return estimated_time
