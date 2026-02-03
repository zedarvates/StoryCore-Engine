"""
Unit tests for screenshot validation functionality.

Tests the validate_screenshot method in DiagnosticCollector to ensure
it correctly validates file formats and sizes according to requirements.
"""

import pytest
import tempfile
import os
from pathlib import Path
from src.diagnostic_collector import DiagnosticCollector


class TestScreenshotValidation:
    """Test suite for screenshot validation."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.collector = DiagnosticCollector()
        self.temp_dir = tempfile.mkdtemp()
    
    def teardown_method(self):
        """Clean up test fixtures."""
        # Clean up temporary directory
        import shutil
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir)
    
    def create_test_file(self, filename: str, size_mb: float = 1.0, magic_bytes: bytes = None) -> str:
        """
        Create a test file with specified size and optional magic bytes.
        
        Args:
            filename: Name of the file to create
            size_mb: Size of the file in MB
            magic_bytes: Optional magic bytes to write at the start of the file
            
        Returns:
            Path to the created file
        """
        file_path = os.path.join(self.temp_dir, filename)
        size_bytes = int(size_mb * 1024 * 1024)
        
        with open(file_path, 'wb') as f:
            if magic_bytes:
                f.write(magic_bytes)
                # Fill the rest with zeros
                remaining = size_bytes - len(magic_bytes)
                if remaining > 0:
                    f.write(b'\x00' * remaining)
            else:
                # Write zeros
                f.write(b'\x00' * size_bytes)
        
        return file_path
    
    # Test valid file formats
    
    def test_valid_png_file(self):
        """Test that a valid PNG file passes validation."""
        # PNG magic bytes: \x89PNG\r\n\x1a\n
        png_magic = b'\x89PNG\r\n\x1a\n'
        file_path = self.create_test_file("test.png", size_mb=1.0, magic_bytes=png_magic)
        
        is_valid, error = self.collector.validate_screenshot(file_path)
        
        assert is_valid is True
        assert error is None
    
    def test_valid_jpg_file(self):
        """Test that a valid JPG file passes validation."""
        # JPEG magic bytes: \xff\xd8\xff
        jpg_magic = b'\xff\xd8\xff\xe0'
        file_path = self.create_test_file("test.jpg", size_mb=1.0, magic_bytes=jpg_magic)
        
        is_valid, error = self.collector.validate_screenshot(file_path)
        
        assert is_valid is True
        assert error is None
    
    def test_valid_jpeg_file(self):
        """Test that a valid JPEG file (with .jpeg extension) passes validation."""
        # JPEG magic bytes: \xff\xd8\xff
        jpeg_magic = b'\xff\xd8\xff\xe0'
        file_path = self.create_test_file("test.jpeg", size_mb=1.0, magic_bytes=jpeg_magic)
        
        is_valid, error = self.collector.validate_screenshot(file_path)
        
        assert is_valid is True
        assert error is None
    
    def test_valid_gif_file(self):
        """Test that a valid GIF file passes validation."""
        # GIF magic bytes: GIF89a
        gif_magic = b'GIF89a'
        file_path = self.create_test_file("test.gif", size_mb=1.0, magic_bytes=gif_magic)
        
        is_valid, error = self.collector.validate_screenshot(file_path)
        
        assert is_valid is True
        assert error is None
    
    # Test file size limits
    
    def test_file_at_max_size(self):
        """Test that a file at exactly 5MB passes validation."""
        png_magic = b'\x89PNG\r\n\x1a\n'
        file_path = self.create_test_file("test.png", size_mb=5.0, magic_bytes=png_magic)
        
        is_valid, error = self.collector.validate_screenshot(file_path)
        
        assert is_valid is True
        assert error is None
    
    def test_file_exceeds_max_size(self):
        """Test that a file exceeding 5MB fails validation with descriptive error."""
        png_magic = b'\x89PNG\r\n\x1a\n'
        file_path = self.create_test_file("test.png", size_mb=6.0, magic_bytes=png_magic)
        
        is_valid, error = self.collector.validate_screenshot(file_path)
        
        assert is_valid is False
        assert error is not None
        assert "exceeds maximum allowed size" in error
        assert "5 MB" in error
    
    def test_small_file_passes(self):
        """Test that a small file (< 1MB) passes validation."""
        png_magic = b'\x89PNG\r\n\x1a\n'
        file_path = self.create_test_file("test.png", size_mb=0.5, magic_bytes=png_magic)
        
        is_valid, error = self.collector.validate_screenshot(file_path)
        
        assert is_valid is True
        assert error is None
    
    # Test invalid file formats
    
    def test_invalid_extension_txt(self):
        """Test that a .txt file fails validation with descriptive error."""
        file_path = self.create_test_file("test.txt", size_mb=1.0)
        
        is_valid, error = self.collector.validate_screenshot(file_path)
        
        assert is_valid is False
        assert error is not None
        assert "Invalid file format" in error
        assert ".txt" in error
        assert "Accepted formats" in error
    
    def test_invalid_extension_pdf(self):
        """Test that a .pdf file fails validation."""
        file_path = self.create_test_file("test.pdf", size_mb=1.0)
        
        is_valid, error = self.collector.validate_screenshot(file_path)
        
        assert is_valid is False
        assert error is not None
        assert "Invalid file format" in error
    
    def test_no_extension(self):
        """Test that a file without extension fails validation."""
        file_path = self.create_test_file("test", size_mb=1.0)
        
        is_valid, error = self.collector.validate_screenshot(file_path)
        
        assert is_valid is False
        assert error is not None
        assert "Invalid file format" in error
    
    # Test magic byte validation
    
    def test_mismatched_extension_and_content(self):
        """Test that a file with PNG content but .jpg extension fails validation."""
        # PNG magic bytes but .jpg extension
        png_magic = b'\x89PNG\r\n\x1a\n'
        file_path = self.create_test_file("test.jpg", size_mb=1.0, magic_bytes=png_magic)
        
        is_valid, error = self.collector.validate_screenshot(file_path)
        
        assert is_valid is False
        assert error is not None
        assert "File content is PNG" in error
        assert ".png extension" in error
    
    def test_invalid_image_content(self):
        """Test that a file with invalid image content fails validation."""
        # Random bytes that don't match any image format
        invalid_magic = b'INVALID_IMAGE_DATA'
        file_path = self.create_test_file("test.png", size_mb=1.0, magic_bytes=invalid_magic)
        
        is_valid, error = self.collector.validate_screenshot(file_path)
        
        assert is_valid is False
        assert error is not None
        assert "does not appear to be a valid image" in error
    
    # Test edge cases
    
    def test_nonexistent_file(self):
        """Test that a nonexistent file fails validation with descriptive error."""
        file_path = os.path.join(self.temp_dir, "nonexistent.png")
        
        is_valid, error = self.collector.validate_screenshot(file_path)
        
        assert is_valid is False
        assert error is not None
        assert "File not found" in error
    
    def test_directory_instead_of_file(self):
        """Test that a directory path fails validation."""
        dir_path = os.path.join(self.temp_dir, "test_dir")
        os.makedirs(dir_path, exist_ok=True)
        
        is_valid, error = self.collector.validate_screenshot(dir_path)
        
        assert is_valid is False
        assert error is not None
        assert "not a file" in error
    
    def test_case_insensitive_extension(self):
        """Test that file extensions are case-insensitive."""
        png_magic = b'\x89PNG\r\n\x1a\n'
        file_path = self.create_test_file("test.PNG", size_mb=1.0, magic_bytes=png_magic)
        
        is_valid, error = self.collector.validate_screenshot(file_path)
        
        assert is_valid is True
        assert error is None
    
    def test_empty_file(self):
        """Test that an empty file fails validation."""
        file_path = self.create_test_file("test.png", size_mb=0.0)
        
        is_valid, error = self.collector.validate_screenshot(file_path)
        
        # Empty file should fail because it doesn't have valid magic bytes
        assert is_valid is False
        assert error is not None
    
    # Test error messages are descriptive
    
    def test_error_message_includes_file_size(self):
        """Test that error message for oversized file includes actual size."""
        png_magic = b'\x89PNG\r\n\x1a\n'
        file_path = self.create_test_file("test.png", size_mb=7.5, magic_bytes=png_magic)
        
        is_valid, error = self.collector.validate_screenshot(file_path)
        
        assert is_valid is False
        assert error is not None
        assert "7.5" in error or "7.50" in error  # File size should be in error message
    
    def test_error_message_lists_accepted_formats(self):
        """Test that error message for invalid format lists accepted formats."""
        file_path = self.create_test_file("test.bmp", size_mb=1.0)
        
        is_valid, error = self.collector.validate_screenshot(file_path)
        
        assert is_valid is False
        assert error is not None
        assert ".png" in error
        assert ".jpg" in error or ".jpeg" in error
        assert ".gif" in error


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
