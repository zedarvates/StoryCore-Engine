"""
Character Image API - REST endpoints for image-based character creation.

This module provides:
- Image upload for character creation
- Face extraction endpoint
- Vision analysis endpoint
- Complete character creation from image

Requirements: Character Creation Enhancement from User Images
"""

import asyncio
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

# Import character wizard services
try:
    from src.character_wizard.image_to_character_service import (
        ImageToCharacterService,
        CharacterCreationConfig,
        CharacterCreationMode,
        get_image_to_character_service
    )
    from src.character_wizard.vision_character_analyzer import (
        VisionProvider,
        VisionAnalyzerConfig
    )
    from src.character_wizard.character_variation_generator import (
        CharacterVariationGenerator,
        CharacterVariationConfig,
        ArtisticStyle,
        ExpressionType,
        PoseType,
        LightingType,
        get_variation_generator
    )
    from src.character_wizard.face_swap_workflow import (
        FaceSwapWorkflow,
        FaceSwapConfig,
        FaceSwapMethod,
        get_face_swap_workflow
    )
    CHARACTER_WIZARD_AVAILABLE = True
except ImportError:
    CHARACTER_WIZARD_AVAILABLE = False
    logging.warning("Character wizard services not available")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Create router
router = APIRouter()


# ============================================================================
# Request/Response Models
# ============================================================================

class CharacterFromImageRequest(BaseModel):
    """Request model for creating character from image"""
    name: Optional[str] = None
    role: Optional[str] = None
    genre: Optional[str] = None
    visual_style: Optional[str] = None
    additional_context: Optional[str] = None
    extract_face: bool = True
    analyze_image: bool = True
    apply_genre_adaptations: bool = True


class PhysicalAttributesResponse(BaseModel):
    """Physical attributes in response"""
    gender: Optional[str] = None
    age_range: Optional[str] = None
    face_shape: Optional[str] = None
    eye_color: Optional[str] = None
    eye_shape: Optional[str] = None
    hair_color: Optional[str] = None
    hair_style: Optional[str] = None
    hair_length: Optional[str] = None
    skin_tone: Optional[str] = None
    body_type: Optional[str] = None
    facial_hair: Optional[str] = None
    glasses: Optional[str] = None
    accessories: List[str] = []
    distinctive_features: List[str] = []
    clothing_style: Optional[str] = None
    clothing_colors: List[str] = []
    expression: Optional[str] = None
    mood_hint: Optional[str] = None


class CharacterFromImageResponse(BaseModel):
    """Response model for character creation from image"""
    success: bool
    character_id: Optional[str] = None
    name: Optional[str] = None
    role: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    physical_attributes: Optional[PhysicalAttributesResponse] = None
    personality_traits: List[str] = []
    
    # Face extraction results
    face_extracted: bool = False
    face_image_base64: Optional[str] = None
    face_angle: Optional[str] = None
    face_expression: Optional[str] = None
    
    # Generated prompts
    portrait_prompt: Optional[str] = None
    full_body_prompt: Optional[str] = None
    
    # Style adaptations
    style_adaptations: Dict[str, str] = {}
    
    # Metadata
    confidence: float = 0.0
    processing_time_ms: int = 0
    error_message: Optional[str] = None


class FaceExtractionResponse(BaseModel):
    """Response model for face extraction"""
    success: bool
    face_image_base64: Optional[str] = None
    face_angle: Optional[str] = None
    face_expression: Optional[str] = None
    confidence: float = 0.0
    bounding_box: Optional[List[int]] = None
    error_message: Optional[str] = None


class VisionAnalysisResponse(BaseModel):
    """Response model for vision analysis"""
    success: bool
    description: Optional[str] = None
    short_description: Optional[str] = None
    physical_attributes: Optional[PhysicalAttributesResponse] = None
    suggested_name: Optional[str] = None
    suggested_personality: List[str] = []
    suggested_role: Optional[str] = None
    style_adaptations: Dict[str, str] = {}
    confidence: float = 0.0
    error_message: Optional[str] = None


