#!/usr/bin/env python3
"""
StoryCore-Engine Camera Movement System
Applies cinematic camera movements with smooth motion curves and professional timing.
"""

import logging
import numpy as np
import math
from pathlib import Path
from typing import List, Tuple, Optional, Dict, Any, Callable
from dataclasses import dataclass
from enum import Enum
import time

# Try to import OpenCV for advanced transformations
try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False
    logging.warning("OpenCV not available - using basic transformations only")

# Try to import PIL for image processing
try:
    from PIL import Image, ImageFilter
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    logging.warning("PIL not available - limited image processing")

logger = logging.getLogger(__name__)


class MovementType(Enum):
    """Available camera movement types."""
    PAN = "pan"
    TILT = "tilt"
    ZOOM = "zoom"
    DOLLY = "dolly"
    TRACK = "track"
    STATIC = "static"
    COMPOUND = "compound"


class EasingFunction(Enum):
    """Available easing functions for smooth motion."""
    LINEAR = "linear"
    EASE_IN = "ease_in"
    EASE_OUT = "ease_out"
    EASE_IN_OUT = "ease_in_out"
    EASE_IN_CUBIC = "ease_in_cubic"
    EASE_OUT_CUBIC = "ease_out_cubic"
    EASE_IN_OUT_CUBIC = "ease_in_out_cubic"


@dataclass
class CameraPosition:
    """3D camera position and orientation."""
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    pitch: float = 0.0  # Rotation around X-axis (tilt)
    yaw: float = 0.0    # Rotation around Y-axis (pan)
    roll: float = 0.0   # Rotation around Z-axis
    zoom: float = 1.0   # Zoom factor
    focal_length: float = 50.0  # Focal length in mm


@dataclass
class MovementSpec:
    """Specification for a camera movement."""
    movement_type: MovementType
    start_position: CameraPosition
    end_position: CameraPosition
    duration: float
    easing: EasingFunction = EasingFunction.EASE_IN_OUT
    speed_curve: Optional[List[float]] = None
    hold_start: float = 0.0  # Hold time at start
    hold_end: float = 0.0    # Hold time at end


@dataclass
class CompoundMovement:
    """Multiple simultaneous camera movements."""
    movements: List[MovementSpec]
    blend_mode: str = "additive"  # additive, multiplicative, sequential


@dataclass
class MotionCurve:
    """Generated motion curve for camera movement."""
    timestamps: List[float]
    positions: List[CameraPosition]
    velocities: List[float]
    accelerations: List[float]
    easing_values: List[float]


@dataclass
class MovementResult:
    """Result of camera movement application."""
    success: bool
    transformed_frames: List[np.ndarray]
    motion_curve: MotionCurve
    movement_metadata: Dict[str, Any]
    processing_time: float
    error_message: Optional[str] = None


