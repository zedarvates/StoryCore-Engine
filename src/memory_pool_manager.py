"""
Memory Pool Manager for Production Scalability

This module provides advanced memory pool management with:
- Object pooling for frequently allocated objects
- Memory fragmentation reduction
- Garbage collection optimization
- Memory usage monitoring and limits
- Automatic pool resizing based on usage patterns

Author: StoryCore-Engine Team
Date: 2026-01-15
"""

import gc
import logging
import threading
import time
import weakref
from collections import defaultdict, deque
from dataclasses import dataclass, field
from typing import Dict, List, Any, Optional, Callable, Type, TypeVar, Generic
from enum import Enum
import psutil
import tracemalloc

T = TypeVar('T')


class PoolStrategy(Enum):
    """Memory pool allocation strategies."""
    FIXED_SIZE = "fixed_size"          # Fixed pool size
    DYNAMIC = "dynamic"                # Dynamic pool sizing
    ADAPTIVE = "adaptive"              # Adaptive based on usage patterns
    LRU_EVICTION = "lru_eviction"      # LRU eviction for oversized pools


@dataclass
class PoolConfiguration:
    """Configuration for memory pools."""
    initial_size: int = 10
    max_size: int = 100
    min_size: int = 5
    growth_factor: float = 1.5
    shrink_threshold: float = 0.3  # Shrink when utilization below this
    strategy: PoolStrategy = PoolStrategy.ADAPTIVE
    enable_monitoring: bool = True
    cleanup_interval_seconds: int = 60


@dataclass
class PoolStatistics:
    """Statistics for memory pool usage."""
    total_allocated: int = 0
    total_released: int = 0
    current_size: int = 0
    peak_size: int = 0
    hit_count: int = 0
    miss_count: int = 0
    eviction_count: int = 0
    resize_count: int = 0

    def get_hit_rate(self) -> float:
        """Calculate pool hit rate."""
        total = self.hit_count + self.miss_count
        return (self.hit_count / total * 100) if total > 0 else 0.0


