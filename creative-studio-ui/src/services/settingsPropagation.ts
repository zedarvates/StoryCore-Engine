/**
 * Settings Propagation Service
 * 
 * Listens to settings change events and propagates them to dependent features
 * and services. Ensures that LLM and ComfyUI configuration changes are
 * immediately reflected across the application.
 * 
 * Requirements: 7.3, 7.4, 7.8
 */

import { eventEmitter, WizardEventType } from './eventEmitter';
import type {
  LLMSettingsUpdatedPayload,
  ComfyUISettingsUpdatedPayload,
} from './eventEmitter';
import { getLLMService, setDefaultLLMService, createLLMService } from './llmService';
import type { LLMConfig } from './llmService';
import { backendApi } from './backendApiService';
import type { ComfyUIConfig } from './comfyuiService';

// ============================================================================
// Settings Change Listeners
// ============================================================================

/**
 * Listener callback for settings changes
 */
export type SettingsChangeListener = (config: unknown) => void | Promise<void>;

/**
 * Settings propagation manager
 * 
 * This class manages the propagation of settings changes to dependent
 * features and services. It subscribes to settings update events and
 * notifies registered listeners.
 */
class SettingsPropagationManager {
  private llmListeners: Set<SettingsChangeListener> = new Set();
  private comfyuiListeners: Set<SettingsChangeListener> = new Set();
  private initialized: boolean = false;

  /**
   * Initialize the settings propagation system
   * 
   * Sets up event listeners for settings changes and begins
   * propagating updates to dependent services.
   */
  initialize(): void {
    if (this.initialized) {
      console.warn('Settings propagation already initialized');
      return;
    }

    // Subscribe to LLM settings updates (Requirement: 7.3)
    eventEmitter.on<LLMSettingsUpdatedPayload>(
      WizardEventType.LLM_SETTINGS_UPDATED,
      this.handleLLMSettingsUpdate.bind(this)
    );

    // Subscribe to ComfyUI settings updates (Requirement: 7.4)
    eventEmitter.on<ComfyUISettingsUpdatedPayload>(
      WizardEventType.COMFYUI_SETTINGS_UPDATED,
      this.handleComfyUISettingsUpdate.bind(this)
    );

    this.initialized = true;

    if (import.meta.env.DEV) {
    }
  }

  /**
   * Handle LLM settings update event
   * 
   * Updates the LLM service with new configuration and notifies
   * all registered listeners.
   * 
   * Requirement: 7.3
   */
  private async handleLLMSettingsUpdate(payload: LLMSettingsUpdatedPayload): Promise<void> {
    if (import.meta.env.DEV) {
      console.log('[SettingsPropagation] LLM settings updated:', {
        provider: payload.provider,
        model: payload.model,
        previousProvider: payload.previousProvider,
        previousModel: payload.previousModel,
      });
    }

    try {
      // Get the current LLM service
      const llmService = getLLMService();

      // Load full configuration from storage
      const storedConfig = this.loadLLMConfigFromStorage();
      
      if (storedConfig) {
        // Update the LLM service with new configuration
        llmService.updateConfig(storedConfig);

        if (import.meta.env.DEV) {
        }
      }

      // Update OllamaClient if provider is local
      if (payload.provider === 'local') {
        try {
          const { updateOllamaClientFromSettings } = await import('./wizard/OllamaClient');
          await updateOllamaClientFromSettings();
          
          if (import.meta.env.DEV) {
          }
        } catch (error) {
          console.error('[SettingsPropagation] Failed to update OllamaClient:', error);
        }
      }

      // Notify all registered listeners (Requirement: 7.8)
      await this.notifyLLMListeners(storedConfig);

      // Emit success notification
      if (import.meta.env.DEV) {
      }
    } catch (error) {
      console.error('[SettingsPropagation] Failed to propagate LLM settings:', error);
    }
  }

