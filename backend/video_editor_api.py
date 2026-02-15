"""
Video Editor Wizard API for StoryCore

Comprehensive API for video editing with AI capabilities.
Supports project management, media handling, export, and AI features.

Author: StoryCore Team
Version: 1.0.0
"""

from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, BackgroundTasks
from pydantic import BaseModel, Field
import uuid
import json
import hashlib
import secrets
import redis
import jwt
import os
import logging
import re
import bcrypt  # SECURITY: Using bcrypt for secure password hashing

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import existing types
import sys
sys.path.insert(0, str(Path(__file__).parent))
from video_editor_types import (
    EditorProject, ExportFormat, ExportPreset, AspectRatio,
    VideoClip, AudioClip, TextLayer, Track, MediaMetadata,
    TimeRange, Resolution
)

# =============================================================================
# =============================================================================
# Configuration - USING CENTRALIZED CONFIG from backend.config
# =============================================================================
#
# NOTE: This file now uses centralized configuration from backend.config
# All service URLs, JWT settings, and Redis are imported from settings
# instead of being hardcoded.

# Import centralized configuration
from backend.config import settings, get_redis_url

VIDEO_EDITOR_ROUTER = APIRouter(prefix="/api/video-editor", tags=["Video Editor Wizard"])

# JWT Configuration - Using centralized settings
# =============================================================================
# SECURITY: JWT secret is now retrieved via get_jwt_secret() which ensures
# the secret is properly configured in production
SECRET_KEY = settings.get_jwt_secret()
ALGORITHM = settings.JWT_ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES
REFRESH_TOKEN_EXPIRE_DAYS = settings.REFRESH_TOKEN_EXPIRE_DAYS

# Redis for sessions and jobs - Using centralized config
REDIS_URL = get_redis_url()

# Storage paths - Using centralized config
PROJECTS_DIR = Path(settings.UPLOAD_FOLDER) / "projects"
MEDIA_DIR = Path(settings.UPLOAD_FOLDER) / "media"
EXPORT_DIR = Path(settings.OUTPUT_FOLDER) / "exports"

# =============================================================================
# Pydantic Models for API
# =============================================================================

