"""
AI Workflow Management API
Phase 11: Workflow Orchestration
"""

import logging
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, HTTPException, BackgroundTasks, Depends
from pydantic import BaseModel, Field

from backend.auth import verify_jwt_token
from backend.ai_workflow_orchestrator import (
    get_workflow_orchestrator,
    WorkflowRequest,
    WorkflowInstance,
    WorkflowStepType,
    WorkflowStatus
)

# Import AsyncTaskQueue for advanced workflow processing
try:
    from src.async_task_queue import (
        get_async_task_queue,
        TaskPriority,
        TaskState
    )
    ASYNC_QUEUE_AVAILABLE = True
except ImportError:
    ASYNC_QUEUE_AVAILABLE = False
    logging.warning("AsyncTaskQueue not available, using basic background tasks")

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/ai/workflow",
    tags=["ai-workflow"],
    responses={404: {"description": "Resource not found"}}
)

# ============================================================================
# Helper Functions for AsyncTaskQueue Integration
# ============================================================================

def _get_queue_priority(priority: int) -> TaskPriority:
    """Convert numeric priority (1-10) to TaskPriority enum."""
    if priority <= 2:
        return TaskPriority.CRITICAL
    elif priority <= 4:
        return TaskPriority.HIGH
    elif priority <= 7:
        return TaskPriority.NORMAL
    else:
        return TaskPriority.LOW


async def submit_workflow_to_queue(
    workflow_id: str,
    coroutine,
    priority: int = 5,
    timeout_seconds: int = 3600
) -> bool:
    """
    Submit a workflow to the AsyncTaskQueue for advanced processing.
    
    Args:
        workflow_id: Unique workflow identifier
        coroutine: Async function to execute
        priority: Workflow priority (1 = highest, 10 = lowest)
        timeout_seconds: Maximum execution time (default 1 hour for workflows)
    
    Returns:
        True if submission succeeded
    """
    if not ASYNC_QUEUE_AVAILABLE:
        return False
    
    try:
        queue = get_async_task_queue()
        await queue.submit_task(
            task_id=workflow_id,
            coroutine=coroutine,
            priority=_get_queue_priority(priority),
            timeout_seconds=timeout_seconds
        )
        logger.info(f"Workflow {workflow_id} submitted to AsyncTaskQueue with priority {priority}")
        return True
    except Exception as e:
        logger.error(f"Failed to submit workflow {workflow_id} to AsyncTaskQueue: {e}")
        return False


async def get_workflow_queue_status(workflow_id: str) -> Optional[Dict[str, Any]]:
    """
    Get the status of a workflow in the AsyncTaskQueue.
    
    Args:
        workflow_id: Workflow identifier
    
    Returns:
        Status dict or None if not found
    """
    if not ASYNC_QUEUE_AVAILABLE:
        return None
    
    try:
        queue = get_async_task_queue()
        return await queue.get_task_status(workflow_id)
    except Exception as e:
        logger.debug(f"Could not get status for workflow {workflow_id}: {e}")
        return None


async def cancel_workflow_in_queue(workflow_id: str) -> bool:
    """
    Cancel a workflow in the AsyncTaskQueue.
    
    Args:
        workflow_id: Workflow identifier to cancel
    
    Returns:
        True if cancellation succeeded
    """
    if not ASYNC_QUEUE_AVAILABLE:
        return False
    
    try:
        queue = get_async_task_queue()
        return await queue.cancel_task(workflow_id)
    except Exception as e:
        logger.error(f"Failed to cancel workflow {workflow_id} in AsyncTaskQueue: {e}")
        return False


def get_workflow_queue_stats() -> Optional[Dict[str, Any]]:
    """
    Get comprehensive statistics from AsyncTaskQueue for workflows.
    
    Returns:
        Statistics dict or None if queue unavailable
    """
    if not ASYNC_QUEUE_AVAILABLE:
        return None
    
    try:
        queue = get_async_task_queue()
        return queue.get_queue_statistics()
    except Exception as e:
        logger.debug(f"Could not get AsyncTaskQueue stats: {e}")
        return None

# ============ Modèles Pydantic ============

class WorkflowCreateRequest(BaseModel):
    name: str = Field(..., description="Nom du workflow")
    project_id: str = Field(..., description="ID du projet associé")
    steps: List[WorkflowStepType] = Field(..., description="Séquence d'étapes à exécuter")
    initial_context: Dict[str, Any] = Field(default={}, description="Contexte initial (prompts, paths, presets)")
    priority: int = Field(default=5, ge=1, le=10)

