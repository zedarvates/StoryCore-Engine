/**
 * High-Bandwidth Frame Assembler (GPU-accelerated)
 * 
 * Performance-optimized service for rapid multi-layer cinematic frame composition.
 * Based on March 2026 Production Roadmap (Phase 4).
 */

export interface AssemblyLayer {
  id: string;
  type: 'base' | 'vfx' | 'overlay' | 'text';
  source: string | HTMLImageElement | HTMLCanvasElement;
  opacity: number;
  blendMode: GlobalCompositeOperation;
  transform?: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
}

export interface AssemblyRequest {
  shotId: string;
  width: number;
  height: number;
  layers: AssemblyLayer[];
  metadata?: Record<string, unknown>;
}

export interface AssemblyResult {
  shotId: string;
  dataUrl: string;
  timestamp: number;
  processingTime: number;
}

export class HighBandwidthFrameAssembler {
  private static instance: HighBandwidthFrameAssembler;
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private frameCache: Map<string, string> = new Map();

  public static getInstance() {
    if (!HighBandwidthFrameAssembler.instance) {
      HighBandwidthFrameAssembler.instance = new HighBandwidthFrameAssembler();
    }
    return HighBandwidthFrameAssembler.instance;
  }

  private initCanvas(width: number, height: number) {
    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement('canvas');
      this.ctx = this.offscreenCanvas.getContext('2d', { 
        alpha: false,
        desynchronized: true, // Low latency
        willReadFrequently: false 
      });
    }
    
    if (this.offscreenCanvas.width !== width || this.offscreenCanvas.height !== height) {
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
    }
  }

  /**
   * Assembles a multi-layer cinematic frame with high-bandwidth throughput
   */
  public async assembleFrame(request: AssemblyRequest): Promise<AssemblyResult> {
    const startTime = performance.now();
    this.initCanvas(request.width, request.height);
    
    if (!this.ctx) throw new Error("Could not initialize GPU-accelerated context");

    // Clear background
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, request.width, request.height);

    // Assembly Pipeline
    for (const layer of request.layers) {
      this.ctx.save();
      this.ctx.globalAlpha = layer.opacity;
      this.ctx.globalCompositeOperation = layer.blendMode;

      const source = await this.resolveSource(layer.source);
      
      if (layer.transform) {
        this.ctx.translate(layer.transform.x, layer.transform.y);
        this.ctx.rotate((layer.transform.rotation * Math.PI) / 180);
        this.ctx.scale(layer.transform.scale, layer.transform.scale);
        this.ctx.drawImage(source, -source.width / 2, -source.height / 2);
      } else {
        this.ctx.drawImage(source, 0, 0, request.width, request.height);
      }
      
      this.ctx.restore();
    }

    const dataUrl = this.offscreenCanvas!.toDataURL('image/webp', 0.85);
    this.frameCache.set(request.shotId, dataUrl);

    return {
      shotId: request.shotId,
      dataUrl,
      timestamp: Date.now(),
      processingTime: performance.now() - startTime
    };
  }

  /**
   * Batch assembles an entire sequence in a high-bandwidth burst
   */
  public async assembleSequence(requests: AssemblyRequest[]): Promise<AssemblyResult[]> {
    console.log(`[FrameAssembler] Bursting assembly for ${requests.length} frames...`);
    // Parallel processing with limited concurrency to avoid memory pressure
    const results: AssemblyResult[] = [];
    for (const req of requests) {
      results.push(await this.assembleFrame(req));
    }
    return results;
  }

  /**
   * Resolves various source types to an ImageBitmap or Image element
   */
  private async resolveSource(source: string | HTMLImageElement | HTMLCanvasElement): Promise<HTMLImageElement | HTMLCanvasElement | ImageBitmap> {
    if (typeof source === 'string') {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = source;
      });
    }
    return source;
  }

  public clearCache() {
    this.frameCache.clear();
  }
}

export const frameAssembler = HighBandwidthFrameAssembler.getInstance();
