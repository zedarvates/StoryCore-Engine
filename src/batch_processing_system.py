#!/usr/bin/env python3
"""
Intelligent Batch Processing System
Provides advanced batch processing with queue management, priority scheduling, and resource optimization.
"""

import sys
import time
import json
import logging
import sqlite3
import threading
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Callable, Union
from dataclasses import dataclass, asdict, field
from enum import Enum
import uuid
import queue
from concurrent.futures import ThreadPoolExecutor, Future
import heapq

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent))

try:
    from circuit_breaker import CircuitBreaker, CircuitBreakerConfig
    from analytics_dashboard import AnalyticsDashboard, PerformanceMetrics
except ImportError:
    # Fallback for testing
    class CircuitBreaker:
        def __init__(self, *args, **kwargs):
            pass
        def __call__(self, func):
            return func
        def get_stats(self):
            return {"state": "closed", "failure_count": 0}
    
    class AnalyticsDashboard:
        def __init__(self, *args, **kwargs):
            pass
        def record_performance_metrics(self, *args, **kwargs):
            pass

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


class JobPriority(Enum):
    """Job priority levels."""
    URGENT = 1
    HIGH = 2
    NORMAL = 3
    LOW = 4
    BACKGROUND = 5


class JobStatus(Enum):
    """Job execution status."""
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    RETRYING = "retrying"


class SchedulingAlgorithm(Enum):
    """Scheduling algorithms for job processing."""
    FIFO = "fifo"                    # First In, First Out
    PRIORITY = "priority"            # Priority-based scheduling
    SHORTEST_JOB_FIRST = "sjf"      # Shortest Job First
    FAIR_SHARE = "fair_share"       # Fair share scheduling


@dataclass
class JobDefinition:
    """Definition of a batch job."""
    job_id: str
    job_type: str
    priority: JobPriority
    parameters: Dict[str, Any]
    estimated_duration: float = 60.0  # seconds
    max_retries: int = 3
    timeout: float = 300.0  # seconds
    dependencies: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class JobResult:
    """Result of job execution."""
    job_id: str
    status: JobStatus
    result_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    execution_time: float = 0.0
    retry_count: int = 0
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    worker_id: Optional[str] = None


@dataclass
class WorkerStats:
    """Statistics for a worker."""
    worker_id: str
    jobs_processed: int = 0
    jobs_successful: int = 0
    jobs_failed: int = 0
    total_processing_time: float = 0.0
    average_processing_time: float = 0.0
    last_job_at: Optional[datetime] = None
    is_active: bool = True


class JobQueue:
    """Priority-based job queue with multiple scheduling algorithms."""
    
    def __init__(self, algorithm: SchedulingAlgorithm = SchedulingAlgorithm.PRIORITY):
        """Initialize job queue."""
        self.algorithm = algorithm
        self.jobs = []
        self.lock = threading.Lock()
        
        # For different scheduling algorithms
        self._fifo_queue = queue.Queue()
        self._priority_heap = []
        self._job_lookup = {}
    
    def add_job(self, job: JobDefinition):
        """Add job to queue."""
        with self.lock:
            self._job_lookup[job.job_id] = job
            self.jobs.append(job)  # Maintain the jobs list for compatibility with tests
            
            if self.algorithm == SchedulingAlgorithm.FIFO:
                self._fifo_queue.put(job)
            elif self.algorithm == SchedulingAlgorithm.PRIORITY:
                # Use negative priority for min-heap (lower number = higher priority)
                heapq.heappush(self._priority_heap, (job.priority.value, time.time(), job))
            elif self.algorithm == SchedulingAlgorithm.SHORTEST_JOB_FIRST:
                heapq.heappush(self._priority_heap, (job.estimated_duration, time.time(), job))
            else:  # FAIR_SHARE
                # Simple fair share: use priority with some randomization
                import random
                fair_priority = job.priority.value + random.uniform(-0.5, 0.5)
                heapq.heappush(self._priority_heap, (fair_priority, time.time(), job))
    
    def get_next_job(self) -> Optional[JobDefinition]:
        """Get next job from queue."""
        with self.lock:
            try:
                if self.algorithm == SchedulingAlgorithm.FIFO:
                    job = self._fifo_queue.get_nowait()
                    if job in self.jobs:
                        self.jobs.remove(job)
                    return job
                else:
                    if self._priority_heap:
                        _, _, job = heapq.heappop(self._priority_heap)
                        if job in self.jobs:
                            self.jobs.remove(job)
                        return job
                    return None
            except queue.Empty:
                return None
    
    def remove_job(self, job_id: str) -> bool:
        """Remove job from queue."""
        with self.lock:
            if job_id in self._job_lookup:
                del self._job_lookup[job_id]
                return True
            return False
    
    def get_queue_size(self) -> int:
        """Get current queue size."""
        with self.lock:
            if self.algorithm == SchedulingAlgorithm.FIFO:
                return self._fifo_queue.qsize()
            else:
                return len(self._priority_heap)
    
    def get_jobs_by_priority(self) -> Dict[JobPriority, int]:
        """Get job count by priority."""
        with self.lock:
            priority_counts = {priority: 0 for priority in JobPriority}
            for job in self._job_lookup.values():
                priority_counts[job.priority] += 1
            return priority_counts


