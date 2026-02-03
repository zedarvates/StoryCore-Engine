"""
Validation report generation for test suite cleanup.

This module provides functions to generate comprehensive validation reports
that include test execution results, coverage comparison, performance metrics,
and flakiness detection.
"""

import json
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional
from test_cleanup.models import (
    ValidationReport,
    CoverageComparison,
    PerformanceComparison
)
from test_cleanup.validation.test_execution import execute_all_tests
from test_cleanup.validation.coverage_comparison import (
    compare_coverage,
    generate_coverage_report
)
from test_cleanup.validation.performance_comparison import (
    compare_performance,
    generate_performance_report,
    generate_performance_summary
)
from test_cleanup.validation.flakiness_detection import (
    detect_flaky_tests,
    get_flaky_test_names
)


def create_validation_report(
    all_tests_passing: bool,
    coverage_comparison: CoverageComparison,
    performance_comparison: PerformanceComparison,
    flaky_tests: List[str],
    total_tests: int
) -> ValidationReport:
    """
    Create a validation report from individual components.
    
    Args:
        all_tests_passing: Whether all tests passed
        coverage_comparison: Coverage before/after comparison
        performance_comparison: Performance before/after comparison
        flaky_tests: List of flaky test names
        total_tests: Total number of tests
        
    Returns:
        ValidationReport object
        
    Requirements: 10.4
    """
    return ValidationReport(
        all_tests_passing=all_tests_passing,
        coverage=coverage_comparison,
        performance=performance_comparison,
        flaky_tests=flaky_tests,
        total_tests=total_tests
    )


def generate_validation_report(
    python_test_dir: Path = None,
    typescript_test_dir: Path = None,
    python_coverage_before: float = None,
    python_coverage_after: float = None,
    typescript_coverage_before: float = None,
    typescript_coverage_after: float = None,
    python_time_before: float = None,
    python_time_after: float = None,
    typescript_time_before: float = None,
    typescript_time_after: float = None,
    check_flakiness: bool = False,
    flakiness_iterations: int = 100
) -> Dict[str, ValidationReport]:
    """
    Generate comprehensive validation report for test suite cleanup.
    
    Args:
        python_test_dir: Directory containing Python tests
        typescript_test_dir: Directory containing TypeScript tests
        python_coverage_before: Python coverage before cleanup
        python_coverage_after: Python coverage after cleanup
        typescript_coverage_before: TypeScript coverage before cleanup
        typescript_coverage_after: TypeScript coverage after cleanup
        python_time_before: Python execution time before cleanup
        python_time_after: Python execution time after cleanup
        typescript_time_before: TypeScript execution time before cleanup
        typescript_time_after: TypeScript execution time after cleanup
        check_flakiness: Whether to run flakiness detection
        flakiness_iterations: Number of iterations for flakiness detection
        
    Returns:
        Dictionary with 'python' and 'typescript' ValidationReport objects
        
    Requirements: 10.4
    """
    reports = {}
    
    # Execute tests to get current state
    test_results = execute_all_tests(python_test_dir, typescript_test_dir)
    
    # Python validation report
    if 'python' in test_results:
        python_result = test_results['python']
        
        # Use provided coverage or measure current
        if python_coverage_before is None:
            python_coverage_before = python_result.coverage_percentage
        if python_coverage_after is None:
            python_coverage_after = python_result.coverage_percentage
        
        # Use provided timing or measure current
        if python_time_before is None:
            python_time_before = python_result.execution_time
        if python_time_after is None:
            python_time_after = python_result.execution_time
        
        # Create coverage comparison
        coverage_comp = compare_coverage(python_coverage_before, python_coverage_after)
        
        # Create performance comparison
        perf_comp = compare_performance(python_time_before, python_time_after)
        
        # Check for flaky tests if requested
        flaky_tests = []
        if check_flakiness and python_test_dir:
            flakiness_report = detect_flaky_tests(
                python_test_dir,
                framework='pytest',
                iterations=flakiness_iterations
            )
            flaky_tests = get_flaky_test_names(flakiness_report)
        
        reports['python'] = create_validation_report(
            all_tests_passing=python_result.success,
            coverage_comparison=coverage_comp,
            performance_comparison=perf_comp,
            flaky_tests=flaky_tests,
            total_tests=python_result.total_tests
        )
    
    # TypeScript validation report
    if 'typescript' in test_results:
        typescript_result = test_results['typescript']
        
        # Use provided coverage or measure current
        if typescript_coverage_before is None:
            typescript_coverage_before = typescript_result.coverage_percentage
        if typescript_coverage_after is None:
            typescript_coverage_after = typescript_result.coverage_percentage
        
        # Use provided timing or measure current
        if typescript_time_before is None:
            typescript_time_before = typescript_result.execution_time
        if typescript_time_after is None:
            typescript_time_after = typescript_result.execution_time
        
        # Create coverage comparison
        coverage_comp = compare_coverage(typescript_coverage_before, typescript_coverage_after)
        
        # Create performance comparison
        perf_comp = compare_performance(typescript_time_before, typescript_time_after)
        
        # Check for flaky tests if requested
        flaky_tests = []
        if check_flakiness and typescript_test_dir:
            flakiness_report = detect_flaky_tests(
                typescript_test_dir,
                framework='vitest',
                iterations=flakiness_iterations
            )
            flaky_tests = get_flaky_test_names(flakiness_report)
        
        reports['typescript'] = create_validation_report(
            all_tests_passing=typescript_result.success,
            coverage_comparison=coverage_comp,
            performance_comparison=perf_comp,
            flaky_tests=flaky_tests,
            total_tests=typescript_result.total_tests
        )
    
    return reports


