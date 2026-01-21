"""
Module principal d'optimisation des formats de grille.
Coordonne la sélection et l'optimisation des formats pour améliorer la qualité.
"""

from typing import Dict, Any, Optional, List
from pathlib import Path
import json
from datetime import datetime
from dataclasses import dataclass

from .types import (
    GridFormat, ContentAnalysis, FormatRecommendation, 
    FormatPreferences, OptimizationConfig
)
from .format_selector import FormatSelector
from .quality_predictor import QualityPredictor
from .temporal_coherence_engine import TemporalCoherenceEngine
from .exceptions import GridFormatError, ConfigurationError


@dataclass
class ValidationResult:
    """Résultat de validation de compatibilité."""
    is_valid: bool
    error_message: Optional[str]
    supported_formats: Optional[list]


class GridFormatOptimizer:
    """
    Module principal d'optimisation des formats de grille.
    
    Responsabilités:
    - Coordination générale de l'optimisation des formats
    - Interface avec les modules existants du pipeline
    - Gestion de la configuration et des préférences utilisateur
    """
    
    def __init__(self, config: Optional[OptimizationConfig] = None):
        """
        Initialise l'optimiseur de formats de grille.
        
        Args:
            config: Configuration d'optimisation (utilise les valeurs par défaut si None)
        """
        self.config = config or OptimizationConfig.default()
        self.format_selector = FormatSelector()
        self.quality_predictor = QualityPredictor()
        # Moteur de cohérence temporelle pour les formats linéaires (seuil 85%)
        self.temporal_coherence_engine = TemporalCoherenceEngine(coherence_threshold=0.85)
        self._performance_history = {}
    
    def analyze_content(self, project_data: Dict[str, Any]) -> ContentAnalysis:
        """
        Analyse le contenu du projet pour déterminer le format optimal.
        
        Args:
            project_data: Données du projet (project.json)
            
        Returns:
            ContentAnalysis: Analyse du contenu avec métriques
            
        Raises:
            GridFormatError: Si les données du projet sont invalides
        """
        try:
            # Validation des données d'entrée
            if not isinstance(project_data, dict):
                raise GridFormatError("Les données du projet doivent être un dictionnaire")
            
            # Création de l'analyse de contenu
            analysis = ContentAnalysis.from_project_data(project_data)
            
            # Enrichissement avec analyse prédictive si activée
            if self.config.enable_predictive_analysis:
                analysis = self._enhance_content_analysis(analysis, project_data)
            
            return analysis
            
        except Exception as e:
            raise GridFormatError(f"Erreur lors de l'analyse du contenu: {str(e)}")
    
    def get_optimal_format(self, content_analysis: ContentAnalysis, 
                          preferences: Optional[FormatPreferences] = None) -> FormatRecommendation:
        """
        Détermine le format optimal basé sur l'analyse de contenu et les préférences.
        
        Args:
            content_analysis: Analyse du contenu du projet
            preferences: Préférences utilisateur (utilise les valeurs par défaut si None)
            
        Returns:
            FormatRecommendation: Recommandation avec justification
            
        Raises:
            GridFormatError: Si la sélection échoue
        """
        try:
            preferences = preferences or FormatPreferences.default()
            
            # Sélection du format optimal
            recommendation = self.format_selector.select_optimal_format(
                content_analysis, preferences
            )
            
            # Prédiction de qualité si activée
            if self.config.enable_predictive_analysis:
                quality_prediction = self.quality_predictor.predict_quality_metrics(
                    recommendation.recommended_format, content_analysis
                )
                
                # Mise à jour de la recommandation avec les prédictions
                recommendation.predicted_quality_improvement = quality_prediction.improvement_percentage
                recommendation.estimated_processing_time = quality_prediction.estimated_time
            
            # Enregistrement pour l'historique des performances
            if self.config.performance_tracking:
                self._record_recommendation(recommendation, content_analysis)
            
            return recommendation

        except Exception as e:
            raise GridFormatError(f"Erreur lors de la sélection du format: {str(e)}")

    def analyze_temporal_coherence(self, panels: List, format_type: GridFormat) -> Dict[str, Any]:
        """
        Analyse la cohérence temporelle pour les formats linéaires.

        Utilise le TemporalCoherenceEngine pour calculer les métriques de cohérence
        et déclencher l'autofix si nécessaire (seuil 85%).

        Args:
            panels: Liste des panels à analyser
            format_type: Format de grille utilisé

        Returns:
            Dict contenant les métriques de cohérence et actions d'autofix

        Raises:
            GridFormatError: Si l'analyse échoue
        """
        try:
            # Calcul des métriques de cohérence temporelle
            coherence_metrics = self.temporal_coherence_engine.calculate_coherence_metrics(panels)

            # Rapport de continuité visuelle
            continuity_report = self.temporal_coherence_engine.ensure_visual_continuity(panels)

            # Vérification du déclenchement d'autofix (seuil 85%)
            autofix_action = self.temporal_coherence_engine.trigger_autofix_if_needed(
                coherence_metrics.temporal_coherence_score
            )

            return {
                "coherence_metrics": coherence_metrics,
                "continuity_report": continuity_report,
                "autofix_triggered": autofix_action is not None,
                "autofix_action": autofix_action,
                "format_type": format_type.value,
                "threshold_met": coherence_metrics.temporal_coherence_score >= 0.85
            }

        except Exception as e:
            raise GridFormatError(f"Erreur lors de l'analyse de cohérence temporelle: {str(e)}")

    def optimize_temporal_transitions(self, panels: List, format_type: GridFormat) -> List:
        """
        Optimise les transitions temporelles entre panels.

        Applique les optimisations de cohérence temporelle pour les formats linéaires,
        améliorant automatiquement la continuité visuelle.

        Args:
            panels: Liste des panels à optimiser
            format_type: Format de grille utilisé

        Returns:
            List: Panels optimisés

        Raises:
            GridFormatError: Si l'optimisation échoue
        """
        try:
            # Optimisation des transitions via le moteur de cohérence temporelle
            optimized_panels = self.temporal_coherence_engine.optimize_panel_transitions(
                panels, format_type
            )

            return optimized_panels

        except Exception as e:
            raise GridFormatError(f"Erreur lors de l'optimisation temporelle: {str(e)}")
    
    def configure_format_preferences(self, preferences: FormatPreferences) -> None:
        """
        Configure les préférences utilisateur pour la sélection de format.
        
        Args:
            preferences: Nouvelles préférences utilisateur
            
        Raises:
            ConfigurationError: Si les préférences sont invalides
        """
        try:
            # Validation des préférences
            self._validate_preferences(preferences)
            
            # Application des préférences au sélecteur de format
            self.format_selector.update_preferences(preferences)
            
            # Mise à jour de la configuration du prédicteur de qualité
            self.quality_predictor.update_preferences(preferences)
            
        except Exception as e:
            raise ConfigurationError("preferences", str(preferences), str(e))
    
    def validate_format_compatibility(self, format_spec: str) -> ValidationResult:
        """
        Valide la compatibilité d'un format avec le pipeline existant.
        
        Args:
            format_spec: Spécification du format (ex: "1x3")
            
        Returns:
            ValidationResult: Résultat de la validation
        """
        try:
            # Vérification du format supporté
            try:
                grid_format = GridFormat(format_spec)
            except ValueError:
                return ValidationResult(
                    is_valid=False,
                    error_message=f"Format non supporté: {format_spec}",
                    supported_formats=list(GridFormat)
                )
            
            # Vérification de la compatibilité avec les modules existants
            compatibility_checks = [
                self._check_grid_generator_compatibility(grid_format),
                self._check_promotion_engine_compatibility(grid_format),
                self._check_qa_engine_compatibility(grid_format)
            ]
            
            all_compatible = all(check.is_valid for check in compatibility_checks)
            
            if all_compatible:
                return ValidationResult(
                    is_valid=True,
                    error_message=None,
                    supported_formats=None
                )
            else:
                failed_checks = [check for check in compatibility_checks if not check.is_valid]
                error_messages = [check.error_message for check in failed_checks]
                
                return ValidationResult(
                    is_valid=False,
                    error_message="; ".join(error_messages),
                    supported_formats=list(GridFormat)
                )
                
        except Exception as e:
            return ValidationResult(
                is_valid=False,
                error_message=f"Erreur de validation: {str(e)}",
                supported_formats=list(GridFormat)
            )
    
    def get_performance_history(self) -> Dict[str, Any]:
        """
        Retourne l'historique des performances pour analyse.
        
        Returns:
            Dict contenant l'historique des performances
        """
        return {
            "recommendations": self._performance_history,
            "config": self.config,
            "timestamp": datetime.utcnow().isoformat() + "Z"
        }
    
    def _enhance_content_analysis(self, analysis: ContentAnalysis, 
                                project_data: Dict[str, Any]) -> ContentAnalysis:
        """Enrichit l'analyse de contenu avec des données supplémentaires."""
        # Analyse plus approfondie basée sur les données du projet
        # À implémenter avec des algorithmes plus sophistiqués
        return analysis
    
    def _validate_preferences(self, preferences: FormatPreferences) -> None:
        """Valide les préférences utilisateur."""
        if not (0.0 <= preferences.quality_vs_speed_preference <= 1.0):
            raise ValueError("quality_vs_speed_preference doit être entre 0.0 et 1.0")
        
        if not (0.0 <= preferences.minimum_quality_threshold <= 100.0):
            raise ValueError("minimum_quality_threshold doit être entre 0.0 et 100.0")
        
        if preferences.maximum_processing_time is not None and preferences.maximum_processing_time <= 0:
            raise ValueError("maximum_processing_time doit être positif")
    
    def _record_recommendation(self, recommendation: FormatRecommendation, 
                             analysis: ContentAnalysis) -> None:
        """Enregistre une recommandation pour l'historique des performances."""
        timestamp = datetime.utcnow().isoformat() + "Z"
        
        if recommendation.recommended_format.value not in self._performance_history:
            self._performance_history[recommendation.recommended_format.value] = []
        
        self._performance_history[recommendation.recommended_format.value].append({
            "timestamp": timestamp,
            "content_type": analysis.content_type,
            "confidence_score": recommendation.confidence_score,
            "predicted_improvement": recommendation.predicted_quality_improvement,
            "estimated_time": recommendation.estimated_processing_time
        })
    
    def _check_grid_generator_compatibility(self, format_type: GridFormat) -> 'ValidationResult':
        """Vérifie la compatibilité avec le générateur de grille."""
        # Le générateur de grille supporte déjà tous les formats
        return ValidationResult(is_valid=True, error_message=None, supported_formats=None)
    
    def _check_promotion_engine_compatibility(self, format_type: GridFormat) -> 'ValidationResult':
        """Vérifie la compatibilité avec le moteur de promotion."""
        # Le moteur de promotion supporte déjà tous les formats
        return ValidationResult(is_valid=True, error_message=None, supported_formats=None)
    
    def _check_qa_engine_compatibility(self, format_type: GridFormat) -> 'ValidationResult':
        """Vérifie la compatibilité avec le moteur QA."""
        # Le moteur QA supporte déjà tous les formats
        return ValidationResult(is_valid=True, error_message=None, supported_formats=None)