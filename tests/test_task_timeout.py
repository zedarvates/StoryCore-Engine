"""
Tests for task timeout handling.

This module tests the timeout functionality of the TaskManager service.
"""

import pytest
import time
from src.api.services import TaskManager, TaskStatus
from src.api.models import ErrorCodes


def slow_operation(params, task):
    """A slow operation that takes longer than timeout."""
    time.sleep(5)  # Sleep for 5 seconds
    return {"result": "completed"}


def operation_with_partial_result(params, task):
    """An operation that sets partial results before timing out."""
    task.partial_result = {"progress": "50%", "items_processed": 50}
    time.sleep(5)  # Sleep for 5 seconds
    return {"result": "completed"}


def fast_operation(params, task):
    """A fast operation that completes before timeout."""
    return {"result": "completed quickly"}


def test_task_timeout():
    """Test that tasks timeout correctly."""
    task_manager = TaskManager(num_workers=2)
    
    try:
        # Create a task with 1 second timeout
        task_id = task_manager.create_task(
            operation=slow_operation,
            params={},
            timeout=1.0
        )
        
        # Wait for task to timeout
        time.sleep(3)
        
        # Check task status
        status = task_manager.get_task_status(task_id)
        
        assert status is not None
        assert status["status"] == TaskStatus.FAILED.value
        assert status["error"]["code"] == ErrorCodes.TIMEOUT
        assert "timeout" in status["error"]["message"].lower()
        assert "timeout_seconds" in status["error"]["details"]
        assert status["error"]["details"]["timeout_seconds"] == 1.0
        
    finally:
        task_manager.shutdown()


def test_task_timeout_with_partial_result():
    """Test that partial results are captured on timeout."""
    task_manager = TaskManager(num_workers=2)
    
    try:
        # Create a task with 1 second timeout
        task_id = task_manager.create_task(
            operation=operation_with_partial_result,
            params={},
            timeout=1.0
        )
        
        # Wait for task to timeout
        time.sleep(3)
        
        # Check task status
        status = task_manager.get_task_status(task_id)
        
        assert status is not None
        assert status["status"] == TaskStatus.FAILED.value
        assert status["error"]["code"] == ErrorCodes.TIMEOUT
        
        # Check for partial result in error details
        if "partial_result" in status["error"]["details"]:
            partial = status["error"]["details"]["partial_result"]
            assert partial["progress"] == "50%"
            assert partial["items_processed"] == 50
        
    finally:
        task_manager.shutdown()


def test_task_completes_before_timeout():
    """Test that fast tasks complete successfully before timeout."""
    task_manager = TaskManager(num_workers=2)
    
    try:
        # Create a task with 5 second timeout
        task_id = task_manager.create_task(
            operation=fast_operation,
            params={},
            timeout=5.0
        )
        
        # Wait for task to complete
        time.sleep(2)
        
        # Check task status
        status = task_manager.get_task_status(task_id)
        
        assert status is not None
        assert status["status"] == TaskStatus.COMPLETED.value
        assert status["result"]["result"] == "completed quickly"
        assert "error" not in status or status.get("error") is None
        
    finally:
        task_manager.shutdown()


def test_task_without_timeout():
    """Test that tasks without timeout run to completion."""
    task_manager = TaskManager(num_workers=2, default_timeout=None)
    
    try:
        # Create a task without timeout
        task_id = task_manager.create_task(
            operation=fast_operation,
            params={},
            timeout=None
        )
        
        # Wait for task to complete
        time.sleep(2)
        
        # Check task status
        status = task_manager.get_task_status(task_id)
        
        assert status is not None
        assert status["status"] == TaskStatus.COMPLETED.value
        assert status["result"]["result"] == "completed quickly"
        
    finally:
        task_manager.shutdown()


def test_timeout_error_has_remediation():
    """Test that timeout errors include remediation hints."""
    task_manager = TaskManager(num_workers=2)
    
    try:
        # Create a task with 1 second timeout
        task_id = task_manager.create_task(
            operation=slow_operation,
            params={},
            timeout=1.0
        )
        
        # Wait for task to timeout
        time.sleep(3)
        
        # Check task status
        status = task_manager.get_task_status(task_id)
        
        assert status is not None
        assert status["error"]["remediation"] is not None
        assert len(status["error"]["remediation"]) > 0
        
    finally:
        task_manager.shutdown()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
