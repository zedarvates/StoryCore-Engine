"""
ComfyUI Platform Manager
Cross-platform compatibility and model management for ComfyUI integration.
"""

import os
import sys
import platform
import subprocess
import psutil
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple, Union
from dataclasses import dataclass
from enum import Enum
import json
import shutil

from .comfyui_config import ComfyUIConfig
from .comfyui_models import SystemStats


class PlatformType(Enum):
    """Supported platform types."""
    WINDOWS = "windows"
    LINUX = "linux"
    MACOS = "macos"
    DOCKER = "docker"
    WSL = "wsl"


class GPUType(Enum):
    """Supported GPU types."""
    NVIDIA = "nvidia"
    AMD = "amd"
    INTEL = "intel"
    APPLE_SILICON = "apple_silicon"
    CPU_ONLY = "cpu_only"


@dataclass
class GPUInfo:
    """GPU information and capabilities."""
    gpu_type: GPUType
    name: str
    memory_total_mb: float
    memory_available_mb: float
    compute_capability: Optional[str] = None
    driver_version: Optional[str] = None
    cuda_version: Optional[str] = None
    supports_fp16: bool = True
    supports_bf16: bool = False
    max_batch_size: int = 1


@dataclass
class ModelInfo:
    """Model information and requirements."""
    name: str
    path: Path
    size_mb: float
    model_type: str  # checkpoint, lora, controlnet, etc.
    required_memory_mb: float
    supported_formats: List[str]
    dependencies: List[str] = None
    is_available: bool = False
    checksum: Optional[str] = None


@dataclass
class PlatformCapabilities:
    """Platform-specific capabilities and limitations."""
    platform_type: PlatformType
    gpu_info: List[GPUInfo]
    total_memory_mb: float
    available_memory_mb: float
    cpu_cores: int
    supports_cuda: bool = False
    supports_rocm: bool = False
    supports_metal: bool = False
    supports_directml: bool = False
    max_concurrent_workflows: int = 1
    recommended_batch_size: int = 1


