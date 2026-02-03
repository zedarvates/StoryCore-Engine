/**
 * LLM Configuration Service
 * 
 * Unified service for managing LLM configuration across the entire application.
 * Provides a single source of truth for LLM settings and ensures all components
 * stay synchronized.
 */

import { loadLLMSettings, saveLLMSettings } from '@/utils/secureStorage';
import { eventEmitter, WizardEventType } from './eventEmitter';
import { LLMService, type LLMConfig } from './llmService';

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
  private listeners: Set<LLMConfigListener> = new Set();
  private initialized: boolean = false;

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
      console.warn('[LLMConfigService] Already initialized');
      return;
    }

    try {
      // Load configuration from storage
      let config = await loadLLMSettings();
      
      // If no configuration exists, create a default one with auto-detected model
      if (!config) {
        
        // Try to detect available Ollama models
        let detectedModel = 'llama3.2:1b'; // Fallback default
        try {
          const { suggestBestModel } = await import('@/utils/ollamaModelDetection');
          const suggestion = await suggestBestModel('http://localhost:11434');
          
          if (suggestion) {
            detectedModel = suggestion.model;
            if (suggestion.alternatives.length > 0) {
            }
          } else {
            console.warn('[LLMConfigService] No models detected, using fallback:', detectedModel);
          }
        } catch (error) {
          console.warn('[LLMConfigService] Failed to detect models, using fallback:', error);
        }
        
        config = {
          provider: 'local',
          model: detectedModel,
          apiKey: '',
          apiEndpoint: 'http://localhost:11434',
          streamingEnabled: true,
          parameters: {
            temperature: 0.7,
            maxTokens: 2000,
            topP: 0.9,
            frequencyPenalty: 0,
            presencePenalty: 0,
          },
        };
        // Save the default configuration
        await this.setConfig(config, true);
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
      console.error('[LLMConfigService] Initialization failed:', error);
      throw new Error(`LLM configuration service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update LLM configuration
   * Saves to storage, updates service, and notifies all listeners
   */
  async updateConfig(config: LLMConfig): Promise<void> {
    try {
      await this.setConfig(config, true);
    } catch (error) {
      console.error('[LLMConfigService] Failed to update configuration:', error);
      throw new Error(`Failed to update LLM configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Internal method to set configuration
   */
  private async setConfig(config: LLMConfig, save: boolean = true): Promise<void> {
    const previousConfig = this.currentConfig;
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
      console.error('[LLMConfigService] Failed to set configuration:', error);
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
        console.error('[LLMConfigService] Error in listener:', error);
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
        console.error('[LLMConfigService] Error in listener:', error);
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
