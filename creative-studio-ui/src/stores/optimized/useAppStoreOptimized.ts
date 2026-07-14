/**
 * Optimized App Store with Zustand
 * 
 * Requirements: 121-126
 * State Management Level: 🟡 HAUTE
 * 
 * Migrated from Redux to Zustand with:
 * - Immer middleware for immutable updates
 * - Persistence middleware
 * - DevTools integration
 * - Strict TypeScript types
 * - Memoized selectors
 */

import { useState, useCallback } from 'react';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';
import type { 
  Project, Shot, Asset, GenerationTask, PanelSizes, 
  ChatMessage, Sequence, SequencePlan, World, Character 
} from '@/types';
import { StorageManager } from '@/utils/storageManager';
import { generateId } from '@/utils/idGenerator';

// ============================================
// STATE INTERFACE
// ============================================

export interface AppState {
  // Project data
  project: Project | null;
  shots: Shot[];
  assets: Asset[];
  worlds: World[];
  characters: Character[];
  currentShot: Shot | null;
  currentSequence: Sequence | null;

  // UI state
  selectedShotId: string | null;
  currentTime: number;
  showChat: boolean;
  showTaskQueue: boolean;
  panelSizes: PanelSizes;

  // Floating chat panel state
  chatPanelPosition: { x: number; y: number };
  chatPanelSize: { width: number; height: number };
  chatPanelMinimized: boolean;

  // Task queue
  taskQueue: GenerationTask[];

  // Service Status
  ollamaStatus: 'connected' | 'error' | 'disconnected' | 'connecting';
  lmStudioStatus: 'connected' | 'error' | 'disconnected' | 'connecting';
  comfyuiStatus: 'connected' | 'error' | 'disconnected' | 'connecting';

  // Playback state
  isPlaying: boolean;
  playbackSpeed: number;

  // Chat state
  chatMessages: ChatMessage[];

  // Modals state
  showInstallationWizard: boolean;
  installationComplete: boolean;
  showWorldWizard: boolean;
  showCharacterWizard: boolean;
  showCreateProjectDialog: boolean;
  showProjectSetupWizard: boolean;
  showStorytellerWizard: boolean;
  showLLMSettings: boolean;
  showComfyUISettings: boolean;
  showGeneralSettings: boolean;
  showAddonsModal: boolean;
  showCharactersModal: boolean;
  showWorldModal: boolean;

  // Undo/Redo history
  history: {
    past: AppState[];
    present: AppState | null;
    future: AppState[];
  };

  // Loading states
  loadingStates: Record<string, boolean>;
  errorStates: Record<string, string | null>;
}

// ============================================
// ACTIONS
// ============================================

interface AppActions {
  // Project actions
  setProject: (project: Project | null) => void;
  updateProject: (updates: Partial<Project>) => void;
  
  // Shot actions
  setShots: (shots: Shot[]) => void;
  addShot: (shot: Shot) => void;
  updateShot: (id: string, updates: Partial<Shot>) => void;
  deleteShot: (id: string) => void;
  setCurrentShot: (shot: Shot | null) => void;
  setSelectedShotId: (id: string | null) => void;
  
  // Asset actions
  setAssets: (assets: Asset[]) => void;
  addAsset: (asset: Asset) => void;
  updateAsset: (id: string, updates: Partial<Asset>) => void;
  deleteAsset: (id: string) => void;
  
  // Character actions
  setCharacters: (characters: Character[]) => void;
  addCharacter: (character: Character) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  
  // World actions
  setWorlds: (worlds: World[]) => void;
  addWorld: (world: World) => void;
  updateWorld: (id: string, updates: Partial<World>) => void;
  deleteWorld: (id: string) => void;
  
  // Sequence actions
  setCurrentSequence: (sequence: Sequence | null) => void;
  
  // UI actions
  setCurrentTime: (time: number) => void;
  setShowChat: (show: boolean) => void;
  setShowTaskQueue: (show: boolean) => void;
  setPanelSizes: (sizes: PanelSizes) => void;
  
