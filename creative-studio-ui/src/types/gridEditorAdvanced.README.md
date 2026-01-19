# Advanced Grid Editor Infrastructure

This document describes the infrastructure setup for the Advanced Grid Editor improvements.

## Overview

The infrastructure provides the foundation for:
- Video visualization and playback
- Enhanced drag-and-drop interactions
- Grid layout with snap-to-grid
- Performance optimization
- Thumbnail caching with LRU eviction
- Batch operations
- Undo/Redo system

## Dependencies

All required dependencies are already installed:

- **fast-check** (^4.5.3): Property-based testing framework
- **@tanstack/react-virtual** (^3.13.18): Virtual scrolling for large lists
- **framer-motion** (^12.27.0): Animation library for smooth transitions

## Type System

### Core Types (`gridEditorAdvanced.ts`)

The type system is organized into logical sections:

1. **Video Visualization Types**
   - `VideoPlayerState`: Player state management
   - `VideoPlayerProps`: Video player component props
   - `VideoSequencePlayerProps`: Multi-shot sequence player
   - `PlaybackSpeed`: Supported playback rates (0.25x - 2x)
   - `TimecodeFormat`: Frame/seconds/SMPTE timecode formats

2. **Drag and Drop Types**
   - `DragDropConfig`: Configuration for drag behavior
   - `DragState`: Current drag operation state
   - `Position`: 2D coordinates
   - `DropTarget`: Valid drop locations

3. **Grid Layout Types**
   - `GridLayoutConfig`: Grid configuration (columns, rows, gap, snap)
   - `GridPanel`: Individual panel in the grid
   - `AlignmentGuide`: Smart alignment guides
   - `GridSize`: Supported grid sizes (8, 16, 24, 32px)

4. **Thumbnail Cache Types**
   - `ThumbnailCacheConfig`: Cache size and quality settings
   - `CacheEntry`: Individual cache entry with metadata
   - `ThumbnailCacheStats`: Cache performance metrics

5. **Performance Monitoring Types**
   - `PerformanceMetrics`: FPS, render time, memory usage
   - `PerformanceMonitorConfig`: Monitoring configuration

6. **Context Menu Types**
   - `ContextMenuItem`: Menu item with actions and shortcuts
   - `ContextMenuProps`: Context menu component props

7. **Undo/Redo Types**
   - `HistoryEntry`: Single history state
   - `UndoRedoState`: Complete undo/redo state management

8. **Batch Operations Types**
   - `BatchOperation`: Batch operation definition
   - `BatchOperationResult`: Operation results with success/failure tracking
   - `BatchOperationType`: Supported operations (delete, duplicate, export, etc.)

9. **Web Worker Types**
   - `WorkerTask`: Task definition for worker execution
   - `WorkerMessage`: Worker communication protocol
   - `WorkerPoolConfig`: Worker pool configuration

10. **Responsive Grid Types**
    - `Breakpoint`: Screen size breakpoints
    - `ResponsiveGridConfig`: Responsive layout configuration

11. **Search and Filter Types**
    - `SearchCriteria`: Search field and operator
    - `SearchFilter`: Saved filter configuration
    - `PredefinedFilter`: Built-in filter types

12. **Export/Import Types**
    - `ExportConfiguration`: Complete configuration export
    - `ExportFormat`: Supported formats (JSON, YAML, URL)
    - `ImportResult`: Import validation results

### Zod Schemas

Runtime validation schemas are provided for:
- `PositionSchema`
- `GridLayoutConfigSchema`
- `ThumbnailCacheConfigSchema`
- `ExportConfigurationSchema`

### Type Guards

Type guard functions for runtime type checking:
- `isPosition()`
- `isGridLayoutConfig()`
- `isThumbnailCacheConfig()`
- `isExportConfiguration()`

## Web Workers

### Configuration

Web Workers are configured in `vite.config.ts`:

```typescript
worker: {
  format: 'es',
  plugins: () => [react()],
}
```

### Implementation

**WorkerPool** (`src/utils/workers/WorkerPool.ts`):
- Manages a pool of Web Workers (default: CPU core count, max 8)
- Task queuing with priority support
- Progress tracking
- Automatic worker recovery on errors

**Processing Worker** (`src/utils/workers/processing.worker.ts`):
- Handles CPU-intensive tasks off the main thread
- Supports:
  - Thumbnail generation
  - Video encoding
  - Batch processing
