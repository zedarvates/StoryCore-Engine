"""
Model Manager for ComfyUI Desktop Integration.

Handles automatic model downloads, validation, and lifecycle management.
"""

import asyncio
import hashlib
import logging
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Optional, Callable
from enum import Enum
import aiohttp
import time


logger = logging.getLogger(__name__)


class ModelType(Enum):
    """Model types"""
    CHECKPOINT = "checkpoint"
    VAE = "vae"
    LORA = "lora"
    CLIP = "clip"
    TEXT_ENCODER = "text_encoder"
    UNET = "unet"


@dataclass
class ModelInfo:
    """Information about a required model"""
    name: str
    type: ModelType
    url: str
    file_size: int  # in bytes
    sha256_hash: str
    priority: int  # Lower number = higher priority
    required: bool
    description: str
    filename: str = ""  # Will be derived from URL if not provided
    
    def __post_init__(self):
        """Derive filename from URL if not provided"""
        if not self.filename:
            self.filename = self.url.split('/')[-1]


@dataclass
class DownloadProgress:
    """Progress information for a model download"""
    model_name: str
    total_bytes: int
    downloaded_bytes: int
    speed_mbps: float
    eta_seconds: int
    status: str  # "downloading", "paused", "completed", "failed"
    error_message: Optional[str] = None
    
    @property
    def percentage(self) -> float:
        """Calculate download percentage"""
        return (self.downloaded_bytes / self.total_bytes) * 100 if self.total_bytes > 0 else 0


