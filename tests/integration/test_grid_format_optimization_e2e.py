"""
Test end-to-end de l'optimisation des formats de grille.
Démontre le workflow complet d'optimisation intégré au pipeline StoryCore.
"""

import pytest
import tempfile
import json
from pathlib import Path
import subprocess
import sys

from src.grid_format_optimization import GridFormatOptimizer, GridFormat
from src.grid_generator import GridGenerator
from src.grid_format_optimization.cli_integration import optimize_project_format


class TestGridFormatOptimizationE2E:
    """Tests end-to-end pour l'optimisation des formats de grille."""
    
    def setup_method(self):
        """Configuration pour chaque test."""
        # Création d'un environnement de test complet
        self.temp_dir = tempfile.mkdtemp()
        self.project_path = Path(self.temp_dir) / "e2e_test_project"
        self.project_path.mkdir(parents=True, exist_ok=True)
        
        # Projet avec différents types de contenu pour test complet
        self.project_scenarios = {
            "action_project": {
                "schema_version": "1.0",
                "project_name": "action_sequence_test",
                "storyboard": {
                    "shots": [
                        {
                            "shot_id": "shot_01",
                            "description": "High-speed chase through city streets",
                            "duration": 4.0,
                            "content_hints": {
                                "motion_intensity": "very_high",
                                "scene_complexity": "high",
                                "temporal_requirements": True
                            }
                        },
                        {
                            "shot_id": "shot_02", 
                            "description": "Combat sequence with multiple characters",
                            "duration": 5.0,
                            "content_hints": {
                                "motion_intensity": "high",
                                "scene_complexity": "very_high",
                                "temporal_requirements": True
                            }
                        },
                        {
                            "shot_id": "shot_03",
                            "description": "Explosive finale with dramatic effects",
                            "duration": 3.0,
                            "content_hints": {
                                "motion_intensity": "extreme",
                                "scene_complexity": "high",
                                "temporal_requirements": True
                            }
                        },
                        {
                            "shot_id": "shot_04",
                            "description": "Resolution with smooth camera movement",
                            "duration": 2.0,
                            "content_hints": {
                                "motion_intensity": "medium",
                                "scene_complexity": "medium",
                                "temporal_requirements": True
                            }
                        }
                    ]
                },
                "characters": ["hero", "villain", "sidekick"],
                "capabilities": {
                    "grid_generation": True,
                    "promotion_engine": True,
                    "qa_engine": True,
                    "autofix_engine": True,
                    "grid_format_optimization": True
                },
                "format_optimization": {
                    "enabled": True,
                    "preferences": {
                        "auto_selection": True,
                        "quality_vs_speed": 0.8,
                        "minimum_quality_threshold": 80.0
                    }
                }
            },
            "dialogue_project": {
                "schema_version": "1.0",
                "project_name": "character_dialogue_test",
                "storyboard": {
                    "shots": [
                        {
                            "shot_id": "shot_01",
                            "description": "Two characters in intimate conversation",
                            "duration": 3.0,
                            "content_hints": {
                                "motion_intensity": "low",
                                "scene_complexity": "low",
                                "temporal_requirements": False
                            }
                        },
                        {
                            "shot_id": "shot_02",
                            "description": "Close-up emotional exchange",
                            "duration": 2.5,
                            "content_hints": {
                                "motion_intensity": "very_low",
                                "scene_complexity": "low",
                                "temporal_requirements": False
                            }
                        }
                    ]
                },
                "characters": ["character_a", "character_b"],
                "capabilities": {
                    "grid_generation": True,
                    "promotion_engine": True,
                    "qa_engine": True,
                    "autofix_engine": True,
                    "grid_format_optimization": True
                },
                "format_optimization": {
                    "enabled": True,
                    "preferences": {
                        "auto_selection": True,
                        "quality_vs_speed": 0.6,
                        "minimum_quality_threshold": 75.0
                    }
                }
            }
        }
    
    def test_complete_action_sequence_optimization(self):
        """Test complet d'optimisation pour séquence d'action."""
        # 1. Création du projet d'action
        project_data = self.project_scenarios["action_project"]
        project_file = self.project_path / "project.json"
        
        with open(project_file, 'w') as f:
            json.dump(project_data, f, indent=2)
        
        # 2. Optimisation programmatique
        optimization_result = optimize_project_format(
            str(self.project_path),
            quality_vs_speed=0.8,
            min_quality=80.0
        )
        
        assert optimization_result["success"] == True
        
        content_analysis = optimization_result["content_analysis"]
        recommendation = optimization_result["recommendation"]
        
        # 3. Vérifications spécifiques au contenu d'action
        assert content_analysis.content_type == "action"
        assert content_analysis.motion_intensity >= 0.7  # Mouvement intense
        assert content_analysis.temporal_requirements == True
        
        # 4. Le format recommandé devrait être linéaire pour l'action
        assert recommendation.recommended_format.is_linear
        assert recommendation.recommended_format in [GridFormat.LINEAR_1X3, GridFormat.LINEAR_1X4]
        
        # 5. Génération de grille avec format optimisé
        grid_generator = GridGenerator()
        grid_path = grid_generator.generate_grid(
            project_dir=str(self.project_path),
            grid_spec=recommendation.recommended_format.value,
            cell_size=256
        )
        
        assert Path(grid_path).exists()
        
        # 6. Vérification de la mise à jour du project.json
        with open(project_file, 'r') as f:
            updated_project = json.load(f)
        
        assert "asset_manifest" in updated_project
        assert updated_project["asset_manifest"]["grid"]["dimensions"] == recommendation.recommended_format.value
        
        # 7. Vérification du nombre de panels correct
        expected_panels = recommendation.recommended_format.panel_count
        actual_panels = len(updated_project["asset_manifest"]["panels"])
        assert actual_panels == expected_panels
        
        print(f"✓ Action sequence optimized to {recommendation.recommended_format.value}")
        print(f"  Confidence: {recommendation.confidence_score:.1%}")
        print(f"  Predicted improvement: +{recommendation.predicted_quality_improvement:.1f}%")
    
    def test_complete_dialogue_sequence_optimization(self):
        """Test complet d'optimisation pour séquence de dialogue."""
        # 1. Création du projet de dialogue
        project_data = self.project_scenarios["dialogue_project"]
        project_file = self.project_path / "project.json"
        
        with open(project_file, 'w') as f:
            json.dump(project_data, f, indent=2)
        
        # 2. Optimisation avec préférences pour dialogue
        optimization_result = optimize_project_format(
            str(self.project_path),
            quality_vs_speed=0.6,  # Plus orienté vitesse pour dialogue
            min_quality=75.0
        )
        
        assert optimization_result["success"] == True
        
        content_analysis = optimization_result["content_analysis"]
        recommendation = optimization_result["recommendation"]
        
        # 3. Vérifications spécifiques au contenu de dialogue
        assert content_analysis.content_type == "dialogue"
        assert content_analysis.motion_intensity <= 0.4  # Mouvement faible
        assert content_analysis.temporal_requirements == False
        
        # 4. Le format recommandé devrait être adapté au dialogue
        # (1x2 optimal, mais 1x3 ou 3x3 acceptables)
        assert recommendation.recommended_format in [
            GridFormat.LINEAR_1X2, GridFormat.LINEAR_1X3, GridFormat.SQUARE_3X3
        ]
        
        # 5. Génération et vérification
        grid_generator = GridGenerator()
        grid_path = grid_generator.generate_grid(
            project_dir=str(self.project_path),
            grid_spec=recommendation.recommended_format.value,
            cell_size=256
        )
        
        assert Path(grid_path).exists()
        
        print(f"✓ Dialogue sequence optimized to {recommendation.recommended_format.value}")
        print(f"  Confidence: {recommendation.confidence_score:.1%}")
    
    def test_format_comparison_analysis(self):
        """Test d'analyse comparative entre formats."""
        # Utilisation du projet d'action pour comparaison
        project_data = self.project_scenarios["action_project"]
        
        optimizer = GridFormatOptimizer()
        content_analysis = optimizer.analyze_content(project_data)
        
        # Test de tous les formats disponibles
        format_results = {}
        
        for format_type in GridFormat:
            # Validation de compatibilité
            validation = optimizer.validate_format_compatibility(format_type.value)
            assert validation.is_valid, f"Format {format_type.value} devrait être compatible"
            
            # Prédiction de qualité pour chaque format
            from src.grid_format_optimization.quality_predictor import QualityPredictor
            predictor = QualityPredictor()
            
            prediction = predictor.predict_quality_metrics(format_type, content_analysis)
            format_results[format_type] = prediction
        
        # Analyse comparative
        baseline_score = format_results[GridFormat.SQUARE_3X3].predicted_quality_score
        
        improvements = {}
        for format_type, prediction in format_results.items():
            if format_type != GridFormat.SQUARE_3X3:
                improvement = ((prediction.predicted_quality_score - baseline_score) / baseline_score) * 100
                improvements[format_type] = improvement
        
        # Pour du contenu d'action, les formats linéaires devraient montrer des améliorations
        linear_formats = [f for f in improvements.keys() if f.is_linear]
        assert len(linear_formats) > 0
        
        # Au moins un format linéaire devrait montrer une amélioration
        best_linear_improvement = max(improvements[f] for f in linear_formats)
        assert best_linear_improvement > 0, "Les formats linéaires devraient améliorer la qualité pour l'action"
        
        print("📊 Format Comparison Results:")
        for format_type, improvement in improvements.items():
            print(f"  {format_type.value}: {improvement:+.1f}% vs 3x3")
    
    def test_quality_threshold_enforcement(self):
        """Test d'application des seuils de qualité."""
        project_data = self.project_scenarios["action_project"]
        project_file = self.project_path / "project.json"

        with open(project_file, 'w') as f:
            json.dump(project_data, f, indent=2)

        # Test avec seuil de qualité élevé
        high_threshold_result = optimize_project_format(
            str(self.project_path),
            min_quality=90.0  # Seuil très élevé
        )
        
        # Test avec seuil de qualité standard
        standard_threshold_result = optimize_project_format(
            str(self.project_path),
            min_quality=75.0  # Seuil standard
        )
        
        # Les deux devraient réussir mais potentiellement avec des formats différents
        assert high_threshold_result["success"] == True
        assert standard_threshold_result["success"] == True
        
        high_rec = high_threshold_result["recommendation"]
        standard_rec = standard_threshold_result["recommendation"]
        
        # Avec un seuil élevé, le système pourrait choisir un format plus conservateur
        print(f"High threshold ({90.0}%): {high_rec.recommended_format.value}")
        print(f"Standard threshold ({75.0}%): {standard_rec.recommended_format.value}")
    
    def test_performance_constraint_handling(self):
        """Test de gestion des contraintes de performance."""
        project_data = self.project_scenarios["action_project"]
        project_file = self.project_path / "project.json"

        with open(project_file, 'w') as f:
            json.dump(project_data, f, indent=2)

        # Test avec contrainte de temps stricte
        fast_result = optimize_project_format(
            str(self.project_path),
            max_time=60.0,  # 1 minute maximum
            quality_vs_speed=0.3  # Priorité à la vitesse
        )
        
        # Test avec contrainte de temps relâchée
        quality_result = optimize_project_format(
            str(self.project_path),
            max_time=300.0,  # 5 minutes maximum
            quality_vs_speed=0.9  # Priorité à la qualité
        )
        
        assert fast_result["success"] == True
        assert quality_result["success"] == True
        
        fast_rec = fast_result["recommendation"]
        quality_rec = quality_result["recommendation"]
        
        # Le résultat rapide devrait avoir un temps estimé plus court
        assert fast_rec.estimated_processing_time <= quality_rec.estimated_processing_time
        
        print(f"Fast optimization: {fast_rec.recommended_format.value} ({fast_rec.estimated_processing_time:.1f}s)")
        print(f"Quality optimization: {quality_rec.recommended_format.value} ({quality_rec.estimated_processing_time:.1f}s)")
    
    def test_integration_with_existing_pipeline(self):
        """Test d'intégration avec le pipeline StoryCore existant."""
        # Création d'un projet avec le workflow complet
        project_data = self.project_scenarios["action_project"]
        project_file = self.project_path / "project.json"
        
        with open(project_file, 'w') as f:
            json.dump(project_data, f, indent=2)
        
        # 1. Optimisation du format
        optimization_result = optimize_project_format(str(self.project_path))
        recommendation = optimization_result["recommendation"]
        
        # 2. Génération de grille avec format optimisé
        grid_generator = GridGenerator()
        grid_path = grid_generator.generate_grid(
            project_dir=str(self.project_path),
            grid_spec=recommendation.recommended_format.value,
            cell_size=256
        )
        
        # 3. Vérification de l'intégration complète
        assert Path(grid_path).exists()
        
        # 4. Vérification du Data Contract v1
        with open(project_file, 'r') as f:
            final_project = json.load(f)
        
        # Vérifications de conformité
        assert final_project["schema_version"] == "1.0"
        assert "asset_manifest" in final_project
        assert "grid" in final_project["asset_manifest"]
        assert "panels" in final_project["asset_manifest"]
        
        # Vérification de la cohérence des formats
        grid_format = final_project["asset_manifest"]["grid"]["dimensions"]
        panel_count = len(final_project["asset_manifest"]["panels"])
        
        expected_count = GridFormat(grid_format).panel_count
        assert panel_count == expected_count
        
        print(f"✓ Complete pipeline integration successful")
        print(f"  Format: {grid_format}")
        print(f"  Panels: {panel_count}")
        print(f"  Grid: {Path(grid_path).name}")
    
    def test_error_recovery_and_fallbacks(self):
        """Test de récupération d'erreurs et fallbacks."""
        # Projet avec données problématiques
        problematic_project = {
            "schema_version": "1.0",
            "project_name": "problematic_test",
            "storyboard": {
                "shots": []  # Pas de shots
            },
            "characters": []  # Pas de personnages
        }
        
        project_file = self.project_path / "project.json"
        with open(project_file, 'w') as f:
            json.dump(problematic_project, f, indent=2)
        
        # L'optimisation devrait fonctionner avec des fallbacks
        result = optimize_project_format(str(self.project_path))
        
        assert result["success"] == True
        
        # Devrait utiliser des valeurs par défaut raisonnables
        content_analysis = result["content_analysis"]
        recommendation = result["recommendation"]
        
        assert content_analysis.content_type in ["action", "dialogue", "landscape", "portrait"]
        assert isinstance(recommendation.recommended_format, GridFormat)
        
        print(f"✓ Error recovery successful: {recommendation.recommended_format.value}")
    
    def teardown_method(self):
        """Nettoyage après chaque test."""
        import shutil
        try:
            shutil.rmtree(self.temp_dir)
        except:
            pass