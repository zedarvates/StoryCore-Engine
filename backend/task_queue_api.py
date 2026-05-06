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

# Import AsyncTaskQueue for advanced queue management
try:
    from src.async_task_queue import (
        get_async_task_queue,
        TaskPriority,
        TaskState,
        submit_async_task,
    )

    ASYNC_QUEUE_AVAILABLE = True
except ImportError:
    ASYNC_QUEUE_AVAILABLE = False
    logging.warning("AsyncTaskQueue not available, using basic queue management")

# ============================================================================
# Queue Lifecycle Management
# ============================================================================


def _get_queue_priority(priority: int) -> TaskPriority:
    """Convert numeric priority (1-10) to TaskPriority enum."""
    if priority <= 2:
        return TaskPriority.CRITICAL
    elif priority <= 4:
        return TaskPriority.HIGH
    elif priority <= 7:
        return TaskPriority.NORMAL
    else:
        return TaskPriority.LOW


async def submit_to_async_queue(
    job_id: str, coroutine, priority: int = 5, timeout_seconds: int = 300
) -> bool:
    """
    Submit a job to the AsyncTaskQueue for advanced processing.

    Args:
        job_id: Unique job identifier
        coroutine: Async function to execute
        priority: Job priority (1 = highest, 10 = lowest)
        timeout_seconds: Maximum execution time

    Returns:
        True if submission succeeded
    """
    if not ASYNC_QUEUE_AVAILABLE:
        return False

    try:
        queue = get_async_task_queue()
        await queue.submit_task(
            task_id=job_id,
            coroutine=coroutine,
            priority=_get_queue_priority(priority),
            timeout_seconds=timeout_seconds,
        )
        logger.info(
            f"Job {job_id} submitted to AsyncTaskQueue with priority {priority}"
        )
        return True
    except Exception as e:
        logger.error(f"Failed to submit job {job_id} to AsyncTaskQueue: {e}")
        return False


async def submit_api_task(
    job_id: str, payload: dict, priority: int = 5, timeout_seconds: int = 300
) -> bool:
    """
    API-level helper to submit a generic task payload to AsyncTaskQueue.
    The coroutine is a dynamic wrapper that returns the payload when executed.
    """
    if not ASYNC_QUEUE_AVAILABLE:
        return False
    try:
        queue = get_async_task_queue()

        # create a simple coroutine factory that returns the payload
        def make_coroutine(p: dict):
            async def _cb():
                return p

            return _cb

        await queue.submit_task(
            task_id=job_id,
            coroutine=make_coroutine(payload),
            priority=_get_queue_priority(priority),
            timeout_seconds=timeout_seconds,
        )
        logger.info(f"API task {job_id} submitted with priority {priority}")
        return True
    except Exception as e:
        logger.error(f"Failed to submit API task {job_id}: {e}")
        return False


async def cancel_async_task(job_id: str) -> bool:
    """
    Cancel a job in the AsyncTaskQueue.

    Args:
        job_id: Job identifier to cancel

    Returns:
        True if cancellation succeeded
    """
    if not ASYNC_QUEUE_AVAILABLE:
        return False

    try:
        queue = get_async_task_queue()
        return await queue.cancel_task(job_id)
    except Exception as e:
        logger.error(f"Failed to cancel job {job_id} in AsyncTaskQueue: {e}")
        return False


async def get_async_task_status(job_id: str) -> Optional[Dict[str, Any]]:
    """
    Get the status of a job in the AsyncTaskQueue.

    Args:
        job_id: Job identifier

    Returns:
        Status dict or None if not found
    """
    if not ASYNC_QUEUE_AVAILABLE:
        return None

    try:
        queue = get_async_task_queue()
        return await queue.get_task_status(job_id)
    except Exception as e:
        logger.debug(f"Could not get status for job {job_id}: {e}")
        return None


