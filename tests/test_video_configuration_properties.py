#!/usr/bin/env python3
"""
Property Tests for Video Configuration System

This module implements property-based tests for the video configuration system:
- Property VE-29: Configuration Flexibility (Task 18.2)
- Property VE-30: Preset Consistency (Task 18.3)

Requirements: VE-8.1, VE-8.2, VE-8.4, VE-8.5, VE-8.6, VE-8.8
"""

import unittest
import tempfile
from pathlib import Path
from hypothesis import given, strategies as st, assume, settings
from hypothesis.stateful import RuleBasedStateMachine, rule, invariant
import sys

sys.path.append(str(Path(__file__).parent.parent))

from src.video_configuration_manager import (
    VideoConfigurationManager, VideoConfiguration, ResolutionConfig, FrameRateConfig,
    QualityConfig, MotionCurveConfig, CameraOverrideConfig, QualityPreset,
    ResolutionPreset, FrameRatePreset, MotionCurveType, ConfigurationFormat
)


class TestConfigurationFlexibilityProperties(unittest.TestCase):
    """Property VE-29: Configuration Flexibility Tests."""
    
    def setUp(self):
        """Set up test environment."""
        self.temp_dir = tempfile.mkdtemp()
        self.config_dir = Path(self.temp_dir) / "config"
        self.manager = VideoConfigurationManager(self.config_dir)
    
    def tearDown(self):
        """Clean up test environment."""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    @given(
        width=st.sampled_from([1280, 1920, 2560, 3840, 7680]),  # Standard 16:9 widths
        fps=st.floats(min_value=1.0, max_value=120.0),
        quality_level=st.floats(min_value=0.1, max_value=1.0),
        interpolation_samples=st.integers(min_value=1, max_value=64)
    )
    @settings(max_examples=25, deadline=5000)
    def test_property_ve29_configurable_interpolation_algorithms(self, width, fps, quality_level, interpolation_samples):
        """
        Property VE-29.1: Configurable interpolation algorithms
        
        Tests that the system supports configurable interpolation algorithms
        with various parameter combinations (VE-8.1).
        """
        # Calculate height to maintain 16:9 aspect ratio
        height = int(width * 9 / 16)
        if height % 2 != 0:  # Ensure even height
            height += 1
        
        # Create configuration with custom interpolation settings
        config = VideoConfiguration(
            resolution=ResolutionConfig(width=width, height=height, aspect_ratio="16:9"),
            frame_rate=FrameRateConfig(fps=fps),
            quality=QualityConfig(
                quality_level=quality_level,
                interpolation_samples=interpolation_samples
            ),
            interpolation_method="optical_flow"
        )
        
        # Configuration should be valid
        is_valid, issues = config.validate()
        self.assertTrue(is_valid, f"Configuration should be valid: {issues}")
        
        # Should be able to save and load configuration
        config_file = self.config_dir / "test_interpolation.json"
        self.manager.save_configuration(config, config_file)
        loaded_config = self.manager.load_configuration(config_file)
        
        # Key parameters should be preserved
        self.assertEqual(loaded_config.resolution.width, width)
        self.assertEqual(loaded_config.resolution.height, height)
        self.assertEqual(loaded_config.frame_rate.fps, fps)
        self.assertEqual(loaded_config.quality.quality_level, quality_level)
        self.assertEqual(loaded_config.quality.interpolation_samples, interpolation_samples)
        self.assertEqual(loaded_config.interpolation_method, "optical_flow")
    
    @given(
        fps=st.sampled_from([23.976, 24.0, 25.0, 29.97, 30.0, 50.0, 59.94, 60.0, 120.0]),
        width=st.sampled_from([1280, 1920, 2560, 3840, 7680]),
        height=st.sampled_from([720, 1080, 1440, 2160, 4320]),
        quality_level=st.floats(min_value=0.1, max_value=1.0)
    )
    @settings(max_examples=15, deadline=5000)
    def test_property_ve29_custom_frame_rates_and_resolutions(self, fps, width, height, quality_level):
        """
        Property VE-29.2: Custom frame rates and resolution settings
        
        Tests that the system supports custom frame rates and resolution settings
        with proper validation (VE-8.2).
        """
        config = VideoConfiguration(
            resolution=ResolutionConfig(width=width, height=height, preset=ResolutionPreset.CUSTOM),
            frame_rate=FrameRateConfig(fps=fps, preset=FrameRatePreset.CUSTOM),
            quality=QualityConfig(quality_level=quality_level)
        )
        
        # Configuration should be valid
        is_valid, issues = config.validate()
        self.assertTrue(is_valid, f"Configuration should be valid: {issues}")
        
        # Frame rate and resolution should be preserved
        self.assertEqual(config.frame_rate.fps, fps)
        self.assertEqual(config.resolution.width, width)
        self.assertEqual(config.resolution.height, height)
        
        # Should generate reasonable summary
        summary = self.manager.get_configuration_summary(config)
        self.assertIn(str(fps), summary["frame_rate"])
        self.assertIn(f"{width}x{height}", summary["resolution"])
    
    @given(
        quality_level=st.floats(min_value=0.1, max_value=1.0),
        interpolation_samples=st.integers(min_value=1, max_value=32),
        motion_estimation_accuracy=st.floats(min_value=0.1, max_value=1.0),
        gpu_acceleration=st.booleans(),
        parallel_processing=st.booleans()
    )
    @settings(max_examples=20, deadline=5000)
    def test_property_ve29_quality_vs_speed_tradeoffs(self, quality_level, interpolation_samples, 
                                                     motion_estimation_accuracy, gpu_acceleration, parallel_processing):
        """
        Property VE-29.3: Quality vs speed trade-off settings
        
        Tests that the system supports configurable quality vs speed trade-offs
        with consistent behavior (VE-8.4).
        """
        config = VideoConfiguration(
            quality=QualityConfig(
                quality_level=quality_level,
                interpolation_samples=interpolation_samples,
                motion_estimation_accuracy=motion_estimation_accuracy,
                gpu_acceleration=gpu_acceleration,
                parallel_processing=parallel_processing
            )
        )
        
        # Configuration should be valid
        is_valid, issues = config.validate()
        self.assertTrue(is_valid, f"Configuration should be valid: {issues}")
        
        # Quality settings should be preserved
        self.assertEqual(config.quality.quality_level, quality_level)
        self.assertEqual(config.quality.interpolation_samples, interpolation_samples)
        self.assertEqual(config.quality.motion_estimation_accuracy, motion_estimation_accuracy)
        self.assertEqual(config.quality.gpu_acceleration, gpu_acceleration)
        self.assertEqual(config.quality.parallel_processing, parallel_processing)
        
        # Higher quality should generally mean more samples (when not at extremes)
        if quality_level > 0.8:
            self.assertGreaterEqual(interpolation_samples, 8, "High quality should use more samples")
        
        # GPU acceleration should be reflected in summary
        summary = self.manager.get_configuration_summary(config)
        self.assertEqual(summary["gpu_acceleration"], gpu_acceleration)
    
    @given(
        enable_override=st.booleans(),
        override_pan=st.booleans(),
        override_zoom=st.booleans(),
        position_keyframes=st.lists(
            st.tuples(
                st.floats(min_value=0.0, max_value=1.0),
                st.floats(min_value=-10.0, max_value=10.0),
                st.floats(min_value=-10.0, max_value=10.0)
            ),
            min_size=0, max_size=5
        )
    )
    @settings(max_examples=15, deadline=5000)
    def test_property_ve29_manual_camera_movement_override(self, enable_override, override_pan, 
                                                          override_zoom, position_keyframes):
        """
        Property VE-29.4: Manual camera movement override
        
        Tests that the system supports manual camera movement override
        with flexible keyframe configuration (VE-8.5).
        """
        config = VideoConfiguration(
            camera_override=CameraOverrideConfig(
                enable_override=enable_override,
                override_pan=override_pan,
                override_zoom=override_zoom,
                position_keyframes=position_keyframes
            )
        )
        
        # Configuration should be valid
        is_valid, issues = config.validate()
        self.assertTrue(is_valid, f"Configuration should be valid: {issues}")
        
        # Override settings should be preserved
        self.assertEqual(config.camera_override.enable_override, enable_override)
        self.assertEqual(config.camera_override.override_pan, override_pan)
        self.assertEqual(config.camera_override.override_zoom, override_zoom)
        self.assertEqual(len(config.camera_override.position_keyframes), len(position_keyframes))
        
        # Summary should reflect override status
        summary = self.manager.get_configuration_summary(config)
        self.assertEqual(summary["camera_override"], enable_override)
    
    @given(
        curve_type=st.sampled_from(list(MotionCurveType)),
        ease_strength=st.floats(min_value=0.1, max_value=5.0),
        bounce_amplitude=st.floats(min_value=0.0, max_value=1.0),
        hold_start_frames=st.integers(min_value=0, max_value=10),
        hold_end_frames=st.integers(min_value=0, max_value=10)
    )
    @settings(max_examples=20, deadline=5000)
    def test_property_ve29_custom_motion_curves_and_timing(self, curve_type, ease_strength, 
                                                          bounce_amplitude, hold_start_frames, hold_end_frames):
        """
        Property VE-29.5: Custom motion curves and timing
        
        Tests that the system supports custom motion curves and timing
        with various curve types and parameters (VE-8.6).
        """
        config = VideoConfiguration(
            motion_curves=MotionCurveConfig(
                curve_type=curve_type,
                ease_strength=ease_strength,
                bounce_amplitude=bounce_amplitude,
                hold_start_frames=hold_start_frames,
                hold_end_frames=hold_end_frames
            )
        )
        
        # Configuration should be valid
        is_valid, issues = config.validate()
        self.assertTrue(is_valid, f"Configuration should be valid: {issues}")
        
        # Motion curve settings should be preserved
        self.assertEqual(config.motion_curves.curve_type, curve_type)
        self.assertEqual(config.motion_curves.ease_strength, ease_strength)
        self.assertEqual(config.motion_curves.bounce_amplitude, bounce_amplitude)
        self.assertEqual(config.motion_curves.hold_start_frames, hold_start_frames)
        self.assertEqual(config.motion_curves.hold_end_frames, hold_end_frames)
        
        # Summary should show curve type
        summary = self.manager.get_configuration_summary(config)
        self.assertEqual(summary["motion_curve"], curve_type.value)


