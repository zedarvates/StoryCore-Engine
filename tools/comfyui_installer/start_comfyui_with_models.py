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
import os

# Add src to path to import our modules
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from auto_model_downloader import AutoModelDownloader
from network_utils import NetworkUtils

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ComfyUIAutoStarter:
    """Starts ComfyUI with automatic model downloading."""

    def __init__(self, comfyui_path: str = None, host: str = "0.0.0.0", port: int = 8188, 
                 deployment_type: str = "portable", interface_name: str = None):
        self.comfyui_path = Path(comfyui_path) if comfyui_path else None
        self.host = host
        self.port = port
        self.deployment_type = deployment_type
        self.interface_name = interface_name
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

            # Configure host based on deployment type and interface
            configured_host = self._configure_host()
            logger.info(f"🌐 Using host configuration: {configured_host}")

            # Prepare command
            cmd = [
                sys.executable, "main.py",
                "--listen", configured_host,
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
                logger.info(f"🌐 Server running at: http://{configured_host}:{self.port}")
                logger.info("📋 Access ComfyUI at: http://127.0.0.1:8188")
                return True
            else:
                # Process failed
                stdout, _ = process.communicate()
                logger.error("❌ ComfyUI failed to start")
                logger.error(f"Output: {stdout}")
                return False

        except Exception as e:
            logger.error(f"❌ Error starting ComfyUI: {e}")
            return False

    def _configure_host(self) -> str:
        """Configure the host based on deployment type and interface."""
        # Check environment variables first
        env_host = os.environ.get('COMFYUI_HOST')
        if env_host:
            logger.info(f"🌐 Using COMFYUI_HOST environment variable: {env_host}")
            return env_host

        # Use specified interface if provided
        if self.interface_name:
            interface = NetworkUtils.get_interface_by_name(self.interface_name)
            if interface:
                logger.info(f"🌐 Using specified interface {self.interface_name}: {interface['ip']}")
                return interface['ip']
            else:
                logger.warning(f"⚠️  Interface {self.interface_name} not found, using default configuration")

        # Use deployment type configuration
        host_config = NetworkUtils.get_host_config(self.deployment_type)
        logger.info(f"📋 Using {self.deployment_type} configuration: {host_config['host']}")
        return host_config['host']

async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Start ComfyUI with automatic model download")
    parser.add_argument("--comfyui-path", help="Path to ComfyUI installation")
    parser.add_argument("--host", default="0.0.0.0", help="Host to bind to")
    parser.add_argument("--port", type=int, default=8188, help="Port to bind to")
    parser.add_argument("--no-models", action="store_true", help="Skip model download")
    parser.add_argument("--deployment-type", choices=["desktop", "portable", "server"], 
                        default="portable", help="Deployment type (desktop, portable, server)")
    parser.add_argument("--interface", help="Specific network interface to use")
    parser.add_argument("--list-interfaces", action="store_true", 
                        help="List available network interfaces")

    args = parser.parse_args()

    # List interfaces if requested
    if args.list_interfaces:
        interfaces = NetworkUtils.get_network_interfaces()
        print("Available Network Interfaces:")
        print("=" * 50)
        for interface in interfaces:
            print(f"Name: {interface['name']}")
            print(f"  IP: {interface['ip']}")
            print(f"  Netmask: {interface['netmask']}")
            print(f"  Broadcast: {interface['broadcast']}")
            print()
        return

    starter = ComfyUIAutoStarter(
        comfyui_path=args.comfyui_path, 
        host=args.host, 
        port=args.port,
        deployment_type=args.deployment_type,
        interface_name=args.interface
    )

    if args.no_models:
        # Just start ComfyUI without model download
        success = starter._start_comfyui_server()
    else:
        # Full auto-start with model download
        success = await starter.start_comfyui_with_models()

    sys.exit(0 if success else 1)

if __name__ == "__main__":
    asyncio.run(main())