#!/usr/bin/env python3
"""
StoryCore-Engine 3D Rendering Engine

Advanced 3D rendering system using Panda3D and PyOpenGL for cinematic visualizations.
Supports scene management, camera control, and real-time rendering.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
import numpy as np

# Try to import 3D libraries
try:
    from panda3d.core import *
    from direct.showbase.ShowBase import ShowBase
    from direct.task import Task
    PANDA3D_AVAILABLE = True
except ImportError:
    PANDA3D_AVAILABLE = False
    logging.warning("Panda3D not available - 3D rendering will be limited")

try:
    from OpenGL.GL import *
    from OpenGL.GLU import *
    from OpenGL.GLUT import *
    PYOPENGL_AVAILABLE = True
except ImportError:
    PYOPENGL_AVAILABLE = False
    logging.warning("PyOpenGL not available - using Panda3D only")

logger = logging.getLogger(__name__)


class RenderMode(Enum):
    """Available rendering modes."""
    REALTIME = "realtime"
    OFFLINE = "offline"
    PREVIEW = "preview"
    WIREFRAME = "wireframe"


class LightType(Enum):
    """Types of lights supported."""
    DIRECTIONAL = "directional"
    POINT = "point"
    SPOT = "spot"
    AMBIENT = "ambient"


@dataclass
class LightSource:
    """3D light source configuration."""
    light_type: LightType
    position: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    direction: Tuple[float, float, float] = (0.0, 0.0, -1.0)
    color: Tuple[float, float, float] = (1.0, 1.0, 1.0)
    intensity: float = 1.0
    range: float = 100.0
    angle: float = 45.0  # For spot lights


@dataclass
class Camera3D:
    """3D camera configuration."""
    position: Tuple[float, float, float] = (0.0, 0.0, 10.0)
    target: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    up_vector: Tuple[float, float, float] = (0.0, 1.0, 0.0)
    fov: float = 45.0  # Field of view in degrees
    near_clip: float = 0.1
    far_clip: float = 1000.0
    aspect_ratio: float = 16.0 / 9.0


@dataclass
class Material:
    """Material properties for 3D objects."""
    name: str = "default"
    diffuse_color: Tuple[float, float, float] = (0.8, 0.8, 0.8)
    specular_color: Tuple[float, float, float] = (1.0, 1.0, 1.0)
    shininess: float = 32.0
    ambient_color: Tuple[float, float, float] = (0.2, 0.2, 0.2)
    texture_path: Optional[str] = None
    normal_map_path: Optional[str] = None


@dataclass
class SceneObject:
    """Represents a 3D object in the scene."""
    name: str
    model_path: str
    position: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    rotation: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    scale: Tuple[float, float, float] = (1.0, 1.0, 1.0)
    material: Material = Material()
    visible: bool = True
    cast_shadow: bool = True
    receive_shadow: bool = True


@dataclass
class Scene3D:
    """Complete 3D scene configuration."""
    name: str = "default_scene"
    objects: List[SceneObject] = None
    camera: Camera3D = None
    lights: List[LightSource] = None
    background_color: Tuple[float, float, float] = (0.1, 0.1, 0.1)
    ambient_light: Tuple[float, float, float] = (0.2, 0.2, 0.2)
    fog_color: Optional[Tuple[float, float, float]] = None
    fog_density: float = 0.0

    def __post_init__(self):
        if self.objects is None:
            self.objects = []
        if self.camera is None:
            self.camera = Camera3D()
        if self.lights is None:
            self.lights = []


class RenderingEngine:
    """
    Advanced 3D rendering engine supporting multiple backends.
    
    Features:
    - Panda3D and PyOpenGL rendering backends
    - Scene management and object manipulation
    - Camera control and animation
    - Lighting and material systems
    - Real-time and offline rendering modes
    """
    
    def __init__(self, render_mode: RenderMode = RenderMode.REALTIME):
        """Initialize the rendering engine."""
        self.render_mode = render_mode
        self.current_scene = Scene3D()
        self.panda_app = None
        self.opengl_initialized = False
        
        if PANDA3D_AVAILABLE:
            self._initialize_panda3d()
        
        logger.info(f"3D Rendering Engine initialized in {render_mode.value} mode")
        logger.info(f"  Panda3D available: {PANDA3D_AVAILABLE}")
        logger.info(f"  PyOpenGL available: {PYOPENGL_AVAILABLE}")
    
    def _initialize_panda3d(self):
        """Initialize Panda3D rendering system."""
        if not PANDA3D_AVAILABLE:
            return
            
        # Create Panda3D application
        class PandaApp(ShowBase):
            def __init__(self, engine):
                ShowBase.__init__(self)
                self.engine = engine
                self.disableMouse()  # Disable default mouse control
                
                # Set up basic scene
                self.setBackgroundColor(*self.engine.current_scene.background_color)
                
                # Set up camera
                self._setup_camera()
                
                # Set up lighting
                self._setup_lights()
                
                # Load scene objects
                self._load_scene_objects()
                
                # Set up task for updates
                self.taskMgr.add(self._update_task, "update_task")
            
            def _setup_camera(self):
                """Configure camera based on scene settings."""
                camera = self.engine.current_scene.camera
                
                # Position camera
                self.camera.setPos(*camera.position)
                self.camera.lookAt(*camera.target)
                
                # Set lens properties
                lens = PerspectiveLens()
                lens.setFov(camera.fov)
                lens.setNearFar(camera.near_clip, camera.far_clip)
                self.camLens = lens
                
                logger.info(f"Panda3D camera configured: FOV={camera.fov}, Position={camera.position}")
            
            def _setup_lights(self):
                """Configure lights based on scene settings."""
                # Clear existing lights
                for light in self.render.getLights():
                    self.render.clearLight(light)
                
                # Add ambient light
                ambient = AmbientLight('ambient')
                ambient.setColor(*self.engine.current_scene.ambient_light)
                self.render.setLight(self.render.attachNewNode(ambient))
                
                # Add scene lights
                for i, light_source in enumerate(self.engine.current_scene.lights):
                    if light_source.light_type == LightType.DIRECTIONAL:
                        light = DirectionalLight(f'directional_{i}')
                        light.setColor(*light_source.color)
                        light.setDirection(*light_source.direction)
                        light_node = self.render.attachNewNode(light)
                        self.render.setLight(light_node)
                        
                    elif light_source.light_type == LightType.POINT:
                        light = PointLight(f'point_{i}')
                        light.setColor(*light_source.color)
                        light.setAttenuation((0, 0, 0.1))
                        light_node = self.render.attachNewNode(light)
                        light_node.setPos(*light_source.position)
                        self.render.setLight(light_node)
                        
                    elif light_source.light_type == LightType.SPOT:
                        light = Spotlight(f'spot_{i}')
                        light.setColor(*light_source.color)
                        light.setAttenuation((0, 0, 0.1))
                        light.setExponent(light_source.angle)
                        light_node = self.render.attachNewNode(light)
                        light_node.setPos(*light_source.position)
                        light_node.lookAt(*light_source.direction)
                        self.render.setLight(light_node)
                
                logger.info(f"Configured {len(self.engine.current_scene.lights)} lights")
            
            def _load_scene_objects(self):
                """Load 3D models into the scene."""
                for obj in self.engine.current_scene.objects:
                    if not obj.visible:
                        continue
                        
                    try:
                        # Load model
                        model = self.loader.loadModel(obj.model_path)
                        if not model:
                            logger.warning(f"Failed to load model: {obj.model_path}")
                            continue
                            
                        # Position and transform
                        model.setPos(*obj.position)
                        model.setHpr(*obj.rotation)
                        model.setScale(*obj.scale)
                        
                        # Apply material
                        if obj.material.texture_path:
                            texture = self.loader.loadTexture(obj.material.texture_path)
                            model.setTexture(texture, 1)
                        
                        # Add to scene
                        model.reparentTo(self.render)
                        
                        logger.debug(f"Loaded object: {obj.name} at {obj.position}")
                        
                    except Exception as e:
                        logger.error(f"Failed to load object {obj.name}: {e}")
            
            def _update_task(self, task):
                """Update task for real-time rendering."""
                # Update camera if needed
                # Update object positions if animated
                return Task.cont
        
        # Create and store the Panda3D application
        self.panda_app = PandaApp(self)
    
    def load_scene(self, scene: Scene3D):
        """Load a new scene into the rendering engine."""
        self.current_scene = scene
        
        if self.panda_app:
            # Reconfigure camera
            self.panda_app._setup_camera()
            
            # Reconfigure lights
            self.panda_app._setup_lights()
            
            # Reload objects
            self.panda_app._load_scene_objects()
        
        logger.info(f"Loaded scene: {scene.name}")
        return True
    
    def add_object(self, obj: SceneObject):
        """Add an object to the current scene."""
        self.current_scene.objects.append(obj)
        
        if self.panda_app:
            try:
                # Load the object in Panda3D
                model = self.panda_app.loader.loadModel(obj.model_path)
                if model:
                    model.setPos(*obj.position)
                    model.setHpr(*obj.rotation)
                    model.setScale(*obj.scale)
                    model.reparentTo(self.panda_app.render)
                    
                    logger.debug(f"Added object: {obj.name}")
                    return True
            except Exception as e:
                logger.error(f"Failed to add object {obj.name}: {e}")
                return False
        
        return True
    
    def set_camera_position(self, position: Tuple[float, float, float]):
        """Set camera position."""
        self.current_scene.camera.position = position
        
        if self.panda_app:
            self.panda_app.camera.setPos(*position)
            self.panda_app.camera.lookAt(*self.current_scene.camera.target)
    
    def set_camera_target(self, target: Tuple[float, float, float]):
        """Set camera target (look-at point)."""
        self.current_scene.camera.target = target
        
        if self.panda_app:
            self.panda_app.camera.lookAt(*target)
    
    def add_light(self, light: LightSource):
        """Add a light source to the scene."""
        self.current_scene.lights.append(light)
        
        if self.panda_app:
            self.panda_app._setup_lights()
    
    def render_frame(self) -> Optional[np.ndarray]:
        """Render a single frame and return as numpy array."""
        if not PANDA3D_AVAILABLE:
            logger.warning("Cannot render frame - Panda3D not available")
            return None
            
        if not self.panda_app:
            self._initialize_panda3d()
            
        try:
            # Force render
            self.panda_app.graphicsEngine.renderFrame()
            
            # Get frame buffer
            buffer = self.panda_app.win.getScreenshot()
            
            # Convert to numpy array
            frame = np.frombuffer(buffer.getRamImage(), dtype=np.uint8)
            width, height = buffer.getXSize(), buffer.getYSize()
            frame = frame.reshape((height, width, 4))  # RGBA format
            
            return frame[:, :, :3]  # Return RGB only
            
        except Exception as e:
            logger.error(f"Failed to render frame: {e}")
            return None
    
    def start_realtime_rendering(self):
        """Start real-time rendering loop."""
        if not PANDA3D_AVAILABLE:
            logger.warning("Cannot start real-time rendering - Panda3D not available")
            return False
            
        if not self.panda_app:
            self._initialize_panda3d()
            
        try:
            self.panda_app.run()
            return True
        except Exception as e:
            logger.error(f"Failed to start real-time rendering: {e}")
            return False
    
    def set_render_mode(self, mode: RenderMode):
        """Set the rendering mode."""
        self.render_mode = mode
        
        if self.panda_app:
            if mode == RenderMode.WIREFRAME:
                self.panda_app.render.setRenderModeWireframe()
            else:
                self.panda_app.render.setRenderModeFilled()
    
    def cleanup(self):
        """Clean up resources."""
        if self.panda_app:
            try:
                self.panda_app.userExit()
            except:
                pass
            self.panda_app = None


def create_default_scene() -> Scene3D:
    """Create a default test scene."""
    scene = Scene3D(name="default_test_scene")
    
    # Add camera
    scene.camera = Camera3D(
        position=(10, -10, 10),
        target=(0, 0, 0),
        fov=45.0
    )
    
    # Add lights
    scene.lights = [
        LightSource(
            light_type=LightType.DIRECTIONAL,
            direction=(0.5, -0.5, -1.0),
            color=(1.0, 0.9, 0.8),
            intensity=1.5
        ),
        LightSource(
            light_type=LightType.AMBIENT,
            color=(0.2, 0.2, 0.3),
            intensity=0.5
        )
    ]
    
    # Add some basic objects (paths would need to be adjusted)
    # This is just illustrative - actual models would need proper paths
    scene.objects = [
        SceneObject(
            name="ground_plane",
            model_path="models/ground.egg",  # Example path
            position=(0, 0, -1),
            scale=(5, 5, 1),
            material=Material(
                diffuse_color=(0.3, 0.5, 0.2),
                specular_color=(0.1, 0.1, 0.1)
            )
        ),
        SceneObject(
            name="test_object",
            model_path="models/test.egg",  # Example path
            position=(0, 0, 2),
            rotation=(0, 45, 0),
            material=Material(
                diffuse_color=(0.8, 0.2, 0.2),
                shininess=64.0
            )
        )
    ]
    
    return scene


def main():
    """Test the 3D rendering engine."""
    # Initialize engine
    engine = RenderingEngine(render_mode=RenderMode.REALTIME)
    
    # Create and load scene
    scene = create_default_scene()
    engine.load_scene(scene)
    
    # Test rendering a frame
    frame = engine.render_frame()
    if frame is not None:
        print(f"✓ Successfully rendered frame: {frame.shape}")
    else:
        print("✗ Failed to render frame")
    
    # Start real-time rendering (this will block)
    print("Starting real-time rendering...")
    engine.start_realtime_rendering()


if __name__ == "__main__":
    main()