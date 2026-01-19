#!/usr/bin/env python3
"""
Property-based tests for Audio Quality Validator.
Tests universal properties that should hold for audio quality assessment.
"""

import pytest
import numpy as np
from pathlib import Path
from hypothesis import given, strategies as st, settings, assume, HealthCheck
from hypothesis.strategies import composite

# Import the modules to test
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from quality_validator import QualityValidator


# Strategy generators for property-based testing
@composite
def valid_audio_clip(draw):
    """Generate valid audio clips for testing."""
    sample_rate = draw(st.sampled_from([22050, 44100]))  # Common sample rates
    duration = draw(st.floats(min_value=0.01, max_value=0.1))  # Very short clips for property testing
    length = int(sample_rate * duration)

    # Generate mono audio data
    audio_data = draw(st.lists(
        st.floats(min_value=-1.0, max_value=1.0),
        min_size=length,
        max_size=length
    ))

    return {
        'data': np.array(audio_data, dtype=np.float32),
        'rate': sample_rate
    }


@composite
def metallic_audio_clip(draw):
    """Generate audio clips with artificial metallic characteristics."""
    sample_rate = 22050
    duration = draw(st.floats(min_value=0.01, max_value=0.1))
    length = int(sample_rate * duration)

    # Generate base audio with metallic artifacts
    t = np.linspace(0, duration, length, endpoint=False)
    base_freq = 200  # Hz

    # Create metallic sound with sharp harmonics
    audio_data = np.sin(2 * np.pi * base_freq * t)
    for harmonic in [3, 5, 7]:  # Odd harmonics for metallic sound
        audio_data += 0.3 * np.sin(2 * np.pi * base_freq * harmonic * t)

    # Add formant-like peaks
    formant_freqs = [800, 1800, 2800]  # Typical formants
    for f in formant_freqs:
        audio_data += 0.5 * np.sin(2 * np.pi * f * t) * np.exp(-t / duration)  # Decaying

    # Normalize
    audio_data = audio_data / np.max(np.abs(audio_data))

    return {
        'data': audio_data.astype(np.float32),
        'rate': sample_rate
    }


@composite
def noisy_audio_clip(draw):
    """Generate audio clips with noise for clarity testing."""
    sample_rate = 22050
    duration = draw(st.floats(min_value=0.01, max_value=0.1))
    length = int(sample_rate * duration)

    # Generate clean signal
    t = np.linspace(0, duration, length, endpoint=False)
    signal = 0.8 * np.sin(2 * np.pi * 440 * t)  # A note

    # Add noise
    noise_level = draw(st.floats(min_value=0.1, max_value=0.8))
    noise = noise_level * np.random.normal(0, 1, length)

    audio_data = signal + noise
    audio_data = audio_data / np.max(np.abs(audio_data))  # Normalize

    return {
        'data': audio_data.astype(np.float32),
        'rate': sample_rate
    }


@composite
def audio_clip_with_gaps(draw):
    """Generate audio clips containing silence gaps."""
    sample_rate = 22050
    total_duration = draw(st.floats(min_value=0.1, max_value=0.2))
    length = int(sample_rate * total_duration)

    # Generate base audio
    t = np.linspace(0, total_duration, length, endpoint=False)
    audio_data = 0.5 * np.sin(2 * np.pi * 300 * t)  # Continuous tone

    # Add gaps
    num_gaps = draw(st.integers(min_value=1, max_value=3))
    for _ in range(num_gaps):
        gap_start = draw(st.floats(min_value=0.01, max_value=total_duration - 0.01))
        gap_duration = draw(st.floats(min_value=0.005, max_value=min(0.02, total_duration - gap_start)))
        gap_end = min(gap_start + gap_duration, total_duration)

        start_idx = int(gap_start * sample_rate)
        end_idx = int(gap_end * sample_rate)
        audio_data[start_idx:end_idx] = 0.0  # Silence

    return {
        'data': audio_data.astype(np.float32),
        'rate': sample_rate
    }


