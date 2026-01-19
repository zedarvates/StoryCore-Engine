/**
 * Configuration storage system
 * 
 * Manages application configuration with persistence to AppData directory
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Application configuration
 */
export interface AppConfig {
  version: string;
  window?: {
    width?: number;
    height?: number;
    x?: number;
    y?: number;
    maximized?: boolean;
  };
  server?: {
    port?: number;
    autoStart?: boolean;
  };
  recentProjects?: {
    maxCount?: number;
    autoCleanup?: boolean;
  };
  ui?: {
    theme?: 'light' | 'dark' | 'system';
    language?: string;
  };
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: AppConfig = {
  version: '1.0.0',
  window: {
    width: 1200,
    height: 800,
    maximized: false,
  },
  server: {
    port: 5173,
    autoStart: true,
  },
  recentProjects: {
    maxCount: 10,
    autoCleanup: true,
  },
  ui: {
    theme: 'system',
    language: 'en',
  },
};

/**
 * Configuration storage manager
 * 
 * Handles loading, saving, and validation of application configuration
 * with graceful degradation for storage failures
 */
export class ConfigStorage {
  private config: AppConfig;
  private configFilePath: string;
  private inMemoryMode: boolean = false;

  /**
   * Create a new ConfigStorage
   * @param configFilePath Path to the configuration file
   */
  constructor(configFilePath: string) {
    this.configFilePath = configFilePath;
    this.config = { ...DEFAULT_CONFIG };
    this.load();
  }

  /**
   * Get the current configuration
   * @returns Current configuration
   */
  getConfig(): AppConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   * @param updates Partial configuration updates
   */
  updateConfig(updates: Partial<AppConfig>): void {
    this.config = this.mergeConfig(this.config, updates);
    this.save();
  }

  /**
   * Get a specific configuration value
   * @param key Configuration key path (e.g., 'window.width')
   * @returns Configuration value or undefined
   */
  get<T = any>(key: string): T | undefined {
    const keys = key.split('.');
    let value: any = this.config;

    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return undefined;
      }
    }

    return value as T;
  }

  /**
   * Set a specific configuration value
   * @param key Configuration key path (e.g., 'window.width')
   * @param value Value to set
   */
  set(key: string, value: any): void {
    const keys = key.split('.');
    const lastKey = keys.pop();

    if (!lastKey) {
      return;
    }

    let target: any = this.config;
    for (const k of keys) {
      if (!(k in target) || typeof target[k] !== 'object') {
        target[k] = {};
      }
      target = target[k];
    }

    target[lastKey] = value;
    this.save();
  }

  /**
   * Reset configuration to defaults
   */
  reset(): void {
    this.config = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    this.save();
  }

  /**
   * Check if storage is in memory-only mode
   * @returns True if in memory-only mode
   */
  isInMemoryMode(): boolean {
    return this.inMemoryMode;
  }

  /**
   * Get the configuration file path
   * @returns Configuration file path
   */
  getConfigFilePath(): string {
    return this.configFilePath;
  }

  /**
   * Load configuration from storage
   */
  private load(): void {
    try {
      if (!fs.existsSync(this.configFilePath)) {
        // No config file exists, use defaults
        this.save();
        return;
      }

      const data = fs.readFileSync(this.configFilePath, 'utf-8');
      const loaded = JSON.parse(data);

      // Validate and merge with defaults
      if (this.validateConfig(loaded)) {
        this.config = this.mergeConfig(DEFAULT_CONFIG, loaded);
      } else {
        console.warn('Invalid configuration file, using defaults');
        this.config = { ...DEFAULT_CONFIG };
      }
    } catch (error) {
      console.error('Failed to load configuration:', error);
      console.warn('Falling back to in-memory configuration');
      this.inMemoryMode = true;
      this.config = { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Save configuration to storage
   */
  private save(): void {
    // Don't try to save if in memory-only mode
    if (this.inMemoryMode) {
      return;
    }

    try {
      // Ensure directory exists
      const dir = path.dirname(this.configFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write configuration
      fs.writeFileSync(
        this.configFilePath,
        JSON.stringify(this.config, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.error('Failed to save configuration:', error);
      console.warn('Switching to in-memory mode');
      this.inMemoryMode = true;
    }
  }

  /**
   * Validate configuration structure
   * @param config Configuration to validate
   * @returns True if valid
   */
  private validateConfig(config: any): boolean {
    if (!config || typeof config !== 'object') {
      return false;
    }

    // Check version (required)
    if (!config.version || typeof config.version !== 'string') {
      return false;
    }

    // Validate window config if present
    if (config.window !== undefined) {
      if (typeof config.window !== 'object' || config.window === null) {
        return false;
      }
      if (config.window.width !== undefined && (typeof config.window.width !== 'number' || isNaN(config.window.width))) {
        return false;
      }
      if (config.window.height !== undefined && (typeof config.window.height !== 'number' || isNaN(config.window.height))) {
        return false;
      }
    }

    // Validate server config if present
    if (config.server !== undefined) {
      if (typeof config.server !== 'object' || config.server === null) {
        return false;
      }
      if (config.server.port !== undefined && (typeof config.server.port !== 'number' || isNaN(config.server.port))) {
        return false;
      }
      if (config.server.autoStart !== undefined && typeof config.server.autoStart !== 'boolean') {
        return false;
      }
    }

    return true;
  }

  /**
   * Deep merge two configuration objects
   * @param target Target configuration
   * @param source Source configuration
   * @returns Merged configuration
   */
  private mergeConfig(target: AppConfig, source: Partial<AppConfig>): AppConfig {
    const result: any = { ...target };

    for (const key in source) {
      const sourceValue = (source as any)[key];
      const targetValue = result[key];

      if (sourceValue && typeof sourceValue === 'object' && !Array.isArray(sourceValue)) {
        if (targetValue && typeof targetValue === 'object' && !Array.isArray(targetValue)) {
          result[key] = this.mergeConfig(targetValue, sourceValue);
        } else {
          result[key] = { ...sourceValue };
        }
      } else {
        result[key] = sourceValue;
      }
    }

    return result;
  }
}
