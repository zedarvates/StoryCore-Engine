"""
Character Variation Generator

This module provides:
- Multiple artistic style generation (anime, realistic, cartoon, etc.)
- Pose and expression variations
- Character consistency across variations
- Batch generation with caching

Requirements: Character Creation Enhancement from User Images
"""

import base64
import hashlib
import json
import logging
import os
import random
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from src.comfyui_executor import comfyui_executor

# Configure logging
logger = logging.getLogger(__name__)


class ArtisticStyle(str, Enum):
    """Available artistic styles for character generation"""

    REALISTIC = "realistic"
    ANIME = "anime"
    CARTOON = "cartoon"
    COMIC = "comic"
    PAINTING = "painting"
    SKETCH = "sketch"
    WATERCOLOR = "watercolor"
    OIL_PAINTING = "oil_painting"
    PIXEL_ART = "pixel_art"
    LOW_POLY = "low_poly"
    CYBERPUNK = "cyberpunk"
    FANTASY = "fantasy"
    NOIR = "noir"
    VINTAGE = "vintage"
    NEON = "neon"


class ExpressionType(str, Enum):
    """Character expression types"""

    NEUTRAL = "neutral"
    HAPPY = "happy"
    SAD = "sad"
    ANGRY = "angry"
    SURPRISED = "surprised"
    FEARFUL = "fearful"
    DISGUSTED = "disgusted"
    CONTEMPLATIVE = "contemplative"
    DETERMINED = "determined"
    MYSTERIOUS = "mysterious"
    PLAYFUL = "playful"
    SERIOUS = "serious"


class PoseType(str, Enum):
    """Character pose types"""

    FRONT_VIEW = "front_view"
    THREE_QUARTER_LEFT = "three_quarter_left"
    THREE_QUARTER_RIGHT = "three_quarter_right"
    PROFILE_LEFT = "profile_left"
    PROFILE_RIGHT = "profile_right"
    LOW_ANGLE = "low_angle"
    HIGH_ANGLE = "high_angle"
    DYNAMIC = "dynamic"
    SITTING = "sitting"
    STANDING = "standing"
    ACTION = "action"


class LightingType(str, Enum):
    """Lighting styles for character generation"""

    NATURAL = "natural"
    STUDIO = "studio"
    DRAMATIC = "dramatic"
    SOFT = "soft"
    HARSH = "harsh"
    BACKLIGHT = "backlight"
    RIM_LIGHT = "rim_light"
    CINEMATIC = "cinematic"
    NEON = "neon"
    CANDLELIGHT = "candlelight"


@dataclass
class StylePromptConfig:
    """Configuration for style prompt generation"""

    style: ArtisticStyle = ArtisticStyle.REALISTIC
    expression: ExpressionType = ExpressionType.NEUTRAL
    pose: PoseType = PoseType.FRONT_VIEW
    lighting: LightingType = LightingType.NATURAL
    quality_modifiers: List[str] = field(
        default_factory=lambda: ["highly detailed", "best quality", "professional"]
    )
    negative_modifiers: List[str] = field(
        default_factory=lambda: ["blurry", "low quality", "deformed", "bad anatomy"]
    )


@dataclass
class CharacterVariationConfig:
    """Configuration for character variation generation"""

    styles: List[ArtisticStyle] = field(
        default_factory=lambda: [
            ArtisticStyle.REALISTIC,
            ArtisticStyle.ANIME,
            ArtisticStyle.CARTOON,
        ]
    )
    expressions: List[ExpressionType] = field(
        default_factory=lambda: [
            ExpressionType.NEUTRAL,
            ExpressionType.HAPPY,
            ExpressionType.SAD,
        ]
    )
    poses: List[PoseType] = field(
        default_factory=lambda: [
            PoseType.FRONT_VIEW,
            PoseType.THREE_QUARTER_LEFT,
            PoseType.THREE_QUARTER_RIGHT,
        ]
    )
    lighting_options: List[LightingType] = field(
        default_factory=lambda: [LightingType.NATURAL, LightingType.DRAMATIC]
    )
    generate_character_sheet: bool = True
    max_variations: int = 20
    cache_enabled: bool = True
    output_dir: str = "./output/character_variations"


