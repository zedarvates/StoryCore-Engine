"""
Unit tests for test execution functionality.
"""

import json
import pytest
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock
from test_cleanup.validation.test_execution import (
    run_pytest_with_coverage,
    run_vitest_with_coverage,
    execute_all_tests,
    TestExecutionResult
)


class TestPytestExecution:
    """Tests for pytest execution functionality."""
    
    def test_pytest_nonexistent_directory(self):
        """Test pytest execution with non-existent directory."""
        result = run_pytest_with_coverage(Path('/nonexistent/path'))
        
        assert result.framework == 'pytest'
        assert result.total_tests == 0
        assert result.success is False
        assert 'does not exist' in result.output
    
    @patch('time.time')
    @patch('subprocess.run')
    @patch('pathlib.Path.exists')
    def test_pytest_successful_execution(self, mock_exists, mock_run, mock_time):
        """Test successful pytest execution with coverage."""
        # Mock directory exists
        mock_exists.return_value = True
        
        # Mock time to simulate execution duration
        mock_time.side_effect = [0.0, 2.5]  # start and end times
        
        # Mock subprocess result
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = '5 passed in 2.5s'
        mock_result.stderr = ''
        mock_run.return_value = mock_result
        
        # Mock JSON report
        report_data = {
            'summary': {
                'total': 5,
                'passed': 5,
                'failed': 0,
                'skipped': 0
            },
            'tests': []
        }
        
        # Mock coverage report
        coverage_data = {
            'totals': {
                'percent_covered': 85.5
            }
        }
        
        with patch('builtins.open', create=True) as mock_open:
            mock_file = MagicMock()
            mock_file.__enter__.return_value.read.side_effect = [
                json.dumps(report_data),
                json.dumps(coverage_data)
            ]
            mock_open.return_value = mock_file
            
            with patch('pathlib.Path.exists', return_value=True):
                result = run_pytest_with_coverage(Path('tests'))
        
        assert result.framework == 'pytest'
        assert result.total_tests == 5
        assert result.passed_tests == 5
        assert result.failed_tests == 0
        assert result.success is True
        assert result.execution_time == 2.5
    
    @patch('subprocess.run')
    @patch('pathlib.Path.exists')
    def test_pytest_with_failures(self, mock_exists, mock_run):
        """Test pytest execution with test failures."""
        mock_exists.return_value = True
        
        mock_result = Mock()
        mock_result.returncode = 1
        mock_result.stdout = '3 passed, 2 failed'
        mock_result.stderr = ''
        mock_run.return_value = mock_result
        
        report_data = {
            'summary': {
                'total': 5,
                'passed': 3,
                'failed': 2,
                'skipped': 0
            },
            'tests': [
                {'nodeid': 'test_file.py::test_one', 'outcome': 'failed'},
                {'nodeid': 'test_file.py::test_two', 'outcome': 'failed'}
            ]
        }
        
        with patch('builtins.open', create=True) as mock_open:
            mock_file = MagicMock()
            mock_file.__enter__.return_value.read.return_value = json.dumps(report_data)
            mock_open.return_value = mock_file
            
            with patch('pathlib.Path.exists', return_value=True):
                result = run_pytest_with_coverage(Path('tests'))
        
        assert result.framework == 'pytest'
        assert result.total_tests == 5
        assert result.passed_tests == 3
        assert result.failed_tests == 2
        assert result.success is False
        assert len(result.failed_test_names) == 2


class TestVitestExecution:
    """Tests for vitest execution functionality."""
    
    def test_vitest_nonexistent_directory(self):
        """Test vitest execution with non-existent directory."""
        result = run_vitest_with_coverage(Path('/nonexistent/path'))
        
        assert result.framework == 'vitest'
        assert result.total_tests == 0
        assert result.success is False
        assert 'does not exist' in result.output
    
    @patch('time.time')
    @patch('subprocess.run')
    @patch('pathlib.Path.exists')
    def test_vitest_successful_execution(self, mock_exists, mock_run, mock_time):
        """Test successful vitest execution with coverage."""
        mock_exists.return_value = True
        
        # Mock time to simulate execution duration
        mock_time.side_effect = [0.0, 3.2]  # start and end times
        
        mock_result = Mock()
        mock_result.returncode = 0
        mock_result.stdout = 'Test Files  2 passed (2)\nTests  10 passed (10)'
        mock_result.stderr = ''
        mock_run.return_value = mock_result
        
        coverage_data = {
            'total': {
                'lines': {'pct': 92.3}
            }
        }
        
        with patch('builtins.open', create=True) as mock_open:
            mock_file = MagicMock()
            mock_file.__enter__.return_value.read.return_value = json.dumps(coverage_data)
            mock_open.return_value = mock_file
            
            with patch('pathlib.Path.exists', return_value=True):
                result = run_vitest_with_coverage(Path('creative-studio-ui'))
        
        assert result.framework == 'vitest'
        assert result.success is True
        assert result.execution_time == 3.2


class TestExecuteAllTests:
    """Tests for executing all test suites."""
    
    @patch('test_cleanup.validation.test_execution.run_pytest_with_coverage')
    @patch('test_cleanup.validation.test_execution.run_vitest_with_coverage')
    def test_execute_all_tests(self, mock_vitest, mock_pytest):
        """Test executing both Python and TypeScript tests."""
        mock_pytest.return_value = TestExecutionResult(
            framework='pytest',
            total_tests=10,
            passed_tests=10,
            failed_tests=0,
            skipped_tests=0,
            execution_time=5.0,
            coverage_percentage=85.0,
            failed_test_names=[],
            output='All tests passed',
            success=True
        )
        
        mock_vitest.return_value = TestExecutionResult(
            framework='vitest',
            total_tests=20,
            passed_tests=20,
            failed_tests=0,
            skipped_tests=0,
            execution_time=8.0,
            coverage_percentage=90.0,
            failed_test_names=[],
            output='All tests passed',
            success=True
        )
        
        results = execute_all_tests()
        
        assert 'python' in results
        assert 'typescript' in results
        assert results['python'].total_tests == 10
        assert results['typescript'].total_tests == 20
