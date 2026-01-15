"""
Temporal Consistency Enforcement Module

Ensures temporal consistency across video frames to reduce flickering
and maintain smooth transitions in AI-enhanced video sequences.

Author: AI Enhancement Team
Date: 2026-01-14
"""

from dataclasses import dataclass
from typing import List, Optional, Dict, Callable
import numpy as np
from PIL import Image
import logging

logger = logging.getLogger(__name__)


@dataclass
class ConsistencyMetrics:
    """Metrics for temporal consistency analysis."""
    frame_index: int
    consistency_score: float  # 0.0 to 1.0 (higher is better)
    flicker_amount: float  # Amount of flickering detected
    color_drift: float  # Color consistency drift
    structure_drift: float  # Structural consistency drift
    recommendations: List[str]  # Suggested improvements


class TemporalConsistencyEnforcer:
    """
    Enforces temporal consistency across video frames.
    
    Uses temporal filtering, motion compensation, and adaptive smoothing
    to reduce flickering and maintain visual coherence in video sequences.
    
    Example:
        >>> enforcer = TemporalConsistencyEnforcer(window_size=5)
        >>> smoothed = enforcer.enforce_consistency(frames)
        >>> metrics = enforcer.analyze_consistency(frames)
    """
    
    def __init__(
        self,
        window_size: int = 5,
        temporal_weight: float = 0.3,
        spatial_weight: float = 0.7,
        flicker_threshold: float = 10.0
    ):
        """
        Initialize temporal consistency enforcer.
        
        Args:
            window_size: Number of frames to consider for temporal filtering
            temporal_weight: Weight for temporal consistency (0.0 to 1.0)
            spatial_weight: Weight for spatial quality (0.0 to 1.0)
            flicker_threshold: Threshold for flicker detection
        """
        self.window_size = window_size
        self.temporal_weight = temporal_weight
        self.spatial_weight = spatial_weight
        self.flicker_threshold = flicker_threshold
        
        # Normalize weights
        total = temporal_weight + spatial_weight
        self.temporal_weight /= total
        self.spatial_weight /= total
        
        logger.info(f"TemporalConsistencyEnforcer initialized (window={window_size})")
    
    def enforce_consistency(
        self,
        frames: List[np.ndarray],
        flow_fields: Optional[List] = None
    ) -> List[np.ndarray]:
        """
        Enforce temporal consistency across frames.
        
        Args:
            frames: List of frames to process
            flow_fields: Optional optical flow fields for motion compensation
            
        Returns:
            List of temporally consistent frames
        """
        if len(frames) < 2:
            return frames
        
        logger.info(f"Enforcing consistency on {len(frames)} frames")
        
        smoothed_frames = []
        
        for i, frame in enumerate(frames):
            # Get temporal window
            start_idx = max(0, i - self.window_size // 2)
            end_idx = min(len(frames), i + self.window_size // 2 + 1)
            window = frames[start_idx:end_idx]
            
            # Apply temporal filtering
            if len(window) > 1:
                smoothed = self._temporal_filter(frame, window, i - start_idx)
            else:
                smoothed = frame.copy()
            
            smoothed_frames.append(smoothed)
        
        logger.info("Temporal consistency enforced")
        return smoothed_frames
    
    def _temporal_filter(
        self,
        current_frame: np.ndarray,
        window: List[np.ndarray],
        current_idx: int
    ) -> np.ndarray:
        """Apply temporal filtering to reduce flickering."""
        # Calculate weights based on temporal distance
        weights = self._calculate_temporal_weights(len(window), current_idx)
        
        # Weighted average
        filtered = np.zeros_like(current_frame, dtype=float)
        
        for frame, weight in zip(window, weights):
            filtered += frame.astype(float) * weight
        
        # Blend with original based on temporal/spatial weights
        result = (
            filtered * self.temporal_weight +
            current_frame.astype(float) * self.spatial_weight
        )
        
        return np.clip(result, 0, 255).astype(np.uint8)
    
    def _calculate_temporal_weights(
        self,
        window_size: int,
        current_idx: int
    ) -> np.ndarray:
        """Calculate Gaussian weights for temporal filtering."""
        indices = np.arange(window_size)
        distances = np.abs(indices - current_idx)
        
        # Gaussian weights
        sigma = self.window_size / 4.0
        weights = np.exp(-(distances ** 2) / (2 * sigma ** 2))
        
        # Normalize
        weights /= np.sum(weights)
        
        return weights
    
    def analyze_consistency(
        self,
        frames: List[np.ndarray]
    ) -> List[ConsistencyMetrics]:
        """
        Analyze temporal consistency of frame sequence.
        
        Args:
            frames: List of frames to analyze
            
        Returns:
            List of consistency metrics for each frame
        """
        if len(frames) < 2:
            return []
        
        logger.info(f"Analyzing consistency of {len(frames)} frames")
        
        metrics = []
        
        for i in range(1, len(frames)):
            frame_metrics = self._analyze_frame_consistency(
                frames[i-1], frames[i], i
            )
            metrics.append(frame_metrics)
        
        return metrics
    
    def _analyze_frame_consistency(
        self,
        prev_frame: np.ndarray,
        curr_frame: np.ndarray,
        frame_idx: int
    ) -> ConsistencyMetrics:
        """Analyze consistency between two consecutive frames."""
        # Calculate flicker amount
        flicker = self._calculate_flicker(prev_frame, curr_frame)
        
        # Calculate color drift
        color_drift = self._calculate_color_drift(prev_frame, curr_frame)
        
        # Calculate structure drift
        structure_drift = self._calculate_structure_drift(prev_frame, curr_frame)
        
        # Overall consistency score (inverse of problems)
        consistency_score = 1.0 / (1.0 + flicker / 100.0 + color_drift + structure_drift)
        
        # Generate recommendations
        recommendations = self._generate_recommendations(
            flicker, color_drift, structure_drift
        )
        
        return ConsistencyMetrics(
            frame_index=frame_idx,
            consistency_score=consistency_score,
            flicker_amount=flicker,
            color_drift=color_drift,
            structure_drift=structure_drift,
            recommendations=recommendations
        )
    
    def _calculate_flicker(
        self,
        frame1: np.ndarray,
        frame2: np.ndarray
    ) -> float:
        """Calculate flicker amount between frames."""
        # Brightness difference
        brightness1 = np.mean(frame1)
        brightness2 = np.mean(frame2)
        brightness_diff = abs(brightness1 - brightness2)
        
        # High-frequency changes (potential flicker)
        diff = np.abs(frame1.astype(float) - frame2.astype(float))
        high_freq_diff = np.mean(diff)
        
        # Combined flicker metric
        flicker = brightness_diff * 0.3 + high_freq_diff * 0.7
        
        return float(flicker)
    
    def _calculate_color_drift(
        self,
        frame1: np.ndarray,
        frame2: np.ndarray
    ) -> float:
        """Calculate color consistency drift."""
        if len(frame1.shape) != 3 or frame1.shape[2] != 3:
            return 0.0
        
        # Calculate color histograms
        hist1 = [np.histogram(frame1[..., i], bins=32, range=(0, 256))[0] 
                 for i in range(3)]
        hist2 = [np.histogram(frame2[..., i], bins=32, range=(0, 256))[0] 
                 for i in range(3)]
        
        # Normalize histograms
        hist1 = [h / (np.sum(h) + 1e-10) for h in hist1]
        hist2 = [h / (np.sum(h) + 1e-10) for h in hist2]
        
        # Calculate histogram differences
        diffs = [np.sum(np.abs(h1 - h2)) for h1, h2 in zip(hist1, hist2)]
        
        # Average color drift
        color_drift = np.mean(diffs)
        
        return float(color_drift)
    
    def _calculate_structure_drift(
        self,
        frame1: np.ndarray,
        frame2: np.ndarray
    ) -> float:
        """Calculate structural consistency drift."""
        # Convert to grayscale
        gray1 = self._to_grayscale(frame1)
        gray2 = self._to_grayscale(frame2)
        
        # Calculate edge maps
        edges1 = self._detect_edges(gray1)
        edges2 = self._detect_edges(gray2)
        
        # Edge difference
        edge_diff = np.mean(np.abs(edges1 - edges2))
        
        # Normalize
        structure_drift = edge_diff / 255.0
        
        return float(structure_drift)
    
    def _generate_recommendations(
        self,
        flicker: float,
        color_drift: float,
        structure_drift: float
    ) -> List[str]:
        """Generate recommendations based on consistency analysis."""
        recommendations = []
        
        if flicker > self.flicker_threshold:
            recommendations.append(
                f"High flicker detected ({flicker:.1f}). "
                "Consider increasing temporal filtering."
            )
        
        if color_drift > 0.3:
            recommendations.append(
                f"Significant color drift ({color_drift:.2f}). "
                "Consider color correction or histogram matching."
            )
        
        if structure_drift > 0.2:
            recommendations.append(
                f"Structural inconsistency detected ({structure_drift:.2f}). "
                "Consider motion compensation or re-processing."
            )
        
        if not recommendations:
            recommendations.append("Temporal consistency is good.")
        
        return recommendations
    
    def apply_adaptive_smoothing(
        self,
        frames: List[np.ndarray],
        consistency_metrics: List[ConsistencyMetrics]
    ) -> List[np.ndarray]:
        """
        Apply adaptive smoothing based on consistency metrics.
        
        Args:
            frames: Original frames
            consistency_metrics: Consistency analysis results
            
        Returns:
            Adaptively smoothed frames
        """
        if len(frames) != len(consistency_metrics) + 1:
            logger.warning("Frame count mismatch with metrics")
            return frames
        
        smoothed = [frames[0].copy()]  # First frame unchanged
        
        for i, metrics in enumerate(consistency_metrics):
            frame_idx = i + 1
            
            # Determine smoothing strength based on consistency
            if metrics.consistency_score < 0.7:
                # Strong smoothing for inconsistent frames
                strength = 0.5
            elif metrics.consistency_score < 0.85:
                # Moderate smoothing
                strength = 0.3
            else:
                # Light smoothing
                strength = 0.1
            
            # Blend with previous frame
            prev_frame = smoothed[-1]
            curr_frame = frames[frame_idx]
            
            blended = (
                prev_frame.astype(float) * strength +
                curr_frame.astype(float) * (1.0 - strength)
            )
            
            smoothed.append(np.clip(blended, 0, 255).astype(np.uint8))
        
        logger.info("Adaptive smoothing applied")
        return smoothed
    
    @staticmethod
    def _to_grayscale(frame: np.ndarray) -> np.ndarray:
        """Convert frame to grayscale."""
        if len(frame.shape) == 3 and frame.shape[2] == 3:
            return np.dot(frame[..., :3], [0.299, 0.587, 0.114]).astype(np.uint8)
        return frame.astype(np.uint8)
    
    @staticmethod
    def _detect_edges(gray_frame: np.ndarray) -> np.ndarray:
        """Simple edge detection."""
        # Sobel kernels
        sobel_x = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])
        sobel_y = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]])
        
        # Pad frame
        padded = np.pad(gray_frame.astype(float), 1, mode='edge')
        
        # Convolve
        edges_x = np.abs(TemporalConsistencyEnforcer._convolve2d(padded, sobel_x))
        edges_y = np.abs(TemporalConsistencyEnforcer._convolve2d(padded, sobel_y))
        
        # Combine
        edges = np.sqrt(edges_x**2 + edges_y**2)
        
        return edges[1:-1, 1:-1]
    
    @staticmethod
    def _convolve2d(image: np.ndarray, kernel: np.ndarray) -> np.ndarray:
        """Simple 2D convolution."""
        h, w = image.shape
        kh, kw = kernel.shape
        output = np.zeros((h - kh + 1, w - kw + 1))
        
        for i in range(output.shape[0]):
            for j in range(output.shape[1]):
                output[i, j] = np.sum(image[i:i+kh, j:j+kw] * kernel)
        
        return output
    
    def get_consistency_summary(
        self,
        metrics: List[ConsistencyMetrics]
    ) -> Dict[str, any]:
        """Generate summary statistics for consistency metrics."""
        if not metrics:
            return {}
        
        scores = [m.consistency_score for m in metrics]
        flickers = [m.flicker_amount for m in metrics]
        color_drifts = [m.color_drift for m in metrics]
        structure_drifts = [m.structure_drift for m in metrics]
        
        return {
            'average_consistency': np.mean(scores),
            'min_consistency': np.min(scores),
            'max_consistency': np.max(scores),
            'average_flicker': np.mean(flickers),
            'max_flicker': np.max(flickers),
            'average_color_drift': np.mean(color_drifts),
            'average_structure_drift': np.mean(structure_drifts),
            'problematic_frames': sum(1 for s in scores if s < 0.7),
            'total_frames': len(metrics)
        }
