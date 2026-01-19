#!/usr/bin/env python3
"""
Tests for Cross-Platform Compatibility Module
Validates platform detection, capability assessment, and optimization configuration.
"""

import pytest
import platform
import tempfile
import shutil
from pathlib import Path
from unittest.mock import patch, MagicMock
import sys

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from cross_platform_compatibility import (
    CrossPlatformManager, PlatformType, ProcessingMode,
    PlatformCapabilities, PlatformOptimization
)


class TestCrossPlatformCompatibility:
    """Test cross-platform compatibility functionality."""
    
    def test_platform_detection(self):
        """Test platform detection functionality."""
        manager = CrossPlatformManager()
        
        # Should detect a valid platform
        assert manager.platform_info in [
            PlatformType.WINDOWS, PlatformType.LINUX, 
            PlatformType.MACOS, PlatformType.UNKNOWN
        ]
        
        # Should match actual platform
        system = platform.system().lower()
        if system == "windows":
            assert manager.platform_info == PlatformType.WINDOWS
        elif system == "linux":
            assert manager.platform_info == PlatformType.LINUX
        elif system == "darwin":
            assert manager.platform_info == PlatformType.MACOS
    
    def test_capability_assessment(self):
        """Test capability assessment functionality."""
        manager = CrossPlatformManager()
        caps = manager.capabilities
        
        # Basic capability checks
        assert isinstance(caps, PlatformCapabilities)
        assert caps.cpu_cores >= 1
        assert caps.memory_gb > 0
        assert isinstance(caps.gpu_available, bool)
        assert isinstance(caps.opencv_available, bool)
        assert isinstance(caps.ffmpeg_available, bool)
        assert len(caps.supported_processing_modes) >= 1
        
        # Should always support CPU processing
        assert ProcessingMode.CPU_ONLY in caps.supported_processing_modes
        assert ProcessingMode.AUTO in caps.supported_processing_modes
        
        # Platform-specific checks
        assert caps.platform_type == manager.platform_info
        assert caps.python_version == platform.python_version()
        assert caps.architecture == platform.machine()
    
    def test_optimization_configuration(self):
        """Test optimization configuration."""
        manager = CrossPlatformManager()
        opts = manager.optimizations
        
        # Basic optimization checks
        assert isinstance(opts, PlatformOptimization)
        assert opts.max_parallel_workers >= 1
        assert opts.memory_limit_gb > 0
        assert opts.preferred_processing_mode in manager.capabilities.supported_processing_modes
        
        # Path separator should be platform appropriate
        if manager.platform_info == PlatformType.WINDOWS:
            assert opts.file_path_separator == "\\"
        else:
            assert opts.file_path_separator == "/"
        
        # Directories should exist or be creatable
        assert opts.temp_directory
        assert opts.cache_directory
        
        # Optimization flags should be present
        assert isinstance(opts.optimization_flags, dict)
        assert "use_multiprocessing" in opts.optimization_flags
    
    def test_optimal_config_generation(self):
        """Test optimal configuration generation."""
        manager = CrossPlatformManager()
        config = manager.get_optimal_config()
        
        # Required sections
        required_sections = [
            "platform", "processing", "hardware", 
            "software", "paths", "optimizations"
        ]
        for section in required_sections:
            assert section in config
        
        # Platform section
        platform_info = config["platform"]
        assert "type" in platform_info
        assert "architecture" in platform_info
        assert "python_version" in platform_info
        
        # Processing section
        processing_info = config["processing"]
        assert "mode" in processing_info
        assert "max_workers" in processing_info
        assert "memory_limit_gb" in processing_info
        
        # Hardware section
        hardware_info = config["hardware"]
        assert "cpu_cores" in hardware_info
        assert "memory_gb" in hardware_info
        assert "gpu_available" in hardware_info
    
    def test_dependency_validation(self):
        """Test dependency validation."""
        manager = CrossPlatformManager()
        is_valid, issues = manager.validate_dependencies()
        
        # Should return boolean and list
        assert isinstance(is_valid, bool)
        assert isinstance(issues, list)
        
        # If invalid, should have issues
        if not is_valid:
            assert len(issues) > 0
        
        # Issues should be strings
        for issue in issues:
            assert isinstance(issue, str)
            assert len(issue) > 0
    
    def test_platform_paths_creation(self):
        """Test platform-appropriate path creation."""
        manager = CrossPlatformManager()
        
        with tempfile.TemporaryDirectory() as temp_dir:
            paths = manager.create_platform_paths(temp_dir)
            
            # Required paths
            required_paths = ["base", "temp", "cache", "output", "logs"]
            for path_type in required_paths:
                assert path_type in paths
                assert isinstance(paths[path_type], Path)
            
            # Base path should match input
            assert str(paths["base"]) == temp_dir
            
            # Paths should be created (where possible)
            for path_type, path in paths.items():
                if path_type == "base":
                    assert path.exists()
    
    def test_processing_config_generation(self):
        """Test processing configuration generation."""
        manager = CrossPlatformManager()
        
        # Test default config
        config = manager.get_processing_config()
        assert "mode" in config
        assert "parallel_workers" in config
        assert "memory_limit_gb" in config
        
        # Test CPU-only config
        cpu_config = manager.get_processing_config(ProcessingMode.CPU_ONLY)
        assert cpu_config["mode"] == "cpu_only"
        assert cpu_config["device"] == "cpu"
        assert "num_threads" in cpu_config
        
        # Test GPU configs if supported
        if ProcessingMode.GPU_CUDA in manager.capabilities.supported_processing_modes:
            cuda_config = manager.get_processing_config(ProcessingMode.GPU_CUDA)
            assert cuda_config["mode"] == "gpu_cuda"
            assert cuda_config["device"] == "cuda"
    
    def test_hardware_adaptation(self):
        """Test hardware-specific configuration adaptation."""
        manager = CrossPlatformManager()
        
        base_config = {
            "batch_size": 8,
            "max_workers": 8,
            "parallel_processing": True,
            "gpu_memory_fraction": 0.8
        }
        
        adapted_config = manager.adapt_for_hardware(base_config)
        
        # Should return a dictionary
        assert isinstance(adapted_config, dict)
        
        # Should contain original keys
        for key in base_config:
            assert key in adapted_config
        
        # Adaptations should be reasonable
        assert adapted_config["max_workers"] <= manager.capabilities.cpu_cores
        assert adapted_config["max_workers"] >= 1
    
    def test_compatibility_report_generation(self):
        """Test comprehensive compatibility report generation."""
        manager = CrossPlatformManager()
        report = manager.get_compatibility_report()
        
        # Required sections
        required_sections = [
            "platform_info", "hardware_capabilities", "software_dependencies",
            "supported_processing_modes", "recommended_config", 
            "validation", "optimizations"
        ]
        
        for section in required_sections:
            assert section in report
        
        # Platform info
        platform_info = report["platform_info"]
        assert platform_info["type"] in ["windows", "linux", "macos", "unknown"]
        
        # Hardware capabilities
        hardware = report["hardware_capabilities"]
        assert hardware["cpu_cores"] >= 1
        assert hardware["memory_gb"] > 0
        
        # Validation section
        validation = report["validation"]
        assert "is_compatible" in validation
        assert "issues" in validation
        assert isinstance(validation["is_compatible"], bool)
        assert isinstance(validation["issues"], list)
    
    @patch('platform.system')
    def test_windows_specific_features(self, mock_system):
        """Test Windows-specific functionality."""
        mock_system.return_value = "Windows"
        
        manager = CrossPlatformManager()
        
        # Should detect Windows
        assert manager.platform_info == PlatformType.WINDOWS
        
        # Should use Windows path separator
        assert manager.optimizations.file_path_separator == "\\"
        
        # Should have Windows-specific optimization flags
        flags = manager.optimizations.optimization_flags
        assert "use_windows_api" in flags
        assert "file_buffering" in flags
    
    @patch('platform.system')
    def test_linux_specific_features(self, mock_system):
        """Test Linux-specific functionality."""
        mock_system.return_value = "Linux"
        
        manager = CrossPlatformManager()
        
        # Should detect Linux
        assert manager.platform_info == PlatformType.LINUX
        
        # Should use Unix path separator
        assert manager.optimizations.file_path_separator == "/"
        
        # Should have Linux-specific optimization flags
        flags = manager.optimizations.optimization_flags
        assert "use_posix_api" in flags
        assert "nice_level" in flags
    
    @patch('platform.system')
    def test_macos_specific_features(self, mock_system):
        """Test macOS-specific functionality."""
        mock_system.return_value = "Darwin"
        
        manager = CrossPlatformManager()
        
        # Should detect macOS
        assert manager.platform_info == PlatformType.MACOS
        
        # Should use Unix path separator
        assert manager.optimizations.file_path_separator == "/"
        
        # Should have macOS-specific optimization flags
        flags = manager.optimizations.optimization_flags
        assert "use_grand_central_dispatch" in flags
        
        # Should support Metal if GPU available
        if manager.capabilities.gpu_available:
            assert ProcessingMode.GPU_METAL in manager.capabilities.supported_processing_modes
    
    def test_gpu_detection_robustness(self):
        """Test GPU detection handles failures gracefully."""
        manager = CrossPlatformManager()
        
        # GPU detection should not crash
        gpu_available, gpu_type, gpu_memory = manager._detect_gpu()
        
        assert isinstance(gpu_available, bool)
        assert gpu_type is None or isinstance(gpu_type, str)
        assert gpu_memory is None or isinstance(gpu_memory, (int, float))
    
    def test_memory_detection_fallback(self):
        """Test memory detection fallback mechanisms."""
        manager = CrossPlatformManager()
        
        # Memory detection should always return a reasonable value
        assert manager.capabilities.memory_gb >= 1.0  # At least 1GB
        assert manager.capabilities.memory_gb <= 1024.0  # Less than 1TB (reasonable upper bound)
    
    def test_processing_mode_consistency(self):
        """Test processing mode consistency across methods."""
        manager = CrossPlatformManager()
        
        # Preferred mode should be in supported modes
        preferred = manager.optimizations.preferred_processing_mode
        supported = manager.capabilities.supported_processing_modes
        
        assert preferred in supported
        
        # Should be able to generate config for preferred mode
        config = manager.get_processing_config(preferred)
        assert config["mode"] == preferred.value
    
    def test_path_handling_cross_platform(self):
        """Test path handling works across platforms."""
        manager = CrossPlatformManager()
        
        with tempfile.TemporaryDirectory() as temp_dir:
            paths = manager.create_platform_paths(temp_dir)
            
            # All paths should be Path objects
            for path in paths.values():
                assert isinstance(path, Path)
            
            # Paths should be absolute
            for path in paths.values():
                assert path.is_absolute()
    
    def test_configuration_serialization(self):
        """Test that configurations can be serialized."""
        manager = CrossPlatformManager()
        
        # Get various configurations
        optimal_config = manager.get_optimal_config()
        processing_config = manager.get_processing_config()
        compatibility_report = manager.get_compatibility_report()
        
        # Should be JSON serializable (basic check)
        import json
        
        try:
            json.dumps(optimal_config)
            json.dumps(processing_config)
            json.dumps(compatibility_report)
        except (TypeError, ValueError) as e:
            pytest.fail(f"Configuration not JSON serializable: {e}")


