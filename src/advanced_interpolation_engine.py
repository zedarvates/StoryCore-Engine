#!/usr/bin/env python3
"""
Advanced Interpolation Engine for Video Engine

This module implements advanced interpolation algorithms including:
- AI-based frame interpolation (optional)
- Motion blur simulation for realistic movement
- Depth-of-field effects during camera movement
- Lens simulation (focal length, aperture)

Requirements: VE-3.7, VE-8.3, VE-8.7
"""

import logging
import numpy as np
from typing import Dict, List, Tuple, Optional, Any, Union
from dataclasses import dataclass, field
from enum import Enum
import json
import time
from pathlib import Path

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class InterpolationMethod(Enum):
    """Advanced interpolation methods."""
    LINEAR = "linear"
    OPTICAL_FLOW = "optical_flow"
    AI_BASED = "ai_based"
    DEPTH_AWARE = "depth_aware"
    MOTION_COMPENSATED = "motion_compensated"


class MotionBlurType(Enum):
    """Motion blur simulation types."""
    NONE = "none"
    LINEAR = "linear"
    RADIAL = "radial"
    ZOOM = "zoom"
    CAMERA_SHAKE = "camera_shake"
    OBJECT_MOTION = "object_motion"


class DepthOfFieldMode(Enum):
    """Depth of field simulation modes."""
    DISABLED = "disabled"
    SHALLOW = "shallow"
    DEEP = "deep"
    FOCUS_PULL = "focus_pull"
    RACK_FOCUS = "rack_focus"
    TILT_SHIFT = "tilt_shift"


class LensType(Enum):
    """Camera lens simulation types."""
    STANDARD = "standard"
    WIDE_ANGLE = "wide_angle"
    TELEPHOTO = "telephoto"
    FISHEYE = "fisheye"
    MACRO = "macro"
    ANAMORPHIC = "anamorphic"


@dataclass
class MotionBlurConfig:
    """Configuration for motion blur simulation."""
    blur_type: MotionBlurType = MotionBlurType.LINEAR
    intensity: float = 0.5  # 0.0 to 1.0
    direction_angle: float = 0.0  # degrees
    samples: int = 16  # quality vs performance
    adaptive: bool = True  # adapt to motion speed
    preserve_edges: bool = True


@dataclass
class DepthOfFieldConfig:
    """Configuration for depth of field effects."""
    mode: DepthOfFieldMode = DepthOfFieldMode.SHALLOW
    focal_distance: float = 5.0  # meters
    aperture: float = 2.8  # f-stop
    bokeh_quality: str = "high"  # low, medium, high
    focus_transition_speed: float = 1.0  # for focus pulls
    depth_map_quality: str = "medium"


@dataclass
class LensSimulationConfig:
    """Configuration for lens simulation."""
    lens_type: LensType = LensType.STANDARD
    focal_length: float = 50.0  # mm
    aperture: float = 2.8  # f-stop
    distortion: float = 0.0  # -1.0 to 1.0
    vignetting: float = 0.1  # 0.0 to 1.0
    chromatic_aberration: float = 0.05  # 0.0 to 1.0
    lens_flare: bool = False
    breathing: float = 0.0  # focus breathing effect


@dataclass
class AdvancedInterpolationConfig:
    """Configuration for advanced interpolation features."""
    method: InterpolationMethod = InterpolationMethod.OPTICAL_FLOW
    motion_blur: MotionBlurConfig = field(default_factory=MotionBlurConfig)
    depth_of_field: DepthOfFieldConfig = field(default_factory=DepthOfFieldConfig)
    lens_simulation: LensSimulationConfig = field(default_factory=LensSimulationConfig)
    
    # AI-based interpolation settings
    ai_model_path: Optional[str] = None
    ai_quality: str = "medium"  # low, medium, high
    ai_fallback: InterpolationMethod = InterpolationMethod.OPTICAL_FLOW
    
    # Performance settings
    gpu_acceleration: bool = True
    parallel_processing: bool = True
    memory_limit_gb: float = 8.0
    quality_vs_speed: float = 0.7  # 0.0 (speed) to 1.0 (quality)


