"""
Unit tests for coverage overlap detection.
"""

import pytest
from pathlib import Path
import json
import xml.etree.ElementTree as ET
from test_cleanup.analysis.coverage_analysis import (
    parse_python_coverage_report,
    parse_typescript_coverage_report,
    identify_coverage_overlap,
    calculate_unique_coverage,
    analyze_coverage_overlap
)


class TestPythonCoverageReportParsing:
    """Tests for Python coverage report parsing."""
    
    def test_parse_python_coverage_report_valid(self, tmp_path):
        """Test parsing a valid Python coverage XML report."""
        coverage_xml = """<?xml version="1.0" ?>
<coverage>
    <packages>
        <package name="test_cleanup">
            <classes>
                <class filename="test_cleanup/models.py">
                    <lines>
                        <line number="10" hits="5"/>
                        <line number="11" hits="3"/>
                        <line number="12" hits="0"/>
                    </lines>
                </class>
            </classes>
        </package>
    </packages>
</coverage>"""
        
        coverage_file = tmp_path / "coverage.xml"
        coverage_file.write_text(coverage_xml)
        
        result = parse_python_coverage_report(coverage_file)
        
        assert "test_cleanup/models.py" in result
        assert 10 in result["test_cleanup/models.py"]
        assert 11 in result["test_cleanup/models.py"]
        assert 12 not in result["test_cleanup/models.py"]  # Not covered
    
    def test_parse_python_coverage_report_nonexistent(self):
        """Test handling of non-existent file."""
        result = parse_python_coverage_report(Path("/nonexistent/coverage.xml"))
        
        assert result == {}


class TestTypeScriptCoverageReportParsing:
    """Tests for TypeScript coverage report parsing."""
    
    def test_parse_typescript_coverage_report_valid(self, tmp_path):
        """Test parsing a valid TypeScript coverage JSON report."""
        coverage_data = {
            "src/example.ts": {
                "lines": {
                    "10": 5,
                    "11": 3,
                    "12": 0
                }
            }
        }
        
        coverage_file = tmp_path / "coverage.json"
        with open(coverage_file, 'w') as f:
            json.dump(coverage_data, f)
        
        result = parse_typescript_coverage_report(coverage_file)
        
        assert "src/example.ts" in result
        assert 10 in result["src/example.ts"]
        assert 11 in result["src/example.ts"]
        assert 12 not in result["src/example.ts"]  # Not covered
    
    def test_parse_typescript_coverage_report_nonexistent(self):
        """Test handling of non-existent file."""
        result = parse_typescript_coverage_report(Path("/nonexistent/coverage.json"))
        
        assert result == {}


class TestCoverageOverlapIdentification:
    """Tests for coverage overlap identification."""
    
    def test_identify_coverage_overlap_with_overlap(self):
        """Test identification of overlapping coverage."""
        test_coverage_map = {
            "test_one": {
                "file.py": {10, 11, 12}
            },
            "test_two": {
                "file.py": {11, 12, 13}
            }
        }
        
        result = identify_coverage_overlap(test_coverage_map)
        
        assert "file.py:11" in result
        assert "file.py:12" in result
        assert len(result["file.py:11"]) == 2
        assert len(result["file.py:12"]) == 2
    
    def test_identify_coverage_overlap_no_overlap(self):
        """Test when no overlap exists."""
        test_coverage_map = {
            "test_one": {
                "file.py": {10, 11}
            },
            "test_two": {
                "file.py": {12, 13}
            }
        }
        
        result = identify_coverage_overlap(test_coverage_map)
        
        assert len(result) == 0


class TestUniqueCoverageCalculation:
    """Tests for unique coverage calculation."""
    
    def test_calculate_unique_coverage_all_unique(self):
        """Test when test has all unique coverage."""
        test_coverage_map = {
            "test_one": {
                "file.py": {10, 11}
            },
            "test_two": {
                "file.py": {12, 13}
            }
        }
        
        unique = calculate_unique_coverage("test_one", test_coverage_map)
        
        assert unique == 2
    
    def test_calculate_unique_coverage_no_unique(self):
        """Test when test has no unique coverage."""
        test_coverage_map = {
            "test_one": {
                "file.py": {10, 11}
            },
            "test_two": {
                "file.py": {10, 11, 12}
            }
        }
        
        unique = calculate_unique_coverage("test_one", test_coverage_map)
        
        assert unique == 0
    
    def test_calculate_unique_coverage_partial_unique(self):
        """Test when test has partial unique coverage."""
        test_coverage_map = {
            "test_one": {
                "file.py": {10, 11, 12}
            },
            "test_two": {
                "file.py": {11, 12}
            }
        }
        
        unique = calculate_unique_coverage("test_one", test_coverage_map)
        
        assert unique == 1  # Only line 10 is unique


class TestCoverageOverlapAnalysis:
    """Tests for complete coverage overlap analysis."""
    
    def test_analyze_coverage_overlap(self):
        """Test complete coverage overlap analysis."""
        test_coverage_map = {
            "test_one": {
                "file.py": {10, 11, 12}
            },
            "test_two": {
                "file.py": {11, 12, 13}
            }
        }
        
        result = analyze_coverage_overlap(test_coverage_map)
        
        assert "test_one" in result
        assert "test_two" in result
        assert result["test_one"]["total_coverage"] == 3
        assert result["test_one"]["unique_coverage"] == 1  # Line 10
        assert result["test_two"]["unique_coverage"] == 1  # Line 13
