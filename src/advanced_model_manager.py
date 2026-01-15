"""
Advanced Model Management System for StoryCore-Engine

This module provides enhanced model management capabilities for handling large
advanced ComfyUI models (14B+ parameters) with memory optimization, caching,
and intelligent loading strategies.

Key Features:
- Memory-optimized loading for 14B+ parameter models
- FP8/INT8 quantization support
- Intelligent model caching and unloading
- Automatic model downloading and validation
- Performance monitoring and optimization
- Model compatibility checking
"""

import asyncio
import hashlib
import json
import logging
import os
import shutil
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple, Union, Any
from urllib.parse import urlparse
import aiohttp
import psutil
import torch
from torch.nn import Module

# Import secure downloader
from .security_validation_system import SecureModelDownloader

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ModelType(Enum):
    """Types of models supported by the advanced model manager"""
    DIFFUSION = "diffusion"
    VAE = "vae"
    TEXT_ENCODER = "text_encoder"
    CLIP_VISION = "clip_vision"
    LORA = "lora"
    UPSAMPLER = "upsampler"


class QuantizationType(Enum):
    """Supported quantization types for memory optimization"""
    FP16 = "fp16"
    FP8 = "fp8"
    INT8 = "int8"
    BF16 = "bf16"


class ModelPriority(Enum):
    """Model loading priority levels"""
    CRITICAL = "critical"  # Always keep in memory
    HIGH = "high"         # Keep if memory allows
    MEDIUM = "medium"     # Load on demand
    LOW = "low"          # Cache aggressively


@dataclass
class ModelInfo:
    """Information about a model"""
    name: str
    model_type: ModelType
    file_path: Path
    size_gb: float
    url: Optional[str] = None
    checksum: Optional[str] = None
    priority: ModelPriority = ModelPriority.MEDIUM
    quantization: Optional[QuantizationType] = None
    dependencies: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    version: str = "1.0.0"  # Model version
    min_vram_gb: Optional[float] = None  # Minimum VRAM required
    min_ram_gb: Optional[float] = None  # Minimum RAM required
    compatible_frameworks: List[str] = field(default_factory=lambda: ["pytorch"])  # Compatible frameworks
    required_extensions: List[str] = field(default_factory=list)  # Required extensions/plugins


@dataclass
class MemoryStats:
    """Memory usage statistics"""
    total_vram_gb: float
    used_vram_gb: float
    available_vram_gb: float
    total_ram_gb: float
    used_ram_gb: float
    available_ram_gb: float
    model_memory_gb: float
    timestamp: float = field(default_factory=time.time)


@dataclass
class ModelManagerConfig:
    """Configuration for the advanced model manager"""
    models_directory: Path = Path("models")
    cache_directory: Path = Path("cache/models")
    max_vram_usage_gb: float = 20.0
    max_ram_usage_gb: float = 32.0
    enable_quantization: bool = True
    auto_download: bool = True
    verify_checksums: bool = True
    cleanup_interval_seconds: int = 300
    performance_monitoring: bool = True
    fallback_to_cpu: bool = True
    model_sharing_enabled: bool = True


class ModelLoadingError(Exception):
    """Raised when model loading fails"""
    pass


class InsufficientMemoryError(Exception):
    """Raised when insufficient memory for model loading"""
    pass


class ModelNotFoundError(Exception):
    """Raised when model file is not found"""
    pass


