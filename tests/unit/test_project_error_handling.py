"""
Unit tests for ProjectManager error handling and cleanup functionality.

Tests error handling, cleanup on failure, and descriptive error messages.
"""

import pytest
from pathlib import Path
from src.project_manager import ProjectManager
import os
import stat


@pytest.fixture
def project_manager():
    """Create ProjectManager instance."""
    return ProjectManager()


@pytest.fixture
def temp_base(tmp_path):
    """Create a temporary base directory for projects."""
    return tmp_path


class TestProjectErrorHandling:
    """Test ProjectManager error handling functionality."""
    
    def test_init_project_returns_dict(self, project_manager, temp_base):
        """Test that init_project returns a dictionary with expected keys."""
        result = project_manager.init_project("test_project", str(temp_base))
        
        # Verify return type and structure
        assert isinstance(result, dict)
        assert "success" in result
        assert "project_path" in result
        assert "errors" in result
        assert "warnings" in result
        assert "created_files" in result
        assert "created_directories" in result
    
    def test_init_project_success_response(self, project_manager, temp_base):
        """Test successful project initialization response."""
        result = project_manager.init_project("test_project", str(temp_base))
        
        # Verify success
        assert result["success"] is True
        assert len(result["errors"]) == 0
        assert len(result["created_files"]) > 0
        assert len(result["created_directories"]) > 0
        
        # Verify project path
        expected_path = str(temp_base / "test_project")
        assert result["project_path"] == expected_path
        
        # Verify created files
        assert any("project.json" in f for f in result["created_files"])
        assert any("storyboard.json" in f for f in result["created_files"])
        assert any("story.md" in f for f in result["created_files"])
        
        # Verify created directories
        assert any("test_project" in d for d in result["created_directories"])
        assert any("assets" in d for d in result["created_directories"])
        assert any("images" in d for d in result["created_directories"])
        assert any("audio" in d for d in result["created_directories"])
    
    def test_init_project_empty_name_error(self, project_manager, temp_base):
        """Test error handling for empty project name."""
        result = project_manager.init_project("", str(temp_base))
        
        # Verify failure
        assert result["success"] is False
        assert len(result["errors"]) > 0
        
        # Verify error message is descriptive
        error_msg = result["errors"][0]
        assert "empty" in error_msg.lower()
        assert "Validation error" in error_msg
    
    def test_init_project_whitespace_name_error(self, project_manager, temp_base):
        """Test error handling for whitespace-only project name."""
        result = project_manager.init_project("   ", str(temp_base))
        
        # Verify failure
        assert result["success"] is False
        assert len(result["errors"]) > 0
        
        # Verify error message
        error_msg = result["errors"][0]
        assert "empty" in error_msg.lower()
    
    def test_init_project_invalid_characters_error(self, project_manager, temp_base):
        """Test error handling for project names with invalid characters."""
        invalid_names = [
            "project/name",
            "project\\name",
            "project:name",
            "project*name",
            "project?name",
            'project"name',
            "project<name",
            "project>name",
            "project|name",
            "project\0name"
        ]
        
        for invalid_name in invalid_names:
            result = project_manager.init_project(invalid_name, str(temp_base))
            
            # Verify failure
            assert result["success"] is False, f"Should fail for name: {invalid_name}"
            assert len(result["errors"]) > 0
            
            # Verify error message mentions invalid characters
            error_msg = result["errors"][0]
            assert "invalid characters" in error_msg.lower()
    
    def test_init_project_path_traversal_error(self, project_manager, temp_base):
        """Test error handling for path traversal attempts."""
        result = project_manager.init_project("../malicious_project", str(temp_base))
        
        # Verify failure
        assert result["success"] is False
        assert len(result["errors"]) > 0
        
        # Verify error message mentions parent directory
        error_msg = result["errors"][0]
        assert ".." in error_msg
        assert "parent directory" in error_msg.lower()
    
    @pytest.mark.skipif(os.name == 'nt', reason="Permission test not reliable on Windows")
    def test_init_project_permission_error(self, project_manager, temp_base):
        """Test error handling for permission denied errors."""
        # Create a read-only directory
        readonly_dir = temp_base / "readonly"
        readonly_dir.mkdir()
        
        # Make directory read-only (platform-specific)
        try:
            os.chmod(readonly_dir, stat.S_IRUSR | stat.S_IXUSR)
            
            # Try to create project in read-only directory
            result = project_manager.init_project("test_project", str(readonly_dir))
            
            # Verify failure
            assert result["success"] is False
            assert len(result["errors"]) > 0
            
            # Verify error message mentions permission
            error_msg = result["errors"][0]
            assert "permission" in error_msg.lower()
            
        finally:
            # Restore permissions for cleanup
            os.chmod(readonly_dir, stat.S_IRWXU)
    
    def test_cleanup_on_validation_failure(self, project_manager, temp_base, monkeypatch):
        """Test that cleanup is called when validation fails."""
        # Mock validate_project_structure to return failure
        def mock_validate(self, project_path):
            return (False, ["Missing: project.json"])
        
        monkeypatch.setattr(ProjectManager, "validate_project_structure", mock_validate)
        
        # Try to create project
        result = project_manager.init_project("test_project", str(temp_base))
        
        # Verify failure
        assert result["success"] is False
        assert len(result["errors"]) > 0
        
        # Verify error message mentions validation failure
        error_msg = result["errors"][0]
        assert "validation failed" in error_msg.lower()
        
        # Verify project directory was cleaned up
        project_path = temp_base / "test_project"
        assert not project_path.exists(), "Project directory should be cleaned up after validation failure"


