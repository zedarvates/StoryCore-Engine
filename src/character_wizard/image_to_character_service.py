"""
Image to Character Service - Complete Character Creation from Images.

This module orchestrates:
- Face extraction for face swapping
- Vision model analysis for character description
- Style integration with project genre
- Character generation with physical attributes

Requirements: Character Creation Enhancement from User Images
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union
from src.models.character_ccd import (
    CharacterCoreData,
    VisualProfile,
    NarrativeProfile,
    VoiceProfile,
    ArtStyle,
    CreationMethod,
    ArtisticLock,
    LockingStrength,
)

import numpy as np

# Import local modules
from .face_extraction_service import (
    FaceExtractionConfig,
    ExtractedFace,
    FaceAngle,
    FaceExpression,
    get_face_extraction_service,
)
from .vision_character_analyzer import (
    VisionAnalyzerConfig,
    CharacterAnalysisResult,
    PhysicalAttributes,
    VisionProvider,
    get_vision_analyzer,
)

# Try to import image processing libraries
try:
    from PIL import Image

    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

# Configure logging
logger = logging.getLogger(__name__)


class CharacterCreationMode(str, Enum):
    """Character creation mode from image"""

    FACE_SWAP = "face_swap"  # Extract face for face swapping
    FULL_DESCRIPTION = "full_description"  # Generate full character description
    HYBRID = "hybrid"  # Both face extraction and description
    STYLE_TRANSFER = "style_transfer"  # Apply style to extracted character


@dataclass
class CharacterCreationConfig:
    """Configuration for image-to-character creation"""

    mode: CharacterCreationMode = CharacterCreationMode.HYBRID

    # Face extraction settings
    extract_face: bool = True
    face_output_size: Tuple[int, int] = (512, 512)
    align_face: bool = True

    # Vision analysis settings
    analyze_image: bool = True
    vision_provider: VisionProvider = VisionProvider.AUTO

    # Style integration
    genre: Optional[str] = None
    visual_style: Optional[str] = None
    apply_genre_adaptations: bool = True

    # User hints
    target_gender: Optional[str] = None
    target_age: Optional[str] = None
    target_ethnicity: Optional[str] = None

    # Output settings
    save_extracted_face: bool = True
    output_directory: Optional[str] = None


@dataclass
class ImageCharacterResult:
    """Result of image-to-character creation"""

    success: bool

    # Extracted face data
    face_extracted: bool = False
    face_image: Optional[np.ndarray] = None
    face_image_base64: Optional[str] = None
    face_embedding: Optional[np.ndarray] = None
    face_angle: FaceAngle = FaceAngle.UNKNOWN
    face_expression: FaceExpression = FaceExpression.UNKNOWN
    face_confidence: float = 0.0

    # Character description
    description: Optional[str] = None
    short_description: Optional[str] = None
    physical_attributes: Optional[PhysicalAttributes] = None
    suggested_name: Optional[str] = None
    suggested_personality: List[str] = field(default_factory=list)
    suggested_role: Optional[str] = None

    # Style adaptations
    style_adaptations: Dict[str, str] = field(default_factory=dict)

    # Generation prompts
    portrait_prompt: Optional[str] = None
    full_body_prompt: Optional[str] = None

    # Metadata
    confidence: float = 0.0
    processing_time_ms: int = 0
    error_message: Optional[str] = None


class ImageToCharacterService:
    """
    Main service for creating characters from images.

    Orchestrates:
    1. Face extraction for face swapping workflows
    2. Vision model analysis for character description
    3. Style integration with project genre
    4. Prompt generation for character generation
    """

    def __init__(self, config: Optional[CharacterCreationConfig] = None):
        """Initialize the image-to-character service"""
        self.config = config or CharacterCreationConfig()

        # Initialize sub-services
        face_config = FaceExtractionConfig(
            output_size=self.config.face_output_size, align_face=self.config.align_face
        )
        self._face_service = get_face_extraction_service(face_config)

        vision_config = VisionAnalyzerConfig(provider=self.config.vision_provider)
        self._vision_analyzer = get_vision_analyzer(vision_config)

        logger.info("Image to Character service initialized")

    async def create_character_from_image(
        self,
        image: Union[np.ndarray, str, Path, "Image.Image"],
        name: Optional[str] = None,
        role: Optional[str] = None,
        additional_context: Optional[str] = None,
        target_gender: Optional[str] = None,
        target_age: Optional[str] = None,
        target_ethnicity: Optional[str] = None,
    ) -> ImageCharacterResult:
        """
        Create a character from an image.

        Args:
            image: Input image (file path, numpy array, or PIL Image)
            name: Optional character name (overrides suggestion)
            role: Optional character role (overrides suggestion)
            additional_context: Additional context for analysis
            target_gender: Optional gender hint (user-provided)
            target_age: Optional age range hint (user-provided)

        Returns:
            ImageCharacterResult with all extracted/generated data
        """
        start_time = datetime.now()

        try:
            # Convert image to numpy array if needed
            image_array = self._to_numpy_array(image)
            if image_array is None:
                return ImageCharacterResult(
                    success=False, error_message="Failed to load image"
                )

            # Run face extraction and vision analysis in parallel
            tasks = []

            if self.config.extract_face:
                tasks.append(self._extract_face_task(image_array))

            if self.config.analyze_image:
                tasks.append(
                    self._analyze_image_task(
                        image_array,
                        additional_context,
                        target_gender or self.config.target_gender,
                        target_age or self.config.target_age,
                        target_ethnicity or self.config.target_ethnicity,
                    )
                )

            # Execute tasks
            face_result = None
            analysis_result = None

            if tasks:
                results = await asyncio.gather(*tasks, return_exceptions=True)

                result_idx = 0
                if self.config.extract_face:
                    face_result = results[result_idx]
                    if isinstance(face_result, Exception):
                        logger.error(f"Face extraction failed: {face_result}")
                        face_result = None
                    result_idx += 1

                if self.config.analyze_image:
                    analysis_result = results[result_idx]
                    if isinstance(analysis_result, Exception):
                        logger.error(f"Image analysis failed: {analysis_result}")
                        analysis_result = None

            # Build result
            result = ImageCharacterResult(success=True, confidence=0.0)

            # Process face extraction result
            if face_result and isinstance(face_result, ExtractedFace):
                result.face_extracted = face_result.success
                result.face_image = face_result.face_image
                result.face_embedding = face_result.face_embedding
                result.face_angle = face_result.angle
                result.face_expression = face_result.expression
                result.face_confidence = face_result.confidence

                if face_result.success:
                    # Convert to base64
                    result.face_image_base64 = self._face_service.face_to_base64(
                        face_result
                    )

                    # Save if configured
                    if self.config.save_extracted_face and self.config.output_directory:
                        output_path = (
                            Path(self.config.output_directory) / "extracted_face.png"
                        )
                        self._face_service.save_face_image(face_result, output_path)

            # Process vision analysis result
            if analysis_result and isinstance(analysis_result, CharacterAnalysisResult):
                result.description = analysis_result.description
                result.short_description = analysis_result.short_description
                result.physical_attributes = analysis_result.physical_attributes
                result.suggested_name = analysis_result.suggested_name
                result.suggested_personality = analysis_result.suggested_personality
                result.suggested_role = analysis_result.suggested_role
                result.style_adaptations = analysis_result.style_adaptations

            # Override with provided values
            if name:
                result.suggested_name = name
            if role:
                result.suggested_role = role

            # Generate prompts for character generation
            result.portrait_prompt = self._generate_portrait_prompt(result)
            result.full_body_prompt = self._generate_full_body_prompt(result)

            # Calculate overall confidence
            result.confidence = self._calculate_confidence(face_result, analysis_result)

            # Calculate processing time
            processing_time = (datetime.now() - start_time).total_seconds() * 1000
            result.processing_time_ms = int(processing_time)

            return result

        except Exception as e:
            logger.error(f"Character creation from image failed: {e}")
            return ImageCharacterResult(
                success=False,
                error_message=str(e),
                processing_time_ms=int(
                    (datetime.now() - start_time).total_seconds() * 1000
                ),
            )

    async def _extract_face_task(self, image: np.ndarray) -> ExtractedFace:
        """Async task for face extraction"""
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._face_service.extract_face, image)

    async def _analyze_image_task(
        self,
        image: np.ndarray,
        additional_context: Optional[str],
        target_gender: Optional[str] = None,
        target_age: Optional[str] = None,
        target_ethnicity: Optional[str] = None,
    ) -> CharacterAnalysisResult:
        """Async task for vision analysis"""
        return await self._vision_analyzer.analyze_image(
            image,
            genre=self.config.genre,
            style=self.config.visual_style,
            additional_context=additional_context,
            target_gender=target_gender,
            target_age=target_age,
            target_ethnicity=target_ethnicity,
        )

    def _to_numpy_array(
        self, image: Union[np.ndarray, str, Path, "Image.Image"]
    ) -> Optional[np.ndarray]:
        """Convert input to numpy array"""
        try:
            if isinstance(image, np.ndarray):
                return image

            if isinstance(image, (str, Path)):
                if PIL_AVAILABLE:
                    img = Image.open(image)
                    return np.array(img)
                else:
                    import cv2

                    return cv2.imread(str(image))

            if PIL_AVAILABLE and isinstance(image, Image.Image):
                return np.array(image)

        except Exception as e:
            logger.error(f"Failed to convert image: {e}")

        return None

    def _generate_portrait_prompt(self, result: ImageCharacterResult) -> str:
        """Generate a prompt for portrait generation"""
        parts = []

        # Add style prefix
        if self.config.visual_style:
            style_map = {
                "photorealistic": "photorealistic portrait",
                "cinematic": "cinematic portrait",
                "anime": "anime style portrait",
                "cartoon": "cartoon style portrait",
                "realistic": "realistic portrait",
            }
            parts.append(
                style_map.get(
                    self.config.visual_style.lower(),
                    f"{self.config.visual_style} portrait",
                )
            )
        else:
            parts.append("portrait")

        # Add description
        if result.short_description:
            parts.append(f"of {result.short_description}")

        # Add physical attributes
        if result.physical_attributes:
            attrs = result.physical_attributes

            if attrs.hair_color and attrs.hair_style:
                parts.append(f"{attrs.hair_color} {attrs.hair_style} hair")
            elif attrs.hair_color:
                parts.append(f"{attrs.hair_color} hair")

            if attrs.eye_color:
                parts.append(f"{attrs.eye_color} eyes")

            if attrs.skin_tone:
                parts.append(f"{attrs.skin_tone} skin")

            if attrs.facial_hair and attrs.facial_hair != "none":
                parts.append(attrs.facial_hair)

            if attrs.glasses and attrs.glasses != "none":
                parts.append(f"wearing {attrs.glasses}")

            if attrs.expression:
                parts.append(f"{attrs.expression} expression")

        # Add style adaptations
        if self.config.apply_genre_adaptations and result.style_adaptations:
            if "art_style" in result.style_adaptations:
                parts.append(result.style_adaptations["art_style"])

        # Add quality tags
        parts.extend(
            [
                "highly detailed",
                "professional portrait",
                "centered composition",
                "sharp focus",
                "8K quality",
            ]
        )

        return ", ".join(parts)

    def _generate_full_body_prompt(self, result: ImageCharacterResult) -> str:
        """Generate a prompt for full body generation"""
        parts = []

        # Add style prefix
        if self.config.visual_style:
            parts.append(self.config.visual_style)

        # Add description
        if result.short_description:
            parts.append(f"full body shot of {result.short_description}")
        else:
            parts.append("character full body shot")

        # Add physical attributes
        if result.physical_attributes:
            attrs = result.physical_attributes

            if attrs.body_type:
                parts.append(f"{attrs.body_type} build")

            if attrs.clothing_style:
                parts.append(f"wearing {attrs.clothing_style} clothing")

            if attrs.clothing_colors:
                parts.append(f"in {', '.join(attrs.clothing_colors)} colors")

            if attrs.accessories:
                parts.append(f"with {', '.join(attrs.accessories[:3])}")

        # Add style adaptations for clothing
        if self.config.apply_genre_adaptations and result.style_adaptations:
            if "clothing" in result.style_adaptations:
                parts.append(
                    f"genre-adapted attire: {result.style_adaptations['clothing']}"
                )

        # Add quality tags
        parts.extend(
            [
                "highly detailed",
                "dynamic pose",
                "full body visible",
                "professional photography",
                "8K quality",
            ]
        )

        return ", ".join(parts)

    def _calculate_confidence(
        self,
        face_result: Optional[ExtractedFace],
        analysis_result: Optional[CharacterAnalysisResult],
    ) -> float:
        """Calculate overall confidence score"""
        scores = []

        if face_result:
            scores.append(face_result.confidence)

        if analysis_result:
            scores.append(analysis_result.confidence)

        if not scores:
            return 0.0

        return sum(scores) / len(scores)

    def generate_character_data(
        self, result: ImageCharacterResult, character_id: str
    ) -> Dict[str, Any]:
        """
        Generate character data structure for storage/use.

        Args:
            result: Image character result
            character_id: Unique character ID

        Returns:
            Character data dictionary
        """
        if not result.success:
            return {"error": result.error_message}

        character_data = {
            "character_id": character_id,
            "name": result.suggested_name or "Unnamed Character",
            "role": result.suggested_role or "character",
            "description": result.description or "",
            "visual_description": result.short_description or "",
            "personality_traits": result.suggested_personality or [],
            "face_extracted": result.face_extracted,
            "face_image_base64": result.face_image_base64,
            "portrait_prompt": result.portrait_prompt,
            "full_body_prompt": result.full_body_prompt,
            "confidence": result.confidence,
            "created_from_image": True,
            "creation_metadata": {
                "face_angle": result.face_angle.value if result.face_angle else None,
                "face_expression": result.face_expression.value
                if result.face_expression
                else None,
                "processing_time_ms": result.processing_time_ms,
            },
        }

        # Add physical attributes
        if result.physical_attributes:
            attrs = result.physical_attributes
            character_data["visual_identity"] = {
                "gender": attrs.gender,
                "age_range": attrs.age_range,
                "face_shape": attrs.face_shape,
                "eye_color": attrs.eye_color,
                "eye_shape": attrs.eye_shape,
                "hair_color": attrs.hair_color,
                "hair_style": attrs.hair_style,
                "hair_length": attrs.hair_length,
                "skin_tone": attrs.skin_tone,
                "body_type": attrs.body_type,
                "facial_hair": attrs.facial_hair,
                "glasses": attrs.glasses,
                "accessories": attrs.accessories,
                "distinctive_features": attrs.distinctive_features,
                "clothing_style": attrs.clothing_style,
                "clothing_colors": attrs.clothing_colors,
            }

        # Add style adaptations
        if result.style_adaptations:
            character_data["style_adaptations"] = result.style_adaptations

        return character_data

    def generate_comfyui_workflow_input(
        self, result: ImageCharacterResult
    ) -> Dict[str, Any]:
        """
        Generate input data for ComfyUI face swap workflow.

        Args:
            result: Image character result

        Returns:
            ComfyUI workflow input data
        """
        if not result.face_extracted or not result.face_image_base64:
            return {"error": "No face extracted"}

        return {
            "face_image": result.face_image_base64,
            "face_embedding": result.face_embedding.tolist()
            if result.face_embedding is not None
            else None,
            "portrait_prompt": result.portrait_prompt,
            "full_body_prompt": result.full_body_prompt,
            "face_angle": result.face_angle.value,
            "face_expression": result.face_expression.value,
            "style_adaptations": result.style_adaptations,
        }

    def generate_ccd_v2(
        self, result: ImageCharacterResult, name: Optional[str] = None
    ) -> CharacterCoreData:
        """
        Génère un objet CharacterCoreData (CCD v2) à partir du résultat d'analyse d'image.
        """
        if not result.success:
            raise ValueError(
                f"Cannot generate CCD from failed image result: {result.error_message}"
            )

        # Mapping des styles
        art_style = ArtStyle.REALISTIC
        if self.config.visual_style == "anime":
            art_style = ArtStyle.ANIME
        elif self.config.visual_style == "stylized":
            art_style = ArtStyle.STYLIZED

        # Mapping des attributs physiques
        visual = VisualProfile(
            art_style=art_style,
            physical_description=result.short_description or result.description or "",
            main_colors=result.physical_attributes.clothing_colors
            if result.physical_attributes
            else [],
        )

        # Mapping narratif
        narrative = NarrativeProfile(
            personality_traits=result.suggested_personality,
            role=result.suggested_role or "Protagonist",
        )

        # Création du CCD
        ccd = CharacterCoreData(
            name=name or result.suggested_name or "New Character",
            creation_method=CreationMethod.VISION_FIRST,
            visual=visual,
            narrative=narrative,
            voice=VoiceProfile(),  # Default voice
        )

        # Génération automatique des Artistic Locks à partir de l'image
        if result.physical_attributes:
            attrs = result.physical_attributes
            if attrs.hair_color:
                ccd.artistic_locks.append(
                    ArtisticLock(
                        category="facial",
                        attribute="hair_color",
                        value=attrs.hair_color,
                        strength=LockingStrength.FIRM,
                    )
                )
            if attrs.eye_color:
                ccd.artistic_locks.append(
                    ArtisticLock(
                        category="facial",
                        attribute="eye_color",
                        value=attrs.eye_color,
                        strength=LockingStrength.FIRM,
                    )
                )

        return ccd


# Singleton instance
_image_to_character_service: Optional[ImageToCharacterService] = None


def get_image_to_character_service(
    config: Optional[CharacterCreationConfig] = None,
) -> ImageToCharacterService:
    """Get singleton instance of image-to-character service"""
    global _image_to_character_service
    if _image_to_character_service is None:
        _image_to_character_service = ImageToCharacterService(config)
    return _image_to_character_service
