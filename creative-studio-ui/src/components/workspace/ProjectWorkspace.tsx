/**
 * Project Workspace Component
 * 
 * Main workspace view displaying project tools, status, and wizard launchers
 */

import React, { useState } from 'react';
import type { ProjectWorkspaceProps } from '../../types/configuration';
import { useActiveProject } from '../../hooks/useConfigurationHooks';
import { WizardLauncher } from '@/components/wizard/WizardLauncher';
import { GhostTrackerWizard } from '@/components/wizard/GhostTrackerWizard';
import { WIZARD_DEFINITIONS } from '../../data/wizardDefinitions';
import { useAppStore } from '../../stores/useAppStore';
import { useEditorStore } from '../../stores/editorStore';
import { useSequencePlanStore } from '../../stores/sequencePlanStore';
import { useToast } from '../../hooks/use-toast';
import { logger } from '../../utils/logging';
import './ProjectWorkspace.css';

export function ProjectWorkspace({
  projectId,
  projectName,
  onOpenSettings,
}: Readonly<ProjectWorkspaceProps>) {
  const activeProject = useActiveProject();
  const openWizard = useAppStore((state) => state.openWizard);
  const setShowWorldWizard = useAppStore((state) => state.setShowWorldWizard);
  const setShowCharacterWizard = useAppStore((state) => state.setShowCharacterWizard);
  const setShowStorytellerWizard = useAppStore((state) => state.setShowStorytellerWizard);
  const setShowProjectSetupWizard = useAppStore((state) => state.setShowProjectSetupWizard);
  const openSequencePlanWizard = useAppStore((state) => state.openSequencePlanWizard);
  const setShowDialogueWriter = useAppStore((state) => state.setShowDialogueWriter);
  const projectPath = useEditorStore((state) => state.projectPath);
  const currentProject = useEditorStore((state) => state.currentProject);

  // Sequence plan data
  const sequences = useSequencePlanStore((state) => state.plans);
  const shots = useSequencePlanStore((state) => state.currentPlanData?.shots || []);

  // Toast hook
  const { toast } = useToast();

  // Handle wizard launch
  const handleLaunchWizard = (wizardId: string) => {
    // Get the closeActiveWizard function from store
    const closeActiveWizard = useAppStore.getState().closeActiveWizard;

    // Close ALL wizards first (mutual exclusion)
    closeActiveWizard();

    // Map wizard IDs to appropriate wizard openers
    // Multi-step wizards (world, character) use separate modals
    // Simple form wizards use GenericWizardModal
    switch (wizardId) {
      case 'project-init':
        setShowProjectSetupWizard(true);
        break;
      case 'world-building':
        setShowWorldWizard(true);
        break;
      case 'character-creation':
        setShowCharacterWizard(true);
        break;
      case 'storyteller-wizard':
        setShowStorytellerWizard(true);
        break;
      case 'scene-generator':
        openWizard('scene-generator');
        break;
      case 'storyboard-creator':
        openWizard('storyboard-creator');
        break;
      case 'dialogue-writer':
      case 'dialogue-wizard':
        useEditorStore.getState().openWizard('dialogue-writer', 1);
        break;
      case 'style-transfer':
        openWizard('style-transfer');
        break;
      case 'shot-planning':
        openSequencePlanWizard();
        break;
      case 'ghost-tracker-wizard':
        // Ghost Tracker Wizard is available via the Wizards section
        toast({
          title: 'Ghost Tracker Wizard',
          description: 'Access the Ghost Tracker Wizard from the Wizards section.',
          variant: 'default',
        });
        break;
      default:
        logger.warn(`Unknown wizard type: ${wizardId}`);
        toast({
          title: 'Wizard Not Implemented',
          description: `Wizard "${wizardId}" is not yet implemented.`,
          variant: 'default',
        });
    }
  };

  // Handle opening project files in system file explorer
  const handleOpenProjectFiles = async () => {
    try {
      if (!projectPath) {
        toast({
          title: 'No Project Loaded',
          description: 'No project is currently loaded.',
          variant: 'destructive',
        });
        return;
      }

      const electronAPI = window.electronAPI as typeof window.electronAPI;
      if (!electronAPI?.app?.openFolder) {
        toast({
          title: 'File Explorer Not Available',
          description: 'File explorer integration is not available in this environment.',
          variant: 'default',
        });
        return;
      }

      await electronAPI.app.openFolder(projectPath);
    } catch (error) {
      logger.error('Failed to open project folder:', error);
      toast({
        title: 'Failed to Open Folder',
        description: 'Failed to open project folder. Please check if the project path is valid.',
        variant: 'destructive',
      });
    }
  };

  // Handle opening Grid Editor
  const handleOpenGridEditor = () => {
    // Navigate to editor page with grid view
    globalThis.location.href = '/editor?view=grid';
  };

  // Handle analytics dashboard
  const handleOpenAnalytics = () => {
    toast({
      title: 'Coming Soon',
      description: 'Analytics dashboard will be available in a future update.',
      variant: 'default',
    });
  };

  // Handle export functionality
  const handleExport = async () => {
    try {
      if (!currentProject) {
        toast({
          title: 'No Project Loaded',
          description: 'No project is currently loaded.',
          variant: 'destructive',
        });
        return;
      }

      // Check if there's content to export
      const hasShots = currentProject.storyboard && currentProject.storyboard.length > 0;
      const hasAssets = currentProject.assets && currentProject.assets.length > 0;
      const hasSequences = shots && shots.length > 0;

      if (!hasShots && !hasAssets && !hasSequences) {
        toast({
          title: 'Nothing to Export',
          description: 'Project has no content to export. Please generate some shots, add assets, or create sequences first.',
          variant: 'destructive',
        });
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
      link.download = `${projectName.replaceAll(/[^a-zA-Z0-9]/g, '_')}_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);

      toast({
        title: 'Project Exported Successfully',
        description: `Exported ${exportData.metadata.totalShots} shots, ${exportData.metadata.totalAssets} assets, and ${exportData.metadata.totalSequences} sequences.`,
      });

    } catch (error) {
      logger.error('Failed to export project:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export project. Please check the console for details.',
        variant: 'destructive',
      });
    }
  };

  // Handle settings navigation
  const handleOpenProjectSettings = () => {
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
            onClick={() => onOpenSettings('llm')}
            title="LLM Settings"
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

export default ProjectWorkspace;

// Ghost Tracker Wizard Modal
function GhostTrackerWizardModal({
  isOpen,
  onClose,
  projectPath
}: Readonly<{
  isOpen: boolean;
  onClose: () => void;
  projectPath?: string;
}>) {
  return (
    <div className={`ghost-tracker-modal ${isOpen ? 'open' : ''}`} role="dialog" aria-modal="true">
      <div
        className="ghost-tracker-modal-overlay"
        onClick={onClose}
        onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
        role="button"
        tabIndex={0}
        aria-label="Close modal"
      />
      <div className="ghost-tracker-modal-content">
        <button className="modal-close" onClick={onClose} aria-label="Close">×</button>
        <GhostTrackerWizard isOpen={isOpen} onClose={onClose} projectPath={projectPath} />
      </div>
    </div>
  );
}
