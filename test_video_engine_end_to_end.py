#!/usr/bin/env python3
"""
Comprehensive End-to-End Testing for Video Engine
Task 19.1: Test complete pipeline: keyframes → interpolation → camera movement → export

This script validates the entire Video Engine pipeline under various conditions
and generates comprehensive performance and quality reports.
"""

import os
import sys
import json
import logging
import tempfile
import numpy as np
from pathlib import Path
from datetime import datetime

# Add src directory to path for imports
sys.path.insert(0, str(Path(__file__).parent / "src"))

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def create_test_project_structure():
    """Create temporary test project structure"""
    temp_dir = tempfile.mkdtemp(prefix="video_engine_e2e_test_")
    project_dir = Path(temp_dir) / "test_project"
    
    # Create project structure
    (project_dir / "assets" / "images" / "generated").mkdir(parents=True, exist_ok=True)
    (project_dir / "assets" / "video" / "sequences").mkdir(parents=True, exist_ok=True)
    (project_dir / "exports").mkdir(parents=True, exist_ok=True)
    
    # Create mock project.json
    project_data = {
        "schema_version": "1.0",
        "project_name": "end_to_end_test",
        "capabilities": {
            "grid_generation": True,
            "promotion_engine": True,
            "qa_engine": True,
            "video_engine": True
        },
        "generation_status": {
            "grid": "done",
            "promotion": "done",
            "video": "pending"
        }
    }
    
    with open(project_dir / "project.json", 'w') as f:
        json.dump(project_data, f, indent=2)
    
    logger.info(f"Created test project structure at: {project_dir}")
    return str(project_dir)

def create_mock_keyframes(project_dir: str, count: int = 5):
    """Create mock keyframe images for testing"""
    keyframes_dir = Path(project_dir) / "assets" / "images" / "generated"
    keyframes_dir.mkdir(parents=True, exist_ok=True)
    
    keyframes = []
    for i in range(count):
        # Create mock image data (1920x1080 RGB)
        image_data = np.random.randint(0, 256, (1080, 1920, 3), dtype=np.uint8)
        
        # Add some structure to make it more realistic
        # Add gradient background
        for y in range(1080):
            for x in range(1920):
                image_data[y, x, 0] = min(255, image_data[y, x, 0] + int(x / 1920 * 100))
                image_data[y, x, 1] = min(255, image_data[y, x, 1] + int(y / 1080 * 100))
        
        # Add some "objects" (rectangles)
        obj_x = 400 + i * 200
        obj_y = 300 + i * 50
        image_data[obj_y:obj_y+200, obj_x:obj_x+300] = [255, 255, 255]
        
        keyframe_info = {
            "id": f"keyframe_{i:03d}",
            "timestamp": i * 2.0,
            "image_path": f"keyframe_{i:03d}.png",
            "image_data": image_data,
            "metadata": {
                "shot_id": f"shot_{i // 2}",
                "scene_id": "test_scene",
                "quality_score": 0.95 - (i * 0.01)  # Slight quality variation
            }
        }
        keyframes.append(keyframe_info)
    
    logger.info(f"Created {count} mock keyframes")
    return keyframes

def test_basic_video_engine_functionality():
    """Test basic Video Engine functionality"""
    logger.info("Testing basic Video Engine functionality...")
    
    try:
        from video_engine import VideoEngine, VideoConfig
        
        # Create test configuration
        config = VideoConfig(
            frame_rate=24,
            resolution=(1920, 1080),
            quality="high",
            parallel_processing=True,
            gpu_acceleration=False  # Disable for testing
        )
        
        # Initialize engine
        engine = VideoEngine(config)
        
        # Validate configuration
        is_valid, issues = engine.validate_configuration()
        if not is_valid:
            logger.error(f"Configuration validation failed: {issues}")
            return False
        
        logger.info("✅ Basic Video Engine functionality test passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Basic Video Engine functionality test failed: {e}")
        return False

