"""
StoryCore-Engine Shot Management API

This module provides REST API endpoints for shot management operations.
Supports CRUD operations for shots within projects.

Endpoints:
- POST /api/shots - Create a new shot
- GET /api/shots/:id - Get shot details
- PUT /api/shots/:id - Update shot
- DELETE /api/shots/:id - Delete shot
- GET /api/projects/:id/shots - List project shots

Requirements: Q1 2026 - Shot Management API
"""

import os
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from enum import Enum

from fastapi import APIRouter, HTTPException, status, Depends, Header
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

from backend.auth import verify_jwt_token
from backend.storage import JSONFileStorage

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()


class ShotStatus(str, Enum):
    """Shot status enumeration"""
    PENDING = "pending"
    GENERATING = "generating"
    COMPLETED = "completed"
    FAILED = "failed"
    ARCHIVED = "archived"


class ShotType(str, Enum):
    """Shot type enumeration"""
    ACTION = "action"
    DIALOGUE = "dialogue"
    TRANSITION = "transition"
    ESTABLISHING = "establishing"
    CLOSEUP = "closeup"
    WIDE = "wide"


class ShotBase(BaseModel):
    """Base shot model with common fields"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    prompt: str = Field(..., min_length=1)
    shot_type: ShotType = ShotType.ACTION
    duration_seconds: float = Field(default=5.0, ge=0.5, le=300)
    order_index: int = Field(default=0, ge=0)
    metadata: Dict[str, Any] = {}


class ShotCreate(ShotBase):
    """Model for creating a new shot"""
    project_id: str = Field(..., min_length=1)
    sequence_id: Optional[str] = None
    character_ids: List[str] = []
    asset_ids: List[str] = []


class ShotUpdate(BaseModel):
    """Model for updating a shot"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    prompt: Optional[str] = None
    shot_type: Optional[ShotType] = None
    duration_seconds: Optional[float] = Field(None, ge=0.5, le=300)
    order_index: Optional[int] = Field(None, ge=0)
    status: Optional[ShotStatus] = None
    metadata: Optional[Dict[str, Any]] = None
    character_ids: Optional[List[str]] = None
    asset_ids: Optional[List[str]] = None


class ShotResponse(BaseModel):
    """Response model for shot data"""
    id: str
    project_id: str
    sequence_id: Optional[str]
    name: str
    description: Optional[str]
    prompt: str
    shot_type: ShotType
    duration_seconds: float
    order_index: int
    status: ShotStatus
    metadata: Dict[str, Any]
    character_ids: List[str]
    asset_ids: List[str]
    result_url: Optional[str]
    thumbnail_url: Optional[str]
    created_at: datetime
    updated_at: datetime
    version: int = 1


class ShotListResponse(BaseModel):
    """Response model for listing shots"""
    shots: List[ShotResponse]
    total: int
    page: int
    page_size: int


# Import project API for validation
try:
    from backend.project_api import project_storage
    PROJECT_API_AVAILABLE = True
except ImportError:
    PROJECT_API_AVAILABLE = False
    logger.warning("Project API not available, shot validation will be limited")


# Initialize shared storage with LRU cache (max 1000 shot entries)
# Index by project_id for efficient project-based queries
shot_storage = JSONFileStorage("./data/shots", max_cache_size=1000, index_field="project_id")


@router.post("/shots", response_model=ShotResponse, status_code=status.HTTP_201_CREATED)
async def create_shot(
    shot: ShotCreate,
    user_id: str = Depends(verify_jwt_token)
) -> ShotResponse:
    """
    Create a new shot.
    
    Args:
        shot: Shot creation data
        user_id: Authenticated user ID
    
    Returns:
        Created shot details
    
    Raises:
        HTTPException: If validation fails or project not found
    """
    logger.info(f"Creating new shot '{shot.name}' for project {shot.project_id}")
    
    # Validate project exists and user has access
    if PROJECT_API_AVAILABLE:
        project = project_storage.load(shot.project_id)
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        if project.get("owner_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this project"
            )
    
    # Generate unique shot ID
    shot_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    # Build shot data
    shot_data = {
        "id": shot_id,
        "project_id": shot.project_id,
        "sequence_id": shot.sequence_id,
        "name": shot.name,
        "description": shot.description,
        "prompt": shot.prompt,
        "shot_type": shot.shot_type.value if hasattr(shot.shot_type, 'value') else shot.shot_type,
        "duration_seconds": shot.duration_seconds,
        "order_index": shot.order_index,
        "status": ShotStatus.PENDING.value,
        "metadata": shot.metadata,
        "character_ids": shot.character_ids,
        "asset_ids": shot.asset_ids,
        "result_url": None,
        "thumbnail_url": None,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "version": 1
    }
    
    # Save shot
    if not shot_storage.save(shot_id, shot_data):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create shot"
        )
    
    # Add to project
    if PROJECT_API_AVAILABLE:
        project = project_storage.load(shot.project_id)
        if project and "shots" in project:
            project["shots"].append(shot_id)
            project_storage.save(shot.project_id, project)
    
    logger.info(f"Shot created successfully: {shot_id}")
    
    return ShotResponse(**shot_data)


@router.get("/shots/{shot_id}", response_model=ShotResponse)
async def get_shot(
    shot_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> ShotResponse:
    """
    Get shot details by ID.
    
    Args:
        shot_id: Shot ID
        user_id: Authenticated user ID
    
    Returns:
        Shot details
    
    Raises:
        HTTPException: If shot not found
    """
    logger.info(f"Getting shot {shot_id}")
    
    shot = shot_storage.load(shot_id)
    
    if not shot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shot not found"
        )
    
    # Validate user has access to project
    if PROJECT_API_AVAILABLE:
        project = project_storage.load(shot.get("project_id"))
        if project and project.get("owner_id") != user_id and not project.get("is_public"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this shot"
            )
    
    return ShotResponse(**shot)


