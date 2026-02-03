"""
Unit tests for ProjectManager.

Tests project opening, closing, loading, and saving operations.
"""

import pytest
from pathlib import Path
from datetime import datetime
import json

from src.assistant.project_manager import ProjectManager
from src.assistant.file_operations import FileOperationsManager
from src.assistant.validator import DataContractValidator
from src.assistant.models import (
    Project, ProjectMetadata, Scene, Character, Sequence, Shot
)
from src.assistant.exceptions import (
    ResourceError, ValidationError, ProjectError
)


@pytest.fixture
def project_dir(tmp_path):
    """Create temporary project directory."""
    return tmp_path / "test_projects"


@pytest.fixture
def file_ops(project_dir):
    """Create file operations manager."""
    return FileOperationsManager(project_dir)


@pytest.fixture
def validator():
    """Create validator."""
    return DataContractValidator()


@pytest.fixture
def project_manager(file_ops, validator):
    """Create project manager."""
    return ProjectManager(file_ops, validator)


@pytest.fixture
def sample_project_data():
    """Create sample project data."""
    return {
        "schema_version": "1.0",
        "project_name": "test_project",
        "capabilities": {
            "grid_generation": True,
            "promotion_engine": True,
            "qa_engine": True,
            "autofix_engine": True
        },
        "generation_status": {
            "grid": "pending",
            "promotion": "pending"
        },
        "created_at": datetime.now().isoformat(),
        "modified_at": datetime.now().isoformat(),
        "scenes": [
            {
                "id": "scene_1",
                "number": 1,
                "title": "Opening Scene",
                "description": "A dramatic opening",
                "location": "City Street",
                "time_of_day": "Night",
                "duration": 5.0,
                "characters": ["char_1"],
                "key_actions": ["Character walks down street"],
                "visual_notes": "Dark and moody"
            }
        ],
        "characters": [
            {
                "id": "char_1",
                "name": "John Doe",
                "role": "Protagonist",
                "description": "A mysterious figure",
                "appearance": "Tall, dark coat, fedora",
                "personality": "Brooding and determined",
                "visual_reference": None
            }
        ],
        "sequences": [
            {
                "id": "seq_1",
                "scene_id": "scene_1",
                "total_duration": 5.0,
                "shots": [
                    {
                        "id": "shot_1",
                        "number": 1,
                        "type": "wide",
                        "camera_movement": "dolly",
                        "duration": 5.0,
                        "description": "Wide shot of city street",
                        "visual_style": "Film noir"
                    }
                ]
            }
        ]
    }


def create_test_project(project_dir, project_name, project_data):
    """Helper to create a test project on disk."""
    project_path = project_dir / project_name
    project_path.mkdir(parents=True, exist_ok=True)
    
    project_json_path = project_path / "project.json"
    with open(project_json_path, 'w') as f:
        json.dump(project_data, f, indent=2)
    
    return project_path


