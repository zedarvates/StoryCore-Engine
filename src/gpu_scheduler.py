"""
GPU Scheduler - Resource allocation and job management for AI operations.

This module provides intelligent GPU job scheduling with priority queue management,
resource monitoring, and optimization for AI enhancement operations.
"""

import asyncio
import logging
import time
import uuid
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional, Any, Callable
from collections import deque
import heapq
import threading

from .circuit_breaker import CircuitBreaker, CircuitBreakerConfig


class JobPriority(Enum):
    """Priority levels for GPU jobs."""
    CRITICAL = 0    # Highest priority (e.g., real-time preview)
    HIGH = 1        # High priority (e.g., user-initiated operations)
    NORMAL = 2      # Normal priority (e.g., standard processing)
    LOW = 3         # Low priority (e.g., background optimization)
    BATCH = 4       # Lowest priority (e.g., batch processing)


class JobStatus(Enum):
    """Status of GPU jobs."""
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"


@dataclass
class GPUJobRequest:
    """Request for GPU job execution."""
    job_id: str
    job_type: str
    priority: JobPriority
    gpu_memory_required: int  # MB
    estimated_duration: float  # seconds
    timeout: float  # seconds
    callback: Callable
    parameters: Dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    
    def __lt__(self, other):
        """Compare jobs by priority for heap queue."""
        if self.priority.value != other.priority.value:
            return self.priority.value < other.priority.value
        return self.created_at < other.created_at


@dataclass
class GPUJobResult:
    """Result of GPU job execution."""
    job_id: str
    status: JobStatus
    result: Optional[Any] = None
    error_message: Optional[str] = None
    execution_time: float = 0.0
    gpu_memory_used: int = 0
    started_at: Optional[float] = None
    completed_at: Optional[float] = None


@dataclass
class GPUDevice:
    """GPU device information and status."""
    device_id: int
    device_name: str
    total_memory: int  # MB
    available_memory: int  # MB
    utilization_percent: float
    temperature: float
    is_available: bool = True
    current_job: Optional[str] = None


