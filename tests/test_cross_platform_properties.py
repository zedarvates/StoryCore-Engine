#!/usr/bin/env python3
"""
Property Tests for Cross-Platform Consistency
Tests universal properties of cross-platform compatibility and consistency.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from unittest.mock import patch, MagicMock
from hypothesis import given, strategies as st, assume, settings
import sys

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from cross_platform_compatibility import (
    CrossPlatformManager, PlatformType, ProcessingMode,
    PlatformCapabilities, PlatformOptimization
)


# Hypothesis strategies for generating test data
@st.composite
def platform_type_strategy(draw):
    """Generate valid platform types."""
    return draw(st.sampled_from([PlatformType.WINDOWS, PlatformType.LINUX, PlatformType.MACOS]))


@st.composite
def hardware_config_strategy(draw):
    """Generate valid hardware configurations."""
    return {
        "cpu_cores": draw(st.integers(min_value=1, max_value=64)),
        "memory_gb": draw(st.floats(min_value=1.0, max_value=128.0)),
        "gpu_available": draw(st.booleans()),
        "gpu_type": draw(st.one_of(st.none(), st.sampled_from(["nvidia", "amd", "intel", "metal"]))),
        "gpu_memory_gb": draw(st.one_of(st.none(), st.floats(min_value=1.0, max_value=32.0)))
    }


@st.composite
def processing_config_strategy(draw):
    """Generate valid processing configurations."""
    return {
        "batch_size": draw(st.integers(min_value=1, max_value=16)),
        "max_workers": draw(st.integers(min_value=1, max_value=32)),
        "parallel_processing": draw(st.booleans()),
        "gpu_memory_fraction": draw(st.floats(min_value=0.1, max_value=1.0))
    }


class TestCrossPlatformConsistencyProperties:
    """Property tests for cross-platform consistency."""
    
    @given(platform_type=platform_type_strategy())
    @settings(max_examples=25, deadline=5000)
    def test_property_ve26_platform_detection_consistency(self, platform_type):
        """
        Property VE-26: Cross-Platform Consistency - Platform Detection Consistency
        
        Platform detection must be consistent and deterministic across all supported platforms.
        The same platform should always be detected the same way.
        """
        with patch('platform.system') as mock_system:
            # Map platform types to system names
            system_map = {
                PlatformType.WINDOWS: "Windows",
                PlatformType.LINUX: "Linux",
                PlatformType.MACOS: "Darwin"
            }
            
            mock_system.return_value = system_map[platform_type]
            
            # Create multiple managers - should detect same platform
            manager1 = CrossPlatformManager()
            manager2 = CrossPlatformManager()
            
            # Platform detection should be consistent
            assert manager1.platform_info == platform_type
            assert manager2.platform_info == platform_type
            assert manager1.platform_info == manager2.platform_info
            
            # Platform-specific settings should be consistent
            assert manager1.optimizations.file_path_separator == manager2.optimizations.file_path_separator
            
            if platform_type == PlatformType.WINDOWS:
                assert manager1.optimizations.file_path_separator == "\\"
                assert "use_windows_api" in manager1.optimizations.optimization_flags
                assert "use_windows_api" in manager2.optimizations.optimization_flags
            else:
                assert manager1.optimizations.file_path_separator == "/"
                if platform_type == PlatformType.LINUX:
                    assert "use_posix_api" in manager1.optimizations.optimization_flags
                elif platform_type == PlatformType.MACOS:
                    assert "use_grand_central_dispatch" in manager1.optimizations.optimization_flags
    
    @given(hardware_config=hardware_config_strategy())
    @settings(max_examples=15, deadline=5000)
    def test_property_ve26_capability_assessment_consistency(self, hardware_config):
        """
        Property VE-26: Cross-Platform Consistency - Capability Assessment Consistency
        
        Capability assessment must produce consistent results for the same hardware configuration
        across different platforms and multiple assessments.
        """
        with patch.object(CrossPlatformManager, '_assess_capabilities') as mock_assess:
            # Create consistent capabilities based on hardware config
            capabilities = PlatformCapabilities(
                platform_type=PlatformType.LINUX,  # Use Linux as default for testing
                cpu_cores=hardware_config["cpu_cores"],
                memory_gb=hardware_config["memory_gb"],
                gpu_available=hardware_config["gpu_available"],
                gpu_type=hardware_config["gpu_type"],
                gpu_memory_gb=hardware_config["gpu_memory_gb"],
                supported_processing_modes=[ProcessingMode.CPU_ONLY, ProcessingMode.AUTO],
                opencv_available=True,
                ffmpeg_available=True,
                python_version="3.9.0",
                architecture="x86_64"
            )
            
            mock_assess.return_value = capabilities
            
            # Create multiple managers with same hardware
            manager1 = CrossPlatformManager()
            manager2 = CrossPlatformManager()
            
            # Capabilities should be identical
            assert manager1.capabilities.cpu_cores == manager2.capabilities.cpu_cores
            assert manager1.capabilities.memory_gb == manager2.capabilities.memory_gb
            assert manager1.capabilities.gpu_available == manager2.capabilities.gpu_available
            assert manager1.capabilities.gpu_type == manager2.capabilities.gpu_type
            
            # Optimization settings should be consistent for same hardware
            assert manager1.optimizations.max_parallel_workers == manager2.optimizations.max_parallel_workers
            assert abs(manager1.optimizations.memory_limit_gb - manager2.optimizations.memory_limit_gb) < 0.1
    
    @given(
        cpu_cores=st.integers(min_value=1, max_value=32),
        memory_gb=st.floats(min_value=2.0, max_value=64.0)
    )
    @settings(max_examples=12, deadline=5000)
    def test_property_ve26_optimization_scaling_consistency(self, cpu_cores, memory_gb):
        """
        Property VE-26: Cross-Platform Consistency - Optimization Scaling Consistency
        
        Optimization settings must scale consistently with hardware capabilities
        across all platforms, following the same scaling rules.
        """
        with patch.object(CrossPlatformManager, '_assess_capabilities') as mock_assess:
            # Create capabilities with specified hardware
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
            opts = manager.optimizations
            
            # Worker count should scale with CPU cores but be capped
            expected_max_workers = min(cpu_cores, 8)
            assert opts.max_parallel_workers == expected_max_workers
            
            # Memory limit should be a reasonable fraction of total memory
            expected_memory_limit = memory_gb * 0.75
            assert abs(opts.memory_limit_gb - expected_memory_limit) < 0.1
            
            # Memory limit should never exceed total memory
            assert opts.memory_limit_gb <= memory_gb
            assert opts.memory_limit_gb > 0
    
    @given(processing_config=processing_config_strategy())
    @settings(max_examples=10, deadline=5000)
    def test_property_ve26_hardware_adaptation_consistency(self, processing_config):
        """
        Property VE-26: Cross-Platform Consistency - Hardware Adaptation Consistency
        
        Hardware adaptation must apply consistent rules across all platforms,
        producing predictable results for the same input configuration.
        """
        manager = CrossPlatformManager()
        
        # Adapt configuration
        adapted_config = manager.adapt_for_hardware(processing_config)
        
        # Adaptation should preserve original keys
        for key in processing_config:
            assert key in adapted_config
        
        # Adaptation should respect hardware limits
        assert adapted_config["max_workers"] <= manager.capabilities.cpu_cores
        assert adapted_config["max_workers"] >= 1
        
        # Batch size should be reasonable
        assert adapted_config["batch_size"] >= 1
        assert adapted_config["batch_size"] <= processing_config["batch_size"]
        
        # GPU memory fraction should be valid if present
        if "gpu_memory_fraction" in adapted_config:
            assert 0.1 <= adapted_config["gpu_memory_fraction"] <= 1.0
        
        # Low memory systems should have reduced resource usage
        if manager.capabilities.memory_gb < 8.0:
            assert adapted_config["batch_size"] <= 2
            assert adapted_config["max_workers"] <= 2
        
        # Single core systems should disable parallel processing
        if manager.capabilities.cpu_cores <= 2:
            assert adapted_config["max_workers"] == 1
    
    @given(platform_type=platform_type_strategy())
    @settings(max_examples=7, deadline=5000)
    def test_property_ve26_processing_mode_consistency(self, platform_type):
        """
        Property VE-26: Cross-Platform Consistency - Processing Mode Consistency
        
        Processing mode support must be consistent across platforms with similar hardware,
        and processing configurations must be valid for all supported modes.
        """
        with patch('platform.system') as mock_system:
            system_map = {
                PlatformType.WINDOWS: "Windows",
                PlatformType.LINUX: "Linux",
                PlatformType.MACOS: "Darwin"
            }
            
            mock_system.return_value = system_map[platform_type]
            
            manager = CrossPlatformManager()
            
            # All platforms should support CPU processing
            assert ProcessingMode.CPU_ONLY in manager.capabilities.supported_processing_modes
            assert ProcessingMode.AUTO in manager.capabilities.supported_processing_modes
            
            # Test configuration generation for all supported modes
            for mode in manager.capabilities.supported_processing_modes:
                config = manager.get_processing_config(mode)
                
                # All configs should have required fields
                assert "mode" in config
                assert "parallel_workers" in config
                assert "memory_limit_gb" in config
                
                # Mode should match requested mode
                assert config["mode"] == mode.value
                
                # Resource limits should be reasonable
                assert config["parallel_workers"] >= 1
                assert config["memory_limit_gb"] > 0
                
                # Device-specific validation
                if mode == ProcessingMode.CPU_ONLY:
                    assert config["device"] == "cpu"
                    assert "num_threads" in config
                elif mode == ProcessingMode.GPU_CUDA:
                    assert config["device"] == "cuda"
                    assert "gpu_memory_fraction" in config
                elif mode == ProcessingMode.GPU_OPENCL:
                    assert config["device"] == "opencl"
                elif mode == ProcessingMode.GPU_METAL:
                    assert config["device"] == "metal"
    
    @given(
        base_path=st.text(min_size=1, max_size=50, alphabet=st.characters(whitelist_categories=('Lu', 'Ll', 'Nd', 'Pc')))
    )
    @settings(max_examples=10, deadline=5000)
    def test_property_ve26_path_handling_consistency(self, base_path):
        """
        Property VE-26: Cross-Platform Consistency - Path Handling Consistency
        
        Path creation and handling must be consistent across platforms,
        using appropriate separators and creating valid directory structures.
        """
        # Clean base path to avoid invalid characters
        clean_base_path = "".join(c for c in base_path if c.isalnum() or c in ['_', '-'])
        assume(len(clean_base_path) > 0)
        
        with tempfile.TemporaryDirectory() as temp_dir:
            test_path = Path(temp_dir) / clean_base_path
            test_path.mkdir(parents=True, exist_ok=True)
            
            manager = CrossPlatformManager()
            paths = manager.create_platform_paths(test_path)
            
            # Required paths should be created
            required_paths = ["base", "temp", "cache", "output", "logs"]
            for path_type in required_paths:
                assert path_type in paths
                assert isinstance(paths[path_type], Path)
            
            # Base path should match input
            assert paths["base"] == test_path
            
            # All paths should be absolute
            for path in paths.values():
                assert path.is_absolute()
            
            # Paths should use platform-appropriate separators
            for path in paths.values():
                path_str = str(path)
                if manager.platform_info == PlatformType.WINDOWS:
                    # Windows paths may contain both separators due to Path normalization
                    assert "\\" in path_str or "/" in path_str
                else:
                    # Unix-like systems should use forward slashes
                    assert "/" in path_str
    
    @given(platform_type=platform_type_strategy())
    @settings(max_examples=7, deadline=5000)
    def test_property_ve26_configuration_serialization_consistency(self, platform_type):
        """
        Property VE-26: Cross-Platform Consistency - Configuration Serialization Consistency
        
        Configuration serialization must produce consistent, valid JSON across all platforms,
        with the same structure and data types.
        """
        with patch('platform.system') as mock_system:
            system_map = {
                PlatformType.WINDOWS: "Windows",
                PlatformType.LINUX: "Linux",
                PlatformType.MACOS: "Darwin"
            }
            
            mock_system.return_value = system_map[platform_type]
            
            manager = CrossPlatformManager()
            
            # Get various configurations
            optimal_config = manager.get_optimal_config()
            processing_config = manager.get_processing_config()
            compatibility_report = manager.get_compatibility_report()
            
            # All configurations should be JSON serializable
            import json
            
            try:
                optimal_json = json.dumps(optimal_config)
                processing_json = json.dumps(processing_config)
                report_json = json.dumps(compatibility_report)
                
                # Should be able to deserialize back
                optimal_restored = json.loads(optimal_json)
                processing_restored = json.loads(processing_json)
                report_restored = json.loads(report_json)
                
                # Restored data should match original structure
                assert set(optimal_restored.keys()) == set(optimal_config.keys())
                assert set(processing_restored.keys()) == set(processing_config.keys())
                assert set(report_restored.keys()) == set(compatibility_report.keys())
                
            except (TypeError, ValueError) as e:
                pytest.fail(f"Configuration serialization failed for {platform_type}: {e}")
    
    @given(
        memory_gb=st.floats(min_value=1.0, max_value=16.0),
        cpu_cores=st.integers(min_value=1, max_value=8)
    )
    @settings(max_examples=10, deadline=5000)
    def test_property_ve26_resource_limit_consistency(self, memory_gb, cpu_cores):
        """
        Property VE-26: Cross-Platform Consistency - Resource Limit Consistency
        
        Resource limits must be applied consistently across platforms,
        ensuring safe operation within hardware constraints.
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
            
            # Memory limits should be safe
            assert manager.optimizations.memory_limit_gb <= memory_gb
            assert manager.optimizations.memory_limit_gb > 0
            
            # Worker limits should respect CPU cores
            assert manager.optimizations.max_parallel_workers <= cpu_cores
            assert manager.optimizations.max_parallel_workers >= 1
            
            # Processing configuration should respect limits
            config = manager.get_processing_config()
            assert config["parallel_workers"] <= cpu_cores
            assert config["memory_limit_gb"] <= memory_gb
            
            # Hardware adaptation should be conservative
            high_demand_config = {
                "batch_size": 16,
                "max_workers": 32,
                "parallel_processing": True
            }
            
            adapted = manager.adapt_for_hardware(high_demand_config)
            assert adapted["max_workers"] <= cpu_cores
            
            # Low resource systems should have additional constraints
            if memory_gb < 4.0:
                assert adapted["batch_size"] <= 2
                assert adapted["max_workers"] <= 2
            
            if cpu_cores <= 2:
                assert adapted["max_workers"] <= 2


