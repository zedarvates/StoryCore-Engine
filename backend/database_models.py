"""
Database Models for Video Editor Wizard

SQLAlchemy models for PostgreSQL database integration.
Compatible with async SQLAlchemy (SQLAlchemy 2.0).

Author: StoryCore Team
Version: 1.0.0
"""

from datetime import datetime
from typing import Optional
import os
from sqlalchemy import (
    Column, String, DateTime, Float, Integer, Boolean, 
    Text, JSON, ForeignKey, Index, UniqueConstraint
)
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
import uuid

Base = declarative_base()


def generate_uuid() -> str:
    """Generate a UUID string."""
    return str(uuid.uuid4())


class TimestampMixin:
    """Mixin for adding created_at and updated_at timestamps."""
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class User(Base, TimestampMixin):
    """User model for authentication and subscription management."""
    
    __tablename__ = "video_editor_users"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(255), nullable=False)
    avatar_url = Column(String(500), nullable=True)
    plan = Column(String(50), default="free")  # free, pro, team
    
    # Subscription fields
    stripe_customer_id = Column(String(255), nullable=True)
    subscription_status = Column(String(50), default="active")
    subscription_end_date = Column(DateTime, nullable=True)
    
    # Usage limits
    monthly_transcription_minutes = Column(Integer, default=5)
    monthly_export_minutes = Column(Integer, default=30)
    storage_used_mb = Column(Integer, default=0)
    storage_limit_mb = Column(Integer, default=1000)
    
    # Settings
    settings = Column(JSON, nullable=True)  # User preferences
    
    # Relationships
    projects = relationship("Project", back_populates="user", cascade="all, delete-orphan")
    export_jobs = relationship("ExportJob", back_populates="user", cascade="all, delete-orphan")
    ai_jobs = relationship("AIJob", back_populates="user", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, plan={self.plan})>"
    
    @property
    def is_pro(self) -> bool:
        """Check if user has pro plan."""
        return self.plan in ["pro", "team"]
    
    @property
    def can_transcribe(self) -> bool:
        """Check if user can transcribe more media."""
        return self.monthly_transcription_minutes > 0
    
    @property
    def can_export(self) -> bool:
        """Check if user can export."""
        return self.monthly_export_minutes > 0


class Project(Base, TimestampMixin):
    """Video editing project model."""
    
    __tablename__ = "video_editor_projects"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("video_editor_users.id"), nullable=False, index=True)
    
    # Basic info
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    
    # Video settings
    aspect_ratio = Column(String(10), default="16:9")  # 16:9, 9:16, 1:1, 4:5, 4:3, 21:9
    resolution = Column(String(20), default="1920x1080")  # 1920x1080, 1080x1920, etc.
    frame_rate = Column(Float, default=30.0)
    duration = Column(Float, default=0.0)
    
    # Paths
    thumbnail_path = Column(String(500), nullable=True)
    preview_path = Column(String(500), nullable=True)
    
    # Project state
    is_public = Column(Boolean, default=False)
    is_archived = Column(Boolean, default=False)
    
    # Project settings
    settings = Column(JSON, nullable=True)
    timeline_data = Column(JSON, nullable=True)  # Serialized timeline state
    
    # Versioning
    version = Column(Integer, default=1)
    
    # Relationships
    user = relationship("User", back_populates="projects")
    media = relationship("Media", back_populates="project", cascade="all, delete-orphan")
    export_jobs = relationship("ExportJob", back_populates="project", cascade="all, delete-orphan")
    
    # Indexes
    __table_args__ = (
        Index("idx_project_user_aspect", "user_id", "aspect_ratio"),
        Index("idx_project_updated", "updated_at"),
    )
    
    def __repr__(self):
        return f"<Project(id={self.id}, name={self.name}, duration={self.duration})>"


