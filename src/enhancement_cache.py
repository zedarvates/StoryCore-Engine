"""
Enhancement Cache - Intelligent caching system for AI-processed content.

This module provides LRU caching with pattern-based cache key generation,
intelligent invalidation, and comprehensive cache analytics.
"""

import asyncio
import logging
import time
import hashlib
import json
from pathlib import Path
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Any, Set, Tuple
from collections import OrderedDict, deque
from enum import Enum
import threading


class CacheEntryStatus(Enum):
    """Status of cache entries."""
    VALID = "valid"
    EXPIRED = "expired"
    INVALIDATED = "invalidated"
    PENDING = "pending"


@dataclass
class CacheKey:
    """Cache key with pattern-based generation."""
    content_hash: str
    enhancement_type: str
    parameters_hash: str
    version: str = "1.0"
    
    def to_string(self) -> str:
        """Convert cache key to string representation."""
        return f"{self.content_hash}:{self.enhancement_type}:{self.parameters_hash}:{self.version}"
    
    @classmethod
    def from_string(cls, key_string: str) -> 'CacheKey':
        """Create cache key from string representation."""
        parts = key_string.split(':')
        if len(parts) != 4:
            raise ValueError(f"Invalid cache key format: {key_string}")
        
        return cls(
            content_hash=parts[0],
            enhancement_type=parts[1],
            parameters_hash=parts[2],
            version=parts[3]
        )


@dataclass
class CacheEntry:
    """Entry in the enhancement cache."""
    key: CacheKey
    data: bytes
    metadata: Dict[str, Any]
    created_at: float
    last_accessed: float
    access_count: int = 0
    size_bytes: int = 0
    status: CacheEntryStatus = CacheEntryStatus.VALID
    ttl_seconds: Optional[float] = None
    
    def is_expired(self) -> bool:
        """Check if cache entry has expired."""
        if self.status == CacheEntryStatus.INVALIDATED:
            return True
        
        if self.ttl_seconds is None:
            return False
        
        age = time.time() - self.created_at
        return age > self.ttl_seconds
    
    def update_access(self):
        """Update access statistics."""
        self.last_accessed = time.time()
        self.access_count += 1
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'key': self.key.to_string(),
            'metadata': self.metadata,
            'created_at': self.created_at,
            'last_accessed': self.last_accessed,
            'access_count': self.access_count,
            'size_bytes': self.size_bytes,
            'status': self.status.value,
            'ttl_seconds': self.ttl_seconds
        }


@dataclass
class CacheStatistics:
    """Statistics for cache performance."""
    total_requests: int = 0
    cache_hits: int = 0
    cache_misses: int = 0
    evictions: int = 0
    invalidations: int = 0
    total_size_bytes: int = 0
    entry_count: int = 0
    
    def get_hit_rate(self) -> float:
        """Calculate cache hit rate."""
        if self.total_requests == 0:
            return 0.0
        return (self.cache_hits / self.total_requests) * 100
    
    def get_miss_rate(self) -> float:
        """Calculate cache miss rate."""
        if self.total_requests == 0:
            return 0.0
        return (self.cache_misses / self.total_requests) * 100
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'total_requests': self.total_requests,
            'cache_hits': self.cache_hits,
            'cache_misses': self.cache_misses,
            'hit_rate': self.get_hit_rate(),
            'miss_rate': self.get_miss_rate(),
            'evictions': self.evictions,
            'invalidations': self.invalidations,
            'total_size_bytes': self.total_size_bytes,
            'entry_count': self.entry_count
        }


