#!/usr/bin/env python3
"""
StoryCore-Engine 3D Module

Main 3D module providing access to all 3D functionality.
"""

from .rendering_engine import (
    RenderingEngine, Scene3D, SceneObject, Camera3D, 
    LightSource, Material, RenderMode, LightType
)
from .scene_manager import SceneManager, SceneSequence, SceneTransitionSpec, SceneTransition
from .camera_system import CameraSystem, CameraPath, CameraKeyframe, CameraRig, CameraMovementType, CameraEasing

__all__ = [
    # Rendering Engine
    'RenderingEngine', 'Scene3D', 'SceneObject', 'Camera3D',
    'LightSource', 'Material', 'RenderMode', 'LightType',
    
    # Scene Manager
    'SceneManager', 'SceneSequence', 'SceneTransitionSpec', 'SceneTransition',
    
    # Camera System
    'CameraSystem', 'CameraPath', 'CameraKeyframe', 'CameraRig',
    'CameraMovementType', 'CameraEasing'
]


def init_3d_system():
    """Initialize the 3D system with default components."""
    # Create rendering engine
    rendering_engine = RenderingEngine()
    
    # Create scene manager
    scene_manager = SceneManager()
    
    # Create camera system
    camera_system = CameraSystem()
    
    return {
        'rendering_engine': rendering_engine,
        'scene_manager': scene_manager,
        'camera_system': camera_system
    }