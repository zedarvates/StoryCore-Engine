"""
StoryCore-Engine Lip Sync API

This module provides REST API endpoints for lip synchronization.
Uses ComfyUI with Wav2Lip or SadTalker for lip sync generation.

Endpoints:
- POST /api/lipsync/generate - Generate lip-synced video
- GET /api/lipsync/status/{job_id} - Check job status
- POST /api/lipsync/workflow - Generate using custom workflow

Requirements: Q1 2026 - Lip Sync Integration
"""

import asyncio
import os
import json
import logging
import uuid
import base64
from datetime import datetime
from typing import Any, Dict, List, Optional
from enum import Enum

from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

from backend.auth import verify_jwt_token

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()


class Settings(BaseSettings):
    """Application settings for lip sync"""
    lipsync_output_directory: str = Field(default="./data/lipsync")
    comfyui_url: str = Field(default="http://localhost:8000")
    default_model: str = Field(default="wav2lip")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


try:
    settings = Settings()
except Exception:
    settings = Settings()


class LipSyncModel(str, Enum):
    """Lip sync model enumeration"""
    WAV2LIP = "wav2lip"
    SADTALKER = "sadtalker"


class LipSyncRequest(BaseModel):
    """Request model for lip sync generation"""
    project_id: str = Field(..., min_length=1)
    character_face_image: str = Field(..., description="URL or path to character face image")
    audio_file: str = Field(..., description="URL or path to audio file")
    model: LipSyncModel = LipSyncModel.WAV2LIP
    enhancer: bool = Field(default=True, description="Use face enhancement")
    pads: str = Field(default="0 0 0 0", description="Padding for face detection")
    nosmooth: bool = Field(default=False, description="Disable smoothing")
    reference_pose: Optional[str] = Field(default=None, description="Reference pose image for SadTalker")
    style: Optional[str] = Field(default="neutral", description="Expression style")


class LipSyncResponse(BaseModel):
    """Response model for lip sync generation"""
    job_id: str
    status: str
    video_url: Optional[str] = None
    progress: int
    estimated_time_seconds: Optional[int] = None
    message: Optional[str] = None


class LipSyncStatusResponse(BaseModel):
    """Response model for lip sync status"""
    job_id: str
    status: str
    progress: int
    video_url: Optional[str] = None
    error: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None


# In-memory job storage (in production, use Redis or database)
lip_sync_jobs: Dict[str, Dict[str, Any]] = {}


async def run_lipsync_generation(
    job_id: str,
    request: LipSyncRequest
):
    """
    Background task to run lip sync generation.
    
    Args:
        job_id: Unique job identifier
        request: Lip sync request parameters
    """
    logger.info(f"Starting lip sync generation job {job_id}")
    
    # Update job status
    lip_sync_jobs[job_id] = {
        "job_id": job_id,
        "project_id": request.project_id,
        "status": "processing",
        "progress": 0,
        "created_at": datetime.utcnow().isoformat(),
        "model": request.model.value if hasattr(request.model, 'value') else request.model,
        "character_face_image": request.character_face_image,
        "audio_file": request.audio_file,
    }
    
    try:
        # Step 1: Validate inputs (10%)
        logger.info(f"Lip sync job {job_id}: Validating inputs")
        lip_sync_jobs[job_id]["progress"] = 10
        await asyncio.sleep(0.5)
        
        # Step 2: Connect to ComfyUI (20%)
        logger.info(f"Lip sync job {job_id}: Connecting to ComfyUI")
        lip_sync_jobs[job_id]["progress"] = 20
        
        # Build ComfyUI workflow based on model
        workflow = _build_lipsync_workflow(request)
        
        # Submit workflow to ComfyUI
        comfyui_url = settings.comfyui_url
        prompt_response = await _submit_workflow(comfyui_url, workflow)
        
        if not prompt_response.get("prompt_id"):
            raise Exception("Failed to submit workflow to ComfyUI")
        
        prompt_id = prompt_response["prompt_id"]
        lip_sync_jobs[job_id]["prompt_id"] = prompt_id
        
        # Step 3: Process (40-90%)
        logger.info(f"Lip sync job {job_id}: Processing (prompt_id: {prompt_id})")
        lip_sync_jobs[job_id]["progress"] = 40
        
        # Wait for completion
        result = await _wait_for_completion(comfyui_url, prompt_id, job_id)
        
        if result.get("error"):
            raise Exception(result["error"])
        
        # Step 4: Finalize (100%)
        lip_sync_jobs[job_id]["progress"] = 100
        lip_sync_jobs[job_id]["status"] = "completed"
        lip_sync_jobs[job_id]["video_url"] = result.get("video_url", "")
        lip_sync_jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()
        
        logger.info(f"Lip sync job {job_id} completed successfully")
        
    except Exception as e:
        logger.error(f"Lip sync job {job_id} failed: {e}")
        lip_sync_jobs[job_id]["status"] = "failed"
        lip_sync_jobs[job_id]["error"] = str(e)
        lip_sync_jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()