class MemoryMonitor:
    """Monitors system and GPU memory usage"""
    
    def __init__(self):
        self.gpu_available = torch.cuda.is_available()
        self.device_count = torch.cuda.device_count() if self.gpu_available else 0
        
    def get_memory_stats(self) -> MemoryStats:
        """Get current memory statistics"""
        # System RAM
        ram = psutil.virtual_memory()
        total_ram_gb = ram.total / (1024**3)
        used_ram_gb = ram.used / (1024**3)
        available_ram_gb = ram.available / (1024**3)
        
        # GPU VRAM
        total_vram_gb = 0.0
        used_vram_gb = 0.0
        
        if self.gpu_available:
            for i in range(self.device_count):
                total_vram_gb += torch.cuda.get_device_properties(i).total_memory / (1024**3)
                used_vram_gb += torch.cuda.memory_allocated(i) / (1024**3)
        
        available_vram_gb = total_vram_gb - used_vram_gb
        
        # Estimate model memory usage
        model_memory_gb = used_vram_gb * 0.8  # Rough estimate
        
        return MemoryStats(
            total_vram_gb=total_vram_gb,
            used_vram_gb=used_vram_gb,
            available_vram_gb=available_vram_gb,
            total_ram_gb=total_ram_gb,
            used_ram_gb=used_ram_gb,
            available_ram_gb=available_ram_gb,
            model_memory_gb=model_memory_gb
        )
    
    def can_load_model(self, model_size_gb: float, target_device: str = "cuda") -> bool:
        """Check if model can be loaded given current memory usage"""
        stats = self.get_memory_stats()
        
        if target_device == "cuda" and self.gpu_available:
            return stats.available_vram_gb >= model_size_gb * 1.2  # 20% buffer
        else:
            return stats.available_ram_gb >= model_size_gb * 1.2
    
    def get_optimal_device(self, model_size_gb: float) -> str:
        """Get optimal device for loading model"""
        if not self.gpu_available:
            return "cpu"
        
        stats = self.get_memory_stats()
        
        # Check if GPU has enough memory
        if stats.available_vram_gb >= model_size_gb * 1.2:
            return "cuda"
        
        # Check if CPU has enough memory
        if stats.available_ram_gb >= model_size_gb * 1.2:
            return "cpu"
        
        # Not enough memory anywhere
        raise InsufficientMemoryError(
            f"Insufficient memory to load {model_size_gb:.1f}GB model. "
            f"Available: VRAM {stats.available_vram_gb:.1f}GB, RAM {stats.available_ram_gb:.1f}GB"
        )


class ModelDownloadManager:
    """Manages downloading of models from remote sources with security validations"""

    def __init__(self, config: ModelManagerConfig):
        self.config = config
        self.download_progress = {}
        self.secure_downloader = SecureModelDownloader()
        
    async def download_model(self, model_info: ModelInfo) -> Path:
        """Download model from URL with security validations"""
        if not model_info.url:
            raise ModelNotFoundError(f"No URL provided for model {model_info.name}")

        # Pre-download security validation
        url_validation = self.secure_downloader.validate_download_url(model_info.url)
        if not url_validation.is_valid:
            raise ModelLoadingError(f"Security validation failed for {model_info.url}: {url_validation.message}")

        local_path = self.config.models_directory / model_info.file_path

        # Check if file already exists and is valid
        if local_path.exists():
            if await self._verify_model_integrity(local_path, model_info):
                logger.info(f"Model {model_info.name} already exists and is valid")
                return local_path
            else:
                logger.warning(f"Model {model_info.name} exists but is corrupted, re-downloading")
                local_path.unlink()

        # Create directory if it doesn't exist
        local_path.parent.mkdir(parents=True, exist_ok=True)

        logger.info(f"Downloading model {model_info.name} from {model_info.url}")

        try:
            # Parse URL to get domain for SSL pinning
            from urllib.parse import urlparse
            parsed_url = urlparse(model_info.url)
            domain = parsed_url.netloc

            # Create SSL context with pinning
            ssl_context = self.secure_downloader.create_ssl_context(domain)

            # Create connector with SSL context
            connector = aiohttp.TCPConnector(ssl=ssl_context)

            async with aiohttp.ClientSession(connector=connector) as session:
                async with session.get(model_info.url) as response:
                    response.raise_for_status()

                    total_size = int(response.headers.get('content-length', 0))

                    # Validate download size
                    size_validation = self.secure_downloader.validate_download_size(
                        total_size, model_info.size_gb
                    )
                    if not size_validation.is_valid:
                        if size_validation.severity == ValidationSeverity.CRITICAL:
                            raise ModelLoadingError(f"Download size validation failed: {size_validation.message}")
                        else:
                            logger.warning(f"Download size warning: {size_validation.message}")

                    downloaded = 0

                    with open(local_path, 'wb') as f:
                        async for chunk in response.content.iter_chunked(8192):
                            # Check size limit during download
                            if downloaded + len(chunk) > self.secure_downloader.max_download_size_bytes:
                                local_path.unlink()
                                raise ModelLoadingError(f"Download size exceeds maximum limit during download")

                            f.write(chunk)
                            downloaded += len(chunk)

                            # Update progress
                            if total_size > 0:
                                progress = (downloaded / total_size) * 100
                                self.download_progress[model_info.name] = progress

                                if downloaded % (50 * 1024 * 1024) == 0:  # Log every 50MB
                                    logger.info(f"Downloaded {downloaded / (1024**2):.1f}MB / {total_size / (1024**2):.1f}MB ({progress:.1f}%)")

            # Verify downloaded model
            if not await self._verify_model_integrity(local_path, model_info):
                local_path.unlink()
                raise ModelLoadingError(f"Downloaded model {model_info.name} failed integrity check")

            logger.info(f"Successfully downloaded model {model_info.name} with security validations")
            return local_path

        except Exception as e:
            if local_path.exists():
                local_path.unlink()
            raise ModelLoadingError(f"Failed to download model {model_info.name}: {str(e)}")
    
    async def _verify_model_integrity(self, file_path: Path, model_info: ModelInfo) -> bool:
        """Verify model file integrity using checksum"""
        if not self.config.verify_checksums or not model_info.checksum:
            return True
        
        try:
            # Calculate file checksum
            hash_sha256 = hashlib.sha256()
            with open(file_path, 'rb') as f:
                for chunk in iter(lambda: f.read(4096), b""):
                    hash_sha256.update(chunk)
            
            calculated_checksum = hash_sha256.hexdigest()
            return calculated_checksum == model_info.checksum
            
        except Exception as e:
            logger.error(f"Error verifying checksum for {file_path}: {str(e)}")
            return False
    
    def get_download_progress(self, model_name: str) -> float:
        """Get download progress for a model"""
        return self.download_progress.get(model_name, 0.0)


