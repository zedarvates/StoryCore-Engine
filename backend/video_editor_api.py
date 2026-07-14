"""
Video Editor Wizard API for StoryCore

Comprehensive API for video editing with AI capabilities.
Supports project management, media handling, export, and AI features.

Author: StoryCore Team
Version: 1.0.0
"""

from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
from fastapi import APIRouter, HTTPException, UploadFile, File, BackgroundTasks, Query
from fastapi.responses import JSONResponse, FileResponse
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
import asyncio
import sys

sys.path.insert(0, str(Path(__file__).parent))

from .timeline_service import TimelineService, ClipType
from .ttt_lrm_service import (
    TTTLRMService,
    TTTLRMConfig,
    OutputFormat,
    ReconstructionMode,
)
from .video_editor_ai_service import VideoEditorAIService
from .video_enhancement_service import VideoEnhancementService
from backend.config import settings, get_redis_url
from backend.database import get_db, AsyncSessionLocal
from backend import database_models as models
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

VIDEO_EDITOR_ROUTER = APIRouter(
    prefix="/api/video-editor", tags=["Video Editor Wizard"]
)

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
# MIGRATION: Align with main_api.py which uses ./projects in root
PROJECTS_DIR = Path("./projects")
MEDIA_DIR = Path(settings.UPLOAD_FOLDER) / "media"
EXPORT_DIR = Path(settings.OUTPUT_FOLDER) / "exports"

# TODO: MIGRATION - These should be replaced by SQLAlchemy queries using get_db()
# Legacy in-memory DBs removed. Using PostgreSQL models via models.Media and models.AIJob.

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
    resolution: Union[str, Dict[str, int]] = "1920x1080"
    frame_rate: float = Field(30.0, alias="frameRate")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class ProjectUpdate(BaseModel):
    """Project update model."""

    name: Optional[str] = None
    description: Optional[str] = None
    aspect_ratio: Optional[str] = None
    resolution: Optional[Union[str, Dict[str, int]]] = None
    frame_rate: Optional[float] = Field(None, alias="frameRate")
    tracks: Optional[List[Dict[str, Any]]] = None
    clips: Optional[List[Dict[str, Any]]] = (None,)
    media: Optional[List[Dict[str, Any]]] = (None,)
    project_setup: Optional[Dict[str, Any]] = (Field(None, alias="projectSetup"),)

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class ProjectResponse(BaseModel):
    """Project response model."""

    id: str
    name: str
    description: Optional[str] = None
    user_id: str = Field(..., alias="userId")
    aspect_ratio: str = Field(..., alias="aspectRatio")
    resolution: Union[str, Dict[str, int]]
    frame_rate: float = Field(..., alias="frameRate")
    duration: float
    created_at: datetime = Field(..., alias="createdAt")
    modified_at: datetime = Field(..., alias="updatedAt")
    thumbnail_path: Optional[str] = Field(None, alias="thumbnailPath")
    tracks: List[Dict[str, Any]] = ([],)
    clips: List[Dict[str, Any]] = ([],)
    media: List[Dict[str, Any]] = ([],)
    project_setup: Optional[Dict[str, Any]] = Field(None, alias="projectSetup")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class MediaUpload(BaseModel):
    """Media upload metadata."""

    project_id: str
    media_type: str  # video, audio, image
    name: Optional[str] = None


class MediaResponse(BaseModel):
    """Media item response."""

    id: str
    name: str
    media_type: str = Field(..., alias="type")
    path: str
    url: Optional[str] = None
    duration: Optional[float] = None
    resolution: Optional[str] = None
    thumbnail_path: Optional[str] = Field(None, alias="thumbnail")
    file_size: int = Field(..., alias="fileSize")
    created_at: datetime = Field(..., alias="createdAt")
    tags: List[str] = []
    metadata: Dict[str, Any] = {}

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class ExportRequest(BaseModel):
    """Export request model."""

    project_id: Optional[str] = None
    format: str = "mp4"
    preset: str = "custom"
    resolution: Optional[str] = None
    quality: str = "high"  # low, medium, high, ultra
    frame_rate: int = Field(30, alias="frameRate")
    include_audio: bool = Field(True, alias="includeAudio")
    bitrate: Optional[int] = None


class ExportResponse(BaseModel):
    """Export job response."""

    id: str = Field(..., alias="id")
    project_id: str = Field(..., alias="projectId")
    status: str
    progress: float
    estimated_time: Optional[int] = Field(None, alias="estimatedTime")
    output_path: Optional[str] = Field(None, alias="outputPath")
    error: Optional[str] = None
    settings: Optional[Dict[str, Any]] = None
    started_at: datetime = Field(default_factory=datetime.utcnow, alias="startedAt")
    completed_at: Optional[datetime] = Field(None, alias="completedAt")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True
        json_encoders = {datetime: lambda v: v.isoformat()}


class ExportStatusResponse(BaseModel):
    """Export status response."""

    id: str = Field(..., alias="id")
    status: str
    progress: float
    message: Optional[str] = None
    output_path: Optional[str] = Field(None, alias="outputPath")
    error: Optional[str] = None
    download_url: Optional[str] = Field(None, alias="downloadUrl")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


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


class BeatDetectionRequest(BaseModel):
    """Beat detection request."""

    media_id: str


class BeatDetectionResponse(BaseModel):
    """Beat detection response."""

    job_id: str
    status: str
    beats: Optional[List[float]]


class AutoTrimRequest(BaseModel):
    """Auto trim silence request."""

    media_id: str
    threshold: float = -30.0
    min_duration: float = 0.5


class AutoTrimResponse(BaseModel):
    """Auto trim silence response."""

    job_id: str
    status: str
    output_path: Optional[str]


class VideoEnhanceRequest(BaseModel):
    """Video enhancement request."""

    media_id: str
    enhancements: List[Dict[str, Any]]  # e.g. [{"type": "halation", "strength": 0.5}]


class HighlightRequest(BaseModel):
    """Request model for highlight extraction."""

    media_id: str = Field(..., alias="mediaId")
    min_duration: float = Field(2.0, alias="minDuration")
    max_duration: float = Field(10.0, alias="maxDuration")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class HighlightResponse(BaseModel):
    """Response model for highlight extraction."""

    job_id: str = Field(..., alias="jobId")
    status: str
    
    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class AudioRemixRequest(BaseModel):
    """Request model for audio remixing."""
    music_id: str = Field(..., alias="musicId")
    speech_id: str = Field(..., alias="speechId")
    ducking: bool = True

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class VisualSummaryRequest(BaseModel):
    """Request model for visual summary generation."""
    media_id: str = Field(..., alias="mediaId")
    num_frames: int = Field(5, alias="numFrames")

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class AISearchRequest(BaseModel):
    """Request model for searching within specific media."""

    media_id: str = Field(..., alias="mediaId")
    query: str

    class Config:
        allow_population_by_field_name = True
        populate_by_name = True


class SearchRequest(BaseModel):
    """General AI search request."""

    query: str
    project_id: Optional[str] = None


class VideoOCRRequest(BaseModel):
    """Video OCR indexing request."""

    media_id: str


class MagicMaskRequest(BaseModel):
    """Magic mask request."""

    media_id: str
    strength: float = 0.5


class DialogueAutomationRequest(BaseModel):
    """Dialogue automation request."""

    clips: List[Dict[str, Any]]
    type: str  # "j-cut", "l-cut", "balanced"
    overlap: float = 1.5


class VoiceIsolationRequest(BaseModel):
    """Voice isolation request."""

    media_id: str


class AutoDuckingRequest(BaseModel):
    """Auto-ducking request."""

    music_id: str
    speech_id: str


class PanScanRequest(BaseModel):
    """Smart pan & scan request."""

    media_id: str


class MultiAngleRequest(BaseModel):
    """Multi-angle generation request."""

    base_prompt: str
    angles: List[str] = ["low angle", "high angle", "canted angle", "aerial"]


class CharacterSheetRequest(BaseModel):
    """Character consistency sheet request."""

    name: str
    reference_images: List[str]


class PublishRequest(BaseModel):
    """Social publishing request."""

    media_id: str
    platforms: List[str]
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None
    tags: List[str] = []
    privacy: str = "public"  # public, private, unlisted


class PublishResponse(BaseModel):
    """Publish job response."""

    job_id: str
    status: str
    platform_results: Dict[str, Dict[str, Any]]


class Forge3DRequest(BaseModel):
    """3D asset forging request."""

    project_id: str = Field(..., alias="projectId")
    object_id: str = Field(..., alias="objectId")
    image_path: str = Field(..., alias="imagePath")
    mode: str = "feedforward"  # feedforward, ttt_adapted


class Forge3DResponse(BaseModel):
    """3D asset forging response."""

    status: str
    model_path: Optional[str] = Field(None, alias="modelPath")
    error: Optional[str] = None


# =============================================================================
# Database Storage (SQLAlchemy)
# =============================================================================

# =============================================================================
# In-Memory Storage (Replaced with database)
# =============================================================================

# Redis client
redis_client = None

# Timeline Service Initialization
timeline_service = TimelineService()

# TTTLRM Service Initialization for 3D Forging
ttt_lrm_service = TTTLRMService()


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
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


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
    if hashed.startswith("$2b$") or hashed.startswith("$2a$"):
        return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

    # LEGACY SUPPORT: Fall back to SHA-256 for existing passwords
    # This allows gradual migration of passwords as users log in
    # TODO: Remove this fallback after all passwords have been migrated
    import warnings

    warnings.warn(
        "Verifying legacy SHA-256 password hash. "
        "Consider re-hashing with bcrypt on next login.",
        DeprecationWarning,
    )
    return hashlib.sha256(password.encode()).hexdigest() == hashed


