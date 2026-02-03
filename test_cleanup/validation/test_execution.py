"""
Test suite execution functionality for Python and TypeScript tests.

This module provides functions to execute test suites with coverage measurement
and collect execution results and timing data.
"""

import json
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional


@dataclass
class TestExecutionResult:
    """Result of executing a test suite."""
    framework: str  # 'pytest' or 'vitest'
    total_tests: int
    passed_tests: int
    failed_tests: int
    skipped_tests: int
    execution_time: float
    coverage_percentage: float
    failed_test_names: List[str]
    output: str
    success: bool


def run_pytest_with_coverage(test_dir: Path = None) -> TestExecutionResult:
    """
    Run pytest with coverage for Python tests.
    
    Args:
        test_dir: Directory containing Python tests (default: tests/)
        
    Returns:
        TestExecutionResult with execution metrics
        
    Requirements: 8.5, 10.1
    """
    if test_dir is None:
        test_dir = Path('tests')
    
    if not test_dir.exists():
        return TestExecutionResult(
            framework='pytest',
            total_tests=0,
            passed_tests=0,
            failed_tests=0,
            skipped_tests=0,
            execution_time=0.0,
            coverage_percentage=0.0,
            failed_test_names=[],
            output='Test directory does not exist',
            success=False
        )
    
    # Run pytest with coverage and JSON report
    start_time = time.time()
    
    try:
        result = subprocess.run(
            [
                'pytest',
                str(test_dir),
                '--cov=.',
                '--cov-report=json',
                '--json-report',
                '--json-report-file=pytest_report.json',
                '-v'
            ],
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        execution_time = time.time() - start_time
        output = result.stdout + result.stderr
        
        # Parse JSON report if available
        report_path = Path('pytest_report.json')
        if report_path.exists():
            with open(report_path, 'r') as f:
                report_data = json.load(f)
            
            total_tests = report_data.get('summary', {}).get('total', 0)
            passed_tests = report_data.get('summary', {}).get('passed', 0)
            failed_tests = report_data.get('summary', {}).get('failed', 0)
            skipped_tests = report_data.get('summary', {}).get('skipped', 0)
            
            # Extract failed test names
            failed_test_names = [
                test.get('nodeid', '')
                for test in report_data.get('tests', [])
                if test.get('outcome') == 'failed'
            ]
        else:
            # Fallback to parsing output
            total_tests = output.count('PASSED') + output.count('FAILED')
            passed_tests = output.count('PASSED')
            failed_tests = output.count('FAILED')
            skipped_tests = output.count('SKIPPED')
            failed_test_names = []
        
        # Parse coverage report
        coverage_path = Path('coverage.json')
        coverage_percentage = 0.0
        if coverage_path.exists():
            with open(coverage_path, 'r') as f:
                coverage_data = json.load(f)
            coverage_percentage = coverage_data.get('totals', {}).get('percent_covered', 0.0)
        
        return TestExecutionResult(
            framework='pytest',
            total_tests=total_tests,
            passed_tests=passed_tests,
            failed_tests=failed_tests,
            skipped_tests=skipped_tests,
            execution_time=execution_time,
            coverage_percentage=coverage_percentage,
            failed_test_names=failed_test_names,
            output=output,
            success=result.returncode == 0
        )
        
    except subprocess.TimeoutExpired:
        execution_time = time.time() - start_time
        return TestExecutionResult(
            framework='pytest',
            total_tests=0,
            passed_tests=0,
            failed_tests=0,
            skipped_tests=0,
            execution_time=execution_time,
            coverage_percentage=0.0,
            failed_test_names=[],
            output='Test execution timed out after 5 minutes',
            success=False
        )
    except Exception as e:
        execution_time = time.time() - start_time
        return TestExecutionResult(
            framework='pytest',
            total_tests=0,
            passed_tests=0,
            failed_tests=0,
            skipped_tests=0,
            execution_time=execution_time,
            coverage_percentage=0.0,
            failed_test_names=[],
            output=f'Error executing tests: {str(e)}',
            success=False
        )


def run_vitest_with_coverage(test_dir: Path = None) -> TestExecutionResult:
    """
    Run vitest with coverage for TypeScript tests.
    
    Args:
        test_dir: Directory containing TypeScript tests (default: creative-studio-ui/)
        
    Returns:
        TestExecutionResult with execution metrics
        
    Requirements: 9.5, 10.1
    """
    if test_dir is None:
        test_dir = Path('creative-studio-ui')
    
    if not test_dir.exists():
        return TestExecutionResult(
            framework='vitest',
            total_tests=0,
            passed_tests=0,
            failed_tests=0,
            skipped_tests=0,
            execution_time=0.0,
            coverage_percentage=0.0,
            failed_test_names=[],
            output='Test directory does not exist',
            success=False
        )
    
    # Run vitest with coverage and JSON reporter
    start_time = time.time()
    
    try:
        result = subprocess.run(
            [
                'npm',
                'run',
                'test',
                '--',
                '--run',
                '--coverage',
                '--reporter=json',
                '--reporter=verbose'
            ],
            cwd=test_dir,
            capture_output=True,
            text=True,
            timeout=300  # 5 minute timeout
        )
        
        execution_time = time.time() - start_time
        output = result.stdout + result.stderr
        
        # Parse vitest output for test counts
        # Vitest output format: "Test Files  X passed (Y)"
        total_tests = 0
        passed_tests = 0
        failed_tests = 0
        skipped_tests = 0
        failed_test_names = []
        
        # Try to parse JSON output if available
        try:
            # Look for JSON in output
            json_start = output.find('{')
            if json_start != -1:
                json_str = output[json_start:]
                json_end = json_str.rfind('}') + 1
                if json_end > 0:
                    report_data = json.loads(json_str[:json_end])
                    
                    if 'testResults' in report_data:
                        for test_result in report_data['testResults']:
                            total_tests += len(test_result.get('assertionResults', []))
                            for assertion in test_result.get('assertionResults', []):
                                status = assertion.get('status', '')
                                if status == 'passed':
                                    passed_tests += 1
                                elif status == 'failed':
                                    failed_tests += 1
                                    failed_test_names.append(assertion.get('fullName', ''))
                                elif status == 'skipped':
                                    skipped_tests += 1
        except (json.JSONDecodeError, ValueError):
            # Fallback to text parsing
            if 'passed' in output.lower():
                # Simple heuristic parsing
                lines = output.split('\n')
                for line in lines:
                    if 'passed' in line.lower():
                        parts = line.split()
                        for i, part in enumerate(parts):
                            if part.isdigit() and i + 1 < len(parts) and 'passed' in parts[i + 1].lower():
                                passed_tests = int(part)
                                break
        
        # Parse coverage from coverage directory
        coverage_path = test_dir / 'coverage' / 'coverage-summary.json'
        coverage_percentage = 0.0
        if coverage_path.exists():
            with open(coverage_path, 'r') as f:
                coverage_data = json.load(f)
            # Get total coverage percentage
            total_coverage = coverage_data.get('total', {})
            if total_coverage:
                coverage_percentage = total_coverage.get('lines', {}).get('pct', 0.0)
        
        return TestExecutionResult(
            framework='vitest',
            total_tests=total_tests or passed_tests + failed_tests + skipped_tests,
            passed_tests=passed_tests,
            failed_tests=failed_tests,
            skipped_tests=skipped_tests,
            execution_time=execution_time,
            coverage_percentage=coverage_percentage,
            failed_test_names=failed_test_names,
            output=output,
            success=result.returncode == 0
        )
        
    except subprocess.TimeoutExpired:
        execution_time = time.time() - start_time
        return TestExecutionResult(
            framework='vitest',
            total_tests=0,
            passed_tests=0,
            failed_tests=0,
            skipped_tests=0,
            execution_time=execution_time,
            coverage_percentage=0.0,
            failed_test_names=[],
            output='Test execution timed out after 5 minutes',
            success=False
        )
    except Exception as e:
        execution_time = time.time() - start_time
        return TestExecutionResult(
            framework='vitest',
            total_tests=0,
            passed_tests=0,
            failed_tests=0,
            skipped_tests=0,
            execution_time=execution_time,
            coverage_percentage=0.0,
            failed_test_names=[],
            output=f'Error executing tests: {str(e)}',
            success=False
        )


def execute_all_tests(
    python_test_dir: Path = None,
    typescript_test_dir: Path = None
) -> Dict[str, TestExecutionResult]:
    """
    Execute both Python and TypeScript test suites.
    
    Args:
        python_test_dir: Directory containing Python tests
        typescript_test_dir: Directory containing TypeScript tests
        
    Returns:
        Dictionary with 'python' and 'typescript' keys containing execution results
        
    Requirements: 8.5, 9.5, 10.1
    """
    results = {}
    
    # Execute Python tests
    if python_test_dir is None or python_test_dir.exists():
        results['python'] = run_pytest_with_coverage(python_test_dir)
    
    # Execute TypeScript tests
    if typescript_test_dir is None or typescript_test_dir.exists():
        results['typescript'] = run_vitest_with_coverage(typescript_test_dir)
    
    return results
