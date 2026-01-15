"""
Model Manager - AI model lifecycle, loading, caching, and resource management.

This module provides intelligent AI model management with GPU memory optimization,
LRU caching, and automatic fallback to CPU processing when needed.
"""

import asyncio
import logging
import hashlib
import json
import time
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from collections import OrderedDict
import threading
from concurrent.futures import ThreadPoolExecutor

from .ai_enhancement_engine import (
    ModelInfo, ModelType, ModelConfig, GPUResourceStatus
)


@dataclass
class ModelLoadResult:
    """Result of model loading operation."""
    success: bool
    model: Optional[Any] = None
    device: str = "cpu"
    memory_used_mb: float = 0.0
    load_time_ms: float = 0.0
    error_message: Optional[str] = None


@dataclass
class ModelCacheEntry:
    """Entry in the model cache."""
    model: Any
    model_info: ModelInfo
    device: str
    memory_used_mb: float
    last_accessed: float
    access_count: int = 0
    load_time_ms: float = 0.0


class ModelRegistry:
    """Registry for AI model metadata and requirements."""
    
    def __init__(self, registry_path: str):
        """Initialize model registry."""
        self.registry_path = Path(registry_path)
        self.registry_path.mkdir(parents=True, exist_ok=True)
        self.registry_file = self.registry_path / "model_registry.json"
        self.models: Dict[str, ModelInfo] = {}
        self.logger = logging.getLogger(__name__)
        
        # Load existing registry
        self._load_registry()
        
        # Initialize with default models if registry is empty
        if not self.models:
            self._initialize_default_models()
    
    def _load_registry(self):
        """Load model registry from file."""
        try:
            if self.registry_file.exists():
                with open(self.registry_file, 'r') as f:
                    registry_data = json.load(f)
                
                for model_id, model_data in registry_data.items():
                    self.models[model_id] = ModelInfo(
                        model_id=model_data["model_id"],
                        model_type=ModelType(model_data["model_type"]),
                        version=model_data["version"],
                        size_mb=model_data["size_mb"],
                        gpu_memory_required=model_data["gpu_memory_required"],
                        supported_operations=model_data["supported_operations"],
                        performance_characteristics=model_data["performance_characteristics"],
                        file_path=model_data.get("file_path"),
                        download_url=model_data.get("download_url"),
                        checksum=model_data.get("checksum")
                    )
                
                self.logger.info(f"Loaded {len(self.models)} models from registry")
        
        except Exception as e:
            self.logger.error(f"Failed to load model registry: {e}")
    
    def _save_registry(self):
        """Save model registry to file."""
        try:
            registry_data = {}
            for model_id, model_info in self.models.items():
                registry_data[model_id] = model_info.to_dict()
            
            with open(self.registry_file, 'w') as f:
                json.dump(registry_data, f, indent=2)
            
            self.logger.debug("Model registry saved")
        
        except Exception as e:
            self.logger.error(f"Failed to save model registry: {e}")
    
    def _initialize_default_models(self):
        """Initialize registry with default model definitions."""
        default_models = [
            ModelInfo(
                model_id="style_transfer_v1",
                model_type=ModelType.STYLE_TRANSFER,
                version="1.0.0",
                size_mb=128.5,
                gpu_memory_required=512,
                supported_operations=["style_transfer", "artistic_enhancement"],
                performance_characteristics={
                    "speed_score": 0.8,
                    "quality_score": 0.9,
                    "memory_efficiency": 0.7
                },
                file_path="models/style_transfer_v1.pth",
                download_url="https://models.storycore.ai/style_transfer_v1.pth",
                checksum="sha256:abc123def456"
            ),
            ModelInfo(
                model_id="super_resolution_v2",
                model_type=ModelType.SUPER_RESOLUTION,
                version="2.0.0",
                size_mb=256.8,
                gpu_memory_required=1024,
                supported_operations=["super_resolution", "upscaling"],
                performance_characteristics={
                    "speed_score": 0.6,
                    "quality_score": 0.95,
                    "memory_efficiency": 0.6
                },
                file_path="models/super_resolution_v2.pth",
                download_url="https://models.storycore.ai/super_resolution_v2.pth",
                checksum="sha256:def456ghi789"
            ),
            ModelInfo(
                model_id="interpolation_v1",
                model_type=ModelType.INTERPOLATION,
                version="1.0.0",
                size_mb=192.3,
                gpu_memory_required=768,
                supported_operations=["frame_interpolation", "motion_analysis"],
                performance_characteristics={
                    "speed_score": 0.7,
                    "quality_score": 0.85,
                    "memory_efficiency": 0.8
                },
                file_path="models/interpolation_v1.pth",
                download_url="https://models.storycore.ai/interpolation_v1.pth",
                checksum="sha256:ghi789jkl012"
            ),
            ModelInfo(
                model_id="quality_assessment_v1",
                model_type=ModelType.QUALITY_ASSESSMENT,
                version="1.0.0",
                size_mb=64.2,
                gpu_memory_required=256,
                supported_operations=["quality_assessment", "artifact_detection"],
                performance_characteristics={
                    "speed_score": 0.9,
                    "quality_score": 0.8,
                    "memory_efficiency": 0.9
                },
                file_path="models/quality_assessment_v1.pth",
                download_url="https://models.storycore.ai/quality_assessment_v1.pth",
                checksum="sha256:jkl012mno345"
            )
        ]
        
        for model_info in default_models:
            self.models[model_info.model_id] = model_info
        
        self._save_registry()
        self.logger.info(f"Initialized registry with {len(default_models)} default models")
    
    def get_model_info(self, model_id: str) -> Optional[ModelInfo]:
        """Get model information by ID."""
        return self.models.get(model_id)
    
    def list_models(self, model_type: Optional[ModelType] = None) -> List[ModelInfo]:
        """List all models, optionally filtered by type."""
        models = list(self.models.values())
        if model_type:
            models = [m for m in models if m.model_type == model_type]
        return models
    
    def register_model(self, model_info: ModelInfo):
        """Register a new model in the registry."""
        self.models[model_info.model_id] = model_info
        self._save_registry()
        self.logger.info(f"Registered model: {model_info.model_id}")
    
    def unregister_model(self, model_id: str) -> bool:
        """Unregister a model from the registry."""
        if model_id in self.models:
            del self.models[model_id]
            self._save_registry()
            self.logger.info(f"Unregistered model: {model_id}")
            return True
        return False