  // Chat panel actions
  setChatPanelPosition: (position: { x: number; y: number }) => void;
  setChatPanelSize: (size: { width: number; height: number }) => void;
  setChatPanelMinimized: (minimized: boolean) => void;
  
  // Task queue actions
  addTask: (task: GenerationTask) => void;
  updateTask: (id: string, updates: Partial<GenerationTask>) => void;
  removeTask: (id: string) => void;
  clearCompletedTasks: () => void;
  
  // Service status actions
  setOllamaStatus: (status: AppState['ollamaStatus']) => void;
  setLmStudioStatus: (status: AppState['lmStudioStatus']) => void;
  setComfyuiStatus: (status: AppState['comfyuiStatus']) => void;
  
  // Playback actions
  setIsPlaying: (playing: boolean) => void;
  setPlaybackSpeed: (speed: number) => void;
  
  // Chat actions
  addChatMessage: (message: ChatMessage) => void;
  clearChatMessages: () => void;
  
  // Modal actions
  setShowInstallationWizard: (show: boolean) => void;
  setInstallationComplete: (complete: boolean) => void;
  setShowWorldWizard: (show: boolean) => void;
  setShowCharacterWizard: (show: boolean) => void;
  setShowCreateProjectDialog: (show: boolean) => void;
  setShowProjectSetupWizard: (show: boolean) => void;
  setShowStorytellerWizard: (show: boolean) => void;
  setShowLLMSettings: (show: boolean) => void;
  setShowComfyUISettings: (show: boolean) => void;
  setShowGeneralSettings: (show: boolean) => void;
  setShowAddonsModal: (show: boolean) => void;
  setShowCharactersModal: (show: boolean) => void;
  setShowWorldModal: (show: boolean) => void;
  
  // Undo/Redo actions
  undo: () => void;
  redo: () => void;
  pushToHistory: () => void;
  
  // Loading state actions
  setLoading: (key: string, loading: boolean) => void;
  setError: (key: string, error: string | null) => void;
  
  // Reset
  reset: () => void;
}

// ============================================
// INITIAL STATE
// ============================================

const initialState: AppState = {
  project: null,
  shots: [],
  assets: [],
  worlds: [],
  characters: [],
  currentShot: null,
  currentSequence: null,
  selectedShotId: null,
  currentTime: 0,
  showChat: false,
  showTaskQueue: false,
  panelSizes: { assetLibrary: 20, canvas: 60, propertiesOrChat: 20 },
  chatPanelPosition: { x: 100, y: 100 },
  chatPanelSize: { width: 400, height: 600 },
  chatPanelMinimized: false,
  taskQueue: [],
  ollamaStatus: 'disconnected',
  lmStudioStatus: 'disconnected',
  comfyuiStatus: 'disconnected',
  isPlaying: false,
  playbackSpeed: 1,
  chatMessages: [],
  showInstallationWizard: false,
  installationComplete: false,
  showWorldWizard: false,
  showCharacterWizard: false,
  showCreateProjectDialog: false,
  showProjectSetupWizard: false,
  showStorytellerWizard: false,
  showLLMSettings: false,
  showComfyUISettings: false,
  showGeneralSettings: false,
  showAddonsModal: false,
  showCharactersModal: false,
  showWorldModal: false,
  history: {
    past: [],
    present: null,
    future: [],
  },
  loadingStates: {},
  errorStates: {},
};

// ============================================
// STORE CREATION
// ============================================

