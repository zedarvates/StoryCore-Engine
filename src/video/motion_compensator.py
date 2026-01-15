"""
Motion Compensation Module

Compensates for camera and object motion to improve temporal consistency
and enable better frame interpolation and enhancement.

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
class CompensationResult:
    """Result of motion compensation."""
    compensated_frame: np.ndarray
    transformation_matrix: np.ndarray  # 3x3 transformation matrix
    compensation_type: str  # 'translation', 'affine', 'perspective'
    confidence: float  # 0.0 to 1.0
    residual_motion: float  # Remaining motion after compensation


class MotionCompensator:
    """
    Motion compensation for video frames.
    
    Compensates for camera motion (pan, tilt, zoom) and object motion
    to stabilize video and improve temporal consistency.
    
    Example:
        >>> compensator = MotionCompensator()
        >>> result = compensator.compensate(frame1, frame2, flow_field)
        >>> stabilized = result.compensated_frame
    """
    
    def __init__(
        self,
        compensation_mode: str = 'affine',
        max_shift: int = 50,
        confidence_threshold: float = 0.5
    ):
        """
        Initialize motion compensator.
        
        Args:
            compensation_mode: Type of compensation ('translation', 'affine', 'perspective')
            max_shift: Maximum allowed pixel shift
            confidence_threshold: Minimum confidence for applying compensation
        """
        self.compensation_mode = compensation_mode
        self.max_shift = max_shift
        self.confidence_threshold = confidence_threshold
        
        logger.info(f"MotionCompensator initialized (mode={compensation_mode})")
    
    def compensate(
        self,
        reference_frame: np.ndarray,
        target_frame: np.ndarray,
        flow_field: Optional[any] = None
    ) -> CompensationResult:
        """
        Compensate motion between reference and target frames.
        
        Args:
            reference_frame: Reference frame
            target_frame: Frame to compensate
            flow_field: Optional pre-computed optical flow
            
        Returns:
            CompensationResult with compensated frame
        """
        # Estimate transformation
        if self.compensation_mode == 'translation':
            transform, confidence = self._estimate_translation(
                reference_frame, target_frame, flow_field
            )
        elif self.compensation_mode == 'affine':
            transform, confidence = self._estimate_affine(
                reference_frame, target_frame, flow_field
            )
        else:  # perspective
            transform, confidence = self._estimate_perspective(
                reference_frame, target_frame, flow_field
            )
        
        # Apply transformation if confidence is sufficient
        if confidence >= self.confidence_threshold:
            compensated = self._apply_transformation(target_frame, transform)
        else:
            compensated = target_frame.copy()
            logger.debug(f"Low confidence ({confidence:.2f}), skipping compensation")
        
        # Calculate residual motion
        residual = self._calculate_residual_motion(
            reference_frame, compensated
        )
        
        return CompensationResult(
            compensated_frame=compensated,
            transformation_matrix=transform,
            compensation_type=self.compensation_mode,
            confidence=confidence,
            residual_motion=residual
        )
    
    def _estimate_translation(
        self,
        ref_frame: np.ndarray,
        target_frame: np.ndarray,
        flow_field: Optional[any] = None
    ) -> Tuple[np.ndarray, float]:
        """Estimate translation (dx, dy) between frames."""
        if flow_field is not None:
            # Use flow field to estimate translation
            dx = np.median(flow_field.flow_x)
            dy = np.median(flow_field.flow_y)
            
            # Confidence based on flow consistency
            flow_std = np.std(flow_field.magnitude)
            confidence = 1.0 / (1.0 + flow_std / 10.0)
        else:
            # Use phase correlation
            dx, dy, confidence = self._phase_correlation(ref_frame, target_frame)
        
        # Clamp to max shift
        dx = np.clip(dx, -self.max_shift, self.max_shift)
        dy = np.clip(dy, -self.max_shift, self.max_shift)
        
        # Build transformation matrix
        transform = np.array([
            [1, 0, -dx],
            [0, 1, -dy],
            [0, 0, 1]
        ], dtype=float)
        
        return transform, confidence
    
    def _estimate_affine(
        self,
        ref_frame: np.ndarray,
        target_frame: np.ndarray,
        flow_field: Optional[any] = None
    ) -> Tuple[np.ndarray, float]:
        """Estimate affine transformation between frames."""
        # For simplicity, start with translation
        translation, conf_trans = self._estimate_translation(
            ref_frame, target_frame, flow_field
        )
        
        # Estimate rotation and scale (simplified)
        # In production, use feature matching (SIFT, ORB, etc.)
        
        # For now, return translation with affine structure
        transform = translation.copy()
        confidence = conf_trans * 0.8  # Slightly lower confidence for affine
        
        return transform, confidence
    
    def _estimate_perspective(
        self,
        ref_frame: np.ndarray,
        target_frame: np.ndarray,
        flow_field: Optional[any] = None
    ) -> Tuple[np.ndarray, float]:
        """Estimate perspective transformation between frames."""
        # Start with affine
        affine, conf_affine = self._estimate_affine(
            ref_frame, target_frame, flow_field
        )
        
        # For perspective, would need feature matching and homography estimation
        # For now, return affine with perspective structure
        transform = affine.copy()
        confidence = conf_affine * 0.7  # Lower confidence for perspective
        
        return transform, confidence
    
    def _phase_correlation(
        self,
        ref_frame: np.ndarray,
        target_frame: np.ndarray
    ) -> Tuple[float, float, float]:
        """
        Estimate translation using phase correlation.
        
        Returns:
            (dx, dy, confidence)
        """
        # Convert to grayscale
        gray_ref = self._to_grayscale(ref_frame)
        gray_target = self._to_grayscale(target_frame)
        
        # Ensure same size
        h, w = min(gray_ref.shape[0], gray_target.shape[0]), \
               min(gray_ref.shape[1], gray_target.shape[1])
        gray_ref = gray_ref[:h, :w]
        gray_target = gray_target[:h, :w]
        
        # FFT
        f_ref = np.fft.fft2(gray_ref)
        f_target = np.fft.fft2(gray_target)
        
        # Cross-power spectrum
        cross_power = (f_ref * np.conj(f_target)) / (np.abs(f_ref * np.conj(f_target)) + 1e-10)
        
        # Inverse FFT
        correlation = np.fft.ifft2(cross_power)
        correlation = np.abs(correlation)
        
        # Find peak
        peak_y, peak_x = np.unravel_index(np.argmax(correlation), correlation.shape)
        
        # Convert to shift (handle wrapping)
        dy = peak_y if peak_y < h // 2 else peak_y - h
        dx = peak_x if peak_x < w // 2 else peak_x - w
        
        # Confidence based on peak sharpness
        peak_value = correlation[peak_y, peak_x]
        mean_value = np.mean(correlation)
        confidence = min((peak_value - mean_value) / (peak_value + 1e-10), 1.0)
        
        return float(dx), float(dy), float(confidence)
    
    def _apply_transformation(
        self,
        frame: np.ndarray,
        transform: np.ndarray
    ) -> np.ndarray:
        """Apply transformation matrix to frame."""
        h, w = frame.shape[:2]
        
        # Extract translation components (simplified)
        dx = -transform[0, 2]
        dy = -transform[1, 2]
        
        # Create output frame
        compensated = np.zeros_like(frame)
        
        # Apply translation (simplified warp)
        dx_int, dy_int = int(round(dx)), int(round(dy))
        
        # Source region
        src_x1 = max(0, -dx_int)
        src_y1 = max(0, -dy_int)
        src_x2 = min(w, w - dx_int)
        src_y2 = min(h, h - dy_int)
        
        # Destination region
        dst_x1 = max(0, dx_int)
        dst_y1 = max(0, dy_int)
        dst_x2 = min(w, w + dx_int)
        dst_y2 = min(h, h + dy_int)
        
        # Copy shifted region
        compensated[dst_y1:dst_y2, dst_x1:dst_x2] = \
            frame[src_y1:src_y2, src_x1:src_x2]
        
        # Fill borders with edge values
        if dst_x1 > 0:
            compensated[:, :dst_x1] = compensated[:, dst_x1:dst_x1+1]
        if dst_x2 < w:
            compensated[:, dst_x2:] = compensated[:, dst_x2-1:dst_x2]
        if dst_y1 > 0:
            compensated[:dst_y1, :] = compensated[dst_y1:dst_y1+1, :]
        if dst_y2 < h:
            compensated[dst_y2:, :] = compensated[dst_y2-1:dst_y2, :]
        
        return compensated
    
    def _calculate_residual_motion(
        self,
        ref_frame: np.ndarray,
        compensated_frame: np.ndarray
    ) -> float:
        """Calculate remaining motion after compensation."""
        # Simple pixel difference
        diff = np.mean(np.abs(
            ref_frame.astype(float) - compensated_frame.astype(float)
        ))
        
        return float(diff)
    
    def stabilize_sequence(
        self,
        frames: List[np.ndarray],
        reference_index: Optional[int] = None
    ) -> List[np.ndarray]:
        """
        Stabilize entire video sequence.
        
        Args:
            frames: List of frames to stabilize
            reference_index: Index of reference frame (default: middle frame)
            
        Returns:
            List of stabilized frames
        """
        if len(frames) < 2:
            return frames
        
        # Use middle frame as reference if not specified
        if reference_index is None:
            reference_index = len(frames) // 2
        
        reference = frames[reference_index]
        stabilized = [None] * len(frames)
        stabilized[reference_index] = reference.copy()
        
        logger.info(f"Stabilizing {len(frames)} frames (ref={reference_index})")
        
        # Stabilize frames before reference
        for i in range(reference_index - 1, -1, -1):
            result = self.compensate(reference, frames[i])
            stabilized[i] = result.compensated_frame
            reference = stabilized[i]  # Use previous stabilized frame as reference
        
        # Reset reference
        reference = frames[reference_index]
        
        # Stabilize frames after reference
        for i in range(reference_index + 1, len(frames)):
            result = self.compensate(reference, frames[i])
            stabilized[i] = result.compensated_frame
            reference = stabilized[i]
        
        logger.info("Sequence stabilization complete")
        return stabilized
    
    @staticmethod
    def _to_grayscale(frame: np.ndarray) -> np.ndarray:
        """Convert frame to grayscale."""
        if len(frame.shape) == 3 and frame.shape[2] == 3:
            return np.dot(frame[..., :3], [0.299, 0.587, 0.114]).astype(np.uint8)
        return frame.astype(np.uint8)
    
    def get_stabilization_metrics(
        self,
        original_frames: List[np.ndarray],
        stabilized_frames: List[np.ndarray]
    ) -> Dict[str, float]:
        """Calculate metrics comparing original and stabilized sequences."""
        if len(original_frames) != len(stabilized_frames):
            logger.warning("Frame count mismatch")
            return {}
        
        # Calculate frame-to-frame motion before and after
        original_motion = []
        stabilized_motion = []
        
        for i in range(1, len(original_frames)):
            orig_diff = np.mean(np.abs(
                original_frames[i].astype(float) - original_frames[i-1].astype(float)
            ))
            stab_diff = np.mean(np.abs(
                stabilized_frames[i].astype(float) - stabilized_frames[i-1].astype(float)
            ))
            
            original_motion.append(orig_diff)
            stabilized_motion.append(stab_diff)
        
        return {
            'original_average_motion': np.mean(original_motion),
            'stabilized_average_motion': np.mean(stabilized_motion),
            'motion_reduction': (
                (np.mean(original_motion) - np.mean(stabilized_motion)) /
                (np.mean(original_motion) + 1e-10)
            ),
            'original_motion_variance': np.var(original_motion),
            'stabilized_motion_variance': np.var(stabilized_motion),
        }
