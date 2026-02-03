"""
Tests for screenshot encoding functionality in DiagnosticCollector.

Requirements: 3.5
"""

import pytest
import base64
import tempfile
from pathlib import Path
from src.diagnostic_collector import DiagnosticCollector


class TestScreenshotEncoding:
    """Test suite for screenshot encoding functionality."""
    
    @pytest.fixture
    def collector(self):
        """Create a DiagnosticCollector instance for testing."""
        return DiagnosticCollector()
    
    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for test files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield Path(tmpdir)
    
    def create_test_image(self, file_path: Path, format: str = 'png', size_kb: int = 10):
        """
        Create a test image file with specified format and approximate size.
        
        Args:
            file_path: Path where the image should be created
            format: Image format ('png', 'jpg', 'gif')
            size_kb: Approximate size in KB
        """
        # Create magic bytes for different formats
        magic_bytes = {
            'png': b'\x89PNG\r\n\x1a\n' + b'\x00' * (size_kb * 1024 - 8),
            'jpg': b'\xff\xd8\xff\xe0' + b'\x00' * (size_kb * 1024 - 4),
            'gif': b'GIF89a' + b'\x00' * (size_kb * 1024 - 6)
        }
        
        with open(file_path, 'wb') as f:
            f.write(magic_bytes.get(format, b'\x00' * (size_kb * 1024)))
    
    def test_encode_valid_png_screenshot(self, collector, temp_dir):
        """Test encoding a valid PNG screenshot."""
        # Create a test PNG file
        png_file = temp_dir / "screenshot.png"
        self.create_test_image(png_file, 'png', 10)
        
        # Encode the screenshot
        result = collector.encode_screenshot(str(png_file))
        
        # Verify result is not None
        assert result is not None
        
        # Verify result is a valid base64 string
        try:
            decoded = base64.b64decode(result)
            assert len(decoded) > 0
        except Exception as e:
            pytest.fail(f"Result is not valid base64: {e}")
        
        # Verify the decoded data matches the original file
        with open(png_file, 'rb') as f:
            original_data = f.read()
        assert decoded == original_data
    
    def test_encode_valid_jpg_screenshot(self, collector, temp_dir):
        """Test encoding a valid JPG screenshot."""
        # Create a test JPG file
        jpg_file = temp_dir / "screenshot.jpg"
        self.create_test_image(jpg_file, 'jpg', 15)
        
        # Encode the screenshot
        result = collector.encode_screenshot(str(jpg_file))
        
        # Verify result is not None
        assert result is not None
        
        # Verify result is a valid base64 string
        try:
            decoded = base64.b64decode(result)
            assert len(decoded) > 0
        except Exception as e:
            pytest.fail(f"Result is not valid base64: {e}")
    
    def test_encode_valid_gif_screenshot(self, collector, temp_dir):
        """Test encoding a valid GIF screenshot."""
        # Create a test GIF file
        gif_file = temp_dir / "screenshot.gif"
        self.create_test_image(gif_file, 'gif', 20)
        
        # Encode the screenshot
        result = collector.encode_screenshot(str(gif_file))
        
        # Verify result is not None
        assert result is not None
        
        # Verify result is a valid base64 string
        try:
            decoded = base64.b64decode(result)
            assert len(decoded) > 0
        except Exception as e:
            pytest.fail(f"Result is not valid base64: {e}")
    
    def test_encode_nonexistent_file(self, collector, temp_dir):
        """Test encoding a file that doesn't exist."""
        nonexistent_file = temp_dir / "nonexistent.png"
        
        # Encode should return None for nonexistent file
        result = collector.encode_screenshot(str(nonexistent_file))
        
        assert result is None
    
    def test_encode_invalid_format(self, collector, temp_dir):
        """Test encoding a file with invalid format."""
        # Create a file with invalid extension
        invalid_file = temp_dir / "screenshot.txt"
        with open(invalid_file, 'w') as f:
            f.write("This is not an image")
        
        # Encode should return None for invalid format
        result = collector.encode_screenshot(str(invalid_file))
        
        assert result is None
    
    def test_encode_oversized_file(self, collector, temp_dir):
        """Test encoding a file that exceeds size limit."""
        # Create a file larger than 5MB
        large_file = temp_dir / "large.png"
        self.create_test_image(large_file, 'png', 6000)  # 6MB
        
        # Encode should return None for oversized file
        result = collector.encode_screenshot(str(large_file))
        
        assert result is None
    
    def test_encode_empty_file(self, collector, temp_dir):
        """Test encoding an empty file."""
        # Create an empty file
        empty_file = temp_dir / "empty.png"
        empty_file.touch()
        
        # Encode should return None for empty file
        result = collector.encode_screenshot(str(empty_file))
        
        assert result is None
    
    def test_encode_directory_path(self, collector, temp_dir):
        """Test encoding when given a directory path instead of file."""
        # Try to encode a directory
        result = collector.encode_screenshot(str(temp_dir))
        
        assert result is None
    
    def test_encode_result_is_string(self, collector, temp_dir):
        """Test that encoding result is a string (not bytes)."""
        # Create a test PNG file
        png_file = temp_dir / "screenshot.png"
        self.create_test_image(png_file, 'png', 10)
        
        # Encode the screenshot
        result = collector.encode_screenshot(str(png_file))
        
        # Verify result is a string
        assert isinstance(result, str)
    
    def test_encode_handles_special_characters_in_path(self, collector, temp_dir):
        """Test encoding with special characters in file path."""
        # Create a file with special characters in name
        special_file = temp_dir / "screenshot (copy) [1].png"
        self.create_test_image(special_file, 'png', 10)
        
        # Encode should handle special characters
        result = collector.encode_screenshot(str(special_file))
        
        assert result is not None
    
    def test_encode_preserves_binary_data(self, collector, temp_dir):
        """Test that encoding preserves exact binary data."""
        # Create a test file with specific binary pattern
        test_file = temp_dir / "test.png"
        test_data = b'\x89PNG\r\n\x1a\n' + bytes(range(256)) * 10
        with open(test_file, 'wb') as f:
            f.write(test_data)
        
        # Encode and decode
        encoded = collector.encode_screenshot(str(test_file))
        decoded = base64.b64decode(encoded)
        
        # Verify data is preserved exactly
        assert decoded == test_data
    
    def test_encode_large_valid_file(self, collector, temp_dir):
        """Test encoding a large but valid file (close to 5MB limit)."""
        # Create a file just under 5MB
        large_file = temp_dir / "large.png"
        self.create_test_image(large_file, 'png', 4900)  # 4.9MB
        
        # Encode should succeed
        result = collector.encode_screenshot(str(large_file))
        
        assert result is not None
        assert isinstance(result, str)
        assert len(result) > 0


