#!/usr/bin/env python3
"""
Video Engine Performance Monitor

This module provides comprehensive performance monitoring and optimization
for video generation operations including parallel processing, GPU acceleration,
memory management, and progress tracking.
"""

import logging
import time
import threading
import psutil
import json
from pathlib import Path
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field, asdict
from enum import Enum
from collections import defaultdict, deque
import concurrent.futures
from contextlib import contextmanager

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Import circuit breaker for anti-blocking protection
try:
    from circuit_breaker import circuit_manager, CircuitBreakerConfig, CircuitBreakerError
    CIRCUIT_BREAKER_AVAILABLE = True
except ImportError:
    logger.warning("Circuit breaker not available - monitoring operations may be vulnerable to blocking")
    CIRCUIT_BREAKER_AVAILABLE = False


class ProcessingMode(Enum):
    """Processing modes for optimization."""
    CPU_ONLY = "cpu_only"
    GPU_ACCELERATED = "gpu_accelerated"
    HYBRID = "hybrid"
    AUTO = "auto"


class OptimizationStrategy(Enum):
    """Optimization strategies."""
    SPEED_FIRST = "speed_first"
    QUALITY_FIRST = "quality_first"
    BALANCED = "balanced"
    MEMORY_EFFICIENT = "memory_efficient"


@dataclass
class PerformanceMetrics:
    """Performance metrics for video operations."""
    operation_name: str
    start_time: float
    end_time: float
    duration: float
    frames_processed: int
    memory_usage_mb: float
    cpu_usage_percent: float
    gpu_usage_percent: float = 0.0
    gpu_memory_mb: float = 0.0
    throughput_fps: float = 0.0
    quality_score: float = 0.0
    success: bool = True
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class SystemResources:
    """Current system resource information."""
    cpu_count: int
    cpu_usage_percent: float
    memory_total_gb: float
    memory_available_gb: float
    memory_usage_percent: float
    gpu_available: bool = False
    gpu_memory_total_mb: float = 0.0
    gpu_memory_used_mb: float = 0.0
    gpu_utilization_percent: float = 0.0


@dataclass
class ProgressInfo:
    """Progress tracking information."""
    operation_id: str
    operation_name: str
    total_frames: int
    completed_frames: int
    progress_percent: float
    estimated_time_remaining: float
    current_fps: float
    start_time: float
    last_update_time: float
    status: str = "running"
    details: Dict[str, Any] = field(default_factory=dict)


