"""
Advanced Multi-Level Caching Layer for Production Scalability

This module provides a multi-level caching system with:
- L1: High-speed in-memory LRU cache
- L2: Persistent disk cache with compression
- L3: Distributed cache support (Redis/memcached)
- Intelligent cache warming and prefetching
- Automatic cache synchronization

Author: StoryCore-Engine Team
Date: 2026-01-15
"""

import asyncio
import gzip
import json
import logging
import pickle
import threading
import time
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Dict, Any, Optional, Tuple, List, Callable
from collections import OrderedDict, deque
import hashlib
import weakref

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None

try:
    import memcache
    MEMCACHE_AVAILABLE = True
except ImportError:
    MEMCACHE_AVAILABLE = False
    memcache = None


class CacheLevel(Enum):
    """Cache levels for hierarchical caching."""
    L1_MEMORY = "l1_memory"  # Fast in-memory
    L2_DISK = "l2_disk"      # Persistent disk
    L3_DISTRIBUTED = "l3_distributed"  # Redis/memcached


@dataclass
class CacheEntry:
    """Enhanced cache entry with metadata."""
    key: str
    data: Any
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    last_accessed: float = field(default_factory=time.time)
    access_count: int = 0
    ttl_seconds: Optional[float] = None
    compressed: bool = False
    data_size: int = 0

    def is_expired(self) -> bool:
        """Check if entry is expired."""
        if self.ttl_seconds is None:
            return False
        return time.time() - self.created_at > self.ttl_seconds

    def update_access(self):
        """Update access statistics."""
        self.last_accessed = time.time()
        self.access_count += 1

    def get_age_seconds(self) -> float:
        """Get entry age in seconds."""
        return time.time() - self.created_at


class CacheBackend(ABC):
    """Abstract base class for cache backends."""

    @abstractmethod
    async def get(self, key: str) -> Optional[CacheEntry]:
        """Retrieve entry from cache."""
        pass

    @abstractmethod
    async def put(self, entry: CacheEntry) -> bool:
        """Store entry in cache."""
        pass

    @abstractmethod
    async def delete(self, key: str) -> bool:
        """Delete entry from cache."""
        pass

    @abstractmethod
    async def clear(self) -> None:
        """Clear all entries."""
        pass

    @abstractmethod
    async def get_stats(self) -> Dict[str, Any]:
        """Get backend statistics."""
        pass


class MemoryCacheBackend(CacheBackend):
    """High-performance in-memory LRU cache."""

    def __init__(self, max_size_mb: int = 512, ttl_seconds: int = 3600):
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.default_ttl = ttl_seconds
        self.cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self.lock = threading.RLock()
        self.current_size = 0

    async def get(self, key: str) -> Optional[CacheEntry]:
        with self.lock:
            if key not in self.cache:
                return None

            entry = self.cache[key]
            if entry.is_expired():
                del self.cache[key]
                self.current_size -= entry.data_size
                return None

            entry.update_access()
            self.cache.move_to_end(key)  # LRU
            return entry

    async def put(self, entry: CacheEntry) -> bool:
        with self.lock:
            # Check size limits
            if entry.data_size > self.max_size_bytes:
                return False

            # Evict if necessary
            while self.current_size + entry.data_size > self.max_size_bytes and self.cache:
                evicted_key, evicted_entry = self.cache.popitem(last=False)
                self.current_size -= evicted_entry.data_size

            # Store
            self.cache[entry.key] = entry
            self.cache.move_to_end(entry.key)
            self.current_size += entry.data_size
            return True

    async def delete(self, key: str) -> bool:
        with self.lock:
            if key in self.cache:
                entry = self.cache[key]
                self.current_size -= entry.data_size
                del self.cache[key]
                return True
        return False

    async def clear(self) -> None:
        with self.lock:
            self.cache.clear()
            self.current_size = 0

    async def get_stats(self) -> Dict[str, Any]:
        with self.lock:
            return {
                'entries': len(self.cache),
                'size_bytes': self.current_size,
                'size_mb': self.current_size / (1024 * 1024),
                'utilization_percent': (self.current_size / self.max_size_bytes) * 100 if self.max_size_bytes > 0 else 0
            }


