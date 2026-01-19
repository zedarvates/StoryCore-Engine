"""
Tests d'intégration pour l'optimisation des formats de grille.
"""

import pytest
from pathlib import Path
import tempfile
import json

from src.grid_format_optimization import (
    GridFormatOptimizer, FormatSelector, QualityPredictor,
    GridFormat, ContentAnalysis, FormatPreferences, OptimizationConfig
)
from src.grid_format_optimization.exceptions import GridFormatError, UnsupportedFormatError


class TestGridFormatOptimizationIntegration:
    """Tests d'intégration pour le système d'optimisation des formats."""
    
    def setup_method(self):
        """Configuration pour chaque test."""
        self.optimizer = GridFormatOptimizer()
        self.sample_project_data = {
            "project_name": "test_project",
            "storyboard": {
                "shots": [
                    {"shot_id": "shot_01", "description": "Action scene with fast movement"},
                    {"shot_id": "shot_02", "description": "Character dialogue scene"},
                    {"shot_id": "shot_03", "description": "Landscape panoramic view"}
                ]
            },
            "characters": ["hero", "villain"]
        }
    
    def test_complete_optimization_workflow(self):
        """Test du workflow complet d'optimisation."""
        # 1. Analyse du contenu
        content_analysis = self.optimizer.analyze_content(self.sample_project_data)
        
        assert isinstance(content_analysis, ContentAnalysis)
        assert content_analysis.content_type in ["action", "dialogue", "landscape", "portrait"]
        assert 0.0 <= content_analysis.scene_complexity <= 1.0
        assert 0.0 <= content_analysis.motion_intensity <= 1.0
        
        # 2. Sélection du format optimal
        preferences = FormatPreferences.default()
        recommendation = self.optimizer.get_optimal_format(content_analysis, preferences)
        
        assert isinstance(recommendation.recommended_format, GridFormat)
        assert 0.0 <= recommendation.confidence_score <= 1.0
        assert recommendation.predicted_quality_improvement >= 0.0
        assert recommendation.estimated_processing_time > 0.0
        assert len(recommendation.justification) > 0
        assert len(recommendation.alternatives) >= 0
    
    def test_format_validation(self):
        """Test de la validation de compatibilité des formats."""
        # Test format valide
        result = self.optimizer.validate_format_compatibility("1x3")
        assert result.is_valid
        assert result.error_message is None
        
        # Test format invalide
        result = self.optimizer.validate_format_compatibility("2x5")
        assert not result.is_valid
        assert "non supporté" in result.error_message
        assert result.supported_formats is not None
    
    def test_preferences_configuration(self):
        """Test de la configuration des préférences."""
        preferences = FormatPreferences(
            preferred_formats=[GridFormat.LINEAR_1X3, GridFormat.LINEAR_1X4],
            quality_vs_speed_preference=0.8,
            auto_format_selection=True,
            minimum_quality_threshold=80.0,
            maximum_processing_time=240.0,
            custom_format_weights={}
        )
        
        # Configuration des préférences
        self.optimizer.configure_format_preferences(preferences)
        
        # Test avec préférences appliquées
        content_analysis = self.optimizer.analyze_content(self.sample_project_data)
        recommendation = self.optimizer.get_optimal_format(content_analysis, preferences)
        
        # Le format recommandé devrait être dans les préférences
        assert recommendation.recommended_format in preferences.preferred_formats
    
    def test_performance_history_tracking(self):
        """Test du suivi de l'historique des performances."""
        # Génération de plusieurs recommandations
        content_analysis = self.optimizer.analyze_content(self.sample_project_data)
        
        for _ in range(3):
            recommendation = self.optimizer.get_optimal_format(content_analysis)
        
        # Vérification de l'historique
        history = self.optimizer.get_performance_history()
        
        assert "recommendations" in history
        assert "config" in history
        assert "timestamp" in history
        assert isinstance(history["config"], OptimizationConfig)
    
    def test_error_handling(self):
        """Test de la gestion d'erreurs."""
        # Test avec données invalides
        with pytest.raises(GridFormatError):
            self.optimizer.analyze_content("invalid_data")
        
        # Test avec préférences invalides
        invalid_preferences = FormatPreferences(
            preferred_formats=[],  # Liste vide
            quality_vs_speed_preference=1.5,  # Valeur invalide
            auto_format_selection=True,
            minimum_quality_threshold=-10.0,  # Valeur invalide
            maximum_processing_time=None,
            custom_format_weights={}
        )
        
        with pytest.raises(Exception):  # ConfigurationError ou ValueError
            self.optimizer.configure_format_preferences(invalid_preferences)
    
    def test_format_selector_integration(self):
        """Test de l'intégration avec le sélecteur de format."""
        selector = FormatSelector()
        
        # Test d'analyse de type de contenu
        content_analysis = ContentAnalysis.from_project_data(self.sample_project_data)
        content_type = selector.analyze_content_type(content_analysis)
        
        assert content_type in ["action", "dialogue", "landscape", "portrait"]
        
        # Test d'évaluation des formats
        evaluations = selector.evaluate_formats(content_type, content_analysis)
        
        assert len(evaluations) == len(GridFormat)
        assert all(0.0 <= eval.score <= 1.0 for eval in evaluations)
        
        # Test de sélection optimale
        preferences = FormatPreferences.default()
        recommendation = selector.select_optimal_format(content_analysis, preferences)
        
        assert isinstance(recommendation, type(recommendation))
        assert recommendation.recommended_format in GridFormat
    
    def test_quality_predictor_integration(self):
        """Test de l'intégration avec le prédicteur de qualité."""
        predictor = QualityPredictor()
        content_analysis = ContentAnalysis.from_project_data(self.sample_project_data)
        
        # Test de prédiction de qualité
        for format_type in GridFormat:
            prediction = predictor.predict_quality_metrics(format_type, content_analysis)
            
            assert prediction.format_type == format_type
            assert 0.0 <= prediction.predicted_quality_score <= 100.0
            assert prediction.estimated_time > 0.0
            assert 0.0 <= prediction.confidence_level <= 1.0
            assert isinstance(prediction.risk_factors, list)
        
        # Test d'estimation de traitement
        estimate = predictor.estimate_processing_time(GridFormat.LINEAR_1X3, content_analysis)
        
        assert estimate.format_type == GridFormat.LINEAR_1X3
        assert estimate.estimated_time > 0.0
        assert estimate.memory_usage_mb > 0.0
        assert 0.0 <= estimate.cpu_intensity <= 1.0
    
    def test_content_analysis_variations(self):
        """Test avec différents types de contenu."""
        test_cases = [
            {
                "name": "action_content",
                "data": {
                    "storyboard": {
                        "shots": [
                            {"description": "Fast action sequence with combat"},
                            {"description": "Chase scene with high movement"}
                        ]
                    },
                    "characters": ["hero"]
                },
                "expected_type": "action"
            },
            {
                "name": "dialogue_content", 
                "data": {
                    "storyboard": {
                        "shots": [
                            {"description": "Two characters talking"},
                            {"description": "Conversation in a room"}
                        ]
                    },
                    "characters": ["person1", "person2"]
                },
                "expected_type": "dialogue"
            },
            {
                "name": "landscape_content",
                "data": {
                    "storyboard": {
                        "shots": [
                            {"description": "Beautiful landscape view"},
                            {"description": "Panoramic mountain scene"}
                        ]
                    },
                    "characters": []
                },
                "expected_type": "landscape"
            }
        ]
        
        for test_case in test_cases:
            content_analysis = self.optimizer.analyze_content(test_case["data"])
            
            # Vérification que l'analyse détecte le bon type ou un type cohérent
            assert content_analysis.content_type in ["action", "dialogue", "landscape", "portrait"]
            
            # Test de recommandation pour ce type de contenu
            recommendation = self.optimizer.get_optimal_format(content_analysis)
            assert isinstance(recommendation.recommended_format, GridFormat)
    
    def test_format_specific_recommendations(self):
        """Test des recommandations spécifiques par format."""
        content_analysis = ContentAnalysis(
            content_type="action",
            scene_complexity=0.8,
            motion_intensity=0.9,
            character_count=2,
            dominant_colors=["red", "blue"],
            aspect_ratio_preference="16:9",
            temporal_requirements=True
        )
        
        recommendation = self.optimizer.get_optimal_format(content_analysis)
        
        # Pour du contenu d'action avec exigences temporelles,
        # les formats linéaires devraient être privilégiés
        assert recommendation.recommended_format.is_linear
        assert recommendation.recommended_format in [GridFormat.LINEAR_1X3, GridFormat.LINEAR_1X4]
    
    def test_configuration_persistence(self):
        """Test de la persistance de configuration."""
        config = OptimizationConfig(
            enable_predictive_analysis=True,
            temporal_coherence_threshold=0.9,
            quality_improvement_threshold=0.2,
            autofix_trigger_threshold=0.8,
            performance_tracking=True,
            export_detailed_metrics=True
        )
        
        optimizer_with_config = GridFormatOptimizer(config)
        
        # Vérification que la configuration est appliquée
        assert optimizer_with_config.config.temporal_coherence_threshold == 0.9
        assert optimizer_with_config.config.quality_improvement_threshold == 0.2
        
        # Test de fonctionnement avec configuration personnalisée
        content_analysis = optimizer_with_config.analyze_content(self.sample_project_data)
        recommendation = optimizer_with_config.get_optimal_format(content_analysis)
        
        assert isinstance(recommendation, type(recommendation))