class Token(BaseModel):
    """Token response model."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenData(BaseModel):
    """Token payload data."""
    user_id: str
    email: str
    exp: datetime


class UserCreate(BaseModel):
    """User registration model."""
    email: str = Field(..., min_length=5, max_length=255)
    password: str = Field(..., min_length=8)
    name: str = Field(..., min_length=1, max_length=255)


class UserLogin(BaseModel):
    """User login model."""
    email: str
    password: str


class UserResponse(BaseModel):
    """User response model."""
    id: str
    email: str
    name: str
    created_at: datetime
    plan: str = "free"


class ProjectCreate(BaseModel):
    """Project creation model."""
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    aspect_ratio: str = "16:9"
    resolution: str = "1920x1080"
    frame_rate: float = 30.0


class ProjectUpdate(BaseModel):
    """Project update model."""
    name: Optional[str] = None
    description: Optional[str] = None
    aspect_ratio: Optional[str] = None
    resolution: Optional[str] = None
    frame_rate: Optional[float] = None


class ProjectResponse(BaseModel):
    """Project response model."""
    id: str
    name: str
    description: Optional[str]
    user_id: str
    aspect_ratio: str
    resolution: str
    frame_rate: float
    duration: float
    created_at: datetime
    modified_at: datetime
    thumbnail_path: Optional[str] = None


class MediaUpload(BaseModel):
    """Media upload metadata."""
    project_id: str
    media_type: str  # video, audio, image
    name: Optional[str] = None


class MediaResponse(BaseModel):
    """Media item response."""
    id: str
    name: str
    media_type: str
    path: str
    duration: Optional[float]
    resolution: Optional[str]
    thumbnail_path: Optional[str]
    file_size: int
    created_at: datetime


class ExportRequest(BaseModel):
    """Export request model."""
    project_id: str
    format: str = "mp4"
    preset: str = "custom"
    resolution: Optional[str] = None
    quality: str = "high"  # low, medium, high, ultra


class ExportResponse(BaseModel):
    """Export job response."""
    job_id: str
    status: str  # pending, processing, completed, failed
    progress: float
    estimated_time: Optional[int]
    download_url: Optional[str]
    error: Optional[str]


class ExportStatusResponse(BaseModel):
    """Export status response."""
    job_id: str
    status: str
    progress: float
    message: str
    download_url: Optional[str]
    error: Optional[str]


# =============================================================================
# AI Service Models
# =============================================================================

class TranscriptionRequest(BaseModel):
    """Transcription request."""
    media_id: str
    language: Optional[str] = None
    enable_speakers: bool = False


class TranscriptionResponse(BaseModel):
    """Transcription response."""
    job_id: str
    status: str
    text: Optional[str]
    segments: Optional[List[Dict]]
    language: str


class TranslationRequest(BaseModel):
    """Translation request."""
    text: str
    source_language: str
    target_language: str


class TranslationResponse(BaseModel):
    """Translation response."""
    translated_text: str


class TTSRequest(BaseModel):
    """Text-to-speech request."""
    text: str
    voice: str = "fr-FR-Denise"
    speed: float = 1.0
    pitch: float = 1.0


class TTSResponse(BaseModel):
    """Text-to-speech response."""
    job_id: str
    status: str
    audio_path: Optional[str]


class SmartCropRequest(BaseModel):
    """Smart crop request."""
    media_id: str
    target_ratio: str = "9:16"
    focus_mode: str = "auto"  # auto, face, center


class SmartCropResponse(BaseModel):
    """Smart crop response."""
    job_id: str
    status: str
    crop_regions: Optional[List[Dict]]


# =============================================================================
# In-Memory Storage (Replace with database in production)
# =============================================================================

# Users storage
users_db: Dict[str, Dict] = {}

# Projects storage
projects_db: Dict[str, Dict] = {}

# Media storage
media_db: Dict[str, Dict] = {}

# Jobs storage
jobs_db: Dict[str, Dict] = {}

# Redis client
redis_client = None


def get_redis():
    """Get Redis client."""
    global redis_client
    if redis_client is None:
        try:
            redis_client = redis.from_url(REDIS_URL, decode_responses=True)
        except (redis.ConnectionError, redis.AuthenticationError) as e:
            logger.warning(f"Failed to connect to Redis: {e}")
            # Continue without Redis - will use in-memory fallback
    return redis_client


# =============================================================================
# Authentication Helpers
# =============================================================================

def hash_password(password: str) -> str:
    """
    Hash password using bcrypt with automatic salt generation.
    
    SECURITY: Uses bcrypt which is resistant to rainbow table attacks and
    incorporates a work factor (cost) that can be adjusted as hardware improves.
    
    Args:
        password: Plain text password to hash
        
    Returns:
        str: Bcrypt hashed password as string
    """
    # bcrypt generates a salt automatically and includes it in the hash
    salt = bcrypt.gensalt(rounds=12)  # Cost factor of 12 (default is 12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    """
    Verify password against a bcrypt hash.
    
    Supports both bcrypt hashes (new) and legacy SHA-256 hashes (old) for
    backward compatibility during migration.
    
    Args:
        password: Plain text password to verify
        hashed: Stored password hash (bcrypt or legacy SHA-256)
        
    Returns:
        bool: True if password matches, False otherwise
    """
    # Check if this is a bcrypt hash (starts with $2b$)
    if hashed.startswith('$2b$') or hashed.startswith('$2a$'):
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    # LEGACY SUPPORT: Fall back to SHA-256 for existing passwords
    # This allows gradual migration of passwords as users log in
    # TODO: Remove this fallback after all passwords have been migrated
    import warnings
    warnings.warn(
        "Verifying legacy SHA-256 password hash. "
        "Consider re-hashing with bcrypt on next login.",
        DeprecationWarning
    )
    return hashlib.sha256(password.encode()).hexdigest() == hashed


def create_access_token(user_id: str, email: str) -> Tuple[str, datetime]:
    """Create JWT access token."""
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": expire,
        "type": "access"
    }
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token, expire


def create_refresh_token(user_id: str) -> str:
    """Create JWT refresh token."""
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh",
        "rand": secrets.token_hex(16)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[Dict]:
    """Decode and verify JWT token."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# =============================================================================
# Authentication Endpoints
# =============================================================================

