"""
Unit tests for fragile test classification.
"""

import pytest
from pathlib import Path
from datetime import datetime
from test_cleanup.cleanup.fragile_classification import (
    is_fragile,
    classify_fragile_test,
    classify_fragile_tests,
    mark_test_as_fragile,
    classify_and_mark_fragile_tests,
    get_fragile_test_report,
    filter_tests_by_fragility
)
from test_cleanup.models import TestMetrics, CleanupLog


class TestIsFragile:
    """Tests for is_fragile function."""
    
    def test_exactly_at_threshold(self):
        """Test failure rate exactly at 5% threshold."""
        assert is_fragile(0.05, threshold=0.05) is True
    
    def test_above_threshold(self):
        """Test failure rate above 5% threshold."""
        assert is_fragile(0.10, threshold=0.05) is True
        assert is_fragile(0.50, threshold=0.05) is True
        assert is_fragile(1.0, threshold=0.05) is True
    
    def test_below_threshold(self):
        """Test failure rate below 5% threshold."""
        assert is_fragile(0.04, threshold=0.05) is False
        assert is_fragile(0.01, threshold=0.05) is False
        assert is_fragile(0.0, threshold=0.05) is False
    
    def test_custom_threshold(self):
        """Test with custom threshold."""
        assert is_fragile(0.10, threshold=0.10) is True
        assert is_fragile(0.09, threshold=0.10) is False
        assert is_fragile(0.15, threshold=0.20) is False


class TestClassifyFragileTest:
    """Tests for classify_fragile_test function."""
    
    def test_classify_fragile_test_above_threshold(self):
        """Test classifying a test with failure rate above threshold."""
        metrics = TestMetrics(
            name="test_flaky.py",
            file_path=Path("tests/test_flaky.py"),
            failure_rate=0.10,
            execution_time=1.0,
            last_modified=datetime.now(),
            lines_of_code=50
        )
        
        assert classify_fragile_test(metrics) is True
    
    def test_classify_fragile_test_below_threshold(self):
        """Test classifying a test with failure rate below threshold."""
        metrics = TestMetrics(
            name="test_stable.py",
            file_path=Path("tests/test_stable.py"),
            failure_rate=0.02,
            execution_time=1.0,
            last_modified=datetime.now(),
            lines_of_code=50
        )
        
        assert classify_fragile_test(metrics) is False
    
    def test_classify_fragile_test_at_threshold(self):
        """Test classifying a test with failure rate exactly at threshold."""
        metrics = TestMetrics(
            name="test_boundary.py",
            file_path=Path("tests/test_boundary.py"),
            failure_rate=0.05,
            execution_time=1.0,
            last_modified=datetime.now(),
            lines_of_code=50
        )
        
        assert classify_fragile_test(metrics, threshold=0.05) is True


class TestClassifyFragileTests:
    """Tests for classify_fragile_tests function."""
    
    def test_classify_multiple_tests(self):
        """Test classifying multiple tests."""
        test_metrics = {
            "test_1.py": TestMetrics(
                name="test_1.py",
                file_path=Path("tests/test_1.py"),
                failure_rate=0.10,
                execution_time=1.0,
                last_modified=datetime.now(),
                lines_of_code=50
            ),
            "test_2.py": TestMetrics(
                name="test_2.py",
                file_path=Path("tests/test_2.py"),
                failure_rate=0.02,
                execution_time=1.0,
                last_modified=datetime.now(),
                lines_of_code=50
            ),
            "test_3.py": TestMetrics(
                name="test_3.py",
                file_path=Path("tests/test_3.py"),
                failure_rate=0.08,
                execution_time=1.0,
                last_modified=datetime.now(),
                lines_of_code=50
            )
        }
        
        fragile = classify_fragile_tests(test_metrics)
        
        assert len(fragile) == 2
        assert any(t.name == "test_1.py" for t in fragile)
        assert any(t.name == "test_3.py" for t in fragile)
    
    def test_classify_no_fragile_tests(self):
        """Test when no tests are fragile."""
        test_metrics = {
            "test_1.py": TestMetrics(
                name="test_1.py",
                file_path=Path("tests/test_1.py"),
                failure_rate=0.01,
                execution_time=1.0,
                last_modified=datetime.now(),
                lines_of_code=50
            ),
            "test_2.py": TestMetrics(
                name="test_2.py",
                file_path=Path("tests/test_2.py"),
                failure_rate=0.02,
                execution_time=1.0,
                last_modified=datetime.now(),
                lines_of_code=50
            )
        }
        
        fragile = classify_fragile_tests(test_metrics)
        
        assert len(fragile) == 0
    
    def test_classify_all_fragile_tests(self):
        """Test when all tests are fragile."""
        test_metrics = {
            "test_1.py": TestMetrics(
                name="test_1.py",
                file_path=Path("tests/test_1.py"),
                failure_rate=0.10,
                execution_time=1.0,
                last_modified=datetime.now(),
                lines_of_code=50
            ),
            "test_2.py": TestMetrics(
                name="test_2.py",
                file_path=Path("tests/test_2.py"),
                failure_rate=0.20,
                execution_time=1.0,
                last_modified=datetime.now(),
                lines_of_code=50
            )
        }
        
        fragile = classify_fragile_tests(test_metrics)
        
        assert len(fragile) == 2