class TestCreateReportPayloadWithScreenshot:
    """Test suite for create_report_payload with screenshot integration."""
    
    @pytest.fixture
    def collector(self):
        """Create a DiagnosticCollector instance for testing."""
        return DiagnosticCollector()
    
    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for test files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield Path(tmpdir)
    
    def create_test_image(self, file_path: Path, format: str = 'png', size_kb: int = 10):
        """Create a test image file."""
        magic_bytes = {
            'png': b'\x89PNG\r\n\x1a\n' + b'\x00' * (size_kb * 1024 - 8),
            'jpg': b'\xff\xd8\xff\xe0' + b'\x00' * (size_kb * 1024 - 4),
            'gif': b'GIF89a' + b'\x00' * (size_kb * 1024 - 6)
        }
        
        with open(file_path, 'wb') as f:
            f.write(magic_bytes.get(format, b'\x00' * (size_kb * 1024)))
    
    def test_payload_with_valid_screenshot(self, collector, temp_dir):
        """Test creating payload with a valid screenshot."""
        # Create a test screenshot
        screenshot = temp_dir / "screenshot.png"
        self.create_test_image(screenshot, 'png', 10)
        
        # Create payload with screenshot
        payload = collector.create_report_payload(
            report_type="bug",
            description="Test bug report",
            reproduction_steps="Step 1, Step 2",
            include_logs=False,
            screenshot_path=str(screenshot)
        )
        
        # Verify screenshot is included in payload
        assert payload["screenshot_base64"] is not None
        assert isinstance(payload["screenshot_base64"], str)
        assert len(payload["screenshot_base64"]) > 0
        
        # Verify it's valid base64
        try:
            decoded = base64.b64decode(payload["screenshot_base64"])
            assert len(decoded) > 0
        except Exception as e:
            pytest.fail(f"Screenshot in payload is not valid base64: {e}")
    
    def test_payload_without_screenshot(self, collector):
        """Test creating payload without a screenshot."""
        # Create payload without screenshot
        payload = collector.create_report_payload(
            report_type="bug",
            description="Test bug report",
            reproduction_steps="Step 1, Step 2",
            include_logs=False,
            screenshot_path=None
        )
        
        # Verify screenshot is None
        assert payload["screenshot_base64"] is None
    
    def test_payload_with_invalid_screenshot(self, collector, temp_dir):
        """Test creating payload with an invalid screenshot."""
        # Create an invalid file
        invalid_file = temp_dir / "invalid.txt"
        with open(invalid_file, 'w') as f:
            f.write("Not an image")
        
        # Create payload with invalid screenshot
        payload = collector.create_report_payload(
            report_type="bug",
            description="Test bug report",
            reproduction_steps="Step 1, Step 2",
            include_logs=False,
            screenshot_path=str(invalid_file)
        )
        
        # Verify screenshot is None (encoding failed gracefully)
        assert payload["screenshot_base64"] is None
    
    def test_payload_with_nonexistent_screenshot(self, collector, temp_dir):
        """Test creating payload with a nonexistent screenshot path."""
        # Use a nonexistent file path
        nonexistent = temp_dir / "nonexistent.png"
        
        # Create payload with nonexistent screenshot
        payload = collector.create_report_payload(
            report_type="bug",
            description="Test bug report",
            reproduction_steps="Step 1, Step 2",
            include_logs=False,
            screenshot_path=str(nonexistent)
        )
        
        # Verify screenshot is None (encoding failed gracefully)
        assert payload["screenshot_base64"] is None
    
    def test_payload_structure_with_screenshot(self, collector, temp_dir):
        """Test that payload structure is correct with screenshot."""
        # Create a test screenshot
        screenshot = temp_dir / "screenshot.png"
        self.create_test_image(screenshot, 'png', 10)
        
        # Create payload
        payload = collector.create_report_payload(
            report_type="enhancement",
            description="Test feature request",
            reproduction_steps="N/A",
            include_logs=True,
            screenshot_path=str(screenshot),
            module_name="test-module"
        )
        
        # Verify all required fields are present
        assert "schema_version" in payload
        assert "report_type" in payload
        assert "timestamp" in payload
        assert "system_info" in payload
        assert "module_context" in payload
        assert "user_input" in payload
        assert "diagnostics" in payload
        assert "screenshot_base64" in payload
        
        # Verify screenshot is included
        assert payload["screenshot_base64"] is not None


