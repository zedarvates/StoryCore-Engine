"""
Unit tests for DirectoryManager.

Tests specific behaviors and edge cases for directory management.
"""

import pytest
import tempfile
import shutil
import json
from pathlib import Path
from datetime import datetime

from src.memory_system.directory_manager import DirectoryManager
from src.memory_system.data_models import ProjectConfig, MemorySystemConfig


@pytest.fixture
def temp_dir():
    """Create a temporary directory for testing."""
    temp_path = Path(tempfile.mkdtemp())
    yield temp_path
    # Cleanup
    shutil.rmtree(temp_path, ignore_errors=True)


@pytest.fixture
def director_manager():
    """Create a DirectoryManager instance."""
    return DirectoryManager()


@pytest.fixture
def sample_config():
    """Create a sample project configuration."""
    return ProjectConfig(
        schema_version="1.0",
        project_name="test_project",
        project_type="video",
        creation_timestamp=datetime.now().isoformat(),
        objectives=["Test objective 1", "Test objective 2"],
        memory_system_enabled=True,
        memory_system_config=MemorySystemConfig(),
    )


def test_create_structure_success(temp_dir, director_manager):
    """Test successful directory structure creation."""
    project_path = temp_dir / "test_project"
    
    result = director_manager.create_structure(project_path)
    
    assert result is True
    assert project_path.exists()
    assert (project_path / "assistant").exists()
    assert (project_path / "build_logs").exists()
    assert (project_path / "assets").exists()
    assert (project_path / "summaries").exists()
    assert (project_path / "qa_reports").exists()


def test_create_structure_subdirectories(temp_dir, director_manager):
    """Test that all subdirectories are created."""
    project_path = temp_dir / "test_project"
    
    director_manager.create_structure(project_path)
    
    # Check assistant subdirectories
    assert (project_path / "assistant" / "discussions_raw").exists()
    assert (project_path / "assistant" / "discussions_summary").exists()
    
    # Check assets subdirectories
    assert (project_path / "assets" / "images").exists()
    assert (project_path / "assets" / "audio").exists()
    assert (project_path / "assets" / "video").exists()
    assert (project_path / "assets" / "documents").exists()


def test_initialize_files_success(temp_dir, director_manager, sample_config):
    """Test successful file initialization."""
    project_path = temp_dir / "test_project"
    director_manager.create_structure(project_path)
    
    result = director_manager.initialize_files(project_path, sample_config)
    
    assert result is True
    assert (project_path / "project_config.json").exists()
    assert (project_path / "assistant" / "memory.json").exists()
    assert (project_path / "assistant" / "variables.json").exists()
    assert (project_path / "build_logs" / "errors_detected.json").exists()


def test_initialize_files_creates_text_files(temp_dir, director_manager, sample_config):
    """Test that text files are created."""
    project_path = temp_dir / "test_project"
    director_manager.create_structure(project_path)
    
    director_manager.initialize_files(project_path, sample_config)
    
    assert (project_path / "assets" / "attachments_index.txt").exists()
    assert (project_path / "summaries" / "assets_summary.txt").exists()
    assert (project_path / "summaries" / "project_overview.txt").exists()
    assert (project_path / "summaries" / "timeline.txt").exists()
    assert (project_path / "build_logs" / "build_steps_raw.log").exists()


def test_initialize_files_valid_json(temp_dir, director_manager, sample_config):
    """Test that initialized JSON files are valid."""
    project_path = temp_dir / "test_project"
    director_manager.create_structure(project_path)
    director_manager.initialize_files(project_path, sample_config)
    
    # Test project_config.json
    with open(project_path / "project_config.json", 'r') as f:
        config_data = json.load(f)
        assert config_data["project_name"] == "test_project"
        assert config_data["schema_version"] == "1.0"
    
    # Test memory.json
    with open(project_path / "assistant" / "memory.json", 'r') as f:
        memory_data = json.load(f)
        assert memory_data["schema_version"] == "1.0"
        assert "objectives" in memory_data
    
    # Test variables.json
    with open(project_path / "assistant" / "variables.json", 'r') as f:
        variables_data = json.load(f)
        assert variables_data["schema_version"] == "1.0"
        assert "variables" in variables_data


def test_validate_structure_complete(temp_dir, director_manager, sample_config):
    """Test validation of complete structure returns no missing items."""
    project_path = temp_dir / "test_project"
    director_manager.create_structure(project_path)
    director_manager.initialize_files(project_path, sample_config)
    
    missing_items = director_manager.validate_structure(project_path)
    
    assert isinstance(missing_items, list)
    assert len(missing_items) == 0


