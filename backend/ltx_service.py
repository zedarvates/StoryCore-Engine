"""
LTX 2.3 Video Service for StoryCore-Engine

Provides generation capabilities using LTX 2.3:
- Native Audio-Video synchronization
- Multiple aspect ratios (Portrait, Landscape, Cinematic)
- High-fidelity cinematic rendering
- ComfyUI API integration
"""

import asyncio
import logging
import os
import json
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Callable, Dict, List, Optional, Tuple, Union
from pathlib import Path

import aiohttp
from backend.config import settings

logger = logging.getLogger(__name__)

# =============================================================================
# Enums and Data Classes
# =============================================================================

class LTXAspectRatio(str, Enum):
    """Supported aspect ratios for LTX 2.3"""
    HORIZONTAL = "16:9"
    VERTICAL = "9:16"
    SQUARE = "1:1"
    CINEMATIC = "2.35:1"
    WIDE = "21:9"

@dataclass
class LTXGenerationConfig:
    """Configuration for LTX generation job"""
    prompt: str
    negative_prompt: str = "blurry, low quality, distorted, deformed, bad anatomy, flat lighting, text, watermark"
    aspect_ratio: LTXAspectRatio = LTXAspectRatio.HORIZONTAL
    duration: float = 5.0
    fps: int = 24
    resolution: Optional[str] = None
    audio_enabled: bool = True
    audio_prompt: Optional[str] = None
    seed: Optional[int] = None
    steps: int = 20
    cfg: float = 3.5
    batch_size: int = 1
    image_reference: Optional[str] = None  # Path to image for Image-to-Video
    scheduler: str = "euler"
    denoise: float = 1.0
    use_spectrum: bool = False # 3.5x speedup (ByteDance technique)
    physics_prompt: Optional[str] = None # Real Wonder physics (wind, force, direction)

# =============================================================================
# LTX 2.3 Video Service
# =============================================================================

