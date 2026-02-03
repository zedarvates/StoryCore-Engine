"""
Unit tests for project initialization logging.

Tests verify that comprehensive logging is implemented for all
initialization steps, including directory creation, file creation,
validation, and error handling.

Validates Requirements: 4.5
"""

import pytest
import logging
from pathlib import Path
from src.project_manager import ProjectManager


class TestProjectLogging:
    """Test suite for project initialization logging."""
    
    def test_logging_on_successful_initialization(self, tmp_path, caplog):
        """
        Test that successful project initialization logs all major steps.
        
        Validates Requirements: 4.5
        """
        pm = ProjectManager()
        
        with caplog.at_level(logging.INFO):
            result = pm.init_project("test-project", str(tmp_path))
        
        assert result["success"], f"Project initialization failed: {result['errors']}"
        
        # Verify key log messages are present
        log_messages = [record.message for record in caplog.records]
        
        # Check for initialization start
        assert any("Starting project initialization" in msg for msg in log_messages), \
            "Missing log for initialization start"
        
        # Check for project name validation
        assert any("Project name validated" in msg for msg in log_messages), \
            "Missing log for project name validation"
        
        # Check for directory creation
        assert any("Creating project directory" in msg for msg in log_messages), \
            "Missing log for project directory creation"
        
        # Check for assets directory creation
        assert any("Creating assets directory structure" in msg for msg in log_messages), \
            "Missing log for assets directory creation"
        
        # Check for seed generation
        assert any("Generated project seed" in msg for msg in log_messages), \
            "Missing log for seed generation"
        
        # Check for file creation
        assert any("Creating project.json" in msg for msg in log_messages), \
            "Missing log for project.json creation"
        assert any("Creating storyboard.json" in msg for msg in log_messages), \
            "Missing log for storyboard.json creation"
        assert any("Creating story.md" in msg for msg in log_messages), \
            "Missing log for story.md creation"
        
        # Check for validation
        assert any("Validating project structure" in msg for msg in log_messages), \
            "Missing log for structure validation"
        
        # Check for completion
        assert any("Project initialization completed successfully" in msg for msg in log_messages), \
            "Missing log for successful completion"
    
    def test_logging_on_validation_error(self, tmp_path, caplog):
        """
        Test that validation errors are logged with full context.
        
        Validates Requirements: 4.5
        """
        pm = ProjectManager()
        
        with caplog.at_level(logging.ERROR):
            # Use invalid project name to trigger validation error
            result = pm.init_project("", str(tmp_path))
        
        assert not result["success"], "Expected initialization to fail"
        
        # Verify error is logged
        log_messages = [record.message for record in caplog.records]
        assert any("Validation error" in msg for msg in log_messages), \
            "Missing error log for validation failure"
    
    def test_logging_includes_file_paths(self, tmp_path, caplog):
        """
        Test that log messages include specific file paths for debugging.
        
        Validates Requirements: 4.5
        """
        pm = ProjectManager()
        project_name = "test-project"
        
        with caplog.at_level(logging.DEBUG):
            result = pm.init_project(project_name, str(tmp_path))
        
        assert result["success"], f"Project initialization failed: {result['errors']}"
        
        log_messages = [record.message for record in caplog.records]
        
        # Verify file paths are included in logs
        project_path = tmp_path / project_name
        
        # Check for specific file paths in debug logs
        assert any(str(project_path) in msg for msg in log_messages), \
            "Project path not found in logs"
    
    def test_logging_on_cleanup(self, tmp_path, caplog):
        """
        Test that cleanup operations are logged.
        
        Validates Requirements: 4.5
        """
        pm = ProjectManager()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        # Create a project.json to make it look like a StoryCore project
        (project_path / "project.json").write_text("{}")
        
        with caplog.at_level(logging.INFO):
            pm.cleanup_on_failure(project_path)
        
        log_messages = [record.message for record in caplog.records]
        
        # Verify cleanup is logged
        assert any("Starting cleanup" in msg for msg in log_messages), \
            "Missing log for cleanup start"
        assert any("Cleanup completed" in msg for msg in log_messages), \
            "Missing log for cleanup completion"
    
    def test_logging_levels_are_appropriate(self, tmp_path, caplog):
        """
        Test that different log levels are used appropriately.
        
        INFO: Major steps (initialization start, completion)
        DEBUG: Detailed operations (file creation, validation checks)
        WARNING: Non-fatal issues (missing items during validation)
        ERROR: Fatal errors (initialization failures)
        
        Validates Requirements: 4.5
        """
        pm = ProjectManager()
        
        with caplog.at_level(logging.DEBUG):
            result = pm.init_project("test-project", str(tmp_path))
        
        assert result["success"], f"Project initialization failed: {result['errors']}"
        
        # Check that we have logs at different levels
        log_levels = [record.levelname for record in caplog.records]
        
        assert "INFO" in log_levels, "No INFO level logs found"
        assert "DEBUG" in log_levels, "No DEBUG level logs found"
    
    def test_logging_on_permission_error(self, tmp_path, caplog, monkeypatch):
        """
        Test that permission errors are logged with full context.
        
        Validates Requirements: 4.5
        """
        pm = ProjectManager()
        
        # Mock Path.mkdir to raise PermissionError
        original_mkdir = Path.mkdir
        
        def mock_mkdir(*args, **kwargs):
            raise PermissionError("Permission denied for testing")
        
        with caplog.at_level(logging.ERROR):
            monkeypatch.setattr(Path, "mkdir", mock_mkdir)
            result = pm.init_project("test-project", str(tmp_path))
        
        assert not result["success"], "Expected initialization to fail"
        
        log_messages = [record.message for record in caplog.records]
        
        # Verify permission error is logged
        assert any("Permission denied" in msg for msg in log_messages), \
            "Missing error log for permission denied"
    
    def test_validation_logging_details(self, tmp_path, caplog):
        """
        Test that validation logs include details about what's being checked.
        
        Validates Requirements: 4.5
        """
        pm = ProjectManager()
        project_name = "test-project"
        
        with caplog.at_level(logging.DEBUG):
            result = pm.init_project(project_name, str(tmp_path))
        
        assert result["success"], f"Project initialization failed: {result['errors']}"
        
        log_messages = [record.message for record in caplog.records]
        
        # Verify validation details are logged
        assert any("Validating project structure" in msg for msg in log_messages), \
            "Missing validation start log"
        assert any("required directories" in msg for msg in log_messages), \
            "Missing log about checking directories"
        assert any("required files" in msg for msg in log_messages), \
            "Missing log about checking files"
        assert any("validation passed" in msg for msg in log_messages), \
            "Missing validation success log"