export const useAppStore = create<AppState & AppActions>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      // Project actions
      setProject: (project) => set({ project }),
      updateProject: (updates) =>
        set((state) => {
          if (state.project) {
            Object.assign(state.project, updates);
          }
        }),

      // Shot actions
      setShots: (shots) => set({ shots }),
      addShot: (shot) =>
        set((state) => {
          state.shots.push({ ...shot, id: generateId() });
        }),
      updateShot: (id, updates) =>
        set((state) => {
          const index = state.shots.findIndex((s) => s.id === id);
          if (index !== -1) {
            Object.assign(state.shots[index], updates);
          }
        }),
      deleteShot: (id) =>
        set((state) => {
          state.shots = state.shots.filter((s) => s.id !== id);
        }),
      setCurrentShot: (shot) => set({ currentShot: shot }),
      setSelectedShotId: (id) => set({ selectedShotId: id }),

      // Asset actions
      setAssets: (assets) => set({ assets }),
      addAsset: (asset) =>
        set((state) => {
          state.assets.push({ ...asset, id: generateId() });
        }),
      updateAsset: (id, updates) =>
        set((state) => {
          const index = state.assets.findIndex((a) => a.id === id);
          if (index !== -1) {
            Object.assign(state.assets[index], updates);
          }
        }),
      deleteAsset: (id) =>
        set((state) => {
          state.assets = state.assets.filter((a) => a.id !== id);
        }),

      // Character actions
      setCharacters: (characters) => set({ characters }),
      addCharacter: (character) =>
        set((state) => {
          state.characters.push({ ...character, character_id: generateId() });
        }),
      updateCharacter: (id, updates) =>
        set((state) => {
          const index = state.characters.findIndex((c) => c.character_id === id);
          if (index !== -1) {
            Object.assign(state.characters[index], updates);
          }
        }),
      deleteCharacter: (id) =>
        set((state) => {
          state.characters = state.characters.filter((c) => c.character_id !== id);
        }),

      // World actions
      setWorlds: (worlds) => set({ worlds }),
      addWorld: (world) =>
        set((state) => {
          state.worlds.push({ ...world, id: generateId() });
        }),
      updateWorld: (id, updates) =>
        set((state) => {
          const index = state.worlds.findIndex((w) => w.id === id);
          if (index !== -1) {
            Object.assign(state.worlds[index], updates);
          }
        }),
      deleteWorld: (id) =>
        set((state) => {
          state.worlds = state.worlds.filter((w) => w.id !== id);
        }),

      // Sequence actions
      setCurrentSequence: (sequence) => set({ currentSequence: sequence }),

      // UI actions
      setCurrentTime: (time) => set({ currentTime: time }),
      setShowChat: (show) => set({ showChat: show }),
      setShowTaskQueue: (show) => set({ showTaskQueue: show }),
      setPanelSizes: (sizes) => set({ panelSizes: sizes }),

      // Chat panel actions
      setChatPanelPosition: (position) => set({ chatPanelPosition: position }),
      setChatPanelSize: (size) => set({ chatPanelSize: size }),
      setChatPanelMinimized: (minimized) => set({ chatPanelMinimized: minimized }),

      // Task queue actions
      addTask: (task) =>
        set((state) => {
          state.taskQueue.push({ ...task, id: generateId() });
        }),
      updateTask: (id, updates) =>
        set((state) => {
          const index = state.taskQueue.findIndex((t) => t.id === id);
          if (index !== -1) {
            Object.assign(state.taskQueue[index], updates);
          }
        }),
      removeTask: (id) =>
        set((state) => {
          state.taskQueue = state.taskQueue.filter((t) => t.id !== id);
        }),
      clearCompletedTasks: () =>
        set((state) => {
          state.taskQueue = state.taskQueue.filter(
            (t) => t.status !== 'completed' && t.status !== 'failed'
          );
        }),

      // Service status actions
      setOllamaStatus: (status) => set({ ollamaStatus: status }),
      setLmStudioStatus: (status) => set({ lmStudioStatus: status }),
      setComfyuiStatus: (status) => set({ comfyuiStatus: status }),

      // Playback actions
      setIsPlaying: (playing) => set({ isPlaying: playing }),
      setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

      // Chat actions
      addChatMessage: (message) =>
        set((state) => {
          state.chatMessages.push(message);
        }),
      clearChatMessages: () => set({ chatMessages: [] }),

      // Modal actions
      setShowInstallationWizard: (show) => set({ showInstallationWizard: show }),
      setInstallationComplete: (complete) => set({ installationComplete: complete }),
      setShowWorldWizard: (show) => set({ showWorldWizard: show }),
      setShowCharacterWizard: (show) => set({ showCharacterWizard: show }),
      setShowCreateProjectDialog: (show) => set({ showCreateProjectDialog: show }),
      setShowProjectSetupWizard: (show) => set({ showProjectSetupWizard: show }),
      setShowStorytellerWizard: (show) => set({ showStorytellerWizard: show }),
      setShowLLMSettings: (show) => set({ showLLMSettings: show }),
      setShowComfyUISettings: (show) => set({ showComfyUISettings: show }),
      setShowGeneralSettings: (show) => set({ showGeneralSettings: show }),
      setShowAddonsModal: (show) => set({ showAddonsModal: show }),
      setShowCharactersModal: (show) => set({ showCharactersModal: show }),
      setShowWorldModal: (show) => set({ showWorldModal: show }),

      // Undo/Redo actions
      undo: () =>
        set((state) => {
          if (state.history.past.length === 0) return;

          const previous = state.history.past[state.history.past.length - 1];
          const newPast = state.history.past.slice(0, -1);

          return {
            ...previous,
            history: {
              past: newPast,
              present: state,
              future: [state, ...state.history.future],
            },
          };
        }),
      redo: () =>
        set((state) => {
          if (state.history.future.length === 0) return;

          const next = state.history.future[0];
          const newFuture = state.history.future.slice(1);

          return {
            ...next,
            history: {
              past: [...state.history.past, state],
              present: state,
              future: newFuture,
            },
          };
        }),
      pushToHistory: () =>
        set((state) => ({
          ...state,
          history: {
            past: [...state.history.past, state],
            present: state,
            future: [],
          },
        })),

      // Loading state actions
      setLoading: (key, loading) =>
        set((state) => ({
          loadingStates: { ...state.loadingStates, [key]: loading },
        })),
      setError: (key, error) =>
        set((state) => ({
          errorStates: { ...state.errorStates, [key]: error },
        })),

      // Reset
      reset: () => set(initialState),
    })),
    {
      name: 'app-storage',
      storage: createJSONStorage(() => ({
        getItem: (name) => StorageManager.getItem(name),
        setItem: async (name, value) => { await StorageManager.setItem(name, value); },
        removeItem: async (name) => StorageManager.removeItem(name),
      })),
      partialize: (state) => ({
        project: state.project,
        shots: state.shots,
        assets: state.assets,
        characters: state.characters,
        worlds: state.worlds,
        chatMessages: state.chatMessages,
        taskQueue: state.taskQueue,
      }),
    }
  )
);

