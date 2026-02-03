"""
Unit tests for value-based removal recommendations.
"""

import pytest
from test_cleanup.value_assessment.removal_recommendations import (
    recommend_tests_for_removal,
    identify_low_value_tests,
    generate_removal_report,
)


def test_recommend_tests_for_removal_with_no_unique_coverage():
    """Test recommending tests with zero unique coverage and no requirement link."""
    test_coverage_map = {
        'test_a': {
            'file1.py': {1, 2, 3, 4, 5}
        },
        'test_b': {
            'file1.py': {1, 2, 3}  # Subset of test_a, no unique coverage
        },
        'test_c': {
            'file1.py': {1, 2}  # Subset of test_a, no unique coverage
        }
    }
    requirement_linked_tests = set()  # No tests linked to requirements
    
    recommendations = recommend_tests_for_removal(test_coverage_map, requirement_linked_tests)
    
    # test_b and test_c should be recommended for removal
    test_names = [rec['test_name'] for rec in recommendations]
    assert 'test_b' in test_names
    assert 'test_c' in test_names
    assert 'test_a' not in test_names  # Has unique coverage


def test_recommend_tests_for_removal_preserves_requirement_linked():
    """Test that requirement-linked tests are not recommended for removal."""
    test_coverage_map = {
        'test_a': {
            'file1.py': {1, 2, 3, 4, 5}
        },
        'test_b': {
            'file1.py': {1, 2, 3}  # No unique coverage
        },
        'test_c': {
            'file1.py': {1, 2}  # No unique coverage but linked to requirement
        }
    }
    requirement_linked_tests = {'test_c'}  # test_c is linked to a requirement
    
    recommendations = recommend_tests_for_removal(test_coverage_map, requirement_linked_tests)
    
    # Only test_b should be recommended for removal
    test_names = [rec['test_name'] for rec in recommendations]
    assert 'test_b' in test_names
    assert 'test_c' not in test_names  # Protected by requirement link
    assert 'test_a' not in test_names  # Has unique coverage


def test_recommend_tests_for_removal_empty_map():
    """Test with empty coverage map."""
    recommendations = recommend_tests_for_removal({}, set())
    assert recommendations == []


def test_recommend_tests_for_removal_all_unique():
    """Test when all tests have unique coverage."""
    test_coverage_map = {
        'test_a': {
            'file1.py': {1, 2, 3}
        },
        'test_b': {
            'file2.py': {10, 11, 12}
        }
    }
    requirement_linked_tests = set()
    
    recommendations = recommend_tests_for_removal(test_coverage_map, requirement_linked_tests)
    
    # No tests should be recommended for removal
    assert recommendations == []


def test_recommend_tests_for_removal_includes_metadata():
    """Test that recommendations include complete metadata."""
    test_coverage_map = {
        'test_a': {
            'file1.py': {1, 2, 3, 4, 5}
        },
        'test_b': {
            'file1.py': {1, 2, 3}  # No unique coverage
        }
    }
    requirement_linked_tests = set()
    
    recommendations = recommend_tests_for_removal(test_coverage_map, requirement_linked_tests)
    
    assert len(recommendations) == 1
    rec = recommendations[0]
    
    assert rec['test_name'] == 'test_b'
    assert rec['unique_coverage'] == 0
    assert rec['total_coverage'] == 3
    assert rec['has_requirement_link'] is False
    assert 'No unique coverage' in rec['reason']


def test_identify_low_value_tests_categorization():
    """Test categorization of tests by value."""
    test_coverage_map = {
        'test_a': {
            'file1.py': {1, 2, 3, 4, 5}
        },
        'test_b': {
            'file1.py': {1, 2, 3}  # No unique coverage, no requirement
        },
        'test_c': {
            'file1.py': {1, 2}  # No unique coverage, has requirement
        },
        'test_d': {
            'file2.py': {10}  # Has unique coverage
        }
    }
    requirement_linked_tests = {'test_c'}
    
    assessment = identify_low_value_tests(test_coverage_map, requirement_linked_tests)
    
    # test_a has unique coverage -> keep
    assert assessment['test_a']['recommendation'] == 'keep'
    
    # test_b has no unique coverage and no requirement -> remove
    assert assessment['test_b']['recommendation'] == 'remove'
    
    # test_c has no unique coverage but has requirement -> review
    assert assessment['test_c']['recommendation'] == 'review'
    
    # test_d has unique coverage -> keep
    assert assessment['test_d']['recommendation'] == 'keep'


def test_identify_low_value_tests_with_threshold():
    """Test value assessment with custom unique coverage threshold."""
    test_coverage_map = {
        'test_a': {
            'file1.py': {1, 2, 3, 4}
        },
        'test_b': {
            'file1.py': {1, 2, 3, 4},
            'file2.py': {10}  # Only line 10 in file2 is unique to test_b
        }
    }
    requirement_linked_tests = set()
    
    # With threshold=0, test_b should be kept (has 1 unique line > 0)
    assessment = identify_low_value_tests(test_coverage_map, requirement_linked_tests, unique_coverage_threshold=0)
    assert assessment['test_b']['recommendation'] == 'keep'
    assert assessment['test_b']['unique_coverage'] == 1
    
    # With threshold=1, test_b should be removed (1 unique line <= 1)
    assessment = identify_low_value_tests(test_coverage_map, requirement_linked_tests, unique_coverage_threshold=1)
    assert assessment['test_b']['recommendation'] == 'remove'
    assert assessment['test_b']['unique_coverage'] == 1


def test_generate_removal_report_empty():
    """Test report generation with no recommendations."""
    report = generate_removal_report([])
    assert "No tests recommended for removal" in report


def test_generate_removal_report_with_recommendations():
    """Test report generation with recommendations."""
    recommendations = [
        {
            'test_name': 'test_a',
            'reason': 'No unique coverage and no requirement linkage',
            'unique_coverage': 0,
            'total_coverage': 5,
            'has_requirement_link': False
        },
        {
            'test_name': 'test_b',
            'reason': 'No unique coverage and no requirement linkage',
            'unique_coverage': 0,
            'total_coverage': 3,
            'has_requirement_link': False
        }
    ]
    
    report = generate_removal_report(recommendations)
    
    assert 'Test Removal Recommendations' in report
    assert 'Total tests recommended for removal: 2' in report
    assert 'test_a' in report
    assert 'test_b' in report
    assert 'No unique coverage' in report


def test_identify_low_value_tests_includes_metadata():
    """Test that value assessment includes complete metadata."""
    test_coverage_map = {
        'test_a': {
            'file1.py': {1, 2, 3}
        }
    }
    requirement_linked_tests = {'test_a'}
    
    assessment = identify_low_value_tests(test_coverage_map, requirement_linked_tests)
    
    assert 'test_a' in assessment
    assert 'unique_coverage' in assessment['test_a']
    assert 'total_coverage' in assessment['test_a']
    assert 'has_requirement_link' in assessment['test_a']
    assert 'recommendation' in assessment['test_a']
    
    assert assessment['test_a']['has_requirement_link'] is True
    assert assessment['test_a']['total_coverage'] == 3
