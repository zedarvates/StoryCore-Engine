"""
Object Variation Generator

This module provides:
- Material variations (wood, metal, stone, etc.)
- Style variations (modern, vintage, fantasy, etc.)
- Condition variations (new, worn, damaged, etc.)
- Size variations

Requirements: Object Creation Enhancement from User Images
"""

import hashlib
import json
import logging
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

# Configure logging
logger = logging.getLogger(__name__)


class ObjectStyle(str, Enum):
    """Object artistic styles"""

    REALISTIC = "realistic"
    PRODUCT_PHOTO = "product_photo"
    ARTISTIC = "artistic"
    VINTAGE = "vintage"
    MODERN = "modern"
    FANTASY = "fantasy"
    SCI_FI = "sci_fi"
    STEAMPUNK = "steampunk"
    MEDIEVAL = "medieval"
    MINIMALIST = "minimalist"
    LUXURY = "luxury"
    RUSTIC = "rustic"


class MaterialVariation(str, Enum):
    """Material variations"""

    WOOD = "wood"
    METAL = "metal"
    STONE = "stone"
    GLASS = "glass"
    CERAMIC = "ceramic"
    PLASTIC = "plastic"
    FABRIC = "fabric"
    LEATHER = "leather"
    CRYSTAL = "crystal"
    GOLD = "gold"
    SILVER = "silver"
    BRONZE = "bronze"
    IRON = "iron"
    MARBLE = "marble"
    IVORY = "ivory"


class ConditionVariation(str, Enum):
    """Condition variations"""

    PRISTINE = "pristine"
    EXCELLENT = "excellent"
    GOOD = "good"
    WORN = "worn"
    DAMAGED = "damaged"
    BROKEN = "broken"
    ANTIQUE = "antique"
    ANCIENT = "ancient"
    RUSTY = "rusty"
    WEATHERED = "weathered"


class ColorVariation(str, Enum):
    """Color variations"""

    ORIGINAL = "original"
    BLACK = "black"
    WHITE = "white"
    RED = "red"
    BLUE = "blue"
    GREEN = "green"
    GOLD = "gold"
    SILVER = "silver"
    COPPER = "copper"
    BRONZE = "bronze"


@dataclass
class ObjectVariationConfig:
    """Configuration for object variation generation"""

    styles: List[ObjectStyle] = field(
        default_factory=lambda: [ObjectStyle.REALISTIC, ObjectStyle.PRODUCT_PHOTO]
    )
    materials: List[MaterialVariation] = field(
        default_factory=lambda: [MaterialVariation.WOOD, MaterialVariation.METAL]
    )
    conditions: List[ConditionVariation] = field(
        default_factory=lambda: [ConditionVariation.PRISTINE, ConditionVariation.WORN]
    )
    max_variations: int = 15
    cache_enabled: bool = True
    output_dir: str = "./output/object_variations"


@dataclass
class GeneratedObjectVariation:
    """A generated object variation"""

    variation_id: str
    style: Optional[ObjectStyle] = None
    material: Optional[MaterialVariation] = None
    condition: Optional[ConditionVariation] = None
    color: Optional[ColorVariation] = None
    prompt: str = ""
    negative_prompt: str = ""
    image_base64: Optional[str] = None
    image_path: Optional[str] = None
    cached: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ObjectVariationResult:
    """Result of object variation generation"""

    success: bool
    object_id: str
    variations: List[GeneratedObjectVariation] = field(default_factory=list)
    total_generation_time_ms: int = 0
    error_message: Optional[str] = None


