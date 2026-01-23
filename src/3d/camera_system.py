#!/usr/bin/env python3
"""
StoryCore-Engine 3D Camera System

Advanced camera control system for 3D rendering with cinematic movements.
Supports camera paths, animations, and advanced control.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import numpy as np
import math

from src.3d.rendering_engine import Camera3D, SceneObject
from src.camera_movement import CameraPosition as CameraPosition2D

logger = logging.getLogger(__name__)


class CameraMovementType(Enum):
    """Types of camera movements."""
    STATIC = "static"
    LINEAR = "linear"
    SPLINE = "spline"
    ORBIT = "orbit"
    TRACK = "track"
    DOLLY = "dolly"


class CameraEasing(Enum):
    """Easing functions for camera movements."""
    LINEAR = "linear"
    EASE_IN = "ease_in"
    EASE_OUT = "ease_out"
    EASE_IN_OUT = "ease_in_out"
    SMOOTHSTEP = "smoothstep"


@dataclass
class CameraKeyframe:
    """Keyframe for camera animation."""
    time: float  # in seconds
    position: Tuple[float, float, float]
    target: Tuple[float, float, float]
    fov: float = 45.0
    easing: CameraEasing = CameraEasing.LINEAR


@dataclass
class CameraPath:
    """Camera animation path."""
    name: str
    keyframes: List[CameraKeyframe]
    duration: float  # total duration in seconds
    loop: bool = False
    movement_type: CameraMovementType = CameraMovementType.SPLINE


@dataclass
class CameraRig:
    """Camera rig configuration."""
    name: str
    position: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    rotation: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    movement_constraints: Optional[Dict[str, Any]] = None


class CameraSystem:
    """
    Advanced 3D camera system with cinematic controls.
    
    Features:
    - Camera animation and paths
    - Cinematic movement control
    - Camera rig management
    - Advanced interpolation
    - Camera shake and effects
    """
    
    def __init__(self):
        """Initialize the camera system."""
        self.camera_paths: Dict[str, CameraPath] = {}
        self.camera_rigs: Dict[str, CameraRig] = {}
        self.current_camera: Optional[Camera3D] = None
        self.current_path: Optional[str] = None
        self.animation_time: float = 0.0
        self.is_animating: bool = False
        
        # Easing functions
        self.easing_functions = {
            CameraEasing.LINEAR: self._linear_easing,
            CameraEasing.EASE_IN: self._ease_in,
            CameraEasing.EASE_OUT: self._ease_out,
            CameraEasing.EASE_IN_OUT: self._ease_in_out,
            CameraEasing.SMOOTHSTEP: self._smoothstep
        }
        
        logger.info("3D Camera System initialized")
    
    def set_current_camera(self, camera: Camera3D):
        """Set the current active camera."""
        self.current_camera = camera
        logger.info(f"Set current camera: {camera.position}")
    
    def create_camera_path(self, name: str, keyframes: List[CameraKeyframe]) -> bool:
        """Create a new camera path."""
        if name in self.camera_paths:
            logger.error(f"Camera path '{name}' already exists")
            return False
        
        if not keyframes:
            logger.error("No keyframes provided")
            return False
        
        # Calculate total duration
        duration = max(kf.time for kf in keyframes)
        
        path = CameraPath(
            name=name,
            keyframes=sorted(keyframes, key=lambda kf: kf.time),
            duration=duration
        )
        
        self.camera_paths[name] = path
        logger.info(f"Created camera path: {name} (duration: {duration:.2f}s)")
        return True
    
    def start_camera_animation(self, path_name: str):
        """Start camera animation along a path."""
        if path_name not in self.camera_paths:
            logger.error(f"Camera path '{path_name}' not found")
            return False
        
        if not self.current_camera:
            logger.error("No current camera set")
            return False
        
        self.current_path = path_name
        self.animation_time = 0.0
        self.is_animating = True
        
        logger.info(f"Started camera animation: {path_name}")
        return True
    
    def stop_camera_animation(self):
        """Stop current camera animation."""
        self.is_animating = False
        self.current_path = None
        logger.info("Stopped camera animation")
    
    def update_animation(self, delta_time: float):
        """Update camera animation by time delta."""
        if not self.is_animating or not self.current_path:
            return
        
        path = self.camera_paths[self.current_path]
        
        # Update animation time
        self.animation_time += delta_time
        
        # Handle loop
        if path.loop and self.animation_time > path.duration:
            self.animation_time = 0.0
        
        # Calculate current position along path
        if self.animation_time > path.duration:
            self.animation_time = path.duration
            self.is_animating = False
        
        # Interpolate camera position
        self._interpolate_camera_position(path)
    
    def _interpolate_camera_position(self, path: CameraPath):
        """Interpolate camera position along path."""
        if not self.current_camera:
            return
        
        # Find the current keyframe segment
        prev_kf = None
        next_kf = None
        
        for i in range(len(path.keyframes) - 1):
            if path.keyframes[i].time <= self.animation_time <= path.keyframes[i+1].time:
                prev_kf = path.keyframes[i]
                next_kf = path.keyframes[i+1]
                break
        
        if not prev_kf or not next_kf:
            return
        
        # Calculate interpolation factor
        segment_duration = next_kf.time - prev_kf.time
        segment_progress = self.animation_time - prev_kf.time
        t = segment_progress / segment_duration
        
        # Apply easing
        easing_func = self.easing_functions.get(prev_kf.easing, self._linear_easing)
        eased_t = easing_func(t)
        
        # Interpolate position
        pos_x = prev_kf.position[0] + (next_kf.position[0] - prev_kf.position[0]) * eased_t
        pos_y = prev_kf.position[1] + (next_kf.position[1] - prev_kf.position[1]) * eased_t
        pos_z = prev_kf.position[2] + (next_kf.position[2] - prev_kf.position[2]) * eased_t
        
        # Interpolate target
        target_x = prev_kf.target[0] + (next_kf.target[0] - prev_kf.target[0]) * eased_t
        target_y = prev_kf.target[1] + (next_kf.target[1] - prev_kf.target[1]) * eased_t
        target_z = prev_kf.target[2] + (next_kf.target[2] - prev_kf.target[2]) * eased_t
        
        # Interpolate FOV
        fov = prev_kf.fov + (next_kf.fov - prev_kf.fov) * eased_t
        
        # Update camera
        self.current_camera.position = (pos_x, pos_y, pos_z)
        self.current_camera.target = (target_x, target_y, target_z)
        self.current_camera.fov = fov
    
    def create_orbit_path(self, name: str, center: Tuple[float, float, float], 
                         radius: float, duration: float, samples: int = 30) -> bool:
        """Create a circular orbit path around a center point."""
        if name in self.camera_paths:
            logger.error(f"Camera path '{name}' already exists")
            return False
        
        keyframes = []
        
        for i in range(samples):
            # Calculate angle
            angle = (i / samples) * 2 * math.pi
            
            # Calculate position on circle
            pos_x = center[0] + math.sin(angle) * radius
            pos_y = center[1]
            pos_z = center[2] + math.cos(angle) * radius
            
            # Target is the center point
            target = center
            
            time = (i / samples) * duration
            
            keyframe = CameraKeyframe(
                time=time,
                position=(pos_x, pos_y, pos_z),
                target=target,
                fov=45.0,
                easing=CameraEasing.SMOOTHSTEP
            )
            
            keyframes.append(keyframe)
        
        # Add final keyframe to complete the loop
        final_keyframe = CameraKeyframe(
            time=duration,
            position=keyframes[0].position,  # Back to start
            target=center,
            fov=45.0,
            easing=CameraEasing.SMOOTHSTEP
        )
        keyframes.append(final_keyframe)
        
        return self.create_camera_path(name, keyframes)
    
    def create_dolly_path(self, name: str, start_pos: Tuple[float, float, float], 
                         end_pos: Tuple[float, float, float], target: Tuple[float, float, float],
                         duration: float) -> bool:
        """Create a dolly (straight line) camera path."""
        keyframes = [
            CameraKeyframe(
                time=0.0,
                position=start_pos,
                target=target,
                fov=45.0,
                easing=CameraEasing.EASE_IN_OUT
            ),
            CameraKeyframe(
                time=duration,
                position=end_pos,
                target=target,
                fov=45.0,
                easing=CameraEasing.EASE_IN_OUT
            )
        ]
        
        return self.create_camera_path(name, keyframes)
    
    def add_camera_shake(self, intensity: float = 0.1, duration: float = 0.5):
        """Add camera shake effect."""
        if not self.current_camera:
            logger.error("No current camera set")
            return False
        
        # This would be implemented with a shake effect system
        # For now, just log the action
        logger.info(f"Added camera shake: intensity={intensity}, duration={duration}")
        return True
    
    def create_camera_rig(self, name: str, position: Tuple[float, float, float]) -> bool:
        """Create a camera rig."""
        if name in self.camera_rigs:
            logger.error(f"Camera rig '{name}' already exists")
            return False
        
        rig = CameraRig(
            name=name,
            position=position
        )
        
        self.camera_rigs[name] = rig
        logger.info(f"Created camera rig: {name}")
        return True
    
    def attach_camera_to_rig(self, camera_name: str, rig_name: str) -> bool:
        """Attach a camera to a rig."""
        if rig_name not in self.camera_rigs:
            logger.error(f"Camera rig '{rig_name}' not found")
            return False
        
        # In a full implementation, this would update camera position based on rig
        logger.info(f"Attached camera to rig: {camera_name} -> {rig_name}")
        return True
    
    # Easing functions
    def _linear_easing(self, t: float) -> float:
        """Linear easing."""
        return t
    
    def _ease_in(self, t: float) -> float:
        """Ease-in easing."""
        return t * t
    
    def _ease_out(self, t: float) -> float:
        """Ease-out easing."""
        return 1 - (1 - t) * (1 - t)
    
    def _ease_in_out(self, t: float) -> float:
        """Ease-in-out easing."""
        if t < 0.5:
            return 2 * t * t
        return 1 - 2 * (1 - t) * (1 - t)
    
    def _smoothstep(self, t: float) -> float:
        """Smoothstep easing."""
        return t * t * (3 - 2 * t)


def main():
    """Test the camera system."""
    # Create camera system
    camera_system = CameraSystem()
    
    # Create a test camera
    test_camera = Camera3D(
        position=(10, -10, 10),
        target=(0, 0, 0),
        fov=45.0
    )
    camera_system.set_current_camera(test_camera)
    
    # Create a simple camera path
    keyframes = [
        CameraKeyframe(
            time=0.0,
            position=(10, -10, 10),
            target=(0, 0, 0),
            fov=45.0
        ),
        CameraKeyframe(
            time=2.0,
            position=(0, -10, 10),
            target=(0, 0, 0),
            fov=50.0,
            easing=CameraEasing.EASE_IN_OUT
        ),
        CameraKeyframe(
            time=4.0,
            position=(-10, -10, 10),
            target=(0, 0, 0),
            fov=45.0
        )
    ]
    
    camera_system.create_camera_path("test_path", keyframes)
    
    # Start animation
    camera_system.start_camera_animation("test_path")
    
    # Simulate animation updates
    print("Simulating camera animation...")
    for i in range(20):
        camera_system.update_animation(0.2)  # 200ms per frame
        camera = camera_system.current_camera
        if camera:
            print(f"Frame {i+1}: Pos={camera.position[:2]}, FOV={camera.fov:.1f}")
    
    # Test orbit path
    camera_system.create_orbit_path(
        name="orbit_path",
        center=(0, 0, 0),
        radius=15,
        duration=10.0,
        samples=20
    )
    
    print("✓ Created orbit path")
    
    # Test dolly path
    camera_system.create_dolly_path(
        name="dolly_path",
        start_pos=(20, -10, 10),
        end_pos=(5, -10, 10),
        target=(0, 0, 0),
        duration=3.0
    )
    
    print("✓ Created dolly path")


if __name__ == "__main__":
    main()