"""
Unit tests for obsolete test detection.
"""

import pytest
from pathlib import Path
from test_cleanup.analysis.obsolete_detection import (
    extract_imports,
    check_module_exists,
    extract_tested_functions,
    check_deprecation_markers,
    identify_obsolete_tests,
    analyze_test_obsolescence
)


class TestImportExtraction:
    """Tests for import extraction."""
    
    def test_extract_imports_valid_file(self, tmp_path):
        """Test extracting imports from a valid file."""
        test_file = tmp_path / "test_example.py"
        test_file.write_text("""
import os
import sys
from pathlib import Path
from typing import List

def test_something():
    pass
""")
        
        result = extract_imports(test_file)
        
        assert 'os' in result
        assert 'sys' in result
        assert 'pathlib' in result
        assert 'typing' in result
    
    def test_extract_imports_nonexistent_file(self):
        """Test handling of non-existent file."""
        result = extract_imports(Path("/nonexistent/file.py"))
        
        assert result == []


class TestModuleExistence:
    """Tests for module existence checking."""
    
    def test_check_module_exists_standard_library(self):
        """Test checking standard library modules."""
        assert check_module_exists('os') == True
        assert check_module_exists('sys') == True
        assert check_module_exists('pathlib') == True
    
    def test_check_module_exists_nonexistent(self):
        """Test checking non-existent modules."""
        assert check_module_exists('nonexistent_module_xyz') == False


class TestDeprecationMarkers:
    """Tests for deprecation marker detection."""
    
    def test_check_deprecation_markers_with_markers(self, tmp_path):
        """Test detection of deprecation markers."""
        test_file = tmp_path / "test_deprecated.py"
        test_file.write_text("""
# This test is deprecated and should be removed
def test_old_functionality():
    pass
""")
        
        result = check_deprecation_markers(test_file)
        
        assert result == True
    
    def test_check_deprecation_markers_no_markers(self, tmp_path):
        """Test when no deprecation markers exist."""
        test_file = tmp_path / "test_current.py"
        test_file.write_text("""
def test_current_functionality():
    pass
""")
        
        result = check_deprecation_markers(test_file)
        
        assert result == False
    
    def test_check_deprecation_markers_obsolete_keyword(self, tmp_path):
        """Test detection of 'obsolete' keyword."""
        test_file = tmp_path / "test_obsolete.py"
        test_file.write_text("""
# This is obsolete
def test_something():
    pass
""")
        
        result = check_deprecation_markers(test_file)
        
        assert result == True


class TestObsoleteTestIdentification:
    """Tests for obsolete test identification."""
    
    def test_identify_obsolete_tests_with_deprecation(self, tmp_path):
        """Test identification of tests with deprecation markers."""
        test_file = tmp_path / "test_deprecated.py"
        test_file.write_text("""
# @deprecated
def test_old():
    pass
""")
        
        result = identify_obsolete_tests([test_file])
        
        assert len(result) == 1
        assert str(test_file) in result
    
    def test_identify_obsolete_tests_no_obsolete(self, tmp_path):
        """Test when no obsolete tests exist."""
        test_file = tmp_path / "test_current.py"
        test_file.write_text("""
import os

def test_current():
    assert os.path.exists('.')
""")
        
        result = identify_obsolete_tests([test_file])
        
        assert len(result) == 0


class TestObsolescenceAnalysis:
    """Tests for detailed obsolescence analysis."""
    
    def test_analyze_test_obsolescence_with_reasons(self, tmp_path):
        """Test analysis with detailed reasons."""
        test_file = tmp_path / "test_deprecated.py"
        test_file.write_text("""
# This is deprecated
def test_old():
    pass
""")
        
        result = analyze_test_obsolescence([test_file])
        
        assert str(test_file) in result
        assert result[str(test_file)]['is_obsolete'] == True
        assert len(result[str(test_file)]['reasons']) > 0
    
    def test_analyze_test_obsolescence_no_issues(self, tmp_path):
        """Test analysis when no issues exist."""
        test_file = tmp_path / "test_current.py"
        test_file.write_text("""
import os

def test_current():
    pass
""")
        
        result = analyze_test_obsolescence([test_file])
        
        assert str(test_file) in result
        assert result[str(test_file)]['is_obsolete'] == False
        assert len(result[str(test_file)]['reasons']) == 0