def _build_lipsync_workflow(request: LipSyncRequest) -> Dict[str, Any]:
    """
    Build ComfyUI workflow for lip sync.
    
    Args:
        request: Lip sync request parameters
        
    Returns:
        ComfyUI workflow dictionary
    """
    if request.model == LipSyncModel.WAV2LIP:
        return _build_wav2lip_workflow(request)
    elif request.model == LipSyncModel.SADTALKER:
        return _build_sadtalker_workflow(request)
    else:
        return _build_wav2lip_workflow(request)


def _build_wav2lip_workflow(request: LipSyncRequest) -> Dict[str, Any]:
    """Build Wav2Lip workflow for ComfyUI"""
    
    # Parse pads
    pads_list = [int(x) for x in request.pads.split()]
    while len(pads_list) < 4:
        pads_list.append(0)
    
    return {
        "1": {
            "inputs": {
                "image": request.character_face_image
            },
            "class_type": "LoadImage",
            "_meta": {"title": "Load Face Image"}
        },
        "2": {
            "inputs": {
                "audio": request.audio_file
            },
            "class_type": "LoadAudio",
            "_meta": {"title": "Load Audio"}
        },
        "3": {
            "inputs": {
                "face_image": ["1", 0],
                "audio_file": ["2", 0],
                "pads": pads_list,
                "nosmooth": request.nosmooth,
                "enhancer": request.enhancer
            },
            "class_type": "Wav2Lip",
            "_meta": {"title": "Wav2Lip"}
        },
        "4": {
            "inputs": {
                "image": ["3", 0],
                "model": "GFPGAN"
            },
            "class_type": "FaceEnhance",
            "_meta": {"title": "Face Enhancement"}
        } if request.enhancer else None,
        "5": {
            "inputs": {
                "filename_prefix": f"lipsync_{request.project_id}",
                "images": ["4" if request.enhancer else "3", 0]
            },
            "class_type": "SaveImage",
            "_meta": {"title": "Save Result"}
        }
    }


def _build_sadtalker_workflow(request: LipSyncRequest) -> Dict[str, Any]:
    """Build SadTalker workflow for ComfyUI"""
    
    # Parse reference pose if provided
    reference_pose = request.reference_pose or request.character_face_image
    
    return {
        "1": {
            "inputs": {
                "image": request.character_face_image
            },
            "class_type": "LoadImage",
            "_meta": {"title": "Load Face Image"}
        },
        "2": {
            "inputs": {
                "audio": request.audio_file
            },
            "class_type": "LoadAudio",
            "_meta": {"title": "Load Audio"}
        },
        "3": {
            "inputs": {
                "source_image": ["1", 0],
                "audio": ["2", 0],
                "ref_pose": reference_pose,
                "style": request.style
            },
            "class_type": "SadTalker",
            "_meta": {"title": "SadTalker"}
        },
        "4": {
            "inputs": {
                "filename_prefix": f"lipsync_{request.project_id}",
                "video": ["3", 0]
            },
            "class_type": "SaveVideo",
            "_meta": {"title": "Save Result"}
        }
    }


async def _submit_workflow(comfyui_url: str, workflow: Dict[str, Any]) -> Dict[str, Any]:
    """Submit workflow to ComfyUI"""
    import aiohttp
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{comfyui_url}/prompt",
                json={"prompt": workflow},
                timeout=aiohttp.ClientTimeout(total=30)
            ) as response:
                if response.status == 200:
                    return await response.json()
                else:
                    raise Exception(f"ComfyUI returned status {response.status}")
    except Exception as e:
        logger.error(f"Failed to submit workflow: {e}")
        # Return mock response for development
        return {"prompt_id": str(uuid.uuid4())}


async def _wait_for_completion(
    comfyui_url: str,
    prompt_id: str,
    job_id: str,
    max_wait: int = 300000
) -> Dict[str, Any]:
    """Wait for ComfyUI to complete the workflow"""
    import aiohttp
    
    start_time = datetime.utcnow()
    result = {"video_url": "", "error": None}
    
    while (datetime.utcnow() - start_time).total_seconds() * 1000 < max_wait:
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(
                    f"{comfyui_url}/history/{prompt_id}",
                    timeout=aiohttp.ClientTimeout(total=10)
                ) as response:
                    if response.status == 200:
                        history = await response.json()
                        
                        if prompt_id in history:
                            outputs = history[prompt_id].get("outputs", {})
                            
                            # Find output node with video/image
                            for node_id, node_output in outputs.items():
                                if node_output.get("images") or node_output.get("video"):
                                    # Get the output URL
                                    if node_output.get("images"):
                                        image = node_output["images"][0]
                                        result["video_url"] = f"{comfyui_url}/view?filename={image['filename']}&subfolder={image.get('subfolder', '')}&type={image.get('type', 'output')}"
                                    elif node_output.get("video"):
                                        video = node_output["video"]
                                        result["video_url"] = f"{comfyui_url}/view?filename={video['filename']}&subfolder={video.get('subfolder', '')}&type={video.get('type', 'output')}"
                                    
                                    return result
                                
                        # Update progress based on time elapsed
                        elapsed = (datetime.utcnow() - start_time).total_seconds()
                        if elapsed > 60:
                            lip_sync_jobs[job_id]["progress"] = min(90, 40 + int(elapsed / 10))
                            
        except Exception as e:
            logger.warning(f"Error checking completion: {e}")
        
        await asyncio.sleep(2)
    
    result["error"] = "Timeout waiting for completion"
    return result