@dataclass
class GeneratedVariation:
    """A generated character variation"""

    variation_id: str
    style: ArtisticStyle
    expression: ExpressionType
    pose: PoseType
    lighting: LightingType
    prompt: str
    negative_prompt: str
    image_base64: Optional[str] = None
    image_path: Optional[str] = None
    generation_time_ms: int = 0
    cached: bool = False
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class VariationGenerationResult:
    """Result of variation generation"""

    success: bool
    character_id: str
    variations: List[GeneratedVariation] = field(default_factory=list)
    character_sheet_base64: Optional[str] = None
    total_generation_time_ms: int = 0
    error_message: Optional[str] = None


class StylePromptBuilder:
    """Builds prompts for different artistic styles"""

    # Style-specific prompt templates
    STYLE_TEMPLATES: Dict[ArtisticStyle, Dict[str, Any]] = {
        ArtisticStyle.REALISTIC: {
            "base": "realistic portrait photography",
            "modifiers": [
                "photorealistic",
                "8k uhd",
                "dslr",
                "soft focus",
                "professional photography",
            ],
            "artists": ["greg rutkowski", "artgerm", "alphonse mucha"],
        },
        ArtisticStyle.ANIME: {
            "base": "anime style illustration",
            "modifiers": [
                "cel shading",
                "vibrant colors",
                "clean lines",
                "anime aesthetics",
            ],
            "artists": ["makoto shinkai", "hayao miyazaki", "studio ghibli style"],
        },
        ArtisticStyle.CARTOON: {
            "base": "cartoon character design",
            "modifiers": ["bold lines", "expressive", "colorful", "stylized"],
            "artists": ["pixar style", "disney style", "dreamworks style"],
        },
        ArtisticStyle.COMIC: {
            "base": "comic book art style",
            "modifiers": ["dynamic poses", "ink lines", "halftone dots", "bold colors"],
            "artists": ["stan lee", "jack kirby", "jim lee"],
        },
        ArtisticStyle.PAINTING: {
            "base": "oil painting portrait",
            "modifiers": ["brush strokes", "rich colors", "classical painting"],
            "artists": ["rembrandt", "vermeer", "john singer sargent"],
        },
        ArtisticStyle.SKETCH: {
            "base": "pencil sketch drawing",
            "modifiers": [
                "detailed linework",
                "shading",
                "cross-hatching",
                "hand drawn",
            ],
            "artists": ["leonardo da vinci sketches", "michelangelo drawings"],
        },
        ArtisticStyle.WATERCOLOR: {
            "base": "watercolor painting",
            "modifiers": ["soft edges", "flowing colors", "transparent washes"],
            "artists": ["albrecht durer", "john singer sargent watercolors"],
        },
        ArtisticStyle.OIL_PAINTING: {
            "base": "classical oil painting",
            "modifiers": ["rich textures", "impasto", "glazing", "classical art"],
            "artists": ["rembrandt", "titian", "peter paul rubens"],
        },
        ArtisticStyle.PIXEL_ART: {
            "base": "pixel art character",
            "modifiers": ["16-bit", "retro game style", "limited palette", "pixelated"],
            "artists": ["final fantasy vi style", "chrono trigger style"],
        },
        ArtisticStyle.LOW_POLY: {
            "base": "low poly 3d model render",
            "modifiers": ["geometric", "faceted", "minimal polygons", "stylized 3d"],
            "artists": ["poly art style", "geometric art"],
        },
        ArtisticStyle.CYBERPUNK: {
            "base": "cyberpunk art style",
            "modifiers": [
                "neon lights",
                "futuristic",
                "tech enhancements",
                "dystopian",
            ],
            "artists": ["blade runner style", "cyberpunk 2077 style"],
        },
        ArtisticStyle.FANTASY: {
            "base": "fantasy art illustration",
            "modifiers": ["magical", "ethereal", "mystical atmosphere", "epic fantasy"],
            "artists": ["frank frazetta", "boris vallejo", "larry elmore"],
        },
        ArtisticStyle.NOIR: {
            "base": "film noir style portrait",
            "modifiers": [
                "high contrast",
                "shadows",
                "dramatic lighting",
                "black and white",
            ],
            "artists": ["sin city style", "noir photography"],
        },
        ArtisticStyle.VINTAGE: {
            "base": "vintage photograph style",
            "modifiers": ["sepia tones", "film grain", "old photograph", "nostalgic"],
            "artists": ["vintage portrait photography"],
        },
        ArtisticStyle.NEON: {
            "base": "neon art style",
            "modifiers": ["glowing colors", "synthwave", "retrowave", "vibrant neon"],
            "artists": ["synthwave art", "outrun style"],
        },
    }

    # Expression descriptions
    EXPRESSION_DESCRIPTIONS: Dict[ExpressionType, str] = {
        ExpressionType.NEUTRAL: "neutral expression, calm face",
        ExpressionType.HAPPY: "happy expression, smiling, joyful",
        ExpressionType.SAD: "sad expression, melancholic, teary eyes",
        ExpressionType.ANGRY: "angry expression, furious, intense gaze",
        ExpressionType.SURPRISED: "surprised expression, wide eyes, open mouth",
        ExpressionType.FEARFUL: "fearful expression, scared, anxious",
        ExpressionType.DISGUSTED: "disgusted expression, repulsed",
        ExpressionType.CONTEMPLATIVE: "contemplative expression, thoughtful, pensive",
        ExpressionType.DETERMINED: "determined expression, focused, resolute",
        ExpressionType.MYSTERIOUS: "mysterious expression, enigmatic smile",
        ExpressionType.PLAYFUL: "playful expression, mischievous grin",
        ExpressionType.SERIOUS: "serious expression, stern, focused",
    }

    # Pose descriptions
    POSE_DESCRIPTIONS: Dict[PoseType, str] = {
        PoseType.FRONT_VIEW: "front view, facing camera directly",
        PoseType.THREE_QUARTER_LEFT: "three-quarter view facing left",
        PoseType.THREE_QUARTER_RIGHT: "three-quarter view facing right",
        PoseType.PROFILE_LEFT: "side profile facing left",
        PoseType.PROFILE_RIGHT: "side profile facing right",
        PoseType.LOW_ANGLE: "low angle shot, looking up at character",
        PoseType.HIGH_ANGLE: "high angle shot, looking down at character",
        PoseType.DYNAMIC: "dynamic action pose",
        PoseType.SITTING: "sitting pose, relaxed posture",
        PoseType.STANDING: "standing pose, full body",
        PoseType.ACTION: "action pose, movement",
    }

    # Lighting descriptions
    LIGHTING_DESCRIPTIONS: Dict[LightingType, str] = {
        LightingType.NATURAL: "natural lighting, soft daylight",
        LightingType.STUDIO: "studio lighting, professional setup",
        LightingType.DRAMATIC: "dramatic lighting, strong shadows",
        LightingType.SOFT: "soft lighting, diffused light",
        LightingType.HARSH: "harsh lighting, hard shadows",
        LightingType.BACKLIGHT: "backlight, silhouette effect",
        LightingType.RIM_LIGHT: "rim lighting, edge highlight",
        LightingType.CINEMATIC: "cinematic lighting, movie scene",
        LightingType.NEON: "neon lighting, colorful glow",
        LightingType.CANDLELIGHT: "candlelight, warm ambient glow",
    }

    @classmethod
    def build_prompt(
        cls,
        config: StylePromptConfig,
        character_description: str = "",
        additional_modifiers: List[str] = None,
    ) -> Tuple[str, str]:
        """
        Build positive and negative prompts for generation.

        Args:
            config: Style prompt configuration
            character_description: Description of the character
            additional_modifiers: Additional modifiers to include

        Returns:
            Tuple of (positive_prompt, negative_prompt)
        """
        style_template = cls.STYLE_TEMPLATES.get(
            config.style, cls.STYLE_TEMPLATES[ArtisticStyle.REALISTIC]
        )

        # Build positive prompt
        prompt_parts = []

        # Add base style
        prompt_parts.append(style_template["base"])

        # Add character description
        if character_description:
            prompt_parts.append(character_description)

        # Add expression
        expr_desc = cls.EXPRESSION_DESCRIPTIONS.get(config.expression, "")
        if expr_desc:
            prompt_parts.append(expr_desc)

        # Add pose
        pose_desc = cls.POSE_DESCRIPTIONS.get(config.pose, "")
        if pose_desc:
            prompt_parts.append(pose_desc)

        # Add lighting
        light_desc = cls.LIGHTING_DESCRIPTIONS.get(config.lighting, "")
        if light_desc:
            prompt_parts.append(light_desc)

        # Add style modifiers
        prompt_parts.extend(style_template["modifiers"])

        # Add quality modifiers
        prompt_parts.extend(config.quality_modifiers)

        # Add additional modifiers
        if additional_modifiers:
            prompt_parts.extend(additional_modifiers)

        # Add artist references (randomly select 1-2)
        artists = style_template.get("artists", [])
        if artists:
            selected_artists = random.sample(artists, min(2, len(artists)))
            prompt_parts.append(f"style of {', '.join(selected_artists)}")

        positive_prompt = ", ".join(prompt_parts)

        # Build negative prompt
        negative_parts = list(config.negative_modifiers)
        negative_parts.extend(
            [
                "nsfw",
                "nude",
                "gore",
                "violence",
                "offensive",
                "text",
                "watermark",
                "signature",
            ]
        )
        negative_prompt = ", ".join(negative_parts)

        return positive_prompt, negative_prompt


