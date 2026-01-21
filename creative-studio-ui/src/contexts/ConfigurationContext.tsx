/**
 * Configuration Context
 * 
 * Provides centralized state management for all configuration data
 * throughout the application.
 */

import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import type {
  ConfigurationContextValue,
  ProjectConfiguration,
  GlobalConfiguration,
  ProjectMetadata,
  ValidationResult,
} from '../types/configuration';
import { ConfigurationStore } from '../services/configurationStore';
import {
  validateProjectConfiguration,
} from '../services/configurationValidator';

// ============================================================================
// Context Creation
// ============================================================================

const ConfigurationContext = createContext<ConfigurationContextValue | undefined>(undefined);

// ============================================================================
// Provider Component
// ============================================================================

interface ConfigurationProviderProps {
  children: ReactNode;
}

export function ConfigurationProvider({ children }: ConfigurationProviderProps) {
  // State
  const [projectConfig, setProjectConfig] = useState<ProjectConfiguration | null>(null);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfiguration | null>(null);
  const [activeProject, setActiveProject] = useState<ProjectMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Load configuration for a project
   */
  const loadConfiguration = useCallback(async (projectId: string) => {
    setIsLoading(true);
    try {
      // Load project configuration
      const projConfig = await ConfigurationStore.loadProjectConfig(projectId);
      setProjectConfig(projConfig);

      // Load global configuration
      const globConfig = await ConfigurationStore.loadGlobalConfig();
      setGlobalConfig(globConfig);

      // Set active project metadata
      setActiveProject({
        id: projectId,
        name: projConfig.projectId,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        status: 'active',
      });

      ;
    } catch (error) {
      console.error('Failed to load configuration:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Save project configuration
   */
  const saveProjectConfig = useCallback(
    async (config: Partial<ProjectConfiguration>) => {
      if (!projectConfig) {
        throw new Error('No project configuration loaded');
      }

      setIsSaving(true);
      try {
        // Merge with existing configuration
        const updatedConfig: ProjectConfiguration = {
          ...projectConfig,
          ...config,
        };

        // Validate before saving
        const validationResult = validateProjectConfiguration(updatedConfig);
        if (!validationResult.isValid) {
          throw new Error(
            `Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`
          );
        }

        // Save to storage
        await ConfigurationStore.saveProjectConfig(updatedConfig.projectId, updatedConfig);

        // Update state
        setProjectConfig(updatedConfig);

        // Update last modified timestamp
        if (activeProject) {
          setActiveProject({
            ...activeProject,
            lastModified: new Date().toISOString(),
          });
        }

        ;
      } catch (error) {
        console.error('Failed to save project configuration:', error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [projectConfig, activeProject]
  );

  /**
   * Save global configuration
   */
  const saveGlobalConfig = useCallback(
    async (config: Partial<GlobalConfiguration>) => {
      if (!globalConfig) {
        throw new Error('No global configuration loaded');
      }

      setIsSaving(true);
      try {
        // Merge with existing configuration
        const updatedConfig: GlobalConfiguration = {
          ...globalConfig,
          ...config,
        };

        // Save to storage
        await ConfigurationStore.saveGlobalConfig(updatedConfig);

        // Update state
        setGlobalConfig(updatedConfig);

        ;
      } catch (error) {
        console.error('Failed to save global configuration:', error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [globalConfig]
  );

  /**
   * Validate configuration
   */
  const validateConfiguration = useCallback((config: any): ValidationResult => {
    return validateProjectConfiguration(config);
  }, []);

  /**
   * Reset configuration to defaults
   */
  const resetToDefaults = useCallback(
    async (scope: 'project' | 'global') => {
      setIsSaving(true);
      try {
        if (scope === 'project' && activeProject) {
          // Delete existing configuration
          await ConfigurationStore.deleteProjectConfig(activeProject.id);
          
          // Reload configuration (will load defaults)
          await loadConfiguration(activeProject.id);
          
          ;
        } else if (scope === 'global') {
          // Clear global configuration from storage
          localStorage.removeItem('storycore_global_config');
          
          // Reload global configuration
          const defaultGlobalConfig = await ConfigurationStore.loadGlobalConfig();
          setGlobalConfig(defaultGlobalConfig);
          
          ;
        }
      } catch (error) {
        console.error('Failed to reset configuration:', error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [activeProject, loadConfiguration]
  );

  /**
   * Export configuration
   */
  const exportConfiguration = useCallback(async (): Promise<string> => {
    if (!activeProject) {
      throw new Error('No active project');
    }

    try {
      const exportData = await ConfigurationStore.exportConfiguration(activeProject.id);
      ;
      return exportData;
    } catch (error) {
      console.error('Failed to export configuration:', error);
      throw error;
    }
  }, [activeProject]);

  /**
   * Import configuration
   */
  const importConfiguration = useCallback(
    async (data: string) => {
      if (!activeProject) {
        throw new Error('No active project');
      }

      setIsSaving(true);
      try {
        await ConfigurationStore.importConfiguration(activeProject.id, data);
        
        // Reload configuration
        await loadConfiguration(activeProject.id);
        
        ;
      } catch (error) {
        console.error('Failed to import configuration:', error);
        throw error;
      } finally {
        setIsSaving(false);
      }
    },
    [activeProject, loadConfiguration]
  );

  // ============================================================================
  // Context Value
  // ============================================================================

  const contextValue: ConfigurationContextValue = {
    projectConfig,
    globalConfig,
    activeProject,
    isLoading,
    isSaving,
    loadConfiguration,
    saveProjectConfig,
    saveGlobalConfig,
    validateConfiguration,
    resetToDefaults,
    exportConfiguration,
    importConfiguration,
  };

  return (
    <ConfigurationContext.Provider value={contextValue}>
      {children}
    </ConfigurationContext.Provider>
  );
}

// ============================================================================
// Custom Hook
// ============================================================================

/**
 * Hook to access configuration context
 */
export function useConfiguration(): ConfigurationContextValue {
  const context = useContext(ConfigurationContext);
  
  if (context === undefined) {
    throw new Error('useConfiguration must be used within a ConfigurationProvider');
  }
  
  return context;
}
