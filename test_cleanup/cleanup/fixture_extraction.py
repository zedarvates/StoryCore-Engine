"""
Fixture extraction.

This module provides functions to identify repeated setup code across tests
and refactor it into shared fixtures (pytest) or beforeEach hooks (vitest).
"""

from pathlib import Path
from typing import List, Dict, Set, Tuple, Optional
import ast
import re
from collections import defaultdict
from datetime import datetime
from test_cleanup.models import CleanupAction, CleanupLog


class SetupPattern:
    """Represents a repeated setup pattern found across tests."""
    
    def __init__(self, code: str, test_files: List[str], frequency: int):
        self.code = code
        self.test_files = test_files
        self.frequency = frequency


def extract_setup_code_from_test(source_code: str, test_function_name: str) -> List[str]:
    """
    Extract setup code (non-assertion statements) from a test function.
    
    Args:
        source_code: Source code of the test file
        test_function_name: Name of the test function
        
    Returns:
        List of setup statements as strings
        
    Requirements: 6.3, 8.3
    """
    try:
        tree = ast.parse(source_code)
    except SyntaxError:
        return []
    
    setup_statements = []
    
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef) and node.name == test_function_name:
            for stmt in node.body:
                # Skip docstrings
                if isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Constant):
                    continue
                
                # Skip assertions
                if isinstance(stmt, ast.Assert):
                    continue
                
                # Convert statement to source code
                try:
                    stmt_code = ast.unparse(stmt)
                    setup_statements.append(stmt_code)
                except Exception:
                    pass
    
    return setup_statements


def extract_all_setup_code(test_files: List[Path]) -> Dict[str, List[str]]:
    """
    Extract setup code from all test functions in multiple files.
    
    Args:
        test_files: List of test file paths
        
    Returns:
        Dictionary mapping test file paths to their setup code
        
    Requirements: 6.3, 8.3
    """
    all_setup = {}
    
    for test_file in test_files:
        if not test_file.exists():
            continue
        
        try:
            with open(test_file, 'r', encoding='utf-8') as f:
                source_code = f.read()
        except Exception:
            continue
        
        try:
            tree = ast.parse(source_code)
        except SyntaxError:
            continue
        
        file_setup = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name.startswith('test_'):
                setup = extract_setup_code_from_test(source_code, node.name)
                file_setup.extend(setup)
        
        if file_setup:
            all_setup[str(test_file)] = file_setup
    
    return all_setup


def identify_repeated_setup(all_setup: Dict[str, List[str]], min_frequency: int = 2) -> List[SetupPattern]:
    """
    Identify setup code that is repeated across multiple tests.
    
    Args:
        all_setup: Dictionary mapping test files to their setup code
        min_frequency: Minimum number of occurrences to consider as repeated
        
    Returns:
        List of SetupPattern objects for repeated setup code
        
    Requirements: 6.3, 8.3
    """
    # Count occurrences of each setup statement
    setup_counts = defaultdict(list)
    
    for test_file, setup_list in all_setup.items():
        for setup_code in setup_list:
            # Normalize whitespace for comparison
            normalized = ' '.join(setup_code.split())
            setup_counts[normalized].append(test_file)
    
    # Filter by minimum frequency
    repeated_patterns = []
    
    for setup_code, test_files in setup_counts.items():
        if len(test_files) >= min_frequency:
            pattern = SetupPattern(
                code=setup_code,
                test_files=test_files,
                frequency=len(test_files)
            )
            repeated_patterns.append(pattern)
    
    # Sort by frequency (most common first)
    repeated_patterns.sort(key=lambda p: p.frequency, reverse=True)
    
    return repeated_patterns


def generate_pytest_fixture(pattern: SetupPattern, fixture_name: str) -> str:
    """
    Generate a pytest fixture from a setup pattern.
    
    Args:
        pattern: SetupPattern to convert to fixture
        fixture_name: Name for the fixture
        
    Returns:
        Generated fixture code as string
        
    Requirements: 6.3, 8.3
    """
    lines = []
    lines.append("@pytest.fixture")
    lines.append(f"def {fixture_name}():")
    lines.append(f'    """')
    lines.append(f'    Fixture extracted from {pattern.frequency} tests.')
    lines.append(f'    """')
    
    # Add the setup code
    for line in pattern.code.split('\n'):
        if line.strip():
            lines.append(f'    {line}')
    
    # Add return statement if setup creates variables
    if '=' in pattern.code:
        # Extract variable names
        var_names = []
        for line in pattern.code.split('\n'):
            if '=' in line and not line.strip().startswith('#'):
                var_name = line.split('=')[0].strip()
                if var_name and var_name.isidentifier():
                    var_names.append(var_name)
        
        if var_names:
            if len(var_names) == 1:
                lines.append(f'    return {var_names[0]}')
            else:
                lines.append(f'    return {", ".join(var_names)}')
    
    return '\n'.join(lines)


def generate_vitest_before_each(pattern: SetupPattern) -> str:
    """
    Generate a vitest beforeEach hook from a setup pattern.
    
    Args:
        pattern: SetupPattern to convert to beforeEach
        
    Returns:
        Generated beforeEach code as string
        
    Requirements: 6.3, 8.3
    """
    lines = []
    lines.append("beforeEach(() => {")
    lines.append(f'  // Setup extracted from {pattern.frequency} tests')
    
    # Add the setup code
    for line in pattern.code.split('\n'):
        if line.strip():
            lines.append(f'  {line}')
    
    lines.append("});")
    
    return '\n'.join(lines)


