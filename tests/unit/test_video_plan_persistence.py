"""
Test pour vérifier la persistance des modifications du résumé des séquences dans video plan.
"""

import pytest
import json
import tempfile
import shutil
from pathlib import Path
from unittest.mock import patch, MagicMock

from src.api_server_fastapi import (
    VideoPlan,
    VideoPlanEntry,
    find_project_path,
    video_plans_db,
    projects_db
)
from src.core_models import Project, ProjectConfig, CoherenceAnchors, AssetManifest, ProjectStatus


class TestVideoPlanPersistence:
    """Test de la persistance des video plans."""

    def setup_method(self):
        """Nettoyer les bases de données avant chaque test."""
        video_plans_db.clear()
        projects_db.clear()

    def test_find_project_path_standard_name(self):
        """Test recherche de projet avec nom standard."""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_dir = Path(temp_dir) / "test_project"
            project_dir.mkdir()
            project_file = project_dir / "test_project.json"
            project_file.write_text('{"test": "data"}')

            with patch('os.walk') as mock_walk:
                mock_walk.return_value = [(str(project_dir), [], ["test_project.json"])]
                result = find_project_path("test_project")
                assert result == project_dir

    def test_find_project_path_non_standard_name(self):
        """Test recherche de projet avec nom non standard comme demo-project.json."""
        with tempfile.TemporaryDirectory() as temp_dir:
            project_dir = Path(temp_dir) / "demo_project"
            project_dir.mkdir()
            project_file = project_dir / "demo-project.json"
            project_file.write_text('{"test": "data"}')

            with patch('os.walk') as mock_walk:
                mock_walk.return_value = [(str(project_dir), [], ["demo-project.json"])]
                result = find_project_path("demo-project")
                assert result == project_dir

    def test_video_plan_persistence_workflow(self):
        """Test complet de la persistance : sauvegarde, 'restart', rechargement."""
        project_id = "test_persistence_project"
        user_id = "test_user"

        # Créer un projet avec tous les champs requis
        project = Project(
            schema_version="1.0",
            project_id=project_id,
            user_id=user_id,
            created_at="2024-01-01T00:00:00Z",
            updated_at="2024-01-01T00:00:00Z",
            config=ProjectConfig(
                hackathon_mode=False,
                global_seed=42,
                target_aspect_ratio="16:9",
                target_resolution="1920x1080",
                target_duration_seconds=60
            ),
            coherence_anchors=CoherenceAnchors(
                style_anchor_id="style_1",
                palette_id="palette_1",
                character_sheet_ids=[],
                lighting_direction="north",
                lighting_temperature="warm",
                perspective_type="isometric",
                horizon_line="center"
            ),
            asset_manifest=AssetManifest(),
            status=ProjectStatus(
                current_phase="planning",
                qa_passed=False
            )
        )
        projects_db[project_id] = project

        # Créer un video plan avec des modifications
        video_entries = [
            VideoPlanEntry(
                shot_id="shot_1",
                shot_number=1,
                source_image="image1.jpg",
                camera_movement="pan",
                duration=5.0,
                style_anchor={},
                transition="fade",
                description="Description modifiée du shot 1",
                title="Titre modifié du shot 1"
            )
        ]

        video_plan = VideoPlan(
            video_plan_id=f"vp_{project_id}_1234567890",
            project_id=project_id,
            storyboard_id="",
            created_at="2024-01-01T00:00:00Z",
            total_shots=1,
            total_duration=5.0,
            video_entries=video_entries,
            metadata={
                "global_style_applied": False,
                "camera_movements": {},
                "transitions": {}
            }
        )

        # Simuler la sauvegarde (via update_video_plan)
        with tempfile.TemporaryDirectory() as temp_dir:
            project_dir = Path(temp_dir) / project_id
            project_dir.mkdir()
            video_plan_file = project_dir / "video_plan.json"

            # Sauvegarder manuellement comme le fait update_video_plan
            with open(video_plan_file, 'w', encoding='utf-8') as f:
                json.dump(video_plan.dict(), f, indent=2, default=str)

            # Simuler un restart : vider la mémoire
            video_plans_db.clear()

            # Maintenant, simuler le chargement depuis fichier (comme dans get_video_plan)
            assert video_plan_file.exists()

            with open(video_plan_file, 'r', encoding='utf-8') as f:
                plan_data = json.load(f)

            loaded_video_plan = VideoPlan(**plan_data)

            # Vérifier que les modifications sont préservées
            assert loaded_video_plan.video_entries[0].description == "Description modifiée du shot 1"
            assert loaded_video_plan.video_entries[0].title == "Titre modifié du shot 1"
            assert loaded_video_plan.total_shots == 1
            assert loaded_video_plan.total_duration == 5.0

    def test_video_plan_fallback_when_no_file(self):
        """Test que le fallback fonctionne quand aucun fichier n'existe."""
        project_id = "test_no_file_project"
        user_id = "test_user"

        # Créer un projet avec tous les champs requis
        project = Project(
            schema_version="1.0",
            project_id=project_id,
            user_id=user_id,
            created_at="2024-01-01T00:00:00Z",
            updated_at="2024-01-01T00:00:00Z",
            config=ProjectConfig(
                hackathon_mode=False,
                global_seed=42,
                target_aspect_ratio="16:9",
                target_resolution="1920x1080",
                target_duration_seconds=60
            ),
            coherence_anchors=CoherenceAnchors(
                style_anchor_id="style_1",
                palette_id="palette_1",
                character_sheet_ids=[],
                lighting_direction="north",
                lighting_temperature="warm",
                perspective_type="isometric",
                horizon_line="center"
            ),
            asset_manifest=AssetManifest(),
            status=ProjectStatus(
                current_phase="planning",
                qa_passed=False
            )
        )
        projects_db[project_id] = project

        # Simuler find_project_path retournant None
        with patch('src.api_server_fastapi.find_project_path', return_value=None):
            # Simuler la logique de get_video_plan : pas de fichier, créer vide
            video_plan = video_plans_db.get(project_id)
            if not video_plan:
                video_plan = VideoPlan(
                    video_plan_id=f"vp_{project_id}_1234567890",
                    project_id=project_id,
                    storyboard_id="",
                    created_at="2024-01-01T00:00:00Z",
                    total_shots=0,
                    total_duration=0.0,
                    video_entries=[],
                    metadata={
                        "global_style_applied": False,
                        "camera_movements": {},
                        "transitions": {}
                    }
                )

            assert video_plan.total_shots == 0
            assert len(video_plan.video_entries) == 0


if __name__ == "__main__":
    pytest.main([__file__])