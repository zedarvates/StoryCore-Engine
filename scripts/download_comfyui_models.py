#!/usr/bin/env python3
"""
ComfyUI Models Downloader for StoryCore
Automatically downloads required ComfyUI models for:
- Wav2Lip (Lip Sync)
- GFPGAN (Face Enhancement)
- ControlNet (Video-to-Video)
- RealESRGAN (Upscaling)
"""

import os
import sys
import urllib.request
import zipfile
import logging
from pathlib import Path
from dataclasses import dataclass
from typing import List, Optional
from concurrent.futures import ThreadPoolExecutor

# Configuration
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Chemins
SCRIPT_DIR = Path(__file__).parent
COMFYUI_DIR = SCRIPT_DIR.parent / "comfyui_portable"
MODELS_DIR = COMFYUI_DIR / "models"
OUTPUT_DIR = SCRIPT_DIR.parent / "output"


@dataclass
class ModelInfo:
    """Information about a model to download"""
    name: str
    filename: str
    url: str
    size_mb: float
    destination: Path
    description: str


# Liste des modèles requis
MODELS = [
    # Wav2Lip Models
    ModelInfo(
        name="Wav2Lip GAN",
        filename="wav2lip_gan.pth",
        url="https://github.com/Rudrabha/Wav2Lip/releases/download/v0.2.0/wav2lip_gan.pth",
        size_mb=350,
        destination=MODELS_DIR / "wav2lip",
        description="Main Wav2Lip model for lip synchronization"
    ),
    ModelInfo(
        name="Wav2Lip",
        filename="wav2lip.pth",
        url="https://github.com/Rudrabha/Wav2Lip/releases/download/v0.2.0/wav2lip.pth",
        size_mb=149,
        destination=MODELS_DIR / "wav2lip",
        description="Wav2Lip quality assessment model"
    ),
    
    # GFPGAN Models
    ModelInfo(
        name="GFPGAN v1.4",
        filename="GFPGANv1.4.pth",
        url="https://github.com/Tencent/GFPGAN/releases/download/v1.3.4/GFPGANv1.4.pth",
        size_mb=120,
        destination=MODELS_DIR / "gfpgan",
        description="Face enhancement model for lip sync results"
    ),
    
    # RealESRGAN Models
    ModelInfo(
        name="RealESRGAN x4+",
        filename="RealESRGAN_x4plus.pth",
        url="https://github.com/xinntao/Real-ESRGAN/releases/download/v0.1.0/RealESRGAN_x4plus.pth",
        size_mb=64,
        destination=MODELS_DIR / "realesrgan",
        description="Upscaling model for high quality output"
    ),
    
    # ControlNet Models
    ModelInfo(
        name="ControlNet OpenPose",
        filename="control_openpose.safetensors",
        url="https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_openpose.pth",
        size_mb=1300,
        destination=MODELS_DIR / "controlnet",
        description="Pose control for video transformation"
    ),
    ModelInfo(
        name="ControlNet Depth",
        filename="control_depth.safetensors",
        url="https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11f1p_sd15_depth.pth",
        size_mb=1300,
        destination=MODELS_DIR / "controlnet",
        description="Depth control for video transformation"
    ),
    ModelInfo(
        name="ControlNet Canny",
        filename="control_canny.safetensors",
        url="https://huggingface.co/lllyasviel/ControlNet-v1-1/resolve/main/control_v11p_sd15_canny.pth",
        size_mb=1300,
        destination=MODELS_DIR / "controlnet",
        description="Edge detection control for video transformation"
    ),
    
    # SDXL Models
    ModelInfo(
        name="SDXL Base 1.0",
        filename="sd_xl_base_1.0.safetensors",
        url="https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors",
        size_mb=6700,
        destination=MODELS_DIR / "checkpoints",
        description="Main diffusion model for V2V generation"
    ),
]


