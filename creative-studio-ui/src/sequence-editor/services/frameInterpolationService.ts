/**
 * AI Frame Interpolation Service
 * 
 * Provides AI-powered frame interpolation for smooth slow-motion and frame rate conversion.
 */

export interface InterpolationOptions {
  method: 'linear' | 'optical-flow' | 'ai-enhanced';
  quality: 'fast' | 'balanced' | 'high';
  targetFrameRate: number;
  smoothness: number; // 0-1
}

export interface InterpolationResult {
  interpolatedFrames: string[];
  originalFrameRate: number;
  targetFrameRate: number;
  totalFrames: number;
  processingTime: number;
}

export interface InterpolationProgress {
  currentFrame: number;
  totalFrames: number;
  percentage: number;
  estimatedTimeRemaining: number;
  status: 'processing' | 'complete' | 'error';
  error?: string;
}

class FrameInterpolationService {
  private interpolationCache: Map<string, InterpolationResult> = new Map();

  /**
   * Interpolate frames for smooth slow-motion
   */
  async interpolateForSlowMotion(
    shotId: string,
    startFrame: number,
    endFrame: number,
    slowMotionFactor: number, // 2x, 4x, 8x, etc.
    options: InterpolationOptions,
    onProgress?: (progress: InterpolationProgress) => void
  ): Promise<InterpolationResult> {
    const cacheKey = `${shotId}-${startFrame}-${endFrame}-${slowMotionFactor}`;

    if (this.interpolationCache.has(cacheKey)) {
      return this.interpolationCache.get(cacheKey)!;
    }

    const originalFrameCount = endFrame - startFrame + 1;
    const targetFrameCount = originalFrameCount * slowMotionFactor;
    const startTime = Date.now();

    const interpolatedFrames: string[] = [];

    try {
      for (let i = 0; i < targetFrameCount; i++) {
        // Simulate frame interpolation
        await this.simulateInterpolation(options.quality);

        interpolatedFrames.push(`/api/interpolated/${shotId}/${i}`);

        if (onProgress) {
          onProgress({
            currentFrame: i + 1,
            totalFrames: targetFrameCount,
            percentage: ((i + 1) / targetFrameCount) * 100,
            estimatedTimeRemaining: ((targetFrameCount - i - 1) * this.getProcessingTime(options.quality)),
            status: 'processing'
          });
        }
      }

      const result: InterpolationResult = {
        interpolatedFrames,
        originalFrameRate: 24,
        targetFrameRate: 24 * slowMotionFactor,
        totalFrames: targetFrameCount,
        processingTime: Date.now() - startTime
      };

      this.interpolationCache.set(cacheKey, result);

      if (onProgress) {
        onProgress({
          currentFrame: targetFrameCount,
          totalFrames: targetFrameCount,
          percentage: 100,
          estimatedTimeRemaining: 0,
          status: 'complete'
        });
      }

      return result;
    } catch (error) {
      if (onProgress) {
        onProgress({
          currentFrame: 0,
          totalFrames: targetFrameCount,
          percentage: 0,
          estimatedTimeRemaining: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      throw error;
    }
  }

  /**
   * Convert frame rate using AI interpolation
   */
  async convertFrameRate(
    shotId: string,
    sourceFrameRate: number,
    targetFrameRate: number,
    options: InterpolationOptions,
    onProgress?: (progress: InterpolationProgress) => void
  ): Promise<InterpolationResult> {
    const cacheKey = `${shotId}-fps-${sourceFrameRate}-${targetFrameRate}`;

    if (this.interpolationCache.has(cacheKey)) {
      return this.interpolationCache.get(cacheKey)!;
    }

    const frameRatio = targetFrameRate / sourceFrameRate;
    const startTime = Date.now();

    // Calculate number of frames needed
    const sourceFrameCount = 100; // Example: 100 source frames
    const targetFrameCount = Math.ceil(sourceFrameCount * frameRatio);

    const interpolatedFrames: string[] = [];

    try {
      for (let i = 0; i < targetFrameCount; i++) {
        await this.simulateInterpolation(options.quality);

        interpolatedFrames.push(`/api/fps-converted/${shotId}/${i}`);

        if (onProgress) {
          onProgress({
            currentFrame: i + 1,
            totalFrames: targetFrameCount,
            percentage: ((i + 1) / targetFrameCount) * 100,
            estimatedTimeRemaining: ((targetFrameCount - i - 1) * this.getProcessingTime(options.quality)),
            status: 'processing'
          });
        }
      }

      const result: InterpolationResult = {
        interpolatedFrames,
        originalFrameRate: sourceFrameRate,
        targetFrameRate,
        totalFrames: targetFrameCount,
        processingTime: Date.now() - startTime
      };

      this.interpolationCache.set(cacheKey, result);

      if (onProgress) {
        onProgress({
          currentFrame: targetFrameCount,
          totalFrames: targetFrameCount,
          percentage: 100,
          estimatedTimeRemaining: 0,
          status: 'complete'
        });
      }

      return result;
    } catch (error) {
      if (onProgress) {
        onProgress({
          currentFrame: 0,
          totalFrames: targetFrameCount,
          percentage: 0,
          estimatedTimeRemaining: 0,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      throw error;
    }
  }

  /**
   * Get interpolation quality settings
   */
  getQualityPresets(): Record<string, InterpolationOptions> {
    return {
      fast: {
        method: 'linear',
        quality: 'fast',
        targetFrameRate: 60,
        smoothness: 0.5
      },
      balanced: {
        method: 'optical-flow',
        quality: 'balanced',
        targetFrameRate: 120,
        smoothness: 0.75
      },
      high: {
        method: 'ai-enhanced',
        quality: 'high',
        targetFrameRate: 240,
        smoothness: 1.0
      }
    };
  }

  /**
   * Clear interpolation cache
   */
  clearCache(shotId?: string): void {
    if (shotId) {
      const keysToDelete: string[] = [];
      for (const key of this.interpolationCache.keys()) {
        if (key.startsWith(shotId)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => this.interpolationCache.delete(key));
    } else {
      this.interpolationCache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; memoryUsage: number } {
    let totalFrames = 0;
    for (const result of this.interpolationCache.values()) {
      totalFrames += result.totalFrames;
    }

    return {
      size: this.interpolationCache.size,
      memoryUsage: totalFrames * 512 // Rough estimate in KB per frame
    };
  }

  private getProcessingTime(quality: 'fast' | 'balanced' | 'high'): number {
    const times = {
      fast: 50,
      balanced: 150,
      high: 300
    };
    return times[quality];
  }

  private async simulateInterpolation(quality: 'fast' | 'balanced' | 'high'): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, this.getProcessingTime(quality)));
  }
}

export const frameInterpolationService = new FrameInterpolationService();
