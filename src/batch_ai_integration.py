"""
Batch AI Integration - Non-blocking AI job scheduling for batch processing.

This module provides event-driven, non-blocking integration between AI Enhancement
operations and the Batch Processing System. Uses async patterns, resource-aware
scheduling, and circuit breakers to prevent blocking.

Key Design Principles:
- Event-driven architecture (no polling loops)
- Resource-aware scheduling (GPU/CPU allocation)
- Async job management with timeouts
- Circuit breakers for fault isolation
- Coordination between real-time and batch processing
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable, Set
from enum import Enum
from collections import defaultdict, deque
import time
import uuid

try:
    from .circuit_breaker import CircuitBreaker, CircuitBreakerConfig
except ImportError:
    from circuit_breaker import CircuitBreaker, CircuitBreakerConfig


class AIJobType(Enum):
    """Types of AI batch jobs."""
    STYLE_TRANSFER_BATCH = "style_transfer_batch"
    SUPER_RESOLUTION_BATCH = "super_resolution_batch"
    INTERPOLATION_BATCH = "interpolation_batch"
    QUALITY_OPTIMIZATION_BATCH = "quality_optimization_batch"
    MODEL_TRAINING = "model_training"
    MODEL_EVALUATION = "model_evaluation"


class AIJobPriority(Enum):
    """Priority levels for AI batch jobs."""
    CRITICAL = 1
    HIGH = 2
    NORMAL = 3
    LOW = 4
    BACKGROUND = 5


class AIJobStatus(Enum):
    """Status of AI batch jobs."""
    PENDING = "pending"
    QUEUED = "queued"
    SCHEDULED = "scheduled"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"


class ResourceType(Enum):
    """Types of computational resources."""
    GPU = "gpu"
    CPU = "cpu"
    MEMORY = "memory"
    DISK = "disk"


@dataclass
class ResourceRequirements:
    """Resource requirements for an AI job."""
    gpu_count: int = 0
    gpu_memory_mb: int = 0
    cpu_cores: int = 1
    memory_mb: int = 1024
    disk_mb: int = 0
    estimated_duration_seconds: float = 60.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'gpu_count': self.gpu_count,
            'gpu_memory_mb': self.gpu_memory_mb,
            'cpu_cores': self.cpu_cores,
            'memory_mb': self.memory_mb,
            'disk_mb': self.disk_mb,
            'estimated_duration_seconds': self.estimated_duration_seconds
        }


@dataclass
class AIBatchJob:
    """Definition of an AI batch job."""
    job_id: str
    job_type: AIJobType
    priority: AIJobPriority
    resource_requirements: ResourceRequirements
    parameters: Dict[str, Any]
    dependencies: List[str] = field(default_factory=list)
    max_retries: int = 3
    timeout_seconds: float = 3600.0
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    scheduled_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    status: AIJobStatus = AIJobStatus.PENDING
    retry_count: int = 0
    error_message: Optional[str] = None
    result: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'job_id': self.job_id,
            'job_type': self.job_type.value,
            'priority': self.priority.value,
            'resource_requirements': self.resource_requirements.to_dict(),
            'parameters': self.parameters,
            'dependencies': self.dependencies,
            'max_retries': self.max_retries,
            'timeout_seconds': self.timeout_seconds,
            'created_at': self.created_at.isoformat(),
            'scheduled_at': self.scheduled_at.isoformat() if self.scheduled_at else None,
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'status': self.status.value,
            'retry_count': self.retry_count,
            'error_message': self.error_message,
            'result': self.result
        }


@dataclass
class ResourceAvailability:
    """Current resource availability."""
    total_gpu_count: int
    available_gpu_count: int
    total_gpu_memory_mb: int
    available_gpu_memory_mb: int
    total_cpu_cores: int
    available_cpu_cores: int
    total_memory_mb: int
    available_memory_mb: int
    
    def can_allocate(self, requirements: ResourceRequirements) -> bool:
        """Check if resources can be allocated."""
        return (
            self.available_gpu_count >= requirements.gpu_count and
            self.available_gpu_memory_mb >= requirements.gpu_memory_mb and
            self.available_cpu_cores >= requirements.cpu_cores and
            self.available_memory_mb >= requirements.memory_mb
        )
    
    def allocate(self, requirements: ResourceRequirements):
        """Allocate resources."""
        self.available_gpu_count -= requirements.gpu_count
        self.available_gpu_memory_mb -= requirements.gpu_memory_mb
        self.available_cpu_cores -= requirements.cpu_cores
        self.available_memory_mb -= requirements.memory_mb
    
    def release(self, requirements: ResourceRequirements):
        """Release resources."""
        self.available_gpu_count = min(
            self.available_gpu_count + requirements.gpu_count,
            self.total_gpu_count
        )
        self.available_gpu_memory_mb = min(
            self.available_gpu_memory_mb + requirements.gpu_memory_mb,
            self.total_gpu_memory_mb
        )
        self.available_cpu_cores = min(
            self.available_cpu_cores + requirements.cpu_cores,
            self.total_cpu_cores
        )
        self.available_memory_mb = min(
            self.available_memory_mb + requirements.memory_mb,
            self.total_memory_mb
        )


@dataclass
class BatchConfig:
    """Configuration for batch AI integration."""
    # Scheduling settings
    max_concurrent_jobs: int = 4
    scheduling_interval_seconds: float = 5.0
    job_timeout_seconds: float = 3600.0
    
    # Resource settings
    total_gpu_count: int = 1
    total_gpu_memory_mb: int = 8192
    total_cpu_cores: int = 8
    total_memory_mb: int = 16384
    
    # Queue settings (prevents unbounded growth)
    max_queue_size: int = 100
    max_completed_jobs_history: int = 1000
    
    # Retry settings
    default_max_retries: int = 3
    retry_delay_seconds: float = 60.0
    
    # Circuit breaker settings
    enable_circuit_breaker: bool = True
    failure_threshold: int = 5
    recovery_timeout_seconds: float = 60.0
    
    # Coordination settings
    enable_real_time_coordination: bool = True
    real_time_priority_boost: int = 2  # Boost for real-time jobs


class BatchAIIntegration:
    """
    Non-blocking Batch AI Integration.
    
    Provides resource-aware scheduling and coordination between real-time
    and batch AI processing without blocking or infinite loops.
    
    Architecture:
    - Priority queue with resource awareness
    - Async job execution with timeouts
    - Circuit breaker protection
    - Explicit resource allocation/deallocation
    - Periodic scheduling (no continuous polling)
    """
    
    def __init__(self, config: BatchConfig):
        """Initialize batch AI integration."""
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Job storage (with size limits)
        self.pending_jobs: List[AIBatchJob] = []  # Priority queue
        self.running_jobs: Dict[str, AIBatchJob] = {}
        self.completed_jobs: deque = deque(maxlen=config.max_completed_jobs_history)
        self.failed_jobs: deque = deque(maxlen=config.max_completed_jobs_history)
        
        # Resource management
        self.resources = ResourceAvailability(
            total_gpu_count=config.total_gpu_count,
            available_gpu_count=config.total_gpu_count,
            total_gpu_memory_mb=config.total_gpu_memory_mb,
            available_gpu_memory_mb=config.total_gpu_memory_mb,
            total_cpu_cores=config.total_cpu_cores,
            available_cpu_cores=config.total_cpu_cores,
            total_memory_mb=config.total_memory_mb,
            available_memory_mb=config.total_memory_mb
        )
        
        # Job execution tasks
        self.job_tasks: Dict[str, asyncio.Task] = {}
        
        # Statistics
        self.stats = {
            'total_jobs_submitted': 0,
            'total_jobs_completed': 0,
            'total_jobs_failed': 0,
            'total_jobs_cancelled': 0,
            'total_execution_time': 0.0,
            'average_wait_time': 0.0,
            'resource_utilization': 0.0
        }
        
        # Circuit breaker
        if config.enable_circuit_breaker:
            cb_config = CircuitBreakerConfig(
                failure_threshold=config.failure_threshold,
                recovery_timeout=config.recovery_timeout_seconds,
                timeout=config.job_timeout_seconds
            )
            self.circuit_breaker = CircuitBreaker(cb_config)
        else:
            self.circuit_breaker = None
        
        # Background tasks
        self.background_tasks: List[asyncio.Task] = []
        self.is_running = False
        
        # Real-time job tracking (for coordination)
        self.real_time_jobs: Set[str] = set()
        
        self.logger.info("Batch AI Integration initialized (non-blocking mode)")
    
    async def start(self):
        """Start background processing."""
        if self.is_running:
            self.logger.warning("Batch integration already running")
            return
        
        self.is_running = True
        
        # Start scheduler (periodic, not continuous)
        scheduler_task = asyncio.create_task(self._scheduler_loop())
        self.background_tasks.append(scheduler_task)
        
        # Start resource monitor (periodic)
        monitor_task = asyncio.create_task(self._resource_monitor_loop())
        self.background_tasks.append(monitor_task)
        
        self.logger.info("Batch AI Integration started")
    
    async def stop(self, timeout: float = 10.0):
        """Stop background processing with timeout."""
        if not self.is_running:
            return
        
        self.is_running = False
        
        # Cancel all running jobs
        for job_id, task in list(self.job_tasks.items()):
            task.cancel()
        
        # Cancel background tasks
        for task in self.background_tasks:
            task.cancel()
        
        # Wait for cancellation with timeout
        try:
            all_tasks = list(self.job_tasks.values()) + self.background_tasks
            await asyncio.wait_for(
                asyncio.gather(*all_tasks, return_exceptions=True),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            self.logger.warning(f"Tasks did not stop within {timeout}s")
        except Exception as e:
            self.logger.error(f"Error stopping tasks: {e}")
        finally:
            self.job_tasks.clear()
            self.background_tasks.clear()
        
        self.logger.info("Batch AI Integration stopped")
    
    async def submit_job(self, job: AIBatchJob, timeout: float = 5.0) -> bool:
        """
        Submit a job for batch processing (non-blocking).
        
        Args:
            job: Job to submit
            timeout: Maximum time to wait for submission
            
        Returns:
            True if submitted successfully
        """
        try:
            # Check queue size (prevents unbounded growth)
            if len(self.pending_jobs) >= self.config.max_queue_size:
                self.logger.warning(f"Job queue full, rejecting job {job.job_id}")
                return False
            
            # Add to pending queue (priority-based)
            job.status = AIJobStatus.QUEUED
            self.pending_jobs.append(job)
            self._sort_pending_jobs()
            
            self.stats['total_jobs_submitted'] += 1
            
            self.logger.info(f"Job {job.job_id} submitted (type: {job.job_type.value}, priority: {job.priority.value})")
            return True
            
        except Exception as e:
            self.logger.error(f"Error submitting job: {e}")
            return False
    
    def _sort_pending_jobs(self):
        """Sort pending jobs by priority and creation time."""
        self.pending_jobs.sort(
            key=lambda j: (j.priority.value, j.created_at)
        )
    
    async def _scheduler_loop(self):
        """
        Periodic job scheduler (non-blocking).
        
        Uses fixed intervals instead of continuous polling.
        """
        while self.is_running:
            try:
                # Wait for next scheduling interval
                await asyncio.sleep(self.config.scheduling_interval_seconds)
                
                # Schedule jobs
                await self._schedule_jobs()
                
            except asyncio.CancelledError:
                self.logger.info("Scheduler loop cancelled")
                break
            except Exception as e:
                self.logger.error(f"Error in scheduler loop: {e}")
                await asyncio.sleep(5.0)  # Back off on error
    
    async def _schedule_jobs(self):
        """Schedule pending jobs based on resource availability."""
        if not self.pending_jobs:
            return
        
        # Check how many jobs we can run
        available_slots = self.config.max_concurrent_jobs - len(self.running_jobs)
        if available_slots <= 0:
            return
        
        # Try to schedule jobs
        scheduled_count = 0
        jobs_to_remove = []
        
        for job in self.pending_jobs:
            if scheduled_count >= available_slots:
                break
            
            # Check dependencies
            if not self._check_dependencies(job):
                continue
            
            # Check resource availability
            if not self.resources.can_allocate(job.resource_requirements):
                continue
            
            # Allocate resources
            self.resources.allocate(job.resource_requirements)
            
            # Start job execution
            job.status = AIJobStatus.SCHEDULED
            job.scheduled_at = datetime.now()
            
            task = asyncio.create_task(self._execute_job(job))
            self.job_tasks[job.job_id] = task
            self.running_jobs[job.job_id] = job
            
            jobs_to_remove.append(job)
            scheduled_count += 1
            
            self.logger.info(f"Scheduled job {job.job_id} (type: {job.job_type.value})")
        
        # Remove scheduled jobs from pending
        for job in jobs_to_remove:
            self.pending_jobs.remove(job)
    
    def _check_dependencies(self, job: AIBatchJob) -> bool:
        """Check if job dependencies are satisfied."""
        if not job.dependencies:
            return True
        
        # Check if all dependencies are completed
        for dep_id in job.dependencies:
            # Check in completed jobs
            if not any(j.job_id == dep_id for j in self.completed_jobs):
                return False
        
        return True
    
    async def _execute_job(self, job: AIBatchJob):
        """
        Execute a job with timeout and error handling.
        
        Uses circuit breaker for fault isolation.
        """
        try:
            job.status = AIJobStatus.RUNNING
            job.started_at = datetime.now()
            
            # Execute with circuit breaker if enabled
            if self.circuit_breaker:
                result = await self.circuit_breaker.call(
                    lambda: self._execute_job_internal(job)
                )
            else:
                result = await self._execute_job_internal(job)
            
            # Job completed successfully
            job.status = AIJobStatus.COMPLETED
            job.completed_at = datetime.now()
            job.result = result
            
            execution_time = (job.completed_at - job.started_at).total_seconds()
            self.stats['total_jobs_completed'] += 1
            self.stats['total_execution_time'] += execution_time
            
            self.completed_jobs.append(job)
            
            self.logger.info(f"Job {job.job_id} completed in {execution_time:.1f}s")
            
        except asyncio.TimeoutError:
            job.status = AIJobStatus.FAILED
            job.error_message = "Job execution timeout"
            self.stats['total_jobs_failed'] += 1
            self.failed_jobs.append(job)
            self.logger.error(f"Job {job.job_id} timed out")
            
        except Exception as e:
            job.status = AIJobStatus.FAILED
            job.error_message = str(e)
            self.stats['total_jobs_failed'] += 1
            self.failed_jobs.append(job)
            self.logger.error(f"Job {job.job_id} failed: {e}")
            
        finally:
            # Release resources
            self.resources.release(job.resource_requirements)
            
            # Remove from running jobs
            if job.job_id in self.running_jobs:
                del self.running_jobs[job.job_id]
            
            # Remove task
            if job.job_id in self.job_tasks:
                del self.job_tasks[job.job_id]
    
    async def _execute_job_internal(self, job: AIBatchJob) -> Dict[str, Any]:
        """
        Internal job execution logic with timeout.
        
        This is where actual AI processing would happen.
        """
        # Apply timeout
        try:
            return await asyncio.wait_for(
                self._process_ai_job(job),
                timeout=job.timeout_seconds
            )
        except asyncio.TimeoutError:
            raise TimeoutError(f"Job {job.job_id} exceeded timeout of {job.timeout_seconds}s")
    
    async def _process_ai_job(self, job: AIBatchJob) -> Dict[str, Any]:
        """
        Process AI job (placeholder for actual AI processing).
        
        In real implementation, this would call the appropriate AI processor.
        """
        # Simulate processing time
        processing_time = job.resource_requirements.estimated_duration_seconds
        await asyncio.sleep(min(processing_time, 1.0))  # Cap for testing
        
        return {
            'job_id': job.job_id,
            'job_type': job.job_type.value,
            'processed_items': job.parameters.get('item_count', 1),
            'quality_score': 0.92,
            'processing_time': processing_time
        }
    
    async def _resource_monitor_loop(self):
        """
        Periodic resource monitoring (non-blocking).
        
        Uses fixed intervals instead of continuous polling.
        """
        while self.is_running:
            try:
                # Wait for next monitoring interval
                await asyncio.sleep(30.0)  # Monitor every 30 seconds
                
                # Calculate resource utilization
                gpu_util = 1.0 - (self.resources.available_gpu_count / max(self.resources.total_gpu_count, 1))
                cpu_util = 1.0 - (self.resources.available_cpu_cores / max(self.resources.total_cpu_cores, 1))
                mem_util = 1.0 - (self.resources.available_memory_mb / max(self.resources.total_memory_mb, 1))
                
                self.stats['resource_utilization'] = (gpu_util + cpu_util + mem_util) / 3.0
                
                self.logger.debug(f"Resource utilization: GPU={gpu_util:.1%}, CPU={cpu_util:.1%}, MEM={mem_util:.1%}")
                
            except asyncio.CancelledError:
                self.logger.info("Resource monitor cancelled")
                break
            except Exception as e:
                self.logger.error(f"Error in resource monitor: {e}")
                await asyncio.sleep(10.0)
    
    async def cancel_job(self, job_id: str) -> bool:
        """Cancel a job."""
        # Check if job is running
        if job_id in self.job_tasks:
            task = self.job_tasks[job_id]
            task.cancel()
            
            if job_id in self.running_jobs:
                job = self.running_jobs[job_id]
                job.status = AIJobStatus.CANCELLED
                self.stats['total_jobs_cancelled'] += 1
            
            self.logger.info(f"Cancelled job {job_id}")
            return True
        
        # Check if job is pending
        for job in self.pending_jobs:
            if job.job_id == job_id:
                job.status = AIJobStatus.CANCELLED
                self.pending_jobs.remove(job)
                self.stats['total_jobs_cancelled'] += 1
                self.logger.info(f"Cancelled pending job {job_id}")
                return True
        
        return False
    
    def get_job_status(self, job_id: str) -> Optional[AIJobStatus]:
        """Get status of a job."""
        # Check running jobs
        if job_id in self.running_jobs:
            return self.running_jobs[job_id].status
        
        # Check pending jobs
        for job in self.pending_jobs:
            if job.job_id == job_id:
                return job.status
        
        # Check completed jobs
        for job in self.completed_jobs:
            if job.job_id == job_id:
                return job.status
        
        # Check failed jobs
        for job in self.failed_jobs:
            if job.job_id == job_id:
                return job.status
        
        return None
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get batch processing statistics."""
        return {
            'stats': self.stats.copy(),
            'queue_status': {
                'pending_jobs': len(self.pending_jobs),
                'running_jobs': len(self.running_jobs),
                'completed_jobs': len(self.completed_jobs),
                'failed_jobs': len(self.failed_jobs),
                'max_queue_size': self.config.max_queue_size,
                'queue_utilization': len(self.pending_jobs) / self.config.max_queue_size
            },
            'resource_status': {
                'gpu_available': self.resources.available_gpu_count,
                'gpu_total': self.resources.total_gpu_count,
                'cpu_available': self.resources.available_cpu_cores,
                'cpu_total': self.resources.total_cpu_cores,
                'memory_available_mb': self.resources.available_memory_mb,
                'memory_total_mb': self.resources.total_memory_mb,
                'utilization': self.stats['resource_utilization']
            },
            'is_running': self.is_running,
            'circuit_breaker_state': (
                self.circuit_breaker.state.value
                if self.circuit_breaker else 'disabled'
            )
        }
    
    async def coordinate_with_real_time(self, real_time_job_id: str, priority_boost: bool = True):
        """
        Coordinate batch processing with real-time operations.
        
        Args:
            real_time_job_id: ID of real-time job
            priority_boost: Whether to boost priority of related batch jobs
        """
        if not self.config.enable_real_time_coordination:
            return
        
        self.real_time_jobs.add(real_time_job_id)
        
        if priority_boost:
            # Boost priority of related batch jobs
            for job in self.pending_jobs:
                if real_time_job_id in job.metadata.get('related_jobs', []):
                    # Boost priority
                    current_priority = job.priority.value
                    new_priority = max(1, current_priority - self.config.real_time_priority_boost)
                    job.priority = AIJobPriority(new_priority)
            
            # Re-sort queue
            self._sort_pending_jobs()
        
        self.logger.info(f"Coordinating with real-time job {real_time_job_id}")


# Factory function
def create_batch_integration(config: Optional[BatchConfig] = None) -> BatchAIIntegration:
    """Create batch AI integration with default or custom configuration."""
    if config is None:
        config = BatchConfig()
    
    return BatchAIIntegration(config)