class TestProjectManager:
    """Test ProjectManager functionality."""
    
    def test_list_projects_empty(self, project_manager):
        """Test listing projects when directory is empty."""
        projects = project_manager.list_projects()
        assert projects == []
    
    def test_list_projects_with_projects(self, project_manager, project_dir, sample_project_data):
        """Test listing projects when projects exist."""
        # Create test projects
        create_test_project(project_dir, "project1", sample_project_data)
        
        project_data_2 = sample_project_data.copy()
        project_data_2["project_name"] = "project2"
        create_test_project(project_dir, "project2", project_data_2)
        
        projects = project_manager.list_projects()
        assert len(projects) == 2
        assert "project1" in projects
        assert "project2" in projects
    
    def test_open_project_success(self, project_manager, project_dir, sample_project_data):
        """Test successfully opening a project."""
        # Create test project
        create_test_project(project_dir, "test_project", sample_project_data)
        
        # Open project
        project = project_manager.open_project("test_project")
        
        # Verify project loaded correctly
        assert project.name == "test_project"
        assert project.metadata.schema_version == "1.0"
        assert project.metadata.project_name == "test_project"
        assert len(project.scenes) == 1
        assert len(project.characters) == 1
        assert len(project.sequences) == 1
        
        # Verify scene data
        scene = project.scenes[0]
        assert scene.id == "scene_1"
        assert scene.title == "Opening Scene"
        assert scene.duration == 5.0
        
        # Verify character data
        character = project.characters[0]
        assert character.id == "char_1"
        assert character.name == "John Doe"
        
        # Verify sequence data
        sequence = project.sequences[0]
        assert sequence.id == "seq_1"
        assert len(sequence.shots) == 1
        
        # Verify active project is set
        assert project_manager.active_project == project
    
    def test_open_project_not_found(self, project_manager):
        """Test opening non-existent project."""
        with pytest.raises(ResourceError) as exc_info:
            project_manager.open_project("nonexistent_project")
        
        assert exc_info.value.code == "PROJECT_NOT_FOUND"
        assert "nonexistent_project" in exc_info.value.message
    
    def test_open_project_missing_metadata(self, project_manager, project_dir):
        """Test opening project with missing project.json."""
        # Create project directory without project.json
        project_path = project_dir / "incomplete_project"
        project_path.mkdir(parents=True)
        
        with pytest.raises(ProjectError) as exc_info:
            project_manager.open_project("incomplete_project")
        
        assert exc_info.value.code == "PROJECT_METADATA_MISSING"
    
    def test_open_project_invalid_data_contract(self, project_manager, project_dir):
        """Test opening project that fails Data Contract validation."""
        # Create project with invalid data
        invalid_data = {
            "schema_version": "2.0",  # Invalid version
            "project_name": "invalid_project",
            "capabilities": {},
            "generation_status": {}
        }
        create_test_project(project_dir, "invalid_project", invalid_data)
        
        with pytest.raises(ValidationError) as exc_info:
            project_manager.open_project("invalid_project")
        
        assert exc_info.value.code == "PROJECT_VALIDATION_FAILED"
    
    def test_close_project_with_save(self, project_manager, project_dir, sample_project_data):
        """Test closing project with save."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project = project_manager.open_project("test_project")
        
        # Modify project
        original_modified_at = project.modified_at
        project.scenes[0].title = "Modified Title"
        
        # Close project
        project_manager.close_project(save=True)
        
        # Verify project is no longer active
        assert project_manager.active_project is None
        
        # Verify project was saved
        project_json_path = project_dir / "test_project" / "project.json"
        with open(project_json_path, 'r') as f:
            saved_data = json.load(f)
        
        assert saved_data["scenes"][0]["title"] == "Modified Title"
        
        # Verify backup was created
        backup_dir = project_dir / "test_project" / ".backups"
        assert backup_dir.exists()
        backups = list(backup_dir.glob("backup_*.json"))
        assert len(backups) == 1
    
    def test_close_project_without_save(self, project_manager, project_dir, sample_project_data):
        """Test closing project without save."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project = project_manager.open_project("test_project")
        
        # Modify project
        project.scenes[0].title = "Modified Title"
        
        # Close project without saving
        project_manager.close_project(save=False)
        
        # Verify project is no longer active
        assert project_manager.active_project is None
        
        # Verify project was NOT saved
        project_json_path = project_dir / "test_project" / "project.json"
        with open(project_json_path, 'r') as f:
            saved_data = json.load(f)
        
        assert saved_data["scenes"][0]["title"] == "Opening Scene"  # Original title
    
    def test_close_project_no_active_project(self, project_manager):
        """Test closing when no project is active (should be idempotent)."""
        # Should not raise an error - idempotent operation
        project_manager.close_project()
        
        # Verify no active project
        assert project_manager.active_project is None
    
    def test_save_project(self, project_manager, project_dir, sample_project_data):
        """Test saving project."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project = project_manager.open_project("test_project")
        
        # Modify project
        project.scenes[0].title = "New Title"
        project.characters[0].name = "Jane Doe"
        
        # Save project
        project_manager.save_project(project)
        
        # Verify changes were saved
        project_json_path = project_dir / "test_project" / "project.json"
        with open(project_json_path, 'r') as f:
            saved_data = json.load(f)
        
        assert saved_data["scenes"][0]["title"] == "New Title"
        assert saved_data["characters"][0]["name"] == "Jane Doe"
    
    def test_save_project_validation_failure(self, project_manager, project_dir, sample_project_data):
        """Test saving project that fails validation."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project = project_manager.open_project("test_project")
        
        # Make project invalid
        project.metadata.schema_version = "2.0"  # Invalid version
        
        # Attempt to save
        with pytest.raises(ValidationError) as exc_info:
            project_manager.save_project(project)
        
        assert exc_info.value.code == "PROJECT_VALIDATION_FAILED"
    
    def test_get_active_project(self, project_manager, project_dir, sample_project_data):
        """Test getting active project."""
        # No active project initially
        assert project_manager.get_active_project() is None
        
        # Open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project = project_manager.open_project("test_project")
        
        # Verify active project
        active = project_manager.get_active_project()
        assert active == project
        assert active.name == "test_project"
    
    def test_has_active_project(self, project_manager, project_dir, sample_project_data):
        """Test checking if project is active."""
        # No active project initially
        assert not project_manager.has_active_project()
        
        # Open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project_manager.open_project("test_project")
        
        # Verify has active project
        assert project_manager.has_active_project()
        
        # Close project
        project_manager.close_project()
        
        # Verify no active project
        assert not project_manager.has_active_project()
    
    def test_project_round_trip(self, project_manager, project_dir, sample_project_data):
        """Test complete project lifecycle: create, open, modify, save, close, reopen."""
        # Create project
        create_test_project(project_dir, "test_project", sample_project_data)
        
        # Open project
        project = project_manager.open_project("test_project")
        original_scene_title = project.scenes[0].title
        
        # Modify project
        project.scenes[0].title = "Modified Title"
        project.characters[0].name = "Modified Name"
        
        # Save and close
        project_manager.close_project(save=True)
        
        # Reopen project
        project2 = project_manager.open_project("test_project")
        
        # Verify modifications persisted
        assert project2.scenes[0].title == "Modified Title"
        assert project2.characters[0].name == "Modified Name"
        assert project2.scenes[0].title != original_scene_title
