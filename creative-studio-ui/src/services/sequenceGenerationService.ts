/**
 * Sequence Generation Service
 * 
 * Orchestrates the complete StoryCore pipeline for sequence generation:
 * Stage 1: Generate Master Coherence Sheet (3x3 grid)
 * Stage 2: Trigger ComfyUI integration
 * Stage 3: Process through StoryCore pipeline (promotion, QA, autofix)
 * Stage 4: Export results
 * 
 * Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 8.1, 8.2, 8.3, 8.4, 9.5
 */

import type {
  Project,
  Shot,
  GenerationStatus,
  GenerationResults,
  GeneratedShot,
  QAReport,
  GenerationError,
} from '../types/projectDashboard';
import { BackendApiService } from './backendApiService';
import {
  GenerationErrorHandler,
  createGenerationError,
  getUserFriendlyErrorMessage,
  logError,
} from '../utils/generationErrorHandling';

// ============================================================================
// Types
// ============================================================================

/**
 * Pipeline stage identifiers
 */
export type PipelineStage = 'grid' | 'comfyui' | 'promotion' | 'qa' | 'export';

/**
 * Stage progress callback
 */
export type StageProgressCallback = (status: GenerationStatus) => void;

/**
 * Stage completion callback
 */
export type StageCompleteCallback = (stage: PipelineStage, result: any) => void;

/**
 * Error callback
 */
export type ErrorCallback = (error: GenerationError) => void;

/**
 * Generation options
 */
export interface GenerationOptions {
  onProgress?: StageProgressCallback;
  onStageComplete?: StageCompleteCallback;
  onError?: ErrorCallback;
  retryAttempts?: number;
  retryDelayMs?: number;
}

/**
 * Stage result types
 */
export interface GridGenerationResult {
  masterCoherenceSheetUrl: string;
  gridImages: string[];
  generatedAt: number;
}

export interface ComfyUIResult {
  promptId: string;
  outputs: Array<{
    shotId: string;
    imageUrl: string;
  }>;
}

export interface PromotionResult {
  promotedShots: Array<{
    shotId: string;
    imageUrl: string;
    processingTime: number;
  }>;
}

export interface QAResult {
  report: QAReport;
  autofixApplied: boolean;
}

export interface ExportResult {
  exportPackageUrl: string;
  timestamp: number;
}

// ============================================================================
// Sequence Generation Service
// ============================================================================

/**
 * Service for orchestrating sequence generation through the StoryCore pipeline
 * Requirements: 3.2, 3.3, 3.4, 3.5
 */
export class SequenceGenerationService {
  private backendApi: BackendApiService;
  private errorHandler: GenerationErrorHandler;
  private abortController: AbortController | null = null;
  private currentStage: PipelineStage | null = null;
  private startTime: number = 0;

  constructor(backendApi?: BackendApiService, errorHandler?: GenerationErrorHandler) {
    this.backendApi = backendApi || new BackendApiService();
    this.errorHandler = errorHandler || new GenerationErrorHandler();
  }

