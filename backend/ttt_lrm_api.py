"""
tttLRM API Endpoints for StoryCore-Engine

Exposes 3D reconstruction capabilities through a REST API.
Endpoints for single image-to-3D, video-to-3D, and 3DGS-to-Mesh conversion.
"""

import os
from typing import Any, Dict
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from backend.ttt_lrm_service import (
    TTTLRMService,
    TTTLRMConfig,
    ReconstructionMode,
    OutputFormat,
)

router = APIRouter(prefix="/api/ttt-lrm", tags=["tttLRM"])
service = TTTLRMService()

# =============================================================================
# Models
# =============================================================================


class ReconstructionRequest(BaseModel):
    """Request for 3D reconstruction"""

    input_path: str = Field(..., description="Path to the input image or video")
    mode: ReconstructionMode = Field(
        ReconstructionMode.FEEDFORWARD,
        description="FEEDFORWARD (fast) or TTT_ADAPTED (high quality)",
    )
    output_format: OutputFormat = Field(OutputFormat.GS, description="3DGS or MESH")
    resolution: int = Field(1024, description="Target pixel resolution")
    num_ttt_iterations: int = Field(50, description="Iterations for TTT adaptation")


class ReconstructionResponse(BaseModel):
    """Response of a reconstruction task"""

    id: str
    success: bool
    output_path: str
    format: str
    processing_time: float
    message: str
    metrics: Dict[str, Any] = {}


# =============================================================================
# Endpoints
# =============================================================================


@router.get("/status")
async def get_status():
    """Get the status of the tttLRM service and GPU availability"""
    return service.get_service_status()


@router.post("/reconstruct/image", response_model=ReconstructionResponse)
async def reconstruct_image(request: ReconstructionRequest):
    """
    Reconstruct a 3D model (Gaussian Splat) from a single input image.
    If TTT_ADAPTED mode is selected, refined weights will be used to improve quality.
    """
    if not os.path.exists(request.input_path):
        raise HTTPException(
            status_code=404, detail=f"Input file not found: {request.input_path}"
        )

    # Define output directory
    output_dir = os.path.join("output", "reconstructions", "3dgs")
    os.makedirs(output_dir, exist_ok=True)

    config = TTTLRMConfig(
        input_path=request.input_path,
        output_dir=output_dir,
        mode=request.mode,
        output_format=request.output_format,
        resolution=request.resolution,
        num_ttt_iterations=request.num_ttt_iterations,
    )

    result = await service.reconstruct_single_image(config)

    return ReconstructionResponse(
        id=result.id,
        success=result.success,
        output_path=result.output_path,
        format=result.format.value,
        processing_time=result.processing_time,
        message="Reconstruction successful"
        if result.success
        else "Reconstruction failed",
        metrics=result.metrics,
    )


@router.post("/reconstruct/video", response_model=ReconstructionResponse)
async def reconstruct_video(request: ReconstructionRequest):
    """
    Reconstruct a complete 3D scene from an omnidirectional or moving video.
    Uses autoregressive context compression for long sequences.
    """
    if not os.path.exists(request.input_path):
        raise HTTPException(
            status_code=404, detail=f"Input video not found: {request.input_path}"
        )

    output_dir = os.path.join("output", "reconstructions", "scenes")
    os.makedirs(output_dir, exist_ok=True)

    config = TTTLRMConfig(
        input_path=request.input_path,
        output_dir=output_dir,
        mode=ReconstructionMode.AUTOREGRESSIVE,
        output_format=OutputFormat.GS,
        resolution=request.resolution,
    )

    result = await service.reconstruct_video_360(request.input_path, config)

    return ReconstructionResponse(
        id=result.id,
        success=result.success,
        output_path=result.output_path,
        format=result.format.value,
        processing_time=result.processing_time,
        message="Scene reconstruction complete"
        if result.success
        else "Scene reconstruction failed",
        metrics=result.metrics,
    )


@router.post("/convert/gs-to-mesh")
async def convert_to_mesh(gs_path: str, output_path: str):
    """Convert Gaussian Splats to standard GLB/OBJ for engine integration"""
    if not os.path.exists(gs_path):
        raise HTTPException(status_code=404, detail=f"GS file not found: {gs_path}")

    success = service.convert_gs_to_mesh(gs_path, output_path)

    if not success:
        raise HTTPException(status_code=500, detail="Conversion to mesh failed")

    return {
        "success": True,
        "output_path": output_path,
        "message": "Mesh converted successfully",
    }
