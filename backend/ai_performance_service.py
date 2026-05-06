"""
AI Performance Service for StoryCore-Engine

Provides performance optimizations:
- WebSocket progress tracking for long AI operations
- Batch processing for multiple files
- Redis cache for AI results
- Job queue integration

Phase 9: Performance & Production
"""

import asyncio
import json
import logging
import os
import hashlib
import time
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Optional
from datetime import datetime, timedelta
import threading

logger = logging.getLogger(__name__)


# =============================================================================
# Data Classes
# =============================================================================


@dataclass
class JobProgress:
    """Progress tracking for AI jobs"""

    job_id: str
    status: str  # pending, running, completed, failed
    progress: float  # 0-100
    message: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    result: Optional[Dict] = None
    error: Optional[str] = None


@dataclass
class CacheEntry:
    """Cache entry for AI results"""

    key: str
    value: Any
    created_at: datetime
    expires_at: datetime
    hit_count: int = 0


# =============================================================================
# WebSocket Progress Manager
# =============================================================================


class WebSocketProgressManager:
    """
    Manages real-time progress updates via WebSocket-like callbacks.
    Used for long-running AI operations.
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        self._jobs: Dict[str, JobProgress] = {}
        self._subscribers: Dict[str, List[Callable]] = {}
        self._lock = threading.Lock()

    def create_job(self, job_id: str, message: str = "Starting...") -> JobProgress:
        """Create a new job for progress tracking."""
        job = JobProgress(
            job_id=job_id,
            status="pending",
            progress=0.0,
            message=message,
            started_at=datetime.utcnow(),
        )

        with self._lock:
            self._jobs[job_id] = job

        self._notify_subscribers(job_id, job)
        return job

    def update_progress(
        self, job_id: str, progress: float, message: str, status: str = "running"
    ) -> Optional[JobProgress]:
        """Update job progress."""
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return None

            job.progress = min(100.0, max(0.0, progress))
            job.message = message
            job.status = status

        self._notify_subscribers(job_id, job)
        return job

    def complete_job(
        self, job_id: str, result: Optional[Dict] = None, error: Optional[str] = None
    ) -> Optional[JobProgress]:
        """Mark job as completed."""
        with self._lock:
            job = self._jobs.get(job_id)
            if not job:
                return None

            job.status = "failed" if error else "completed"
            job.progress = 100.0
            job.completed_at = datetime.utcnow()
            job.result = result
            job.error = error

        self._notify_subscribers(job_id, job)
        return job

    def get_job(self, job_id: str) -> Optional[JobProgress]:
        """Get job status."""
        with self._lock:
            return self._jobs.get(job_id)

    def subscribe(self, job_id: str, callback: Callable) -> None:
        """Subscribe to job updates."""
        with self._lock:
            if job_id not in self._subscribers:
                self._subscribers[job_id] = []
            self._subscribers[job_id].append(callback)

    def unsubscribe(self, job_id: str, callback: Callable) -> None:
        """Unsubscribe from job updates."""
        with self._lock:
            if job_id in self._subscribers:
                try:
                    self._subscribers[job_id].remove(callback)
                except ValueError:
                    pass

    def _notify_subscribers(self, job_id: str, job: JobProgress) -> None:
        """Notify all subscribers of job update."""
        subscribers = self._subscribers.get(job_id, [])
        for callback in subscribers:
            try:
                callback(job)
            except Exception as e:
                logger.error(f"Subscriber callback error: {e}")

    def cleanup_old_jobs(self, max_age_hours: int = 24) -> int:
        """Remove jobs older than max_age_hours."""
        cutoff = datetime.utcnow() - timedelta(hours=max_age_hours)
        removed = 0

        with self._lock:
            to_remove = [
                job_id for job_id, job in self._jobs.items() if job.started_at < cutoff
            ]

            for job_id in to_remove:
                del self._jobs[job_id]
                if job_id in self._subscribers:
                    del self._subscribers[job_id]
                removed += 1

        return removed


# =============================================================================
# AI Cache Service
# =============================================================================


class AICacheService:
    """
    Intelligent cache for AI operation results.
    Avoids re-computing expensive AI operations.
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self, cache_dir: str = "./cache/ai_cache"):
        if self._initialized:
            return
        self._initialized = True
        self._cache_dir = cache_dir
        self._memory_cache: Dict[str, CacheEntry] = {}
        self._lock = threading.Lock()
        self._max_memory_entries = 1000
        self._default_ttl_hours = 24

        os.makedirs(cache_dir, exist_ok=True)

    def _generate_key(self, operation: str, params: Dict) -> str:
        """Generate cache key from operation + params."""
        content = f"{operation}:{json.dumps(params, sort_keys=True)}"
        return hashlib.sha256(content.encode()).hexdigest()

    def get(self, operation: str, params: Dict) -> Optional[Any]:
        """Get cached result if exists and not expired."""
        key = self._generate_key(operation, params)

        # Check memory cache first
        with self._lock:
            entry = self._memory_cache.get(key)
            if entry:
                if datetime.utcnow() < entry.expires_at:
                    entry.hit_count += 1
                    logger.debug(f"Cache hit (memory): {operation}")
                    return entry.value
                else:
                    del self._memory_cache[key]

        # Check disk cache
        cache_file = os.path.join(self._cache_dir, f"{key}.json")
        if os.path.exists(cache_file):
            try:
                with open(cache_file, "r") as f:
                    data = json.load(f)

                expires_at = datetime.fromisoformat(data["expires_at"])
                if datetime.utcnow() < expires_at:
                    value = data["value"]

                    # Promote to memory cache
                    with self._lock:
                        self._memory_cache[key] = CacheEntry(
                            key=key,
                            value=value,
                            created_at=datetime.fromisoformat(data["created_at"]),
                            expires_at=expires_at,
                            hit_count=data.get("hit_count", 0) + 1,
                        )

                    logger.debug(f"Cache hit (disk): {operation}")
                    return value
                else:
                    os.unlink(cache_file)
            except Exception as e:
                logger.error(f"Cache read error: {e}")

        return None

    def set(
        self, operation: str, params: Dict, value: Any, ttl_hours: Optional[int] = None
    ) -> None:
        """Cache a result."""
        key = self._generate_key(operation, params)
        ttl = ttl_hours or self._default_ttl_hours
        now = datetime.utcnow()
        expires_at = now + timedelta(hours=ttl)

        entry = CacheEntry(key=key, value=value, created_at=now, expires_at=expires_at)

        # Store in memory cache
        with self._lock:
            if len(self._memory_cache) >= self._max_memory_entries:
                # Remove oldest entries
                sorted_keys = sorted(
                    self._memory_cache.keys(),
                    key=lambda k: self._memory_cache[k].created_at,
                )
                for old_key in sorted_keys[:100]:
                    del self._memory_cache[old_key]

            self._memory_cache[key] = entry

        # Store on disk
        cache_file = os.path.join(self._cache_dir, f"{key}.json")
        try:
            with open(cache_file, "w") as f:
                json.dump(
                    {
                        "key": key,
                        "value": value,
                        "created_at": now.isoformat(),
                        "expires_at": expires_at.isoformat(),
                        "hit_count": 0,
                    },
                    f,
                )
        except Exception as e:
            logger.error(f"Cache write error: {e}")

        logger.debug(f"Cached result for: {operation}")

    def invalidate(self, operation: str, params: Dict) -> None:
        """Invalidate a cached result."""
        key = self._generate_key(operation, params)

        with self._lock:
            if key in self._memory_cache:
                del self._memory_cache[key]

        cache_file = os.path.join(self._cache_dir, f"{key}.json")
        if os.path.exists(cache_file):
            os.unlink(cache_file)

    def clear_all(self) -> None:
        """Clear all cache."""
        with self._lock:
            self._memory_cache.clear()

        for f in os.listdir(self._cache_dir):
            if f.endswith(".json"):
                os.unlink(os.path.join(self._cache_dir, f))

    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self._lock:
            total_hits = sum(e.hit_count for e in self._memory_cache.values())
            memory_entries = len(self._memory_cache)

        disk_entries = len(
            [f for f in os.listdir(self._cache_dir) if f.endswith(".json")]
        )

        return {
            "memory_entries": memory_entries,
            "disk_entries": disk_entries,
            "total_hits": total_hits,
            "cache_dir": self._cache_dir,
        }


