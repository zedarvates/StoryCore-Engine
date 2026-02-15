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
    jobs_db,
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
    project_id: str
    prompt: str
    shot_count: int
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
    
    # Check in-memory storage first
    for job in jobs_db.values():
        if job.status == GenerationStatus.PENDING:
            pending_jobs.append(job)
    
    # Also check file storage
    try:
        job_files = job_storage.list_files()
        for job_id in job_files:
            job_data = job_storage.load(job_id)
            if job_data and job_data.get('status') == GenerationStatus.PENDING.value:
                # Check if not already in list (from in-memory)
                if not any(j.id == job_id for j in pending_jobs):
                    pending_jobs.append(GenerationJob(**job_data))
    except Exception as e:
        logger.warning(f"Could not list job files: {e}")
    
    # Sort by priority (lower = higher priority), then by created_at
    pending_jobs.sort(key=lambda j: (j.priority, j.created_at))
    
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
    
    # Swap priorities
    job1_priority = job1.priority
    job2_priority = job2.priority
    
    job1_data = job1.dict()
    job2_data = job2.dict()
    
    job1_data['priority'] = job2_priority
    job2_data['priority'] = job1_priority
    
    save_job(job1_id, job1_data)
    save_job(job2_id, job2_data)
    
    # Update in-memory storage
    if job1_id in jobs_db:
        jobs_db[job1_id].priority = job2_priority
    if job2_id in jobs_db:
        jobs_db[job2_id].priority = job1_priority
    
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
    
    # Collect jobs from both in-memory and file storage
    for job in jobs_db.values():
        all_jobs.append(job)
    
    try:
        job_files = job_storage.list_files()
        for job_id in job_files:
            job_data = job_storage.load(job_id)
            if job_data and job_data.get('user_id') == user_id:
                # Check if not already in list
                if not any(j.id == job_id for j in all_jobs):
                    all_jobs.append(GenerationJob(**job_data))
    except Exception as e:
        logger.warning(f"Could not list job files: {e}")
    
    # Apply filters
    if project_id:
        all_jobs = [j for j in all_jobs if j.project_id == project_id]
    
    if status_filter:
        all_jobs = [j for j in all_jobs if j.status.value == status_filter]
    
    # Sort by priority and creation time (for same priority)
    all_jobs.sort(key=lambda j: (j.priority, j.created_at))
    
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
        status_counts[job.status.value] += 1
        
        # Handle both datetime and string for created_at
        created_at = job.created_at
        if hasattr(created_at, 'isoformat'):
            created_at = created_at.isoformat()
        
        started_at = job.started_at
        if started_at and hasattr(started_at, 'isoformat'):
            started_at = started_at.isoformat()
        
        completed_at = job.completed_at
        if completed_at and hasattr(completed_at, 'isoformat'):
            completed_at = completed_at.isoformat()
        
        tasks.append(TaskQueueItem(
            job_id=job.id,
            project_id=job.project_id,
            prompt=job.prompt[:100] + '...' if len(job.prompt) > 100 else job.prompt,
            shot_count=job.shot_count,
            style=job.style,
            mood=job.mood,
            status=job.status.value,
            progress=job.progress,
            current_step=job.current_step,
            priority=job.priority,
            estimated_time=job.estimated_time,
            error=job.error,
            created_at=created_at,
            started_at=started_at,
            completed_at=completed_at
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
    
    # Update in-memory storage
    if job_id in jobs_db:
        jobs_db[job_id].priority = new_priority
    
    # Reorder queue
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
    
    Args:
        job_id: Job ID to move
        user_id: Authenticated user ID
    
    Returns:
        Updated priority information
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
    
    # Only pending jobs can be moved
    if job.status != GenerationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot move job with status: {job.status.value}"
        )
    
    # Get all pending jobs sorted by priority
    pending_jobs = get_pending_jobs()
    
    # Find current job position
    current_index = -1
    for i, j in enumerate(pending_jobs):
        if j.id == job_id:
            current_index = i
            break
    
    if current_index <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job is already at the highest position"
        )
    
    # Swap with job above
    job_above = pending_jobs[current_index - 1]
    
    if swap_priorities(job_id, job_above.id):
        new_priority = job.priority - 1 if job.priority > 1 else 1
        
        return PriorityUpdateResponse(
            job_id=job_id,
            old_priority=job.priority,
            new_priority=new_priority,
            message="Job moved up in queue"
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to move job"
        )


