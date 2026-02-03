"""
Value-based removal recommendations.

This module identifies tests with zero unique coverage and no requirement
linkage, recommending them for removal.
"""

from pathlib import Path
from typing import Dict, List, Set


def recommend_tests_for_removal(
    test_coverage_map: Dict[str, Dict[str, Set[int]]],
    requirement_linked_tests: Set[str]
) -> List[Dict[str, any]]:
    """
    Recommend tests for removal based on value assessment.
    
    Tests are recommended for removal if they have:
    - Zero unique coverage (all their coverage is redundant)
    - No requirement linkage (not explicitly tied to requirements)
    
    Args:
        test_coverage_map: Dictionary mapping test names to their coverage data
        requirement_linked_tests: Set of test names that are linked to requirements
        
    Returns:
        List of dictionaries with removal recommendations:
        [
            {
                'test_name': str,
                'reason': str,
                'unique_coverage': int,
                'total_coverage': int,
                'has_requirement_link': bool
            }
        ]
        
    Requirements: 5.4
    """
    recommendations = []
    
    for test_name in test_coverage_map.keys():
        unique_coverage = _calculate_unique_coverage(test_name, test_coverage_map)
        has_requirement_link = test_name in requirement_linked_tests
        
        # Recommend removal if no unique coverage and no requirement link
        if unique_coverage == 0 and not has_requirement_link:
            total_coverage = sum(
                len(lines)
                for lines in test_coverage_map[test_name].values()
            )
            
            recommendations.append({
                'test_name': test_name,
                'reason': 'No unique coverage and no requirement linkage',
                'unique_coverage': 0,
                'total_coverage': total_coverage,
                'has_requirement_link': False
            })
    
    return recommendations


def identify_low_value_tests(
    test_coverage_map: Dict[str, Dict[str, Set[int]]],
    requirement_linked_tests: Set[str],
    unique_coverage_threshold: int = 0
) -> Dict[str, dict]:
    """
    Identify tests with low value based on coverage and requirement linkage.
    
    Args:
        test_coverage_map: Dictionary mapping test names to their coverage data
        requirement_linked_tests: Set of test names linked to requirements
        unique_coverage_threshold: Minimum unique coverage to be considered valuable
        
    Returns:
        Dictionary mapping test names to their value assessment:
        {
            'test_name': {
                'unique_coverage': int,
                'total_coverage': int,
                'has_requirement_link': bool,
                'recommendation': 'remove' | 'review' | 'keep'
            }
        }
        
    Requirements: 5.4
    """
    value_assessment = {}
    
    for test_name in test_coverage_map.keys():
        unique_coverage = _calculate_unique_coverage(test_name, test_coverage_map)
        has_requirement_link = test_name in requirement_linked_tests
        
        total_coverage = sum(
            len(lines)
            for lines in test_coverage_map[test_name].values()
        )
        
        # Determine recommendation
        if unique_coverage <= unique_coverage_threshold and not has_requirement_link:
            recommendation = 'remove'
        elif unique_coverage <= unique_coverage_threshold and has_requirement_link:
            recommendation = 'review'  # Has requirement link, needs manual review
        else:
            recommendation = 'keep'
        
        value_assessment[test_name] = {
            'unique_coverage': unique_coverage,
            'total_coverage': total_coverage,
            'has_requirement_link': has_requirement_link,
            'recommendation': recommendation
        }
    
    return value_assessment


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


def generate_removal_report(
    recommendations: List[Dict[str, any]]
) -> str:
    """
    Generate a human-readable report of removal recommendations.
    
    Args:
        recommendations: List of removal recommendations
        
    Returns:
        Formatted report string
        
    Requirements: 5.4
    """
    if not recommendations:
        return "No tests recommended for removal."
    
    report_lines = [
        "Test Removal Recommendations",
        "=" * 50,
        f"\nTotal tests recommended for removal: {len(recommendations)}\n"
    ]
    
    for rec in recommendations:
        report_lines.extend([
            f"\nTest: {rec['test_name']}",
            f"  Reason: {rec['reason']}",
            f"  Unique Coverage: {rec['unique_coverage']} lines",
            f"  Total Coverage: {rec['total_coverage']} lines",
            f"  Requirement Link: {rec['has_requirement_link']}"
        ])
    
    return "\n".join(report_lines)
