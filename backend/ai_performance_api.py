"""
AI Performance API Endpoints for StoryCore-Engine

FastAPI routes for performance features:
- Job progress tracking
- Cache management
- Batch processing
- Job queue management

Phase 9: Performance & Production
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from datetime import datetime
import uuid

from backend.ai_performance_service import (
    get_progress_manager,
    get_cache_service,
    get_job_queue,
)


router = APIRouter(prefix="/api/ai/performance", tags=["ai-performance"])


# =============================================================================
# Request/Response Models
# =============================================================================


class JobSubmitRequest(BaseModel):
    """Request to submit a job"""

    job_type: str
    params: Dict[str, Any]
    priority: int = 0


class Export8KRequest(BaseModel):
    """Request for 8K export"""

    input_path: str
    output_path: str
    custom_codec: Optional[str] = None  # 'prores' or 'h265'


class BatchProcessRequest(BaseModel):
    """Request for batch processing"""

    items: List[Dict[str, Any]]
    job_type: str
    max_workers: int = 4


class CacheInvalidateRequest(BaseModel):
    """Request to invalidate cache"""

    operation: str
    params: Dict[str, Any]


# =============================================================================
# Job Progress Endpoints
# =============================================================================


@router.post("/jobs/create")
async def create_job(message: str = "Starting..."):
    """Create a new job for progress tracking."""
    manager = get_progress_manager()
    job_id = str(uuid.uuid4())
    job = manager.create_job(job_id, message)

    return {
        "job_id": job_id,
        "status": job.status,
        "message": job.message,
        "created_at": job.started_at.isoformat(),
    }


@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str):
    """Get job status and progress."""
    manager = get_progress_manager()
    job = manager.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "job_id": job.job_id,
        "status": job.status,
        "progress": job.progress,
        "message": job.message,
        "started_at": job.started_at.isoformat(),
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
        "result": job.result,
        "error": job.error,
    }


@router.put("/jobs/{job_id}/progress")
async def update_job_progress(job_id: str, progress: float, message: str):
    """Update job progress."""
    manager = get_progress_manager()
    job = manager.update_progress(job_id, progress, message)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "job_id": job.job_id,
        "status": job.status,
        "progress": job.progress,
        "message": job.message,
    }


@router.post("/jobs/{job_id}/complete")
async def complete_job(
    job_id: str, result: Optional[Dict] = None, error: Optional[str] = None
):
    """Mark job as completed."""
    manager = get_progress_manager()
    job = manager.complete_job(job_id, result, error)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "job_id": job.job_id,
        "status": job.status,
        "completed_at": job.completed_at.isoformat() if job.completed_at else None,
    }


@router.post("/jobs/cleanup")
async def cleanup_old_jobs(max_age_hours: int = 24):
    """Remove old completed jobs."""
    manager = get_progress_manager()
    removed = manager.cleanup_old_jobs(max_age_hours)

    return {
        "removed": removed,
        "message": f"Removed {removed} jobs older than {max_age_hours} hours",
    }


# =============================================================================
# Cache Endpoints
# =============================================================================


@router.get("/cache/stats")
async def get_cache_stats():
    """Get cache statistics."""
    cache = get_cache_service()
    return cache.get_stats()


@router.get("/cache/get")
async def get_cached_result(operation: str, params: Dict[str, Any] = None):
    """Get cached result if exists."""
    if params is None:
        params = {}

    cache = get_cache_service()
    result = cache.get(operation, params)

    return {"found": result is not None, "result": result}


@router.post("/cache/set")
async def set_cached_result(
    operation: str, params: Dict[str, Any], value: Any, ttl_hours: int = 24
):
    """Cache a result."""
    cache = get_cache_service()
    cache.set(operation, params, value, ttl_hours)

    return {"success": True, "message": f"Result cached for {ttl_hours} hours"}


@router.post("/cache/invalidate")
async def invalidate_cache(request: CacheInvalidateRequest):
    """Invalidate a cached result."""
    cache = get_cache_service()
    cache.invalidate(request.operation, request.params)

    return {"success": True, "message": "Cache invalidated"}


@router.post("/cache/clear")
async def clear_all_cache():
    """Clear all cache."""
    cache = get_cache_service()
    cache.clear_all()

    return {"success": True, "message": "All cache cleared"}


# =============================================================================
# Batch Processing Endpoints
# =============================================================================


@router.post("/batch/process")
async def process_batch(request: BatchProcessRequest):
    """
    Process a batch of items.

    Returns batch processing results and statistics.
    """
    # This would be connected to actual processing handlers
    # For now, return a placeholder response

    batch_id = str(uuid.uuid4())

    return {
        "batch_id": batch_id,
        "total_items": len(request.items),
        "job_type": request.job_type,
        "max_workers": request.max_workers,
        "status": "queued",
        "message": "Batch job submitted. Use /batch/{batch_id} to check status.",
    }


@router.get("/batch/{batch_id}")
async def get_batch_status(batch_id: str):
    """Get batch processing status."""
    # Placeholder - would track actual batch jobs
    return {
        "batch_id": batch_id,
        "status": "processing",
        "progress": 50,
        "completed": 0,
        "failed": 0,
        "total": 0,
    }


# =============================================================================
# Job Queue Endpoints
# =============================================================================


@router.post("/queue/submit")
async def submit_job_to_queue(request: JobSubmitRequest):
    """Submit a job to the queue."""
    queue = get_job_queue()
    job_id = str(uuid.uuid4())

    success = queue.submit_job(
        job_id, request.job_type, request.params, request.priority
    )

    if not success:
        raise HTTPException(status_code=503, detail="Queue is full")

    return {
        "job_id": job_id,
        "status": "submitted",
        "message": "Job submitted to queue",
    }


@router.get("/queue/{job_id}")
async def get_queued_job_status(job_id: str):
    """Get queued job status."""
    queue = get_job_queue()
    job = queue.get_job_status(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return job


@router.post("/queue/{job_id}/cancel")
async def cancel_queued_job(job_id: str):
    """Cancel a queued job."""
    queue = get_job_queue()
    success = queue.cancel_job(job_id)

    if not success:
        raise HTTPException(status_code=400, detail="Cannot cancel job")

    return {"job_id": job_id, "status": "cancelled"}


@router.get("/queue/stats")
async def get_queue_stats():
    """Get queue statistics."""
    queue = get_job_queue()
    return queue.get_queue_stats()


@router.post("/queue/workers/start")
async def start_queue_workers(num_workers: int = 2):
    """Start queue worker threads."""
    queue = get_job_queue()
    queue.start_workers(num_workers)

    return {"success": True, "message": f"Started {num_workers} workers"}


@router.post("/queue/workers/stop")
async def stop_queue_workers():
    """Stop all queue workers."""
    queue = get_job_queue()
    queue.stop_workers()

    return {"success": True, "message": "Workers stopped"}


# =============================================================================
# 8K Export Specific Endpoints
# =============================================================================


@router.post("/export-8k")
async def submit_8k_export(request: Export8KRequest):
    """
    Submit an 8K export task to the queue.

    Status returned immediately: "Tâche ajoutée à la queue".
    Processing happens in batch mode via the job queue.
    """
    queue = get_job_queue()
    job_id = f"8k_export_{str(uuid.uuid4())[:8]}"

    # Ensure workers are started (if not already)
    queue.start_workers(num_workers=1)  # 8K export is heavy, use 1 worker for it

    params = {
        "input_path": request.input_path,
        "output_path": request.output_path,
        "custom_codec": request.custom_codec,
    }

    success = queue.submit_job(
        job_id,
        "export_8k",
        params,
        priority=2,  # High priority for exports
    )

    if not success:
        raise HTTPException(status_code=503, detail="Queue is full")

    return {
        "job_id": job_id,
        "status": "Tâche ajoutée à la queue",
        "message": "Export 8K en cours de traitement (mode batch)",
    }


# =============================================================================
# Job Handlers
# =============================================================================


async def handle_export_8k(params: Dict[str, Any]):
    """Handler for 8K export jobs"""
    from backend.video_enhancement_service import get_enhancement_service
    import logging

    logger = logging.getLogger("8k_export")
    input_path = params.get("input_path")
    output_path = params.get("output_path")
    custom_codec = params.get("custom_codec")

    service = get_enhancement_service()

    def progress_callback(step: str, progress: float):
        logger.info(f"8K Export Progress: {step} - {progress}%")

    try:
        result = service.export_8k(
            input_path=input_path,
            output_path=output_path,
            custom_codec=custom_codec,
            callback=progress_callback,
        )

        if result.get("success"):
            return {"status": "Export 8K terminé", "metadata": result.get("metadata")}
        else:
            return {"status": "failed", "error": result.get("status")}

    except Exception as e:
        logger.error(f"Error in 8K export handler: {e}")
        return {"status": "failed", "error": str(e)}


# Register handlers on module import
get_job_queue().register_handler("export_8k", handle_export_8k)


# =============================================================================
# Health Check
# =============================================================================


@router.get("/health")
async def performance_service_health():
    """Check health status of performance services."""
    cache = get_cache_service()
    queue = get_job_queue()

    cache_stats = cache.get_stats()
    queue_stats = queue.get_queue_stats()

    return {
        "status": "healthy",
        "service": "StoryCore AI Performance",
        "version": "1.0.0",
        "timestamp": datetime.utcnow().isoformat(),
        "cache": cache_stats,
        "queue": queue_stats,
    }
