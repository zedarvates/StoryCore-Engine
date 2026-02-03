"""
Project generation endpoints for StoryCore AI Assistant API.
"""

from fastapi import APIRouter, Depends, HTTPException

from ...storycore_assistant import StoryCoreAssistant
from ...auth import User
from ...exceptions import ValidationError, StorageLimitExceededError
from ..dependencies import get_current_user
from ..models import (
    GenerateProjectRequest, GenerateProjectResponse,
    FinalizeProjectRequest, FinalizeProjectResponse,
    ScenePreview, CharacterPreview, SequencePreview, ShotPreview
)
from ...logging_config import get_logger

logger = get_logger(__name__)

router = APIRouter()

# This will be injected from app.py
assistant: StoryCoreAssistant = None


def init_generation_routes(asst: StoryCoreAssistant):
    """Initialize route dependencies"""
    global assistant
    assistant = asst


@router.post("/project", response_model=GenerateProjectResponse)
async def generate_project(request: GenerateProjectRequest, user: User = Depends(get_current_user)):
    """
    Generate a new project from a natural language prompt.
    
    Creates a preview that can be reviewed before finalization.
    
    Args:
        request: Generation request with prompt and preferences
        user: Authenticated user
        
    Returns:
        Project preview with generated content
        
    Raises:
        HTTPException: If generation fails
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    logger.info(f"Generating project for user: {user.username}")
    logger.info(f"Prompt: {request.prompt[:100]}...")
    
    try:
        # Generate project preview
        preview = assistant.generate_project(
            prompt=request.prompt,
            language=request.language,
            preferences=request.preferences
        )
        
        # Convert to response format
        scenes = [
            ScenePreview(
                id=scene.id,
                number=scene.number,
                title=scene.title,
                description=scene.description,
                location=scene.location,
                time_of_day=scene.time_of_day,
                duration=scene.duration,
                characters=scene.characters,
                key_actions=scene.key_actions,
                visual_notes=scene.visual_notes
            )
            for scene in preview.generated_project.scenes
        ]
        
        characters = [
            CharacterPreview(
                id=char.id,
                name=char.name,
                role=char.role,
                description=char.description,
                appearance=char.appearance,
                personality=char.personality
            )
            for char in preview.generated_project.characters
        ]
        
        sequences = [
            SequencePreview(
                id=seq.id,
                scene_id=seq.scene_id,
                total_duration=seq.total_duration,
                shots=[
                    ShotPreview(
                        id=shot.id,
                        number=shot.number,
                        type=shot.type,
                        camera_movement=shot.camera_movement,
                        duration=shot.duration,
                        description=shot.description,
                        visual_style=shot.visual_style
                    )
                    for shot in seq.shots
                ]
            )
            for seq in preview.generated_project.sequences
        ]
        
        logger.info(f"Project preview created: {preview.preview_id}")
        
        return GenerateProjectResponse(
            preview_id=preview.preview_id,
            project_name=preview.generated_project.name,
            scenes=scenes,
            characters=characters,
            sequences=sequences,
            estimated_size_mb=10.0,  # Estimate
            estimated_file_count=50  # Estimate
        )
        
    except StorageLimitExceededError as e:
        logger.error(f"Storage limit exceeded: {e}")
        raise HTTPException(status_code=507, detail=str(e))
    except ValidationError as e:
        logger.error(f"Validation error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Project generation failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Project generation failed: {str(e)}")


@router.post("/finalize", response_model=FinalizeProjectResponse)
async def finalize_project(request: FinalizeProjectRequest, user: User = Depends(get_current_user)):
    """
    Finalize a project preview and save it to disk.
    
    Args:
        request: Preview ID to finalize
        user: Authenticated user
        
    Returns:
        Finalized project information
        
    Raises:
        HTTPException: If preview not found or finalization fails
    """
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    logger.info(f"Finalizing project preview: {request.preview_id} for user: {user.username}")
    
    try:
        # Finalize project
        project = assistant.finalize_project(request.preview_id)
        
        logger.info(f"Project finalized: {project.name}")
        
        return FinalizeProjectResponse(
            project_name=project.name,
            project_path=str(project.path),
            created_at=project.created_at
        )
        
    except Exception as e:
        logger.error(f"Project finalization failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Project finalization failed: {str(e)}")
