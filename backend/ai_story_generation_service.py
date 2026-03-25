"""
AI Story Generation Service for StoryCore-Engine

Enhanced story generation with multi-agent critique system,
AI-powered creative tools, and continuous improvement loop.
"""

import asyncio
import logging
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Tuple, Union

from pydantic import BaseModel, Field, validator
from fastapi import HTTPException

from backend.story_generation_service import StoryGenerationService, StoryGenre, StoryStructure, ProductionMode
from backend.database import get_db
from backend.database_models import Story, StoryStatus, generate_uuid

logger = logging.getLogger(__name__)

# =============================================================================
# Data Models
# =============================================================================

class StoryGenerationRequest(BaseModel):
    prompt: str = Field(..., min_length=5, description="Prompt for story generation")
    genre: str = Field(default="DRAMA", description="Genre of the story")
    structure: str = Field(default="THREE_ACT", description="Story structure")
    mode: str = Field(default="FICTION", description="Production mode")
    length: str = Field(default="medium", description="Length of story")
    with_critique: bool = Field(default=False, description="Enable multi-agent critique")
    temperature: float = Field(default=0.7, ge=0.0, le=1.0, description="Creativity temperature")
    max_attempts: int = Field(default=3, ge=1, le=10, description="Maximum refinement attempts")

    @validator('genre')
    def validate_genre(cls, v):
        valid_genres = [g.value for g in StoryGenre]
        if v.upper() not in valid_genres:
            raise ValueError(f"Invalid genre. Must be one of: {valid_genres}")
        return v.upper()

    @validator('structure')
    def validate_structure(cls, v):
        valid_structures = [s.value for s in StoryStructure]
        if v.upper() not in valid_structures:
            raise ValueError(f"Invalid structure. Must be one of: {valid_structures}")
        return v.upper()

    @validator('mode')
    def validate_mode(cls, v):
        valid_modes = [m.value for m in ProductionMode]
        if v.upper() not in valid_modes:
            raise ValueError(f"Invalid mode. Must be one of: {valid_modes}")
        return v.upper()

class StoryGenerationResponse(BaseModel):
    id: str
    title: str
    synopsis: str
    genre: str
    mode: str
    length: str
    characters: List[Dict[str, Any]]
    locations: List[Dict[str, Any]]
    scenes: List[Dict[str, Any]]
    critique: Optional[str] = None
    status: str = "generating"
    version: int = 1

class StoryRefinementRequest(BaseModel):
    story_id: str
    feedback: str

class StoryRefinementResponse(BaseModel):
    id: str
    title: str
    synopsis: str
    genre: str
    mode: str
    length: str
    characters: List[Dict[str, Any]]
    locations: List[Dict[str, Any]]
    scenes: List[Dict[str, Any]]
    critique: Optional[str] = None
    status: str = "refining"
    version: int = 2

# =============================================================================
# AI Story Generation Service
# =============================================================================

