#!/usr/bin/env python3
"""
Tests for Video Configuration Manager

This module tests the comprehensive configuration and customization system including:
- Configuration validation and management
- Preset loading and saving
- Hardware optimization
- Custom configuration creation
- Motion curve and camera override functionality

Requirements: VE-8.1, VE-8.2, VE-8.3, VE-8.4, VE-8.5, VE-8.6, VE-8.8
"""

import unittest
import tempfile
import json
from pathlib import Path
from unittest.mock import patch, MagicMock

import sys
sys.path.append(str(Path(__file__).parent.parent))

from src.video_configuration_manager import (
    VideoConfigurationManager, VideoConfiguration, ResolutionConfig, FrameRateConfig,
    QualityConfig, MotionCurveConfig, CameraOverrideConfig, QualityPreset,
    ResolutionPreset, FrameRatePreset, MotionCurveType, ConfigurationFormat
)


class TestResolutionConfig(unittest.TestCase):
    """Test resolution configuration."""
    
    def test_valid_resolution_config(self):
        """Test valid resolution configuration."""
        config = ResolutionConfig(width=1920, height=1080, aspect_ratio="16:9")
        is_valid, issues = config.validate()
        self.assertTrue(is_valid)
        self.assertEqual(len(issues), 0)
    
    def test_invalid_resolution_dimensions(self):
        """Test invalid resolution dimensions."""
        config = ResolutionConfig(width=0, height=1080)
        is_valid, issues = config.validate()
        self.assertFalse(is_valid)
        self.assertIn("Width and height must be positive", issues)
    
    def test_odd_resolution_dimensions(self):
        """Test odd resolution dimensions."""
        config = ResolutionConfig(width=1921, height=1081)
        is_valid, issues = config.validate()
        self.assertFalse(is_valid)
        self.assertIn("Width and height should be even numbers for video compatibility", issues)
    
    def test_aspect_ratio_mismatch(self):
        """Test aspect ratio mismatch."""
        config = ResolutionConfig(width=1920, height=1200, aspect_ratio="16:9")
        is_valid, issues = config.validate()
        self.assertFalse(is_valid)
        self.assertTrue(any("Aspect ratio mismatch" in issue for issue in issues))
    
    def test_invalid_pixel_aspect_ratio(self):
        """Test invalid pixel aspect ratio."""
        config = ResolutionConfig(pixel_aspect_ratio=0)
        is_valid, issues = config.validate()
        self.assertFalse(is_valid)
        self.assertIn("Pixel aspect ratio must be positive", issues)


class TestFrameRateConfig(unittest.TestCase):
    """Test frame rate configuration."""
    
    def test_valid_frame_rate_config(self):
        """Test valid frame rate configuration."""
        config = FrameRateConfig(fps=24.0, preset=FrameRatePreset.FILM_24)
        is_valid, issues = config.validate()
        self.assertTrue(is_valid)
        self.assertEqual(len(issues), 0)
    
    def test_invalid_frame_rate(self):
        """Test invalid frame rate."""
        config = FrameRateConfig(fps=0)
        is_valid, issues = config.validate()
        self.assertFalse(is_valid)
        self.assertIn("Frame rate must be positive", issues)
    
    def test_extremely_high_frame_rate(self):
        """Test extremely high frame rate."""
        config = FrameRateConfig(fps=300)
        is_valid, issues = config.validate()
        self.assertFalse(is_valid)
        self.assertIn("Frame rate above 240 fps may not be supported", issues)
    
    def test_common_frame_rates(self):
        """Test common frame rates."""
        common_rates = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60, 120]
        for fps in common_rates:
            config = FrameRateConfig(fps=fps)
            is_valid, issues = config.validate()
            self.assertTrue(is_valid, f"Frame rate {fps} should be valid")