  /**
   * Generate sequence through complete pipeline
   * Requirements: 3.2, 3.3, 3.4, 3.5
   * 
   * @param project - Project with shots and prompts
   * @param options - Generation options with callbacks
   * @returns Generation results or null if cancelled/failed
   */
  async generateSequence(
    project: Project,
    options: GenerationOptions = {}
  ): Promise<GenerationResults | null> {
    const {
      onProgress,
      onStageComplete,
      onError,
      retryAttempts = 3,
      retryDelayMs = 2000,
    } = options;

    // Initialize abort controller for cancellation
    this.abortController = new AbortController();
    this.startTime = Date.now();

    try {
      // Validate project has shots with valid prompts
      if (!project.shots || project.shots.length === 0) {
        throw new Error('Project has no shots to generate');
      }

      const totalShots = project.shots.length;
      let currentShot = 0;

      // Reset error handler for new generation
      this.errorHandler.reset();

      // Stage 1: Generate Master Coherence Sheet (3x3 grid)
      this.currentStage = 'grid';
      onProgress?.({
        stage: 'grid',
        progress: 0,
        currentShot: 0,
        totalShots,
        startTime: this.startTime,
      });

      const gridResult = await this.executeWithRetry(
        () => this.generateMasterCoherenceSheet(project),
        retryAttempts,
        retryDelayMs,
        'grid',
        onError
      );

      if (!gridResult) {
        return null; // Cancelled or failed
      }

      // Save partial results after grid generation
      this.errorHandler.savePartialResults(
        project.id,
        ['grid'],
        [],
        gridResult.masterCoherenceSheetUrl
      );

      onStageComplete?.('grid', gridResult);
      onProgress?.({
        stage: 'grid',
        progress: 20,
        currentShot: 0,
        totalShots,
        startTime: this.startTime,
        estimatedCompletion: this.estimateCompletion(20, totalShots),
      });

      // Stage 2: Trigger ComfyUI integration
      this.currentStage = 'comfyui';
      onProgress?.({
        stage: 'comfyui',
        progress: 20,
        currentShot: 0,
        totalShots,
        startTime: this.startTime,
        estimatedCompletion: this.estimateCompletion(20, totalShots),
      });

      const comfyuiResult = await this.executeWithRetry(
        () => this.generateWithComfyUI(project, gridResult, (shotIndex) => {
          currentShot = shotIndex + 1;
          const progress = 20 + Math.floor((shotIndex / totalShots) * 40);
          onProgress?.({
            stage: 'comfyui',
            progress,
            currentShot,
            totalShots,
            startTime: this.startTime,
            estimatedCompletion: this.estimateCompletion(progress, totalShots),
          });
        }),
        retryAttempts,
        retryDelayMs,
        'comfyui',
        onError
      );

      if (!comfyuiResult) {
        return null;
      }

      // Save partial results after ComfyUI generation
      this.errorHandler.savePartialResults(
        project.id,
        ['grid', 'comfyui'],
        comfyuiResult.outputs.map(output => ({
          shotId: output.shotId,
          imageUrl: output.imageUrl,
          qaScore: 0,
          processingTime: 0,
        })),
        gridResult.masterCoherenceSheetUrl
      );

      onStageComplete?.('comfyui', comfyuiResult);
      onProgress?.({
        stage: 'comfyui',
        progress: 60,
        currentShot: totalShots,
        totalShots,
        startTime: this.startTime,
        estimatedCompletion: this.estimateCompletion(60, totalShots),
      });

      // Stage 3: Process through StoryCore pipeline (promotion, QA, autofix)
      this.currentStage = 'promotion';
      onProgress?.({
        stage: 'promotion',
        progress: 60,
        currentShot: 0,
        totalShots,
        startTime: this.startTime,
        estimatedCompletion: this.estimateCompletion(60, totalShots),
      });

      const promotionResult = await this.executeWithRetry(
        () => this.promoteShots(comfyuiResult, (shotIndex) => {
          const progress = 60 + Math.floor((shotIndex / totalShots) * 15);
          onProgress?.({
            stage: 'promotion',
            progress,
            currentShot: shotIndex + 1,
            totalShots,
            startTime: this.startTime,
            estimatedCompletion: this.estimateCompletion(progress, totalShots),
          });
        }),
        retryAttempts,
        retryDelayMs,
        'promotion',
        onError
      );

      if (!promotionResult) {
        return null;
      }

      // Save partial results after promotion
      this.errorHandler.savePartialResults(
        project.id,
        ['grid', 'comfyui', 'promotion'],
        promotionResult.promotedShots.map(shot => ({
          shotId: shot.shotId,
          imageUrl: shot.imageUrl,
          qaScore: 0,
          processingTime: shot.processingTime,
        })),
        gridResult.masterCoherenceSheetUrl
      );

      onStageComplete?.('promotion', promotionResult);

      // QA Stage
      this.currentStage = 'qa';
      onProgress?.({
        stage: 'qa',
        progress: 75,
        currentShot: 0,
        totalShots,
        startTime: this.startTime,
        estimatedCompletion: this.estimateCompletion(75, totalShots),
      });

      const qaResult = await this.executeWithRetry(
        () => this.runQAAnalysis(promotionResult),
        retryAttempts,
        retryDelayMs,
        'qa',
        onError
      );

      if (!qaResult) {
        return null;
      }

      onStageComplete?.('qa', qaResult);
      onProgress?.({
        stage: 'qa',
        progress: 90,
        currentShot: totalShots,
        totalShots,
        startTime: this.startTime,
        estimatedCompletion: this.estimateCompletion(90, totalShots),
      });

      // Stage 4: Export results
      this.currentStage = 'export';
      onProgress?.({
        stage: 'export',
        progress: 90,
        currentShot: totalShots,
        totalShots,
        startTime: this.startTime,
        estimatedCompletion: this.estimateCompletion(90, totalShots),
      });

      const exportResult = await this.executeWithRetry(
        () => this.exportResults(project, gridResult, promotionResult, qaResult),
        retryAttempts,
        retryDelayMs,
        'export',
        onError
      );

      if (!exportResult) {
        return null;
      }

      onStageComplete?.('export', exportResult);
      onProgress?.({
        stage: 'complete',
        progress: 100,
        currentShot: totalShots,
        totalShots,
        startTime: this.startTime,
      });

      // Compile final results
      const generatedShots: GeneratedShot[] = promotionResult.promotedShots.map(shot => ({
        shotId: shot.shotId,
        imageUrl: shot.imageUrl,
        qaScore: qaResult.report.shotScores.find(s => s.shotId === shot.shotId)?.score || 0,
        processingTime: shot.processingTime,
      }));

      const results: GenerationResults = {
        success: true,
        masterCoherenceSheetUrl: gridResult.masterCoherenceSheetUrl,
        generatedShots,
        qaReport: qaResult.report,
        exportPackageUrl: exportResult.exportPackageUrl,
      };

      // Clear partial results after successful completion
      this.errorHandler.clearPartialResults(project.id);

      return results;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Save partial results on failure
      if (this.currentStage) {
        const generationError = createGenerationError(
          this.currentStage,
          errorMessage,
          undefined,
          true
        );

        this.errorHandler.savePartialResults(
          project.id,
          [],
          [],
          undefined,
          generationError
        );
      }

      onProgress?.({
        stage: 'error',
        progress: 0,
        error: errorMessage,
        startTime: this.startTime,
      });

      onError?.({
        stage: this.currentStage || 'grid',
        message: getUserFriendlyErrorMessage(error as Error),
        retryable: true,
      });

      return null;
    } finally {
      this.abortController = null;
      this.currentStage = null;
    }
  }

