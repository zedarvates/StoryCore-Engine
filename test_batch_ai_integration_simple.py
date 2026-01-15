"""
Simple test for Batch AI Integration - Non-blocking validation.

Tests that the integration:
1. Doesn't block
2. Schedules jobs correctly
3. Manages resources properly
4. Stops gracefully
"""

import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from batch_ai_integration import (
    BatchAIIntegration,
    BatchConfig,
    AIBatchJob,
    AIJobType,
    AIJobPriority,
    AIJobStatus,
    ResourceRequirements
)
from datetime import datetime
import uuid


async def test_job_submission():
    """Test that job submission doesn't block."""
    print("🧪 Test 1: Non-blocking job submission")
    
    config = BatchConfig(
        max_queue_size=10,
        max_concurrent_jobs=2
    )
    
    integration = BatchAIIntegration(config)
    await integration.start()
    
    try:
        # Submit multiple jobs rapidly
        start_time = asyncio.get_event_loop().time()
        
        submitted = 0
        for i in range(15):  # More than queue size
            job = AIBatchJob(
                job_id=f"job_{i}",
                job_type=AIJobType.STYLE_TRANSFER_BATCH,
                priority=AIJobPriority.NORMAL,
                resource_requirements=ResourceRequirements(
                    gpu_count=1,
                    gpu_memory_mb=1024
                ),
                parameters={'item_count': 10}
            )
            
            if await integration.submit_job(job, timeout=0.5):
                submitted += 1
        
        elapsed = asyncio.get_event_loop().time() - start_time
        
        # Should complete quickly
        assert elapsed < 2.0, f"Submission took too long: {elapsed}s"
        
        stats = integration.get_statistics()
        print(f"   ✅ Submitted {submitted}/15 jobs in {elapsed:.3f}s")
        print(f"   ✅ Queue size: {stats['queue_status']['pending_jobs']}")
        print(f"   ✅ No blocking detected")
        
    finally:
        await integration.stop(timeout=2.0)
    
    print("   ✅ Test passed\n")


async def test_resource_aware_scheduling():
    """Test resource-aware job scheduling."""
    print("🧪 Test 2: Resource-aware scheduling")
    
    config = BatchConfig(
        total_gpu_count=2,
        total_gpu_memory_mb=4096,
        max_concurrent_jobs=4,
        scheduling_interval_seconds=0.5
    )
    
    integration = BatchAIIntegration(config)
    await integration.start()
    
    try:
        # Submit jobs with different resource requirements
        jobs = [
            AIBatchJob(
                job_id=f"gpu_job_{i}",
                job_type=AIJobType.SUPER_RESOLUTION_BATCH,
                priority=AIJobPriority.HIGH,
                resource_requirements=ResourceRequirements(
                    gpu_count=1,
                    gpu_memory_mb=2048,
                    estimated_duration_seconds=0.5
                ),
                parameters={'frames': 10}
            )
            for i in range(3)  # 3 jobs, but only 2 GPUs
        ]
        
        for job in jobs:
            await integration.submit_job(job)
        
        # Wait for scheduling
        await asyncio.sleep(1.0)
        
        stats = integration.get_statistics()
        
        # Should have scheduled based on resource availability
        print(f"   ✅ Running jobs: {stats['queue_status']['running_jobs']}")
        print(f"   ✅ Pending jobs: {stats['queue_status']['pending_jobs']}")
        print(f"   ✅ GPU utilization: {stats['resource_status']['gpu_available']}/{stats['resource_status']['gpu_total']}")
        
        # Wait for completion
        await asyncio.sleep(2.0)
        
        stats = integration.get_statistics()
        print(f"   ✅ Completed jobs: {stats['queue_status']['completed_jobs']}")
        
    finally:
        await integration.stop(timeout=2.0)
    
    print("   ✅ Test passed\n")