class GPUScheduler:
    """
    Manages GPU resource allocation and job scheduling.
    
    Provides priority-based job scheduling, resource monitoring,
    and intelligent GPU device selection for AI operations.
    """
    
    def __init__(self, circuit_breaker: Optional[CircuitBreaker] = None):
        """Initialize GPU Scheduler."""
        self.logger = logging.getLogger(__name__)
        
        # Circuit breaker for fault tolerance
        if circuit_breaker is None:
            cb_config = CircuitBreakerConfig(
                failure_threshold=5,
                timeout=60.0,
                recovery_timeout=30.0
            )
            self.circuit_breaker = CircuitBreaker("gpu_scheduler", cb_config)
        else:
            self.circuit_breaker = circuit_breaker
        
        # Job queues (priority-based)
        self.job_queue: List[GPUJobRequest] = []  # Min heap by priority
        self.queue_lock = threading.Lock()
        
        # Active and completed jobs
        self.active_jobs: Dict[str, GPUJobRequest] = {}
        self.completed_jobs: Dict[str, GPUJobResult] = {}
        self.job_history: deque = deque(maxlen=1000)  # Keep last 1000 jobs
        
        # GPU devices
        self.gpu_devices: Dict[int, GPUDevice] = {}
        self._initialize_gpu_devices()
        
        # Scheduler state
        self.is_running = False
        self.scheduler_task: Optional[asyncio.Task] = None
        
        # Performance tracking
        self.stats = {
            "total_jobs_submitted": 0,
            "total_jobs_completed": 0,
            "total_jobs_failed": 0,
            "total_jobs_cancelled": 0,
            "total_jobs_timeout": 0,
            "total_execution_time": 0.0,
            "average_queue_time": 0.0,
            "average_execution_time": 0.0
        }
        
        self.logger.info("GPU Scheduler initialized")
    
    def _initialize_gpu_devices(self):
        """Initialize GPU device information."""
        # Simulate GPU device detection
        # In real implementation, would query actual GPU devices
        self.gpu_devices[0] = GPUDevice(
            device_id=0,
            device_name="Simulated GPU 0",
            total_memory=8192,  # 8GB
            available_memory=8192,
            utilization_percent=0.0,
            temperature=45.0,
            is_available=True
        )
        
        self.logger.info(f"Initialized {len(self.gpu_devices)} GPU device(s)")
    
    async def start(self):
        """Start the GPU scheduler."""
        if self.is_running:
            self.logger.warning("GPU Scheduler already running")
            return
        
        self.is_running = True
        self.scheduler_task = asyncio.create_task(self._scheduler_loop())
        self.logger.info("GPU Scheduler started")
    
    async def stop(self):
        """Stop the GPU scheduler."""
        if not self.is_running:
            return
        
        self.is_running = False
        
        if self.scheduler_task:
            self.scheduler_task.cancel()
            try:
                await self.scheduler_task
            except asyncio.CancelledError:
                pass
        
        # Cancel all pending jobs
        with self.queue_lock:
            while self.job_queue:
                job = heapq.heappop(self.job_queue)
                self._record_job_result(GPUJobResult(
                    job_id=job.job_id,
                    status=JobStatus.CANCELLED,
                    error_message="Scheduler stopped"
                ))
        
        self.logger.info("GPU Scheduler stopped")
    
    async def submit_job(self, job_request: GPUJobRequest) -> str:
        """
        Submit a job to the GPU scheduler.
        
        Args:
            job_request: GPU job request with priority and resource requirements
            
        Returns:
            Job ID for tracking
        """
        if not job_request.job_id:
            job_request.job_id = str(uuid.uuid4())
        
        with self.queue_lock:
            heapq.heappush(self.job_queue, job_request)
            self.stats["total_jobs_submitted"] += 1
        
        self.logger.debug(f"Job {job_request.job_id} submitted with priority {job_request.priority.name}")
        return job_request.job_id
    
    async def cancel_job(self, job_id: str) -> bool:
        """
        Cancel a pending or running job.
        
        Args:
            job_id: ID of job to cancel
            
        Returns:
            True if job was cancelled, False if not found or already completed
        """
        # Check if job is in queue
        with self.queue_lock:
            for i, job in enumerate(self.job_queue):
                if job.job_id == job_id:
                    # Remove from queue
                    self.job_queue.pop(i)
                    heapq.heapify(self.job_queue)
                    
                    self._record_job_result(GPUJobResult(
                        job_id=job_id,
                        status=JobStatus.CANCELLED,
                        error_message="Job cancelled by user"
                    ))
                    
                    self.logger.info(f"Job {job_id} cancelled from queue")
                    return True
        
        # Check if job is active
        if job_id in self.active_jobs:
            # Mark for cancellation (actual cancellation handled by executor)
            self.logger.info(f"Job {job_id} marked for cancellation")
            return True
        
        return False
    
    def get_job_status(self, job_id: str) -> Optional[JobStatus]:
        """Get current status of a job."""
        if job_id in self.active_jobs:
            return JobStatus.RUNNING
        
        if job_id in self.completed_jobs:
            return self.completed_jobs[job_id].status
        
        with self.queue_lock:
            for job in self.job_queue:
                if job.job_id == job_id:
                    return JobStatus.QUEUED
        
        return None
    
    def get_job_result(self, job_id: str) -> Optional[GPUJobResult]:
        """Get result of a completed job."""
        return self.completed_jobs.get(job_id)
    
    def get_queue_status(self) -> Dict[str, Any]:
        """Get current queue status and statistics."""
        with self.queue_lock:
            queue_by_priority = {}
            for priority in JobPriority:
                queue_by_priority[priority.name] = sum(
                    1 for job in self.job_queue if job.priority == priority
                )
        
        return {
            "queue_depth": len(self.job_queue),
            "active_jobs": len(self.active_jobs),
            "completed_jobs": len(self.completed_jobs),
            "queue_by_priority": queue_by_priority,
            "is_running": self.is_running,
            "statistics": self.stats.copy()
        }
    
    def get_gpu_status(self) -> Dict[int, Dict[str, Any]]:
        """Get status of all GPU devices."""
        return {
            device_id: {
                "device_name": device.device_name,
                "total_memory": device.total_memory,
                "available_memory": device.available_memory,
                "utilization_percent": device.utilization_percent,
                "temperature": device.temperature,
                "is_available": device.is_available,
                "current_job": device.current_job
            }
            for device_id, device in self.gpu_devices.items()
        }
    
    async def _scheduler_loop(self):
        """Main scheduler loop for processing jobs."""
        self.logger.info("Scheduler loop started")
        
        while self.is_running:
            try:
                # Check if there are jobs to process
                if not self.job_queue:
                    await asyncio.sleep(0.1)
                    continue
                
                # Get highest priority job
                with self.queue_lock:
                    if not self.job_queue:
                        continue
                    job = heapq.heappop(self.job_queue)
                
                # Find available GPU device
                device = self._select_optimal_device(job)
                
                if device is None:
                    # No suitable device available, requeue job
                    with self.queue_lock:
                        heapq.heappush(self.job_queue, job)
                    await asyncio.sleep(0.5)
                    continue
                
                # Execute job
                await self._execute_job(job, device)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error in scheduler loop: {e}")
                await asyncio.sleep(1.0)
        
        self.logger.info("Scheduler loop stopped")
    
    def _select_optimal_device(self, job: GPUJobRequest) -> Optional[GPUDevice]:
        """
        Select optimal GPU device for job execution.
        
        Args:
            job: Job request with resource requirements
         
        Returns:
            Selected GPU device or None if no suitable device available
        """
        best_device = None
        best_score = -1
        
        # Log available devices for debugging
        self.logger.debug(f"Available GPU devices: {len(self.gpu_devices)}")
        
        for device in self.gpu_devices.values():
            if not device.is_available or device.current_job is not None:
                continue
            
            # Check if device has enough memory
            if device.available_memory < job.gpu_memory_required:
                self.logger.debug(f"Device {device.device_id} has insufficient memory. Required: {job.gpu_memory_required}MB, Available: {device.available_memory}MB")
                continue
            
            # Calculate device score (higher is better)
            # Factors: available memory, utilization, temperature, and job priority
            memory_score = device.available_memory / device.total_memory
            utilization_score = 1.0 - (device.utilization_percent / 100.0)
            temperature_score = max(0, 1.0 - (device.temperature - 50) / 50)
            
            # Add job priority factor - higher priority jobs get better devices
            priority_factor = 1.0 + (1.0 - job.priority.value / len(JobPriority))
            
            score = (memory_score * 0.4 + utilization_score * 0.3 + temperature_score * 0.2 + priority_factor * 0.1)
            
            if score > best_score:
                best_score = score
                best_device = device
        
        if best_device is None:
            self.logger.warning(f"No suitable GPU device found for job {job.job_id}. Required memory: {job.gpu_memory_required}MB")
        
        return best_device
    
    async def _execute_job(self, job: GPUJobRequest, device: GPUDevice):
        """
        Execute a job on the specified GPU device.
        
        Args:
            job: Job to execute
            device: GPU device to use
        """
        job_id = job.job_id
        start_time = time.time()
        
        # Mark device as busy
        device.current_job = job_id
        device.available_memory -= job.gpu_memory_required
        self.active_jobs[job_id] = job
        
        self.logger.info(f"Executing job {job_id} on device {device.device_id}")
        
        try:
            # Execute with circuit breaker protection
            async def execute_with_timeout():
                return await asyncio.wait_for(
                    job.callback(**job.parameters),
                    timeout=job.timeout
                )
            
            result = await self.circuit_breaker.call(execute_with_timeout)
            
            execution_time = time.time() - start_time
            
            # Record successful completion
            job_result = GPUJobResult(
                job_id=job_id,
                status=JobStatus.COMPLETED,
                result=result,
                execution_time=execution_time,
                gpu_memory_used=job.gpu_memory_required,
                started_at=start_time,
                completed_at=time.time()
            )
            
            self._record_job_result(job_result)
            self.logger.info(f"Job {job_id} completed in {execution_time:.2f}s")
            
        except asyncio.TimeoutError:
            execution_time = time.time() - start_time
            job_result = GPUJobResult(
                job_id=job_id,
                status=JobStatus.TIMEOUT,
                error_message=f"Job exceeded timeout of {job.timeout}s",
                execution_time=execution_time,
                started_at=start_time,
                completed_at=time.time()
            )
            self._record_job_result(job_result)
            self.logger.warning(f"Job {job_id} timed out after {execution_time:.2f}s")
            
        except Exception as e:
            execution_time = time.time() - start_time
            job_result = GPUJobResult(
                job_id=job_id,
                status=JobStatus.FAILED,
                error_message=str(e),
                execution_time=execution_time,
                started_at=start_time,
                completed_at=time.time()
            )
            self._record_job_result(job_result)
            self.logger.error(f"Job {job_id} failed: {e}")
            
        finally:
            # Release device resources
            device.current_job = None
            device.available_memory += job.gpu_memory_required
            
            # Update device utilization (simulate)
            device.utilization_percent = max(0, device.utilization_percent - 10)
            
            # Remove from active jobs
            self.active_jobs.pop(job_id, None)
    
    def _record_job_result(self, result: GPUJobResult):
        """Record job result and update statistics."""
        self.completed_jobs[result.job_id] = result
        self.job_history.append(result)
        
        # Update statistics
        if result.status == JobStatus.COMPLETED:
            self.stats["total_jobs_completed"] += 1
            self.stats["total_execution_time"] += result.execution_time
        elif result.status == JobStatus.FAILED:
            self.stats["total_jobs_failed"] += 1
        elif result.status == JobStatus.CANCELLED:
            self.stats["total_jobs_cancelled"] += 1
        elif result.status == JobStatus.TIMEOUT:
            self.stats["total_jobs_timeout"] += 1
        
        # Update averages
        total_completed = self.stats["total_jobs_completed"]
        if total_completed > 0:
            self.stats["average_execution_time"] = (
                self.stats["total_execution_time"] / total_completed
            )
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics."""
        queue_status = self.get_queue_status()
        gpu_status = self.get_gpu_status()
        
        # Calculate success rate
        total_finished = (
            self.stats["total_jobs_completed"] +
            self.stats["total_jobs_failed"] +
            self.stats["total_jobs_timeout"]
        )
        success_rate = (
            self.stats["total_jobs_completed"] / max(1, total_finished)
        )
        
        # Calculate average queue depth over recent history
        recent_jobs = list(self.job_history)[-100:]  # Last 100 jobs
        avg_queue_depth = len(self.job_queue)  # Current queue depth
        
        return {
            "timestamp": time.time(),
            "queue_metrics": queue_status,
            "gpu_metrics": gpu_status,
            "performance_metrics": {
                "success_rate": success_rate,
                "average_execution_time": self.stats["average_execution_time"],
                "total_jobs_processed": total_finished,
                "jobs_per_minute": self._calculate_throughput(),
                "average_queue_depth": avg_queue_depth
            },
            "statistics": self.stats.copy()
        }
    
    def _calculate_throughput(self) -> float:
        """Calculate jobs processed per minute."""
        if not self.job_history:
            return 0.0
        
        recent_jobs = list(self.job_history)[-100:]
        if len(recent_jobs) < 2:
            return 0.0
        
        time_span = recent_jobs[-1].completed_at - recent_jobs[0].started_at
        if time_span <= 0:
            return 0.0
        
        return (len(recent_jobs) / time_span) * 60  # Jobs per minute
    
    def optimize_scheduling(self) -> Dict[str, Any]:
        """
        Analyze scheduling performance and provide optimization recommendations.
        
        Returns:
            Optimization report with recommendations
        """
        recommendations = []
        metrics = self.get_performance_metrics()
        
        # Analyze queue depth
        queue_depth = metrics["queue_metrics"]["queue_depth"]
        if queue_depth > 10:
            recommendations.append("High queue depth detected. Consider adding more GPU resources.")
        
        # Analyze success rate
        success_rate = metrics["performance_metrics"]["success_rate"]
        if success_rate < 0.9:
            recommendations.append("Low success rate. Review job timeout settings and error handling.")
        
        # Analyze GPU utilization
        for device_id, device_status in metrics["gpu_metrics"].items():
            utilization = device_status["utilization_percent"]
            if utilization < 30:
                recommendations.append(f"GPU {device_id} underutilized. Consider consolidating workloads.")
            elif utilization > 90:
                recommendations.append(f"GPU {device_id} overutilized. Consider load balancing.")
        
        # Analyze execution times
        avg_exec_time = metrics["performance_metrics"]["average_execution_time"]
        if avg_exec_time > 5.0:
            recommendations.append("High average execution time. Consider optimizing job implementations.")
        
        return {
            "current_metrics": metrics,
            "recommendations": recommendations,
            "optimization_score": self._calculate_optimization_score(metrics)
        }
    
    def _calculate_optimization_score(self, metrics: Dict[str, Any]) -> float:
        """Calculate overall scheduling optimization score (0-1, higher is better)."""
        # Success rate component
        success_score = metrics["performance_metrics"]["success_rate"]
        
        # Queue depth component (optimal: 2-5 jobs)
        queue_depth = metrics["queue_metrics"]["queue_depth"]
        if queue_depth <= 1:
            queue_score = 0.7  # Too low, underutilized
        elif queue_depth <= 5:
            queue_score = 1.0  # Optimal
        elif queue_depth <= 10:
            queue_score = 0.8  # Acceptable
        else:
            queue_score = max(0, 1.0 - (queue_depth - 10) * 0.05)  # Too high
        
        # GPU utilization component (optimal: 60-80%)
        gpu_scores = []
        for device_status in metrics["gpu_metrics"].values():
            util = device_status["utilization_percent"]
            if util < 40:
                gpu_scores.append(util / 40)  # Underutilized
            elif util <= 80:
                gpu_scores.append(1.0)  # Optimal
            else:
                gpu_scores.append(max(0, (100 - util) / 20))  # Overutilized
        
        gpu_score = sum(gpu_scores) / max(1, len(gpu_scores))
        
        # Weighted average
        return (success_score * 0.4 + queue_score * 0.3 + gpu_score * 0.3)
