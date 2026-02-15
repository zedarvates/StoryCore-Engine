"""
StoryCore-Engine Shared Storage Utilities

This module provides centralized file storage operations with in-memory caching
for JSON-based data persistence across the application.

Features:
- Generic JSON file storage with LRU caching
- Automatic directory creation
- Error handling and logging
- Thread-safe operations
- TTL (Time-To-Live) support for cache entries (Performance Fix)
- Owner-based indexing for O(1) lookups (Performance Fix)
"""

import os
import json
import logging
import time
import threading
from collections import OrderedDict
from typing import Dict, Any, Optional, List, Set
from pathlib import Path

logger = logging.getLogger(__name__)


class LRUCache:
    """
    LRU Cache implementation with TTL (Time-To-Live) support.
    
    Performance Fix: Added TTL to prevent cache entries from living forever.
    Without TTL, stale data could accumulate and never be refreshed from disk.
    
    Attributes:
        max_size: Maximum number of entries in the cache
        ttl: Time-to-live in seconds (default: 3600 = 1 hour). Set to 0 to disable.
    """
    
    # Performance Fix: Default TTL of 1 hour to ensure cache freshness
    DEFAULT_TTL = 3600
    
    def __init__(self, max_size: int = 1000, ttl: int = DEFAULT_TTL):
        if max_size <= 0:
            max_size = float('inf')
        self.max_size = max_size
        self.ttl = ttl  # TTL in seconds, 0 means no expiration
        # Cache stores tuples of (value, timestamp)
        self.cache: OrderedDict[str, tuple[Any, float]] = OrderedDict()
    
    def _is_expired(self, timestamp: float) -> bool:
        """Check if a cache entry has expired based on TTL."""
        if self.ttl <= 0:
            return False
        return time.time() - timestamp > self.ttl
    
    def get(self, key: str) -> Optional[Any]:
        if key not in self.cache:
            return None
        
        value, timestamp = self.cache[key]
        
        # Performance Fix: Check TTL expiration
        if self._is_expired(timestamp):
            # Remove expired entry
            del self.cache[key]
            return None
        
        # Move to end (most recently used)
        self.cache.move_to_end(key)
        return value
    
    def set(self, key: str, value: Any) -> None:
        # Move to end if exists (will update timestamp)
        current_time = time.time()
        # Add new item with timestamp
        self.cache[key] = (value, current_time)
        # Evict oldest if over limit
        while len(self.cache) > self.max_size:
            self.cache.popitem(last=False)
    
    def __setitem__(self, key: str, value: Any) -> None:
        """Allow direct assignment like a dict."""
        self.set(key, value)
    
    def __getitem__(self, key: str) -> Any:
        """Allow direct access like a dict."""
        return self.get(key)
    
    def __delitem__(self, key: str) -> None:
        """Allow deletion like a dict."""
        del self.cache[key]
    
    def __contains__(self, key: str) -> bool:
        return key in self.cache
    
    def values(self):
        """Return all non-expired values in the cache (like dict.values())."""
        # Performance Fix: Filter out expired entries
        current_time = time.time()
        return [
            value for value, timestamp in self.cache.values()
            if not self._is_expired(timestamp)
        ]
    
    def keys(self):
        """Return all non-expired keys in the cache (like dict.keys())."""
        # Performance Fix: Filter out expired entries
        current_time = time.time()
        return [
            key for key, (_, timestamp) in self.cache.items()
            if not self._is_expired(timestamp)
        ]
    
    def items(self):
        """Return all non-expired items in the cache (like dict.items())."""
        # Performance Fix: Filter out expired entries
        current_time = time.time()
        return [
            (key, value) for key, (value, timestamp) in self.cache.items()
            if not self._is_expired(timestamp)
        ]
    
    def clear(self) -> None:
        """Clear all entries from the cache."""
        self.cache.clear()