class TestCrossPlatformValidationProperties:
    """Property tests for cross-platform validation and error handling."""
    
    @given(
        opencv_available=st.booleans(),
        ffmpeg_available=st.booleans(),
        memory_gb=st.floats(min_value=0.5, max_value=128.0)
    )
    @settings(max_examples=12, deadline=5000)
    def test_property_ve26_dependency_validation_consistency(self, opencv_available, ffmpeg_available, memory_gb):
        """
        Property VE-26: Cross-Platform Consistency - Dependency Validation Consistency
        
        Dependency validation must be consistent across platforms,
        identifying the same issues for the same software configuration.
        """
        with patch.object(CrossPlatformManager, '_assess_capabilities') as mock_assess:
            capabilities = PlatformCapabilities(
                platform_type=PlatformType.LINUX,
                cpu_cores=4,
                memory_gb=memory_gb,
                gpu_available=False,
                gpu_type=None,
                gpu_memory_gb=None,
                supported_processing_modes=[ProcessingMode.CPU_ONLY, ProcessingMode.AUTO],
                opencv_available=opencv_available,
                ffmpeg_available=ffmpeg_available,
                python_version="3.9.0",
                architecture="x86_64"
            )
            
            mock_assess.return_value = capabilities
            
            manager = CrossPlatformManager()
            is_valid, issues = manager.validate_dependencies()
            
            # Validation should be deterministic
            is_valid2, issues2 = manager.validate_dependencies()
            assert is_valid == is_valid2
            assert len(issues) == len(issues2)
            
            # Expected issues based on configuration
            expected_issues = []
            
            if not opencv_available:
                expected_issues.append("OpenCV")
            
            if not ffmpeg_available:
                expected_issues.append("FFmpeg")
            
            if memory_gb < 4.0:
                expected_issues.append("memory")
            
            # Check that expected issues are reported
            for expected_issue in expected_issues:
                assert any(expected_issue.lower() in issue.lower() for issue in issues)
            
            # If no expected issues, should be valid (assuming Python 3.9+)
            if not expected_issues:
                assert is_valid or any("python" in issue.lower() for issue in issues)
    
    @given(platform_type=platform_type_strategy())
    @settings(max_examples=7, deadline=5000)
    def test_property_ve26_error_handling_consistency(self, platform_type):
        """
        Property VE-26: Cross-Platform Consistency - Error Handling Consistency
        
        Error handling must be consistent across platforms,
        gracefully handling failures and providing useful error information.
        """
        with patch('platform.system') as mock_system:
            system_map = {
                PlatformType.WINDOWS: "Windows",
                PlatformType.LINUX: "Linux",
                PlatformType.MACOS: "Darwin"
            }
            
            mock_system.return_value = system_map[platform_type]
            
            # Test with various failure scenarios
            with patch('subprocess.run', side_effect=Exception("Mocked failure")):
                manager = CrossPlatformManager()
                
                # Should not crash despite subprocess failures
                assert isinstance(manager.capabilities, PlatformCapabilities)
                assert isinstance(manager.optimizations, PlatformOptimization)
                
                # Should provide reasonable defaults
                assert manager.capabilities.cpu_cores >= 1
                assert manager.capabilities.memory_gb > 0
                
                # Should still generate valid configurations
                config = manager.get_optimal_config()
                assert isinstance(config, dict)
                assert "platform" in config
                assert "processing" in config


def test_cross_platform_property_integration():
    """Integration test for cross-platform properties."""
    # Test that all properties work together
    manager = CrossPlatformManager()
    
    # Should be able to generate complete configuration
    config = manager.get_optimal_config()
    assert isinstance(config, dict)
    
    # Should be able to validate dependencies
    is_valid, issues = manager.validate_dependencies()
    assert isinstance(is_valid, bool)
    assert isinstance(issues, list)
    
    # Should be able to adapt configurations
    base_config = {"batch_size": 4, "max_workers": 4}
    adapted = manager.adapt_for_hardware(base_config)
    assert isinstance(adapted, dict)
    
    # Should be able to generate compatibility report
    report = manager.get_compatibility_report()
    assert isinstance(report, dict)
    assert "validation" in report


if __name__ == "__main__":
    pytest.main([__file__, "-v"])