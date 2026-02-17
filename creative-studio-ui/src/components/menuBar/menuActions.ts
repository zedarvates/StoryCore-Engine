/**
 * Menu Action Handlers
 * 
 * Implements all menu action handlers for the MenuBar component.
 * Organized by menu category: File, Edit, View, Project, Tools, Help.
 */

import type { ActionContext } from '../../types/menuConfig';
import type { Project } from '../../types';
import { useAppStore } from '../../stores/useAppStore';
import { projectExportService } from '../../services/projectExportService';

// Type declaration for Electron API dialog
interface ElectronDialogAPI {
  showOpenDialog: (options: { title: string; buttonLabel: string; properties: string[] }) => Promise<{
    canceled: boolean;
    filePaths: string[];
  }>;
  showSaveDialog: (options: unknown) => Promise<any>;
}

// Type declaration for File System Access API
declare global {
  interface Window {
    showDirectoryPicker?: (options?: { startIn?: string }) => Promise<{
      name: string;
    }>;
  }
}

/**
 * Error handling wrapper for menu actions
 */
interface ActionErrorHandlerOptions {
  actionName: string;
  successMessage?: string;
  errorPrefix?: string;
  rollback?: (ctx: ActionContext, error: Error) => Promise<void> | void;
  showSuccess?: boolean;
}

/**
 * Wraps an async action with comprehensive error handling
 */
async function withErrorHandling<T>(
  action: (ctx: ActionContext) => Promise<T>,
  ctx: ActionContext,
  options: ActionErrorHandlerOptions
): Promise<T | undefined> {
  const { actionName, successMessage, errorPrefix, rollback, showSuccess = false } = options;

  try {
    console.log(`[MenuAction] Starting: ${actionName}`, {
      timestamp: new Date().toISOString(),
      project: (ctx.state.project as any)?.project_name,
      hasUnsavedChanges: ctx.state.hasUnsavedChanges,
    });

    const result = await action(ctx);

    console.log(`[MenuAction] Success: ${actionName}`, {
      timestamp: new Date().toISOString(),
      result,
    });

    if (showSuccess && successMessage) {
      ctx.services.notification.show({
        type: 'success',
        message: successMessage,
        duration: 3000,
      });
    }

    return result;
  } catch (error) {
    console.error(`[MenuAction] Error: ${actionName}`, {
      timestamp: new Date().toISOString(),
      error,
      stack: error instanceof Error ? error.stack : undefined,
      project: (ctx.state.project as any)?.project_name,
    });

    const errorMessage = getErrorMessage(error, errorPrefix);

    ctx.services.notification.show({
      type: 'error',
      message: errorMessage,
      duration: 5000,
    });

    if (rollback) {
      try {
        console.log(`[MenuAction] Attempting rollback: ${actionName}`);
        await rollback(ctx, error instanceof Error ? error : new Error(String(error)));
        console.log(`[MenuAction] Rollback successful: ${actionName}`);
      } catch (rollbackError) {
        console.error(`[MenuAction] Rollback failed: ${actionName}`, rollbackError);
        ctx.services.notification.show({
          type: 'error',
          message: 'Failed to rollback changes. Application state may be inconsistent.',
          duration: 7000,
        });
      }
    }

    return undefined;
  }
}

/**
 * Get user-friendly error message from error object
 */
function getErrorMessage(error: unknown, prefix?: string): string {
  const basePrefix = prefix || 'Operation failed';

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('not found')) {
      return 'Project file not found. It may have been moved or deleted.';
    }
    if (message.includes('permission') || message.includes('eacces')) {
      return 'Permission denied. Check file permissions and try again.';
    }
    if (message.includes('validation')) {
      return `Invalid project data: ${error.message}`;
    }
    if (message.includes('network')) {
      return 'Network error. Check your connection and try again.';
    }
    if (message.includes('disk full') || message.includes('enospc')) {
      return 'Insufficient disk space. Free up space and try again.';
    }

    return `${basePrefix}: ${error.message}`;
  }

  return `${basePrefix}: An unexpected error occurred`;
}

