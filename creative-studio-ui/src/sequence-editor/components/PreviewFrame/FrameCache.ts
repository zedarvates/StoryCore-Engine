/**
 * Frame Cache System
 * 
 * Implements efficient frame caching with:
 * - LRU cache with 30 frames before/after current position
 * - Adaptive quality (reduced during playback, full when paused)
 * - Debounced frame updates
 * - 200ms render target
 * 
 * Requirements: 3.2, 3.3
 */

export interface CachedFrame {
  frameNumber: number;
  imageData: ImageData | null;
  quality: 'low' | 'high';
  timestamp: number;
  renderTime: number;
}

export interface FrameCacheOptions {
  cacheRadius: number; // Frames to cache before/after current position
  maxCacheSize: number; // Maximum number of frames to cache
  lowQualityScale: number; // Scale factor for low quality (0-1)
  debounceDelay: number; // Debounce delay in ms
  renderTimeout: number; // Maximum render time in ms
}

const DEFAULT_OPTIONS: FrameCacheOptions = {
  cacheRadius: 30,
  maxCacheSize: 100,
  lowQualityScale: 0.5,
  debounceDelay: 100,
  renderTimeout: 200,
};

/**
 * Frame Cache Manager
 * 
 * Manages frame caching with LRU eviction and adaptive quality.
 */
export class FrameCache {
  private cache: Map<number, CachedFrame>;
  private options: FrameCacheOptions;
  private accessOrder: number[];
  private pendingRenders: Map<number, AbortController>;
  private debounceTimer: number | null;
  
  constructor(options: Partial<FrameCacheOptions> = {}) {
    this.cache = new Map();
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.accessOrder = [];
    this.pendingRenders = new Map();
    this.debounceTimer = null;
  }
  
  /**
   * Get a frame from cache or render it
   */
  async getFrame(
    frameNumber: number,
    quality: 'low' | 'high',
    renderFn: (frame: number, quality: 'low' | 'high', signal: AbortSignal) => Promise<ImageData | null>
  ): Promise<ImageData | null> {
    // Check cache first
    const cached = this.cache.get(frameNumber);
    
    if (cached) {
      // Update access order
      this.updateAccessOrder(frameNumber);
      
      // Return cached frame if quality matches or better
      if (cached.quality === quality || (cached.quality === 'high' && quality === 'low')) {
        return cached.imageData;
      }
      
      // If we need higher quality, re-render
      if (cached.quality === 'low' && quality === 'high') {
        return this.renderFrame(frameNumber, quality, renderFn);
      }
    }
    
    // Render new frame
    return this.renderFrame(frameNumber, quality, renderFn);
  }
  
