#!/usr/bin/env python3
"""
Lip Sync API for StoryCore Backend
Handles lip synchronization requests using Wav2Lip
"""

import asyncio
import base64
import json
import logging
import os
import sys
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from backend.config import settings, get_comfyui_url
from backend.auth import verify_jwt_token
from comfyui_workflow_executor import ComfyUIWorkflowExecutor, WorkflowType

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Router for integration
router = APIRouter(prefix="/lip-sync", tags=["lip-sync"])

# Port for standalone mode
STANDALONE_PORT = 8001

# Output directory
OUTPUT_DIR = Path(__file__).parent.parent.parent / "output" / "lip_sync"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# In-memory job storage
jobs: Dict[str, Dict[str, Any]] = {}

# Request/Response models
class LipSyncRequest(BaseModel):
    project_id: str
    character_image: str  # Base64 or path
    dialogue_audio: str   # Base64 or path
    comfyui_url: Optional[str] = None  # Specific ComfyUI server URL
    preset: str = "default"
    enhancer: bool = True
    nosmooth: bool = False
    upsample: bool = True
    pads: list = [0, 10, 0, 0]

class LipSyncResponse(BaseModel):
    job_id: str
    status: str
    message: str

class JobStatusResponse(BaseModel):
    job_id: str
    status: str
    progress: float
    output_path: Optional[str] = None
    error: Optional[str] = None

@router.post("/execute", response_model=LipSyncResponse)
async def execute_lip_sync(request: LipSyncRequest, background_tasks: BackgroundTasks, user_payload: dict = Depends(verify_jwt_token)):
    # user_id is the payload from JWT (sub claim)
    job_user_id = user_payload.get("sub") if isinstance(user_payload, dict) else str(user_payload)
    job_id = str(uuid.uuid4())
    logger.info(f"Starting lip sync job: {job_id} for user: {job_user_id}")
    
    jobs[job_id] = {
        "status": "pending",
        "progress": 0.0,
        "request": request.dict(),
        "output_path": None,
        "error": None,
        "user_id": job_user_id  # Store user_id for authorization
    }
    
    background_tasks.add_task(run_lip_sync_job, job_id, request)
    return LipSyncResponse(job_id=job_id, status="started", message="Lip sync job started")

async def run_lip_sync_job(job_id: str, request: LipSyncRequest):
    # Use provided URL or default from settings
    comfyui_url = request.comfyui_url
    executor = ComfyUIWorkflowExecutor()
    
    try:
        jobs[job_id]["status"] = "processing"
        output_filename = f"lip_sync_{job_id}"
        
        logger.info(f"Submitting lip sync to ComfyUI at {comfyui_url or 'default server'}")
        
        # Real workflow execution
        result = await executor.execute_lip_sync(
            character_image=request.character_image,
            dialogue_audio=request.dialogue_audio,
            comfyui_url=comfyui_url,
            output_filename=output_filename,
            project_id=request.project_id
        )
        
        if result.success:
            jobs[job_id]["status"] = "completed"
            jobs[job_id]["progress"] = 100.0
            jobs[job_id]["output_path"] = result.output_path
            logger.info(f"Lip sync job completed: {job_id} -> {result.output_path}")
        else:
            raise Exception(result.error_message)
            
    except Exception as e:
        logger.error(f"Lip sync job failed: {job_id} - {e}")
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)

@router.get("/status/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str, user_payload: dict = Depends(verify_jwt_token)):
    user_id = user_payload.get("sub") if isinstance(user_payload, dict) else str(user_payload)
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    job = jobs[job_id]
    # Only return job if it belongs to the user
    if job.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="Not authorized to access this job")
    return JobStatusResponse(
        job_id=job_id,
        status=job["status"],
        progress=job["progress"],
        output_path=job.get("output_path"),
        error=job.get("error")
    )

@router.get("/presets")
async def get_presets():
    return [
        {
            "id": "default",
            "name": "Default",
            "description": "Standard lip sync quality",
            "params": {"enhancer": True, "nosmooth": False, "upsample": True, "pads": [0, 10, 0, 0]}
        },
        {
            "id": "high-quality",
            "name": "High Quality",
            "description": "Best quality with GFPGAN enhancement",
            "params": {"enhancer": True, "nosmooth": False, "upsample": True, "pads": [0, 0, 0, 0]}
        }
    ]

@router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "lip-sync-api"}

# Mock app for standalone mode
app = FastAPI(title="Lip Sync Standalone")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])
app.include_router(router, prefix="/api")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=STANDALONE_PORT)
