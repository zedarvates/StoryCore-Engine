/**
 * Configuration Storage Service
 * 
 * Handles persistence and retrieval of configuration data using
 * a hybrid approach: file system for project configs and local storage
 * for global configs.
 */
import { LegacyAny } from '@/types/legacy';


import type {
  ProjectConfiguration,
  GlobalConfiguration,
} from '../types/configuration';
import {
  DEFAULT_API_CONFIG,
  DEFAULT_LLM_CONFIG,
  DEFAULT_COMFYUI_CONFIG,
  DEFAULT_GLOBAL_CONFIG,
} from '../types/configuration';
import { encryptValue, decryptValue, isEncrypted } from '../utils/secureStorage';

// ============================================================================
// Storage Keys
// ============================================================================

const GLOBAL_CONFIG_KEY = 'storycore_global_config';
const PROJECT_CONFIG_PREFIX = 'storycore_project_';

// ============================================================================
// Encryption Utilities (Simple XOR for demo - use proper encryption in production)
// ============================================================================

/**
 * Simple encryption for sensitive data (API keys, passwords)
 */
async function encryptSensitiveData(data: string): Promise<string> {
  const { encrypted, iv } = await encryptValue(data);
  return `${encrypted}:${iv}`;
}

/**
 * Decrypt sensitive data
 */
async function decryptSensitiveData(encryptedWithIv: string): Promise<string> {
  try {
    const [encrypted, iv] = encryptedWithIv.split(':');
    if (!encrypted || !iv) return '';
    return await decryptValue(encrypted, iv);
  } catch (error) {
    console.error('Failed to decrypt data:', error);
    return '';
  }
}

// ============================================================================
// Configuration Store Class
// ============================================================================

export class ConfigurationStore {
  /**
   * Save project configuration to storage
   */
  static async saveProjectConfig(
    projectId: string,
    config: ProjectConfiguration
  ): Promise<void> {
    try {
      // Encrypt sensitive fields
      const configToSave = await this.encryptSensitiveFields(config);

      // Try to save via Electron API (High integrity persistence in project.json)
      if (window.electronAPI?.config?.saveProject) {
        await window.electronAPI.config.saveProject(projectId, configToSave);
        console.log('[ConfigurationStore] Saved configuration via Electron API');
      } else {
        // Fallback to local storage
        const key = `${PROJECT_CONFIG_PREFIX}${projectId}`;
        localStorage.setItem(key, JSON.stringify(configToSave));
        console.warn('[ConfigurationStore] Fallback: Saved configuration to localStorage');
      }

    } catch (error) {
      console.error('Failed to save project configuration:', error);
      throw new Error(`Failed to save project configuration: ${error}`);
    }
  }

  /**
   * Load project configuration from storage
   */
  static async loadProjectConfig(projectId: string): Promise<ProjectConfiguration> {
    try {
      let storedConfig: string | null = null;
      let config: LegacyAny = null;

      // Try to load via Electron API
      if (window.electronAPI?.config?.loadProject) {
        config = await window.electronAPI.config.loadProject(projectId);
        console.log('[ConfigurationStore] Loaded configuration via Electron API');
      } 
      
      // Fallback to local storage if not found or API missing
      if (!config) {
        const key = `${PROJECT_CONFIG_PREFIX}${projectId}`;
        storedConfig = localStorage.getItem(key);
        if (storedConfig) {
          config = JSON.parse(storedConfig);
          console.warn('[ConfigurationStore] Loaded configuration from localStorage');
        }
      }

      if (!config) {
        // Return default configuration if not found
        return this.validateAndMergeProjectConfig(this.getDefaultProjectConfig(projectId));
      }

      // Decrypt sensitive fields
      const decryptedConfig = await this.decryptSensitiveFields(config);

      // Migrate legacy configurations
      const migratedConfig = this.migrateConfiguration(decryptedConfig);

      // Validate and merge with defaults
      return this.validateAndMergeProjectConfig(migratedConfig);
    } catch (error) {
      console.error('Failed to load project configuration:', error);
      // Return default configuration on error
      return this.getDefaultProjectConfig(projectId);
    }
  }