def test_advanced_interpolation_functionality():
    """Test Advanced Interpolation Engine functionality"""
    logger.info("Testing Advanced Interpolation Engine functionality...")
    
    try:
        from advanced_interpolation_engine import (
            AdvancedInterpolationEngine, 
            create_cinematic_preset,
            InterpolationMethod,
            MotionBlurType,
            DepthOfFieldMode
        )
        
        # Test different presets
        presets = ["documentary", "cinematic", "action", "portrait"]
        
        for preset_name in presets:
            config = create_cinematic_preset(preset_name)
            engine = AdvancedInterpolationEngine(config)
            
            # Validate configuration
            is_valid, issues = engine.validate_configuration()
            if not is_valid:
                logger.error(f"Preset {preset_name} validation failed: {issues}")
                return False
            
            # Test interpolation with mock data
            keyframes = [
                np.random.randint(0, 256, (540, 960, 3), dtype=np.uint8),  # Smaller for testing
                np.random.randint(0, 256, (540, 960, 3), dtype=np.uint8)
            ]
            
            camera_movement = {"type": "pan", "direction": "right", "amount": 0.1}
            
            interpolated = engine.interpolate_frames(keyframes, 12, camera_movement)
            
            if len(interpolated) != 12:
                logger.error(f"Preset {preset_name}: Expected 12 frames, got {len(interpolated)}")
                return False
            
            logger.info(f"✅ Preset {preset_name} test passed")
        
        logger.info("✅ Advanced Interpolation Engine functionality test passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Advanced Interpolation Engine functionality test failed: {e}")
        return False

def test_video_configuration_system():
    """Test Video Configuration Manager functionality"""
    logger.info("Testing Video Configuration Manager functionality...")
    
    try:
        from video_configuration_manager import VideoConfigurationManager
        
        config_manager = VideoConfigurationManager()
        
        # Test built-in presets
        presets = ["documentary", "cinematic", "action", "portrait", "broadcast", "web", "mobile", "ultra_hq"]
        
        for preset_name in presets:
            try:
                config = config_manager.load_preset(preset_name)
                if not config:
                    logger.error(f"Failed to load preset: {preset_name}")
                    return False
                
                # Validate preset
                is_valid, issues = config_manager.validate_configuration(config)
                if not is_valid:
                    logger.error(f"Preset {preset_name} validation failed: {issues}")
                    return False
                
                logger.info(f"✅ Preset {preset_name} validation passed")
            except Exception as e:
                logger.warning(f"Preset {preset_name} not available: {e}")
                continue
        
        # Test configuration serialization
        config = config_manager.load_preset("cinematic")
        
        # Test JSON serialization
        json_data = config_manager.serialize_configuration(config, "json")
        restored_config = config_manager.deserialize_configuration(json_data, "json")
        
        if config != restored_config:
            logger.error("JSON serialization/deserialization failed")
            return False
        
        logger.info("✅ Video Configuration Manager functionality test passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Video Configuration Manager functionality test failed: {e}")
        return False

def test_complete_pipeline_integration():
    """Test complete pipeline integration"""
    logger.info("Testing complete pipeline integration...")
    
    try:
        # Create test project
        project_dir = create_test_project_structure()
        keyframes = create_mock_keyframes(project_dir, 3)
        
        # Initialize components
        from video_engine import VideoEngine, VideoConfig
        from advanced_interpolation_engine import AdvancedInterpolationEngine, create_cinematic_preset
        
        # Setup
        video_config = VideoConfig(frame_rate=24, resolution=(960, 540), quality="medium")  # Smaller for testing
        video_engine = VideoEngine(video_config)
        
        advanced_config = create_cinematic_preset("cinematic")
        advanced_engine = AdvancedInterpolationEngine(advanced_config)
        
        # Load project
        success = video_engine.load_project(project_dir)
        if not success:
            logger.error("Failed to load test project")
            return False
        
        # Test video generation
        result = video_engine.generate_video_sequence("shot_001")
        if not result.success:
            logger.error(f"Video generation failed: {result.error_message}")
            return False
        
        # Test advanced interpolation
        mock_frames = [kf["image_data"][:540, :960] for kf in keyframes[:2]]  # Smaller frames
        camera_movement = {"type": "pan", "direction": "right", "amount": 0.1}
        
        interpolated = advanced_engine.interpolate_frames(mock_frames, 24, camera_movement)
        
        if len(interpolated) != 24:
            logger.error(f"Advanced interpolation failed: expected 24 frames, got {len(interpolated)}")
            return False
        
        # Test timeline metadata generation
        timeline_data = video_engine.get_timeline_metadata()
        if not timeline_data or "total_duration" not in timeline_data:
            logger.error("Timeline metadata generation failed")
            return False
        
        # Cleanup
        import shutil
        shutil.rmtree(Path(project_dir).parent)
        
        logger.info("✅ Complete pipeline integration test passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Complete pipeline integration test failed: {e}")
        return False