# =============================================================================
# Batch Processing Service
# =============================================================================


class BatchProcessingService:
    """
    Process multiple files in parallel for efficiency.
    """

    def __init__(self, max_workers: int = 4):
        self.max_workers = max_workers
        self._semaphore = asyncio.Semaphore(max_workers)

    async def process_batch(
        self,
        items: List[Dict],
        process_func: Callable,
        on_progress: Optional[Callable] = None,
        on_complete: Optional[Callable] = None,
        on_error: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        """
        Process a batch of items in parallel.

        Args:
            items: List of items to process
            process_func: Async function to process each item
            on_progress: Callback for progress updates (item_index, total, message)
            on_complete: Callback when item completes (item, result)
            on_error: Callback when item fails (item, error)

        Returns:
            Dict with results, errors, and timing stats
        """
        results = []
        errors = []
        total = len(items)
        completed = 0

        async def process_item(item: Dict, index: int):
            nonlocal completed

            async with self._semaphore:
                try:
                    result = await process_func(item)
                    results.append({"item": item, "result": result, "index": index})
                    completed += 1

                    if on_progress:
                        on_progress(index, total, f"Completed {completed}/{total}")
                    if on_complete:
                        on_complete(item, result)

                except Exception as e:
                    errors.append({"item": item, "error": str(e), "index": index})
                    completed += 1

                    if on_progress:
                        on_progress(index, total, f"Error on item {index}: {e}")
                    if on_error:
                        on_error(item, str(e))

        start_time = time.time()

        # Create tasks for all items
        tasks = [process_item(item, i) for i, item in enumerate(items)]

        # Run all tasks
        await asyncio.gather(*tasks)

        end_time = time.time()

        return {
            "total": total,
            "successful": len(results),
            "failed": len(errors),
            "results": results,
            "errors": errors,
            "duration_seconds": end_time - start_time,
            "items_per_second": total / (end_time - start_time)
            if end_time > start_time
            else 0,
        }

    async def process_batch_sequential(
        self,
        items: List[Dict],
        process_func: Callable,
        on_progress: Optional[Callable] = None,
    ) -> Dict[str, Any]:
        """
        Process items sequentially (for resource-constrained operations).
        """
        results = []
        errors = []
        total = len(items)
        start_time = time.time()

        for i, item in enumerate(items):
            try:
                result = await process_func(item)
                results.append({"item": item, "result": result, "index": i})

                if on_progress:
                    on_progress(i, total, f"Processed {i + 1}/{total}")

            except Exception as e:
                errors.append({"item": item, "error": str(e), "index": i})

        end_time = time.time()

        return {
            "total": total,
            "successful": len(results),
            "failed": len(errors),
            "results": results,
            "errors": errors,
            "duration_seconds": end_time - start_time,
        }


# =============================================================================
# Job Queue Service (Simple In-Memory Implementation)
# =============================================================================


class JobQueueService:
    """
    Simple in-memory job queue for async AI operations.
    For production, replace with Celery/Redis.
    """

    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self, max_queue_size: int = 100):
        if self._initialized:
            return
        self._initialized = True
        self._queue: List[Dict] = []
        self._jobs: Dict[str, Dict] = {}
        self._lock = threading.Lock()
        self._max_queue_size = max_queue_size
        self._workers: List[threading.Thread] = []
        self._running = False
        self._job_handlers: Dict[str, Callable] = {}

    def register_handler(self, job_type: str, handler: Callable) -> None:
        """Register a handler for a job type."""
        self._job_handlers[job_type] = handler

    def submit_job(
        self, job_id: str, job_type: str, params: Dict, priority: int = 0
    ) -> bool:
        """Submit a job to the queue."""
        with self._lock:
            if len(self._queue) >= self._max_queue_size:
                return False

            job = {
                "job_id": job_id,
                "job_type": job_type,
                "params": params,
                "priority": priority,
                "status": "pending",
                "submitted_at": datetime.utcnow().isoformat(),
            }

            self._jobs[job_id] = job
            self._queue.append(job)

            # Sort by priority (higher = more important)
            self._queue.sort(key=lambda x: x["priority"], reverse=True)

            return True

    def get_job_status(self, job_id: str) -> Optional[Dict]:
        """Get job status."""
        with self._lock:
            return self._jobs.get(job_id)

    def cancel_job(self, job_id: str) -> bool:
        """Cancel a pending job."""
        with self._lock:
            if job_id in self._jobs:
                job = self._jobs[job_id]
                if job["status"] == "pending":
                    job["status"] = "cancelled"
                    self._queue = [j for j in self._queue if j["job_id"] != job_id]
                    return True
            return False

    def start_workers(self, num_workers: int = 2) -> None:
        """Start worker threads."""
        if self._running:
            return

        self._running = True

        for i in range(num_workers):
            worker = threading.Thread(target=self._worker_loop, daemon=True)
            worker.start()
            self._workers.append(worker)

        logger.info(f"Started {num_workers} job queue workers")

    def stop_workers(self) -> None:
        """Stop all worker threads."""
        self._running = False
        self._workers.clear()

    def _worker_loop(self) -> None:
        """Worker thread loop."""
        while self._running:
            job = None

            with self._lock:
                if self._queue:
                    job = self._queue.pop(0)

            if job:
                self._process_job(job)
            else:
                time.sleep(0.1)  # No jobs, wait briefly

    def _process_job(self, job: Dict) -> None:
        """Process a single job."""
        job_id = job["job_id"]
        job_type = job["job_type"]
        params = job["params"]

        # Update status
        with self._lock:
            self._jobs[job_id]["status"] = "running"
            self._jobs[job_id]["started_at"] = datetime.utcnow().isoformat()

        # Get handler
        handler = self._job_handlers.get(job_type)

        if not handler:
            with self._lock:
                self._jobs[job_id]["status"] = "failed"
                self._jobs[job_id]["error"] = f"No handler for job type: {job_type}"
            return

        try:
            # Execute handler
            if asyncio.iscoroutinefunction(handler):
                result = asyncio.run(handler(params))
            else:
                result = handler(params)

            with self._lock:
                self._jobs[job_id]["status"] = "completed"
                self._jobs[job_id]["result"] = result
                self._jobs[job_id]["completed_at"] = datetime.utcnow().isoformat()

        except Exception as e:
            logger.error(f"Job {job_id} failed: {e}")
            with self._lock:
                self._jobs[job_id]["status"] = "failed"
                self._jobs[job_id]["error"] = str(e)

    def get_queue_stats(self) -> Dict[str, Any]:
        """Get queue statistics."""
        with self._lock:
            pending = len(self._queue)
            running = sum(1 for j in self._jobs.values() if j["status"] == "running")
            completed = sum(
                1 for j in self._jobs.values() if j["status"] == "completed"
            )
            failed = sum(1 for j in self._jobs.values() if j["status"] == "failed")

            return {
                "pending": pending,
                "running": running,
                "completed": completed,
                "failed": failed,
                "total_jobs": len(self._jobs),
                "workers": len(self._workers),
            }


# =============================================================================
# Factory Functions
# =============================================================================


def get_progress_manager() -> WebSocketProgressManager:
    return WebSocketProgressManager()


def get_cache_service() -> AICacheService:
    return AICacheService()


def get_batch_service(max_workers: int = 4) -> BatchProcessingService:
    return BatchProcessingService(max_workers)


def get_job_queue() -> JobQueueService:
    return JobQueueService()
