"""
Unit tests for cross-platform compatibility features.

Tests the validate_project_name function and ensures all file operations
work correctly across different operating systems.
"""

import pytest
import platform
from pathlib import Path
from src.project_manager import (
    validate_project_name,
    ProjectManager,
    INVALID_FILENAME_CHARS,
    WINDOWS_RESERVED_NAMES,
    WINDOWS_MAX_PATH_LENGTH
)


class TestValidateProjectName:
    """Test suite for validate_project_name function."""
    
    def test_valid_simple_name(self):
        """Valid simple project names should pass validation."""
        is_valid, error = validate_project_name("my-project")
        assert is_valid is True
        assert error == ""
    
    def test_valid_name_with_numbers(self):
        """Valid names with numbers should pass validation."""
        is_valid, error = validate_project_name("project123")
        assert is_valid is True
        assert error == ""
    
    def test_valid_name_with_underscores(self):
        """Valid names with underscores should pass validation."""
        is_valid, error = validate_project_name("my_project_name")
        assert is_valid is True
        assert error == ""
    
    def test_empty_name(self):
        """Empty project names should fail validation."""
        is_valid, error = validate_project_name("")
        assert is_valid is False
        assert "empty" in error.lower()
    
    def test_whitespace_only_name(self):
        """Whitespace-only names should fail validation."""
        is_valid, error = validate_project_name("   ")
        assert is_valid is False
        assert "empty" in error.lower() or "whitespace" in error.lower()
    
    def test_path_traversal_attempt(self):
        """Names with '..' should fail validation."""
        is_valid, error = validate_project_name("../etc/passwd")
        assert is_valid is False
        assert ".." in error
    
    def test_absolute_path_unix(self):
        """Names starting with '/' should fail validation."""
        is_valid, error = validate_project_name("/absolute/path")
        assert is_valid is False
        assert "separator" in error.lower()
    
    def test_absolute_path_windows(self):
        """Names starting with '\\' should fail validation."""
        is_valid, error = validate_project_name("\\absolute\\path")
        assert is_valid is False
        assert "separator" in error.lower()
    
    def test_drive_letter(self):
        """Names with drive letters should fail validation."""
        is_valid, error = validate_project_name("C:\\Windows")
        assert is_valid is False
        assert "drive" in error.lower() or "invalid" in error.lower()
    
    def test_invalid_characters(self):
        """Names with invalid characters should fail validation."""
        for char in ['/', '\\', ':', '*', '?', '"', '<', '>', '|']:
            is_valid, error = validate_project_name(f"project{char}name")
            assert is_valid is False, f"Character '{char}' should be invalid"
            assert "invalid" in error.lower()
    
    def test_null_character(self):
        """Names with null character should fail validation."""
        is_valid, error = validate_project_name("project\0name")
        assert is_valid is False
        assert "invalid" in error.lower()
    
    def test_windows_reserved_names(self):
        """Windows reserved names should fail validation."""
        reserved_names = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'LPT1']
        for name in reserved_names:
            # Test exact match
            is_valid, error = validate_project_name(name)
            assert is_valid is False, f"Reserved name '{name}' should be invalid"
            assert "reserved" in error.lower()
            
            # Test case-insensitive
            is_valid, error = validate_project_name(name.lower())
            assert is_valid is False, f"Reserved name '{name.lower()}' should be invalid"
            
            # Test with extension
            is_valid, error = validate_project_name(f"{name}.txt")
            assert is_valid is False, f"Reserved name '{name}.txt' should be invalid"
    
    def test_leading_whitespace(self):
        """Names with leading whitespace should fail validation."""
        is_valid, error = validate_project_name("  project")
        assert is_valid is False
        assert "whitespace" in error.lower()
    
    def test_trailing_whitespace(self):
        """Names with trailing whitespace should fail validation."""
        is_valid, error = validate_project_name("project  ")
        assert is_valid is False
        assert "whitespace" in error.lower()
    
    def test_trailing_period(self):
        """Names ending with period should fail validation."""
        is_valid, error = validate_project_name("project.")
        assert is_valid is False
        assert "period" in error.lower()
    
    def test_very_long_name(self, tmp_path):
        """Very long names that would exceed path limits should fail validation."""
        # Create a name that would definitely exceed Windows path limit
        long_name = "a" * 300
        is_valid, error = validate_project_name(long_name, str(tmp_path))
        
        # On Windows, this should definitely fail
        if platform.system() == 'Windows':
            assert is_valid is False
            assert "path length" in error.lower() or "too long" in error.lower()
    
    def test_reasonable_length_name(self, tmp_path):
        """Reasonably long names should pass validation."""
        # A name that's long but reasonable
        reasonable_name = "my_project_with_a_somewhat_long_but_reasonable_name"
        is_valid, error = validate_project_name(reasonable_name, str(tmp_path))
        assert is_valid is True
        assert error == ""