class ModelCompatibilityChecker:
    """Checks model compatibility with system and requirements"""
    
    def __init__(self):
        self.gpu_available = torch.cuda.is_available()
        self.device_count = torch.cuda.device_count() if self.gpu_available else 0
        self.pytorch_version = torch.__version__
        
    def check_model_compatibility(self, model_info: ModelInfo) -> Tuple[bool, List[str]]:
        """
        Check if model is compatible with current system
        
        Returns:
            Tuple of (is_compatible, list_of_issues)
        """
        issues = []
        
        # Check VRAM requirements
        if model_info.min_vram_gb and self.gpu_available:
            total_vram = sum(
                torch.cuda.get_device_properties(i).total_memory / (1024**3)
                for i in range(self.device_count)
            )
            if total_vram < model_info.min_vram_gb:
                issues.append(
                    f"Insufficient VRAM: {total_vram:.1f}GB available, "
                    f"{model_info.min_vram_gb:.1f}GB required"
                )
        
        # Check RAM requirements
        if model_info.min_ram_gb:
            total_ram = psutil.virtual_memory().total / (1024**3)
            if total_ram < model_info.min_ram_gb:
                issues.append(
                    f"Insufficient RAM: {total_ram:.1f}GB available, "
                    f"{model_info.min_ram_gb:.1f}GB required"
                )
        
        # Check framework compatibility
        if "pytorch" in model_info.compatible_frameworks:
            # Check PyTorch version if specified in metadata
            if "min_pytorch_version" in model_info.metadata:
                min_version = model_info.metadata["min_pytorch_version"]
                if self._compare_versions(self.pytorch_version, min_version) < 0:
                    issues.append(
                        f"PyTorch version {self.pytorch_version} is older than "
                        f"required {min_version}"
                    )
        else:
            issues.append(
                f"Model requires {model_info.compatible_frameworks} but only PyTorch is available"
            )
        
        # Check GPU availability for GPU-only models
        if model_info.min_vram_gb and not self.gpu_available:
            issues.append("Model requires GPU but no CUDA device available")
        
        # Check quantization support
        if model_info.quantization == QuantizationType.FP8:
            if not hasattr(torch, 'float8_e4m3fn'):
                issues.append("FP8 quantization not supported on this system")
        
        # Check dependencies
        for dep in model_info.dependencies:
            if dep not in ["base"]:  # Skip base dependencies
                # In a real implementation, check if dependency models are available
                pass
        
        is_compatible = len(issues) == 0
        return is_compatible, issues
    
    def _compare_versions(self, version1: str, version2: str) -> int:
        """
        Compare two version strings
        
        Returns:
            -1 if version1 < version2
            0 if version1 == version2
            1 if version1 > version2
        """
        def parse_version(v: str) -> List[int]:
            # Remove any suffixes like +cu118
            v = v.split('+')[0]
            return [int(x) for x in v.split('.')]
        
        v1_parts = parse_version(version1)
        v2_parts = parse_version(version2)
        
        # Pad shorter version with zeros
        max_len = max(len(v1_parts), len(v2_parts))
        v1_parts += [0] * (max_len - len(v1_parts))
        v2_parts += [0] * (max_len - len(v2_parts))
        
        for p1, p2 in zip(v1_parts, v2_parts):
            if p1 < p2:
                return -1
            elif p1 > p2:
                return 1
        
        return 0
    
    def get_system_info(self) -> Dict[str, Any]:
        """Get system information for compatibility checking"""
        info = {
            "pytorch_version": self.pytorch_version,
            "cuda_available": self.gpu_available,
            "cuda_device_count": self.device_count,
            "total_ram_gb": psutil.virtual_memory().total / (1024**3),
        }
        
        if self.gpu_available:
            info["cuda_version"] = torch.version.cuda
            info["gpu_devices"] = []
            for i in range(self.device_count):
                props = torch.cuda.get_device_properties(i)
                info["gpu_devices"].append({
                    "name": props.name,
                    "total_memory_gb": props.total_memory / (1024**3),
                    "compute_capability": f"{props.major}.{props.minor}"
                })
        
        return info