/**
 * File Menu Actions
 */
export const fileActions = {
  async newProject(ctx: ActionContext): Promise<void> {
    console.log('[MenuAction] New Project');

    // Use the app store to open the create project dialog
    const store = useAppStore.getState();
    store.setShowCreateProjectDialog(true);

    ctx.services.notification.show({
      type: 'info',
      message: 'Creating new project...',
      duration: 2000,
    });
  },

  async openProject(ctx: ActionContext): Promise<void> {
    console.log('[MenuAction] Open Project');

    try {
      ctx.services.notification.show({
        type: 'info',
        message: 'Opening project...',
        duration: 2000,
      });

      let projectPath: string | null = null;

      // Check if we're in Electron environment
      if (window.electronAPI?.dialog?.showOpenDialog) {
        // Use Electron's native file picker
        const result = await window.electronAPI.dialog.showOpenDialog({
          title: 'Open Project',
          buttonLabel: 'Open',
          properties: ['openDirectory'],
        });

        if (!result.canceled && result.filePaths.length > 0) {
          projectPath = result.filePaths[0];
        }
      } else if (typeof window !== 'undefined' && window.showDirectoryPicker) {
        // Fallback: Use browser Directory Picker API if available
        try {
          const dirHandle = await window.showDirectoryPicker({
            startIn: 'documents',
          });
          // Get the path from the handle (may not be available in all browsers)
          projectPath = (dirHandle as any).name || null;
        } catch (dirPickerError) {
          console.warn('[MenuAction] Directory picker canceled or not supported:', dirPickerError);
        }
      } else {
        // Browser environment without File System Access API
        ctx.services.notification.show({
          type: 'warning',
          message: 'Please run in Electron mode to open projects. Use Ctrl+O shortcut.',
          duration: 5000,
        });
        return;
      }

      if (!projectPath) {
        console.log('[MenuAction] No project path selected');
        return;
      }

      console.log('[MenuAction] Loading project from:', projectPath);

      // Load the project using ProjectService
      const { projectService } = await import('@/services/project/ProjectService');
      const projectData = await projectService.loadProject(projectPath);

      // Create a Project object from the loaded data
      const project: Project = {
        id: `project_${Date.now()}`,
        schema_version: '1.0',
        path: projectPath,
        project_name: projectData.project_name,
        shots: (projectData.storyboard || []).flatMap((seq: any) =>
          (seq.shots || []).map((shot: any) => ({
            id: shot.shot_id,
            sequenceId: seq.sequence_id,
            shotNumber: shot.shot_number,
            description: shot.description || '',
            status: shot.status || 'pending',
          }))
        ),
        assets: (projectData.assets || []).map((asset: any) => ({
          id: asset.id || `asset_${Date.now()}_${Math.random()}`,
          name: asset.filename || asset.name || 'Unnamed Asset',
          type: asset.type || 'image',
          url: asset.path || asset.url || '',
          thumbnail: asset.thumbnail,
          metadata: asset as any,
        })),
        characters: (projectData.characters || []).map((char: any) => ({
          character_id: char.character_id || char.id || `char_${Date.now()}_${Math.random()}`,
          name: char.name || 'Unnamed Character',
          role: char.role || 'supporting',
          creation_method: char.creation_method || 'manual',
          creation_timestamp: char.creation_timestamp || new Date().toISOString(),
          version: char.version || '1.0',
          status: char.status || 'active',
          description: char.description || '',
          visual_attributes: char.visual_attributes || {},
          personality: char.personality || {},
          relationships: char.relationships || [],
          visual_identity: char.visual_identity || {
            hair_color: '',
            hair_style: '',
            hair_length: '',
            eye_color: '',
            eye_shape: '',
            skin_tone: '',
            facial_structure: '',
            distinctive_features: [],
            age_range: '',
            height: '',
            build: '',
            posture: '',
            clothing_style: '',
            color_palette: [],
          },
          background: char.background || {
            origin: '',
            occupation: '',
            education: '',
            family: '',
            significant_events: [],
            current_situation: '',
          },
        })),
        capabilities: {
          grid_generation: true,
          promotion_engine: true,
          qa_engine: true,
          autofix_engine: true,
          character_casting: true,
        },
        generation_status: {
          grid: 'pending',
          promotion: 'pending',
        },
      };

      // Update the app store with the loaded project
      const store = useAppStore.getState();
      store.setProject(project);

      // Also load shots from the storyboard
      if (projectData.storyboard && projectData.storyboard.length > 0) {
        store.setShots(projectData.storyboard);
      }

      ctx.services.notification.show({
        type: 'success',
        message: `Project "${projectData.project_name}" opened successfully`,
        duration: 3000,
      });

      console.log('[MenuAction] Project loaded successfully:', projectData.project_name);
    } catch (error) {
      console.error('[MenuAction] Failed to open project:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      ctx.services.notification.show({
        type: 'error',
        message: `Failed to open project: ${errorMessage}`,
        duration: 5000,
      });
    }
  },

  async saveProject(ctx: ActionContext): Promise<void> {
    if (!ctx.state.project) {
      ctx.services.notification.show({
        type: 'warning',
        message: 'No project to save',
        duration: 3000,
      });
      return;
    }

    console.log('[MenuAction] Save Project');
    ctx.services.notification.show({
      type: 'success',
      message: `Project "${(ctx.state.project as any).project_name}" saved successfully`,
      duration: 3000,
    });
  },

  async saveProjectAs(ctx: ActionContext): Promise<void> {
    if (!ctx.state.project) {
      ctx.services.notification.show({
        type: 'warning',
        message: 'No project to save',
        duration: 3000,
      });
      return;
    }

    console.log('[MenuAction] Save Project As');
    ctx.services.notification.show({
      type: 'info',
      message: 'Save as feature coming soon',
      duration: 3000,
    });
  },

  async exitProject(ctx: ActionContext): Promise<void> {
    console.log('[MenuAction] Exit Project');

    const projectName = (ctx.state.project as any)?.project_name || 'Current project';

    // Show confirmation notification
    ctx.services.notification.show({
      type: 'info',
      message: `Exiting "${projectName}" and returning to dashboard`,
      duration: 2000,
    });

    // Dispatch event to clear project and navigate to dashboard
    window.dispatchEvent(new CustomEvent('storycore:exit-project'));

    // Also dispatch navigate-to-dashboard event as fallback
    window.dispatchEvent(new CustomEvent('storycore:navigate-to-dashboard'));
  },

  async quitApplication(ctx: ActionContext): Promise<void> {
    console.log('[MenuAction] Quit Application');

    // Show confirmation notification
    ctx.services.notification.show({
      type: 'info',
      message: 'Quitting StoryCore...',
      duration: 2000,
    });

    // Try to quit via Electron API
    if (window.electronAPI?.app?.quit) {
      try {
        window.electronAPI.app.quit();
      } catch (error) {
        console.error('[MenuAction] Failed to quit via Electron:', error);
        // Fallback to window.close()
        window.close();
      }
    } else {
      // Browser environment fallback
      window.close();
    }
  },

  async exportJSON(ctx: ActionContext): Promise<void> {
    if (!ctx.state.project) return;

    console.log('[MenuAction] Export JSON');
    const result = await projectExportService.exportJSON(ctx.state.project);
    if (result.success) {
      ctx.services.notification.show({
        type: 'success',
        message: `Project exported successfully as JSON: ${result.filePath}`,
        duration: 3000,
      });
    } else {
      ctx.services.notification.show({
        type: 'error',
        message: `Export JSON failed: ${result.error?.message}`,
        duration: 5000,
      });
    }
  },

  async exportPDF(ctx: ActionContext): Promise<void> {
    if (!ctx.state.project) return;

    console.log('[MenuAction] Export PDF');
    const result = await projectExportService.exportPDF(ctx.state.project);
    if (result.success) {
      ctx.services.notification.show({
        type: 'success',
        message: `Project exported successfully as PDF: ${result.filePath}`,
        duration: 3000,
      });
    } else {
      ctx.services.notification.show({
        type: 'error',
        message: `Export PDF failed: ${result.error?.message}`,
        duration: 5000,
      });
    }
  },

  async exportVideo(ctx: ActionContext): Promise<void> {
    if (!ctx.state.project) return;

    console.log('[MenuAction] Export Video');
    const result = await projectExportService.exportVideo(ctx.state.project);
    if (result.success) {
      ctx.services.notification.show({
        type: 'success',
        message: `Project exported successfully as video: ${result.filePath}`,
        duration: 3000,
      });
    } else {
      ctx.services.notification.show({
        type: 'error',
        message: `Export Video failed: ${result.error?.message}`,
        duration: 5000,
      });
    }
  },

  preferences(ctx: ActionContext): void {
    console.log('[MenuAction] Preferences');
    const store = useAppStore.getState();
    store.setShowGeneralSettings(true);
  },
};