class ResourceMonitor:
    """Monitors system resources in real-time."""
    
    def __init__(self, update_interval: float = 1.0):
        self.update_interval = update_interval
        self.monitoring = False
        self.monitor_thread = None
        self.resource_history = deque(maxlen=100)
        self.callbacks = []
        
        # Try to detect GPU
        self.gpu_available = self._detect_gpu()
        
        # Initialize circuit breaker for resource monitoring
        if CIRCUIT_BREAKER_AVAILABLE:
            self.monitoring_breaker = circuit_manager.get_breaker(
                "resource_monitoring",
                CircuitBreakerConfig(
                    failure_threshold=5,
                    recovery_timeout=30.0,
                    success_threshold=3,
                    timeout=10.0,  # 10 second timeout for resource checks
                    max_concurrent=1
                )
            )
            logger.info("Circuit breaker initialized for resource monitoring")
        else:
            self.monitoring_breaker = None
        
    def _detect_gpu(self) -> bool:
        """Detect if GPU is available."""
        try:
            import GPUtil
            gpus = GPUtil.getGPUs()
            return len(gpus) > 0
        except ImportError:
            logger.warning("GPUtil not available - GPU monitoring disabled")
            return False
        except Exception as e:
            logger.warning(f"GPU detection failed: {e}")
            return False
    
    def get_current_resources(self) -> SystemResources:
        """Get current system resource usage with circuit breaker protection."""
        if CIRCUIT_BREAKER_AVAILABLE and self.monitoring_breaker:
            try:
                return self.monitoring_breaker.call(self._get_current_resources_protected)
            except CircuitBreakerError as e:
                logger.warning(f"Resource monitoring blocked by circuit breaker: {e}")
                # Return safe default values
                return SystemResources(
                    cpu_count=4,
                    cpu_usage_percent=50.0,
                    memory_total_gb=8.0,
                    memory_available_gb=4.0,
                    memory_usage_percent=50.0,
                    gpu_available=False
                )
        else:
            return self._get_current_resources_protected()
    
    def _get_current_resources_protected(self) -> SystemResources:
        """Protected method to get current system resource usage."""
        # CPU and memory info
        cpu_count = psutil.cpu_count()
        cpu_usage = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        
        resources = SystemResources(
            cpu_count=cpu_count,
            cpu_usage_percent=cpu_usage,
            memory_total_gb=memory.total / (1024**3),
            memory_available_gb=memory.available / (1024**3),
            memory_usage_percent=memory.percent,
            gpu_available=self.gpu_available
        )
        
        # GPU info if available
        if self.gpu_available:
            try:
                import GPUtil
                gpus = GPUtil.getGPUs()
                if gpus:
                    gpu = gpus[0]  # Use first GPU
                    resources.gpu_memory_total_mb = gpu.memoryTotal
                    resources.gpu_memory_used_mb = gpu.memoryUsed
                    resources.gpu_utilization_percent = gpu.load * 100
            except Exception as e:
                logger.warning(f"GPU monitoring failed: {e}")
        
        return resources
    
    def start_monitoring(self):
        """Start continuous resource monitoring."""
        if self.monitoring:
            return
        
        self.monitoring = True
        self.monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self.monitor_thread.start()
        logger.info("Resource monitoring started")
    
    def stop_monitoring(self):
        """Stop resource monitoring."""
        self.monitoring = False
        if self.monitor_thread:
            self.monitor_thread.join(timeout=2.0)
        logger.info("Resource monitoring stopped")
    
    def _monitor_loop(self):
        """Main monitoring loop with circuit breaker protection."""
        consecutive_failures = 0
        max_consecutive_failures = 10
        
        while self.monitoring:
            try:
                resources = self.get_current_resources()
                self.resource_history.append(resources)
                
                # Reset failure counter on success
                consecutive_failures = 0
                
                # Notify callbacks
                for callback in self.callbacks:
                    try:
                        callback(resources)
                    except Exception as e:
                        logger.error(f"Resource monitor callback failed: {e}")
                
                time.sleep(self.update_interval)
                
            except CircuitBreakerError:
                # Circuit breaker is open, wait longer before retry
                consecutive_failures += 1
                logger.warning(f"Resource monitoring circuit breaker open (failure {consecutive_failures})")
                time.sleep(self.update_interval * 5)  # Wait 5x longer
                
            except Exception as e:
                consecutive_failures += 1
                logger.error(f"Resource monitoring error (failure {consecutive_failures}): {e}")
                
                # If too many consecutive failures, stop monitoring to prevent infinite loops
                if consecutive_failures >= max_consecutive_failures:
                    logger.error(f"Too many consecutive monitoring failures ({consecutive_failures}), stopping monitoring")
                    self.monitoring = False
                    break
                
                time.sleep(self.update_interval * 2)  # Wait longer on error
    
    def add_callback(self, callback: Callable[[SystemResources], None]):
        """Add callback for resource updates."""
        self.callbacks.append(callback)
    
    def get_resource_history(self) -> List[SystemResources]:
        """Get recent resource usage history."""
        return list(self.resource_history)


