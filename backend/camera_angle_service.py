"""
StoryCore-Engine Camera Angle Service

This module provides the business logic for camera angle transformations.
Integrates with ComfyUI for AI-powered image generation and the task queue
for async job processing.

Requirements: Q1 2026 - Camera Angle Editor Feature
"""

import asyncio
import base64
import logging
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional, Callable

import aiohttp

from backend.camera_angle_types import (
    CameraAnglePreset,
    CameraAngleJobStatus,
    CameraAngleJob,
    CameraAngleResult,
    CameraAngleRequest,
    CAMERA_ANGLE_PRESET_METADATA,
)
from backend.storage import JSONFileStorage
from backend.config import settings, get_comfyui_url

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ============================================================================
# Camera Angle Prompts
# ============================================================================

CAMERA_ANGLE_PROMPTS = {
    CameraAnglePreset.FRONT.value: "front view, facing the camera directly, eye-level shot",
    CameraAnglePreset.LEFT.value: "left side view, profile shot from the left, 90-degree angle",
    CameraAnglePreset.RIGHT.value: "right side view, profile shot from the right, 90-degree angle",
    CameraAnglePreset.TOP.value: "top-down view, overhead shot, bird's eye view, looking down",
    CameraAnglePreset.BOTTOM.value: "low angle view, looking up, worm's eye view",
    CameraAnglePreset.ISOMETRIC.value: "isometric view, 3D isometric perspective, diagonal angle",
    CameraAnglePreset.BACK.value: "rear view, from behind, back perspective",
    CameraAnglePreset.CLOSE_UP.value: "extreme close-up, macro shot, detailed view",
    CameraAnglePreset.WIDE_SHOT.value: "wide shot, establishing shot, full scene view, pulled back",
    CameraAnglePreset.BIRD_EYE.value: "bird's eye view, aerial view, high overhead shot",
    CameraAnglePreset.WORM_EYE.value: "worm's eye view, ground level shot, extreme low angle looking up",
}

QUALITY_SETTINGS = {
    "draft": {"steps": 15, "cfg_scale": 7.0, "width": 512, "height": 512},
    "standard": {"steps": 25, "cfg_scale": 7.5, "width": 768, "height": 768},
    "high": {"steps": 40, "cfg_scale": 8.0, "width": 1024, "height": 1024},
}


# ============================================================================
# Camera Angle Service
# ============================================================================