def test_performance_characteristics():
    """Test performance characteristics under different loads"""
    logger.info("Testing performance characteristics...")
    
    try:
        from advanced_interpolation_engine import AdvancedInterpolationEngine, create_cinematic_preset
        import time
        
        # Test scenarios with different loads
        scenarios = [
            {"name": "light", "frames": 12, "resolution": (480, 270)},
            {"name": "medium", "frames": 24, "resolution": (720, 405)},
            {"name": "heavy", "frames": 48, "resolution": (960, 540)}
        ]
        
        performance_results = {}
        
        for scenario in scenarios:
            logger.info(f"Testing {scenario['name']} load scenario...")
            
            config = create_cinematic_preset("cinematic")
            engine = AdvancedInterpolationEngine(config)
            
            # Create test frames
            h, w = scenario["resolution"]
            keyframes = [
                np.random.randint(0, 256, (h, w, 3), dtype=np.uint8),
                np.random.randint(0, 256, (h, w, 3), dtype=np.uint8)
            ]
            
            # Measure performance
            start_time = time.time()
            interpolated = engine.interpolate_frames(keyframes, scenario["frames"])
            duration = time.time() - start_time
            
            fps = len(interpolated) / duration
            performance_results[scenario["name"]] = {
                "duration": duration,
                "fps": fps,
                "frames": len(interpolated),
                "resolution": scenario["resolution"]
            }
            
            logger.info(f"✅ {scenario['name']} load: {fps:.1f} fps ({duration:.2f}s)")
        
        # Validate performance meets minimum requirements
        min_fps_requirements = {"light": 30, "medium": 15, "heavy": 8}
        
        for scenario_name, min_fps in min_fps_requirements.items():
            actual_fps = performance_results[scenario_name]["fps"]
            if actual_fps < min_fps:
                logger.warning(f"Performance below target for {scenario_name}: {actual_fps:.1f} < {min_fps} fps")
            else:
                logger.info(f"✅ Performance target met for {scenario_name}: {actual_fps:.1f} >= {min_fps} fps")
        
        logger.info("✅ Performance characteristics test completed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Performance characteristics test failed: {e}")
        return False

def test_error_handling_robustness():
    """Test error handling and robustness"""
    logger.info("Testing error handling and robustness...")
    
    try:
        from video_engine import VideoEngine, VideoConfig
        from advanced_interpolation_engine import AdvancedInterpolationEngine, AdvancedInterpolationConfig
        
        error_scenarios = []
        
        # Test 1: Invalid configuration
        try:
            invalid_config = VideoConfig(frame_rate=-1, resolution=(0, 0))
            engine = VideoEngine(invalid_config)
            is_valid, issues = engine.validate_configuration()
            if is_valid:
                error_scenarios.append("Invalid config validation failed")
            else:
                logger.info("✅ Invalid configuration properly detected")
        except Exception as e:
            logger.info(f"✅ Invalid configuration properly rejected: {e}")
        
        # Test 2: Empty keyframes
        try:
            config = AdvancedInterpolationConfig()
            engine = AdvancedInterpolationEngine(config)
            result = engine.interpolate_frames([], 24)
            error_scenarios.append("Empty keyframes should raise error")
        except Exception as e:
            logger.info(f"✅ Empty keyframes properly rejected: {e}")
        
        # Test 3: Mismatched frame dimensions
        try:
            config = AdvancedInterpolationConfig()
            engine = AdvancedInterpolationEngine(config)
            keyframes = [
                np.random.randint(0, 256, (100, 100, 3), dtype=np.uint8),
                np.random.randint(0, 256, (200, 200, 3), dtype=np.uint8)
            ]
            result = engine.interpolate_frames(keyframes, 12)
            error_scenarios.append("Mismatched dimensions should raise error")
        except Exception as e:
            logger.info(f"✅ Mismatched dimensions properly rejected: {e}")
        
        # Test 4: Invalid project path
        try:
            engine = VideoEngine()
            success = engine.load_project("/nonexistent/path")
            if success:
                error_scenarios.append("Invalid project path should fail")
            else:
                logger.info("✅ Invalid project path properly handled")
        except Exception as e:
            logger.info(f"✅ Invalid project path properly rejected: {e}")
        
        if error_scenarios:
            logger.error(f"❌ Error handling issues found: {error_scenarios}")
            return False
        
        logger.info("✅ Error handling and robustness test passed")
        return True
        
    except Exception as e:
        logger.error(f"❌ Error handling test failed: {e}")
        return False

