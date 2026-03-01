"""
StoryCore-Engine Sequence Generation API

This module provides REST API endpoints for AI-powered sequence generation.
Supports async job queue for long-running operations with progress tracking.

Endpoints:
- POST /api/sequences/generate - Generate sequence from prompts
- GET /api/sequences/:id/status - Get generation status
- POST /api/sequences/:id/cancel - Cancel generation
- GET /api/sequences/:id/result - Get generated sequence

Requirements: Q1 2026 - Sequence Generation API
"""

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from enum import Enum
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, HTTPException, status, Depends, BackgroundTasks, Header
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings
from sse_starlette.sse import EventSourceResponse

from backend.auth import verify_jwt_token
from backend.storage import JSONFileStorage

# Import AsyncTaskQueue for advanced job processing
try:
    import sys
    import os
    # Add src to path for async_task_queue
    src_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src')
    if src_path not in sys.path:
        sys.path.insert(0, src_path)
    
    from async_task_queue import (
        get_async_task_queue,
        TaskPriority,
        TaskState
    )
    ASYNC_QUEUE_AVAILABLE = True
except ImportError:
    ASYNC_QUEUE_AVAILABLE = False
    logging.warning("AsyncTaskQueue not available, using basic queue management")

# Import LLM Client for sequence generation
try:
    from src.character_wizard.llm_client import (
        LLMManager,
        LLMProvider,
        GenerationConfig,
        get_llm_client
    )
    LLM_AVAILABLE = True
except ImportError:
    LLM_AVAILABLE = False
    logging.warning("LLM client not available, using mock generation")


# ============================================================================
# AsyncTaskQueue Integration
# ============================================================================

def _convert_priority_to_task_priority(priority: int) -> TaskPriority:
    """Convert numeric priority (1-10) to TaskPriority enum."""
    if priority <= 2:
        return TaskPriority.CRITICAL
    elif priority <= 4:
        return TaskPriority.HIGH
    elif priority <= 7:
        return TaskPriority.NORMAL
    else:
        return TaskPriority.LOW


async def submit_job_to_async_queue(
    job_id: str,
    coroutine,
    priority: int = 10,
    timeout_seconds: int = 300
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
            priority=_convert_priority_to_task_priority(priority),
            timeout_seconds=timeout_seconds
        )
        logger.info(f"Job {job_id} submitted to AsyncTaskQueue with priority {priority}")
        return True
    except Exception as e:
        logger.error(f"Failed to submit job {job_id} to AsyncTaskQueue: {e}")
        return False


async def cancel_job_in_async_queue(job_id: str) -> bool:
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()


class Settings(BaseSettings):
    """Application settings for sequence generation"""
    max_sequence_length: int = Field(default=100)
    default_shot_duration: float = Field(default=5.0)
    generation_timeout_seconds: int = Field(default=300)
    queue_worker_count: int = Field(default=4)
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra environment variables


try:
    settings = Settings()
except Exception:
    settings = Settings()


class GenerationStatus(str, Enum):
    """Generation job status"""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class SequenceGenerationRequest(BaseModel):
    """Request model for sequence generation"""
    project_id: str = Field(..., min_length=1)
    prompt: str = Field(..., min_length=10)
    shot_count: int = Field(default=5, ge=1, le=50)
    style: Optional[str] = None
    mood: Optional[str] = None
    characters: List[str] = []
    settings: Dict[str, Any] = {}


class GenerationJob(BaseModel):
    """Generation job model"""
    id: str
    project_id: str
    prompt: str
    shot_count: int
    style: Optional[str]
    mood: Optional[str]
    characters: List[str]
    status: GenerationStatus
    progress: int = 0
    current_step: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    user_id: str
    priority: int = 10  # Lower number = higher priority (1 = highest, 10 = lowest)
    estimated_time: Optional[int] = None  # Estimated time remaining in seconds


class GenerationJobResponse(BaseModel):
    """Response model for generation job"""
    job_id: str
    status: GenerationStatus
    progress: int
    current_step: Optional[str]
    estimated_time_remaining: Optional[int]
    result: Optional[Dict[str, Any]]
    error: Optional[str]


class SequenceResponse(BaseModel):
    """Response model for generated sequence"""
    id: str
    project_id: str
    name: str
    description: Optional[str]
    shots: List[Dict[str, Any]]
    total_duration: float
    prompt: str
    style: Optional[str]
    mood: Optional[str]
    created_at: datetime


