#!/usr/bin/env python3
"""
Property tests for Video Engine hardware adaptation (Property VE-27).

Tests Requirements:
- VE-9.1: GPU acceleration support where available
- VE-9.2: CPU fallback for systems without GPU support

These property tests validate that the Video Engine correctly adapts
to different hardware configurations and provides optimal performance
across various system capabilities.
"""

import pytest
from hypothesis import given, strategies as st, settings, assume
from unittest.mock import Mock, patch, MagicMock
import tempfile
import os
from pathlib import Path
from typing import Dict, Any, List, Optional

# Import Video Engine components
from src.cross_platform_compatibility import (
    CrossPlatformManager, PlatformCapabilities, PlatformType, 
    ProcessingMode, PlatformOptimization
)
from src.video_engine import VideoEngine
from src.video_config import VideoEngineConfig


class TestHardwareAdaptationProperties:
    """Property tests for hardware adaptation functionality."""
    
    @given(
        cpu_cores=st.integers(min_value=1, max_value=32),
        memory_gb=st.floats(min_value=1.0, max_value=128.0),
        gpu_available=st.booleans(),
        gpu_memory_gb=st.one_of(st.none(), st.floats(min_value=1.0, max_value=24.0))
    )
    @settings(max_examples=15, deadline=5000)
    def test_property_ve27_gpu_acceleration_adaptation(self, cpu_cores, memory_gb, gpu_available, gpu_memory_gb):
        """
        Property VE-27: Hardware Adaptation - GPU Acceleration Support
        
        The system must correctly detect and utilize GPU acceleration
        when available, with appropriate fallback to CPU processing.
        
        Validates Requirements:
        - VE-9.1: GPU acceleration support where available
        - VE-9.2: CPU fallback for systems without GPU support
        """
        # Ensure GPU memory is only set when GPU is available
        if not gpu_available:
            gpu_memory_gb = None
        
        with patch.object(CrossPlatformManager, '_assess_capabilities') as mock_assess:
            capabilities = PlatformCapabilities(
                platform_type=PlatformType.LINUX,
                cpu_cores=cpu_cores,
                memory_gb=memory_gb,
                gpu_available=gpu_available,
                gpu_type="nvidia" if gpu_available else None,
                gpu_memory_gb=gpu_memory_gb,
                supported_processing_modes=[
                    ProcessingMode.GPU_CUDA if gpu_available else ProcessingMode.CPU_ONLY,
                    ProcessingMode.AUTO,
                    ProcessingMode.CPU_ONLY
                ],
                opencv_available=True,
                ffmpeg_available=True,
                python_version="3.9.0",
                architecture="x86_64"
            )
            
            mock_assess.return_value = capabilities
            
            manager = CrossPlatformManager()
            
            # Test GPU acceleration detection
            if gpu_available:
                # GPU should be detected and utilized
                assert ProcessingMode.GPU_CUDA in capabilities.supported_processing_modes
                
                # Optimal config should prefer GPU when available
                optimal_config = manager.get_optimal_config()
                assert optimal_config["processing"]["mode"] in [ProcessingMode.GPU_CUDA.value, ProcessingMode.AUTO.value]
                
                # GPU memory should be considered in configuration
                if gpu_memory_gb and gpu_memory_gb >= 4.0 and memory_gb >= 4.0 and cpu_cores > 2:
                    # High-memory GPU with sufficient system resources should allow larger batch sizes
                    test_config = {"batch_size": 8}
                    adapted = manager.adapt_for_hardware(test_config)
                    assert adapted["batch_size"] >= 2
                elif gpu_memory_gb and gpu_memory_gb < 4.0:
                    # Low-memory GPU should use smaller batch sizes
                    test_config = {"batch_size": 8}
                    adapted = manager.adapt_for_hardware(test_config)
                    assert adapted["batch_size"] <= 2
            else:
                # CPU-only fallback should be configured
                assert ProcessingMode.GPU_CUDA not in capabilities.supported_processing_modes
                assert ProcessingMode.CPU_ONLY in capabilities.supported_processing_modes
                
                # Optimal config should use CPU processing
                optimal_config = manager.get_optimal_config()
                assert optimal_config["processing"]["mode"] in [ProcessingMode.CPU_ONLY.value, ProcessingMode.AUTO.value]
    
    @given(
        cpu_cores=st.integers(min_value=1, max_value=16),
        memory_gb=st.floats(min_value=2.0, max_value=64.0),
        workload_complexity=st.sampled_from(["light", "medium", "heavy"])
    )
    @settings(max_examples=12, deadline=5000)
    def test_property_ve27_cpu_performance_scaling(self, cpu_cores, memory_gb, workload_complexity):
        """
        Property VE-27: Hardware Adaptation - CPU Performance Scaling
        
        The system must scale CPU utilization appropriately based on
        available cores and workload complexity.
        
        Validates Requirements:
        - VE-9.1: Optimal resource utilization
        - VE-9.2: Performance scaling with hardware capabilities
        """
        with patch.object(CrossPlatformManager, '_assess_capabilities') as mock_assess:
            capabilities = PlatformCapabilities(
                platform_type=PlatformType.LINUX,
                cpu_cores=cpu_cores,
                memory_gb=memory_gb,
                gpu_available=False,
                gpu_type=None,
                gpu_memory_gb=None,
                supported_processing_modes=[ProcessingMode.CPU_ONLY, ProcessingMode.AUTO],
                opencv_available=True,
                ffmpeg_available=True,
                python_version="3.9.0",
                architecture="x86_64"
            )
            
            mock_assess.return_value = capabilities
            
            manager = CrossPlatformManager()
            
            # Define workload configurations
            workload_configs = {
                "light": {"batch_size": 2, "max_workers": 2, "parallel_processing": True},
                "medium": {"batch_size": 4, "max_workers": 4, "parallel_processing": True},
                "heavy": {"batch_size": 8, "max_workers": 8, "parallel_processing": True}
            }
            
            base_config = workload_configs[workload_complexity]
            adapted_config = manager.adapt_for_hardware(base_config)
            
            # CPU scaling properties
            # Workers should never exceed available CPU cores
            assert adapted_config["max_workers"] <= cpu_cores
            assert adapted_config["max_workers"] >= 1
            
            # For single-core systems, disable parallel processing
            if cpu_cores == 1:
                assert adapted_config["parallel_processing"] == False
                assert adapted_config["max_workers"] == 1
            
            # For multi-core systems, enable parallel processing
            elif cpu_cores > 2:
                assert adapted_config["parallel_processing"] == True
                assert adapted_config["max_workers"] > 1
            
            # Memory constraints should affect batch sizes
            if memory_gb < 4.0:
                assert adapted_config["batch_size"] <= 2
            elif memory_gb < 8.0:
                assert adapted_config["batch_size"] <= 4
    
    @given(
        platform_type=st.sampled_from([PlatformType.WINDOWS, PlatformType.LINUX, PlatformType.MACOS]),
        gpu_type=st.one_of(st.none(), st.sampled_from(["nvidia", "amd", "intel", "metal"])),
        processing_requirements=st.sampled_from(["realtime", "batch", "quality"])
    )
    @settings(max_examples=10, deadline=5000)
    def test_property_ve27_platform_specific_optimization(self, platform_type, gpu_type, processing_requirements):
        """
        Property VE-27: Hardware Adaptation - Platform-Specific Optimization
        
        The system must apply platform-specific optimizations while
        maintaining consistent behavior across platforms.
        
        Validates Requirements:
        - VE-9.1: Platform-specific GPU acceleration
        - VE-9.2: Consistent fallback behavior
        """
        # Ensure GPU type matches platform capabilities
        gpu_available = gpu_type is not None
        if platform_type == PlatformType.MACOS and gpu_type and gpu_type != "metal":
            gpu_type = "metal"
        elif platform_type == PlatformType.WINDOWS and gpu_type == "metal":
            gpu_type = "nvidia"  # More common on Windows
        
        with patch.object(CrossPlatformManager, '_assess_capabilities') as mock_assess:
            capabilities = PlatformCapabilities(
                platform_type=platform_type,
                cpu_cores=4,
                memory_gb=8.0,
                gpu_available=gpu_available,
                gpu_type=gpu_type,
                gpu_memory_gb=6.0 if gpu_available else None,
                supported_processing_modes=[
                    ProcessingMode.GPU_CUDA if gpu_available else ProcessingMode.CPU_ONLY,
                    ProcessingMode.AUTO,
                    ProcessingMode.CPU_ONLY
                ],
                opencv_available=True,
                ffmpeg_available=True,
                python_version="3.9.0",
                architecture="x86_64"
            )
            
            mock_assess.return_value = capabilities
            
            manager = CrossPlatformManager()
            
            # Define processing requirement configurations
            requirement_configs = {
                "realtime": {"latency_priority": True, "batch_size": 1, "quality_level": "medium"},
                "batch": {"throughput_priority": True, "batch_size": 8, "quality_level": "high"},
                "quality": {"quality_priority": True, "batch_size": 4, "quality_level": "maximum"}
            }
            
            base_config = requirement_configs[processing_requirements]
            adapted_config = manager.adapt_for_hardware(base_config)
            
            # Platform-specific validation
            if platform_type == PlatformType.MACOS:
                # macOS should use Metal when available
                if gpu_available and gpu_type == "metal":
                    processing_config = manager.get_processing_config()
                    assert "metal" in str(processing_config).lower() or processing_config["mode"] != ProcessingMode.CPU_ONLY.value
            
            elif platform_type == PlatformType.WINDOWS:
                # Windows should handle DirectX/CUDA appropriately
                if gpu_available and gpu_type == "nvidia":
                    processing_config = manager.get_processing_config()
                    # Should prefer GPU acceleration
                    assert processing_config["mode"] in [ProcessingMode.GPU_CUDA.value, ProcessingMode.AUTO.value]
            
            elif platform_type == PlatformType.LINUX:
                # Linux should handle various GPU types
                if gpu_available:
                    processing_config = manager.get_processing_config()
                    # Should utilize available GPU
                    assert processing_config["mode"] in [ProcessingMode.GPU_CUDA.value, ProcessingMode.AUTO.value]
            
            # Universal properties regardless of platform
            # Configuration should be valid and safe
            assert adapted_config["batch_size"] >= 1
            assert adapted_config["batch_size"] <= 16  # Reasonable upper limit
            
            # Quality requirements should be preserved
            if processing_requirements == "quality":
                assert adapted_config.get("quality_level", "medium") in ["high", "maximum"]
            elif processing_requirements == "realtime":
                assert adapted_config.get("batch_size", 4) <= 2  # Small batches for low latency
    
    @given(
        memory_constraint=st.floats(min_value=1.0, max_value=4.0),
        cpu_constraint=st.integers(min_value=1, max_value=2),
        gpu_constraint=st.booleans()
    )
    @settings(max_examples=7, deadline=5000)
    def test_property_ve27_resource_constrained_adaptation(self, memory_constraint, cpu_constraint, gpu_constraint):
        """
        Property VE-27: Hardware Adaptation - Resource-Constrained Systems
        
        The system must gracefully adapt to resource-constrained environments
        while maintaining functional operation.
        
        Validates Requirements:
        - VE-9.1: Graceful degradation on limited hardware
        - VE-9.2: Functional operation under constraints
        """
        with patch.object(CrossPlatformManager, '_assess_capabilities') as mock_assess:
            capabilities = PlatformCapabilities(
                platform_type=PlatformType.LINUX,
                cpu_cores=cpu_constraint,
                memory_gb=memory_constraint,
                gpu_available=gpu_constraint,
                gpu_type="integrated" if gpu_constraint else None,
                gpu_memory_gb=1.0 if gpu_constraint else None,  # Very limited GPU memory
                supported_processing_modes=[
                    ProcessingMode.GPU_CUDA if gpu_constraint else ProcessingMode.CPU_ONLY,
                    ProcessingMode.AUTO,
                    ProcessingMode.CPU_ONLY
                ],
                opencv_available=True,
                ffmpeg_available=True,
                python_version="3.9.0",
                architecture="x86_64"
            )
            
            mock_assess.return_value = capabilities
            
            manager = CrossPlatformManager()
            
            # Test adaptation to severe constraints
            high_demand_config = {
                "batch_size": 16,
                "max_workers": 16,
                "parallel_processing": True,
                "memory_intensive": True
            }
            
            adapted_config = manager.adapt_for_hardware(high_demand_config)
            
            # Resource constraint validation
            # Memory constraints should reduce batch sizes
            if memory_constraint < 2.0:
                assert adapted_config["batch_size"] <= 1
            elif memory_constraint < 4.0:
                assert adapted_config["batch_size"] <= 2
            
            # CPU constraints should limit parallelism
            if cpu_constraint == 1:
                assert adapted_config["parallel_processing"] == False
                assert adapted_config["max_workers"] == 1
            elif cpu_constraint == 2:
                assert adapted_config["max_workers"] <= 2
            
            # GPU constraints should affect GPU usage
            if gpu_constraint and capabilities.gpu_memory_gb and capabilities.gpu_memory_gb < 2.0:
                # Very limited GPU memory should reduce GPU utilization
                processing_config = manager.get_processing_config()
                # Should either use CPU fallback or very conservative GPU settings
                if processing_config["mode"] == ProcessingMode.GPU_CUDA.value:
                    assert adapted_config["batch_size"] <= 1
            
            # System should remain functional despite constraints
            assert adapted_config["batch_size"] >= 1
            assert adapted_config["max_workers"] >= 1
            
            # Validate that the system can generate a valid processing configuration
            processing_config = manager.get_processing_config()
            assert processing_config is not None
            assert "mode" in processing_config
            assert "parallel_workers" in processing_config


