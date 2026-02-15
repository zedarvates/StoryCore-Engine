"""
Location Logic Loop API - FastAPI endpoints for Location Logic Loop generation

Implements the "Writing Blueprint That Turns Generic Settings Into Compelling Worlds" framework:
- Layer 1: FUNCTION - Why does the location exist?
- Layer 2: CONSTRAINTS - What pressures/challenges does it face?
- Layer 3: CULTURE - How do people adapt?
- Layer 4: REPUTATION - How do others see it?
- Layer 5: EMERGENT DETAILS - Names, landmarks, geography

Requirements: Q1 2026 - Location Logic Loop Framework
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, Any, Optional
from enum import Enum

from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from backend.auth import verify_jwt_token
from backend.story_transformer import (
    generate_logic_loop_location, LogicLoopLocation,
    LocationFunction, LocationSubFunction, ConstraintType
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/locations", tags=["location-logic-loop"])


class Settings(BaseSettings):
    """Application settings for Location Logic Loop"""
    default_function: str = Field(default="economic")
    default_genre: str = Field(default="fantasy")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"  # Ignore extra environment variables


try:
    settings = Settings()
except Exception:
    settings = Settings()


# =============================================================================
# REQUEST/RESPONSE MODELS
# =============================================================================

class LocationFunctionType(str, Enum):
    """Primary function types for locations"""
    ECONOMIC = "economic"       # Trade hub, resource extraction, market
    DEFENSIVE = "defensive"    # Fortress, garrison, watchtower
    SOCIAL = "social"          # Pilgrimage site, university, sanctuary
    LOGISTICAL = "logistical"  # Way station, refueling depot, resupply


class ConstraintLevel(str, Enum):
    """Severity level for constraints"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class LogicLoopGenerationRequest(BaseModel):
    """Request model for generating a location using the Location Logic Loop"""
    name: str = Field(..., min_length=1, max_length=255, description="Location name")
    description: str = Field(..., min_length=10, description="Basic description of the location")
    genre: str = Field(default="fantasy", description="Story genre (fantasy, sci-fi, etc.)")
    tone: str = Field(default="serious", description="Tone (dark, light, epic, etc.)")
    function: Optional[LocationFunctionType] = Field(default=None, description="Primary function (auto-detected if not provided)")
    context: Optional[str] = Field(default=None, description="Additional world-building context")


class LogicLoopEnhancementRequest(BaseModel):
    """Request model for enhancing an existing location with Logic Loop"""
    location_id: str = Field(..., description="Existing location ID")
    current_description: Optional[str] = Field(default=None, description="Updated description")
    function: Optional[LocationFunctionType] = Field(default=None, description="Primary function")


class LogicLoopLocationResponse(BaseModel):
    """Response model for Location Logic Loop location"""
    name: str
    description: str
    function: Dict[str, Any]
    constraints: Dict[str, Any]
    culture: Dict[str, Any]
    reputation: Dict[str, Any]
    emergent_details: Dict[str, Any]
    story_hooks: list
    generated_at: str


class StoryHookResponse(BaseModel):
    """Response model for story hooks"""
    location_name: str
    story_hooks: list
    generated_at: str


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def format_constraints_for_prompt(constraints: list) -> str:
    """Format constraints list for prompt display"""
    if not constraints:
        return "No significant constraints identified"
    
    formatted = []
    for c in constraints:
        severity = c.get("severity", "medium")
        impact = c.get("impact_on_function", "Unknown impact")
        formatted.append(f"- [{severity.upper()}] {c.get('description', '')}: {impact}")
    
    return "\n".join(formatted)


def format_culture_for_prompt(culture: dict) -> str:
    """Format culture dict for prompt display"""
    if not culture:
        return "Culture not yet defined"
    
    parts = []
    
    if culture.get("social_hierarchy"):
        parts.append(f"Social: {culture['social_hierarchy']}")
    
    if culture.get("valued_skills"):
        skills = ", ".join(culture["valued_skills"][:5])
        parts.append(f"Valued Skills: {skills}")
    
    if culture.get("revered_professions"):
        profs = ", ".join(culture["revered_professions"][:3])
        parts.append(f"Revered Professions: {profs}")
    
    if culture.get("worldview"):
        parts.append(f"Worldview: {culture['worldview']}")
    
    return "\n".join(parts) if parts else "Culture emerging from function and constraints"


