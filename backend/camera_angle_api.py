"""
StoryCore-Engine Camera Angle API

This module provides REST API endpoints for the camera angle editor feature.
Supports async job queue for long-running AI generation operations.

Endpoints:
- POST /api/camera-angle/generate - Start generation job
- GET /api/camera-angle/jobs/{job_id} - Get job status
- GET /api/camera-angle/results/{job_id} - Get result
- GET /api/camera-angle/presets - List available presets
- DELETE /api/camera-angle/jobs/{job_id} - Cancel job

Requirements: Q1 2026 - Camera Angle Editor Feature
"""

import logging
import os
import sys
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks
from pydantic import BaseModel, Field

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.auth import verify_jwt_token
from backend.camera_angle_types import (
    CameraAnglePreset,
    CameraAngleJobStatus,
    CameraAngleRequest,
    CameraAngleJob,
    CameraAngleJobResponse,
    CameraAngleResult,
    CameraAngleResultResponse,
    CameraAnglePresetInfo,
    CameraAnglePresetsResponse,
    CameraAngleCancelResponse,
    CAMERA_ANGLE_PRESET_METADATA,
)
from backend.camera_angle_service import (
    CameraAngleService,
    get_camera_angle_service,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/camera-angle", tags=["Camera Angle Editor"])


# ============================================================================
# Additional Request/Response Models
# ============================================================================

class GenerateRequest(BaseModel):
    """Request model for starting a generation job"""
    image_base64: str = Field(..., description="Base64 encoded source image")
    angle_ids: List[CameraAnglePreset] = Field(
        ...,
        min_length=1,
        description="List of camera angle presets to generate"
    )
    preserve_style: bool = Field(
        default=True,
        description="Maintain original image style"
    )
    quality: str = Field(
        default="standard",
        description="Generation quality: draft, standard, or high"
    )
    seed: Optional[int] = Field(
        default=None,
        description="Random seed for reproducible generation"
    )
    custom_prompt: Optional[str] = Field(
        default=None,
        description="Additional custom prompt"
    )


class GenerateResponse(BaseModel):
    """Response model for generation start"""
    job_id: str = Field(..., description="Job identifier for tracking")
    status: CameraAngleJobStatus = Field(..., description="Initial job status")
    message: str = Field(..., description="Status message")
    estimated_time: Optional[int] = Field(
        default=None,
        description="Estimated processing time in seconds"
    )


class ConnectionTestResponse(BaseModel):
    """Response model for connection test"""
    success: bool = Field(..., description="Connection success status")
    message: str = Field(..., description="Status message")
    comfyui_url: str = Field(..., description="ComfyUI URL")


# ============================================================================
# Helper Functions
# ============================================================================

def _job_to_response(job: CameraAngleJob) -> CameraAngleJobResponse:
    """
    Convert CameraAngleJob to CameraAngleJobResponse.
    
    Args:
        job: CameraAngleJob instance
        
    Returns:
        CameraAngleJobResponse instance
    """
    return CameraAngleJobResponse(
        job_id=job.id,
        status=job.status,
        progress=job.progress,
        current_step=job.current_step,
        completed_angles=[a.value for a in job.completed_angles],
        remaining_angles=[a.value for a in job.remaining_angles],
        error=job.error,
        created_at=job.created_at.isoformat() if job.created_at else "",
        started_at=job.started_at.isoformat() if job.started_at else None,
        completed_at=job.completed_at.isoformat() if job.completed_at else None
    )


def _estimate_generation_time(angle_count: int, quality: str) -> int:
    """
    Estimate generation time based on angle count and quality.
    
    Args:
        angle_count: Number of angles to generate
        quality: Quality setting
        
    Returns:
        Estimated time in seconds
    """
    base_times = {
        "draft": 5,
        "standard": 10,
        "high": 20
    }
    base_time = base_times.get(quality, 10)
    return angle_count * base_time


# ============================================================================
# API Endpoints
# ============================================================================

@router.post(
    "/generate",
    response_model=GenerateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Start camera angle generation",
    description="Start an asynchronous camera angle generation job"
)
async def generate_camera_angles(
    request: GenerateRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(verify_jwt_token)
) -> GenerateResponse:
    """
    Start a camera angle generation job.
    
    This endpoint accepts an image and a list of camera angle presets,
    then starts an asynchronous generation job.
    
    Args:
        request: Generation request with image and angle settings
        background_tasks: FastAPI background tasks
        user_id: Authenticated user ID
        
    Returns:
        GenerateResponse with job ID and initial status
        
    Raises:
        HTTPException: If validation fails or job creation fails
    """
    try:
        # Validate quality setting
        valid_qualities = ["draft", "standard", "high"]
        if request.quality not in valid_qualities:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid quality '{request.quality}'. Must be one of: {valid_qualities}"
            )
        
        # Validate angle IDs
        if not request.angle_ids:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="At least one camera angle must be specified"
            )
        
        # Get service instance
        service = get_camera_angle_service()
        
        # Create camera angle request
        camera_request = CameraAngleRequest(
            image_base64=request.image_base64,
            angle_ids=request.angle_ids,
            preserve_style=request.preserve_style,
            quality=request.quality,
            seed=request.seed,
            custom_prompt=request.custom_prompt
        )
        
        # Start generation job
        job_id = await service.generate_multiple_angles(
            request=camera_request,
            user_id=user_id
        )
        
        # Estimate processing time
        estimated_time = _estimate_generation_time(
            len(request.angle_ids),
            request.quality
        )
        
        logger.info(f"Started camera angle generation job {job_id} for user {user_id}")
        
        return GenerateResponse(
            job_id=job_id,
            status=CameraAngleJobStatus.PENDING,
            message="Generation job started successfully",
            estimated_time=estimated_time
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to start generation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start generation: {str(e)}"
        )


