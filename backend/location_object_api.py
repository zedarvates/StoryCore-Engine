"""
Location and Object Image API - REST endpoints for image-based creation.

This module provides:
- Location creation from images
- Object creation from images
- Variation generation endpoints
- Options listing endpoints
"""

import base64
import io
import logging
import os
import uuid
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, HTTPException, UploadFile, File, Form, Depends, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from backend.auth import verify_jwt_token

# Import services
try:
    from src.location_wizard import (
        get_image_to_location_service,
        get_location_analyzer,
        get_location_variation_generator,
        LocationStyle,
        TimeVariation,
        WeatherVariation,
        SeasonType
    )
    from src.object_wizard import (
        get_image_to_object_service,
        get_object_analyzer,
        get_object_variation_generator,
        ObjectStyle,
        MaterialVariation,
        ConditionVariation
    )
    SERVICES_AVAILABLE = True
except ImportError:
    SERVICES_AVAILABLE = False
    logging.warning("Location/Object services not available")

# Configure logging
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class LocationFromImageResponse(BaseModel):
    """Response for location creation"""
    success: bool
    location_id: Optional[str] = None
    name: Optional[str] = None
    location_type: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    narrative_purpose: Optional[str] = None
    story_potential: List[str] = []
    wide_shot_prompt: Optional[str] = None
    close_up_prompt: Optional[str] = None
    atmospheric_prompt: Optional[str] = None
    style_adaptations: Dict[str, str] = {}
    confidence: float = 0.0
    processing_time_ms: int = 0
    error_message: Optional[str] = None


class ObjectFromImageResponse(BaseModel):
    """Response for object creation"""
    success: bool
    object_id: Optional[str] = None
    name: Optional[str] = None
    object_type: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    attributes: Optional[Dict[str, Any]] = None
    suggested_tags: List[str] = []
    hero_shot_prompt: Optional[str] = None
    detail_shot_prompt: Optional[str] = None
    context_shot_prompt: Optional[str] = None
    style_adaptations: Dict[str, str] = {}
    confidence: float = 0.0
    processing_time_ms: int = 0
    error_message: Optional[str] = None


class LocationVariationRequest(BaseModel):
    """Request for location variations"""
    location_description: str
    location_id: str
    styles: List[str] = ["realistic"]
    times_of_day: List[str] = ["morning", "sunset", "night"]
    weather_options: List[str] = ["clear"]
    max_variations: int = 10


class ObjectVariationRequest(BaseModel):
    """Request for object variations"""
    object_description: str
    object_id: str
    styles: List[str] = ["realistic"]
    materials: List[str] = ["wood", "metal"]
    conditions: List[str] = ["pristine", "worn"]
    max_variations: int = 10


class VariationResponse(BaseModel):
    """Response for variation"""
    variation_id: str
    prompt: str
    negative_prompt: str
    style: Optional[str] = None
    additional_params: Dict[str, str] = {}
    cached: bool = False


# ============================================================================
# Location Endpoints
# ============================================================================

@router.post("/location/from-image", response_model=LocationFromImageResponse)
async def create_location_from_image(
    file: UploadFile = File(..., description="Image file for location"),
    name: Optional[str] = Form(None),
    location_type: Optional[str] = Form(None),
    genre: Optional[str] = Form(None),
    visual_style: Optional[str] = Form(None),
    additional_context: Optional[str] = Form(None),
    user_id: str = Depends(verify_jwt_token)
) -> LocationFromImageResponse:
    """Create a location from an uploaded image"""
    if not SERVICES_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Location services not available"
        )
    
    try:
        from PIL import Image
        import numpy as np
        
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image_array = np.array(image)
        
        service = get_image_to_location_service()
        result = await service.create_location_from_image(
            image=image_array,
            name=name,
            location_type=location_type,
            additional_context=additional_context
        )
        
        if not result.success:
            return LocationFromImageResponse(
                success=False,
                error_message=result.error_message
            )
        
        location_id = str(uuid.uuid4())
        
        return LocationFromImageResponse(
            success=True,
            location_id=location_id,
            name=result.suggested_name,
            location_type=result.location_type,
            description=result.description,
            short_description=result.short_description,
            attributes=result.attributes.__dict__ if result.attributes else None,
            narrative_purpose=result.narrative_purpose,
            story_potential=result.story_potential,
            wide_shot_prompt=result.wide_shot_prompt,
            close_up_prompt=result.close_up_prompt,
            atmospheric_prompt=result.atmospheric_prompt,
            style_adaptations=result.style_adaptations,
            confidence=result.confidence,
            processing_time_ms=result.processing_time_ms
        )
        
    except Exception as e:
        logger.error(f"Failed to create location: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/location/options")