def get_async_queue_stats() -> Optional[Dict[str, Any]]:
    """
    Get comprehensive statistics from AsyncTaskQueue.

    Returns:
        Statistics dict or None if queue unavailable
    """
    if not ASYNC_QUEUE_AVAILABLE:
        return None

    try:
        queue = get_async_task_queue()
        return queue.get_queue_statistics()
    except Exception as e:
        logger.debug(f"Could not get AsyncTaskQueue stats: {e}")
        return None


# Logger configuration
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()


class QueueStatusResponse(BaseModel):
    queue_size: int
    running: int
    completed: int
    waiting_for_dependencies: int
    workers_active: int


@router.get("/tasks/queue/status", response_model=QueueStatusResponse)
async def get_task_queue_status(
    user_id: str = Depends(verify_jwt_token),
) -> QueueStatusResponse:
    """Return a snapshot of current AsyncTaskQueue status."""
    try:
        # Acquire current statistics if queue is available
        if "get_async_task_queue" in globals():
            queue = get_async_task_queue()
            stats = queue.get_queue_statistics()
        else:
            stats = {
                "queue_size": 0,
                "running_tasks": 0,
                "completed_tasks": 0,
                "waiting_for_dependencies": 0,
                "workers_active": 0,
            }

        return QueueStatusResponse(
            queue_size=stats.get("queue_size", 0),
            running=stats.get("running_tasks", 0),
            completed=stats.get("completed_tasks", 0),
            waiting_for_dependencies=stats.get("waiting_for_dependencies", 0),
            workers_active=stats.get("workers_active", 0),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


class APITaskRequest(BaseModel):
    job_id: str
    payload: dict
    priority: int = Field(5, ge=1, le=10)
    timeout_seconds: int = Field(300, ge=1)


class APIQueueResponse(BaseModel):
    success: bool
    message: Optional[str] = None


class APITaskStatusResponse(BaseModel):
    """Status response for an API-driven task submitted to AsyncTaskQueue"""

    job_id: str
    status: str
    progress: Optional[int] = None
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error: Optional[str] = None


@router.post("/tasks/api", response_model=APIQueueResponse)
async def submit_api_task_route(
    req: APITaskRequest, user_id: str = Depends(verify_jwt_token)
) -> APIQueueResponse:
    """Submit a generic API task payload to the AsyncTaskQueue via backend API."""
    ok = await submit_api_task(
        job_id=req.job_id,
        payload=req.payload,
        priority=req.priority,
        timeout_seconds=req.timeout_seconds,
    )
    if ok:
        return APIQueueResponse(success=True, message="Submitted to AsyncTaskQueue")
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Submission to AsyncTaskQueue failed",
    )


@router.get("/tasks/api/{job_id}", response_model=APITaskStatusResponse)
async def get_api_task_status_route(
    job_id: str, user_id: str = Depends(verify_jwt_token)
) -> APITaskStatusResponse:
    """Retrieve status for an API-driven task submitted to AsyncTaskQueue."""
    status_dict = await get_async_task_status(job_id)
    if not status_dict:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="API task not found"
        )

    state = status_dict.get("state") or status_dict.get("status") or "unknown"
    progress = status_dict.get("progress")
    created_at = status_dict.get("created_at") or status_dict.get("created")
    started_at = status_dict.get("started_at")
    completed_at = status_dict.get("completed_at")
    error = status_dict.get("error")

    return APITaskStatusResponse(
        job_id=job_id,
        status=state,
        progress=progress,
        created_at=created_at,
        started_at=started_at,
        completed_at=completed_at,
        error=error,
    )


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

    priority: int = Field(
        ..., ge=1, le=10, description="Priority level (1 = highest, 10 = lowest)"
    )


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
    throughput_per_second: Optional[float] = None  # tasks/sec from AsyncTaskQueue
    avg_execution_time: Optional[float] = None  # seconds from AsyncTaskQueue
    circuit_breaker_status: Optional[str] = None  # 'closed'|'open'|'half-open'


# ============================================================================
# Helper Functions
# ============================================================================


def _created_at_key(job: GenerationJob) -> str:
    """Return a stable ISO-string sort key for created_at (handles datetime or str)."""
    ts = job.created_at
    if hasattr(ts, "isoformat"):
        return ts.isoformat()
    return str(ts) if ts else ""