  /**
   * Render a frame with timeout and caching
   */
  private async renderFrame(
    frameNumber: number,
    quality: 'low' | 'high',
    renderFn: (frame: number, quality: 'low' | 'high', signal: AbortSignal) => Promise<ImageData | null>
  ): Promise<ImageData | null> {
    // Cancel any pending render for this frame
    const existingController = this.pendingRenders.get(frameNumber);
    if (existingController) {
      existingController.abort();
    }
    
    // Create abort controller for this render
    const controller = new AbortController();
    this.pendingRenders.set(frameNumber, controller);
    
    const startTime = performance.now();
    
    try {
      // Render with timeout
      const imageData = await Promise.race([
        renderFn(frameNumber, quality, controller.signal),
        this.createTimeout(this.options.renderTimeout),
      ]);
      
      const renderTime = performance.now() - startTime;
      
      // Cache the result
      if (imageData && !controller.signal.aborted) {
        this.cacheFrame({
          frameNumber,
          imageData,
          quality,
          timestamp: Date.now(),
          renderTime,
        });
      }
      
      return imageData;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        // Render was cancelled, return null
        return null;
      }
      console.error(`Frame render error for frame ${frameNumber}:`, error);
      return null;
    } finally {
      this.pendingRenders.delete(frameNumber);
    }
  }
  
  /**
   * Create a timeout promise
   */
  private createTimeout(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Render timeout')), ms);
    });
  }
  
  /**
   * Cache a frame with LRU eviction
   */
  private cacheFrame(frame: CachedFrame): void {
    // Add to cache
    this.cache.set(frame.frameNumber, frame);
    this.updateAccessOrder(frame.frameNumber);
    
    // Evict old frames if cache is full
    while (this.cache.size > this.options.maxCacheSize) {
      const oldestFrame = this.accessOrder.shift();
      if (oldestFrame !== undefined) {
        this.cache.delete(oldestFrame);
      }
    }
  }
  
  /**
   * Update access order for LRU
   */
  private updateAccessOrder(frameNumber: number): void {
    // Remove from current position
    const index = this.accessOrder.indexOf(frameNumber);
    if (index !== -1) {
      this.accessOrder.splice(index, 1);
    }
    
    // Add to end (most recently used)
    this.accessOrder.push(frameNumber);
  }
  
  /**
   * Preload frames around current position
   */
  async preloadFrames(
    centerFrame: number,
    quality: 'low' | 'high',
    renderFn: (frame: number, quality: 'low' | 'high', signal: AbortSignal) => Promise<ImageData | null>
  ): Promise<void> {
    const { cacheRadius } = this.options;
    const startFrame = Math.max(0, centerFrame - cacheRadius);
    const endFrame = centerFrame + cacheRadius;
    
    // Preload frames in order of proximity to center
    const framesToLoad: number[] = [];
    for (let i = 0; i <= cacheRadius; i++) {
      if (centerFrame + i <= endFrame) {
        framesToLoad.push(centerFrame + i);
      }
      if (centerFrame - i >= startFrame && i > 0) {
        framesToLoad.push(centerFrame - i);
      }
    }
    
    // Load frames that aren't already cached
    const loadPromises = framesToLoad
      .filter((frame) => !this.cache.has(frame))
      .map((frame) => this.getFrame(frame, quality, renderFn));
    
    // Load in background (don't await)
    Promise.all(loadPromises).catch((error) => {
      console.warn('Preload error:', error);
    });
  }
  
  /**
   * Debounced frame update
   */
  debouncedUpdate(
    frameNumber: number,
    quality: 'low' | 'high',
    renderFn: (frame: number, quality: 'low' | 'high', signal: AbortSignal) => Promise<ImageData | null>,
    callback: (imageData: ImageData | null) => void
  ): void {
    // Clear existing timer
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
    }
    
    // Set new timer
    this.debounceTimer = window.setTimeout(async () => {
      const imageData = await this.getFrame(frameNumber, quality, renderFn);
      callback(imageData);
      this.debounceTimer = null;
    }, this.options.debounceDelay);
  }
  
  /**
   * Clear all cached frames
   */
  clear(): void {
    // Cancel all pending renders
    this.pendingRenders.forEach((controller) => controller.abort());
    this.pendingRenders.clear();
    
    // Clear cache
    this.cache.clear();
    this.accessOrder = [];
    
    // Clear debounce timer
    if (this.debounceTimer !== null) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
  
  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    avgRenderTime: number;
  } {
    const frames = Array.from(this.cache.values());
    const avgRenderTime = frames.length > 0
      ? frames.reduce((sum, f) => sum + f.renderTime, 0) / frames.length
      : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.options.maxCacheSize,
      hitRate: 0, // TODO: Track hits/misses
      avgRenderTime,
    };
  }
  
  /**
   * Invalidate frames in a range
   */
  invalidateRange(startFrame: number, endFrame: number): void {
    for (let frame = startFrame; frame <= endFrame; frame++) {
      this.cache.delete(frame);
      const index = this.accessOrder.indexOf(frame);
      if (index !== -1) {
        this.accessOrder.splice(index, 1);
      }
    }
  }
  
  /**
   * Invalidate all frames
   */
  invalidateAll(): void {
    this.cache.clear();
    this.accessOrder = [];
  }
}

/**
 * Create a frame render function for canvas
 */
export function createCanvasRenderFunction(
  canvas: HTMLCanvasElement,
  shots: any[],
  zoomLevel: number,
  fps: number = 24
): (frame: number, quality: 'low' | 'high', signal: AbortSignal) => Promise<ImageData | null> {
  return async (frame: number, quality: 'low' | 'high', signal: AbortSignal): Promise<ImageData | null> => {
    if (signal.aborted) {
      return null;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return null;
    }
    
    // Find shot at this frame
    const framePosition = frame * zoomLevel;
    const currentShot = shots.find((shot) =>
      framePosition >= shot.startTime * zoomLevel &&
      framePosition < (shot.startTime + shot.duration) * zoomLevel
    );
    
    // Determine render scale based on quality
    const scale = quality === 'low' ? 0.5 : 1.0;
    const width = Math.floor(canvas.width * scale);
    const height = Math.floor(canvas.height * scale);
    
    // Create temporary canvas for rendering
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = width;
    tempCanvas.height = height;
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) {
      return null;
    }
    
    // Check for abort before rendering
    if (signal.aborted) {
      return null;
    }
    
    // Render frame
    tempCtx.fillStyle = '#000000';
    tempCtx.fillRect(0, 0, width, height);
    
    if (currentShot) {
      // Draw shot content
      const gradient = tempCtx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
      tempCtx.fillStyle = gradient;
      tempCtx.fillRect(0, 0, width, height);
      
      // Draw shot info (scaled)
      const fontSize = Math.floor(24 * scale);
      tempCtx.fillStyle = '#ffffff';
      tempCtx.font = `${fontSize}px sans-serif`;
      tempCtx.textAlign = 'center';
      tempCtx.fillText(currentShot.name, width / 2, height / 2 - 20 * scale);
      
      const smallFontSize = Math.floor(16 * scale);
      tempCtx.font = `${smallFontSize}px sans-serif`;
      tempCtx.fillStyle = '#aaaaaa';
      tempCtx.fillText(`Frame: ${frame}`, width / 2, height / 2 + 20 * scale);
    }
    
    // Check for abort before returning
    if (signal.aborted) {
      return null;
    }
    
    // Get image data
    return tempCtx.getImageData(0, 0, width, height);
  };
}

/**
 * Format timecode from frame number
 */
export function formatTimecode(frames: number, fps: number = 24): string {
  const totalSeconds = Math.floor(frames / fps);
  const remainingFrames = frames % fps;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}:${remainingFrames.toString().padStart(2, '0')}`;
}
