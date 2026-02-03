"""
Cache Integration Example

This module demonstrates how to integrate caching into the StoryCore API system.
"""

import logging
from pathlib import Path
import sys

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from api.config import APIConfig
from api.router import APIRouter
from api.services.cache import CacheService
from api.middleware import (
    create_cache_middleware,
    create_cache_invalidation_middleware,
    create_logging_middleware,
)
from api.models import RequestContext


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


def setup_api_with_caching():
    """
    Set up the API system with caching enabled.
    
    This demonstrates the complete integration of caching into the API router.
    """
    # Create configuration
    config = APIConfig(
        cache_ttl_seconds=300,  # 5 minutes default
        log_level="INFO",
    )
    
    # Create router
    router = APIRouter(config)
    
    # Create cache service
    cache_service = CacheService(default_ttl=config.cache_ttl_seconds)
    
    # Add middleware in order (they execute in the order added)
    # 1. Logging middleware (logs all requests)
    router.add_middleware(create_logging_middleware(config.version))
    
    # 2. Cache invalidation middleware (invalidates cache on mutations)
    router.add_middleware(create_cache_invalidation_middleware(cache_service))
    
    # 3. Cache middleware (serves cached responses)
    router.add_middleware(create_cache_middleware(cache_service, config.version))
    
    logger.info("API system initialized with caching enabled")
    
    return router, cache_service


def demonstrate_caching():
    """Demonstrate caching behavior with example requests."""
    
    logger.info("=" * 60)
    logger.info("Cache Integration Demonstration")
    logger.info("=" * 60)
    
    # Setup
    router, cache = setup_api_with_caching()
    
    # Register a simple test endpoint
    def test_list_handler(params, context):
        """Simulated list endpoint that would be cached."""
        from api.models import APIResponse, ResponseMetadata
        from datetime import datetime
        
        logger.info(f"Handler executed for {context.endpoint}")
        
        response = APIResponse(
            status="success",
            data={
                "items": ["item1", "item2", "item3"],
                "count": 3,
            },
            metadata=ResponseMetadata(
                request_id=context.request_id,
                timestamp=datetime.now(),
                duration_ms=context.get_duration_ms(),
                api_version="v1",
            ),
        )
        
        # Cache the response if caching is enabled
        if hasattr(context, "cache_key"):
            cache.set(context.cache_key, response, ttl=context.cache_ttl)
            logger.info(f"Response cached with key: {context.cache_key}")
        
        return response
    
    def test_create_handler(params, context):
        """Simulated create endpoint that invalidates cache."""
        from api.models import APIResponse, ResponseMetadata
        from datetime import datetime
        
        logger.info(f"Handler executed for {context.endpoint}")
        
        return APIResponse(
            status="success",
            data={
                "created": True,
                "item_id": "new_item",
            },
            metadata=ResponseMetadata(
                request_id=context.request_id,
                timestamp=datetime.now(),
                duration_ms=context.get_duration_ms(),
                api_version="v1",
            ),
        )
    
    # Register endpoints
    router.register_endpoint(
        path="test.items.list",
        method="GET",
        handler=test_list_handler,
        description="List items (cacheable)",
    )
    
    router.register_endpoint(
        path="test.items.create",
        method="POST",
        handler=test_create_handler,
        description="Create item (invalidates cache)",
    )
    
    # Demonstration
    logger.info("\n1. First request to list endpoint (cache miss)")
    logger.info("-" * 60)
    response1 = router.route_request("test.items.list", "GET", {})
    logger.info(f"Response status: {response1.status}")
    logger.info(f"Response data: {response1.data}")
    
    logger.info("\n2. Second request to list endpoint (cache hit)")
    logger.info("-" * 60)
    response2 = router.route_request("test.items.list", "GET", {})
    logger.info(f"Response status: {response2.status}")
    logger.info(f"Response data: {response2.data}")
    logger.info("Note: Handler was NOT executed (served from cache)")
    
    logger.info("\n3. Cache statistics")
    logger.info("-" * 60)
    stats = cache.get_stats()
    logger.info(f"Cache size: {stats['size']}")
    logger.info(f"Cache hits: {stats['hits']}")
    logger.info(f"Cache misses: {stats['misses']}")
    logger.info(f"Hit rate: {stats['hit_rate']:.2%}")
    
    logger.info("\n4. Create operation (invalidates cache)")
    logger.info("-" * 60)
    response3 = router.route_request("test.items.create", "POST", {"name": "new_item"})
    logger.info(f"Response status: {response3.status}")
    logger.info("Cache invalidated for test.items.* endpoints")
    
    logger.info("\n5. Request to list endpoint after invalidation (cache miss)")
    logger.info("-" * 60)
    response4 = router.route_request("test.items.list", "GET", {})
    logger.info(f"Response status: {response4.status}")
    logger.info("Note: Handler WAS executed (cache was invalidated)")
    
    logger.info("\n6. Final cache statistics")
    logger.info("-" * 60)
    stats = cache.get_stats()
    logger.info(f"Cache size: {stats['size']}")
    logger.info(f"Cache hits: {stats['hits']}")
    logger.info(f"Cache misses: {stats['misses']}")
    logger.info(f"Hit rate: {stats['hit_rate']:.2%}")
    
    logger.info("\n" + "=" * 60)
    logger.info("Demonstration complete!")
    logger.info("=" * 60)