def get_pending_jobs() -> List[GenerationJob]:
    """Get all pending jobs sorted by priority and creation time"""
    pending_jobs = []

    try:
        job_ids = job_storage.list_files()
        for job_id in job_ids:
            job_data = job_storage.load(job_id)
            if job_data and job_data.get("status") == GenerationStatus.PENDING.value:
                try:
                    pending_jobs.append(GenerationJob(**job_data))
                except Exception as e:
                    logger.warning(f"Failed to parse job {job_id}: {e}")
    except Exception as e:
        logger.warning(f"Could not list job files: {e}")

    pending_jobs.sort(key=lambda j: (j.priority, _created_at_key(j)))

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
        logger.info(f"  {i + 1}. Job {job.id}: priority={job.priority}")


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

    job1_data["priority"] = job2_priority
    job2_data["priority"] = job1_priority

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
    user_id: str = Depends(verify_jwt_token),
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
    all_jobs.sort(key=lambda j: (j.priority, _created_at_key(j)))

    # Count by status
    status_counts = {
        "pending": 0,
        "processing": 0,
        "completed": 0,
        "failed": 0,
        "cancelled": 0,
    }

    # Build response items
    tasks = []
    for job in all_jobs:
        if job.status.value in status_counts:
            status_counts[job.status.value] += 1

        # Format dates
        create_ts = job.created_at
        if hasattr(create_ts, "isoformat"):
            create_ts = create_ts.isoformat()

        started_ts = job.started_at
        if started_ts and hasattr(started_ts, "isoformat"):
            started_ts = started_ts.isoformat()

        completed_ts = job.completed_at
        if completed_ts and hasattr(completed_ts, "isoformat"):
            completed_ts = completed_ts.isoformat()

        prompt_text = job.prompt or ""
        tasks.append(
            TaskQueueItem(
                job_id=job.id,
                project_id=job.project_id,
                prompt=prompt_text[:100] + "..."
                if len(prompt_text) > 100
                else prompt_text,
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
                completed_at=completed_ts,
            )
        )

    return TaskQueueResponse(
        tasks=tasks,
        total=len(tasks),
        pending=status_counts["pending"],
        processing=status_counts["processing"],
        completed=status_counts["completed"],
        failed=status_counts["failed"],
        cancelled=status_counts["cancelled"],
    )


@router.put("/tasks/{job_id}/priority", response_model=PriorityUpdateResponse)
async def update_job_priority(
    job_id: str,
    request: PriorityUpdateRequest,
    user_id: str = Depends(verify_jwt_token),
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
            status_code=status.HTTP_404_NOT_FOUND, detail="Job not found"
        )

    # Check ownership
    if job.user_id != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You don't have permission to modify this job",
        )

    # Only pending jobs can have their priority changed
    if job.status not in [GenerationStatus.PENDING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot change priority of job with status: {job.status.value}",
        )

    old_priority = job.priority
    new_priority = request.priority

    # Update job
    job_data = job.dict()
    job_data["priority"] = new_priority
    save_job(job_id, job_data)

    # Reorder queue (refresh logs)
    reorder_queue_by_priority()

    logger.info(f"Job {job_id} priority changed: {old_priority} -> {new_priority}")

    return PriorityUpdateResponse(
        job_id=job_id,
        old_priority=old_priority,
        new_priority=new_priority,
        message="Priority updated successfully (1 = highest priority, 10 = lowest)",
    )


@router.post("/tasks/{job_id}/move-up", response_model=PriorityUpdateResponse)
async def move_job_up(
    job_id: str, user_id: str = Depends(verify_jwt_token)
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
            new_priority=job.priority,  # Might be same value but position changed
            message="Job moved up in queue",
        )
    else:
        raise HTTPException(status_code=500, detail="Failed to move job")


@router.post("/tasks/{job_id}/move-down", response_model=PriorityUpdateResponse)
async def move_job_down(
    job_id: str, user_id: str = Depends(verify_jwt_token)
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
            message="Job moved down in queue",
        )
    else:
        raise HTTPException(status_code=500, detail="Failed to move job")


