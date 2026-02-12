// ============================================================================
// MCP Addon React Hooks
// ============================================================================

import { useCallback, useSyncExternalStore, useState } from 'react';
import { MCPAddonManager } from './MCPAddonManager';
import type { 
  MCPAddon, 
  MCPServerConfig, 
  UseMCPAddonResult,
  MCPTestResult
} from '@/types/addons';

// Missing type definitions for hooks
export interface UseMCPServersResult {
  servers: MCPServerConfig[];
  selectedServer: string | null;
  isLoading: boolean;
  error: string | null;
  addServer: (config: MCPServerConfig) => Promise<void>;
  updateServer: (serverId: string, updates: Partial<MCPServerConfig>) => Promise<void>;
  removeServer: (serverId: string) => Promise<void>;
  testServer: (serverId: string) => Promise<void>;
  setSelectedServer: (serverId: string | null) => void;
}

export interface UseMCPConfigResult {
  config: Record<string, unknown>;
  isLoading: boolean;
  error: string | null;
  updateConfig: (config: Partial<MCPAddon['config']>) => Promise<void>;
}

export interface UseMCPTestResult {
  testResults: MCPTestResult[];
  isLoading: boolean;
  error: string | null;
  testServer: (serverId: string) => Promise<void>;
  testAllServers: () => Promise<void[]>;
}

export interface UseMCPServerTestingResult {
  isTesting: boolean;
  lastTestResult: MCPTestResult | null;
  testServer: (serverId: string) => Promise<void>;
  testAllServers: () => Promise<void>;
}

export interface UseMCPPermissionsResult {
  permissions: string[];
  hasPermission: (permission: string) => boolean;
}

export interface UseMCPErrorResult {
  error: string | null;
  clearError: () => void;
}

export interface UseMCPMetadataResult {
  metadata: {
    name: string;
    version: string;
    description: string;
  } | null;
  isLoading: boolean;
}

// Singleton instance of MCPAddonManager
let mcpManager: MCPAddonManager | null = null;

function getMCPManager(): MCPAddonManager {
  if (!mcpManager) {
    mcpManager = new MCPAddonManager();
  }
  return mcpManager;
}

/**
 * Hook for MCP addon management
 */
export function useMCPAddon(): UseMCPAddonResult {
  const manager = getMCPManager();
  
  // Subscribe to manager state changes
  const state = useSyncExternalStore(
    (callback) => manager.subscribe(callback),
    () => manager.getState()
  );

  const addon = state.addon;

  const enable = useCallback(async () => {
    await manager.toggleAddon(true);
  }, [manager]);

  const disable = useCallback(async () => {
    await manager.toggleAddon(false);
  }, [manager]);

  const updateConfig = useCallback(async (config: Partial<MCPAddon['config']>) => {
    await manager.updateConfig(config);
  }, [manager]);

  return {
    addon,
    isLoading: state.isLoading,
    error: state.error,
    enable,
    disable,
    updateConfig,
    servers: state.servers,
    selectedServer: state.selectedServer,
    addServer: manager.addServer.bind(manager),
    updateServer: manager.updateServer.bind(manager),
    removeServer: manager.removeServer.bind(manager),
    testServer: manager.testServer.bind(manager),
    setSelectedServer: manager.setSelectedServer.bind(manager),
  };
}

/**
 * Hook for MCP server management
 */
export function useMCPServers(): UseMCPServersResult {
  const manager = getMCPManager();
  
  const state = useSyncExternalStore(
    (callback) => manager.subscribe(callback),
    () => manager.getState()
  );

  const addServer = useCallback(async (config: MCPServerConfig) => {
    await manager.addServer(config);
  }, [manager]);

  const updateServer = useCallback(async (id: string, updates: Partial<MCPServerConfig>) => {
    await manager.updateServer(id, updates);
  }, [manager]);

  const removeServer = useCallback(async (id: string) => {
    await manager.removeServer(id);
  }, [manager]);

  const testServer = useCallback(async (id: string) => {
    return await manager.testServer(id);
  }, [manager]);

  const setSelectedServer = useCallback((id: string | null) => {
    manager.setSelectedServer(id);
  }, [manager]);

  return {
    servers: state.servers,
    selectedServer: state.selectedServer,
    isLoading: state.isLoading,
    error: state.error,
    addServer,
    updateServer,
    removeServer,
    testServer,
    setSelectedServer,
  };
}

/**
 * Hook for MCP configuration management
 */
export function useMCPConfig(): UseMCPConfigResult {
  const manager = getMCPManager();
  
  const state = useSyncExternalStore(
    (callback) => manager.subscribe(callback),
    () => manager.getState()
  );

  const updateConfig = useCallback(async (config: Partial<MCPAddon['config']>) => {
    await manager.updateConfig(config);
  }, [manager]);

  return {
    config: state.addon.config,
    isLoading: state.isLoading,
    error: state.error,
    updateConfig,
  };
}

/**
 * Hook for MCP server testing
 */
export function useMCPTest(): UseMCPTestResult {
  const manager = getMCPManager();
  
  const state = useSyncExternalStore(
    (callback) => manager.subscribe(callback),
    () => manager.getState()
  );

  const testServer = useCallback(async (id: string) => {
    return await manager.testServer(id);
  }, [manager]);

  const testAllServers = useCallback(async () => {
    const results = await Promise.all(
      state.servers.map(server => manager.testServer(server.id))
    );
    return results;
  }, [manager, state.servers]);

  return {
    testResults: state.testResults,
    isLoading: state.isLoading,
    error: state.error,
    testServer,
    testAllServers,
  };
}

/**
 * Hook for MCP server testing (alias for useMCPTest)
 */
export function useMCPServerTesting(): UseMCPTestResult {
  return useMCPTest();
}

/**
 * Hook for MCP permissions
 */
export function useMCPPermissions(): UseMCPPermissionsResult {
  const permissions = [
    'read:project',
    'write:project',
    'read:assets',
    'write:assets',
  ];

  return {
    permissions,
    hasPermission: (permission: string) => permissions.includes(permission),
  };
}

/**
 * Hook for MCP metadata
 */
export function useMCPMetadata(): UseMCPMetadataResult {
  return {
    metadata: {
      name: 'MCP Addon',
      version: '1.0.0',
      description: 'Model Context Protocol Addon',
    },
    isLoading: false,
  };
}

/**
 * Hook for MCP errors
 */
export function useMCPError(): UseMCPErrorResult {
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    clearError,
  };
}
