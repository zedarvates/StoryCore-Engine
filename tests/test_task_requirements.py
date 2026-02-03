"""
Requirements validation tests for Task Management System.

This module validates that all requirements from the spec are met.
"""

import pytest
import time
from src.api import TaskManager, APIRouter
from src.api.config import APIConfig
from src.api.task_routes import register_task_endpoints
from src.api.models import RequestContext, ErrorCodes
from src.api.services import TaskStatus


def sample_operation(params, task):
    """Sample operation for testing."""
    time.sleep(1)
    return {"result": "done"}


def test_requirement_1_4_async_operation_support():
    """
    Requirement 1.4: API layer supports both synchronous and asynchronous operation modes.
    
    Validates: The system can handle async operations that return immediately.
    """
    task_manager = TaskManager(num_workers=2)
    
    try:
        # Create async task - should return immediately
        start_time = time.time()
        task_id = task_manager.create_task(
            operation=sample_operation,
            params={}
        )
        creation_time = time.time() - start_time
        
        # Task creation should be fast (< 100ms)
        assert creation_time < 0.1
        assert task_id is not None
        assert len(task_id) > 0
        
    finally:
        task_manager.shutdown()


def test_requirement_1_5_task_id_return():
    """
    Requirement 1.5: When an asynchronous operation is initiated, 
    the API layer shall return a task ID for status polling.
    
    Validates: Async operations return a unique task ID.
    """
    task_manager = TaskManager(num_workers=2)
    
    try:
        # Create task
        task_id = task_manager.create_task(
            operation=sample_operation,
            params={}
        )
        
        # Verify task ID is returned
        assert task_id is not None
        assert isinstance(task_id, str)
        assert len(task_id) > 0
        
        # Verify task ID can be used to query status
        status = task_manager.get_task_status(task_id)
        assert status is not None
        assert status["task_id"] == task_id
        
    finally:
        task_manager.shutdown()


def test_requirement_16_5_timeout_handling():
    """
    Requirement 16.5: When an operation times out, the API layer shall return 
    timeout error with partial results if available.
    
    Validates: Timeout handling with partial results.
    """
    task_manager = TaskManager(num_workers=2)
    
    def slow_operation_with_partial(params, task):
        task.partial_result = {"progress": "50%"}
        time.sleep(5)
        return {"result": "done"}
    
    try:
        # Create task with timeout
        task_id = task_manager.create_task(
            operation=slow_operation_with_partial,
            params={},
            timeout=1.0
        )
        
        # Wait for timeout
        time.sleep(3)
        
        # Check status
        status = task_manager.get_task_status(task_id)
        
        # Verify timeout error
        assert status["status"] == TaskStatus.FAILED.value
        assert status["error"]["code"] == ErrorCodes.TIMEOUT
        assert "timeout" in status["error"]["message"].lower()
        
        # Verify partial result if available
        if "partial_result" in status["error"]["details"]:
            assert status["error"]["details"]["partial_result"]["progress"] == "50%"
        
    finally:
        task_manager.shutdown()


def test_requirement_18_2_immediate_return():
    """
    Requirement 18.2: When long-running operations are initiated, 
    the API layer shall return immediately with task ID.
    
    Validates: Long operations don't block the caller.
    """
    task_manager = TaskManager(num_workers=2)
    
    def very_long_operation(params, task):
        time.sleep(10)
        return {"result": "done"}
    
    try:
        # Create long-running task
        start_time = time.time()
        task_id = task_manager.create_task(
            operation=very_long_operation,
            params={}
        )
        creation_time = time.time() - start_time
        
        # Should return immediately (< 100ms)
        assert creation_time < 0.1
        assert task_id is not None
        
        # Task should be pending or running, not completed
        status = task_manager.get_task_status(task_id)
        assert status["status"] in [TaskStatus.PENDING.value, TaskStatus.RUNNING.value]
        
    finally:
        task_manager.shutdown()


