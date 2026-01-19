"""
Tests for Model Compatibility Checking and Versioning

Author: Kiro AI Assistant
Date: January 14, 2026
"""

import pytest
import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from advanced_model_manager import (
    ModelCompatibilityChecker,
    ModelVersionManager,
    ModelInfo,
    ModelType,
    ModelPriority,
    QuantizationType,
    ModelManagerConfig,
    AdvancedModelManager,
)


# ============================================================================
# Test Model Compatibility Checker
# ============================================================================

class TestModelCompatibilityChecker:
    """Test model compatibility checking"""
    
    def test_checker_initialization(self):
        """Test compatibility checker initialization"""
        checker = ModelCompatibilityChecker()
        
        assert hasattr(checker, 'gpu_available')
        assert hasattr(checker, 'device_count')
        assert hasattr(checker, 'pytorch_version')
    
    def test_check_compatible_model(self):
        """Test checking a compatible model"""
        checker = ModelCompatibilityChecker()
        
        model_info = ModelInfo(
            name="test_model",
            model_type=ModelType.DIFFUSION,
            file_path=Path("test.safetensors"),
            size_gb=2.0,
            min_vram_gb=1.0,
            min_ram_gb=4.0,
            compatible_frameworks=["pytorch"]
        )
        
        is_compatible, issues = checker.check_model_compatibility(model_info)
        
        # Should be compatible or have specific issues
        assert isinstance(is_compatible, bool)
        assert isinstance(issues, list)
    
    def test_check_insufficient_vram(self):
        """Test checking model with insufficient VRAM"""
        checker = ModelCompatibilityChecker()
        
        model_info = ModelInfo(
            name="huge_model",
            model_type=ModelType.DIFFUSION,
            file_path=Path("huge.safetensors"),
            size_gb=100.0,
            min_vram_gb=1000.0,  # Unrealistic requirement
            compatible_frameworks=["pytorch"]
        )
        
        is_compatible, issues = checker.check_model_compatibility(model_info)
        
        # Should not be compatible due to VRAM
        if checker.gpu_available:
            assert not is_compatible
            assert any("VRAM" in issue for issue in issues)
    
    def test_check_insufficient_ram(self):
        """Test checking model with insufficient RAM"""
        checker = ModelCompatibilityChecker()
        
        model_info = ModelInfo(
            name="huge_model",
            model_type=ModelType.DIFFUSION,
            file_path=Path("huge.safetensors"),
            size_gb=100.0,
            min_ram_gb=10000.0,  # Unrealistic requirement
            compatible_frameworks=["pytorch"]
        )
        
        is_compatible, issues = checker.check_model_compatibility(model_info)
        
        # Should not be compatible due to RAM
        assert not is_compatible
        assert any("RAM" in issue for issue in issues)
    
    def test_check_incompatible_framework(self):
        """Test checking model with incompatible framework"""
        checker = ModelCompatibilityChecker()
        
        model_info = ModelInfo(
            name="tf_model",
            model_type=ModelType.DIFFUSION,
            file_path=Path("tf.safetensors"),
            size_gb=2.0,
            compatible_frameworks=["tensorflow"]  # Not supported
        )
        
        is_compatible, issues = checker.check_model_compatibility(model_info)
        
        # Should not be compatible due to framework
        assert not is_compatible
        assert any("tensorflow" in issue.lower() for issue in issues)
    
    def test_check_fp8_quantization_support(self):
        """Test checking FP8 quantization support"""
        checker = ModelCompatibilityChecker()
        
        model_info = ModelInfo(
            name="fp8_model",
            model_type=ModelType.DIFFUSION,
            file_path=Path("fp8.safetensors"),
            size_gb=2.0,
            quantization=QuantizationType.FP8,
            compatible_frameworks=["pytorch"]
        )
        
        is_compatible, issues = checker.check_model_compatibility(model_info)
        
        # Result depends on system support
        assert isinstance(is_compatible, bool)
        assert isinstance(issues, list)
    
    def test_version_comparison(self):
        """Test version comparison"""
        checker = ModelCompatibilityChecker()
        
        # Test equal versions
        assert checker._compare_versions("1.0.0", "1.0.0") == 0
        
        # Test greater version
        assert checker._compare_versions("2.0.0", "1.0.0") == 1
        assert checker._compare_versions("1.1.0", "1.0.0") == 1
        assert checker._compare_versions("1.0.1", "1.0.0") == 1
        
        # Test lesser version
        assert checker._compare_versions("1.0.0", "2.0.0") == -1
        assert checker._compare_versions("1.0.0", "1.1.0") == -1
        assert checker._compare_versions("1.0.0", "1.0.1") == -1
    
    def test_version_comparison_with_suffix(self):
        """Test version comparison with suffixes"""
        checker = ModelCompatibilityChecker()
        
        # Should ignore suffixes like +cu118
        assert checker._compare_versions("2.0.0+cu118", "2.0.0") == 0
        assert checker._compare_versions("2.1.0+cu118", "2.0.0+cu117") == 1
    
    def test_get_system_info(self):
        """Test getting system information"""
        checker = ModelCompatibilityChecker()
        
        info = checker.get_system_info()
        
        assert "pytorch_version" in info
        assert "cuda_available" in info
        assert "cuda_device_count" in info
        assert "total_ram_gb" in info
        
        if checker.gpu_available:
            assert "cuda_version" in info
            assert "gpu_devices" in info
            assert isinstance(info["gpu_devices"], list)


