#!/usr/bin/env python3
"""
Auto Model Downloader for StoryCore-Engine ComfyUI Integration
Automatically downloads required models when ComfyUI starts up.
Includes FLUX.2, Z-Image Turbo, and other image generation models.
"""

import sys
import asyncio
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from dataclasses import dataclass
import aiohttp

# Configure logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@dataclass
class ModelInfo:
    """Information about a required model."""

    name: str
    url: str
    subfolder: str
    expected_size_mb: int
    required: bool = True
    description: str = ""


class AutoModelDownloader:
    """
    Automatically downloads required models for ComfyUI when StoryCore starts.
    Integrates with the existing ComfyUI installation and model management.
    """

    def __init__(self, comfyui_path: Optional[str] = None):
        """Initialize the auto model downloader."""
        self.comfyui_path = (
            Path(comfyui_path) if comfyui_path else self._find_comfyui_path()
        )
        self.models_path = self.comfyui_path / "models"
        self.required_models = self._get_required_models()

        logger.info(
            f"Auto Model Downloader initialized for ComfyUI at: {self.comfyui_path}"
        )

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
        """Get the list of required models for StoryCore workflows."""
        return [
            # =====================================
            # FLUX.2 Models (Main Image Generation)
            # =====================================
            ModelInfo(
                name="flux2-vae.safetensors",
                url="https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/vae/flux2-vae.safetensors",
                subfolder="vae",
                expected_size_mb=335,
                required=True,
                description="FLUX.2 VAE model",
            ),
            ModelInfo(
                name="flux2_dev_fp8mixed.safetensors",
                url="https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/diffusion_models/flux2_dev_fp8mixed.safetensors",
                subfolder="checkpoints",
                expected_size_mb=3584,
                required=True,
                description="FLUX.2 diffusion model (FP8)",
            ),
            ModelInfo(
                name="mistral_3_small_flux2_bf16.safetensors",
                url="https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/text_encoders/mistral_3_small_flux2_bf16.safetensors",
                subfolder="clip",
                expected_size_mb=7372,
                required=True,
                description="FLUX.2 CLIP text encoder",
            ),
            # =====================================
            # Z-Image Turbo Models (Fast Generation)
            # =====================================
            ModelInfo(
                name="z_image_turbo_bf16.safetensors",
                url="https://huggingface.co/Comfy-Org/z-img-turbo/resolve/main/z_image_turbo_bf16.safetensors",
                subfolder="checkpoints",
                expected_size_mb=5200,
                required=True,
                description="Z-Image Turbo model for fast generation",
            ),
            # =====================================
            # BEYOND REALITY SUPER Z IMAGE 3.0 (Fast Portraits)
            # =====================================
            ModelInfo(
                name="beyond_reality_super_z_image_3.0_bf16.safetensors",
                url="https://huggingface.co/mingyi456/BEYOND_REALITY_Z_IMAGE-DF11-ComfyUI/resolve/main/BEYOND%20REALITY%20SUPER%20Z%20IMAGE%203.0%20%E6%B7%A1%E5%A6%86%E6%B5%93%E6%8A%B9%20BF16-DF11.safetensors",
                subfolder="checkpoints",
                expected_size_mb=5500,
                required=False,
                description="BEYOND REALITY SUPER Z IMAGE 3.0 - Fast portrait generation model",
            ),
            ModelInfo(
                name="qwen_3_4b.safetensors",
                url="https://huggingface.co/Comfy-Org/z-img-turbo/resolve/main/qwen_3_4b.safetensors",
                subfolder="clip",
                expected_size_mb=8300,
                required=True,
                description="Qwen 3 4B CLIP model for Z-Turbo",
            ),
            ModelInfo(
                name="ae.safetensors",
                url="https://huggingface.co/Comfy-Org/z-img-turbo/resolve/main/ae.safetensors",
                subfolder="vae",
                expected_size_mb=335,
                required=True,
                description="Autoencoder for Z-Turbo",
            ),
            # =====================================
            # LTX-2.3 v1.1 Video Generation Models (Optional)
            # https://huggingface.co/Lightricks/LTX-2.3
            # =====================================
            # --- Diffusion model (pick ONE: FP8 or GGUF) ---
            ModelInfo(
                name="ltx-2.3-22b-distilled-1.1_transformer_only_mxfp8_block32.safetensors",
                url="https://huggingface.co/Kijai/LTX2.3_comfy/resolve/main/diffusion_models/ltx-2.3-22b-distilled-1.1_transformer_only_mxfp8_block32.safetensors",
                subfolder="diffusion_models",
                expected_size_mb=11000,
                required=False,
                description="LTX-2.3 v1.1 diffusion model FP8 (~11GB) — recommended for ADA/Blackwell",
            ),
            ModelInfo(
                name="ltx-2.3-22b-distilled-1.1-Q5_K_M.gguf",
                url="https://huggingface.co/unsloth/LTX-2.3-GGUF/resolve/main/distilled-1.1/ltx-2.3-22b-distilled-1.1-Q5_K_M.gguf",
                subfolder="unet",
                expected_size_mb=14000,
                required=False,
                description="LTX-2.3 v1.1 GGUF Q5_K_M (~14GB) — compatible with 6-8 GB VRAM",
            ),
            # --- Text encoders (both required together) ---
            ModelInfo(
                name="gemma-3-12b-it-IQ4_XS.gguf",
                url="https://huggingface.co/unsloth/gemma-3-12b-it-GGUF/resolve/main/gemma-3-12b-it-IQ4_XS.gguf",
                subfolder="text_encoders",
                expected_size_mb=6800,
                required=False,
                description="LTX-2.3 Gemma text encoder GGUF (~6.8GB)",
            ),
            ModelInfo(
                name="ltx-2.3_text_projection_bf16.safetensors",
                url="https://huggingface.co/unsloth/LTX-2.3-GGUF/resolve/main/text_encoders/ltx-2.3-22b-distilled_embeddings_connectors.safetensors",
                subfolder="text_encoders",
                expected_size_mb=50,
                required=False,
                description="LTX-2.3 text projection connector (~50MB)",
            ),
            # --- VAE (both required for audio+video generation) ---
            ModelInfo(
                name="LTX23_video_vae_bf16.safetensors",
                url="https://huggingface.co/unsloth/LTX-2.3-GGUF/resolve/main/vae/ltx-2.3-22b-distilled_video_vae.safetensors",
                subfolder="vae",
                expected_size_mb=400,
                required=False,
                description="LTX-2.3 Video VAE BF16",
            ),
            ModelInfo(
                name="LTX23_audio_vae_bf16.safetensors",
                url="https://huggingface.co/unsloth/LTX-2.3-GGUF/resolve/main/vae/ltx-2.3-22b-distilled_audio_vae.safetensors",
                subfolder="vae",
                expected_size_mb=200,
                required=False,
                description="LTX-2.3 Audio VAE BF16 — enables ambient sound/speech generation",
            ),
            # --- Spatial upscaler ---
            ModelInfo(
                name="ltx-2.3-spatial-upscaler-x2-1.1.safetensors",
                url="https://huggingface.co/Lightricks/LTX-2.3/resolve/main/ltx-2.3-spatial-upscaler-x2-1.1.safetensors",
                subfolder="latent_upscale_models",
                expected_size_mb=500,
                required=False,
                description="LTX-2.3 spatial upscaler x2 v1.1",
            ),
            # --- Optional LoRAs ---
            ModelInfo(
                name="ltx-2.3-transition-lora.safetensors",
                url="https://huggingface.co/Lightricks/LTX-2.3/resolve/main/loras/ltx-2.3-transition-lora.safetensors",
                subfolder="loras",
                expected_size_mb=150,
                required=False,
                description="LTX-2.3 Transition LoRA — smooth first/last frame transitions (trigger: 'one chunk')",
            ),
            ModelInfo(
                name="ltx-2.3-video-reasoning-lora.safetensors",
                url="https://huggingface.co/Lightricks/LTX-2.3/resolve/main/loras/ltx-2.3-video-reasoning-lora.safetensors",
                subfolder="loras",
                expected_size_mb=150,
                required=False,
                description="LTX-2.3 Video Reasoning LoRA — improved real-world physics",
            ),
            # =====================================
            # ACE-Step Audio Models (Optional - NOT for images)
            # =====================================
            # NOTE: ACE-Step is for audio/music generation, NOT character images
            # Only include if user explicitly wants audio capabilities
            # ModelInfo(
            #     name="ace_step_v1_3.5b.safetensors",
            #     url="https://huggingface.co/Comfy-Org/ACE-Step_ComfyUI_repackaged/resolve/main/all_in_one/ace_step_v1_3.5b.safetensors",
            #     subfolder="checkpoints",
            #     expected_size_mb=7000,
            #     required=False,
            #     description="ACE-Step TTS/Audio model (NOT for images)"
            # ),
            # =====================================
            # Additional Optional Models
            # =====================================
            ModelInfo(
                name="flux2-klein.safetensors",
                url="https://huggingface.co/black-forest-labs/FLUX.2-klein-9B/resolve/main/flux2-klein.safetensors",
                subfolder="checkpoints",
                expected_size_mb=9500,
                required=False,
                description="FLUX.2-klein lightweight alternative (~9.3GB)",
            ),
            ModelInfo(
                name="t5xxl_fp16.safetensors",
                url="https://huggingface.co/Comfy-Org/flux2-dev/resolve/main/split_files/text_encoders/t5xxl_fp16.safetensors",
                subfolder="clip",
                expected_size_mb=9450,
                required=False,
                description="T5-XXL text encoder (optional)",
            ),
        ]

    def get_image_generation_models(self) -> List[ModelInfo]:
        """Get models specifically for character/image generation (NOT ACE-Step)."""
        return [
            m
            for m in self.required_models
            if "flux" in m.name.lower() or "z_image" in m.name.lower()
        ]

    def get_video_generation_models(self) -> List[ModelInfo]:
        """Get models for video generation."""
        return [m for m in self.required_models if "ltx" in m.name.lower()]

    def get_audio_generation_models(self) -> List[ModelInfo]:
        """Get models for audio generation (ACE-Step, etc.)."""
        return [m for m in self.required_models if "ace" in m.name.lower()]

    async def check_and_download_models(
        self, model_type: Optional[str] = None
    ) -> Tuple[bool, List[str]]:
        """
        Check for missing models and download them automatically.

        Args:
            model_type: Optional filter - 'image', 'video', 'audio', or None for all

        Returns:
            Tuple of (success, list of available models)
        """
        logger.info(f"🔍 Checking for required models (type: {model_type or 'all'})...")

        # Filter models by type if specified
        if model_type == "image":
            models_to_check = self.get_image_generation_models()
            logger.info(
                "📷 Checking FLUX.2 and Z-Image Turbo models for character images..."
            )
        elif model_type == "video":
            models_to_check = self.get_video_generation_models()
            logger.info("🎬 Checking LTX-2 video models...")
        elif model_type == "audio":
            models_to_check = self.get_audio_generation_models()
            logger.info("🎵 Checking ACE-Step audio models...")
        else:
            models_to_check = self.required_models
            logger.info("📦 Checking all models...")

        missing_models = []
        existing_models = []

        # Check each required model
        for model in models_to_check:
            model_path = self.models_path / model.subfolder / model.name

            if model_path.exists():
                # Verify file size
                actual_size_mb = model_path.stat().st_size / (1024 * 1024)
                size_tolerance = model.expected_size_mb * 0.1  # 10% tolerance

                if abs(actual_size_mb - model.expected_size_mb) <= size_tolerance:
                    existing_models.append(model.name)
                    logger.info(f"✅ {model.name} ({actual_size_mb:.1f}MB)")
                else:
                    logger.warning(
                        f"⚠️  {model.name} size mismatch ({actual_size_mb:.1f}MB vs {model.expected_size_mb}MB)"
                    )
                    missing_models.append(model)
            else:
                if model.required:
                    missing_models.append(model)
                    logger.warning(f"❌ {model.name} not found")
                else:
                    logger.info(f"ℹ️  {model.name} ({model.description}) - optional")

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

    async def _download_single_model(
        self, session: aiohttp.ClientSession, model: ModelInfo
    ) -> bool:
        """Download a single model file."""
        try:
            # Ensure target directory exists
            target_dir = self.models_path / model.subfolder
            target_dir.mkdir(parents=True, exist_ok=True)
            target_path = target_dir / model.name

            # Download with progress tracking
            async with session.get(model.url) as response:
                response.raise_for_status()
                total_size = int(response.headers.get("content-length", 0))

                downloaded = 0
                with open(target_path, "wb") as f:
                    async for chunk in response.content.iter_chunked(8192):
                        f.write(chunk)
                        downloaded += len(chunk)

                        if total_size > 0:
                            progress = (downloaded / total_size) * 100
                            logger.info(f"   {model.name}: {progress:.1f}%")

            # Verify download
            if target_path.exists():
                actual_size_mb = target_path.stat().st_size / (1024 * 1024)
                if abs(actual_size_mb - model.expected_size_mb) <= (
                    model.expected_size_mb * 0.1
                ):
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

    def validate_models_for_workflow(self, workflow_type: str) -> Dict[str, Any]:
        """
        Validate that required models exist for a specific workflow type.

        Args:
            workflow_type: 'image', 'video', or 'character_edit'

        Returns:
            Dict with validation results
        """
        result = {
            "workflow_type": workflow_type,
            "valid": True,
            "missing_models": [],
            "warnings": [],
            "available_models": [],
        }

        if workflow_type in ["image", "character_edit"]:
            required_models = self.get_image_generation_models()
        elif workflow_type == "video":
            required_models = self.get_video_generation_models()
        elif workflow_type == "audio":
            required_models = self.get_audio_generation_models()
        else:
            required_models = self.required_models

        for model in required_models:
            model_path = self.models_path / model.subfolder / model.name
            if model_path.exists():
                result["available_models"].append(model.name)
            else:
                result["missing_models"].append(model.name)
                if model.required:
                    result["valid"] = False
                    result["warnings"].append(f"Required model missing: {model.name}")

        # Special check: Warn if user is trying character editing with audio models
        if workflow_type == "character_edit":
            audio_models = self.get_audio_generation_models()
            if audio_models:
                result["warnings"].append(
                    "NOTE: ACE-Step audio models are NOT needed for character image generation. "
                    "Use FLUX.2 or Z-Image Turbo workflows instead."
                )

        return result

    async def run_auto_setup(self, model_type: Optional[str] = None) -> bool:
        """
        Run the complete auto-setup process for StoryCore ComfyUI models.

        Args:
            model_type: Optional filter - 'image', 'video', 'audio', or None for all

        Returns:
            True if all required models are available, False otherwise
        """
        logger.info("🚀 Starting StoryCore ComfyUI Auto Model Setup")
        logger.info("=" * 50)

        # Validate ComfyUI setup
        if not self.validate_comfyui_setup():
            logger.error("❌ ComfyUI setup validation failed")
            return False

        # Validate models for the workflow type
        if model_type:
            validation = self.validate_models_for_workflow(model_type)
            if not validation["valid"]:
                logger.warning(f"⚠️  Some required models for {model_type} are missing")
                for warning in validation["warnings"]:
                    logger.warning(f"   {warning}")

        # Check and download models
        success, available_models = await self.check_and_download_models(model_type)

        logger.info("=" * 50)
        if success:
            logger.info("🎉 StoryCore ComfyUI setup complete!")
            logger.info(f"Available models: {len(available_models)}")
            for model in available_models:
                logger.info(f"  - {model}")
            logger.info("🌐 ComfyUI is ready for StoryCore workflows")

            # Specific guidance for character image generation
            if model_type in [None, "image", "character_edit"]:
                logger.info("")
                logger.info("📷 Character Image Generation:")
                logger.info("   Use FLUX.2 or Z-Image Turbo workflows")
                logger.info("   NOT ACE-Step (which is for audio/music)")
            return True
        else:
            logger.error("❌ Some required models could not be downloaded")
            logger.info("💡 Try running again or check your internet connection")
            return False


