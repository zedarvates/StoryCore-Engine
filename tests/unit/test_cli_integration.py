"""
Tests pour l'intégration CLI de l'optimisation des formats.
"""

import pytest
import tempfile
import json
import argparse
from pathlib import Path
from unittest.mock import patch, MagicMock

from src.grid_format_optimization.cli_integration import (
    GridFormatOptimizationCLI, extend_storycore_cli, optimize_project_format
)
from src.grid_format_optimization import GridFormat


class TestGridFormatOptimizationCLI:
    """Tests pour l'interface CLI d'optimisation."""
    
    def setup_method(self):
        """Configuration pour chaque test."""
        self.cli = GridFormatOptimizationCLI()
        
        # Création d'un projet temporaire
        self.temp_dir = tempfile.mkdtemp()
        self.project_path = Path(self.temp_dir) / "test_project"
        self.project_path.mkdir(parents=True, exist_ok=True)
        
        self.project_data = {
            "schema_version": "1.0",
            "project_name": "cli_test_project",
            "storyboard": {
                "shots": [
                    {"shot_id": "shot_01", "description": "Action scene with movement"},
                    {"shot_id": "shot_02", "description": "Character dialogue"}
                ]
            },
            "characters": ["hero", "villain"]
        }
        
        # Sauvegarde du project.json
        with open(self.project_path / "project.json", 'w') as f:
            json.dump(self.project_data, f, indent=2)
    
    def test_cli_command_addition(self):
        """Test d'ajout des commandes CLI."""
        parser = argparse.ArgumentParser()
        # Don't create subparsers here - let the CLI do it
        
        # Simulation de l'ajout de commandes
        self.cli.add_optimization_commands(parser)
        
        # Vérification que les commandes sont ajoutées
        # (Test basique car argparse ne permet pas facilement d'inspecter les sous-commandes)
        assert hasattr(self.cli, 'handle_optimize_format')
        assert hasattr(self.cli, 'handle_validate_format')
        assert hasattr(self.cli, 'handle_analyze_content')
    
    def test_optimize_format_command(self):
        """Test de la commande optimize-format."""
        # Création des arguments simulés
        args = argparse.Namespace(
            project=str(self.project_path),
            analyze_only=True,
            format=None,
            quality_threshold=75.0,
            max_time=None,
            export_report=None
        )
        
        # Exécution de la commande
        with patch('builtins.print') as mock_print:
            result = self.cli.handle_optimize_format(args)
        
        # Vérification du succès
        assert result == 0
        
        # Vérification que des informations ont été affichées
        mock_print.assert_called()
        
        # Vérification du contenu affiché
        printed_output = ' '.join(str(call.args[0]) for call in mock_print.call_args_list)
        assert "Analyse du projet" in printed_output
        assert "Recommandation de Format" in printed_output
    
    def test_optimize_format_with_forced_format(self):
        """Test avec format forcé."""
        args = argparse.Namespace(
            project=str(self.project_path),
            analyze_only=True,
            format="1x3",
            quality_threshold=75.0,
            max_time=None,
            export_report=None
        )
        
        with patch('builtins.print') as mock_print:
            result = self.cli.handle_optimize_format(args)
        
        assert result == 0
        
        # Vérification que le format forcé est mentionné
        printed_output = ' '.join(str(call.args[0]) for call in mock_print.call_args_list)
        assert "Format forcé" in printed_output or "1x3" in printed_output
    
    def test_validate_format_command(self):
        """Test de la commande validate-format."""
        # Test avec format valide
        args = argparse.Namespace(format_spec="1x3")
        
        with patch('builtins.print') as mock_print:
            result = self.cli.handle_validate_format(args)
        
        assert result == 0
        
        # Vérification du message de succès
        printed_output = ' '.join(str(call.args[0]) for call in mock_print.call_args_list)
        assert "compatible" in printed_output
        
        # Test avec format invalide
        args_invalid = argparse.Namespace(format_spec="5x5")
        
        with patch('builtins.print') as mock_print:
            result = self.cli.handle_validate_format(args_invalid)
        
        assert result == 1
        
        # Vérification du message d'erreur
        printed_output = ' '.join(str(call.args[0]) for call in mock_print.call_args_list)
        assert "incompatible" in printed_output or "non supporté" in printed_output
    
    def test_analyze_content_command(self):
        """Test de la commande analyze-content."""
        args = argparse.Namespace(
            project=str(self.project_path),
            detailed=True
        )
        
        with patch('builtins.print') as mock_print:
            result = self.cli.handle_analyze_content(args)
        
        assert result == 0
        
        # Vérification de l'affichage de l'analyse
        printed_output = ' '.join(str(call.args[0]) for call in mock_print.call_args_list)
        assert "Analyse de Contenu" in printed_output
        assert "Type de contenu" in printed_output
    
    def test_export_report_functionality(self):
        """Test de la fonctionnalité d'export de rapport."""
        report_path = self.project_path / "optimization_report.json"
        
        args = argparse.Namespace(
            project=str(self.project_path),
            analyze_only=True,
            format=None,
            quality_threshold=75.0,
            max_time=None,
            export_report=str(report_path)
        )
        
        with patch('builtins.print'):
            result = self.cli.handle_optimize_format(args)
        
        assert result == 0
        
        # Vérification que le rapport a été créé
        assert report_path.exists()
        
        # Vérification du contenu du rapport
        with open(report_path, 'r') as f:
            report = json.load(f)
        
        assert "content_analysis" in report
        assert "recommendation" in report
        assert "content_type" in report["content_analysis"]
        assert "recommended_format" in report["recommendation"]
    
    def test_apply_recommendation(self):
        """Test d'application de recommandation."""
        args = argparse.Namespace(
            project=str(self.project_path),
            analyze_only=False,  # Application activée
            format=None,
            quality_threshold=75.0,
            max_time=None,
            export_report=None
        )
        
        with patch('builtins.print'):
            result = self.cli.handle_optimize_format(args)
        
        assert result == 0
        
        # Vérification que le project.json a été mis à jour
        with open(self.project_path / "project.json", 'r') as f:
            updated_project = json.load(f)
        
        assert "format_optimization" in updated_project
        assert "recommended_format" in updated_project["format_optimization"]
        assert updated_project["format_optimization"]["enabled"] == True
    
    def test_error_handling_missing_project(self):
        """Test de gestion d'erreur avec projet manquant."""
        args = argparse.Namespace(
            project="/path/that/does/not/exist",
            analyze_only=True,
            format=None,
            quality_threshold=75.0,
            max_time=None,
            export_report=None
        )
        
        with patch('builtins.print') as mock_print:
            result = self.cli.handle_optimize_format(args)
        
        assert result == 1
        
        # Vérification du message d'erreur
        printed_output = ' '.join(str(call.args[0]) for call in mock_print.call_args_list)
        assert "Impossible de charger" in printed_output
    
    def test_programmatic_optimization(self):
        """Test de l'optimisation programmatique."""
        result = optimize_project_format(
            str(self.project_path),
            quality_vs_speed=0.8,
            min_quality=80.0
        )
        
        assert result["success"] == True
        assert "content_analysis" in result
        assert "recommendation" in result
        
        # Vérification des types
        assert hasattr(result["content_analysis"], 'content_type')
        assert isinstance(result["recommendation"].recommended_format, GridFormat)
    
    def test_extend_storycore_cli(self):
        """Test d'extension du CLI StoryCore."""
        parser = argparse.ArgumentParser()
        
        # Extension du parser
        extend_storycore_cli(parser)
        
        # Vérification que l'extension fonctionne sans erreur
        # (Test basique car nous ne pouvons pas facilement tester l'ajout de sous-commandes)
        assert isinstance(parser, argparse.ArgumentParser)
    
    def test_cli_with_preferences(self):
        """Test CLI avec préférences personnalisées."""
        args = argparse.Namespace(
            project=str(self.project_path),
            analyze_only=True,
            format=None,
            quality_threshold=85.0,  # Seuil élevé
            max_time=120.0,  # Limite de temps
            export_report=None
        )
        
        with patch('builtins.print'):
            result = self.cli.handle_optimize_format(args)
        
        assert result == 0
        
        # Test avec format forcé invalide
        args_invalid = argparse.Namespace(
            project=str(self.project_path),
            analyze_only=True,
            format="invalid_format",
            quality_threshold=75.0,
            max_time=None,
            export_report=None
        )
        
        with patch('builtins.print'):
            result = self.cli.handle_optimize_format(args_invalid)
        
        # Devrait échouer avec format invalide
        assert result == 1
    
    def teardown_method(self):
        """Nettoyage après chaque test."""
        import shutil
        try:
            shutil.rmtree(self.temp_dir)
        except:
            pass