class CharacterVariationGenerator:
    """
    Generates character variations in multiple styles, expressions, and poses.

    Features:
    - Multiple artistic styles
    - Expression and pose variations
    - Character consistency
    - Caching for efficiency
    """

    def __init__(
        self,
        config: Optional[CharacterVariationConfig] = None,
        output_dir: Optional[str] = None,
    ):
        """Initialize variation generator"""
        self.config = config or CharacterVariationConfig()

        # Set output directory
        self.output_dir = Path(output_dir or self.config.output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)

        # Cache directory
        self.cache_dir = self.output_dir / "cache"
        self.cache_dir.mkdir(parents=True, exist_ok=True)

        # Prompt builder
        self.prompt_builder = StylePromptBuilder()

        logger.info(
            f"Character variation generator initialized with output dir: {self.output_dir}"
        )

    async def generate_variations(
        self,
        character_description: str,
        character_id: str,
        base_image_base64: Optional[str] = None,
        custom_config: Optional[CharacterVariationConfig] = None,
    ) -> VariationGenerationResult:
        """
        Generate character variations.

        Args:
            character_description: Description of the character
            character_id: Unique character identifier
            base_image_base64: Optional base image for image-to-image
            custom_config: Optional custom configuration

        Returns:
            VariationGenerationResult with all generated variations
        """
        import time

        start_time = time.time()

        config = custom_config or self.config
        variations = []

        try:
            # Create character directory
            character_dir = self.output_dir / character_id
            character_dir.mkdir(parents=True, exist_ok=True)

            # Generate variations based on config
            total_variations = 0
            max_variations = config.max_variations

            # Style variations
            for style in config.styles:
                if total_variations >= max_variations:
                    break

                # Expression variations for each style
                for expression in config.expressions:
                    if total_variations >= max_variations:
                        break

                    # Pose variations
                    for pose in config.poses:
                        if total_variations >= max_variations:
                            break

                        # Lighting variations (limited)
                        for lighting in config.lighting_options[:2]:
                            if total_variations >= max_variations:
                                break

                            variation = await self._generate_single_variation(
                                character_description=character_description,
                                character_id=character_id,
                                style=style,
                                expression=expression,
                                pose=pose,
                                lighting=lighting,
                                base_image_base64=base_image_base64,
                                config=config,
                            )

                            if variation:
                                variations.append(variation)
                                total_variations += 1

            # Generate character sheet if requested
            character_sheet_base64 = None
            if config.generate_character_sheet and variations:
                character_sheet_base64 = self._generate_character_sheet(
                    variations, character_id
                )

            total_time = int((time.time() - start_time) * 1000)

            return VariationGenerationResult(
                success=True,
                character_id=character_id,
                variations=variations,
                character_sheet_base64=character_sheet_base64,
                total_generation_time_ms=total_time,
            )

        except Exception as e:
            logger.error(f"Variation generation failed: {e}")
            return VariationGenerationResult(
                success=False, character_id=character_id, error_message=str(e)
            )

    async def _generate_single_variation(
        self,
        character_description: str,
        character_id: str,
        style: ArtisticStyle,
        expression: ExpressionType,
        pose: PoseType,
        lighting: LightingType,
        base_image_base64: Optional[str],
        config: CharacterVariationConfig,
    ) -> Optional[GeneratedVariation]:
        """Generate a single variation"""
        import time

        try:
            # Build prompt
            prompt_config = StylePromptConfig(
                style=style, expression=expression, pose=pose, lighting=lighting
            )

            positive_prompt, negative_prompt = self.prompt_builder.build_prompt(
                config=prompt_config, character_description=character_description
            )

            # Check cache
            cache_key = self._get_cache_key(
                character_id, style, expression, pose, lighting
            )
            cached_result = None
            if config.cache_enabled:
                cached_result = self._check_cache(cache_key)

            if cached_result:
                return GeneratedVariation(
                    variation_id=cache_key,
                    style=style,
                    expression=expression,
                    pose=pose,
                    lighting=lighting,
                    prompt=positive_prompt,
                    negative_prompt=negative_prompt,
                    image_base64=cached_result,
                    cached=True,
                )

            # Generate (placeholder - would call actual generation service)
            start_time = time.time()

            # This is a placeholder for actual generation
            # In production, would call:
            # - ComfyUI workflow
            # - Stable Diffusion API
            # - DALL-E API
            # - Midjourney API

            generated_image = await self._placeholder_generation(
                positive_prompt, negative_prompt, base_image_base64
            )

            generation_time = int((time.time() - start_time) * 1000)

            # Save to cache
            if config.cache_enabled and generated_image:
                self._save_to_cache(cache_key, generated_image)

            # Save to file
            image_path = None
            if generated_image:
                image_path = str(self.output_dir / character_id / f"{cache_key}.png")
                self._save_image(generated_image, image_path)

            return GeneratedVariation(
                variation_id=cache_key,
                style=style,
                expression=expression,
                pose=pose,
                lighting=lighting,
                prompt=positive_prompt,
                negative_prompt=negative_prompt,
                image_base64=generated_image,
                image_path=image_path,
                generation_time_ms=generation_time,
                cached=False,
            )

        except Exception as e:
            logger.error(f"Failed to generate variation: {e}")
            return None

    async def _placeholder_generation(
        self,
        positive_prompt: str,
        negative_prompt: str,
        base_image_base64: Optional[str],
    ) -> Optional[str]:
        """
        Generation using ComfyUI.
        """
        # Build simple workflow
        workflow = {
            "3": {
                "class_type": "KSampler",
                "inputs": {
                    "seed": random.randint(1, 1000000),
                    "steps": 20,
                    "cfg": 7.0,
                    "sampler_name": "euler",
                    "scheduler": "normal",
                    "denoise": 0.8,
                    "model": ["4", 0],
                    "positive": ["6", 0],
                    "negative": ["7", 0],
                    "latent_image": ["5", 0],
                },
            },
            "4": {
                "class_type": "CheckpointLoaderSimple",
                "inputs": {"ckpt_name": "v1-5-pruned-emaonly.safetensors"},
            },
            "5": {
                "class_type": "EmptyLatentImage",
                "inputs": {"width": 512, "height": 512, "batch_size": 1},
            },
            "6": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": positive_prompt, "clip": ["4", 1]},
            },
            "7": {
                "class_type": "CLIPTextEncode",
                "inputs": {"text": negative_prompt, "clip": ["4", 1]},
            },
            "8": {
                "class_type": "VAEDecode",
                "inputs": {"samples": ["3", 0], "vae": ["4", 2]},
            },
            "9": {
                "class_type": "SaveImage",
                "inputs": {"filename_prefix": "variation", "images": ["8", 0]},
            },
        }

        try:
            result = await comfyui_executor.execute_workflow(workflow)
            if result.get("success") and result.get("outputs"):
                # Get URL of the first output image
                return result["outputs"][0].get("url")
            return None
        except Exception as e:
            logger.error(f"ComfyUI generation failed: {e}")
            return None

    def _get_cache_key(
        self,
        character_id: str,
        style: ArtisticStyle,
        expression: ExpressionType,
        pose: PoseType,
        lighting: LightingType,
    ) -> str:
        """Generate cache key for variation"""
        key_str = f"{character_id}_{style.value}_{expression.value}_{pose.value}_{lighting.value}"
        return hashlib.md5(key_str.encode()).hexdigest()[:12]

    def _check_cache(self, cache_key: str) -> Optional[str]:
        """Check if variation is cached"""
        cache_file = self.cache_dir / f"{cache_key}.json"
        if cache_file.exists():
            try:
                with open(cache_file, "r") as f:
                    data = json.load(f)
                    return data.get("image_base64")
            except Exception as e:
                logger.error(f"Failed to read cache: {e}")
        return None

    def _save_to_cache(self, cache_key: str, image_base64: str):
        """Save variation to cache"""
        cache_file = self.cache_dir / f"{cache_key}.json"
        try:
            with open(cache_file, "w") as f:
                json.dump(
                    {
                        "cache_key": cache_key,
                        "image_base64": image_base64,
                        "timestamp": str(
                            os.path.getmtime(cache_file) if cache_file.exists() else 0
                        ),
                    },
                    f,
                )
        except Exception as e:
            logger.error(f"Failed to save cache: {e}")

    def _save_image(self, image_base64: str, filepath: str):
        """Save base64 image to file"""
        try:
            image_data = base64.b64decode(image_base64)
            with open(filepath, "wb") as f:
                f.write(image_data)
        except Exception as e:
            logger.error(f"Failed to save image: {e}")

    def _generate_character_sheet(
        self, variations: List[GeneratedVariation], character_id: str
    ) -> Optional[str]:
        """
        Generate a character sheet with multiple variations.

        This creates a grid layout of all variations.
        """
        try:
            # This would typically use PIL to create a grid
            # Placeholder for actual implementation
            return None
        except Exception as e:
            logger.error(f"Failed to generate character sheet: {e}")
            return None

    def get_available_styles(self) -> List[Dict[str, str]]:
        """Get list of available artistic styles"""
        return [
            {
                "id": style.value,
                "name": style.name.replace("_", " ").title(),
                "description": self.prompt_builder.STYLE_TEMPLATES.get(style, {}).get(
                    "base", ""
                ),
            }
            for style in ArtisticStyle
        ]

    def get_available_expressions(self) -> List[Dict[str, str]]:
        """Get list of available expressions"""
        return [
            {
                "id": expr.value,
                "name": expr.name.replace("_", " ").title(),
                "description": self.prompt_builder.EXPRESSION_DESCRIPTIONS.get(
                    expr, ""
                ),
            }
            for expr in ExpressionType
        ]

    def get_available_poses(self) -> List[Dict[str, str]]:
        """Get list of available poses"""
        return [
            {
                "id": pose.value,
                "name": pose.name.replace("_", " ").title(),
                "description": self.prompt_builder.POSE_DESCRIPTIONS.get(pose, ""),
            }
            for pose in PoseType
        ]

    def get_available_lighting(self) -> List[Dict[str, str]]:
        """Get list of available lighting options"""
        return [
            {
                "id": light.value,
                "name": light.name.replace("_", " ").title(),
                "description": self.prompt_builder.LIGHTING_DESCRIPTIONS.get(light, ""),
            }
            for light in LightingType
        ]

    def generate_prompts_only(
        self,
        character_description: str,
        style: ArtisticStyle = ArtisticStyle.REALISTIC,
        expression: ExpressionType = ExpressionType.NEUTRAL,
        pose: PoseType = PoseType.FRONT_VIEW,
        lighting: LightingType = LightingType.NATURAL,
    ) -> Dict[str, str]:
        """
        Generate prompts without actual image generation.

        Useful for:
        - Preview prompts before generation
        - Manual generation with external tools
        - Prompt engineering
        """
        config = StylePromptConfig(
            style=style, expression=expression, pose=pose, lighting=lighting
        )

        positive, negative = self.prompt_builder.build_prompt(
            config=config, character_description=character_description
        )

        return {
            "positive_prompt": positive,
            "negative_prompt": negative,
            "style": style.value,
            "expression": expression.value,
            "pose": pose.value,
            "lighting": lighting.value,
        }


# Singleton instance
_variation_generator: Optional[CharacterVariationGenerator] = None


def get_variation_generator(
    config: Optional[CharacterVariationConfig] = None, output_dir: Optional[str] = None
) -> CharacterVariationGenerator:
    """Get singleton instance of variation generator"""
    global _variation_generator
    if _variation_generator is None:
        _variation_generator = CharacterVariationGenerator(config, output_dir)
    return _variation_generator
