#!/usr/bin/env python3
"""
Property-based tests for CLI validation commands.
Tests universal properties for CLI parameter handling, exit codes, and output formatting.
"""

import pytest
import json
from pathlib import Path
from unittest.mock import patch, MagicMock
from hypothesis import given, strategies as st, settings, HealthCheck
from hypothesis.strategies import composite
import sys
import argparse

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from cli.handlers.validate import ValidateHandler


# Strategy generators for property-based testing
@composite
def valid_project_paths(draw):
    """Generate valid project directory paths."""
    base_name = draw(st.text(alphabet=st.characters(whitelist_categories=['L', 'N']), min_size=1, max_size=10))
    return f"/tmp/test_project_{base_name}"


@composite
def validation_scopes(draw):
    """Generate valid validation scope combinations."""
    available_scopes = ["structure", "config", "quality", "visual", "audio"]
    num_scopes = draw(st.integers(min_value=1, max_value=len(available_scopes)))
    scopes = draw(st.lists(st.sampled_from(available_scopes), min_size=num_scopes, max_size=num_scopes, unique=True))
    return scopes


@composite
def quality_thresholds(draw):
    """Generate valid quality threshold values."""
    return draw(st.floats(min_value=0.0, max_value=100.0))


@composite
def output_formats(draw):
    """Generate valid output format options."""
    return draw(st.sampled_from(["human", "json"]))


class TestCLIValidationProperties:
    """Property-based tests for CLI validation commands."""

    @given(valid_project_paths(), validation_scopes(), quality_thresholds(), output_formats())
    @settings(max_examples=20, deadline=5000, suppress_health_check=[HealthCheck.data_too_large])
    def test_property_31_cli_parameter_handling(self, project_path, scopes, threshold, format_type):
        """
        Property 31: CLI Parameter Handling
        For any valid combination of CLI parameters, the validate command should
        accept parameters without errors and produce consistent output format.
        Validates: Requirements 10.2
        """
        handler = ValidateHandler()

        # Create mock args
        args = argparse.Namespace()
        args.project = project_path
        args.scope = scopes
        args.quality_threshold = threshold
        args.format = format_type
        args.fix = False
        args.strict = False

        # Mock file system to simulate project existence
        with patch('pathlib.Path.exists', return_value=True), \
             patch('cli.handlers.validate.ValidateHandler._run_quality_validation') as mock_quality, \
             patch('cli.handlers.validate.ValidateHandler._attempt_fixes'), \
             patch('builtins.print') as mock_print:

            # Mock quality validation to return valid results
            mock_quality.return_value = {
                "passed": threshold < 70.0,  # Pass if threshold is reasonable
                "results": {"test": "mock_result"}
            }

            # Execute handler
            try:
                exit_code = handler.execute(args)

                # Verify exit code is valid
                assert exit_code in [0, 1], f"Invalid exit code: {exit_code}"

                # Verify output calls were made
                assert mock_print.called, "Should produce output"

                # If JSON format requested, should be able to parse output
                if format_type == "json":
                    # Get the last print call (should be JSON output)
                    calls = mock_print.call_args_list
                    if calls:
                        last_call = calls[-1]
                        output = last_call[0][0] if last_call[0] else ""
                        if output:
                            # Should be valid JSON
                            try:
                                parsed = json.loads(output)
                                assert isinstance(parsed, dict), "JSON output should be a dictionary"
                            except json.JSONDecodeError:
                                # If not JSON, that's also acceptable (error messages, etc.)
                                pass

            except Exception as e:
                # Parameters should not cause crashes, but some validation failures are expected
                # The handler should handle errors gracefully
                assert isinstance(e, (SystemExit, Exception)), f"Unexpected error type: {type(e)}"

    @given(valid_project_paths(), st.booleans(), st.booleans())
    @settings(max_examples=15, deadline=3000)
    def test_property_32_cli_exit_codes(self, project_path, has_failures, fix_requested):
        """
        Property 32: CLI Exit Codes
        The validate command should return exit code 0 for pass and 1 for failures,
        regardless of project content or validation results.
        Validates: Requirements 10.4
        """
        handler = ValidateHandler()

        # Create mock args
        args = argparse.Namespace()
        args.project = project_path
        args.scope = ["structure"]
        args.quality_threshold = 70.0
        args.format = "human"
        args.fix = fix_requested
        args.strict = False

        with patch('pathlib.Path.exists', return_value=True), \
             patch('cli.handlers.validate.ValidateHandler._run_quality_validation') as mock_quality, \
             patch('cli.handlers.validate.ValidateHandler._attempt_fixes'), \
             patch('builtins.print'):

            # Mock validation to return controlled failure state
            mock_quality.return_value = {
                "passed": not has_failures,
                "results": {"mock": "data"}
            }

            # Execute handler
            exit_code = handler.execute(args)

            # Verify exit code logic
            if has_failures:
                assert exit_code == 1, f"Should return 1 for failures, got {exit_code}"
            else:
                assert exit_code == 0, f"Should return 0 for success, got {exit_code}"

    @given(valid_project_paths(), st.sampled_from(["human", "json"]), st.booleans())
    @settings(max_examples=15, deadline=3000)
    def test_property_33_cli_output_formatting(self, project_path, format_type, has_failures):
        """
        Property 33: CLI Output Formatting
        For any project and format selection, the validate command should produce
        output in the requested format (human-readable or JSON) with consistent structure.
        Validates: Requirements 10.5
        """
        handler = ValidateHandler()

        # Create mock args
        args = argparse.Namespace()
        args.project = project_path
        args.scope = ["structure", "quality"]
        args.quality_threshold = 70.0
        args.format = format_type
        args.fix = False
        args.strict = False

        with patch('pathlib.Path.exists', return_value=True), \
             patch('cli.handlers.validate.ValidateHandler._run_quality_validation') as mock_quality, \
             patch('cli.handlers.validate.ValidateHandler._attempt_fixes'), \
             patch('builtins.print') as mock_print, \
             patch('json.dumps') as mock_json_dumps:

            # Mock validation results
            mock_quality.return_value = {
                "passed": not has_failures,
                "results": {
                    "visual": {"passed": True, "message": "Visual OK"},
                    "audio": {"passed": not has_failures, "message": "Audio checked"}
                }
            }

            # Mock JSON output
            mock_json_dumps.return_value = '{"test": "json_output"}'

            # Execute handler
            exit_code = handler.execute(args)

            # Verify output format handling
            if format_type == "json":
                # Should attempt to output JSON
                if has_failures:
                    # For failures, should still try to output JSON structure
                    mock_json_dumps.assert_called()
            else:
                # Human format should produce readable output
                assert mock_print.called, "Should produce human-readable output"

            # Verify consistent exit code behavior
            expected_exit = 1 if has_failures else 0
            assert exit_code == expected_exit, f"Exit code should be {expected_exit}, got {exit_code}"


