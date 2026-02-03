"""
Unit tests for parallel execution configuration.
"""

import pytest
from pathlib import Path
import tempfile
import os
import json
from test_cleanup.value_assessment.parallel_config import (
    detect_parallel_tests,
    configure_parallel_execution,
    generate_parallel_config_file,
    get_parallel_execution_report,
)


def test_detect_parallel_tests_safe_test():
    """Test detecting a test safe for parallel execution."""
    test_content = '''
def test_safe_example():
    """Simple test with no shared state."""
    result = 1 + 1
    assert result == 2
'''
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
        f.write(test_content)
        f.flush()
        test_file = Path(f.name)
    
    try:
        assessment = detect_parallel_tests([test_file])
        
        assert 'test_safe_example' in assessment
        assert assessment['test_safe_example']['is_parallel_safe'] is True
        assert len(assessment['test_safe_example']['reasons']) == 0
    finally:
        os.unlink(test_file)


def test_detect_parallel_tests_with_global():
    """Test detecting a test with global variables."""
    test_content = '''
def test_with_global():
    global shared_state
    shared_state = 42
    assert True
'''
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
        f.write(test_content)
        f.flush()
        test_file = Path(f.name)
    
    try:
        assessment = detect_parallel_tests([test_file])
        
        assert 'test_with_global' in assessment
        assert assessment['test_with_global']['is_parallel_safe'] is False
        assert any('global' in reason.lower() for reason in assessment['test_with_global']['reasons'])
    finally:
        os.unlink(test_file)


def test_detect_parallel_tests_with_file_operations():
    """Test detecting a test with file operations."""
    test_content = '''
def test_with_file():
    with open('test.txt', 'w') as f:
        f.write('test')
    assert True
'''
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
        f.write(test_content)
        f.flush()
        test_file = Path(f.name)
    
    try:
        assessment = detect_parallel_tests([test_file])
        
        assert 'test_with_file' in assessment
        assert assessment['test_with_file']['is_parallel_safe'] is False
        assert any('file' in reason.lower() for reason in assessment['test_with_file']['reasons'])
    finally:
        os.unlink(test_file)


def test_detect_parallel_tests_with_tempfile():
    """Test that tests using tempfile are considered safe."""
    test_content = '''
import tempfile

def test_with_tempfile():
    with tempfile.NamedTemporaryFile() as f:
        f.write(b'test')
    assert True
'''
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
        f.write(test_content)
        f.flush()
        test_file = Path(f.name)
    
    try:
        assessment = detect_parallel_tests([test_file])
        
        assert 'test_with_tempfile' in assessment
        # Should be safe because it uses tempfile
        assert assessment['test_with_tempfile']['is_parallel_safe'] is True
    finally:
        os.unlink(test_file)


def test_detect_parallel_tests_multiple_tests():
    """Test detecting multiple tests in one file."""
    test_content = '''
def test_safe():
    assert True

def test_unsafe():
    global state
    state = 1
    assert True
'''
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.py', delete=False, encoding='utf-8') as f:
        f.write(test_content)
        f.flush()
        test_file = Path(f.name)
    
    try:
        assessment = detect_parallel_tests([test_file])
        
        assert 'test_safe' in assessment
        assert assessment['test_safe']['is_parallel_safe'] is True
        
        assert 'test_unsafe' in assessment
        assert assessment['test_unsafe']['is_parallel_safe'] is False
    finally:
        os.unlink(test_file)


def test_detect_parallel_tests_empty_list():
    """Test with empty file list."""
    assessment = detect_parallel_tests([])
    assert assessment == {}


def test_configure_parallel_execution_pytest():
    """Test configuring pytest-xdist."""
    parallel_assessment = {
        'test_a': {
            'file': 'test_file1.py',
            'is_parallel_safe': True,
            'reasons': []
        },
        'test_b': {
            'file': 'test_file1.py',
            'is_parallel_safe': True,
            'reasons': []
        },
        'test_c': {
            'file': 'test_file2.py',
            'is_parallel_safe': False,
            'reasons': ['Uses global variables']
        }
    }
    
    config = configure_parallel_execution(parallel_assessment, framework='pytest')
    
    assert config['framework'] == 'pytest'
    assert config['parallel_enabled'] is True
    assert config['total_tests'] == 3
    assert config['parallel_safe_tests'] == 2
    assert config['parallel_unsafe_tests'] == 1
    assert config['recommended_workers'] > 0
    assert '-n' in config['pytest_args']