# ============================================================================
# Helper Functions
# ============================================================================

def get_service_config(
    genre: Optional[str] = None,
    visual_style: Optional[str] = None,
    extract_face: bool = True,
    analyze_image: bool = True,
    apply_genre_adaptations: bool = True,
    output_directory: Optional[str] = None
) -> 'CharacterCreationConfig':
    """Get service configuration"""
    return CharacterCreationConfig(
        mode=CharacterCreationMode.HYBRID,
        extract_face=extract_face,
        analyze_image=analyze_image,
        genre=genre,
        visual_style=visual_style,
        apply_genre_adaptations=apply_genre_adaptations,
        save_extracted_face=True,
        output_directory=output_directory
    )


def physical_attrs_to_response(attrs) -> PhysicalAttributesResponse:
    """Convert PhysicalAttributes to response model"""
    if attrs is None:
        return None
    
    return PhysicalAttributesResponse(
        gender=attrs.gender,
        age_range=attrs.age_range,
        face_shape=attrs.face_shape,
        eye_color=attrs.eye_color,
        eye_shape=attrs.eye_shape,
        hair_color=attrs.hair_color,
        hair_style=attrs.hair_style,
        hair_length=attrs.hair_length,
        skin_tone=attrs.skin_tone,
        body_type=attrs.body_type,
        facial_hair=attrs.facial_hair,
        glasses=attrs.glasses,
        accessories=attrs.accessories or [],
        distinctive_features=attrs.distinctive_features or [],
        clothing_style=attrs.clothing_style,
        clothing_colors=attrs.clothing_colors or [],
        expression=attrs.expression,
        mood_hint=attrs.mood_hint
    )


# ============================================================================
# API Endpoints
# ============================================================================