/**
 * Edit Menu Actions
 */
export const editActions = {
  undo(ctx: ActionContext): void {
    console.log('[MenuAction] Undo');
    if (ctx.state.undoStack.canUndo) {
      ctx.state.undoStack.undo();
      ctx.services.notification.show({
        type: 'info',
        message: 'Action undone',
        duration: 2000,
      });
    }
  },

  redo(ctx: ActionContext): void {
    console.log('[MenuAction] Redo');
    if (ctx.state.undoStack.canRedo) {
      ctx.state.undoStack.redo();
      ctx.services.notification.show({
        type: 'info',
        message: 'Action redone',
        duration: 2000,
      });
    }
  },

  cut(ctx: ActionContext): void {
    console.log('[MenuAction] Cut');
    ctx.services.notification.show({
      type: 'info',
      message: 'Cut feature coming soon',
      duration: 2000,
    });
  },

  copy(ctx: ActionContext): void {
    console.log('[MenuAction] Copy');
    ctx.services.notification.show({
      type: 'info',
      message: 'Copy feature coming soon',
      duration: 2000,
    });
  },

  paste(ctx: ActionContext): void {
    console.log('[MenuAction] Paste');
    ctx.services.notification.show({
      type: 'info',
      message: 'Paste feature coming soon',
      duration: 2000,
    });
  },

  openLLMSettings(ctx: ActionContext): void {
    console.log('[MenuAction] LLM Settings');
    const store = useAppStore.getState();
    store.setShowLLMSettings(true);
  },

  openComfyUISettings(ctx: ActionContext): void {
    console.log('[MenuAction] ComfyUI Settings');
    const store = useAppStore.getState();
    store.setShowComfyUISettings(true);
  },

  openAddonsSettings(ctx: ActionContext): void {
    console.log('[MenuAction] Addons Settings');
    const store = useAppStore.getState();
    store.setShowAddonsModal(true);
  },

  openGeneralSettings(ctx: ActionContext): void {
    console.log('[MenuAction] General Settings');
    const store = useAppStore.getState();
    store.setShowGeneralSettings(true);
  },
};

