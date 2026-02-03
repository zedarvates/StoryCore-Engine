"""
Integration tests for task management system.

This module tests the complete task management workflow including:
- Task creation and tracking
- Task status polling
- Task cancellation
- Integration with API router
"""

import pytest
import time
from src.api import APIRouter, TaskManager
from src.api.config import APIConfig
from src.api.task_routes import register_task_endpoints
from src.api.models import RequestContext
from src.api.services import TaskStatus


def sample_async_operation(params, task):
    """Sample async operation for testing."""
    # Simulate work with progress updates
    for i in range(10):
        if task.is_cancelled():
            return {"cancelled": True, "progress": i * 10}
        
        task.update_progress((i + 1) / 10)
        time.sleep(0.3)
    
    return {"result": "completed", "input": params.get("input")}


def test_task_creation_and_status():
    """Test creating a task and polling its status."""
    task_manager = TaskManager(num_workers=2)
    
    try:
        # Create a task
        task_id = task_manager.create_task(
            operation=sample_async_operation,
            params={"input": "test data"}
        )
        
        # Immediately check status - should be pending or running
        status = task_manager.get_task_status(task_id)
        assert status is not None
        assert status["status"] in [TaskStatus.PENDING.value, TaskStatus.RUNNING.value]
        assert status["task_id"] == task_id
        
        # Wait for completion
        time.sleep(5)
        
        # Check final status
        status = task_manager.get_task_status(task_id)
        assert status["status"] == TaskStatus.COMPLETED.value
        assert status["progress"] == 1.0
        assert status["result"]["result"] == "completed"
        assert status["result"]["input"] == "test data"
        
    finally:
        task_manager.shutdown()


def test_task_cancellation():
    """Test cancelling a running task."""
    task_manager = TaskManager(num_workers=2)
    
    try:
        # Create a task
        task_id = task_manager.create_task(
            operation=sample_async_operation,
            params={}
        )
        
        # Wait a bit for task to start
        time.sleep(1.0)
        
        # Cancel the task
        cancelled = task_manager.cancel_task(task_id)
        assert cancelled is True
        
        # Wait for cancellation to take effect
        time.sleep(1.5)
        
        # Check status - should be cancelled or completed with cancelled flag
        status = task_manager.get_task_status(task_id)
        # Task might complete with cancelled flag in result or be marked as cancelled
        assert status["status"] in [TaskStatus.CANCELLED.value, TaskStatus.COMPLETED.value]
        if status["status"] == TaskStatus.COMPLETED.value:
            assert status["result"].get("cancelled") is True
        
    finally:
        task_manager.shutdown()


def test_task_status_endpoint():
    """Test the task status API endpoint."""
    config = APIConfig()
    router = APIRouter(config)
    task_manager = TaskManager(num_workers=2)
    
    try:
        # Register task endpoints
        register_task_endpoints(router, task_manager)
        
        # Create a task
        task_id = task_manager.create_task(
            operation=sample_async_operation,
            params={"input": "api test"}
        )
        
        # Call status endpoint
        context = RequestContext()
        response = router.route_request(
            path="storycore.task.status",
            method="GET",
            params={"task_id": task_id},
            context=context
        )
        
        assert response.status == "success"
        assert response.data["task_id"] == task_id
        assert response.data["status"] in [TaskStatus.PENDING.value, TaskStatus.RUNNING.value]
        
        # Wait for completion
        time.sleep(5)
        
        # Check status again
        context = RequestContext()
        response = router.route_request(
            path="storycore.task.status",
            method="GET",
            params={"task_id": task_id},
            context=context
        )
        
        assert response.status == "success"
        assert response.data["status"] == TaskStatus.COMPLETED.value
        
    finally:
        task_manager.shutdown()