class TestQualityConfig(unittest.TestCase):
    """Test quality configuration."""
    
    def test_valid_quality_config(self):
        """Test valid quality configuration."""
        config = QualityConfig(
            preset=QualityPreset.PRODUCTION,
            quality_level=0.8,
            interpolation_samples=16
        )
        is_valid, issues = config.validate()
        self.assertTrue(is_valid)
        self.assertEqual(len(issues), 0)
    
    def test_invalid_quality_level(self):
        """Test invalid quality level."""
        config = QualityConfig(quality_level=1.5)
        is_valid, issues = config.validate()
        self.assertFalse(is_valid)
        self.assertIn("Quality level must be between 0 and 1", issues)
    
    def test_invalid_interpolation_samples(self):
        """Test invalid interpolation samples."""
        config = QualityConfig(interpolation_samples=0)
        is_valid, issues = config.validate()
        self.assertFalse(is_valid)
        self.assertIn("Interpolation samples must be at least 1", issues)
    
    def test_invalid_motion_estimation_accuracy(self):
        """Test invalid motion estimation accuracy."""
        config = QualityConfig(motion_estimation_accuracy=1.5)
        is_valid, issues = config.validate()
        self.assertFalse(is_valid)
        self.assertIn("Motion estimation accuracy must be between 0 and 1", issues)
    
    def test_invalid_color_depth(self):
        """Test invalid color depth."""
        config = QualityConfig(color_depth=12)
        is_valid, issues = config.validate()
        self.assertFalse(is_valid)
        self.assertIn("Color depth must be 8, 10, or 16 bits", issues)
    
    def test_invalid_chroma_subsampling(self):
        """Test invalid chroma subsampling."""
        config = QualityConfig(chroma_subsampling="4:1:1")
        is_valid, issues = config.validate()
        self.assertFalse(is_valid)
        self.assertIn("Invalid chroma subsampling format", issues)


class TestMotionCurveConfig(unittest.TestCase):
    """Test motion curve configuration."""
    
    def test_valid_motion_curve_config(self):
        """Test valid motion curve configuration."""
        config = MotionCurveConfig(
            curve_type=MotionCurveType.EASE_IN_OUT,
            ease_strength=2.0
        )
        is_valid, issues = config.validate()
        self.assertTrue(is_valid)
        self.assertEqual(len(issues), 0)
    
    def test_invalid_ease_strength(self):
        """Test invalid ease strength."""
        config = MotionCurveConfig(ease_strength=0)
        is_valid, issues = config.validate()
        self.assertFalse(is_valid)
        self.assertIn("Ease strength must be positive", issues)
    
    def test_invalid_bounce_amplitude(self):
        """Test invalid bounce amplitude."""
        config = MotionCurveConfig(bounce_amplitude=1.5)
        is_valid, issues = config.validate()
        self.assertFalse(is_valid)
        self.assertIn("Bounce amplitude must be between 0 and 1", issues)
    
    def test_invalid_control_points(self):
        """Test invalid Bezier control points."""
        config = MotionCurveConfig(
            curve_type=MotionCurveType.CUSTOM_BEZIER,
            control_points=[(0.0, 0.0), (1.5, 0.5)]  # x > 1
        )
        is_valid, issues = config.validate()
        self.assertFalse(is_valid)
        self.assertTrue(any("x-coordinate must be between 0 and 1" in issue for issue in issues))
    
    def test_insufficient_control_points(self):
        """Test insufficient control points for Bezier curve."""
        config = MotionCurveConfig(
            curve_type=MotionCurveType.CUSTOM_BEZIER,
            control_points=[(0.0, 0.0)]  # Only one point
        )
        is_valid, issues = config.validate()
        self.assertFalse(is_valid)
        self.assertIn("Bezier curve needs at least 2 control points", issues)


