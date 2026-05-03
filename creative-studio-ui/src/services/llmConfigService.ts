/**
 * LLM Configuration Service
 * cspell:ignore lmstudio
 *
 * Unified service for managing LLM configuration across the entire application.
 * Provides a single source of truth for LLM settings and ensures all components
 * stay synchronized.
 */

import { loadLLMSettings, saveLLMSettings } from '@/utils/secureStorage';
import { eventEmitter, WizardEventType } from './eventEmitter';
import { LLMService, type LLMConfig } from './llmService';
import { logger } from '@/utils/logger';
import { LegacyAny } from '@/types/legacy';

// ============================================================================
// Types
// ============================================================================

export type LLMConfigListener = (config: LLMConfig) => void;

// ============================================================================
// LLM Configuration Service
// ============================================================================

class LLMConfigService {
  private static instance: LLMConfigService;
  private llmService: LLMService | null = null;
  private currentConfig: LLMConfig | null = null;
  private readonly listeners: Set<LLMConfigListener> = new Set();
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): LLMConfigService {
    if (!LLMConfigService.instance) {
      LLMConfigService.instance = new LLMConfigService();
    }
    return LLMConfigService.instance;
  }

  /**
   * Initialize the service
   * Loads configuration and sets up event listeners
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
      // Load configuration from storage
      let config = await loadLLMSettings();

      // If no configuration exists, create a default one with auto-detected model
      if (!config) {
        // Try to detect available LLM models
        let detectedModel = 'google/gemma-4-e2b'; // Use Google Gemma 4 E2B as default base model fallback
        let detectedProvider = 'local';
        
        try {
          const { suggestBestModel } = await import('@/utils/llmDiscovery');
          const suggestion = await suggestBestModel();

          if (suggestion) {
            detectedModel = suggestion.model;
            detectedProvider = suggestion.provider === 'lmstudio' ? 'lmstudio' : 'local';
            logger.info(`[LLMConfigService] Auto-detected best model: ${detectedModel} on ${suggestion.provider}`);
          } else {
            // Last resort: try to fetch any models directly if suggestBestModel failed
            const { getInstalledModels } = await import('@/utils/llmDiscovery');
            const allModels = await getInstalledModels();
            if (allModels.length > 0) {
              detectedModel = allModels[0].name;
              detectedProvider = allModels[0].provider === 'lmstudio' ? 'lmstudio' : 'local';
              logger.info(`[LLMConfigService] Using first available model as fallback: ${detectedModel} on ${allModels[0].provider}`);
            } else {
              logger.warn('[LLMConfigService] No LLM models found at all. Using default string:', detectedModel);
            }
          }
        } catch (error) {
          logger.warn('[LLMConfigService] Failed to detect models, using fallback:', error);
        }
        
        config = {
          provider: detectedProvider as LegacyAny,
          model: detectedModel,
          apiKey: '',
          apiEndpoint: detectedProvider === 'lmstudio' ? 'http://localhost:1234' : 'http://localhost:11434',
          streamingEnabled: true,
          parameters: {
            temperature: 0.7,
            maxTokens: 2000,
            topP: 0.9,
            frequencyPenalty: 0,
            presencePenalty: 0,
          },
          systemPrompts: {
            worldGeneration: 'You are a creative world-building assistant...',
            characterGeneration: 'You are a character development expert...',
            dialogueGeneration: 'You are a dialogue writing specialist...',
          },
          timeout: 300000, // 300 seconds (5 minutes) - local models like Ollama need more time for model loading and generation
          retryAttempts: 3,
        };
        // Save the default configuration
        await this.setConfig(config as LegacyAny, true);
      } else {
        await this.setConfig(config, false); // Don't save, just load
      }

      // Listen for settings updates from other sources
      eventEmitter.on(WizardEventType.LLM_SETTINGS_UPDATED, async () => {
        const updatedConfig = await loadLLMSettings();
        if (updatedConfig) {
          await this.setConfig(updatedConfig, false);
        }
      });

      this.initialized = true;
    } catch (error) {
      logger.error('[LLMConfigService] Initialization failed:', error);
      throw new Error(`LLM configuration service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      this.initializationPromise = null;
    }
    })();

    return this.initializationPromise;
  }

  /**
   * Update LLM configuration
   * Saves to storage, updates service, and notifies all listeners
   */
  async updateConfig(config: LLMConfig): Promise<void> {
    try {
      await this.setConfig(config, true);
    } catch (error) {
      logger.error('[LLMConfigService] Failed to update configuration:', error);
      throw new Error(`Failed to update LLM configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Internal method to set configuration
   */
  private async setConfig(config: LLMConfig, save: boolean = true): Promise<void> {
    const previousConfig = this.currentConfig;
    
    // MIGRATION: Ensure local providers have at least 5 minute timeout
    // Older versions might have saved a lower timeout in localStorage
    const isLocalProvider = ['local', 'ollama', 'lmstudio', 'custom', 'diffusion'].includes(config.provider);
    if (isLocalProvider && (!config.timeout || config.timeout < 300000)) {
      logger.info(`[LLMConfigService] Migrating timeout for ${config.provider} provider: ${config.timeout}ms -> 300000ms`);
      config.timeout = 300000;
      save = true; // Force save if we migrated
    }

    // Set default endpoint if it's currently a default one and provider changed
    const currentEndpoint = config.apiEndpoint;
    const isDefaultOllama = currentEndpoint === 'http://localhost:11434';
    const isDefaultLMStudio = currentEndpoint === 'http://localhost:1234';

    if (config.provider === 'lmstudio' && (isDefaultOllama || !currentEndpoint)) {
      config.apiEndpoint = 'http://localhost:1234';
      save = true;
    } else if (config.provider === 'local' && (isDefaultLMStudio || !currentEndpoint)) {
      config.apiEndpoint = 'http://localhost:11434';
      save = true;
    }

    this.currentConfig = config;

    try {
      // Create or update LLM service
      if (!this.llmService) {
        this.llmService = new LLMService(config);
      } else {
        this.llmService.updateConfig(config);
      }

      // Save to storage if requested
      if (save) {
        await saveLLMSettings(config);
      }

      // Notify all listeners
      this.notifyListeners(config);

      // Emit event for other parts of the app
      if (save) {
        eventEmitter.emit(WizardEventType.LLM_SETTINGS_UPDATED, {
          provider: config.provider,
          model: config.model,
          previousProvider: previousConfig?.provider,
          previousModel: previousConfig?.model,
          timestamp: new Date(),
          source: 'llmConfigService',
        });
      }
    } catch (error) {
      logger.error('[LLMConfigService] Failed to set configuration:', error);
      throw new Error(`Failed to set LLM configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): LLMConfig | null {
    return this.currentConfig;
  }

  /**
   * Get LLM service instance
   */
  getService(): LLMService | null {
    return this.llmService;
  }

  /**
   * Check if service is configured
   */
  isConfigured(): boolean {
    return this.currentConfig !== null && this.llmService !== null;
  }

  /**
   * Subscribe to configuration changes
   * Returns unsubscribe function
   */
  subscribe(listener: LLMConfigListener): () => void {
    this.listeners.add(listener);

    // Immediately call with current config if available
    if (this.currentConfig) {
      try {
        listener(this.currentConfig);
      } catch (error) {
        logger.error('[LLMConfigService] Error in listener:', error);
      }
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify all listeners of configuration change
   */
  private notifyListeners(config: LLMConfig): void {
    this.listeners.forEach(listener => {
      try {
        listener(config);
      } catch (error) {
        logger.error('[LLMConfigService] Error in listener:', error);
      }
    });
  }

  /**
   * Validate connection to LLM provider
   */
  async validateConnection(): Promise<boolean> {
    if (!this.llmService) {
      return false;
    }

    const result = await this.llmService.validateConnection();
    return result.success && result.data === true;
  }

  /**
   * Get number of active listeners
   */
  getListenerCount(): number {
    return this.listeners.size;
  }

  /**
   * Clear all listeners (for testing)
   */
  clearListeners(): void {
    this.listeners.clear();
  }

  /**
   * Reset service (for testing)
   */
  reset(): void {
    this.llmService = null;
    this.currentConfig = null;
    this.listeners.clear();
    this.initialized = false;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

export const llmConfigService = LLMConfigService.getInstance();

// ============================================================================
// React Hook
// ============================================================================

import { useState, useEffect } from 'react';

export interface UseLLMConfigReturn {
  config: LLMConfig | null;
  service: LLMService | null;
  isConfigured: boolean;
  updateConfig: (config: LLMConfig) => Promise<void>;
  validateConnection: () => Promise<boolean>;
}

/**
 * React hook for accessing LLM configuration
 * 
 * @example
 * ```typescript
 * function MyComponent() {
 *   const { config, service, isConfigured, updateConfig } = useLLMConfig();
 *   
 *   if (!isConfigured) {
 *     return <div>Please configure LLM</div>;
 *   }
 *   
 *   // Use service...
 * }
 * ```
 */
export function useLLMConfig(): UseLLMConfigReturn {
  const [config, setConfig] = useState<LLMConfig | null>(
    llmConfigService.getConfig()
  );

  useEffect(() => {
    // Subscribe to configuration changes
    const unsubscribe = llmConfigService.subscribe(setConfig);
    return unsubscribe;
  }, []);

  return {
    config,
    service: llmConfigService.getService(),
    isConfigured: llmConfigService.isConfigured(),
    updateConfig: (config: LLMConfig) => llmConfigService.updateConfig(config),
    validateConnection: () => llmConfigService.validateConnection(),
  };
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize LLM configuration service
 * Call this once during application startup
 */
export async function initializeLLMConfigService(): Promise<void> {
  await llmConfigService.initialize();
}
