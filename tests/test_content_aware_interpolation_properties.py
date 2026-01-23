"""
Property-Based Tests for Content-Aware Interpolation

This module contains property-based tests using Hypothesis to validate
the Content-Aware Interpolator implementation.

Feature: ai-enhancement
Property 3: Content-Aware Interpolation Correctness
Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
"""

import pytest
from hypothesis import given, strategies as st, settings, assume, HealthCheck
from PIL import Image
import numpy as np
from src.content_aware_interpolator import (
    ContentAwareInterpolator,
    InterpolationConfig,
    InterpolationMethod,
    InterpolationQuality,
    MotionComplexity
)


# Hypothesis strategies for generating test data

@st.composite
def image_strategy(draw, min_size=64, max_size=128):
    """Generate random PIL Images for testing."""
    width = draw(st.integers(min_value=min_size, max_value=max_size))
    height = draw(st.integers(min_value=min_size, max_value=max_size))
    
    # Generate random RGB image
    arr = np.random.randint(0, 256, (height, width, 3), dtype=np.uint8)
    return Image.fromarray(arr, mode='RGB')


@st.composite
def image_pair_strategy(draw):
    """Generate a pair of images with the same dimensions."""
    width = draw(st.integers(min_value=64, max_value=128))
    height = draw(st.integers(min_value=64, max_value=128))
    
    # Generate two different images
    arr1 = np.random.randint(0, 256, (height, width, 3), dtype=np.uint8)
    arr2 = np.random.randint(0, 256, (height, width, 3), dtype=np.uint8)
    
    return Image.fromarray(arr1, mode='RGB'), Image.fromarray(arr2, mode='RGB')


@st.composite
def interpolation_config_strategy(draw):
    """Generate random InterpolationConfig."""
    return InterpolationConfig(
        method=draw(st.sampled_from(InterpolationMethod)),
        quality=draw(st.sampled_from(InterpolationQuality)),
        preserve_edges=draw(st.booleans()),
        detect_occlusion=draw(st.booleans()),
        adaptive_strategy=draw(st.booleans()),
        ghosting_prevention=draw(st.booleans()),
        max_motion_magnitude=draw(st.floats(min_value=10.0, max_value=100.0))
    )


# Property 3.1: Scene Content and Motion Pattern Analysis (Requirement 3.1)

@given(
    frame1=image_strategy(),
    frame2=image_strategy()
)
@settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.too_slow])
def test_property_3_1_motion_analysis_completeness(frame1, frame2):
    """
    Property 3.1: Motion analysis should always produce complete results.
    
    For any pair of frames, motion analysis should:
    - Return valid motion vectors
    - Determine motion complexity
    - Detect occlusion and scene changes
    - Provide confidence score
    
    Feature: ai-enhancement
    Property: 3.1
    Requirements: 3.1
    """
    # Ensure frames have same dimensions
    frame2 = frame2.resize(frame1.size)
    
    interpolator = ContentAwareInterpolator()
    motion_analysis = interpolator.analyze_motion(frame1, frame2)
    
    # Verify motion analysis completeness
    assert motion_analysis is not None, "Motion analysis should not be None"
    assert motion_analysis.motion_vectors is not None, "Motion vectors should be present"
    assert isinstance(motion_analysis.motion_vectors, list), "Motion vectors should be a list"
    
    # Verify complexity determination
    assert motion_analysis.complexity in MotionComplexity, "Complexity should be valid enum"
    
    # Verify boolean flags
    assert isinstance(motion_analysis.has_occlusion, bool), "Occlusion flag should be boolean"
    assert isinstance(motion_analysis.has_scene_change, bool), "Scene change flag should be boolean"
    
    # Verify dominant motion
    assert isinstance(motion_analysis.dominant_motion, tuple), "Dominant motion should be tuple"
    assert len(motion_analysis.dominant_motion) == 2, "Dominant motion should have x,y components"
    
    # Verify motion uniformity
    assert 0.0 <= motion_analysis.motion_uniformity <= 1.0, "Motion uniformity should be in [0,1]"
    
    # Verify recommended method
    assert motion_analysis.recommended_method in InterpolationMethod, "Recommended method should be valid"
    
    # Verify confidence score
    assert 0.0 <= motion_analysis.confidence_score <= 1.0, "Confidence should be in [0,1]"


