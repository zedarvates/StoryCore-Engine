"""
Parallel execution configuration.

This module detects tests with no shared state dependencies and configures
pytest-xdist for Python tests and vitest parallel execution for TypeScript tests.
"""

import ast
import json
from pathlib import Path
from typing import Dict, List, Set, Tuple


def detect_parallel_tests(test_files: List[Path]) -> Dict[str, dict]:
    """
    Detect tests with no shared state dependencies.
    
    Tests are considered safe for parallel execution if they:
    - Don't use global variables
    - Don't modify class attributes
    - Don't use file system operations without proper isolation
    - Don't use database connections without proper isolation
    
    Args:
        test_files: List of test file paths to analyze
        
    Returns:
        Dictionary mapping test names to their parallel safety assessment:
        {
            'test_name': {
                'file': str,
                'is_parallel_safe': bool,
                'reasons': List[str]  # Reasons why it's not safe (if applicable)
            }
        }
        
    Requirements: 6.2
    """
    parallel_assessment = {}
    
    for test_file in test_files:
        if not test_file.exists():
            continue
        
        try:
            with open(test_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.FunctionDef) and node.name.startswith('test_'):
                    test_name = node.name
                    is_safe, reasons = _analyze_test_for_parallel_safety(node, content)
                    
                    parallel_assessment[test_name] = {
                        'file': str(test_file),
                        'is_parallel_safe': is_safe,
                        'reasons': reasons
                    }
        
        except (SyntaxError, UnicodeDecodeError):
            continue
    
    return parallel_assessment


def _analyze_test_for_parallel_safety(
    test_node: ast.FunctionDef,
    file_content: str
) -> Tuple[bool, List[str]]:
    """
    Analyze a test function for parallel execution safety.
    
    Args:
        test_node: AST node for the test function
        file_content: Full file content for context
        
    Returns:
        Tuple of (is_safe, reasons)
    """
    reasons = []
    
    # Check for global variable usage
    for node in ast.walk(test_node):
        if isinstance(node, ast.Global):
            reasons.append("Uses global variables")
        
        # Check for file operations without proper isolation
        if isinstance(node, ast.Call):
            if hasattr(node.func, 'id'):
                func_name = node.func.id
                if func_name in ['open', 'write', 'read']:
                    # Check if using tempfile or proper isolation
                    if 'tempfile' not in file_content and 'tmp_path' not in file_content:
                        reasons.append("Uses file operations without proper isolation")
        
        # Check for database operations
        if isinstance(node, ast.Attribute):
            if node.attr in ['execute', 'commit', 'rollback']:
                if 'transaction' not in file_content and 'rollback' not in file_content:
                    reasons.append("Uses database operations without proper isolation")
        
        # Check for sleep/time operations (potential timing dependencies)
        if isinstance(node, ast.Call):
            if hasattr(node.func, 'attr') and node.func.attr in ['sleep', 'wait']:
                reasons.append("Uses timing operations (sleep/wait)")
    
    is_safe = len(reasons) == 0
    
    return is_safe, reasons


def configure_parallel_execution(
    parallel_assessment: Dict[str, dict],
    framework: str = 'pytest'
) -> Dict[str, any]:
    """
    Configure parallel execution for test framework.
    
    Args:
        parallel_assessment: Dictionary from detect_parallel_tests
        framework: 'pytest' or 'vitest'
        
    Returns:
        Configuration dictionary for the framework
        
    Requirements: 6.2
    """
    parallel_safe_tests = [
        test_name
        for test_name, assessment in parallel_assessment.items()
        if assessment['is_parallel_safe']
    ]
    
    if framework == 'pytest':
        return _configure_pytest_xdist(parallel_safe_tests, parallel_assessment)
    elif framework == 'vitest':
        return _configure_vitest_parallel(parallel_safe_tests, parallel_assessment)
    else:
        raise ValueError(f"Unsupported framework: {framework}")


def _configure_pytest_xdist(
    parallel_safe_tests: List[str],
    parallel_assessment: Dict[str, dict]
) -> Dict[str, any]:
    """
    Configure pytest-xdist for parallel execution.
    
    Args:
        parallel_safe_tests: List of tests safe for parallel execution
        parallel_assessment: Full parallel assessment
        
    Returns:
        pytest-xdist configuration
    """
    # Group tests by file for better distribution
    tests_by_file = {}
    for test_name, assessment in parallel_assessment.items():
        if assessment['is_parallel_safe']:
            file_path = assessment['file']
            if file_path not in tests_by_file:
                tests_by_file[file_path] = []
            tests_by_file[file_path].append(test_name)
    
    config = {
        'framework': 'pytest',
        'parallel_enabled': len(parallel_safe_tests) > 0,
        'total_tests': len(parallel_assessment),
        'parallel_safe_tests': len(parallel_safe_tests),
        'parallel_unsafe_tests': len(parallel_assessment) - len(parallel_safe_tests),
        'recommended_workers': min(len(tests_by_file), 4),  # Max 4 workers
        'pytest_args': [
            '-n', str(min(len(tests_by_file), 4)),  # Number of workers
            '--dist', 'loadfile',  # Distribute by file
        ],
        'tests_by_file': tests_by_file
    }
    
    return config


