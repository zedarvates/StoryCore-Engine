#!/usr/bin/env python3
"""
Auto Model Downloader for StoryCore-Engine ComfyUI Integration
Automatically downloads required models when ComfyUI starts up.
"""

import os
import sys
import asyncio
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import aiohttp
import json
from concurrent.futures import ThreadPoolExecutor

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@dataclass
class ModelInfo:
    """Information about a required model."""
    name: str
    url: str
    subfolder: str
    expected_size_mb: int
    required: bool = True

class AutoModelDownloader:
    """
    Automatically downloads required models for ComfyUI when StoryCore starts.
    Integrates with the existing ComfyUI installation and model management.
    """

    def __init__(self, comfyui_path: Optional[str] = None):
        """Initialize the auto model downloader."""
        self.comfyui_path = Path(comfyui_path) if comfyui_path else self._find_comfyui_path()
        self.models_path = self.comfyui_path / "models"
        self.required_models = self._get_required_models()

        logger.info(f"Auto Model Downloader initialized for ComfyUI at: {self.comfyui_path}")

    def _find_comfyui_path(self) -> Path:
        """Find the ComfyUI installation path."""
        # Check common locations
        possible_paths = [
            Path.cwd() / "comfyui_portable" / "ComfyUI",
            Path.cwd().parent / "comfyui_portable" / "ComfyUI",
            Path.home() / "ComfyUI",
        ]

        for path in possible_paths:
            if (path / "main.py").exists():
                return path

        # Default fallback
        return Path.cwd() / "comfyui_portable" / "ComfyUI"

    def _get_required_models(self) -> List[ModelInfo]:
        """Get the list of required models for StoryCore FLUX.2 pipeline."""
        return [
            # Core FLUX.2 models (required)
            ModelInfo(
                name="flux2-vae.safetensors",
                url="https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/vae/flux2-vae.safetensors",
                subfolder="vae",
                expected_size_mb=335,
                required=True
            ),
            ModelInfo(
                name="flux2_dev_fp8mixed.safetensors",
                url="https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/diffusion_models/flux2_dev_fp8mixed.safetensors",
                subfolder="checkpoints",
                expected_size_mb=3584,
                required=True
            ),
            ModelInfo(
                name="mistral_3_small_flux2_bf16.safetensors",
                url="https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/text_encoders/mistral_3_small_flux2_bf16.safetensors",
                subfolder="clip",
                expected_size_mb=7372,
                required=True
            ),

            # New FLUX.2-klein models (lightweight alternatives)
            ModelInfo(
                name="flux2-klein.safetensors",
                url="https://huggingface.co/black-forest-labs/FLUX.2-klein-9B/resolve/main/flux2-klein.safetensors",
                subfolder="checkpoints",
                expected_size_mb=9500,  # ~9.3GB actual size
                required=False  # Optional lightweight alternative
            ),

            # Enhanced text encoders
            ModelInfo(
                name="t5xxl_fp16.safetensors",
                url="https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/text_encoders/t5xxl_fp16.safetensors",
                subfolder="clip",
                expected_size_mb=9450,
                required=False  # Optional for basic FLUX.2
            ),

            # Additional VAE variants (optional)
            ModelInfo(
                name="ae.safetensors",
                url="https://huggingface.co/black-forest-labs/FLUX.2-klein-9B/resolve/main/ae.safetensors",
                subfolder="vae",
                expected_size_mb=335,
                required=False  # Alternative VAE
            ),

            # LTX-2 Video Generation Models (Optional - Video Generation)
            ModelInfo(
                name="ltx-2-19b-dev.safetensors",
                url="https://huggingface.co/Lightricks/LTX-2/resolve/main/ltx-2-19b-dev.safetensors",
                subfolder="checkpoints",
                expected_size_mb=38000,  # ~37GB
                required=False  # Video generation model
            ),
            ModelInfo(
                name="ltx-2-19b-dev-fp8.safetensors",
                url="https://huggingface.co/Lightricks/LTX-2/resolve/main/ltx-2-19b-dev-fp8.safetensors",
                subfolder="checkpoints",
                expected_size_mb=9500,  # ~9.3GB
                required=False  # Optimized FP8 version
            ),
            ModelInfo(
                name="gemma_3_12B_it.safetensors",
                url="https://huggingface.co/Comfy-Org/ltx-2/resolve/main/split_files/text_encoders/gemma_3_12B_it.safetensors",
                subfolder="text_encoders",
                expected_size_mb=24500,  # ~24GB
                required=False  # LTX-2 text encoder
            ),
            ModelInfo(
                name="ltx-2-19b-distilled-lora-384.safetensors",
                url="https://huggingface.co/Lightricks/LTX-2/resolve/main/ltx-2-19b-distilled-lora-384.safetensors",
                subfolder="loras",
                expected_size_mb=150,  # ~150MB
                required=False  # Distilled LoRA
            ),
            ModelInfo(
                name="ltx-2-19b-lora-camera-control-dolly-left.safetensors",
                url="https://huggingface.co/Lightricks/LTX-2-19b-LoRA-Camera-Control-Dolly-Left/resolve/main/ltx-2-19b-lora-camera-control-dolly-left.safetensors",
                subfolder="loras",
                expected_size_mb=150,  # ~150MB
                required=False  # Camera control LoRA
            ),
            ModelInfo(
                name="ltx-2-spatial-upscaler-x2-1.0.safetensors",
                url="https://huggingface.co/Lightricks/LTX-2/resolve/main/ltx-2-spatial-upscaler-x2-1.0.safetensors",
                subfolder="latent_upscale_models",
                expected_size_mb=500,  # ~500MB
                required=False  # Spatial upscaler
            ),
        ]

    async def check_and_download_models(self) -> Tuple[bool, List[str]]:
        """
        Check for missing models and download them automatically.

        Returns:
            Tuple of (success, list of downloaded models)
        """
        logger.info("🔍 Checking for required models...")

        missing_models = []
        existing_models = []

        # Check each required model
        for model in self.required_models:
            model_path = self.models_path / model.subfolder / model.name

            if model_path.exists():
                # Verify file size
                actual_size_mb = model_path.stat().st_size / (1024 * 1024)
                size_tolerance = model.expected_size_mb * 0.1  # 10% tolerance

                if abs(actual_size_mb - model.expected_size_mb) <= size_tolerance:
                    existing_models.append(model.name)
                    logger.info(f"✅ {model.name} ({actual_size_mb:.1f}MB)")
                else:
                    logger.warning(f"⚠️  {model.name} size mismatch ({actual_size_mb:.1f}MB vs {model.expected_size_mb}MB)")
                    missing_models.append(model)
            else:
                if model.required:
                    missing_models.append(model)
                    logger.warning(f"❌ {model.name} not found")
                else:
                    logger.info(f"ℹ️  {model.name} (optional) not found")

        # Download missing models
        downloaded = []
        if missing_models:
            logger.info(f"📥 Downloading {len(missing_models)} missing models...")
            downloaded = await self._download_models(missing_models)

        success = len(missing_models) == len(downloaded)
        return success, downloaded + existing_models

    async def _download_models(self, models: List[ModelInfo]) -> List[str]:
        """Download the specified models asynchronously."""
        downloaded = []

        async with aiohttp.ClientSession() as session:
            for model in models:
                try:
                    logger.info(f"⬇️  Downloading {model.name}...")
                    success = await self._download_single_model(session, model)
                    if success:
                        downloaded.append(model.name)
                        logger.info(f"✅ {model.name} downloaded successfully")
                    else:
                        logger.error(f"❌ Failed to download {model.name}")
                except Exception as e:
                    logger.error(f"❌ Error downloading {model.name}: {e}")

        return downloaded

    async def _download_single_model(self, session: aiohttp.ClientSession, model: ModelInfo) -> bool:
        """Download a single model file."""
        try:
            # Ensure target directory exists
            target_dir = self.models_path / model.subfolder
            target_dir.mkdir(parents=True, exist_ok=True)
            target_path = target_dir / model.name

            # Download with progress tracking
            async with session.get(model.url) as response:
                response.raise_for_status()
                total_size = int(response.headers.get('content-length', 0))

                downloaded = 0
                with open(target_path, 'wb') as f:
                    async for chunk in response.content.iter_chunked(8192):
                        f.write(chunk)
                        downloaded += len(chunk)

                        if total_size > 0:
                            progress = (downloaded / total_size) * 100
                            logger.info(f"   {model.name}: {progress:.1f}%")

            # Verify download
            if target_path.exists():
                actual_size_mb = target_path.stat().st_size / (1024 * 1024)
                if abs(actual_size_mb - model.expected_size_mb) <= (model.expected_size_mb * 0.1):
                    return True
                else:
                    logger.warning(f"Size verification failed for {model.name}")
                    target_path.unlink()  # Remove incomplete download
                    return False
            else:
                return False

        except Exception as e:
            logger.error(f"Download failed for {model.name}: {e}")
            return False

    def validate_comfyui_setup(self) -> bool:
        """Validate that ComfyUI is properly set up."""
        required_files = [
            self.comfyui_path / "main.py",
            self.comfyui_path / "requirements.txt",
        ]

        for file_path in required_files:
            if not file_path.exists():
                logger.error(f"Required ComfyUI file not found: {file_path}")
                return False

        # Check if models directory exists
        if not self.models_path.exists():
            self.models_path.mkdir(parents=True, exist_ok=True)
            logger.info(f"Created models directory: {self.models_path}")

        return True

    async def run_auto_setup(self) -> bool:
        """
        Run the complete auto-setup process for StoryCore ComfyUI models.

        Returns:
            True if all required models are available, False otherwise
        """
        logger.info("🚀 Starting StoryCore ComfyUI Auto Model Setup")
        logger.info("=" * 50)

        # Validate ComfyUI setup
        if not self.validate_comfyui_setup():
            logger.error("❌ ComfyUI setup validation failed")
            return False

        # Check and download models
        success, available_models = await self.check_and_download_models()

        logger.info("=" * 50)
        if success:
            logger.info("🎉 StoryCore ComfyUI setup complete!")
            logger.info(f"Available models: {len(available_models)}")
            for model in available_models:
                logger.info(f"  - {model}")
            logger.info("🌐 ComfyUI is ready for StoryCore workflows")
            return True
        else:
            logger.error("❌ Some required models could not be downloaded")
            logger.info("💡 Try running again or check your internet connection")
            return False

async def main():
    """Main entry point for the auto model downloader."""
    import argparse

    parser = argparse.ArgumentParser(description="Auto Model Downloader for StoryCore ComfyUI")
    parser.add_argument("--comfyui-path", help="Path to ComfyUI installation")
    parser.add_argument("--check-only", action="store_true", help="Only check models, don't download")

    args = parser.parse_args()

    downloader = AutoModelDownloader(args.comfyui_path)

    if args.check_only:
        success, available = await downloader.check_and_download_models()
        sys.exit(0 if success else 1)
    else:
        success = await downloader.run_auto_setup()
        sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())