class TestHardwareAdaptationIntegration:
    """Integration tests for hardware adaptation with Video Engine."""
    
    @given(
        frame_count=st.integers(min_value=5, max_value=50),
        resolution_scale=st.floats(min_value=0.5, max_value=2.0)
    )
    @settings(max_examples=5, deadline=10000)
    def test_property_ve27_video_engine_hardware_integration(self, frame_count, resolution_scale):
        """
        Property VE-27: Hardware Adaptation - Video Engine Integration
        
        The Video Engine must correctly utilize hardware adaptation
        for optimal performance during video processing.
        
        Validates Requirements:
        - VE-9.1: Integration with video processing pipeline
        - VE-9.2: Performance optimization in real workflows
        """
        with tempfile.TemporaryDirectory() as temp_dir:
            # Mock hardware capabilities
            with patch.object(CrossPlatformManager, '_assess_capabilities') as mock_assess:
                capabilities = PlatformCapabilities(
                    platform_type=PlatformType.LINUX,
                    cpu_cores=4,
                    memory_gb=8.0,
                    gpu_available=True,
                    gpu_type="nvidia",
                    gpu_memory_gb=6.0,
                    supported_processing_modes=[ProcessingMode.GPU_CUDA, ProcessingMode.AUTO, ProcessingMode.CPU_ONLY],
                    opencv_available=True,
                    ffmpeg_available=True,
                    python_version="3.9.0",
                    architecture="x86_64"
                )
                
                mock_assess.return_value = capabilities
                
                # Create Video Engine with hardware adaptation
                from src.video_engine import VideoConfig
                config = VideoConfig(
                    frame_rate=24,
                    resolution=(int(1920 * resolution_scale), int(1080 * resolution_scale)),
                    output_format="png"
                )
                
                engine = VideoEngine(config)
                
                # Test that the engine was created successfully with hardware adaptation
                assert engine is not None
                assert engine.config is not None
                
                # Test basic functionality
                is_valid, issues = engine.validate_configuration()
                assert is_valid == True or len(issues) == 0  # Should be valid or have no critical issues


