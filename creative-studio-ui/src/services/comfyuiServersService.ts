/**
 * ComfyUI Multi-Server Management Service
 * 
 * Handles CRUD operations and management of multiple ComfyUI servers
 */

import type {
  ComfyUIServer,
  ComfyUIServersConfig,
  CreateComfyUIServerInput,
  UpdateComfyUIServerInput,
} from '@/types/comfyuiServers';
import { testComfyUIConnection } from './comfyuiService';
import { encryptValue, decryptValue } from '../utils/secureStorage';

const STORAGE_KEY = 'comfyui-servers';
const CONFIG_VERSION = '1.0';

/**
 * Generate unique ID for server
 */
function generateServerId(): string {
  return `server-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Get default configuration
 */
function getDefaultConfig(): ComfyUIServersConfig {
  const defaultServer: ComfyUIServer = {
    id: 'server-default',
    name: 'Local ComfyUI (8000)',
    serverUrl: 'http://127.0.0.1:8000',
    authentication: {
      type: 'none',
    },
    isActive: true,
    status: 'disconnected',
  };

  return {
    servers: [defaultServer],
    activeServerId: 'server-default',
    autoSwitchOnFailure: false,
    version: CONFIG_VERSION,
  };
}

/**
 * ComfyUI Servers Service
 */
export class ComfyUIServersService {
  private config: ComfyUIServersConfig;

  constructor() {
    this.config = getDefaultConfig();
  }

  /**
   * Initialize service (asynchronous)
   */
  public async initialize(): Promise<void> {
    this.config = await this.loadFromStorage();
    // Initial sync with backend
    await this.syncActiveServerToBackend();
  }

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Add a new server
   */
  addServer(input: CreateComfyUIServerInput): ComfyUIServer {
    const server: ComfyUIServer = {
      ...input,
      id: generateServerId(),
      isActive: this.config.servers.length === 0, // First server is active by default
      status: 'disconnected',
    };

    this.config.servers.push(server);

    // Set as active if it's the first server
    if (this.config.servers.length === 1) {
      this.config.activeServerId = server.id;
    }

    this.saveToStorage(); // Fire and forget or handle properly if needed
    this.syncActiveServerToBackend();
    return server;
  }

  /**
   * Update an existing server
   */
  updateServer(id: string, updates: UpdateComfyUIServerInput): ComfyUIServer | null {
    const index = this.config.servers.findIndex(s => s.id === id);
    if (index === -1) return null;

    this.config.servers[index] = {
      ...this.config.servers[index],
      ...updates,
    };

    this.saveToStorage();
    this.syncActiveServerToBackend();
    return this.config.servers[index];
  }

  /**
   * Delete a server
   */
  deleteServer(id: string): boolean {
    const index = this.config.servers.findIndex(s => s.id === id);
    if (index === -1) return false;

    this.config.servers.splice(index, 1);

    // If deleted server was active, set first server as active
    if (this.config.activeServerId === id) {
      this.config.activeServerId = this.config.servers.length > 0 
        ? this.config.servers[0].id 
        : null;
      
      if (this.config.servers.length > 0) {
        this.config.servers[0].isActive = true;
      }
    }

    this.saveToStorage();
    return true;
  }

  /**
   * Get a server by ID
   */
  getServer(id: string): ComfyUIServer | undefined {
    return this.config.servers.find(s => s.id === id);
  }

  /**
   * Get all servers
   */
  getAllServers(): ComfyUIServer[] {
    return [...this.config.servers];
  }

  /**
   * Get server count
   */
  getServerCount(): number {
    return this.config.servers.length;
  }

  // ============================================================================
  // Active Server Management
  // ============================================================================

  /**
   * Set active server
   */
  setActiveServer(id: string): boolean {
    const server = this.getServer(id);
    if (!server) return false;

    // Update all servers
    this.config.servers.forEach(s => {
      s.isActive = s.id === id;
    });

    this.config.activeServerId = id;
    this.saveToStorage();
    this.syncActiveServerToBackend();
    return true;
  }

  /**
   * Get active server
   */
  getActiveServer(): ComfyUIServer | null {
    if (!this.config.activeServerId) return null;
    return this.getServer(this.config.activeServerId) || null;
  }

  /**
   * Get active server ID
   */
  getActiveServerId(): string | null {
    return this.config.activeServerId;
  }

  /**
   * Get active server URL
   */
  getActiveServerUrl(): string | null {
    const server = this.getActiveServer();
    return server ? server.serverUrl : null;
  }

  // ============================================================================
  // Connection Testing
  // ============================================================================

  /**
   * Test connection to a specific server
   */
  async testServer(id: string): Promise<boolean> {
    const server = this.getServer(id);
    if (!server) return false;

    // Update status to testing
    this.updateServer(id, { status: 'testing' });

    try {
      // Handle MCP connection test
      if (server.authentication?.type === 'mcp') {
        try {
          const mcpOptions = {
            transport: server.mcpConfig?.transport || 'sse',
            serverUrl: server.serverUrl,
            serverPath: server.mcpConfig?.serverPath,
            serverArgs: server.mcpConfig?.serverArgs,
            env: server.mcpConfig?.env
          };
          
          await window.electronAPI.comfyui.connect(id, mcpOptions);
          const tools = await window.electronAPI.comfyui.listTools(id);
          
          if (tools && tools.length > 0) {
            this.updateServer(id, {
              status: 'connected',
              lastConnected: new Date().toISOString(),
              serverInfo: {
                version: 'MCP Enabled',
                availableWorkflows: [],
                availableModels: [],
                systemInfo: {
                  gpuName: 'MCP Gateway',
                  vramTotal: 0,
                  vramFree: 0
                }
              }
            });
            return true;
          }
        } catch (mcpError) {
          console.error(`MCP Connection failed for ${server.name}:`, mcpError);
          this.updateServer(id, { status: 'error' });
          return false;
        }
      }

      // Default ComfyUI connection test
      const result = await testComfyUIConnection({
        serverUrl: server.serverUrl,
        authentication: server.authentication,
        performance: {
          timeout: server.timeout ?? 300000,
          batchSize: 1,
          maxConcurrentJobs: 1,
        },
      });

      if (result.success && result.serverInfo) {
        this.updateServer(id, {
          status: 'connected',
          lastConnected: new Date().toISOString(),
          serverInfo: result.serverInfo,
        });
        return true;
      } else {
        this.updateServer(id, {
          status: result.isOffline ? 'disconnected' : 'error',
        });
        return false;
      }
    } catch {
      this.updateServer(id, {
        status: 'error',
      });
      return false;
    }
  }

  /**
   * Test all servers
   */
  async testAllServers(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    await Promise.all(
      this.config.servers.map(async (server) => {
        const success = await this.testServer(server.id);
        results.set(server.id, success);
      })
    );

    return results;
  }

  /**
   * Get first available (connected) server
   */
  async getAvailableServer(): Promise<ComfyUIServer | null> {
    // Try active server first
    const activeServer = this.getActiveServer();
    if (activeServer && activeServer.status === 'connected') {
      return activeServer;
    }

    // Try other connected servers
    const connectedServer = this.config.servers.find(s => s.status === 'connected');
    if (connectedServer) return connectedServer;

    // Test all servers to find an available one
    for (const server of this.config.servers) {
      const success = await this.testServer(server.id);
      if (success) return server;
    }

    return null;
  }

  // ============================================================================
  // Configuration Management
  // ============================================================================

  /**
   * Get auto-switch setting
   */
  getAutoSwitchOnFailure(): boolean {
    return this.config.autoSwitchOnFailure;
  }

  /**
   * Set auto-switch setting
   */
  setAutoSwitchOnFailure(enabled: boolean): void {
    this.config.autoSwitchOnFailure = enabled;
    this.saveToStorage();
  }

  /**
   * Get full configuration
   */
  getConfig(): ComfyUIServersConfig {
    return { ...this.config };
  }

  // ============================================================================
  // Persistence
  // ============================================================================

  /**
   * Save configuration to localStorage with encryption
   */
  private async saveToStorage(): Promise<void> {
    try {
      const configToSave = await this.encryptSensitiveFields(this.config);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(configToSave));
    } catch (_error) {
      console.error('Failed to save ComfyUI servers config:', _error);
    }
  }

  /**
   * Load configuration from localStorage with decryption
   */
  private async loadFromStorage(): Promise<ComfyUIServersConfig> {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return await this.migrateFromOldConfig();
      }

      const config = JSON.parse(stored);
      
      // Decrypt sensitive fields
      const decryptedConfig = await this.decryptSensitiveFields(config);
      
      // Validate version
      if (decryptedConfig.version !== CONFIG_VERSION) {
        console.warn('ComfyUI servers config version mismatch, using defaults');
        return getDefaultConfig();
      }

      return decryptedConfig;
    } catch (error) {
      console.error('Failed to load ComfyUI servers config:', error);
      return getDefaultConfig();
    }
  }

  /**
   * Encrypt sensitive fields (passwords, tokens)
   */
  private async encryptSensitiveFields(config: ComfyUIServersConfig): Promise<any> {
    const encrypted = JSON.parse(JSON.stringify(config));
    
    for (const server of encrypted.servers) {
      if (server.authentication?.password) {
        const { encrypted: val, iv } = await encryptValue(server.authentication.password);
        server.authentication.password = `${val}:${iv}`;
      }
      if (server.authentication?.token) {
        const { encrypted: val, iv } = await encryptValue(server.authentication.token);
        server.authentication.token = `${val}:${iv}`;
      }
    }
    
    return encrypted;
  }

  /**
   * Decrypt sensitive fields
   */
  private async decryptSensitiveFields(config: any): Promise<ComfyUIServersConfig> {
    const decrypted = JSON.parse(JSON.stringify(config));
    
    for (const server of decrypted.servers) {
      if (server.authentication?.password && server.authentication.password.includes(':')) {
        try {
          const [val, iv] = server.authentication.password.split(':');
          server.authentication.password = await decryptValue(val, iv);
        } catch (e) {
          console.error('Failed to decrypt password for server:', server.name);
          server.authentication.password = '';
        }
      }
      if (server.authentication?.token && server.authentication.token.includes(':')) {
        try {
          const [val, iv] = server.authentication.token.split(':');
          server.authentication.token = await decryptValue(val, iv);
        } catch (e) {
          console.error('Failed to decrypt token for server:', server.name);
          server.authentication.token = '';
        }
      }
    }
    
    return decrypted as ComfyUIServersConfig;
  }

  /**
   * Migrate from old single-server configuration
   */
  private async migrateFromOldConfig(): Promise<ComfyUIServersConfig> {
    try {
      const oldConfig = localStorage.getItem('comfyui-settings');
      if (!oldConfig) {
        return getDefaultConfig();
      }

      const parsed = JSON.parse(oldConfig);
      
      // Create a default server from old config
      const defaultServer: ComfyUIServer = {
        id: 'migrated-default',
        name: 'Default Server',
        serverUrl: parsed.serverUrl || 'http://localhost:8000', // ComfyUI Desktop default port
        authentication: parsed.authentication || { type: 'none' },
        isActive: true,
        status: 'disconnected',
        maxQueueSize: parsed.maxQueueSize,
        timeout: parsed.timeout,
        vramLimit: parsed.vramLimit,
        modelsPath: parsed.modelsPath,
        autoStart: parsed.autoStart,
      };

      const config: ComfyUIServersConfig = {
        servers: [defaultServer],
        activeServerId: defaultServer.id,
        autoSwitchOnFailure: false,
        version: CONFIG_VERSION,
      };

      // Save migrated config
      await this.saveToStorage();
      
      return config;
    } catch (error) {
      console.error('Failed to migrate old ComfyUI config:', error);
      return getDefaultConfig();
    }
  }

  /**
   * Clear all servers
   */
  clearAll(): void {
    this.config = getDefaultConfig();
    this.saveToStorage();
  }

  /**
   * Export configuration as JSON
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration from JSON
   */
  importConfig(jsonData: string): boolean {
    try {
      const imported = JSON.parse(jsonData) as ComfyUIServersConfig;
      
      // Validate structure
      if (!imported.servers || !Array.isArray(imported.servers)) {
        throw new Error('Invalid configuration format');
      }

      this.config = imported;
      this.saveToStorage();
      return true;
    } catch (error) {
      console.error('Failed to import ComfyUI servers config:', error);
      return false;
    }
  }

  /**
   * Sync active server configuration to Electron backend
   */
  private async syncActiveServerToBackend(): Promise<void> {
    const activeServer = this.getActiveServer();
    const electronAPI = (window as any).electronAPI;
    
    if (activeServer && electronAPI?.comfyui?.updateConfig) {
      try {
        await electronAPI.comfyui.updateConfig({
          serverUrl: activeServer.serverUrl,
          authentication: activeServer.authentication,
          server: {
            autoStart: activeServer.autoStart,
            corsHeaders: activeServer.corsHeaders,
            modelsPath: activeServer.modelsPath,
            workflowsPath: activeServer.workflowsPath,
            outputPath: activeServer.outputPath,
            inputPath: activeServer.inputPath,
          },
          performance: activeServer.performance,
          models: activeServer.models,
          workflows: activeServer.workflows,
          timeout: activeServer.timeout,
        });
        console.log(`[ComfyUIServersService] Synced active server "${activeServer.name}" to backend (${activeServer.serverUrl})`);
      } catch (error) {
        console.error('[ComfyUIServersService] Failed to sync to backend:', error);
      }
    }
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let serviceInstance: ComfyUIServersService | null = null;

/**
 * Get singleton instance of ComfyUI Servers Service
 */
export function getComfyUIServersService(): ComfyUIServersService {
  if (!serviceInstance) {
    serviceInstance = new ComfyUIServersService();
  }
  return serviceInstance;
}

/**
 * Initialize ComfyUI Servers Service
 */
export async function initializeComfyUIServersService(): Promise<void> {
  const service = getComfyUIServersService();
  await service.initialize();
}

/**
 * Reset service instance (useful for testing)
 */
export function resetComfyUIServersService(): void {
  serviceInstance = null;
}
