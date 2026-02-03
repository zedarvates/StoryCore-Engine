"""
Unit tests for test execution history analysis.
"""

import pytest
from pathlib import Path
import json
import tempfile
from datetime import datetime, timedelta
from test_cleanup.analysis.execution_history import (
    parse_pytest_json_report,
    parse_vitest_json_report,
    calculate_failure_rate,
    identify_failed_tests_in_period,
    analyze_test_execution_history
)


class TestPytestReportParsing:
    """Tests for pytest JSON report parsing."""
    
    def test_parse_pytest_json_report_valid(self, tmp_path):
        """Test parsing a valid pytest JSON report."""
        report_data = {
            "created": "2024-01-15T10:00:00",
            "tests": [
                {
                    "nodeid": "test_example.py::test_function",
                    "outcome": "passed",
                    "duration": 0.5
                },
                {
                    "nodeid": "test_example.py::test_another",
                    "outcome": "failed",
                    "duration": 1.2
                }
            ]
        }
        
        report_path = tmp_path / "pytest_report.json"
        with open(report_path, 'w') as f:
            json.dump(report_data, f)
        
        result = parse_pytest_json_report(report_path)
        
        assert len(result) == 2
        assert "test_example.py::test_function" in result
        assert result["test_example.py::test_function"]["outcome"] == "passed"
        assert result["test_example.py::test_function"]["duration"] == 0.5
    
    def test_parse_pytest_json_report_nonexistent(self):
        """Test parsing a non-existent report file."""
        result = parse_pytest_json_report(Path("/nonexistent/report.json"))
        
        assert result == {}
    
    def test_parse_pytest_json_report_invalid_json(self, tmp_path):
        """Test parsing an invalid JSON file."""
        report_path = tmp_path / "invalid.json"
        with open(report_path, 'w') as f:
            f.write("not valid json{")
        
        result = parse_pytest_json_report(report_path)
        
        assert result == {}


class TestVitestReportParsing:
    """Tests for vitest JSON report parsing."""
    
    def test_parse_vitest_json_report_valid(self, tmp_path):
        """Test parsing a valid vitest JSON report."""
        report_data = {
            "testResults": [
                {
                    "name": "example.test.ts",
                    "startTime": "2024-01-15T10:00:00",
                    "assertionResults": [
                        {
                            "title": "should work",
                            "status": "passed",
                            "duration": 50
                        },
                        {
                            "title": "should fail",
                            "status": "failed",
                            "duration": 100
                        }
                    ]
                }
            ]
        }
        
        report_path = tmp_path / "vitest_report.json"
        with open(report_path, 'w') as f:
            json.dump(report_data, f)
        
        result = parse_vitest_json_report(report_path)
        
        assert len(result) == 2
        assert "example.test.ts::should work" in result
        assert result["example.test.ts::should work"]["outcome"] == "passed"
    
    def test_parse_vitest_json_report_nonexistent(self):
        """Test parsing a non-existent report file."""
        result = parse_vitest_json_report(Path("/nonexistent/report.json"))
        
        assert result == {}
    
    def test_parse_vitest_json_report_invalid_json(self, tmp_path):
        """Test parsing an invalid JSON file."""
        report_path = tmp_path / "invalid.json"
        with open(report_path, 'w') as f:
            f.write("not valid json{")
        
        result = parse_vitest_json_report(report_path)
        
        assert result == {}


class TestFailureRateCalculation:
    """Tests for failure rate calculation."""
    
    def test_calculate_failure_rate_no_failures(self):
        """Test failure rate calculation with no failures."""
        execution_history = [
            {"test_one": {"outcome": "passed"}},
            {"test_one": {"outcome": "passed"}},
            {"test_one": {"outcome": "passed"}}
        ]
        
        rate = calculate_failure_rate("test_one", execution_history)
        
        assert rate == 0.0
    
    def test_calculate_failure_rate_all_failures(self):
        """Test failure rate calculation with all failures."""
        execution_history = [
            {"test_one": {"outcome": "failed"}},
            {"test_one": {"outcome": "failed"}},
            {"test_one": {"outcome": "failed"}}
        ]
        
        rate = calculate_failure_rate("test_one", execution_history)
        
        assert rate == 1.0
    
    def test_calculate_failure_rate_partial_failures(self):
        """Test failure rate calculation with partial failures."""
        execution_history = [
            {"test_one": {"outcome": "passed"}},
            {"test_one": {"outcome": "failed"}},
            {"test_one": {"outcome": "passed"}},
            {"test_one": {"outcome": "failed"}}
        ]
        
        rate = calculate_failure_rate("test_one", execution_history)
        
        assert rate == 0.5
    
    def test_calculate_failure_rate_test_not_in_history(self):
        """Test failure rate calculation for test not in history."""
        execution_history = [
            {"test_one": {"outcome": "passed"}},
            {"test_two": {"outcome": "passed"}}
        ]
        
        rate = calculate_failure_rate("test_three", execution_history)
        
        assert rate == 0.0
    
    def test_calculate_failure_rate_counts_errors_as_failures(self):
        """Test that errors are counted as failures."""
        execution_history = [
            {"test_one": {"outcome": "passed"}},
            {"test_one": {"outcome": "error"}},
            {"test_one": {"outcome": "passed"}},
            {"test_one": {"outcome": "failed"}}
        ]
        
        rate = calculate_failure_rate("test_one", execution_history)
        
        assert rate == 0.5


