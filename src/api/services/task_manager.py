"""
Task Management Service

This module provides asynchronous task management capabilities for long-running operations.

Optimizations in this version:
- Priority queue for task scheduling
- Configurable worker thread pool
- Improved task status polling with caching
- Better resource management
- Task priority support
"""

import threading
import queue
import uuid
import logging
from typing import Any, Callable, Dict, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass, field
from enum import Enum

from ..models import ErrorDetails, ErrorCodes


logger = logging.getLogger(__name__)


class TaskStatus(Enum):
    """Task status enumeration."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class TaskPriority(Enum):
    """Task priority levels."""
    LOW = 3
    NORMAL = 2
    HIGH = 1
    CRITICAL = 0


@dataclass
class Task:
    """
    Represents an asynchronous task.
    
    Attributes:
        task_id: Unique task identifier
        operation: Callable to execute
        params: Parameters for the operation
        user: User who created the task
        priority: Task priority level
        status: Current task status
        progress: Task progress (0.0 to 1.0)
        result: Task result (when completed)
        error: Error details (when failed)
        created_at: Task creation timestamp
        updated_at: Last update timestamp
        timeout: Task timeout in seconds (None for no timeout)
    """
    task_id: str
    operation: Callable
    params: Dict[str, Any]
    user: Optional[Any] = None
    priority: TaskPriority = TaskPriority.NORMAL
    status: TaskStatus = TaskStatus.PENDING
    progress: float = 0.0
    result: Optional[Any] = None
    error: Optional[ErrorDetails] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    timeout: Optional[float] = None
    _cancel_event: threading.Event = field(default_factory=threading.Event)
    
    def __lt__(self, other: 'Task') -> bool:
        """Compare tasks by priority for priority queue."""
        if self.priority.value != other.priority.value:
            return self.priority.value < other.priority.value
        # If same priority, older tasks first
        return self.created_at < other.created_at
    
    def update_status(self, status: TaskStatus) -> None:
        """Update task status and timestamp."""
        self.status = status
        self.updated_at = datetime.now()
    
    def update_progress(self, progress: float) -> None:
        """Update task progress (0.0 to 1.0)."""
        self.progress = max(0.0, min(1.0, progress))
        self.updated_at = datetime.now()
    
    def set_result(self, result: Any) -> None:
        """Set task result and mark as completed."""
        self.result = result
        self.update_status(TaskStatus.COMPLETED)
        self.progress = 1.0
    
    def set_error(self, error: ErrorDetails) -> None:
        """Set task error and mark as failed."""
        self.error = error
        self.update_status(TaskStatus.FAILED)
    
    def cancel(self) -> None:
        """Request task cancellation."""
        self._cancel_event.set()
        self.update_status(TaskStatus.CANCELLED)
    
    def is_cancelled(self) -> bool:
        """Check if task has been cancelled."""
        return self._cancel_event.is_set()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert task to dictionary for API response."""
        result = {
            "task_id": self.task_id,
            "status": self.status.value,
            "priority": self.priority.name,
            "progress": self.progress,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
        
        if self.result is not None:
            result["result"] = self.result
        
        if self.error is not None:
            result["error"] = self.error.to_dict()
        
        return result


class TaskManager:
    """
    Manages asynchronous task execution with background worker threads.
    
    Features:
    - Task creation and tracking
    - Priority-based task scheduling
    - Configurable worker thread pool
    - Task status polling with caching
    - Task cancellation
    - Timeout handling
    - Automatic cleanup of old tasks
    
    Optimizations:
    - Priority queue for better task scheduling
    - Status caching to reduce lock contention
    - Worker pool scaling
    - Efficient task cleanup
    """
    
    def __init__(
        self,
        num_workers: int = 4,
        default_timeout: Optional[float] = None,
        status_cache_ttl: float = 1.0,
        auto_cleanup_interval: float = 300.0,
        max_task_age: float = 3600.0
    ):
        """
        Initialize the task manager.
        
        Args:
            num_workers: Number of worker threads
            default_timeout: Default timeout for tasks in seconds (None for no timeout)
            status_cache_ttl: TTL for status cache in seconds
            auto_cleanup_interval: Interval for automatic cleanup in seconds
            max_task_age: Maximum age for completed tasks in seconds
        """
        self.num_workers = num_workers
        self.default_timeout = default_timeout
        self.status_cache_ttl = status_cache_ttl
        self.auto_cleanup_interval = auto_cleanup_interval
        self.max_task_age = max_task_age
        
        self.tasks: Dict[str, Task] = {}
        self.task_queue: queue.PriorityQueue = queue.PriorityQueue()
        self.workers: List[threading.Thread] = []
        self.shutdown_event = threading.Event()
        self.lock = threading.Lock()
        self.logger = logging.getLogger(self.__class__.__name__)
        
        # Status cache for reducing lock contention
        self._status_cache: Dict[str, tuple[Dict[str, Any], datetime]] = {}
        self._cache_lock = threading.Lock()
        
        # Statistics
        self._stats = {
            "total_created": 0,
            "total_completed": 0,
            "total_failed": 0,
            "total_cancelled": 0,
        }
        
        # Start worker threads
        self._start_workers()
        
        # Start cleanup thread
        self._start_cleanup_thread()
    
    def _start_cleanup_thread(self) -> None:
        """Start background cleanup thread."""
        def cleanup_loop():
            while not self.shutdown_event.is_set():
                try:
                    self.shutdown_event.wait(timeout=self.auto_cleanup_interval)
                    if not self.shutdown_event.is_set():
                        self.cleanup_old_tasks(self.max_task_age)
                except Exception as e:
                    self.logger.error(f"Cleanup error: {e}", exc_info=True)
        
        cleanup_thread = threading.Thread(
            target=cleanup_loop,
            name="TaskCleanup",
            daemon=True
        )
        cleanup_thread.start()
        self.logger.info("Started cleanup thread")
    
    def _start_workers(self) -> None:
        """Start background worker threads."""
        for i in range(self.num_workers):
            worker = threading.Thread(
                target=self._worker_loop,
                name=f"TaskWorker-{i}",
                daemon=True,
            )
            worker.start()
            self.workers.append(worker)
            self.logger.info(f"Started worker thread: {worker.name}")
    
    def _worker_loop(self) -> None:
        """Worker thread main loop."""
        while not self.shutdown_event.is_set():
            try:
                # Get task from queue with timeout
                task = self.task_queue.get(timeout=1.0)
                
                if task is None:
                    # Poison pill - shutdown signal
                    break
                
                # Execute task
                self._execute_task(task)
                
                # Mark task as done in queue
                self.task_queue.task_done()
                
            except queue.Empty:
                # No tasks available, continue waiting
                continue
            except Exception as e:
                self.logger.error(f"Worker error: {e}", exc_info=True)
    
    def _execute_task(self, task: Task) -> None:
        """
        Execute a task with timeout and cancellation support.
        
        Args:
            task: Task to execute
        """
        self.logger.info(f"Executing task: {task.task_id} (priority: {task.priority.name})")
        
        # Update status to running
        task.update_status(TaskStatus.RUNNING)
        
        # Invalidate cache
        with self._cache_lock:
            self._status_cache.pop(task.task_id, None)
        
        try:
            # Check if already cancelled
            if task.is_cancelled():
                self.logger.info(f"Task {task.task_id} was cancelled before execution")
                with self.lock:
                    self._stats["total_cancelled"] += 1
                return
            
            # Execute with timeout if specified
            timeout = task.timeout if task.timeout is not None else self.default_timeout
            
            if timeout is not None:
                # Execute with timeout using threading
                result_container = {"result": None, "error": None}
                
                def execute_with_check():
                    try:
                        # Periodically check for cancellation
                        result_container["result"] = task.operation(task.params, task)
                    except Exception as e:
                        result_container["error"] = e
                
                exec_thread = threading.Thread(target=execute_with_check)
                exec_thread.start()
                exec_thread.join(timeout=timeout)
                
                if exec_thread.is_alive():
                    # Timeout occurred
                    self.logger.warning(f"Task {task.task_id} timed out after {timeout}s")
                    
                    # Try to capture partial result if available
                    partial_result = getattr(task, 'partial_result', None)
                    
                    error = ErrorDetails(
                        code=ErrorCodes.TIMEOUT,
                        message=f"Operation exceeded timeout of {timeout} seconds",
                        details={"timeout_seconds": timeout},
                        remediation="Try breaking the operation into smaller chunks or increase timeout"
                    )
                    
                    if partial_result is not None:
                        error.details["partial_result"] = partial_result
                    
                    task.set_error(error)
                    with self.lock:
                        self._stats["total_failed"] += 1
                    return
                
                # Check for errors
                if result_container["error"] is not None:
                    raise result_container["error"]
                
                # Set result
                task.set_result(result_container["result"])
                with self.lock:
                    self._stats["total_completed"] += 1
                
            else:
                # Execute without timeout
                result = task.operation(task.params, task)
                task.set_result(result)
                with self.lock:
                    self._stats["total_completed"] += 1
            
            self.logger.info(f"Task {task.task_id} completed successfully")
            
        except Exception as e:
            self.logger.error(f"Task {task.task_id} failed: {e}", exc_info=True)
            
            # Create error details
            error = ErrorDetails(
                code=ErrorCodes.INTERNAL_ERROR,
                message=f"Task execution failed: {str(e)}",
                details={"exception_type": type(e).__name__},
                remediation="Check task parameters and try again"
            )
            
            task.set_error(error)
            with self.lock:
                self._stats["total_failed"] += 1
        
        finally:
            # Invalidate cache again after completion
            with self._cache_lock:
                self._status_cache.pop(task.task_id, None)
    
    def create_task(
        self,
        operation: Callable,
        params: Dict[str, Any],
        user: Optional[Any] = None,
        timeout: Optional[float] = None,
        priority: TaskPriority = TaskPriority.NORMAL,
    ) -> str:
        """
        Create a new asynchronous task.
        
        Args:
            operation: Callable to execute (receives params and task as arguments)
            params: Parameters for the operation
            user: User who created the task
            timeout: Task timeout in seconds (None to use default)
            priority: Task priority level
            
        Returns:
            Task ID
        """
        task_id = str(uuid.uuid4())
        
        task = Task(
            task_id=task_id,
            operation=operation,
            params=params,
            user=user,
            timeout=timeout,
            priority=priority,
        )
        
        with self.lock:
            self.tasks[task_id] = task
            self._stats["total_created"] += 1
        
        # Add to priority queue
        self.task_queue.put(task)
        
        self.logger.info(f"Created task: {task_id} (priority: {priority.name})")
        
        return task_id
    
    def get_task_status(self, task_id: str, use_cache: bool = True) -> Optional[Dict[str, Any]]:
        """
        Get the status of a task with optional caching.
        
        Args:
            task_id: Task ID
            use_cache: Whether to use cached status (reduces lock contention)
            
        Returns:
            Task status dictionary or None if not found
        """
        # Check cache first if enabled
        if use_cache:
            with self._cache_lock:
                if task_id in self._status_cache:
                    cached_status, cached_time = self._status_cache[task_id]
                    age = (datetime.now() - cached_time).total_seconds()
                    
                    if age < self.status_cache_ttl:
                        return cached_status
        
        # Get fresh status
        with self.lock:
            task = self.tasks.get(task_id)
            if task is None:
                return None
            
            status = task.to_dict()
        
        # Update cache
        if use_cache:
            with self._cache_lock:
                self._status_cache[task_id] = (status, datetime.now())
        
        return status
    
    def get_task(self, task_id: str) -> Optional[Task]:
        """
        Get a task object.
        
        Args:
            task_id: Task ID
            
        Returns:
            Task object or None if not found
        """
        with self.lock:
            return self.tasks.get(task_id)
    
    def cancel_task(self, task_id: str) -> bool:
        """
        Cancel a running task.
        
        Args:
            task_id: Task ID
            
        Returns:
            True if task was cancelled, False if not found or already completed
        """
        with self.lock:
            task = self.tasks.get(task_id)
            
            if task is None:
                self.logger.warning(f"Task not found: {task_id}")
                return False
            
            if task.status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED):
                self.logger.info(f"Task {task_id} already finished with status: {task.status.value}")
                return False
            
            # Request cancellation
            task.cancel()
            self.logger.info(f"Cancelled task: {task_id}")
            return True
    
    def get_task_result(self, task_id: str) -> Optional[Any]:
        """
        Get the result of a completed task.
        
        Args:
            task_id: Task ID
            
        Returns:
            Task result or None if not found or not completed
        """
        with self.lock:
            task = self.tasks.get(task_id)
            
            if task is None or task.status != TaskStatus.COMPLETED:
                return None
            
            return task.result
    
    def cleanup_old_tasks(self, max_age_seconds: float = 3600) -> int:
        """
        Remove old completed/failed tasks from memory.
        
        Args:
            max_age_seconds: Maximum age of tasks to keep
            
        Returns:
            Number of tasks removed
        """
        now = datetime.now()
        removed_count = 0
        
        with self.lock:
            task_ids_to_remove = []
            
            for task_id, task in self.tasks.items():
                if task.status in (TaskStatus.COMPLETED, TaskStatus.FAILED, TaskStatus.CANCELLED):
                    age = (now - task.updated_at).total_seconds()
                    if age > max_age_seconds:
                        task_ids_to_remove.append(task_id)
            
            for task_id in task_ids_to_remove:
                del self.tasks[task_id]
                removed_count += 1
        
        if removed_count > 0:
            self.logger.info(f"Cleaned up {removed_count} old tasks")
        
        return removed_count
    
    def shutdown(self, wait: bool = True) -> None:
        """
        Shutdown the task manager and stop all workers.
        
        Args:
            wait: Whether to wait for workers to finish
        """
        self.logger.info("Shutting down task manager")
        
        # Signal shutdown
        self.shutdown_event.set()
        
        # Send poison pills to workers
        for _ in range(self.num_workers):
            self.task_queue.put(None)
        
        if wait:
            # Wait for workers to finish
            for worker in self.workers:
                worker.join(timeout=5.0)
        
        self.logger.info("Task manager shutdown complete")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get task manager statistics.
        
        Returns:
            Statistics dictionary
        """
        with self.lock:
            status_counts = {
                "pending": 0,
                "running": 0,
                "completed": 0,
                "failed": 0,
                "cancelled": 0,
            }
            
            priority_counts = {
                "critical": 0,
                "high": 0,
                "normal": 0,
                "low": 0,
            }
            
            for task in self.tasks.values():
                status_counts[task.status.value] += 1
                priority_counts[task.priority.name.lower()] += 1
            
            return {
                "total_tasks": len(self.tasks),
                "queue_size": self.task_queue.qsize(),
                "num_workers": self.num_workers,
                "status_counts": status_counts,
                "priority_counts": priority_counts,
                "lifetime_stats": self._stats.copy(),
                "cache_size": len(self._status_cache),
            }
    
    def scale_workers(self, new_worker_count: int) -> None:
        """
        Scale the number of worker threads.
        
        Args:
            new_worker_count: New number of workers
        """
        if new_worker_count == self.num_workers:
            return
        
        if new_worker_count > self.num_workers:
            # Add workers
            for i in range(self.num_workers, new_worker_count):
                worker = threading.Thread(
                    target=self._worker_loop,
                    name=f"TaskWorker-{i}",
                    daemon=True,
                )
                worker.start()
                self.workers.append(worker)
                self.logger.info(f"Added worker thread: {worker.name}")
            
            self.num_workers = new_worker_count
        else:
            # Remove workers (send poison pills)
            workers_to_remove = self.num_workers - new_worker_count
            for _ in range(workers_to_remove):
                self.task_queue.put(None)
            
            self.num_workers = new_worker_count
            self.logger.info(f"Scaled down to {new_worker_count} workers")
    
    def get_pending_tasks(self, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """
        Get list of pending tasks.
        
        Args:
            limit: Maximum number of tasks to return
        
        Returns:
            List of task dictionaries
        """
        with self.lock:
            pending = [
                task.to_dict()
                for task in self.tasks.values()
                if task.status == TaskStatus.PENDING
            ]
            
            # Sort by priority and creation time
            pending.sort(key=lambda t: (
                TaskPriority[t["priority"]].value,
                t["created_at"]
            ))
            
            if limit:
                pending = pending[:limit]
            
            return pending
    
    def get_running_tasks(self) -> List[Dict[str, Any]]:
        """
        Get list of currently running tasks.
        
        Returns:
            List of task dictionaries
        """
        with self.lock:
            return [
                task.to_dict()
                for task in self.tasks.values()
                if task.status == TaskStatus.RUNNING
            ]