class AdvancedInterpolationEngine:
    """Advanced interpolation engine with cinematic effects."""
    
    def __init__(self, config: AdvancedInterpolationConfig):
        """Initialize advanced interpolation engine."""
        self.config = config
        self.performance_metrics = {}
        self.quality_metrics = {}
        
        logger.info(f"Advanced Interpolation Engine initialized with method: {config.method.value}")
        
        # Initialize subsystems
        self._initialize_motion_blur_system()
        self._initialize_depth_of_field_system()
        self._initialize_lens_simulation_system()
        self._initialize_ai_system()
    
    def _initialize_motion_blur_system(self):
        """Initialize motion blur simulation system."""
        self.motion_blur_kernels = {}
        
        # Pre-compute common blur kernels
        for blur_type in MotionBlurType:
            if blur_type != MotionBlurType.NONE:
                self.motion_blur_kernels[blur_type] = self._generate_blur_kernel(blur_type)
        
        logger.info("Motion blur system initialized")
    
    def _initialize_depth_of_field_system(self):
        """Initialize depth of field simulation system."""
        self.dof_parameters = {
            DepthOfFieldMode.SHALLOW: {"circle_of_confusion": 0.03, "blur_radius": 15},
            DepthOfFieldMode.DEEP: {"circle_of_confusion": 0.01, "blur_radius": 5},
            DepthOfFieldMode.FOCUS_PULL: {"transition_frames": 24, "easing": "smooth"},
            DepthOfFieldMode.RACK_FOCUS: {"transition_frames": 12, "easing": "sharp"},
            DepthOfFieldMode.TILT_SHIFT: {"gradient_angle": 0, "gradient_width": 0.3}
        }
        
        logger.info("Depth of field system initialized")
    
    def _initialize_lens_simulation_system(self):
        """Initialize lens simulation system."""
        self.lens_parameters = {
            LensType.STANDARD: {"fov": 46, "distortion": 0.0, "vignetting": 0.1},
            LensType.WIDE_ANGLE: {"fov": 84, "distortion": -0.2, "vignetting": 0.3},
            LensType.TELEPHOTO: {"fov": 12, "distortion": 0.1, "vignetting": 0.05},
            LensType.FISHEYE: {"fov": 180, "distortion": -0.8, "vignetting": 0.5},
            LensType.MACRO: {"fov": 46, "distortion": 0.05, "vignetting": 0.15},
            LensType.ANAMORPHIC: {"fov": 46, "distortion": 0.0, "vignetting": 0.2, "squeeze": 2.0}
        }
        
        logger.info("Lens simulation system initialized")
    
    def _initialize_ai_system(self):
        """Initialize AI-based interpolation system."""
        self.ai_available = False
        
        if self.config.ai_model_path and Path(self.config.ai_model_path).exists():
            try:
                # Mock AI model loading
                logger.info(f"Loading AI interpolation model from {self.config.ai_model_path}")
                self.ai_available = True
            except Exception as e:
                logger.warning(f"Failed to load AI model: {e}, falling back to {self.config.ai_fallback.value}")
                self.ai_available = False
        else:
            logger.info("AI interpolation not available, using traditional methods")
    
    def interpolate_frames(self, keyframes: List[np.ndarray], target_frame_count: int, 
                          camera_movement: Optional[Dict] = None) -> List[np.ndarray]:
        """
        Interpolate frames with advanced algorithms and effects.
        
        Args:
            keyframes: List of keyframe images as numpy arrays
            target_frame_count: Total number of frames to generate
            camera_movement: Optional camera movement parameters
            
        Returns:
            List of interpolated frames with effects applied
        """
        start_time = time.time()
        
        logger.info(f"Starting advanced interpolation: {len(keyframes)} keyframes → {target_frame_count} frames")
        
        # Validate input keyframes
        if not keyframes:
            raise ValueError("At least one keyframe is required")
        
        # Ensure all keyframes have the same dimensions
        reference_shape = keyframes[0].shape
        for i, frame in enumerate(keyframes):
            if frame.shape != reference_shape:
                raise ValueError(f"Keyframe {i} has shape {frame.shape}, expected {reference_shape}")
        
        # Step 1: Basic interpolation
        interpolated_frames = self._perform_basic_interpolation(keyframes, target_frame_count)
        
        # Step 2: Apply camera movement
        if camera_movement:
            interpolated_frames = self._apply_camera_movement(interpolated_frames, camera_movement)
        
        # Step 3: Apply motion blur
        if self.config.motion_blur.blur_type != MotionBlurType.NONE:
            interpolated_frames = self._apply_motion_blur(interpolated_frames, camera_movement)
        
        # Step 4: Apply depth of field
        if self.config.depth_of_field.mode != DepthOfFieldMode.DISABLED:
            interpolated_frames = self._apply_depth_of_field(interpolated_frames, camera_movement)
        
        # Step 5: Apply lens simulation
        interpolated_frames = self._apply_lens_simulation(interpolated_frames)
        
        # Record performance metrics
        processing_time = time.time() - start_time
        self.performance_metrics.update({
            "interpolation_time": processing_time,
            "frames_per_second": len(interpolated_frames) / max(processing_time, 0.001),  # Avoid division by zero
            "method_used": self.config.method.value,
            "effects_applied": self._get_applied_effects()
        })
        
        logger.info(f"Advanced interpolation completed in {processing_time:.2f}s")
        
        return interpolated_frames
    
    def _perform_basic_interpolation(self, keyframes: List[np.ndarray], target_count: int) -> List[np.ndarray]:
        """Perform basic frame interpolation."""
        if self.config.method == InterpolationMethod.AI_BASED and self.ai_available:
            return self._ai_interpolation(keyframes, target_count)
        elif self.config.method == InterpolationMethod.OPTICAL_FLOW:
            return self._optical_flow_interpolation(keyframes, target_count)
        elif self.config.method == InterpolationMethod.DEPTH_AWARE:
            return self._depth_aware_interpolation(keyframes, target_count)
        elif self.config.method == InterpolationMethod.MOTION_COMPENSATED:
            return self._motion_compensated_interpolation(keyframes, target_count)
        else:
            return self._linear_interpolation(keyframes, target_count)
    
    def _ai_interpolation(self, keyframes: List[np.ndarray], target_count: int) -> List[np.ndarray]:
        """AI-based frame interpolation (mock implementation)."""
        logger.info("Performing AI-based interpolation")
        
        # Mock AI interpolation - in reality would use trained model
        frames = []
        for i in range(target_count):
            # Simulate AI processing with slight variations
            progress = i / (target_count - 1)
            keyframe_idx = int(progress * (len(keyframes) - 1))
            
            if keyframe_idx < len(keyframes) - 1:
                # Blend between keyframes with AI-like smoothing
                alpha = (progress * (len(keyframes) - 1)) - keyframe_idx
                frame = self._blend_frames_ai(keyframes[keyframe_idx], keyframes[keyframe_idx + 1], alpha)
            else:
                frame = keyframes[-1].copy()
            
            frames.append(frame)
        
        return frames
    
    def _optical_flow_interpolation(self, keyframes: List[np.ndarray], target_count: int) -> List[np.ndarray]:
        """Optical flow-based interpolation."""
        logger.info("Performing optical flow interpolation")
        
        frames = []
        for i in range(target_count):
            progress = i / (target_count - 1)
            keyframe_idx = int(progress * (len(keyframes) - 1))
            
            if keyframe_idx < len(keyframes) - 1:
                alpha = (progress * (len(keyframes) - 1)) - keyframe_idx
                frame = self._optical_flow_blend(keyframes[keyframe_idx], keyframes[keyframe_idx + 1], alpha)
            else:
                frame = keyframes[-1].copy()
            
            frames.append(frame)
        
        return frames
    
    def _depth_aware_interpolation(self, keyframes: List[np.ndarray], target_count: int) -> List[np.ndarray]:
        """Depth-aware interpolation."""
        logger.info("Performing depth-aware interpolation")
        
        # Generate depth maps for keyframes
        depth_maps = [self._estimate_depth_map(frame) for frame in keyframes]
        
        frames = []
        for i in range(target_count):
            progress = i / (target_count - 1)
            keyframe_idx = int(progress * (len(keyframes) - 1))
            
            if keyframe_idx < len(keyframes) - 1:
                alpha = (progress * (len(keyframes) - 1)) - keyframe_idx
                frame = self._depth_aware_blend(
                    keyframes[keyframe_idx], keyframes[keyframe_idx + 1],
                    depth_maps[keyframe_idx], depth_maps[keyframe_idx + 1],
                    alpha
                )
            else:
                frame = keyframes[-1].copy()
            
            frames.append(frame)
        
        return frames
    
    def _motion_compensated_interpolation(self, keyframes: List[np.ndarray], target_count: int) -> List[np.ndarray]:
        """Motion-compensated interpolation."""
        logger.info("Performing motion-compensated interpolation")
        
        # Estimate motion vectors between keyframes
        motion_vectors = []
        for i in range(len(keyframes) - 1):
            motion = self._estimate_motion_vectors(keyframes[i], keyframes[i + 1])
            motion_vectors.append(motion)
        
        frames = []
        for i in range(target_count):
            progress = i / (target_count - 1)
            keyframe_idx = int(progress * (len(keyframes) - 1))
            
            if keyframe_idx < len(keyframes) - 1:
                alpha = (progress * (len(keyframes) - 1)) - keyframe_idx
                frame = self._motion_compensated_blend(
                    keyframes[keyframe_idx], keyframes[keyframe_idx + 1],
                    motion_vectors[keyframe_idx], alpha
                )
            else:
                frame = keyframes[-1].copy()
            
            frames.append(frame)
        
        return frames
    
    def _linear_interpolation(self, keyframes: List[np.ndarray], target_count: int) -> List[np.ndarray]:
        """Simple linear interpolation."""
        logger.info("Performing linear interpolation")
        
        frames = []
        for i in range(target_count):
            progress = i / (target_count - 1)
            keyframe_idx = int(progress * (len(keyframes) - 1))
            
            if keyframe_idx < len(keyframes) - 1:
                alpha = (progress * (len(keyframes) - 1)) - keyframe_idx
                frame = self._linear_blend(keyframes[keyframe_idx], keyframes[keyframe_idx + 1], alpha)
            else:
                frame = keyframes[-1].copy()
            
            frames.append(frame)
        
        return frames
    
    def _apply_camera_movement(self, frames: List[np.ndarray], movement: Dict) -> List[np.ndarray]:
        """Apply camera movement to frame sequence."""
        logger.info(f"Applying camera movement: {movement.get('type', 'unknown')}")
        
        movement_type = movement.get('type', 'static')
        
        if movement_type == 'pan':
            return self._apply_pan_movement(frames, movement)
        elif movement_type == 'zoom':
            return self._apply_zoom_movement(frames, movement)
        elif movement_type == 'dolly':
            return self._apply_dolly_movement(frames, movement)
        elif movement_type == 'compound':
            return self._apply_compound_movement(frames, movement)
        else:
            return frames
    
    def _apply_motion_blur(self, frames: List[np.ndarray], camera_movement: Optional[Dict] = None) -> List[np.ndarray]:
        """Apply motion blur simulation."""
        logger.info(f"Applying motion blur: {self.config.motion_blur.blur_type.value}")
        
        blurred_frames = []
        
        for i, frame in enumerate(frames):
            # Calculate motion intensity based on camera movement and frame position
            motion_intensity = self._calculate_motion_intensity(i, len(frames), camera_movement)
            
            # Apply adaptive blur based on motion
            if self.config.motion_blur.adaptive:
                blur_intensity = self.config.motion_blur.intensity * motion_intensity
            else:
                blur_intensity = self.config.motion_blur.intensity
            
            # Apply motion blur
            if blur_intensity > 0.01:  # Only apply if significant
                blurred_frame = self._apply_motion_blur_to_frame(frame, blur_intensity)
            else:
                blurred_frame = frame.copy()
            
            blurred_frames.append(blurred_frame)
        
        return blurred_frames
    
    def _apply_depth_of_field(self, frames: List[np.ndarray], camera_movement: Optional[Dict] = None) -> List[np.ndarray]:
        """Apply depth of field effects."""
        logger.info(f"Applying depth of field: {self.config.depth_of_field.mode.value}")
        
        dof_frames = []
        
        for i, frame in enumerate(frames):
            # Calculate focus parameters for this frame
            focus_params = self._calculate_focus_parameters(i, len(frames), camera_movement)
            
            # Apply depth of field effect
            dof_frame = self._apply_dof_to_frame(frame, focus_params)
            dof_frames.append(dof_frame)
        
        return dof_frames
    
    def _apply_lens_simulation(self, frames: List[np.ndarray]) -> List[np.ndarray]:
        """Apply lens simulation effects."""
        logger.info(f"Applying lens simulation: {self.config.lens_simulation.lens_type.value}")
        
        lens_frames = []
        
        for frame in frames:
            # Apply lens effects
            lens_frame = self._apply_lens_effects_to_frame(frame)
            lens_frames.append(lens_frame)
        
        return lens_frames
    
    # Helper methods for frame processing
    
    def _blend_frames_ai(self, frame1: np.ndarray, frame2: np.ndarray, alpha: float) -> np.ndarray:
        """AI-enhanced frame blending."""
        # Mock AI blending with enhanced smoothing
        base_blend = frame1 * (1 - alpha) + frame2 * alpha
        
        # Add AI-like enhancement (mock)
        enhancement_factor = 0.1 * np.sin(alpha * np.pi)  # Smooth enhancement curve
        enhanced_blend = base_blend * (1 + enhancement_factor)
        
        return np.clip(enhanced_blend, 0, 255).astype(np.uint8)
    
    def _optical_flow_blend(self, frame1: np.ndarray, frame2: np.ndarray, alpha: float) -> np.ndarray:
        """Optical flow-based frame blending."""
        # Mock optical flow calculation
        flow_x = np.random.normal(0, 2, frame1.shape[:2]) * alpha
        flow_y = np.random.normal(0, 2, frame1.shape[:2]) * alpha
        
        # Apply flow-based warping (simplified)
        warped_frame1 = self._warp_frame(frame1, flow_x * (1 - alpha), flow_y * (1 - alpha))
        warped_frame2 = self._warp_frame(frame2, flow_x * alpha, flow_y * alpha)
        
        return (warped_frame1 * (1 - alpha) + warped_frame2 * alpha).astype(np.uint8)
    
    def _depth_aware_blend(self, frame1: np.ndarray, frame2: np.ndarray, 
                          depth1: np.ndarray, depth2: np.ndarray, alpha: float) -> np.ndarray:
        """Depth-aware frame blending."""
        # Use depth information to weight blending
        depth_weight = (depth1 + depth2) / 2
        depth_weight = depth_weight / np.max(depth_weight)  # Normalize
        
        # Blend with depth weighting
        blended = frame1 * (1 - alpha) * depth_weight[..., np.newaxis] + \
                 frame2 * alpha * (1 - depth_weight[..., np.newaxis])
        
        return np.clip(blended, 0, 255).astype(np.uint8)
    
    def _motion_compensated_blend(self, frame1: np.ndarray, frame2: np.ndarray, 
                                 motion_vectors: np.ndarray, alpha: float) -> np.ndarray:
        """Motion-compensated frame blending."""
        # Apply motion compensation
        compensated_frame1 = self._apply_motion_compensation(frame1, motion_vectors, alpha)
        compensated_frame2 = self._apply_motion_compensation(frame2, motion_vectors, 1 - alpha)
        
        return (compensated_frame1 * (1 - alpha) + compensated_frame2 * alpha).astype(np.uint8)
    
    def _linear_blend(self, frame1: np.ndarray, frame2: np.ndarray, alpha: float) -> np.ndarray:
        """Simple linear frame blending."""
        return (frame1 * (1 - alpha) + frame2 * alpha).astype(np.uint8)
    
    def _estimate_depth_map(self, frame: np.ndarray) -> np.ndarray:
        """Estimate depth map from frame (mock implementation)."""
        # Mock depth estimation using gradient-based approach
        gray = np.mean(frame, axis=2) if len(frame.shape) == 3 else frame
        
        # Simple depth estimation based on brightness and gradients
        depth = np.gradient(gray)[0] ** 2 + np.gradient(gray)[1] ** 2
        depth = np.sqrt(depth)
        
        return depth / np.max(depth)  # Normalize
    
    def _estimate_motion_vectors(self, frame1: np.ndarray, frame2: np.ndarray) -> np.ndarray:
        """Estimate motion vectors between frames (mock implementation)."""
        # Mock motion vector estimation
        h, w = frame1.shape[:2]
        motion_x = np.random.normal(0, 1, (h, w))
        motion_y = np.random.normal(0, 1, (h, w))
        
        return np.stack([motion_x, motion_y], axis=-1)
    
    def _warp_frame(self, frame: np.ndarray, flow_x: np.ndarray, flow_y: np.ndarray) -> np.ndarray:
        """Warp frame using flow vectors (simplified implementation)."""
        # Simplified warping - in practice would use proper interpolation
        return frame  # Mock implementation
    
    def _apply_motion_compensation(self, frame: np.ndarray, motion_vectors: np.ndarray, alpha: float) -> np.ndarray:
        """Apply motion compensation to frame."""
        # Mock motion compensation
        return frame  # Simplified implementation
    
    def _generate_blur_kernel(self, blur_type: MotionBlurType) -> np.ndarray:
        """Generate motion blur kernel."""
        if blur_type == MotionBlurType.LINEAR:
            kernel = np.zeros((15, 15))
            kernel[7, :] = 1
            return kernel / np.sum(kernel)
        elif blur_type == MotionBlurType.RADIAL:
            # Radial blur kernel
            size = 15
            center = size // 2
            y, x = np.ogrid[:size, :size]
            mask = (x - center) ** 2 + (y - center) ** 2 <= center ** 2
            kernel = np.zeros((size, size))
            kernel[mask] = 1
            return kernel / np.sum(kernel)
        else:
            # Default kernel
            return np.ones((3, 3)) / 9
    
    def _calculate_motion_intensity(self, frame_idx: int, total_frames: int, camera_movement: Optional[Dict]) -> float:
        """Calculate motion intensity for frame."""
        if not camera_movement:
            return 0.1  # Minimal motion
        
        movement_type = camera_movement.get('type', 'static')
        
        if movement_type == 'pan':
            # Pan motion is constant
            return 0.8
        elif movement_type == 'zoom':
            # Zoom motion increases towards center
            progress = frame_idx / total_frames
            return 0.3 + 0.7 * progress
        elif movement_type == 'dolly':
            # Dolly motion varies with speed
            return 0.6
        else:
            return 0.2
    
    def _apply_motion_blur_to_frame(self, frame: np.ndarray, intensity: float) -> np.ndarray:
        """Apply motion blur to single frame."""
        # Mock motion blur application
        blur_kernel = self.motion_blur_kernels.get(self.config.motion_blur.blur_type)
        if blur_kernel is not None:
            # Simulate convolution blur
            blurred = frame * (1 - intensity) + frame * intensity * 0.8
            return np.clip(blurred, 0, 255).astype(np.uint8)
        return frame
    
    def _calculate_focus_parameters(self, frame_idx: int, total_frames: int, camera_movement: Optional[Dict]) -> Dict:
        """Calculate focus parameters for frame."""
        progress = frame_idx / total_frames
        
        if self.config.depth_of_field.mode == DepthOfFieldMode.FOCUS_PULL:
            # Focus pull from near to far
            focal_distance = self.config.depth_of_field.focal_distance * (1 + progress * 2)
        elif self.config.depth_of_field.mode == DepthOfFieldMode.RACK_FOCUS:
            # Quick focus change at midpoint
            if progress < 0.5:
                focal_distance = self.config.depth_of_field.focal_distance
            else:
                focal_distance = self.config.depth_of_field.focal_distance * 3
        else:
            focal_distance = self.config.depth_of_field.focal_distance
        
        return {
            "focal_distance": focal_distance,
            "aperture": self.config.depth_of_field.aperture,
            "blur_radius": self._calculate_blur_radius(focal_distance)
        }
    
    def _calculate_blur_radius(self, focal_distance: float) -> float:
        """Calculate blur radius based on focal distance."""
        # Simplified depth of field calculation
        return max(1, 20 / focal_distance)
    
    def _apply_dof_to_frame(self, frame: np.ndarray, focus_params: Dict) -> np.ndarray:
        """Apply depth of field to frame."""
        # Mock depth of field application
        blur_radius = focus_params["blur_radius"]
        
        if blur_radius > 1:
            # Simulate depth of field blur
            blurred = frame * 0.9  # Mock blur effect
            return np.clip(blurred, 0, 255).astype(np.uint8)
        
        return frame
    
    def _apply_lens_effects_to_frame(self, frame: np.ndarray) -> np.ndarray:
        """Apply lens simulation effects to frame."""
        lens_params = self.lens_parameters[self.config.lens_simulation.lens_type]
        
        # Apply vignetting
        if self.config.lens_simulation.vignetting > 0:
            frame = self._apply_vignetting(frame, self.config.lens_simulation.vignetting)
        
        # Apply distortion
        if self.config.lens_simulation.distortion != 0:
            frame = self._apply_distortion(frame, self.config.lens_simulation.distortion)
        
        # Apply chromatic aberration
        if self.config.lens_simulation.chromatic_aberration > 0:
            frame = self._apply_chromatic_aberration(frame, self.config.lens_simulation.chromatic_aberration)
        
        return frame
    
    def _apply_vignetting(self, frame: np.ndarray, intensity: float) -> np.ndarray:
        """Apply vignetting effect."""
        h, w = frame.shape[:2]
        center_x, center_y = w // 2, h // 2
        
        # Create vignette mask
        y, x = np.ogrid[:h, :w]
        distance = np.sqrt((x - center_x) ** 2 + (y - center_y) ** 2)
        max_distance = np.sqrt(center_x ** 2 + center_y ** 2)
        
        vignette = 1 - intensity * (distance / max_distance) ** 2
        vignette = np.clip(vignette, 0, 1)
        
        if len(frame.shape) == 3:
            vignette = vignette[..., np.newaxis]
        
        return (frame * vignette).astype(np.uint8)
    
    def _apply_distortion(self, frame: np.ndarray, distortion: float) -> np.ndarray:
        """Apply lens distortion."""
        # Mock distortion - in practice would use proper geometric transformation
        return frame
    
    def _apply_chromatic_aberration(self, frame: np.ndarray, intensity: float) -> np.ndarray:
        """Apply chromatic aberration effect."""
        # Mock chromatic aberration
        if len(frame.shape) == 3 and intensity > 0:
            # Slightly shift color channels
            aberrated = frame.copy()
            shift_amount = max(1, int(intensity * 5))  # Ensure minimum shift of 1 pixel
            aberrated[:, :, 0] = np.roll(frame[:, :, 0], shift_amount, axis=1)  # Red shift
            aberrated[:, :, 2] = np.roll(frame[:, :, 2], -shift_amount, axis=1)  # Blue shift
            return aberrated
        return frame
    
    def _apply_pan_movement(self, frames: List[np.ndarray], movement: Dict) -> List[np.ndarray]:
        """Apply pan camera movement."""
        pan_amount = movement.get('amount', 0.1)
        direction = movement.get('direction', 'right')
        
        moved_frames = []
        for i, frame in enumerate(frames):
            progress = i / len(frames)
            if direction == 'right':
                shift = int(frame.shape[1] * pan_amount * progress)
                moved_frame = np.roll(frame, shift, axis=1)
            else:
                shift = int(frame.shape[1] * pan_amount * progress)
                moved_frame = np.roll(frame, -shift, axis=1)
            
            moved_frames.append(moved_frame)
        
        return moved_frames
    
    def _apply_zoom_movement(self, frames: List[np.ndarray], movement: Dict) -> List[np.ndarray]:
        """Apply zoom camera movement."""
        zoom_factor = movement.get('factor', 1.2)
        
        moved_frames = []
        for i, frame in enumerate(frames):
            progress = i / len(frames)
            current_zoom = 1 + (zoom_factor - 1) * progress
            
            # Mock zoom by cropping and resizing
            h, w = frame.shape[:2]
            crop_h, crop_w = int(h / current_zoom), int(w / current_zoom)
            start_h, start_w = (h - crop_h) // 2, (w - crop_w) // 2
            
            cropped = frame[start_h:start_h + crop_h, start_w:start_w + crop_w]
            # In practice would resize back to original dimensions
            moved_frames.append(cropped)
        
        return moved_frames
    
    def _apply_dolly_movement(self, frames: List[np.ndarray], movement: Dict) -> List[np.ndarray]:
        """Apply dolly camera movement."""
        # Mock dolly movement with perspective change
        return frames  # Simplified implementation
    
    def _apply_compound_movement(self, frames: List[np.ndarray], movement: Dict) -> List[np.ndarray]:
        """Apply compound camera movement."""
        # Apply multiple movements in sequence
        result_frames = frames
        
        for sub_movement in movement.get('movements', []):
            result_frames = self._apply_camera_movement(result_frames, sub_movement)
        
        return result_frames
    
    def _get_applied_effects(self) -> List[str]:
        """Get list of applied effects."""
        effects = []
        
        if self.config.motion_blur.blur_type != MotionBlurType.NONE:
            effects.append(f"motion_blur_{self.config.motion_blur.blur_type.value}")
        
        if self.config.depth_of_field.mode != DepthOfFieldMode.DISABLED:
            effects.append(f"depth_of_field_{self.config.depth_of_field.mode.value}")
        
        effects.append(f"lens_{self.config.lens_simulation.lens_type.value}")
        
        return effects
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get performance metrics."""
        return self.performance_metrics.copy()
    
    def get_quality_metrics(self) -> Dict[str, Any]:
        """Get quality metrics."""
        return self.quality_metrics.copy()
    
    def validate_configuration(self) -> Tuple[bool, List[str]]:
        """Validate configuration."""
        issues = []
        
        # Validate motion blur settings
        if not 0 <= self.config.motion_blur.intensity <= 1:
            issues.append("Motion blur intensity must be between 0 and 1")
        
        # Validate depth of field settings
        if self.config.depth_of_field.focal_distance <= 0:
            issues.append("Focal distance must be positive")
        
        if self.config.depth_of_field.aperture <= 0:
            issues.append("Aperture must be positive")
        
        # Validate lens settings
        if self.config.lens_simulation.focal_length <= 0:
            issues.append("Focal length must be positive")
        
        if not -1 <= self.config.lens_simulation.distortion <= 1:
            issues.append("Distortion must be between -1 and 1")
        
        return len(issues) == 0, issues


def create_cinematic_preset(preset_name: str) -> AdvancedInterpolationConfig:
    """Create predefined cinematic preset configurations."""
    
    if preset_name == "documentary":
        return AdvancedInterpolationConfig(
            method=InterpolationMethod.OPTICAL_FLOW,
            motion_blur=MotionBlurConfig(
                blur_type=MotionBlurType.LINEAR,
                intensity=0.3,
                adaptive=True
            ),
            depth_of_field=DepthOfFieldConfig(
                mode=DepthOfFieldMode.DEEP,
                aperture=5.6
            ),
            lens_simulation=LensSimulationConfig(
                lens_type=LensType.STANDARD,
                focal_length=35.0,
                vignetting=0.05
            )
        )
    
    elif preset_name == "cinematic":
        return AdvancedInterpolationConfig(
            method=InterpolationMethod.DEPTH_AWARE,
            motion_blur=MotionBlurConfig(
                blur_type=MotionBlurType.RADIAL,
                intensity=0.6,
                adaptive=True
            ),
            depth_of_field=DepthOfFieldConfig(
                mode=DepthOfFieldMode.SHALLOW,
                aperture=2.8
            ),
            lens_simulation=LensSimulationConfig(
                lens_type=LensType.ANAMORPHIC,
                focal_length=50.0,
                vignetting=0.2
            )
        )
    
    elif preset_name == "action":
        return AdvancedInterpolationConfig(
            method=InterpolationMethod.MOTION_COMPENSATED,
            motion_blur=MotionBlurConfig(
                blur_type=MotionBlurType.OBJECT_MOTION,
                intensity=0.8,
                adaptive=True
            ),
            depth_of_field=DepthOfFieldConfig(
                mode=DepthOfFieldMode.FOCUS_PULL,
                aperture=4.0
            ),
            lens_simulation=LensSimulationConfig(
                lens_type=LensType.WIDE_ANGLE,
                focal_length=24.0,
                vignetting=0.3
            )
        )
    
    elif preset_name == "portrait":
        return AdvancedInterpolationConfig(
            method=InterpolationMethod.AI_BASED,
            motion_blur=MotionBlurConfig(
                blur_type=MotionBlurType.LINEAR,
                intensity=0.2,
                adaptive=False
            ),
            depth_of_field=DepthOfFieldConfig(
                mode=DepthOfFieldMode.SHALLOW,
                aperture=1.8
            ),
            lens_simulation=LensSimulationConfig(
                lens_type=LensType.TELEPHOTO,
                focal_length=85.0,
                vignetting=0.1
            )
        )
    
    else:
        # Default preset
        return AdvancedInterpolationConfig()


# Example usage and testing
if __name__ == "__main__":
    # Test advanced interpolation engine
    config = create_cinematic_preset("cinematic")
    engine = AdvancedInterpolationEngine(config)
    
    # Mock keyframes
    keyframes = [
        np.random.randint(0, 256, (1080, 1920, 3), dtype=np.uint8),
        np.random.randint(0, 256, (1080, 1920, 3), dtype=np.uint8)
    ]
    
    # Test interpolation
    camera_movement = {
        "type": "pan",
        "direction": "right",
        "amount": 0.1
    }
    
    interpolated = engine.interpolate_frames(keyframes, 24, camera_movement)
    
    print(f"Generated {len(interpolated)} frames")
    print(f"Performance metrics: {engine.get_performance_metrics()}")
    
    # Test configuration validation
    is_valid, issues = engine.validate_configuration()
    print(f"Configuration valid: {is_valid}")
    if issues:
        print(f"Issues: {issues}")