// ============================================
// ASYNC ACTIONS WITH LOADING STATES
// ============================================

export const useAsyncStoreActions = () => {
  const store = useAppStore();
  
  const asyncAction = async <T,>(
    key: string,
    action: () => Promise<T>,
    options: {
      onSuccess?: (result: T) => void;
      onError?: (error: Error) => void;
    } = {}
  ): Promise<T> => {
    store.setLoading(key, true);
    store.setError(key, null);
    
    try {
      const result = await action();
      store.setLoading(key, false);
      options.onSuccess?.(result);
      return result;
    } catch (error) {
      store.setLoading(key, false);
      store.setError(key, error instanceof Error ? error.message : 'Unknown error');
      options.onError?.(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  };
  
  return { asyncAction };
};

// ============================================
// ERROR HANDLING
// ============================================

export class StoreError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'StoreError';
  }
}

export const validateStoreData = <T>(data: unknown, schema: any): T => {
  // Basic validation - in production, use a proper validation library
  if (!data) {
    throw new StoreError('Data is required', 'VALIDATION_ERROR');
  }
  
  if (typeof data !== 'object') {
    throw new StoreError('Data must be an object', 'VALIDATION_ERROR');
  }
  
  return data as T;
};

export const handleStoreError = (error: unknown, context: string): void => {
  console.error(`Store error in ${context}:`, error);
  
  // Log to error tracking service in production
  if (process.env.NODE_ENV === 'production') {
    // Send to Sentry, LogRocket, etc.
  }
};

// ============================================
// MEMOIZED SELECTORS (COMPLEX)
// ============================================

