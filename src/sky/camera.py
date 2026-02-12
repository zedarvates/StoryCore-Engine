#!/usr/bin/env python3
"""
Camera Module

3D camera positioning and projection for keyframe rendering.
"""

import numpy as np
from dataclasses import dataclass
from typing import Tuple, Optional
from enum import Enum
import math


class CameraProjection(Enum):
    """Camera projection types."""
    PERSPECTIVE = "perspective"
    ORTHOGRAPHIC = "orthographic"
    FISHEYE = "fisheye"
    PANORAMIC = "panoramic"


@dataclass
class Camera:
    """
    3D Camera for scene rendering.
    
    Supports multiple projection types and provides
    view/projection matrices for rendering.
    """
    
    # Position and orientation
    position: Tuple[float, float, float] = (0.0, 1.6, 0.0)  # x, y, z (eye level)
    look_at: Tuple[float, float, float] = (0.0, 1.6, 1.0)   # Point to look at
    up_vector: Tuple[float, float, float] = (0.0, 1.0, 0.0)   # Up direction
    
    # Projection parameters
    fov: float = 60.0                    # Field of view (degrees)
    near_clip: float = 0.1               # Near clipping plane
    far_clip: float = 1000.0             # Far clipping plane
    projection: CameraProjection = CameraProjection.PERSPECTIVE
    
    # Aspect ratio (calculated from resolution)
    aspect_ratio: float = 16.0 / 9.0
    
    def __post_init__(self):
        """Calculate derived values."""
        self._view_matrix: Optional[np.ndarray] = None
        self._projection_matrix: Optional[np.ndarray] = None
        self._update_matrices()
    
    def _update_matrices(self) -> None:
        """Update view and projection matrices."""
        self._view_matrix = self._calculate_view_matrix()
        self._projection_matrix = self._calculate_projection_matrix()
    
    def _calculate_view_matrix(self) -> np.ndarray:
        """Calculate view matrix (world to camera space)."""
        pos = np.array(self.position)
        target = np.array(self.look_at)
        up = np.array(self.up_vector)
        
        # Forward vector (camera looks at target)
        forward = target - pos
        forward = forward / np.linalg.norm(forward)
        
        # Right vector
        right = np.cross(forward, up)
        right = right / np.linalg.norm(right)
        
        # Recompute up vector
        up = np.cross(right, forward)
        
        # View matrix
        view = np.eye(4)
        view[0, :3] = right
        view[1, :3] = up
        view[2, :3] = -forward  # OpenGL convention: -Z is forward
        
        view[0, 3] = -np.dot(right, pos)
        view[1, 3] = -np.dot(up, pos)
        view[2, 3] = np.dot(forward, pos)
        
        return view
    
    def _calculate_projection_matrix(self) -> np.ndarray:
        """Calculate projection matrix (camera to clip space)."""
        if self.projection == CameraProjection.PERSPECTIVE:
            return self._calculate_perspective_matrix()
        elif self.projection == CameraProjection.ORTHOGRAPHIC:
            return self._calculate_orthographic_matrix()
        else:
            # Default to perspective
            return self._calculate_perspective_matrix()
    
    def _calculate_perspective_matrix(self) -> np.ndarray:
        """Calculate perspective projection matrix."""
        fov_rad = math.radians(self.fov)
        f = 1.0 / math.tan(fov_rad / 2.0)
        
        proj = np.zeros((4, 4))
        proj[0, 0] = f / self.aspect_ratio
        proj[1, 1] = f
        proj[2, 2] = (self.far_clip + self.near_clip) / (self.near_clip - self.far_clip)
        proj[2, 3] = (2.0 * self.far_clip * self.near_clip) / (self.near_clip - self.far_clip)
        proj[3, 2] = -1.0
        
        return proj
    
    def _calculate_orthographic_matrix(self) -> np.ndarray:
        """Calculate orthographic projection matrix."""
        # Orthographic projection (no perspective)
        ortho_size = 10.0  # World units visible
        
        left = -ortho_size * self.aspect_ratio
        right = ortho_size * self.aspect_ratio
        bottom = -ortho_size
        top = ortho_size
        
        proj = np.eye(4)
        proj[0, 0] = 2.0 / (right - left)
        proj[1, 1] = 2.0 / (top - bottom)
        proj[2, 2] = -2.0 / (self.far_clip - self.near_clip)
        proj[0, 3] = -(right + left) / (right - left)
        proj[1, 3] = -(top + bottom) / (top - bottom)
        proj[2, 3] = -(self.far_clip + self.near_clip) / (self.far_clip - self.near_clip)
        
        return proj
    
    def get_view_matrix(self) -> np.ndarray:
        """Get view matrix."""
        return self._view_matrix
    
    def get_projection_matrix(self) -> np.ndarray:
        """Get projection matrix."""
        return self._projection_matrix
    
    def get_view_projection_matrix(self) -> np.ndarray:
        """Get combined view-projection matrix."""
        return self._projection_matrix @ self._view_matrix
    
    def move_to(self, position: Tuple[float, float, float]) -> None:
        """Move camera to new position."""
        self.position = position
        self._update_matrices()
    
    def look_at_point(self, target: Tuple[float, float, float]) -> None:
        """Set look-at point."""
        self.look_at = target
        self._update_matrices()
    
    def set_rotation(self, yaw: float, pitch: float, roll: float = 0.0) -> None:
        """
        Set camera rotation using Euler angles.
        
        Args:
            yaw: Horizontal rotation (degrees, 0 = forward)
            pitch: Vertical rotation (degrees, 0 = level)
            roll: Roll rotation (degrees, 0 = upright)
        """
        # Convert to radians
        yaw_rad = math.radians(yaw)
        pitch_rad = math.radians(pitch)
        
        # Calculate forward vector
        forward = np.array([
            math.sin(yaw_rad) * math.cos(pitch_rad),
            math.sin(pitch_rad),
            math.cos(yaw_rad) * math.cos(pitch_rad)
        ])
        
        # Update look-at point
        pos = np.array(self.position)
        self.look_at = tuple(pos + forward * 10.0)  # Look 10 units ahead
        
        # Apply roll to up vector
        if roll != 0.0:
            roll_rad = math.radians(roll)
            right = np.cross(forward, np.array([0, 1, 0]))
            right = right / np.linalg.norm(right)
            up = np.cross(right, forward)
            
            # Rotate up vector by roll
            cos_r = math.cos(roll_rad)
            sin_r = math.sin(roll_rad)
            self.up_vector = tuple(up * cos_r + right * sin_r)
        else:
            self.up_vector = (0.0, 1.0, 0.0)
        
        self._update_matrices()
    
    def get_direction_vector(self) -> Tuple[float, float, float]:
        """Get camera direction vector."""
        pos = np.array(self.position)
        target = np.array(self.look_at)
        direction = target - pos
        direction = direction / np.linalg.norm(direction)
        return tuple(direction)
    
    def get_right_vector(self) -> Tuple[float, float, float]:
        """Get camera right vector."""
        forward = np.array(self.get_direction_vector())
        up = np.array(self.up_vector)
        right = np.cross(forward, up)
        right = right / np.linalg.norm(right)
        return tuple(right)
    
    def world_to_screen(self, world_pos: Tuple[float, float, float]) -> Optional[Tuple[float, float, float]]:
        """
        Project world position to screen coordinates.
        
        Args:
            world_pos: World position (x, y, z)
            
        Returns:
            Screen coordinates (x, y, depth) or None if behind camera
        """
        world = np.array([*world_pos, 1.0])
        
        # Transform to clip space
        vp = self.get_view_projection_matrix()
        clip = vp @ world
        
        # Check if behind camera
        if clip[3] <= 0:
            return None
        
        # Perspective divide
        ndc = clip[:3] / clip[3]
        
        # Convert to screen coordinates (0-1 range)
        screen_x = (ndc[0] + 1.0) / 2.0
        screen_y = (1.0 - ndc[1]) / 2.0  # Flip Y for image coordinates
        depth = ndc[2]
        
        return (screen_x, screen_y, depth)
    
    def screen_to_world_ray(self, screen_x: float, screen_y: float) -> Tuple[Tuple[float, float, float], Tuple[float, float, float]]:
        """
        Convert screen coordinates to world ray.
        
        Args:
            screen_x: Screen X (0-1)
            screen_y: Screen Y (0-1)
            
        Returns:
            Tuple of (ray_origin, ray_direction)
        """
        # Convert to NDC
        ndc_x = screen_x * 2.0 - 1.0
        ndc_y = (1.0 - screen_y) * 2.0 - 1.0
        
        # Create ray in clip space
        ray_clip = np.array([ndc_x, ndc_y, -1.0, 1.0])
        
        # Transform to view space
        inv_proj = np.linalg.inv(self._projection_matrix)
        ray_view = inv_proj @ ray_clip
        ray_view = np.array([ray_view[0], ray_view[1], -1.0, 0.0])
        
        # Transform to world space
        inv_view = np.linalg.inv(self._view_matrix)
        ray_world = inv_view @ ray_view
        ray_dir = ray_world[:3]
        ray_dir = ray_dir / np.linalg.norm(ray_dir)
        
        return (self.position, tuple(ray_dir))
    
    def copy(self) -> "Camera":
        """Create a copy of this camera."""
        return Camera(
            position=self.position,
            look_at=self.look_at,
            up_vector=self.up_vector,
            fov=self.fov,
            near_clip=self.near_clip,
            far_clip=self.far_clip,
            projection=self.projection,
            aspect_ratio=self.aspect_ratio
        )


