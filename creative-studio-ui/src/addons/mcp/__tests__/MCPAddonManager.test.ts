// ============================================================================
// MCP Addon Manager Tests
// ============================================================================

import { MCPAddonManager } from '../MCPAddonManager';
import type { MCPServerConfig, MCPAddonState } from '@/types/addons';

describe('MCPAddonManager', () => {
  let manager: MCPAddonManager;

  beforeEach(() => {
    manager = new MCPAddonManager();
  });

  describe('Constructor', () => {
    it('should initialize with default addon state', () => {
      const state = manager.getState();
      
      expect(state.addon).toBeDefined();
      expect(state.addon.id).toBe('mcp-server');
      expect(state.addon.name).toBe('MCP Server Integration');
      expect(state.addon.enabled).toBe(false);
      expect(state.addon.permissions).toBeDefined();
      expect(state.addon.permissions.length).toBeGreaterThan(0);
      expect(state.isLoading).toBe(false);
      expect(state.error).toBeNull();
    });

    it('should initialize with custom addon partial', () => {
      const customAddon = {
        id: 'custom-mcp',
        name: 'Custom MCP Server',
        enabled: true,
      };
      
      const customManager = new MCPAddonManager(customAddon);
      const state = customManager.getState();
      
      expect(state.addon.id).toBe('custom-mcp');
      expect(state.addon.name).toBe('Custom MCP Server');
      expect(state.addon.enabled).toBe(true);
    });
  });

  describe('State Management', () => {
    it('should notify listeners when state changes', () => {
      const listener = jest.fn();
      manager.subscribe(listener);
      
      // Initial state should trigger listener
      expect(listener).toHaveBeenCalledWith(manager.getState());
      
      // State change should trigger listener
      manager['setState']({ ...manager.getState(), isLoading: true });
      expect(listener).toHaveBeenCalledTimes(2);
    });

    it('should unsubscribe listeners correctly', () => {
      const listener = jest.fn();
      const unsubscribe = manager.subscribe(listener);
      
      unsubscribe();
      manager['setState']({ ...manager.getState(), isLoading: true });
      
      // Listener should not be called after unsubscribe
      expect(listener).toHaveBeenCalledTimes(1);
    });
  });

  describe('Toggle Addon', () => {
    it('should enable addon when disabled', async () => {
      const state = manager.getState();
      expect(state.addon.enabled).toBe(false);
      
      await manager.toggleAddon(true);
      const updatedState = manager.getState();
      
      expect(updatedState.addon.enabled).toBe(true);
      expect(updatedState.isLoading).toBe(false);
    });

    it('should disable addon when enabled', async () => {
      // First enable the addon
      await manager.toggleAddon(true);
      
      const state = manager.getState();
      expect(state.addon.enabled).toBe(true);
      
      await manager.toggleAddon(false);
      const updatedState = manager.getState();
      
      expect(updatedState.addon.enabled).toBe(false);
      expect(updatedState.isLoading).toBe(false);
    });

    it('should handle errors during toggle', async () => {
      // Mock the delay function to throw an error
      jest.spyOn(manager as any, 'delay').mockRejectedValue(new Error('Test error'));
      
      await expect(manager.toggleAddon(true)).rejects.toThrow('Test error');
      
      const state = manager.getState();
      expect(state.error).toBe('Test error');
      expect(state.isLoading).toBe(false);
    });
  });

  describe('Server Management', () => {
    const mockServerConfig: Omit<MCPServerConfig, 'id'> = {
      name: 'Test Server',
      endpoint: 'https://api.example.com/mcp',
      timeout: 30000,
      maxRetries: 3,
      enabled: true,
      status: 'disconnected',
      capabilities: ['text-generation'],
    };

    describe('Add Server', () => {
      it('should add a new server successfully', async () => {
        const initialServers = manager.getState().servers;
        expect(initialServers).toHaveLength(0);
        
        await manager.addServer(mockServerConfig);
        const state = manager.getState();
        
        expect(state.servers).toHaveLength(1);
        expect(state.servers[0].name).toBe('Test Server');
        expect(state.servers[0].endpoint).toBe('https://api.example.com/mcp');
        expect(state.servers[0].id).toBeDefined();
      });

      it('should test server connection when adding', async () => {
        const testSpy = jest.spyOn(manager, 'testServer');
        
        await manager.addServer(mockServerConfig);
        
        expect(testSpy).toHaveBeenCalledWith(expect.any(String));
      });

      it('should handle errors when adding server', async () => {
        jest.spyOn(manager as any, 'delay').mockRejectedValue(new Error('Add error'));
        
        await expect(manager.addServer(mockServerConfig)).rejects.toThrow('Add error');
        
        const state = manager.getState();
        expect(state.error).toBe('Add error');
      });
    });

    describe('Update Server', () => {
      it('should update existing server', async () => {
        await manager.addServer(mockServerConfig);
        const server = manager.getState().servers[0];
        
        await manager.updateServer(server.id, { 
          name: 'Updated Server',
          timeout: 60000,
        });
        
        const state = manager.getState();
        expect(state.servers[0].name).toBe('Updated Server');
        expect(state.servers[0].timeout).toBe(60000);
      });

      it('should handle errors when updating server', async () => {
        await manager.addServer(mockServerConfig);
        const server = manager.getState().servers[0];
        
        jest.spyOn(manager as any, 'delay').mockRejectedValue(new Error('Update error'));
        
        await expect(manager.updateServer(server.id, { name: 'Test' }))
          .rejects.toThrow('Update error');
      });
    });

    describe('Remove Server', () => {
      it('should remove server successfully', async () => {
        await manager.addServer(mockServerConfig);
        const server = manager.getState().servers[0];
        
        await manager.removeServer(server.id);
        
        const state = manager.getState();
        expect(state.servers).toHaveLength(0);
      });

      it('should clear selected server when removing it', async () => {
        await manager.addServer(mockServerConfig);
        const server = manager.getState().servers[0];
        
        manager.setSelectedServer(server.id);
        expect(manager.getState().selectedServer).toBe(server.id);
        
        await manager.removeServer(server.id);
        
        expect(manager.getState().selectedServer).toBeNull();
      });

      it('should handle errors when removing server', async () => {
        await manager.addServer(mockServerConfig);
        const server = manager.getState().servers[0];
        
        jest.spyOn(manager as any, 'delay').mockRejectedValue(new Error('Remove error'));
        
        await expect(manager.removeServer(server.id)).rejects.toThrow('Remove error');
      });
    });

    describe('Test Server', () => {
      it('should test server connection', async () => {
        await manager.addServer(mockServerConfig);
        const server = manager.getState().servers[0];
        
        await manager.testServer(server.id);
        
        const state = manager.getState();
        expect(state.testResults).toHaveLength(1);
        expect(state.testResults[0].serverId).toBe(server.id);
      });

      it('should handle server test errors', async () => {
        jest.spyOn(manager as any, 'delay').mockRejectedValue(new Error('Test error'));
        
        await expect(manager.testServer('non-existent')).rejects.toThrow('Test error');
      });
    });
  });

  describe('Utility Methods', () => {
    const mockServerConfig: Omit<MCPServerConfig, 'id'> = {
      name: 'Test Server',
      endpoint: 'https://api.example.com/mcp',
      timeout: 30000,
      maxRetries: 3,
      enabled: true,
      status: 'connected',
      capabilities: ['text-generation'],
    };

    beforeEach(async () => {
      await manager.addServer(mockServerConfig);
    });

    it('should get server by id', () => {
      const server = manager.getServerById(manager.getState().servers[0].id);
      
      expect(server).toBeDefined();
      expect(server?.name).toBe('Test Server');
    });

    it('should return null for non-existent server', () => {
      const server = manager.getServerById('non-existent');
      
      expect(server).toBeNull();
    });

    it('should check if server exists', () => {
      const exists = manager.hasServer(manager.getState().servers[0].id);
      
      expect(exists).toBe(true);
      
      const notExists = manager.hasServer('non-existent');
      expect(notExists).toBe(false);
    });

    it('should get connected servers', () => {
      const connected = manager.getConnectedServers();
      
      expect(connected).toHaveLength(1);
      expect(connected[0].status).toBe('connected');
    });
  });

  describe('Configuration', () => {
    it('should update config successfully', async () => {
      await manager.updateConfig({ defaultTimeout: 60000 });
      
      const state = manager.getState();
      expect(state.addon.config.defaultTimeout).toBe(60000);
    });

    it('should handle config update errors', async () => {
      jest.spyOn(manager as any, 'delay').mockRejectedValue(new Error('Config error'));
      
      await expect(manager.updateConfig({})).rejects.toThrow('Config error');
    });
  });
});