class DiskCacheBackend(CacheBackend):
    """Persistent disk cache with compression."""

    def __init__(self, cache_dir: Path, max_size_mb: int = 2048, ttl_seconds: int = 86400, compression: bool = True):
        self.cache_dir = cache_dir
        self.cache_dir.mkdir(parents=True, exist_ok=True)
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.default_ttl = ttl_seconds
        self.compression = compression
        self.lock = threading.RLock()
        self.index_file = self.cache_dir / "cache_index.json"
        self.index: Dict[str, Dict[str, Any]] = {}
        self.current_size = 0
        self._load_index()

    def _load_index(self):
        """Load cache index from disk."""
        if self.index_file.exists():
            try:
                with open(self.index_file, 'r') as f:
                    self.index = json.load(f)
                # Calculate current size
                self.current_size = sum(entry.get('data_size', 0) for entry in self.index.values())
            except Exception:
                self.index = {}

    def _save_index(self):
        """Save cache index to disk."""
        try:
            with open(self.index_file, 'w') as f:
                json.dump(self.index, f, indent=2)
        except Exception:
            pass  # Index save failure shouldn't crash

    def _get_file_path(self, key: str) -> Path:
        """Get file path for cache key."""
        key_hash = hashlib.md5(key.encode()).hexdigest()
        return self.cache_dir / f"{key_hash}.cache"

    async def get(self, key: str) -> Optional[CacheEntry]:
        with self.lock:
            if key not in self.index:
                return None

            entry_meta = self.index[key]
            if entry_meta.get('expires_at', float('inf')) < time.time():
                # Expired, clean up
                await self.delete(key)
                return None

            file_path = self._get_file_path(key)
            if not file_path.exists():
                # File missing, clean index
                del self.index[key]
                self._save_index()
                return None

            try:
                # Load data
                if entry_meta.get('compressed', False):
                    with gzip.open(file_path, 'rb') as f:
                        data = pickle.load(f)
                else:
                    with open(file_path, 'rb') as f:
                        data = pickle.load(f)

                # Update access
                entry_meta['last_accessed'] = time.time()
                entry_meta['access_count'] = entry_meta.get('access_count', 0) + 1
                self._save_index()

                return CacheEntry(
                    key=key,
                    data=data,
                    metadata=entry_meta.get('metadata', {}),
                    created_at=entry_meta['created_at'],
                    last_accessed=entry_meta['last_accessed'],
                    access_count=entry_meta['access_count'],
                    ttl_seconds=entry_meta.get('ttl_seconds'),
                    compressed=entry_meta.get('compressed', False),
                    data_size=entry_meta['data_size']
                )

            except Exception:
                # Corrupt file, clean up
                await self.delete(key)
                return None

    async def put(self, entry: CacheEntry) -> bool:
        with self.lock:
            # Check size limits
            if entry.data_size > self.max_size_bytes:
                return False

            # Evict if necessary
            while self.current_size + entry.data_size > self.max_size_bytes and self.index:
                # Find oldest entry to evict
                oldest_key = min(self.index.keys(),
                               key=lambda k: self.index[k]['last_accessed'])
                await self.delete(oldest_key)

            # Save data
            file_path = self._get_file_path(entry.key)
            try:
                if self.compression and entry.data_size > 1024:  # Compress if > 1KB
                    with gzip.open(file_path, 'wb', compresslevel=6) as f:
                        pickle.dump(entry.data, f)
                    entry.compressed = True
                else:
                    with open(file_path, 'wb') as f:
                        pickle.dump(entry.data, f)

                # Update index
                self.index[entry.key] = {
                    'created_at': entry.created_at,
                    'last_accessed': entry.last_accessed,
                    'access_count': entry.access_count,
                    'ttl_seconds': entry.ttl_seconds,
                    'expires_at': entry.created_at + (entry.ttl_seconds or float('inf')),
                    'data_size': entry.data_size,
                    'compressed': entry.compressed,
                    'metadata': entry.metadata
                }

                self.current_size += entry.data_size
                self._save_index()
                return True

            except Exception:
                return False

    async def delete(self, key: str) -> bool:
        with self.lock:
            if key in self.index:
                entry_meta = self.index[key]
                file_path = self._get_file_path(key)

                # Remove file
                try:
                    file_path.unlink(missing_ok=True)
                except Exception:
                    pass

                # Update index
                self.current_size -= entry_meta['data_size']
                del self.index[key]
                self._save_index()
                return True
        return False

    async def clear(self) -> None:
        with self.lock:
            # Remove all files
            for key in list(self.index.keys()):
                file_path = self._get_file_path(key)
                try:
                    file_path.unlink(missing_ok=True)
                except Exception:
                    pass

            # Clear index
            self.index.clear()
            self.current_size = 0
            self._save_index()

    async def get_stats(self) -> Dict[str, Any]:
        with self.lock:
            return {
                'entries': len(self.index),
                'size_bytes': self.current_size,
                'size_mb': self.current_size / (1024 * 1024),
                'utilization_percent': (self.current_size / self.max_size_bytes) * 100 if self.max_size_bytes > 0 else 0,
                'compression_enabled': self.compression
            }