class BatchWorker:
    """Individual worker for processing batch jobs."""
    
    def __init__(self, worker_id: str, job_processors: Dict[str, Callable]):
        """Initialize batch worker."""
        self.worker_id = worker_id
        self.job_processors = job_processors
        self.stats = WorkerStats(worker_id)
        self.is_running = False
        self.current_job = None
        self.circuit_breaker = CircuitBreaker(
            CircuitBreakerConfig(
                failure_threshold=3,
                recovery_timeout=60.0,
                timeout=300.0,
                max_concurrent=1
            )
        )
    
    def process_job(self, job: JobDefinition) -> JobResult:
        """Process a single job."""
        start_time = time.time()
        self.current_job = job
        self.stats.last_job_at = datetime.now()
        
        result = JobResult(
            job_id=job.job_id,
            status=JobStatus.RUNNING,
            started_at=datetime.now(),
            worker_id=self.worker_id
        )
        
        try:
            # Check if we have a processor for this job type
            if job.job_type not in self.job_processors:
                raise ValueError(f"No processor found for job type: {job.job_type}")
            
            processor = self.job_processors[job.job_type]
            
            # Execute job with circuit breaker protection
            @self.circuit_breaker
            def execute_job():
                return processor(job.parameters)
            
            # Process the job
            result.result_data = execute_job()
            result.status = JobStatus.COMPLETED
            
            # Update stats
            self.stats.jobs_processed += 1
            self.stats.jobs_successful += 1
            
        except Exception as e:
            logger.error(f"Job {job.job_id} failed: {e}")
            result.status = JobStatus.FAILED
            result.error_message = str(e)
            
            # Update stats
            self.stats.jobs_processed += 1
            self.stats.jobs_failed += 1
        
        finally:
            # Calculate execution time
            execution_time = time.time() - start_time
            result.execution_time = execution_time
            result.completed_at = datetime.now()
            
            # Update worker stats
            self.stats.total_processing_time += execution_time
            if self.stats.jobs_processed > 0:
                self.stats.average_processing_time = (
                    self.stats.total_processing_time / self.stats.jobs_processed
                )
            
            self.current_job = None
        
        return result