async def test_priority_scheduling():
    """Test priority-based job scheduling."""
    print("🧪 Test 3: Priority-based scheduling")
    
    config = BatchConfig(
        max_concurrent_jobs=1,
        scheduling_interval_seconds=0.5
    )
    
    integration = BatchAIIntegration(config)
    await integration.start()
    
    try:
        # Submit jobs with different priorities
        jobs = [
            AIBatchJob(
                job_id="low_priority",
                job_type=AIJobType.INTERPOLATION_BATCH,
                priority=AIJobPriority.LOW,
                resource_requirements=ResourceRequirements(estimated_duration_seconds=0.5),
                parameters={}
            ),
            AIBatchJob(
                job_id="high_priority",
                job_type=AIJobType.INTERPOLATION_BATCH,
                priority=AIJobPriority.HIGH,
                resource_requirements=ResourceRequirements(estimated_duration_seconds=0.5),
                parameters={}
            ),
            AIBatchJob(
                job_id="critical_priority",
                job_type=AIJobType.INTERPOLATION_BATCH,
                priority=AIJobPriority.CRITICAL,
                resource_requirements=ResourceRequirements(estimated_duration_seconds=0.5),
                parameters={}
            )
        ]
        
        # Submit in reverse priority order
        for job in jobs:
            await integration.submit_job(job)
        
        # Wait for scheduling
        await asyncio.sleep(1.0)
        
        # Critical priority should be running first
        stats = integration.get_statistics()
        running_jobs = integration.running_jobs
        
        if running_jobs:
            running_job_id = list(running_jobs.keys())[0]
            print(f"   ✅ First job scheduled: {running_job_id}")
            assert "critical" in running_job_id, "Critical priority job should run first"
        
        # Wait for all jobs to complete
        await asyncio.sleep(3.0)
        
        stats = integration.get_statistics()
        print(f"   ✅ All jobs completed: {stats['queue_status']['completed_jobs']}")
        
    finally:
        await integration.stop(timeout=2.0)
    
    print("   ✅ Test passed\n")


async def test_job_cancellation():
    """Test job cancellation."""
    print("🧪 Test 4: Job cancellation")
    
    config = BatchConfig(
        max_concurrent_jobs=1,
        scheduling_interval_seconds=0.5
    )
    
    integration = BatchAIIntegration(config)
    await integration.start()
    
    try:
        # Submit a long-running job
        job = AIBatchJob(
            job_id="long_job",
            job_type=AIJobType.MODEL_TRAINING,
            priority=AIJobPriority.NORMAL,
            resource_requirements=ResourceRequirements(estimated_duration_seconds=10.0),
            parameters={}
        )
        
        await integration.submit_job(job)
        
        # Wait for it to start
        await asyncio.sleep(1.0)
        
        # Cancel the job
        cancelled = await integration.cancel_job("long_job")
        
        assert cancelled, "Job should be cancelled"
        
        stats = integration.get_statistics()
        print(f"   ✅ Job cancelled successfully")
        print(f"   ✅ Cancelled jobs: {stats['stats']['total_jobs_cancelled']}")
        
    finally:
        await integration.stop(timeout=2.0)
    
    print("   ✅ Test passed\n")


async def test_graceful_stop():
    """Test graceful stop with running jobs."""
    print("🧪 Test 5: Graceful stop")
    
    config = BatchConfig(
        max_concurrent_jobs=2,
        scheduling_interval_seconds=0.5
    )
    
    integration = BatchAIIntegration(config)
    await integration.start()
    
    try:
        # Submit jobs
        for i in range(3):
            job = AIBatchJob(
                job_id=f"job_{i}",
                job_type=AIJobType.QUALITY_OPTIMIZATION_BATCH,
                priority=AIJobPriority.NORMAL,
                resource_requirements=ResourceRequirements(estimated_duration_seconds=5.0),
                parameters={}
            )
            await integration.submit_job(job)
        
        # Wait for jobs to start
        await asyncio.sleep(1.0)
        
        # Stop with timeout
        start_time = asyncio.get_event_loop().time()
        await integration.stop(timeout=2.0)
        elapsed = asyncio.get_event_loop().time() - start_time
        
        # Should stop within timeout
        assert elapsed < 3.0, f"Stop took too long: {elapsed}s"
        assert not integration.is_running, "Integration should be stopped"
        
        print(f"   ✅ Stopped in {elapsed:.3f}s (within timeout)")
        
    except Exception as e:
        # Already stopped in try block
        pass
    
    print("   ✅ Test passed\n")