def format_validation_report(
    validation_reports: Dict[str, ValidationReport],
    include_details: bool = True
) -> str:
    """
    Format validation report as human-readable text.
    
    Args:
        validation_reports: Dictionary of validation reports
        include_details: Whether to include detailed failure information
        
    Returns:
        Formatted report string
        
    Requirements: 10.4
    """
    lines = []
    lines.append("=" * 70)
    lines.append("TEST SUITE VALIDATION REPORT")
    lines.append("=" * 70)
    lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append("")
    
    for suite_name, report in validation_reports.items():
        lines.append(f"\n{suite_name.upper()} TEST SUITE")
        lines.append("-" * 70)
        
        # Test execution status
        status_symbol = "✓" if report.all_tests_passing else "✗"
        lines.append(f"\nTest Execution: {status_symbol}")
        lines.append(f"  Total Tests: {report.total_tests}")
        lines.append(f"  Status: {'PASSING' if report.all_tests_passing else 'FAILING'}")
        
        # Coverage metrics
        lines.append(f"\nCode Coverage:")
        lines.append(f"  Before: {report.coverage.before_percentage:.2f}%")
        lines.append(f"  After:  {report.coverage.after_percentage:.2f}%")
        
        delta_symbol = "+" if report.coverage.delta >= 0 else ""
        lines.append(f"  Delta:  {delta_symbol}{report.coverage.delta:.2f}%")
        
        if report.coverage.uncovered_lines and include_details:
            lines.append(f"  Lost Coverage: {len(report.coverage.uncovered_lines)} lines")
            if len(report.coverage.uncovered_lines) <= 10:
                for line in report.coverage.uncovered_lines[:10]:
                    lines.append(f"    - {line}")
            else:
                for line in report.coverage.uncovered_lines[:5]:
                    lines.append(f"    - {line}")
                lines.append(f"    ... and {len(report.coverage.uncovered_lines) - 5} more")
        
        # Performance metrics
        lines.append(f"\nPerformance:")
        lines.append(f"  Before: {report.performance.before_time:.2f}s")
        lines.append(f"  After:  {report.performance.after_time:.2f}s")
        
        improvement = report.performance.improvement_percentage
        if improvement > 0:
            lines.append(f"  Improvement: {improvement:.1f}% faster")
        elif improvement < 0:
            lines.append(f"  Regression: {abs(improvement):.1f}% slower")
        else:
            lines.append(f"  No change")
        
        # Flakiness
        lines.append(f"\nFlakiness:")
        if report.flaky_tests:
            lines.append(f"  Flaky Tests Found: {len(report.flaky_tests)}")
            if include_details:
                for test_name in report.flaky_tests[:5]:
                    lines.append(f"    - {test_name}")
                if len(report.flaky_tests) > 5:
                    lines.append(f"    ... and {len(report.flaky_tests) - 5} more")
        else:
            lines.append(f"  No flaky tests detected")
    
    # Overall summary
    lines.append(f"\n{'=' * 70}")
    lines.append("OVERALL VALIDATION SUMMARY")
    lines.append("=" * 70)
    
    all_passing = all(r.all_tests_passing for r in validation_reports.values())
    coverage_maintained = all(r.coverage.delta >= 0 for r in validation_reports.values())
    no_flaky_tests = all(len(r.flaky_tests) == 0 for r in validation_reports.values())
    
    lines.append(f"\n✓ All tests passing: {'YES' if all_passing else 'NO'}")
    lines.append(f"✓ Coverage maintained: {'YES' if coverage_maintained else 'NO'}")
    lines.append(f"✓ No flaky tests: {'YES' if no_flaky_tests else 'NO'}")
    
    validation_passed = all_passing and coverage_maintained and no_flaky_tests
    lines.append(f"\nValidation Result: {'PASSED ✓' if validation_passed else 'FAILED ✗'}")
    
    return "\n".join(lines)


def save_validation_report(
    validation_reports: Dict[str, ValidationReport],
    output_path: Path = None
) -> Path:
    """
    Save validation report to JSON file.
    
    Args:
        validation_reports: Dictionary of validation reports
        output_path: Path to save report (default: validation_report.json)
        
    Returns:
        Path to saved report file
        
    Requirements: 10.4
    """
    if output_path is None:
        output_path = Path('validation_report.json')
    
    # Convert to JSON-serializable format
    report_data = {
        'generated_at': datetime.now().isoformat(),
        'suites': {}
    }
    
    for suite_name, report in validation_reports.items():
        report_data['suites'][suite_name] = {
            'all_tests_passing': report.all_tests_passing,
            'total_tests': report.total_tests,
            'coverage': {
                'before_percentage': report.coverage.before_percentage,
                'after_percentage': report.coverage.after_percentage,
                'delta': report.coverage.delta,
                'uncovered_lines': report.coverage.uncovered_lines
            },
            'performance': {
                'before_time': report.performance.before_time,
                'after_time': report.performance.after_time,
                'improvement_percentage': report.performance.improvement_percentage
            },
            'flaky_tests': report.flaky_tests
        }
    
    with open(output_path, 'w') as f:
        json.dump(report_data, f, indent=2)
    
    return output_path
