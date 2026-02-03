"""
Test file discovery functionality for Python and TypeScript test suites.

This module provides functions to discover test files following framework-specific
naming conventions for pytest (Python) and vitest (TypeScript).
"""

from pathlib import Path
from typing import List, Set
import fnmatch


def find_python_test_files(test_dir: Path) -> List[Path]:
    """
    Find all Python test files in the specified directory.
    
    Follows pytest naming conventions:
    - test_*.py
    - *_test.py
    
    Args:
        test_dir: Root directory to search for Python test files
        
    Returns:
        List of Path objects for discovered test files
        
    Requirements: 8.1
    """
    if not test_dir.exists():
        return []
    
    test_files: Set[Path] = set()
    
    # Search for all .py files and filter by naming convention
    for py_file in test_dir.rglob('*.py'):
        filename = py_file.name
        # Check if it matches test_*.py pattern
        if filename.startswith('test_') and filename.endswith('.py'):
            test_files.add(py_file)
        # Check if it matches *_test.py pattern (but not just _test.py)
        elif filename.endswith('_test.py') and len(filename) > len('_test.py'):
            test_files.add(py_file)
    
    # Filter out __pycache__ and other non-test directories
    filtered_files = [
        f for f in test_files 
        if '__pycache__' not in str(f) and f.is_file()
    ]
    
    return sorted(filtered_files)


def find_typescript_test_files(test_dir: Path) -> List[Path]:
    """
    Find all TypeScript test files in the specified directory.
    
    Follows vitest naming conventions:
    - *.test.ts
    - *.test.tsx
    - *.spec.ts
    - *.spec.tsx
    
    Args:
        test_dir: Root directory to search for TypeScript test files
        
    Returns:
        List of Path objects for discovered test files
        
    Requirements: 9.1
    """
    if not test_dir.exists():
        return []
    
    test_files: Set[Path] = set()
    
    # Search for test files with various extensions
    patterns = ['*.test.ts', '*.test.tsx', '*.spec.ts', '*.spec.tsx']
    for pattern in patterns:
        test_files.update(test_dir.rglob(pattern))
    
    # Filter out node_modules and other non-test directories
    filtered_files = [
        f for f in test_files 
        if 'node_modules' not in str(f) and f.is_file()
    ]
    
    return sorted(filtered_files)


def discover_all_test_files(
    python_test_dir: Path = None,
    typescript_test_dir: Path = None
) -> dict:
    """
    Discover all test files in both Python and TypeScript test directories.
    
    Args:
        python_test_dir: Directory containing Python tests (default: tests/)
        typescript_test_dir: Directory containing TypeScript tests (default: creative-studio-ui/)
        
    Returns:
        Dictionary with 'python' and 'typescript' keys containing lists of test files
        
    Requirements: 8.1, 9.1
    """
    # Set default directories if not provided
    if python_test_dir is None:
        python_test_dir = Path('tests')
    if typescript_test_dir is None:
        typescript_test_dir = Path('creative-studio-ui')
    
    return {
        'python': find_python_test_files(python_test_dir),
        'typescript': find_typescript_test_files(typescript_test_dir),
        'total_python': len(find_python_test_files(python_test_dir)),
        'total_typescript': len(find_typescript_test_files(typescript_test_dir))
    }
