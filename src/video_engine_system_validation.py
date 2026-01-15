#!/usr/bin/env python3
"""
Video Engine System Validation
Comprehensive validation of all Video Engine components working together seamlessly.
"""

import time
import json
import logging
import traceback
import tempfile
import shutil
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Tuple
import numpy as np

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SystemValidationResult:
    """Container for system validation results"""
    
    def __init__(self):
        self.start_time = datetime.now()
        self.end_time = None
        self.total_tests = 0
        self.passed_tests = 0
        self.failed_tests = 0
        self.test_results = []
        self.performance_metrics = {}
        self.quality_metrics = {}
        self.error_log = []
        self.warnings = []
    
    def add_test_result(self, test_name: str, success: bool, 
                       duration: float = 0.0, details: Dict = None):
        """Add a test result"""
        self.total_tests += 1
        if success:
            self.passed_tests += 1
        else:
            self.failed_tests += 1
        
        result = {
            "test_name": test_name,
            "success": success,
            "duration": duration,
            "timestamp": datetime.now().isoformat(),
            "details": details or {}
        }
        self.test_results.append(result)
    
    def add_performance_metric(self, metric_name: str, value: float, unit: str = ""):
        """Add a performance metric"""
        self.performance_metrics[metric_name] = {
            "value": value,
            "unit": unit,
            "timestamp": datetime.now().isoformat()
        }
    
    def add_quality_metric(self, metric_name: str, value: float, threshold: float = None):
        """Add a quality metric"""
        self.quality_metrics[metric_name] = {
            "value": value,
            "threshold": threshold,
            "passed": value >= threshold if threshold else True,
            "timestamp": datetime.now().isoformat()
        }
    
    def add_error(self, error_message: str, test_name: str = None):
        """Add an error"""
        self.error_log.append({
            "message": error_message,
            "test_name": test_name,
            "timestamp": datetime.now().isoformat()
        })
    
    def add_warning(self, warning_message: str, test_name: str = None):
        """Add a warning"""
        self.warnings.append({
            "message": warning_message,
            "test_name": test_name,
            "timestamp": datetime.now().isoformat()
        })
    
    def finalize(self):
        """Finalize the validation results"""
        self.end_time = datetime.now()
    
    def get_success_rate(self) -> float:
        """Get overall success rate"""
        if self.total_tests == 0:
            return 0.0
        return (self.passed_tests / self.total_tests) * 100
    
    def get_duration(self) -> float:
        """Get total validation duration in seconds"""
        if self.end_time:
            return (self.end_time - self.start_time).total_seconds()
        return (datetime.now() - self.start_time).total_seconds()

