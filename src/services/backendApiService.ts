/**
 * Backend API Service for StoryCore-Engine
 * Provides communication with the backend API for task submission and management
 */

export interface BackendConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface GenerationTask {
  taskId: string;
  projectName: string;
  type: 'grid' | 'promotion' | 'refine' | 'qa';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  message?: string;
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface GenerationResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  message: string;
}

export interface TaskStatusResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export class BackendApiService {
  private config: BackendConfig;

  constructor(config: Partial<BackendConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl || 'http://localhost:3000',
      timeout: config.timeout || 30000,
      retryAttempts: config.retryAttempts || 3,
    };
  }

  private async request<T>(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', data?: any): Promise<ApiResponse<T>> {
    let attempt = 0;
    const maxAttempts = this.config.retryAttempts;

    while (attempt < maxAttempts) {
      try {
        const url = `${this.config.baseUrl}${endpoint}`;
        const options: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: data ? JSON.stringify(data) : undefined,
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        options.signal = controller.signal;

        const response = await fetch(url, options);
        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          return {
            success: false,
            error: errorData.error || `HTTP error! status: ${response.status}`,
          };
        }

        const responseData = await response.json();
        return {
          success: true,
          data: responseData,
        };
      } catch (error) {
        attempt++;
        if (attempt >= maxAttempts) {
          return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          };
        }
        // Exponential backoff
        const delay = Math.pow(2, attempt) * 100;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    return {
      success: false,
      error: 'Max retry attempts reached',
    };
  }

  async submitProject(projectData: any): Promise<ApiResponse<GenerationResponse>> {
    return this.request<GenerationResponse>('/api/generate', 'POST', projectData);
  }

  async submitTask(task: GenerationTask): Promise<ApiResponse<GenerationResponse>> {
    return this.request<GenerationResponse>('/api/tasks', 'POST', task);
  }

  async getTaskStatus(taskId: string): Promise<ApiResponse<TaskStatusResponse>> {
    return this.request<TaskStatusResponse>(`/api/tasks/${taskId}`, 'GET');
  }

  async cancelTask(taskId: string): Promise<ApiResponse<{ success: boolean }>> {
    return this.request<{ success: boolean }>(`/api/tasks/${taskId}/cancel`, 'POST');
  }

  async getProjectTasks(projectName: string): Promise<ApiResponse<GenerationTask[]>> {
    return this.request<GenerationTask[]>(`/api/projects/${projectName}/tasks`, 'GET');
  }

  async invokeCliCommand(command: string, args: any = {}): Promise<ApiResponse<{ output: string }>> {
    return this.request<{ output: string }>('/api/cli', 'POST', { command, args });
  }
}

export class MockBackendApiService extends BackendApiService {
  private mockDelay: number = 1000;
  private mockProgress: Map<string, number> = new Map();

  constructor() {
    super({ baseUrl: 'http://localhost:3000' });
  }

  setMockDelay(delay: number): void {
    this.mockDelay = delay;
  }

  private simulateProgress(taskId: string): number {
    const currentProgress = this.mockProgress.get(taskId) || 0;
    const newProgress = Math.min(currentProgress + 10, 100);
    this.mockProgress.set(taskId, newProgress);
    return newProgress;
  }

  async submitProject(projectData: any): Promise<ApiResponse<GenerationResponse>> {
    await new Promise((resolve) => setTimeout(resolve, this.mockDelay));
    return {
      success: true,
      data: {
        taskId: `mock-task-${Date.now()}`,
        status: 'pending',
        message: 'Project submitted successfully',
      },
    };
  }

  async submitTask(task: GenerationTask): Promise<ApiResponse<GenerationResponse>> {
    await new Promise((resolve) => setTimeout(resolve, this.mockDelay));
    return {
      success: true,
      data: {
        taskId: task.taskId || `mock-task-${Date.now()}`,
        status: 'pending',
        message: 'Task submitted successfully',
      },
    };
  }

  async getTaskStatus(taskId: string): Promise<ApiResponse<TaskStatusResponse>> {
    await new Promise((resolve) => setTimeout(resolve, this.mockDelay));
    const progress = this.simulateProgress(taskId);
    const status = progress < 100 ? 'processing' : 'completed';

    return {
      success: true,
      data: {
        taskId,
        status,
        progress,
        message: status === 'completed' ? 'Task completed successfully' : 'Task in progress',
        startedAt: new Date(),
      },
    };
  }

  async cancelTask(taskId: string): Promise<ApiResponse<{ success: boolean }>> {
    await new Promise((resolve) => setTimeout(resolve, this.mockDelay));
    return {
      success: true,
      data: { success: true },
    };
  }

  async getProjectTasks(projectName: string): Promise<ApiResponse<GenerationTask[]>> {
    await new Promise((resolve) => setTimeout(resolve, this.mockDelay));
    return {
      success: true,
      data: [
        {
          taskId: 'mock-task-1',
          projectName,
          type: 'grid',
          status: 'completed',
          progress: 100,
          message: 'Grid generation completed',
          createdAt: new Date(),
          completedAt: new Date(),
        },
      ],
    };
  }

  async invokeCliCommand(command: string, args: any = {}): Promise<ApiResponse<{ output: string }>> {
    await new Promise((resolve) => setTimeout(resolve, this.mockDelay));
    return {
      success: true,
      data: { output: `Mock output for command: ${command}` },
    };
  }
}

export function createBackendApi(useMock: boolean = false): BackendApiService {
  return useMock ? new MockBackendApiService() : new BackendApiService();
}