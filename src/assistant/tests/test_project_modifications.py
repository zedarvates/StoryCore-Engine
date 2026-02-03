"""
Unit tests for project modification operations.

Tests scene, character, and sequence modifications, additions, and removals.
"""

import pytest
from pathlib import Path
from datetime import datetime
import json

from src.assistant.project_manager import ProjectManager
from src.assistant.file_operations import FileOperationsManager
from src.assistant.validator import DataContractValidator
from src.assistant.models import Scene, Character, Sequence, Shot
from src.assistant.exceptions import (
    ProjectError, ValidationError, ConfirmationRequiredError
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


class TestProjectModifications:
    """Test project modification operations."""
    
    def test_modify_scene_success(self, project_manager, project_dir, sample_project_data):
        """Test successfully modifying a scene."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project = project_manager.open_project("test_project")
        
        original_modified = project.modified_at
        
        # Modify scene
        updates = {
            "title": "New Title",
            "description": "New description",
            "duration": 10.0
        }
        scene = project_manager.modify_scene("scene_1", updates)
        
        # Verify modifications
        assert scene.title == "New Title"
        assert scene.description == "New description"
        assert scene.duration == 10.0
        
        # Verify modified timestamp updated
        assert project.modified_at > original_modified
        
        project_manager.close_project(save=False)
    
    def test_modify_scene_no_active_project(self, project_manager):
        """Test modifying scene when no project is active."""
        with pytest.raises(ProjectError) as exc_info:
            project_manager.modify_scene("scene_1", {"title": "New Title"})
        
        assert exc_info.value.code == "NO_ACTIVE_PROJECT"
    
    def test_modify_scene_not_found(self, project_manager, project_dir, sample_project_data):
        """Test modifying non-existent scene."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project_manager.open_project("test_project")
        
        with pytest.raises(ProjectError) as exc_info:
            project_manager.modify_scene("nonexistent_scene", {"title": "New Title"})
        
        assert exc_info.value.code == "SCENE_NOT_FOUND"
        
        project_manager.close_project(save=False)
    
    def test_modify_scene_validation_failure(self, project_manager, project_dir, sample_project_data):
        """Test modifying scene with invalid data."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project_manager.open_project("test_project")
        
        # Try to set invalid duration
        with pytest.raises(ValidationError) as exc_info:
            project_manager.modify_scene("scene_1", {"duration": -5.0})
        
        assert exc_info.value.code == "MODIFICATION_VALIDATION_FAILED"
        
        project_manager.close_project(save=False)
    
    def test_modify_character_success(self, project_manager, project_dir, sample_project_data):
        """Test successfully modifying a character."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project = project_manager.open_project("test_project")
        
        # Modify character
        updates = {
            "name": "Jane Doe",
            "appearance": "Short, red dress, sunglasses"
        }
        character = project_manager.modify_character("char_1", updates)
        
        # Verify modifications
        assert character.name == "Jane Doe"
        assert character.appearance == "Short, red dress, sunglasses"
        
        project_manager.close_project(save=False)
    
    def test_modify_character_not_found(self, project_manager, project_dir, sample_project_data):
        """Test modifying non-existent character."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project_manager.open_project("test_project")
        
        with pytest.raises(ProjectError) as exc_info:
            project_manager.modify_character("nonexistent_char", {"name": "New Name"})
        
        assert exc_info.value.code == "CHARACTER_NOT_FOUND"
        
        project_manager.close_project(save=False)
    
    def test_modify_sequence_success(self, project_manager, project_dir, sample_project_data):
        """Test successfully modifying a sequence."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project = project_manager.open_project("test_project")
        
        # Modify sequence scene_id (which doesn't affect validation)
        updates = {
            "scene_id": "scene_1"  # Keep same scene_id
        }
        sequence = project_manager.modify_sequence("seq_1", updates)
        
        # Verify modifications
        assert sequence.scene_id == "scene_1"
        
        project_manager.close_project(save=False)
    
    def test_modify_sequence_not_found(self, project_manager, project_dir, sample_project_data):
        """Test modifying non-existent sequence."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project_manager.open_project("test_project")
        
        with pytest.raises(ProjectError) as exc_info:
            project_manager.modify_sequence("nonexistent_seq", {"total_duration": 10.0})
        
        assert exc_info.value.code == "SEQUENCE_NOT_FOUND"
        
        project_manager.close_project(save=False)
    
    def test_add_scene_success(self, project_manager, project_dir, sample_project_data):
        """Test successfully adding a scene."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project = project_manager.open_project("test_project")
        
        original_scene_count = len(project.scenes)
        
        # Add new scene
        new_scene = Scene(
            id="scene_2",
            number=2,
            title="Second Scene",
            description="Another scene",
            location="Park",
            time_of_day="Day",
            duration=3.0,
            characters=["char_1"],
            key_actions=["Character sits on bench"],
            visual_notes="Bright and sunny"
        )
        added_scene = project_manager.add_scene(new_scene)
        
        # Verify scene was added
        assert len(project.scenes) == original_scene_count + 1
        assert added_scene.id == "scene_2"
        assert added_scene in project.scenes
        
        project_manager.close_project(save=False)
    
    def test_add_scene_no_active_project(self, project_manager):
        """Test adding scene when no project is active."""
        new_scene = Scene(
            id="scene_2",
            number=2,
            title="Second Scene",
            description="Another scene",
            location="Park",
            time_of_day="Day",
            duration=3.0,
            characters=[],
            key_actions=[],
            visual_notes=None
        )
        
        with pytest.raises(ProjectError) as exc_info:
            project_manager.add_scene(new_scene)
        
        assert exc_info.value.code == "NO_ACTIVE_PROJECT"
    
    def test_add_scene_validation_failure(self, project_manager, project_dir, sample_project_data):
        """Test adding invalid scene."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project = project_manager.open_project("test_project")
        
        original_scene_count = len(project.scenes)
        
        # Try to add scene with invalid duration
        invalid_scene = Scene(
            id="scene_2",
            number=2,
            title="Invalid Scene",
            description="Scene with invalid duration",
            location="Park",
            time_of_day="Day",
            duration=-5.0,  # Invalid
            characters=[],
            key_actions=[],
            visual_notes=None
        )
        
        with pytest.raises(ValidationError) as exc_info:
            project_manager.add_scene(invalid_scene)
        
        assert exc_info.value.code == "ADDITION_VALIDATION_FAILED"
        
        # Verify scene was not added (rollback)
        assert len(project.scenes) == original_scene_count
        
        project_manager.close_project(save=False)
    
    def test_remove_scene_without_confirmation(self, project_manager, project_dir, sample_project_data):
        """Test removing scene without confirmation."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project = project_manager.open_project("test_project")
        
        with pytest.raises(ConfirmationRequiredError):
            project_manager.remove_scene("scene_1", confirmed=False)
        
        # Verify scene was not removed
        assert len(project.scenes) == 1
        
        project_manager.close_project(save=False)
    
    def test_remove_scene_with_confirmation(self, project_manager, project_dir, sample_project_data):
        """Test removing scene with confirmation."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project = project_manager.open_project("test_project")
        
        original_scene_count = len(project.scenes)
        
        # Remove scene with confirmation
        result = project_manager.remove_scene("scene_1", confirmed=True)
        
        assert result is True
        assert len(project.scenes) == original_scene_count - 1
        
        project_manager.close_project(save=False)
    
    def test_remove_scene_not_found(self, project_manager, project_dir, sample_project_data):
        """Test removing non-existent scene."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project_manager.open_project("test_project")
        
        with pytest.raises(ProjectError) as exc_info:
            project_manager.remove_scene("nonexistent_scene", confirmed=True)
        
        assert exc_info.value.code == "SCENE_NOT_FOUND"
        
        project_manager.close_project(save=False)
    
    def test_modification_persistence(self, project_manager, project_dir, sample_project_data):
        """Test that modifications persist when saved."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project = project_manager.open_project("test_project")
        
        # Modify scene
        project_manager.modify_scene("scene_1", {"title": "Modified Title"})
        
        # Save and close
        project_manager.close_project(save=True)
        
        # Reopen project
        project2 = project_manager.open_project("test_project")
        
        # Verify modification persisted
        assert project2.scenes[0].title == "Modified Title"
        
        project_manager.close_project(save=False)