class EnhancementCache:
    """
    Intelligent caching system for AI-processed content.
    
    Provides LRU caching with pattern-based cache key generation,
    intelligent invalidation, and comprehensive analytics.
    """
    
    def __init__(self, 
                 max_size_mb: int = 1024,
                 ttl_seconds: int = 3600,
                 cleanup_interval: int = 300):
        """
        Initialize Enhancement Cache.
        
        Args:
            max_size_mb: Maximum cache size in megabytes
            ttl_seconds: Time-to-live for cache entries in seconds
            cleanup_interval: Interval for automatic cleanup in seconds
        """
        self.max_size_bytes = max_size_mb * 1024 * 1024
        self.default_ttl = ttl_seconds
        self.cleanup_interval = cleanup_interval
        
        self.logger = logging.getLogger(__name__)
        
        # Cache storage (LRU ordered)
        self.cache: OrderedDict[str, CacheEntry] = OrderedDict()
        self.cache_lock = threading.Lock()
        
        # Statistics
        self.stats = CacheStatistics()
        
        # Invalidation patterns
        self.invalidation_patterns: Set[str] = set()
        
        # Cleanup task
        self.cleanup_task: Optional[asyncio.Task] = None
        self.is_running = False
        
        # Access history for analytics
        self.access_history: deque = deque(maxlen=1000)
        
        self.logger.info(
            f"Enhancement Cache initialized: "
            f"max_size={max_size_mb}MB, ttl={ttl_seconds}s"
        )
    
    async def start(self):
        """Start automatic cache cleanup."""
        if self.is_running:
            return
        
        self.is_running = True
        self.cleanup_task = asyncio.create_task(self._cleanup_loop())
        self.logger.info("Cache cleanup task started")
    
    async def stop(self):
        """Stop automatic cache cleanup."""
        if not self.is_running:
            return
        
        self.is_running = False
        
        if self.cleanup_task:
            self.cleanup_task.cancel()
            try:
                await self.cleanup_task
            except asyncio.CancelledError:
                pass
        
        self.logger.info("Cache cleanup task stopped")
    
    def generate_cache_key(self, 
                          content_data: bytes,
                          enhancement_type: str,
                          parameters: Dict[str, Any]) -> CacheKey:
        """
        Generate cache key based on content and parameters.
        
        Args:
            content_data: Content data to cache
            enhancement_type: Type of enhancement
            parameters: Enhancement parameters
            
        Returns:
            Generated cache key
        """
        # Hash content data
        content_hash = hashlib.sha256(content_data).hexdigest()[:16]
        
        # Hash parameters (sorted for consistency)
        params_str = json.dumps(parameters, sort_keys=True)
        params_hash = hashlib.md5(params_str.encode()).hexdigest()[:16]
        
        return CacheKey(
            content_hash=content_hash,
            enhancement_type=enhancement_type,
            parameters_hash=params_hash
        )
    
    def get(self, cache_key: CacheKey) -> Optional[Tuple[bytes, Dict[str, Any]]]:
        """
        Get entry from cache.
        
        Args:
            cache_key: Cache key to retrieve
            
        Returns:
            Tuple of (data, metadata) if found, None otherwise
        """
        key_string = cache_key.to_string()
        
        with self.cache_lock:
            self.stats.total_requests += 1
            
            if key_string not in self.cache:
                self.stats.cache_misses += 1
                self._record_access(key_string, hit=False)
                return None
            
            entry = self.cache[key_string]
            
            # Check if expired
            if entry.is_expired():
                self.logger.debug(f"Cache entry expired: {key_string}")
                del self.cache[key_string]
                self.stats.cache_misses += 1
                self.stats.invalidations += 1
                self._record_access(key_string, hit=False)
                return None
            
            # Update access statistics
            entry.update_access()
            
            # Move to end (most recently used)
            self.cache.move_to_end(key_string)
            
            self.stats.cache_hits += 1
            self._record_access(key_string, hit=True)
            
            self.logger.debug(f"Cache hit: {key_string}")
            return (entry.data, entry.metadata)
    
    def put(self, 
            cache_key: CacheKey,
            data: bytes,
            metadata: Optional[Dict[str, Any]] = None,
            ttl_seconds: Optional[float] = None):
        """
        Store entry in cache.
        
        Args:
            cache_key: Cache key
            data: Data to cache
            metadata: Optional metadata
            ttl_seconds: Optional TTL override
        """
        key_string = cache_key.to_string()
        entry_size = len(data)
        
        with self.cache_lock:
            # Check if we need to evict entries
            while self._get_total_size() + entry_size > self.max_size_bytes:
                if not self.cache:
                    self.logger.warning("Cannot cache entry: exceeds max cache size")
                    return
                
                # Evict least recently used entry
                evicted_key, evicted_entry = self.cache.popitem(last=False)
                self.stats.total_size_bytes -= evicted_entry.size_bytes
                self.stats.evictions += 1
                self.logger.debug(f"Evicted cache entry: {evicted_key}")
            
            # Create cache entry
            entry = CacheEntry(
                key=cache_key,
                data=data,
                metadata=metadata or {},
                created_at=time.time(),
                last_accessed=time.time(),
                size_bytes=entry_size,
                ttl_seconds=ttl_seconds or self.default_ttl
            )
            
            # Store in cache
            self.cache[key_string] = entry
            self.stats.total_size_bytes += entry_size
            self.stats.entry_count = len(self.cache)
            
            self.logger.debug(f"Cached entry: {key_string} ({entry_size} bytes)")
    
    def invalidate(self, cache_key: CacheKey) -> bool:
        """
        Invalidate specific cache entry.
        
        Args:
            cache_key: Cache key to invalidate
            
        Returns:
            True if entry was invalidated, False if not found
        """
        key_string = cache_key.to_string()
        
        with self.cache_lock:
            if key_string in self.cache:
                entry = self.cache[key_string]
                self.stats.total_size_bytes -= entry.size_bytes
                del self.cache[key_string]
                self.stats.invalidations += 1
                self.stats.entry_count = len(self.cache)
                
                self.logger.debug(f"Invalidated cache entry: {key_string}")
                return True
            
            return False
    
    def invalidate_by_pattern(self, pattern: str) -> int:
        """
        Invalidate cache entries matching pattern.
        
        Args:
            pattern: Pattern to match (e.g., "style_transfer:*")
            
        Returns:
            Number of entries invalidated
        """
        invalidated_count = 0
        
        with self.cache_lock:
            keys_to_remove = []
            
            for key_string in self.cache.keys():
                if self._matches_pattern(key_string, pattern):
                    keys_to_remove.append(key_string)
            
            for key_string in keys_to_remove:
                entry = self.cache[key_string]
                self.stats.total_size_bytes -= entry.size_bytes
                del self.cache[key_string]
                invalidated_count += 1
            
            self.stats.invalidations += invalidated_count
            self.stats.entry_count = len(self.cache)
        
        self.logger.info(f"Invalidated {invalidated_count} entries matching pattern: {pattern}")
        return invalidated_count
    
    def _matches_pattern(self, key_string: str, pattern: str) -> bool:
        """Check if key matches invalidation pattern."""
        # Simple pattern matching (supports * wildcard)
        if '*' not in pattern:
            return key_string == pattern
        
        # Split pattern by wildcard
        parts = pattern.split('*')
        
        # Check if key starts with first part and ends with last part
        if not key_string.startswith(parts[0]):
            return False
        
        if len(parts) > 1 and not key_string.endswith(parts[-1]):
            return False
        
        return True
    
    def clear(self):
        """Clear all cache entries."""
        with self.cache_lock:
            entry_count = len(self.cache)
            self.cache.clear()
            self.stats.total_size_bytes = 0
            self.stats.entry_count = 0
            self.stats.invalidations += entry_count
        
        self.logger.info(f"Cache cleared: {entry_count} entries removed")
    
    def _get_total_size(self) -> int:
        """Get total cache size in bytes."""
        return self.stats.total_size_bytes
    
    def _record_access(self, key: str, hit: bool):
        """Record cache access for analytics."""
        self.access_history.append({
            'timestamp': time.time(),
            'key': key,
            'hit': hit
        })
    
    async def _cleanup_loop(self):
        """Automatic cleanup loop for expired entries."""
        self.logger.info("Cache cleanup loop started")
        
        while self.is_running:
            try:
                await asyncio.sleep(self.cleanup_interval)
                await self._cleanup_expired_entries()
            
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error in cleanup loop: {e}")
        
        self.logger.info("Cache cleanup loop stopped")
    
    async def _cleanup_expired_entries(self):
        """Clean up expired cache entries."""
        expired_keys = []
        
        with self.cache_lock:
            for key_string, entry in self.cache.items():
                if entry.is_expired():
                    expired_keys.append(key_string)
            
            for key_string in expired_keys:
                entry = self.cache[key_string]
                self.stats.total_size_bytes -= entry.size_bytes
                del self.cache[key_string]
                self.stats.invalidations += 1
            
            self.stats.entry_count = len(self.cache)
        
        if expired_keys:
            self.logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")
    
    def get_statistics(self) -> Dict[str, Any]:
        """Get cache statistics."""
        with self.cache_lock:
            stats_dict = self.stats.to_dict()
            
            # Add additional metrics
            stats_dict['max_size_bytes'] = self.max_size_bytes
            stats_dict['max_size_mb'] = self.max_size_bytes / (1024 * 1024)
            stats_dict['current_size_mb'] = self.stats.total_size_bytes / (1024 * 1024)
            stats_dict['utilization_percent'] = (
                (self.stats.total_size_bytes / self.max_size_bytes) * 100
                if self.max_size_bytes > 0 else 0
            )
            stats_dict['default_ttl_seconds'] = self.default_ttl
            
            return stats_dict
    
    def get_entries_info(self) -> List[Dict[str, Any]]:
        """Get information about all cache entries."""
        with self.cache_lock:
            return [entry.to_dict() for entry in self.cache.values()]
    
    def get_access_patterns(self, duration_minutes: int = 10) -> Dict[str, Any]:
        """
        Analyze cache access patterns.
        
        Args:
            duration_minutes: Duration to analyze in minutes
            
        Returns:
            Access pattern analysis
        """
        cutoff_time = time.time() - (duration_minutes * 60)
        
        recent_accesses = [
            access for access in self.access_history
            if access['timestamp'] >= cutoff_time
        ]
        
        if not recent_accesses:
            return {
                'duration_minutes': duration_minutes,
                'total_accesses': 0,
                'hit_rate': 0.0,
                'most_accessed_keys': []
            }
        
        # Calculate hit rate
        hits = sum(1 for access in recent_accesses if access['hit'])
        hit_rate = (hits / len(recent_accesses)) * 100 if recent_accesses else 0
        
        # Find most accessed keys
        key_counts = {}
        for access in recent_accesses:
            key = access['key']
            key_counts[key] = key_counts.get(key, 0) + 1
        
        most_accessed = sorted(
            key_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:10]
        
        return {
            'duration_minutes': duration_minutes,
            'total_accesses': len(recent_accesses),
            'hit_rate': hit_rate,
            'hits': hits,
            'misses': len(recent_accesses) - hits,
            'most_accessed_keys': [
                {'key': key, 'count': count}
                for key, count in most_accessed
            ]
        }
    
    def optimize(self) -> Dict[str, Any]:
        """
        Optimize cache performance.
        
        Returns:
            Optimization report
        """
        recommendations = []
        actions_taken = []
        
        stats = self.get_statistics()
        
        # Check utilization
        if stats['utilization_percent'] > 90:
            recommendations.append("Cache utilization is high (>90%). Consider increasing cache size.")
        elif stats['utilization_percent'] < 30:
            recommendations.append("Cache utilization is low (<30%). Consider reducing cache size to save memory.")
        
        # Check hit rate
        if stats['hit_rate'] < 50:
            recommendations.append("Low cache hit rate (<50%). Consider increasing TTL or cache size.")
        
        # Check for expired entries
        with self.cache_lock:
            expired_count = sum(1 for entry in self.cache.values() if entry.is_expired())
        
        if expired_count > 0:
            # Clean up expired entries
            asyncio.create_task(self._cleanup_expired_entries())
            actions_taken.append(f"Scheduled cleanup of {expired_count} expired entries")
        
        return {
            'current_stats': stats,
            'recommendations': recommendations,
            'actions_taken': actions_taken,
            'optimization_score': self._calculate_optimization_score(stats)
        }
    
    def _calculate_optimization_score(self, stats: Dict[str, Any]) -> float:
        """Calculate cache optimization score (0-1, higher is better)."""
        # Hit rate component (target: 70-90%)
        hit_rate = stats['hit_rate']
        if hit_rate < 50:
            hit_score = hit_rate / 50
        elif hit_rate <= 90:
            hit_score = 1.0
        else:
            hit_score = 0.9
        
        # Utilization component (target: 60-80%)
        utilization = stats['utilization_percent']
        if utilization < 40:
            util_score = utilization / 40
        elif utilization <= 80:
            util_score = 1.0
        else:
            util_score = max(0, (100 - utilization) / 20)
        
        # Weighted average
        return (hit_score * 0.7 + util_score * 0.3)
    
    def reset_statistics(self):
        """Reset cache statistics."""
        with self.cache_lock:
            entry_count = self.stats.entry_count
            total_size = self.stats.total_size_bytes
            
            self.stats = CacheStatistics()
            self.stats.entry_count = entry_count
            self.stats.total_size_bytes = total_size
        
        self.access_history.clear()
        self.logger.info("Cache statistics reset")