@router.post("/character/from-image", response_model=CharacterFromImageResponse)
async def create_character_from_image(
    file: UploadFile = File(..., description="Image file for character creation"),
    name: Optional[str] = Form(None, description="Character name (optional)"),
    role: Optional[str] = Form(None, description="Character role (optional)"),
    genre: Optional[str] = Form(None, description="Project genre for style adaptation"),
    visual_style: Optional[str] = Form(None, description="Visual style"),
    additional_context: Optional[str] = Form(None, description="Additional context for analysis"),
    extract_face: bool = Form(True, description="Extract face for face swapping"),
    analyze_image: bool = Form(True, description="Analyze image with vision model"),
    apply_genre_adaptations: bool = Form(True, description="Apply genre-specific adaptations"),
    user_id: str = Depends(verify_jwt_token)
) -> CharacterFromImageResponse:
    """
    Create a character from an uploaded image.
    
    This endpoint:
    1. Extracts the face for face swapping workflows
    2. Analyzes the image using a vision model
    3. Generates character description and attributes
    4. Adapts the character to the project's genre and style
    
    Returns a complete character data structure ready for use.
    """
    if not CHARACTER_WIZARD_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Character wizard services not available"
        )
    
    try:
        # Read image data
        image_data = await file.read()
        
        # Validate file type
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must be an image"
            )
        
        # Convert to numpy array
        try:
            from PIL import Image
            import numpy as np
            
            image = Image.open(io.BytesIO(image_data))
            image_array = np.array(image)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Failed to process image: {str(e)}"
            )
        
        # Set up output directory
        output_dir = Path("./projects") / "temp" / "character_images"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Get service with configuration
        config = get_service_config(
            genre=genre,
            visual_style=visual_style,
            extract_face=extract_face,
            analyze_image=analyze_image,
            apply_genre_adaptations=apply_genre_adaptations,
            output_directory=str(output_dir)
        )
        
        service = ImageToCharacterService(config)
        
        # Create character from image
        result = await service.create_character_from_image(
            image=image_array,
            name=name,
            role=role,
            additional_context=additional_context
        )
        
        if not result.success:
            return CharacterFromImageResponse(
                success=False,
                error_message=result.error_message
            )
        
        # Generate character ID
        character_id = str(uuid.uuid4())
        
        return CharacterFromImageResponse(
            success=True,
            character_id=character_id,
            name=result.suggested_name,
            role=result.suggested_role,
            description=result.description,
            short_description=result.short_description,
            physical_attributes=physical_attrs_to_response(result.physical_attributes),
            personality_traits=result.suggested_personality or [],
            face_extracted=result.face_extracted,
            face_image_base64=result.face_image_base64,
            face_angle=result.face_angle.value if result.face_angle else None,
            face_expression=result.face_expression.value if result.face_expression else None,
            portrait_prompt=result.portrait_prompt,
            full_body_prompt=result.full_body_prompt,
            style_adaptations=result.style_adaptations,
            confidence=result.confidence,
            processing_time_ms=result.processing_time_ms
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create character from image: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/character/extract-face", response_model=FaceExtractionResponse)
async def extract_face_from_image(
    file: UploadFile = File(..., description="Image file for face extraction"),
    user_id: str = Depends(verify_jwt_token)
) -> FaceExtractionResponse:
    """
    Extract face from an uploaded image.
    
    This endpoint extracts the face for use in face swapping workflows.
    Returns the extracted face as a base64-encoded image.
    """
    if not CHARACTER_WIZARD_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Character wizard services not available"
        )
    
    try:
        from PIL import Image
        import numpy as np
        from src.character_wizard.face_extraction_service import get_face_extraction_service
        
        # Read image data
        image_data = await file.read()
        
        # Convert to numpy array
        image = Image.open(io.BytesIO(image_data))
        image_array = np.array(image)
        
        # Extract face
        face_service = get_face_extraction_service()
        result = face_service.extract_face(image_array)
        
        if not result.success:
            return FaceExtractionResponse(
                success=False,
                error_message=result.error_message
            )
        
        return FaceExtractionResponse(
            success=True,
            face_image_base64=face_service.face_to_base64(result),
            face_angle=result.angle.value,
            face_expression=result.expression.value,
            confidence=result.confidence,
            bounding_box=list(result.bounding_box) if result.bounding_box else None
        )
        
    except Exception as e:
        logger.error(f"Failed to extract face: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/character/analyze-image", response_model=VisionAnalysisResponse)
async def analyze_image_for_character(
    file: UploadFile = File(..., description="Image file for analysis"),
    genre: Optional[str] = Form(None, description="Project genre"),
    visual_style: Optional[str] = Form(None, description="Visual style"),
    additional_context: Optional[str] = Form(None, description="Additional context"),
    user_id: str = Depends(verify_jwt_token)
) -> VisionAnalysisResponse:
    """
    Analyze an image using a vision model.
    
    This endpoint extracts character information from an image using
    AI vision models (LLaVA, GPT-4 Vision, etc.).
    """
    if not CHARACTER_WIZARD_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Character wizard services not available"
        )
    
    try:
        from PIL import Image
        import numpy as np
        from src.character_wizard.vision_character_analyzer import get_vision_analyzer
        
        # Read image data
        image_data = await file.read()
        
        # Convert to numpy array
        image = Image.open(io.BytesIO(image_data))
        image_array = np.array(image)
        
        # Analyze image
        analyzer = get_vision_analyzer()
        result = await analyzer.analyze_image(
            image=image_array,
            genre=genre,
            style=visual_style,
            additional_context=additional_context
        )
        
        if not result.success:
            return VisionAnalysisResponse(
                success=False,
                error_message=result.error_message
            )
        
        return VisionAnalysisResponse(
            success=True,
            description=result.description,
            short_description=result.short_description,
            physical_attributes=physical_attrs_to_response(result.physical_attributes),
            suggested_name=result.suggested_name,
            suggested_personality=result.suggested_personality or [],
            suggested_role=result.suggested_role,
            style_adaptations=result.style_adaptations,
            confidence=result.confidence
        )
        
    except Exception as e:
        logger.error(f"Failed to analyze image: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/character/base64", response_model=CharacterFromImageResponse)
