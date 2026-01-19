"""
Visual Identity Generation Module

This module handles the generation of visual appearance specifications for characters.
"""

import random
from .models import AutoGenerationParams, VisualIdentity, ColorPalette
from .archetypes import CharacterArchetype


class VisualGenerator:
    """Handles visual identity generation for characters"""

    def __init__(self):
        """Initialize the visual generator"""
        self.visual_templates = self._load_visual_templates()

    def generate_visual_identity(self, params: AutoGenerationParams, archetype: CharacterArchetype) -> VisualIdentity:
        """Generate visual appearance specifications"""
        visual = VisualIdentity()

        # Get visual template for genre
        template_key = f"{params.genre}_{archetype.role.value}"
        if template_key not in self.visual_templates:
            template_key = params.genre
        if template_key not in self.visual_templates:
            template_key = "default"

        template = self.visual_templates[template_key]

        # Generate basic appearance
        visual.age_range = params.age_range
        visual.art_style = params.style_preferences.get("art_style", "realistic")
        visual.quality_level = "high"

        # Generate physical features
        visual.hair_color = random.choice(template["hair_colors"])
        visual.hair_style = random.choice(template["hair_styles"])
        visual.eye_color = random.choice(template["eye_colors"])
        visual.skin_tone = random.choice(template["skin_tones"])
        visual.build = random.choice(template["builds"])

        # Generate clothing style
        visual.clothing_style = random.choice(template["clothing_styles"])
        visual.aesthetic = template["aesthetic"]

        # Generate color palette
        visual.color_palette = self._generate_color_palette(template, archetype)

        # Add distinctive features based on archetype
        visual.distinctive_features = self._generate_distinctive_features(archetype, template)

        return visual

    def _generate_color_palette(self, template: dict, archetype: CharacterArchetype) -> ColorPalette:
        """Generate color palette based on template and archetype"""
        from .archetypes import ArchetypeRole

        palette = ColorPalette()

        # Define color schemes by archetype
        color_schemes = {
            ArchetypeRole.HERO: {
                "primary": ["#4A90E2", "#7ED321", "#F5A623"],  # Blue, green, gold
                "secondary": ["#FFFFFF", "#50E3C2", "#B8E986"],
                "harmony": "triadic"
            },
            ArchetypeRole.VILLAIN: {
                "primary": ["#D0021B", "#9013FE", "#000000"],  # Red, purple, black
                "secondary": ["#BD10E0", "#4A4A4A", "#7F8C8D"],
                "harmony": "monochromatic"
            },
            ArchetypeRole.MENTOR: {
                "primary": ["#8B572A", "#F8E71C", "#417505"],  # Brown, gold, green
                "secondary": ["#D4AF37", "#CD853F", "#228B22"],
                "harmony": "analogous"
            }
        }

        scheme = color_schemes.get(archetype.role, color_schemes[ArchetypeRole.HERO])
        palette.primary_colors = scheme["primary"]
        palette.secondary_colors = scheme["secondary"]
        palette.color_harmony = scheme["harmony"]

        return palette

    def _generate_distinctive_features(self, archetype: CharacterArchetype, template: dict) -> list[str]:
        """Generate distinctive features based on archetype"""
        from .archetypes import ArchetypeRole

        features = []

        if archetype.role == ArchetypeRole.HERO:
            features.extend(["determined expression", "confident posture", "kind eyes"])
        elif archetype.role == ArchetypeRole.VILLAIN:
            features.extend(["piercing gaze", "commanding presence", "subtle smirk"])
        elif archetype.role == ArchetypeRole.MENTOR:
            features.extend(["wise eyes", "weathered hands", "gentle smile"])

        # Add 1-2 random distinctive features
        additional_features = ["scar", "birthmark", "unique jewelry", "distinctive clothing", "unusual eye color"]
        features.extend(random.sample(additional_features, random.randint(1, 2)))

        return features[:4]  # Limit to 4 features

    def _load_visual_templates(self) -> dict[str, dict[str, list[str]]]:
        """Load visual appearance templates for different genres"""
        return {
            "fantasy": {
                "hair_colors": ["golden blonde", "auburn", "raven black", "silver", "copper", "chestnut brown"],
                "hair_styles": ["long flowing", "braided", "wild", "elegant updo", "warrior knot", "loose waves"],
                "eye_colors": ["emerald green", "sapphire blue", "amber", "violet", "silver", "deep brown"],
                "skin_tones": ["fair", "olive", "bronze", "pale", "sun-kissed", "dark"],
                "builds": ["athletic", "slender", "muscular", "graceful", "sturdy", "lithe"],
                "clothing_styles": ["medieval robes", "leather armor", "noble attire", "ranger gear", "mystical garments"],
                "aesthetic": "fantasy medieval"
            },
            "sci-fi": {
                "hair_colors": ["platinum", "electric blue", "silver", "black", "white", "neon green"],
                "hair_styles": ["sleek", "geometric cut", "shaved sides", "futuristic", "cyberpunk", "minimalist"],
                "eye_colors": ["ice blue", "silver", "violet", "amber", "green", "augmented"],
                "skin_tones": ["pale", "olive", "dark", "augmented", "synthetic", "natural"],
                "builds": ["lean", "augmented", "athletic", "cybernetic", "enhanced", "natural"],
                "clothing_styles": ["tech suit", "military uniform", "civilian clothes", "space gear", "cyberpunk fashion"],
                "aesthetic": "futuristic technological"
            },
            "modern": {
                "hair_colors": ["blonde", "brown", "black", "red", "gray", "dyed"],
                "hair_styles": ["short", "medium", "long", "curly", "straight", "styled", "casual"],
                "eye_colors": ["blue", "brown", "green", "hazel", "gray", "amber"],
                "skin_tones": ["fair", "medium", "olive", "dark", "tan", "pale"],
                "builds": ["average", "athletic", "slim", "muscular", "curvy", "tall"],
                "clothing_styles": ["casual", "business", "formal", "street", "trendy", "classic"],
                "aesthetic": "contemporary realistic"
            },
            "default": {
                "hair_colors": ["brown", "blonde", "black", "red"],
                "hair_styles": ["short", "medium", "long", "curly"],
                "eye_colors": ["brown", "blue", "green", "hazel"],
                "skin_tones": ["fair", "medium", "olive", "dark"],
                "builds": ["average", "athletic", "slim", "tall"],
                "clothing_styles": ["casual", "formal", "trendy", "classic"],
                "aesthetic": "realistic"
            }
        }