def test_configure_parallel_execution_vitest():
    """Test configuring vitest parallel execution."""
    parallel_assessment = {
        'test_a': {
            'file': 'test_file1.ts',
            'is_parallel_safe': True,
            'reasons': []
        },
        'test_b': {
            'file': 'test_file2.ts',
            'is_parallel_safe': True,
            'reasons': []
        }
    }
    
    config = configure_parallel_execution(parallel_assessment, framework='vitest')
    
    assert config['framework'] == 'vitest'
    assert config['parallel_enabled'] is True
    assert config['total_tests'] == 2
    assert config['parallel_safe_tests'] == 2
    assert 'vitest_config' in config
    assert 'test' in config['vitest_config']


def test_configure_parallel_execution_unsupported_framework():
    """Test with unsupported framework."""
    with pytest.raises(ValueError, match="Unsupported framework"):
        configure_parallel_execution({}, framework='unknown')


def test_configure_parallel_execution_no_safe_tests():
    """Test configuration when no tests are safe for parallel execution."""
    parallel_assessment = {
        'test_a': {
            'file': 'test_file1.py',
            'is_parallel_safe': False,
            'reasons': ['Uses global variables']
        }
    }
    
    config = configure_parallel_execution(parallel_assessment, framework='pytest')
    
    assert config['parallel_enabled'] is False
    assert config['parallel_safe_tests'] == 0


def test_generate_parallel_config_file_pytest():
    """Test generating pytest configuration file."""
    config = {
        'framework': 'pytest',
        'total_tests': 10,
        'parallel_safe_tests': 8,
        'parallel_unsafe_tests': 2,
        'recommended_workers': 4
    }
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.ini', delete=False, encoding='utf-8') as f:
        output_path = Path(f.name)
    
    try:
        generate_parallel_config_file(config, output_path)
        
        with open(output_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        assert '[pytest]' in content
        assert 'addopts' in content
        assert '-n 4' in content
        assert 'Total tests: 10' in content
    finally:
        os.unlink(output_path)


def test_generate_parallel_config_file_vitest():
    """Test generating vitest configuration file."""
    config = {
        'framework': 'vitest',
        'total_tests': 10,
        'parallel_safe_tests': 8,
        'parallel_unsafe_tests': 2,
        'vitest_config': {
            'test': {
                'pool': 'threads',
                'poolOptions': {
                    'threads': {
                        'maxThreads': 4,
                        'minThreads': 1
                    }
                }
            }
        }
    }
    
    with tempfile.NamedTemporaryFile(mode='w', suffix='.ts', delete=False, encoding='utf-8') as f:
        output_path = Path(f.name)
    
    try:
        generate_parallel_config_file(config, output_path)
        
        with open(output_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        assert 'export default' in content
        assert 'test' in content
        assert 'Total tests: 10' in content
    finally:
        os.unlink(output_path)


def test_get_parallel_execution_report():
    """Test generating parallel execution report."""
    parallel_assessment = {
        'test_a': {
            'file': 'test_file1.py',
            'is_parallel_safe': True,
            'reasons': []
        },
        'test_b': {
            'file': 'test_file2.py',
            'is_parallel_safe': False,
            'reasons': ['Uses global variables', 'Uses file operations']
        }
    }
    
    report = get_parallel_execution_report(parallel_assessment)
    
    assert 'Parallel Execution Assessment' in report
    assert 'Total tests analyzed: 2' in report
    assert 'Parallel safe tests: 1' in report
    assert 'Parallel unsafe tests: 1' in report
    assert 'test_b' in report
    assert 'Uses global variables' in report


def test_get_parallel_execution_report_all_safe():
    """Test report when all tests are safe."""
    parallel_assessment = {
        'test_a': {
            'file': 'test_file1.py',
            'is_parallel_safe': True,
            'reasons': []
        },
        'test_b': {
            'file': 'test_file2.py',
            'is_parallel_safe': True,
            'reasons': []
        }
    }
    
    report = get_parallel_execution_report(parallel_assessment)
    
    assert 'Total tests analyzed: 2' in report
    assert 'Parallel safe tests: 2 (100.0%)' in report
    assert 'not safe for parallel execution' not in report