async def create_character_from_base64(
    image_base64: str = Form(..., description="Base64 encoded image"),
    name: Optional[str] = Form(None),
    role: Optional[str] = Form(None),
    genre: Optional[str] = Form(None),
    visual_style: Optional[str] = Form(None),
    additional_context: Optional[str] = Form(None),
    extract_face: bool = Form(True),
    analyze_image: bool = Form(True),
    apply_genre_adaptations: bool = Form(True),
    user_id: str = Depends(verify_jwt_token)
) -> CharacterFromImageResponse:
    """
    Create a character from a base64-encoded image.
    
    This is useful for frontend applications that already have
    the image data in base64 format.
    """
    if not CHARACTER_WIZARD_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Character wizard services not available"
        )
    
    try:
        from PIL import Image
        import numpy as np
        
        # Decode base64
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))
        image_array = np.array(image)
        
        # Set up output directory
        output_dir = Path("./projects") / "temp" / "character_images"
        output_dir.mkdir(parents=True, exist_ok=True)
        
        # Get service with configuration
        config = get_service_config(
            genre=genre,
            visual_style=visual_style,
            extract_face=extract_face,
            analyze_image=analyze_image,
            apply_genre_adaptations=apply_genre_adaptations,
            output_directory=str(output_dir)
        )
        
        service = ImageToCharacterService(config)
        
        # Create character from image
        result = await service.create_character_from_image(
            image=image_array,
            name=name,
            role=role,
            additional_context=additional_context
        )
        
        if not result.success:
            return CharacterFromImageResponse(
                success=False,
                error_message=result.error_message
            )
        
        # Generate character ID
        character_id = str(uuid.uuid4())
        
        return CharacterFromImageResponse(
            success=True,
            character_id=character_id,
            name=result.suggested_name,
            role=result.suggested_role,
            description=result.description,
            short_description=result.short_description,
            physical_attributes=physical_attrs_to_response(result.physical_attributes),
            personality_traits=result.suggested_personality or [],
            face_extracted=result.face_extracted,
            face_image_base64=result.face_image_base64,
            face_angle=result.face_angle.value if result.face_angle else None,
            face_expression=result.face_expression.value if result.face_expression else None,
            portrait_prompt=result.portrait_prompt,
            full_body_prompt=result.full_body_prompt,
            style_adaptations=result.style_adaptations,
            confidence=result.confidence,
            processing_time_ms=result.processing_time_ms
        )
        
    except Exception as e:
        logger.error(f"Failed to create character from base64 image: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/character/providers")
async def list_vision_providers() -> Dict[str, Any]:
    """
    List available vision model providers.
    
    Returns information about which vision providers are configured
    and available.
    """
    providers = {
        "ollama": {
            "name": "Ollama (LLaVA)",
            "available": False,
            "configured": True,
            "model": "llava:13b"
        },
        "openai": {
            "name": "OpenAI (GPT-4 Vision)",
            "available": False,
            "configured": bool(os.environ.get("OPENAI_API_KEY")),
            "model": "gpt-4-vision-preview"
        },
        "anthropic": {
            "name": "Anthropic (Claude Vision)",
            "available": False,
            "configured": bool(os.environ.get("ANTHROPIC_API_KEY")),
            "model": "claude-3-opus-20240229"
        }
    }
    
    # Check Ollama availability
    try:
        import requests
        # Use a more robust check for Ollama and specifically LLaVA/Vision models
        ollama_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
        response = requests.get(f"{ollama_url}/api/tags", timeout=1.5)
        if response.status_code == 200:
            models = response.json().get("models", [])
            for model in models:
                model_name = model.get("name", "").lower()
                # Check for common vision-capable models in Ollama
                if any(v in model_name for v in ["llava", "vision", "moondream", "bakllava"]):
                    providers["ollama"]["available"] = True
                    providers["ollama"]["model"] = model["name"]
                    break
    except Exception as e:
        logger.warning(f"Failed to check Ollama availability: {e}")
    
    # For cloud providers, "available" means configured
    try:
        providers["openai"]["available"] = providers["openai"]["configured"]
        providers["anthropic"]["available"] = providers["anthropic"]["configured"]
    except Exception as e:
        logger.warning(f"Error checking cloud providers: {e}")
    
    # Calculate default provider
    default_provider = None
    if providers["ollama"]["available"]:
        default_provider = "ollama"
    elif providers["openai"]["available"]:
        default_provider = "openai"
    elif providers["anthropic"]["available"]:
        default_provider = "anthropic"
        
    return {
        "providers": providers,
        "default": default_provider
    }