- Progress reporting
- Error handling

### Usage Example

```typescript
import { WorkerPool } from '@utils/workers/WorkerPool';

const pool = new WorkerPool(4);

// Execute a task
const result = await pool.executeTask({
  id: 'task-1',
  type: 'thumbnail_generation',
  data: {
    videoUrl: 'video.mp4',
    timestamp: 5.0,
    width: 160,
    height: 90
  }
});

// Set progress callback
pool.setOnProgress((progress) => {
  console.log(`Progress: ${progress.progress}%`);
});

// Cleanup
pool.destroy();
```

## IndexedDB

### Configuration

**IndexedDB Wrapper** (`src/utils/indexeddb/index.ts`):
- Generic IndexedDB wrapper with TypeScript support
- Supports multiple object stores
- Index creation and querying
- Promise-based API

**ThumbnailCache** (`src/utils/indexeddb/ThumbnailCache.ts`):
- LRU cache with memory and disk tiers
- Configurable size limits
- Access frequency tracking
- Automatic eviction policies
- Warmup on initialization

### Default Configuration

```typescript
{
  maxMemoryItems: 100,
  maxDiskItems: 1000,
  memorySizeMB: 50,
  diskSizeMB: 200
}
```

### Usage Example

```typescript
import { ThumbnailCache } from '@utils/indexeddb/ThumbnailCache';

const cache = new ThumbnailCache({
  maxMemoryItems: 100,
  memorySizeMB: 50
});

await cache.initialize();

// Get thumbnail
const thumbnail = await cache.get('video.mp4', 5.0);

// Set thumbnail
await cache.set('video.mp4', 5.0, blob, 160, 90);

// Get stats
const stats = await cache.getStats();
console.log(`Memory: ${stats.memorySizeMB}MB, Disk: ${stats.diskSizeMB}MB`);

// Cleanup
cache.close();
```

## Performance Considerations

### Pragmatic Approach

This implementation targets **realistic use cases**:
- **10-30 shots**: Typical sequence plan
- **30-50 shots**: Extended use case (rarely exceeded)
- **React optimizations**: memo, useMemo, useCallback sufficient for these volumes
- **Virtual scrolling**: Optional, not required for MVP

### Why This Approach?

1. **Simplicity**: Less code complexity = fewer bugs
2. **Maintainability**: Easier to understand and modify
3. **Performance**: 60 FPS with 30-50 shots without over-engineering
4. **Extensibility**: Architecture supports scaling if needed

### Optimization Strategy

1. **React Standard Optimizations**:
   - `React.memo()` for component memoization
   - `useMemo()` for expensive calculations
   - `useCallback()` for stable function references

2. **Async Loading**:
   - Thumbnails load asynchronously
   - Web Workers for heavy processing
   - Progressive rendering

3. **Caching**:
   - LRU memory cache for hot data
   - IndexedDB for persistence
   - Preloading adjacent items

## Testing

### Property-Based Testing

Use `fast-check` for property-based tests:

```typescript
import fc from 'fast-check';

test('Position should always be valid', () => {
  fc.assert(
    fc.property(
      fc.record({
        x: fc.integer(),
        y: fc.integer()
      }),
      (pos) => {
        expect(isPosition(pos)).toBe(true);
      }
    )
  );
});
```

### Unit Testing

Standard unit tests with Vitest:

```typescript
import { describe, it, expect } from 'vitest';
import { isPosition } from '@types/gridEditorAdvanced';

describe('Type Guards', () => {
  it('should validate position correctly', () => {
    expect(isPosition({ x: 0, y: 0 })).toBe(true);
    expect(isPosition({ x: 0 })).toBe(false);
  });
});
```

## Next Steps

With the infrastructure in place, you can now implement:

1. **Task 2**: Video Visualization System
2. **Task 3**: Thumbnail Cache System
3. **Task 4**: Web Workers Pool
4. **Task 5**: Timeline Rendering Optimization

Each task builds on this foundation and can be implemented incrementally.

## References

- [Vite Web Workers](https://vitejs.dev/guide/features.html#web-workers)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Framer Motion](https://www.framer.com/motion/)
- [TanStack Virtual](https://tanstack.com/virtual/latest)
- [fast-check](https://fast-check.dev/)
