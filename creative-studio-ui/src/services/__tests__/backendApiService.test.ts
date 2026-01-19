/**
 * Tests for Backend API Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BackendApiService,
  MockBackendApiService,
  createBackendApi,
} from '../backendApiService';
import type { Project, GenerationTask } from '@/types';

// Mock fetch
global.fetch = vi.fn();

describe('BackendApiService', () => {
  let apiService: BackendApiService;
  let mockProject: Project;
  let mockTask: GenerationTask;

  beforeEach(() => {
    apiService = new BackendApiService({
      baseUrl: 'http://test-api.com',
      timeout: 5000,
      retryAttempts: 2,
    });

    mockProject = {
      schema_version: '1.0',
      project_name: 'Test Project',
      shots: [],
      assets: [],
      capabilities: {
        grid_generation: true,
        promotion_engine: true,
        qa_engine: true,
        autofix_engine: true,
      },
      generation_status: {
        grid: 'pending',
        promotion: 'pending',
      },
    };

    mockTask = {
      id: 'task-1',
      shotId: 'shot-1',
      type: 'grid',
      status: 'pending',
      priority: 1,
      createdAt: new Date(),
    };

    vi.clearAllMocks();
  });

  describe('submitProject', () => {
    it('should submit project successfully', async () => {
      const mockResponse = {
        taskId: 'task-123',
        status: 'pending',
        message: 'Project submitted',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiService.submitProject(mockProject);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/api/generate',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockProject),
        })
      );
    });

    it('should handle API error response', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Invalid project' }),
      });

      const result = await apiService.submitProject(mockProject);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid project');
    });

    it('should handle network error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error('Network error')
      );

      const result = await apiService.submitProject(mockProject);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
    });
  });

  describe('submitTask', () => {
    it('should submit task successfully', async () => {
      const mockResponse = {
        taskId: 'task-1',
        status: 'pending',
        message: 'Task submitted',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiService.submitTask(mockTask, mockProject);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
    });

    it('should send task and project context', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      await apiService.submitTask(mockTask, mockProject);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/api/tasks',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ task: mockTask, project: mockProject }),
        })
      );
    });
  });

  describe('getTaskStatus', () => {
    it('should get task status successfully', async () => {
      const mockStatus = {
        taskId: 'task-1',
        status: 'processing',
        progress: 50,
        message: 'Processing...',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockStatus,
      });

      const result = await apiService.getTaskStatus('task-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStatus);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/api/tasks/task-1',
        expect.any(Object)
      );
    });

    it('should handle status check error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Task not found' }),
      });

      const result = await apiService.getTaskStatus('task-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Task not found');
    });
  });

  describe('cancelTask', () => {
    it('should cancel task successfully', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      });

      const result = await apiService.cancelTask('task-1');

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/api/tasks/task-1/cancel',
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('should handle cancellation error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Cannot cancel completed task' }),
      });

      const result = await apiService.cancelTask('task-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Cannot cancel completed task');
    });
  });

  describe('getProjectTasks', () => {
    it('should get project tasks successfully', async () => {
      const mockTasks = [mockTask];

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasks,
      });

      const result = await apiService.getProjectTasks('Test Project');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockTasks);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/api/projects/Test%20Project/tasks',
        expect.any(Object)
      );
    });

    it('should encode project name in URL', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      });

      await apiService.getProjectTasks('My Project!');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('My%20Project%21'),
        expect.any(Object)
      );
    });
  });

  describe('invokeCliCommand', () => {
    it('should invoke CLI command successfully', async () => {
      const mockOutput = {
        command: 'grid',
        output: 'Grid generated successfully',
      };

      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockOutput,
      });

      const result = await apiService.invokeCliCommand('grid', { project: 'test' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockOutput);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://test-api.com/api/cli',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ command: 'grid', args: { project: 'test' } }),
        })
      );
    });

    it('should handle CLI command error', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Command failed' }),
      });

      const result = await apiService.invokeCliCommand('grid', {});

      expect(result.success).toBe(false);
      expect(result.error).toBe('Command failed');
    });
  });

  describe('retry logic', () => {
    it('should retry on network failure', async () => {
      (global.fetch as ReturnType<typeof vi.fn>)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ taskId: 'task-1' }),
        });

      const result = await apiService.submitProject(mockProject);

      expect(result.success).toBe(true);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Network error')
      );

      const result = await apiService.submitProject(mockProject);

      expect(result.success).toBe(false);
      expect(global.fetch).toHaveBeenCalledTimes(2); // retryAttempts = 2
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customService = new BackendApiService({
        baseUrl: 'http://custom.com',
        timeout: 10000,
        retryAttempts: 5,
      });

      const config = customService.getConfig();

      expect(config.baseUrl).toBe('http://custom.com');
      expect(config.timeout).toBe(10000);
      expect(config.retryAttempts).toBe(5);
    });

    it('should update configuration', () => {
      apiService.updateConfig({ baseUrl: 'http://new-url.com' });

      const config = apiService.getConfig();

      expect(config.baseUrl).toBe('http://new-url.com');
    });
  });
});

describe('MockBackendApiService', () => {
  let mockService: MockBackendApiService;
  let mockProject: Project;

  beforeEach(() => {
    mockService = new MockBackendApiService();
    mockService.setMockDelay(10); // Fast for tests

    mockProject = {
      schema_version: '1.0',
      project_name: 'Test Project',
      shots: [],
      assets: [],
      capabilities: {
        grid_generation: true,
        promotion_engine: true,
        qa_engine: true,
        autofix_engine: true,
      },
      generation_status: {
        grid: 'pending',
        promotion: 'pending',
      },
    };
  });

  it('should submit project with mock response', async () => {
    const result = await mockService.submitProject(mockProject);

    expect(result.success).toBe(true);
    expect(result.data?.taskId).toBeDefined();
    expect(result.data?.status).toBe('pending');
  });

  it('should get task status with mock data', async () => {
    const result = await mockService.getTaskStatus('task-1');

    expect(result.success).toBe(true);
    expect(result.data?.taskId).toBe('task-1');
    expect(result.data?.progress).toBeGreaterThanOrEqual(0);
    expect(result.data?.progress).toBeLessThanOrEqual(100);
  });

  it('should cancel task successfully', async () => {
    const result = await mockService.cancelTask('task-1');

    expect(result.success).toBe(true);
  });

  it('should invoke CLI command with mock output', async () => {
    const result = await mockService.invokeCliCommand('grid', { project: 'test' });

    expect(result.success).toBe(true);
    expect(result.data?.command).toBe('grid');
    expect(result.data?.output).toContain('mock');
  });
});

describe('createBackendApi', () => {
  it('should create mock service when requested', () => {
    const service = createBackendApi(true);

    expect(service).toBeInstanceOf(MockBackendApiService);
  });

  it('should create real service by default', () => {
    const service = createBackendApi(false);

    expect(service).toBeInstanceOf(BackendApiService);
    expect(service).not.toBeInstanceOf(MockBackendApiService);
  });
});