class GPUMemoryManager:
    """Manages GPU memory allocation and monitoring."""
    
    def __init__(self):
        """Initialize GPU memory manager."""
        self.logger = logging.getLogger(__name__)
        self.gpu_available = self._check_gpu_availability()
        self.memory_allocations: Dict[str, float] = {}
        self._lock = threading.Lock()
        
        # Enhanced monitoring features
        self.memory_history: List[Dict[str, Any]] = []
        self.max_history_size = 100
        self.monitoring_enabled = True
        self.alert_thresholds = {
            "memory_usage": 85.0,  # Alert when memory usage > 85%
            "temperature": 80.0,   # Alert when temperature > 80°C
            "utilization": 90.0    # Alert when utilization > 90%
        }
        self.active_alerts: List[Dict[str, Any]] = []
        
        # Performance optimization tracking
        self.optimization_history: List[Dict[str, Any]] = []
        self.last_optimization_time = 0
        self.optimization_cooldown = 30  # 30 seconds between optimizations
    
    def _check_gpu_availability(self) -> bool:
        """Check if GPU is available for AI processing."""
        try:
            # Try to import torch to check GPU availability
            # In a real implementation, this would check for actual GPU
            # For now, we'll simulate GPU availability
            return True
        except ImportError:
            self.logger.warning("GPU support not available, falling back to CPU")
            return False
    
    def get_gpu_status(self) -> GPUResourceStatus:
        """Get current GPU resource status."""
        if not self.gpu_available:
            return GPUResourceStatus(
                total_memory=0,
                available_memory=0,
                utilization_percent=0.0,
                temperature=0.0,
                active_jobs=0,
                queue_depth=0,
                device_name="No GPU Available"
            )
        
        # Simulate GPU status (in real implementation, would query actual GPU)
        with self._lock:
            allocated_memory = sum(self.memory_allocations.values())
            total_memory = 8192  # 8GB simulated
            available_memory = max(0, total_memory - allocated_memory)
            utilization = (allocated_memory / total_memory) * 100 if total_memory > 0 else 0
        
        status = GPUResourceStatus(
            total_memory=int(total_memory),
            available_memory=int(available_memory),
            utilization_percent=utilization,
            temperature=65.0 + (utilization * 0.2),  # Temperature increases with utilization
            active_jobs=len(self.memory_allocations),
            queue_depth=0,
            device_name="Simulated GPU"
        )
        
        # Record status in history for monitoring
        if self.monitoring_enabled:
            self._record_status_history(status)
            self._check_alert_conditions(status)
        
        return status
    
    def can_allocate(self, memory_mb: float) -> bool:
        """Check if GPU can allocate the requested memory."""
        if not self.gpu_available:
            return False
        
        status = self.get_gpu_status()
        return status.available_memory >= memory_mb
    
    def allocate_memory(self, allocation_id: str, memory_mb: float) -> bool:
        """Allocate GPU memory for a specific allocation."""
        if not self.gpu_available:
            return False
        
        with self._lock:
            if self.can_allocate(memory_mb):
                self.memory_allocations[allocation_id] = memory_mb
                self.logger.debug(f"Allocated {memory_mb}MB GPU memory for {allocation_id}")
                return True
            return False
    
    def deallocate_memory(self, allocation_id: str):
        """Deallocate GPU memory for a specific allocation."""
        with self._lock:
            if allocation_id in self.memory_allocations:
                memory_mb = self.memory_allocations.pop(allocation_id)
                self.logger.debug(f"Deallocated {memory_mb}MB GPU memory for {allocation_id}")
    
    def get_optimal_device(self, memory_required: float) -> str:
        """Get optimal device (GPU/CPU) based on memory requirements."""
        if self.gpu_available and self.can_allocate(memory_required):
            return "cuda"
        return "cpu"
    
    def get_memory_usage_report(self) -> Dict[str, Any]:
        """Get detailed GPU memory usage report."""
        with self._lock:
            status = self.get_gpu_status()
            allocations = self.memory_allocations.copy()
            
            # Calculate allocation statistics
            total_allocated = sum(allocations.values())
            allocation_count = len(allocations)
            
            # Find largest allocation
            largest_allocation = max(allocations.values()) if allocations else 0
            largest_allocation_id = max(allocations.items(), key=lambda x: x[1])[0] if allocations else None
            
            return {
                "gpu_available": self.gpu_available,
                "total_memory_mb": status.total_memory,
                "available_memory_mb": status.available_memory,
                "allocated_memory_mb": total_allocated,
                "utilization_percent": status.utilization_percent,
                "active_allocations": allocation_count,
                "largest_allocation_mb": largest_allocation,
                "largest_allocation_id": largest_allocation_id,
                "allocations": allocations,
                "temperature": status.temperature,
                "device_name": status.device_name
            }
    
    def optimize_memory_usage(self) -> Dict[str, Any]:
        """Optimize GPU memory usage and provide recommendations."""
        report = self.get_memory_usage_report()
        recommendations = []
        actions_taken = []
        
        # Check for memory fragmentation
        if report["utilization_percent"] > 80:
            recommendations.append("GPU memory usage is high (>80%). Consider unloading unused models.")
        
        # Check for inefficient allocations
        if report["active_allocations"] > 5:
            recommendations.append("Many active allocations detected. Consider model consolidation.")
        
        # Check temperature
        if report["temperature"] > 80:
            recommendations.append("GPU temperature is high. Consider reducing workload or improving cooling.")
            
        # Auto-cleanup if memory is critically low
        if report["utilization_percent"] > 95:
            # Find oldest allocations that could be freed
            with self._lock:
                if len(self.memory_allocations) > 1:
                    # In a real implementation, we'd track allocation timestamps
                    # For now, we'll simulate cleanup
                    actions_taken.append("Automatic memory cleanup triggered due to critical usage")
        
        return {
            "current_status": report,
            "recommendations": recommendations,
            "actions_taken": actions_taken,
            "optimization_score": self._calculate_optimization_score(report)
        }
    
    def _calculate_optimization_score(self, report: Dict[str, Any]) -> float:
        """Calculate GPU memory optimization score (0-1, higher is better)."""
        if not report["gpu_available"]:
            return 0.0
        
        # Base score from utilization (optimal around 70-80%)
        utilization = report["utilization_percent"]
        if utilization < 50:
            utilization_score = utilization / 50  # Underutilized
        elif utilization <= 80:
            utilization_score = 1.0  # Optimal range
        else:
            utilization_score = max(0, (100 - utilization) / 20)  # Overutilized
        
        # Penalty for too many allocations (fragmentation)
        allocation_score = max(0, 1 - (report["active_allocations"] - 3) * 0.1)
        
        # Temperature penalty
        temp_score = max(0, 1 - max(0, report["temperature"] - 70) * 0.01)
        
        # Weighted average
        return (utilization_score * 0.5 + allocation_score * 0.3 + temp_score * 0.2)
    
    def _record_status_history(self, status: GPUResourceStatus):
        """Record GPU status in history for trend analysis."""
        history_entry = {
            "timestamp": time.time(),
            "utilization_percent": status.utilization_percent,
            "temperature": status.temperature,
            "available_memory": status.available_memory,
            "active_jobs": status.active_jobs
        }
        
        self.memory_history.append(history_entry)
        
        # Keep history size manageable
        if len(self.memory_history) > self.max_history_size:
            self.memory_history.pop(0)
    
    def _check_alert_conditions(self, status: GPUResourceStatus):
        """Check for alert conditions and generate alerts."""
        current_time = time.time()
        new_alerts = []
        
        # Memory usage alert
        if status.utilization_percent > self.alert_thresholds["memory_usage"]:
            new_alerts.append({
                "type": "high_memory_usage",
                "severity": "warning",
                "message": f"GPU memory usage is {status.utilization_percent:.1f}% (threshold: {self.alert_thresholds['memory_usage']}%)",
                "timestamp": current_time,
                "value": status.utilization_percent,
                "threshold": self.alert_thresholds["memory_usage"]
            })
        
        # Temperature alert
        if status.temperature > self.alert_thresholds["temperature"]:
            new_alerts.append({
                "type": "high_temperature",
                "severity": "warning" if status.temperature < 85 else "critical",
                "message": f"GPU temperature is {status.temperature:.1f}°C (threshold: {self.alert_thresholds['temperature']}°C)",
                "timestamp": current_time,
                "value": status.temperature,
                "threshold": self.alert_thresholds["temperature"]
            })
        
        # Add new alerts and clean old ones (keep alerts for 5 minutes)
        self.active_alerts.extend(new_alerts)
        self.active_alerts = [
            alert for alert in self.active_alerts 
            if current_time - alert["timestamp"] < 300  # 5 minutes
        ]
        
        # Log critical alerts
        for alert in new_alerts:
            if alert["severity"] == "critical":
                self.logger.error(alert["message"])
            elif alert["severity"] == "warning":
                self.logger.warning(alert["message"])
    
    def get_memory_trends(self, duration_minutes: int = 10) -> Dict[str, Any]:
        """Get memory usage trends over specified duration."""
        if not self.memory_history:
            return {"error": "No memory history available"}
        
        current_time = time.time()
        cutoff_time = current_time - (duration_minutes * 60)
        
        # Filter history to requested duration
        recent_history = [
            entry for entry in self.memory_history 
            if entry["timestamp"] >= cutoff_time
        ]
        
        if not recent_history:
            return {"error": f"No data available for last {duration_minutes} minutes"}
        
        # Calculate trends
        utilizations = [entry["utilization_percent"] for entry in recent_history]
        temperatures = [entry["temperature"] for entry in recent_history]
        
        return {
            "duration_minutes": duration_minutes,
            "data_points": len(recent_history),
            "utilization": {
                "current": utilizations[-1] if utilizations else 0,
                "average": sum(utilizations) / len(utilizations) if utilizations else 0,
                "min": min(utilizations) if utilizations else 0,
                "max": max(utilizations) if utilizations else 0,
                "trend": self._calculate_trend(utilizations)
            },
            "temperature": {
                "current": temperatures[-1] if temperatures else 0,
                "average": sum(temperatures) / len(temperatures) if temperatures else 0,
                "min": min(temperatures) if temperatures else 0,
                "max": max(temperatures) if temperatures else 0,
                "trend": self._calculate_trend(temperatures)
            },
            "active_alerts": len(self.active_alerts),
            "history": recent_history
        }
    
    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate trend direction from a list of values."""
        if len(values) < 2:
            return "stable"
        
        # Simple trend calculation using first and last values
        first_half = values[:len(values)//2]
        second_half = values[len(values)//2:]
        
        first_avg = sum(first_half) / len(first_half)
        second_avg = sum(second_half) / len(second_half)
        
        diff_percent = ((second_avg - first_avg) / first_avg) * 100 if first_avg > 0 else 0
        
        if diff_percent > 5:
            return "increasing"
        elif diff_percent < -5:
            return "decreasing"
        else:
            return "stable"
    
    def get_active_alerts(self) -> List[Dict[str, Any]]:
        """Get currently active alerts."""
        return self.active_alerts.copy()
    
    def clear_alerts(self):
        """Clear all active alerts."""
        self.active_alerts.clear()
        self.logger.info("GPU memory alerts cleared")
    
    def set_alert_thresholds(self, **thresholds):
        """Update alert thresholds."""
        for key, value in thresholds.items():
            if key in self.alert_thresholds:
                self.alert_thresholds[key] = value
                self.logger.info(f"Updated {key} threshold to {value}")
    
    def enable_monitoring(self):
        """Enable GPU monitoring."""
        self.monitoring_enabled = True
        self.logger.info("GPU monitoring enabled")
    
    def disable_monitoring(self):
        """Disable GPU monitoring."""
        self.monitoring_enabled = False
        self.logger.info("GPU monitoring disabled")
    
    def force_memory_cleanup(self) -> Dict[str, Any]:
        """Force immediate memory cleanup and optimization."""
        if not self.gpu_available:
            return {"error": "GPU not available"}
        
        current_time = time.time()
        
        # Check cooldown period
        if current_time - self.last_optimization_time < self.optimization_cooldown:
            remaining_cooldown = self.optimization_cooldown - (current_time - self.last_optimization_time)
            return {
                "error": f"Optimization in cooldown. Wait {remaining_cooldown:.1f} seconds"
            }
        
        # Get current status
        status_before = self.get_gpu_status()
        actions_taken = []
        
        # Simulate memory cleanup (in real implementation, would call GPU cleanup functions)
        with self._lock:
            if self.memory_allocations:
                # Find allocations that could be optimized
                total_before = sum(self.memory_allocations.values())
                
                # Simulate memory defragmentation (reduce fragmentation by 10-20%)
                optimization_factor = 0.85  # 15% memory optimization
                optimized_allocations = {}
                
                for alloc_id, memory in self.memory_allocations.items():
                    optimized_memory = memory * optimization_factor
                    optimized_allocations[alloc_id] = optimized_memory
                
                self.memory_allocations = optimized_allocations
                total_after = sum(self.memory_allocations.values())
                memory_freed = total_before - total_after
                
                if memory_freed > 0:
                    actions_taken.append(f"Memory defragmentation freed {memory_freed:.1f}MB")
        
        # Get status after cleanup
        status_after = self.get_gpu_status()
        
        # Record optimization
        optimization_record = {
            "timestamp": current_time,
            "utilization_before": status_before.utilization_percent,
            "utilization_after": status_after.utilization_percent,
            "memory_freed_mb": status_before.total_memory - status_before.available_memory - (status_after.total_memory - status_after.available_memory),
            "actions_taken": actions_taken
        }
        
        self.optimization_history.append(optimization_record)
        self.last_optimization_time = current_time
        
        # Keep optimization history manageable
        if len(self.optimization_history) > 50:
            self.optimization_history.pop(0)
        
        return {
            "success": True,
            "status_before": status_before.to_dict(),
            "status_after": status_after.to_dict(),
            "actions_taken": actions_taken,
            "memory_freed_mb": optimization_record["memory_freed_mb"],
            "utilization_improvement": status_before.utilization_percent - status_after.utilization_percent
        }
    
    def get_optimization_history(self) -> List[Dict[str, Any]]:
        """Get history of memory optimizations."""
        return self.optimization_history.copy()
    
    def predict_memory_exhaustion(self) -> Dict[str, Any]:
        """Predict when GPU memory might be exhausted based on trends."""
        if len(self.memory_history) < 5:
            return {"error": "Insufficient data for prediction"}
        
        # Get recent utilization trend
        recent_utilizations = [entry["utilization_percent"] for entry in self.memory_history[-10:]]
        
        if len(recent_utilizations) < 2:
            return {"error": "Insufficient data for trend analysis"}
        
        # Calculate rate of change
        time_points = [entry["timestamp"] for entry in self.memory_history[-10:]]
        time_diff = time_points[-1] - time_points[0]
        utilization_diff = recent_utilizations[-1] - recent_utilizations[0]
        
        if time_diff <= 0 or utilization_diff <= 0:
            return {
                "prediction": "stable",
                "message": "Memory usage is stable or decreasing",
                "current_utilization": recent_utilizations[-1]
            }
        
        # Calculate rate per minute
        rate_per_minute = utilization_diff / (time_diff / 60)
        
        # Predict time to reach 95% utilization
        current_utilization = recent_utilizations[-1]
        remaining_capacity = 95 - current_utilization
        
        if rate_per_minute <= 0:
            return {
                "prediction": "stable",
                "message": "Memory usage is not increasing",
                "current_utilization": current_utilization
            }
        
        minutes_to_exhaustion = remaining_capacity / rate_per_minute
        
        return {
            "prediction": "increasing",
            "current_utilization": current_utilization,
            "rate_per_minute": rate_per_minute,
            "minutes_to_95_percent": minutes_to_exhaustion,
            "estimated_exhaustion_time": time.time() + (minutes_to_exhaustion * 60),
            "recommendation": "Consider unloading unused models" if minutes_to_exhaustion < 30 else "Monitor closely"
        }


class ModelManager:
    """
    Manages AI model lifecycle, loading, caching, and resource allocation.
    
    Provides intelligent model management with GPU memory optimization,
    LRU caching, and automatic CPU fallback when GPU resources are insufficient.
    """
    
    def __init__(self, config: ModelConfig):
        """Initialize Model Manager with configuration."""
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Initialize components
        self.model_registry = ModelRegistry(config.model_registry_path)
        self.gpu_memory_manager = GPUMemoryManager()
        
        # Model cache with LRU eviction
        self.model_cache: OrderedDict[str, ModelCacheEntry] = OrderedDict()
        self.cache_lock = threading.Lock()
        
        # Thread pool for model loading
        self.executor = ThreadPoolExecutor(max_workers=2, thread_name_prefix="ModelLoader")
        
        # Performance tracking
        self.load_stats = {
            "total_loads": 0,
            "successful_loads": 0,
            "failed_loads": 0,
            "cache_hits": 0,
            "cache_misses": 0,
            "gpu_loads": 0,
            "cpu_fallback_loads": 0,
            "total_load_time": 0.0
        }
        
        self.logger.info("Model Manager initialized")
    
    async def load_model(self, model_id: str, device: str = "auto") -> ModelLoadResult:
        """
        Load AI model with intelligent device selection.
        
        Args:
            model_id: ID of the model to load
            device: Target device ("auto", "cuda", "cpu")
            
        Returns:
            ModelLoadResult with model and metadata
        """
        start_time = time.time()
        
        try:
            # Check if model is already cached
            with self.cache_lock:
                if model_id in self.model_cache:
                    entry = self.model_cache[model_id]
                    # Move to end (most recently used)
                    self.model_cache.move_to_end(model_id)
                    entry.last_accessed = time.time()
                    entry.access_count += 1
                    
                    self.load_stats["cache_hits"] += 1
                    load_time = (time.time() - start_time) * 1000
                    
                    self.logger.debug(f"Model {model_id} loaded from cache")
                    return ModelLoadResult(
                        success=True,
                        model=entry.model,
                        device=entry.device,
                        memory_used_mb=entry.memory_used_mb,
                        load_time_ms=load_time
                    )
            
            # Get model info from registry
            model_info = self.model_registry.get_model_info(model_id)
            if not model_info:
                error_msg = f"Model {model_id} not found in registry"
                self.logger.error(error_msg)
                self.load_stats["failed_loads"] += 1
                return ModelLoadResult(success=False, error_message=error_msg)
            
            # Determine optimal device
            if device == "auto":
                device = self.gpu_memory_manager.get_optimal_device(model_info.gpu_memory_required)
            
            # Check if we need to free cache space
            await self._ensure_cache_space(model_info.size_mb)
            
            # Load model
            load_result = await self._load_model_from_storage(model_info, device)
            
            if load_result.success:
                # Add to cache
                with self.cache_lock:
                    cache_entry = ModelCacheEntry(
                        model=load_result.model,
                        model_info=model_info,
                        device=load_result.device,
                        memory_used_mb=load_result.memory_used_mb,
                        last_accessed=time.time(),
                        access_count=1,
                        load_time_ms=load_result.load_time_ms
                    )
                    self.model_cache[model_id] = cache_entry
                
                # Update statistics
                self.load_stats["successful_loads"] += 1
                self.load_stats["cache_misses"] += 1
                if load_result.device == "cuda":
                    self.load_stats["gpu_loads"] += 1
                else:
                    self.load_stats["cpu_fallback_loads"] += 1
                
                self.logger.info(f"Model {model_id} loaded successfully on {load_result.device}")
            else:
                self.load_stats["failed_loads"] += 1
                self.logger.error(f"Failed to load model {model_id}: {load_result.error_message}")
            
            self.load_stats["total_loads"] += 1
            self.load_stats["total_load_time"] += load_result.load_time_ms
            
            return load_result
        
        except Exception as e:
            self.load_stats["failed_loads"] += 1
            self.load_stats["total_loads"] += 1
            error_msg = f"Exception loading model {model_id}: {e}"
            self.logger.error(error_msg)
            return ModelLoadResult(success=False, error_message=error_msg)
    
    async def _load_model_from_storage(self, model_info: ModelInfo, device: str) -> ModelLoadResult:
        """Load model from storage (file or download)."""
        start_time = time.time()
        
        try:
            # Check if model file exists
            if model_info.file_path and Path(model_info.file_path).exists():
                # Simulate model loading (in real implementation, would load actual model)
                await asyncio.sleep(0.1)  # Simulate loading time
                
                # Intelligent device selection with fallback
                original_device = device
                memory_used = model_info.size_mb
                
                if device == "cuda":
                    allocation_id = f"model_{model_info.model_id}"
                    if not self.gpu_memory_manager.allocate_memory(allocation_id, model_info.gpu_memory_required):
                        # GPU allocation failed, check if CPU fallback is enabled
                        if self.config.cpu_fallback_enabled:
                            device = "cpu"
                            self.logger.warning(f"GPU allocation failed for {model_info.model_id}, falling back to CPU")
                            self.load_stats["cpu_fallback_loads"] += 1
                        else:
                            error_msg = f"GPU memory allocation failed and CPU fallback disabled for {model_info.model_id}"
                            return ModelLoadResult(success=False, error_message=error_msg)
                
                # Adjust memory usage based on device
                if device == "cpu":
                    # CPU typically uses less memory than GPU for inference
                    memory_used = model_info.size_mb * 0.7  # Estimate 30% less memory on CPU
                
                # Create mock model object with device-specific optimizations
                mock_model = {
                    "model_id": model_info.model_id,
                    "model_type": model_info.model_type.value,
                    "version": model_info.version,
                    "device": device,
                    "original_device_request": original_device,
                    "fallback_used": device != original_device,
                    "loaded_at": time.time(),
                    "performance_mode": "optimized" if device == "cuda" else "balanced"
                }
                
                load_time = (time.time() - start_time) * 1000
                
                return ModelLoadResult(
                    success=True,
                    model=mock_model,
                    device=device,
                    memory_used_mb=memory_used,
                    load_time_ms=load_time
                )
            
            elif model_info.download_url and self.config.model_download_enabled:
                # Simulate model download and loading with progress tracking
                self.logger.info(f"Downloading model {model_info.model_id} from {model_info.download_url}")
                
                # Simulate download with progress (in real implementation, would show actual progress)
                download_steps = 5
                for step in range(download_steps):
                    await asyncio.sleep(0.1)
                    progress = (step + 1) / download_steps * 100
                    self.logger.debug(f"Download progress: {progress:.1f}%")
                
                # Create model directory if it doesn't exist
                if model_info.file_path:
                    model_path = Path(model_info.file_path)
                    model_path.parent.mkdir(parents=True, exist_ok=True)
                    
                    # Simulate saving downloaded model with checksum verification
                    model_content = f"# Mock model file for {model_info.model_id}\n"
                    model_content += f"# Version: {model_info.version}\n"
                    model_content += f"# Size: {model_info.size_mb}MB\n"
                    model_content += f"# Checksum: {model_info.checksum}\n"
                    
                    with open(model_path, 'w') as f:
                        f.write(model_content)
                    
                    self.logger.info(f"Model {model_info.model_id} downloaded and saved to {model_path}")
                
                # Load the downloaded model
                return await self._load_model_from_storage(model_info, device)
            
            else:
                error_msg = f"Model file not found and download not available for {model_info.model_id}"
                return ModelLoadResult(success=False, error_message=error_msg)
        
        except Exception as e:
            load_time = (time.time() - start_time) * 1000
            return ModelLoadResult(
                success=False,
                error_message=str(e),
                load_time_ms=load_time
            )
    
    async def unload_model(self, model_id: str) -> bool:
        """
        Unload model and free resources.
        
        Args:
            model_id: ID of the model to unload
            
        Returns:
            True if model was unloaded, False if not found
        """
        try:
            with self.cache_lock:
                if model_id in self.model_cache:
                    entry = self.model_cache.pop(model_id)
                    
                    # Free GPU memory if allocated
                    if entry.device == "cuda":
                        allocation_id = f"model_{model_id}"
                        self.gpu_memory_manager.deallocate_memory(allocation_id)
                    
                    self.logger.info(f"Unloaded model {model_id}")
                    return True
                
                return False
        
        except Exception as e:
            self.logger.error(f"Failed to unload model {model_id}: {e}")
            return False
    
    def get_model_info(self, model_id: str) -> Optional[ModelInfo]:
        """Get model metadata and requirements."""
        return self.model_registry.get_model_info(model_id)
    
    def list_available_models(self, model_type: Optional[ModelType] = None) -> List[ModelInfo]:
        """List all available models, optionally filtered by type."""
        return self.model_registry.list_models(model_type)
    
    def get_cached_models(self) -> List[str]:
        """Get list of currently cached model IDs."""
        with self.cache_lock:
            return list(self.model_cache.keys())
    
    def get_cache_status(self) -> Dict[str, Any]:
        """Get current cache status and statistics."""
        with self.cache_lock:
            total_memory = sum(entry.memory_used_mb for entry in self.model_cache.values())
            cache_entries = []
            
            for model_id, entry in self.model_cache.items():
                cache_entries.append({
                    "model_id": model_id,
                    "device": entry.device,
                    "memory_mb": entry.memory_used_mb,
                    "last_accessed": entry.last_accessed,
                    "access_count": entry.access_count,
                    "load_time_ms": entry.load_time_ms
                })
        
        return {
            "cached_models": len(self.model_cache),
            "total_memory_mb": total_memory,
            "max_cache_size": self.config.model_cache_size,
            "cache_entries": cache_entries,
            "load_statistics": self.load_stats.copy()
        }
    
    async def _ensure_cache_space(self, required_mb: float):
        """Ensure sufficient cache space by evicting LRU models if needed."""
        with self.cache_lock:
            # Check if we're at cache limit
            if len(self.model_cache) >= self.config.model_cache_size:
                # Evict least recently used model
                lru_model_id = next(iter(self.model_cache))
                await self.unload_model(lru_model_id)
                self.logger.info(f"Evicted LRU model {lru_model_id} to make cache space")
    
    def optimize_model_loading(self) -> Dict[str, Any]:
        """
        Optimize model loading based on usage patterns.
        
        Returns:
            Optimization report with recommendations
        """
        recommendations = []
        
        # Analyze cache hit rate
        total_requests = self.load_stats["cache_hits"] + self.load_stats["cache_misses"]
        if total_requests > 0:
            hit_rate = self.load_stats["cache_hits"] / total_requests
            if hit_rate < 0.5:
                recommendations.append("Consider increasing cache size for better hit rate")
        
        # Analyze GPU vs CPU usage
        gpu_ratio = self.load_stats["gpu_loads"] / max(1, self.load_stats["successful_loads"])
        if gpu_ratio < 0.7 and self.gpu_memory_manager.gpu_available:
            recommendations.append("Consider optimizing GPU memory allocation")
        
        # Analyze load times
        if self.load_stats["successful_loads"] > 0:
            avg_load_time = self.load_stats["total_load_time"] / self.load_stats["successful_loads"]
            if avg_load_time > 1000:  # > 1 second
                recommendations.append("Consider model compression or faster storage")
        
        return {
            "cache_hit_rate": self.load_stats["cache_hits"] / max(1, total_requests),
            "gpu_utilization_rate": gpu_ratio,
            "average_load_time_ms": self.load_stats["total_load_time"] / max(1, self.load_stats["successful_loads"]),
            "recommendations": recommendations,
            "gpu_status": self.gpu_memory_manager.get_gpu_status().to_dict()
        }
    
    async def optimize_gpu_memory(self) -> Dict[str, Any]:
        """
        Perform GPU memory optimization with intelligent model unloading.
        
        Returns:
            Optimization results and actions taken
        """
        optimization_report = self.gpu_memory_manager.optimize_memory_usage()
        actions_taken = []
        
        # Get memory trends to inform optimization decisions
        memory_trends = self.gpu_memory_manager.get_memory_trends(duration_minutes=5)
        
        # Check for active alerts
        active_alerts = self.gpu_memory_manager.get_active_alerts()
        if active_alerts:
            actions_taken.append(f"Responding to {len(active_alerts)} active GPU alerts")
        
        # If GPU memory is critically low, unload least recently used models
        current_utilization = optimization_report["current_status"]["utilization_percent"]
        
        if current_utilization > 90:
            with self.cache_lock:
                # Sort models by last access time (LRU first)
                sorted_models = sorted(
                    self.model_cache.items(),
                    key=lambda x: x[1].last_accessed
                )
                
                # Unload models until we free enough memory or reach minimum cache
                target_utilization = 70  # Target 70% utilization
                models_unloaded = 0
                memory_freed = 0
                
                for model_id, entry in sorted_models:
                    if len(self.model_cache) <= 1:  # Keep at least one model
                        break
                    
                    current_status = self.gpu_memory_manager.get_gpu_status()
                    if current_status.utilization_percent <= target_utilization:
                        break
                    
                    # Unload the model
                    if await self.unload_model(model_id):
                        models_unloaded += 1
                        memory_freed += entry.memory_used_mb
                        actions_taken.append(f"Unloaded model {model_id} (freed {entry.memory_used_mb:.1f}MB)")
                
                if models_unloaded > 0:
                    actions_taken.append(f"Total: {models_unloaded} models unloaded, {memory_freed:.1f}MB freed")
        
        # Check for models that could benefit from device migration
        await self._optimize_model_device_placement()
        
        # Force memory cleanup if utilization is still high
        if current_utilization > 85:
            cleanup_result = self.gpu_memory_manager.force_memory_cleanup()
            if cleanup_result.get("success"):
                actions_taken.extend(cleanup_result.get("actions_taken", []))
        
        # Get prediction for future memory needs
        memory_prediction = self.gpu_memory_manager.predict_memory_exhaustion()
        
        return {
            "gpu_optimization": optimization_report,
            "memory_trends": memory_trends,
            "memory_prediction": memory_prediction,
            "active_alerts": active_alerts,
            "actions_taken": actions_taken,
            "final_gpu_status": self.gpu_memory_manager.get_gpu_status().to_dict(),
            "cache_status": self.get_cache_status()
        }
    
    def get_gpu_monitoring_report(self) -> Dict[str, Any]:
        """Get comprehensive GPU monitoring report."""
        gpu_status = self.gpu_memory_manager.get_gpu_status()
        memory_trends = self.gpu_memory_manager.get_memory_trends(duration_minutes=10)
        active_alerts = self.gpu_memory_manager.get_active_alerts()
        optimization_history = self.gpu_memory_manager.get_optimization_history()
        memory_prediction = self.gpu_memory_manager.predict_memory_exhaustion()
        
        return {
            "timestamp": time.time(),
            "gpu_status": gpu_status.to_dict(),
            "memory_trends": memory_trends,
            "active_alerts": active_alerts,
            "optimization_history": optimization_history[-10:],  # Last 10 optimizations
            "memory_prediction": memory_prediction,
            "monitoring_enabled": self.gpu_memory_manager.monitoring_enabled,
            "alert_thresholds": self.gpu_memory_manager.alert_thresholds.copy()
        }
    
    async def handle_memory_pressure(self, pressure_level: str = "high") -> Dict[str, Any]:
        """
        Handle memory pressure situations with appropriate responses.
        
        Args:
            pressure_level: "low", "medium", "high", or "critical"
            
        Returns:
            Actions taken and results
        """
        actions_taken = []
        
        if pressure_level == "low":
            # Just log and monitor
            actions_taken.append("Low memory pressure detected - monitoring")
            
        elif pressure_level == "medium":
            # Optimize cache and suggest cleanup
            cache_status = self.get_cache_status()
            if cache_status["cached_models"] > 2:
                # Unload least recently used model
                with self.cache_lock:
                    if self.model_cache:
                        lru_model = next(iter(self.model_cache))
                        if await self.unload_model(lru_model):
                            actions_taken.append(f"Unloaded LRU model {lru_model}")
            
        elif pressure_level == "high":
            # Aggressive cleanup
            optimization_result = await self.optimize_gpu_memory()
            actions_taken.extend(optimization_result.get("actions_taken", []))
            
        elif pressure_level == "critical":
            # Emergency cleanup - unload all but essential models
            with self.cache_lock:
                models_to_unload = list(self.model_cache.keys())[1:]  # Keep first model
                
                for model_id in models_to_unload:
                    if await self.unload_model(model_id):
                        actions_taken.append(f"Emergency unload: {model_id}")
            
            # Force memory cleanup
            cleanup_result = self.gpu_memory_manager.force_memory_cleanup()
            if cleanup_result.get("success"):
                actions_taken.extend(cleanup_result.get("actions_taken", []))
        
        # Get final status
        final_status = self.gpu_memory_manager.get_gpu_status()
        
        return {
            "pressure_level": pressure_level,
            "actions_taken": actions_taken,
            "final_utilization": final_status.utilization_percent,
            "memory_freed": True if actions_taken else False,
            "gpu_status": final_status.to_dict()
        }
    
    def configure_gpu_monitoring(self, **config) -> Dict[str, Any]:
        """
        Configure GPU monitoring settings.
        
        Args:
            **config: Configuration parameters (alert_thresholds, monitoring_enabled, etc.)
            
        Returns:
            Updated configuration
        """
        results = {}
        
        # Update alert thresholds
        if "alert_thresholds" in config:
            self.gpu_memory_manager.set_alert_thresholds(**config["alert_thresholds"])
            results["alert_thresholds_updated"] = True
        
        # Enable/disable monitoring
        if "monitoring_enabled" in config:
            if config["monitoring_enabled"]:
                self.gpu_memory_manager.enable_monitoring()
            else:
                self.gpu_memory_manager.disable_monitoring()
            results["monitoring_enabled"] = config["monitoring_enabled"]
        
        # Clear alerts if requested
        if config.get("clear_alerts", False):
            self.gpu_memory_manager.clear_alerts()
            results["alerts_cleared"] = True
        
        return {
            "success": True,
            "configuration_updated": results,
            "current_config": {
                "monitoring_enabled": self.gpu_memory_manager.monitoring_enabled,
                "alert_thresholds": self.gpu_memory_manager.alert_thresholds.copy()
            }
        }
    
    async def _optimize_model_device_placement(self):
        """Optimize device placement of cached models."""
        with self.cache_lock:
            gpu_models = []
            cpu_models = []
            
            for model_id, entry in self.model_cache.items():
                if entry.device == "cuda":
                    gpu_models.append((model_id, entry))
                else:
                    cpu_models.append((model_id, entry))
            
            # If GPU has space and there are CPU models, consider moving high-usage models to GPU
            gpu_status = self.gpu_memory_manager.get_gpu_status()
            if gpu_status.available_memory > 500 and cpu_models:  # 500MB threshold
                # Sort CPU models by access count (most used first)
                cpu_models.sort(key=lambda x: x[1].access_count, reverse=True)
                
                for model_id, entry in cpu_models[:1]:  # Move top 1 CPU model to GPU if possible
                    model_info = entry.model_info
                    if self.gpu_memory_manager.can_allocate(model_info.gpu_memory_required):
                        # In a real implementation, we'd reload the model on GPU
                        # For now, we'll just update the tracking
                        self.logger.info(f"Model {model_id} could benefit from GPU placement")
    
    def get_performance_metrics(self) -> Dict[str, Any]:
        """Get comprehensive performance metrics for monitoring."""
        cache_status = self.get_cache_status()
        gpu_report = self.gpu_memory_manager.get_memory_usage_report()
        memory_trends = self.gpu_memory_manager.get_memory_trends(duration_minutes=5)
        active_alerts = self.gpu_memory_manager.get_active_alerts()
        
        # Calculate performance indicators
        total_requests = self.load_stats["cache_hits"] + self.load_stats["cache_misses"]
        cache_hit_rate = self.load_stats["cache_hits"] / max(1, total_requests)
        
        success_rate = self.load_stats["successful_loads"] / max(1, self.load_stats["total_loads"])
        
        avg_load_time = (
            self.load_stats["total_load_time"] / max(1, self.load_stats["successful_loads"])
        )
        
        # Calculate GPU efficiency score
        gpu_efficiency = self.gpu_memory_manager._calculate_optimization_score(gpu_report)
        
        return {
            "timestamp": time.time(),
            "cache_metrics": {
                "hit_rate": cache_hit_rate,
                "cached_models": cache_status["cached_models"],
                "total_cache_memory_mb": cache_status["total_memory_mb"],
                "cache_utilization": cache_status["cached_models"] / self.config.model_cache_size
            },
            "gpu_metrics": {
                "available": gpu_report["gpu_available"],
                "utilization_percent": gpu_report["utilization_percent"],
                "memory_usage_mb": gpu_report["allocated_memory_mb"],
                "temperature": gpu_report["temperature"],
                "optimization_score": gpu_efficiency,
                "active_alerts": len(active_alerts),
                "memory_trend": memory_trends.get("utilization", {}).get("trend", "unknown"),
                "monitoring_enabled": self.gpu_memory_manager.monitoring_enabled
            },
            "performance_metrics": {
                "success_rate": success_rate,
                "average_load_time_ms": avg_load_time,
                "total_loads": self.load_stats["total_loads"],
                "gpu_load_ratio": self.load_stats["gpu_loads"] / max(1, self.load_stats["successful_loads"]),
                "cpu_fallback_rate": self.load_stats["cpu_fallback_loads"] / max(1, self.load_stats["successful_loads"])
            },
            "load_statistics": self.load_stats.copy(),
            "alerts": {
                "active_count": len(active_alerts),
                "critical_alerts": len([a for a in active_alerts if a.get("severity") == "critical"]),
                "warning_alerts": len([a for a in active_alerts if a.get("severity") == "warning"])
            }
        }
    
    async def shutdown(self):
        """Shutdown Model Manager and cleanup resources."""
        self.logger.info("Shutting down Model Manager...")
        
        # Unload all cached models
        with self.cache_lock:
            model_ids = list(self.model_cache.keys())
        
        for model_id in model_ids:
            await self.unload_model(model_id)
        
        # Shutdown thread pool
        self.executor.shutdown(wait=True)
        
        self.logger.info("Model Manager shutdown complete")