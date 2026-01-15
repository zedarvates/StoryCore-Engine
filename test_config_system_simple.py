#!/usr/bin/env python3
"""
Simple test for Video Configuration System

This script tests the basic functionality of the video configuration system
to ensure it works correctly before running comprehensive tests.

Requirements: VE-8.1, VE-8.2, VE-8.3, VE-8.4, VE-8.5, VE-8.6, VE-8.8
"""

import sys
import tempfile
from pathlib import Path

# Add src to path
sys.path.append(str(Path(__file__).parent / "src"))

from video_configuration_manager import (
    VideoConfigurationManager, VideoConfiguration, ResolutionConfig,
    FrameRateConfig, QualityConfig, MotionCurveConfig, CameraOverrideConfig,
    QualityPreset, ResolutionPreset, FrameRatePreset, MotionCurveType
)


def test_basic_configuration():
    """Test basic configuration creation and validation."""
    print("Testing basic configuration...")
    
    # Test default configuration
    config = VideoConfiguration()
    is_valid, issues = config.validate()
    assert is_valid, f"Default configuration should be valid, issues: {issues}"
    print("✓ Default configuration is valid")
    
    # Test resolution configuration
    resolution = ResolutionConfig(width=1920, height=1080, aspect_ratio="16:9")
    is_valid, issues = resolution.validate()
    assert is_valid, f"Resolution configuration should be valid, issues: {issues}"
    print("✓ Resolution configuration is valid")
    
    # Test frame rate configuration
    frame_rate = FrameRateConfig(fps=24.0, preset=FrameRatePreset.FILM_24)
    is_valid, issues = frame_rate.validate()
    assert is_valid, f"Frame rate configuration should be valid, issues: {issues}"
    print("✓ Frame rate configuration is valid")
    
    # Test quality configuration
    quality = QualityConfig(preset=QualityPreset.PRODUCTION, quality_level=0.8)
    is_valid, issues = quality.validate()
    assert is_valid, f"Quality configuration should be valid, issues: {issues}"
    print("✓ Quality configuration is valid")
    
    # Test motion curve configuration
    motion_curves = MotionCurveConfig(curve_type=MotionCurveType.EASE_IN_OUT)
    is_valid, issues = motion_curves.validate()
    assert is_valid, f"Motion curve configuration should be valid, issues: {issues}"
    print("✓ Motion curve configuration is valid")
    
    # Test camera override configuration
    camera_override = CameraOverrideConfig(enable_override=False)
    is_valid, issues = camera_override.validate()
    assert is_valid, f"Camera override configuration should be valid, issues: {issues}"
    print("✓ Camera override configuration is valid")


def test_configuration_manager():
    """Test configuration manager functionality."""
    print("\nTesting configuration manager...")
    
    # Create temporary directory for testing
    with tempfile.TemporaryDirectory() as temp_dir:
        config_dir = Path(temp_dir) / "config"
        manager = VideoConfigurationManager(config_dir)
        
        # Test manager initialization
        assert config_dir.exists(), "Config directory should be created"
        assert (config_dir / "presets").exists(), "Presets directory should be created"
        print("✓ Configuration manager initialized successfully")
        
        # Test preset loading
        preset_names = manager.get_preset_names()
        assert len(preset_names) > 0, "Should have built-in presets"
        print(f"✓ Found {len(preset_names)} built-in presets: {preset_names}")
        
        # Test loading specific presets
        test_presets = ["documentary", "cinematic", "action", "portrait"]
        for preset_name in test_presets:
            if preset_name in preset_names:
                config = manager.load_preset(preset_name)
                assert isinstance(config, VideoConfiguration), f"Should load {preset_name} preset"
                
                is_valid, issues = config.validate()
                assert is_valid, f"Preset {preset_name} should be valid, issues: {issues}"
                print(f"✓ Preset '{preset_name}' loaded and validated successfully")