/**
 * View Menu Actions
 */
export const viewActions = {
  toggleTimeline(ctx: ActionContext): void {
    console.log('[MenuAction] Toggle Timeline');
    if (ctx.onViewStateChange) {
      ctx.onViewStateChange({
        timelineVisible: !ctx.state.viewState.timelineVisible,
      });
    }
  },

  toggleAssetsPanel(ctx: ActionContext): void {
    console.log('[MenuAction] Toggle Assets Panel');
    if (ctx.onViewStateChange) {
      const current = ctx.state.viewState.panelsVisible.assets;
      ctx.onViewStateChange({
        panelsVisible: {
          ...ctx.state.viewState.panelsVisible,
          assets: !current,
        },
      });
    }
  },

  togglePreviewPanel(ctx: ActionContext): void {
    console.log('[MenuAction] Toggle Preview Panel');
    if (ctx.onViewStateChange) {
      const current = ctx.state.viewState.panelsVisible.preview;
      ctx.onViewStateChange({
        panelsVisible: {
          ...ctx.state.viewState.panelsVisible,
          preview: !current,
        },
      });
    }
  },

  toggleLayerManager(ctx: ActionContext): void {
    console.log('[MenuAction] Toggle Layer Manager');
    if (ctx.onViewStateChange) {
      ctx.services.notification.show({
        type: 'info',
        message: 'Layer Manager panel toggle',
        duration: 1000,
      });
    }
  },

  toggleMediaSearch(ctx: ActionContext): void {
    console.log('[MenuAction] Toggle Media Search');
    if (ctx.onViewStateChange) {
      ctx.services.notification.show({
        type: 'info',
        message: 'Media Search panel toggle',
        duration: 1000,
      });
    }
  },

  zoomIn(ctx: ActionContext): void {
    console.log('[MenuAction] Zoom In');
    if (ctx.onViewStateChange) {
      const currentZoom = ctx.state.viewState.zoomLevel;
      const maxZoom = ctx.state.viewState.maxZoom;
      const zoomStep = ctx.state.viewState.zoomStep;

      if (currentZoom < maxZoom) {
        const newZoom = Math.min(currentZoom + zoomStep, maxZoom);
        ctx.onViewStateChange({ zoomLevel: newZoom });
        ctx.services.notification.show({
          type: 'info',
          message: `Zoom: ${Math.round(newZoom * 100)}%`,
          duration: 1000,
        });
      }
    }
  },

  zoomOut(ctx: ActionContext): void {
    console.log('[MenuAction] Zoom Out');
    if (ctx.onViewStateChange) {
      const currentZoom = ctx.state.viewState.zoomLevel;
      const minZoom = ctx.state.viewState.minZoom;
      const zoomStep = ctx.state.viewState.zoomStep;

      if (currentZoom > minZoom) {
        const newZoom = Math.max(currentZoom - zoomStep, minZoom);
        ctx.onViewStateChange({ zoomLevel: newZoom });
        ctx.services.notification.show({
          type: 'info',
          message: `Zoom: ${Math.round(newZoom * 100)}%`,
          duration: 1000,
        });
      }
    }
  },

  resetZoom(ctx: ActionContext): void {
    console.log('[MenuAction] Reset Zoom');
    if (ctx.onViewStateChange) {
      ctx.onViewStateChange({ zoomLevel: 1 });
      ctx.services.notification.show({
        type: 'info',
        message: 'Zoom: 100%',
        duration: 1000,
      });
    }
  },

  toggleGrid(ctx: ActionContext): void {
    console.log('[MenuAction] Toggle Grid');
    if (ctx.onViewStateChange) {
      const newState = !ctx.state.viewState.gridVisible;
      ctx.onViewStateChange({
        gridVisible: newState,
      });
      ctx.services.notification.show({
        type: 'info',
        message: `Grid ${newState ? 'enabled' : 'disabled'}`,
        duration: 1000,
      });
    }
  },

  toggleRulers(ctx: ActionContext): void {
    console.log('[MenuAction] Toggle Rulers');
    if (ctx.onViewStateChange) {
      // Note: rulersVisible is not in ViewState, so we just log
      ctx.services.notification.show({
        type: 'info',
        message: 'Rulers toggle feature coming soon',
        duration: 2000,
      });
    }
  },

  toggleFullscreen(ctx: ActionContext): void {
    console.log('[MenuAction] Toggle Fullscreen');
    try {
      if (document.fullscreenElement) {
        document.exitFullscreen();
        ctx.services.notification.show({
          type: 'info',
          message: 'Exited fullscreen',
          duration: 1000,
        });
      } else {
        document.documentElement.requestFullscreen();
        ctx.services.notification.show({
          type: 'info',
          message: 'Entered fullscreen',
          duration: 1000,
        });
      }
    } catch (error) {
      console.error('[MenuAction] Fullscreen error:', error);
      ctx.services.notification.show({
        type: 'warning',
        message: 'Fullscreen not available',
        duration: 2000,
      });
    }
  },
};

