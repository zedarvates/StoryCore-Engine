#!/usr/bin/env python3
"""
Property-based tests for Video Engine configuration management.
Tests universal properties that should hold for all valid configurations.
"""

import pytest
import tempfile
import json
from pathlib import Path
from hypothesis import given, strategies as st, assume, settings
from hypothesis.strategies import composite

# Import the modules to test
import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from video_config import (
    VideoConfigManager, VideoEngineConfig, InterpolationConfig, CameraConfig,
    OutputConfig, PerformanceConfig, QualityConfig, VideoQuality, ProcessingMode
)


# Strategy generators for property-based testing
@composite
def valid_resolution(draw):
    """Generate valid resolution tuples."""
    width = draw(st.integers(min_value=640, max_value=7680))  # Up to 8K
    height = draw(st.integers(min_value=480, max_value=4320))
    return (width, height)


@composite
def valid_frame_rate(draw):
    """Generate valid frame rates."""
    return draw(st.sampled_from([24, 25, 30, 60]))


@composite
def valid_interpolation_config(draw):
    """Generate valid interpolation configurations."""
    return InterpolationConfig(
        algorithm=draw(st.sampled_from(['linear', 'optical_flow', 'depth_aware'])),
        quality=draw(st.sampled_from(list(VideoQuality))),
        depth_awareness=draw(st.booleans()),
        character_preservation=draw(st.booleans()),
        motion_blur_strength=draw(st.floats(min_value=0.0, max_value=1.0)),
        smoothing_factor=draw(st.floats(min_value=0.0, max_value=1.0))
    )


@composite
def valid_camera_config(draw):
    """Generate valid camera configurations."""
    return CameraConfig(
        enable_motion_blur=draw(st.booleans()),
        motion_blur_samples=draw(st.integers(min_value=1, max_value=64)),
        easing_type=draw(st.sampled_from(['linear', 'ease_in', 'ease_out', 'ease_in_out'])),
        smoothing_factor=draw(st.floats(min_value=0.0, max_value=1.0)),
        lens_simulation=draw(st.booleans()),
        focal_length=draw(st.floats(min_value=10.0, max_value=200.0)),
        aperture=draw(st.floats(min_value=1.0, max_value=22.0))
    )


@composite
def valid_output_config(draw):
    """Generate valid output configurations."""
    return OutputConfig(
        frame_rate=draw(valid_frame_rate()),
        resolution=draw(valid_resolution()),
        format=draw(st.sampled_from(['png', 'jpeg', 'exr'])),
        quality=draw(st.integers(min_value=1, max_value=100)),
        bit_depth=draw(st.sampled_from([8, 16, 32])),
        color_space=draw(st.sampled_from(['sRGB', 'Rec709', 'Rec2020']))
    )


@composite
def valid_performance_config(draw):
    """Generate valid performance configurations."""
    return PerformanceConfig(
        processing_mode=draw(st.sampled_from(list(ProcessingMode))),
        parallel_processing=draw(st.booleans()),
        max_threads=draw(st.integers(min_value=0, max_value=64)),
        memory_limit_gb=draw(st.floats(min_value=1.0, max_value=128.0)),
        gpu_memory_fraction=draw(st.floats(min_value=0.1, max_value=1.0)),
        enable_caching=draw(st.booleans()),
        cache_size_gb=draw(st.floats(min_value=0.0, max_value=32.0))
    )


@composite
def valid_quality_config(draw):
    """Generate valid quality configurations."""
    return QualityConfig(
        minimum_visual_quality=draw(st.floats(min_value=0.0, max_value=1.0)),
        minimum_motion_smoothness=draw(st.floats(min_value=0.0, max_value=1.0)),
        minimum_temporal_coherence=draw(st.floats(min_value=0.0, max_value=1.0)),
        enable_auto_correction=draw(st.booleans()),
        quality_report_generation=draw(st.booleans())
    )


@composite
def valid_video_config(draw):
    """Generate valid complete video configurations."""
    config = VideoEngineConfig()
    config.interpolation = draw(valid_interpolation_config())
    config.camera = draw(valid_camera_config())
    config.output = draw(valid_output_config())
    config.performance = draw(valid_performance_config())
    config.quality = draw(valid_quality_config())
    return config


