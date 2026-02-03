"""
Coverage comparison functionality for before/after cleanup analysis.

This module provides functions to measure and compare code coverage
before and after test suite cleanup operations.
"""

import json
from pathlib import Path
from typing import Dict, List, Optional, Set
from test_cleanup.models import CoverageComparison
from test_cleanup.validation.test_execution import (
    run_pytest_with_coverage,
    run_vitest_with_coverage,
    TestExecutionResult
)


def parse_python_coverage_details(coverage_file: Path = None) -> Dict[str, Set[int]]:
    """
    Parse Python coverage.json file to get detailed line coverage.
    
    Args:
        coverage_file: Path to coverage.json file
        
    Returns:
        Dictionary mapping file paths to sets of covered line numbers
    """
    if coverage_file is None:
        coverage_file = Path('coverage.json')
    
    if not coverage_file.exists():
        return {}
    
    try:
        with open(coverage_file, 'r') as f:
            coverage_data = json.load(f)
        
        file_coverage = {}
        files = coverage_data.get('files', {})
        
        for file_path, file_data in files.items():
            executed_lines = file_data.get('executed_lines', [])
            file_coverage[file_path] = set(executed_lines)
        
        return file_coverage
    except (json.JSONDecodeError, KeyError):
        return {}


def parse_typescript_coverage_details(coverage_dir: Path = None) -> Dict[str, Set[int]]:
    """
    Parse TypeScript coverage-final.json file to get detailed line coverage.
    
    Args:
        coverage_dir: Path to coverage directory
        
    Returns:
        Dictionary mapping file paths to sets of covered line numbers
    """
    if coverage_dir is None:
        coverage_dir = Path('creative-studio-ui/coverage')
    
    coverage_file = coverage_dir / 'coverage-final.json'
    
    if not coverage_file.exists():
        return {}
    
    try:
        with open(coverage_file, 'r') as f:
            coverage_data = json.load(f)
        
        file_coverage = {}
        
        for file_path, file_data in coverage_data.items():
            # Extract covered lines from statement map
            statement_map = file_data.get('s', {})
            covered_lines = set()
            
            for count in statement_map.values():
                if count > 0:
                    # Line is covered if execution count > 0
                    covered_lines.add(count)
            
            if covered_lines:
                file_coverage[file_path] = covered_lines
        
        return file_coverage
    except (json.JSONDecodeError, KeyError):
        return {}


def identify_lost_coverage(
    before_coverage: Dict[str, Set[int]],
    after_coverage: Dict[str, Set[int]]
) -> List[str]:
    """
    Identify code lines that lost coverage after cleanup.
    
    Args:
        before_coverage: Coverage map before cleanup
        after_coverage: Coverage map after cleanup
        
    Returns:
        List of strings describing lost coverage (format: "file:line")
        
    Requirements: 4.3, 6.4, 10.2
    """
    lost_coverage = []
    
    # Check each file that had coverage before
    for file_path, before_lines in before_coverage.items():
        after_lines = after_coverage.get(file_path, set())
        
        # Find lines that were covered before but not after
        lost_lines = before_lines - after_lines
        
        for line_num in sorted(lost_lines):
            lost_coverage.append(f"{file_path}:{line_num}")
    
    return lost_coverage


def measure_coverage_before_cleanup(
    python_test_dir: Path = None,
    typescript_test_dir: Path = None
) -> Dict[str, float]:
    """
    Measure code coverage before cleanup operations.
    
    Args:
        python_test_dir: Directory containing Python tests
        typescript_test_dir: Directory containing TypeScript tests
        
    Returns:
        Dictionary with 'python' and 'typescript' coverage percentages
        
    Requirements: 4.3, 6.4, 10.2
    """
    coverage_results = {}
    
    # Measure Python coverage
    if python_test_dir is None:
        python_test_dir = Path('tests')
    
    if python_test_dir.exists():
        python_result = run_pytest_with_coverage(python_test_dir)
        coverage_results['python'] = python_result.coverage_percentage
    else:
        coverage_results['python'] = 0.0
    
    # Measure TypeScript coverage
    if typescript_test_dir is None:
        typescript_test_dir = Path('creative-studio-ui')
    
    if typescript_test_dir.exists():
        typescript_result = run_vitest_with_coverage(typescript_test_dir)
        coverage_results['typescript'] = typescript_result.coverage_percentage
    else:
        coverage_results['typescript'] = 0.0
    
    return coverage_results


def measure_coverage_after_cleanup(
    python_test_dir: Path = None,
    typescript_test_dir: Path = None
) -> Dict[str, float]:
    """
    Measure code coverage after cleanup operations.
    
    Args:
        python_test_dir: Directory containing Python tests
        typescript_test_dir: Directory containing TypeScript tests
        
    Returns:
        Dictionary with 'python' and 'typescript' coverage percentages
        
    Requirements: 4.3, 6.4, 10.2
    """
    # Same implementation as before cleanup - just a different semantic context
    return measure_coverage_before_cleanup(python_test_dir, typescript_test_dir)


def compare_coverage(
    before_percentage: float,
    after_percentage: float,
    before_details: Dict[str, Set[int]] = None,
    after_details: Dict[str, Set[int]] = None
) -> CoverageComparison:
    """
    Compare coverage before and after cleanup.
    
    Args:
        before_percentage: Coverage percentage before cleanup
        after_percentage: Coverage percentage after cleanup
        before_details: Detailed line coverage before cleanup (optional)
        after_details: Detailed line coverage after cleanup (optional)
        
    Returns:
        CoverageComparison object with delta and lost coverage details
        
    Requirements: 4.3, 6.4, 10.2
    """
    delta = after_percentage - before_percentage
    
    uncovered_lines = []
    if before_details is not None and after_details is not None:
        uncovered_lines = identify_lost_coverage(before_details, after_details)
    
    return CoverageComparison(
        before_percentage=before_percentage,
        after_percentage=after_percentage,
        delta=delta,
        uncovered_lines=uncovered_lines
    )


def generate_coverage_report(
    python_before: float,
    python_after: float,
    typescript_before: float,
    typescript_after: float
) -> Dict[str, CoverageComparison]:
    """
    Generate comprehensive coverage comparison report.
    
    Args:
        python_before: Python coverage before cleanup
        python_after: Python coverage after cleanup
        typescript_before: TypeScript coverage before cleanup
        typescript_after: TypeScript coverage after cleanup
        
    Returns:
        Dictionary with 'python' and 'typescript' CoverageComparison objects
        
    Requirements: 4.3, 6.4, 10.2
    """
    return {
        'python': compare_coverage(python_before, python_after),
        'typescript': compare_coverage(typescript_before, typescript_after)
    }
