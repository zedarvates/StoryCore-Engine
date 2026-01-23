#!/usr/bin/env python3
"""
StoryCore-Engine 3D Scene Manager

Advanced scene management system for 3D rendering pipeline.
Handles scene loading, object management, and scene transitions.
"""

import logging
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, field
from enum import Enum
import json
from pathlib import Path

from src.3d.rendering_engine import Scene3D, SceneObject, Camera3D, LightSource, Material

logger = logging.getLogger(__name__)


class SceneTransition(Enum):
    """Types of scene transitions."""
    CUT = "cut"
    FADE = "fade"
    DISSOLVE = "dissolve"
    SLIDE = "slide"
    WIPE = "wipe"


@dataclass
class SceneTransitionSpec:
    """Specification for scene transition."""
    transition_type: SceneTransition
    duration: float = 1.0  # in seconds
    parameters: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SceneSequence:
    """Sequence of scenes with transitions."""
    scenes: List[Scene3D]
    transitions: List[SceneTransitionSpec]
    current_scene_index: int = 0


class SceneManager:
    """
    Advanced scene management system for 3D rendering.
    
    Features:
    - Scene loading and saving
    - Object management and manipulation
    - Scene transitions and sequencing
    - Scene graph management
    - Resource management
    """
    
    def __init__(self):
        """Initialize the scene manager."""
        self.scenes: Dict[str, Scene3D] = {}
        self.current_scene: Optional[Scene3D] = None
        self.scene_sequences: Dict[str, SceneSequence] = {}
        self.resource_cache: Dict[str, Any] = {}
        
        logger.info("3D Scene Manager initialized")
    
    def create_scene(self, scene_name: str) -> Scene3D:
        """Create a new empty scene."""
        if scene_name in self.scenes:
            raise ValueError(f"Scene '{scene_name}' already exists")
        
        scene = Scene3D(name=scene_name)
        self.scenes[scene_name] = scene
        self.current_scene = scene
        
        logger.info(f"Created new scene: {scene_name}")
        return scene
    
    def load_scene(self, scene_name: str) -> bool:
        """Load a scene by name."""
        if scene_name not in self.scenes:
            logger.error(f"Scene '{scene_name}' not found")
            return False
        
        self.current_scene = self.scenes[scene_name]
        logger.info(f"Loaded scene: {scene_name}")
        return True
    
    def save_scene(self, scene: Scene3D, file_path: str) -> bool:
        """Save scene to file."""
        try:
            scene_data = self._scene_to_dict(scene)
            
            with open(file_path, 'w') as f:
                json.dump(scene_data, f, indent=2)
            
            logger.info(f"Saved scene to: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to save scene: {e}")
            return False
    
    def load_scene_from_file(self, file_path: str) -> Optional[Scene3D]:
        """Load scene from file."""
        try:
            with open(file_path, 'r') as f:
                scene_data = json.load(f)
            
            scene = self._dict_to_scene(scene_data)
            self.scenes[scene.name] = scene
            self.current_scene = scene
            
            logger.info(f"Loaded scene from: {file_path}")
            return scene
            
        except Exception as e:
            logger.error(f"Failed to load scene: {e}")
            return None
    
    def add_object_to_scene(self, scene_name: str, obj: SceneObject) -> bool:
        """Add an object to a specific scene."""
        if scene_name not in self.scenes:
            logger.error(f"Scene '{scene_name}' not found")
            return False
        
        self.scenes[scene_name].objects.append(obj)
        logger.debug(f"Added object '{obj.name}' to scene '{scene_name}'")
        return True
    
    def remove_object_from_scene(self, scene_name: str, object_name: str) -> bool:
        """Remove an object from a scene."""
        if scene_name not in self.scenes:
            logger.error(f"Scene '{scene_name}' not found")
            return False
        
        scene = self.scenes[scene_name]
        for i, obj in enumerate(scene.objects):
            if obj.name == object_name:
                del scene.objects[i]
                logger.debug(f"Removed object '{object_name}' from scene '{scene_name}'")
                return True
        
        logger.error(f"Object '{object_name}' not found in scene '{scene_name}'")
        return False
    
    def create_scene_sequence(self, sequence_name: str, scene_names: List[str]) -> bool:
        """Create a sequence of scenes."""
        if sequence_name in self.scene_sequences:
            logger.error(f"Sequence '{sequence_name}' already exists")
            return False
        
        # Validate all scenes exist
        for scene_name in scene_names:
            if scene_name not in self.scenes:
                logger.error(f"Scene '{scene_name}' not found")
                return False
        
        # Create sequence with default transitions
        scenes = [self.scenes[name] for name in scene_names]
        transitions = [SceneTransitionSpec(SceneTransition.CUT) for _ in range(len(scene_names) - 1)]
        
        sequence = SceneSequence(scenes=scenes, transitions=transitions)
        self.scene_sequences[sequence_name] = sequence
        
        logger.info(f"Created scene sequence: {sequence_name}")
        return True
    
    def play_scene_sequence(self, sequence_name: str) -> bool:
        """Play a scene sequence."""
        if sequence_name not in self.scene_sequences:
            logger.error(f"Sequence '{sequence_name}' not found")
            return False
        
        sequence = self.scene_sequences[sequence_name]
        
        if not sequence.scenes:
            logger.error("No scenes in sequence")
            return False
        
        # Start with first scene
        sequence.current_scene_index = 0
        self.current_scene = sequence.scenes[0]
        
        logger.info(f"Playing scene sequence: {sequence_name}")
        return True
    
    def next_scene_in_sequence(self, sequence_name: str) -> bool:
        """Advance to next scene in sequence."""
        if sequence_name not in self.scene_sequences:
            logger.error(f"Sequence '{sequence_name}' not found")
            return False
        
        sequence = self.scene_sequences[sequence_name]
        
        if sequence.current_scene_index >= len(sequence.scenes) - 1:
            logger.info("Already at last scene in sequence")
            return False
        
        # Apply transition
        transition = sequence.transitions[sequence.current_scene_index]
        logger.debug(f"Applying transition: {transition.transition_type.value}")
        
        # Move to next scene
        sequence.current_scene_index += 1
        self.current_scene = sequence.scenes[sequence.current_scene_index]
        
        logger.info(f"Advanced to scene {sequence.current_scene_index}: {self.current_scene.name}")
        return True
    
    def get_current_scene(self) -> Optional[Scene3D]:
        """Get the currently active scene."""
        return self.current_scene
    
    def list_scenes(self) -> List[str]:
        """List all available scenes."""
        return list(self.scenes.keys())
    
    def list_scene_sequences(self) -> List[str]:
        """List all available scene sequences."""
        return list(self.scene_sequences.keys())
    
    def _scene_to_dict(self, scene: Scene3D) -> Dict[str, Any]:
        """Convert scene to dictionary for serialization."""
        return {
            "name": scene.name,
            "objects": [self._object_to_dict(obj) for obj in scene.objects],
            "camera": self._camera_to_dict(scene.camera),
            "lights": [self._light_to_dict(light) for light in scene.lights],
            "background_color": list(scene.background_color),
            "ambient_light": list(scene.ambient_light),
            "fog_color": list(scene.fog_color) if scene.fog_color else None,
            "fog_density": scene.fog_density
        }
    
    def _dict_to_scene(self, data: Dict[str, Any]) -> Scene3D:
        """Convert dictionary to scene."""
        scene = Scene3D(
            name=data["name"],
            objects=[self._dict_to_object(obj_data) for obj_data in data["objects"]],
            camera=self._dict_to_camera(data["camera"]),
            lights=[self._dict_to_light(light_data) for light_data in data["lights"]],
            background_color=tuple(data["background_color"]),
            ambient_light=tuple(data["ambient_light"]),
            fog_color=tuple(data["fog_color"]) if data["fog_color"] else None,
            fog_density=data["fog_density"]
        )
        return scene
    
    def _object_to_dict(self, obj: SceneObject) -> Dict[str, Any]:
        """Convert scene object to dictionary."""
        return {
            "name": obj.name,
            "model_path": obj.model_path,
            "position": list(obj.position),
            "rotation": list(obj.rotation),
            "scale": list(obj.scale),
            "material": self._material_to_dict(obj.material),
            "visible": obj.visible,
            "cast_shadow": obj.cast_shadow,
            "receive_shadow": obj.receive_shadow
        }
    
    def _dict_to_object(self, data: Dict[str, Any]) -> SceneObject:
        """Convert dictionary to scene object."""
        return SceneObject(
            name=data["name"],
            model_path=data["model_path"],
            position=tuple(data["position"]),
            rotation=tuple(data["rotation"]),
            scale=tuple(data["scale"]),
            material=self._dict_to_material(data["material"]),
            visible=data["visible"],
            cast_shadow=data["cast_shadow"],
            receive_shadow=data["receive_shadow"]
        )
    
    def _camera_to_dict(self, camera: Camera3D) -> Dict[str, Any]:
        """Convert camera to dictionary."""
        return {
            "position": list(camera.position),
            "target": list(camera.target),
            "up_vector": list(camera.up_vector),
            "fov": camera.fov,
            "near_clip": camera.near_clip,
            "far_clip": camera.far_clip,
            "aspect_ratio": camera.aspect_ratio
        }
    
    def _dict_to_camera(self, data: Dict[str, Any]) -> Camera3D:
        """Convert dictionary to camera."""
        return Camera3D(
            position=tuple(data["position"]),
            target=tuple(data["target"]),
            up_vector=tuple(data["up_vector"]),
            fov=data["fov"],
            near_clip=data["near_clip"],
            far_clip=data["far_clip"],
            aspect_ratio=data["aspect_ratio"]
        )
    
    def _light_to_dict(self, light: LightSource) -> Dict[str, Any]:
        """Convert light source to dictionary."""
        return {
            "light_type": light.light_type.value,
            "position": list(light.position),
            "direction": list(light.direction),
            "color": list(light.color),
            "intensity": light.intensity,
            "range": light.range,
            "angle": light.angle
        }
    
    def _dict_to_light(self, data: Dict[str, Any]) -> LightSource:
        """Convert dictionary to light source."""
        return LightSource(
            light_type=LightType(data["light_type"]),
            position=tuple(data["position"]),
            direction=tuple(data["direction"]),
            color=tuple(data["color"]),
            intensity=data["intensity"],
            range=data["range"],
            angle=data["angle"]
        )
    
    def _material_to_dict(self, material: Material) -> Dict[str, Any]:
        """Convert material to dictionary."""
        return {
            "name": material.name,
            "diffuse_color": list(material.diffuse_color),
            "specular_color": list(material.specular_color),
            "shininess": material.shininess,
            "ambient_color": list(material.ambient_color),
            "texture_path": material.texture_path,
            "normal_map_path": material.normal_map_path
        }
    
    def _dict_to_material(self, data: Dict[str, Any]) -> Material:
        """Convert dictionary to material."""
        return Material(
            name=data["name"],
            diffuse_color=tuple(data["diffuse_color"]),
            specular_color=tuple(data["specular_color"]),
            shininess=data["shininess"],
            ambient_color=tuple(data["ambient_color"]),
            texture_path=data["texture_path"],
            normal_map_path=data["normal_map_path"]
        )


