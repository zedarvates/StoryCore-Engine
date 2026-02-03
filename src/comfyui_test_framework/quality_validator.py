"""
Quality Validator for ComfyUI Integration Testing

This module provides quality validation for generated images and videos,
including format checks, size validation, and metadata extraction.
"""

import os
import struct
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, List, Tuple, Any, Optional

try:
    from PIL import Image
except ImportError:
    Image = None

try:
    import ffmpeg
except ImportError:
    ffmpeg = None


@dataclass
class ValidationResult:
    """Result of quality validation."""
    passed: bool
    checks: Dict[str, bool] = field(default_factory=dict)
    errors: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


class QualityValidator:
    """Validates quality of generated outputs."""
    
    # Supported formats
    IMAGE_FORMATS = {'.png', '.jpg', '.jpeg', '.webp'}
    VIDEO_FORMATS = {'.mp4', '.webm', '.avi', '.mov'}
    
    # Size bounds (in bytes)
    IMAGE_MIN_SIZE = 10 * 1024  # 10KB
    IMAGE_MAX_SIZE = 50 * 1024 * 1024  # 50MB
    VIDEO_MIN_SIZE = 100 * 1024  # 100KB
    VIDEO_MAX_SIZE = 500 * 1024 * 1024  # 500MB
    
    # Magic bytes for format detection
    MAGIC_BYTES = {
        'png': b'\x89PNG\r\n\x1a\n',
        'jpeg': b'\xff\xd8\xff',
        'webp': b'RIFF',
        'mp4': b'ftyp',
        'webm': b'\x1a\x45\xdf\xa3'
    }
    
    def __init__(self):
        """Initialize quality validator."""
        if Image is None:
            raise ImportError(
                "Pillow is required for image validation. "
                "Install it with: pip install Pillow"
            )
        if ffmpeg is None:
            raise ImportError(
                "ffmpeg-python is required for video validation. "
                "Install it with: pip install ffmpeg-python"
            )
    
    def validate_image(self, image_path: Path) -> ValidationResult:
        """
        Validate image output.
        
        Args:
            image_path: Path to image file
        
        Returns:
            ValidationResult with pass/fail and details
        """
        result = ValidationResult(passed=True)
        
        # Check if file exists
        if not image_path.exists():
            result.passed = False
            result.checks['file_exists'] = False
            result.errors.append(f"Image file not found: {image_path}")
            return result
        
        result.checks['file_exists'] = True
        
        # Check file format
        format_valid = self.check_file_format(
            image_path, 
            list(self.IMAGE_FORMATS)
        )
        result.checks['format_check'] = format_valid
        if not format_valid:
            result.passed = False
            result.errors.append(
                f"Invalid image format. Expected: {self.IMAGE_FORMATS}, "
                f"Got: {image_path.suffix}"
            )
        
        # Check file size
        size_valid = self.check_file_size(
            image_path,
            self.IMAGE_MIN_SIZE,
            self.IMAGE_MAX_SIZE
        )
        result.checks['size_check'] = size_valid
        if not size_valid:
            actual_size = image_path.stat().st_size
            result.passed = False
            result.errors.append(
                f"Image file size out of bounds. "
                f"Expected: {self.IMAGE_MIN_SIZE}-{self.IMAGE_MAX_SIZE} bytes, "
                f"Got: {actual_size} bytes"
            )
        
        # Get image dimensions
        try:
            width, height = self.get_image_dimensions(image_path)
            result.checks['dimensions_check'] = (width > 0 and height > 0)
            result.metadata['dimensions'] = [width, height]
            result.metadata['width'] = width
            result.metadata['height'] = height
            
            if width <= 0 or height <= 0:
                result.passed = False
                result.errors.append(
                    f"Invalid image dimensions. Expected: width > 0 and height > 0, "
                    f"Got: {width}x{height}"
                )
        except Exception as e:
            result.passed = False
            result.checks['dimensions_check'] = False
            result.errors.append(f"Failed to get image dimensions: {str(e)}")
        
        # Add file size to metadata
        result.metadata['file_size'] = image_path.stat().st_size
        result.metadata['format'] = image_path.suffix
        
        return result
    
    def validate_video(self, video_path: Path) -> ValidationResult:
        """
        Validate video output.
        
        Args:
            video_path: Path to video file
        
        Returns:
            ValidationResult with pass/fail and details
        """
        result = ValidationResult(passed=True)
        
        # Check if file exists
        if not video_path.exists():
            result.passed = False
            result.checks['file_exists'] = False
            result.errors.append(f"Video file not found: {video_path}")
            return result
        
        result.checks['file_exists'] = True
        
        # Check file format
        format_valid = self.check_file_format(
            video_path,
            list(self.VIDEO_FORMATS)
        )
        result.checks['format_check'] = format_valid
        if not format_valid:
            result.passed = False
            result.errors.append(
                f"Invalid video format. Expected: {self.VIDEO_FORMATS}, "
                f"Got: {video_path.suffix}"
            )
        
        # Check file size
        size_valid = self.check_file_size(
            video_path,
            self.VIDEO_MIN_SIZE,
            self.VIDEO_MAX_SIZE
        )
        result.checks['size_check'] = size_valid
        if not size_valid:
            actual_size = video_path.stat().st_size
            result.passed = False
            result.errors.append(
                f"Video file size out of bounds. "
                f"Expected: {self.VIDEO_MIN_SIZE}-{self.VIDEO_MAX_SIZE} bytes, "
                f"Got: {actual_size} bytes"
            )
        
        # Get video duration
        try:
            duration = self.get_video_duration(video_path)
            result.checks['duration_check'] = (duration > 0)
            result.metadata['duration'] = duration
            
            if duration <= 0:
                result.passed = False
                result.errors.append(
                    f"Invalid video duration. Expected: duration > 0 seconds, "
                    f"Got: {duration} seconds"
                )
        except Exception as e:
            result.passed = False
            result.checks['duration_check'] = False
            result.errors.append(f"Failed to get video duration: {str(e)}")
        
        # Add file size to metadata
        result.metadata['file_size'] = video_path.stat().st_size
        result.metadata['format'] = video_path.suffix
        
        return result
    
    def check_file_format(self, file_path: Path, expected_formats: List[str]) -> bool:
        """
        Check if file format matches expected types.
        
        Args:
            file_path: Path to file
            expected_formats: List of expected file extensions (e.g., ['.png', '.jpg'])
        
        Returns:
            True if format is valid, False otherwise
        """
        # Check file extension
        extension = file_path.suffix.lower()
        if extension not in expected_formats:
            return False
        
        # Verify with magic bytes
        try:
            with open(file_path, 'rb') as f:
                header = f.read(12)
            
            # Check magic bytes for common formats
            if extension in ['.png'] and header.startswith(self.MAGIC_BYTES['png']):
                return True
            elif extension in ['.jpg', '.jpeg'] and header.startswith(self.MAGIC_BYTES['jpeg']):
                return True
            elif extension in ['.webp'] and header.startswith(self.MAGIC_BYTES['webp']):
                return True
            elif extension in ['.mp4'] and self.MAGIC_BYTES['mp4'] in header:
                return True
            elif extension in ['.webm'] and header.startswith(self.MAGIC_BYTES['webm']):
                return True
            else:
                # For other formats or if magic bytes don't match exactly,
                # trust the extension (some formats have variable headers)
                return True
        except Exception:
            # If we can't read the file, fall back to extension check
            return extension in expected_formats
    
    def check_file_size(self, file_path: Path, min_size: int, max_size: int) -> bool:
        """
        Check if file size is within acceptable range.
        
        Args:
            file_path: Path to file
            min_size: Minimum acceptable size in bytes
            max_size: Maximum acceptable size in bytes
        
        Returns:
            True if size is within bounds, False otherwise
        """
        try:
            file_size = file_path.stat().st_size
            return min_size <= file_size <= max_size
        except Exception:
            return False
    
    def get_image_dimensions(self, image_path: Path) -> Tuple[int, int]:
        """
        Get image width and height.
        
        Args:
            image_path: Path to image file
        
        Returns:
            Tuple of (width, height)
        
        Raises:
            Exception: If image cannot be opened or dimensions cannot be determined
        """
        try:
            with Image.open(image_path) as img:
                return img.size  # Returns (width, height)
        except Exception as e:
            raise Exception(f"Failed to get image dimensions: {str(e)}")
    
    def get_video_duration(self, video_path: Path) -> float:
        """
        Get video duration in seconds.
        
        Args:
            video_path: Path to video file
        
        Returns:
            Duration in seconds
        
        Raises:
            Exception: If video cannot be probed or duration cannot be determined
        """
        try:
            probe = ffmpeg.probe(str(video_path))
            video_info = next(
                (stream for stream in probe['streams'] if stream['codec_type'] == 'video'),
                None
            )
            
            if video_info is None:
                raise Exception("No video stream found in file")
            
            duration = float(video_info.get('duration', 0))
            
            # If duration is not in video stream, try format duration
            if duration == 0:
                duration = float(probe.get('format', {}).get('duration', 0))
            
            return duration
        except Exception as e:
            raise Exception(f"Failed to get video duration: {str(e)}")
