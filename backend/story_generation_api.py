from fastapi import APIRouter, HTTPException, Depends, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from backend.auth import verify_jwt_token
from backend.story_generation_service import StoryGenerationService, StoryGenre, StoryStructure, ProductionMode
from backend.ai_story_generation_service import AIDrivenStoryGenerationService, StoryGenerationRequest, StoryGenerationResponse, StoryRefinementResponse

router = APIRouter(prefix="/api/story", tags=["Story Generation"])

# Global service instances
story_service = StoryGenerationService()
ai_story_service = AIDrivenStoryGenerationService()

class StoryGenerateRequest(BaseModel):
    prompt: str = Field(..., min_length=5, description="Prompt pour la génération de la story")
    genre: str = Field(default="DRAMA", description="Genre narratif (ex: ADVENTURE, DRAMA, HORROR)")
    structure: str = Field(default="THREE_ACT", description="Structure narrative (ex: THREE_ACT, HERO_JOURNEY)")
    mode: str = Field(default="FICTION", description="Mode de production (ex: FICTION, DOCUMENTARY, INFLUENCER, SCIENTIFIC_REVIEW)")
    length: str = Field(default="medium", description="Longueur: short, medium, long")
    with_critique: bool = Field(default=False, description="Activer la critique multi-agent")
    temperature: float = Field(default=0.7, ge=0.0, le=1.0, description="Température de créativité")
    max_attempts: int = Field(default=3, ge=1, le=10, description="Nombre maximum de tentatives")

class StoryGenerateResponse(BaseModel):
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

@router.post("/generate", response_model=StoryGenerationResponse)
async def generate_story_endpoint(req: StoryGenerateRequest, user_id: str = Depends(verify_jwt_token)):
    try:
        # Use AI-driven service for enhanced generation
        ai_req = StoryGenerationRequest(
            prompt=req.prompt,
            genre=req.genre,
            structure=req.structure,
            mode=req.mode,
            length=req.length,
            with_critique=req.with_critique,
            temperature=req.temperature,
            max_attempts=req.max_attempts
        )
        
        response = await ai_story_service.generate_story(ai_req)
        
        return response
    except HTTPException as e:
        # Re-raise HTTPExceptions as is to preserve status codes (502, 503, etc.)
        raise e
    except Exception as e:
        import traceback
        traceback.print_exc()
        # Fallback for unexpected internal errors
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/generate/basic", response_model=StoryGenerateResponse)
async def generate_story_basic_endpoint(req: StoryGenerateRequest, user_id: str = Depends(verify_jwt_token)):
    try:
        # Convert strings to Enums
        genre = getattr(StoryGenre, req.genre.upper(), StoryGenre.DRAMA)
        structure = getattr(StoryStructure, req.structure.upper(), StoryStructure.THREE_ACT)
        mode = getattr(ProductionMode, req.mode.upper(), ProductionMode.FICTION)
        
        story = await story_service.generate_story(
            prompt=req.prompt,
            genre=genre,
            structure=structure,
            mode=mode,
            length=req.length,
            with_critique=req.with_critique
        )
        
        return StoryGenerateResponse(
            id=story.id,
            title=story.title,
            synopsis=story.synopsis,
            genre=story.genre.name,
            mode=story.mode.name,
            length=story.length if hasattr(story, 'length') and story.length else req.length,
            characters=story.characters,
            locations=story.locations,
            scenes=[vars(s) for s in story.scenes],
            critique=story.critique
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{story_id}", response_model=Dict[str, Any])
async def get_story(story_id: str):
    if story_id not in story_service.stories:
        raise HTTPException(status_code=404, detail="Story not found")
    
    # Simple conversion to dict for the API
    story = story_service.stories[story_id]
    return {
        "id": story.id,
        "title": story.title,
        "synopsis": story.synopsis,
        "genre": story.genre.name,
        "mode": story.mode.name,
        "characters": story.characters,
        "locations": story.locations,
        "props": [vars(p) for p in story.props],
        "sfx": [vars(s) for s in story.sfx],
        "critique": story.critique,
        "scenes": [vars(s) for s in story.scenes]
    }
@router.post("/{story_id}/refine", response_model=StoryRefinementResponse)
async def refine_story_endpoint(story_id: str, feedback: Dict[str, str], user_id: str = Depends(verify_jwt_token)):
    try:
        user_feedback = feedback.get("feedback", "")
        refined_story = await ai_story_service.refine_story(story_id, user_feedback)
        
        if not refined_story:
            raise HTTPException(status_code=404, detail="Story not found or refinement failed")
        
        # Convert to response model
        return StoryRefinementResponse(
            id=refined_story.id,
            title=refined_story.title,
            synopsis=refined_story.synopsis,
            genre=refined_story.genre.name,
            mode=refined_story.mode.name,
            length="medium",  # Would need to store this properly
            characters=refined_story.characters,
            locations=refined_story.locations,
            scenes=[vars(s) for s in refined_story.scenes],
            critique=refined_story.critique,
            status="refined",
            version=2
        )
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{story_id}/refine/basic", response_model=StoryGenerateResponse)
async def refine_story_basic_endpoint(story_id: str, feedback: Dict[str, str], user_id: str = Depends(verify_jwt_token)):
    try:
        if story_id not in story_service.stories:
            raise HTTPException(status_code=404, detail="Story not found")
            
        user_feedback = feedback.get("feedback", "")
        story = await story_service.refine_story(story_id, user_feedback)
        
        return StoryGenerateResponse(
            id=story.id,
            title=story.title,
            synopsis=story.synopsis,
            genre=story.genre.name,
            mode=story.mode.name,
            length=(story.metadata.get("length") if isinstance(story.metadata, dict) else "medium"),
            characters=story.characters,
            locations=story.locations,
            scenes=[vars(s) for s in story.scenes],
            critique=story.critique
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{story_id}/storyboard", response_model=List[Dict[str, Any]])
async def generate_storyboard_endpoint(story_id: str):
    try:
        from backend.storyboard_generator import storyboard_generator
        
        if story_id not in story_service.stories:
            raise HTTPException(status_code=404, detail="Story not found")
            
        story = story_service.stories[story_id]
        results = await storyboard_generator.generate_images_for_story(story)
        
        return results
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))