def test_custom_configuration():
    """Test custom configuration creation."""
    print("\nTesting custom configuration...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        config_dir = Path(temp_dir) / "config"
        manager = VideoConfigurationManager(config_dir)
        
        # Test custom configuration creation
        custom_config = manager.create_custom_configuration(
            "documentary",
            motion_blur_intensity=0.8,
            interpolation_method="ai_based"
        )
        
        assert custom_config.motion_blur_intensity == 0.8, "Custom motion blur intensity should be applied"
        assert custom_config.interpolation_method == "ai_based", "Custom interpolation method should be applied"
        assert custom_config.cinematic_preset == "custom", "Should be marked as custom preset"
        
        is_valid, issues = custom_config.validate()
        assert is_valid, f"Custom configuration should be valid, issues: {issues}"
        print("✓ Custom configuration created and validated successfully")


def test_hardware_optimization():
    """Test hardware optimization."""
    print("\nTesting hardware optimization...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        config_dir = Path(temp_dir) / "config"
        manager = VideoConfigurationManager(config_dir)
        
        # Load base configuration
        base_config = manager.load_preset("cinematic")
        
        # Test low-end hardware optimization
        optimized = manager.optimize_for_hardware(
            base_config,
            gpu_available=False,
            memory_gb=2.0,
            cpu_cores=2
        )
        
        assert not optimized.quality.gpu_acceleration, "GPU acceleration should be disabled"
        assert not optimized.quality.parallel_processing, "Parallel processing should be disabled"
        assert optimized.quality.memory_limit_gb <= 2.0, "Memory limit should be within available memory"
        
        is_valid, issues = optimized.validate()
        assert is_valid, f"Optimized configuration should be valid, issues: {issues}"
        print("✓ Hardware optimization completed successfully")


def test_configuration_summary():
    """Test configuration summary generation."""
    print("\nTesting configuration summary...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        config_dir = Path(temp_dir) / "config"
        manager = VideoConfigurationManager(config_dir)
        
        # Test summary generation
        config = manager.load_preset("action")
        summary = manager.get_configuration_summary(config)
        
        required_keys = ["preset", "resolution", "frame_rate", "quality_level", "effects"]
        for key in required_keys:
            assert key in summary, f"Summary should contain '{key}'"
        
        assert summary["preset"] == "action", "Summary should show correct preset"
        assert "60" in summary["frame_rate"], "Action preset should use 60 fps"
        print("✓ Configuration summary generated successfully")


def test_save_and_load():
    """Test configuration save and load."""
    print("\nTesting configuration save and load...")
    
    with tempfile.TemporaryDirectory() as temp_dir:
        config_dir = Path(temp_dir) / "config"
        manager = VideoConfigurationManager(config_dir)
        
        # Create test configuration
        test_config = VideoConfiguration(
            interpolation_method="depth_aware",
            motion_blur_intensity=0.7,
            cinematic_preset="test_preset"
        )
        
        # Save configuration
        config_file = config_dir / "test_config.json"
        manager.save_configuration(test_config, config_file)
        assert config_file.exists(), "Configuration file should be created"
        
        # Load configuration
        loaded_config = manager.load_configuration(config_file)
        assert loaded_config.interpolation_method == "depth_aware", "Interpolation method should be preserved"
        assert loaded_config.motion_blur_intensity == 0.7, "Motion blur intensity should be preserved"
        
        is_valid, issues = loaded_config.validate()
        assert is_valid, f"Loaded configuration should be valid, issues: {issues}"
        print("✓ Configuration save and load completed successfully")


def test_validation_errors():
    """Test configuration validation with errors."""
    print("\nTesting validation error handling...")
    
    # Test invalid resolution
    invalid_resolution = ResolutionConfig(width=0, height=1080)
    is_valid, issues = invalid_resolution.validate()
    assert not is_valid, "Invalid resolution should fail validation"
    assert len(issues) > 0, "Should have validation issues"
    print("✓ Invalid resolution properly rejected")
    
    # Test invalid frame rate
    invalid_frame_rate = FrameRateConfig(fps=-1)
    is_valid, issues = invalid_frame_rate.validate()
    assert not is_valid, "Invalid frame rate should fail validation"
    assert len(issues) > 0, "Should have validation issues"
    print("✓ Invalid frame rate properly rejected")
    
    # Test invalid quality settings
    invalid_quality = QualityConfig(quality_level=1.5)
    is_valid, issues = invalid_quality.validate()
    assert not is_valid, "Invalid quality level should fail validation"
    assert len(issues) > 0, "Should have validation issues"
    print("✓ Invalid quality settings properly rejected")


def main():
    """Run all tests."""
    print("Starting Video Configuration System Tests")
    print("=" * 50)
    
    try:
        test_basic_configuration()
        test_configuration_manager()
        test_custom_configuration()
        test_hardware_optimization()
        test_configuration_summary()
        test_save_and_load()
        test_validation_errors()
        
        print("\n" + "=" * 50)
        print("✓ All Video Configuration System tests passed successfully!")
        print("Configuration system is ready for use.")
        
        return True
        
    except Exception as e:
        print(f"\n✗ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)