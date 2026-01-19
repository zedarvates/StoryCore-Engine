"""
Unit tests for project utility functions.
Tests project loading, validation, and management functions.
"""

import json
import pytest
import sys
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.utils.project import (
    load_project_config,
    validate_project_structure,
    get_project_metadata,
    ensure_project_directories,
    save_project_config,
    update_project_config,
    get_project_status,
    validate_project_config_schema,
    check_project_exists,
    list_project_files
)
from cli.errors import UserError, SystemError, ConfigurationError


class TestLoadProjectConfig:
    """Test cases for load_project_config function."""
    
    def test_load_valid_project(self):
        """Test loading a valid project configuration."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_path = Path(tmpdir)
            project_file = project_path / "project.json"
            
            # Create valid project config
            config = {
                "project_name": "test-project",
                "schema_version": "1.0"
            }
            
            with open(project_file, 'w') as f:
                json.dump(config, f)
            
            # Load and verify
            loaded_config = load_project_config(str(project_path))
            
            assert loaded_config["project_name"] == "test-project"
            assert loaded_config["schema_version"] == "1.0"
    
    def test_load_nonexistent_directory(self):
        """Test loading from nonexistent directory raises UserError."""
        with pytest.raises(UserError) as exc_info:
            load_project_config("/nonexistent/path")
        
        assert "not found" in str(exc_info.value).lower()
    
    def test_load_missing_project_file(self):
        """Test loading from directory without project.json raises UserError."""
        with tempfile.TemporaryDirectory() as tmpdir:
            with pytest.raises(UserError) as exc_info:
                load_project_config(tmpdir)
            
            assert "project file not found" in str(exc_info.value).lower()
    
    def test_load_invalid_json(self):
        """Test loading invalid JSON raises ConfigurationError."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_path = Path(tmpdir)
            project_file = project_path / "project.json"
            
            # Create invalid JSON
            with open(project_file, 'w') as f:
                f.write("{ invalid json }")
            
            with pytest.raises(ConfigurationError) as exc_info:
                load_project_config(str(project_path))
            
            assert "invalid json" in str(exc_info.value).lower()
    
    def test_load_missing_required_fields(self):
        """Test loading config without required fields raises ConfigurationError."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_path = Path(tmpdir)
            project_file = project_path / "project.json"
            
            # Create config missing required fields
            config = {"some_field": "value"}
            
            with open(project_file, 'w') as f:
                json.dump(config, f)
            
            with pytest.raises(ConfigurationError) as exc_info:
                load_project_config(str(project_path))
            
            assert "missing required" in str(exc_info.value).lower()


class TestValidateProjectStructure:
    """Test cases for validate_project_structure function."""
    
    def test_validate_complete_structure(self):
        """Test validation of complete project structure."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_path = Path(tmpdir)
            
            # Create project structure
            project_file = project_path / "project.json"
            config = {
                "project_name": "test-project",
                "schema_version": "1.0"
            }
            
            with open(project_file, 'w') as f:
                json.dump(config, f)
            
            # Create expected directories
            (project_path / "assets").mkdir()
            (project_path / "assets" / "images").mkdir()
            (project_path / "assets" / "audio").mkdir()
            
            is_valid, errors = validate_project_structure(str(project_path))
            
            assert is_valid is True
            assert len(errors) == 0
    
    def test_validate_nonexistent_directory(self):
        """Test validation of nonexistent directory."""
        is_valid, errors = validate_project_structure("/nonexistent/path")
        
        assert is_valid is False
        assert len(errors) > 0
        assert any("not found" in err.lower() for err in errors)
    
    def test_validate_missing_project_file(self):
        """Test validation with missing project.json."""
        with tempfile.TemporaryDirectory() as tmpdir:
            is_valid, errors = validate_project_structure(tmpdir)
            
            assert is_valid is False
            assert any("project.json" in err.lower() for err in errors)
    
    def test_validate_missing_directories(self):
        """Test validation with missing expected directories."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_path = Path(tmpdir)
            project_file = project_path / "project.json"
            
            config = {
                "project_name": "test-project",
                "schema_version": "1.0"
            }
            
            with open(project_file, 'w') as f:
                json.dump(config, f)
            
            is_valid, errors = validate_project_structure(str(project_path))
            
            assert is_valid is False
            assert any("assets" in err.lower() for err in errors)


class TestGetProjectMetadata:
    """Test cases for get_project_metadata function."""
    
    def test_get_metadata_complete_project(self):
        """Test getting metadata from complete project."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_path = Path(tmpdir)
            
            # Create project structure
            project_file = project_path / "project.json"
            config = {
                "project_name": "test-project",
                "schema_version": "1.0"
            }
            
            with open(project_file, 'w') as f:
                json.dump(config, f)
            
            # Create some directories and files
            assets_dir = project_path / "assets"
            assets_dir.mkdir()
            
            test_file = assets_dir / "test.txt"
            test_file.write_text("test content")
            
            metadata = get_project_metadata(str(project_path))
            
            assert metadata["exists"] is True
            assert metadata["project_name"] == "test-project"
            assert metadata["schema_version"] == "1.0"
            assert "directories" in metadata
            assert "total_size" in metadata
    
    def test_get_metadata_nonexistent_project(self):
        """Test getting metadata from nonexistent project raises UserError."""
        with pytest.raises(UserError):
            get_project_metadata("/nonexistent/path")


