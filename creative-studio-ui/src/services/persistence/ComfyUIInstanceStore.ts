/**
 * ComfyUI Instance Store
 *
 * Persistence layer for ComfyUI instance configurations and state.
 * Handles loading, saving, and migrating instance data.
 */

import type {
  ComfyUIInstancesConfig,
  ComfyUIInstanceConfig,
  MigrationResult,
} from '../../types/comfyui-instance';
import { WizardError } from '../wizard/types';
import { getLogger } from '../wizard/logger';

const CONFIG_VERSION = '1.0';
const CONFIG_FILENAME = 'comfyui_instances.json';

/**
 * ComfyUI Instance Persistence Store
 */
export class ComfyUIInstanceStore {
  private configPath: string;
  private logger = getLogger();

  constructor(configPath?: string) {
    this.configPath = configPath || this.getDefaultConfigPath();
  }

  /**
   * Load instance configurations from storage
   */
  async loadInstances(): Promise<ComfyUIInstancesConfig> {
    try {
      const configText = await this.readConfigFile();
      const config: ComfyUIInstancesConfig = JSON.parse(configText);

      // Validate and migrate if necessary
      const migratedConfig = await this.migrateConfig(config);

      this.logger.info('comfyui-store', 'Loaded instance configurations', {
        version: migratedConfig.version,
        instanceCount: migratedConfig.instances.length,
        activeInstanceId: migratedConfig.activeInstanceId,
      });

      return migratedConfig;
    } catch (error) {
      if (error instanceof WizardError) {
        throw error;
      }

      // If file doesn't exist or is corrupted, return default config
      this.logger.warn('comfyui-store', 'Failed to load config, using defaults', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      return this.createDefaultConfig();
    }
  }

  /**
   * Save instance configurations to storage
   */
  async saveInstances(config: ComfyUIInstancesConfig): Promise<void> {
    try {
      // Update timestamp
      config.lastSaved = new Date().toISOString();

      // Validate config before saving
      this.validateConfig(config);

      const configText = JSON.stringify(config, null, 2);
      await this.writeConfigFile(configText);

      this.logger.info('comfyui-store', 'Saved instance configurations', {
        version: config.version,
        instanceCount: config.instances.length,
        activeInstanceId: config.activeInstanceId,
      });
    } catch (error) {
      this.logger.error('comfyui-store', 'Failed to save instance configurations', error as Error);
      throw new WizardError(
        'Failed to save ComfyUI instance configurations',
        'filesystem',
        false,
        false,
        { originalError: error }
      );
    }
  }

  /**
   * Export configurations to a string
   */
  async exportInstances(): Promise<string> {
    const config = await this.loadInstances();
    return JSON.stringify(config, null, 2);
  }

  /**
   * Import configurations from a string
   */
  async importInstances(data: string): Promise<void> {
    try {
      const importedConfig: ComfyUIInstancesConfig = JSON.parse(data);

      // Validate imported config
      this.validateConfig(importedConfig);

      // Check for port conflicts with existing instances
      await this.validateImportedInstances(importedConfig.instances);

      // Save imported config
      await this.saveInstances(importedConfig);

      this.logger.info('comfyui-store', 'Imported instance configurations', {
        version: importedConfig.version,
        instanceCount: importedConfig.instances.length,
      });
    } catch (error) {
      this.logger.error('comfyui-store', 'Failed to import instance configurations', error as Error);
      throw new WizardError(
        'Failed to import ComfyUI instance configurations',
        'datacontract',
        false,
        false,
        { originalError: error }
      );
    }
  }

  /**
   * Migrate legacy single-instance configuration
   */
  async migrateLegacyConfig(): Promise<MigrationResult> {
    try {
      // Try to detect and load legacy configuration
      // This would check project config or other locations for single-instance setup
      const legacyConfig = await this.detectLegacyConfig();

      if (!legacyConfig) {
        return {
          migrated: false,
          toVersion: CONFIG_VERSION,
          instancesCreated: 0,
          errors: [],
        };
      }

      // Create instance from legacy config
      const instanceConfig: ComfyUIInstanceConfig = {
        id: 'legacy_migrated',
        name: 'Migrated Instance',
        port: legacyConfig.port || 8188,
        host: legacyConfig.host || 'localhost',
        gpuDevice: legacyConfig.gpuDevice,
        envVars: legacyConfig.envVars,
        customNodesPath: legacyConfig.customNodesPath,
        maxConcurrentWorkflows: legacyConfig.maxConcurrentWorkflows,
        timeoutMs: legacyConfig.timeout,
        enableQueueMonitoring: legacyConfig.enableQueueMonitoring !== false,
        autoStart: false,
        description: 'Migrated from legacy single-instance configuration',
      };

      // Load current config and add migrated instance
      const currentConfig = await this.loadInstances();
      const existingIds = new Set(currentConfig.instances.map(i => i.id));

      // Generate unique ID if needed
      let instanceId = instanceConfig.id;
      let counter = 1;
      while (existingIds.has(instanceId)) {
        instanceId = `${instanceConfig.id}_${counter}`;
        counter++;
      }
      instanceConfig.id = instanceId;

      currentConfig.instances.push(instanceConfig);

      // Set as active if no active instance
      if (!currentConfig.activeInstanceId) {
        currentConfig.activeInstanceId = instanceConfig.id;
      }

      // Save migrated config
      await this.saveInstances(currentConfig);

      this.logger.info('comfyui-store', 'Migrated legacy configuration', {
        instanceId: instanceConfig.id,
        port: instanceConfig.port,
      });

      return {
        migrated: true,
        fromVersion: 'legacy',
        toVersion: CONFIG_VERSION,
        instancesCreated: 1,
        errors: [],
      };
    } catch (error) {
      this.logger.error('comfyui-store', 'Failed to migrate legacy config', error as Error);
      return {
        migrated: false,
        toVersion: CONFIG_VERSION,
        instancesCreated: 0,
        errors: [error instanceof Error ? error.message : 'Unknown migration error'],
      };
    }
  }

  /**
   * Get default configuration file path
   */
  private getDefaultConfigPath(): string {
    // Use localStorage key for browser environment
    // In Electron, this could be extended to use file system
    return CONFIG_FILENAME;
  }

  /**
   * Read configuration from storage
   */
  private async readConfigFile(): Promise<string> {
    // Browser environment - use localStorage
    const configText = localStorage.getItem(this.configPath);
    if (!configText) {
      throw new WizardError(
        'Configuration not found in localStorage',
        'filesystem',
        false,
        false,
        { configPath: this.configPath }
      );
    }
    return configText;
  }

  /**
   * Write configuration to storage
   */
  private async writeConfigFile(configText: string): Promise<void> {
    // Browser environment - use localStorage
    localStorage.setItem(this.configPath, configText);
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(): ComfyUIInstancesConfig {
    return {
      version: CONFIG_VERSION,
      instances: [
        {
          id: 'default_instance',
          name: 'Default Instance',
          port: 8188,
          host: 'localhost',
          maxConcurrentWorkflows: 1,
          timeoutMs: 300000,
          enableQueueMonitoring: true,
          autoStart: false,
          description: 'Default ComfyUI instance',
        },
      ],
      activeInstanceId: 'default_instance',
      lastSaved: new Date().toISOString(),
    };
  }

  /**
   * Validate configuration structure
   */
  private validateConfig(config: ComfyUIInstancesConfig): void {
    if (!config.version) {
      throw new WizardError(
        'Configuration missing version',
        'datacontract',
        false,
        false
      );
    }

    if (!Array.isArray(config.instances)) {
      throw new WizardError(
        'Configuration instances must be an array',
        'datacontract',
        false,
        false
      );
    }

    // Validate each instance
    const ids = new Set<string>();
    for (const instance of config.instances) {
      if (!instance.id || !instance.name || typeof instance.port !== 'number') {
        throw new WizardError(
          'Invalid instance configuration',
          'datacontract',
          false,
          false,
          { instanceId: instance.id }
        );
      }

      if (ids.has(instance.id)) {
        throw new WizardError(
          `Duplicate instance ID: ${instance.id}`,
          'datacontract',
          false,
          false,
          { instanceId: instance.id }
        );
      }
      ids.add(instance.id);

      if (instance.port < 1 || instance.port > 65535) {
        throw new WizardError(
          `Invalid port number: ${instance.port}`,
          'datacontract',
          false,
          false,
          { instanceId: instance.id, port: instance.port }
        );
      }
    }

    // Validate active instance ID
    if (config.activeInstanceId && !ids.has(config.activeInstanceId)) {
      throw new WizardError(
        `Active instance ID not found: ${config.activeInstanceId}`,
        'datacontract',
        false,
        false,
        { activeInstanceId: config.activeInstanceId }
      );
    }
  }

  /**
   * Validate imported instances for conflicts
   */
  private async validateImportedInstances(instances: ComfyUIInstanceConfig[]): Promise<void> {
    const currentConfig = await this.loadInstances();
    const currentPorts = new Set(currentConfig.instances.map(i => i.port));

    for (const instance of instances) {
      if (currentPorts.has(instance.port)) {
        throw new WizardError(
          `Imported instance port conflict: ${instance.port} (instance: ${instance.name})`,
          'datacontract',
          false,
          false,
          { instanceId: instance.id, port: instance.port }
        );
      }
    }
  }

  /**
   * Migrate configuration to current version
   */
  private async migrateConfig(config: ComfyUIInstancesConfig): Promise<ComfyUIInstancesConfig> {
    // For now, only version 1.0 is supported
    // Future migrations would go here
    return config;
  }

  /**
   * Detect legacy single-instance configuration
   */
  private async detectLegacyConfig(): Promise<any | null> {
    // Try to detect legacy configuration from various sources
    // This is a placeholder - actual implementation would check:
    // - Project configuration files
    // - Environment variables
    // - Other configuration stores

    // For now, return null (no legacy config detected)
    return null;
  }
}

// Singleton instance
let instanceStoreInstance: ComfyUIInstanceStore | null = null;

/**
 * Get the singleton instance store
 */
export function getComfyUIInstanceStore(): ComfyUIInstanceStore {
  if (!instanceStoreInstance) {
    instanceStoreInstance = new ComfyUIInstanceStore();
  }
  return instanceStoreInstance;
}

/**
 * Create a new instance store instance
 */
export function createComfyUIInstanceStore(configPath?: string): ComfyUIInstanceStore {
  return new ComfyUIInstanceStore(configPath);
}
