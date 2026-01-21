#!/usr/bin/env python3
"""
ComfyUI API Server for StoryCore
Provides REST API endpoints to interact with ComfyUI workflows
"""

import asyncio
import json
import logging
import os
import uuid
from pathlib import Path
from typing import Dict, List, Optional, Any
import aiohttp
from aiohttp import web
import websockets
import base64
from PIL import Image
import io
import subprocess
import sys

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ComfyUIAPI:
    """
    API wrapper for ComfyUI communication
    """

    def __init__(self, comfyui_url: str = "http://127.0.0.1:8188"):
        self.comfyui_url = comfyui_url
        self.session: Optional[aiohttp.ClientSession] = None

    async def __aenter__(self):
        self.session = aiohttp.ClientSession()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()

    async def check_connection(self) -> bool:
        """Check if ComfyUI is accessible"""
        try:
            async with self.session.get(f"{self.comfyui_url}/", timeout=5) as response:
                return response.status == 200
        except Exception as e:
            logger.error(f"ComfyUI connection check failed: {e}")
            return False

    async def get_history(self, prompt_id: str) -> Dict[str, Any]:
        """Get prompt execution history"""
        try:
            async with self.session.get(f"{self.comfyui_url}/history/{prompt_id}") as response:
                if response.status == 200:
                    return await response.json()
                else:
                    logger.error(f"Failed to get history: {response.status}")
                    return {}
        except Exception as e:
            logger.error(f"Error getting history: {e}")
            return {}

    async def queue_prompt(self, workflow: Dict[str, Any]) -> Optional[str]:
        """Queue a prompt for execution"""
        try:
            payload = {
                "prompt": workflow,
                "client_id": str(uuid.uuid4())
            }

            async with self.session.post(
                f"{self.comfyui_url}/prompt",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    result = await response.json()
                    prompt_id = result.get("prompt_id")
                    logger.info(f"Queued prompt with ID: {prompt_id}")
                    return prompt_id
                else:
                    error_text = await response.text()
                    logger.error(f"Failed to queue prompt: {response.status} - {error_text}")
                    return None
        except Exception as e:
            logger.error(f"Error queuing prompt: {e}")
            return None

    async def get_queue_status(self) -> Dict[str, Any]:
        """Get current queue status"""
        try:
            async with self.session.get(f"{self.comfyui_url}/queue") as response:
                if response.status == 200:
                    return await response.json()
                else:
                    return {"queue_pending": [], "queue_running": []}
        except Exception as e:
            logger.error(f"Error getting queue status: {e}")
            return {"queue_pending": [], "queue_running": []}

class WorkflowManager:
    """
    Manages ComfyUI workflows for StoryCore
    """

    def __init__(self, workflows_dir: Path = Path("workflows")):
        self.workflows_dir = workflows_dir
        self.workflows: Dict[str, Dict[str, Any]] = {}
        self.load_workflows()

    def load_workflows(self):
        """Load all workflow JSON files"""
        if not self.workflows_dir.exists():
            logger.warning(f"Workflows directory not found: {self.workflows_dir}")
            return

        # Load FLUX.2 workflows
        flux2_dir = self.workflows_dir / "flux2"
        if flux2_dir.exists():
            for json_file in flux2_dir.glob("*.json"):
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        workflow = json.load(f)
                        workflow_name = json_file.stem
                        self.workflows[f"flux2_{workflow_name}"] = workflow
                        logger.info(f"Loaded FLUX.2 workflow: {workflow_name}")
                except Exception as e:
                    logger.error(f"Failed to load workflow {json_file}: {e}")

        # Load LTX-2 workflows
        ltx2_dir = self.workflows_dir / "ltx2"
        if ltx2_dir.exists():
            for json_file in ltx2_dir.glob("*.json"):
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        workflow = json.load(f)
                        workflow_name = json_file.stem
                        self.workflows[f"ltx2_{workflow_name}"] = workflow
                        logger.info(f"Loaded LTX-2 workflow: {workflow_name}")
                except Exception as e:
                    logger.error(f"Failed to load workflow {json_file}: {e}")

        logger.info(f"Loaded {len(self.workflows)} workflows total")

    def get_workflow(self, name: str) -> Optional[Dict[str, Any]]:
        """Get a workflow by name"""
        return self.workflows.get(name)

    def list_workflows(self) -> List[str]:
        """List all available workflows"""
        return list(self.workflows.keys())

    def create_flux2_workflow(self, prompt: str, negative_prompt: str = "",
                            width: int = 1024, height: int = 1024,
                            steps: int = 20, cfg_scale: float = 3.5,
                            seed: int = -1) -> Dict[str, Any]:
        """Create a customized FLUX.2 workflow"""
        base_workflow = self.get_workflow("flux2_basic")
        if not base_workflow:
            raise ValueError("FLUX.2 basic workflow not found")

        # Modify the workflow with custom parameters
        workflow = json.loads(json.dumps(base_workflow))  # Deep copy

        # Update prompts
        for node in workflow.get("nodes", []):
            if node.get("type") == "CLIPTextEncode":
                if "positive" in node.get("widgets_values", [""])[0].lower():
                    node["widgets_values"][0] = prompt
                elif "negative" in node.get("widgets_values", [""])[0].lower():
                    node["widgets_values"][0] = negative_prompt

            elif node.get("type") == "EmptyLatentImage":
                node["widgets_values"][0] = width
                node["widgets_values"][1] = height

            elif node.get("type") == "FluxSampler":
                node["widgets_values"][0] = steps  # steps
                node["widgets_values"][1] = cfg_scale  # cfg_scale
                node["widgets_values"][2] = width  # width
                node["widgets_values"][3] = height  # height
                if seed >= 0:
                    node["widgets_values"][5] = seed  # seed

        return workflow

    def create_ltx2_workflow(self, prompt: str, negative_prompt: str = "",
                           width: int = 768, height: int = 512,
                           frames: int = 25, steps: int = 25,
                           cfg_scale: float = 3.0, seed: int = -1) -> Dict[str, Any]:
        """Create a customized LTX-2 workflow"""
        base_workflow = self.get_workflow("ltx2_basic_video")
        if not base_workflow:
            raise ValueError("LTX-2 basic workflow not found")

        # Modify the workflow with custom parameters
        workflow = json.loads(json.dumps(base_workflow))  # Deep copy

        # Update prompts
        for node in workflow.get("nodes", []):
            if node.get("type") == "CLIPTextEncode":
                if "beautiful" in node.get("widgets_values", [""])[0].lower():
                    node["widgets_values"][0] = prompt
                elif "blurry" in node.get("widgets_values", [""])[0].lower():
                    node["widgets_values"][0] = negative_prompt

            elif node.get("type") == "EmptyLTXVLatentVideo":
                node["widgets_values"][0] = width
                node["widgets_values"][1] = height
                node["widgets_values"][2] = frames

            elif node.get("type") == "LTXVSampler":
                node["widgets_values"][0] = steps  # steps
                node["widgets_values"][1] = cfg_scale  # cfg_scale
                node["widgets_values"][2] = width  # width
                node["widgets_values"][3] = height  # height
                node["widgets_values"][4] = frames  # frames
                if seed >= 0:
                    node["widgets_values"][5] = seed  # seed

        return workflow

class StoryCoreAPI:
    """
    Main API server for StoryCore ComfyUI integration
    """

    def __init__(self, host: str = "localhost", port: int = 8000):
        self.host = host
        self.port = port
        self.workflow_manager = WorkflowManager()
        self.active_jobs: Dict[str, Dict[str, Any]] = {}

    async def health_check(self, request: web.Request) -> web.Response:
        """Health check endpoint"""
        async with ComfyUIAPI() as comfyui:
            comfyui_status = await comfyui.check_connection()

        return web.json_response({
            "status": "healthy" if comfyui_status else "degraded",
            "comfyui_connected": comfyui_status,
            "workflows_loaded": len(self.workflow_manager.list_workflows()),
            "active_jobs": len(self.active_jobs)
        })

    async def list_workflows(self, request: web.Request) -> web.Response:
        """List available workflows"""
        workflows = self.workflow_manager.list_workflows()
        return web.json_response({
            "workflows": workflows,
            "categories": {
                "flux2": [w for w in workflows if w.startswith("flux2_")],
                "ltx2": [w for w in workflows if w.startswith("ltx2_")]
            }
        })

    async def generate_image(self, request: web.Request) -> web.Response:
        """Generate image using FLUX.2"""
        try:
            data = await request.json()

            prompt = data.get("prompt", "")
            negative_prompt = data.get("negative_prompt", "")
            width = data.get("width", 1024)
            height = data.get("height", 1024)
            steps = data.get("steps", 20)
            cfg_scale = data.get("cfg_scale", 3.5)
            seed = data.get("seed", -1)

            if not prompt:
                return web.json_response({"error": "Prompt is required"}, status=400)

            # Create customized workflow
            workflow = self.workflow_manager.create_flux2_workflow(
                prompt, negative_prompt, width, height, steps, cfg_scale, seed
            )

            # Queue the prompt
            async with ComfyUIAPI() as comfyui:
                prompt_id = await comfyui.queue_prompt(workflow)

                if prompt_id:
                    job_id = str(uuid.uuid4())
                    self.active_jobs[job_id] = {
                        "type": "flux2_image",
                        "prompt_id": prompt_id,
                        "status": "queued",
                        "created_at": asyncio.get_event_loop().time()
                    }

                    return web.json_response({
                        "job_id": job_id,
                        "prompt_id": prompt_id,
                        "status": "queued",
                        "message": "Image generation started"
                    })
                else:
                    return web.json_response({"error": "Failed to queue prompt"}, status=500)

        except Exception as e:
            logger.error(f"Error in generate_image: {e}")
            return web.json_response({"error": str(e)}, status=500)

    async def generate_video(self, request: web.Request) -> web.Response:
        """Generate video using LTX-2"""
        try:
            data = await request.json()

            prompt = data.get("prompt", "")
            negative_prompt = data.get("negative_prompt", "")
            width = data.get("width", 768)
            height = data.get("height", 512)
            frames = data.get("frames", 25)
            steps = data.get("steps", 25)
            cfg_scale = data.get("cfg_scale", 3.0)
            seed = data.get("seed", -1)

            if not prompt:
                return web.json_response({"error": "Prompt is required"}, status=400)

            # Create customized workflow
            workflow = self.workflow_manager.create_ltx2_workflow(
                prompt, negative_prompt, width, height, frames, steps, cfg_scale, seed
            )

            # Queue the prompt
            async with ComfyUIAPI() as comfyui:
                prompt_id = await comfyui.queue_prompt(workflow)

                if prompt_id:
                    job_id = str(uuid.uuid4())
                    self.active_jobs[job_id] = {
                        "type": "ltx2_video",
                        "prompt_id": prompt_id,
                        "status": "queued",
                        "created_at": asyncio.get_event_loop().time()
                    }

                    return web.json_response({
                        "job_id": job_id,
                        "prompt_id": prompt_id,
                        "status": "queued",
                        "message": "Video generation started"
                    })
                else:
                    return web.json_response({"error": "Failed to queue prompt"}, status=500)

        except Exception as e:
            logger.error(f"Error in generate_video: {e}")
            return web.json_response({"error": str(e)}, status=500)

    async def get_job_status(self, request: web.Request) -> web.Response:
        """Get status of a generation job"""
        job_id = request.match_info.get('job_id')

        if job_id not in self.active_jobs:
            return web.json_response({"error": "Job not found"}, status=404)

        job = self.active_jobs[job_id]

        # Check ComfyUI status
        async with ComfyUIAPI() as comfyui:
            history = await comfyui.get_history(job["prompt_id"])

            if history:
                # Update job status based on ComfyUI history
                for prompt_id, prompt_data in history.items():
                    status = prompt_data.get("status", {})
                    if status.get("completed"):
                        job["status"] = "completed"
                        job["result"] = prompt_data
                    elif status.get("exception"):
                        job["status"] = "failed"
                        job["error"] = str(status.get("exception"))

        return web.json_response(job)

    async def get_queue_status(self, request: web.Request) -> web.Response:
        """Get ComfyUI queue status"""
        async with ComfyUIAPI() as comfyui:
            queue_status = await comfyui.get_queue_status()

        return web.json_response(queue_status)

    async def download_models(self, request: web.Request) -> web.Response:
        """Download ComfyUI models using auto model downloader"""
        try:
            # Parse request parameters
            data = await request.json() if request.method == 'POST' else {}
            include_ltx2 = data.get('include_ltx2', False)
            force_download = data.get('force', False)

            # Run the auto model downloader in a subprocess
            cmd = [sys.executable, str(Path(__file__).parent / "auto_model_downloader.py")]
            if include_ltx2:
                cmd.append('--include-ltx2')
            if force_download:
                cmd.append('--force')

            logger.info(f"Starting model download with command: {' '.join(cmd)}")

            # Start the subprocess
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=Path.cwd()
            )

            # For now, we'll just start the process and return immediately
            # In a production system, you'd want to track the process and provide status updates
            return web.json_response({
                "status": "started",
                "message": "Model download process started",
                "include_ltx2": include_ltx2,
                "force_download": force_download,
                "command": ' '.join(cmd)
            })

        except Exception as e:
            logger.error(f"Error starting model download: {e}")
            return web.json_response({"error": str(e)}, status=500)

    def create_app(self) -> web.Application:
        """Create the web application"""
        app = web.Application()

        # Routes
        app.router.add_get('/health', self.health_check)
        app.router.add_get('/workflows', self.list_workflows)
        app.router.add_post('/generate/image', self.generate_image)
        app.router.add_post('/generate/video', self.generate_video)
        app.router.add_get('/job/{job_id}', self.get_job_status)
        app.router.add_get('/queue', self.get_queue_status)
        app.router.add_post('/download/models', self.download_models)

        return app

    async def run_server(self):
        """Run the API server"""
        app = self.create_app()

        # Enable CORS
        async def cors_middleware(request, handler):
            response = await handler(request)
            response.headers['Access-Control-Allow-Origin'] = '*'
            response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS, PUT, DELETE'
            response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With'
            response.headers['Access-Control-Allow-Credentials'] = 'true'
            return response

        app.middlewares.append(cors_middleware)

        runner = web.AppRunner(app)
        await runner.setup()

        site = web.TCPSite(runner, self.host, self.port)
        await site.start()

        logger.info(f"StoryCore API server started on http://{self.host}:{self.port}")
        logger.info("Available endpoints:")
        logger.info("  GET  /health - Health check")
        logger.info("  GET  /workflows - List available workflows")
        logger.info("  POST /generate/image - Generate image with FLUX.2")
        logger.info("  POST /generate/video - Generate video with LTX-2")
        logger.info("  GET  /job/{job_id} - Get job status")
        logger.info("  GET  /queue - Get ComfyUI queue status")
        logger.info("  POST /download/models - Download ComfyUI models")

        # Keep the server running
        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            logger.info("Shutting down server...")
            await runner.cleanup()

async def main():
    """Main entry point"""
    import argparse

    parser = argparse.ArgumentParser(description="StoryCore ComfyUI API Server")
    parser.add_argument("--host", default="localhost", help="Server host")
    parser.add_argument("--port", type=int, default=8000, help="Server port")
    parser.add_argument("--comfyui-url", default="http://127.0.0.1:8188", help="ComfyUI URL")

    args = parser.parse_args()

    # Update ComfyUI URL if provided
    ComfyUIAPI.__init__ = lambda self, comfyui_url=args.comfyui_url: super(ComfyUIAPI, self).__init__(comfyui_url)

    server = StoryCoreAPI(args.host, args.port)
    await server.run_server()

if __name__ == "__main__":
    asyncio.run(main())