export const useFilteredShots = (sequenceId: string) => {
  return useAppStore(
    useShallow((state) => {
      const shots = state.shots.filter((s) => s.sequenceId === sequenceId);
      
      return shots.map((shot) => ({
        ...shot,
        assets: state.assets.filter((a) => a.shotId === shot.id),
      }));
    })
  );
};

export const useProjectTimeline = () => {
  return useAppStore(
    useShallow((state) => {
      const sortedShots = [...state.shots].sort(
        (a, b) => (a.startTime || 0) - (b.startTime || 0)
      );
      
      return sortedShots.map((shot) => ({
        ...shot,
        assets: state.assets.filter((a) => a.shotId === shot.id),
        characterCount: state.characters.filter((c) =>
          shot.characterIds?.includes(c.character_id || '')
        ).length,
      }));
    })
  );
};

export const useStoreHealth = () => {
  return useAppStore(
    useShallow((state) => ({
      hasProject: !!state.project,
      shotCount: state.shots.length,
      assetCount: state.assets.length,
      characterCount: state.characters.length,
      worldCount: state.worlds.length,
      pendingTasks: state.taskQueue.filter((t) => t.status === 'pending')
        .map((t) => t.id),
    }))
  );
};

// ============================================
// ROLLBACK MECHANISM
// ============================================

export const useStoreRollback = () => {
  const [history, setHistory] = useState<any[]>([]);
  
  const saveCheckpoint = useCallback(() => {
    const currentState = useAppStore.getState();
    setHistory((prev: any[]) => {
      const newHistory = [...prev, currentState];
      return newHistory.slice(-50); // Keep last 50 checkpoints
    });
  }, []);
  
  const rollback = useCallback((steps: number = 1) => {
    if (history.length < steps) {
      throw new StoreError('Not enough history for rollback', 'ROLLBACK_ERROR');
    }
    
    const targetState = history[history.length - steps];
    useAppStore.setState(targetState, true);
    
    setHistory((prev: any[]) => prev.slice(0, -steps));
  }, [history]);
  
  return { saveCheckpoint, rollback, history };
};

// ============================================
// UTILITY HOOKS
// ============================================

export const useStoreActions = () => {
  return useAppStore(
    useShallow((state) => ({
      setProject: state.setProject,
      setShots: state.setShots,
      addShot: state.addShot,
      updateShot: state.updateShot,
      deleteShot: state.deleteShot,
      setAssets: state.setAssets,
      addAsset: state.addAsset,
      updateAsset: state.updateAsset,
      deleteAsset: state.deleteAsset,
      setCharacters: state.setCharacters,
      addCharacter: state.addCharacter,
      updateCharacter: state.updateCharacter,
      deleteCharacter: state.deleteCharacter,
      setWorlds: state.setWorlds,
      addWorld: state.addWorld,
      updateWorld: state.updateWorld,
      deleteWorld: state.deleteWorld,
      setCurrentShot: state.setCurrentShot,
      setCurrentSequence: state.setCurrentSequence,
      setSelectedShotId: state.setSelectedShotId,
      setCurrentTime: state.setCurrentTime,
      setShowChat: state.setShowChat,
      setShowTaskQueue: state.setShowTaskQueue,
      setPanelSizes: state.setPanelSizes,
      addTask: state.addTask,
      updateTask: state.updateTask,
      removeTask: state.removeTask,
      clearCompletedTasks: state.clearCompletedTasks,
      setOllamaStatus: state.setOllamaStatus,
      setLmStudioStatus: state.setLmStudioStatus,
      setComfyuiStatus: state.setComfyuiStatus,
      setIsPlaying: state.setIsPlaying,
      setPlaybackSpeed: state.setPlaybackSpeed,
      addChatMessage: state.addChatMessage,
      clearChatMessages: state.clearChatMessages,
      undo: state.undo,
      redo: state.redo,
      pushToHistory: state.pushToHistory,
      setLoading: state.setLoading,
      setError: state.setError,
      reset: state.reset,
    }))
  );
};