  /**
   * Cancel ongoing generation
   * Requirements: 8.5
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  /**
   * Check if generation is in progress
   */
  isGenerating(): boolean {
    return this.abortController !== null;
  }

  // ============================================================================
  // Pipeline Stage Implementations
  // ============================================================================

  /**
   * Stage 1: Generate Master Coherence Sheet (3x3 grid)
   * Requirements: 3.3
   */
  private async generateMasterCoherenceSheet(
    project: Project
  ): Promise<GridGenerationResult> {
    this.checkAborted();

    // Call backend to generate grid
    const response = await this.backendApi.invokeCliCommand('grid', {
      project: project.name,
    });

    if (!response.success) {
      throw new Error(response.error || 'Failed to generate Master Coherence Sheet');
    }

    // Extract grid result from response
    const gridUrl = response.data?.gridUrl || `/projects/${project.name}/grid.png`;
    const gridImages = response.data?.gridImages || [];

    return {
      masterCoherenceSheetUrl: gridUrl,
      gridImages,
      generatedAt: Date.now(),
    };
  }

  /**
   * Stage 2: Generate shots with ComfyUI
   * Requirements: 3.4
   */
  private async generateWithComfyUI(
    project: Project,
    gridResult: GridGenerationResult,
    onShotProgress: (shotIndex: number) => void
  ): Promise<ComfyUIResult> {
    this.checkAborted();

    const outputs: Array<{ shotId: string; imageUrl: string }> = [];

    // Process each shot through ComfyUI
    for (let i = 0; i < project.shots.length; i++) {
      this.checkAborted();

      const shot = project.shots[i];
      onShotProgress(i);

      // Submit ComfyUI workflow for this shot
      const workflowResponse = await this.backendApi.submitComfyUIWorkflow({
        workflowId: 'image-generation',
        inputs: {
          prompt: shot.prompt,
          width: 512,
          height: 512,
          seed: -1,
          masterCoherenceSheet: gridResult.masterCoherenceSheetUrl,
        },
      });

      if (!workflowResponse.success || !workflowResponse.data) {
        throw new Error(`Failed to generate shot ${shot.id}: ${workflowResponse.error}`);
      }

      // Poll for completion
      const result = await this.pollComfyUICompletion(workflowResponse.data.promptId);
      
      if (result.outputs && result.outputs.length > 0) {
        outputs.push({
          shotId: shot.id,
          imageUrl: result.outputs[0].url,
        });
      }
    }

    return {
      promptId: `batch-${Date.now()}`,
      outputs,
    };
  }

