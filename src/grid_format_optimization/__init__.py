"""
Grid Format Optimization Module for StoryCore-Engine.
Optimizes grid formats (1x2, 1x3, 1x4 vs 3x3) for improved image and video quality.
"""

from .grid_format_optimizer import GridFormatOptimizer
from .format_selector import FormatSelector
from .quality_predictor import QualityPredictor
from .temporal_coherence_engine import TemporalCoherenceEngine
from .specialized_quality_analyzer import SpecializedQualityAnalyzer
from .types import (
    GridFormat,
    FormatSpec,
    ContentAnalysis,
    FormatRecommendation,
    QualityMetrics,
    CoherenceMetrics,
    PerformanceMetrics,
    FormatPreferences,
    OptimizationConfig
)

__version__ = "1.0.0"
__all__ = [
    "GridFormatOptimizer",
    "FormatSelector", 
    "QualityPredictor",
    "TemporalCoherenceEngine",
    "SpecializedQualityAnalyzer",
    "GridFormat",
    "FormatSpec",
    "ContentAnalysis",
    "FormatRecommendation",
    "QualityMetrics",
    "CoherenceMetrics",
    "PerformanceMetrics",
    "FormatPreferences",
    "OptimizationConfig"
]