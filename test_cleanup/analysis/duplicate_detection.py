"""
Duplicate test detection using AST analysis.

This module provides functions to identify duplicate or similar tests by analyzing
their structure, names, and assertions.
"""

from pathlib import Path
from typing import List, Set, Dict
import ast
from test_cleanup.models import TestGroup


def extract_test_functions(file_path: Path) -> List[Dict]:
    """
    Extract test functions from a Python test file using AST.
    
    Args:
        file_path: Path to the test file
        
    Returns:
        List of dictionaries containing test function information
    """
    if not file_path.exists():
        return []
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            source = f.read()
        
        tree = ast.parse(source)
        test_functions = []
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # Check if it's a test function
                if node.name.startswith('test_'):
                    # Extract assertions
                    assertions = []
                    for child in ast.walk(node):
                        if isinstance(child, ast.Assert):
                            assertions.append(ast.unparse(child))
                    
                    test_functions.append({
                        'name': node.name,
                        'file': str(file_path),
                        'assertions': assertions,
                        'line_count': len(node.body)
                    })
        
        return test_functions
    except (SyntaxError, UnicodeDecodeError):
        return []


def calculate_name_similarity(name1: str, name2: str) -> float:
    """
    Calculate similarity between two test names.
    
    Uses simple string matching to determine similarity.
    
    Args:
        name1: First test name
        name2: Second test name
        
    Returns:
        Similarity score between 0.0 and 1.0
    """
    if name1 == name2:
        return 1.0
    
    # Convert to lowercase for comparison
    name1_lower = name1.lower()
    name2_lower = name2.lower()
    
    # Calculate longest common substring ratio
    longer = max(len(name1_lower), len(name2_lower))
    if longer == 0:
        return 0.0
    
    # Simple approach: count matching characters
    matches = sum(1 for a, b in zip(name1_lower, name2_lower) if a == b)
    
    return matches / longer


def calculate_assertion_similarity(assertions1: List[str], assertions2: List[str]) -> float:
    """
    Calculate similarity between two sets of assertions.
    
    Args:
        assertions1: List of assertion strings from first test
        assertions2: List of assertion strings from second test
        
    Returns:
        Similarity score between 0.0 and 1.0
    """
    if not assertions1 and not assertions2:
        return 1.0
    
    if not assertions1 or not assertions2:
        return 0.0
    
    # Convert to sets for comparison
    set1 = set(assertions1)
    set2 = set(assertions2)
    
    # Calculate Jaccard similarity
    intersection = len(set1 & set2)
    union = len(set1 | set2)
    
    if union == 0:
        return 0.0
    
    return intersection / union


def find_similar_tests(
    test_functions: List[Dict],
    name_threshold: float = 0.7,
    assertion_threshold: float = 0.5
) -> List[TestGroup]:
    """
    Find groups of similar tests based on names and assertions.
    
    Args:
        test_functions: List of test function dictionaries
        name_threshold: Minimum name similarity to consider tests similar
        assertion_threshold: Minimum assertion similarity to consider tests similar
        
    Returns:
        List of TestGroup objects containing similar tests
        
    Requirements: 1.3, 4.1
    """
    similar_groups = []
    processed = set()
    
    for i, test1 in enumerate(test_functions):
        if i in processed:
            continue
        
        group_tests = [f"{test1['file']}::{test1['name']}"]
        shared_assertions = set(test1['assertions'])
        
        for j, test2 in enumerate(test_functions[i+1:], start=i+1):
            if j in processed:
                continue
            
            # Calculate similarities
            name_sim = calculate_name_similarity(test1['name'], test2['name'])
            assertion_sim = calculate_assertion_similarity(
                test1['assertions'],
                test2['assertions']
            )
            
            # Check if tests are similar enough
            if name_sim >= name_threshold or assertion_sim >= assertion_threshold:
                group_tests.append(f"{test2['file']}::{test2['name']}")
                shared_assertions &= set(test2['assertions'])
                processed.add(j)
        
        # Only create group if we found similar tests
        if len(group_tests) > 1:
            # Calculate overall similarity score
            similarity_score = 0.8  # Placeholder, would calculate based on all pairs
            
            test_group = TestGroup(
                tests=group_tests,
                similarity_score=similarity_score,
                shared_assertions=list(shared_assertions)
            )
            similar_groups.append(test_group)
            processed.add(i)
    
    return similar_groups


def detect_duplicates_in_files(
    test_files: List[Path],
    name_threshold: float = 0.7,
    assertion_threshold: float = 0.5
) -> List[TestGroup]:
    """
    Detect duplicate tests across multiple test files.
    
    Args:
        test_files: List of test file paths to analyze
        name_threshold: Minimum name similarity threshold
        assertion_threshold: Minimum assertion similarity threshold
        
    Returns:
        List of TestGroup objects containing duplicate/similar tests
        
    Requirements: 1.3, 4.1
    """
    all_test_functions = []
    
    # Extract test functions from all files
    for test_file in test_files:
        functions = extract_test_functions(test_file)
        all_test_functions.extend(functions)
    
    # Find similar tests
    duplicate_groups = find_similar_tests(
        all_test_functions,
        name_threshold=name_threshold,
        assertion_threshold=assertion_threshold
    )
    
    return duplicate_groups


def identify_exact_duplicates(test_files: List[Path]) -> List[TestGroup]:
    """
    Identify tests with identical names (exact duplicates).
    
    Args:
        test_files: List of test file paths to analyze
        
    Returns:
        List of TestGroup objects containing exact duplicate tests
        
    Requirements: 1.3, 4.1
    """
    test_names = {}
    
    # Collect all test names
    for test_file in test_files:
        functions = extract_test_functions(test_file)
        for func in functions:
            name = func['name']
            full_name = f"{func['file']}::{name}"
            
            if name not in test_names:
                test_names[name] = []
            test_names[name].append({
                'full_name': full_name,
                'assertions': func['assertions']
            })
    
    # Find duplicates
    duplicate_groups = []
    
    for name, tests in test_names.items():
        if len(tests) > 1:
            # Get shared assertions
            shared_assertions = set(tests[0]['assertions'])
            for test in tests[1:]:
                shared_assertions &= set(test['assertions'])
            
            test_group = TestGroup(
                tests=[t['full_name'] for t in tests],
                similarity_score=1.0,  # Exact duplicates
                shared_assertions=list(shared_assertions)
            )
            duplicate_groups.append(test_group)
    
    return duplicate_groups