  /**
   * Poll ComfyUI for workflow completion
   */
  private async pollComfyUICompletion(promptId: string): Promise<any> {
    const maxAttempts = 60; // 5 minutes with 5 second intervals
    const pollInterval = 5000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      this.checkAborted();

      const statusResponse = await this.backendApi.getComfyUIStatus(promptId);
      
      if (!statusResponse.success || !statusResponse.data) {
        throw new Error('Failed to get ComfyUI status');
      }

      const status = statusResponse.data;

      if (status.status === 'completed') {
        return status;
      }

      if (status.status === 'failed') {
        throw new Error(status.error || 'ComfyUI workflow failed');
      }

      // Wait before next poll
      await this.delay(pollInterval);
    }

    throw new Error('ComfyUI workflow timeout');
  }

  /**
   * Stage 3a: Promote shots through StoryCore pipeline
   * Requirements: 3.5
   */
  private async promoteShots(
    comfyuiResult: ComfyUIResult,
    onShotProgress: (shotIndex: number) => void
  ): Promise<PromotionResult> {
    this.checkAborted();

    const promotedShots: Array<{
      shotId: string;
      imageUrl: string;
      processingTime: number;
    }> = [];

    for (let i = 0; i < comfyuiResult.outputs.length; i++) {
      this.checkAborted();

      const output = comfyuiResult.outputs[i];
      onShotProgress(i);

      const startTime = Date.now();

      // Call promotion engine
      const response = await this.backendApi.invokeCliCommand('promote', {
        shotId: output.shotId,
        imageUrl: output.imageUrl,
      });

      if (!response.success) {
        throw new Error(`Failed to promote shot ${output.shotId}: ${response.error}`);
      }

      const processingTime = Date.now() - startTime;

      promotedShots.push({
        shotId: output.shotId,
        imageUrl: response.data?.promotedUrl || output.imageUrl,
        processingTime,
      });
    }

    return { promotedShots };
  }

  /**
   * Stage 3b: Run QA analysis and autofix
   * Requirements: 3.5
   */
  private async runQAAnalysis(promotionResult: PromotionResult): Promise<QAResult> {
    this.checkAborted();

    // Call QA engine
    const response = await this.backendApi.invokeCliCommand('qa', {
      shots: promotionResult.promotedShots,
    });

    if (!response.success) {
      throw new Error(`QA analysis failed: ${response.error}`);
    }

    const qaData = response.data || {};

    const report: QAReport = {
      overallScore: qaData.overallScore || 0,
      shotScores: qaData.shotScores || [],
      autofixApplied: qaData.autofixApplied || false,
    };

    return {
      report,
      autofixApplied: report.autofixApplied,
    };
  }

  /**
   * Stage 4: Export results
   * Requirements: 3.5
   */
  private async exportResults(
    project: Project,
    gridResult: GridGenerationResult,
    promotionResult: PromotionResult,
    qaResult: QAResult
  ): Promise<ExportResult> {
    this.checkAborted();

    // Call export engine
    const response = await this.backendApi.invokeCliCommand('export', {
      project: project.name,
      gridUrl: gridResult.masterCoherenceSheetUrl,
      shots: promotionResult.promotedShots,
      qaReport: qaResult.report,
    });

    if (!response.success) {
      throw new Error(`Export failed: ${response.error}`);
    }

    return {
      exportPackageUrl: response.data?.exportUrl || `/exports/${project.name}-${Date.now()}.zip`,
      timestamp: Date.now(),
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Execute function with retry logic and exponential backoff
   * Requirements: 3.7, 9.5
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxAttempts: number,
    delayMs: number,
    stage: PipelineStage,
    onError?: ErrorCallback
  ): Promise<T | null> {
    let attemptNumber = 1;

    while (attemptNumber <= maxAttempts) {
      try {
        this.checkAborted();
        return await fn();
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry if aborted
        if (this.abortController?.signal.aborted) {
          return null;
        }

        // Handle error with error handler
        const errorContext = {
          stage,
          timestamp: Date.now(),
          attemptNumber,
        };

        const handlerResult = this.errorHandler.handleError(err, errorContext);

        // Log error for debugging
        logError(err, errorContext);

        // Create generation error for callback
        const generationError = createGenerationError(
          stage,
          getUserFriendlyErrorMessage(err),
          undefined,
          handlerResult.canRetry
        );

        // Report error to callback
        onError?.(generationError);

        // Check if we should retry
        if (handlerResult.action === 'retry' && attemptNumber < maxAttempts) {
          // Wait before retry with exponential backoff
          const backoffDelay = handlerResult.suggestedDelay || delayMs * Math.pow(2, attemptNumber - 1);
          await this.delay(backoffDelay);
          attemptNumber++;
        } else {
          // No more retries, throw error
          throw err;
        }
      }
    }

    // Should not reach here, but throw error if we do
    throw new Error(`Stage ${stage} failed after ${maxAttempts} attempts`);
  }

  /**
   * Check if generation was aborted
   */
  private checkAborted(): void {
    if (this.abortController?.signal.aborted) {
      throw new Error('Generation cancelled');
    }
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Estimate completion time based on current progress
   * Requirements: 8.3, 8.4
   */
  private estimateCompletion(currentProgress: number, totalShots: number): number {
    if (currentProgress === 0) {
      return 0;
    }

    const elapsed = Date.now() - this.startTime;
    const estimatedTotal = (elapsed / currentProgress) * 100;
    const remaining = estimatedTotal - elapsed;

    return Date.now() + remaining;
  }

  /**
   * Update backend API service
   */
  updateBackendApi(backendApi: BackendApiService): void {
    this.backendApi = backendApi;
  }

  /**
   * Get partial results for recovery
   * Requirements: 9.5
   */
  getPartialResults(projectId: string) {
    return this.errorHandler.loadPartialResults(projectId);
  }

  /**
   * Get error handler for advanced error management
   */
  getErrorHandler(): GenerationErrorHandler {
    return this.errorHandler;
  }
}

/**
 * Default sequence generation service instance
 */
export const sequenceGenerationService = new SequenceGenerationService();