class ModelDownloader:
    """Downloads and manages ComfyUI models"""
    
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.downloaded = []
        self.failed = []
        
    def create_directories(self):
        """Create necessary directories"""
        logger.info("Creating directory structure...")
        
        # Create model directories
        for model in MODELS:
            model.destination.mkdir(parents=True, exist_ok=True)
            logger.info(f"  ✓ {model.destination}")
        
        # Create output directory
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
        logger.info(f"  ✓ {OUTPUT_DIR}")
        
    def check_existing_models(self) -> List[ModelInfo]:
        """Check which models are already downloaded"""
        existing = []
        missing = []
        
        for model in MODELS:
            model_path = model.destination / model.filename
            if model_path.exists():
                file_size = model_path.stat().st_size / (1024 * 1024)
                logger.info(f"  ✓ {model.name}: {file_size:.1f} MB (exists)")
                existing.append(model)
            else:
                missing.append(model)
                logger.info(f"  ✗ {model.name}: missing")
        
        return missing
    
    def download_model(self, model: ModelInfo, progress: bool = True) -> bool:
        """Download a single model"""
        output_path = model.destination / model.filename
        temp_path = output_path.with_suffix(".tmp")
        
        try:
            logger.info(f"Downloading {model.name}...")
            logger.info(f"  URL: {model.url}")
            logger.info(f"  Destination: {output_path}")
            
            # Create request with headers
            request = urllib.request.Request(
                model.url,
                headers={
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            )
            
            # Download with progress
            with urllib.request.urlopen(request) as response:
                total_size = int(response.headers.get('Content-Length', 0))
                downloaded = 0
                
                with open(temp_path, 'wb') as f:
                    while True:
                        chunk = response.read(8192)
                        if not chunk:
                            break
                        
                        f.write(chunk)
                        downloaded += len(chunk)
                        
                        if progress and total_size > 0:
                            percent = (downloaded / total_size) * 100
                            print(f"\r    Progress: {percent:.1f}% ({downloaded//(1024*1024)}/{total_size//(1024*1024)} MB)", end="")
            
            print()  # New line after progress
            
            # Rename temp to final
            temp_path.rename(output_path)
            
            logger.info(f"  ✓ Download complete: {output_path.stat().st_size / (1024*1024):.1f} MB")
            self.downloaded.append(model.name)
            return True
            
        except Exception as e:
            logger.error(f"  ✗ Failed to download {model.name}: {e}")
            
            # Clean up temp file
            if temp_path.exists():
                temp_path.unlink()
            
            self.failed.append(model.name)
            return False
    
    def download_all(self, max_workers: int = 1) -> dict:
        """
        Download all models
        
        Args:
            max_workers: Number of parallel downloads (1 = sequential)
        """
        logger.info("=" * 60)
        logger.info("ComfyUI Models Downloader for StoryCore")
        logger.info("=" * 60)
        
        # Create directories
        self.create_directories()
        
        # Check existing
        logger.info("\n📋 Checking existing models...")
        missing = self.check_existing_models()
        
        if not missing:
            logger.info("\n✅ All models already downloaded!")
            return {"downloaded": 0, "existing": len(MODELS), "failed": 0}
        
        logger.info(f"\n⬇️  Downloading {len(missing)} missing models...")
        
        # Download missing models
        if max_workers == 1:
            for model in missing:
                self.download_model(model)
        else:
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                results = list(executor.map(self.download_model, missing))
        
        # Summary
        logger.info("\n" + "=" * 60)
        logger.info("Download Summary")
        logger.info("=" * 60)
        logger.info(f"  Downloaded: {len(self.downloaded)}")
        logger.info(f"  Already existed: {len(MODELS) - len(self.downloaded) - len(self.failed)}")
        logger.info(f"  Failed: {len(self.failed)}")
        
        if self.failed:
            logger.info("\n⚠️  Failed downloads:")
            for name in self.failed:
                logger.info(f"  - {name}")
        
        return {
            "downloaded": len(self.downloaded),
            "existing": len(MODELS) - len(self.downloaded) - len(self.failed),
            "failed": len(self.failed)
        }
    
    def verify_integrity(self) -> bool:
        """Verify downloaded models are valid"""
        logger.info("\n🔍 Verifying model integrity...")
        
        all_valid = True
        for model in MODELS:
            model_path = model.destination / model.filename
            if model_path.exists():
                size_mb = model_path.stat().st_size / (1024 * 1024)
                expected_mb = model.size_mb
                
                # Check size (allow 10% variance)
                if abs(size_mb - expected_mb) / expected_mb < 0.1:
                    logger.info(f"  ✓ {model.name}: {size_mb:.1f} MB")
                else:
                    logger.warning(f"  ⚠️  {model.name}: {size_mb:.1f} MB (expected ~{expected_mb} MB)")
                    all_valid = False
            else:
                logger.error(f"  ✗ {model.name}: not found")
                all_valid = False
        
        return all_valid


def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Download ComfyUI models for StoryCore")
    parser.add_argument("--check", action="store_true", help="Check existing models only")
    parser.add_argument("--verify", action="store_true", help="Verify model integrity")
    parser.add_argument("--parallel", type=int, default=1, help="Number of parallel downloads (default: 1)")
    parser.add_argument("--quiet", action="store_true", help="Reduce output verbosity")
    
    args = parser.parse_args()
    
    downloader = ModelDownloader(verbose=not args.quiet)
    
    if args.check:
        downloader.create_directories()
        downloader.check_existing_models()
    elif args.verify:
        downloader.verify_integrity()
    else:
        result = downloader.download_all(max_workers=args.parallel)
        
        if result["failed"] == 0:
            logger.info("\n🎉 All models downloaded successfully!")
        else:
            logger.info(f"\n⚠️  {result['failed']} model(s) failed to download")
            sys.exit(1)


if __name__ == "__main__":
    main()

