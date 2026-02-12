/**
 * StoryCore Creative Studio - Server Configuration
 * ================================================
 * 
 * Centralized configuration for all server URLs and service endpoints.
 * This file provides a single source of truth for all service connections.
 * 
 * Environment Variables (Vite/React):
 * - VITE_API_URL - Backend API URL
 * - VITE_OLLAMA_URL - Ollama LLM service URL
 * - VITE_OLLAMA_MODEL - Default Ollama model
 * - VITE_COMFYUI_URL - ComfyUI service URL
 * - VITE_REDIS_URL - Redis connection URL
 * - VITE_GITHUB_API_URL - GitHub API URL
 * - VITE_GITHUB_TOKEN - GitHub API token
 * - VITE_USE_MOCK_LLM - Use mock LLM responses
 * - VITE_DEBUG - Enable debug mode
 * 
 * Usage:
 *   import { config, getApiUrl, getOllamaUrl } from '../config/serverConfig';
 *   
 *   // Access full configuration
 *   console.log(config.ollama.baseUrl);
 *   
 *   // Get URL for specific endpoint
 *   const apiUrl = getApiUrl('/llm/generate');
 */

// ============================================================================
// Type Definitions
// ============================================================================

export interface ServerConfig {
  host: string;
  port: number;
  url: string;
  version: string;
}

export interface OllamaConfig {
  baseUrl: string;
  model: string;
  timeout: number;
  embeddingModel: string;
}

export interface ComfyUIConfig {
  baseUrl: string;
  timeout: number;
  workflowFolder: string;
}

export interface RedisConfig {
  url: string;
  db: number;
}

export interface GitHubConfig {
  apiUrl: string;
  token?: string;
  org?: string;
  repo?: string;
}

export interface DatabaseConfig {
  url: string;
}

export interface FeatureFlags {
  mockLlm: boolean;
  mockComfyui: boolean;
  mockRedis: boolean;
  debug: boolean;
}

export interface CorsConfig {
  enabled: boolean;
  origins: string[];
}

export interface FileStorageConfig {
  uploadFolder: string;
  outputFolder: string;
  maxUploadSize: number;
}

export interface AppConfig {
  server: ServerConfig;
  ollama: OllamaConfig;
  comfyui: ComfyUIConfig;
  redis: RedisConfig;
  github: GitHubConfig;
  database: DatabaseConfig;
  featureFlags: FeatureFlags;
  cors: CorsConfig;
  fileStorage: FileStorageConfig;
}

// ============================================================================
// Environment Variable Helpers
// ============================================================================

/**
 * Get string environment variable with fallback
 */
const getEnvString = (
  key: string,
  defaultValue: string | undefined,
  allowUndefined?: boolean
): string | undefined => {
  // Check Vite environment (import.meta.env)
  if (typeof importMetaEnv !== 'undefined') {
    const val = (importMetaEnv as Record<string, unknown>)[key];
    if (val !== undefined) {
      return String(val);
    }
  }
  // Check Node.js environment (process.env)
  if (typeof process !== 'undefined' && process.env) {
    const val = process.env[key];
    if (val !== undefined) {
      return val;
    }
  }
  return allowUndefined ? undefined : defaultValue;
};

/**
 * Get boolean environment variable with fallback
 */
const getEnvBoolean = (
  key: string,
  defaultValue: boolean
): boolean => {
  if (typeof importMetaEnv !== 'undefined') {
    const val = (importMetaEnv as Record<string, unknown>)[key];
    if (val !== undefined) {
      return val === true || val === 'true' || val === '1' || val === 1;
    }
  }
  if (typeof process !== 'undefined' && process.env) {
    const val = process.env[key];
    if (val !== undefined) {
      return val === 'true' || val === '1';
    }
  }
  return defaultValue;
};

/**
 * Get number environment variable with fallback
 */
const getEnvNumber = (
  key: string,
  defaultValue: number
): number => {
  if (typeof importMetaEnv !== 'undefined') {
    const val = (importMetaEnv as Record<string, unknown>)[key];
    if (val !== undefined) {
      const parsed = parseInt(String(val), 10);
      return isNaN(parsed) ? defaultValue : parsed;
    }
  }
  if (typeof process !== 'undefined' && process.env) {
    const val = process.env[key];
    if (val !== undefined) {
      const parsed = parseInt(val, 10);
      return isNaN(parsed) ? defaultValue : parsed;
    }
  }
  return defaultValue;
};

