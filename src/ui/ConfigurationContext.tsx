import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type {
  ProjectConfiguration,
  GlobalConfiguration,
  ProjectMetadata,
  ValidationResult,
  ValidationRule
} from '../../electron/configurationTypes';
import { ConfigurationStore } from '../../electron/configurationStore';

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
  validateConfiguration: (config: any, rules: ValidationRule[]) => ValidationResult;
  resetToDefaults: (scope: 'project' | 'global') => Promise<void>;
  exportConfiguration: () => Promise<string>;
  importConfiguration: (data: string) => Promise<void>;
}

const ConfigurationContext = createContext<ConfigurationContextValue | undefined>(undefined);

const store = new ConfigurationStore();

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

export const ConfigurationProvider: React.FC<ConfigurationProviderProps> = ({ children }) => {
  const [projectConfig, setProjectConfig] = useState<ProjectConfiguration | null>(null);
  const [globalConfig, setGlobalConfig] = useState<GlobalConfiguration | null>(null);
  const [activeProject, setActiveProject] = useState<ProjectMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadConfiguration = useCallback(async (projectId: string) => {
    setIsLoading(true);
    try {
      // Load global config
      let global = await store.loadGlobalConfig();
      if (!global) {
        global = defaultGlobalConfig;
        await store.saveGlobalConfig(global);
      }
      setGlobalConfig(global);

      // Load project config
      let project = await store.loadProjectConfig(projectId);
      if (!project) {
        project = { ...defaultProjectConfig, projectId };
        await store.saveProjectConfig(projectId, project);
      }
      setProjectConfig(project);

      // Set active project metadata (simplified)
      setActiveProject({
        id: projectId,
        name: projectId, // In real implementation, this would come from project metadata
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
  }, []);

  const saveProjectConfig = useCallback(async (config: Partial<ProjectConfiguration>) => {
    if (!projectConfig) return;
    setIsSaving(true);
    try {
      const updated = { ...projectConfig, ...config };
      await store.saveProjectConfig(updated.projectId, updated);
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
  }, [projectConfig?.projectId]);

  const saveGlobalConfig = useCallback(async (config: Partial<GlobalConfiguration>) => {
    setIsSaving(true);
    try {
      setGlobalConfig((prevConfig) => {
        if (!prevConfig) return prevConfig;
        const updated = { ...prevConfig, ...config };
        store.saveGlobalConfig(updated).catch((error) => {
          console.error('Failed to save global configuration:', error);
          throw error;
        });
        return updated;
      });
    } finally {
      setIsSaving(false);
    }
  }, []);

  const validateConfiguration = useCallback((config: any, rules: ValidationRule[]): ValidationResult => {
    return store.validateConfig(config, rules);
  }, []);

  const resetToDefaults = useCallback(async (scope: 'project' | 'global') => {
    setIsSaving(true);
    try {
      if (scope === 'project') {
        setProjectConfig(prevConfig => {
          if (!prevConfig) return null;
          const resetConfig = { ...defaultProjectConfig, projectId: prevConfig.projectId };
          store.saveProjectConfig(resetConfig.projectId, resetConfig).catch(error => {
            console.error('Failed to save project configuration:', error);
          });
          return resetConfig;
        });
      } else if (scope === 'global') {
        const resetConfig = defaultGlobalConfig;
        await store.saveGlobalConfig(resetConfig);
        setGlobalConfig(resetConfig);
      }
    } catch (error) {
      console.error('Failed to reset configuration:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  }, []);

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
          store.saveProjectConfig(importedProject.projectId, importedProject).catch(error => {
            console.error('Failed to save project configuration:', error);
          });
          return importedProject;
        }
        return prevProjectConfig;
      });

      if (parsed.globalConfig) {
        await store.saveGlobalConfig(parsed.globalConfig);
        setGlobalConfig(parsed.globalConfig);
      }
    } catch (error) {
      console.error('Failed to import configuration:', error);
      throw new Error('Invalid configuration data');
    } finally {
      setIsSaving(false);
    }
  }, []);

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