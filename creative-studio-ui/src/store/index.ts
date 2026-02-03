import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { StorageManager } from '../utils/storageManager';
import { Logger } from '../utils/logger';
import { debounce } from '../utils/debounce';
import type {
  AppState,
  Shot,
  Asset,
  Project,
  GenerationTask,
  PanelSizes,
  HistoryState,
  AudioTrack,
  Effect,
  TextLayer,
  Animation,
  Transition,
  World,
} from '../types';
import type { Character } from '../types/character';
import type { Story, StoryVersion } from '../types/story';
import type { WizardOutput } from '../services/wizard/types';
import { getWizardService } from '../services/wizard/WizardService';
import { eventEmitter, WizardEventType } from '../services/eventEmitter';
import type {
  WorldCreatedPayload,
  WorldUpdatedPayload,
  WorldDeletedPayload,
  WorldSelectedPayload,
  CharacterCreatedPayload,
  CharacterUpdatedPayload,
  CharacterDeletedPayload,
} from '../services/eventEmitter';

// ============================================================================
// Store Actions Interface
// ============================================================================

interface StoreActions {
  // Project actions
  setProject: (project: Project | null) => void;
  updateProject: (updates: Partial<Project>) => void;
  
  // Shot actions
  addShot: (shot: Shot) => void;
  updateShot: (id: string, updates: Partial<Shot>) => void;
  deleteShot: (id: string) => void;
  reorderShots: (shots: Shot[]) => void;
  selectShot: (id: string | null) => void;
  
  // Asset actions
  addAsset: (asset: Asset) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  
  // World actions
  addWorld: (world: World) => void;
  updateWorld: (id: string, updates: Partial<World>) => void;
  deleteWorld: (id: string) => void;
  selectWorld: (id: string | null) => void;
  getWorldById: (id: string) => World | undefined;
  
  // Character actions
  addCharacter: (character: Character) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  getCharacterById: (id: string) => Character | undefined;
  getAllCharacters: () => Character[];
  setCharacters: (characters: Character[]) => void; // Bulk set for project loading
  
  // Story actions
  addStory: (story: Story) => void;
  updateStory: (id: string, updates: Partial<Story>) => void;
  deleteStory: (id: string) => void;
  getStoryById: (id: string) => Story | undefined;
  getAllStories: () => Story[];
  
  // Story version actions
  createVersion: (storyId: string, changes: string) => void;
  getVersionsByStoryId: (storyId: string) => StoryVersion[];
  loadVersion: (versionId: string) => void;
  
  // Wizard integration actions
  completeWizard: (output: WizardOutput, projectPath: string) => Promise<void>;
  
  // Audio track actions
  addAudioTrack: (shotId: string, track: AudioTrack) => void;
  updateAudioTrack: (shotId: string, trackId: string, updates: Partial<AudioTrack>) => void;
  deleteAudioTrack: (shotId: string, trackId: string) => void;
  
  // Effect actions
  addEffect: (shotId: string, effect: Effect) => void;
  updateEffect: (shotId: string, effectId: string, updates: Partial<Effect>) => void;
  deleteEffect: (shotId: string, effectId: string) => void;
  reorderEffects: (shotId: string, effects: Effect[]) => void;
  
  // Text layer actions
  addTextLayer: (shotId: string, layer: TextLayer) => void;
  updateTextLayer: (shotId: string, layerId: string, updates: Partial<TextLayer>) => void;
  deleteTextLayer: (shotId: string, layerId: string) => void;
  
  // Animation actions
  addAnimation: (shotId: string, animation: Animation) => void;
  updateAnimation: (shotId: string, animationId: string, updates: Partial<Animation>) => void;
  deleteAnimation: (shotId: string, animationId: string) => void;
  
  // Transition actions
  setTransition: (shotId: string, transition: Transition | undefined) => void;
  
  // Task queue actions
  addTask: (task: GenerationTask) => void;
  updateTask: (taskId: string, updates: Partial<GenerationTask>) => void;
  removeTask: (taskId: string) => void;
  moveTaskUp: (taskId: string) => void;
  moveTaskDown: (taskId: string) => void;
  reorderTasks: (tasks: GenerationTask[]) => void;
  
  // UI state actions
  setShowChat: (show: boolean) => void;
  setShowTaskQueue: (show: boolean) => void;
  setPanelSizes: (sizes: PanelSizes) => void;
  setCurrentTime: (time: number) => void;
  
  // Playback actions
  play: () => void;
  pause: () => void;
  stop: () => void;
  setPlaybackSpeed: (speed: number) => void;
  
  // Selection actions
  selectEffect: (id: string | null) => void;
  selectTextLayer: (id: string | null) => void;
  selectKeyframe: (id: string | null) => void;
  
