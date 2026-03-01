"""
Image to Object Service - Create objects/props from images.

This module provides:
- Complete object creation pipeline
- Prompt generation for objects
- Integration with vision analyzer
- Genre-specific adaptations
"""

import logging
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

import numpy as np

from .vision_object_analyzer import (
    VisionObjectAnalyzer,
    ObjectAnalyzerConfig,
    ObjectAnalysisResult,
    ObjectAttributes,
    get_object_analyzer
)

logger = logging.getLogger(__name__)


class ObjectCreationMode(str, Enum):
    """Mode for object creation"""
    VISION_ONLY = "vision_only"
    HYBRID = "hybrid"
    RULES_ONLY = "rules_only"


@dataclass
class ObjectCreationConfig:
    """Configuration for object creation"""
    mode: ObjectCreationMode = ObjectCreationMode.HYBRID
    analyze_image: bool = True
    genre: Optional[str] = None
    visual_style: Optional[str] = None
    apply_genre_adaptations: bool = True
    generate_prompts: bool = True
    output_directory: Optional[str] = None


@dataclass
class ImageObjectResult:
    """Result of object creation from image"""
    success: bool
    object_id: Optional[str] = None
    suggested_name: Optional[str] = None
    object_type: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    short_description: Optional[str] = None
    attributes: Optional[ObjectAttributes] = None
    suggested_tags: List[str] = field(default_factory=list)
    
    # Generated prompts
    hero_shot_prompt: Optional[str] = None
    detail_shot_prompt: Optional[str] = None
    context_shot_prompt: Optional[str] = None
    
    # Style adaptations
    style_adaptations: Dict[str, str] = field(default_factory=dict)
    
    # Metadata
    confidence: float = 0.0
    processing_time_ms: int = 0
    error_message: Optional[str] = None


