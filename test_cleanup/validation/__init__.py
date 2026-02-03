"""
Validation engine for test suite cleanup.

This module provides functionality for validating test suite cleanup operations,
including test execution, coverage comparison, performance analysis, and
flakiness detection.
"""

from test_cleanup.validation.test_execution import (
    run_pytest_with_coverage,
    run_vitest_with_coverage,
    execute_all_tests,
    TestExecutionResult
)

from test_cleanup.validation.coverage_comparison import (
    compare_coverage,
    generate_coverage_report,
    identify_lost_coverage,
    measure_coverage_before_cleanup,
    measure_coverage_after_cleanup
)

from test_cleanup.validation.performance_comparison import (
    compare_performance,
    generate_performance_report,
    calculate_improvement_percentage,
    meets_performance_target,
    generate_performance_summary
)

from test_cleanup.validation.flakiness_detection import (
    detect_flaky_tests,
    analyze_flakiness,
    get_flaky_test_names,
    FlakinessResult,
    FlakinessReport
)

from test_cleanup.validation.validation_report import (
    create_validation_report,
    generate_validation_report,
    format_validation_report,
    save_validation_report
)

__all__ = [
    # Test execution
    'run_pytest_with_coverage',
    'run_vitest_with_coverage',
    'execute_all_tests',
    'TestExecutionResult',
    
    # Coverage comparison
    'compare_coverage',
    'generate_coverage_report',
    'identify_lost_coverage',
    'measure_coverage_before_cleanup',
    'measure_coverage_after_cleanup',
    
    # Performance comparison
    'compare_performance',
    'generate_performance_report',
    'calculate_improvement_percentage',
    'meets_performance_target',
    'generate_performance_summary',
    
    # Flakiness detection
    'detect_flaky_tests',
    'analyze_flakiness',
    'get_flaky_test_names',
    'FlakinessResult',
    'FlakinessReport',
    
    # Validation reports
    'create_validation_report',
    'generate_validation_report',
    'format_validation_report',
    'save_validation_report',
]