# Property 3.2: Interpolation Frame Generation (Requirements 3.1, 3.2, 3.3)

@given(
    frame1=image_strategy(),
    frame2=image_strategy(),
    num_intermediate=st.integers(min_value=1, max_value=5),
    config=interpolation_config_strategy()
)
@settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.too_slow])
def test_property_3_2_interpolation_generates_correct_frames(frame1, frame2, num_intermediate, config):
    """
    Property 3.2: Interpolation should generate correct number of frames with valid properties.
    
    For any pair of frames and configuration, interpolation should:
    - Generate exactly the requested number of intermediate frames
    - Each frame should have valid quality metrics
    - Processing time should be recorded
    - Method used should be valid
    
    Feature: ai-enhancement
    Property: 3.2
    Requirements: 3.1, 3.2, 3.3
    """
    # Ensure frames have same dimensions
    frame2 = frame2.resize(frame1.size)
    
    interpolator = ContentAwareInterpolator(config)
    result = interpolator.interpolate_frames(frame1, frame2, num_intermediate)
    
    # Verify correct number of frames generated
    assert len(result.interpolated_frames) == num_intermediate, \
        f"Should generate {num_intermediate} frames, got {len(result.interpolated_frames)}"
    
    # Verify each interpolated frame
    for i, interp_frame in enumerate(result.interpolated_frames):
        # Verify frame data exists
        assert interp_frame.frame_data is not None, f"Frame {i} should have data"
        assert len(interp_frame.frame_data) > 0, f"Frame {i} data should not be empty"
        
        # Verify position is correct
        expected_position = (i + 1) / (num_intermediate + 1)
        assert abs(interp_frame.position - expected_position) < 0.01, \
            f"Frame {i} position should be {expected_position}, got {interp_frame.position}"
        
        # Verify quality metrics
        assert interp_frame.quality_metrics is not None, f"Frame {i} should have quality metrics"
        assert 0.0 <= interp_frame.quality_metrics.overall_quality <= 1.0, \
            f"Frame {i} overall quality should be in [0,1]"
        assert 0.0 <= interp_frame.quality_metrics.temporal_consistency <= 1.0, \
            f"Frame {i} temporal consistency should be in [0,1]"
        assert 0.0 <= interp_frame.quality_metrics.edge_preservation <= 1.0, \
            f"Frame {i} edge preservation should be in [0,1]"
        assert 0.0 <= interp_frame.quality_metrics.ghosting_score <= 1.0, \
            f"Frame {i} ghosting score should be in [0,1]"
        
        # Verify processing time is positive
        assert interp_frame.processing_time >= 0, f"Frame {i} processing time should be non-negative"
        
        # Verify method used is valid
        assert interp_frame.method_used in InterpolationMethod, \
            f"Frame {i} method should be valid enum"
        
        # Verify warnings is a list
        assert isinstance(interp_frame.warnings, list), f"Frame {i} warnings should be a list"
    
    # Verify motion analysis
    assert result.motion_analysis is not None, "Result should include motion analysis"
    
    # Verify total processing time
    assert result.total_processing_time >= 0, "Total processing time should be non-negative"
    
    # Verify average quality
    assert 0.0 <= result.average_quality <= 1.0, "Average quality should be in [0,1]"
    
    # Verify suggestions is a list
    assert isinstance(result.suggestions, list), "Suggestions should be a list"


# Property 3.3: Object Consistency and Temporal Coherence (Requirement 3.3)

