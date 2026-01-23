/**
 * ComfyUI React Hook Tests
 *
 * Tests for the useComfyUI hook that provides UI integration
 * with ComfyUI services for connection management and generation.
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { useComfyUI } from '../useComfyUI';
import { getComfyUIServersService, resetComfyUIServersService } from '../../services/comfyuiServersService';
import { setupComfyUIMock, teardownComfyUIMock } from '../../__mocks__/comfyuiServerMock';

// Mock the ComfyUI services
jest.mock('../../services/comfyuiServersService');
jest.mock('../../services/comfyuiService');

const mockGetComfyUIServersService = getComfyUIServersService as jest.MockedFunction<typeof getComfyUIServersService>;
const mockResetComfyUIServersService = resetComfyUIServersService as jest.MockedFunction<typeof resetComfyUIServersService>;

describe('useComfyUI Hook', () => {
  let mockService: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock service
    mockService = {
      addServer: jest.fn(),
      updateServer: jest.fn(),
      deleteServer: jest.fn(),
      getServer: jest.fn(),
      getAllServers: jest.fn(),
      getActiveServer: jest.fn(),
      setActiveServer: jest.fn(),
      testServer: jest.fn(),
      testAllServers: jest.fn(),
      getAvailableServer: jest.fn(),
      getAutoSwitchOnFailure: jest.fn(),
      setAutoSwitchOnFailure: jest.fn(),
      getConfig: jest.fn(),
      exportConfig: jest.fn(),
      importConfig: jest.fn(),
      clearAll: jest.fn(),
    };

    mockGetComfyUIServersService.mockReturnValue(mockService);

    setupComfyUIMock({ port: 8188 });
  });

  afterEach(() => {
    teardownComfyUIMock();
    resetComfyUIServersService();
  });

  describe('Initial State', () => {
    it('should initialize with default state', () => {
      mockService.getAllServers.mockReturnValue([]);
      mockService.getActiveServer.mockReturnValue(null);
      mockService.getAutoSwitchOnFailure.mockReturnValue(false);

      const { result } = renderHook(() => useComfyUI());

      expect(result.current.servers).toEqual([]);
      expect(result.current.activeServer).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.autoSwitchOnFailure).toBe(false);
    });

    it('should load servers on mount', () => {
      const mockServers = [
        {
          id: 'server-1',
          name: 'Test Server',
          serverUrl: 'http://localhost:8188',
          authentication: { type: 'none' },
          isActive: true,
          status: 'connected',
        },
      ];

      mockService.getAllServers.mockReturnValue(mockServers);
      mockService.getActiveServer.mockReturnValue(mockServers[0]);

      const { result } = renderHook(() => useComfyUI());

      expect(result.current.servers).toEqual(mockServers);
      expect(result.current.activeServer).toEqual(mockServers[0]);
    });
  });

  describe('Server Management', () => {
    it('should add a new server', async () => {
      const newServer = {
        id: 'server-1',
        name: 'New Server',
        serverUrl: 'http://localhost:8188',
        authentication: { type: 'none' },
        isActive: false,
        status: 'disconnected',
      };

      mockService.addServer.mockResolvedValue(newServer);
      mockService.getAllServers.mockReturnValue([newServer]);

      const { result } = renderHook(() => useComfyUI());

      await act(async () => {
        await result.current.addServer({
          name: 'New Server',
          serverUrl: 'http://localhost:8188',
        });
      });

      expect(mockService.addServer).toHaveBeenCalledWith({
        name: 'New Server',
        serverUrl: 'http://localhost:8188',
      });
      expect(result.current.servers).toContain(newServer);
    });

    it('should update an existing server', async () => {
      const updatedServer = {
        id: 'server-1',
        name: 'Updated Server',
        serverUrl: 'http://localhost:8188',
        authentication: { type: 'none' },
        isActive: true,
        status: 'connected',
      };

      mockService.updateServer.mockResolvedValue(updatedServer);
      mockService.getAllServers.mockReturnValue([updatedServer]);

      const { result } = renderHook(() => useComfyUI());

      await act(async () => {
        await result.current.updateServer('server-1', {
          name: 'Updated Server',
        });
      });

      expect(mockService.updateServer).toHaveBeenCalledWith('server-1', {
        name: 'Updated Server',
      });
    });

    it('should delete a server', async () => {
      mockService.deleteServer.mockResolvedValue(true);
      mockService.getAllServers.mockReturnValue([]);

      const { result } = renderHook(() => useComfyUI());

      await act(async () => {
        const success = await result.current.deleteServer('server-1');
        expect(success).toBe(true);
      });

      expect(mockService.deleteServer).toHaveBeenCalledWith('server-1');
    });

    it('should set active server', async () => {
      mockService.setActiveServer.mockResolvedValue(true);

      const { result } = renderHook(() => useComfyUI());

      await act(async () => {
        const success = await result.current.setActiveServer('server-1');
        expect(success).toBe(true);
      });

      expect(mockService.setActiveServer).toHaveBeenCalledWith('server-1');
    });
  });

  describe('Connection Testing', () => {
    it('should test server connection', async () => {
      mockService.testServer.mockResolvedValue(true);

      const { result } = renderHook(() => useComfyUI());

      await act(async () => {
        const success = await result.current.testServer('server-1');
        expect(success).toBe(true);
      });

      expect(mockService.testServer).toHaveBeenCalledWith('server-1');
    });

    it('should test all servers', async () => {
      const testResults = new Map([
        ['server-1', true],
        ['server-2', false],
      ]);

      mockService.testAllServers.mockResolvedValue(testResults);

      const { result } = renderHook(() => useComfyUI());

      await act(async () => {
        const results = await result.current.testAllServers();
        expect(results).toEqual(testResults);
      });

      expect(mockService.testAllServers).toHaveBeenCalled();
    });

    it('should find available server', async () => {
      const availableServer = {
        id: 'server-1',
        name: 'Available Server',
        serverUrl: 'http://localhost:8188',
        authentication: { type: 'none' },
        isActive: true,
        status: 'connected',
      };

      mockService.getAvailableServer.mockResolvedValue(availableServer);

      const { result } = renderHook(() => useComfyUI());

      await act(async () => {
        const server = await result.current.getAvailableServer();
        expect(server).toEqual(availableServer);
      });

      expect(mockService.getAvailableServer).toHaveBeenCalled();
    });
  });

  describe('Configuration Management', () => {
    it('should toggle auto-switch on failure', () => {
      const { result } = renderHook(() => useComfyUI());

      act(() => {
        result.current.setAutoSwitchOnFailure(true);
      });

      expect(mockService.setAutoSwitchOnFailure).toHaveBeenCalledWith(true);

      act(() => {
        result.current.setAutoSwitchOnFailure(false);
      });

      expect(mockService.setAutoSwitchOnFailure).toHaveBeenCalledWith(false);
    });

    it('should export configuration', () => {
      const configJson = '{"servers":[],"version":"1.0"}';
      mockService.exportConfig.mockReturnValue(configJson);

      const { result } = renderHook(() => useComfyUI());

      act(() => {
        const exported = result.current.exportConfig();
        expect(exported).toBe(configJson);
      });

      expect(mockService.exportConfig).toHaveBeenCalled();
    });

    it('should import configuration', () => {
      const configJson = '{"servers":[],"version":"1.0"}';
      mockService.importConfig.mockReturnValue(true);

      const { result } = renderHook(() => useComfyUI());

      act(() => {
        const success = result.current.importConfig(configJson);
        expect(success).toBe(true);
      });

      expect(mockService.importConfig).toHaveBeenCalledWith(configJson);
    });

    it('should clear all servers', () => {
      const { result } = renderHook(() => useComfyUI());

      act(() => {
        result.current.clearAll();
      });

      expect(mockService.clearAll).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle add server errors', async () => {
      const error = new Error('Failed to add server');
      mockService.addServer.mockRejectedValue(error);

      const { result } = renderHook(() => useComfyUI());

      await act(async () => {
        try {
          await result.current.addServer({
            name: 'Failing Server',
            serverUrl: 'http://localhost:8188',
          });
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
      });
    });

    it('should handle connection test errors', async () => {
      const error = new Error('Connection failed');
      mockService.testServer.mockRejectedValue(error);

      const { result } = renderHook(() => useComfyUI());

      await act(async () => {
        try {
          await result.current.testServer('server-1');
        } catch (e) {
          // Expected to throw
        }
      });

      await waitFor(() => {
        expect(result.current.error).toEqual(error);
      });
    });

    it('should clear errors on successful operations', async () => {
      const error = new Error('Previous error');
      mockService.addServer.mockRejectedValueOnce(error).mockResolvedValueOnce({
        id: 'server-1',
        name: 'Server',
        serverUrl: 'http://localhost:8188',
        authentication: { type: 'none' },
        isActive: true,
        status: 'disconnected',
      });

      const { result } = renderHook(() => useComfyUI());

      // First call fails
      await act(async () => {
        try {
          await result.current.addServer({
            name: 'Failing Server',
            serverUrl: 'http://localhost:8188',
          });
        } catch (e) {
          // Expected to throw
        }
      });

      expect(result.current.error).toEqual(error);

      // Second call succeeds
      await act(async () => {
        await result.current.addServer({
          name: 'Success Server',
          serverUrl: 'http://localhost:8189',
        });
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Loading States', () => {
    it('should show loading during async operations', async () => {
      let resolveAddServer: (value: any) => void;
      const addServerPromise = new Promise((resolve) => {
        resolveAddServer = resolve;
      });

      mockService.addServer.mockReturnValue(addServerPromise);

      const { result } = renderHook(() => useComfyUI());

      act(() => {
        result.current.addServer({
          name: 'Loading Server',
          serverUrl: 'http://localhost:8188',
        });
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        resolveAddServer({
          id: 'server-1',
          name: 'Loading Server',
          serverUrl: 'http://localhost:8188',
          authentication: { type: 'none' },
          isActive: true,
          status: 'disconnected',
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('should handle multiple concurrent operations', async () => {
      const promises: Promise<any>[] = [];
      const resolves: ((value: any) => void)[] = [];

      // Create multiple pending promises
      for (let i = 0; i < 3; i++) {
        promises.push(new Promise((resolve) => {
          resolves.push(resolve);
        }));
      }

      mockService.addServer.mockReturnValueOnce(promises[0])
        .mockReturnValueOnce(promises[1])
        .mockReturnValueOnce(promises[2]);

      const { result } = renderHook(() => useComfyUI());

      // Start multiple operations
      act(() => {
        result.current.addServer({ name: 'Server 1', serverUrl: 'http://localhost:8188' });
        result.current.addServer({ name: 'Server 2', serverUrl: 'http://localhost:8189' });
        result.current.addServer({ name: 'Server 3', serverUrl: 'http://localhost:8190' });
      });

      expect(result.current.isLoading).toBe(true);

      // Resolve all promises
      resolves.forEach((resolve, index) => {
        act(() => {
          resolve({
            id: `server-${index + 1}`,
            name: `Server ${index + 1}`,
            serverUrl: `http://localhost:818${7 + index}`,
            authentication: { type: 'none' },
            isActive: index === 0,
            status: 'disconnected',
          });
        });
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });
  });

  describe('State Synchronization', () => {
    it('should refresh servers list after operations', async () => {
      const initialServers = [];
      const updatedServers = [
        {
          id: 'server-1',
          name: 'Added Server',
          serverUrl: 'http://localhost:8188',
          authentication: { type: 'none' },
          isActive: true,
          status: 'disconnected',
        },
      ];

      mockService.getAllServers.mockReturnValue(initialServers);
      mockService.addServer.mockResolvedValue(updatedServers[0]);

      // Update mock to return updated servers after add
      mockService.getAllServers.mockReturnValue(updatedServers);

      const { result } = renderHook(() => useComfyUI());

      expect(result.current.servers).toEqual(initialServers);

      await act(async () => {
        await result.current.addServer({
          name: 'Added Server',
          serverUrl: 'http://localhost:8188',
        });
      });

      expect(result.current.servers).toEqual(updatedServers);
    });

    it('should update active server when changed', async () => {
      const server1 = {
        id: 'server-1',
        name: 'Server 1',
        serverUrl: 'http://localhost:8188',
        authentication: { type: 'none' },
        isActive: true,
        status: 'connected',
      };

      const server2 = {
        id: 'server-2',
        name: 'Server 2',
        serverUrl: 'http://localhost:8189',
        authentication: { type: 'none' },
        isActive: false,
        status: 'disconnected',
      };

      mockService.getAllServers.mockReturnValue([server1, server2]);
      mockService.getActiveServer.mockReturnValue(server1);
      mockService.setActiveServer.mockResolvedValue(true);

      const { result } = renderHook(() => useComfyUI());

      expect(result.current.activeServer).toEqual(server1);

      // Update active server
      mockService.getActiveServer.mockReturnValue(server2);

      await act(async () => {
        await result.current.setActiveServer('server-2');
      });

      expect(result.current.activeServer).toEqual(server2);
    });
  });

  describe('Memory Management', () => {
    it('should cleanup on unmount', () => {
      const { unmount } = renderHook(() => useComfyUI());

      // Mock should still be available before unmount
      expect(mockGetComfyUIServersService).toHaveBeenCalled();

      unmount();

      // Hook should unmount without errors
      expect(() => unmount()).not.toThrow();
    });

    it('should handle service errors gracefully', () => {
      mockGetComfyUIServersService.mockImplementation(() => {
        throw new Error('Service initialization failed');
      });

      expect(() => {
        renderHook(() => useComfyUI());
      }).toThrow('Service initialization failed');
    });
  });
});