class TestScreenshotEncodingErrorHandling:
    """Test suite for error handling in screenshot encoding."""
    
    @pytest.fixture
    def collector(self):
        """Create a DiagnosticCollector instance for testing."""
        return DiagnosticCollector()
    
    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for test files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield Path(tmpdir)
    
    def test_encode_handles_permission_error(self, collector, temp_dir):
        """Test encoding handles permission errors gracefully."""
        import os
        import stat
        import platform
        
        # Skip on Windows as permission handling is different
        if platform.system() == 'Windows':
            pytest.skip("Permission test not applicable on Windows")
        
        # Create a file
        restricted_file = temp_dir / "restricted.png"
        with open(restricted_file, 'wb') as f:
            f.write(b'\x89PNG\r\n\x1a\n' + b'\x00' * 1000)
        
        # Remove read permissions (Unix-like systems only)
        try:
            os.chmod(restricted_file, stat.S_IWUSR)
            
            # Try to encode - should return None
            result = collector.encode_screenshot(str(restricted_file))
            assert result is None
            
            # Restore permissions for cleanup
            os.chmod(restricted_file, stat.S_IRUSR | stat.S_IWUSR)
        except (OSError, AttributeError):
            # Skip test if chmod not supported
            pytest.skip("Permission test not supported on this platform")
    
    def test_encode_returns_none_on_error(self, collector):
        """Test that encoding returns None on any error."""
        # Try to encode with invalid input
        result = collector.encode_screenshot("")
        assert result is None
        
        result = collector.encode_screenshot("/invalid/path/to/file.png")
        assert result is None
    
    def test_encode_does_not_raise_exception(self, collector, temp_dir):
        """Test that encoding never raises exceptions."""
        # Try various invalid inputs - none should raise exceptions
        try:
            collector.encode_screenshot("")
            collector.encode_screenshot("/nonexistent/path.png")
            collector.encode_screenshot(str(temp_dir))  # Directory
            
            # Create invalid file
            invalid = temp_dir / "invalid.png"
            with open(invalid, 'w') as f:
                f.write("not an image")
            collector.encode_screenshot(str(invalid))
            
        except Exception as e:
            pytest.fail(f"encode_screenshot raised an exception: {e}")
