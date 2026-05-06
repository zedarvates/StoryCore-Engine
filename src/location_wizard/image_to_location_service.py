"""
Image to Location Service - Create locations from images.

This module provides:
- Complete location creation pipeline
- Prompt generation for locations
- Integration with vision analyzer
- Genre-specific adaptations

Requirements: Location Creation Enhancement from User Images
"""

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, List, Optional

import numpy as np

from .vision_location_analyzer import LocationAttributes, get_location_analyzer

# Configure logging
logger = logging.getLogger(__name__)


class LocationCreationMode(str, Enum):
    """Mode for location creation"""

    VISION_ONLY = "vision_only"
    HYBRID = "hybrid"
    RULES_ONLY = "rules_only"


@dataclass
class LocationCreationConfig:
    """Configuration for location creation"""

    mode: LocationCreationMode = LocationCreationMode.HYBRID
    analyze_image: bool = True
    genre: Optional[str] = None
    visual_style: Optional[str] = None
    apply_genre_adaptations: bool = True
    generate_prompts: bool = True
    output_directory: Optional[str] = None
    save_analysis: bool = True


@dataclass
class ImageLocationResult:
    """Result of location creation from image"""

    success: bool
    location_id: Optional[str] = None
    suggested_name: Optional[str] = None
    location_type: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    attributes: Optional[LocationAttributes] = None
    narrative_purpose: Optional[str] = None
    story_potential: List[str] = field(default_factory=list)
    suggested_tags: List[str] = field(default_factory=list)

    # Generated prompts
    wide_shot_prompt: Optional[str] = None
    close_up_prompt: Optional[str] = None
    atmospheric_prompt: Optional[str] = None

    # Style adaptations
    style_adaptations: Dict[str, str] = field(default_factory=dict)

    # Metadata
    confidence: float = 0.0
    processing_time_ms: int = 0
    error_message: Optional[str] = None


