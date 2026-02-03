"""
Caching module for the fact-checking system.

This module provides content-hash-based caching with TTL support
and cache invalidation logic to improve performance.

Requirements: 9.5, 9.6
"""

import hashlib
import json
import time
from typing import Optional, Dict, Any
from pathlib import Path
from dataclasses import asdict
import logging

logger = logging.getLogger(__name__)


class CacheEntry:
    """
    Represents a single cache entry with TTL support.
    
    Attributes:
        data: The cached data
        timestamp: When the entry was created
        ttl: Time-to-live in seconds
    """
    
    def __init__(self, data: Any, ttl: int):
        """
        Initialize a cache entry.
        
        Args:
            data: The data to cache
            ttl: Time-to-live in seconds
        """
        self.data = data
        self.timestamp = time.time()
        self.ttl = ttl
    
    def is_expired(self) -> bool:
        """
        Check if the cache entry has expired.
        
        Returns:
            True if expired, False otherwise
        """
        return (time.time() - self.timestamp) > self.ttl
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert cache entry to dictionary for serialization."""
        return {
            "data": self.data,
            "timestamp": self.timestamp,
            "ttl": self.ttl
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CacheEntry':
        """Create cache entry from dictionary."""
        entry = cls(data["data"], data["ttl"])
        entry.timestamp = data["timestamp"]
        return entry


class FactCheckerCache:
    """
    Content-hash-based cache for fact-checking results.
    
    This cache uses SHA-256 hashing of input content as keys and supports
    TTL-based expiration and manual invalidation.
    """
    
    def __init__(self, cache_dir: Optional[Path] = None, default_ttl: int = 86400):
        """
        Initialize the cache.
        
        Args:
            cache_dir: Directory for persistent cache storage (None for in-memory only)
            default_ttl: Default time-to-live in seconds (default: 24 hours)
        """
        self.cache_dir = cache_dir
        self.default_ttl = default_ttl
        self._memory_cache: Dict[str, CacheEntry] = {}
        
        if cache_dir:
            cache_dir.mkdir(parents=True, exist_ok=True)
            logger.info(f"Cache initialized with persistent storage at {cache_dir}")
        else:
            logger.info("Cache initialized in memory-only mode")
    
    def _compute_hash(self, content: str) -> str:
        """
        Compute SHA-256 hash of content.
        
        Args:
            content: Content to hash
            
        Returns:
            Hexadecimal hash string
        """
        return hashlib.sha256(content.encode('utf-8')).hexdigest()
    
    def _get_cache_file_path(self, cache_key: str) -> Optional[Path]:
        """
        Get the file path for a cache key.
        
        Args:
            cache_key: The cache key
            
        Returns:
            Path to cache file, or None if no cache directory configured
        """
        if not self.cache_dir:
            return None
        return self.cache_dir / f"{cache_key}.json"
    
    def get(self, content: str) -> Optional[Dict[str, Any]]:
        """
        Retrieve cached result for content.
        
        Args:
            content: Content to look up
            
        Returns:
            Cached data if found and not expired, None otherwise
        """
        cache_key = self._compute_hash(content)
        
        # Check memory cache first
        if cache_key in self._memory_cache:
            entry = self._memory_cache[cache_key]
            if entry.is_expired():
                logger.debug(f"Cache entry expired for key {cache_key[:8]}...")
                del self._memory_cache[cache_key]
                # Also remove from disk if present
                if self.cache_dir:
                    cache_file = self._get_cache_file_path(cache_key)
                    if cache_file and cache_file.exists():
                        cache_file.unlink()
            else:
                logger.info(f"Cache hit (memory) for key {cache_key[:8]}...")
                return entry.data
        
        # Check disk cache if configured
        if self.cache_dir:
            cache_file = self._get_cache_file_path(cache_key)
            if cache_file and cache_file.exists():
                try:
                    with open(cache_file, 'r') as f:
                        entry_dict = json.load(f)
                    entry = CacheEntry.from_dict(entry_dict)
                    
                    if entry.is_expired():
                        logger.debug(f"Cache entry expired for key {cache_key[:8]}...")
                        cache_file.unlink()
                    else:
                        # Load into memory cache
                        self._memory_cache[cache_key] = entry
                        logger.info(f"Cache hit (disk) for key {cache_key[:8]}...")
                        return entry.data
                except (json.JSONDecodeError, KeyError, IOError) as e:
                    logger.warning(f"Failed to load cache entry: {e}")
                    # Remove corrupted cache file
                    if cache_file.exists():
                        cache_file.unlink()
        
        logger.debug(f"Cache miss for key {cache_key[:8]}...")
        return None
    
    def set(self, content: str, data: Dict[str, Any], ttl: Optional[int] = None) -> None:
        """
        Store result in cache.
        
        Args:
            content: Content used as cache key
            data: Data to cache
            ttl: Time-to-live in seconds (uses default if None)
        """
        cache_key = self._compute_hash(content)
        ttl = ttl if ttl is not None else self.default_ttl
        entry = CacheEntry(data, ttl)
        
        # Store in memory cache
        self._memory_cache[cache_key] = entry
        logger.info(f"Cached result for key {cache_key[:8]}... (TTL: {ttl}s)")
        
        # Store in disk cache if configured
        if self.cache_dir:
            cache_file = self._get_cache_file_path(cache_key)
            try:
                with open(cache_file, 'w') as f:
                    json.dump(entry.to_dict(), f)
                logger.debug(f"Persisted cache entry to disk: {cache_file}")
            except IOError as e:
                logger.warning(f"Failed to persist cache entry: {e}")
    
    def invalidate(self, content: str) -> bool:
        """
        Invalidate cache entry for specific content.
        
        Args:
            content: Content to invalidate
            
        Returns:
            True if entry was found and removed, False otherwise
        """
        cache_key = self._compute_hash(content)
        found = False
        
        # Remove from memory cache
        if cache_key in self._memory_cache:
            del self._memory_cache[cache_key]
            found = True
            logger.info(f"Invalidated memory cache for key {cache_key[:8]}...")
        
        # Remove from disk cache
        if self.cache_dir:
            cache_file = self._get_cache_file_path(cache_key)
            if cache_file and cache_file.exists():
                cache_file.unlink()
                found = True
                logger.info(f"Invalidated disk cache for key {cache_key[:8]}...")
        
        return found
    
    def clear(self) -> int:
        """
        Clear all cache entries.
        
        Returns:
            Number of entries cleared
        """
        count = len(self._memory_cache)
        self._memory_cache.clear()
        logger.info(f"Cleared {count} entries from memory cache")
        
        # Clear disk cache if configured
        if self.cache_dir:
            disk_count = 0
            for cache_file in self.cache_dir.glob("*.json"):
                cache_file.unlink()
                disk_count += 1
            logger.info(f"Cleared {disk_count} entries from disk cache")
            count += disk_count
        
        return count
    
    def cleanup_expired(self) -> int:
        """
        Remove all expired cache entries.
        
        Returns:
            Number of entries removed
        """
        # Clean memory cache
        expired_keys = [
            key for key, entry in self._memory_cache.items()
            if entry.is_expired()
        ]
        for key in expired_keys:
            del self._memory_cache[key]
        
        count = len(expired_keys)
        logger.info(f"Removed {count} expired entries from memory cache")
        
        # Clean disk cache if configured
        if self.cache_dir:
            disk_count = 0
            for cache_file in self.cache_dir.glob("*.json"):
                try:
                    with open(cache_file, 'r') as f:
                        entry_dict = json.load(f)
                    entry = CacheEntry.from_dict(entry_dict)
                    if entry.is_expired():
                        cache_file.unlink()
                        disk_count += 1
                except (json.JSONDecodeError, KeyError, IOError):
                    # Remove corrupted files
                    cache_file.unlink()
                    disk_count += 1
            
            logger.info(f"Removed {disk_count} expired entries from disk cache")
            count += disk_count
        
        return count
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with cache statistics
        """
        memory_count = len(self._memory_cache)
        disk_count = 0
        
        if self.cache_dir:
            disk_count = len(list(self.cache_dir.glob("*.json")))
        
        return {
            "memory_entries": memory_count,
            "disk_entries": disk_count,
            "total_entries": memory_count + disk_count,
            "cache_dir": str(self.cache_dir) if self.cache_dir else None,
            "default_ttl": self.default_ttl
        }


# Global cache instance
_global_cache: Optional[FactCheckerCache] = None


def get_cache(cache_dir: Optional[Path] = None, default_ttl: int = 86400) -> FactCheckerCache:
    """
    Get or create the global cache instance.
    
    Args:
        cache_dir: Directory for persistent cache storage
        default_ttl: Default time-to-live in seconds
        
    Returns:
        Global cache instance
    """
    global _global_cache
    if _global_cache is None:
        _global_cache = FactCheckerCache(cache_dir, default_ttl)
    return _global_cache


def reset_cache() -> None:
    """Reset the global cache instance (mainly for testing)."""
    global _global_cache
    _global_cache = None