class TestQualityValidatorAudioProperties:
    """Property-based tests for Audio Quality Validator."""

    @given(valid_audio_clip())
    @settings(max_examples=10, deadline=2000, suppress_health_check=[HealthCheck.data_too_large])
    def test_property_8_metallic_voice_detection(self, audio_clip):
        """
        Property 8: Metallic Voice Detection
        For any valid audio clip, metallic voice detection should return valid issue data
        with proper structure and AI artifact detection in formant structures.
        Validates: Requirements 3.1
        """
        validator = QualityValidator()

        # Detect metallic voice
        issues = validator.detect_metallic_voice(audio_clip)

        # Verify issues structure
        for issue in issues:
            assert 'issue_type' in issue, "Issue missing 'issue_type'"
            assert 'severity' in issue, "Issue missing 'severity'"
            assert 'description' in issue, "Issue missing 'description'"
            assert 'timestamp' in issue, "Issue missing 'timestamp'"
            assert 'metric_value' in issue, "Issue missing 'metric_value'"
            assert 'threshold_value' in issue, "Issue missing 'threshold_value'"

            # Verify data types and ranges
            assert isinstance(issue['issue_type'], str), "Issue type should be string"
            assert issue['severity'] in ['low', 'medium', 'high'], f"Invalid severity: {issue['severity']}"
            assert isinstance(issue['description'], str), "Description should be string"
            assert issue['timestamp'] >= 0.0, f"Invalid timestamp: {issue['timestamp']}"
            assert issue['metric_value'] >= 0.0, f"Invalid metric value: {issue['metric_value']}"

    @given(valid_audio_clip())
    @settings(max_examples=10, deadline=2000, suppress_health_check=[HealthCheck.data_too_large])
    def test_property_9_voice_quality_issue_reporting(self, audio_clip):
        """
        Property 9: Voice Quality Issue Reporting
        For any valid audio clip, voice quality analysis should return valid issue data
        with severity scores, timestamps, and corrective actions.
        Validates: Requirements 3.2, 3.3
        """
        validator = QualityValidator()

        # Analyze voice quality
        result = validator.analyze_voice_quality(audio_clip)

        # Verify result structure
        assert 'quality_score' in result, "Missing quality_score"
        assert 'issues' in result, "Missing issues"
        assert 'suggestions' in result, "Missing suggestions"
        assert 'metallic_issues' in result, "Missing metallic_issues count"
        assert 'clarity_score' in result, "Missing clarity_score"

        # Verify score bounds
        assert 0.0 <= result['quality_score'] <= 100.0, f"Quality score out of bounds: {result['quality_score']}"
        assert 0.0 <= result['clarity_score'] <= 100.0, f"Clarity score out of bounds: {result['clarity_score']}"

        # Verify issues structure
        for issue in result['issues']:
            assert 'type' in issue, "Issue missing 'type'"
            assert 'severity' in issue, "Issue missing 'severity'"
            assert 'description' in issue, "Issue missing 'description'"
            assert 'timestamp' in issue, "Issue missing 'timestamp'"
            assert 'metric_value' in issue, "Issue missing 'metric_value'"
            assert 'threshold_value' in issue, "Issue missing 'threshold_value'"

        # Verify suggestions structure
        for suggestion in result['suggestions']:
            assert 'id' in suggestion, "Suggestion missing 'id'"
            assert 'priority' in suggestion, "Suggestion missing 'priority'"
            assert 'action' in suggestion, "Suggestion missing 'action'"
            assert 'parameters' in suggestion, "Suggestion missing 'parameters'"
            assert 'expected_improvement' in suggestion, "Suggestion missing 'expected_improvement'"
            assert 'related_issues' in suggestion, "Suggestion missing 'related_issues'"

    @given(noisy_audio_clip())
    @settings(max_examples=10, deadline=2000)
    def test_property_10_voice_clarity_measurement(self, audio_clip):
        """
        Property 10: Voice Clarity Measurement
        For any audio clip, voice clarity measurement should return SNR-based scores
        with re-generation recommendations when clarity is low.
        Validates: Requirements 3.4, 3.5
        """
        validator = QualityValidator()

        # Measure voice clarity
        result = validator.measure_voice_clarity(audio_clip)

        # Verify result structure
        assert 'clarity_score' in result, "Missing clarity_score"
        assert 'snr' in result, "Missing snr"
        assert 'issues' in result, "Missing issues"
        assert 'recommendations' in result, "Missing recommendations"

        # Verify score bounds
        assert 0.0 <= result['clarity_score'] <= 100.0, f"Clarity score out of bounds: {result['clarity_score']}"

        # If clarity is very low, should have issues and recommendations
        if result['clarity_score'] < 30.0:
            assert len(result['issues']) > 0, "Low clarity should have issues"
            assert len(result['recommendations']) > 0, "Low clarity should have recommendations"

    @given(audio_clip_with_gaps())
    @settings(max_examples=10, deadline=2000)
    def test_property_15_gap_detection_with_context(self, audio_clip):
        """
        Property 15: Gap Detection with Context
        For any audio clip, gap detection should identify silence periods with precise timestamps
        and distinguish intentional vs problematic silence.
        Validates: Requirements 5.2, 5.4
        """
        validator = QualityValidator()

        # Detect audio gaps
        gaps = validator.detect_audio_gaps(audio_clip)

        # Verify gaps structure
        for gap in gaps:
            assert 'type' in gap, "Gap missing 'type'"
            assert 'severity' in gap, "Gap missing 'severity'"
            assert 'description' in gap, "Gap missing 'description'"
            assert 'timestamp' in gap, "Gap missing 'timestamp'"
            assert 'duration' in gap, "Gap missing 'duration'"
            assert 'end_timestamp' in gap, "Gap missing 'end_timestamp'"
            assert 'is_problematic' in gap, "Gap missing 'is_problematic'"

            # Verify data types and ranges
            assert isinstance(gap['type'], str), "Type should be string"
            assert gap['severity'] in ['low', 'medium', 'high'], f"Invalid severity: {gap['severity']}"
            assert isinstance(gap['description'], str), "Description should be string"
            assert gap['timestamp'] >= 0.0, f"Invalid timestamp: {gap['timestamp']}"
            assert gap['duration'] > 0.0, f"Invalid duration: {gap['duration']}"
            assert gap['end_timestamp'] > gap['timestamp'], "End timestamp should be after start"
            assert isinstance(gap['is_problematic'], bool), "is_problematic should be boolean"

    @given(audio_clip_with_gaps())
    @settings(max_examples=10, deadline=2000)
    def test_property_17_gap_report_calculations(self, audio_clip):
        """
        Property 17: Gap Report Calculations
        For any audio clip with gaps, gap report generation should calculate total duration
        and timeline percentage accurately.
        Validates: Requirements 5.5
        """
        validator = QualityValidator()

        # Detect gaps first
        gaps = validator.detect_audio_gaps(audio_clip)

        # Calculate total duration
        total_duration = len(audio_clip['data']) / audio_clip['rate']

        # Generate gap report
        report = validator.generate_gap_report(gaps, total_duration)

        # Verify report structure
        assert 'total_gap_duration' in report, "Missing total_gap_duration"
        assert 'gap_percentage' in report, "Missing gap_percentage"
        assert 'gap_count' in report, "Missing gap_count"
        assert 'problematic_gaps' in report, "Missing problematic_gaps"
        assert 'intentional_gaps' in report, "Missing intentional_gaps"
        assert 'gaps' in report, "Missing gaps list"

        # Verify calculations
        expected_total_gap = sum(gap['duration'] for gap in gaps)
        assert abs(report['total_gap_duration'] - expected_total_gap) < 0.01, "Total gap duration calculation incorrect"

        expected_percentage = (expected_total_gap / total_duration) * 100 if total_duration > 0 else 0.0
        assert abs(report['gap_percentage'] - expected_percentage) < 0.01, "Gap percentage calculation incorrect"

        assert report['gap_count'] == len(gaps), "Gap count incorrect"

        expected_problematic = sum(1 for gap in gaps if gap['is_problematic'])
        assert report['problematic_gaps'] == expected_problematic, "Problematic gaps count incorrect"

        expected_intentional = len(gaps) - expected_problematic
        assert report['intentional_gaps'] == expected_intentional, "Intentional gaps count incorrect"


