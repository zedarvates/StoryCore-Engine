"""
Unit tests for validator service (MVP)
"""

import pytest
import tempfile
import os
from pathlib import Path
from .validator_service import (
    ValidatorService,
    validate_project_name,
    validate_project_name_unique,
    validate_duration,
    validate_story_content,
    create_project_name_validator,
    create_duration_validator,
    create_story_validator
)


class TestProjectNameValidation:
    """Tests for project name validation"""
    
    def test_valid_project_names(self):
        """Test valid project names"""
        valid_names = [
            "my-project",
            "test_project",
            "project123",
            "MyProject",
            "a1b2c3",
            "project-name-123"
        ]
        
        for name in valid_names:
            is_valid, error = validate_project_name(name)
            assert is_valid, f"'{name}' should be valid but got error: {error}"
    
    def test_empty_project_name(self):
        """Test empty project name"""
        is_valid, error = validate_project_name("")
        assert not is_valid
        assert "empty" in error.lower()
    
    def test_whitespace_only_project_name(self):
        """Test whitespace-only project name"""
        is_valid, error = validate_project_name("   ")
        assert not is_valid
        assert "empty" in error.lower()
    
    def test_too_short_project_name(self):
        """Test project name too short"""
        is_valid, error = validate_project_name("ab")
        assert not is_valid
        assert "3 characters" in error
    
    def test_too_long_project_name(self):
        """Test project name too long"""
        long_name = "a" * 51
        is_valid, error = validate_project_name(long_name)
        assert not is_valid
        assert "50 characters" in error
    
    def test_invalid_characters(self):
        """Test project names with invalid characters"""
        invalid_names = [
            "project name",  # space
            "project@name",  # @
            "project.name",  # .
            "project/name",  # /
            "project\\name",  # \
            "project!name",  # !
        ]
        
        for name in invalid_names:
            is_valid, error = validate_project_name(name)
            assert not is_valid, f"'{name}' should be invalid"
            assert "letters, numbers, hyphens, and underscores" in error
    
    def test_starts_with_hyphen(self):
        """Test project name starting with hyphen"""
        is_valid, error = validate_project_name("-project")
        assert not is_valid
        assert "start with a letter or number" in error
    
    def test_starts_with_underscore(self):
        """Test project name starting with underscore"""
        is_valid, error = validate_project_name("_project")
        assert not is_valid
        assert "start with a letter or number" in error


