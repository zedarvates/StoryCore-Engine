// ============================================================================
// MCP Addon Manager
// ============================================================================

import type {
  MCPAddon,
  MCPServerConfig,
  MCPAddonState,
  MCPAddonActions,
  MCPTestResult
} from '@/types/addons';

export class MCPAddonManager implements MCPAddonActions {
  private state: MCPAddonState;
  private listeners: Set<(state: MCPAddonState) => void> = new Set();

  constructor(initialAddon?: Partial<MCPAddon>) {
    this.state = {
      addon: this.createDefaultAddon(initialAddon),
      isLoading: false,
      error: null,
      servers: [],
      selectedServer: null,
      testResults: [],
    };
  }

  // Private helper to create default addon
  private createDefaultAddon(partial?: Partial<MCPAddon>): MCPAddon {
    return {
      id: 'mcp-server',
      name: 'MCP Server Integration',
      version: '1.0.0',
      description: 'Model Context Protocol server integration for enhanced AI capabilities',
      author: 'StoryCore Engine',
      enabled: false,
      permissions: [
        'read:project',
        'write:project',
        'read:assets',
        'write:assets',
        'network:outbound',
        'files:read',
        'files:write',
      ],
      config: {},
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        category: 'integration',
        tags: ['mcp', 'ai', 'integration'],
        icon: '🔗',
        website: 'https://modelcontextprotocol.io',
        documentation: 'https://github.com/modelcontextprotocol/server',
      },
      type: 'mcp-server',
      mcp: {
        servers: [],
        defaultServer: undefined,
      },
    };
  }

  // Subscribe to state changes
  subscribe(listener: (state: MCPAddonState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners of state changes
  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  // Get current state
  getState(): MCPAddonState {
    return { ...this.state };
  }

  // MCPAddonActions implementation
  async toggleAddon(enabled: boolean): Promise<void> {
    this.setState({
      ...this.state,
      isLoading: true,
      error: null,
    });

    try {
      // Simulate API call to enable/disable addon
      await this.delay(500);

      const updatedAddon = {
        ...this.state.addon,
        enabled,
        metadata: {
          ...this.state.addon.metadata,
          updatedAt: new Date().toISOString(),
        },
      };

      this.setState({
        ...this.state,
        addon: updatedAddon,
        isLoading: false,
      });

      // Notify backend about addon state change
      await this.notifyBackendAddonState(updatedAddon);
    } catch (error) {
      this.setState({
        ...this.state,
        error: error instanceof Error ? error.message : 'Failed to toggle addon',
        isLoading: false,
      });
      throw error;
    }
  }

  async addServer(config: Omit<MCPServerConfig, 'id'>): Promise<void> {
    this.setState({ ...this.state, isLoading: true, error: null });

    try {
      const newServer: MCPServerConfig = {
        ...config,
        id: crypto.randomUUID(),
      };

      const updatedServers = [...this.state.servers, newServer];
      const updatedAddon = {
        ...this.state.addon,
        mcp: {
          ...this.state.addon.mcp,
          servers: updatedServers,
        },
        metadata: {
          ...this.state.addon.metadata,
          updatedAt: new Date().toISOString(),
        },
      };

      this.setState({
        ...this.state,
        addon: updatedAddon,
        servers: updatedServers,
        isLoading: false,
      });

      // Test the new server connection
      await this.testServer(newServer.id);
    } catch (error) {
      this.setState({
        ...this.state,
        error: error instanceof Error ? error.message : 'Failed to add server',
        isLoading: false,
      });
      throw error;
    }
  }

  async updateServer(serverId: string, updates: Partial<MCPServerConfig>): Promise<void> {
    this.setState({ ...this.state, isLoading: true, error: null });

    try {
      const updatedServers = this.state.servers.map(server =>
        server.id === serverId ? { ...server, ...updates } : server
      );

      const updatedAddon = {
        ...this.state.addon,
        mcp: {
          ...this.state.addon.mcp,
          servers: updatedServers,
        },
        metadata: {
          ...this.state.addon.metadata,
          updatedAt: new Date().toISOString(),
        },
      };

      this.setState({
        ...this.state,
        addon: updatedAddon,
        servers: updatedServers,
        isLoading: false,
      });

      // If the updated server was selected, update selected server reference
      if (this.state.selectedServer === serverId) {
        this.setState({
          ...this.state,
          selectedServer: serverId,
        });
      }
    } catch (error) {
      this.setState({
        ...this.state,
        error: error instanceof Error ? error.message : 'Failed to update server',
        isLoading: false,
      });
      throw error;
    }
  }

  async removeServer(serverId: string): Promise<void> {
    this.setState({ ...this.state, isLoading: true, error: null });

    try {
      const updatedServers = this.state.servers.filter(server => server.id !== serverId);
      const updatedAddon = {
        ...this.state.addon,
        mcp: {
          ...this.state.addon.mcp,
          servers: updatedServers,
        },
        metadata: {
          ...this.state.addon.metadata,
          updatedAt: new Date().toISOString(),
        },
      };

      this.setState({
        ...this.state,
        addon: updatedAddon,
        servers: updatedServers,
        selectedServer: this.state.selectedServer === serverId ? null : this.state.selectedServer,
        isLoading: false,
      });
    } catch (error) {
      this.setState({
        ...this.state,
        error: error instanceof Error ? error.message : 'Failed to remove server',
        isLoading: false,
      });
      throw error;
    }
  }

  async testServer(serverId: string): Promise<void> {
    const server = this.state.servers.find(s => s.id === serverId);
    if (!server) {
      throw new Error('Server not found');
    }

    this.setState({ ...this.state, isLoading: true, error: null });

    try {
      const startTime = Date.now();

      // Simulate server connection test
      await this.delay(1000 + Math.random() * 1000);

      const latency = Date.now() - startTime;
      const success = Math.random() > 0.2; // 80% success rate for demo

      const testResult: MCPTestResult = {
        serverId,
        timestamp: new Date().toISOString(),
        success,
        latency: success ? latency : undefined,
        error: success ? undefined : 'Connection failed',
        capabilities: success ? ['text-generation', 'image-analysis', 'document-processing'] : undefined,
      };

      const updatedTestResults = [...this.state.testResults.filter(r => r.serverId !== serverId), testResult];
      const updatedServer = {
        ...server,
        status: (success ? 'connected' : 'error') as MCPServerConfig['status'],
        lastConnected: success ? new Date().toISOString() : server.lastConnected,
        errorMessage: success ? undefined : testResult.error,
      };

      await this.updateServer(serverId, updatedServer);

      this.setState({
        ...this.state,
        testResults: updatedTestResults,
        isLoading: false,
      });
    } catch (error) {
      this.setState({
        ...this.state,
        error: error instanceof Error ? error.message : 'Failed to test server',
        isLoading: false,
      });
      throw error;
    }
  }

  setSelectedServer(serverId: string | null): void {
    this.setState({
      ...this.state,
      selectedServer: serverId,
    });
  }

  async updateConfig(config: Partial<MCPAddon['config']>): Promise<void> {
    this.setState({ ...this.state, isLoading: true, error: null });

    try {
      const updatedAddon = {
        ...this.state.addon,
        config: { ...this.state.addon.config, ...config },
        metadata: {
          ...this.state.addon.metadata,
          updatedAt: new Date().toISOString(),
        },
      };

      this.setState({
        ...this.state,
        addon: updatedAddon,
        isLoading: false,
      });

      // Notify backend about config update
      await this.notifyBackendConfigUpdate(updatedAddon);
    } catch (error) {
      this.setState({
        ...this.state,
        error: error instanceof Error ? error.message : 'Failed to update config',
        isLoading: false,
      });
      throw error;
    }
  }

  // Private helper methods
  private setState(newState: Partial<MCPAddonState>): void {
    this.state = { ...this.state, ...newState };
    this.notify();
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async notifyBackendAddonState(addon: MCPAddon): Promise<void> {
    // Implementation would send addon state to backend
    console.log('Notifying backend about addon state:', addon.enabled);
  }

  private async notifyBackendConfigUpdate(addon: MCPAddon): Promise<void> {
    // Implementation would send config update to backend
    console.log('Notifying backend about config update:', addon.config);
  }

  // Utility methods
  getServerById(serverId: string): MCPServerConfig | null {
    return this.state.servers.find(server => server.id === serverId) || null;
  }

  getSelectedServer(): MCPServerConfig | null {
    return this.state.selectedServer
      ? this.getServerById(this.state.selectedServer)
      : null;
  }

  hasServer(serverId: string): boolean {
    return this.state.servers.some(server => server.id === serverId);
  }

  getConnectedServers(): MCPServerConfig[] {
    return this.state.servers.filter(server => server.status === 'connected');
  }
}