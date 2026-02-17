from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from typing import List, Optional
import logging

from backend.cine_production_service import CineProductionService, CineProductionRequest, CineProductionJob, CineJobStatus
from backend.auth import verify_jwt_token

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/cine-production", tags=["cine-production"])
cine_service = CineProductionService()

@router.post("/start", response_model=str)
async def start_production(
    request: CineProductionRequest,
    user_id: str = Depends(verify_jwt_token)
):
    """
    Starts a high-fidelity cinematic production job.
    """
    try:
        job_id = await cine_service.start_production_job(request)
        return job_id
    except Exception as e:
        logger.error(f"Failed to start production: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status/{job_id}", response_model=CineProductionJob)
async def get_job_status(
    job_id: str,
    user_id: str = Depends(verify_jwt_token)
):
    """
    Returns the current status of a production job.
    """
    job = await cine_service.get_job_status(job_id)
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.get("/workflows", response_model=List[str])
async def list_available_workflows(
    user_id: str = Depends(verify_jwt_token)
):
    """
    Lists all available high-fidelity workflows.
    """
    return list(cine_service.WORKFLOW_PATHS.keys())
