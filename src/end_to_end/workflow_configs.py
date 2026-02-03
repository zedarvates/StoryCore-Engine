"""
Workflow Configuration Classes for ComfyUI Integration.

This module defines configuration dataclasses for different ComfyUI workflows,
including Z-Image Turbo and LTX-2 image-to-video.
"""

from dataclasses import dataclass
from typing import Dict, Any, Tuple


@dataclass
class ZImageTurboConfig:
    """
    Configuration for Z-Image Turbo workflow.
    
    Z-Image Turbo is a fast, high-quality image generation workflow that uses
    4 steps with res_multistep sampler for rapid generation.
    
    Validates: Requirements 13.6, 13.7, 13.8, 13.9
    """
    width: int = 784
    height: int = 1024
    steps: int = 4
    cfg: float = 1.0
    sampler_name: str = "res_multistep"
    scheduler: str = "simple"
    shift: int = 3
    style_prefix: str = ""  # Optional style prefix like "Pixel art style,"
    
    def to_workflow_params(self) -> Dict[str, Any]:
        """
        Convert configuration to workflow parameters.
        
        Returns:
            Dictionary of workflow parameters
        """
        return {
            "width": self.width,
            "height": self.height,
            "steps": self.steps,
            "cfg": self.cfg,
            "sampler_name": self.sampler_name,
            "scheduler": self.scheduler,
            "shift": self.shift,
            "style_prefix": self.style_prefix
        }
    
    @property
    def resolution(self) -> Tuple[int, int]:
        """Get resolution as tuple (width, height)"""
        return (self.width, self.height)
    
    def validate(self) -> list[str]:
        """
        Validate configuration values.
        
        Returns:
            List of validation errors (empty if valid)
        """
        errors = []
        
        # Validate dimensions
        if self.width <= 0 or self.height <= 0:
            errors.append(f"Invalid dimensions: {self.width}x{self.height}. Must be positive")
        
        # Validate steps
        if self.steps < 1:
            errors.append(f"Invalid steps: {self.steps}. Must be at least 1")
        
        # Validate CFG
        if self.cfg < 0:
            errors.append(f"Invalid CFG: {self.cfg}. Must be non-negative")
        
        # Validate shift
        if self.shift < 0:
            errors.append(f"Invalid shift: {self.shift}. Must be non-negative")
        
        return errors


@dataclass
class LTX2ImageToVideoConfig:
    """
    Configuration for LTX-2 image-to-video workflow.
    
    LTX-2 converts static images into animated videos with synchronized audio
    using a two-stage generation process (latent generation + spatial upscaling).
    
    Validates: Requirements 14.5, 14.6, 14.10, 14.13
    """
    # Input image settings
    input_image_path: str = ""
    resize_width: int = 1280
    resize_height: int = 720
    resize_method: str = "lanczos"
    crop_type: str = "center"
    
    # Video generation settings
    frame_count: int = 121  # ~4.8 seconds at 25fps
    frame_rate: int = 25
    
    # Sampling settings
    noise_seed_stage1: int = 10
    noise_seed_stage2: int = 0
    cfg_scale: float = 1.0
    
    # Sigma schedules
    stage1_sigmas: str = "1., 0.99375, 0.9875, 0.98125, 0.975, 0.909375, 0.725, 0.421875, 0.0"
    stage2_sigmas: str = "0.909375, 0.725, 0.421875, 0.0"
    
    # Samplers
    stage1_sampler: str = "euler"
    stage2_sampler: str = "gradient_estimation"
    
    # Preprocessing
    img_compression: int = 33
    longer_edge_resize: int = 1536
    upscale_strength: float = 1.0
    
    def to_workflow_params(self) -> Dict[str, Any]:
        """
        Convert configuration to workflow parameters.
        
        Returns:
            Dictionary of workflow parameters
        """
        return {
            "input_image": self.input_image_path,
            "resize_width": self.resize_width,
            "resize_height": self.resize_height,
            "resize_method": self.resize_method,
            "crop_type": self.crop_type,
            "frame_count": self.frame_count,
            "frame_rate": self.frame_rate,
            "noise_seed_stage1": self.noise_seed_stage1,
            "noise_seed_stage2": self.noise_seed_stage2,
            "cfg_scale": self.cfg_scale,
            "stage1_sigmas": self.stage1_sigmas,
            "stage2_sigmas": self.stage2_sigmas,
            "stage1_sampler": self.stage1_sampler,
            "stage2_sampler": self.stage2_sampler,
            "img_compression": self.img_compression,
            "longer_edge_resize": self.longer_edge_resize,
            "upscale_strength": self.upscale_strength
        }
    
    @property
    def video_duration_seconds(self) -> float:
        """
        Calculate video duration in seconds.
        
        Returns:
            Duration in seconds
        """
        return self.frame_count / self.frame_rate
    
    @property
    def resolution(self) -> Tuple[int, int]:
        """Get resolution as tuple (width, height)"""
        return (self.resize_width, self.resize_height)
    
    def validate(self) -> list[str]:
        """
        Validate configuration values.
        
        Returns:
            List of validation errors (empty if valid)
        """
        errors = []
        
        # Validate input image path
        if not self.input_image_path:
            errors.append("Input image path is required")
        
        # Validate dimensions
        if self.resize_width <= 0 or self.resize_height <= 0:
            errors.append(f"Invalid dimensions: {self.resize_width}x{self.resize_height}. Must be positive")
        
        # Validate frame count
        if self.frame_count < 1:
            errors.append(f"Invalid frame count: {self.frame_count}. Must be at least 1")
        
        # Validate frame rate
        if self.frame_rate < 1:
            errors.append(f"Invalid frame rate: {self.frame_rate}. Must be at least 1")
        
        # Validate CFG scale
        if self.cfg_scale < 0:
            errors.append(f"Invalid CFG scale: {self.cfg_scale}. Must be non-negative")
        
        # Validate resize method
        valid_methods = ["lanczos", "bilinear", "bicubic", "nearest"]
        if self.resize_method not in valid_methods:
            errors.append(f"Invalid resize method: {self.resize_method}. Must be one of {valid_methods}")
        
        # Validate crop type
        valid_crops = ["center", "top", "bottom", "left", "right"]
        if self.crop_type not in valid_crops:
            errors.append(f"Invalid crop type: {self.crop_type}. Must be one of {valid_crops}")
        
        return errors
