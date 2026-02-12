"""
StoryCore-Engine Shared Storage Utilities

This module provides centralized file storage operations with in-memory caching
for JSON-based data persistence across the application.

Features:
- Generic JSON file storage with LRU caching
- Automatic directory creation
- Error handling and logging
- Thread-safe operations
"""

import os
import json
import logging
from collections import OrderedDict
from typing import Dict, Any, Optional
from pathlib import Path

logger = logging.getLogger(__name__)


class LRUCache:
    """Simple LRU Cache implementation."""
    
    def __init__(self, max_size: int = 1000):
        if max_size <= 0:
            max_size = float('inf')
        self.max_size = max_size
        self.cache: OrderedDict[str, Any] = OrderedDict()
    
    def get(self, key: str) -> Optional[Any]:
        if key not in self.cache:
            return None
        # Move to end (most recently used)
        self.cache.move_to_end(key)
        return self.cache[key]
    
    def set(self, key: str, value: Any) -> None:
        # Move to end if exists
        if key in self.cache:
            self.cache.move_to_end(key)
        # Add new item
        self.cache[key] = value
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
        """Return all values in the cache (like dict.values())."""
        return self.cache.values()
    
    def keys(self):
        """Return all keys in the cache (like dict.keys())."""
        return self.cache.keys()
    
    def items(self):
        """Return all items in the cache (like dict.items())."""
        return self.cache.items()


class JSONFileStorage:
    """Generic JSON file storage with LRU caching."""
    
    def __init__(self, base_dir: str, max_cache_size: int = 1000):
        """
        Initialize storage with a base directory.
        
        Args:
            base_dir: Base directory for storing JSON files
            max_cache_size: Maximum number of entries in the LRU cache (default: 1000)
        """
        self.base_dir = Path(base_dir)
        self.cache = LRUCache(max_size=max_cache_size)
        self.base_dir.mkdir(parents=True, exist_ok=True)
    
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
