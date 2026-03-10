"""
Director API for StoryCore-Engine: The 'Nano Banana 2' Command Center.

Combines Research, Consistency, and High-Fidelity Generation into a 
unified workflow for AI filmmakers.
"""

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
import uuid

from backend.research_service import ResearchService, GroundingContext
from backend.nano_banana_service import get_nano_banana_service, CoverageType
from backend.ltx_service import LTXVideoService, LTXGenerationConfig, LTXAspectRatio
from backend.ai_video_service import get_multi_angle_service, get_character_consistency_service, CameraAngle
from backend.kiwiedit_service import get_kiwiedit_service
from backend.cube_composer_service import get_cube_composer_service
from backend.cuda_agent import get_cuda_agent

DIRECTOR_ROUTER = APIRouter(prefix="/api/director", tags=["AI Director Mode (Nano Banana 2)"])

# =============================================================================
# Models
# =============================================================================

class ResearchRequest(BaseModel):
    prompt: str
    location: Optional[str] = None
    lat: Optional[float] = None
    lon: Optional[float] = None
    date: Optional[str] = None # YYYY-MM-DD
    historical_period: Optional[str] = None

class CoverageRequest(BaseModel):
    master_image: str
    prompt: str
    character_references: List[str] = []
    object_references: List[str] = []
    shots: List[str] = ["master", "close_up", "ots_a"]

class EditRequest(BaseModel):
    scene_id: str
    action: str # "swap", "localize"
    target: str # object name or location name
    replacement: str

# =============================================================================
# Endpoints
# =============================================================================

@DIRECTOR_ROUTER.post("/research", response_model=Dict[str, Any])
async def do_research(req: ResearchRequest):
    """
    Research facts and enhance prompt for grounding.
    """
    service = ResearchService()
    ctx = GroundingContext(
        location_name=req.location,
        latitude=req.lat,
        longitude=req.lon,
        date=req.date,
        historical_period=req.historical_period
    )
    
    facts = await service.get_grounding_facts(req.prompt, ctx)
    enhanced_prompt = await service.enhance_prompt(req.prompt, facts)
    
    return {
        "facts": facts,
        "enhanced_prompt": enhanced_prompt
    }

@DIRECTOR_ROUTER.post("/lock-scene", response_model=Dict[str, Any])
async def lock_scene(req: CoverageRequest):
    """
    Create a Scene DNA from a master frame and references.
    """
    service = get_nano_banana_service()
    profile = service.create_scene_dna(
        req.master_image, 
        req.character_references, 
        req.object_references
    )
    
    # Generate character sheet prompts for consistency
    consistency_service = get_character_consistency_service()
    sheets = {}
    if req.character_references:
        for i, ref in enumerate(req.character_references):
            name = f"Character_{i}"
            sheets[name] = consistency_service.generate_character_sheet_prompts(req.prompt)

    return {
        "scene_id": profile.scene_id, 
        "locked_objects": len(profile.object_references),
        "character_sheets": sheets
    }

@DIRECTOR_ROUTER.post("/generate-coverage", response_model=Dict[str, Any])
async def generate_coverage(scene_id: str, shots: List[str], scene_description: Optional[str] = None):
    """
    Generate multiple consistent angles for a locked scene using MultiAngleService.
    """
    service = get_nano_banana_service()
    multi_angle_service = get_multi_angle_service()
    
    coverage_types = []
    for s in shots:
        try:
            coverage_types.append(CoverageType(s))
        except ValueError:
            continue
            
    # If description is provided, use it to generate structured shot list
    shot_list = None
    if scene_description:
        shot_list = multi_angle_service.generate_shot_list(scene_description)

    results = await service.generate_coverage(scene_id, coverage_types)
    return {
        "scene_id": scene_id, 
        "shots": results,
        "structured_shot_list": shot_list
    }

@DIRECTOR_ROUTER.post("/semantic-edit", response_model=Dict[str, Any])
async def semantic_edit(req: EditRequest):
    """
    Perform element swapping or localization.
    """
    service = get_nano_banana_service()
    if req.action == "swap":
        output = await service.swap_element(req.scene_id, req.target, req.replacement)
    elif req.action == "localize":
        output = await service.localize_scene(req.scene_id, req.replacement)
    else:
        raise HTTPException(status_code=400, detail="Invalid action")
        
    return {"status": "success", "output_path": output}

@DIRECTOR_ROUTER.post("/kiwiedit", response_model=Dict[str, Any])
async def kiwiedit(video_path: str, target: str, action: str, replacement: Optional[str] = None):
    """
    Semantic video editing: Swap or remove objects in an existing clip.
    """
    service = get_kiwiedit_service()
    result = await service.edit_video(video_path, target, action, replacement)
    return result

@DIRECTOR_ROUTER.post("/hifi-paint", response_model=Dict[str, Any])
async def hifi_paint(video_path: str, prop_image: str, anchor: str):
    """
    High-Fidelity Prop Insertion: Insert highly detailed 2D assets into a video 
    (e.g., product placement or specific accessories).
    """
    service = get_kiwiedit_service()
    result = await service.hifi_paint(video_path, prop_image, anchor)
    return result

@DIRECTOR_ROUTER.get("/gpu-status")
async def gpu_status():
    """
    Check the health and utilization of the GPU via CUDA Agent.
    """
    agent = get_cuda_agent()
    return agent.get_status()