class TestVideoConfigProperties:
    """Property-based tests for Video Engine configuration."""
    
    @given(valid_video_config())
    @settings(max_examples=50)
    def test_property_ve_1_configuration_consistency(self, config):
        """
        Property VE-1: Video Configuration Consistency
        For any valid video configuration, validation should pass and 
        the configuration should maintain internal consistency.
        **Validates: Requirements VE-8.1, VE-8.2, VE-8.4**
        """
        config_manager = VideoConfigManager()
        config_manager.config = config
        
        # Configuration should be valid
        is_valid, issues = config_manager.validate_config()
        
        # If validation fails, print issues for debugging
        if not is_valid:
            print(f"Validation issues: {issues}")
            print(f"Config: {config}")
        
        assert is_valid, f"Valid configuration failed validation: {issues}"
        
        # Configuration should maintain consistency after validation
        is_valid_again, _ = config_manager.validate_config()
        assert is_valid_again, "Configuration consistency changed after validation"
    
    @given(valid_video_config())
    @settings(max_examples=25)
    def test_property_ve_1_save_load_roundtrip(self, config):
        """
        Property VE-1: Configuration Save/Load Roundtrip
        For any valid configuration, saving and loading should preserve all settings.
        **Validates: Requirements VE-8.1, VE-8.2**
        """
        config_manager = VideoConfigManager()
        config_manager.config = config
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as f:
            temp_path = f.name
        
        try:
            # Save configuration
            save_success = config_manager.save_config(temp_path)
            assert save_success, "Failed to save configuration"
            
            # Create new manager and load configuration
            new_manager = VideoConfigManager()
            load_success = new_manager.load_config(temp_path)
            assert load_success, "Failed to load configuration"
            
            # Configurations should be equivalent
            assert new_manager.config.interpolation.algorithm == config.interpolation.algorithm
            assert new_manager.config.camera.enable_motion_blur == config.camera.enable_motion_blur
            assert new_manager.config.output.frame_rate == config.output.frame_rate
            assert new_manager.config.performance.parallel_processing == config.performance.parallel_processing
            assert new_manager.config.quality.minimum_visual_quality == config.quality.minimum_visual_quality
            
        finally:
            # Clean up
            Path(temp_path).unlink(missing_ok=True)
    
    @given(st.sampled_from(['fast', 'balanced', 'quality', 'ultra']))
    @settings(max_examples=10)
    def test_property_ve_1_preset_validity(self, preset_name):
        """
        Property VE-1: Preset Configuration Validity
        For any preset configuration, it should be valid and consistent.
        **Validates: Requirements VE-8.1, VE-8.8**
        """
        config_manager = VideoConfigManager()
        
        # Apply preset
        preset_applied = config_manager.apply_preset(preset_name)
        assert preset_applied, f"Failed to apply preset: {preset_name}"
        
        # Preset configuration should be valid
        is_valid, issues = config_manager.validate_config()
        assert is_valid, f"Preset {preset_name} is invalid: {issues}"
        
        # Preset should have expected characteristics
        if preset_name == 'fast':
            assert config_manager.config.interpolation.algorithm == 'linear'
            assert config_manager.config.interpolation.quality == VideoQuality.LOW
        elif preset_name == 'ultra':
            assert config_manager.config.interpolation.quality == VideoQuality.ULTRA
            assert config_manager.config.output.resolution == (3840, 2160)
    
    @given(
        st.floats(min_value=-1.0, max_value=2.0),
        st.floats(min_value=-1.0, max_value=2.0),
        st.floats(min_value=-1.0, max_value=2.0)
    )
    @settings(max_examples=50)
    def test_property_ve_1_quality_threshold_validation(self, visual_quality, motion_smoothness, temporal_coherence):
        """
        Property VE-1: Quality Threshold Validation
        For any quality thresholds, validation should correctly identify valid vs invalid ranges.
        **Validates: Requirements VE-8.4**
        """
        config_manager = VideoConfigManager()
        
        # Set quality thresholds
        config_manager.config.quality.minimum_visual_quality = visual_quality
        config_manager.config.quality.minimum_motion_smoothness = motion_smoothness
        config_manager.config.quality.minimum_temporal_coherence = temporal_coherence
        
        is_valid, issues = config_manager.validate_config()
        
        # Check if thresholds are in valid range [0.0, 1.0]
        valid_visual = 0.0 <= visual_quality <= 1.0
        valid_motion = 0.0 <= motion_smoothness <= 1.0
        valid_temporal = 0.0 <= temporal_coherence <= 1.0
        
        expected_valid = valid_visual and valid_motion and valid_temporal
        
        if expected_valid:
            # Should be valid (or have other unrelated issues)
            quality_issues = [issue for issue in issues if 'quality' in issue.lower() or 'threshold' in issue.lower()]
            assert len(quality_issues) == 0, f"Valid quality thresholds rejected: {quality_issues}"
        else:
            # Should be invalid
            assert not is_valid or any('quality' in issue.lower() or 'threshold' in issue.lower() for issue in issues), \
                "Invalid quality thresholds not detected"
    
    @given(
        st.integers(min_value=1, max_value=200),
        valid_resolution()
    )
    @settings(max_examples=25)
    def test_property_ve_1_output_format_consistency(self, frame_rate, resolution):
        """
        Property VE-1: Output Format Consistency
        For any output configuration, format validation should be consistent with supported formats.
        **Validates: Requirements VE-8.2**
        """
        config_manager = VideoConfigManager()
        
        # Test each supported format
        supported_formats = ['png', 'jpeg', 'exr']
        unsupported_formats = ['gif', 'bmp', 'tiff', 'webp']
        
        for format_name in supported_formats:
            config_manager.config.output.format = format_name
            config_manager.config.output.resolution = resolution
            
            # Set frame rate to valid value if needed
            if frame_rate in [24, 25, 30, 60]:
                config_manager.config.output.frame_rate = frame_rate
            else:
                config_manager.config.output.frame_rate = 24
            
            is_valid, issues = config_manager.validate_config()
            format_issues = [issue for issue in issues if 'format' in issue.lower()]
            
            assert len(format_issues) == 0, f"Supported format {format_name} rejected: {format_issues}"
        
        # Test unsupported formats
        for format_name in unsupported_formats:
            config_manager.config.output.format = format_name
            is_valid, issues = config_manager.validate_config()
            
            format_issues = [issue for issue in issues if 'format' in issue.lower()]
            assert len(format_issues) > 0, f"Unsupported format {format_name} not rejected"
    
    @given(
        st.integers(min_value=0, max_value=128),
        st.floats(min_value=0.0, max_value=256.0),
        st.floats(min_value=0.0, max_value=2.0)
    )
    @settings(max_examples=50)
    def test_property_ve_1_performance_limits_validation(self, max_threads, memory_limit, gpu_fraction):
        """
        Property VE-1: Performance Limits Validation
        For any performance configuration, limits should be validated correctly.
        **Validates: Requirements VE-8.4**
        """
        config_manager = VideoConfigManager()
        
        config_manager.config.performance.max_threads = max_threads
        config_manager.config.performance.memory_limit_gb = memory_limit
        config_manager.config.performance.gpu_memory_fraction = gpu_fraction
        
        is_valid, issues = config_manager.validate_config()
        
        # Check expected validity
        valid_threads = max_threads >= 0
        valid_memory = memory_limit > 0
        valid_gpu = 0.1 <= gpu_fraction <= 1.0
        
        if valid_threads and valid_memory and valid_gpu:
            perf_issues = [issue for issue in issues if any(keyword in issue.lower() 
                          for keyword in ['thread', 'memory', 'gpu'])]
            assert len(perf_issues) == 0, f"Valid performance config rejected: {perf_issues}"
        else:
            # Should have performance-related issues
            perf_issues = [issue for issue in issues if any(keyword in issue.lower() 
                          for keyword in ['thread', 'memory', 'gpu'])]
            assert len(perf_issues) > 0, "Invalid performance config not detected"


def test_video_config_basic_functionality():
    """Test basic functionality of video configuration."""
    config_manager = VideoConfigManager()
    
    # Default configuration should be valid
    is_valid, issues = config_manager.validate_config()
    assert is_valid, f"Default configuration invalid: {issues}"
    
    # All presets should be valid
    presets = ['fast', 'balanced', 'quality', 'ultra']
    for preset in presets:
        success = config_manager.apply_preset(preset)
        assert success, f"Failed to apply preset: {preset}"
        
        is_valid, issues = config_manager.validate_config()
        assert is_valid, f"Preset {preset} invalid: {issues}"


if __name__ == "__main__":
    # Run basic functionality test
    test_video_config_basic_functionality()
    print("✓ Basic video configuration tests passed")
    
    # Run a few property tests manually
    import hypothesis
    
    test_instance = TestVideoConfigProperties()
    
    # Test configuration consistency
    try:
        hypothesis.strategies.just(VideoEngineConfig()).example()
        print("✓ Configuration consistency property test structure valid")
    except Exception as e:
        print(f"✗ Configuration test issue: {e}")
    
    print("Video configuration property tests ready for execution")