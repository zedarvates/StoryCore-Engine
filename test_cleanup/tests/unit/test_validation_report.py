"""
Unit tests for validation report generation.
"""

import json
import pytest
from pathlib import Path
from test_cleanup.validation.validation_report import (
    create_validation_report,
    format_validation_report,
    save_validation_report
)
from test_cleanup.models import (
    ValidationReport,
    CoverageComparison,
    PerformanceComparison
)


class TestValidationReportCreation:
    """Tests for validation report creation."""
    
    def test_create_passing_report(self):
        """Test creating report for passing tests."""
        coverage = CoverageComparison(
            before_percentage=85.0,
            after_percentage=88.0,
            delta=3.0,
            uncovered_lines=[]
        )
        
        performance = PerformanceComparison(
            before_time=100.0,
            after_time=50.0,
            improvement_percentage=50.0
        )
        
        report = create_validation_report(
            all_tests_passing=True,
            coverage_comparison=coverage,
            performance_comparison=performance,
            flaky_tests=[],
            total_tests=50
        )
        
        assert report.all_tests_passing is True
        assert report.total_tests == 50
        assert report.coverage.delta == 3.0
        assert report.performance.improvement_percentage == 50.0
        assert len(report.flaky_tests) == 0
    
    def test_create_failing_report(self):
        """Test creating report for failing tests."""
        coverage = CoverageComparison(
            before_percentage=85.0,
            after_percentage=80.0,
            delta=-5.0,
            uncovered_lines=['file.py:10', 'file.py:20']
        )
        
        performance = PerformanceComparison(
            before_time=50.0,
            after_time=100.0,
            improvement_percentage=-100.0
        )
        
        report = create_validation_report(
            all_tests_passing=False,
            coverage_comparison=coverage,
            performance_comparison=performance,
            flaky_tests=['test_flaky.py::test_one'],
            total_tests=50
        )
        
        assert report.all_tests_passing is False
        assert report.coverage.delta == -5.0
        assert report.performance.improvement_percentage == -100.0
        assert len(report.flaky_tests) == 1


class TestValidationReportFormatting:
    """Tests for validation report formatting."""
    
    def test_format_successful_validation(self):
        """Test formatting successful validation report."""
        coverage = CoverageComparison(
            before_percentage=85.0,
            after_percentage=90.0,
            delta=5.0,
            uncovered_lines=[]
        )
        
        performance = PerformanceComparison(
            before_time=100.0,
            after_time=50.0,
            improvement_percentage=50.0
        )
        
        report = ValidationReport(
            all_tests_passing=True,
            coverage=coverage,
            performance=performance,
            flaky_tests=[],
            total_tests=50
        )
        
        formatted = format_validation_report({'python': report})
        
        assert 'TEST SUITE VALIDATION REPORT' in formatted
        assert 'PYTHON TEST SUITE' in formatted
        assert 'PASSING' in formatted
        assert '50.0% faster' in formatted
        assert 'No flaky tests detected' in formatted
        assert 'PASSED ✓' in formatted
    
    def test_format_failed_validation(self):
        """Test formatting failed validation report."""
        coverage = CoverageComparison(
            before_percentage=85.0,
            after_percentage=80.0,
            delta=-5.0,
            uncovered_lines=['file.py:10']
        )
        
        performance = PerformanceComparison(
            before_time=50.0,
            after_time=100.0,
            improvement_percentage=-100.0
        )
        
        report = ValidationReport(
            all_tests_passing=False,
            coverage=coverage,
            performance=performance,
            flaky_tests=['test_flaky.py::test_one'],
            total_tests=50
        )
        
        formatted = format_validation_report({'python': report})
        
        assert 'FAILING' in formatted
        assert '100.0% slower' in formatted
        assert 'Flaky Tests Found: 1' in formatted
        assert 'FAILED ✗' in formatted
    
    def test_format_with_lost_coverage(self):
        """Test formatting report with lost coverage details."""
        coverage = CoverageComparison(
            before_percentage=90.0,
            after_percentage=85.0,
            delta=-5.0,
            uncovered_lines=['file1.py:10', 'file2.py:20', 'file3.py:30']
        )
        
        performance = PerformanceComparison(
            before_time=100.0,
            after_time=50.0,
            improvement_percentage=50.0
        )
        
        report = ValidationReport(
            all_tests_passing=True,
            coverage=coverage,
            performance=performance,
            flaky_tests=[],
            total_tests=50
        )
        
        formatted = format_validation_report({'python': report}, include_details=True)
        
        assert 'Lost Coverage: 3 lines' in formatted
        assert 'file1.py:10' in formatted
    
    def test_format_multiple_suites(self):
        """Test formatting report with multiple test suites."""
        python_report = ValidationReport(
            all_tests_passing=True,
            coverage=CoverageComparison(85.0, 90.0, 5.0, []),
            performance=PerformanceComparison(100.0, 50.0, 50.0),
            flaky_tests=[],
            total_tests=30
        )
        
        typescript_report = ValidationReport(
            all_tests_passing=True,
            coverage=CoverageComparison(90.0, 92.0, 2.0, []),
            performance=PerformanceComparison(80.0, 40.0, 50.0),
            flaky_tests=[],
            total_tests=40
        )
        
        formatted = format_validation_report({
            'python': python_report,
            'typescript': typescript_report
        })
        
        assert 'PYTHON TEST SUITE' in formatted
        assert 'TYPESCRIPT TEST SUITE' in formatted
        assert 'OVERALL VALIDATION SUMMARY' in formatted


class TestValidationReportSaving:
    """Tests for saving validation reports."""
    
    def test_save_report_to_json(self, tmp_path):
        """Test saving validation report to JSON file."""
        coverage = CoverageComparison(
            before_percentage=85.0,
            after_percentage=90.0,
            delta=5.0,
            uncovered_lines=[]
        )
        
        performance = PerformanceComparison(
            before_time=100.0,
            after_time=50.0,
            improvement_percentage=50.0
        )
        
        report = ValidationReport(
            all_tests_passing=True,
            coverage=coverage,
            performance=performance,
            flaky_tests=[],
            total_tests=50
        )
        
        output_path = tmp_path / 'test_report.json'
        saved_path = save_validation_report({'python': report}, output_path)
        
        assert saved_path.exists()
        
        # Verify JSON content
        with open(saved_path, 'r') as f:
            data = json.load(f)
        
        assert 'generated_at' in data
        assert 'suites' in data
        assert 'python' in data['suites']
        assert data['suites']['python']['all_tests_passing'] is True
        assert data['suites']['python']['total_tests'] == 50
        assert data['suites']['python']['coverage']['delta'] == 5.0
        assert data['suites']['python']['performance']['improvement_percentage'] == 50.0
    
    def test_save_report_default_path(self, tmp_path, monkeypatch):
        """Test saving report with default path."""
        # Change to temp directory
        monkeypatch.chdir(tmp_path)
        
        report = ValidationReport(
            all_tests_passing=True,
            coverage=CoverageComparison(85.0, 90.0, 5.0, []),
            performance=PerformanceComparison(100.0, 50.0, 50.0),
            flaky_tests=[],
            total_tests=50
        )
        
        saved_path = save_validation_report({'python': report})
        
        assert saved_path.name == 'validation_report.json'
        assert saved_path.exists()