  /**
   * Handle ComfyUI settings update event
   * 
   * Updates the backend API service with new ComfyUI configuration
   * and notifies all registered listeners.
   * 
   * Requirement: 7.4
   */
  private async handleComfyUISettingsUpdate(payload: ComfyUISettingsUpdatedPayload): Promise<void> {
    if (import.meta.env.DEV) {
      console.log('[SettingsPropagation] ComfyUI settings updated:', {
        serverUrl: payload.serverUrl,
        connected: payload.connected,
        previousServerUrl: payload.previousServerUrl,
      });
    }

    try {
      // Load full configuration from storage
      const storedConfig = this.loadComfyUIConfigFromStorage();
      
      if (storedConfig) {
        // Update the backend API service with new ComfyUI configuration
        backendApi.updateComfyUIConfig(storedConfig);

        if (import.meta.env.DEV) {
        }
      }

      // Notify all registered listeners (Requirement: 7.8)
      await this.notifyComfyUIListeners(storedConfig);

      // Emit success notification
      if (import.meta.env.DEV) {
      }
    } catch (error) {
      console.error('[SettingsPropagation] Failed to propagate ComfyUI settings:', error);
    }
  }

  /**
   * Load LLM configuration from localStorage
   * 
   * @returns LLM configuration or null if not found
   */
  private loadLLMConfigFromStorage(): Partial<LLMConfig> | null {
    try {
      const stored = localStorage.getItem('llm-config');
      if (!stored) return null;

      const config = JSON.parse(stored);
      
      // Decrypt API key if encrypted
      if (config.encryptedApiKey) {
        // In a real implementation, this would decrypt the API key
        // For now, we'll just use it as-is
        config.apiKey = config.encryptedApiKey;
        delete config.encryptedApiKey;
      }

      return config;
    } catch (error) {
      console.error('[SettingsPropagation] Failed to load LLM config from storage:', error);
      return null;
    }
  }

  /**
   * Load ComfyUI configuration from localStorage
   * 
   * @returns ComfyUI configuration or null if not found
   */
  private loadComfyUIConfigFromStorage(): ComfyUIConfig | null {
    try {
      const stored = localStorage.getItem('comfyui-config');
      if (!stored) return null;

      const config = JSON.parse(stored);
      
      // Decrypt credentials if encrypted
      if (config.encryptedCredentials) {
        // In a real implementation, this would decrypt the credentials
        // For now, we'll just use them as-is
        config.authentication = JSON.parse(config.encryptedCredentials);
        delete config.encryptedCredentials;
      }

      return config;
    } catch (error) {
      console.error('[SettingsPropagation] Failed to load ComfyUI config from storage:', error);
      return null;
    }
  }