class TestCrossPlatformFileOperations:
    """Test suite for cross-platform file operations."""
    
    def test_pathlib_usage_in_init(self, tmp_path):
        """Verify that init_project uses pathlib for all path operations."""
        pm = ProjectManager()
        result = pm.init_project("test-project", str(tmp_path))
        
        assert result["success"] is True
        
        # Verify all paths in result are strings (converted from Path objects)
        assert isinstance(result["project_path"], str)
        for file_path in result["created_files"]:
            assert isinstance(file_path, str)
        for dir_path in result["created_directories"]:
            assert isinstance(dir_path, str)
    
    def test_utf8_encoding_story_file(self, tmp_path):
        """Verify story.md is created with UTF-8 encoding."""
        pm = ProjectManager()
        result = pm.init_project("test-project", str(tmp_path))
        
        assert result["success"] is True
        
        story_file = tmp_path / "test-project" / "story.md"
        assert story_file.exists()
        
        # Read file and verify UTF-8 encoding works
        content = story_file.read_text(encoding="utf-8")
        assert "test-project" in content
        
        # Verify we can write and read UTF-8 characters
        test_content = "Test with UTF-8: café, naïve, 日本語, emoji 🎬"
        story_file.write_text(test_content, encoding="utf-8")
        read_content = story_file.read_text(encoding="utf-8")
        assert read_content == test_content
    
    def test_utf8_encoding_json_files(self, tmp_path):
        """Verify JSON files are created with UTF-8 encoding."""
        pm = ProjectManager()
        result = pm.init_project("test-project", str(tmp_path))
        
        assert result["success"] is True
        
        # Test project.json
        project_json = tmp_path / "test-project" / "project.json"
        assert project_json.exists()
        content = project_json.read_text(encoding="utf-8")
        assert "storycore_test-project" in content
        
        # Test storyboard.json
        storyboard_json = tmp_path / "test-project" / "storyboard.json"
        assert storyboard_json.exists()
        content = storyboard_json.read_text(encoding="utf-8")
        assert "sb_test-project" in content
    
    def test_cross_platform_path_separators(self, tmp_path):
        """Verify path separators are handled correctly on all platforms."""
        pm = ProjectManager()
        result = pm.init_project("test-project", str(tmp_path))
        
        assert result["success"] is True
        
        # Verify subdirectories are created correctly
        assets_images = tmp_path / "test-project" / "assets" / "images"
        assets_audio = tmp_path / "test-project" / "assets" / "audio"
        
        assert assets_images.exists()
        assert assets_images.is_dir()
        assert assets_audio.exists()
        assert assets_audio.is_dir()
    
    def test_project_name_validation_in_init(self, tmp_path):
        """Verify init_project uses validate_project_name."""
        pm = ProjectManager()
        
        # Test with invalid character
        result = pm.init_project("project:invalid", str(tmp_path))
        assert result["success"] is False
        assert len(result["errors"]) > 0
        assert "invalid" in result["errors"][0].lower()
        
        # Test with path traversal
        result = pm.init_project("../etc/passwd", str(tmp_path))
        assert result["success"] is False
        assert len(result["errors"]) > 0
        
        # Test with reserved name
        result = pm.init_project("CON", str(tmp_path))
        assert result["success"] is False
        assert len(result["errors"]) > 0
        assert "reserved" in result["errors"][0].lower()


