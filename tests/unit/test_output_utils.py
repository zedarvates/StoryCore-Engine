"""
Unit tests for output formatting utility functions.
Tests message formatting and display functions.
"""

import pytest
import sys
from io import StringIO
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from cli.utils.output import (
    print_success,
    print_error,
    print_warning,
    print_info,
    print_progress,
    format_duration,
    format_file_size,
    format_table,
    print_table,
    truncate_text
)


class TestPrintFunctions:
    """Test cases for print functions."""
    
    def test_print_success(self, capsys):
        """Test success message printing."""
        print_success("Operation completed")
        captured = capsys.readouterr()
        
        assert "✓" in captured.out
        assert "Operation completed" in captured.out
    
    def test_print_error(self, capsys):
        """Test error message printing."""
        print_error("Operation failed")
        captured = capsys.readouterr()
        
        assert "✗" in captured.err
        assert "Operation failed" in captured.err
    
    def test_print_warning(self, capsys):
        """Test warning message printing."""
        print_warning("Warning message")
        captured = capsys.readouterr()
        
        assert "⚠️" in captured.out
        assert "Warning message" in captured.out
    
    def test_print_info(self, capsys):
        """Test info message printing."""
        print_info("Info message")
        captured = capsys.readouterr()
        
        assert "ℹ️" in captured.out
        assert "Info message" in captured.out
    
    def test_print_progress_with_counts(self, capsys):
        """Test progress message with current/total counts."""
        print_progress("Processing", 5, 10)
        captured = capsys.readouterr()
        
        assert "⏳" in captured.out
        assert "Processing" in captured.out
        assert "5/10" in captured.out
        assert "50.0%" in captured.out
    
    def test_print_progress_without_counts(self, capsys):
        """Test progress message without counts."""
        print_progress("Processing")
        captured = capsys.readouterr()
        
        assert "⏳" in captured.out
        assert "Processing" in captured.out


class TestFormatDuration:
    """Test cases for format_duration function."""
    
    def test_format_milliseconds(self):
        """Test formatting duration less than 1 second."""
        assert format_duration(0.5) == "500ms"
        assert format_duration(0.123) == "123ms"
    
    def test_format_seconds(self):
        """Test formatting duration in seconds."""
        assert format_duration(5.5) == "5.5s"
        assert format_duration(30) == "30.0s"
    
    def test_format_minutes(self):
        """Test formatting duration in minutes."""
        result = format_duration(90)
        assert "1m" in result
        assert "30.0s" in result
    
    def test_format_hours(self):
        """Test formatting duration in hours."""
        result = format_duration(3665)  # 1 hour, 1 minute, 5 seconds
        assert "1h" in result
        assert "1m" in result


class TestFormatFileSize:
    """Test cases for format_file_size function."""
    
    def test_format_bytes(self):
        """Test formatting size in bytes."""
        assert "B" in format_file_size(500)
    
    def test_format_kilobytes(self):
        """Test formatting size in kilobytes."""
        result = format_file_size(1024)
        assert "KB" in result
    
    def test_format_megabytes(self):
        """Test formatting size in megabytes."""
        result = format_file_size(1024 * 1024)
        assert "MB" in result
    
    def test_format_gigabytes(self):
        """Test formatting size in gigabytes."""
        result = format_file_size(1024 * 1024 * 1024)
        assert "GB" in result
    
    def test_format_terabytes(self):
        """Test formatting size in terabytes."""
        result = format_file_size(1024 * 1024 * 1024 * 1024)
        assert "TB" in result


class TestFormatTable:
    """Test cases for format_table function."""
    
    def test_format_simple_table(self):
        """Test formatting a simple table."""
        headers = ["Name", "Age", "City"]
        rows = [
            ["Alice", "30", "New York"],
            ["Bob", "25", "London"]
        ]
        
        result = format_table(headers, rows)
        
        assert "Name" in result
        assert "Age" in result
        assert "City" in result
        assert "Alice" in result
        assert "Bob" in result
    
    def test_format_empty_table(self):
        """Test formatting empty table."""
        headers = ["Name", "Age"]
        rows = []
        
        result = format_table(headers, rows)
        
        assert "No data to display" in result
    
    def test_format_table_with_max_width(self):
        """Test formatting table with max width constraint."""
        headers = ["Name", "Description"]
        rows = [
            ["Item1", "A very long description that should be truncated"],
            ["Item2", "Short desc"]
        ]
        
        result = format_table(headers, rows, max_width=40)
        
        # Verify table is formatted and contains expected data
        assert "Name" in result
        assert "Description" in result
        assert "Item1" in result
        assert "Item2" in result


class TestPrintTable:
    """Test cases for print_table function."""
    
    def test_print_table(self, capsys):
        """Test printing a table."""
        headers = ["Name", "Value"]
        rows = [["Item1", "100"], ["Item2", "200"]]
        
        print_table(headers, rows)
        captured = capsys.readouterr()
        
        assert "Name" in captured.out
        assert "Value" in captured.out
        assert "Item1" in captured.out


class TestTruncateText:
    """Test cases for truncate_text function."""
    
    def test_truncate_long_text(self):
        """Test truncating text longer than max length."""
        text = "This is a very long text that needs to be truncated"
        result = truncate_text(text, 20)
        
        assert len(result) == 20
        assert result.endswith("...")
    
    def test_no_truncate_short_text(self):
        """Test that short text is not truncated."""
        text = "Short text"
        result = truncate_text(text, 20)
        
        assert result == text
    
    def test_truncate_with_custom_suffix(self):
        """Test truncating with custom suffix."""
        text = "This is a long text"
        result = truncate_text(text, 10, suffix=">>")
        
        assert len(result) == 10
        assert result.endswith(">>")
    
    def test_truncate_exact_length(self):
        """Test text exactly at max length."""
        text = "Exact"
        result = truncate_text(text, 5)
        
        assert result == text


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
