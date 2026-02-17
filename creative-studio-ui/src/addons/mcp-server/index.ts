// ============================================================================
// MCP Server Add-on
// ============================================================================

// Core types - Import first, then re-export
import type { MCPServerConfig, MCPServerStatus, MCPServerOperation, MCPServerState } from './types';
export type {
  MCPServerConfig,
  MCPServerStatus,
  MCPServerOperation,
  MCPServerState,
} from './types';

// Import implementation
import { MCPServerManager } from './MCPServerManager';
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

// Export the plugin instance
export const mcpServerPlugin: MCPServerPlugin = {
  name: 'MCP Server Add-on',
  version: '1.0.0',
  description: 'MCP (Model Context Protocol) Server for external service integration',

  initialize: async () => {},
  destroy: async () => {},
  getServerManager: () => {
    throw new Error('MCPServerManager not initialized');
  },
  onServerStarted: () => {},
  onServerStopped: () => {},
  startServer: async () => {},
  stopServer: async () => {},
  getServerStatus: () => ({
    isRunning: false,
    port: 0,
    startedAt: null,
    uptime: 0,
    error: null,
  }),
};

// Default export
export default mcpServerPlugin;
