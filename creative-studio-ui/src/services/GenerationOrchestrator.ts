/**
 * Generation Orchestrator Service
 * 
 * Orchestrates the complete generation pipeline by integrating:
 * - PromptGenerationService for prompt generation
 * - ComfyUIService for image and video generation
 * - TTSService for audio generation
 * 
 * Provides progress tracking with polling for ComfyUI operations.
 * 
 * Requirements: 12.1, 12.2, 12.3
 */

import { promptGenerationService } from './PromptGenerationService';
import { comfyuiService } from './comfyuiService';
import { ttsService } from './ttsService';
import type {
  GenerationProgress,
  GeneratedPrompt,
  GeneratedAsset,
  PromptCategories,
  ImageGenerationParams,
  VideoGenerationParams,
  AudioGenerationParams,
  AssetMetadata,
} from '../types/generation';
import type { ScenePromptData } from './PromptGenerationService';
import type { VoiceOver } from '../types';

/**
 * Progress callback type
 */
export type ProgressCallback = (progress: GenerationProgress) => void;

/**
 * Error callback type
 */
export type ErrorCallback = (error: Error) => void;

/**
 * ComfyUI job status (mock structure for polling)
 */
interface ComfyUIJobStatus {
  status: 'queued' | 'running' | 'completed' | 'failed';
  stage: string;
  progress: number;
  message: string;
  cancellable: boolean;
  result?: string;
  error?: string;
}

/**
 * Generation Orchestrator Service
 * 
 * Coordinates all generation services and provides unified progress tracking.
 */
export class GenerationOrchestrator {
  private static instance: GenerationOrchestrator;

  // Polling configuration
  private readonly POLL_INTERVAL = 100; // 100ms for faster testing
  private readonly MAX_POLL_ATTEMPTS = 50; // 5 seconds max (50 * 100ms)

  // Active job tracking
  private activeJobs: Map<string, AbortController> = new Map();

  private constructor() { }

  public static getInstance(): GenerationOrchestrator {
    if (!GenerationOrchestrator.instance) {
      GenerationOrchestrator.instance = new GenerationOrchestrator();
    }
    return GenerationOrchestrator.instance;
  }

  // ============================================================================
  // Prompt Generation
  // ============================================================================

