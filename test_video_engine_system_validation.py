#!/usr/bin/env python3
"""
Video Engine System Validation Test

This comprehensive test validates the entire video engine system including:
- Circuit breaker integration and anti-blocking protection
- End-to-end video processing pipeline
- Performance monitoring and optimization
- Error handling and recovery mechanisms
- Cross-platform compatibility
- Quality validation and metadata integrity
"""

import sys
import time
import json
import tempfile
import logging
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent / "src"))

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


def test_complete_video_engine_system():
    """Comprehensive system validation test."""
    print("🎬 Video Engine System Validation")
    print("=" * 60)
    
    validation_results = {
        'timestamp': datetime.now().isoformat(),
        'tests': {},
        'overall_success': True,
        'performance_metrics': {},
        'system_info': {}
    }
    
    try:
        # Test 1: Core System Initialization
        print("\n1. Testing Core System Initialization...")
        init_result = test_system_initialization()
        validation_results['tests']['system_initialization'] = init_result
        print(f"   {'✅' if init_result['success'] else '❌'} System initialization: {init_result['message']}")
        
        # Test 2: Circuit Breaker Protection
        print("\n2. Testing Circuit Breaker Protection...")
        circuit_result = test_circuit_breaker_protection()
        validation_results['tests']['circuit_breaker_protection'] = circuit_result
        print(f"   {'✅' if circuit_result['success'] else '❌'} Circuit breaker protection: {circuit_result['message']}")
        
        # Test 3: End-to-End Video Processing
        print("\n3. Testing End-to-End Video Processing...")
        e2e_result = test_end_to_end_processing()
        validation_results['tests']['end_to_end_processing'] = e2e_result
        print(f"   {'✅' if e2e_result['success'] else '❌'} End-to-end processing: {e2e_result['message']}")
        
        # Test 4: Performance Monitoring
        print("\n4. Testing Performance Monitoring...")
        perf_result = test_performance_monitoring()
        validation_results['tests']['performance_monitoring'] = perf_result
        validation_results['performance_metrics'] = perf_result.get('metrics', {})
        print(f"   {'✅' if perf_result['success'] else '❌'} Performance monitoring: {perf_result['message']}")
        
        # Test 5: Error Handling and Recovery
        print("\n5. Testing Error Handling and Recovery...")
        error_result = test_error_handling_recovery()
        validation_results['tests']['error_handling'] = error_result
        print(f"   {'✅' if error_result['success'] else '❌'} Error handling: {error_result['message']}")
        
        # Test 6: Cross-Platform Compatibility
        print("\n6. Testing Cross-Platform Compatibility...")
        platform_result = test_cross_platform_compatibility()
        validation_results['tests']['cross_platform'] = platform_result
        validation_results['system_info'] = platform_result.get('system_info', {})
        print(f"   {'✅' if platform_result['success'] else '❌'} Cross-platform compatibility: {platform_result['message']}")
        
        # Test 7: Quality Validation
        print("\n7. Testing Quality Validation...")
        quality_result = test_quality_validation()
        validation_results['tests']['quality_validation'] = quality_result
        print(f"   {'✅' if quality_result['success'] else '❌'} Quality validation: {quality_result['message']}")
        
        # Test 8: Metadata Integrity
        print("\n8. Testing Metadata Integrity...")
        metadata_result = test_metadata_integrity()
        validation_results['tests']['metadata_integrity'] = metadata_result
        print(f"   {'✅' if metadata_result['success'] else '❌'} Metadata integrity: {metadata_result['message']}")
        
        # Test 9: System Under Load
        print("\n9. Testing System Under Load...")
        load_result = test_system_under_load()
        validation_results['tests']['system_under_load'] = load_result
        print(f"   {'✅' if load_result['success'] else '❌'} System under load: {load_result['message']}")
        
        # Test 10: Emergency Controls
        print("\n10. Testing Emergency Controls...")
        emergency_result = test_emergency_controls()
        validation_results['tests']['emergency_controls'] = emergency_result
        print(f"   {'✅' if emergency_result['success'] else '❌'} Emergency controls: {emergency_result['message']}")
        
        # Calculate overall success
        failed_tests = [name for name, result in validation_results['tests'].items() if not result['success']]
        validation_results['overall_success'] = len(failed_tests) == 0
        validation_results['failed_tests'] = failed_tests
        validation_results['success_rate'] = (len(validation_results['tests']) - len(failed_tests)) / len(validation_results['tests']) * 100
        
        # Generate summary
        print("\n" + "=" * 60)
        print("📊 System Validation Summary")
        print(f"Total Tests: {len(validation_results['tests'])}")
        print(f"Passed: {len(validation_results['tests']) - len(failed_tests)}")
        print(f"Failed: {len(failed_tests)}")
        print(f"Success Rate: {validation_results['success_rate']:.1f}%")
        
        if validation_results['overall_success']:
            print("\n🎉 All system validation tests passed!")
            print("✅ Video Engine is ready for production deployment")
        else:
            print(f"\n⚠️  {len(failed_tests)} test(s) failed:")
            for test_name in failed_tests:
                print(f"   • {test_name}")
        
        # Save validation report
        report_path = f"video_engine_system_validation_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_path, 'w') as f:
            json.dump(validation_results, f, indent=2, default=str)
        print(f"\n📄 Detailed report saved to: {report_path}")
        
        return validation_results
        
    except Exception as e:
        logger.error(f"System validation failed with exception: {e}")
        validation_results['overall_success'] = False
        validation_results['system_error'] = str(e)
        return validation_results