# Convenience functions
def create_default_camera() -> Camera:
    """Create default camera at eye level looking forward."""
    return Camera(
        position=(0.0, 1.6, 0.0),
        look_at=(0.0, 1.6, 10.0),
        fov=60.0
    )


def create_overhead_camera(height: float = 50.0) -> Camera:
    """Create overhead camera looking down."""
    return Camera(
        position=(0.0, height, 0.0),
        look_at=(0.0, 0.0, 0.0),
        up_vector=(0.0, 0.0, -1.0),
        fov=45.0
    )


def create_orbit_camera(distance: float = 10.0, height: float = 5.0, angle: float = 0.0) -> Camera:
    """
    Create camera in orbit around origin.
    
    Args:
        distance: Horizontal distance from origin
        height: Height above ground
        angle: Orbit angle in degrees (0 = front, 90 = right, etc.)
    """
    angle_rad = math.radians(angle)
    x = distance * math.sin(angle_rad)
    z = distance * math.cos(angle_rad)
    
    return Camera(
        position=(x, height, z),
        look_at=(0.0, 1.0, 0.0),
        fov=60.0
    )


# Example usage
if __name__ == "__main__":
    # Test default camera
    cam = create_default_camera()
    print(f"Camera position: {cam.position}")
    print(f"Looking at: {cam.look_at}")
    print(f"Direction: {cam.get_direction_vector()}")
    
    # Test world to screen projection
    world_point = (0.0, 1.6, 10.0)  # Point in front of camera
    screen = cam.world_to_screen(world_point)
    print(f"World {world_point} -> Screen {screen}")
    
    # Test orbit camera
    orbit = create_orbit_camera(distance=20.0, height=10.0, angle=45.0)
    print(f"Orbit camera position: {orbit.position}")
