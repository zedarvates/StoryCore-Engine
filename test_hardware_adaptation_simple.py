#!/usr/bin/env python3
"""
Simple test for hardware adaptation functionality.
"""

import pytest
from src.cross_platform_compatibility import CrossPlatformManager, PlatformCapabilities, PlatformType, ProcessingMode


def test_hardware_adaptation_basic():
    """Test basic hardware adaptation functionality."""
    # Create a manager (will auto-detect current system)
    manager = CrossPlatformManager()
    
    # Test basic functionality
    assert manager.capabilities is not None
    assert manager.optimizations is not None
    
    # Test configuration generation
    optimal_config = manager.get_optimal_config()
    assert "platform" in optimal_config
    assert "processing" in optimal_config
    assert "hardware" in optimal_config
    
    # Test processing configuration
    processing_config = manager.get_processing_config()
    assert "mode" in processing_config
    assert "parallel_workers" in processing_config
    assert "memory_limit_gb" in processing_config
    
    # Test hardware adaptation
    test_config = {"batch_size": 16, "max_workers": 32}
    adapted_config = manager.adapt_for_hardware(test_config)
    
    # Should respect hardware limits
    assert adapted_config["batch_size"] >= 1
    assert adapted_config["max_workers"] >= 1
    assert adapted_config["max_workers"] <= manager.capabilities.cpu_cores
    
    # Test compatibility report
    report = manager.get_compatibility_report()
    assert "platform_info" in report
    assert "hardware_capabilities" in report
    assert "validation" in report
    
    print("+ Hardware adaptation basic functionality test passed")


def test_cross_platform_consistency():
    """Test cross-platform consistency."""
    # Test different platform configurations
    platforms = [PlatformType.WINDOWS, PlatformType.LINUX, PlatformType.MACOS]
    
    for platform in platforms:
        # Mock capabilities for consistent testing
        from unittest.mock import patch
        
        with patch.object(CrossPlatformManager, '_assess_capabilities') as mock_assess:
            capabilities = PlatformCapabilities(
                platform_type=platform,
                cpu_cores=4,
                memory_gb=8.0,
                gpu_available=True,
                gpu_type="nvidia" if platform != PlatformType.MACOS else "metal",
                gpu_memory_gb=6.0,
                supported_processing_modes=[ProcessingMode.GPU_CUDA, ProcessingMode.AUTO, ProcessingMode.CPU_ONLY],
                opencv_available=True,
                ffmpeg_available=True,
                python_version="3.9.0",
                architecture="x86_64"
            )
            
            mock_assess.return_value = capabilities
            
            manager = CrossPlatformManager()
            
            # Test consistent behavior across platforms
            test_config = {"batch_size": 8, "max_workers": 8}
            adapted_config = manager.adapt_for_hardware(test_config)
            
            # Should produce consistent results
            assert adapted_config["batch_size"] >= 1
            assert adapted_config["max_workers"] <= 4  # Should respect CPU cores
            
            # Should generate valid processing config
            processing_config = manager.get_processing_config()
            assert processing_config["mode"] in ["gpu_cuda", "gpu_metal", "auto", "cpu_only"]
    
    print("+ Cross-platform consistency test passed")


if __name__ == "__main__":
    test_hardware_adaptation_basic()
    test_cross_platform_consistency()
    print("*** All hardware adaptation tests passed!")