# Initialize shared storage with LRU cache (max 500 job entries)
# Index by user_id for efficient user-based queries
job_storage = JSONFileStorage("./data/jobs", max_cache_size=500, index_field="user_id")


def save_job(job_id: str, job_data: Dict[str, Any]) -> bool:
    """
    Save job data to storage.
    
    Args:
        job_id: Job identifier
        job_data: Job data dictionary
    
    Returns:
        True if save succeeded, False otherwise
    """
    return job_storage.save(job_id, job_data)


def load_job(job_id: str) -> Optional[GenerationJob]:
    """
    Load job from storage.
    
    Args:
        job_id: Job identifier
    
    Returns:
        GenerationJob if found, None otherwise
    """
    job_data = job_storage.load(job_id)
    if job_data:
        return GenerationJob(**job_data)
    return None



# In-memory job results cache (optional, but storage handles caching)
job_results: Dict[str, Dict[str, Any]] = {}
active_connections: Dict[str, List[Any]] = {}

# Thread pool for background generation
executor = ThreadPoolExecutor(max_workers=settings.queue_worker_count)


async def run_generation(job_id: str, job: GenerationJob):
    """
    Background task to run sequence generation.
    
    This simulates the AI generation process with progress updates.
    In production, this would integrate with ComfyUI or similar.
    """
    logger.info(f"Starting generation job {job_id}")
    
    try:
        # Update job status
        job_data = job.dict()
        job_data['status'] = GenerationStatus.PROCESSING.value
        job_data['started_at'] = datetime.utcnow().isoformat()
        job_storage.save(job_id, job_data)
        
        # Notify listeners
        await notify_job_update(job_id, {
            "status": GenerationStatus.PROCESSING.value,
            "progress": 0,
            "current_step": "Initializing generation"
        })
        
        # Simulate generation steps
        steps = [
            ("Analyzing prompt", 10),
            ("Generating story structure", 25),
            ("Creating shot breakdown", 40),
            ("Writing shot descriptions", 60),
            ("Refining prompts", 80),
            ("Finalizing sequence", 95)
        ]
        
        # Load job once at the beginning to check for cancellation
        job_data = job_storage.load(job_id)
        if not job_data:
            return
        # job_data is dict here
        
        # Check if job was cancelled before starting
        if job_data.get('status') == GenerationStatus.CANCELLED.value:
            logger.info(f"Job {job_id} was cancelled")
            return
        
        for step_name, progress in steps:
            # Check for cancellation refreshes data from storage
            current_job_data = job_storage.load(job_id)
            if not current_job_data or current_job_data.get('status') == GenerationStatus.CANCELLED.value:
                logger.info(f"Job {job_id} was cancelled or deleted")
                return
            
            # Update progress
            current_job_data['progress'] = progress
            current_job_data['current_step'] = step_name
            job_storage.save(job_id, current_job_data)
            
            # Notify listeners
            await notify_job_update(job_id, {
                "status": GenerationStatus.PROCESSING.value,
                "progress": progress,
                "current_step": step_name
            })
            
            # Simulate processing time
            await asyncio.sleep(1)
        
        # Generate the sequence
        # Refetch fresh data
        job_data = job_storage.load(job_id)
        sequence = await generate_sequence(job_data)
        
        # Complete the job
        job_data['status'] = GenerationStatus.COMPLETED.value
        job_data['progress'] = 100
        job_data['current_step'] = "Generation complete"
        job_data['completed_at'] = datetime.utcnow().isoformat()
        job_data['result'] = sequence
        job_storage.save(job_id, job_data)
        
        # Store result in memory cache as well if needed, but storage is primary
        job_results[job_id] = sequence
        
        # Notify completion
        await notify_job_update(job_id, {
            "status": GenerationStatus.COMPLETED.value,
            "progress": 100,
            "current_step": "Generation complete",
            "result": sequence
        })
        
        logger.info(f"Generation job {job_id} completed successfully")
        
    except Exception as e:
        logger.error(f"Generation job {job_id} failed: {e}")
        
        try:
            job_data = job_storage.load(job_id) or {}
            job_data['status'] = GenerationStatus.FAILED.value
            job_data['error'] = str(e)
            job_data['completed_at'] = datetime.utcnow().isoformat()
            job_storage.save(job_id, job_data)
            
            await notify_job_update(job_id, {
                "status": GenerationStatus.FAILED.value,
                "error": str(e)
            })
        except Exception as storage_e:
             logger.error(f"Failed to update job status after error: {storage_e}")


