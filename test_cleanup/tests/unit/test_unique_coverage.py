"""
Unit tests for unique coverage identification.
"""

import pytest
from test_cleanup.value_assessment.unique_coverage import (
    identify_unique_coverage_tests,
    mark_valuable_tests,
    get_tests_with_no_unique_coverage,
)


def test_identify_unique_coverage_tests_with_unique_coverage():
    """Test identifying tests with unique coverage."""
    test_coverage_map = {
        'test_a': {
            'file1.py': {1, 2, 3},
            'file2.py': {10, 11}
        },
        'test_b': {
            'file1.py': {1, 2},  # Overlaps with test_a
            'file3.py': {20, 21}  # Unique to test_b
        },
        'test_c': {
            'file1.py': {1, 2, 3},  # Complete overlap with test_a
        }
    }
    
    valuable_tests = identify_unique_coverage_tests(test_coverage_map)
    
    # test_a has unique coverage (line 3 in file1.py, lines 10-11 in file2.py)
    # test_b has unique coverage (lines 20-21 in file3.py)
    # test_c has no unique coverage
    assert 'test_a' in valuable_tests
    assert 'test_b' in valuable_tests
    assert 'test_c' not in valuable_tests


def test_identify_unique_coverage_tests_with_min_threshold():
    """Test identifying tests with minimum unique coverage threshold."""
    test_coverage_map = {
        'test_a': {
            'file1.py': {1, 2, 3, 4, 5}
        },
        'test_b': {
            'file1.py': {1, 2, 3, 4}  # Only line 5 is unique to test_a
        }
    }
    
    # With min_unique_lines=1, test_a should be valuable
    valuable_tests = identify_unique_coverage_tests(test_coverage_map, min_unique_lines=1)
    assert 'test_a' in valuable_tests
    
    # With min_unique_lines=2, test_a should not be valuable
    valuable_tests = identify_unique_coverage_tests(test_coverage_map, min_unique_lines=2)
    assert 'test_a' not in valuable_tests


def test_identify_unique_coverage_tests_empty_map():
    """Test with empty coverage map."""
    valuable_tests = identify_unique_coverage_tests({})
    assert valuable_tests == []


def test_mark_valuable_tests_complete_assessment():
    """Test marking valuable tests with complete assessment."""
    test_coverage_map = {
        'test_a': {
            'file1.py': {1, 2, 3, 4, 5}
        },
        'test_b': {
            'file1.py': {1, 2, 3}  # Lines 4-5 unique to test_a
        }
    }
    
    assessment = mark_valuable_tests(test_coverage_map)
    
    # test_a should be valuable with 2 unique lines out of 5 total
    assert assessment['test_a']['is_valuable'] is True
    assert assessment['test_a']['unique_coverage'] == 2
    assert assessment['test_a']['total_coverage'] == 5
    assert assessment['test_a']['unique_percentage'] == 40.0
    
    # test_b should not be valuable (0 unique lines)
    assert assessment['test_b']['is_valuable'] is False
    assert assessment['test_b']['unique_coverage'] == 0
    assert assessment['test_b']['total_coverage'] == 3


def test_mark_valuable_tests_all_unique():
    """Test marking tests where all coverage is unique."""
    test_coverage_map = {
        'test_a': {
            'file1.py': {1, 2, 3}
        },
        'test_b': {
            'file2.py': {10, 11, 12}
        }
    }
    
    assessment = mark_valuable_tests(test_coverage_map)
    
    # Both tests should be valuable with 100% unique coverage
    assert assessment['test_a']['is_valuable'] is True
    assert assessment['test_a']['unique_percentage'] == 100.0
    
    assert assessment['test_b']['is_valuable'] is True
    assert assessment['test_b']['unique_percentage'] == 100.0


def test_get_tests_with_no_unique_coverage():
    """Test getting tests with zero unique coverage."""
    test_coverage_map = {
        'test_a': {
            'file1.py': {1, 2, 3, 4, 5}
        },
        'test_b': {
            'file1.py': {1, 2, 3}  # Subset of test_a
        },
        'test_c': {
            'file1.py': {1, 2}  # Subset of test_a
        },
        'test_d': {
            'file2.py': {10}  # Unique coverage
        }
    }
    
    tests_without_unique = get_tests_with_no_unique_coverage(test_coverage_map)
    
    # test_b and test_c have no unique coverage
    assert 'test_b' in tests_without_unique
    assert 'test_c' in tests_without_unique
    
    # test_a and test_d have unique coverage
    assert 'test_a' not in tests_without_unique
    assert 'test_d' not in tests_without_unique


def test_mark_valuable_tests_with_multiple_files():
    """Test marking valuable tests across multiple files."""
    test_coverage_map = {
        'test_a': {
            'file1.py': {1, 2, 3},
            'file2.py': {10, 11},
            'file3.py': {20}
        },
        'test_b': {
            'file1.py': {1, 2, 3},
            'file2.py': {10, 11}
            # file3.py line 20 is unique to test_a
        }
    }
    
    assessment = mark_valuable_tests(test_coverage_map)
    
    # test_a has 1 unique line (file3.py:20) out of 6 total
    assert assessment['test_a']['is_valuable'] is True
    assert assessment['test_a']['unique_coverage'] == 1
    assert assessment['test_a']['total_coverage'] == 6
    
    # test_b has no unique coverage
    assert assessment['test_b']['is_valuable'] is False
    assert assessment['test_b']['unique_coverage'] == 0
