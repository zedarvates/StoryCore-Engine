#!/usr/bin/env python3
"""
Simple test for advanced interpolation functionality.
"""

import numpy as np
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


def test_advanced_interpolation_basic():
    """Test basic advanced interpolation functionality."""
    # Create configuration
    config = AdvancedInterpolationConfig(
        method=InterpolationMethod.OPTICAL_FLOW,
        motion_blur=MotionBlurConfig(
            blur_type=MotionBlurType.LINEAR,
            intensity=0.5
        ),
        depth_of_field=DepthOfFieldConfig(
            mode=DepthOfFieldMode.SHALLOW,
            aperture=2.8
        ),
        lens_simulation=LensSimulationConfig(
            lens_type=LensType.STANDARD,
            vignetting=0.1
        )
    )
    
    # Create engine
    engine = AdvancedInterpolationEngine(config)
    
    # Test configuration validation
    is_valid, issues = engine.validate_configuration()
    assert is_valid, f"Configuration should be valid, issues: {issues}"
    
    # Create mock keyframes
    keyframes = [
        np.random.randint(0, 256, (480, 640, 3), dtype=np.uint8),
        np.random.randint(0, 256, (480, 640, 3), dtype=np.uint8)
    ]
    
    # Test interpolation
    camera_movement = {
        "type": "pan",
        "direction": "right",
        "amount": 0.1
    }
    
    result_frames = engine.interpolate_frames(
        keyframes,
        target_frame_count=12,
        camera_movement=camera_movement
    )
    
    # Verify results
    assert len(result_frames) == 12
    assert all(isinstance(frame, np.ndarray) for frame in result_frames)
    assert all(frame.shape == keyframes[0].shape for frame in result_frames)
    
    # Check performance metrics
    metrics = engine.get_performance_metrics()
    assert "interpolation_time" in metrics
    assert "frames_per_second" in metrics
    assert "method_used" in metrics
    assert "effects_applied" in metrics
    
    assert metrics["interpolation_time"] > 0
    assert metrics["frames_per_second"] > 0
    assert metrics["method_used"] == "optical_flow"
    
    print("+ Advanced interpolation basic functionality test passed")


def test_interpolation_methods():
    """Test different interpolation methods."""
    keyframes = [
        np.random.randint(0, 256, (240, 320, 3), dtype=np.uint8),
        np.random.randint(0, 256, (240, 320, 3), dtype=np.uint8)
    ]
    
    methods = [
        InterpolationMethod.LINEAR,
        InterpolationMethod.OPTICAL_FLOW,
        InterpolationMethod.DEPTH_AWARE,
        InterpolationMethod.MOTION_COMPENSATED
    ]
    
    for method in methods:
        config = AdvancedInterpolationConfig(method=method)
        engine = AdvancedInterpolationEngine(config)
        
        result = engine.interpolate_frames(keyframes, 8)
        assert len(result) == 8
        assert all(frame.shape == keyframes[0].shape for frame in result)
    
    print("+ Interpolation methods test passed")


def test_motion_blur_effects():
    """Test motion blur effects."""
    keyframes = [
        np.random.randint(0, 256, (240, 320, 3), dtype=np.uint8)
    ]
    
    blur_types = [
        MotionBlurType.NONE,
        MotionBlurType.LINEAR,
        MotionBlurType.RADIAL,
        MotionBlurType.ZOOM
    ]
    
    for blur_type in blur_types:
        config = AdvancedInterpolationConfig(
            motion_blur=MotionBlurConfig(
                blur_type=blur_type,
                intensity=0.3
            )
        )
        engine = AdvancedInterpolationEngine(config)
        
        result = engine.interpolate_frames(keyframes, 5)
        assert len(result) == 5
    
    print("+ Motion blur effects test passed")


def test_depth_of_field_effects():
    """Test depth of field effects."""
    keyframes = [
        np.random.randint(0, 256, (240, 320, 3), dtype=np.uint8)
    ]
    
    dof_modes = [
        DepthOfFieldMode.DISABLED,
        DepthOfFieldMode.SHALLOW,
        DepthOfFieldMode.DEEP,
        DepthOfFieldMode.FOCUS_PULL
    ]
    
    for mode in dof_modes:
        config = AdvancedInterpolationConfig(
            depth_of_field=DepthOfFieldConfig(
                mode=mode,
                aperture=2.8
            )
        )
        engine = AdvancedInterpolationEngine(config)
        
        result = engine.interpolate_frames(keyframes, 5)
        assert len(result) == 5
    
    print("+ Depth of field effects test passed")


