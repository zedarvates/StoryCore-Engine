/**
 * ComfyUI Servers Service Unit Tests
 *
 * Tests for multi-server management including CRUD operations,
 * active server management, and automatic failover.
 */

import {
  ComfyUIServersService,
  getComfyUIServersService,
  resetComfyUIServersService,
  type ComfyUIServer,
  type CreateComfyUIServerInput,
} from '../comfyuiServersService';
import { setupComfyUIMock, teardownComfyUIMock } from '../../__mocks__/comfyuiServerMock';

// Mock localStorage for testing
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock as any;

describe('ComfyUI Servers Service', () => {
  let service: ComfyUIServersService;

  beforeEach(() => {
    jest.clearAllMocks();
    resetComfyUIServersService();
    service = getComfyUIServersService();

    // Clear localStorage mocks
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
  });

  afterEach(() => {
    resetComfyUIServersService();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = getComfyUIServersService();
      const instance2 = getComfyUIServersService();
      expect(instance1).toBe(instance2);
    });

    it('should reset instance correctly', () => {
      const instance1 = getComfyUIServersService();
      resetComfyUIServersService();
      const instance2 = getComfyUIServersService();
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('CRUD Operations', () => {
    it('should add a new server', () => {
      const input: CreateComfyUIServerInput = {
        name: 'Test Server',
        serverUrl: 'http://localhost:8188',
        authentication: { type: 'none' },
      };

      const server = service.addServer(input);

      expect(server).toBeDefined();
      expect(server.id).toBeDefined();
      expect(server.name).toBe('Test Server');
      expect(server.serverUrl).toBe('http://localhost:8188');
      expect(server.isActive).toBe(true); // First server is active
      expect(server.status).toBe('disconnected');
    });

    it('should generate unique IDs for servers', () => {
      const input1: CreateComfyUIServerInput = {
        name: 'Server 1',
        serverUrl: 'http://localhost:8188',
      };

      const input2: CreateComfyUIServerInput = {
        name: 'Server 2',
        serverUrl: 'http://localhost:8189',
      };

      const server1 = service.addServer(input1);
      const server2 = service.addServer(input2);

      expect(server1.id).not.toBe(server2.id);
      expect(server1.id).toMatch(/^server-\d+-/);
      expect(server2.id).toMatch(/^server-\d+-/);
    });

    it('should set first server as active automatically', () => {
      const input: CreateComfyUIServerInput = {
        name: 'First Server',
        serverUrl: 'http://localhost:8188',
      };

      const server = service.addServer(input);

      expect(server.isActive).toBe(true);
      expect(service.getActiveServerId()).toBe(server.id);
    });

    it('should not set subsequent servers as active', () => {
      service.addServer({
        name: 'First Server',
        serverUrl: 'http://localhost:8188',
      });

      const secondServer = service.addServer({
        name: 'Second Server',
        serverUrl: 'http://localhost:8189',
      });

      expect(secondServer.isActive).toBe(false);
      expect(service.getActiveServerId()).not.toBe(secondServer.id);
    });

    it('should update an existing server', () => {
      const server = service.addServer({
        name: 'Original Name',
        serverUrl: 'http://localhost:8188',
      });

      const updated = service.updateServer(server.id, {
        name: 'Updated Name',
        timeout: 5000,
      });

      expect(updated).toBeDefined();
      expect(updated?.name).toBe('Updated Name');
      expect(updated?.timeout).toBe(5000);
      expect(updated?.serverUrl).toBe('http://localhost:8188'); // Unchanged
    });

    it('should return null when updating non-existent server', () => {
      const result = service.updateServer('non-existent-id', {
        name: 'Updated Name',
      });

      expect(result).toBeNull();
    });

    it('should delete an existing server', () => {
      const server = service.addServer({
        name: 'Server to Delete',
        serverUrl: 'http://localhost:8188',
      });

      const success = service.deleteServer(server.id);

      expect(success).toBe(true);
      expect(service.getServer(server.id)).toBeUndefined();
      expect(service.getServerCount()).toBe(0);
    });

    it('should return false when deleting non-existent server', () => {
      const success = service.deleteServer('non-existent-id');
      expect(success).toBe(false);
    });

    it('should transfer active status when deleting active server', () => {
      const server1 = service.addServer({
        name: 'Server 1',
        serverUrl: 'http://localhost:8188',
      });

      const server2 = service.addServer({
        name: 'Server 2',
        serverUrl: 'http://localhost:8189',
      });

      expect(service.getActiveServerId()).toBe(server1.id);

      service.deleteServer(server1.id);

      expect(service.getActiveServerId()).toBe(server2.id);
      expect(service.getActiveServer()?.isActive).toBe(true);
    });

    it('should get server by ID', () => {
      const server = service.addServer({
        name: 'Test Server',
        serverUrl: 'http://localhost:8188',
      });

      const retrieved = service.getServer(server.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe(server.id);
      expect(retrieved?.name).toBe('Test Server');
    });

    it('should return undefined for non-existent server', () => {
      const retrieved = service.getServer('non-existent-id');
      expect(retrieved).toBeUndefined();
    });

    it('should get all servers', () => {
      const server1 = service.addServer({
        name: 'Server 1',
        serverUrl: 'http://localhost:8188',
      });

      const server2 = service.addServer({
        name: 'Server 2',
        serverUrl: 'http://localhost:8189',
      });

      const allServers = service.getAllServers();

      expect(allServers).toHaveLength(2);
      expect(allServers).toContain(server1);
      expect(allServers).toContain(server2);
    });

    it('should get correct server count', () => {
      expect(service.getServerCount()).toBe(0);

      service.addServer({
        name: 'Server 1',
        serverUrl: 'http://localhost:8188',
      });

      expect(service.getServerCount()).toBe(1);

      service.addServer({
        name: 'Server 2',
        serverUrl: 'http://localhost:8189',
      });

      expect(service.getServerCount()).toBe(2);
    });
  });

  describe('Active Server Management', () => {
    it('should set active server', () => {
      const server1 = service.addServer({
        name: 'Server 1',
        serverUrl: 'http://localhost:8188',
      });

      const server2 = service.addServer({
        name: 'Server 2',
        serverUrl: 'http://localhost:8189',
      });

      expect(server1.isActive).toBe(true);
      expect(server2.isActive).toBe(false);

      const success = service.setActiveServer(server2.id);

      expect(success).toBe(true);
      expect(service.getActiveServerId()).toBe(server2.id);
      expect(service.getActiveServer()?.isActive).toBe(true);
      expect(server1.isActive).toBe(false);
    });

    it('should return false when setting non-existent server as active', () => {
      const success = service.setActiveServer('non-existent-id');
      expect(success).toBe(false);
    });

    it('should get active server', () => {
      const server = service.addServer({
        name: 'Active Server',
        serverUrl: 'http://localhost:8188',
      });

      const activeServer = service.getActiveServer();

      expect(activeServer).toBeDefined();
      expect(activeServer?.id).toBe(server.id);
    });

    it('should return null when no active server', () => {
      const activeServer = service.getActiveServer();
      expect(activeServer).toBeNull();
    });

    it('should get active server ID', () => {
      const server = service.addServer({
        name: 'Active Server',
        serverUrl: 'http://localhost:8188',
      });

      expect(service.getActiveServerId()).toBe(server.id);
    });

    it('should return null when no active server ID', () => {
      expect(service.getActiveServerId()).toBeNull();
    });
  });

  describe('Connection Testing', () => {
    beforeEach(() => {
      setupComfyUIMock({ port: 8188 });
    });

    afterEach(() => {
      teardownComfyUIMock();
    });

    it('should test server connection successfully', async () => {
      const server = service.addServer({
        name: 'Test Server',
        serverUrl: 'http://localhost:8188',
      });

      const success = await service.testServer(server.id);

      expect(success).toBe(true);

      const updatedServer = service.getServer(server.id);
      expect(updatedServer?.status).toBe('connected');
      expect(updatedServer?.lastConnected).toBeDefined();
      expect(updatedServer?.serverInfo).toBeDefined();
    });

    it('should handle connection failure', async () => {
      // Override fetch to simulate failure
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const server = service.addServer({
        name: 'Failing Server',
        serverUrl: 'http://nonexistent:8188',
      });

      const success = await service.testServer(server.id);

      expect(success).toBe(false);

      const updatedServer = service.getServer(server.id);
      expect(updatedServer?.status).toBe('error');
    });

    it('should test all servers', async () => {
      const server1 = service.addServer({
        name: 'Server 1',
        serverUrl: 'http://localhost:8188',
      });

      // Add a second server that will fail
      global.fetch = jest.fn()
        .mockImplementationOnce((url: string) => {
          if (url.includes('localhost:8188')) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve({
                system: { os: 'Linux', python_version: '3.10.12', pytorch_version: '2.1.1+cu121' },
                devices: [{ name: 'GPU', type: 'cuda', vram_total: 8192, vram_free: 8192 }],
              }),
            });
          }
          throw new Error('Network error');
        })
        .mockImplementation((url: string) => {
          throw new Error('Network error');
        });

      const server2 = service.addServer({
        name: 'Server 2',
        serverUrl: 'http://localhost:8189',
      });

      const results = await service.testAllServers();

      expect(results.get(server1.id)).toBe(true);
      expect(results.get(server2.id)).toBe(false);
    });

    it('should find available server', async () => {
      const server = service.addServer({
        name: 'Available Server',
        serverUrl: 'http://localhost:8188',
      });

      const availableServer = await service.getAvailableServer();

      expect(availableServer).toBeDefined();
      expect(availableServer?.id).toBe(server.id);
    });

    it('should prefer active server when available', async () => {
      const server1 = service.addServer({
        name: 'Server 1',
        serverUrl: 'http://localhost:8188',
      });

      const server2 = service.addServer({
        name: 'Server 2',
        serverUrl: 'http://localhost:8189',
      });

      // Set server2 as active
      service.setActiveServer(server2.id);

      // Mock server2 as available
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          system: { os: 'Linux', python_version: '3.10.12', pytorch_version: '2.1.1+cu121' },
          devices: [{ name: 'GPU', type: 'cuda', vram_total: 8192, vram_free: 8192 }],
        }),
      });

      const availableServer = await service.getAvailableServer();

      expect(availableServer?.id).toBe(server2.id);
    });

    it('should return null when no servers available', async () => {
      // Mock all connections as failed
      global.fetch = jest.fn().mockRejectedValue(new Error('Connection failed'));

      const server = service.addServer({
        name: 'Unavailable Server',
        serverUrl: 'http://localhost:8188',
      });

      const availableServer = await service.getAvailableServer();

      expect(availableServer).toBeNull();
    });
  });

  describe('Configuration Management', () => {
    it('should get auto-switch setting', () => {
      expect(service.getAutoSwitchOnFailure()).toBe(false);
    });

    it('should set auto-switch setting', () => {
      service.setAutoSwitchOnFailure(true);
      expect(service.getAutoSwitchOnFailure()).toBe(true);

      service.setAutoSwitchOnFailure(false);
      expect(service.getAutoSwitchOnFailure()).toBe(false);
    });

    it('should get full configuration', () => {
      const server = service.addServer({
        name: 'Test Server',
        serverUrl: 'http://localhost:8188',
      });

      const config = service.getConfig();

      expect(config).toBeDefined();
      expect(config.servers).toHaveLength(1);
      expect(config.servers[0].id).toBe(server.id);
      expect(config.activeServerId).toBe(server.id);
      expect(config.autoSwitchOnFailure).toBe(false);
      expect(config.version).toBe('1.0');
    });
  });

  describe('Persistence', () => {
    it('should save configuration to localStorage', () => {
      const server = service.addServer({
        name: 'Persistent Server',
        serverUrl: 'http://localhost:8188',
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'comfyui-servers',
        expect.any(String)
      );

      const savedData = JSON.parse(localStorageMock.setItem.mock.calls[0][1]);
      expect(savedData.servers).toHaveLength(1);
      expect(savedData.servers[0].id).toBe(server.id);
    });

    it('should load configuration from localStorage', () => {
      const mockConfig = {
        servers: [{
          id: 'loaded-server',
          name: 'Loaded Server',
          serverUrl: 'http://localhost:8188',
          authentication: { type: 'none' },
          isActive: true,
          status: 'disconnected',
        }],
        activeServerId: 'loaded-server',
        autoSwitchOnFailure: true,
        version: '1.0',
      };

      localStorageMock.getItem.mockReturnValue(JSON.stringify(mockConfig));

      // Create new service instance to test loading
      resetComfyUIServersService();
      const newService = getComfyUIServersService();

      expect(newService.getServerCount()).toBe(1);
      expect(newService.getActiveServerId()).toBe('loaded-server');
      expect(newService.getAutoSwitchOnFailure()).toBe(true);
    });

    it('should handle invalid localStorage data', () => {
      localStorageMock.getItem.mockReturnValue('invalid json');

      resetComfyUIServersService();
      const newService = getComfyUIServersService();

      // Should fall back to default config
      expect(newService.getServerCount()).toBe(0);
      expect(newService.getActiveServerId()).toBeNull();
    });

    it('should migrate old single-server config', () => {
      const oldConfig = {
        serverUrl: 'http://localhost:8188',
        authentication: { type: 'basic', username: 'user', password: 'pass' },
        maxQueueSize: 10,
        timeout: 30000,
        vramLimit: 8192,
        modelsPath: '/models',
        autoStart: true,
      };

      localStorageMock.getItem
        .mockReturnValueOnce(null) // First call for servers config
        .mockReturnValueOnce(JSON.stringify(oldConfig)); // Second call for old config

      resetComfyUIServersService();
      const newService = getComfyUIServersService();

      expect(newService.getServerCount()).toBe(1);

      const migratedServer = newService.getAllServers()[0];
      expect(migratedServer.serverUrl).toBe('http://localhost:8188');
      expect(migratedServer.authentication?.type).toBe('basic');
      expect(migratedServer.maxQueueSize).toBe(10);
    });
  });

  describe('Configuration Import/Export', () => {
    it('should export configuration as JSON', () => {
      const server = service.addServer({
        name: 'Export Test',
        serverUrl: 'http://localhost:8188',
      });

      const exported = service.exportConfig();

      expect(typeof exported).toBe('string');

      const parsed = JSON.parse(exported);
      expect(parsed.servers).toHaveLength(1);
      expect(parsed.servers[0].id).toBe(server.id);
    });

    it('should import valid configuration', () => {
      const importData = {
        servers: [{
          id: 'imported-server',
          name: 'Imported Server',
          serverUrl: 'http://localhost:8188',
          authentication: { type: 'none' },
          isActive: true,
          status: 'disconnected',
        }],
        activeServerId: 'imported-server',
        autoSwitchOnFailure: false,
        version: '1.0',
      };

      const success = service.importConfig(JSON.stringify(importData));

      expect(success).toBe(true);
      expect(service.getServerCount()).toBe(1);
      expect(service.getActiveServerId()).toBe('imported-server');
    });

    it('should reject invalid configuration', () => {
      const invalidData = {
        servers: 'not an array',
      };

      const success = service.importConfig(JSON.stringify(invalidData));

      expect(success).toBe(false);
      expect(service.getServerCount()).toBe(0);
    });

    it('should handle invalid JSON', () => {
      const success = service.importConfig('invalid json');

      expect(success).toBe(false);
    });
  });

  describe('Clear All Functionality', () => {
    it('should clear all servers', () => {
      service.addServer({
        name: 'Server 1',
        serverUrl: 'http://localhost:8188',
      });

      service.addServer({
        name: 'Server 2',
        serverUrl: 'http://localhost:8189',
      });

      expect(service.getServerCount()).toBe(2);

      service.clearAll();

      expect(service.getServerCount()).toBe(0);
      expect(service.getActiveServerId()).toBeNull();
    });
  });
});