class TestFileCreationLogging:
    """Test suite for file creation logging."""
    
    def test_story_file_creation_logging(self, tmp_path, caplog):
        """
        Test that story file creation is logged with details.
        
        Validates Requirements: 4.5
        """
        pm = ProjectManager()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        with caplog.at_level(logging.DEBUG):
            pm.create_story_file(project_path, "test-project")
        
        log_messages = [record.message for record in caplog.records]
        
        # Verify story file creation is logged
        assert any("Generating story file content" in msg for msg in log_messages), \
            "Missing log for story file content generation"
        assert any("Writing story file" in msg for msg in log_messages), \
            "Missing log for story file writing"
        assert any("Story file created successfully" in msg for msg in log_messages), \
            "Missing log for story file creation success"
    
    def test_project_json_creation_logging(self, tmp_path, caplog):
        """
        Test that project.json creation is logged with details.
        
        Validates Requirements: 4.5
        """
        pm = ProjectManager()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        with caplog.at_level(logging.DEBUG):
            pm._create_project_json(project_path, "test-project", 12345)
        
        log_messages = [record.message for record in caplog.records]
        
        # Verify project.json creation is logged
        assert any("Generating project.json" in msg for msg in log_messages), \
            "Missing log for project.json generation"
        assert any("Writing project.json" in msg for msg in log_messages), \
            "Missing log for project.json writing"
        assert any("project.json created successfully" in msg for msg in log_messages), \
            "Missing log for project.json creation success"
    
    def test_storyboard_json_creation_logging(self, tmp_path, caplog):
        """
        Test that storyboard.json creation is logged with details.
        
        Validates Requirements: 4.5
        """
        pm = ProjectManager()
        project_path = tmp_path / "test-project"
        project_path.mkdir()
        
        with caplog.at_level(logging.DEBUG):
            pm._create_storyboard_json(project_path, "test-project")
        
        log_messages = [record.message for record in caplog.records]
        
        # Verify storyboard.json creation is logged
        assert any("Generating storyboard.json" in msg for msg in log_messages), \
            "Missing log for storyboard.json generation"
        assert any("Writing storyboard.json" in msg for msg in log_messages), \
            "Missing log for storyboard.json writing"
        assert any("storyboard.json created successfully" in msg for msg in log_messages), \
            "Missing log for storyboard.json creation success"
