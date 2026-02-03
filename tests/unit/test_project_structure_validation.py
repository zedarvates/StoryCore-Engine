"""
Unit tests for ProjectManager.validate_project_structure method.

Tests validation of project directory structure and required files.
"""

import pytest
from pathlib import Path
from src.project_manager import ProjectManager


@pytest.fixture
def project_manager():
    """Create ProjectManager instance."""
    return ProjectManager()


@pytest.fixture
def temp_project(tmp_path):
    """Create a temporary project directory."""
    return tmp_path / "test_project"


class TestProjectStructureValidation:
    """Test ProjectManager.validate_project_structure functionality."""
    
    def test_validate_complete_project_structure(self, project_manager, tmp_path):
        """Test validation of a complete, valid project structure."""
        # Create a complete project
        project_name = "complete_project"
        project_manager.init_project(project_name, str(tmp_path))
        
        project_path = tmp_path / project_name
        
        # Validate the structure
        is_valid, missing_items = project_manager.validate_project_structure(project_path)
        
        # Should be valid with no missing items
        assert is_valid is True
        assert len(missing_items) == 0
    
    def test_validate_missing_project_directory(self, project_manager, tmp_path):
        """Test validation when project directory doesn't exist."""
        project_path = tmp_path / "nonexistent_project"
        
        # Validate non-existent project
        is_valid, missing_items = project_manager.validate_project_structure(project_path)
        
        # Should be invalid
        assert is_valid is False
        assert len(missing_items) > 0
        
        # Should report missing project directory
        assert any("Directory:" in item and str(project_path) in item for item in missing_items)
    
    def test_validate_missing_assets_directory(self, project_manager, temp_project):
        """Test validation when assets directory is missing."""
        # Create project directory but not assets
        temp_project.mkdir()
        (temp_project / "project.json").touch()
        (temp_project / "storyboard.json").touch()
        (temp_project / "story.md").touch()
        
        # Validate
        is_valid, missing_items = project_manager.validate_project_structure(temp_project)
        
        # Should be invalid
        assert is_valid is False
        assert len(missing_items) > 0
        
        # Should report missing assets directory
        assert any("assets" in item for item in missing_items)
    
    def test_validate_missing_images_directory(self, project_manager, temp_project):
        """Test validation when assets/images directory is missing."""
        # Create project structure without images directory
        temp_project.mkdir()
        (temp_project / "assets").mkdir()
        (temp_project / "assets" / "audio").mkdir()
        (temp_project / "project.json").touch()
        (temp_project / "storyboard.json").touch()
        (temp_project / "story.md").touch()
        
        # Validate
        is_valid, missing_items = project_manager.validate_project_structure(temp_project)
        
        # Should be invalid
        assert is_valid is False
        
        # Should report missing images directory
        assert any("images" in item for item in missing_items)
    
    def test_validate_missing_audio_directory(self, project_manager, temp_project):
        """Test validation when assets/audio directory is missing."""
        # Create project structure without audio directory
        temp_project.mkdir()
        (temp_project / "assets").mkdir()
        (temp_project / "assets" / "images").mkdir()
        (temp_project / "project.json").touch()
        (temp_project / "storyboard.json").touch()
        (temp_project / "story.md").touch()
        
        # Validate
        is_valid, missing_items = project_manager.validate_project_structure(temp_project)
        
        # Should be invalid
        assert is_valid is False
        
        # Should report missing audio directory
        assert any("audio" in item for item in missing_items)
    
    def test_validate_missing_project_json(self, project_manager, temp_project):
        """Test validation when project.json is missing."""
        # Create project structure without project.json
        temp_project.mkdir()
        (temp_project / "assets" / "images").mkdir(parents=True)
        (temp_project / "assets" / "audio").mkdir(parents=True)
        (temp_project / "storyboard.json").touch()
        (temp_project / "story.md").touch()
        
        # Validate
        is_valid, missing_items = project_manager.validate_project_structure(temp_project)
        
        # Should be invalid
        assert is_valid is False
        
        # Should report missing project.json
        assert any("project.json" in item for item in missing_items)
    
    def test_validate_missing_storyboard_json(self, project_manager, temp_project):
        """Test validation when storyboard.json is missing."""
        # Create project structure without storyboard.json
        temp_project.mkdir()
        (temp_project / "assets" / "images").mkdir(parents=True)
        (temp_project / "assets" / "audio").mkdir(parents=True)
        (temp_project / "project.json").touch()
        (temp_project / "story.md").touch()
        
        # Validate
        is_valid, missing_items = project_manager.validate_project_structure(temp_project)
        
        # Should be invalid
        assert is_valid is False
        
        # Should report missing storyboard.json
        assert any("storyboard.json" in item for item in missing_items)
    
    def test_validate_missing_story_md(self, project_manager, temp_project):
        """Test validation when story.md is missing."""
        # Create project structure without story.md
        temp_project.mkdir()
        (temp_project / "assets" / "images").mkdir(parents=True)
        (temp_project / "assets" / "audio").mkdir(parents=True)
        (temp_project / "project.json").touch()
        (temp_project / "storyboard.json").touch()
        
        # Validate
        is_valid, missing_items = project_manager.validate_project_structure(temp_project)
        
        # Should be invalid
        assert is_valid is False
        
        # Should report missing story.md
        assert any("story.md" in item for item in missing_items)
    
    def test_validate_multiple_missing_items(self, project_manager, temp_project):
        """Test validation when multiple items are missing."""
        # Create only project directory
        temp_project.mkdir()
        
        # Validate
        is_valid, missing_items = project_manager.validate_project_structure(temp_project)
        
        # Should be invalid
        assert is_valid is False
        
        # Should report multiple missing items
        assert len(missing_items) >= 6  # 3 directories + 3 files
    
    def test_validate_file_as_directory(self, project_manager, temp_project):
        """Test validation when a file exists where a directory should be."""
        # Create project directory
        temp_project.mkdir()
        
        # Create a file named "assets" instead of a directory
        (temp_project / "assets").touch()
        
        # Validate
        is_valid, missing_items = project_manager.validate_project_structure(temp_project)
        
        # Should be invalid
        assert is_valid is False
        
        # Should report that assets is not a directory
        assert any("Not a directory" in item and "assets" in item for item in missing_items)
    
    def test_validate_directory_as_file(self, project_manager, temp_project):
        """Test validation when a directory exists where a file should be."""
        # Create complete directory structure
        temp_project.mkdir()
        (temp_project / "assets" / "images").mkdir(parents=True)
        (temp_project / "assets" / "audio").mkdir(parents=True)
        
        # Create a directory named "project.json" instead of a file
        (temp_project / "project.json").mkdir()
        (temp_project / "storyboard.json").touch()
        (temp_project / "story.md").touch()
        
        # Validate
        is_valid, missing_items = project_manager.validate_project_structure(temp_project)
        
        # Should be invalid
        assert is_valid is False
        
        # Should report that project.json is not a file
        assert any("Not a file" in item and "project.json" in item for item in missing_items)
    
    def test_validate_empty_project_directory(self, project_manager, temp_project):
        """Test validation of completely empty project directory."""
        # Create only the project directory
        temp_project.mkdir()
        
        # Validate
        is_valid, missing_items = project_manager.validate_project_structure(temp_project)
        
        # Should be invalid
        assert is_valid is False
        
        # Should report all missing items
        assert len(missing_items) > 0
        
        # Check for specific missing items
        missing_str = " ".join(missing_items)
        assert "assets" in missing_str
        assert "project.json" in missing_str
        assert "storyboard.json" in missing_str
        assert "story.md" in missing_str
