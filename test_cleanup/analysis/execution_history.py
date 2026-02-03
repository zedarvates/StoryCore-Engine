"""
Test execution history analysis for pytest and vitest test suites.

This module provides functions to parse test execution reports and calculate
failure rates and identify problematic tests.
"""

from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import json
from test_cleanup.models import TestMetrics


def parse_pytest_json_report(report_path: Path) -> Dict[str, dict]:
    """
    Parse pytest JSON report for test execution data.
    
    Args:
        report_path: Path to pytest JSON report file
        
    Returns:
        Dictionary mapping test names to execution data
        
    Requirements: 1.1, 1.2
    """
    if not report_path.exists():
        return {}
    
    try:
        with open(report_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        test_results = {}
        
        # Parse pytest-json-report format
        if 'tests' in data:
            for test in data['tests']:
                test_name = test.get('nodeid', '')
                test_results[test_name] = {
                    'outcome': test.get('outcome', 'unknown'),
                    'duration': test.get('duration', 0.0),
                    'timestamp': data.get('created', None)
                }
        
        return test_results
    except (json.JSONDecodeError, KeyError) as e:
        return {}


def parse_vitest_json_report(report_path: Path) -> Dict[str, dict]:
    """
    Parse vitest JSON report for test execution data.
    
    Args:
        report_path: Path to vitest JSON report file
        
    Returns:
        Dictionary mapping test names to execution data
        
    Requirements: 1.1, 1.2
    """
    if not report_path.exists():
        return {}
    
    try:
        with open(report_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        test_results = {}
        
        # Parse vitest JSON format
        if 'testResults' in data:
            for test_file in data['testResults']:
                for assertion in test_file.get('assertionResults', []):
                    test_name = f"{test_file.get('name', '')}::{assertion.get('title', '')}"
                    test_results[test_name] = {
                        'outcome': assertion.get('status', 'unknown'),
                        'duration': assertion.get('duration', 0.0),
                        'timestamp': test_file.get('startTime', None)
                    }
        
        return test_results
    except (json.JSONDecodeError, KeyError) as e:
        return {}


def calculate_failure_rate(
    test_name: str,
    execution_history: List[Dict[str, dict]]
) -> float:
    """
    Calculate failure rate for a specific test across multiple runs.
    
    Args:
        test_name: Name of the test
        execution_history: List of execution report dictionaries
        
    Returns:
        Failure rate as a float between 0.0 and 1.0
        
    Requirements: 1.2
    """
    total_runs = 0
    failures = 0
    
    for report in execution_history:
        if test_name in report:
            total_runs += 1
            outcome = report[test_name].get('outcome', 'unknown')
            # Count failed, error, and skipped as failures
            if outcome in ['failed', 'error', 'skipped']:
                failures += 1
    
    if total_runs == 0:
        return 0.0
    
    return failures / total_runs


def identify_failed_tests_in_period(
    execution_history: List[Dict[str, dict]],
    days: int = 30
) -> List[str]:
    """
    Identify tests that failed in the last N days.
    
    Args:
        execution_history: List of execution report dictionaries with timestamps
        days: Number of days to look back (default: 30)
        
    Returns:
        List of test names that failed in the period
        
    Requirements: 1.1
    """
    cutoff_date = datetime.now() - timedelta(days=days)
    failed_tests = set()
    
    for report in execution_history:
        for test_name, test_data in report.items():
            outcome = test_data.get('outcome', 'unknown')
            timestamp_str = test_data.get('timestamp')
            
            # Parse timestamp if available
            if timestamp_str:
                try:
                    # Try ISO format
                    timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                except (ValueError, AttributeError):
                    # If parsing fails, assume it's recent
                    timestamp = datetime.now()
            else:
                # If no timestamp, assume it's recent
                timestamp = datetime.now()
            
            # Check if test failed and is within the time period
            if outcome in ['failed', 'error'] and timestamp >= cutoff_date:
                failed_tests.add(test_name)
    
    return sorted(list(failed_tests))


def analyze_test_execution_history(
    pytest_reports: List[Path] = None,
    vitest_reports: List[Path] = None,
    failure_rate_threshold: float = 0.05
) -> Dict[str, TestMetrics]:
    """
    Analyze test execution history from multiple report files.
    
    Args:
        pytest_reports: List of pytest JSON report paths
        vitest_reports: List of vitest JSON report paths
        failure_rate_threshold: Threshold for marking tests as fragile (default: 0.05)
        
    Returns:
        Dictionary mapping test names to TestMetrics objects
        
    Requirements: 1.1, 1.2
    """
    if pytest_reports is None:
        pytest_reports = []
    if vitest_reports is None:
        vitest_reports = []
    
    # Parse all reports
    all_reports = []
    
    for report_path in pytest_reports:
        report_data = parse_pytest_json_report(report_path)
        if report_data:
            all_reports.append(report_data)
    
    for report_path in vitest_reports:
        report_data = parse_vitest_json_report(report_path)
        if report_data:
            all_reports.append(report_data)
    
    # Collect all unique test names
    all_test_names = set()
    for report in all_reports:
        all_test_names.update(report.keys())
    
    # Calculate metrics for each test
    test_metrics = {}
    
    for test_name in all_test_names:
        failure_rate = calculate_failure_rate(test_name, all_reports)
        
        # Calculate average execution time
        durations = []
        for report in all_reports:
            if test_name in report:
                durations.append(report[test_name].get('duration', 0.0))
        
        avg_duration = sum(durations) / len(durations) if durations else 0.0
        
        # Create TestMetrics object
        metrics = TestMetrics(
            name=test_name,
            file_path=Path(test_name.split('::')[0]) if '::' in test_name else Path(test_name),
            failure_rate=failure_rate,
            execution_time=avg_duration,
            last_modified=datetime.now(),  # Would need to get from file system
            lines_of_code=0  # Would need to calculate from file
        )
        
        test_metrics[test_name] = metrics
    
    return test_metrics
