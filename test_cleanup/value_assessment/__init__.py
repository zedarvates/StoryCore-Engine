"""
Value assessment and optimization module.

This module provides functionality for assessing test value and optimizing
test suite execution through unique coverage identification, value-based
removal recommendations, requirement linkage, and parallel execution configuration.
"""

from .unique_coverage import identify_unique_coverage_tests, mark_valuable_tests
from .removal_recommendations import recommend_tests_for_removal
from .requirement_linkage import parse_requirement_tags, mark_protected_tests
from .parallel_config import detect_parallel_tests, configure_parallel_execution

__all__ = [
    'identify_unique_coverage_tests',
    'mark_valuable_tests',
    'recommend_tests_for_removal',
    'parse_requirement_tags',
    'mark_protected_tests',
    'detect_parallel_tests',
    'configure_parallel_execution',
]
