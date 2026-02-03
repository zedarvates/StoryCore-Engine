/**
 * VideoPerformanceOptimizer - Performance optimization for video playback
 */

type OptimizerConfig = {
  enableThumbnailWorker: boolean;
  enableHardwareAcceleration: boolean;
  enableOffscreenCanvas: boolean;
  maxCachedFrames: number;
  cacheTtlMs: number;
  preloadDistance: number;
  targetFps: number;
};

const DEFAULT_CONFIG: OptimizerConfig = {
  enableThumbnailWorker: true,
  enableHardwareAcceleration: true,
  enableOffscreenCanvas: true,
  maxCachedFrames: 100,
  cacheTtlMs: 60000,
  preloadDistance: 3,
  targetFps: 60,
};

export interface PerformanceMetrics {
  currentFps: number;
  targetFps: number;
  frameDropRate: number;
  memoryUsage: number;
  cacheHitRate: number;
  gpuMemoryUsage: number;
}

export class VideoPerformanceOptimizer {
  private config: OptimizerConfig;
  private metrics: PerformanceMetrics;
  private cachedFrames: Map<number, OffscreenCanvasRenderingContext2D> = new Map();
  private frameTimestamps: Map<number, number> = new Map();
  private worker: Worker | null = null;
  private isInitialized: boolean = false;
  private fpsHistory: number[] = [];

  constructor(config?: Partial<OptimizerConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.metrics = {
      currentFps: 0,
      targetFps: this.config.targetFps,
      frameDropRate: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      gpuMemoryUsage: 0,
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    if (this.config.enableHardwareAcceleration) {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) {
        this.config.enableHardwareAcceleration = false;
      }
    }
    
    if (this.config.enableThumbnailWorker && typeof Worker !== 'undefined') {
      try {
        const workerCode = `
          self.onmessage = function(e) {
            const { videoElement, frameNumber, width, height } = e.data;
            try {
              const canvas = new OffscreenCanvas(width, height);
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.drawImage(videoElement, 0, 0, width, height);
                canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 })
                  .then(blob => self.postMessage({ success: true, blob, frameNumber }));
              }
            } catch (error) {
              self.postMessage({ success: false, error: error.message, frameNumber });
            }
          };
        `;
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.worker = new Worker(URL.createObjectURL(blob));
      } catch {
        this.config.enableThumbnailWorker = false;
      }
    }
    
    this.isInitialized = true;
  }

  destroy(): void {
    this.cachedFrames.clear();
    this.frameTimestamps.clear();
    this.fpsHistory = [];
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isInitialized = false;
  }

  cacheFrame(frameNumber: number, canvas: OffscreenCanvasRenderingContext2D): void {
    if (this.cachedFrames.size >= this.config.maxCachedFrames) {
      this.evictOldestFrame();
    }
    this.cachedFrames.set(frameNumber, canvas);
    this.frameTimestamps.set(frameNumber, Date.now());
  }

  getCachedFrame(frameNumber: number): OffscreenCanvasRenderingContext2D | null {
    const cached = this.cachedFrames.get(frameNumber);
    if (cached) {
      this.frameTimestamps.set(frameNumber, Date.now());
    }
    return cached || null;
  }

  private evictOldestFrame(): void {
    let oldestFrame: number | null = null;
    let oldestTime = Infinity;
    this.frameTimestamps.forEach((timestamp, frameNumber) => {
      if (timestamp < oldestTime) {
        oldestTime = timestamp;
        oldestFrame = frameNumber;
      }
    });
    if (oldestFrame !== null) {
      this.cachedFrames.delete(oldestFrame);
      this.frameTimestamps.delete(oldestFrame);
    }
  }

  clearExpiredCache(): void {
    const now = Date.now();
    const expiredFrames: number[] = [];
    this.frameTimestamps.forEach((timestamp, frameNumber) => {
      if (now - timestamp > this.config.cacheTtlMs) {
        expiredFrames.push(frameNumber);
      }
    });
    expiredFrames.forEach(frameNumber => {
      this.cachedFrames.delete(frameNumber);
      this.frameTimestamps.delete(frameNumber);
    });
  }

  updateFps(fps: number): void {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 60) this.fpsHistory.shift();
    const avgFps = this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;
    this.metrics.currentFps = avgFps;
    if (this.metrics.targetFps > 0) {
      this.metrics.frameDropRate = Math.max(0, (this.metrics.targetFps - avgFps) / this.metrics.targetFps);
    }
  }

  recordFrameDrop(): void {
    this.metrics.frameDropRate = Math.min(1, this.metrics.frameDropRate + 0.01);
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  createOptimizedCanvas(width: number, height: number): HTMLCanvasElement | OffscreenCanvas {
    const canvas = this.config.enableOffscreenCanvas && typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  getOptimizedContext(canvas: HTMLCanvasElement | OffscreenCanvas) {
    return canvas.getContext('2d', { alpha: false, desynchronized: true });
  }

  async generateThumbnail(videoElement: HTMLVideoElement, frameNumber: number, width = 160, height = 90): Promise<Blob | null> {
    if (this.worker && this.config.enableThumbnailWorker) {
      return new Promise((resolve) => {
        this.worker!.onmessage = (e) => resolve(e.data.success ? e.data.blob : null);
        this.worker!.postMessage({ videoElement, frameNumber, width, height });
      });
    }
    // Fallback
    try {
      const canvas = this.createOptimizedCanvas(width, height);
      const ctx = this.getOptimizedContext(canvas);
      if (!ctx) return null;
      ctx.drawImage(videoElement, 0, 0, width, height);
      if ('convertToBlob' in canvas) {
        return canvas.convertToBlob({ type: 'image/jpeg', quality: 0.85 });
      }
      return new Promise((resolve) => {
        (canvas as HTMLCanvasElement).toBlob((blob) => resolve(blob), 'image/jpeg', 0.85);
      });
    } catch {
      return null;
    }
  }

  calculatePreloadRange(currentFrame: number, totalFrames: number, viewportFrames: number) {
    const halfViewport = Math.ceil(viewportFrames / 2);
    const preloadAhead = Math.ceil(this.config.preloadDistance * 30);
    const preloadBehind = Math.ceil(this.config.preloadDistance * 30 / 2);
    return {
      start: Math.max(0, currentFrame - halfViewport - preloadBehind),
      end: Math.min(totalFrames - 1, currentFrame + halfViewport + preloadAhead),
    };
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      config: { ...this.config },
      metrics: { ...this.metrics },
      cacheSize: this.cachedFrames.size,
    };
  }

  isWorkerEnabled(): boolean { return this.worker !== null; }
  isHardwareAccelerationEnabled(): boolean { return this.config.enableHardwareAcceleration; }
}

let defaultInstance: VideoPerformanceOptimizer | null = null;

export function getDefaultOptimizer(): VideoPerformanceOptimizer {
  if (!defaultInstance) defaultInstance = new VideoPerformanceOptimizer();
  return defaultInstance;
}

export default VideoPerformanceOptimizer;