class Media(Base, TimestampMixin):
    """Media file model for videos, audio, and images."""
    
    __tablename__ = "video_editor_media"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("video_editor_projects.id"), nullable=True, index=True)
    user_id = Column(String(36), ForeignKey("video_editor_users.id"), nullable=False, index=True)
    
    # Basic info
    name = Column(String(255), nullable=False)
    original_filename = Column(String(255), nullable=False)
    media_type = Column(String(50), nullable=False)  # video, audio, image
    
    # File info
    path = Column(String(500), nullable=False)
    file_size = Column(Integer, default=0)  # in bytes
    
    # Video-specific
    duration = Column(Float, nullable=True)
    resolution = Column(String(20), nullable=True)  # e.g., "1920x1080"
    frame_rate = Column(Float, nullable=True)
    codec = Column(String(100), nullable=True)
    
    # Audio-specific
    sample_rate = Column(Integer, nullable=True)
    audio_channels = Column(Integer, nullable=True)
    
    # Image-specific
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    
    # Generated assets
    thumbnail_path = Column(String(500), nullable=True)
    waveform_path = Column(String(500), nullable=True)  # For audio visualization
    
    # Metadata
    metadata = Column(JSON, nullable=True)
    ai_metadata = Column(JSON, nullable=True)  # Transcription, tags, etc.
    
    # Relationships
    project = relationship("Project", back_populates="media")
    
    # Indexes
    __table_args__ = (
        Index("idx_media_project_type", "project_id", "media_type"),
        Index("idx_media_user_type", "user_id", "media_type"),
    )
    
    def __repr__(self):
        return f"<Media(id={self.id}, name={self.name}, type={self.media_type})>"
    
    @property
    def formatted_size(self) -> str:
        """Format file size for display."""
        for unit in ['B', 'KB', 'MB', 'GB']:
            if self.file_size < 1024:
                return f"{self.file_size:.1f} {unit}"
            self.file_size /= 1024
        return f"{self.file_size:.1f} TB"


class ExportJob(Base, TimestampMixin):
    """Export job model for tracking video exports."""
    
    __tablename__ = "video_editor_export_jobs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("video_editor_projects.id"), nullable=False, index=True)
    user_id = Column(String(36), ForeignKey("video_editor_users.id"), nullable=False, index=True)
    
    # Status
    status = Column(String(50), default="pending")  # pending, processing, completed, failed, cancelled
    progress = Column(Float, default=0.0)
    message = Column(String(500), nullable=True)
    
    # Export settings
    format = Column(String(20), default="mp4")
    preset = Column(String(50), default="custom")
    resolution = Column(String(20), nullable=True)
    quality = Column(String(20), default="high")  # low, medium, high, ultra
    codec = Column(String(50), nullable=True)
    
    # Output
    output_path = Column(String(500), nullable=True)
    file_size = Column(Integer, nullable=True)
    download_url = Column(String(500), nullable=True)
    
    # Error info
    error = Column(Text, nullable=True)
    error_details = Column(JSON, nullable=True)
    
    # Timing
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    estimated_duration = Column(Float, nullable=True)
    
    # Relationships
    project = relationship("Project", back_populates="export_jobs")
    user = relationship("User", back_populates="export_jobs")
    
    # Indexes
    __table_args__ = (
        Index("idx_export_status", "status"),
        Index("idx_export_user_status", "user_id", "status"),
    )
    
    def __repr__(self):
        return f"<ExportJob(id={self.id}, status={self.status}, progress={self.progress}%)>"
    
    @property
    def is_pending(self) -> bool:
        """Check if job is still pending."""
        return self.status in ["pending", "processing"]
    
    @property
    def is_complete(self) -> bool:
        """Check if job is completed."""
        return self.status == "completed"


