"""
StoryCore-Engine Project Management API

This module provides REST API endpoints for project management operations.
Supports CRUD operations for projects with JWT-based authentication.

Endpoints:
- POST /api/projects - Create new project
- GET /api/projects/:id - Get project details
- PUT /api/projects/:id - Update project
- DELETE /api/projects/:id - Delete project
- GET /api/projects - List all projects

Requirements: Q1 2026 - Project Management API
"""

import os
import json
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from enum import Enum

from fastapi import APIRouter, HTTPException, status, Depends, Header
from pydantic import BaseModel, Field, validator
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


class Settings(BaseSettings):
    """Application settings for project management"""
    projects_directory: str = Field(default="./projects")
    max_project_size_mb: int = Field(default=1000)
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra environment variables


try:
    settings = Settings()
except Exception as e:
    logger.warning(f"Failed to load settings, using defaults: {e}")
    settings = Settings()


class ProjectStatus(str, Enum):
    """Project status enumeration"""
    DRAFT = "draft"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ARCHIVED = "archived"


class ProjectFormat(str, Enum):
    """Supported video formats"""
    LANDSCAPE = "landscape"
    PORTRAIT = "portrait"
    SQUARE = "square"
    CINEMATIC = "cinematic"


class ProjectBase(BaseModel):
    """Base project model with common fields"""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    format: ProjectFormat = ProjectFormat.LANDSCAPE
    resolution_width: int = Field(default=1920)
    resolution_height: int = Field(default=1080)
    fps: int = Field(default=24, ge=1, le=120)
    tags: List[str] = []
    metadata: Dict[str, Any] = {}


class ProjectCreate(ProjectBase):
    """Model for creating a new project"""
    template_id: Optional[str] = None
    is_public: bool = False


