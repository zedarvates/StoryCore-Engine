"""
Tests d'intégration du GridFormatOptimizer avec le Data Contract v1.
"""

import pytest
import tempfile
import json
from pathlib import Path
from datetime import datetime

from src.grid_format_optimization import GridFormatOptimizer, GridFormat, FormatPreferences
from src.grid_format_optimization.exceptions import GridFormatError


class TestGridFormatOptimizerDataContract:
    """Tests d'intégration avec le Data Contract v1."""
    
    def setup_method(self):
        """Configuration pour chaque test."""
        self.optimizer = GridFormatOptimizer()
        
        # Création d'un projet temporaire conforme au Data Contract v1
        self.temp_dir = tempfile.mkdtemp()
        self.project_path = Path(self.temp_dir) / "test_project"
        self.project_path.mkdir(parents=True, exist_ok=True)
        
        self.project_data = {
            "schema_version": "1.0",
            "project_name": "grid_optimization_test",
            "capabilities": {
                "grid_generation": True,
                "promotion_engine": True,
                "qa_engine": True,
                "autofix_engine": True,
                "grid_format_optimization": True  # Nouvelle capacité
            },
            "generation_status": {
                "grid": "pending",
                "promotion": "pending",
                "format_optimization": "pending"  # Nouveau statut
            },
            "storyboard": {
                "shots": [
                    {
                        "shot_id": "shot_01",
                        "description": "Action sequence with high motion",
                        "duration": 3.5,
                        "content_hints": {
                            "motion_intensity": "high",
                            "scene_complexity": "medium",
                            "temporal_requirements": True
                        }
                    },
                    {
                        "shot_id": "shot_02",
                        "description": "Character dialogue scene",
                        "duration": 2.0,
                        "content_hints": {
                            "motion_intensity": "low",
                            "scene_complexity": "low",
                            "temporal_requirements": False
                        }
                    }
                ]
            },
            "characters": [
                {"name": "hero", "role": "protagonist"},
                {"name": "villain", "role": "antagonist"}
            ],
            "format_optimization": {
                "enabled": True,
                "preferences": {
                    "auto_selection": True,
                    "quality_vs_speed": 0.7,
                    "minimum_quality_threshold": 75.0
                }
            }
        }
    
    def test_data_contract_v1_compliance(self):
        """Test de conformité avec le Data Contract v1."""
        # Analyse du contenu
        content_analysis = self.optimizer.analyze_content(self.project_data)
        
        # Vérification que l'analyse extrait correctement les données du contrat
        assert content_analysis.content_type in ["action", "dialogue", "landscape", "portrait"]
        assert 0.0 <= content_analysis.scene_complexity <= 1.0
        assert 0.0 <= content_analysis.motion_intensity <= 1.0
        assert content_analysis.character_count == 2
        
        # Test de recommandation
        recommendation = self.optimizer.get_optimal_format(content_analysis)
        
        # Vérification de la structure de recommandation
        assert isinstance(recommendation.recommended_format, GridFormat)
        assert 0.0 <= recommendation.confidence_score <= 1.0
        assert recommendation.estimated_processing_time > 0.0
        assert len(recommendation.justification) > 0
    
    def test_enhanced_content_analysis_with_hints(self):
        """Test d'analyse de contenu enrichie avec les indices du Data Contract."""
        # Modification du projet avec des indices de contenu détaillés
        enhanced_project = self.project_data.copy()
        enhanced_project["storyboard"]["shots"][0]["content_hints"] = {
            "motion_intensity": "very_high",
            "scene_complexity": "high", 
            "temporal_requirements": True,
            "dominant_colors": ["red", "orange", "yellow"],
            "aspect_ratio_preference": "16:9"
        }
        
        content_analysis = self.optimizer.analyze_content(enhanced_project)
        
        # L'analyse devrait refléter les indices fournis
        assert content_analysis.motion_intensity >= 0.7  # "very_high"
        assert content_analysis.temporal_requirements == True
        
        # Test de recommandation avec ces indices
        recommendation = self.optimizer.get_optimal_format(content_analysis)
        
        # Avec motion_intensity très élevé et exigences temporelles,
        # un format linéaire devrait être fortement recommandé
        assert recommendation.recommended_format.is_linear
    
    def test_preferences_from_data_contract(self):
        """Test d'extraction des préférences depuis le Data Contract."""
        # Configuration des préférences depuis le projet
        if "format_optimization" in self.project_data:
            prefs_data = self.project_data["format_optimization"]["preferences"]
            
            preferences = FormatPreferences(
                preferred_formats=list(GridFormat),  # Tous par défaut
                quality_vs_speed_preference=prefs_data.get("quality_vs_speed", 0.7),
                auto_format_selection=prefs_data.get("auto_selection", True),
                minimum_quality_threshold=prefs_data.get("minimum_quality_threshold", 75.0),
                maximum_processing_time=prefs_data.get("max_processing_time"),
                custom_format_weights=prefs_data.get("format_weights", {})
            )
            
            # Configuration de l'optimiseur avec ces préférences
            self.optimizer.configure_format_preferences(preferences)
            
            # Test de recommandation avec préférences appliquées
            content_analysis = self.optimizer.analyze_content(self.project_data)
            recommendation = self.optimizer.get_optimal_format(content_analysis, preferences)
            
            # Vérification que les préférences sont respectées
            assert recommendation.confidence_score >= preferences.minimum_quality_threshold / 100.0 or \
                   recommendation.recommended_format == GridFormat.SQUARE_3X3  # Fallback
    
    def test_project_metadata_update(self):
        """Test de mise à jour des métadonnées du projet."""
        # Sauvegarde du projet initial
        project_file = self.project_path / "project.json"
        with open(project_file, 'w') as f:
            json.dump(self.project_data, f, indent=2)
        
        # Analyse et recommandation
        content_analysis = self.optimizer.analyze_content(self.project_data)
        recommendation = self.optimizer.get_optimal_format(content_analysis)
        
        # Simulation de mise à jour du projet avec les résultats d'optimisation
        updated_project = self.project_data.copy()
        updated_project["generation_status"]["format_optimization"] = "completed"
        updated_project["format_optimization"]["results"] = {
            "recommended_format": recommendation.recommended_format.value,
            "confidence_score": recommendation.confidence_score,
            "predicted_improvement": recommendation.predicted_quality_improvement,
            "estimated_time": recommendation.estimated_processing_time,
            "justification": recommendation.justification,
            "alternatives": [
                {"format": alt[0].value, "score": alt[1]} 
                for alt in recommendation.alternatives
            ],
            "analysis_timestamp": datetime.utcnow().isoformat() + "Z"
        }
        
        # Sauvegarde des résultats
        with open(project_file, 'w') as f:
            json.dump(updated_project, f, indent=2)
        
        # Vérification de la persistance
        with open(project_file, 'r') as f:
            saved_project = json.load(f)
        
        assert saved_project["generation_status"]["format_optimization"] == "completed"
        assert "results" in saved_project["format_optimization"]
        assert saved_project["format_optimization"]["results"]["recommended_format"] == recommendation.recommended_format.value
    
    def test_capability_detection(self):
        """Test de détection des capacités d'optimisation."""
        # Projet avec capacité d'optimisation activée
        enabled_project = self.project_data.copy()
        enabled_project["capabilities"]["grid_format_optimization"] = True
        
        # L'optimiseur devrait fonctionner normalement
        content_analysis = self.optimizer.analyze_content(enabled_project)
        recommendation = self.optimizer.get_optimal_format(content_analysis)
        
        assert isinstance(recommendation.recommended_format, GridFormat)
        
        # Projet avec capacité d'optimisation désactivée
        disabled_project = self.project_data.copy()
        disabled_project["capabilities"]["grid_format_optimization"] = False
        
        # L'optimiseur devrait toujours fonctionner mais pourrait adapter son comportement
        content_analysis_disabled = self.optimizer.analyze_content(disabled_project)
        recommendation_disabled = self.optimizer.get_optimal_format(content_analysis_disabled)
        
        assert isinstance(recommendation_disabled.recommended_format, GridFormat)
    
    def test_backward_compatibility(self):
        """Test de compatibilité avec les projets existants sans optimisation."""
        # Projet minimal sans métadonnées d'optimisation
        minimal_project = {
            "schema_version": "1.0",
            "project_name": "legacy_project",
            "storyboard": {
                "shots": [
                    {"shot_id": "shot_01", "description": "Basic scene"}
                ]
            }
        }
        
        # L'optimiseur devrait fonctionner avec des valeurs par défaut
        content_analysis = self.optimizer.analyze_content(minimal_project)
        recommendation = self.optimizer.get_optimal_format(content_analysis)
        
        assert isinstance(recommendation.recommended_format, GridFormat)
        assert recommendation.confidence_score > 0.0
    
    def test_validation_with_data_contract(self):
        """Test de validation avec le Data Contract v1."""
        # Test de validation de formats avec projet conforme
        for format_spec in ["3x3", "1x2", "1x3", "1x4"]:
            validation = self.optimizer.validate_format_compatibility(format_spec)
            
            # Tous les formats devraient être compatibles avec le Data Contract v1
            assert validation.is_valid, f"Format {format_spec} devrait être compatible avec Data Contract v1"
        
        # Test avec format invalide
        invalid_validation = self.optimizer.validate_format_compatibility("5x5")
        assert not invalid_validation.is_valid
        assert "non supporté" in invalid_validation.error_message
    
    def test_performance_history_persistence(self):
        """Test de persistance de l'historique des performances."""
        # Génération de plusieurs recommandations pour créer un historique
        for i in range(3):
            modified_project = self.project_data.copy()
            modified_project["project_name"] = f"test_project_{i}"
            
            content_analysis = self.optimizer.analyze_content(modified_project)
            recommendation = self.optimizer.get_optimal_format(content_analysis)
        
        # Récupération de l'historique
        history = self.optimizer.get_performance_history()
        
        # Vérification de la structure conforme au Data Contract
        assert "recommendations" in history
        assert "config" in history
        assert "timestamp" in history
        
        # Vérification que l'historique contient des données
        assert len(history["recommendations"]) > 0
        
        # Structure des entrées d'historique
        for format_key, entries in history["recommendations"].items():
            assert format_key in [f.value for f in GridFormat]
            for entry in entries:
                assert "timestamp" in entry
                assert "content_type" in entry
                assert "confidence_score" in entry
                assert "predicted_improvement" in entry
                assert "estimated_time" in entry
    
    def test_error_handling_with_data_contract(self):
        """Test de gestion d'erreurs avec le Data Contract v1."""
        # Test avec projet malformé - le système est tolérant et utilise des valeurs par défaut
        malformed_project = {
            "invalid_field": "invalid_value"
        }
        
        # Le système devrait gérer gracieusement les données manquantes
        content_analysis = self.optimizer.analyze_content(malformed_project)
        assert isinstance(content_analysis.content_type, str)
        
        # Test avec données partielles mais valides
        partial_project = {
            "project_name": "partial_test",
            "storyboard": {"shots": []}
        }
        
        # Devrait fonctionner avec des valeurs par défaut
        content_analysis = self.optimizer.analyze_content(partial_project)
        assert isinstance(content_analysis.content_type, str)
    
    def teardown_method(self):
        """Nettoyage après chaque test."""
        import shutil
        try:
            shutil.rmtree(self.temp_dir)
        except:
            pass