class ProgressTracker:
    """Tracks progress of video generation operations."""
    
    def __init__(self):
        self.active_operations = {}
        self.completed_operations = []
        self.callbacks = []
        self.lock = threading.Lock()
    
    def start_operation(self, operation_id: str, operation_name: str, total_frames: int) -> ProgressInfo:
        """Start tracking a new operation."""
        with self.lock:
            progress = ProgressInfo(
                operation_id=operation_id,
                operation_name=operation_name,
                total_frames=total_frames,
                completed_frames=0,
                progress_percent=0.0,
                estimated_time_remaining=0.0,
                current_fps=0.0,
                start_time=time.time(),
                last_update_time=time.time()
            )
            
            self.active_operations[operation_id] = progress
            logger.info(f"Started tracking operation: {operation_name} ({total_frames} frames)")
            return progress
    
    def update_progress(self, operation_id: str, completed_frames: int, details: Dict[str, Any] = None):
        """Update progress for an operation."""
        with self.lock:
            if operation_id not in self.active_operations:
                logger.warning(f"Unknown operation ID: {operation_id}")
                return
            
            progress = self.active_operations[operation_id]
            current_time = time.time()
            
            # Update progress
            progress.completed_frames = completed_frames
            progress.progress_percent = (completed_frames / progress.total_frames) * 100
            progress.last_update_time = current_time
            
            if details:
                progress.details.update(details)
            
            # Calculate FPS and ETA
            elapsed_time = current_time - progress.start_time
            if elapsed_time > 0:
                progress.current_fps = completed_frames / elapsed_time
                
                if progress.current_fps > 0:
                    remaining_frames = progress.total_frames - completed_frames
                    progress.estimated_time_remaining = remaining_frames / progress.current_fps
            
            # Notify callbacks
            for callback in self.callbacks:
                try:
                    callback(progress)
                except Exception as e:
                    logger.error(f"Progress callback failed: {e}")
    
    def complete_operation(self, operation_id: str, success: bool = True, error_message: str = None):
        """Mark operation as completed."""
        with self.lock:
            if operation_id not in self.active_operations:
                logger.warning(f"Unknown operation ID: {operation_id}")
                return
            
            progress = self.active_operations[operation_id]
            progress.status = "completed" if success else "failed"
            
            if error_message:
                progress.details["error_message"] = error_message
            
            # Move to completed operations
            self.completed_operations.append(progress)
            del self.active_operations[operation_id]
            
            logger.info(f"Operation completed: {progress.operation_name} ({progress.status})")
    
    def get_active_operations(self) -> List[ProgressInfo]:
        """Get list of active operations."""
        with self.lock:
            return list(self.active_operations.values())
    
    def get_operation_status(self, operation_id: str) -> Optional[ProgressInfo]:
        """Get status of specific operation."""
        with self.lock:
            return self.active_operations.get(operation_id)
    
    def add_callback(self, callback: Callable[[ProgressInfo], None]):
        """Add callback for progress updates."""
        self.callbacks.append(callback)


