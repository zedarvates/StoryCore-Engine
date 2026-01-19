/**
 * Central Configuration UI Component
 * 
 * Main container component that manages the overall UI state and provides
 * configuration context for all child components
 */

import { useState, useEffect } from 'react';
import type { CentralConfigurationUIProps } from '../types/configuration';
import { ConfigurationProvider, useConfiguration } from '../contexts/ConfigurationContext';
import { ProjectWorkspace } from './workspace/ProjectWorkspace';
import { APISettingsWindow } from './configuration/APISettingsWindow';
import { LLMConfigurationWindow } from './configuration/LLMConfigurationWindow';
import { ComfyUIConfigurationWindow } from './configuration/ComfyUIConfigurationWindow';
import './CentralConfigurationUI.css';

// Internal component that uses the configuration context
function CentralConfigurationUIContent({
  projectId,
  projectName,
  onClose,
}: CentralConfigurationUIProps) {
  const {
    loadConfiguration,
    saveProjectConfig,
    isLoading,
  } = useConfiguration();

  // State for active window
  const [activeWindow, setActiveWindow] = useState<'workspace' | 'api' | 'llm' | 'comfyui'>('workspace');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration(projectId);
  }, [projectId, loadConfiguration]);

  // Handle opening settings windows
  const handleOpenSettings = (settingsWindow: 'api' | 'llm' | 'comfyui') => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Do you want to discard them?'
      );
      if (!confirmed) {
        return;
      }
      setHasUnsavedChanges(false);
    }
    setActiveWindow(settingsWindow);
  };

  // Handle closing settings windows
  const handleCloseSettings = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Do you want to discard them?'
      );
      if (!confirmed) {
        return;
      }
      setHasUnsavedChanges(false);
    }
    setActiveWindow('workspace');
  };

  // Handle saving API settings
  const handleSaveAPISettings = async (config: any) => {
    try {
      await saveProjectConfig({ api: config });
      setHasUnsavedChanges(false);
      setActiveWindow('workspace');
    } catch (error) {
      console.error('Failed to save API settings:', error);
      throw error;
    }
  };

  // Handle saving LLM settings
  const handleSaveLLMSettings = async (config: any) => {
    try {
      await saveProjectConfig({ llm: config });
      setHasUnsavedChanges(false);
      setActiveWindow('workspace');
    } catch (error) {
      console.error('Failed to save LLM settings:', error);
      throw error;
    }
  };

  // Handle saving ComfyUI settings
  const handleSaveComfyUISettings = async (config: any) => {
    try {
      await saveProjectConfig({ comfyui: config });
      setHasUnsavedChanges(false);
      setActiveWindow('workspace');
    } catch (error) {
      console.error('Failed to save ComfyUI settings:', error);
      throw error;
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="central-configuration-ui loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="central-configuration-ui">
      {/* Main Content */}
      {activeWindow === 'workspace' && (
        <ProjectWorkspace
          projectId={projectId}
          projectName={projectName}
          onOpenSettings={handleOpenSettings}
        />
      )}

      {/* Configuration Windows */}
      <APISettingsWindow
        isOpen={activeWindow === 'api'}
        onClose={handleCloseSettings}
        onSave={handleSaveAPISettings}
      />

      <LLMConfigurationWindow
        isOpen={activeWindow === 'llm'}
        onClose={handleCloseSettings}
        onSave={handleSaveLLMSettings}
      />

      <ComfyUIConfigurationWindow
        isOpen={activeWindow === 'comfyui'}
        onClose={handleCloseSettings}
        onSave={handleSaveComfyUISettings}
      />

      {/* Close Button (if onClose provided) */}
      {onClose && (
        <button className="close-ui-button" onClick={onClose} title="Close">
          ×
        </button>
      )}
    </div>
  );
}

// Main exported component with provider
export function CentralConfigurationUI(props: CentralConfigurationUIProps) {
  return (
    <ConfigurationProvider>
      <CentralConfigurationUIContent {...props} />
    </ConfigurationProvider>
  );
}