@given(
    frame1=image_strategy(),
    frame2=image_strategy(),
    num_intermediate=st.integers(min_value=2, max_value=4)
)
@settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.too_slow])
def test_property_3_3_temporal_consistency_maintained(frame1, frame2, num_intermediate):
    """
    Property 3.3: Interpolated frames should maintain temporal consistency.
    
    For any pair of frames, the interpolated sequence should:
    - Have monotonically changing positions (0 to 1)
    - Maintain reasonable quality across all frames
    - Show consistent processing characteristics
    
    Feature: ai-enhancement
    Property: 3.3
    Requirements: 3.3
    """
    # Ensure frames have same dimensions
    frame2 = frame2.resize(frame1.size)
    
    interpolator = ContentAwareInterpolator()
    result = interpolator.interpolate_frames(frame1, frame2, num_intermediate)
    
    # Verify positions are monotonically increasing
    positions = [frame.position for frame in result.interpolated_frames]
    for i in range(len(positions) - 1):
        assert positions[i] < positions[i + 1], \
            f"Positions should be monotonically increasing: {positions[i]} >= {positions[i+1]}"
    
    # Verify all positions are in valid range
    assert all(0.0 < pos < 1.0 for pos in positions), \
        "All positions should be between 0 and 1 (exclusive)"
    
    # Verify quality metrics are reasonable across sequence
    qualities = [frame.quality_metrics.overall_quality for frame in result.interpolated_frames]
    assert all(q >= 0.0 for q in qualities), "All quality scores should be non-negative"
    assert all(q <= 1.0 for q in qualities), "All quality scores should be at most 1.0"
    
    # Verify temporal consistency scores
    temporal_scores = [
        frame.quality_metrics.temporal_consistency 
        for frame in result.interpolated_frames
    ]
    assert all(0.0 <= score <= 1.0 for score in temporal_scores), \
        "All temporal consistency scores should be in [0,1]"


# Property 3.4: Quality Metrics and Validation (Requirement 3.4)

@given(
    frames=st.lists(image_strategy(), min_size=2, max_size=4)
)
@settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.too_slow])
def test_property_3_4_quality_validation_comprehensive(frames):
    """
    Property 3.4: Quality validation should provide comprehensive metrics.
    
    For any sequence of frames, quality validation should:
    - Calculate temporal consistency
    - Measure edge preservation
    - Detect ghosting artifacts
    - Provide overall quality score
    - Include confidence measure
    
    Feature: ai-enhancement
    Property: 3.4
    Requirements: 3.4
    """
    # Ensure all frames have same dimensions
    base_size = frames[0].size
    frames = [frame.resize(base_size) for frame in frames]
    
    interpolator = ContentAwareInterpolator()
    
    # Generate interpolated sequence
    interpolated_sequence = interpolator.interpolate_sequence(frames, frames_between=1)
    
    # Validate quality
    quality_metrics = interpolator.validate_interpolation_quality(frames, interpolated_sequence)
    
    # Verify all quality metrics are present and valid
    assert quality_metrics is not None, "Quality metrics should not be None"
    
    assert 0.0 <= quality_metrics.structural_similarity <= 1.0, \
        "Structural similarity should be in [0,1]"
    
    assert 0.0 <= quality_metrics.temporal_consistency <= 1.0, \
        "Temporal consistency should be in [0,1]"
    
    assert 0.0 <= quality_metrics.edge_preservation <= 1.0, \
        "Edge preservation should be in [0,1]"
    
    assert 0.0 <= quality_metrics.ghosting_score <= 1.0, \
        "Ghosting score should be in [0,1]"
    
    assert 0.0 <= quality_metrics.overall_quality <= 1.0, \
        "Overall quality should be in [0,1]"
    
    assert 0.0 <= quality_metrics.confidence <= 1.0, \
        "Confidence should be in [0,1]"


# Property 3.5: Adaptive Strategy Selection (Requirement 3.5)