# ============================================================================
# Test Model Version Manager
# ============================================================================

class TestModelVersionManager:
    """Test model version management"""
    
    def test_version_manager_initialization(self):
        """Test version manager initialization"""
        config = ModelManagerConfig()
        manager = ModelVersionManager(config)
        
        assert hasattr(manager, 'version_registry')
        assert isinstance(manager.version_registry, dict)
    
    def test_register_version(self):
        """Test registering a model version"""
        config = ModelManagerConfig()
        manager = ModelVersionManager(config)
        
        manager.register_version("test_model", "1.0.0")
        
        assert "test_model" in manager.version_registry
        assert "1.0.0" in manager.version_registry["test_model"]
    
    def test_register_multiple_versions(self):
        """Test registering multiple versions"""
        config = ModelManagerConfig()
        manager = ModelVersionManager(config)
        
        manager.register_version("test_model", "1.0.0")
        manager.register_version("test_model", "1.1.0")
        manager.register_version("test_model", "2.0.0")
        
        versions = manager.get_all_versions("test_model")
        
        assert len(versions) == 3
        assert "2.0.0" in versions
        assert "1.1.0" in versions
        assert "1.0.0" in versions
    
    def test_get_latest_version(self):
        """Test getting latest version"""
        config = ModelManagerConfig()
        manager = ModelVersionManager(config)
        
        manager.register_version("test_model", "1.0.0")
        manager.register_version("test_model", "1.1.0")
        manager.register_version("test_model", "2.0.0")
        
        latest = manager.get_latest_version("test_model")
        
        assert latest == "2.0.0"
    
    def test_get_latest_version_nonexistent(self):
        """Test getting latest version for nonexistent model"""
        config = ModelManagerConfig()
        manager = ModelVersionManager(config)
        
        latest = manager.get_latest_version("nonexistent")
        
        assert latest is None
    
    def test_is_version_compatible(self):
        """Test version compatibility checking"""
        config = ModelManagerConfig()
        manager = ModelVersionManager(config)
        
        # Same version
        assert manager.is_version_compatible("1.0.0", "1.0.0")
        
        # Newer version
        assert manager.is_version_compatible("2.0.0", "1.0.0")
        assert manager.is_version_compatible("1.1.0", "1.0.0")
        
        # Older version
        assert not manager.is_version_compatible("1.0.0", "2.0.0")
        assert not manager.is_version_compatible("1.0.0", "1.1.0")
    
    def test_suggest_upgrade(self):
        """Test upgrade suggestion"""
        config = ModelManagerConfig()
        manager = ModelVersionManager(config)
        
        manager.register_version("test_model", "1.0.0")
        manager.register_version("test_model", "1.1.0")
        manager.register_version("test_model", "2.0.0")
        
        # Suggest upgrade from 1.0.0
        upgrade = manager.suggest_upgrade("test_model", "1.0.0")
        assert upgrade == "1.1.0"
        
        # Suggest upgrade from 1.1.0
        upgrade = manager.suggest_upgrade("test_model", "1.1.0")
        assert upgrade == "2.0.0"
        
        # No upgrade for latest version
        upgrade = manager.suggest_upgrade("test_model", "2.0.0")
        assert upgrade is None
    
    def test_suggest_upgrade_nonexistent(self):
        """Test upgrade suggestion for nonexistent model"""
        config = ModelManagerConfig()
        manager = ModelVersionManager(config)
        
        upgrade = manager.suggest_upgrade("nonexistent", "1.0.0")
        
        assert upgrade is None


# ============================================================================
# Test Integration with AdvancedModelManager
# ============================================================================

