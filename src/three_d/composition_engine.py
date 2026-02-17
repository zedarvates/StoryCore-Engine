#!/usr/bin/env python3
"""
StoryCore-Engine 3D Composition Engine

Composites 3D objects into scenes with 2D background images.
Handles depth-aware placement, perspective matching, and rendering.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from pathlib import Path
import json
import math

logger = logging.getLogger(__name__)


@dataclass
class SceneComposition:
    """Complete scene composition with background and placed objects."""
    composition_id: str
    name: str
    
    # Background image
    background_image_path: Optional[str] = None
    background_image_size: Tuple[int, int] = (1920, 1080)
    
    # Camera settings for perspective matching
    camera_fov: float = 45.0
    camera_position: Tuple[float, float, float] = (0.0, 0.0, -10.0)
    camera_target: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    
    # Placed objects
    objects: List['ObjectPlacement3D'] = field(default_factory=list)
    
    # Lighting
    ambient_intensity: float = 0.5
    light_sources: List[Dict[str, Any]] = field(default_factory=list)
    
    # Post-processing
    fog_enabled: bool = False
    fog_color: Tuple[float, float, float] = (0.1, 0.1, 0.1)
    fog_density: float = 0.01
    
    # Metadata
    created_at: str = ""
    updated_at: str = ""
    resolution: Tuple[int, int] = (1920, 1080)


@dataclass
class ObjectPlacement3D:
    """Placement of a 3D object within a scene composition."""
    placement_id: str
    object_id: str
    object_name: str
    
    # 3D transform (world space)
    position: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    rotation: Tuple[float, float, float] = (0.0, 0.0, 0.0)  # Euler angles in degrees
    scale: Tuple[float, float, float] = (1.0, 1.0, 1.0)
    
    # Object dimensions (for sizing)
    bounding_box: Tuple[float, float, float] = (1.0, 1.0, 1.0)
    
    # Rendering options
    visible: bool = True
    cast_shadow: bool = True
    receive_shadow: bool = True
    
    # Depth sorting
    depth_value: float = 0.0  # Calculated Z value for sorting
    
    # Material overrides
    material_overrides: Dict[str, Any] = field(default_factory=dict)
    
    # Animation (for video)
    animation_name: Optional[str] = None
    animation_time: float = 0.0
    
    # Custom data
    custom_data: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CompositionResult:
    """Result of a composition rendering."""
    success: bool
    output_path: Optional[str] = None
    output_size: Tuple[int, int] = (0, 0)
    
    # Object positions for reference
    object_positions: List[Dict[str, Any]] = field(default_factory=list)
    
    # Quality metrics
    quality_score: float = 0.0
    shadow_quality: float = 0.0
    
    # Processing info
    render_time_ms: float = 0.0
    error_message: Optional[str] = None
    
    # Metadata
    composition_id: str = ""
    timestamp: str = ""


class CompositionEngine:
    """
    Engine for compositing 3D objects into 2D scenes.
    
    Features:
    - 3D object placement with depth awareness
    - Perspective matching with background images
    - Shadow and lighting effects
    - Render output for compositing
    """
    
    def __init__(self):
        """Initialize the composition engine."""
        self.render_mode: str = "mock"  # mock, panda3d, open3d, blend
        self.output_resolution: Tuple[int, int] = (1920, 1080)
        
        # Rendering engine references
        self.panda3d_available = False
        self.open3d_available = False
        
        # Check available rendering backends
        self._check_rendering_backends()
        
        logger.info(f"Composition Engine initialized in {self.render_mode} mode")
    
    def _check_rendering_backends(self) -> None:
        """Check which rendering backends are available."""
        try:
            import panda3d
            self.panda3d_available = True
            self.render_mode = "panda3d"
            logger.info("Panda3D backend available")
        except ImportError:
            pass
        
        try:
            import open3d
            self.open3d_available = True
            if self.render_mode == "mock":
                self.render_mode = "open3d"
            logger.info("Open3D backend available")
        except ImportError:
            pass
        
        if not self.panda3d_available and not self.open3d_available:
            logger.warning("No 3D rendering backend available - using mock mode")
    
    def create_composition(
        self,
        composition_id: str,
        name: str,
        background_image_path: Optional[str] = None,
        resolution: Optional[Tuple[int, int]] = None
    ) -> SceneComposition:
        """Create a new scene composition.
        
        Args:
            composition_id: Unique composition ID
            name: Composition name
            background_image_path: Path to background image
            resolution: Output resolution (width, height)
            
        Returns:
            SceneComposition object
        """
        composition = SceneComposition(
            composition_id=composition_id,
            name=name,
            background_image_path=background_image_path,
            resolution=resolution or self.output_resolution
        )
        
        if background_image_path:
            # Extract resolution from image if available
            composition.background_image_size = resolution or self._get_image_size(background_image_path)
        
        logger.info(f"Created composition: {name} ({composition_id})")
        return composition
    
    def add_object(
        self,
        composition: SceneComposition,
        object_id: str,
        object_name: str,
        position: Tuple[float, float, float],
        rotation: Tuple[float, float, float] = (0.0, 0.0, 0.0),
        scale: Tuple[float, float, float] = (1.0, 1.0, 1.0),
        bounding_box: Optional[Tuple[float, float, float]] = None,
        **options
    ) -> ObjectPlacement3D:
        """Add a 3D object to the composition.
        
        Args:
            composition: Target composition
            object_id: Object identifier
            object_name: Object display name
            position: 3D position (x, y, z)
            rotation: Rotation (x, y, z) in degrees
            scale: Scale (x, y, z)
            bounding_box: Object bounding box dimensions
            **options: Additional options
            
        Returns:
            ObjectPlacement3D object
        """
        import uuid
        placement_id = str(uuid.uuid4())[:8]
        
        # Calculate depth value for sorting (Z coordinate)
        depth_value = position[2]
        
        placement = ObjectPlacement3D(
            placement_id=placement_id,
            object_id=object_id,
            object_name=object_name,
            position=position,
            rotation=rotation,
            scale=scale,
            bounding_box=bounding_box or (1.0, 1.0, 1.0),
            depth_value=depth_value,
            **options
        )
        
        composition.objects.append(placement)
        
        # Sort objects by depth (back to front)
        composition.objects.sort(key=lambda o: o.depth_value)
        
        logger.info(f"Added object '{object_name}' at position {position}")
        return placement
    
    def remove_object(
        self,
        composition: SceneComposition,
        placement_id: str
    ) -> bool:
        """Remove an object from the composition.
        
        Args:
            composition: Target composition
            placement_id: Placement ID to remove
            
        Returns:
            True if removed successfully
        """
        original_count = len(composition.objects)
        composition.objects = [
            obj for obj in composition.objects
            if obj.placement_id != placement_id
        ]
        
        removed = len(composition.objects) < original_count
        
        if removed:
            logger.info(f"Removed object placement: {placement_id}")
        
        return removed
    
    def set_object_transform(
        self,
        composition: SceneComposition,
        placement_id: str,
        position: Optional[Tuple[float, float, float]] = None,
        rotation: Optional[Tuple[float, float, float]] = None,
        scale: Optional[Tuple[float, float, float]] = None
    ) -> bool:
        """Update object transform.
        
        Args:
            composition: Target composition
            placement_id: Placement ID to update
            position: New position (None to keep current)
            rotation: New rotation (None to keep current)
            scale: New scale (None to keep current)
            
        Returns:
            True if updated successfully
        """
        for obj in composition.objects:
            if obj.placement_id == placement_id:
                if position is not None:
                    obj.position = position
                    obj.depth_value = position[2]
                if rotation is not None:
                    obj.rotation = rotation
                if scale is not None:
                    obj.scale = scale
                
                # Re-sort by depth
                composition.objects.sort(key=lambda o: o.depth_value)
                
                logger.info(f"Updated transform for: {placement_id}")
                return True
        
        logger.warning(f"Object placement not found: {placement_id}")
        return False
    
    def set_camera(
        self,
        composition: SceneComposition,
        position: Tuple[float, float, float],
        target: Tuple[float, float, float],
        fov: float = 45.0
    ) -> None:
        """Set camera parameters for perspective matching.
        
        Args:
            composition: Target composition
            position: Camera position
            target: Camera look-at target
            fov: Field of view in degrees
        """
        composition.camera_position = position
        composition.camera_target = target
        composition.camera_fov = fov
        
        logger.info(f"Camera set: pos={position}, target={target}, fov={fov}°")
    
    def calculate_screen_position(
        self,
        composition: SceneComposition,
        object_placement: ObjectPlacement3D,
        screen_width: int,
        screen_height: int
    ) -> Tuple[float, float]:
        """Calculate 2D screen position for a 3D object.
        
        Uses perspective projection to map 3D world coordinates to 2D screen.
        
        Args:
            composition: Scene composition
            object_placement: Object to project
            screen_width: Screen width in pixels
            screen_height: Screen height in pixels
            
        Returns:
            (x, y) screen position in pixels
        """
        # Camera parameters
        cam_pos = composition.camera_position
        cam_target = composition.camera_target
        fov = composition.camera_fov
        
        # Object position
        obj_pos = object_placement.position
        
        # Calculate camera forward, right, up vectors
        forward = (
            cam_target[0] - cam_pos[0],
            cam_target[1] - cam_pos[1],
            cam_target[2] - cam_pos[2]
        )
        forward_len = math.sqrt(sum(f*f for f in forward))
        forward = tuple(f / forward_len for f in forward)
        
        # Simplified right/up calculation (assuming world-aligned)
        right = (-forward[2], 0.0, forward[0])  # Approximate
        right_len = math.sqrt(sum(r*r for r in right))
        if right_len > 0:
            right = tuple(r / right_len for r in right)
        
        up = (0.0, 1.0, 0.0)
        
        # Calculate relative position to camera
        rel_pos = (
            obj_pos[0] - cam_pos[0],
            obj_pos[1] - cam_pos[1],
            obj_pos[2] - cam_pos[2]
        )
        
        # Project to screen space
        # Simple perspective projection
        fov_rad = math.radians(fov)
        aspect = screen_width / screen_height if screen_height > 0 else 1.0
        
        # Calculate distance along forward axis
        distance = (
            rel_pos[0] * forward[0] +
            rel_pos[1] * forward[1] +
            rel_pos[2] * forward[2]
        )
        
        if distance <= 0.1:  # Too close or behind camera
            return (screen_width / 2, screen_height / 2)
        
        # Calculate screen coordinates
        tan_fov = math.tan(fov_rad / 2)
        
        screen_x = screen_width / 2 + (
            (rel_pos[0] * right[0] + rel_pos[1] * right[1] + rel_pos[2] * right[2]) /
            (distance * tan_fov * aspect)
        ) * screen_width / 2
        
        screen_y = screen_height / 2 - (
            (rel_pos[0] * up[0] + rel_pos[1] * up[1] + rel_pos[2] * up[2]) /
            (distance * tan_fov)
        ) * screen_height / 2
        
        return (screen_x, screen_y)
    
    def calculate_scale_factor(
        self,
        composition: SceneComposition,
        object_placement: ObjectPlacement3D,
        screen_height: int
    ) -> float:
        """Calculate scale factor based on distance and perspective.
        
        Args:
            composition: Scene composition
            object_placement: Object to calculate for
            screen_height: Screen height in pixels
            
        Returns:
            Scale factor for rendering
        """
        # Calculate distance from camera
        cam_pos = composition.camera_position
        obj_pos = object_placement.position
        
        distance = math.sqrt(
            (obj_pos[0] - cam_pos[0]) ** 2 +
            (obj_pos[1] - cam_pos[1]) ** 2 +
            (obj_pos[2] - cam_pos[2]) ** 2
        )
        
        if distance < 0.1:
            return 1.0
        
        # Base scale from object metadata
        base_scale = object_placement.scale[1]  # Use Y scale as base
        
        # Perspective scaling (objects further away appear smaller)
        fov = composition.camera_fov
        fov_rad = math.radians(fov)
        tan_fov = math.tan(fov_rad / 2)
        
        # Scale factor inversely proportional to distance
        scale_factor = base_scale / distance
        
        # Normalize to reasonable display size
        scale_factor *= screen_height / 10  # Adjust for display
        
        return scale_factor
    
    def render_composition(
        self,
        composition: SceneComposition,
        output_path: Optional[str] = None
    ) -> CompositionResult:
        """Render the composition.
        
        Args:
            composition: Scene composition to render
            output_path: Optional output file path
            
        Returns:
            CompositionResult with render information
        """
        import time
        start_time = time.time()
        
        try:
            if self.render_mode == "mock":
                result = self._render_mock(composition, output_path)
            elif self.render_mode == "panda3d" and self.panda3d_available:
                result = self._render_panda3d(composition, output_path)
            elif self.render_mode == "open3d" and self.open3d_available:
                result = self._render_open3d(composition, output_path)
            else:
                result = self._render_mock(composition, output_path)
            
            result.render_time_ms = (time.time() - start_time) * 1000
            result.composition_id = composition.composition_id
            
            return result
            
        except Exception as e:
            logger.error(f"Composition rendering failed: {e}")
            return CompositionResult(
                success=False,
                error_message=str(e),
                composition_id=composition.composition_id,
                timestamp=str(time.time())
            )
    
    def _render_mock(
        self,
        composition: SceneComposition,
        output_path: Optional[str]
    ) -> CompositionResult:
        """Mock rendering - generates metadata without actual rendering."""
        # Calculate screen positions for all objects
        width, height = composition.resolution
        
        object_positions = []
        for obj in composition.objects:
            if not obj.visible:
                continue
            
            screen_x, screen_y = self.calculate_screen_position(
                composition, obj, width, height
            )
            scale_factor = self.calculate_scale_factor(composition, obj, height)
            
            object_positions.append({
                "placement_id": obj.placement_id,
                "object_id": obj.object_id,
                "object_name": obj.object_name,
                "screen_position": {
                    "x": round(screen_x, 2),
                    "y": round(screen_y, 2)
                },
                "scale_factor": round(scale_factor, 4),
                "depth": obj.depth_value,
                "rotation": obj.rotation,
                "bounding_box": obj.bounding_box
            })
        
        # Generate mock output path
        if output_path is None:
            import datetime
            timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
            output_path = f"output/compositions/{composition.composition_id}_{timestamp}.png"
        
        # Ensure output directory exists
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        
        # Create placeholder file (actual rendering would happen elsewhere)
        logger.info(f"Mock render complete: {len(object_positions)} objects placed")
        
        return CompositionResult(
            success=True,
            output_path=output_path,
            output_size=composition.resolution,
            object_positions=object_positions,
            quality_score=0.85,
            shadow_quality=0.75,
            timestamp=str(time.time())
        )
    
    def _render_panda3d(
        self,
        composition: SceneComposition,
        output_path: Optional[str]
    ) -> CompositionResult:
        """Render using Panda3D backend."""
        # This would integrate with the existing Panda3D rendering engine
        # For now, fall back to mock
        logger.info("Panda3D rendering not fully implemented, using mock")
        return self._render_mock(composition, output_path)
    
    def _render_open3d(
        self,
        composition: SceneComposition,
        output_path: Optional[str]
    ) -> CompositionResult:
        """Render using Open3D backend."""
        # This would integrate with Open3D
        # For now, fall back to mock
        logger.info("Open3D rendering not fully implemented, using mock")
        return self._render_mock(composition, output_path)
    
    def export_composition_data(
        self,
        composition: SceneComposition,
        file_path: str
    ) -> bool:
        """Export composition data to JSON.
        
        Args:
            composition: Composition to export
            file_path: Output file path
            
        Returns:
            True if exported successfully
        """
        try:
            data = {
                "composition_id": composition.composition_id,
                "name": composition.name,
                "background_image": composition.background_image_path,
                "background_size": list(composition.background_image_size),
                "camera": {
                    "position": list(composition.camera_position),
                    "target": list(composition.camera_target),
                    "fov": composition.camera_fov
                },
                "objects": [
                    {
                        "placement_id": obj.placement_id,
                        "object_id": obj.object_id,
                        "object_name": obj.object_name,
                        "position": list(obj.position),
                        "rotation": list(obj.rotation),
                        "scale": list(obj.scale),
                        "bounding_box": list(obj.bounding_box),
                        "visible": obj.visible,
                        "cast_shadow": obj.cast_shadow,
                        "receive_shadow": obj.receive_shadow,
                        "depth": obj.depth_value,
                        "animation": {
                            "name": obj.animation_name,
                            "time": obj.animation_time
                        },
                        "custom_data": obj.custom_data
                    }
                    for obj in composition.objects
                ],
                "lighting": {
                    "ambient_intensity": composition.ambient_intensity,
                    "lights": composition.light_sources
                },
                "post_processing": {
                    "fog_enabled": composition.fog_enabled,
                    "fog_color": list(composition.fog_color),
                    "fog_density": composition.fog_density
                },
                "resolution": list(composition.resolution),
                "created_at": composition.created_at,
                "updated_at": composition.updated_at
            }
            
            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)
            
            logger.info(f"Exported composition to: {file_path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to export composition: {e}")
            return False
    
    def import_composition_data(self, file_path: str) -> Optional[SceneComposition]:
        """Import composition from JSON.
        
        Args:
            file_path: Input file path
            
        Returns:
            SceneComposition or None if import failed
        """
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)
            
            composition = SceneComposition(
                composition_id=data["composition_id"],
                name=data["name"],
                background_image_path=data.get("background_image"),
                background_image_size=tuple(data.get("background_size", [1920, 1080])),
                camera_fov=data.get("camera", {}).get("fov", 45.0),
                camera_position=tuple(data.get("camera", {}).get("position", [0, 0, -10])),
                camera_target=tuple(data.get("camera", {}).get("target", [0, 0, 0])),
                ambient_intensity=data.get("lighting", {}).get("ambient_intensity", 0.5),
                light_sources=data.get("lighting", {}).get("lights", []),
                fog_enabled=data.get("post_processing", {}).get("fog_enabled", False),
                fog_color=tuple(data.get("post_processing", {}).get("fog_color", [0.1, 0.1, 0.1])),
                fog_density=data.get("post_processing", {}).get("fog_density", 0.01),
                resolution=tuple(data.get("resolution", [1920, 1080])),
                created_at=data.get("created_at", ""),
                updated_at=data.get("updated_at", "")
            )
            
            # Import objects
            for obj_data in data.get("objects", []):
                placement = ObjectPlacement3D(
                    placement_id=obj_data["placement_id"],
                    object_id=obj_data["object_id"],
                    object_name=obj_data["object_name"],
                    position=tuple(obj_data.get("position", [0, 0, 0])),
                    rotation=tuple(obj_data.get("rotation", [0, 0, 0])),
                    scale=tuple(obj_data.get("scale", [1, 1, 1])),
                    bounding_box=tuple(obj_data.get("bounding_box", [1, 1, 1])),
                    visible=obj_data.get("visible", True),
                    cast_shadow=obj_data.get("cast_shadow", True),
                    receive_shadow=obj_data.get("receive_shadow", True),
                    depth_value=obj_data.get("depth", obj_data.get("position", [0, 0, 0])[2]),
                    animation_name=obj_data.get("animation", {}).get("name"),
                    animation_time=obj_data.get("animation", {}).get("time", 0.0),
                    custom_data=obj_data.get("custom_data", {})
                )
                composition.objects.append(placement)
            
            logger.info(f"Imported composition: {composition.name}")
            return composition
            
        except Exception as e:
            logger.error(f"Failed to import composition: {e}")
            return None
    
    def _get_image_size(self, image_path: str) -> Tuple[int, int]:
        """Get image dimensions."""
        try:
            from PIL import Image
            with Image.open(image_path) as img:
                return img.size
        except Exception:
            return (1920, 1080)  # Default size
    
    def create_video_keyframe(
        self,
        composition: SceneComposition,
        frame_number: int,
        fps: int = 24
    ) -> Dict[str, Any]:
        """Create a keyframe for video animation.
        
        Args:
            composition: Scene composition
            frame_number: Frame number
            fps: Frames per second
            
        Returns:
            Keyframe data dictionary
        """
        time_seconds = frame_number / fps
        
        # Calculate object positions for this frame
        objects_data = []
        for obj in composition.objects:
            if not obj.visible:
                continue
            
            # Check if object is active at this time
            if obj.animation_name and obj.animation_time > 0:
                # Would calculate animated position here
                pass
            
            width, height = composition.resolution
            screen_x, screen_y = self.calculate_screen_position(
                composition, obj, width, height
            )
            
            objects_data.append({
                "placement_id": obj.placement_id,
                "object_id": obj.object_id,
                "screen_position": {"x": screen_x, "y": screen_y},
                "scale": self.calculate_scale_factor(composition, obj, height),
                "rotation": obj.rotation,
                "opacity": 1.0
            })
        
        return {
            "frame": frame_number,
            "time_seconds": round(time_seconds, 4),
            "objects": objects_data,
            "camera": {
                "position": composition.camera_position,
                "target": composition.camera_target,
                "fov": composition.camera_fov
            }
        }


def main():
    """Test the composition engine."""
    engine = CompositionEngine()
    
    # Create composition
    composition = engine.create_composition(
        composition_id="test_comp",
        name="Test Composition",
        background_image_path="assets/images/background.jpg",
        resolution=(1920, 1080)
    )
    
    # Set camera
    engine.set_camera(
        composition,
        position=(0, 2, -8),
        target=(0, 1, 0),
        fov=50.0
    )
    
    # Add objects
    guitar_placement = engine.add_object(
        composition,
        object_id="guitar_001",
        object_name="Acoustic Guitar",
        position=(1.0, 0.5, 2.0),
        rotation=(0, 15, 0),
        scale=(1.0, 1.0, 1.0),
        bounding_box=(0.5, 1.5, 0.2)
    )
    
    chair_placement = engine.add_object(
        composition,
        object_id="chair_001",
        object_name="Wooden Chair",
        position=(-1.5, 0, 3.0),
        rotation=(0, -10, 0),
        scale=(1.0, 1.0, 1.0),
        bounding_box=(0.5, 1.0, 0.5)
    )
    
    # Render composition
    result = engine.render_composition(
        composition,
        output_path="output/compositions/test.png"
    )
    
    print(f"Render result: {'Success' if result.success else 'Failed'}")
    print(f"Objects placed: {len(result.object_positions)}")
    
    for obj_pos in result.object_positions:
        print(f"  - {obj_pos['object_name']}: ({obj_pos['screen_position']['x']:.1f}, {obj_pos['screen_position']['y']:.1f})")


if __name__ == "__main__":
    main()

