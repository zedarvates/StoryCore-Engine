"""
Scene Detection Module

Detects scene changes in video sequences using content-based analysis.
Supports multiple detection algorithms and provides detailed scene metadata.

Author: AI Enhancement Team
Date: 2026-01-14
"""

from dataclasses import dataclass
from typing import List, Optional, Tuple, Dict, Any
from pathlib import Path
import numpy as np
from PIL import Image
import logging

logger = logging.getLogger(__name__)


@dataclass
class SceneChange:
    """Represents a detected scene change."""
    frame_number: int
    timestamp: float  # in seconds
    confidence: float  # 0.0 to 1.0
    change_type: str  # 'cut', 'fade', 'dissolve'
    metrics: Dict[str, float]  # Additional detection metrics


@dataclass
class Scene:
    """Represents a continuous scene in video."""
    start_frame: int
    end_frame: int
    start_time: float  # in seconds
    end_time: float  # in seconds
    duration: float  # in seconds
    frame_count: int
    average_brightness: float
    average_motion: float
    dominant_colors: List[Tuple[int, int, int]]  # RGB tuples
    scene_type: str  # 'static', 'dynamic', 'transition'


class SceneDetector:
    """
    Advanced scene detection using multiple algorithms.
    
    Detects scene changes using:
    - Content-based analysis (histogram differences)
    - Edge detection changes
    - Motion analysis
    - Color distribution changes
    
    Example:
        >>> detector = SceneDetector(threshold=30.0)
        >>> scenes = detector.detect_scenes_from_frames(frames, fps=30.0)
        >>> for scene in scenes:
        ...     print(f"Scene: {scene.start_time:.2f}s - {scene.end_time:.2f}s")
    """
    
    def __init__(
        self,
        threshold: float = 30.0,
        min_scene_length: int = 15,  # minimum frames
        adaptive_threshold: bool = True,
        detect_fades: bool = True
    ):
        """
        Initialize scene detector.
        
        Args:
            threshold: Detection sensitivity (lower = more sensitive)
            min_scene_length: Minimum frames for a valid scene
            adaptive_threshold: Adjust threshold based on content
            detect_fades: Detect fade transitions in addition to cuts
        """
        self.threshold = threshold
        self.min_scene_length = min_scene_length
        self.adaptive_threshold = adaptive_threshold
        self.detect_fades = detect_fades
        
        logger.info(f"SceneDetector initialized with threshold={threshold}")
    
    def detect_scenes_from_frames(
        self,
        frames: List[np.ndarray],
        fps: float = 30.0
    ) -> List[Scene]:
        """
        Detect scenes from a list of frames.
        
        Args:
            frames: List of frames as numpy arrays (H, W, C)
            fps: Frames per second for timestamp calculation
            
        Returns:
            List of detected scenes
        """
        if len(frames) < 2:
            logger.warning("Need at least 2 frames for scene detection")
            return []
        
        logger.info(f"Detecting scenes in {len(frames)} frames at {fps} fps")
        
        # Detect scene changes
        scene_changes = self._detect_scene_changes(frames, fps)
        
        # Build scenes from changes
        scenes = self._build_scenes(frames, scene_changes, fps)
        
        logger.info(f"Detected {len(scenes)} scenes")
        return scenes
    
    def _detect_scene_changes(
        self,
        frames: List[np.ndarray],
        fps: float
    ) -> List[SceneChange]:
        """Detect all scene changes in frame sequence."""
        changes = []
        
        for i in range(1, len(frames)):
            # Calculate frame difference metrics
            metrics = self._calculate_frame_difference(frames[i-1], frames[i])
            
            # Check if change exceeds threshold
            if metrics['content_diff'] > self.threshold:
                change_type = self._classify_change_type(
                    frames[i-1], frames[i], metrics
                )
                
                change = SceneChange(
                    frame_number=i,
                    timestamp=i / fps,
                    confidence=min(metrics['content_diff'] / 100.0, 1.0),
                    change_type=change_type,
                    metrics=metrics
                )
                changes.append(change)
                
                logger.debug(f"Scene change detected at frame {i} ({change_type})")
        
        return changes
    
    def _calculate_frame_difference(
        self,
        frame1: np.ndarray,
        frame2: np.ndarray
    ) -> Dict[str, float]:
        """Calculate various difference metrics between frames."""
        # Convert to grayscale for analysis
        gray1 = self._to_grayscale(frame1)
        gray2 = self._to_grayscale(frame2)
        
        # Histogram difference
        hist1 = np.histogram(gray1, bins=256, range=(0, 256))[0]
        hist2 = np.histogram(gray2, bins=256, range=(0, 256))[0]
        hist_diff = np.sum(np.abs(hist1 - hist2)) / np.sum(hist1 + hist2 + 1e-10)
        
        # Pixel difference
        pixel_diff = np.mean(np.abs(gray1.astype(float) - gray2.astype(float)))
        
        # Edge difference
        edges1 = self._detect_edges(gray1)
        edges2 = self._detect_edges(gray2)
        edge_diff = np.mean(np.abs(edges1 - edges2))
        
        # Combined content difference
        content_diff = (hist_diff * 50.0 + pixel_diff * 0.5 + edge_diff * 0.3)
        
        return {
            'content_diff': content_diff,
            'hist_diff': hist_diff,
            'pixel_diff': pixel_diff,
            'edge_diff': edge_diff
        }
    
    def _classify_change_type(
        self,
        frame1: np.ndarray,
        frame2: np.ndarray,
        metrics: Dict[str, float]
    ) -> str:
        """Classify the type of scene change."""
        # Check for fade (gradual brightness change)
        if self.detect_fades:
            brightness1 = np.mean(frame1)
            brightness2 = np.mean(frame2)
            brightness_diff = abs(brightness1 - brightness2)
            
            if brightness_diff > 50 and metrics['hist_diff'] < 0.3:
                return 'fade'
        
        # Check for dissolve (gradual content change)
        if metrics['hist_diff'] > 0.3 and metrics['pixel_diff'] < 30:
            return 'dissolve'
        
        # Default to cut (abrupt change)
        return 'cut'
    
    def _build_scenes(
        self,
        frames: List[np.ndarray],
        changes: List[SceneChange],
        fps: float
    ) -> List[Scene]:
        """Build scene objects from detected changes."""
        scenes = []
        
        # Add frame 0 as implicit scene start
        scene_starts = [0] + [change.frame_number for change in changes]
        scene_ends = [change.frame_number - 1 for change in changes] + [len(frames) - 1]
        
        for start, end in zip(scene_starts, scene_ends):
            # Skip scenes shorter than minimum length
            if end - start + 1 < self.min_scene_length:
                continue
            
            # Analyze scene content
            scene_frames = frames[start:end+1]
            analysis = self._analyze_scene_content(scene_frames)
            
            scene = Scene(
                start_frame=start,
                end_frame=end,
                start_time=start / fps,
                end_time=end / fps,
                duration=(end - start + 1) / fps,
                frame_count=end - start + 1,
                average_brightness=analysis['brightness'],
                average_motion=analysis['motion'],
                dominant_colors=analysis['colors'],
                scene_type=analysis['type']
            )
            scenes.append(scene)
        
        return scenes
    
    def _analyze_scene_content(
        self,
        frames: List[np.ndarray]
    ) -> Dict[str, Any]:
        """Analyze content characteristics of a scene."""
        # Calculate average brightness
        brightness = np.mean([np.mean(frame) for frame in frames])
        
        # Estimate motion (frame-to-frame differences)
        motion = 0.0
        if len(frames) > 1:
            diffs = []
            for i in range(1, len(frames)):
                diff = np.mean(np.abs(
                    frames[i].astype(float) - frames[i-1].astype(float)
                ))
                diffs.append(diff)
            motion = np.mean(diffs)
        
        # Extract dominant colors (simplified)
        all_pixels = np.concatenate([frame.reshape(-1, 3) for frame in frames])
        # Sample for performance
        sample_size = min(10000, len(all_pixels))
        sample = all_pixels[np.random.choice(len(all_pixels), sample_size, replace=False)]
        
        # K-means-like clustering (simplified to 3 dominant colors)
        dominant_colors = self._extract_dominant_colors(sample, k=3)
        
        # Classify scene type
        scene_type = 'static' if motion < 5.0 else 'dynamic'
        
        return {
            'brightness': brightness,
            'motion': motion,
            'colors': dominant_colors,
            'type': scene_type
        }
    
    def _extract_dominant_colors(
        self,
        pixels: np.ndarray,
        k: int = 3
    ) -> List[Tuple[int, int, int]]:
        """Extract k dominant colors from pixels (simplified clustering)."""
        # Simple quantization approach
        quantized = (pixels // 64) * 64 + 32  # Quantize to 4 levels per channel
        
        # Find most common colors
        unique, counts = np.unique(
            quantized.reshape(-1, 3),
            axis=0,
            return_counts=True
        )
        
        # Sort by frequency and take top k
        top_indices = np.argsort(counts)[-k:]
        dominant = unique[top_indices]
        
        return [tuple(map(int, color)) for color in dominant]
    
    @staticmethod
    def _to_grayscale(frame: np.ndarray) -> np.ndarray:
        """Convert frame to grayscale."""
        if len(frame.shape) == 3 and frame.shape[2] == 3:
            # RGB to grayscale
            return np.dot(frame[..., :3], [0.299, 0.587, 0.114]).astype(np.uint8)
        return frame
    
    @staticmethod
    def _detect_edges(gray_frame: np.ndarray) -> np.ndarray:
        """Simple edge detection using Sobel-like operator."""
        # Horizontal edges
        kernel_x = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]])
        # Vertical edges
        kernel_y = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]])
        
        # Pad frame
        padded = np.pad(gray_frame, 1, mode='edge')
        
        # Convolve
        edges_x = np.abs(SceneDetector._convolve2d(padded, kernel_x))
        edges_y = np.abs(SceneDetector._convolve2d(padded, kernel_y))
        
        # Combine
        edges = np.sqrt(edges_x**2 + edges_y**2)
        
        return edges[1:-1, 1:-1]  # Remove padding
    
    @staticmethod
    def _convolve2d(image: np.ndarray, kernel: np.ndarray) -> np.ndarray:
        """Simple 2D convolution (for edge detection)."""
        h, w = image.shape
        kh, kw = kernel.shape
        output = np.zeros((h - kh + 1, w - kw + 1))
        
        for i in range(output.shape[0]):
            for j in range(output.shape[1]):
                output[i, j] = np.sum(image[i:i+kh, j:j+kw] * kernel)
        
        return output
    
    def get_scene_statistics(self, scenes: List[Scene]) -> Dict[str, Any]:
        """Calculate statistics across all scenes."""
        if not scenes:
            return {}
        
        return {
            'total_scenes': len(scenes),
            'average_duration': np.mean([s.duration for s in scenes]),
            'total_duration': sum(s.duration for s in scenes),
            'shortest_scene': min(s.duration for s in scenes),
            'longest_scene': max(s.duration for s in scenes),
            'static_scenes': sum(1 for s in scenes if s.scene_type == 'static'),
            'dynamic_scenes': sum(1 for s in scenes if s.scene_type == 'dynamic'),
        }
