import React, { useEffect } from 'react';
import { useConfiguration } from './ConfigurationContext';
import WizardLauncher from './WizardLauncher';
import ActiveAddonsGrid, { refreshActiveAddons } from './ActiveAddonsGrid';
import './ProjectWorkspace.css';

// Make refreshActiveAddons available globally for external calls
if (typeof window !== 'undefined') {
  (window as any).refresh_active_addons = refreshActiveAddons;
}

interface ProjectWorkspaceProps {
  projectId: string;
  onLaunchWizard: (wizardId: string, projectContext: any) => void;
  onOpenSettings: (window: 'api' | 'llm' | 'comfyui') => void;
}

const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  projectId,
  onLaunchWizard,
  onOpenSettings
}) => {
  const { activeProject, projectConfig, isLoading } = useConfiguration();

  // Set up global refresh function reference
  useEffect(() => {
    (window as any).refresh_active_addons = refreshActiveAddons;
    return () => {
      delete (window as any).refresh_active_addons;
    };
  }, []);

  if (isLoading || !activeProject) {
    return (
      <div className="project-workspace">
        <div className="workspace-loading">
          <div className="loading-spinner"></div>
          <p>Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="project-workspace">
      {/* Project Header */}
      <header className="project-header">
        <div className="project-info">
          <h1 className="project-title">{activeProject.name}</h1>
          <div className="project-status">
            <span className={`status-indicator ${activeProject.status}`}>
              {activeProject.status.toUpperCase()}
            </span>
            <span className="project-id">ID: {projectId}</span>
          </div>
        </div>
        <div className="project-metadata">
          <div className="metadata-item">
            <span className="label">Created:</span>
            <span className="value">{new Date(activeProject.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="metadata-item">
            <span className="label">Modified:</span>
            <span className="value">{new Date(activeProject.lastModified).toLocaleDateString()}</span>
          </div>
        </div>
      </header>

      {/* Main Workspace Content */}
      <div className="workspace-content">
        <div className="workspace-grid">
          {/* Project Pipeline Status */}
          <section className="workspace-section pipeline-status">
            <h2 className="section-title">Pipeline Status</h2>
            <div className="status-overview">
              <div className="status-item">
                <div className="status-label">API Configuration</div>
                <div className="status-value">
                  {projectConfig?.api?.endpoints && Object.keys(projectConfig.api.endpoints).length > 0
                    ? 'Configured'
                    : 'Not Configured'}
                </div>
              </div>
              <div className="status-item">
                <div className="status-label">LLM Provider</div>
                <div className="status-value">
                  {projectConfig?.llm?.provider || 'Not Set'}
                </div>
              </div>
              <div className="status-item">
                <div className="status-label">ComfyUI Server</div>
                <div className="status-value">
                  {projectConfig?.comfyui?.serverUrl ? 'Connected' : 'Not Connected'}
                </div>
              </div>
            </div>
          </section>

          {/* Quick Access Assets */}
          <section className="workspace-section quick-assets">
            <h2 className="section-title">Quick Access Assets</h2>
            <div className="assets-grid">
              <div className="asset-item">
                <div className="asset-icon">📁</div>
                <div className="asset-name">Project Files</div>
                <div className="asset-count">0 files</div>
              </div>
              <div className="asset-item">
                <div className="asset-icon">🎭</div>
                <div className="asset-name">Characters</div>
                <div className="asset-count">0 created</div>
              </div>
              <div className="asset-item">
                <div className="asset-icon">🎬</div>
                <div className="asset-name">Scenes</div>
                <div className="asset-count">0 built</div>
              </div>
              <div className="asset-item">
                <div className="asset-icon">🎵</div>
                <div className="asset-name">Audio Assets</div>
                <div className="asset-count">0 generated</div>
              </div>
            </div>
          </section>

          {/* Recent Activity Logs */}
          <section className="workspace-section activity-logs">
            <h2 className="section-title">Recent Activity</h2>
            <div className="activity-feed">
              <div className="activity-item">
                <div className="activity-timestamp">Just now</div>
                <div className="activity-message">Project workspace initialized</div>
              </div>
              <div className="activity-item">
                <div className="activity-timestamp">2 hours ago</div>
                <div className="activity-message">Configuration loaded successfully</div>
              </div>
              <div className="activity-item">
                <div className="activity-timestamp">1 day ago</div>
                <div className="activity-message">Project created</div>
              </div>
            </div>
          </section>
        </div>

        {/* Configuration Menu */}
        <section className="workspace-section config-menu">
          <h2 className="section-title">Configuration</h2>
          <div className="config-buttons">
            <button
              className="config-button api-config"
              onClick={() => onOpenSettings('api')}
            >
              <div className="config-icon">🔗</div>
              <div className="config-label">API Settings</div>
            </button>
            {/* 
              LLM and ComfyUI configuration removed from dashboard to avoid conflicts.
              Use Settings menu (top bar) > LLM Configuration / ComfyUI Configuration
              This ensures a single source of truth for all settings.
            */}
          </div>
          <div className="config-info">
            <p className="text-sm text-muted-foreground">
              💡 To configure LLM and ComfyUI, use the <strong>Settings</strong> menu in the top menu bar.
            </p>
          </div>
        </section>

        {/* Wizard Launcher */}
        <WizardLauncher
          projectId={projectId}
          onLaunchWizard={onLaunchWizard}
          onReturnToWorkspace={() => {}} // No-op for now
        />

        {/* Active Add-ons Grid - displays enabled add-ons as tiles */}
        <ActiveAddonsGrid
          projectId={projectId}
          onAddonDisable={(addonName) => {
            console.log('Addon disabled:', addonName);
          }}
          onAddonOpen={(addonName) => {
            console.log('Addon opened:', addonName);
          }}
        />
      </div>
    </div>
  );
};

export default ProjectWorkspace;