def main():
    """Test the scene manager."""
    # Create scene manager
    manager = SceneManager()
    
    # Create a test scene
    scene = manager.create_scene("test_scene")
    
    # Add some objects
    manager.add_object_to_scene("test_scene", SceneObject(
        name="test_object_1",
        model_path="models/test.egg",
        position=(0, 0, 0),
        material=Material(diffuse_color=(1.0, 0.0, 0.0))
    ))
    
    manager.add_object_to_scene("test_scene", SceneObject(
        name="test_object_2",
        model_path="models/test2.egg",
        position=(2, 0, 0),
        material=Material(diffuse_color=(0.0, 1.0, 0.0))
    ))
    
    # Save scene
    manager.save_scene(scene, "test_scene.json")
    
    # Load scene back
    loaded_scene = manager.load_scene_from_file("test_scene.json")
    
    if loaded_scene:
        print(f"✓ Successfully loaded scene: {loaded_scene.name}")
        print(f"  Objects: {len(loaded_scene.objects)}")
        print(f"  Camera position: {loaded_scene.camera.position}")
    else:
        print("✗ Failed to load scene")
    
    # Test scene sequence
    manager.create_scene("scene_2")
    manager.create_scene_sequence("test_sequence", ["test_scene", "scene_2"])
    
    print(f"✓ Created scene sequence with {len(manager.list_scene_sequences())} sequences")


if __name__ == "__main__":
    main()