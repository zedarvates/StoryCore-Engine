/**
 * ConfigManager - Manages LLM configuration in localStorage
 * 
 * Handles:
 * - Loading/saving LLM configuration
 * - Schema migration from old versions
 * - Validation of configuration fields
 * - Default configuration management
 */

export interface LLMConfig {
  // Existing fields
  provider: 'local' | 'openai' | 'anthropic';
  model: string;
  apiEndpoint: string;
  streamingEnabled: boolean;
  parameters: {
    temperature: number;
    maxTokens: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
  };
  
  // NEW: Multi-model support
  availableModels: {
    vision: string[];
    storytelling: string[];
    quick: string[];
    default: string;
  };
  
  // NEW: Reasoning mode
  reasoningMode: {
    enabled: boolean;
    format: 'thinking-summary' | 'standard';
    showThinking: boolean;
    confucianPrinciples: ('ren' | 'li' | 'yi' | 'zhi')[];
  };
  
  // Existing system prompts
  systemPrompts?: {
    worldGeneration?: string;
    characterGeneration?: string;
    storyGeneration?: string;
  };
  
  // Schema version for migration
  schemaVersion?: string;
}

const STORAGE_KEY = 'storycore-llm-config';
const CURRENT_SCHEMA_VERSION = '2.0';

/**
 * Default configuration for MVP
 */
const DEFAULT_CONFIG: LLMConfig = {
  provider: 'local',
  model: 'gemma3:4b',
  apiEndpoint: 'http://localhost:11434',
  streamingEnabled: true,
  parameters: {
    temperature: 0.7,
    maxTokens: 2000,
    topP: 0.9,
    frequencyPenalty: 0,
    presencePenalty: 0
  },
  availableModels: {
    vision: ['qwen3-vl:8b'],
    storytelling: ['llama3.1:8b', 'mistral:7b'],
    quick: ['gemma3:4b', 'gemma3:1b'],
    default: 'gemma3:4b'
  },
  reasoningMode: {
    enabled: true,
    format: 'thinking-summary',
    showThinking: false, // collapsed by default
    confucianPrinciples: ['ren', 'li', 'yi', 'zhi']
  },
  systemPrompts: {
    worldGeneration: 'You are a creative world-building assistant.',
    characterGeneration: 'You are a character creation specialist.',
    storyGeneration: 'You are a storytelling expert.'
  },
  schemaVersion: CURRENT_SCHEMA_VERSION
};

