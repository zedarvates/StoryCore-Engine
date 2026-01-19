/**
 * Project Workspace Component
 * 
 * Main workspace view displaying project tools, status, and wizard launchers
 */

import type { ProjectWorkspaceProps } from '../../types/configuration';
import { useActiveProject } from '../../hooks/useConfigurationHooks';
import { WizardLauncher } from '../wizards/WizardLauncher';
import { WIZARD_DEFINITIONS } from '../../data/wizardDefinitions';
import './ProjectWorkspace.css';

export function ProjectWorkspace({
  projectId,
  projectName,
  onOpenSettings,
}: ProjectWorkspaceProps) {
  const activeProject = useActiveProject();

  // Handle wizard launch
  const handleLaunchWizard = (wizardId: string) => {
    console.log(`Launching wizard: ${wizardId} for project: ${projectId}`);
    // TODO: Implement wizard launch logic
    alert(`Launching ${wizardId} wizard...`);
  };

  return (
    <div className="project-workspace">
      {/* Project Header */}
      <div className="project-header">
        <div className="project-info">
          <h1 className="project-name">{projectName}</h1>
          <div className="project-meta">
            <span className="project-id">ID: {projectId}</span>
            {activeProject && (
              <>
                <span className="separator">•</span>
                <span className={`project-status status-${activeProject.status}`}>
                  {activeProject.status}
                </span>
                <span className="separator">•</span>
                <span className="project-modified">
                  Modified: {new Date(activeProject.lastModified).toLocaleString()}
                </span>
              </>
            )}
          </div>
        </div>
        
        <div className="project-actions">
          <button
            className="settings-button"
            onClick={() => onOpenSettings('api')}
            title="API Settings"
          >
            🔌 API
          </button>
          <button
            className="settings-button"
            onClick={() => onOpenSettings('llm')}
            title="LLM Configuration"
          >
            🤖 LLM
          </button>
          <button
            className="settings-button"
            onClick={() => onOpenSettings('comfyui')}
            title="ComfyUI Configuration"
          >
            🎨 ComfyUI
          </button>
        </div>
      </div>

      {/* Pipeline Status */}
      <div className="pipeline-status">
        <h3>Pipeline Status</h3>
        <div className="status-grid">
          <div className="status-card">
            <div className="status-icon">📝</div>
            <div className="status-info">
              <div className="status-label">Script</div>
              <div className="status-value">Ready</div>
            </div>
          </div>
          
          <div className="status-card">
            <div className="status-icon">🎬</div>
            <div className="status-info">
              <div className="status-label">Scenes</div>
              <div className="status-value">0 generated</div>
            </div>
          </div>
          
          <div className="status-card">
            <div className="status-icon">🖼️</div>
            <div className="status-info">
              <div className="status-label">Images</div>
              <div className="status-value">0 generated</div>
            </div>
          </div>
          
          <div className="status-card">
            <div className="status-icon">🎵</div>
            <div className="status-info">
              <div className="status-label">Audio</div>
              <div className="status-value">Not started</div>
            </div>
          </div>
        </div>
      </div>

      {/* Wizard Launcher */}
      <WizardLauncher
        availableWizards={WIZARD_DEFINITIONS}
        onLaunchWizard={handleLaunchWizard}
      />

      {/* Quick Access */}
      <div className="quick-access">
        <h3>Quick Access</h3>
        <div className="quick-access-grid">
          <button className="quick-access-card">
            <div className="quick-access-icon">📁</div>
            <div className="quick-access-label">Project Files</div>
          </button>
          
          <button className="quick-access-card">
            <div className="quick-access-icon">📊</div>
            <div className="quick-access-label">Analytics</div>
          </button>
          
          <button className="quick-access-card">
            <div className="quick-access-icon">📤</div>
            <div className="quick-access-label">Export</div>
          </button>
          
          <button className="quick-access-card">
            <div className="quick-access-icon">⚙️</div>
            <div className="quick-access-label">Settings</div>
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="recent-activity">
        <h3>Recent Activity</h3>
        <div className="activity-list">
          <div className="activity-item">
            <div className="activity-icon">✅</div>
            <div className="activity-content">
              <div className="activity-title">Project created</div>
              <div className="activity-time">
                {activeProject && new Date(activeProject.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
          
          <div className="activity-item">
            <div className="activity-icon">⚙️</div>
            <div className="activity-content">
              <div className="activity-title">Configuration initialized</div>
              <div className="activity-time">Just now</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
