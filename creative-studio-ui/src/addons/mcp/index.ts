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

// Import members
import { MCPAddonManager } from './MCPAddonManager';

import {
  useMCPAddon,
  useMCPServers,
  useMCPConfig,
  useMCPServerTesting,
  useMCPPermissions,
  useMCPMetadata,
  useMCPError,
} from './hooks';

import { MCPSettings } from './MCPSettings';
import { MCPPanel } from './MCPPanel';

import { useAddonStore } from '@/stores/addonStore';

export {
  MCPAddonManager,
  useMCPAddon,
  useMCPServers,
  useMCPConfig,
  useMCPServerTesting,
  useMCPPermissions,
  useMCPMetadata,
  useMCPError,
  MCPSettings,
  MCPPanel,
  useAddonStore
};

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