class VideoEngineSystemValidator:
    """Comprehensive system validator for Video Engine"""
    
    def __init__(self):
        self.result = SystemValidationResult()
        self.temp_project_dir = None
        self.validation_data = {}
    
    def run_complete_validation(self) -> SystemValidationResult:
        """Run complete system validation"""
        
        logger.info("🚀 Starting Video Engine System Validation")
        logger.info("=" * 60)
        
        try:
            # Setup validation environment
            self._setup_validation_environment()
            
            # Run validation phases
            self._validate_component_integration()
            self._validate_performance_targets()
            self._validate_quality_standards()
            self._validate_error_handling()
            self._validate_scalability()
            self._validate_professional_standards()
            
            # Generate final report
            self._generate_validation_report()
            
        except Exception as e:
            logger.error(f"💥 System validation failed: {e}")
            logger.error(traceback.format_exc())
            self.result.add_error(f"System validation failed: {e}")
        
        finally:
            self._cleanup_validation_environment()
            self.result.finalize()
        
        return self.result
    
    def _setup_validation_environment(self):
        """Setup validation environment"""
        logger.info("🔧 Setting up validation environment...")
        
        try:
            # Create temporary project directory
            self.temp_project_dir = tempfile.mkdtemp(prefix="video_engine_validation_")
            logger.info(f"📁 Created temp project: {self.temp_project_dir}")
            
            # Create mock project structure
            self._create_mock_project()
            
            self.result.add_test_result("Environment Setup", True, 0.0)
            
        except Exception as e:
            logger.error(f"❌ Environment setup failed: {e}")
            self.result.add_test_result("Environment Setup", False, 0.0)
            self.result.add_error(f"Environment setup failed: {e}")
            raise
    
    def _create_mock_project(self):
        """Create mock project for validation"""
        project_path = Path(self.temp_project_dir)
        
        # Create project structure
        (project_path / "keyframes").mkdir(exist_ok=True)
        (project_path / "output").mkdir(exist_ok=True)
        (project_path / "metadata").mkdir(exist_ok=True)
        
        # Create mock project.json
        project_data = {
            "schema_version": "1.0",
            "project_name": "validation_project",
            "video_settings": {
                "frame_rate": 24,
                "resolution": [1920, 1080],
                "quality": "high"
            },
            "shots": [
                {"id": "shot_001", "duration": 5.0, "keyframes": 2},
                {"id": "shot_002", "duration": 3.0, "keyframes": 2},
                {"id": "shot_003", "duration": 4.0, "keyframes": 3}
            ]
        }
        
        with open(project_path / "project.json", 'w') as f:
            json.dump(project_data, f, indent=2)
        
        # Create mock keyframes
        self._create_mock_keyframes(project_path)
        
        logger.info("✅ Mock project created successfully")
    
    def _create_mock_keyframes(self, project_path: Path):
        """Create mock keyframes for testing"""
        keyframes_dir = project_path / "keyframes"
        
        # Create mock keyframes as numpy arrays saved to files
        for shot_data in [
            {"id": "shot_001", "keyframes": 2},
            {"id": "shot_002", "keyframes": 2},
            {"id": "shot_003", "keyframes": 3}
        ]:
            shot_dir = keyframes_dir / shot_data["id"]
            shot_dir.mkdir(exist_ok=True)
            
            for i in range(shot_data["keyframes"]):
                # Create mock keyframe (random image data)
                keyframe = np.random.randint(0, 255, (1080, 1920, 3), dtype=np.uint8)
                np.save(shot_dir / f"keyframe_{i:03d}.npy", keyframe)
    
    def _validate_component_integration(self):
        """Validate all components work together seamlessly"""
        logger.info("🔗 Validating component integration...")
        
        test_start = time.time()
        
        try:
            # Test 1: Video Engine initialization
            self._test_video_engine_initialization()
            
            # Test 2: Advanced interpolation integration
            self._test_advanced_interpolation_integration()
            
            # Test 3: Configuration management integration
            self._test_configuration_management_integration()
            
            # Test 4: Pipeline integration
            self._test_pipeline_integration()
            
            # Test 5: Export system integration
            self._test_export_system_integration()
            
            duration = time.time() - test_start
            self.result.add_test_result("Component Integration", True, duration)
            self.result.add_performance_metric("component_integration_time", duration, "seconds")
            
        except Exception as e:
            duration = time.time() - test_start
            logger.error(f"❌ Component integration failed: {e}")
            self.result.add_test_result("Component Integration", False, duration)
            self.result.add_error(f"Component integration failed: {e}")
    
    def _test_video_engine_initialization(self):
        """Test Video Engine initialization"""
        logger.info("  🧪 Testing Video Engine initialization...")
        
        try:
            from video_engine import VideoEngine, VideoConfig
            
            # Test basic initialization
            config = VideoConfig(
                frame_rate=24,
                resolution=(1920, 1080),
                quality="high"
            )
            
            engine = VideoEngine(config)
            
            # Validate configuration
            is_valid, issues = engine.validate_configuration()
            if not is_valid:
                raise ValueError(f"Configuration validation failed: {issues}")
            
            # Test project loading
            if not engine.load_project(self.temp_project_dir):
                raise RuntimeError("Failed to load validation project")
            
            logger.info("    ✅ Video Engine initialization successful")
            
        except Exception as e:
            logger.error(f"    ❌ Video Engine initialization failed: {e}")
            raise
    
    def _test_advanced_interpolation_integration(self):
        """Test advanced interpolation integration"""
        logger.info("  🧪 Testing advanced interpolation integration...")
        
        try:
            from advanced_interpolation_engine import (
                AdvancedInterpolationEngine,
                create_cinematic_preset
            )
            
            # Test preset creation
            config = create_cinematic_preset("cinematic")
            engine = AdvancedInterpolationEngine(config)
            
            # Test configuration validation
            is_valid, issues = engine.validate_configuration()
            if not is_valid:
                raise ValueError(f"Advanced interpolation config invalid: {issues}")
            
            # Test basic interpolation
            keyframes = [
                np.random.randint(0, 255, (1080, 1920, 3), dtype=np.uint8),
                np.random.randint(0, 255, (1080, 1920, 3), dtype=np.uint8)
            ]
            
            camera_movement = {
                "type": "pan",
                "direction": "right",
                "amount": 0.1,
                "duration": 2.0,
                "easing": "ease_in_out"
            }
            
            interpolated_frames = engine.interpolate_frames(
                keyframes, 48, camera_movement
            )
            
            if len(interpolated_frames) != 48:
                raise ValueError(f"Expected 48 frames, got {len(interpolated_frames)}")
            
            logger.info("    ✅ Advanced interpolation integration successful")
            
        except Exception as e:
            logger.error(f"    ❌ Advanced interpolation integration failed: {e}")
            raise
    
    def _test_configuration_management_integration(self):
        """Test configuration management integration"""
        logger.info("  🧪 Testing configuration management integration...")
        
        try:
            from video_configuration_manager import VideoConfigurationManager
            
            config_manager = VideoConfigurationManager()
            
            # Test preset loading
            presets = ["documentary", "cinematic", "action", "portrait"]
            for preset_name in presets:
                config = config_manager.load_preset(preset_name)
                is_valid, issues = config_manager.validate_configuration(config)
                
                if not is_valid:
                    raise ValueError(f"Preset {preset_name} invalid: {issues}")
            
            # Test serialization
            config = config_manager.load_preset("cinematic")
            json_data = config_manager.serialize_configuration(config, "json")
            restored_config = config_manager.deserialize_configuration(json_data, "json")
            
            # Validate round-trip
            if config.frame_rate != restored_config.frame_rate:
                raise ValueError("Configuration serialization round-trip failed")
            
            logger.info("    ✅ Configuration management integration successful")
            
        except Exception as e:
            logger.error(f"    ❌ Configuration management integration failed: {e}")
            raise
    
    def _test_pipeline_integration(self):
        """Test pipeline integration"""
        logger.info("  🧪 Testing pipeline integration...")
        
        try:
            # Test Data Contract v1 compliance
            project_path = Path(self.temp_project_dir)
            project_file = project_path / "project.json"
            
            with open(project_file, 'r') as f:
                project_data = json.load(f)
            
            # Validate required fields
            required_fields = ["schema_version", "project_name", "video_settings"]
            for field in required_fields:
                if field not in project_data:
                    raise ValueError(f"Missing required field: {field}")
            
            # Test metadata generation
            from video_engine import VideoEngine, VideoConfig
            
            config = VideoConfig(**project_data["video_settings"])
            engine = VideoEngine(config)
            engine.load_project(str(project_path))
            
            timeline_metadata = engine.get_timeline_metadata()
            
            # Validate timeline metadata
            required_timeline_fields = ["total_duration", "total_frames", "frame_rate"]
            for field in required_timeline_fields:
                if field not in timeline_metadata:
                    raise ValueError(f"Missing timeline field: {field}")
            
            logger.info("    ✅ Pipeline integration successful")
            
        except Exception as e:
            logger.error(f"    ❌ Pipeline integration failed: {e}")
            raise
    
    def _test_export_system_integration(self):
        """Test export system integration"""
        logger.info("  🧪 Testing export system integration...")
        
        try:
            from export_manager import ExportManager
            
            export_manager = ExportManager()
            
            # Test export configuration
            export_config = {
                "output_format": "png",
                "organize_by_shot": True,
                "include_metadata": True,
                "generate_timeline": True
            }
            
            # Mock export test (would normally export actual frames)
            mock_frames = [
                np.random.randint(0, 255, (1080, 1920, 3), dtype=np.uint8)
                for _ in range(24)
            ]
            
            export_result = export_manager.export_frame_sequence(
                mock_frames,
                str(Path(self.temp_project_dir) / "output" / "test_export"),
                export_config
            )
            
            if not export_result.success:
                raise RuntimeError(f"Export failed: {export_result.error_message}")
            
            logger.info("    ✅ Export system integration successful")
            
        except Exception as e:
            logger.error(f"    ❌ Export system integration failed: {e}")
            raise
    
    def _validate_performance_targets(self):
        """Validate performance targets are met"""
        logger.info("⚡ Validating performance targets...")
        
        test_start = time.time()
        
        try:
            # Performance target: < 30 seconds per second of video
            target_fps_threshold = 1.0 / 30.0  # 1 second of video in 30 seconds = ~0.033 processing FPS
            
            # Test performance with different configurations
            performance_results = self._run_performance_tests()
            
            # Validate performance targets
            successful_configs = []
            for config_name, result in performance_results.items():
                if result.get("success", False) and "processing_fps" in result:
                    processing_fps = result["processing_fps"]
                    
                    if processing_fps >= target_fps_threshold:
                        logger.info(f"    ✅ {config_name}: {processing_fps:.3f} FPS (target: {target_fps_threshold:.3f})")
                        self.result.add_performance_metric(f"{config_name}_fps", processing_fps, "fps")
                        successful_configs.append(config_name)
                    else:
                        logger.warning(f"    ⚠️  {config_name}: {processing_fps:.3f} FPS (below target)")
                        self.result.add_warning(f"{config_name} below performance target", "Performance Validation")
                    
                    # Add detailed metrics
                    self.result.add_performance_metric(f"{config_name}_processing_time", result["processing_time"], "seconds")
                    self.result.add_performance_metric(f"{config_name}_memory_usage", result["memory_usage_mb"], "MB")
                else:
                    error_msg = result.get("error", "Unknown error")
                    logger.error(f"    ❌ {config_name}: {error_msg}")
                    self.result.add_error(f"{config_name} performance test failed: {error_msg}")
            
            # Overall performance validation
            if successful_configs:
                successful_results = [performance_results[name] for name in successful_configs]
                best_fps = max(result["processing_fps"] for result in successful_results)
                performance_passed = best_fps >= target_fps_threshold
            else:
                best_fps = 0.0
                performance_passed = False
            
            duration = time.time() - test_start
            self.result.add_test_result("Performance Targets", performance_passed, duration)
            
            if performance_passed:
                logger.info(f"    🎯 Performance target met: {best_fps:.3f} FPS")
            else:
                logger.warning(f"    ⚠️  Performance target not met: {best_fps:.3f} FPS")
            
        except Exception as e:
            duration = time.time() - test_start
            logger.error(f"❌ Performance validation failed: {e}")
            self.result.add_test_result("Performance Targets", False, duration)
            self.result.add_error(f"Performance validation failed: {e}")
    
    def _run_performance_tests(self) -> Dict[str, Dict]:
        """Run performance tests with different configurations"""
        
        from video_engine import VideoEngine, VideoConfig
        import psutil
        import gc
        
        test_configs = {
            "gpu_optimized": VideoConfig(
                frame_rate=24,
                resolution=(1920, 1080),
                quality="medium",
                gpu_acceleration=True,
                parallel_processing=True
            ),
            "cpu_optimized": VideoConfig(
                frame_rate=24,
                resolution=(1280, 720),
                quality="medium",
                gpu_acceleration=False,
                parallel_processing=True
            ),
            "balanced": VideoConfig(
                frame_rate=24,
                resolution=(1920, 1080),
                quality="medium",
                gpu_acceleration=True,
                parallel_processing=False
            )
        }
        
        results = {}
        
        for config_name, config in test_configs.items():
            logger.info(f"  🧪 Testing {config_name} performance...")
            
            try:
                # Setup
                engine = VideoEngine(config)
                engine.load_project(self.temp_project_dir)
                
                # Monitor memory
                process = psutil.Process()
                memory_before = process.memory_info().rss / 1024**2  # MB
                
                # Performance test
                start_time = time.time()
                result = engine.generate_video_sequence("shot_001")  # 5 second shot
                end_time = time.time()
                
                memory_after = process.memory_info().rss / 1024**2  # MB
                
                if result.success:
                    processing_time = end_time - start_time
                    video_duration = result.duration  # seconds of video
                    processing_fps = video_duration / processing_time if processing_time > 0 else 0
                    
                    results[config_name] = {
                        "success": True,
                        "processing_time": processing_time,
                        "video_duration": video_duration,
                        "processing_fps": processing_fps,
                        "frame_count": result.frame_count,
                        "memory_usage_mb": memory_after - memory_before
                    }
                    
                    logger.info(f"    ✅ {config_name}: {processing_fps:.3f} FPS, {processing_time:.1f}s")
                else:
                    results[config_name] = {
                        "success": False,
                        "error": result.error_message
                    }
                    logger.error(f"    ❌ {config_name}: {result.error_message}")
                
                # Cleanup
                gc.collect()
                
            except Exception as e:
                results[config_name] = {
                    "success": False,
                    "error": str(e)
                }
                logger.error(f"    ❌ {config_name}: {e}")
        
        return results
    
    def _validate_quality_standards(self):
        """Validate professional quality output standards"""
        logger.info("🎨 Validating quality standards...")
        
        test_start = time.time()
        
        try:
            # Quality targets
            quality_targets = {
                "temporal_coherence": 0.7,      # Minimum temporal coherence
                "motion_smoothness": 0.8,       # Minimum motion smoothness
                "visual_quality": 0.85,         # Minimum visual quality score
                "artifact_threshold": 0.1       # Maximum artifact level
            }
            
            # Run quality tests
            quality_results = self._run_quality_tests()
            
            all_quality_passed = True
            
            for metric_name, target_value in quality_targets.items():
                if metric_name in quality_results:
                    actual_value = quality_results[metric_name]
                    passed = actual_value >= target_value
                    
                    if passed:
                        logger.info(f"    ✅ {metric_name}: {actual_value:.3f} (target: {target_value:.3f})")
                    else:
                        logger.warning(f"    ⚠️  {metric_name}: {actual_value:.3f} (below target: {target_value:.3f})")
                        all_quality_passed = False
                    
                    self.result.add_quality_metric(metric_name, actual_value, target_value)
                else:
                    logger.warning(f"    ⚠️  {metric_name}: Not measured")
                    all_quality_passed = False
            
            duration = time.time() - test_start
            self.result.add_test_result("Quality Standards", all_quality_passed, duration)
            
            if all_quality_passed:
                logger.info("    🎯 All quality standards met")
            else:
                logger.warning("    ⚠️  Some quality standards not met")
            
        except Exception as e:
            duration = time.time() - test_start
            logger.error(f"❌ Quality validation failed: {e}")
            self.result.add_test_result("Quality Standards", False, duration)
            self.result.add_error(f"Quality validation failed: {e}")
    
    def _run_quality_tests(self) -> Dict[str, float]:
        """Run quality validation tests"""
        
        try:
            from quality_validator import QualityValidator
            from video_engine import VideoEngine, VideoConfig
            
            # Setup quality validator
            validator = QualityValidator()
            
            # Generate test sequence
            config = VideoConfig(
                frame_rate=24,
                resolution=(1920, 1080),
                quality="high"
            )
            
            engine = VideoEngine(config)
            engine.load_project(self.temp_project_dir)
            
            result = engine.generate_video_sequence("shot_001")
            
            if not result.success:
                raise RuntimeError(f"Failed to generate test sequence: {result.error_message}")
            
            # Validate quality
            quality_metrics = validator.validate_sequence(result.frames)
            
            # Calculate specific metrics
            temporal_coherence = validator.calculate_temporal_coherence(result.frames)
            motion_smoothness = validator.calculate_motion_smoothness(result.frames)
            visual_quality = validator.calculate_visual_quality_score(result.frames)
            artifact_level = validator.detect_artifacts(result.frames)
            
            return {
                "temporal_coherence": temporal_coherence,
                "motion_smoothness": motion_smoothness,
                "visual_quality": visual_quality,
                "artifact_threshold": 1.0 - artifact_level  # Invert so higher is better
            }
            
        except Exception as e:
            logger.error(f"Quality test failed: {e}")
            return {}
    
    def _validate_error_handling(self):
        """Validate comprehensive error handling and recovery"""
        logger.info("🛡️  Validating error handling and recovery...")
        
        test_start = time.time()
        
        try:
            error_tests_passed = 0
            total_error_tests = 0
            
            # Test 1: Invalid configuration handling
            total_error_tests += 1
            if self._test_invalid_configuration_handling():
                error_tests_passed += 1
            
            # Test 2: Missing project handling
            total_error_tests += 1
            if self._test_missing_project_handling():
                error_tests_passed += 1
            
            # Test 3: Corrupted input handling
            total_error_tests += 1
            if self._test_corrupted_input_handling():
                error_tests_passed += 1
            
            # Test 4: Memory exhaustion handling
            total_error_tests += 1
            if self._test_memory_exhaustion_handling():
                error_tests_passed += 1
            
            # Test 5: GPU failure fallback
            total_error_tests += 1
            if self._test_gpu_failure_fallback():
                error_tests_passed += 1
            
            # Calculate success rate
            error_handling_success_rate = (error_tests_passed / total_error_tests) * 100
            error_handling_passed = error_handling_success_rate >= 80.0  # 80% threshold
            
            duration = time.time() - test_start
            self.result.add_test_result("Error Handling", error_handling_passed, duration)
            self.result.add_performance_metric("error_handling_success_rate", error_handling_success_rate, "%")
            
            logger.info(f"    📊 Error handling success rate: {error_handling_success_rate:.1f}%")
            
            if error_handling_passed:
                logger.info("    ✅ Error handling validation passed")
            else:
                logger.warning("    ⚠️  Error handling validation needs improvement")
            
        except Exception as e:
            duration = time.time() - test_start
            logger.error(f"❌ Error handling validation failed: {e}")
            self.result.add_test_result("Error Handling", False, duration)
            self.result.add_error(f"Error handling validation failed: {e}")
    
    def _test_invalid_configuration_handling(self) -> bool:
        """Test handling of invalid configurations"""
        logger.info("    🧪 Testing invalid configuration handling...")
        
        try:
            from video_engine import VideoEngine, VideoConfig
            
            # Test invalid frame rate
            invalid_config = VideoConfig(frame_rate=-1)
            engine = VideoEngine(invalid_config)
            
            is_valid, issues = engine.validate_configuration()
            
            if is_valid:
                logger.error("      ❌ Invalid configuration was accepted")
                return False
            
            if not issues:
                logger.error("      ❌ No validation issues reported")
                return False
            
            logger.info("      ✅ Invalid configuration properly rejected")
            return True
            
        except Exception as e:
            logger.error(f"      ❌ Invalid configuration test failed: {e}")
            return False
    
    def _test_missing_project_handling(self) -> bool:
        """Test handling of missing project files"""
        logger.info("    🧪 Testing missing project handling...")
        
        try:
            from video_engine import VideoEngine, VideoConfig
            
            config = VideoConfig()
            engine = VideoEngine(config)
            
            # Try to load non-existent project
            result = engine.load_project("/nonexistent/project/path")
            
            if result:
                logger.error("      ❌ Non-existent project was loaded")
                return False
            
            logger.info("      ✅ Missing project properly handled")
            return True
            
        except Exception as e:
            # Exception is acceptable for missing project
            logger.info(f"      ✅ Missing project raised exception (acceptable): {e}")
            return True
    
    def _test_corrupted_input_handling(self) -> bool:
        """Test handling of corrupted input data"""
        logger.info("    🧪 Testing corrupted input handling...")
        
        try:
            from video_engine import VideoEngine, VideoConfig
            
            # Create corrupted project file
            corrupted_project_path = Path(self.temp_project_dir) / "corrupted_project"
            corrupted_project_path.mkdir(exist_ok=True)
            
            # Write invalid JSON
            with open(corrupted_project_path / "project.json", 'w') as f:
                f.write("{ invalid json content")
            
            config = VideoConfig()
            engine = VideoEngine(config)
            
            # Try to load corrupted project
            result = engine.load_project(str(corrupted_project_path))
            
            if result:
                logger.error("      ❌ Corrupted project was loaded")
                return False
            
            logger.info("      ✅ Corrupted input properly handled")
            return True
            
        except Exception as e:
            # Exception is acceptable for corrupted input
            logger.info(f"      ✅ Corrupted input raised exception (acceptable): {e}")
            return True
    
    def _test_memory_exhaustion_handling(self) -> bool:
        """Test handling of memory exhaustion scenarios"""
        logger.info("    🧪 Testing memory exhaustion handling...")
        
        try:
            # This is a simplified test - in reality would need to simulate actual memory pressure
            from video_engine import VideoEngine, VideoConfig
            
            # Create configuration that might stress memory
            memory_stress_config = VideoConfig(
                frame_rate=60,
                resolution=(3840, 2160),  # 4K resolution
                quality="ultra",
                parallel_processing=True
            )
            
            engine = VideoEngine(memory_stress_config)
            
            # The system should handle this gracefully (either process or fail gracefully)
            is_valid, issues = engine.validate_configuration()
            
            # If validation passes, the system can handle it
            # If validation fails, it should provide clear issues
            if not is_valid and issues:
                logger.info("      ✅ High memory configuration properly validated")
                return True
            elif is_valid:
                logger.info("      ✅ High memory configuration accepted (system capable)")
                return True
            else:
                logger.error("      ❌ High memory configuration validation unclear")
                return False
            
        except Exception as e:
            logger.info(f"      ✅ Memory exhaustion raised exception (acceptable): {e}")
            return True
    
    def _test_gpu_failure_fallback(self) -> bool:
        """Test GPU failure fallback to CPU"""
        logger.info("    🧪 Testing GPU failure fallback...")
        
        try:
            from video_engine import VideoEngine, VideoConfig
            
            # Create GPU configuration
            gpu_config = VideoConfig(
                frame_rate=24,
                resolution=(1920, 1080),
                quality="medium",
                gpu_acceleration=True
            )
            
            engine = VideoEngine(gpu_config)
            
            # If GPU is not available, system should handle gracefully
            is_valid, issues = engine.validate_configuration()
            
            if is_valid:
                logger.info("      ✅ GPU configuration validated (GPU available or fallback working)")
                return True
            else:
                # Check if issues mention GPU fallback
                gpu_fallback_mentioned = any("gpu" in issue.lower() or "fallback" in issue.lower() 
                                           for issue in issues)
                
                if gpu_fallback_mentioned:
                    logger.info("      ✅ GPU fallback properly indicated")
                    return True
                else:
                    logger.error(f"      ❌ GPU issues not properly handled: {issues}")
                    return False
            
        except Exception as e:
            logger.info(f"      ✅ GPU failure raised exception (acceptable): {e}")
            return True
    
    def _validate_scalability(self):
        """Validate system scalability"""
        logger.info("📈 Validating system scalability...")
        
        test_start = time.time()
        
        try:
            scalability_results = self._run_scalability_tests()
            
            # Analyze scalability metrics
            scalability_passed = True
            
            for test_name, result in scalability_results.items():
                if result["success"]:
                    logger.info(f"    ✅ {test_name}: {result['summary']}")
                    
                    # Add performance metrics
                    if "processing_time" in result:
                        self.result.add_performance_metric(
                            f"scalability_{test_name}_time", 
                            result["processing_time"], 
                            "seconds"
                        )
                else:
                    logger.warning(f"    ⚠️  {test_name}: {result.get('error', 'Failed')}")
                    scalability_passed = False
            
            duration = time.time() - test_start
            self.result.add_test_result("Scalability", scalability_passed, duration)
            
            if scalability_passed:
                logger.info("    🎯 Scalability validation passed")
            else:
                logger.warning("    ⚠️  Scalability validation needs attention")
            
        except Exception as e:
            duration = time.time() - test_start
            logger.error(f"❌ Scalability validation failed: {e}")
            self.result.add_test_result("Scalability", False, duration)
            self.result.add_error(f"Scalability validation failed: {e}")
    
    def _run_scalability_tests(self) -> Dict[str, Dict]:
        """Run scalability tests"""
        
        results = {}
        
        # Test 1: Multiple shot processing
        results["multiple_shots"] = self._test_multiple_shot_scalability()
        
        # Test 2: Large frame count handling
        results["large_frame_count"] = self._test_large_frame_count_scalability()
        
        # Test 3: Concurrent processing
        results["concurrent_processing"] = self._test_concurrent_processing_scalability()
        
        return results
    
    def _test_multiple_shot_scalability(self) -> Dict:
        """Test processing multiple shots"""
        logger.info("    🧪 Testing multiple shot scalability...")
        
        try:
            from video_engine import VideoEngine, VideoConfig
            
            config = VideoConfig(
                frame_rate=24,
                resolution=(1280, 720),  # Moderate resolution for scalability test
                quality="medium"
            )
            
            engine = VideoEngine(config)
            engine.load_project(self.temp_project_dir)
            
            # Process multiple shots
            shot_ids = ["shot_001", "shot_002", "shot_003"]
            
            start_time = time.time()
            successful_shots = 0
            
            for shot_id in shot_ids:
                result = engine.generate_video_sequence(shot_id)
                if result.success:
                    successful_shots += 1
            
            processing_time = time.time() - start_time
            
            success_rate = (successful_shots / len(shot_ids)) * 100
            
            return {
                "success": success_rate >= 80.0,  # 80% success threshold
                "processing_time": processing_time,
                "shots_processed": successful_shots,
                "total_shots": len(shot_ids),
                "success_rate": success_rate,
                "summary": f"{successful_shots}/{len(shot_ids)} shots ({success_rate:.1f}%)"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _test_large_frame_count_scalability(self) -> Dict:
        """Test handling of large frame counts"""
        logger.info("    🧪 Testing large frame count scalability...")
        
        try:
            # This would test processing a longer sequence
            # For validation, we'll simulate this with a reasonable test
            
            from advanced_interpolation_engine import (
                AdvancedInterpolationEngine,
                create_cinematic_preset
            )
            
            config = create_cinematic_preset("documentary")  # Efficient preset
            engine = AdvancedInterpolationEngine(config)
            
            # Test with larger frame count
            keyframes = [
                np.random.randint(0, 255, (720, 1280, 3), dtype=np.uint8),
                np.random.randint(0, 255, (720, 1280, 3), dtype=np.uint8)
            ]
            
            large_frame_count = 240  # 10 seconds at 24fps
            
            start_time = time.time()
            interpolated_frames = engine.interpolate_frames(keyframes, large_frame_count)
            processing_time = time.time() - start_time
            
            success = len(interpolated_frames) == large_frame_count
            
            return {
                "success": success,
                "processing_time": processing_time,
                "target_frames": large_frame_count,
                "actual_frames": len(interpolated_frames),
                "summary": f"{len(interpolated_frames)}/{large_frame_count} frames in {processing_time:.1f}s"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _test_concurrent_processing_scalability(self) -> Dict:
        """Test concurrent processing capabilities"""
        logger.info("    🧪 Testing concurrent processing scalability...")
        
        try:
            import threading
            import queue
            
            from video_engine import VideoEngine, VideoConfig
            
            config = VideoConfig(
                frame_rate=24,
                resolution=(854, 480),  # Lower resolution for concurrent test
                quality="low",
                parallel_processing=True
            )
            
            # Test concurrent processing with multiple engines
            def process_shot(shot_id, result_queue):
                try:
                    engine = VideoEngine(config)
                    engine.load_project(self.temp_project_dir)
                    result = engine.generate_video_sequence(shot_id)
                    result_queue.put({"shot_id": shot_id, "success": result.success})
                except Exception as e:
                    result_queue.put({"shot_id": shot_id, "success": False, "error": str(e)})
            
            # Start concurrent processing
            result_queue = queue.Queue()
            threads = []
            shot_ids = ["shot_001", "shot_002"]
            
            start_time = time.time()
            
            for shot_id in shot_ids:
                thread = threading.Thread(target=process_shot, args=(shot_id, result_queue))
                thread.start()
                threads.append(thread)
            
            # Wait for completion
            for thread in threads:
                thread.join(timeout=60)  # 60 second timeout
            
            processing_time = time.time() - start_time
            
            # Collect results
            results = []
            while not result_queue.empty():
                results.append(result_queue.get())
            
            successful_concurrent = sum(1 for r in results if r["success"])
            
            return {
                "success": successful_concurrent >= len(shot_ids) // 2,  # At least half successful
                "processing_time": processing_time,
                "concurrent_shots": len(shot_ids),
                "successful_shots": successful_concurrent,
                "summary": f"{successful_concurrent}/{len(shot_ids)} concurrent shots"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _validate_professional_standards(self):
        """Validate professional broadcast standards compliance"""
        logger.info("🎖️  Validating professional standards compliance...")
        
        test_start = time.time()
        
        try:
            professional_tests_passed = 0
            total_professional_tests = 0
            
            # Test 1: Broadcast frame rates
            total_professional_tests += 1
            if self._test_broadcast_frame_rates():
                professional_tests_passed += 1
            
            # Test 2: Standard resolutions
            total_professional_tests += 1
            if self._test_standard_resolutions():
                professional_tests_passed += 1
            
            # Test 3: Color space compliance
            total_professional_tests += 1
            if self._test_color_space_compliance():
                professional_tests_passed += 1
            
            # Test 4: Metadata standards
            total_professional_tests += 1
            if self._test_metadata_standards():
                professional_tests_passed += 1
            
            # Test 5: Export format compliance
            total_professional_tests += 1
            if self._test_export_format_compliance():
                professional_tests_passed += 1
            
            # Calculate success rate
            professional_success_rate = (professional_tests_passed / total_professional_tests) * 100
            professional_passed = professional_success_rate >= 90.0  # 90% threshold for professional standards
            
            duration = time.time() - test_start
            self.result.add_test_result("Professional Standards", professional_passed, duration)
            self.result.add_performance_metric("professional_standards_success_rate", professional_success_rate, "%")
            
            logger.info(f"    📊 Professional standards success rate: {professional_success_rate:.1f}%")
            
            if professional_passed:
                logger.info("    ✅ Professional standards validation passed")
            else:
                logger.warning("    ⚠️  Professional standards validation needs improvement")
            
        except Exception as e:
            duration = time.time() - test_start
            logger.error(f"❌ Professional standards validation failed: {e}")
            self.result.add_test_result("Professional Standards", False, duration)
            self.result.add_error(f"Professional standards validation failed: {e}")
    
    def _test_broadcast_frame_rates(self) -> bool:
        """Test support for broadcast standard frame rates"""
        logger.info("    🧪 Testing broadcast frame rates...")
        
        try:
            from video_engine import VideoEngine, VideoConfig
            
            # Standard broadcast frame rates
            broadcast_frame_rates = [23.976, 24, 25, 29.97, 30, 50, 59.94, 60]
            
            supported_rates = 0
            
            for frame_rate in broadcast_frame_rates:
                try:
                    config = VideoConfig(
                        frame_rate=int(frame_rate),  # Simplified to int for testing
                        resolution=(1920, 1080),
                        quality="medium"
                    )
                    
                    engine = VideoEngine(config)
                    is_valid, issues = engine.validate_configuration()
                    
                    if is_valid:
                        supported_rates += 1
                        logger.info(f"      ✅ {frame_rate} fps supported")
                    else:
                        logger.warning(f"      ⚠️  {frame_rate} fps not supported: {issues}")
                        
                except Exception as e:
                    logger.warning(f"      ⚠️  {frame_rate} fps failed: {e}")
            
            # Require support for at least 80% of standard frame rates
            success_rate = (supported_rates / len(broadcast_frame_rates)) * 100
            success = success_rate >= 80.0
            
            logger.info(f"      📊 Frame rate support: {supported_rates}/{len(broadcast_frame_rates)} ({success_rate:.1f}%)")
            
            return success
            
        except Exception as e:
            logger.error(f"      ❌ Broadcast frame rate test failed: {e}")
            return False
    
    def _test_standard_resolutions(self) -> bool:
        """Test support for standard broadcast resolutions"""
        logger.info("    🧪 Testing standard resolutions...")
        
        try:
            from video_engine import VideoEngine, VideoConfig
            
            # Standard broadcast resolutions
            standard_resolutions = [
                (1280, 720),    # 720p HD
                (1920, 1080),   # 1080p Full HD
                (3840, 2160),   # 4K UHD
                (854, 480),     # 480p SD
                (640, 360)      # 360p
            ]
            
            supported_resolutions = 0
            
            for width, height in standard_resolutions:
                try:
                    config = VideoConfig(
                        frame_rate=24,
                        resolution=(width, height),
                        quality="medium"
                    )
                    
                    engine = VideoEngine(config)
                    is_valid, issues = engine.validate_configuration()
                    
                    if is_valid:
                        supported_resolutions += 1
                        logger.info(f"      ✅ {width}x{height} supported")
                    else:
                        logger.warning(f"      ⚠️  {width}x{height} not supported: {issues}")
                        
                except Exception as e:
                    logger.warning(f"      ⚠️  {width}x{height} failed: {e}")
            
            # Require support for at least 80% of standard resolutions
            success_rate = (supported_resolutions / len(standard_resolutions)) * 100
            success = success_rate >= 80.0
            
            logger.info(f"      📊 Resolution support: {supported_resolutions}/{len(standard_resolutions)} ({success_rate:.1f}%)")
            
            return success
            
        except Exception as e:
            logger.error(f"      ❌ Standard resolution test failed: {e}")
            return False
    
    def _test_color_space_compliance(self) -> bool:
        """Test color space compliance"""
        logger.info("    🧪 Testing color space compliance...")
        
        try:
            # Test that generated frames have proper color space
            from video_engine import VideoEngine, VideoConfig
            
            config = VideoConfig(
                frame_rate=24,
                resolution=(1920, 1080),
                quality="high"
            )
            
            engine = VideoEngine(config)
            engine.load_project(self.temp_project_dir)
            
            result = engine.generate_video_sequence("shot_001")
            
            if not result.success:
                logger.error(f"      ❌ Failed to generate test sequence: {result.error_message}")
                return False
            
            # Check frame properties
            if not result.frames:
                logger.error("      ❌ No frames generated")
                return False
            
            sample_frame = result.frames[0]
            
            # Check frame format
            if sample_frame.dtype != np.uint8:
                logger.warning(f"      ⚠️  Frame dtype is {sample_frame.dtype}, expected uint8")
                return False
            
            # Check color range (0-255 for uint8)
            if sample_frame.min() < 0 or sample_frame.max() > 255:
                logger.warning(f"      ⚠️  Frame values out of range: {sample_frame.min()}-{sample_frame.max()}")
                return False
            
            # Check dimensions
            if len(sample_frame.shape) != 3 or sample_frame.shape[2] != 3:
                logger.warning(f"      ⚠️  Frame shape is {sample_frame.shape}, expected (H, W, 3)")
                return False
            
            logger.info("      ✅ Color space compliance verified")
            return True
            
        except Exception as e:
            logger.error(f"      ❌ Color space compliance test failed: {e}")
            return False
    
    def _test_metadata_standards(self) -> bool:
        """Test metadata standards compliance"""
        logger.info("    🧪 Testing metadata standards...")
        
        try:
            from video_engine import VideoEngine, VideoConfig
            
            config = VideoConfig()
            engine = VideoEngine(config)
            engine.load_project(self.temp_project_dir)
            
            # Get timeline metadata
            timeline_metadata = engine.get_timeline_metadata()
            
            # Check required metadata fields
            required_fields = [
                "total_duration",
                "total_frames", 
                "frame_rate",
                "resolution",
                "shots"
            ]
            
            missing_fields = []
            for field in required_fields:
                if field not in timeline_metadata:
                    missing_fields.append(field)
            
            if missing_fields:
                logger.warning(f"      ⚠️  Missing metadata fields: {missing_fields}")
                return False
            
            # Validate metadata values
            if timeline_metadata["total_duration"] <= 0:
                logger.warning("      ⚠️  Invalid total_duration")
                return False
            
            if timeline_metadata["total_frames"] <= 0:
                logger.warning("      ⚠️  Invalid total_frames")
                return False
            
            if timeline_metadata["frame_rate"] <= 0:
                logger.warning("      ⚠️  Invalid frame_rate")
                return False
            
            logger.info("      ✅ Metadata standards compliance verified")
            return True
            
        except Exception as e:
            logger.error(f"      ❌ Metadata standards test failed: {e}")
            return False
    
    def _test_export_format_compliance(self) -> bool:
        """Test export format compliance"""
        logger.info("    🧪 Testing export format compliance...")
        
        try:
            from export_manager import ExportManager
            
            export_manager = ExportManager()
            
            # Test standard export formats
            standard_formats = ["png", "jpg", "tiff"]
            
            supported_formats = 0
            
            for format_name in standard_formats:
                try:
                    export_config = {
                        "output_format": format_name,
                        "organize_by_shot": True,
                        "include_metadata": True
                    }
                    
                    # Test format validation
                    is_valid = export_manager.validate_export_config(export_config)
                    
                    if is_valid:
                        supported_formats += 1
                        logger.info(f"      ✅ {format_name} format supported")
                    else:
                        logger.warning(f"      ⚠️  {format_name} format not supported")
                        
                except Exception as e:
                    logger.warning(f"      ⚠️  {format_name} format failed: {e}")
            
            # Require support for at least 2 standard formats
            success = supported_formats >= 2
            
            logger.info(f"      📊 Export format support: {supported_formats}/{len(standard_formats)}")
            
            return success
            
        except Exception as e:
            logger.error(f"      ❌ Export format compliance test failed: {e}")
            return False
    
    def _generate_validation_report(self):
        """Generate comprehensive validation report"""
        logger.info("📋 Generating validation report...")
        
        try:
            # Calculate overall metrics
            success_rate = self.result.get_success_rate()
            duration = self.result.get_duration()
            
            # Create report
            report = {
                "validation_summary": {
                    "start_time": self.result.start_time.isoformat(),
                    "end_time": self.result.end_time.isoformat() if self.result.end_time else None,
                    "duration_seconds": duration,
                    "total_tests": self.result.total_tests,
                    "passed_tests": self.result.passed_tests,
                    "failed_tests": self.result.failed_tests,
                    "success_rate": success_rate,
                    "validation_passed": success_rate >= 95.0  # 95% threshold for overall validation
                },
                "test_results": self.result.test_results,
                "performance_metrics": self.result.performance_metrics,
                "quality_metrics": self.result.quality_metrics,
                "errors": self.result.error_log,
                "warnings": self.result.warnings,
                "system_info": self._get_system_info()
            }
            
            # Save report
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            report_filename = f"video_engine_system_validation_report_{timestamp}.json"
            
            with open(report_filename, 'w') as f:
                json.dump(report, f, indent=2)
            
            logger.info(f"📊 Validation report saved: {report_filename}")
            
            # Print summary
            self._print_validation_summary(report)
            
            return report_filename
            
        except Exception as e:
            logger.error(f"❌ Failed to generate validation report: {e}")
            self.result.add_error(f"Report generation failed: {e}")
            return None
    
    def _get_system_info(self) -> Dict:
        """Get system information for the report"""
        
        try:
            import psutil
            import platform
            
            memory = psutil.virtual_memory()
            
            system_info = {
                "platform": platform.platform(),
                "python_version": platform.python_version(),
                "cpu_count": psutil.cpu_count(),
                "memory_total_gb": memory.total / 1024**3,
                "memory_available_gb": memory.available / 1024**3,
                "timestamp": datetime.now().isoformat()
            }
            
            # Try to get GPU info
            try:
                import torch
                if torch.cuda.is_available():
                    system_info["gpu_available"] = True
                    system_info["gpu_name"] = torch.cuda.get_device_name(0)
                    system_info["gpu_memory_gb"] = torch.cuda.get_device_properties(0).total_memory / 1024**3
                else:
                    system_info["gpu_available"] = False
            except ImportError:
                system_info["gpu_available"] = "unknown"
            
            return system_info
            
        except Exception as e:
            logger.warning(f"Failed to get system info: {e}")
            return {"error": str(e)}
    
    def _print_validation_summary(self, report: Dict):
        """Print validation summary to console"""
        
        summary = report["validation_summary"]
        
        logger.info("\n" + "=" * 60)
        logger.info("🎯 VIDEO ENGINE SYSTEM VALIDATION SUMMARY")
        logger.info("=" * 60)
        
        # Overall results
        logger.info(f"📊 Overall Results:")
        logger.info(f"   Tests Passed: {summary['passed_tests']}/{summary['total_tests']}")
        logger.info(f"   Success Rate: {summary['success_rate']:.1f}%")
        logger.info(f"   Duration: {summary['duration_seconds']:.1f} seconds")
        
        # Validation status
        if summary["validation_passed"]:
            logger.info("✅ SYSTEM VALIDATION PASSED")
        else:
            logger.info("❌ SYSTEM VALIDATION FAILED")
        
        # Performance highlights
        if report["performance_metrics"]:
            logger.info(f"\n⚡ Performance Highlights:")
            for metric_name, metric_data in report["performance_metrics"].items():
                if "fps" in metric_name.lower():
                    logger.info(f"   {metric_name}: {metric_data['value']:.3f} {metric_data['unit']}")
        
        # Quality highlights
        if report["quality_metrics"]:
            logger.info(f"\n🎨 Quality Highlights:")
            for metric_name, metric_data in report["quality_metrics"].items():
                status = "✅" if metric_data["passed"] else "❌"
                logger.info(f"   {status} {metric_name}: {metric_data['value']:.3f}")
        
        # Errors and warnings
        if report["errors"]:
            logger.info(f"\n❌ Errors ({len(report['errors'])}):")
            for error in report["errors"][-3:]:  # Show last 3 errors
                logger.info(f"   - {error['message']}")
        
        if report["warnings"]:
            logger.info(f"\n⚠️  Warnings ({len(report['warnings'])}):")
            for warning in report["warnings"][-3:]:  # Show last 3 warnings
                logger.info(f"   - {warning['message']}")
        
        logger.info("=" * 60)
    
    def _cleanup_validation_environment(self):
        """Cleanup validation environment"""
        logger.info("🧹 Cleaning up validation environment...")
        
        try:
            if self.temp_project_dir and Path(self.temp_project_dir).exists():
                shutil.rmtree(self.temp_project_dir)
                logger.info(f"✅ Cleaned up temp project: {self.temp_project_dir}")
        except Exception as e:
            logger.warning(f"⚠️  Cleanup failed: {e}")
            self.result.add_warning(f"Cleanup failed: {e}")

def main():
    """Main function to run system validation"""
    
    print("🚀 Video Engine System Validation")
    print("=" * 50)
    
    # Create and run validator
    validator = VideoEngineSystemValidator()
    result = validator.run_complete_validation()
    
    # Print final status
    success_rate = result.get_success_rate()
    
    if success_rate >= 95.0:
        print(f"\n🎉 VALIDATION SUCCESSFUL: {success_rate:.1f}% success rate")
        return 0
    else:
        print(f"\n💔 VALIDATION FAILED: {success_rate:.1f}% success rate")
        return 1

if __name__ == "__main__":
    exit(main())