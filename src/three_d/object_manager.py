#!/usr/bin/env python3
"""
StoryCore-Engine 3D Object Manager

Manages the library of 3D objects/models that can be placed in scenes.
Supports importing, organizing, and retrieving 3D models for composition.
"""

import logging
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from pathlib import Path
import json
import hashlib
import os

logger = logging.getLogger(__name__)


@dataclass
class Object3DMetadata:
    """Metadata for a 3D object."""
    object_id: str
    name: str
    file_path: str
    file_format: str  # gltf, glb, obj, egg, fbx
    description: str = ""
    category: str = "props"  # props, characters, vehicles, furniture, nature, effects
    tags: List[str] = field(default_factory=list)
    
    # 3D bounding box (for sizing)
    bounding_box: Tuple[float, float, float] = (1.0, 1.0, 1.0)  # width, height, depth
    
    # Default transforms
    default_position: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    default_rotation: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    default_scale: Tuple[float, float, float] = (1.0, 1.0, 1.0)
    
    # Material information
    material_count: int = 0
    texture_paths: List[str] = field(default_factory=list)
    
    # Animation support
    has_animations: bool = False
    animation_names: List[str] = field(default_factory=list)
    
    # Source information
    source: str = "local"  # local, imported, generated
    import_date: Optional[str] = None
    last_modified: Optional[str] = None
    
    # Preview
    preview_image_path: Optional[str] = None
    thumbnail_path: Optional[str] = None
    
    # Custom attributes
    custom_attributes: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Object3DPlacement:
    """Placement of a 3D object in a scene."""
    placement_id: str
    object_id: str
    object_name: str
    
    # Transform properties
    position: Tuple[float, float, float] = (0.0, 0.0, 0.0)
    rotation: Tuple[float, float, float] = (0.0, 0.0, 0.0)  # Euler angles in degrees
    scale: Tuple[float, float, float] = (1.0, 1.0, 1.0)
    
    # Rendering properties
    visible: bool = True
    cast_shadow: bool = True
    receive_shadow: bool = True
    
    # Layer composition
    layer_name: str = "default"
    z_order: int = 0  # For 2D layering
    
    # Camera relative positioning
    camera_relative: bool = False  # True = position relative to camera, False = world space
    
    # Animation
    animation_name: Optional[str] = None
    animation_loop: bool = True
    animation_speed: float = 1.0
    
    # Time-based properties for video
    start_time: float = 0.0  # Start time in seconds
    end_time: Optional[float] = None  # End time (None = infinite)
    keyframes: List[Dict[str, Any]] = field(default_factory=list)
    
    # Custom properties
    custom_data: Dict[str, Any] = field(default_factory=dict)


