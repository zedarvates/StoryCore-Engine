// ============================================================================
// MCP Server Add-on Types
// ============================================================================

export interface MCPServerConfig {
  port: number;
  host: string;
  maxConnections: number;
  timeout: number;
  ssl: boolean;
  certPath?: string;
  keyPath?: string;
}

export interface MCPServerStatus {
  isRunning: boolean;
  port: number;
  startedAt: string | null;
  uptime: number; // Seconds
  error: string | null;
}

export interface MCPServerOperation {
  id: string;
  type: 'start' | 'stop' | 'command' | 'config';
  timestamp: string;
  description: string;
  details?: any;
}

export interface MCPServerState {
  config: MCPServerConfig;
  status: MCPServerStatus;
  operations: MCPServerOperation[];
  version: string;
  lastModified: string;
}