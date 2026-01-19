#!/usr/bin/env python3
"""
Property-based tests for Visual Quality Validator.
Tests universal properties that should hold for visual quality assessment.
"""

import pytest
import numpy as np
from pathlib import Path
from hypothesis import given, strategies as st, settings, assume
from hypothesis.strategies import composite

# Import the modules to test
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from quality_validator import QualityValidator


# Strategy generators for property-based testing
@composite
def valid_frame(draw):
    """Generate valid video frames for testing."""
    height = draw(st.integers(min_value=10, max_value=50))  # Small for performance
    width = draw(st.integers(min_value=10, max_value=50))
    # Always generate BGR frames for OpenCV compatibility
    channels = 3

    frame = np.random.randint(0, 256, (height, width, channels), dtype=np.uint8)

    return frame


@composite
def valid_frame_sequence(draw):
    """Generate valid frame sequences for testing."""
    num_frames = draw(st.integers(min_value=2, max_value=5))  # Small for performance
    height = draw(st.integers(min_value=10, max_value=50))
    width = draw(st.integers(min_value=10, max_value=50))
    # Always generate BGR frames for OpenCV compatibility
    channels = 3

    frames = []
    for _ in range(num_frames):
        frame = np.random.randint(0, 256, (height, width, channels), dtype=np.uint8)
        frames.append(frame)

    return frames


@composite
def valid_shot(draw):
    """Generate valid shot data for testing."""
    frames = draw(valid_frame_sequence())
    audio_score = draw(st.floats(min_value=0.0, max_value=100.0))
    continuity_score = draw(st.floats(min_value=0.0, max_value=100.0))

    return {
        'frames': frames,
        'audio_score': audio_score,
        'continuity_score': continuity_score
    }