class ModelVersionManager:
    """Manages model versions and upgrades"""
    
    def __init__(self, config: ModelManagerConfig):
        self.config = config
        self.version_registry: Dict[str, List[str]] = {}  # model_name -> list of versions
        
    def register_version(self, model_name: str, version: str):
        """Register a model version"""
        if model_name not in self.version_registry:
            self.version_registry[model_name] = []
        
        if version not in self.version_registry[model_name]:
            self.version_registry[model_name].append(version)
            self.version_registry[model_name].sort(reverse=True)  # Latest first
    
    def get_latest_version(self, model_name: str) -> Optional[str]:
        """Get the latest version of a model"""
        versions = self.version_registry.get(model_name, [])
        return versions[0] if versions else None
    
    def get_all_versions(self, model_name: str) -> List[str]:
        """Get all registered versions of a model"""
        return self.version_registry.get(model_name, [])
    
    def is_version_compatible(self, model_version: str, required_version: str) -> bool:
        """Check if model version meets required version"""
        def parse_version(v: str) -> Tuple[int, ...]:
            return tuple(int(x) for x in v.split('.'))
        
        try:
            model_v = parse_version(model_version)
            required_v = parse_version(required_version)
            return model_v >= required_v
        except:
            return False
    
    def suggest_upgrade(self, model_name: str, current_version: str) -> Optional[str]:
        """Suggest an upgrade if a newer version is available"""
        versions = self.get_all_versions(model_name)
        
        if not versions or current_version not in versions:
            return None
        
        current_idx = versions.index(current_version)
        
        # Return next newer version if available
        if current_idx > 0:
            return versions[current_idx - 1]
        
        return None


class ModelOptimizer:
    """Optimizes models for memory efficiency and performance"""
    
    def __init__(self, config: ModelManagerConfig):
        self.config = config
        
    def apply_quantization(self, model: Module, target_precision: QuantizationType) -> Module:
        """Apply quantization to reduce model memory footprint"""
        if not self.config.enable_quantization:
            return model
        
        try:
            if target_precision == QuantizationType.FP8:
                # Apply FP8 quantization (requires specific hardware support)
                if hasattr(torch, 'float8_e4m3fn'):
                    model = model.to(dtype=torch.float8_e4m3fn)
                else:
                    logger.warning("FP8 not supported, falling back to FP16")
                    model = model.half()
            
            elif target_precision == QuantizationType.INT8:
                # Apply INT8 quantization
                model = torch.quantization.quantize_dynamic(
                    model, {torch.nn.Linear}, dtype=torch.qint8
                )
            
            elif target_precision == QuantizationType.FP16:
                model = model.half()
            
            elif target_precision == QuantizationType.BF16:
                model = model.to(dtype=torch.bfloat16)
            
            logger.info(f"Applied {target_precision.value} quantization")
            return model
            
        except Exception as e:
            logger.error(f"Failed to apply quantization {target_precision.value}: {str(e)}")
            return model
    
    def enable_gradient_checkpointing(self, model: Module) -> Module:
        """Enable gradient checkpointing for memory efficiency during training"""
        try:
            if hasattr(model, 'gradient_checkpointing_enable'):
                model.gradient_checkpointing_enable()
                logger.info("Enabled gradient checkpointing")
        except Exception as e:
            logger.warning(f"Could not enable gradient checkpointing: {str(e)}")
        
        return model
    
    def optimize_attention_mechanism(self, model: Module) -> Module:
        """Optimize attention computation for memory efficiency"""
        try:
            # Enable memory efficient attention if available
            if hasattr(torch.nn.functional, 'scaled_dot_product_attention'):
                # This is automatically used in newer PyTorch versions
                logger.info("Using optimized attention mechanism")
        except Exception as e:
            logger.warning(f"Could not optimize attention mechanism: {str(e)}")
        
        return model


