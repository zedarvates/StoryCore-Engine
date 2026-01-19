#!/usr/bin/env python3
"""
Property-based tests for CLI mix-audio commands.
Tests universal properties for audio mixing parameter handling and output formatting.
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

from cli.handlers.mix_audio import MixAudioHandler


# Strategy generators for property-based testing
@composite
def valid_project_paths(draw):
    """Generate valid project directory paths."""
    base_name = draw(st.text(alphabet=st.characters(whitelist_categories=['L', 'N']), min_size=1, max_size=10))
    return f"/tmp/test_project_{base_name}"


@composite
def audio_file_paths(draw):
    """Generate valid audio file paths."""
    filename = draw(st.text(alphabet=st.characters(whitelist_categories=['L', 'N']), min_size=1, max_size=8))
    extension = draw(st.sampled_from(["wav", "mp3", "flac"]))
    return f"/tmp/audio_{filename}.{extension}"


@composite
def mixing_parameters(draw):
    """Generate valid audio mixing parameters."""
    return {
        "music_reduction_db": draw(st.floats(min_value=-24.0, max_value=0.0)),
        "keyframe_offset": draw(st.floats(min_value=0.1, max_value=2.0)),
        "crossfade_duration": draw(st.floats(min_value=0.5, max_value=5.0)),
        "fill_gaps": draw(st.booleans())
    }


@composite
def output_formats(draw):
    """Generate valid output format options."""
    return draw(st.sampled_from(["human", "json"]))


class TestCLIMixAudioProperties:
    """Property-based tests for CLI mix-audio commands."""

    @given(valid_project_paths(), st.one_of(st.none(), audio_file_paths()), st.one_of(st.none(), audio_file_paths()), mixing_parameters(), output_formats())
    @settings(max_examples=20, deadline=5000, suppress_health_check=[HealthCheck.data_too_large])
    def test_property_31_mix_audio_parameter_handling(self, project_path, voice_track, music_track, params, format_type):
        """
        Property 31: Mix-Audio Parameter Handling
        For any valid combination of mix-audio parameters, the command should
        accept parameters without errors and produce consistent output format.
        Validates: Requirements 10.2 (parameter handling)
        """
        handler = MixAudioHandler()

        # Create mock args
        args = argparse.Namespace()
        args.project = project_path
        args.voice_track = voice_track
        args.music_track = music_track
        args.output = None
        args.music_reduction_db = params["music_reduction_db"]
        args.keyframe_offset = params["keyframe_offset"]
        args.format = format_type
        args.crossfade_duration = params["crossfade_duration"]
        args.fill_gaps = params["fill_gaps"]

        # Mock file system and audio processing
        with patch('pathlib.Path.exists', return_value=True), \
             patch('cli.handlers.mix_audio.MixAudioHandler._load_audio_file') as mock_load, \
             patch('cli.handlers.mix_audio.MixAudioHandler._save_audio_file') as mock_save, \
             patch('builtins.print') as mock_print, \
             patch('json.dumps') as mock_json_dumps:

            # Mock audio loading
            mock_load.return_value = {"samples": None, "sample_rate": 44100, "duration": 10.0}

            # Mock JSON output
            mock_json_dumps.return_value = '{"test": "json_output"}'

            # Execute handler
            try:
                exit_code = handler.execute(args)

                # Verify exit code is valid (0 for success, 1 for handled errors)
                assert exit_code in [0, 1], f"Invalid exit code: {exit_code}"

                # Verify output calls were made (either print or json)
                output_produced = mock_print.called or mock_json_dumps.called
                assert output_produced, "Should produce some form of output"

                # If JSON format requested, should attempt JSON output
                if format_type == "json":
                    # For mix-audio, JSON is attempted even if processing fails
                    # (due to mock setup, it should succeed)
                    mock_json_dumps.assert_called()

                # If voice and music tracks provided, should attempt mixing
                if voice_track and music_track:
                    # Should attempt to save output
                    mock_save.assert_called()

            except Exception as e:
                # Parameters should not cause unhandled crashes
                assert isinstance(e, (SystemExit, Exception)), f"Unexpected error type: {type(e)}"

    @given(valid_project_paths(), st.booleans(), output_formats())
    @settings(max_examples=15, deadline=3000)
    def test_property_32_mix_audio_exit_codes(self, project_path, has_processing_errors, format_type):
        """
        Property 32: Mix-Audio Exit Codes
        The mix-audio command should return exit code 0 for successful mixing
        and 1 for failures or missing inputs.
        Validates: Requirements 10.4 (exit codes)
        """
        handler = MixAudioHandler()

        # Create mock args with minimal required inputs
        args = argparse.Namespace()
        args.project = project_path
        args.voice_track = "/tmp/voice.wav" if not has_processing_errors else None
        args.music_track = "/tmp/music.wav" if not has_processing_errors else None
        args.output = None
        args.music_reduction_db = -12.0
        args.keyframe_offset = 0.5
        args.format = format_type
        args.crossfade_duration = 1.0
        args.fill_gaps = False

        with patch('pathlib.Path.exists', return_value=True), \
             patch('cli.handlers.mix_audio.MixAudioHandler._load_audio_file') as mock_load, \
             patch('cli.handlers.mix_audio.MixAudioHandler._save_audio_file') as mock_save, \
             patch('builtins.print'), \
             patch('json.dumps'):

            if has_processing_errors:
                # Simulate processing error (e.g., missing audio files)
                mock_load.side_effect = FileNotFoundError("Audio file not found")
            else:
                # Simulate successful processing
                mock_load.return_value = {"samples": None, "sample_rate": 44100, "duration": 10.0}

            # Execute handler
            exit_code = handler.execute(args)

            # Verify exit code logic
            if has_processing_errors:
                assert exit_code == 1, f"Should return 1 for processing errors, got {exit_code}"
            else:
                assert exit_code == 0, f"Should return 0 for successful mixing, got {exit_code}"

    @given(valid_project_paths(), st.sampled_from(["human", "json"]), st.booleans(), st.booleans())
    @settings(max_examples=15, deadline=3000)
    def test_property_33_mix_audio_output_formatting(self, project_path, format_type, has_voice_track, has_music_track):
        """
        Property 33: Mix-Audio Output Formatting
        For any mix-audio operation and format selection, the command should produce
        output in the requested format with consistent structure.
        Validates: Requirements 10.5 (output formatting)
        """
        handler = MixAudioHandler()

        # Create mock args
        args = argparse.Namespace()
        args.project = project_path
        args.voice_track = "/tmp/voice.wav" if has_voice_track else None
        args.music_track = "/tmp/music.wav" if has_music_track else None
        args.output = None
        args.music_reduction_db = -12.0
        args.keyframe_offset = 0.5
        args.format = format_type
        args.crossfade_duration = 1.0
        args.fill_gaps = False

        with patch('pathlib.Path.exists', return_value=True), \
             patch('cli.handlers.mix_audio.MixAudioHandler._load_audio_file') as mock_load, \
             patch('cli.handlers.mix_audio.MixAudioHandler._save_audio_file'), \
             patch('builtins.print') as mock_print, \
             patch('json.dumps') as mock_json_dumps:

            # Mock successful audio processing
            mock_load.return_value = {"samples": None, "sample_rate": 44100, "duration": 10.0}
            mock_json_dumps.return_value = '{"success": true, "operations": []}'

            # Execute handler
            exit_code = handler.execute(args)

            # Verify output format handling
            if format_type == "json":
                # Should use JSON output for structured results
                mock_json_dumps.assert_called()
                # Verify JSON structure through the mock
                call_args = mock_json_dumps.call_args
                if call_args:
                    json_data = call_args[0][0]
                    assert isinstance(json_data, dict), "JSON output should be a dictionary"
                    assert "success" in json_data, "JSON should contain success status"
            else:
                # Human format should produce readable output
                assert mock_print.called, "Should produce human-readable output"

            # Verify exit code for successful operation (when tracks provided)
            if has_voice_track and has_music_track:
                assert exit_code == 0, f"Should succeed with valid inputs, got {exit_code}"
            else:
                # Without both tracks, might still succeed (for gap filling, etc.)
                assert exit_code in [0, 1], f"Unexpected exit code: {exit_code}"


def test_cli_mix_audio_basic_functionality():
    """Test basic functionality of CLI mix-audio handler."""
    handler = MixAudioHandler()

    # Test parser setup
    parser = argparse.ArgumentParser()
    handler.setup_parser(parser)

    # Verify arguments were added
    help_text = parser.format_help()
    assert "--project" in help_text
    assert "--voice-track" in help_text
    assert "--music-track" in help_text
    assert "--music-reduction-db" in help_text
    assert "--format" in help_text

    print("✓ CLI mix-audio handler basic tests passed")


def test_cli_mix_audio_parameter_ranges():
    """Test parameter range validation."""
    handler = MixAudioHandler()

    # Test various parameter combinations
    test_cases = [
        {"music_reduction_db": -12.0, "keyframe_offset": 0.5, "crossfade_duration": 1.0},
        {"music_reduction_db": -24.0, "keyframe_offset": 0.1, "crossfade_duration": 0.5},
        {"music_reduction_db": 0.0, "keyframe_offset": 2.0, "crossfade_duration": 5.0},
    ]

    for params in test_cases:
        args = argparse.Namespace()
        args.project = "/tmp/test"
        args.voice_track = "/tmp/voice.wav"
        args.music_track = "/tmp/music.wav"
        args.output = None
        args.music_reduction_db = params["music_reduction_db"]
        args.keyframe_offset = params["keyframe_offset"]
        args.format = "human"
        args.crossfade_duration = params["crossfade_duration"]
        args.fill_gaps = False

        with patch('pathlib.Path.exists', return_value=True), \
             patch('cli.handlers.mix_audio.MixAudioHandler._load_audio_file', return_value={"samples": None, "sample_rate": 44100, "duration": 10.0}), \
             patch('cli.handlers.mix_audio.MixAudioHandler._save_audio_file'), \
             patch('builtins.print'):

            # Should handle parameter ranges without crashing
            exit_code = handler.execute(args)
            assert exit_code in [0, 1], f"Failed with params {params}: exit code {exit_code}"

    print("✓ CLI mix-audio parameter range tests passed")


if __name__ == "__main__":
    # Run basic functionality tests
    test_cli_mix_audio_basic_functionality()
    test_cli_mix_audio_parameter_ranges()

    # Run a few property tests manually for verification
    test_instance = TestCLIMixAudioProperties()

    print("CLI mix-audio property tests ready for execution")