class ObjectPromptBuilder:
    """Builds prompts for object variations"""

    # Style templates
    STYLE_TEMPLATES: Dict[ObjectStyle, Dict[str, Any]] = {
        ObjectStyle.REALISTIC: {
            "base": "photorealistic object",
            "modifiers": ["8k uhd", "product photography", "high detail"],
            "lighting": "studio lighting",
        },
        ObjectStyle.PRODUCT_PHOTO: {
            "base": "professional product photography",
            "modifiers": ["clean background", "commercial quality", "sharp focus"],
            "lighting": "soft box lighting",
        },
        ObjectStyle.ARTISTIC: {
            "base": "artistic object illustration",
            "modifiers": ["stylized", "creative", "expressive"],
            "lighting": "dramatic lighting",
        },
        ObjectStyle.VINTAGE: {
            "base": "vintage object",
            "modifiers": ["antique appearance", "nostalgic", "aged patina"],
            "lighting": "warm ambient lighting",
        },
        ObjectStyle.MODERN: {
            "base": "modern object design",
            "modifiers": ["contemporary", "sleek", "minimalist"],
            "lighting": "clean white lighting",
        },
        ObjectStyle.FANTASY: {
            "base": "fantasy artifact",
            "modifiers": ["magical", "enchanted", "mystical glow"],
            "lighting": "ethereal lighting",
        },
        ObjectStyle.SCI_FI: {
            "base": "futuristic object",
            "modifiers": ["high-tech", "sci-fi", "advanced technology"],
            "lighting": "neon accent lighting",
        },
        ObjectStyle.STEAMPUNK: {
            "base": "steampunk object",
            "modifiers": ["brass gears", "victorian", "industrial"],
            "lighting": "warm industrial lighting",
        },
        ObjectStyle.MEDIEVAL: {
            "base": "medieval object",
            "modifiers": ["handcrafted", "historical", "period accurate"],
            "lighting": "torch light",
        },
        ObjectStyle.MINIMALIST: {
            "base": "minimalist object",
            "modifiers": ["simple", "clean lines", "pure form"],
            "lighting": "soft diffused lighting",
        },
        ObjectStyle.LUXURY: {
            "base": "luxury object",
            "modifiers": ["premium", "elegant", "high-end"],
            "lighting": "dramatic spotlight",
        },
        ObjectStyle.RUSTIC: {
            "base": "rustic object",
            "modifiers": ["handmade", "natural", "weathered"],
            "lighting": "natural daylight",
        },
    }

    # Material descriptions
    MATERIAL_DESCRIPTIONS: Dict[MaterialVariation, str] = {
        MaterialVariation.WOOD: "wooden, oak wood grain texture",
        MaterialVariation.METAL: "metallic, brushed metal surface",
        MaterialVariation.STONE: "stone, carved rock texture",
        MaterialVariation.GLASS: "glass, transparent reflective surface",
        MaterialVariation.CERAMIC: "ceramic, glazed pottery finish",
        MaterialVariation.PLASTIC: "plastic, smooth synthetic material",
        MaterialVariation.FABRIC: "fabric, woven textile texture",
        MaterialVariation.LEATHER: "leather, aged hide texture",
        MaterialVariation.CRYSTAL: "crystal, faceted gem-like surface",
        MaterialVariation.GOLD: "solid gold, polished precious metal",
        MaterialVariation.SILVER: "sterling silver, polished metallic shine",
        MaterialVariation.BRONZE: "bronze, aged patina finish",
        MaterialVariation.IRON: "wrought iron, dark metallic surface",
        MaterialVariation.MARBLE: "marble, veined stone texture",
        MaterialVariation.IVORY: "ivory, cream-colored organic material",
    }

    # Condition descriptions
    CONDITION_DESCRIPTIONS: Dict[ConditionVariation, str] = {
        ConditionVariation.PRISTINE: "brand new, perfect condition, flawless",
        ConditionVariation.EXCELLENT: "excellent condition, minimal wear",
        ConditionVariation.GOOD: "good condition, normal use marks",
        ConditionVariation.WORN: "well-worn, visible signs of use",
        ConditionVariation.DAMAGED: "damaged, cracks and chips visible",
        ConditionVariation.BROKEN: "broken, missing pieces",
        ConditionVariation.ANTIQUE: "antique, aged with character",
        ConditionVariation.ANCIENT: "ancient, heavily weathered",
        ConditionVariation.RUSTY: "rusted, corroded metal surface",
        ConditionVariation.WEATHERED: "weathered, exposed to elements",
    }

    @classmethod
    def build_prompt(
        cls,
        object_description: str,
        style: Optional[ObjectStyle] = None,
        material: Optional[MaterialVariation] = None,
        condition: Optional[ConditionVariation] = None,
        color: Optional[ColorVariation] = None,
    ) -> Tuple[str, str]:
        """Build positive and negative prompts"""

        style = style or ObjectStyle.REALISTIC
        style_template = cls.STYLE_TEMPLATES.get(
            style, cls.STYLE_TEMPLATES[ObjectStyle.REALISTIC]
        )

        parts = []

        # Base style
        parts.append(style_template["base"])

        # Object description
        parts.append(object_description)

        # Material
        if material:
            mat_desc = cls.MATERIAL_DESCRIPTIONS.get(material)
            if mat_desc:
                parts.append(mat_desc)

        # Condition
        if condition:
            cond_desc = cls.CONDITION_DESCRIPTIONS.get(condition)
            if cond_desc:
                parts.append(cond_desc)

        # Color
        if color and color != ColorVariation.ORIGINAL:
            parts.append(f"{color.value} colored")

        # Style modifiers
        parts.extend(style_template["modifiers"])

        # Lighting
        parts.append(style_template["lighting"])

        # Quality
        parts.extend(["highly detailed", "professional quality"])

        positive_prompt = ", ".join(parts)

        # Negative prompt
        negative_parts = [
            "blurry",
            "low quality",
            "distorted",
            "bad anatomy",
            "text",
            "watermark",
            "signature",
            "background clutter",
            "out of focus",
            "overexposed",
            "underexposed",
        ]
        negative_prompt = ", ".join(negative_parts)

        return positive_prompt, negative_prompt


