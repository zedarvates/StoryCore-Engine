#!/usr/bin/env python3
"""
Property tests for Advanced Interpolation Engine

Property VE-28: Advanced Feature Quality
Validates: Requirements VE-3.7, VE-8.3, VE-8.7

These property-based tests ensure that advanced interpolation features
maintain quality and consistency across different inputs and configurations.
"""

import pytest
import numpy as np
from hypothesis import given, strategies as st, settings, assume, HealthCheck
from typing import List, Tuple

from src.advanced_interpolation_engine import (
    AdvancedInterpolationEngine,
    AdvancedInterpolationConfig,
    MotionBlurConfig,
    DepthOfFieldConfig,
    LensSimulationConfig,
    InterpolationMethod,
    MotionBlurType,
    DepthOfFieldMode,
    LensType,
    create_cinematic_preset
)


# Strategy for generating valid frame dimensions
frame_dimensions = st.tuples(
    st.integers(min_value=64, max_value=480),  # height
    st.integers(min_value=64, max_value=640),  # width
    st.just(3)  # channels (RGB)
)

# Strategy for generating valid keyframes with consistent dimensions
def keyframes_strategy(min_frames=1, max_frames=5):
    return st.builds(
        lambda dims, count: [np.random.randint(0, 256, dims, dtype=np.uint8) for _ in range(count)],
        frame_dimensions,
        st.integers(min_value=min_frames, max_value=max_frames)
    )

# Strategy for motion blur configuration
motion_blur_config = st.builds(
    MotionBlurConfig,
    blur_type=st.sampled_from(MotionBlurType),
    intensity=st.floats(min_value=0.0, max_value=1.0),
    direction_angle=st.floats(min_value=0.0, max_value=360.0),
    samples=st.integers(min_value=4, max_value=32),
    adaptive=st.booleans(),
    preserve_edges=st.booleans()
)

# Strategy for depth of field configuration
depth_of_field_config = st.builds(
    DepthOfFieldConfig,
    mode=st.sampled_from(DepthOfFieldMode),
    focal_distance=st.floats(min_value=0.1, max_value=100.0),
    aperture=st.floats(min_value=1.0, max_value=22.0),
    bokeh_quality=st.sampled_from(["low", "medium", "high"]),
    focus_transition_speed=st.floats(min_value=0.1, max_value=5.0),
    depth_map_quality=st.sampled_from(["low", "medium", "high"])
)

# Strategy for lens simulation configuration
lens_simulation_config = st.builds(
    LensSimulationConfig,
    lens_type=st.sampled_from(LensType),
    focal_length=st.floats(min_value=8.0, max_value=200.0),
    aperture=st.floats(min_value=1.0, max_value=22.0),
    distortion=st.floats(min_value=-1.0, max_value=1.0),
    vignetting=st.floats(min_value=0.0, max_value=1.0),
    chromatic_aberration=st.floats(min_value=0.0, max_value=0.5),
    lens_flare=st.booleans(),
    breathing=st.floats(min_value=0.0, max_value=1.0)
)

# Strategy for advanced interpolation configuration
advanced_config = st.builds(
    AdvancedInterpolationConfig,
    method=st.sampled_from(InterpolationMethod),
    motion_blur=motion_blur_config,
    depth_of_field=depth_of_field_config,
    lens_simulation=lens_simulation_config,
    gpu_acceleration=st.booleans(),
    parallel_processing=st.booleans(),
    memory_limit_gb=st.floats(min_value=1.0, max_value=32.0),
    quality_vs_speed=st.floats(min_value=0.0, max_value=1.0)
)

# Strategy for camera movements
camera_movement = st.one_of(
    st.builds(dict, type=st.just("static")),
    st.builds(dict, 
        type=st.just("pan"),
        direction=st.sampled_from(["left", "right", "up", "down"]),
        amount=st.floats(min_value=0.01, max_value=0.5)
    ),
    st.builds(dict,
        type=st.just("zoom"),
        factor=st.floats(min_value=1.01, max_value=3.0)
    ),
    st.builds(dict,
        type=st.just("dolly"),
        distance=st.floats(min_value=0.1, max_value=5.0)
    )
)


