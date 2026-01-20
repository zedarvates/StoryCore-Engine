/**
 * Project Workspace Component
 * 
 * Main workspace view displaying project tools, status, and wizard launchers
 */

import type { ProjectWorkspaceProps } from '../../types/configuration';
import { useActiveProject } from '../../hooks/useConfigurationHooks';
import { WizardLauncher } from '../wizards/WizardLauncher';
import { WIZARD_DEFINITIONS } from '../../data/wizardDefinitions';
import { useAppStore } from '../../stores/useAppStore';
import { useEditorStore } from '../../stores/editorStore';
import './ProjectWorkspace.css';

export function ProjectWorkspace({
  projectId,
  projectName,
  onOpenSettings,
}: ProjectWorkspaceProps) {
  const activeProject = useActiveProject();
  const openWizard = useAppStore((state) => state.openWizard);
  const setShowWorldWizard = useAppStore((state) => state.setShowWorldWizard);
  const setShowCharacterWizard = useAppStore((state) => state.setShowCharacterWizard);
  const projectPath = useEditorStore((state) => state.projectPath);
  const currentProject = useEditorStore((state) => state.currentProject);

  // Handle wizard launch
  const handleLaunchWizard = (wizardId: string) => {
    console.log(`Launching wizard: ${wizardId} for project: ${projectId}`);
    
    // Map wizard IDs to appropriate wizard openers
    // Multi-step wizards (world, character) use separate modals
    // Simple form wizards use GenericWizardModal
    switch (wizardId) {
      case 'world-building':
        setShowWorldWizard(true);
        break;
      case 'character-creation':
        setShowCharacterWizard(true);
        break;
      case 'scene-generator':
        openWizard('scene-generator');
        break;
      case 'storyboard-creator':
        openWizard('storyboard-creator');
        break;
      case 'dialogue-writer':
        openWizard('dialogue-writer');
        break;
      case 'style-transfer':
        openWizard('style-transfer');
        break;
      default:
        console.warn(`Unknown wizard type: ${wizardId}`);
        alert(`Wizard "${wizardId}" is not yet implemented.`);
    }
  };

  // Handle opening project files in system file explorer
  const handleOpenProjectFiles = async () => {
    try {
      if (!projectPath) {
        alert('No project is currently loaded.');
        return;
      }

      if (!window.electronAPI?.openFolder) {
        alert('File explorer integration is not available in this environment.');
        return;
      }

      await window.electronAPI.openFolder(projectPath);
    } catch (error) {
      console.error('Failed to open project folder:', error);
      alert('Failed to open project folder. Please check if the project path is valid.');
    }
  };

  // Handle opening Grid Editor
  const handleOpenGridEditor = () => {
    console.log('Opening Grid Editor for project:', projectId);
    // Navigate to editor page with grid view
    window.location.href = '/editor?view=grid';
  };

  // Handle analytics dashboard
  const handleOpenAnalytics = () => {
    console.log('Opening analytics dashboard for project:', projectId);
    // TODO: Implement analytics dashboard navigation
    alert('Analytics dashboard will be available in a future update.');
  };

  // Handle export functionality
  const handleExport = async () => {
    try {
      if (!currentProject) {
        alert('No project is currently loaded.');
        return;
      }

      console.log('Exporting project:', projectId);
      
      // Check if there's content to export
      const hasShots = currentProject.storyboard && currentProject.storyboard.length > 0;
      const hasAssets = currentProject.assets && currentProject.assets.length > 0;

      if (!hasShots && !hasAssets) {
        alert('Project has no content to export. Please generate some shots or add assets first.');
        return;
      }

      // TODO: Implement actual export functionality
      alert(`Export functionality will be available soon.\n\nProject: ${projectName}\nShots: ${currentProject.storyboard?.length || 0}\nAssets: ${currentProject.assets?.length || 0}`);
    } catch (error) {
      console.error('Failed to export project:', error);
      alert('Failed to export project. Please try again.');
    }
  };

  // Handle settings navigation
  const handleOpenProjectSettings = () => {
    console.log('Opening project settings for:', projectId);
    onOpenSettings('api');
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
          {/* 
            LLM and ComfyUI configuration removed to avoid conflicts.
            Use Settings menu (top bar) > LLM Configuration / ComfyUI Configuration
          */}
          <div className="settings-info-badge" title="Use Settings menu for LLM and ComfyUI configuration">
            💡 Use Settings menu for LLM & ComfyUI
          </div>
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
          <button 
            className="quick-access-card" 
            onClick={handleOpenProjectFiles}
            title="Open project folder in file explorer"
          >
            <div className="quick-access-icon">📁</div>
            <div className="quick-access-label">Project Files</div>
          </button>
          
          <button 
            className="quick-access-card"
            onClick={handleOpenGridEditor}
            title="Open Master Coherence Sheet Editor (3x3 Grid)"
          >
            <div className="quick-access-icon">🎨</div>
            <div className="quick-access-label">Grid Editor</div>
          </button>
          
          <button 
            className="quick-access-card"
            onClick={handleOpenAnalytics}
            title="View project analytics and statistics"
          >
            <div className="quick-access-icon">📊</div>
            <div className="quick-access-label">Analytics</div>
          </button>
          
          <button 
            className="quick-access-card"
            onClick={handleExport}
            title="Export project content"
          >
            <div className="quick-access-icon">📤</div>
            <div className="quick-access-label">Export</div>
          </button>
          
          <button 
            className="quick-access-card"
            onClick={handleOpenProjectSettings}
            title="Open project settings"
          >
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