async def get_location_options() -> Dict[str, Any]:
    """Get available location options"""
    if not SERVICES_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Services not available"
        )
    
    try:
        generator = get_location_variation_generator()
        return {
            "styles": generator.get_available_styles(),
            "times_of_day": generator.get_available_times(),
            "weather": generator.get_available_weather(),
            "seasons": generator.get_available_seasons()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/location/variations/prompts")
async def generate_location_prompts(
    description: str = Form(...),
    style: str = Form("realistic"),
    time_of_day: Optional[str] = Form(None),
    weather: Optional[str] = Form(None),
    season: Optional[str] = Form(None),
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, str]:
    """Generate location variation prompts"""
    if not SERVICES_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Services not available"
        )
    
    try:
        generator = get_location_variation_generator()
        
        result = generator.generate_prompts_only(
            location_description=description,
            style=LocationStyle(style),
            time_of_day=TimeVariation(time_of_day) if time_of_day else None,
            weather=WeatherVariation(weather) if weather else None,
            season=SeasonType(season) if season else None
        )
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================================================
# Object Endpoints
# ============================================================================

@router.post("/object/from-image", response_model=ObjectFromImageResponse)
async def create_object_from_image(
    file: UploadFile = File(..., description="Image file for object"),
    name: Optional[str] = Form(None),
    object_type: Optional[str] = Form(None),
    genre: Optional[str] = Form(None),
    visual_style: Optional[str] = Form(None),
    additional_context: Optional[str] = Form(None),
    user_id: str = Depends(verify_jwt_token)
) -> ObjectFromImageResponse:
    """Create an object from an uploaded image"""
    if not SERVICES_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Object services not available"
        )
    
    try:
        from PIL import Image
        import numpy as np
        
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image_array = np.array(image)
        
        service = get_image_to_object_service()
        result = await service.create_object_from_image(
            image=image_array,
            name=name,
            object_type=object_type,
            additional_context=additional_context
        )
        
        if not result.success:
            return ObjectFromImageResponse(
                success=False,
                error_message=result.error_message
            )
        
        object_id = str(uuid.uuid4())
        
        return ObjectFromImageResponse(
            success=True,
            object_id=object_id,
            name=result.suggested_name,
            object_type=result.object_type,
            category=result.category,
            description=result.description,
            short_description=result.short_description,
            attributes=result.attributes.__dict__ if result.attributes else None,
            suggested_tags=result.suggested_tags,
            hero_shot_prompt=result.hero_shot_prompt,
            detail_shot_prompt=result.detail_shot_prompt,
            context_shot_prompt=result.context_shot_prompt,
            confidence=result.confidence,
            processing_time_ms=result.processing_time_ms
        )
        
    except Exception as e:
        logger.error(f"Failed to create object: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/object/options")
async def get_object_options() -> Dict[str, Any]:
    """Get available object options"""
    if not SERVICES_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Services not available"
        )
    
    try:
        generator = get_object_variation_generator()
        service = get_image_to_object_service()
        
        return {
            "styles": generator.get_available_styles(),
            "materials": generator.get_available_materials(),
            "conditions": generator.get_available_conditions(),
            "categories": service.get_object_categories()
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/object/variations/prompts")
async def generate_object_prompts(
    description: str = Form(...),
    style: str = Form("realistic"),
    material: Optional[str] = Form(None),
    condition: Optional[str] = Form(None),
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, str]:
    """Generate object variation prompts"""
    if not SERVICES_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Services not available"
        )
    
    try:
        generator = get_object_variation_generator()
        
        result = generator.generate_prompts_only(
            object_description=description,
            style=ObjectStyle(style),
            material=MaterialVariation(material) if material else None,
            condition=ConditionVariation(condition) if condition else None
        )
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/object/categories")
async def get_object_categories() -> List[Dict[str, str]]:
    """Get all object categories"""
    if not SERVICES_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Services not available"
        )
    
    try:
        service = get_image_to_object_service()
        return service.get_object_categories()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================================================
# Export
# ============================================================================

__all__ = [
    "router",
    "LocationFromImageResponse",
    "ObjectFromImageResponse",
    "LocationVariationRequest",
    "ObjectVariationRequest"
]