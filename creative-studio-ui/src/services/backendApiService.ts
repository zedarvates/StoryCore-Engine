/**
 * Backend API Service
 * 
 * Handles communication with StoryCore-Engine backend for generation tasks
 * Integrates with ComfyUI for image and video generation workflows
 * 
 * Validates Requirements: 7.4, 4.6
 */

import type { Project, GenerationTask } from '@/types';
import type { ComfyUIConfig } from './comfyuiService';
import { BACKEND_URL } from '../config/apiConfig';

/**
 * Backend API configuration
 */
export interface BackendConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  comfyui?: ComfyUIConfig;
}

/**
 * Default backend configuration
 */
const DEFAULT_CONFIG: BackendConfig = {
  baseUrl: import.meta.env.VITE_BACKEND_URL || BACKEND_URL,
  timeout: 180000, // 3 minutes (for LLM endpoints)
  retryAttempts: 3,
};

/**
 * API response types
 */
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface GenerationResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
}

export interface TaskStatusResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
  error?: string;
  result?: Record<string, unknown>;
}

/**
 * CLI command result type
 */
export interface CliCommandResult {
  command: string;
  args: Record<string, unknown>;
  output?: string;
  exitCode?: number;
  success: boolean;
}

/**
 * ComfyUI-specific types
 */
export interface ComfyUIWorkflowRequest {
  workflowId: string;
  inputs: Record<string, unknown>;
  config?: {
    checkpoint?: string;
    vae?: string;
    loras?: string[];
  };
}

export interface ComfyUIWorkflowResponse {
  promptId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  queuePosition?: number;
  message: string;
}

export interface ComfyUIStatusUpdate {
  promptId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  currentNode?: string;
  totalNodes?: number;
  completedNodes?: number;
  outputs?: Array<{
    type: 'image' | 'video';
    url: string;
    filename: string;
  }>;
  error?: string;
}

/**
 * Backend API Service Class
 */
export class BackendApiService {
  private config: BackendConfig;

  constructor(config?: Partial<BackendConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Submit project for generation
   * 
   * @param project - Project to generate
   * @returns Generation response with task ID
   */
  async submitProject(project: Project): Promise<ApiResponse<GenerationResponse>> {
    try {
      const response = await this.fetchWithRetry('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(project),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to submit project',
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Submit specific generation task
   * 
   * @param task - Generation task to submit
   * @param project - Project context
   * @returns Generation response
   */
  async submitTask(
    task: GenerationTask,
    project: Project
  ): Promise<ApiResponse<GenerationResponse>> {
    try {
      const response = await this.fetchWithRetry('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          task,
          project,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to submit task',
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get task status
   * 
   * @param taskId - Task ID to check
   * @returns Task status response
   */
  async getTaskStatus(taskId: string): Promise<ApiResponse<TaskStatusResponse>> {
    try {
      const response = await this.fetchWithRetry(`/api/tasks/${taskId}`);

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to get task status',
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cancel a running task
   * 
   * @param taskId - Task ID to cancel
   * @returns Cancellation response
   */
  async cancelTask(taskId: string): Promise<ApiResponse<void>> {
    try {
      const response = await this.fetchWithRetry(`/api/tasks/${taskId}/cancel`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to cancel task',
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get all tasks for a project
   * 
   * @param projectName - Project name
   * @returns List of tasks
   */
  async getProjectTasks(projectName: string): Promise<ApiResponse<GenerationTask[]>> {
    try {
      const response = await this.fetchWithRetry(
        `/api/projects/${encodeURIComponent(projectName)}/tasks`
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to get project tasks',
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Invoke StoryCore-Engine CLI command
   * 
   * @param command - CLI command to execute
   * @param args - Command arguments
   * @returns Command execution response
   */
  async invokeCliCommand(
    command: string,
    args: Record<string, unknown>
  ): Promise<ApiResponse<CliCommandResult>> {
    try {
      const response = await this.fetchWithRetry('/api/cli', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command,
          args,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to execute CLI command',
        };
      }

      const data = await response.json();
      return {
        success: true,
        data,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Fetch with retry logic
   * 
   * @param url - URL to fetch
   * @param options - Fetch options
   * @returns Fetch response
   */
  private async fetchWithRetry(
    url: string,
    options?: RequestInit
  ): Promise<Response> {
    const fullUrl = `${this.config.baseUrl}${url}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.config.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        const response = await fetch(fullUrl, {
          ...options,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');

        // Don't retry on abort (timeout)
        if (error instanceof Error && error.name === 'AbortError') {
          throw new Error('Request timeout');
        }

        // Wait before retry (exponential backoff)
        if (attempt < this.config.retryAttempts - 1) {
          await this.delay(Math.pow(2, attempt) * 1000);
        }
      }
    }

    throw lastError || new Error('Failed after retries');
  }

  /**
   * Delay helper
   * 
   * @param ms - Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Update backend configuration
   * 
   * @param config - New configuration
   */
  updateConfig(config: Partial<BackendConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   * 
   * @returns Current backend configuration
   */
  getConfig(): BackendConfig {
    return { ...this.config };
  }

  /**
   * Update ComfyUI configuration
   * Validates Requirement 7.4
   * 
   * @param comfyuiConfig - ComfyUI configuration to integrate
   */
  updateComfyUIConfig(comfyuiConfig: ComfyUIConfig): void {
    this.config.comfyui = comfyuiConfig;
  }

  /**
   * GET request helper
   */
  async get<T>(url: string): Promise<T> {
    const response = await this.fetchWithRetry(url, { method: 'GET' });
    if (!response.ok) {
      throw new Error(`GET request failed: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * POST request helper
   */
  async post<T>(url: string, data: unknown): Promise<T> {
    const response = await this.fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      throw new Error(`POST request failed: ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * DELETE request helper
   */
  async delete(url: string): Promise<void> {
    const response = await this.fetchWithRetry(url, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error(`DELETE request failed: ${response.statusText}`);
    }
  }

  // ============================================================================
  // ComfyUI Proxy Methods
  // ============================================================================

  /**
   * Get ComfyUI configuration from backend
   */
  getComfyUIConfig(): ComfyUIConfig | null {
    // Synchronous access to cached config for UI components
    return this.config.comfyui || null;
  }

  /**
   * Get current ComfyUI queue status
   */
  async getComfyUIQueue(): Promise<ApiResponse<{ pending: number, running: number }>> {
    try {
      return await this.get<ApiResponse<{ pending: number, running: number }>>('/api/comfyui/queue');
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get ComfyUI queue',
      };
    }
  }

  /**
   * Cancel a running ComfyUI workflow
   */
  async cancelComfyUIWorkflow(promptId: string): Promise<ApiResponse<void>> {
    try {
      await this.post('/api/comfyui/cancel', { promptId });
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel ComfyUI workflow',
      };
    }
  }

  /**
   * Get status of a specific ComfyUI workflow
   */
  async getComfyUIStatus(promptId: string): Promise<ApiResponse<ComfyUIStatusUpdate>> {
    try {
      const status = await this.get<ComfyUIStatusUpdate>(`/api/comfyui/status/${promptId}`);
      return {
        success: true,
        data: status,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get ComfyUI status',
      };
    }
  }
}

/**
 * Create a new BackendApiService instance with optional config
 */
export function createBackendApi(config?: Partial<BackendConfig>): BackendApiService {
  return new BackendApiService(config);
}

/**
 * Default instance for convenience
 */
export const backendApi = createBackendApi();

/**
 * Legacy export for backward compatibility
 */
export const backendApiService = backendApi;
