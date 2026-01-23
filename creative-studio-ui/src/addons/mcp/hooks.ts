// ============================================================================
// MCP Addon React Hooks
// ============================================================================

import { useCallback, useEffect } from 'react';
import { useAddonStore } from '@/stores/addonStore';
import type { 
  MCPAddon, 
  MCPServerConfig, 
  UseMCPAddonResult 
} from '@/types/addons';

/**
 * Hook for MCP addon management
 */
export function useMCPAddon(): UseMCPAddonResult {
  const {
    mcpAddon,
    isLoading,
    globalError,
    toggleMCPAddon,
    addMCPServer,
    updateMCPServer,
    removeMCPServer,
    testMCPServer,
    setSelectedMCPServer,
    updateMCPConfig,
    clearError,
  } = useAddonStore();

  const addon = mcpAddon.addon;

  const enable = useCallback(async () => {
    await toggleMCPAddon(true);
  }, [toggleMCPAddon]);

  const disable = useCallback(async () => {
    await toggleMPCAddon(false);
  }, [toggleMCPAddon]);

  const updateConfig = useCallback(async (config: Partial<MCPAddon['config']>) => {
    await updateMCPConfig(config);
  }, [updateMCPConfig]);

  return {
    addon,
    isLoading,
    error: globalError,
    enable,
    disable,
    updateConfig,
    servers: mcpAddon.servers,
    selectedServer: mcpAddon.selectedServer,
    addServer: addMCPServer,
    updateServer: updateMCPServer,
    removeServer: removeMCPServer,
    testServer: testMCPServer,
    setSelectedServer: setSelectedMCPServer,
  };
}

/**
 * Hook for MCP server management
 */
export function useMCPServers() {
  const {
    mcpAddon,
    isLoading,
    globalError,
    addMCPServer,
    updateMCPServer,
    removeMCPServer,
    testMCPServer,
    setSelectedMCPServer,
    clearError,
  } = useAddonStore();

  return {
    servers: mcpAddon.servers,
    selectedServer: mcpAddon.selectedServer,
    isLoading,
    error: globalError,
    addServer: addMCPServer,
    updateServer: updateMCPServer,
    removeServer: removeMCPServer,
    testServer: testMCPServer,
    setSelectedServer: setSelectedMCPServer,
    clearError,
    getServerById: (serverId: string) => 
      mcpAddon.servers.find(s => s.id === serverId) || null,
    getSelectedServer: () => 
      mcpAddon.selectedServer 
        ? mcpAddon.servers.find(s => s.id === mcpAddon.selectedServer) || null
        : null,
    getConnectedServers: () => 
      mcpAddon.servers.filter(s => s.status === 'connected'),
    getDisconnectedServers: () => 
      mcpAddon.servers.filter(s => s.status === 'disconnected'),
    getErrorServers: () => 
      mcpAddon.servers.filter(s => s.status === 'error'),
  };
}

/**
 * Hook for MCP addon configuration
 */
export function useMCPConfig() {
  const {
    mcpAddon,
    isLoading,
    globalError,
    updateMCPConfig,
    clearError,
  } = useAddonStore();

  return {
    config: mcpAddon.addon.config,
    isLoading,
    error: globalError,
    updateConfig: updateMCPConfig,
    clearError,
    resetConfig: () => updateMCPConfig({}),
  };
}

/**
 * Hook for MCP server testing
 */
export function useMCPServerTesting() {
  const {
    mcpAddon,
    isLoading,
    globalError,
    testMCPServer,
    clearError,
  } = useAddonStore();

  return {
    testResults: mcpAddon.testResults,
    isLoading,
    error: globalError,
    testServer: testMCPServer,
    clearError,
    getTestResult: (serverId: string) => 
      mcpAddon.testResults.find(r => r.serverId === serverId) || null,
    getLatestTestResult: (serverId: string) => {
      const results = mcpAddon.testResults.filter(r => r.serverId === serverId);
      return results.length > 0 ? results[results.length - 1] : null;
    },
    getSuccessfulTests: () => 
      mcpAddon.testResults.filter(r => r.success),
    getFailedTests: () => 
      mcpAddon.testResults.filter(r => !r.success),
  };
}

/**
 * Hook for MCP addon permissions
 */
export function useMCPPermissions() {
  const { mcpAddon } = useAddonStore();

  const hasPermission = useCallback((permission: string) => {
    return mcpAddon.addon.permissions.includes(permission as any);
  }, [mcpAddon.addon.permissions]);

  const hasPermissions = useCallback((permissions: string[]) => {
    return permissions.every(permission => hasPermission(permission));
  }, [hasPermission]);

  const hasAnyPermission = useCallback((permissions: string[]) => {
    return permissions.some(permission => hasPermission(permission));
  }, [hasPermission]);

  return {
    permissions: mcpAddon.addon.permissions,
    hasPermission,
    hasPermissions,
    hasAnyPermission,
    requiredPermissions: [
      'read:project',
      'write:project',
      'network:outbound',
    ],
    hasRequiredPermissions: hasPermissions([
      'read:project',
      'write:project',
      'network:outbound',
    ]),
  };
}

/**
 * Hook for MCP addon metadata
 */
export function useMCPMetadata() {
  const { mcpAddon } = useAddonStore();

  return {
    metadata: mcpAddon.addon.metadata,
    version: mcpAddon.addon.version,
    author: mcpAddon.addon.author,
    description: mcpAddon.addon.description,
    category: mcpAddon.addon.metadata.category,
    tags: mcpAddon.addon.metadata.tags,
    icon: mcpAddon.addon.metadata.icon,
    website: mcpAddon.addon.metadata.website,
    documentation: mcpAddon.addon.metadata.documentation,
    createdAt: mcpAddon.addon.metadata.createdAt,
    updatedAt: mcpAddon.addon.metadata.updatedAt,
  };
}

/**
 * Hook for MCP addon error handling
 */
export function useMCPError() {
  const { globalError, clearError } = useAddonStore();

  useEffect(() => {
    if (globalError) {
      // Auto-clear error after 5 seconds
      const timer = setTimeout(() => {
        clearError();
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [globalError, clearError]);

  return {
    error: globalError,
    clearError,
    hasError: Boolean(globalError),
  };
}