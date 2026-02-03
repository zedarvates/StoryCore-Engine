"""
Data models for Image and Concept Art API category.

This module defines all data structures used by image generation endpoints.
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from enum import Enum


class ImageFormat(str, Enum):
    """Supported image formats."""
    PNG = "png"
    JPG = "jpg"
    JPEG = "jpeg"
    PPM = "ppm"
    WEBP = "webp"


class UpscaleMethod(str, Enum):
    """Upscaling methods."""
    LANCZOS = "lanczos"
    BICUBIC = "bicubic"
    BILINEAR = "bilinear"
    NEAREST = "nearest"


class GridFormat(str, Enum):
    """Grid format specifications."""
    GRID_3X3 = "3x3"
    GRID_1X2 = "1x2"
    GRID_1X4 = "1x4"


@dataclass
class ImageGenerationRequest:
    """Request to generate an image."""
    prompt: str
    negative_prompt: Optional[str] = None
    width: int = 512
    height: int = 512
    seed: Optional[int] = None
    steps: int = 20
    cfg_scale: float = 7.0
    sampler: str = "euler_a"
    model: Optional[str] = None


@dataclass
class ImageGenerationResponse:
    """Response from image generation."""
    image_path: str
    width: int
    height: int
    seed: int
    generation_time: float
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class GridCreationRequest:
    """Request to create a Master Coherence Sheet grid."""
    project_name: str
    grid_format: str = "3x3"
    cell_size: int = 512
    output_path: Optional[str] = None
    base_path: str = "."


@dataclass
class GridCreationResponse:
    """Response from grid creation."""
    project_name: str
    grid_path: str
    grid_format: str
    cell_size: int
    total_panels: int
    panel_paths: List[str]
    generation_time: float


@dataclass
class PanelPromotionRequest:
    """Request to promote a panel from the grid."""
    project_name: str
    panel_coordinates: Optional[Tuple[int, int]] = None  # (row, col) for specific panel
    panel_number: Optional[int] = None  # Alternative: panel number (1-indexed)
    scale: int = 2
    method: str = "lanczos"
    base_path: str = "."


@dataclass
class PanelPromotionResponse:
    """Response from panel promotion."""
    project_name: str
    promoted_panels: List[Dict[str, Any]]
    output_dir: str
    total_panels: int
    resolutions: List[Tuple[Tuple[int, int], Tuple[int, int]]]  # [(original, promoted), ...]
    promotion_time: float


@dataclass
class ImageRefinementRequest:
    """Request to refine an image."""
    image_path: str
    project_name: Optional[str] = None
    denoising_strength: float = 0.3
    sharpen: bool = True
    enhance_contrast: bool = False
    output_path: Optional[str] = None


@dataclass
class ImageRefinementResponse:
    """Response from image refinement."""
    original_path: str
    refined_path: str
    improvements: Dict[str, Any]
    refinement_time: float


@dataclass
class ImageQualityMetrics:
    """Quality metrics for an image."""
    laplacian_variance: float
    sharpness_score: float
    brightness: float
    contrast: float
    resolution: Tuple[int, int]
    file_size: int
    quality_grade: str  # "excellent", "good", "acceptable", "poor"
    issues: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)


@dataclass
class ImageAnalysisRequest:
    """Request to analyze an image."""
    image_path: str
    project_name: Optional[str] = None
    include_histogram: bool = False
    include_color_analysis: bool = False


@dataclass
class ImageAnalysisResponse:
    """Response from image analysis."""
    image_path: str
    metrics: ImageQualityMetrics
    analysis_time: float
    histogram: Optional[Dict[str, List[int]]] = None
    color_analysis: Optional[Dict[str, Any]] = None


@dataclass
class StyleExtractionRequest:
    """Request to extract style from a reference image."""
    reference_image_path: str
    extract_colors: bool = True
    extract_composition: bool = True
    extract_lighting: bool = True


@dataclass
class StyleParameters:
    """Extracted style parameters."""
    dominant_colors: List[str] = field(default_factory=list)
    color_palette: List[str] = field(default_factory=list)
    composition_type: Optional[str] = None
    lighting_style: Optional[str] = None
    mood: Optional[str] = None
    texture_characteristics: Dict[str, Any] = field(default_factory=dict)
    style_tags: List[str] = field(default_factory=list)


@dataclass
class StyleExtractionResponse:
    """Response from style extraction."""
    reference_image_path: str
    style_parameters: StyleParameters
    extraction_time: float


@dataclass
class StyleApplicationRequest:
    """Request to apply style to a target image."""
    target_image_path: str
    style_parameters: Dict[str, Any]
    strength: float = 0.7
    preserve_content: bool = True
    output_path: Optional[str] = None


@dataclass
class StyleApplicationResponse:
    """Response from style application."""
    original_path: str
    styled_path: str
    style_applied: Dict[str, Any]
    application_time: float


@dataclass
class BatchProcessingRequest:
    """Request to process multiple images in batch."""
    image_paths: List[str]
    operation: str  # "analyze", "refine", "upscale", "style_transfer"
    parameters: Dict[str, Any] = field(default_factory=dict)
    parallel: bool = True
    max_workers: int = 4


@dataclass
class BatchProcessingResponse:
    """Response from batch processing."""
    total_images: int
    successful: int
    failed: int
    results: List[Dict[str, Any]]
    total_time: float
    average_time_per_image: float
    errors: List[Dict[str, Any]] = field(default_factory=list)


# Quality thresholds
QUALITY_THRESHOLDS = {
    "laplacian_variance": {
        "excellent": 200.0,
        "good": 100.0,
        "acceptable": 50.0,
        "poor": 0.0,
    },
    "sharpness_score": {
        "excellent": 0.8,
        "good": 0.6,
        "acceptable": 0.4,
        "poor": 0.0,
    },
}


def calculate_quality_grade(laplacian_variance: float, sharpness_score: float) -> str:
    """
    Calculate overall quality grade based on metrics.
    
    Args:
        laplacian_variance: Laplacian variance value
        sharpness_score: Sharpness score (0-1)
        
    Returns:
        Quality grade: "excellent", "good", "acceptable", or "poor"
    """
    # Check laplacian variance
    if laplacian_variance >= QUALITY_THRESHOLDS["laplacian_variance"]["excellent"]:
        lap_grade = "excellent"
    elif laplacian_variance >= QUALITY_THRESHOLDS["laplacian_variance"]["good"]:
        lap_grade = "good"
    elif laplacian_variance >= QUALITY_THRESHOLDS["laplacian_variance"]["acceptable"]:
        lap_grade = "acceptable"
    else:
        lap_grade = "poor"
    
    # Check sharpness score
    if sharpness_score >= QUALITY_THRESHOLDS["sharpness_score"]["excellent"]:
        sharp_grade = "excellent"
    elif sharpness_score >= QUALITY_THRESHOLDS["sharpness_score"]["good"]:
        sharp_grade = "good"
    elif sharpness_score >= QUALITY_THRESHOLDS["sharpness_score"]["acceptable"]:
        sharp_grade = "acceptable"
    else:
        sharp_grade = "poor"
    
    # Return the worse of the two grades
    grades = ["excellent", "good", "acceptable", "poor"]
    lap_idx = grades.index(lap_grade)
    sharp_idx = grades.index(sharp_grade)
    
    return grades[max(lap_idx, sharp_idx)]
