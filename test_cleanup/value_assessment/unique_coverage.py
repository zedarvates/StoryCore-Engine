"""
Unique coverage identification for test value assessment.

This module identifies tests that cover code no other test covers,
marking them as valuable for preservation.
"""

from pathlib import Path
from typing import Dict, List, Set


def identify_unique_coverage_tests(
    test_coverage_map: Dict[str, Dict[str, Set[int]]],
    min_unique_lines: int = 1
) -> List[str]:
    """
    Identify tests that cover code no other test covers.
    
    Args:
        test_coverage_map: Dictionary mapping test names to their coverage data
                          (file -> set of line numbers)
        min_unique_lines: Minimum number of unique lines to be considered valuable
        
    Returns:
        List of test names that have unique coverage
        
    Requirements: 5.3
    """
    valuable_tests = []
    
    for test_name in test_coverage_map.keys():
        unique_lines = _calculate_unique_coverage(test_name, test_coverage_map)
        
        if unique_lines >= min_unique_lines:
            valuable_tests.append(test_name)
    
    return valuable_tests


def _calculate_unique_coverage(
    test_name: str,
    test_coverage_map: Dict[str, Dict[str, Set[int]]]
) -> int:
    """
    Calculate the number of unique lines covered only by this test.
    
    Args:
        test_name: Name of the test to analyze
        test_coverage_map: Dictionary mapping test names to their coverage data
        
    Returns:
        Number of lines uniquely covered by this test
    """
    if test_name not in test_coverage_map:
        return 0
    
    test_coverage = test_coverage_map[test_name]
    
    # Get all lines covered by this test
    test_lines = set()
    for file_path, lines in test_coverage.items():
        for line_num in lines:
            test_lines.add(f"{file_path}:{line_num}")
    
    # Get all lines covered by other tests
    other_lines = set()
    for other_test, coverage_data in test_coverage_map.items():
        if other_test != test_name:
            for file_path, lines in coverage_data.items():
                for line_num in lines:
                    other_lines.add(f"{file_path}:{line_num}")
    
    # Calculate unique coverage
    unique_lines = test_lines - other_lines
    
    return len(unique_lines)


def mark_valuable_tests(
    test_coverage_map: Dict[str, Dict[str, Set[int]]],
    min_unique_lines: int = 1
) -> Dict[str, dict]:
    """
    Mark tests with unique coverage as valuable.
    
    Args:
        test_coverage_map: Dictionary mapping test names to their coverage data
        min_unique_lines: Minimum number of unique lines to be considered valuable
        
    Returns:
        Dictionary mapping test names to their value assessment:
        {
            'test_name': {
                'is_valuable': bool,
                'unique_coverage': int,
                'total_coverage': int,
                'unique_percentage': float
            }
        }
        
    Requirements: 5.3
    """
    value_assessment = {}
    
    for test_name in test_coverage_map.keys():
        unique_coverage = _calculate_unique_coverage(test_name, test_coverage_map)
        
        # Calculate total coverage
        total_lines = sum(
            len(lines)
            for lines in test_coverage_map[test_name].values()
        )
        
        unique_percentage = (
            (unique_coverage / total_lines * 100)
            if total_lines > 0 else 0.0
        )
        
        value_assessment[test_name] = {
            'is_valuable': unique_coverage >= min_unique_lines,
            'unique_coverage': unique_coverage,
            'total_coverage': total_lines,
            'unique_percentage': unique_percentage
        }
    
    return value_assessment


def get_tests_with_no_unique_coverage(
    test_coverage_map: Dict[str, Dict[str, Set[int]]]
) -> List[str]:
    """
    Get list of tests with zero unique coverage.
    
    Args:
        test_coverage_map: Dictionary mapping test names to their coverage data
        
    Returns:
        List of test names with no unique coverage
        
    Requirements: 5.4
    """
    tests_without_unique_coverage = []
    
    for test_name in test_coverage_map.keys():
        unique_lines = _calculate_unique_coverage(test_name, test_coverage_map)
        
        if unique_lines == 0:
            tests_without_unique_coverage.append(test_name)
    
    return tests_without_unique_coverage