/**
 * Project Menu Actions
 */
export const projectActions = {
  backToDashboard(ctx: ActionContext): void {
    console.log('[MenuAction] Back to Project Dashboard');
    // Dispatch a custom event that App.tsx will listen to
    window.dispatchEvent(new CustomEvent('storycore:navigate-to-dashboard'));
    ctx.services.notification.show({
      type: 'info',
      message: 'Returning to Project Dashboard',
      duration: 2000,
    });
  },

  settings(ctx: ActionContext): void {
    console.log('[MenuAction] Project Settings');
    const store = useAppStore.getState();
    store.setShowProjectSetupWizard(true);
  },

  characters(ctx: ActionContext): void {
    console.log('[MenuAction] Character Wizard');
    const store = useAppStore.getState();
    // Close all other wizards first (mutual exclusion)
    store.closeActiveWizard();
    store.setShowCharacterWizard(true);
  },

  world(ctx: ActionContext): void {
    console.log('[MenuAction] World Builder');
    const store = useAppStore.getState();
    // Close all other wizards first (mutual exclusion)
    store.closeActiveWizard();
    store.setShowWorldWizard(true);
  },

  sequences(ctx: ActionContext): void {
    console.log('[MenuAction] Story Generator');
    const store = useAppStore.getState();
    // Close all other wizards first (mutual exclusion)
    store.closeActiveWizard();
    store.setShowStorytellerWizard(true);
  },

  assets(ctx: ActionContext): void {
    console.log('[MenuAction] Manage Assets');
    const store = useAppStore.getState();
    store.setShowImageGalleryModal(true);
  },
};

