#!/usr/bin/env node
"""
Tests d'acceptation utilisateur pour valider l'expérience utilisateur avec la nouvelle implémentation Python.
Ces tests couvrent les scénarios de bout en bout pour s'assurer que l'application répond aux besoins des utilisateurs.
"""

import pytest
import subprocess
import json
import tempfile
import os
from pathlib import Path


class TestUserAcceptance:
    """Tests d'acceptation utilisateur pour l'application StoryCore-Engine."""

    @pytest.fixture
    def temp_project_dir(self):
        """Créer un répertoire temporaire pour les tests."""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield Path(tmpdir)

    def test_cli_help_command(self):
        """Tester que la commande d'aide fonctionne correctement."""
        result = subprocess.run(
            ["python", "storycore.py", "--help"],
            capture_output=True,
            text=True
        )
        assert result.returncode == 0
        assert "StoryCore-Engine CLI" in result.stdout
        assert "Usage:" in result.stdout

    def test_cli_version_command(self):
        """Tester que la commande de version fonctionne correctement."""
        result = subprocess.run(
            ["python", "storycore.py", "--version"],
            capture_output=True,
            text=True
        )
        assert result.returncode == 0
        assert "StoryCore-Engine" in result.stdout

    def test_init_command_creates_project(self, temp_project_dir):
        """Tester que la commande init crée un projet valide."""
        project_name = "test_project"
        project_path = temp_project_dir / project_name
        
        result = subprocess.run(
            ["python", "storycore.py", "init", project_name],
            cwd=temp_project_dir,
            capture_output=True,
            text=True
        )
        
        assert result.returncode == 0
        assert project_path.exists()
        assert (project_path / "project.json").exists()
        assert (project_path / "config").exists()

    def test_validate_command_on_valid_project(self, temp_project_dir):
        """Tester que la commande validate fonctionne sur un projet valide."""
        # Créer un projet valide
        project_name = "valid_project"
        project_path = temp_project_dir / project_name
        project_path.mkdir()
        
        # Créer une structure de projet minimale
        (project_path / "project.json").write_text(json.dumps({
            "name": project_name,
            "version": "1.0.0"
        }))
        (project_path / "config").mkdir()
        (project_path / "config" / "settings.json").write_text(json.dumps({
            "quality_threshold": 70.0
        }))
        
        result = subprocess.run(
            ["python", "storycore.py", "validate", "--project", str(project_path)],
            capture_output=True,
            text=True
        )
        
        assert result.returncode == 0
        assert "SUCCESS: All validations passed!" in result.stdout

    def test_validate_command_with_quality_check(self, temp_project_dir):
        """Tester la validation avec vérification de qualité."""
        project_name = "quality_project"
        project_path = temp_project_dir / project_name
        project_path.mkdir()
        
        # Créer une structure de projet avec des fichiers multimédias
        (project_path / "project.json").write_text(json.dumps({
            "name": project_name,
            "version": "1.0.0"
        }))
        (project_path / "config").mkdir()
        (project_path / "config" / "settings.json").write_text(json.dumps({
            "quality_threshold": 70.0
        }))
        
        # Créer un fichier vidéo factice
        video_path = project_path / "test_video.mp4"
        video_path.write_bytes(b"fake video data")
        
        result = subprocess.run(
            ["python", "storycore.py", "validate", "--project", str(project_path), "--scope", "quality"],
            capture_output=True,
            text=True
        )
        
        # Vérifier que la validation s'exécute sans erreur critique
        assert result.returncode == 0
        assert "Quality Validation" in result.stdout

    def test_validate_command_with_fix_option(self, temp_project_dir):
        """Tester la commande validate avec l'option de correction automatique."""
        project_name = "fix_project"
        project_path = temp_project_dir / project_name
        project_path.mkdir()
        
        # Créer un projet avec des problèmes de structure
        (project_path / "project.json").write_text(json.dumps({
            "name": project_name,
            "version": "1.0.0"
        }))
        # Ne pas créer le répertoire config pour simuler un problème
        
        result = subprocess.run(
            ["python", "storycore.py", "validate", "--project", str(project_path), "--fix"],
            capture_output=True,
            text=True
        )
        
        assert result.returncode == 0
        assert "Attempting to fix" in result.stdout

    def test_export_command_generates_output(self, temp_project_dir):
        """Tester que la commande export génère des fichiers de sortie."""
        project_name = "export_project"
        project_path = temp_project_dir / project_name
        project_path.mkdir()
        
        # Créer un projet minimal
        (project_path / "project.json").write_text(json.dumps({
            "name": project_name,
            "version": "1.0.0"
        }))
        (project_path / "config").mkdir()
        (project_path / "config" / "settings.json").write_text(json.dumps({
            "output_format": "mp4"
        }))
        
        output_dir = project_path / "output"
        
        result = subprocess.run(
            ["python", "storycore.py", "export", "--project", str(project_path), "--output", str(output_dir)],
            capture_output=True,
            text=True
        )
        
        assert result.returncode == 0
        assert output_dir.exists()

    def test_error_handling_for_invalid_project(self, temp_project_dir):
        """Tester la gestion des erreurs pour un projet invalide."""
        project_path = temp_project_dir / "invalid_project"
        
        result = subprocess.run(
            ["python", "storycore.py", "validate", "--project", str(project_path)],
            capture_output=True,
            text=True
        )
        
        assert result.returncode != 0
        assert "Project directory not found" in result.stderr

    def test_cli_interactive_mode(self):
        """Tester le mode interactif du CLI."""
        result = subprocess.run(
            ["python", "storycore.py", "--interactive"],
            capture_output=True,
            text=True,
            input="exit\n"
        )
        
        assert result.returncode == 0
        assert "Interactive mode" in result.stdout

    def test_validate_command_json_output(self, temp_project_dir):
        """Tester la sortie JSON de la commande validate."""
        project_name = "json_project"
        project_path = temp_project_dir / project_name
        project_path.mkdir()
        
        # Créer un projet valide
        (project_path / "project.json").write_text(json.dumps({
            "name": project_name,
            "version": "1.0.0"
        }))
        (project_path / "config").mkdir()
        (project_path / "config" / "settings.json").write_text(json.dumps({
            "quality_threshold": 70.0
        }))
        
        result = subprocess.run(
            ["python", "storycore.py", "validate", "--project", str(project_path), "--format", "json"],
            capture_output=True,
            text=True
        )
        
        assert result.returncode == 0
        output_data = json.loads(result.stdout)
        assert output_data["overall_passed"] == True
        assert output_data["project"] == str(project_path.absolute())


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