class WorkflowResponse(BaseModel):
    success: bool
    workflow_id: str
    message: str

# ============ Endpoints ============

@router.post("/run", response_model=WorkflowResponse)
async def run_workflow(
    request: WorkflowCreateRequest,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(verify_jwt_token)
):
    """Lancer un flux de travail AI multi-étapes en arrière-plan via AsyncTaskQueue."""
    try:
        orchestrator = get_workflow_orchestrator()
        
        # Create persistent request
        wf_req = WorkflowRequest(
            name=request.name,
            project_id=request.project_id,
            steps=request.steps,
            initial_context=request.initial_context,
            priority=request.priority
        )
        
        instance = await orchestrator.create_workflow(wf_req)
        
        # Try to submit to AsyncTaskQueue first for advanced queue management
        if ASYNC_QUEUE_AVAILABLE:
            # Create a coroutine that wraps the workflow execution
            async def execute_workflow_task():
                await orchestrator.execute_workflow(instance.id)
            
            success = await submit_workflow_to_queue(
                workflow_id=instance.id,
                coroutine=execute_workflow_task,
                priority=request.priority,
                timeout_seconds=3600  # 1 hour for workflows
            )
            
            if success:
                logger.info(f"Workflow {instance.id} submitted to AsyncTaskQueue")
            else:
                # Fallback to BackgroundTasks if AsyncTaskQueue submission failed
                background_tasks.add_task(orchestrator.execute_workflow, instance.id)
                logger.warning(f"AsyncTaskQueue unavailable, using BackgroundTasks for workflow {instance.id}")
        else:
            # Fallback to BackgroundTasks if AsyncTaskQueue is not available
            background_tasks.add_task(orchestrator.execute_workflow, instance.id)
            logger.info(f"Workflow {instance.id} submitted to BackgroundTasks (AsyncTaskQueue not available)")
        
        return WorkflowResponse(
            success=True,
            workflow_id=instance.id,
            message=f"Workflow '{request.name}' démarré avec {len(request.steps)} étapes."
        )
    except Exception as e:
        logger.error(f"Error starting workflow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/queue/status", response_model=Dict[str, Any])
async def get_workflow_queue_status_route(user_id: str = Depends(verify_jwt_token)):
    """Obtenir le statut de la AsyncTaskQueue pour les workflows."""
    stats = get_workflow_queue_stats()
    if not stats:
        raise HTTPException(status_code=503, detail="AsyncTaskQueue not available")
    return stats


@router.get("/{workflow_id}/queue-status", response_model=Dict[str, Any])
async def get_workflow_queue_status_route(workflow_id: str, user_id: str = Depends(verify_jwt_token)):
    """Obtenir le statut d'un workflow dans la AsyncTaskQueue."""
    status = await get_workflow_queue_status(workflow_id)
    if not status:
        raise HTTPException(status_code=404, detail="Workflow not found in queue")
    return status


@router.post("/{workflow_id}/cancel", response_model=Dict[str, str])
async def cancel_workflow_route(workflow_id: str, user_id: str = Depends(verify_jwt_token)):
    """Annuler un workflow en cours dans la AsyncTaskQueue."""
    success = await cancel_workflow_in_queue(workflow_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to cancel workflow in queue")
    return {"message": "Workflow cancelled", "workflow_id": workflow_id}

@router.get("/{workflow_id}", response_model=WorkflowInstance)
async def get_workflow_status(workflow_id: str, user_id: str = Depends(verify_jwt_token)):
    """Obtenir le statut détaillé d'un workflow en cours ou terminé."""
    orchestrator = get_workflow_orchestrator()
    instance = orchestrator.get_workflow_status(workflow_id)
    
    if not instance:
        raise HTTPException(status_code=404, detail="Workflow non trouvé")
        
    return instance

@router.get("/templates/available", response_model=List[Dict[str, Any]])
async def list_workflow_templates(user_id: str = Depends(verify_jwt_token)):
    """Lister les modèles de workflow prédéfinis."""
    return [
        {
            "id": "cinematic_hero",
            "name": "Cinematic Hero Shot",
            "description": "Generate image -> Extract Character -> Generate Video -> Color Grade",
            "steps": ["generate_image", "extract_identity", "generate_video", "color_grade"]
        },
        {
            "id": "batch_identity_promo",
            "name": "Batch Identity Promo",
            "description": "Extract Identity -> Generate 5 Videos -> Apply VFX",
            "steps": ["extract_identity", "generate_video", "apply_vfx"]
        }
    ]