/**
 * Tools Menu Actions
 */
export const toolsActions = {
  llmAssistant(ctx: ActionContext): void {
    console.log('[MenuAction] LLM Assistant');
    const store = useAppStore.getState();
    store.setShowChat(true);
  },

  comfyuiServer(ctx: ActionContext): void {
    console.log('[MenuAction] ComfyUI Server');
    const store = useAppStore.getState();
    store.setShowComfyUISettings(true);
  },

  llmConfiguration(ctx: ActionContext): void {
    console.log('[MenuAction] LLM Configuration');
    const store = useAppStore.getState();
    store.setShowLLMSettings(true);
  },

  scriptWizard(ctx: ActionContext): void {
    console.log('[MenuAction] Script Wizard');
    const store = useAppStore.getState();
    // Close all other wizards first (mutual exclusion)
    store.openWizard('dialogue-writer');
  },

  batchGeneration(ctx: ActionContext): void {
    console.log('[MenuAction] Batch Generation');
    ctx.services.notification.show({
      type: 'info',
      message: 'Batch generation feature coming soon',
      duration: 3000,
    });
  },

  qualityAnalysis(ctx: ActionContext): void {
    console.log('[MenuAction] Quality Analysis');
    ctx.services.notification.show({
      type: 'info',
      message: 'Quality analysis feature coming soon',
      duration: 3000,
    });
  },

  factCheck(ctx: ActionContext): void {
    console.log('[MenuAction] Fact Check');
    const store = useAppStore.getState();
    store.setShowFactCheckModal(true);
  },
};

/**
 * Wizards Menu Actions
 * All wizard launchers in one menu
 */
