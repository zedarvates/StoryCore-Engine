"""
Methodology Switcher - Central Routing for Multi-Method Character Creation.
This component orchestrates the different creation pipelines (Narrative, 2D, 3D, etc.)
and ensures data consistency via Character Core Data (CCD).
"""

import logging
from typing import Dict, Any, Optional, List
from src.models.character_ccd import CharacterCoreData, CreationMethod, ArtStyle
from src.character_wizard.auto_character_generator import AutoCharacterGenerator
from src.character_wizard.visual_generator import VisualGenerator
from src.character_wizard.voice_generator import VoiceGenerator
from src.character_wizard.artistic_locks import ArtisticLockManager
from src.character_wizard.image_to_character_service import (
    get_image_to_character_service,
)


class MethodologySwitcher:
    """
    Routage intelligent entre les différentes méthodologies de création.
    Permet de passer d'un pipeline à l'autre sans perte de données.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.logger = logging.getLogger(__name__)
        self.config = config or {}

        # Initialize specialized generators
        self.auto_generator = AutoCharacterGenerator()
        self.visual_generator = VisualGenerator()
        self.voice_generator = VoiceGenerator()
        self.image_service = get_image_to_character_service()

        # Registry of specialized pipelines
        self.pipelines = {
            CreationMethod.NARRATIVE_FIRST: self._pipeline_narrative_first,
            CreationMethod.TWO_D_FIRST: self._pipeline_2d_first,
            CreationMethod.THREE_D_ASSETS: self._pipeline_3d_assets,
            CreationMethod.VISION_FIRST: self._pipeline_vision_first,
            CreationMethod.STYLIZED_FIRST: self._pipeline_stylized_first,
        }

    async def execute_pipeline(self, ccd: CharacterCoreData) -> CharacterCoreData:
        """Exécute le pipeline correspondant à la méthode choisie dans le CCD."""
        method = ccd.creation_method
        pipeline_func = self.pipelines.get(method)

        # 0. Apply Locks (Resolution)
        ArtisticLockManager(ccd.artistic_locks)
        self.logger.info(
            f"Checking for {len(ccd.artistic_locks)} artistic locks before methodology shift."
        )

        if not pipeline_func:
            self.logger.warning(
                f"No pipeline found for method {method}, falling back to Narrative-First"
            )
            pipeline_func = self._pipeline_narrative_first

        self.logger.info(f"Starting {method.value} pipeline for character: {ccd.name}")
        return await pipeline_func(ccd)

    async def _pipeline_narrative_first(
        self, ccd: CharacterCoreData
    ) -> CharacterCoreData:
        """
        Pipeline 1: Narrative-First (Classic Wizard)
        Focus: Personality and Backstory define the Visuals.
        """
        self.logger.info("Pipeline: Logic-First (Narrative defines visuals)")

        # 1. Expand personality if empty using LLM (Simulated)
        if not ccd.narrative.personality_traits:
            ccd.narrative.personality_traits = ["heroic", "determined", "resilient"]

        # 2. Generate Visual Profile based on Narrative (Prompt engineering)
        # Using existing AI Character Engine logic...

        # 3. Finalize Voice based on Narrative
        # ...

        return ccd

    async def _pipeline_2d_first(self, ccd: CharacterCoreData) -> CharacterCoreData:
        """
        Pipeline 2: 2D-First (Sketch to Life)
        Focus: Visual style (Anime/Manga) defines the character.
        """
        self.logger.info("Pipeline: Anime/Manga First (2D Sketch Focus)")
        ccd.visual.art_style = ArtStyle.ANIME

        # 1. Si on a une image de référence (Capture), on l'analyse
        if ccd.visual.reference_images:
            image_path = ccd.visual.reference_images[0]
            self.logger.info(f"Analyzing 2D sketch/reference: {image_path}")

            # Analyse via ImageToCharacterService
            result = await self.image_service.create_character_from_image(image_path)

            if result.success:
                # On enrichit le CCD existant avec les nouvelles données
                new_ccd = self.image_service.generate_ccd_v2(result, name=ccd.name)
                ccd.visual.physical_description = new_ccd.visual.physical_description
                ccd.artistic_locks.extend(new_ccd.artistic_locks)
                self.logger.info(
                    "Successfully analyzed 2D input and populated Artistic Locks."
                )

        # 2. Logic for Sketch-to-Image refinement via ComfyUI (Place-holder)
        # return await self._refine_composition_2d(ccd)

        return ccd

    async def _pipeline_3d_assets(self, ccd: CharacterCoreData) -> CharacterCoreData:
        """
        Pipeline 3: 3D Assets (Production-Ready)
        Focus: Integration with existing 3D models (Blender/CC4).
        """
        self.logger.info("Pipeline: 3D Production (Blender/CC4 Integration)")
        # ...
        return ccd

    async def _pipeline_vision_first(self, ccd: CharacterCoreData) -> CharacterCoreData:
        """
        Pipeline 4: Vision-First (Artistic Lock)
        Focus: Define global aesthetic and mood before details.
        """
        self.logger.info("Pipeline: Artistic Vision (Moodboard & Global Aesthetic)")
        # ...
        return ccd

    async def _pipeline_stylized_first(
        self, ccd: CharacterCoreData
    ) -> CharacterCoreData:
        """
        Pipeline 5: Stylized-First (NPR)
        Focus: Cel-shading and Graphic styles.
        """
        self.logger.info("Pipeline: Stylized NPR (Cel-shading/Graphic)")
        # ...
        return ccd

    def get_supported_methods(self) -> List[str]:
        return [method.value for method in CreationMethod]