class TestMarkTestAsFragile:
    """Tests for mark_test_as_fragile function."""
    
    def test_mark_test_with_default_reason(self):
        """Test marking a test as fragile with default reason."""
        metrics = TestMetrics(
            name="test_flaky.py",
            file_path=Path("tests/test_flaky.py"),
            failure_rate=0.10,
            execution_time=1.0,
            last_modified=datetime.now(),
            lines_of_code=50
        )
        
        cleanup_log = CleanupLog()
        
        action = mark_test_as_fragile(metrics, cleanup_log)
        
        assert action.action_type == "keep"
        assert action.test_name == "test_flaky.py"
        assert "10.0%" in action.reason
        assert "5% threshold" in action.reason
        assert len(cleanup_log.actions) == 1
    
    def test_mark_test_with_custom_reason(self):
        """Test marking a test as fragile with custom reason."""
        metrics = TestMetrics(
            name="test_flaky.py",
            file_path=Path("tests/test_flaky.py"),
            failure_rate=0.10,
            execution_time=1.0,
            last_modified=datetime.now(),
            lines_of_code=50
        )
        
        cleanup_log = CleanupLog()
        custom_reason = "Custom fragility reason"
        
        action = mark_test_as_fragile(metrics, cleanup_log, reason=custom_reason)
        
        assert action.reason == custom_reason


class TestClassifyAndMarkFragileTests:
    """Tests for classify_and_mark_fragile_tests function."""
    
    def test_classify_and_mark_mixed_tests(self):
        """Test classifying and marking a mix of fragile and stable tests."""
        test_metrics = {
            "test_fragile.py": TestMetrics(
                name="test_fragile.py",
                file_path=Path("tests/test_fragile.py"),
                failure_rate=0.10,
                execution_time=1.0,
                last_modified=datetime.now(),
                lines_of_code=50
            ),
            "test_stable.py": TestMetrics(
                name="test_stable.py",
                file_path=Path("tests/test_stable.py"),
                failure_rate=0.02,
                execution_time=1.0,
                last_modified=datetime.now(),
                lines_of_code=50
            )
        }
        
        cleanup_log = CleanupLog()
        
        result = classify_and_mark_fragile_tests(test_metrics, cleanup_log)
        
        assert len(result['fragile']) == 1
        assert len(result['stable']) == 1
        assert result['fragile'][0].name == "test_fragile.py"
        assert result['stable'][0].name == "test_stable.py"
        assert len(cleanup_log.actions) == 1  # Only fragile tests are logged


class TestGetFragileTestReport:
    """Tests for get_fragile_test_report function."""
    
    def test_report_with_fragile_tests(self):
        """Test generating report with fragile tests."""
        fragile_tests = [
            TestMetrics(
                name="test_1.py",
                file_path=Path("tests/test_1.py"),
                failure_rate=0.10,
                execution_time=1.0,
                last_modified=datetime.now(),
                lines_of_code=50
            ),
            TestMetrics(
                name="test_2.py",
                file_path=Path("tests/test_2.py"),
                failure_rate=0.20,
                execution_time=1.5,
                last_modified=datetime.now(),
                lines_of_code=60
            )
        ]
        
        report = get_fragile_test_report(fragile_tests)
        
        assert report['total_fragile'] == 2
        assert abs(report['average_failure_rate'] - 0.15) < 0.0001
        assert report['max_failure_rate'] == 0.20
        assert report['min_failure_rate'] == 0.10
        assert len(report['tests']) == 2
        # Tests should be sorted by failure rate (descending)
        assert report['tests'][0]['name'] == "test_2.py"
        assert report['tests'][1]['name'] == "test_1.py"
    
    def test_report_with_no_fragile_tests(self):
        """Test generating report with no fragile tests."""
        report = get_fragile_test_report([])
        
        assert report['total_fragile'] == 0
        assert report['average_failure_rate'] == 0.0
        assert report['max_failure_rate'] == 0.0
        assert report['min_failure_rate'] == 0.0
        assert len(report['tests']) == 0


class TestFilterTestsByFragility:
    """Tests for filter_tests_by_fragility function."""
    
    def test_filter_include_fragile(self):
        """Test filtering to include only fragile tests."""
        test_metrics = {
            "test_fragile.py": TestMetrics(
                name="test_fragile.py",
                file_path=Path("tests/test_fragile.py"),
                failure_rate=0.10,
                execution_time=1.0,
                last_modified=datetime.now(),
                lines_of_code=50
            ),
            "test_stable.py": TestMetrics(
                name="test_stable.py",
                file_path=Path("tests/test_stable.py"),
                failure_rate=0.02,
                execution_time=1.0,
                last_modified=datetime.now(),
                lines_of_code=50
            )
        }
        
        filtered = filter_tests_by_fragility(test_metrics, include_fragile=True)
        
        assert len(filtered) == 1
        assert "test_fragile.py" in filtered
        assert "test_stable.py" not in filtered
    
    def test_filter_exclude_fragile(self):
        """Test filtering to exclude fragile tests."""
        test_metrics = {
            "test_fragile.py": TestMetrics(
                name="test_fragile.py",
                file_path=Path("tests/test_fragile.py"),
                failure_rate=0.10,
                execution_time=1.0,
                last_modified=datetime.now(),
                lines_of_code=50
            ),
            "test_stable.py": TestMetrics(
                name="test_stable.py",
                file_path=Path("tests/test_stable.py"),
                failure_rate=0.02,
                execution_time=1.0,
                last_modified=datetime.now(),
                lines_of_code=50
            )
        }
        
        filtered = filter_tests_by_fragility(test_metrics, include_fragile=False)
        
        assert len(filtered) == 1
        assert "test_stable.py" in filtered
        assert "test_fragile.py" not in filtered
