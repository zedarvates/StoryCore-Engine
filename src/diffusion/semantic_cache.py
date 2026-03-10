import hashlib
import time
import logging
from typing import Dict, Optional

logger = logging.getLogger("SemanticCache")

class SemanticCache:
    """
    Cache for diffusion-based text generation.
    Stores results indexed by prompt hash to avoid redundant computation.
    """
    def __init__(self, max_size: int = 1000):
        self._cache: Dict[str, Dict] = {}
        self.max_size = max_size
        self._hits = 0
        self._misses = 0

    def _get_hash(self, prompt: str) -> str:
        return hashlib.sha256(prompt.strip().lower().encode()).hexdigest()

    def get(self, prompt: str) -> Optional[str]:
        prompt_hash = self._get_hash(prompt)
        if prompt_hash in self._cache:
            entry = self._cache[prompt_hash]
            entry["last_access"] = time.time()
            self._hits += 1
            logger.debug(f"Cache HIT for prompt hash: {prompt_hash[:8]}")
            return entry["text"]
        
        self._misses += 1
        return None

    def set(self, prompt: str, text: string):
        if len(self._cache) >= self.max_size:
            # Evict least recently used (approximate)
            self._evict_lru()
            
        prompt_hash = self._get_hash(prompt)
        self._cache[prompt_hash] = {
            "text": text,
            "timestamp": time.time(),
            "last_access": time.time()
        }
        logger.debug(f"Cache SET for prompt hash: {prompt_hash[:8]}")

    def _evict_lru(self):
        if not self._cache:
            return
        lru_key = min(self._cache.keys(), key=lambda k: self._cache[k]["last_access"])
        del self._cache[lru_key]
        logger.info(f"Evicted LRU key from cache: {lru_key[:8]}")

    def get_stats(self):
        return {
            "size": len(self._cache),
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": self._hits / (self._hits + self._misses) if (self._hits + self._misses) > 0 else 0
        }

# Global cache instance
cache_instance = SemanticCache()