class BatchProcessingSystem:
    """
    Intelligent Batch Processing System
    
    Provides advanced batch processing with queue management, priority scheduling,
    resource optimization, and fault tolerance.
    """
    
    def __init__(self, 
                 max_workers: int = 4,
                 scheduling_algorithm: SchedulingAlgorithm = SchedulingAlgorithm.PRIORITY,
                 analytics_db_path: str = "batch_analytics.db"):
        """Initialize batch processing system."""
        self.max_workers = max_workers
        self.scheduling_algorithm = scheduling_algorithm
        
        # Core components
        self.job_queue = JobQueue(scheduling_algorithm)
        self.workers = {}
        self.job_processors = {}
        self.job_results = {}
        
        # Threading and execution
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.running_jobs = {}
        self.is_running = False
        
        # Database for job persistence
        self.db_path = "batch_jobs.db"
        self._init_database()
        
        # Analytics integration
        try:
            self.analytics = AnalyticsDashboard(analytics_db_path)
        except Exception as e:
            logger.warning(f"Analytics integration failed: {e}")
            self.analytics = None
        
        # Circuit breaker for system operations
        self.circuit_breaker = CircuitBreaker(
            CircuitBreakerConfig(
                failure_threshold=5,
                recovery_timeout=30.0,
                timeout=60.0,
                max_concurrent=max_workers
            )
        )
        
        # Resource monitoring
        self.resource_monitor = ResourceMonitor()
        
        logger.info(f"Batch Processing System initialized - Max Workers: {max_workers}, Algorithm: {scheduling_algorithm.value}")
    
    def _init_database(self):
        """Initialize SQLite database for job persistence."""
        self.connection = sqlite3.connect(self.db_path, check_same_thread=False)
        self.connection.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                job_id TEXT PRIMARY KEY,
                job_type TEXT NOT NULL,
                priority INTEGER NOT NULL,
                status TEXT NOT NULL,
                parameters TEXT,
                result_data TEXT,
                error_message TEXT,
                execution_time REAL,
                retry_count INTEGER DEFAULT 0,
                created_at TEXT,
                started_at TEXT,
                completed_at TEXT,
                worker_id TEXT
            )
        """)
        
        self.connection.execute("""
            CREATE TABLE IF NOT EXISTS worker_stats (
                worker_id TEXT PRIMARY KEY,
                jobs_processed INTEGER DEFAULT 0,
                jobs_successful INTEGER DEFAULT 0,
                jobs_failed INTEGER DEFAULT 0,
                total_processing_time REAL DEFAULT 0.0,
                last_job_at TEXT,
                is_active BOOLEAN DEFAULT 1
            )
        """)
        
        self.connection.commit()
    
    def register_job_processor(self, job_type: str, processor: Callable):
        """Register a job processor function."""
        self.job_processors[job_type] = processor
        logger.info(f"Registered processor for job type: {job_type}")
    
    def submit_job(self, job: JobDefinition) -> str:
        """Submit a job for processing."""
        # Store job in database
        self._store_job(job)
        
        # Add to queue
        self.job_queue.add_job(job)
        
        # Record analytics
        if self.analytics:
            try:
                self._record_queue_metrics()
            except Exception as e:
                logger.warning(f"Failed to record analytics: {e}")
        
        logger.info(f"Job {job.job_id} submitted with priority {job.priority.name}")
        return job.job_id
    
    def _store_job(self, job: JobDefinition):
        """Store job in database."""
        self.connection.execute("""
            INSERT OR REPLACE INTO jobs 
            (job_id, job_type, priority, status, parameters, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            job.job_id,
            job.job_type,
            job.priority.value,
            JobStatus.PENDING.value,
            json.dumps(job.parameters),
            job.created_at.isoformat()
        ))
        self.connection.commit()
    
    def _update_job_result(self, result: JobResult):
        """Update job result in database."""
        self.connection.execute("""
            UPDATE jobs SET 
                status = ?, result_data = ?, error_message = ?, 
                execution_time = ?, retry_count = ?, 
                started_at = ?, completed_at = ?, worker_id = ?
            WHERE job_id = ?
        """, (
            result.status.value,
            json.dumps(result.result_data) if result.result_data else None,
            result.error_message,
            result.execution_time,
            result.retry_count,
            result.started_at.isoformat() if result.started_at else None,
            result.completed_at.isoformat() if result.completed_at else None,
            result.worker_id,
            result.job_id
        ))
        self.connection.commit()
    
    def start_processing(self):
        """Start the batch processing system."""
        if self.is_running:
            logger.warning("Batch processing system is already running")
            return
        
        self.is_running = True
        
        # Create workers
        for i in range(self.max_workers):
            worker_id = f"worker_{i+1}"
            worker = BatchWorker(worker_id, self.job_processors)
            self.workers[worker_id] = worker
        
        # Start processing loop
        self.executor.submit(self._processing_loop)
        
        logger.info(f"Batch processing system started with {self.max_workers} workers")
    
    def stop_processing(self):
        """Stop the batch processing system."""
        self.is_running = False
        
        # Wait for running jobs to complete
        for future in list(self.running_jobs.values()):
            try:
                future.result(timeout=30)  # Wait up to 30 seconds
            except Exception as e:
                logger.warning(f"Job did not complete cleanly: {e}")
        
        # Shutdown executor
        self.executor.shutdown(wait=True)
        
        logger.info("Batch processing system stopped")
    
    def _processing_loop(self):
        """Main processing loop."""
        while self.is_running:
            try:
                # Check for available workers
                available_workers = [
                    worker for worker in self.workers.values()
                    if worker.worker_id not in self.running_jobs
                ]
                
                if not available_workers:
                    time.sleep(0.1)
                    continue
                
                # Get next job
                job = self.job_queue.get_next_job()
                if not job:
                    time.sleep(0.1)
                    continue
                
                # Assign job to worker
                worker = available_workers[0]
                future = self.executor.submit(self._execute_job, worker, job)
                self.running_jobs[worker.worker_id] = future
                
                # Clean up completed jobs
                self._cleanup_completed_jobs()
                
                # Record metrics
                if self.analytics:
                    self._record_processing_metrics()
                
            except Exception as e:
                logger.error(f"Error in processing loop: {e}")
                time.sleep(1)
    
    def _execute_job(self, worker: BatchWorker, job: JobDefinition) -> JobResult:
        """Execute a job with a worker."""
        try:
            # Process the job
            result = worker.process_job(job)
            
            # Store result
            self.job_results[job.job_id] = result
            self._update_job_result(result)
            
            # Handle retries for failed jobs
            if result.status == JobStatus.FAILED and result.retry_count < job.max_retries:
                logger.info(f"Retrying job {job.job_id} (attempt {result.retry_count + 1}/{job.max_retries})")
                result.retry_count += 1
                result.status = JobStatus.RETRYING
                
                # Re-queue the job with delay
                time.sleep(min(2 ** result.retry_count, 60))  # Exponential backoff
                self.job_queue.add_job(job)
            elif result.status == JobStatus.FAILED and result.retry_count >= job.max_retries:
                logger.warning(f"Job {job.job_id} failed after {job.max_retries} retries. Marking as failed.")
                result.status = JobStatus.FAILED
                self._update_job_result(result)
            
            return result
            
        except Exception as e:
            logger.error(f"Error executing job {job.job_id}: {e}")
            result = JobResult(
                job_id=job.job_id,
                status=JobStatus.FAILED,
                error_message=str(e),
                worker_id=worker.worker_id
            )
            self.job_results[job.job_id] = result
            self._update_job_result(result)
            return result
        
        finally:
            # Remove from running jobs
            if worker.worker_id in self.running_jobs:
                del self.running_jobs[worker.worker_id]
    
    def _cleanup_completed_jobs(self):
        """Clean up completed job futures."""
        completed_workers = []
        for worker_id, future in self.running_jobs.items():
            if future.done():
                completed_workers.append(worker_id)
        
        for worker_id in completed_workers:
            del self.running_jobs[worker_id]
    
    def _record_queue_metrics(self):
        """Record queue metrics to analytics."""
        if not self.analytics:
            return
        
        queue_size = self.job_queue.get_queue_size()
        active_workers = len(self.running_jobs)
        
        metrics = PerformanceMetrics(
            fps=0.0,  # Not applicable for batch processing
            throughput=self._calculate_throughput(),
            latency_ms=self._calculate_average_latency(),
            processing_time_ms=self._calculate_average_processing_time(),
            queue_depth=queue_size,
            active_workers=active_workers
        )
        
        self.analytics.record_performance_metrics(metrics)
    
    def _record_processing_metrics(self):
        """Record processing metrics to analytics."""
        if not self.analytics:
            return
        
        # Calculate system metrics
        total_jobs = sum(worker.stats.jobs_processed for worker in self.workers.values())
        successful_jobs = sum(worker.stats.jobs_successful for worker in self.workers.values())
        
        success_rate = (successful_jobs / total_jobs * 100) if total_jobs > 0 else 100.0
        
        # Record system health
        from analytics_dashboard import SystemHealthMetrics
        health_metrics = SystemHealthMetrics(
            uptime_hours=self._get_uptime_hours(),
            error_rate_percent=100.0 - success_rate,
            circuit_breaker_trips=0,  # TODO: Get from circuit breaker
            dependency_status={
                "database": True,
                "workers": len(self.workers) > 0,
                "queue": self.job_queue.get_queue_size() >= 0
            }
        )
        
        self.analytics.record_system_health(health_metrics)
    
    def _calculate_throughput(self) -> float:
        """Calculate jobs per second throughput."""
        total_jobs = sum(worker.stats.jobs_processed for worker in self.workers.values())
        uptime = self._get_uptime_hours() * 3600  # Convert to seconds
        return total_jobs / uptime if uptime > 0 else 0.0
    
    def _calculate_average_latency(self) -> float:
        """Calculate average job latency in milliseconds."""
        total_time = sum(worker.stats.total_processing_time for worker in self.workers.values())
        total_jobs = sum(worker.stats.jobs_processed for worker in self.workers.values())
        return (total_time / total_jobs * 1000) if total_jobs > 0 else 0.0
    
    def _calculate_average_processing_time(self) -> float:
        """Calculate average processing time in milliseconds."""
        return self._calculate_average_latency()  # Same calculation
    
    def _get_uptime_hours(self) -> float:
        """Get system uptime in hours."""
        # Simple implementation - in production, track actual start time
        return 1.0
    
    def get_job_status(self, job_id: str) -> Optional[JobResult]:
        """Get status of a specific job."""
        if job_id in self.job_results:
            return self.job_results[job_id]
        
        # Check database
        cursor = self.connection.execute(
            "SELECT * FROM jobs WHERE job_id = ?", (job_id,)
        )
        row = cursor.fetchone()
        
        if row:
            return JobResult(
                job_id=row[0],
                status=JobStatus(row[3]),
                result_data=json.loads(row[5]) if row[5] else None,
                error_message=row[6],
                execution_time=row[7] or 0.0,
                retry_count=row[8] or 0,
                started_at=datetime.fromisoformat(row[10]) if row[10] else None,
                completed_at=datetime.fromisoformat(row[11]) if row[11] else None,
                worker_id=row[12]
            )
        
        return None
    
    def get_system_stats(self) -> Dict[str, Any]:
        """Get comprehensive system statistics."""
        queue_size = self.job_queue.get_queue_size()
        priority_counts = self.job_queue.get_jobs_by_priority()
        
        worker_stats = {}
        for worker_id, worker in self.workers.items():
            worker_stats[worker_id] = {
                "jobs_processed": worker.stats.jobs_processed,
                "jobs_successful": worker.stats.jobs_successful,
                "jobs_failed": worker.stats.jobs_failed,
                "average_processing_time": worker.stats.average_processing_time,
                "is_active": worker.stats.is_active,
                "current_job": worker.current_job.job_id if worker.current_job else None
            }
        
        return {
            "queue_size": queue_size,
            "priority_distribution": {p.name: count for p, count in priority_counts.items()},
            "active_workers": len(self.running_jobs),
            "total_workers": len(self.workers),
            "worker_stats": worker_stats,
            "throughput": self._calculate_throughput(),
            "average_latency_ms": self._calculate_average_latency(),
            "circuit_breaker_stats": self.circuit_breaker.get_stats(),
            "is_running": self.is_running
        }