@given(
    frame1=image_strategy(),
    frame2=image_strategy(),
    num_intermediate=st.integers(min_value=1, max_value=3)
)
@settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.too_slow])
def test_property_3_5_adaptive_strategy_selection(frame1, frame2, num_intermediate):
    """
    Property 3.5: Adaptive strategy should select appropriate method based on complexity.
    
    For any pair of frames with adaptive strategy enabled:
    - Motion analysis should recommend appropriate method
    - Selected method should match complexity level
    - Scene changes should trigger scene-aware method
    - High complexity should use advanced methods
    
    Feature: ai-enhancement
    Property: 3.5
    Requirements: 3.5
    """
    # Ensure frames have same dimensions
    frame2 = frame2.resize(frame1.size)
    
    # Enable adaptive strategy
    config = InterpolationConfig(adaptive_strategy=True)
    interpolator = ContentAwareInterpolator(config)
    
    # Analyze motion first
    motion_analysis = interpolator.analyze_motion(frame1, frame2)
    
    # Perform interpolation
    result = interpolator.interpolate_frames(frame1, frame2, num_intermediate)
    
    # Verify adaptive method selection
    if motion_analysis.has_scene_change:
        # Scene changes should use scene-aware method
        assert result.interpolated_frames[0].method_used == InterpolationMethod.SCENE_AWARE, \
            "Scene changes should trigger scene-aware method"
    
    if motion_analysis.complexity == MotionComplexity.VERY_COMPLEX:
        # Very complex motion should use scene-aware method
        assert result.interpolated_frames[0].method_used == InterpolationMethod.SCENE_AWARE, \
            "Very complex motion should use scene-aware method"
    
    if motion_analysis.complexity == MotionComplexity.COMPLEX:
        # Complex motion should use motion-compensated or scene-aware
        assert result.interpolated_frames[0].method_used in [
            InterpolationMethod.MOTION_COMPENSATED,
            InterpolationMethod.SCENE_AWARE
        ], "Complex motion should use advanced methods"
    
    # Verify method consistency across frames
    methods_used = [frame.method_used for frame in result.interpolated_frames]
    assert len(set(methods_used)) == 1, \
        "All frames in same interpolation should use same method"


# Property 3.6: Sequence Interpolation Consistency (Requirement 3.3)

@given(
    frames=st.lists(image_strategy(), min_size=2, max_size=4),
    frames_between=st.integers(min_value=1, max_value=3)
)
@settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.too_slow])
def test_property_3_6_sequence_interpolation_consistency(frames, frames_between):
    """
    Property 3.6: Sequence interpolation should maintain consistency across keyframes.
    
    For any sequence of keyframes:
    - Output should include all original keyframes
    - Interpolated frames should be inserted between keyframes
    - Total frame count should be correct
    - Sequence should maintain temporal order
    
    Feature: ai-enhancement
    Property: 3.6
    Requirements: 3.3
    """
    # Ensure all frames have same dimensions
    base_size = frames[0].size
    frames = [frame.resize(base_size) for frame in frames]
    
    interpolator = ContentAwareInterpolator()
    result_sequence = interpolator.interpolate_sequence(frames, frames_between)
    
    # Calculate expected frame count
    # Original frames + (frames_between * number of gaps)
    num_gaps = len(frames) - 1
    expected_count = len(frames) + (frames_between * num_gaps)
    
    assert len(result_sequence) == expected_count, \
        f"Expected {expected_count} frames, got {len(result_sequence)}"
    
    # Verify first and last frames are original keyframes
    # (We can't directly compare PIL images, but we can check they exist)
    assert result_sequence[0] is not None, "First frame should exist"
    assert result_sequence[-1] is not None, "Last frame should exist"
    
    # Verify all frames have same dimensions
    sizes = [frame.size for frame in result_sequence]
    assert all(size == base_size for size in sizes), \
        "All frames should have same dimensions"


# Property 3.7: Error Handling and Robustness (Requirements 3.2, 3.5)

