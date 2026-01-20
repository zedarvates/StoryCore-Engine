/**
 * ComfyUI Multi-Server Types
 * 
 * Defines types for managing multiple ComfyUI servers
 */

import type { ComfyUIConfig, ComfyUIServerInfo, AuthenticationType } from '@/services/comfyuiService';

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

/**
 * Server creation input (without generated fields)
 */
export type CreateComfyUIServerInput = Omit<ComfyUIServer, 'id' | 'isActive' | 'lastConnected' | 'status' | 'serverInfo'>;

/**
 * Server update input (partial fields)
 */
export type UpdateComfyUIServerInput = Partial<Omit<ComfyUIServer, 'id'>>;
