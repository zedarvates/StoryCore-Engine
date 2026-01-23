/**
 * MemoryManager - Manages texture memory and resource lifecycle
 * 
 * Responsibilities:
 * - Monitor memory usage
 * - Unload off-screen panel textures when memory constrained
 * - Reload textures when panels become visible
 * - Provide memory pressure notifications
 * 
 * Requirements: 13.6
 */

export interface MemoryManagerOptions {
  maxMemoryMB?: number;
  warningThresholdPercent?: number;
  criticalThresholdPercent?: number;
  checkIntervalMs?: number;
}

export interface TextureInfo {
  url: string;
  size: number; // Estimated size in bytes
  lastAccessed: number; // Timestamp
  isVisible: boolean;
  priority: number; // Higher = more important
}

export interface MemoryStats {
  totalMemoryMB: number;
  usedMemoryMB: number;
  availableMemoryMB: number;
  usagePercent: number;
  textureCount: number;
  isPressured: boolean;
  isCritical: boolean;
}

export type MemoryPressureLevel = 'normal' | 'warning' | 'critical';

export class MemoryManager {
  private textures: Map<string, TextureInfo> = new Map();
  private maxMemoryBytes: number;
  private warningThreshold: number;
  private criticalThreshold: number;
  private checkInterval: number;
  private intervalId: number | null = null;
  private listeners: Set<(stats: MemoryStats) => void> = new Set();

  // Performance API for memory monitoring (if available)
  private performance: Performance & { memory?: any };

  constructor(options: MemoryManagerOptions = {}) {
    this.maxMemoryBytes = (options.maxMemoryMB || 512) * 1024 * 1024;
    this.warningThreshold = options.warningThresholdPercent || 70;
    this.criticalThreshold = options.criticalThresholdPercent || 85;
    this.checkInterval = options.checkIntervalMs || 5000;
    this.performance = window.performance as any;
  }

  /**
   * Start monitoring memory usage
   */
  public start(): void {
    if (this.intervalId !== null) return;

    this.intervalId = window.setInterval(() => {
      this.checkMemoryPressure();
    }, this.checkInterval);
  }

  /**
   * Stop monitoring memory usage
   */
  public stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Register a texture for memory tracking
   */
  public registerTexture(
    url: string,
    width: number,
    height: number,
    isVisible: boolean = true,
    priority: number = 1
  ): void {
    // Estimate texture size (RGBA = 4 bytes per pixel)
    const size = width * height * 4;

    this.textures.set(url, {
      url,
      size,
      lastAccessed: Date.now(),
      isVisible,
      priority,
    });

    // Check if we need to free memory
    this.checkMemoryPressure();
  }

  /**
   * Unregister a texture
   */
  public unregisterTexture(url: string): void {
    this.textures.delete(url);
  }

  /**
   * Mark a texture as accessed (updates LRU tracking)
   */
  public accessTexture(url: string): void {
    const texture = this.textures.get(url);
    if (texture) {
      texture.lastAccessed = Date.now();
    }
  }

  /**
   * Update texture visibility status
   */
  public setTextureVisibility(url: string, isVisible: boolean): void {
    const texture = this.textures.get(url);
    if (texture) {
      texture.isVisible = isVisible;
      if (isVisible) {
        texture.lastAccessed = Date.now();
      }
    }
  }

  /**
   * Update texture priority
   */
  public setTexturePriority(url: string, priority: number): void {
    const texture = this.textures.get(url);
    if (texture) {
      texture.priority = priority;
    }
  }

  /**
   * Get current memory statistics
   */
  public getStats(): MemoryStats {
    const usedMemoryBytes = this.calculateUsedMemory();
    const usedMemoryMB = usedMemoryBytes / (1024 * 1024);
    const totalMemoryMB = this.maxMemoryBytes / (1024 * 1024);
    const usagePercent = (usedMemoryBytes / this.maxMemoryBytes) * 100;

    return {
      totalMemoryMB,
      usedMemoryMB,
      availableMemoryMB: totalMemoryMB - usedMemoryMB,
      usagePercent,
      textureCount: this.textures.size,
      isPressured: usagePercent >= this.warningThreshold,
      isCritical: usagePercent >= this.criticalThreshold,
    };
  }

  /**
   * Get memory pressure level
   */
  public getPressureLevel(): MemoryPressureLevel {
    const stats = this.getStats();
    if (stats.isCritical) return 'critical';
    if (stats.isPressured) return 'warning';
    return 'normal';
  }

  /**
   * Calculate total memory used by tracked textures
   */
  private calculateUsedMemory(): number {
    let total = 0;
    this.textures.forEach(texture => {
      total += texture.size;
    });
    return total;
  }

  /**
   * Check memory pressure and free resources if needed
   */
  private checkMemoryPressure(): void {
    const stats = this.getStats();

    // Notify listeners
    this.notifyListeners(stats);

    // If memory is under pressure, free some resources
    if (stats.isPressured) {
      this.freeMemory(stats.isCritical);
    }
  }

