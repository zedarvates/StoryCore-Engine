import time
import pytest

from src.async_task_queue import (
    AsyncTaskQueue,
    QueueConfiguration,
    TaskPriority,
    TaskState,
)


async def dummy_op():
    return "ok"


@pytest.mark.asyncio
async def test_task_idempotence_and_deadlock_resolution():
    # Create a small queue suitable for testing
    q = AsyncTaskQueue(
        QueueConfiguration(
            enable_dependency_management=True,
            max_queue_size=1000,
            worker_pool_size=1,
            max_concurrent_tasks=1,
        )
    )

    # Submit a task with a dependency; ensure idempotence on duplicate submissions
    tid1 = await q.submit_task(
        "dup-task", dummy_op, priority=TaskPriority.NORMAL, dependencies={"dep-a"}
    )
    tid2 = await q.submit_task(
        "dup-task", dummy_op, priority=TaskPriority.NORMAL, dependencies={"dep-a"}
    )

    assert tid1 == "dup-task" and tid2 == "dup-task"
    assert "dup-task" in q.waiting_for_dependencies

    # Simulate deadlock by no progress for longer than 30 seconds
    q.last_progress_timestamp = time.time() - 31
    q._resolve_deadlock()

    # The task should be cancelled as part of deadlock resolution
    assert "dup-task" in q.completed_tasks
    assert q.completed_tasks["dup-task"].state == TaskState.CANCELLED


@pytest.mark.asyncio
async def test_deadlock_resolution_multiple_tasks():
    q = AsyncTaskQueue(
        QueueConfiguration(
            enable_dependency_management=True,
            max_queue_size=1000,
            worker_pool_size=1,
            max_concurrent_tasks=1,
        )
    )

    tid1 = await q.submit_task(
        "t1", dummy_op, priority=TaskPriority.NORMAL, dependencies={"dep1"}
    )
    tid2 = await q.submit_task(
        "t2", dummy_op, priority=TaskPriority.NORMAL, dependencies={"dep2"}
    )

    assert tid1 == "t1" and tid2 == "t2"
    assert "t1" in q.waiting_for_dependencies and "t2" in q.waiting_for_dependencies

    q.last_progress_timestamp = time.time() - 31
    q._resolve_deadlock()

    assert "t1" in q.completed_tasks and "t2" in q.completed_tasks
    assert q.completed_tasks["t1"].state == TaskState.CANCELLED
    assert q.completed_tasks["t2"].state == TaskState.CANCELLED
