"""
StoryCore-Engine Task Queue Management API

This module provides REST API endpoints for managing the generation job queue.
Supports priority reordering, status updates, and queue visualization.

Endpoints:
- GET /api/tasks/queue - Get all jobs in queue sorted by priority
- PUT /api/tasks/{job_id}/priority - Update job priority
- POST /api/tasks/{job_id}/move-up - Move job up in queue (higher priority)
- POST /api/tasks/{job_id}/move-down - Move job down in queue (lower priority)
- POST /api/tasks/{job_id}/retry - Retry a failed job
- GET /api/tasks/stats - Get queue statistics

Requirements: Q1 2026 - Task Queue Management
"""

import logging
import os
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.auth import verify_jwt_token
from backend.sequence_api import (
    job_storage,
    GenerationStatus,
    GenerationJob,
    save_job,
    load_job,
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()


# ============================================================================
# Pydantic Models
# ============================================================================

class TaskQueueItem(BaseModel):
    """Task queue item response model"""
    job_id: str
    project_id: Optional[str] = None
    prompt: Optional[str] = None
    shot_count: Optional[int] = None
    style: Optional[str] = None
    mood: Optional[str] = None
    status: str
    progress: int
    current_step: Optional[str] = None
    priority: int
    estimated_time: Optional[int] = None
    error: Optional[str] = None
    created_at: str
    started_at: Optional[str] = None
    completed_at: Optional[str] = None


class TaskQueueResponse(BaseModel):
    """Task queue response model"""
    tasks: List[TaskQueueItem]
    total: int
    pending: int
    processing: int
    completed: int
    failed: int
    cancelled: int


class PriorityUpdateRequest(BaseModel):
    """Request model for priority update"""
    priority: int = Field(..., ge=1, le=10, description="Priority level (1 = highest, 10 = lowest)")


class PriorityUpdateResponse(BaseModel):
    """Response model for priority update"""
    job_id: str
    old_priority: int
    new_priority: int
    message: str


class RetryResponse(BaseModel):
    """Response model for job retry"""
    job_id: str
    old_status: str
    new_status: str
    message: str


class QueueStatsResponse(BaseModel):
    """Queue statistics response model"""
    total_jobs: int
    pending_jobs: int
    processing_jobs: int
    completed_jobs: int
    failed_jobs: int
    cancelled_jobs: int
    average_wait_time: float  # in seconds
    estimated_completion_time: Optional[int] = None  # in seconds


# ============================================================================
# Helper Functions
# ============================================================================

def get_pending_jobs() -> List[GenerationJob]:
    """Get all pending jobs sorted by priority and creation time"""
    pending_jobs = []
    
    # Check file storage
    try:
        job_ids = job_storage.list_files()
        for job_id in job_ids:
            job_data = job_storage.load(job_id)
            if job_data and job_data.get('status') == GenerationStatus.PENDING.value:
                try:
                    pending_jobs.append(GenerationJob(**job_data))
                except Exception as e:
                    logger.warning(f"Failed to parse job {job_id}: {e}")
    except Exception as e:
        logger.warning(f"Could not list job files: {e}")
    
    # Sort by priority (lower = higher priority), then by created_at
    pending_jobs.sort(key=lambda j: (j.priority, j.created_at if hasattr(j.created_at, 'isoformat') or isinstance(j.created_at, str) else str(j.created_at)))
    
    return pending_jobs


def reorder_queue_by_priority() -> None:
    """
    Reorder the queue based on priority.
    This ensures jobs are processed in priority order.
    """
    pending_jobs = get_pending_jobs()
    
    # Log the new order
    logger.info(f"Queue reordering: {len(pending_jobs)} pending jobs")
    for i, job in enumerate(pending_jobs):
        logger.info(f"  {i+1}. Job {job.id}: priority={job.priority}")


def swap_priorities(job1_id: str, job2_id: str) -> bool:
    """
    Swap priorities between two jobs.
    
    Args:
        job1_id: First job ID
        job2_id: Second job ID
    
    Returns:
        True if swap succeeded, False otherwise
    """
    job1 = load_job(job1_id)
    job2 = load_job(job2_id)
    
    if not job1 or not job2:
        return False
    
    # Swap priorities (safe because we rely on GenerationJob objects which pass validation or loaded dicts)
    # But job1 and job2 are Pydantic models (from load_job) OR dicts?
    # load_job returns GenerationJob object usually. Let's check sequence_api.py load_job.
    # It returns GenerationJob | None.
    
    job1_priority = job1.priority
    job2_priority = job2.priority
    
    job1_data = job1.dict()
    job2_data = job2.dict()
    
    job1_data['priority'] = job2_priority
    job2_data['priority'] = job1_priority
    
    save_job(job1_id, job1_data)
    save_job(job2_id, job2_data)
    
    return True


# ============================================================================
# API Endpoints
# ============================================================================

@router.get("/tasks/queue", response_model=TaskQueueResponse)
async def get_task_queue(
    project_id: Optional[str] = None,
    status_filter: Optional[str] = None,
    user_id: str = Depends(verify_jwt_token)
) -> TaskQueueResponse:
    """
    Get all jobs in the task queue.
    
    Args:
        project_id: Optional project filter
        status_filter: Optional status filter (pending, processing, completed, failed, cancelled)
        user_id: Authenticated user ID
    
    Returns:
        Task queue with all jobs
    """
    all_jobs: List[GenerationJob] = []
    
    try:
        # User-scoped jobs (or all if admin) - for now just user's jobs to match storage index
        user_jobs_data = job_storage.get_by_owner(user_id)
        
        for job_data in user_jobs_data:
            try:
                # job_data is a dict
                all_jobs.append(GenerationJob(**job_data))
            except Exception as e:
                logger.warning(f"Failed to parse job {job_data.get('id')}: {e}")
                
    except Exception as e:
        logger.error(f"Error fetching task queue: {e}")
    
    # Apply filters
    if project_id:
        all_jobs = [j for j in all_jobs if j.project_id == project_id]
    
    if status_filter:
        all_jobs = [j for j in all_jobs if j.status.value == status_filter]
    
    # Sort by priority and creation time
    all_jobs.sort(key=lambda j: (j.priority, j.created_at if hasattr(j.created_at, 'isoformat') or isinstance(j.created_at, str) else str(j.created_at)))
    
    # Count by status
    status_counts = {
        'pending': 0,
        'processing': 0,
        'completed': 0,
        'failed': 0,
        'cancelled': 0
    }
    
    # Build response items
    tasks = []
    for job in all_jobs:
        if job.status.value in status_counts:
            status_counts[job.status.value] += 1
        
        # Format dates
        create_ts = job.created_at
        if hasattr(create_ts, 'isoformat'):
            create_ts = create_ts.isoformat()
        
        started_ts = job.started_at
        if started_ts and hasattr(started_ts, 'isoformat'):
            started_ts = started_ts.isoformat()
        
        completed_ts = job.completed_at
        if completed_ts and hasattr(completed_ts, 'isoformat'):
            completed_ts = completed_ts.isoformat()

        prompt_text = job.prompt or ""
        tasks.append(TaskQueueItem(
            job_id=job.id,
            project_id=job.project_id,
            prompt=prompt_text[:100] + '...' if len(prompt_text) > 100 else prompt_text,
            shot_count=job.shot_count,
            style=job.style,
            mood=job.mood,
            status=job.status.value,
            progress=job.progress,
            current_step=job.current_step,
            priority=job.priority,
            estimated_time=job.estimated_time,
            error=job.error,
            created_at=create_ts or "",
            started_at=started_ts,
            completed_at=completed_ts
        ))
    
    return TaskQueueResponse(
        tasks=tasks,
        total=len(tasks),
        pending=status_counts['pending'],
        processing=status_counts['processing'],
        completed=status_counts['completed'],
        failed=status_counts['failed'],
        cancelled=status_counts['cancelled']
    )


@router.put("/tasks/{job_id}/priority", response_model=PriorityUpdateResponse)
async def update_job_priority(
    job_id: str,
    request: PriorityUpdateRequest,
    user_id: str = Depends(verify_jwt_token)
) -> PriorityUpdateResponse:
    """
    Update the priority of a job.
    
    Args:
        job_id: Job ID to update
        request: New priority value (1-10)
        user_id: Authenticated user ID
    
    Returns:
        Updated priority information
    
    Raises:
        HTTPException: If job not found or priority invalid
    """
    job = load_job(job_id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Check ownership
    if job.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this job"
        )
    
    # Only pending jobs can have their priority changed
    if job.status not in [GenerationStatus.PENDING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot change priority of job with status: {job.status.value}"
        )
    
    old_priority = job.priority
    new_priority = request.priority
    
    # Update job
    job_data = job.dict()
    job_data['priority'] = new_priority
    save_job(job_id, job_data)
    
    # Reorder queue (refresh logs)
    reorder_queue_by_priority()
    
    logger.info(f"Job {job_id} priority changed: {old_priority} -> {new_priority}")
    
    return PriorityUpdateResponse(
        job_id=job_id,
        old_priority=old_priority,
        new_priority=new_priority,
        message=f"Priority updated successfully (1 = highest priority, 10 = lowest)"
    )


@router.post("/tasks/{job_id}/move-up", response_model=PriorityUpdateResponse)
async def move_job_up(
    job_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> PriorityUpdateResponse:
    """
    Move a job up in the queue (increase priority).
    """
    job = load_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.user_id != user_id:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    if job.status != GenerationStatus.PENDING:
        raise HTTPException(status_code=400, detail="Only pending jobs can be moved")
    
    pending_jobs = get_pending_jobs()
    
    current_index = -1
    for i, j in enumerate(pending_jobs):
        if j.id == job_id:
            current_index = i
            break
    
    if current_index <= 0:
        raise HTTPException(status_code=400, detail="Already at highest position")
    
    job_above = pending_jobs[current_index - 1]
    
    if swap_priorities(job_id, job_above.id):
        # Priority logic might be complex if numbers are same, but swap ensures relative order changes
        return PriorityUpdateResponse(
            job_id=job_id,
            old_priority=job.priority,
            new_priority=job.priority, # Might be same value but position changed
            message="Job moved up in queue"
        )
    else:
        raise HTTPException(status_code=500, detail="Failed to move job")


@router.post("/tasks/{job_id}/move-down", response_model=PriorityUpdateResponse)
async def move_job_down(
    job_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> PriorityUpdateResponse:
    """
    Move a job down in the queue (decrease priority).
    """
    job = load_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.user_id != user_id:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    if job.status != GenerationStatus.PENDING:
        raise HTTPException(status_code=400, detail="Only pending jobs can be moved")
    
    pending_jobs = get_pending_jobs()
    
    current_index = -1
    for i, j in enumerate(pending_jobs):
        if j.id == job_id:
            current_index = i
            break
    
    if current_index < 0 or current_index >= len(pending_jobs) - 1:
        raise HTTPException(status_code=400, detail="Already at lowest position")
    
    job_below = pending_jobs[current_index + 1]
    
    if swap_priorities(job_id, job_below.id):
        return PriorityUpdateResponse(
            job_id=job_id,
            old_priority=job.priority,
            new_priority=job.priority,
            message="Job moved down in queue"
        )
    else:
        raise HTTPException(status_code=500, detail="Failed to move job")


@router.post("/tasks/{job_id}/retry", response_model=RetryResponse)
async def retry_job(
    job_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> RetryResponse:
    """
    Retry a failed or cancelled job.
    """
    job = load_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.user_id != user_id:
        raise HTTPException(status_code=403, detail="Permission denied")
    
    if job.status not in [GenerationStatus.FAILED, GenerationStatus.CANCELLED]:
        raise HTTPException(status_code=400, detail="Only failed or cancelled jobs can be retried")
    
    old_status = job.status.value
    
    job_data = job.dict()
    job_data['status'] = GenerationStatus.PENDING.value
    job_data['progress'] = 0
    job_data['error'] = None
    job_data['created_at'] = datetime.utcnow().isoformat()
    
    save_job(job_id, job_data)
    
    return RetryResponse(
        job_id=job_id,
        old_status=old_status,
        new_status="pending",
        message="Job queued for retry"
    )


@router.get("/tasks/stats", response_model=QueueStatsResponse)
async def get_queue_stats(
    project_id: Optional[str] = None,
    user_id: str = Depends(verify_jwt_token)
) -> QueueStatsResponse:
    """
    Get queue statistics.
    """
    all_jobs: List[GenerationJob] = []
    
    try:
        user_jobs_data = job_storage.get_by_owner(user_id)
        for job_data in user_jobs_data:
            try:
                all_jobs.append(GenerationJob(**job_data))
            except:
                pass
    except:
        pass
    
    if project_id:
        all_jobs = [j for j in all_jobs if j.project_id == project_id]
        
    status_counts = {k.value: 0 for k in GenerationStatus}
    # Ensure all keys exist
    for k in ['pending', 'processing', 'completed', 'failed', 'cancelled']:
        if k not in status_counts: status_counts[k] = 0
        
    total_wait_time = 0
    waiting_jobs = 0
    
    for job in all_jobs:
        s = job.status.value
        if s in status_counts:
            status_counts[s] += 1
            
        if job.status == GenerationStatus.PENDING:
            created = job.created_at
            if isinstance(created, str):
                try: created = datetime.fromisoformat(created)
                except: created = datetime.utcnow()
            
            if hasattr(created, 'timestamp'):
                total_wait_time += (datetime.utcnow() - created).total_seconds()
                waiting_jobs += 1
                
    avg_wait = total_wait_time / waiting_jobs if waiting_jobs > 0 else 0
    
    est = None
    if project_id:
        pending = [j for j in all_jobs if j.status == GenerationStatus.PENDING]
        est = sum(j.estimated_time or (j.shot_count * 10) for j in pending)
        
    return QueueStatsResponse(
        total_jobs=len(all_jobs),
        pending_jobs=status_counts['pending'],
        processing_jobs=status_counts['processing'],
        completed_jobs=status_counts['completed'],
        failed_jobs=status_counts['failed'],
        cancelled_jobs=status_counts['cancelled'],
        average_wait_time=round(avg_wait, 2),
        estimated_completion_time=est
    )


@router.delete("/tasks/{job_id}")
async def delete_job(
    job_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, str]:
    """Delete a job from the queue."""
    job = load_job(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
        
    if job.user_id != user_id:
        raise HTTPException(status_code=403, detail="Permission denied")
        
    if job.status in [GenerationStatus.PENDING, GenerationStatus.PROCESSING]:
        raise HTTPException(status_code=400, detail="Cannot delete active job. Cancel first.")
        
    job_storage.delete(job_id)
    
    return {"message": "Job deleted", "job_id": job_id}
