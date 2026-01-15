"""
Content-Aware Interpolator for AI Enhancement Integration

This module implements intelligent frame interpolation using scene understanding,
motion analysis, and object consistency preservation.

Requirements Validated:
- Requirement 3.1: Scene content and motion pattern analysis
- Requirement 3.2: Complex motion handling (occlusion, non-linear movement)
- Requirement 3.3: Object consistency and ghosting artifact prevention
- Requirement 3.4: Quality metrics and parameter adjustment suggestions
- Requirement 3.5: Adaptive interpolation strategy based on scene complexity
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Dict, Any, Tuple, Optional
from pathlib import Path
import time
import json
from PIL import Image
import numpy as np


class InterpolationMethod(Enum):
    """Interpolation methods available."""
    OPTICAL_FLOW = "optical_flow"
    MOTION_COMPENSATED = "motion_compensated"
    SCENE_AWARE = "scene_aware"
    ADAPTIVE = "adaptive"


class MotionComplexity(Enum):
    """Motion complexity levels."""
    SIMPLE = "simple"           # Linear motion, no occlusion
    MODERATE = "moderate"       # Some non-linear motion
    COMPLEX = "complex"         # Occlusion, fast motion
    VERY_COMPLEX = "very_complex"  # Scene changes, multiple objects


class InterpolationQuality(Enum):
    """Quality levels for interpolation."""
    FAST = "fast"               # Quick preview quality
    BALANCED = "balanced"       # Balance speed and quality
    HIGH_QUALITY = "high_quality"  # Maximum quality


@dataclass
class MotionVector:
    """Motion vector for a region."""
    x: float
    y: float
    magnitude: float
    confidence: float


@dataclass
class MotionAnalysis:
    """Analysis of motion between two frames."""
    motion_vectors: List[MotionVector]
    complexity: MotionComplexity
    has_occlusion: bool
    has_scene_change: bool
    dominant_motion: Tuple[float, float]
    motion_uniformity: float  # 0-1, higher = more uniform
    recommended_method: InterpolationMethod
    confidence_score: float


@dataclass
class InterpolationConfig:
    """Configuration for interpolation operation."""
    method: InterpolationMethod = InterpolationMethod.ADAPTIVE
    quality: InterpolationQuality = InterpolationQuality.BALANCED
    preserve_edges: bool = True
    detect_occlusion: bool = True
    adaptive_strategy: bool = True
    ghosting_prevention: bool = True
    max_motion_magnitude: float = 50.0  # pixels


@dataclass
class QualityMetrics:
    """Quality metrics for interpolated frames."""
    structural_similarity: float  # SSIM-like metric
    temporal_consistency: float
    edge_preservation: float
    ghosting_score: float  # Lower is better
    overall_quality: float
    confidence: float


@dataclass
class InterpolatedFrame:
    """Result of frame interpolation."""
    frame_data: bytes
    position: float  # 0-1 between source frames
    quality_metrics: QualityMetrics
    processing_time: float
    method_used: InterpolationMethod
    warnings: List[str] = field(default_factory=list)


@dataclass
class InterpolationResult:
    """Complete interpolation result."""
    interpolated_frames: List[InterpolatedFrame]
    motion_analysis: MotionAnalysis
    total_processing_time: float
    average_quality: float
    suggestions: List[str] = field(default_factory=list)


class ContentAwareInterpolator:
    """
    Content-aware frame interpolator using scene understanding.
    
    This class implements intelligent frame interpolation that:
    - Analyzes scene content and motion patterns (Req 3.1)
    - Handles complex motions like occlusion (Req 3.2)
    - Maintains object consistency (Req 3.3)
    - Provides quality metrics (Req 3.4)
    - Adapts strategy based on scene complexity (Req 3.5)
    """
    
    def __init__(self, config: Optional[InterpolationConfig] = None):
        """
        Initialize the Content-Aware Interpolator.
        
        Args:
            config: Interpolation configuration
        """
        self.config = config or InterpolationConfig()
        self.statistics = {
            'total_interpolations': 0,
            'by_method': {method.value: 0 for method in InterpolationMethod},
            'by_complexity': {complexity.value: 0 for complexity in MotionComplexity},
            'average_quality': 0.0,
            'average_processing_time': 0.0,
            'occlusion_detected': 0,
            'scene_changes_detected': 0
        }
    
    def analyze_motion(self, frame1: Image.Image, frame2: Image.Image) -> MotionAnalysis:
        """
        Analyze motion patterns between two frames.
        
        Implements Requirement 3.1: Scene content and motion pattern analysis
        
        Args:
            frame1: First frame
            frame2: Second frame
            
        Returns:
            MotionAnalysis with detected patterns and recommendations
        """
        # Convert to numpy arrays for analysis
        arr1 = np.array(frame1.convert('RGB'))
        arr2 = np.array(frame2.convert('RGB'))
        
        # Calculate frame difference
        diff = np.abs(arr2.astype(float) - arr1.astype(float))
        mean_diff = np.mean(diff)
        
        # Detect scene change (large difference)
        has_scene_change = mean_diff > 100.0
        
        # Analyze motion vectors (simplified optical flow simulation)
        motion_vectors = self._compute_motion_vectors(arr1, arr2)
        
        # Calculate dominant motion
        if motion_vectors:
            avg_x = np.mean([mv.x for mv in motion_vectors])
            avg_y = np.mean([mv.y for mv in motion_vectors])
            dominant_motion = (avg_x, avg_y)
            
            # Calculate motion uniformity
            motion_std = np.std([mv.magnitude for mv in motion_vectors])
            motion_uniformity = 1.0 / (1.0 + motion_std / 10.0)
        else:
            dominant_motion = (0.0, 0.0)
            motion_uniformity = 1.0
        
        # Detect occlusion (regions with inconsistent motion)
        has_occlusion = self._detect_occlusion(motion_vectors, motion_uniformity)
        
        # Determine motion complexity
        complexity = self._determine_complexity(
            mean_diff, motion_vectors, has_occlusion, has_scene_change
        )
        
        # Recommend interpolation method
        recommended_method = self._recommend_method(complexity, has_scene_change)
        
        # Calculate confidence
        confidence_score = self._calculate_confidence(
            motion_uniformity, has_occlusion, has_scene_change
        )
        
        # Update statistics
        self.statistics['by_complexity'][complexity.value] += 1
        if has_occlusion:
            self.statistics['occlusion_detected'] += 1
        if has_scene_change:
            self.statistics['scene_changes_detected'] += 1
        
        return MotionAnalysis(
            motion_vectors=motion_vectors,
            complexity=complexity,
            has_occlusion=has_occlusion,
            has_scene_change=has_scene_change,
            dominant_motion=dominant_motion,
            motion_uniformity=motion_uniformity,
            recommended_method=recommended_method,
            confidence_score=confidence_score
        )
    
    def interpolate_frames(
        self,
        frame1: Image.Image,
        frame2: Image.Image,
        num_intermediate: int
    ) -> InterpolationResult:
        """
        Generate intermediate frames using content-aware interpolation.
        
        Implements:
        - Requirement 3.1: Scene content and motion pattern analysis
        - Requirement 3.2: Complex motion handling
        - Requirement 3.3: Object consistency and ghosting prevention
        - Requirement 3.4: Quality metrics
        - Requirement 3.5: Adaptive strategy
        
        Args:
            frame1: First keyframe
            frame2: Second keyframe
            num_intermediate: Number of intermediate frames to generate
            
        Returns:
            InterpolationResult with generated frames and analysis
        """
        start_time = time.time()
        
        # Analyze motion between frames
        motion_analysis = self.analyze_motion(frame1, frame2)
        
        # Select interpolation method
        if self.config.adaptive_strategy:
            method = motion_analysis.recommended_method
        else:
            method = self.config.method
        
        # Update statistics
        self.statistics['by_method'][method.value] += 1
        
        # Generate intermediate frames
        interpolated_frames = []
        suggestions = []
        
        for i in range(num_intermediate):
            position = (i + 1) / (num_intermediate + 1)
            
            frame_start = time.time()
            
            # Generate interpolated frame
            interpolated_frame = self._interpolate_single_frame(
                frame1, frame2, position, method, motion_analysis
            )
            
            frame_time = time.time() - frame_start
            
            # Calculate quality metrics
            quality_metrics = self._calculate_quality_metrics(
                frame1, frame2, interpolated_frame, position, motion_analysis
            )
            
            # Check for warnings
            warnings = self._check_warnings(quality_metrics, motion_analysis)
            
            interpolated_frames.append(InterpolatedFrame(
                frame_data=self._frame_to_bytes(interpolated_frame),
                position=position,
                quality_metrics=quality_metrics,
                processing_time=frame_time,
                method_used=method,
                warnings=warnings
            ))
        
        total_time = time.time() - start_time
        
        # Calculate average quality
        avg_quality = np.mean([
            frame.quality_metrics.overall_quality 
            for frame in interpolated_frames
        ])
        
        # Generate suggestions
        suggestions = self._generate_suggestions(
            motion_analysis, interpolated_frames, avg_quality
        )
        
        # Update statistics
        self.statistics['total_interpolations'] += 1
        self.statistics['average_quality'] = (
            (self.statistics['average_quality'] * (self.statistics['total_interpolations'] - 1) +
             avg_quality) / self.statistics['total_interpolations']
        )
        self.statistics['average_processing_time'] = (
            (self.statistics['average_processing_time'] * (self.statistics['total_interpolations'] - 1) +
             total_time) / self.statistics['total_interpolations']
        )
        
        return InterpolationResult(
            interpolated_frames=interpolated_frames,
            motion_analysis=motion_analysis,
            total_processing_time=total_time,
            average_quality=avg_quality,
            suggestions=suggestions
        )
    
    def interpolate_sequence(
        self,
        frames: List[Image.Image],
        frames_between: int
    ) -> List[Image.Image]:
        """
        Interpolate a sequence of frames with temporal consistency.
        
        Implements Requirement 3.3: Temporal consistency across sequences
        
        Args:
            frames: List of keyframes
            frames_between: Number of frames to generate between each pair
            
        Returns:
            Complete sequence with interpolated frames
        """
        if len(frames) < 2:
            return frames
        
        result_sequence = [frames[0]]
        
        for i in range(len(frames) - 1):
            # Interpolate between consecutive frames
            interpolation_result = self.interpolate_frames(
                frames[i], frames[i + 1], frames_between
            )
            
            # Add interpolated frames
            for interp_frame in interpolation_result.interpolated_frames:
                frame_image = self._bytes_to_frame(interp_frame.frame_data)
                result_sequence.append(frame_image)
            
            # Add next keyframe
            result_sequence.append(frames[i + 1])
        
        return result_sequence
    
    def validate_interpolation_quality(
        self,
        original_frames: List[Image.Image],
        interpolated_frames: List[Image.Image]
    ) -> QualityMetrics:
        """
        Validate quality of interpolated frames.
        
        Implements Requirement 3.4: Quality validation
        
        Args:
            original_frames: Original keyframes
            interpolated_frames: Complete sequence with interpolated frames
            
        Returns:
            Overall quality metrics
        """
        if len(interpolated_frames) < 2:
            return QualityMetrics(
                structural_similarity=1.0,
                temporal_consistency=1.0,
                edge_preservation=1.0,
                ghosting_score=0.0,
                overall_quality=1.0,
                confidence=1.0
            )
        
        # Calculate temporal consistency
        temporal_scores = []
        for i in range(len(interpolated_frames) - 1):
            arr1 = np.array(interpolated_frames[i].convert('RGB'))
            arr2 = np.array(interpolated_frames[i + 1].convert('RGB'))
            diff = np.mean(np.abs(arr2.astype(float) - arr1.astype(float)))
            # Lower difference = higher consistency
            score = 1.0 / (1.0 + diff / 50.0)
            temporal_scores.append(score)
        
        temporal_consistency = np.mean(temporal_scores)
        
        # Calculate edge preservation (simplified)
        edge_scores = []
        for frame in interpolated_frames:
            arr = np.array(frame.convert('L'))
            # Simple edge detection using gradient
            grad_x = np.abs(np.diff(arr, axis=1))
            grad_y = np.abs(np.diff(arr, axis=0))
            edge_strength = (np.mean(grad_x) + np.mean(grad_y)) / 2
            # Normalize to 0-1
            edge_score = min(1.0, edge_strength / 20.0)
            edge_scores.append(edge_score)
        
        edge_preservation = np.mean(edge_scores)
        
        # Calculate ghosting score (lower is better)
        # Check for duplicate/blurred regions
        ghosting_scores = []
        for i in range(1, len(interpolated_frames) - 1):
            arr_prev = np.array(interpolated_frames[i - 1].convert('RGB'))
            arr_curr = np.array(interpolated_frames[i].convert('RGB'))
            arr_next = np.array(interpolated_frames[i + 1].convert('RGB'))
            
            # Check if current frame is too similar to neighbors (ghosting)
            diff_prev = np.mean(np.abs(arr_curr.astype(float) - arr_prev.astype(float)))
            diff_next = np.mean(np.abs(arr_curr.astype(float) - arr_next.astype(float)))
            
            # Low difference might indicate ghosting
            ghosting = 1.0 - min(1.0, (diff_prev + diff_next) / 100.0)
            ghosting_scores.append(ghosting)
        
        ghosting_score = np.mean(ghosting_scores) if ghosting_scores else 0.0
        
        # Calculate overall quality
        overall_quality = (
            temporal_consistency * 0.4 +
            edge_preservation * 0.3 +
            (1.0 - ghosting_score) * 0.3
        )
        
        return QualityMetrics(
            structural_similarity=0.85,  # Placeholder for SSIM
            temporal_consistency=temporal_consistency,
            edge_preservation=edge_preservation,
            ghosting_score=ghosting_score,
            overall_quality=overall_quality,
            confidence=0.9
        )
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get interpolation statistics."""
        return self.statistics.copy()
    
    def reset_statistics(self) -> None:
        """Reset statistics counters."""
        self.statistics = {
            'total_interpolations': 0,
            'by_method': {method.value: 0 for method in InterpolationMethod},
            'by_complexity': {complexity.value: 0 for complexity in MotionComplexity},
            'average_quality': 0.0,
            'average_processing_time': 0.0,
            'occlusion_detected': 0,
            'scene_changes_detected': 0
        }
    
    # Private helper methods
    
    def _compute_motion_vectors(
        self,
        arr1: np.ndarray,
        arr2: np.ndarray
    ) -> List[MotionVector]:
        """Compute motion vectors between frames (simplified)."""
        # Divide frame into blocks and compute motion
        block_size = 16
        height, width = arr1.shape[:2]
        
        motion_vectors = []
        
        for y in range(0, height - block_size, block_size):
            for x in range(0, width - block_size, block_size):
                block1 = arr1[y:y+block_size, x:x+block_size]
                
                # Search for best match in frame2 (simplified)
                best_match = (0, 0)
                min_diff = float('inf')
                
                search_range = 8
                for dy in range(-search_range, search_range + 1, 4):
                    for dx in range(-search_range, search_range + 1, 4):
                        ny, nx = y + dy, x + dx
                        if 0 <= ny < height - block_size and 0 <= nx < width - block_size:
                            block2 = arr2[ny:ny+block_size, nx:nx+block_size]
                            diff = np.sum(np.abs(block2.astype(float) - block1.astype(float)))
                            if diff < min_diff:
                                min_diff = diff
                                best_match = (dx, dy)
                
                magnitude = np.sqrt(best_match[0]**2 + best_match[1]**2)
                confidence = 1.0 / (1.0 + min_diff / 10000.0)
                
                motion_vectors.append(MotionVector(
                    x=best_match[0],
                    y=best_match[1],
                    magnitude=magnitude,
                    confidence=confidence
                ))
        
        return motion_vectors
    
    def _detect_occlusion(
        self,
        motion_vectors: List[MotionVector],
        motion_uniformity: float
    ) -> bool:
        """Detect occlusion in motion field."""
        if not motion_vectors:
            return False
        
        # Low uniformity suggests occlusion
        if motion_uniformity < 0.5:
            return True
        
        # Check for conflicting motion vectors
        magnitudes = [mv.magnitude for mv in motion_vectors]
        if len(magnitudes) > 1:
            std_magnitude = np.std(magnitudes)
            if std_magnitude > 10.0:
                return True
        
        return False
    
    def _determine_complexity(
        self,
        mean_diff: float,
        motion_vectors: List[MotionVector],
        has_occlusion: bool,
        has_scene_change: bool
    ) -> MotionComplexity:
        """Determine motion complexity level."""
        if has_scene_change:
            return MotionComplexity.VERY_COMPLEX
        
        if has_occlusion:
            return MotionComplexity.COMPLEX
        
        if motion_vectors:
            avg_magnitude = np.mean([mv.magnitude for mv in motion_vectors])
            if avg_magnitude > 20.0:
                return MotionComplexity.COMPLEX
            elif avg_magnitude > 10.0:
                return MotionComplexity.MODERATE
        
        return MotionComplexity.SIMPLE
    
    def _recommend_method(
        self,
        complexity: MotionComplexity,
        has_scene_change: bool
    ) -> InterpolationMethod:
        """Recommend interpolation method based on complexity."""
        if has_scene_change:
            return InterpolationMethod.SCENE_AWARE
        
        if complexity == MotionComplexity.VERY_COMPLEX:
            return InterpolationMethod.SCENE_AWARE
        elif complexity == MotionComplexity.COMPLEX:
            return InterpolationMethod.MOTION_COMPENSATED
        elif complexity == MotionComplexity.MODERATE:
            return InterpolationMethod.OPTICAL_FLOW
        else:
            return InterpolationMethod.OPTICAL_FLOW
    
    def _calculate_confidence(
        self,
        motion_uniformity: float,
        has_occlusion: bool,
        has_scene_change: bool
    ) -> float:
        """Calculate confidence score for analysis."""
        confidence = motion_uniformity
        
        if has_occlusion:
            confidence *= 0.7
        
        if has_scene_change:
            confidence *= 0.5
        
        return max(0.1, min(1.0, confidence))
    
    def _interpolate_single_frame(
        self,
        frame1: Image.Image,
        frame2: Image.Image,
        position: float,
        method: InterpolationMethod,
        motion_analysis: MotionAnalysis
    ) -> Image.Image:
        """
        Interpolate a single frame at given position.
        
        Implements Requirement 3.2: Complex motion handling
        Implements Requirement 3.3: Object consistency
        """
        arr1 = np.array(frame1.convert('RGB')).astype(float)
        arr2 = np.array(frame2.convert('RGB')).astype(float)
        
        if method == InterpolationMethod.SCENE_AWARE and motion_analysis.has_scene_change:
            # For scene changes, use hard cut at midpoint
            if position < 0.5:
                result = arr1
            else:
                result = arr2
        elif method == InterpolationMethod.MOTION_COMPENSATED and motion_analysis.has_occlusion:
            # Motion-compensated interpolation with occlusion handling
            result = self._motion_compensated_blend(
                arr1, arr2, position, motion_analysis
            )
        else:
            # Standard optical flow interpolation
            result = self._optical_flow_blend(arr1, arr2, position)
        
        # Apply ghosting prevention if enabled
        if self.config.ghosting_prevention:
            result = self._prevent_ghosting(result, arr1, arr2, position)
        
        # Apply edge preservation if enabled
        if self.config.preserve_edges:
            result = self._preserve_edges(result, arr1, arr2, position)
        
        # Clip and convert back to image
        result = np.clip(result, 0, 255).astype(np.uint8)
        return Image.fromarray(result)
    
    def _optical_flow_blend(
        self,
        arr1: np.ndarray,
        arr2: np.ndarray,
        position: float
    ) -> np.ndarray:
        """Simple linear blend (optical flow approximation)."""
        return arr1 * (1 - position) + arr2 * position
    
    def _motion_compensated_blend(
        self,
        arr1: np.ndarray,
        arr2: np.ndarray,
        position: float,
        motion_analysis: MotionAnalysis
    ) -> np.ndarray:
        """Motion-compensated blend with occlusion handling."""
        # Use motion vectors to warp frames
        # Simplified: use weighted blend with motion awareness
        
        # Calculate motion-based weights
        motion_magnitude = np.sqrt(
            motion_analysis.dominant_motion[0]**2 +
            motion_analysis.dominant_motion[1]**2
        )
        
        if motion_magnitude > 15.0:
            # High motion: favor closer frame
            if position < 0.5:
                weight1 = 0.7
                weight2 = 0.3
            else:
                weight1 = 0.3
                weight2 = 0.7
        else:
            # Low motion: standard blend
            weight1 = 1 - position
            weight2 = position
        
        return arr1 * weight1 + arr2 * weight2
    
    def _prevent_ghosting(
        self,
        result: np.ndarray,
        arr1: np.ndarray,
        arr2: np.ndarray,
        position: float
    ) -> np.ndarray:
        """Prevent ghosting artifacts."""
        # Detect regions with high variance (potential ghosting)
        variance = np.var(result, axis=2)
        high_variance = variance > np.percentile(variance, 90)
        
        # In high variance regions, favor closer keyframe
        if position < 0.5:
            result[high_variance] = arr1[high_variance]
        else:
            result[high_variance] = arr2[high_variance]
        
        return result
    
    def _preserve_edges(
        self,
        result: np.ndarray,
        arr1: np.ndarray,
        arr2: np.ndarray,
        position: float
    ) -> np.ndarray:
        """Preserve edge sharpness."""
        # Simple edge preservation using gradient
        gray = np.mean(result, axis=2)
        grad_x = np.abs(np.diff(gray, axis=1, prepend=gray[:, :1]))
        grad_y = np.abs(np.diff(gray, axis=0, prepend=gray[:1, :]))
        edges = (grad_x + grad_y) > 10.0
        
        # Sharpen edges slightly
        if np.any(edges):
            result[edges] = np.clip(result[edges] * 1.1, 0, 255)
        
        return result
    
    def _calculate_quality_metrics(
        self,
        frame1: Image.Image,
        frame2: Image.Image,
        interpolated: Image.Image,
        position: float,
        motion_analysis: MotionAnalysis
    ) -> QualityMetrics:
        """Calculate quality metrics for interpolated frame."""
        arr_interp = np.array(interpolated.convert('RGB'))
        arr1 = np.array(frame1.convert('RGB'))
        arr2 = np.array(frame2.convert('RGB'))
        
        # Structural similarity (simplified)
        expected = arr1 * (1 - position) + arr2 * position
        diff = np.mean(np.abs(arr_interp.astype(float) - expected))
        structural_similarity = 1.0 / (1.0 + diff / 50.0)
        
        # Temporal consistency (based on motion analysis)
        temporal_consistency = motion_analysis.motion_uniformity
        
        # Edge preservation
        edges_interp = np.mean(np.abs(np.diff(arr_interp, axis=1)))
        edges_expected = np.mean(np.abs(np.diff(expected.astype(np.uint8), axis=1)))
        edge_preservation = 1.0 - min(1.0, abs(edges_interp - edges_expected) / 20.0)
        
        # Ghosting score (lower is better)
        variance = np.var(arr_interp, axis=2)
        ghosting_score = min(1.0, np.mean(variance) / 1000.0)
        
        # Overall quality
        overall_quality = (
            structural_similarity * 0.4 +
            temporal_consistency * 0.3 +
            edge_preservation * 0.2 +
            (1.0 - ghosting_score) * 0.1
        )
        
        # Confidence based on motion analysis
        confidence = motion_analysis.confidence_score
        
        return QualityMetrics(
            structural_similarity=structural_similarity,
            temporal_consistency=temporal_consistency,
            edge_preservation=edge_preservation,
            ghosting_score=ghosting_score,
            overall_quality=overall_quality,
            confidence=confidence
        )
    
    def _check_warnings(
        self,
        quality_metrics: QualityMetrics,
        motion_analysis: MotionAnalysis
    ) -> List[str]:
        """Check for quality warnings."""
        warnings = []
        
        if quality_metrics.overall_quality < 0.6:
            warnings.append("Low overall quality detected")
        
        if quality_metrics.ghosting_score > 0.5:
            warnings.append("Potential ghosting artifacts detected")
        
        if motion_analysis.has_scene_change:
            warnings.append("Scene change detected - interpolation may be unreliable")
        
        if motion_analysis.has_occlusion:
            warnings.append("Occlusion detected - some artifacts may be present")
        
        if motion_analysis.confidence_score < 0.5:
            warnings.append("Low confidence in motion analysis")
        
        return warnings
    
    def _generate_suggestions(
        self,
        motion_analysis: MotionAnalysis,
        interpolated_frames: List[InterpolatedFrame],
        avg_quality: float
    ) -> List[str]:
        """
        Generate parameter adjustment suggestions.
        
        Implements Requirement 3.4: Parameter adjustment suggestions
        """
        suggestions = []
        
        if avg_quality < 0.7:
            suggestions.append(
                "Consider using higher quality setting for better results"
            )
        
        if motion_analysis.complexity == MotionComplexity.VERY_COMPLEX:
            suggestions.append(
                "Very complex motion detected - consider reducing number of intermediate frames"
            )
        
        if motion_analysis.has_scene_change:
            suggestions.append(
                "Scene change detected - consider splitting into separate interpolation segments"
            )
        
        if motion_analysis.has_occlusion:
            suggestions.append(
                "Occlusion detected - enable motion-compensated interpolation for better results"
            )
        
        # Check for consistent warnings
        warning_counts = {}
        for frame in interpolated_frames:
            for warning in frame.warnings:
                warning_counts[warning] = warning_counts.get(warning, 0) + 1
        
        for warning, count in warning_counts.items():
            if count > len(interpolated_frames) * 0.5:
                suggestions.append(f"Persistent issue: {warning}")
        
        return suggestions
    
    def _frame_to_bytes(self, frame: Image.Image) -> bytes:
        """Convert PIL Image to bytes."""
        import io
        buffer = io.BytesIO()
        frame.save(buffer, format='PNG')
        return buffer.getvalue()
    
    def _bytes_to_frame(self, data: bytes) -> Image.Image:
        """Convert bytes to PIL Image."""
        import io
        return Image.open(io.BytesIO(data))