@router.post("/tasks/{job_id}/move-down", response_model=PriorityUpdateResponse)
async def move_job_down(
    job_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> PriorityUpdateResponse:
    """
    Move a job down in the queue (decrease priority).
    
    Args:
        job_id: Job ID to move
        user_id: Authenticated user ID
    
    Returns:
        Updated priority information
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
    
    # Only pending jobs can be moved
    if job.status != GenerationStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot move job with status: {job.status.value}"
        )
    
    # Get all pending jobs sorted by priority
    pending_jobs = get_pending_jobs()
    
    # Find current job position
    current_index = -1
    for i, j in enumerate(pending_jobs):
        if j.id == job_id:
            current_index = i
            break
    
    if current_index < 0 or current_index >= len(pending_jobs) - 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Job is already at the lowest position"
        )
    
    # Swap with job below
    job_below = pending_jobs[current_index + 1]
    
    if swap_priorities(job_id, job_below.id):
        new_priority = job.priority + 1 if job.priority < 10 else 10
        
        return PriorityUpdateResponse(
            job_id=job_id,
            old_priority=job.priority,
            new_priority=new_priority,
            message="Job moved down in queue"
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to move job"
        )


@router.post("/tasks/{job_id}/retry", response_model=RetryResponse)
async def retry_job(
    job_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> RetryResponse:
    """
    Retry a failed or cancelled job.
    
    Args:
        job_id: Job ID to retry
        user_id: Authenticated user ID
    
    Returns:
        Retry result information
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
    
    # Only failed or cancelled jobs can be retried
    if job.status not in [GenerationStatus.FAILED, GenerationStatus.CANCELLED]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot retry job with status: {job.status.value}. Only failed or cancelled jobs can be retried."
        )
    
    old_status = job.status.value
    
    # Reset job status to pending
    job_data = job.dict()
    job_data['status'] = GenerationStatus.PENDING.value
    job_data['progress'] = 0
    job_data['current_step'] = None
    job_data['error'] = None
    job_data['started_at'] = None
    job_data['completed_at'] = None
    job_data['created_at'] = datetime.utcnow().isoformat()
    job_data['estimated_time'] = job_data.get('shot_count', 5) * 10
    
    save_job(job_id, job_data)
    
    # Update in-memory storage
    if job_id in jobs_db:
        jobs_db[job_id].status = GenerationStatus.PENDING
        jobs_db[job_id].progress = 0
        jobs_db[job_id].current_step = None
    
    logger.info(f"Job {job_id} queued for retry (status: {old_status} -> pending)")
    
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
    
    Args:
        project_id: Optional project filter
        user_id: Authenticated user ID
    
    Returns:
        Queue statistics
    """
    all_jobs: List[GenerationJob] = []
    
    # Collect jobs
    for job in jobs_db.values():
        all_jobs.append(job)
    
    try:
        job_files = job_storage.list_files()
        for job_id in job_files:
            job_data = job_storage.load(job_id)
            if job_data and job_data.get('user_id') == user_id:
                if not any(j.id == job_id for j in all_jobs):
                    all_jobs.append(GenerationJob(**job_data))
    except Exception as e:
        logger.warning(f"Could not list job files: {e}")
    
    # Apply project filter
    if project_id:
        all_jobs = [j for j in all_jobs if j.project_id == project_id]
    
    # Count by status
    status_counts = {
        'pending': 0,
        'processing': 0,
        'completed': 0,
        'failed': 0,
        'cancelled': 0
    }
    
    total_wait_time = 0
    waiting_jobs = 0
    
    for job in all_jobs:
        status_counts[job.status.value] += 1
        
        # Calculate wait time for pending jobs
        if job.status == GenerationStatus.PENDING:
            if hasattr(job.created_at, 'timestamp'):
                wait_time = (datetime.utcnow() - job.created_at).total_seconds()
            else:
                # If created_at is a string, estimate
                wait_time = 0
            total_wait_time += wait_time
            waiting_jobs += 1
    
    # Calculate average wait time
    avg_wait_time = total_wait_time / waiting_jobs if waiting_jobs > 0 else 0
    
    # Calculate estimated completion time (sum of estimated times for pending jobs)
    estimated_completion = None
    if project_id:
        pending_jobs = [j for j in all_jobs if j.status == GenerationStatus.PENDING]
        estimated_completion = sum(j.estimated_time or (j.shot_count * 10) for j in pending_jobs)
    
    return QueueStatsResponse(
        total_jobs=len(all_jobs),
        pending_jobs=status_counts['pending'],
        processing_jobs=status_counts['processing'],
        completed_jobs=status_counts['completed'],
        failed_jobs=status_counts['failed'],
        cancelled_jobs=status_counts['cancelled'],
        average_wait_time=round(avg_wait_time, 2),
        estimated_completion_time=estimated_completion
    )


@router.delete("/tasks/{job_id}")
async def delete_job(
    job_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, str]:
    """
    Delete a job from the queue.
    
    Args:
        job_id: Job ID to delete
        user_id: Authenticated user ID
    
    Returns:
        Deletion result
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
            detail="You don't have permission to delete this job"
        )
    
    # Only completed, failed, or cancelled jobs can be deleted
    if job.status in [GenerationStatus.PENDING, GenerationStatus.PROCESSING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete job with status: {job.status.value}. Cancel it first."
        )
    
    # Remove from in-memory storage
    if job_id in jobs_db:
        del jobs_db[job_id]
    
    # Note: We don't delete the file from storage to maintain history
    
    logger.info(f"Job {job_id} deleted from queue")
    
    return {
        "message": "Job deleted successfully",
        "job_id": job_id
    }

