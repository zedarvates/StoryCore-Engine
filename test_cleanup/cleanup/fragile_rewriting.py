"""
Fragile test rewriting.

This module provides functions to detect and rewrite fragile tests by
removing non-deterministic patterns and replacing them with deterministic
alternatives.
"""

from pathlib import Path
from typing import List, Dict, Optional, Tuple
import ast
import re
from datetime import datetime
from test_cleanup.models import CleanupAction, CleanupLog, TestMetrics


class NonDeterministicPattern:
    """Represents a non-deterministic pattern found in test code."""
    
    def __init__(self, pattern_type: str, line_number: int, code_snippet: str):
        self.pattern_type = pattern_type
        self.line_number = line_number
        self.code_snippet = code_snippet


def detect_sleep_calls(source_code: str) -> List[NonDeterministicPattern]:
    """
    Detect sleep/delay calls in test code.
    
    Args:
        source_code: Source code of the test file
        
    Returns:
        List of NonDeterministicPattern objects for sleep calls
        
    Requirements: 3.2
    """
    patterns = []
    lines = source_code.split('\n')
    
    sleep_patterns = [
        r'time\.sleep\(',
        r'asyncio\.sleep\(',
        r'sleep\(',
        r'delay\(',
        r'wait\('
    ]
    
    for i, line in enumerate(lines, start=1):
        for pattern in sleep_patterns:
            if re.search(pattern, line):
                patterns.append(NonDeterministicPattern(
                    pattern_type="sleep",
                    line_number=i,
                    code_snippet=line.strip()
                ))
                break
    
    return patterns


def detect_random_calls(source_code: str) -> List[NonDeterministicPattern]:
    """
    Detect random number generation in test code.
    
    Args:
        source_code: Source code of the test file
        
    Returns:
        List of NonDeterministicPattern objects for random calls
        
    Requirements: 3.2
    """
    patterns = []
    lines = source_code.split('\n')
    
    random_patterns = [
        r'random\.',
        r'randint\(',
        r'choice\(',
        r'shuffle\(',
        r'uuid\.uuid4\(',
        r'datetime\.now\(',
        r'time\.time\('
    ]
    
    for i, line in enumerate(lines, start=1):
        for pattern in random_patterns:
            if re.search(pattern, line):
                patterns.append(NonDeterministicPattern(
                    pattern_type="random",
                    line_number=i,
                    code_snippet=line.strip()
                ))
                break
    
    return patterns


def detect_external_calls(source_code: str) -> List[NonDeterministicPattern]:
    """
    Detect external API/network calls in test code.
    
    Args:
        source_code: Source code of the test file
        
    Returns:
        List of NonDeterministicPattern objects for external calls
        
    Requirements: 3.2
    """
    patterns = []
    lines = source_code.split('\n')
    
    external_patterns = [
        r'requests\.',
        r'urllib\.',
        r'http\.',
        r'fetch\(',
        r'\.get\(',
        r'\.post\(',
        r'\.put\(',
        r'\.delete\(',
        r'socket\.'
    ]
    
    for i, line in enumerate(lines, start=1):
        # Skip if line contains mock or patch
        if 'mock' in line.lower() or 'patch' in line.lower():
            continue
            
        for pattern in external_patterns:
            if re.search(pattern, line):
                patterns.append(NonDeterministicPattern(
                    pattern_type="external_call",
                    line_number=i,
                    code_snippet=line.strip()
                ))
                break
    
    return patterns


def detect_global_state(source_code: str) -> List[NonDeterministicPattern]:
    """
    Detect global state dependencies in test code.
    
    Args:
        source_code: Source code of the test file
        
    Returns:
        List of NonDeterministicPattern objects for global state
        
    Requirements: 3.3
    """
    patterns = []
    lines = source_code.split('\n')
    
    global_patterns = [
        r'global\s+\w+',
        r'os\.environ\[',
        r'sys\.',
        r'globals\(\)',
        r'locals\(\)'
    ]
    
    for i, line in enumerate(lines, start=1):
        for pattern in global_patterns:
            if re.search(pattern, line):
                patterns.append(NonDeterministicPattern(
                    pattern_type="global_state",
                    line_number=i,
                    code_snippet=line.strip()
                ))
                break
    
    return patterns


def detect_all_non_deterministic_patterns(source_code: str) -> Dict[str, List[NonDeterministicPattern]]:
    """
    Detect all non-deterministic patterns in test code.
    
    Args:
        source_code: Source code of the test file
        
    Returns:
        Dictionary mapping pattern types to lists of patterns
        
    Requirements: 3.2, 3.3
    """
    return {
        'sleep': detect_sleep_calls(source_code),
        'random': detect_random_calls(source_code),
        'external_call': detect_external_calls(source_code),
        'global_state': detect_global_state(source_code)
    }


def suggest_sleep_replacement(pattern: NonDeterministicPattern) -> str:
    """
    Suggest replacement for sleep calls.
    
    Args:
        pattern: NonDeterministicPattern for a sleep call
        
    Returns:
        Suggested replacement code
        
    Requirements: 3.2
    """
    return (
        "# Replace sleep with explicit wait or mock:\n"
        "# Option 1: Use pytest-mock to mock time-dependent behavior\n"
        "# Option 2: Use fixtures to set up state directly\n"
        "# Option 3: Use explicit polling with timeout"
    )