class ImageToObjectService:
    """
    Complete service for creating objects/props from images.
    """
    
    def __init__(self, config: Optional[ObjectCreationConfig] = None):
        """Initialize object creation service"""
        self.config = config or ObjectCreationConfig()
        self.vision_analyzer = get_object_analyzer()
        
        logger.info("Image to object service initialized")
    
    async def create_object_from_image(
        self,
        image: np.ndarray,
        name: Optional[str] = None,
        object_type: Optional[str] = None,
        additional_context: Optional[str] = None
    ) -> ImageObjectResult:
        """Create a complete object from an image"""
        
        import time
        start_time = time.time()
        
        try:
            # Vision analysis
            analysis_result = await self.vision_analyzer.analyze_image(
                image=image,
                genre=self.config.genre if self.config.apply_genre_adaptations else None,
                style=self.config.visual_style,
                additional_context=additional_context
            )
            
            if not analysis_result.success:
                return ImageObjectResult(
                    success=False,
                    error_message=analysis_result.error_message
                )
            
            # Build result
            result = ImageObjectResult(
                success=True,
                suggested_name=name or analysis_result.suggested_name,
                object_type=object_type or analysis_result.attributes.object_type if analysis_result.attributes else None,
                category=analysis_result.attributes.category if analysis_result.attributes else None,
                description=analysis_result.description,
                short_description=analysis_result.short_description,
                attributes=analysis_result.attributes,
                suggested_tags=analysis_result.suggested_tags,
                confidence=analysis_result.confidence
            )
            
            # Generate prompts
            if self.config.generate_prompts and analysis_result.attributes:
                result.hero_shot_prompt = self._generate_hero_shot_prompt(
                    analysis_result.attributes, name
                )
                result.detail_shot_prompt = self._generate_detail_shot_prompt(
                    analysis_result.attributes, name
                )
                result.context_shot_prompt = self._generate_context_shot_prompt(
                    analysis_result.attributes, name
                )
            
            result.processing_time_ms = int((time.time() - start_time) * 1000)
            
            return result
            
        except Exception as e:
            logger.error(f"Object creation failed: {e}")
            return ImageObjectResult(
                success=False,
                error_message=str(e)
            )
    
    def _generate_hero_shot_prompt(
        self,
        attributes: ObjectAttributes,
        name: Optional[str] = None
    ) -> str:
        """Generate hero shot prompt"""
        parts = []
        
        # Shot type
        parts.append("hero shot")
        parts.append("product photography")
        
        # Object type
        if attributes.object_type:
            parts.append(attributes.object_type)
        
        # Materials
        if attributes.primary_material:
            parts.append(f"made of {attributes.primary_material}")
        if attributes.secondary_materials:
            parts.append(f"with {', '.join(attributes.secondary_materials[:2])}")
        
        # Colors
        if attributes.color_primary:
            parts.append(attributes.color_primary)
        if attributes.color_secondary:
            parts.append(f"accented with {', '.join(attributes.color_secondary[:2])}")
        
        # Texture and finish
        if attributes.texture:
            parts.append(f"{attributes.texture} texture")
        if attributes.finish:
            parts.append(f"{attributes.finish} finish")
        
        # Style
        if attributes.style:
            parts.append(f"{attributes.style} style")
        
        # Details
        if attributes.decorative_elements:
            parts.append(f"featuring {', '.join(attributes.decorative_elements[:2])}")
        
        # Lighting
        parts.extend(["studio lighting", "soft shadows", "professional"])
        
        return ", ".join(parts)
    
    def _generate_detail_shot_prompt(
        self,
        attributes: ObjectAttributes,
        name: Optional[str] = None
    ) -> str:
        """Generate detail shot prompt"""
        parts = []
        
        # Shot type
        parts.append("macro detail shot")
        
        # Focus
        if attributes.decorative_elements:
            parts.append(f"close-up of {attributes.decorative_elements[0]}")
        elif attributes.functional_parts:
            parts.append(f"close-up of {attributes.functional_parts[0]}")
        else:
            parts.append("close-up of surface details")
        
        # Material details
        if attributes.texture:
            parts.append(f"showing {attributes.texture} texture")
        if attributes.finish:
            parts.append(f"{attributes.finish} surface")
        
        # Colors
        if attributes.color_primary:
            parts.append(f"{attributes.color_primary} tones")
        
        # Quality
        parts.extend(["shallow depth of field", "sharp focus", "macro photography"])
        
        return ", ".join(parts)
    
    def _generate_context_shot_prompt(
        self,
        attributes: ObjectAttributes,
        name: Optional[str] = None
    ) -> str:
        """Generate context/environment shot prompt"""
        parts = []
        
        # Shot type
        parts.append("context shot")
        
        # Object
        if attributes.object_type:
            parts.append(attributes.object_type)
        
        # Setting context
        if attributes.setting_context:
            parts.append(f"in {attributes.setting_context} setting")
        
        # Usage context
        if attributes.primary_use:
            parts.append(f"shown for {attributes.primary_use}")
        
        # Size reference
        if attributes.size_category:
            parts.append(f"{attributes.size_category} size")
        
        # Style
        if attributes.style:
            parts.append(f"{attributes.style} aesthetic")
        
        # Era
        if attributes.era_period:
            parts.append(f"{attributes.era_period} period")
        
        # Quality
        parts.extend(["natural lighting", "environmental context", "professional"])
        
        return ", ".join(parts)
    
    def get_object_categories(self) -> List[Dict[str, str]]:
        """Get available object categories"""
        return [
            {"id": "furniture", "name": "Furniture", "description": "Chairs, tables, beds, etc."},
            {"id": "weapon", "name": "Weapon", "description": "Swords, guns, bows, etc."},
            {"id": "tool", "name": "Tool", "description": "Hammers, wrenches, etc."},
            {"id": "clothing", "name": "Clothing", "description": "Shirts, dresses, armor"},
            {"id": "accessory", "name": "Accessory", "description": "Bags, belts, hats"},
            {"id": "vehicle", "name": "Vehicle", "description": "Cars, bikes, ships"},
            {"id": "container", "name": "Container", "description": "Boxes, bottles, chests"},
            {"id": "decoration", "name": "Decoration", "description": "Vases, statues, art"},
            {"id": "food", "name": "Food", "description": "Meals, drinks, ingredients"},
            {"id": "electronic", "name": "Electronic", "description": "Phones, computers, gadgets"},
            {"id": "musical_instrument", "name": "Musical Instrument", "description": "Guitars, pianos, etc."},
            {"id": "book_document", "name": "Book/Document", "description": "Books, scrolls, papers"},
            {"id": "art", "name": "Art", "description": "Paintings, sculptures"},
            {"id": "jewelry", "name": "Jewelry", "description": "Rings, necklaces, etc."},
            {"id": "toy", "name": "Toy", "description": "Dolls, games, puzzles"},
            {"id": "medical", "name": "Medical", "description": "Medical equipment"},
            {"id": "sports", "name": "Sports", "description": "Sports equipment"},
            {"id": "natural", "name": "Natural", "description": "Plants, rocks, shells"},
            {"id": "magical", "name": "Magical", "description": "Fantasy artifacts, potions"}
        ]


# Singleton instance
_object_service: Optional[ImageToObjectService] = None


def get_image_to_object_service(
    config: Optional[ObjectCreationConfig] = None
) -> ImageToObjectService:
    """Get singleton instance of object creation service"""
    global _object_service
    if _object_service is None:
        _object_service = ImageToObjectService(config)
    return _object_service