def test_requirement_18_4_task_status_polling():
    """
    Requirement 18.4: When storycore.task.status is called with task ID, 
    the API layer shall return current task progress.
    
    Validates: Status polling returns accurate task state.
    """
    config = APIConfig()
    router = APIRouter(config)
    task_manager = TaskManager(num_workers=2)
    
    def progressive_operation(params, task):
        for i in range(5):
            task.update_progress((i + 1) / 5)
            time.sleep(0.3)
        return {"result": "done"}
    
    try:
        # Register endpoints
        register_task_endpoints(router, task_manager)
        
        # Create task
        task_id = task_manager.create_task(
            operation=progressive_operation,
            params={}
        )
        
        # Poll status via API endpoint
        context = RequestContext()
        response = router.route_request(
            path="storycore.task.status",
            method="GET",
            params={"task_id": task_id},
            context=context
        )
        
        # Verify response structure
        assert response.status == "success"
        assert "task_id" in response.data
        assert "status" in response.data
        assert "progress" in response.data
        assert response.data["task_id"] == task_id
        
        # Status should be valid
        valid_statuses = [s.value for s in TaskStatus]
        assert response.data["status"] in valid_statuses
        
        # Progress should be between 0 and 1
        assert 0.0 <= response.data["progress"] <= 1.0
        
    finally:
        task_manager.shutdown()


def test_requirement_18_5_task_cancellation():
    """
    Requirement 18.5: When storycore.task.cancel is called with task ID, 
    the API layer shall terminate running task.
    
    Validates: Task cancellation works correctly.
    """
    config = APIConfig()
    router = APIRouter(config)
    task_manager = TaskManager(num_workers=2)
    
    def cancellable_operation(params, task):
        for i in range(10):
            if task.is_cancelled():
                return {"cancelled": True, "step": i}
            time.sleep(0.5)
        return {"result": "done"}
    
    try:
        # Register endpoints
        register_task_endpoints(router, task_manager)
        
        # Create task
        task_id = task_manager.create_task(
            operation=cancellable_operation,
            params={}
        )
        
        # Let it run briefly
        time.sleep(1)
        
        # Cancel via API endpoint
        context = RequestContext()
        response = router.route_request(
            path="storycore.task.cancel",
            method="POST",
            params={"task_id": task_id},
            context=context
        )
        
        # Verify cancellation response
        assert response.status == "success"
        assert response.data["cancelled"] is True
        assert response.data["task_id"] == task_id
        
        # Wait for cancellation to take effect
        time.sleep(2)
        
        # Verify task was cancelled or completed with cancelled flag
        status = task_manager.get_task_status(task_id)
        assert status["status"] in [TaskStatus.CANCELLED.value, TaskStatus.COMPLETED.value]
        if status["status"] == TaskStatus.COMPLETED.value:
            assert status["result"].get("cancelled") is True
        
    finally:
        task_manager.shutdown()


def test_all_task_statuses():
    """
    Validates: All task statuses (pending, running, completed, failed, cancelled) work correctly.
    """
    task_manager = TaskManager(num_workers=1)
    
    def quick_operation(params, task):
        return {"result": "done"}
    
    def failing_operation(params, task):
        raise ValueError("Test error")
    
    def cancellable_operation(params, task):
        for i in range(10):
            if task.is_cancelled():
                return {"cancelled": True}
            time.sleep(0.3)
        return {"result": "done"}
    
    try:
        # Test PENDING/RUNNING/COMPLETED
        task_id = task_manager.create_task(
            operation=quick_operation,
            params={}
        )
        time.sleep(2)
        status = task_manager.get_task_status(task_id)
        assert status["status"] == TaskStatus.COMPLETED.value
        
        # Test FAILED
        task_id = task_manager.create_task(
            operation=failing_operation,
            params={}
        )
        time.sleep(2)
        status = task_manager.get_task_status(task_id)
        assert status["status"] == TaskStatus.FAILED.value
        assert status["error"] is not None
        
        # Test CANCELLED
        task_id = task_manager.create_task(
            operation=cancellable_operation,
            params={}
        )
        time.sleep(0.5)
        task_manager.cancel_task(task_id)
        time.sleep(2)
        status = task_manager.get_task_status(task_id)
        assert status["status"] in [TaskStatus.CANCELLED.value, TaskStatus.COMPLETED.value]
        
    finally:
        task_manager.shutdown()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
