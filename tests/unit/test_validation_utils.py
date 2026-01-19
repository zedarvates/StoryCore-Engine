"""
Unit tests for validation utility functions.
Tests argument validation and error handling.
"""

import pytest
import re
import sys
import tempfile
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.utils.validation import (
    validate_path_exists,
    validate_file_extension,
    validate_positive_int,
    validate_choice,
    validate_project_name,
    validate_grid_format,
    validate_scale_factor,
    validate_quality_level,
    validate_url,
    validate_port,
    validate_range,
    validate_float_range,
    validate_directory_exists,
    validate_file_exists,
    validate_writable_path,
    validate_json_string,
    validate_regex_pattern,
    validate_non_empty_string,
    validate_email,
    validate_duration,
    validate_percentage
)
from cli.errors import UserError


class TestValidatePathExists:
    """Test cases for validate_path_exists function."""
    
    def test_existing_path(self):
        """Test validation of existing path."""
        with tempfile.TemporaryDirectory() as tmpdir:
            assert validate_path_exists(tmpdir) is True
    
    def test_nonexistent_path(self):
        """Test validation of nonexistent path."""
        assert validate_path_exists("/nonexistent/path") is False


class TestValidateFileExtension:
    """Test cases for validate_file_extension function."""
    
    def test_valid_extension(self):
        """Test file with valid extension."""
        assert validate_file_extension("test.txt", [".txt", ".md"]) is True
    
    def test_invalid_extension(self):
        """Test file with invalid extension."""
        assert validate_file_extension("test.jpg", [".txt", ".md"]) is False
    
    def test_case_insensitive(self):
        """Test case-insensitive extension matching."""
        assert validate_file_extension("test.TXT", [".txt"]) is True


class TestValidatePositiveInt:
    """Test cases for validate_positive_int function."""
    
    def test_valid_positive_int(self):
        """Test valid positive integer."""
        assert validate_positive_int("42") == 42
    
    def test_zero_raises_error(self):
        """Test that zero raises UserError."""
        with pytest.raises(UserError):
            validate_positive_int("0")
    
    def test_negative_raises_error(self):
        """Test that negative number raises UserError."""
        with pytest.raises(UserError):
            validate_positive_int("-5")
    
    def test_invalid_string_raises_error(self):
        """Test that invalid string raises UserError."""
        with pytest.raises(UserError):
            validate_positive_int("abc")


class TestValidateChoice:
    """Test cases for validate_choice function."""
    
    def test_valid_choice(self):
        """Test valid choice from list."""
        assert validate_choice("option1", ["option1", "option2"]) == "option1"
    
    def test_invalid_choice_raises_error(self):
        """Test that invalid choice raises UserError."""
        with pytest.raises(UserError) as exc_info:
            validate_choice("option3", ["option1", "option2"])
        
        assert "invalid choice" in str(exc_info.value).lower()


class TestValidateProjectName:
    """Test cases for validate_project_name function."""
    
    def test_valid_project_names(self):
        """Test valid project names."""
        valid_names = ["my-project", "project_123", "test-project-1"]
        
        for name in valid_names:
            assert validate_project_name(name) == name
    
    def test_empty_name_raises_error(self):
        """Test that empty name raises UserError."""
        with pytest.raises(UserError):
            validate_project_name("")
    
    def test_too_long_name_raises_error(self):
        """Test that too long name raises UserError."""
        long_name = "a" * 51
        
        with pytest.raises(UserError) as exc_info:
            validate_project_name(long_name)
        
        assert "too long" in str(exc_info.value).lower()
    
    def test_invalid_characters_raise_error(self):
        """Test that invalid characters raise UserError."""
        invalid_names = ["project with spaces", "project@123", "project!"]
        
        for name in invalid_names:
            with pytest.raises(UserError):
                validate_project_name(name)


class TestValidateGridFormat:
    """Test cases for validate_grid_format function."""
    
    def test_valid_grid_formats(self):
        """Test valid grid formats."""
        valid_formats = ["3x3", "1x2", "1x4", "2x2", "4x1", "2x1"]
        
        for fmt in valid_formats:
            assert validate_grid_format(fmt) == fmt
    
    def test_invalid_format_raises_error(self):
        """Test that invalid format raises UserError."""
        with pytest.raises(UserError):
            validate_grid_format("5x5")


class TestValidateScaleFactor:
    """Test cases for validate_scale_factor function."""
    
    def test_valid_scale_factors(self):
        """Test valid scale factors."""
        for scale in [1, 2, 4, 8]:
            assert validate_scale_factor(scale) == scale
    
    def test_too_small_raises_error(self):
        """Test that scale < 1 raises UserError."""
        with pytest.raises(UserError):
            validate_scale_factor(0)
    
    def test_too_large_raises_error(self):
        """Test that scale > 8 raises UserError."""
        with pytest.raises(UserError):
            validate_scale_factor(9)