class TestPresetConsistencyProperties(unittest.TestCase):
    """Property VE-30: Preset Consistency Tests."""
    
    def setUp(self):
        """Set up test environment."""
        self.temp_dir = tempfile.mkdtemp()
        self.config_dir = Path(self.temp_dir) / "config"
        self.manager = VideoConfigurationManager(self.config_dir)
    
    def tearDown(self):
        """Clean up test environment."""
        import shutil
        shutil.rmtree(self.temp_dir)
    
    @given(
        preset_name=st.sampled_from(["documentary", "cinematic", "action", "portrait", 
                                   "broadcast", "web_video", "social_media", "animation"])
    )
    @settings(max_examples=10, deadline=5000)
    def test_property_ve30_cinematic_presets_consistency(self, preset_name):
        """
        Property VE-30.1: Cinematic presets for common shot types
        
        Tests that cinematic presets provide consistent, valid configurations
        for common shot types (VE-8.8).
        """
        # Load preset
        config = self.manager.load_preset(preset_name)
        
        # Preset should be valid
        is_valid, issues = config.validate()
        self.assertTrue(is_valid, f"Preset '{preset_name}' should be valid: {issues}")
        
        # Preset should have correct name
        self.assertEqual(config.cinematic_preset, preset_name)
        
        # Preset should have reasonable quality level
        self.assertGreaterEqual(config.quality.quality_level, 0.5, 
                               f"Preset '{preset_name}' should have reasonable quality")
        self.assertLessEqual(config.quality.quality_level, 1.0)
        
        # Preset should have valid frame rate
        self.assertGreater(config.frame_rate.fps, 0)
        self.assertLessEqual(config.frame_rate.fps, 120)
        
        # Preset should have valid resolution
        self.assertGreater(config.resolution.width, 0)
        self.assertGreater(config.resolution.height, 0)
        self.assertEqual(config.resolution.width % 2, 0, "Width should be even")
        self.assertEqual(config.resolution.height % 2, 0, "Height should be even")
        
        # Preset-specific validations
        if preset_name == "cinematic":
            # Cinematic should use high quality
            self.assertGreaterEqual(config.quality.quality_level, 0.9)
            # Should use 4K or higher resolution
            self.assertGreaterEqual(config.resolution.width, 1920)
        
        elif preset_name == "web_video":
            # Web video should prioritize speed over quality
            self.assertLessEqual(config.quality.quality_level, 0.7)
            # Should use lower resolution for web
            self.assertLessEqual(config.resolution.width, 1920)
        
        elif preset_name == "broadcast":
            # Broadcast should use maximum quality
            self.assertEqual(config.quality.quality_level, 1.0)
            # Should use professional frame rates
            self.assertIn(config.frame_rate.fps, [25.0, 29.97, 30.0, 50.0, 59.94, 60.0])
        
        elif preset_name == "action":
            # Action should use high frame rate
            self.assertGreaterEqual(config.frame_rate.fps, 50.0)
    
    @given(
        preset_name=st.sampled_from(["documentary", "cinematic", "action", "portrait"])
    )
    @settings(max_examples=7, deadline=5000)
    def test_property_ve30_preset_serialization_consistency(self, preset_name):
        """
        Property VE-30.2: Preset serialization consistency
        
        Tests that presets maintain consistency through save/load cycles
        in different formats.
        """
        # Load original preset
        original_config = self.manager.load_preset(preset_name)
        
        # Test JSON serialization
        json_file = self.config_dir / f"{preset_name}_test.json"
        self.manager.save_configuration(original_config, json_file, ConfigurationFormat.JSON)
        json_loaded = self.manager.load_configuration(json_file)
        
        # Test YAML serialization
        yaml_file = self.config_dir / f"{preset_name}_test.yaml"
        self.manager.save_configuration(original_config, yaml_file, ConfigurationFormat.YAML)
        yaml_loaded = self.manager.load_configuration(yaml_file)
        
        # All versions should be valid
        for config, name in [(original_config, "original"), (json_loaded, "JSON"), (yaml_loaded, "YAML")]:
            is_valid, issues = config.validate()
            self.assertTrue(is_valid, f"{name} version of '{preset_name}' should be valid: {issues}")
        
        # Key properties should be consistent across formats
        configs = [original_config, json_loaded, yaml_loaded]
        for attr in ["interpolation_method", "motion_blur_intensity", "cinematic_preset"]:
            values = [getattr(config, attr) for config in configs]
            self.assertEqual(len(set(values)), 1, f"Attribute '{attr}' should be consistent across formats")
        
        # Frame rates should be consistent
        fps_values = [config.frame_rate.fps for config in configs]
        self.assertEqual(len(set(fps_values)), 1, "Frame rates should be consistent")
        
        # Resolutions should be consistent
        resolutions = [(config.resolution.width, config.resolution.height) for config in configs]
        self.assertEqual(len(set(resolutions)), 1, "Resolutions should be consistent")
    
    @given(
        base_preset=st.sampled_from(["documentary", "cinematic", "action", "portrait"]),
        memory_gb=st.floats(min_value=1.0, max_value=32.0),
        cpu_cores=st.integers(min_value=1, max_value=16),
        gpu_available=st.booleans()
    )
    @settings(max_examples=12, deadline=5000)
    def test_property_ve30_hardware_optimization_consistency(self, base_preset, memory_gb, cpu_cores, gpu_available):
        """
        Property VE-30.3: Hardware optimization consistency
        
        Tests that hardware optimization maintains preset characteristics
        while adapting to hardware constraints.
        """
        # Load base preset
        base_config = self.manager.load_preset(base_preset)
        
        # Apply hardware optimization
        optimized_config = self.manager.optimize_for_hardware(
            base_config,
            gpu_available=gpu_available,
            memory_gb=memory_gb,
            cpu_cores=cpu_cores
        )
        
        # Optimized config should be valid
        is_valid, issues = optimized_config.validate()
        self.assertTrue(is_valid, f"Optimized config should be valid: {issues}")
        
        # GPU setting should match availability
        self.assertEqual(optimized_config.quality.gpu_acceleration, gpu_available)
        
        # Memory limit should not exceed available memory
        self.assertLessEqual(optimized_config.quality.memory_limit_gb, memory_gb)
        
        # Parallel processing should be disabled for single-core systems
        if cpu_cores < 2:
            self.assertFalse(optimized_config.quality.parallel_processing)
        
        # Core preset characteristics should be preserved where possible
        self.assertEqual(optimized_config.cinematic_preset, base_preset)
        
        # Quality should not increase (only decrease for optimization)
        self.assertLessEqual(optimized_config.quality.quality_level, base_config.quality.quality_level)
        
        # For very low memory, effects should be disabled
        if memory_gb < 2.0:
            self.assertFalse(optimized_config.motion_blur_enabled)
            self.assertFalse(optimized_config.depth_of_field_enabled)
    
    @given(
        preset_name=st.sampled_from(["documentary", "cinematic", "action", "portrait"]),
        custom_overrides=st.dictionaries(
            keys=st.sampled_from(["motion_blur_intensity", "interpolation_method"]),
            values=st.one_of(
                st.floats(min_value=0.0, max_value=1.0),
                st.sampled_from(["linear", "optical_flow", "depth_aware", "ai_based"])
            ),
            min_size=1, max_size=2
        )
    )
    @settings(max_examples=10, deadline=5000)
    def test_property_ve30_custom_configuration_consistency(self, preset_name, custom_overrides):
        """
        Property VE-30.4: Custom configuration consistency
        
        Tests that custom configurations based on presets maintain
        consistency and validity.
        """
        # Create custom configuration
        custom_config = self.manager.create_custom_configuration(preset_name, **custom_overrides)
        
        # Custom config should be valid
        is_valid, issues = custom_config.validate()
        self.assertTrue(is_valid, f"Custom config should be valid: {issues}")
        
        # Should be marked as custom
        self.assertEqual(custom_config.cinematic_preset, "custom")
        
        # Overrides should be applied
        for key, value in custom_overrides.items():
            if hasattr(custom_config, key):
                actual_value = getattr(custom_config, key)
                self.assertEqual(actual_value, value, f"Override '{key}' should be applied")
        
        # Should be able to save and load custom config
        custom_file = self.config_dir / "custom_test.json"
        self.manager.save_configuration(custom_config, custom_file)
        loaded_custom = self.manager.load_configuration(custom_file)
        
        # Loaded config should maintain overrides
        for key, value in custom_overrides.items():
            if hasattr(loaded_custom, key):
                actual_value = getattr(loaded_custom, key)
                self.assertEqual(actual_value, value, f"Loaded override '{key}' should be preserved")