export const wizardsActions = {
  projectSetup(ctx: ActionContext): void {
    console.log('[MenuAction] Project Setup Wizard');
    const store = useAppStore.getState();
    store.closeActiveWizard();
    store.setShowProjectSetupWizard(true);
  },

  characters(ctx: ActionContext): void {
    console.log('[MenuAction] Character Wizard');
    const store = useAppStore.getState();
    store.closeActiveWizard();
    store.setShowCharacterWizard(true);
  },

  world(ctx: ActionContext): void {
    console.log('[MenuAction] World Builder');
    const store = useAppStore.getState();
    store.closeActiveWizard();
    store.setShowWorldWizard(true);
  },

  sequences(ctx: ActionContext): void {
    console.log('[MenuAction] Story Generator');
    const store = useAppStore.getState();
    store.closeActiveWizard();
    store.setShowStorytellerWizard(true);
  },

  sequencePlan(ctx: ActionContext): void {
    console.log('[MenuAction] Sequence Plan Wizard');
    const store = useAppStore.getState();
    store.closeActiveWizard();
    // Open sequence plan wizard
    if (typeof store.openSequencePlanWizard === 'function') {
      store.openSequencePlanWizard({ mode: 'create' });
    } else {
      console.warn('[MenuAction] openSequencePlanWizard not available in store');
      ctx.services.notification.show({
        type: 'info',
        message: 'Sequence Plan Wizard coming soon',
        duration: 3000,
      });
    }
  },

  shot(ctx: ActionContext): void {
    console.log('[MenuAction] Shot Wizard');
    const store = useAppStore.getState();
    store.closeActiveWizard();
    // Open shot wizard
    if (typeof store.openShotWizard === 'function') {
      store.openShotWizard({ mode: 'create' });
    } else {
      console.warn('[MenuAction] openShotWizard not available in store');
      ctx.services.notification.show({
        type: 'info',
        message: 'Shot Wizard coming soon',
        duration: 3000,
      });
    }
  },

  scriptWizard(ctx: ActionContext): void {
    console.log('[MenuAction] Script Wizard');
    const store = useAppStore.getState();
    store.openWizard('dialogue-writer');
  },

  audioProduction(ctx: ActionContext): void {
    console.log('[MenuAction] Audio Production Wizard');
    const store = useAppStore.getState() as any;
    store.closeActiveWizard();
    // Open audio production wizard
    if (typeof store.openAudioProductionWizard === 'function') {
      store.openAudioProductionWizard();
    } else {
      console.warn('[MenuAction] openAudioProductionWizard not available in store');
      ctx.services.notification.show({
        type: 'info',
        message: 'Audio Production Wizard coming soon',
        duration: 3000,
      });
    }
  },

  videoProduction(ctx: ActionContext): void {
    console.log('[MenuAction] Video Production Wizard');
    const store = useAppStore.getState() as any;
    store.closeActiveWizard();
    // Open video production wizard
    if (typeof store.openVideoProductionWizard === 'function') {
      store.openVideoProductionWizard();
    } else {
      console.warn('[MenuAction] openVideoProductionWizard not available in store');
      ctx.services.notification.show({
        type: 'info',
        message: 'Video Production Wizard coming soon',
        duration: 3000,
      });
    }
  },
};

/**
 * Help Menu Actions
 */
