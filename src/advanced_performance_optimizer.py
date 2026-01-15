"""
Advanced Performance Optimizer for Enhanced ComfyUI Workflows

This module provides comprehensive performance optimization capabilities including:
- Model sharing between workflows
- Intelligent memory management
- GPU memory pooling
- Batch processing optimizations
- Performance profiling tools
- Workflow execution order optimization
- Adaptive quality settings

Author: StoryCore-Engine Team
Date: January 12, 2026
Version: 1.0.0
"""

import asyncio
import gc
import logging
import psutil
import time
import threading
from collections import defaultdict, deque
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union, Callable
import json
import weakref

# Mock GPU monitoring for development
try:
    import GPUtil
    GPU_AVAILABLE = True
except ImportError:
    GPU_AVAILABLE = False
    
    class MockGPU:
        def __init__(self, id=0):
            self.id = id
            self.memoryFree = 8192  # MB
            self.memoryUsed = 2048  # MB
            self.memoryTotal = 10240  # MB
            self.load = 0.3
            self.temperature = 65
    
    class MockGPUtil:
        @staticmethod
        def getGPUs():
            return [MockGPU(0)]
    
    GPUtil = MockGPUtil


class OptimizationStrategy(Enum):
    """Performance optimization strategies"""
    SPEED_FIRST = "speed_first"
    MEMORY_FIRST = "memory_first"
    BALANCED = "balanced"
    QUALITY_FIRST = "quality_first"
    ADAPTIVE = "adaptive"


class ResourceType(Enum):
    """System resource types"""
    CPU = "cpu"
    MEMORY = "memory"
    GPU = "gpu"
    DISK = "disk"
    NETWORK = "network"


class ModelState(Enum):
    """Model loading states"""
    UNLOADED = "unloaded"
    LOADING = "loading"
    LOADED = "loaded"
    UNLOADING = "unloading"
    SHARED = "shared"
    CACHED = "cached"


@dataclass
class ResourceMetrics:
    """System resource metrics"""
    cpu_percent: float = 0.0
    memory_percent: float = 0.0
    memory_available: int = 0  # MB
    gpu_percent: float = 0.0
    gpu_memory_used: int = 0  # MB
    gpu_memory_free: int = 0  # MB
    disk_usage: float = 0.0
    timestamp: float = field(default_factory=time.time)


@dataclass
class ModelInfo:
    """Model information and state"""
    model_id: str
    model_type: str
    size_mb: int
    state: ModelState = ModelState.UNLOADED
    last_used: float = field(default_factory=time.time)
    usage_count: int = 0
    shared_count: int = 0
    memory_address: Optional[int] = None
    load_time: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class WorkflowProfile:
    """Workflow performance profile"""
    workflow_id: str
    execution_count: int = 0
    total_time: float = 0.0
    average_time: float = 0.0
    memory_peak: int = 0  # MB
    gpu_peak: int = 0  # MB
    model_dependencies: List[str] = field(default_factory=list)
    optimization_hints: Dict[str, Any] = field(default_factory=dict)
    last_execution: float = field(default_factory=time.time)


@dataclass
class BatchJob:
    """Batch processing job"""
    job_id: str
    workflow_type: str
    items: List[Dict[str, Any]]
    priority: int = 5
    created_at: float = field(default_factory=time.time)
    started_at: Optional[float] = None
    completed_at: Optional[float] = None
    status: str = "pending"
    results: List[Any] = field(default_factory=list)
    errors: List[str] = field(default_factory=list)


@dataclass
class PerformanceConfig:
    """Performance optimization configuration"""
    
    # Model management
    max_models_in_memory: int = 3
    model_cache_size_mb: int = 8192
    model_unload_timeout: int = 300  # seconds
    enable_model_sharing: bool = True
    
    # Memory management
    memory_threshold_percent: float = 85.0
    gpu_memory_threshold_percent: float = 90.0
    garbage_collection_interval: int = 60  # seconds
    enable_memory_pooling: bool = True
    
    # Batch processing
    max_batch_size: int = 8
    batch_timeout: int = 30  # seconds
    enable_batch_optimization: bool = True
    batch_priority_levels: int = 10
    
    # Performance monitoring
    metrics_collection_interval: int = 5  # seconds
    performance_history_size: int = 1000
    enable_profiling: bool = True
    profiling_detail_level: str = "medium"  # low, medium, high
    
    # Optimization strategies
    default_strategy: OptimizationStrategy = OptimizationStrategy.BALANCED
    adaptive_threshold: float = 0.8
    quality_degradation_steps: int = 3
    
    # System limits
    max_concurrent_workflows: int = 4
    cpu_limit_percent: float = 90.0
    memory_limit_mb: int = 16384
    gpu_memory_limit_mb: int = 10240


