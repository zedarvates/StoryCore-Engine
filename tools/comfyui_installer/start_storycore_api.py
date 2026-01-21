#!/usr/bin/env python3
"""
StoryCore API Startup Script
Starts both ComfyUI and the StoryCore API server
"""

import asyncio
import subprocess
import sys
import os
import signal
import logging
from pathlib import Path
import time
import aiohttp

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class StoryCoreLauncher:
    """
    Launches ComfyUI and StoryCore API server together
    """

    def __init__(self):
        self.comfyui_process = None
        self.api_process = None
        self.project_root = Path(__file__).parent.parent.parent

    def find_comfyui_path(self) -> Path:
        """Find the ComfyUI installation path"""
        possible_paths = [
            self.project_root / "comfyui_portable" / "ComfyUI",
            self.project_root.parent / "comfyui_portable" / "ComfyUI",
            Path.home() / "ComfyUI",
        ]

        for path in possible_paths:
            if (path / "main.py").exists():
                return path

        raise FileNotFoundError("ComfyUI installation not found. Please run the installer first.")

    async def check_comfyui_ready(self, url: str = "http://127.0.0.1:8188", timeout: int = 60) -> bool:
        """Wait for ComfyUI to be ready"""
        logger.info("Waiting for ComfyUI to start...")

        start_time = time.time()
        async with aiohttp.ClientSession() as session:
            while time.time() - start_time < timeout:
                try:
                    async with session.get(url, timeout=5) as response:
                        if response.status == 200:
                            logger.info("✅ ComfyUI is ready!")
                            return True
                except Exception:
                    pass

                await asyncio.sleep(2)

        logger.error("❌ ComfyUI failed to start within timeout")
        return False

    async def check_api_ready(self, url: str = "http://localhost:8000/health", timeout: int = 30) -> bool:
        """Wait for API server to be ready"""
        logger.info("Waiting for StoryCore API server to start...")

        start_time = time.time()
        async with aiohttp.ClientSession() as session:
            while time.time() - start_time < timeout:
                try:
                    async with session.get(url, timeout=5) as response:
                        if response.status == 200:
                            data = await response.json()
                            if data.get("status") == "healthy":
                                logger.info("✅ StoryCore API server is ready!")
                                return True
                except Exception:
                    pass

                await asyncio.sleep(1)

        logger.error("❌ StoryCore API server failed to start within timeout")
        return False

    def start_comfyui(self) -> subprocess.Popen:
        """Start ComfyUI process"""
        comfyui_path = self.find_comfyui_path()
        logger.info(f"Starting ComfyUI from: {comfyui_path}")

        # Change to ComfyUI directory
        os.chdir(comfyui_path)

        # Start ComfyUI with proper arguments
        cmd = [
            sys.executable, "main.py",
            "--listen", "0.0.0.0",
            "--port", "8188",
            "--enable-cors-header", "http://localhost:3000",
            "--cpu"  # Use CPU mode for compatibility
        ]

        logger.info(f"Running command: {' '.join(cmd)}")

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )

        return process

    def start_api_server(self) -> subprocess.Popen:
        """Start the StoryCore API server"""
        api_script = self.project_root / "src" / "comfyui_api_server.py"
        logger.info(f"Starting API server: {api_script}")

        # Change back to project root
        os.chdir(self.project_root)

        cmd = [
            sys.executable, str(api_script),
            "--host", "localhost",
            "--port", "8000",
            "--comfyui-url", "http://127.0.0.1:8188"
        ]

        logger.info(f"Running command: {' '.join(cmd)}")

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
            universal_newlines=True
        )

        return process

    def monitor_process(self, process: subprocess.Popen, name: str):
        """Monitor a process and log its output"""
        def monitor_output():
            while True:
                output = process.stdout.readline()
                if output:
                    logger.info(f"[{name}] {output.strip()}")
                elif process.poll() is not None:
                    break

            while True:
                error = process.stderr.readline()
                if error:
                    logger.error(f"[{name}] {error.strip()}")
                elif process.poll() is not None:
                    break

        import threading
        thread = threading.Thread(target=monitor_output, daemon=True)
        thread.start()

    async def run(self):
        """Main run method"""
        logger.info("🚀 Starting StoryCore with ComfyUI integration")
        logger.info("=" * 60)

        try:
            # Start ComfyUI
            logger.info("🔧 Starting ComfyUI...")
            self.comfyui_process = self.start_comfyui()
            self.monitor_process(self.comfyui_process, "ComfyUI")

            # Wait for ComfyUI to be ready
            if not await self.check_comfyui_ready():
                logger.error("Failed to start ComfyUI")
                return

            # Start API server
            logger.info("🌐 Starting StoryCore API server...")
            self.api_process = self.start_api_server()
            self.monitor_process(self.api_process, "API")

            # Wait for API server to be ready
            if not await self.check_api_ready():
                logger.error("Failed to start API server")
                return

            # Both services are running
            logger.info("=" * 60)
            logger.info("🎉 StoryCore is fully operational!")
            logger.info("")
            logger.info("📊 Services Status:")
            logger.info("  ✅ ComfyUI:        http://127.0.0.1:8188")
            logger.info("  ✅ API Server:     http://localhost:8000")
            logger.info("  ✅ Health Check:   http://localhost:8000/health")
            logger.info("")
            logger.info("🎨 Available Endpoints:")
            logger.info("  POST /generate/image  - Generate images with FLUX.2")
            logger.info("  POST /generate/video  - Generate videos with LTX-2")
            logger.info("  GET  /workflows       - List available workflows")
            logger.info("  GET  /queue           - Check ComfyUI queue status")
            logger.info("")
            logger.info("🔗 Frontend Integration:")
            logger.info("  React app can now call the API at http://localhost:8000")
            logger.info("")
            logger.info("Press Ctrl+C to stop all services")
            logger.info("=" * 60)

            # Keep running until interrupted
            def signal_handler(signum, frame):
                logger.info("🛑 Shutdown signal received")
                if self.comfyui_process:
                    logger.info("Stopping ComfyUI...")
                    self.comfyui_process.terminate()
                    self.comfyui_process.wait()
                if self.api_process:
                    logger.info("Stopping API server...")
                    self.api_process.terminate()
                    self.api_process.wait()
                sys.exit(0)

            signal.signal(signal.SIGINT, signal_handler)
            signal.signal(signal.SIGTERM, signal_handler)

            # Keep the main process alive
            while True:
                await asyncio.sleep(1)

                # Check if processes are still alive
                if self.comfyui_process.poll() is not None:
                    logger.error("ComfyUI process died!")
                    break
                if self.api_process.poll() is not None:
                    logger.error("API server process died!")
                    break

        except KeyboardInterrupt:
            logger.info("🛑 Shutting down...")
        except Exception as e:
            logger.error(f"Error during startup: {e}")
        finally:
            # Cleanup
            if self.comfyui_process and self.comfyui_process.poll() is None:
                logger.info("Terminating ComfyUI...")
                self.comfyui_process.terminate()
                try:
                    self.comfyui_process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    self.comfyui_process.kill()

            if self.api_process and self.api_process.poll() is None:
                logger.info("Terminating API server...")
                self.api_process.terminate()
                try:
                    self.api_process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    self.api_process.kill()

            logger.info("✅ All services stopped")

def main():
    """Main entry point"""
    launcher = StoryCoreLauncher()

    # Run the async launcher
    try:
        asyncio.run(launcher.run())
    except KeyboardInterrupt:
        logger.info("Interrupted by user")
    except Exception as e:
        logger.error(f"Failed to start: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()