import React, { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type {
  ProjectConfiguration,
  GlobalConfiguration,
  ProjectMetadata,
  ValidationResult,
  ValidationRule
} from '../../electron/configurationTypes';

// Access the electronAPI from the window object
declare global {
  interface Window {
    electronAPI: {
      config: {
        saveProject: (projectId: string, config: any) => Promise<void>;
        loadProject: (projectId: string) => Promise<any>;
        saveGlobal: (config: any) => Promise<void>;
        loadGlobal: () => Promise<any>;
        validate: (config: any, rules: any[]) => Promise<any>;
      };
    };
  }
}

interface ConfigurationContextValue {
  // Configuration state
  projectConfig: ProjectConfiguration | null;
  globalConfig: GlobalConfiguration | null;
  activeProject: ProjectMetadata | null;

  // Loading states
  isLoading: boolean;
  isSaving: boolean;

  // Actions
  loadConfiguration: (projectId: string) => Promise<void>;
  saveProjectConfig: (config: Partial<ProjectConfiguration>) => Promise<void>;
  saveGlobalConfig: (config: Partial<GlobalConfiguration>) => Promise<void>;
  validateConfiguration: (config: any, rules: ValidationRule[]) => Promise<ValidationResult>;
  resetToDefaults: (scope: 'project' | 'global') => Promise<void>;
  exportConfiguration: () => Promise<string>;
  importConfiguration: (data: string) => Promise<void>;
}

const ConfigurationContext = createContext<ConfigurationContextValue | undefined>(undefined);

// Default configuration values
const defaultProjectConfig: ProjectConfiguration = {
  projectId: '',
  api: {
    endpoints: {},
    defaultTimeout: 30000,
    enableLogging: true
  },
  llm: {
    provider: 'ollama',
    defaultProvider: 'ollama',
    enableFallback: true
  },
  comfyui: {
    serverUrl: 'http://localhost:8188',
    defaultWorkflows: {},
    timeout: 30000,
    enableQueueMonitoring: true
  },
  wizards: []
};

const defaultGlobalConfig: GlobalConfiguration = {
  defaultLLMProvider: 'ollama',
  defaultAPITimeout: 30000,
  theme: 'light',
  enableAnalytics: false
};

interface ConfigurationProviderProps {
  children: ReactNode;
}

// Helper to safely access electronAPI (works in both Electron and web contexts)
const getConfigAPI = () => {
  if (typeof window !== 'undefined' && window.electronAPI?.config) {
    return window.electronAPI.config;
  }
  // Return mock API for web context or fallback
  return null;
};

export const ConfigurationProvider: React.FC<ConfigurationProviderProps> = ({ children }) => {
  const [projectConfig, setProjectConfig] = useState<ProjectConfiguration | null>(null);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfiguration | null>(null);
  const [activeProject, setActiveProject] = useState<ProjectMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [configAPI] = useState(() => {
    // Safely get config API on mount
    if (typeof window !== 'undefined' && (window as any).electronAPI?.config) {
      return (window as any).electronAPI.config;
    }
    return null;
  });

  const loadConfiguration = useCallback(async (projectId: string) => {
    setIsLoading(true);
    try {
      // Load global config via IPC (or use defaults if API not available)
      let global = defaultGlobalConfig;
      if (configAPI) {
        try {
          const loaded = await configAPI.loadGlobal();
          if (loaded) global = loaded;
        } catch (e) {
          console.warn('Failed to load global config, using defaults');
        }
      }
      setGlobalConfig(global);

      // Load project config via IPC (or use defaults if API not available)
      let project = { ...defaultProjectConfig, projectId };
      if (configAPI) {
        try {
          const loaded = await configAPI.loadProject(projectId);
          if (loaded) project = loaded;
        } catch (e) {
          console.warn('Failed to load project config, using defaults');
        }
      }
      setProjectConfig(project);

      // Set active project metadata
      setActiveProject({
        id: projectId,
        name: projectId,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        status: 'active'
      });
    } catch (error) {
      console.error('Failed to load configuration:', error);
      // Load defaults on error
      setGlobalConfig(defaultGlobalConfig);
      setProjectConfig({ ...defaultProjectConfig, projectId });
    } finally {
      setIsLoading(false);
    }
  }, [configAPI]);

  // Auto-load configuration on mount so the workspace doesn't stay
  // stuck on the loading spinner (activeProject would remain null otherwise)
  useEffect(() => {
    loadConfiguration('default');
  }, [loadConfiguration]);

  const saveProjectConfig = useCallback(async (config: Partial<ProjectConfiguration>) => {
    if (!projectConfig) return;
    setIsSaving(true);
    try {
      const updated = { ...projectConfig, ...config };
      if (configAPI) {
        await configAPI.saveProject(updated.projectId, updated);
      }
      setProjectConfig(updated);

      // Update active project metadata
      if (activeProject) {
        setActiveProject({
          ...activeProject,
          lastModified: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Failed to save project configuration:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [projectConfig?.projectId, activeProject, configAPI]);

  const saveGlobalConfig = useCallback(async (config: Partial<GlobalConfiguration>) => {
    setIsSaving(true);
    try {
      setGlobalConfig((prevConfig) => {
        if (!prevConfig) return prevConfig;
        const updated = { ...prevConfig, ...config };
        if (configAPI) {
          configAPI.saveGlobal(updated).catch((error: unknown) => {
            console.error('Failed to save global configuration:', error);
          });
        }
        return updated;
      });
    } finally {
      setIsSaving(false);
    }
  }, [configAPI]);

  const validateConfiguration = useCallback(async (config: any, rules: ValidationRule[]): Promise<ValidationResult> => {
    try {
      if (configAPI) {
        return await configAPI.validate(config, rules);
      }
      // Fallback: simple validation
      return { isValid: true, errors: [] };
    } catch (error) {
      console.error('Failed to validate configuration:', error);
      return { isValid: false, errors: [{ field: 'config', message: String(error), severity: 'error' }] };
    }
  }, [configAPI]);

  const resetToDefaults = useCallback(async (scope: 'project' | 'global') => {
    setIsSaving(true);
    try {
      if (scope === 'project') {
        setProjectConfig(prevConfig => {
          if (!prevConfig) return null;
          const resetConfig = { ...defaultProjectConfig, projectId: prevConfig.projectId };
          if (configAPI) {
            configAPI.saveProject(resetConfig.projectId, resetConfig).catch((error: unknown) => {
              console.error('Failed to save project configuration:', error);
            });
          }
          return resetConfig;
        });
      } else if (scope === 'global') {
        const resetConfig = defaultGlobalConfig;
        if (configAPI) {
          await configAPI.saveGlobal(resetConfig);
        }
        setGlobalConfig(resetConfig);
      }
    } catch (error) {
      console.error('Failed to reset configuration:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, [configAPI]);

  const exportConfiguration = useCallback(async (): Promise<string> => {
    // Use functional form to get current state without dependencies
    return new Promise((resolve) => {
      setProjectConfig(currentProjectConfig => {
        setGlobalConfig(currentGlobalConfig => {
          const data = {
            projectConfig: currentProjectConfig,
            globalConfig: currentGlobalConfig,
            exportedAt: new Date().toISOString()
          };
          resolve(JSON.stringify(data, null, 2));
          return currentGlobalConfig; // Return unchanged
        });
        return currentProjectConfig; // Return unchanged
      });
    });
  }, []); // No dependencies needed

  const importConfiguration = useCallback(async (data: string) => {
    setIsSaving(true);
    try {
      const parsed = JSON.parse(data);

      setProjectConfig(prevProjectConfig => {
        if (parsed.projectConfig && prevProjectConfig) {
          const importedProject = { ...parsed.projectConfig, projectId: prevProjectConfig.projectId };
          if (configAPI) {
            configAPI.saveProject(importedProject.projectId, importedProject).catch((error: unknown) => {
              console.error('Failed to save project configuration:', error);
            });
          }
          return importedProject;
        }
        return prevProjectConfig;
      });

      if (parsed.globalConfig && configAPI) {
        await configAPI.saveGlobal(parsed.globalConfig);
        setGlobalConfig(parsed.globalConfig);
      }
    } catch (error) {
      console.error('Failed to import configuration:', error);
      throw new Error('Invalid configuration data');
    } finally {
      setIsSaving(false);
    }
  }, [configAPI]);

  const value: ConfigurationContextValue = {
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
    importConfiguration
  };

  return (
    <ConfigurationContext.Provider value={value}>
      {children}
    </ConfigurationContext.Provider>
  );
};

export const useConfiguration = (): ConfigurationContextValue => {
  const context = useContext(ConfigurationContext);
  if (context === undefined) {
    throw new Error('useConfiguration must be used within a ConfigurationProvider');
  }
  return context;
};

export const useProjectConfig = (): ProjectConfiguration | null => {
  const { projectConfig } = useConfiguration();
  return projectConfig;
};

export const useGlobalConfig = (): GlobalConfiguration | null => {
  const { globalConfig } = useConfiguration();
  return globalConfig;
};

export const useApiConfig = () => {
  const projectConfig = useProjectConfig();
  return projectConfig?.api;
};

export const useLLMConfig = () => {
  const projectConfig = useProjectConfig();
  return projectConfig?.llm;
};

export const useComfyUIConfig = () => {
  const projectConfig = useProjectConfig();
  return projectConfig?.comfyui;
};

export const useWizardsConfig = () => {
  const projectConfig = useProjectConfig();
  return projectConfig?.wizards;
};