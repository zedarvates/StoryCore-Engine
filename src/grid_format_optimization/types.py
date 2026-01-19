"""
Types et structures de données pour l'optimisation des formats de grille.
"""

from enum import Enum
from dataclasses import dataclass
from typing import List, Dict, Optional, Tuple, Any
from pathlib import Path


class GridFormat(Enum):
    """Formats de grille supportés."""
    SQUARE_3X3 = "3x3"
    LINEAR_1X2 = "1x2"
    LINEAR_1X3 = "1x3"
    LINEAR_1X4 = "1x4"

    @property
    def is_linear(self) -> bool:
        """Vérifie si le format est linéaire."""
        return self in [GridFormat.LINEAR_1X2, GridFormat.LINEAR_1X3, GridFormat.LINEAR_1X4]
    
    @property
    def panel_count(self) -> int:
        """Retourne le nombre de panels pour ce format."""
        cols, rows = map(int, self.value.split('x'))
        return cols * rows
    
    @property
    def dimensions(self) -> Tuple[int, int]:
        """Retourne les dimensions (cols, rows) du format."""
        cols, rows = map(int, self.value.split('x'))
        return (cols, rows)


@dataclass
class FormatSpec:
    """Spécification complète d'un format de grille."""
    format_type: GridFormat
    dimensions: Tuple[int, int]
    panel_count: int
    optimal_for: List[str]  # Types de contenu optimaux
    processing_complexity: float  # 0.0 à 1.0
    temporal_coherence_weight: float  # Poids pour cohérence temporelle


@dataclass
class ContentAnalysis:
    """Analyse du contenu pour sélection de format."""
    content_type: str  # "action", "dialogue", "landscape", "portrait"
    scene_complexity: float  # 0.0 à 1.0
    motion_intensity: float  # 0.0 à 1.0
    character_count: int
    dominant_colors: List[str]
    aspect_ratio_preference: str
    temporal_requirements: bool
    
    @classmethod
    def from_project_data(cls, project_data: Dict[str, Any]) -> 'ContentAnalysis':
        """Crée une analyse de contenu à partir des données de projet."""
        # Analyse basique basée sur les données disponibles
        storyboard = project_data.get("storyboard", {})
        shots = storyboard.get("shots", [])
        
        # Détection du type de contenu basé sur les descriptions
        content_type = "dialogue"  # Par défaut
        motion_intensity = 0.3
        
        for shot in shots:
            description = shot.get("description", "").lower()
            if any(word in description for word in ["action", "course", "combat", "mouvement"]):
                content_type = "action"
                motion_intensity = 0.8
                break
            elif any(word in description for word in ["paysage", "vue", "panorama"]):
                content_type = "landscape"
                motion_intensity = 0.1
        
        return cls(
            content_type=content_type,
            scene_complexity=min(len(shots) / 10.0, 1.0),
            motion_intensity=motion_intensity,
            character_count=len(project_data.get("characters", [])),
            dominant_colors=["neutral"],  # À améliorer avec analyse d'image
            aspect_ratio_preference="16:9",
            temporal_requirements=content_type == "action"
        )


@dataclass
class FormatRecommendation:
    """Recommandation de format avec justification."""
    recommended_format: GridFormat
    confidence_score: float  # 0.0 à 1.0
    predicted_quality_improvement: float  # Pourcentage d'amélioration
    estimated_processing_time: float  # Secondes
    justification: str
    alternatives: List[Tuple[GridFormat, float]]  # Format, score


@dataclass
class QualityMetrics:
    """Métriques de qualité pour un format."""
    laplacian_variance: float
    color_coherence: float
    sharpness_score: float
    temporal_consistency: float
    overall_quality_score: float
    format_specific_score: float


@dataclass
class CoherenceMetrics:
    """Métriques de cohérence temporelle."""
    inter_panel_similarity: float
    color_transition_smoothness: float
    style_consistency: float
    lighting_coherence: float
    temporal_coherence_score: float


@dataclass
class PerformanceMetrics:
    """Métriques de performance système."""
    processing_time: float
    memory_usage: float
    quality_per_second: float
    autofix_trigger_rate: float
    user_satisfaction_score: Optional[float] = None


@dataclass
class FormatPreferences:
    """Préférences utilisateur pour sélection de format."""
    preferred_formats: List[GridFormat]
    quality_vs_speed_preference: float  # 0.0 (vitesse) à 1.0 (qualité)
    auto_format_selection: bool
    minimum_quality_threshold: float
    maximum_processing_time: Optional[float]
    custom_format_weights: Dict[GridFormat, float]
    
    @classmethod
    def default(cls) -> 'FormatPreferences':
        """Crée des préférences par défaut."""
        return cls(
            preferred_formats=[GridFormat.LINEAR_1X3, GridFormat.LINEAR_1X4, GridFormat.SQUARE_3X3],
            quality_vs_speed_preference=0.7,
            auto_format_selection=True,
            minimum_quality_threshold=75.0,
            maximum_processing_time=300.0,  # 5 minutes
            custom_format_weights={}
        )


@dataclass
class OptimizationConfig:
    """Configuration pour l'optimisation des formats."""
    enable_predictive_analysis: bool
    temporal_coherence_threshold: float
    quality_improvement_threshold: float
    autofix_trigger_threshold: float
    performance_tracking: bool
    export_detailed_metrics: bool
    
    @classmethod
    def default(cls) -> 'OptimizationConfig':
        """Crée une configuration par défaut."""
        return cls(
            enable_predictive_analysis=True,
            temporal_coherence_threshold=0.85,
            quality_improvement_threshold=0.15,  # 15%
            autofix_trigger_threshold=0.85,
            performance_tracking=True,
            export_detailed_metrics=True
        )


# Constantes pour l'optimisation
TEMPORAL_COHERENCE_THRESHOLD = 0.85
QUALITY_IMPROVEMENT_THRESHOLD = 0.15
AUTOFIX_TRIGGER_THRESHOLD = 0.85

# Spécifications des formats
FORMAT_SPECIFICATIONS = {
    GridFormat.SQUARE_3X3: FormatSpec(
        format_type=GridFormat.SQUARE_3X3,
        dimensions=(3, 3),
        panel_count=9,
        optimal_for=["general", "complex_scenes", "multiple_characters"],
        processing_complexity=0.8,
        temporal_coherence_weight=0.3
    ),
    GridFormat.LINEAR_1X2: FormatSpec(
        format_type=GridFormat.LINEAR_1X2,
        dimensions=(1, 2),
        panel_count=2,
        optimal_for=["dialogue", "portrait", "simple_transitions"],
        processing_complexity=0.3,
        temporal_coherence_weight=0.8
    ),
    GridFormat.LINEAR_1X3: FormatSpec(
        format_type=GridFormat.LINEAR_1X3,
        dimensions=(1, 3),
        panel_count=3,
        optimal_for=["action", "short_sequences", "narrative_flow"],
        processing_complexity=0.5,
        temporal_coherence_weight=0.9
    ),
    GridFormat.LINEAR_1X4: FormatSpec(
        format_type=GridFormat.LINEAR_1X4,
        dimensions=(1, 4),
        panel_count=4,
        optimal_for=["action", "long_sequences", "cinematic_flow"],
        processing_complexity=0.6,
        temporal_coherence_weight=1.0
    )
}