@router.put("/shots/{shot_id}", response_model=ShotResponse)
async def update_shot(
    shot_id: str,
    update: ShotUpdate,
    user_id: str = Depends(verify_jwt_token)
) -> ShotResponse:
    """
    Update shot details.
    
    Args:
        shot_id: Shot ID
        update: Update data
        user_id: Authenticated user ID
    
    Returns:
        Updated shot details
    
    Raises:
        HTTPException: If shot not found or access denied
    """
    logger.info(f"Updating shot {shot_id}")
    
    shot = shot_storage.load(shot_id)
    
    if not shot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shot not found"
        )
    
    # Validate user has access
    if PROJECT_API_AVAILABLE:
        project = project_storage.load(shot.get("project_id"))
        if project and project.get("owner_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project owner can update shots"
            )
    
    # Apply updates
    update_data = update.dict(exclude_unset=True)
    for key, value in update_data.items():
        if key == "status" and value:
            shot[key] = value.value if hasattr(value, 'value') else value
        elif key == "shot_type" and value:
            shot[key] = value.value if hasattr(value, 'value') else value
        elif value is not None:
            shot[key] = value
    
    # Update timestamp and version
    shot["updated_at"] = datetime.utcnow().isoformat()
    shot["version"] = shot.get("version", 1) + 1
    
    # Save shot
    if not shot_storage.save(shot_id, shot):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update shot"
        )
    
    logger.info(f"Shot {shot_id} updated successfully")
    
    return ShotResponse(**shot)


@router.delete("/shots/{shot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shot(
    shot_id: str,
    user_id: str = Depends(verify_jwt_token)
):
    """
    Delete a shot.
    
    Args:
        shot_id: Shot ID
        user_id: Authenticated user ID
    
    Raises:
        HTTPException: If shot not found or access denied
    """
    logger.info(f"Deleting shot {shot_id}")
    
    shot = shot_storage.load(shot_id)
    
    if not shot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shot not found"
        )
    
    # Validate user has access
    if PROJECT_API_AVAILABLE:
        project = project_storage.load(shot.get("project_id"))
        if project and project.get("owner_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project owner can delete shots"
            )
    
    # Delete shot
    if not shot_storage.delete(shot_id):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete shot"
        )
    
    logger.info(f"Shot {shot_id} deleted successfully")


@router.get("/projects/{project_id}/shots", response_model=ShotListResponse)
async def list_project_shots(
    project_id: str,
    page: int = 1,
    page_size: int = 20,
    status_filter: Optional[ShotStatus] = None,
    user_id: str = Depends(verify_jwt_token)
) -> ShotListResponse:
    """
    List all shots for a project.
    
    Args:
        project_id: Project ID
        page: Page number
        page_size: Shots per page
        status_filter: Optional status filter
        user_id: Authenticated user ID
    
    Returns:
        Paginated list of shots
    
    Raises:
        HTTPException: If project not found or access denied
    """
    logger.info(f"Listing shots for project {project_id}")
    
    # Validate project exists and user has access
    if PROJECT_API_AVAILABLE:
        project_data = project_storage.load(project_id) if 'load_project' not in globals() else load_project(project_id)
        # Using project_storage.load() directly if load_project wrapper is elusive
        if not project_data and PROJECT_API_AVAILABLE and 'project_storage' in globals():
             project_data = project_storage.load(project_id)

        if not project_data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        if project_data.get("owner_id") != user_id and not project_data.get("is_public"):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this project"
            )
    
    # Filter shots by project using storage index
    project_shots = shot_storage.get_by_owner(project_id)
    
    # Apply status filter
    if status_filter:
        status_value = status_filter.value if hasattr(status_filter, 'value') else status_filter
        project_shots = [s for s in project_shots if s.get("status") == status_value]
    
    # Sort by order_index
    project_shots.sort(key=lambda x: x.get("order_index", 0))
    
    # Calculate pagination
    total = len(project_shots)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_shots = project_shots[start_idx:end_idx]
    
    # Build response
    shots_response = [ShotResponse(**s) for s in paginated_shots]
    
    return ShotListResponse(
        shots=shots_response,
        total=total,
        page=page,
        page_size=page_size
    )


@router.post("/shots/{shot_id}/regenerate", response_model=ShotResponse)
async def regenerate_shot(
    shot_id: str,
    new_prompt: Optional[str] = None,
    user_id: str = Depends(verify_jwt_token)
) -> ShotResponse:
    """
    Regenerate a shot with new prompt or same prompt.
    
    Args:
        shot_id: Shot ID
        new_prompt: Optional new prompt (uses existing if not provided)
        user_id: Authenticated user ID
    
    Returns:
        Regenerated shot details
    
    Raises:
        HTTPException: If shot not found or access denied
    """
    logger.info(f"Regenerating shot {shot_id}")
    
    shot = load_shot(shot_id)
    
    if not shot:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Shot not found"
        )
    
    # Validate user has access
    if PROJECT_API_AVAILABLE:
        project = load_project(shot.get("project_id"))
        if project and project.get("owner_id") != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project owner can regenerate shots"
            )
    
    # Update prompt if provided
    if new_prompt:
        shot["prompt"] = new_prompt
    
    # Reset shot status
    shot["status"] = ShotStatus.PENDING.value
    shot["result_url"] = None
    shot["thumbnail_url"] = None
    shot["updated_at"] = datetime.utcnow().isoformat()
    shot["version"] = shot.get("version", 1) + 1
    
    # Save shot
    if not save_shot(shot_id, shot):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to regenerate shot"
        )
    
    logger.info(f"Shot {shot_id} regeneration queued")
    
    return ShotResponse(**shot)
