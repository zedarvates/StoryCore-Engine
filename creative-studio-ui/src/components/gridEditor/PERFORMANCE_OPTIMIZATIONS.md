# Performance Optimizations Implementation

This document describes the performance optimization features implemented for the Advanced Grid Editor.

## Overview

Three major performance optimization systems have been implemented:

1. **GPU-Accelerated Rendering** - WebGL-based rendering for transforms
2. **Memory Management** - Intelligent texture lifecycle management
3. **Progressive Image Loading** - Mipmap-based progressive loading

## 1. GPU-Accelerated Rendering

### WebGLRenderer Service

Location: `src/services/gridEditor/WebGLRenderer.ts`

The WebGLRenderer provides hardware-accelerated rendering for panel transformations using WebGL.

#### Features

- GPU-accelerated image scaling and rotation
- Transform matrix calculations on GPU
- Texture caching for efficient reuse
- Automatic fallback to Canvas 2D if WebGL unavailable
- Support for opacity and crop regions

#### Usage Example

```typescript
import { WebGLRenderer } from '../services/gridEditor/WebGLRenderer';

// Initialize renderer
const renderer = new WebGLRenderer({
  canvas: canvasElement,
  fallbackToCanvas2D: true,
});

// Check if WebGL is available
if (renderer.isAvailable()) {
  // Render image with GPU acceleration
  const success = renderer.renderImage(
    imageElement,
    imageUrl,
    { x: 0, y: 0, width: 800, height: 600 },
    {
      position: { x: 0, y: 0 },
      scale: { x: 1.5, y: 1.5 },
      rotation: 45,
      pivot: { x: 0.5, y: 0.5 },
    },
    1.0, // opacity
    { x: 0.1, y: 0.1, width: 0.8, height: 0.8 } // crop
  );

  if (!success) {
    // Fallback to Canvas 2D rendering
  }
}

// Clean up when done
renderer.dispose();
```

#### Performance Metrics

```typescript
const metrics = renderer.getMetrics();
console.log('WebGL Available:', metrics.isWebGLAvailable);
console.log('Cached Textures:', metrics.textureCount);
console.log('Memory Estimate:', metrics.memoryEstimate);
```

#### Integration with GridRenderer

To integrate WebGL rendering into GridRenderer:

```typescript
// In GridRenderer component
const webglRenderer = useRef<WebGLRenderer | null>(null);

useEffect(() => {
  if (canvasRef.current) {
    webglRenderer.current = new WebGLRenderer({
      canvas: canvasRef.current,
      fallbackToCanvas2D: true,
    });
  }

  return () => {
    webglRenderer.current?.dispose();
  };
}, []);

// In render function
if (webglRenderer.current?.isAvailable()) {
  // Use WebGL for transforms
  const success = webglRenderer.current.renderImage(...);
  if (!success) {
    // Fallback to Canvas 2D
    ctx.drawImage(...);
  }
} else {
  // Use Canvas 2D
  ctx.drawImage(...);
}
```

## 2. Memory Management

### MemoryManager Service

Location: `src/services/gridEditor/MemoryManager.ts`

The MemoryManager monitors memory usage and automatically unloads off-screen textures when memory is constrained.

#### Features

- Real-time memory usage monitoring
- Automatic texture eviction based on LRU (Least Recently Used)
- Visibility-aware texture management
- Priority-based texture retention
- Memory pressure notifications
- Configurable thresholds

#### Usage Example

```typescript
import { getMemoryManager } from '../services/gridEditor/MemoryManager';

// Get singleton instance
const memoryManager = getMemoryManager({
  maxMemoryMB: 512,
  warningThresholdPercent: 70,
  criticalThresholdPercent: 85,
  checkIntervalMs: 5000,
});

// Register textures
memoryManager.registerTexture(
  imageUrl,
  imageWidth,
  imageHeight,
  true, // isVisible
  5 // priority (0-10)
);

// Update visibility when panels scroll in/out of view
memoryManager.setTextureVisibility(imageUrl, false);

// Subscribe to memory stats
const unsubscribe = memoryManager.subscribe((stats) => {
  console.log('Memory Usage:', stats.usagePercent + '%');
  
  if (stats.isCritical) {
    console.warn('Critical memory pressure!');
  }
});

// Get current stats
const stats = memoryManager.getStats();
console.log('Used Memory:', stats.usedMemoryMB, 'MB');
console.log('Texture Count:', stats.textureCount);

// Manual garbage collection
const unloadedUrls = memoryManager.collectGarbage();
console.log('Unloaded textures:', unloadedUrls);

// Clean up
unsubscribe();
```

#### Integration with GridRenderer

