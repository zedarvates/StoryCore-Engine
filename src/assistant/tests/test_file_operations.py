"""
Unit tests for FileOperationsManager

Tests specific edge cases and error conditions for file operations.
"""

import pytest
from pathlib import Path
import json

from src.assistant.file_operations import FileOperationsManager
from src.assistant.exceptions import (
    PathValidationError,
    ConfirmationRequiredError,
    ResourceError
)


class TestFileOperationsManager:
    """Test suite for FileOperationsManager"""
    
    def test_initialization(self, temp_project_dir):
        """Test that FileOperationsManager initializes correctly"""
        file_ops = FileOperationsManager(temp_project_dir)
        assert file_ops.project_directory == temp_project_dir.resolve()
        assert file_ops.project_directory.exists()
    
    def test_validate_path_within_directory(self, temp_project_dir):
        """Test that paths within project directory are valid"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        # Test various valid paths
        valid_paths = [
            temp_project_dir / "file.txt",
            temp_project_dir / "subdir" / "file.txt",
            temp_project_dir / "deep" / "nested" / "path" / "file.txt"
        ]
        
        for path in valid_paths:
            assert file_ops.validate_path(path) is True
    
    def test_validate_path_root_directory_rejection(self, temp_project_dir):
        """Test that root directory access is rejected"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        with pytest.raises(PathValidationError) as exc_info:
            file_ops.validate_path(Path("/"))
        
        assert "outside project directory" in str(exc_info.value).lower()
    
    def test_validate_path_parent_directory_rejection(self, temp_project_dir):
        """Test that parent directory traversal is rejected"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        # Try to access parent directory
        parent_path = temp_project_dir / ".." / "other_dir"
        
        with pytest.raises(PathValidationError) as exc_info:
            file_ops.validate_path(parent_path)
        
        assert "outside project directory" in str(exc_info.value).lower()
    
    def test_validate_path_absolute_outside_rejection(self, temp_project_dir):
        """Test that absolute paths outside project directory are rejected"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        # Try various absolute paths outside project directory
        outside_paths = [
            Path("/tmp/outside"),
            Path("/etc/passwd"),
            Path("/home/other_user/file.txt")
        ]
        
        for path in outside_paths:
            with pytest.raises(PathValidationError):
                file_ops.validate_path(path)
    
    def test_validate_path_symbolic_link_outside_rejection(self, temp_project_dir):
        """Test that symbolic links outside project dir are rejected"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        # Create a directory outside project dir
        import tempfile
        external_dir = Path(tempfile.mkdtemp())
        external_file = external_dir / "external.txt"
        external_file.write_text("external content")
        
        try:
            # Create symlink inside project dir pointing outside
            link_path = temp_project_dir / "link_to_external"
            link_path.symlink_to(external_file)
            
            # Validation should fail because resolved path is outside
            with pytest.raises(PathValidationError):
                file_ops.validate_path(link_path)
        
        finally:
            # Cleanup
            if link_path.exists():
                link_path.unlink()
            if external_file.exists():
                external_file.unlink()
            if external_dir.exists():
                external_dir.rmdir()
    
    def test_read_file_success(self, temp_project_dir):
        """Test successful file reading"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        # Create test file
        test_file = temp_project_dir / "test.txt"
        test_content = b"Hello, World!"
        test_file.write_bytes(test_content)
        
        # Read file
        content = file_ops.read_file(test_file)
        assert content == test_content
    
    def test_read_file_not_found(self, temp_project_dir):
        """Test reading non-existent file"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        non_existent = temp_project_dir / "does_not_exist.txt"
        
        with pytest.raises(ResourceError) as exc_info:
            file_ops.read_file(non_existent)
        
        assert exc_info.value.code == "FILE_NOT_FOUND"
    
    def test_read_file_is_directory(self, temp_project_dir):
        """Test reading a directory instead of file"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        # Create directory
        test_dir = temp_project_dir / "test_dir"
        test_dir.mkdir()
        
        with pytest.raises(ResourceError) as exc_info:
            file_ops.read_file(test_dir)
        
        assert exc_info.value.code == "NOT_A_FILE"
    
    def test_read_json_success(self, temp_project_dir):
        """Test successful JSON reading"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        # Create test JSON file
        test_file = temp_project_dir / "test.json"
        test_data = {"key": "value", "number": 42}
        test_file.write_text(json.dumps(test_data))
        
        # Read JSON
        data = file_ops.read_json(test_file)
        assert data == test_data
    
    def test_read_json_invalid(self, temp_project_dir):
        """Test reading invalid JSON"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        # Create file with invalid JSON
        test_file = temp_project_dir / "invalid.json"
        test_file.write_text("{ invalid json }")
        
        with pytest.raises(ResourceError) as exc_info:
            file_ops.read_json(test_file)
        
        assert exc_info.value.code == "JSON_PARSE_ERROR"
    
    def test_write_file_success(self, temp_project_dir):
        """Test successful file writing"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        test_file = temp_project_dir / "output.txt"
        test_content = b"Test content"
        
        file_ops.write_file(test_file, test_content)
        
        assert test_file.exists()
        assert test_file.read_bytes() == test_content
    
    def test_write_file_creates_directories(self, temp_project_dir):
        """Test that write_file creates parent directories"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        test_file = temp_project_dir / "deep" / "nested" / "path" / "file.txt"
        test_content = b"Test content"
        
        file_ops.write_file(test_file, test_content)
        
        assert test_file.exists()
        assert test_file.read_bytes() == test_content
    
    def test_write_json_success(self, temp_project_dir):
        """Test successful JSON writing"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        test_file = temp_project_dir / "output.json"
        test_data = {"key": "value", "list": [1, 2, 3]}
        
        file_ops.write_json(test_file, test_data)
        
        assert test_file.exists()
        loaded_data = json.loads(test_file.read_text())
        assert loaded_data == test_data
    
    def test_delete_file_without_confirmation_fails(self, temp_project_dir):
        """Test that delete without confirmation is rejected"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        # Create test file
        test_file = temp_project_dir / "to_delete.txt"
        test_file.write_text("content")
        
        # Try to delete without confirmation
        with pytest.raises(ConfirmationRequiredError) as exc_info:
            file_ops.delete_file(test_file, confirmed=False)
        
        # File should still exist
        assert test_file.exists()
        assert exc_info.value.code == "CONFIRMATION_REQUIRED"
    
    def test_delete_file_with_confirmation_succeeds(self, temp_project_dir):
        """Test that delete with confirmation succeeds"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        # Create test file
        test_file = temp_project_dir / "to_delete.txt"
        test_file.write_text("content")
        
        # Delete with confirmation
        result = file_ops.delete_file(test_file, confirmed=True)
        
        assert result is True
        assert not test_file.exists()
    
    def test_delete_non_existent_file(self, temp_project_dir):
        """Test deleting non-existent file returns False"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        non_existent = temp_project_dir / "does_not_exist.txt"
        
        result = file_ops.delete_file(non_existent, confirmed=True)
        assert result is False
    
    def test_list_files_all(self, temp_project_dir):
        """Test listing all files"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        # Create test files
        (temp_project_dir / "file1.txt").write_text("content1")
        (temp_project_dir / "file2.txt").write_text("content2")
        (temp_project_dir / "subdir").mkdir()
        (temp_project_dir / "subdir" / "file3.txt").write_text("content3")
        
        files = file_ops.list_files("*")
        
        assert len(files) == 3
        assert all(f.is_file() for f in files)
    
    def test_list_files_pattern(self, temp_project_dir):
        """Test listing files with pattern"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        # Create test files
        (temp_project_dir / "file1.txt").write_text("content1")
        (temp_project_dir / "file2.json").write_text("{}")
        (temp_project_dir / "file3.txt").write_text("content3")
        
        # List only .txt files
        txt_files = file_ops.list_files("*.txt", recursive=False)
        
        assert len(txt_files) == 2
        assert all(f.suffix == ".txt" for f in txt_files)
    
    def test_file_exists(self, temp_project_dir):
        """Test file existence check"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        # Create test file
        test_file = temp_project_dir / "exists.txt"
        test_file.write_text("content")
        
        assert file_ops.file_exists(test_file) is True
        assert file_ops.file_exists(temp_project_dir / "not_exists.txt") is False
    
    def test_get_file_size(self, temp_project_dir):
        """Test getting file size"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        # Create test file
        test_file = temp_project_dir / "sized.txt"
        test_content = b"Hello, World!"
        test_file.write_bytes(test_content)
        
        size = file_ops.get_file_size(test_file)
        assert size == len(test_content)
    
    def test_copy_file_success(self, temp_project_dir):
        """Test successful file copy"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        # Create source file
        source = temp_project_dir / "source.txt"
        source.write_text("content")
        
        # Copy file
        destination = temp_project_dir / "destination.txt"
        file_ops.copy_file(source, destination)
        
        assert destination.exists()
        assert destination.read_text() == "content"
        assert source.exists()  # Source should still exist
    
    def test_move_file_success(self, temp_project_dir):
        """Test successful file move"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        # Create source file
        source = temp_project_dir / "source.txt"
        source.write_text("content")
        
        # Move file
        destination = temp_project_dir / "moved.txt"
        file_ops.move_file(source, destination)
        
        assert destination.exists()
        assert destination.read_text() == "content"
        assert not source.exists()  # Source should be gone
    
    def test_path_validation_with_string_input(self, temp_project_dir):
        """Test that path validation works with string inputs"""
        file_ops = FileOperationsManager(temp_project_dir)
        
        # Test with string path
        valid_path_str = str(temp_project_dir / "file.txt")
        assert file_ops.validate_path(valid_path_str) is True
        
        # Test with invalid string path
        invalid_path_str = "/tmp/outside"
        with pytest.raises(PathValidationError):
            file_ops.validate_path(invalid_path_str)
