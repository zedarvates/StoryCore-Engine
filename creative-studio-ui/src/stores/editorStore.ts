/**
 * Editor Store - Zustand store for editor-wizard-integration feature
 * 
 * This store manages:
 * - Project state (currentProject, projectPath)
 * - Wizard state (activeWizard, wizardHistory)
 * - Asset state (assets, selectedAssetId)
 * - Shot state (shots, selectedShotId)
 * 
 * Integrates with:
 * - WizardService for wizard execution
 * - AssetService for asset import
 * - ProjectService for project data operations
 * 
 * Requirements: All requirements - state management foundation
 */

import { create } from 'zustand';
import type { Shot } from '../types';
import type {
  ProjectData,
  ShotInput,
} from '../types/project';
import type { AssetMetadata, ImportResult } from '../types/asset';
import type {
  WizardOutput,
  CharacterWizardInput,
  SceneGeneratorInput,
  StoryboardInput,
  DialogueInput,
  WorldBuildingInput,
  StyleTransferInput,
  ConnectionStatus,
} from '../services/wizard/types';
import { WizardService } from '../services/wizard/WizardService';
import { AssetService } from '../services/assets/AssetService';
import { ProjectService } from '../services/project/ProjectService';

/**
 * Wizard state interface
 */
interface WizardState {
  wizardId: string;
  currentStep: number;
  totalSteps: number;
  formData: Record<string, unknown>;
  connectionStatus: {
    ollama: ConnectionStatus | null;
    comfyui: ConnectionStatus | null;
  };
  generationStatus: {
    inProgress: boolean;
    progress: number;
    stage: string;
    error?: string;
  };
  preservedData?: {
    timestamp: number; // timestamp in ms
    data: Record<string, unknown>;
  };
}

/**
 * Editor store state interface
 */
interface EditorStore {
  // Project state
  currentProject: ProjectData | null;
  projectPath: string | null;

  // Wizard state
  activeWizard: WizardState | null;
  wizardHistory: WizardState[];

  // Asset state
  assets: AssetMetadata[];
  selectedAssetId: string | null;

  // Shot state
  shots: Shot[];
  selectedShotId: string | null;

  // Service instances
  wizardService: WizardService;
  assetService: AssetService;
  projectService: ProjectService;

  // Project actions
  loadProject: (path: string) => Promise<void>;
  saveProject: () => Promise<void>;
  setProjectPath: (path: string | null) => void;

  // Wizard actions
  openWizard: (wizardId: string, totalSteps: number) => void;
  closeWizard: () => void;
  updateWizardState: (updates: Partial<WizardState>) => void;
  setWizardStep: (step: number) => void;
  setWizardFormData: (data: Record<string, unknown>) => void;
  updateWizardConnectionStatus: (service: 'ollama' | 'comfyui', status: ConnectionStatus) => void;
  setWizardGenerationStatus: (status: Partial<WizardState['generationStatus']>) => void;
  completeWizard: (output: WizardOutput) => Promise<void>;
  preserveWizardSession: () => void;
  restoreWizardSession: (wizardId: string) => boolean;

  // Wizard execution actions
  executeCharacterWizard: (input: CharacterWizardInput) => Promise<WizardOutput>;
  executeSceneGenerator: (input: SceneGeneratorInput) => Promise<WizardOutput>;
  executeStoryboardCreator: (input: StoryboardInput) => Promise<WizardOutput>;
  executeDialogueWriter: (input: DialogueInput) => Promise<WizardOutput>;
  executeWorldBuilder: (input: WorldBuildingInput) => Promise<WizardOutput>;
  executeStyleTransfer: (input: StyleTransferInput) => Promise<WizardOutput>;

  // Asset actions
  importAssets: (files: File[], onProgress?: (current: number, total: number, filename: string) => void) => Promise<ImportResult[]>;
  selectAsset: (assetId: string | null) => void;
  refreshAssets: () => Promise<void>;

  // Shot actions
  createShot: (shotData: ShotInput) => Promise<Shot>;
  updateShot: (shotId: string, updates: Partial<Shot>) => Promise<void>;
  deleteShot: (shotId: string) => Promise<void>;
  selectShot: (shotId: string | null) => void;
  reorderShots: (shotIds: string[]) => Promise<void>;
  refreshShots: () => Promise<void>;

  // Connection check actions
  checkOllamaConnection: () => Promise<ConnectionStatus>;
  checkComfyUIConnection: () => Promise<ConnectionStatus>;
  checkAllConnections: () => Promise<{ ollama: ConnectionStatus; comfyui: ConnectionStatus; allConnected: boolean }>;
}

/**
 * Create editor store with Zustand
 */