  /**
   * Free memory by unloading textures
   * Requirements: 13.6
   */
  private freeMemory(aggressive: boolean = false): string[] {
    const stats = this.getStats();
    const targetUsagePercent = aggressive ? 50 : 60;
    const targetMemoryBytes = (this.maxMemoryBytes * targetUsagePercent) / 100;
    const currentMemoryBytes = this.calculateUsedMemory();

    if (currentMemoryBytes <= targetMemoryBytes) {
      return []; // Already below target
    }

    const bytesToFree = currentMemoryBytes - targetMemoryBytes;
    let freedBytes = 0;
    const unloadedUrls: string[] = [];

    // Sort textures by eviction priority (lower priority first)
    const sortedTextures = Array.from(this.textures.values()).sort((a, b) => {
      // Invisible textures first
      if (a.isVisible !== b.isVisible) {
        return a.isVisible ? 1 : -1;
      }
      // Lower priority first
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Least recently used first
      return a.lastAccessed - b.lastAccessed;
    });

    // Unload textures until we reach target
    for (const texture of sortedTextures) {
      if (freedBytes >= bytesToFree) break;

      // Don't unload visible high-priority textures unless aggressive
      if (!aggressive && texture.isVisible && texture.priority > 5) {
        continue;
      }

      unloadedUrls.push(texture.url);
      freedBytes += texture.size;
      this.textures.delete(texture.url);
    }

      `MemoryManager: Freed ${(freedBytes / (1024 * 1024)).toFixed(2)}MB by unloading ${unloadedUrls.length} textures`
    );

    return unloadedUrls;
  }

  /**
   * Force garbage collection of off-screen textures
   * Requirements: 13.6
   */
  public collectGarbage(): string[] {
    const unloadedUrls: string[] = [];

    this.textures.forEach((texture, url) => {
      // Unload invisible textures that haven't been accessed recently
      const timeSinceAccess = Date.now() - texture.lastAccessed;
      const isStale = timeSinceAccess > 60000; // 1 minute

      if (!texture.isVisible && isStale) {
        unloadedUrls.push(url);
        this.textures.delete(url);
      }
    });

    if (unloadedUrls.length > 0) {
    }

    return unloadedUrls;
  }

  /**
   * Get list of textures that should be loaded (visible and high priority)
   */
  public getTexturesToLoad(): string[] {
    const urls: string[] = [];

    this.textures.forEach((texture, url) => {
      if (texture.isVisible && texture.priority > 0) {
        urls.push(url);
      }
    });

    // Sort by priority (highest first)
    return urls.sort((a, b) => {
      const textureA = this.textures.get(a)!;
      const textureB = this.textures.get(b)!;
      return textureB.priority - textureA.priority;
    });
  }

  /**
   * Get list of textures that can be unloaded (invisible or low priority)
   */
  public getTexturesToUnload(): string[] {
    const urls: string[] = [];

    this.textures.forEach((texture, url) => {
      if (!texture.isVisible || texture.priority <= 0) {
        urls.push(url);
      }
    });

    return urls;
  }

  /**
   * Subscribe to memory stats updates
   */
  public subscribe(listener: (stats: MemoryStats) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of memory stats update
   */
  private notifyListeners(stats: MemoryStats): void {
    this.listeners.forEach(listener => {
      try {
        listener(stats);
      } catch (error) {
        console.error('Error in memory stats listener:', error);
      }
    });
  }

  /**
   * Get browser memory info (if available)
   */
  public getBrowserMemoryInfo(): {
    jsHeapSizeLimit?: number;
    totalJSHeapSize?: number;
    usedJSHeapSize?: number;
  } | null {
    if (this.performance.memory) {
      return {
        jsHeapSizeLimit: this.performance.memory.jsHeapSizeLimit,
        totalJSHeapSize: this.performance.memory.totalJSHeapSize,
        usedJSHeapSize: this.performance.memory.usedJSHeapSize,
      };
    }
    return null;
  }

  /**
   * Clear all tracked textures
   */
  public clear(): void {
    this.textures.clear();
  }

  /**
   * Dispose of the memory manager
   */
  public dispose(): void {
    this.stop();
    this.clear();
    this.listeners.clear();
  }
}

/**
 * Singleton instance for global memory management
 */
let globalMemoryManager: MemoryManager | null = null;

export function getMemoryManager(options?: MemoryManagerOptions): MemoryManager {
  if (!globalMemoryManager) {
    globalMemoryManager = new MemoryManager(options);
    globalMemoryManager.start();
  }
  return globalMemoryManager;
}

export function disposeMemoryManager(): void {
  if (globalMemoryManager) {
    globalMemoryManager.dispose();
    globalMemoryManager = null;
  }
}