class ObjectVariationGenerator:
    """Generates variations of objects with different materials, styles, etc."""

    def __init__(
        self,
        config: Optional[ObjectVariationConfig] = None,
        output_dir: Optional[str] = None,
    ):
        """Initialize variation generator"""
        self.config = config or ObjectVariationConfig()
        self.output_dir = Path(output_dir or self.config.output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        self.cache_dir = self.output_dir / "cache"
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        self.prompt_builder = ObjectPromptBuilder()

        logger.info("Object variation generator initialized")

    def generate_variations(
        self,
        object_description: str,
        object_id: str,
        custom_config: Optional[ObjectVariationConfig] = None,
    ) -> ObjectVariationResult:
        """Generate object variations"""

        import time

        start_time = time.time()

        config = custom_config or self.config
        variations = []

        try:
            total_variations = 0
            max_variations = config.max_variations

            # Style variations
            for style in config.styles:
                if total_variations >= max_variations:
                    break

                variation = self._generate_single_variation(
                    object_description=object_description,
                    object_id=object_id,
                    style=style,
                )
                if variation:
                    variations.append(variation)
                    total_variations += 1

            # Material variations
            for material in config.materials:
                if total_variations >= max_variations:
                    break

                variation = self._generate_single_variation(
                    object_description=object_description,
                    object_id=object_id,
                    material=material,
                )
                if variation:
                    variations.append(variation)
                    total_variations += 1

            # Condition variations
            for condition in config.conditions:
                if total_variations >= max_variations:
                    break

                variation = self._generate_single_variation(
                    object_description=object_description,
                    object_id=object_id,
                    condition=condition,
                )
                if variation:
                    variations.append(variation)
                    total_variations += 1

            total_time = int((time.time() - start_time) * 1000)

            return ObjectVariationResult(
                success=True,
                object_id=object_id,
                variations=variations,
                total_generation_time_ms=total_time,
            )

        except Exception as e:
            logger.error(f"Variation generation failed: {e}")
            return ObjectVariationResult(
                success=False, object_id=object_id, error_message=str(e)
            )

    def _generate_single_variation(
        self,
        object_description: str,
        object_id: str,
        style: Optional[ObjectStyle] = None,
        material: Optional[MaterialVariation] = None,
        condition: Optional[ConditionVariation] = None,
        color: Optional[ColorVariation] = None,
    ) -> Optional[GeneratedObjectVariation]:
        """Generate a single variation"""

        try:
            positive_prompt, negative_prompt = self.prompt_builder.build_prompt(
                object_description=object_description,
                style=style,
                material=material,
                condition=condition,
                color=color,
            )

            cache_key = self._get_cache_key(
                object_id, style, material, condition, color
            )

            # Check cache
            cached_result = None
            if self.config.cache_enabled:
                cached_result = self._check_cache(cache_key)

            if cached_result:
                return GeneratedObjectVariation(
                    variation_id=cache_key,
                    style=style,
                    material=material,
                    condition=condition,
                    color=color,
                    prompt=positive_prompt,
                    negative_prompt=negative_prompt,
                    image_base64=cached_result,
                    cached=True,
                )

            return GeneratedObjectVariation(
                variation_id=cache_key,
                style=style,
                material=material,
                condition=condition,
                color=color,
                prompt=positive_prompt,
                negative_prompt=negative_prompt,
                cached=False,
            )

        except Exception as e:
            logger.error(f"Failed to generate variation: {e}")
            return None

    def _get_cache_key(
        self,
        object_id: str,
        style: Optional[ObjectStyle],
        material: Optional[MaterialVariation],
        condition: Optional[ConditionVariation],
        color: Optional[ColorVariation],
    ) -> str:
        """Generate cache key"""
        key_parts = [
            object_id,
            style.value if style else "none",
            material.value if material else "none",
            condition.value if condition else "none",
            color.value if color else "none",
        ]
        key_str = "_".join(key_parts)
        return hashlib.md5(key_str.encode()).hexdigest()[:12]

    def _check_cache(self, cache_key: str) -> Optional[str]:
        """Check cache"""
        cache_file = self.cache_dir / f"{cache_key}.json"
        if cache_file.exists():
            try:
                with open(cache_file, "r") as f:
                    data = json.load(f)
                    return data.get("image_base64")
            except Exception:
                pass
        return None

    def generate_prompts_only(
        self,
        object_description: str,
        style: Optional[ObjectStyle] = None,
        material: Optional[MaterialVariation] = None,
        condition: Optional[ConditionVariation] = None,
        color: Optional[ColorVariation] = None,
    ) -> Dict[str, str]:
        """Generate prompts without image generation"""

        positive, negative = self.prompt_builder.build_prompt(
            object_description=object_description,
            style=style,
            material=material,
            condition=condition,
            color=color,
        )

        return {
            "positive_prompt": positive,
            "negative_prompt": negative,
            "style": style.value if style else None,
            "material": material.value if material else None,
            "condition": condition.value if condition else None,
            "color": color.value if color else None,
        }

    def get_available_styles(self) -> List[Dict[str, str]]:
        """Get available styles"""
        return [
            {"id": s.value, "name": s.name.replace("_", " ").title()}
            for s in ObjectStyle
        ]

    def get_available_materials(self) -> List[Dict[str, str]]:
        """Get available materials"""
        return [
            {"id": m.value, "name": m.name.replace("_", " ").title()}
            for m in MaterialVariation
        ]

    def get_available_conditions(self) -> List[Dict[str, str]]:
        """Get available conditions"""
        return [
            {"id": c.value, "name": c.name.replace("_", " ").title()}
            for c in ConditionVariation
        ]


# Singleton
_variation_generator: Optional[ObjectVariationGenerator] = None


def get_object_variation_generator(
    config: Optional[ObjectVariationConfig] = None, output_dir: Optional[str] = None
) -> ObjectVariationGenerator:
    """Get singleton instance"""
    global _variation_generator
    if _variation_generator is None:
        _variation_generator = ObjectVariationGenerator(config, output_dir)
    return _variation_generator