def create_access_token(user_id: str, email: str) -> Tuple[str, datetime]:
    """Create JWT access token."""
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {"user_id": user_id, "email": email, "exp": expire, "type": "access"}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    return token, expire


def create_refresh_token(user_id: str) -> str:
    """Create JWT refresh token."""
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
        "type": "refresh",
        "rand": secrets.token_hex(16),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer()

def decode_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Optional[Dict]:
    """Decode and verify JWT token from Authorization header."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None



async def get_current_user(
    token_payload: Dict[str, Any] = Depends(decode_token), 
    db: AsyncSession = Depends(get_db)
) -> models.User:
    """Dependency to get the current authenticated user from DB."""
    if not token_payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    user_id = token_payload.get("user_id") # We use user_id in this API's tokens
    if not user_id:
        raise HTTPException(status_code=401, detail="Token missing user_id")
    
    query = select(models.User).where(models.User.id == user_id)
    result = await db.execute(query)
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return user


# =============================================================================
# Authentication Endpoints
# =============================================================================


@VIDEO_EDITOR_ROUTER.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: AsyncSession = Depends(get_db)):
    """Register a new user."""
    # 1. VALIDATION: Check email format
    if not re.match(r"[^@]+@[^@]+\.[^@]+", user_data.email):
        raise HTTPException(status_code=400, detail="Invalid email format")

    # 2. DATABASE: Check if email exists
    query = select(models.User).where(models.User.email == user_data.email)
    result = await db.execute(query)
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    # 3. DATABASE: Create user
    new_user = models.User(
        email=user_data.email,
        password_hash=hash_password(user_data.password),
        name=user_data.name,
        plan="free"
    )
    db.add(new_user)
    await db.flush() # Populate id

    return UserResponse(
        id=new_user.id,
        email=new_user.email,
        name=new_user.name,
        created_at=new_user.created_at,
        plan=new_user.plan,
    )


@VIDEO_EDITOR_ROUTER.post("/auth/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    """Login and get tokens."""
    # DATABASE: Find user by email
    query = select(models.User).where(models.User.email == credentials.email)
    result = await db.execute(query)
    user = result.scalars().first()

    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Create tokens
    access_token, expire = create_access_token(user.id, user.email)
    refresh_token = create_refresh_token(user.id)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@VIDEO_EDITOR_ROUTER.post("/auth/refresh", response_model=Token)
async def refresh_token(
    refresh_token: str, 
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token."""
    payload = decode_token(refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    user_id = payload["user_id"]
    
    # DATABASE: Find user by ID
    query = select(models.User).where(models.User.id == user_id)
    result = await db.execute(query)
    user = result.scalars().first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Create new tokens
    new_access_token, expires = create_access_token(user.id, user.email)
    new_refresh_token = create_refresh_token(user.id)

    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@VIDEO_EDITOR_ROUTER.get("/auth/me", response_model=UserResponse)
async def get_my_profile(
    user: models.User = Depends(get_current_user)
):
    """Get current user profile."""
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        created_at=user.created_at,
        plan=user.plan,
    )


# =============================================================================
# Project Management Endpoints
# =============================================================================


@VIDEO_EDITOR_ROUTER.post("/projects", response_model=ProjectResponse)
async def create_project(
    project_data: ProjectCreate, 
    user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new project in the database."""
    # Parse resolution
    resolution = project_data.resolution
    if isinstance(resolution, dict):
        width = resolution.get("width", 1920)
        height = resolution.get("height", 1080)
        resolution_str = f"{width}x{height}"
    else:
        resolution_str = resolution
        try:
            width, height = map(int, resolution_str.split("x"))
        except Exception:
            width, height = 1920, 1080
            resolution_str = "1920x1080"

    # Create project in DB
    new_project = models.Project(
        user_id=user.id,
        name=project_data.name,
        description=project_data.description,
        aspect_ratio=project_data.aspect_ratio,
        resolution=resolution_str,
        frame_rate=project_data.frame_rate,
        duration=0.0
    )
    
    db.add(new_project)
    await db.flush() # Populate ID

    # Create project directory (still needed for physical files)
    project_path = PROJECTS_DIR / user.id / new_project.id
    project_path.mkdir(parents=True, exist_ok=True)

    return ProjectResponse(
        id=new_project.id,
        name=new_project.name,
        description=new_project.description,
        userId=user.id,
        aspectRatio=new_project.aspect_ratio,
        resolution=new_project.resolution,
        frameRate=new_project.frame_rate,
        duration=0.0,
        createdAt=new_project.created_at,
        updatedAt=new_project.updated_at,
    )


@VIDEO_EDITOR_ROUTER.get("/projects", response_model=List[ProjectResponse])
async def list_projects(
    user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all projects for the current user from the database."""
    query = select(models.Project).where(models.Project.user_id == user.id)
    result = await db.execute(query)
    db_projects = result.scalars().all()

    return [
        ProjectResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            userId=p.user_id,
            aspectRatio=p.aspect_ratio,
            resolution=p.resolution,
            frameRate=p.frame_rate,
            duration=p.duration,
            createdAt=p.created_at,
            updatedAt=p.updated_at,
            thumbnailPath=p.thumbnail_path,
        )
        for p in db_projects
    ]


