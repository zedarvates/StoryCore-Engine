# API Caching System Guide

## Overview

The StoryCore API system includes a comprehensive caching layer that improves performance by caching responses from metadata endpoints and automatically invalidating cache entries when data is modified.

## Features

- **In-memory caching** with configurable TTL (Time-To-Live)
- **Automatic cache invalidation** on mutation operations
- **Pattern-based invalidation** for related cache entries
- **Per-endpoint TTL configuration** based on data volatility
- **Cache statistics** for monitoring hit rates and performance
- **Thread-safe operations** for concurrent access
- **User-specific caching** for personalized data

## Architecture

### Components

1. **CacheService** (`src/api/services/cache.py`)
   - Core caching functionality
   - Key-value storage with TTL
   - Pattern-based invalidation
   - Statistics tracking

2. **Cache Middleware** (`src/api/middleware.py`)
   - `create_cache_middleware()` - Serves cached responses
   - `create_cache_invalidation_middleware()` - Invalidates cache on mutations

3. **Base Handler Integration** (`src/api/base_handler.py`)
   - `cache_response()` - Helper method for handlers to cache responses

### Middleware Flow

```
Request → Logging MW → Invalidation MW → Cache MW → Handler
                            ↓               ↓
                    Invalidate cache   Check cache
                    on mutations       Return if hit
                                           ↓
                                      Handler executes
                                           ↓
                                      Cache response
```

## Cacheable Endpoints

The following endpoint patterns are automatically cached:

- **List operations**: `*.list` (TTL: 3 minutes)
- **Status checks**: `*.status` (TTL: 1 minute)
- **Get operations**: `*.get` (TTL: 2 minutes)
- **Search operations**: `*.search` (TTL: 1 minute)
- **Analysis operations**: `*.analyze` (TTL: 2 minutes)
- **Schema retrieval**: `*.schema` (TTL: 1 hour)
- **Configuration**: `*.config` (TTL: 10 minutes)
- **Health checks**: `*.health.check` (TTL: 5 minutes)
- **Metrics**: `*.metrics.get` (TTL: 5 minutes)

## Cache Invalidation

Cache entries are automatically invalidated when mutation operations occur:

### Mutation Operations

- **Create**: `*.create` - Invalidates all related list/get operations
- **Update**: `*.update` - Invalidates all related operations
- **Delete**: `*.delete` - Invalidates all related operations
- **Add**: `*.add` - Invalidates parent resource cache
- **Remove**: `*.remove` - Invalidates parent resource cache
- **Clear**: `*.clear` - Invalidates all related cache
- **Execute**: `*.execute` - Invalidates pipeline status cache
- **Generate**: `*.generate` - Invalidates related metadata

### Invalidation Patterns

When a mutation occurs on `storycore.prompt.create`, the following cache entries are invalidated:

- `storycore.prompt.list:*` (all list results)
- `storycore.prompt.get:*` (all individual prompts)
- `storycore.prompt.search:*` (all search results)

## Usage Examples

### Basic Setup

```python
from api.config import APIConfig
from api.router import APIRouter
from api.services.cache import CacheService
from api.middleware import (
    create_cache_middleware,
    create_cache_invalidation_middleware,
)

# Create configuration
config = APIConfig(cache_ttl_seconds=300)

# Create router and cache service
router = APIRouter(config)
cache_service = CacheService(default_ttl=config.cache_ttl_seconds)

# Add middleware (order matters!)
router.add_middleware(create_cache_invalidation_middleware(cache_service))
router.add_middleware(create_cache_middleware(cache_service, config.version))
```

### Handler Integration

```python
from api.base_handler import BaseAPIHandler

class MyHandler(BaseAPIHandler):
    def __init__(self, config, cache_service):
        super().__init__(config, cache_service)
    
    def list_items(self, params, context):
        """List endpoint - automatically cached."""
        # Create response
        response = self.create_success_response(
            {"items": ["item1", "item2"]},
            context,
        )
        
        # Cache the response (if caching is enabled for this endpoint)
        return self.cache_response(response, context)
    
    def create_item(self, params, context):
        """Create endpoint - automatically invalidates cache."""
        # Create the item
        item_id = self._create_item(params)
        
        # Return response (cache invalidation happens automatically)
        return self.create_success_response(
            {"item_id": item_id},
            context,
        )
```

### Manual Cache Operations

```python
# Get cache statistics
stats = cache_service.get_stats()
print(f"Hit rate: {stats['hit_rate']:.2%}")
print(f"Cache size: {stats['size']}")

# Manual cache invalidation
cache_service.invalidate(r"storycore\.pipeline\..*")

# Clear all cache
cache_service.clear()

# Cleanup expired entries
cache_service.cleanup_expired()
```

### Custom Cache Keys

```python
from api.services.cache import CacheService

# Generate cache key for specific parameters
cache_key = CacheService.generate_cache_key(
    endpoint="storycore.pipeline.status",
    params={"project_name": "demo"},
    user_id="user123",  # Optional: for user-specific caching
)

# Set custom cache entry
cache_service.set(cache_key, response_data, ttl=120)

# Get cached entry
cached_data = cache_service.get(cache_key)
```

## TTL Configuration

### Default TTL Values