```typescript
// In GridRenderer component
const memoryManager = useMemo(() => getMemoryManager(), []);

useEffect(() => {
  // Subscribe to memory pressure
  const unsubscribe = memoryManager.subscribe((stats) => {
    if (stats.isPressured) {
      console.warn('Memory pressure detected:', stats.usagePercent + '%');
      
      // Reduce quality or unload off-screen textures
      if (stats.isCritical) {
        // Aggressive cleanup
        const unloaded = memoryManager.collectGarbage();
        unloaded.forEach(url => {
          imageCache.current.delete(url);
        });
      }
    }
  });

  return unsubscribe;
}, [memoryManager]);

// Register textures as they're loaded
useEffect(() => {
  panels.forEach(panel => {
    panel.layers.forEach(layer => {
      if (layer.type === 'image') {
        const img = imageCache.current.get(layer.content.url);
        if (img) {
          memoryManager.registerTexture(
            layer.content.url,
            img.naturalWidth,
            img.naturalHeight,
            isPanelVisible(panel.id),
            getPanelPriority(panel.id)
          );
        }
      }
    });
  });
}, [panels, memoryManager]);
```

## 3. Progressive Image Loading

### Enhanced ImageLoaderService

Location: `src/services/gridEditor/ImageLoaderService.ts`

The ImageLoaderService now supports progressive loading with mipmaps.

#### Features

- Load low-resolution previews first
- Progressively load higher resolutions
- Automatic mipmap generation
- Zoom-aware mipmap selection
- Efficient caching with LRU eviction

#### Usage Example

```typescript
import { imageLoader } from '../services/gridEditor/ImageLoaderService';

// Load image progressively
const imageData = await imageLoader.loadImageProgressively(
  imageUrl,
  (imageData) => {
    // Called for each resolution level
    console.log('Loaded level:', imageData.level);
    console.log('Resolution:', imageData.width, 'x', imageData.height);
    
    // Update UI with current resolution
    renderImage(imageData.image);
  }
);

// Load multiple images progressively
await imageLoader.loadImagesProgressively(
  [url1, url2, url3],
  (url, imageData) => {
    console.log('Loaded', url, 'at level', imageData.level);
  }
);

// Get appropriate mipmap for zoom level
const mipmap = await imageLoader.getMipmapForZoom(imageUrl, 0.5); // 50% zoom
```

### React Hooks

Location: `src/hooks/useProgressiveImageLoading.ts`

React hooks make it easy to use progressive loading in components.

#### useProgressiveImageLoading

Load a single image progressively:

```typescript
import { useProgressiveImageLoading } from '../hooks/useProgressiveImageLoading';

function PanelComponent({ imageUrl }) {
  const { currentImage, isLoading, isFullResolution, progress } = 
    useProgressiveImageLoading(imageUrl);

  return (
    <div>
      {currentImage && (
        <img src={currentImage.image.src} alt="Panel" />
      )}
      {isLoading && (
        <div>Loading... {progress}%</div>
      )}
      {!isFullResolution && (
        <div>Loading full resolution...</div>
      )}
    </div>
  );
}
```

#### useProgressiveImagesLoading

Load multiple images progressively:

```typescript
import { useProgressiveImagesLoading } from '../hooks/useProgressiveImageLoading';

function GridComponent({ imageUrls }) {
  const imageStates = useProgressiveImagesLoading(imageUrls);

  return (
    <div>
      {imageUrls.map(url => {
        const state = imageStates.get(url);
        return (
          <div key={url}>
            {state?.currentImage && (
              <img src={state.currentImage.image.src} alt="Panel" />
            )}
            {state?.isLoading && <div>Loading...</div>}
          </div>
        );
      })}
    </div>
  );
}
```

#### useZoomAwareImageLoading

Automatically select appropriate mipmap based on zoom:

```typescript
import { useZoomAwareImageLoading } from '../hooks/useProgressiveImageLoading';

function ZoomablePanel({ imageUrl, zoom }) {
  const { currentImage, isLoading } = useZoomAwareImageLoading(imageUrl, zoom);

  return (
    <div>
      {currentImage && (
        <img 
          src={currentImage.image.src} 
          alt="Panel"
          style={{ 
            width: currentImage.width * zoom,
            height: currentImage.height * zoom 
          }}
        />
      )}
      {isLoading && <div>Loading...</div>}
    </div>
  );
}
```

#### useImagePreloader

Preload images in the background:

