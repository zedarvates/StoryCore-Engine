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
  baseUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000',
  timeout: 30000, // 30 seconds
  retryAttempts: 3,
};

/**
 * API response types
 */
export interface ApiResponse<T = any> {
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
  result?: any;
}

/**
 * ComfyUI-specific types
 */
export interface ComfyUIWorkflowRequest {
  workflowId: string;
  inputs: Record<string, any>;
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
    args: Record<string, any>
  ): Promise<ApiResponse<any>> {
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
   * Get ComfyUI configuration
   * 
   * @returns Current ComfyUI configuration
   */
  getComfyUIConfig(): ComfyUIConfig | undefined {
    return this.config.comfyui;
  }

  /**
   * Submit ComfyUI workflow for execution
   * Validates Requirements 7.4, 4.6
   * 
   * @param workflow - Workflow request with inputs and config
   * @returns Workflow execution response with prompt ID
   */
  async submitComfyUIWorkflow(
    workflow: ComfyUIWorkflowRequest
  ): Promise<ApiResponse<ComfyUIWorkflowResponse>> {
    if (!this.config.comfyui) {
      return {
        success: false,
        error: 'ComfyUI is not configured. Please configure ComfyUI settings first.',
      };
    }

    try {
      const response = await this.fetchWithRetry('/api/comfyui/workflow', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          workflow,
          config: this.config.comfyui,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to submit ComfyUI workflow',
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
   * Get ComfyUI workflow status
   * Validates Requirement 7.4
   * 
   * @param promptId - ComfyUI prompt ID to check
   * @returns Workflow status with progress and outputs
   */
  async getComfyUIStatus(
    promptId: string
  ): Promise<ApiResponse<ComfyUIStatusUpdate>> {
    if (!this.config.comfyui) {
      return {
        success: false,
        error: 'ComfyUI is not configured',
      };
    }

    try {
      const response = await this.fetchWithRetry(
        `/api/comfyui/status/${promptId}`
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to get ComfyUI status',
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
   * Cancel ComfyUI workflow execution
   * Validates Requirement 7.4
   * 
   * @param promptId - ComfyUI prompt ID to cancel
   * @returns Cancellation response
   */
  async cancelComfyUIWorkflow(promptId: string): Promise<ApiResponse<void>> {
    if (!this.config.comfyui) {
      return {
        success: false,
        error: 'ComfyUI is not configured',
      };
    }

    try {
      const response = await this.fetchWithRetry(
        `/api/comfyui/cancel/${promptId}`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to cancel ComfyUI workflow',
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
   * Get ComfyUI queue status
   * Validates Requirement 7.4
   * 
   * @returns Queue information with pending and running jobs
   */
  async getComfyUIQueue(): Promise<
    ApiResponse<{
      pending: number;
      running: number;
      queue: Array<{ promptId: string; position: number }>;
    }>
  > {
    if (!this.config.comfyui) {
      return {
        success: false,
        error: 'ComfyUI is not configured',
      };
    }

    try {
      const response = await this.fetchWithRetry('/api/comfyui/queue');

      if (!response.ok) {
        const error = await response.json();
        return {
          success: false,
          error: error.message || 'Failed to get ComfyUI queue',
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
   * Subscribe to real-time ComfyUI status updates via Server-Sent Events
   * Validates Requirement 7.4
   * 
   * @param promptId - ComfyUI prompt ID to monitor
   * @param onUpdate - Callback for status updates
   * @param onError - Callback for errors
   * @returns Cleanup function to close the connection
   */
  subscribeToComfyUIUpdates(
    promptId: string,
    onUpdate: (update: ComfyUIStatusUpdate) => void,
    onError?: (error: Error) => void
  ): () => void {
    if (!this.config.comfyui) {
      onError?.(new Error('ComfyUI is not configured'));
      return () => {};
    }

    const eventSource = new EventSource(
      `${this.config.baseUrl}/api/comfyui/stream/${promptId}`
    );

    eventSource.onmessage = (event) => {
      try {
        const update: ComfyUIStatusUpdate = JSON.parse(event.data);
        onUpdate(update);

        // Close connection when workflow is completed or failed
        if (update.status === 'completed' || update.status === 'failed') {
          eventSource.close();
        }
      } catch (error) {
        onError?.(
          error instanceof Error ? error : new Error('Failed to parse update')
        );
      }
    };

    eventSource.onerror = (event) => {
      onError?.(new Error('Connection to status stream failed'));
      eventSource.close();
    };

    // Return cleanup function
    return () => {
      eventSource.close();
    };
  }

  /**
   * Execute generation task with ComfyUI workflow
   * Validates Requirements 7.4, 4.6
   * 
   * @param task - Generation task to execute
   * @param project - Project context
   * @returns Workflow execution response
   */
  async executeTaskWithComfyUI(
    task: GenerationTask,
    project: Project
  ): Promise<ApiResponse<ComfyUIWorkflowResponse>> {
    if (!this.config.comfyui) {
      return {
        success: false,
        error: 'ComfyUI is not configured',
      };
    }

    // Determine workflow based on task type
    const workflowId = this.getWorkflowForTask(task);
    if (!workflowId) {
      return {
        success: false,
        error: `No ComfyUI workflow configured for task type: ${task.type}`,
      };
    }

    // Build workflow inputs from task and project
    const inputs = this.buildWorkflowInputs(task, project);

    // Submit workflow with preferred models
    return this.submitComfyUIWorkflow({
      workflowId,
      inputs,
      config: {
        checkpoint: this.config.comfyui.models.preferredCheckpoint,
        vae: this.config.comfyui.models.preferredVAE,
        loras: this.config.comfyui.models.preferredLora,
      },
    });
  }

  /**
   * Get appropriate workflow ID for a generation task
   * Validates Requirement 4.6
   * 
   * @param task - Generation task
   * @returns Workflow ID or undefined
   */
  private getWorkflowForTask(task: GenerationTask): string | undefined {
    if (!this.config.comfyui) return undefined;

    const { workflows } = this.config.comfyui;

    switch (task.type) {
      case 'grid':
      case 'image':
        return workflows.imageGeneration;
      case 'video':
        return workflows.videoGeneration;
      case 'upscale':
        return workflows.upscaling;
      case 'inpaint':
        return workflows.inpainting;
      default:
        return undefined;
    }
  }

  /**
   * Build workflow inputs from task and project context
   * 
   * @param task - Generation task
   * @param project - Project context
   * @returns Workflow inputs
   */
  private buildWorkflowInputs(
    task: GenerationTask,
    project: Project
  ): Record<string, any> {
    // This is a simplified version - real implementation would extract
    // prompts, dimensions, and other parameters from task and project
    return {
      prompt: task.prompt || '',
      negative_prompt: task.negativePrompt || '',
      width: task.width || 512,
      height: task.height || 512,
      seed: task.seed || -1,
      steps: task.steps || 20,
      cfg_scale: task.cfgScale || 7.0,
      sampler: task.sampler || 'euler',
      scheduler: task.scheduler || 'normal',
    };
  }
}

/**
 * Default backend API service instance
 */
export const backendApi = new BackendApiService();

/**
 * Mock backend API service for development/testing
 */
export class MockBackendApiService extends BackendApiService {
  private mockDelayMs: number = 1000;

  constructor(config?: Partial<BackendConfig>) {
    super(config);
  }

  async submitProject(_project: Project): Promise<ApiResponse<GenerationResponse>> {
    await this.wait(this.mockDelayMs);
    
    return {
      success: true,
      data: {
        taskId: `task-${Date.now()}`,
        status: 'pending',
        message: 'Project submitted successfully (mock)',
      },
    };
  }

  async submitTask(
    task: GenerationTask,
    _project: Project
  ): Promise<ApiResponse<GenerationResponse>> {
    await this.wait(this.mockDelayMs);
    
    return {
      success: true,
      data: {
        taskId: task.id,
        status: 'pending',
        message: 'Task submitted successfully (mock)',
      },
    };
  }

  async getTaskStatus(_taskId: string): Promise<ApiResponse<TaskStatusResponse>> {
    await this.wait(this.mockDelayMs / 2);
    
    // Simulate random progress
    const progress = Math.floor(Math.random() * 100);
    const statuses: Array<'pending' | 'processing' | 'completed' | 'failed'> = [
      'pending',
      'processing',
      'completed',
    ];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    return {
      success: true,
      data: {
        taskId: _taskId,
        status,
        progress,
        message: `Task ${status} (mock)`,
      },
    };
  }

  async cancelTask(_taskId: string): Promise<ApiResponse<void>> {
    await this.wait(this.mockDelayMs / 2);
    
    return {
      success: true,
    };
  }

  async getProjectTasks(_projectName: string): Promise<ApiResponse<GenerationTask[]>> {
    await this.wait(this.mockDelayMs);
    
    return {
      success: true,
      data: [],
    };
  }

  async invokeCliCommand(
    command: string,
    args: Record<string, any>
  ): Promise<ApiResponse<any>> {
    await this.wait(this.mockDelayMs);
    
    return {
      success: true,
      data: {
        command,
        args,
        output: 'Command executed successfully (mock)',
      },
    };
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  setMockDelay(ms: number): void {
    this.mockDelayMs = ms;
  }

  // ComfyUI mock methods
  async submitComfyUIWorkflow(
    workflow: ComfyUIWorkflowRequest
  ): Promise<ApiResponse<ComfyUIWorkflowResponse>> {
    await this.wait(this.mockDelayMs);

    return {
      success: true,
      data: {
        promptId: `prompt-${Date.now()}`,
        status: 'queued',
        queuePosition: Math.floor(Math.random() * 5),
        message: 'Workflow queued successfully (mock)',
      },
    };
  }

  async getComfyUIStatus(
    promptId: string
  ): Promise<ApiResponse<ComfyUIStatusUpdate>> {
    await this.wait(this.mockDelayMs / 2);

    const statuses: Array<'queued' | 'running' | 'completed' | 'failed'> = [
      'queued',
      'running',
      'completed',
    ];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    const progress = status === 'completed' ? 100 : Math.floor(Math.random() * 100);

    return {
      success: true,
      data: {
        promptId,
        status,
        progress,
        currentNode: status === 'running' ? 'KSampler' : undefined,
        totalNodes: 15,
        completedNodes: Math.floor((progress / 100) * 15),
        outputs:
          status === 'completed'
            ? [
                {
                  type: 'image',
                  url: '/mock-output.png',
                  filename: 'output_00001.png',
                },
              ]
            : undefined,
      },
    };
  }

  async cancelComfyUIWorkflow(promptId: string): Promise<ApiResponse<void>> {
    await this.wait(this.mockDelayMs / 2);

    return {
      success: true,
    };
  }

  async getComfyUIQueue(): Promise<
    ApiResponse<{
      pending: number;
      running: number;
      queue: Array<{ promptId: string; position: number }>;
    }>
  > {
    await this.wait(this.mockDelayMs / 2);

    return {
      success: true,
      data: {
        pending: Math.floor(Math.random() * 5),
        running: Math.floor(Math.random() * 2),
        queue: [],
      },
    };
  }

  subscribeToComfyUIUpdates(
    promptId: string,
    onUpdate: (update: ComfyUIStatusUpdate) => void,
    onError?: (error: Error) => void
  ): () => void {
    // Mock real-time updates with intervals
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;

      if (progress <= 100) {
        onUpdate({
          promptId,
          status: progress < 100 ? 'running' : 'completed',
          progress,
          currentNode: progress < 100 ? 'KSampler' : undefined,
          totalNodes: 15,
          completedNodes: Math.floor((progress / 100) * 15),
          outputs:
            progress === 100
              ? [
                  {
                    type: 'image',
                    url: '/mock-output.png',
                    filename: 'output_00001.png',
                  },
                ]
              : undefined,
        });
      }

      if (progress >= 100) {
        clearInterval(interval);
      }
    }, this.mockDelayMs);

    return () => {
      clearInterval(interval);
    };
  }

  async executeTaskWithComfyUI(
    task: GenerationTask,
    project: Project
  ): Promise<ApiResponse<ComfyUIWorkflowResponse>> {
    await this.wait(this.mockDelayMs);

    return {
      success: true,
      data: {
        promptId: `prompt-${task.id}`,
        status: 'queued',
        queuePosition: 0,
        message: 'Task submitted to ComfyUI (mock)',
      },
    };
  }
}

/**
 * Create backend API service based on environment
 */
export function createBackendApi(useMock: boolean = false): BackendApiService {
  if (useMock || import.meta.env.MODE === 'test') {
    return new MockBackendApiService();
  }
  return new BackendApiService();
}
