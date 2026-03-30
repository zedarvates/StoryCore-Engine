/**
 * ComfyUI Multi-Server Types
 * 
 * Defines types for managing multiple ComfyUI servers
 */

import type { ComfyUIServerInfo, AuthenticationType } from '@/services/comfyuiService';

/**
 * ComfyUI Server Configuration
 */
export interface ComfyUIServer {
  id: string;
  name: string;
  serverUrl: string;
  authentication: {
    type: AuthenticationType;
    username?: string;
    password?: string;
    token?: string;
  };
  mcpConfig?: {
    enabled: boolean;
    serverPath?: string;
    serverArgs?: string[];
    transport?: 'stdio' | 'sse' | 'websockets';
    env?: Record<string, string>;
    toolMappings?: {
      imageGeneration?: string;
      videoGeneration?: string;
      upscaling?: string;
      inpainting?: string;
      characterGeneration?: string;
      styleRefinement?: string;
    };
  };
  isActive: boolean;
  lastConnected?: string; // ISO date string
  status?: 'connected' | 'disconnected' | 'error' | 'testing';
  serverInfo?: ComfyUIServerInfo;
  
  // Advanced settings
  maxQueueSize?: number;
  timeout?: number;
  vramLimit?: number;
  modelsPath?: string;
  autoStart?: boolean;
  corsHeaders?: boolean;
  workflowsPath?: string;

  // Performance settings
  performance?: {
    batchSize?: number;
    precision?: 'FP16' | 'FP32' | 'FP8';
    steps?: number;
    denoisingStrength?: number;
  };

  // Workflow and Model Preferences
  workflows?: {
    imageGeneration?: string;
    videoGeneration?: string;
    upscaling?: string;
    inpainting?: string;
    characterGeneration?: string;
  };
  models?: {
    preferredCheckpoint?: string;
    preferredVAE?: string;
    preferredCLIP?: string;
    preferredLora?: string[];
  };
}

/**
 * Multi-Server Configuration
 */
export interface ComfyUIServersConfig {
  servers: ComfyUIServer[];
  activeServerId: string | null;
  autoSwitchOnFailure: boolean;
  version: string;
}

export interface DiscoveredServer {
  url: string;
  type: 'comfyui' | 'mcp';
  name?: string;
  status: 'online';
}

/**
 * MCP Tool Definition
 */
export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

/**
 * Server creation input (without generated fields)
 */
export type CreateComfyUIServerInput = Omit<ComfyUIServer, 'id' | 'isActive' | 'lastConnected' | 'status' | 'serverInfo'>;

/**
 * Server update input (partial fields)
 */
export type UpdateComfyUIServerInput = Partial<Omit<ComfyUIServer, 'id'>>;
