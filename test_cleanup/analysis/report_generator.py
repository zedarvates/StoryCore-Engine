"""
Analysis report generator.

This module provides functions to generate comprehensive analysis reports
categorizing tests as obsolete, fragile, duplicate, or valuable.
"""

from pathlib import Path
from typing import List, Dict
import json
from datetime import datetime
from test_cleanup.models import AnalysisReport, TestMetrics, TestGroup


def categorize_tests(
    test_metrics: Dict[str, TestMetrics],
    duplicate_groups: List[TestGroup],
    obsolete_tests: List[str],
    fragile_threshold: float = 0.05
) -> dict:
    """
    Categorize tests into obsolete, fragile, duplicate, or valuable.
    
    Args:
        test_metrics: Dictionary mapping test names to TestMetrics
        duplicate_groups: List of TestGroup objects with duplicate tests
        obsolete_tests: List of obsolete test names
        fragile_threshold: Failure rate threshold for fragile tests
        
    Returns:
        Dictionary with categorized test lists
        
    Requirements: 1.5
    """
    # Collect all duplicate test names
    duplicate_test_names = set()
    for group in duplicate_groups:
        duplicate_test_names.update(group.tests)
    
    # Categorize tests
    fragile_tests = []
    valuable_tests = []
    
    for test_name, metrics in test_metrics.items():
        if test_name in obsolete_tests:
            continue  # Already categorized as obsolete
        elif test_name in duplicate_test_names:
            continue  # Already categorized as duplicate
        elif metrics.failure_rate >= fragile_threshold:
            fragile_tests.append(metrics)
        else:
            valuable_tests.append(metrics)
    
    return {
        'obsolete': obsolete_tests,
        'fragile': fragile_tests,
        'duplicate_groups': duplicate_groups,
        'valuable': [m.name for m in valuable_tests]
    }


def calculate_metrics(
    test_metrics: Dict[str, TestMetrics],
    categorized_tests: dict
) -> dict:
    """
    Calculate overall metrics for the test suite.
    
    Args:
        test_metrics: Dictionary mapping test names to TestMetrics
        categorized_tests: Dictionary with categorized tests
        
    Returns:
        Dictionary with calculated metrics
        
    Requirements: 1.5
    """
    total_tests = len(test_metrics)
    total_execution_time = sum(m.execution_time for m in test_metrics.values())
    
    # Count tests in each category
    obsolete_count = len(categorized_tests['obsolete'])
    fragile_count = len(categorized_tests['fragile'])
    duplicate_count = sum(len(g.tests) for g in categorized_tests['duplicate_groups'])
    valuable_count = len(categorized_tests['valuable'])
    
    return {
        'total_tests': total_tests,
        'total_execution_time': total_execution_time,
        'obsolete_count': obsolete_count,
        'fragile_count': fragile_count,
        'duplicate_count': duplicate_count,
        'valuable_count': valuable_count,
        'obsolete_percentage': (obsolete_count / total_tests * 100) if total_tests > 0 else 0.0,
        'fragile_percentage': (fragile_count / total_tests * 100) if total_tests > 0 else 0.0,
        'duplicate_percentage': (duplicate_count / total_tests * 100) if total_tests > 0 else 0.0,
        'valuable_percentage': (valuable_count / total_tests * 100) if total_tests > 0 else 0.0
    }