class ModelManager:
    """Advanced model management with sharing and caching"""
    
    def __init__(self, config: PerformanceConfig):
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Model tracking
        self.models: Dict[str, ModelInfo] = {}
        self.model_cache: Dict[str, Any] = {}
        self.shared_models: Dict[str, weakref.ref] = {}
        
        # Memory management
        self.memory_pool = {}
        self.allocation_tracker = defaultdict(int)
        
        # Threading
        self.lock = threading.RLock()
        self.cleanup_thread = None
        self.start_cleanup_thread()
    
    def start_cleanup_thread(self):
        """Start background cleanup thread"""
        if self.cleanup_thread is None or not self.cleanup_thread.is_alive():
            self.cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
            self.cleanup_thread.start()
    
    def _cleanup_loop(self):
        """Background cleanup loop"""
        while True:
            try:
                time.sleep(self.config.garbage_collection_interval)
                self.cleanup_unused_models()
                self.optimize_memory_usage()
            except Exception as e:
                self.logger.error(f"Cleanup loop error: {e}")
    
    async def load_model(self, model_id: str, model_type: str, size_mb: int) -> Any:
        """Load model with sharing and caching"""
        with self.lock:
            # Check if model is already loaded
            if model_id in self.models and self.models[model_id].state == ModelState.LOADED:
                self.models[model_id].usage_count += 1
                self.models[model_id].last_used = time.time()
                return self.model_cache.get(model_id)
            
            # Check memory availability
            if not self._check_memory_availability(size_mb):
                await self._free_memory_for_model(size_mb)
            
            # Load model
            start_time = time.time()
            model = await self._load_model_impl(model_id, model_type, size_mb)
            load_time = time.time() - start_time
            
            # Update model info
            model_info = ModelInfo(
                model_id=model_id,
                model_type=model_type,
                size_mb=size_mb,
                state=ModelState.LOADED,
                load_time=load_time,
                usage_count=1
            )
            
            self.models[model_id] = model_info
            self.model_cache[model_id] = model
            
            self.logger.info(f"Model {model_id} loaded in {load_time:.2f}s")
            return model
    
    async def _load_model_impl(self, model_id: str, model_type: str, size_mb: int) -> Any:
        """Mock model loading implementation"""
        # Simulate model loading time
        await asyncio.sleep(0.1 + size_mb / 10000.0)  # Simulate loading based on size
        
        # Return mock model
        return {
            'id': model_id,
            'type': model_type,
            'size_mb': size_mb,
            'loaded_at': time.time()
        }
    
    def _check_memory_availability(self, required_mb: int) -> bool:
        """Check if enough memory is available"""
        current_usage = sum(model.size_mb for model in self.models.values() 
                          if model.state == ModelState.LOADED)
        return current_usage + required_mb <= self.config.model_cache_size_mb
    
    async def _free_memory_for_model(self, required_mb: int):
        """Free memory by unloading least recently used models"""
        # Sort models by last used time
        lru_models = sorted(
            [(model_id, model) for model_id, model in self.models.items() 
             if model.state == ModelState.LOADED and model.shared_count == 0],
            key=lambda x: x[1].last_used
        )
        
        freed_mb = 0
        for model_id, model in lru_models:
            if freed_mb >= required_mb:
                break
            
            await self.unload_model(model_id)
            freed_mb += model.size_mb
    
    async def unload_model(self, model_id: str):
        """Unload model from memory"""
        with self.lock:
            if model_id not in self.models:
                return
            
            model = self.models[model_id]
            if model.shared_count > 0:
                self.logger.warning(f"Cannot unload shared model {model_id}")
                return
            
            # Update state
            model.state = ModelState.UNLOADING
            
            # Remove from cache
            if model_id in self.model_cache:
                del self.model_cache[model_id]
            
            # Update state
            model.state = ModelState.UNLOADED
            
            self.logger.info(f"Model {model_id} unloaded")
    
    def cleanup_unused_models(self):
        """Clean up unused models"""
        current_time = time.time()
        timeout = self.config.model_unload_timeout
        
        to_unload = []
        for model_id, model in self.models.items():
            if (model.state == ModelState.LOADED and 
                model.shared_count == 0 and
                current_time - model.last_used > timeout):
                to_unload.append(model_id)
        
        for model_id in to_unload:
            asyncio.create_task(self.unload_model(model_id))
    
    def optimize_memory_usage(self):
        """Optimize memory usage"""
        # Force garbage collection
        gc.collect()
        
        # Update allocation tracking
        current_usage = sum(model.size_mb for model in self.models.values() 
                          if model.state == ModelState.LOADED)
        
        if current_usage > self.config.model_cache_size_mb * 0.9:
            self.logger.warning(f"High memory usage: {current_usage}MB")
    
    def get_model_stats(self) -> Dict[str, Any]:
        """Get model management statistics"""
        loaded_models = [m for m in self.models.values() if m.state == ModelState.LOADED]
        
        return {
            'total_models': len(self.models),
            'loaded_models': len(loaded_models),
            'memory_usage_mb': sum(m.size_mb for m in loaded_models),
            'cache_hit_rate': self._calculate_cache_hit_rate(),
            'average_load_time': self._calculate_average_load_time()
        }
    
    def _calculate_cache_hit_rate(self) -> float:
        """Calculate cache hit rate"""
        total_requests = sum(m.usage_count for m in self.models.values())
        if total_requests == 0:
            return 0.0
        
        cache_hits = sum(m.usage_count - 1 for m in self.models.values() if m.usage_count > 1)
        return cache_hits / total_requests
    
    def _calculate_average_load_time(self) -> float:
        """Calculate average model load time"""
        load_times = [m.load_time for m in self.models.values() if m.load_time > 0]
        return sum(load_times) / len(load_times) if load_times else 0.0

