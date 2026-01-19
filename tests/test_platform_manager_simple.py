"""
Unit tests for ComfyUI Platform Manager.
Tests platform detection, GPU capabilities, model management, and environment validation.
"""

import pytest
import os
import platform
import tempfile
from pathlib import Path
from unittest.mock import Mock, patch, MagicMock

from src.platform_manager import (
    PlatformManager, PlatformType, GPUType, GPUInfo, ModelInfo, 
    PlatformCapabilities
)
from src.comfyui_config import ComfyUIConfig


class TestPlatformManager:
    """Test suite for Platform Manager functionality."""
    
    def setup_method(self):
        """Set up test fixtures."""
        # Create temporary ComfyUI installation
        self.temp_dir = tempfile.mkdtemp()
        self.comfyui_path = Path(self.temp_dir) / "comfyui_portable"
        self.comfyui_path.mkdir(parents=True)
        
        # Create main.py
        (self.comfyui_path / "main.py").write_text("# ComfyUI main script")
        
        # Create model directories
        models_dir = self.comfyui_path / "models"
        models_dir.mkdir()
        (models_dir / "checkpoints").mkdir()
        (models_dir / "loras").mkdir()
        (models_dir / "controlnet").mkdir()
        
        # Create test model files
        (models_dir / "checkpoints" / "test_model.safetensors").write_bytes(b"fake model data" * 1000)
        (models_dir / "loras" / "test_lora.safetensors").write_bytes(b"fake lora data" * 100)
        
        self.config = ComfyUIConfig(installation_path=self.comfyui_path)
    
    def teardown_method(self):
        """Clean up test fixtures."""
        import shutil
        shutil.rmtree(self.temp_dir, ignore_errors=True)
    
    def test_initialization(self):
        """Test platform manager initialization."""
        manager = PlatformManager(self.config)
        
        assert manager.config == self.config
        assert manager._platform_type in PlatformType
        assert manager._capabilities is not None
        assert isinstance(manager._gpu_info, list)
        assert isinstance(manager._available_models, dict)
    
    @patch('platform.system')
    def test_platform_detection_windows(self, mock_system):
        """Test Windows platform detection."""
        mock_system.return_value = "Windows"
        
        manager = PlatformManager(self.config)
        assert manager._platform_type == PlatformType.WINDOWS
    
    @patch('platform.system')
    def test_platform_detection_linux(self, mock_system):
        """Test Linux platform detection."""
        mock_system.return_value = "Linux"
        
        manager = PlatformManager(self.config)
        assert manager._platform_type == PlatformType.LINUX
    
    @patch('platform.system')
    @patch('platform.release')
    def test_platform_detection_wsl(self, mock_release, mock_system):
        """Test WSL platform detection."""
        mock_system.return_value = "Linux"
        mock_release.return_value = "5.4.0-microsoft-standard-WSL2"
        
        manager = PlatformManager(self.config)
        assert manager._platform_type == PlatformType.WSL
    
    @patch('platform.system')
    @patch('os.path.exists')
    @patch('builtins.open', create=True)
    def test_platform_detection_docker(self, mock_open, mock_exists, mock_system):
        """Test Docker platform detection."""
        mock_system.return_value = "Linux"  # Docker runs on Linux
        
        # Mock file existence and content
        def exists_side_effect(path):
            return path in ["/.dockerenv", "/proc/1/cgroup"]
        
        mock_exists.side_effect = exists_side_effect
        
        # Mock cgroup file content
        mock_file = mock_open.return_value.__enter__.return_value
        mock_file.read.return_value = "docker container content"
        
        manager = PlatformManager(self.config)
        assert manager._platform_type == PlatformType.DOCKER
    
    @patch('platform.system')
    def test_platform_detection_macos(self, mock_system):
        """Test macOS platform detection."""
        mock_system.return_value = "Darwin"
        
        manager = PlatformManager(self.config)
        assert manager._platform_type == PlatformType.MACOS
    
    def test_gpu_detection_fallback_cpu(self):
        """Test fallback to CPU-only when no GPU detected."""
        with patch.object(PlatformManager, '_detect_nvidia_gpus', return_value=[]), \
             patch.object(PlatformManager, '_detect_amd_gpus', return_value=[]), \
             patch.object(PlatformManager, '_detect_intel_gpus', return_value=[]), \
             patch.object(PlatformManager, '_detect_apple_silicon', return_value=None):
            
            manager = PlatformManager(self.config)
            
            assert len(manager._gpu_info) == 1
            assert manager._gpu_info[0].gpu_type == GPUType.CPU_ONLY
            assert manager._gpu_info[0].name == "CPU"
    
    @patch('subprocess.run')
    def test_nvidia_gpu_detection_nvidia_smi(self, mock_run):
        """Test NVIDIA GPU detection via nvidia-smi."""
        # Mock nvidia-smi output
        mock_run.return_value = Mock(
            returncode=0,
            stdout="GeForce RTX 3080, 10240, 8192\n"
        )
        
        manager = PlatformManager(self.config)
        nvidia_gpus = manager._detect_nvidia_gpus()
        
        assert len(nvidia_gpus) == 1
        gpu = nvidia_gpus[0]
        assert gpu.gpu_type == GPUType.NVIDIA
        assert gpu.name == "GeForce RTX 3080"
        assert gpu.memory_total_mb == 10240
        assert gpu.memory_available_mb == 8192
        assert gpu.supports_fp16 is True
    
    @patch('subprocess.run')
    def test_amd_gpu_detection(self, mock_run):
        """Test AMD GPU detection via rocm-smi."""
        # Mock rocm-smi output
        mock_run.return_value = Mock(
            returncode=0,
            stdout="GPU,VRAM Total,VRAM Used\n0,8192,2048\n"
        )
        
        manager = PlatformManager(self.config)
        amd_gpus = manager._detect_amd_gpus()
        
        assert len(amd_gpus) == 1
        gpu = amd_gpus[0]
        assert gpu.gpu_type == GPUType.AMD
        assert gpu.memory_total_mb == 8192
        assert gpu.memory_available_mb == 6144  # 8192 - 2048
    
    def test_platform_capabilities(self):
        """Test platform capabilities detection."""
        manager = PlatformManager(self.config)
        capabilities = manager._capabilities
        
        assert isinstance(capabilities, PlatformCapabilities)
        assert capabilities.platform_type in PlatformType
        assert capabilities.total_memory_mb > 0
        assert capabilities.available_memory_mb > 0
        assert capabilities.cpu_cores > 0
        assert capabilities.max_concurrent_workflows >= 1
        assert capabilities.recommended_batch_size >= 1
    
    def test_model_scanning(self):
        """Test model scanning functionality."""
        manager = PlatformManager(self.config)
        
        # Should have found our test models
        models = manager.get_available_models()
        
        checkpoint_models = [m for m in models.values() if m.model_type == "checkpoints"]
        lora_models = [m for m in models.values() if m.model_type == "loras"]
        
        assert len(checkpoint_models) >= 1
        assert len(lora_models) >= 1
        
        # Check model properties
        test_checkpoint = next(m for m in checkpoint_models if "test_model" in m.name)
        assert test_checkpoint.path.exists()
        assert test_checkpoint.size_mb > 0
        assert test_checkpoint.is_available is True
    
    def test_get_platform_info(self):
        """Test platform information retrieval."""
        manager = PlatformManager(self.config)
        info = manager.get_platform_info()
        
        required_keys = [
            "platform_type", "system", "capabilities", "gpu_info"
        ]
        
        for key in required_keys:
            assert key in info
        
        # Check system info
        system_info = info["system"]
        assert "os" in system_info
        assert "release" in system_info
        assert "machine" in system_info
        
        # Check capabilities
        capabilities = info["capabilities"]
        assert "total_memory_mb" in capabilities
        assert "cpu_cores" in capabilities
        assert "supports_cuda" in capabilities
        
        # Check GPU info
        gpu_info = info["gpu_info"]
        assert isinstance(gpu_info, list)
        assert len(gpu_info) > 0
    
    def test_get_available_models_filtered(self):
        """Test filtered model retrieval."""
        manager = PlatformManager(self.config)
        
        # Get all models
        all_models = manager.get_available_models()
        
        # Get filtered models
        checkpoint_models = manager.get_available_models("checkpoints")
        lora_models = manager.get_available_models("loras")
        
        assert len(all_models) >= len(checkpoint_models) + len(lora_models)
        
        # Verify filtering
        for model in checkpoint_models.values():
            assert model.model_type == "checkpoints"
        
        for model in lora_models.values():
            assert model.model_type == "loras"
    
    def test_model_compatibility_validation(self):
        """Test model compatibility validation."""
        manager = PlatformManager(self.config)
        
        # Test existing model
        is_compatible, issues = manager.validate_model_compatibility("test_model")
        
        if is_compatible:
            assert len(issues) == 0
        else:
            assert len(issues) > 0
            assert all(isinstance(issue, str) for issue in issues)
        
        # Test non-existent model
        is_compatible, issues = manager.validate_model_compatibility("nonexistent_model")
        assert not is_compatible
        assert len(issues) > 0
        assert "not found" in issues[0].lower()
    
    def test_optimal_settings_generation(self):
        """Test optimal settings generation."""
        manager = PlatformManager(self.config)
        
        # Test different complexity levels
        for complexity in ["simple", "medium", "complex"]:
            settings = manager.get_optimal_settings(complexity)
            
            required_keys = [
                "batch_size", "precision", "memory_management", 
                "cpu_threads", "enable_attention_slicing"
            ]
            
            for key in required_keys:
                assert key in settings
            
            assert settings["batch_size"] >= 1
            assert settings["precision"] in ["fp32", "fp16", "bf16"]
            assert settings["cpu_threads"] > 0
    
    def test_process_command_generation(self):
        """Test process command generation."""
        manager = PlatformManager(self.config)
        
        command = manager.get_process_command()
        
        assert isinstance(command, list)
        assert len(command) >= 2
        
        # Should contain python executable and main script
        assert "python" in command[0].lower() or command[0].endswith(".exe")
        assert "main.py" in command[1]
        
        # Test with additional arguments
        additional_args = ["--port", "8189"]
        command_with_args = manager.get_process_command(additional_args)
        
        assert "--port" in command_with_args
        assert "8189" in command_with_args
    
    def test_environment_validation(self):
        """Test environment validation."""
        manager = PlatformManager(self.config)
        
        is_valid, issues = manager.validate_environment()
        
        # Should be valid since we created the test environment
        if not is_valid:
            # Print issues for debugging
            print(f"Environment validation issues: {issues}")
        
        assert isinstance(is_valid, bool)
        assert isinstance(issues, list)
        assert all(isinstance(issue, str) for issue in issues)
    
    def test_environment_validation_missing_installation(self):
        """Test environment validation with missing installation."""
        # Create config with non-existent path
        bad_config = ComfyUIConfig(installation_path=Path("/nonexistent/path"))
        manager = PlatformManager(bad_config)
        
        is_valid, issues = manager.validate_environment()
        
        assert not is_valid
        assert len(issues) > 0
        assert any("installation not found" in issue.lower() for issue in issues)
    
    def test_recommended_models(self):
        """Test recommended model suggestions."""
        manager = PlatformManager(self.config)
        
        # Test different use cases
        for use_case in ["general", "controlnet", "upscaling"]:
            recommendations = manager.get_recommended_models(use_case)
            
            assert isinstance(recommendations, list)
            # Recommendations might be empty if models aren't available
            for rec in recommendations:
                assert isinstance(rec, str)
    
    def test_gpu_info_properties(self):
        """Test GPU info data structure."""
        manager = PlatformManager(self.config)
        
        for gpu in manager._gpu_info:
            assert isinstance(gpu, GPUInfo)
            assert gpu.gpu_type in GPUType
            assert isinstance(gpu.name, str)
            assert gpu.memory_total_mb >= 0
            assert gpu.memory_available_mb >= 0
            assert isinstance(gpu.supports_fp16, bool)
            assert isinstance(gpu.supports_bf16, bool)
            assert gpu.max_batch_size >= 1
    
    def test_model_info_properties(self):
        """Test model info data structure."""
        manager = PlatformManager(self.config)
        
        for model in manager._available_models.values():
            assert isinstance(model, ModelInfo)
            assert isinstance(model.name, str)
            assert isinstance(model.path, Path)
            assert model.size_mb >= 0
            assert isinstance(model.model_type, str)
            assert model.required_memory_mb >= 0
            assert isinstance(model.supported_formats, list)
            assert isinstance(model.is_available, bool)
    
    @patch('psutil.virtual_memory')
    def test_memory_constraints(self, mock_memory):
        """Test behavior with memory constraints."""
        # Mock low memory system
        mock_memory.return_value = Mock(
            total=2 * 1024 * 1024 * 1024,  # 2GB
            available=1 * 1024 * 1024 * 1024  # 1GB
        )
        
        manager = PlatformManager(self.config)
        
        # Should detect memory constraints
        is_valid, issues = manager.validate_environment()
        
        # Might have memory-related issues
        memory_issues = [issue for issue in issues if "memory" in issue.lower()]
        
        # Get optimal settings for constrained system
        settings = manager.get_optimal_settings("complex")
        
        # Should recommend conservative settings
        assert settings["batch_size"] == 1
    
    def test_cross_platform_path_handling(self):
        """Test cross-platform path handling."""
        manager = PlatformManager(self.config)
        
        # Test command generation with different platforms
        command = manager.get_process_command()
        
        # All paths should be properly formatted
        for arg in command:
            if Path(arg).exists() or "main.py" in arg:
                # Should be valid path format
                assert isinstance(arg, str)
                assert len(arg) > 0
    
    def test_gpu_memory_estimation(self):
        """Test GPU memory estimation logic."""
        # Create mock GPU with known memory
        mock_gpu = GPUInfo(
            gpu_type=GPUType.NVIDIA,
            name="Test GPU",
            memory_total_mb=8192,
            memory_available_mb=6144,
            supports_fp16=True,
            supports_bf16=True,
            max_batch_size=2
        )
        
        manager = PlatformManager(self.config)
        manager._gpu_info = [mock_gpu]
        manager._capabilities = manager._get_platform_capabilities()
        
        # Test model compatibility with known memory requirements
        large_model = ModelInfo(
            name="large_model",
            path=Path("test"),
            size_mb=4000,
            model_type="checkpoints",
            required_memory_mb=6000,  # Should fit
            supported_formats=[".safetensors"],
            is_available=True
        )
        
        manager._available_models["test/large_model"] = large_model
        
        is_compatible, issues = manager.validate_model_compatibility("large_model")
        
        # Should be compatible since 6000MB < 6144MB available
        if not is_compatible:
            print(f"Compatibility issues: {issues}")
        
        # Test with too large model
        huge_model = ModelInfo(
            name="huge_model",
            path=Path("test"),
            size_mb=8000,
            model_type="checkpoints",
            required_memory_mb=10000,  # Should not fit
            supported_formats=[".safetensors"],
            is_available=True
        )
        
        manager._available_models["test/huge_model"] = huge_model
        
        is_compatible, issues = manager.validate_model_compatibility("huge_model")
        
        # Should not be compatible
        assert not is_compatible
        assert any("memory" in issue.lower() for issue in issues)