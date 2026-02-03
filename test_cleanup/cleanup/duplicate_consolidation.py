"""
Duplicate test consolidation.

This module provides functions to consolidate duplicate tests by extracting
unique assertions and merging them into a single test.
"""

from pathlib import Path
from typing import List, Dict, Optional, Set
import ast
import re
from datetime import datetime
from test_cleanup.models import CleanupAction, CleanupLog, TestGroup, TestMetrics


def extract_assertions_from_test(source_code: str, test_function_name: str) -> List[str]:
    """
    Extract all assertion statements from a specific test function.
    
    Args:
        source_code: Source code of the test file
        test_function_name: Name of the test function to extract from
        
    Returns:
        List of assertion statements as strings
        
    Requirements: 4.2
    """
    try:
        tree = ast.parse(source_code)
    except SyntaxError:
        return []
    
    assertions = []
    
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == test_function_name:
            for stmt in ast.walk(node):
                if isinstance(stmt, ast.Assert):
                    # Convert assertion back to source code
                    assertion_code = ast.unparse(stmt)
                    assertions.append(assertion_code)
    
    return assertions


def extract_all_assertions_from_file(test_file: Path) -> Dict[str, List[str]]:
    """
    Extract assertions from all test functions in a file.
    
    Args:
        test_file: Path to the test file
        
    Returns:
        Dictionary mapping test function names to their assertions
        
    Requirements: 4.2
    """
    if not test_file.exists():
        return {}
    
    try:
        with open(test_file, 'r', encoding='utf-8') as f:
            source_code = f.read()
    except Exception:
        return {}
    
    try:
        tree = ast.parse(source_code)
    except SyntaxError:
        return {}
    
    test_assertions = {}
    
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name.startswith('test_'):
            assertions = []
            for stmt in ast.walk(node):
                if isinstance(stmt, ast.Assert):
                    assertion_code = ast.unparse(stmt)
                    assertions.append(assertion_code)
            test_assertions[node.name] = assertions
    
    return test_assertions


def get_unique_assertions(test_group: TestGroup, test_files: Dict[str, Path]) -> Set[str]:
    """
    Extract all unique assertions from a group of duplicate tests.
    
    Args:
        test_group: TestGroup containing duplicate test names
        test_files: Dictionary mapping test names to file paths
        
    Returns:
        Set of unique assertion statements
        
    Requirements: 4.2
    """
    all_assertions = set()
    
    for test_name in test_group.tests:
        if test_name in test_files:
            test_file = test_files[test_name]
            assertions_dict = extract_all_assertions_from_file(test_file)
            
            # Extract function name from test name
            function_name = test_name.split('::')[-1] if '::' in test_name else test_name
            
            if function_name in assertions_dict:
                all_assertions.update(assertions_dict[function_name])
    
    return all_assertions


def extract_test_docstring(source_code: str, test_function_name: str) -> Optional[str]:
    """
    Extract docstring from a test function.
    
    Args:
        source_code: Source code of the test file
        test_function_name: Name of the test function
        
    Returns:
        Docstring if present, None otherwise
        
    Requirements: 4.2
    """
    try:
        tree = ast.parse(source_code)
    except SyntaxError:
        return None
    
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == test_function_name:
            docstring = ast.get_docstring(node)
            return docstring
    
    return None


def extract_test_setup(source_code: str, test_function_name: str) -> List[str]:
    """
    Extract setup code (non-assertion statements) from a test function.
    
    Args:
        source_code: Source code of the test file
        test_function_name: Name of the test function
        
    Returns:
        List of setup statements as strings
        
    Requirements: 4.2
    """
    try:
        tree = ast.parse(source_code)
    except SyntaxError:
        return []
    
    setup_statements = []
    
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == test_function_name:
            for stmt in node.body:
                # Skip docstrings and assertions
                if isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Constant):
                    continue  # Docstring
                if isinstance(stmt, ast.Assert):
                    continue  # Assertion
                
                # Convert statement to source code
                try:
                    stmt_code = ast.unparse(stmt)
                    setup_statements.append(stmt_code)
                except Exception:
                    pass
    
    return setup_statements


def generate_merged_test_name(test_group: TestGroup) -> str:
    """
    Generate a name for the merged test.
    
    Args:
        test_group: TestGroup containing duplicate test names
        
    Returns:
        Generated test name
        
    Requirements: 4.2
    """
    # Extract common prefix from test names
    test_names = [t.split('::')[-1] if '::' in t else t for t in test_group.tests]
    
    # Remove 'test_' prefix for analysis
    names_without_prefix = [n.replace('test_', '') for n in test_names]
    
    # Find common words
    common_words = set(names_without_prefix[0].split('_'))
    for name in names_without_prefix[1:]:
        common_words &= set(name.split('_'))
    
    if common_words:
        merged_name = 'test_' + '_'.join(sorted(common_words))
    else:
        # Use first test name as base
        merged_name = test_names[0] + '_consolidated'
    
    return merged_name