class ConfigurationStateMachine(RuleBasedStateMachine):
    """Stateful property testing for configuration system."""
    
    def __init__(self):
        super().__init__()
        self.temp_dir = tempfile.mkdtemp()
        self.config_dir = Path(self.temp_dir) / "config"
        self.manager = VideoConfigurationManager(self.config_dir)
        self.saved_configs = {}
    
    def teardown(self):
        """Clean up test environment."""
        import shutil
        if hasattr(self, 'temp_dir'):
            shutil.rmtree(self.temp_dir)
    
    @rule(
        preset_name=st.sampled_from(["documentary", "cinematic", "action", "portrait"]),
        config_name=st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd')))
    )
    def load_and_save_preset(self, preset_name, config_name):
        """Load a preset and save it with a custom name."""
        config = self.manager.load_preset(preset_name)
        
        # Config should be valid
        is_valid, issues = config.validate()
        assume(is_valid)  # Skip if invalid
        
        # Save with custom name
        config_file = self.config_dir / f"{config_name}.json"
        self.manager.save_configuration(config, config_file)
        
        # Track saved config
        self.saved_configs[config_name] = {
            'file': config_file,
            'original_preset': preset_name,
            'config': config
        }
    
    @rule(
        config_name=st.sampled_from([]),  # Will be populated by saved_configs keys
        memory_gb=st.floats(min_value=1.0, max_value=16.0),
        gpu_available=st.booleans()
    )
    def optimize_saved_config(self, config_name, memory_gb, gpu_available):
        """Optimize a previously saved configuration."""
        assume(config_name in self.saved_configs)
        
        original_config = self.saved_configs[config_name]['config']
        optimized = self.manager.optimize_for_hardware(
            original_config,
            gpu_available=gpu_available,
            memory_gb=memory_gb,
            cpu_cores=4
        )
        
        # Optimized should be valid
        is_valid, issues = optimized.validate()
        assert is_valid, f"Optimized config should be valid: {issues}"
        
        # GPU setting should match
        assert optimized.quality.gpu_acceleration == gpu_available
    
    @invariant()
    def all_saved_configs_loadable(self):
        """All saved configurations should be loadable and valid."""
        for config_name, config_info in self.saved_configs.items():
            if config_info['file'].exists():
                loaded = self.manager.load_configuration(config_info['file'])
                is_valid, issues = loaded.validate()
                assert is_valid, f"Saved config '{config_name}' should remain valid: {issues}"