def test_quality_validator_audio_basic_functionality():
    """Test basic functionality of audio quality validator."""
    validator = QualityValidator()

    # Create test audio clip
    sample_rate = 22050
    duration = 1.0
    length = int(sample_rate * duration)
    t = np.linspace(0, duration, length, endpoint=False)
    audio_data = 0.5 * np.sin(2 * np.pi * 440 * t)  # A note
    audio_clip = {'data': audio_data.astype(np.float32), 'rate': sample_rate}

    # Test metallic voice detection
    metallic_issues = validator.detect_metallic_voice(audio_clip)
    assert isinstance(metallic_issues, list)

    # Test voice clarity measurement
    clarity = validator.measure_voice_clarity(audio_clip)
    assert isinstance(clarity, dict)
    assert 'clarity_score' in clarity

    # Test gap detection
    gaps = validator.detect_audio_gaps(audio_clip)
    assert isinstance(gaps, list)

    # Test gap report
    total_duration = len(audio_data) / sample_rate
    report = validator.generate_gap_report(gaps, total_duration)
    assert isinstance(report, dict)

    # Test voice quality analysis
    result = validator.analyze_voice_quality(audio_clip)
    assert isinstance(result, dict)
    assert 'quality_score' in result

    print("✓ Audio quality validator basic tests passed")


if __name__ == "__main__":
    # Run basic functionality test
    test_quality_validator_audio_basic_functionality()

    # Run a few property tests manually for verification
    test_instance = TestQualityValidatorAudioProperties()

    print("Audio quality validator property tests ready for execution")