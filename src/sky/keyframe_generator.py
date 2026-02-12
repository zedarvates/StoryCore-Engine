#!/usr/bin/env python3
"""
Keyframe Generator Module

Generates high-quality keyframe images with atmospheric skies for ComfyUI integration.

Features:
- 4K keyframe rendering
- Depth map export for ControlNet
- Sky/ground mask generation
- Atmospheric metadata export
- Multiple world type support
"""

import numpy as np
from PIL import Image
from dataclasses import dataclass, field
from typing import Dict, List, Tuple, Optional, Union, Any
from pathlib import Path
import json
import logging
from enum import Enum

from .atmosphere_core import AtmosphereModel, WorldType, AtmosphericConditions
from .camera import Camera, CameraProjection
from .render_engine import RenderEngine

logger = logging.getLogger(__name__)


class RenderQuality(Enum):
    """Render quality levels."""
    DRAFT = "draft"           # 720p, fast
    STANDARD = "standard"     # 1080p, balanced
    HIGH = "high"             # 4K, high quality
    ULTRA = "ultra"          # 8K, maximum quality


@dataclass
class KeyframeResult:
    """Result of keyframe generation."""
    success: bool
    image_path: Optional[Path] = None
    depth_map_path: Optional[Path] = None
    sky_mask_path: Optional[Path] = None
    ground_mask_path: Optional[Path] = None
    metadata_path: Optional[Path] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    error_message: Optional[str] = None
    
    def to_comfyui_payload(self) -> Dict[str, Any]:
        """Convert to ComfyUI-compatible payload."""
        if not self.success:
            return {"error": self.error_message}
        
        return {
            "reference_image": str(self.image_path) if self.image_path else None,
            "depth_map": str(self.depth_map_path) if self.depth_map_path else None,
            "sky_mask": str(self.sky_mask_path) if self.sky_mask_path else None,
            "ground_mask": str(self.ground_mask_path) if self.ground_mask_path else None,
            "atmospheric_context": self.metadata.get("lighting", {}),
            "world_type": self.metadata.get("world_type", "earth"),
            "time_of_day": self.metadata.get("time_of_day", 12.0),
            "prompt_enhancement": self._generate_prompt_enhancement()
        }
    
    def _generate_prompt_enhancement(self) -> str:
        """Generate prompt enhancement based on atmospheric conditions."""
        if not self.metadata:
            return ""
        
        world_type = self.metadata.get("world_type", "earth")
        lighting = self.metadata.get("lighting", {})
        time_of_day = self.metadata.get("time_of_day", 12.0)
        
        enhancements = []
        
        # World type description
        world_descriptions = {
            "earth": "Earth-like planet",
            "mars": "Mars, red planet with ochre sky",
            "titan": "Titan, orange hazy atmosphere",
            "venus": "Venus, thick yellow clouds",
            "exoplanet_earth_like": "alien Earth-like world",
            "exoplanet_hot_jupiter": "hot gas giant world"
        }
        enhancements.append(world_descriptions.get(world_type, "alien world"))
        
        # Time of day
        if 5 <= time_of_day < 8:
            enhancements.append("sunrise, golden hour, warm light")
        elif 8 <= time_of_day < 17:
            enhancements.append("daytime, clear sky")
        elif 17 <= time_of_day < 20:
            enhancements.append("sunset, golden hour, orange sky")
        else:
            enhancements.append("nighttime, starry sky")
        
        # Lighting conditions
        sun_color = lighting.get("sun_color", [1, 1, 1])
        color_temp = lighting.get("color_temperature", 5778)
        
        if color_temp < 3500:
            enhancements.append("warm orange lighting")
        elif color_temp > 7000:
            enhancements.append("cool blue lighting")
        
        # Atmospheric effects
        conditions = self.metadata.get("conditions", {})
        if conditions.get("dust_storm_intensity", 0) > 0.5:
            enhancements.append("global dust storm, low visibility")
        if conditions.get("haze_density", 0) > 0.5:
            enhancements.append("thick atmospheric haze")
        if conditions.get("fog_density", 0) > 0.3:
            enhancements.append("ground fog")
        
        return ", ".join(enhancements)