  /**
   * Generate prompt using PromptGenerationService
   * 
   * Requirements: 12.1
   */
  public async generatePrompt(
    categories: PromptCategories,
    onProgress?: ProgressCallback,
    onError?: ErrorCallback
  ): Promise<GeneratedPrompt> {
    const jobId = crypto.randomUUID();

    try {
      // Report initial progress
      onProgress?.({
        stage: 'Generating prompt',
        stageProgress: 0,
        overallProgress: 0,
        estimatedTimeRemaining: 5,
        message: 'Preparing prompt generation...',
        cancellable: false,
      });

      // Build scene data from categories
      const sceneData: ScenePromptData = {
        element: categories.sceneElements?.join(', ') || '',
        genre: categories.genre || 'cinematic',
        shotType: categories.shotType || 'medium-shot',
        lighting: categories.lighting || 'natural',
      };

      // Report progress
      onProgress?.({
        stage: 'Generating prompt',
        stageProgress: 50,
        overallProgress: 50,
        estimatedTimeRemaining: 2,
        message: 'Generating prompt from categories...',
        cancellable: false,
      });

      // Generate initial prompt from templates
      let promptText = await promptGenerationService.generateScene(sceneData);

      // Optionally enhance with AI if enabled/available
      onProgress?.({
        stage: 'Generating prompt',
        stageProgress: 75,
        overallProgress: 75,
        estimatedTimeRemaining: 1,
        message: 'Enhancing prompt with AI...',
        cancellable: false,
      });

      promptText = await promptGenerationService.generateAIEnhancedPrompt(
        promptText,
        `Genre: ${categories.genre}, Lighting: ${categories.lighting}, Mood: ${categories.mood}, Elements: ${categories.sceneElements?.join(', ')}`
      );

      // Report completion
      onProgress?.({
        stage: 'Generating prompt',
        stageProgress: 100,
        overallProgress: 100,
        estimatedTimeRemaining: 0,
        message: 'Prompt generated successfully',
        cancellable: false,
      });

      // Return generated prompt
      return {
        text: promptText,
        categories,
        timestamp: Date.now(),
        editable: true,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      onError?.(err);
      throw err;
    }
  }

  // ============================================================================
  // Image Generation
  // ============================================================================

  /**
   * Generate image using ComfyUIService with progress tracking
   * 
   * Requirements: 12.2
   */
  public async generateImage(
    params: ImageGenerationParams,
    onProgress?: ProgressCallback,
    onError?: ErrorCallback
  ): Promise<GeneratedAsset> {
    const jobId = crypto.randomUUID();
    const abortController = new AbortController();
    this.activeJobs.set(jobId, abortController);

    try {
      // Report initial progress
      onProgress?.({
        stage: 'Image generation',
        stageProgress: 0,
        overallProgress: 0,
        estimatedTimeRemaining: 30,
        message: 'Submitting image generation request...',
        cancellable: true,
      });

      // Submit generation request to ComfyUI with progress tracking
      const imageUrl = await comfyuiService.generateImage({
        prompt: params.prompt,
        negativePrompt: params.negativePrompt,
        width: params.width,
        height: params.height,
        steps: params.steps,
        cfgScale: params.cfgScale,
        seed: params.seed,
        model: 'flux-turbo',
        sampler: params.sampler,
        scheduler: params.scheduler,
      }, (progress, message) => {
        onProgress?.({
          stage: 'Image generation',
          stageProgress: progress,
          overallProgress: progress,
          estimatedTimeRemaining: Math.ceil((100 - progress) * 0.3), // Simple estimation
          message: message,
          cancellable: true,
        });
      });

      // Create asset metadata
      const metadata: AssetMetadata = {
        generationParams: params,
        fileSize: 0, // Would be calculated from actual file
        dimensions: { width: params.width, height: params.height },
        format: 'png',
      };

      // Return generated asset
      const asset: GeneratedAsset = {
        id: crypto.randomUUID(),
        type: 'image',
        url: imageUrl,
        metadata,
        relatedAssets: [],
        timestamp: Date.now(),
      };

      return asset;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      onError?.(err);
      throw err;
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  // ============================================================================
  // Video Generation
  // ============================================================================

  /**
   * Generate video using ComfyUIService with two-stage progress tracking
   * 
   * Requirements: 12.2
   */
  public async generateVideo(
    params: VideoGenerationParams,
    onProgress?: ProgressCallback,
    onError?: ErrorCallback
  ): Promise<GeneratedAsset> {
    const jobId = crypto.randomUUID();
    const abortController = new AbortController();
    this.activeJobs.set(jobId, abortController);

    try {
      // Report initial progress
      onProgress?.({
        stage: 'Video generation - Latent generation',
        stageProgress: 0,
        overallProgress: 0,
        estimatedTimeRemaining: 120,
        message: 'Submitting video generation request...',
        cancellable: true,
      });

      // Submit video generation to ComfyUI
      onProgress?.({
        stage: 'Generating video',
        stageProgress: 0,
        overallProgress: 0,
        estimatedTimeRemaining: 180,
        message: 'Processing in ComfyUI...',
        cancellable: true,
      });

      const videoUrl = await comfyuiService.generateVideo(
        params,
        (progress, message) => {
          onProgress?.({
            stage: 'Generating video',
            stageProgress: progress,
            overallProgress: progress,
            estimatedTimeRemaining: Math.ceil((100 - progress) * 2.5),
            message,
            cancellable: true,
          });
        }
      );

      // Create asset metadata
      const metadata: AssetMetadata = {
        generationParams: params,
        fileSize: 0, // Would be calculated from actual file
        dimensions: { width: params.width, height: params.height },
        duration: params.frameCount / params.frameRate,
        format: 'mp4',
      };

      // Return generated asset
      const asset: GeneratedAsset = {
        id: crypto.randomUUID(),
        type: 'video',
        url: videoUrl,
        metadata,
        relatedAssets: [],
        timestamp: Date.now(),
      };

      return asset;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      onError?.(err);
      throw err;
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  // ============================================================================
  // Audio Generation
  // ============================================================================

  /**
   * Generate audio using TTSService
   * 
   * Requirements: 12.3
   */
  public async generateAudio(
    params: AudioGenerationParams,
    onProgress?: ProgressCallback,
    onError?: ErrorCallback
  ): Promise<GeneratedAsset> {
    const jobId = crypto.randomUUID();

    try {
      // Report initial progress
      onProgress?.({
        stage: 'Audio generation',
        stageProgress: 0,
        overallProgress: 0,
        estimatedTimeRemaining: 10,
        message: 'Preparing audio generation...',
        cancellable: false,
      });

      // Create VoiceOver object for TTS service
      const voiceOver: VoiceOver = {
        id: jobId,
        text: params.text,
        voice: params.voiceType,
        speed: params.speed,
        pitch: params.pitch,
        language: params.language,
        emotion: params.emotion,
      };

      // Report progress
      onProgress?.({
        stage: 'Audio generation',
        stageProgress: 30,
        overallProgress: 30,
        estimatedTimeRemaining: 7,
        message: 'Generating audio with TTS...',
        cancellable: false,
      });

      // Generate audio using TTS service
      const audioUrl = await ttsService.generateVoiceOver(voiceOver);

      // Report progress
      onProgress?.({
        stage: 'Audio generation',
        stageProgress: 80,
        overallProgress: 80,
        estimatedTimeRemaining: 2,
        message: 'Processing audio...',
        cancellable: false,
      });

      // Create asset metadata
      const metadata: AssetMetadata = {
        generationParams: params,
        fileSize: 0, // Would be calculated from actual file
        duration: this.estimateAudioDuration(params.text, params.speed),
        format: 'wav',
      };

      // Report completion
      onProgress?.({
        stage: 'Audio generation',
        stageProgress: 100,
        overallProgress: 100,
        estimatedTimeRemaining: 0,
        message: 'Audio generated successfully',
        cancellable: false,
      });

      // Return generated asset
      const asset: GeneratedAsset = {
        id: crypto.randomUUID(),
        type: 'audio',
        url: audioUrl,
        metadata,
        relatedAssets: [],
        timestamp: Date.now(),
      };

      return asset;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error');
      onError?.(err);
      throw err;
    }
  }

  // ============================================================================
  // Job Management
  // ============================================================================

  /**
   * Cancel an active generation job
   */
  public cancelJob(jobId: string): void {
    const controller = this.activeJobs.get(jobId);
    if (controller) {
      controller.abort();
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Cancel all active jobs
   */
  public cancelAllJobs(): void {
    this.activeJobs.forEach((controller) => controller.abort());
    this.activeJobs.clear();
  }

  /**
   * Get list of active job IDs
   */
  public getActiveJobs(): string[] {
    return Array.from(this.activeJobs.keys());
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  /**
   * Sleep utility for polling
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Estimate audio duration based on text length and speed
   */
  private estimateAudioDuration(text: string, speed: number): number {
    // Average speaking rate: ~150 words per minute at normal speed (1.0)
    const words = text.split(/\s+/).length;
    const baseMinutes = words / 150;
    const adjustedMinutes = baseMinutes / speed;
    return adjustedMinutes * 60; // Convert to seconds
  }
}

// Export singleton instance
export const generationOrchestrator = GenerationOrchestrator.getInstance();

