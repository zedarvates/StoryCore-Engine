/**
 * StoryCore Creative Studio - API Configuration
 * ==============================================
 * 
 * Simple, centralized API URL configuration for all services.
 * Re-exports from serverConfig.ts for convenience.
 * 
 * USAGE:
 *   import { API_BASE_URL, OLLAMA_URL, COMFYUI_URL } from '@/config/apiConfig';
 *   
 * Environment Variables (set these for production):
 *   VITE_API_URL       - Backend API URL (default: http://localhost:8080)
 *   VITE_OLLAMA_URL    - Ollama LLM service URL (default: http://localhost:11434)
 *   VITE_COMFYUI_URL   - ComfyUI service URL (default: http://127.0.0.1:7860)
 *   VITE_REDIS_URL     - Redis connection URL (default: redis://localhost:6379/0)
 *   VITE_BACKEND_URL   - Alternative backend URL (default: http://localhost:3000)
 *   VITE_WS_URL        - WebSocket URL (default: ws://localhost:5000)
 */

// Re-export everything from serverConfig for backward compatibility
export {
  config,
  createConfig,
  getApiUrl,
  getOllamaUrl,
  getComfyUiUrl,
  getGitHubApiUrl,
  getRedisUrl,
  getDatabaseUrl,
  isDev,
  isProd,
  useMockLlm,
  useMockComfyUi,
  isDebugEnabled,
  getLlmApiUrl,
  type AppConfig,
  type ServerConfig,
  type OllamaConfig,
  type ComfyUIConfig,
  type RedisConfig,
  type GitHubConfig,
  type DatabaseConfig,
  type FeatureFlags,
  type CorsConfig,
  type FileStorageConfig,
} from './serverConfig';

// ============================================================================
// Simple URL Constants (for quick imports)
// ============================================================================

import { config } from './serverConfig';

/**
 * Backend API base URL
 * @example const response = await fetch(`${API_BASE_URL}/health`);
 */
export const API_BASE_URL = config.server.url;

/**
 * Ollama LLM service URL
 * @example const response = await fetch(`${OLLAMA_URL}/api/tags`);
 */
export const OLLAMA_URL = config.ollama.baseUrl;

/**
 * ComfyUI service URL
 * @example const response = await fetch(`${COMFYUI_URL}/system_stats`);
 */
export const COMFYUI_URL = config.comfyui.baseUrl;

/**
 * Redis connection URL (for backend use)
 */
export const REDIS_URL = config.redis.url;

/**
 * Default Ollama model
 */
export const DEFAULT_OLLAMA_MODEL = config.ollama.model;

/**
 * Ollama timeout in milliseconds
 */
export const OLLAMA_TIMEOUT = config.ollama.timeout;

/**
 * ComfyUI timeout in milliseconds
 */
export const COMFYUI_TIMEOUT = config.comfyui.timeout;

// ============================================================================
// Backend URL Aliases (for services that use VITE_BACKEND_URL)
// ============================================================================

/**
 * Backend URL (alias for services expecting VITE_BACKEND_URL)
 * This maps to the API server URL by default
 */
export const BACKEND_URL = config.server.url;

/**
 * WebSocket URL for real-time communication
 * Derived from API URL or can be set via VITE_WS_URL
 */
export const WS_URL = (() => {
  // Check for Vite environment variable
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  // Derive from server config
  const host = config.server.host === '0.0.0.0' ? 'localhost' : config.server.host;
  return `ws://${host}:${config.server.port}`;
})();

// ============================================================================
// Default Export
// ============================================================================

export default {
  API_BASE_URL,
  OLLAMA_URL,
  COMFYUI_URL,
  REDIS_URL,
  BACKEND_URL,
  WS_URL,
  DEFAULT_OLLAMA_MODEL,
  OLLAMA_TIMEOUT,
  COMFYUI_TIMEOUT,
};