class TestAdvancedInterpolationProperties:
    """Property-based tests for advanced interpolation features."""
    
    @given(
        config=advanced_config,
        keyframes=keyframes_strategy(min_frames=1, max_frames=3),
        target_count=st.integers(min_value=2, max_value=20)
    )
    @settings(max_examples=25, deadline=10000)
    def test_property_ve28_interpolation_output_consistency(self, config, keyframes, target_count):
        """
        Property VE-28.1: Interpolation Output Consistency
        
        Validates that interpolation always produces the expected number of frames
        with consistent dimensions and data types, regardless of configuration.
        
        Requirements: VE-3.7 (motion blur), VE-8.3 (motion blur controls), VE-8.7 (lens simulation)
        """
        assume(len(keyframes) > 0)
        assume(all(frame.shape == keyframes[0].shape for frame in keyframes))
        
        # Ensure configuration is valid
        engine = AdvancedInterpolationEngine(config)
        is_valid, issues = engine.validate_configuration()
        assume(is_valid)
        
        # Perform interpolation
        result_frames = engine.interpolate_frames(keyframes, target_count)
        
        # Property assertions
        assert len(result_frames) == target_count, "Must produce exact number of requested frames"
        assert all(isinstance(frame, np.ndarray) for frame in result_frames), "All outputs must be numpy arrays"
        assert all(frame.dtype == keyframes[0].dtype for frame in result_frames), "Data types must be preserved"
        assert all(frame.shape == keyframes[0].shape for frame in result_frames), "Frame dimensions must be preserved"
        
        # Verify frames are valid images (pixel values in range)
        for frame in result_frames:
            assert np.all(frame >= 0), "Pixel values must be non-negative"
            assert np.all(frame <= 255), "Pixel values must not exceed 255"
    
    @given(
        motion_blur_config=motion_blur_config,
        keyframes=keyframes_strategy(min_frames=1, max_frames=2),
        camera_movement=camera_movement
    )
    @settings(max_examples=15, deadline=8000)
    def test_property_ve28_motion_blur_quality_preservation(self, motion_blur_config, keyframes, camera_movement):
        """
        Property VE-28.2: Motion Blur Quality Preservation
        
        Validates that motion blur application preserves image quality and
        produces realistic motion effects without artifacts.
        
        Requirements: VE-3.7 (motion blur for realistic movement)
        """
        assume(len(keyframes) > 0)
        assume(motion_blur_config.blur_type != MotionBlurType.NONE or motion_blur_config.intensity > 0.01)
        
        config = AdvancedInterpolationConfig(motion_blur=motion_blur_config)
        engine = AdvancedInterpolationEngine(config)
        
        # Apply motion blur
        frames = [keyframes[0].copy() for _ in range(5)]
        blurred_frames = engine._apply_motion_blur(frames, camera_movement)
        
        # Property assertions
        assert len(blurred_frames) == len(frames), "Frame count must be preserved"
        
        for original, blurred in zip(frames, blurred_frames):
            assert blurred.shape == original.shape, "Frame dimensions must be preserved"
            assert blurred.dtype == original.dtype, "Data type must be preserved"
            
            # Quality preservation checks
            assert np.all(blurred >= 0), "Pixel values must remain non-negative"
            assert np.all(blurred <= 255), "Pixel values must not exceed valid range"
            
            # Motion blur should not create extreme changes unless intensity is very high
            if motion_blur_config.intensity < 0.9:
                mean_diff = np.mean(np.abs(blurred.astype(float) - original.astype(float)))
                assert mean_diff < 128, "Motion blur should not create extreme changes at moderate intensity"
    
    @given(
        dof_config=depth_of_field_config,
        keyframes=keyframes_strategy(min_frames=1, max_frames=2),
        camera_movement=camera_movement
    )
    @settings(max_examples=15, deadline=8000)
    def test_property_ve28_depth_of_field_consistency(self, dof_config, keyframes, camera_movement):
        """
        Property VE-28.3: Depth of Field Consistency
        
        Validates that depth of field effects are applied consistently
        and maintain visual quality across different configurations.
        
        Requirements: VE-8.3 (depth-of-field controls)
        """
        assume(len(keyframes) > 0)
        assume(dof_config.mode != DepthOfFieldMode.DISABLED)
        
        config = AdvancedInterpolationConfig(depth_of_field=dof_config)
        engine = AdvancedInterpolationEngine(config)
        
        # Apply depth of field
        frames = [keyframes[0].copy() for _ in range(5)]
        dof_frames = engine._apply_depth_of_field(frames, camera_movement)
        
        # Property assertions
        assert len(dof_frames) == len(frames), "Frame count must be preserved"
        
        for original, dof_frame in zip(frames, dof_frames):
            assert dof_frame.shape == original.shape, "Frame dimensions must be preserved"
            assert dof_frame.dtype == original.dtype, "Data type must be preserved"
            
            # Quality preservation checks
            assert np.all(dof_frame >= 0), "Pixel values must remain non-negative"
            assert np.all(dof_frame <= 255), "Pixel values must not exceed valid range"
            
            # Focus parameters should be consistent
            frame_idx = next(i for i, f in enumerate(frames) if np.array_equal(f, original))
            focus_params = engine._calculate_focus_parameters(frame_idx, len(frames), camera_movement)
            assert focus_params["focal_distance"] > 0, "Focal distance must be positive"
            assert focus_params["aperture"] > 0, "Aperture must be positive"
            assert focus_params["blur_radius"] >= 1, "Blur radius must be at least 1"
    
    @given(
        lens_config=lens_simulation_config,
        keyframes=keyframes_strategy(min_frames=1, max_frames=2)
    )
    @settings(max_examples=15, deadline=8000)
    def test_property_ve28_lens_simulation_accuracy(self, lens_config, keyframes):
        """
        Property VE-28.4: Lens Simulation Accuracy
        
        Validates that lens simulation effects are applied accurately
        and produce realistic optical characteristics.
        
        Requirements: VE-8.7 (lens simulation with focal length, aperture effects)
        """
        assume(len(keyframes) > 0)
        
        config = AdvancedInterpolationConfig(lens_simulation=lens_config)
        engine = AdvancedInterpolationEngine(config)
        
        # Apply lens simulation
        frames = [keyframes[0].copy() for _ in range(3)]
        lens_frames = engine._apply_lens_simulation(frames)
        
        # Property assertions
        assert len(lens_frames) == len(frames), "Frame count must be preserved"
        
        for original, lens_frame in zip(frames, lens_frames):
            assert lens_frame.shape == original.shape, "Frame dimensions must be preserved"
            assert lens_frame.dtype == original.dtype, "Data type must be preserved"
            
            # Quality preservation checks
            assert np.all(lens_frame >= 0), "Pixel values must remain non-negative"
            assert np.all(lens_frame <= 255), "Pixel values must not exceed valid range"
            
            # Lens effects should be applied based on configuration
            if lens_config.vignetting > 0.1:
                # Check that vignetting creates darker edges
                h, w = lens_frame.shape[:2]
                center_brightness = np.mean(lens_frame[h//2-5:h//2+5, w//2-5:w//2+5])
                corner_brightness = np.mean(lens_frame[:10, :10])
                assert center_brightness >= corner_brightness, "Vignetting should darken edges"
            
            # Chromatic aberration should create color shifts if enabled
            if lens_config.chromatic_aberration > 0.1 and len(lens_frame.shape) == 3:
                # Should be different from original due to color channel shifts
                color_diff = np.mean(np.abs(lens_frame.astype(float) - original.astype(float)))
                assert color_diff > 0, "Chromatic aberration should create color differences"
    
    @given(
        preset_name=st.sampled_from(["documentary", "cinematic", "action", "portrait"]),
        keyframes=keyframes_strategy(min_frames=2, max_frames=3),
        target_count=st.integers(min_value=5, max_value=15)
    )
    @settings(max_examples=10, deadline=15000, suppress_health_check=[HealthCheck.filter_too_much])
    def test_property_ve28_cinematic_preset_consistency(self, preset_name, keyframes, target_count):
        """
        Property VE-28.5: Cinematic Preset Consistency
        
        Validates that cinematic presets produce consistent, high-quality results
        with appropriate effects for each preset type.
        
        Requirements: VE-3.7, VE-8.3, VE-8.7 (all advanced features working together)
        """
        assume(len(keyframes) >= 2)
        assume(all(frame.shape == keyframes[0].shape for frame in keyframes))
        
        config = create_cinematic_preset(preset_name)
        engine = AdvancedInterpolationEngine(config)
        
        # Validate preset configuration
        is_valid, issues = engine.validate_configuration()
        assert is_valid, f"Preset {preset_name} should have valid configuration: {issues}"
        
        # Perform interpolation with preset
        camera_movement = {"type": "pan", "direction": "right", "amount": 0.1}
        result_frames = engine.interpolate_frames(keyframes, target_count, camera_movement)
        
        # Property assertions
        assert len(result_frames) == target_count, "Must produce exact number of frames"
        assert all(frame.shape == keyframes[0].shape for frame in result_frames), "Dimensions must be preserved"
        
        # Check that effects are applied according to preset
        metrics = engine.get_performance_metrics()
        assert "effects_applied" in metrics, "Effects should be tracked"
        assert len(metrics["effects_applied"]) > 0, "At least one effect should be applied"
        
        # Preset-specific validations
        if preset_name == "cinematic":
            assert any("anamorphic" in effect for effect in metrics["effects_applied"]), "Cinematic preset should use anamorphic lens"
        elif preset_name == "action":
            assert any("wide_angle" in effect for effect in metrics["effects_applied"]), "Action preset should use wide angle lens"
        elif preset_name == "portrait":
            assert any("telephoto" in effect for effect in metrics["effects_applied"]), "Portrait preset should use telephoto lens"
    
    @given(
        config=advanced_config,
        keyframes=keyframes_strategy(min_frames=1, max_frames=2),
        target_count=st.integers(min_value=3, max_value=10)
    )
    @settings(max_examples=15, deadline=10000)
    def test_property_ve28_performance_consistency(self, config, keyframes, target_count):
        """
        Property VE-28.6: Performance Consistency
        
        Validates that advanced interpolation maintains consistent performance
        characteristics and provides accurate metrics.
        
        Requirements: VE-3.7, VE-8.3, VE-8.7 (performance of advanced features)
        """
        assume(len(keyframes) > 0)
        assume(all(frame.shape == keyframes[0].shape for frame in keyframes))
        
        engine = AdvancedInterpolationEngine(config)
        is_valid, issues = engine.validate_configuration()
        assume(is_valid)
        
        # Perform interpolation
        result_frames = engine.interpolate_frames(keyframes, target_count)
        
        # Check performance metrics
        metrics = engine.get_performance_metrics()
        
        # Property assertions for performance
        assert "interpolation_time" in metrics, "Interpolation time must be tracked"
        assert "frames_per_second" in metrics, "FPS must be calculated"
        assert "method_used" in metrics, "Method must be recorded"
        assert "effects_applied" in metrics, "Effects must be tracked"
        
        assert metrics["interpolation_time"] > 0, "Processing time must be positive"
        assert metrics["frames_per_second"] > 0, "FPS must be positive"
        assert metrics["method_used"] == config.method.value, "Correct method must be used"
        
        # Performance should be reasonable (at least 1 FPS for small frames)
        if keyframes[0].size < 100000:  # Small frames
            assert metrics["frames_per_second"] >= 1, "Should achieve at least 1 FPS for small frames"
    
    @given(
        method=st.sampled_from(InterpolationMethod),
        keyframes=keyframes_strategy(min_frames=2, max_frames=3),
        target_count=st.integers(min_value=4, max_value=12)
    )
    @settings(max_examples=12, deadline=8000)
    def test_property_ve28_interpolation_method_consistency(self, method, keyframes, target_count):
        """
        Property VE-28.7: Interpolation Method Consistency
        
        Validates that different interpolation methods produce consistent
        results and maintain quality standards.
        
        Requirements: VE-3.7 (motion blur integration with interpolation)
        """
        assume(len(keyframes) >= 2)
        assume(all(frame.shape == keyframes[0].shape for frame in keyframes))
        
        config = AdvancedInterpolationConfig(method=method)
        engine = AdvancedInterpolationEngine(config)
        
        # Perform interpolation
        result_frames = engine.interpolate_frames(keyframes, target_count)
        
        # Property assertions
        assert len(result_frames) == target_count, "Must produce exact number of frames"
        
        # Check interpolation quality
        for i, frame in enumerate(result_frames):
            assert frame.shape == keyframes[0].shape, "Frame dimensions must be consistent"
            assert frame.dtype == keyframes[0].dtype, "Data type must be preserved"
            
            # Interpolated frames should be reasonable blends
            if i == 0:
                # First frame should be similar to first keyframe
                similarity = np.mean(np.abs(frame.astype(float) - keyframes[0].astype(float)))
                assert similarity < 100, "First interpolated frame should be similar to first keyframe"
            elif i == target_count - 1 and len(keyframes) > 1:
                # Last frame should be similar to last keyframe
                similarity = np.mean(np.abs(frame.astype(float) - keyframes[-1].astype(float)))
                assert similarity < 100, "Last interpolated frame should be similar to last keyframe"
    
    @given(
        config=advanced_config,
        keyframes=keyframes_strategy(min_frames=1, max_frames=2)
    )
    @settings(max_examples=10, deadline=8000)
    def test_property_ve28_configuration_validation_consistency(self, config, keyframes):
        """
        Property VE-28.8: Configuration Validation Consistency
        
        Validates that configuration validation is consistent and
        prevents invalid configurations from being used.
        
        Requirements: VE-8.3, VE-8.7 (configuration validation for advanced features)
        """
        assume(len(keyframes) > 0)
        
        engine = AdvancedInterpolationEngine(config)
        is_valid, issues = engine.validate_configuration()
        
        if is_valid:
            # Valid configurations should work without errors
            try:
                result = engine.interpolate_frames(keyframes, 5)
                assert len(result) == 5, "Valid configuration should produce results"
            except Exception as e:
                pytest.fail(f"Valid configuration should not raise exceptions: {e}")
        else:
            # Invalid configurations should have specific issues
            assert len(issues) > 0, "Invalid configurations must report specific issues"
            assert all(isinstance(issue, str) for issue in issues), "Issues must be descriptive strings"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])