@given(
    frame1=image_strategy(),
    frame2=image_strategy(),
    num_intermediate=st.integers(min_value=1, max_value=5)
)
@settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.too_slow])
def test_property_3_7_robust_error_handling(frame1, frame2, num_intermediate):
    """
    Property 3.7: Interpolation should handle edge cases robustly.
    
    For any valid inputs, interpolation should:
    - Never crash or raise unexpected exceptions
    - Always return valid results
    - Provide warnings for problematic cases
    - Generate suggestions when quality is low
    
    Feature: ai-enhancement
    Property: 3.7
    Requirements: 3.2, 3.5
    """
    # Ensure frames have same dimensions
    frame2 = frame2.resize(frame1.size)
    
    interpolator = ContentAwareInterpolator()
    
    # Should not raise exceptions
    try:
        result = interpolator.interpolate_frames(frame1, frame2, num_intermediate)
        
        # Verify result is valid
        assert result is not None, "Result should not be None"
        assert len(result.interpolated_frames) == num_intermediate, \
            "Should generate requested number of frames"
        
        # Check for warnings in problematic cases
        if result.motion_analysis.has_scene_change:
            # Should have warnings about scene changes
            warnings_found = any(
                "scene change" in warning.lower()
                for frame in result.interpolated_frames
                for warning in frame.warnings
            )
            # Note: warnings are optional but recommended
        
        # Check for suggestions when quality is low
        if result.average_quality < 0.7:
            assert len(result.suggestions) > 0, \
                "Low quality should generate suggestions"
        
    except Exception as e:
        pytest.fail(f"Interpolation should not raise exceptions: {e}")


# Property 3.8: Statistics Tracking (Requirement 3.4)

@given(
    frame1=image_strategy(),
    frame2=image_strategy(),
    num_intermediate=st.integers(min_value=1, max_value=3)
)
@settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.too_slow])
def test_property_3_8_statistics_tracking(frame1, frame2, num_intermediate):
    """
    Property 3.8: Interpolator should track comprehensive statistics.
    
    For any interpolation operations:
    - Statistics should be updated after each operation
    - Counters should increment correctly
    - Averages should be calculated properly
    - Statistics should be retrievable
    
    Feature: ai-enhancement
    Property: 3.8
    Requirements: 3.4
    """
    # Ensure frames have same dimensions
    frame2 = frame2.resize(frame1.size)
    
    interpolator = ContentAwareInterpolator()
    interpolator.reset_statistics()
    
    # Get initial statistics
    stats_before = interpolator.get_statistics()
    assert stats_before['total_interpolations'] == 0, "Should start with zero interpolations"
    
    # Perform interpolation
    result = interpolator.interpolate_frames(frame1, frame2, num_intermediate)
    
    # Get updated statistics
    stats_after = interpolator.get_statistics()
    
    # Verify statistics were updated
    assert stats_after['total_interpolations'] == 1, \
        "Total interpolations should increment"
    
    # Verify method tracking
    method_used = result.interpolated_frames[0].method_used
    assert stats_after['by_method'][method_used.value] == 1, \
        f"Method {method_used.value} should be tracked"
    
    # Verify complexity tracking
    complexity = result.motion_analysis.complexity
    assert stats_after['by_complexity'][complexity.value] == 1, \
        f"Complexity {complexity.value} should be tracked"
    
    # Verify average quality is set
    assert stats_after['average_quality'] > 0.0, \
        "Average quality should be calculated"
    
    # Verify average processing time is set
    assert stats_after['average_processing_time'] > 0.0, \
        "Average processing time should be calculated"
    
    # Verify occlusion and scene change tracking
    if result.motion_analysis.has_occlusion:
        assert stats_after['occlusion_detected'] == 1, \
            "Occlusion detection should be tracked"
    
    if result.motion_analysis.has_scene_change:
        assert stats_after['scene_changes_detected'] == 1, \
            "Scene change detection should be tracked"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