class PlatformManager:
    """
    Manages cross-platform compatibility and model management for ComfyUI.
    
    Provides platform detection, GPU resource management, model availability
    verification, and environment adaptation.
    """
    
    def __init__(self, config: ComfyUIConfig):
        """Initialize platform manager with configuration."""
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Platform detection
        self._platform_type = self._detect_platform()
        self._capabilities = None
        self._gpu_info = []
        self._available_models = {}
        
        # Initialize platform-specific settings
        self._initialize_platform()
    
    def _detect_platform(self) -> PlatformType:
        """Detect the current platform type."""
        system = platform.system().lower()
        
        # Check for WSL
        if system == "linux" and "microsoft" in platform.release().lower():
            return PlatformType.WSL
        
        # Check for Docker
        if os.path.exists("/.dockerenv") or os.path.exists("/proc/1/cgroup"):
            try:
                with open("/proc/1/cgroup", "r") as f:
                    if "docker" in f.read():
                        return PlatformType.DOCKER
            except:
                pass
        
        # Standard platform detection
        if system == "windows":
            return PlatformType.WINDOWS
        elif system == "linux":
            return PlatformType.LINUX
        elif system == "darwin":
            return PlatformType.MACOS
        else:
            self.logger.warning(f"Unknown platform: {system}, defaulting to Linux")
            return PlatformType.LINUX
    
    def _initialize_platform(self):
        """Initialize platform-specific settings and capabilities."""
        self.logger.info(f"Initializing platform manager for {self._platform_type.value}")
        
        # Detect GPU capabilities
        self._gpu_info = self._detect_gpu_capabilities()
        
        # Get system capabilities
        self._capabilities = self._get_platform_capabilities()
        
        # Scan for available models
        self._scan_available_models()
    
    def _detect_gpu_capabilities(self) -> List[GPUInfo]:
        """Detect available GPU capabilities."""
        gpu_info = []
        
        try:
            # Try NVIDIA GPU detection
            nvidia_gpus = self._detect_nvidia_gpus()
            gpu_info.extend(nvidia_gpus)
        except Exception as e:
            self.logger.debug(f"NVIDIA GPU detection failed: {e}")
        
        try:
            # Try AMD GPU detection
            amd_gpus = self._detect_amd_gpus()
            gpu_info.extend(amd_gpus)
        except Exception as e:
            self.logger.debug(f"AMD GPU detection failed: {e}")
        
        try:
            # Try Intel GPU detection
            intel_gpus = self._detect_intel_gpus()
            gpu_info.extend(intel_gpus)
        except Exception as e:
            self.logger.debug(f"Intel GPU detection failed: {e}")
        
        # Apple Silicon detection
        if self._platform_type == PlatformType.MACOS:
            try:
                apple_gpu = self._detect_apple_silicon()
                if apple_gpu:
                    gpu_info.append(apple_gpu)
            except Exception as e:
                self.logger.debug(f"Apple Silicon detection failed: {e}")
        
        # Fallback to CPU-only
        if not gpu_info:
            gpu_info.append(GPUInfo(
                gpu_type=GPUType.CPU_ONLY,
                name="CPU",
                memory_total_mb=psutil.virtual_memory().total / (1024 * 1024),
                memory_available_mb=psutil.virtual_memory().available / (1024 * 1024),
                supports_fp16=False,
                supports_bf16=False,
                max_batch_size=1
            ))
        
        return gpu_info
    
    def _detect_nvidia_gpus(self) -> List[GPUInfo]:
        """Detect NVIDIA GPUs using nvidia-ml-py or nvidia-smi."""
        gpus = []
        
        try:
            # Try nvidia-ml-py first
            import pynvml
            pynvml.nvmlInit()
            
            device_count = pynvml.nvmlDeviceGetCount()
            for i in range(device_count):
                handle = pynvml.nvmlDeviceGetHandleByIndex(i)
                name = pynvml.nvmlDeviceGetName(handle).decode('utf-8')
                
                # Get memory info
                mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                memory_total = mem_info.total / (1024 * 1024)  # Convert to MB
                memory_free = mem_info.free / (1024 * 1024)
                
                # Get compute capability
                try:
                    major, minor = pynvml.nvmlDeviceGetCudaComputeCapability(handle)
                    compute_capability = f"{major}.{minor}"
                except:
                    compute_capability = None
                
                # Get driver version
                try:
                    driver_version = pynvml.nvmlSystemGetDriverVersion().decode('utf-8')
                except:
                    driver_version = None
                
                # Get CUDA version
                try:
                    cuda_version = pynvml.nvmlSystemGetCudaDriverVersion()
                    cuda_version = f"{cuda_version // 1000}.{(cuda_version % 1000) // 10}"
                except:
                    cuda_version = None
                
                # Determine capabilities
                supports_fp16 = True
                supports_bf16 = compute_capability and float(compute_capability) >= 8.0
                
                # Estimate max batch size based on memory
                max_batch_size = max(1, int(memory_total / 4000))  # Rough estimate
                
                gpus.append(GPUInfo(
                    gpu_type=GPUType.NVIDIA,
                    name=name,
                    memory_total_mb=memory_total,
                    memory_available_mb=memory_free,
                    compute_capability=compute_capability,
                    driver_version=driver_version,
                    cuda_version=cuda_version,
                    supports_fp16=supports_fp16,
                    supports_bf16=supports_bf16,
                    max_batch_size=max_batch_size
                ))
            
            pynvml.nvmlShutdown()
            
        except ImportError:
            # Fallback to nvidia-smi
            try:
                result = subprocess.run(
                    ["nvidia-smi", "--query-gpu=name,memory.total,memory.free", "--format=csv,noheader,nounits"],
                    capture_output=True, text=True, timeout=10
                )
                
                if result.returncode == 0:
                    for line in result.stdout.strip().split('\n'):
                        if line.strip():
                            parts = [p.strip() for p in line.split(',')]
                            if len(parts) >= 3:
                                name = parts[0]
                                memory_total = float(parts[1])
                                memory_free = float(parts[2])
                                
                                gpus.append(GPUInfo(
                                    gpu_type=GPUType.NVIDIA,
                                    name=name,
                                    memory_total_mb=memory_total,
                                    memory_available_mb=memory_free,
                                    supports_fp16=True,
                                    supports_bf16=True,  # Assume modern GPU
                                    max_batch_size=max(1, int(memory_total / 4000))
                                ))
            
            except (subprocess.TimeoutExpired, FileNotFoundError):
                pass
        
        except Exception as e:
            self.logger.debug(f"NVIDIA GPU detection error: {e}")
        
        return gpus
    
    def _detect_amd_gpus(self) -> List[GPUInfo]:
        """Detect AMD GPUs using ROCm tools."""
        gpus = []
        
        try:
            # Try rocm-smi
            result = subprocess.run(
                ["rocm-smi", "--showmeminfo", "vram", "--csv"],
                capture_output=True, text=True, timeout=10
            )
            
            if result.returncode == 0:
                lines = result.stdout.strip().split('\n')
                for line in lines[1:]:  # Skip header
                    if line.strip():
                        parts = [p.strip() for p in line.split(',')]
                        if len(parts) >= 3:
                            gpu_id = parts[0]
                            memory_total = float(parts[1]) if parts[1] != 'N/A' else 8192
                            memory_used = float(parts[2]) if parts[2] != 'N/A' else 0
                            memory_free = memory_total - memory_used
                            
                            gpus.append(GPUInfo(
                                gpu_type=GPUType.AMD,
                                name=f"AMD GPU {gpu_id}",
                                memory_total_mb=memory_total,
                                memory_available_mb=memory_free,
                                supports_fp16=True,
                                supports_bf16=False,  # Conservative assumption
                                max_batch_size=max(1, int(memory_total / 4000))
                            ))
        
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        
        return gpus
    
    def _detect_intel_gpus(self) -> List[GPUInfo]:
        """Detect Intel GPUs."""
        gpus = []
        
        # Intel GPU detection is platform-specific and limited
        # For now, provide basic detection
        if self._platform_type == PlatformType.WINDOWS:
            try:
                # Check for Intel GPU in device manager (simplified)
                result = subprocess.run(
                    ["wmic", "path", "win32_VideoController", "get", "name"],
                    capture_output=True, text=True, timeout=10
                )
                
                if result.returncode == 0:
                    for line in result.stdout.split('\n'):
                        if 'intel' in line.lower() and 'graphics' in line.lower():
                            gpus.append(GPUInfo(
                                gpu_type=GPUType.INTEL,
                                name=line.strip(),
                                memory_total_mb=2048,  # Conservative estimate
                                memory_available_mb=1024,
                                supports_fp16=True,
                                supports_bf16=False,
                                max_batch_size=1
                            ))
                            break
            
            except (subprocess.TimeoutExpired, FileNotFoundError):
                pass
        
        return gpus
    
    def _detect_apple_silicon(self) -> Optional[GPUInfo]:
        """Detect Apple Silicon GPU."""
        if self._platform_type != PlatformType.MACOS:
            return None
        
        try:
            # Check for Apple Silicon
            result = subprocess.run(
                ["sysctl", "-n", "machdep.cpu.brand_string"],
                capture_output=True, text=True, timeout=5
            )
            
            if result.returncode == 0 and "apple" in result.stdout.lower():
                # Get memory info
                mem_result = subprocess.run(
                    ["sysctl", "-n", "hw.memsize"],
                    capture_output=True, text=True, timeout=5
                )
                
                total_memory = 8192  # Default 8GB
                if mem_result.returncode == 0:
                    total_memory = int(mem_result.stdout.strip()) / (1024 * 1024)
                
                # Apple Silicon shares memory between CPU and GPU
                gpu_memory = min(total_memory * 0.6, 16384)  # Up to 60% or 16GB
                
                return GPUInfo(
                    gpu_type=GPUType.APPLE_SILICON,
                    name="Apple Silicon GPU",
                    memory_total_mb=gpu_memory,
                    memory_available_mb=gpu_memory * 0.8,
                    supports_fp16=True,
                    supports_bf16=True,
                    max_batch_size=max(1, int(gpu_memory / 3000))
                )
        
        except (subprocess.TimeoutExpired, FileNotFoundError):
            pass
        
        return None
    
    def _get_platform_capabilities(self) -> PlatformCapabilities:
        """Get comprehensive platform capabilities."""
        # Get system memory info
        memory = psutil.virtual_memory()
        total_memory_mb = memory.total / (1024 * 1024)
        available_memory_mb = memory.available / (1024 * 1024)
        
        # Get CPU info
        cpu_cores = psutil.cpu_count(logical=False) or 1
        
        # Determine acceleration support
        supports_cuda = any(gpu.gpu_type == GPUType.NVIDIA for gpu in self._gpu_info)
        supports_rocm = any(gpu.gpu_type == GPUType.AMD for gpu in self._gpu_info)
        supports_metal = any(gpu.gpu_type == GPUType.APPLE_SILICON for gpu in self._gpu_info)
        supports_directml = (
            self._platform_type == PlatformType.WINDOWS and
            any(gpu.gpu_type in [GPUType.AMD, GPUType.INTEL, GPUType.NVIDIA] for gpu in self._gpu_info)
        )
        
        # Estimate performance capabilities
        max_concurrent_workflows = 1
        recommended_batch_size = 1
        
        if self._gpu_info:
            # Base estimates on GPU memory
            max_gpu_memory = max(gpu.memory_total_mb for gpu in self._gpu_info)
            if max_gpu_memory > 8000:
                max_concurrent_workflows = 2
                recommended_batch_size = 2
            if max_gpu_memory > 16000:
                max_concurrent_workflows = 4
                recommended_batch_size = 4
        
        return PlatformCapabilities(
            platform_type=self._platform_type,
            gpu_info=self._gpu_info,
            total_memory_mb=total_memory_mb,
            available_memory_mb=available_memory_mb,
            cpu_cores=cpu_cores,
            supports_cuda=supports_cuda,
            supports_rocm=supports_rocm,
            supports_metal=supports_metal,
            supports_directml=supports_directml,
            max_concurrent_workflows=max_concurrent_workflows,
            recommended_batch_size=recommended_batch_size
        )
    
    def _scan_available_models(self):
        """Scan for available models in ComfyUI installation."""
        if not self.config.installation_path.exists():
            self.logger.warning(f"ComfyUI installation path not found: {self.config.installation_path}")
            return
        
        # Common model directories in ComfyUI
        model_dirs = {
            "checkpoints": self.config.installation_path / "models" / "checkpoints",
            "loras": self.config.installation_path / "models" / "loras",
            "controlnet": self.config.installation_path / "models" / "controlnet",
            "clip": self.config.installation_path / "models" / "clip",
            "vae": self.config.installation_path / "models" / "vae",
            "upscale_models": self.config.installation_path / "models" / "upscale_models",
            "embeddings": self.config.installation_path / "models" / "embeddings"
        }
        
        for model_type, model_dir in model_dirs.items():
            if model_dir.exists():
                self._scan_model_directory(model_type, model_dir)
    
    def _scan_model_directory(self, model_type: str, model_dir: Path):
        """Scan a specific model directory for available models."""
        supported_extensions = ['.safetensors', '.ckpt', '.pt', '.pth', '.bin']
        
        try:
            for model_file in model_dir.rglob('*'):
                if model_file.is_file() and model_file.suffix.lower() in supported_extensions:
                    try:
                        # Get file size
                        size_mb = model_file.stat().st_size / (1024 * 1024)
                        
                        # Estimate memory requirements (rough heuristic)
                        required_memory_mb = size_mb * 1.5  # 50% overhead for loading
                        
                        model_info = ModelInfo(
                            name=model_file.stem,
                            path=model_file,
                            size_mb=size_mb,
                            model_type=model_type,
                            required_memory_mb=required_memory_mb,
                            supported_formats=[model_file.suffix.lower()],
                            is_available=True
                        )
                        
                        # Store model info
                        model_key = f"{model_type}/{model_file.stem}"
                        self._available_models[model_key] = model_info
                        
                    except Exception as e:
                        self.logger.debug(f"Error scanning model {model_file}: {e}")
        
        except Exception as e:
            self.logger.warning(f"Error scanning model directory {model_dir}: {e}")
    
    # Public API methods
    
    def get_platform_info(self) -> Dict[str, Any]:
        """Get comprehensive platform information."""
        return {
            "platform_type": self._platform_type.value,
            "system": {
                "os": platform.system(),
                "release": platform.release(),
                "version": platform.version(),
                "machine": platform.machine(),
                "processor": platform.processor()
            },
            "capabilities": {
                "total_memory_mb": self._capabilities.total_memory_mb,
                "available_memory_mb": self._capabilities.available_memory_mb,
                "cpu_cores": self._capabilities.cpu_cores,
                "supports_cuda": self._capabilities.supports_cuda,
                "supports_rocm": self._capabilities.supports_rocm,
                "supports_metal": self._capabilities.supports_metal,
                "supports_directml": self._capabilities.supports_directml,
                "max_concurrent_workflows": self._capabilities.max_concurrent_workflows,
                "recommended_batch_size": self._capabilities.recommended_batch_size
            },
            "gpu_info": [
                {
                    "type": gpu.gpu_type.value,
                    "name": gpu.name,
                    "memory_total_mb": gpu.memory_total_mb,
                    "memory_available_mb": gpu.memory_available_mb,
                    "compute_capability": gpu.compute_capability,
                    "driver_version": gpu.driver_version,
                    "cuda_version": gpu.cuda_version,
                    "supports_fp16": gpu.supports_fp16,
                    "supports_bf16": gpu.supports_bf16,
                    "max_batch_size": gpu.max_batch_size
                }
                for gpu in self._gpu_info
            ]
        }
    
    def get_available_models(self, model_type: Optional[str] = None) -> Dict[str, ModelInfo]:
        """Get available models, optionally filtered by type."""
        if model_type is None:
            return self._available_models.copy()
        
        return {
            key: model for key, model in self._available_models.items()
            if model.model_type == model_type
        }
    
    def validate_model_compatibility(self, model_name: str) -> Tuple[bool, List[str]]:
        """
        Validate if a model is compatible with current platform.
        
        Returns:
            Tuple of (is_compatible, list_of_issues)
        """
        issues = []
        
        # Find model
        model = None
        for key, model_info in self._available_models.items():
            if model_name in key or model_name == model_info.name:
                model = model_info
                break
        
        if not model:
            return False, [f"Model '{model_name}' not found"]
        
        # Check if model file exists
        if not model.path.exists():
            issues.append(f"Model file not found: {model.path}")
        
        # Check memory requirements
        if self._gpu_info:
            max_gpu_memory = max(gpu.memory_available_mb for gpu in self._gpu_info)
            if model.required_memory_mb > max_gpu_memory:
                issues.append(
                    f"Model requires {model.required_memory_mb:.0f}MB GPU memory, "
                    f"but only {max_gpu_memory:.0f}MB available"
                )
        else:
            # CPU-only check
            if model.required_memory_mb > self._capabilities.available_memory_mb * 0.8:
                issues.append(
                    f"Model requires {model.required_memory_mb:.0f}MB memory, "
                    f"but only {self._capabilities.available_memory_mb * 0.8:.0f}MB recommended for CPU"
                )
        
        # Check format compatibility
        if model.model_type == "checkpoints":
            # Most checkpoints should work
            pass
        elif model.model_type == "controlnet":
            # ControlNet requires specific support
            if not any(gpu.supports_fp16 for gpu in self._gpu_info):
                issues.append("ControlNet models require FP16 support")
        
        return len(issues) == 0, issues
    
    def get_optimal_settings(self, workflow_complexity: str = "medium") -> Dict[str, Any]:
        """Get optimal settings for current platform."""
        settings = {
            "batch_size": 1,
            "precision": "fp32",
            "memory_management": "normal",
            "cpu_threads": min(self._capabilities.cpu_cores, 8),
            "enable_attention_slicing": False,
            "enable_cpu_offload": False,
            "enable_sequential_cpu_offload": False
        }
        
        # GPU-specific optimizations
        if self._gpu_info:
            best_gpu = max(self._gpu_info, key=lambda g: g.memory_total_mb)
            
            # Batch size optimization
            if workflow_complexity == "simple":
                settings["batch_size"] = min(best_gpu.max_batch_size, 4)
            elif workflow_complexity == "medium":
                settings["batch_size"] = min(best_gpu.max_batch_size, 2)
            else:  # complex
                settings["batch_size"] = 1
            
            # Precision optimization
            if best_gpu.supports_bf16:
                settings["precision"] = "bf16"
            elif best_gpu.supports_fp16:
                settings["precision"] = "fp16"
            
            # Memory management
            if best_gpu.memory_total_mb < 6000:
                settings["memory_management"] = "low_vram"
                settings["enable_attention_slicing"] = True
                settings["enable_cpu_offload"] = True
            elif best_gpu.memory_total_mb < 12000:
                settings["memory_management"] = "medium_vram"
                settings["enable_attention_slicing"] = True
        
        else:
            # CPU-only optimizations
            settings["precision"] = "fp32"
            settings["memory_management"] = "cpu_only"
            settings["cpu_threads"] = self._capabilities.cpu_cores
            settings["enable_cpu_offload"] = True
            settings["enable_sequential_cpu_offload"] = True
        
        # Platform-specific adjustments
        if self._platform_type == PlatformType.WSL:
            settings["cpu_threads"] = min(settings["cpu_threads"], 4)  # WSL limitation
        elif self._platform_type == PlatformType.DOCKER:
            settings["cpu_threads"] = min(settings["cpu_threads"], 6)  # Container limitation
        
        return settings
    
    def get_process_command(self, additional_args: List[str] = None) -> List[str]:
        """Get platform-specific command to start ComfyUI process."""
        additional_args = additional_args or []
        
        # Base command
        if self._platform_type == PlatformType.WINDOWS:
            # Windows: Use python.exe from ComfyUI installation
            python_exe = self.config.installation_path / "python_embeded" / "python.exe"
            if not python_exe.exists():
                python_exe = shutil.which("python") or "python"
            
            main_script = self.config.installation_path / "main.py"
            command = [str(python_exe), str(main_script)]
        
        else:
            # Linux/macOS: Use system python or virtual environment
            python_exe = shutil.which("python3") or shutil.which("python") or "python"
            main_script = self.config.installation_path / "main.py"
            command = [python_exe, str(main_script)]
        
        # Add platform-specific arguments
        if self._capabilities.supports_cuda and self._gpu_info:
            command.extend(["--cuda-device", "0"])
        elif self._capabilities.supports_rocm and self._gpu_info:
            command.extend(["--directml"])  # ROCm support via DirectML
        elif self._capabilities.supports_metal and self._gpu_info:
            command.extend(["--mps"])  # Metal Performance Shaders
        elif self._capabilities.supports_directml and self._gpu_info:
            command.extend(["--directml"])
        else:
            command.extend(["--cpu"])
        
        # Add memory management flags
        if any(gpu.memory_total_mb < 6000 for gpu in self._gpu_info):
            command.extend(["--lowvram"])
        
        # Add additional arguments
        command.extend(additional_args)
        
        return command
    
    def validate_environment(self) -> Tuple[bool, List[str]]:
        """
        Validate that the environment is properly configured for ComfyUI.
        
        Returns:
            Tuple of (is_valid, list_of_issues)
        """
        issues = []
        
        # Check ComfyUI installation
        if not self.config.installation_path.exists():
            issues.append(f"ComfyUI installation not found: {self.config.installation_path}")
        else:
            main_script = self.config.installation_path / "main.py"
            if not main_script.exists():
                issues.append(f"ComfyUI main.py not found: {main_script}")
        
        # Check Python availability
        python_exe = None
        if self._platform_type == PlatformType.WINDOWS:
            python_exe = self.config.installation_path / "python_embeded" / "python.exe"
            if not python_exe.exists():
                python_exe = shutil.which("python")
        else:
            python_exe = shutil.which("python3") or shutil.which("python")
        
        if not python_exe:
            issues.append("Python interpreter not found")
        
        # Check GPU drivers
        if self._capabilities.supports_cuda:
            try:
                result = subprocess.run(
                    ["nvidia-smi"], capture_output=True, timeout=5
                )
                if result.returncode != 0:
                    issues.append("NVIDIA drivers not properly installed")
            except (subprocess.TimeoutExpired, FileNotFoundError):
                issues.append("nvidia-smi not available, CUDA may not work")
        
        # Check memory requirements
        if self._capabilities.available_memory_mb < 4000:
            issues.append(
                f"Insufficient system memory: {self._capabilities.available_memory_mb:.0f}MB "
                f"available, recommend at least 4GB"
            )
        
        # Check disk space
        try:
            disk_usage = shutil.disk_usage(self.config.installation_path)
            free_gb = disk_usage.free / (1024 ** 3)
            if free_gb < 10:
                issues.append(f"Low disk space: {free_gb:.1f}GB free, recommend at least 10GB")
        except Exception:
            pass
        
        return len(issues) == 0, issues
    
    def get_recommended_models(self, use_case: str = "general") -> List[str]:
        """Get recommended models for specific use cases."""
        recommendations = []
        
        # Get available GPU memory
        max_gpu_memory = 0
        if self._gpu_info:
            max_gpu_memory = max(gpu.memory_available_mb for gpu in self._gpu_info)
        
        # Base recommendations by use case and memory
        if use_case == "general":
            if max_gpu_memory > 12000:
                recommendations.extend([
                    "checkpoints/sd_xl_base_1.0.safetensors",
                    "checkpoints/sd_xl_refiner_1.0.safetensors"
                ])
            elif max_gpu_memory > 6000:
                recommendations.extend([
                    "checkpoints/v1-5-pruned-emaonly.safetensors",
                    "checkpoints/sd_xl_base_1.0.safetensors"
                ])
            else:
                recommendations.extend([
                    "checkpoints/v1-5-pruned-emaonly.safetensors"
                ])
        
        elif use_case == "controlnet":
            recommendations.extend([
                "controlnet/control_v11p_sd15_openpose.pth",
                "controlnet/control_v11f1p_sd15_depth.pth",
                "controlnet/control_v11p_sd15_canny.pth"
            ])
        
        elif use_case == "upscaling":
            recommendations.extend([
                "upscale_models/RealESRGAN_x4plus.pth",
                "upscale_models/ESRGAN_4x.pth"
            ])
        
        # Filter by actually available models
        available_recommendations = []
        for rec in recommendations:
            for key in self._available_models:
                if rec in key:
                    available_recommendations.append(key)
                    break
        
        return available_recommendations