@VIDEO_EDITOR_ROUTER.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """Register a new user."""
    # Check if email exists
    for user in users_db.values():
        if user["email"] == user_data.email:
            raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    users_db[user_id] = {
        "id": user_id,
        "email": user_data.email,
        "password": hash_password(user_data.password),
        "name": user_data.name,
        "plan": "free",
        "created_at": now,
        "projects": []
    }
    
    return UserResponse(
        id=user_id,
        email=user_data.email,
        name=user_data.name,
        created_at=now,
        plan="free"
    )


@VIDEO_EDITOR_ROUTER.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    """Login user and return tokens."""
    # Find user by email
    user = None
    for u in users_db.values():
        if u["email"] == credentials.email:
            user = u
            break
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Create tokens
    access_token, expires = create_access_token(user["id"], user["email"])
    refresh_token = create_refresh_token(user["id"])
    
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@VIDEO_EDITOR_ROUTER.post("/auth/refresh", response_model=Token)
async def refresh_token(refresh_token: str):
    """Refresh access token."""
    payload = decode_token(refresh_token)
    
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    
    user_id = payload["user_id"]
    user = users_db.get(user_id)
    
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    
    # Create new tokens
    new_access_token, expires = create_access_token(user["id"], user["email"])
    new_refresh_token = create_refresh_token(user["id"])
    
    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60
    )


@VIDEO_EDITOR_ROUTER.get("/auth/me", response_model=UserResponse)
async def get_current_user(authorization: str = None):
    """Get current user profile."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user = users_db.get(payload["user_id"])
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user["id"],
        email=user["email"],
        name=user["name"],
        created_at=user["created_at"],
        plan=user["plan"]
    )


# =============================================================================
# Project Management Endpoints
# =============================================================================

@VIDEO_EDITOR_ROUTER.post("/projects", response_model=ProjectResponse)
async def create_project(project_data: ProjectCreate, authorization: str = None):
    """Create a new video editing project."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload["user_id"]
    project_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    # Parse resolution
    resolution = project_data.resolution
    width, height = map(int, resolution.split("x"))
    
    # Create project directory
    project_path = PROJECTS_DIR / user_id / project_id
    project_path.mkdir(parents=True, exist_ok=True)
    
    # Create project
    project = {
        "id": project_id,
        "name": project_data.name,
        "description": project_data.description,
        "user_id": user_id,
        "aspect_ratio": project_data.aspect_ratio,
        "resolution": resolution,
        "frame_rate": project_data.frame_rate,
        "duration": 0.0,
        "tracks": [],
        "created_at": now,
        "modified_at": now,
        "thumbnail_path": None,
        "path": str(project_path)
    }
    
    projects_db[project_id] = project
    
    # Save project metadata
    metadata_file = project_path / "project.json"
    with open(metadata_file, "w") as f:
        json.dump(project, f, default=str)
    
    return ProjectResponse(
        id=project_id,
        name=project_data.name,
        description=project_data.description,
        user_id=user_id,
        aspect_ratio=project_data.aspect_ratio,
        resolution=project_data.resolution,
        frame_rate=project_data.frame_rate,
        duration=0.0,
        created_at=now,
        modified_at=now
    )


@VIDEO_EDITOR_ROUTER.get("/projects", response_model=List[ProjectResponse])
async def list_projects(authorization: str = None):
    """List all projects for the current user."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    token = authorization.replace("Bearer ", "")
    payload = decode_token(token)
    
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
    
    user_id = payload["user_id"]
    
    user_projects = [
        ProjectResponse(
            id=p["id"],
            name=p["name"],
            description=p.get("description"),
            user_id=p["user_id"],
            aspect_ratio=p["aspect_ratio"],
            resolution=p["resolution"],
            frame_rate=p["frame_rate"],
            duration=p["duration"],
            created_at=p["created_at"],
            modified_at=p["modified_at"],
            thumbnail_path=p.get("thumbnail_path")
        )
        for p in projects_db.values()
        if p["user_id"] == user_id
    ]
    
    return user_projects


@VIDEO_EDITOR_ROUTER.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(project_id: str, authorization: str = None):
    """Get a specific project."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    project = projects_db.get(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return ProjectResponse(
        id=project["id"],
        name=project["name"],
        description=project.get("description"),
        user_id=project["user_id"],
        aspect_ratio=project["aspect_ratio"],
        resolution=project["resolution"],
        frame_rate=project["frame_rate"],
        duration=project["duration"],
        created_at=project["created_at"],
        modified_at=project["modified_at"],
        thumbnail_path=project.get("thumbnail_path")
    )