async def generate_sequence(job_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Generate a sequence based on the job data.
    
    Uses LLM for intelligent shot generation when available.
    """
    prompt = job_data.get('prompt', '')
    shot_count = job_data.get('shot_count', 5)
    style = job_data.get('style', 'cinematic')
    mood = job_data.get('mood', 'neutral')
    
    # Try to use LLM for intelligent generation
    if LLM_AVAILABLE:
        try:
            # Build a detailed prompt for shot generation
            shot_prompt = f"""Generate a detailed shot breakdown for this story prompt:
            
Original Prompt: {prompt}
Style: {style}
Mood: {mood}
Number of shots: {shot_count}

For each shot, provide:
1. A descriptive name
2. A detailed visual prompt for image generation
3. Shot type (wide, medium, close-up, etc.)
4. Duration in seconds
5. Camera movement description

Format as a JSON array with keys: name, prompt, shot_type, duration, camera_movement"""

            # Get LLM client and generate
            llm = await get_llm_client(LLMProvider.OLLAMA, "llama3.2")
            await llm.connect()
            
            result = await llm.generate(
                prompt=shot_prompt,
                system_prompt="You are a cinematic expert. Generate detailed shot breakdowns in JSON format."
            )
            
            # Try to parse the JSON response
            try:
                import re
                # Extract JSON from response
                json_match = re.search(r'\[.*\]', result.text, re.DOTALL)
                if json_match:
                    shots_data = json.loads(json_match.group())
                    # Convert LLM response to our format
                    shots = []
                    for i, shot in enumerate(shots_data[:shot_count]):
                        shots.append({
                            "id": str(uuid.uuid4()),
                            "order_index": i,
                            "name": shot.get("name", f"Shot {i+1}"),
                            "prompt": shot.get("prompt", f"{prompt} - Shot {i+1}"),
                            "duration_seconds": shot.get("duration", settings.default_shot_duration),
                            "shot_type": shot.get("shot_type", "action"),
                            "camera_movement": shot.get("camera_movement", "static")
                        })
                    
                    # Build sequence with LLM-generated shots
                    sequence = {
                        "id": str(uuid.uuid4()),
                        "project_id": job_data.get('project_id'),
                        "name": f"Generated Sequence from {prompt[:50]}...",
                        "description": f"A sequence of {len(shots)} shots generated by AI",
                        "shots": shots,
                        "total_duration": sum(s["duration_seconds"] for s in shots),
                        "prompt": prompt,
                        "style": style,
                        "mood": mood,
                        "created_at": datetime.utcnow().isoformat(),
                        "generation_method": "llm"
                    }
                    return sequence
            except (json.JSONDecodeError, AttributeError) as e:
                logger.warning(f"Failed to parse LLM JSON response: {e}, using fallback")
        except Exception as e:
            logger.warning(f"LLM generation failed: {e}, using fallback")
    
    # Fallback: Generate basic shots (original behavior)
    shots = []
    for i in range(shot_count):
        shot = {
            "id": str(uuid.uuid4()),
            "order_index": i,
            "name": f"Shot {i + 1}",
            "prompt": f"{prompt} - Shot {i + 1}",
            "duration_seconds": settings.default_shot_duration,
            "shot_type": "action"
        }
        shots.append(shot)
    
    # Build sequence
    sequence = {
        "id": str(uuid.uuid4()),
        "project_id": job_data.get('project_id'),
        "name": f"Generated Sequence from {prompt[:50]}...",
        "description": f"A sequence of {shot_count} shots generated from the prompt",
        "shots": shots,
        "total_duration": shot_count * settings.default_shot_duration,
        "prompt": prompt,
        "style": style,
        "mood": mood,
        "created_at": datetime.utcnow().isoformat(),
        "generation_method": "fallback"
    }
    
    return sequence


async def notify_job_update(job_id: str, data: Dict[str, Any]):
    """Notify all connected clients about job updates"""
    if job_id in active_connections:
        for connection in active_connections[job_id]:
            try:
                await connection.send_json(data)
            except Exception as e:
                logger.error(f"Failed to notify connection: {e}")


@router.post("/sequences/generate", response_model=GenerationJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_sequence_endpoint(
    request: SequenceGenerationRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(verify_jwt_token)
) -> GenerationJobResponse:
    """
    Start asynchronous sequence generation.
    
    This endpoint initiates a sequence generation job and returns immediately
    with a job ID for tracking progress.
    
    Args:
        request: Sequence generation parameters
        background_tasks: FastAPI background tasks
        user_id: Authenticated user ID
    
    Returns:
        Generation job response with job ID and initial status
    
    Raises:
        HTTPException: If validation fails or job creation error
    """
    logger.info(f"Starting sequence generation for project {request.project_id}")
    
    # Create job
    job_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    # Estimate time based on shot count (10 seconds per shot)
    estimated_time = request.shot_count * 10
    
    job_dict = {
        "id": job_id,
        "project_id": request.project_id,
        "prompt": request.prompt,
        "shot_count": request.shot_count,
        "style": request.style,
        "mood": request.mood,
        "characters": request.characters,
        "status": GenerationStatus.PENDING.value,
        "progress": 0,
        "current_step": None,
        "result": None,
        "error": None,
        "created_at": now.isoformat(),
        "started_at": None,
        "completed_at": None,
        "user_id": user_id,
        "priority": 10,  # Default priority (10 = lowest, 1 = highest)
        "estimated_time": estimated_time
    }
    
    # Save job
    if not save_job(job_id, job_dict):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create generation job"
        )
    
    # Start background generation
    # Try to submit to AsyncTaskQueue first for advanced queue management
    if ASYNC_QUEUE_AVAILABLE:
        try:
            # Create a coroutine wrapper for the generation task
            async def generation_task():
                await run_generation(job_id, GenerationJob(**job_dict))
            
            success = await submit_job_to_async_queue(
                job_id=job_id,
                coroutine=generation_task,
                priority=job_dict.get('priority', 10),
                timeout_seconds=settings.generation_timeout_seconds
            )
            if success:
                logger.info(f"Job {job_id} submitted to AsyncTaskQueue")
            else:
                # Fallback to BackgroundTasks if AsyncTaskQueue submission failed
                background_tasks.add_task(run_generation, job_id, GenerationJob(**job_dict))
                logger.info(f"Job {job_id} submitted to BackgroundTasks (AsyncTaskQueue unavailable)")
        except Exception as e:
            logger.error(f"AsyncTaskQueue submission failed: {e}, using BackgroundTasks")
            background_tasks.add_task(run_generation, job_id, GenerationJob(**job_dict))
    else:
        # Use FastAPI BackgroundTasks as fallback
        background_tasks.add_task(run_generation, job_id, GenerationJob(**job_dict))
        logger.info(f"Job {job_id} submitted to BackgroundTasks")
    
    logger.info(f"Generation job {job_id} created successfully")
    
    return GenerationJobResponse(
        job_id=job_id,
        status=GenerationStatus.PENDING,
        progress=0,
        current_step=None,
        estimated_time_remaining=request.shot_count * 10,  # Estimate 10 seconds per shot
        result=None,
        error=None
    )


@router.get("/sequences/{job_id}/status", response_model=GenerationJobResponse)
async def get_generation_status(
    job_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> GenerationJobResponse:
    """
    Get the status of a generation job.
    
    Args:
        job_id: Job ID
        user_id: Authenticated user ID
    
    Returns:
        Generation job status
    
    Raises:
        HTTPException: If job not found
    """
    job = load_job(job_id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation job not found"
        )
    
    # Calculate estimated time remaining
    estimated_time = None
    if job.status == GenerationStatus.PROCESSING:
        remaining_shots = job.shot_count - (job.progress * job.shot_count // 100)
        estimated_time = remaining_shots * 10
    
    return GenerationJobResponse(
        job_id=job.id,
        status=job.status,
        progress=job.progress,
        current_step=job.current_step,
        estimated_time_remaining=estimated_time,
        result=job.result,
        error=job.error
    )


@router.post("/sequences/{job_id}/cancel", response_model=GenerationJobResponse)
async def cancel_generation(
    job_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> GenerationJobResponse:
    """
    Cancel a running generation job.
    
    Args:
        job_id: Job ID
        user_id: Authenticated user ID
    
    Returns:
        Updated generation job status
    
    Raises:
        HTTPException: If job not found or cannot be cancelled
    """
    job = load_job(job_id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation job not found"
        )
    
    # Only pending or processing jobs can be cancelled
    if job.status not in [GenerationStatus.PENDING, GenerationStatus.PROCESSING]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel job with status: {job.status}"
        )
    
    # Update job status
    job_data = job.dict()
    job_data['status'] = GenerationStatus.CANCELLED.value
    job_data['completed_at'] = datetime.utcnow().isoformat()
    save_job(job_id, job_data)
    
    # Notify listeners
    await notify_job_update(job_id, {
        "status": GenerationStatus.CANCELLED.value,
        "progress": job.progress,
        "current_step": "Cancelled by user"
    })
    
    logger.info(f"Generation job {job_id} cancelled")
    
    return GenerationJobResponse(
        job_id=job_id,
        status=GenerationStatus.CANCELLED,
        progress=job.progress,
        current_step="Cancelled by user",
        estimated_time_remaining=None,
        result=None,
        error=None
    )


@router.get("/sequences/{job_id}/result", response_model=SequenceResponse)
async def get_generation_result(
    job_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> SequenceResponse:
    """
    Get the result of a completed generation job.
    
    Args:
        job_id: Job ID
        user_id: Authenticated user ID
    
    Returns:
        Generated sequence
    
    Raises:
        HTTPException: If job not found or not completed
    """
    job = load_job(job_id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation job not found"
        )
    
    if job.status != GenerationStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Generation not complete. Current status: {job.status}"
        )
    
    if not job.result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Generation result not available"
        )
    
    result = job.result
    return SequenceResponse(
        id=result["id"],
        project_id=result["project_id"],
        name=result["name"],
        description=result.get("description"),
        shots=result["shots"],
        total_duration=result["total_duration"],
        prompt=result["prompt"],
        style=result.get("style"),
        mood=result.get("mood"),
        created_at=datetime.fromisoformat(result["created_at"])
    )


@router.get("/sequences/{job_id}/stream")
async def stream_generation_progress(
    job_id: str,
    user_id: str = Depends(verify_jwt_token)
):
    """
    Stream generation progress updates via Server-Sent Events.
    
    Args:
        job_id: Job ID
        user_id: Authenticated user ID
    
    Returns:
        SSE stream of progress updates
    """
    job = load_job(job_id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Generation job not found"
        )
    
    async def event_generator():
        """Generate SSE events for job progress"""
        # Add connection to listeners
        if job_id not in active_connections:
            active_connections[job_id] = []
        active_connections[job_id].append(asyncio.Queue())
        
        try:
            while True:
                # Check if job is still active
                current_job = load_job(job_id)
                if not current_job:
                    yield {"event": "error", "data": json.dumps({"error": "Job not found"})}
                    break
                
                if current_job.status in [GenerationStatus.COMPLETED, GenerationStatus.FAILED, GenerationStatus.CANCELLED]:
                    # Job finished, send final update
                    yield {
                        "event": "complete",
                        "data": json.dumps({
                            "status": current_job.status.value,
                            "progress": current_job.progress,
                            "result": current_job.result,
                            "error": current_job.error
                        })
                    }
                    break
                
                # Send progress update
                yield {
                    "event": "progress",
                    "data": json.dumps({
                        "status": current_job.status.value,
                        "progress": current_job.progress,
                        "current_step": current_job.current_step
                    })
                }
                
                # Wait for next update
                await asyncio.sleep(1)
                
        except asyncio.CancelledError:
            pass
        finally:
            # Remove connection from listeners
            if job_id in active_connections:
                active_connections[job_id] = [c for c in active_connections[job_id] if not c.empty()]
    
    return EventSourceResponse(event_generator())


@router.get("/sequences")
async def list_generation_jobs(
    project_id: Optional[str] = None,
    status_filter: Optional[GenerationStatus] = None,
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    List generation jobs for the user.
    
    Args:
        project_id: Optional project filter
        status_filter: Optional status filter
        user_id: Authenticated user ID
    
    Returns:
        List of generation jobs
    """
    # Use storage index to filter by user_id
    user_jobs_data = job_storage.get_by_owner(user_id)
    
    # Convert dicts to GenerationJob objects if needed, or work with dicts
    # The response model expects a dict structure
    
    # Apply project filter
    if project_id:
        user_jobs_data = [j for j in user_jobs_data if j.get("project_id") == project_id]
    
    # Apply status filter
    if status_filter:
        status_value = status_filter.value if hasattr(status_filter, 'value') else status_filter
        user_jobs_data = [j for j in user_jobs_data if j.get("status") == status_value]
    
    # Sort by created_at descending
    user_jobs_data.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    return {
        "jobs": [
            {
                "job_id": j["id"],
                "project_id": j.get("project_id"),
                "status": j.get("status"),
                "progress": j.get("progress", 0),
                "created_at": j.get("created_at")
            }
            for j in user_jobs_data
        ],
        "total": len(user_jobs_data)
    }
