#!/usr/bin/env python3
"""
StoryCore-Engine 3D Module

Main 3D module providing access to all 3D functionality.
Supports 3D object placement, scene composition, and rendering.
"""

from .rendering_engine import (
    RenderingEngine, Scene3D, SceneObject, Camera3D, 
    LightSource, Material, RenderMode, LightType
)
from .scene_manager import SceneManager, SceneSequence, SceneTransitionSpec, SceneTransition
from .camera_system import CameraSystem, CameraPath, CameraKeyframe, CameraRig, CameraMovementType, CameraEasing
from .object_manager import ObjectLibrary, Object3DMetadata, Object3DPlacement
from .composition_engine import (
    CompositionEngine, SceneComposition, ObjectPlacement3D, CompositionResult
)

__all__ = [
    # Rendering Engine
    'RenderingEngine', 'Scene3D', 'SceneObject', 'Camera3D',
    'LightSource', 'Material', 'RenderMode', 'LightType',
    
    # Scene Manager
    'SceneManager', 'SceneSequence', 'SceneTransitionSpec', 'SceneTransition',
    
    # Camera System
    'CameraSystem', 'CameraPath', 'CameraKeyframe', 'CameraRig',
    'CameraMovementType', 'CameraEasing',
    
    # Object Management
    'ObjectLibrary', 'Object3DMetadata', 'Object3DPlacement',
    
    # Composition Engine
    'CompositionEngine', 'SceneComposition', 'ObjectPlacement3D', 'CompositionResult'
]


def init_3d_system():
    """Initialize the 3D system with default components."""
    # Create rendering engine
    rendering_engine = RenderingEngine()
    
    # Create scene manager
    scene_manager = SceneManager()
    
    # Create camera system
    camera_system = CameraSystem()
    
    # Create object library
    object_library = ObjectLibrary()
    
    # Create composition engine
    composition_engine = CompositionEngine()
    
    return {
        'rendering_engine': rendering_engine,
        'scene_manager': scene_manager,
        'camera_system': camera_system,
        'object_library': object_library,
        'composition_engine': composition_engine
    }


# Convenience functions for common operations
def create_object_placement(
    object_id: str,
    object_name: str,
    position: tuple = (0.0, 0.0, 0.0),
    rotation: tuple = (0.0, 0.0, 0.0),
    scale: tuple = (1.0, 1.0, 1.0)
) -> Object3DPlacement:
    """Create a new 3D object placement.
    
    Args:
        object_id: Unique identifier for the object
        object_name: Display name for the object
        position: (x, y, z) position in world space
        rotation: (x, y, z) rotation in degrees
        scale: (x, y, z) scale factors
        
    Returns:
        Object3DPlacement ready for composition
    """
    return Object3DPlacement(
        placement_id="",  # Will be generated
        object_id=object_id,
        object_name=object_name,
        position=position,
        rotation=rotation,
        scale=scale
    )


def calculate_screen_position_from_3d(
    world_position: tuple,
    camera_position: tuple,
    camera_target: tuple,
    camera_fov: float = 45.0,
    screen_size: tuple = (1920, 1080)
) -> tuple:
    """Calculate 2D screen position from 3D world position.
    
    Args:
        world_position: (x, y, z) position in world space
        camera_position: (x, y, z) camera position
        camera_target: (x, y, z) camera look-at target
        camera_fov: Field of view in degrees
        screen_size: (width, height) screen dimensions
        
    Returns:
        (x, y) screen position in pixels
    """
    engine = CompositionEngine()
    composition = SceneComposition(
        composition_id="temp",
        name="Temp",
        camera_position=camera_position,
        camera_target=camera_target,
        camera_fov=camera_fov,
        resolution=screen_size
    )
    
    placement = ObjectPlacement3D(
        placement_id="temp",
        object_id="temp",
        object_name="Temp",
        position=world_position
    )
    
    return engine.calculate_screen_position(composition, placement, screen_size[0], screen_size[1])