class ProjectUpdate(BaseModel):
    """Model for updating a project"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    format: Optional[ProjectFormat] = None
    resolution_width: Optional[int] = None
    resolution_height: Optional[int] = None
    fps: Optional[int] = Field(None, ge=1, le=120)
    tags: Optional[List[str]] = None
    metadata: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None


class ProjectResponse(BaseModel):
    """Response model for project data"""
    id: str
    name: str
    description: Optional[str]
    format: ProjectFormat
    resolution_width: int
    resolution_height: int
    fps: int
    status: ProjectStatus
    tags: List[str]
    metadata: Dict[str, Any]
    is_public: bool
    owner_id: str
    created_at: datetime
    updated_at: datetime
    version: int = 1


class ProjectListResponse(BaseModel):
    """Response model for listing projects"""
    projects: List[ProjectSummary]
    total: int
    page: int
    page_size: int


class ProjectSummary(BaseModel):
    """Summary model for project listing"""
    id: str
    name: str
    status: ProjectStatus
    shot_count: int
    sequence_count: int
    created_at: datetime
    updated_at: datetime


# Initialize shared storage with LRU cache (max 200 project entries)
project_storage = JSONFileStorage(settings.projects_directory, max_cache_size=200)


def validate_project_ownership(project: Dict[str, Any], user_id: str, require_owner: bool = False) -> None:
    """
    Validate that the user has proper access to the project.
    
    Security: This function ensures proper ownership validation to prevent
    unauthorized access to projects.
    
    Args:
        project: Project data dictionary
        user_id: Authenticated user ID
        require_owner: If True, only owner can access (for write operations)
    
    Raises:
        HTTPException: 403 Forbidden if access denied, 401 Unauthorized if user_id is invalid
    """
    # Security: Validate that user_id is provided and valid
    if not user_id or not isinstance(user_id, str) or user_id.strip() == "":
        logger.warning("Security: Invalid or missing user_id in ownership validation")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required"
        )
    
    # Security: Ensure owner_id exists in project data
    owner_id = project.get("owner_id")
    if owner_id is None:
        # Legacy project without owner_id - deny access for safety
        logger.error(f"Security: Project {project.get('id')} has no owner_id field - denying access")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Project ownership data is corrupted"
        )
    
    # Security: Strict string comparison for owner_id
    # Convert both to string to prevent type coercion attacks
    owner_id_str = str(owner_id).strip()
    user_id_str = str(user_id).strip()
    
    # For write operations, only owner can proceed
    if require_owner:
        if owner_id_str != user_id_str:
            logger.warning(
                f"Security: Unauthorized access attempt - "
                f"user {user_id_str} tried to modify project owned by {owner_id_str}"
            )
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only project owner can perform this action"
            )
        return
    
    # For read operations, check if project is public or user is owner
    is_public = project.get("is_public", False)
    
    # Security: Ensure is_public is a boolean
    if not isinstance(is_public, bool):
        is_public = str(is_public).lower() in ("true", "1", "yes")
    
    if not is_public and owner_id_str != user_id_str:
        logger.warning(
            f"Security: Unauthorized access attempt - "
            f"user {user_id_str} tried to access private project owned by {owner_id_str}"
        )
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this project"
        )


@router.post("/projects", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
async def create_project(
    project: ProjectCreate,
    user_id: str = Depends(verify_jwt_token)
) -> ProjectResponse:
    """
    Create a new project.
    
    Creates a new project with the specified configuration.
    Requires JWT authentication.
    
    Args:
        project: Project creation data
        user_id: Authenticated user ID
    
    Returns:
        Created project details
    
    Raises:
        HTTPException: If validation fails or project creation error
    """
    logger.info(f"Creating new project '{project.name}' for user {user_id}")
    
    # Generate unique project ID
    project_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    # Build project data
    project_data = {
        "id": project_id,
        "name": project.name,
        "description": project.description,
        "format": project.format.value if hasattr(project.format, 'value') else project.format,
        "resolution_width": project.resolution_width,
        "resolution_height": project.resolution_height,
        "fps": project.fps,
        "status": ProjectStatus.DRAFT.value,
        "tags": project.tags,
        "metadata": project.metadata,
        "is_public": project.is_public,
        "owner_id": user_id,
        "created_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "version": 1,
        "sequences": [],
        "shots": []
    }
    
    # Save project
    if not project_storage.save(project_id, project_data):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create project"
        )
    
    # Create locations subfolder for project-specific locations
    locations_path = os.path.join(settings.projects_directory, project_id, "locations")
    os.makedirs(locations_path, exist_ok=True)
    logger.info(f"Locations folder created: {locations_path}")
    
    logger.info(f"Project created successfully: {project_id}")
    
    return ProjectResponse(**project_data)


@router.get("/projects", response_model=ProjectListResponse)
async def list_projects(
    page: int = 1,
    page_size: int = 20,
    status_filter: Optional[ProjectStatus] = None,
    user_id: str = Depends(verify_jwt_token)
) -> ProjectListResponse:
    """
    List all projects for the authenticated user.
    
    Args:
        page: Page number (1-indexed)
        page_size: Number of projects per page
        status_filter: Optional status filter
        user_id: Authenticated user ID
    
    Returns:
        Paginated list of projects
    """
    logger.info(f"Listing projects for user {user_id}, page {page}")
    
    # Performance Fix: Use indexed lookup by owner_id instead of O(n) iteration
    # This uses the owner index in JSONFileStorage for O(1) lookup
    user_projects = project_storage.get_by_owner(user_id)
    
    # Apply status filter
    if status_filter:
        status_value = status_filter.value if hasattr(status_filter, 'value') else status_filter
        user_projects = [p for p in user_projects if p.get("status") == status_value]
    
    # Sort by updated_at descending
    user_projects.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
    
    # Calculate pagination
    total = len(user_projects)
    start_idx = (page - 1) * page_size
    end_idx = start_idx + page_size
    paginated_projects = user_projects[start_idx:end_idx]
    
    # Build response
    projects_response = [
        ProjectSummary(
            id=p["id"],
            name=p["name"],
            status=ProjectStatus(p.get("status", "draft")),
            shot_count=len(p.get("shots", [])),
            sequence_count=len(p.get("sequences", [])),
            created_at=datetime.fromisoformat(p["created_at"]),
            updated_at=datetime.fromisoformat(p["updated_at"])
        )
        for p in paginated_projects
    ]
    
    return ProjectListResponse(
        projects=projects_response,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> ProjectResponse:
    """
    Get project details by ID.
    
    Args:
        project_id: Project ID
        user_id: Authenticated user ID
    
    Returns:
        Project details
    
    Raises:
        HTTPException: If project not found or access denied
    """
    logger.info(f"Getting project {project_id} for user {user_id}")
    
    project = project_storage.load(project_id)
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Security: Use centralized ownership validation to prevent bypass
    validate_project_ownership(project, user_id, require_owner=False)
    
    return ProjectResponse(**project)


@router.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    update: ProjectUpdate,
    user_id: str = Depends(verify_jwt_token)
) -> ProjectResponse:
    """
    Update project details.
    
    Args:
        project_id: Project ID
        update: Update data
        user_id: Authenticated user ID
    
    Returns:
        Updated project details
    
    Raises:
        HTTPException: If project not found or access denied
    """
    logger.info(f"Updating project {project_id} for user {user_id}")
    
    project = project_storage.load(project_id)
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Security: Use centralized ownership validation to prevent bypass
    # require_owner=True ensures only the owner can update
    validate_project_ownership(project, user_id, require_owner=True)
    
    # Apply updates
    update_data = update.dict(exclude_unset=True)
    for key, value in update_data.items():
        if key == "status" and value:
            project[key] = value.value if hasattr(value, 'value') else value
        elif key == "format" and value:
            project[key] = value.value if hasattr(value, 'value') else value
        else:
            project[key] = value
    
    # Update timestamp and version
    project["updated_at"] = datetime.utcnow().isoformat()
    project["version"] = project.get("version", 1) + 1
    
    # Save project
    if not project_storage.save(project_id, project):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update project"
        )
    
    logger.info(f"Project {project_id} updated successfully")
    
    return ProjectResponse(**project)


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: str,
    user_id: str = Depends(verify_jwt_token)
):
    """
    Delete a project.
    
    Args:
        project_id: Project ID
        user_id: Authenticated user ID
    
    Raises:
        HTTPException: If project not found or access denied
    """
    logger.info(f"Deleting project {project_id} for user {user_id}")
    
    project = project_storage.load(project_id)
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Security: Use centralized ownership validation to prevent bypass
    # require_owner=True ensures only the owner can delete
    validate_project_ownership(project, user_id, require_owner=True)
    
    # Delete project
    if not project_storage.delete(project_id):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete project"
        )
    
    logger.info(f"Project {project_id} deleted successfully")


@router.get("/projects/{project_id}/summary")
async def get_project_summary(
    project_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    Get project summary with shot and sequence counts.
    
    Args:
        project_id: Project ID
        user_id: Authenticated user ID
    
    Returns:
        Project summary data
    
    Raises:
        HTTPException: If project not found or access denied
    """
    project = load_project(project_id)
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    # Security: Use centralized ownership validation to prevent bypass
    validate_project_ownership(project, user_id, require_owner=False)
    
    return {
        "id": project["id"],
        "name": project["name"],
        "status": project.get("status"),
        "shot_count": len(project.get("shots", [])),
        "sequence_count": len(project.get("sequences", [])),
        "created_at": project["created_at"],
        "updated_at": project["updated_at"]
    }