class MemoryPool(Generic[T]):
    """
    Generic memory pool for object reuse.

    Reduces garbage collection pressure by reusing objects instead of
    creating new instances for frequently allocated types.
    """

    def __init__(self, object_type: Type[T], config: PoolConfiguration):
        self.object_type = object_type
        self.config = config
        self.logger = logging.getLogger(f"{__name__}.{object_type.__name__}_pool")

        # Pool storage
        self.available: deque[T] = deque()
        self.in_use: set = set()  # Weak references to track usage
        self.lock = threading.RLock()

        # Statistics
        self.stats = PoolStatistics()

        # Initialize pool
        self._initialize_pool()

    def _initialize_pool(self):
        """Initialize pool with initial objects."""
        for _ in range(self.config.initial_size):
            try:
                obj = self.object_type()
                self.available.append(obj)
                self.stats.total_allocated += 1
            except Exception as e:
                self.logger.error(f"Failed to create {self.object_type.__name__}: {e}")

        self.stats.current_size = len(self.available)

    def acquire(self) -> T:
        """Acquire an object from the pool."""
        with self.lock:
            if self.available:
                # Reuse existing object
                obj = self.available.popleft()
                self.stats.hit_count += 1
            else:
                # Create new object
                try:
                    obj = self.object_type()
                    self.stats.total_allocated += 1
                    self.stats.miss_count += 1
                except Exception as e:
                    self.logger.error(f"Failed to create {self.object_type.__name__}: {e}")
                    raise

            # Track usage
            self.in_use.add(weakref.ref(obj, self._release_callback))
            self.stats.current_size = len(self.available) + len(self.in_use)

            return obj

    def release(self, obj: T) -> None:
        """Release an object back to the pool."""
        with self.lock:
            if obj is None:
                return

            # Remove from in-use tracking
            to_remove = None
            for ref in self.in_use:
                if ref() is obj:
                    to_remove = ref
                    break

            if to_remove:
                self.in_use.discard(to_remove)

            # Check if object can be reused
            if self._can_reuse_object(obj):
                # Reset object state
                self._reset_object(obj)

                # Add back to available pool
                if len(self.available) < self.config.max_size:
                    self.available.append(obj)
                    self.stats.total_released += 1
                else:
                    # Pool full, let GC handle it
                    self.stats.eviction_count += 1
            else:
                # Object cannot be reused
                self.stats.eviction_count += 1

            self.stats.current_size = len(self.available) + len(self.in_use)
            self.stats.peak_size = max(self.stats.peak_size, self.stats.current_size)

    def _release_callback(self, weak_ref):
        """Callback when object is garbage collected."""
        with self.lock:
            self.in_use.discard(weak_ref)
            self.stats.current_size = len(self.available) + len(self.in_use)

    def _can_reuse_object(self, obj: T) -> bool:
        """Check if object can be safely reused."""
        # Default implementation - subclasses should override for specific logic
        try:
            # Basic checks: object exists and is of correct type
            return isinstance(obj, self.object_type)
        except Exception:
            return False

    def _reset_object(self, obj: T) -> None:
        """Reset object to clean state for reuse."""
        # Default implementation - subclasses should override for specific logic
        pass

    def resize_pool(self, new_size: int) -> None:
        """Resize the pool to specified size."""
        with self.lock:
            target_size = max(self.config.min_size, min(new_size, self.config.max_size))

            current_available = len(self.available)

            if target_size > current_available:
                # Grow pool
                to_add = target_size - current_available
                for _ in range(to_add):
                    try:
                        obj = self.object_type()
                        self.available.append(obj)
                        self.stats.total_allocated += 1
                    except Exception as e:
                        self.logger.error(f"Failed to create {self.object_type.__name__}: {e}")
                        break
            elif target_size < current_available:
                # Shrink pool
                to_remove = current_available - target_size
                for _ in range(to_remove):
                    if self.available:
                        self.available.pop()  # Remove from end
                        self.stats.eviction_count += 1

            self.stats.resize_count += 1
            self.logger.info(f"Resized {self.object_type.__name__} pool to {target_size}")

    def get_statistics(self) -> Dict[str, Any]:
        """Get pool statistics."""
        with self.lock:
            return {
                'object_type': self.object_type.__name__,
                'config': {
                    'initial_size': self.config.initial_size,
                    'max_size': self.config.max_size,
                    'min_size': self.config.min_size,
                    'strategy': self.config.strategy.value
                },
                'stats': {
                    'current_size': self.stats.current_size,
                    'available_count': len(self.available),
                    'in_use_count': len(self.in_use),
                    'peak_size': self.stats.peak_size,
                    'total_allocated': self.stats.total_allocated,
                    'total_released': self.stats.total_released,
                    'hit_rate_percent': self.stats.get_hit_rate(),
                    'eviction_count': self.stats.eviction_count,
                    'resize_count': self.stats.resize_count
                }
            }

    def optimize(self) -> List[str]:
        """Optimize pool based on usage patterns."""
        recommendations = []

        stats = self.get_statistics()
        utilization = stats['stats']['current_size'] / self.config.max_size

        if stats['stats']['hit_rate_percent'] < 50:
            recommendations.append("Low hit rate - consider increasing pool size or reviewing object lifecycle")

        if utilization > 0.9:
            recommendations.append("High utilization - consider increasing max pool size")

        if utilization < 0.3 and self.config.strategy == PoolStrategy.ADAPTIVE:
            recommendations.append("Low utilization - pool could be shrunk")

        if stats['stats']['eviction_count'] > stats['stats']['total_allocated'] * 0.1:
            recommendations.append("High eviction rate - objects may not be reusable or pool sizing issues")

        return recommendations


