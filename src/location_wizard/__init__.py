"""
Location Wizard Module

This module provides services for location/place creation from images:
- Vision-based location analysis
- Style and atmosphere extraction
- Time of day and weather variations
- Genre-specific adaptations

Usage:
    from src.location_wizard import (
        ImageToLocationService,
        VisionLocationAnalyzer,
        get_image_to_location_service
    )

    # Create location from image
    service = get_image_to_location_service()
    result = await service.create_location_from_image("path/to/image.jpg")
"""

from .vision_location_analyzer import (
    VisionLocationAnalyzer,
    LocationAnalyzerConfig,
    LocationAnalysisResult,
    LocationAttributes,
    AtmosphereType,
    TimeOfDay,
    WeatherCondition,
    get_location_analyzer,
)

from .image_to_location_service import (
    ImageToLocationService,
    LocationCreationConfig,
    LocationCreationMode,
    ImageLocationResult,
    get_image_to_location_service,
)

from .location_variation_generator import (
    LocationVariationGenerator,
    LocationVariationConfig,
    LocationStyle,
    SeasonType,
    LightingMood,
    TimeVariation,
    WeatherVariation,
    GeneratedLocationVariation,
    LocationVariationResult,
    get_location_variation_generator,
)


__all__ = [
    # Vision Analysis
    "VisionLocationAnalyzer",
    "LocationAnalyzerConfig",
    "LocationAnalysisResult",
    "LocationAttributes",
    "AtmosphereType",
    "TimeOfDay",
    "WeatherCondition",
    "get_location_analyzer",
    # Image to Location
    "ImageToLocationService",
    "LocationCreationConfig",
    "LocationCreationMode",
    "ImageLocationResult",
    "get_image_to_location_service",
    # Location Variations
    "LocationVariationGenerator",
    "LocationVariationConfig",
    "LocationStyle",
    "SeasonType",
    "LightingMood",
    "TimeVariation",
    "WeatherVariation",
    "GeneratedLocationVariation",
    "LocationVariationResult",
    "get_location_variation_generator",
]