class TestProjectNameUniqueness:
    """Tests for project name uniqueness validation"""
    
    def test_unique_project_name(self):
        """Test that non-existing project name is valid"""
        with tempfile.TemporaryDirectory() as tmpdir:
            is_valid, error = validate_project_name_unique("new-project", tmpdir)
            assert is_valid
    
    def test_existing_project_name(self):
        """Test that existing project name is invalid"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create a project directory
            project_path = Path(tmpdir) / "existing-project"
            project_path.mkdir()
            
            is_valid, error = validate_project_name_unique("existing-project", tmpdir)
            assert not is_valid
            assert "already exists" in error


class TestDurationValidation:
    """Tests for duration validation"""
    
    def test_valid_durations(self):
        """Test valid durations for each format"""
        test_cases = [
            ("5", "court_metrage", True),
            ("10", "court_metrage", True),
            ("15", "court_metrage", True),
            ("25", "moyen_metrage", True),
            ("35", "moyen_metrage", True),
            ("80", "long_metrage", True),
            ("90", "long_metrage", True),
        ]
        
        for duration_str, format_key, expected_valid in test_cases:
            is_valid, error = validate_duration(duration_str, format_key)
            assert is_valid == expected_valid, f"Duration {duration_str} for {format_key} should be {expected_valid}"
    
    def test_invalid_duration_format(self):
        """Test non-integer duration"""
        is_valid, error = validate_duration("abc", "court_metrage")
        assert not is_valid
        assert "whole number" in error.lower()
    
    def test_float_duration(self):
        """Test float duration (should be invalid)"""
        is_valid, error = validate_duration("10.5", "court_metrage")
        assert not is_valid
        assert "whole number" in error.lower()
    
    def test_zero_duration(self):
        """Test zero duration"""
        is_valid, error = validate_duration("0", "court_metrage")
        assert not is_valid
        assert "greater than 0" in error
    
    def test_negative_duration(self):
        """Test negative duration"""
        is_valid, error = validate_duration("-5", "court_metrage")
        assert not is_valid
        assert "greater than 0" in error
    
    def test_duration_too_short_for_format(self):
        """Test duration below format minimum"""
        is_valid, error = validate_duration("5", "moyen_metrage")
        assert not is_valid
        assert "at least 20" in error
    
    def test_duration_too_long_for_format(self):
        """Test duration above format maximum"""
        is_valid, error = validate_duration("20", "court_metrage")
        assert not is_valid
        assert "at most 15" in error
    
    def test_invalid_format_key(self):
        """Test with invalid format key"""
        is_valid, error = validate_duration("10", "invalid_format")
        assert not is_valid
        assert "Invalid format" in error


class TestStoryValidation:
    """Tests for story content validation"""
    
    def test_valid_story(self):
        """Test valid story content"""
        story = "This is a valid story with enough content to pass validation."
        is_valid, error = validate_story_content(story)
        assert is_valid
    
    def test_empty_story(self):
        """Test empty story"""
        is_valid, error = validate_story_content("")
        assert not is_valid
        assert "empty" in error.lower()
    
    def test_whitespace_only_story(self):
        """Test whitespace-only story"""
        is_valid, error = validate_story_content("   \n\t   ")
        assert not is_valid
        assert "empty" in error.lower()
    
    def test_too_short_story(self):
        """Test story too short"""
        is_valid, error = validate_story_content("Short")
        assert not is_valid
        assert "at least 10 characters" in error
    
    def test_too_long_story(self):
        """Test story too long"""
        long_story = "a" * 10001
        is_valid, error = validate_story_content(long_story)
        assert not is_valid
        assert "10,000 characters" in error
    
    def test_story_at_max_length(self):
        """Test story at maximum length"""
        max_story = "a" * 10000
        is_valid, error = validate_story_content(max_story)
        assert is_valid


class TestValidatorFactories:
    """Tests for validator factory functions"""
    
    def test_create_project_name_validator(self):
        """Test creating project name validator"""
        with tempfile.TemporaryDirectory() as tmpdir:
            validator = create_project_name_validator(tmpdir)
            
            # Test valid name
            is_valid, error = validator("test-project")
            assert is_valid
            
            # Test invalid format
            is_valid, error = validator("ab")
            assert not is_valid
            
            # Create project and test uniqueness
            project_path = Path(tmpdir) / "existing"
            project_path.mkdir()
            is_valid, error = validator("existing")
            assert not is_valid
    
    def test_create_duration_validator(self):
        """Test creating duration validator"""
        validator = create_duration_validator("court_metrage")
        
        # Test valid duration
        is_valid, error = validator("10")
        assert is_valid
        
        # Test invalid duration
        is_valid, error = validator("50")
        assert not is_valid
    
    def test_create_story_validator(self):
        """Test creating story validator"""
        validator = create_story_validator()
        
        # Test valid story
        is_valid, error = validator("This is a valid story.")
        assert is_valid
        
        # Test invalid story
        is_valid, error = validator("Short")
        assert not is_valid


class TestValidatorService:
    """Tests for ValidatorService class"""
    
    def test_validator_service_instance(self):
        """Test creating ValidatorService instance"""
        validator = ValidatorService()
        assert validator is not None
    
    def test_validator_service_methods(self):
        """Test that ValidatorService has all required methods"""
        validator = ValidatorService()
        assert hasattr(validator, 'validate_project_name')
        assert hasattr(validator, 'validate_project_name_unique')
        assert hasattr(validator, 'validate_duration')
        assert hasattr(validator, 'validate_story_content')


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
