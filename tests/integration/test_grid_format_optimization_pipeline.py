"""
Tests d'intégration avec le pipeline StoryCore-Engine existant.
"""

import pytest
import tempfile
import json
from pathlib import Path

from src.grid_format_optimization import GridFormatOptimizer, GridFormat
from src.grid_generator import GridGenerator


class TestGridFormatOptimizationPipeline:
    """Tests d'intégration avec le pipeline existant."""
    
    def setup_method(self):
        """Configuration pour chaque test."""
        self.optimizer = GridFormatOptimizer()
        self.grid_generator = GridGenerator()
        
        # Création d'un projet temporaire
        self.temp_dir = tempfile.mkdtemp()
        self.project_path = Path(self.temp_dir) / "test_project"
        self.project_path.mkdir(parents=True, exist_ok=True)
        
        # Création d'un project.json de base
        self.project_data = {
            "project_name": "test_optimization",
            "schema_version": "1.0",
            "storyboard": {
                "shots": [
                    {
                        "shot_id": "shot_01",
                        "description": "Action sequence with fast movement and combat",
                        "duration": 3.0
                    },
                    {
                        "shot_id": "shot_02", 
                        "description": "Character dialogue in close-up",
                        "duration": 2.5
                    },
                    {
                        "shot_id": "shot_03",
                        "description": "Wide landscape establishing shot",
                        "duration": 4.0
                    }
                ]
            },
            "characters": ["hero", "villain"],
            "capabilities": {
                "grid_generation": True,
                "promotion_engine": True,
                "qa_engine": True,
                "autofix_engine": True
            },
            "generation_status": {
                "grid": "pending",
                "promotion": "pending"
            }
        }
        
        # Sauvegarde du project.json
        with open(self.project_path / "project.json", 'w') as f:
            json.dump(self.project_data, f, indent=2)
    
    def test_integration_with_grid_generator(self):
        """Test d'intégration avec le générateur de grille existant."""
        # 1. Analyse du contenu et recommandation de format
        content_analysis = self.optimizer.analyze_content(self.project_data)
        recommendation = self.optimizer.get_optimal_format(content_analysis)
        
        # 2. Génération de grille avec le format recommandé
        grid_path = self.grid_generator.generate_grid(
            project_dir=str(self.project_path),
            grid_spec=recommendation.recommended_format.value,
            cell_size=256
        )
        
        # 3. Vérification que la grille a été générée
        assert Path(grid_path).exists()
        
        # 4. Vérification que le project.json a été mis à jour
        with open(self.project_path / "project.json", 'r') as f:
            updated_project = json.load(f)
        
        assert "asset_manifest" in updated_project
        assert "grid" in updated_project["asset_manifest"]
        assert updated_project["asset_manifest"]["grid"]["dimensions"] == recommendation.recommended_format.value
    
    def test_format_optimization_for_action_content(self):
        """Test d'optimisation spécifique pour contenu d'action."""
        # Modification du projet pour contenu d'action intense
        action_project = self.project_data.copy()
        action_project["storyboard"]["shots"] = [
            {"description": "High-speed chase sequence", "duration": 5.0},
            {"description": "Combat with multiple characters", "duration": 4.0},
            {"description": "Explosive action finale", "duration": 6.0}
        ]
        
        # Analyse et recommandation
        content_analysis = self.optimizer.analyze_content(action_project)
        recommendation = self.optimizer.get_optimal_format(content_analysis)
        
        # Pour du contenu d'action, les formats linéaires devraient être privilégiés
        assert recommendation.recommended_format.is_linear
        assert recommendation.recommended_format in [GridFormat.LINEAR_1X3, GridFormat.LINEAR_1X4]
        
        # Génération avec le format optimisé
        grid_path = self.grid_generator.generate_grid(
            project_dir=str(self.project_path),
            grid_spec=recommendation.recommended_format.value,
            cell_size=256
        )
        
        assert Path(grid_path).exists()
    
    def test_format_optimization_for_dialogue_content(self):
        """Test d'optimisation spécifique pour contenu de dialogue."""
        # Modification du projet pour contenu de dialogue
        dialogue_project = self.project_data.copy()
        dialogue_project["storyboard"]["shots"] = [
            {"description": "Two characters in conversation", "duration": 3.0},
            {"description": "Close-up dialogue exchange", "duration": 2.0}
        ]
        
        # Analyse et recommandation
        content_analysis = self.optimizer.analyze_content(dialogue_project)
        recommendation = self.optimizer.get_optimal_format(content_analysis)
        
        # Pour du contenu de dialogue, le format 1x2 devrait être considéré
        # ou au minimum un format linéaire
        assert recommendation.recommended_format in [
            GridFormat.LINEAR_1X2, GridFormat.LINEAR_1X3, GridFormat.SQUARE_3X3
        ]
        
        # Génération avec le format optimisé
        grid_path = self.grid_generator.generate_grid(
            project_dir=str(self.project_path),
            grid_spec=recommendation.recommended_format.value,
            cell_size=256
        )
        
        assert Path(grid_path).exists()
    
    def test_compatibility_with_existing_formats(self):
        """Test de compatibilité avec les formats existants."""
        # Test de tous les formats supportés par le générateur existant
        supported_formats = ["3x3", "1x2", "1x4"]
        
        for format_spec in supported_formats:
            # Validation de compatibilité
            validation = self.optimizer.validate_format_compatibility(format_spec)
            assert validation.is_valid, f"Format {format_spec} devrait être compatible"
            
            # Test de génération
            grid_path = self.grid_generator.generate_grid(
                project_dir=str(self.project_path),
                grid_spec=format_spec,
                cell_size=256
            )
            
            assert Path(grid_path).exists()
            
            # Nettoyage pour le test suivant
            Path(grid_path).unlink(missing_ok=True)
    
    def test_format_1x3_support_extension(self):
        """Test du support étendu pour le format 1x3."""
        # Le format 1x3 n'est pas encore supporté par le générateur existant
        # mais devrait être validé par l'optimiseur
        
        validation = self.optimizer.validate_format_compatibility("1x3")
        
        # L'optimiseur devrait reconnaître le format comme valide
        assert validation.is_valid
        
        # Test de recommandation du format 1x3
        action_content = {
            "storyboard": {
                "shots": [
                    {"description": "Action sequence part 1"},
                    {"description": "Action sequence part 2"}, 
                    {"description": "Action sequence finale"}
                ]
            },
            "characters": ["hero"]
        }
        
        content_analysis = self.optimizer.analyze_content(action_content)
        recommendation = self.optimizer.get_optimal_format(content_analysis)
        
        # Le format 1x3 devrait être une option viable
        format_values = [alt[0].value for alt in recommendation.alternatives]
        format_values.append(recommendation.recommended_format.value)
        
        assert "1x3" in format_values
    
    def test_performance_metrics_integration(self):
        """Test d'intégration des métriques de performance."""
        # Analyse avec suivi des performances activé
        content_analysis = self.optimizer.analyze_content(self.project_data)
        recommendation = self.optimizer.get_optimal_format(content_analysis)
        
        # Vérification des métriques de performance
        assert recommendation.estimated_processing_time > 0
        assert recommendation.predicted_quality_improvement >= 0
        
        # Génération avec mesure du temps (simulation)
        import time
        start_time = time.time()
        
        grid_path = self.grid_generator.generate_grid(
            project_dir=str(self.project_path),
            grid_spec=recommendation.recommended_format.value,
            cell_size=256
        )
        
        actual_time = time.time() - start_time
        
        # Le temps réel devrait être dans un ordre de grandeur raisonnable
        # par rapport à l'estimation (facteur 10 max pour les tests)
        assert actual_time < recommendation.estimated_processing_time * 10
        
        assert Path(grid_path).exists()
    
    def test_quality_improvement_threshold(self):
        """Test du seuil d'amélioration de qualité."""
        content_analysis = self.optimizer.analyze_content(self.project_data)
        recommendation = self.optimizer.get_optimal_format(content_analysis)
        
        # Si l'amélioration prédite est >= 15%, le format devrait être recommandé
        if recommendation.predicted_quality_improvement >= 15.0:
            # Le format recommandé ne devrait pas être 3x3
            assert recommendation.recommended_format != GridFormat.SQUARE_3X3
        
        # Test avec contenu spécifiquement optimisé pour formats linéaires
        optimized_content = {
            "storyboard": {
                "shots": [
                    {"description": "Fast action with temporal continuity requirements"},
                    {"description": "Sequential action building tension"},
                    {"description": "Climactic action sequence"},
                    {"description": "Resolution with smooth transitions"}
                ]
            },
            "characters": ["protagonist"]
        }
        
        optimized_analysis = self.optimizer.analyze_content(optimized_content)
        optimized_recommendation = self.optimizer.get_optimal_format(optimized_analysis)
        
        # Ce contenu devrait fortement favoriser les formats linéaires
        assert optimized_recommendation.recommended_format.is_linear
    
    def test_data_contract_v1_compliance(self):
        """Test de conformité avec le Data Contract v1."""
        # Génération avec format optimisé
        content_analysis = self.optimizer.analyze_content(self.project_data)
        recommendation = self.optimizer.get_optimal_format(content_analysis)
        
        grid_path = self.grid_generator.generate_grid(
            project_dir=str(self.project_path),
            grid_spec=recommendation.recommended_format.value,
            cell_size=256
        )
        
        # Vérification de la conformité du project.json mis à jour
        with open(self.project_path / "project.json", 'r') as f:
            updated_project = json.load(f)
        
        # Vérification des champs requis du Data Contract v1
        assert "schema_version" in updated_project
        assert "project_name" in updated_project
        assert "capabilities" in updated_project
        assert "generation_status" in updated_project
        assert "asset_manifest" in updated_project
        
        # Vérification des métadonnées de grille
        grid_manifest = updated_project["asset_manifest"]["grid"]
        assert "asset_id" in grid_manifest
        assert "path" in grid_manifest
        assert "type" in grid_manifest
        assert "dimensions" in grid_manifest
        assert "created_at" in grid_manifest
        
        # Le format dans les métadonnées devrait correspondre à la recommandation
        assert grid_manifest["dimensions"] == recommendation.recommended_format.value
    
    def teardown_method(self):
        """Nettoyage après chaque test."""
        import shutil
        try:
            shutil.rmtree(self.temp_dir)
        except:
            pass  # Ignore les erreurs de nettoyage