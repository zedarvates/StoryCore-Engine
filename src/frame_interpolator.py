#!/usr/bin/env python3
"""
Frame Interpolator for Video Engine
Handles interpolation between keyframes with quality preservation and character consistency.
"""

import logging
import numpy as np
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import time

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class InterpolationAlgorithm(Enum):
    """Available interpolation algorithms."""
    LINEAR = "linear"
    OPTICAL_FLOW = "optical_flow"
    DEPTH_AWARE = "depth_aware"


@dataclass
class InterpolationConfig:
    """Configuration for frame interpolation."""
    algorithm: str = "optical_flow"
    quality: str = "high"
    frame_count: int = 5
    preserve_aspect_ratio: bool = True
    enable_character_preservation: bool = True
    enable_depth_awareness: bool = True
    motion_blur_strength: float = 0.3
    temporal_smoothing: float = 0.5


@dataclass
class InterpolationResult:
    """Result of frame interpolation operation."""
    success: bool
    interpolated_frames: List[Dict[str, Any]]
    processing_time: float
    quality_metrics: Dict[str, float]
    error_message: Optional[str] = None


class FrameInterpolator:
    """
    Frame interpolator for generating smooth transitions between keyframes.
    
    Supports multiple interpolation algorithms with quality preservation,
    character consistency, and temporal coherence.
    """
    
    def __init__(self, config: InterpolationConfig):
        """Initialize frame interpolator with configuration."""
        self.config = config
        logger.info(f"Frame interpolator initialized with algorithm: {config.algorithm}")
    
    def interpolate_frames(self, keyframe_a: Dict[str, Any], keyframe_b: Dict[str, Any]) -> InterpolationResult:
        """
        Interpolate frames between two keyframes.
        
        Args:
            keyframe_a: First keyframe data
            keyframe_b: Second keyframe data
            
        Returns:
            InterpolationResult: Result containing interpolated frames
        """
        start_time = time.time()
        
        try:
            # Validate input keyframes
            self._validate_keyframes(keyframe_a, keyframe_b)
            
            # Generate interpolated frames based on algorithm
            if self.config.algorithm == "linear":
                frames = self._linear_interpolation(keyframe_a, keyframe_b)
            elif self.config.algorithm == "optical_flow":
                frames = self._optical_flow_interpolation(keyframe_a, keyframe_b)
            elif self.config.algorithm == "depth_aware":
                frames = self._depth_aware_interpolation(keyframe_a, keyframe_b)
            else:
                raise ValueError(f"Unknown interpolation algorithm: {self.config.algorithm}")
            
            # Apply post-processing
            frames = self._apply_post_processing(frames, keyframe_a, keyframe_b)
            
            # Calculate quality metrics
            quality_metrics = self._calculate_quality_metrics(frames, keyframe_a, keyframe_b)
            
            processing_time = time.time() - start_time
            
            return InterpolationResult(
                success=True,
                interpolated_frames=frames,
                processing_time=processing_time,
                quality_metrics=quality_metrics
            )
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Frame interpolation failed: {e}")
            
            return InterpolationResult(
                success=False,
                interpolated_frames=[],
                processing_time=processing_time,
                quality_metrics={},
                error_message=str(e)
            )
    
    def _validate_keyframes(self, keyframe_a: Dict[str, Any], keyframe_b: Dict[str, Any]) -> None:
        """Validate input keyframes."""
        required_fields = ["width", "height", "timestamp"]
        
        for keyframe, name in [(keyframe_a, "keyframe_a"), (keyframe_b, "keyframe_b")]:
            for field in required_fields:
                if field not in keyframe:
                    raise ValueError(f"Missing required field '{field}' in {name}")
            
            if keyframe["width"] <= 0 or keyframe["height"] <= 0:
                raise ValueError(f"Invalid dimensions in {name}: {keyframe['width']}x{keyframe['height']}")
        
        # Check aspect ratio consistency if preservation is enabled
        if self.config.preserve_aspect_ratio:
            aspect_a = keyframe_a["width"] / keyframe_a["height"]
            aspect_b = keyframe_b["width"] / keyframe_b["height"]
            
            if abs(aspect_a - aspect_b) > 0.001:
                raise ValueError(f"Aspect ratio mismatch: {aspect_a} vs {aspect_b}")
    
    def _linear_interpolation(self, keyframe_a: Dict[str, Any], keyframe_b: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Perform linear interpolation between keyframes."""
        frames = []
        
        for i in range(self.config.frame_count):
            # Calculate interpolation factor
            if self.config.frame_count > 1:
                alpha = i / (self.config.frame_count - 1)
            else:
                alpha = 0.5
            
            # Interpolate basic properties
            frame = {
                "frame_id": f"interpolated_{i}",
                "width": keyframe_a["width"],  # Preserve dimensions
                "height": keyframe_a["height"],
                "timestamp": keyframe_a["timestamp"] + alpha * (keyframe_b["timestamp"] - keyframe_a["timestamp"]),
                "interpolation_alpha": alpha
            }
            
            # Interpolate quality score if available
            if "quality_score" in keyframe_a and "quality_score" in keyframe_b:
                frame["quality_score"] = (1 - alpha) * keyframe_a["quality_score"] + alpha * keyframe_b["quality_score"]
                # Apply quality degradation based on interpolation
                frame["quality_score"] *= self._get_quality_factor(alpha)
            
            # Interpolate character features if available and enabled
            if (self.config.enable_character_preservation and 
                "character_features" in keyframe_a and "character_features" in keyframe_b):
                features_a = np.array(keyframe_a["character_features"])
                features_b = np.array(keyframe_b["character_features"])
                interpolated_features = (1 - alpha) * features_a + alpha * features_b
                frame["character_features"] = interpolated_features.tolist()
            
            # Interpolate lighting conditions if available
            if "lighting_conditions" in keyframe_a and "lighting_conditions" in keyframe_b:
                lighting_a = keyframe_a["lighting_conditions"]
                lighting_b = keyframe_b["lighting_conditions"]
                frame["lighting_conditions"] = {}
                
                for key in lighting_a:
                    if key in lighting_b:
                        if isinstance(lighting_a[key], (int, float)):
                            frame["lighting_conditions"][key] = (1 - alpha) * lighting_a[key] + alpha * lighting_b[key]
                        else:
                            # For non-numeric values, use nearest neighbor
                            frame["lighting_conditions"][key] = lighting_a[key] if alpha < 0.5 else lighting_b[key]
            
            frames.append(frame)
        
        return frames
    
    def _optical_flow_interpolation(self, keyframe_a: Dict[str, Any], keyframe_b: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Perform optical flow-based interpolation (enhanced linear for mock)."""
        # Start with linear interpolation
        frames = self._linear_interpolation(keyframe_a, keyframe_b)
        
        # Apply optical flow enhancements
        for i, frame in enumerate(frames):
            alpha = frame["interpolation_alpha"]
            
            # Simulate optical flow quality improvements
            if "quality_score" in frame:
                # Optical flow typically provides better quality
                optical_flow_bonus = 0.05 * (1 - abs(alpha - 0.5) * 2)  # Peak at middle frames
                frame["quality_score"] = min(1.0, frame["quality_score"] + optical_flow_bonus)
            
            # Add motion blur simulation
            if self.config.motion_blur_strength > 0:
                motion_intensity = abs(alpha - 0.5) * 2 * self.config.motion_blur_strength
                frame["motion_blur_intensity"] = motion_intensity
            
            # Enhanced character preservation
            if "character_features" in frame and self.config.enable_character_preservation:
                # Apply temporal smoothing
                features = np.array(frame["character_features"])
                smoothing_factor = self.config.temporal_smoothing
                
                # Simulate better character preservation with optical flow
                if i > 0 and i < len(frames) - 1:
                    # Smooth with neighboring frames
                    prev_features = np.array(frames[i-1]["character_features"])
                    next_features = np.array(frames[i+1]["character_features"]) if i+1 < len(frames) else features
                    
                    smoothed_features = (
                        (1 - smoothing_factor) * features +
                        smoothing_factor * 0.5 * (prev_features + next_features)
                    )
                    frame["character_features"] = smoothed_features.tolist()
        
        return frames
    
    def _depth_aware_interpolation(self, keyframe_a: Dict[str, Any], keyframe_b: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Perform depth-aware interpolation (enhanced optical flow for mock)."""
        # Start with optical flow interpolation
        frames = self._optical_flow_interpolation(keyframe_a, keyframe_b)
        
        # Apply depth-aware enhancements
        for frame in frames:
            alpha = frame["interpolation_alpha"]
            
            # Simulate depth information
            frame["depth_info"] = {
                "has_depth": self.config.enable_depth_awareness,
                "depth_quality": 0.8 + 0.2 * (1 - abs(alpha - 0.5) * 2),  # Better quality in middle
                "depth_layers": 3  # Foreground, middle, background
            }
            
            # Enhanced quality with depth awareness
            if "quality_score" in frame and self.config.enable_depth_awareness:
                depth_bonus = 0.03 * frame["depth_info"]["depth_quality"]
                frame["quality_score"] = min(1.0, frame["quality_score"] + depth_bonus)
            
            # Depth-aware character preservation
            if "character_features" in frame and self.config.enable_depth_awareness:
                # Characters in foreground get better preservation
                features = np.array(frame["character_features"])
                depth_preservation_factor = 1.02  # Slight improvement
                frame["character_features"] = (features * depth_preservation_factor).tolist()
        
        return frames
    
    def _apply_post_processing(self, frames: List[Dict[str, Any]], keyframe_a: Dict[str, Any], keyframe_b: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Apply post-processing to interpolated frames."""
        processed_frames = []
        
        for i, frame in enumerate(frames):
            processed_frame = frame.copy()
            
            # Ensure aspect ratio preservation
            if self.config.preserve_aspect_ratio:
                processed_frame["width"] = keyframe_a["width"]
                processed_frame["height"] = keyframe_a["height"]
            
            # Apply temporal smoothing
            if self.config.temporal_smoothing > 0 and len(frames) > 1:
                # Smooth quality scores
                if "quality_score" in processed_frame:
                    smoothed_quality = self._apply_temporal_smoothing(
                        frames, i, "quality_score", self.config.temporal_smoothing
                    )
                    processed_frame["quality_score"] = smoothed_quality
            
            # Add processing metadata
            processed_frame["processing_metadata"] = {
                "algorithm": self.config.algorithm,
                "quality_setting": self.config.quality,
                "frame_index": i,
                "total_frames": len(frames),
                "post_processed": True
            }
            
            processed_frames.append(processed_frame)
        
        return processed_frames
    
    def _apply_temporal_smoothing(self, frames: List[Dict[str, Any]], index: int, field: str, smoothing_factor: float) -> float:
        """Apply temporal smoothing to a specific field."""
        if field not in frames[index]:
            return 0.0
        
        current_value = frames[index][field]
        
        # No smoothing for first and last frames
        if index == 0 or index == len(frames) - 1:
            return current_value
        
        # Get neighboring values
        prev_value = frames[index - 1].get(field, current_value)
        next_value = frames[index + 1].get(field, current_value) if index + 1 < len(frames) else current_value
        
        # Apply smoothing
        smoothed_value = (
            (1 - smoothing_factor) * current_value +
            smoothing_factor * 0.5 * (prev_value + next_value)
        )
        
        return smoothed_value
    
    def _get_quality_factor(self, alpha: float) -> float:
        """Get quality factor based on interpolation position."""
        # Quality is typically lower in the middle of interpolation
        # but this depends on the algorithm
        if self.config.algorithm == "linear":
            # Linear interpolation has consistent quality degradation
            return 0.95 - 0.05 * abs(alpha - 0.5) * 2
        elif self.config.algorithm == "optical_flow":
            # Optical flow maintains better quality
            return 0.98 - 0.02 * abs(alpha - 0.5) * 2
        elif self.config.algorithm == "depth_aware":
            # Depth-aware has the best quality preservation
            return 0.99 - 0.01 * abs(alpha - 0.5) * 2
        else:
            return 0.95
    
    def _calculate_quality_metrics(self, frames: List[Dict[str, Any]], keyframe_a: Dict[str, Any], keyframe_b: Dict[str, Any]) -> Dict[str, float]:
        """Calculate quality metrics for interpolated frames."""
        if not frames:
            return {}
        
        # Calculate average quality
        quality_scores = [frame.get("quality_score", 0.8) for frame in frames]
        avg_quality = np.mean(quality_scores)
        min_quality = np.min(quality_scores)
        max_quality = np.max(quality_scores)
        quality_variance = np.var(quality_scores)
        
        # Calculate temporal consistency
        temporal_consistency = 1.0 - quality_variance  # Higher variance = lower consistency
        
        # Calculate character preservation score
        character_preservation = 1.0
        if self.config.enable_character_preservation:
            character_errors = []
            for frame in frames:
                if "character_features" in frame:
                    # Simulate character preservation quality
                    alpha = frame.get("interpolation_alpha", 0.5)
                    expected_error = abs(alpha - 0.5) * 0.1  # Error increases away from middle
                    character_errors.append(expected_error)
            
            if character_errors:
                character_preservation = 1.0 - np.mean(character_errors)
        
        # Calculate motion smoothness
        motion_smoothness = 1.0
        if len(frames) > 1:
            quality_changes = []
            for i in range(1, len(frames)):
                prev_quality = frames[i-1].get("quality_score", 0.8)
                curr_quality = frames[i].get("quality_score", 0.8)
                quality_changes.append(abs(curr_quality - prev_quality))
            
            if quality_changes:
                motion_smoothness = 1.0 - np.mean(quality_changes)
        
        return {
            "average_quality": avg_quality,
            "minimum_quality": min_quality,
            "maximum_quality": max_quality,
            "quality_variance": quality_variance,
            "temporal_consistency": max(0.0, temporal_consistency),
            "character_preservation": max(0.0, character_preservation),
            "motion_smoothness": max(0.0, motion_smoothness),
            "overall_score": np.mean([avg_quality, temporal_consistency, character_preservation, motion_smoothness])
        }