"""
Prompt Enhancer - Automatic prompt enhancement for image generation.

Enhances raw text prompts with style, lighting, camera angle, mood,
and quality parameters to produce richer generation instructions.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Dict, Any


class PromptStyle(Enum):
    """Visual style presets for image generation."""
    CINEMATIC = "cinematic"             # Hollywood cinematic style
    ANIME = "anime"                     # Japanese animation style
    REALISTIC = "realistic"             # Photorealistic rendering
    COMIC = "comic"                     # Comic book / graphic novel
    PAINTERLY = "painterly"             # Oil/acrylic painting style
    SKETCH = "sketch"                   # Pencil sketch / line art
    WATERCOLOR = "watercolor"           # Watercolor illustration
    DIGITAL_ART = "digital_art"        # Modern digital artwork
    FANTASY = "fantasy"                 # High fantasy illustration
    SCI_FI = "sci_fi"                   # Science fiction aesthetic
    NOIR = "noir"                       # Dark, high-contrast noir
    VINTAGE = "vintage"                 # Retro / vintage aesthetic


class LightingType(Enum):
    """Lighting conditions for scene generation."""
    NATURAL = "natural"                 # Soft, natural daylight
    STUDIO = "studio"                   # Clean studio lighting
    CINEMATIC = "cinematic"             # Dramatic cinematic lighting
    DRAMATIC = "dramatic"               # High-contrast dramatic shadows
    GOLDEN_HOUR = "golden_hour"         # Warm sunset/sunrise tones
    BLUE_HOUR = "blue_hour"             # Cool twilight tones
    NIGHT = "night"                     # Night scene with artificial lights
    BACKLIT = "backlit"                 # Subject backlit, rim lighting
    NEON = "neon"                       # Neon / synthwave glow
    VOLUMETRIC = "volumetric"           # God rays, volumetric light


class CameraAngle(Enum):
    """Camera angles and perspectives."""
    EYE_LEVEL = "eye_level"             # Standard eye-level shot
    LOW_ANGLE = "low_angle"             # Looking up (heroic, imposing)
    HIGH_ANGLE = "high_angle"           # Looking down (vulnerable, overview)
    BIRDS_EYE = "birds_eye"             # Overhead aerial view
    WORMS_EYE = "worms_eye"             # Extreme low angle
    DUTCH_ANGLE = "dutch_angle"         # Tilted / canted angle (tension)
    OVER_SHOULDER = "over_shoulder"     # Behind character's shoulder
    CLOSE_UP = "close_up"               # Close-up on face/detail
    MEDIUM_SHOT = "medium_shot"         # Waist-up framing
    LONG_SHOT = "long_shot"             # Full body in environment
    EXTREME_WIDE = "extreme_wide"       # Very wide establishing shot
    POV = "pov"                         # Point of view (first person)


class MoodType(Enum):
    """Emotional mood and atmosphere."""
    NEUTRAL = "neutral"                 # No particular mood
    EPIC = "epic"                       # Grand, heroic atmosphere
    TENSE = "tense"                     # Suspense and tension
    MYSTERIOUS = "mysterious"           # Enigmatic, ambiguous mood
    ROMANTIC = "romantic"               # Warm, intimate feeling
    MELANCHOLIC = "melancholic"         # Sad, reflective tone
    JOYFUL = "joyful"                   # Happy, upbeat energy
    DARK = "dark"                       # Grim, foreboding atmosphere
    PEACEFUL = "peaceful"               # Calm, serene setting
    CHAOTIC = "chaotic"                 # Frantic, dynamic energy
    SURREAL = "surreal"                 # Dreamlike, surreal quality
    NOSTALGIC = "nostalgic"             # Wistful, nostalgic feeling


class QualityTier(Enum):
    """Output quality tiers for generation."""
    DRAFT = "draft"                     # Fast draft quality (low detail)
    STANDARD = "standard"               # Balanced quality
    HIGH = "high"                       # High detail, longer generation
    ULTRA = "ultra"                     # Maximum quality, slowest
    CINEMATIC = "cinematic"             # Cinema-grade quality


@dataclass
class EnhancedPrompt:
    """Result of prompt enhancement with all parameters."""
    original_prompt: str
    enhanced_prompt: str
    style: PromptStyle = PromptStyle.CINEMATIC
    lighting: LightingType = LightingType.NATURAL
    camera_angle: CameraAngle = CameraAngle.EYE_LEVEL
    mood: MoodType = MoodType.NEUTRAL
    quality: QualityTier = QualityTier.HIGH
    negative_prompt: str = ""
    enhancement_tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "original_prompt": self.original_prompt,
            "enhanced_prompt": self.enhanced_prompt,
            "style": self.style.value,
            "lighting": self.lighting.value,
            "camera_angle": self.camera_angle.value,
            "mood": self.mood.value,
            "quality": self.quality.value,
            "negative_prompt": self.negative_prompt,
            "enhancement_tags": self.enhancement_tags,
            "metadata": self.metadata,
        }


# ---------------------------------------------------------------------------
# Style → Keyword mappings
# ---------------------------------------------------------------------------

STYLE_KEYWORDS: Dict[PromptStyle, List[str]] = {
    PromptStyle.CINEMATIC:   ["cinematic", "film grain", "anamorphic lens", "depth of field"],
    PromptStyle.ANIME:       ["anime style", "cel shaded", "vibrant colors", "manga aesthetic"],
    PromptStyle.REALISTIC:   ["photorealistic", "ultra detailed", "8k", "hyperrealistic"],
    PromptStyle.COMIC:       ["comic book style", "bold lines", "flat colors", "halftone"],
    PromptStyle.PAINTERLY:   ["oil painting", "brush strokes", "impasto", "classical art"],
    PromptStyle.SKETCH:      ["pencil sketch", "line art", "hatching", "monochrome"],
    PromptStyle.WATERCOLOR:  ["watercolor", "soft edges", "bleeding colors", "paper texture"],
    PromptStyle.DIGITAL_ART: ["digital art", "concept art", "artstation", "smooth shading"],
    PromptStyle.FANTASY:     ["fantasy art", "magical", "ethereal", "mythological"],
    PromptStyle.SCI_FI:      ["science fiction", "futuristic", "cyberpunk", "neon lights"],
    PromptStyle.NOIR:        ["film noir", "high contrast", "shadows", "black and white"],
    PromptStyle.VINTAGE:     ["vintage", "retro", "faded colors", "aged photo"],
}

LIGHTING_KEYWORDS: Dict[LightingType, List[str]] = {
    LightingType.NATURAL:     ["soft natural light", "outdoor lighting"],
    LightingType.STUDIO:      ["studio lighting", "softbox", "even lighting"],
    LightingType.CINEMATIC:   ["cinematic lighting", "three-point lighting", "dramatic shadows"],
    LightingType.DRAMATIC:    ["dramatic lighting", "chiaroscuro", "hard shadows"],
    LightingType.GOLDEN_HOUR: ["golden hour", "warm light", "sunset glow"],
    LightingType.BLUE_HOUR:   ["blue hour", "twilight", "cool tones"],
    LightingType.NIGHT:       ["night lighting", "artificial light", "street lamps"],
    LightingType.BACKLIT:     ["backlit", "rim lighting", "silhouette effect"],
    LightingType.NEON:        ["neon lights", "cyberpunk glow", "LED lighting"],
    LightingType.VOLUMETRIC:  ["volumetric lighting", "god rays", "light shafts"],
}

QUALITY_SUFFIXES: Dict[QualityTier, str] = {
    QualityTier.DRAFT:    "draft quality",
    QualityTier.STANDARD: "detailed, high quality",
    QualityTier.HIGH:     "highly detailed, masterpiece, best quality",
    QualityTier.ULTRA:    "ultra detailed, 8k resolution, masterpiece, perfect",
    QualityTier.CINEMATIC: "cinematic masterpiece, award winning, professional photography",
}

NEGATIVE_PROMPTS: Dict[QualityTier, str] = {
    QualityTier.DRAFT:    "blurry",
    QualityTier.STANDARD: "blurry, low quality, watermark",
    QualityTier.HIGH:     "blurry, low quality, watermark, text, logo, bad anatomy",
    QualityTier.ULTRA:    (
        "blurry, low quality, watermark, text, logo, bad anatomy, deformed, "
        "extra limbs, disfigured, out of frame"
    ),
    QualityTier.CINEMATIC: (
        "blurry, low quality, watermark, text, logo, bad anatomy, deformed, "
        "amateur, snapshot, low resolution"
    ),
}


class PromptEnhancer:
    """
    Enhances raw image-generation prompts with style, lighting, camera,
    mood, and quality descriptors.

    Usage::

        enhancer = PromptEnhancer()
        result = enhancer.enhance(
            prompt="A warrior standing in ruins",
            style=PromptStyle.CINEMATIC,
            lighting=LightingType.DRAMATIC,
            camera_angle=CameraAngle.LOW_ANGLE,
            mood=MoodType.EPIC,
            quality=QualityTier.HIGH,
        )
        print(result.enhanced_prompt)
    """

    def enhance(
        self,
        prompt: str,
        style: PromptStyle = PromptStyle.CINEMATIC,
        lighting: LightingType = LightingType.NATURAL,
        camera_angle: CameraAngle = CameraAngle.EYE_LEVEL,
        mood: MoodType = MoodType.NEUTRAL,
        quality: QualityTier = QualityTier.HIGH,
        extra_tags: Optional[List[str]] = None,
    ) -> EnhancedPrompt:
        """
        Enhance a raw prompt with descriptive modifiers.

        Args:
            prompt:       Base prompt text describing the scene/subject.
            style:        Visual style preset.
            lighting:     Lighting condition.
            camera_angle: Camera perspective.
            mood:         Emotional atmosphere.
            quality:      Target quality tier.
            extra_tags:   Additional custom tags to include.

        Returns:
            EnhancedPrompt with the full enhanced prompt string and metadata.
        """
        parts: List[str] = [prompt.strip()]

        # Style keywords
        parts.extend(STYLE_KEYWORDS.get(style, []))

        # Lighting keywords
        parts.extend(LIGHTING_KEYWORDS.get(lighting, []))

        # Camera angle
        if camera_angle != CameraAngle.EYE_LEVEL:
            parts.append(camera_angle.value.replace("_", " "))

        # Mood (skip neutral)
        if mood != MoodType.NEUTRAL:
            parts.append(f"{mood.value} atmosphere")

        # Quality suffix
        quality_str = QUALITY_SUFFIXES.get(quality, "")
        if quality_str:
            parts.append(quality_str)

        # Extra tags
        if extra_tags:
            parts.extend(extra_tags)

        enhanced = ", ".join(p for p in parts if p)
        negative = NEGATIVE_PROMPTS.get(quality, "")

        return EnhancedPrompt(
            original_prompt=prompt,
            enhanced_prompt=enhanced,
            style=style,
            lighting=lighting,
            camera_angle=camera_angle,
            mood=mood,
            quality=quality,
            negative_prompt=negative,
            enhancement_tags=STYLE_KEYWORDS.get(style, []) + LIGHTING_KEYWORDS.get(lighting, []),
            metadata={
                "style": style.value,
                "lighting": lighting.value,
                "camera_angle": camera_angle.value,
                "mood": mood.value,
                "quality": quality.value,
            },
        )

    def batch_enhance(
        self,
        prompts: List[str],
        style: PromptStyle = PromptStyle.CINEMATIC,
        lighting: LightingType = LightingType.NATURAL,
        camera_angle: CameraAngle = CameraAngle.EYE_LEVEL,
        mood: MoodType = MoodType.NEUTRAL,
        quality: QualityTier = QualityTier.HIGH,
    ) -> List[EnhancedPrompt]:
        """Enhance a list of prompts with the same settings."""
        return [
            self.enhance(p, style=style, lighting=lighting,
                         camera_angle=camera_angle, mood=mood, quality=quality)
            for p in prompts
        ]

    def get_style_preview(self, style: PromptStyle) -> Dict[str, Any]:
        """Return a preview description for a style preset."""
        return {
            "style": style.value,
            "keywords": STYLE_KEYWORDS.get(style, []),
            "description": f"Generates images in {style.value.replace('_', ' ')} aesthetic.",
        }
