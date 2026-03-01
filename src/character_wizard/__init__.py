"""
Character Wizard Module

This module provides services for character creation from images:
- Face extraction for face swapping
- Vision-based character analysis
- Style integration with project genre

Usage:
    from src.character_wizard import (
        ImageToCharacterService,
        VisionCharacterAnalyzer,
        FaceExtractionService,
        get_image_to_character_service
    )
    
    # Create character from image
    service = get_image_to_character_service()
    result = await service.create_character_from_image("path/to/image.jpg")
"""

from .face_extraction_service import (
    FaceExtractionService,
    FaceExtractionConfig,
    ExtractedFace,
    FacialLandmarks,
    FaceAngle,
    FaceExpression,
    get_face_extraction_service
)

from .vision_character_analyzer import (
    VisionCharacterAnalyzer,
    VisionAnalyzerConfig,
    CharacterAnalysisResult,
    PhysicalAttributes,
    VisionProvider,
    get_vision_analyzer
)

from .image_to_character_service import (
    ImageToCharacterService,
    CharacterCreationConfig,
    CharacterCreationMode,
    ImageCharacterResult,
    get_image_to_character_service
)

from .face_swap_workflow import (
    FaceSwapWorkflow,
    FaceSwapConfig,
    FaceSwapMethod,
    StyleTransferMode,
    CharacterVariation,
    FaceSwapResult,
    get_face_swap_workflow
)

from .character_variation_generator import (
    CharacterVariationGenerator,
    CharacterVariationConfig,
    StylePromptConfig,
    GeneratedVariation,
    VariationGenerationResult,
    ArtisticStyle,
    ExpressionType,
    PoseType,
    LightingType,
    StylePromptBuilder,
    get_variation_generator
)


__all__ = [
    # Face Extraction
    "FaceExtractionService",
    "FaceExtractionConfig",
    "ExtractedFace",
    "FacialLandmarks",
    "FaceAngle",
    "FaceExpression",
    "get_face_extraction_service",
    
    # Vision Analysis
    "VisionCharacterAnalyzer",
    "VisionAnalyzerConfig",
    "CharacterAnalysisResult",
    "PhysicalAttributes",
    "VisionProvider",
    "get_vision_analyzer",
    
    # Image to Character
    "ImageToCharacterService",
    "CharacterCreationConfig",
    "CharacterCreationMode",
    "ImageCharacterResult",
    "get_image_to_character_service",
    
    # Face Swap Workflow
    "FaceSwapWorkflow",
    "FaceSwapConfig",
    "FaceSwapMethod",
    "StyleTransferMode",
    "CharacterVariation",
    "FaceSwapResult",
    "get_face_swap_workflow",
    
    # Character Variation Generator
    "CharacterVariationGenerator",
    "CharacterVariationConfig",
    "StylePromptConfig",
    "GeneratedVariation",
    "VariationGenerationResult",
    "ArtisticStyle",
    "ExpressionType",
    "PoseType",
    "LightingType",
    "StylePromptBuilder",
    "get_variation_generator"
]
