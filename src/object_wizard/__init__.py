"""
Object Wizard Module

This module provides services for object/prop creation from images:
- Vision-based object analysis
- Material and texture extraction
- Style and era identification
- Variation generation

Usage:
    from src.object_wizard import (
        ImageToObjectService,
        VisionObjectAnalyzer,
        get_image_to_object_service
    )
    
    # Create object from image
    service = get_image_to_object_service()
    result = await service.create_object_from_image("path/to/image.jpg")
"""

from .vision_object_analyzer import (
    VisionObjectAnalyzer,
    ObjectAnalyzerConfig,
    ObjectAnalysisResult,
    ObjectAttributes,
    ObjectCategory,
    MaterialType,
    get_object_analyzer
)

from .image_to_object_service import (
    ImageToObjectService,
    ObjectCreationConfig,
    ObjectCreationMode,
    ImageObjectResult,
    get_image_to_object_service
)

from .object_variation_generator import (
    ObjectVariationGenerator,
    ObjectVariationConfig,
    ObjectStyle,
    MaterialVariation,
    ConditionVariation,
    GeneratedObjectVariation,
    ObjectVariationResult,
    get_object_variation_generator
)


__all__ = [
    # Vision Analysis
    "VisionObjectAnalyzer",
    "ObjectAnalyzerConfig",
    "ObjectAnalysisResult",
    "ObjectAttributes",
    "ObjectCategory",
    "MaterialType",
    "get_object_analyzer",
    
    # Image to Object
    "ImageToObjectService",
    "ObjectCreationConfig",
    "ObjectCreationMode",
    "ImageObjectResult",
    "get_image_to_object_service",
    
    # Object Variations
    "ObjectVariationGenerator",
    "ObjectVariationConfig",
    "ObjectStyle",
    "MaterialVariation",
    "ConditionVariation",
    "GeneratedObjectVariation",
    "ObjectVariationResult",
    "get_object_variation_generator"
]
