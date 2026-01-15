#!/usr/bin/env python3
"""
Cross-Platform Compatibility Module for Video Engine
Ensures compatibility across Windows, Linux, and macOS platforms with CPU/GPU support.
"""

import os
import sys
import platform
import subprocess
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any, Union
from dataclasses import dataclass
from enum import Enum
import importlib.util

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class PlatformType(Enum):
    """Supported platform types."""
    WINDOWS = "windows"
    LINUX = "linux"
    MACOS = "macos"
    UNKNOWN = "unknown"


class ProcessingMode(Enum):
    """Processing mode options."""
    CPU_ONLY = "cpu_only"
    GPU_CUDA = "gpu_cuda"
    GPU_OPENCL = "gpu_opencl"
    GPU_METAL = "gpu_metal"  # macOS specific
    AUTO = "auto"


@dataclass
class PlatformCapabilities:
    """Platform-specific capabilities and limitations."""
    platform_type: PlatformType
    cpu_cores: int
    memory_gb: float
    gpu_available: bool
    gpu_type: Optional[str]
    gpu_memory_gb: Optional[float]
    supported_processing_modes: List[ProcessingMode]
    opencv_available: bool
    ffmpeg_available: bool
    python_version: str
    architecture: str  # x86_64, arm64, etc.


@dataclass
class PlatformOptimization:
    """Platform-specific optimization settings."""
    max_parallel_workers: int
    memory_limit_gb: float
    preferred_processing_mode: ProcessingMode
    file_path_separator: str
    temp_directory: str
    cache_directory: str
    optimization_flags: Dict[str, Any]


