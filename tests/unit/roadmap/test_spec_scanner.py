"""
Unit tests for the SpecScanner component.

Tests cover directory traversal, spec validation, and file collection
with various edge cases and directory structures.
"""

import pytest
from pathlib import Path
import tempfile
import shutil

from src.roadmap.spec_scanner import SpecScanner
from src.roadmap.models import SpecFiles


class TestSpecScanner:
    """Test suite for SpecScanner class."""
    
    @pytest.fixture
    def temp_dir(self):
        """Create a temporary directory for testing."""
        temp_path = Path(tempfile.mkdtemp())
        yield temp_path
        # Cleanup after test
        if temp_path.exists():
            shutil.rmtree(temp_path)
    
    @pytest.fixture
    def empty_specs_dir(self, temp_dir):
        """Create an empty specs directory."""
        specs_dir = temp_dir / ".kiro" / "specs"
        specs_dir.mkdir(parents=True)
        return specs_dir
    
    @pytest.fixture
    def single_spec_dir(self, temp_dir):
        """Create a specs directory with a single valid spec."""
        specs_dir = temp_dir / ".kiro" / "specs"
        feature_dir = specs_dir / "test-feature"
        feature_dir.mkdir(parents=True)
        
        # Create spec files
        (feature_dir / "requirements.md").write_text("# Requirements")
        (feature_dir / "design.md").write_text("# Design")
        (feature_dir / "tasks.md").write_text("# Tasks")
        
        return specs_dir
    
    @pytest.fixture
    def nested_specs_dir(self, temp_dir):
        """Create a specs directory with nested spec directories."""
        specs_dir = temp_dir / ".kiro" / "specs"
        
        # Create top-level spec
        feature1 = specs_dir / "feature-1"
        feature1.mkdir(parents=True)
        (feature1 / "requirements.md").write_text("# Feature 1")
        
        # Create nested spec
        feature2 = specs_dir / "category" / "feature-2"
        feature2.mkdir(parents=True)
        (feature2 / "design.md").write_text("# Feature 2")
        
        # Create deeply nested spec
        feature3 = specs_dir / "cat1" / "cat2" / "feature-3"
        feature3.mkdir(parents=True)
        (feature3 / "tasks.md").write_text("# Feature 3")
        
        return specs_dir
    
    @pytest.fixture
    def mixed_specs_dir(self, temp_dir):
        """Create a specs directory with valid and invalid directories."""
        specs_dir = temp_dir / ".kiro" / "specs"
        
        # Valid spec with all files
        valid_complete = specs_dir / "valid-complete"
        valid_complete.mkdir(parents=True)
        (valid_complete / "requirements.md").write_text("# Requirements")
        (valid_complete / "design.md").write_text("# Design")
        (valid_complete / "tasks.md").write_text("# Tasks")
        
        # Valid spec with only requirements
        valid_partial = specs_dir / "valid-partial"
        valid_partial.mkdir(parents=True)
        (valid_partial / "requirements.md").write_text("# Requirements")
        
        # Invalid spec (no spec files)
        invalid_dir = specs_dir / "invalid-dir"
        invalid_dir.mkdir(parents=True)
        (invalid_dir / "readme.txt").write_text("Not a spec")
        
        # Hidden directory (should be skipped)
        hidden_dir = specs_dir / ".hidden"
        hidden_dir.mkdir(parents=True)
        (hidden_dir / "requirements.md").write_text("# Hidden")
        
        return specs_dir
    
    def test_scan_nonexistent_directory(self, temp_dir):
        """Test scanning a directory that doesn't exist."""
        nonexistent = temp_dir / "nonexistent"
        scanner = SpecScanner(nonexistent)
        
        result = scanner.scan_specs_directory()
        
        assert result == []
    
    def test_scan_empty_directory(self, empty_specs_dir):
        """Test scanning an empty specs directory."""
        scanner = SpecScanner(empty_specs_dir)
        
        result = scanner.scan_specs_directory()
        
        assert result == []
    
    def test_scan_single_spec(self, single_spec_dir):
        """Test scanning a directory with a single valid spec."""
        scanner = SpecScanner(single_spec_dir)
        
        result = scanner.scan_specs_directory()
        
        assert len(result) == 1
        assert isinstance(result[0], SpecFiles)
        assert result[0].directory.name == "test-feature"
        assert result[0].requirements is not None
        assert result[0].design is not None
        assert result[0].tasks is not None
    
    def test_scan_nested_specs(self, nested_specs_dir):
        """Test scanning nested spec directories."""
        scanner = SpecScanner(nested_specs_dir)
        
        result = scanner.scan_specs_directory()
        
        assert len(result) == 3
        spec_names = {spec.directory.name for spec in result}
        assert spec_names == {"feature-1", "feature-2", "feature-3"}
    
    def test_scan_mixed_directories(self, mixed_specs_dir):
        """Test scanning with valid, invalid, and hidden directories."""
        scanner = SpecScanner(mixed_specs_dir)
        
        result = scanner.scan_specs_directory()
        
        # Should find only the 2 valid specs, not invalid or hidden
        assert len(result) == 2
        spec_names = {spec.directory.name for spec in result}
        assert spec_names == {"valid-complete", "valid-partial"}
    
    def test_is_valid_spec_with_requirements(self, temp_dir):
        """Test is_valid_spec with only requirements.md."""
        spec_dir = temp_dir / "spec"
        spec_dir.mkdir(parents=True)
        (spec_dir / "requirements.md").write_text("# Requirements")
        
        scanner = SpecScanner()
        
        assert scanner.is_valid_spec(spec_dir) is True
    
    def test_is_valid_spec_with_design(self, temp_dir):
        """Test is_valid_spec with only design.md."""
        spec_dir = temp_dir / "spec"
        spec_dir.mkdir(parents=True)
        (spec_dir / "design.md").write_text("# Design")
        
        scanner = SpecScanner()
        
        assert scanner.is_valid_spec(spec_dir) is True
    
    def test_is_valid_spec_with_tasks(self, temp_dir):
        """Test is_valid_spec with only tasks.md."""
        spec_dir = temp_dir / "spec"
        spec_dir.mkdir(parents=True)
        (spec_dir / "tasks.md").write_text("# Tasks")
        
        scanner = SpecScanner()
        
        assert scanner.is_valid_spec(spec_dir) is True
    
    def test_is_valid_spec_with_all_files(self, temp_dir):
        """Test is_valid_spec with all spec files present."""
        spec_dir = temp_dir / "spec"
        spec_dir.mkdir(parents=True)
        (spec_dir / "requirements.md").write_text("# Requirements")
        (spec_dir / "design.md").write_text("# Design")
        (spec_dir / "tasks.md").write_text("# Tasks")
        
        scanner = SpecScanner()
        
        assert scanner.is_valid_spec(spec_dir) is True
    
    def test_is_valid_spec_with_no_spec_files(self, temp_dir):
        """Test is_valid_spec with no spec files."""
        spec_dir = temp_dir / "spec"
        spec_dir.mkdir(parents=True)
        (spec_dir / "readme.txt").write_text("Not a spec")
        
        scanner = SpecScanner()
        
        assert scanner.is_valid_spec(spec_dir) is False
    
    def test_is_valid_spec_nonexistent_directory(self, temp_dir):
        """Test is_valid_spec with nonexistent directory."""
        nonexistent = temp_dir / "nonexistent"
        
        scanner = SpecScanner()
        
        assert scanner.is_valid_spec(nonexistent) is False
    
    def test_is_valid_spec_file_not_directory(self, temp_dir):
        """Test is_valid_spec with a file instead of directory."""
        file_path = temp_dir / "file.txt"
        file_path.write_text("Not a directory")
        
        scanner = SpecScanner()
        
        assert scanner.is_valid_spec(file_path) is False
    
    def test_get_spec_files_all_present(self, temp_dir):
        """Test get_spec_files when all spec files are present."""
        spec_dir = temp_dir / "spec"
        spec_dir.mkdir(parents=True)
        (spec_dir / "requirements.md").write_text("# Requirements")
        (spec_dir / "design.md").write_text("# Design")
        (spec_dir / "tasks.md").write_text("# Tasks")
        
        scanner = SpecScanner()
        result = scanner.get_spec_files(spec_dir)
        
        assert isinstance(result, SpecFiles)
        assert result.directory == spec_dir
        assert result.requirements == spec_dir / "requirements.md"
        assert result.design == spec_dir / "design.md"
        assert result.tasks == spec_dir / "tasks.md"
        assert result.metadata == {}
    
    def test_get_spec_files_partial(self, temp_dir):
        """Test get_spec_files when only some files are present."""
        spec_dir = temp_dir / "spec"
        spec_dir.mkdir(parents=True)
        (spec_dir / "requirements.md").write_text("# Requirements")
        (spec_dir / "tasks.md").write_text("# Tasks")
        # design.md is missing
        
        scanner = SpecScanner()
        result = scanner.get_spec_files(spec_dir)
        
        assert result.directory == spec_dir
        assert result.requirements == spec_dir / "requirements.md"
        assert result.design is None
        assert result.tasks == spec_dir / "tasks.md"
    
    def test_get_spec_files_none_present(self, temp_dir):
        """Test get_spec_files when no spec files are present."""
        spec_dir = temp_dir / "spec"
        spec_dir.mkdir(parents=True)
        
        scanner = SpecScanner()
        result = scanner.get_spec_files(spec_dir)
        
        assert result.directory == spec_dir
        assert result.requirements is None
        assert result.design is None
        assert result.tasks is None
    
    def test_scan_with_special_characters_in_names(self, temp_dir):
        """Test scanning specs with special characters in directory names."""
        specs_dir = temp_dir / ".kiro" / "specs"
        
        # Create specs with various naming patterns
        spec1 = specs_dir / "feature-with-dashes"
        spec1.mkdir(parents=True)
        (spec1 / "requirements.md").write_text("# Feature")
        
        spec2 = specs_dir / "feature_with_underscores"
        spec2.mkdir(parents=True)
        (spec2 / "design.md").write_text("# Feature")
        
        spec3 = specs_dir / "feature123"
        spec3.mkdir(parents=True)
        (spec3 / "tasks.md").write_text("# Feature")
        
        scanner = SpecScanner(specs_dir)
        result = scanner.scan_specs_directory()
        
        assert len(result) == 3
        spec_names = {spec.directory.name for spec in result}
        assert spec_names == {
            "feature-with-dashes",
            "feature_with_underscores",
            "feature123"
        }
    
    def test_scan_skips_hidden_directories(self, temp_dir):
        """Test that scanning skips hidden directories."""
        specs_dir = temp_dir / ".kiro" / "specs"
        
        # Create visible spec
        visible = specs_dir / "visible-spec"
        visible.mkdir(parents=True)
        (visible / "requirements.md").write_text("# Visible")
        
        # Create hidden spec
        hidden = specs_dir / ".hidden-spec"
        hidden.mkdir(parents=True)
        (hidden / "requirements.md").write_text("# Hidden")
        
        # Create spec in hidden subdirectory
        nested_hidden = specs_dir / ".hidden" / "nested-spec"
        nested_hidden.mkdir(parents=True)
        (nested_hidden / "requirements.md").write_text("# Nested Hidden")
        
        scanner = SpecScanner(specs_dir)
        result = scanner.scan_specs_directory()
        
        # Should only find the visible spec
        assert len(result) == 1
        assert result[0].directory.name == "visible-spec"
    
    def test_scan_file_instead_of_directory(self, temp_dir):
        """Test scanning when base_path is a file instead of directory."""
        file_path = temp_dir / "file.txt"
        file_path.write_text("Not a directory")
        
        scanner = SpecScanner(file_path)
        result = scanner.scan_specs_directory()
        
        assert result == []