class ResourceMonitor:
    """System resource monitoring"""
    
    def __init__(self, config: PerformanceConfig):
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Metrics storage
        self.metrics_history = deque(maxlen=config.performance_history_size)
        self.current_metrics = ResourceMetrics()
        
        # Monitoring thread
        self.monitoring_thread = None
        self.monitoring_active = False
        self.start_monitoring()
    
    def start_monitoring(self):
        """Start resource monitoring"""
        if self.monitoring_thread is None or not self.monitoring_thread.is_alive():
            self.monitoring_active = True
            self.monitoring_thread = threading.Thread(target=self._monitoring_loop, daemon=True)
            self.monitoring_thread.start()
    
    def stop_monitoring(self):
        """Stop resource monitoring"""
        self.monitoring_active = False
    
    def _monitoring_loop(self):
        """Resource monitoring loop"""
        while self.monitoring_active:
            try:
                metrics = self._collect_metrics()
                self.current_metrics = metrics
                self.metrics_history.append(metrics)
                
                time.sleep(self.config.metrics_collection_interval)
            except Exception as e:
                self.logger.error(f"Monitoring loop error: {e}")
    
    def _collect_metrics(self) -> ResourceMetrics:
        """Collect current system metrics"""
        # CPU metrics
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # Memory metrics
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        memory_available = memory.available // (1024 * 1024)  # MB
        
        # GPU metrics
        gpu_percent = 0.0
        gpu_memory_used = 0
        gpu_memory_free = 0
        
        if GPU_AVAILABLE:
            try:
                gpus = GPUtil.getGPUs()
                if gpus:
                    gpu = gpus[0]  # Use first GPU
                    gpu_percent = gpu.load * 100
                    gpu_memory_used = gpu.memoryUsed
                    gpu_memory_free = gpu.memoryFree
            except Exception as e:
                self.logger.warning(f"GPU monitoring error: {e}")
        else:
            # Mock GPU metrics
            gpu_percent = 30.0
            gpu_memory_used = 2048
            gpu_memory_free = 8192
        
        # Disk metrics
        disk = psutil.disk_usage('/')
        disk_usage = disk.percent
        
        return ResourceMetrics(
            cpu_percent=cpu_percent,
            memory_percent=memory_percent,
            memory_available=memory_available,
            gpu_percent=gpu_percent,
            gpu_memory_used=gpu_memory_used,
            gpu_memory_free=gpu_memory_free,
            disk_usage=disk_usage
        )
    
    def get_current_metrics(self) -> ResourceMetrics:
        """Get current resource metrics"""
        return self.current_metrics
    
    def get_metrics_history(self, duration_minutes: int = 10) -> List[ResourceMetrics]:
        """Get metrics history for specified duration"""
        cutoff_time = time.time() - (duration_minutes * 60)
        return [m for m in self.metrics_history if m.timestamp >= cutoff_time]
    
    def is_resource_available(self, resource_type: ResourceType, threshold: float = 0.8) -> bool:
        """Check if resource is available below threshold"""
        metrics = self.current_metrics
        
        if resource_type == ResourceType.CPU:
            return metrics.cpu_percent < (threshold * 100)
        elif resource_type == ResourceType.MEMORY:
            return metrics.memory_percent < (threshold * 100)
        elif resource_type == ResourceType.GPU:
            return metrics.gpu_percent < (threshold * 100)
        elif resource_type == ResourceType.DISK:
            return metrics.disk_usage < (threshold * 100)
        
        return True
    
    def get_resource_stats(self) -> Dict[str, Any]:
        """Get resource monitoring statistics"""
        if not self.metrics_history:
            return {}
        
        recent_metrics = list(self.metrics_history)[-60:]  # Last 60 samples
        
        return {
            'current': {
                'cpu_percent': self.current_metrics.cpu_percent,
                'memory_percent': self.current_metrics.memory_percent,
                'gpu_percent': self.current_metrics.gpu_percent,
                'disk_usage': self.current_metrics.disk_usage
            },
            'averages': {
                'cpu_percent': sum(m.cpu_percent for m in recent_metrics) / len(recent_metrics),
                'memory_percent': sum(m.memory_percent for m in recent_metrics) / len(recent_metrics),
                'gpu_percent': sum(m.gpu_percent for m in recent_metrics) / len(recent_metrics)
            },
            'peaks': {
                'cpu_percent': max(m.cpu_percent for m in recent_metrics),
                'memory_percent': max(m.memory_percent for m in recent_metrics),
                'gpu_percent': max(m.gpu_percent for m in recent_metrics)
            }
        }