class TestProjectCleanup:
    """Test ProjectManager cleanup_on_failure functionality."""
    
    def test_cleanup_removes_project_directory(self, project_manager, temp_base):
        """Test that cleanup removes the entire project directory."""
        # Create a project
        project_path = temp_base / "test_project"
        project_path.mkdir()
        (project_path / "project.json").touch()
        (project_path / "assets").mkdir()
        
        # Verify project exists
        assert project_path.exists()
        
        # Call cleanup
        project_manager.cleanup_on_failure(project_path)
        
        # Verify project was removed
        assert not project_path.exists()
    
    def test_cleanup_removes_nested_structure(self, project_manager, temp_base):
        """Test that cleanup removes nested directory structure."""
        # Create a complete project structure
        project_path = temp_base / "test_project"
        project_path.mkdir()
        (project_path / "assets" / "images").mkdir(parents=True)
        (project_path / "assets" / "audio").mkdir(parents=True)
        (project_path / "project.json").touch()
        (project_path / "storyboard.json").touch()
        (project_path / "story.md").touch()
        
        # Verify structure exists
        assert project_path.exists()
        assert (project_path / "assets" / "images").exists()
        assert (project_path / "assets" / "audio").exists()
        
        # Call cleanup
        project_manager.cleanup_on_failure(project_path)
        
        # Verify everything was removed
        assert not project_path.exists()
    
    def test_cleanup_nonexistent_directory(self, project_manager, temp_base):
        """Test that cleanup handles non-existent directories gracefully."""
        project_path = temp_base / "nonexistent_project"
        
        # Verify directory doesn't exist
        assert not project_path.exists()
        
        # Call cleanup (should not raise error)
        project_manager.cleanup_on_failure(project_path)
        
        # Verify still doesn't exist
        assert not project_path.exists()
    
    def test_cleanup_empty_directory(self, project_manager, temp_base):
        """Test that cleanup removes empty project directory."""
        project_path = temp_base / "empty_project"
        project_path.mkdir()
        
        # Verify directory exists and is empty
        assert project_path.exists()
        assert len(list(project_path.iterdir())) == 0
        
        # Call cleanup
        project_manager.cleanup_on_failure(project_path)
        
        # Verify directory was removed
        assert not project_path.exists()
    
    def test_cleanup_prevents_non_project_deletion(self, project_manager, temp_base):
        """Test that cleanup doesn't delete directories that aren't StoryCore projects."""
        # Create a directory with non-project content
        non_project_path = temp_base / "not_a_project"
        non_project_path.mkdir()
        (non_project_path / "some_file.txt").touch()
        (non_project_path / "other_file.dat").touch()
        
        # Verify directory exists
        assert non_project_path.exists()
        
        # Call cleanup
        project_manager.cleanup_on_failure(non_project_path)
        
        # Verify directory was NOT removed (safety check)
        assert non_project_path.exists(), "Cleanup should not remove non-project directories"
    
    def test_cleanup_with_project_json_present(self, project_manager, temp_base):
        """Test that cleanup removes directory when project.json is present."""
        # Create a directory with project.json
        project_path = temp_base / "partial_project"
        project_path.mkdir()
        (project_path / "project.json").touch()
        (project_path / "other_file.txt").touch()
        
        # Verify directory exists
        assert project_path.exists()
        
        # Call cleanup
        project_manager.cleanup_on_failure(project_path)
        
        # Verify directory was removed
        assert not project_path.exists()


class TestErrorMessages:
    """Test that error messages are descriptive and helpful."""
    
    def test_error_message_includes_failure_type(self, project_manager, temp_base):
        """Test that error messages include the type of failure."""
        # Test validation error
        result = project_manager.init_project("", str(temp_base))
        assert "Validation error" in result["errors"][0]
        
        # Test invalid characters error
        result = project_manager.init_project("bad/name", str(temp_base))
        assert "Validation error" in result["errors"][0]
    
    def test_error_message_includes_specific_reason(self, project_manager, temp_base):
        """Test that error messages include specific reasons for failure."""
        # Empty name
        result = project_manager.init_project("", str(temp_base))
        assert "empty" in result["errors"][0].lower()
        
        # Invalid characters
        result = project_manager.init_project("bad/name", str(temp_base))
        assert "invalid characters" in result["errors"][0].lower()
        
        # Path traversal
        result = project_manager.init_project("../bad", str(temp_base))
        assert ".." in result["errors"][0]
        assert "parent directory" in result["errors"][0].lower()
    
    def test_error_message_includes_project_path(self, project_manager, temp_base):
        """Test that error messages include the project path."""
        result = project_manager.init_project("test_project", str(temp_base))
        
        # Even on success, project_path should be included
        assert "project_path" in result
        assert "test_project" in result["project_path"]
    
    def test_validation_error_lists_missing_items(self, project_manager, temp_base, monkeypatch):
        """Test that validation errors list specific missing items."""
        # Mock validate_project_structure to return specific missing items
        def mock_validate(self, project_path):
            return (False, ["Directory: assets/images", "File: project.json"])
        
        monkeypatch.setattr(ProjectManager, "validate_project_structure", mock_validate)
        
        # Try to create project
        result = project_manager.init_project("test_project", str(temp_base))
        
        # Verify error message includes missing items
        error_msg = result["errors"][0]
        assert "assets/images" in error_msg
        assert "project.json" in error_msg