class TestPathLengthValidation:
    """Test suite for path length validation."""
    
    def test_path_length_calculation(self, tmp_path):
        """Verify path length is calculated correctly."""
        # Create a deeply nested base path
        deep_path = tmp_path / "a" / "b" / "c" / "d" / "e"
        deep_path.mkdir(parents=True, exist_ok=True)
        
        # Test with a reasonable name
        is_valid, error = validate_project_name("project", str(deep_path))
        assert is_valid is True
    
    @pytest.mark.skipif(platform.system() != 'Windows', reason="Windows-specific test")
    def test_windows_path_limit(self, tmp_path):
        """Verify Windows path length limit is enforced."""
        # Create a name that would exceed Windows limit
        # Account for base path, project name, and subdirectories
        base_len = len(str(tmp_path.resolve()))
        # Leave room for subdirectories (assets/images/file.png = ~30 chars)
        max_name_len = WINDOWS_MAX_PATH_LENGTH - base_len - 50
        
        if max_name_len > 0:
            # Test with name at the limit
            long_name = "a" * max_name_len
            is_valid, error = validate_project_name(long_name, str(tmp_path))
            # This might pass or fail depending on exact path length
            
            # Test with name definitely over the limit
            too_long_name = "a" * (max_name_len + 100)
            is_valid, error = validate_project_name(too_long_name, str(tmp_path))
            assert is_valid is False
            assert "path length" in error.lower() or "too long" in error.lower()


class TestIntegrationCrossPlatform:
    """Integration tests for cross-platform compatibility."""
    
    def test_complete_project_creation_cross_platform(self, tmp_path):
        """Test complete project creation works on current platform."""
        pm = ProjectManager()
        result = pm.init_project("cross-platform-test", str(tmp_path))
        
        assert result["success"] is True
        assert len(result["errors"]) == 0
        
        project_path = tmp_path / "cross-platform-test"
        
        # Verify all files exist and are readable
        story_file = project_path / "story.md"
        assert story_file.exists()
        content = story_file.read_text(encoding="utf-8")
        assert len(content) > 0
        
        project_json = project_path / "project.json"
        assert project_json.exists()
        content = project_json.read_text(encoding="utf-8")
        assert len(content) > 0
        
        storyboard_json = project_path / "storyboard.json"
        assert storyboard_json.exists()
        content = storyboard_json.read_text(encoding="utf-8")
        assert len(content) > 0
        
        # Verify directory structure
        assert (project_path / "assets" / "images").exists()
        assert (project_path / "assets" / "audio").exists()
    
    def test_validation_prevents_invalid_projects(self, tmp_path):
        """Test that validation prevents creation of invalid projects."""
        pm = ProjectManager()
        
        invalid_names = [
            "",  # Empty
            "   ",  # Whitespace only
            "../etc",  # Path traversal
            "project:name",  # Invalid character
            "CON",  # Reserved name
            "project.",  # Trailing period
            "  project",  # Leading whitespace
        ]
        
        for invalid_name in invalid_names:
            result = pm.init_project(invalid_name, str(tmp_path))
            assert result["success"] is False, f"Name '{invalid_name}' should be invalid"
            assert len(result["errors"]) > 0
            
            # Verify no project directory was created
            project_path = tmp_path / invalid_name.strip()
            # Only check if the path would be valid to check
            if invalid_name.strip() and not any(c in invalid_name for c in ['/', '\\', ':']):
                assert not project_path.exists() or len(list(project_path.iterdir())) == 0