def test_lens_simulation():
    """Test lens simulation effects."""
    keyframes = [
        np.random.randint(0, 256, (240, 320, 3), dtype=np.uint8)
    ]
    
    lens_types = [
        LensType.STANDARD,
        LensType.WIDE_ANGLE,
        LensType.TELEPHOTO,
        LensType.FISHEYE
    ]
    
    for lens_type in lens_types:
        config = AdvancedInterpolationConfig(
            lens_simulation=LensSimulationConfig(
                lens_type=lens_type,
                vignetting=0.2,
                distortion=0.1
            )
        )
        engine = AdvancedInterpolationEngine(config)
        
        result = engine.interpolate_frames(keyframes, 5)
        assert len(result) == 5
    
    print("+ Lens simulation test passed")


def test_cinematic_presets():
    """Test cinematic presets."""
    keyframes = [
        np.random.randint(0, 256, (240, 320, 3), dtype=np.uint8),
        np.random.randint(0, 256, (240, 320, 3), dtype=np.uint8)
    ]
    
    presets = ["documentary", "cinematic", "action", "portrait"]
    
    for preset in presets:
        config = create_cinematic_preset(preset)
        engine = AdvancedInterpolationEngine(config)
        
        # Validate configuration
        is_valid, issues = engine.validate_configuration()
        assert is_valid, f"Preset {preset} should be valid, issues: {issues}"
        
        # Test interpolation
        result = engine.interpolate_frames(keyframes, 8)
        assert len(result) == 8
        
        # Check metrics
        metrics = engine.get_performance_metrics()
        assert metrics["interpolation_time"] > 0
        assert len(metrics["effects_applied"]) > 0
    
    print("+ Cinematic presets test passed")


def test_camera_movements():
    """Test camera movement application."""
    keyframes = [
        np.random.randint(0, 256, (240, 320, 3), dtype=np.uint8)
    ]
    
    movements = [
        {"type": "static"},
        {"type": "pan", "direction": "right", "amount": 0.1},
        {"type": "zoom", "factor": 1.2},
        {"type": "dolly", "distance": 1.5},
        {
            "type": "compound",
            "movements": [
                {"type": "pan", "direction": "right", "amount": 0.05},
                {"type": "zoom", "factor": 1.1}
            ]
        }
    ]
    
    engine = AdvancedInterpolationEngine(AdvancedInterpolationConfig())
    
    for movement in movements:
        result = engine.interpolate_frames(
            keyframes, 
            target_frame_count=6,
            camera_movement=movement
        )
        assert len(result) == 6
    
    print("+ Camera movements test passed")


def test_configuration_validation():
    """Test configuration validation."""
    # Valid configuration
    valid_config = AdvancedInterpolationConfig()
    engine = AdvancedInterpolationEngine(valid_config)
    is_valid, issues = engine.validate_configuration()
    assert is_valid
    assert len(issues) == 0
    
    # Invalid configurations
    invalid_configs = [
        # Invalid motion blur intensity
        AdvancedInterpolationConfig(
            motion_blur=MotionBlurConfig(intensity=1.5)
        ),
        # Invalid focal distance
        AdvancedInterpolationConfig(
            depth_of_field=DepthOfFieldConfig(focal_distance=-1.0)
        ),
        # Invalid aperture
        AdvancedInterpolationConfig(
            depth_of_field=DepthOfFieldConfig(aperture=-2.8)
        ),
        # Invalid focal length
        AdvancedInterpolationConfig(
            lens_simulation=LensSimulationConfig(focal_length=-50.0)
        ),
        # Invalid distortion
        AdvancedInterpolationConfig(
            lens_simulation=LensSimulationConfig(distortion=2.0)
        )
    ]
    
    for config in invalid_configs:
        engine = AdvancedInterpolationEngine(config)
        is_valid, issues = engine.validate_configuration()
        assert not is_valid
        assert len(issues) > 0
    
    print("+ Configuration validation test passed")


if __name__ == "__main__":
    test_advanced_interpolation_basic()
    test_interpolation_methods()
    test_motion_blur_effects()
    test_depth_of_field_effects()
    test_lens_simulation()
    test_cinematic_presets()
    test_camera_movements()
    test_configuration_validation()
    print("*** All advanced interpolation tests passed!")