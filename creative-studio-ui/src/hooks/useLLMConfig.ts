/**
 * useLLMConfig Hook
 * 
 * React hook for managing LLM configuration with localStorage persistence
 */

import { useState, useEffect, useCallback } from 'react';
import { ConfigManager, type LLMConfig } from '../services/llm/ConfigManager';

export interface UseLLMConfigReturn {
  config: LLMConfig;
  updateConfig: (updates: Partial<LLMConfig>) => void;
  resetConfig: () => void;
  updateReasoningMode: (settings: Partial<LLMConfig['reasoningMode']>) => void;
  updateAvailableModels: (models: Partial<LLMConfig['availableModels']>) => void;
  exportConfig: () => string;
  importConfig: (jsonString: string) => void;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for managing LLM configuration
 * 
 * Features:
 * - Loads config from localStorage on mount
 * - Provides methods to update config
 * - Automatically saves changes to localStorage
 * - Handles migration from old schema versions
 * - Provides export/import functionality
 * 
 * @example
 * ```tsx
 * const { config, updateReasoningMode } = useLLMConfig();
 * 
 * // Enable reasoning mode
 * updateReasoningMode({ enabled: true });
 * 
 * // Update model
 * updateConfig({ model: 'llama3.1:8b' });
 * ```
 */
export function useLLMConfig(): UseLLMConfigReturn {
  const [config, setConfig] = useState<LLMConfig>(() => ConfigManager.getLLMConfig());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load config on mount
  useEffect(() => {
    try {
      setIsLoading(true);
      const loadedConfig = ConfigManager.getLLMConfig();
      setConfig(loadedConfig);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load configuration');
      console.error('Error loading LLM config:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update configuration with partial updates
   */
  const updateConfig = useCallback((updates: Partial<LLMConfig>) => {
    try {
      setError(null);
      ConfigManager.saveLLMConfig(updates);
      const updatedConfig = ConfigManager.getLLMConfig();
      setConfig(updatedConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration');
      console.error('Error updating LLM config:', err);
    }
  }, []);

  /**
   * Reset configuration to defaults
   */
  const resetConfig = useCallback(() => {
    try {
      setError(null);
      ConfigManager.resetToDefaults();
      const defaultConfig = ConfigManager.getLLMConfig();
      setConfig(defaultConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset configuration');
      console.error('Error resetting LLM config:', err);
    }
  }, []);

  /**
   * Update reasoning mode settings
   */
  const updateReasoningMode = useCallback((settings: Partial<LLMConfig['reasoningMode']>) => {
    try {
      setError(null);
      ConfigManager.updateReasoningMode(settings);
      const updatedConfig = ConfigManager.getLLMConfig();
      setConfig(updatedConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update reasoning mode');
      console.error('Error updating reasoning mode:', err);
    }
  }, []);

  /**
   * Update available models
   */
  const updateAvailableModels = useCallback((models: Partial<LLMConfig['availableModels']>) => {
    try {
      setError(null);
      ConfigManager.updateAvailableModels(models);
      const updatedConfig = ConfigManager.getLLMConfig();
      setConfig(updatedConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update available models');
      console.error('Error updating available models:', err);
    }
  }, []);

  /**
   * Export configuration as JSON string
   */
  const exportConfig = useCallback((): string => {
    try {
      setError(null);
      return ConfigManager.exportConfig();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to export configuration';
      setError(errorMsg);
      console.error('Error exporting config:', err);
      return '';
    }
  }, []);

  /**
   * Import configuration from JSON string
   */
  const importConfig = useCallback((jsonString: string) => {
    try {
      setError(null);
      ConfigManager.importConfig(jsonString);
      const importedConfig = ConfigManager.getLLMConfig();
      setConfig(importedConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import configuration');
      console.error('Error importing config:', err);
    }
  }, []);

  return {
    config,
    updateConfig,
    resetConfig,
    updateReasoningMode,
    updateAvailableModels,
    exportConfig,
    importConfig,
    isLoading,
    error,
  };
}

/**
 * Hook for accessing reasoning mode settings only
 * 
 * Useful when you only need reasoning mode without full config
 */
export function useReasoningMode() {
  const { config, updateReasoningMode } = useLLMConfig();
  
  return {
    reasoningMode: config.reasoningMode,
    updateReasoningMode,
  };
}

/**
 * Hook for accessing available models only
 * 
 * Useful when you only need model configuration
 */
export function useAvailableModels() {
  const { config, updateAvailableModels } = useLLMConfig();
  
  return {
    availableModels: config.availableModels,
    updateAvailableModels,
  };
}