def demonstrate_ttl_configuration():
    """Demonstrate TTL configuration for different endpoint types."""
    from api.services.cache import get_ttl_for_endpoint
    
    logger.info("\n" + "=" * 60)
    logger.info("TTL Configuration Demonstration")
    logger.info("=" * 60)
    
    endpoints = [
        "storycore.pipeline.list",
        "storycore.pipeline.status",
        "storycore.prompt.get",
        "storycore.knowledge.search",
        "storycore.api.schema",
        "storycore.narration.generate",
    ]
    
    logger.info("\nEndpoint TTL Configuration:")
    logger.info("-" * 60)
    for endpoint in endpoints:
        ttl = get_ttl_for_endpoint(endpoint)
        logger.info(f"{endpoint:40} -> {ttl:4} seconds ({ttl/60:.1f} min)")
    
    logger.info("\n" + "=" * 60)


def demonstrate_cache_patterns():
    """Demonstrate common caching patterns."""
    
    logger.info("\n" + "=" * 60)
    logger.info("Common Caching Patterns")
    logger.info("=" * 60)
    
    cache = CacheService()
    
    # Pattern 1: Simple key-value caching
    logger.info("\n1. Simple Key-Value Caching")
    logger.info("-" * 60)
    cache.set("user:123:profile", {"name": "John", "email": "john@example.com"})
    profile = cache.get("user:123:profile")
    logger.info(f"Cached profile: {profile}")
    
    # Pattern 2: Parameterized caching
    logger.info("\n2. Parameterized Caching")
    logger.info("-" * 60)
    params = {"project_name": "demo", "stage": "grid"}
    cache_key = CacheService.generate_cache_key("storycore.pipeline.status", params)
    cache.set(cache_key, {"status": "running", "progress": 0.5})
    logger.info(f"Cache key: {cache_key}")
    logger.info(f"Cached data: {cache.get(cache_key)}")
    
    # Pattern 3: User-specific caching
    logger.info("\n3. User-Specific Caching")
    logger.info("-" * 60)
    user_key = CacheService.generate_cache_key(
        "storycore.prompt.list",
        {},
        user_id="user123"
    )
    cache.set(user_key, {"prompts": ["prompt1", "prompt2"]})
    logger.info(f"User-specific cache key: {user_key}")
    
    # Pattern 4: Pattern-based invalidation
    logger.info("\n4. Pattern-Based Invalidation")
    logger.info("-" * 60)
    # Cache multiple related entries
    cache.set("storycore.pipeline.status:proj1", {"status": "running"})
    cache.set("storycore.pipeline.list:proj1", {"projects": []})
    cache.set("storycore.narration.generate:proj1", {"text": "story"})
    
    # Invalidate all pipeline entries
    pattern = CacheService.get_invalidation_pattern("storycore.pipeline.*")
    count = cache.invalidate(pattern)
    logger.info(f"Invalidation pattern: {pattern}")
    logger.info(f"Entries invalidated: {count}")
    
    # Pattern 5: TTL-based expiration
    logger.info("\n5. TTL-Based Expiration")
    logger.info("-" * 60)
    cache.set("short_lived", "data", ttl=2)  # 2 seconds
    logger.info("Set short-lived cache entry (TTL: 2s)")
    logger.info(f"Immediate get: {cache.get('short_lived')}")
    
    import time
    time.sleep(2.5)
    logger.info(f"After 2.5s: {cache.get('short_lived')}")
    
    logger.info("\n" + "=" * 60)


if __name__ == "__main__":
    # Run demonstrations
    demonstrate_caching()
    demonstrate_ttl_configuration()
    demonstrate_cache_patterns()
