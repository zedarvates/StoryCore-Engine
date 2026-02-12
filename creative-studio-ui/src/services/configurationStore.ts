/**
 * Configuration Storage Service
 * 
 * Handles persistence and retrieval of configuration data using
 * a hybrid approach: file system for project configs and local storage
 * for global configs.
 */

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
 * NOTE: This is a basic implementation. Use proper encryption in production.
 */
function encryptSensitiveData(data: string): string {
  const key = 'storycore-secret-key'; // In production, use environment variable
  let encrypted = '';
  for (let i = 0; i < data.length; i++) {
    encrypted += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(encrypted);
}

/**
 * Decrypt sensitive data
 */
function decryptSensitiveData(encrypted: string): string {
  try {
    const key = 'storycore-secret-key';
    const decoded = atob(encrypted);
    let decrypted = '';
    for (let i = 0; i < decoded.length; i++) {
      decrypted += String.fromCharCode(decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length));
    }
    return decrypted;
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
      const configToSave = this.encryptSensitiveFields(config);
      
      // Save to local storage
      const key = `${PROJECT_CONFIG_PREFIX}${projectId}`;
      localStorage.setItem(key, JSON.stringify(configToSave));
      
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
      const key = `${PROJECT_CONFIG_PREFIX}${projectId}`;
      const stored = localStorage.getItem(key);
      
      if (!stored) {
        // Return default configuration if not found
        return this.getDefaultProjectConfig(projectId);
      }
      
      const config = JSON.parse(stored);

      // Decrypt sensitive fields
      const decryptedConfig = this.decryptSensitiveFields(config);

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
  private static encryptSensitiveFields(config: ProjectConfiguration): unknown {
    const encrypted = JSON.parse(JSON.stringify(config));
    
    // Encrypt API keys
    if (encrypted.api?.endpoints) {
      Object.keys(encrypted.api.endpoints).forEach(key => {
        if (encrypted.api.endpoints[key].apiKey) {
          encrypted.api.endpoints[key].apiKey = encryptSensitiveData(
            encrypted.api.endpoints[key].apiKey
          );
        }
      });
    }
    
    // Encrypt LLM API keys
    if (encrypted.llm?.openai?.apiKey) {
      encrypted.llm.openai.apiKey = encryptSensitiveData(encrypted.llm.openai.apiKey);
    }
    if (encrypted.llm?.anthropic?.apiKey) {
      encrypted.llm.anthropic.apiKey = encryptSensitiveData(encrypted.llm.anthropic.apiKey);
    }
    if (encrypted.llm?.custom?.apiKey) {
      encrypted.llm.custom.apiKey = encryptSensitiveData(encrypted.llm.custom.apiKey);
    }
    
    // Encrypt ComfyUI API keys (legacy and multi-server)
    if (encrypted.comfyui?.apiKey) {
      encrypted.comfyui.apiKey = encryptSensitiveData(encrypted.comfyui.apiKey);
    }
    if (encrypted.comfyui?.servers) {
      encrypted.comfyui.servers.forEach((server: unknown) => {
        if (server.apiKey) {
          server.apiKey = encryptSensitiveData(server.apiKey);
        }
      });
    }
    
    return encrypted;
  }

  /**
   * Decrypt sensitive fields in configuration
   */
  private static decryptSensitiveFields(config: unknown): ProjectConfiguration {
    const decrypted = JSON.parse(JSON.stringify(config));
    
    // Decrypt API keys
    if (decrypted.api?.endpoints) {
      Object.keys(decrypted.api.endpoints).forEach(key => {
        if (decrypted.api.endpoints[key].apiKey) {
          decrypted.api.endpoints[key].apiKey = decryptSensitiveData(
            decrypted.api.endpoints[key].apiKey
          );
        }
      });
    }
    
    // Decrypt LLM API keys
    if (decrypted.llm?.openai?.apiKey) {
      decrypted.llm.openai.apiKey = decryptSensitiveData(decrypted.llm.openai.apiKey);
    }
    if (decrypted.llm?.anthropic?.apiKey) {
      decrypted.llm.anthropic.apiKey = decryptSensitiveData(decrypted.llm.anthropic.apiKey);
    }
    if (decrypted.llm?.custom?.apiKey) {
      decrypted.llm.custom.apiKey = decryptSensitiveData(decrypted.llm.custom.apiKey);
    }
    
    // Decrypt ComfyUI API keys (legacy and multi-server)
    if (decrypted.comfyui?.apiKey) {
      decrypted.comfyui.apiKey = decryptSensitiveData(decrypted.comfyui.apiKey);
    }
    if (decrypted.comfyui?.servers) {
      decrypted.comfyui.servers.forEach((server: unknown) => {
        if (server.apiKey) {
          server.apiKey = decryptSensitiveData(server.apiKey);
        }
      });
    }
    
    return decrypted;
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
    return {
      projectId: config.projectId || '',
      api: { ...DEFAULT_API_CONFIG, ...config.api },
      llm: { ...DEFAULT_LLM_CONFIG, ...config.llm },
      comfyui: { ...DEFAULT_COMFYUI_CONFIG, ...config.comfyui },
      wizards: config.wizards || [],
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
      ...config,
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



