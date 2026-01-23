#!/usr/bin/env python3
"""
Test Cross-Platform Integration for Video Engine
Validates that the video engine properly integrates with cross-platform compatibility.
"""

import sys
from pathlib import Path

# Add src directory to path
src_path = Path(__file__).parent / "src"
sys.path.insert(0, str(src_path))

def test_cross_platform_integration():
    """Test that video engine integrates with cross-platform compatibility."""
    print("Testing Cross-Platform Integration")
    print("=" * 50)
    
    try:
        # Import video engine
        from video_engine import VideoEngine, VideoConfig
        
        # Create video engine instance
        config = VideoConfig(
            frame_rate=24,
            resolution=(1920, 1080),
            quality="medium",
            parallel_processing=True,
            gpu_acceleration=True
        )
        
        engine = VideoEngine(config)
        
        # Test platform info
        platform_info = engine.get_platform_info()
        print(f"Platform Type: {platform_info['platform_info']['type']}")
        print(f"Architecture: {platform_info['platform_info']['architecture']}")
        print(f"Python Version: {platform_info['platform_info']['python_version']}")
        
        # Test compatibility validation
        is_compatible, issues = engine.validate_platform_compatibility()
        print(f"\nCompatibility: {'✓ Compatible' if is_compatible else '✗ Issues Found'}")
        if issues:
            print("Issues:")
            for issue in issues:
                print(f"  - {issue}")
        
        # Test optimized processing config
        processing_config = engine.get_optimized_processing_config()
        print(f"\nOptimized Processing Configuration:")
        print(f"  Parallel Processing: {processing_config['parallel_processing']}")
        print(f"  GPU Acceleration: {processing_config['gpu_acceleration']}")
        print(f"  Max Workers: {processing_config['max_workers']}")
        print(f"  Batch Size: {processing_config['batch_size']}")
        
        # Test configuration adaptation
        print(f"\nAdapted Video Configuration:")
        print(f"  Frame Rate: {engine.config.frame_rate}")
        print(f"  Resolution: {engine.config.resolution}")
        print(f"  Quality: {engine.config.quality}")
        print(f"  Parallel Processing: {engine.config.parallel_processing}")
        print(f"  GPU Acceleration: {engine.config.gpu_acceleration}")
        print(f"  Depth Awareness: {engine.config.enable_depth_awareness}")
        
        print(f"\n✓ Cross-platform integration test completed successfully")
        return True
        
    except Exception as e:
        print(f"✗ Cross-platform integration test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_cross_platform_manager_directly():
    """Test the cross-platform manager directly."""
    print("\nTesting Cross-Platform Manager Directly")
    print("=" * 50)
    
    try:
        from cross_platform_compatibility import CrossPlatformManager
        
        # Create manager
        manager = CrossPlatformManager()
        
        # Get compatibility report
        report = manager.get_compatibility_report()
        
        print(f"Platform: {report['platform_info']['type']} ({report['platform_info']['architecture']})")
        print(f"CPU Cores: {report['hardware_capabilities']['cpu_cores']}")
        print(f"Memory: {report['hardware_capabilities']['memory_gb']:.1f} GB")
        print(f"GPU Available: {report['hardware_capabilities']['gpu_available']}")
        
        if report['hardware_capabilities']['gpu_type']:
            print(f"GPU Type: {report['hardware_capabilities']['gpu_type']}")
            if report['hardware_capabilities']['gpu_memory_gb']:
                print(f"GPU Memory: {report['hardware_capabilities']['gpu_memory_gb']:.1f} GB")
        
        print(f"\nSoftware Dependencies:")
        print(f"  OpenCV: {'✓' if report['software_dependencies']['opencv_available'] else '✗'}")
        print(f"  FFmpeg: {'✓' if report['software_dependencies']['ffmpeg_available'] else '✗'}")
        
        print(f"\nSupported Processing Modes:")
        for mode in report['supported_processing_modes']:
            print(f"  - {mode}")
        
        print(f"\nRecommended Configuration:")
        print(f"  Processing Mode: {report['optimizations']['preferred_mode']}")
        print(f"  Max Workers: {report['optimizations']['max_workers']}")
        print(f"  Memory Limit: {report['optimizations']['memory_limit_gb']:.1f} GB")
        
        # Test hardware adaptation
        base_config = {
            "parallel_processing": True,
            "gpu_acceleration": True,
            "max_workers": 8,
            "batch_size": 4
        }
        
        adapted_config = manager.adapt_for_hardware(base_config)
        print(f"\nHardware Adaptation Test:")
        print(f"  Original max_workers: {base_config['max_workers']}")
        print(f"  Adapted max_workers: {adapted_config['max_workers']}")
        print(f"  Original batch_size: {base_config['batch_size']}")
        print(f"  Adapted batch_size: {adapted_config['batch_size']}")
        
        print(f"\n✓ Cross-platform manager test completed successfully")
        return True
        
    except Exception as e:
        print(f"✗ Cross-platform manager test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success1 = test_cross_platform_integration()
    success2 = test_cross_platform_manager_directly()
    
    if success1 and success2:
        print(f"\n🎉 All cross-platform tests passed!")
        sys.exit(0)
    else:
        print(f"\n❌ Some cross-platform tests failed!")
        sys.exit(1)