export const useEditorStore = create<EditorStore>((set, get) => ({
  // Initial state
  currentProject: null,
  projectPath: null,
  activeWizard: null,
  wizardHistory: [],
  assets: [],
  selectedAssetId: null,
  shots: [],
  selectedShotId: null,

  // Service instances
  wizardService: new WizardService(),
  assetService: new AssetService(),
  projectService: new ProjectService(),

  // ============================================================================
  // Project Actions
  // ============================================================================

  loadProject: async (path: string) => {
    try {
      const { projectService } = get();
      const project = await projectService.loadProject(path);

      set({
        currentProject: project,
        projectPath: path,
        shots: project.storyboard || [],
        assets: project.assets || [],
      });

    } catch (error) {
      console.error('Failed to load project:', error);
      throw error;
    }
  },

  saveProject: async () => {
    try {
      const { currentProject, projectPath, projectService } = get();

      if (!currentProject || !projectPath) {
        throw new Error('No project loaded');
      }

      await projectService.saveProject(projectPath, currentProject);
    } catch (error) {
      console.error('Failed to save project:', error);
      throw error;
    }
  },

  setProjectPath: (path: string | null) => {
    set({ projectPath: path });
  },

  // ============================================================================
  // Wizard Actions
  // ============================================================================

  openWizard: (wizardId: string, totalSteps: number) => {
    // Check for preserved session
    const preserved = get().restoreWizardSession(wizardId);

    if (!preserved) {
      set({
        activeWizard: {
          wizardId,
          currentStep: 0,
          totalSteps,
          formData: {},
          connectionStatus: {
            ollama: null,
            comfyui: null,
          },
          generationStatus: {
            inProgress: false,
            progress: 0,
            stage: '',
          },
        },
      });
    }

  },

  closeWizard: () => {
    const { activeWizard } = get();

    if (activeWizard) {
      // Preserve session before closing
      get().preserveWizardSession();

      // Add to history
      set((state) => ({
        wizardHistory: [...state.wizardHistory, activeWizard],
        activeWizard: null,
      }));

    }
  },

  updateWizardState: (updates: Partial<WizardState>) => {
    set((state) => ({
      activeWizard: state.activeWizard
        ? { ...state.activeWizard, ...updates }
        : null,
    }));
  },

  setWizardStep: (step: number) => {
    set((state) => ({
      activeWizard: state.activeWizard
        ? { ...state.activeWizard, currentStep: step }
        : null,
    }));
  },

  setWizardFormData: (data: Record<string, unknown>) => {
    set((state) => ({
      activeWizard: state.activeWizard
        ? { ...state.activeWizard, formData: data }
        : null,
    }));
  },

  updateWizardConnectionStatus: (service: 'ollama' | 'comfyui', status: ConnectionStatus) => {
    set((state) => ({
      activeWizard: state.activeWizard
        ? {
          ...state.activeWizard,
          connectionStatus: {
            ...state.activeWizard.connectionStatus,
            [service]: status,
          },
        }
        : null,
    }));
  },

  setWizardGenerationStatus: (status: Partial<WizardState['generationStatus']>) => {
    set((state) => ({
      activeWizard: state.activeWizard
        ? {
          ...state.activeWizard,
          generationStatus: {
            ...state.activeWizard.generationStatus,
            ...status,
          },
        }
        : null,
    }));
  },

  completeWizard: async (output: WizardOutput) => {
    try {
      const { projectPath, projectService, currentProject } = get();

      if (!projectPath || !currentProject) {
        throw new Error('No project loaded');
      }

      // Save wizard output files
      // This would typically involve writing files to the project directory
      // For now, we'll update the project data structure

      // Update project based on wizard type
      const data = output.data as any;
      switch (output.type) {
        case 'character':
          // Add character to project
          if (!currentProject.characters) {
            currentProject.characters = [];
          }
          currentProject.characters.push({
            id: data.id,
            name: data.name,
            reference_image_path: output.files[0]?.path || '',
            created_at: data.created_at,
          });
          break;

        case 'scene':
          // Add scene and shots to project
          if (!currentProject.scenes) {
            currentProject.scenes = [];
          }
          currentProject.scenes.push(data);

          // Add shots to storyboard
          if (data.shots && data.shots.length > 0) {
            await projectService.addShotsToStoryboard(projectPath, data.shots);
          }
          break;

        case 'storyboard':
          // Add or replace shots based on mode
          if (data.mode === 'replace') {
            currentProject.storyboard = data.shots;
          } else {
            await projectService.addShotsToStoryboard(projectPath, data.shots);
          }
          break;

        case 'dialogue':
          // Update shots with dialogue tracks
          // This would typically update specific shots
          break;

        case 'world':
          // Set world definition
          currentProject.world = data;
          break;

        case 'style':
          // Update shot with styled image
          await projectService.updateShot(projectPath, data.original_shot_id, {
            image: output.files[0]?.path,
          });
          break;
      }

      // Update capabilities
      await projectService.updateCapabilities(projectPath, {
        wizard_generation: true,
      });

      // Update generation status
      await projectService.updateGenerationStatus(projectPath, {
        wizard: 'done',
      });

      // Refresh state
      await get().loadProject(projectPath);

      // Close wizard
      get().closeWizard();

    } catch (error) {
      console.error('Failed to complete wizard:', error);
      throw error;
    }
  },

  preserveWizardSession: () => {
    const { activeWizard } = get();

    if (activeWizard) {
      const preservedData = {
        timestamp: Date.now(),
        data: activeWizard.formData,
      };

      // Store in localStorage with 24-hour expiration
      const storageKey = `wizard_session_${activeWizard.wizardId}`;
      localStorage.setItem(storageKey, JSON.stringify(preservedData));

    }
  },

  restoreWizardSession: (wizardId: string): boolean => {
    const storageKey = `wizard_session_${wizardId}`;
    const stored = localStorage.getItem(storageKey);

    if (!stored) {
      return false;
    }

    try {
      const preservedData = JSON.parse(stored);
      const timestamp = preservedData.timestamp;
      const now = Date.now();
      const hoursDiff = (now - timestamp) / (1000 * 60 * 60);

      // Check if session is within 24 hours
      if (hoursDiff > 24) {
        localStorage.removeItem(storageKey);
        return false;
      }

      // Restore wizard state
      set({
        activeWizard: {
          wizardId,
          currentStep: 0,
          totalSteps: 0, // Will be set by wizard component
          formData: preservedData.data,
          connectionStatus: {
            ollama: null,
            comfyui: null,
          },
          generationStatus: {
            inProgress: false,
            progress: 0,
            stage: '',
          },
          preservedData,
        },
      });

      return true;
    } catch (error) {
      console.error('Failed to restore wizard session:', error);
      localStorage.removeItem(storageKey);
      return false;
    }
  },

  // ============================================================================
  // Wizard Execution Actions
  // ============================================================================

  executeCharacterWizard: async (input: CharacterWizardInput) => {
    const { wizardService } = get();
    return await wizardService.executeCharacterWizard(input);
  },

  executeSceneGenerator: async (input: SceneGeneratorInput) => {
    const { wizardService } = get();
    return await wizardService.executeSceneGenerator(input);
  },

  executeStoryboardCreator: async (input: StoryboardInput) => {
    const { wizardService } = get();
    return await wizardService.executeStoryboardCreator(input);
  },

  executeDialogueWriter: async (input: DialogueInput) => {
    const { wizardService } = get();
    return await wizardService.executeDialogueWriter(input);
  },

  executeWorldBuilder: async (input: WorldBuildingInput) => {
    const { wizardService } = get();
    return await wizardService.executeWorldBuilder(input);
  },

  executeStyleTransfer: async (input: StyleTransferInput) => {
    const { wizardService } = get();
    return await wizardService.executeStyleTransfer(input);
  },

  // ============================================================================
  // Asset Actions
  // ============================================================================

  importAssets: async (files: File[], onProgress?: (current: number, total: number, filename: string) => void) => {
    try {
      const { assetService, projectPath } = get();

      if (!projectPath) {
        throw new Error('No project loaded');
      }

      const results = await assetService.importAssets(files, projectPath, onProgress);

      // Refresh assets
      await get().refreshAssets();

      return results;
    } catch (error) {
      console.error('Failed to import assets:', error);
      throw error;
    }
  },

  selectAsset: (assetId: string | null) => {
    set({ selectedAssetId: assetId });
  },

  refreshAssets: async () => {
    try {
      const { assetService, projectPath } = get();

      if (!projectPath) {
        return;
      }

      const assets = await assetService.getAllAssets(projectPath);
      set({ assets });
    } catch (error) {
      console.error('Failed to refresh assets:', error);
    }
  },

  // ============================================================================
  // Shot Actions
  // ============================================================================

  createShot: async (shotData: ShotInput) => {
    try {
      const { projectService, projectPath, currentProject } = get();

      if (!currentProject) {
        throw new Error('No project loaded');
      }

      // If we have a projectPath, use the service to persist
      if (projectPath) {
        const shot = await projectService.createShot(projectPath, shotData);

        // Refresh shots
        await get().refreshShots();

        // Auto-select new shot
        set({ selectedShotId: shot.id });

        return shot;
      } else {
        // For in-memory projects (JSON-loaded), create shot directly
        const shot: Shot = {
          id: crypto.randomUUID(),
          title: shotData.title || `Shot ${(currentProject.storyboard?.length || 0) + 1}`,
          position: shotData.number || (currentProject.storyboard?.length || 0) + 1,
          description: shotData.description || '',
          duration: shotData.duration || 3,
          effects: [],
          audioTracks: [],
          textLayers: [],
          animations: [],

        };

        // Update current project
        const updatedProject = {
          ...currentProject,
          storyboard: [...(currentProject.storyboard || []), shot],
        };

        set({
          currentProject: updatedProject,
          shots: updatedProject.storyboard || [],
          selectedShotId: shot.id,
        });

        return shot;
      }
    } catch (error) {
      console.error('Failed to create shot:', error);
      throw error;
    }
  },

  updateShot: async (shotId: string, updates: Partial<Shot>) => {
    try {
      const { projectService, projectPath, currentProject, shots } = get();

      if (!currentProject) {
        throw new Error('No project loaded');
      }

      // If we have a projectPath, use the service to persist
      if (projectPath) {
        // Find the shot to get its sequence ID
        const shot = shots.find(s => s.id === shotId);

        if (shot && (shot as any).sequencePlanId) {
          // This is a ProductionShot with sequence information
          const sequenceId = (shot as any).sequencePlanId;

          // Use the new sequence IPC method to update the shot in its sequence file
          if (window.electronAPI?.sequence) {
            try {
              await window.electronAPI.sequence.updateShot(projectPath, sequenceId, shotId, updates);
            } catch (error) {
              console.warn('Failed to update shot in sequence file, falling back to project service:', error);
              await projectService.updateShot(projectPath, shotId, updates);
            }
          } else {
            // Fallback to old method if sequence API not available
            await projectService.updateShot(projectPath, shotId, updates);
          }
        } else {
          // Regular shot without sequence information, use old method
          await projectService.updateShot(projectPath, shotId, updates);
        }

        // Refresh shots
        await get().refreshShots();
      } else {
        // For in-memory projects, update shot directly
        const updatedStoryboard = (currentProject.storyboard || []).map(shot =>
          shot.id === shotId ? { ...shot, ...updates } : shot
        );

        const updatedProject = {
          ...currentProject,
          storyboard: updatedStoryboard,
        };

        set({
          currentProject: updatedProject,
          shots: updatedStoryboard,
        });

      }
    } catch (error) {
      console.error('Failed to update shot:', error);
      throw error;
    }
  },

  deleteShot: async (shotId: string) => {
    try {
      const { projectService, projectPath, currentProject, selectedShotId } = get();

      if (!currentProject) {
        throw new Error('No project loaded');
      }

      // If we have a projectPath, use the service to persist
      if (projectPath) {
        await projectService.deleteShot(projectPath, shotId);

        // Refresh shots
        await get().refreshShots();
      } else {
        // For in-memory projects, delete shot directly
        const updatedStoryboard = (currentProject.storyboard || []).filter(
          shot => shot.id !== shotId
        );

        const updatedProject = {
          ...currentProject,
          storyboard: updatedStoryboard,
        };

        set({
          currentProject: updatedProject,
          shots: updatedStoryboard,
          selectedShotId: selectedShotId === shotId ? null : selectedShotId,
        });

      }
    } catch (error) {
      console.error('Failed to delete shot:', error);
      throw error;
    }
  },

  selectShot: (shotId: string | null) => {
    set({ selectedShotId: shotId });
  },

  reorderShots: async (shotIds: string[]) => {
    try {
      const { projectService, projectPath, currentProject } = get();

      if (!currentProject) {
        throw new Error('No project loaded');
      }

      // If we have a projectPath, use the service to persist
      if (projectPath) {
        await projectService.reorderShots(projectPath, shotIds);

        // Refresh shots
        await get().refreshShots();
      } else {
        // For in-memory projects, reorder shots directly
        const shotMap = new Map((currentProject.storyboard || []).map(shot => [shot.id, shot]));
        const reorderedStoryboard = shotIds
          .map(id => shotMap.get(id))
          .filter((shot): shot is Shot => shot !== undefined);

        const updatedProject = {
          ...currentProject,
          storyboard: reorderedStoryboard,
        };

        set({
          currentProject: updatedProject,
          shots: reorderedStoryboard,
        });

      }
    } catch (error) {
      console.error('Failed to reorder shots:', error);
      throw error;
    }
  },

  refreshShots: async () => {
    try {
      const { projectPath } = get();

      if (!projectPath) {
        return;
      }

      // Reload project to get updated shots
      await get().loadProject(projectPath);
    } catch (error) {
      console.error('Failed to refresh shots:', error);
    }
  },

  // ============================================================================
  // Connection Check Actions
  // ============================================================================

  checkOllamaConnection: async () => {
    const { wizardService } = get();
    return await wizardService.checkOllamaConnection();
  },

  checkComfyUIConnection: async () => {
    const { wizardService } = get();
    return await wizardService.checkComfyUIConnection();
  },

  checkAllConnections: async () => {
    const { wizardService } = get();
    return await wizardService.checkAllConnections();
  },
}));

