"""
StoryCore-Engine Series & Character Management API
===================================================

Provides REST API endpoints for episodic storytelling, advanced character profiles,
and moodboard visual consistency.

Requirements: Manga/Anime Series Expansion (Q2 2026)
"""

import logging
import uuid
from datetime import datetime
from typing import List, Optional, Dict, Any

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete

from backend.auth import verify_jwt_token
from backend.database import get_db
from backend.database_models import Episode, Character, Moodboard

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/series", tags=["series"])

# =============================================================================
# Pydantic Models (Schemas)
# =============================================================================

class EpisodeBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    number: int = Field(default=1)
    synopsis: Optional[str] = None
    status: str = Field(default="draft") # draft, storyboard, production, final

class EpisodeCreate(EpisodeBase):
    project_id: str

class EpisodeUpdate(BaseModel):
    title: Optional[str] = None
    number: Optional[int] = None
    synopsis: Optional[str] = None
    status: Optional[str] = None
    storyboard_data: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None

class MoodboardReference(BaseModel):
    url: str
    type: str = "image"
    note: Optional[str] = None

class MoodboardUpdate(BaseModel):
    name: Optional[str] = None
    vision_description: Optional[str] = None
    art_style: Optional[str] = None
    references: Optional[List[MoodboardReference]] = None
    color_palette: Optional[List[str]] = None

# =============================================================================
# Episode Endpoints
# =============================================================================

@router.post("/episodes", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED)
async def create_episode(
    episode: EpisodeCreate,
    db: AsyncSession = Depends(get_db),
    user_id: str = Depends(verify_jwt_token)
):
    """Create a new episode for a project."""
    new_ep = Episode(
        id=str(uuid.uuid4()),
        project_id=episode.project_id,
        title=episode.title,
        number=episode.number,
        synopsis=episode.synopsis,
        status=episode.status
    )
    db.add(new_ep)
    await db.flush()
    return {"id": new_ep.id, "title": new_ep.title, "number": new_ep.number}

@router.get("/project/{project_id}/episodes", response_model=List[Dict[str, Any]])
async def list_project_episodes(
    project_id: str,
    db: AsyncSession = Depends(get_db)
):
    """List all episodes for a specific project."""
    result = await db.execute(select(Episode).where(Episode.project_id == project_id).order_by(Episode.number))
    episodes = result.scalars().all()
    return [{"id": ep.id, "title": ep.title, "number": ep.number, "status": ep.status} for ep in episodes]

@router.get("/episodes/{episode_id}", response_model=Dict[str, Any])
async def get_episode_details(
    episode_id: str,
    db: AsyncSession = Depends(get_db)
):
    """Get full details for an episode."""
    result = await db.execute(select(Episode).where(Episode.id == episode_id))
    ep = result.scalar_one_or_none()
    if not ep:
        raise HTTPException(status_code=404, detail="Episode not found")
    
    return {
        "id": ep.id,
        "title": ep.title,
        "number": ep.number,
        "status": ep.status,
        "synopsis": ep.synopsis,
        "storyboard_data": ep.storyboard_data,
        "settings": ep.settings
    }
