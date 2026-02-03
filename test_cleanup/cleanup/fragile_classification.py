"""
Fragile test classification.

This module provides functions to classify tests as fragile based on their
failure rate and execution history.
"""

from pathlib import Path
from typing import List, Dict, Optional
from test_cleanup.models import TestMetrics, CleanupAction, CleanupLog
from datetime import datetime


def is_fragile(failure_rate: float, threshold: float = 0.05) -> bool:
    """
    Determine if a test is fragile based on failure rate.
    
    Args:
        failure_rate: The failure rate of the test (0.0 to 1.0)
        threshold: The threshold above which a test is considered fragile
        
    Returns:
        True if the test is fragile, False otherwise
        
    Requirements: 3.1
    """
    return failure_rate >= threshold


def classify_fragile_test(
    test_metrics: TestMetrics,
    threshold: float = 0.05
) -> bool:
    """
    Classify a single test as fragile or not.
    
    Args:
        test_metrics: TestMetrics object for the test
        threshold: Failure rate threshold (default 5%)
        
    Returns:
        True if test is fragile, False otherwise
        
    Requirements: 3.1
    """
    return is_fragile(test_metrics.failure_rate, threshold)


def classify_fragile_tests(
    test_metrics: Dict[str, TestMetrics],
    threshold: float = 0.05
) -> List[TestMetrics]:
    """
    Classify multiple tests as fragile based on failure rate.
    
    Args:
        test_metrics: Dictionary mapping test names to TestMetrics
        threshold: Failure rate threshold (default 5%)
        
    Returns:
        List of TestMetrics for tests classified as fragile
        
    Requirements: 3.1
    """
    fragile_tests = []
    
    for test_name, metrics in test_metrics.items():
        if classify_fragile_test(metrics, threshold):
            fragile_tests.append(metrics)
    
    return fragile_tests


def mark_test_as_fragile(
    test_metrics: TestMetrics,
    cleanup_log: CleanupLog,
    reason: Optional[str] = None
) -> CleanupAction:
    """
    Mark a test as fragile and log the action.
    
    Args:
        test_metrics: TestMetrics for the fragile test
        cleanup_log: CleanupLog to record the action
        reason: Optional custom reason for marking as fragile
        
    Returns:
        CleanupAction documenting the classification
        
    Requirements: 3.1
    """
    if reason is None:
        reason = f"Fragile test: failure rate {test_metrics.failure_rate:.1%} exceeds 5% threshold"
    
    action = CleanupAction(
        action_type="keep",  # Fragile tests are kept but marked
        test_name=test_metrics.name,
        reason=reason,
        timestamp=datetime.now(),
        before_metrics=test_metrics,
        after_metrics=None
    )
    
    cleanup_log.actions.append(action)
    return action


def classify_and_mark_fragile_tests(
    test_metrics: Dict[str, TestMetrics],
    cleanup_log: CleanupLog,
    threshold: float = 0.05
) -> Dict[str, List[TestMetrics]]:
    """
    Classify tests as fragile and mark them in the cleanup log.
    
    Args:
        test_metrics: Dictionary mapping test names to TestMetrics
        cleanup_log: CleanupLog to record actions
        threshold: Failure rate threshold (default 5%)
        
    Returns:
        Dictionary with 'fragile' and 'stable' test lists
        
    Requirements: 3.1
    """
    fragile_tests = []
    stable_tests = []
    
    for test_name, metrics in test_metrics.items():
        if classify_fragile_test(metrics, threshold):
            fragile_tests.append(metrics)
            mark_test_as_fragile(metrics, cleanup_log)
        else:
            stable_tests.append(metrics)
    
    return {
        'fragile': fragile_tests,
        'stable': stable_tests
    }


def get_fragile_test_report(
    fragile_tests: List[TestMetrics]
) -> Dict:
    """
    Generate a report of fragile tests with statistics.
    
    Args:
        fragile_tests: List of TestMetrics for fragile tests
        
    Returns:
        Dictionary with fragile test statistics
        
    Requirements: 3.1
    """
    if not fragile_tests:
        return {
            'total_fragile': 0,
            'average_failure_rate': 0.0,
            'max_failure_rate': 0.0,
            'min_failure_rate': 0.0,
            'tests': []
        }
    
    failure_rates = [t.failure_rate for t in fragile_tests]
    
    return {
        'total_fragile': len(fragile_tests),
        'average_failure_rate': sum(failure_rates) / len(failure_rates),
        'max_failure_rate': max(failure_rates),
        'min_failure_rate': min(failure_rates),
        'tests': [
            {
                'name': t.name,
                'file_path': str(t.file_path),
                'failure_rate': t.failure_rate,
                'execution_time': t.execution_time
            }
            for t in sorted(fragile_tests, key=lambda x: x.failure_rate, reverse=True)
        ]
    }


def filter_tests_by_fragility(
    test_metrics: Dict[str, TestMetrics],
    threshold: float = 0.05,
    include_fragile: bool = True
) -> Dict[str, TestMetrics]:
    """
    Filter tests based on fragility classification.
    
    Args:
        test_metrics: Dictionary mapping test names to TestMetrics
        threshold: Failure rate threshold (default 5%)
        include_fragile: If True, return fragile tests; if False, return stable tests
        
    Returns:
        Filtered dictionary of test metrics
        
    Requirements: 3.1
    """
    filtered = {}
    
    for test_name, metrics in test_metrics.items():
        is_test_fragile = classify_fragile_test(metrics, threshold)
        
        if include_fragile and is_test_fragile:
            filtered[test_name] = metrics
        elif not include_fragile and not is_test_fragile:
            filtered[test_name] = metrics
    
    return filtered
