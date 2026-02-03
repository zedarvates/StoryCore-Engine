// ============================================================================
// MCP Addon React Hooks
// ============================================================================

import { useCallback, useSyncExternalStore } from 'react';
import { MCPAddonManager } from './MCPAddonManager';
import type { 
  MCPAddon, 
  MCPServerConfig, 
  UseMCPAddonResult,
  UseMCPServersResult,
  UseMCPConfigResult,
  UseMCPTestResult
} from '@/types/addons';

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
