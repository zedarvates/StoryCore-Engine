#!/usr/bin/env python3
"""
Render Engine Module

High-quality offline rendering for keyframe generation.
Uses software rendering (no GPU required) for maximum compatibility.
"""

import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from dataclasses import dataclass
from typing import Tuple, Optional, Dict, Any, List
import math
import logging

logger = logging.getLogger(__name__)


@dataclass
class RenderSettings:
    """Render quality settings."""
    antialiasing: bool = True
    samples: int = 4  # Antialiasing samples
    dithering: bool = True
    color_depth: int = 16  # Bits per channel


class RenderEngine:
    """
    Software render engine for keyframe generation.
    
    Features:
    - High-quality antialiasing
    - HDR rendering
    - Multiple output formats
    - Post-processing effects
    """
    
    def __init__(self, width: int = 1920, height: int = 1080):
        """
        Initialize render engine.
        
        Args:
            width: Render width in pixels
            height: Render height in pixels
        """
        self.width = width
        self.height = height
        self.settings = RenderSettings()
        
        # Framebuffer (HDR)
        self.framebuffer = np.zeros((height, width, 3), dtype=np.float32)
        self.depth_buffer = np.full((height, width), np.inf, dtype=np.float32)
        
        logger.info(f"RenderEngine initialized: {width}x{height}")
    
    def clear(self, color: Tuple[float, float, float] = (0.0, 0.0, 0.0)) -> None:
        """Clear framebuffer with color."""
        self.framebuffer[:] = color
        self.depth_buffer[:] = np.inf
    
    def render_gradient(self,
                       top_color: Tuple[float, float, float],
                       bottom_color: Tuple[float, float, float],
                       direction: str = "vertical") -> np.ndarray:
        """
        Render gradient background.
        
        Args:
            top_color: Color at top/left
            bottom_color: Color at bottom/right
            direction: "vertical" or "horizontal"
            
        Returns:
            Gradient image array
        """
        result = np.zeros((self.height, self.width, 3), dtype=np.float32)
        
        if direction == "vertical":
            for y in range(self.height):
                t = y / (self.height - 1) if self.height > 1 else 0
                color = (
                    top_color[0] * (1 - t) + bottom_color[0] * t,
                    top_color[1] * (1 - t) + bottom_color[1] * t,
                    top_color[2] * (1 - t) + bottom_color[2] * t
                )
                result[y, :] = color
        else:
            for x in range(self.width):
                t = x / (self.width - 1) if self.width > 1 else 0
                color = (
                    top_color[0] * (1 - t) + bottom_color[0] * t,
                    top_color[1] * (1 - t) + bottom_color[1] * t,
                    top_color[2] * (1 - t) + bottom_color[2] * t
                )
                result[:, x] = color
        
        return result
    
    def render_sky_gradient(self,
                           zenith_color: Tuple[float, float, float],
                           horizon_color: Tuple[float, float, float],
                           horizon_y: int) -> np.ndarray:
        """
        Render sky gradient with horizon.
        
        Args:
            zenith_color: Color at zenith (top)
            horizon_color: Color at horizon
            horizon_y: Y coordinate of horizon line
            
        Returns:
            Sky gradient array
        """
        result = np.zeros((self.height, self.width, 3), dtype=np.float32)
        
        # Render sky portion (above horizon)
        for y in range(min(horizon_y, self.height)):
            # Non-linear gradient for realistic sky
            t = y / horizon_y if horizon_y > 0 else 0
            t = t ** 0.7  # Adjust curve for more realistic falloff
            
            color = (
                horizon_color[0] * (1 - t) + zenith_color[0] * t,
                horizon_color[1] * (1 - t) + zenith_color[1] * t,
                horizon_color[2] * (1 - t) + zenith_color[2] * t
            )
            result[y, :] = color
        
        return result
    
    def add_sun(self,
                image: np.ndarray,
                position: Tuple[int, int],
                color: Tuple[float, float, float],
                radius: int = 20,
                intensity: float = 1.0,
                glow_radius: int = 100) -> None:
        """
        Add sun with glow effect to image.
        
        Args:
            image: Image array to modify
            position: Sun center (x, y)
            color: Sun color (RGB 0-1)
            radius: Sun disk radius
            intensity: Brightness multiplier
            glow_radius: Glow effect radius
        """
        height, width = image.shape[:2]
        sun_x, sun_y = position
        
        # Add glow
        for dy in range(-glow_radius, glow_radius + 1):
            for dx in range(-glow_radius, glow_radius + 1):
                x = sun_x + dx
                y = sun_y + dy
                
                if 0 <= x < width and 0 <= y < height:
                    dist = math.sqrt(dx**2 + dy**2)
                    
                    if dist < glow_radius:
                        # Glow intensity falls off with distance
                        glow_intensity = max(0, 1 - dist / glow_radius)
                        glow_intensity = glow_intensity ** 0.5  # Soften
                        
                        # Brighter in center (sun disk)
                        if dist < radius:
                            glow_intensity = 1.0
                        
                        # Add to image
                        glow = np.array(color) * glow_intensity * intensity
                        image[y, x] = np.clip(image[y, x] + glow, 0, 1)
    
    def add_noise(self,
                  image: np.ndarray,
                  strength: float = 0.02) -> None:
        """
        Add subtle noise for texture.
        
        Args:
            image: Image array to modify
            strength: Noise strength (0-1)
        """
        noise = np.random.normal(0, strength, image.shape)
        image[:] = np.clip(image + noise, 0, 1)
    
    def apply_tone_mapping(self,
                          image: np.ndarray,
                          method: str = "aces") -> np.ndarray:
        """
        Apply tone mapping for HDR to LDR conversion.
        
        Args:
            image: HDR image array
            method: Tone mapping method ("aces", "reinhard", "filmic")
            
        Returns:
            Tone-mapped image
        """
        if method == "aces":
            # Simplified ACES tone mapping
            a = 2.51
            b = 0.03
            c = 2.43
            d = 0.59
            e = 0.14
            
            result = (image * (a * image + b)) / (image * (c * image + d) + e)
            return np.clip(result, 0, 1)
        
        elif method == "reinhard":
            # Reinhard tone mapping
            return image / (1 + image)
        
        elif method == "filmic":
            # Simplified filmic tone mapping
            x = np.maximum(0, image - 0.004)
            return (x * (6.2 * x + 0.5)) / (x * (6.2 * x + 1.7) + 0.06)
        
        else:
            # Simple clamp
            return np.clip(image, 0, 1)
    
    def apply_gamma_correction(self,
                              image: np.ndarray,
                              gamma: float = 2.2) -> np.ndarray:
        """
        Apply gamma correction.
        
        Args:
            image: Linear image array
            gamma: Gamma value
            
        Returns:
            Gamma-corrected image
        """
        return np.power(image, 1.0 / gamma)
    
    def to_8bit(self, image: np.ndarray) -> np.ndarray:
        """Convert float image to 8-bit."""
        return (np.clip(image, 0, 1) * 255).astype(np.uint8)
    
    def to_16bit(self, image: np.ndarray) -> np.ndarray:
        """Convert float image to 16-bit."""
        return (np.clip(image, 0, 1) * 65535).astype(np.uint16)
    
    def save_image(self,
                   image: np.ndarray,
                   path: str,
                   format: str = "PNG",
                   quality: int = 95) -> None:
        """
        Save image to file.
        
        Args:
            image: Image array (8-bit or 16-bit)
            path: Output file path
            format: Image format ("PNG", "JPEG", "TIFF")
            quality: JPEG quality (0-100)
        """
        if image.dtype == np.float32 or image.dtype == np.float64:
            image = self.to_8bit(image)
        
        img = Image.fromarray(image)
        
        if format.upper() == "JPEG":
            img.save(path, format=format, quality=quality)
        else:
            img.save(path, format=format)
        
        logger.info(f"Saved image: {path}")
    
    def create_depth_visualization(self,
                                  depth_map: np.ndarray) -> np.ndarray:
        """
        Create color visualization of depth map.
        
        Args:
            depth_map: Depth values (0-1 or 0-65535)
            
        Returns:
            Color visualization
        """
        # Normalize to 0-1
        if depth_map.dtype == np.uint16:
            depth_norm = depth_map.astype(np.float32) / 65535.0
        else:
            depth_norm = depth_map
        
        # Create color gradient (near = blue, far = red)
        result = np.zeros((*depth_norm.shape, 3), dtype=np.float32)
        result[:, :, 0] = depth_norm  # Red increases with distance
        result[:, :, 2] = 1.0 - depth_norm  # Blue decreases with distance
        result[:, :, 1] = 0.5  # Constant green
        
        return self.to_8bit(result)
    
    def apply_post_process(self,
                          image: np.ndarray,
                          effects: Dict[str, Any]) -> np.ndarray:
        """
        Apply post-processing effects.
        
        Args:
            image: Input image
            effects: Dictionary of effects to apply
            
        Returns:
            Processed image
        """
        result = image.copy()
        
        # Convert to PIL for some operations
        img_8bit = self.to_8bit(result)
        pil_img = Image.fromarray(img_8bit)
        
        # Apply blur
        if "blur" in effects:
            radius = effects["blur"]
            pil_img = pil_img.filter(ImageFilter.GaussianBlur(radius=radius))
        
        # Apply sharpening
        if "sharpen" in effects:
            pil_img = pil_img.filter(ImageFilter.SHARPEN)
        
        # Apply contrast
        if "contrast" in effects:
            from PIL import ImageEnhance
            factor = effects["contrast"]
            enhancer = ImageEnhance.Contrast(pil_img)
            pil_img = enhancer.enhance(factor)
        
        # Apply brightness
        if "brightness" in effects:
            from PIL import ImageEnhance
            factor = effects["brightness"]
            enhancer = ImageEnhance.Brightness(pil_img)
            pil_img = enhancer.enhance(factor)
        
        # Convert back to numpy
        result = np.array(pil_img).astype(np.float32) / 255.0
        
        # Vignette effect
        if "vignette" in effects:
            strength = effects["vignette"]
            result = self._apply_vignette(result, strength)
        
        return result
    
    def _apply_vignette(self,
                       image: np.ndarray,
                       strength: float = 0.5) -> np.ndarray:
        """
        Apply vignette effect (darken corners).
        
        Args:
            image: Input image
            strength: Vignette strength (0-1)
            
        Returns:
            Image with vignette
        """
        height, width = image.shape[:2]
        center_x, center_y = width / 2, height / 2
        
        # Create vignette mask
        y, x = np.ogrid[:height, :width]
        dist_from_center = np.sqrt((x - center_x)**2 + (y - center_y)**2)
        max_dist = np.sqrt(center_x**2 + center_y**2)
        
        # Normalize and invert (1 at center, 0 at corners)
        mask = 1 - (dist_from_center / max_dist) * strength
        mask = np.clip(mask, 0.3, 1.0)  # Don't darken completely
        
        # Apply mask
        if len(image.shape) == 3:
            mask = mask[:, :, np.newaxis]
        
        return image * mask
    
    def render_star_field(self,
                         count: int = 1000,
                         brightness_range: Tuple[float, float] = (0.3, 1.0)) -> np.ndarray:
        """
        Render star field for night sky.
        
        Args:
            count: Number of stars
            brightness_range: Min/max star brightness
            
        Returns:
            Star field image
        """
        result = np.zeros((self.height, self.width, 3), dtype=np.float32)
        
        for _ in range(count):
            # Random position
            x = np.random.randint(0, self.width)
            y = np.random.randint(0, self.height)
            
            # Random brightness
            brightness = np.random.uniform(*brightness_range)
            
            # Star color (slightly blue-white)
            color_temp = np.random.uniform(0.8, 1.0)
            r = brightness
            g = brightness * 0.95
            b = brightness * color_temp
            
            # Draw star (1-3 pixels)
            size = np.random.choice([1, 1, 1, 2, 2, 3])  # Mostly small stars
            
            for dy in range(-size//2, size//2 + 1):
                for dx in range(-size//2, size//2 + 1):
                    px, py = x + dx, y + dy
                    if 0 <= px < self.width and 0 <= py < self.height:
                        dist = math.sqrt(dx**2 + dy**2)
                        intensity = max(0, 1 - dist / (size / 2)) if size > 1 else 1
                        result[py, px] = np.maximum(result[py, px], 
                                                    [r * intensity, g * intensity, b * intensity])
        
        return result
    
    def render_cloud_layer(self,
                          base_image: np.ndarray,
                          cloud_density: float = 0.5,
                          cloud_color: Tuple[float, float, float] = (1.0, 1.0, 1.0),
                          horizon_y: int = None) -> np.ndarray:
        """
        Render simple cloud layer.
        
        Args:
            base_image: Base sky image
            cloud_density: Cloud coverage (0-1)
            cloud_color: Cloud color
            horizon_y: Horizon position (default: middle)
            
        Returns:
            Image with clouds
        """
        if horizon_y is None:
            horizon_y = self.height // 2
        
        result = base_image.copy()
        
        # Simple noise-based clouds
        from PIL import ImageFilter
        
        # Create noise texture
        noise = np.random.random((self.height // 4, self.width // 4))
        
        # Upsample
        noise_img = Image.fromarray((noise * 255).astype(np.uint8))
        noise_img = noise_img.resize((self.width, self.height), ImageFilter.BILINEAR)
        noise = np.array(noise_img).astype(np.float32) / 255.0
        
        # Threshold for clouds
        threshold = 1.0 - cloud_density * 0.7
        
        # Apply clouds only above horizon
        cloud_mask = (noise > threshold).astype(np.float32)
        
        # Soften edges
        cloud_mask_img = Image.fromarray((cloud_mask * 255).astype(np.uint8))
        cloud_mask_img = cloud_mask_img.filter(ImageFilter.GaussianBlur(radius=20))
        cloud_mask = np.array(cloud_mask_img).astype(np.float32) / 255.0
        
        # Apply to sky portion
        for y in range(horizon_y):
            cloud_intensity = cloud_mask[y, :] * 0.7  # Clouds are semi-transparent
            for c in range(3):
                result[y, :, c] = result[y, :, c] * (1 - cloud_intensity) + cloud_color[c] * cloud_intensity
        
        return result


# Example usage
if __name__ == "__main__":
    # Create render engine
    engine = RenderEngine(1920, 1080)
    
    # Render sky gradient
    zenith = (0.2, 0.4, 0.8)  # Blue
    horizon = (0.8, 0.6, 0.4)  # Orange-ish
    sky = engine.render_sky_gradient(zenith, horizon, 540)
    
    # Add sun
    engine.add_sun(sky, (960, 300), (1.0, 0.9, 0.7), radius=30, intensity=2.0)
    
    # Add noise
    engine.add_noise(sky, strength=0.01)
    
    # Tone mapping and gamma
    sky = engine.apply_tone_mapping(sky)
    sky = engine.apply_gamma_correction(sky)
    
    # Save
    engine.save_image(sky, "test_sky.png")
    print("Test sky saved to test_sky.png")