@dataclass
class KeyframeConfig:
    """Configuration for keyframe generation."""
    # Resolution
    width: int = 1920
    height: int = 1080
    quality: RenderQuality = RenderQuality.STANDARD
    
    # Output paths
    output_dir: Path = field(default_factory=lambda: Path("keyframes"))
    project_name: str = "scene"
    shot_id: str = "001"
    
    # Render options
    include_depth_map: bool = True
    include_sky_mask: bool = True
    include_ground_mask: bool = True
    include_metadata: bool = True
    
    # Scene composition
    horizon_position: float = 0.5  # 0-1, vertical position of horizon
    ground_type: str = "auto"      # auto, flat, terrain, custom
    
    def __post_init__(self):
        """Validate and adjust configuration."""
        # Ensure output directory exists
        self.output_dir = Path(self.output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        # Set resolution based on quality
        quality_resolutions = {
            RenderQuality.DRAFT: (1280, 720),
            RenderQuality.STANDARD: (1920, 1080),
            RenderQuality.HIGH: (3840, 2160),
            RenderQuality.ULTRA: (7680, 4320)
        }
        
        if self.quality in quality_resolutions:
            self.width, self.height = quality_resolutions[self.quality]


class KeyframeGenerator:
    """
    Main keyframe generator for atmospheric sky scenes.
    
    Generates high-quality keyframes with:
    - Scientifically accurate sky colors
    - Proper lighting conditions
    - Depth maps for ControlNet
    - Masks for compositing
    - Metadata for ComfyUI integration
    """
    
    def __init__(self, config: Optional[KeyframeConfig] = None):
        """
        Initialize keyframe generator.
        
        Args:
            config: Keyframe configuration
        """
        self.config = config or KeyframeConfig()
        self.atmosphere: Optional[AtmosphereModel] = None
        self.camera: Optional[Camera] = None
        self.render_engine: Optional[RenderEngine] = None
        
        # Initialize render engine
        self.render_engine = RenderEngine(
            width=self.config.width,
            height=self.config.height
        )
        
        logger.info(f"KeyframeGenerator initialized: {self.config.width}x{self.config.height}")
    
    def setup_atmosphere(self, 
                        world_type: WorldType = WorldType.EARTH,
                        time_of_day: float = 12.0,
                        latitude: float = 45.0,
                        custom_conditions: Optional[AtmosphericConditions] = None) -> None:
        """
        Setup atmospheric conditions.
        
        Args:
            world_type: Type of world (Earth, Mars, Titan, etc.)
            time_of_day: Hour of day (0-24)
            latitude: Latitude for sun calculations
            custom_conditions: Optional custom atmospheric conditions
        """
        self.atmosphere = AtmosphereModel(world_type, custom_conditions)
        self.atmosphere.set_time_of_day(time_of_day, latitude)
        
        logger.info(f"Atmosphere setup: {world_type.value} at {time_of_day:.1f}h, lat={latitude}°")
    
    def setup_camera(self,
                    position: Tuple[float, float, float] = (0, 1.6, 0),
                    look_at: Tuple[float, float, float] = (0, 1.6, 1),
                    fov: float = 60.0) -> None:
        """
        Setup camera position and orientation.
        
        Args:
            position: Camera position (x, y, z) in meters
            look_at: Point to look at (x, y, z)
            fov: Field of view in degrees
        """
        self.camera = Camera(
            position=position,
            look_at=look_at,
            fov=fov,
            projection=CameraProjection.PERSPECTIVE
        )
        
        logger.info(f"Camera setup: pos={position}, fov={fov}°")
    
    def generate_keyframe(self) -> KeyframeResult:
        """
        Generate keyframe with atmospheric sky.
        
        Returns:
            KeyframeResult with paths to generated files
        """
        try:
            # Validate setup
            if not self.atmosphere:
                raise ValueError("Atmosphere not setup. Call setup_atmosphere() first.")
            if not self.camera:
                raise ValueError("Camera not setup. Call setup_camera() first.")
            
            logger.info("Starting keyframe generation...")
            
            # Generate base image
            image = self._render_sky()
            
            # Generate depth map
            depth_map = None
            if self.config.include_depth_map:
                depth_map = self._render_depth_map()
            
            # Generate masks
            sky_mask = None
            ground_mask = None
            if self.config.include_sky_mask or self.config.include_ground_mask:
                sky_mask, ground_mask = self._render_masks()
            
            # Prepare metadata
            metadata = self._prepare_metadata()
            
            # Save outputs
            paths = self._save_outputs(image, depth_map, sky_mask, ground_mask, metadata)
            
            logger.info("Keyframe generation complete!")
            
            return KeyframeResult(
                success=True,
                image_path=paths.get("image"),
                depth_map_path=paths.get("depth"),
                sky_mask_path=paths.get("sky_mask"),
                ground_mask_path=paths.get("ground_mask"),
                metadata_path=paths.get("metadata"),
                metadata=metadata
            )
            
        except Exception as e:
            logger.error(f"Keyframe generation failed: {e}")
            return KeyframeResult(
                success=False,
                error_message=str(e)
            )
    
    def _render_sky(self) -> np.ndarray:
        """Render sky image."""
        width, height = self.config.width, self.config.height
        
        # Create gradient sky
        image = np.zeros((height, width, 3), dtype=np.float32)
        
        # Get sky colors
        zenith_color = np.array(self.atmosphere.get_zenith_color())
        horizon_color = np.array(self.atmosphere.get_horizon_color())
        
        # Create vertical gradient
        horizon_y = int(height * self.config.horizon_position)
        
        for y in range(height):
            if y < horizon_y:
                # Sky portion
                t = y / horizon_y if horizon_y > 0 else 0
                # Non-linear gradient for more realistic sky
                t = t ** 0.7  # Adjust curve
                color = horizon_color * (1 - t) + zenith_color * t
            else:
                # Ground portion (simple gradient for now)
                t = (y - horizon_y) / (height - horizon_y) if height > horizon_y else 0
                color = np.array([0.2, 0.15, 0.1]) * (1 - t * 0.5)  # Dark ground
                
            image[y, :] = color
        
        # Add sun
        self._add_sun(image, horizon_y)
        
        # Add atmospheric effects
        self._add_atmospheric_effects(image)
        
        # Convert to 8-bit
        image = np.clip(image * 255, 0, 255).astype(np.uint8)
        
        return image
    
    def _add_sun(self, image: np.ndarray, horizon_y: int) -> None:
        """Add sun to image."""
        height, width = image.shape[:2]
        
        # Get sun position
        sun_az, sun_el = self.atmosphere.sun.position.azimuth, self.atmosphere.sun.position.elevation
        
        # Convert to image coordinates
        # Azimuth: 0=North, 90=East, 180=South, 270=West
        # Map to x coordinate (assuming camera looks South/180°)
        camera_az = 180  # Default camera direction
        rel_az = (sun_az - camera_az) % 360
        
        # Convert to radians
        az_rad = np.radians(rel_az)
        el_rad = np.radians(sun_el)
        
        # Project to image plane (simplified)
        fov_rad = np.radians(self.camera.fov)
        
        # Calculate sun position in image
        sun_x = width // 2 + int(width * np.sin(az_rad) * (fov_rad / 2) / np.pi)
        sun_y = horizon_y - int(horizon_y * np.sin(el_rad))
        
        # Check if sun is visible
        if 0 <= sun_x < width and 0 <= sun_y < height and sun_el > -5:
            # Draw sun
            sun_color = np.array(self.atmosphere.get_sun_color())
            sun_radius = max(5, int(width * 0.02))  # Sun size
            
            # Create sun glow
            for dy in range(-sun_radius * 3, sun_radius * 3 + 1):
                for dx in range(-sun_radius * 3, sun_radius * 3 + 1):
                    x, y = sun_x + dx, sun_y + dy
                    if 0 <= x < width and 0 <= y < height:
                        dist = np.sqrt(dx**2 + dy**2)
                        if dist < sun_radius * 3:
                            # Intensity falls off with distance
                            intensity = max(0, 1 - dist / (sun_radius * 3))
                            intensity = intensity ** 0.5  # Soften falloff
                            
                            # Brighter in center
                            if dist < sun_radius:
                                intensity = 1.0
                            
                            # Add to image
                            glow = sun_color * intensity * 2.0  # Boost sun brightness
                            image[y, x] = np.clip(image[y, x] + glow, 0, 1)
    
    def _add_atmospheric_effects(self, image: np.ndarray) -> None:
        """Add atmospheric effects like haze, fog, etc."""
        conditions = self.atmosphere.conditions
        
        # Add noise for texture
        noise = np.random.normal(0, 0.02, image.shape[:2])
        noise = np.stack([noise] * 3, axis=-1)
        image[:] = np.clip(image + noise, 0, 1)
        
        # Apply haze
        if conditions.haze_density > 0:
            haze_color = np.array([0.8, 0.8, 0.7])
            haze = conditions.haze_density * 0.5
            image[:] = image * (1 - haze) + haze_color * haze
        
        # Apply dust storm (Mars)
        if conditions.dust_storm_intensity > 0:
            dust_color = np.array([0.9, 0.6, 0.4])
            dust = conditions.dust_storm_intensity * 0.7
            image[:] = image * (1 - dust) + dust_color * dust
    
    def _render_depth_map(self) -> np.ndarray:
        """Render depth map for ControlNet."""
        height, width = self.config.height, self.config.width
        horizon_y = int(height * self.config.horizon_position)
        
        # Create depth map
        depth = np.zeros((height, width), dtype=np.float32)
        
        for y in range(height):
            if y < horizon_y:
                # Sky - infinite depth
                depth[y, :] = 1.0
            else:
                # Ground - depth increases with distance
                # Simplified: linear falloff from horizon
                t = (y - horizon_y) / (height - horizon_y) if height > horizon_y else 0
                # Closer = darker (0), farther = lighter (1)
                depth[y, :] = 0.3 + t * 0.7
        
        # Convert to 16-bit for EXR export
        depth = (depth * 65535).astype(np.uint16)
        
        return depth
    
    def _render_masks(self) -> Tuple[np.ndarray, np.ndarray]:
        """Render sky and ground masks."""
        height, width = self.config.height, self.config.width
        horizon_y = int(height * self.config.horizon_position)
        
        # Sky mask (white = sky, black = ground)
        sky_mask = np.zeros((height, width), dtype=np.uint8)
        sky_mask[:horizon_y, :] = 255
        
        # Ground mask (inverse)
        ground_mask = 255 - sky_mask
        
        return sky_mask, ground_mask
    
    def _prepare_metadata(self) -> Dict[str, Any]:
        """Prepare metadata for export."""
        return {
            "world_type": self.atmosphere.world_type.value,
            "time_of_day": self.atmosphere.time_of_day,
            "latitude": self.atmosphere.latitude,
            "conditions": self.atmosphere.to_dict()["conditions"],
            "lighting": self.atmosphere.get_lighting_conditions(),
            "camera": {
                "position": self.camera.position,
                "look_at": self.camera.look_at,
                "fov": self.camera.fov
            },
            "render_settings": {
                "width": self.config.width,
                "height": self.config.height,
                "quality": self.config.quality.value,
                "horizon_position": self.config.horizon_position
            }
        }
    
    def _save_outputs(self,
                     image: np.ndarray,
                     depth_map: Optional[np.ndarray],
                     sky_mask: Optional[np.ndarray],
                     ground_mask: Optional[np.ndarray],
                     metadata: Dict[str, Any]) -> Dict[str, Path]:
        """Save all outputs to disk."""
        paths = {}
        
        # Create shot directory
        shot_dir = self.config.output_dir / f"shot_{self.config.shot_id}"
        shot_dir.mkdir(parents=True, exist_ok=True)
        
        base_name = f"{self.config.project_name}_{self.config.shot_id}"
        
        # Save image
        image_path = shot_dir / f"{base_name}_base.png"
        Image.fromarray(image).save(image_path)
        paths["image"] = image_path
        logger.info(f"Saved image: {image_path}")
        
        # Save depth map
        if depth_map is not None and self.config.include_depth_map:
            depth_path = shot_dir / f"{base_name}_depth.exr"
            # Use OpenEXR or PIL for 16-bit
            Image.fromarray(depth_map).save(depth_path)
            paths["depth"] = depth_path
            logger.info(f"Saved depth: {depth_path}")
        
        # Save masks
        if sky_mask is not None and self.config.include_sky_mask:
            sky_mask_path = shot_dir / f"{base_name}_sky_mask.png"
            Image.fromarray(sky_mask).save(sky_mask_path)
            paths["sky_mask"] = sky_mask_path
            logger.info(f"Saved sky mask: {sky_mask_path}")
        
        if ground_mask is not None and self.config.include_ground_mask:
            ground_mask_path = shot_dir / f"{base_name}_ground_mask.png"
            Image.fromarray(ground_mask).save(ground_mask_path)
            paths["ground_mask"] = ground_mask_path
            logger.info(f"Saved ground mask: {ground_mask_path}")
        
        # Save metadata
        if self.config.include_metadata:
            metadata_path = shot_dir / f"{base_name}_metadata.json"
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            paths["metadata"] = metadata_path
            logger.info(f"Saved metadata: {metadata_path}")
        
        return paths
    
    def generate_for_comfyui(self, prompt: str, comfyui_config: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Generate keyframe and prepare ComfyUI payload.
        
        Args:
            prompt: Base prompt for image generation
            comfyui_config: Additional ComfyUI configuration
            
        Returns:
            Dictionary ready for ComfyUI API
        """
        # Generate keyframe
        result = self.generate_keyframe()
        
        if not result.success:
            return {"error": result.error_message}
        
        # Build ComfyUI payload
        payload = result.to_comfyui_payload()
        payload["prompt"] = prompt
        payload["prompt_with_atmosphere"] = f"{prompt}, {result._generate_prompt_enhancement()}"
        
        if comfyui_config:
            payload.update(comfyui_config)
        
        return payload


# Convenience functions
def quick_generate(world_type: WorldType = WorldType.EARTH,
                   time_of_day: float = 12.0,
                   output_dir: str = "keyframes",
                   quality: RenderQuality = RenderQuality.STANDARD) -> KeyframeResult:
    """
    Quick keyframe generation with default settings.
    
    Args:
        world_type: World type
        time_of_day: Hour of day
        output_dir: Output directory
        quality: Render quality
        
    Returns:
        KeyframeResult
    """
    config = KeyframeConfig(
        output_dir=Path(output_dir),
        quality=quality
    )
    
    generator = KeyframeGenerator(config)
    generator.setup_atmosphere(world_type, time_of_day)
    generator.setup_camera()
    
    return generator.generate_keyframe()


# Example usage
if __name__ == "__main__":
    # Test Earth at sunset
    result = quick_generate(
        world_type=WorldType.EARTH,
        time_of_day=18.5,
        quality=RenderQuality.DRAFT
    )
    
    if result.success:
        print("Keyframe generated successfully!")
        print(f"Image: {result.image_path}")
        print(f"Metadata: {result.metadata_path}")
        print("\nComfyUI payload:")
        print(json.dumps(result.to_comfyui_payload(), indent=2))
    else:
        print(f"Failed: {result.error_message}")
