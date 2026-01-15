"""
Optical Flow Analysis Module

Analyzes motion between frames using optical flow algorithms.
Provides motion vectors, flow fields, and motion statistics.

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
class MotionVector:
    """Represents motion at a specific point."""
    x: int  # pixel x coordinate
    y: int  # pixel y coordinate
    dx: float  # horizontal displacement
    dy: float  # vertical displacement
    magnitude: float  # motion magnitude
    angle: float  # motion direction in radians


@dataclass
class FlowField:
    """Represents the complete optical flow field between two frames."""
    flow_x: np.ndarray  # horizontal flow component
    flow_y: np.ndarray  # vertical flow component
    magnitude: np.ndarray  # flow magnitude at each pixel
    angle: np.ndarray  # flow direction at each pixel
    average_motion: float  # average motion magnitude
    max_motion: float  # maximum motion magnitude
    motion_vectors: List[MotionVector]  # sampled motion vectors


class OpticalFlowAnalyzer:
    """
    Optical flow computation using Farneback algorithm.
    
    Computes dense optical flow between consecutive frames to analyze
    motion patterns, object movement, and camera motion.
    
    Example:
        >>> analyzer = OpticalFlowAnalyzer()
        >>> flow = analyzer.compute_flow(frame1, frame2)
        >>> print(f"Average motion: {flow.average_motion:.2f} pixels")
    """
    
    def __init__(
        self,
        pyr_scale: float = 0.5,
        levels: int = 3,
        winsize: int = 15,
        iterations: int = 3,
        poly_n: int = 5,
        poly_sigma: float = 1.2
    ):
        """
        Initialize optical flow analyzer.
        
        Args:
            pyr_scale: Pyramid scale factor
            levels: Number of pyramid levels
            winsize: Averaging window size
            iterations: Number of iterations at each pyramid level
            poly_n: Size of pixel neighborhood
            poly_sigma: Standard deviation of Gaussian for polynomial expansion
        """
        self.pyr_scale = pyr_scale
        self.levels = levels
        self.winsize = winsize
        self.iterations = iterations
        self.poly_n = poly_n
        self.poly_sigma = poly_sigma
        
        logger.info("OpticalFlowAnalyzer initialized")
    
    def compute_flow(
        self,
        frame1: np.ndarray,
        frame2: np.ndarray,
        sample_vectors: bool = True,
        sample_stride: int = 16
    ) -> FlowField:
        """
        Compute optical flow between two frames.
        
        Args:
            frame1: First frame (H, W, C) or (H, W)
            frame2: Second frame (H, W, C) or (H, W)
            sample_vectors: Whether to sample motion vectors
            sample_stride: Stride for sampling motion vectors
            
        Returns:
            FlowField containing flow information
        """
        # Convert to grayscale if needed
        gray1 = self._to_grayscale(frame1)
        gray2 = self._to_grayscale(frame2)
        
        # Compute optical flow using Farneback algorithm
        flow = self._compute_farneback_flow(gray1, gray2)
        
        # Extract flow components
        flow_x = flow[..., 0]
        flow_y = flow[..., 1]
        
        # Calculate magnitude and angle
        magnitude = np.sqrt(flow_x**2 + flow_y**2)
        angle = np.arctan2(flow_y, flow_x)
        
        # Calculate statistics
        average_motion = np.mean(magnitude)
        max_motion = np.max(magnitude)
        
        # Sample motion vectors if requested
        motion_vectors = []
        if sample_vectors:
            motion_vectors = self._sample_motion_vectors(
                flow_x, flow_y, magnitude, angle, sample_stride
            )
        
        logger.debug(f"Flow computed: avg={average_motion:.2f}, max={max_motion:.2f}")
        
        return FlowField(
            flow_x=flow_x,
            flow_y=flow_y,
            magnitude=magnitude,
            angle=angle,
            average_motion=average_motion,
            max_motion=max_motion,
            motion_vectors=motion_vectors
        )
    
    def _compute_farneback_flow(
        self,
        gray1: np.ndarray,
        gray2: np.ndarray
    ) -> np.ndarray:
        """
        Compute dense optical flow using Farneback algorithm.
        
        This is a simplified implementation. For production, use cv2.calcOpticalFlowFarneback.
        """
        # For now, use a simplified gradient-based approach
        # In production, this would use the full Farneback algorithm
        
        h, w = gray1.shape
        flow = np.zeros((h, w, 2), dtype=np.float32)
        
        # Compute image gradients
        grad_x1, grad_y1 = self._compute_gradients(gray1)
        grad_x2, grad_y2 = self._compute_gradients(gray2)
        
        # Temporal gradient
        grad_t = gray2.astype(float) - gray1.astype(float)
        
        # Lucas-Kanade-like flow estimation
        for i in range(self.winsize // 2, h - self.winsize // 2, 2):
            for j in range(self.winsize // 2, w - self.winsize // 2, 2):
                # Extract window
                i1, i2 = i - self.winsize // 2, i + self.winsize // 2 + 1
                j1, j2 = j - self.winsize // 2, j + self.winsize // 2 + 1
                
                Ix = grad_x1[i1:i2, j1:j2].flatten()
                Iy = grad_y1[i1:i2, j1:j2].flatten()
                It = grad_t[i1:i2, j1:j2].flatten()
                
                # Build system
                A = np.column_stack([Ix, Iy])
                b = -It
                
                # Solve least squares
                try:
                    v, residuals, rank, s = np.linalg.lstsq(A, b, rcond=None)
                    if rank >= 2:
                        flow[i, j] = v
                except:
                    pass
        
        # Interpolate to fill gaps
        flow = self._interpolate_flow(flow)
        
        return flow
    
    def _compute_gradients(self, image: np.ndarray) -> Tuple[np.ndarray, np.ndarray]:
        """Compute image gradients using Sobel operator."""
        # Sobel kernels
        sobel_x = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]]) / 8.0
        sobel_y = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]]) / 8.0
        
        # Pad image
        padded = np.pad(image.astype(float), 1, mode='edge')
        
        # Convolve
        grad_x = self._convolve2d(padded, sobel_x)
        grad_y = self._convolve2d(padded, sobel_y)
        
        return grad_x, grad_y
    
    def _interpolate_flow(self, flow: np.ndarray) -> np.ndarray:
        """Interpolate flow field to fill gaps."""
        # Simple nearest-neighbor interpolation
        h, w = flow.shape[:2]
        
        for i in range(h):
            for j in range(w):
                if np.all(flow[i, j] == 0):
                    # Find nearest non-zero flow
                    neighbors = []
                    for di in [-1, 0, 1]:
                        for dj in [-1, 0, 1]:
                            ni, nj = i + di, j + dj
                            if 0 <= ni < h and 0 <= nj < w:
                                if not np.all(flow[ni, nj] == 0):
                                    neighbors.append(flow[ni, nj])
                    
                    if neighbors:
                        flow[i, j] = np.mean(neighbors, axis=0)
        
        return flow
    
    def _sample_motion_vectors(
        self,
        flow_x: np.ndarray,
        flow_y: np.ndarray,
        magnitude: np.ndarray,
        angle: np.ndarray,
        stride: int
    ) -> List[MotionVector]:
        """Sample motion vectors from flow field."""
        vectors = []
        h, w = flow_x.shape
        
        for i in range(0, h, stride):
            for j in range(0, w, stride):
                vector = MotionVector(
                    x=j,
                    y=i,
                    dx=float(flow_x[i, j]),
                    dy=float(flow_y[i, j]),
                    magnitude=float(magnitude[i, j]),
                    angle=float(angle[i, j])
                )
                vectors.append(vector)
        
        return vectors
    
    def analyze_motion_patterns(
        self,
        flow: FlowField
    ) -> Dict[str, any]:
        """
        Analyze motion patterns in flow field.
        
        Returns:
            Dictionary with motion analysis results
        """
        # Classify motion type
        motion_type = self._classify_motion_type(flow)
        
        # Detect dominant motion direction
        dominant_direction = self._get_dominant_direction(flow)
        
        # Calculate motion statistics
        stats = {
            'motion_type': motion_type,
            'dominant_direction': dominant_direction,
            'average_magnitude': flow.average_motion,
            'max_magnitude': flow.max_motion,
            'motion_variance': np.var(flow.magnitude),
            'directional_consistency': self._calculate_directional_consistency(flow),
        }
        
        return stats
    
    def _classify_motion_type(self, flow: FlowField) -> str:
        """Classify the type of motion in the flow field."""
        avg_mag = flow.average_motion
        var_mag = np.var(flow.magnitude)
        
        if avg_mag < 1.0:
            return 'static'
        elif avg_mag < 5.0 and var_mag < 10.0:
            return 'slow_uniform'
        elif avg_mag < 10.0:
            return 'moderate'
        elif var_mag < 50.0:
            return 'fast_uniform'
        else:
            return 'complex'
    
    def _get_dominant_direction(self, flow: FlowField) -> str:
        """Get dominant motion direction."""
        # Calculate average angle weighted by magnitude
        weights = flow.magnitude.flatten()
        angles = flow.angle.flatten()
        
        # Filter out very small motions
        mask = weights > 1.0
        if not np.any(mask):
            return 'none'
        
        weighted_angles = angles[mask] * weights[mask]
        avg_angle = np.sum(weighted_angles) / np.sum(weights[mask])
        
        # Convert to direction
        angle_deg = np.degrees(avg_angle) % 360
        
        if angle_deg < 22.5 or angle_deg >= 337.5:
            return 'right'
        elif angle_deg < 67.5:
            return 'down-right'
        elif angle_deg < 112.5:
            return 'down'
        elif angle_deg < 157.5:
            return 'down-left'
        elif angle_deg < 202.5:
            return 'left'
        elif angle_deg < 247.5:
            return 'up-left'
        elif angle_deg < 292.5:
            return 'up'
        else:
            return 'up-right'
    
    def _calculate_directional_consistency(self, flow: FlowField) -> float:
        """Calculate how consistent motion directions are."""
        # Filter significant motion
        mask = flow.magnitude > 1.0
        if not np.any(mask):
            return 1.0
        
        angles = flow.angle[mask]
        
        # Calculate circular variance
        mean_cos = np.mean(np.cos(angles))
        mean_sin = np.mean(np.sin(angles))
        r = np.sqrt(mean_cos**2 + mean_sin**2)
        
        # r close to 1 means high consistency
        return float(r)
    
    @staticmethod
    def _to_grayscale(frame: np.ndarray) -> np.ndarray:
        """Convert frame to grayscale."""
        if len(frame.shape) == 3 and frame.shape[2] == 3:
            return np.dot(frame[..., :3], [0.299, 0.587, 0.114]).astype(np.uint8)
        return frame.astype(np.uint8)
    
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
    
    def visualize_flow(
        self,
        flow: FlowField,
        scale: float = 1.0
    ) -> np.ndarray:
        """
        Create a visualization of the optical flow.
        
        Args:
            flow: Flow field to visualize
            scale: Scale factor for visualization
            
        Returns:
            RGB image visualizing the flow (HSV color wheel)
        """
        h, w = flow.magnitude.shape
        
        # Create HSV image
        hsv = np.zeros((h, w, 3), dtype=np.uint8)
        
        # Hue represents direction
        hsv[..., 0] = ((flow.angle + np.pi) / (2 * np.pi) * 180).astype(np.uint8)
        
        # Saturation is always max
        hsv[..., 1] = 255
        
        # Value represents magnitude
        normalized_mag = np.clip(flow.magnitude * scale, 0, 255).astype(np.uint8)
        hsv[..., 2] = normalized_mag
        
        # Convert HSV to RGB (simplified)
        rgb = self._hsv_to_rgb(hsv)
        
        return rgb
    
    @staticmethod
    def _hsv_to_rgb(hsv: np.ndarray) -> np.ndarray:
        """Convert HSV to RGB (simplified)."""
        h, w = hsv.shape[:2]
        rgb = np.zeros((h, w, 3), dtype=np.uint8)
        
        H = hsv[..., 0].astype(float) / 180.0 * 360.0
        S = hsv[..., 1].astype(float) / 255.0
        V = hsv[..., 2].astype(float) / 255.0
        
        C = V * S
        X = C * (1 - np.abs((H / 60.0) % 2 - 1))
        m = V - C
        
        # Determine RGB based on hue
        rgb_prime = np.zeros((h, w, 3))
        
        mask = (H >= 0) & (H < 60)
        rgb_prime[mask] = np.stack([C[mask], X[mask], np.zeros_like(C[mask])], axis=-1)
        
        mask = (H >= 60) & (H < 120)
        rgb_prime[mask] = np.stack([X[mask], C[mask], np.zeros_like(C[mask])], axis=-1)
        
        mask = (H >= 120) & (H < 180)
        rgb_prime[mask] = np.stack([np.zeros_like(C[mask]), C[mask], X[mask]], axis=-1)
        
        mask = (H >= 180) & (H < 240)
        rgb_prime[mask] = np.stack([np.zeros_like(C[mask]), X[mask], C[mask]], axis=-1)
        
        mask = (H >= 240) & (H < 300)
        rgb_prime[mask] = np.stack([X[mask], np.zeros_like(C[mask]), C[mask]], axis=-1)
        
        mask = (H >= 300) & (H < 360)
        rgb_prime[mask] = np.stack([C[mask], np.zeros_like(C[mask]), X[mask]], axis=-1)
        
        rgb = ((rgb_prime + m[..., np.newaxis]) * 255).astype(np.uint8)
        
        return rgb