def test_task_cancel_endpoint():
    """Test the task cancellation API endpoint."""
    config = APIConfig()
    router = APIRouter(config)
    task_manager = TaskManager(num_workers=2)
    
    try:
        # Register task endpoints
        register_task_endpoints(router, task_manager)
        
        # Create a task
        task_id = task_manager.create_task(
            operation=sample_async_operation,
            params={}
        )
        
        # Wait for task to start
        time.sleep(1.0)
        
        # Call cancel endpoint
        context = RequestContext()
        response = router.route_request(
            path="storycore.task.cancel",
            method="POST",
            params={"task_id": task_id},
            context=context
        )
        
        assert response.status == "success"
        assert response.data["cancelled"] is True
        assert response.data["task_id"] == task_id
        
        # Verify task is cancelled or completed with cancelled flag
        time.sleep(1.5)
        status = task_manager.get_task_status(task_id)
        assert status["status"] in [TaskStatus.CANCELLED.value, TaskStatus.COMPLETED.value]
        if status["status"] == TaskStatus.COMPLETED.value:
            assert status["result"].get("cancelled") is True
        
    finally:
        task_manager.shutdown()


def test_task_not_found():
    """Test handling of non-existent task ID."""
    config = APIConfig()
    router = APIRouter(config)
    task_manager = TaskManager(num_workers=2)
    
    try:
        # Register task endpoints
        register_task_endpoints(router, task_manager)
        
        # Try to get status of non-existent task
        context = RequestContext()
        response = router.route_request(
            path="storycore.task.status",
            method="GET",
            params={"task_id": "non-existent-id"},
            context=context
        )
        
        assert response.status == "error"
        assert response.error.code == "NOT_FOUND"
        
        # Try to cancel non-existent task
        context = RequestContext()
        response = router.route_request(
            path="storycore.task.cancel",
            method="POST",
            params={"task_id": "non-existent-id"},
            context=context
        )
        
        assert response.status == "error"
        assert response.error.code == "NOT_FOUND"
        
    finally:
        task_manager.shutdown()


def test_concurrent_tasks():
    """Test multiple tasks running concurrently."""
    task_manager = TaskManager(num_workers=4)
    
    try:
        # Create multiple tasks
        task_ids = []
        for i in range(5):
            task_id = task_manager.create_task(
                operation=sample_async_operation,
                params={"input": f"task-{i}"}
            )
            task_ids.append(task_id)
        
        # Wait for all to complete (with 4 workers, 5 tasks should take ~2 batches)
        time.sleep(8)
        
        # Check all completed successfully
        for i, task_id in enumerate(task_ids):
            status = task_manager.get_task_status(task_id)
            assert status["status"] == TaskStatus.COMPLETED.value
            assert status["result"]["input"] == f"task-{i}"
        
    finally:
        task_manager.shutdown()


def test_task_manager_stats():
    """Test task manager statistics."""
    task_manager = TaskManager(num_workers=2)
    
    try:
        # Create some tasks
        task_ids = []
        for i in range(3):
            task_id = task_manager.create_task(
                operation=sample_async_operation,
                params={}
            )
            task_ids.append(task_id)
        
        # Get stats
        stats = task_manager.get_stats()
        
        assert stats["total_tasks"] == 3
        assert stats["num_workers"] == 2
        assert "status_counts" in stats
        
        # Wait for completion (with 2 workers, 3 tasks need ~2 batches)
        time.sleep(8)
        
        # Get stats again
        stats = task_manager.get_stats()
        assert stats["status_counts"]["completed"] == 3
        
    finally:
        task_manager.shutdown()


def test_task_cleanup():
    """Test cleanup of old tasks."""
    task_manager = TaskManager(num_workers=2)
    
    try:
        # Create and complete a task
        task_id = task_manager.create_task(
            operation=lambda params, task: {"result": "quick"},
            params={}
        )
        
        # Wait for completion
        time.sleep(2)
        
        # Verify task exists
        status = task_manager.get_task_status(task_id)
        assert status is not None
        
        # Cleanup with 0 max age (should remove all completed tasks)
        removed = task_manager.cleanup_old_tasks(max_age_seconds=0)
        assert removed == 1
        
        # Verify task is gone
        status = task_manager.get_task_status(task_id)
        assert status is None
        
    finally:
        task_manager.shutdown()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