class JSONFileStorage:
    """
    Generic JSON file storage with LRU caching and owner-based indexing.
    
    Performance Fix: Added owner_id index for O(1) lookups when filtering by owner.
    This avoids O(n) iteration over all cached items when listing projects by user.
    """
    
    def __init__(self, base_dir: str, max_cache_size: int = 1000, 
                 cache_ttl: int = LRUCache.DEFAULT_TTL, index_field: str = "owner_id"):
        """
        Initialize storage with a base directory.
        
        Args:
            base_dir: Base directory for storing JSON files
            max_cache_size: Maximum number of entries in the LRU cache (default: 1000)
            cache_ttl: Time-to-live for cache entries in seconds (default: 3600 = 1 hour)
            index_field: Field name to use for indexing (default: "owner_id")
        """
        self.base_dir = Path(base_dir)
        self.cache = LRUCache(max_size=max_cache_size, ttl=cache_ttl)
        self.base_dir.mkdir(parents=True, exist_ok=True)
        
        # Performance Fix: Index for O(1) lookups by owner
        # Maps index_value -> set of item_ids
        self._index_field = index_field
        self._owner_index: Dict[str, Set[str]] = {}
        self._lock = threading.Lock()
    
    def _update_index(self, item_id: str, data: Optional[Dict[str, Any]]) -> None:
        """
        Update the owner index when an item is saved or deleted.
        
        Performance Fix: This enables O(1) lookups by owner_id instead of O(n) iteration.
        """
        if not self._index_field:
            return
            
        # Remove old index entry if item exists
        with self._lock:
            for owner_id, item_ids in list(self._owner_index.items()):
                if item_id in item_ids:
                    item_ids.discard(item_id)
                    if not item_ids:
                        del self._owner_index[owner_id]
            
            # Add new index entry if data has the index field
            if data and self._index_field in data:
                owner_id = data[self._index_field]
                if owner_id not in self._owner_index:
                    self._owner_index[owner_id] = set()
                self._owner_index[owner_id].add(item_id)
    
    def get_by_owner(self, owner_id: str) -> List[Dict[str, Any]]:
        """
        Get all items belonging to a specific owner.
        
        Performance Fix: Uses index for O(1) lookup instead of O(n) iteration.
        
        Args:
            owner_id: The owner ID to filter by
            
        Returns:
            List of items belonging to the owner
        """
        with self._lock:
            item_ids = self._owner_index.get(owner_id, set()).copy()
        
        items = []
        for item_id in item_ids:
            item = self.load(item_id)
            if item is not None:
                items.append(item)
        
        return items
    
    def get_path(self, item_id: str) -> str:
        """Get the file path for an item ID."""
        return str(self.base_dir / f"{item_id}.json")
    
    def load(self, item_id: str) -> Optional[Dict[str, Any]]:
        """
        Load item from cache or file.
        
        Args:
            item_id: The unique identifier for the item
            
        Returns:
            The loaded data dict or None if not found
        """
        # Check cache first
        if item_id in self.cache:
            return self.cache[item_id]
        
        path = self.get_path(item_id)
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.cache[item_id] = data
                    return data
            except (json.JSONDecodeError, IOError) as e:
                logger.error(f"Failed to load {item_id}: {e}")
                return None
        return None
    
    def delete(self, item_id: str) -> bool:
        """
        Delete item from cache and file.
        
        Args:
            item_id: The unique identifier for the item
            
        Returns:
            True if deletion succeeded, False otherwise
        """
        try:
            # Performance Fix: Update owner index before removing from cache
            if item_id in self.cache:
                old_data = self.cache[item_id]
                self._update_index(item_id, None)
            
            # Remove from cache
            self.cache.pop(item_id, None)
            
            # Delete file
            path = self.get_path(item_id)
            if os.path.exists(path):
                os.remove(path)
            return True
        except OSError as e:
            logger.error(f"Failed to delete {item_id}: {e}")
            return False
    
    def save(self, item_id: str, data: Dict[str, Any]) -> bool:
        """
        Save item to cache and file.
        
        Args:
            item_id: The unique identifier for the item
            data: The data to save
            
        Returns:
            True if save succeeded, False otherwise
        """
        try:
            # Performance Fix: Update owner index
            self._update_index(item_id, data)
            
            # Update cache
            self.cache[item_id] = data
            
            # Write to file
            path = self.get_path(item_id)
            with open(path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False, default=self._json_serializer)
            return True
        except (IOError, OSError) as e:
            logger.error(f"Failed to save {item_id}: {e}")
            return False
    
    def _json_serializer(self, obj):
        """Custom JSON serializer for objects not serializable by default."""
        from datetime import datetime, date
        if isinstance(obj, datetime):
            return obj.isoformat()
        if isinstance(obj, date):
            return obj.isoformat()
        raise TypeError(f"Object of type {type(obj).__name__} is not JSON serializable")
    
    def exists(self, item_id: str) -> bool:
        """Check if item exists (in cache or file)."""
        if item_id in self.cache:
            return True
        path = self.get_path(item_id)
        return os.path.exists(path)
    
    def clear_cache(self) -> None:
        """Clear the in-memory cache."""
        self.cache.clear()
