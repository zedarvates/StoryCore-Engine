"""
Unit tests for coverage comparison functionality.
"""

import pytest
from pathlib import Path
from test_cleanup.validation.coverage_comparison import (
    identify_lost_coverage,
    compare_coverage,
    generate_coverage_report
)
from test_cleanup.models import CoverageComparison


class TestLostCoverageIdentification:
    """Tests for identifying lost coverage."""
    
    def test_no_lost_coverage(self):
        """Test when no coverage is lost."""
        before = {
            'file1.py': {1, 2, 3, 4, 5},
            'file2.py': {10, 20, 30}
        }
        after = {
            'file1.py': {1, 2, 3, 4, 5},
            'file2.py': {10, 20, 30}
        }
        
        lost = identify_lost_coverage(before, after)
        assert len(lost) == 0
    
    def test_some_lost_coverage(self):
        """Test when some coverage is lost."""
        before = {
            'file1.py': {1, 2, 3, 4, 5},
            'file2.py': {10, 20, 30}
        }
        after = {
            'file1.py': {1, 2, 3},  # Lost lines 4, 5
            'file2.py': {10, 20}     # Lost line 30
        }
        
        lost = identify_lost_coverage(before, after)
        assert len(lost) == 3
        assert 'file1.py:4' in lost
        assert 'file1.py:5' in lost
        assert 'file2.py:30' in lost
    
    def test_entire_file_lost(self):
        """Test when entire file loses coverage."""
        before = {
            'file1.py': {1, 2, 3},
            'file2.py': {10, 20}
        }
        after = {
            'file1.py': {1, 2, 3}
            # file2.py completely missing
        }
        
        lost = identify_lost_coverage(before, after)
        assert len(lost) == 2
        assert 'file2.py:10' in lost
        assert 'file2.py:20' in lost
    
    def test_improved_coverage(self):
        """Test when coverage improves (no lost coverage)."""
        before = {
            'file1.py': {1, 2, 3}
        }
        after = {
            'file1.py': {1, 2, 3, 4, 5}  # More coverage
        }
        
        lost = identify_lost_coverage(before, after)
        assert len(lost) == 0


class TestCoverageComparison:
    """Tests for coverage comparison."""
    
    def test_coverage_improved(self):
        """Test when coverage improves."""
        comparison = compare_coverage(85.0, 90.0)
        
        assert comparison.before_percentage == 85.0
        assert comparison.after_percentage == 90.0
        assert comparison.delta == 5.0
        assert len(comparison.uncovered_lines) == 0
    
    def test_coverage_decreased(self):
        """Test when coverage decreases."""
        comparison = compare_coverage(90.0, 85.0)
        
        assert comparison.before_percentage == 90.0
        assert comparison.after_percentage == 85.0
        assert comparison.delta == -5.0
    
    def test_coverage_unchanged(self):
        """Test when coverage stays the same."""
        comparison = compare_coverage(85.0, 85.0)
        
        assert comparison.before_percentage == 85.0
        assert comparison.after_percentage == 85.0
        assert comparison.delta == 0.0
    
    def test_coverage_with_lost_lines(self):
        """Test coverage comparison with detailed lost lines."""
        before_details = {
            'file1.py': {1, 2, 3, 4, 5}
        }
        after_details = {
            'file1.py': {1, 2, 3}
        }
        
        comparison = compare_coverage(
            90.0, 85.0,
            before_details, after_details
        )
        
        assert comparison.delta == -5.0
        assert len(comparison.uncovered_lines) == 2
        assert 'file1.py:4' in comparison.uncovered_lines
        assert 'file1.py:5' in comparison.uncovered_lines


class TestCoverageReportGeneration:
    """Tests for coverage report generation."""
    
    def test_generate_full_report(self):
        """Test generating complete coverage report."""
        report = generate_coverage_report(
            python_before=85.0,
            python_after=88.0,
            typescript_before=90.0,
            typescript_after=92.0
        )
        
        assert 'python' in report
        assert 'typescript' in report
        
        assert report['python'].before_percentage == 85.0
        assert report['python'].after_percentage == 88.0
        assert report['python'].delta == 3.0
        
        assert report['typescript'].before_percentage == 90.0
        assert report['typescript'].after_percentage == 92.0
        assert report['typescript'].delta == 2.0
    
    def test_report_with_regression(self):
        """Test report when coverage regresses."""
        report = generate_coverage_report(
            python_before=85.0,
            python_after=80.0,  # Regression
            typescript_before=90.0,
            typescript_after=92.0
        )
        
        assert report['python'].delta < 0
        assert report['typescript'].delta > 0
