import React, { useState, useCallback } from 'react';
import { ConfigurationProvider } from './ConfigurationContext';
import ProjectWorkspace from './ProjectWorkspace';
import './App.css';

const App: React.FC = () => {
  const [settingsWindow, setSettingsWindow] = useState<'api' | 'llm' | 'comfyui' | null>(null);

  const handleLaunchWizard = useCallback((wizardId: string, projectContext: any) => {
    console.log('Launching wizard:', wizardId, projectContext);
  }, []);

  const handleOpenSettings = useCallback((window: 'api' | 'llm' | 'comfyui') => {
    setSettingsWindow(window);
  }, []);

  return (
    <ConfigurationProvider>
      <div className="app-container">
        <header className="app-header">
          <h1>StoryCore Creative Studio</h1>
        </header>
        <main className="app-main">
          <ProjectWorkspace 
            projectId="default" 
            onLaunchWizard={handleLaunchWizard}
            onOpenSettings={handleOpenSettings}
          />
        </main>
      </div>
    </ConfigurationProvider>
  );
};

export default App;