// ============================================================================
// MCP Hooks Tests
// ============================================================================

import { renderHook, act, waitFor } from '@testing-library/react';
import { useMCPAddon, useMCPServers, useMCPConfig } from '../hooks';
import { useAddonStore } from '@/stores/addonStore';

// Mock the store
jest.mock('@/stores/addonStore');

const mockUseAddonStore = useAddonStore as jest.MockedFunction<typeof useAddonStore>;

describe('MCP Hooks', () => {
  beforeEach(() => {
    // Reset mock state before each test
    mockUseAddonStore.mockReturnValue({
      mcpAddon: {
        addon: {
          id: 'mcp-server',
          name: 'MCP Server Integration',
          version: '1.0.0',
          description: 'Test MCP addon',
          author: 'Test Author',
          enabled: false,
          permissions: ['read:project', 'write:project'],
          config: {},
          metadata: {
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            category: 'integration',
            tags: ['mcp', 'test'],
          },
          type: 'mcp-server',
          mcp: {
            servers: [],
            defaultServer: undefined,
          },
        },
        isLoading: false,
        error: null,
        servers: [],
        selectedServer: null,
        testResults: [],
      },
      mcpManager: {
        getState: jest.fn(),
        subscribe: jest.fn(),
      } as any,
      toggleMCPAddon: jest.fn(),
      addMCPServer: jest.fn(),
      updateMCPServer: jest.fn(),
      removeMCPServer: jest.fn(),
      testMCPServer: jest.fn(),
      setSelectedMCPServer: jest.fn(),
      updateMCPConfig: jest.fn(),
      clearError: jest.fn(),
      addons: new Map(),
      registerAddon: jest.fn(),
      unregisterAddon: jest.fn(),
      enableAddon: jest.fn(),
      disableAddon: jest.fn(),
      updateAddonConfig: jest.fn(),
      isLoading: false,
      globalError: null,
      clearError: jest.fn(),
      reset: jest.fn(),
    });
  });

  describe('useMCPAddon', () => {
    it('should return MCP addon state and actions', () => {
      const { result } = renderHook(() => useMCPAddon());
      
      expect(result.current.addon).toBeDefined();
      expect(result.current.addon?.id).toBe('mcp-server');
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.enable).toBeDefined();
      expect(result.current.disable).toBeDefined();
      expect(result.current.updateConfig).toBeDefined();
      expect(result.current.servers).toEqual([]);
      expect(result.current.selectedServer).toBeNull();
    });

    it('should enable addon', async () => {
      const { result } = renderHook(() => useMCPAddon());
      
      await act(async () => {
        await result.current.enable();
      });
      
      expect(mockUseAddonStore().toggleMCPAddon).toHaveBeenCalledWith(true);
    });

    it('should disable addon', async () => {
      const { result } = renderHook(() => useMCPAddon());
      
      await act(async () => {
        await result.current.disable();
      });
      
      expect(mockUseAddonStore().toggleMCPAddon).toHaveBeenCalledWith(false);
    });

    it('should update config', async () => {
      const { result } = renderHook(() => useMCPAddon());
      const testConfig = { defaultTimeout: 60000 };
      
      await act(async () => {
        await result.current.updateConfig(testConfig);
      });
      
      expect(mockUseAddonStore().updateMCPConfig).toHaveBeenCalledWith(testConfig);
    });
  });

  describe('useMCPServers', () => {
    it('should return servers state and actions', () => {
      const mockServers = [
        {
          id: 'server-1',
          name: 'Test Server',
          endpoint: 'https://api.example.com/mcp',
          timeout: 30000,
          maxRetries: 3,
          enabled: true,
          status: 'connected',
          capabilities: ['text-generation'],
        },
      ];
      
      mockUseAddonStore.mockReturnValue({
        ...mockUseAddonStore(),
        mcpAddon: {
          ...mockUseAddonStore().mcpAddon,
          servers: mockServers,
          selectedServer: 'server-1',
        },
      });
      
      const { result } = renderHook(() => useMCPServers());
      
      expect(result.current.servers).toEqual(mockServers);
      expect(result.current.selectedServer).toBe('server-1');
      expect(result.current.addServer).toBeDefined();
      expect(result.current.updateServer).toBeDefined();
      expect(result.current.removeServer).toBeDefined();
      expect(result.current.testServer).toBeDefined();
      expect(result.current.setSelectedServer).toBeDefined();
    });

    it('should get server by id', () => {
      const mockServers = [
        {
          id: 'server-1',
          name: 'Test Server',
          endpoint: 'https://api.example.com/mcp',
          timeout: 30000,
          maxRetries: 3,
          enabled: true,
          status: 'connected',
          capabilities: ['text-generation'],
        },
      ];
      
      mockUseAddonStore.mockReturnValue({
        ...mockUseAddonStore(),
        mcpAddon: {
          ...mockUseAddonStore().mcpAddon,
          servers: mockServers,
        },
      });
      
      const { result } = renderHook(() => useMCPServers());
      
      const server = result.current.getServerById('server-1');
      expect(server).toEqual(mockServers[0]);
      
      const nonExistent = result.current.getServerById('non-existent');
      expect(nonExistent).toBeNull();
    });

    it('should get selected server', () => {
      const mockServers = [
        {
          id: 'server-1',
          name: 'Test Server',
          endpoint: 'https://api.example.com/mcp',
          timeout: 30000,
          maxRetries: 3,
          enabled: true,
          status: 'connected',
          capabilities: ['text-generation'],
        },
      ];
      
      mockUseAddonStore.mockReturnValue({
        ...mockUseAddonStore(),
        mcpAddon: {
          ...mockUseAddonStore().mcpAddon,
          servers: mockServers,
          selectedServer: 'server-1',
        },
      });
      
      const { result } = renderHook(() => useMCPServers());
      
      const selectedServer = result.current.getSelectedServer();
      expect(selectedServer).toEqual(mockServers[0]);
    });

    it('should get connected servers', () => {
      const mockServers = [
        {
          id: 'server-1',
          name: 'Connected Server',
          endpoint: 'https://api.example.com/mcp',
          timeout: 30000,
          maxRetries: 3,
          enabled: true,
          status: 'connected',
          capabilities: ['text-generation'],
        },
        {
          id: 'server-2',
          name: 'Disconnected Server',
          endpoint: 'https://api.example.com/mcp2',
          timeout: 30000,
          maxRetries: 3,
          enabled: true,
          status: 'disconnected',
          capabilities: ['text-generation'],
        },
      ];
      
      mockUseAddonStore.mockReturnValue({
        ...mockUseAddonStore(),
        mcpAddon: {
          ...mockUseAddonStore().mcpAddon,
          servers: mockServers,
        },
      });
      
      const { result } = renderHook(() => useMCPServers());
      
      const connectedServers = result.current.getConnectedServers();
      expect(connectedServers).toHaveLength(1);
      expect(connectedServers[0].status).toBe('connected');
    });
  });

  describe('useMCPConfig', () => {
    it('should return config state and actions', () => {
      const mockConfig = {
        defaultTimeout: 60000,
        maxConcurrent: 5,
        retryDelay: 1000,
        logLevel: 'info',
      };
      
      mockUseAddonStore.mockReturnValue({
        ...mockUseAddonStore(),
        mcpAddon: {
          ...mockUseAddonStore().mcpAddon,
          addon: {
            ...mockUseAddonStore().mcpAddon.addon,
            config: mockConfig,
          },
        },
      });
      
      const { result } = renderHook(() => useMCPConfig());
      
      expect(result.current.config).toEqual(mockConfig);
      expect(result.current.updateConfig).toBeDefined();
      expect(result.current.resetConfig).toBeDefined();
    });

    it('should update config', async () => {
      const { result } = renderHook(() => useMCPConfig());
      const testConfig = { defaultTimeout: 120000 };
      
      await act(async () => {
        await result.current.updateConfig(testConfig);
      });
      
      expect(mockUseAddonStore().updateMCPConfig).toHaveBeenCalledWith(testConfig);
    });

    it('should reset config', async () => {
      const { result } = renderHook(() => useMCPConfig());
      
      await act(async () => {
        await result.current.resetConfig();
      });
      
      expect(mockUseAddonStore().updateMCPConfig).toHaveBeenCalledWith({});
    });
  });

  describe('Error Handling', () => {
    it('should handle errors correctly', () => {
      const mockError = 'Test error message';
      
      mockUseAddonStore.mockReturnValue({
        ...mockUseAddonStore(),
        globalError: mockError,
      });
      
      const { result } = renderHook(() => useMCPAddon());
      
      expect(result.current.error).toBe(mockError);
      expect(result.current.hasError).toBe(true);
    });

    it('should clear errors', () => {
      const mockError = 'Test error message';
      
      mockUseAddonStore.mockReturnValue({
        ...mockUseAddonStore(),
        globalError: mockError,
      });
      
      const { result } = renderHook(() => useMCPAddon());
      
      act(() => {
        result.current.clearError();
      });
      
      expect(mockUseAddonStore().clearError).toHaveBeenCalled();
    });
  });
});