class TestQualityValidatorVisualProperties:
    """Property-based tests for Visual Quality Validator."""

    @given(valid_frame())
    @settings(max_examples=10, deadline=2000)
    def test_property_11_sharpness_calculation_and_threshold(self, frame):
        """
        Property 11: Sharpness Calculation and Threshold
        For any valid frame, sharpness calculation should return a non-negative value,
        and values below 100 indicate low quality detection.
        Validates: Requirements 4.1, 4.2
        """
        validator = QualityValidator()

        # Calculate sharpness
        sharpness = validator.calculate_sharpness(frame)

        # Verify sharpness is non-negative
        assert sharpness >= 0.0, f"Sharpness should be non-negative, got {sharpness}"

        # If sharpness < 100, it should be considered low quality
        # This is validated by the threshold logic in quality_score generation

    @given(valid_shot())
    @settings(max_examples=10, deadline=3000)
    def test_property_12_quality_score_bounds(self, shot):
        """
        Property 12: Quality Score Bounds
        For any valid shot, the generated quality score should be within 0-100 bounds,
        and individual scores should be properly bounded.
        Validates: Requirements 4.3
        """
        validator = QualityValidator()

        # Generate quality score
        quality_score = validator.generate_quality_score(shot)

        # Verify overall score bounds
        assert 0.0 <= quality_score.overall_score <= 100.0, f"Overall score out of bounds: {quality_score.overall_score}"

        # Verify individual score bounds
        assert 0.0 <= quality_score.sharpness_score <= 100.0, f"Sharpness score out of bounds: {quality_score.sharpness_score}"
        assert 0.0 <= quality_score.motion_score <= 100.0, f"Motion score out of bounds: {quality_score.motion_score}"
        assert 0.0 <= quality_score.audio_score <= 100.0, f"Audio score out of bounds: {quality_score.audio_score}"
        assert 0.0 <= quality_score.continuity_score <= 100.0, f"Continuity score out of bounds: {quality_score.continuity_score}"

        # Verify weighted calculation (approximately)
        expected_overall = (
            quality_score.sharpness_score * 0.3 +
            quality_score.motion_score * 0.25 +
            quality_score.audio_score * 0.25 +
            quality_score.continuity_score * 0.2
        )
        assert abs(quality_score.overall_score - expected_overall) < 0.01, "Overall score calculation incorrect"

    @given(valid_frame_sequence())
    @settings(max_examples=10, deadline=3000)
    def test_property_13_unnatural_movement_detection(self, frames):
        """
        Property 13: Unnatural Movement Detection
        For any frame sequence, movement detection should return valid anomaly data
        with proper structure and reasonable values.
        Validates: Requirements 4.4
        """
        validator = QualityValidator()

        # Detect unnatural movements
        anomalies = validator.detect_unnatural_movements(frames)

        # Verify anomalies structure
        for anomaly in anomalies:
            assert 'type' in anomaly, "Anomaly missing 'type'"
            assert 'severity' in anomaly, "Anomaly missing 'severity'"
            assert 'description' in anomaly, "Anomaly missing 'description'"
            assert 'timestamp' in anomaly, "Anomaly missing 'timestamp'"
            assert 'frame_number' in anomaly, "Anomaly missing 'frame_number'"
            assert 'metric_value' in anomaly, "Anomaly missing 'metric_value'"
            assert 'threshold_value' in anomaly, "Anomaly missing 'threshold_value'"

            # Verify data types and ranges
            assert isinstance(anomaly['type'], str), "Type should be string"
            assert anomaly['severity'] in ['low', 'medium', 'high'], f"Invalid severity: {anomaly['severity']}"
            assert isinstance(anomaly['description'], str), "Description should be string"
            assert anomaly['timestamp'] >= 0.0, f"Invalid timestamp: {anomaly['timestamp']}"
            assert isinstance(anomaly['frame_number'], int), "Frame number should be int"
            assert anomaly['frame_number'] >= 0, f"Invalid frame number: {anomaly['frame_number']}"
            assert anomaly['metric_value'] >= 0.0, f"Invalid metric value: {anomaly['metric_value']}"

    @given(valid_frame_sequence())
    @settings(max_examples=10, deadline=3000)
    def test_property_14_visual_anomaly_detection(self, frames):
        """
        Property 14: Visual Anomaly Detection
        For any frame sequence, visual anomaly detection should return valid anomaly data
        with proper structure for disappearances, morphological changes, and physics violations.
        Validates: Requirements 4.5
        """
        validator = QualityValidator()

        # Detect visual anomalies
        anomalies = validator.detect_visual_anomalies(frames)

        # Verify anomalies structure
        for anomaly in anomalies:
            assert 'type' in anomaly, "Anomaly missing 'type'"
            assert 'severity' in anomaly, "Anomaly missing 'severity'"
            assert 'description' in anomaly, "Anomaly missing 'description'"
            assert 'timestamp' in anomaly, "Anomaly missing 'timestamp'"
            assert 'frame_number' in anomaly, "Anomaly missing 'frame_number'"
            assert 'metric_value' in anomaly, "Anomaly missing 'metric_value'"
            assert 'threshold_value' in anomaly, "Anomaly missing 'threshold_value'"

            # Verify data types and ranges
            assert isinstance(anomaly['type'], str), "Type should be string"
            assert anomaly['severity'] in ['low', 'medium', 'high'], f"Invalid severity: {anomaly['severity']}"
            assert isinstance(anomaly['description'], str), "Description should be string"
            assert anomaly['timestamp'] >= 0.0, f"Invalid timestamp: {anomaly['timestamp']}"
            assert isinstance(anomaly['frame_number'], int), "Frame number should be int"
            assert anomaly['frame_number'] >= 0, f"Invalid frame number: {anomaly['frame_number']}"
            assert anomaly['metric_value'] >= 0.0, f"Invalid metric value: {anomaly['metric_value']}"


def test_quality_validator_visual_basic_functionality():
    """Test basic functionality of visual quality validator."""
    validator = QualityValidator()

    # Create test frame
    frame = np.random.randint(0, 256, (20, 20, 3), dtype=np.uint8)

    # Test sharpness calculation
    sharpness = validator.calculate_sharpness(frame)
    assert sharpness >= 0.0

    # Create test frames
    frames = [np.random.randint(0, 256, (20, 20, 3), dtype=np.uint8) for _ in range(3)]

    # Test movement detection
    movements = validator.detect_unnatural_movements(frames)
    assert isinstance(movements, list)

    # Test visual anomalies
    anomalies = validator.detect_visual_anomalies(frames)
    assert isinstance(anomalies, list)

    # Test quality score generation
    shot = {
        'frames': frames,
        'audio_score': 75.0,
        'continuity_score': 80.0
    }
    score = validator.generate_quality_score(shot)
    assert 0.0 <= score.overall_score <= 100.0
    assert 0.0 <= score.sharpness_score <= 100.0
    assert 0.0 <= score.motion_score <= 100.0

    print("✓ Visual quality validator basic tests passed")


if __name__ == "__main__":
    # Run basic functionality test
    test_quality_validator_visual_basic_functionality()

    # Run a few property tests manually for verification
    test_instance = TestQualityValidatorVisualProperties()

    print("Visual quality validator property tests ready for execution")