  /**
   * Notify all LLM settings listeners
   * 
   * @param config - Updated LLM configuration
   */
  private async notifyLLMListeners(config: Partial<LLMConfig> | null): Promise<void> {
    if (!config) return;

    const promises = Array.from(this.llmListeners).map(async (listener) => {
      try {
        await listener(config);
      } catch (error) {
        console.error('[SettingsPropagation] Error in LLM listener:', error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Notify all ComfyUI settings listeners
   * 
   * @param config - Updated ComfyUI configuration
   */
  private async notifyComfyUIListeners(config: ComfyUIConfig | null): Promise<void> {
    if (!config) return;

    const promises = Array.from(this.comfyuiListeners).map(async (listener) => {
      try {
        await listener(config);
      } catch (error) {
        console.error('[SettingsPropagation] Error in ComfyUI listener:', error);
      }
    });

    await Promise.all(promises);
  }

  /**
   * Register a listener for LLM settings changes
   * 
   * @param listener - Callback function to invoke when LLM settings change
   * @returns Unsubscribe function
   */
  onLLMSettingsChange(listener: SettingsChangeListener): () => void {
    this.llmListeners.add(listener);
    
    return () => {
      this.llmListeners.delete(listener);
    };
  }

  /**
   * Register a listener for ComfyUI settings changes
   * 
   * @param listener - Callback function to invoke when ComfyUI settings change
   * @returns Unsubscribe function
   */
  onComfyUISettingsChange(listener: SettingsChangeListener): () => void {
    this.comfyuiListeners.add(listener);
    
    return () => {
      this.comfyuiListeners.delete(listener);
    };
  }

  /**
   * Remove all listeners
   */
  clearListeners(): void {
    this.llmListeners.clear();
    this.comfyuiListeners.clear();
  }

  /**
   * Get the number of registered listeners
   * 
   * @returns Object with listener counts
   */
  getListenerCounts(): { llm: number; comfyui: number } {
    return {
      llm: this.llmListeners.size,
      comfyui: this.comfyuiListeners.size,
    };
  }

  /**
   * Manually trigger settings propagation
   * 
   * Useful for forcing an update when settings are changed
   * outside of the normal event flow.
   */
  async triggerLLMPropagation(): Promise<void> {
    const config = this.loadLLMConfigFromStorage();
    if (config) {
      const llmService = getLLMService();
      llmService.updateConfig(config);
      await this.notifyLLMListeners(config);
    }
  }

  /**
   * Manually trigger ComfyUI settings propagation
   * 
   * Useful for forcing an update when settings are changed
   * outside of the normal event flow.
   */
  async triggerComfyUIPropagation(): Promise<void> {
    const config = this.loadComfyUIConfigFromStorage();
    if (config) {
      backendApi.updateComfyUIConfig(config);
      await this.notifyComfyUIListeners(config);
    }
  }

  /**
   * Check if the propagation system is initialized
   * 
   * @returns True if initialized, false otherwise
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Global settings propagation manager instance
 */
export const settingsPropagation = new SettingsPropagationManager();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Initialize settings propagation system
 * 
 * Call this once during application startup to begin
 * propagating settings changes to dependent services.
 */
export function initializeSettingsPropagation(): void {
  settingsPropagation.initialize();
}

/**
 * Register a listener for LLM settings changes
 * 
 * @param listener - Callback function to invoke when LLM settings change
 * @returns Unsubscribe function
 * 
 * @example
 * ```typescript
 * const unsubscribe = onLLMSettingsChange((config) => {
 *   // Update UI, refresh data, etc.
 * });
 * 
 * // Later, when done:
 * unsubscribe();
 * ```
 */
export function onLLMSettingsChange(listener: SettingsChangeListener): () => void {
  return settingsPropagation.onLLMSettingsChange(listener);
}

/**
 * Register a listener for ComfyUI settings changes
 * 
 * @param listener - Callback function to invoke when ComfyUI settings change
 * @returns Unsubscribe function
 * 
 * @example
 * ```typescript
 * const unsubscribe = onComfyUISettingsChange((config) => {
 *   // Update UI, refresh workflows, etc.
 * });
 * 
 * // Later, when done:
 * unsubscribe();
 * ```
 */
export function onComfyUISettingsChange(listener: SettingsChangeListener): () => void {
  return settingsPropagation.onComfyUISettingsChange(listener);
}

/**
 * Manually trigger LLM settings propagation
 * 
 * Useful when settings are updated outside of the normal event flow.
 */
export async function triggerLLMPropagation(): Promise<void> {
  await settingsPropagation.triggerLLMPropagation();
}

/**
 * Manually trigger ComfyUI settings propagation
 * 
 * Useful when settings are updated outside of the normal event flow.
 */
export async function triggerComfyUIPropagation(): Promise<void> {
  await settingsPropagation.triggerComfyUIPropagation();
}

// ============================================================================
// React Hooks
// ============================================================================

import React from 'react';

/**
 * React hook for subscribing to LLM settings changes
 * 
 * @param listener - Callback function to invoke when LLM settings change
 * @param deps - Dependency array for the effect
 * 
 * @example
 * ```typescript
 * useLLMSettingsChange((config) => {
 *   // Update component state, refresh data, etc.
 * });
 * ```
 */
export function useLLMSettingsChange(
  listener: SettingsChangeListener,
  deps: React.DependencyList = []
): void {
  React.useEffect(() => {
    const unsubscribe = onLLMSettingsChange(listener);
    return unsubscribe;
  }, [listener, ...deps]);
}

/**
 * React hook for subscribing to ComfyUI settings changes
 * 
 * @param listener - Callback function to invoke when ComfyUI settings change
 * @param deps - Dependency array for the effect
 * 
 * @example
 * ```typescript
 * useComfyUISettingsChange((config) => {
 *   // Update component state, refresh workflows, etc.
 * });
 * ```
 */
export function useComfyUISettingsChange(
  listener: SettingsChangeListener,
  deps: React.DependencyList = []
): void {
  React.useEffect(() => {
    const unsubscribe = onComfyUISettingsChange(listener);
    return unsubscribe;
  }, [listener, ...deps]);
}