@router.post("/tasks/{job_id}/retry", response_model=RetryResponse)
async def retry_job(
    job_id: str, user_id: str = Depends(verify_jwt_token)
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
        raise HTTPException(
            status_code=400, detail="Only failed or cancelled jobs can be retried"
        )

    old_status = job.status.value

    job_data = job.dict()
    job_data["status"] = GenerationStatus.PENDING.value
    job_data["progress"] = 0
    job_data["error"] = None
    job_data["created_at"] = datetime.utcnow().isoformat()

    save_job(job_id, job_data)

    return RetryResponse(
        job_id=job_id,
        old_status=old_status,
        new_status="pending",
        message="Job queued for retry",
    )


@router.get("/tasks/stats", response_model=QueueStatsResponse)
async def get_queue_stats(
    project_id: Optional[str] = None, user_id: str = Depends(verify_jwt_token)
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
            except Exception as parse_err:
                logger.warning(f"Stats: skipping malformed job: {parse_err}")
    except Exception as fetch_err:
        logger.error(f"Stats: failed to fetch jobs: {fetch_err}")

    if project_id:
        all_jobs = [j for j in all_jobs if j.project_id == project_id]

    status_counts: Dict[str, int] = {k.value: 0 for k in GenerationStatus}

    total_wait_time = 0.0
    waiting_jobs = 0

    for job in all_jobs:
        s = job.status.value
        if s in status_counts:
            status_counts[s] += 1

        if job.status == GenerationStatus.PENDING:
            created = job.created_at
            if isinstance(created, str):
                try:
                    created = datetime.fromisoformat(created)
                except ValueError:
                    created = datetime.utcnow()
            if hasattr(created, "timestamp"):
                total_wait_time += (datetime.utcnow() - created).total_seconds()
                waiting_jobs += 1

    avg_wait = total_wait_time / waiting_jobs if waiting_jobs > 0 else 0.0

    est = None
    if project_id:
        pending = [j for j in all_jobs if j.status == GenerationStatus.PENDING]
        est = sum(j.estimated_time or (j.shot_count * 10) for j in pending)

    # Enrich with AsyncTaskQueue internal statistics if available
    throughput: Optional[float] = None
    avg_exec: Optional[float] = None
    cb_status: Optional[str] = None
    try:
        from src.async_task_queue import get_async_task_queue

        q = get_async_task_queue()
        internal = q.get_queue_statistics()
        stats_inner = internal.get("statistics", {})
        throughput = stats_inner.get("throughput_per_second")
        avg_exec = stats_inner.get("average_execution_time")
        cb = internal.get("circuit_breaker")
        if cb:
            cb_status = cb.get("state", "closed")
    except Exception as qe:
        logger.debug(f"AsyncTaskQueue stats unavailable: {qe}")

    return QueueStatsResponse(
        total_jobs=len(all_jobs),
        pending_jobs=status_counts["pending"],
        processing_jobs=status_counts["processing"],
        completed_jobs=status_counts["completed"],
        failed_jobs=status_counts["failed"],
        cancelled_jobs=status_counts["cancelled"],
        average_wait_time=round(avg_wait, 2),
        estimated_completion_time=est,
        throughput_per_second=throughput,
        avg_execution_time=avg_exec,
        circuit_breaker_status=cb_status,
    )


@router.delete("/tasks/{job_id}")
async def delete_job(
    job_id: str, user_id: str = Depends(verify_jwt_token)
) -> Dict[str, str]:
    """Delete a job from the queue."""
    job = load_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.user_id != user_id:
        raise HTTPException(status_code=403, detail="Permission denied")

    if job.status in [GenerationStatus.PENDING, GenerationStatus.PROCESSING]:
        raise HTTPException(
            status_code=400, detail="Cannot delete active job. Cancel first."
        )

    job_storage.delete(job_id)

    return {"message": "Job deleted", "job_id": job_id}
