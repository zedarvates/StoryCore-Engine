"""
Advanced Async Task Queue for Production Scalability

This module provides high-performance async task queuing with:
- Priority-based task scheduling
- Rate limiting and throttling
- Circuit breaker pattern for fault tolerance
- Load balancing across worker pools
- Task dependency management
- Real-time queue monitoring and metrics

Author: StoryCore-Engine Team
Date: 2026-01-15
"""

import asyncio
import heapq
import logging
import time
import threading
from collections import deque, defaultdict
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Any, Optional, Callable, Awaitable, Tuple, Set
from datetime import datetime, timedelta
import statistics


class TaskPriority(Enum):
    """Task priority levels."""
    CRITICAL = 0
    HIGH = 1
    NORMAL = 2
    LOW = 3
    BACKGROUND = 4


class TaskState(Enum):
    """Task execution states."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"


class CircuitBreakerState(Enum):
    """Circuit breaker states."""
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


@dataclass(order=True)
class Task:
    """Async task with priority and metadata."""
    priority: TaskPriority = field(compare=True)
    created_at: float = field(compare=False, default_factory=time.time)
    task_id: str = field(compare=False)
    coroutine: Callable[[], Awaitable[Any]] = field(compare=False)
    args: Tuple = field(compare=False, default_factory=tuple)
    kwargs: Dict[str, Any] = field(compare=False, default_factory=dict)

    # Execution metadata
    state: TaskState = field(compare=False, default=TaskState.PENDING)
    retries: int = field(compare=False, default=0)
    max_retries: int = field(compare=False, default=3)
    timeout_seconds: Optional[float] = field(compare=False, default=None)
    dependencies: Set[str] = field(compare=False, default_factory=set)

    # Results
    result: Any = field(compare=False, default=None)
    error: Optional[Exception] = field(compare=False, default=None)
    execution_time: Optional[float] = field(compare=False, default=None)
    started_at: Optional[float] = field(compare=False, default=None)
    completed_at: Optional[float] = field(compare=False, default=None)

    def __post_init__(self):
        # Ensure priority is comparable
        if isinstance(self.priority, TaskPriority):
            self.priority = self.priority.value

    def is_ready(self, completed_tasks: Set[str]) -> bool:
        """Check if task is ready to execute (dependencies satisfied)."""
        return self.dependencies.issubset(completed_tasks)

    def should_retry(self) -> bool:
        """Check if task should be retried."""
        return self.retries < self.max_retries and self.state == TaskState.FAILED


@dataclass
class QueueConfiguration:
    """Configuration for async task queue."""
    max_queue_size: int = 10000
    max_concurrent_tasks: int = 10
    worker_pool_size: int = 4
    enable_priority_queue: bool = True
    enable_rate_limiting: bool = True
    rate_limit_per_second: int = 100
    enable_circuit_breaker: bool = True
    circuit_breaker_threshold: int = 5
    circuit_breaker_timeout: int = 60
    enable_dependency_management: bool = True
    task_timeout_seconds: int = 300
    retry_backoff_seconds: float = 1.0
    monitoring_interval: int = 5


@dataclass
class QueueStatistics:
    """Statistics for queue performance."""
    tasks_submitted: int = 0
    tasks_completed: int = 0
    tasks_failed: int = 0
    tasks_cancelled: int = 0
    tasks_timeout: int = 0
    current_queue_size: int = 0
    max_queue_size: int = 0
    average_execution_time: float = 0.0
    throughput_per_second: float = 0.0

    # Timing
    total_execution_time: float = 0.0
    last_update: float = field(default_factory=time.time)


class CircuitBreaker:
    """Circuit breaker for fault tolerance."""

    def __init__(self, failure_threshold: int = 5, timeout_seconds: int = 60):
        self.failure_threshold = failure_threshold
        self.timeout_seconds = timeout_seconds
        self.state = CircuitBreakerState.CLOSED
        self.failure_count = 0
        self.last_failure_time = None
        self.lock = threading.Lock()

    def should_attempt(self) -> bool:
        """Check if operation should be attempted."""
        with self.lock:
            if self.state == CircuitBreakerState.CLOSED:
                return True
            elif self.state == CircuitBreakerState.OPEN:
                if self._should_transition_to_half_open():
                    self.state = CircuitBreakerState.HALF_OPEN
                    return True
                return False
            else:  # HALF_OPEN
                return True

    def record_success(self):
        """Record successful operation."""
        with self.lock:
            if self.state == CircuitBreakerState.HALF_OPEN:
                self.state = CircuitBreakerState.CLOSED
            self.failure_count = 0

    def record_failure(self):
        """Record failed operation."""
        with self.lock:
            self.failure_count += 1
            self.last_failure_time = time.time()

            if self.state == CircuitBreakerState.HALF_OPEN:
                self.state = CircuitBreakerState.OPEN
            elif (self.state == CircuitBreakerState.CLOSED and
                  self.failure_count >= self.failure_threshold):
                self.state = CircuitBreakerState.OPEN

    def _should_transition_to_half_open(self) -> bool:
        """Check if circuit breaker should transition to half-open."""
        if self.last_failure_time is None:
            return True
        return time.time() - self.last_failure_time >= self.timeout_seconds

    def get_status(self) -> Dict[str, Any]:
        """Get circuit breaker status."""
        with self.lock:
            return {
                'state': self.state.value,
                'failure_count': self.failure_count,
                'last_failure_time': self.last_failure_time
            }


class RateLimiter:
    """Token bucket rate limiter."""

    def __init__(self, rate_per_second: int, burst_size: int = None):
        self.rate_per_second = rate_per_second
        self.burst_size = burst_size or rate_per_second * 2
        self.tokens = self.burst_size
        self.last_update = time.time()
        self.lock = threading.Lock()

    def acquire(self, tokens: int = 1) -> bool:
        """Acquire tokens from rate limiter."""
        with self.lock:
            now = time.time()
            time_passed = now - self.last_update
            self.last_update = now

            # Add tokens based on time passed
            self.tokens = min(self.burst_size,
                            self.tokens + time_passed * self.rate_per_second)

            if self.tokens >= tokens:
                self.tokens -= tokens
                return True
            return False

    def get_status(self) -> Dict[str, Any]:
        """Get rate limiter status."""
        with self.lock:
            return {
                'tokens': self.tokens,
                'burst_size': self.burst_size,
                'rate_per_second': self.rate_per_second
            }


class AsyncTaskQueue:
    """
    Advanced async task queue with priority scheduling, rate limiting,
    and fault tolerance for production workloads.
    """

    def __init__(self, config: QueueConfiguration = None):
        self.config = config or QueueConfiguration()
        self.logger = logging.getLogger(__name__)

        # Task storage
        self.pending_queue: List[Task] = []  # Priority queue (heap)
        self.running_tasks: Dict[str, Task] = {}
        self.completed_tasks: Dict[str, Task] = {}
        self.waiting_for_dependencies: Dict[str, Task] = {}
        self.completed_task_ids: Set[str] = set()

        # Synchronization
        self.lock = threading.RLock()
        self.condition = threading.Condition(self.lock)

        # Worker management
        self.workers: List[asyncio.Task] = []
        self.worker_semaphore = asyncio.Semaphore(self.config.max_concurrent_tasks)
        self.stop_event = threading.Event()

        # Fault tolerance
        self.circuit_breaker = CircuitBreaker(
            self.config.circuit_breaker_threshold,
            self.config.circuit_breaker_timeout
        ) if self.config.enable_circuit_breaker else None

        self.rate_limiter = RateLimiter(
            self.config.rate_limit_per_second
        ) if self.config.enable_rate_limiting else None

        # Statistics
        self.stats = QueueStatistics()
        self.execution_times: deque = deque(maxlen=1000)

        # Monitoring
        self.monitoring_thread: Optional[threading.Thread] = None

        self.logger.info("AsyncTaskQueue initialized")

    def start(self):
        """Start the task queue processing."""
        if self.workers:
            self.logger.warning("Task queue already started")
            return

        self.stop_event.clear()

        # Start worker tasks
        for i in range(self.config.worker_pool_size):
            worker = asyncio.create_task(self._worker_loop(), name=f"worker-{i}")
            self.workers.append(worker)

        # Start monitoring thread
        self.monitoring_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
        self.monitoring_thread.start()

        self.logger.info(f"Started {self.config.worker_pool_size} workers")

    def stop(self):
        """Stop the task queue processing."""
        self.stop_event.set()

        # Cancel all workers
        for worker in self.workers:
            if not worker.done():
                worker.cancel()

        # Wait for workers to finish
        try:
            asyncio.gather(*self.workers, return_exceptions=True)
        except Exception:
            pass

        self.workers.clear()
        self.logger.info("Task queue stopped")

    async def submit_task(self, task_id: str, coroutine: Callable[[], Awaitable[Any]],
                         priority: TaskPriority = TaskPriority.NORMAL,
                         timeout_seconds: Optional[float] = None,
                         dependencies: Optional[Set[str]] = None,
                         **kwargs) -> str:
        """Submit a task to the queue."""
        task = Task(
            priority=priority,
            task_id=task_id,
            coroutine=coroutine,
            timeout_seconds=timeout_seconds or self.config.task_timeout_seconds,
            dependencies=dependencies or set(),
            kwargs=kwargs
        )

        with self.lock:
            # Check queue size limit
            if len(self.pending_queue) >= self.config.max_queue_size:
                raise asyncio.QueueFull("Task queue is full")

            # Add to appropriate queue
            if self.config.enable_dependency_management and task.dependencies:
                self.waiting_for_dependencies[task_id] = task
            else:
                heapq.heappush(self.pending_queue, task)

            self.stats.tasks_submitted += 1
            self.stats.current_queue_size = len(self.pending_queue)
            self.stats.max_queue_size = max(self.stats.max_queue_size, self.stats.current_queue_size)

            self.condition.notify()

        self.logger.debug(f"Submitted task: {task_id}")
        return task_id

    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get status of a task."""
        with self.lock:
            # Check running tasks
            if task_id in self.running_tasks:
                task = self.running_tasks[task_id]
            # Check completed tasks
            elif task_id in self.completed_tasks:
                task = self.completed_tasks[task_id]
            # Check pending tasks
            else:
                for task in self.pending_queue:
                    if task.task_id == task_id:
                        break
                else:
                    # Check waiting tasks
                    task = self.waiting_for_dependencies.get(task_id)
                    if not task:
                        return None

            return {
                'task_id': task.task_id,
                'state': task.state.value,
                'priority': task.priority,
                'created_at': task.created_at,
                'started_at': task.started_at,
                'completed_at': task.completed_at,
                'execution_time': task.execution_time,
                'retries': task.retries,
                'error': str(task.error) if task.error else None
            }

    async def cancel_task(self, task_id: str) -> bool:
        """Cancel a pending or running task."""
        with self.lock:
            # Check pending queue
            for i, task in enumerate(self.pending_queue):
                if task.task_id == task_id:
                    task.state = TaskState.CANCELLED
                    self.pending_queue.pop(i)
                    heapq.heapify(self.pending_queue)
                    self.completed_tasks[task_id] = task
                    self.stats.tasks_cancelled += 1
                    return True

            # Check waiting tasks
            if task_id in self.waiting_for_dependencies:
                task = self.waiting_for_dependencies[task_id]
                task.state = TaskState.CANCELLED
                del self.waiting_for_dependencies[task_id]
                self.completed_tasks[task_id] = task
                self.stats.tasks_cancelled += 1
                return True

            # Running tasks cannot be cancelled directly
            # (would require task cancellation tokens)
            return False

    async def wait_for_task(self, task_id: str, timeout: Optional[float] = None) -> Optional[Any]:
        """Wait for a task to complete."""
        start_time = time.time()

        while True:
            status = await self.get_task_status(task_id)
            if status is None:
                return None

            if status['state'] in [TaskState.COMPLETED.value, TaskState.FAILED.value,
                                 TaskState.CANCELLED.value, TaskState.TIMEOUT.value]:
                task = self.completed_tasks.get(task_id)
                return task.result if task and task.state == TaskState.COMPLETED else None

            if timeout and time.time() - start_time > timeout:
                return None

            await asyncio.sleep(0.1)

    def get_queue_statistics(self) -> Dict[str, Any]:
        """Get comprehensive queue statistics."""
        with self.lock:
            # Calculate throughput
            if self.execution_times:
                recent_times = list(self.execution_times)[-100:]  # Last 100 executions
                if recent_times:
                    avg_time = statistics.mean(recent_times)
                    self.stats.throughput_per_second = 1.0 / avg_time if avg_time > 0 else 0

            return {
                'queue_size': len(self.pending_queue),
                'running_tasks': len(self.running_tasks),
                'completed_tasks': len(self.completed_tasks),
                'waiting_for_dependencies': len(self.waiting_for_dependencies),
                'workers_active': len([w for w in self.workers if not w.done()]),
                'statistics': {
                    'tasks_submitted': self.stats.tasks_submitted,
                    'tasks_completed': self.stats.tasks_completed,
                    'tasks_failed': self.stats.tasks_failed,
                    'tasks_cancelled': self.stats.tasks_cancelled,
                    'tasks_timeout': self.stats.tasks.timeout,
                    'current_queue_size': self.stats.current_queue_size,
                    'max_queue_size': self.stats.max_queue_size,
                    'average_execution_time': self.stats.average_execution_time,
                    'throughput_per_second': self.stats.throughput_per_second
                },
                'circuit_breaker': self.circuit_breaker.get_status() if self.circuit_breaker else None,
                'rate_limiter': self.rate_limiter.get_status() if self.rate_limiter else None
            }

    async def _worker_loop(self):
        """Main worker loop."""
        while not self.stop_event.is_set():
            try:
                # Get next task
                task = await self._get_next_task()
                if task is None:
                    await asyncio.sleep(0.1)
                    continue

                # Execute task
                await self._execute_task(task)

            except Exception as e:
                self.logger.error(f"Worker error: {e}")
                await asyncio.sleep(1)  # Prevent tight error loops

    async def _get_next_task(self) -> Optional[Task]:
        """Get next task to execute."""
        with self.lock:
            # Check dependency-ready tasks first
            ready_tasks = []
            for task_id, task in list(self.waiting_for_dependencies.items()):
                if task.is_ready(self.completed_task_ids):
                    ready_tasks.append(task)
                    del self.waiting_for_dependencies[task_id]

            # Add ready tasks to priority queue
            for task in ready_tasks:
                heapq.heappush(self.pending_queue, task)

            # Get highest priority task
            if self.pending_queue:
                task = heapq.heappop(self.pending_queue)
                self.running_tasks[task.task_id] = task
                task.state = TaskState.RUNNING
                task.started_at = time.time()
                return task

        return None

    async def _execute_task(self, task: Task):
        """Execute a single task."""
        try:
            # Check rate limiting
            if self.rate_limiter and not self.rate_limiter.acquire():
                # Rate limited, re-queue
                task.state = TaskState.PENDING
                with self.lock:
                    heapq.heappush(self.pending_queue, task)
                    del self.running_tasks[task.task_id]
                return

            # Check circuit breaker
            if self.circuit_breaker and not self.circuit_breaker.should_attempt():
                # Circuit open, fail fast
                task.state = TaskState.FAILED
                task.error = Exception("Circuit breaker open")
                self._complete_task(task)
                return

            # Execute with timeout
            async with self.worker_semaphore:
                if task.timeout_seconds:
                    result = await asyncio.wait_for(
                        task.coroutine(*task.args, **task.kwargs),
                        timeout=task.timeout_seconds
                    )
                else:
                    result = await task.coroutine(*task.args, **task.kwargs)

            # Success
            task.result = result
            task.state = TaskState.COMPLETED

            if self.circuit_breaker:
                self.circuit_breaker.record_success()

        except asyncio.TimeoutError:
            task.state = TaskState.TIMEOUT
            task.error = asyncio.TimeoutError("Task timeout")
            self.stats.tasks_timeout += 1

        except Exception as e:
            task.error = e
            task.state = TaskState.FAILED
            self.stats.tasks_failed += 1

            if self.circuit_breaker:
                self.circuit_breaker.record_failure()

            # Check for retry
            if task.should_retry():
                task.retries += 1
                task.state = TaskState.PENDING
                # Exponential backoff
                backoff = self.config.retry_backoff_seconds * (2 ** task.retries)
                await asyncio.sleep(backoff)

                with self.lock:
                    heapq.heappush(self.pending_queue, task)
                    del self.running_tasks[task.task_id]
                return

        finally:
            # Record execution time
            if task.started_at:
                task.execution_time = time.time() - task.started_at
                task.completed_at = time.time()
                self.execution_times.append(task.execution_time)

            # Complete task
            self._complete_task(task)

    def _complete_task(self, task: Task):
        """Complete task processing."""
        with self.lock:
            if task.task_id in self.running_tasks:
                del self.running_tasks[task.task_id]

            self.completed_tasks[task.task_id] = task
            self.completed_task_ids.add(task.task_id)

            if task.state == TaskState.COMPLETED:
                self.stats.tasks_completed += 1
                if task.execution_time:
                    self.stats.total_execution_time += task.execution_time
                    self.stats.average_execution_time = (
                        self.stats.total_execution_time / self.stats.tasks_completed
                    )
            elif task.state == TaskState.CANCELLED:
                self.stats.tasks_cancelled += 1

            self.condition.notify_all()

    def _monitoring_loop(self):
        """Background monitoring loop."""
        while not self.stop_event.is_set():
            try:
                time.sleep(self.config.monitoring_interval)

                # Log queue status
                stats = self.get_queue_statistics()
                self.logger.debug(f"Queue status: {stats['queue_size']} pending, "
                                f"{stats['running_tasks']} running, "
                                f"{stats['completed_tasks']} completed")

            except Exception as e:
                self.logger.error(f"Monitoring error: {e}")


# Global task queue instance
_task_queue: Optional[AsyncTaskQueue] = None


def get_async_task_queue() -> AsyncTaskQueue:
    """Get global async task queue instance."""
    global _task_queue
    if _task_queue is None:
        _task_queue = AsyncTaskQueue()
    return _task_queue


async def submit_async_task(task_id: str, coroutine: Callable[[], Awaitable[Any]],
                           priority: TaskPriority = TaskPriority.NORMAL, **kwargs) -> str:
    """Submit task to global queue."""
    return await get_async_task_queue().submit_task(task_id, coroutine, priority, **kwargs)