import { StateCreator } from 'zustand';
import { UnifiedProjectStore, ProjectState } from './types';
import { logger as Logger } from '@/utils/logger';
import { StorageManager } from '@/utils/storageManager';
import { generateId } from '@/utils/idGenerator';
import { alignmentService } from '@/services/alignmentService';
import { alignmentRepairService } from '@/services/alignmentRepairService';
import type { 
  Project, 
  Shot,
  World, 
  Character, 
  Location as ProductionLocation,
  Story,
  StoryObject,
  SequencePlan,
  Asset
} from '@/types';

/**
 * Creates the Project Data Slice for the Unified Project Store
 * Handles project metadata, worlds, characters, and high-level persistence
 */
export const createProjectSlice: StateCreator<
  UnifiedProjectStore,
  [],
  [],
  Partial<UnifiedProjectStore>
> = (set, get) => ({
  // Core Project-Level Data
  project: null,
  assets: [],
  worlds: [],
  characters: [],
  locations: [],
  objects: [],
  stories: [],
  sequencePlans: [],

  // Selection
  selectedWorldId: null,
  
  // Tasks
  taskQueue: [],
  generationStatus: {
    state: 'idle',
    progress: 0,
  },

  // Alignment
  alignmentReport: null,
  isAnalyzingAlignment: false,
  isRefiningAlignment: false,

  // UI Panels
  showChat: false,
  showTaskQueue: false,
  panelSizes: {
    assetLibrary: 20,
    canvas: 55,
    propertiesOrChat: 25,
  },

  // Selection Details
  selectedEffectId: null,
  selectedTextLayerId: null,
  selectedKeyframeId: null,

  /**
   * Actions
   */
  setProject: (project: Project | null) => set((_state) => {
    if (_state.project === project) return _state;

    const characters = project?.characters || [];
    const stories = project?.stories || [];
    const worlds = project?.worlds || [];
    const objects = project?.objects || [];
    const sequencePlans = project?.sequencePlans || project?.metadata?.sequences as SequencePlan[] || [];

    Logger.info(`📦 [ProjectStore] Setting project: ${project?.project_name || 'null'}`);

    return {
      project,
      characters: characters as Character[],
      stories: stories as Story[],
      worlds: worlds as World[],
      objects: objects as StoryObject[],
      sequencePlans: sequencePlans as SequencePlan[],
      locations: project?.locations || [],
      shots: project?.shots || []
    };
  }),

  updateProject: (updates: Partial<Project>) => {
    const prevState = get().project ? { ...get().project } : null;
    
    set((state) => {
      if (!state.project) return { project: null };
      const updatedProject = { ...state.project, ...updates } as Project;

      const newState: Partial<ProjectState> = {
        project: updatedProject,
      };

      if (updates.characters) newState.characters = updates.characters as Character[];
      if (updates.worlds) newState.worlds = updates.worlds as World[];
      if (updates.stories) newState.stories = updates.stories as Story[];
      if (updates.sequencePlans) newState.sequencePlans = updates.sequencePlans as SequencePlan[];
      if (updates.objects) newState.objects = updates.objects as StoryObject[];
      if (updates.locations) newState.locations = updates.locations as ProductionLocation[];
      if (updates.shots) newState.shots = updates.shots as Shot[];

      return newState;
    });

    get().pushHistory({
       id: generateId(),
       timestamp: Date.now(),
       action: `Update Project Metadata`,
       previousState: { project: prevState as Project | null },
       nextState: { project: get().project }
    });
  },

  // Character Actions
  addCharacter: (character) => {
    const previousCharacters = get().characters;
    
    set((state) => {
      const existingIndex = state.characters.findIndex(c => c.character_id === character.character_id);
      let newCharacters;

      if (existingIndex >= 0) {
        Logger.info(`[ProjectStore] Updating character ${character.name}`);
        newCharacters = state.characters.map((c, i) => i === existingIndex ? character : c);
      } else {
        newCharacters = [...state.characters, character];
      }

      const updatedProject = state.project ? { ...state.project, characters: newCharacters } : null;

      // Persist to storage
      if (state.project) {
        StorageManager.setItem(`project-${state.project.project_name}-characters`, JSON.stringify(newCharacters));
      }

      return { characters: newCharacters, project: updatedProject };
    });

    get().pushHistory({
      id: generateId(),
      timestamp: Date.now(),
      action: `Add/Update Character: ${character.name}`,
      previousState: { characters: previousCharacters },
      nextState: { characters: get().characters }
    });
  },

  updateCharacter: (id, updates) => {
    const previousCharacters = get().characters;
    
    set((state) => {
      const updatedCharacters = state.characters.map(c => c.character_id === id ? { ...c, ...updates } : c);
      const updatedProject = state.project ? { ...state.project, characters: updatedCharacters } : null;
      return { characters: updatedCharacters, project: updatedProject };
    });

    get().pushHistory({
      id: generateId(),
      timestamp: Date.now(),
      action: `Update Character: ${id}`,
      previousState: { characters: previousCharacters },
      nextState: { characters: get().characters }
    });
  },

  deleteCharacter: (id) => {
    const previousCharacters = get().characters;
    
    set((state) => {
      const filteredCharacters = state.characters.filter(c => c.character_id !== id);
      const updatedProject = state.project ? { ...state.project, characters: filteredCharacters } : null;
      return { characters: filteredCharacters, project: updatedProject };
    });

    get().pushHistory({
      id: generateId(),
      timestamp: Date.now(),
      action: `Delete Character: ${id}`,
      previousState: { characters: previousCharacters },
      nextState: { characters: get().characters }
    });
  },

  // Task Actions
  addTask: (task) => set((state) => ({ taskQueue: [...state.taskQueue, task].slice(-100) })),
  updateTask: (taskId, updates) => set((state) => ({
    taskQueue: state.taskQueue.map(t => t.id === taskId ? { ...t, ...updates } : t)
  })),
  removeTask: (taskId) => set((state) => ({
    taskQueue: state.taskQueue.filter(t => t.id !== taskId)
  })),
  setGenerationStatus: (status) => set((state) => ({
    generationStatus: { ...state.generationStatus, ...status }
  })),

  /**
   * Promote asset from a specific shot to the project asset library
   */
  promoteAssetFromShot: (shotId: string) => {
    const shot = get().shots.find(s => s.id === shotId);
    if (!shot || (!shot.result_url && !shot.generated_image_url)) {
      Logger.warn(`[ProjectStore] Cannot promote asset from shot ${shotId}: No result URL found`);
      return;
    }

    const previousAssets = get().assets;
    const assetUrl = (shot.result_url || shot.generated_image_url) as string;
    
    // Check for existing asset to avoid duplicates
    const isDuplicate = previousAssets.some(a => a.url === assetUrl);
    if (isDuplicate) {
      Logger.info(`[ProjectStore] Asset from shot ${shotId} already exists in library`);
      return;
    }

    const newAsset: Asset = {
      id: generateId(),
      name: shot.name || shot.title || `Asset from Shot ${shotId}`,
      type: 'image',
      url: assetUrl,
      source: 'ai-generated',
      createdAt: Date.now(),
      tags: ['promoted', shot.cinematography?.framing || '', shot.cinematography?.lighting || ''].filter(Boolean),
      metadata: {
        shotId: shot.id,
        prompt: shot.prompt,
        style: shot.visualStyle?.styleName,
      }
    };

    set((state) => ({
      assets: [...state.assets, newAsset],
      project: state.project ? { ...state.project, assets: [...state.assets, newAsset] } : state.project
    }));

    Logger.info(`[ProjectStore] Promoted asset from shot ${shotId} to library`);

    get().pushHistory({
       id: generateId(),
       timestamp: Date.now(),
       action: `Promote Asset from Shot: ${shotId}`,
       previousState: { assets: previousAssets },
       nextState: { assets: get().assets }
    });
  },

  /**
   * Promote all shots with successful generations to project library
   */
  promoteAllGeneratedAssets: () => {
    const shots = get().shots;
    const promotableShots = shots.filter(s => s.result_url || s.generated_image_url);
    
    Logger.info(`[ProjectStore] Batch promoting ${promotableShots.length} assets...`);
    promotableShots.forEach(s => get().promoteAssetFromShot(s.id));
  },

  /**
   * Assign a character to a specific shot's composition
   */
  assignCharacterToShot: (shotId: string, characterId: string) => {
    const previousShots = get().shots;
    const shotIndex = previousShots.findIndex(s => s.id === shotId);
    
    if (shotIndex === -1) {
      Logger.warn(`[ProjectStore] Cannot assign character ${characterId}: Shot ${shotId} not found`);
      return;
    }

    const shot = previousShots[shotIndex];
    const composition = shot.composition || { characterIds: [], characterPositions: [] };
    
    // Avoid duplicates
    if (composition.characterIds.includes(characterId)) {
      Logger.info(`[ProjectStore] Character ${characterId} already assigned to shot ${shotId}`);
      return;
    }

    const updatedShot: Shot = {
      ...shot,
      composition: {
        ...composition,
        characterIds: [...composition.characterIds, characterId],
        characterPositions: [
          ...composition.characterPositions,
          { characterId, position: 'center' } // Default position
        ]
      }
    };

    const newShots = [...previousShots];
    newShots[shotIndex] = updatedShot;

    set((state) => ({
      shots: newShots,
      project: state.project ? { ...state.project, shots: newShots } : state.project
    }));

    get().pushHistory({
       id: generateId(),
       timestamp: Date.now(),
       action: `Assign Character to Shot: ${shotId}`,
       previousState: { shots: previousShots },
       nextState: { shots: get().shots }
    });
  },

  /**
   * Remove a character from a shot's composition
   */
  removeCharacterFromShot: (shotId: string, characterId: string) => {
    const previousShots = get().shots;
    const shotIndex = previousShots.findIndex(s => s.id === shotId);
    
    if (shotIndex === -1) return;

    const shot = previousShots[shotIndex];
    if (!shot.composition) return;

    const updatedShot: Shot = {
      ...shot,
      composition: {
        ...shot.composition,
        characterIds: shot.composition.characterIds.filter(id => id !== characterId),
        characterPositions: shot.composition.characterPositions.filter(p => p.characterId !== characterId)
      }
    };

    const newShots = [...previousShots];
    newShots[shotIndex] = updatedShot;

    set((state) => ({
      shots: newShots,
      project: state.project ? { ...state.project, shots: newShots } : state.project
    }));

    get().pushHistory({
       id: generateId(),
       timestamp: Date.now(),
       action: `Remove Character from Shot: ${shotId}`,
       previousState: { shots: previousShots },
       nextState: { shots: get().shots }
    });
  },

  /**
   * Alignment Actions
   */
  generateAlignmentReport: async () => {
    const { project, stories, shots } = get();
    
    if (!project || !stories.length || !shots.length) {
      return {
        total_score: 0,
        summary: "Missing project data for analysis",
        categories: {},
        recommendations: []
      };
    }

    set({ isAnalyzingAlignment: true });
    
    try {
      const report = await alignmentService.generateReport(project, stories, shots);
      set({ alignmentReport: report, isAnalyzingAlignment: false });
      return report;
    } catch (error) {
      set({ isAnalyzingAlignment: false });
      throw error;
    }
  },

  applyAlignmentRepair: async (recommendations: string[]) => {
    const { project, shots } = get();
    if (!project || !shots.length || !recommendations.length) return;

    set({ isRefiningAlignment: true });
    
    try {
      const actions = await alignmentRepairService.planRepairs(project, shots, recommendations);
      
      const previousShots = [...shots];
      
      // Execute each action
      actions.forEach(action => {
        if (action.type === 'updateShot') {
          const payload = action.payload as { id: string, updates: Partial<Shot> };
          if (payload.id && payload.updates) {
            get().updateShot(payload.id, payload.updates, true);
          }
        } else if (action.type === 'deleteShot') {
          const payload = action.payload as { id: string };
          if (payload.id) {
            get().deleteShot(payload.id, true);
          }
        } else if (action.type === 'addShot') {
          const payload = action.payload as { newShot: Shot };
          if (payload.newShot) {
            get().addShot(payload.newShot, true);
          }
        }
      });

      // Update report after repair
      await get().generateAlignmentReport();
      
      get().pushHistory({
        id: generateId(),
        timestamp: Date.now(),
        action: `AI Auto-Repair: ${recommendations.length} recommendations`,
        previousState: { shots: previousShots },
        nextState: { shots: get().shots }
      });

      set({ isRefiningAlignment: false });
    } catch (error) {
      set({ isRefiningAlignment: false });
      throw error;
    }
  }
});