@VIDEO_EDITOR_ROUTER.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str,
    update_data: ProjectUpdate,
    authorization: str = None
):
    """Update a project."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    project = projects_db.get(project_id)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Apply updates
    if update_data.name is not None:
        project["name"] = update_data.name
    if update_data.description is not None:
        project["description"] = update_data.description
    if update_data.aspect_ratio is not None:
        project["aspect_ratio"] = update_data.aspect_ratio
    if update_data.resolution is not None:
        project["resolution"] = update_data.resolution
    if update_data.frame_rate is not None:
        project["frame_rate"] = update_data.frame_rate
    
    project["modified_at"] = datetime.utcnow()
    
    return ProjectResponse(
        id=project["id"],
        name=project["name"],
        description=project.get("description"),
        user_id=project["user_id"],
        aspect_ratio=project["aspect_ratio"],
        resolution=project["resolution"],
        frame_rate=project["frame_rate"],
        duration=project["duration"],
        created_at=project["created_at"],
        modified_at=project["modified_at"],
        thumbnail_path=project.get("thumbnail_path")
    )


@VIDEO_EDITOR_ROUTER.delete("/projects/{project_id}")
async def delete_project(project_id: str, authorization: str = None):
    """Delete a project."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Delete project directory
    project = projects_db[project_id]
    project_path = Path(project["path"])
    if project_path.exists():
        import shutil
        shutil.rmtree(project_path)
    
    # Remove from database
    del projects_db[project_id]
    
    return {"message": "Project deleted successfully"}


# =============================================================================
# Media Management Endpoints
# =============================================================================

@VIDEO_EDITOR_ROUTER.post("/media/upload", response_model=MediaResponse)
async def upload_media(
    file: UploadFile = File(...),
    project_id: str = None,
    media_type: str = "video",
    name: str = None,
    authorization: str = None
):
    """Upload a media file to a project."""
    # Authentication check
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    # Project validation
    if project_id and project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # ========== FILE UPLOAD SECURITY VALIDATIONS ==========
    
    # 1. Validate content-type
    allowed_content_types = {
        'video': ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'],
        'audio': ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/aac'],
        'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
    }
    
    content_type = file.content_type or 'application/octet-stream'
    media_content_types = allowed_content_types.get(media_type, allowed_content_types['video'])
    
    if content_type not in media_content_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid content-type '{content_type}'. Allowed: {', '.join(media_content_types)}"
        )
    
    # 2. Validate file extension
    allowed_extensions = {
        'video': ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv'],
        'audio': ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'],
        'image': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']
    }
    
    original_filename = file.filename or ''
    file_ext = Path(original_filename).suffix.lower()
    allowed_exts = allowed_extensions.get(media_type, allowed_extensions['video'])
    
    if file_ext not in [ext.lower() for ext in allowed_exts]:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension '{file_ext}'. Allowed: {', '.join(allowed_exts)}"
        )
    
    # 3. Limit file size (50MB max)
    MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
    
    # Read content to check size
    content = await file.read()
    file_size = len(content)
    
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum allowed size of 50MB"
        )
    
    # 4. Sanitize filename
    safe_filename = re.sub(r'[^a-zA-Z0-9._-]', '_', original_filename)
    safe_filename = safe_filename[:100]  # Limit length
    
    # ========== END SECURITY VALIDATIONS ==========
    
    media_id = str(uuid.uuid4())
    now = datetime.utcnow()
    
    # Determine storage path (using pathlib for safety)
    if project_id:
        storage_path = MEDIA_DIR / projects_db[project_id]["user_id"] / project_id / media_id
    else:
        storage_path = MEDIA_DIR / "temp" / media_id
    
    # Add file extension to storage path
    storage_path = storage_path.with_suffix(file_ext)
    
    storage_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Save file
    with open(storage_path, "wb") as f:
        f.write(content)
    
    # Create thumbnail (placeholder)
    thumbnail_path = None
    duration = None
    
    # Get media metadata (simplified - use actual ffprobe in production)
    if media_type == "video":
        duration = 0.0  # Will be extracted by ffprobe
        thumbnail_path = str(storage_path) + "_thumb.jpg"
    
    # Store media metadata
    media = {
        "id": media_id,
        "name": file_name,
        "media_type": media_type,
        "path": str(storage_path),
        "duration": duration,
        "resolution": None,
        "thumbnail_path": thumbnail_path,
        "file_size": file_size,
        "created_at": now,
        "project_id": project_id
    }
    
    media_db[media_id] = media
    
    return MediaResponse(
        id=media_id,
        name=file_name,
        media_type=media_type,
        path=str(storage_path),
        duration=duration,
        resolution=None,
        thumbnail_path=thumbnail_path,
        file_size=file_size,
        created_at=now
    )