class TestValidateQualityLevel:
    """Test cases for validate_quality_level function."""
    
    def test_valid_quality_levels(self):
        """Test valid quality levels."""
        valid_levels = ["draft", "standard", "professional", "broadcast"]
        
        for level in valid_levels:
            assert validate_quality_level(level) == level
    
    def test_invalid_level_raises_error(self):
        """Test that invalid level raises UserError."""
        with pytest.raises(UserError):
            validate_quality_level("ultra")


class TestValidateUrl:
    """Test cases for validate_url function."""
    
    def test_valid_urls(self):
        """Test valid URL formats."""
        valid_urls = [
            "http://localhost:8080",
            "https://example.com",
            "http://192.168.1.1:3000",
            "https://api.example.com/path"
        ]
        
        for url in valid_urls:
            assert validate_url(url) == url
    
    def test_invalid_url_raises_error(self):
        """Test that invalid URL raises UserError."""
        invalid_urls = ["not-a-url", "ftp://example.com", "example.com"]
        
        for url in invalid_urls:
            with pytest.raises(UserError):
                validate_url(url)


class TestValidatePort:
    """Test cases for validate_port function."""
    
    def test_valid_ports(self):
        """Test valid port numbers."""
        for port in [80, 443, 8080, 3000]:
            assert validate_port(port) == port
    
    def test_too_small_raises_error(self):
        """Test that port < 1 raises UserError."""
        with pytest.raises(UserError):
            validate_port(0)
    
    def test_too_large_raises_error(self):
        """Test that port > 65535 raises UserError."""
        with pytest.raises(UserError):
            validate_port(65536)


class TestValidateRange:
    """Test cases for validate_range function."""
    
    def test_value_in_range(self):
        """Test value within range."""
        assert validate_range(5, 1, 10) == 5
    
    def test_value_below_range_raises_error(self):
        """Test value below range raises UserError."""
        with pytest.raises(UserError):
            validate_range(0, 1, 10)
    
    def test_value_above_range_raises_error(self):
        """Test value above range raises UserError."""
        with pytest.raises(UserError):
            validate_range(11, 1, 10)
    
    def test_custom_name_in_error(self):
        """Test custom name appears in error message."""
        with pytest.raises(UserError) as exc_info:
            validate_range(11, 1, 10, "Temperature")
        
        assert "temperature" in str(exc_info.value).lower()


class TestValidateFloatRange:
    """Test cases for validate_float_range function."""
    
    def test_float_in_range(self):
        """Test float value within range."""
        assert validate_float_range(5.5, 1.0, 10.0) == 5.5
    
    def test_float_below_range_raises_error(self):
        """Test float below range raises UserError."""
        with pytest.raises(UserError):
            validate_float_range(0.5, 1.0, 10.0)
    
    def test_float_above_range_raises_error(self):
        """Test float above range raises UserError."""
        with pytest.raises(UserError):
            validate_float_range(10.5, 1.0, 10.0)


class TestValidateDirectoryExists:
    """Test cases for validate_directory_exists function."""
    
    def test_existing_directory(self):
        """Test validation of existing directory."""
        with tempfile.TemporaryDirectory() as tmpdir:
            result = validate_directory_exists(tmpdir)
            assert isinstance(result, Path)
            assert result.exists()
    
    def test_nonexistent_directory_raises_error(self):
        """Test nonexistent directory raises UserError."""
        with pytest.raises(UserError):
            validate_directory_exists("/nonexistent/path")
    
    def test_file_path_raises_error(self):
        """Test that file path raises UserError."""
        with tempfile.NamedTemporaryFile(delete=False) as tmpfile:
            tmpfile.close()  # Close file before validation
            try:
                with pytest.raises(UserError) as exc_info:
                    validate_directory_exists(tmpfile.name)
                
                assert "not a directory" in str(exc_info.value).lower()
            finally:
                Path(tmpfile.name).unlink(missing_ok=True)