class DistributedCacheBackend(CacheBackend):
    """Redis/memcached distributed cache backend."""

    def __init__(self, backend_type: str = "redis", host: str = "localhost", port: int = 6379,
                 ttl_seconds: int = 3600, **kwargs):
        self.backend_type = backend_type
        self.ttl_seconds = ttl_seconds

        if backend_type == "redis" and REDIS_AVAILABLE:
            self.client = redis.Redis(host=host, port=port, **kwargs)
        elif backend_type == "memcache" and MEMCACHE_AVAILABLE:
            self.client = memcache.Client([f"{host}:{port}"], **kwargs)
        else:
            raise ValueError(f"Unsupported backend {backend_type} or library not available")

    async def get(self, key: str) -> Optional[CacheEntry]:
        try:
            if self.backend_type == "redis":
                data = self.client.get(key)
                if data is None:
                    return None
                entry_data = pickle.loads(data)
            else:  # memcache
                data = self.client.get(key)
                if data is None:
                    return None
                entry_data = pickle.loads(data)

            return entry_data
        except Exception:
            return None

    async def put(self, entry: CacheEntry) -> bool:
        try:
            serialized = pickle.dumps(entry)
            ttl = int(entry.ttl_seconds) if entry.ttl_seconds else self.ttl_seconds

            if self.backend_type == "redis":
                return bool(self.client.setex(entry.key, ttl, serialized))
            else:  # memcache
                return bool(self.client.set(entry.key, serialized, time=ttl))
        except Exception:
            return False

    async def delete(self, key: str) -> bool:
        try:
            if self.backend_type == "redis":
                return bool(self.client.delete(key))
            else:  # memcache
                return bool(self.client.delete(key))
        except Exception:
            return False

    async def clear(self) -> None:
        try:
            if self.backend_type == "redis":
                self.client.flushdb()
            else:  # memcache
                self.client.flush_all()
        except Exception:
            pass

    async def get_stats(self) -> Dict[str, Any]:
        try:
            if self.backend_type == "redis":
                info = self.client.info()
                return {
                    'backend': 'redis',
                    'connected_clients': info.get('connected_clients', 0),
                    'used_memory_mb': info.get('used_memory', 0) / (1024 * 1024),
                    'total_keys': self.client.dbsize()
                }
            else:  # memcache
                stats = self.client.get_stats()
                if stats:
                    stat = stats[0][1]
                    return {
                        'backend': 'memcache',
                        'bytes': int(stat.get('bytes', 0)),
                        'bytes_mb': int(stat.get('bytes', 0)) / (1024 * 1024),
                        'curr_items': int(stat.get('curr_items', 0))
                    }
                return {'backend': 'memcache', 'status': 'unknown'}
        except Exception:
            return {'backend': self.backend_type, 'status': 'error'}


@dataclass
class CacheConfiguration:
    """Configuration for multi-level caching."""
    enable_l1: bool = True
    l1_max_size_mb: int = 512
    l1_ttl_seconds: int = 3600

    enable_l2: bool = True
    l2_cache_dir: Optional[Path] = None
    l2_max_size_mb: int = 2048
    l2_ttl_seconds: int = 86400
    l2_compression: bool = True

    enable_l3: bool = False
    l3_backend: str = "redis"
    l3_host: str = "localhost"
    l3_port: int = 6379
    l3_ttl_seconds: int = 3600

    cache_warming_enabled: bool = False
    prefetch_enabled: bool = False
    sync_interval_seconds: int = 300


