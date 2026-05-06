"""
StoryCore-Engine Character Management API

This module provides REST API endpoints for character management operations,
leveraging the CharacterAIService for AI-powered generation and analysis.

Endpoints:
- POST /api/characters/generate - Generate character profile from name/role
- POST /api/characters/chat - Interactive chat with a character
- POST /api/characters/analyze-arc - Analyze character arc consistency
- GET /api/characters/:id - Get character details
- GET /api/characters - List all registered characters

Requirements: Q1 2026 - Character Management & AI Interaction
"""

import logging
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, Field

from backend.character_ai_service import (
    CharacterAIService,
    CharacterRole,
    PersonalityTrait,
)
from backend.auth import verify_jwt_token

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter(prefix="/api/characters", tags=["characters"])

# =============================================================================
# Pydantic Models
# =============================================================================


class CharacterCreateRequest(BaseModel):
    """Request to generate a character"""

    name: str = Field(..., min_length=1)
    role: str = Field(
        default="supporting"
    )  # protagonist, antagonist, supporting, minor
    personality_traits: List[str] = Field(default_factory=list)
    genre: str = Field(default="drama")


class ChatRequest(BaseModel):
    """Request to chat with a character"""

    character_id: str
    user_input: str


class ArcAnalysisRequest(BaseModel):
    """Request to analyze character arc"""

    character_id: str


# =============================================================================
# Service Initialization
# =============================================================================

# NOTE: In a production environment, this would be injected or properly scoped.
# For now, we use a global service instance.
character_service = CharacterAIService()

# =============================================================================
# Endpoints
# =============================================================================


@router.post(
    "/generate", response_model=Dict[str, Any], status_code=status.HTTP_201_CREATED
)
async def generate_character(
    request: CharacterCreateRequest, user_id: str = Depends(verify_jwt_token)
):
    """
    Generate a full character profile using AI based on a few inputs.
    """
    try:
        # Map string role to Enum
        try:
            role = CharacterRole(request.role.lower())
        except ValueError:
            role = CharacterRole.SUPPORTING

        # Map strings to PersonalityTrait Enums
        traits = []
        for t in request.personality_traits:
            try:
                traits.append(PersonalityTrait(t.lower()))
            except ValueError:
                continue

        # If no traits, pick some defaults
        if not traits:
            import random

            traits = random.sample(list(PersonalityTrait), 2)

        char_data = {
            "name": request.name,
            "role": role,
            "personality": traits,
            "dialogue_style": f"Professional and {traits[0].value}"
            if traits
            else "Standard",
        }

        # Create character
        character = character_service.create_character(char_data)

        # Generate backstory using AI (simulated in service if no LLM)
        character.background = await character_service.generate_character_backstory(
            character, request.genre
        )

        logger.info(f"Generated AI character: {character.name} (ID: {character.id})")

        return character_service.export_character(character.id)

    except Exception as e:
        logger.error(f"Failed to generate character: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Character generation failed: {str(e)}",
        )


@router.post("/chat", response_model=Dict[str, Any])
async def chat_with_character(
    request: ChatRequest, user_id: str = Depends(verify_jwt_token)
):
    """
    Interactive chat with a character to test personality and dialogue.
    """
    result = await character_service.converse(request.character_id, request.user_input)

    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=result["error"]
        )

    return result


@router.post("/analyze-arc", response_model=Dict[str, Any])
async def analyze_arc(
    request: ArcAnalysisRequest, user_id: str = Depends(verify_jwt_token)
):
    """
    Analyze a character's arc and provide recommendations for development.
    """
    result = await character_service.analyze_character_arc(request.character_id)

    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=result["error"]
        )

    return result


@router.get("/{character_id}", response_model=Dict[str, Any])
async def get_character_details(
    character_id: str, user_id: str = Depends(verify_jwt_token)
):
    """
    Get full details for a specific character.
    """
    character = character_service.get_character(character_id)

    if not character:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Character not found"
        )

    return character_service.export_character(character_id)


@router.get("/", response_model=List[Dict[str, Any]])
async def list_all_characters(
    role: Optional[str] = None, user_id: str = Depends(verify_jwt_token)
):
    """
    List all characters, optionally filtered by role.
    """
    char_role = None
    if role:
        try:
            char_role = CharacterRole(role.lower())
        except ValueError:
            pass

    characters = character_service.list_characters(char_role)
    return [character_service.export_character(c.id) for c in characters]


@router.post("/{character_id}/validate", response_model=Dict[str, Any])
async def validate_character(
    character_id: str, user_id: str = Depends(verify_jwt_token)
):
    """
    Validate character consistency and get improvement suggestions.
    """
    result = await character_service.validate_character_consistency(character_id)

    if "error" in result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=result["error"]
        )

    return result
