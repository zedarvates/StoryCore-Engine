"""
StoryCore-Engine ComfyUI Executor
================================

High-level asynchronous executor for ComfyUI workflows.
Handles multi-server management, lifecycle, and progress monitoring.
"""

import asyncio
import logging
import uuid
import time
from typing import Dict, Any, List, Optional, Callable
from pathlib import Path

import aiohttp
from backend.config import settings, get_comfyui_url

logger = logging.getLogger(__name__)


class ComfyUIExecutionError(Exception):
    """Base exception for ComfyUI execution errors."""

    pass


class ComfyUIExecutor:
    """
    Manages execution of workflows across multiple ComfyUI servers.
    Provides automatic server selection, failover, and progress tracking.
    """

    def __init__(self):
        self.output_dir = Path(settings.OUTPUT_FOLDER) / "comfyui"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self._active_jobs: Dict[str, Dict[str, Any]] = {}

    async def get_available_servers(self) -> Dict[str, str]:
        """Returns the dictionary of configured ComfyUI servers."""
        return settings.get_comfyui_servers()

    async def upload_image(
        self, image_data: bytes, filename: str, server_name: str = "local"
    ) -> Dict[str, Any]:
        """Uploads an image to the ComfyUI server."""
        comfyui_url = get_comfyui_url(server_name=server_name)
        upload_url = f"{comfyui_url.rstrip('/')}/upload/image"

        async with aiohttp.ClientSession() as session:
            form = aiohttp.FormData()
            form.add_field(
                "image", image_data, filename=filename, content_type="image/jpeg"
            )
            form.add_field("overwrite", "true")

            async with session.post(upload_url, data=form) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    error_text = await response.text()
                    raise ComfyUIExecutionError(f"Upload failed: {error_text}")

    async def execute_workflow(
        self,
        workflow: Dict[str, Any],
        server_name: Optional[str] = "local",
        comfyui_url: Optional[str] = None,
        project_id: Optional[str] = None,
        job_id: Optional[str] = None,
        progress_callback: Optional[Callable[[int, str], None]] = None,
    ) -> Dict[str, Any]:
        """
        Executes a ComfyUI workflow on a specific server or URL.
        """
        job_id = job_id or str(uuid.uuid4())

        # Determine URL
        if not comfyui_url:
            comfyui_url = get_comfyui_url(server_name=server_name or "local")

        logger.info(f"Submitting job {job_id} to ComfyUI at {comfyui_url}")

        async with aiohttp.ClientSession() as session:
            try:
                # 1. Submit the prompt
                submit_url = f"{comfyui_url.rstrip('/')}/prompt"
                payload = {"prompt": workflow, "client_id": job_id}

                async with session.post(
                    submit_url, json=payload, timeout=30
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        raise ComfyUIExecutionError(
                            f"Failed to submit workflow to {server_name}: {error_text}"
                        )

                    data = await response.json()
                    prompt_id = data.get("prompt_id")

                    if not prompt_id:
                        raise ComfyUIExecutionError(
                            f"No prompt_id returned from {server_name}"
                        )

                # 2. Wait for completion
                result = await self._wait_for_completion(
                    session, comfyui_url, prompt_id, job_id, progress_callback
                )

                # 3. Process results
                processed_result = await self._process_outputs(
                    session, comfyui_url, result.get("outputs", {}), job_id
                )

                return {
                    "success": True,
                    "job_id": job_id,
                    "prompt_id": prompt_id,
                    "server": server_name,
                    "outputs": processed_result,
                }

            except Exception as e:
                logger.error(f"Execution failed on {server_name}: {e}")
                return {"success": False, "job_id": job_id, "error": str(e)}

    async def _wait_for_completion(
        self,
        session: aiohttp.ClientSession,
        url: str,
        prompt_id: str,
        job_id: str,
        progress_callback: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        """Polls ComfyUI for job completion."""
        start_time = time.time()
        timeout = settings.COMFYUI_TIMEOUT

        while time.time() - start_time < timeout:
            # Check history
            history_url = f"{url.rstrip('/')}/history/{prompt_id}"
            async with session.get(history_url) as response:
                if response.status == 200:
                    history = await response.json()
                    if prompt_id in history:
                        return history[prompt_id]

            # Check queue status for progress estimation
            queue_url = f"{url.rstrip('/')}/queue"
            async with session.get(queue_url) as response:
                if response.status == 200:
                    await response.json()
                    # Rough progress estimation based on position in queue if needed
                    # For now, just call heartbeat
                    if progress_callback:
                        await progress_callback(20, "Processing in ComfyUI...")

            await asyncio.sleep(2)

        raise TimeoutError(f"Job {prompt_id} timed out after {timeout} seconds")

    async def _process_outputs(
        self,
        session: aiohttp.ClientSession,
        url: str,
        outputs: Dict[str, Any],
        job_id: str,
    ) -> List[Dict[str, Any]]:
        """Processes and optionally downloads outputs from ComfyUI."""
        processed = []

        for node_id, node_output in outputs.items():
            # Handle images
            if "images" in node_output:
                for img in node_output["images"]:
                    img_name = img["filename"]
                    subfolder = img.get("subfolder", "")
                    img_type = img.get("type", "output")

                    view_url = f"{url.rstrip('/')}/view?filename={img_name}&subfolder={subfolder}&type={img_type}"

                    processed.append(
                        {
                            "node_id": node_id,
                            "type": "image",
                            "filename": img_name,
                            "url": view_url,
                        }
                    )

            # Handle videos (VHS nodes or similar)
            if "gifs" in node_output or "videos" in node_output:
                vids = node_output.get("gifs", node_output.get("videos", []))
                for vid in vids:
                    vid_name = vid["filename"]
                    subfolder = vid.get("subfolder", "")
                    vid_type = vid.get("type", "output")

                    view_url = f"{url.rstrip('/')}/view?filename={vid_name}&subfolder={subfolder}&type={vid_type}"

                    processed.append(
                        {
                            "node_id": node_id,
                            "type": "video",
                            "filename": vid_name,
                            "url": view_url,
                        }
                    )

        return processed

    async def free_memory(
        self, server_name: str = "local", comfyui_url: Optional[str] = None
    ):
        """Calls ComfyUI's /free endpoint to release GPU memory."""
        url = comfyui_url or get_comfyui_url(server_name=server_name)
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{url.rstrip('/')}/free",
                    json={"unload_models": True, "free_memory": True},
                ) as resp:
                    if resp.status == 200:
                        logger.info(f"ComfyUI memory cleared on {url}")
        except Exception as e:
            logger.warning(f"Failed to clear ComfyUI memory on {url}: {e}")


# Singleton instance
comfyui_executor = ComfyUIExecutor()