def generate_merged_test_code(
    test_group: TestGroup,
    test_files: Dict[str, Path],
    merged_name: Optional[str] = None
) -> str:
    """
    Generate code for a merged test from duplicate tests.
    
    Args:
        test_group: TestGroup containing duplicate test names
        test_files: Dictionary mapping test names to file paths
        merged_name: Optional custom name for merged test
        
    Returns:
        Generated test code as string
        
    Requirements: 4.2
    """
    if merged_name is None:
        merged_name = generate_merged_test_name(test_group)
    
    # Collect all unique assertions
    unique_assertions = get_unique_assertions(test_group, test_files)
    
    # Collect docstrings
    docstrings = []
    for test_name in test_group.tests:
        if test_name in test_files:
            test_file = test_files[test_name]
            try:
                with open(test_file, 'r', encoding='utf-8') as f:
                    source = f.read()
                function_name = test_name.split('::')[-1] if '::' in test_name else test_name
                docstring = extract_test_docstring(source, function_name)
                if docstring:
                    docstrings.append(docstring)
            except Exception:
                pass
    
    # Generate merged test code
    lines = []
    lines.append(f"def {merged_name}():")
    
    # Add docstring
    if docstrings:
        lines.append('    """')
        lines.append('    Consolidated test from:')
        for test_name in test_group.tests:
            lines.append(f'    - {test_name}')
        lines.append('')
        lines.append('    Original docstrings:')
        for doc in docstrings:
            for doc_line in doc.split('\n'):
                lines.append(f'    {doc_line}')
        lines.append('    """')
    else:
        lines.append('    """')
        lines.append('    Consolidated test from:')
        for test_name in test_group.tests:
            lines.append(f'    - {test_name}')
        lines.append('    """')
    
    # Add assertions
    if unique_assertions:
        for assertion in sorted(unique_assertions):
            lines.append(f'    {assertion}')
    else:
        lines.append('    pass')
    
    return '\n'.join(lines)


def consolidate_duplicate_tests(
    test_group: TestGroup,
    test_files: Dict[str, Path],
    output_file: Path,
    cleanup_log: CleanupLog
) -> bool:
    """
    Consolidate duplicate tests into a single merged test.
    
    Args:
        test_group: TestGroup containing duplicate test names
        test_files: Dictionary mapping test names to file paths
        output_file: Path where merged test should be written
        cleanup_log: CleanupLog to record the action
        
    Returns:
        True if consolidation was successful
        
    Requirements: 4.2
    """
    try:
        # Generate merged test code
        merged_code = generate_merged_test_code(test_group, test_files)
        
        # Write to output file
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(merged_code)
        
        # Log the consolidation
        reason = f"Consolidated {len(test_group.tests)} duplicate tests into one"
        action = CleanupAction(
            action_type="merge",
            test_name=str(output_file),
            reason=reason,
            timestamp=datetime.now(),
            before_metrics=None,
            after_metrics=None
        )
        
        cleanup_log.actions.append(action)
        cleanup_log.total_merged += len(test_group.tests)
        
        return True
        
    except Exception as e:
        # Log failure
        action = CleanupAction(
            action_type="merge",
            test_name=str(output_file),
            reason=f"FAILED: {str(e)}",
            timestamp=datetime.now(),
            before_metrics=None,
            after_metrics=None
        )
        cleanup_log.actions.append(action)
        return False


def consolidate_multiple_groups(
    duplicate_groups: List[TestGroup],
    test_files: Dict[str, Path],
    output_dir: Path,
    cleanup_log: CleanupLog
) -> Dict[str, bool]:
    """
    Consolidate multiple groups of duplicate tests.
    
    Args:
        duplicate_groups: List of TestGroup objects
        test_files: Dictionary mapping test names to file paths
        output_dir: Directory where merged tests should be written
        cleanup_log: CleanupLog to record actions
        
    Returns:
        Dictionary mapping output file paths to success status
        
    Requirements: 4.2
    """
    output_dir.mkdir(parents=True, exist_ok=True)
    
    results = {}
    
    for i, group in enumerate(duplicate_groups):
        merged_name = generate_merged_test_name(group)
        output_file = output_dir / f"{merged_name}.py"
        
        # Handle name conflicts
        counter = 1
        while output_file.exists():
            output_file = output_dir / f"{merged_name}_{counter}.py"
            counter += 1
        
        success = consolidate_duplicate_tests(group, test_files, output_file, cleanup_log)
        results[str(output_file)] = success
    
    return results


def preview_consolidation(
    test_group: TestGroup,
    test_files: Dict[str, Path]
) -> Dict:
    """
    Preview what a consolidation would look like without performing it.
    
    Args:
        test_group: TestGroup containing duplicate test names
        test_files: Dictionary mapping test names to file paths
        
    Returns:
        Dictionary with preview information
        
    Requirements: 4.2
    """
    merged_name = generate_merged_test_name(test_group)
    unique_assertions = get_unique_assertions(test_group, test_files)
    merged_code = generate_merged_test_code(test_group, test_files)
    
    return {
        'merged_name': merged_name,
        'original_tests': test_group.tests,
        'unique_assertions_count': len(unique_assertions),
        'unique_assertions': list(unique_assertions),
        'merged_code': merged_code,
        'tests_to_remove': len(test_group.tests)
    }