def format_reputation_for_prompt(reputation: dict) -> str:
    """Format reputation dict for prompt display"""
    if not reputation:
        return "Reputation not yet defined"
    
    parts = []
    
    if reputation.get("external_reputation"):
        parts.append(f"External: {reputation['external_reputation']}")
    
    if reputation.get("rumored_wealth"):
        parts.append(f"Rumored Wealth: {reputation['rumored_wealth']}")
    
    if reputation.get("perceived_danger"):
        parts.append(f"Perceived Danger: {reputation['perceived_danger']}")
    
    if reputation.get("who_comes_here"):
        who = ", ".join(reputation["who_comes_here"][:3])
        parts.append(f"Who Comes: {who}")
    
    return "\n".join(parts) if parts else "Reputation emerging from function and constraints"


def format_emergent_details_for_prompt(details: dict) -> str:
    """Format emergent details dict for prompt display"""
    if not details:
        return "Emergent details not yet generated"
    
    parts = []
    
    if details.get("name_origin"):
        parts.append(f"Name Origin: {details['name_origin']}")
    
    if details.get("name_meaning"):
        parts.append(f"Name Meaning: {details['name_meaning']}")
    
    if details.get("architectural_style"):
        parts.append(f"Architecture: {details['architectural_style']}")
    
    if details.get("color_palette"):
        colors = ", ".join(details.get("color_palette", [])[:5])
        parts.append(f"Colors: {colors}")
    
    return "\n".join(parts) if parts else "Details emerging from function, constraints, and culture"


# =============================================================================
# API ENDPOINTS
# =============================================================================

@router.post("/generate-logic-loop", response_model=LogicLoopLocationResponse)
async def generate_location_logic_loop(
    request: LogicLoopGenerationRequest,
    user_id: str = Depends(verify_jwt_token)
) -> LogicLoopLocationResponse:
    """
    Generate a complete location using the Location Logic Loop framework.
    
    This endpoint creates a fully-developed location where every detail 
    logically follows from the function → constraints → culture → 
    reputation → emergent details chain.
    
    Example:
    - Function: Mining town (economic)
    - Constraints: Dragons, no timber
    - Culture: Guild-based, mask-makers revered
    - Reputation: "Glimmering Grave" - rich but deadly
    - Emergent Details: Name from mines, "Memorial of the Fallen" landmark
    """
    logger.info(f"Generating Location Logic Loop for '{request.name}' (user: {user_id})")
    
    try:
        # Map string function to enum
        function_enum = None
        if request.function:
            function_map = {
                LocationFunctionType.ECONOMIC: LocationFunction.ECONOMIC,
                LocationFunctionType.DEFENSIVE: LocationFunction.DEFENSIVE,
                LocationFunctionType.SOCIAL: LocationFunction.SOCIAL,
                LocationFunctionType.LOGISTICAL: LocationFunction.LOGISTICAL,
            }
            function_enum = function_map.get(request.function)
        
        # Generate the location using the Logic Loop framework
        result = generate_logic_loop_location(
            name=request.name,
            description=request.description,
            genre=request.genre,
            tone=request.tone,
            function=function_enum,
            context=request.context
        )
        
        logger.info(f"Successfully generated Location Logic Loop for '{request.name}'")
        
        return LogicLoopLocationResponse(
            name=result.get("name", request.name),
            description=request.description,
            function=result.get("function", {}),
            constraints=result.get("constraints", {}),
            culture=result.get("culture", {}),
            reputation=result.get("reputation", {}),
            emergent_details=result.get("emergent_details", {}),
            story_hooks=result.get("story_hooks", []),
            generated_at=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Failed to generate Location Logic Loop: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate location: {str(e)}"
        )


@router.post("/generate-story-hooks", response_model=StoryHookResponse)
async def generate_location_story_hooks(
    request: LogicLoopGenerationRequest,
    user_id: str = Depends(verify_jwt_token)
) -> StoryHookResponse:
    """
    Generate story hooks based on the Location Logic Loop analysis.
    
    Returns 4-6 narrative opportunities that arise naturally from
    the location's unique function, constraints, culture, and reputation.
    """
    logger.info(f"Generating story hooks for '{request.name}' (user: {user_id})")
    
    try:
        # Generate full location first
        function_enum = None
        if request.function:
            function_map = {
                LocationFunctionType.ECONOMIC: LocationFunction.ECONOMIC,
                LocationFunctionType.DEFENSIVE: LocationFunction.DEFENSIVE,
                LocationFunctionType.SOCIAL: LocationFunction.SOCIAL,
                LocationFunctionType.LOGISTICAL: LocationFunction.LOGISTICAL,
            }
            function_enum = function_map.get(request.function)
        
        result = generate_logic_loop_location(
            name=request.name,
            description=request.description,
            genre=request.genre,
            tone=request.tone,
            function=function_enum,
            context=request.context
        )
        
        story_hooks = result.get("story_hooks", [])
        
        logger.info(f"Generated {len(story_hooks)} story hooks for '{request.name}'")
        
        return StoryHookResponse(
            location_name=request.name,
            story_hooks=story_hooks,
            generated_at=datetime.utcnow().isoformat()
        )
        
    except Exception as e:
        logger.error(f"Failed to generate story hooks: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate story hooks: {str(e)}"
        )


