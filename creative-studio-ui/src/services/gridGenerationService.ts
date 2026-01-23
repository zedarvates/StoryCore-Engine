/**
 * Grid Generation Service - Video Editor Integration
 *
 * This service handles the generation of image grids for video sequences.
 * It integrates with ComfyUI to generate images based on shot prompts.
 *
 * Features:
 * - Batch image generation from shot prompts
 * - Progress tracking and error handling
 * - Automatic thumbnail updates
 * - Integration with existing ComfyUI service
 */

import { ComfyUIService } from './comfyuiService';
import { ProgressTrackingService } from './progressTrackingService';

export interface Shot {
  id: number;
  title: string;
  duration: number;
  prompt: string;
  thumbnail?: string;
}

export interface GridGenerationOptions {
  /**
   * Quality preset for generation
   */
  quality?: 'draft' | 'standard' | 'high' | 'ultra';

  /**
   * Image dimensions
   */
  width?: number;
  height?: number;

  /**
   * Number of inference steps
   */
  steps?: number;

  /**
   * CFG scale for generation
   */
  cfgScale?: number;

  /**
   * Random seed (optional)
   */
  seed?: number;

  /**
   * Additional prompt enhancement
   */
  enhancePrompt?: boolean;

  /**
   * Grid layout configuration
   */
  gridLayout?: {
    rows: number;
    cols: number;
  };
}

export interface GridGenerationResult {
  /**
   * Generated images mapped by shot ID
   */
  images: Map<number, string>;

  /**
   * Generation statistics
   */
  stats: {
    totalShots: number;
    successfulGenerations: number;
    failedGenerations: number;
    totalTime: number;
    averageTimePerShot: number;
  };

  /**
   * Any errors that occurred
   */
  errors: Array<{
    shotId: number;
    error: string;
  }>;
}

export interface GridGenerationProgress {
  /**
   * Current progress (0-100)
   */
  progress: number;

  /**
   * Current status message
   */
  status: string;

  /**
   * Current shot being processed
   */
  currentShot?: number;

  /**
   * Estimated time remaining (in seconds)
   */
  estimatedTimeRemaining?: number;
}

/**
 * Grid Generation Service Class
 */