class TestCameraOverrideConfig(unittest.TestCase):
    """Test camera override configuration."""
    
    def test_valid_camera_override_config(self):
        """Test valid camera override configuration."""
        config = CameraOverrideConfig(
            enable_override=True,
            position_keyframes=[(0.0, 0.0, 0.0), (1.0, 1.0, 1.0)],
            override_pan=True
        )
        is_valid, issues = config.validate()
        self.assertTrue(is_valid)
        self.assertEqual(len(issues), 0)
    
    def test_invalid_position_keyframe_time(self):
        """Test invalid position keyframe time."""
        config = CameraOverrideConfig(
            position_keyframes=[(1.5, 0.0, 0.0)]  # time > 1
        )
        is_valid, issues = config.validate()
        self.assertFalse(is_valid)
        self.assertTrue(any("time must be between 0 and 1" in issue for issue in issues))
    
    def test_invalid_rotation_keyframe_angles(self):
        """Test invalid rotation keyframe angles."""
        config = CameraOverrideConfig(
            rotation_keyframes=[(0.5, 200.0, 0.0, 0.0)]  # pitch > 180
        )
        is_valid, issues = config.validate()
        self.assertFalse(is_valid)
        self.assertTrue(any("pitch must be between -180 and 180" in issue for issue in issues))
    
    def test_invalid_zoom_keyframe(self):
        """Test invalid zoom keyframe."""
        config = CameraOverrideConfig(
            zoom_keyframes=[(0.5, 0.0)]  # zoom factor = 0
        )
        is_valid, issues = config.validate()
        self.assertFalse(is_valid)
        self.assertTrue(any("zoom factor must be positive" in issue for issue in issues))


class TestVideoConfiguration(unittest.TestCase):
    """Test complete video configuration."""
    
    def test_valid_video_configuration(self):
        """Test valid video configuration."""
        config = VideoConfiguration()
        is_valid, issues = config.validate()
        self.assertTrue(is_valid)
        self.assertEqual(len(issues), 0)
    
    def test_video_configuration_with_invalid_components(self):
        """Test video configuration with invalid components."""
        config = VideoConfiguration(
            resolution=ResolutionConfig(width=0, height=1080),  # Invalid
            frame_rate=FrameRateConfig(fps=-1)  # Invalid
        )
        is_valid, issues = config.validate()
        self.assertFalse(is_valid)
        self.assertGreater(len(issues), 0)