class ResourceMonitor:
    """Monitor system resources for batch processing optimization."""
    
    def __init__(self):
        """Initialize resource monitor."""
        self.cpu_usage = 0.0
        self.memory_usage = 0.0
        self.disk_usage = 0.0
    
    def get_resource_usage(self) -> Dict[str, float]:
        """Get current resource usage."""
        # Simple mock implementation - in production, use psutil
        import random
        return {
            "cpu_percent": random.uniform(20, 80),
            "memory_percent": random.uniform(30, 70),
            "disk_io_mbps": random.uniform(10, 100)
        }
    
    def should_scale_workers(self, current_workers: int, max_workers: int) -> int:
        """Determine if workers should be scaled up or down."""
        resources = self.get_resource_usage()
        
        # Simple scaling logic
        if resources["cpu_percent"] < 50 and current_workers < max_workers:
            return current_workers + 1
        elif resources["cpu_percent"] > 80 and current_workers > 1:
            return current_workers - 1
        
        return current_workers


# Example job processors
def video_processing_job(parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Example video processing job."""
    input_file = parameters.get("input_file", "")
    output_file = parameters.get("output_file", "")
    
    # Simulate video processing
    processing_time = parameters.get("duration", 5.0)
    time.sleep(processing_time)
    
    return {
        "input_file": input_file,
        "output_file": output_file,
        "frames_processed": int(processing_time * 24),  # 24 FPS
        "processing_time": processing_time,
        "success": True
    }


def image_enhancement_job(parameters: Dict[str, Any]) -> Dict[str, Any]:
    """Example image enhancement job."""
    images = parameters.get("images", [])
    enhancement_type = parameters.get("enhancement_type", "upscale")
    
    # Simulate image processing
    processing_time = len(images) * 0.5
    time.sleep(processing_time)
    
    return {
        "images_processed": len(images),
        "enhancement_type": enhancement_type,
        "processing_time": processing_time,
        "success": True
    }


def main():
    """Main function for testing batch processing system."""
    print("🚀 Batch Processing System Implementation - Phase 2")
    print("=" * 60)
    
    # Initialize batch processing system
    batch_system = BatchProcessingSystem(
        max_workers=3,
        scheduling_algorithm=SchedulingAlgorithm.PRIORITY
    )
    
    # Register job processors
    batch_system.register_job_processor("video_processing", video_processing_job)
    batch_system.register_job_processor("image_enhancement", image_enhancement_job)
    
    # Start processing
    batch_system.start_processing()
    
    print("📋 Submitting test jobs...")
    
    # Submit test jobs
    jobs = []
    
    # High priority video job
    video_job = JobDefinition(
        job_id=str(uuid.uuid4()),
        job_type="video_processing",
        priority=JobPriority.HIGH,
        parameters={
            "input_file": "test_video.mp4",
            "output_file": "processed_video.mp4",
            "duration": 3.0
        },
        estimated_duration=3.0
    )
    jobs.append(batch_system.submit_job(video_job))
    
    # Normal priority image jobs
    for i in range(3):
        image_job = JobDefinition(
            job_id=str(uuid.uuid4()),
            job_type="image_enhancement",
            priority=JobPriority.NORMAL,
            parameters={
                "images": [f"image_{j}.jpg" for j in range(5)],
                "enhancement_type": "upscale"
            },
            estimated_duration=2.5
        )
        jobs.append(batch_system.submit_job(image_job))
    
    # Low priority background job
    background_job = JobDefinition(
        job_id=str(uuid.uuid4()),
        job_type="video_processing",
        priority=JobPriority.BACKGROUND,
        parameters={
            "input_file": "background_video.mp4",
            "output_file": "background_processed.mp4",
            "duration": 2.0
        },
        estimated_duration=2.0
    )
    jobs.append(batch_system.submit_job(background_job))
    
    print(f"✅ Submitted {len(jobs)} jobs")
    
    # Monitor progress
    print("\n📊 Monitoring job progress...")
    completed_jobs = 0
    
    while completed_jobs < len(jobs):
        time.sleep(1)
        
        # Check job statuses
        completed_jobs = 0
        for job_id in jobs:
            result = batch_system.get_job_status(job_id)
            if result and result.status in [JobStatus.COMPLETED, JobStatus.FAILED]:
                completed_jobs += 1
        
        # Print system stats
        stats = batch_system.get_system_stats()
        print(f"   Queue: {stats['queue_size']}, Active: {stats['active_workers']}, Completed: {completed_jobs}/{len(jobs)}")
    
    print("\n📈 Final Results:")
    
    # Print job results
    for job_id in jobs:
        result = batch_system.get_job_status(job_id)
        if result:
            status_icon = "✅" if result.status == JobStatus.COMPLETED else "❌"
            print(f"   {status_icon} Job {job_id[:8]}: {result.status.value} ({result.execution_time:.2f}s)")
    
    # Print system statistics
    final_stats = batch_system.get_system_stats()
    print(f"\n📊 System Statistics:")
    print(f"   Throughput: {final_stats['throughput']:.2f} jobs/sec")
    print(f"   Average Latency: {final_stats['average_latency_ms']:.1f}ms")
    print(f"   Workers Used: {final_stats['total_workers']}")
    
    # Stop processing
    batch_system.stop_processing()
    
    print(f"\n🎯 Phase 2 Batch Processing System: COMPLETE")
    return batch_system


if __name__ == "__main__":
    system = main()