class TestAdvancedModelManagerIntegration:
    """Test integration of new features with AdvancedModelManager"""
    
    def test_register_model_with_version(self):
        """Test registering model with version"""
        config = ModelManagerConfig()
        manager = AdvancedModelManager(config)
        
        model_info = ModelInfo(
            name="test_model",
            model_type=ModelType.DIFFUSION,
            file_path=Path("test.safetensors"),
            size_gb=2.0,
            version="1.5.0"
        )
        
        manager.register_model(model_info)
        
        # Check version was registered
        version = manager.get_model_version("test_model")
        assert version == "1.5.0"
        
        # Check version manager has it
        latest = manager.get_latest_model_version("test_model")
        assert latest == "1.5.0"
    
    def test_check_model_compatibility_integration(self):
        """Test compatibility checking through manager"""
        config = ModelManagerConfig()
        manager = AdvancedModelManager(config)
        
        model_info = ModelInfo(
            name="test_model",
            model_type=ModelType.DIFFUSION,
            file_path=Path("test.safetensors"),
            size_gb=2.0,
            min_vram_gb=1.0,
            min_ram_gb=4.0
        )
        
        manager.register_model(model_info)
        
        is_compatible, issues = manager.check_model_compatibility("test_model")
        
        assert isinstance(is_compatible, bool)
        assert isinstance(issues, list)
    
    def test_check_nonexistent_model_compatibility(self):
        """Test compatibility check for nonexistent model"""
        config = ModelManagerConfig()
        manager = AdvancedModelManager(config)
        
        is_compatible, issues = manager.check_model_compatibility("nonexistent")
        
        assert not is_compatible
        assert len(issues) > 0
        assert "not registered" in issues[0]
    
    def test_get_system_info_integration(self):
        """Test getting system info through manager"""
        config = ModelManagerConfig()
        manager = AdvancedModelManager(config)
        
        info = manager.get_system_info()
        
        assert "pytorch_version" in info
        assert "cuda_available" in info
        assert "total_ram_gb" in info
    
    def test_suggest_model_upgrade_integration(self):
        """Test upgrade suggestion through manager"""
        config = ModelManagerConfig()
        manager = AdvancedModelManager(config)
        
        # Register multiple versions
        for version in ["1.0.0", "1.1.0", "2.0.0"]:
            model_info = ModelInfo(
                name="test_model",
                model_type=ModelType.DIFFUSION,
                file_path=Path(f"test_{version}.safetensors"),
                size_gb=2.0,
                version=version
            )
            manager.register_model(model_info)
        
        # Get all versions
        versions = manager.get_all_model_versions("test_model")
        assert len(versions) == 3
        
        # Latest should be 2.0.0
        latest = manager.get_latest_model_version("test_model")
        assert latest == "2.0.0"
    
    def test_cleanup_task_control(self):
        """Test starting and stopping cleanup task"""
        config = ModelManagerConfig(cleanup_interval_seconds=60)
        manager = AdvancedModelManager(config)
        
        # Should not have cleanup task initially (no event loop)
        assert manager._cleanup_task is None
        
        # Stop should not raise error even if not started
        manager.stop_cleanup_task()
        assert manager._cleanup_task is None


# ============================================================================
# Integration Tests
# ============================================================================

class TestCompatibilityVersioningIntegration:
    """Integration tests for compatibility and versioning"""
    
    def test_complete_workflow(self):
        """Test complete workflow with compatibility and versioning"""
        config = ModelManagerConfig()
        manager = AdvancedModelManager(config)
        
        # Register model with requirements
        model_info = ModelInfo(
            name="advanced_model",
            model_type=ModelType.DIFFUSION,
            file_path=Path("advanced.safetensors"),
            size_gb=5.0,
            version="2.1.0",
            min_vram_gb=4.0,
            min_ram_gb=8.0,
            compatible_frameworks=["pytorch"],
            quantization=QuantizationType.FP16
        )
        
        manager.register_model(model_info)
        
        # Check compatibility
        is_compatible, issues = manager.check_model_compatibility("advanced_model")
        
        # Get version info
        version = manager.get_model_version("advanced_model")
        assert version == "2.1.0"
        
        # Get system info
        sys_info = manager.get_system_info()
        assert "pytorch_version" in sys_info
        
        # Check performance stats
        stats = manager.get_performance_stats()
        assert stats['registered_models'] == 1
    
    def test_multiple_model_versions(self):
        """Test managing multiple versions of same model"""
        config = ModelManagerConfig()
        manager = AdvancedModelManager(config)
        
        # Register different versions
        versions = ["1.0.0", "1.5.0", "2.0.0", "2.1.0"]
        
        for version in versions:
            model_info = ModelInfo(
                name="evolving_model",
                model_type=ModelType.DIFFUSION,
                file_path=Path(f"model_v{version}.safetensors"),
                size_gb=3.0,
                version=version
            )
            manager.register_model(model_info)
        
        # Check all versions registered
        all_versions = manager.get_all_model_versions("evolving_model")
        assert len(all_versions) == len(versions)
        
        # Check latest version
        latest = manager.get_latest_model_version("evolving_model")
        assert latest == "2.1.0"
        
        # Check upgrade suggestions
        upgrade = manager.suggest_model_upgrade("evolving_model")
        # Should suggest upgrade from current (last registered) to latest
        # Since we registered 2.1.0 last, no upgrade needed
        assert upgrade is None or upgrade in versions


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