class ParallelProcessor:
    """Handles parallel processing of video frames."""
    
    def __init__(self, max_workers: Optional[int] = None, processing_mode: ProcessingMode = ProcessingMode.AUTO):
        self.processing_mode = processing_mode
        self.max_workers = max_workers or min(8, psutil.cpu_count())
        self.executor = None
        
        # Initialize circuit breaker for parallel processing
        if CIRCUIT_BREAKER_AVAILABLE:
            self.parallel_processing_breaker = circuit_manager.get_breaker(
                "parallel_processing",
                CircuitBreakerConfig(
                    failure_threshold=3,
                    recovery_timeout=60.0,
                    success_threshold=2,
                    timeout=180.0,  # 3 minute timeout for parallel operations
                    max_concurrent=self.max_workers
                )
            )
            logger.info("Circuit breaker initialized for parallel processing")
        else:
            self.parallel_processing_breaker = None
        
        logger.info(f"Parallel processor initialized: {self.max_workers} workers, mode: {processing_mode.value}")
    
    def process_frames_parallel(self, 
                              frame_processor: Callable,
                              frame_data: List[Any],
                              progress_callback: Optional[Callable] = None) -> List[Any]:
        """Process frames in parallel with circuit breaker protection."""
        if not frame_data:
            return []
        
        # Use circuit breaker protection if available
        if CIRCUIT_BREAKER_AVAILABLE and self.parallel_processing_breaker:
            try:
                return self.parallel_processing_breaker.call(
                    self._process_frames_parallel_protected,
                    frame_processor, frame_data, progress_callback
                )
            except CircuitBreakerError as e:
                logger.error(f"Parallel processing blocked by circuit breaker: {e}")
                # Fallback to sequential processing
                logger.info("Falling back to sequential processing")
                return self._process_frames_sequential(frame_processor, frame_data, progress_callback)
        else:
            return self._process_frames_parallel_protected(frame_processor, frame_data, progress_callback)
    
    def _process_frames_parallel_protected(self, 
                                         frame_processor: Callable,
                                         frame_data: List[Any],
                                         progress_callback: Optional[Callable] = None) -> List[Any]:
        """Protected parallel frame processing method."""
        results = []
        completed_count = 0
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            # Submit all tasks
            future_to_frame = {
                executor.submit(frame_processor, frame): i 
                for i, frame in enumerate(frame_data)
            }
            
            # Collect results as they complete
            for future in concurrent.futures.as_completed(future_to_frame):
                try:
                    result = future.result()
                    frame_index = future_to_frame[future]
                    results.append((frame_index, result))
                    
                    completed_count += 1
                    
                    # Update progress
                    if progress_callback:
                        progress_callback(completed_count, len(frame_data))
                        
                except Exception as e:
                    frame_index = future_to_frame[future]
                    logger.error(f"Frame processing failed for index {frame_index}: {e}")
                    results.append((frame_index, None))
        
        # Sort results by original order
        results.sort(key=lambda x: x[0])
        return [result for _, result in results]
    
    def _process_frames_sequential(self, 
                                 frame_processor: Callable,
                                 frame_data: List[Any],
                                 progress_callback: Optional[Callable] = None) -> List[Any]:
        """Sequential fallback processing method."""
        results = []
        
        for i, frame in enumerate(frame_data):
            try:
                result = frame_processor(frame)
                results.append(result)
                
                # Update progress
                if progress_callback:
                    progress_callback(i + 1, len(frame_data))
                    
            except Exception as e:
                logger.error(f"Sequential frame processing failed for index {i}: {e}")
                results.append(None)
        
        return results
    
    def optimize_batch_size(self, total_frames: int, memory_limit_mb: float = 1024) -> int:
        """Calculate optimal batch size based on available resources."""
        # Estimate memory per frame (rough approximation)
        estimated_memory_per_frame = 50  # MB for 1080p frame processing
        
        # Calculate max frames that fit in memory
        max_frames_in_memory = int(memory_limit_mb / estimated_memory_per_frame)
        
        # Consider worker count
        optimal_batch_size = min(
            max_frames_in_memory,
            total_frames,
            self.max_workers * 4  # 4 frames per worker
        )
        
        return max(1, optimal_batch_size)


class MemoryManager:
    """Manages memory usage during video processing."""
    
    def __init__(self, memory_limit_percent: float = 80.0):
        self.memory_limit_percent = memory_limit_percent
        self.memory_cache = {}
        self.cache_size_mb = 0
        self.max_cache_size_mb = self._calculate_max_cache_size_mb()
        
    def _calculate_max_cache_size_mb(self) -> float:
        """Calculate maximum cache size based on available memory."""
        memory = psutil.virtual_memory()
        available_mb = memory.available / (1024**2)
        return available_mb * (self.memory_limit_percent / 100) * 0.5  # Use 50% of limit for cache
    
    def cache_frame(self, frame_id: str, frame_data: Any, size_mb: float):
        """Cache frame data with memory management."""
        # Check if we need to free memory
        while self.cache_size_mb + size_mb > self.max_cache_size_mb and self.memory_cache:
            # Remove oldest cached frame
            oldest_key = next(iter(self.memory_cache))
            oldest_size = self.memory_cache[oldest_key].get('size_mb', 0)
            del self.memory_cache[oldest_key]
            self.cache_size_mb -= oldest_size
        
        # Cache the frame
        self.memory_cache[frame_id] = {
            'data': frame_data,
            'size_mb': size_mb,
            'timestamp': time.time()
        }
        self.cache_size_mb += size_mb
    
    def get_cached_frame(self, frame_id: str) -> Optional[Any]:
        """Retrieve cached frame data."""
        if frame_id in self.memory_cache:
            # Update timestamp for LRU
            self.memory_cache[frame_id]['timestamp'] = time.time()
            return self.memory_cache[frame_id]['data']
        return None
    
    def clear_cache(self):
        """Clear all cached data."""
        self.memory_cache.clear()
        self.cache_size_mb = 0
        logger.info("Memory cache cleared")
    
    def get_memory_usage(self) -> Dict[str, float]:
        """Get current memory usage statistics."""
        memory = psutil.virtual_memory()
        return {
            'system_total_gb': memory.total / (1024**3),
            'system_available_gb': memory.available / (1024**3),
            'system_usage_percent': memory.percent,
            'cache_size_mb': self.cache_size_mb,
            'cache_limit_mb': self.max_cache_size_mb
        }


