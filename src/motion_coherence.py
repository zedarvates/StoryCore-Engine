#!/usr/bin/env python3
"""
StoryCore-Engine Motion Coherence Engine
Maintains character stability, lighting consistency, and color palette preservation across frame sequences.
"""

import logging
import math
from pathlib import Path
from typing import List, Dict, Any, Optional, Tuple, Union
from dataclasses import dataclass, asdict
from enum import Enum
import time

# Try to import numpy
try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    # Create a simple numpy-like interface for basic operations
    class SimpleNumPy:
        @staticmethod
        def array(data, dtype=None):
            return data
        
        @staticmethod
        def mean(data):
            if isinstance(data, (list, tuple)):
                return sum(data) / len(data) if data else 0
            return data
        
        @staticmethod
        def std(data):
            if isinstance(data, (list, tuple)) and len(data) > 1:
                mean_val = SimpleNumPy.mean(data)
                variance = sum((x - mean_val) ** 2 for x in data) / len(data)
                return math.sqrt(variance)
            return 0.0
        
        @staticmethod
        def abs(data):
            if isinstance(data, (list, tuple)):
                return [abs(x) for x in data]
            return abs(data)
        
        @staticmethod
        def corrcoef(x, y):
            if len(x) != len(y) or len(x) < 2:
                return [[1.0, 0.0], [0.0, 1.0]]
            
            mean_x = SimpleNumPy.mean(x)
            mean_y = SimpleNumPy.mean(y)
            
            numerator = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(len(x)))
            sum_sq_x = sum((x[i] - mean_x) ** 2 for i in range(len(x)))
            sum_sq_y = sum((y[i] - mean_y) ** 2 for i in range(len(y)))
            
            denominator = math.sqrt(sum_sq_x * sum_sq_y)
            correlation = numerator / denominator if denominator != 0 else 0.0
            
            return [[1.0, correlation], [correlation, 1.0]]
        
        @staticmethod
        def histogram(data, bins=10, range=None):
            if not data:
                return [0] * bins, []
            
            min_val, max_val = range if range else (min(data), max(data))
            if min_val == max_val:
                hist = [0] * bins
                hist[0] = len(data)
                return hist, []
            
            bin_width = (max_val - min_val) / bins
            hist = [0] * bins
            
            for value in data:
                bin_idx = min(bins - 1, int((value - min_val) / bin_width))
                hist[bin_idx] += 1
            
            return hist, []
        
        @staticmethod
        def sum(data):
            return sum(data) if isinstance(data, (list, tuple)) else data
        
        @staticmethod
        def max(data):
            return max(data) if isinstance(data, (list, tuple)) else data
        
        @staticmethod
        def min(data):
            return min(data) if isinstance(data, (list, tuple)) else data
        
        @staticmethod
        def isnan(data):
            return False
        
        @staticmethod
        def unravel_index(indices, shape):
            if isinstance(indices, int):
                if len(shape) == 2:
                    return (indices // shape[1], indices % shape[1])
            return (0, 0)
        
        @staticmethod
        def argmax(data):
            if isinstance(data, (list, tuple)):
                if len(data) == 0:
                    return 0
                if isinstance(data[0], (list, tuple)):
                    # 2D array
                    max_val = float('-inf')
                    max_idx = 0
                    for i, row in enumerate(data):
                        for j, val in enumerate(row):
                            if val > max_val:
                                max_val = val
                                max_idx = i * len(row) + j
                    return max_idx
                else:
                    # 1D array
                    return data.index(max(data))
            return 0
        
        @staticmethod
        def random():
            import random
            class MockRandom:
                @staticmethod
                def randint(low, high, size=None, dtype=None):
                    if size is None:
                        return random.randint(low, high)
                    
                    if isinstance(size, tuple):
                        if len(size) == 3:  # (height, width, channels)
                            h, w, c = size
                            return [[[random.randint(low, high) for _ in range(c)] 
                                    for _ in range(w)] for _ in range(h)]
                        elif len(size) == 2:  # (height, width)
                            h, w = size
                            return [[random.randint(low, high) for _ in range(w)] for _ in range(h)]
                    
                    return [random.randint(low, high) for _ in range(size)]
            return MockRandom()
    
    np = SimpleNumPy()
    logging.warning("NumPy not available - using simplified operations")

# Try to import OpenCV for advanced image analysis
try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False
    logging.warning("OpenCV not available - using basic analysis only")

# Try to import PIL for image processing
try:
    from PIL import Image, ImageStat, ImageFilter
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    logging.warning("PIL not available - limited image analysis")

logger = logging.getLogger(__name__)


def get_frame_shape(frame):
    """Get shape of frame (list or array)."""
    if isinstance(frame, list):
        if len(frame) == 0:
            return (0,)
        if isinstance(frame[0], list):
            if len(frame[0]) == 0:
                return (len(frame), 0)
            if isinstance(frame[0][0], list):
                return (len(frame), len(frame[0]), len(frame[0][0]))
            else:
                return (len(frame), len(frame[0]))
        else:
            return (len(frame),)
    else:
        return getattr(frame, 'shape', (0,))


def frames_same_shape(frame1, frame2):
    """Check if two frames have the same shape."""
    return get_frame_shape(frame1) == get_frame_shape(frame2)


def get_frame_pixel(frame, y, x, c=None):
    """Get pixel value from frame."""
    try:
        if c is not None:
            return frame[y][x][c]
        else:
            return frame[y][x]
    except (IndexError, TypeError):
        return 0


def set_frame_pixel(frame, y, x, value):
    """Set pixel value in frame."""
    try:
        frame[y][x] = value
    except (IndexError, TypeError):
        pass


def frame_mean(frame):
    """Calculate mean of frame values."""
    if isinstance(frame, list):
        total = 0
        count = 0
        for row in frame:
            if isinstance(row, list):
                for pixel in row:
                    if isinstance(pixel, list):
                        total += sum(pixel)
                        count += len(pixel)
                    else:
                        total += pixel
                        count += 1
            else:
                total += row
                count += 1
        return total / count if count > 0 else 0
    return np.mean(frame) if hasattr(frame, 'mean') else 0


def simple_histogram(data, bins=32, range_vals=(0, 256)):
    """Simple histogram calculation for lists."""
    if not data:
        return [0] * bins
    
    min_val, max_val = range_vals
    if min_val == max_val:
        hist = [0] * bins
        hist[0] = len(data)
        return hist
    
    bin_width = (max_val - min_val) / bins
    hist = [0] * bins
    
    for value in data:
        if min_val <= value < max_val:
            bin_idx = min(bins - 1, int((value - min_val) / bin_width))
            hist[bin_idx] += 1
    
    return hist


class CoherenceMetric(Enum):
    """Available coherence metrics."""
    CHARACTER_STABILITY = "character_stability"
    LIGHTING_CONSISTENCY = "lighting_consistency"
    COLOR_PALETTE = "color_palette"
    TEMPORAL_SMOOTHNESS = "temporal_smoothness"
    ARTIFACT_DETECTION = "artifact_detection"
    MOTION_PHYSICS = "motion_physics"


class ArtifactType(Enum):
    """Types of artifacts that can be detected."""
    FLICKERING = "flickering"
    MORPHING = "morphing"
    DISCONTINUITY = "discontinuity"
    NOISE = "noise"
    BLUR = "blur"
    DISTORTION = "distortion"


@dataclass
class CoherenceScore:
    """Score for a specific coherence metric."""
    metric: CoherenceMetric
    score: float  # 0.0 to 1.0
    confidence: float  # 0.0 to 1.0
    details: Dict[str, Any]
    frame_range: Tuple[int, int]


@dataclass
class ArtifactDetection:
    """Detected artifact information."""
    artifact_type: ArtifactType
    severity: float  # 0.0 to 1.0
    confidence: float  # 0.0 to 1.0
    frame_indices: List[int]
    location: Optional[Tuple[int, int, int, int]]  # x, y, width, height
    description: str


@dataclass
class CoherenceAnalysis:
    """Complete coherence analysis results."""
    overall_score: float
    metric_scores: List[CoherenceScore]
    detected_artifacts: List[ArtifactDetection]
    recommendations: List[str]
    processing_time: float
    frame_count: int


class MotionCoherenceEngine:
    """
    Maintains visual coherence across frame sequences through comprehensive analysis.
    
    Features:
    - Character stability tracking across frames
    - Lighting consistency validation
    - Color palette preservation checks
    - Artifact detection and correction
    - Motion physics validation
    - Temporal coherence scoring
    """
    
    def __init__(self, 
                 enable_advanced_analysis: bool = True,
                 artifact_threshold: float = 0.7,
                 coherence_threshold: float = 0.8):
        """Initialize motion coherence engine."""
        self.enable_advanced_analysis = enable_advanced_analysis and OPENCV_AVAILABLE
        self.artifact_threshold = artifact_threshold
        self.coherence_threshold = coherence_threshold
        
        # Initialize analysis components
        self.character_tracker = CharacterStabilityTracker()
        self.lighting_analyzer = LightingConsistencyAnalyzer()
        self.color_analyzer = ColorPaletteAnalyzer()
        self.artifact_detector = ArtifactDetector(artifact_threshold)
        self.physics_validator = MotionPhysicsValidator()
        
        logger.info(f"Motion Coherence Engine initialized")
        logger.info(f"  Advanced analysis: {'enabled' if self.enable_advanced_analysis else 'disabled'}")
        logger.info(f"  Artifact threshold: {artifact_threshold}")
        logger.info(f"  Coherence threshold: {coherence_threshold}")
    
    def analyze_sequence_coherence(self, frames: List[list]) -> CoherenceAnalysis:
        """
        Analyze coherence across a sequence of frames.
        
        Args:
            frames: List of frame arrays
            
        Returns:
            CoherenceAnalysis: Complete analysis results
        """
        start_time = time.time()
        
        try:
            if len(frames) < 2:
                raise ValueError("Need at least 2 frames for coherence analysis")
            
            metric_scores = []
            detected_artifacts = []
            recommendations = []
            
            # Character stability analysis
            char_score = self.character_tracker.analyze_stability(frames)
            metric_scores.append(char_score)
            
            # Lighting consistency analysis
            light_score = self.lighting_analyzer.analyze_consistency(frames)
            metric_scores.append(light_score)
            
            # Color palette analysis
            color_score = self.color_analyzer.analyze_palette_consistency(frames)
            metric_scores.append(color_score)
            
            # Temporal smoothness analysis
            temporal_score = self._analyze_temporal_smoothness(frames)
            metric_scores.append(temporal_score)
            
            # Artifact detection
            artifacts = self.artifact_detector.detect_artifacts(frames)
            detected_artifacts.extend(artifacts)
            
            # Motion physics validation
            if self.enable_advanced_analysis:
                physics_score = self.physics_validator.validate_motion_physics(frames)
                metric_scores.append(physics_score)
            
            # Calculate overall score
            overall_score = self._calculate_overall_score(metric_scores, detected_artifacts)
            
            # Generate recommendations
            recommendations = self._generate_recommendations(metric_scores, detected_artifacts)
            
            processing_time = time.time() - start_time
            
            logger.info(f"Coherence analysis completed: {overall_score:.2f} overall score")
            
            return CoherenceAnalysis(
                overall_score=overall_score,
                metric_scores=metric_scores,
                detected_artifacts=detected_artifacts,
                recommendations=recommendations,
                processing_time=processing_time,
                frame_count=len(frames)
            )
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Coherence analysis failed: {e}")
            
            return CoherenceAnalysis(
                overall_score=0.0,
                metric_scores=[],
                detected_artifacts=[],
                recommendations=[f"Analysis failed: {str(e)}"],
                processing_time=processing_time,
                frame_count=len(frames)
            )
    
    def validate_frame_transition(self, frame1: list, frame2: list) -> Dict[str, float]:
        """
        Validate the coherence of a transition between two frames.
        
        Args:
            frame1: First frame
            frame2: Second frame
            
        Returns:
            Dict with transition validation scores
        """
        scores = {}
        
        # Basic similarity metrics
        scores['pixel_similarity'] = self._calculate_pixel_similarity(frame1, frame2)
        scores['structural_similarity'] = self._calculate_structural_similarity(frame1, frame2)
        scores['color_consistency'] = self._calculate_color_consistency(frame1, frame2)
        scores['lighting_consistency'] = self._calculate_lighting_consistency(frame1, frame2)
        
        # Motion coherence
        if self.enable_advanced_analysis:
            scores['motion_coherence'] = self._calculate_motion_coherence(frame1, frame2)
        
        return scores
    
    def _analyze_temporal_smoothness(self, frames: List[list]) -> CoherenceScore:
        """Analyze temporal smoothness across frame sequence."""
        if len(frames) < 3:
            return CoherenceScore(
                metric=CoherenceMetric.TEMPORAL_SMOOTHNESS,
                score=1.0,
                confidence=0.5,
                details={"reason": "insufficient_frames"},
                frame_range=(0, len(frames) - 1)
            )
        
        smoothness_scores = []
        
        for i in range(len(frames) - 2):
            # Calculate smoothness between consecutive frame pairs
            diff1 = self._calculate_frame_difference(frames[i], frames[i + 1])
            diff2 = self._calculate_frame_difference(frames[i + 1], frames[i + 2])
            
            # Smoothness is inversely related to the change in differences
            smoothness = 1.0 - min(1.0, abs(diff2 - diff1) / max(diff1, diff2, 0.01))
            smoothness_scores.append(smoothness)
        
        avg_smoothness = np.mean(smoothness_scores)
        confidence = 1.0 - np.std(smoothness_scores)
        
        return CoherenceScore(
            metric=CoherenceMetric.TEMPORAL_SMOOTHNESS,
            score=avg_smoothness,
            confidence=confidence,
            details={
                "frame_scores": smoothness_scores,
                "std_deviation": np.std(smoothness_scores),
                "min_score": min(smoothness_scores),
                "max_score": max(smoothness_scores)
            },
            frame_range=(0, len(frames) - 1)
        )
    
    def _calculate_overall_score(self, metric_scores: List[CoherenceScore], artifacts: List[ArtifactDetection]) -> float:
        """Calculate overall coherence score."""
        if not metric_scores:
            return 0.0
        
        # Weighted average of metric scores
        weights = {
            CoherenceMetric.CHARACTER_STABILITY: 0.25,
            CoherenceMetric.LIGHTING_CONSISTENCY: 0.20,
            CoherenceMetric.COLOR_PALETTE: 0.15,
            CoherenceMetric.TEMPORAL_SMOOTHNESS: 0.20,
            CoherenceMetric.MOTION_PHYSICS: 0.20
        }
        
        weighted_sum = 0.0
        total_weight = 0.0
        
        for score in metric_scores:
            weight = weights.get(score.metric, 0.1)
            weighted_sum += score.score * weight * score.confidence
            total_weight += weight * score.confidence
        
        base_score = weighted_sum / total_weight if total_weight > 0 else 0.0
        
        # Apply artifact penalty
        artifact_penalty = 0.0
        for artifact in artifacts:
            penalty = artifact.severity * artifact.confidence * 0.1
            artifact_penalty += penalty
        
        final_score = max(0.0, base_score - artifact_penalty)
        return final_score
    
    def _generate_recommendations(self, metric_scores: List[CoherenceScore], artifacts: List[ArtifactDetection]) -> List[str]:
        """Generate recommendations based on analysis results."""
        recommendations = []
        
        # Analyze metric scores
        for score in metric_scores:
            if score.score < self.coherence_threshold:
                if score.metric == CoherenceMetric.CHARACTER_STABILITY:
                    recommendations.append("Consider using character reference sheets or ControlNet for better character consistency")
                elif score.metric == CoherenceMetric.LIGHTING_CONSISTENCY:
                    recommendations.append("Adjust lighting parameters or use consistent lighting prompts across frames")
                elif score.metric == CoherenceMetric.COLOR_PALETTE:
                    recommendations.append("Apply color grading or use consistent color palette prompts")
                elif score.metric == CoherenceMetric.TEMPORAL_SMOOTHNESS:
                    recommendations.append("Increase frame interpolation quality or adjust motion parameters")
        
        # Analyze artifacts
        artifact_counts = {}
        for artifact in artifacts:
            artifact_counts[artifact.artifact_type] = artifact_counts.get(artifact.artifact_type, 0) + 1
        
        for artifact_type, count in artifact_counts.items():
            if count > 2:  # Multiple instances
                if artifact_type == ArtifactType.FLICKERING:
                    recommendations.append("Reduce flickering by using consistent seeds or temporal conditioning")
                elif artifact_type == ArtifactType.MORPHING:
                    recommendations.append("Prevent morphing by using stronger character conditioning or reference images")
                elif artifact_type == ArtifactType.DISCONTINUITY:
                    recommendations.append("Improve frame transitions with better interpolation or transition effects")
        
        return recommendations
    
    def _calculate_pixel_similarity(self, frame1: list, frame2: list) -> float:
        """Calculate pixel-level similarity between frames."""
        if not frames_same_shape(frame1, frame2):
            return 0.0
        
        diff = []
        for y in range(min(len(frame1), len(frame2))):
            row_diff = []
            for x in range(min(len(frame1[y]), len(frame2[y]))):
                pixel1 = frame1[y][x]
                pixel2 = frame2[y][x]
                if isinstance(pixel1, list) and isinstance(pixel2, list):
                    pixel_diff = sum((float(pixel1[c]) - float(pixel2[c])) ** 2 for c in range(min(len(pixel1), len(pixel2))))
                else:
                    pixel_diff = (float(pixel1) - float(pixel2)) ** 2
                row_diff.append(pixel_diff)
            diff.append(row_diff)
        
        mse = frame_mean(diff)
        max_pixel_value = 255.0
        
        # Convert MSE to similarity score (0-1)
        similarity = 1.0 - (mse / (max_pixel_value ** 2))
        return max(0.0, similarity)
    
    def _calculate_structural_similarity(self, frame1: list, frame2: list) -> float:
        """Calculate structural similarity between frames."""
        if not OPENCV_AVAILABLE:
            return self._calculate_pixel_similarity(frame1, frame2)
        
        try:
            # Convert to grayscale for SSIM calculation
            frame1_shape = get_frame_shape(frame1)
            frame2_shape = get_frame_shape(frame2)
            gray1 = cv2.cvtColor(frame1, cv2.COLOR_RGB2GRAY) if len(frame1_shape) == 3 else frame1
            gray2 = cv2.cvtColor(frame2, cv2.COLOR_RGB2GRAY) if len(frame2_shape) == 3 else frame2
            
            # Calculate SSIM using OpenCV (if available) or basic correlation
            # Simple correlation-based similarity as fallback
            correlation = cv2.matchTemplate(gray1, gray2, cv2.TM_CCOEFF_NORMED)
            return float(np.max(correlation))
            
        except Exception as e:
            logger.warning(f"SSIM calculation failed: {e}")
            return self._calculate_pixel_similarity(frame1, frame2)
    
    def _calculate_color_consistency(self, frame1: list, frame2: list) -> float:
        """Calculate color consistency between frames."""
        # Calculate color histograms
        hist1 = self._calculate_color_histogram(frame1)
        hist2 = self._calculate_color_histogram(frame2)
        
        # Calculate histogram correlation manually
        if len(hist1) == len(hist2) and len(hist1) > 1:
            mean1 = sum(hist1) / len(hist1)
            mean2 = sum(hist2) / len(hist2)
            
            numerator = sum((hist1[i] - mean1) * (hist2[i] - mean2) for i in range(len(hist1)))
            sum_sq1 = sum((hist1[i] - mean1) ** 2 for i in range(len(hist1)))
            sum_sq2 = sum((hist2[i] - mean2) ** 2 for i in range(len(hist2)))
            
            denominator = math.sqrt(sum_sq1 * sum_sq2)
            correlation = numerator / denominator if denominator != 0 else 0.0
            return max(0.0, correlation)
        
        return 0.0
    
    def _calculate_lighting_consistency(self, frame1: list, frame2: list) -> float:
        """Calculate lighting consistency between frames."""
        # Calculate average brightness
        brightness1 = frame_mean(frame1)
        brightness2 = frame_mean(frame2)
        
        # Calculate brightness difference
        brightness_diff = abs(brightness1 - brightness2) / 255.0
        
        # Convert to consistency score
        consistency = 1.0 - brightness_diff
        return max(0.0, consistency)
    
    def _calculate_motion_coherence(self, frame1: list, frame2: list) -> float:
        """Calculate motion coherence between frames."""
        if not OPENCV_AVAILABLE:
            return 0.5  # Default score when advanced analysis unavailable
        
        try:
            # Convert to grayscale
            gray1 = cv2.cvtColor(frame1, cv2.COLOR_RGB2GRAY)
            gray2 = cv2.cvtColor(frame2, cv2.COLOR_RGB2GRAY)
            
            # Calculate optical flow
            flow = cv2.calcOpticalFlowPyrLK(gray1, gray2, None, None)
            
            # Analyze flow consistency (simplified)
            if flow is not None and len(flow) > 0:
                # Calculate flow magnitude consistency
                flow_magnitude = np.sqrt(flow[0]**2 + flow[1]**2) if len(flow) >= 2 else np.array([0])
                coherence = 1.0 - min(1.0, np.std(flow_magnitude) / (np.mean(flow_magnitude) + 1e-6))
                return max(0.0, coherence)
            
        except Exception as e:
            logger.warning(f"Motion coherence calculation failed: {e}")
        
        return 0.5
    
    def _calculate_frame_difference(self, frame1: list, frame2: list) -> float:
        """Calculate normalized difference between frames."""
        if not frames_same_shape(frame1, frame2):
            return 1.0
        
        diff = []
        for y in range(min(len(frame1), len(frame2))):
            row_diff = []
            for x in range(min(len(frame1[y]), len(frame2[y]))):
                pixel1 = frame1[y][x]
                pixel2 = frame2[y][x]
                if isinstance(pixel1, list) and isinstance(pixel2, list):
                    pixel_diff = sum(abs(float(pixel1[c]) - float(pixel2[c])) for c in range(min(len(pixel1), len(pixel2))))
                else:
                    pixel_diff = abs(float(pixel1) - float(pixel2))
                row_diff.append(pixel_diff)
            diff.append(row_diff)
        
        return frame_mean(diff) / 255.0
    
    def _calculate_color_histogram(self, frame: list, bins: int = 32) -> list:
        """Calculate color histogram for frame."""
        frame_shape = get_frame_shape(frame)
        if len(frame_shape) == 3:
            # RGB histogram
            r_values = []
            g_values = []
            b_values = []
            for row in frame:
                for pixel in row:
                    if isinstance(pixel, list) and len(pixel) >= 3:
                        r_values.append(pixel[0])
                        g_values.append(pixel[1])
                        b_values.append(pixel[2])
            
            hist_r = simple_histogram(r_values, bins, (0, 256))
            hist_g = simple_histogram(g_values, bins, (0, 256))
            hist_b = simple_histogram(b_values, bins, (0, 256))
            return hist_r + hist_g + hist_b
        else:
            # Grayscale histogram
            values = []
            for row in frame:
                if isinstance(row, list):
                    for pixel in row:
                        values.append(pixel)
                else:
                    values.append(row)
            return simple_histogram(values, bins, (0, 256))


class CharacterStabilityTracker:
    """Tracks character stability across frames."""
    
    def analyze_stability(self, frames: List[list]) -> CoherenceScore:
        """Analyze character stability across frame sequence."""
        if len(frames) < 2:
            return CoherenceScore(
                metric=CoherenceMetric.CHARACTER_STABILITY,
                score=1.0,
                confidence=0.5,
                details={"reason": "insufficient_frames"},
                frame_range=(0, len(frames) - 1)
            )
        
        stability_scores = []
        
        # Compare consecutive frames for character consistency
        for i in range(len(frames) - 1):
            stability = self._calculate_character_stability(frames[i], frames[i + 1])
            stability_scores.append(stability)
        
        avg_stability = np.mean(stability_scores)
        confidence = 1.0 - np.std(stability_scores)
        
        return CoherenceScore(
            metric=CoherenceMetric.CHARACTER_STABILITY,
            score=avg_stability,
            confidence=confidence,
            details={
                "frame_scores": stability_scores,
                "std_deviation": np.std(stability_scores),
                "analysis_method": "pixel_correlation"
            },
            frame_range=(0, len(frames) - 1)
        )
    
    def _calculate_character_stability(self, frame1: list, frame2: list) -> float:
        """Calculate character stability between two frames."""
        # Simplified character stability based on structural similarity
        # In a full implementation, this would use face detection, pose estimation, etc.
        
        # Calculate structural similarity as proxy for character stability
        if not frames_same_shape(frame1, frame2):
            return 0.0
        
        # Focus on center region where characters are typically located
        frame_shape = get_frame_shape(frame1)
        h, w = frame_shape[0], frame_shape[1] if len(frame_shape) > 1 else frame_shape[0]
        center_y1, center_y2 = h // 4, 3 * h // 4
        center_x1, center_x2 = w // 4, 3 * w // 4
        
        center1 = []
        center2 = []
        for y in range(center_y1, min(center_y2, h)):
            row1 = []
            row2 = []
            for x in range(center_x1, min(center_x2, w)):
                row1.append(get_frame_pixel(frame1, y, x))
                row2.append(get_frame_pixel(frame2, y, x))
            center1.append(row1)
            center2.append(row2)
        
        # Calculate correlation in center region
        diff = 0
        count = 0
        for y in range(len(center1)):
            for x in range(len(center1[y])):
                pixel1 = center1[y][x]
                pixel2 = center2[y][x]
                if isinstance(pixel1, list) and isinstance(pixel2, list):
                    for c in range(min(len(pixel1), len(pixel2))):
                        diff += abs(float(pixel1[c]) - float(pixel2[c]))
                        count += 1
                else:
                    diff += abs(float(pixel1) - float(pixel2))
                    count += 1
        
        mse = (diff / count) ** 2 if count > 0 else 0
        stability = 1.0 - (mse / (255.0 ** 2))
        
        return max(0.0, stability)


class LightingConsistencyAnalyzer:
    """Analyzes lighting consistency across frames."""
    
    def analyze_consistency(self, frames: List[list]) -> CoherenceScore:
        """Analyze lighting consistency across frame sequence."""
        if len(frames) < 2:
            return CoherenceScore(
                metric=CoherenceMetric.LIGHTING_CONSISTENCY,
                score=1.0,
                confidence=0.5,
                details={"reason": "insufficient_frames"},
                frame_range=(0, len(frames) - 1)
            )
        
        lighting_scores = []
        brightness_values = []
        
        # Analyze lighting consistency between consecutive frames
        for i, frame in enumerate(frames):
            brightness = frame_mean(frame)
            brightness_values.append(brightness)
            
            if i > 0:
                prev_brightness = brightness_values[i - 1]
                consistency = 1.0 - min(1.0, abs(brightness - prev_brightness) / 255.0)
                lighting_scores.append(consistency)
        
        avg_consistency = sum(lighting_scores) / len(lighting_scores) if lighting_scores else 1.0
        
        # Calculate standard deviation manually
        if len(brightness_values) > 1:
            mean_brightness = sum(brightness_values) / len(brightness_values)
            variance = sum((x - mean_brightness) ** 2 for x in brightness_values) / len(brightness_values)
            std_brightness = math.sqrt(variance)
        else:
            std_brightness = 0.0
        
        confidence = 1.0 - (std_brightness / 255.0)
        
        return CoherenceScore(
            metric=CoherenceMetric.LIGHTING_CONSISTENCY,
            score=avg_consistency,
            confidence=confidence,
            details={
                "brightness_values": brightness_values,
                "brightness_std": std_brightness,
                "consistency_scores": lighting_scores
            },
            frame_range=(0, len(frames) - 1)
        )


class ColorPaletteAnalyzer:
    """Analyzes color palette consistency across frames."""
    
    def analyze_palette_consistency(self, frames: List[list]) -> CoherenceScore:
        """Analyze color palette consistency across frame sequence."""
        if len(frames) < 2:
            return CoherenceScore(
                metric=CoherenceMetric.COLOR_PALETTE,
                score=1.0,
                confidence=0.5,
                details={"reason": "insufficient_frames"},
                frame_range=(0, len(frames) - 1)
            )
        
        # Calculate color histograms for all frames
        histograms = []
        for frame in frames:
            hist = self._calculate_color_histogram(frame)
            histograms.append(hist)
        
        # Compare consecutive histograms
        consistency_scores = []
        for i in range(len(histograms) - 1):
            hist1 = histograms[i]
            hist2 = histograms[i + 1]
            
            # Simple correlation calculation
            if len(hist1) == len(hist2) and len(hist1) > 1:
                mean1 = sum(hist1) / len(hist1)
                mean2 = sum(hist2) / len(hist2)
                
                numerator = sum((hist1[j] - mean1) * (hist2[j] - mean2) for j in range(len(hist1)))
                sum_sq1 = sum((hist1[j] - mean1) ** 2 for j in range(len(hist1)))
                sum_sq2 = sum((hist2[j] - mean2) ** 2 for j in range(len(hist2)))
                
                denominator = math.sqrt(sum_sq1 * sum_sq2)
                correlation = numerator / denominator if denominator != 0 else 0.0
                consistency = max(0.0, correlation)
            else:
                consistency = 0.0
            
            consistency_scores.append(consistency)
        
        avg_consistency = sum(consistency_scores) / len(consistency_scores) if consistency_scores else 1.0
        
        # Calculate standard deviation manually
        if len(consistency_scores) > 1:
            mean_val = avg_consistency
            variance = sum((x - mean_val) ** 2 for x in consistency_scores) / len(consistency_scores)
            std_dev = math.sqrt(variance)
        else:
            std_dev = 0.0
        
        confidence = 1.0 - std_dev
        
        return CoherenceScore(
            metric=CoherenceMetric.COLOR_PALETTE,
            score=avg_consistency,
            confidence=confidence,
            details={
                "histogram_correlations": consistency_scores,
                "std_deviation": std_dev,
                "analysis_method": "histogram_correlation"
            },
            frame_range=(0, len(frames) - 1)
        )
    
    def _calculate_color_histogram(self, frame: list, bins: int = 32) -> list:
        """Calculate normalized color histogram."""
        frame_shape = get_frame_shape(frame)
        if len(frame_shape) == 3:
            r_values = []
            g_values = []
            b_values = []
            for row in frame:
                for pixel in row:
                    if isinstance(pixel, list) and len(pixel) >= 3:
                        r_values.append(pixel[0])
                        g_values.append(pixel[1])
                        b_values.append(pixel[2])
            
            hist_r = simple_histogram(r_values, bins, (0, 256))
            hist_g = simple_histogram(g_values, bins, (0, 256))
            hist_b = simple_histogram(b_values, bins, (0, 256))
            hist = hist_r + hist_g + hist_b
        else:
            values = []
            for row in frame:
                if isinstance(row, list):
                    for pixel in row:
                        values.append(pixel)
                else:
                    values.append(row)
            hist = simple_histogram(values, bins, (0, 256))
        
        # Normalize histogram
        total = sum(hist)
        return [h / (total + 1e-6) for h in hist]


class ArtifactDetector:
    """Detects visual artifacts in frame sequences."""
    
    def __init__(self, threshold: float = 0.7):
        self.threshold = threshold
    
    def detect_artifacts(self, frames: List[list]) -> List[ArtifactDetection]:
        """Detect artifacts in frame sequence."""
        artifacts = []
        
        if len(frames) < 3:
            return artifacts
        
        # Detect flickering
        flickering = self._detect_flickering(frames)
        artifacts.extend(flickering)
        
        # Detect morphing
        morphing = self._detect_morphing(frames)
        artifacts.extend(morphing)
        
        # Detect discontinuities
        discontinuities = self._detect_discontinuities(frames)
        artifacts.extend(discontinuities)
        
        return artifacts
    
    def _detect_flickering(self, frames: List[list]) -> List[ArtifactDetection]:
        """Detect flickering artifacts."""
        artifacts = []
        
        # Calculate brightness variations
        brightness_values = [frame_mean(frame) for frame in frames]
        
        # Look for rapid brightness changes
        for i in range(2, len(brightness_values)):
            prev_diff = abs(brightness_values[i-1] - brightness_values[i-2])
            curr_diff = abs(brightness_values[i] - brightness_values[i-1])
            
            # Flickering: alternating high differences
            if prev_diff > 20 and curr_diff > 20:
                severity = min(1.0, (prev_diff + curr_diff) / 100.0)
                
                if severity > self.threshold:
                    artifacts.append(ArtifactDetection(
                        artifact_type=ArtifactType.FLICKERING,
                        severity=severity,
                        confidence=0.8,
                        frame_indices=[i-2, i-1, i],
                        location=None,
                        description=f"Brightness flickering detected (severity: {severity:.2f})"
                    ))
        
        return artifacts
    
    def _detect_morphing(self, frames: List[list]) -> List[ArtifactDetection]:
        """Detect morphing artifacts."""
        artifacts = []
        
        # Look for sudden structural changes
        for i in range(1, len(frames)):
            structural_diff = self._calculate_structural_difference(frames[i-1], frames[i])
            
            if structural_diff > self.threshold:
                artifacts.append(ArtifactDetection(
                    artifact_type=ArtifactType.MORPHING,
                    severity=structural_diff,
                    confidence=0.7,
                    frame_indices=[i-1, i],
                    location=None,
                    description=f"Structural morphing detected (severity: {structural_diff:.2f})"
                ))
        
        return artifacts
    
    def _detect_discontinuities(self, frames: List[list]) -> List[ArtifactDetection]:
        """Detect discontinuity artifacts."""
        artifacts = []
        
        # Calculate frame differences
        differences = []
        for i in range(1, len(frames)):
            diff = 0
            count = 0
            frame1 = frames[i-1]
            frame2 = frames[i]
            
            for y in range(min(len(frame1), len(frame2))):
                for x in range(min(len(frame1[y]), len(frame2[y]))):
                    pixel1 = frame1[y][x]
                    pixel2 = frame2[y][x]
                    if isinstance(pixel1, list) and isinstance(pixel2, list):
                        for c in range(min(len(pixel1), len(pixel2))):
                            diff += abs(float(pixel1[c]) - float(pixel2[c]))
                            count += 1
                    else:
                        diff += abs(float(pixel1) - float(pixel2))
                        count += 1
            
            avg_diff = diff / count if count > 0 else 0
            differences.append(avg_diff)
        
        # Look for sudden jumps in differences
        if len(differences) > 2:
            mean_diff = sum(differences) / len(differences)
            variance = sum((d - mean_diff) ** 2 for d in differences) / len(differences)
            std_diff = math.sqrt(variance)
            
            for i, diff in enumerate(differences):
                if diff > mean_diff + 2 * std_diff:
                    severity = min(1.0, (diff - mean_diff) / (3 * std_diff))
                    
                    if severity > self.threshold:
                        artifacts.append(ArtifactDetection(
                            artifact_type=ArtifactType.DISCONTINUITY,
                            severity=severity,
                            confidence=0.8,
                            frame_indices=[i, i+1],
                            location=None,
                            description=f"Frame discontinuity detected (severity: {severity:.2f})"
                        ))
        
        return artifacts
    
    def _calculate_structural_difference(self, frame1: list, frame2: list) -> float:
        """Calculate structural difference between frames."""
        if not frames_same_shape(frame1, frame2):
            return 1.0
        
        # Calculate gradient-based structural difference
        if OPENCV_AVAILABLE:
            try:
                frame1_shape = get_frame_shape(frame1)
                frame2_shape = get_frame_shape(frame2)
                gray1 = cv2.cvtColor(frame1, cv2.COLOR_RGB2GRAY) if len(frame1_shape) == 3 else frame1
                gray2 = cv2.cvtColor(frame2, cv2.COLOR_RGB2GRAY) if len(frame2_shape) == 3 else frame2
                
                # Calculate gradients
                grad1_x = cv2.Sobel(gray1, cv2.CV_64F, 1, 0, ksize=3)
                grad1_y = cv2.Sobel(gray1, cv2.CV_64F, 0, 1, ksize=3)
                grad2_x = cv2.Sobel(gray2, cv2.CV_64F, 1, 0, ksize=3)
                grad2_y = cv2.Sobel(gray2, cv2.CV_64F, 0, 1, ksize=3)
                
                # Calculate gradient difference
                grad_diff = np.sqrt((grad1_x - grad2_x)**2 + (grad1_y - grad2_y)**2)
                return np.mean(grad_diff) / 255.0
                
            except Exception as e:
                logger.warning(f"Structural difference calculation failed: {e}")
        
        # Fallback to simple pixel difference
        diff = 0
        count = 0
        for y in range(min(len(frame1), len(frame2))):
            for x in range(min(len(frame1[y]), len(frame2[y]))):
                pixel1 = frame1[y][x]
                pixel2 = frame2[y][x]
                if isinstance(pixel1, list) and isinstance(pixel2, list):
                    for c in range(min(len(pixel1), len(pixel2))):
                        diff += abs(float(pixel1[c]) - float(pixel2[c]))
                        count += 1
                else:
                    diff += abs(float(pixel1) - float(pixel2))
                    count += 1
        
        return (diff / count) / 255.0 if count > 0 else 0.0


class MotionPhysicsValidator:
    """Validates motion physics in frame sequences."""
    
    def validate_motion_physics(self, frames: List[list]) -> CoherenceScore:
        """Validate motion physics across frame sequence."""
        if len(frames) < 3:
            return CoherenceScore(
                metric=CoherenceMetric.MOTION_PHYSICS,
                score=1.0,
                confidence=0.5,
                details={"reason": "insufficient_frames"},
                frame_range=(0, len(frames) - 1)
            )
        
        # Simplified physics validation based on motion consistency
        physics_scores = []
        
        for i in range(2, len(frames)):
            # Calculate motion vectors between consecutive frame pairs
            motion1 = self._estimate_motion(frames[i-2], frames[i-1])
            motion2 = self._estimate_motion(frames[i-1], frames[i])
            
            # Validate motion consistency (simplified physics)
            consistency = self._validate_motion_consistency(motion1, motion2)
            physics_scores.append(consistency)
        
        avg_physics = sum(physics_scores) / len(physics_scores) if physics_scores else 1.0
        
        if len(physics_scores) > 1:
            mean_val = avg_physics
            variance = sum((x - mean_val) ** 2 for x in physics_scores) / len(physics_scores)
            std_dev = math.sqrt(variance)
            confidence = 1.0 - std_dev
        else:
            confidence = 0.5
        
        return CoherenceScore(
            metric=CoherenceMetric.MOTION_PHYSICS,
            score=avg_physics,
            confidence=confidence,
            details={
                "physics_scores": physics_scores,
                "analysis_method": "motion_consistency",
                "validation_type": "simplified"
            },
            frame_range=(0, len(frames) - 1)
        )
    
    def _estimate_motion(self, frame1: list, frame2: list) -> Dict[str, float]:
        """Estimate motion between two frames."""
        # Simplified motion estimation
        diff = []
        for y in range(min(len(frame1), len(frame2))):
            row_diff = []
            for x in range(min(len(frame1[y]), len(frame2[y]))):
                pixel1 = frame1[y][x]
                pixel2 = frame2[y][x]
                if isinstance(pixel1, list) and isinstance(pixel2, list):
                    pixel_diff = [abs(float(pixel1[c]) - float(pixel2[c])) for c in range(min(len(pixel1), len(pixel2)))]
                else:
                    pixel_diff = abs(float(pixel1) - float(pixel2))
                row_diff.append(pixel_diff)
            diff.append(row_diff)
        
        motion_magnitude = frame_mean(diff)
        
        # Calculate center of motion
        diff_shape = get_frame_shape(diff)
        if len(diff_shape) == 3:
            motion_map = []
            for y in range(len(diff)):
                row = []
                for x in range(len(diff[y])):
                    pixel_mean = sum(diff[y][x]) / len(diff[y][x]) if isinstance(diff[y][x], list) else diff[y][x]
                    row.append(pixel_mean)
                motion_map.append(row)
        else:
            motion_map = diff
        
        # Find max value location
        max_val = float('-inf')
        center_y, center_x = 0, 0
        for y in range(len(motion_map)):
            for x in range(len(motion_map[y])):
                if motion_map[y][x] > max_val:
                    max_val = motion_map[y][x]
                    center_y, center_x = y, x
        
        return {
            "magnitude": motion_magnitude,
            "center_x": center_x,
            "center_y": center_y
        }
    
    def _validate_motion_consistency(self, motion1: Dict[str, float], motion2: Dict[str, float]) -> float:
        """Validate consistency between motion estimates."""
        # Check magnitude consistency
        mag_diff = abs(motion1["magnitude"] - motion2["magnitude"])
        mag_consistency = 1.0 - min(1.0, mag_diff / 100.0)
        
        # Check center consistency
        center_diff = math.sqrt(
            (motion1["center_x"] - motion2["center_x"])**2 + 
            (motion1["center_y"] - motion2["center_y"])**2
        )
        center_consistency = 1.0 - min(1.0, center_diff / 100.0)
        
        # Combined consistency score
        return (mag_consistency + center_consistency) / 2.0


def main():
    """Test motion coherence engine functionality."""
    # Initialize motion coherence engine
    coherence_engine = MotionCoherenceEngine()
    
    # Create test frame sequence
    test_frames = []
    for i in range(5):
        # Create test frame with gradual changes
        frame = np.random().randint(100 + i * 10, 150 + i * 10, (480, 640, 3), dtype=None)
        
        # Add some structure
        for y in range(200, 280):
            for x in range(250, 350):
                if y < len(frame) and x < len(frame[0]):
                    frame[y][x] = [200, 100, 50]  # Consistent object
        
        for y in range(100, 150):
            for x in range(100, 200):
                if y < len(frame) and x < len(frame[0]):
                    frame[y][x] = [50, 200, 100]  # Another object
        
        test_frames.append(frame)
    
    # Analyze sequence coherence
    analysis = coherence_engine.analyze_sequence_coherence(test_frames)
    
    print(f"✓ Motion coherence analysis completed")
    print(f"  Overall score: {analysis.overall_score:.2f}")
    print(f"  Processing time: {analysis.processing_time:.2f}s")
    print(f"  Metric scores: {len(analysis.metric_scores)}")
    print(f"  Detected artifacts: {len(analysis.detected_artifacts)}")
    print(f"  Recommendations: {len(analysis.recommendations)}")
    
    # Display metric scores
    for score in analysis.metric_scores:
        print(f"    {score.metric.value}: {score.score:.2f} (confidence: {score.confidence:.2f})")
    
    # Display artifacts
    for artifact in analysis.detected_artifacts:
        print(f"    Artifact: {artifact.artifact_type.value} (severity: {artifact.severity:.2f})")
    
    # Display recommendations
    for i, rec in enumerate(analysis.recommendations):
        print(f"    Recommendation {i+1}: {rec}")
    
    # Test frame transition validation
    transition_scores = coherence_engine.validate_frame_transition(test_frames[0], test_frames[1])
    print(f"  Transition validation scores:")
    for metric, score in transition_scores.items():
        print(f"    {metric}: {score:.2f}")


if __name__ == "__main__":
    main()