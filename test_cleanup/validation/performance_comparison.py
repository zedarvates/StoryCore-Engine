"""
Performance comparison functionality for test suite execution time analysis.

This module provides functions to measure and compare test execution times
before and after cleanup operations.
"""

import time
from pathlib import Path
from typing import Dict, Optional
from test_cleanup.models import PerformanceComparison
from test_cleanup.validation.test_execution import (
    run_pytest_with_coverage,
    run_vitest_with_coverage
)


def measure_execution_time_pytest(test_dir: Path = None) -> float:
    """
    Measure total execution time for pytest test suite.
    
    Args:
        test_dir: Directory containing Python tests
        
    Returns:
        Execution time in seconds
        
    Requirements: 4.4, 6.1, 6.5
    """
    if test_dir is None:
        test_dir = Path('tests')
    
    if not test_dir.exists():
        return 0.0
    
    result = run_pytest_with_coverage(test_dir)
    return result.execution_time


def measure_execution_time_vitest(test_dir: Path = None) -> float:
    """
    Measure total execution time for vitest test suite.
    
    Args:
        test_dir: Directory containing TypeScript tests
        
    Returns:
        Execution time in seconds
        
    Requirements: 4.4, 6.1, 6.5
    """
    if test_dir is None:
        test_dir = Path('creative-studio-ui')
    
    if not test_dir.exists():
        return 0.0
    
    result = run_vitest_with_coverage(test_dir)
    return result.execution_time


def measure_total_execution_time(
    python_test_dir: Path = None,
    typescript_test_dir: Path = None
) -> Dict[str, float]:
    """
    Measure total execution time for all test suites.
    
    Args:
        python_test_dir: Directory containing Python tests
        typescript_test_dir: Directory containing TypeScript tests
        
    Returns:
        Dictionary with 'python', 'typescript', and 'total' execution times
        
    Requirements: 4.4, 6.1, 6.5
    """
    python_time = measure_execution_time_pytest(python_test_dir)
    typescript_time = measure_execution_time_vitest(typescript_test_dir)
    
    return {
        'python': python_time,
        'typescript': typescript_time,
        'total': python_time + typescript_time
    }


def calculate_improvement_percentage(before_time: float, after_time: float) -> float:
    """
    Calculate performance improvement percentage.
    
    Positive percentage means improvement (faster execution).
    Negative percentage means regression (slower execution).
    
    Args:
        before_time: Execution time before cleanup (seconds)
        after_time: Execution time after cleanup (seconds)
        
    Returns:
        Improvement percentage (positive = faster, negative = slower)
        
    Requirements: 4.4, 6.1, 6.5
    """
    if before_time == 0:
        return 0.0
    
    time_saved = before_time - after_time
    improvement = (time_saved / before_time) * 100
    
    return improvement


def compare_performance(
    before_time: float,
    after_time: float
) -> PerformanceComparison:
    """
    Compare performance before and after cleanup.
    
    Args:
        before_time: Total execution time before cleanup (seconds)
        after_time: Total execution time after cleanup (seconds)
        
    Returns:
        PerformanceComparison object with improvement metrics
        
    Requirements: 4.4, 6.1, 6.5
    """
    improvement = calculate_improvement_percentage(before_time, after_time)
    
    return PerformanceComparison(
        before_time=before_time,
        after_time=after_time,
        improvement_percentage=improvement
    )


def generate_performance_report(
    python_before: float,
    python_after: float,
    typescript_before: float,
    typescript_after: float
) -> Dict[str, PerformanceComparison]:
    """
    Generate comprehensive performance comparison report.
    
    Args:
        python_before: Python test execution time before cleanup
        python_after: Python test execution time after cleanup
        typescript_before: TypeScript test execution time before cleanup
        typescript_after: TypeScript test execution time after cleanup
        
    Returns:
        Dictionary with 'python', 'typescript', and 'total' PerformanceComparison objects
        
    Requirements: 4.4, 6.1, 6.5
    """
    total_before = python_before + typescript_before
    total_after = python_after + typescript_after
    
    return {
        'python': compare_performance(python_before, python_after),
        'typescript': compare_performance(typescript_before, typescript_after),
        'total': compare_performance(total_before, total_after)
    }


def meets_performance_target(
    improvement_percentage: float,
    target_percentage: float = 50.0
) -> bool:
    """
    Check if performance improvement meets target.
    
    Args:
        improvement_percentage: Actual improvement percentage
        target_percentage: Target improvement percentage (default: 50%)
        
    Returns:
        True if improvement meets or exceeds target, False otherwise
        
    Requirements: 6.1
    """
    return improvement_percentage >= target_percentage


def format_execution_time(seconds: float) -> str:
    """
    Format execution time in human-readable format.
    
    Args:
        seconds: Execution time in seconds
        
    Returns:
        Formatted string (e.g., "2m 30s" or "45.2s")
    """
    if seconds < 60:
        return f"{seconds:.1f}s"
    
    minutes = int(seconds // 60)
    remaining_seconds = seconds % 60
    
    return f"{minutes}m {remaining_seconds:.1f}s"


def generate_performance_summary(
    performance_report: Dict[str, PerformanceComparison]
) -> str:
    """
    Generate human-readable performance summary.
    
    Args:
        performance_report: Performance comparison report
        
    Returns:
        Formatted summary string
        
    Requirements: 6.5
    """
    lines = []
    lines.append("Performance Comparison Summary")
    lines.append("=" * 50)
    
    for suite_name, comparison in performance_report.items():
        lines.append(f"\n{suite_name.upper()} Test Suite:")
        lines.append(f"  Before: {format_execution_time(comparison.before_time)}")
        lines.append(f"  After:  {format_execution_time(comparison.after_time)}")
        
        if comparison.improvement_percentage > 0:
            lines.append(f"  Improvement: {comparison.improvement_percentage:.1f}% faster")
        elif comparison.improvement_percentage < 0:
            lines.append(f"  Regression: {abs(comparison.improvement_percentage):.1f}% slower")
        else:
            lines.append(f"  No change in execution time")
    
    # Check if total meets 50% target
    if 'total' in performance_report:
        total_improvement = performance_report['total'].improvement_percentage
        lines.append(f"\n{'=' * 50}")
        if meets_performance_target(total_improvement):
            lines.append(f"✓ Target met: {total_improvement:.1f}% improvement (target: 50%)")
        else:
            lines.append(f"✗ Target not met: {total_improvement:.1f}% improvement (target: 50%)")
    
    return "\n".join(lines)