class TestPlatformSpecificBehavior:
    """Test platform-specific behavior and edge cases."""
    
    def test_low_memory_adaptation(self):
        """Test adaptation for low memory systems."""
        manager = CrossPlatformManager()
        
        # Simulate low memory system
        with patch.object(manager.capabilities, 'memory_gb', 2.0):
            base_config = {"batch_size": 8, "max_workers": 8}
            adapted = manager.adapt_for_hardware(base_config)
            
            # Should reduce resource usage
            assert adapted["batch_size"] <= base_config["batch_size"]
            assert adapted["max_workers"] <= base_config["max_workers"]
    
    def test_single_core_adaptation(self):
        """Test adaptation for single-core systems."""
        manager = CrossPlatformManager()
        
        # Simulate single-core system
        with patch.object(manager.capabilities, 'cpu_cores', 1):
            base_config = {"parallel_processing": True, "max_workers": 4}
            adapted = manager.adapt_for_hardware(base_config)
            
            # Should disable parallel processing
            assert adapted["max_workers"] == 1
    
    def test_dependency_validation_edge_cases(self):
        """Test dependency validation edge cases."""
        manager = CrossPlatformManager()
        
        # Test with missing OpenCV
        with patch.object(manager.capabilities, 'opencv_available', False):
            is_valid, issues = manager.validate_dependencies()
            assert not is_valid
            assert any("OpenCV" in issue for issue in issues)
        
        # Test with low memory
        with patch.object(manager.capabilities, 'memory_gb', 2.0):
            is_valid, issues = manager.validate_dependencies()
            # May or may not be valid, but should handle gracefully
            assert isinstance(is_valid, bool)
            assert isinstance(issues, list)


def test_cross_platform_manager_initialization():
    """Test that CrossPlatformManager initializes correctly."""
    manager = CrossPlatformManager()
    
    # Should have all required attributes
    assert hasattr(manager, 'platform_info')
    assert hasattr(manager, 'capabilities')
    assert hasattr(manager, 'optimizations')
    
    # Attributes should be of correct types
    assert isinstance(manager.platform_info, PlatformType)
    assert isinstance(manager.capabilities, PlatformCapabilities)
    assert isinstance(manager.optimizations, PlatformOptimization)


def test_main_function():
    """Test the main function runs without errors."""
    from cross_platform_compatibility import main
    
    # Should not raise any exceptions
    try:
        main()
    except SystemExit:
        # main() might call sys.exit(), which is acceptable
        pass


if __name__ == "__main__":
    pytest.main([__file__, "-v"])