@router.get("/logic-loop/{location_id}")
async def get_location_logic_loop(
    location_id: str,
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    Get the Location Logic Loop analysis for an existing location.
    
    Returns the complete 5-layer framework analysis if available.
    """
    logger.info(f"Getting Location Logic Loop for '{location_id}' (user: {user_id})")
    
    # Load location from main location_api storage
    from backend.location_api import load_location
    
    loc = load_location(location_id)
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )
    
    # Check if logic loop data exists
    if "logic_loop" not in loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location Logic Loop data not found for this location"
        )
    
    return {
        "location_id": location_id,
        "location_name": loc.get("name"),
        "logic_loop": loc["logic_loop"],
        "retrieved_at": datetime.utcnow().isoformat()
    }


@router.post("/logic-loop/{location_id}/save")
async def save_location_logic_loop(
    location_id: str,
    logic_loop_data: Dict[str, Any],
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, Any]:
    """
    Save Location Logic Loop analysis to an existing location.
    
    Stores the complete 5-layer framework in the location's metadata.
    """
    logger.info(f"Saving Location Logic Loop for '{location_id}' (user: {user_id})")
    
    from backend.location_api import load_location, save_location
    
    loc = load_location(location_id)
    if not loc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Location not found"
        )
    
    # Validate required layers
    required_layers = ["function", "constraints", "culture", "reputation", "emergent_details"]
    for layer in required_layers:
        if layer not in logic_loop_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required layer: {layer}"
            )
    
    # Save logic loop to location
    loc["logic_loop"] = {
        **logic_loop_data,
        "saved_at": datetime.utcnow().isoformat(),
        "saved_by": user_id
    }
    loc["updated_at"] = datetime.utcnow().isoformat()
    
    if not save_location(location_id, loc):
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save location"
        )
    
    logger.info(f"Successfully saved Location Logic Loop for '{location_id}'")
    
    return {
        "location_id": location_id,
        "message": "Location Logic Loop saved successfully",
        "saved_at": datetime.utcnow().isoformat()
    }


@router.get("/framework-info")
async def get_framework_info() -> Dict[str, Any]:
    """
    Get information about the Location Logic Loop framework.
    
    Returns the framework overview and guidelines for use.
    """
    return {
        "framework": "Location Logic Loop",
        "source": "Writing Blueprint That Turns Generic Settings Into Compelling Worlds",
        "description": "A systematic approach to building locations with internal logic",
        "layers": [
            {
                "name": "Function",
                "question": "Why does this location exist?",
                "options": ["Economic", "Defensive", "Social", "Logistical"],
                "importance": "Foundation of everything else"
            },
            {
                "name": "Constraints",
                "question": "What pressures/challenges does it face?",
                "types": ["Environmental", "Resource Scarcity", "External Threats"],
                "importance": "Creates conflict and uniqueness"
            },
            {
                "name": "Culture",
                "question": "How do people adapt?",
                "aspects": ["Behaviors", "Traditions", "Laws", "Technologies"],
                "importance": "Brings location to life"
            },
            {
                "name": "Reputation",
                "question": "How do others see it?",
                "aspects": ["External perception", "Internal reality", "Gap analysis"],
                "importance": "Creates narrative opportunities"
            },
            {
                "name": "Emergent Details",
                "question": "What names/landmarks emerge from the logic?",
                "aspects": ["Name etymology", "Landmarks", "Geography"],
                "importance": "Finishing touches with meaning"
            }
        ],
        "key_principle": "Nothing is random. Every detail should be explainable by function+constraints.",
        "documentation_url": "/docs#tag/location-logic-loop"
    }


@router.get("/function-options")
async def get_function_options() -> Dict[str, Any]:
    """
    Get available function options for Location Logic Loop.
    
    Returns all function types and their sub-functions.
    """
    return {
        "functions": [
            {
                "id": "economic",
                "name": "Economic",
                "description": "Trade hub, resource extraction, market",
                "sub_functions": [
                    {"id": "trade_hub", "name": "Trade Hub", "description": "Crossroads of commerce"},
                    {"id": "mining", "name": "Mining", "description": "Resource extraction"},
                    {"id": "fishing", "name": "Fishing", "description": "Maritime resources"},
                    {"id": "agricultural", "name": "Agricultural", "description": "Farming region"},
                    {"id": "manufacturing", "name": "Manufacturing", "description": "Production center"}
                ]
            },
            {
                "id": "defensive",
                "name": "Defensive",
                "description": "Fortress, garrison, watchtower",
                "sub_functions": [
                    {"id": "fortress", "name": "Fortress", "description": "Impregnable stronghold"},
                    {"id": "border_post", "name": "Border Post", "description": "Frontier garrison"},
                    {"id": "watchtower", "name": "Watchtower", "description": "Surveillance outpost"},
                    {"id": "sanctuary", "name": "Sanctuary", "description": "Protected refuge"}
                ]
            },
            {
                "id": "social",
                "name": "Social/Religious",
                "description": "Pilgrimage site, university, sanctuary",
                "sub_functions": [
                    {"id": "pilgrimage", "name": "Pilgrimage Site", "description": "Holy site"},
                    {"id": "university", "name": "University", "description": "Knowledge center"},
                    {"id": "resistance", "name": "Resistance", "description": "Underground headquarters"},
                    {"id": "royal_court", "name": "Royal Court", "description": "Political center"}
                ]
            },
            {
                "id": "logistical",
                "name": "Logistical",
                "description": "Way station, refueling depot, resupply",
                "sub_functions": [
                    {"id": "waystation", "name": "Way Station", "description": "Army resupply"},
                    {"id": "space_station", "name": "Space Station", "description": "Space refueling"},
                    {"id": "caravan_stop", "name": "Caravan Stop", "description": "Trade route rest point"},
                    {"id": "communication", "name": "Communication Hub", "description": "Message relay"}
                ]
            }
        ],
        "constraint_types": [
            {"id": "environmental", "name": "Environmental", "examples": ["Weather", "Terrain", "Natural disasters"]},
            {"id": "resource_scarcity", "name": "Resource Scarcity", "examples": ["No timber", "No water", "No food"]},
            {"id": "external_threat", "name": "External Threats", "examples": ["Enemies", "Monsters", "Rivals"]}
        ]
    }


@router.get("/constraint-templates")
async def get_constraint_templates() -> Dict[str, Any]:
    """
    Get example constraint templates by function type.
    
    Returns pre-built constraint combinations that work well with each function.
    """
    return {
        "templates": {
            "mining": [
                {"type": "environmental", "severity": "high", "description": "Unstable tunnels", "impact": "Dangerous work conditions"},
                {"type": "resource_scarcity", "severity": "medium", "description": "No timber for supports", "impact": "Must import or use alternative materials"},
                {"type": "external_threat", "severity": "high", "description": "Territorial creatures", "impact": "Constant threat to miners"}
            ],
            "trade_hub": [
                {"type": "external_threat", "severity": "high", "description": "Pirates/raiders", "impact": "Need for armed escort"},
                {"type": "resource_scarcity", "severity": "medium", "description": "Limited fresh water", "impact": "Water trade is profitable"},
                {"type": "environmental", "severity": "low", "description": "Seasonal storms", "impact": "Trade routes affected"}
            ],
            "fortress": [
                {"type": "environmental", "severity": "medium", "description": "Harsh winters", "impact": "Supplies must be stockpiled"},
                {"type": "resource_scarcity", "severity": "high", "description": "No arable land nearby", "impact": "Dependent on supply lines"},
                {"type": "external_threat", "severity": "critical", "description": "Constant siege threat", "impact": "Always on high alert"}
            ],
            "pilgrimage": [
                {"type": "environmental", "severity": "medium", "description": "Remote mountain location", "impact": "Difficult journey for pilgrims"},
                {"type": "resource_scarcity", "severity": "low", "description": "Limited farmland", "impact": "Imports food for visitors"},
                {"type": "external_threat", "severity": "medium", "description": "Religious persecution", "impact": "Must remain vigilant"}
            ]
        },
        "note": "These are templates. Customize severity and specific descriptions for your location."
    }


# =============================================================================
# EXAMPLE USAGE
# =============================================================================

EXAMPLE_LOCATION = {
    "name": "Crystal Deep",
    "description": "A mining town carved into a mountainside, harvesting luminous crystals that provide light in the eternal darkness below.",
    "genre": "fantasy",
    "tone": "serious",
    "function": {
        "primary": "economic",
        "sub": "mining",
        "description": "The town's sole purpose is extracting luminous crystals from deep caverns. These crystals are valuable for light magic, healing potions, and as currency."
    },
    "constraints": [
        {
            "type": "environmental",
            "severity": "high",
            "description": "Maze of unstable tunnels prone to collapse",
            "impact_on_function": "Mining is dangerous; only experienced miners can work the deepest veins"
        },
        {
            "type": "resource_scarcity",
            "severity": "medium", 
            "description": "No timber for supports - must use imported stone or magical reinforcement",
            "impact_on_function": "Expensive logistics; mining costs are higher than expected"
        },
        {
            "type": "external_threat",
            "severity": "high",
            "description": "Ancient dragons have claimed the deepest crystal chambers",
            "impact_on_function": "Cannot access the richest veins without fighting or negotiating with dragons"
        }
    ],
    "culture": {
        "social_hierarchy": "Guild-based system where miners have highest status. Mask-makers are second, creating essential filtration gear.",
        "valued_skills": ["Tunnel sense (navigating in darkness)", "Crystal identification", "Mask-making", "Balance (for precarious work)"],
        "revered_professions": ["Master Miners", "Mask-makers", "Healers (crystal dust sickness)"],
        "worldview": "Darkness is both enemy and provider. Light is earned through danger.",
        "attitude_towards_danger": "Respectful but fatalistic. Every miner knows the risks.",
        "relationship_with_environment": "Constant struggle against the mountain, but reverent about the crystals as gifts from the deep earth."
    },
    "reputation": {
        "external_reputation": "The 'Glimmering Grave' - a place to get rich quick or die in the dark",
        "rumored_wealth": "Limitless crystals if you can reach the dragon's lair",
        "perceived_danger": "Extremely deadly - most outsiders don't last a week",
        "who_comes_here": ["Desperate fortune seekers", "Criminals fleeing justice", "Merchants willing to brave the danger"],
        "who_avoids": ["Families (too dangerous for children)", "Cowards (fear of the dark)"]
    },
    "emergent_details": {
        "name_origin": "Named for the deep crystal veins and the practice of 'deep' mining",
        "name_meaning": "'Deep' also refers to the depths one must go to find fortune",
        "landmarks": [
            {"name": "Memorial of the Fallen", "description": "A cavern wall carved with the names of every miner lost to the tunnels", "significance": "Honors the dead, reminds living of the dangers"},
            {"name": "The Mask Maker's Circle", "description": "Central plaza where master mask-makers display their creations", "significance": "Second most important place after the mines themselves"}
        ],
        "notable_buildings": [
            {"name": "The Gilded Cage", "description": "Miners' tavern with reinforced ceilings and sad songs", "type": "Tavern"},
            {"name": "Hall of Light", "description": "Healing center powered by the brightest crystals", "type": "Hospital"}
        ],
        "layout_principle": "Buildings cling to the most stable rock outcrops, connected by precarious bridges and stairs",
        "architectural_style": "Functional and defensible, small circular buildings that distribute stress from tunnel vibrations",
        "color_palette": ["Deep grays", "Crystalline blues and purples (from crystal light)", "Sooty blacks", "Gold (for the precious crystals)"],
        "common_materials": ["Stone (imported timber is too expensive)", "Crystal fragments (common building装饰)", "Metal (reinforcement for tunnels)"]
    },
    "story_hooks": [
        "The dragon has been acting strangely - is it sick, or is something else living in the deep?",
        "A new mining family arrives, but the father was thought to have died years ago - what's his secret?",
        "The supply line for stone supports has been attacked - who benefits from Crystal Deep's struggles?",
        "A mask-maker discovers a pattern in the crystal dust that predicts tunnel collapses before they happen",
        "The annual Remembrance ceremony is interrupted by a cave-in that reveals an ancient chamber"
    ]
}


@router.get("/example")
async def get_example_location() -> Dict[str, Any]:
    """
    Get an example location generated with the Location Logic Loop.
    
    Returns the complete 'Crystal Deep' example with all layers populated.
    """
    return {
        "example": EXAMPLE_LOCATION,
        "framework_notes": {
            "how_to_use": "Use this as a template. Replace each section with your own location's details.",
            "key_insight": "Notice how EVERY detail connects back to the function (mining) and constraints (dragons, no timber).",
            "generator_tip": "Start with function, then constraints, then let culture emerge. Reputation and details come last."
        }
    }

