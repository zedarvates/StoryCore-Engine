"""
Integration tests for API caching functionality.

Tests cache behavior for metadata endpoints and cache invalidation on mutations.
"""

import pytest
import time
from datetime import datetime
from pathlib import Path
import sys

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent / "src"))

from api.services.cache import CacheService, get_ttl_for_endpoint
from api.middleware import create_cache_middleware, create_cache_invalidation_middleware
from api.models import RequestContext, APIResponse, ResponseMetadata
from api.config import APIConfig
from api.router import APIRouter
from api.base_handler import BaseAPIHandler


class TestCacheService:
    """Test the CacheService class."""
    
    def test_cache_set_and_get(self):
        """Test basic cache set and get operations."""
        cache = CacheService(default_ttl=300)
        
        # Set a value
        cache.set("test_key", {"data": "test_value"})
        
        # Get the value
        result = cache.get("test_key")
        assert result is not None
        assert result["data"] == "test_value"
    
    def test_cache_miss(self):
        """Test cache miss returns None."""
        cache = CacheService()
        
        result = cache.get("nonexistent_key")
        assert result is None
    
    def test_cache_expiration(self):
        """Test that cache entries expire after TTL."""
        cache = CacheService(default_ttl=1)  # 1 second TTL
        
        # Set a value
        cache.set("test_key", {"data": "test_value"})
        
        # Should be available immediately
        result = cache.get("test_key")
        assert result is not None
        
        # Wait for expiration
        time.sleep(1.5)
        
        # Should be expired now
        result = cache.get("test_key")
        assert result is None
    
    def test_cache_delete(self):
        """Test cache entry deletion."""
        cache = CacheService()
        
        # Set a value
        cache.set("test_key", {"data": "test_value"})
        
        # Delete it
        deleted = cache.delete("test_key")
        assert deleted is True
        
        # Should not be available
        result = cache.get("test_key")
        assert result is None
        
        # Deleting again should return False
        deleted = cache.delete("test_key")
        assert deleted is False
    
    def test_cache_invalidation_pattern(self):
        """Test pattern-based cache invalidation."""
        cache = CacheService()
        
        # Set multiple values
        cache.set("storycore.pipeline.status:abc123", {"status": "running"})
        cache.set("storycore.pipeline.list:def456", {"projects": []})
        cache.set("storycore.narration.generate:ghi789", {"text": "story"})
        
        # Invalidate all pipeline entries
        count = cache.invalidate(r"storycore\.pipeline\..*")
        assert count == 2
        
        # Pipeline entries should be gone
        assert cache.get("storycore.pipeline.status:abc123") is None
        assert cache.get("storycore.pipeline.list:def456") is None
        
        # Narration entry should still exist
        assert cache.get("storycore.narration.generate:ghi789") is not None
    
    def test_cache_clear(self):
        """Test clearing all cache entries."""
        cache = CacheService()
        
        # Set multiple values
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        cache.set("key3", "value3")
        
        # Clear all
        cache.clear()
        
        # All should be gone
        assert cache.get("key1") is None
        assert cache.get("key2") is None
        assert cache.get("key3") is None
    
    def test_cache_stats(self):
        """Test cache statistics tracking."""
        cache = CacheService()
        
        # Set some values
        cache.set("key1", "value1")
        cache.set("key2", "value2")
        
        # Generate hits and misses
        cache.get("key1")  # Hit
        cache.get("key1")  # Hit
        cache.get("key3")  # Miss
        
        stats = cache.get_stats()
        assert stats["size"] == 2
        assert stats["hits"] == 2
        assert stats["misses"] == 1
        assert stats["hit_rate"] == 2/3
    
    def test_generate_cache_key(self):
        """Test cache key generation."""
        # Same params should generate same key
        key1 = CacheService.generate_cache_key(
            "storycore.pipeline.status",
            {"project_name": "test"},
        )
        key2 = CacheService.generate_cache_key(
            "storycore.pipeline.status",
            {"project_name": "test"},
        )
        assert key1 == key2
        
        # Different params should generate different keys
        key3 = CacheService.generate_cache_key(
            "storycore.pipeline.status",
            {"project_name": "other"},
        )
        assert key1 != key3
        
        # User-specific keys should be different
        key4 = CacheService.generate_cache_key(
            "storycore.pipeline.status",
            {"project_name": "test"},
            user_id="user123",
        )
        assert key1 != key4
    
    def test_cleanup_expired(self):
        """Test cleanup of expired entries."""
        cache = CacheService(default_ttl=1)
        
        # Set some values
        cache.set("key1", "value1")
        cache.set("key2", "value2", ttl=0)  # Never expires
        
        # Wait for expiration
        time.sleep(1.5)
        
        # Cleanup
        count = cache.cleanup_expired()
        assert count == 1
        
        # key1 should be gone, key2 should remain
        assert cache.get("key1") is None
        assert cache.get("key2") is not None


