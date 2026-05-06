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
            "style_prefix": self.style_prefix,
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
            errors.append(
                f"Invalid dimensions: {self.width}x{self.height}. Must be positive"
            )

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
    Configuration for LTX-2.3 image-to-video workflow.

    LTX-2.3 v1.1 converts static images into animated videos with synchronized audio
    using an optimized two-stage double-sampling process with spatial upscaling.
    Compatible with 6-8 GB VRAM via chunked feedforward and tiled VAE decode.

    Model updates (v1.1):
      - Diffusion: ltx-2.3-22b-distilled-1.1_transformer_only_mxfp8_block32.safetensors
      - Text encoder: gemma-3-12b-it-IQ4_XS.gguf + ltx-2.3_text_projection_bf16.safetensors
      - Video VAE: LTX23_video_vae_bf16.safetensors
      - Audio VAE: LTX23_audio_vae_bf16.safetensors
      - Upscaler: ltx-2.3-spatial-upscaler-x2-1.1.safetensors

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
    frame_rate: int = 25   # Must match in LTXVConditioning AND VHS_VideoCombine

    # Sampling settings
    noise_seed_stage1: int = 10
    noise_seed_stage2: int = 0
    cfg_scale: float = 1.0  # Distilled model requires CFG=1

    # LTXVScheduler parameters (Stage 1) — LTX 2.3 v1.1 optimized
    stage1_steps: int = 8          # Distilled = 8 steps (vs 25 previously)
    max_shift: float = 2.05
    base_shift: float = 0.95
    scheduler_stretch: bool = True
    scheduler_terminal: float = 0.1

    # Sigma schedules
    stage1_sigmas: str = (
        "1., 0.99375, 0.9875, 0.98125, 0.975, 0.909375, 0.725, 0.421875, 0.0"
    )
    stage2_sigmas: str = "0.909375, 0.725, 0.421875, 0.0"

    # Samplers — euler_ancestral gives better results than euler
    stage1_sampler: str = "euler_ancestral"
    stage2_sampler: str = "euler_ancestral"

    # Preprocessing
    img_compression: int = 33
    longer_edge_resize: int = 1536
    upscale_strength: float = 1.0

    # Model names (LTX 2.3 v1.1)
    diffusion_model: str = "ltx-2.3-22b-distilled-1.1_transformer_only_mxfp8_block32.safetensors"
    clip_name1: str = "gemma-3-12b-it-IQ4_XS.gguf"
    clip_name2: str = "ltx-2.3_text_projection_bf16.safetensors"
    video_vae_name: str = "LTX23_video_vae_bf16.safetensors"
    audio_vae_name: str = "LTX23_audio_vae_bf16.safetensors"
    upscale_model: str = "ltx-2.3-spatial-upscaler-x2-1.1.safetensors"

    # VRAM optimization
    chunk_feedforward: int = 2       # LTXVChunkFeedForward chunks (reduces VRAM ~30%)
    chunk_dim_threshold: int = 4096  # LTXVChunkFeedForward dim_threshold
    use_tiled_decode: bool = True    # VAEDecodeTiled instead of VAEDecode
    tile_size: int = 384             # VAEDecodeTiled tile_size
    tile_overlap: int = 64           # VAEDecodeTiled overlap
    temporal_size: int = 4096        # VAEDecodeTiled temporal_size

    # Audio generation (new in LTX 2.3)
    enable_audio: bool = True        # Generate audio track alongside video

    # Output
    output_format: str = "video/h264-mp4"
    output_crf: int = 19             # H.264 quality (lower = better)
    output_pix_fmt: str = "yuv420p"

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
            # LTXVScheduler params (LTX 2.3 v1.1)
            "stage1_steps": self.stage1_steps,
            "max_shift": self.max_shift,
            "base_shift": self.base_shift,
            "scheduler_stretch": self.scheduler_stretch,
            "scheduler_terminal": self.scheduler_terminal,
            # Sigma schedules
            "stage1_sigmas": self.stage1_sigmas,
            "stage2_sigmas": self.stage2_sigmas,
            # Samplers
            "stage1_sampler": self.stage1_sampler,
            "stage2_sampler": self.stage2_sampler,
            # Preprocessing
            "img_compression": self.img_compression,
            "longer_edge_resize": self.longer_edge_resize,
            "upscale_strength": self.upscale_strength,
            # Model names (LTX 2.3 v1.1)
            "diffusion_model": self.diffusion_model,
            "clip_name1": self.clip_name1,
            "clip_name2": self.clip_name2,
            "video_vae_name": self.video_vae_name,
            "audio_vae_name": self.audio_vae_name,
            "upscale_model": self.upscale_model,
            # VRAM optimization
            "chunk_feedforward": self.chunk_feedforward,
            "chunk_dim_threshold": self.chunk_dim_threshold,
            "use_tiled_decode": self.use_tiled_decode,
            "tile_size": self.tile_size,
            "tile_overlap": self.tile_overlap,
            "temporal_size": self.temporal_size,
            # Audio
            "enable_audio": self.enable_audio,
            # Output
            "output_format": self.output_format,
            "output_crf": self.output_crf,
            "output_pix_fmt": self.output_pix_fmt,
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
            errors.append(
                f"Invalid dimensions: {self.resize_width}x{self.resize_height}. Must be positive"
            )

        # Validate frame count
        if self.frame_count < 1:
            errors.append(
                f"Invalid frame count: {self.frame_count}. Must be at least 1"
            )

        # Validate frame rate (LTX 2.3 trained at 25 fps)
        if self.frame_rate < 1:
            errors.append(f"Invalid frame rate: {self.frame_rate}. Must be at least 1")
        if self.frame_rate != 25:
            errors.append(
                f"Warning: LTX 2.3 is trained at 25 fps. Got {self.frame_rate} fps."
            )

        # Validate CFG scale (distilled model requires CFG=1)
        if self.cfg_scale < 0:
            errors.append(f"Invalid CFG scale: {self.cfg_scale}. Must be non-negative")
        if self.cfg_scale not in [0.0, 1.0]:
            errors.append(
                f"Warning: LTX 2.3 distilled requires cfg_scale=1.0. Got {self.cfg_scale}."
            )

        # Validate resize method
        valid_methods = ["lanczos", "bilinear", "bicubic", "nearest"]
        if self.resize_method not in valid_methods:
            errors.append(
                f"Invalid resize method: {self.resize_method}. Must be one of {valid_methods}"
            )

        # Validate crop type
        valid_crops = ["center", "top", "bottom", "left", "right"]
        if self.crop_type not in valid_crops:
            errors.append(
                f"Invalid crop type: {self.crop_type}. Must be one of {valid_crops}"
            )

        # Validate sampler names
        valid_samplers = ["euler", "euler_ancestral", "dpm_2", "dpm_2_ancestral", "gradient_estimation"]
        if self.stage1_sampler not in valid_samplers:
            errors.append(
                f"Invalid stage1 sampler: {self.stage1_sampler}. Recommended: euler_ancestral"
            )

        # Validate LTXVScheduler params
        if self.stage1_steps < 1:
            errors.append(f"Invalid stage1_steps: {self.stage1_steps}. Must be >= 1")
        if not 0.0 <= self.scheduler_terminal <= 1.0:
            errors.append(
                f"scheduler_terminal must be 0.0-1.0: {self.scheduler_terminal}"
            )

        # Validate chunking
        if self.chunk_feedforward < 1:
            errors.append(f"chunk_feedforward must be >= 1: {self.chunk_feedforward}")

        return errors
