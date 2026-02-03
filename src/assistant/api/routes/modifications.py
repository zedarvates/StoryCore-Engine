"""
Project modification endpoints for StoryCore AI Assistant API.
"""

from fastapi import APIRouter, Depends, HTTPException

from ...storycore_assistant import StoryCoreAssistant
from ...auth import User
from ...exceptions import ProjectError, ResourceError, ValidationError
from ..dependencies import get_current_user
from ..models import (
    ModifySceneRequest, ModifyCharacterRequest, ModifySequenceRequest,
    AddSceneRequest, RemoveSceneRequest, ModificationResponse
)
from ...logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter()

# This will be injected from app.py
assistant: StoryCoreAssistant = None


def init_modification_routes(asst: StoryCoreAssistant):
    """Initialize route dependencies"""
    global assistant
    assistant = asst


@router.patch("/{project_id}/scenes/{scene_id}", response_model=ModificationResponse)
async def modify_scene(
    project_id: str,
    scene_id: str,
    request: ModifySceneRequest,
    user: User = Depends(get_current_user)
):
    """
    Modify a scene in the active project.
    
    Args:
        project_id: Project identifier (currently unused, uses active project)
        scene_id: Scene ID to modify
        request: Scene modifications
        user: Authenticated user
        
    Returns:
        Confirmation message
        
    Raises:
        HTTPException: If no active project or modification fails
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if not assistant.has_active_project():
        raise HTTPException(status_code=400, detail="No active project. Open a project first.")
    
    logger.info(f"Modifying scene {scene_id} for user: {user.username}")
    
    try:
        # Build updates dict from request
        updates = {}
        if request.title is not None:
            updates["title"] = request.title
        if request.description is not None:
            updates["description"] = request.description
        if request.location is not None:
            updates["location"] = request.location
        if request.time_of_day is not None:
            updates["time_of_day"] = request.time_of_day
        if request.duration is not None:
            updates["duration"] = request.duration
        if request.characters is not None:
            updates["characters"] = request.characters
        if request.key_actions is not None:
            updates["key_actions"] = request.key_actions
        if request.visual_notes is not None:
            updates["visual_notes"] = request.visual_notes
        
        # Apply modifications
        assistant.modify_scene(scene_id, updates)
        
        logger.info(f"Scene {scene_id} modified successfully")
        
        return ModificationResponse(
            message=f"Scene {scene_id} modified successfully",
            modified_element_id=scene_id
        )
        
    except ResourceError as e:
        logger.error(f"Scene not found: {scene_id}")
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except ProjectError as e:
        logger.error(f"Modification failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{project_id}/characters/{character_id}", response_model=ModificationResponse)
async def modify_character(
    project_id: str,
    character_id: str,
    request: ModifyCharacterRequest,
    user: User = Depends(get_current_user)
):
    """
    Modify a character in the active project.
    
    Args:
        project_id: Project identifier (currently unused, uses active project)
        character_id: Character ID to modify
        request: Character modifications
        user: Authenticated user
        
    Returns:
        Confirmation message
        
    Raises:
        HTTPException: If no active project or modification fails
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if not assistant.has_active_project():
        raise HTTPException(status_code=400, detail="No active project. Open a project first.")
    
    logger.info(f"Modifying character {character_id} for user: {user.username}")
    
    try:
        # Build updates dict from request
        updates = {}
        if request.name is not None:
            updates["name"] = request.name
        if request.role is not None:
            updates["role"] = request.role
        if request.description is not None:
            updates["description"] = request.description
        if request.appearance is not None:
            updates["appearance"] = request.appearance
        if request.personality is not None:
            updates["personality"] = request.personality
        
        # Apply modifications
        assistant.modify_character(character_id, updates)
        
        logger.info(f"Character {character_id} modified successfully")
        
        return ModificationResponse(
            message=f"Character {character_id} modified successfully",
            modified_element_id=character_id
        )
        
    except ResourceError as e:
        logger.error(f"Character not found: {character_id}")
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except ProjectError as e:
        logger.error(f"Modification failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{project_id}/sequences/{sequence_id}", response_model=ModificationResponse)