class AIDrivenStoryGenerationService:
    """
    Enhanced story generation service with AI capabilities and multi-agent critique system.
    Provides end-to-end story creation with continuous improvement through feedback.
    """
    
    def __init__(self):
        self.service = StoryGenerationService()
        self.generation_cache = {}  # Cache for generated stories
        self.completed_stories = {}  # Track completed stories for feedback
        
        # AI model configurations
        self.model_configs = {
            'creative': {
                'temperature': 0.8,
                'top_p': 0.9,
                'max_tokens': 2048
            },
            'balanced': {
                'temperature': 0.7,
                'top_p': 0.8,
                'max_tokens': 1536
            },
            'precise': {
                'temperature': 0.5,
                'top_p': 0.7,
                'max_tokens': 1024
            }
        }
    
    async def generate_story(self, req: StoryGenerationRequest) -> StoryGenerationResponse:
        """
        Generate a story using AI with optional multi-agent critique.
        
        Args:
            req: Story generation request
            
        Returns:
            Story generation response with critique if enabled
        """
        story_id = generate_uuid()
        attempt = 1
        max_attempts = req.max_attempts
        current_req = req
        
        while attempt <= max_attempts:
            try:
                logger.info(f"Story generation attempt {attempt}/{max_attempts} for prompt: {current_req.prompt[:100]}...")
                # Convert strings to Enums
                genre = getattr(StoryGenre, current_req.genre.upper(), StoryGenre.DRAMA)
                structure = getattr(StoryStructure, current_req.structure.upper(), StoryStructure.THREE_ACT)
                mode = getattr(ProductionMode, current_req.mode.upper(), ProductionMode.FICTION)
                
                # Generate story using existing service
                story = await self.service.generate_story(
                    prompt=current_req.prompt,
                    genre=genre,
                    structure=structure,
                    mode=mode,
                    length=current_req.length,
                    with_critique=False  # We'll handle critique separately
                )
                
                logger.info(f"Successfully generated story: {story.title} (ID: {story_id})")
                
                # Create response model
                response = StoryGenerationResponse(
                    id=story_id,
                    title=story.title,
                    synopsis=story.synopsis,
                    genre=story.genre.name,
                    mode=story.mode.name,
                    length=current_req.length,
                    characters=story.characters,
                    locations=story.locations,
                    scenes=[vars(s) for s in story.scenes],
                )
                
                # If critique is enabled, get feedback and refine
                if current_req.with_critique:
                    critique, refined_story = await self._get_story_critique(
                        story_id, current_req.prompt, story
                    )
                    
                    if critique and refined_story:
                        # Store critique for future reference
                        response.critique = critique
                        
                        # Refine the story based on feedback
                        refined_req = StoryRefinementRequest(
                            story_id=story_id,
                            feedback=critique
                        )
                        
                        refined_story = await self.refine_story(
                            story_id=story_id,
                            feedback=critique
                        )
                        
                        if refined_story:
                            response = StoryRefinementResponse(
                                id=story_id,
                                title=refined_story.title,
                                synopsis=refined_story.synopsis,
                                genre=refined_story.genre.name,
                                mode=refined_story.mode.name,
                                length=current_req.length,
                                characters=refined_story.characters,
                                locations=refined_story.locations,
                                scenes=[vars(s) for s in refined_story.scenes],
                                critique=critique,
                                status="refined"
                            )
                
                # Finalize story
                try:
                    await self._save_story_to_db(response)
                    logger.info(f"Story {story_id} saved to database successfully")
                except Exception as db_err:
                    logger.error(f"Database save failed for story {story_id}: {db_err}", exc_info=True)
                    # We continue even if DB save fails to return the result to the user
                
                return response
                
            except HTTPException as e:
                # Re-raise HTTPExceptions (like 502/503 from Ollama)
                raise e
            except Exception as e:
                import traceback
                logger.error(f"Story generation attempt {attempt} failed: {e}")
                logger.error(traceback.format_exc())
                attempt += 1
                
                if attempt > max_attempts:
                    raise HTTPException(
                        status_code=500, 
                        detail=f"Story generation failed after {max_attempts} attempts: {str(e)}"
                    )
        
        # Fallback response if all attempts fail
        return StoryGenerationResponse(
            id=story_id,
            title="Generation Failed",
            synopsis="Failed to generate story",
            genre="ERROR",
            mode="ERROR",
            length="error",
            characters=[],
            locations=[],
            scenes=[],
            critique=f"Error: {str(e)}"
        )
    
    async def refine_story(self, story_id: str, feedback: str) -> Optional[Story]:
        """
        Refine a story based on feedback.
        
        Args:
            story_id: ID of the story to refine
            feedback: User feedback for refinement
            
        Returns:
            Refined story or None if refinement failed
        """
        try:
            # Retrieve story from database
            story = await self._get_story_from_db(story_id)
            if not story:
                logger.warning(f"Story {story_id} not found for refinement")
                return None
            
            # Process feedback and generate refined story
            refined_story = await self.service.refine_story(
                story_id,
                feedback
            )
            
            if refined_story:
                # Update story in database with new version
                await self._update_story_in_db(story_id, refined_story)
                
                return refined_story
            
            return None
            
        except Exception as e:
            logger.error(f"Story refinement failed: {e}")
            return None
    
    async def _get_story_critique(self, story_id: str, prompt: str, story: Story) -> Tuple[Optional[str], Optional[Story]]:
        """
        Get critique of a story using AI agents and potentially refine it.
        
        Args:
            story_id: ID of the story
            prompt: Original generation prompt
            story: Generated story
            
        Returns:
            Tuple of (critique_text, refined_story)
        """
        try:
            # This would integrate with actual AI critique agents
            # For now, simulate a basic critique system
            
            # Generate critique based on story quality
            critique = await self._generate_ai_critique(story_id, prompt, story)
            
            if critique and critique != "positive":
                # If critique is not positive, attempt refinement
                refined_story = await self.refine_story(story_id, critique)
                return critique, refined_story
            
            return critique, None
            
        except Exception as e:
            logger.error(f"Critique generation failed: {e}")
            return None, None
    
    async def _generate_ai_critique(self, story_id: str, prompt: str, story: Story) -> str:
        """
        Generate AI-powered critique of a story.
        
        Args:
            story_id: ID of the story
            prompt: Original generation prompt
            story: Generated story
            
        Returns:
            Critique text
        """
        # This is a placeholder for actual AI critique logic        # In a real implementation, this would use multiple AI agents to critique the story
                # Simple critique based on story structure
        if not story.characters or len(story.characters) < 3:
            return "Story needs more developed characters"
        
        if not story.locations or len(story.locations) < 3:
            return "Story needs more developed locations"
        
        if len(story.scenes) < 5:
            return "Story needs more scenes for proper progression"
                # Check for narrative coherence
        if story.synopsis and len(story.synopsis) < 50:
            return "Synopsis is too brief, consider expanding"
                # Check for genre consistency
        if story.genre and story.genre.lower() != "drama" and "DRAMA" in str(story.genre):
            # Additional checks could be added here
            pass
        
        # If no obvious issues found, return positive feedback
        return "positive"

    async def _save_story_to_db(self, response: StoryGenerationResponse) -> None:
        """Save generated story to database using async SQLAlchemy."""
        try:
            async for db in get_db():
                db_story = Story(
                    id=response.id,
                    title=response.title,
                    synopsis=response.synopsis,
                    genre=response.genre,
                    mode=response.mode,
                    length=response.length,
                    characters=response.characters,
                    locations=response.locations,
                    scenes=response.scenes,
                    critique=response.critique,
                    status=response.status,
                    version=response.version
                )
                db.add(db_story)
                await db.commit()
                break
            
        except Exception as e:
            logger.error(f"Failed to save story to database: {e}")
            raise

    async def _get_story_from_db(self, story_id: str) -> Optional[Story]:
        """Retrieve a story from the database by ID using async SQLAlchemy."""
        try:
            async for db in get_db():
                from sqlalchemy import select
                result = await db.execute(
                    select(Story).where(Story.id == story_id)
                )
                story = result.scalar_one_or_none()
                break
            
            return story
            
        except Exception as e:
            logger.error(f"Failed to retrieve story from database: {e}")
            return None

    async def _update_story_in_db(self, story_id: str, story: Story) -> None:
        """Update a story in the database with new version using async SQLAlchemy."""
        try:
            async for db in get_db():
                from sqlalchemy import select
                result = await db.execute(
                    select(Story).where(Story.id == story_id)
                )
                existing_story = result.scalar_one_or_none()
                
                if existing_story:
                    existing_story.title = story.title
                    existing_story.synopsis = story.synopsis
                    existing_story.genre = story.genre.name
                    existing_story.mode = story.mode.name
                    existing_story.length = "medium"
                    existing_story.characters = story.characters
                    existing_story.locations = story.locations
                    existing_story.scenes = story.scenes
                    existing_story.critique = story.critique
                    existing_story.status = "refined"
                    existing_story.version = existing_story.version + 1
                    
                    await db.commit()
                break
            
        except Exception as e:
            logger.error(f"Failed to update story in database: {e}")
            raise

# =============================================================================
# Service Factory
# =============================================================================

def create_ai_story_generation_service() -> AIDrivenStoryGenerationService:
    """Create an instance of the AI-driven story generation service."""
    return AIDrivenStoryGenerationService()

# =============================================================================
# Integration with FastAPI
# =============================================================================

async def get_story_generation_service() -> AIDrivenStoryGenerationService:
    """Dependency to get AI story generation service."""
    # This would be configured in the FastAPI app dependencies
    from backend.story_generation_service import StoryGenerationService
    return create_ai_story_generation_service()