# ============================================================================
# Character Variation Endpoints
# ============================================================================

class VariationRequest(BaseModel):
    """Request model for character variations"""
    character_description: str
    character_id: str
    styles: List[str] = ["realistic"]
    expressions: List[str] = ["neutral"]
    poses: List[str] = ["front_view"]
    lighting_options: List[str] = ["natural"]
    max_variations: int = 10
    generate_character_sheet: bool = True


class VariationPromptRequest(BaseModel):
    """Request model for generating prompts only"""
    character_description: str
    style: str = "realistic"
    expression: str = "neutral"
    pose: str = "front_view"
    lighting: str = "natural"


class GeneratedVariationResponse(BaseModel):
    """Response model for a single variation"""
    variation_id: str
    style: str
    expression: str
    pose: str
    lighting: str
    prompt: str
    negative_prompt: str
    image_base64: Optional[str] = None
    image_path: Optional[str] = None
    cached: bool = False


class VariationGenerationResponse(BaseModel):
    """Response model for variation generation"""
    success: bool
    character_id: str
    variations: List[GeneratedVariationResponse] = []
    character_sheet_base64: Optional[str] = None
    total_generation_time_ms: int = 0
    error_message: Optional[str] = None


class AvailableOptionsResponse(BaseModel):
    """Response model for available options"""
    styles: List[Dict[str, str]]
    expressions: List[Dict[str, str]]
    poses: List[Dict[str, str]]
    lighting: List[Dict[str, str]]


@router.get("/character/variations/options", response_model=AvailableOptionsResponse)
async def get_variation_options() -> AvailableOptionsResponse:
    """
    Get available options for character variations.
    
    Returns lists of available styles, expressions, poses, and lighting options.
    """
    if not CHARACTER_WIZARD_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Character wizard services not available"
        )
    
    try:
        generator = get_variation_generator()
        
        return AvailableOptionsResponse(
            styles=generator.get_available_styles(),
            expressions=generator.get_available_expressions(),
            poses=generator.get_available_poses(),
            lighting=generator.get_available_lighting()
        )
    except Exception as e:
        logger.error(f"Failed to get variation options: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/character/variations/prompts")