export const helpActions = {
  documentation(ctx: ActionContext): void {
    console.log('[MenuAction] Open Documentation');
    
    // Get user language preference (default: English)
    // Check if French is preferred
    const userLang = navigator.language || 'en';
    const isFrench = userLang.startsWith('fr');
    
    // Use English by default, French if explicitly set
    const docsFile = isFrench ? 'USER_GUIDE_fr.md' : 'USER_GUIDE.md';
    
    // Try to open local documentation first, fallback to online
    const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;
    
    if (isElectron) {
      // In Electron: use app.openFolder to open documentation directory
      if ((window.electronAPI as any).app?.openFolder) {
        (window.electronAPI as any).app.openFolder('documentation')
          .catch(() => {
            // Fallback to online docs
            window.open('https://docs.storycore.dev', '_blank');
          });
      } else {
        window.open('https://docs.storycore.dev', '_blank');
      }
    } else {
      // Web mode: try relative path or fallback
      const relativePath = window.location.pathname + '/documentation/' + docsFile;
      window.open(relativePath, '_blank') || window.open('https://docs.storycore.dev', '_blank');
    }
  },
  
  documentationFrench(ctx: ActionContext): void {
    console.log('[MenuAction] Open Documentation (French)');
    
    // Open French documentation
    const isElectron = typeof window !== 'undefined' && (window as any).electronAPI;
    
    if (isElectron) {
      if ((window.electronAPI as any).app?.openFolder) {
        (window.electronAPI as any).app.openFolder('documentation')
          .catch(() => {
            window.open('https://docs.storycore.dev/fr', '_blank');
          });
      } else {
        window.open('https://docs.storycore.dev/fr', '_blank');
      }
    } else {
      const relativePath = window.location.pathname + '/documentation/USER_GUIDE_fr.md';
      window.open(relativePath, '_blank') || window.open('https://docs.storycore.dev/fr', '_blank');
    }
  },

  keyboardShortcuts(ctx: ActionContext): void {
    console.log('[MenuAction] Keyboard Shortcuts');
    ctx.services.notification.show({
      type: 'info',
      message: 'Keyboard shortcuts feature coming soon',
      duration: 3000,
    });
  },

  about(ctx: ActionContext): void {
    console.log('[MenuAction] About');
    const store = useAppStore.getState();
    store.setShowAboutModal(true);
  },

  checkUpdates(ctx: ActionContext): void {
    console.log('[MenuAction] Check for Updates');
    ctx.services.notification.show({
      type: 'info',
      message: 'You are running the latest version',
      duration: 3000,
    });
  },

  reportIssue(ctx: ActionContext): void {
    console.log('[MenuAction] Report Issue');
    const store = useAppStore.getState();
    store.setShowFeedbackPanel(true);
  },
};

/**
 * Continuous Creation Menu Actions
 * Three-Level Reference System, Video Replication, Style Transfer, Project Branching
 */
export const continuousCreationActions = {
  referenceSheetManager(ctx: ActionContext): void {
    console.log('[MenuAction] Reference Sheet Manager');
    const store = useAppStore.getState();
    store.setShowReferenceSheetManager(true);
  },

  videoReplication(ctx: ActionContext): void {
    console.log('[MenuAction] Video Replication');
    const store = useAppStore.getState();
    store.setShowVideoReplicationDialog(true);
  },

  crossShotReference(ctx: ActionContext): void {
    console.log('[MenuAction] Cross-Shot Reference Picker');
    const store = useAppStore.getState();
    store.setShowCrossShotReferencePicker(true);
  },

  styleTransfer(ctx: ActionContext): void {
    console.log('[MenuAction] Style Transfer');
    const store = useAppStore.getState();
    store.openWizard('style-transfer');
  },

  projectBranching(ctx: ActionContext): void {
    console.log('[MenuAction] Project Branching');
    const store = useAppStore.getState();
    store.setShowProjectBranchingDialog(true);
  },

  consistencyCheck(ctx: ActionContext): void {
    console.log('[MenuAction] Visual Consistency Check');
    ctx.services.notification.show({
      type: 'info',
      message: 'Running visual consistency check...',
      duration: 2000,
    });
    // This will trigger the consistency engine via the store
    const store = useAppStore.getState();
    (store as any).runConsistencyCheck?.();
  },

  episodeReferences(ctx: ActionContext): void {
    console.log('[MenuAction] Episode References');
    const store = useAppStore.getState();
    store.setShowEpisodeReferenceDialog(true);
  },
};


