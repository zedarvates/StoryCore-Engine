#!/usr/bin/env python3
"""
Script to run complete test suite analysis.

This script orchestrates all analysis components to generate a comprehensive
report on the test suite.
"""

import json
import sys
from pathlib import Path
from datetime import datetime

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

from analysis.test_discovery import find_python_test_files, find_typescript_test_files
from analysis.execution_history import (
    parse_pytest_json_report,
    calculate_failure_rate,
    identify_failed_tests_in_period
)
from analysis.duplicate_detection import detect_duplicates_in_files
from analysis.coverage_analysis import parse_python_coverage_report
from analysis.obsolete_detection import identify_obsolete_tests, analyze_test_obsolescence
from analysis.report_generator import generate_analysis_report, export_report_to_json, generate_summary_text
from models import TestMetrics


def run_analysis(test_dir: Path, output_file: Path = None):
    """
    Run complete analysis on test suite.
    
    Args:
        test_dir: Directory containing tests to analyze
        output_file: Optional path to save JSON report
    """
    print(f"Starting analysis of test suite in: {test_dir}")
    print("=" * 80)
    
    # Step 1: Discover tests
    print("\n[1/6] Discovering test files...")
    test_files = find_python_test_files(test_dir)
    print(f"  Found {len(test_files)} Python test files")
    
    # Step 2: Analyze execution history
    print("\n[2/6] Analyzing execution history...")
    
    # Try to find pytest JSON report
    pytest_report = test_dir / ".pytest_cache" / "test-results.json"
    if not pytest_report.exists():
        # Try alternative locations
        pytest_report = test_dir.parent / ".pytest_cache" / "test-results.json"
    
    execution_history = []
    if pytest_report.exists():
        report_data = parse_pytest_json_report(pytest_report)
        if report_data:
            execution_history.append(report_data)
        print(f"  Loaded execution history from {pytest_report}")
    else:
        print(f"  No execution history found (checked {pytest_report})")
    
    # Calculate failure rates for each test
    test_metrics = {}
    for test_file in test_files:
        test_name = test_file.stem
        failure_rate = calculate_failure_rate(test_name, execution_history)
        
        metrics = TestMetrics(
            name=test_name,
            file_path=test_file,
            failure_rate=failure_rate,
            execution_time=0.0,  # Would need actual execution data
            last_modified=datetime.fromtimestamp(test_file.stat().st_mtime) if test_file.exists() else datetime.now(),
            lines_of_code=0  # Would need to count lines
        )
        test_metrics[test_name] = metrics
    
    print(f"  Calculated failure rates for {len(test_metrics)} tests")
    
    # Step 3: Detect duplicates
    print("\n[3/6] Detecting duplicate tests...")
    duplicate_groups = detect_duplicates_in_files(test_files)
    print(f"  Found {len(duplicate_groups)} groups of similar tests")
    
    # Step 4: Analyze coverage
    print("\n[4/6] Analyzing test coverage...")
    
    # Try to find coverage data
    coverage_file = test_dir.parent / "coverage.xml"
    if not coverage_file.exists():
        coverage_file = test_dir / "coverage.xml"
    
    coverage_percentage = 0.0
    if coverage_file.exists():
        coverage_data = parse_python_coverage_report(coverage_file)
        if coverage_data:
            # Calculate rough coverage percentage
            total_lines = sum(len(lines) for lines in coverage_data.values())
            coverage_percentage = min(100.0, total_lines / 10)  # Rough estimate
        print(f"  Loaded coverage data from {coverage_file}")
    else:
        print(f"  No coverage data found (checked {coverage_file})")
    
    # Step 5: Detect obsolete tests
    print("\n[5/6] Detecting obsolete tests...")
    obsolete_analysis = analyze_test_obsolescence(test_files, test_dir.parent)
    obsolete_tests = [
        test_file for test_file, data in obsolete_analysis.items()
        if data['is_obsolete']
    ]
    
    print(f"  Found {len(obsolete_tests)} obsolete tests")
    
    # Step 6: Generate report
    print("\n[6/6] Generating analysis report...")
    
    report = generate_analysis_report(
        test_metrics=test_metrics,
        duplicate_groups=duplicate_groups,
        obsolete_tests=obsolete_tests,
        coverage_percentage=coverage_percentage,
        fragile_threshold=0.05
    )
    
    # Add detailed information to report dict
    report_dict = {
        'analysis_timestamp': datetime.now().isoformat(),
        'test_directory': str(test_dir),
        'total_tests': report.total_tests,
        'obsolete_count': len(report.obsolete_tests),
        'fragile_count': len(report.fragile_tests),
        'duplicate_groups_count': len(report.duplicate_groups),
        'valuable_count': len(report.valuable_tests),
        'total_execution_time': report.total_execution_time,
        'coverage_percentage': report.coverage_percentage,
        'obsolete_tests': report.obsolete_tests,
        'fragile_tests': [
            {
                'name': t.name,
                'file_path': str(t.file_path),
                'failure_rate': t.failure_rate
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
        'obsolete_details': obsolete_analysis
    }
    
    # Print summary
    print("\n" + generate_summary_text(report))
    
    # Save report if output file specified
    if output_file:
        output_file.parent.mkdir(parents=True, exist_ok=True)
        export_report_to_json(report, output_file)
        print(f"\nDetailed report saved to: {output_file}")
    
    return report_dict


def main():
    """Main entry point."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Run complete test suite analysis"
    )
    parser.add_argument(
        "--test-dir",
        type=Path,
        default=Path("tests"),
        help="Directory containing tests (default: tests/)"
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("test_cleanup/analysis_report.json"),
        help="Output file for JSON report"
    )
    
    args = parser.parse_args()
    
    if not args.test_dir.exists():
        print(f"Error: Test directory not found: {args.test_dir}")
        return 1
    
    try:
        run_analysis(args.test_dir, args.output)
        return 0
    except Exception as e:
        print(f"\nError during analysis: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
