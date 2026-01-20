# Thumbnail Cache System

## Overview

The Thumbnail Cache System provides a high-performance, two-tier caching solution for video thumbnails with LRU (Least Recently Used) eviction policy and persistent storage.

## Architecture

### Two-Tier Cache Design

1. **Memory Cache (Tier 1)**
   - Fast access with Map-based storage
   - LRU eviction policy
   - Configurable size limit (default: 100 MB)
   - Validates: Requirements 5.1, 5.2, 5.3

2. **Disk Cache (Tier 2)**
   - Persistent storage using IndexedDB
   - Survives page reloads
   - Configurable size limit (default: 500 MB)
   - Validates: Requirement 5.8

### Key Features

- ✅ **LRU Eviction**: Automatically removes least recently used items when cache is full
- ✅ **Intelligent Preloading**: Preloads adjacent thumbnails for smooth scrubbing
- ✅ **Quality Levels**: Supports low, medium, and high quality thumbnails
- ✅ **Error Handling**: Graceful handling of quota exceeded and loading errors
- ✅ **React Integration**: Custom hooks for easy component integration
- ✅ **Performance Monitoring**: Built-in statistics and monitoring

## Usage

### Basic Usage with Hook

```typescript
import { useThumbnailCache } from '@/hooks/useThumbnailCache';

function VideoThumbnail({ videoUrl, time }) {
  const { thumbnailUrl, isLoading, error } = useThumbnailCache(videoUrl, time, {
    quality: 'medium',
    preloadAdjacent: true,
    framerate: 30
  });

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  
  return <img src={thumbnailUrl} alt="Video thumbnail" />;
}
```

### Direct Cache Access

```typescript
import { ThumbnailCache } from '@/services/ThumbnailCache';

const cache = ThumbnailCache.getInstance();

// Get thumbnail
const blob = await cache.get(videoUrl, time, 'medium');

// Set thumbnail
await cache.set(videoUrl, time, blob, 'medium');

// Preload adjacent thumbnails
await cache.preloadAdjacent(videoUrl, currentTime, 30, 'medium');

// Get cache statistics
const stats = cache.getStats();
console.log(`Memory usage: ${stats.memoryUsage}%`);
```

### Preloading Multiple Thumbnails

```typescript
import { usePreloadThumbnails } from '@/hooks/useThumbnailCache';

function TimelinePreloader({ videoUrl, times }) {
  const { isPreloading, progress } = usePreloadThumbnails(videoUrl, times, 'medium');

  return (
    <div>
      {isPreloading && <ProgressBar value={progress} />}
    </div>
  );
}
```

### Cache Statistics

```typescript
import { useCacheStats } from '@/hooks/useThumbnailCache';

function CacheMonitor() {
  const { stats, clearCache } = useCacheStats();

  return (
    <div>
      <p>Memory: {stats.memorySize} bytes</p>
      <p>Usage: {stats.memoryUsage}%</p>
      <p>Items: {stats.memoryCount}</p>
      <button onClick={clearCache}>Clear Cache</button>
    </div>
  );
}
```

## Configuration

### Cache Configuration

```typescript
const config: ThumbnailCacheConfig = {
  maxMemorySize: 100,      // MB - Memory cache limit
  maxDiskSize: 500,        // MB - Disk cache limit
  quality: 'medium',       // Default quality level
  preloadDistance: 5       // Number of adjacent thumbnails to preload
};

const cache = ThumbnailCache.getInstance(config);
```

### Quality Levels

| Quality | Resolution | Use Case |
|---------|-----------|----------|
| `low` | 160x90 | Timeline scrubbing, quick previews |
| `medium` | 320x180 | Standard thumbnails, hover previews |
| `high` | 640x360 | Detailed inspection, full-screen previews |

## Implementation Details

### LRU Eviction Algorithm

The cache implements a true LRU eviction policy:

1. Each cache entry tracks `lastAccessed` timestamp
2. When cache is full, the entry with oldest `lastAccessed` is evicted
3. Accessing an entry updates its `lastAccessed` timestamp
4. Eviction continues until there's space for the new entry

**Validates: Requirement 5.3**

```typescript
private evictLRU(): void {
  let oldestKey: string | null = null;
  let oldestTime = Infinity;

  for (const [key, entry] of this.memoryCache.entries()) {
    if (entry.lastAccessed < oldestTime) {
      oldestTime = entry.lastAccessed;
      oldestKey = key;
    }
  }

  if (oldestKey) {
    const entry = this.memoryCache.get(oldestKey)!;
    this.currentMemorySize -= entry.size;
    this.memoryCache.delete(oldestKey);
  }
}
```

### Intelligent Preloading

The cache implements smart preloading strategies:

1. **Adjacent Preloading**: Preloads thumbnails before and after current position
2. **Priority Loading**: Visible thumbnails load first, adjacent thumbnails load in background
3. **Configurable Distance**: Control how many adjacent thumbnails to preload

**Validates: Requirements 5.5, 5.7**