class AdvancedModelManager:
    """
    Advanced model manager for handling large ComfyUI models with optimization
    
    Features:
    - Memory-optimized loading for 14B+ parameter models
    - Intelligent caching and unloading
    - Automatic model downloading
    - Performance monitoring
    - Model sharing between workflows
    """
    
    def __init__(self, config: ModelManagerConfig):
        self.config = config
        self.memory_monitor = MemoryMonitor()
        self.download_manager = ModelDownloadManager(config)
        self.optimizer = ModelOptimizer(config)
        self.compatibility_checker = ModelCompatibilityChecker()
        self.version_manager = ModelVersionManager(config)
        
        # Model registry and cache
        self.model_registry: Dict[str, ModelInfo] = {}
        self.model_cache: Dict[str, Module] = {}
        self.model_usage_stats: Dict[str, Dict[str, Any]] = {}
        self.loading_locks: Dict[str, asyncio.Lock] = {}
        
        # Performance tracking
        self.performance_stats = {
            'models_loaded': 0,
            'cache_hits': 0,
            'cache_misses': 0,
            'memory_optimizations': 0,
            'download_count': 0
        }
        
        # Initialize directories
        self.config.models_directory.mkdir(parents=True, exist_ok=True)
        self.config.cache_directory.mkdir(parents=True, exist_ok=True)
        
        # Cleanup task reference (started when event loop is running)
        self._cleanup_task = None
        
        # Start cleanup task if event loop is running
        if self.config.cleanup_interval_seconds > 0:
            try:
                loop = asyncio.get_running_loop()
                self._cleanup_task = loop.create_task(self._periodic_cleanup())
            except RuntimeError:
                # No event loop running yet, will be started manually
                pass
    
    def register_model(self, model_info: ModelInfo):
        """Register a model in the manager"""
        # Check compatibility before registering
        is_compatible, issues = self.compatibility_checker.check_model_compatibility(model_info)
        
        if not is_compatible:
            logger.warning(f"Model {model_info.name} has compatibility issues: {issues}")
        
        self.model_registry[model_info.name] = model_info
        self.loading_locks[model_info.name] = asyncio.Lock()
        
        # Register version
        self.version_manager.register_version(model_info.name, model_info.version)
        
        logger.info(f"Registered model {model_info.name} v{model_info.version} ({model_info.size_gb:.1f}GB)")
    
    def register_models_from_config(self, models_config: Dict[str, Any]):
        """Register multiple models from configuration"""
        for model_name, model_data in models_config.items():
            model_info = ModelInfo(
                name=model_name,
                model_type=ModelType(model_data.get('type', 'diffusion')),
                file_path=Path(model_data['file_path']),
                size_gb=model_data['size_gb'],
                url=model_data.get('url'),
                checksum=model_data.get('checksum'),
                priority=ModelPriority(model_data.get('priority', 'medium')),
                quantization=QuantizationType(model_data.get('quantization', 'fp16')) if model_data.get('quantization') else None,
                dependencies=model_data.get('dependencies', []),
                metadata=model_data.get('metadata', {})
            )
            self.register_model(model_info)
    
    async def load_model(self, model_name: str, force_device: Optional[str] = None) -> Module:
        """
        Load model with memory optimization and caching
        
        Args:
            model_name: Name of the model to load
            force_device: Force loading on specific device (cuda/cpu)
            
        Returns:
            Loaded model instance
        """
        # Check if model is already cached
        if model_name in self.model_cache:
            self._update_usage_stats(model_name, 'cache_hit')
            self.performance_stats['cache_hits'] += 1
            logger.info(f"Model {model_name} loaded from cache")
            return self.model_cache[model_name]
        
        # Get model info
        if model_name not in self.model_registry:
            raise ModelNotFoundError(f"Model {model_name} not registered")
        
        model_info = self.model_registry[model_name]
        
        # Use loading lock to prevent concurrent loading of same model
        async with self.loading_locks[model_name]:
            # Double-check cache after acquiring lock
            if model_name in self.model_cache:
                self.performance_stats['cache_hits'] += 1
                return self.model_cache[model_name]
            
            self.performance_stats['cache_misses'] += 1
            
            # Ensure model file exists (download if necessary)
            model_path = await self._ensure_model_available(model_info)
            
            # Determine optimal device
            target_device = force_device or self.memory_monitor.get_optimal_device(model_info.size_gb)
            
            # Free memory if needed
            await self._ensure_sufficient_memory(model_info.size_gb, target_device)
            
            # Load the model
            model = await self._load_model_from_file(model_path, model_info, target_device)
            
            # Apply optimizations
            model = self._apply_optimizations(model, model_info)
            
            # Cache the model
            self.model_cache[model_name] = model
            self._update_usage_stats(model_name, 'load')
            self.performance_stats['models_loaded'] += 1
            
            logger.info(f"Successfully loaded model {model_name} on {target_device}")
            return model
    
    async def unload_model(self, model_name: str):
        """Unload model from cache to free memory"""
        if model_name in self.model_cache:
            del self.model_cache[model_name]
            
            # Clear GPU cache if using CUDA
            if torch.cuda.is_available():
                torch.cuda.empty_cache()
            
            logger.info(f"Unloaded model {model_name}")
    
    async def unload_unused_models(self, keep_priority: ModelPriority = ModelPriority.HIGH):
        """Unload models that haven't been used recently"""
        current_time = time.time()
        models_to_unload = []
        
        for model_name in list(self.model_cache.keys()):
            model_info = self.model_registry[model_name]
            usage_stats = self.model_usage_stats.get(model_name, {})
            
            # Keep high priority models
            if model_info.priority.value >= keep_priority.value:
                continue
            
            # Check last usage time
            last_used = usage_stats.get('last_used', 0)
            if current_time - last_used > 300:  # 5 minutes
                models_to_unload.append(model_name)
        
        for model_name in models_to_unload:
            await self.unload_model(model_name)
    
    def get_memory_stats(self) -> MemoryStats:
        """Get current memory statistics"""
        return self.memory_monitor.get_memory_stats()
    
    def get_model_info(self, model_name: str) -> Optional[ModelInfo]:
        """Get information about a registered model"""
        return self.model_registry.get(model_name)
    
    def list_registered_models(self) -> List[str]:
        """List all registered model names"""
        return list(self.model_registry.keys())
    
    def list_loaded_models(self) -> List[str]:
        """List currently loaded model names"""
        return list(self.model_cache.keys())
    
    def get_performance_stats(self) -> Dict[str, Any]:
        """Get performance statistics"""
        stats = self.performance_stats.copy()
        stats['cache_hit_rate'] = (
            stats['cache_hits'] / max(stats['cache_hits'] + stats['cache_misses'], 1)
        )
        stats['memory_stats'] = self.get_memory_stats()
        stats['loaded_models'] = len(self.model_cache)
        stats['registered_models'] = len(self.model_registry)
        return stats
    
    def check_model_compatibility(self, model_name: str) -> Tuple[bool, List[str]]:
        """
        Check if a model is compatible with the current system
        
        Returns:
            Tuple of (is_compatible, list_of_issues)
        """
        if model_name not in self.model_registry:
            return False, [f"Model {model_name} not registered"]
        
        model_info = self.model_registry[model_name]
        return self.compatibility_checker.check_model_compatibility(model_info)
    
    def get_system_info(self) -> Dict[str, Any]:
        """Get system information for compatibility checking"""
        return self.compatibility_checker.get_system_info()
    
    def get_model_version(self, model_name: str) -> Optional[str]:
        """Get the version of a registered model"""
        model_info = self.model_registry.get(model_name)
        return model_info.version if model_info else None
    
    def get_latest_model_version(self, model_name: str) -> Optional[str]:
        """Get the latest available version of a model"""
        return self.version_manager.get_latest_version(model_name)
    
    def get_all_model_versions(self, model_name: str) -> List[str]:
        """Get all registered versions of a model"""
        return self.version_manager.get_all_versions(model_name)
    
    def suggest_model_upgrade(self, model_name: str) -> Optional[str]:
        """Suggest an upgrade if a newer version is available"""
        current_version = self.get_model_version(model_name)
        if not current_version:
            return None
        
        return self.version_manager.suggest_upgrade(model_name, current_version)
    
    def start_cleanup_task(self):
        """Start the periodic cleanup task (call after event loop is running)"""
        if self.config.cleanup_interval_seconds > 0 and self._cleanup_task is None:
            try:
                loop = asyncio.get_running_loop()
                self._cleanup_task = loop.create_task(self._periodic_cleanup())
                logger.info("Started periodic cleanup task")
            except RuntimeError:
                logger.warning("Cannot start cleanup task: no event loop running")
    
    def stop_cleanup_task(self):
        """Stop the periodic cleanup task"""
        if self._cleanup_task:
            self._cleanup_task.cancel()
            self._cleanup_task = None
            logger.info("Stopped periodic cleanup task")
    
    async def _ensure_model_available(self, model_info: ModelInfo) -> Path:
        """Ensure model file is available locally"""
        local_path = self.config.models_directory / model_info.file_path
        
        if local_path.exists():
            return local_path
        
        if not self.config.auto_download or not model_info.url:
            raise ModelNotFoundError(f"Model file not found: {local_path}")
        
        # Download the model
        self.performance_stats['download_count'] += 1
        return await self.download_manager.download_model(model_info)
    
    async def _ensure_sufficient_memory(self, required_gb: float, target_device: str):
        """Ensure sufficient memory is available for loading model"""
        if not self.memory_monitor.can_load_model(required_gb, target_device):
            # Try to free memory by unloading unused models
            await self.unload_unused_models(ModelPriority.MEDIUM)
            
            # Check again
            if not self.memory_monitor.can_load_model(required_gb, target_device):
                # More aggressive cleanup
                await self.unload_unused_models(ModelPriority.LOW)
                
                # Final check
                if not self.memory_monitor.can_load_model(required_gb, target_device):
                    stats = self.memory_monitor.get_memory_stats()
                    raise InsufficientMemoryError(
                        f"Cannot load {required_gb:.1f}GB model on {target_device}. "
                        f"Available: {stats.available_vram_gb:.1f}GB VRAM, {stats.available_ram_gb:.1f}GB RAM"
                    )
    
    async def _load_model_from_file(self, model_path: Path, model_info: ModelInfo, target_device: str) -> Module:
        """Load model from file with proper error handling"""
        try:
            # This is a placeholder - actual implementation would depend on the model format
            # For safetensors files, you'd use something like:
            # from safetensors.torch import load_file
            # state_dict = load_file(model_path)
            # model = create_model_from_state_dict(state_dict)
            
            # For now, create a mock model for testing
            class MockModel(torch.nn.Module):
                def __init__(self, size_gb: float):
                    super().__init__()
                    # Create parameters to simulate model size
                    param_count = int(size_gb * 1024**3 / 4)  # Assuming 4 bytes per parameter
                    self.weight = torch.nn.Parameter(torch.randn(param_count // 1000, 1000))
                
                def forward(self, x):
                    return torch.matmul(x, self.weight)
            
            model = MockModel(model_info.size_gb)
            model = model.to(target_device)
            
            return model
            
        except Exception as e:
            raise ModelLoadingError(f"Failed to load model from {model_path}: {str(e)}")
    
    def _apply_optimizations(self, model: Module, model_info: ModelInfo) -> Module:
        """Apply various optimizations to the model"""
        try:
            # Apply quantization if specified
            if model_info.quantization:
                model = self.optimizer.apply_quantization(model, model_info.quantization)
                self.performance_stats['memory_optimizations'] += 1
            
            # Enable gradient checkpointing for large models
            if model_info.size_gb > 4.0:
                model = self.optimizer.enable_gradient_checkpointing(model)
            
            # Optimize attention mechanism
            model = self.optimizer.optimize_attention_mechanism(model)
            
            return model
            
        except Exception as e:
            logger.error(f"Error applying optimizations to {model_info.name}: {str(e)}")
            return model
    
    def _update_usage_stats(self, model_name: str, action: str):
        """Update usage statistics for a model"""
        if model_name not in self.model_usage_stats:
            self.model_usage_stats[model_name] = {
                'load_count': 0,
                'cache_hits': 0,
                'last_used': 0,
                'total_usage_time': 0
            }
        
        stats = self.model_usage_stats[model_name]
        current_time = time.time()
        
        if action == 'load':
            stats['load_count'] += 1
        elif action == 'cache_hit':
            stats['cache_hits'] += 1
        
        stats['last_used'] = current_time
    
    async def _periodic_cleanup(self):
        """Periodic cleanup task to manage memory"""
        while True:
            try:
                await asyncio.sleep(self.config.cleanup_interval_seconds)
                
                # Check memory usage
                stats = self.memory_monitor.get_memory_stats()
                
                # If memory usage is high, unload unused models
                if stats.used_vram_gb > self.config.max_vram_usage_gb * 0.8:
                    await self.unload_unused_models(ModelPriority.MEDIUM)
                
                logger.debug(f"Cleanup completed. VRAM usage: {stats.used_vram_gb:.1f}GB")
                
            except Exception as e:
                logger.error(f"Error in periodic cleanup: {str(e)}")


# Model registry with predefined models
DEFAULT_MODELS_CONFIG = {
    # HunyuanVideo Models
    "hunyuan_video_i2v": {
        "type": "diffusion",
        "file_path": "diffusion_models/hunyuanvideo1.5_720p_i2v_fp16.safetensors",
        "size_gb": 4.5,
        "url": "https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/diffusion_models/hunyuanvideo1.5_720p_i2v_fp16.safetensors",
        "priority": "high",
        "quantization": "fp16"
    },
    "hunyuan_video_t2v": {
        "type": "diffusion",
        "file_path": "diffusion_models/hunyuanvideo1.5_720p_t2v_fp16.safetensors",
        "size_gb": 4.5,
        "url": "https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/diffusion_models/hunyuanvideo1.5_720p_t2v_fp16.safetensors",
        "priority": "high",
        "quantization": "fp16"
    },
    "hunyuan_video_sr": {
        "type": "diffusion",
        "file_path": "diffusion_models/hunyuanvideo1.5_1080p_sr_distilled_fp16.safetensors",
        "size_gb": 2.1,
        "url": "https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/diffusion_models/hunyuanvideo1.5_1080p_sr_distilled_fp16.safetensors",
        "priority": "medium",
        "quantization": "fp16"
    },
    
    # Wan Video Models (14B parameters)
    "wan_video_inpaint_high": {
        "type": "diffusion",
        "file_path": "diffusion_models/wan2.2_fun_inpaint_high_noise_14B_fp8_scaled.safetensors",
        "size_gb": 14.0,
        "priority": "medium",
        "quantization": "fp8"
    },
    "wan_video_inpaint_low": {
        "type": "diffusion",
        "file_path": "diffusion_models/wan2.2_fun_inpaint_low_noise_14B_fp8_scaled.safetensors",
        "size_gb": 14.0,
        "priority": "medium",
        "quantization": "fp8"
    },
    "wan_video_t2v": {
        "type": "diffusion",
        "file_path": "diffusion_models/wan2.1_t2v_14B_fp8_scaled.safetensors",
        "size_gb": 14.0,
        "priority": "medium",
        "quantization": "fp8"
    },
    
    # Text Encoders
    "qwen_text_encoder": {
        "type": "text_encoder",
        "file_path": "text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors",
        "size_gb": 7.0,
        "url": "https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/text_encoders/qwen_2.5_vl_7b_fp8_scaled.safetensors",
        "priority": "high",
        "quantization": "fp8"
    },
    
    # VAE Models
    "hunyuan_vae": {
        "type": "vae",
        "file_path": "vae/hunyuanvideo15_vae_fp16.safetensors",
        "size_gb": 1.2,
        "url": "https://huggingface.co/Comfy-Org/HunyuanVideo_1.5_repackaged/resolve/main/split_files/vae/hunyuanvideo15_vae_fp16.safetensors",
        "priority": "high",
        "quantization": "fp16"
    }
}


def create_default_model_manager(models_dir: str = "models") -> AdvancedModelManager:
    """Create a model manager with default configuration and models"""
    config = ModelManagerConfig(
        models_directory=Path(models_dir),
        max_vram_usage_gb=20.0,
        max_ram_usage_gb=32.0,
        enable_quantization=True,
        auto_download=True
    )
    
    manager = AdvancedModelManager(config)
    manager.register_models_from_config(DEFAULT_MODELS_CONFIG)
    
    return manager


if __name__ == "__main__":
    # Example usage
    async def main():
        # Create model manager
        manager = create_default_model_manager()
        
        # Load a model
        try:
            model = await manager.load_model("hunyuan_video_i2v")
            print(f"Successfully loaded model: {type(model)}")
            
            # Get performance stats
            stats = manager.get_performance_stats()
            print(f"Performance stats: {stats}")
            
        except Exception as e:
            print(f"Error loading model: {e}")
    
    # Run example
    asyncio.run(main())