class TestEnsureProjectDirectories:
    """Test cases for ensure_project_directories function."""
    
    def test_ensure_directories_creates_all(self):
        """Test that all required directories are created."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_path = Path(tmpdir)
            
            ensure_project_directories(str(project_path))
            
            # Check that all expected directories exist
            expected_dirs = [
                "assets",
                "assets/images",
                "assets/audio",
                "exports",
                "panels",
                "promoted",
                "refined",
                "qa_output",
                "video_output",
                "audio_output"
            ]
            
            for dir_path in expected_dirs:
                full_path = project_path / dir_path
                assert full_path.exists(), f"Directory {dir_path} was not created"
                assert full_path.is_dir(), f"{dir_path} is not a directory"
    
    def test_ensure_directories_idempotent(self):
        """Test that calling ensure_project_directories multiple times is safe."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_path = Path(tmpdir)
            
            # Call twice
            ensure_project_directories(str(project_path))
            ensure_project_directories(str(project_path))
            
            # Should not raise an error
            assert (project_path / "assets").exists()


class TestSaveProjectConfig:
    """Test cases for save_project_config function."""
    
    def test_save_valid_config(self):
        """Test saving a valid project configuration."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_path = Path(tmpdir)
            
            config = {
                "project_name": "test-project",
                "schema_version": "1.0",
                "capabilities": {}
            }
            
            save_project_config(str(project_path), config)
            
            # Verify file was created
            project_file = project_path / "project.json"
            assert project_file.exists()
            
            # Verify content
            with open(project_file, 'r') as f:
                loaded_config = json.load(f)
            
            assert loaded_config["project_name"] == "test-project"
            assert loaded_config["schema_version"] == "1.0"
    
    def test_save_missing_required_fields(self):
        """Test saving config without required fields raises ConfigurationError."""
        with tempfile.TemporaryDirectory() as tmpdir:
            config = {"some_field": "value"}
            
            with pytest.raises(ConfigurationError):
                save_project_config(tmpdir, config)


class TestUpdateProjectConfig:
    """Test cases for update_project_config function."""
    
    def test_update_existing_config(self):
        """Test updating an existing project configuration."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_path = Path(tmpdir)
            
            # Create initial config
            initial_config = {
                "project_name": "test-project",
                "schema_version": "1.0"
            }
            save_project_config(str(project_path), initial_config)
            
            # Update config
            updates = {"new_field": "new_value"}
            updated_config = update_project_config(str(project_path), updates)
            
            assert updated_config["project_name"] == "test-project"
            assert updated_config["new_field"] == "new_value"
            
            # Verify file was updated
            loaded_config = load_project_config(str(project_path))
            assert loaded_config["new_field"] == "new_value"