def test_hardware_adaptation_property_integration():
    """Integration test for all hardware adaptation properties."""
    # Test that all hardware adaptation components work together
    with patch.object(CrossPlatformManager, '_assess_capabilities') as mock_assess:
        # Test with a typical development machine configuration
        capabilities = PlatformCapabilities(
            platform_type=PlatformType.WINDOWS,
            cpu_cores=8,
            memory_gb=16.0,
            gpu_available=True,
            gpu_type="nvidia",
            gpu_memory_gb=8.0,
            supported_processing_modes=[ProcessingMode.GPU_CUDA, ProcessingMode.AUTO, ProcessingMode.CPU_ONLY],
            opencv_available=True,
            ffmpeg_available=True,
            python_version="3.9.0",
            architecture="x86_64"
        )
        
        mock_assess.return_value = capabilities
        
        manager = CrossPlatformManager()
        
        # Test comprehensive hardware adaptation
        test_configs = [
            {"batch_size": 1, "max_workers": 1, "processing_type": "realtime"},
            {"batch_size": 8, "max_workers": 16, "processing_type": "batch"},
            {"batch_size": 4, "max_workers": 8, "processing_type": "balanced"}
        ]
        
        for config in test_configs:
            adapted = manager.adapt_for_hardware(config)
            
            # All adaptations should be safe and valid
            assert adapted["batch_size"] >= 1
            assert adapted["max_workers"] <= 8  # Should not exceed CPU cores
            assert adapted["max_workers"] >= 1
            
            # GPU should be utilized when available
            processing_config = manager.get_processing_config()
            assert processing_config["mode"] in [ProcessingMode.GPU_CUDA.value, ProcessingMode.AUTO.value]
        
        # Test compatibility report generation
        report = manager.get_compatibility_report()
        assert report["validation"]["is_compatible"] == True
        assert report["hardware_capabilities"]["gpu_available"] == True
        assert len(report["validation"]["issues"]) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])