class NumpyArrayPool(MemoryPool):
    """Specialized pool for numpy arrays."""

    def __init__(self, shape: tuple, dtype: str = 'float32', config: PoolConfiguration = None):
        self.shape = shape
        self.dtype = dtype

        # Import numpy here to avoid import errors if not available
        try:
            import numpy as np
            self.np = np
        except ImportError:
            raise ImportError("numpy required for NumpyArrayPool")

        super().__init__(lambda: self.np.zeros(shape, dtype=dtype), config or PoolConfiguration())

    def _can_reuse_object(self, obj) -> bool:
        """Check if numpy array can be reused."""
        try:
            return (hasattr(obj, 'shape') and obj.shape == self.shape and
                   hasattr(obj, 'dtype') and obj.dtype == self.np.dtype(self.dtype))
        except Exception:
            return False

    def _reset_object(self, obj) -> None:
        """Reset numpy array to zeros."""
        obj.fill(0)


class BufferPool(MemoryPool):
    """Pool for byte buffers."""

    def __init__(self, size_bytes: int, config: PoolConfiguration = None):
        self.size_bytes = size_bytes
        super().__init__(lambda: bytearray(size_bytes), config or PoolConfiguration())

    def _can_reuse_object(self, obj) -> bool:
        """Check if buffer can be reused."""
        try:
            return isinstance(obj, bytearray) and len(obj) == self.size_bytes
        except Exception:
            return False

    def _reset_object(self, obj) -> None:
        """Reset buffer to zero."""
        obj[:] = b'\x00' * self.size_bytes


