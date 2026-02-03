"""
Project management endpoints for StoryCore AI Assistant API.
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import List

from ...storycore_assistant import StoryCoreAssistant
from ...auth import User
from ...exceptions import ProjectError, ResourceError
from ..dependencies import get_current_user
from ..models import (
    OpenProjectRequest, OpenProjectResponse,
    CloseProjectRequest, CloseProjectResponse,
    ListProjectsResponse,
    DeleteProjectResponse
)
from ...logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter()

# This will be injected from app.py
assistant: StoryCoreAssistant = None


def init_project_routes(asst: StoryCoreAssistant):
    """Initialize route dependencies"""
    global assistant
    assistant = asst


@router.post("/open", response_model=OpenProjectResponse)
async def open_project(request: OpenProjectRequest, user: User = Depends(get_current_user)):
    """
    Open an existing project.
    
    Args:
        request: Project name to open
        user: Authenticated user
        
    Returns:
        Project information
        
    Raises:
        HTTPException: If project not found or cannot be opened
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    logger.info(f"Opening project: {request.project_name} for user: {user.username}")
    
    try:
        project = assistant.open_project(request.project_name)
        
        return OpenProjectResponse(
            project_name=project.name,
            scene_count=len(project.scenes),
            character_count=len(project.characters),
            sequence_count=len(project.sequences),
            created_at=project.created_at,
            modified_at=project.modified_at
        )
    except ResourceError as e:
        logger.error(f"Project not found: {request.project_name}")
        raise HTTPException(status_code=404, detail=str(e))
    except ProjectError as e:
        logger.error(f"Failed to open project: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/close", response_model=CloseProjectResponse)
async def close_project(request: CloseProjectRequest, user: User = Depends(get_current_user)):
    """
    Close the active project.
    
    Args:
        request: Close options (save flag)
        user: Authenticated user
        
    Returns:
        Confirmation message
        
    Raises:
        HTTPException: If no active project or close fails
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    logger.info(f"Closing project (save={request.save}) for user: {user.username}")
    
    try:
        if not assistant.has_active_project():
            raise HTTPException(status_code=400, detail="No active project to close")
        
        assistant.close_project(save=request.save)
        
        return CloseProjectResponse(
            message="Project closed successfully",
            saved=request.save
        )
    except ProjectError as e:
        logger.error(f"Failed to close project: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/list", response_model=ListProjectsResponse)
async def list_projects(user: User = Depends(get_current_user)):
    """
    List all available projects.
    
    Args:
        user: Authenticated user
        
    Returns:
        List of project names
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    logger.info(f"Listing projects for user: {user.username}")
    
    projects = assistant.list_projects()
    
    return ListProjectsResponse(
        projects=projects,
        total_count=len(projects)
    )


@router.delete("/{project_name}", response_model=DeleteProjectResponse)
async def delete_project(
    project_name: str,
    confirmed: bool = False,
    user: User = Depends(get_current_user)
):
    """
    Delete a project.
    
    Args:
        project_name: Name of project to delete
        confirmed: Confirmation flag
        user: Authenticated user
        
    Returns:
        Confirmation message
        
    Raises:
        HTTPException: If project not found or deletion fails
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if not confirmed:
        raise HTTPException(
            status_code=400,
            detail="Deletion requires confirmation. Set confirmed=true"
        )
    
    logger.info(f"Deleting project: {project_name} for user: {user.username}")
    
    try:
        # Get project path
        project_path = assistant.file_ops.project_directory / project_name
        
        if not project_path.exists():
            raise HTTPException(status_code=404, detail=f"Project not found: {project_name}")
        
        # Delete project directory
        import shutil
        shutil.rmtree(project_path)
        
        logger.info(f"Project deleted: {project_name}")
        
        return DeleteProjectResponse(
            message=f"Project '{project_name}' deleted successfully",
            deleted_project=project_name
        )
    except Exception as e:
        logger.error(f"Failed to delete project: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete project: {str(e)}")