async def main():
    """Main entry point for the auto model downloader."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Auto Model Downloader for StoryCore ComfyUI"
    )
    parser.add_argument("--comfyui-path", help="Path to ComfyUI installation")
    parser.add_argument(
        "--type",
        choices=["image", "video", "audio"],
        help="Model type to check/download",
    )
    parser.add_argument(
        "--check-only", action="store_true", help="Only check models, don't download"
    )
    parser.add_argument(
        "--validate",
        choices=["image", "video", "audio", "character_edit"],
        help="Validate models for specific workflow type",
    )

    args = parser.parse_args()

    downloader = AutoModelDownloader(args.comfyui_path)

    # Validation mode
    if args.validate:
        result = downloader.validate_models_for_workflow(args.validate)
        print(f"\n📋 Validation for {args.validate}:")
        print(f"   Valid: {result['valid']}")
        print(f"   Available: {len(result['available_models'])} models")
        print(f"   Missing: {len(result['missing_models'])} models")
        for model in result["missing_models"]:
            print(f"      - {model}")
        for warning in result["warnings"]:
            print(f"   ⚠️  {warning}")
        sys.exit(0 if result["valid"] else 1)

    if args.check_only:
        success, available = await downloader.check_and_download_models(args.type)
        sys.exit(0 if success else 1)
    else:
        success = await downloader.run_auto_setup(args.type)
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())