def generate_analysis_report(
    test_metrics: Dict[str, TestMetrics],
    duplicate_groups: List[TestGroup],
    obsolete_tests: List[str],
    coverage_percentage: float = 0.0,
    fragile_threshold: float = 0.05
) -> AnalysisReport:
    """
    Generate a comprehensive analysis report.
    
    Args:
        test_metrics: Dictionary mapping test names to TestMetrics
        duplicate_groups: List of TestGroup objects with duplicate tests
        obsolete_tests: List of obsolete test names
        coverage_percentage: Overall code coverage percentage
        fragile_threshold: Failure rate threshold for fragile tests
        
    Returns:
        AnalysisReport object with all categorizations and metrics
        
    Requirements: 1.5
    """
    # Categorize tests
    categorized = categorize_tests(
        test_metrics,
        duplicate_groups,
        obsolete_tests,
        fragile_threshold
    )
    
    # Calculate metrics
    metrics = calculate_metrics(test_metrics, categorized)
    
    # Create AnalysisReport
    report = AnalysisReport(
        total_tests=metrics['total_tests'],
        obsolete_tests=categorized['obsolete'],
        fragile_tests=categorized['fragile'],
        duplicate_groups=categorized['duplicate_groups'],
        valuable_tests=categorized['valuable'],
        total_execution_time=metrics['total_execution_time'],
        coverage_percentage=coverage_percentage
    )
    
    return report


def export_report_to_json(report: AnalysisReport, output_path: Path) -> None:
    """
    Export analysis report to JSON file.
    
    Args:
        report: AnalysisReport object to export
        output_path: Path where JSON file should be saved
        
    Requirements: 1.5
    """
    report_dict = {
        'generated_at': datetime.now().isoformat(),
        'total_tests': report.total_tests,
        'obsolete_tests': report.obsolete_tests,
        'fragile_tests': [
            {
                'name': t.name,
                'file_path': str(t.file_path),
                'failure_rate': t.failure_rate,
                'execution_time': t.execution_time
            }
            for t in report.fragile_tests
        ],
        'duplicate_groups': [
            {
                'tests': g.tests,
                'similarity_score': g.similarity_score,
                'shared_assertions': g.shared_assertions
            }
            for g in report.duplicate_groups
        ],
        'valuable_tests': report.valuable_tests,
        'total_execution_time': report.total_execution_time,
        'coverage_percentage': report.coverage_percentage,
        'summary': {
            'obsolete_count': len(report.obsolete_tests),
            'fragile_count': len(report.fragile_tests),
            'duplicate_count': sum(len(g.tests) for g in report.duplicate_groups),
            'valuable_count': len(report.valuable_tests)
        }
    }
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report_dict, f, indent=2)


def generate_summary_text(report: AnalysisReport) -> str:
    """
    Generate a human-readable summary of the analysis report.
    
    Args:
        report: AnalysisReport object
        
    Returns:
        Formatted summary string
        
    Requirements: 1.5
    """
    summary = []
    summary.append("=" * 60)
    summary.append("TEST SUITE ANALYSIS REPORT")
    summary.append("=" * 60)
    summary.append(f"\nTotal Tests: {report.total_tests}")
    summary.append(f"Total Execution Time: {report.total_execution_time:.2f}s")
    summary.append(f"Code Coverage: {report.coverage_percentage:.2f}%")
    summary.append("\n" + "-" * 60)
    summary.append("TEST CATEGORIZATION")
    summary.append("-" * 60)
    
    obsolete_pct = (len(report.obsolete_tests) / report.total_tests * 100) if report.total_tests > 0 else 0
    summary.append(f"\nObsolete Tests: {len(report.obsolete_tests)} ({obsolete_pct:.1f}%)")
    
    fragile_pct = (len(report.fragile_tests) / report.total_tests * 100) if report.total_tests > 0 else 0
    summary.append(f"Fragile Tests: {len(report.fragile_tests)} ({fragile_pct:.1f}%)")
    
    duplicate_count = sum(len(g.tests) for g in report.duplicate_groups)
    duplicate_pct = (duplicate_count / report.total_tests * 100) if report.total_tests > 0 else 0
    summary.append(f"Duplicate Tests: {duplicate_count} ({duplicate_pct:.1f}%)")
    
    valuable_pct = (len(report.valuable_tests) / report.total_tests * 100) if report.total_tests > 0 else 0
    summary.append(f"Valuable Tests: {len(report.valuable_tests)} ({valuable_pct:.1f}%)")
    
    summary.append("\n" + "=" * 60)
    
    return "\n".join(summary)