@VIDEO_EDITOR_ROUTER.get("/media/{media_id}", response_model=MediaResponse)
async def get_media(media_id: str, authorization: str = None):
    """Get media metadata."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    media = media_db.get(media_id)
    
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    return MediaResponse(
        id=media["id"],
        name=media["name"],
        media_type=media["media_type"],
        path=media["path"],
        duration=media.get("duration"),
        resolution=media.get("resolution"),
        thumbnail_path=media.get("thumbnail_path"),
        file_size=media["file_size"],
        created_at=media["created_at"]
    )


@VIDEO_EDITOR_ROUTER.delete("/media/{media_id}")
async def delete_media(media_id: str, authorization: str = None):
    """Delete a media file."""
    if not authorization:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    media = media_db.get(media_id)
    
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    # Delete file
    media_path = Path(media["path"])
    if media_path.exists():
        media_path.unlink()
    
    # Delete thumbnail
    thumbnail_path = Path(media.get("thumbnail_path", ""))
    if thumbnail_path.exists():
        thumbnail_path.unlink()
    
    del media_db[media_id]
    
    return {"message": "Media deleted successfully"}


# =============================================================================
# Export Endpoints
# =============================================================================

@VIDEO_EDITOR_ROUTER.post("/export", response_model=ExportResponse)
async def start_export(export_request: ExportRequest, background_tasks: BackgroundTasks):
    """Start a video export job."""
    project_id = export_request.project_id
    
    if project_id not in projects_db:
        raise HTTPException(status_code=404, detail="Project not found")
    
    job_id = str(uuid.uuid4())
    
    # Create export job
    job = {
        "id": job_id,
        "project_id": project_id,
        "format": export_request.format,
        "preset": export_request.preset,
        "resolution": export_request.resolution,
        "quality": export_request.quality,
        "status": "pending",
        "progress": 0.0,
        "message": "Job created",
        "download_url": None,
        "error": None,
        "created_at": datetime.utcnow()
    }
    
    jobs_db[job_id] = job
    
    # Add export task to background
    background_tasks.add_task(process_export, job_id)
    
    return ExportResponse(
        job_id=job_id,
        status="pending",
        progress=0.0,
        estimated_time=60,
        download_url=None,
        error=None
    )


@VIDEO_EDITOR_ROUTER.get("/export/{job_id}/status", response_model=ExportStatusResponse)
async def get_export_status(job_id: str):
    """Get export job status."""
    job = jobs_db.get(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return ExportStatusResponse(
        job_id=job["id"],
        status=job["status"],
        progress=job["progress"],
        message=job["message"],
        download_url=job.get("download_url"),
        error=job.get("error")
    )


@VIDEO_EDITOR_ROUTER.get("/export/{job_id}/download")
async def download_export(job_id: str):
    """Download exported video."""
    job = jobs_db.get(job_id)
    
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Export not ready")
    
    if not job.get("download_url"):
        raise HTTPException(status_code=404, detail="Export file not found")
    
    return {"url": job["download_url"]}


def process_export(job_id: str):
    """Background task to process video export."""
    job = jobs_db[job_id]
    job["status"] = "processing"
    job["message"] = "Starting export..."
    
    project_id = job["project_id"]
    project = projects_db[project_id]
    
    try:
        # Simulate export progress
        for progress in [10, 20, 30, 50, 70, 90, 100]:
            job["progress"] = progress
            job["message"] = f"Exporting... {progress}%"
            
            # In production, this would call FFmpeg
            import time
            time.sleep(1)
        
        # Create export file
        export_path = EXPORT_DIR / f"{project_id}_{job_id}.{job['format']}"
        export_path.parent.mkdir(parents=True, exist_ok=True)
        
        # Placeholder export (create empty file)
        export_path.touch()
        
        job["status"] = "completed"
        job["progress"] = 100.0
        job["message"] = "Export completed"
        job["download_url"] = f"/api/video-editor/export/{job_id}/file"
        
    except FileNotFoundError as e:
        # Export file or project file not found
        job["status"] = "failed"
        job["error"] = f"File not found: {e.filename}"
        job["message"] = f"Export failed - file not found: {e.filename}"
        logger.error(f"Export file not found: {e}")
    except PermissionError as e:
        # Permission denied for output directory
        job["status"] = "failed"
        job["error"] = f"Permission denied: {e.filename}"
        job["message"] = f"Export failed - permission denied: {e.filename}"
        logger.error(f"Export permission denied: {e}")
    except OSError as e:
        # System error (disk full, etc.)
        job["status"] = "failed"
        job["error"] = f"System error: {e}"
        job["message"] = f"Export failed - system error: {e}"
        logger.error(f"Export system error: {e}")


# =============================================================================
# AI Service Endpoints
# =============================================================================

@VIDEO_EDITOR_ROUTER.post("/ai/transcribe", response_model=TranscriptionResponse)
async def transcribe_media(request: TranscriptionRequest, background_tasks: BackgroundTasks):
    """Start transcription of media."""
    media = media_db.get(request.media_id)
    
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    job_id = str(uuid.uuid4())
    
    job = {
        "id": job_id,
        "type": "transcription",
        "media_id": request.media_id,
        "language": request.language,
        "status": "pending",
        "text": None,
        "segments": None,
        "created_at": datetime.utcnow()
    }
    
    jobs_db[job_id] = job
    
    background_tasks.add_task(process_transcription, job_id)
    
    return TranscriptionResponse(
        job_id=job_id,
        status="pending",
        text=None,
        segments=None,
        language=request.language or "auto-detected"
    )


@VIDEO_EDITOR_ROUTER.post("/ai/translate", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    """Translate text to another language."""
    # Placeholder - would integrate with translation API
    return TranslationResponse(
        translated_text=f"[Translated to {request.target_language}] {request.text}"
    )


@VIDEO_EDITOR_ROUTER.post("/ai/tts", response_model=TTSResponse)
async def text_to_speech(request: TTSRequest, background_tasks: BackgroundTasks):
    """Convert text to speech."""
    job_id = str(uuid.uuid4())
    
    job = {
        "id": job_id,
        "type": "tts",
        "text": request.text,
        "voice": request.voice,
        "speed": request.speed,
        "status": "pending",
        "audio_path": None,
        "created_at": datetime.utcnow()
    }
    
    jobs_db[job_id] = job
    
    background_tasks.add_task(process_tts, job_id)
    
    return TTSResponse(
        job_id=job_id,
        status="pending",
        audio_path=None
    )


@VIDEO_EDITOR_ROUTER.post("/ai/smart-crop", response_model=SmartCropResponse)
async def smart_crop_media(request: SmartCropRequest, background_tasks: BackgroundTasks):
    """Smart crop media to target aspect ratio."""
    media = media_db.get(request.media_id)
    
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    
    job_id = str(uuid.uuid4())
    
    job = {
        "id": job_id,
        "type": "smart_crop",
        "media_id": request.media_id,
        "target_ratio": request.target_ratio,
        "focus_mode": request.focus_mode,
        "status": "pending",
        "crop_regions": None,
        "created_at": datetime.utcnow()
    }
    
    jobs_db[job_id] = job
    
    background_tasks.add_task(process_smart_crop, job_id)
    
    return SmartCropResponse(
        job_id=job_id,
        status="pending",
        crop_regions=None
    )


def process_transcription(job_id: str):
    """Background task for transcription."""
    job = jobs_db[job_id]
    job["status"] = "processing"
    
    try:
        # Placeholder - would use Whisper or similar
        import time
        time.sleep(5)  # Simulate processing
        
        job["status"] = "completed"
        job["text"] = "Transcribed text would appear here."
        job["segments"] = [
            {"start": 0.0, "end": 2.0, "text": "Transcribed text would appear here."}
        ]
        
    except FileNotFoundError as e:
        # Media file not found for transcription
        job["status"] = "failed"
        job["error"] = f"Media file not found: {e.filename}"
        logger.error(f"Transcription media file not found: {e}")
    except OSError as e:
        # System error during transcription processing
        job["status"] = "failed"
        job["error"] = f"System error: {e}"
        logger.error(f"Transcription system error: {e}")


def process_tts(job_id: str):
    """Background task for text-to-speech."""
    job = jobs_db[job_id]
    job["status"] = "processing"
    
    try:
        import time
        time.sleep(3)  # Simulate processing
        
        # Create placeholder audio file
        audio_path = MEDIA_DIR / "tts" / f"{job_id}.wav"
        audio_path.parent.mkdir(parents=True, exist_ok=True)
        audio_path.touch()
        
        job["status"] = "completed"
        job["audio_path"] = str(audio_path)
        
    except PermissionError as e:
        # Permission denied for TTS output directory
        job["status"] = "failed"
        job["error"] = f"Permission denied: {e.filename}"
        logger.error(f"TTS permission denied: {e}")
    except OSError as e:
        # System error during TTS processing
        job["status"] = "failed"
        job["error"] = f"System error: {e}"
        logger.error(f"TTS system error: {e}")


def process_smart_crop(job_id: str):
    """Background task for smart crop."""
    job = jobs_db[job_id]
    job["status"] = "processing"
    
    try:
        import time
        time.sleep(2)  # Simulate processing
        
        job["status"] = "completed"
        job["crop_regions"] = [
            {"x": 0.1, "y": 0.1, "width": 0.8, "height": 0.8}
        ]
        
    except FileNotFoundError as e:
        # Media file not found for smart crop
        job["status"] = "failed"
        job["error"] = f"Media file not found: {e.filename}"
        logger.error(f"Smart crop media file not found: {e}")
    except OSError as e:
        # System error during smart crop processing
        job["status"] = "failed"
        job["error"] = f"System error: {e}"
        logger.error(f"Smart crop system error: {e}")


# =============================================================================
# Health Check
# =============================================================================

@VIDEO_EDITOR_ROUTER.get("/health")
async def health_check():
    """API health check."""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "services": {
            "api": "running",
            "database": "connected",
            "redis": get_redis() is not None
        }
    }


# =============================================================================
# Utility Functions
# =============================================================================

@VIDEO_EDITOR_ROUTER.get("/presets")
async def get_export_presets():
    """Get available export presets."""
    return {
        "presets": [
            {"id": "youtube_1080p", "name": "YouTube 1080p", "resolution": "1920x1080", "format": "mp4"},
            {"id": "youtube_4k", "name": "YouTube 4K", "resolution": "3840x2160", "format": "mp4"},
            {"id": "tiktok", "name": "TikTok/Reels", "resolution": "1080x1920", "format": "mp4"},
            {"id": "instagram_feed", "name": "Instagram Feed", "resolution": "1080x1080", "format": "mp4"},
            {"id": "twitter", "name": "Twitter/X", "resolution": "1280x720", "format": "mp4"},
            {"id": "custom", "name": "Custom", "resolution": "1920x1080", "format": "mp4"}
        ]
    }


@VIDEO_EDITOR_ROUTER.get("/aspect-ratios")
async def get_aspect_ratios():
    """Get available aspect ratios."""
    return {
        "ratios": [
            {"id": "16:9", "name": "YouTube", "width": 16, "height": 9},
            {"id": "9:16", "name": "TikTok/Reels", "width": 9, "height": 16},
            {"id": "1:1", "name": "Instagram Square", "width": 1, "height": 1},
            {"id": "4:5", "name": "Instagram Portrait", "width": 4, "height": 5},
            {"id": "4:3", "name": "Standard TV", "width": 4, "height": 3},
            {"id": "21:9", "name": "Ultrawide", "width": 21, "height": 9}
        ]
    }