class CameraAngleService:
    """
    Service for camera angle transformation operations.
    
    Provides methods to:
    - Generate camera angle variations from source images
    - Track job status and progress
    - Retrieve generation results
    - Cancel running jobs
    """
    
    def __init__(
        self,
        comfyui_url: Optional[str] = None,
        storage_path: str = "./data/camera_angle_jobs",
        max_cache_size: int = 200
    ):
        """
        Initialize the camera angle service.
        
        Args:
            comfyui_url: URL of the ComfyUI server (defaults to config value)
            storage_path: Path for job storage
            max_cache_size: Maximum number of cached jobs
        """
        self.comfyui_url = comfyui_url or settings.COMFYUI_BASE_URL
        self.storage = JSONFileStorage(storage_path, max_cache_size=max_cache_size)
        
        # In-memory job tracking
        self._jobs: Dict[str, CameraAngleJob] = {}
        self._results: Dict[str, List[CameraAngleResult]] = {}
        self._active_tasks: Dict[str, asyncio.Task] = {}
        
        # Callbacks for progress updates
        self._progress_callbacks: Dict[str, List[Callable]] = {}
        
        logger.info(f"CameraAngleService initialized with ComfyUI at {self.comfyui_url}")
    
    async def check_comfyui_connection(self) -> bool:
        """
        Check if ComfyUI server is accessible.
        
        Returns:
            True if connection successful, False otherwise
        """
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{self.comfyui_url}/system_stats",
                    timeout=aiohttp.ClientTimeout(total=5)
                ) as response:
                    return response.status == 200
        except Exception as e:
            logger.warning(f"ComfyUI connection check failed: {e}")
            return False
    
    def generate_angle_variation(
        self,
        image_path: str,
        preset: CameraAnglePreset,
        prompt: Optional[str] = None
    ) -> str:
        """
        Generate a camera angle variation for an image.
        
        This is a synchronous wrapper that creates a job and returns the job ID.
        Use the async version for proper async handling.
        
        Args:
            image_path: Path to the source image
            preset: Camera angle preset to apply
            prompt: Optional custom prompt to append
            
        Returns:
            Job ID for tracking the generation
        """
        # Read image and convert to base64
        with open(image_path, "rb") as f:
            image_data = f.read()
        image_base64 = base64.b64encode(image_data).decode("utf-8")
        
        # Create request
        request = CameraAngleRequest(
            image_base64=image_base64,
            angle_ids=[preset],
            custom_prompt=prompt
        )
        
        # Create job (simplified - user_id would come from auth in real use)
        job_id = self._create_job(request, user_id="system")
        
        return job_id
    
    async def generate_angle_variation_async(
        self,
        image_base64: str,
        preset: CameraAnglePreset,
        user_id: str,
        custom_prompt: Optional[str] = None,
        quality: str = "standard",
        preserve_style: bool = True,
        seed: Optional[int] = None
    ) -> str:
        """
        Async method to generate a camera angle variation.
        
        Args:
            image_base64: Base64 encoded source image
            preset: Camera angle preset to apply
            user_id: User ID for job ownership
            custom_prompt: Optional custom prompt
            quality: Generation quality (draft, standard, high)
            preserve_style: Whether to preserve original style
            seed: Random seed for reproducibility
            
        Returns:
            Job ID for tracking the generation
        """
        request = CameraAngleRequest(
            image_base64=image_base64,
            angle_ids=[preset],
            preserve_style=preserve_style,
            quality=quality,
            seed=seed,
            custom_prompt=custom_prompt
        )
        
        job_id = self._create_job(request, user_id)
        
        # Start background processing
        task = asyncio.create_task(self._process_job(job_id))
        self._active_tasks[job_id] = task
        
        return job_id
    
    async def generate_multiple_angles(
        self,
        request: CameraAngleRequest,
        user_id: str
    ) -> str:
        """
        Generate multiple camera angle variations.
        
        Args:
            request: Camera angle generation request
            user_id: User ID for job ownership
            
        Returns:
            Job ID for tracking the generation
        """
        job_id = self._create_job(request, user_id)
        
        # Start background processing
        task = asyncio.create_task(self._process_job(job_id))
        self._active_tasks[job_id] = task
        
        return job_id
    
    def _create_job(self, request: CameraAngleRequest, user_id: str) -> str:
        """
        Create a new camera angle generation job.
        
        Args:
            request: Generation request
            user_id: User ID
            
        Returns:
            Job ID
        """
        job_id = str(uuid.uuid4())
        
        job = CameraAngleJob(
            id=job_id,
            user_id=user_id,
            image_base64=request.image_base64,
            angle_ids=request.angle_ids,
            preserve_style=request.preserve_style,
            quality=request.quality,
            seed=request.seed,
            custom_prompt=request.custom_prompt,
            status=CameraAngleJobStatus.PENDING,
            remaining_angles=list(request.angle_ids),
            created_at=datetime.utcnow()
        )
        
        # Store job
        self._jobs[job_id] = job
        self._save_job(job)
        
        logger.info(f"Created camera angle job {job_id} for user {user_id}")
        
        return job_id
    
    def get_job_status(self, job_id: str) -> Optional[CameraAngleJob]:
        """
        Get the status of a generation job.
        
        Args:
            job_id: Job identifier
            
        Returns:
            CameraAngleJob if found, None otherwise
        """
        # Check in-memory first
        if job_id in self._jobs:
            return self._jobs[job_id]
        
        # Try loading from storage
        job_data = self.storage.load(job_id)
        if job_data:
            job = CameraAngleJob(**job_data)
            self._jobs[job_id] = job
            return job
        
        return None
    
    def get_result(self, job_id: str) -> Optional[List[CameraAngleResult]]:
        """
        Get the results of a completed generation job.
        
        Args:
            job_id: Job identifier
            
        Returns:
            List of CameraAngleResult if job completed, None otherwise
        """
        job = self.get_job_status(job_id)
        if not job or job.status != CameraAngleJobStatus.COMPLETED:
            return None
        
        return self._results.get(job_id, [])
    
    async def cancel_job(self, job_id: str) -> bool:
        """
        Cancel a running generation job.
        
        Args:
            job_id: Job identifier
            
        Returns:
            True if cancelled successfully, False otherwise
        """
        job = self.get_job_status(job_id)
        if not job:
            return False
        
        # Check if job can be cancelled
        if job.status not in [CameraAngleJobStatus.PENDING, CameraAngleJobStatus.PROCESSING]:
            return False
        
        # Cancel active task if exists
        if job_id in self._active_tasks:
            task = self._active_tasks[job_id]
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            del self._active_tasks[job_id]
        
        # Update job status
        job.status = CameraAngleJobStatus.CANCELLED
        job.completed_at = datetime.utcnow()
        self._save_job(job)
        
        logger.info(f"Cancelled camera angle job {job_id}")
        
        return True
    
    def register_progress_callback(
        self,
        job_id: str,
        callback: Callable[[str, float, str], None]
    ) -> None:
        """
        Register a callback for job progress updates.
        
        Args:
            job_id: Job identifier
            callback: Callback function (job_id, progress, step)
        """
        if job_id not in self._progress_callbacks:
            self._progress_callbacks[job_id] = []
        self._progress_callbacks[job_id].append(callback)
    
    def _save_job(self, job: CameraAngleJob) -> None:
        """Save job to persistent storage."""
        job_data = job.model_dump()
        # Convert datetime fields to ISO strings
        job_data['created_at'] = job.created_at.isoformat()
        if job.started_at:
            job_data['started_at'] = job.started_at.isoformat()
        if job.completed_at:
            job_data['completed_at'] = job.completed_at.isoformat()
        # Convert enums to values
        job_data['status'] = job.status.value
        job_data['angle_ids'] = [a.value for a in job.angle_ids]
        job_data['completed_angles'] = [a.value for a in job.completed_angles]
        job_data['remaining_angles'] = [a.value for a in job.remaining_angles]
        
        self.storage.save(job.id, job_data)
    
    async def _process_job(self, job_id: str) -> None:
        """
        Process a camera angle generation job.
        
        Args:
            job_id: Job identifier
        """
        job = self._jobs.get(job_id)
        if not job:
            logger.error(f"Job {job_id} not found")
            return
        
        try:
            # Update status to processing
            job.status = CameraAngleJobStatus.PROCESSING
            job.started_at = datetime.utcnow()
            job.current_step = "Initializing generation"
            self._save_job(job)
            self._notify_progress(job_id, 0, "Initializing generation")
            
            # Check ComfyUI connection
            if not await self.check_comfyui_connection():
                # Use mock generation if ComfyUI not available
                logger.warning(f"ComfyUI not available for job {job_id}, using mock generation")
                await self._mock_process_job(job_id)
                return
            
            # Process each angle
            results: List[CameraAngleResult] = []
            total_angles = len(job.angle_ids)
            
            for i, angle_id in enumerate(job.angle_ids):
                # Check for cancellation
                if job.status == CameraAngleJobStatus.CANCELLED:
                    return
                
                job.current_step = f"Generating {CAMERA_ANGLE_PRESET_METADATA[angle_id.value]['display_name']}"
                self._save_job(job)
                self._notify_progress(
                    job_id,
                    (i / total_angles) * 100,
                    job.current_step
                )
                
                # Build prompt
                prompt = self._build_prompt(job, angle_id)
                
                # Generate image via ComfyUI
                result = await self._generate_single_angle(
                    job_id=job_id,
                    image_base64=job.image_base64,
                    angle_id=angle_id,
                    prompt=prompt,
                    quality=job.quality,
                    seed=job.seed
                )
                
                if result:
                    results.append(result)
                    job.completed_angles.append(angle_id)
                    if angle_id in job.remaining_angles:
                        job.remaining_angles.remove(angle_id)
                
                # Update progress
                job.progress = ((i + 1) / total_angles) * 100
                self._save_job(job)
            
            # Store results
            self._results[job_id] = results
            
            # Mark job as completed
            job.status = CameraAngleJobStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            job.progress = 100.0
            job.current_step = "Completed"
            self._save_job(job)
            self._notify_progress(job_id, 100, "Completed")
            
            logger.info(f"Job {job_id} completed with {len(results)} results")
            
        except asyncio.CancelledError:
            logger.info(f"Job {job_id} was cancelled")
            raise
        except Exception as e:
            logger.error(f"Job {job_id} failed: {e}", exc_info=True)
            job.status = CameraAngleJobStatus.FAILED
            job.error = str(e)
            job.completed_at = datetime.utcnow()
            self._save_job(job)
            self._notify_progress(job_id, 0, f"Failed: {str(e)}")
    
    async def _mock_process_job(self, job_id: str) -> None:
        """
        Mock processing for testing without ComfyUI.
        
        Args:
            job_id: Job identifier
        """
        job = self._jobs.get(job_id)
        if not job:
            return
        
        results: List[CameraAngleResult] = []
        total_angles = len(job.angle_ids)
        
        for i, angle_id in enumerate(job.angle_ids):
            # Check for cancellation
            if job.status == CameraAngleJobStatus.CANCELLED:
                return
            
            job.current_step = f"Generating {CAMERA_ANGLE_PRESET_METADATA[angle_id.value]['display_name']}"
            self._save_job(job)
            self._notify_progress(
                job_id,
                (i / total_angles) * 100,
                job.current_step
            )
            
            # Simulate processing time
            await asyncio.sleep(1.0)
            
            # Create mock result
            result = CameraAngleResult(
                id=str(uuid.uuid4()),
                angle_id=angle_id,
                original_image_base64=job.image_base64[:100] + "...",  # Truncated for mock
                generated_image_base64="mock_generated_image_base64",
                prompt_used=self._build_prompt(job, angle_id),
                generation_time_seconds=1.0,
                metadata={
                    "model": "mock_model",
                    "steps": QUALITY_SETTINGS.get(job.quality, QUALITY_SETTINGS["standard"])["steps"],
                    "cfg_scale": QUALITY_SETTINGS.get(job.quality, QUALITY_SETTINGS["standard"])["cfg_scale"],
                    "mock": True
                }
            )
            
            results.append(result)
            job.completed_angles.append(angle_id)
            if angle_id in job.remaining_angles:
                job.remaining_angles.remove(angle_id)
            
            job.progress = ((i + 1) / total_angles) * 100
            self._save_job(job)
        
        # Store results
        self._results[job_id] = results
        
        # Mark job as completed
        job.status = CameraAngleJobStatus.COMPLETED
        job.completed_at = datetime.utcnow()
        job.progress = 100.0
        job.current_step = "Completed"
        self._save_job(job)
        self._notify_progress(job_id, 100, "Completed")
        
        logger.info(f"Mock job {job_id} completed with {len(results)} results")
    
    def _build_prompt(
        self,
        job: CameraAngleJob,
        angle_id: CameraAnglePreset
    ) -> str:
        """
        Build the generation prompt for a camera angle.
        
        Args:
            job: Generation job
            angle_id: Camera angle preset
            
        Returns:
            Complete prompt string
        """
        parts = []
        
        # Add angle-specific prompt
        angle_prompt = CAMERA_ANGLE_PROMPTS.get(angle_id.value, "")
        parts.append(angle_prompt)
        
        # Add style preservation
        if job.preserve_style:
            parts.append("maintaining original style and composition")
        
        # Add custom prompt if provided
        if job.custom_prompt:
            parts.append(job.custom_prompt)
        
        return ", ".join(parts)
    
    async def _generate_single_angle(
        self,
        job_id: str,
        image_base64: str,
        angle_id: CameraAnglePreset,
        prompt: str,
        quality: str,
        seed: Optional[int]
    ) -> Optional[CameraAngleResult]:
        """
        Generate a single camera angle variation via ComfyUI.
        
        Args:
            job_id: Job identifier
            image_base64: Source image (base64)
            angle_id: Camera angle preset
            prompt: Generation prompt
            quality: Quality settings
            seed: Random seed
            
        Returns:
            CameraAngleResult if successful, None otherwise
        """
        start_time = datetime.utcnow()
        
        try:
            # Get quality settings
            quality_settings = QUALITY_SETTINGS.get(quality, QUALITY_SETTINGS["standard"])
            
            # Build ComfyUI workflow
            workflow = self._build_comfyui_workflow(
                image_base64=image_base64,
                prompt=prompt,
                steps=quality_settings["steps"],
                cfg_scale=quality_settings["cfg_scale"],
                width=quality_settings["width"],
                height=quality_settings["height"],
                seed=seed or -1
            )
            
            # Submit workflow to ComfyUI
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{self.comfyui_url}/prompt",
                    json={"prompt": workflow},
                    timeout=aiohttp.ClientTimeout(total=30)
                ) as response:
                    if response.status != 200:
                        raise Exception(f"ComfyUI returned status {response.status}")
                    
                    result = await response.json()
                    prompt_id = result.get("prompt_id")
                    
                    if not prompt_id:
                        raise Exception("ComfyUI did not return prompt_id")
            
            # Wait for completion
            generated_image = await self._wait_for_comfyui_completion(prompt_id)
            
            end_time = datetime.utcnow()
            generation_time = (end_time - start_time).total_seconds()
            
            return CameraAngleResult(
                id=str(uuid.uuid4()),
                angle_id=angle_id,
                original_image_base64=image_base64[:100] + "...",  # Truncated for storage
                generated_image_base64=generated_image,
                prompt_used=prompt,
                generation_time_seconds=generation_time,
                metadata={
                    "model": "stable_diffusion",
                    "steps": quality_settings["steps"],
                    "cfg_scale": quality_settings["cfg_scale"],
                    "width": quality_settings["width"],
                    "height": quality_settings["height"],
                    "seed": seed
                }
            )
            
        except Exception as e:
            logger.error(f"Failed to generate angle {angle_id.value} for job {job_id}: {e}")
            return None
    
    def _build_comfyui_workflow(
        self,
        image_base64: str,
        prompt: str,
        steps: int,
        cfg_scale: float,
        width: int,
        height: int,
        seed: int
    ) -> Dict[str, Any]:
        """
        Build a ComfyUI workflow for camera angle transformation.
        
        Args:
            image_base64: Source image
            prompt: Generation prompt
            steps: Number of sampling steps
            cfg_scale: CFG scale
            width: Output width
            height: Output height
            seed: Random seed
            
        Returns:
            ComfyUI workflow dictionary
        """
        # This is a simplified workflow - in production, this would include
        # ControlNet, IP-Adapter, etc. for better angle transformations
        workflow = {
            "1": {
                "class_type": "LoadImage",
                "inputs": {
                    "image": image_base64
                }
            },
            "2": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "text": prompt,
                    "clip": ["4", 1]
                }
            },
            "3": {
                "class_type": "CLIPTextEncode",
                "inputs": {
                    "text": "blurry, low quality, distorted, deformed",
                    "clip": ["4", 1]
                }
            },
            "4": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {
                    "ckpt_name": "v1-5-pruned-emaonly.safetensors"
                }
            },
            "5": {
                "class_type": "KSampler",
                "inputs": {
                    "seed": seed,
                    "steps": steps,
                    "cfg": cfg_scale,
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": 0.75,
                    "model": ["4", 0],
                    "positive": ["2", 0],
                    "negative": ["3", 0],
                    "latent_image": ["6", 0]
                }
            },
            "6": {
                "class_type": "VAEEncode",
                "inputs": {
                    "pixels": ["1", 0],
                    "vae": ["4", 2]
                }
            },
            "7": {
                "class_type": "VAEDecode",
                "inputs": {
                    "samples": ["5", 0],
                    "vae": ["4", 2]
                }
            },
            "8": {
                "class_type": "SaveImage",
                "inputs": {
                    "filename_prefix": "camera_angle",
                    "images": ["7", 0]
                }
            }
        }
        
        return workflow
    
    async def _wait_for_comfyui_completion(
        self,
        prompt_id: str,
        timeout: int = 300
    ) -> str:
        """
        Wait for ComfyUI workflow completion and return the generated image.
        
        Args:
            prompt_id: ComfyUI prompt ID
            timeout: Timeout in seconds
            
        Returns:
            Base64 encoded generated image
        """
        start_time = datetime.utcnow()
        
        while (datetime.utcnow() - start_time).total_seconds() < timeout:
            try:
                async with aiohttp.ClientSession() as session:
                    async with session.get(
                        f"{self.comfyui_url}/history/{prompt_id}",
                        timeout=aiohttp.ClientTimeout(total=10)
                    ) as response:
                        if response.status == 200:
                            history = await response.json()
                            
                            if prompt_id in history:
                                outputs = history[prompt_id].get("outputs", {})
                                
                                for node_id, node_output in outputs.items():
                                    if "images" in node_output:
                                        image = node_output["images"][0]
                                        image_url = (
                                            f"{self.comfyui_url}/view?"
                                            f"filename={image['filename']}&"
                                            f"subfolder={image.get('subfolder', '')}&"
                                            f"type={image.get('type', 'output')}"
                                        )
                                        
                                        # Fetch the image
                                        async with session.get(image_url) as img_response:
                                            if img_response.status == 200:
                                                img_data = await img_response.read()
                                                return base64.b64encode(img_data).decode("utf-8")
                                    
                                    elif "video" in node_output:
                                        video = node_output["video"]
                                        video_url = (
                                            f"{self.comfyui_url}/view?"
                                            f"filename={video['filename']}&"
                                            f"subfolder={video.get('subfolder', '')}&"
                                            f"type={video.get('type', 'output')}"
                                        )
                                        
                                        async with session.get(video_url) as vid_response:
                                            if vid_response.status == 200:
                                                vid_data = await vid_response.read()
                                                return base64.b64encode(vid_data).decode("utf-8")
                
            except Exception as e:
                logger.warning(f"Error checking ComfyUI status: {e}")
            
            await asyncio.sleep(1.0)
        
        raise TimeoutError(f"ComfyUI workflow {prompt_id} did not complete within {timeout} seconds")
    
    def _notify_progress(
        self,
        job_id: str,
        progress: float,
        step: str
    ) -> None:
        """Notify registered callbacks of progress updates."""
        callbacks = self._progress_callbacks.get(job_id, [])
        for callback in callbacks:
            try:
                callback(job_id, progress, step)
            except Exception as e:
                logger.warning(f"Progress callback error: {e}")


# ============================================================================
# Service Instance
# ============================================================================

# Global service instance
_camera_angle_service: Optional[CameraAngleService] = None


def get_camera_angle_service() -> CameraAngleService:
    """
    Get the global camera angle service instance.
    
    Returns:
        CameraAngleService instance
    """
    global _camera_angle_service
    if _camera_angle_service is None:
        _camera_angle_service = CameraAngleService()
    return _camera_angle_service


def create_camera_angle_service(
    comfyui_url: Optional[str] = None,
    storage_path: str = "./data/camera_angle_jobs"
) -> CameraAngleService:
    """
    Create a new camera angle service instance.
    
    Args:
        comfyui_url: ComfyUI server URL
        storage_path: Path for job storage
        
    Returns:
        New CameraAngleService instance
    """
    return CameraAngleService(
        comfyui_url=comfyui_url,
        storage_path=storage_path
    )