class AdvancedCachingLayer:
    """
    Advanced multi-level caching system for production scalability.
    """

    def __init__(self, config: CacheConfiguration):
        self.config = config
        self.logger = logging.getLogger(__name__)

        # Initialize cache levels
        self.backends: Dict[CacheLevel, CacheBackend] = {}

        if config.enable_l1:
            self.backends[CacheLevel.L1_MEMORY] = MemoryCacheBackend(
                max_size_mb=config.l1_max_size_mb,
                ttl_seconds=config.l1_ttl_seconds
            )

        if config.enable_l2:
            cache_dir = config.l2_cache_dir or Path("./cache/l2")
            self.backends[CacheLevel.L2_DISK] = DiskCacheBackend(
                cache_dir=cache_dir,
                max_size_mb=config.l2_max_size_mb,
                ttl_seconds=config.l2_ttl_seconds,
                compression=config.l2_compression
            )

        if config.enable_l3:
            try:
                self.backends[CacheLevel.L3_DISTRIBUTED] = DistributedCacheBackend(
                    backend_type=config.l3_backend,
                    host=config.l3_host,
                    port=config.l3_port,
                    ttl_seconds=config.l3_ttl_seconds
                )
            except Exception as e:
                self.logger.warning(f"Failed to initialize L3 cache: {e}")

        # Statistics
        self.stats_lock = threading.Lock()
        self.stats = {
            'total_requests': 0,
            'l1_hits': 0,
            'l2_hits': 0,
            'l3_hits': 0,
            'misses': 0,
            'sets': 0,
            'evictions': 0
        }

        # Cache warming and prefetching
        self.warm_keys: set = set()
        self.prefetch_patterns: List[str] = []

        # Background tasks
        self.sync_task: Optional[asyncio.Task] = None
        self.warming_task: Optional[asyncio.Task] = None

    async def start(self):
        """Start background cache management tasks."""
        if self.config.sync_interval_seconds > 0:
            self.sync_task = asyncio.create_task(self._sync_loop())

        if self.config.cache_warming_enabled:
            self.warming_task = asyncio.create_task(self._warming_loop())

        self.logger.info("Advanced caching layer started")

    async def stop(self):
        """Stop background tasks."""
        if self.sync_task:
            self.sync_task.cancel()
        if self.warming_task:
            self.warming_task.cancel()

        self.logger.info("Advanced caching layer stopped")

    async def get(self, key: str) -> Optional[Any]:
        """Retrieve value from multi-level cache."""
        with self.stats_lock:
            self.stats['total_requests'] += 1

        # Try L1 first
        if CacheLevel.L1_MEMORY in self.backends:
            entry = await self.backends[CacheLevel.L1_MEMORY].get(key)
            if entry:
                with self.stats_lock:
                    self.stats['l1_hits'] += 1
                return entry.data

        # Try L2
        if CacheLevel.L2_DISK in self.backends:
            entry = await self.backends[CacheLevel.L2_DISK].get(key)
            if entry:
                with self.stats_lock:
                    self.stats['l2_hits'] += 1
                # Promote to L1 if enabled
                if CacheLevel.L1_MEMORY in self.backends:
                    await self.backends[CacheLevel.L1_MEMORY].put(entry)
                return entry.data

        # Try L3
        if CacheLevel.L3_DISTRIBUTED in self.backends:
            entry = await self.backends[CacheLevel.L3_DISTRIBUTED].get(key)
            if entry:
                with self.stats_lock:
                    self.stats['l3_hits'] += 1
                # Promote to higher levels
                if CacheLevel.L1_MEMORY in self.backends:
                    await self.backends[CacheLevel.L1_MEMORY].put(entry)
                return entry.data

        # Cache miss
        with self.stats_lock:
            self.stats['misses'] += 1

        return None

    async def set(self, key: str, value: Any, ttl_seconds: Optional[float] = None,
                  metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Store value in multi-level cache."""
        with self.stats_lock:
            self.stats['sets'] += 1

        # Calculate data size
        data_size = len(pickle.dumps(value))

        entry = CacheEntry(
            key=key,
            data=value,
            metadata=metadata or {},
            ttl_seconds=ttl_seconds,
            data_size=data_size
        )

        success = True

        # Store in all enabled levels
        for level in [CacheLevel.L1_MEMORY, CacheLevel.L2_DISK, CacheLevel.L3_DISTRIBUTED]:
            if level in self.backends:
                level_success = await self.backends[level].put(entry)
                if not level_success:
                    success = False
                    self.logger.warning(f"Failed to store in {level.value}")

        return success

    async def delete(self, key: str) -> bool:
        """Delete key from all cache levels."""
        success = False

        for backend in self.backends.values():
            if await backend.delete(key):
                success = True

        return success

    async def clear(self) -> None:
        """Clear all cache levels."""
        for backend in self.backends.values():
            await backend.clear()

    def get_statistics(self) -> Dict[str, Any]:
        """Get comprehensive cache statistics."""
        with self.stats_lock:
            stats = self.stats.copy()

        # Add backend stats
        backend_stats = {}
        for level, backend in self.backends.items():
            try:
                backend_stats[level.value] = asyncio.run(backend.get_stats())
            except Exception as e:
                backend_stats[level.value] = {'error': str(e)}

        # Calculate rates
        total_requests = stats['total_requests']
        if total_requests > 0:
            stats['hit_rate_percent'] = ((stats['l1_hits'] + stats['l2_hits'] + stats['l3_hits']) / total_requests) * 100
            stats['miss_rate_percent'] = (stats['misses'] / total_requests) * 100
        else:
            stats['hit_rate_percent'] = 0.0
            stats['miss_rate_percent'] = 0.0

        return {
            'overall': stats,
            'backends': backend_stats,
            'configuration': {
                'l1_enabled': CacheLevel.L1_MEMORY in self.backends,
                'l2_enabled': CacheLevel.L2_DISK in self.backends,
                'l3_enabled': CacheLevel.L3_DISTRIBUTED in self.backends
            }
        }

    def add_warm_key(self, key: str):
        """Add key for cache warming."""
        self.warm_keys.add(key)

    def add_prefetch_pattern(self, pattern: str):
        """Add pattern for prefetching."""
        self.prefetch_patterns.append(pattern)

    async def _sync_loop(self):
        """Background synchronization loop."""
        while True:
            try:
                await asyncio.sleep(self.config.sync_interval_seconds)
                await self._sync_cache_levels()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Sync loop error: {e}")

    async def _sync_cache_levels(self):
        """Synchronize cache levels (L2 to L3, etc.)."""
        # Implementation for cross-level synchronization
        # This could involve promoting hot keys to higher levels
        # or replicating important data across distributed caches
        pass

    async def _warming_loop(self):
        """Background cache warming loop."""
        while True:
            try:
                await asyncio.sleep(600)  # Warm every 10 minutes
                await self._warm_cache()
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Warming loop error: {e}")

    async def _warm_cache(self):
        """Warm cache with frequently accessed keys."""
        for key in self.warm_keys:
            # Check if key needs warming (not in L1)
            if CacheLevel.L1_MEMORY in self.backends:
                entry = await self.backends[CacheLevel.L1_MEMORY].get(key)
                if entry is None:
                    # Try to load from lower levels
                    if CacheLevel.L2_DISK in self.backends:
                        entry = await self.backends[CacheLevel.L2_DISK].get(key)
                        if entry and CacheLevel.L1_MEMORY in self.backends:
                            await self.backends[CacheLevel.L1_MEMORY].put(entry)

    async def prefetch(self, related_keys: List[str]):
        """Prefetch related keys into cache."""
        # Implementation for intelligent prefetching based on access patterns
        pass


# Factory function
def create_advanced_caching_layer(config: Optional[CacheConfiguration] = None) -> AdvancedCachingLayer:
    """
    Factory function to create Advanced Caching Layer instance.

    Args:
        config: Optional cache configuration

    Returns:
        Configured AdvancedCachingLayer instance
    """
    return AdvancedCachingLayer(config or CacheConfiguration())