class AIJob(Base, TimestampMixin):
    """AI processing job model for tracking AI operations."""
    
    __tablename__ = "video_editor_ai_jobs"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("video_editor_users.id"), nullable=False, index=True)
    
    # Job type
    job_type = Column(String(50), nullable=False)  # transcription, tts, translate, smart_crop, audio_clean
    
    # Status
    status = Column(String(50), default="pending")
    progress = Column(Float, default=0.0)
    
    # Input
    input_data = Column(JSON, nullable=True)  # { media_id, parameters, ... }
    input_path = Column(String(500), nullable=True)
    
    # Output
    output_data = Column(JSON, nullable=True)  # { result, ... }
    output_path = Column(String(500), nullable=True)
    
    # Error
    error = Column(Text, nullable=True)
    error_details = Column(JSON, nullable=True)
    
    # Timing
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Relationships
    user = relationship("User", back_populates="ai_jobs")
    
    # Indexes
    __table_args__ = (
        Index("idx_ai_job_type", "job_type"),
        Index("idx_ai_user_type_status", "user_id", "job_type", "status"),
    )
    
    def __repr__(self):
        return f"<AIJob(id={self.id}, type={self.job_type}, status={self.status})>"
    
    @property
    def is_complete(self) -> bool:
        """Check if job is completed."""
        return self.status == "completed"


class Subtitle(Base, TimestampMixin):
    """Subtitle/CC model for video subtitles."""
    
    __tablename__ = "video_editor_subtitles"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("video_editor_projects.id"), nullable=False, index=True)
    
    # Content
    language = Column(String(10), default="fr")  # ISO 639-1
    label = Column(String(100), nullable=True)  # Display name
    
    # Subtitle format (SRT, VTT, etc.)
    format = Column(String(10), default="srt")
    
    # Data
    entries = Column(JSON, nullable=False)  # [{ start, end, text }, ...]
    
    # Translation
    is_translated = Column(Boolean, default=False)
    source_language = Column(String(10), nullable=True)
    
    # Relationships
    project_id = Column(String(36), ForeignKey("video_editor_projects.id"))
    
    def __repr__(self):
        return f"<Subtitle(id={self.id}, language={self.language}, entries={len(self.entries)})>"


class Template(Base, TimestampMixin):
    """Project template model."""
    
    __tablename__ = "video_editor_templates"
    
    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("video_editor_users.id"), nullable=True)  # NULL = system template
    
    # Info
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)  # social, marketing, education, etc.
    
    # Preview
    thumbnail_path = Column(String(500), nullable=True)
    
    # Settings
    aspect_ratio = Column(String(10), nullable=False)
    resolution = Column(String(20), nullable=True)
    duration = Column(Float, nullable=True)
    
    # Template data
    template_data = Column(JSON, nullable=False)  # Preset timeline/media configuration
    
    # Usage
    is_premium = Column(Boolean, default=False)
    usage_count = Column(Integer, default=0)
    
    # Visibility
    is_public = Column(Boolean, default=True)
    
    def __repr__(self):
        return f"<Template(id={self.id}, name={self.name}, category={self.category})>"


# =============================================================================
# Database Setup Functions
# =============================================================================

def create_tables(engine):
    """Create all tables in the database."""
    Base.metadata.create_all(engine)


def drop_tables(engine):
    """Drop all tables from the database."""
    Base.metadata.drop_all(engine)


async def create_tables_async(engine):
    """Create all tables asynchronously."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def drop_tables_async(engine):
    """Drop all tables asynchronously."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


# =============================================================================
# Example Usage
# =============================================================================

if __name__ == "__main__":
    from sqlalchemy import create_engine
    
    # PostgreSQL connection - Lecture depuis variable d'environnement
    # =============================================================================
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    if not DATABASE_URL:
        raise ValueError(
            "DATABASE_URL environment variable is not set. "
            "Please set DATABASE_URL to connect to PostgreSQL."
        )
    
    engine = create_engine(DATABASE_URL)
    
    # Create tables
    create_tables(engine)
    print("Database tables created successfully!")
    
    # Print table info
    for table in Base.metadata.tables.values():
        print(f"\n{table.name}:")
        for column in table.columns:
            print(f"  - {column.name}: {column.type}")