class TestValidateFileExists:
    """Test cases for validate_file_exists function."""
    
    def test_existing_file(self):
        """Test validation of existing file."""
        with tempfile.NamedTemporaryFile(delete=False) as tmpfile:
            tmpfile.close()  # Close file before validation
            try:
                result = validate_file_exists(tmpfile.name)
                assert isinstance(result, Path)
                assert result.exists()
            finally:
                Path(tmpfile.name).unlink(missing_ok=True)
    
    def test_nonexistent_file_raises_error(self):
        """Test nonexistent file raises UserError."""
        with pytest.raises(UserError):
            validate_file_exists("/nonexistent/file.txt")
    
    def test_directory_path_raises_error(self):
        """Test that directory path raises UserError."""
        with tempfile.TemporaryDirectory() as tmpdir:
            with pytest.raises(UserError) as exc_info:
                validate_file_exists(tmpdir)
            
            assert "not a file" in str(exc_info.value).lower()


class TestValidateWritablePath:
    """Test cases for validate_writable_path function."""
    
    def test_writable_path(self):
        """Test validation of writable path."""
        with tempfile.TemporaryDirectory() as tmpdir:
            test_path = Path(tmpdir) / "test.txt"
            result = validate_writable_path(str(test_path))
            
            assert isinstance(result, Path)
    
    def test_nonexistent_parent_raises_error(self):
        """Test nonexistent parent directory raises UserError."""
        with pytest.raises(UserError):
            validate_writable_path("/nonexistent/dir/file.txt")


class TestValidateJsonString:
    """Test cases for validate_json_string function."""
    
    def test_valid_json(self):
        """Test valid JSON string."""
        json_str = '{"key": "value", "number": 42}'
        result = validate_json_string(json_str)
        
        assert result["key"] == "value"
        assert result["number"] == 42
    
    def test_invalid_json_raises_error(self):
        """Test invalid JSON raises UserError."""
        with pytest.raises(UserError):
            validate_json_string("{invalid json}")


class TestValidateRegexPattern:
    """Test cases for validate_regex_pattern function."""
    
    def test_valid_pattern(self):
        """Test valid regex pattern."""
        pattern = r'^\d+$'
        result = validate_regex_pattern(pattern)
        
        assert isinstance(result, re.Pattern)
        assert result.match("123")
    
    def test_invalid_pattern_raises_error(self):
        """Test invalid regex pattern raises UserError."""
        with pytest.raises(UserError):
            validate_regex_pattern("[invalid(")


class TestValidateNonEmptyString:
    """Test cases for validate_non_empty_string function."""
    
    def test_valid_string(self):
        """Test valid non-empty string."""
        assert validate_non_empty_string("test") == "test"
    
    def test_whitespace_trimmed(self):
        """Test that whitespace is trimmed."""
        assert validate_non_empty_string("  test  ") == "test"
    
    def test_empty_string_raises_error(self):
        """Test empty string raises UserError."""
        with pytest.raises(UserError):
            validate_non_empty_string("")
    
    def test_whitespace_only_raises_error(self):
        """Test whitespace-only string raises UserError."""
        with pytest.raises(UserError):
            validate_non_empty_string("   ")


class TestValidateEmail:
    """Test cases for validate_email function."""
    
    def test_valid_emails(self):
        """Test valid email addresses."""
        valid_emails = [
            "user@example.com",
            "test.user@example.co.uk",
            "user+tag@example.com"
        ]
        
        for email in valid_emails:
            assert validate_email(email) == email
    
    def test_invalid_emails_raise_error(self):
        """Test invalid email addresses raise UserError."""
        invalid_emails = [
            "not-an-email",
            "@example.com",
            "user@",
            "user@.com"
        ]
        
        for email in invalid_emails:
            with pytest.raises(UserError):
                validate_email(email)


class TestValidateDuration:
    """Test cases for validate_duration function."""
    
    def test_seconds_only(self):
        """Test duration in seconds."""
        assert validate_duration("90") == 90
    
    def test_seconds_with_unit(self):
        """Test duration with 's' unit."""
        assert validate_duration("30s") == 30
    
    def test_minutes(self):
        """Test duration in minutes."""
        assert validate_duration("5m") == 300
    
    def test_hours(self):
        """Test duration in hours."""
        assert validate_duration("2h") == 7200
    
    def test_invalid_format_raises_error(self):
        """Test invalid duration format raises UserError."""
        with pytest.raises(UserError):
            validate_duration("5x")


class TestValidatePercentage:
    """Test cases for validate_percentage function."""
    
    def test_valid_percentages(self):
        """Test valid percentage values."""
        for value in [0, 50, 100, 25.5]:
            assert validate_percentage(value) == value
    
    def test_negative_raises_error(self):
        """Test negative percentage raises UserError."""
        with pytest.raises(UserError):
            validate_percentage(-1)
    
    def test_over_100_raises_error(self):
        """Test percentage over 100 raises UserError."""
        with pytest.raises(UserError):
            validate_percentage(101)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
