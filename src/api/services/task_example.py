"""
Example usage of the Task Management System

This module demonstrates how to use the TaskManager for async operations.
"""

import time
from src.api import TaskManager, APIRouter
from src.api.config import APIConfig
from src.api.task_routes import register_task_endpoints
from src.api.models import RequestContext


def example_long_running_operation(params, task):
    """
    Example of a long-running operation that can be executed asynchronously.
    
    Args:
        params: Operation parameters
        task: Task object for progress updates and cancellation checks
        
    Returns:
        Operation result
    """
    total_steps = params.get("steps", 10)
    
    for i in range(total_steps):
        # Check if task was cancelled
        if task.is_cancelled():
            return {
                "status": "cancelled",
                "completed_steps": i,
                "total_steps": total_steps
            }
        
        # Simulate work
        time.sleep(0.5)
        
        # Update progress
        task.update_progress((i + 1) / total_steps)
        
        # Store partial result in case of timeout
        task.partial_result = {
            "completed_steps": i + 1,
            "total_steps": total_steps,
            "progress_percentage": ((i + 1) / total_steps) * 100
        }
    
    return {
        "status": "completed",
        "completed_steps": total_steps,
        "total_steps": total_steps,
        "message": "Operation completed successfully"
    }


def example_basic_usage():
    """Example: Basic task creation and status polling."""
    print("=== Example 1: Basic Task Usage ===\n")
    
    # Initialize task manager
    task_manager = TaskManager(num_workers=2)
    
    try:
        # Create a task
        task_id = task_manager.create_task(
            operation=example_long_running_operation,
            params={"steps": 5}
        )
        
        print(f"Created task: {task_id}")
        
        # Poll status until complete
        while True:
            status = task_manager.get_task_status(task_id)
            print(f"Status: {status['status']}, Progress: {status['progress']:.0%}")
            
            if status['status'] in ['completed', 'failed', 'cancelled']:
                break
            
            time.sleep(1)
        
        # Get final result
        if status['status'] == 'completed':
            print(f"Result: {status['result']}")
        else:
            print(f"Error: {status.get('error')}")
    
    finally:
        task_manager.shutdown()


def example_with_timeout():
    """Example: Task with timeout."""
    print("\n=== Example 2: Task with Timeout ===\n")
    
    task_manager = TaskManager(num_workers=2)
    
    try:
        # Create a task with 2 second timeout (will timeout)
        task_id = task_manager.create_task(
            operation=example_long_running_operation,
            params={"steps": 10},  # Takes ~5 seconds
            timeout=2.0
        )
        
        print(f"Created task with 2s timeout: {task_id}")
        
        # Wait for timeout
        time.sleep(4)
        
        # Check status
        status = task_manager.get_task_status(task_id)
        print(f"Status: {status['status']}")
        
        if status['status'] == 'failed':
            error = status['error']
            print(f"Error Code: {error['code']}")
            print(f"Error Message: {error['message']}")
            print(f"Remediation: {error['remediation']}")
            
            if 'partial_result' in error['details']:
                print(f"Partial Result: {error['details']['partial_result']}")
    
    finally:
        task_manager.shutdown()


def example_with_cancellation():
    """Example: Cancelling a running task."""
    print("\n=== Example 3: Task Cancellation ===\n")
    
    task_manager = TaskManager(num_workers=2)
    
    try:
        # Create a task
        task_id = task_manager.create_task(
            operation=example_long_running_operation,
            params={"steps": 10}
        )
        
        print(f"Created task: {task_id}")
        
        # Let it run for a bit
        time.sleep(2)
        
        # Cancel the task
        print("Cancelling task...")
        cancelled = task_manager.cancel_task(task_id)
        print(f"Cancellation requested: {cancelled}")
        
        # Wait for cancellation to take effect
        time.sleep(2)
        
        # Check final status
        status = task_manager.get_task_status(task_id)
        print(f"Final Status: {status['status']}")
        
        if status['status'] == 'completed':
            print(f"Result: {status['result']}")
    
    finally:
        task_manager.shutdown()


def example_with_api_endpoints():
    """Example: Using task management through API endpoints."""
    print("\n=== Example 4: API Endpoints ===\n")
    
    # Setup
    config = APIConfig()
    router = APIRouter(config)
    task_manager = TaskManager(num_workers=2)
    
    try:
        # Register task endpoints
        register_task_endpoints(router, task_manager)
        
        # Create a task directly
        task_id = task_manager.create_task(
            operation=example_long_running_operation,
            params={"steps": 5}
        )
        
        print(f"Created task: {task_id}")
        
        # Use API endpoint to check status
        context = RequestContext()
        response = router.route_request(
            path="storycore.task.status",
            method="GET",
            params={"task_id": task_id},
            context=context
        )
        
        print(f"API Response Status: {response.status}")
        print(f"Task Status: {response.data['status']}")
        print(f"Task Progress: {response.data['progress']:.0%}")
        
        # Wait a bit
        time.sleep(3)
        
        # Use API endpoint to cancel
        context = RequestContext()
        response = router.route_request(
            path="storycore.task.cancel",
            method="POST",
            params={"task_id": task_id},
            context=context
        )
        
        print(f"Cancel Response: {response.data}")
    
    finally:
        task_manager.shutdown()


def example_concurrent_tasks():
    """Example: Running multiple tasks concurrently."""
    print("\n=== Example 5: Concurrent Tasks ===\n")
    
    task_manager = TaskManager(num_workers=4)
    
    try:
        # Create multiple tasks
        task_ids = []
        for i in range(5):
            task_id = task_manager.create_task(
                operation=example_long_running_operation,
                params={"steps": 3}
            )
            task_ids.append(task_id)
            print(f"Created task {i+1}: {task_id}")
        
        # Get stats
        stats = task_manager.get_stats()
        print(f"\nTask Manager Stats:")
        print(f"  Total Tasks: {stats['total_tasks']}")
        print(f"  Workers: {stats['num_workers']}")
        print(f"  Queue Size: {stats['queue_size']}")
        
        # Wait for completion
        print("\nWaiting for tasks to complete...")
        time.sleep(5)
        
        # Check all tasks
        for i, task_id in enumerate(task_ids):
            status = task_manager.get_task_status(task_id)
            print(f"Task {i+1}: {status['status']}")
        
        # Final stats
        stats = task_manager.get_stats()
        print(f"\nFinal Stats:")
        print(f"  Completed: {stats['status_counts']['completed']}")
        print(f"  Failed: {stats['status_counts']['failed']}")
    
    finally:
        task_manager.shutdown()


if __name__ == "__main__":
    # Run all examples
    example_basic_usage()
    example_with_timeout()
    example_with_cancellation()
    example_with_api_endpoints()
    example_concurrent_tasks()
    
    print("\n=== All Examples Complete ===")