class ObjectLibrary:
    """
    Library of 3D objects available for use in scenes.
    
    Features:
    - Import and catalog 3D models
    - Organize by category and tags
    - Search and filter capabilities
    - Metadata management
    """
    
    def __init__(self, library_path: Optional[str] = None):
        """Initialize the object library.
        
        Args:
            library_path: Path to the object library directory
        """
        if library_path:
            self.library_path = Path(library_path)
        else:
            # Default to assets/objects directory
            self.library_path = Path("assets/objects")
        
        self.objects: Dict[str, Object3DMetadata] = {}
        self._load_library()
        
        logger.info(f"3D Object Library initialized with {len(self.objects)} objects")
    
    def _load_library(self) -> None:
        """Load existing objects from library."""
        if not self.library_path.exists():
            logger.info(f"Creating object library directory: {self.library_path}")
            self.library_path.mkdir(parents=True, exist_ok=True)
            return
        
        # Load metadata for all objects
        metadata_file = self.library_path / "library_metadata.json"
        if metadata_file.exists():
            try:
                with open(metadata_file, 'r') as f:
                    data = json.load(f)
                    for obj_data in data.get("objects", []):
                        obj = Object3DMetadata(**obj_data)
                        self.objects[obj.object_id] = obj
                logger.info(f"Loaded {len(self.objects)} objects from library metadata")
            except Exception as e:
                logger.error(f"Failed to load library metadata: {e}")
        
        # Scan directory for model files
        supported_formats = ['.gltf', '.glb', '.obj', '.egg', '.fbx']
        for fmt in supported_formats:
            for model_file in self.library_path.glob(f"*{fmt}"):
                if model_file.stem not in self.objects:
                    logger.info(f"Found untracked model: {model_file.name}")
                    # Auto-add discovered files
                    self._create_metadata_for_file(model_file)
    
    def _create_metadata_for_file(self, file_path: Path) -> Optional[Object3DMetadata]:
        """Create metadata for a discovered model file."""
        # Determine format
        suffix = file_path.suffix.lower()
        format_map = {
            '.gltf': 'gltf',
            '.glb': 'glb',
            '.obj': 'obj',
            '.egg': 'egg',
            '.fbx': 'fbx'
        }
        file_format = format_map.get(suffix, 'unknown')
        
        # Generate object ID
        object_id = hashlib.md5(f"{file_path.absolute()}".encode()).hexdigest()[:12]
        
        # Try to load GLTF/GLB for additional metadata
        bounding_box = (1.0, 1.0, 1.0)
        has_animations = False
        animation_names = []
        
        if file_format in ['gltf', 'glb']:
            try:
                import gltf
                # Would parse GLTF file here for metadata
            except ImportError:
                pass
        
        # Create metadata
        metadata = Object3DMetadata(
            object_id=object_id,
            name=file_path.stem.replace('_', ' ').title(),
            file_path=str(file_path),
            file_format=file_format,
            bounding_box=bounding_box,
            has_animations=has_animations,
            animation_names=animation_names,
            last_modified=str(os.path.getmtime(file_path))
        )
        
        self.objects[object_id] = metadata
        self._save_library_metadata()
        
        logger.info(f"Created metadata for: {metadata.name}")
        return metadata
    
    def _save_library_metadata(self) -> None:
        """Save library metadata to file."""
        metadata_file = self.library_path / "library_metadata.json"
        
        data = {
            "version": "1.0",
            "last_updated": str(Path(__file__).stat().st_mtime),
            "objects": [obj.__dict__ for obj in self.objects.values()]
        }
        
        with open(metadata_file, 'w') as f:
            json.dump(data, f, indent=2)
    
    def import_object(
        self,
        file_path: str,
        name: Optional[str] = None,
        category: str = "props",
        tags: Optional[List[str]] = None
    ) -> Optional[Object3DMetadata]:
        """Import a new 3D object into the library.
        
        Args:
            file_path: Path to the 3D model file
            name: Optional name (defaults to filename)
            category: Object category
            tags: Optional list of tags
            
        Returns:
            Object3DMetadata or None if import failed
        """
        src_path = Path(file_path)
        
        if not src_path.exists():
            logger.error(f"Object file not found: {file_path}")
            return None
        
        # Determine format
        suffix = src_path.suffix.lower()
        format_map = {
            '.gltf': 'gltf',
            '.glb': 'glb',
            '.obj': 'obj',
            '.egg': 'egg',
            '.fbx': 'fbx'
        }
        file_format = format_map.get(suffix)
        
        if not file_format:
            logger.error(f"Unsupported 3D format: {suffix}")
            return None
        
        # Ensure library directory exists
        format_dir = self.library_path / file_format
        format_dir.mkdir(parents=True, exist_ok=True)
        
        # Copy file to library
        dest_path = format_dir / src_path.name
        try:
            import shutil
            shutil.copy2(src_path, dest_path)
        except Exception as e:
            logger.error(f"Failed to copy object file: {e}")
            return None
        
        # Generate object ID
        object_id = hashlib.md5(f"{dest_path.absolute()}".encode()).hexdigest()[:12]
        
        # Create metadata
        metadata = Object3DMetadata(
            object_id=object_id,
            name=name or src_path.stem.replace('_', ' ').title(),
            file_path=str(dest_path),
            file_format=file_format,
            category=category,
            tags=tags or [],
            import_date=str(Path(__file__).stat().st_mtime),
            last_modified=str(Path(__file__).stat().st_mtime)
        )
        
        self.objects[object_id] = metadata
        self._save_library_metadata()
        
        logger.info(f"Imported 3D object: {metadata.name} ({metadata.object_id})")
        return metadata
    
    def remove_object(self, object_id: str) -> bool:
        """Remove an object from the library.
        
        Args:
            object_id: ID of the object to remove
            
        Returns:
            True if removed successfully
        """
        if object_id not in self.objects:
            logger.error(f"Object not found: {object_id}")
            return False
        
        metadata = self.objects[object_id]
        
        # Delete the model file
        try:
            model_path = Path(metadata.file_path)
            if model_path.exists():
                model_path.unlink()
            
            # Delete preview image if exists
            if metadata.preview_image_path:
                preview_path = Path(metadata.preview_image_path)
                if preview_path.exists():
                    preview_path.unlink()
            
            if metadata.thumbnail_path:
                thumb_path = Path(metadata.thumbnail_path)
                if thumb_path.exists():
                    thumb_path.unlink()
                    
        except Exception as e:
            logger.error(f"Failed to delete object files: {e}")
            return False
        
        # Remove from catalog
        del self.objects[object_id]
        self._save_library_metadata()
        
        logger.info(f"Removed object: {metadata.name}")
        return True
    
    def get_object(self, object_id: str) -> Optional[Object3DMetadata]:
        """Get object metadata by ID."""
        return self.objects.get(object_id)
    
    def get_object_by_name(self, name: str) -> Optional[Object3DMetadata]:
        """Get object metadata by name (case-insensitive)."""
        name_lower = name.lower()
        for obj in self.objects.values():
            if obj.name.lower() == name_lower:
                return obj
        return None
    
    def list_objects(
        self,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        search: Optional[str] = None
    ) -> List[Object3DMetadata]:
        """List objects with optional filtering.
        
        Args:
            category: Filter by category
            tags: Filter by tags (all must match)
            search: Search in name and description
            
        Returns:
            List of matching Object3DMetadata
        """
        results = list(self.objects.values())
        
        # Filter by category
        if category:
            results = [obj for obj in results if obj.category == category]
        
        # Filter by tags
        if tags:
            results = [obj for obj in results if all(tag in obj.tags for tag in tags)]
        
        # Search
        if search:
            search_lower = search.lower()
            results = [
                obj for obj in results
                if search_lower in obj.name.lower()
                or search_lower in obj.description.lower()
                or any(search_lower in tag.lower() for tag in obj.tags)
            ]
        
        return results
    
    def list_categories(self) -> List[str]:
        """List all available categories."""
        categories = set()
        for obj in self.objects.values():
            categories.add(obj.category)
        return sorted(categories)
    
    def update_metadata(
        self,
        object_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        **kwargs
    ) -> bool:
        """Update object metadata.
        
        Args:
            object_id: Object ID
            name: New name
            description: New description
            category: New category
            tags: New tags list
            
        Returns:
            True if updated successfully
        """
        if object_id not in self.objects:
            logger.error(f"Object not found: {object_id}")
            return False
        
        obj = self.objects[object_id]
        
        if name is not None:
            obj.name = name
        if description is not None:
            obj.description = description
        if category is not None:
            obj.category = category
        if tags is not None:
            obj.tags = tags
        
        # Update custom attributes
        for key, value in kwargs.items():
            if hasattr(obj, key):
                setattr(obj, key, value)
        
        obj.last_modified = str(Path(__file__).stat().st_mtime)
        self._save_library_metadata()
        
        logger.info(f"Updated metadata for: {obj.name}")
        return True
    
    def create_placement(
        self,
        object_id: str,
        placement_id: Optional[str] = None,
        **placement_kwargs
    ) -> Optional[Object3DPlacement]:
        """Create a new placement for an object.
        
        Args:
            object_id: ID of the object to place
            placement_id: Optional custom placement ID
            **placement_kwargs: Additional placement properties
            
        Returns:
            Object3DPlacement or None if object not found
        """
        if object_id not in self.objects:
            logger.error(f"Object not found: {object_id}")
            return None
        
        obj = self.objects[object_id]
        
        # Generate placement ID
        if not placement_id:
            placement_id = hashlib.md5(
                f"{object_id}_{Path(__file__).stat().st_mtime}".encode()
            ).hexdigest()[:12]
        
        # Get defaults from object metadata
        position = placement_kwargs.get('position', obj.default_position)
        rotation = placement_kwargs.get('rotation', obj.default_rotation)
        scale = placement_kwargs.get('scale', obj.default_scale)
        
        placement = Object3DPlacement(
            placement_id=placement_id,
            object_id=object_id,
            object_name=obj.name,
            position=position,
            rotation=rotation,
            scale=scale,
            **placement_kwargs
        )
        
        logger.info(f"Created placement: {placement_id} for object: {obj.name}")
        return placement
    
    def export_library_summary(self) -> Dict[str, Any]:
        """Export library summary for UI display."""
        return {
            "total_objects": len(self.objects),
            "categories": self.list_categories(),
            "objects": [
                {
                    "id": obj.object_id,
                    "name": obj.name,
                    "category": obj.category,
                    "format": obj.file_format,
                    "tags": obj.tags,
                    "thumbnail": obj.thumbnail_path
                }
                for obj in self.objects.values()
            ]
        }


def main():
    """Test the object library."""
    # Create library
    library = ObjectLibrary("assets/objects")
    
    # List objects
    objects = library.list_objects()
    print(f"Objects in library: {len(objects)}")
    
    for obj in objects:
        print(f"  - {obj.name} ({obj.category})")
    
    # Test import
    print("\nTesting import...")
    # This would require an actual file


if __name__ == "__main__":
    main()

