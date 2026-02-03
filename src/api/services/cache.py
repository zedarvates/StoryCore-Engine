"""
Cache Service

This module provides caching functionality for API endpoints.
"""

from typing import Any, Dict, Optional, Pattern
import time
import logging
import hashlib
import json
import re
from dataclasses import dataclass
from datetime import datetime, timedelta
from threading import Lock


logger = logging.getLogger(__name__)


@dataclass
class CacheEntry:
    """A cached value with metadata."""
    
    value: Any
    created_at: float
    ttl: int
    key: str
    
    def is_expired(self) -> bool:
        """Check if this cache entry has expired."""
        if self.ttl <= 0:
            return False  # Never expires
        return time.time() - self.created_at > self.ttl


class CacheService:
    """
    In-memory cache service with TTL support.
    
    Features:
    - Key-value storage with configurable TTL
    - Pattern-based cache invalidation
    - Cache statistics (hits, misses, size)
    - Thread-safe operations
    """
    
    def __init__(self, default_ttl: int = 300):
        """
        Initialize the cache service.
        
        Args:
            default_ttl: Default time-to-live in seconds (0 = never expires)
        """
        self.default_ttl = default_ttl
        self._cache: Dict[str, CacheEntry] = {}
        self._lock = Lock()
        self._hits = 0
        self._misses = 0
        self.logger = logging.getLogger(self.__class__.__name__)
    
    def get(self, key: str) -> Optional[Any]:
        """
        Get a value from the cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found or expired
        """
        with self._lock:
            entry = self._cache.get(key)
            
            if entry is None:
                self._misses += 1
                self.logger.debug(f"Cache miss: {key}")
                return None
            
            if entry.is_expired():
                # Remove expired entry
                del self._cache[key]
                self._misses += 1
                self.logger.debug(f"Cache expired: {key}")
                return None
            
            self._hits += 1
            self.logger.debug(f"Cache hit: {key}")
            return entry.value
    
    def set(
        self,
        key: str,
        value: Any,
        ttl: Optional[int] = None,
    ) -> None:
        """
        Set a value in the cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time-to-live in seconds (None = use default)
        """
        if ttl is None:
            ttl = self.default_ttl
        
        with self._lock:
            entry = CacheEntry(
                value=value,
                created_at=time.time(),
                ttl=ttl,
                key=key,
            )
            self._cache[key] = entry
            self.logger.debug(f"Cache set: {key} (TTL: {ttl}s)")
    
    def delete(self, key: str) -> bool:
        """
        Delete a specific cache entry.
        
        Args:
            key: Cache key
            
        Returns:
            True if key was found and deleted, False otherwise
        """
        with self._lock:
            if key in self._cache:
                del self._cache[key]
                self.logger.debug(f"Cache delete: {key}")
                return True
            return False
    
    def invalidate(self, pattern: str) -> int:
        """
        Invalidate cache entries matching a pattern.
        
        Args:
            pattern: Regex pattern to match keys
            
        Returns:
            Number of entries invalidated
        """
        regex = re.compile(pattern)
        count = 0
        
        with self._lock:
            keys_to_delete = [
                key for key in self._cache.keys()
                if regex.search(key)
            ]
            
            for key in keys_to_delete:
                del self._cache[key]
                count += 1
            
            if count > 0:
                self.logger.info(f"Cache invalidated: {count} entries matching '{pattern}'")
        
        return count
    
    def clear(self) -> None:
        """Clear all cache entries."""
        with self._lock:
            count = len(self._cache)
            self._cache.clear()
            self.logger.info(f"Cache cleared: {count} entries removed")
    
    def get_stats(self) -> Dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with cache statistics
        """
        with self._lock:
            total_requests = self._hits + self._misses
            hit_rate = self._hits / total_requests if total_requests > 0 else 0.0
            
            # Count expired entries
            expired_count = sum(
                1 for entry in self._cache.values()
                if entry.is_expired()
            )
            
            return {
                "size": len(self._cache),
                "hits": self._hits,
                "misses": self._misses,
                "hit_rate": hit_rate,
                "expired_entries": expired_count,
            }
    
    def cleanup_expired(self) -> int:
        """
        Remove all expired entries from the cache.
        
        Returns:
            Number of entries removed
        """
        with self._lock:
            expired_keys = [
                key for key, entry in self._cache.items()
                if entry.is_expired()
            ]
            
            for key in expired_keys:
                del self._cache[key]
            
            if expired_keys:
                self.logger.debug(f"Cleaned up {len(expired_keys)} expired entries")
            
            return len(expired_keys)
    
    @staticmethod
    def generate_cache_key(
        endpoint: str,
        params: Dict[str, Any],
        user_id: Optional[str] = None,
    ) -> str:
        """
        Generate a cache key from endpoint and parameters.
        
        Args:
            endpoint: API endpoint path
            params: Request parameters
            user_id: Optional user ID for user-specific caching
            
        Returns:
            Cache key string
        """
        # Create a stable representation of params
        # Sort keys to ensure consistent ordering
        param_str = json.dumps(params, sort_keys=True)
        
        # Create hash of parameters
        param_hash = hashlib.sha256(param_str.encode()).hexdigest()[:16]
        
        # Build cache key
        if user_id:
            return f"{endpoint}:user:{user_id}:{param_hash}"
        else:
            return f"{endpoint}:{param_hash}"
    
    @staticmethod
    def get_invalidation_pattern(
        endpoint: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
    ) -> str:
        """
        Generate a regex pattern for cache invalidation.
        
        Args:
            endpoint: API endpoint path (can use wildcards)
            resource_type: Optional resource type to invalidate
            resource_id: Optional specific resource ID
            
        Returns:
            Regex pattern string
        """
        # Escape special regex characters except *
        pattern = endpoint.replace(".", r"\.")
        pattern = pattern.replace("*", ".*")
        
        if resource_type:
            pattern = f"{pattern}.*{resource_type}"
        
        if resource_id:
            pattern = f"{pattern}.*{resource_id}"
        
        return pattern


# TTL configurations for different endpoint types
CACHE_TTL_CONFIG = {
    # Metadata operations - longer TTL
    "metadata": 300,  # 5 minutes
    "list": 180,      # 3 minutes
    "status": 60,     # 1 minute
    "get": 120,       # 2 minutes
    
    # Dynamic data - shorter TTL
    "search": 60,     # 1 minute
    "analyze": 120,   # 2 minutes
    
    # Configuration data - longer TTL
    "config": 600,    # 10 minutes
    "schema": 3600,   # 1 hour
}


def get_ttl_for_endpoint(endpoint: str) -> int:
    """
    Get appropriate TTL for an endpoint based on its type.
    
    Args:
        endpoint: API endpoint path
        
    Returns:
        TTL in seconds
    """
    # Check for specific patterns
    if ".list" in endpoint or "list." in endpoint:
        return CACHE_TTL_CONFIG["list"]
    elif ".status" in endpoint or "status." in endpoint:
        return CACHE_TTL_CONFIG["status"]
    elif ".get" in endpoint:
        return CACHE_TTL_CONFIG["get"]
    elif ".search" in endpoint:
        return CACHE_TTL_CONFIG["search"]
    elif ".analyze" in endpoint:
        return CACHE_TTL_CONFIG["analyze"]
    elif ".schema" in endpoint or "schema." in endpoint:
        return CACHE_TTL_CONFIG["schema"]
    elif ".config" in endpoint or "config." in endpoint:
        return CACHE_TTL_CONFIG["config"]
    else:
        # Default metadata TTL
        return CACHE_TTL_CONFIG["metadata"]
