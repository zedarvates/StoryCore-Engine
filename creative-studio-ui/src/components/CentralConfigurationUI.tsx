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
import { GeneralSettingsWindow } from './configuration/GeneralSettingsWindow';
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
  const [activeWindow, setActiveWindow] = useState<'workspace' | 'api' | 'llm' | 'comfyui' | 'general'>('workspace');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Load configuration on mount
  useEffect(() => {
    loadConfiguration(projectId);

    // Log browser detection for backdrop-filter compatibility
    const userAgent = window.navigator.userAgent;
    const isSafari = /^((?!chrome|android).)*safari/i.test(userAgent);
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    console.log({
      userAgent,
      isSafari,
      isIOS,
      isSafariOrIOS: isSafari || isIOS
    });

    // Check CSS property support
    const style = document.createElement('div').style;
    const supportsBackdropFilter = 'backdropFilter' in style || '-webkit-backdrop-filter' in style;
    const supportsWebkitBackdropFilter = '-webkit-backdrop-filter' in style;

    console.log({
      supportsBackdropFilter,
      supportsWebkitBackdropFilter,
      needsWebkitPrefix: isSafari || isIOS
    });
  }, [projectId, loadConfiguration]);

  // Handle opening settings windows
  const handleOpenSettings = (settingsWindow: 'api' | 'llm' | 'comfyui' | 'general') => {
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
  const handleSaveAPISettings = async (config: unknown) => {
    try {
      await saveProjectConfig({ api: config as any });
      setHasUnsavedChanges(false);
      setActiveWindow('workspace');
    } catch (error) {
      console.error('Failed to save API settings:', error);
      throw error;
    }
  };

  // Handle saving LLM settings
  const handleSaveLLMSettings = async (config: unknown) => {
    try {
      await saveProjectConfig({ llm: config as any });
      setHasUnsavedChanges(false);
      setActiveWindow('workspace');
    } catch (error) {
      console.error('Failed to save LLM settings:', error);
      throw error;
    }
  };

  // Handle saving ComfyUI settings
  const handleSaveComfyUISettings = async (config: unknown) => {
    try {
      await saveProjectConfig({ comfyui: config as any });
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

      <GeneralSettingsWindow
        isOpen={activeWindow === 'general'}
        onClose={handleCloseSettings}
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