  /**
   * Save global configuration to storage
   */
  static async saveGlobalConfig(config: GlobalConfiguration): Promise<void> {
    try {
      localStorage.setItem(GLOBAL_CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('Failed to save global configuration:', error);
      throw new Error(`Failed to save global configuration: ${error}`);
    }
  }

  /**
   * Load global configuration from storage
   */
  static async loadGlobalConfig(): Promise<GlobalConfiguration> {
    try {
      const stored = localStorage.getItem(GLOBAL_CONFIG_KEY);

      if (!stored) {
        return DEFAULT_GLOBAL_CONFIG;
      }

      const config = JSON.parse(stored);
      return this.validateAndMergeGlobalConfig(config);
    } catch (error) {
      console.error('Failed to load global configuration:', error);
      return DEFAULT_GLOBAL_CONFIG;
    }
  }

  /**
   * Delete project configuration
   */
  static async deleteProjectConfig(projectId: string): Promise<void> {
    try {
      const key = `${PROJECT_CONFIG_PREFIX}${projectId}`;
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to delete project configuration:', error);
      throw new Error(`Failed to delete project configuration: ${error}`);
    }
  }

  /**
   * Export configuration as JSON string
   */
  static async exportConfiguration(projectId: string): Promise<string> {
    try {
      const projectConfig = await this.loadProjectConfig(projectId);
      const globalConfig = await this.loadGlobalConfig();

      const exportData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        projectConfig,
        globalConfig,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Failed to export configuration:', error);
      throw new Error(`Failed to export configuration: ${error}`);
    }
  }

  /**
   * Import configuration from JSON string
   */
  static async importConfiguration(projectId: string, data: string): Promise<void> {
    try {
      const importData = JSON.parse(data);

      // Validate import data structure
      if (!importData.version || !importData.projectConfig) {
        throw new Error('Invalid configuration format');
      }

      // Save imported configurations
      if (importData.projectConfig) {
        await this.saveProjectConfig(projectId, importData.projectConfig);
      }

      if (importData.globalConfig) {
        await this.saveGlobalConfig(importData.globalConfig);
      }

    } catch (error) {
      console.error('Failed to import configuration:', error);
      throw new Error(`Failed to import configuration: ${error}`);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  /**
   * Encrypt sensitive fields in configuration
   */
  private static async encryptSensitiveFields(config: ProjectConfiguration): Promise<Record<string, unknown>> {
    const encrypted = JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
    const encryptedTyped = encrypted as {
      api?: { endpoints?: Record<string, { apiKey?: string }> };
      llm?: { openai?: { apiKey?: string }; anthropic?: { apiKey?: string }; custom?: { apiKey?: string } };
      comfyui?: { apiKey?: string; servers?: Array<{ apiKey?: string }> };
    };

    // Encrypt API keys
    if (encryptedTyped.api?.endpoints) {
      Object.keys(encryptedTyped.api.endpoints).forEach(key => {
        if (encryptedTyped.api!.endpoints![key].apiKey) {
          encryptedTyped.api!.endpoints![key].apiKey = await encryptSensitiveData(
            encryptedTyped.api!.endpoints![key].apiKey!
          );
        }
      });
    }

    // Encrypt LLM API keys
    if (encryptedTyped.llm?.openai?.apiKey) {
      encryptedTyped.llm.openai.apiKey = await encryptSensitiveData(encryptedTyped.llm.openai.apiKey);
    }
    if (encryptedTyped.llm?.anthropic?.apiKey) {
      encryptedTyped.llm.anthropic.apiKey = await encryptSensitiveData(encryptedTyped.llm.anthropic.apiKey);
    }
    if (encryptedTyped.llm?.custom?.apiKey) {
      encryptedTyped.llm.custom.apiKey = await encryptSensitiveData(encryptedTyped.llm.custom.apiKey);
    }

    // Encrypt ComfyUI API keys (legacy and multi-server)
    if (encryptedTyped.comfyui?.apiKey) {
      encryptedTyped.comfyui.apiKey = await encryptSensitiveData(encryptedTyped.comfyui.apiKey);
    }
    if (encryptedTyped.comfyui?.servers) {
      for (const server of encryptedTyped.comfyui.servers) {
        if (server.apiKey) {
          server.apiKey = await encryptSensitiveData(server.apiKey);
        }
      }
    }

    return encrypted;
  }

  /**
   * Decrypt sensitive fields in configuration
   */
  private static async decryptSensitiveFields(config: unknown): Promise<ProjectConfiguration> {
    const decrypted = JSON.parse(JSON.stringify(config)) as {
      api?: { endpoints?: Record<string, { apiKey?: string }> };
      llm?: { openai?: { apiKey?: string }; anthropic?: { apiKey?: string }; custom?: { apiKey?: string } };
      comfyui?: { apiKey?: string; servers?: Array<{ apiKey?: string }> };
    };

    // Decrypt API keys
    if (decrypted.api?.endpoints) {
      Object.keys(decrypted.api.endpoints).forEach(key => {
        if (decrypted.api!.endpoints![key].apiKey) {
          decrypted.api!.endpoints![key].apiKey = await decryptSensitiveData(
            decrypted.api!.endpoints![key].apiKey!
          );
        }
      });
    }

    // Decrypt LLM API keys
    if (decrypted.llm?.openai?.apiKey) {
      decrypted.llm.openai.apiKey = await decryptSensitiveData(decrypted.llm.openai.apiKey);
    }
    if (decrypted.llm?.anthropic?.apiKey) {
      decrypted.llm.anthropic.apiKey = await decryptSensitiveData(decrypted.llm.anthropic.apiKey);
    }
    if (decrypted.llm?.custom?.apiKey) {
      decrypted.llm.custom.apiKey = await decryptSensitiveData(decrypted.llm.custom.apiKey);
    }

    // Decrypt ComfyUI API keys (legacy and multi-server)
    if (decrypted.comfyui?.apiKey) {
      decrypted.comfyui.apiKey = await decryptSensitiveData(decrypted.comfyui.apiKey);
    }
    if (decrypted.comfyui?.servers) {
      for (const server of decrypted.comfyui.servers) {
        if (server.apiKey) {
          server.apiKey = await decryptSensitiveData(server.apiKey);
        }
      }
    }

    return decrypted as unknown as ProjectConfiguration;
  }

  /**
   * Get default project configuration
   */
  private static getDefaultProjectConfig(projectId: string): ProjectConfiguration {
    return {
      projectId,
      api: DEFAULT_API_CONFIG,
      llm: DEFAULT_LLM_CONFIG,
      comfyui: DEFAULT_COMFYUI_CONFIG,
      wizards: [],
    };
  }

  /**
   * Validate and merge project configuration with defaults
   */
  private static validateAndMergeProjectConfig(
    config: unknown
  ): ProjectConfiguration {
    const c = config as Partial<ProjectConfiguration>;
    return {
      projectId: c.projectId || '',
      api: { ...DEFAULT_API_CONFIG, ...(c.api || {}) },
      llm: { ...DEFAULT_LLM_CONFIG, ...(c.llm || {}) },
      comfyui: { ...DEFAULT_COMFYUI_CONFIG, ...(c.comfyui || {}) },
      wizards: c.wizards || [],
    };
  }

  /**
   * Validate and merge global configuration with defaults
   */
  private static validateAndMergeGlobalConfig(
    config: unknown
  ): GlobalConfiguration {
    return {
      ...DEFAULT_GLOBAL_CONFIG,
      ...(config as Partial<GlobalConfiguration>),
    };
  }

  /**
   * Migrate legacy configuration formats to current version
   */
  private static migrateConfiguration(config: unknown): unknown {
    const migrated = JSON.parse(JSON.stringify(config));

    // Migrate ComfyUI configuration from single-server to multi-server format
    if (migrated.comfyui && !migrated.comfyui.servers) {
      const legacyComfyUI = migrated.comfyui;

      // Create legacy server
      const legacyServer = {
        id: 'legacy-default',
        name: 'Default Server',
        serverUrl: legacyComfyUI.serverUrl,
        apiKey: legacyComfyUI.apiKey,
        timeout: legacyComfyUI.timeout || 60000,
        enableQueueMonitoring: legacyComfyUI.enableQueueMonitoring !== false,
        availableWorkflows: [], // Will be populated on connection test
      };

      // Update to new format
      migrated.comfyui = {
        servers: [legacyServer],
        defaultServerId: 'legacy-default',
        workflowAssignments: legacyComfyUI.defaultWorkflows || {},
      };

    }

    return migrated;
  }
}



