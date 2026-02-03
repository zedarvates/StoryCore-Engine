"""
Test cleanup engine.

This package provides functionality for cleaning up test suites, including
removing obsolete tests, rewriting fragile tests, consolidating duplicates,
and extracting fixtures.
"""

from test_cleanup.cleanup.test_removal import (
    safe_remove_test_file,
    create_removal_log_entry,
    remove_obsolete_test,
    remove_obsolete_tests_batch,
    create_backup,
    remove_with_backup
)

from test_cleanup.cleanup.fragile_classification import (
    is_fragile,
    classify_fragile_test,
    classify_fragile_tests,
    mark_test_as_fragile,
    classify_and_mark_fragile_tests,
    get_fragile_test_report,
    filter_tests_by_fragility
)

from test_cleanup.cleanup.fragile_rewriting import (
    NonDeterministicPattern,
    detect_sleep_calls,
    detect_random_calls,
    detect_external_calls,
    detect_global_state,
    detect_all_non_deterministic_patterns,
    suggest_sleep_replacement,
    suggest_random_replacement,
    suggest_external_call_replacement,
    suggest_global_state_replacement,
    generate_rewrite_suggestions,
    analyze_test_for_rewriting,
    create_rewrite_log_entry,
    generate_rewrite_report
)

from test_cleanup.cleanup.duplicate_consolidation import (
    extract_assertions_from_test,
    extract_all_assertions_from_file,
    get_unique_assertions,
    extract_test_docstring,
    extract_test_setup,
    generate_merged_test_name,
    generate_merged_test_code,
    consolidate_duplicate_tests,
    consolidate_multiple_groups,
    preview_consolidation
)

from test_cleanup.cleanup.fixture_extraction import (
    SetupPattern,
    extract_setup_code_from_test,
    extract_all_setup_code,
    identify_repeated_setup,
    generate_pytest_fixture,
    generate_vitest_before_each,
    suggest_fixture_name,
    generate_fixture_file,
    update_test_to_use_fixture,
    extract_fixtures_from_tests,
    analyze_fixture_opportunities
)

__all__ = [
    'safe_remove_test_file',
    'create_removal_log_entry',
    'remove_obsolete_test',
    'remove_obsolete_tests_batch',
    'create_backup',
    'remove_with_backup',
    'is_fragile',
    'classify_fragile_test',
    'classify_fragile_tests',
    'mark_test_as_fragile',
    'classify_and_mark_fragile_tests',
    'get_fragile_test_report',
    'filter_tests_by_fragility',
    'NonDeterministicPattern',
    'detect_sleep_calls',
    'detect_random_calls',
    'detect_external_calls',
    'detect_global_state',
    'detect_all_non_deterministic_patterns',
    'suggest_sleep_replacement',
    'suggest_random_replacement',
    'suggest_external_call_replacement',
    'suggest_global_state_replacement',
    'generate_rewrite_suggestions',
    'analyze_test_for_rewriting',
    'create_rewrite_log_entry',
    'generate_rewrite_report',
    'extract_assertions_from_test',
    'extract_all_assertions_from_file',
    'get_unique_assertions',
    'extract_test_docstring',
    'extract_test_setup',
    'generate_merged_test_name',
    'generate_merged_test_code',
    'consolidate_duplicate_tests',
    'consolidate_multiple_groups',
    'preview_consolidation',
    'SetupPattern',
    'extract_setup_code_from_test',
    'extract_all_setup_code',
    'identify_repeated_setup',
    'generate_pytest_fixture',
    'generate_vitest_before_each',
    'suggest_fixture_name',
    'generate_fixture_file',
    'update_test_to_use_fixture',
    'extract_fixtures_from_tests',
    'analyze_fixture_opportunities'
]