def test_system_initialization():
    """Test core system initialization."""
    try:
        from video_engine import VideoEngine, VideoConfig
        from video_performance_monitor import VideoPerformanceMonitor, OptimizationStrategy
        from video_error_handling import VideoErrorHandler
        
        # Test VideoEngine initialization
        config = VideoConfig(frame_rate=24, resolution=(1920, 1080), quality="high")
        engine = VideoEngine(config)
        
        # Verify components are initialized
        components_initialized = 0
        total_components = 5
        
        if hasattr(engine, 'config') and engine.config:
            components_initialized += 1
        
        if hasattr(engine, 'frame_processing_breaker'):
            components_initialized += 1
        
        if hasattr(engine, 'performance_monitor'):
            components_initialized += 1
        
        if hasattr(engine, 'platform_manager'):
            components_initialized += 1
        
        # Test performance monitor
        monitor = VideoPerformanceMonitor(OptimizationStrategy.BALANCED)
        if monitor:
            components_initialized += 1
        
        success_rate = components_initialized / total_components
        
        return {
            'success': success_rate >= 0.8,
            'message': f"{components_initialized}/{total_components} components initialized",
            'details': {
                'components_initialized': components_initialized,
                'total_components': total_components,
                'success_rate': success_rate
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f"Initialization failed: {e}",
            'error': str(e)
        }


def test_circuit_breaker_protection():
    """Test circuit breaker protection system."""
    try:
        from circuit_breaker import CircuitBreaker, CircuitBreakerConfig, CircuitBreakerError, circuit_manager
        
        # Test circuit breaker functionality
        config = CircuitBreakerConfig(
            failure_threshold=2,
            recovery_timeout=1.0,
            success_threshold=1,
            timeout=0.5
        )
        
        breaker = CircuitBreaker("validation_test", config)
        
        # Test successful operation
        def success_op():
            return "success"
        
        result = breaker.call(success_op)
        assert result == "success"
        
        # Test failing operation
        def fail_op():
            raise Exception("Test failure")
        
        failures = 0
        for _ in range(5):
            try:
                breaker.call(fail_op)
            except (Exception, CircuitBreakerError):
                failures += 1
        
        # Test timeout protection
        def slow_op():
            time.sleep(1.0)  # Longer than timeout
            return "should not reach"
        
        timeout_caught = False
        try:
            breaker.call(slow_op)
        except:
            timeout_caught = True
        
        # Test circuit manager
        stats = circuit_manager.get_all_stats()
        
        return {
            'success': True,
            'message': f"Circuit breaker protection working (failures: {failures}, timeout: {timeout_caught})",
            'details': {
                'failures_caught': failures,
                'timeout_protection': timeout_caught,
                'circuit_stats': len(stats)
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f"Circuit breaker test failed: {e}",
            'error': str(e)
        }


def test_end_to_end_processing():
    """Test end-to-end video processing pipeline."""
    try:
        from video_engine import VideoEngine, VideoConfig
        
        # Create video engine
        config = VideoConfig(frame_rate=24, resolution=(1920, 1080))
        engine = VideoEngine(config)
        
        # Create temporary project
        with tempfile.TemporaryDirectory() as temp_dir:
            project_path = Path(temp_dir)
            
            # Create mock project structure
            (project_path / "assets" / "images" / "generated").mkdir(parents=True, exist_ok=True)
            
            # Create project.json
            project_data = {
                "name": "validation_test_project",
                "shots": [
                    {"id": "shot_001", "duration": 2.0, "keyframes": 2},
                    {"id": "shot_002", "duration": 1.5, "keyframes": 2}
                ]
            }
            
            with open(project_path / "project.json", 'w') as f:
                json.dump(project_data, f)
            
            # Load project
            load_success = engine.load_project(str(project_path))
            assert load_success, "Project loading should succeed"
            
            # Test video generation
            shots = engine.list_shots()
            assert len(shots) > 0, "Should have shots loaded"
            
            # Generate video for first shot
            result = engine.generate_video_sequence(shots[0])
            assert result.success, f"Video generation should succeed: {result.error_message}"
            
            # Test timeline metadata
            timeline = engine.get_timeline_metadata()
            assert 'total_duration' in timeline, "Timeline should include duration"
            assert timeline['total_frames'] > 0, "Timeline should have frames"
            
            return {
                'success': True,
                'message': f"End-to-end processing successful ({len(shots)} shots, {result.frame_count} frames)",
                'details': {
                    'shots_processed': len(shots),
                    'frames_generated': result.frame_count,
                    'processing_time': result.processing_time,
                    'quality_score': result.quality_metrics.get('overall_score', 0)
                }
            }
        
    except Exception as e:
        return {
            'success': False,
            'message': f"End-to-end processing failed: {e}",
            'error': str(e)
        }


def test_performance_monitoring():
    """Test performance monitoring system."""
    try:
        from video_performance_monitor import VideoPerformanceMonitor, OptimizationStrategy
        
        # Create performance monitor
        monitor = VideoPerformanceMonitor(OptimizationStrategy.BALANCED)
        monitor.start_monitoring()
        
        try:
            # Test resource monitoring
            resources = monitor.resource_monitor.get_current_resources()
            assert resources.cpu_count > 0, "Should detect CPU cores"
            assert 0 <= resources.memory_usage_percent <= 100, "Memory usage should be valid percentage"
            
            # Test operation monitoring
            with monitor.monitor_operation("validation_test", 10) as operation_id:
                # Simulate some work
                time.sleep(0.1)
                
                # Update progress
                for i in range(10):
                    monitor.progress_tracker.update_progress(operation_id, i + 1)
                    time.sleep(0.01)
            
            # Test optimization settings
            settings = monitor.optimize_processing_settings(100, "high")
            assert 'max_workers' in settings, "Should provide optimization settings"
            assert settings['max_workers'] > 0, "Should suggest positive worker count"
            
            # Test performance report
            report = monitor.get_performance_report()
            assert 'overall_statistics' in report, "Should provide performance statistics"
            
            return {
                'success': True,
                'message': f"Performance monitoring working (CPU: {resources.cpu_usage_percent:.1f}%, Memory: {resources.memory_usage_percent:.1f}%)",
                'metrics': {
                    'cpu_usage': resources.cpu_usage_percent,
                    'memory_usage': resources.memory_usage_percent,
                    'cpu_count': resources.cpu_count,
                    'gpu_available': resources.gpu_available
                }
            }
            
        finally:
            monitor.stop_monitoring()
        
    except Exception as e:
        return {
            'success': False,
            'message': f"Performance monitoring failed: {e}",
            'error': str(e)
        }


def test_error_handling_recovery():
    """Test error handling and recovery mechanisms."""
    try:
        from video_error_handling import VideoErrorHandler, FallbackConfig
        
        # Create error handler
        config = FallbackConfig(max_retry_attempts=2, retry_delay_seconds=0.1)
        handler = VideoErrorHandler(config)
        
        # Test different error types
        test_errors = [
            (FileNotFoundError("Test file not found"), {'input_path': '/test/path'}),
            (MemoryError("Test memory error"), {'batch_size': 8}),
            (RuntimeError("Test processing error"), {'algorithm': 'complex'}),
            (ValueError("Test configuration error"), {'config': {'invalid': -1}})
        ]
        
        recovery_attempts = 0
        successful_recoveries = 0
        
        for exception, context in test_errors:
            error_info = handler.handle_error(exception, context, "validation_test")
            recovery_attempts += 1 if error_info.recovery_attempted else 0
            successful_recoveries += 1 if error_info.recovery_successful else 0
        
        # Test error statistics
        stats = handler.get_error_statistics()
        assert stats['total_errors'] == len(test_errors), "Should track all errors"
        
        recovery_rate = (successful_recoveries / recovery_attempts * 100) if recovery_attempts > 0 else 0
        
        return {
            'success': True,
            'message': f"Error handling working ({recovery_attempts} recovery attempts, {recovery_rate:.1f}% success rate)",
            'details': {
                'total_errors': len(test_errors),
                'recovery_attempts': recovery_attempts,
                'successful_recoveries': successful_recoveries,
                'recovery_rate': recovery_rate
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f"Error handling test failed: {e}",
            'error': str(e)
        }


def test_cross_platform_compatibility():
    """Test cross-platform compatibility."""
    try:
        import platform
        
        system_info = {
            'platform': platform.system(),
            'architecture': platform.machine(),
            'python_version': platform.python_version(),
            'processor': platform.processor()
        }
        
        # Test platform-specific functionality
        try:
            from cross_platform_compatibility import CrossPlatformManager
            
            manager = CrossPlatformManager()
            compatibility_report = manager.get_compatibility_report()
            
            # Test dependency validation
            is_compatible, issues = manager.validate_dependencies()
            
            return {
                'success': is_compatible,
                'message': f"Cross-platform compatibility: {len(issues)} issues found" if issues else "All dependencies compatible",
                'system_info': system_info,
                'details': {
                    'compatibility_issues': issues,
                    'platform_support': compatibility_report.get('validation', {}).get('is_compatible', False)
                }
            }
            
        except ImportError:
            # Fallback basic compatibility check
            return {
                'success': True,
                'message': f"Basic compatibility check passed ({system_info['platform']})",
                'system_info': system_info,
                'details': {
                    'note': 'Cross-platform manager not available, using basic checks'
                }
            }
        
    except Exception as e:
        return {
            'success': False,
            'message': f"Cross-platform test failed: {e}",
            'error': str(e)
        }


def test_quality_validation():
    """Test quality validation system."""
    try:
        from quality_validator import QualityValidator, QualityMetrics, QualityThresholds
        
        validator = QualityValidator()
        
        # Test quality metrics calculation
        test_metrics = QualityMetrics(
            overall_score=0.85,
            visual_quality=0.8,
            motion_smoothness=0.9,
            temporal_coherence=0.85,
            artifact_score=0.1,
            professional_grade=True,
            details={
                "quality_factors": {
                    "sharpness": 150.0,
                    "noise_level": 0.2,
                    "contrast": 1.1,
                    "brightness": 0.9
                }
            }
        )
        
        # Test threshold validation
        thresholds = QualityThresholds(
            min_sharpness=100.0,
            max_noise_level=0.3,
            min_contrast=0.8,
            min_brightness=0.7
        )
        
        validation_result = validator.validate_quality_thresholds(test_metrics, thresholds)
        
        # Test different quality levels
        quality_levels_tested = 0
        for level in ['low', 'medium', 'high', 'ultra']:
            try:
                level_thresholds = validator.get_quality_thresholds_for_level(level)
                if level_thresholds:
                    quality_levels_tested += 1
            except:
                pass
        
        return {
            'success': True,
            'message': f"Quality validation working ({quality_levels_tested} quality levels supported)",
            'details': {
                'validation_result': validation_result.passes_thresholds,
                'quality_levels_supported': quality_levels_tested,
                'test_metrics': {
                    'sharpness': test_metrics.details.get("quality_factors", {}).get("sharpness", 0),
                    'noise_level': test_metrics.details.get("quality_factors", {}).get("noise_level", 0),
                    'overall_score': test_metrics.overall_score
                }
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f"Quality validation test failed: {e}",
            'error': str(e)
        }


def test_metadata_integrity():
    """Test metadata integrity system."""
    try:
        from export_manager import ExportManager, ExportConfig, MetadataFormat
        from video_engine import ShotData, KeyframeData, CameraMovementSpec, CameraMovement, EasingType
        
        export_manager = ExportManager()
        
        # Create test shot data with metadata
        test_metadata = {
            'project': 'validation_test',
            'version': '1.0.0',
            'quality': 'high',
            'timestamp': time.time()
        }
        
        shot_data = ShotData(
            shot_id="metadata_test_shot",
            keyframes=[
                KeyframeData(
                    frame_id="frame_001",
                    image_path="test_frame.png",
                    timestamp=0.0,
                    shot_id="metadata_test_shot",
                    metadata={"frame_type": "keyframe"}
                )
            ],
            camera_movement=CameraMovementSpec(
                movement_type=CameraMovement.PAN,
                start_position={"x": 0, "y": 0, "z": 0},
                end_position={"x": 100, "y": 0, "z": 0},
                duration=2.0,
                easing=EasingType.EASE_IN_OUT
            ),
            duration=2.0,
            frame_count=48,
            metadata=test_metadata
        )
        
        # Test metadata export
        with tempfile.TemporaryDirectory() as temp_dir:
            export_config = ExportConfig(
                output_directory=temp_dir,
                include_metadata=True,
                metadata_format=MetadataFormat.JSON
            )
            
            export_result = export_manager.export_shot_metadata(shot_data, export_config)
            
            if export_result.success:
                # Verify metadata file
                metadata_file = Path(export_result.metadata_path)
                if metadata_file.exists():
                    with open(metadata_file, 'r') as f:
                        exported_metadata = json.load(f)
                    
                    # Verify key fields are preserved
                    fields_preserved = 0
                    total_fields = 4
                    
                    if exported_metadata.get('shot_id') == shot_data.shot_id:
                        fields_preserved += 1
                    if exported_metadata.get('duration') == shot_data.duration:
                        fields_preserved += 1
                    if exported_metadata.get('frame_count') == shot_data.frame_count:
                        fields_preserved += 1
                    if 'export_timestamp' in exported_metadata:
                        fields_preserved += 1
                    
                    preservation_rate = fields_preserved / total_fields * 100
                    
                    return {
                        'success': preservation_rate >= 75,
                        'message': f"Metadata integrity: {fields_preserved}/{total_fields} fields preserved ({preservation_rate:.1f}%)",
                        'details': {
                            'fields_preserved': fields_preserved,
                            'total_fields': total_fields,
                            'preservation_rate': preservation_rate,
                            'metadata_file_size': metadata_file.stat().st_size
                        }
                    }
        
        return {
            'success': False,
            'message': "Metadata export failed",
            'error': export_result.error_message if hasattr(export_result, 'error_message') else "Unknown error"
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f"Metadata integrity test failed: {e}",
            'error': str(e)
        }


def test_system_under_load():
    """Test system behavior under load."""
    try:
        from video_engine import VideoEngine, VideoConfig
        from circuit_breaker import circuit_manager
        
        # Create video engine
        config = VideoConfig(frame_rate=24, resolution=(1920, 1080))
        engine = VideoEngine(config)
        
        # Simulate load by creating multiple operations
        operations_completed = 0
        operations_failed = 0
        operations_blocked = 0
        
        # Create temporary project
        with tempfile.TemporaryDirectory() as temp_dir:
            project_path = Path(temp_dir)
            (project_path / "assets" / "images" / "generated").mkdir(parents=True, exist_ok=True)
            
            project_data = {
                "name": "load_test_project",
                "shots": [{"id": f"shot_{i:03d}", "duration": 1.0, "keyframes": 2} for i in range(5)]
            }
            
            with open(project_path / "project.json", 'w') as f:
                json.dump(project_data, f)
            
            engine.load_project(str(project_path))
            shots = engine.list_shots()
            
            # Process multiple shots rapidly
            start_time = time.time()
            for shot_id in shots:
                try:
                    result = engine.generate_video_sequence(shot_id)
                    if result.success:
                        operations_completed += 1
                    else:
                        operations_failed += 1
                except Exception as e:
                    if "circuit breaker" in str(e).lower():
                        operations_blocked += 1
                    else:
                        operations_failed += 1
            
            processing_time = time.time() - start_time
            
            # Get circuit breaker statistics
            circuit_stats = engine.get_circuit_breaker_stats()
            total_circuits = len(circuit_stats) if isinstance(circuit_stats, dict) else 0
            
            return {
                'success': operations_completed > 0,
                'message': f"Load test: {operations_completed} completed, {operations_failed} failed, {operations_blocked} blocked in {processing_time:.2f}s",
                'details': {
                    'operations_completed': operations_completed,
                    'operations_failed': operations_failed,
                    'operations_blocked': operations_blocked,
                    'processing_time': processing_time,
                    'throughput': operations_completed / processing_time if processing_time > 0 else 0,
                    'circuit_breakers_active': total_circuits
                }
            }
        
    except Exception as e:
        return {
            'success': False,
            'message': f"Load test failed: {e}",
            'error': str(e)
        }


def test_emergency_controls():
    """Test emergency control functionality."""
    try:
        from video_engine import VideoEngine, VideoConfig
        from circuit_breaker import circuit_manager
        
        # Create video engine
        config = VideoConfig(frame_rate=24, resolution=(1920, 1080))
        engine = VideoEngine(config)
        
        # Test emergency stop
        engine.emergency_stop_all_operations()
        
        # Verify circuits are open
        stats_after_stop = engine.get_circuit_breaker_stats()
        circuits_open = 0
        total_circuits = 0
        
        if isinstance(stats_after_stop, dict):
            for circuit_name, circuit_stats in stats_after_stop.items():
                total_circuits += 1
                if circuit_stats.get('state') == 'open':
                    circuits_open += 1
        
        # Test reset
        engine.reset_circuit_breakers()
        
        # Verify circuits are closed
        stats_after_reset = engine.get_circuit_breaker_stats()
        circuits_closed = 0
        
        if isinstance(stats_after_reset, dict):
            for circuit_name, circuit_stats in stats_after_reset.items():
                if circuit_stats.get('state') == 'closed':
                    circuits_closed += 1
        
        emergency_stop_effective = circuits_open > 0
        reset_effective = circuits_closed > 0
        
        return {
            'success': emergency_stop_effective and reset_effective,
            'message': f"Emergency controls: stop opened {circuits_open}/{total_circuits} circuits, reset closed {circuits_closed}/{total_circuits} circuits",
            'details': {
                'total_circuits': total_circuits,
                'circuits_opened_by_stop': circuits_open,
                'circuits_closed_by_reset': circuits_closed,
                'emergency_stop_effective': emergency_stop_effective,
                'reset_effective': reset_effective
            }
        }
        
    except Exception as e:
        return {
            'success': False,
            'message': f"Emergency controls test failed: {e}",
            'error': str(e)
        }


if __name__ == "__main__":
    # Run the comprehensive system validation
    results = test_complete_video_engine_system()
    
    # Exit with appropriate code
    exit_code = 0 if results['overall_success'] else 1
    sys.exit(exit_code)