```typescript
import { useImagePreloader } from '../hooks/useProgressiveImageLoading';

function GridEditor({ visiblePanelUrls, offscreenPanelUrls }) {
  // Preload offscreen images progressively
  const { isPreloading, preloadedCount, totalCount } = useImagePreloader(
    offscreenPanelUrls,
    { enabled: true, progressive: true }
  );

  return (
    <div>
      {/* Grid content */}
      {isPreloading && (
        <div>
          Preloading: {preloadedCount} / {totalCount}
        </div>
      )}
    </div>
  );
}
```

## Performance Best Practices

### 1. Use WebGL for Transforms

Enable WebGL rendering for panels with active transforms:

```typescript
// Check if transform is active
const hasActiveTransform = 
  panel.transform.rotation !== 0 ||
  panel.transform.scale.x !== 1 ||
  panel.transform.scale.y !== 1;

if (hasActiveTransform && webglRenderer.isAvailable()) {
  // Use GPU acceleration
  webglRenderer.renderImage(...);
} else {
  // Use Canvas 2D
  ctx.drawImage(...);
}
```

### 2. Monitor Memory Pressure

React to memory pressure by reducing quality:

```typescript
memoryManager.subscribe((stats) => {
  if (stats.isCritical) {
    // Reduce mipmap quality
    imageLoader.updateConfig({
      mipmap: {
        maxLevels: 3, // Reduce from 5
        minSize: 128, // Increase from 64
        quality: 0.8, // Reduce from 0.9
      }
    });
  }
});
```

### 3. Prioritize Visible Panels

Set higher priority for visible panels:

```typescript
const priority = isPanelVisible(panel.id) ? 10 : 1;
memoryManager.setTexturePriority(imageUrl, priority);
```

### 4. Preload Adjacent Panels

Preload panels near the viewport:

```typescript
const adjacentPanelUrls = getAdjacentPanelUrls(currentPanelId);
imageLoader.preloadImagesProgressively(adjacentPanelUrls);
```

### 5. Use Zoom-Aware Loading

Load appropriate resolution for current zoom:

```typescript
const mipmap = await imageLoader.getMipmapForZoom(imageUrl, viewport.zoom);
// Render mipmap instead of full resolution
```

## Performance Metrics

### Measuring Performance

```typescript
// Measure render time
const startTime = performance.now();
renderer.renderImage(...);
const renderTime = performance.now() - startTime;
console.log('Render time:', renderTime, 'ms');

// Check if meeting 60fps target (16.67ms per frame)
if (renderTime > 16.67) {
  console.warn('Render time exceeds 60fps target');
}

// Get memory stats
const memStats = memoryManager.getStats();
console.log('Memory usage:', memStats.usagePercent + '%');

// Get cache stats
const cacheStats = imageLoader.getCacheStats();
console.log('Cached images:', cacheStats.imageCount);
console.log('Cache size:', cacheStats.totalSize / (1024 * 1024), 'MB');
```

### Performance Targets

- **Render Time**: < 16ms per frame (60fps)
- **Memory Usage**: < 512MB for textures
- **Image Load Time**: < 100ms for low-res preview
- **Full Resolution Load**: < 2s for 4K images

## Troubleshooting

### WebGL Not Available

If WebGL is not available, the system automatically falls back to Canvas 2D:

```typescript
if (!renderer.isAvailable()) {
  console.warn('WebGL not available, using Canvas 2D fallback');
}
```

### Memory Pressure

If experiencing memory pressure:

1. Reduce max memory limit
2. Increase eviction thresholds
3. Reduce mipmap levels
4. Clear cache more aggressively

```typescript
memoryManager.setMaxCacheSize(256 * 1024 * 1024); // 256MB
imageLoader.setMaxCacheSize(256 * 1024 * 1024);
```

### Slow Image Loading

If images load slowly:

1. Enable progressive loading
2. Reduce mipmap quality
3. Preload adjacent panels
4. Use smaller preview sizes

```typescript
imageLoader.updateConfig({
  mipmap: {
    maxLevels: 3,
    minSize: 128,
    quality: 0.7,
  }
});
```

## Requirements Validation

- ✅ **Requirement 13.1**: Mipmap generation for high-resolution images
- ✅ **Requirement 13.2**: Lower-resolution mipmaps when zoomed out
- ✅ **Requirement 13.3**: Full-resolution images when zoomed in
- ✅ **Requirement 13.4**: GPU acceleration for real-time rendering
- ✅ **Requirement 13.6**: Memory management with texture unloading

## Future Enhancements

1. **Web Workers**: Offload mipmap generation to background threads
2. **IndexedDB**: Persistent cache for loaded images
3. **Adaptive Quality**: Automatically adjust quality based on device capabilities
4. **Streaming**: Stream large images in chunks
5. **Compression**: Use WebP or AVIF for better compression
