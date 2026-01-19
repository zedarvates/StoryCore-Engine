#!/usr/bin/env python3
"""
Tests for Advanced Interpolation Engine

Tests all advanced interpolation features including:
- AI-based frame interpolation
- Motion blur simulation
- Depth-of-field effects
- Lens simulation
"""

import pytest
import numpy as np
import tempfile
import json
from pathlib import Path
from unittest.mock import patch, MagicMock

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


class TestAdvancedInterpolationEngine:
    """Test suite for Advanced Interpolation Engine."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.config = AdvancedInterpolationConfig()
        self.engine = AdvancedInterpolationEngine(self.config)
        
        # Create mock keyframes
        self.keyframes = [
            np.random.randint(0, 256, (480, 640, 3), dtype=np.uint8),
            np.random.randint(0, 256, (480, 640, 3), dtype=np.uint8),
            np.random.randint(0, 256, (480, 640, 3), dtype=np.uint8)
        ]
    
    def test_engine_initialization(self):
        """Test engine initialization."""
        assert self.engine.config == self.config
        assert hasattr(self.engine, 'motion_blur_kernels')
        assert hasattr(self.engine, 'dof_parameters')
        assert hasattr(self.engine, 'lens_parameters')
        assert not self.engine.ai_available  # No AI model path provided
    
    def test_basic_interpolation_methods(self):
        """Test all basic interpolation methods."""
        target_count = 10
        
        # Test linear interpolation
        config = AdvancedInterpolationConfig(method=InterpolationMethod.LINEAR)
        engine = AdvancedInterpolationEngine(config)
        frames = engine._perform_basic_interpolation(self.keyframes, target_count)
        assert len(frames) == target_count
        assert all(frame.shape == self.keyframes[0].shape for frame in frames)
        
        # Test optical flow interpolation
        config = AdvancedInterpolationConfig(method=InterpolationMethod.OPTICAL_FLOW)
        engine = AdvancedInterpolationEngine(config)
        frames = engine._perform_basic_interpolation(self.keyframes, target_count)
        assert len(frames) == target_count
        
        # Test depth-aware interpolation
        config = AdvancedInterpolationConfig(method=InterpolationMethod.DEPTH_AWARE)
        engine = AdvancedInterpolationEngine(config)
        frames = engine._perform_basic_interpolation(self.keyframes, target_count)
        assert len(frames) == target_count
        
        # Test motion-compensated interpolation
        config = AdvancedInterpolationConfig(method=InterpolationMethod.MOTION_COMPENSATED)
        engine = AdvancedInterpolationEngine(config)
        frames = engine._perform_basic_interpolation(self.keyframes, target_count)
        assert len(frames) == target_count
    
    def test_ai_interpolation_with_model(self):
        """Test AI interpolation when model is available."""
        with tempfile.NamedTemporaryFile(suffix='.model', delete=False) as tmp_file:
            model_path = tmp_file.name
        
        try:
            config = AdvancedInterpolationConfig(
                method=InterpolationMethod.AI_BASED,
                ai_model_path=model_path
            )
            
            with patch.object(Path, 'exists', return_value=True):
                engine = AdvancedInterpolationEngine(config)
                assert engine.ai_available
                
                frames = engine._perform_basic_interpolation(self.keyframes, 10)
                assert len(frames) == 10
        finally:
            Path(model_path).unlink(missing_ok=True)
    
    def test_motion_blur_application(self):
        """Test motion blur application."""
        # Test different blur types
        blur_types = [MotionBlurType.LINEAR, MotionBlurType.RADIAL, MotionBlurType.ZOOM]
        
        for blur_type in blur_types:
            config = AdvancedInterpolationConfig(
                motion_blur=MotionBlurConfig(
                    blur_type=blur_type,
                    intensity=0.5
                )
            )
            engine = AdvancedInterpolationEngine(config)
            
            frames = [self.keyframes[0].copy() for _ in range(5)]
            camera_movement = {"type": "pan", "direction": "right", "amount": 0.1}
            
            blurred_frames = engine._apply_motion_blur(frames, camera_movement)
            assert len(blurred_frames) == len(frames)
            assert all(frame.shape == frames[0].shape for frame in blurred_frames)
    
    def test_depth_of_field_effects(self):
        """Test depth of field effects."""
        dof_modes = [
            DepthOfFieldMode.SHALLOW,
            DepthOfFieldMode.DEEP,
            DepthOfFieldMode.FOCUS_PULL,
            DepthOfFieldMode.RACK_FOCUS
        ]
        
        for mode in dof_modes:
            config = AdvancedInterpolationConfig(
                depth_of_field=DepthOfFieldConfig(
                    mode=mode,
                    focal_distance=5.0,
                    aperture=2.8
                )
            )
            engine = AdvancedInterpolationEngine(config)
            
            frames = [self.keyframes[0].copy() for _ in range(5)]
            camera_movement = {"type": "dolly", "distance": 2.0}
            
            dof_frames = engine._apply_depth_of_field(frames, camera_movement)
            assert len(dof_frames) == len(frames)
            assert all(frame.shape == frames[0].shape for frame in dof_frames)
    
    def test_lens_simulation_effects(self):
        """Test lens simulation effects."""
        lens_types = [
            LensType.STANDARD,
            LensType.WIDE_ANGLE,
            LensType.TELEPHOTO,
            LensType.FISHEYE,
            LensType.ANAMORPHIC
        ]
        
        for lens_type in lens_types:
            config = AdvancedInterpolationConfig(
                lens_simulation=LensSimulationConfig(
                    lens_type=lens_type,
                    focal_length=50.0,
                    vignetting=0.2,
                    distortion=0.1,
                    chromatic_aberration=0.05
                )
            )
            engine = AdvancedInterpolationEngine(config)
            
            frames = [self.keyframes[0].copy() for _ in range(3)]
            lens_frames = engine._apply_lens_simulation(frames)
            
            assert len(lens_frames) == len(frames)
            assert all(frame.shape == frames[0].shape for frame in lens_frames)
    
    def test_camera_movement_application(self):
        """Test camera movement application."""
        movements = [
            {"type": "pan", "direction": "right", "amount": 0.1},
            {"type": "zoom", "factor": 1.5},
            {"type": "dolly", "distance": 2.0},
            {
                "type": "compound",
                "movements": [
                    {"type": "pan", "direction": "right", "amount": 0.05},
                    {"type": "zoom", "factor": 1.2}
                ]
            }
        ]
        
        for movement in movements:
            frames = [self.keyframes[0].copy() for _ in range(5)]
            moved_frames = self.engine._apply_camera_movement(frames, movement)
            
            assert len(moved_frames) == len(frames)
            # Note: Some movements may change frame dimensions (like zoom)
    
    def test_complete_interpolation_pipeline(self):
        """Test complete interpolation pipeline."""
        config = AdvancedInterpolationConfig(
            method=InterpolationMethod.OPTICAL_FLOW,
            motion_blur=MotionBlurConfig(
                blur_type=MotionBlurType.LINEAR,
                intensity=0.3
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
        
        engine = AdvancedInterpolationEngine(config)
        
        camera_movement = {
            "type": "pan",
            "direction": "right",
            "amount": 0.1
        }
        
        result_frames = engine.interpolate_frames(
            self.keyframes,
            target_frame_count=24,
            camera_movement=camera_movement
        )
        
        assert len(result_frames) == 24
        assert all(isinstance(frame, np.ndarray) for frame in result_frames)
        
        # Check performance metrics
        metrics = engine.get_performance_metrics()
        assert "interpolation_time" in metrics
        assert "frames_per_second" in metrics
        assert "method_used" in metrics
        assert "effects_applied" in metrics
    
    def test_configuration_validation(self):
        """Test configuration validation."""
        # Valid configuration
        valid_config = AdvancedInterpolationConfig()
        engine = AdvancedInterpolationEngine(valid_config)
        is_valid, issues = engine.validate_configuration()
        assert is_valid
        assert len(issues) == 0
        
        # Invalid motion blur intensity
        invalid_config = AdvancedInterpolationConfig(
            motion_blur=MotionBlurConfig(intensity=1.5)  # > 1.0
        )
        engine = AdvancedInterpolationEngine(invalid_config)
        is_valid, issues = engine.validate_configuration()
        assert not is_valid
        assert any("intensity" in issue for issue in issues)
        
        # Invalid focal distance
        invalid_config = AdvancedInterpolationConfig(
            depth_of_field=DepthOfFieldConfig(focal_distance=-1.0)  # negative
        )
        engine = AdvancedInterpolationEngine(invalid_config)
        is_valid, issues = engine.validate_configuration()
        assert not is_valid
        assert any("focal distance" in issue.lower() for issue in issues)
        
        # Invalid distortion
        invalid_config = AdvancedInterpolationConfig(
            lens_simulation=LensSimulationConfig(distortion=2.0)  # > 1.0
        )
        engine = AdvancedInterpolationEngine(invalid_config)
        is_valid, issues = engine.validate_configuration()
        assert not is_valid
        assert any("distortion" in issue.lower() for issue in issues)
    
    def test_cinematic_presets(self):
        """Test cinematic preset configurations."""
        presets = ["documentary", "cinematic", "action", "portrait", "unknown"]
        
        for preset in presets:
            config = create_cinematic_preset(preset)
            assert isinstance(config, AdvancedInterpolationConfig)
            
            engine = AdvancedInterpolationEngine(config)
            is_valid, issues = engine.validate_configuration()
            assert is_valid, f"Preset {preset} should be valid, issues: {issues}"
    
    def test_depth_map_estimation(self):
        """Test depth map estimation."""
        frame = self.keyframes[0]
        depth_map = self.engine._estimate_depth_map(frame)
        
        assert depth_map.shape == frame.shape[:2]
        assert depth_map.dtype == np.float64
        assert np.all(depth_map >= 0)
        assert np.all(depth_map <= 1)
    
    def test_motion_vector_estimation(self):
        """Test motion vector estimation."""
        frame1, frame2 = self.keyframes[0], self.keyframes[1]
        motion_vectors = self.engine._estimate_motion_vectors(frame1, frame2)
        
        assert motion_vectors.shape == (*frame1.shape[:2], 2)
        assert motion_vectors.dtype == np.float64
    
    def test_blur_kernel_generation(self):
        """Test motion blur kernel generation."""
        for blur_type in MotionBlurType:
            if blur_type != MotionBlurType.NONE:
                kernel = self.engine._generate_blur_kernel(blur_type)
                assert isinstance(kernel, np.ndarray)
                assert kernel.ndim == 2
                assert np.isclose(np.sum(kernel), 1.0, atol=1e-6)
    
    def test_vignetting_effect(self):
        """Test vignetting effect application."""
        frame = self.keyframes[0].copy()
        vignetted = self.engine._apply_vignetting(frame, 0.5)
        
        assert vignetted.shape == frame.shape
        assert vignetted.dtype == frame.dtype
        
        # Center should be brighter than corners
        h, w = frame.shape[:2]
        center_brightness = np.mean(vignetted[h//2-10:h//2+10, w//2-10:w//2+10])
        corner_brightness = np.mean(vignetted[:20, :20])
        assert center_brightness >= corner_brightness
    
    def test_chromatic_aberration_effect(self):
        """Test chromatic aberration effect."""
        frame = self.keyframes[0].copy()
        aberrated = self.engine._apply_chromatic_aberration(frame, 0.1)
        
        assert aberrated.shape == frame.shape
        assert aberrated.dtype == frame.dtype
        
        # Should be different from original (unless intensity is 0)
        if frame.shape[2] == 3:  # Color image
            assert not np.array_equal(aberrated, frame)
    
    def test_focus_parameter_calculation(self):
        """Test focus parameter calculation for different modes."""
        total_frames = 24
        
        for mode in DepthOfFieldMode:
            if mode != DepthOfFieldMode.DISABLED:
                config = AdvancedInterpolationConfig(
                    depth_of_field=DepthOfFieldConfig(mode=mode)
                )
                engine = AdvancedInterpolationEngine(config)
                
                for frame_idx in [0, 12, 23]:
                    params = engine._calculate_focus_parameters(
                        frame_idx, total_frames, None
                    )
                    
                    assert "focal_distance" in params
                    assert "aperture" in params
                    assert "blur_radius" in params
                    assert params["focal_distance"] > 0
                    assert params["aperture"] > 0
                    assert params["blur_radius"] >= 1
    
    def test_motion_intensity_calculation(self):
        """Test motion intensity calculation."""
        total_frames = 24
        
        movements = [
            {"type": "static"},
            {"type": "pan", "direction": "right"},
            {"type": "zoom", "factor": 1.5},
            {"type": "dolly", "distance": 2.0}
        ]
        
        for movement in movements:
            for frame_idx in [0, 12, 23]:
                intensity = self.engine._calculate_motion_intensity(
                    frame_idx, total_frames, movement
                )
                
                assert 0 <= intensity <= 1
                assert isinstance(intensity, float)
    
    def test_performance_metrics_tracking(self):
        """Test performance metrics tracking."""
        # Perform interpolation to generate metrics
        result_frames = self.engine.interpolate_frames(self.keyframes, 10)
        
        metrics = self.engine.get_performance_metrics()
        
        assert "interpolation_time" in metrics
        assert "frames_per_second" in metrics
        assert "method_used" in metrics
        assert "effects_applied" in metrics
        
        assert metrics["interpolation_time"] > 0
        assert metrics["frames_per_second"] > 0
        assert metrics["method_used"] == self.config.method.value
        assert isinstance(metrics["effects_applied"], list)
    
    def test_quality_metrics_tracking(self):
        """Test quality metrics tracking."""
        quality_metrics = self.engine.get_quality_metrics()
        assert isinstance(quality_metrics, dict)
    
    def test_edge_cases(self):
        """Test edge cases and error conditions."""
        # Single keyframe
        single_frame = [self.keyframes[0]]
        result = self.engine.interpolate_frames(single_frame, 5)
        assert len(result) == 5
        
        # Zero target frames (should handle gracefully)
        try:
            result = self.engine.interpolate_frames(self.keyframes, 0)
            assert len(result) == 0
        except (ValueError, ZeroDivisionError):
            pass  # Acceptable to raise error for invalid input
        
        # Empty keyframes list
        try:
            result = self.engine.interpolate_frames([], 5)
        except (ValueError, IndexError):
            pass  # Should raise error for empty input
    
    def test_memory_efficiency(self):
        """Test memory efficiency with larger frame sequences."""
        # Create larger keyframes
        large_keyframes = [
            np.random.randint(0, 256, (1080, 1920, 3), dtype=np.uint8)
            for _ in range(3)
        ]
        
        # Test with memory limit
        config = AdvancedInterpolationConfig(memory_limit_gb=1.0)
        engine = AdvancedInterpolationEngine(config)
        
        result = engine.interpolate_frames(large_keyframes, 10)
        assert len(result) == 10
        
        # Should complete without memory errors
        metrics = engine.get_performance_metrics()
        assert metrics["interpolation_time"] > 0


class TestAdvancedInterpolationIntegration:
    """Integration tests for advanced interpolation engine."""
    
    def test_integration_with_video_engine(self):
        """Test integration with main video engine."""
        # This would test integration with the main VideoEngine class
        # For now, we'll test the interface compatibility
        
        config = AdvancedInterpolationConfig()
        engine = AdvancedInterpolationEngine(config)
        
        # Test that engine provides expected interface
        assert hasattr(engine, 'interpolate_frames')
        assert hasattr(engine, 'get_performance_metrics')
        assert hasattr(engine, 'get_quality_metrics')
        assert hasattr(engine, 'validate_configuration')
    
    def test_preset_performance_comparison(self):
        """Test performance comparison between presets."""
        presets = ["documentary", "cinematic", "action", "portrait"]
        keyframes = [
            np.random.randint(0, 256, (480, 640, 3), dtype=np.uint8)
            for _ in range(2)
        ]
        
        performance_results = {}
        
        for preset in presets:
            config = create_cinematic_preset(preset)
            engine = AdvancedInterpolationEngine(config)
            
            result = engine.interpolate_frames(keyframes, 12)
            metrics = engine.get_performance_metrics()
            
            performance_results[preset] = {
                "time": metrics["interpolation_time"],
                "fps": metrics["frames_per_second"],
                "effects": len(metrics["effects_applied"])
            }
        
        # All presets should complete successfully
        assert len(performance_results) == len(presets)
        
        # Performance should be reasonable (> 1 FPS)
        for preset, metrics in performance_results.items():
            assert metrics["fps"] > 1, f"Preset {preset} too slow: {metrics['fps']} FPS"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])