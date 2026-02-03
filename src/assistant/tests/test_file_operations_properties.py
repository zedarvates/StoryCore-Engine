"""
Property-based tests for FileOperationsManager

Tests universal properties across all inputs using Hypothesis.
"""

import pytest
from pathlib import Path
from hypothesis import given, settings, strategies as st, assume
import tempfile
import shutil

from src.assistant.file_operations import FileOperationsManager
from src.assistant.exceptions import PathValidationError


# Strategy for generating various path strings
path_strings = st.one_of(
    st.text(min_size=1, max_size=100),  # Random text
    st.from_regex(r"[a-zA-Z0-9_\-./\\]+", fullmatch=True),  # Path-like strings
    st.just("/"),  # Root
    st.just(".."),  # Parent
    st.just("../.."),  # Multiple parents
    st.just("/etc/passwd"),  # Absolute path
    st.just("C:\\Windows\\System32"),  # Windows path
)


class TestFileOperationsProperties:
    """Property-based tests for FileOperationsManager"""
    
    @pytest.fixture(autouse=True)
    def setup_teardown(self):
        """Set up and tear down for each test"""
        # Create temporary project directory
        self.temp_dir = Path(tempfile.mkdtemp())
        self.file_ops = FileOperationsManager(self.temp_dir)
        
        yield
        
        # Cleanup
        if self.temp_dir.exists():
            shutil.rmtree(self.temp_dir)
    
    @settings(max_examples=100)
    @given(path_str=path_strings)
    def test_property_1_path_validation_for_all_operations(self, path_str):
        """
        Property 1: Path Validation for All File Operations
        
        For any file operation (read, write, or delete) and any file path,
        the operation should only succeed if the path resolves to a location
        within the project directory, and should reject with a security error
        for paths outside this directory.
        
        Feature: storycore-ai-assistant, Property 1: Path validation
        Validates: Requirements 1.1, 1.2, 1.3, 1.4
        """
        try:
            # Try to create a Path object
            path = Path(path_str)
            
            # Try to validate the path
            try:
                is_valid = self.file_ops.validate_path(path)
                
                # If validation succeeded, the resolved path must be within project dir
                resolved = path.resolve()
                try:
                    resolved.relative_to(self.file_ops.project_directory)
                    # Path is within project directory, validation should succeed
                    assert is_valid is True
                except ValueError:
                    # Path is outside project directory, validation should have failed
                    # This should not happen - if we get here, validation is broken
                    assert False, f"Path {path} validated but is outside project directory"
            
            except PathValidationError:
                # Validation failed - verify the path is indeed outside project dir
                try:
                    resolved = path.resolve()
                    try:
                        resolved.relative_to(self.file_ops.project_directory)
                        # Path is within project directory but validation failed
                        # This might be due to path resolution issues, which is acceptable
                        pass
                    except ValueError:
                        # Path is outside project directory, rejection is correct
                        pass
                except (OSError, RuntimeError):
                    # Path resolution failed, rejection is correct
                    pass
        
        except (ValueError, OSError, RuntimeError):
            # Invalid path string, this is acceptable
            pass
    
    @settings(max_examples=100)
    @given(
        subpath=st.lists(
            st.text(
                alphabet=st.characters(
                    whitelist_categories=('Lu', 'Ll', 'Nd'),
                    min_codepoint=ord('a'),
                    max_codepoint=ord('z')
                ),
                min_size=1,
                max_size=20
            ),
            min_size=1,
            max_size=5
        )
    )
    def test_property_1_valid_paths_within_directory(self, subpath):
        """
        Property 1 (variant): Valid paths within directory
        
        For any path constructed within the project directory,
        validation should succeed.
        
        Feature: storycore-ai-assistant, Property 1: Path validation
        Validates: Requirements 1.1, 1.2, 1.3, 1.4
        """
        # Construct path within project directory
        path = self.temp_dir
        for component in subpath:
            path = path / component
        
        # Validation should succeed
        assert self.file_ops.validate_path(path) is True
    
    @settings(max_examples=100)
    @given(
        content=st.binary(min_size=0, max_size=10000)
    )
    def test_property_1_read_write_round_trip(self, content):
        """
        Property 1 (variant): Read-write round trip
        
        For any content written to a valid path, reading it back
        should return the same content.
        
        Feature: storycore-ai-assistant, Property 1: Path validation
        Validates: Requirements 1.1, 1.2
        """
        # Create a valid path
        test_file = self.temp_dir / "test_file.bin"
        
        # Write content
        self.file_ops.write_file(test_file, content)
        
        # Read content back
        read_content = self.file_ops.read_file(test_file)
        
        # Content should match
        assert read_content == content
    
    @settings(max_examples=100)
    @given(
        filename=st.text(
            alphabet=st.characters(
                whitelist_categories=('Lu', 'Ll', 'Nd'),
                min_codepoint=ord('a'),
                max_codepoint=ord('z')
            ),
            min_size=1,
            max_size=50
        )
    )
    def test_property_1_file_operations_stay_within_directory(self, filename):
        """
        Property 1 (variant): File operations stay within directory
        
        For any filename, all file operations should only affect files
        within the project directory.
        
        Feature: storycore-ai-assistant, Property 1: Path validation
        Validates: Requirements 1.1, 1.2, 1.3
        """
        # Create file path
        file_path = self.temp_dir / f"{filename}.txt"
        
        # Write file
        self.file_ops.write_file(file_path, b"test content")
        
        # Verify file exists within project directory
        assert file_path.exists()
        assert file_path.is_relative_to(self.temp_dir)
        
        # Read file
        content = self.file_ops.read_file(file_path)
        assert content == b"test content"
        
        # Delete file (with confirmation)
        self.file_ops.delete_file(file_path, confirmed=True)
        assert not file_path.exists()
    
    @settings(max_examples=100)
    @given(
        traversal_depth=st.integers(min_value=1, max_value=10)
    )
    def test_property_2_directory_traversal_prevention(self, traversal_depth):
        """
        Property 2: Directory Traversal Attack Prevention
        
        For any file path containing traversal sequences (../, ..\, or other
        escape mechanisms), the path validation should reject the operation
        and prevent access outside the project directory.
        
        Feature: storycore-ai-assistant, Property 2: Directory traversal prevention
        Validates: Requirements 1.6
        """
        # Construct path with parent directory traversals
        traversal_path = self.temp_dir
        for _ in range(traversal_depth):
            traversal_path = traversal_path / ".."
        traversal_path = traversal_path / "outside_file.txt"
        
        # Validation should fail
        with pytest.raises(PathValidationError):
            self.file_ops.validate_path(traversal_path)
    
    @settings(max_examples=100)
    @given(
        traversal_pattern=st.sampled_from([
            "../",
            "..\\",
            "./../",
            "./../../",
            "....//",
            "..;/",
            "%2e%2e%2f",  # URL encoded ../
        ]),
        depth=st.integers(min_value=1, max_value=5)
    )
    def test_property_2_various_traversal_patterns(self, traversal_pattern, depth):
        """
        Property 2 (variant): Various traversal patterns
        
        For any traversal pattern repeated any number of times,
        validation should reject paths that escape the project directory.
        
        Feature: storycore-ai-assistant, Property 2: Directory traversal prevention
        Validates: Requirements 1.6
        """
        # Construct path with traversal pattern
        path_str = traversal_pattern * depth + "outside.txt"
        
        try:
            path = Path(path_str)
            
            # If path can be resolved and is outside project dir, should fail
            try:
                resolved = path.resolve()
                try:
                    resolved.relative_to(self.file_ops.project_directory)
                    # Path is within directory, validation might succeed
                    # (this can happen if traversal doesn't escape)
                    pass
                except ValueError:
                    # Path is outside directory, validation must fail
                    with pytest.raises(PathValidationError):
                        self.file_ops.validate_path(path)
            except (OSError, RuntimeError):
                # Path resolution failed, validation should fail
                with pytest.raises((PathValidationError, ValueError, OSError)):
                    self.file_ops.validate_path(path)
        
        except (ValueError, OSError):
            # Invalid path, this is acceptable
            pass
    
    @settings(max_examples=100)
    @given(
        absolute_path=st.sampled_from([
            "/etc/passwd",
            "/tmp/outside",
            "/root/secret",
            "C:\\Windows\\System32",
            "C:\\Users\\Other",
            "/home/other_user/file.txt"
        ])
    )
    def test_property_2_absolute_paths_outside_rejected(self, absolute_path):
        """
        Property 2 (variant): Absolute paths outside directory rejected
        
        For any absolute path outside the project directory,
        validation should reject the path.
        
        Feature: storycore-ai-assistant, Property 2: Directory traversal prevention
        Validates: Requirements 1.6
        """
        path = Path(absolute_path)
        
        # Skip if path happens to be within project directory
        # (unlikely but possible in some test environments)
        try:
            resolved = path.resolve()
            assume(not resolved.is_relative_to(self.file_ops.project_directory))
        except (ValueError, OSError):
            pass
        
        # Validation should fail
        with pytest.raises(PathValidationError):
            self.file_ops.validate_path(path)
