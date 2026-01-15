#!/usr/bin/env python3
"""
Video Engine Checkpoint Validation Test

This test validates that export and performance systems work together
correctly for Task 12 checkpoint validation.
"""

import sys
import os
import tempfile
import shutil
from pathlib import Path
import json
import time

# Add src to path
sys.path.insert(0, 'src')

from video_engine import VideoEngine, VideoConfig
from video_performance_monitor import VideoPerformanceMonitor, OptimizationStrategy
from video_error_handling import VideoErrorHandler, ErrorHandlingContext


def create_test_project():
    """Create a temporary test project structure."""
    temp_dir = Path(tempfile.mkdtemp(prefix="video_engine_test_"))
    
    # Create project structure
    project_dir = temp_dir / "test_project"
    project_dir.mkdir(parents=True)
    
    # Create project.json
    project_data = {
        "schema_version": "1.0",
        "project_name": "test_project",
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
    
    # Create assets directory structure
    assets_dir = project_dir / "assets"
    assets_dir.mkdir()
    
    images_dir = assets_dir / "images" / "generated"
    images_dir.mkdir(parents=True)
    
    video_dir = assets_dir / "video"
    video_dir.mkdir()
    
    return project_dir, temp_dir


def test_export_system_integration():
    """Test export system with complete frame sequences."""
    print("=== Testing Export System Integration ===")
    
    project_dir, temp_dir = create_test_project()
    
    try:
        # Initialize Video Engine
        config = VideoConfig(
            frame_rate=24,
            resolution=(1920, 1080),
            quality="high",
            parallel_processing=True
        )
        
        engine = VideoEngine(config)
        
        # Load project
        success = engine.load_project(str(project_dir))
        if not success:
            print("❌ Failed to load test project")
            return False
        
        print("✅ Project loaded successfully")
        
        # Generate video sequence
        result = engine.generate_video_sequence("shot_001")
        
        if not result.success:
            print(f"❌ Video generation failed: {result.error_message}")
            return False
        
        print(f"✅ Video sequence generated: {result.frame_count} frames")
        print(f"   Duration: {result.duration}s")
        print(f"   Processing time: {result.processing_time:.2f}s")
        print(f"   Quality score: {result.quality_metrics.get('overall_score', 0):.2f}")
        
        # Validate export directory structure
        export_path = Path(result.frame_sequence_path)
        if not export_path.exists():
            print(f"❌ Export directory not found: {export_path}")
            return False
        
        print(f"✅ Export directory created: {export_path}")
        
        # Test timeline metadata
        timeline = engine.get_timeline_metadata()
        if not timeline or timeline['total_frames'] == 0:
            print("❌ Timeline metadata generation failed")
            return False
        
        print(f"✅ Timeline metadata generated: {timeline['total_frames']} total frames")
        
        return True
        
    except Exception as e:
        print(f"❌ Export system test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        # Cleanup
        engine.cleanup_resources()
        shutil.rmtree(temp_dir, ignore_errors=True)


def test_performance_optimization_under_load():
    """Test performance optimization under load conditions."""
    print("\n=== Testing Performance Optimization Under Load ===")
    
    try:
        # Initialize performance monitor
        monitor = VideoPerformanceMonitor(OptimizationStrategy.BALANCED)
        monitor.start_monitoring()
        
        # Simulate multiple concurrent operations
        operations = []
        
        for i in range(5):
            operation_name = f"load_test_operation_{i}"
            frame_count = 100 + (i * 20)  # Varying load
            
            with monitor.monitor_operation(operation_name, frame_count) as operation_id:
                # Simulate frame processing with varying complexity
                for frame in range(frame_count):
                    # Simulate processing time based on complexity
                    processing_time = 0.001 + (i * 0.0005)  # Increasing complexity
                    time.sleep(processing_time)
                    
                    # Update progress every 10 frames
                    if frame % 10 == 0:
                        monitor.progress_tracker.update_progress(
                            operation_id, 
                            frame + 1,
                            {"complexity_level": i, "current_stage": "interpolation"}
                        )
                
                operations.append({
                    'operation_id': operation_id,
                    'operation_name': operation_name,
                    'frame_count': frame_count
                })
        
        # Get performance report
        report = monitor.get_performance_report()
        
        # Validate performance metrics
        stats = report['overall_statistics']
        
        if stats['total_operations'] != 5:
            print(f"❌ Expected 5 operations, got {stats['total_operations']}")
            return False
        
        if stats['success_rate'] != 100.0:
            print(f"❌ Expected 100% success rate, got {stats['success_rate']}%")
            return False
        
        if stats['average_fps'] <= 0:
            print(f"❌ Invalid average FPS: {stats['average_fps']}")
            return False
        
        print(f"✅ Performance under load validated:")
        print(f"   Operations completed: {stats['total_operations']}")
        print(f"   Success rate: {stats['success_rate']}%")
        print(f"   Average FPS: {stats['average_fps']:.2f}")
        print(f"   Total frames processed: {stats['total_frames_processed']}")
        
        # Test optimization settings
        for frame_count in [50, 200, 1000]:
            settings = monitor.optimize_processing_settings(frame_count, "high")
            
            if not settings or 'max_workers' not in settings:
                print(f"❌ Optimization settings invalid for {frame_count} frames")
                return False
            
            print(f"✅ Optimization settings for {frame_count} frames: {settings['max_workers']} workers")
        
        monitor.stop_monitoring()
        return True
        
    except Exception as e:
        print(f"❌ Performance optimization test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_error_handling_and_recovery():
    """Test error handling and recovery mechanisms."""
    print("\n=== Testing Error Handling and Recovery ===")
    
    try:
        error_handler = VideoErrorHandler()
        
        # Test different error scenarios
        test_scenarios = [
            {
                'name': 'Memory Error Recovery',
                'exception': MemoryError("Out of memory during frame processing"),
                'context': {'batch_size': 64, 'resolution': (3840, 2160)},
                'expected_recovery': True
            },
            {
                'name': 'Input Error Recovery',
                'exception': FileNotFoundError("Keyframe file not found"),
                'context': {'input_path': '/nonexistent/frame.png', 'frame_data': None},
                'expected_recovery': True
            },
            {
                'name': 'Hardware Error Recovery',
                'exception': RuntimeError("CUDA device error"),
                'context': {'use_gpu': True, 'max_workers': 16},
                'expected_recovery': True
            },
            {
                'name': 'Quality Error Recovery',
                'exception': ValueError("Quality threshold not met"),
                'context': {'quality_thresholds': {'sharpness': 0.95}, 'enable_quality_validation': True},
                'expected_recovery': True
            }
        ]
        
        recovery_count = 0
        
        for scenario in test_scenarios:
            print(f"   Testing: {scenario['name']}")
            
            # Test with context manager
            recovered = False
            try:
                with ErrorHandlingContext(
                    error_handler, 
                    scenario['name'].lower().replace(' ', '_'), 
                    scenario['context'].copy(),
                    raise_on_failure=False
                ) as ctx:
                    raise scenario['exception']
            except:
                # Error was not handled
                pass
            else:
                # Error was handled successfully
                recovered = True
            
            if recovered == scenario['expected_recovery']:
                print(f"   ✅ {scenario['name']}: Recovery {'successful' if recovered else 'skipped as expected'}")
                if recovered:
                    recovery_count += 1
            else:
                print(f"   ❌ {scenario['name']}: Expected recovery={scenario['expected_recovery']}, got={recovered}")
                return False
        
        # Validate error statistics
        stats = error_handler.get_error_statistics()
        
        if stats['total_errors'] != len(test_scenarios):
            print(f"❌ Expected {len(test_scenarios)} errors, got {stats['total_errors']}")
            return False
        
        expected_recovery_rate = (recovery_count / len(test_scenarios)) * 100
        actual_recovery_rate = stats['recovery_success_rate']
        
        if abs(actual_recovery_rate - expected_recovery_rate) > 1.0:
            print(f"❌ Recovery rate mismatch: expected {expected_recovery_rate}%, got {actual_recovery_rate}%")
            return False
        
        print(f"✅ Error handling validated:")
        print(f"   Total errors processed: {stats['total_errors']}")
        print(f"   Recovery success rate: {stats['recovery_success_rate']:.1f}%")
        print(f"   Errors by category: {stats['errors_by_category']}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error handling test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_full_integration():
    """Test complete integration of all systems."""
    print("\n=== Testing Full System Integration ===")
    
    project_dir, temp_dir = create_test_project()
    
    try:
        # Initialize all systems
        config = VideoConfig(
            frame_rate=24,
            resolution=(1920, 1080),
            quality="high"
        )
        
        engine = VideoEngine(config)
        error_handler = VideoErrorHandler()
        
        # Load project
        success = engine.load_project(str(project_dir))
        if not success:
            print("❌ Failed to load project for integration test")
            return False
        
        # Test video generation with error handling
        with ErrorHandlingContext(
            error_handler,
            "full_integration_test",
            {'operation': 'video_generation', 'shot_id': 'shot_001'},
            raise_on_failure=False
        ) as ctx:
            
            # Generate video sequence
            result = engine.generate_video_sequence("shot_001")
            
            if not result.success:
                print(f"❌ Integration test failed: {result.error_message}")
                return False
        
        # Validate all components worked together
        if result.success:
            print("✅ Full integration test passed:")
            print(f"   Video generation: {result.frame_count} frames")
            print(f"   Processing time: {result.processing_time:.2f}s")
            print(f"   Quality metrics: {len(result.quality_metrics)} metrics")
            print(f"   Timeline metadata: {len(result.timeline_metadata)} fields")
        
        # Test performance reporting
        perf_report = engine.get_performance_report()
        if 'overall_statistics' in perf_report:
            print(f"   Performance tracking: {perf_report['overall_statistics']['total_operations']} operations")
        
        # Test error statistics
        error_stats = error_handler.get_error_statistics()
        print(f"   Error handling: {error_stats['total_errors']} errors processed")
        
        return True
        
    except Exception as e:
        print(f"❌ Full integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
        
    finally:
        engine.cleanup_resources()
        shutil.rmtree(temp_dir, ignore_errors=True)


def main():
    """Run all checkpoint validation tests."""
    print("🔍 Video Engine Checkpoint Validation - Task 12")
    print("=" * 60)
    
    tests = [
        ("Export System Integration", test_export_system_integration),
        ("Performance Optimization Under Load", test_performance_optimization_under_load),
        ("Error Handling and Recovery", test_error_handling_and_recovery),
        ("Full System Integration", test_full_integration)
    ]
    
    passed_tests = 0
    total_tests = len(tests)
    
    for test_name, test_func in tests:
        print(f"\n🧪 Running: {test_name}")
        print("-" * 40)
        
        try:
            if test_func():
                passed_tests += 1
                print(f"✅ {test_name}: PASSED")
            else:
                print(f"❌ {test_name}: FAILED")
        except Exception as e:
            print(f"❌ {test_name}: ERROR - {e}")
    
    print("\n" + "=" * 60)
    print(f"📊 Checkpoint Validation Results:")
    print(f"   Tests passed: {passed_tests}/{total_tests}")
    print(f"   Success rate: {(passed_tests/total_tests)*100:.1f}%")
    
    if passed_tests == total_tests:
        print("🎉 All checkpoint validation tests PASSED!")
        print("✅ Export and performance systems are working correctly")
        return True
    else:
        print("⚠️  Some checkpoint validation tests FAILED")
        print("❌ System requires attention before proceeding")
        return False


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)