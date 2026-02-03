"""
Unit tests for requirement-linked test preservation.
"""

import pytest
from pathlib import Path
import tempfile
import os
from test_cleanup.value_assessment.requirement_linkage import (
    parse_requirement_tags,
    mark_protected_tests,
    get_requirement_linkage_report,
    exclude_from_removal,
)


def test_parse_requirement_tags_from_docstring():
    """Test parsing requirement tags from test docstrings."""
    test_content = '''
def test_example():
    """
    Test example functionality.
    
    Requirements: 1.2, 1.3
    """
    assert True
'''
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
        f.write(test_content)
        f.flush()
        test_file = Path(f.name)
    
    try:
        requirement_map = parse_requirement_tags(test_file)
        
        assert 'test_example' in requirement_map
        assert '1.2' in requirement_map['test_example']
        assert '1.3' in requirement_map['test_example']
    finally:
        os.unlink(test_file)


def test_parse_requirement_tags_from_comment():
    """Test parsing requirement tags from comments."""
    test_content = '''
def test_example():
    # Requirements: 2.1, 2.2
    assert True
'''
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
        f.write(test_content)
        f.flush()
        test_file = Path(f.name)
    
    try:
        requirement_map = parse_requirement_tags(test_file)
        
        assert 'test_example' in requirement_map
        assert '2.1' in requirement_map['test_example']
        assert '2.2' in requirement_map['test_example']
    finally:
        os.unlink(test_file)


def test_parse_requirement_tags_validates_format():
    """Test parsing 'Validates: Requirements X.Y' format."""
    test_content = '''
def test_example():
    """
    Validates: Requirements 3.1
    """
    assert True
'''
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
        f.write(test_content)
        f.flush()
        test_file = Path(f.name)
    
    try:
        requirement_map = parse_requirement_tags(test_file)
        
        assert 'test_example' in requirement_map
        assert '3.1' in requirement_map['test_example']
    finally:
        os.unlink(test_file)


def test_parse_requirement_tags_no_requirements():
    """Test parsing test file with no requirement tags."""
    test_content = '''
def test_example():
    """Test without requirements."""
    assert True
'''
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
        f.write(test_content)
        f.flush()
        test_file = Path(f.name)
    
    try:
        requirement_map = parse_requirement_tags(test_file)
        
        assert 'test_example' not in requirement_map
    finally:
        os.unlink(test_file)


def test_parse_requirement_tags_multiple_tests():
    """Test parsing multiple tests in one file."""
    test_content = '''
def test_first():
    """Requirements: 1.1"""
    assert True

def test_second():
    """Requirements: 2.2"""
    assert True

def test_third():
    """No requirements"""
    assert True
'''
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
        f.write(test_content)
        f.flush()
        test_file = Path(f.name)
    
    try:
        requirement_map = parse_requirement_tags(test_file)
        
        assert 'test_first' in requirement_map
        assert '1.1' in requirement_map['test_first']
        
        assert 'test_second' in requirement_map
        assert '2.2' in requirement_map['test_second']
        
        assert 'test_third' not in requirement_map
    finally:
        os.unlink(test_file)


def test_parse_requirement_tags_nonexistent_file():
    """Test parsing nonexistent file."""
    requirement_map = parse_requirement_tags(Path('/nonexistent/file.py'))
    assert requirement_map == {}


def test_mark_protected_tests():
    """Test marking requirement-linked tests as protected."""
    test_content1 = '''
def test_protected():
    """Requirements: 1.1"""
    assert True
'''
    
    test_content2 = '''
def test_also_protected():
    """Requirements: 2.2"""
    assert True

def test_not_protected():
    """No requirements"""
    assert True
'''
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f1:
        f1.write(test_content1)
        f1.flush()
        test_file1 = Path(f1.name)
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f2:
        f2.write(test_content2)
        f2.flush()
        test_file2 = Path(f2.name)
    
    try:
        protected_tests = mark_protected_tests([test_file1, test_file2])
        
        assert 'test_protected' in protected_tests
        assert 'test_also_protected' in protected_tests
        assert 'test_not_protected' not in protected_tests
    finally:
        os.unlink(test_file1)
        os.unlink(test_file2)


def test_mark_protected_tests_empty_list():
    """Test marking protected tests with empty file list."""
    protected_tests = mark_protected_tests([])
    assert protected_tests == set()


def test_get_requirement_linkage_report():
    """Test generating requirement linkage report."""
    test_content = '''
def test_example():
    """Requirements: 1.1, 1.2"""
    assert True
'''
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
        f.write(test_content)
        f.flush()
        test_file = Path(f.name)
    
    try:
        report = get_requirement_linkage_report([test_file])
        
        assert 'test_example' in report
        assert report['test_example']['is_protected'] is True
        assert '1.1' in report['test_example']['requirements']
        assert '1.2' in report['test_example']['requirements']
        assert str(test_file) == report['test_example']['file']
    finally:
        os.unlink(test_file)


def test_exclude_from_removal():
    """Test excluding protected tests from removal candidates."""
    removal_candidates = ['test_a', 'test_b', 'test_c', 'test_d']
    protected_tests = {'test_b', 'test_d'}
    
    filtered = exclude_from_removal(removal_candidates, protected_tests)
    
    assert 'test_a' in filtered
    assert 'test_b' not in filtered
    assert 'test_c' in filtered
    assert 'test_d' not in filtered


def test_exclude_from_removal_no_protected():
    """Test excluding with no protected tests."""
    removal_candidates = ['test_a', 'test_b']
    protected_tests = set()
    
    filtered = exclude_from_removal(removal_candidates, protected_tests)
    
    assert filtered == removal_candidates


def test_exclude_from_removal_all_protected():
    """Test excluding when all candidates are protected."""
    removal_candidates = ['test_a', 'test_b']
    protected_tests = {'test_a', 'test_b'}
    
    filtered = exclude_from_removal(removal_candidates, protected_tests)
    
    assert filtered == []


def test_parse_requirement_tags_case_insensitive():
    """Test that requirement parsing is case-insensitive."""
    test_content = '''
def test_example():
    """
    requirements: 1.1
    REQUIREMENT: 2.2
    Validates: requirements 3.3
    """
    assert True
'''
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
        f.write(test_content)
        f.flush()
        test_file = Path(f.name)
    
    try:
        requirement_map = parse_requirement_tags(test_file)
        
        assert 'test_example' in requirement_map
        assert '1.1' in requirement_map['test_example']
        assert '2.2' in requirement_map['test_example']
        assert '3.3' in requirement_map['test_example']
    finally:
        os.unlink(test_file)