class CrossPlatformManager:
    """
    Manages cross-platform compatibility for Video Engine.
    
    Handles platform detection, capability assessment, and optimization
    configuration for Windows, Linux, and macOS systems.
    """
    
    def __init__(self):
        """Initialize cross-platform manager."""
        self.platform_info = self._detect_platform()
        self.capabilities = self._assess_capabilities()
        self.optimizations = self._configure_optimizations()
        
        logger.info(f"Cross-platform manager initialized for {self.platform_info.name}")
        logger.info(f"Detected capabilities: {self.capabilities.supported_processing_modes}")
    
    def _detect_platform(self) -> PlatformType:
        """Detect the current platform."""
        system = platform.system().lower()
        
        if system == "windows":
            return PlatformType.WINDOWS
        elif system == "linux":
            return PlatformType.LINUX
        elif system == "darwin":
            return PlatformType.MACOS
        else:
            logger.warning(f"Unknown platform: {system}")
            return PlatformType.UNKNOWN
    
    def _assess_capabilities(self) -> PlatformCapabilities:
        """Assess platform capabilities and available resources."""
        # Get basic system information
        cpu_cores = os.cpu_count() or 1
        
        # Estimate memory (basic approach)
        try:
            if self.platform_info == PlatformType.LINUX:
                memory_gb = self._get_linux_memory()
            elif self.platform_info == PlatformType.WINDOWS:
                memory_gb = self._get_windows_memory()
            elif self.platform_info == PlatformType.MACOS:
                memory_gb = self._get_macos_memory()
            else:
                memory_gb = 8.0  # Default assumption
        except Exception:
            memory_gb = 8.0  # Fallback
        
        # Check GPU availability
        gpu_available, gpu_type, gpu_memory = self._detect_gpu()
        
        # Determine supported processing modes
        supported_modes = self._determine_processing_modes(gpu_available, gpu_type)
        
        # Check software dependencies
        opencv_available = self._check_opencv()
        ffmpeg_available = self._check_ffmpeg()
        
        return PlatformCapabilities(
            platform_type=self.platform_info,
            cpu_cores=cpu_cores,
            memory_gb=memory_gb,
            gpu_available=gpu_available,
            gpu_type=gpu_type,
            gpu_memory_gb=gpu_memory,
            supported_processing_modes=supported_modes,
            opencv_available=opencv_available,
            ffmpeg_available=ffmpeg_available,
            python_version=platform.python_version(),
            architecture=platform.machine()
        )
    
    def _get_linux_memory(self) -> float:
        """Get memory information on Linux."""
        try:
            with open('/proc/meminfo', 'r') as f:
                for line in f:
                    if line.startswith('MemTotal:'):
                        # Extract memory in KB and convert to GB
                        mem_kb = int(line.split()[1])
                        return mem_kb / (1024 * 1024)
        except Exception:
            pass
        return 8.0
    
    def _get_windows_memory(self) -> float:
        """Get memory information on Windows."""
        try:
            import psutil
            return psutil.virtual_memory().total / (1024**3)
        except ImportError:
            try:
                # Fallback using wmic
                result = subprocess.run(
                    ['wmic', 'computersystem', 'get', 'TotalPhysicalMemory'],
                    capture_output=True, text=True, timeout=10
                )
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')
                    if len(lines) >= 2:
                        memory_bytes = int(lines[1].strip())
                        return memory_bytes / (1024**3)
            except Exception:
                pass
        return 8.0
    
    def _get_macos_memory(self) -> float:
        """Get memory information on macOS."""
        try:
            result = subprocess.run(
                ['sysctl', '-n', 'hw.memsize'],
                capture_output=True, text=True, timeout=10
            )
            if result.returncode == 0:
                memory_bytes = int(result.stdout.strip())
                return memory_bytes / (1024**3)
        except Exception:
            pass
        return 8.0
    
    def _detect_gpu(self) -> Tuple[bool, Optional[str], Optional[float]]:
        """Detect GPU availability and type."""
        gpu_available = False
        gpu_type = None
        gpu_memory = None
        
        try:
            # Try to detect NVIDIA GPU
            if self._check_nvidia_gpu():
                gpu_available = True
                gpu_type = "nvidia"
                gpu_memory = self._get_nvidia_memory()
            
            # Try to detect AMD GPU (basic check)
            elif self._check_amd_gpu():
                gpu_available = True
                gpu_type = "amd"
                gpu_memory = None  # Harder to detect reliably
            
            # Check for Intel integrated graphics
            elif self._check_intel_gpu():
                gpu_available = True
                gpu_type = "intel"
                gpu_memory = None  # Shared memory
            
            # macOS Metal support
            elif self.platform_info == PlatformType.MACOS:
                gpu_available = True
                gpu_type = "metal"
                gpu_memory = None  # Unified memory
        
        except Exception as e:
            logger.debug(f"GPU detection failed: {e}")
        
        return gpu_available, gpu_type, gpu_memory
    
    def _check_nvidia_gpu(self) -> bool:
        """Check for NVIDIA GPU availability."""
        try:
            # Try nvidia-smi command
            result = subprocess.run(
                ['nvidia-smi', '--query-gpu=name', '--format=csv,noheader'],
                capture_output=True, text=True, timeout=5
            )
            return result.returncode == 0 and result.stdout.strip()
        except Exception:
            pass
        
        try:
            # Try importing pynvml
            import pynvml
            pynvml.nvmlInit()
            return pynvml.nvmlDeviceGetCount() > 0
        except Exception:
            pass
        
        return False
    
    def _get_nvidia_memory(self) -> Optional[float]:
        """Get NVIDIA GPU memory in GB."""
        try:
            result = subprocess.run(
                ['nvidia-smi', '--query-gpu=memory.total', '--format=csv,noheader,nounits'],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                memory_mb = int(result.stdout.strip().split('\n')[0])
                return memory_mb / 1024.0
        except Exception:
            pass
        
        try:
            import pynvml
            pynvml.nvmlInit()
            handle = pynvml.nvmlDeviceGetHandleByIndex(0)
            info = pynvml.nvmlDeviceGetMemoryInfo(handle)
            return info.total / (1024**3)
        except Exception:
            pass
        
        return None
    
    def _check_amd_gpu(self) -> bool:
        """Check for AMD GPU availability."""
        if self.platform_info == PlatformType.LINUX:
            try:
                # Check for AMD GPU in lspci
                result = subprocess.run(
                    ['lspci', '-nn'],
                    capture_output=True, text=True, timeout=5
                )
                if result.returncode == 0:
                    return 'AMD' in result.stdout or 'ATI' in result.stdout
            except Exception:
                pass
        
        elif self.platform_info == PlatformType.WINDOWS:
            try:
                # Check Windows device manager via wmic
                result = subprocess.run(
                    ['wmic', 'path', 'win32_VideoController', 'get', 'name'],
                    capture_output=True, text=True, timeout=10
                )
                if result.returncode == 0:
                    return 'AMD' in result.stdout or 'Radeon' in result.stdout
            except Exception:
                pass
        
        return False
    
    def _check_intel_gpu(self) -> bool:
        """Check for Intel integrated GPU."""
        if self.platform_info == PlatformType.LINUX:
            try:
                result = subprocess.run(
                    ['lspci', '-nn'],
                    capture_output=True, text=True, timeout=5
                )
                if result.returncode == 0:
                    return 'Intel' in result.stdout and ('VGA' in result.stdout or 'Display' in result.stdout)
            except Exception:
                pass
        
        elif self.platform_info == PlatformType.WINDOWS:
            try:
                result = subprocess.run(
                    ['wmic', 'path', 'win32_VideoController', 'get', 'name'],
                    capture_output=True, text=True, timeout=10
                )
                if result.returncode == 0:
                    return 'Intel' in result.stdout
            except Exception:
                pass
        
        return False
    
    def _determine_processing_modes(self, gpu_available: bool, gpu_type: Optional[str]) -> List[ProcessingMode]:
        """Determine supported processing modes."""
        modes = [ProcessingMode.CPU_ONLY, ProcessingMode.AUTO]
        
        if gpu_available and gpu_type:
            if gpu_type == "nvidia":
                modes.append(ProcessingMode.GPU_CUDA)
            elif gpu_type in ["amd", "intel"]:
                modes.append(ProcessingMode.GPU_OPENCL)
            elif gpu_type == "metal":
                modes.append(ProcessingMode.GPU_METAL)
        
        # Special case for macOS - if GPU is available, assume Metal support
        if self.platform_info == PlatformType.MACOS and gpu_available:
            if ProcessingMode.GPU_METAL not in modes:
                modes.append(ProcessingMode.GPU_METAL)
        
        return modes
    
    def _check_opencv(self) -> bool:
        """Check if OpenCV is available."""
        try:
            import cv2
            return True
        except ImportError:
            return False
    
    def _check_ffmpeg(self) -> bool:
        """Check if FFmpeg is available."""
        try:
            # First try standard PATH
            result = subprocess.run(
                ['ffmpeg', '-version'],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0:
                return True
        except Exception:
            pass
        
        # Try local installation paths
        local_paths = [
            Path("./ffmpeg/bin/ffmpeg.exe"),  # Windows local install
            Path("./ffmpeg/bin/ffmpeg"),      # Linux/macOS local install
            Path("C:/ffmpeg/bin/ffmpeg.exe"), # Windows system install
        ]
        
        for ffmpeg_path in local_paths:
            if ffmpeg_path.exists():
                try:
                    result = subprocess.run(
                        [str(ffmpeg_path), '-version'],
                        capture_output=True, text=True, timeout=5
                    )
                    if result.returncode == 0:
                        return True
                except Exception:
                    continue
        
        return False
    
    def _configure_optimizations(self) -> PlatformOptimization:
        """Configure platform-specific optimizations."""
        # Determine optimal worker count
        max_workers = min(self.capabilities.cpu_cores, 8)  # Cap at 8 for memory reasons
        
        # Set memory limits (leave 25% for system)
        memory_limit = self.capabilities.memory_gb * 0.75
        
        # Choose preferred processing mode
        if ProcessingMode.GPU_CUDA in self.capabilities.supported_processing_modes:
            preferred_mode = ProcessingMode.GPU_CUDA
        elif ProcessingMode.GPU_OPENCL in self.capabilities.supported_processing_modes:
            preferred_mode = ProcessingMode.GPU_OPENCL
        elif ProcessingMode.GPU_METAL in self.capabilities.supported_processing_modes:
            preferred_mode = ProcessingMode.GPU_METAL
        else:
            preferred_mode = ProcessingMode.CPU_ONLY
        
        # Platform-specific paths
        if self.platform_info == PlatformType.WINDOWS:
            path_sep = "\\"
            temp_dir = os.environ.get('TEMP', 'C:\\temp')
            cache_dir = os.path.join(os.environ.get('APPDATA', 'C:\\'), 'VideoEngine')
        else:
            path_sep = "/"
            temp_dir = '/tmp'
            cache_dir = os.path.expanduser('~/.cache/video_engine')
        
        # Platform-specific optimization flags
        optimization_flags = self._get_optimization_flags()
        
        return PlatformOptimization(
            max_parallel_workers=max_workers,
            memory_limit_gb=memory_limit,
            preferred_processing_mode=preferred_mode,
            file_path_separator=path_sep,
            temp_directory=temp_dir,
            cache_directory=cache_dir,
            optimization_flags=optimization_flags
        )
    
    def _get_optimization_flags(self) -> Dict[str, Any]:
        """Get platform-specific optimization flags."""
        flags = {
            "use_multiprocessing": True,
            "memory_mapping": True,
            "vectorization": True
        }
        
        if self.platform_info == PlatformType.WINDOWS:
            flags.update({
                "use_windows_api": True,
                "file_buffering": "full",
                "thread_priority": "normal"
            })
        elif self.platform_info == PlatformType.LINUX:
            flags.update({
                "use_posix_api": True,
                "file_buffering": "line",
                "nice_level": 0
            })
        elif self.platform_info == PlatformType.MACOS:
            flags.update({
                "use_cocoa_api": False,  # Not needed for video processing
                "file_buffering": "line",
                "use_grand_central_dispatch": True
            })
        
        return flags
    
    def get_optimal_config(self) -> Dict[str, Any]:
        """Get optimal configuration for current platform."""
        return {
            "platform": {
                "type": self.capabilities.platform_type.value,
                "architecture": self.capabilities.architecture,
                "python_version": self.capabilities.python_version
            },
            "processing": {
                "mode": self.optimizations.preferred_processing_mode.value,
                "max_workers": self.optimizations.max_parallel_workers,
                "memory_limit_gb": self.optimizations.memory_limit_gb
            },
            "hardware": {
                "cpu_cores": self.capabilities.cpu_cores,
                "memory_gb": self.capabilities.memory_gb,
                "gpu_available": self.capabilities.gpu_available,
                "gpu_type": self.capabilities.gpu_type,
                "gpu_memory_gb": self.capabilities.gpu_memory_gb
            },
            "software": {
                "opencv_available": self.capabilities.opencv_available,
                "ffmpeg_available": self.capabilities.ffmpeg_available
            },
            "paths": {
                "separator": self.optimizations.file_path_separator,
                "temp_directory": self.optimizations.temp_directory,
                "cache_directory": self.optimizations.cache_directory
            },
            "optimizations": self.optimizations.optimization_flags
        }
    
    def validate_dependencies(self) -> Tuple[bool, List[str]]:
        """Validate required dependencies are available."""
        issues = []
        
        # Check Python version
        python_version = tuple(map(int, platform.python_version().split('.')))
        if python_version < (3, 9):
            issues.append(f"Python 3.9+ required, found {platform.python_version()}")
        
        # Check OpenCV
        if not self.capabilities.opencv_available:
            issues.append("OpenCV not available - required for image processing")
        
        # Check FFmpeg (optional but recommended)
        if not self.capabilities.ffmpeg_available:
            issues.append("FFmpeg not available - video format support limited")
        
        # Platform-specific checks
        if self.platform_info == PlatformType.UNKNOWN:
            issues.append("Unknown platform - compatibility not guaranteed")
        
        # Memory check
        if self.capabilities.memory_gb < 4.0:
            issues.append(f"Low memory detected: {self.capabilities.memory_gb:.1f}GB (4GB+ recommended)")
        
        return len(issues) == 0, issues
    
    def create_platform_paths(self, base_path: Union[str, Path]) -> Dict[str, Path]:
        """Create platform-appropriate paths."""
        base = Path(base_path)
        
        paths = {
            "base": base,
            "temp": Path(self.optimizations.temp_directory) / "video_engine",
            "cache": Path(self.optimizations.cache_directory),
            "output": base / "output",
            "logs": base / "logs"
        }
        
        # Create directories if they don't exist
        for path_type, path in paths.items():
            try:
                path.mkdir(parents=True, exist_ok=True)
            except Exception as e:
                logger.warning(f"Failed to create {path_type} directory {path}: {e}")
        
        return paths
    
    def get_processing_config(self, processing_mode: Optional[ProcessingMode] = None) -> Dict[str, Any]:
        """Get processing configuration for specified mode."""
        mode = processing_mode or self.optimizations.preferred_processing_mode
        
        config = {
            "mode": mode.value,
            "parallel_workers": self.optimizations.max_parallel_workers,
            "memory_limit_gb": self.optimizations.memory_limit_gb
        }
        
        if mode == ProcessingMode.GPU_CUDA:
            config.update({
                "device": "cuda",
                "gpu_memory_fraction": 0.8,
                "allow_growth": True
            })
        elif mode == ProcessingMode.GPU_OPENCL:
            config.update({
                "device": "opencl",
                "platform_id": 0,
                "device_id": 0
            })
        elif mode == ProcessingMode.GPU_METAL:
            config.update({
                "device": "metal",
                "use_unified_memory": True
            })
        else:
            config.update({
                "device": "cpu",
                "num_threads": self.capabilities.cpu_cores
            })
        
        return config
    
    def adapt_for_hardware(self, base_config: Dict[str, Any]) -> Dict[str, Any]:
        """Adapt configuration for current hardware capabilities."""
        adapted_config = base_config.copy()
        
        # Always enforce CPU core limits first
        max_workers = adapted_config.get("max_workers", 4)
        adapted_config["max_workers"] = min(max_workers, self.capabilities.cpu_cores)
        
        # Adjust based on available memory - be more aggressive for very low memory
        if self.capabilities.memory_gb < 2.0:
            # Very low memory - use minimal batch sizes
            adapted_config["batch_size"] = 1
            adapted_config["max_workers"] = min(adapted_config["max_workers"], 1)
        elif self.capabilities.memory_gb < 4.0:
            # Low memory - use small batch sizes
            adapted_config["batch_size"] = min(adapted_config.get("batch_size", 4), 1)
            adapted_config["max_workers"] = min(adapted_config["max_workers"], 2)
        elif self.capabilities.memory_gb < 8.0:
            # Medium memory - moderate batch sizes
            adapted_config["batch_size"] = min(adapted_config.get("batch_size", 4), 2)
            adapted_config["max_workers"] = min(adapted_config["max_workers"], 2)
        
        # Adjust based on CPU cores
        if self.capabilities.cpu_cores <= 2:
            adapted_config["parallel_processing"] = False
            adapted_config["max_workers"] = 1
        
        # GPU-specific adaptations
        if self.capabilities.gpu_available and self.capabilities.gpu_memory_gb:
            if self.capabilities.gpu_memory_gb < 4.0:
                # Reduce GPU memory usage for low-memory GPUs
                adapted_config["gpu_memory_fraction"] = 0.6
                adapted_config["batch_size"] = min(adapted_config.get("batch_size", 4), 1)
        
        return adapted_config
    
    def get_compatibility_report(self) -> Dict[str, Any]:
        """Generate comprehensive compatibility report."""
        is_valid, issues = self.validate_dependencies()
        
        return {
            "platform_info": {
                "type": self.capabilities.platform_type.value,
                "architecture": self.capabilities.architecture,
                "python_version": self.capabilities.python_version
            },
            "hardware_capabilities": {
                "cpu_cores": self.capabilities.cpu_cores,
                "memory_gb": self.capabilities.memory_gb,
                "gpu_available": self.capabilities.gpu_available,
                "gpu_type": self.capabilities.gpu_type,
                "gpu_memory_gb": self.capabilities.gpu_memory_gb
            },
            "software_dependencies": {
                "opencv_available": self.capabilities.opencv_available,
                "ffmpeg_available": self.capabilities.ffmpeg_available
            },
            "supported_processing_modes": [mode.value for mode in self.capabilities.supported_processing_modes],
            "recommended_config": self.get_optimal_config(),
            "validation": {
                "is_compatible": is_valid,
                "issues": issues
            },
            "optimizations": {
                "max_workers": self.optimizations.max_parallel_workers,
                "memory_limit_gb": self.optimizations.memory_limit_gb,
                "preferred_mode": self.optimizations.preferred_processing_mode.value
            }
        }


def main():
    """Main function for testing cross-platform compatibility."""
    print("Cross-Platform Compatibility Assessment")
    print("=" * 50)
    
    # Initialize manager
    manager = CrossPlatformManager()
    
    # Generate compatibility report
    report = manager.get_compatibility_report()
    
    # Display results
    print(f"Platform: {report['platform_info']['type']} ({report['platform_info']['architecture']})")
    print(f"Python: {report['platform_info']['python_version']}")
    print(f"CPU Cores: {report['hardware_capabilities']['cpu_cores']}")
    print(f"Memory: {report['hardware_capabilities']['memory_gb']:.1f} GB")
    print(f"GPU Available: {report['hardware_capabilities']['gpu_available']}")
    if report['hardware_capabilities']['gpu_type']:
        print(f"GPU Type: {report['hardware_capabilities']['gpu_type']}")
    
    print(f"\nSoftware Dependencies:")
    print(f"OpenCV: {'✓' if report['software_dependencies']['opencv_available'] else '✗'}")
    print(f"FFmpeg: {'✓' if report['software_dependencies']['ffmpeg_available'] else '✗'}")
    
    print(f"\nSupported Processing Modes:")
    for mode in report['supported_processing_modes']:
        print(f"  - {mode}")
    
    print(f"\nRecommended Configuration:")
    print(f"Processing Mode: {report['optimizations']['preferred_mode']}")
    print(f"Max Workers: {report['optimizations']['max_workers']}")
    print(f"Memory Limit: {report['optimizations']['memory_limit_gb']:.1f} GB")
    
    print(f"\nCompatibility Status: {'✓ Compatible' if report['validation']['is_compatible'] else '✗ Issues Found'}")
    if report['validation']['issues']:
        print("Issues:")
        for issue in report['validation']['issues']:
            print(f"  - {issue}")


if __name__ == "__main__":
    main()