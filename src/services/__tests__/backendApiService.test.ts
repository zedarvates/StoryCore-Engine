/**
 * Tests for Backend API Service
 */

import { BackendApiService, MockBackendApiService, GenerationTask } from '../backendApiService';

describe('BackendApiService', () => {
  let service: BackendApiService;

  beforeEach(() => {
    service = new BackendApiService({ baseUrl: 'http://localhost:3000' });
  });

  describe('submitProject', () => {
    it('should submit a project successfully', async () => {
      // Mock fetch
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => ({ taskId: 'test-task-id', status: 'pending' }),
      });

      const result = await service.submitProject({ name: 'Test Project' });
      expect(result.success).toBe(true);
      expect(result.data?.taskId).toBe('test-task-id');
    });

    it('should handle submission failure', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        json: () => ({ error: 'Internal Server Error' }),
      });

      const result = await service.submitProject({ name: 'Test Project' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('500');
    });
  });

  describe('submitTask', () => {
    it('should submit a task successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => ({ taskId: 'test-task-id', status: 'pending' }),
      });

      const task: GenerationTask = {
        taskId: 'test-task-id',
        projectName: 'Test Project',
        type: 'grid',
        status: 'pending',
        createdAt: new Date(),
      };

      const result = await service.submitTask(task);
      expect(result.success).toBe(true);
      expect(result.data?.taskId).toBe('test-task-id');
    });
  });

  describe('getTaskStatus', () => {
    it('should get task status successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => ({ taskId: 'test-task-id', status: 'processing', progress: 50 }),
      });

      const result = await service.getTaskStatus('test-task-id');
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('processing');
      expect(result.data?.progress).toBe(50);
    });
  });

  describe('cancelTask', () => {
    it('should cancel task successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => ({ success: true }),
      });

      const result = await service.cancelTask('test-task-id');
      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(true);
    });
  });

  describe('getProjectTasks', () => {
    it('should get project tasks successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => [
          {
            taskId: 'task-1',
            projectName: 'Test Project',
            type: 'grid',
            status: 'completed',
            createdAt: new Date(),
          },
        ],
      });

      const result = await service.getProjectTasks('Test Project');
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
    });
  });

  describe('invokeCliCommand', () => {
    it('should invoke CLI command successfully', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => ({ output: 'Command output' }),
      });

      const result = await service.invokeCliCommand('test-command', { arg: 'value' });
      expect(result.success).toBe(true);
      expect(result.data?.output).toBe('Command output');
    });
  });
});

describe('MockBackendApiService', () => {
  let mockService: MockBackendApiService;

  beforeEach(() => {
    mockService = new MockBackendApiService();
  });

  describe('submitProject', () => {
    it('should submit a project with mock data', async () => {
      const result = await mockService.submitProject({ name: 'Test Project' });
      expect(result.success).toBe(true);
      expect(result.data?.taskId).toContain('mock-task-');
    });
  });

  describe('submitTask', () => {
    it('should submit a task with mock data', async () => {
      const task: GenerationTask = {
        taskId: 'test-task-id',
        projectName: 'Test Project',
        type: 'grid',
        status: 'pending',
        createdAt: new Date(),
      };

      const result = await mockService.submitTask(task);
      expect(result.success).toBe(true);
      expect(result.data?.taskId).toBe('test-task-id');
    });
  });

  describe('getTaskStatus', () => {
    it('should get task status with mock data', async () => {
      const result = await mockService.getTaskStatus('test-task-id');
      expect(result.success).toBe(true);
      expect(result.data?.status).toBe('processing');
      expect(result.data?.progress).toBeGreaterThan(0);
    });

    it('should complete task after multiple calls', async () => {
      // First call
      let result = await mockService.getTaskStatus('test-task-id');
      expect(result.data?.progress).toBeLessThan(100);

      // Multiple calls to simulate progress
      for (let i = 0; i < 10; i++) {
        result = await mockService.getTaskStatus('test-task-id');
      }

      expect(result.data?.status).toBe('completed');
      expect(result.data?.progress).toBe(100);
    });
  });

  describe('cancelTask', () => {
    it('should cancel task with mock data', async () => {
      const result = await mockService.cancelTask('test-task-id');
      expect(result.success).toBe(true);
      expect(result.data?.success).toBe(true);
    });
  });

  describe('getProjectTasks', () => {
    it('should get project tasks with mock data', async () => {
      const result = await mockService.getProjectTasks('Test Project');
      expect(result.success).toBe(true);
      expect(result.data?.length).toBe(1);
      expect(result.data?.[0].type).toBe('grid');
    });
  });

  describe('invokeCliCommand', () => {
    it('should invoke CLI command with mock data', async () => {
      const result = await mockService.invokeCliCommand('test-command');
      expect(result.success).toBe(true);
      expect(result.data?.output).toContain('test-command');
    });
  });
});

describe('createBackendApi', () => {
  it('should create a real backend API service', () => {
    const service = createBackendApi(false);
    expect(service).toBeInstanceOf(BackendApiService);
  });

  it('should create a mock backend API service', () => {
    const service = createBackendApi(true);
    expect(service).toBeInstanceOf(MockBackendApiService);
  });
});

// Helper function to create the service
function createBackendApi(useMock: boolean): BackendApiService | MockBackendApiService {
  return useMock ? new MockBackendApiService() : new BackendApiService();
}