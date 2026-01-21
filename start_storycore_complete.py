#!/usr/bin/env python3
"""
StoryCore Complete System Launcher
Starts all StoryCore components: ComfyUI, API Server, and React UI
"""

import asyncio
import subprocess
import sys
import os
import signal
import logging
import time
from pathlib import Path
import aiohttp
import webbrowser

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class StoryCoreLauncher:
    """
    Launches the complete StoryCore system
    """

    def __init__(self):
        self.project_root = Path(__file__).parent
        self.comfyui_process = None
        self.api_process = None
        self.ui_process = None

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

    async def check_service_ready(self, url: str, name: str, timeout: int = 30) -> bool:
        """Wait for a service to be ready"""
        logger.info(f"Waiting for {name} to start...")

        start_time = time.time()
        async with aiohttp.ClientSession() as session:
            while time.time() - start_time < timeout:
                try:
                    async with session.get(url, timeout=5) as response:
                        if response.status == 200:
                            logger.info(f"✅ {name} is ready!")
                            return True
                except Exception:
                    pass

                await asyncio.sleep(2)

        logger.error(f"❌ {name} failed to start within timeout")
        return False

    async def check_comfyui_ready(self) -> bool:
        """Wait for ComfyUI to be ready"""
        return await self.check_service_ready("http://127.0.0.1:8188/", "ComfyUI", 60)

    async def check_api_ready(self) -> bool:
        """Wait for API server to be ready"""
        return await self.check_service_ready("http://localhost:8000/health", "StoryCore API", 30)

    async def check_ui_ready(self) -> bool:
        """Wait for React UI to be ready"""
        return await self.check_service_ready("http://localhost:3000", "React UI", 60)

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

    def start_react_ui(self) -> subprocess.Popen:
        """Start the React UI development server"""
        ui_dir = self.project_root / "creative-studio-ui"
        logger.info(f"Starting React UI from: {ui_dir}")

        if not (ui_dir / "package.json").exists():
            raise FileNotFoundError("React UI not found. Please install dependencies first.")

        os.chdir(ui_dir)

        # Check if node_modules exists
        if not (ui_dir / "node_modules").exists():
            logger.info("Installing React dependencies...")
            subprocess.run([sys.executable, "-m", "npm", "install"], check=True)

        cmd = ["npm", "start"]

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
        logger.info("🚀 Starting Complete StoryCore System")
        logger.info("=" * 70)

        try:
            # Start ComfyUI first
            logger.info("🔧 Phase 1: Starting ComfyUI...")
            self.comfyui_process = self.start_comfyui()
            self.monitor_process(self.comfyui_process, "ComfyUI")

            # Wait for ComfyUI to be ready
            if not await self.check_comfyui_ready():
                logger.error("Failed to start ComfyUI")
                return

            # Start API server
            logger.info("🌐 Phase 2: Starting StoryCore API server...")
            self.api_process = self.start_api_server()
            self.monitor_process(self.api_process, "API")

            # Wait for API server to be ready
            if not await self.check_api_ready():
                logger.error("Failed to start API server")
                return

            # Start React UI
            logger.info("⚛️  Phase 3: Starting React UI...")
            self.ui_process = self.start_react_ui()
            self.monitor_process(self.ui_process, "React")

            # Wait for React UI to be ready
            if not await self.check_ui_ready():
                logger.error("Failed to start React UI")
                return

            # All services are running!
            logger.info("=" * 70)
            logger.info("🎉 StoryCore System Fully Operational!")
            logger.info("")
            logger.info("📊 Services Status:")
            logger.info("  ✅ ComfyUI Backend:     http://127.0.0.1:8188")
            logger.info("  ✅ StoryCore API:       http://localhost:8000")
            logger.info("  ✅ React UI:            http://localhost:3000")
            logger.info("  ✅ Health Check:        http://localhost:8000/health")
            logger.info("")
            logger.info("🎨 Available Features:")
            logger.info("  • AI Image Generation (FLUX.2)")
            logger.info("  • AI Video Generation (LTX-2)")
            logger.info("  • Interactive UI with real-time generation")
            logger.info("  • Workflow management and monitoring")
            logger.info("  • Automatic model downloading")
            logger.info("")
            logger.info("🔗 Quick Access:")
            logger.info("  • StoryCore Dashboard:  storycore-dashboard-demo.html")
            logger.info("  • ComfyUI Interface:    http://127.0.0.1:8188")
            logger.info("  • React UI:             http://localhost:3000")
            logger.info("")
            logger.info("💡 Usage Tips:")
            logger.info("  • Use the React UI for AI content generation")
            logger.info("  • Access ComfyUI directly for advanced workflows")
            logger.info("  • Check the dashboard for system monitoring")
            logger.info("")
            logger.info("Press Ctrl+C to stop all services")
            logger.info("=" * 70)

            # Open browser to React UI
            try:
                webbrowser.open("http://localhost:3000")
                logger.info("🌐 Opened browser to React UI")
            except Exception as e:
                logger.warning(f"Could not open browser: {e}")

            # Keep running until interrupted
            def signal_handler(signum, frame):
                logger.info("🛑 Shutdown signal received")
                self.cleanup()
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
                if self.ui_process.poll() is not None:
                    logger.error("React UI process died!")
                    break

        except KeyboardInterrupt:
            logger.info("🛑 Shutting down...")
        except Exception as e:
            logger.error(f"Error during startup: {e}")
        finally:
            self.cleanup()

    def cleanup(self):
        """Clean up all processes"""
        logger.info("🧹 Cleaning up processes...")

        processes = [
            ("ComfyUI", self.comfyui_process),
            ("API Server", self.api_process),
            ("React UI", self.ui_process)
        ]

        for name, process in processes:
            if process and process.poll() is None:
                logger.info(f"Terminating {name}...")
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    logger.warning(f"{name} didn't terminate gracefully, killing...")
                    process.kill()

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