class ImageToLocationService:
    """
    Complete service for creating locations from images.

    Pipeline:
    1. Analyze image with vision model
    2. Extract location attributes
    3. Generate prompts for different shot types
    4. Apply genre-specific adaptations
    """

    def __init__(self, config: Optional[LocationCreationConfig] = None):
        """Initialize location creation service"""
        self.config = config or LocationCreationConfig()
        self.vision_analyzer = get_location_analyzer()

        logger.info("Image to location service initialized")

    async def create_location_from_image(
        self,
        image: np.ndarray,
        name: Optional[str] = None,
        location_type: Optional[str] = None,
        additional_context: Optional[str] = None,
    ) -> ImageLocationResult:
        """
        Create a complete location from an image.

        Args:
            image: numpy array of the image (RGB)
            name: Optional name for the location
            location_type: Optional type (interior, exterior, etc.)
            additional_context: Additional context for analysis

        Returns:
            ImageLocationResult with all location data
        """
        import time

        start_time = time.time()

        try:
            # Step 1: Vision analysis
            analysis_result = await self.vision_analyzer.analyze_image(
                image=image,
                genre=self.config.genre
                if self.config.apply_genre_adaptations
                else None,
                style=self.config.visual_style,
                additional_context=additional_context,
            )

            if not analysis_result.success:
                return ImageLocationResult(
                    success=False, error_message=analysis_result.error_message
                )

            # Step 2: Build location result
            result = ImageLocationResult(
                success=True,
                suggested_name=name or analysis_result.suggested_name,
                location_type=location_type or analysis_result.attributes.location_type
                if analysis_result.attributes
                else None,
                description=analysis_result.description,
                short_description=analysis_result.short_description,
                attributes=analysis_result.attributes,
                narrative_purpose=analysis_result.narrative_purpose,
                story_potential=analysis_result.story_potential,
                suggested_tags=analysis_result.suggested_tags,
                style_adaptations=analysis_result.style_adaptations,
                confidence=analysis_result.confidence,
            )

            # Step 3: Generate prompts
            if self.config.generate_prompts and analysis_result.attributes:
                result.wide_shot_prompt = self._generate_wide_shot_prompt(
                    analysis_result.attributes, name
                )
                result.close_up_prompt = self._generate_close_up_prompt(
                    analysis_result.attributes, name
                )
                result.atmospheric_prompt = self._generate_atmospheric_prompt(
                    analysis_result.attributes, name
                )

            result.processing_time_ms = int((time.time() - start_time) * 1000)

            return result

        except Exception as e:
            logger.error(f"Location creation failed: {e}")
            return ImageLocationResult(success=False, error_message=str(e))

    def _generate_wide_shot_prompt(
        self, attributes: LocationAttributes, name: Optional[str] = None
    ) -> str:
        """Generate wide establishing shot prompt"""
        parts = []

        # Shot type
        parts.append("wide establishing shot")

        # Location type and setting
        if attributes.location_type:
            parts.append(attributes.location_type)
        if attributes.setting:
            parts.append(f"{attributes.setting} setting")

        # Architectural style or terrain
        if attributes.architectural_style:
            parts.append(attributes.architectural_style)
        if attributes.terrain:
            parts.append(attributes.terrain)

        # Key features
        if attributes.key_features:
            parts.append(", ".join(attributes.key_features[:3]))

        # Landscape elements
        if attributes.landscape_elements:
            parts.append(", ".join(attributes.landscape_elements[:2]))

        # Time and weather
        if attributes.time_of_day:
            parts.append(attributes.time_of_day)
        if attributes.weather:
            parts.append(attributes.weather)

        # Atmosphere
        if attributes.atmosphere:
            parts.append(f"{attributes.atmosphere} atmosphere")

        # Materials and colors
        if attributes.primary_materials:
            parts.append(", ".join(attributes.primary_materials[:2]))
        if attributes.dominant_colors:
            parts.append(", ".join(attributes.dominant_colors[:3]))

        # Quality
        parts.extend(["highly detailed", "cinematic", "professional"])

        return ", ".join(parts)

    def _generate_close_up_prompt(
        self, attributes: LocationAttributes, name: Optional[str] = None
    ) -> str:
        """Generate close-up detail shot prompt"""
        parts = []

        # Shot type
        parts.append("close-up detail shot")

        # Focus on specific elements
        if attributes.key_features:
            parts.append(f"focusing on {attributes.key_features[0]}")
        elif attributes.props:
            parts.append(f"focusing on {attributes.props[0]}")
        else:
            parts.append("architectural details")

        # Materials
        if attributes.primary_materials:
            parts.append(f"showing {', '.join(attributes.primary_materials[:2])}")

        # Colors
        if attributes.dominant_colors:
            parts.append(f"{', '.join(attributes.dominant_colors[:2])} tones")

        # Lighting
        if attributes.lighting_type:
            parts.append(f"{attributes.lighting_type} lighting")

        # Atmosphere
        if attributes.mood:
            parts.append(f"{attributes.mood} mood")

        # Quality
        parts.extend(["intricate details", "macro photography", "sharp focus"])

        return ", ".join(parts)

    def _generate_atmospheric_prompt(
        self, attributes: LocationAttributes, name: Optional[str] = None
    ) -> str:
        """Generate atmospheric/mood shot prompt"""
        parts = []

        # Shot type
        parts.append("atmospheric shot")

        # Location
        if attributes.location_type:
            parts.append(attributes.location_type)

        # Atmosphere and mood
        if attributes.atmosphere:
            parts.append(f"{attributes.atmosphere} atmosphere")
        if attributes.mood:
            parts.append(f"{attributes.mood} mood")

        # Time of day
        if attributes.time_of_day:
            parts.append(f"{attributes.time_of_day} lighting")

        # Weather
        if attributes.weather and attributes.weather != "clear":
            parts.append(attributes.weather)

        # Visual effects
        if attributes.weather in ["foggy", "misty"]:
            parts.append("volumetric fog")
        elif attributes.weather == "rainy":
            parts.append("rain effects, wet surfaces")
        elif attributes.time_of_day in ["sunset", "dusk"]:
            parts.append("golden hour lighting")
        elif attributes.time_of_day in ["night", "midnight"]:
            parts.append("night scene, dramatic shadows")

        # Landscape
        if attributes.landscape_elements:
            parts.append(", ".join(attributes.landscape_elements[:2]))

        # Quality
        parts.extend(["cinematic", "moody", "professional", "high quality"])

        return ", ".join(parts)

    def get_location_types(self) -> List[Dict[str, str]]:
        """Get available location types"""
        return [
            {"id": "interior", "name": "Interior", "description": "Indoor spaces"},
            {"id": "exterior", "name": "Exterior", "description": "Outdoor spaces"},
            {"id": "urban", "name": "Urban", "description": "City environments"},
            {"id": "rural", "name": "Rural", "description": "Countryside settings"},
            {"id": "natural", "name": "Natural", "description": "Untouched nature"},
            {
                "id": "architectural",
                "name": "Architectural",
                "description": "Building-focused",
            },
            {"id": "underground", "name": "Underground", "description": "Below ground"},
            {"id": "underwater", "name": "Underwater", "description": "Below water"},
            {"id": "aerial", "name": "Aerial", "description": "From above"},
            {"id": "fantasy", "name": "Fantasy", "description": "Fantasy realm"},
            {"id": "sci_fi", "name": "Sci-Fi", "description": "Science fiction"},
        ]


# Singleton instance
_location_service: Optional[ImageToLocationService] = None


def get_image_to_location_service(
    config: Optional[LocationCreationConfig] = None,
) -> ImageToLocationService:
    """Get singleton instance of location creation service"""
    global _location_service
    if _location_service is None:
        _location_service = ImageToLocationService(config)
    return _location_service
