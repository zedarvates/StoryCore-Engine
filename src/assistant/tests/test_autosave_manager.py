"""
Unit tests for AutoSaveManager.

Tests automatic saving, backup creation, and backup rotation.
"""

import pytest
import time
from pathlib import Path
from datetime import datetime
import json

from src.assistant.autosave_manager import AutoSaveManager
from src.assistant.project_manager import ProjectManager
from src.assistant.file_operations import FileOperationsManager
from src.assistant.validator import DataContractValidator
from src.assistant.models import (
    Project, ProjectMetadata, Scene, Character, Sequence, Shot
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
def autosave_manager():
    """Create auto-save manager with short interval for testing."""
    return AutoSaveManager(save_interval_seconds=2, backup_count=3)


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


class TestAutoSaveManager:
    """Test AutoSaveManager functionality."""
    
    def test_initialization(self, autosave_manager):
        """Test auto-save manager initialization."""
        assert autosave_manager.save_interval == 2
        assert autosave_manager.backup_count == 3
        assert autosave_manager.last_save_time is None
        assert not autosave_manager.is_running()
    
    def test_start_stop(self, autosave_manager, project_manager):
        """Test starting and stopping auto-save."""
        # Start auto-save
        autosave_manager.start(project_manager)
        assert autosave_manager.is_running()
        assert autosave_manager.project_manager == project_manager
        
        # Stop auto-save
        autosave_manager.stop()
        assert not autosave_manager.is_running()
        assert autosave_manager.project_manager is None
    
    def test_start_already_running(self, autosave_manager, project_manager):
        """Test starting auto-save when already running."""
        autosave_manager.start(project_manager)
        assert autosave_manager.is_running()
        
        # Try to start again
        autosave_manager.start(project_manager)
        assert autosave_manager.is_running()  # Should still be running
        
        autosave_manager.stop()
    
    def test_stop_not_running(self, autosave_manager):
        """Test stopping auto-save when not running."""
        assert not autosave_manager.is_running()
        autosave_manager.stop()  # Should not raise error
        assert not autosave_manager.is_running()
    
    def test_trigger_save_no_project(self, autosave_manager, project_manager):
        """Test triggering save when no project is active."""
        autosave_manager.start(project_manager)
        
        # No active project
        result = autosave_manager.trigger_save()
        assert result is False
        
        autosave_manager.stop()
    
    def test_trigger_save_with_project(self, autosave_manager, project_manager, 
                                      project_dir, sample_project_data):
        """Test triggering save with active project."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project = project_manager.open_project("test_project")
        
        # Start auto-save
        autosave_manager.start(project_manager)
        
        # Modify project
        project.scenes[0].title = "Modified Title"
        
        # Trigger save
        result = autosave_manager.trigger_save()
        assert result is True
        
        # Verify save occurred
        assert autosave_manager.get_last_save_time() is not None
        
        # Verify backup was created
        backup_dir = project.path / ".backups"
        assert backup_dir.exists()
        backups = list(backup_dir.glob("backup_*.json"))
        assert len(backups) >= 1
        
        autosave_manager.stop()
        project_manager.close_project(save=False)
    
    def test_backup_creation(self, autosave_manager, project_manager, 
                            project_dir, sample_project_data):
        """Test backup file creation."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project = project_manager.open_project("test_project")
        
        # Start auto-save
        autosave_manager.start(project_manager)
        
        # Trigger save to create backup
        autosave_manager.trigger_save()
        
        # Verify backup exists
        backup_dir = project.path / ".backups"
        assert backup_dir.exists()
        
        backups = list(backup_dir.glob("backup_*.json"))
        assert len(backups) == 1
        
        # Verify backup content
        with open(backups[0], 'r') as f:
            backup_data = json.load(f)
        
        assert backup_data["project_name"] == "test_project"
        assert len(backup_data["scenes"]) == 1
        
        autosave_manager.stop()
        project_manager.close_project(save=False)
    
    def test_backup_rotation(self, autosave_manager, project_manager, 
                            project_dir, sample_project_data):
        """Test backup rotation keeps only N most recent backups."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project = project_manager.open_project("test_project")
        
        # Start auto-save
        autosave_manager.start(project_manager)
        
        # Create 5 backups (more than the limit of 3)
        for i in range(5):
            autosave_manager.trigger_save()
            time.sleep(1.1)  # Delay to ensure different timestamps (1 second resolution)
        
        # Verify only 3 backups remain
        backup_count = autosave_manager.get_backup_count(project)
        assert backup_count == 3
        
        # Verify backups directory exists
        backup_dir = project.path / ".backups"
        backups = sorted(
            backup_dir.glob("backup_*.json"),
            key=lambda p: p.stat().st_mtime,
            reverse=True
        )
        assert len(backups) == 3
        
        autosave_manager.stop()
        project_manager.close_project(save=False)
    
    def test_automatic_save_interval(self, project_manager, project_dir, sample_project_data):
        """Test that auto-save occurs at the specified interval."""
        # Create auto-save manager with very short interval
        autosave_manager = AutoSaveManager(save_interval_seconds=1, backup_count=3)
        
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project = project_manager.open_project("test_project")
        
        # Start auto-save
        autosave_manager.start(project_manager)
        
        # Wait for at least 2 auto-saves
        time.sleep(2.5)
        
        # Verify backups were created
        backup_count = autosave_manager.get_backup_count(project)
        assert backup_count >= 2
        
        autosave_manager.stop()
        project_manager.close_project(save=False)
    
    def test_get_last_save_time(self, autosave_manager, project_manager, 
                                project_dir, sample_project_data):
        """Test getting last save time."""
        # Initially no save time
        assert autosave_manager.get_last_save_time() is None
        
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project = project_manager.open_project("test_project")
        
        # Start auto-save
        autosave_manager.start(project_manager)
        
        # Trigger save
        import time
        before_save = datetime.now()
        time.sleep(0.001)  # Ensure time passes
        autosave_manager.trigger_save()
        after_save = datetime.now()
        
        # Verify last save time is set
        last_save = autosave_manager.get_last_save_time()
        assert last_save is not None
        assert before_save <= last_save <= after_save
        
        autosave_manager.stop()
        project_manager.close_project(save=False)
    
    def test_get_backup_count(self, autosave_manager, project_manager, 
                             project_dir, sample_project_data):
        """Test getting backup count."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project = project_manager.open_project("test_project")
        
        # Initially no backups
        assert autosave_manager.get_backup_count(project) == 0
        
        # Start auto-save
        autosave_manager.start(project_manager)
        
        # Create backups with delays to ensure different timestamps
        autosave_manager.trigger_save()
        assert autosave_manager.get_backup_count(project) == 1
        
        time.sleep(1.1)
        autosave_manager.trigger_save()
        assert autosave_manager.get_backup_count(project) == 2
        
        time.sleep(1.1)
        autosave_manager.trigger_save()
        assert autosave_manager.get_backup_count(project) == 3
        
        # Create one more - should still be 3 due to rotation
        time.sleep(1.1)
        autosave_manager.trigger_save()
        assert autosave_manager.get_backup_count(project) == 3
        
        autosave_manager.stop()
        project_manager.close_project(save=False)
    
    def test_modified_timestamp_updated(self, autosave_manager, project_manager, 
                                       project_dir, sample_project_data):
        """Test that modified timestamp is updated on auto-save."""
        # Create and open project
        create_test_project(project_dir, "test_project", sample_project_data)
        project = project_manager.open_project("test_project")
        
        original_modified = project.modified_at
        
        # Start auto-save
        autosave_manager.start(project_manager)
        
        # Wait a bit to ensure timestamp difference
        time.sleep(0.1)
        
        # Trigger save
        autosave_manager.trigger_save()
        
        # Verify modified timestamp was updated
        assert project.modified_at > original_modified
        
        autosave_manager.stop()
        project_manager.close_project(save=False)