class TestCacheTTLConfiguration:
    """Test TTL configuration for different endpoint types."""
    
    def test_list_endpoint_ttl(self):
        """Test TTL for list endpoints."""
        ttl = get_ttl_for_endpoint("storycore.pipeline.list")
        assert ttl == 180  # 3 minutes
    
    def test_status_endpoint_ttl(self):
        """Test TTL for status endpoints."""
        ttl = get_ttl_for_endpoint("storycore.pipeline.status")
        assert ttl == 60  # 1 minute
    
    def test_get_endpoint_ttl(self):
        """Test TTL for get endpoints."""
        ttl = get_ttl_for_endpoint("storycore.prompt.get")
        assert ttl == 120  # 2 minutes
    
    def test_search_endpoint_ttl(self):
        """Test TTL for search endpoints."""
        ttl = get_ttl_for_endpoint("storycore.knowledge.search")
        assert ttl == 60  # 1 minute
    
    def test_schema_endpoint_ttl(self):
        """Test TTL for schema endpoints."""
        ttl = get_ttl_for_endpoint("storycore.api.schema")
        assert ttl == 3600  # 1 hour
    
    def test_default_ttl(self):
        """Test default TTL for unmatched endpoints."""
        ttl = get_ttl_for_endpoint("storycore.custom.endpoint")
        assert ttl == 300  # 5 minutes (default metadata)


class TestCacheMiddleware:
    """Test cache middleware integration."""
    
    def test_cache_middleware_cacheable_endpoint(self):
        """Test that cacheable endpoints use cache."""
        cache = CacheService()
        middleware = create_cache_middleware(cache)
        
        # Create context and params
        context = RequestContext(
            endpoint="storycore.pipeline.status",
            method="GET",
        )
        params = {"project_name": "test"}
        
        # First request - cache miss
        result = middleware(context, params)
        assert result is None  # Continue to handler
        assert hasattr(context, "cache_key")
        assert hasattr(context, "cache_ttl")
        
        # Simulate handler caching the response
        response = APIResponse(
            status="success",
            data={"status": "running"},
            metadata=ResponseMetadata(
                request_id=context.request_id,
                timestamp=datetime.now(),
                duration_ms=10.0,
                api_version="v1",
            ),
        )
        cache.set(context.cache_key, response, ttl=context.cache_ttl)
        
        # Second request - cache hit
        context2 = RequestContext(
            endpoint="storycore.pipeline.status",
            method="GET",
        )
        result = middleware(context2, params)
        assert result is not None  # Cached response returned
        assert result.status == "success"
        assert result.data["status"] == "running"
    
    def test_cache_middleware_non_cacheable_endpoint(self):
        """Test that non-cacheable endpoints bypass cache."""
        cache = CacheService()
        middleware = create_cache_middleware(cache)
        
        # Create context for mutation endpoint
        context = RequestContext(
            endpoint="storycore.pipeline.execute",
            method="POST",
        )
        params = {"project_name": "test"}
        
        # Should not use cache
        result = middleware(context, params)
        assert result is None
        assert not hasattr(context, "cache_key")


