/**
 * Custom Hooks for Configuration Access
 * 
 * Provides convenient hooks for accessing specific parts of the configuration
 */

import { useMemo } from 'react';
import { useConfiguration } from '../contexts/ConfigurationContext';
import type {
  APIConfiguration,
  LLMConfiguration,
  ComfyUIConfiguration,
  GlobalConfiguration,
  ProjectConfiguration,
} from '../types/configuration';

/**
 * Hook to access project configuration
 */
export function useProjectConfig(): ProjectConfiguration | null {
  const { projectConfig } = useConfiguration();
  return projectConfig;
}

/**
 * Hook to access global configuration
 */
export function useGlobalConfig(): GlobalConfiguration | null {
  const { globalConfig } = useConfiguration();
  return globalConfig;
}

/**
 * Hook to access API configuration
 */
export function useAPIConfig(): APIConfiguration | null {
  const { projectConfig } = useConfiguration();
  return projectConfig?.api || null;
}

/**
 * Hook to access LLM configuration
 */
export function useLLMConfig(): LLMConfiguration | null {
  const { projectConfig } = useConfiguration();
  return projectConfig?.llm || null;
}

/**
 * Hook to access ComfyUI configuration
 */
export function useComfyUIConfig(): ComfyUIConfiguration | null {
  const { projectConfig } = useConfiguration();
  return projectConfig?.comfyui || null;
}

/**
 * Hook to check if configuration is loading
 */
export function useConfigurationLoading(): boolean {
  const { isLoading } = useConfiguration();
  return isLoading;
}

/**
 * Hook to check if configuration is saving
 */
export function useConfigurationSaving(): boolean {
  const { isSaving } = useConfiguration();
  return isSaving;
}

/**
 * Hook to get active project metadata
 */
export function useActiveProject() {
  const { activeProject } = useConfiguration();
  return activeProject;
}

/**
 * Hook to get configuration actions
 */
export function useConfigurationActions() {
  const {
    loadConfiguration,
    saveProjectConfig,
    saveGlobalConfig,
    validateConfiguration,
    resetToDefaults,
    exportConfiguration,
    importConfiguration,
  } = useConfiguration();

  return useMemo(
    () => ({
      loadConfiguration,
      saveProjectConfig,
      saveGlobalConfig,
      validateConfiguration,
      resetToDefaults,
      exportConfiguration,
      importConfiguration,
    }),
    [
      loadConfiguration,
      saveProjectConfig,
      saveGlobalConfig,
      validateConfiguration,
      resetToDefaults,
      exportConfiguration,
      importConfiguration,
    ]
  );
}
