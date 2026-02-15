import React, { useState, useEffect } from 'react';
import { ConfigurationProvider, useConfiguration } from './ConfigurationContext';
import ProjectWorkspace from './ProjectWorkspace';
import { APISettingsWindow } from './APISettingsWindow';
import { LLMConfigurationWindow } from './LLMConfigurationWindow';
import { ComfyUIConfigurationWindow } from './ComfyUIConfigurationWindow';
import type { APIConfiguration, LLMConfiguration, ComfyUIConfiguration } from '../../electron/configurationTypes';

interface CentralConfigurationUIProps {
  projectId: string;
  projectName: string;
  onClose?: () => void;
}

const CentralConfigurationUIContent: React.FC<CentralConfigurationUIProps> = ({
  projectId,
  projectName,
  onClose
}) => {
  const [activeWindow, setActiveWindow] = useState<'workspace' | 'api' | 'llm' | 'comfyui' | null>(null);
  const { loadConfiguration, saveProjectConfig, projectConfig } = useConfiguration();

  const [apiDirty, setApiDirty] = useState(false);
  const [llmDirty, setLlmDirty] = useState(false);
  const [comfyDirty, setComfyDirty] = useState(false);
  const [currentApiConfig, setCurrentApiConfig] = useState<APIConfiguration | undefined>();
  const [currentLlmConfig, setCurrentLlmConfig] = useState<LLMConfiguration | undefined>();
  const [currentComfyConfig, setCurrentComfyConfig] = useState<ComfyUIConfiguration | undefined>();
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const [pendingCloseWindow, setPendingCloseWindow] = useState<'api' | 'llm' | 'comfyui' | null>(null);

  useEffect(() => {
    // Load configuration when component mounts
    loadConfiguration(projectId);
  }, [loadConfiguration, projectId]);

  const handleOpenSettings = (window: 'api' | 'llm' | 'comfyui') => {
    setActiveWindow(window);
  };

  const handleCloseWindow = () => {
    setActiveWindow(null);
  };

  const handleAPISave = async (config: any) => {
    await saveProjectConfig({ api: config });
  };

  const handleLLMSave = async (config: any) => {
    await saveProjectConfig({ llm: config });
  };

  const handleComfyUISave = async (config: any) => {
    await saveProjectConfig({ comfyui: config });
  };

  const handleLaunchWizard = (wizardId: string, projectContext: any) => {
    // TODO: Implement wizard launching logic
    console.log('Launch wizard:', wizardId, projectContext);
  };

  return (
    <div className="central-configuration-ui">
      {/* Main workspace view - always rendered but only visible when no modal is open */}
      <div style={{ display: activeWindow ? 'none' : 'block' }}>
        <ProjectWorkspace
          projectId={projectId}
          onLaunchWizard={handleLaunchWizard}
          onOpenSettings={handleOpenSettings}
        />
      </div>

      {/* Modal windows */}
      <APISettingsWindow
        isOpen={activeWindow === 'api'}
        onClose={handleCloseWindow}
        onSave={handleAPISave}
        initialConfig={projectConfig?.api}
      />

      <LLMConfigurationWindow
        isOpen={activeWindow === 'llm'}
        onClose={handleCloseWindow}
        onSave={handleLLMSave}
        initialConfig={projectConfig?.llm}
      />

      <ComfyUIConfigurationWindow
        isOpen={activeWindow === 'comfyui'}
        onClose={handleCloseWindow}
        onSave={handleComfyUISave}
        initialConfig={projectConfig?.comfyui}
      />
    </div>
  );
};

export const CentralConfigurationUI: React.FC<CentralConfigurationUIProps> = (props) => {
  return (
    <ConfigurationProvider>
      <CentralConfigurationUIContent {...props} />
    </ConfigurationProvider>
  );
};

export default CentralConfigurationUI;