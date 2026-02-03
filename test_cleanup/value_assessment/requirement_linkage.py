"""
Requirement-linked test preservation.

This module parses test files for requirement tags/comments and marks
requirement-linked tests as protected from removal.
"""

import ast
import re
from pathlib import Path
from typing import Dict, List, Set


def parse_requirement_tags(test_file: Path) -> Dict[str, List[str]]:
    """
    Parse test file for requirement tags/comments.
    
    Looks for patterns like:
    - # Requirements: 1.2, 1.3
    - # Requirement: 5.4
    - # Validates: Requirements 1.2
    - @pytest.mark.requirement("1.2")
    - Docstrings containing "Requirements:" or "Validates:"
    
    Args:
        test_file: Path to test file
        
    Returns:
        Dictionary mapping test names to lists of requirement IDs
        
    Requirements: 5.5
    """
    if not test_file.exists():
        return {}
    
    try:
        with open(test_file, 'r', encoding='utf-8') as f:
            content = f.read()
        
        tree = ast.parse(content)
        requirement_map = {}
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name.startswith('test_'):
                test_name = node.name
                requirements = []
                
                # Check docstring
                docstring = ast.get_docstring(node)
                if docstring:
                    requirements.extend(_extract_requirements_from_text(docstring))
                
                # Check decorators
                for decorator in node.decorator_list:
                    if isinstance(decorator, ast.Call):
                        if hasattr(decorator.func, 'attr') and decorator.func.attr == 'requirement':
                            # @pytest.mark.requirement("1.2")
                            if decorator.args:
                                arg = decorator.args[0]
                                if isinstance(arg, ast.Constant):
                                    requirements.append(str(arg.value))
                
                # Check comments in the function (approximate - look at source lines)
                if hasattr(node, 'lineno'):
                    func_lines = content.split('\n')[node.lineno - 1:node.end_lineno]
                    for line in func_lines:
                        if '#' in line:
                            comment = line.split('#', 1)[1]
                            requirements.extend(_extract_requirements_from_text(comment))
                
                if requirements:
                    requirement_map[test_name] = list(set(requirements))  # Remove duplicates
        
        return requirement_map
    
    except (SyntaxError, UnicodeDecodeError):
        return {}


def _extract_requirements_from_text(text: str) -> List[str]:
    """
    Extract requirement IDs from text.
    
    Looks for patterns like:
    - Requirements: 1.2, 1.3
    - Requirement: 5.4
    - Validates: Requirements 1.2
    - Req 1.2
    
    Args:
        text: Text to search
        
    Returns:
        List of requirement IDs found
    """
    requirements = []
    
    # Pattern 1: "Requirements:" or "Requirement:" followed by IDs
    pattern1 = r'(?:Requirements?|Validates):\s*(?:Requirements?\s+)?([0-9., ]+)'
    matches = re.findall(pattern1, text, re.IGNORECASE)
    for match in matches:
        # Split by comma and extract individual IDs
        ids = re.findall(r'\d+\.\d+', match)
        requirements.extend(ids)
    
    # Pattern 2: "Req" followed by ID
    pattern2 = r'Req\s+(\d+\.\d+)'
    matches = re.findall(pattern2, text, re.IGNORECASE)
    requirements.extend(matches)
    
    return requirements


def mark_protected_tests(
    test_files: List[Path]
) -> Set[str]:
    """
    Mark requirement-linked tests as protected from removal.
    
    Args:
        test_files: List of test file paths to analyze
        
    Returns:
        Set of test names that are linked to requirements
        
    Requirements: 5.5
    """
    protected_tests = set()
    
    for test_file in test_files:
        requirement_map = parse_requirement_tags(test_file)
        protected_tests.update(requirement_map.keys())
    
    return protected_tests


def get_requirement_linkage_report(
    test_files: List[Path]
) -> Dict[str, dict]:
    """
    Generate a report of requirement linkage for all tests.
    
    Args:
        test_files: List of test file paths to analyze
        
    Returns:
        Dictionary mapping test names to their requirement linkage:
        {
            'test_name': {
                'file': str,
                'requirements': List[str],
                'is_protected': bool
            }
        }
        
    Requirements: 5.5
    """
    linkage_report = {}
    
    for test_file in test_files:
        requirement_map = parse_requirement_tags(test_file)
        
        for test_name, requirements in requirement_map.items():
            linkage_report[test_name] = {
                'file': str(test_file),
                'requirements': requirements,
                'is_protected': True
            }
    
    return linkage_report


def exclude_from_removal(
    removal_candidates: List[str],
    protected_tests: Set[str]
) -> List[str]:
    """
    Exclude protected tests from removal candidates.
    
    Args:
        removal_candidates: List of test names being considered for removal
        protected_tests: Set of test names that are protected
        
    Returns:
        Filtered list of removal candidates with protected tests excluded
        
    Requirements: 5.5
    """
    return [
        test_name
        for test_name in removal_candidates
        if test_name not in protected_tests
    ]