class TestCacheInvalidationMiddleware:
    """Test cache invalidation middleware."""
    
    def test_invalidation_on_create(self):
        """Test cache invalidation on create operations."""
        cache = CacheService()
        middleware = create_cache_invalidation_middleware(cache)
        
        # Cache some list results
        cache.set("storycore.prompt.list:abc123", {"prompts": []})
        cache.set("storycore.prompt.get:def456", {"prompt": "test"})
        
        # Create operation should invalidate prompt cache
        context = RequestContext(
            endpoint="storycore.prompt.create",
            method="POST",
        )
        params = {"name": "new_prompt"}
        
        result = middleware(context, params)
        assert result is None  # Continue to handler
        
        # Cache entries should be invalidated
        assert cache.get("storycore.prompt.list:abc123") is None
        assert cache.get("storycore.prompt.get:def456") is None
    
    def test_invalidation_on_update(self):
        """Test cache invalidation on update operations."""
        cache = CacheService()
        middleware = create_cache_invalidation_middleware(cache)
        
        # Cache some data
        cache.set("storycore.knowledge.search:abc123", {"results": []})
        cache.set("storycore.knowledge.get:def456", {"item": "test"})
        
        # Update operation should invalidate knowledge cache
        context = RequestContext(
            endpoint="storycore.knowledge.update",
            method="POST",
        )
        params = {"id": "item1", "data": {}}
        
        result = middleware(context, params)
        assert result is None
        
        # Cache entries should be invalidated
        assert cache.get("storycore.knowledge.search:abc123") is None
        assert cache.get("storycore.knowledge.get:def456") is None
    
    def test_invalidation_on_delete(self):
        """Test cache invalidation on delete operations."""
        cache = CacheService()
        middleware = create_cache_invalidation_middleware(cache)
        
        # Cache some data
        cache.set("storycore.storyboard.shot.list:abc123", {"shots": []})
        
        # Delete operation should invalidate storyboard cache
        context = RequestContext(
            endpoint="storycore.storyboard.shot.delete",
            method="POST",
        )
        params = {"shot_id": "shot1"}
        
        result = middleware(context, params)
        assert result is None
        
        # Cache should be invalidated
        assert cache.get("storycore.storyboard.shot.list:abc123") is None
    
    def test_no_invalidation_on_read(self):
        """Test that read operations don't invalidate cache."""
        cache = CacheService()
        middleware = create_cache_invalidation_middleware(cache)
        
        # Cache some data
        cache.set("storycore.pipeline.status:abc123", {"status": "running"})
        
        # Read operation should not invalidate
        context = RequestContext(
            endpoint="storycore.pipeline.status",
            method="GET",
        )
        params = {"project_name": "test"}
        
        result = middleware(context, params)
        assert result is None
        
        # Cache should still exist
        assert cache.get("storycore.pipeline.status:abc123") is not None


class TestEndToEndCaching:
    """Test end-to-end caching with router integration."""
    
    def test_full_cache_workflow(self):
        """Test complete caching workflow with router."""
        # Setup
        config = APIConfig()
        router = APIRouter(config)
        cache = CacheService()
        
        # Add cache middleware
        cache_mw = create_cache_middleware(cache)
        invalidation_mw = create_cache_invalidation_middleware(cache)
        router.add_middleware(invalidation_mw)
        router.add_middleware(cache_mw)
        
        # Create a simple handler
        class TestHandler(BaseAPIHandler):
            def __init__(self, config, cache_service):
                super().__init__(config, cache_service)
                self.call_count = 0
            
            def get_data(self, params, context):
                self.call_count += 1
                response = self.create_success_response(
                    {"data": "test_value", "call_count": self.call_count},
                    context,
                )
                return self.cache_response(response, context)
            
            def update_data(self, params, context):
                return self.create_success_response(
                    {"updated": True},
                    context,
                )
        
        handler = TestHandler(config, cache)
        
        # Register endpoints
        router.register_endpoint(
            path="test.data.get",
            method="GET",
            handler=handler.get_data,
        )
        router.register_endpoint(
            path="test.data.update",
            method="POST",
            handler=handler.update_data,
        )
        
        # First request - should hit handler
        response1 = router.route_request("test.data.get", "GET", {})
        assert response1.status == "success"
        assert response1.data["call_count"] == 1
        
        # Second request - should use cache
        response2 = router.route_request("test.data.get", "GET", {})
        assert response2.status == "success"
        assert response2.data["call_count"] == 1  # Same as first (cached)
        assert handler.call_count == 1  # Handler only called once
        
        # Update operation - should invalidate cache
        response3 = router.route_request("test.data.update", "POST", {})
        assert response3.status == "success"
        
        # Next get request - should hit handler again
        response4 = router.route_request("test.data.get", "GET", {})
        assert response4.status == "success"
        assert response4.data["call_count"] == 2  # New call
        assert handler.call_count == 2  # Handler called again


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