class TestVideoConfigurationManager(unittest.TestCase):
    """Test video configuration manager."""
    
    def setUp(self):
        """Set up test environment."""
        self.temp_dir = tempfile.mkdtemp()
        self.config_dir = Path(self.temp_dir) / "config"
        self.manager = VideoConfigurationManager(self.config_dir)
    
    def tearDown(self):
        """Clean up test environment."""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def test_manager_initialization(self):
        """Test manager initialization."""
        self.assertTrue(self.config_dir.exists())
        self.assertTrue((self.config_dir / "presets").exists())
        self.assertIsInstance(self.manager.current_config, VideoConfiguration)
    
    def test_builtin_presets_creation(self):
        """Test built-in presets creation."""
        preset_names = self.manager.get_preset_names()
        expected_presets = [
            "documentary", "cinematic", "action", "portrait",
            "broadcast", "web_video", "social_media", "animation"
        ]
        
        for preset in expected_presets:
            self.assertIn(preset, preset_names)
    
    def test_load_preset(self):
        """Test loading preset configuration."""
        config = self.manager.load_preset("cinematic")
        self.assertIsInstance(config, VideoConfiguration)
        self.assertEqual(config.cinematic_preset, "cinematic")
        
        # Validate preset
        is_valid, issues = config.validate()
        self.assertTrue(is_valid, f"Cinematic preset validation issues: {issues}")
    
    def test_save_and_load_custom_preset(self):
        """Test saving and loading custom preset."""
        # Create custom configuration
        custom_config = VideoConfiguration(
            interpolation_method="ai_based",
            motion_blur_intensity=0.9,
            cinematic_preset="test_custom"
        )
        
        # Save as preset
        self.manager.save_preset(custom_config, "test_custom")
        
        # Load and verify
        loaded_config = self.manager.load_preset("test_custom")
        self.assertEqual(loaded_config.interpolation_method, "ai_based")
        self.assertEqual(loaded_config.motion_blur_intensity, 0.9)
        self.assertEqual(loaded_config.cinematic_preset, "test_custom")
    
    def test_create_custom_configuration(self):
        """Test creating custom configuration with overrides."""
        custom_config = self.manager.create_custom_configuration(
            "documentary",
            motion_blur_intensity=0.8,
            interpolation_method="depth_aware"
        )
        
        self.assertEqual(custom_config.motion_blur_intensity, 0.8)
        self.assertEqual(custom_config.interpolation_method, "depth_aware")
        self.assertEqual(custom_config.cinematic_preset, "custom")
    
    def test_hardware_optimization(self):
        """Test hardware optimization."""
        base_config = self.manager.load_preset("cinematic")
        
        # Test low-end hardware optimization
        optimized = self.manager.optimize_for_hardware(
            base_config,
            gpu_available=False,
            memory_gb=2.0,
            cpu_cores=2
        )
        
        self.assertFalse(optimized.quality.gpu_acceleration)
        self.assertFalse(optimized.quality.parallel_processing)
        self.assertFalse(optimized.motion_blur_enabled)
        self.assertFalse(optimized.depth_of_field_enabled)
        self.assertLessEqual(optimized.quality.quality_level, 0.7)
    
    def test_configuration_summary(self):
        """Test configuration summary generation."""
        config = self.manager.load_preset("action")
        summary = self.manager.get_configuration_summary(config)
        
        self.assertIn("preset", summary)
        self.assertIn("resolution", summary)
        self.assertIn("frame_rate", summary)
        self.assertIn("quality_level", summary)
        self.assertIn("effects", summary)
        
        self.assertEqual(summary["preset"], "action")
        self.assertIn("60", summary["frame_rate"])  # 60 fps for action
    
    def test_save_and_load_configuration_json(self):
        """Test saving and loading configuration in JSON format."""
        config = VideoConfiguration(interpolation_method="ai_based")
        config_file = self.config_dir / "test_config.json"
        
        # Save configuration
        self.manager.save_configuration(config, config_file, ConfigurationFormat.JSON)
        self.assertTrue(config_file.exists())
        
        # Load configuration
        loaded_config = self.manager.load_configuration(config_file)
        self.assertEqual(loaded_config.interpolation_method, "ai_based")
    
    def test_save_and_load_configuration_yaml(self):
        """Test saving and loading configuration in YAML format."""
        config = VideoConfiguration(motion_blur_intensity=0.7)
        config_file = self.config_dir / "test_config.yml"
        
        # Save configuration
        self.manager.save_configuration(config, config_file, ConfigurationFormat.YAML)
        self.assertTrue(config_file.exists())
        
        # Load configuration
        loaded_config = self.manager.load_configuration(config_file)
        self.assertEqual(loaded_config.motion_blur_intensity, 0.7)
    
    def test_invalid_preset_loading(self):
        """Test loading non-existent preset."""
        with self.assertRaises(ValueError):
            self.manager.load_preset("non_existent_preset")
    
    def test_preset_validation(self):
        """Test validation of all built-in presets."""
        preset_names = self.manager.get_preset_names()
        
        for preset_name in preset_names:
            with self.subTest(preset=preset_name):
                config = self.manager.load_preset(preset_name)
                is_valid, issues = config.validate()
                self.assertTrue(is_valid, f"Preset '{preset_name}' validation failed: {issues}")
    
    def test_configuration_format_detection(self):
        """Test automatic configuration format detection."""
        # Test JSON format
        json_config = VideoConfiguration(interpolation_method="linear")
        json_file = self.config_dir / "test.json"
        self.manager.save_configuration(json_config, json_file)
        
        loaded_json = self.manager.load_configuration(json_file)
        self.assertEqual(loaded_json.interpolation_method, "linear")
        
        # Test YAML format
        yaml_config = VideoConfiguration(interpolation_method="optical_flow")
        yaml_file = self.config_dir / "test.yaml"
        self.manager.save_configuration(yaml_config, yaml_file, ConfigurationFormat.YAML)
        
        loaded_yaml = self.manager.load_configuration(yaml_file)
        self.assertEqual(loaded_yaml.interpolation_method, "optical_flow")