export class GridGenerationService {
  private static instance: GridGenerationService;
  private isGenerating = false;
  private abortController: AbortController | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): GridGenerationService {
    if (!GridGenerationService.instance) {
      GridGenerationService.instance = new GridGenerationService();
    }
    return GridGenerationService.instance;
  }

  /**
   * Generate image grid for a sequence of shots
   *
   * @param shots Array of shots to generate images for
   * @param options Generation options
   * @param onProgress Progress callback
   * @returns Promise resolving to generation results
   */
  public async generateGridForSequence(
    shots: Shot[],
    options: GridGenerationOptions = {},
    onProgress?: (progress: GridGenerationProgress) => void
  ): Promise<GridGenerationResult> {
    if (this.isGenerating) {
      throw new Error('Grid generation is already in progress');
    }

    this.isGenerating = true;
    this.abortController = new AbortController();

    const startTime = Date.now();
    const results = new Map<number, string>();
    const errors: Array<{ shotId: number; error: string }> = [];

    try {
      const validShots = shots.filter(shot => shot.prompt && shot.prompt.trim().length > 0);

      if (validShots.length === 0) {
        throw new Error('No shots with valid prompts found');
      }

      // Initialize progress tracking
      const progressTracker = ProgressTrackingService.createTracker('grid-generation', {
        total: validShots.length,
        description: `Generating ${validShots.length} images`
      });

      for (let i = 0; i < validShots.length; i++) {
        const shot = validShots[i];

        // Check if aborted
        if (this.abortController?.signal.aborted) {
          break;
        }

        try {
          // Update progress
          const progress: GridGenerationProgress = {
            progress: (i / validShots.length) * 100,
            status: `Generating image for "${shot.title}"...`,
            currentShot: shot.id,
            estimatedTimeRemaining: ((validShots.length - i - 1) * 3000) // Rough estimate: 3s per shot
          };

          onProgress?.(progress);
          progressTracker.update(i + 1, `Processing shot ${shot.id}: ${shot.title}`);

          // Generate image for this shot
          const imageUrl = await this.generateImageForShot(shot, options);

          results.set(shot.id, imageUrl);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`Failed to generate image for shot ${shot.id}:`, error);
          errors.push({ shotId: shot.id, error: errorMessage });
        }
      }

      progressTracker.complete();

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      return {
        images: results,
        stats: {
          totalShots: shots.length,
          successfulGenerations: results.size,
          failedGenerations: errors.length,
          totalTime,
          averageTimePerShot: results.size > 0 ? totalTime / results.size : 0
        },
        errors
      };

    } finally {
      this.isGenerating = false;
      this.abortController = null;
    }
  }

  /**
   * Generate a single image for a shot
   */
  private async generateImageForShot(
    shot: Shot,
    options: GridGenerationOptions
  ): Promise<string> {
    // Prepare the prompt with enhancements
    const enhancedPrompt = this.enhancePrompt(shot.prompt, options);

    // Set default options
    const generationOptions = {
      quality: 'standard' as const,
      width: 1024,
      height: 576, // 16:9 aspect ratio
      steps: 20,
      cfgScale: 7.0,
      ...options
    };

    // Map quality presets to actual parameters
    const qualitySettings = this.getQualitySettings(generationOptions.quality);

    // Generate the image using ComfyUI
    const imageUrl = await comfyuiService.generateImage({
      prompt: enhancedPrompt,
      negativePrompt: 'blurry, low quality, distorted, watermark, text',
      width: generationOptions.width,
      height: generationOptions.height,
      steps: qualitySettings.steps,
      cfgScale: generationOptions.cfgScale,
      seed: generationOptions.seed,
      model: qualitySettings.model,
      sampler: qualitySettings.sampler,
      scheduler: qualitySettings.scheduler
    });

    return imageUrl;
  }

  /**
   * Enhance the base prompt with cinematic and quality improvements
   */
  private enhancePrompt(basePrompt: string, options: GridGenerationOptions): string {
    if (!options.enhancePrompt) {
      return basePrompt;
    }

    // Add cinematic enhancements
    const enhancements = [
      'cinematic lighting',
      'high quality',
      'detailed',
      'professional',
      '4k resolution',
      'sharp focus'
    ];

    return `${basePrompt}, ${enhancements.join(', ')}`;
  }

  /**
   * Get quality preset settings
   */
  private getQualitySettings(quality: 'draft' | 'standard' | 'high' | 'ultra') {
    const settings = {
      draft: { steps: 15, model: 'SDXL', sampler: 'Euler a', scheduler: 'Karras' },
      standard: { steps: 20, model: 'SDXL', sampler: 'Euler a', scheduler: 'Karras' },
      high: { steps: 25, model: 'SDXL', sampler: 'DPM++ 2M Karras', scheduler: 'Karras' },
      ultra: { steps: 30, model: 'SDXL', sampler: 'DPM++ 2M Karras', scheduler: 'Karras' }
    };

    return settings[quality];
  }

  /**
   * Check if generation is currently in progress
   */
  public isGenerationInProgress(): boolean {
    return this.isGenerating;
  }

  /**
   * Abort current generation
   */
  public abortGeneration(): void {
    this.abortController?.abort();
  }

  /**
   * Get default generation options
   */
  public getDefaultOptions(): GridGenerationOptions {
    return {
      quality: 'standard',
      width: 1024,
      height: 576,
      steps: 20,
      cfgScale: 7.0,
      enhancePrompt: true
    };
  }
}

// Export singleton instance
export const gridGenerationService = GridGenerationService.getInstance();
