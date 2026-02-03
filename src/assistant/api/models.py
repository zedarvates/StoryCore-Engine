"""
API request and response models for StoryCore AI Assistant.

Defines Pydantic models for all API endpoints.
"""

from pydantic import BaseModel, Field
from typing import Optional, Dict, List, Any
from datetime import datetime


# Authentication models
class LoginRequest(BaseModel):
    """Login request"""
    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")


class LoginResponse(BaseModel):
    """Login response"""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration in seconds")


class RefreshTokenRequest(BaseModel):
    """Refresh token request"""
    refresh_token: str = Field(..., description="Refresh token")


class RefreshTokenResponse(BaseModel):
    """Refresh token response"""
    access_token: str = Field(..., description="New JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration in seconds")


# Project generation models
class GenerateProjectRequest(BaseModel):
    """Request to generate a new project"""
    prompt: str = Field(..., description="Natural language project description")
    language: str = Field(default="en", description="Language code (en, fr, es, etc.)")
    preferences: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Optional preferences (sceneCount, duration, style)"
    )


class ScenePreview(BaseModel):
    """Scene preview in generated project"""
    id: str
    number: int
    title: str
    description: str
    location: str
    time_of_day: str
    duration: float
    characters: List[str]
    key_actions: List[str]
    visual_notes: Optional[str] = None


class CharacterPreview(BaseModel):
    """Character preview in generated project"""
    id: str
    name: str
    role: str
    description: str
    appearance: str
    personality: str


class ShotPreview(BaseModel):
    """Shot preview in sequence"""
    id: str
    number: int
    type: str
    camera_movement: str
    duration: float
    description: str
    visual_style: str


class SequencePreview(BaseModel):
    """Sequence preview in generated project"""
    id: str
    scene_id: str
    total_duration: float
    shots: List[ShotPreview]


class GenerateProjectResponse(BaseModel):
    """Response with generated project preview"""
    preview_id: str = Field(..., description="Unique preview identifier")
    project_name: str = Field(..., description="Generated project name")
    scenes: List[ScenePreview] = Field(..., description="Generated scenes")
    characters: List[CharacterPreview] = Field(..., description="Generated characters")
    sequences: List[SequencePreview] = Field(..., description="Generated sequences")
    estimated_size_mb: float = Field(..., description="Estimated project size in MB")
    estimated_file_count: int = Field(..., description="Estimated number of files")


class FinalizeProjectRequest(BaseModel):
    """Request to finalize a project preview"""
    preview_id: str = Field(..., description="Preview ID to finalize")


class FinalizeProjectResponse(BaseModel):
    """Response after finalizing project"""
    project_name: str = Field(..., description="Finalized project name")
    project_path: str = Field(..., description="Project directory path")
    created_at: datetime = Field(..., description="Creation timestamp")


# Project management models
class OpenProjectRequest(BaseModel):
    """Request to open a project"""
    project_name: str = Field(..., description="Name of project to open")


class OpenProjectResponse(BaseModel):
    """Response after opening project"""
    project_name: str
    scene_count: int
    character_count: int
    sequence_count: int
    created_at: datetime
    modified_at: datetime


class CloseProjectRequest(BaseModel):
    """Request to close active project"""
    save: bool = Field(default=True, description="Whether to save before closing")


class CloseProjectResponse(BaseModel):
    """Response after closing project"""
    message: str = Field(..., description="Confirmation message")
    saved: bool = Field(..., description="Whether project was saved")


class ListProjectsResponse(BaseModel):
    """Response with list of projects"""
    projects: List[str] = Field(..., description="List of project names")
    total_count: int = Field(..., description="Total number of projects")


class DeleteProjectRequest(BaseModel):
    """Request to delete a project"""
    confirmed: bool = Field(default=False, description="Confirmation flag")


class DeleteProjectResponse(BaseModel):
    """Response after deleting project"""
    message: str = Field(..., description="Confirmation message")
    deleted_project: str = Field(..., description="Name of deleted project")


# Project modification models
class ModifySceneRequest(BaseModel):
    """Request to modify a scene"""
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    time_of_day: Optional[str] = None
    duration: Optional[float] = None
    characters: Optional[List[str]] = None
    key_actions: Optional[List[str]] = None
    visual_notes: Optional[str] = None


class ModifyCharacterRequest(BaseModel):
    """Request to modify a character"""
    name: Optional[str] = None
    role: Optional[str] = None
    description: Optional[str] = None
    appearance: Optional[str] = None
    personality: Optional[str] = None


class ModifySequenceRequest(BaseModel):
    """Request to modify a sequence"""
    total_duration: Optional[float] = None
    shots: Optional[List[Dict[str, Any]]] = None


class AddSceneRequest(BaseModel):
    """Request to add a new scene"""
    id: str
    number: int
    title: str
    description: str
    location: str
    time_of_day: str
    duration: float
    characters: List[str]
    key_actions: List[str]
    visual_notes: Optional[str] = None


class RemoveSceneRequest(BaseModel):
    """Request to remove a scene"""
    confirmed: bool = Field(default=False, description="Confirmation flag")


class ModificationResponse(BaseModel):
    """Generic response for modification operations"""
    message: str = Field(..., description="Confirmation message")
    modified_element_id: str = Field(..., description="ID of modified element")


# Storage models
class StorageStatsResponse(BaseModel):
    """Response with storage statistics"""
    total_bytes: int
    total_gb: float
    file_count: int
    limit_bytes: int
    limit_gb: float
    file_limit: int
    usage_percent: float
    file_usage_percent: float
    warnings: List[str] = Field(default_factory=list)


# Usage tracking models
class UsageStatsResponse(BaseModel):
    """Response with usage statistics"""
    user_id: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    total_data_transferred_mb: float
    average_response_time_ms: float
    operation_counts: Dict[str, int]
    endpoint_counts: Dict[str, int]
    first_request_time: Optional[datetime] = None
    last_request_time: Optional[datetime] = None


# Health check model
class HealthResponse(BaseModel):
    """Health check response"""
    status: str = Field(..., description="System status")
    version: str = Field(..., description="API version")
    storage_usage_gb: float = Field(..., description="Current storage usage in GB")
    storage_limit_gb: float = Field(..., description="Storage limit in GB")
    file_count: int = Field(..., description="Current file count")
    file_limit: int = Field(..., description="File count limit")
