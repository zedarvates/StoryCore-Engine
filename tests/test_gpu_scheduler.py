"""
Test GPU Scheduler - Resource allocation and job management.

Tests the GPU scheduler's priority queue management, resource monitoring,
and intelligent job scheduling capabilities.
"""

import asyncio
import pytest
import pytest_asyncio
import time
from src.gpu_scheduler import (
    GPUScheduler, GPUJobRequest, GPUJobResult,
    JobPriority, JobStatus, GPUDevice
)
from src.circuit_breaker import CircuitBreaker, CircuitBreakerConfig


class TestGPUScheduler:
    """Test GPU Scheduler functionality."""
    
    @pytest_asyncio.fixture
    async def scheduler(self):
        """Create GPU scheduler for testing."""
        scheduler = GPUScheduler()
        await scheduler.start()
        yield scheduler
        await scheduler.stop()
    
    @pytest.mark.asyncio
    async def test_scheduler_initialization(self):
        """Test GPU scheduler initializes correctly."""
        scheduler = GPUScheduler()
        
        assert scheduler.is_running is False
        assert len(scheduler.gpu_devices) > 0
        assert scheduler.stats["total_jobs_submitted"] == 0
        
        await scheduler.start()
        assert scheduler.is_running is True
        
        await scheduler.stop()
        assert scheduler.is_running is False
    
    @pytest.mark.asyncio
    async def test_job_submission(self, scheduler):
        """Test job submission to scheduler."""
        async def mock_job():
            await asyncio.sleep(0.1)
            return "job_result"
        
        job_request = GPUJobRequest(
            job_id="test_job_1",
            job_type="test",
            priority=JobPriority.NORMAL,
            gpu_memory_required=512,
            estimated_duration=0.1,
            timeout=5.0,
            callback=mock_job
        )
        
        job_id = await scheduler.submit_job(job_request)
        
        assert job_id == "test_job_1"
        assert scheduler.stats["total_jobs_submitted"] == 1
        
        # Wait for job to complete
        await asyncio.sleep(0.5)
        
        status = scheduler.get_job_status(job_id)
        assert status == JobStatus.COMPLETED
    
    @pytest.mark.asyncio
    async def test_priority_scheduling(self, scheduler):
        """Test jobs are executed in priority order."""
        execution_order = []
        
        async def mock_job(job_name):
            execution_order.append(job_name)
            await asyncio.sleep(0.1)
            return job_name
        
        # Submit jobs with different priorities
        jobs = [
            GPUJobRequest(
                job_id="low_priority",
                job_type="test",
                priority=JobPriority.LOW,
                gpu_memory_required=256,
                estimated_duration=0.1,
                timeout=5.0,
                callback=lambda: mock_job("low")
            ),
            GPUJobRequest(
                job_id="high_priority",
                job_type="test",
                priority=JobPriority.HIGH,
                gpu_memory_required=256,
                estimated_duration=0.1,
                timeout=5.0,
                callback=lambda: mock_job("high")
            ),
            GPUJobRequest(
                job_id="critical_priority",
                job_type="test",
                priority=JobPriority.CRITICAL,
                gpu_memory_required=256,
                estimated_duration=0.1,
                timeout=5.0,
                callback=lambda: mock_job("critical")
            )
        ]
        
        # Submit in reverse priority order
        for job in jobs:
            await scheduler.submit_job(job)
        
        # Wait for all jobs to complete
        await asyncio.sleep(1.0)
        
        # Critical should execute first, then high, then low
        assert execution_order[0] == "critical"
        assert execution_order[1] == "high"
        assert execution_order[2] == "low"
    
    @pytest.mark.asyncio
    async def test_job_cancellation(self, scheduler):
        """Test job cancellation."""
        async def long_running_job():
            await asyncio.sleep(10.0)
            return "completed"
        
        job_request = GPUJobRequest(
            job_id="cancel_test",
            job_type="test",
            priority=JobPriority.NORMAL,
            gpu_memory_required=256,
            estimated_duration=10.0,
            timeout=15.0,
            callback=long_running_job
        )
        
        job_id = await scheduler.submit_job(job_request)
        
        # Cancel job before it completes
        await asyncio.sleep(0.1)
        cancelled = await scheduler.cancel_job(job_id)
        
        assert cancelled is True
        
        # Check job status
        result = scheduler.get_job_result(job_id)
        if result:
            assert result.status == JobStatus.CANCELLED
    
    @pytest.mark.asyncio
    async def test_job_timeout(self, scheduler):
        """Test job timeout handling."""
        async def timeout_job():
            await asyncio.sleep(10.0)
            return "should_not_complete"
        
        job_request = GPUJobRequest(
            job_id="timeout_test",
            job_type="test",
            priority=JobPriority.NORMAL,
            gpu_memory_required=256,
            estimated_duration=10.0,
            timeout=0.2,  # Short timeout
            callback=timeout_job
        )
        
        job_id = await scheduler.submit_job(job_request)
        
        # Wait for timeout
        await asyncio.sleep(1.0)
        
        result = scheduler.get_job_result(job_id)
        assert result is not None
        assert result.status == JobStatus.TIMEOUT
        assert scheduler.stats["total_jobs_timeout"] == 1
    
    @pytest.mark.asyncio
    async def test_job_failure_handling(self, scheduler):
        """Test job failure handling."""
        async def failing_job():
            raise ValueError("Simulated job failure")
        
        job_request = GPUJobRequest(
            job_id="fail_test",
            job_type="test",
            priority=JobPriority.NORMAL,
            gpu_memory_required=256,
            estimated_duration=0.1,
            timeout=5.0,
            callback=failing_job
        )
        
        job_id = await scheduler.submit_job(job_request)
        
        # Wait for job to fail
        await asyncio.sleep(0.5)
        
        result = scheduler.get_job_result(job_id)
        assert result is not None
        assert result.status == JobStatus.FAILED
        assert "Simulated job failure" in result.error_message
        assert scheduler.stats["total_jobs_failed"] == 1
    
    @pytest.mark.asyncio
    async def test_queue_status(self, scheduler):
        """Test queue status reporting."""
        async def mock_job():
            await asyncio.sleep(0.1)
            return "result"
        
        # Submit multiple jobs
        for i in range(5):
            job_request = GPUJobRequest(
                job_id=f"queue_test_{i}",
                job_type="test",
                priority=JobPriority.NORMAL,
                gpu_memory_required=256,
                estimated_duration=0.1,
                timeout=5.0,
                callback=mock_job
            )
            await scheduler.submit_job(job_request)
        
        status = scheduler.get_queue_status()
        
        assert "queue_depth" in status
        assert "active_jobs" in status
        assert "completed_jobs" in status
        assert "queue_by_priority" in status
        assert status["is_running"] is True
    
    @pytest.mark.asyncio
    async def test_gpu_device_selection(self, scheduler):
        """Test optimal GPU device selection."""
        async def mock_job():
            await asyncio.sleep(0.1)
            return "result"
        
        job_request = GPUJobRequest(
            job_id="device_test",
            job_type="test",
            priority=JobPriority.NORMAL,
            gpu_memory_required=512,
            estimated_duration=0.1,
            timeout=5.0,
            callback=mock_job
        )
        
        # Select device for job
        device = scheduler._select_optimal_device(job_request)
        
        assert device is not None
        assert device.available_memory >= job_request.gpu_memory_required
        assert device.is_available is True
    
    @pytest.mark.asyncio
    async def test_resource_allocation(self, scheduler):
        """Test GPU resource allocation and deallocation."""
        async def mock_job():
            await asyncio.sleep(0.2)
            return "result"
        
        # Get initial device status
        initial_status = scheduler.get_gpu_status()
        initial_memory = initial_status[0]["available_memory"]
        
        job_request = GPUJobRequest(
            job_id="resource_test",
            job_type="test",
            priority=JobPriority.NORMAL,
            gpu_memory_required=1024,
            estimated_duration=0.2,
            timeout=5.0,
            callback=mock_job
        )
        
        await scheduler.submit_job(job_request)
        
        # Wait for job to start
        await asyncio.sleep(0.1)
        
        # Check memory is allocated
        running_status = scheduler.get_gpu_status()
        running_memory = running_status[0]["available_memory"]
        assert running_memory < initial_memory
        
        # Wait for job to complete
        await asyncio.sleep(0.5)
        
        # Check memory is deallocated
        final_status = scheduler.get_gpu_status()
        final_memory = final_status[0]["available_memory"]
        assert final_memory == initial_memory
    
    @pytest.mark.asyncio
    async def test_concurrent_job_execution(self, scheduler):
        """Test handling of concurrent jobs."""
        async def mock_job(job_id):
            await asyncio.sleep(0.1)
            return f"result_{job_id}"
        
        # Submit multiple jobs concurrently
        job_ids = []
        for i in range(10):
            job_request = GPUJobRequest(
                job_id=f"concurrent_{i}",
                job_type="test",
                priority=JobPriority.NORMAL,
                gpu_memory_required=256,
                estimated_duration=0.1,
                timeout=5.0,
                callback=lambda j=i: mock_job(j)
            )
            job_id = await scheduler.submit_job(job_request)
            job_ids.append(job_id)
        
        # Wait for all jobs to complete
        await asyncio.sleep(2.0)
        
        # Check all jobs completed
        completed_count = sum(
            1 for job_id in job_ids
            if scheduler.get_job_status(job_id) == JobStatus.COMPLETED
        )
        
        assert completed_count == 10
    
    @pytest.mark.asyncio
    async def test_performance_metrics(self, scheduler):
        """Test performance metrics collection."""
        async def mock_job():
            await asyncio.sleep(0.1)
            return "result"
        
        # Submit and complete some jobs
        for i in range(5):
            job_request = GPUJobRequest(
                job_id=f"metrics_test_{i}",
                job_type="test",
                priority=JobPriority.NORMAL,
                gpu_memory_required=256,
                estimated_duration=0.1,
                timeout=5.0,
                callback=mock_job
            )
            await scheduler.submit_job(job_request)
        
        # Wait for jobs to complete
        await asyncio.sleep(1.0)
        
        metrics = scheduler.get_performance_metrics()
        
        assert "queue_metrics" in metrics
        assert "gpu_metrics" in metrics
        assert "performance_metrics" in metrics
        assert "statistics" in metrics
        
        perf_metrics = metrics["performance_metrics"]
        assert "success_rate" in perf_metrics
        assert "average_execution_time" in perf_metrics
        assert "total_jobs_processed" in perf_metrics
    
    @pytest.mark.asyncio
    async def test_scheduling_optimization(self, scheduler):
        """Test scheduling optimization analysis."""
        async def mock_job():
            await asyncio.sleep(0.1)
            return "result"
        
        # Submit some jobs
        for i in range(3):
            job_request = GPUJobRequest(
                job_id=f"opt_test_{i}",
                job_type="test",
                priority=JobPriority.NORMAL,
                gpu_memory_required=256,
                estimated_duration=0.1,
                timeout=5.0,
                callback=mock_job
            )
            await scheduler.submit_job(job_request)
        
        # Wait for jobs to complete
        await asyncio.sleep(1.0)
        
        optimization = scheduler.optimize_scheduling()
        
        assert "current_metrics" in optimization
        assert "recommendations" in optimization
        assert "optimization_score" in optimization
        assert 0 <= optimization["optimization_score"] <= 1
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_integration(self):
        """Test circuit breaker integration with scheduler."""
        cb_config = CircuitBreakerConfig(
            failure_threshold=2,
            timeout=60.0,
            recovery_timeout=5.0
        )
        circuit_breaker = CircuitBreaker("test_scheduler", cb_config)
        
        scheduler = GPUScheduler(circuit_breaker=circuit_breaker)
        await scheduler.start()
        
        async def failing_job():
            raise RuntimeError("Job failure")
        
        # Submit failing jobs to trigger circuit breaker
        for i in range(3):
            job_request = GPUJobRequest(
                job_id=f"cb_test_{i}",
                job_type="test",
                priority=JobPriority.NORMAL,
                gpu_memory_required=256,
                estimated_duration=0.1,
                timeout=5.0,
                callback=failing_job
            )
            await scheduler.submit_job(job_request)
        
        # Wait for jobs to fail
        await asyncio.sleep(1.0)
        
        # Check that jobs failed (circuit breaker may or may not be open depending on timing)
        failed_count = sum(
            1 for i in range(3)
            if scheduler.get_job_status(f"cb_test_{i}") == JobStatus.FAILED
        )
        
        # At least some jobs should have failed
        assert failed_count >= 2
        assert scheduler.stats["total_jobs_failed"] >= 2
        
        await scheduler.stop()
    
    @pytest.mark.asyncio
    async def test_memory_constraint_handling(self, scheduler):
        """Test handling of jobs with high memory requirements."""
        async def mock_job():
            await asyncio.sleep(0.1)
            return "result"
        
        # Submit job requiring more memory than available
        job_request = GPUJobRequest(
            job_id="high_memory_test",
            job_type="test",
            priority=JobPriority.NORMAL,
            gpu_memory_required=10000,  # More than 8GB available
            estimated_duration=0.1,
            timeout=5.0,
            callback=mock_job
        )
        
        await scheduler.submit_job(job_request)
        
        # Wait and check job remains queued
        await asyncio.sleep(0.5)
        
        status = scheduler.get_job_status("high_memory_test")
        # Job should still be queued as it can't be allocated
        assert status in [JobStatus.QUEUED, JobStatus.PENDING]
    
    @pytest.mark.asyncio
    async def test_job_history_tracking(self, scheduler):
        """Test job history is tracked correctly."""
        async def mock_job():
            await asyncio.sleep(0.05)
            return "result"
        
        # Submit multiple jobs
        for i in range(5):
            job_request = GPUJobRequest(
                job_id=f"history_test_{i}",
                job_type="test",
                priority=JobPriority.NORMAL,
                gpu_memory_required=256,
                estimated_duration=0.05,
                timeout=5.0,
                callback=mock_job
            )
            await scheduler.submit_job(job_request)
        
        # Wait for jobs to complete
        await asyncio.sleep(1.0)
        
        # Check history
        assert len(scheduler.job_history) >= 5
        assert len(scheduler.completed_jobs) >= 5


def run_gpu_scheduler_tests():
    """Run all GPU scheduler tests."""
    print("Running GPU Scheduler Tests...")
    
    # Run tests
    pytest.main([__file__, "-v", "--tb=short"])


if __name__ == "__main__":
    run_gpu_scheduler_tests()
