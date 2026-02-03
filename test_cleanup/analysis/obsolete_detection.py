"""
Obsolete test detection.

This module provides functions to identify tests that reference non-existent
code or deprecated functionality.
"""

from pathlib import Path
from typing import List, Set
import ast
import importlib.util


def extract_imports(test_file: Path) -> List[str]:
    """
    Extract all import statements from a test file.
    
    Args:
        test_file: Path to the test file
        
    Returns:
        List of imported module names
    """
    if not test_file.exists():
        return []
    
    try:
        with open(test_file, 'r', encoding='utf-8') as f:
            source = f.read()
        
        tree = ast.parse(source)
        imports = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.append(alias.name)
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.append(node.module)
        
        return imports
    except (SyntaxError, UnicodeDecodeError):
        return []


def check_module_exists(module_name: str, project_root: Path = None) -> bool:
    """
    Check if a module exists and can be imported.
    
    Args:
        module_name: Name of the module to check
        project_root: Root directory of the project (optional)
        
    Returns:
        True if module exists, False otherwise
    """
    try:
        # Try to find the module spec
        spec = importlib.util.find_spec(module_name)
        return spec is not None
    except (ImportError, ModuleNotFoundError, ValueError):
        return False


def extract_tested_functions(test_file: Path) -> List[str]:
    """
    Extract names of functions/classes being tested from a test file.
    
    Args:
        test_file: Path to the test file
        
    Returns:
        List of function/class names referenced in tests
    """
    if not test_file.exists():
        return []
    
    try:
        with open(test_file, 'r', encoding='utf-8') as f:
            source = f.read()
        
        tree = ast.parse(source)
        tested_names = set()
        
        # Look for function calls and attribute access
        for node in ast.walk(tree):
            if isinstance(node, ast.Call):
                if isinstance(node.func, ast.Name):
                    tested_names.add(node.func.id)
                elif isinstance(node.func, ast.Attribute):
                    tested_names.add(node.func.attr)
        
        return list(tested_names)
    except (SyntaxError, UnicodeDecodeError):
        return []


def check_deprecation_markers(test_file: Path) -> bool:
    """
    Check if a test file contains deprecation markers.
    
    Args:
        test_file: Path to the test file
        
    Returns:
        True if deprecation markers found, False otherwise
        
    Requirements: 2.2
    """
    if not test_file.exists():
        return False
    
    try:
        with open(test_file, 'r', encoding='utf-8') as f:
            content = f.read().lower()
        
        # Check for common deprecation markers
        deprecation_markers = [
            '@deprecated',
            'deprecated',
            'todo: remove',
            'fixme: remove',
            'obsolete',
            'no longer used',
            'legacy'
        ]
        
        return any(marker in content for marker in deprecation_markers)
    except UnicodeDecodeError:
        return False


def identify_obsolete_tests(
    test_files: List[Path],
    project_root: Path = None
) -> List[str]:
    """
    Identify obsolete tests based on missing imports and deprecation markers.
    
    Args:
        test_files: List of test file paths to analyze
        project_root: Root directory of the project
        
    Returns:
        List of test file paths that are obsolete
        
    Requirements: 2.1, 2.2
    """
    obsolete_tests = []
    
    for test_file in test_files:
        is_obsolete = False
        
        # Check for deprecation markers
        if check_deprecation_markers(test_file):
            is_obsolete = True
        
        # Check if imported modules exist
        imports = extract_imports(test_file)
        for module_name in imports:
            # Skip standard library and common test modules
            if module_name.startswith(('pytest', 'unittest', 'test_', 'tests')):
                continue
            
            if not check_module_exists(module_name, project_root):
                is_obsolete = True
                break
        
        if is_obsolete:
            obsolete_tests.append(str(test_file))
    
    return obsolete_tests


def analyze_test_obsolescence(
    test_files: List[Path],
    project_root: Path = None
) -> dict:
    """
    Analyze tests for obsolescence and provide detailed reasons.
    
    Args:
        test_files: List of test file paths to analyze
        project_root: Root directory of the project
        
    Returns:
        Dictionary mapping test files to obsolescence reasons
        
    Requirements: 2.1, 2.2
    """
    results = {}
    
    for test_file in test_files:
        reasons = []
        
        # Check for deprecation markers
        if check_deprecation_markers(test_file):
            reasons.append("Contains deprecation markers")
        
        # Check for missing imports
        imports = extract_imports(test_file)
        missing_imports = []
        for module_name in imports:
            # Skip standard library and common test modules
            if module_name.startswith(('pytest', 'unittest', 'test_', 'tests')):
                continue
            
            if not check_module_exists(module_name, project_root):
                missing_imports.append(module_name)
        
        if missing_imports:
            reasons.append(f"Missing imports: {', '.join(missing_imports)}")
        
        if reasons:
            results[str(test_file)] = {
                'is_obsolete': True,
                'reasons': reasons
            }
        else:
            results[str(test_file)] = {
                'is_obsolete': False,
                'reasons': []
            }
    
    return results