class TestGetProjectStatus:
    """Test cases for get_project_status function."""
    
    def test_get_status_complete_project(self):
        """Test getting status from complete project."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_path = Path(tmpdir)
            
            # Create project structure
            config = {
                "project_name": "test-project",
                "schema_version": "1.0",
                "generation_status": {
                    "grid": "done",
                    "promotion": "pending"
                },
                "capabilities": {
                    "grid_generation": True
                }
            }
            save_project_config(str(project_path), config)
            
            # Create some asset files
            panels_dir = project_path / "panels"
            panels_dir.mkdir()
            (panels_dir / "panel_1.png").write_text("test")
            
            status = get_project_status(str(project_path))
            
            assert status["project_name"] == "test-project"
            assert status["generation_status"]["grid"] == "done"
            assert status["asset_counts"]["panels"] == 1
            assert "metadata" in status


class TestValidateProjectConfigSchema:
    """Test cases for validate_project_config_schema function."""
    
    def test_validate_valid_schema(self):
        """Test validation of valid project config schema."""
        config = {
            "project_name": "test-project",
            "schema_version": "1.0",
            "capabilities": {},
            "generation_status": {
                "grid": "done"
            }
        }
        
        is_valid, errors = validate_project_config_schema(config)
        
        assert is_valid is True
        assert len(errors) == 0
    
    def test_validate_missing_required_fields(self):
        """Test validation with missing required fields."""
        config = {"some_field": "value"}
        
        is_valid, errors = validate_project_config_schema(config)
        
        assert is_valid is False
        assert len(errors) > 0
        assert any("project_name" in err for err in errors)
    
    def test_validate_invalid_field_types(self):
        """Test validation with invalid field types."""
        config = {
            "project_name": 123,  # Should be string
            "schema_version": "1.0"
        }
        
        is_valid, errors = validate_project_config_schema(config)
        
        assert is_valid is False
        assert any("type" in err.lower() for err in errors)
    
    def test_validate_invalid_status_values(self):
        """Test validation with invalid status values."""
        config = {
            "project_name": "test-project",
            "schema_version": "1.0",
            "generation_status": {
                "grid": "invalid_status"
            }
        }
        
        is_valid, errors = validate_project_config_schema(config)
        
        assert is_valid is False
        assert any("status" in err.lower() for err in errors)


class TestCheckProjectExists:
    """Test cases for check_project_exists function."""
    
    def test_check_existing_project(self):
        """Test checking an existing project."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_path = Path(tmpdir)
            
            config = {
                "project_name": "test-project",
                "schema_version": "1.0"
            }
            save_project_config(str(project_path), config)
            
            exists = check_project_exists(str(project_path))
            
            assert exists is True
    
    def test_check_nonexistent_project(self):
        """Test checking a nonexistent project."""
        exists = check_project_exists("/nonexistent/path")
        
        assert exists is False
    
    def test_check_directory_without_project_file(self):
        """Test checking directory without project.json."""
        with tempfile.TemporaryDirectory() as tmpdir:
            exists = check_project_exists(tmpdir)
            
            assert exists is False


class TestListProjectFiles:
    """Test cases for list_project_files function."""
    
    def test_list_all_files(self):
        """Test listing all files in project."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_path = Path(tmpdir)
            
            # Create some files
            (project_path / "file1.txt").write_text("test")
            (project_path / "file2.json").write_text("{}")
            
            subdir = project_path / "subdir"
            subdir.mkdir()
            (subdir / "file3.txt").write_text("test")
            
            files = list_project_files(str(project_path))
            
            assert len(files) >= 3
    
    def test_list_files_with_pattern(self):
        """Test listing files matching pattern."""
        with tempfile.TemporaryDirectory() as tmpdir:
            project_path = Path(tmpdir)
            
            # Create files with different extensions
            (project_path / "file1.txt").write_text("test")
            (project_path / "file2.json").write_text("{}")
            (project_path / "file3.txt").write_text("test")
            
            txt_files = list_project_files(str(project_path), "*.txt")
            
            assert len(txt_files) == 2
            assert all(f.suffix == ".txt" for f in txt_files)
    
    def test_list_files_nonexistent_project(self):
        """Test listing files from nonexistent project raises UserError."""
        with pytest.raises(UserError):
            list_project_files("/nonexistent/path")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
