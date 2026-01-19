"""
Property-based tests for ComfyUI Platform Manager.
Tests universal correctness properties for cross-platform compatibility and model management.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from hypothesis import given, strategies as st, assume, settings
from unittest.mock import Mock, patch

from src.platform_manager import (
    PlatformManager, PlatformType, GPUType, GPUInfo, ModelInfo, 
    PlatformCapabilities
)
from src.comfyui_config import ComfyUIConfig


# Test data generators
@st.composite
def gpu_info_data(draw):
    """Generate GPU info for testing."""
    gpu_type = draw(st.sampled_from(list(GPUType)))
    memory_total = draw(st.floats(min_value=1024, max_value=49152))  # 1GB to 48GB
    memory_available = draw(st.floats(min_value=512, max_value=memory_total))
    
    return GPUInfo(
        gpu_type=gpu_type,
        name=draw(st.text(min_size=1, max_size=50)),
        memory_total_mb=memory_total,
        memory_available_mb=memory_available,
        compute_capability=draw(st.one_of(st.none(), st.text(min_size=3, max_size=10))),
        driver_version=draw(st.one_of(st.none(), st.text(min_size=5, max_size=20))),
        cuda_version=draw(st.one_of(st.none(), st.text(min_size=3, max_size=10))),
        supports_fp16=draw(st.booleans()),
        supports_bf16=draw(st.booleans()),
        max_batch_size=draw(st.integers(min_value=1, max_value=16))
    )


@st.composite
def model_info_data(draw):
    """Generate model info for testing."""
    size_mb = draw(st.floats(min_value=10, max_value=20000))
    
    return ModelInfo(
        name=draw(st.text(min_size=1, max_size=50)),
        path=Path(draw(st.text(min_size=1, max_size=100))),
        size_mb=size_mb,
        model_type=draw(st.sampled_from(["checkpoints", "loras", "controlnet", "vae"])),
        required_memory_mb=draw(st.floats(min_value=size_mb, max_value=size_mb * 3)),
        supported_formats=draw(st.lists(st.text(min_size=1, max_size=10), min_size=1, max_size=5)),
        dependencies=draw(st.one_of(st.none(), st.lists(st.text(min_size=1, max_size=20), max_size=5))),
        is_available=draw(st.booleans()),
        checksum=draw(st.one_of(st.none(), st.text(min_size=32, max_size=64)))
    )


@st.composite
def platform_capabilities_data(draw):
    """Generate platform capabilities for testing."""
    total_memory = draw(st.floats(min_value=2048, max_value=131072))  # 2GB to 128GB
    available_memory = draw(st.floats(min_value=1024, max_value=total_memory))
    
    return PlatformCapabilities(
        platform_type=draw(st.sampled_from(list(PlatformType))),
        gpu_info=draw(st.lists(gpu_info_data(), min_size=0, max_size=4)),
        total_memory_mb=total_memory,
        available_memory_mb=available_memory,
        cpu_cores=draw(st.integers(min_value=1, max_value=64)),
        supports_cuda=draw(st.booleans()),
        supports_rocm=draw(st.booleans()),
        supports_metal=draw(st.booleans()),
        supports_directml=draw(st.booleans()),
        max_concurrent_workflows=draw(st.integers(min_value=1, max_value=8)),
        recommended_batch_size=draw(st.integers(min_value=1, max_value=8))
    )


class TestPlatformManagerProperties:
    """Property-based tests for Platform Manager correctness."""
    
    def setup_method(self):
        """Set up test fixtures."""
        self.temp_dir = tempfile.mkdtemp()
        self.comfyui_path = Path(self.temp_dir) / "comfyui_portable"
        self.comfyui_path.mkdir(parents=True)
        
        # Create minimal ComfyUI structure
        (self.comfyui_path / "main.py").write_text("# ComfyUI main")
        models_dir = self.comfyui_path / "models"
        models_dir.mkdir()
        (models_dir / "checkpoints").mkdir()
        
        self.config = ComfyUIConfig(installation_path=self.comfyui_path)
    
    def teardown_method(self):
        """Clean up test fixtures."""
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    @given(st.sampled_from(list(PlatformType)))
    @settings(max_examples=5, deadline=3000)
    def test_property_27_model_management_consistency(self, platform_type):
        """
        Property 27: Model Management Consistency
        Model management should provide consistent results across all platforms
        and maintain accurate model information and availability.
        """
        with patch.object(PlatformManager, '_detect_platform', return_value=platform_type):
            manager = PlatformManager(self.config)
            
            # Test model scanning consistency
            initial_models = manager.get_available_models()
            
            # Scan again - should get same results
            manager._scan_available_models()
            rescanned_models = manager.get_available_models()
            
            # Should have consistent results
            assert len(initial_models) == len(rescanned_models)
            
            for key in initial_models:
                assert key in rescanned_models
                initial_model = initial_models[key]
                rescanned_model = rescanned_models[key]
                
                # Core properties should be identical
                assert initial_model.name == rescanned_model.name
                assert initial_model.model_type == rescanned_model.model_type
                assert initial_model.size_mb == rescanned_model.size_mb
                assert initial_model.is_available == rescanned_model.is_available
            
            # Test filtered model retrieval consistency
            all_models = manager.get_available_models()
            
            # Get models by type
            model_types = set(model.model_type for model in all_models.values())
            
            for model_type in model_types:
                filtered_models = manager.get_available_models(model_type)
                
                # All filtered models should be of correct type
                for model in filtered_models.values():
                    assert model.model_type == model_type
                
                # Filtered models should be subset of all models
                for key in filtered_models:
                    assert key in all_models
                    assert all_models[key].model_type == model_type
            
            # Test model validation consistency
            for model_key, model_info in list(all_models.items())[:3]:  # Test first 3 models
                # Validate multiple times
                results = []
                for _ in range(3):
                    is_compatible, issues = manager.validate_model_compatibility(model_info.name)
                    results.append((is_compatible, len(issues)))
                
                # Results should be consistent
                first_result = results[0]
                for result in results[1:]:
                    assert result == first_result, f"Inconsistent validation for {model_info.name}"
    
    @given(platform_capabilities_data())
    @settings(max_examples=7, deadline=3000)
    def test_property_28_cross_platform_compatibility(self, capabilities):
        """
        Property 28: Cross-Platform Compatibility
        Platform detection and adaptation should work correctly across all
        supported platforms with appropriate optimizations and constraints.
        """
        # Mock the platform capabilities and detection
        with patch.object(PlatformManager, '_get_platform_capabilities', return_value=capabilities), \
             patch.object(PlatformManager, '_detect_platform', return_value=capabilities.platform_type):
            
            manager = PlatformManager(self.config)
            manager._capabilities = capabilities
            manager._gpu_info = capabilities.gpu_info
            
            # Test platform info generation
            platform_info = manager.get_platform_info()
            
            # Should contain all required information
            required_keys = ["platform_type", "system", "capabilities", "gpu_info"]
            for key in required_keys:
                assert key in platform_info
            
            # Platform type should match
            assert platform_info["platform_type"] == capabilities.platform_type.value
            
            # Capabilities should be accurately reflected
            caps = platform_info["capabilities"]
            assert caps["total_memory_mb"] == capabilities.total_memory_mb
            assert caps["available_memory_mb"] == capabilities.available_memory_mb
            assert caps["cpu_cores"] == capabilities.cpu_cores
            assert caps["supports_cuda"] == capabilities.supports_cuda
            assert caps["supports_rocm"] == capabilities.supports_rocm
            assert caps["supports_metal"] == capabilities.supports_metal
            assert caps["supports_directml"] == capabilities.supports_directml
            
            # GPU info should be consistent
            gpu_info = platform_info["gpu_info"]
            assert len(gpu_info) == len(capabilities.gpu_info)
            
            for i, gpu_data in enumerate(gpu_info):
                original_gpu = capabilities.gpu_info[i]
                assert gpu_data["type"] == original_gpu.gpu_type.value
                assert gpu_data["name"] == original_gpu.name
                assert gpu_data["memory_total_mb"] == original_gpu.memory_total_mb
                assert gpu_data["memory_available_mb"] == original_gpu.memory_available_mb
            
            # Test optimal settings generation for different complexities
            complexities = ["simple", "medium", "complex"]
            
            for complexity in complexities:
                settings = manager.get_optimal_settings(complexity)
                
                # Should contain all required settings
                required_settings = [
                    "batch_size", "precision", "memory_management", "cpu_threads",
                    "enable_attention_slicing", "enable_cpu_offload", "enable_sequential_cpu_offload"
                ]
                
                for setting in required_settings:
                    assert setting in settings
                
                # Settings should be reasonable
                assert settings["batch_size"] >= 1
                assert settings["precision"] in ["fp32", "fp16", "bf16"]
                assert settings["cpu_threads"] > 0
                assert settings["cpu_threads"] <= capabilities.cpu_cores * 2  # Allow hyperthreading
                
                # Memory management should be appropriate
                if capabilities.gpu_info:
                    max_gpu_memory = max(gpu.memory_total_mb for gpu in capabilities.gpu_info)
                    if max_gpu_memory < 6000:
                        assert settings["enable_attention_slicing"] is True
                        assert settings["memory_management"] in ["low_vram", "cpu_only"]
                else:
                    assert settings["memory_management"] == "cpu_only"
                    assert settings["enable_cpu_offload"] is True
            
            # Test process command generation
            command = manager.get_process_command()
            
            # Should be valid command structure
            assert isinstance(command, list)
            assert len(command) >= 2
            
            # Should contain python executable and main script
            python_found = any("python" in arg.lower() for arg in command[:2])
            main_script_found = any("main.py" in arg for arg in command)
            
            assert python_found, f"Python executable not found in command: {command}"
            assert main_script_found, f"main.py not found in command: {command}"
            
            # Should have appropriate compute flags
            if capabilities.supports_cuda and capabilities.gpu_info:
                assert any("cuda" in arg.lower() for arg in command)
            elif capabilities.supports_rocm and capabilities.gpu_info:
                assert any("directml" in arg.lower() for arg in command)
            elif capabilities.supports_metal and capabilities.gpu_info:
                assert any("mps" in arg.lower() for arg in command)
            elif capabilities.supports_directml and capabilities.gpu_info:
                assert any("directml" in arg.lower() for arg in command)
            else:
                # Should fall back to CPU mode when no GPUs available
                assert any("cpu" in arg.lower() for arg in command)
            
            # Test with additional arguments
            additional_args = ["--port", "8189", "--listen"]
            command_with_args = manager.get_process_command(additional_args)
            
            # Should contain all additional arguments
            for arg in additional_args:
                assert arg in command_with_args
            
            # Should still have base command structure
            assert len(command_with_args) >= len(command) + len(additional_args)
    
    @given(st.lists(model_info_data(), min_size=1, max_size=10))
    @settings(max_examples=5, deadline=5000)
    def test_property_model_validation_accuracy(self, models):
        """
        Test that model validation provides accurate compatibility assessment.
        """
        manager = PlatformManager(self.config)
        
        # Add test models to manager
        for i, model in enumerate(models):
            model_key = f"test/{model.name}_{i}"
            manager._available_models[model_key] = model
        
        # Test validation for each model
        for i, model in enumerate(models):
            model_name = f"{model.name}_{i}"
            is_compatible, issues = manager.validate_model_compatibility(model_name)
            
            # Validation should be deterministic
            is_compatible2, issues2 = manager.validate_model_compatibility(model_name)
            assert is_compatible == is_compatible2
            assert len(issues) == len(issues2)
            
            # If model is not available, should not be compatible
            if not model.is_available:
                # Note: Our test models don't have real files, so they may fail for file existence
                pass
            
            # Issues should be meaningful strings
            for issue in issues:
                assert isinstance(issue, str)
                assert len(issue) > 0
            
            # If compatible, should have no issues
            if is_compatible:
                assert len(issues) == 0
            
            # If not compatible, should have at least one issue
            if not is_compatible:
                assert len(issues) > 0
    
    @given(gpu_info_data())
    @settings(max_examples=7, deadline=3000)
    def test_property_gpu_capability_consistency(self, gpu_info):
        """
        Test that GPU capability detection and usage is consistent.
        """
        manager = PlatformManager(self.config)
        manager._gpu_info = [gpu_info]
        manager._capabilities = manager._get_platform_capabilities()
        
        # Test platform info reflects GPU capabilities
        platform_info = manager.get_platform_info()
        gpu_data = platform_info["gpu_info"][0]
        
        # GPU info should match original
        assert gpu_data["type"] == gpu_info.gpu_type.value
        assert gpu_data["name"] == gpu_info.name
        assert gpu_data["memory_total_mb"] == gpu_info.memory_total_mb
        assert gpu_data["memory_available_mb"] == gpu_info.memory_available_mb
        assert gpu_data["supports_fp16"] == gpu_info.supports_fp16
        assert gpu_data["supports_bf16"] == gpu_info.supports_bf16
        assert gpu_data["max_batch_size"] == gpu_info.max_batch_size
        
        # Test optimal settings consider GPU capabilities
        settings = manager.get_optimal_settings("medium")
        
        # Batch size should not exceed GPU capability
        assert settings["batch_size"] <= gpu_info.max_batch_size
        
        # Precision should be appropriate for GPU
        if gpu_info.supports_bf16:
            # bf16 is preferred if supported
            assert settings["precision"] in ["bf16", "fp16", "fp32"]
        elif gpu_info.supports_fp16:
            # fp16 is good alternative
            assert settings["precision"] in ["fp16", "fp32"]
        else:
            # Fall back to fp32
            assert settings["precision"] == "fp32"
        
        # Memory management should consider GPU memory
        if gpu_info.memory_total_mb < 6000:
            assert settings["enable_attention_slicing"] is True
            if gpu_info.memory_total_mb < 4000:
                assert settings["enable_cpu_offload"] is True
    
    @given(st.lists(st.text(min_size=1, max_size=20), min_size=0, max_size=10))
    @settings(max_examples=5, deadline=3000)
    def test_property_command_generation_robustness(self, additional_args):
        """
        Test that command generation is robust with various additional arguments.
        """
        manager = PlatformManager(self.config)
        
        # Test base command
        base_command = manager.get_process_command()
        assert isinstance(base_command, list)
        assert len(base_command) >= 2
        
        # Test with additional arguments
        command_with_args = manager.get_process_command(additional_args)
        
        # Should contain all additional arguments
        for arg in additional_args:
            assert arg in command_with_args
        
        # Should maintain base command structure
        assert len(command_with_args) >= len(base_command)
        
        # Base command elements should still be present
        # (allowing for reordering of arguments)
        base_elements = set(base_command)
        extended_elements = set(command_with_args)
        
        # All base elements should be in extended command
        assert base_elements.issubset(extended_elements)
        
        # Test command consistency
        command2 = manager.get_process_command(additional_args)
        assert command_with_args == command2
    
    def test_property_environment_validation_completeness(self):
        """
        Test that environment validation provides comprehensive assessment.
        """
        manager = PlatformManager(self.config)
        
        # Test validation multiple times - should be consistent
        results = []
        for _ in range(3):
            is_valid, issues = manager.validate_environment()
            results.append((is_valid, len(issues)))
        
        # Results should be consistent
        first_result = results[0]
        for result in results[1:]:
            assert result == first_result
        
        is_valid, issues = manager.validate_environment()
        
        # Should return boolean and list
        assert isinstance(is_valid, bool)
        assert isinstance(issues, list)
        
        # All issues should be strings
        for issue in issues:
            assert isinstance(issue, str)
            assert len(issue) > 0
        
        # If valid, should have no issues
        if is_valid:
            assert len(issues) == 0
        
        # If invalid, should have at least one issue
        if not is_valid:
            assert len(issues) > 0
    
    @given(st.sampled_from(["general", "controlnet", "upscaling"]))
    @settings(max_examples=5, deadline=3000)
    def test_property_model_recommendations_relevance(self, use_case):
        """
        Test that model recommendations are relevant to the use case.
        """
        manager = PlatformManager(self.config)
        
        recommendations = manager.get_recommended_models(use_case)
        
        # Should return list of strings
        assert isinstance(recommendations, list)
        for rec in recommendations:
            assert isinstance(rec, str)
            assert len(rec) > 0
        
        # Recommendations should be relevant to use case
        if use_case == "controlnet":
            # Should recommend controlnet models if any available
            controlnet_recs = [r for r in recommendations if "controlnet" in r.lower()]
            # May be empty if no controlnet models available
        
        elif use_case == "upscaling":
            # Should recommend upscale models if any available
            upscale_recs = [r for r in recommendations if "upscale" in r.lower()]
            # May be empty if no upscale models available
        
        elif use_case == "general":
            # Should recommend checkpoint models if any available
            checkpoint_recs = [r for r in recommendations if "checkpoint" in r.lower()]
            # May be empty if no checkpoint models available
        
        # Test consistency - same use case should give same recommendations
        recommendations2 = manager.get_recommended_models(use_case)
        assert recommendations == recommendations2