  // Undo/Redo actions (will be implemented in next subtask)
  undo: () => void;
  redo: () => void;
  pushHistory: (state: HistoryState) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

// ============================================================================
// Complete Store Type
// ============================================================================

type Store = AppState & StoreActions;

// ============================================================================
// Helper Functions
// ============================================================================

// Update priorities after reordering
function updatePriorities(tasks: GenerationTask[]): GenerationTask[] {
  return tasks.map((task, index) => ({
    ...task,
    priority: index + 1,
  }));
}

// ============================================================================
// Zustand Store
// ============================================================================

export const useStore = create<Store>()(
  devtools(
    persist(
      (set, get) => ({
        // ====================================================================
        // Initial State
        // ====================================================================
        project: null,
        shots: [],
        assets: [],
        worlds: [],
        selectedWorldId: null,
        characters: [],
        stories: [],
        storyVersions: [],
        selectedShotId: null,
        currentTime: 0,
        showChat: false,
        showTaskQueue: false,
        panelSizes: {
          assetLibrary: 20,
          canvas: 55,
          propertiesOrChat: 25,
        },
        taskQueue: [],
        generationStatus: {
          isGenerating: false,
          progress: 0,
        },
        isPlaying: false,
        playbackSpeed: 1,
        history: [],
        historyIndex: -1,
        selectedEffectId: null,
        selectedTextLayerId: null,
        selectedKeyframeId: null,

        // ====================================================================
        // Project Actions
        // ====================================================================
        setProject: (project) => set((state) => {
          // When setting a project, also sync its characters to the store's characters state
          const characters = project?.characters || [];
          Logger.info(`📦 [Store] Setting project with ${characters.length} characters`);
          return { 
            project,
            characters: characters as Character[]
          };
        }),
        
        updateProject: (updates) =>
          set((state) => {
            if (!state.project) return { project: null };
            
            const updatedProject = { ...state.project, ...updates };
            
            // Synchroniser les arrays si le projet a changé
            const newState: Partial<AppState> = {
              project: updatedProject,
            };
            
            // Si les caractères ont changé dans le projet
            if (updates.characters) {
              newState.characters = updates.characters as Character[];
            }
            
            // Si les mondes ont changé dans le projet
            if (updates.worlds) {
              newState.worlds = updates.worlds as World[];
            }
            
            // Si les histoires ont changé dans le projet
            if (updates.stories) {
              newState.stories = updates.stories as Story[];
            }
            
            // Si les shots ont changé dans le projet
            if (updates.shots) {
              newState.shots = updates.shots as Shot[];
            }
            
            return newState;
          }),

        // ====================================================================
        // Shot Actions
        // ====================================================================
        addShot: (shot) =>
          set((state) => ({
            shots: [...state.shots, shot],
          })),

        updateShot: (id, updates) =>
          set((state) => ({
            shots: state.shots.map((shot) =>
              shot.id === id ? { ...shot, ...updates } : shot
            ),
          })),

        deleteShot: (id) =>
          set((state) => ({
            shots: state.shots.filter((shot) => shot.id !== id),
            selectedShotId: state.selectedShotId === id ? null : state.selectedShotId,
          })),

        reorderShots: (shots) => set({ shots }),

        selectShot: (id) => set({ selectedShotId: id }),

        // ====================================================================
        // Asset Actions
        // ====================================================================
        addAsset: (asset) =>
          set((state) => ({
            assets: [...state.assets, asset],
          })),

        updateAsset: (id, updates) =>
          set((state) => ({
            assets: state.assets.map((asset) =>
              asset.id === id ? { ...asset, ...updates } : asset
            ),
          })),

        deleteAsset: (id) =>
          set((state) => ({
            assets: state.assets.filter((asset) => asset.id !== id),
          })),

        // ====================================================================
        // World Actions
        // ====================================================================
        addWorld: (world) =>
          set((state) => {
            const newWorlds = [...state.worlds, world];
            
            // Update project with new world
            const updatedProject = state.project
              ? {
                  ...state.project,
                  worlds: newWorlds,
                  // Auto-select first world if none selected
                  selectedWorldId: state.selectedWorldId || world.id,
                }
              : null;

            // Persist to localStorage
            if (updatedProject) {
              try {
                StorageManager.setItem(
                  `project-${updatedProject.project_name}-worlds`,
                  JSON.stringify(newWorlds)
                );
              } catch (error) {
                Logger.error('Failed to persist worlds to storage:', error);
              }
            }

            // Emit world created event (Requirement: 7.5)
            eventEmitter.emit<WorldCreatedPayload>(WizardEventType.WORLD_CREATED, {
              world,
              projectName: updatedProject?.project_name,
              timestamp: new Date(),
              source: 'store',
            });

            return {
              worlds: newWorlds,
              selectedWorldId: state.selectedWorldId || world.id,
              project: updatedProject,
            };
          }),

        updateWorld: (id, updates) =>
          set((state) => {
            const previousWorld = state.worlds.find((w) => w.id === id);
            const updatedWorlds = state.worlds.map((world) =>
              world.id === id
                ? { ...world, ...updates, updatedAt: new Date() }
                : world
            );

            // Update project
            const updatedProject = state.project
              ? { ...state.project, worlds: updatedWorlds }
              : null;

            // Persist to localStorage
            if (updatedProject) {
              try {
                StorageManager.setItem(
                  `project-${updatedProject.project_name}-worlds`,
                  JSON.stringify(updatedWorlds)
                );
              } catch (error) {
                Logger.error('Failed to persist worlds to storage:', error);
              }
            }

            // Emit world updated event (Requirement: 7.5)
            eventEmitter.emit<WorldUpdatedPayload>(WizardEventType.WORLD_UPDATED, {
              worldId: id,
              updates,
              previousWorld,
              timestamp: new Date(),
              source: 'store',
            });

            return {
              worlds: updatedWorlds,
              project: updatedProject,
            };
          }),

        deleteWorld: (id) =>
          set((state) => {
            const deletedWorld = state.worlds.find((w) => w.id === id);
            const filteredWorlds = state.worlds.filter((world) => world.id !== id);
            
            // Update project
            const updatedProject = state.project
              ? {
                  ...state.project,
                  worlds: filteredWorlds,
                  selectedWorldId:
                    state.selectedWorldId === id
                      ? filteredWorlds[0]?.id || null
                      : state.selectedWorldId,
                }
              : null;

            // Persist to localStorage
            if (updatedProject) {
              try {
                StorageManager.setItem(
                  `project-${updatedProject.project_name}-worlds`,
                  JSON.stringify(filteredWorlds)
                );
              } catch (error) {
                Logger.error('Failed to persist worlds to storage:', error);
              }
            }

            // Emit world deleted event (Requirement: 7.5)
            if (deletedWorld) {
              eventEmitter.emit<WorldDeletedPayload>(WizardEventType.WORLD_DELETED, {
                worldId: id,
                worldName: deletedWorld.name,
                timestamp: new Date(),
                source: 'store',
              });
            }

            return {
              worlds: filteredWorlds,
              selectedWorldId:
                state.selectedWorldId === id
                  ? filteredWorlds[0]?.id || null
                  : state.selectedWorldId,
              project: updatedProject,
            };
          }),

        selectWorld: (id) =>
          set((state) => {
            const selectedWorld = id ? state.worlds.find((w) => w.id === id) : null;
            
            // Update project with selected world
            const updatedProject = state.project
              ? { ...state.project, selectedWorldId: id }
              : null;

            // Emit world selected event (Requirement: 7.5)
            eventEmitter.emit<WorldSelectedPayload>(WizardEventType.WORLD_SELECTED, {
              worldId: id,
              world: selectedWorld || null,
              timestamp: new Date(),
              source: 'store',
            });

            return {
              selectedWorldId: id,
              project: updatedProject,
            };
          }),

        getWorldById: (id) => {
          const state = get();
          return state.worlds.find((world) => world.id === id);
        },

        // ====================================================================
        // Character Actions
        // ====================================================================
        addCharacter: (character) =>
          set((state) => {
            const newCharacters = [...state.characters, character];
            
            // Also update the project's characters array
            const updatedProject = state.project ? {
              ...state.project,
              characters: newCharacters
            } : null;
            
            // Persist to localStorage
            if (state.project) {
              try {
                StorageManager.setItem(
                  `project-${state.project.project_name}-characters`,
                  JSON.stringify(newCharacters)
                );
              } catch (error) {
                Logger.error('Failed to persist to storage:', error);
              }
            }

            // Emit character created event (Requirement: 7.5)
            eventEmitter.emit<CharacterCreatedPayload>(WizardEventType.CHARACTER_CREATED, {
              character,
              projectName: state.project?.project_name,
              timestamp: new Date(),
              source: 'store',
            });

            return {
              characters: newCharacters,
              project: updatedProject,
            };
          }),

        updateCharacter: (id, updates) =>
          set((state) => {
            const previousCharacter = state.characters.find((c) => c.character_id === id);
            const updatedCharacters = state.characters.map((character) =>
              character.character_id === id
                ? { ...character, ...updates }
                : character
            );

            // Also update the project's characters array
            const updatedProject = state.project ? {
              ...state.project,
              characters: updatedCharacters
            } : null;

            // Persist to localStorage
            if (state.project) {
              try {
                StorageManager.setItem(
                  `project-${state.project.project_name}-characters`,
                  JSON.stringify(updatedCharacters)
                );
              } catch (error) {
                Logger.error('Failed to persist to storage:', error);
              }
            }

            // Emit character updated event (Requirement: 7.5)
            eventEmitter.emit<CharacterUpdatedPayload>(WizardEventType.CHARACTER_UPDATED, {
              characterId: id,
              updates,
              previousCharacter,
              timestamp: new Date(),
              source: 'store',
            });

            return {
              characters: updatedCharacters,
              project: updatedProject,
            };
          }),

        deleteCharacter: (id) =>
          set((state) => {
            const deletedCharacter = state.characters.find((c) => c.character_id === id);
            const filteredCharacters = state.characters.filter(
              (character) => character.character_id !== id
            );
            
            // Also update the project's characters array
            const updatedProject = state.project ? {
              ...state.project,
              characters: filteredCharacters
            } : null;
            
            // Persist to localStorage
            if (state.project) {
              try {
                StorageManager.setItem(
                  `project-${state.project.project_name}-characters`,
                  JSON.stringify(filteredCharacters)
                );
              } catch (error) {
                Logger.error('Failed to persist to storage:', error);
              }
            }

            // Emit character deleted event (Requirement: 7.5)
            if (deletedCharacter) {
              eventEmitter.emit<CharacterDeletedPayload>(WizardEventType.CHARACTER_DELETED, {
                characterId: id,
                characterName: deletedCharacter.name,
                timestamp: new Date(),
                source: 'store',
              });
            }

            return {
              characters: filteredCharacters,
              project: updatedProject,
            };
          }),

        getCharacterById: (id) => {
          const state = get();
          return state.characters.find((character) => character.character_id === id);
        },

        getAllCharacters: () => {
          const state = get();
          return state.characters;
        },

        // Bulk set characters for project loading
        // Ensures single source of truth: store.characters is the source
        setCharacters: (characters) =>
          set((state) => {
            // Also update the project's characters array
            const updatedProject = state.project
              ? { ...state.project, characters }
              : null;

            Logger.info(`📦 [Store] Setting ${characters.length} characters`);

            return {
              characters,
              project: updatedProject,
            };
          }),

        // ====================================================================
        // Story Actions
        // ====================================================================
        addStory: (story) =>
          set((state) => {
            const newStories = [...state.stories, story];
            
            // Persist to localStorage
            if (state.project) {
              try {
                StorageManager.setItem(
                  `project-${state.project.project_name}-stories`,
                  JSON.stringify(newStories)
                );
              } catch (error) {
                Logger.error('Failed to persist to storage:', error);
              }
            }

            return {
              stories: newStories,
            };
          }),

        updateStory: (id, updates) =>
          set((state) => {
            const originalStory = state.stories.find((s) => s.id === id);
            
            // Check if content or summary is being modified
            const isContentModified = 
              (updates.content && updates.content !== originalStory?.content) ||
              (updates.summary && updates.summary !== originalStory?.summary);

            // Create version snapshot before updating if content changed
            let newVersions = state.storyVersions;
            if (isContentModified && originalStory) {
              const versionSnapshot: StoryVersion = {
                id: crypto.randomUUID(),
                storyId: id,
                versionNumber: originalStory.version,
                content: originalStory.content,
                summary: originalStory.summary,
                createdAt: new Date(),
                changes: 'Content modified',
              };
              newVersions = [...state.storyVersions, versionSnapshot];

              // Persist versions to localStorage
              if (state.project) {
                try {
                  StorageManager.setItem(
                    `project-${state.project.project_name}-story-versions`,
                    JSON.stringify(newVersions)
                  );
                } catch (error) {
                  Logger.error('Failed to persist to storage:', error);
                }
              }
            }

            // Update story with incremented version if content changed
            const updatedStories = state.stories.map((story) =>
              story.id === id
                ? { 
                    ...story, 
                    ...updates, 
                    updatedAt: new Date(),
                    version: isContentModified ? story.version + 1 : story.version,
                  }
                : story
            );

            // Persist stories to localStorage
            if (state.project) {
              try {
                StorageManager.setItem(
                  `project-${state.project.project_name}-stories`,
                  JSON.stringify(updatedStories)
                );
              } catch (error) {
                Logger.error('Failed to persist to storage:', error);
              }
            }

            return {
              stories: updatedStories,
              storyVersions: newVersions,
            };
          }),

        deleteStory: (id) =>
          set((state) => {
            const filteredStories = state.stories.filter(
              (story) => story.id !== id
            );
            
            // Persist to localStorage
            if (state.project) {
              try {
                StorageManager.setItem(
                  `project-${state.project.project_name}-stories`,
                  JSON.stringify(filteredStories)
                );
              } catch (error) {
                Logger.error('Failed to persist to storage:', error);
              }
            }

            return {
              stories: filteredStories,
            };
          }),

        getStoryById: (id) => {
          const state = get();
          return state.stories.find((story) => story.id === id);
        },

        getAllStories: () => {
          const state = get();
          return state.stories;
        },

        // ====================================================================
        // Story Version Actions
        // ====================================================================
        createVersion: (storyId, changes) =>
          set((state) => {
            const story = state.stories.find((s) => s.id === storyId);
            if (!story) {
              Logger.error(`Story with id ${storyId} not found`);
              return state;
            }

            const newVersion: StoryVersion = {
              id: crypto.randomUUID(),
              storyId,
              versionNumber: story.version,
              content: story.content,
              summary: story.summary,
              createdAt: new Date(),
              changes,
            };

            const newVersions = [...state.storyVersions, newVersion];

            // Persist to localStorage
            if (state.project) {
              try {
                StorageManager.setItem(
                  `project-${state.project.project_name}-story-versions`,
                  JSON.stringify(newVersions)
                );
              } catch (error) {
                Logger.error('Failed to persist to storage:', error);
              }
            }

            return {
              storyVersions: newVersions,
            };
          }),

        getVersionsByStoryId: (storyId) => {
          const state = get();
          return state.storyVersions
            .filter((version) => version.storyId === storyId)
            .sort((a, b) => b.versionNumber - a.versionNumber);
        },

        loadVersion: (versionId) =>
          set((state) => {
            const version = state.storyVersions.find((v) => v.id === versionId);
            if (!version) {
              Logger.error(`Version with id ${versionId} not found`);
              return state;
            }

            const updatedStories = state.stories.map((story) =>
              story.id === version.storyId
                ? {
                    ...story,
                    content: version.content,
                    summary: version.summary,
                    updatedAt: new Date(),
                  }
                : story
            );

            // Persist to localStorage
            if (state.project) {
              try {
                StorageManager.setItem(
                  `project-${state.project.project_name}-stories`,
                  JSON.stringify(updatedStories)
                );
              } catch (error) {
                Logger.error('Failed to persist to storage:', error);
              }
            }

            return {
              stories: updatedStories,
            };
          }),

        // ====================================================================
        // Wizard Integration Actions
        // ====================================================================
        completeWizard: async (output, projectPath) => {
          const wizardService = getWizardService();
          
          try {
            // Validation 1: Vérifier output
            if (!output || !output.type || !output.data) {
              throw new Error('Invalid wizard output: missing required fields (type, data)');
            }
            
            // Validation 2: Vérifier projectPath
            if (!projectPath || typeof projectPath !== 'string') {
              throw new Error('Invalid project path: must be a non-empty string');
            }
            
            // Validation 3: Vérifier les données spécifiques par type
            if (output.type === 'character') {
              if (!output.data.id || !output.data.name) {
                throw new Error('Invalid character data: missing id or name');
              }
            }
            
            // Save wizard output to file system
            await wizardService.saveWizardOutput(output, projectPath);
            
            // Update project.json with new content references
            await wizardService.updateProjectData(projectPath, output);
            
            // Update store based on wizard type
            const state = get();
            
            switch (output.type) {
              case 'character':
                // Add character to store (Requirements: 3.4, 3.5, 3.6, 12.1)
                const character: Character = {
                  character_id: output.data.id,
                  name: output.data.name,
                  creation_method: 'wizard' as const,
                  creation_timestamp: output.data.created_at,
                  version: '1.0',
                  visual_identity: {
                    hair_color: output.data.visual_attributes?.hair_color || '',
                    hair_style: output.data.visual_attributes?.hair_style || '',
                    hair_length: output.data.visual_attributes?.hair_length || '',
                    eye_color: output.data.visual_attributes?.eye_color || '',
                    eye_shape: output.data.visual_attributes?.eye_shape || '',
                    skin_tone: output.data.visual_attributes?.skin_tone || '',
                    facial_structure: output.data.visual_attributes?.facial_structure || '',
                    distinctive_features: output.data.visual_attributes?.distinctive_features || [],
                    age_range: output.data.visual_attributes?.age || '',
                    height: output.data.visual_attributes?.height || '',
                    build: output.data.visual_attributes?.build || '',
                    posture: output.data.visual_attributes?.posture || '',
                    clothing_style: output.data.visual_attributes?.clothing || '',
                    color_palette: output.data.visual_attributes?.color_palette || [],
                  },
                  personality: {
                    traits: output.data.personality || [],
                    values: output.data.values || [],
                    fears: output.data.fears || [],
                    desires: output.data.desires || [],
                    flaws: output.data.flaws || [],
                    strengths: output.data.strengths || [],
                    temperament: output.data.temperament || '',
                    communication_style: output.data.dialogue_style || '',
                  },
                  background: {
                    origin: output.data.origin || '',
                    occupation: output.data.occupation || '',
                    education: output.data.education || '',
                    family: output.data.family || '',
                    significant_events: output.data.significant_events || [],
                    current_situation: output.data.current_situation || '',
                  },
                  relationships: output.data.relationships || [],
                  role: {
                    archetype: output.data.archetype || '',
                    narrative_function: output.data.narrative_function || '',
                    character_arc: output.data.character_arc || '',
                  },
                };
                
                state.addCharacter(character);
                
                // Add character reference image as asset
                const charImageFile = output.files.find((f) => f.type === 'image');
                if (charImageFile) {
                  const charAsset: Asset = {
                    id: `asset_${Date.now()}_${output.data.id}`,
                    name: charImageFile.filename,
                    type: 'image',
                    url: charImageFile.path,
                    metadata: {
                      size: 0, // Size not available from wizard output
                      imported_at: new Date().toISOString(),
                    },
                  };
                  state.addAsset(charAsset);
                }
                break;
                
              case 'scene':
                // Create shot entries from scene breakdown (Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 12.2)
                const sceneShots = output.data.shots || [];
                // Using 'any' for shotData from wizard output to handle flexible shot data structures
                const newShots: Shot[] = sceneShots.map((shotData: any, index: number) => {
                  const shotId = shotData.id || `shot_${Date.now()}_${index}`;
                  return {
                    id: shotId,
                    title: shotData.title || `Shot ${index + 1}`,
                    description: shotData.description || shotData.action || '',
                    duration: shotData.duration || 5,
                    created_at: new Date().toISOString(),
                    status: 'draft' as const,
                    audioTracks: [],
                    effects: [],
                    textLayers: [],
                    animations: [],
                    metadata: {
                      source: 'wizard' as const,
                      wizard_type: 'scene',
                      camera_angle: shotData.camera_angle,
                      camera_movement: shotData.camera_movement,
                    },
                  };
                });
                
                // Add shots to storyboard in correct order
                newShots.forEach((shot) => state.addShot(shot));
                break;
                
              case 'storyboard':
                // Generate images for each shot and create entries (Requirements: 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 12.3)
                const storyboardShots = output.data.shots || [];
                const mode = output.data.mode || 'append';
                
                // Handle replace vs append mode
                if (mode === 'replace') {
                  // Clear existing shots
                  state.reorderShots([]);
                }
                
                // Using 'any' for shotData from wizard output to handle flexible shot data structures
                const storyboardNewShots: Shot[] = storyboardShots.map((shotData: any, index: number) => {
                  const shotId = shotData.id || `shot_${Date.now()}_${index}`;
                  const frameFile = output.files.find((f) => 
                    f.type === 'image' && f.path.includes(shotId)
                  );
                  
                  return {
                    id: shotId,
                    title: shotData.title || `Shot ${index + 1}`,
                    description: shotData.description || '',
                    duration: shotData.duration || 5,
                    created_at: new Date().toISOString(),
                    status: 'ready' as const,
                    frame_path: frameFile?.path,
                    audioTracks: [],
                    effects: [],
                    textLayers: [],
                    animations: [],
                    metadata: {
                      source: 'wizard' as const,
                      wizard_type: 'storyboard',
                      visual_prompt: shotData.visual_prompt,
                    },
                  };
                });
                
                // Add shots to timeline
                storyboardNewShots.forEach((shot) => state.addShot(shot));
                
                // Add frame images as assets
                output.files.filter((f) => f.type === 'image').forEach((file) => {
                  const asset: Asset = {
                    id: `asset_${Date.now()}_${file.filename}`,
                    name: file.filename,
                    type: 'image',
                    url: file.path,
                    metadata: {
                      size: 0,
                      imported_at: new Date().toISOString(),
                    },
                  };
                  state.addAsset(asset);
                });
                break;
                
              case 'dialogue':
                // Parse dialogue and add to shot metadata (Requirements: 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 12.4)
                const dialogueTracks = output.data.dialogue_tracks || [];
                
                // Add dialogue to shots (assuming dialogue is associated with current shots)
                const currentShots = state.shots;
                // Using 'any' for track data from wizard output to handle flexible dialogue track structures
                dialogueTracks.forEach((track: any, index: number) => {
                  if (index < currentShots.length) {
                    const shot = currentShots[index];
                    const audioTrack: AudioTrack = {
                      id: `audio_${Date.now()}_${index}`,
                      name: track.text || `Dialogue ${index + 1}`,
                      type: 'dialogue',
                      url: track.url || '',
                      volume: 100,
                      startTime: track.start_time || 0,
                      duration: track.end_time ? track.end_time - track.start_time : shot.duration,
                      offset: 0,
                      fadeIn: 0,
                      fadeOut: 0,
                      pan: 0,
                      metadata: {
                        speaker: track.speaker,
                        emotion: track.emotion,
                      },
                    };
                    state.addAudioTrack(shot.id, audioTrack);
                  }
                });
                break;
                
              case 'world':
                // Save world definition and make available (Requirements: 7.2, 7.3, 7.4, 7.5, 12.5)
                const world: World = {
                  id: output.data.id,
                  name: output.data.name,
                  genre: output.data.genre || [],
                  timePeriod: output.data.time_period || '',
                  tone: output.data.tone || [],
                  locations: output.data.locations || [],
                  rules: output.data.rules || [],
                  atmosphere: output.data.lore || output.data.atmosphere || '',
                  culturalElements: output.data.culture || {
                    languages: [],
                    religions: [],
                    traditions: [],
                    historicalEvents: [],
                    culturalConflicts: [],
                  },
                  technology: output.data.technology || '',
                  magic: output.data.magic || '',
                  conflicts: output.data.conflicts || [],
                  technologyMagic: output.data.technology_magic || '',
                  threats: output.data.threats || [],
                  createdAt: new Date(output.data.created_at || Date.now()),
                  updatedAt: new Date(output.data.created_at || Date.now()),
                };
                
                state.addWorld(world);
                break;
                
              case 'style':
                // Save styled image and update shot metadata (Requirements: 8.2, 8.3, 8.4, 8.5, 8.6, 12.6)
                const originalShotId = output.data.original_shot_id;
                const styledFile = output.files.find((f) => f.type === 'image');
                
                if (styledFile) {
                  // Update shot with styled image reference
                  state.updateShot(originalShotId, {
                    metadata: {
                      ...state.shots.find((s) => s.id === originalShotId)?.metadata,
                      styled_version: output.data.styled_shot_id,
                      styled_path: styledFile.path,
                      original_preserved: true,
                    },
                  });
                  
                  // Add styled image as asset
                  const styledAsset: Asset = {
                    id: `asset_${Date.now()}_${styledFile.filename}`,
                    name: styledFile.filename,
                    type: 'image',
                    url: styledFile.path,
                    metadata: {
                      size: 0,
                      imported_at: new Date().toISOString(),
                    },
                  };
                  state.addAsset(styledAsset);
                }
                break;
            }
            
            // Wizard completion handled - capabilities already set in project
          } catch (error) {
            Logger.error('Failed to complete wizard:', error);
            throw error;
          }
        },

        // ====================================================================
        // Audio Track Actions
        // ====================================================================
        addAudioTrack: (shotId, track) =>
          set((state) => ({
            shots: state.shots.map((shot) =>
              shot.id === shotId
                ? { ...shot, audioTracks: [...shot.audioTracks, track] }
                : shot
            ),
          })),

        updateAudioTrack: (shotId, trackId, updates) =>
          set((state) => ({
            shots: state.shots.map((shot) =>
              shot.id === shotId
                ? {
                    ...shot,
                    audioTracks: shot.audioTracks.map((track) =>
                      track.id === trackId ? { ...track, ...updates } : track
                    ),
                  }
                : shot
            ),
          })),

        deleteAudioTrack: (shotId, trackId) =>
          set((state) => ({
            shots: state.shots.map((shot) =>
              shot.id === shotId
                ? {
                    ...shot,
                    audioTracks: shot.audioTracks.filter((track) => track.id !== trackId),
                  }
                : shot
            ),
          })),

        // ====================================================================
        // Effect Actions
        // ====================================================================
        addEffect: (shotId, effect) =>
          set((state) => ({
            shots: state.shots.map((shot) =>
              shot.id === shotId
                ? { ...shot, effects: [...shot.effects, effect] }
                : shot
            ),
          })),

        updateEffect: (shotId, effectId, updates) =>
          set((state) => ({
            shots: state.shots.map((shot) =>
              shot.id === shotId
                ? {
                    ...shot,
                    effects: shot.effects.map((effect) =>
                      effect.id === effectId ? { ...effect, ...updates } : effect
                    ),
                  }
                : shot
            ),
          })),

        deleteEffect: (shotId, effectId) =>
          set((state) => ({
            shots: state.shots.map((shot) =>
              shot.id === shotId
                ? {
                    ...shot,
                    effects: shot.effects.filter((effect) => effect.id !== effectId),
                  }
                : shot
            ),
          })),

        reorderEffects: (shotId, effects) =>
          set((state) => ({
            shots: state.shots.map((shot) =>
              shot.id === shotId ? { ...shot, effects } : shot
            ),
          })),

        // ====================================================================
        // Text Layer Actions
        // ====================================================================
        addTextLayer: (shotId, layer) =>
          set((state) => ({
            shots: state.shots.map((shot) =>
              shot.id === shotId
                ? { ...shot, textLayers: [...shot.textLayers, layer] }
                : shot
            ),
          })),

        updateTextLayer: (shotId, layerId, updates) =>
          set((state) => ({
            shots: state.shots.map((shot) =>
              shot.id === shotId
                ? {
                    ...shot,
                    textLayers: shot.textLayers.map((layer) =>
                      layer.id === layerId ? { ...layer, ...updates } : layer
                    ),
                  }
                : shot
            ),
          })),

        deleteTextLayer: (shotId, layerId) =>
          set((state) => ({
            shots: state.shots.map((shot) =>
              shot.id === shotId
                ? {
                    ...shot,
                    textLayers: shot.textLayers.filter((layer) => layer.id !== layerId),
                  }
                : shot
            ),
          })),

        // ====================================================================
        // Animation Actions
        // ====================================================================
        addAnimation: (shotId, animation) =>
          set((state) => ({
            shots: state.shots.map((shot) =>
              shot.id === shotId
                ? { ...shot, animations: [...shot.animations, animation] }
                : shot
            ),
          })),

        updateAnimation: (shotId, animationId, updates) =>
          set((state) => ({
            shots: state.shots.map((shot) =>
              shot.id === shotId
                ? {
                    ...shot,
                    animations: shot.animations.map((animation) =>
                      animation.id === animationId ? { ...animation, ...updates } : animation
                    ),
                  }
                : shot
            ),
          })),

        deleteAnimation: (shotId, animationId) =>
          set((state) => ({
            shots: state.shots.map((shot) =>
              shot.id === shotId
                ? {
                    ...shot,
                    animations: shot.animations.filter(
                      (animation) => animation.id !== animationId
                    ),
                  }
                : shot
            ),
          })),

        // ====================================================================
        // Transition Actions
        // ====================================================================
        setTransition: (shotId, transition) =>
          set((state) => ({
            shots: state.shots.map((shot) =>
              shot.id === shotId ? { ...shot, transitionOut: transition } : shot
            ),
          })),

        // ====================================================================
        // Task Queue Actions
        // ====================================================================
        addTask: (task) =>
          set((state) => {
            const newQueue = [...state.taskQueue, task];
            return { taskQueue: updatePriorities(newQueue) };
          }),

        updateTask: (taskId, updates) =>
          set((state) => ({
            taskQueue: state.taskQueue.map((task) =>
              task.id === taskId ? { ...task, ...updates } : task
            ),
          })),

        removeTask: (taskId) =>
          set((state) => ({
            taskQueue: state.taskQueue.filter((task) => task.id !== taskId),
          })),

        moveTaskUp: (taskId) =>
          set((state) => {
            const index = state.taskQueue.findIndex((task) => task.id === taskId);
            if (index <= 0) return state;

            const newQueue = [...state.taskQueue];
            [newQueue[index - 1], newQueue[index]] = [
              newQueue[index],
              newQueue[index - 1],
            ];

            return { taskQueue: updatePriorities(newQueue) };
          }),

        moveTaskDown: (taskId) =>
          set((state) => {
            const index = state.taskQueue.findIndex((task) => task.id === taskId);
            if (index >= state.taskQueue.length - 1) return state;

            const newQueue = [...state.taskQueue];
            [newQueue[index], newQueue[index + 1]] = [
              newQueue[index + 1],
              newQueue[index],
            ];

            return { taskQueue: updatePriorities(newQueue) };
          }),

        reorderTasks: (tasks) =>
          set({ taskQueue: updatePriorities(tasks) }),

        // ====================================================================
        // UI State Actions
        // ====================================================================
        setShowChat: (show) => set({ showChat: show }),

        setShowTaskQueue: (show) => set({ showTaskQueue: show }),

        setPanelSizes: (sizes) => set({ panelSizes: sizes }),

        setCurrentTime: (time) => set({ currentTime: time }),

        // ====================================================================
        // Playback Actions
        // ====================================================================
        play: () => set({ isPlaying: true }),

        pause: () => set({ isPlaying: false }),

        stop: () => set({ isPlaying: false, currentTime: 0 }),

        setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

        // ====================================================================
        // Selection Actions
        // ====================================================================
        selectEffect: (id) => set({ selectedEffectId: id }),

        selectTextLayer: (id) => set({ selectedTextLayerId: id }),

        selectKeyframe: (id) => set({ selectedKeyframeId: id }),

        // ====================================================================
        // Undo/Redo Actions
        // Note: Full implementation is in store/undoRedo.ts
        // These are placeholder methods that will be replaced by the undo/redo module
        // ====================================================================
        undo: () => {
          const state = get();
          if (state.historyIndex <= 0) return;
          
          const newIndex = state.historyIndex - 1;
          const previousState = state.history[newIndex];
          
          set({
            shots: JSON.parse(JSON.stringify(previousState.shots)),
            project: previousState.project ? JSON.parse(JSON.stringify(previousState.project)) : null,
            assets: JSON.parse(JSON.stringify(previousState.assets)),
            selectedShotId: previousState.selectedShotId,
            taskQueue: JSON.parse(JSON.stringify(previousState.taskQueue)),
            historyIndex: newIndex,
          });
        },

        redo: () => {
          const state = get();
          if (state.historyIndex >= state.history.length - 1) return;
          
          const newIndex = state.historyIndex + 1;
          const nextState = state.history[newIndex];
          
          set({
            shots: JSON.parse(JSON.stringify(nextState.shots)),
            project: nextState.project ? JSON.parse(JSON.stringify(nextState.project)) : null,
            assets: JSON.parse(JSON.stringify(nextState.assets)),
            selectedShotId: nextState.selectedShotId,
            taskQueue: JSON.parse(JSON.stringify(nextState.taskQueue)),
            historyIndex: newIndex,
          });
        },

        pushHistory: (snapshot) => {
          const state = get();
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(snapshot);
          
          // Keep only last 50 states
          if (newHistory.length > 50) {
            newHistory.shift();
          }
          
          set({
            history: newHistory,
            historyIndex: newHistory.length - 1,
          });
        },

        canUndo: () => {
          const state = get();
          return state.historyIndex > 0;
        },

        canRedo: () => {
          const state = get();
          return state.historyIndex < state.history.length - 1;
        },
      }),
      {
        name: 'creative-studio-storage',
        partialize: (state) => ({
          // Only persist UI preferences, not project data
          panelSizes: state.panelSizes,
          showChat: state.showChat,
          playbackSpeed: state.playbackSpeed,
        }),
      }
    )
  )
);

// ============================================================================
// Selector Hooks for Optimized Re-renders
// ============================================================================

// Shot selectors
export const useShots = () => useStore((state) => state.shots);
export const useSelectedShot = () => {
  const shots = useStore((state) => state.shots);
  const selectedShotId = useStore((state) => state.selectedShotId);
  return shots.find((shot) => shot.id === selectedShotId) || null;
};
export const useSelectedShotId = () => useStore((state) => state.selectedShotId);

// Asset selectors
export const useAssets = () => useStore((state) => state.assets);
export const useAssetById = (id: string) => {
  const assets = useStore((state) => state.assets);
  return assets.find((asset) => asset.id === id) || null;
};

// World selectors (Requirements: 7.1, 7.6)
export const useWorlds = () => useStore((state) => state.worlds);
export const useSelectedWorld = () => {
  const worlds = useStore((state) => state.worlds);
  const selectedWorldId = useStore((state) => state.selectedWorldId);
  return worlds.find((world) => world.id === selectedWorldId) || null;
};
export const useSelectedWorldId = () => useStore((state) => state.selectedWorldId);
export const useWorldById = (id: string) => {
  const worlds = useStore((state) => state.worlds);
  return worlds.find((world) => world.id === id) || null;
};

// Character selectors (Requirements: 7.1, 7.6)
export const useCharacters = () => useStore((state) => state.characters);
export const useCharacterById = (id: string) => {
  const characters = useStore((state) => state.characters);
  return characters.find((character) => character.character_id === id) || null;
};
export const useCharactersByIds = (ids: string[]) => {
  const characters = useStore((state) => state.characters);
  return characters.filter((character) => ids.includes(character.character_id));
};

// Story selectors (Requirements: 6.1, 6.2)
export const useStories = () => useStore((state) => state.stories);
export const useStoryById = (id: string) => {
  const stories = useStore((state) => state.stories);
  return stories.find((story) => story.id === id) || null;
};
export const useStoriesByWorldId = (worldId: string) => {
  const stories = useStore((state) => state.stories);
  return stories.filter((story) => story.worldId === worldId);
};

// Task queue selectors
export const useTaskQueue = () => useStore((state) => state.taskQueue);
export const useTaskById = (id: string) => {
  const taskQueue = useStore((state) => state.taskQueue);
  return taskQueue.find((task) => task.id === id) || null;
};

// Playback selectors
export const useIsPlaying = () => useStore((state) => state.isPlaying);
export const useCurrentTime = () => useStore((state) => state.currentTime);
export const usePlaybackSpeed = () => useStore((state) => state.playbackSpeed);

// UI state selectors
export const usePanelSizes = () => useStore((state) => state.panelSizes);
export const useShowChat = () => useStore((state) => state.showChat);
export const useShowTaskQueue = () => useStore((state) => state.showTaskQueue);

// Project selector
export const useProject = () => useStore((state) => state.project);

// Generation status selector
export const useGenerationStatus = () => useStore((state) => state.generationStatus);


