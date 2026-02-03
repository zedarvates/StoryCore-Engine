"""
Unit tests for QualityValidator

Tests validation of images and videos including format checks,
size validation, and metadata extraction.
"""

import pytest
import tempfile
from pathlib import Path
from PIL import Image
import struct

from src.comfyui_test_framework import QualityValidator, ValidationResult


class TestQualityValidator:
    """Test suite for QualityValidator class."""
    
    @pytest.fixture
    def validator(self):
        """Create a QualityValidator instance."""
        return QualityValidator()
    
    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for test files."""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield Path(tmpdir)
    
    def create_test_image(self, path: Path, width: int = 512, height: int = 512, format: str = 'PNG'):
        """Helper to create a test image."""
        # Create a more complex image to ensure it's large enough
        img = Image.new('RGB', (width, height))
        pixels = img.load()
        # Add some variation to increase file size
        for i in range(width):
            for j in range(height):
                pixels[i, j] = ((i * 255) // width, (j * 255) // height, ((i + j) * 255) // (width + height))
        img.save(path, format=format)
    
    def create_test_video(self, path: Path, duration: float = 1.0):
        """Helper to create a minimal test video file."""
        # Create a minimal MP4 file with proper structure
        # This is a simplified version - in real tests you'd use ffmpeg
        with open(path, 'wb') as f:
            # Write minimal MP4 header
            f.write(b'\x00\x00\x00\x20')  # Box size
            f.write(b'ftyp')  # Box type
            f.write(b'isom')  # Major brand
            f.write(b'\x00\x00\x02\x00')  # Minor version
            f.write(b'isom')  # Compatible brand
            f.write(b'iso2')
            f.write(b'mp41')
            # Add some padding to meet minimum size
            f.write(b'\x00' * (100 * 1024))  # 100KB minimum
    
    # Image validation tests
    
    def test_validate_image_success(self, validator, temp_dir):
        """Test successful image validation."""
        image_path = temp_dir / "test.png"
        self.create_test_image(image_path, 1024, 768)
        
        result = validator.validate_image(image_path)
        
        assert result.passed is True
        assert result.checks['file_exists'] is True
        assert result.checks['format_check'] is True
        assert result.checks['size_check'] is True
        assert result.checks['dimensions_check'] is True
        assert len(result.errors) == 0
        assert result.metadata['width'] == 1024
        assert result.metadata['height'] == 768
        assert result.metadata['dimensions'] == [1024, 768]
        assert result.metadata['file_size'] > validator.IMAGE_MIN_SIZE
    
    def test_validate_image_file_not_found(self, validator, temp_dir):
        """Test image validation when file doesn't exist."""
        image_path = temp_dir / "nonexistent.png"
        
        result = validator.validate_image(image_path)
        
        assert result.passed is False
        assert result.checks['file_exists'] is False
        assert len(result.errors) > 0
        assert "not found" in result.errors[0].lower()
    
    def test_validate_image_invalid_format(self, validator, temp_dir):
        """Test image validation with invalid format."""
        image_path = temp_dir / "test.txt"
        with open(image_path, 'w') as f:
            f.write("This is not an image")
        
        result = validator.validate_image(image_path)
        
        assert result.passed is False
        assert result.checks['format_check'] is False
        assert any("format" in error.lower() for error in result.errors)
    
    def test_validate_image_too_small(self, validator, temp_dir):
        """Test image validation when file is too small."""
        image_path = temp_dir / "test.png"
        # Create a very small file
        with open(image_path, 'wb') as f:
            f.write(b'\x89PNG\r\n\x1a\n')  # Just PNG header
        
        result = validator.validate_image(image_path)
        
        assert result.passed is False
        assert result.checks['size_check'] is False
        assert any("size" in error.lower() for error in result.errors)
    
    def test_validate_image_jpeg_format(self, validator, temp_dir):
        """Test image validation with JPEG format."""
        image_path = temp_dir / "test.jpg"
        self.create_test_image(image_path, 800, 600, format='JPEG')
        
        result = validator.validate_image(image_path)
        
        assert result.passed is True
        assert result.checks['format_check'] is True
        assert result.metadata['width'] == 800
        assert result.metadata['height'] == 600
    
    # Video validation tests
    
    def test_validate_video_file_not_found(self, validator, temp_dir):
        """Test video validation when file doesn't exist."""
        video_path = temp_dir / "nonexistent.mp4"
        
        result = validator.validate_video(video_path)
        
        assert result.passed is False
        assert result.checks['file_exists'] is False
        assert len(result.errors) > 0
        assert "not found" in result.errors[0].lower()
    
    def test_validate_video_invalid_format(self, validator, temp_dir):
        """Test video validation with invalid format."""
        video_path = temp_dir / "test.txt"
        with open(video_path, 'w') as f:
            f.write("This is not a video")
        
        result = validator.validate_video(video_path)
        
        assert result.passed is False
        assert result.checks['format_check'] is False
        assert any("format" in error.lower() for error in result.errors)
    
    def test_validate_video_too_small(self, validator, temp_dir):
        """Test video validation when file is too small."""
        video_path = temp_dir / "test.mp4"
        # Create a very small file
        with open(video_path, 'wb') as f:
            f.write(b'\x00\x00\x00\x20ftyp')  # Just MP4 header
        
        result = validator.validate_video(video_path)
        
        assert result.passed is False
        assert result.checks['size_check'] is False
        assert any("size" in error.lower() for error in result.errors)
    
    # Format checking tests
    
    def test_check_file_format_png(self, validator, temp_dir):
        """Test format checking for PNG files."""
        image_path = temp_dir / "test.png"
        self.create_test_image(image_path, format='PNG')
        
        result = validator.check_file_format(image_path, ['.png', '.jpg'])
        
        assert result is True
    
    def test_check_file_format_jpeg(self, validator, temp_dir):
        """Test format checking for JPEG files."""
        image_path = temp_dir / "test.jpg"
        self.create_test_image(image_path, format='JPEG')
        
        result = validator.check_file_format(image_path, ['.png', '.jpg', '.jpeg'])
        
        assert result is True
    
    def test_check_file_format_invalid_extension(self, validator, temp_dir):
        """Test format checking with invalid extension."""
        file_path = temp_dir / "test.txt"
        with open(file_path, 'w') as f:
            f.write("test")
        
        result = validator.check_file_format(file_path, ['.png', '.jpg'])
        
        assert result is False
    
    # Size checking tests
    
    def test_check_file_size_valid(self, validator, temp_dir):
        """Test size checking with valid file size."""
        file_path = temp_dir / "test.png"
        # Create a larger image to ensure it meets minimum size
        self.create_test_image(file_path, 1024, 1024)
        
        result = validator.check_file_size(
            file_path,
            validator.IMAGE_MIN_SIZE,
            validator.IMAGE_MAX_SIZE
        )
        
        assert result is True
    
    def test_check_file_size_too_small(self, validator, temp_dir):
        """Test size checking when file is too small."""
        file_path = temp_dir / "test.txt"
        with open(file_path, 'w') as f:
            f.write("small")
        
        result = validator.check_file_size(
            file_path,
            validator.IMAGE_MIN_SIZE,
            validator.IMAGE_MAX_SIZE
        )
        
        assert result is False
    
    def test_check_file_size_too_large(self, validator, temp_dir):
        """Test size checking when file is too large."""
        file_path = temp_dir / "test.txt"
        # Create a file larger than max size
        with open(file_path, 'wb') as f:
            f.write(b'x' * (validator.IMAGE_MAX_SIZE + 1000))
        
        result = validator.check_file_size(
            file_path,
            validator.IMAGE_MIN_SIZE,
            validator.IMAGE_MAX_SIZE
        )
        
        assert result is False
    
    # Dimension extraction tests
    
    def test_get_image_dimensions(self, validator, temp_dir):
        """Test getting image dimensions."""
        image_path = temp_dir / "test.png"
        self.create_test_image(image_path, 1920, 1080)
        
        width, height = validator.get_image_dimensions(image_path)
        
        assert width == 1920
        assert height == 1080
    
    def test_get_image_dimensions_invalid_file(self, validator, temp_dir):
        """Test getting dimensions from invalid file."""
        file_path = temp_dir / "test.txt"
        with open(file_path, 'w') as f:
            f.write("not an image")
        
        with pytest.raises(Exception) as exc_info:
            validator.get_image_dimensions(file_path)
        
        assert "Failed to get image dimensions" in str(exc_info.value)
    
    # Validation result tests
    
    def test_validation_result_structure(self, validator, temp_dir):
        """Test ValidationResult structure and fields."""
        image_path = temp_dir / "test.png"
        self.create_test_image(image_path)
        
        result = validator.validate_image(image_path)
        
        assert isinstance(result, ValidationResult)
        assert isinstance(result.passed, bool)
        assert isinstance(result.checks, dict)
        assert isinstance(result.errors, list)
        assert isinstance(result.metadata, dict)
    
    def test_validation_result_error_messages(self, validator, temp_dir):
        """Test that validation errors provide specific messages."""
        # Test with invalid format
        image_path = temp_dir / "test.txt"
        with open(image_path, 'w') as f:
            f.write("not an image")
        
        result = validator.validate_image(image_path)
        
        assert result.passed is False
        assert len(result.errors) > 0
        # Check that error messages are descriptive
        for error in result.errors:
            assert len(error) > 10  # Should be descriptive
            assert any(keyword in error.lower() for keyword in ['format', 'size', 'dimension'])


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