// ============================================================================
// Vite Import Meta Env Type Declaration
// ============================================================================

interface ImportMetaEnv {
  VITE_API_URL?: string;
  VITE_OLLAMA_URL?: string;
  VITE_OLLAMA_MODEL?: string;
  VITE_COMFYUI_URL?: string;
  VITE_REDIS_URL?: string;
  VITE_GITHUB_API_URL?: string;
  VITE_GITHUB_TOKEN?: string;
  VITE_USE_MOCK_LLM?: string;
  VITE_DEBUG?: string;
  VITE_CORS_ORIGINS?: string;
  VITE_API_HOST?: string;
  VITE_API_PORT?: string;
  VITE_API_VERSION?: string;
  VITE_OLLAMA_TIMEOUT?: string;
  VITE_OLLAMA_EMBEDDING_MODEL?: string;
  VITE_COMFYUI_TIMEOUT?: string;
  VITE_COMFYUI_WORKFLOW_FOLDER?: string;
  VITE_REDIS_DB?: string;
  VITE_GITHUB_ORG?: string;
  VITE_GITHUB_REPO?: string;
  VITE_USE_MOCK_COMFYUI?: string;
  VITE_USE_MOCK_REDIS?: string;
  VITE_UPLOAD_FOLDER?: string;
  VITE_OUTPUT_FOLDER?: string;
  VITE_MAX_UPLOAD_SIZE?: string;
  DEV?: boolean;
  PROD?: boolean;
}

declare const importMetaEnv: ImportMetaEnv;

// ============================================================================
// Configuration Factory
// ============================================================================

/**
 * Create the application configuration
 */
export const createConfig = (): AppConfig => {
  // Parse CORS origins from comma-separated string
  const corsOriginsString = getEnvString('VITE_CORS_ORIGINS', 
    'http://localhost:3000,http://localhost:5173,http://127.0.0.1:5173'
  ) || '';
  const corsOrigins = corsOriginsString.split(',').map((o) => o.trim()).filter(Boolean);

  return {
    server: {
      host: getEnvString('VITE_API_HOST', '0.0.0.0') || '0.0.0.0',
      port: getEnvNumber('VITE_API_PORT', 8080),
      url: getEnvString('VITE_API_URL', 'http://localhost:8080') || 'http://localhost:8080',
      version: getEnvString('VITE_API_VERSION', 'v1') || 'v1',
    },
    ollama: {
      baseUrl: getEnvString('VITE_OLLAMA_URL', 'http://localhost:11434') || 'http://localhost:11434',
      model: getEnvString('VITE_OLLAMA_MODEL', 'qwen3:8b') || 'qwen3:8b',
      timeout: getEnvNumber('VITE_OLLAMA_TIMEOUT', 300000),
      embeddingModel: getEnvString('VITE_OLLAMA_EMBEDDING_MODEL', 'nomic-embed-text') || 'nomic-embed-text',
    },
    comfyui: {
      baseUrl: getEnvString('VITE_COMFYUI_URL', 'http://127.0.0.1:7860') || 'http://127.0.0.1:7860',
      timeout: getEnvNumber('VITE_COMFYUI_TIMEOUT', 600000),
      workflowFolder: getEnvString('VITE_COMFYUI_WORKFLOW_FOLDER', 'workflows') || 'workflows',
    },
    redis: {
      url: getEnvString('VITE_REDIS_URL', 'redis://localhost:6379/0') || 'redis://localhost:6379/0',
      db: getEnvNumber('VITE_REDIS_DB', 0),
    },
    github: {
      apiUrl: getEnvString('VITE_GITHUB_API_URL', 'https://api.github.com') || 'https://api.github.com',
      token: getEnvString('VITE_GITHUB_TOKEN', undefined, true),
      org: getEnvString('VITE_GITHUB_ORG', undefined, true),
      repo: getEnvString('VITE_GITHUB_REPO', undefined, true),
    },
    database: {
      url: getEnvString('DATABASE_URL', 'postgresql://user:password@localhost/video_editor') || 'postgresql://user:password@localhost/video_editor',
    },
    featureFlags: {
      mockLlm: getEnvBoolean('VITE_USE_MOCK_LLM', false),
      mockComfyui: getEnvBoolean('VITE_USE_MOCK_COMFYUI', false),
      mockRedis: getEnvBoolean('VITE_USE_MOCK_REDIS', false),
      debug: getEnvBoolean('VITE_DEBUG', false),
    },
    cors: {
      enabled: true,
      origins: corsOrigins,
    },
    fileStorage: {
      uploadFolder: getEnvString('VITE_UPLOAD_FOLDER', 'uploads') || 'uploads',
      outputFolder: getEnvString('VITE_OUTPUT_FOLDER', 'output') || 'output',
      maxUploadSize: getEnvNumber('VITE_MAX_UPLOAD_SIZE', 100 * 1024 * 1024),
    },
  };
};