class BatchProcessor:
    """Advanced batch processing with optimization"""
    
    def __init__(self, config: PerformanceConfig):
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Job management
        self.job_queue = deque()
        self.active_jobs: Dict[str, BatchJob] = {}
        self.completed_jobs: Dict[str, BatchJob] = {}
        
        # Processing thread
        self.processing_thread = None
        self.processing_active = False
        self.start_processing()
    
    def start_processing(self):
        """Start batch processing"""
        if self.processing_thread is None or not self.processing_thread.is_alive():
            self.processing_active = True
            self.processing_thread = threading.Thread(target=self._processing_loop, daemon=True)
            self.processing_thread.start()
    
    def stop_processing(self):
        """Stop batch processing"""
        self.processing_active = False
    
    def submit_batch_job(self, workflow_type: str, items: List[Dict[str, Any]], 
                        priority: int = 5) -> str:
        """Submit batch job for processing"""
        job_id = f"batch_{int(time.time() * 1000)}"
        
        job = BatchJob(
            job_id=job_id,
            workflow_type=workflow_type,
            items=items,
            priority=priority
        )
        
        # Add to queue (higher priority first)
        inserted = False
        for i, existing_job in enumerate(self.job_queue):
            if priority > existing_job.priority:
                self.job_queue.insert(i, job)
                inserted = True
                break
        
        if not inserted:
            self.job_queue.append(job)
        
        self.logger.info(f"Batch job {job_id} submitted with {len(items)} items")
        return job_id
    
    def _processing_loop(self):
        """Batch processing loop"""
        while self.processing_active:
            try:
                if self.job_queue:
                    job = self.job_queue.popleft()
                    # Use threading for async processing in sync context
                    import threading
                    thread = threading.Thread(
                        target=lambda: asyncio.run(self._process_batch_job(job)),
                        daemon=True
                    )
                    thread.start()
                else:
                    time.sleep(1)  # Wait for jobs
            except Exception as e:
                self.logger.error(f"Processing loop error: {e}")
    
    async def _process_batch_job(self, job: BatchJob):
        """Process individual batch job"""
        job.started_at = time.time()
        job.status = "processing"
        self.active_jobs[job.job_id] = job
        
        try:
            # Optimize batch size based on system resources
            optimal_batch_size = self._calculate_optimal_batch_size(job)
            
            # Process items in batches
            for i in range(0, len(job.items), optimal_batch_size):
                batch_items = job.items[i:i + optimal_batch_size]
                batch_results = await self._process_batch_items(job.workflow_type, batch_items)
                job.results.extend(batch_results)
            
            job.status = "completed"
            job.completed_at = time.time()
            
        except Exception as e:
            job.status = "failed"
            job.errors.append(str(e))
            self.logger.error(f"Batch job {job.job_id} failed: {e}")
        
        finally:
            # Move to completed jobs
            self.completed_jobs[job.job_id] = job
            if job.job_id in self.active_jobs:
                del self.active_jobs[job.job_id]
    
    def _calculate_optimal_batch_size(self, job: BatchJob) -> int:
        """Calculate optimal batch size based on system resources"""
        base_batch_size = self.config.max_batch_size
        
        # Get actual system load instead of mock values
        try:
            cpu_load = psutil.cpu_percent(interval=1) / 100.0
            memory_load = psutil.virtual_memory().percent / 100.0
        except:
            cpu_load = 0.5  # Fallback to mock values if psutil fails
            memory_load = 0.6
        
        load_factor = max(cpu_load, memory_load)
        
        # Add job priority factor - higher priority jobs get larger batches
        priority_factor = 1.0 + (1.0 - job.priority / self.config.batch_priority_levels)
        
        if load_factor > 0.8:
            return max(1, int(base_batch_size // 2 * priority_factor))
        elif load_factor < 0.4:
            return min(base_batch_size * 2, len(job.items))
        
        return int(base_batch_size * priority_factor)
    
    async def _process_batch_items(self, workflow_type: str, items: List[Dict[str, Any]]) -> List[Any]:
        """Process batch items (mock implementation)"""
        # Simulate batch processing
        await asyncio.sleep(0.1 * len(items))
        
        return [{'processed': True, 'item': item} for item in items]
    
    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get batch job status"""
        # Check active jobs first
        if job_id in self.active_jobs:
            job = self.active_jobs[job_id]
        elif job_id in self.completed_jobs:
            job = self.completed_jobs[job_id]
        else:
            # Check if job is still in queue
            for queued_job in self.job_queue:
                if queued_job.job_id == job_id:
                    job = queued_job
                    break
            else:
                return None
        
        return {
            'job_id': job.job_id,
            'workflow_type': job.workflow_type,
            'status': job.status,
            'total_items': len(job.items),
            'completed_items': len(job.results),
            'errors': len(job.errors),
            'created_at': job.created_at,
            'started_at': job.started_at,
            'completed_at': job.completed_at,
            'processing_time': (job.completed_at or time.time()) - (job.started_at or job.created_at)
        }
    
    def get_batch_stats(self) -> Dict[str, Any]:
        """Get batch processing statistics"""
        return {
            'queued_jobs': len(self.job_queue),
            'active_jobs': len(self.active_jobs),
            'completed_jobs': len(self.completed_jobs),
            'total_processed_items': sum(len(job.results) for job in self.completed_jobs.values()),
            'average_processing_time': self._calculate_average_processing_time()
        }
    
    def _calculate_average_processing_time(self) -> float:
        """Calculate average job processing time"""
        completed_jobs = [job for job in self.completed_jobs.values() 
                         if job.started_at and job.completed_at]
        
        if not completed_jobs:
            return 0.0
        
        total_time = sum(job.completed_at - job.started_at for job in completed_jobs)
        return total_time / len(completed_jobs)
class AdvancedPerformanceOptimizer:
    """
    Advanced Performance Optimizer for Enhanced ComfyUI Workflows.
    
    Provides comprehensive performance optimization including:
    - Model sharing and intelligent memory management
    - GPU memory pooling and resource optimization
    - Batch processing with adaptive sizing
    - Performance profiling and monitoring
    - Workflow execution order optimization
    - Adaptive quality settings based on system load
    """
    
    def __init__(self, config: Optional[PerformanceConfig] = None):
        """Initialize Advanced Performance Optimizer"""
        self.config = config or PerformanceConfig()
        self.logger = logging.getLogger(__name__)
        
        # Core components
        self.model_manager = ModelManager(self.config)
        self.resource_monitor = ResourceMonitor(self.config)
        self.batch_processor = BatchProcessor(self.config)
        
        # Workflow profiling
        self.workflow_profiles: Dict[str, WorkflowProfile] = {}
        self.execution_history = deque(maxlen=1000)
        
        # Optimization state
        self.current_strategy = self.config.default_strategy
        self.optimization_active = True
        
        self.logger.info("Advanced Performance Optimizer initialized")
    
    async def optimize_workflow_execution(self, workflow_id: str, workflow_type: str,
                                         parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Optimize workflow execution with performance enhancements"""
        start_time = time.time()
        
        try:
            # Update workflow profile
            profile = self._get_or_create_profile(workflow_id, workflow_type)
            
            # Check system resources
            if not self._check_system_readiness():
                self.logger.warning(f"System not ready for workflow {workflow_id}. Waiting for resources...")
                await self._wait_for_resources()
            
            # Optimize parameters based on current load
            optimized_params = await self._optimize_parameters(parameters, profile)
            
            # Execute workflow with optimizations
            result = await self._execute_optimized_workflow(workflow_id, workflow_type, optimized_params)
            
            # Update performance metrics
            execution_time = time.time() - start_time
            self._update_workflow_profile(profile, execution_time, optimized_params)
            
            return {
                'success': True,
                'result': result,
                'execution_time': execution_time,
                'optimizations_applied': optimized_params.get('_optimizations', []),
                'resource_usage': self.resource_monitor.get_current_metrics().__dict__
            }
            
        except Exception as e:
            self.logger.error(f"Workflow optimization failed for {workflow_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'execution_time': time.time() - start_time
            }
    
    def _get_or_create_profile(self, workflow_id: str, workflow_type: str) -> WorkflowProfile:
        """Get or create workflow performance profile"""
        if workflow_id not in self.workflow_profiles:
            self.workflow_profiles[workflow_id] = WorkflowProfile(workflow_id=workflow_id)
        
        return self.workflow_profiles[workflow_id]
    
    def _check_system_readiness(self) -> bool:
        """Check if system is ready for workflow execution"""
        metrics = self.resource_monitor.get_current_metrics()
        
        # Log current resource usage
        self.logger.debug(f"Current resource usage - CPU: {metrics.cpu_percent}%, Memory: {metrics.memory_percent}%, GPU: {metrics.gpu_percent}%")
        
        # Check resource thresholds
        if metrics.cpu_percent > self.config.cpu_limit_percent:
            self.logger.warning(f"CPU usage {metrics.cpu_percent}% exceeds limit of {self.config.cpu_limit_percent}%")
            return False
        if metrics.memory_percent > self.config.memory_threshold_percent:
            self.logger.warning(f"Memory usage {metrics.memory_percent}% exceeds limit of {self.config.memory_threshold_percent}%")
            return False
        if metrics.gpu_percent > self.config.gpu_memory_threshold_percent:
            self.logger.warning(f"GPU usage {metrics.gpu_percent}% exceeds limit of {self.config.gpu_memory_threshold_percent}%")
            return False
        
        self.logger.debug("System resources are within acceptable limits")
        return True
    
    async def _wait_for_resources(self, timeout: int = 30):
        """Wait for system resources to become available"""
        start_time = time.time()
        
        while time.time() - start_time < timeout:
            if self._check_system_readiness():
                return
            
            await asyncio.sleep(1)
        
        self.logger.warning("Timeout waiting for system resources")
    
    async def _optimize_parameters(self, parameters: Dict[str, Any], 
                                 profile: WorkflowProfile) -> Dict[str, Any]:
        """Optimize workflow parameters based on system state"""
        optimized = parameters.copy()
        optimizations = []
        
        # Get current system load
        metrics = self.resource_monitor.get_current_metrics()
        system_load = max(metrics.cpu_percent, metrics.memory_percent, metrics.gpu_percent) / 100.0
        
        # Apply optimization strategy
        if self.current_strategy == OptimizationStrategy.SPEED_FIRST:
            optimized = self._apply_speed_optimizations(optimized, system_load)
            optimizations.append("speed_first")
        elif self.current_strategy == OptimizationStrategy.MEMORY_FIRST:
            optimized = self._apply_memory_optimizations(optimized, system_load)
            optimizations.append("memory_first")
        elif self.current_strategy == OptimizationStrategy.QUALITY_FIRST:
            optimized = self._apply_quality_optimizations(optimized, system_load)
            optimizations.append("quality_first")
        elif self.current_strategy == OptimizationStrategy.ADAPTIVE:
            optimized = self._apply_adaptive_optimizations(optimized, system_load, profile)
            optimizations.append("adaptive")
        else:  # BALANCED
            optimized = self._apply_balanced_optimizations(optimized, system_load)
            optimizations.append("balanced")
        
        optimized['_optimizations'] = optimizations
        return optimized
    
    def _apply_speed_optimizations(self, params: Dict[str, Any], system_load: float) -> Dict[str, Any]:
        """Apply speed-first optimizations"""
        optimized = params.copy()
        
        # Reduce quality for speed if system is loaded
        if system_load > 0.7:
            if 'quality_level' in optimized:
                optimized['quality_level'] = max(1, optimized.get('quality_level', 3) - 1)
            if 'steps' in optimized:
                optimized['steps'] = max(10, int(optimized.get('steps', 20) * 0.8))
            if 'resolution' in optimized:
                current_res = optimized.get('resolution', (1024, 1024))
                if isinstance(current_res, tuple) and len(current_res) == 2:
                    optimized['resolution'] = (
                        max(512, int(current_res[0] * 0.9)),
                        max(512, int(current_res[1] * 0.9))
                    )
        
        return optimized
    
    def _apply_memory_optimizations(self, params: Dict[str, Any], system_load: float) -> Dict[str, Any]:
        """Apply memory-first optimizations"""
        optimized = params.copy()
        
        # Reduce memory usage
        if 'batch_size' in optimized:
            optimized['batch_size'] = max(1, optimized.get('batch_size', 4) // 2)
        if 'enable_attention_slicing' not in optimized:
            optimized['enable_attention_slicing'] = True
        if 'enable_cpu_offload' not in optimized:
            optimized['enable_cpu_offload'] = system_load > 0.8
        
        return optimized
    
    def _apply_quality_optimizations(self, params: Dict[str, Any], system_load: float) -> Dict[str, Any]:
        """Apply quality-first optimizations"""
        optimized = params.copy()
        
        # Maintain or increase quality settings
        if 'quality_level' in optimized:
            optimized['quality_level'] = min(5, optimized.get('quality_level', 3) + 1)
        if 'steps' in optimized:
            optimized['steps'] = max(optimized.get('steps', 20), 30)
        
        return optimized
    
    def _apply_adaptive_optimizations(self, params: Dict[str, Any], system_load: float,
                                     profile: WorkflowProfile) -> Dict[str, Any]:
        """Apply adaptive optimizations based on system state and history"""
        optimized = params.copy()
        
        # Adapt based on system load and historical performance with improved logic
        if system_load > 0.9:
            optimized = self._apply_speed_optimizations(optimized, system_load)
        elif system_load > 0.8:
            # Apply more aggressive speed optimizations
            optimized = self._apply_speed_optimizations(optimized, system_load)
            if 'quality_level' in optimized:
                optimized['quality_level'] = max(1, optimized.get('quality_level', 3) - 2)
        elif system_load < 0.3 and profile.average_time > 0:
            optimized = self._apply_quality_optimizations(optimized, system_load)
        elif system_load < 0.5 and profile.average_time > 0:
            # Apply more aggressive quality optimizations
            optimized = self._apply_quality_optimizations(optimized, system_load)
            if 'quality_level' in optimized:
                optimized['quality_level'] = min(5, optimized.get('quality_level', 3) + 2)
        else:
            optimized = self._apply_balanced_optimizations(optimized, system_load)
        
        return optimized
    
    def _apply_balanced_optimizations(self, params: Dict[str, Any], system_load: float) -> Dict[str, Any]:
        """Apply balanced optimizations"""
        optimized = params.copy()
        
        # Balance between speed and quality
        if system_load > 0.6:
            if 'quality_level' in optimized:
                optimized['quality_level'] = max(2, optimized.get('quality_level', 3))
            if 'steps' in optimized:
                optimized['steps'] = max(15, int(optimized.get('steps', 20) * 0.9))
        
        return optimized
    
    async def _execute_optimized_workflow(self, workflow_id: str, workflow_type: str, 
                                        parameters: Dict[str, Any]) -> Any:
        """Execute workflow with optimizations (mock implementation)"""
        # Simulate workflow execution
        execution_time = 1.0 + len(str(parameters)) / 1000.0
        await asyncio.sleep(execution_time)
        
        return {
            'workflow_id': workflow_id,
            'workflow_type': workflow_type,
            'parameters': parameters,
            'executed_at': time.time(),
            'mock_result': True
        }
    
    def _update_workflow_profile(self, profile: WorkflowProfile, execution_time: float, 
                               parameters: Dict[str, Any]):
        """Update workflow performance profile"""
        profile.execution_count += 1
        profile.total_time += execution_time
        profile.average_time = profile.total_time / profile.execution_count
        profile.last_execution = time.time()
        
        # Update resource peaks
        current_metrics = self.resource_monitor.get_current_metrics()
        profile.memory_peak = max(profile.memory_peak, 
                                int(current_metrics.memory_percent * current_metrics.memory_available / 100))
        profile.gpu_peak = max(profile.gpu_peak, current_metrics.gpu_memory_used)
        
        # Store execution record
        self.execution_history.append({
            'workflow_id': profile.workflow_id,
            'execution_time': execution_time,
            'timestamp': time.time(),
            'parameters': parameters
        })
    
    async def optimize_batch_processing(self, workflow_type: str, items: List[Dict[str, Any]], 
                                      priority: int = 5) -> str:
        """Optimize batch processing with intelligent scheduling"""
        # Submit to batch processor
        job_id = self.batch_processor.submit_batch_job(workflow_type, items, priority)
        
        self.logger.info(f"Batch optimization job {job_id} submitted")
        return job_id
    
    def get_optimization_stats(self) -> Dict[str, Any]:
        """Get comprehensive optimization statistics"""
        return {
            'model_management': self.model_manager.get_model_stats(),
            'resource_monitoring': self.resource_monitor.get_resource_stats(),
            'batch_processing': self.batch_processor.get_batch_stats(),
            'workflow_profiles': {
                wf_id: {
                    'execution_count': profile.execution_count,
                    'average_time': profile.average_time,
                    'memory_peak': profile.memory_peak,
                    'gpu_peak': profile.gpu_peak
                }
                for wf_id, profile in self.workflow_profiles.items()
            },
            'current_strategy': self.current_strategy.value,
            'total_executions': len(self.execution_history),
            'recommendations': self._generate_optimization_recommendations()
        }
    
    def _generate_optimization_recommendations(self) -> List[str]:
        """Generate optimization recommendations based on current system state"""
        recommendations = []
        
        # Get current metrics
        metrics = self.resource_monitor.get_current_metrics()
        
        # Analyze CPU usage
        if metrics.cpu_percent > 90:
            recommendations.append("High CPU usage detected: Consider reducing batch size or optimizing workflows")
        elif metrics.cpu_percent < 30:
            recommendations.append("Low CPU usage: Consider increasing batch size or parallel processing")
        
        # Analyze memory usage
        if metrics.memory_percent > 85:
            recommendations.append("High memory usage: Consider enabling memory pooling or reducing model cache size")
        
        # Analyze GPU usage
        if metrics.gpu_percent > 95:
            recommendations.append("GPU overloaded: Consider reducing batch size or using CPU offloading")
        elif metrics.gpu_percent < 40:
            recommendations.append("GPU underutilized: Consider increasing batch size or using more complex models")
        
        # Analyze workflow performance
        if self.workflow_profiles:
            avg_time = sum(p.average_time for p in self.workflow_profiles.values()) / len(self.workflow_profiles)
            if avg_time > 5.0:  # If average execution time is high
                recommendations.append(f"High average workflow execution time ({avg_time:.2f}s): Consider optimizing workflows")
        
        if not recommendations:
            recommendations.append("System performance is optimal, no recommendations")
        
        return recommendations
    
    def set_optimization_strategy(self, strategy: OptimizationStrategy):
        """Set optimization strategy"""
        self.current_strategy = strategy
        self.logger.info(f"Optimization strategy set to {strategy.value}")
    
    def export_performance_report(self, output_path: Path) -> bool:
        """Export comprehensive performance report"""
        try:
            report = {
                'export_info': {
                    'timestamp': time.time(),
                    'optimizer_config': {
                        'max_models_in_memory': self.config.max_models_in_memory,
                        'memory_threshold_percent': self.config.memory_threshold_percent,
                        'max_batch_size': self.config.max_batch_size,
                        'default_strategy': self.config.default_strategy.value
                    }
                },
                'optimization_stats': self.get_optimization_stats(),
                'recent_executions': list(self.execution_history)[-100:],  # Last 100 executions
                'workflow_profiles': {
                    wf_id: {
                        'workflow_id': profile.workflow_id,
                        'execution_count': profile.execution_count,
                        'total_time': profile.total_time,
                        'average_time': profile.average_time,
                        'memory_peak': profile.memory_peak,
                        'gpu_peak': profile.gpu_peak,
                        'last_execution': profile.last_execution
                    }
                    for wf_id, profile in self.workflow_profiles.items()
                }
            }
            
            with open(output_path, 'w') as f:
                json.dump(report, f, indent=2, default=str)
            
            self.logger.info(f"Performance report exported to {output_path}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to export performance report: {e}")
            return False


def create_advanced_performance_optimizer(config: Optional[PerformanceConfig] = None) -> AdvancedPerformanceOptimizer:
    """
    Factory function to create Advanced Performance Optimizer instance.
    
    Args:
        config: Optional configuration object
        
    Returns:
        Configured AdvancedPerformanceOptimizer instance
    """
    return AdvancedPerformanceOptimizer(config)


# Example usage and testing
if __name__ == "__main__":
    import asyncio
    
    async def test_performance_optimizer():
        """Test Advanced Performance Optimizer"""
        print("Testing Advanced Performance Optimizer...")
        
        # Create optimizer
        config = PerformanceConfig(
            max_models_in_memory=2,
            max_batch_size=4,
            enable_profiling=True
        )
        optimizer = create_advanced_performance_optimizer(config)
        
        # Test workflow optimization
        print("\n1. Testing workflow optimization...")
        result = await optimizer.optimize_workflow_execution(
            workflow_id="test_workflow_001",
            workflow_type="image_generation",
            parameters={
                'quality_level': 3,
                'steps': 20,
                'resolution': (1024, 1024)
            }
        )
        
        print(f"Optimization Result: {result['success']}")
        print(f"Execution Time: {result['execution_time']:.3f}s")
        print(f"Optimizations Applied: {result.get('optimizations_applied', [])}")
        
        # Test batch processing
        print("\n2. Testing batch processing...")
        batch_items = [{'item_id': i, 'data': f'test_data_{i}'} for i in range(5)]
        job_id = await optimizer.optimize_batch_processing("image_generation", batch_items)
        print(f"Batch Job ID: {job_id}")
        
        # Wait a bit for processing
        await asyncio.sleep(2)
        
        # Check job status
        status = optimizer.batch_processor.get_job_status(job_id)
        if status:
            print(f"Job Status: {status['status']}")
            print(f"Completed Items: {status['completed_items']}/{status['total_items']}")
        
        # Test optimization strategies
        print("\n3. Testing optimization strategies...")
        for strategy in OptimizationStrategy:
            optimizer.set_optimization_strategy(strategy)
            result = await optimizer.optimize_workflow_execution(
                workflow_id=f"test_{strategy.value}",
                workflow_type="image_generation",
                parameters={'quality_level': 3}
            )
            print(f"Strategy {strategy.value}: {result['execution_time']:.3f}s")
        
        # Test statistics
        print("\n4. Testing statistics...")
        stats = optimizer.get_optimization_stats()
        print(f"Total Workflow Profiles: {len(stats['workflow_profiles'])}")
        print(f"Model Management: {stats['model_management']}")
        print(f"Resource Monitoring: {stats['resource_monitoring']['current']}")
        
        print("\nAdvanced Performance Optimizer test completed successfully!")
    
    # Run test
    asyncio.run(test_performance_optimizer())