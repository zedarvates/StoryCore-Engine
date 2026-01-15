"""
Multi-Frame Interpolation Module

Advanced frame interpolation using multiple reference frames for improved quality.
Provides better results than simple pairwise interpolation.

Author: AI Enhancement Team
Date: 2026-01-14
"""

from dataclasses import dataclass
from typing import List, Optional, Tuple, Dict
import numpy as np
from PIL import Image
import logging

logger = logging.getLogger(__name__)


@dataclass
class InterpolationResult:
    """Result of multi-frame interpolation."""
    interpolated_frames: List[np.ndarray]
    quality_scores: List[float]  # Quality score for each interpolated frame
    method_used: str  # Interpolation method
    processing_time: float  # Total processing time in seconds


class MultiFrameInterpolator:
    """
    Multi-frame interpolation for high-quality frame generation.
    
    Uses multiple reference frames (before and after) to generate
    intermediate frames with better quality and temporal consistency.
    
    Example:
        >>> interpolator = MultiFrameInterpolator(context_frames=2)
        >>> result = interpolator.interpolate_multi(frames, target_count=5)
        >>> print(f"Generated {len(result.interpolated_frames)} frames")
    """
    
    def __init__(
        self,
        context_frames: int = 2,
        blend_mode: str = 'weighted',
        quality_threshold: float = 0.7
    ):
        """
        Initialize multi-frame interpolator.
        
        Args:
            context_frames: Number of context frames to use on each side
            blend_mode: Blending mode ('weighted', 'optical_flow', 'adaptive')
            quality_threshold: Minimum quality score for interpolated frames
        """
        self.context_frames = context_frames
        self.blend_mode = blend_mode
        self.quality_threshold = quality_threshold
        
        logger.info(f"MultiFrameInterpolator initialized (context={context_frames})")
    
    def interpolate_multi(
        self,
        frames: List[np.ndarray],
        target_count: int,
        preserve_endpoints: bool = True
    ) -> InterpolationResult:
        """
        Interpolate multiple frames between existing frames.
        
        Args:
            frames: Input frames (minimum 2)
            target_count: Total number of frames desired in output
            preserve_endpoints: Keep original first and last frames
            
        Returns:
            InterpolationResult with interpolated frames
        """
        import time
        start_time = time.time()
        
        if len(frames) < 2:
            logger.error("Need at least 2 frames for interpolation")
            return InterpolationResult(frames, [1.0] * len(frames), 'none', 0.0)
        
        if target_count <= len(frames):
            logger.warning(f"Target count ({target_count}) <= input count ({len(frames)})")
            return InterpolationResult(frames, [1.0] * len(frames), 'none', 0.0)
        
        logger.info(f"Interpolating {len(frames)} frames to {target_count} frames")
        
        # Calculate interpolation positions
        positions = self._calculate_positions(len(frames), target_count, preserve_endpoints)
        
        # Interpolate frames
        interpolated = []
        quality_scores = []
        
        for pos in positions:
            frame, quality = self._interpolate_at_position(frames, pos)
            interpolated.append(frame)
            quality_scores.append(quality)
        
        processing_time = time.time() - start_time
        
        logger.info(f"Interpolation complete in {processing_time:.2f}s")
        
        return InterpolationResult(
            interpolated_frames=interpolated,
            quality_scores=quality_scores,
            method_used=self.blend_mode,
            processing_time=processing_time
        )
    
    def _calculate_positions(
        self,
        input_count: int,
        target_count: int,
        preserve_endpoints: bool
    ) -> List[float]:
        """Calculate interpolation positions for target frames."""
        if preserve_endpoints:
            # Distribute frames evenly between first and last
            positions = np.linspace(0, input_count - 1, target_count)
        else:
            # Distribute frames evenly across entire range
            positions = np.linspace(0, input_count - 1, target_count)
        
        return positions.tolist()
    
    def _interpolate_at_position(
        self,
        frames: List[np.ndarray],
        position: float
    ) -> Tuple[np.ndarray, float]:
        """
        Interpolate frame at specific position using context frames.
        
        Args:
            frames: Input frames
            position: Position to interpolate (0.0 to len(frames)-1)
            
        Returns:
            (interpolated_frame, quality_score)
        """
        # Find surrounding frames
        idx_before = int(np.floor(position))
        idx_after = int(np.ceil(position))
        
        # If position is exactly on a frame, return it
        if idx_before == idx_after:
            return frames[idx_before].copy(), 1.0
        
        # Get interpolation weight
        weight = position - idx_before
        
        # Get context frames
        context_before = self._get_context_frames(frames, idx_before, -1)
        context_after = self._get_context_frames(frames, idx_after, 1)
        
        # Interpolate based on blend mode
        if self.blend_mode == 'weighted':
            frame = self._weighted_blend(
                context_before, context_after, weight
            )
        elif self.blend_mode == 'optical_flow':
            frame = self._optical_flow_blend(
                context_before, context_after, weight
            )
        else:  # adaptive
            frame = self._adaptive_blend(
                context_before, context_after, weight
            )
        
        # Calculate quality score
        quality = self._calculate_quality(frame, context_before, context_after)
        
        return frame, quality
    
    def _get_context_frames(
        self,
        frames: List[np.ndarray],
        center_idx: int,
        direction: int
    ) -> List[np.ndarray]:
        """Get context frames around center index."""
        context = [frames[center_idx]]
        
        for i in range(1, self.context_frames + 1):
            idx = center_idx + (i * direction)
            if 0 <= idx < len(frames):
                context.append(frames[idx])
        
        return context
    
    def _weighted_blend(
        self,
        context_before: List[np.ndarray],
        context_after: List[np.ndarray],
        weight: float
    ) -> np.ndarray:
        """Weighted blending of context frames."""
        # Primary blend between immediate neighbors
        frame_before = context_before[0]
        frame_after = context_after[0]
        
        primary_blend = (
            frame_before.astype(float) * (1.0 - weight) +
            frame_after.astype(float) * weight
        )
        
        # Add context influence
        if len(context_before) > 1 or len(context_after) > 1:
            context_weight = 0.2  # 20% influence from context
            
            # Blend context frames
            context_blend = np.zeros_like(primary_blend)
            context_count = 0
            
            for i, frame in enumerate(context_before[1:], 1):
                w = (1.0 - weight) * (1.0 / (i + 1))
                context_blend += frame.astype(float) * w
                context_count += 1
            
            for i, frame in enumerate(context_after[1:], 1):
                w = weight * (1.0 / (i + 1))
                context_blend += frame.astype(float) * w
                context_count += 1
            
            if context_count > 0:
                context_blend /= context_count
                
                # Combine primary and context
                result = (
                    primary_blend * (1.0 - context_weight) +
                    context_blend * context_weight
                )
            else:
                result = primary_blend
        else:
            result = primary_blend
        
        return np.clip(result, 0, 255).astype(np.uint8)
    
    def _optical_flow_blend(
        self,
        context_before: List[np.ndarray],
        context_after: List[np.ndarray],
        weight: float
    ) -> np.ndarray:
        """Optical flow-based blending (simplified)."""
        # For now, fall back to weighted blend
        # In production, would use actual optical flow warping
        return self._weighted_blend(context_before, context_after, weight)
    
    def _adaptive_blend(
        self,
        context_before: List[np.ndarray],
        context_after: List[np.ndarray],
        weight: float
    ) -> np.ndarray:
        """Adaptive blending based on content analysis."""
        frame_before = context_before[0]
        frame_after = context_after[0]
        
        # Analyze motion between frames
        motion = self._estimate_motion(frame_before, frame_after)
        
        # Adjust blending based on motion
        if motion < 5.0:  # Low motion
            # Use more context for smooth interpolation
            return self._weighted_blend(context_before, context_after, weight)
        else:  # High motion
            # Use less context to avoid ghosting
            simple_blend = (
                frame_before.astype(float) * (1.0 - weight) +
                frame_after.astype(float) * weight
            )
            return np.clip(simple_blend, 0, 255).astype(np.uint8)
    
    def _estimate_motion(
        self,
        frame1: np.ndarray,
        frame2: np.ndarray
    ) -> float:
        """Estimate motion magnitude between frames."""
        diff = np.mean(np.abs(frame1.astype(float) - frame2.astype(float)))
        return float(diff)
    
    def _calculate_quality(
        self,
        interpolated: np.ndarray,
        context_before: List[np.ndarray],
        context_after: List[np.ndarray]
    ) -> float:
        """Calculate quality score for interpolated frame."""
        # Compare with neighbors
        frame_before = context_before[0]
        frame_after = context_after[0]
        
        # Calculate similarity to neighbors
        sim_before = self._calculate_similarity(interpolated, frame_before)
        sim_after = self._calculate_similarity(interpolated, frame_after)
        
        # Average similarity
        quality = (sim_before + sim_after) / 2.0
        
        return quality
    
    def _calculate_similarity(
        self,
        frame1: np.ndarray,
        frame2: np.ndarray
    ) -> float:
        """Calculate similarity between frames (0.0 to 1.0)."""
        # Simple MSE-based similarity
        mse = np.mean((frame1.astype(float) - frame2.astype(float)) ** 2)
        
        # Convert to similarity (higher is better)
        similarity = 1.0 / (1.0 + mse / 1000.0)
        
        return float(similarity)
    
    def interpolate_between_keyframes(
        self,
        keyframes: List[Tuple[int, np.ndarray]],
        total_frames: int
    ) -> List[np.ndarray]:
        """
        Interpolate frames between keyframes.
        
        Args:
            keyframes: List of (frame_index, frame) tuples
            total_frames: Total number of frames to generate
            
        Returns:
            List of all frames (keyframes + interpolated)
        """
        if len(keyframes) < 2:
            logger.error("Need at least 2 keyframes")
            return [kf[1] for kf in keyframes]
        
        # Sort keyframes by index
        keyframes = sorted(keyframes, key=lambda x: x[0])
        
        # Initialize output
        output = [None] * total_frames
        
        # Place keyframes
        for idx, frame in keyframes:
            if 0 <= idx < total_frames:
                output[idx] = frame.copy()
        
        # Interpolate between keyframes
        for i in range(len(keyframes) - 1):
            start_idx, start_frame = keyframes[i]
            end_idx, end_frame = keyframes[i + 1]
            
            # Interpolate frames between keyframes
            segment_frames = [start_frame, end_frame]
            segment_count = end_idx - start_idx + 1
            
            if segment_count > 2:
                result = self.interpolate_multi(
                    segment_frames,
                    segment_count,
                    preserve_endpoints=True
                )
                
                # Place interpolated frames
                for j, frame in enumerate(result.interpolated_frames):
                    output[start_idx + j] = frame
        
        # Fill any remaining gaps (shouldn't happen)
        for i in range(total_frames):
            if output[i] is None:
                # Find nearest non-None frame
                for offset in range(1, total_frames):
                    if i - offset >= 0 and output[i - offset] is not None:
                        output[i] = output[i - offset].copy()
                        break
                    if i + offset < total_frames and output[i + offset] is not None:
                        output[i] = output[i + offset].copy()
                        break
        
        return output
    
    def get_interpolation_statistics(
        self,
        result: InterpolationResult
    ) -> Dict[str, any]:
        """Calculate statistics for interpolation result."""
        return {
            'total_frames': len(result.interpolated_frames),
            'average_quality': np.mean(result.quality_scores),
            'min_quality': np.min(result.quality_scores),
            'max_quality': np.max(result.quality_scores),
            'low_quality_frames': sum(1 for q in result.quality_scores 
                                     if q < self.quality_threshold),
            'method': result.method_used,
            'processing_time': result.processing_time,
            'fps': len(result.interpolated_frames) / result.processing_time
        }