// Export singleton config instance
export const config = createConfig();

// ============================================================================
// URL Helper Functions
// ============================================================================

/**
 * Get full API URL for an endpoint
 * @param endpoint - API endpoint (e.g., '/llm/generate' or 'llm/generate')
 * @returns Full URL with trailing slash handling
 */
export const getApiUrl = (endpoint: string): string => {
  const base = config.server.url.replace(/\/$/, '');
  const cleanEndpoint = endpoint.replace(/^\//, '');
  return `${base}/${cleanEndpoint}`;
};

/**
 * Get full Ollama URL for an endpoint
 * @param endpoint - Ollama endpoint (e.g., '/api/generate')
 * @returns Full Ollama URL
 */
export const getOllamaUrl = (endpoint: string): string => {
  const base = config.ollama.baseUrl.replace(/\/$/, '');
  const cleanEndpoint = endpoint.replace(/^\//, '');
  return `${base}/${cleanEndpoint}`;
};

/**
 * Get full ComfyUI URL for an endpoint
 * @param endpoint - ComfyUI endpoint (e.g., '/api/prompt')
 * @returns Full ComfyUI URL
 */
export const getComfyUiUrl = (endpoint: string): string => {
  const base = config.comfyui.baseUrl.replace(/\/$/, '');
  const cleanEndpoint = endpoint.replace(/^\//, '');
  return `${base}/${cleanEndpoint}`;
};

/**
 * Get full GitHub API URL for an endpoint
 * @param endpoint - GitHub API endpoint (e.g., '/repos/owner/repo')
 * @returns Full GitHub API URL
 */
export const getGitHubApiUrl = (endpoint: string): string => {
  const base = config.github.apiUrl.replace(/\/$/, '');
  const cleanEndpoint = endpoint.replace(/^\//, '');
  return `${base}/${cleanEndpoint}`;
};

/**
 * Get Redis connection URL
 * @returns Redis URL
 */
export const getRedisUrl = (): string => {
  return config.redis.url;
};

/**
 * Get Database connection URL
 * @returns Database URL
 */
export const getDatabaseUrl = (): string => {
  return config.database.url;
};

// ============================================================================
// Environment Detection
// ============================================================================

/**
 * Check if running in development mode
 */
export const isDev = (): boolean => {
  if (importMetaEnv.DEV !== undefined) {
    return importMetaEnv.DEV;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV === 'development';
  }
  return config.server.url.includes('localhost');
};

/**
 * Check if running in production mode
 */
export const isProd = (): boolean => {
  if (importMetaEnv.PROD !== undefined) {
    return importMetaEnv.PROD;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env.NODE_ENV === 'production';
  }
  return false;
};

/**
 * Check if mock LLM is enabled
 */
export const useMockLlm = (): boolean => {
  return config.featureFlags.mockLlm;
};

/**
 * Check if mock ComfyUI is enabled
 */
export const useMockComfyUi = (): boolean => {
  return config.featureFlags.mockComfyui;
};

/**
 * Check if debug mode is enabled
 */
export const isDebugEnabled = (): boolean => {
  return config.featureFlags.debug;
};

// ============================================================================
// Service-Specific Helpers
// ============================================================================

/**
 * Get LLM API endpoint URL
 */
export const getLlmApiUrl = (): string => {
  return getApiUrl('/llm');
};

/**
 * Get ComfyUI API endpoint URL
 */
export const getComfyUiApiUrl = (): string => {
  return getApiUrl('/comfyui');
};

/**
 * Get Video Editor API endpoint URL
 */
export const getVideoEditorApiUrl = (): string => {
  return getApiUrl('/video-editor');
};

/**
 * Get Audio API endpoint URL
 */
export const getAudioApiUrl = (): string => {
  return getApiUrl('/audio');
};

/**
 * Get GitHub API endpoint URL
 */
export const getGitHubApiEndpoint = (): string => {
  return getApiUrl('/github');
};

// ============================================================================
// Default Export
// ============================================================================

export default {
  config,
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
};