async def modify_sequence(
    project_id: str,
    sequence_id: str,
    request: ModifySequenceRequest,
    user: User = Depends(get_current_user)
):
    """
    Modify a sequence in the active project.
    
    Args:
        project_id: Project identifier (currently unused, uses active project)
        sequence_id: Sequence ID to modify
        request: Sequence modifications
        user: Authenticated user
        
    Returns:
        Confirmation message
        
    Raises:
        HTTPException: If no active project or modification fails
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if not assistant.has_active_project():
        raise HTTPException(status_code=400, detail="No active project. Open a project first.")
    
    logger.info(f"Modifying sequence {sequence_id} for user: {user.username}")
    
    try:
        # Build updates dict from request
        updates = {}
        if request.total_duration is not None:
            updates["total_duration"] = request.total_duration
        if request.shots is not None:
            updates["shots"] = request.shots
        
        # Apply modifications
        assistant.modify_sequence(sequence_id, updates)
        
        logger.info(f"Sequence {sequence_id} modified successfully")
        
        return ModificationResponse(
            message=f"Sequence {sequence_id} modified successfully",
            modified_element_id=sequence_id
        )
        
    except ResourceError as e:
        logger.error(f"Sequence not found: {sequence_id}")
        raise HTTPException(status_code=404, detail=str(e))
    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except ProjectError as e:
        logger.error(f"Modification failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{project_id}/scenes", response_model=ModificationResponse)
async def add_scene(
    project_id: str,
    request: AddSceneRequest,
    user: User = Depends(get_current_user)
):
    """
    Add a new scene to the active project.
    
    Args:
        project_id: Project identifier (currently unused, uses active project)
        request: Scene data
        user: Authenticated user
        
    Returns:
        Confirmation message
        
    Raises:
        HTTPException: If no active project or addition fails
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if not assistant.has_active_project():
        raise HTTPException(status_code=400, detail="No active project. Open a project first.")
    
    logger.info(f"Adding scene to project for user: {user.username}")
    
    try:
        # Convert request to dict
        scene_data = {
            "id": request.id,
            "number": request.number,
            "title": request.title,
            "description": request.description,
            "location": request.location,
            "time_of_day": request.time_of_day,
            "duration": request.duration,
            "characters": request.characters,
            "key_actions": request.key_actions,
            "visual_notes": request.visual_notes
        }
        
        # Add scene
        assistant.add_scene(scene_data)
        
        logger.info(f"Scene {request.id} added successfully")
        
        return ModificationResponse(
            message=f"Scene {request.id} added successfully",
            modified_element_id=request.id
        )
        
    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except ProjectError as e:
        logger.error(f"Addition failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/{project_id}/scenes/{scene_id}", response_model=ModificationResponse)
async def remove_scene(
    project_id: str,
    scene_id: str,
    confirmed: bool = False,
    user: User = Depends(get_current_user)
):
    """
    Remove a scene from the active project.
    
    Args:
        project_id: Project identifier (currently unused, uses active project)
        scene_id: Scene ID to remove
        confirmed: Confirmation flag
        user: Authenticated user
        
    Returns:
        Confirmation message
        
    Raises:
        HTTPException: If no active project or removal fails
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    if not assistant.has_active_project():
        raise HTTPException(status_code=400, detail="No active project. Open a project first.")
    
    if not confirmed:
        raise HTTPException(
            status_code=400,
            detail="Deletion requires confirmation. Set confirmed=true"
        )
    
    logger.info(f"Removing scene {scene_id} for user: {user.username}")
    
    try:
        # Remove scene
        assistant.remove_scene(scene_id, confirmed=True)
        
        logger.info(f"Scene {scene_id} removed successfully")
        
        return ModificationResponse(
            message=f"Scene {scene_id} removed successfully",
            modified_element_id=scene_id
        )
        
    except ResourceError as e:
        logger.error(f"Scene not found: {scene_id}")
        raise HTTPException(status_code=404, detail=str(e))
    except ProjectError as e:
        logger.error(f"Removal failed: {e}")
        raise HTTPException(status_code=400, detail=str(e))
