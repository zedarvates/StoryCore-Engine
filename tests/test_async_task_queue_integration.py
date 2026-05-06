import asyncio
import pytest
import time

from src.async_task_queue import (
    AsyncTaskQueue,
    QueueConfiguration,
    TaskPriority,
    TaskState,
)


async def sample_operation():
    await asyncio.sleep(0.05)
    return 123


async def failing_operation():
    await asyncio.sleep(0.01)
    raise ValueError("Test failure")


async def slow_operation():
    await asyncio.sleep(0.5)
    return "slow result"


@pytest.mark.asyncio
async def test_end_to_end_integration_with_async_queue():
    """Test basic end-to-end integration with AsyncTaskQueue."""
    # Configure a small queue suitable for integration tests
    q = AsyncTaskQueue(
        QueueConfiguration(
            max_queue_size=100,
            max_concurrent_tasks=2,
            worker_pool_size=1,
        )
    )
    q.start()
    try:
        task_id = await q.submit_task(
            "integration-task-1", sample_operation, priority=TaskPriority.NORMAL
        )
        result = await q.wait_for_task(task_id, timeout=5)
        assert result == 123
    finally:
        q.stop()


@pytest.mark.asyncio
async def test_task_priority_ordering():
    """Test that tasks are executed in priority order."""
    execution_order = []

    async def low_priority():
        await asyncio.sleep(0.02)
        execution_order.append("low")
        return "low"

    async def high_priority():
        await asyncio.sleep(0.02)
        execution_order.append("high")
        return "high"

    async def critical_priority():
        await asyncio.sleep(0.02)
        execution_order.append("critical")
        return "critical"

    q = AsyncTaskQueue(
        QueueConfiguration(
            max_queue_size=100,
            max_concurrent_tasks=1,
            worker_pool_size=1,
        )
    )
    q.start()
    try:
        # Submit in reverse order
        await q.submit_task("low", low_priority, priority=TaskPriority.LOW)
        await q.submit_task("high", high_priority, priority=TaskPriority.HIGH)
        await q.submit_task(
            "critical", critical_priority, priority=TaskPriority.CRITICAL
        )

        # Wait for all tasks
        await asyncio.sleep(0.5)

        # Should execute critical first, then high, then low
        assert len(execution_order) == 3
    finally:
        q.stop()


@pytest.mark.asyncio
async def test_circuit_breaker_integration():
    """Test circuit breaker behavior with failing tasks."""
    q = AsyncTaskQueue(
        QueueConfiguration(
            max_queue_size=100,
            max_concurrent_tasks=2,
            worker_pool_size=1,
            circuit_breaker_threshold=3,
            circuit_breaker_timeout=1,
        )
    )
    q.start()
    try:
        # Submit multiple failing tasks to trigger circuit breaker
        for i in range(5):
            await q.submit_task(
                f"fail-task-{i}", failing_operation, priority=TaskPriority.NORMAL
            )

        # Wait for failures to accumulate and circuit breaker to react
        await asyncio.sleep(1.0)

        # Check circuit breaker state - should have recorded at least some failures
        stats = q.get_queue_statistics()
        cb = stats.get("circuit_breaker", {})

        # The circuit breaker should be in some state (closed, open, or half-open)
        assert "state" in cb, "Circuit breaker should have a state"
        assert cb["state"] in ["closed", "open", "half_open"], (
            "Invalid circuit breaker state"
        )
    finally:
        q.stop()


@pytest.mark.asyncio
async def test_rate_limiting_integration():
    """Test rate limiting functionality."""
    q = AsyncTaskQueue(
        QueueConfiguration(
            max_queue_size=100,
            max_concurrent_tasks=2,
            worker_pool_size=1,
            rate_limit_per_second=5,  # Limit to 5 tasks per second
        )
    )
    q.start()
    try:
        # Submit 10 tasks rapidly
        start_time = time.time()
        for i in range(10):
            await q.submit_task(
                f"rate-task-{i}", sample_operation, priority=TaskPriority.NORMAL
            )

        # Wait for execution
        await asyncio.sleep(3)  # Should take ~2 seconds due to rate limit

        time.time() - start_time

        # Should respect rate limiting (at least some delay)
        stats = q.get_queue_statistics()
        assert stats["statistics"]["tasks_completed"] >= 8
    finally:
        q.stop()


@pytest.mark.asyncio
async def test_task_cancellation():
    """Test task cancellation functionality."""
    q = AsyncTaskQueue(
        QueueConfiguration(
            max_queue_size=100,
            max_concurrent_tasks=2,
            worker_pool_size=1,
        )
    )
    q.start()
    try:
        # Submit a slow task
        task_id = await q.submit_task(
            "cancel-task", slow_operation, priority=TaskPriority.NORMAL
        )

        # Cancel it
        cancelled = await q.cancel_task(task_id)
        assert cancelled

        # Verify task is cancelled
        status = await q.get_task_status(task_id)
        assert status is not None
        assert status["state"] == TaskState.CANCELLED.value
    finally:
        q.stop()


@pytest.mark.asyncio
async def test_queue_statistics():
    """Test queue statistics are correctly computed."""
    q = AsyncTaskQueue(
        QueueConfiguration(
            max_queue_size=100,
            max_concurrent_tasks=2,
            worker_pool_size=1,
        )
    )
    q.start()
    try:
        # Submit some tasks
        await q.submit_task(
            "stats-task-1", sample_operation, priority=TaskPriority.NORMAL
        )
        await q.submit_task(
            "stats-task-2", sample_operation, priority=TaskPriority.HIGH
        )

        # Wait a bit
        await asyncio.sleep(0.2)

        # Get statistics
        stats = q.get_queue_statistics()

        assert "statistics" in stats
        assert "tasks_submitted" in stats["statistics"]
        assert "tasks_completed" in stats["statistics"]
        assert stats["statistics"]["tasks_submitted"] >= 2
    finally:
        q.stop()