class TestConfigurationStateMachine(unittest.TestCase):
    """Test configuration system with stateful property testing."""
    
    @settings(max_examples=5, stateful_step_count=20, deadline=10000)
    def test_configuration_state_machine(self):
        """Test configuration system with stateful operations."""
        # Note: This is a simplified version due to Hypothesis limitations
        # In a full implementation, we would use the ConfigurationStateMachine
        temp_dir = tempfile.mkdtemp()
        try:
            config_dir = Path(temp_dir) / "config"
            manager = VideoConfigurationManager(config_dir)
            
            # Test sequence of operations
            presets = ["documentary", "cinematic", "action"]
            saved_configs = {}
            
            for i, preset_name in enumerate(presets):
                # Load preset
                config = manager.load_preset(preset_name)
                is_valid, issues = config.validate()
                self.assertTrue(is_valid, f"Preset {preset_name} should be valid")
                
                # Save with custom name
                config_name = f"test_config_{i}"
                config_file = config_dir / f"{config_name}.json"
                manager.save_configuration(config, config_file)
                saved_configs[config_name] = config_file
                
                # Verify it can be loaded back
                loaded = manager.load_configuration(config_file)
                is_valid, issues = loaded.validate()
                self.assertTrue(is_valid, f"Loaded config {config_name} should be valid")
            
            # Test optimization on saved configs
            for config_name, config_file in saved_configs.items():
                original = manager.load_configuration(config_file)
                optimized = manager.optimize_for_hardware(
                    original, gpu_available=False, memory_gb=2.0, cpu_cores=2
                )
                is_valid, issues = optimized.validate()
                self.assertTrue(is_valid, f"Optimized {config_name} should be valid")
        
        finally:
            import shutil
            shutil.rmtree(temp_dir)


if __name__ == "__main__":
    unittest.main()