class ModelManager:
    """
    Manages AI model downloads, validation, and lifecycle.
    
    Handles automatic detection of missing models, sequential downloads
    with priority ordering, progress tracking, and validation.
    """
    
    # Required models registry with priority ordering
    REQUIRED_MODELS: List[ModelInfo] = [
        # Z-Image Turbo models (highest priority - default workflow)
        ModelInfo(
            name="Z-Image Turbo",
            type=ModelType.UNET,
            url="https://huggingface.co/stabilityai/stable-diffusion-3-medium/resolve/main/sd3_medium.safetensors",  # Placeholder URL
            file_size=5_000_000_000,  # ~5 GB
            sha256_hash="",  # To be filled with actual hash
            priority=1,
            required=True,
            description="Z-Image Turbo diffusion model for fast, high-quality generation",
            filename="z_image_turbo_bf16.safetensors"
        ),
        ModelInfo(
            name="Qwen 3 4B",
            type=ModelType.CLIP,
            url="https://huggingface.co/Qwen/Qwen-VL/resolve/main/qwen.safetensors",  # Placeholder URL
            file_size=4_000_000_000,  # ~4 GB
            sha256_hash="",  # To be filled with actual hash
            priority=2,
            required=True,
            description="Qwen 3 4B CLIP text encoder for Z-Image Turbo",
            filename="qwen_3_4b.safetensors"
        ),
        ModelInfo(
            name="AE VAE",
            type=ModelType.VAE,
            url="https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/ae.safetensors",
            file_size=335_000_000,  # 335 MB
            sha256_hash="",  # To be filled with actual hash
            priority=3,
            required=True,
            description="Autoencoder VAE for Z-Image Turbo",
            filename="ae.safetensors"
        ),
        # FLUX models (alternative workflow)
        ModelInfo(
            name="FLUX Dev",
            type=ModelType.CHECKPOINT,
            url="https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/flux1-dev.safetensors",
            file_size=11_900_000_000,  # 11.9 GB
            sha256_hash="",  # To be filled with actual hash
            priority=4,
            required=False,
            description="FLUX Dev checkpoint model for high-quality image generation",
            filename="flux1-dev.safetensors"
        ),
        ModelInfo(
            name="T5XXL",
            type=ModelType.TEXT_ENCODER,
            url="https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/t5xxl_fp16.safetensors",
            file_size=9_800_000_000,  # 9.8 GB
            sha256_hash="",
            priority=5,
            required=False,
            description="T5XXL text encoder for FLUX models",
            filename="t5xxl_fp16.safetensors"
        ),
        ModelInfo(
            name="CLIP",
            type=ModelType.CLIP,
            url="https://huggingface.co/comfyanonymous/flux_text_encoders/resolve/main/clip_l.safetensors",
            file_size=246_000_000,  # 246 MB
            sha256_hash="",
            priority=6,
            required=False,
            description="CLIP text encoder for FLUX models",
            filename="clip_l.safetensors"
        ),
        ModelInfo(
            name="VAE",
            type=ModelType.VAE,
            url="https://huggingface.co/black-forest-labs/FLUX.1-dev/resolve/main/ae.safetensors",
            file_size=335_000_000,  # 335 MB
            sha256_hash="",
            priority=7,
            required=False,
            description="VAE autoencoder for FLUX models (duplicate of AE VAE)",
            filename="ae_flux.safetensors"
        ),
        ModelInfo(
            name="SDXL Base",
            type=ModelType.CHECKPOINT,
            url="https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors",
            file_size=6_900_000_000,  # 6.9 GB
            sha256_hash="",
            priority=8,
            required=False,
            description="SDXL Base checkpoint for fallback generation",
            filename="sd_xl_base_1.0.safetensors"
        ),
        ModelInfo(
            name="LTX Video",
            type=ModelType.CHECKPOINT,
            url="https://huggingface.co/Lightricks/LTX-Video/resolve/main/ltx-video-2b-v0.9.safetensors",
            file_size=9_100_000_000,  # 9.1 GB
            sha256_hash="",
            priority=9,
            required=False,
            description="LTX Video model for video generation",
            filename="ltx-video-2b-v0.9.safetensors"
        ),
        # LTX-2 image-to-video models
        ModelInfo(
            name="LTX-2 19B Distilled",
            type=ModelType.CHECKPOINT,
            url="https://huggingface.co/Lightricks/LTX-2/resolve/main/ltx-2-19b-distilled.safetensors",  # Placeholder URL
            file_size=19_000_000_000,  # ~19 GB
            sha256_hash="",  # To be filled with actual hash
            priority=10,
            required=False,
            description="LTX-2 19B distilled checkpoint for image-to-video generation with audio",
            filename="ltx-2-19b-distilled.safetensors"
        ),
        ModelInfo(
            name="Gemma 3 12B IT FP4",
            type=ModelType.TEXT_ENCODER,
            url="https://huggingface.co/Lightricks/LTX-2/resolve/main/gemma_3_12B_it_fp4_mixed.safetensors",  # Placeholder URL
            file_size=12_000_000_000,  # ~12 GB
            sha256_hash="",  # To be filled with actual hash
            priority=11,
            required=False,
            description="Gemma 3 12B text encoder for LTX-2 video generation",
            filename="gemma_3_12B_it_fp4_mixed.safetensors"
        ),
        ModelInfo(
            name="LTX-2 Spatial Upscaler",
            type=ModelType.CHECKPOINT,
            url="https://huggingface.co/Lightricks/LTX-2/resolve/main/ltx-2-spatial-upscaler-x2-1.0.safetensors",  # Placeholder URL
            file_size=2_000_000_000,  # ~2 GB
            sha256_hash="",  # To be filled with actual hash
            priority=12,
            required=False,
            description="LTX-2 spatial upscaler for 2x resolution enhancement",
            filename="ltx-2-spatial-upscaler-x2-1.0.safetensors"
        ),
    ]
    
    def __init__(self, comfyui_models_dir: Path):
        """
        Initialize ModelManager.
        
        Args:
            comfyui_models_dir: Path to ComfyUI's models directory
        """
        self.models_dir = comfyui_models_dir
        self.downloads: Dict[str, DownloadProgress] = {}
        self._download_tasks: Dict[str, asyncio.Task] = {}
        self._pause_events: Dict[str, asyncio.Event] = {}
        
        # Ensure model directories exist
        self._ensure_model_directories()
    
    def _ensure_model_directories(self):
        """Create model subdirectories if they don't exist"""
        subdirs = {
            ModelType.CHECKPOINT: "checkpoints",
            ModelType.VAE: "vae",
            ModelType.LORA: "loras",
            ModelType.CLIP: "clip",
            ModelType.TEXT_ENCODER: "text_encoders",
            ModelType.UNET: "unet"
        }
        
        for model_type, subdir in subdirs.items():
            dir_path = self.models_dir / subdir
            dir_path.mkdir(parents=True, exist_ok=True)
            logger.debug(f"Ensured directory exists: {dir_path}")
    
    def _get_model_path(self, model_info: ModelInfo) -> Path:
        """Get the full path where a model should be stored"""
        subdirs = {
            ModelType.CHECKPOINT: "checkpoints",
            ModelType.VAE: "vae",
            ModelType.LORA: "loras",
            ModelType.CLIP: "clip",
            ModelType.TEXT_ENCODER: "text_encoders",
            ModelType.UNET: "unet"
        }
        
        subdir = subdirs.get(model_info.type, "")
        return self.models_dir / subdir / model_info.filename
    
    def check_required_models(self) -> List[ModelInfo]:
        """
        Check which required models are missing.
        
        Returns:
            List of ModelInfo for missing models
        """
        missing_models = []
        
        for model_info in self.REQUIRED_MODELS:
            if not model_info.required:
                continue
                
            model_path = self._get_model_path(model_info)
            
            if not model_path.exists():
                logger.info(f"Missing required model: {model_info.name} at {model_path}")
                missing_models.append(model_info)
            else:
                logger.debug(f"Found model: {model_info.name} at {model_path}")
        
        return missing_models
    
    async def download_model(
        self,
        model_info: ModelInfo,
        progress_callback: Optional[Callable[[DownloadProgress], None]] = None,
        max_retries: int = 3
    ) -> bool:
        """
        Download a single model with progress tracking and retry logic.
        
        Args:
            model_info: Information about the model to download
            progress_callback: Optional callback for progress updates
            max_retries: Maximum number of retry attempts (default: 3)
            
        Returns:
            True if download succeeded, False otherwise
        """
        for attempt in range(max_retries):
            try:
                success = await self._download_model_attempt(model_info, progress_callback, attempt)
                if success:
                    return True
                
                # If not successful and not last attempt, wait with exponential backoff
                if attempt < max_retries - 1:
                    backoff_seconds = 2 ** attempt
                    logger.warning(
                        f"Download attempt {attempt + 1}/{max_retries} failed for {model_info.name}. "
                        f"Retrying in {backoff_seconds} seconds..."
                    )
                    await asyncio.sleep(backoff_seconds)
                    
            except Exception as e:
                logger.error(f"Exception during download attempt {attempt + 1} for {model_info.name}: {str(e)}")
                
                if attempt < max_retries - 1:
                    backoff_seconds = 2 ** attempt
                    logger.info(f"Retrying in {backoff_seconds} seconds...")
                    await asyncio.sleep(backoff_seconds)
                else:
                    # Final attempt failed
                    if model_info.name in self.downloads:
                        self.downloads[model_info.name].status = "failed"
                        self.downloads[model_info.name].error_message = f"All {max_retries} attempts failed: {str(e)}"
                        if progress_callback:
                            progress_callback(self.downloads[model_info.name])
                    return False
        
        # All retries exhausted
        logger.error(f"Failed to download {model_info.name} after {max_retries} attempts")
        return False
    
    async def _download_model_attempt(
        self,
        model_info: ModelInfo,
        progress_callback: Optional[Callable[[DownloadProgress], None]] = None,
        attempt_number: int = 0
    ) -> bool:
        """
        Single download attempt for a model.
        
        Args:
            model_info: Information about the model to download
            progress_callback: Optional callback for progress updates
            attempt_number: Current attempt number (for logging)
            
        Returns:
            True if download succeeded, False otherwise
        """
        model_path = self._get_model_path(model_info)
        
        # Initialize progress tracking
        progress = DownloadProgress(
            model_name=model_info.name,
            total_bytes=model_info.file_size,
            downloaded_bytes=0,
            speed_mbps=0.0,
            eta_seconds=0,
            status="downloading"
        )
        self.downloads[model_info.name] = progress
        
        # Create pause event for this download
        pause_event = asyncio.Event()
        pause_event.set()  # Not paused initially
        self._pause_events[model_info.name] = pause_event
        
        try:
            if attempt_number > 0:
                logger.info(f"Retry attempt {attempt_number + 1} for {model_info.name} from {model_info.url}")
            else:
                logger.info(f"Starting download: {model_info.name} from {model_info.url}")
            
            async with aiohttp.ClientSession() as session:
                async with session.get(model_info.url) as response:
                    if response.status != 200:
                        error_msg = f"HTTP {response.status} when downloading {model_info.name}"
                        logger.error(error_msg)
                        progress.status = "failed"
                        progress.error_message = error_msg
                        if progress_callback:
                            progress_callback(progress)
                        return False
                    
                    # Create temporary file
                    temp_path = model_path.with_suffix('.tmp')
                    
                    start_time = time.time()
                    last_update_time = start_time
                    last_downloaded = 0
                    
                    with open(temp_path, 'wb') as f:
                        async for chunk in response.content.iter_chunked(1024 * 1024):  # 1MB chunks
                            # Wait if paused
                            await pause_event.wait()
                            
                            f.write(chunk)
                            progress.downloaded_bytes += len(chunk)
                            
                            # Update speed and ETA every second
                            current_time = time.time()
                            if current_time - last_update_time >= 1.0:
                                elapsed = current_time - last_update_time
                                bytes_since_last = progress.downloaded_bytes - last_downloaded
                                
                                # Calculate speed in MB/s
                                progress.speed_mbps = (bytes_since_last / elapsed) / (1024 * 1024)
                                
                                # Calculate ETA
                                remaining_bytes = progress.total_bytes - progress.downloaded_bytes
                                if progress.speed_mbps > 0:
                                    progress.eta_seconds = int(remaining_bytes / (progress.speed_mbps * 1024 * 1024))
                                
                                last_update_time = current_time
                                last_downloaded = progress.downloaded_bytes
                                
                                # Call progress callback
                                if progress_callback:
                                    progress_callback(progress)
                    
                    # Move temp file to final location
                    temp_path.rename(model_path)
                    
                    progress.status = "completed"
                    progress.downloaded_bytes = progress.total_bytes
                    progress.percentage  # Update percentage
                    
                    if progress_callback:
                        progress_callback(progress)
                    
                    logger.info(f"Successfully downloaded: {model_info.name}")
                    return True
                    
        except Exception as e:
            error_msg = f"Error downloading {model_info.name}: {str(e)}"
            logger.error(error_msg, exc_info=True)
            progress.status = "failed"
            progress.error_message = error_msg
            if progress_callback:
                progress_callback(progress)
            return False
        finally:
            # Cleanup
            if model_info.name in self._pause_events:
                del self._pause_events[model_info.name]
    
    async def download_all_missing(
        self,
        progress_callback: Optional[Callable[[str, DownloadProgress], None]] = None
    ) -> Dict[str, bool]:
        """
        Download all missing required models sequentially with priority ordering.
        
        Args:
            progress_callback: Optional callback for progress updates (model_name, progress)
            
        Returns:
            Dictionary mapping model names to success status
        """
        missing_models = self.check_required_models()
        
        if not missing_models:
            logger.info("All required models are already present")
            return {}
        
        # Sort by priority (lower number = higher priority)
        missing_models.sort(key=lambda m: m.priority)
        
        logger.info(f"Downloading {len(missing_models)} missing models in priority order")
        
        results = {}
        
        for model_info in missing_models:
            logger.info(f"Downloading model {model_info.priority}/{len(missing_models)}: {model_info.name}")
            
            # Wrap callback to include model name
            def wrapped_callback(progress: DownloadProgress):
                if progress_callback:
                    progress_callback(model_info.name, progress)
            
            success = await self.download_model(model_info, wrapped_callback)
            results[model_info.name] = success
            
            if not success:
                logger.warning(f"Failed to download {model_info.name}, continuing with next model")
        
        return results
    
    async def validate_model(self, model_path: Path, expected_hash: str) -> bool:
        """
        Validate model file integrity using SHA256 hash.
        
        Args:
            model_path: Path to the model file
            expected_hash: Expected SHA256 hash
            
        Returns:
            True if validation passes, False otherwise
        """
        if not model_path.exists():
            logger.error(f"Model file does not exist: {model_path}")
            return False
        
        # Check file size first (quick check)
        file_size = model_path.stat().st_size
        logger.debug(f"Validating model {model_path.name}, size: {file_size} bytes")
        
        # If no hash provided, skip hash validation
        if not expected_hash:
            logger.warning(f"No hash provided for {model_path.name}, skipping hash validation")
            return True
        
        # Calculate SHA256 hash
        logger.info(f"Calculating SHA256 hash for {model_path.name}...")
        sha256_hash = hashlib.sha256()
        
        try:
            with open(model_path, 'rb') as f:
                # Read in chunks to handle large files
                for chunk in iter(lambda: f.read(4096 * 1024), b''):  # 4MB chunks
                    sha256_hash.update(chunk)
            
            calculated_hash = sha256_hash.hexdigest()
            
            if calculated_hash == expected_hash:
                logger.info(f"Model validation passed: {model_path.name}")
                return True
            else:
                logger.error(f"Hash mismatch for {model_path.name}")
                logger.error(f"Expected: {expected_hash}")
                logger.error(f"Got: {calculated_hash}")
                return False
                
        except Exception as e:
            logger.error(f"Error validating model {model_path.name}: {str(e)}", exc_info=True)
            return False
    
    def get_download_progress(self, model_name: str) -> Optional[DownloadProgress]:
        """
        Get current download progress for a model.
        
        Args:
            model_name: Name of the model
            
        Returns:
            DownloadProgress if download is active, None otherwise
        """
        return self.downloads.get(model_name)
    
    async def pause_download(self, model_name: str):
        """
        Pause an in-progress download.
        
        Args:
            model_name: Name of the model to pause
        """
        if model_name in self._pause_events:
            self._pause_events[model_name].clear()
            if model_name in self.downloads:
                self.downloads[model_name].status = "paused"
            logger.info(f"Paused download: {model_name}")
    
    async def resume_download(self, model_name: str):
        """
        Resume a paused download.
        
        Args:
            model_name: Name of the model to resume
        """
        if model_name in self._pause_events:
            self._pause_events[model_name].set()
            if model_name in self.downloads:
                self.downloads[model_name].status = "downloading"
            logger.info(f"Resumed download: {model_name}")