def _configure_vitest_parallel(
    parallel_safe_tests: List[str],
    parallel_assessment: Dict[str, dict]
) -> Dict[str, any]:
    """
    Configure vitest parallel execution.
    
    Args:
        parallel_safe_tests: List of tests safe for parallel execution
        parallel_assessment: Full parallel assessment
        
    Returns:
        vitest configuration
    """
    # Group tests by file
    tests_by_file = {}
    for test_name, assessment in parallel_assessment.items():
        if assessment['is_parallel_safe']:
            file_path = assessment['file']
            if file_path not in tests_by_file:
                tests_by_file[file_path] = []
            tests_by_file[file_path].append(test_name)
    
    config = {
        'framework': 'vitest',
        'parallel_enabled': len(parallel_safe_tests) > 0,
        'total_tests': len(parallel_assessment),
        'parallel_safe_tests': len(parallel_safe_tests),
        'parallel_unsafe_tests': len(parallel_assessment) - len(parallel_safe_tests),
        'vitest_config': {
            'test': {
                'pool': 'threads',
                'poolOptions': {
                    'threads': {
                        'maxThreads': min(len(tests_by_file), 4),
                        'minThreads': 1
                    }
                },
                'fileParallelism': True
            }
        },
        'tests_by_file': tests_by_file
    }
    
    return config


def generate_parallel_config_file(
    config: Dict[str, any],
    output_path: Path
) -> None:
    """
    Generate configuration file for parallel execution.
    
    Args:
        config: Configuration dictionary from configure_parallel_execution
        output_path: Path to write configuration file
        
    Requirements: 6.2
    """
    framework = config['framework']
    
    if framework == 'pytest':
        # Generate pytest.ini or pyproject.toml section
        content = [
            "[pytest]",
            f"addopts = -n {config['recommended_workers']} --dist loadfile",
            "",
            "# Parallel execution configuration",
            f"# Total tests: {config['total_tests']}",
            f"# Parallel safe: {config['parallel_safe_tests']}",
            f"# Parallel unsafe: {config['parallel_unsafe_tests']}",
        ]
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(content))
    
    elif framework == 'vitest':
        # Generate vitest.config.ts section
        vitest_config = config['vitest_config']
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write("// Vitest parallel execution configuration\n")
            f.write("export default {\n")
            f.write(f"  test: {json.dumps(vitest_config['test'], indent=4)}\n")
            f.write("}\n")
            f.write(f"\n// Total tests: {config['total_tests']}\n")
            f.write(f"// Parallel safe: {config['parallel_safe_tests']}\n")
            f.write(f"// Parallel unsafe: {config['parallel_unsafe_tests']}\n")


def get_parallel_execution_report(
    parallel_assessment: Dict[str, dict]
) -> str:
    """
    Generate a human-readable report of parallel execution assessment.
    
    Args:
        parallel_assessment: Dictionary from detect_parallel_tests
        
    Returns:
        Formatted report string
        
    Requirements: 6.2
    """
    total_tests = len(parallel_assessment)
    parallel_safe = sum(1 for a in parallel_assessment.values() if a['is_parallel_safe'])
    parallel_unsafe = total_tests - parallel_safe
    
    report_lines = [
        "Parallel Execution Assessment",
        "=" * 50,
        f"\nTotal tests analyzed: {total_tests}",
        f"Parallel safe tests: {parallel_safe} ({parallel_safe/total_tests*100:.1f}%)",
        f"Parallel unsafe tests: {parallel_unsafe} ({parallel_unsafe/total_tests*100:.1f}%)",
        ""
    ]
    
    if parallel_unsafe > 0:
        report_lines.append("\nTests not safe for parallel execution:")
        report_lines.append("-" * 50)
        
        for test_name, assessment in parallel_assessment.items():
            if not assessment['is_parallel_safe']:
                report_lines.append(f"\n{test_name}")
                report_lines.append(f"  File: {assessment['file']}")
                report_lines.append("  Reasons:")
                for reason in assessment['reasons']:
                    report_lines.append(f"    - {reason}")
    
    return "\n".join(report_lines)
