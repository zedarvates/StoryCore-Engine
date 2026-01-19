"""
Sélecteur intelligent de format de grille.
Analyse le contenu et recommande le format optimal.
"""

from typing import List, Dict, Tuple
import math
from dataclasses import dataclass

from .types import (
    GridFormat, ContentAnalysis, FormatRecommendation, FormatPreferences,
    FORMAT_SPECIFICATIONS
)
from .exceptions import GridFormatError


@dataclass
class FormatEvaluation:
    """Évaluation d'un format pour un contenu spécifique."""
    format_type: GridFormat
    score: float
    content_compatibility: float
    processing_efficiency: float
    temporal_coherence_potential: float


class FormatSelector:
    """
    Sélecteur intelligent de format de grille.
    
    Responsabilités:
    - Analyse du type de contenu (action, dialogue, paysage, portrait)
    - Évaluation des formats disponibles selon le contexte
    - Recommandation du format optimal avec justification
    """
    
    def __init__(self):
        """Initialise le sélecteur de format."""
        self._content_type_weights = {
            "action": {
                GridFormat.LINEAR_1X4: 0.9,
                GridFormat.LINEAR_1X3: 0.8,
                GridFormat.LINEAR_1X2: 0.4,
                GridFormat.SQUARE_3X3: 0.6
            },
            "dialogue": {
                GridFormat.LINEAR_1X2: 0.9,
                GridFormat.LINEAR_1X3: 0.6,
                GridFormat.LINEAR_1X4: 0.4,
                GridFormat.SQUARE_3X3: 0.7
            },
            "landscape": {
                GridFormat.LINEAR_1X4: 0.8,
                GridFormat.LINEAR_1X3: 0.7,
                GridFormat.LINEAR_1X2: 0.5,
                GridFormat.SQUARE_3X3: 0.8
            },
            "portrait": {
                GridFormat.LINEAR_1X2: 0.9,
                GridFormat.LINEAR_1X3: 0.5,
                GridFormat.LINEAR_1X4: 0.3,
                GridFormat.SQUARE_3X3: 0.6
            }
        }
        self._preferences = None
    
    def analyze_content_type(self, content: ContentAnalysis) -> str:
        """
        Analyse le type de contenu pour classification.
        
        Args:
            content: Analyse de contenu du projet
            
        Returns:
            str: Type de contenu classifié
        """
        # Le type de contenu est déjà déterminé dans ContentAnalysis
        # Mais on peut l'affiner ici avec des règles supplémentaires
        
        base_type = content.content_type
        
        # Affinement basé sur les métriques
        if content.motion_intensity > 0.7:
            return "action"
        elif content.character_count >= 2 and content.motion_intensity < 0.3:
            return "dialogue"
        elif content.character_count <= 1 and content.motion_intensity < 0.2:
            return "landscape"
        elif content.character_count == 1:
            return "portrait"
        
        return base_type
    
    def evaluate_formats(self, content_type: str, content: ContentAnalysis) -> List[FormatEvaluation]:
        """
        Évalue tous les formats disponibles pour le type de contenu donné.
        
        Args:
            content_type: Type de contenu classifié
            content: Analyse complète du contenu
            
        Returns:
            List[FormatEvaluation]: Évaluations de tous les formats
        """
        evaluations = []
        
        for format_type in GridFormat:
            evaluation = self._evaluate_single_format(format_type, content_type, content)
            evaluations.append(evaluation)
        
        # Tri par score décroissant
        evaluations.sort(key=lambda x: x.score, reverse=True)
        
        return evaluations
    
    def select_optimal_format(self, content_analysis: ContentAnalysis, 
                            preferences: FormatPreferences) -> FormatRecommendation:
        """
        Sélectionne le format optimal basé sur l'analyse et les préférences.
        
        Args:
            content_analysis: Analyse du contenu
            preferences: Préférences utilisateur
            
        Returns:
            FormatRecommendation: Recommandation avec justification
        """
        self._preferences = preferences
        
        # Analyse du type de contenu
        content_type = self.analyze_content_type(content_analysis)
        
        # Évaluation de tous les formats
        evaluations = self.evaluate_formats(content_type, content_analysis)
        
        # Filtrage selon les préférences
        if preferences.preferred_formats:
            evaluations = [e for e in evaluations if e.format_type in preferences.preferred_formats]
        
        if not evaluations:
            raise GridFormatError("Aucun format disponible selon les préférences")
        
        # Sélection du format optimal
        best_evaluation = evaluations[0]
        
        # Vérification des seuils de qualité
        if best_evaluation.score < preferences.minimum_quality_threshold / 100.0:
            # Fallback vers le format 3x3 si aucun format ne satisfait le seuil
            fallback_eval = next((e for e in evaluations if e.format_type == GridFormat.SQUARE_3X3), None)
            if fallback_eval:
                best_evaluation = fallback_eval
        
        # Départage par efficacité si scores équivalents
        equivalent_formats = [e for e in evaluations if abs(e.score - best_evaluation.score) < 0.05]
        if len(equivalent_formats) > 1:
            best_evaluation = self._select_most_efficient(equivalent_formats)
        
        # Création de la recommandation
        alternatives = [(e.format_type, e.score) for e in evaluations[1:4]]  # Top 3 alternatives
        
        return FormatRecommendation(
            recommended_format=best_evaluation.format_type,
            confidence_score=best_evaluation.score,
            predicted_quality_improvement=self._calculate_improvement(best_evaluation, content_type),
            estimated_processing_time=self._estimate_processing_time(best_evaluation.format_type),
            justification=self.get_format_justification(best_evaluation.format_type, content_type),
            alternatives=alternatives
        )
    
    def get_format_justification(self, format_type: GridFormat, content_type: str = None) -> str:
        """
        Génère une justification pour le choix du format.
        
        Args:
            format_type: Format sélectionné
            content_type: Type de contenu (optionnel)
            
        Returns:
            str: Justification textuelle
        """
        spec = FORMAT_SPECIFICATIONS[format_type]
        
        base_justification = f"Format {format_type.value} sélectionné"
        
        if content_type:
            if content_type in spec.optimal_for:
                return f"{base_justification} - Optimal pour le contenu de type '{content_type}'"
            else:
                return f"{base_justification} - Bon compromis pour le contenu de type '{content_type}'"
        
        reasons = []
        if format_type.is_linear:
            reasons.append("cohérence temporelle élevée")
        if spec.processing_complexity < 0.5:
            reasons.append("traitement rapide")
        if spec.temporal_coherence_weight > 0.7:
            reasons.append("excellent pour les séquences")
        
        if reasons:
            return f"{base_justification} - {', '.join(reasons)}"
        
        return base_justification
    
    def update_preferences(self, preferences: FormatPreferences) -> None:
        """Met à jour les préférences du sélecteur."""
        self._preferences = preferences
    
    def _evaluate_single_format(self, format_type: GridFormat, content_type: str, 
                               content: ContentAnalysis) -> 'FormatEvaluation':
        """Évalue un format spécifique pour le contenu donné."""
        spec = FORMAT_SPECIFICATIONS[format_type]
        
        # Score basé sur le type de contenu
        content_score = self._content_type_weights.get(content_type, {}).get(format_type, 0.5)
        
        # Score basé sur la complexité de la scène
        complexity_score = self._calculate_complexity_score(format_type, content.scene_complexity)
        
        # Score basé sur l'intensité de mouvement
        motion_score = self._calculate_motion_score(format_type, content.motion_intensity)
        
        # Score basé sur les exigences temporelles
        temporal_score = self._calculate_temporal_score(format_type, content.temporal_requirements)
        
        # Score composite pondéré
        composite_score = (
            content_score * 0.4 +
            complexity_score * 0.2 +
            motion_score * 0.2 +
            temporal_score * 0.2
        )
        
        return FormatEvaluation(
            format_type=format_type,
            score=composite_score,
            content_compatibility=content_score,
            processing_efficiency=1.0 - spec.processing_complexity,
            temporal_coherence_potential=spec.temporal_coherence_weight
        )
    
    def _calculate_complexity_score(self, format_type: GridFormat, complexity: float) -> float:
        """Calcule le score basé sur la complexité de la scène."""
        spec = FORMAT_SPECIFICATIONS[format_type]
        
        if format_type == GridFormat.SQUARE_3X3:
            # 3x3 est meilleur pour les scènes complexes
            return complexity
        else:
            # Les formats linéaires sont meilleurs pour les scènes simples
            return 1.0 - complexity
    
    def _calculate_motion_score(self, format_type: GridFormat, motion_intensity: float) -> float:
        """Calcule le score basé sur l'intensité de mouvement."""
        if format_type.is_linear:
            # Les formats linéaires sont meilleurs pour le mouvement
            return motion_intensity
        else:
            # 3x3 est moins optimal pour le mouvement intense
            return 1.0 - (motion_intensity * 0.5)
    
    def _calculate_temporal_score(self, format_type: GridFormat, temporal_requirements: bool) -> float:
        """Calcule le score basé sur les exigences temporelles."""
        spec = FORMAT_SPECIFICATIONS[format_type]
        
        if temporal_requirements:
            return spec.temporal_coherence_weight
        else:
            return 0.7  # Score neutre si pas d'exigences temporelles
    
    def _select_most_efficient(self, equivalent_formats: List['FormatEvaluation']) -> 'FormatEvaluation':
        """Sélectionne le format le plus efficace parmi des formats équivalents."""
        return min(equivalent_formats, key=lambda e: FORMAT_SPECIFICATIONS[e.format_type].processing_complexity)
    
    def _calculate_improvement(self, evaluation: 'FormatEvaluation', content_type: str) -> float:
        """Calcule l'amélioration prédite par rapport au format 3x3."""
        baseline_score = self._content_type_weights.get(content_type, {}).get(GridFormat.SQUARE_3X3, 0.5)
        improvement = (evaluation.score - baseline_score) / baseline_score
        return max(0.0, improvement * 100.0)  # Pourcentage d'amélioration
    
    def _estimate_processing_time(self, format_type: GridFormat) -> float:
        """Estime le temps de traitement pour un format."""
        spec = FORMAT_SPECIFICATIONS[format_type]
        base_time = 60.0  # 1 minute de base
        return base_time * (1.0 + spec.processing_complexity)


@dataclass
class FormatEvaluation:
    """Évaluation d'un format pour un contenu spécifique."""
    format_type: GridFormat
    score: float
    content_compatibility: float
    processing_efficiency: float
    temporal_coherence_potential: float