def suggest_random_replacement(pattern: NonDeterministicPattern) -> str:
    """
    Suggest replacement for random calls.
    
    Args:
        pattern: NonDeterministicPattern for a random call
        
    Returns:
        Suggested replacement code
        
    Requirements: 3.2
    """
    return (
        "# Replace random with deterministic values:\n"
        "# Option 1: Use fixed seed: random.seed(42)\n"
        "# Option 2: Use fixtures with predetermined values\n"
        "# Option 3: Mock random functions to return fixed values"
    )


def suggest_external_call_replacement(pattern: NonDeterministicPattern) -> str:
    """
    Suggest replacement for external calls.
    
    Args:
        pattern: NonDeterministicPattern for an external call
        
    Returns:
        Suggested replacement code
        
    Requirements: 3.2
    """
    return (
        "# Replace external call with mock:\n"
        "# Option 1: Use pytest-mock: mocker.patch('module.function')\n"
        "# Option 2: Use unittest.mock: @patch('module.function')\n"
        "# Option 3: Use responses library for HTTP mocking"
    )


def suggest_global_state_replacement(pattern: NonDeterministicPattern) -> str:
    """
    Suggest replacement for global state dependencies.
    
    Args:
        pattern: NonDeterministicPattern for global state
        
    Returns:
        Suggested replacement code
        
    Requirements: 3.3
    """
    return (
        "# Remove global state dependency:\n"
        "# Option 1: Use fixtures to set up isolated state\n"
        "# Option 2: Use monkeypatch to temporarily modify globals\n"
        "# Option 3: Refactor code to accept state as parameters"
    )


def generate_rewrite_suggestions(
    patterns: Dict[str, List[NonDeterministicPattern]]
) -> Dict[str, List[Dict]]:
    """
    Generate rewrite suggestions for all detected patterns.
    
    Args:
        patterns: Dictionary of detected patterns by type
        
    Returns:
        Dictionary of suggestions by pattern type
        
    Requirements: 3.2, 3.3
    """
    suggestions = {}
    
    suggestion_functions = {
        'sleep': suggest_sleep_replacement,
        'random': suggest_random_replacement,
        'external_call': suggest_external_call_replacement,
        'global_state': suggest_global_state_replacement
    }
    
    for pattern_type, pattern_list in patterns.items():
        if pattern_list and pattern_type in suggestion_functions:
            suggestions[pattern_type] = [
                {
                    'line_number': p.line_number,
                    'code_snippet': p.code_snippet,
                    'suggestion': suggestion_functions[pattern_type](p)
                }
                for p in pattern_list
            ]
    
    return suggestions


def analyze_test_for_rewriting(test_file: Path) -> Tuple[bool, Dict]:
    """
    Analyze a test file to determine if it needs rewriting.
    
    Args:
        test_file: Path to the test file
        
    Returns:
        Tuple of (needs_rewriting: bool, analysis_results: dict)
        
    Requirements: 3.2, 3.3
    """
    if not test_file.exists():
        return False, {'error': 'File does not exist'}
    
    try:
        with open(test_file, 'r', encoding='utf-8') as f:
            source_code = f.read()
    except Exception as e:
        return False, {'error': f'Failed to read file: {str(e)}'}
    
    patterns = detect_all_non_deterministic_patterns(source_code)
    
    # Check if any patterns were found
    total_patterns = sum(len(p) for p in patterns.values())
    needs_rewriting = total_patterns > 0
    
    suggestions = generate_rewrite_suggestions(patterns)
    
    return needs_rewriting, {
        'patterns': patterns,
        'suggestions': suggestions,
        'total_issues': total_patterns
    }


def create_rewrite_log_entry(
    test_name: str,
    patterns_found: Dict[str, List[NonDeterministicPattern]],
    cleanup_log: CleanupLog,
    before_metrics: Optional[TestMetrics] = None
) -> CleanupAction:
    """
    Create a log entry for a test rewrite action.
    
    Args:
        test_name: Name of the test being rewritten
        patterns_found: Dictionary of patterns found in the test
        cleanup_log: CleanupLog to record the action
        before_metrics: Optional metrics before rewriting
        
    Returns:
        CleanupAction documenting the rewrite
        
    Requirements: 3.5
    """
    pattern_summary = []
    for pattern_type, patterns in patterns_found.items():
        if patterns:
            pattern_summary.append(f"{len(patterns)} {pattern_type} pattern(s)")
    
    reason = f"Rewritten to remove non-deterministic patterns: {', '.join(pattern_summary)}"
    
    action = CleanupAction(
        action_type="rewrite",
        test_name=test_name,
        reason=reason,
        timestamp=datetime.now(),
        before_metrics=before_metrics,
        after_metrics=None
    )
    
    cleanup_log.actions.append(action)
    cleanup_log.total_rewritten += 1
    
    return action


def generate_rewrite_report(test_file: Path, output_path: Path) -> bool:
    """
    Generate a detailed rewrite report for a test file.
    
    Args:
        test_file: Path to the test file to analyze
        output_path: Path where the report should be saved
        
    Returns:
        True if report was generated successfully
        
    Requirements: 3.2, 3.3
    """
    needs_rewriting, analysis = analyze_test_for_rewriting(test_file)
    
    if 'error' in analysis:
        return False
    
    report = {
        'test_file': str(test_file),
        'needs_rewriting': needs_rewriting,
        'total_issues': analysis.get('total_issues', 0),
        'patterns': {},
        'suggestions': analysis.get('suggestions', {})
    }
    
    # Convert patterns to serializable format
    for pattern_type, patterns in analysis.get('patterns', {}).items():
        report['patterns'][pattern_type] = [
            {
                'line_number': p.line_number,
                'code_snippet': p.code_snippet
            }
            for p in patterns
        ]
    
    try:
        import json
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2)
        return True
    except Exception:
        return False