export class ConfigManager {
  /**
   * Get LLM configuration from localStorage
   * Applies migration if needed
   */
  static getLLMConfig(): LLMConfig {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      
      if (!stored) {
        // No config exists, return default
        return { ...DEFAULT_CONFIG };
      }
      
      const config = JSON.parse(stored) as LLMConfig;
      
      // Check if migration is needed
      if (!config.schemaVersion || config.schemaVersion !== CURRENT_SCHEMA_VERSION) {
        return this.migrateConfig(config);
      }
      
      // Validate and merge with defaults
      return this.validateAndMerge(config);
      
    } catch (error) {
      console.error('Error loading LLM config:', error);
      return { ...DEFAULT_CONFIG };
    }
  }
  
  /**
   * Save LLM configuration to localStorage
   */
  static saveLLMConfig(config: Partial<LLMConfig>): void {
    try {
      // Get current config
      const currentConfig = this.getLLMConfig();
      
      // Merge with new config
      const updatedConfig: LLMConfig = {
        ...currentConfig,
        ...config,
        schemaVersion: CURRENT_SCHEMA_VERSION
      };
      
      // Validate before saving
      if (!this.isValidConfig(updatedConfig)) {
        throw new Error('Invalid configuration');
      }
      
      // Save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedConfig));
      
      console.log('LLM config saved successfully');
      
    } catch (error) {
      console.error('Error saving LLM config:', error);
      throw error;
    }
  }
  
  /**
   * Reset configuration to defaults
   */
  static resetToDefaults(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CONFIG));
      console.log('LLM config reset to defaults');
    } catch (error) {
      console.error('Error resetting LLM config:', error);
      throw error;
    }
  }
  
  /**
   * Migrate old configuration to new schema
   */
  private static migrateConfig(oldConfig: LLMConfig): LLMConfig {
    console.log('Migrating LLM config from version', oldConfig.schemaVersion || '1.0', 'to', CURRENT_SCHEMA_VERSION);
    
    // Start with default config
    const migratedConfig: LLMConfig = { ...DEFAULT_CONFIG };
    
    // Preserve existing fields
    if (oldConfig.provider) migratedConfig.provider = oldConfig.provider;
    if (oldConfig.model) migratedConfig.model = oldConfig.model;
    if (oldConfig.apiEndpoint) migratedConfig.apiEndpoint = oldConfig.apiEndpoint;
    if (oldConfig.streamingEnabled !== undefined) {
      migratedConfig.streamingEnabled = oldConfig.streamingEnabled;
    }
    
    // Preserve parameters
    if (oldConfig.parameters) {
      migratedConfig.parameters = {
        ...DEFAULT_CONFIG.parameters,
        ...oldConfig.parameters
      };
    }
    
    // Preserve system prompts
    if (oldConfig.systemPrompts) {
      migratedConfig.systemPrompts = {
        ...DEFAULT_CONFIG.systemPrompts,
        ...oldConfig.systemPrompts
      };
    }
    
    // Add new fields with defaults if not present
    if (!oldConfig.availableModels) {
      migratedConfig.availableModels = DEFAULT_CONFIG.availableModels;
    } else {
      migratedConfig.availableModels = oldConfig.availableModels;
    }
    
    if (!oldConfig.reasoningMode) {
      migratedConfig.reasoningMode = DEFAULT_CONFIG.reasoningMode;
    } else {
      migratedConfig.reasoningMode = oldConfig.reasoningMode;
    }
    
    // Update schema version
    migratedConfig.schemaVersion = CURRENT_SCHEMA_VERSION;
    
    // Save migrated config
    this.saveLLMConfig(migratedConfig);
    
    return migratedConfig;
  }
  
  /**
   * Validate configuration and merge with defaults
   */
  private static validateAndMerge(config: LLMConfig): LLMConfig {
    return {
      ...DEFAULT_CONFIG,
      ...config,
      parameters: {
        ...DEFAULT_CONFIG.parameters,
        ...config.parameters
      },
      availableModels: {
        ...DEFAULT_CONFIG.availableModels,
        ...(config.availableModels || {})
      },
      reasoningMode: {
        ...DEFAULT_CONFIG.reasoningMode,
        ...(config.reasoningMode || {})
      },
      systemPrompts: {
        ...DEFAULT_CONFIG.systemPrompts,
        ...config.systemPrompts
      }
    };
  }
  
  /**
   * Validate configuration structure
   */
  private static isValidConfig(config: LLMConfig): boolean {
    // Check required fields
    if (!config.provider || !config.model || !config.apiEndpoint) {
      return false;
    }
    
    // Check provider is valid
    if (!['local', 'openai', 'anthropic'].includes(config.provider)) {
      return false;
    }
    
    // Check parameters
    if (!config.parameters) {
      return false;
    }
    
    const { temperature, maxTokens, topP } = config.parameters;
    
    if (temperature < 0 || temperature > 2) {
      return false;
    }
    
    if (maxTokens < 1 || maxTokens > 100000) {
      return false;
    }
    
    if (topP < 0 || topP > 1) {
      return false;
    }
    
    // Check availableModels structure
    if (config.availableModels) {
      if (!config.availableModels.default) {
        return false;
      }
    }
    
    // Check reasoningMode structure
    if (config.reasoningMode) {
      if (!['thinking-summary', 'standard'].includes(config.reasoningMode.format)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Update specific reasoning mode settings
   */
  static updateReasoningMode(settings: Partial<LLMConfig['reasoningMode']>): void {
    const config = this.getLLMConfig();
    
    config.reasoningMode = {
      ...config.reasoningMode!,
      ...settings
    };
    
    this.saveLLMConfig(config);
  }
  
  /**
   * Update available models
   */
  static updateAvailableModels(models: Partial<LLMConfig['availableModels']>): void {
    const config = this.getLLMConfig();
    
    config.availableModels = {
      ...config.availableModels!,
      ...models
    };
    
    this.saveLLMConfig(config);
  }
  
  /**
   * Get default configuration (useful for reset)
   */
  static getDefaultConfig(): LLMConfig {
    return { ...DEFAULT_CONFIG };
  }
  
  /**
   * Export configuration as JSON string
   */
  static exportConfig(): string {
    const config = this.getLLMConfig();
    return JSON.stringify(config, null, 2);
  }
  
  /**
   * Import configuration from JSON string
   */
  static importConfig(jsonString: string): void {
    try {
      const config = JSON.parse(jsonString) as LLMConfig;
      
      if (!this.isValidConfig(config)) {
        throw new Error('Invalid configuration format');
      }
      
      this.saveLLMConfig(config);
      
    } catch (error) {
      console.error('Error importing config:', error);
      throw new Error('Failed to import configuration: Invalid JSON or format');
    }
  }
}

// Export default config for reference
export { DEFAULT_CONFIG };
