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
import { useSequencePlanStore } from '../../stores/sequencePlanStore';
import { useToast } from '../../hooks/use-toast';
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

  // Sequence plan data
  const sequences = useSequencePlanStore((state) => state.plans);
  const shots = useSequencePlanStore((state) => state.currentPlanData?.shots || []);

  // Toast hook
  const { toast } = useToast();

  // Handle wizard launch
  const handleLaunchWizard = (wizardId: string) => {
    ;
    
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
    ;
    // Navigate to editor page with grid view
    window.location.href = '/editor?view=grid';
  };

  // Handle analytics dashboard
  const handleOpenAnalytics = () => {
    ;
    alert('Analytics dashboard will be available in a future update.');
  };

  // Handle export functionality
  const handleExport = async () => {
    try {
      if (!currentProject) {
        alert('No project is currently loaded.');
        return;
      }

      // Check if there's content to export
      const hasShots = currentProject.storyboard && currentProject.storyboard.length > 0;
      const hasAssets = currentProject.assets && currentProject.assets.length > 0;
      const hasSequences = shots && shots.length > 0;

      if (!hasShots && !hasAssets && !hasSequences) {
        alert('Project has no content to export. Please generate some shots, add assets, or create sequences first.');
        return;
      }

      // Create comprehensive export data
      const exportData = {
        project: {
          id: projectId,
          name: projectName,
          exportedAt: new Date().toISOString(),
          version: '1.0.0',
          format: 'StoryCore Project Export',
        },
        metadata: {
          totalShots: currentProject.storyboard?.length || 0,
          totalAssets: currentProject.assets?.length || 0,
          totalSequences: sequences?.length || 0,
          totalSequenceShots: shots?.length || 0,
        },
        content: {
          shots: currentProject.storyboard || [],
          assets: currentProject.assets || [],
          sequences: sequences || [],
          sequenceShots: shots || [],
        },
        settings: {
          theme: 'dark', // Could be made dynamic
          neonEffects: true,
          exportTimestamp: Date.now(),
        }
      };

      // Create downloadable JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });

      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `${projectName.replace(/[^a-zA-Z0-9]/g, '_')}_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);

      toast({
        title: 'Project Exported Successfully',
        description: `Exported ${exportData.metadata.totalShots} shots, ${exportData.metadata.totalAssets} assets, and ${exportData.metadata.totalSequences} sequences.`,
      });

    } catch (error) {
      console.error('Failed to export project:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export project. Please check the console for details.',
        variant: 'destructive',
      });
    }
  };

  // Handle settings navigation
  const handleOpenProjectSettings = () => {
    ;
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
          <button
            className="settings-button general"
            onClick={() => onOpenSettings('general')}
            title="General Settings"
          >
            ⚙️ General
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
