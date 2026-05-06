"""
Recap Engine - Module initialization
"""

from .types import (
    RecapScene,
    RecapTimeline,
    RecapCharacterStyle,
    RecapState,
    RecapStyle,
    CameraMove,
    TransitionType,
    TTSProvider,
    RecapGenerationRequest,
    RecapGenerationResult,
    RecapRenderResult,
    RecapExportResult,
)
from .recap_pipeline import RecapPipeline
from .narrative_extractor import (
    NarrativeExtractor,
    ChapterContinuityPackage,
    ExtractedCharacter,
    ExtractedLocation,
    ExtractedObject,
    NarrativeArc,
    NarrativeMemory,
    ExtractionResult,
)

__all__ = [
    # Recap Engine core
    "RecapScene",
    "RecapTimeline",
    "RecapCharacterStyle",
    "RecapState",
    "RecapStyle",
    "CameraMove",
    "TransitionType",
    "TTSProvider",
    "RecapGenerationRequest",
    "RecapGenerationResult",
    "RecapRenderResult",
    "RecapExportResult",
    "RecapPipeline",
    # Narrative Extractor
    "NarrativeExtractor",
    "ChapterContinuityPackage",
    "ExtractedCharacter",
    "ExtractedLocation",
    "ExtractedObject",
    "NarrativeArc",
    "NarrativeMemory",
    "ExtractionResult",
]
