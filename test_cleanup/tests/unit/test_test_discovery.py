"""
Unit tests for test file discovery functionality.
"""

import pytest
from pathlib import Path
import tempfile
import shutil
from test_cleanup.analysis.test_discovery import (
    find_python_test_files,
    find_typescript_test_files,
    discover_all_test_files
)


class TestPythonTestDiscovery:
    """Tests for Python test file discovery."""
    
    def test_find_python_test_files_with_test_prefix(self, tmp_path):
        """Test discovery of test_*.py files."""
        # Create test files
        (tmp_path / "test_example.py").touch()
        (tmp_path / "test_another.py").touch()
        (tmp_path / "example.py").touch()  # Not a test file
        
        result = find_python_test_files(tmp_path)
        
        assert len(result) == 2
        assert any("test_example.py" in str(f) for f in result)
        assert any("test_another.py" in str(f) for f in result)
        assert not any(str(f).endswith("example.py") and not str(f).endswith("test_example.py") for f in result)
    
    def test_find_python_test_files_with_test_suffix(self, tmp_path):
        """Test discovery of *_test.py files."""
        # Create test files
        (tmp_path / "example_test.py").touch()
        (tmp_path / "another_test.py").touch()
        
        result = find_python_test_files(tmp_path)
        
        assert len(result) == 2
        assert any("example_test.py" in str(f) for f in result)
        assert any("another_test.py" in str(f) for f in result)
    
    def test_find_python_test_files_recursive(self, tmp_path):
        """Test recursive discovery in subdirectories."""
        # Create nested structure
        subdir = tmp_path / "unit"
        subdir.mkdir()
        (subdir / "test_unit.py").touch()
        
        subdir2 = tmp_path / "integration"
        subdir2.mkdir()
        (subdir2 / "test_integration.py").touch()
        
        result = find_python_test_files(tmp_path)
        
        assert len(result) == 2
        assert any("test_unit.py" in str(f) for f in result)
        assert any("test_integration.py" in str(f) for f in result)
    
    def test_find_python_test_files_excludes_pycache(self, tmp_path):
        """Test that __pycache__ directories are excluded."""
        # Create test file and __pycache__
        (tmp_path / "test_example.py").touch()
        pycache = tmp_path / "__pycache__"
        pycache.mkdir()
        (pycache / "test_cached.py").touch()
        
        result = find_python_test_files(tmp_path)
        
        assert len(result) == 1
        assert "__pycache__" not in str(result[0])
    
    def test_find_python_test_files_nonexistent_directory(self):
        """Test handling of non-existent directory."""
        result = find_python_test_files(Path("/nonexistent/path"))
        
        assert result == []
    
    def test_find_python_test_files_empty_directory(self, tmp_path):
        """Test handling of empty directory."""
        result = find_python_test_files(tmp_path)
        
        assert result == []


class TestTypeScriptTestDiscovery:
    """Tests for TypeScript test file discovery."""
    
    def test_find_typescript_test_files_with_test_ts(self, tmp_path):
        """Test discovery of *.test.ts files."""
        (tmp_path / "example.test.ts").touch()
        (tmp_path / "another.test.ts").touch()
        (tmp_path / "not_a_test.ts").touch()
        
        result = find_typescript_test_files(tmp_path)
        
        assert len(result) == 2
        assert any("example.test.ts" in str(f) for f in result)
        assert any("another.test.ts" in str(f) for f in result)
        assert not any("not_a_test.ts" in str(f) for f in result)
    
    def test_find_typescript_test_files_with_test_tsx(self, tmp_path):
        """Test discovery of *.test.tsx files."""
        (tmp_path / "Component.test.tsx").touch()
        (tmp_path / "AnotherComponent.test.tsx").touch()
        
        result = find_typescript_test_files(tmp_path)
        
        assert len(result) == 2
        assert any("Component.test.tsx" in str(f) for f in result)
    
    def test_find_typescript_test_files_with_spec(self, tmp_path):
        """Test discovery of *.spec.ts and *.spec.tsx files."""
        (tmp_path / "example.spec.ts").touch()
        (tmp_path / "Component.spec.tsx").touch()
        
        result = find_typescript_test_files(tmp_path)
        
        assert len(result) == 2
        assert any("example.spec.ts" in str(f) for f in result)
        assert any("Component.spec.tsx" in str(f) for f in result)
    
    def test_find_typescript_test_files_recursive(self, tmp_path):
        """Test recursive discovery in subdirectories."""
        subdir = tmp_path / "components"
        subdir.mkdir()
        (subdir / "Button.test.tsx").touch()
        
        subdir2 = tmp_path / "utils"
        subdir2.mkdir()
        (subdir2 / "helpers.test.ts").touch()
        
        result = find_typescript_test_files(tmp_path)
        
        assert len(result) == 2
        assert any("Button.test.tsx" in str(f) for f in result)
        assert any("helpers.test.ts" in str(f) for f in result)
    
    def test_find_typescript_test_files_excludes_node_modules(self, tmp_path):
        """Test that node_modules directories are excluded."""
        (tmp_path / "example.test.ts").touch()
        node_modules = tmp_path / "node_modules"
        node_modules.mkdir()
        (node_modules / "library.test.ts").touch()
        
        result = find_typescript_test_files(tmp_path)
        
        assert len(result) == 1
        assert "node_modules" not in str(result[0])
    
    def test_find_typescript_test_files_nonexistent_directory(self):
        """Test handling of non-existent directory."""
        result = find_typescript_test_files(Path("/nonexistent/path"))
        
        assert result == []
    
    def test_find_typescript_test_files_empty_directory(self, tmp_path):
        """Test handling of empty directory."""
        result = find_typescript_test_files(tmp_path)
        
        assert result == []


class TestDiscoverAllTestFiles:
    """Tests for combined test file discovery."""
    
    def test_discover_all_test_files_with_both_types(self, tmp_path):
        """Test discovery of both Python and TypeScript tests."""
        python_dir = tmp_path / "tests"
        python_dir.mkdir()
        (python_dir / "test_example.py").touch()
        
        ts_dir = tmp_path / "src"
        ts_dir.mkdir()
        (ts_dir / "example.test.ts").touch()
        
        result = discover_all_test_files(python_dir, ts_dir)
        
        assert 'python' in result
        assert 'typescript' in result
        assert 'total_python' in result
        assert 'total_typescript' in result
        assert result['total_python'] == 1
        assert result['total_typescript'] == 1
    
    def test_discover_all_test_files_with_defaults(self):
        """Test discovery with default directories."""
        result = discover_all_test_files()
        
        assert 'python' in result
        assert 'typescript' in result
        assert 'total_python' in result
        assert 'total_typescript' in result
        assert isinstance(result['python'], list)
        assert isinstance(result['typescript'], list)
    
    def test_discover_all_test_files_counts_match_lists(self, tmp_path):
        """Test that counts match the length of file lists."""
        python_dir = tmp_path / "tests"
        python_dir.mkdir()
        (python_dir / "test_one.py").touch()
        (python_dir / "test_two.py").touch()
        
        ts_dir = tmp_path / "src"
        ts_dir.mkdir()
        (ts_dir / "one.test.ts").touch()
        (ts_dir / "two.test.ts").touch()
        (ts_dir / "three.test.tsx").touch()
        
        result = discover_all_test_files(python_dir, ts_dir)
        
        assert len(result['python']) == result['total_python']
        assert len(result['typescript']) == result['total_typescript']
        assert result['total_python'] == 2
        assert result['total_typescript'] == 3
