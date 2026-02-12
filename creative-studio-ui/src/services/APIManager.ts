/**
 * Unified API Manager
 * 
 * Centralized API management that combines:
 * - Backend API (backendApiService)
 * - ComfyUI API (comfyuiService)
 * - Sequence API (sequenceService)
 * 
 * Provides a single interface for all API communications
 */

import { BackendApiService, createBackendApi } from './backendApiService';
import { ComfyUIService } from './comfyuiService';
import { SequenceService } from './sequenceService';
import type { ComfyUIConfig } from './comfyuiService';
import type { Project, GenerationTask } from '@/types';
import type { 
  SequenceGenerationRequest as SeqGenRequest,
  GenerationJobResponse,
  GenerationStatus 
} from './sequenceService';

// ============================================================================
// Types for API Manager
// ============================================================================

export interface CLICommandArgs {
  command: string;
  args: Record<string, unknown>;
}

export interface ComfyUIUpdate {
  type: 'progress' | 'complete' | 'error';
  progress?: number;
  message?: string;
  result?: Record<string, unknown>;
  error?: string;
}

export interface JobProgress {
  progress: number;
  status: string;
  message?: string;
}

export interface JobResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

// ============================================================================
// Unified API Manager
// ============================================================================

export class UnifiedAPIManager {
  private backendApi: BackendApiService;
  private comfyUIService: ComfyUIService;
  private sequenceService: SequenceService;

  constructor() {
    this.backendApi = createBackendApi();
    this.comfyUIService = ComfyUIService.getInstance();
    this.sequenceService = new SequenceService();
  }

  // ==========================================================================
  // Backend API Methods
  // ==========================================================================

  /**
   * Submit project for generation
   */
  async submitProject(project: Project) {
    return this.backendApi.submitProject(project);
  }

  /**
   * Submit generation task
   */
  async submitTask(task: GenerationTask, project: Project) {
    return this.backendApi.submitTask(task, project);
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string) {
    return this.backendApi.getTaskStatus(taskId);
  }

  /**
   * Cancel task
   */
  async cancelTask(taskId: string) {
    return this.backendApi.cancelTask(taskId);
  }

  /**
   * Get project tasks
   */
  async getProjectTasks(projectName: string) {
    return this.backendApi.getProjectTasks(projectName);
  }

  /**
   * Invoke CLI command
   */
  async invokeCliCommand(command: string, args: Record<string, unknown>) {
    return this.backendApi.invokeCliCommand(command, args);
  }

  // ==========================================================================
  // ComfyUI API Methods
  // ==========================================================================

  /**
   * Get ComfyUI configuration
   */
  getComfyUIConfig(): ComfyUIConfig | undefined {
    return undefined;
  }

  /**
   * Update ComfyUI configuration
   */
  updateComfyUIConfig(_config: ComfyUIConfig): void {
    // Configuration is handled internally by ComfyUIService via localStorage
  }

  /**
   * Test ComfyUI connection
   */
  async testComfyUIConnection(_config: Partial<ComfyUIConfig>) {
    return this.comfyUIService.isAvailable();
  }

  /**
   * Get available ComfyUI models
   */
  async getComfyUIModels() {
    return this.comfyUIService.getAvailableModels();
  }

  /**
   * Get default ComfyUI model
   */
  async getDefaultComfyUIModel() {
    return this.comfyUIService.getDefaultModel();
  }

  // ==========================================================================
  // Sequence API Methods
  // ==========================================================================

  /**
   * Generate sequence
   */
  async generateSequence(request: SeqGenRequest) {
    return this.sequenceService.generateSequence(request);
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string) {
    return this.sequenceService.getJobStatus(jobId);
  }

  /**
   * Get job result
   */
  async getJobResult(jobId: string) {
    return this.sequenceService.getResult(jobId);
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string) {
    return this.sequenceService.cancelJob(jobId);
  }

  /**
   * List jobs
   */
  async listJobs(projectId?: string) {
    return this.sequenceService.listJobs(projectId);
  }

  /**
   * Stream job progress
   */
  streamProgress(
    jobId: string,
    onProgress: (data: GenerationJobResponse) => void,
    onComplete?: (data: GenerationJobResponse) => void,
    onError?: (error: string) => void
  ) {
    return this.sequenceService.streamProgress(jobId, onProgress, onComplete, onError);
  }

  /**
   * Wait for job completion
   */
  async waitForJobCompletion(
    jobId: string,
    onProgress?: (status: GenerationJobResponse) => void,
    maxWaitMs?: number
  ) {
    return this.sequenceService.waitForCompletion(jobId, onProgress, maxWaitMs);
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let unifiedApiManagerInstance: UnifiedAPIManager | null = null;

/**
 * Get or create unified API manager singleton
 */
export function getUnifiedAPIManager(): UnifiedAPIManager {
  if (!unifiedApiManagerInstance) {
    unifiedApiManagerInstance = new UnifiedAPIManager();
  }
  return unifiedApiManagerInstance;
}

/**
 * Reset unified API manager (useful for testing)
 */
export function resetUnifiedAPIManager(): void {
  unifiedApiManagerInstance = null;
}
