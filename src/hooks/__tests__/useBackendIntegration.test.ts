/**
 * Tests for useBackendIntegration Hook
 */

import { renderHook, act } from '@testing-library/react-hooks';
import { useBackendIntegration } from '../useBackendIntegration';
import { BackendApiService, MockBackendApiService } from '../../services/backendApiService';

// Mock the BackendApiService
jest.mock('../../services/backendApiService', () => ({
  BackendApiService: jest.fn().mockImplementation(() => ({
    submitProject: jest.fn().mockResolvedValue({ success: true, data: { taskId: 'test-task-id' } }),
    submitTask: jest.fn().mockResolvedValue({ success: true, data: { taskId: 'test-task-id' } }),
    getTaskStatus: jest.fn().mockResolvedValue({ success: true, data: { status: 'processing', progress: 50 } }),
    cancelTask: jest.fn().mockResolvedValue({ success: true, data: { success: true } }),
    invokeCliCommand: jest.fn().mockResolvedValue({ success: true, data: { output: 'command output' } }),
  })),
  MockBackendApiService: jest.fn().mockImplementation(() => ({
    submitProject: jest.fn().mockResolvedValue({ success: true, data: { taskId: 'mock-task-id' } }),
    submitTask: jest.fn().mockResolvedValue({ success: true, data: { taskId: 'mock-task-id' } }),
    getTaskStatus: jest.fn().mockResolvedValue({ success: true, data: { status: 'processing', progress: 50 } }),
    cancelTask: jest.fn().mockResolvedValue({ success: true, data: { success: true } }),
    invokeCliCommand: jest.fn().mockResolvedValue({ success: true, data: { output: 'mock command output' } }),
  })),
}));

describe('useBackendIntegration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('with real service', () => {
    it('should submit a project successfully', async () => {
      const { result } = renderHook(() => useBackendIntegration({ useMock: false }));

      await act(async () => {
        const success = await result.current.submitProject({ name: 'Test Project' });
        expect(success).toBe(true);
        expect(result.current.isSubmitting).toBe(false);
        expect(result.current.error).toBeNull();
      });
    });

    it('should handle project submission failure', async () => {
      // Mock a failure
      (BackendApiService as jest.Mock).mockImplementationOnce(() => ({
        submitProject: jest.fn().mockResolvedValue({ success: false, error: 'Submission failed' }),
      }));

      const { result } = renderHook(() => useBackendIntegration({ useMock: false }));

      await act(async () => {
        const success = await result.current.submitProject({ name: 'Test Project' });
        expect(success).toBe(false);
        expect(result.current.error).toBe('Submission failed');
      });
    });

    it('should submit a task successfully', async () => {
      const { result } = renderHook(() => useBackendIntegration({ useMock: false }));

      await act(async () => {
        const success = await result.current.submitTask({
          taskId: 'test-task-id',
          projectName: 'Test Project',
          type: 'grid',
          status: 'pending',
          createdAt: new Date(),
        });
        expect(success).toBe(true);
      });
    });

    it('should get task status successfully', async () => {
      const { result } = renderHook(() => useBackendIntegration({ useMock: false }));

      await act(async () => {
        const response = await result.current.getTaskStatus('test-task-id');
        expect(response.success).toBe(true);
        expect(response.data?.status).toBe('processing');
      });
    });

    it('should cancel task successfully', async () => {
      const { result } = renderHook(() => useBackendIntegration({ useMock: false }));

      await act(async () => {
        const response = await result.current.cancelTask('test-task-id');
        expect(response.success).toBe(true);
      });
    });

    it('should invoke CLI command successfully', async () => {
      const { result } = renderHook(() => useBackendIntegration({ useMock: false }));

      await act(async () => {
        const response = await result.current.invokeCliCommand('test-command');
        expect(response.success).toBe(true);
        expect(response.data?.output).toBe('command output');
      });
    });
  });

  describe('with mock service', () => {
    it('should submit a project with mock service', async () => {
      const { result } = renderHook(() => useBackendIntegration({ useMock: true }));

      await act(async () => {
        const success = await result.current.submitProject({ name: 'Test Project' });
        expect(success).toBe(true);
        expect(result.current.isSubmitting).toBe(false);
      });
    });

    it('should submit a task with mock service', async () => {
      const { result } = renderHook(() => useBackendIntegration({ useMock: true }));

      await act(async () => {
        const success = await result.current.submitTask({
          taskId: 'test-task-id',
          projectName: 'Test Project',
          type: 'grid',
          status: 'pending',
          createdAt: new Date(),
        });
        expect(success).toBe(true);
      });
    });

    it('should get task status with mock service', async () => {
      const { result } = renderHook(() => useBackendIntegration({ useMock: true }));

      await act(async () => {
        const response = await result.current.getTaskStatus('test-task-id');
        expect(response.success).toBe(true);
        expect(response.data?.status).toBe('processing');
      });
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      // Mock an error
      (BackendApiService as jest.Mock).mockImplementationOnce(() => ({
        submitProject: jest.fn().mockRejectedValue(new Error('Network error')),
      }));

      const { result } = renderHook(() => useBackendIntegration({ useMock: false }));

      await act(async () => {
        const success = await result.current.submitProject({ name: 'Test Project' });
        expect(success).toBe(false);
        expect(result.current.error).toBe('Network error');
      });
    });

    it('should clear errors', async () => {
      // Mock an error
      (BackendApiService as jest.Mock).mockImplementationOnce(() => ({
        submitProject: jest.fn().mockRejectedValue(new Error('Network error')),
      }));

      const { result } = renderHook(() => useBackendIntegration({ useMock: false }));

      await act(async () => {
        await result.current.submitProject({ name: 'Test Project' });
        expect(result.current.error).toBe('Network error');

        result.current.clearError();
        expect(result.current.error).toBeNull();
      });
    });
  });
});