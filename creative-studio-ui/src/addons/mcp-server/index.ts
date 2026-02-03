// ============================================================================
// MCP Server Add-on
// ============================================================================

// Core types
export type {
  MCPServerConfig,
  MCPServerStatus,
  MCPServerOperation,
  MCPServerState,
} from './types';

// Import types for internal use
import type { MCPServerConfig, MCPServerStatus, MCPServerOperation, MCPServerState } from './types';

// Import implementation
export { MCPServerManager } from './MCPServerManager';

// Plugin interface
export interface MCPServerPlugin {
  name: string;
  version: string;
  description: string;

  // Lifecycle methods
  initialize(): Promise<void>;
  destroy(): Promise<void>;

  // Core functionality
  getServerManager(): MCPServerManager;

  // Integration hooks
  onServerStarted(config: MCPServerConfig): void;
  onServerStopped(): void;

  // API for server management
  startServer(config: MCPServerConfig): Promise<void>;
  stopServer(): Promise<void>;
  getServerStatus(): MCPServerStatus;
}

// Placeholder for MCPServerManager
export interface MCPServerManager {
  // Core methods
  startServer(config: MCPServerConfig): Promise<void>;
  stopServer(): Promise<void>;
  getServerStatus(): MCPServerStatus;
  getConfig(): MCPServerConfig;
  setConfig(config: Partial<MCPServerConfig>): void;

  // Server operations
  executeCommand(command: string): Promise<any>;
  getServerLogs(): Promise<string[]>;
  clearServerLogs(): Promise<void>;

  // State management
  serialize(): string;
  deserialize(data: string): void;
}

// Export the plugin instance
let mcpServerManagerInstance: MCPServerManager | null = null;

export const mcpServerPlugin: MCPServerPlugin = {
  name: 'MCP Server Add-on',
  version: '1.0.0',
  description: 'MCP (Model Context Protocol) Server for external service integration',

  initialize: async () => {
    // Initialize MCP server manager
    mcpServerManagerInstance = {
      startServer: async (config) => {},
      stopServer: async () => {},
      getServerStatus: () => ({
        isRunning: false,
        port: 0,
        startedAt: null,
        uptime: 0,
        error: null,
      }),
      getConfig: () => ({
        port: 8080,
        host: 'localhost',
        maxConnections: 10,
        timeout: 30000,
        ssl: false,
      }),
      setConfig: (config) => {},
      executeCommand: async (command) => ({}),
      getServerLogs: async () => [],
      clearServerLogs: async () => {},
      serialize: () => JSON.stringify({}),
      deserialize: (data) => {},
    };
  },

  destroy: async () => {
    mcpServerManagerInstance = null;
  },

  getServerManager: () => {
    if (!mcpServerManagerInstance) {
      throw new Error('MCPServerManager not initialized. Call initialize() first.');
    }
    return mcpServerManagerInstance;
  },

  onServerStarted: (config) => {},
  onServerStopped: () => {},

  startServer: async (config) => {
    await mcpServerManagerInstance?.startServer(config);
  },

  stopServer: async () => {
    await mcpServerManagerInstance?.stopServer();
  },

  getServerStatus: () => {
    return mcpServerManagerInstance?.getServerStatus() || {
      isRunning: false,
      port: 0,
      startedAt: null,
      uptime: 0,
      error: null,
    };
  },
};

// Default export
export default mcpServerPlugin;