@VIDEO_EDITOR_ROUTER.get("/projects/{project_id}", response_model=ProjectResponse)
async def get_project(
    project_id: str, 
    user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get a specific project from the database."""
    query = select(models.Project).where(
        models.Project.id == project_id, 
        models.Project.user_id == user.id
    )
    result = await db.execute(query)
    p = result.scalars().first()

    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    return ProjectResponse(
        id=p.id,
        name=p.name,
        description=p.description,
        userId=p.user_id,
        aspectRatio=p.aspect_ratio,
        resolution=p.resolution,
        frameRate=p.frame_rate,
        duration=p.duration,
        createdAt=p.created_at,
        updatedAt=p.updated_at,
        thumbnailPath=p.thumbnail_path,
        tracks=p.timeline_data.get("tracks", []) if p.timeline_data else [],
        clips=p.timeline_data.get("clips", []) if p.timeline_data else [],
        media=[], # Media would need another query
        projectSetup=p.settings
    )


@VIDEO_EDITOR_ROUTER.get("/projects/{project_id}/vault/assets")
async def list_project_assets(
    project_id: str,
    user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    List assets stored in the project vault using the database.
    """
    # 1. Verify project ownership
    query = select(models.Project).where(
        models.Project.id == project_id, models.Project.user_id == user.id
    )
    result = await db.execute(query)
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # 2. Query Media assets
    media_query = select(models.Media).where(models.Media.project_id == project_id)
    media_result = await db.execute(media_query)
    media_items = media_result.scalars().all()

    # 3. Query Export jobs
    export_query = select(models.ExportJob).where(
        models.ExportJob.project_id == project_id, models.ExportJob.status == "completed"
    )
    export_result = await db.execute(export_query)
    export_items = export_result.scalars().all()

    assets = []

    # Map media to assets
    for m in media_items:
        assets.append(
            {
                "id": m.id,
                "name": m.name,
                "type": m.media_type,
                "path": m.path,
                "added_at": m.created_at.isoformat(),
            }
        )

    # Map exports to assets
    for e in export_items:
        assets.append(
            {
                "id": e.id,
                "name": f"Export {e.id[:8]}",
                "type": "video",
                "path": e.output_path,
                "added_at": e.completed_at.isoformat()
                if e.completed_at
                else e.created_at.isoformat(),
            }
        )

    return {"assets": assets}


@VIDEO_EDITOR_ROUTER.get("/projects/{project_id}/media-raw")
async def get_raw_media(
    project_id: str,
    path: str = Query(..., description="Path relative to the projects directory"),
    user: models.User = Depends(get_current_user)
):
    """Serve a raw media file from a project directory."""
    try:
        # Security check: ensure the path doesn't escape the projects directory
        full_path = PROJECTS_DIR / project_id / path
        full_path = full_path.resolve()
        
        if not str(full_path).startswith(str(PROJECTS_DIR.resolve())):
            raise HTTPException(status_code=403, detail="Access denied")

        if not full_path.exists():
            raise HTTPException(status_code=404, detail=f"File not found: {path}")

        # Determine media type
        suffix = full_path.suffix.lower()
        if suffix in [".png", ".jpg", ".jpeg"]:
            media_type = f"image/{suffix[1:]}"
        elif suffix in [".mp4", ".webm"]:
            media_type = f"video/{suffix[1:]}"
        elif suffix in [".glb", ".gltf"]:
            media_type = "model/gltf-binary" if suffix == ".glb" else "model/gltf+json"
        else:
            media_type = "application/octet-stream"

        return FileResponse(path=full_path, media_type=media_type)

    except Exception as e:
        if isinstance(e, HTTPException):
            raise e
        logger.error(f"Error serving raw media: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@VIDEO_EDITOR_ROUTER.put("/projects/{project_id}", response_model=ProjectResponse)
async def update_project(
    project_id: str, 
    update_data: ProjectUpdate, 
    user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a project in the database."""
    query = select(models.Project).where(
        models.Project.id == project_id, 
        models.Project.user_id == user.id
    )
    result = await db.execute(query)
    p = result.scalars().first()

    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    # Apply updates
    if update_data.name is not None:
        p.name = update_data.name
    if update_data.description is not None:
        p.description = update_data.description
    if update_data.aspect_ratio is not None:
        p.aspect_ratio = update_data.aspect_ratio
    
    if update_data.resolution is not None:
        if isinstance(update_data.resolution, dict):
            p.resolution = f"{update_data.resolution.get('width', 1920)}x{update_data.resolution.get('height', 1080)}"
        else:
            p.resolution = update_data.resolution
            
    if update_data.frame_rate is not None:
        p.frame_rate = update_data.frame_rate
    
    # Complex timeline data
    if update_data.tracks is not None or update_data.clips is not None or update_data.project_setup is not None:
        if not p.timeline_data:
            p.timeline_data = {}
        if update_data.tracks is not None:
            p.timeline_data["tracks"] = update_data.tracks
        if update_data.clips is not None:
            p.timeline_data["clips"] = update_data.clips
        if update_data.project_setup is not None:
            p.settings = update_data.project_setup

    p.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(p)

    return ProjectResponse(
        id=p.id,
        name=p.name,
        description=p.description,
        userId=p.user_id,
        aspectRatio=p.aspect_ratio,
        resolution=p.resolution,
        frameRate=p.frame_rate,
        duration=p.duration,
        createdAt=p.created_at,
        updatedAt=p.updated_at,
        thumbnailPath=p.thumbnail_path,
        tracks=p.timeline_data.get("tracks", []) if p.timeline_data else [],
        clips=p.timeline_data.get("clips", []) if p.timeline_data else [],
        media=[],
        projectSetup=p.settings
    )


@VIDEO_EDITOR_ROUTER.delete("/projects/{project_id}")
async def delete_project(
    project_id: str, 
    user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a project from the database and disk."""
    query = select(models.Project).where(
        models.Project.id == project_id, 
        models.Project.user_id == user.id
    )
    result = await db.execute(query)
    p = result.scalars().first()

    if not p:
        raise HTTPException(status_code=404, detail="Project not found")

    # Delete project directory from disk
    try:
        project_path = PROJECTS_DIR / user.id / project_id
        if project_path.exists():
            import shutil
            shutil.rmtree(project_path)
    except Exception as e:
        logger.error(f"Failed to delete project directory {project_id}: {e}")

    # Remove from database
    await db.delete(p)

    return {"message": "Project deleted successfully"}


# =============================================================================
# Media Management Endpoints
# =============================================================================


@VIDEO_EDITOR_ROUTER.post("/media/upload", response_model=MediaResponse)
@VIDEO_EDITOR_ROUTER.post("/projects/{project_id}/media", response_model=MediaResponse)
async def upload_media(
    file: UploadFile = File(...),
    project_id: str = None,
    media_type: str = "video",
    name: str = None,
    user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Upload a media file to a project in the database."""
    # Project validation
    if project_id:
        query = select(models.Project).where(
            models.Project.id == project_id, 
            models.Project.user_id == user.id
        )
        result = await db.execute(query)
        if not result.scalars().first():
            raise HTTPException(status_code=404, detail="Project not found")

    # ========== FILE UPLOAD SECURITY VALIDATIONS ==========
    # (Keeping the validation logic as is for security)
    allowed_content_types = {
        "video": ["video/mp4", "video/webm", "video/quicktime", "video/x-msvideo", "video/x-matroska"],
        "audio": ["audio/mpeg", "audio/wav", "audio/ogg", "audio/flac", "audio/aac"],
        "image": ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
    }

    content_type = file.content_type or "application/octet-stream"
    media_content_types = allowed_content_types.get(media_type, allowed_content_types["video"])

    if content_type not in media_content_types:
        raise HTTPException(status_code=400, detail=f"Invalid content-type '{content_type}'")

    original_filename = file.filename or "unnamed_file"
    safe_name = name or original_filename
    file_ext = Path(original_filename).suffix.lower()

    content = await file.read()
    file_size = len(content)
    if file_size > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large (50MB max)")

    # ========== DATABASE PERSISTENCE ==========
    new_media = models.Media(
        user_id=user.id,
        project_id=project_id,
        name=safe_name,
        original_filename=original_filename,
        media_type=media_type,
        file_size=file_size,
        path="", # Will update after save
    )
    db.add(new_media)
    await db.flush()

    # Determine storage path
    if project_id:
        storage_path = MEDIA_DIR / user.id / project_id / f"{new_media.id}{file_ext}"
    else:
        storage_path = MEDIA_DIR / user.id / "orphans" / f"{new_media.id}{file_ext}"

    storage_path.parent.mkdir(parents=True, exist_ok=True)
    with open(storage_path, "wb") as f:
        f.write(content)

    new_media.path = str(storage_path)
    
    return MediaResponse(
        id=new_media.id,
        name=new_media.name,
        type=new_media.media_type,
        path=new_media.path,
        fileSize=new_media.file_size,
        createdAt=new_media.created_at
    )


@VIDEO_EDITOR_ROUTER.get("/media/{media_id}", response_model=MediaResponse)
async def get_media(
    media_id: str, 
    user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get media metadata from the database."""
    query = select(models.Media).where(
        models.Media.id == media_id, 
        models.Media.user_id == user.id
    )
    result = await db.execute(query)
    media = result.scalars().first()

    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    return MediaResponse(
        id=media.id,
        name=media.name,
        type=media.media_type,
        path=media.path,
        duration=media.duration,
        resolution=media.resolution,
        thumbnail=media.thumbnail_path,
        fileSize=media.file_size,
        createdAt=media.created_at,
    )


@VIDEO_EDITOR_ROUTER.delete("/media/{media_id}")
async def delete_media(
    media_id: str, 
    user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a media file from database and disk."""
    query = select(models.Media).where(
        models.Media.id == media_id, 
        models.Media.user_id == user.id
    )
    result = await db.execute(query)
    media = result.scalars().first()

    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Delete from disk
    try:
        path = Path(media.path)
        if path.exists():
            path.unlink()
        if media.thumbnail_path:
            thumb = Path(media.thumbnail_path)
            if thumb.exists():
                thumb.unlink()
    except Exception as e:
        logger.error(f"Failed to delete media file {media_id}: {e}")

    # Remove from database
    await db.delete(media)

    return {"message": "Media deleted successfully"}


# =============================================================================
# Export Endpoints
# =============================================================================


@VIDEO_EDITOR_ROUTER.post("/export", response_model=ExportResponse)
@VIDEO_EDITOR_ROUTER.post(
    "/projects/{project_id}/export", response_model=ExportResponse
)
async def start_export(
    export_request: ExportRequest,
    background_tasks: BackgroundTasks,
    project_id: str = None,
    user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Start a video export job."""
    current_project_id = project_id or export_request.project_id

    if not current_project_id:
        raise HTTPException(status_code=400, detail="Project ID is required")

    # DATABASE: Check if project exists and belongs to user
    query = select(models.Project).where(
        models.Project.id == current_project_id,
        models.Project.user_id == user.id
    )
    result = await db.execute(query)
    project = result.scalars().first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Create export job in DB
    new_job = models.ExportJob(
        project_id=current_project_id,
        user_id=user.id,
        format=export_request.format,
        preset=export_request.preset,
        resolution=export_request.resolution,
        quality=export_request.quality,
        status="pending",
        progress=0.0,
        settings=export_request.dict(),
        started_at=datetime.utcnow()
    )
    
    db.add(new_job)
    await db.flush() # Populate ID

    # Add export task to background
    background_tasks.add_task(process_export, new_job.id)

    return ExportResponse(
        id=new_job.id,
        projectId=new_job.project_id,
        status=new_job.status,
        progress=new_job.progress,
        settings=new_job.settings,
        startedAt=new_job.started_at
    )


@VIDEO_EDITOR_ROUTER.get("/export/{job_id}/status", response_model=ExportStatusResponse)
@VIDEO_EDITOR_ROUTER.get(
    "/export/{job_id}/progress", response_model=ExportStatusResponse
)
async def get_export_status(
    job_id: str,
    user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get export job status."""
    query = select(models.ExportJob).where(
        models.ExportJob.id == job_id,
        models.ExportJob.user_id == user.id
    )
    result = await db.execute(query)
    job = result.scalars().first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return ExportStatusResponse(
        id=job.id,
        status=job.status,
        progress=job.progress,
        message=job.message,
        output_path=job.output_path,
        download_url=f"/api/video-editor/export/{job_id}/download"
        if job.status == "completed"
        else None,
        error=job.error,
    )


@VIDEO_EDITOR_ROUTER.get("/export/{job_id}/download")
async def download_export(
    job_id: str,
    user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Download exported video."""
    query = select(models.ExportJob).where(
        models.ExportJob.id == job_id,
        models.ExportJob.user_id == user.id
    )
    result = await db.execute(query)
    job = result.scalars().first()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status != "completed":
        raise HTTPException(status_code=400, detail="Export not ready")

    if not job.download_url:
        # Fallback to local file check if download_url is not set but output_path is
        if job.output_path and os.path.exists(job.output_path):
             return FileResponse(job.output_path, filename=f"export_{job_id}.mp4")
        raise HTTPException(status_code=404, detail="Export file not found")

    return {"url": job.download_url}


async def process_export(job_id: str):
    """Background task to process video export with real FFmpeg/GPU."""
    from .video_editor_ai_service import create_ai_service
    from backend.database import AsyncSessionLocal

    service = create_ai_service()
    
    async with AsyncSessionLocal() as db:
        try:
            # 1. Load job from DB
            query = select(models.ExportJob).where(models.ExportJob.id == job_id)
            result = await db.execute(query)
            job = result.scalars().first()
            
            if not job:
                logger.error(f"Job {job_id} not found in database for background processing")
                return

            job.status = "processing"
            job.message = "Starting high-quality export..."
            await db.commit()

            project_id = job.project_id
            format_ext = job.format or "mp4"

            # 2. Load project to get media list
            query_project = select(models.Project).where(models.Project.id == project_id)
            result_project = await db.execute(query_project)
            project = result_project.scalars().first()
            
            if not project:
                raise ValueError(f"Project {project_id} not found")

            # 3. Load media from project
            query_media = select(models.Media).where(models.Media.project_id == project_id)
            result_media = await db.execute(query_media)
            media_list = result_media.scalars().all()
            
            if not media_list:
                raise FileNotFoundError("No media in project to export")

            input_path = media_list[0].path
            output_filename = f"{project_id}_{job_id}.{format_ext}"
            output_path = str(EXPORT_DIR / output_filename)

            # Ensure export directory exists
            EXPORT_DIR.mkdir(parents=True, exist_ok=True)

            # 4. Update status and process
            job.message = f"Processing video with FFmpeg ({format_ext})..."
            job.progress = 10.0
            await db.commit()

            # Execute real enhancement/export via service
            success = await service.process_video(
                input_path=input_path,
                output_path=output_path,
                quality=job.quality
            )

            if success:
                job.status = "completed"
                job.progress = 100.0
                job.message = "Export completed successfully"
                job.output_path = output_path
                job.download_url = f"/api/video-editor/export/{job_id}/download"
                job.completed_at = datetime.utcnow()
            else:
                job.status = "failed"
                job.error = "FFmpeg processing failed"
                job.message = "Export failed during processing"

            await db.commit()

        except Exception as e:
            logger.error(f"Export error for job {job_id}: {e}")
            # We need to refresh the job instance if it was detached or re-query it
            async with AsyncSessionLocal() as db_error:
                query = select(models.ExportJob).where(models.ExportJob.id == job_id)
                result = await db_error.execute(query)
                job_err = result.scalars().first()
                if job_err:
                    job_err.status = "failed"
                    job_err.error = str(e)
                    job_err.message = f"Export failed: {str(e)}"
                    job_err.completed_at = datetime.utcnow()
                    await db_error.commit()


# =============================================================================
# AI Service Endpoints
# =============================================================================


@VIDEO_EDITOR_ROUTER.post("/ai/transcribe", response_model=TranscriptionResponse)
async def transcribe_media(
    request: TranscriptionRequest, 
    background_tasks: BackgroundTasks,
    user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Start transcription of media."""
    # DATABASE: Check if media exists and belongs to user
    query = select(models.Media).where(
        models.Media.id == request.media_id,
        models.Media.user_id == user.id
    )
    result = await db.execute(query)
    media = result.scalars().first()

    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Create AI Job in DB
    new_job = models.AIJob(
        user_id=user.id,
        job_type="transcription",
        status="pending",
        input_data={
            "media_id": request.media_id,
            "language": request.language,
            "enable_speakers": request.enable_speakers
        },
        input_path=media.path,
        started_at=datetime.utcnow()
    )
    
    db.add(new_job)
    await db.flush() # Populate ID

    background_tasks.add_task(process_transcription, new_job.id)

    return TranscriptionResponse(
        job_id=new_job.id,
        status="pending",
        text=None,
        segments=None,
        language=request.language or "auto-detected",
    )



@VIDEO_EDITOR_ROUTER.post("/ai/translate", response_model=TranslationResponse)
async def translate_text(request: TranslationRequest):
    """Translate text to another language."""
    # Placeholder - would integrate with translation API
    return TranslationResponse(
        translated_text=f"[Translated to {request.target_language}] {request.text}"
    )


@VIDEO_EDITOR_ROUTER.post("/ai/tts", response_model=TTSResponse)
async def text_to_speech(
    request: TTSRequest, 
    background_tasks: BackgroundTasks,
    user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Convert text to speech."""
    # Create AI Job in DB
    new_job = models.AIJob(
        user_id=user.id,
        job_type="tts",
        status="pending",
        input_data={
            "text": request.text,
            "voice": request.voice,
            "speed": request.speed,
            "pitch": request.pitch
        },
        started_at=datetime.utcnow()
    )
    
    db.add(new_job)
    await db.flush() # Populate ID

    background_tasks.add_task(process_tts, new_job.id)

    return TTSResponse(job_id=new_job.id, status="pending", audio_path=None)



@VIDEO_EDITOR_ROUTER.post("/ai/smart-crop", response_model=SmartCropResponse)
async def smart_crop_media(
    request: SmartCropRequest, 
    background_tasks: BackgroundTasks,
    user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Smart crop media to target aspect ratio."""
    # DATABASE: Check if media exists and belongs to user
    query = select(models.Media).where(
        models.Media.id == request.media_id,
        models.Media.user_id == user.id
    )
    result = await db.execute(query)
    media = result.scalars().first()

    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Create AI Job in DB
    new_job = models.AIJob(
        user_id=user.id,
        job_type="smart_crop",
        status="pending",
        input_data={
            "media_id": request.media_id,
            "target_ratio": request.target_ratio,
            "focus_mode": request.focus_mode
        },
        input_path=media.path,
        started_at=datetime.utcnow()
    )
    
    db.add(new_job)
    await db.flush() # Populate ID

    background_tasks.add_task(process_smart_crop, new_job.id)

    return SmartCropResponse(job_id=new_job.id, status="pending", crop_regions=None)



@VIDEO_EDITOR_ROUTER.post("/ai/detect-beats", response_model=BeatDetectionResponse)
async def detect_beats(
    request: BeatDetectionRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Detect beats in audio media."""
    # Verify media ownership and existence
    media_query = await db.execute(
        select(models.Media).where(
            models.Media.id == request.media_id, models.Media.user_id == current_user.id
        )
    )
    media = media_query.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Create persistent AI Job
    job = models.AIJob(
        user_id=current_user.id,
        project_id=media.project_id,
        job_type="beat_detection",
        status="pending",
        input_data={"media_id": request.media_id},
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(process_beat_detection, job.id)

    return BeatDetectionResponse(job_id=job.id, status="pending", beats=None)


@VIDEO_EDITOR_ROUTER.post("/ai/auto-trim", response_model=AutoTrimResponse)
async def auto_trim_silence(
    request: AutoTrimRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Automatically trim silence from media."""
    # Verify media ownership and existence
    media_query = await db.execute(
        select(models.Media).where(
            models.Media.id == request.media_id, models.Media.user_id == current_user.id
        )
    )
    media = media_query.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Create persistent AI Job
    job = models.AIJob(
        user_id=current_user.id,
        project_id=media.project_id,
        job_type="auto_trim",
        status="pending",
        input_data={
            "media_id": request.media_id,
            "threshold": request.threshold,
            "min_duration": request.min_duration,
        },
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(process_auto_trim, job.id)

    return AutoTrimResponse(
        job_id=job.id, status="pending", output_path=None, trimmed_sections=[]
    )


@VIDEO_EDITOR_ROUTER.post("/ai/enhance")
async def enhance_video(
    request: VideoEnhanceRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Apply AI enhancements (Hellation, Super-res, etc.) to video."""
    # Verify media ownership and existence
    media_query = await db.execute(
        select(models.Media).where(
            models.Media.id == request.media_id, models.Media.user_id == current_user.id
        )
    )
    media = media_query.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Create persistent AI Job
    job = models.AIJob(
        user_id=current_user.id,
        project_id=media.project_id,
        job_type="enhancement",
        status="pending",
        input_data={
            "media_id": request.media_id,
            "enhancements": request.enhancements,
        },
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(process_video_enhance, job.id)

    return {"job_id": job.id, "status": "pending"}


@VIDEO_EDITOR_ROUTER.post("/ai/search")
async def search_ai_content(request: SearchRequest):
    """Search across transcriptions and OCR results."""
    query = request.query.lower()
    results = []

    for job_id, job in jobs_db.items():
        # Search in transcriptions
        if job.get("type") == "transcription" and job.get("status") == "completed":
            text = job.get("text", "")
            if query in text.lower():
                results.append(
                    {
                        "id": job_id,
                        "media_id": job.get("media_id"),
                        "type": "transcription",
                        "preview": text[:100] + "...",
                        "matches": [
                            s
                            for s in job.get("segments", [])
                            if query in s.get("text", "").lower()
                        ],
                    }
                )

        # TODO: Refactor to use PostgreSQL models for AI job search
        pass

    return {"results": results}

@VIDEO_EDITOR_ROUTER.get("/ai/results")
async def list_ai_results(
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """List all AI job results for the current user."""
    query = await db.execute(
        select(models.AIJob).where(models.AIJob.user_id == current_user.id)
    )
    jobs = query.scalars().all()

    results = []
    for job in jobs:
        if job.job_type == "highlights":
            results.append(
                {
                    "id": job.id,
                    "media_id": job.input_data.get("media_id"),
                    "type": "highlights",
                    "preview": f"{len(job.result.get('highlights', [])) if job.result else 0} highlights",
                    "highlights": job.result.get("highlights") if job.result else None,
                }
            )
        elif job.job_type == "video_ocr":
            matches = job.result.get("ocr_results", []) if job.result else []
            results.append(
                {
                    "id": job.id,
                    "media_id": job.input_data.get("media_id"),
                    "type": "video_ocr",
                    "preview": f"{len(matches)} occurrences trouvées",
                    "matches": matches,
                }
            )

    return {"results": results}

@VIDEO_EDITOR_ROUTER.post("/ai/highlights")
async def extract_audio_highlights(
    request: HighlightRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Extract highlights from audio/video."""
    # Verify media ownership and existence
    media_query = await db.execute(
        select(models.Media).where(
            models.Media.id == request.media_id, models.Media.user_id == current_user.id
        )
    )
    media = media_query.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Create persistent AI Job
    job = models.AIJob(
        user_id=current_user.id,
        project_id=media.project_id,
        job_type="highlights",
        status="pending",
        input_data={
            "media_id": request.media_id,
            "min_duration": request.min_duration,
            "max_duration": request.max_duration,
        },
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(process_highlights, job.id)

    return {"job_id": job.id, "status": "pending"}
async def search_media_content(
    request: AISearchRequest,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Search within media content using AI."""
    # Verify media ownership and existence
    media_query = await db.execute(
        select(models.Media).where(
            models.Media.id == request.media_id, models.Media.user_id == current_user.id
        )
    )
    media = media_query.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # This is a synchronous AI search operation for now
    from .video_editor_ai_service import create_ai_service

    service = create_ai_service()
    results = await service.search_content(media.path, request.query)

    return {"media_id": request.media_id, "query": request.query, "results": results}


@VIDEO_EDITOR_ROUTER.post("/ai/index-ocr")
async def index_video_ocr(
    request: VideoOCRRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Start OCR indexing for a video."""
    # Verify media ownership and existence
    media_query = await db.execute(
        select(models.Media).where(
            models.Media.id == request.media_id, models.Media.user_id == current_user.id
        )
    )
    media = media_query.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Create persistent AI Job
    job = models.AIJob(
        user_id=current_user.id,
        project_id=media.project_id,
        job_type="video_ocr",
        status="pending",
        input_data={"media_id": request.media_id},
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(process_video_ocr, job.id)

    return {"job_id": job.id, "status": "pending"}


@VIDEO_EDITOR_ROUTER.post("/ai/magic-mask")
async def apply_magic_mask(
    request: MagicMaskRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Start Magic Mask background removal."""
    # Verify media ownership and existence
    media_query = await db.execute(
        select(models.Media).where(
            models.Media.id == request.media_id, models.Media.user_id == current_user.id
        )
    )
    media = media_query.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Create persistent AI Job
    job = models.AIJob(
        user_id=current_user.id,
        project_id=media.project_id,
        job_type="video_enhance",  # Re-uses video_enhance processing
        status="pending",
        input_data={
            "media_id": request.media_id,
            "enhancements": [{"type": "magic_mask", "strength": request.strength}],
        },
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(process_video_enhance, job.id)

    return {"job_id": job.id, "status": "pending"}


@VIDEO_EDITOR_ROUTER.post("/ai/dialogue-automation")
async def automate_dialogue(request: DialogueAutomationRequest):
    """Automate dialogue cuts (J-cut, L-cut)."""
    from .video_editor_ai_service import create_ai_service

    service = create_ai_service()

    results = []
    if request.type == "j-cut":
        # On suppose clips[0] est vidéo, clips[1] est audio
        res = service.dialogue_automation.apply_j_cut(
            request.clips[0], request.clips[1], request.overlap
        )
        results.append(res)
    elif request.type == "l-cut":
        res = service.dialogue_automation.apply_l_cut(
            request.clips[0], request.clips[1], request.overlap
        )
        results.append(res)

    return {"status": "success", "results": results}


@VIDEO_EDITOR_ROUTER.get("/ai/jobs/{job_id}/status")
async def get_ai_job_status(
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Get status of an AI job."""
    # Query persistent AI Job
    job_query = await db.execute(
        select(models.AIJob).where(
            models.AIJob.id == job_id, models.AIJob.user_id == current_user.id
        )
    )
    job = job_query.scalar_one_or_none()

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "job_id": job.id,
        "type": job.job_type,
        "status": job.status,
        "progress": job.progress,
        "result": job.result,
        "error": job.error,
        "created_at": job.created_at,
        "completed_at": job.completed_at,
    }


@VIDEO_EDITOR_ROUTER.post("/ai/voice-isolation")
async def isolate_voice(
    request: VoiceIsolationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Isolate voice from background noise."""
    # Verify media ownership and existence
    media_query = await db.execute(
        select(models.Media).where(
            models.Media.id == request.media_id, models.Media.user_id == current_user.id
        )
    )
    media = media_query.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Create persistent AI Job
    job = models.AIJob(
        user_id=current_user.id,
        project_id=media.project_id,
        job_type="voice_isolation",
        status="pending",
        input_data={"media_id": request.media_id},
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(process_voice_isolation, job.id)

    return {"job_id": job.id, "status": "pending"}


@VIDEO_EDITOR_ROUTER.post("/ai/audio-remix")
async def remix_audio(
    request: AudioRemixRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Remix music and speech."""
    # Verify music ownership and existence
    music_query = await db.execute(
        select(models.Media).where(
            models.Media.id == request.music_id, models.Media.user_id == current_user.id
        )
    )
    music = music_query.scalar_one_or_none()

    # Verify speech ownership and existence
    speech_query = await db.execute(
        select(models.Media).where(
            models.Media.id == request.speech_id, models.Media.user_id == current_user.id
        )
    )
    speech = speech_query.scalar_one_or_none()

    if not music or not speech:
        raise HTTPException(status_code=404, detail="Music or Speech media not found")

    # Create persistent AI Job
    job = models.AIJob(
        user_id=current_user.id,
        project_id=music.project_id,
        job_type="audio_remix",
        status="pending",
        input_data={
            "music_id": request.music_id,
            "speech_id": request.speech_id,
            "music_volume": request.music_volume,
            "speech_volume": request.speech_volume,
        },
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(process_audio_remix, job.id)

    return {"job_id": job.id, "status": "pending"}


@VIDEO_EDITOR_ROUTER.post("/ai/auto-ducking")
async def auto_ducking(
    request: AutoDuckingRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Start auto-ducking background task."""
    # Verify music ownership and existence
    music_query = await db.execute(
        select(models.Media).where(
            models.Media.id == request.music_id, models.Media.user_id == current_user.id
        )
    )
    music = music_query.scalar_one_or_none()

    # Verify speech ownership and existence
    speech_query = await db.execute(
        select(models.Media).where(
            models.Media.id == request.speech_id, models.Media.user_id == current_user.id
        )
    )
    speech = speech_query.scalar_one_or_none()

    if not music or not speech:
        raise HTTPException(status_code=404, detail="Media not found")

    # Create persistent AI Job
    job = models.AIJob(
        user_id=current_user.id,
        project_id=music.project_id,
        job_type="auto_ducking",
        status="pending",
        input_data={
            "music_id": request.music_id,
            "speech_id": request.speech_id,
        },
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(process_auto_ducking, job.id)

    return {"job_id": job.id, "status": "pending"}


@VIDEO_EDITOR_ROUTER.post("/ai/pan-scan")
async def pan_and_scan(
    request: PanScanRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Start smart pan & scan background task."""
    # Verify media ownership and existence
    media_query = await db.execute(
        select(models.Media).where(
            models.Media.id == request.media_id, models.Media.user_id == current_user.id
        )
    )
    media = media_query.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Create persistent AI Job
    job = models.AIJob(
        user_id=current_user.id,
        project_id=media.project_id,
        job_type="pan_scan",
        status="pending",
        input_data={"media_id": request.media_id},
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(process_pan_scan, job.id)

    return {"job_id": job.id, "status": "pending"}


@VIDEO_EDITOR_ROUTER.post("/ai/visual-summary")
async def generate_visual_summary(
    request: VisualSummaryRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Generate a visual summary (storyboard/contact sheet) from video."""
    # Verify media ownership and existence
    media_query = await db.execute(
        select(models.Media).where(
            models.Media.id == request.media_id, models.Media.user_id == current_user.id
        )
    )
    media = media_query.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Create persistent AI Job
    job = models.AIJob(
        user_id=current_user.id,
        project_id=media.project_id,
        job_type="visual_summary",
        status="pending",
        input_data={
            "media_id": request.media_id,
            "max_frames": request.max_frames,
        },
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(process_visual_summary, job.id)

    return {"job_id": job.id, "status": "pending"}


@VIDEO_EDITOR_ROUTER.post("/ai/multi-angle")
async def generate_multi_angle(request: MultiAngleRequest):
    """Generate prompts for multiple camera angles."""
    from .video_editor_ai_service import create_ai_service

    service = create_ai_service()
    prompts = await service.multi_angle.generate_angles(
        request.base_prompt, request.angles
    )
    return {"status": "success", "prompts": prompts}


@VIDEO_EDITOR_ROUTER.post("/ai/character-sheet")
async def generate_character_sheet(request: CharacterSheetRequest):
    """Generate a character consistency sheet."""
    from .video_editor_ai_service import create_ai_service

    service = create_ai_service()
    char_id = service.character_consistency.create_character_profile(
        request.name, request.reference_images
    )
    sheet = await service.character_consistency.generate_character_sheet(char_id)
    return {"status": "success", "char_id": char_id, "sheet": sheet}


@VIDEO_EDITOR_ROUTER.post("/ai/sprite")
async def generate_sprites(
    media_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Generate individual sprites from a media (sheet)."""
    # Verify media ownership and existence
    media_query = await db.execute(
        select(models.Media).where(
            models.Media.id == media_id, models.Media.user_id == current_user.id
        )
    )
    media = media_query.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    from .video_editor_ai_service import create_ai_service

    service = create_ai_service()

    output_dir = os.path.join(os.path.dirname(media.path), "sprites")
    os.makedirs(output_dir, exist_ok=True)
    sprites = await service.sprite.generate_sprite(media.path, output_dir)

    return {"status": "success", "sprites": sprites}


@VIDEO_EDITOR_ROUTER.post("/publish", response_model=PublishResponse)
async def publish_video(
    request: PublishRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Publish media to social platforms."""
    # Verify media ownership and existence
    media_query = await db.execute(
        select(models.Media).where(
            models.Media.id == request.media_id, models.Media.user_id == current_user.id
        )
    )
    media = media_query.scalar_one_or_none()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Create persistent AI Job for publishing
    job = models.AIJob(
        user_id=current_user.id,
        project_id=media.project_id,
        job_type="publish",
        status="pending",
        input_data={
            "media_id": request.media_id,
            "platforms": request.platforms,
            "title": request.title,
            "description": request.description,
            "tags": request.tags,
            "privacy": request.privacy,
        },
    )
    db.add(job)
    await db.commit()
    await db.refresh(job)

    background_tasks.add_task(process_publish, job.id)

    return PublishResponse(job_id=job.id, status="pending", platform_results={})


async def process_publish(job_id: str):
    """Mock background task for publishing."""
    # Note: In a real implementation, we would fetch the job from the DB
    results = {}
    platforms = ["wordpress", "storycore_market"]
    for platform in platforms:
        if platform == "wordpress":
            url = f"{settings.STORYCORE_WORDPRESS_URL}/?storycore_showcase={uuid.uuid4().hex[:8]}"
        elif platform == "storycore_market":
            url = f"{settings.STORYCORE_WORDPRESS_URL}/shop"
        else:
            url = f"https://{platform}.com/watch?v={uuid.uuid4().hex[:11]}"

        results[platform] = {
            "status": "completed",
            "url": url,
            "published_at": datetime.utcnow().isoformat(),
        }

    job["status"] = "completed"
    logger.info(f"Publish job {job_id} completed for platforms: {', '.join(platforms)}")


# =============================================================================
# Timeline & Track Operations
# =============================================================================


@VIDEO_EDITOR_ROUTER.post("/projects/{project_id}/tracks")
async def add_track(
    project_id: str,
    track_data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Add a new track to the project timeline."""
    query = select(models.Project).where(
        models.Project.id == project_id, models.Project.user_id == current_user.id
    )
    result = await db.execute(query)
    project = result.scalars().first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Load timeline data
    timeline_data = project.timeline_data or {"tracks": [], "duration": 0.0}
    if "tracks" not in timeline_data:
        timeline_data["tracks"] = []

    track_id = str(uuid.uuid4())
    new_track = {
        "id": track_id,
        "name": track_data.get("name", "New Track"),
        "type": track_data.get("type", "video"),
        "clips": [],
        "muted": False,
        "locked": False,
        "height": 60,
    }

    timeline_data["tracks"].append(new_track)
    project.timeline_data = timeline_data
    project.updated_at = datetime.utcnow()

    await db.commit()
    return new_track


@VIDEO_EDITOR_ROUTER.post("/projects/{project_id}/tracks/{track_id}/clips")
async def add_clip(
    project_id: str,
    track_id: str,
    clip_data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Add a clip to a specific track."""
    query = select(models.Project).where(
        models.Project.id == project_id, models.Project.user_id == current_user.id
    )
    result = await db.execute(query)
    project = result.scalars().first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    timeline_data = project.timeline_data or {"tracks": [], "duration": 0.0}
    track = next(
        (t for t in timeline_data.get("tracks", []) if t["id"] == track_id), None
    )

    if not track:
        raise HTTPException(status_code=404, detail="Track not found")

    clip_id = str(uuid.uuid4())
    new_clip = {
        "id": clip_id,
        "type": clip_data.get("type", "video"),
        "track_id": track_id,
        "start_time": clip_data.get("startTime", 0.0),
        "end_time": clip_data.get("startTime", 0.0) + clip_data.get("duration", 5.0),
        "name": clip_data.get("name", "Untitled Clip"),
        "media_id": clip_data.get("mediaId"),
        "file_path": clip_data.get("file_path"),
        "metadata": {},
    }

    track["clips"].append(new_clip)
    project.timeline_data = timeline_data
    project.updated_at = datetime.utcnow()

    await db.commit()
    return new_clip


@VIDEO_EDITOR_ROUTER.post("/projects/{project_id}/clips/{clip_id}/move")
async def move_clip(
    project_id: str,
    clip_id: str,
    move_data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Move a clip with optional ripple effect."""
    query = select(models.Project).where(
        models.Project.id == project_id, models.Project.user_id == current_user.id
    )
    result = await db.execute(query)
    project = result.scalars().first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    use_ripple = move_data.get("ripple", False)
    new_start = move_data.get("startTime", 0.0)
    new_track_id = move_data.get("trackId")

    # Sync to timeline_service
    timeline_data = project.timeline_data or {"tracks": [], "duration": 0.0}
    tl = timeline_service.create_timeline(project.name)
    temp_timeline_id = tl.id

    for p_track in timeline_data.get("tracks", []):
        t = timeline_service.add_track(
            temp_timeline_id, p_track["name"], ClipType(p_track["type"])
        )
        t.id = p_track["id"]
        for p_clip in p_track["clips"]:
            timeline_service.add_clip(
                temp_timeline_id,
                t.id,
                {
                    "id": p_clip["id"],
                    "type": ClipType(p_clip["type"]),
                    "track_id": t.id,
                    "start_time": p_clip["start_time"],
                    "end_time": p_clip["end_time"],
                    "name": p_clip["name"],
                },
            )

    # Perform operation
    success = False
    if use_ripple:
        success = timeline_service.ripple_move_clip(
            temp_timeline_id, clip_id, new_start
        )
    else:
        success = timeline_service.move_clip(
            temp_timeline_id, clip_id, new_start, new_track_id
        )

    if not success:
        raise HTTPException(status_code=400, detail="Move operation failed")

    # Sync back to DB
    project.timeline_data = timeline_service.export_to_dict(temp_timeline_id)
    project.updated_at = datetime.utcnow()

    await db.commit()
    return {"status": "success", "project": project.timeline_data}


@VIDEO_EDITOR_ROUTER.post("/projects/{project_id}/auto-assemble")
async def auto_assemble(
    project_id: str,
    assembly_data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Automatically assemble shots into a timeline sequence."""
    query = select(models.Project).where(
        models.Project.id == project_id, models.Project.user_id == current_user.id
    )
    result = await db.execute(query)
    project = result.scalars().first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    shots = assembly_data.get("shots", [])

    # Use TimelineService to assemble
    temp_tl = timeline_service.create_timeline(project.name)
    success = timeline_service.auto_assemble_sequence(temp_tl.id, shots)

    if not success:
        raise HTTPException(status_code=500, detail="Auto-assembly failed")

    # Merge back to project
    timeline_data = project.timeline_data or {"tracks": [], "duration": 0.0}
    new_tl_dict = timeline_service.export_to_dict(temp_tl.id)

    if "tracks" not in timeline_data:
        timeline_data["tracks"] = []

    timeline_data["tracks"].extend(new_tl_dict["tracks"])
    project.timeline_data = timeline_data
    project.updated_at = datetime.utcnow()

    await db.commit()
    return {"status": "success", "track_id": new_tl_dict["tracks"][0]["id"]}


@VIDEO_EDITOR_ROUTER.post("/projects/{project_id}/tracks/{track_id}/fill-gaps")
async def fill_gaps(
    project_id: str,
    track_id: str,
    filler_data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Fill gaps in a track with ambiance/silence."""
    query = select(models.Project).where(
        models.Project.id == project_id, models.Project.user_id == current_user.id
    )
    result = await db.execute(query)
    project = result.scalars().first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    timeline_data = project.timeline_data or {"tracks": [], "duration": 0.0}

    # Sync to timeline_service
    tl = timeline_service.create_timeline(project.name)
    temp_timeline_id = tl.id

    p_track = next(
        (t for t in timeline_data.get("tracks", []) if t["id"] == track_id), None
    )
    if not p_track:
        raise HTTPException(status_code=404, detail="Track not found")

    t = timeline_service.add_track(
        temp_timeline_id, p_track["name"], ClipType(p_track["type"])
    )
    t.id = p_track["id"]
    for p_clip in p_track["clips"]:
        timeline_service.add_clip(
            temp_timeline_id,
            t.id,
            {
                "id": p_clip["id"],
                "type": ClipType(p_clip["type"]),
                "track_id": t.id,
                "start_time": p_clip["start_time"],
                "end_time": p_clip["end_time"],
                "name": p_clip.get("name", "Untitled"),
            },
        )

    # Perform operation
    new_ids = timeline_service.fill_track_gaps(temp_timeline_id, track_id, filler_data)

    if not new_ids:
        return {"status": "success", "message": "No gaps found to fill", "clips": []}

    # Sync back
    project.timeline_data = timeline_service.export_to_dict(temp_timeline_id)
    project.updated_at = datetime.utcnow()

    await db.commit()
    return {"status": "success", "filled_clips": new_ids, "project": project.timeline_data}


@VIDEO_EDITOR_ROUTER.post("/projects/{project_id}/ai/generate-ambiance")
async def generate_ambiance(
    project_id: str,
    gen_data: Dict[str, Any],
    db: AsyncSession = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Generate custom ambiance audio using AI (CineProductionService)."""
    query = select(models.Project).where(
        models.Project.id == project_id, models.Project.user_id == current_user.id
    )
    result = await db.execute(query)
    project = result.scalars().first()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    prompt = gen_data.get("prompt")
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required")

    # Use CineProductionService for high-fidelity generation
    from backend.cine_production_service import (
        CineProductionService,
        CineProductionRequest,
        CineChainType,
    )

    cine_service = CineProductionService()

    request = CineProductionRequest(
        chain_type=CineChainType.MUSIC_PRO,
        project_id=project_id,
        scene_id=str(uuid.uuid4()),
        sound_prompt=prompt,
    )

    # Start job
    job = cine_service.start_production_job(request)

    # Wait for completion (simple polling loop for this API call)
    max_wait = 60  # 1 minute max for ambiance
    slept = 0
    while slept < max_wait:
        status_job = cine_service.get_job_status(job.id)
        if status_job.status == "completed":
            # Extract file path from results
            audio_result = next(
                (r for r in status_job.results if r.get("type") == "audio"), None
            )
            if audio_result and audio_result.get("path"):
                return {"status": "success", "file_path": audio_result["path"]}
            break
        elif status_job.status == "failed":
            raise HTTPException(
                status_code=500, detail=f"Generation failed: {status_job.error}"
            )

        await asyncio.sleep(2)
        slept += 2

    raise HTTPException(status_code=504, detail="Audio generation timed out")


async def process_transcription(job_id: str):
    """Background task for transcription."""
    from backend.video_editor_ai_service import TranscriptionService

    async with AsyncSessionLocal() as db:
        job_query = await db.execute(select(models.AIJob).where(models.AIJob.id == job_id))
        job = job_query.scalar_one_or_none()
        if not job:
            logger.error(f"Transcription job {job_id} not found")
            return

        job.status = "processing"
        await db.commit()

        try:
            media_id = job.input_data.get("media_id")
            media_query = await db.execute(
                select(models.Media).where(models.Media.id == media_id)
            )
            media = media_query.scalar_one_or_none()
            if not media:
                raise ValueError(f"Media {media_id} not found")

            service = TranscriptionService()
            result = await service.transcribe(media.path, language=job.input_data.get("language"))

            job.status = "completed"
            job.result = {
                "text": result.text,
                "segments": result.segments,
            }
            job.completed_at = datetime.utcnow()
            await db.commit()
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            await db.commit()
            logger.error(f"Transcription failed: {e}")


async def process_tts(job_id: str):
    """Background task for text-to-speech."""
    from backend.video_editor_ai_service import TTSService

    async with AsyncSessionLocal() as db:
        job_query = await db.execute(select(models.AIJob).where(models.AIJob.id == job_id))
        job = job_query.scalar_one_or_none()
        if not job:
            logger.error(f"TTS job {job_id} not found")
            return

        job.status = "processing"
        await db.commit()

        try:
            service = TTSService()
            text = job.input_data.get("text")
            if not text:
                raise ValueError("text is missing in job data")

            audio_path = str(MEDIA_DIR / "tts" / f"{job_id}.wav")
            Path(audio_path).parent.mkdir(parents=True, exist_ok=True)

            result = await service.text_to_speech(
                text=text, voice=job.input_data.get("voice"), output_path=audio_path
            )

            job.status = "completed"
            job.result = {"audio_path": result.audio_path}
            job.completed_at = datetime.utcnow()
            await db.commit()
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            await db.commit()
            logger.error(f"TTS failed: {e}")


async def process_smart_crop(job_id: str):
    """Background task for smart crop."""
    from backend.video_editor_ai_service import SmartCropService

    async with AsyncSessionLocal() as db:
        job_query = await db.execute(select(models.AIJob).where(models.AIJob.id == job_id))
        job = job_query.scalar_one_or_none()
        if not job:
            logger.error(f"Smart crop job {job_id} not found")
            return

        job.status = "processing"
        await db.commit()

        try:
            media_id = job.input_data.get("media_id")
            media_query = await db.execute(
                select(models.Media).where(models.Media.id == media_id)
            )
            media = media_query.scalar_one_or_none()
            if not media:
                raise ValueError(f"Media {media_id} not found")

            service = SmartCropService()
            result = await service.smart_crop(
                video_path=media.path,
                target_ratio=job.input_data.get("target_ratio", "9:16"),
                focus_mode=job.input_data.get("focus_mode", "auto"),
            )

            job.status = "completed"
            job.result = {"crop_regions": result.regions}
            job.completed_at = datetime.utcnow()
            await db.commit()
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            await db.commit()
            logger.error(f"Smart crop failed: {e}")


async def process_highlights(job_id: str):
    """Background task for highlights extraction."""
    from .video_editor_ai_service import create_ai_service

    async with AsyncSessionLocal() as db:
        job_query = await db.execute(select(models.AIJob).where(models.AIJob.id == job_id))
        job = job_query.scalar_one_or_none()
        if not job:
            return

        job.status = "processing"
        await db.commit()

        try:
            media_id = job.input_data.get("media_id")
            media_query = await db.execute(
                select(models.Media).where(models.Media.id == media_id)
            )
            media = media_query.scalar_one_or_none()
            if not media:
                raise ValueError(f"Media {media_id} not found")

            service = create_ai_service()
            highlights = await service.extract_highlights(
                media.path,
                min_duration=job.input_data.get("min_duration", 3),
                max_duration=job.input_data.get("max_duration", 10),
            )

            job.status = "completed"
            job.result = {"highlights": highlights}
            job.completed_at = datetime.utcnow()
            await db.commit()
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            await db.commit()


async def process_visual_summary(job_id: str):
    """Background task for visual summary."""
    from .video_editor_ai_service import create_ai_service

    async with AsyncSessionLocal() as db:
        job_query = await db.execute(select(models.AIJob).where(models.AIJob.id == job_id))
        job = job_query.scalar_one_or_none()
        if not job:
            return

        job.status = "processing"
        await db.commit()

        try:
            media_id = job.input_data.get("media_id")
            media_query = await db.execute(
                select(models.Media).where(models.Media.id == media_id)
            )
            media = media_query.scalar_one_or_none()
            if not media:
                raise ValueError(f"Media {media_id} not found")

            service = create_ai_service()
            summary = await service.generate_visual_summary(
                media.path, max_frames=job.input_data.get("max_frames", 10)
            )

            job.status = "completed"
            job.result = {"summary": summary}
            job.completed_at = datetime.utcnow()
            await db.commit()
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            await db.commit()


async def process_auto_ducking(job_id: str):
    """Background task for auto-ducking."""
    from .video_editor_ai_service import create_ai_service

    async with AsyncSessionLocal() as db:
        job_query = await db.execute(select(models.AIJob).where(models.AIJob.id == job_id))
        job = job_query.scalar_one_or_none()
        if not job:
            return

        job.status = "processing"
        await db.commit()

        try:
            music_id = job.input_data.get("music_id")
            speech_id = job.input_data.get("speech_id")

            music_query = await db.execute(
                select(models.Media).where(models.Media.id == music_id)
            )
            music = music_query.scalar_one_or_none()

            speech_query = await db.execute(
                select(models.Media).where(models.Media.id == speech_id)
            )
            speech = speech_query.scalar_one_or_none()

            if not music or not speech:
                raise ValueError("Music or Speech media not found")

            service = create_ai_service()
            output_path = music.path.replace(".", "_ducked.")
            success = await service.auto_duck(music.path, speech.path, output_path)

            if success:
                job.status = "completed"
                job.result = {"output_path": output_path}
                job.completed_at = datetime.utcnow()
            else:
                job.status = "failed"
                job.error = "Ducking process failed"
            await db.commit()
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            await db.commit()


async def process_pan_scan(job_id: str):
    """Background task for smart pan & scan."""
    from .video_editor_ai_service import create_ai_service

    async with AsyncSessionLocal() as db:
        job_query = await db.execute(select(models.AIJob).where(models.AIJob.id == job_id))
        job = job_query.scalar_one_or_none()
        if not job:
            return

        job.status = "processing"
        await db.commit()

        try:
            media_id = job.input_data.get("media_id")
            media_query = await db.execute(
                select(models.Media).where(models.Media.id == media_id)
            )
            media = media_query.scalar_one_or_none()
            if not media:
                raise ValueError(f"Media {media_id} not found")

            service = create_ai_service()
            output_path = media.path.replace(".", "_panscan.")
            success = await service.smart_pan_scan(media.path, output_path)

            if success:
                job.status = "completed"
                job.result = {"output_path": output_path}
                job.completed_at = datetime.utcnow()
            else:
                job.status = "failed"
                job.error = "Pan & Scan failed"
            await db.commit()
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            await db.commit()


async def process_video_ocr(job_id: str):
    """Background task for video OCR indexing."""
    from .video_editor_ai_service import create_ai_service

    async with AsyncSessionLocal() as db:
        job_query = await db.execute(select(models.AIJob).where(models.AIJob.id == job_id))
        job = job_query.scalar_one_or_none()
        if not job:
            return

        job.status = "processing"
        await db.commit()

        try:
            media_id = job.input_data.get("media_id")
            media_query = await db.execute(
                select(models.Media).where(models.Media.id == media_id)
            )
            media = media_query.scalar_one_or_none()
            if not media:
                raise ValueError(f"Media {media_id} not found")

            service = create_ai_service()
            ocr_results = await service.video_ocr(media.path)

            job.status = "completed"
            job.result = {"ocr_results": ocr_results}
            job.completed_at = datetime.utcnow()
            await db.commit()
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            await db.commit()


async def process_voice_isolation(job_id: str):
    """Background task for voice isolation."""
    from .video_editor_ai_service import create_ai_service

    async with AsyncSessionLocal() as db:
        job_query = await db.execute(select(models.AIJob).where(models.AIJob.id == job_id))
        job = job_query.scalar_one_or_none()
        if not job:
            return

        job.status = "processing"
        await db.commit()

        try:
            media_id = job.input_data.get("media_id")
            media_query = await db.execute(
                select(models.Media).where(models.Media.id == media_id)
            )
            media = media_query.scalar_one_or_none()
            if not media:
                raise ValueError(f"Media {media_id} not found")

            service = create_ai_service()
            output_path = media.path.replace(".", "_isolated.")
            success = await service.isolate_voice(media.path, output_path)

            if success:
                job.status = "completed"
                job.result = {"output_path": output_path}
                job.completed_at = datetime.utcnow()
            else:
                job.status = "failed"
                job.error = "Voice isolation failed"
            await db.commit()
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            await db.commit()


async def process_audio_remix(job_id: str):
    """Background task for audio remixing."""
    from .video_editor_ai_service import create_ai_service

    async with AsyncSessionLocal() as db:
        job_query = await db.execute(select(models.AIJob).where(models.AIJob.id == job_id))
        job = job_query.scalar_one_or_none()
        if not job:
            return

        job.status = "processing"
        await db.commit()

        try:
            music_id = job.input_data.get("music_id")
            speech_id = job.input_data.get("speech_id")

            music_query = await db.execute(
                select(models.Media).where(models.Media.id == music_id)
            )
            music = music_query.scalar_one_or_none()

            speech_query = await db.execute(
                select(models.Media).where(models.Media.id == speech_id)
            )
            speech = speech_query.scalar_one_or_none()

            if not music or not speech:
                raise ValueError("Music or Speech media not found")

            service = create_ai_service()
            output_path = music.path.replace(".", "_remixed.")
            success = await service.remix_audio(
                music.path,
                speech.path,
                output_path,
                music_volume=job.input_data.get("music_volume", 0.5),
                speech_volume=job.input_data.get("speech_volume", 1.0),
            )

            if success:
                job.status = "completed"
                job.result = {"output_path": output_path}
                job.completed_at = datetime.utcnow()
            else:
                job.status = "failed"
                job.error = "Audio remix failed"
            await db.commit()
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            await db.commit()


async def process_beat_detection(job_id: str):
    """Background task for beat detection."""
    from .video_editor_ai_service import create_ai_service

    async with AsyncSessionLocal() as db:
        job_query = await db.execute(select(models.AIJob).where(models.AIJob.id == job_id))
        job = job_query.scalar_one_or_none()
        if not job:
            logger.error(f"Beat detection job {job_id} not found")
            return

        job.status = "processing"
        await db.commit()

        try:
            media_id = job.input_data.get("media_id")
            media_query = await db.execute(
                select(models.Media).where(models.Media.id == media_id)
            )
            media = media_query.scalar_one_or_none()
            if not media:
                raise ValueError(f"Media {media_id} not found")

            service = create_ai_service()
            beats = await service.detect_beats(media.path)

            job.status = "completed"
            job.result = {"beats": beats}
            job.completed_at = datetime.utcnow()
            await db.commit()
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            await db.commit()
            logger.error(f"Beat detection failed: {e}")


async def process_auto_trim(job_id: str):
    """Background task for auto trim silence."""
    from .video_editor_ai_service import create_ai_service

    async with AsyncSessionLocal() as db:
        job_query = await db.execute(select(models.AIJob).where(models.AIJob.id == job_id))
        job = job_query.scalar_one_or_none()
        if not job:
            logger.error(f"Auto trim job {job_id} not found")
            return

        job.status = "processing"
        await db.commit()

        try:
            media_id = job.input_data.get("media_id")
            media_query = await db.execute(
                select(models.Media).where(models.Media.id == media_id)
            )
            media = media_query.scalar_one_or_none()
            if not media:
                raise ValueError(f"Media {media_id} not found")

            service = create_ai_service()

            input_path = media.path
            output_path = input_path.replace(".", "_trimmed.")

            success = await service.auto_trim_silence(input_path, output_path)

            if success:
                job.status = "completed"
                job.result = {"output_path": output_path}
                job.completed_at = datetime.utcnow()
            else:
                job.status = "failed"
                job.error = "FFmpeg silence removal failed"
            await db.commit()
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            await db.commit()
            logger.error(f"Auto trim failed: {e}")


async def process_video_enhance(job_id: str):
    """Background task for video enhancement."""
    from .video_enhancement_service import (
        get_enhancement_service,
        EnhancementConfig,
        EnhancementType,
    )

    async with AsyncSessionLocal() as db:
        job_query = await db.execute(select(models.AIJob).where(models.AIJob.id == job_id))
        job = job_query.scalar_one_or_none()
        if not job:
            logger.error(f"Video enhancement job {job_id} not found")
            return

        job.status = "processing"
        await db.commit()

        try:
            media_id = job.input_data.get("media_id")
            media_query = await db.execute(
                select(models.Media).where(models.Media.id == media_id)
            )
            media = media_query.scalar_one_or_none()
            if not media:
                raise ValueError(f"Media {media_id} not found")

            service = get_enhancement_service()

            input_path = media.path
            output_path = input_path.replace(".", "_enhanced.")

            enhancements_data = job.input_data.get("enhancements", [])
            enhancements = []
            for enc in enhancements_data:
                enhancements.append(
                    EnhancementConfig(
                        type=EnhancementType(enc["type"]),
                        strength=enc.get("strength", 0.5),
                        model=enc.get("model", "default"),
                        preset=enc.get("preset", "natural"),
                    )
                )

            result = service.enhance_video(input_path, output_path, enhancements)

            if result.get("success"):
                job.status = "completed"
                job.result = {"output_path": output_path, "details": result}
                job.completed_at = datetime.utcnow()
            else:
                job.status = "failed"
                job.error = result.get("error", "Enhancement failed")
            await db.commit()
        except Exception as e:
            job.status = "failed"
            job.error = str(e)
            await db.commit()
            logger.error(f"Video enhancement failed: {e}")



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
            "redis": get_redis() is not None,
        },
    }


# =============================================================================
# Utility Functions
# =============================================================================


@VIDEO_EDITOR_ROUTER.get("/presets")
async def get_export_presets():
    """Get available export presets."""
    return {
        "presets": [
            {
                "id": "youtube_1080p",
                "name": "YouTube 1080p",
                "resolution": "1920x1080",
                "format": "mp4",
            },
            {
                "id": "youtube_4k",
                "name": "YouTube 4K",
                "resolution": "3840x2160",
                "format": "mp4",
            },
            {
                "id": "tiktok",
                "name": "TikTok/Reels",
                "resolution": "1080x1920",
                "format": "mp4",
            },
            {
                "id": "instagram_feed",
                "name": "Instagram Feed",
                "resolution": "1080x1080",
                "format": "mp4",
            },
            {
                "id": "twitter",
                "name": "Twitter/X",
                "resolution": "1280x720",
                "format": "mp4",
            },
            {
                "id": "custom",
                "name": "Custom",
                "resolution": "1920x1080",
                "format": "mp4",
            },
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
            {"id": "21:9", "name": "Ultrawide", "width": 21, "height": 9},
        ]
    }


# =============================================================================
# 3D Asset Forging Endpoints
# =============================================================================


@VIDEO_EDITOR_ROUTER.post("/forge-3d-asset", response_model=Forge3DResponse)
async def forge_3d_asset(
    request: Forge3DRequest,
    user: models.User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Forge a 3D asset (.glb) from a 2D image using tttLRM with ownership validation.
    """
    # 1. Verify project ownership
    query = select(models.Project).where(
        models.Project.id == request.project_id, models.Project.user_id == user.id
    )
    result = await db.execute(query)
    project = result.scalars().first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    try:
        # 2. Resolve paths
        project_path = PROJECTS_DIR / user.id / request.project_id
        if not project_path.exists():
            # Legacy fallback
            project_path = PROJECTS_DIR / request.project_id

        if not project_path.exists():
            raise HTTPException(
                status_code=404, detail=f"Project folder not found on disk"
            )

        input_image_path = project_path / request.image_path
        if not input_image_path.exists():
            # Try finding by just filename if relative path fails
            filename = Path(request.image_path).name
            for sub in ["media", "generations"]:
                p = project_path / sub / filename
                if p.exists():
                    input_image_path = p
                    break

        if not input_image_path.exists():
            raise HTTPException(
                status_code=404, detail=f"Input image not found: {request.image_path}"
            )

        # 3. Configure reconstruction
        output_dir = project_path / "objects" / "models"
        output_dir.mkdir(parents=True, exist_ok=True)

        config = TTTLRMConfig(
            input_path=str(input_image_path),
            output_dir=str(output_dir),
            mode=ReconstructionMode.TTT_ADAPTED
            if request.mode == "ttt_adapted"
            else ReconstructionMode.FEEDFORWARD,
            output_format=OutputFormat.MESH,
        )

        # 4. Trigger reconstruction
        result = await ttt_lrm_service.reconstruct_single_image(config)

        if not result.success:
            return Forge3DResponse(status="failed", error="Reconstruction failed")

        # 5. Convert GS to Mesh (.glb)
        model_filename = f"obj_{request.object_id}.glb"
        model_path = output_dir / model_filename

        success = ttt_lrm_service.convert_gs_to_mesh(
            result.output_path, str(model_path)
        )

        if not success:
            return Forge3DResponse(status="failed", error="Mesh conversion failed")

        # 6. Return relative path for frontend
        relative_model_path = f"objects/models/{model_filename}"

        return Forge3DResponse(status="success", model_path=relative_model_path)

    except Exception as e:
        logger.error(f"Error forging 3D asset: {e}")
        if isinstance(e, HTTPException):
            raise
        return Forge3DResponse(status="error", error=str(e))
