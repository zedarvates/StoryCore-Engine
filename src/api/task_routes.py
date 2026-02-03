"""
Task Management API Routes

This module provides API endpoints for task management:
- storycore.task.status: Get task status
- storycore.task.cancel: Cancel a running task
"""

from typing import Dict, Any
from .models import APIResponse, RequestContext, ResponseMetadata, ErrorDetails, ErrorCodes
from .services import TaskManager
from datetime import datetime


def register_task_endpoints(router, task_manager: TaskManager) -> None:
    """
    Register task management endpoints with the router.
    
    Args:
        router: APIRouter instance
        task_manager: TaskManager instance
    """
    
    # Task status endpoint
    router.register_endpoint(
        path="storycore.task.status",
        method="GET",
        handler=lambda params, context: get_task_status(params, context, task_manager),
        schema={
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "minLength": 1}
            },
            "required": ["task_id"]
        },
        async_capable=False,
        requires_auth=False,
        description="Get the status of an asynchronous task"
    )
    
    # Task cancellation endpoint
    router.register_endpoint(
        path="storycore.task.cancel",
        method="POST",
        handler=lambda params, context: cancel_task(params, context, task_manager),
        schema={
            "type": "object",
            "properties": {
                "task_id": {"type": "string", "minLength": 1}
            },
            "required": ["task_id"]
        },
        async_capable=False,
        requires_auth=False,
        description="Cancel a running asynchronous task"
    )


def get_task_status(
    params: Dict[str, Any],
    context: RequestContext,
    task_manager: TaskManager
) -> APIResponse:
    """
    Get the status of an asynchronous task.
    
    Args:
        params: Request parameters containing task_id
        context: Request context
        task_manager: TaskManager instance
        
    Returns:
        API response with task status
    """
    task_id = params["task_id"]
    
    # Get task status
    task_status = task_manager.get_task_status(task_id)
    
    if task_status is None:
        # Task not found
        error = ErrorDetails(
            code=ErrorCodes.NOT_FOUND,
            message=f"Task not found: {task_id}",
            remediation="Verify the task ID is correct"
        )
        
        return APIResponse(
            status="error",
            error=error,
            metadata=ResponseMetadata(
                request_id=context.request_id,
                timestamp=datetime.now(),
                duration_ms=context.get_duration_ms(),
                api_version="v1"
            )
        )
    
    # Return task status
    return APIResponse(
        status="success",
        data=task_status,
        metadata=ResponseMetadata(
            request_id=context.request_id,
            timestamp=datetime.now(),
            duration_ms=context.get_duration_ms(),
            api_version="v1"
        )
    )


def cancel_task(
    params: Dict[str, Any],
    context: RequestContext,
    task_manager: TaskManager
) -> APIResponse:
    """
    Cancel a running asynchronous task.
    
    Args:
        params: Request parameters containing task_id
        context: Request context
        task_manager: TaskManager instance
        
    Returns:
        API response indicating cancellation result
    """
    task_id = params["task_id"]
    
    # Attempt to cancel task
    cancelled = task_manager.cancel_task(task_id)
    
    if not cancelled:
        # Task not found or already finished
        task_status = task_manager.get_task_status(task_id)
        
        if task_status is None:
            error = ErrorDetails(
                code=ErrorCodes.NOT_FOUND,
                message=f"Task not found: {task_id}",
                remediation="Verify the task ID is correct"
            )
        else:
            error = ErrorDetails(
                code=ErrorCodes.CONFLICT,
                message=f"Task cannot be cancelled (status: {task_status['status']})",
                details={"current_status": task_status['status']},
                remediation="Task has already completed, failed, or been cancelled"
            )
        
        return APIResponse(
            status="error",
            error=error,
            metadata=ResponseMetadata(
                request_id=context.request_id,
                timestamp=datetime.now(),
                duration_ms=context.get_duration_ms(),
                api_version="v1"
            )
        )
    
    # Return success
    return APIResponse(
        status="success",
        data={
            "task_id": task_id,
            "cancelled": True,
            "message": "Task cancellation requested"
        },
        metadata=ResponseMetadata(
            request_id=context.request_id,
            timestamp=datetime.now(),
            duration_ms=context.get_duration_ms(),
            api_version="v1"
        )
    )
