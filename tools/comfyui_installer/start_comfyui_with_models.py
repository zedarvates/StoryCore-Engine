#!/usr/bin/env python3
"""
ComfyUI Startup Script with Automatic Model Download
Starts ComfyUI and automatically downloads required models for StoryCore.
"""

import asyncio
import subprocess
import sys
import time
import logging
from pathlib import Path
import argparse

# Add src to path to import our modules
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from auto_model_downloader import AutoModelDownloader

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ComfyUIAutoStarter:
    """Starts ComfyUI with automatic model downloading."""

    def __init__(self, comfyui_path: str = None, host: str = "0.0.0.0", port: int = 8188):
        self.comfyui_path = Path(comfyui_path) if comfyui_path else None
        self.host = host
        self.port = port
        self.downloader = AutoModelDownloader(comfyui_path)

    async def start_comfyui_with_models(self) -> bool:
        """
        Complete startup process: download models, then start ComfyUI.

        Returns:
            True if successful, False otherwise
        """
        logger.info("🚀 StoryCore ComfyUI Auto-Start Process")
        logger.info("=" * 50)

        # Step 1: Auto-download models
        logger.info("📦 Step 1: Checking and downloading models...")
        models_success, available_models = await self.downloader.check_and_download_models()

        if not models_success:
            logger.warning("⚠️  Some models could not be downloaded, but continuing with startup...")
            logger.info("💡 ComfyUI will start, but some features may be limited")

        # Step 2: Start ComfyUI
        logger.info("🌐 Step 2: Starting ComfyUI server...")
        return self._start_comfyui_server()

    def _start_comfyui_server(self) -> bool:
        """Start the ComfyUI server."""
        try:
            # Change to ComfyUI directory
            comfyui_dir = self.downloader.comfyui_path
            if not comfyui_dir.exists():
                logger.error(f"❌ ComfyUI directory not found: {comfyui_dir}")
                return False

            logger.info(f"📂 Starting ComfyUI from: {comfyui_dir}")

            # Prepare command
            cmd = [
                sys.executable, "main.py",
                "--listen", self.host,
                "--port", str(self.port),
                "--enable-cors-header", "http://localhost:3000"
            ]

            # Add CPU mode if no CUDA
            try:
                import torch
                if not torch.cuda.is_available():
                    cmd.append("--cpu")
                    logger.info("💻 CUDA not available, starting in CPU mode")
            except ImportError:
                cmd.append("--cpu")
                logger.info("🔧 PyTorch not available, starting in CPU mode")

            logger.info(f"▶️  Command: {' '.join(cmd)}")

            # Start ComfyUI
            process = subprocess.Popen(
                cmd,
                cwd=str(comfyui_dir),
                stdout=subprocess.PIPE,
                stderr=subprocess.STDOUT,
                text=True,
                bufsize=1,
                universal_newlines=True
            )

            # Monitor startup
            logger.info("⏳ Waiting for ComfyUI to start...")
            time.sleep(5)  # Give it time to start

            # Check if process is still running
            if process.poll() is None:
                logger.info("✅ ComfyUI started successfully!")
                logger.info(f"🌐 Server running at: http://{self.host}:{self.port}")
                logger.info("📋 Access ComfyUI at: http://127.0.0.1:8188"                return True
            else:
                # Process failed
                stdout, _ = process.communicate()
                logger.error("❌ ComfyUI failed to start")
                logger.error(f"Output: {stdout}")
                return False

        except Exception as e:
            logger.error(f"❌ Error starting ComfyUI: {e}")
            return False

async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Start ComfyUI with automatic model download")
    parser.add_argument("--comfyui-path", help="Path to ComfyUI installation")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8188, help="Port to bind to")
    parser.add_argument("--no-models", action="store_true", help="Skip model download")

    args = parser.parse_args()

    starter = ComfyUIAutoStarter(args.comfyui_path, args.host, args.port)

    if args.no_models:
        # Just start ComfyUI without model download
        success = starter._start_comfyui_server()
    else:
        # Full auto-start with model download
        success = await starter.start_comfyui_with_models()

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())