class TestConfigurationIntegration(unittest.TestCase):
    """Test configuration system integration."""
    
    def setUp(self):
        """Set up test environment."""
        self.temp_dir = tempfile.mkdtemp()
        self.config_dir = Path(self.temp_dir) / "config"
        self.manager = VideoConfigurationManager(self.config_dir)
    
    def tearDown(self):
        """Clean up test environment."""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    def test_preset_consistency(self):
        """Test consistency across different presets."""
        presets = ["documentary", "cinematic", "action", "portrait"]
        
        for preset_name in presets:
            with self.subTest(preset=preset_name):
                config = self.manager.load_preset(preset_name)
                
                # All presets should have valid configurations
                is_valid, issues = config.validate()
                self.assertTrue(is_valid, f"Preset {preset_name} invalid: {issues}")
                
                # All presets should have reasonable quality levels
                self.assertGreaterEqual(config.quality.quality_level, 0.5)
                self.assertLessEqual(config.quality.quality_level, 1.0)
                
                # All presets should have positive frame rates
                self.assertGreater(config.frame_rate.fps, 0)
                
                # All presets should have valid resolutions
                self.assertGreater(config.resolution.width, 0)
                self.assertGreater(config.resolution.height, 0)
    
    def test_hardware_optimization_consistency(self):
        """Test hardware optimization consistency."""
        base_config = self.manager.load_preset("cinematic")
        
        # Test different hardware configurations
        hardware_configs = [
            {"gpu_available": True, "memory_gb": 16.0, "cpu_cores": 8},
            {"gpu_available": True, "memory_gb": 8.0, "cpu_cores": 4},
            {"gpu_available": False, "memory_gb": 4.0, "cpu_cores": 2},
            {"gpu_available": False, "memory_gb": 2.0, "cpu_cores": 1}
        ]
        
        for hw_config in hardware_configs:
            with self.subTest(hardware=hw_config):
                optimized = self.manager.optimize_for_hardware(base_config, **hw_config)
                
                # Optimized config should be valid
                is_valid, issues = optimized.validate()
                self.assertTrue(is_valid, f"Optimized config invalid: {issues}")
                
                # GPU settings should match availability
                self.assertEqual(optimized.quality.gpu_acceleration, hw_config["gpu_available"])
                
                # Memory limit should not exceed available memory
                self.assertLessEqual(optimized.quality.memory_limit_gb, hw_config["memory_gb"])
    
    def test_configuration_serialization_roundtrip(self):
        """Test configuration serialization roundtrip."""
        original_config = self.manager.load_preset("action")
        
        # Test JSON roundtrip
        json_file = self.config_dir / "roundtrip.json"
        self.manager.save_configuration(original_config, json_file)
        loaded_json = self.manager.load_configuration(json_file)
        
        # Compare key attributes
        self.assertEqual(original_config.interpolation_method, loaded_json.interpolation_method)
        self.assertEqual(original_config.motion_blur_intensity, loaded_json.motion_blur_intensity)
        self.assertEqual(original_config.frame_rate.fps, loaded_json.frame_rate.fps)
        self.assertEqual(original_config.resolution.width, loaded_json.resolution.width)
        
        # Test YAML roundtrip
        yaml_file = self.config_dir / "roundtrip.yaml"
        self.manager.save_configuration(original_config, yaml_file, ConfigurationFormat.YAML)
        loaded_yaml = self.manager.load_configuration(yaml_file)
        
        # Compare key attributes
        self.assertEqual(original_config.interpolation_method, loaded_yaml.interpolation_method)
        self.assertEqual(original_config.motion_blur_intensity, loaded_yaml.motion_blur_intensity)


if __name__ == "__main__":
    unittest.main()