def suggest_fixture_name(pattern: SetupPattern) -> str:
    """
    Suggest a name for a fixture based on the setup code.
    
    Args:
        pattern: SetupPattern to generate name for
        
    Returns:
        Suggested fixture name
        
    Requirements: 6.3, 8.3
    """
    # Extract variable names from setup code
    var_names = []
    for line in pattern.code.split('\n'):
        if '=' in line and not line.strip().startswith('#'):
            var_name = line.split('=')[0].strip()
            if var_name and var_name.isidentifier():
                var_names.append(var_name)
    
    if var_names:
        # Use first variable name as base
        return f"{var_names[0]}_fixture"
    
    # Look for common patterns
    code_lower = pattern.code.lower()
    if 'client' in code_lower:
        return "client_fixture"
    elif 'database' in code_lower or 'db' in code_lower:
        return "db_fixture"
    elif 'user' in code_lower:
        return "user_fixture"
    elif 'config' in code_lower:
        return "config_fixture"
    else:
        return "setup_fixture"


def generate_fixture_file(
    patterns: List[SetupPattern],
    output_path: Path,
    framework: str = "pytest"
) -> bool:
    """
    Generate a file containing extracted fixtures.
    
    Args:
        patterns: List of SetupPattern objects to convert
        output_path: Path where fixture file should be written
        framework: Testing framework ("pytest" or "vitest")
        
    Returns:
        True if file was generated successfully
        
    Requirements: 6.3, 8.3
    """
    try:
        lines = []
        
        if framework == "pytest":
            lines.append("import pytest")
            lines.append("")
            lines.append("# Extracted fixtures from repeated setup code")
            lines.append("")
            
            for i, pattern in enumerate(patterns):
                fixture_name = suggest_fixture_name(pattern)
                # Ensure unique names
                if i > 0:
                    fixture_name = f"{fixture_name}_{i}"
                
                fixture_code = generate_pytest_fixture(pattern, fixture_name)
                lines.append(fixture_code)
                lines.append("")
                lines.append("")
        
        elif framework == "vitest":
            lines.append("import { beforeEach } from 'vitest';")
            lines.append("")
            lines.append("// Extracted setup code from repeated patterns")
            lines.append("")
            
            for pattern in patterns:
                before_each_code = generate_vitest_before_each(pattern)
                lines.append(before_each_code)
                lines.append("")
        
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(lines))
        
        return True
        
    except Exception:
        return False


def update_test_to_use_fixture(
    test_file: Path,
    setup_code: str,
    fixture_name: str,
    framework: str = "pytest"
) -> bool:
    """
    Update a test file to use a fixture instead of inline setup.
    
    Args:
        test_file: Path to the test file to update
        setup_code: Setup code to replace
        fixture_name: Name of the fixture to use
        framework: Testing framework ("pytest" or "vitest")
        
    Returns:
        True if update was successful
        
    Requirements: 6.3, 8.3
    """
    try:
        with open(test_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Normalize setup code for matching
        normalized_setup = ' '.join(setup_code.split())
        
        # Replace inline setup with fixture usage
        if framework == "pytest":
            # Add fixture parameter to test functions
            # This is a simplified approach - real implementation would need AST manipulation
            updated_content = content.replace(setup_code, f"# Using {fixture_name} fixture")
        else:
            # For vitest, remove the setup code as it's in beforeEach
            updated_content = content.replace(setup_code, "// Setup moved to beforeEach")
        
        with open(test_file, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        
        return True
        
    except Exception:
        return False


def extract_fixtures_from_tests(
    test_files: List[Path],
    output_path: Path,
    cleanup_log: CleanupLog,
    framework: str = "pytest",
    min_frequency: int = 2
) -> Dict:
    """
    Extract fixtures from test files and generate fixture file.
    
    Args:
        test_files: List of test file paths to analyze
        output_path: Path where fixture file should be written
        cleanup_log: CleanupLog to record actions
        framework: Testing framework ("pytest" or "vitest")
        min_frequency: Minimum occurrences to extract as fixture
        
    Returns:
        Dictionary with extraction results
        
    Requirements: 6.3, 8.3
    """
    # Extract all setup code
    all_setup = extract_all_setup_code(test_files)
    
    # Identify repeated patterns
    patterns = identify_repeated_setup(all_setup, min_frequency)
    
    if not patterns:
        return {
            'success': True,
            'fixtures_extracted': 0,
            'patterns': []
        }
    
    # Generate fixture file
    success = generate_fixture_file(patterns, output_path, framework)
    
    if success:
        # Log the extraction
        action = CleanupAction(
            action_type="rewrite",
            test_name=str(output_path),
            reason=f"Extracted {len(patterns)} fixtures from repeated setup code",
            timestamp=datetime.now(),
            before_metrics=None,
            after_metrics=None
        )
        cleanup_log.actions.append(action)
    
    return {
        'success': success,
        'fixtures_extracted': len(patterns),
        'patterns': [
            {
                'code': p.code,
                'frequency': p.frequency,
                'test_files': p.test_files
            }
            for p in patterns
        ]
    }


def analyze_fixture_opportunities(test_files: List[Path], min_frequency: int = 2) -> Dict:
    """
    Analyze test files for fixture extraction opportunities without performing extraction.
    
    Args:
        test_files: List of test file paths to analyze
        min_frequency: Minimum occurrences to consider
        
    Returns:
        Dictionary with analysis results
        
    Requirements: 6.3, 8.3
    """
    all_setup = extract_all_setup_code(test_files)
    patterns = identify_repeated_setup(all_setup, min_frequency)
    
    return {
        'total_test_files': len(test_files),
        'files_with_setup': len(all_setup),
        'repeated_patterns_found': len(patterns),
        'patterns': [
            {
                'code': p.code,
                'frequency': p.frequency,
                'suggested_name': suggest_fixture_name(p),
                'test_files': p.test_files
            }
            for p in patterns
        ]
    }