class VideoPerformanceMonitor:
    """Main performance monitoring and optimization system for video generation."""
    
    def __init__(self, optimization_strategy: OptimizationStrategy = OptimizationStrategy.BALANCED):
        self.optimization_strategy = optimization_strategy
        self.resource_monitor = ResourceMonitor()
        self.progress_tracker = ProgressTracker()
        self.parallel_processor = ParallelProcessor()
        self.memory_manager = MemoryManager()
        
        # Performance metrics storage
        self.metrics_history = []
        self.operation_metrics = defaultdict(list)
        
        # Performance thresholds
        self.performance_thresholds = {
            'min_fps': 0.5,  # Minimum acceptable FPS
            'max_memory_percent': 85.0,  # Maximum memory usage
            'max_cpu_percent': 90.0,  # Maximum CPU usage
            'quality_threshold': 0.8  # Minimum quality score
        }
        
        # Setup callbacks
        self.resource_monitor.add_callback(self._on_resource_update)
        self.progress_tracker.add_callback(self._on_progress_update)
        
        logger.info(f"Video Performance Monitor initialized with strategy: {optimization_strategy.value}")
    
    def start_monitoring(self):
        """Start performance monitoring."""
        self.resource_monitor.start_monitoring()
        logger.info("Video performance monitoring started")
    
    def stop_monitoring(self):
        """Stop performance monitoring."""
        self.resource_monitor.stop_monitoring()
        logger.info("Video performance monitoring stopped")
    
    @contextmanager
    def monitor_operation(self, operation_name: str, frames_count: int = 0):
        """Context manager for monitoring video operations."""
        operation_id = f"{operation_name}_{int(time.time())}"
        start_time = time.time()
        
        # Start progress tracking
        if frames_count > 0:
            self.progress_tracker.start_operation(operation_id, operation_name, frames_count)
        
        # Get initial resources
        initial_resources = self.resource_monitor.get_current_resources()
        
        try:
            yield operation_id
            
            # Operation completed successfully
            end_time = time.time()
            duration = end_time - start_time
            
            # Get final resources
            final_resources = self.resource_monitor.get_current_resources()
            
            # Create performance metrics
            metrics = PerformanceMetrics(
                operation_name=operation_name,
                start_time=start_time,
                end_time=end_time,
                duration=duration,
                frames_processed=frames_count,
                memory_usage_mb=final_resources.memory_total_gb * 1024 * (final_resources.memory_usage_percent / 100),
                cpu_usage_percent=final_resources.cpu_usage_percent,
                gpu_usage_percent=final_resources.gpu_utilization_percent,
                gpu_memory_mb=final_resources.gpu_memory_used_mb,
                throughput_fps=frames_count / duration if duration > 0 else 0,
                success=True
            )
            
            # Store metrics
            self.metrics_history.append(metrics)
            self.operation_metrics[operation_name].append(metrics)
            
            # Complete progress tracking
            if frames_count > 0:
                self.progress_tracker.complete_operation(operation_id, success=True)
            
            logger.info(f"Operation completed: {operation_name} ({duration:.2f}s, {metrics.throughput_fps:.2f} FPS)")
            
        except Exception as e:
            # Operation failed
            end_time = time.time()
            duration = end_time - start_time
            
            # Create error metrics
            metrics = PerformanceMetrics(
                operation_name=operation_name,
                start_time=start_time,
                end_time=end_time,
                duration=duration,
                frames_processed=0,
                memory_usage_mb=0,
                cpu_usage_percent=0,
                success=False,
                error_message=str(e)
            )
            
            # Store metrics
            self.metrics_history.append(metrics)
            self.operation_metrics[operation_name].append(metrics)
            
            # Complete progress tracking
            if frames_count > 0:
                self.progress_tracker.complete_operation(operation_id, success=False, error_message=str(e))
            
            logger.error(f"Operation failed: {operation_name} - {e}")
            raise
    
    def optimize_processing_settings(self, total_frames: int, target_quality: str = "high") -> Dict[str, Any]:
        """Optimize processing settings based on current system resources and strategy."""
        resources = self.resource_monitor.get_current_resources()
        
        settings = {
            'parallel_processing': True,
            'max_workers': self.parallel_processor.max_workers,
            'batch_size': 1,
            'memory_limit_mb': 1024,
            'gpu_acceleration': resources.gpu_available,
            'processing_mode': ProcessingMode.AUTO.value,
            'quality_level': target_quality
        }
        
        # Adjust based on optimization strategy
        if self.optimization_strategy == OptimizationStrategy.SPEED_FIRST:
            settings.update({
                'max_workers': min(16, psutil.cpu_count() * 2),
                'batch_size': self.parallel_processor.optimize_batch_size(total_frames, 2048),
                'quality_level': 'medium',
                'gpu_acceleration': True
            })
            
        elif self.optimization_strategy == OptimizationStrategy.QUALITY_FIRST:
            settings.update({
                'max_workers': max(1, psutil.cpu_count() // 2),
                'batch_size': 1,
                'quality_level': 'ultra',
                'memory_limit_mb': resources.memory_available_gb * 1024 * 0.8
            })
            
        elif self.optimization_strategy == OptimizationStrategy.MEMORY_EFFICIENT:
            settings.update({
                'max_workers': max(1, psutil.cpu_count() // 4),
                'batch_size': 1,
                'memory_limit_mb': 512,
                'quality_level': 'medium'
            })
            
        else:  # BALANCED
            available_memory_mb = resources.memory_available_gb * 1024
            settings.update({
                'batch_size': self.parallel_processor.optimize_batch_size(total_frames, available_memory_mb * 0.6),
                'memory_limit_mb': available_memory_mb * 0.7
            })
        
        # Adjust for system constraints
        if resources.memory_usage_percent > 80:
            settings['max_workers'] = max(1, settings['max_workers'] // 2)
            settings['batch_size'] = max(1, settings['batch_size'] // 2)
        
        if resources.cpu_usage_percent > 80:
            settings['max_workers'] = max(1, settings['max_workers'] // 2)
        
        logger.info(f"Optimized settings for {total_frames} frames: {settings}")
        return settings
    
    def get_performance_report(self) -> Dict[str, Any]:
        """Generate comprehensive performance report."""
        if not self.metrics_history:
            return {"message": "No performance data available"}
        
        # Calculate overall statistics
        total_operations = len(self.metrics_history)
        successful_operations = sum(1 for m in self.metrics_history if m.success)
        total_frames = sum(m.frames_processed for m in self.metrics_history)
        total_duration = sum(m.duration for m in self.metrics_history)
        
        # Calculate averages
        avg_fps = sum(m.throughput_fps for m in self.metrics_history if m.success) / max(1, successful_operations)
        avg_memory_usage = sum(m.memory_usage_mb for m in self.metrics_history) / total_operations
        avg_cpu_usage = sum(m.cpu_usage_percent for m in self.metrics_history) / total_operations
        
        # Get current resources
        current_resources = self.resource_monitor.get_current_resources()
        
        # Get active operations
        active_operations = self.progress_tracker.get_active_operations()
        
        report = {
            'timestamp': time.time(),
            'optimization_strategy': self.optimization_strategy.value,
            'overall_statistics': {
                'total_operations': total_operations,
                'successful_operations': successful_operations,
                'success_rate': (successful_operations / total_operations) * 100 if total_operations > 0 else 0,
                'total_frames_processed': total_frames,
                'total_processing_time': total_duration,
                'average_fps': avg_fps,
                'average_memory_usage_mb': avg_memory_usage,
                'average_cpu_usage_percent': avg_cpu_usage
            },
            'current_resources': asdict(current_resources),
            'active_operations': [asdict(op) for op in active_operations],
            'memory_usage': self.memory_manager.get_memory_usage(),
            'performance_thresholds': self.performance_thresholds,
            'recent_operations': [asdict(m) for m in self.metrics_history[-10:]]
        }
        
        return report
    
    def export_performance_data(self, output_path: str):
        """Export performance data to JSON file."""
        report = self.get_performance_report()
        
        output_file = Path(output_path)
        output_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(output_file, 'w') as f:
            json.dump(report, f, indent=2, default=str)
        
        logger.info(f"Performance data exported to: {output_file}")
    
    def _on_resource_update(self, resources: SystemResources):
        """Handle resource monitor updates."""
        # Check for performance issues
        if resources.memory_usage_percent > self.performance_thresholds['max_memory_percent']:
            logger.warning(f"High memory usage: {resources.memory_usage_percent:.1f}%")
            # Trigger memory cleanup
            self.memory_manager.clear_cache()
        
        if resources.cpu_usage_percent > self.performance_thresholds['max_cpu_percent']:
            logger.warning(f"High CPU usage: {resources.cpu_usage_percent:.1f}%")
    
    def _on_progress_update(self, progress: ProgressInfo):
        """Handle progress tracker updates."""
        # Check for performance issues
        if progress.current_fps < self.performance_thresholds['min_fps'] and progress.completed_frames > 10:
            logger.warning(f"Low processing speed: {progress.current_fps:.2f} FPS")


# Example usage and testing functions
def create_test_performance_config():
    """Create test performance configuration."""
    return {
        'optimization_strategy': OptimizationStrategy.BALANCED,
        'processing_mode': ProcessingMode.AUTO,
        'max_workers': 4,
        'memory_limit_percent': 80.0
    }


def test_performance_monitoring():
    """Test the performance monitoring system."""
    print("Testing Video Performance Monitor...")
    
    monitor = VideoPerformanceMonitor(OptimizationStrategy.BALANCED)
    monitor.start_monitoring()
    
    try:
        # Test operation monitoring
        print("\n1. Testing operation monitoring:")
        with monitor.monitor_operation("test_interpolation", 100) as operation_id:
            # Simulate frame processing
            for i in range(100):
                time.sleep(0.01)  # Simulate processing time
                monitor.progress_tracker.update_progress(operation_id, i + 1)
        
        # Test resource monitoring
        print("\n2. Testing resource monitoring:")
        resources = monitor.resource_monitor.get_current_resources()
        print(f"  CPU: {resources.cpu_usage_percent:.1f}%")
        print(f"  Memory: {resources.memory_usage_percent:.1f}%")
        print(f"  GPU Available: {resources.gpu_available}")
        
        # Test optimization settings
        print("\n3. Testing optimization settings:")
        settings = monitor.optimize_processing_settings(1000, "high")
        print(f"  Optimized settings: {settings}")
        
        # Test performance report
        print("\n4. Testing performance report:")
        report = monitor.get_performance_report()
        print(f"  Total operations: {report['overall_statistics']['total_operations']}")
        print(f"  Success rate: {report['overall_statistics']['success_rate']:.1f}%")
        print(f"  Average FPS: {report['overall_statistics']['average_fps']:.2f}")
        
        print("\n✅ Performance monitoring tests completed!")
        
    finally:
        monitor.stop_monitoring()


if __name__ == "__main__":
    test_performance_monitoring()