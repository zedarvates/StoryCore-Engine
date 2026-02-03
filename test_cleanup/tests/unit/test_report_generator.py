"""
Unit tests for analysis report generator.
"""

import pytest
from pathlib import Path
import json
from datetime import datetime
from test_cleanup.models import TestMetrics, TestGroup, AnalysisReport
from test_cleanup.analysis.report_generator import (
    categorize_tests,
    calculate_metrics,
    generate_analysis_report,
    export_report_to_json,
    generate_summary_text
)


class TestTestCategorization:
    """Tests for test categorization."""
    
    def test_categorize_tests_all_categories(self):
        """Test categorization with tests in all categories."""
        test_metrics = {
            'test_obsolete': TestMetrics(
                name='test_obsolete',
                file_path=Path('test.py'),
                failure_rate=0.0,
                execution_time=1.0,
                last_modified=datetime.now(),
                lines_of_code=10
            ),
            'test_fragile': TestMetrics(
                name='test_fragile',
                file_path=Path('test.py'),
                failure_rate=0.1,
                execution_time=1.0,
                last_modified=datetime.now(),
                lines_of_code=10
            ),
            'test_duplicate': TestMetrics(
                name='test_duplicate',
                file_path=Path('test.py'),
                failure_rate=0.0,
                execution_time=1.0,
                last_modified=datetime.now(),
                lines_of_code=10
            ),
            'test_valuable': TestMetrics(
                name='test_valuable',
                file_path=Path('test.py'),
                failure_rate=0.0,
                execution_time=1.0,
                last_modified=datetime.now(),
                lines_of_code=10
            )
        }
        
        duplicate_groups = [
            TestGroup(
                tests=['test_duplicate'],
                similarity_score=1.0,
                shared_assertions=[]
            )
        ]
        
        obsolete_tests = ['test_obsolete']
        
        result = categorize_tests(test_metrics, duplicate_groups, obsolete_tests)
        
        assert 'test_obsolete' in result['obsolete']
        assert any(t.name == 'test_fragile' for t in result['fragile'])
        assert 'test_valuable' in result['valuable']
    
    def test_categorize_tests_empty(self):
        """Test categorization with no tests."""
        result = categorize_tests({}, [], [])
        
        assert len(result['obsolete']) == 0
        assert len(result['fragile']) == 0
        assert len(result['duplicate_groups']) == 0
        assert len(result['valuable']) == 0


class TestMetricsCalculation:
    """Tests for metrics calculation."""
    
    def test_calculate_metrics_with_tests(self):
        """Test metrics calculation with various tests."""
        test_metrics = {
            'test_one': TestMetrics(
                name='test_one',
                file_path=Path('test.py'),
                failure_rate=0.0,
                execution_time=1.0,
                last_modified=datetime.now(),
                lines_of_code=10
            ),
            'test_two': TestMetrics(
                name='test_two',
                file_path=Path('test.py'),
                failure_rate=0.1,
                execution_time=2.0,
                last_modified=datetime.now(),
                lines_of_code=10
            )
        }
        
        categorized = {
            'obsolete': [],
            'fragile': [test_metrics['test_two']],
            'duplicate_groups': [],
            'valuable': ['test_one']
        }
        
        result = calculate_metrics(test_metrics, categorized)
        
        assert result['total_tests'] == 2
        assert result['total_execution_time'] == 3.0
        assert result['fragile_count'] == 1
        assert result['valuable_count'] == 1
    
    def test_calculate_metrics_empty(self):
        """Test metrics calculation with no tests."""
        categorized = {
            'obsolete': [],
            'fragile': [],
            'duplicate_groups': [],
            'valuable': []
        }
        
        result = calculate_metrics({}, categorized)
        
        assert result['total_tests'] == 0
        assert result['total_execution_time'] == 0.0


class TestReportGeneration:
    """Tests for report generation."""
    
    def test_generate_analysis_report(self):
        """Test generating a complete analysis report."""
        test_metrics = {
            'test_one': TestMetrics(
                name='test_one',
                file_path=Path('test.py'),
                failure_rate=0.0,
                execution_time=1.0,
                last_modified=datetime.now(),
                lines_of_code=10
            )
        }
        
        report = generate_analysis_report(
            test_metrics,
            duplicate_groups=[],
            obsolete_tests=[],
            coverage_percentage=85.0
        )
        
        assert isinstance(report, AnalysisReport)
        assert report.total_tests == 1
        assert report.coverage_percentage == 85.0
    
    def test_generate_analysis_report_empty(self):
        """Test generating report with no tests."""
        report = generate_analysis_report(
            {},
            duplicate_groups=[],
            obsolete_tests=[]
        )
        
        assert report.total_tests == 0


class TestReportExport:
    """Tests for report export."""
    
    def test_export_report_to_json(self, tmp_path):
        """Test exporting report to JSON file."""
        report = AnalysisReport(
            total_tests=1,
            obsolete_tests=[],
            fragile_tests=[],
            duplicate_groups=[],
            valuable_tests=['test_one'],
            total_execution_time=1.0,
            coverage_percentage=85.0
        )
        
        output_path = tmp_path / "report.json"
        export_report_to_json(report, output_path)
        
        assert output_path.exists()
        
        with open(output_path, 'r') as f:
            data = json.load(f)
        
        assert data['total_tests'] == 1
        assert data['coverage_percentage'] == 85.0
        assert 'generated_at' in data


class TestSummaryGeneration:
    """Tests for summary text generation."""
    
    def test_generate_summary_text(self):
        """Test generating human-readable summary."""
        report = AnalysisReport(
            total_tests=10,
            obsolete_tests=['test_old'],
            fragile_tests=[],
            duplicate_groups=[],
            valuable_tests=['test_one', 'test_two'],
            total_execution_time=5.0,
            coverage_percentage=85.0
        )
        
        summary = generate_summary_text(report)
        
        assert 'Total Tests: 10' in summary
        assert 'Code Coverage: 85.00%' in summary
        assert 'Obsolete Tests: 1' in summary
