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

const STORAGE_KEY = 'comfyui-servers';
const CONFIG_VERSION = '1.0';

/**
 * Generate unique ID for server
 */
function generateServerId(): string {
  return `server-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get default configuration
 */
function getDefaultConfig(): ComfyUIServersConfig {
  return {
    servers: [],
    activeServerId: null,
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
    this.config = this.loadFromStorage();
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

    this.saveToStorage();
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
      const result = await testComfyUIConnection({
        serverUrl: server.serverUrl,
        authentication: server.authentication,
        timeout: server.timeout,
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
          status: 'error',
        });
        return false;
      }
    } catch (error) {
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
   * Save configuration to localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save ComfyUI servers config:', error);
    }
  }

  /**
   * Load configuration from localStorage
   */
  private loadFromStorage(): ComfyUIServersConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return this.migrateFromOldConfig();
      }

      const config = JSON.parse(stored) as ComfyUIServersConfig;
      
      // Validate version
      if (config.version !== CONFIG_VERSION) {
        console.warn('ComfyUI servers config version mismatch, using defaults');
        return getDefaultConfig();
      }

      return config;
    } catch (error) {
      console.error('Failed to load ComfyUI servers config:', error);
      return getDefaultConfig();
    }
  }

  /**
   * Migrate from old single-server configuration
   */
  private migrateFromOldConfig(): ComfyUIServersConfig {
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
        serverUrl: parsed.serverUrl || 'http://localhost:8188',
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
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
      
      console.log('Migrated old ComfyUI config to multi-server format');
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
 * Reset service instance (useful for testing)
 */
export function resetComfyUIServersService(): void {
  serviceInstance = null;
}