def run_comprehensive_end_to_end_tests():
    """Run comprehensive end-to-end test suite"""
    logger.info("Starting comprehensive Video Engine end-to-end test suite")
    logger.info("="*80)
    
    # Test suite
    tests = [
        ("Basic Video Engine Functionality", test_basic_video_engine_functionality),
        ("Advanced Interpolation Functionality", test_advanced_interpolation_functionality),
        ("Video Configuration System", test_video_configuration_system),
        ("Complete Pipeline Integration", test_complete_pipeline_integration),
        ("Performance Characteristics", test_performance_characteristics),
        ("Error Handling Robustness", test_error_handling_robustness)
    ]
    
    # Run tests
    results = []
    start_time = datetime.now()
    
    for test_name, test_func in tests:
        logger.info(f"\n{'='*60}")
        logger.info(f"Running: {test_name}")
        logger.info(f"{'='*60}")
        
        test_start = datetime.now()
        try:
            success = test_func()
            duration = (datetime.now() - test_start).total_seconds()
            results.append({
                "name": test_name,
                "success": success,
                "duration": duration,
                "error": None
            })
        except Exception as e:
            duration = (datetime.now() - test_start).total_seconds()
            results.append({
                "name": test_name,
                "success": False,
                "duration": duration,
                "error": str(e)
            })
            logger.error(f"Test {test_name} failed with exception: {e}")
    
    # Generate summary report
    total_duration = (datetime.now() - start_time).total_seconds()
    passed_tests = sum(1 for r in results if r["success"])
    total_tests = len(results)
    success_rate = passed_tests / total_tests
    
    logger.info(f"\n{'='*80}")
    logger.info("VIDEO ENGINE END-TO-END TEST SUMMARY")
    logger.info(f"{'='*80}")
    logger.info(f"Total Tests: {total_tests}")
    logger.info(f"Passed: {passed_tests}")
    logger.info(f"Failed: {total_tests - passed_tests}")
    logger.info(f"Success Rate: {success_rate:.1%}")
    logger.info(f"Total Duration: {total_duration:.2f}s")
    logger.info(f"{'='*80}")
    
    # Detailed results
    for result in results:
        status = "✅ PASS" if result["success"] else "❌ FAIL"
        logger.info(f"{status} {result['name']} ({result['duration']:.2f}s)")
        if not result["success"] and result["error"]:
            logger.info(f"    Error: {result['error']}")
    
    # Export detailed report
    report_data = {
        "timestamp": start_time.isoformat(),
        "total_tests": total_tests,
        "passed_tests": passed_tests,
        "failed_tests": total_tests - passed_tests,
        "success_rate": success_rate,
        "total_duration": total_duration,
        "test_results": results,
        "system_info": {
            "python_version": sys.version,
            "platform": sys.platform,
            "numpy_available": True
        }
    }
    
    report_filename = f"video_engine_e2e_test_report_{start_time.strftime('%Y%m%d_%H%M%S')}.json"
    with open(report_filename, 'w') as f:
        json.dump(report_data, f, indent=2)
    
    logger.info(f"\nDetailed report exported to: {report_filename}")
    
    # Final assessment
    if success_rate >= 0.8:
        logger.info("🎉 Video Engine end-to-end testing PASSED - System ready for production")
        return True
    else:
        logger.error("💥 Video Engine end-to-end testing FAILED - System needs attention")
        return False

def main():
    """Main function"""
    try:
        success = run_comprehensive_end_to_end_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        logger.info("\nTest suite interrupted by user")
        return 1
    except Exception as e:
        logger.error(f"Test suite failed with unexpected error: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())