async def generate_variation_prompts(
    request: VariationPromptRequest,
    user_id: str = Depends(verify_jwt_token)
) -> Dict[str, str]:
    """
    Generate prompts for a specific variation without actual image generation.
    
    This is useful for:
    - Previewing prompts before generation
    - Manual generation with external tools
    - Prompt engineering and refinement
    """
    if not CHARACTER_WIZARD_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Character wizard services not available"
        )
    
    try:
        generator = get_variation_generator()
        
        # Convert string values to enums
        style = ArtisticStyle(request.style)
        expression = ExpressionType(request.expression)
        pose = PoseType(request.pose)
        lighting = LightingType(request.lighting)
        
        result = generator.generate_prompts_only(
            character_description=request.character_description,
            style=style,
            expression=expression,
            pose=pose,
            lighting=lighting
        )
        
        return result
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid option value: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Failed to generate prompts: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/character/variations/generate", response_model=VariationGenerationResponse)
async def generate_character_variations(
    request: VariationRequest,
    user_id: str = Depends(verify_jwt_token)
) -> VariationGenerationResponse:
    """
    Generate multiple character variations.
    
    This endpoint generates variations of a character in different styles,
    expressions, poses, and lighting conditions.
    """
    if not CHARACTER_WIZARD_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Character wizard services not available"
        )
    
    try:
        # Build configuration
        config = CharacterVariationConfig(
            styles=[ArtisticStyle(s) for s in request.styles],
            expressions=[ExpressionType(e) for e in request.expressions],
            poses=[PoseType(p) for p in request.poses],
            lighting_options=[LightingType(l) for l in request.lighting_options],
            max_variations=request.max_variations,
            generate_character_sheet=request.generate_character_sheet
        )
        
        generator = get_variation_generator(config)
        
        # Generate variations
        result = generator.generate_variations(
            character_description=request.character_description,
            character_id=request.character_id
        )
        
        # Convert variations to response format
        variations_response = []
        for v in result.variations:
            variations_response.append(GeneratedVariationResponse(
                variation_id=v.variation_id,
                style=v.style.value,
                expression=v.expression.value,
                pose=v.pose.value,
                lighting=v.lighting.value,
                prompt=v.prompt,
                negative_prompt=v.negative_prompt,
                image_base64=v.image_base64,
                image_path=v.image_path,
                cached=v.cached
            ))
        
        return VariationGenerationResponse(
            success=result.success,
            character_id=result.character_id,
            variations=variations_response,
            character_sheet_base64=result.character_sheet_base64,
            total_generation_time_ms=result.total_generation_time_ms,
            error_message=result.error_message
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid option value: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Failed to generate variations: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.post("/character/variations/generate-from-image")
async def generate_variations_from_image(
    file: UploadFile = File(..., description="Source image for variations"),
    character_id: str = Form(..., description="Character ID"),
    styles: str = Form("realistic,anime,cartoon", description="Comma-separated list of styles"),
    expressions: str = Form("neutral,happy,sad", description="Comma-separated list of expressions"),
    max_variations: int = Form(10, description="Maximum number of variations"),
    user_id: str = Depends(verify_jwt_token)
) -> VariationGenerationResponse:
    """
    Generate character variations from an uploaded image.
    
    This endpoint:
    1. Analyzes the image to extract character description
    2. Generates variations in the specified styles and expressions
    """
    if not CHARACTER_WIZARD_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Character wizard services not available"
        )
    
    try:
        from PIL import Image
        import numpy as np
        
        # Read image data
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image_array = np.array(image)
        
        # Analyze image to get character description
        analyzer = get_vision_analyzer()
        analysis_result = await analyzer.analyze_image(image_array)
        
        if not analysis_result.success:
            return VariationGenerationResponse(
                success=False,
                character_id=character_id,
                error_message="Failed to analyze image"
            )
        
        # Parse options
        style_list = [s.strip() for s in styles.split(",")]
        expression_list = [e.strip() for e in expressions.split(",")]
        
        # Build configuration
        config = CharacterVariationConfig(
            styles=[ArtisticStyle(s) for s in style_list if s],
            expressions=[ExpressionType(e) for e in expression_list if e],
            max_variations=max_variations
        )
        
        generator = get_variation_generator(config)
        
        # Generate variations
        result = generator.generate_variations(
            character_description=analysis_result.short_description or analysis_result.description,
            character_id=character_id
        )
        
        # Convert variations to response format
        variations_response = []
        for v in result.variations:
            variations_response.append(GeneratedVariationResponse(
                variation_id=v.variation_id,
                style=v.style.value,
                expression=v.expression.value,
                pose=v.pose.value,
                lighting=v.lighting.value,
                prompt=v.prompt,
                negative_prompt=v.negative_prompt,
                image_base64=v.image_base64,
                image_path=v.image_path,
                cached=v.cached
            ))
        
        return VariationGenerationResponse(
            success=result.success,
            character_id=result.character_id,
            variations=variations_response,
            character_sheet_base64=result.character_sheet_base64,
            total_generation_time_ms=result.total_generation_time_ms,
            error_message=result.error_message
        )
        
    except Exception as e:
        logger.error(f"Failed to generate variations from image: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


# ============================================================================
# Face Swap Endpoints
# ============================================================================

class FaceSwapRequest(BaseModel):
    """Request model for face swap"""
    method: str = "ip_adapter"
    strength: float = 0.85
    preserve_identity: bool = True


class FaceSwapResponse(BaseModel):
    """Response model for face swap"""
    success: bool
    result_image_base64: Optional[str] = None
    workflow_id: Optional[str] = None
    processing_time_ms: int = 0
    error_message: Optional[str] = None


@router.post("/character/face-swap", response_model=FaceSwapResponse)
async def execute_face_swap(
    source_file: UploadFile = File(..., description="Source face image"),
    target_file: UploadFile = File(..., description="Target image to apply face to"),
    method: str = Form("ip_adapter", description="Face swap method"),
    strength: float = Form(0.85, description="Face swap strength (0-1)"),
    preserve_identity: bool = Form(True, description="Preserve identity"),
    user_id: str = Depends(verify_jwt_token)
) -> FaceSwapResponse:
    """
    Execute a face swap between two images.
    
    This endpoint uses ComfyUI workflows to swap faces between images.
    """
    if not CHARACTER_WIZARD_AVAILABLE:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Character wizard services not available"
        )
    
    try:
        from PIL import Image
        import numpy as np
        
        # Read source image
        source_data = await source_file.read()
        source_image = Image.open(io.BytesIO(source_data))
        source_array = np.array(source_image)
        
        # Read target image
        target_data = await target_file.read()
        target_image = Image.open(io.BytesIO(target_data))
        target_array = np.array(target_image)
        
        # Build configuration
        config = FaceSwapConfig(
            method=FaceSwapMethod(method),
            strength=strength,
            preserve_identity=preserve_identity
        )
        
        workflow = get_face_swap_workflow(config)
        
        # Execute face swap
        result = await workflow.execute_face_swap(
            source_face=source_array,
            target_image=target_array
        )
        
        return FaceSwapResponse(
            success=result.success,
            result_image_base64=result.result_image_base64,
            workflow_id=result.workflow_id,
            processing_time_ms=result.processing_time_ms,
            error_message=result.error_message
        )
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid option value: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Failed to execute face swap: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/character/face-swap/methods")
async def get_face_swap_methods() -> Dict[str, Any]:
    """
    Get available face swap methods.
    
    Returns information about supported face swap techniques.
    """
    return {
        "methods": [
            {
                "id": "ip_adapter",
                "name": "IP-Adapter Face",
                "description": "Identity-preserving face generation with IP-Adapter",
                "recommended": True
            },
            {
                "id": "face_id",
                "name": "FaceID v2",
                "description": "Advanced face identity preservation",
                "recommended": False
            },
            {
                "id": "instant_id",
                "name": "InstantID",
                "description": "Zero-shot identity preservation",
                "recommended": False
            },
            {
                "id": "reactor",
                "name": "Reactor",
                "description": "Classic face swap with ReActor",
                "recommended": False
            }
        ],
        "default": "ip_adapter"
    }


# ============================================================================
# Export
# ============================================================================

__all__ = [
    "router",
    "CharacterFromImageRequest",
    "CharacterFromImageResponse",
    "FaceExtractionResponse",
    "VisionAnalysisResponse",
    "VariationRequest",
    "VariationPromptRequest",
    "VariationGenerationResponse",
    "FaceSwapRequest",
    "FaceSwapResponse"
]
