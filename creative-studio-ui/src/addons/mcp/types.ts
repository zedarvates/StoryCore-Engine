export interface MCPServerConfig {
  id: string;
  name: string;
  endpoint: string;
  apiKey?: string;
  timeout: number;
  maxRetries: number;
  enabled: boolean;
  status: 'disconnected' | 'connecting' | 'connected' | 'error';
  capabilities: string[];
  lastConnected?: string;
  errorMessage?: string;
}

export interface MCPAddon {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  permissions: string[];
  config: Record<string, unknown>;
  metadata: {
    createdAt: string;
    updatedAt: string;
    category: string;
    tags: string[];
    icon: string;
    website: string;
    documentation: string;
  };
  type: 'mcp-server';
  mcp: { servers: MCPServerConfig[]; defaultServer?: string };
}

export interface MCPTestResult {
  serverId: string;
  timestamp: string;
  success: boolean;
  latency?: number;
  error?: string;
  capabilities?: string[];
}

export interface MCPAddonState {
  addon: MCPAddon;
  isLoading: boolean;
  error: string | null;
  servers: MCPServerConfig[];
  selectedServer: string | null;
  testResults: MCPTestResult[];
}

export interface MCPAddonActions {
  toggleAddon(enabled: boolean): Promise<void>;
  addServer(config: Omit<MCPServerConfig, 'id'>): Promise<void>;
  updateServer(serverId: string, updates: Partial<MCPServerConfig>): Promise<void>;
  removeServer(serverId: string): Promise<void>;
  testServer(serverId: string): Promise<void>;
  setSelectedServer(serverId: string | null): void;
  updateConfig(config: Partial<MCPAddon['config']>): Promise<void>;
}

export type UseMCPAddonResult = Omit<MCPAddonState, 'testResults'>
  & Omit<MCPAddonActions, 'toggleAddon'> & {
    enable(): Promise<void>;
    disable(): Promise<void>;
  };