class TestFailedTestsIdentification:
    """Tests for identifying failed tests in a time period."""
    
    def test_identify_failed_tests_in_period_recent_failures(self):
        """Test identification of recent failures."""
        now = datetime.now()
        recent = now.isoformat()
        
        execution_history = [
            {
                "test_one": {"outcome": "failed", "timestamp": recent},
                "test_two": {"outcome": "passed", "timestamp": recent}
            }
        ]
        
        failed = identify_failed_tests_in_period(execution_history, days=30)
        
        assert "test_one" in failed
        assert "test_two" not in failed
    
    def test_identify_failed_tests_in_period_old_failures(self):
        """Test that old failures are excluded."""
        old = (datetime.now() - timedelta(days=60)).isoformat()
        
        execution_history = [
            {
                "test_one": {"outcome": "failed", "timestamp": old}
            }
        ]
        
        failed = identify_failed_tests_in_period(execution_history, days=30)
        
        assert "test_one" not in failed
    
    def test_identify_failed_tests_in_period_no_timestamp(self):
        """Test handling of tests without timestamps."""
        execution_history = [
            {
                "test_one": {"outcome": "failed"}
            }
        ]
        
        failed = identify_failed_tests_in_period(execution_history, days=30)
        
        # Should assume recent if no timestamp
        assert "test_one" in failed
    
    def test_identify_failed_tests_in_period_errors_included(self):
        """Test that errors are included as failures."""
        now = datetime.now().isoformat()
        
        execution_history = [
            {
                "test_one": {"outcome": "error", "timestamp": now}
            }
        ]
        
        failed = identify_failed_tests_in_period(execution_history, days=30)
        
        assert "test_one" in failed


class TestExecutionHistoryAnalysis:
    """Tests for complete execution history analysis."""
    
    def test_analyze_test_execution_history_with_pytest_reports(self, tmp_path):
        """Test analysis with pytest reports."""
        report1 = tmp_path / "report1.json"
        report1_data = {
            "created": "2024-01-15T10:00:00",
            "tests": [
                {"nodeid": "test_example.py::test_one", "outcome": "passed", "duration": 0.5}
            ]
        }
        with open(report1, 'w') as f:
            json.dump(report1_data, f)
        
        report2 = tmp_path / "report2.json"
        report2_data = {
            "created": "2024-01-16T10:00:00",
            "tests": [
                {"nodeid": "test_example.py::test_one", "outcome": "failed", "duration": 0.6}
            ]
        }
        with open(report2, 'w') as f:
            json.dump(report2_data, f)
        
        result = analyze_test_execution_history(pytest_reports=[report1, report2])
        
        assert "test_example.py::test_one" in result
        assert result["test_example.py::test_one"].failure_rate == 0.5
        assert result["test_example.py::test_one"].execution_time == 0.55
    
    def test_analyze_test_execution_history_with_vitest_reports(self, tmp_path):
        """Test analysis with vitest reports."""
        report = tmp_path / "vitest_report.json"
        report_data = {
            "testResults": [
                {
                    "name": "example.test.ts",
                    "startTime": "2024-01-15T10:00:00",
                    "assertionResults": [
                        {"title": "should work", "status": "passed", "duration": 50}
                    ]
                }
            ]
        }
        with open(report, 'w') as f:
            json.dump(report_data, f)
        
        result = analyze_test_execution_history(vitest_reports=[report])
        
        assert "example.test.ts::should work" in result
        assert result["example.test.ts::should work"].failure_rate == 0.0
    
    def test_analyze_test_execution_history_empty_reports(self):
        """Test analysis with no reports."""
        result = analyze_test_execution_history()
        
        assert result == {}
    
    def test_analyze_test_execution_history_mixed_reports(self, tmp_path):
        """Test analysis with both pytest and vitest reports."""
        pytest_report = tmp_path / "pytest.json"
        pytest_data = {
            "created": "2024-01-15T10:00:00",
            "tests": [
                {"nodeid": "test_py.py::test_one", "outcome": "passed", "duration": 0.5}
            ]
        }
        with open(pytest_report, 'w') as f:
            json.dump(pytest_data, f)
        
        vitest_report = tmp_path / "vitest.json"
        vitest_data = {
            "testResults": [
                {
                    "name": "test.ts",
                    "startTime": "2024-01-15T10:00:00",
                    "assertionResults": [
                        {"title": "should work", "status": "passed", "duration": 50}
                    ]
                }
            ]
        }
        with open(vitest_report, 'w') as f:
            json.dump(vitest_data, f)
        
        result = analyze_test_execution_history(
            pytest_reports=[pytest_report],
            vitest_reports=[vitest_report]
        )
        
        assert len(result) == 2
        assert "test_py.py::test_one" in result
        assert "test.ts::should work" in result
