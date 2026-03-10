"""
LTX 2.3 Video Generation API for StoryCore-Engine

Exposes endpoints for high-quality video generation with native audio.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
import uuid

from backend.ltx_service import LTXVideoService, LTXGenerationConfig, LTXAspectRatio
from backend.config import settings

LTX_ROUTER = APIRouter(prefix="/api/ltx", tags=["LTX 2.3 Video Generation"])

# =============================================================================
# Pydantic Models for API
# =============================================================================

class LTXRequest(BaseModel):
    """Request for LTX video generation"""
    prompt: str = Field(..., description="The textual description of the video")
    negative_prompt: Optional[str] = Field("blurry, low quality, distorted, deformed", description="Elements to avoid")
    aspect_ratio: str = Field("16:9", description="Portrait (9:16), Landscape (16:9), Square (1:1), Cinematic (2.35:1)")
    duration: float = Field(5.0, description="Duration in seconds (max 20s)")
    audio_enabled: bool = Field(True, description="Enable native audio generation")
    audio_prompt: Optional[str] = Field(None, description="Specific description for the audio track")
    seed: Optional[int] = Field(None, description="Random seed for reproducibility")
    steps: int = Field(20, description="Number of sampling steps (10-50)")
    cfg: float = Field(3.5, description="Classifier Free Guidance (1.0-10.0)")

class LTXResponse(BaseModel):
    """Response for LTX video generation job submission"""
    job_id: str
    status: str
    message: str

class LTXStatusResponse(BaseModel):
    """Response for LTX job status check"""
    job_id: str
    status: str
    output_path: Optional[str] = None
    error: Optional[str] = None
    config: Optional[Dict[str, Any]] = None

# =============================================================================
# API Endpoints
# =============================================================================

@LTX_ROUTER.post("/generate", response_model=LTXResponse)
async def generate_video(request: LTXRequest):
    """
    Submits a video generation job to LTX 2.3.
    """
    # 1. Map aspect ratio string to Enum
    ar_map = {
        "16:9": LTXAspectRatio.HORIZONTAL,
        "9:16": LTXAspectRatio.VERTICAL,
        "1:1": LTXAspectRatio.SQUARE,
        "2.35:1": LTXAspectRatio.CINEMATIC
    }
    aspect_ratio = ar_map.get(request.aspect_ratio, LTXAspectRatio.HORIZONTAL)
    
    # 2. Build configuration
    config = LTXGenerationConfig(
        prompt=request.prompt,
        negative_prompt=request.negative_prompt,
        aspect_ratio=aspect_ratio,
        duration=min(request.duration, settings.LTX_MAX_DURATION),
        audio_enabled=request.audio_enabled,
        audio_prompt=request.audio_prompt,
        seed=request.seed,
        steps=request.steps,
        cfg=request.cfg
    )
    
    # 3. Create service and submit
    service = LTXVideoService()
    
    # Run in background via service directly (handling its own polling/async)
    # Note: In a production app, we would use a task queue like Celery or Redis Task Queue.
    # For now, we utilize the async methods of the service.
    
    # Start the job
    asyncio.create_task(service.generate_video(config))
    
    return LTXResponse(
        job_id=str(uuid.uuid4()), # In a real implementation, the service would return this
        status="pending",
        message="Generation job started. Check status with /api/ltx/status/{job_id}"
    )

@LTX_ROUTER.get("/status/{job_id}", response_model=LTXStatusResponse)
async def get_status(job_id: str):
    """
    Check the status of a generation job.
    """
    # Implementation placeholder: Retrieve from redis/temp_db
    # This would normally query the service's state tracker.
    return LTXStatusResponse(
        job_id=job_id,
        status="processing",
        message="Job is currently being processed by ComfyUI"
    )

import asyncio
