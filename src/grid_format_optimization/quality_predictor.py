"""
Prédicteur de qualité pour les formats de grille.
Estime la qualité finale et les performances avant traitement.
"""

from typing import Dict, List, Optional
import math
from dataclasses import dataclass

from .types import (
    GridFormat, ContentAnalysis, FormatPreferences, 
    QualityMetrics, PerformanceMetrics, FORMAT_SPECIFICATIONS
)
from .exceptions import QualityPredictionError


@dataclass
class QualityPrediction:
    """Prédiction de qualité pour un format."""
    format_type: GridFormat
    predicted_quality_score: float
    improvement_percentage: float
    estimated_time: float
    confidence_level: float
    risk_factors: List[str]


@dataclass
class ProcessingEstimate:
    """Estimation de traitement pour un format."""
    format_type: GridFormat
    estimated_time: float
    memory_usage_mb: float
    cpu_intensity: float
    quality_per_second: float


class QualityPredictor:
    """
    Prédicteur de qualité pour les formats de grille.
    
    Responsabilités:
    - Prédiction de la qualité finale pour chaque format
    - Estimation du temps de traitement
    - Calcul du rapport qualité/performance
    """
    
    def __init__(self):
        """Initialise le prédicteur de qualité."""
        self._baseline_metrics = {
            GridFormat.SQUARE_3X3: {"quality": 75.0, "time": 180.0},
            GridFormat.LINEAR_1X2: {"quality": 80.0, "time": 60.0},
            GridFormat.LINEAR_1X3: {"quality": 85.0, "time": 90.0},
            GridFormat.LINEAR_1X4: {"quality": 88.0, "time": 120.0}
        }
        self._prediction_models = {}
        self._performance_history = []
        self._preferences = None
    
    def predict_quality_metrics(self, format_type: GridFormat, 
                              content: ContentAnalysis) -> QualityPrediction:
        """
        Prédit les métriques de qualité pour un format et contenu donnés.
        
        Args:
            format_type: Format de grille à évaluer
            content: Analyse du contenu
            
        Returns:
            QualityPrediction: Prédiction complète de qualité
            
        Raises:
            QualityPredictionError: Si la prédiction échoue
        """
        try:
            # Métriques de base pour le format
            baseline = self._baseline_metrics[format_type]
            
            # Ajustements basés sur le contenu
            content_adjustment = self._calculate_content_adjustment(format_type, content)
            
            # Score de qualité prédit
            predicted_quality = baseline["quality"] * (1.0 + content_adjustment)
            predicted_quality = max(0.0, min(100.0, predicted_quality))
            
            # Calcul de l'amélioration par rapport au 3x3
            baseline_3x3 = self._baseline_metrics[GridFormat.SQUARE_3X3]["quality"]
            improvement = ((predicted_quality - baseline_3x3) / baseline_3x3) * 100.0
            
            # Estimation du temps
            estimated_time = self._estimate_processing_time_detailed(format_type, content)
            
            # Niveau de confiance
            confidence = self._calculate_confidence_level(format_type, content)
            
            # Facteurs de risque
            risk_factors = self._identify_risk_factors(format_type, content)
            
            return QualityPrediction(
                format_type=format_type,
                predicted_quality_score=predicted_quality,
                improvement_percentage=improvement,
                estimated_time=estimated_time,
                confidence_level=confidence,
                risk_factors=risk_factors
            )
            
        except Exception as e:
            raise QualityPredictionError(f"Erreur de prédiction: {str(e)}", format_type.value)
    
    def estimate_processing_time(self, format_type: GridFormat, 
                               content: ContentAnalysis) -> ProcessingEstimate:
        """
        Estime le temps et les ressources de traitement.
        
        Args:
            format_type: Format de grille
            content: Analyse du contenu
            
        Returns:
            ProcessingEstimate: Estimation complète des ressources
        """
        spec = FORMAT_SPECIFICATIONS[format_type]
        baseline = self._baseline_metrics[format_type]
        
        # Temps de base ajusté par la complexité du contenu
        base_time = baseline["time"]
        complexity_factor = 1.0 + (content.scene_complexity * 0.5)
        motion_factor = 1.0 + (content.motion_intensity * 0.3)
        
        estimated_time = base_time * complexity_factor * motion_factor
        
        # Estimation de l'usage mémoire
        memory_usage = spec.panel_count * 50.0  # MB par panel
        
        # Intensité CPU basée sur la complexité du format
        cpu_intensity = spec.processing_complexity
        
        # Qualité par seconde
        predicted_quality = self.predict_quality_metrics(format_type, content).predicted_quality_score
        quality_per_second = predicted_quality / estimated_time if estimated_time > 0 else 0
        
        return ProcessingEstimate(
            format_type=format_type,
            estimated_time=estimated_time,
            memory_usage_mb=memory_usage,
            cpu_intensity=cpu_intensity,
            quality_per_second=quality_per_second
        )
    
    def calculate_quality_performance_ratio(self, prediction: QualityPrediction) -> float:
        """
        Calcule le rapport qualité/performance.
        
        Args:
            prediction: Prédiction de qualité
            
        Returns:
            float: Ratio qualité/performance (plus élevé = meilleur)
        """
        if prediction.estimated_time <= 0:
            return 0.0
        
        return prediction.predicted_quality_score / prediction.estimated_time
    
    def update_prediction_models(self, actual_results: QualityMetrics, 
                               format_type: GridFormat, content: ContentAnalysis) -> None:
        """
        Met à jour les modèles de prédiction avec les résultats réels.
        
        Args:
            actual_results: Métriques de qualité réelles
            format_type: Format utilisé
            content: Contenu traité
        """
        # Calcul de l'erreur de prédiction
        prediction = self.predict_quality_metrics(format_type, content)
        error = abs(actual_results.overall_quality_score - prediction.predicted_quality_score)
        
        # Mise à jour des modèles si l'erreur est significative (> 10%)
        if error > 10.0:
            self._adjust_baseline_metrics(format_type, actual_results, error)
            self._record_performance_data(format_type, content, actual_results, prediction)
    
    def update_preferences(self, preferences: FormatPreferences) -> None:
        """Met à jour les préférences pour ajuster les prédictions."""
        self._preferences = preferences
    
    def get_prediction_accuracy(self) -> Dict[GridFormat, float]:
        """
        Retourne la précision des prédictions pour chaque format.
        
        Returns:
            Dict mapping format -> précision (0.0 à 1.0)
        """
        accuracy = {}
        
        for format_type in GridFormat:
            format_history = [h for h in self._performance_history if h["format"] == format_type]
            
            if format_history:
                errors = [h["prediction_error"] for h in format_history]
                avg_error = sum(errors) / len(errors)
                accuracy[format_type] = max(0.0, 1.0 - (avg_error / 100.0))
            else:
                accuracy[format_type] = 0.8  # Précision par défaut
        
        return accuracy
    
    def _calculate_content_adjustment(self, format_type: GridFormat, 
                                    content: ContentAnalysis) -> float:
        """Calcule l'ajustement de qualité basé sur le contenu."""
        spec = FORMAT_SPECIFICATIONS[format_type]
        
        # Bonus pour correspondance avec le type de contenu optimal
        content_bonus = 0.0
        if content.content_type in spec.optimal_for:
            content_bonus = 0.15  # 15% de bonus
        
        # Ajustement pour cohérence temporelle
        temporal_adjustment = 0.0
        if content.temporal_requirements and format_type.is_linear:
            temporal_adjustment = spec.temporal_coherence_weight * 0.1
        
        # Ajustement pour complexité de scène
        complexity_adjustment = 0.0
        if format_type == GridFormat.SQUARE_3X3 and content.scene_complexity > 0.7:
            complexity_adjustment = 0.1  # 3x3 meilleur pour scènes complexes
        elif format_type.is_linear and content.scene_complexity < 0.3:
            complexity_adjustment = 0.1  # Formats linéaires meilleurs pour scènes simples
        
        return content_bonus + temporal_adjustment + complexity_adjustment
    
    def _estimate_processing_time_detailed(self, format_type: GridFormat, 
                                         content: ContentAnalysis) -> float:
        """Estimation détaillée du temps de traitement."""
        baseline = self._baseline_metrics[format_type]["time"]
        
        # Facteurs d'ajustement
        factors = {
            "scene_complexity": 1.0 + (content.scene_complexity * 0.4),
            "motion_intensity": 1.0 + (content.motion_intensity * 0.3),
            "character_count": 1.0 + (content.character_count * 0.1),
            "temporal_requirements": 1.2 if content.temporal_requirements else 1.0
        }
        
        # Application des facteurs
        adjusted_time = baseline
        for factor_value in factors.values():
            adjusted_time *= factor_value
        
        # Contrainte de temps maximum (5 minutes)
        return min(adjusted_time, 300.0)
    
    def _calculate_confidence_level(self, format_type: GridFormat, 
                                  content: ContentAnalysis) -> float:
        """Calcule le niveau de confiance de la prédiction."""
        base_confidence = 0.8
        
        # Réduction de confiance pour contenu atypique
        if content.content_type not in FORMAT_SPECIFICATIONS[format_type].optimal_for:
            base_confidence -= 0.2
        
        # Réduction pour scènes très complexes
        if content.scene_complexity > 0.8:
            base_confidence -= 0.1
        
        # Bonus pour formats bien testés
        accuracy = self.get_prediction_accuracy().get(format_type, 0.8)
        
        return max(0.1, min(1.0, base_confidence * accuracy))
    
    def _identify_risk_factors(self, format_type: GridFormat, 
                             content: ContentAnalysis) -> List[str]:
        """Identifie les facteurs de risque pour la prédiction."""
        risks = []
        
        if content.scene_complexity > 0.8:
            risks.append("Scène très complexe")
        
        if content.motion_intensity > 0.8 and not format_type.is_linear:
            risks.append("Mouvement intense avec format non-linéaire")
        
        if content.character_count > 5:
            risks.append("Nombreux personnages")
        
        if content.temporal_requirements and format_type == GridFormat.SQUARE_3X3:
            risks.append("Exigences temporelles avec format 3x3")
        
        estimated_time = self._estimate_processing_time_detailed(format_type, content)
        if estimated_time > 240.0:  # > 4 minutes
            risks.append("Temps de traitement élevé")
        
        return risks
    
    def _adjust_baseline_metrics(self, format_type: GridFormat, 
                               actual_results: QualityMetrics, error: float) -> None:
        """Ajuste les métriques de base basées sur les résultats réels."""
        current_baseline = self._baseline_metrics[format_type]["quality"]
        
        # Ajustement conservateur (10% de l'erreur)
        adjustment = (actual_results.overall_quality_score - current_baseline) * 0.1
        
        self._baseline_metrics[format_type]["quality"] += adjustment
        
        # Contraintes
        self._baseline_metrics[format_type]["quality"] = max(
            0.0, min(100.0, self._baseline_metrics[format_type]["quality"])
        )
    
    def _record_performance_data(self, format_type: GridFormat, content: ContentAnalysis,
                               actual_results: QualityMetrics, prediction: QualityPrediction) -> None:
        """Enregistre les données de performance pour apprentissage."""
        error = abs(actual_results.overall_quality_score - prediction.predicted_quality_score)
        
        self._performance_history.append({
            "format": format_type,
            "content_type": content.content_type,
            "predicted_quality": prediction.predicted_quality_score,
            "actual_quality": actual_results.overall_quality_score,
            "prediction_error": error,
            "scene_complexity": content.scene_complexity,
            "motion_intensity": content.motion_intensity
        })
        
        # Garder seulement les 100 derniers enregistrements
        if len(self._performance_history) > 100:
            self._performance_history = self._performance_history[-100:]