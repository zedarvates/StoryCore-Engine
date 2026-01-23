// ============================================================================
// MCP Addon Module
// ============================================================================

// Export types
export type {
  MCPAddon,
  MCPServerConfig,
  MCPAddonState,
  MCPAddonActions,
  MCPTestResult,
  UseMCPAddonResult,
} from '@/types/addons';

// Export manager class
export { MCPAddonManager } from './MCPAddonManager';

// Export hooks
export {
  useMCPAddon,
  useMCPServers,
  useMCPConfig,
  useMCPServerTesting,
  useMCPPermissions,
  useMCPMetadata,
  useMCPError,
} from './hooks';

// Export components
export { MCPSettings } from './MCPSettings';
export { MCPPanel } from './MCPPanel';

// Export store
export { useAddonStore } from '@/stores/addonStore';

// Default export
export default {
  Manager: MCPAddonManager,
  hooks: {
    useMCPAddon,
    useMCPServers,
    useMCPConfig,
    useMCPServerTesting,
    useMCPPermissions,
    useMCPMetadata,
    useMCPError,
  },
  components: {
    MCPSettings,
    MCPPanel,
  },
  store: {
    useAddonStore,
  },
};