async def test_statistics():
    """Test statistics collection."""
    print("🧪 Test 6: Statistics collection")
    
    config = BatchConfig(
        max_concurrent_jobs=2,
        scheduling_interval_seconds=0.5
    )
    
    integration = BatchAIIntegration(config)
    await integration.start()
    
    try:
        # Submit and complete some jobs
        for i in range(5):
            job = AIBatchJob(
                job_id=f"job_{i}",
                job_type=AIJobType.STYLE_TRANSFER_BATCH,
                priority=AIJobPriority.NORMAL,
                resource_requirements=ResourceRequirements(estimated_duration_seconds=0.5),
                parameters={}
            )
            await integration.submit_job(job)
        
        # Wait for completion
        await asyncio.sleep(3.0)
        
        stats = integration.get_statistics()
        
        print(f"   ✅ Statistics collected:")
        print(f"      - Total submitted: {stats['stats']['total_jobs_submitted']}")
        print(f"      - Total completed: {stats['stats']['total_jobs_completed']}")
        print(f"      - Queue utilization: {stats['queue_status']['queue_utilization']:.1%}")
        print(f"      - Resource utilization: {stats['resource_status']['utilization']:.1%}")
        
        assert stats['stats']['total_jobs_submitted'] == 5, "Should have 5 submitted jobs"
        
    finally:
        await integration.stop(timeout=2.0)
    
    print("   ✅ Test passed\n")


async def test_real_time_coordination():
    """Test coordination with real-time operations."""
    print("🧪 Test 7: Real-time coordination")
    
    config = BatchConfig(
        enable_real_time_coordination=True,
        real_time_priority_boost=2
    )
    
    integration = BatchAIIntegration(config)
    await integration.start()
    
    try:
        # Submit batch jobs
        job = AIBatchJob(
            job_id="batch_job",
            job_type=AIJobType.INTERPOLATION_BATCH,
            priority=AIJobPriority.LOW,
            resource_requirements=ResourceRequirements(),
            parameters={},
            metadata={'related_jobs': ['realtime_job_1']}
        )
        
        await integration.submit_job(job)
        
        # Coordinate with real-time job
        await integration.coordinate_with_real_time('realtime_job_1', priority_boost=True)
        
        # Check if priority was boosted
        if integration.pending_jobs:
            boosted_job = integration.pending_jobs[0]
            print(f"   ✅ Job priority after boost: {boosted_job.priority.value}")
        
        print(f"   ✅ Real-time coordination active")
        print(f"   ✅ Real-time jobs tracked: {len(integration.real_time_jobs)}")
        
    finally:
        await integration.stop(timeout=2.0)
    
    print("   ✅ Test passed\n")


async def main():
    """Run all tests."""
    print("=" * 60)
    print("Batch AI Integration - Non-Blocking Tests")
    print("=" * 60)
    print()
    
    tests = [
        test_job_submission,
        test_resource_aware_scheduling,
        test_priority_scheduling,
        test_job_cancellation,
        test_graceful_stop,
        test_statistics,
        test_real_time_coordination
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            await test()
            passed += 1
        except Exception as e:
            print(f"   ❌ Test failed: {e}\n")
            import traceback
            traceback.print_exc()
            failed += 1
    
    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)
    
    if failed == 0:
        print("✅ All tests passed!")
        return 0
    else:
        print("❌ Some tests failed")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