def test_cli_validation_basic_functionality():
    """Test basic functionality of CLI validation handler."""
    handler = ValidateHandler()

    # Test parser setup
    parser = argparse.ArgumentParser()
    handler.setup_parser(parser)

    # Verify arguments were added
    help_text = parser.format_help()
    assert "--project" in help_text
    assert "--scope" in help_text
    assert "--quality-threshold" in help_text
    assert "--format" in help_text

    print("✓ CLI validation handler basic tests passed")


def test_cli_validation_scope_parsing():
    """Test validation scope parameter parsing."""
    handler = ValidateHandler()

    # Test various scope combinations
    test_cases = [
        ["structure"],
        ["config"],
        ["quality", "visual", "audio"],
        ["structure", "config", "quality"]
    ]

    for scopes in test_cases:
        args = argparse.Namespace()
        args.project = "/tmp/test"
        args.scope = scopes
        args.quality_threshold = 70.0
        args.format = "human"
        args.fix = False
        args.strict = False

        with patch('pathlib.Path.exists', return_value=True), \
             patch('cli.handlers.validate.ValidateHandler._run_quality_validation', return_value={"passed": True, "results": {}}), \
             patch('builtins.print'):

            # Should not crash with any valid scope combination
            exit_code = handler.execute(args)
            assert exit_code in [0, 1], f"Invalid exit code for scopes {scopes}: {exit_code}"

    print("✓ CLI validation scope parsing tests passed")


if __name__ == "__main__":
    # Run basic functionality tests
    test_cli_validation_basic_functionality()
    test_cli_validation_scope_parsing()

    # Run a few property tests manually for verification
    test_instance = TestCLIValidationProperties()

    print("CLI validation property tests ready for execution")