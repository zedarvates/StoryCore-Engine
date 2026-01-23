// ============================================================================
// Add-on Store using Zustand
// ============================================================================

import { create } from 'zustand';
import type { 
  MCPAddon, 
  MCPServerConfig, 
  MCPAddonState, 
  MCPAddonActions,
  Addon,
  Permission
} from '@/types/addons';
import { MCPAddonManager } from '@/addons/mcp/MCPAddonManager';

interface AddonStoreState {
  // MCP Addon state
  mcpAddon: MCPAddonState;
  mcpManager: MCPAddonManager;

  // Generic addons state
  addons: Map<string, Addon>;
  
  // Loading states
  isLoading: boolean;
  globalError: string | null;

  // Actions
  // MCP Addon actions
  toggleMCPAddon: (enabled: boolean) => Promise<void>;
  addMCPServer: (config: Omit<MCPServerConfig, 'id'>) => Promise<void>;
  updateMCPServer: (serverId: string, updates: Partial<MCPServerConfig>) => Promise<void>;
  removeMCPServer: (serverId: string) => Promise<void>;
  testMCPServer: (serverId: string) => Promise<void>;
  setSelectedMCPServer: (serverId: string | null) => void;
  updateMCPConfig: (config: Partial<MCPAddon['config']>) => Promise<void>;

  // Generic addon actions
  registerAddon: (addon: Addon) => void;
  unregisterAddon: (addonId: string) => void;
  enableAddon: (addonId: string) => Promise<void>;
  disableAddon: (addonId: string) => Promise<void>;
  updateAddonConfig: (addonId: string, config: Partial<Addon['config']>) => Promise<void>;

  // Utility actions
  clearError: () => void;
  reset: () => void;
}

// Create MCP addon manager instance
const mcpManager = new MCPAddonManager();

// Subscribe to MCP manager state changes
mcpManager.subscribe((state) => {
  set({ mcpAddon: state });
});

export const useAddonStore = create<AddonStoreState>((set, get) => ({
  // Initial state
  mcpAddon: mcpManager.getState(),
  mcpManager,
  addons: new Map(),
  isLoading: false,
  globalError: null,

  // MCP Addon actions
  toggleMCPAddon: async (enabled: boolean) => {
    set({ isLoading: true, globalError: null });
    try {
      await get().mcpManager.toggleAddon(enabled);
    } catch (error) {
      set({ 
        globalError: error instanceof Error ? error.message : 'Failed to toggle MCP addon',
        isLoading: false 
      });
      throw error;
    }
  },

  addMCPServer: async (config: Omit<MCPServerConfig, 'id'>) => {
    set({ isLoading: true, globalError: null });
    try {
      await get().mcpManager.addServer(config);
    } catch (error) {
      set({ 
        globalError: error instanceof Error ? error.message : 'Failed to add MCP server',
        isLoading: false 
      });
      throw error;
    }
  },

  updateMCPServer: async (serverId: string, updates: Partial<MCPServerConfig>) => {
    set({ isLoading: true, globalError: null });
    try {
      await get().mcpManager.updateServer(serverId, updates);
    } catch (error) {
      set({ 
        globalError: error instanceof Error ? error.message : 'Failed to update MCP server',
        isLoading: false 
      });
      throw error;
    }
  },

  removeMCPServer: async (serverId: string) => {
    set({ isLoading: true, globalError: null });
    try {
      await get().mcpManager.removeServer(serverId);
    } catch (error) {
      set({ 
        globalError: error instanceof Error ? error.message : 'Failed to remove MCP server',
        isLoading: false 
      });
      throw error;
    }
  },

  testMCPServer: async (serverId: string) => {
    set({ isLoading: true, globalError: null });
    try {
      await get().mcpManager.testServer(serverId);
    } catch (error) {
      set({ 
        globalError: error instanceof Error ? error.message : 'Failed to test MCP server',
        isLoading: false 
      });
      throw error;
    }
  },

  setSelectedMCPServer: (serverId: string | null) => {
    get().mcpManager.setSelectedServer(serverId);
  },

  updateMCPConfig: async (config: Partial<MCPAddon['config']>) => {
    set({ isLoading: true, globalError: null });
    try {
      await get().mcpManager.updateConfig(config);
    } catch (error) {
      set({ 
        globalError: error instanceof Error ? error.message : 'Failed to update MCP config',
        isLoading: false 
      });
      throw error;
    }
  },

  // Generic addon actions
  registerAddon: (addon: Addon) => {
    set((state) => ({
      addons: new Map(state.addons).set(addon.id, addon),
    }));
  },

  unregisterAddon: (addonId: string) => {
    set((state) => {
      const newAddons = new Map(state.addons);
      newAddons.delete(addonId);
      return { addons: newAddons };
    });
  },

  enableAddon: async (addonId: string) => {
    set({ isLoading: true, globalError: null });
    try {
      const addon = get().addons.get(addonId);
      if (!addon) {
        throw new Error(`Addon ${addonId} not found`);
      }

      // For MCP addon, use specific method
      if (addon.type === 'mcp-server') {
        await get().toggleMCPAddon(true);
      } else {
        // Generic addon enable logic
        const updatedAddon = { ...addon, enabled: true };
        set((state) => ({
          addons: new Map(state.addons).set(addonId, updatedAddon),
        }));
      }
    } catch (error) {
      set({ 
        globalError: error instanceof Error ? error.message : `Failed to enable addon ${addonId}`,
        isLoading: false 
      });
      throw error;
    }
  },

  disableAddon: async (addonId: string) => {
    set({ isLoading: true, globalError: null });
    try {
      const addon = get().addons.get(addonId);
      if (!addon) {
        throw new Error(`Addon ${addonId} not found`);
      }

      // For MCP addon, use specific method
      if (addon.type === 'mcp-server') {
        await get().toggleMCPAddon(false);
      } else {
        // Generic addon disable logic
        const updatedAddon = { ...addon, enabled: false };
        set((state) => ({
          addons: new Map(state.addons).set(addonId, updatedAddon),
        }));
      }
    } catch (error) {
      set({ 
        globalError: error instanceof Error ? error.message : `Failed to disable addon ${addonId}`,
        isLoading: false 
      });
      throw error;
    }
  },

  updateAddonConfig: async (addonId: string, config: Partial<Addon['config']>) => {
    set({ isLoading: true, globalError: null });
    try {
      const addon = get().addons.get(addonId);
      if (!addon) {
        throw new Error(`Addon ${addonId} not found`);
      }

      const updatedAddon = {
        ...addon,
        config: { ...addon.config, ...config },
        metadata: {
          ...addon.metadata,
          updatedAt: new Date().toISOString(),
        },
      };

      set((state) => ({
        addons: new Map(state.addons).set(addonId, updatedAddon),
      }));

      // For MCP addon, also update specific config
      if (addon.type === 'mcp-server') {
        await get().updateMCPConfig(config);
      }
    } catch (error) {
      set({ 
        globalError: error instanceof Error ? error.message : `Failed to update config for addon ${addonId}`,
        isLoading: false 
      });
      throw error;
    }
  },

  // Utility actions
  clearError: () => {
    set({ globalError: null });
  },

  reset: () => {
    set({
      mcpAddon: mcpManager.getState(),
      addons: new Map(),
      isLoading: false,
      globalError: null,
    });
  },
}));