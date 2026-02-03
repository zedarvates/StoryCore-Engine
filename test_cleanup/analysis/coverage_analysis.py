"""
Coverage overlap detection and analysis.

This module provides functions to parse coverage reports and identify
code paths tested by multiple tests.
"""

from pathlib import Path
from typing import Dict, List, Set
import json
import xml.etree.ElementTree as ET


def parse_python_coverage_report(coverage_file: Path) -> Dict[str, Set[int]]:
    """
    Parse Python coverage.py XML report.
    
    Args:
        coverage_file: Path to coverage.xml file
        
    Returns:
        Dictionary mapping file paths to sets of covered line numbers
        
    Requirements: 1.4, 5.3
    """
    if not coverage_file.exists():
        return {}
    
    try:
        tree = ET.parse(coverage_file)
        root = tree.getroot()
        
        coverage_data = {}
        
        # Parse coverage XML format
        for package in root.findall('.//package'):
            for class_elem in package.findall('.//class'):
                filename = class_elem.get('filename', '')
                covered_lines = set()
                
                for line in class_elem.findall('.//line'):
                    line_num = int(line.get('number', 0))
                    hits = int(line.get('hits', 0))
                    if hits > 0:
                        covered_lines.add(line_num)
                
                if filename and covered_lines:
                    coverage_data[filename] = covered_lines
        
        return coverage_data
    except (ET.ParseError, ValueError):
        return {}


def parse_typescript_coverage_report(coverage_file: Path) -> Dict[str, Set[int]]:
    """
    Parse TypeScript coverage JSON report (from c8/v8).
    
    Args:
        coverage_file: Path to coverage JSON file
        
    Returns:
        Dictionary mapping file paths to sets of covered line numbers
        
    Requirements: 1.4, 5.3
    """
    if not coverage_file.exists():
        return {}
    
    try:
        with open(coverage_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        coverage_data = {}
        
        # Parse coverage JSON format
        for file_path, file_data in data.items():
            if isinstance(file_data, dict) and 'lines' in file_data:
                covered_lines = set()
                for line_num, hits in file_data['lines'].items():
                    if hits > 0:
                        covered_lines.add(int(line_num))
                
                if covered_lines:
                    coverage_data[file_path] = covered_lines
        
        return coverage_data
    except (json.JSONDecodeError, ValueError, KeyError):
        return {}


def identify_coverage_overlap(
    test_coverage_map: Dict[str, Dict[str, Set[int]]]
) -> Dict[str, List[str]]:
    """
    Identify code paths tested by multiple tests.
    
    Args:
        test_coverage_map: Dictionary mapping test names to their coverage data
                          (file -> set of line numbers)
        
    Returns:
        Dictionary mapping code locations to lists of tests that cover them
        
    Requirements: 1.4
    """
    # Build reverse mapping: (file, line) -> list of tests
    line_to_tests = {}
    
    for test_name, coverage_data in test_coverage_map.items():
        for file_path, lines in coverage_data.items():
            for line_num in lines:
                key = f"{file_path}:{line_num}"
                if key not in line_to_tests:
                    line_to_tests[key] = []
                line_to_tests[key].append(test_name)
    
    # Filter to only overlapping coverage (covered by multiple tests)
    overlapping = {
        location: tests
        for location, tests in line_to_tests.items()
        if len(tests) > 1
    }
    
    return overlapping


def calculate_unique_coverage(
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
        
    Requirements: 5.3
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


def analyze_coverage_overlap(
    test_coverage_map: Dict[str, Dict[str, Set[int]]]
) -> Dict[str, dict]:
    """
    Analyze coverage overlap for all tests.
    
    Args:
        test_coverage_map: Dictionary mapping test names to their coverage data
        
    Returns:
        Dictionary with analysis results including overlap and unique coverage
        
    Requirements: 1.4, 5.3
    """
    overlap = identify_coverage_overlap(test_coverage_map)
    
    results = {}
    
    for test_name in test_coverage_map.keys():
        unique_coverage = calculate_unique_coverage(test_name, test_coverage_map)
        
        # Calculate total coverage
        total_lines = sum(
            len(lines)
            for lines in test_coverage_map[test_name].values()
        )
        
        results[test_name] = {
            'total_coverage': total_lines,
            'unique_coverage': unique_coverage,
            'overlap_percentage': (
                ((total_lines - unique_coverage) / total_lines * 100)
                if total_lines > 0 else 0.0
            )
        }
    
    return results