@router.get(
    "/jobs/{job_id}",
    response_model=CameraAngleJobResponse,
    summary="Get job status",
    description="Get the current status of a camera angle generation job"
)
async def get_job_status(
    job_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> CameraAngleJobResponse:
    """
    Get the status of a generation job.
    
    Args:
        job_id: Job identifier
        user_id: Authenticated user ID
        
    Returns:
        CameraAngleJobResponse with current job status
        
    Raises:
        HTTPException: If job not found or access denied
    """
    service = get_camera_angle_service()
    job = service.get_job_status(job_id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job {job_id} not found"
        )
    
    # Check ownership
    if job.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You don't have permission to view this job"
        )
    
    return _job_to_response(job)


@router.get(
    "/results/{job_id}",
    response_model=CameraAngleResultResponse,
    summary="Get generation results",
    description="Get the results of a completed camera angle generation job"
)
async def get_job_results(
    job_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> CameraAngleResultResponse:
    """
    Get the results of a completed generation job.
    
    Args:
        job_id: Job identifier
        user_id: Authenticated user ID
        
    Returns:
        CameraAngleResultResponse with generated images
        
    Raises:
        HTTPException: If job not found, not completed, or access denied
    """
    service = get_camera_angle_service()
    job = service.get_job_status(job_id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job {job_id} not found"
        )
    
    # Check ownership
    if job.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You don't have permission to view this job"
        )
    
    # Check if job is completed
    if job.status != CameraAngleJobStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job is not completed. Current status: {job.status.value}"
        )
    
    # Get results
    results = service.get_result(job_id)
    
    if not results:
        results = []
    
    # Calculate total generation time
    total_time = sum(r.generation_time_seconds for r in results)
    
    return CameraAngleResultResponse(
        job_id=job_id,
        status=job.status,
        results=results,
        total_generation_time=total_time
    )


@router.get(
    "/presets",
    response_model=CameraAnglePresetsResponse,
    summary="List available presets",
    description="Get a list of all available camera angle presets"
)
async def list_presets() -> CameraAnglePresetsResponse:
    """
    Get all available camera angle presets.
    
    Returns:
        CameraAnglePresetsResponse with list of presets
    """
    presets = []
    for preset_id, metadata in CAMERA_ANGLE_PRESET_METADATA.items():
        presets.append(CameraAnglePresetInfo(
            id=preset_id,
            display_name=metadata["display_name"],
            description=metadata["description"],
            icon=metadata["icon"]
        ))
    
    return CameraAnglePresetsResponse(
        presets=presets,
        total=len(presets)
    )


@router.delete(
    "/jobs/{job_id}",
    response_model=CameraAngleCancelResponse,
    summary="Cancel a job",
    description="Cancel a running camera angle generation job"
)
async def cancel_job(
    job_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> CameraAngleCancelResponse:
    """
    Cancel a running generation job.
    
    Args:
        job_id: Job identifier
        user_id: Authenticated user ID
        
    Returns:
        CameraAngleCancelResponse with cancellation status
        
    Raises:
        HTTPException: If job not found, access denied, or cancellation fails
    """
    service = get_camera_angle_service()
    job = service.get_job_status(job_id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job {job_id} not found"
        )
    
    # Check ownership
    if job.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You don't have permission to cancel this job"
        )
    
    # Check if job can be cancelled
    if job.status not in [CameraAngleJobStatus.PENDING, CameraAngleJobStatus.PROCESSING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel job with status: {job.status.value}"
        )
    
    # Cancel the job
    success = await service.cancel_job(job_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to cancel job"
        )
    
    logger.info(f"Cancelled camera angle job {job_id} by user {user_id}")
    
    return CameraAngleCancelResponse(
        job_id=job_id,
        status=CameraAngleJobStatus.CANCELLED,
        message="Job cancelled successfully"
    )


@router.get(
    "/test-connection",
    response_model=ConnectionTestResponse,
    summary="Test ComfyUI connection",
    description="Test the connection to the ComfyUI server"
)
async def test_connection(
    user_id: str = Depends(verify_jwt_token)
) -> ConnectionTestResponse:
    """
    Test the connection to ComfyUI.
    
    Args:
        user_id: Authenticated user ID
        
    Returns:
        ConnectionTestResponse with connection status
    """
    service = get_camera_angle_service()
    
    try:
        is_connected = await service.check_comfyui_connection()
        
        if is_connected:
            return ConnectionTestResponse(
                success=True,
                message="Successfully connected to ComfyUI",
                comfyui_url=service.comfyui_url
            )
        else:
            return ConnectionTestResponse(
                success=False,
                message="ComfyUI server is not responding",
                comfyui_url=service.comfyui_url
            )
    except Exception as e:
        return ConnectionTestResponse(
            success=False,
            message=f"Connection error: {str(e)}",
            comfyui_url=service.comfyui_url
        )


# ============================================================================
# Health Check Endpoint
# ============================================================================

@router.get(
    "/health",
    summary="Camera angle service health check",
    description="Check if the camera angle service is healthy"
)
async def health_check():
    """
    Health check endpoint for the camera angle service.
    
    Returns:
        Health status dictionary
    """
    service = get_camera_angle_service()
    comfyui_connected = await service.check_comfyui_connection()
    
    return {
        "status": "healthy",
        "service": "camera-angle",
        "comfyui_connected": comfyui_connected,
        "timestamp": datetime.utcnow().isoformat()
    }