class CameraMovementSystem:
    """
    Professional camera movement system with cinematic motion curves.
    
    Supports all standard camera movements:
    - Pan: Horizontal rotation
    - Tilt: Vertical rotation  
    - Zoom: Focal length changes
    - Dolly: Forward/backward movement
    - Track: Side-to-side movement
    - Compound: Multiple simultaneous movements
    """
    
    def __init__(self, enable_motion_blur: bool = True, motion_blur_samples: int = 16):
        """Initialize camera movement system."""
        self.enable_motion_blur = enable_motion_blur
        self.motion_blur_samples = motion_blur_samples
        self.easing_functions = self._initialize_easing_functions()
        
        logger.info(f"Camera Movement System initialized")
        logger.info(f"  Motion blur: {'enabled' if enable_motion_blur else 'disabled'}")
        logger.info(f"  OpenCV available: {OPENCV_AVAILABLE}")
    
    def apply_movement(
        self, 
        frames: List[np.ndarray], 
        movement_spec: MovementSpec,
        frame_rate: float = 24.0
    ) -> MovementResult:
        """
        Apply camera movement to a sequence of frames.
        
        Args:
            frames: Input frame sequence
            movement_spec: Movement specification
            frame_rate: Frame rate for timing calculations
            
        Returns:
            MovementResult with transformed frames
        """
        start_time = time.time()
        
        try:
            if not frames:
                raise ValueError("No frames provided")
            
            # Generate motion curve
            motion_curve = self._generate_motion_curve(movement_spec, len(frames), frame_rate)
            
            # Apply movement to each frame
            transformed_frames = []
            for i, frame in enumerate(frames):
                position = motion_curve.positions[i]
                velocity = motion_curve.velocities[i]
                
                # Apply camera transformation
                transformed_frame = self._apply_camera_transform(frame, position, velocity)
                transformed_frames.append(transformed_frame)
            
            # Generate metadata
            movement_metadata = self._generate_movement_metadata(movement_spec, motion_curve)
            
            processing_time = time.time() - start_time
            
            logger.info(f"Applied {movement_spec.movement_type.value} movement to {len(frames)} frames in {processing_time:.2f}s")
            
            return MovementResult(
                success=True,
                transformed_frames=transformed_frames,
                motion_curve=motion_curve,
                movement_metadata=movement_metadata,
                processing_time=processing_time
            )
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Camera movement failed: {e}")
            return MovementResult(
                success=False,
                transformed_frames=[],
                motion_curve=MotionCurve([], [], [], [], []),
                movement_metadata={},
                processing_time=processing_time,
                error_message=str(e)
            )
    
    def apply_compound_movement(
        self, 
        frames: List[np.ndarray], 
        compound_movement: CompoundMovement,
        frame_rate: float = 24.0
    ) -> MovementResult:
        """Apply multiple simultaneous camera movements."""
        start_time = time.time()
        
        try:
            if not compound_movement.movements:
                raise ValueError("No movements specified in compound movement")
            
            # Apply each movement
            current_frames = frames.copy()
            combined_metadata = {}
            combined_curves = []
            
            for i, movement_spec in enumerate(compound_movement.movements):
                result = self.apply_movement(current_frames, movement_spec, frame_rate)
                
                if not result.success:
                    raise Exception(f"Movement {i} failed: {result.error_message}")
                
                current_frames = result.transformed_frames
                combined_metadata[f"movement_{i}"] = result.movement_metadata
                combined_curves.append(result.motion_curve)
            
            # Create combined motion curve
            combined_curve = self._combine_motion_curves(combined_curves)
            
            processing_time = time.time() - start_time
            
            return MovementResult(
                success=True,
                transformed_frames=current_frames,
                motion_curve=combined_curve,
                movement_metadata={
                    "compound_movement": True,
                    "blend_mode": compound_movement.blend_mode,
                    "individual_movements": combined_metadata
                },
                processing_time=processing_time
            )
            
        except Exception as e:
            processing_time = time.time() - start_time
            logger.error(f"Compound movement failed: {e}")
            return MovementResult(
                success=False,
                transformed_frames=[],
                motion_curve=MotionCurve([], [], [], [], []),
                movement_metadata={},
                processing_time=processing_time,
                error_message=str(e)
            )
    
    def _generate_motion_curve(
        self, 
        movement_spec: MovementSpec, 
        num_frames: int, 
        frame_rate: float
    ) -> MotionCurve:
        """Generate smooth motion curve for camera movement."""
        timestamps = []
        positions = []
        velocities = []
        accelerations = []
        easing_values = []
        
        # Calculate timing
        frame_duration = 1.0 / frame_rate
        total_duration = num_frames * frame_duration
        
        # Get easing function
        easing_func = self.easing_functions[movement_spec.easing]
        
        for i in range(num_frames):
            # Calculate time position (0.0 to 1.0)
            t = i / (num_frames - 1) if num_frames > 1 else 0.0
            timestamp = i * frame_duration
            
            # Apply hold times
            if timestamp < movement_spec.hold_start:
                # Hold at start position
                eased_t = 0.0
            elif timestamp > (total_duration - movement_spec.hold_end):
                # Hold at end position
                eased_t = 1.0
            else:
                # Apply easing to movement portion
                movement_start = movement_spec.hold_start
                movement_end = total_duration - movement_spec.hold_end
                movement_duration = movement_end - movement_start
                
                if movement_duration > 0:
                    movement_t = (timestamp - movement_start) / movement_duration
                    movement_t = max(0.0, min(1.0, movement_t))
                    eased_t = easing_func(movement_t)
                else:
                    eased_t = 1.0
            
            # Interpolate camera position
            position = self._interpolate_camera_position(
                movement_spec.start_position,
                movement_spec.end_position,
                eased_t
            )
            
            # Calculate velocity and acceleration
            if i > 0:
                prev_pos = positions[-1]
                velocity = self._calculate_velocity(prev_pos, position, frame_duration)
                
                if i > 1:
                    prev_velocity = velocities[-1]
                    acceleration = (velocity - prev_velocity) / frame_duration
                else:
                    acceleration = 0.0
            else:
                velocity = 0.0
                acceleration = 0.0
            
            timestamps.append(timestamp)
            positions.append(position)
            velocities.append(velocity)
            accelerations.append(acceleration)
            easing_values.append(eased_t)
        
        return MotionCurve(
            timestamps=timestamps,
            positions=positions,
            velocities=velocities,
            accelerations=accelerations,
            easing_values=easing_values
        )
    
    def _apply_camera_transform(
        self, 
        frame: np.ndarray, 
        position: CameraPosition, 
        velocity: float
    ) -> np.ndarray:
        """Apply camera transformation to frame."""
        if not OPENCV_AVAILABLE:
            # Basic transformation without OpenCV
            return self._apply_basic_transform(frame, position, velocity)
        
        try:
            height, width = frame.shape[:2]
            
            # Create transformation matrix
            transform_matrix = self._create_transform_matrix(position, width, height)
            
            # Apply transformation
            transformed = cv2.warpPerspective(frame, transform_matrix, (width, height))
            
            # Apply motion blur if enabled and velocity is high
            if self.enable_motion_blur and velocity > 0.1:
                transformed = self._apply_motion_blur(transformed, velocity)
            
            return transformed
            
        except Exception as e:
            logger.warning(f"OpenCV transform failed, using basic: {e}")
            return self._apply_basic_transform(frame, position, velocity)
    
    def _apply_basic_transform(
        self, 
        frame: np.ndarray, 
        position: CameraPosition, 
        velocity: float
    ) -> np.ndarray:
        """Apply basic transformation without OpenCV."""
        # Simple zoom and pan simulation
        height, width = frame.shape[:2]
        
        # Apply zoom
        if position.zoom != 1.0:
            zoom_factor = position.zoom
            new_height = int(height / zoom_factor)
            new_width = int(width / zoom_factor)
            
            if new_height > 0 and new_width > 0:
                # Crop center for zoom in, or pad for zoom out
                if zoom_factor > 1.0:
                    # Zoom in - crop center
                    start_y = (height - new_height) // 2
                    start_x = (width - new_width) // 2
                    cropped = frame[start_y:start_y+new_height, start_x:start_x+new_width]
                    
                    # Resize back to original size
                    if PIL_AVAILABLE:
                        pil_image = Image.fromarray(cropped)
                        resized = pil_image.resize((width, height), Image.LANCZOS)
                        frame = np.array(resized)
                    else:
                        # Simple nearest neighbor resize
                        frame = np.repeat(np.repeat(cropped, 
                                                  height//new_height, axis=0), 
                                        width//new_width, axis=1)[:height, :width]
        
        # Apply pan (simple translation)
        if position.x != 0 or position.y != 0:
            # Create translation matrix
            pan_x = int(position.x * width * 0.1)  # Scale pan amount
            pan_y = int(position.y * height * 0.1)
            
            # Apply translation by shifting array
            if pan_x != 0 or pan_y != 0:
                shifted = np.zeros_like(frame)
                
                # Calculate source and destination regions
                src_y_start = max(0, -pan_y)
                src_y_end = min(height, height - pan_y)
                src_x_start = max(0, -pan_x)
                src_x_end = min(width, width - pan_x)
                
                dst_y_start = max(0, pan_y)
                dst_y_end = dst_y_start + (src_y_end - src_y_start)
                dst_x_start = max(0, pan_x)
                dst_x_end = dst_x_start + (src_x_end - src_x_start)
                
                if (dst_y_end > dst_y_start and dst_x_end > dst_x_start and
                    src_y_end > src_y_start and src_x_end > src_x_start):
                    shifted[dst_y_start:dst_y_end, dst_x_start:dst_x_end] = \
                        frame[src_y_start:src_y_end, src_x_start:src_x_end]
                    frame = shifted
        
        return frame
    
    def _create_transform_matrix(
        self, 
        position: CameraPosition, 
        width: int, 
        height: int
    ) -> np.ndarray:
        """Create 3x3 transformation matrix for camera position."""
        # Start with identity matrix
        matrix = np.eye(3, dtype=np.float32)
        
        # Apply zoom (scale)
        if position.zoom != 1.0:
            scale_matrix = np.array([
                [position.zoom, 0, 0],
                [0, position.zoom, 0],
                [0, 0, 1]
            ], dtype=np.float32)
            matrix = matrix @ scale_matrix
        
        # Apply pan (translation)
        if position.x != 0 or position.y != 0:
            tx = position.x * width * 0.1
            ty = position.y * height * 0.1
            
            translation_matrix = np.array([
                [1, 0, tx],
                [0, 1, ty],
                [0, 0, 1]
            ], dtype=np.float32)
            matrix = matrix @ translation_matrix
        
        # Apply rotation (yaw/pitch)
        if position.yaw != 0:
            angle = math.radians(position.yaw)
            cos_a, sin_a = math.cos(angle), math.sin(angle)
            
            rotation_matrix = np.array([
                [cos_a, -sin_a, 0],
                [sin_a, cos_a, 0],
                [0, 0, 1]
            ], dtype=np.float32)
            matrix = matrix @ rotation_matrix
        
        return matrix
    
    def _apply_motion_blur(self, frame: np.ndarray, velocity: float) -> np.ndarray:
        """Apply motion blur based on camera velocity."""
        if not PIL_AVAILABLE:
            return frame
        
        try:
            # Convert to PIL Image
            pil_image = Image.fromarray(frame)
            
            # Calculate blur amount based on velocity
            blur_radius = min(5.0, velocity * 2.0)
            
            # Apply motion blur (simplified as gaussian blur)
            blurred = pil_image.filter(ImageFilter.GaussianBlur(radius=blur_radius))
            
            # Blend with original based on velocity
            blend_factor = min(0.5, velocity * 0.3)
            result = Image.blend(pil_image, blurred, blend_factor)
            
            return np.array(result)
            
        except Exception as e:
            logger.warning(f"Motion blur failed: {e}")
            return frame
    
    def _interpolate_camera_position(
        self, 
        start: CameraPosition, 
        end: CameraPosition, 
        t: float
    ) -> CameraPosition:
        """Interpolate between two camera positions."""
        return CameraPosition(
            x=start.x + (end.x - start.x) * t,
            y=start.y + (end.y - start.y) * t,
            z=start.z + (end.z - start.z) * t,
            pitch=start.pitch + (end.pitch - start.pitch) * t,
            yaw=start.yaw + (end.yaw - start.yaw) * t,
            roll=start.roll + (end.roll - start.roll) * t,
            zoom=start.zoom + (end.zoom - start.zoom) * t,
            focal_length=start.focal_length + (end.focal_length - start.focal_length) * t
        )
    
    def _calculate_velocity(
        self, 
        prev_position: CameraPosition, 
        current_position: CameraPosition, 
        time_delta: float
    ) -> float:
        """Calculate camera velocity between positions."""
        # Calculate position change
        dx = current_position.x - prev_position.x
        dy = current_position.y - prev_position.y
        dz = current_position.z - prev_position.z
        
        # Calculate angular change
        dyaw = current_position.yaw - prev_position.yaw
        dpitch = current_position.pitch - prev_position.pitch
        
        # Calculate zoom change
        dzoom = current_position.zoom - prev_position.zoom
        
        # Combine into overall velocity measure
        position_velocity = math.sqrt(dx*dx + dy*dy + dz*dz) / time_delta
        angular_velocity = math.sqrt(dyaw*dyaw + dpitch*dpitch) / time_delta
        zoom_velocity = abs(dzoom) / time_delta
        
        return position_velocity + angular_velocity * 0.1 + zoom_velocity * 0.5
    
    def _combine_motion_curves(self, curves: List[MotionCurve]) -> MotionCurve:
        """Combine multiple motion curves into one."""
        if not curves:
            return MotionCurve([], [], [], [], [])
        
        if len(curves) == 1:
            return curves[0]
        
        # Use the first curve as base
        base_curve = curves[0]
        combined_positions = []
        
        for i, base_pos in enumerate(base_curve.positions):
            # Start with base position
            combined_pos = CameraPosition(
                x=base_pos.x, y=base_pos.y, z=base_pos.z,
                pitch=base_pos.pitch, yaw=base_pos.yaw, roll=base_pos.roll,
                zoom=base_pos.zoom, focal_length=base_pos.focal_length
            )
            
            # Add contributions from other curves
            for curve in curves[1:]:
                if i < len(curve.positions):
                    other_pos = curve.positions[i]
                    combined_pos.x += other_pos.x
                    combined_pos.y += other_pos.y
                    combined_pos.z += other_pos.z
                    combined_pos.pitch += other_pos.pitch
                    combined_pos.yaw += other_pos.yaw
                    combined_pos.roll += other_pos.roll
                    combined_pos.zoom *= other_pos.zoom  # Multiplicative for zoom
            
            combined_positions.append(combined_pos)
        
        return MotionCurve(
            timestamps=base_curve.timestamps,
            positions=combined_positions,
            velocities=base_curve.velocities,  # Use base velocities for simplicity
            accelerations=base_curve.accelerations,
            easing_values=base_curve.easing_values
        )
    
    def _generate_movement_metadata(
        self, 
        movement_spec: MovementSpec, 
        motion_curve: MotionCurve
    ) -> Dict[str, Any]:
        """Generate metadata for camera movement."""
        return {
            "movement_type": movement_spec.movement_type.value,
            "duration": movement_spec.duration,
            "easing": movement_spec.easing.value,
            "start_position": {
                "x": movement_spec.start_position.x,
                "y": movement_spec.start_position.y,
                "z": movement_spec.start_position.z,
                "zoom": movement_spec.start_position.zoom
            },
            "end_position": {
                "x": movement_spec.end_position.x,
                "y": movement_spec.end_position.y,
                "z": movement_spec.end_position.z,
                "zoom": movement_spec.end_position.zoom
            },
            "motion_statistics": {
                "max_velocity": max(motion_curve.velocities) if motion_curve.velocities else 0.0,
                "avg_velocity": np.mean(motion_curve.velocities) if motion_curve.velocities else 0.0,
                "max_acceleration": max(motion_curve.accelerations) if motion_curve.accelerations else 0.0,
                "total_frames": len(motion_curve.positions)
            }
        }
    
    def _initialize_easing_functions(self) -> Dict[EasingFunction, Callable[[float], float]]:
        """Initialize easing functions for smooth motion."""
        return {
            EasingFunction.LINEAR: lambda t: t,
            EasingFunction.EASE_IN: lambda t: t * t,
            EasingFunction.EASE_OUT: lambda t: 1 - (1 - t) * (1 - t),
            EasingFunction.EASE_IN_OUT: lambda t: 2 * t * t if t < 0.5 else 1 - 2 * (1 - t) * (1 - t),
            EasingFunction.EASE_IN_CUBIC: lambda t: t * t * t,
            EasingFunction.EASE_OUT_CUBIC: lambda t: 1 - (1 - t) * (1 - t) * (1 - t),
            EasingFunction.EASE_IN_OUT_CUBIC: lambda t: 4 * t * t * t if t < 0.5 else 1 - 4 * (1 - t) * (1 - t) * (1 - t)
        }


def create_pan_movement(
    start_angle: float, 
    end_angle: float, 
    duration: float,
    easing: EasingFunction = EasingFunction.EASE_IN_OUT
) -> MovementSpec:
    """Create a pan (horizontal rotation) movement."""
    start_pos = CameraPosition(yaw=start_angle)
    end_pos = CameraPosition(yaw=end_angle)
    
    return MovementSpec(
        movement_type=MovementType.PAN,
        start_position=start_pos,
        end_position=end_pos,
        duration=duration,
        easing=easing
    )


def create_zoom_movement(
    start_zoom: float, 
    end_zoom: float, 
    duration: float,
    easing: EasingFunction = EasingFunction.EASE_IN_OUT
) -> MovementSpec:
    """Create a zoom movement."""
    start_pos = CameraPosition(zoom=start_zoom)
    end_pos = CameraPosition(zoom=end_zoom)
    
    return MovementSpec(
        movement_type=MovementType.ZOOM,
        start_position=start_pos,
        end_position=end_pos,
        duration=duration,
        easing=easing
    )


def create_dolly_movement(
    start_z: float, 
    end_z: float, 
    duration: float,
    easing: EasingFunction = EasingFunction.EASE_IN_OUT
) -> MovementSpec:
    """Create a dolly (forward/backward) movement."""
    start_pos = CameraPosition(z=start_z)
    end_pos = CameraPosition(z=end_z)
    
    return MovementSpec(
        movement_type=MovementType.DOLLY,
        start_position=start_pos,
        end_position=end_pos,
        duration=duration,
        easing=easing
    )


def main():
    """Test camera movement functionality."""
    # Initialize camera movement system
    camera_system = CameraMovementSystem(enable_motion_blur=True)
    
    # Create test frames
    test_frames = []
    for i in range(10):
        # Create gradient test frame
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        frame[:, :, 0] = np.linspace(0, 255, 640)  # Red gradient
        frame[:, :, 1] = np.linspace(0, 255, 480).reshape(-1, 1)  # Green gradient
        frame[:, :, 2] = 128  # Blue constant
        test_frames.append(frame)
    
    # Test pan movement
    pan_movement = create_pan_movement(
        start_angle=0.0,
        end_angle=30.0,
        duration=2.0,
        easing=EasingFunction.EASE_IN_OUT
    )
    
    result = camera_system.apply_movement(test_frames, pan_movement, frame_rate=24.0)
    
    if result.success:
        print(f"[SUCCESS] Camera movement successful")
        print(f"  Movement type: {pan_movement.movement_type.value}")
        print(f"  Frames processed: {len(result.transformed_frames)}")
        print(f"  Processing time: {result.processing_time:.2f}s")
        print(f"  Max velocity: {result.movement_metadata['motion_statistics']['max_velocity']:.2f}")
        print(f"  Avg velocity: {result.movement_metadata['motion_statistics']['avg_velocity']:.2f}")
    else:
        print(f"[ERROR] Camera movement failed: {result.error_message}")
    
    # Test compound movement (pan + zoom)
    zoom_movement = create_zoom_movement(
        start_zoom=1.0,
        end_zoom=1.5,
        duration=2.0,
        easing=EasingFunction.EASE_IN_OUT
    )
    
    compound = CompoundMovement(
        movements=[pan_movement, zoom_movement],
        blend_mode="additive"
    )
    
    compound_result = camera_system.apply_compound_movement(test_frames, compound, frame_rate=24.0)
    
    if compound_result.success:
        print(f"[SUCCESS] Compound movement successful")
        print(f"  Combined movements: {len(compound.movements)}")
        print(f"  Processing time: {compound_result.processing_time:.2f}s")
    else:
        print(f"[ERROR] Compound movement failed: {compound_result.error_message}")


if __name__ == "__main__":
    main()