def test_validate_structure_missing_directory(temp_dir, director_manager, sample_config):
    """Test validation detects missing directories."""
    project_path = temp_dir / "test_project"
    director_manager.create_structure(project_path)
    director_manager.initialize_files(project_path, sample_config)
    
    # Remove a directory
    shutil.rmtree(project_path / "qa_reports")
    
    missing_items = director_manager.validate_structure(project_path)
    
    assert len(missing_items) > 0
    assert "qa_reports" in missing_items


def test_validate_structure_missing_file(temp_dir, director_manager, sample_config):
    """Test validation detects missing files."""
    project_path = temp_dir / "test_project"
    director_manager.create_structure(project_path)
    director_manager.initialize_files(project_path, sample_config)
    
    # Remove a file
    (project_path / "project_config.json").unlink()
    
    missing_items = director_manager.validate_structure(project_path)
    
    assert len(missing_items) > 0
    assert "project_config.json" in missing_items


def test_validate_structure_missing_subdirectory(temp_dir, director_manager, sample_config):
    """Test validation detects missing subdirectories."""
    project_path = temp_dir / "test_project"
    director_manager.create_structure(project_path)
    director_manager.initialize_files(project_path, sample_config)
    
    # Remove a subdirectory
    shutil.rmtree(project_path / "assets" / "images")
    
    missing_items = director_manager.validate_structure(project_path)
    
    assert len(missing_items) > 0
    assert any("images" in item for item in missing_items)


def test_get_directory_tree_structure(temp_dir, director_manager, sample_config):
    """Test directory tree generation returns correct structure."""
    project_path = temp_dir / "test_project"
    director_manager.create_structure(project_path)
    director_manager.initialize_files(project_path, sample_config)
    
    tree = director_manager.get_directory_tree(project_path)
    
    assert isinstance(tree, dict)
    assert tree["type"] == "directory"
    assert tree["name"] == "test_project"
    assert "children" in tree
    assert len(tree["children"]) > 0


def test_get_directory_tree_contains_key_directories(temp_dir, director_manager, sample_config):
    """Test directory tree contains all key directories."""
    project_path = temp_dir / "test_project"
    director_manager.create_structure(project_path)
    director_manager.initialize_files(project_path, sample_config)
    
    tree = director_manager.get_directory_tree(project_path)
    
    child_names = [child["name"] for child in tree["children"]]
    assert "assistant" in child_names
    assert "build_logs" in child_names
    assert "assets" in child_names
    assert "summaries" in child_names
    assert "qa_reports" in child_names


def test_get_directory_tree_nonexistent_path(director_manager):
    """Test directory tree for nonexistent path returns empty dict."""
    nonexistent_path = Path("/nonexistent/path/that/does/not/exist")
    
    tree = director_manager.get_directory_tree(nonexistent_path)
    
    assert tree == {}


def test_create_structure_idempotent(temp_dir, director_manager):
    """Test that creating structure multiple times is safe."""
    project_path = temp_dir / "test_project"
    
    result1 = director_manager.create_structure(project_path)
    result2 = director_manager.create_structure(project_path)
    result3 = director_manager.create_structure(project_path)
    
    assert result1 is True
    assert result2 is True
    assert result3 is True
    assert project_path.exists()


def test_initialize_files_preserves_existing_content(temp_dir, director_manager, sample_config):
    """Test that reinitializing files doesn't corrupt existing content."""
    project_path = temp_dir / "test_project"
    director_manager.create_structure(project_path)
    director_manager.initialize_files(project_path, sample_config)
    
    # Modify a file
    config_path = project_path / "project_config.json"
    with open(config_path, 'r') as f:
        original_data = json.load(f)
    
    # Reinitialize
    director_manager.initialize_files(project_path, sample_config)
    
    # Check file still exists and is valid JSON
    assert config_path.exists()
    with open(config_path, 'r') as f:
        new_data = json.load(f)
        assert new_data["project_name"] == original_data["project_name"]


def test_validate_structure_empty_project_path(director_manager):
    """Test validation of nonexistent project returns all items as missing."""
    nonexistent_path = Path("/nonexistent/path")
    
    missing_items = director_manager.validate_structure(nonexistent_path)
    
    # Should detect many missing items
    assert len(missing_items) > 0


def test_directory_tree_includes_files(temp_dir, director_manager, sample_config):
    """Test that directory tree includes files, not just directories."""
    project_path = temp_dir / "test_project"
    director_manager.create_structure(project_path)
    director_manager.initialize_files(project_path, sample_config)
    
    tree = director_manager.get_directory_tree(project_path)
    
    # Find project_config.json in tree
    config_file_found = False
    for child in tree["children"]:
        if child["name"] == "project_config.json":
            assert child["type"] == "file"
            assert "size" in child
            config_file_found = True
            break
    
    assert config_file_found, "project_config.json should be in directory tree"