@router.post("/lipsync/generate", response_model=LipSyncResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_lipsync(
    request: LipSyncRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(verify_jwt_token)
) -> LipSyncResponse:
    """
    Generate lip-synced video from character face image and audio.
    
    Args:
        request: Lip sync parameters
        background_tasks: FastAPI background tasks
        user_id: Authenticated user ID
        
    Returns:
        Job response with job ID
        
    Raises:
        HTTPException: If validation fails
    """
    logger.info(f"Starting lip sync for project {request.project_id}")
    
    # Validate inputs
    if not request.character_face_image:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Character face image is required"
        )
    
    if not request.audio_file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Audio file is required"
        )
    
    # Create job
    job_id = str(uuid.uuid4())
    
    # Start background generation
    background_tasks.add_task(run_lipsync_generation, job_id, request)
    
    logger.info(f"Lip sync job {job_id} created")
    
    # Estimate time based on audio duration (rough estimate)
    estimated_time = 30  # Default 30 seconds
    
    return LipSyncResponse(
        job_id=job_id,
        status="processing",
        progress=0,
        estimated_time_seconds=estimated_time,
        message="Lip sync job started"
    )


@router.get("/lipsync/status/{job_id}", response_model=LipSyncStatusResponse)
async def get_lipsync_status(
    job_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> LipSyncStatusResponse:
    """
    Get lip sync job status.
    
    Args:
        job_id: Job identifier
        user_id: Authenticated user ID
        
    Returns:
        Job status
        
    Raises:
        HTTPException: If job not found
    """
    if job_id not in lip_sync_jobs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    job = lip_sync_jobs[job_id]
    
    return LipSyncStatusResponse(
        job_id=job["job_id"],
        status=job["status"],
        progress=job["progress"],
        video_url=job.get("video_url"),
        error=job.get("error"),
        created_at=job["created_at"],
        completed_at=job.get("completed_at")
    )


@router.get("/lipsync/jobs", response_model=List[LipSyncStatusResponse])
async def list_lipsync_jobs(
    project_id: Optional[str] = None,
    user_id: str = Depends(verify_jwt_token)
) -> List[LipSyncStatusResponse]:
    """
    List lip sync jobs, optionally filtered by project.
    
    Args:
        project_id: Optional project filter
        user_id: Authenticated user ID
        
    Returns:
        List of job statuses
    """
    jobs = []
    
    for job in lip_sync_jobs.values():
        if project_id and job.get("project_id") != project_id:
            continue
        
        jobs.append(LipSyncStatusResponse(
            job_id=job["job_id"],
            status=job["status"],
            progress=job["progress"],
            video_url=job.get("video_url"),
            error=job.get("error"),
            created_at=job["created_at"],
            completed_at=job.get("completed_at")
        ))
    
    return jobs


@router.delete("/lipsync/jobs/{job_id}")
async def delete_lipsync_job(
    job_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    Delete a lip sync job.
    
    Args:
        job_id: Job identifier
        user_id: Authenticated user ID
        
    Returns:
        Deletion result
    """
    if job_id in lip_sync_jobs:
        del lip_sync_jobs[job_id]
        return {"success": True, "message": f"Job {job_id} deleted"}
    
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail="Job not found"
    )


@router.get("/lipsync/models")
async def get_available_models(
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    Get available lip sync models.
    
    Returns:
        List of available models
    """
    return {
        "models": [
            {
                "id": "wav2lip",
                "name": "Wav2Lip",
                "description": "Fast and accurate lip sync",
                "requires_ref_pose": False,
                "enhancer_supported": True
            },
            {
                "id": "sadtalker",
                "name": "SadTalker",
                "description": "High quality with pose control",
                "requires_ref_pose": True,
                "enhancer_supported": False
            }
        ]
    }


@router.post("/lipsync/test-connection")
async def test_lipsync_connection(
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    Test connection to ComfyUI for lip sync.
    
    Returns:
        Connection test result
    """
    import aiohttp
    
    comfyui_url = settings.comfyui_url
    
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{comfyui_url}/system_stats",
                timeout=aiohttp.ClientTimeout(total=5)
            ) as response:
                if response.ok:
                    return {
                        "success": True,
                        "message": "Connected to ComfyUI",
                        "url": comfyui_url
                    }
                else:
                    return {
                        "success": False,
                        "message": f"ComfyUI returned status {response.status}",
                        "url": comfyui_url
                    }
    except Exception as e:
        return {
            "success": False,
            "message": f"Cannot connect to ComfyUI: {str(e)}",
            "url": comfyui_url
        }

