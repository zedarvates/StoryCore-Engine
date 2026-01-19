"""
Coherence Anchors Generation Module

This module creates coherence anchors for visual consistency.
"""

import random
from .models import VisualIdentity, CoherenceAnchors, ColorPalette


class CoherenceAnchorsGenerator:
    """Handles coherence anchors generation for visual consistency"""

    def generate_coherence_anchors(self, visual_identity: VisualIdentity) -> CoherenceAnchors:
        """Create coherence anchors for visual consistency"""
        anchors = CoherenceAnchors()

        # Generate character descriptor
        anchors.character_descriptor = self._create_character_descriptor(visual_identity)

        # Generate specific anchors
        anchors.facial_anchors = [
            f"{visual_identity.hair_color} {visual_identity.hair_style} hair",
            f"{visual_identity.eye_color} eyes",
            f"{visual_identity.skin_tone} skin",
            f"{visual_identity.facial_structure} face"
        ]

        anchors.clothing_anchors = [
            f"{visual_identity.clothing_style} clothing",
            f"{visual_identity.aesthetic} aesthetic"
        ]

        anchors.style_anchors = [
            f"{visual_identity.art_style} art style",
            f"{visual_identity.quality_level} quality",
            f"{visual_identity.rendering_style} rendering"
        ]

        # Set color specifications
        anchors.primary_colors = visual_identity.color_palette.primary_colors
        anchors.secondary_colors = visual_identity.color_palette.secondary_colors
        anchors.color_harmony = visual_identity.color_palette.color_harmony

        # Generate prompts
        anchors.positive_prompts = self._generate_positive_prompts(visual_identity)
        anchors.negative_prompts = self._generate_negative_prompts(visual_identity)

        # Set technical parameters
        anchors.style_strength = 0.8
        anchors.seed_base = random.randint(1000, 9999)
        anchors.cfg_scale = 7.5
        anchors.denoising_strength = 0.7

        return anchors

    def _create_character_descriptor(self, visual_identity: VisualIdentity) -> str:
        """Create main character descriptor"""
        return f"{visual_identity.age_range} {visual_identity.build} person with {visual_identity.hair_color} hair and {visual_identity.eye_color} eyes, {visual_identity.aesthetic} style"

    def _generate_positive_prompts(self, visual_identity: VisualIdentity) -> list[str]:
        """Generate positive prompts for image generation"""
        return [
            f"{visual_identity.art_style} art style",
            f"{visual_identity.quality_level} quality",
            "detailed character design",
            "consistent appearance",
            f"{visual_identity.aesthetic} aesthetic"
        ]

    def _generate_negative_prompts(self, visual_identity: VisualIdentity) -> list[str]:
        """Generate negative prompts for image generation"""
        return [
            "inconsistent appearance",
            "low quality",
            "blurry",
            "distorted features",
            "multiple characters"
        ]