class LTXVideoService:
    """
    Service for LTX 2.3 Video Generation.
    Connects to ComfyUI for heavy lifting.
    """
    
    # Simple in-memory job tracker
    # Format: {job_id: {"status": "pending|processing|completed|failed", "output_path": str, "error": str, "progress": int}}
    _jobs: Dict[str, Dict[str, Any]] = {}
    
    def __init__(self, comfyui_url: Optional[str] = None):
        self.comfyui_url = (comfyui_url or settings.COMFYUI_BASE_URL).rstrip("/")
        self.output_dir = Path(settings.OUTPUT_FOLDER) / "ltx"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
    async def generate_video(
        self,
        config: LTXGenerationConfig,
        output_path: Optional[str] = None,
        job_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Main entry point for generating a video with LTX 2.3.
        """
        if not job_id:
            job_id = str(uuid.uuid4())
            
        self._jobs[job_id] = {"status": "pending", "progress": 0, "config": config.__dict__}
        logger.info(f"Preparing LTX 2.3 generation job: {job_id}")
        
        if settings.USE_MOCK_COMFYUI:
            logger.info("Using mock LTX generation")
            self._jobs[job_id]["status"] = "processing"
            self._jobs[job_id]["progress"] = 50
            await asyncio.sleep(3)
            result = self._generate_mock_result(job_id, config)
            self._jobs[job_id].update(result)
            return result

        # 1. Prepare Workflow
        workflow = self._prepare_workflow(config)
        
        # 2. Communicate with ComfyUI
        async with aiohttp.ClientSession() as session:
            try:
                # Submit prompt
                params = {"prompt": workflow, "client_id": job_id}
                async with session.post(f"{self.comfyui_url}/prompt", json=params) as resp:
                    if resp.status != 200:
                        error_text = await resp.text()
                        return {"job_id": job_id, "status": "failed", "error": f"ComfyUI Error: {error_text}"}
                    
                    data = await resp.json()
                    prompt_id = data["prompt_id"]
                
                # 3. Wait for result
                logger.info(f"LTX Job {job_id} submitted. Prompt ID: {prompt_id}. Waiting for completion...")
                self._jobs[job_id]["status"] = "processing"
                self._jobs[job_id]["prompt_id"] = prompt_id
                
                result_data = await self._poll_result(session, prompt_id, job_id)
                
                # 4. Save output
                self._jobs[job_id]["message"] = "Downloading results..."
                final_path = await self._process_outputs(session, result_data, output_path)
                
                result = {
                    "job_id": job_id,
                    "prompt_id": prompt_id,
                    "status": "completed",
                    "output_path": final_path,
                    "config": config.__dict__
                }
                self._jobs[job_id].update(result)
                return result
                
            except Exception as e:
                logger.error(f"LTX Generation process failed: {e}")
                error_result = {"job_id": job_id, "status": "failed", "error": str(e)}
                self._jobs[job_id].update(error_result)
                return error_result

    def _prepare_workflow(self, config: LTXGenerationConfig) -> Dict[str, Any]:
        """
        Dynamically adjusts the LTX 2.3 workflow JSON.
        Uses standard ComfyUI-LTXVideo nodes.
        """
        res_map = {
            LTXAspectRatio.HORIZONTAL: (1280, 720),
            LTXAspectRatio.VERTICAL: (720, 1280),
            LTXAspectRatio.SQUARE: (1024, 1024),
            LTXAspectRatio.CINEMATIC: (1280, 544),
            LTXAspectRatio.WIDE: (1280, 544),
        }
        width, height = res_map.get(config.aspect_ratio, (1280, 720))
        
        # Standard LTX Video Workflow nodes
        workflow = {
            "1": {"inputs": {"ckpt_name": "ltx-video-2.3.safetensors"}, "class_type": "LTXVideoCheckpointLoader"},
            "2": {"inputs": {"width": width, "height": height, "batch_size": config.batch_size}, "class_type": "EmptyLatentImage"},
            "3": {"inputs": {"text": config.prompt, "clip": ["1", 1]}, "class_type": "CLIPTextEncode"},
            "4": {"inputs": {"text": config.negative_prompt, "clip": ["1", 1]}, "class_type": "CLIPTextEncode"},
            "5": {
                "inputs": {
                    "seed": config.seed if config.seed is not None else 0,
                    "steps": config.steps,
                    "cfg": config.cfg,
                    "sampler_name": config.scheduler,
                    "scheduler": "simple",
                    "denoise": config.denoise,
                    "model": ["1", 0],
                    "positive": ["3", 0],
                    "negative": ["4", 0],
                    "latent_image": ["2", 0]
                },
                "class_type": "KSampler"
            },
            "6": {"inputs": {"samples": ["5", 0], "vae": ["1", 2]}, "class_type": "VAEDecode"},
            "7": {"inputs": {"filename_prefix": "LTX23_StoryCore", "images": ["6", 0]}, "class_type": "SaveVideo"}
        }
        
        # Apply Spectrum acceleration if enabled
        if config.use_spectrum:
            workflow["5"]["inputs"]["steps"] = 14 # Optimized step count for Spectrum
            workflow["9"] = {
                "inputs": {
                    "model": ["1", 0],
                    "method": "spectrum_forecasting",
                    "speedup": 3.5
                },
                "class_type": "SpectrumBooster"
            }
            workflow["5"]["inputs"]["model"] = ["9", 0]
        
        # Add Audio node if enabled and available in your ComfyUI setup
        if config.audio_enabled:
            # Note: This node name may vary depending on the LTX 2.3 Audio custom node installed
            workflow["8"] = {
                "inputs": {
                    "prompt": config.audio_prompt or config.prompt,
                    "video": ["6", 0],
                },
                "class_type": "LTXAudioSyncGenerator"
            }
            # Many workflows save the final combined file via a specific node
            workflow["7"]["inputs"]["images"] = ["8", 0]
            
        # Add Physics node if enabled (Real Wonder)
        if config.physics_prompt:
            workflow["10"] = {
                "inputs": {
                    "force_description": config.physics_prompt,
                    "model": workflow["5"]["inputs"]["model"],
                },
                "class_type": "RealWonderPhysicsOperator"
            }
            # Inject physics into the sampler
            workflow["5"]["inputs"]["model"] = ["10", 0]
            
        return workflow

    async def _poll_result(self, session, prompt_id: str, job_id: str) -> Dict[str, Any]:
        """Poll ComfyUI until the job is done."""
        max_retries = 300 # 10 minutes at 2s interval
        for i in range(max_retries):
            # Update progress based on retry count (rough estimate)
            if job_id in self._jobs:
                self._jobs[job_id]["progress"] = min(95, 5 + int((i / 50) * 90))

            async with session.get(f"{self.comfyui_url}/history/{prompt_id}") as resp:
                if resp.status == 200:
                    history = await resp.json()
                    if prompt_id in history:
                        return history[prompt_id]
            await asyncio.sleep(2)
        raise TimeoutError("LTX Generation timed out")

    async def _process_outputs(self, session, result_data: Dict[str, Any], output_path: Optional[str]) -> str:
        """Download resulting files from ComfyUI."""
        outputs = result_data.get("outputs", {})
        
        # Search for video/gif outputs
        for node_id, node_output in outputs.items():
            if "gifs" in node_output:
                file_info = node_output["gifs"][0]
                filename = file_info["filename"]
                
                # Download
                async with session.get(f"{self.comfyui_url}/view", params={"filename": filename}) as resp:
                    if resp.status == 200:
                        content = await resp.read()
                        
                        if not output_path:
                            output_path = str(self.output_dir / f"ltx_{uuid.uuid4()[:8]}.mp4")
                        
                        with open(output_path, "wb") as f:
                            f.write(content)
                        return output_path
                        
        raise Exception("No video output found in ComfyUI result data")

    def _generate_mock_result(self, job_id: str, config: LTXGenerationConfig) -> Dict[str, Any]:
        """Generate a mock result for development."""
        mock_path = str(self.output_dir / f"mock_ltx_{job_id[:8]}.mp4")
        # Ensure file exists at mock_path (or just return the string)
        return {
            "job_id": job_id,
            "status": "completed",
            "output_path": mock_path,
            "is_mock": True,
            "config": config.__dict__
        }
    @classmethod
    def get_job_status(cls, job_id: str) -> Optional[Dict[str, Any]]:
        """Retrieve the status of a specific job."""
        return cls._jobs.get(job_id)