class MemoryPoolManager:
    """
    Central manager for memory pools with monitoring and optimization.
    """

    def __init__(self, enable_tracing: bool = False):
        self.logger = logging.getLogger(__name__)
        self.pools: Dict[str, MemoryPool] = {}
        self.lock = threading.RLock()

        # Memory monitoring
        self.enable_tracing = enable_tracing
        if enable_tracing:
            tracemalloc.start()

        # Background cleanup
        self.cleanup_thread: Optional[threading.Thread] = None
        self.cleanup_interval = 60  # seconds
        self.running = False

        # Memory limits
        self.memory_limit_bytes = psutil.virtual_memory().total * 0.8  # 80% of system memory
        self.current_memory_usage = 0

        self.start_cleanup_thread()

    def start_cleanup_thread(self):
        """Start background cleanup thread."""
        if self.cleanup_thread is None or not self.cleanup_thread.is_alive():
            self.running = True
            self.cleanup_thread = threading.Thread(target=self._cleanup_loop, daemon=True)
            self.cleanup_thread.start()

    def stop_cleanup_thread(self):
        """Stop background cleanup thread."""
        self.running = False
        if self.cleanup_thread:
            self.cleanup_thread.join(timeout=5.0)

    def create_pool(self, name: str, object_type: Type[T],
                   config: PoolConfiguration = None) -> MemoryPool[T]:
        """Create a new memory pool."""
        with self.lock:
            if name in self.pools:
                self.logger.warning(f"Pool {name} already exists, returning existing")
                return self.pools[name]

            pool = MemoryPool(object_type, config or PoolConfiguration())
            self.pools[name] = pool
            self.logger.info(f"Created memory pool: {name}")
            return pool

    def get_pool(self, name: str) -> Optional[MemoryPool]:
        """Get existing pool by name."""
        with self.lock:
            return self.pools.get(name)

    def remove_pool(self, name: str) -> bool:
        """Remove a memory pool."""
        with self.lock:
            if name in self.pools:
                # Note: Pool removal doesn't immediately free memory
                # Objects in use will be freed when released
                del self.pools[name]
                self.logger.info(f"Removed memory pool: {name}")
                return True
        return False

    def acquire_from_pool(self, pool_name: str) -> Any:
        """Acquire object from named pool."""
        pool = self.get_pool(pool_name)
        if pool is None:
            raise ValueError(f"Pool {pool_name} not found")
        return pool.acquire()

    def release_to_pool(self, pool_name: str, obj: Any) -> None:
        """Release object to named pool."""
        pool = self.get_pool(pool_name)
        if pool:
            pool.release(obj)

    def optimize_pools(self) -> Dict[str, List[str]]:
        """Optimize all pools based on usage patterns."""
        optimizations = {}

        with self.lock:
            for name, pool in self.pools.items():
                recommendations = pool.optimize()
                if recommendations:
                    optimizations[name] = recommendations

                    # Apply automatic optimizations
                    stats = pool.get_statistics()['stats']
                    utilization = stats['current_size'] / pool.config.max_size

                    if pool.config.strategy == PoolStrategy.ADAPTIVE:
                        if utilization < pool.config.shrink_threshold:
                            # Shrink pool
                            new_size = max(pool.config.min_size,
                                         int(stats['current_size'] * 1.2))
                            pool.resize_pool(new_size)
                        elif utilization > 0.9:
                            # Grow pool
                            new_size = min(pool.config.max_size,
                                         int(stats['current_size'] * pool.config.growth_factor))
                            pool.resize_pool(new_size)

        return optimizations

    def force_garbage_collection(self) -> Dict[str, Any]:
        """Force garbage collection and report results."""
        before = gc.get_stats()
        collected = gc.collect()
        after = gc.get_stats()

        return {
            'objects_collected': collected,
            'gc_stats_before': before,
            'gc_stats_after': after,
            'memory_freed_estimate': self._estimate_memory_freed(before, after)
        }

    def _estimate_memory_freed(self, before: List[Dict], after: List[Dict]) -> int:
        """Estimate memory freed by GC."""
        # Simple estimation based on GC stats
        total_before = sum(gen['collected'] for gen in before)
        total_after = sum(gen['collected'] for gen in after)
        return max(0, total_after - total_before) * 1024  # Rough estimate

    def get_memory_statistics(self) -> Dict[str, Any]:
        """Get comprehensive memory statistics."""
        process = psutil.Process()
        memory_info = process.memory_info()
        system_memory = psutil.virtual_memory()

        pool_stats = {}
        with self.lock:
            for name, pool in self.pools.items():
                pool_stats[name] = pool.get_statistics()

        tracing_stats = {}
        if self.enable_tracing:
            try:
                current, peak = tracemalloc.get_traced_memory()
                tracing_stats = {
                    'current_traced_mb': current / (1024 * 1024),
                    'peak_traced_mb': peak / (1024 * 1024)
                }
            except Exception:
                pass

        return {
            'process_memory': {
                'rss_mb': memory_info.rss / (1024 * 1024),
                'vms_mb': memory_info.vms / (1024 * 1024),
                'percent': process.memory_percent()
            },
            'system_memory': {
                'total_mb': system_memory.total / (1024 * 1024),
                'available_mb': system_memory.available / (1024 * 1024),
                'percent': system_memory.percent
            },
            'pools': pool_stats,
            'tracing': tracing_stats,
            'gc_stats': gc.get_stats(),
            'memory_limit_mb': self.memory_limit_bytes / (1024 * 1024)
        }

    def _cleanup_loop(self):
        """Background cleanup and optimization loop."""
        while self.running:
            try:
                time.sleep(self.cleanup_interval)

                # Optimize pools
                optimizations = self.optimize_pools()
                if optimizations:
                    self.logger.info(f"Applied pool optimizations: {optimizations}")

                # Force garbage collection if memory usage is high
                system_memory = psutil.virtual_memory()
                if system_memory.percent > 80:
                    gc_result = self.force_garbage_collection()
                    self.logger.info(f"GC cleanup: {gc_result['objects_collected']} objects collected")

                # Update memory usage tracking
                self.current_memory_usage = psutil.Process().memory_info().rss

            except Exception as e:
                self.logger.error(f"Cleanup loop error: {e}")

    def __del__(self):
        """Cleanup on destruction."""
        self.stop_cleanup_thread()


# Global memory pool manager instance
_memory_pool_manager: Optional[MemoryPoolManager] = None


def get_memory_pool_manager() -> MemoryPoolManager:
    """Get global memory pool manager instance."""
    global _memory_pool_manager
    if _memory_pool_manager is None:
        _memory_pool_manager = MemoryPoolManager()
    return _memory_pool_manager


def create_memory_pool(name: str, object_type: Type[T],
                      config: PoolConfiguration = None) -> MemoryPool[T]:
    """Create a memory pool in the global manager."""
    return get_memory_pool_manager().create_pool(name, object_type, config)