| Endpoint Type | TTL | Use Case |
|--------------|-----|----------|
| List operations | 3 minutes | Frequently changing data |
| Status checks | 1 minute | Real-time status |
| Get operations | 2 minutes | Individual resources |
| Search operations | 1 minute | Dynamic search results |
| Analysis operations | 2 minutes | Computed results |
| Schema retrieval | 1 hour | Static metadata |
| Configuration | 10 minutes | Semi-static config |

### Custom TTL

```python
from api.services.cache import CACHE_TTL_CONFIG

# Modify default TTL values
CACHE_TTL_CONFIG["list"] = 300  # 5 minutes
CACHE_TTL_CONFIG["status"] = 30  # 30 seconds

# Or set custom TTL per request
cache_service.set(cache_key, data, ttl=600)  # 10 minutes
```

## Performance Considerations

### Cache Hit Rate

Monitor cache hit rate to ensure caching is effective:

```python
stats = cache_service.get_stats()
if stats['hit_rate'] < 0.5:
    # Consider increasing TTL or reviewing cacheable endpoints
    logger.warning(f"Low cache hit rate: {stats['hit_rate']:.2%}")
```

### Memory Usage

The cache is in-memory, so monitor size:

```python
stats = cache_service.get_stats()
if stats['size'] > 10000:
    # Consider clearing old entries or reducing TTL
    cache_service.cleanup_expired()
```

### Cache Warming

Pre-populate cache for frequently accessed data:

```python
# Warm cache on startup
for project in get_active_projects():
    cache_key = CacheService.generate_cache_key(
        "storycore.pipeline.status",
        {"project_name": project.name},
    )
    status = get_project_status(project)
    cache_service.set(cache_key, status, ttl=60)
```

## Testing

### Unit Tests

```python
def test_cache_hit():
    cache = CacheService()
    cache.set("key", "value")
    assert cache.get("key") == "value"

def test_cache_expiration():
    cache = CacheService(default_ttl=1)
    cache.set("key", "value")
    time.sleep(1.5)
    assert cache.get("key") is None
```

### Integration Tests

```python
def test_endpoint_caching():
    # First request - cache miss
    response1 = router.route_request("test.list", "GET", {})
    
    # Second request - cache hit
    response2 = router.route_request("test.list", "GET", {})
    
    # Verify same response
    assert response1.data == response2.data
```

## Monitoring

### Cache Metrics

Track these metrics for production monitoring:

- **Hit rate**: Percentage of requests served from cache
- **Miss rate**: Percentage of requests that hit the handler
- **Cache size**: Number of entries in cache
- **Expired entries**: Number of expired but not cleaned entries

### Logging

Cache operations are logged at DEBUG level:

```
DEBUG - Cache hit: storycore.pipeline.status:abc123
DEBUG - Cache miss: storycore.prompt.list:def456
INFO - Cache invalidated: 5 entries matching 'storycore.prompt.*'
```

## Best Practices

1. **Use appropriate TTL**: Balance freshness vs. performance
2. **Monitor hit rates**: Ensure caching is effective
3. **Invalidate proactively**: Clear cache on mutations
4. **Test cache behavior**: Verify cache hit/miss scenarios
5. **Handle cache failures gracefully**: System should work without cache
6. **Use user-specific keys**: For personalized data
7. **Clean up regularly**: Remove expired entries periodically

## Troubleshooting

### Low Hit Rate

**Problem**: Cache hit rate is below 50%

**Solutions**:
- Increase TTL for stable data
- Review which endpoints are cacheable
- Check if cache is being invalidated too frequently

### Stale Data

**Problem**: Cached data is outdated

**Solutions**:
- Reduce TTL for volatile data
- Ensure mutation operations invalidate cache
- Add manual invalidation where needed

### Memory Issues

**Problem**: Cache consuming too much memory

**Solutions**:
- Reduce TTL to expire entries faster
- Run cleanup_expired() periodically
- Limit cache size with eviction policy

## API Reference

### CacheService

```python
class CacheService:
    def __init__(self, default_ttl: int = 300)
    def get(self, key: str) -> Optional[Any]
    def set(self, key: str, value: Any, ttl: Optional[int] = None)
    def delete(self, key: str) -> bool
    def invalidate(self, pattern: str) -> int
    def clear(self) -> None
    def get_stats(self) -> Dict[str, Any]
    def cleanup_expired(self) -> int
    
    @staticmethod
    def generate_cache_key(
        endpoint: str,
        params: Dict[str, Any],
        user_id: Optional[str] = None,
    ) -> str
    
    @staticmethod
    def get_invalidation_pattern(
        endpoint: str,
        resource_type: Optional[str] = None,
        resource_id: Optional[str] = None,
    ) -> str
```

### Middleware Functions

```python
def create_cache_middleware(
    cache_service: CacheService,
    api_version: str = "v1",
) -> Middleware

def create_cache_invalidation_middleware(
    cache_service: CacheService,
) -> Middleware
```

### Helper Functions

```python
def get_ttl_for_endpoint(endpoint: str) -> int
```

## Examples

See `src/api/services/cache_integration_example.py` for complete working examples.

Run the example:

```bash
python src/api/services/cache_integration_example.py
```

## Related Documentation

- [API Architecture](design.md)
- [Middleware Guide](middleware.py)
- [Performance Requirements](requirements.md#requirement-18)