```typescript
async preloadAdjacent(
  videoUrl: string,
  currentTime: number,
  framerate: number,
  quality?: string
): Promise<void> {
  const frameTime = 1 / framerate;
  const times: number[] = [];

  for (let i = 1; i <= this.config.preloadDistance; i++) {
    times.push(currentTime + (i * frameTime));
    times.push(Math.max(0, currentTime - (i * frameTime)));
  }

  await this.preload(videoUrl, times, quality);
}
```

### IndexedDB Persistence

The cache uses IndexedDB for persistent storage:

- **Database**: `ThumbnailCacheDB`
- **Object Store**: `thumbnails`
- **Indexes**: `lastAccessed`, `size`
- **Quota Handling**: Automatic cleanup when quota exceeded

**Validates: Requirement 5.8**

### Error Handling

The cache handles various error scenarios:

1. **Quota Exceeded**: Automatically removes oldest entries and retries
2. **Video Load Errors**: Returns null, allows retry
3. **IndexedDB Errors**: Falls back to memory-only cache
4. **Blob Generation Errors**: Propagates error to caller

## Performance Characteristics

### Memory Cache

- **Access Time**: O(1) - Map lookup
- **Eviction Time**: O(n) - Linear scan for LRU
- **Space Complexity**: O(n) - Proportional to cached items

### Disk Cache

- **Access Time**: ~10-50ms - IndexedDB query
- **Write Time**: ~20-100ms - IndexedDB transaction
- **Space Complexity**: Limited by browser quota (typically 50% of available disk)

### Optimization Tips

1. **Use appropriate quality levels**: Lower quality for timeline, higher for inspection
2. **Enable preloading**: Improves perceived performance during scrubbing
3. **Monitor cache stats**: Adjust limits based on actual usage
4. **Clear cache periodically**: Prevent unbounded growth

## Testing

### Unit Tests

```typescript
describe('ThumbnailCache', () => {
  it('should evict LRU entry when cache is full', async () => {
    const cache = new ThumbnailCache({ maxMemorySize: 1 }); // 1 MB
    
    // Fill cache
    await cache.set('video1', 0, blob1);
    await cache.set('video1', 1, blob2);
    
    // Access first entry to make it more recent
    await cache.get('video1', 0);
    
    // Add new entry, should evict blob2
    await cache.set('video1', 2, blob3);
    
    expect(cache.has('video1:0:medium')).toBe(true);
    expect(cache.has('video1:1:medium')).toBe(false);
    expect(cache.has('video1:2:medium')).toBe(true);
  });
});
```

### Property-Based Tests

Property-based tests for the cache are marked as optional (tasks 3.2 and 3.4) but can be implemented using fast-check:

```typescript
import fc from 'fast-check';

describe('Property: Cache LRU Eviction', () => {
  it('should always evict least recently used entries', () => {
    fc.assert(
      fc.property(
        fc.record({
          cacheSize: fc.integer({ min: 5, max: 20 }),
          accesses: fc.array(
            fc.record({
              key: fc.string(),
              value: fc.integer()
            }),
            { minLength: 30, maxLength: 50 }
          )
        }),
        ({ cacheSize, accesses }) => {
          const cache = new ThumbnailCache({ maxMemorySize: cacheSize });
          // Test LRU behavior
        }
      )
    );
  });
});
```

## Requirements Validation

This implementation validates the following requirements:

- ✅ **5.1**: Memory cache checked first
- ✅ **5.2**: Asynchronous loading when not in cache
- ✅ **5.3**: LRU eviction policy
- ✅ **5.4**: Multiple quality levels (low, medium, high)
- ✅ **5.5**: Prioritization of visible thumbnails
- ✅ **5.6**: Loading placeholders via React hooks
- ✅ **5.7**: Preloading of adjacent thumbnails
- ✅ **5.8**: Persistent disk cache with IndexedDB

## Future Enhancements

Potential improvements for future iterations:

1. **Web Worker Integration**: Move thumbnail generation to Web Worker
2. **Compression**: Compress thumbnails before caching
3. **Smart Eviction**: Consider access frequency, not just recency
4. **Cache Warming**: Preload common thumbnails on app start
5. **Network Cache**: Sync cache across devices
6. **Analytics**: Track cache hit/miss rates

## Troubleshooting

### Common Issues

**Issue**: Cache not persisting between sessions
- **Solution**: Check IndexedDB initialization, ensure `initIndexedDB()` is called

**Issue**: Quota exceeded errors
- **Solution**: Reduce `maxDiskSize` or implement more aggressive cleanup

**Issue**: Slow thumbnail loading
- **Solution**: Enable preloading, use lower quality for timeline

**Issue**: Memory leaks
- **Solution**: Ensure object URLs are revoked when components unmount

## References

- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [LRU Cache Algorithm](https://en.wikipedia.org/wiki/Cache_replacement_policies#Least_recently_used_(LRU))
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)
- [Blob API](https://developer.mozilla.org/en-US/docs/Web/API/Blob)
