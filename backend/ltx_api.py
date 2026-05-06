"""
LTX 2.3 Video Generation API for StoryCore-Engine

Exposes endpoints for high-quality video generation with native audio.
"""

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Any, Dict, Optional
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
    negative_prompt: Optional[str] = Field(
        "blurry, low quality, distorted, deformed", description="Elements to avoid"
    )
    aspect_ratio: str = Field(
        "16:9",
        description="Portrait (9:16), Landscape (16:9), Square (1:1), Cinematic (2.35:1)",
    )
    duration: float = Field(5.0, description="Duration in seconds (max 20s)")
    audio_enabled: bool = Field(True, description="Enable native audio generation")
    audio_prompt: Optional[str] = Field(
        None, description="Specific description for the audio track"
    )
    seed: Optional[int] = Field(None, description="Random seed for reproducibility")
    steps: int = Field(20, description="Number of sampling steps (10-50)")
    cfg: float = Field(3.5, description="Classifier Free Guidance (1.0-10.0)")
    image_reference: Optional[str] = Field(
        None, description="Path to image for Image-to-Video generation"
    )


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
    job_id = str(uuid.uuid4())

    # 1. Map aspect ratio
    ar_map = {
        "16:9": LTXAspectRatio.HORIZONTAL,
        "9:16": LTXAspectRatio.VERTICAL,
        "1:1": LTXAspectRatio.SQUARE,
        "2.35:1": LTXAspectRatio.CINEMATIC,
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
        cfg=request.cfg,
        image_reference=request.image_reference,
    )

    # 3. Create service and submit in background
    service = LTXVideoService()
    import asyncio

    asyncio.create_task(service.generate_video(config, job_id=job_id))

    return LTXResponse(
        job_id=job_id, status="pending", message="Generation job started."
    )


@LTX_ROUTER.get("/status/{job_id}", response_model=LTXStatusResponse)
async def get_status(job_id: str):
    """
    Check the status of a generation job.
    """
    job_state = LTXVideoService.get_job_status(job_id)
    if not job_state:
        # Check if it's a mock or legacy ID
        return LTXStatusResponse(
            job_id=job_id,
            status="not_found",
            error="Job ID not found in current session",
        )

    return LTXStatusResponse(
        job_id=job_id,
        status=job_state.get("status", "unknown"),
        output_path=job_state.get("output_path"),
        error=job_state.get("error"),
        config=job_state.get("config"),
    )
