/**
 * Main Application Store (Zustand)
 * 
 * Requirements: 128-135
 * Level: 🟡 HAUTE
 * 
 * Centralized state management with persistence, undo/redo, and cross-tab sync
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import produce, { Draft, enableMapSet, enablePatches, Patch } from 'immer';
import { devtools } from 'zustand/middleware';

enableMapSet();
enablePatches();

// Types
export interface AppState {
  // Projects
  projects: Map<string, Project>;
  currentProjectId: string | null;
  
  // Results
  results: Map<string, GeneratedResult>;
  selectedResultIds: Set<string>;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  notifications: Notification[];
  
  // Settings
  settings: AppSettings;
  
  // Undo/Redo
  history: HistoryState;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  type: 'grid' | 'promotion' | 'refine' | 'qa';
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'archived' | 'deleted';
  metadata?: Record<string, any>;
}

export interface GeneratedResult {
  taskId: string;
  shotId: string;
  type: 'grid' | 'promotion' | 'refine' | 'qa';
  status: 'success' | 'failed';
  assets: GeneratedAsset[];
  generatedAt: string;
  processingTime?: number;
  qualityScore?: number;
  metrics?: Record<string, number>;
  error?: string;
}

export interface GeneratedAsset {
  id: string;
  type: 'image' | 'video' | 'audio' | 'data';
  name: string;
  url: string;
  thumbnail?: string;
  size?: number;
  format?: string;
  dimensions?: { width: number; height: number };
  duration?: number;
  metadata?: Record<string, any>;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: () => void;
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: string;
  autoSave: boolean;
  notificationsEnabled: boolean;
  performanceMode: boolean;
  gridSize: number;
  thumbnailSize: number;
}

export interface HistoryState {
  past: AppState[];
  present: AppState;
  future: AppState[];
  maxSize: number;
  currentIndex: number;
}

// Actions
export interface AppActions {
  // Project Actions
  createProject: (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setCurrentProject: (id: string | null) => void;
  
  // Result Actions
  addResult: (result: GeneratedResult) => void;
  updateResult: (id: string, updates: Partial<GeneratedResult>) => void;
  deleteResult: (id: string) => void;
  selectResult: (id: string) => void;
  deselectResult: (id: string) => void;
  clearSelectedResults: () => void;
  
  // UI Actions
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
  removeNotification: (id: string) => void;
  markNotificationAsRead: (id: string) => void;
  clearNotifications: () => void;
  
  // Settings Actions
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  // Undo/Redo Actions
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  // Batch Actions
  batchUpdate: (updates: (draft: Draft<AppState>) => void) => void;
  
  // Persistence Actions
  resetState: () => void;
  importState: (state: Partial<AppState>) => void;
  exportState: () => string;
}

// Initial State
const initialState: AppState = {
  projects: new Map(),
  currentProjectId: null,
  results: new Map(),
  selectedResultIds: new Set(),
  isLoading: false,
  error: null,
  notifications: [],
  settings: {
    theme: 'system',
    language: 'en',
    autoSave: true,
    notificationsEnabled: true,
    performanceMode: false,
    gridSize: 200,
    thumbnailSize: 150,
  },
  history: {
    past: [],
    present: {} as AppState,
    future: [],
    maxSize: 50,
    currentIndex: 0,
  },
};

// Store
export const useAppStore = create<AppState & AppActions>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Project Actions
        createProject: (project) => {
          const newProject: Project = {
            ...project,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            status: 'active',
          };
          
          set(
            produce((state: Draft<AppState>) => {
              state.projects.set(newProject.id, newProject);
              state.currentProjectId = newProject.id;
            }),
            false,
            'createProject'
          );
        },
        
        updateProject: (id, updates) => {
          set(
            produce((state: Draft<AppState>) => {
              const project = state.projects.get(id);
              if (project) {
                Object.assign(project, updates, {
                  updatedAt: new Date().toISOString(),
                });
              }
            }),
            false,
            'updateProject'
          );
        },
        
        deleteProject: (id) => {
          set(
            produce((state: Draft<AppState>) => {
              state.projects.delete(id);
              if (state.currentProjectId === id) {
                state.currentProjectId = null;
              }
            }),
            false,
            'deleteProject'
          );
        },
        
        setCurrentProject: (id) => {
          set(
            produce((state: Draft<AppState>) => {
              state.currentProjectId = id;
            }),
            false,
            'setCurrentProject'
          );
        },
        
        // Result Actions
        addResult: (result) => {
          set(
            produce((state: Draft<AppState>) => {
              state.results.set(result.taskId, result);
            }),
            false,
            'addResult'
          );
        },
        
        updateResult: (id, updates) => {
          set(
            produce((state: Draft<AppState>) => {
              const result = state.results.get(id);
              if (result) {
                Object.assign(result, updates);
              }
            }),
            false,
            'updateResult'
          );
        },
        
        deleteResult: (id) => {
          set(
            produce((state: Draft<AppState>) => {
              state.results.delete(id);
              state.selectedResultIds.delete(id);
            }),
            false,
            'deleteResult'
          );
        },
        
        selectResult: (id) => {
          set(
            produce((state: Draft<AppState>) => {
              state.selectedResultIds.add(id);
            }),
            false,
            'selectResult'
          );
        },
        
        deselectResult: (id) => {
          set(
            produce((state: Draft<AppState>) => {
              state.selectedResultIds.delete(id);
            }),
            false,
            'deselectResult'
          );
        },
        
        clearSelectedResults: () => {
          set(
            produce((state: Draft<AppState>) => {
              state.selectedResultIds.clear();
            }),
            false,
            'clearSelectedResults'
          );
        },
        
        // UI Actions
        setLoading: (isLoading) => {
          set(
            produce((state: Draft<AppState>) => {
              state.isLoading = isLoading;
            }),
            false,
            'setLoading'
          );
        },
        
        setError: (error) => {
          set(
            produce((state: Draft<AppState>) => {
              state.error = error;
            }),
            false,
            'setError'
          );
        },
        
        addNotification: (notification) => {
          const newNotification: Notification = {
            ...notification,
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            read: false,
          };
          
          set(
            produce((state: Draft<AppState>) => {
              state.notifications.unshift(newNotification);
              // Keep only last 100 notifications
              if (state.notifications.length > 100) {
                state.notifications = state.notifications.slice(0, 100);
              }
            }),
            false,
            'addNotification'
          );
        },
        
        removeNotification: (id) => {
          set(
            produce((state: Draft<AppState>) => {
              state.notifications = state.notifications.filter(
                (n) => n.id !== id
              );
            }),
            false,
            'removeNotification'
          );
        },
        
        markNotificationAsRead: (id) => {
          set(
            produce((state: Draft<AppState>) => {
              const notification = state.notifications.find((n) => n.id === id);
              if (notification) {
                notification.read = true;
              }
            }),
            false,
            'markNotificationAsRead'
          );
        },
        
        clearNotifications: () => {
          set(
            produce((state: Draft<AppState>) => {
              state.notifications = [];
            }),
            false,
            'clearNotifications'
          );
        },
        
        // Settings Actions
        updateSettings: (newSettings) => {
          set(
            produce((state: Draft<AppState>) => {
              Object.assign(state.settings, newSettings);
            }),
            false,
            'updateSettings'
          );
        },
        
        // Undo/Redo Actions
        undo: () => {
          const { past, present, future } = get().history;
          if (past.length === 0) return;
          
          const previous = past[past.length - 1];
          const newPast = past.slice(0, -1);
          
          set(
            produce((state: Draft<AppState>) => {
              state.history.past = newPast;
              state.history.present = { ...state } as AppState;
              state.history.future = [present, ...future];
              
              // Restore previous state
              Object.assign(state, previous);
            }),
            false,
            'undo'
          );
        },
        
        redo: () => {
          const { past, present, future } = get().history;
          if (future.length === 0) return;
          
          const next = future[0];
          const newFuture = future.slice(1);
          
          set(
            produce((state: Draft<AppState>) => {
              state.history.past = [...past, present];
              state.history.present = { ...state } as AppState;
              state.history.future = newFuture;
              
              // Restore next state
              Object.assign(state, next);
            }),
            false,
            'redo'
          );
        },
        
        canUndo: () => {
          return get().history.past.length > 0;
        },
        
        canRedo: () => {
          return get().history.future.length > 0;
        },
        
        // Batch Actions
        batchUpdate: (updates) => {
          set(
            produce((state: Draft<AppState>) => {
              updates(state);
            }),
            false,
            'batchUpdate'
          );
        },
        
        // Persistence Actions
        resetState: () => {
          set(initialState, true, 'resetState');
        },
        
        importState: (partialState) => {
          set(
            produce((state: Draft<AppState>) => {
              Object.assign(state, partialState);
              // Convert plain objects back to Maps/Sets
              if (partialState.projects && typeof partialState.projects === 'object') {
                state.projects = new Map(Object.entries(partialState.projects));
              }
              if (partialState.results && typeof partialState.results === 'object') {
                state.results = new Map(Object.entries(partialState.results));
              }
              if (partialState.selectedResultIds && Array.isArray(partialState.selectedResultIds)) {
                state.selectedResultIds = new Set(partialState.selectedResultIds);
              }
            }),
            false,
            'importState'
          );
        },
        
        exportState: () => {
          const state = get();
          const serializableState = {
            ...state,
            projects: Object.fromEntries(state.projects),
            results: Object.fromEntries(state.results),
            selectedResultIds: Array.from(state.selectedResultIds),
          };
          return JSON.stringify(serializableState, null, 2);
        },
      }),
      {
        name: 'storycore-app-storage',
        storage: createJSONStorage(() => localStorage),
        partialize: (state) => ({
          projects: Object.fromEntries(state.projects),
          results: Object.fromEntries(state.results),
          selectedResultIds: Array.from(state.selectedResultIds),
          currentProjectId: state.currentProjectId,
          settings: state.settings,
        }),
        onRehydrateStorage: () => (state) => {
          // Convert back to Maps/Sets after rehydration
          if (state) {
            if (state.projects && !(state.projects instanceof Map)) {
              state.projects = new Map(Object.entries(state.projects));
            }
            if (state.results && !(state.results instanceof Map)) {
              state.results = new Map(Object.entries(state.results));
            }
            if (state.selectedResultIds && !(state.selectedResultIds instanceof Set)) {
              state.selectedResultIds = new Set(state.selectedResultIds);
            }
          }
        },
      }
    )
  )
);

// Selectors for optimized reads
export const useProjects = () => useAppStore((state) => state.projects);
export const useCurrentProject = () =>
  useAppStore((state) =>
    state.currentProjectId ? state.projects.get(state.currentProjectId) : null
  );
export const useResults = () => useAppStore((state) => state.results);
export const useSelectedResults = () =>
  useAppStore((state) =>
    Array.from(state.selectedResultIds).map((id) => state.results.get(id)).filter(Boolean)
  );
export const useSettings = () => useAppStore((state) => state.settings);
export const useNotifications = () => useAppStore((state) => state.notifications);
export const useIsLoading = () => useAppStore((state) => state.isLoading);
export const useError = () => useAppStore((state) => state.error);

// Performance-optimized selectors
export const useProjectCount = () => useAppStore((state) => state.projects.size);
export const useResultCount = () => useAppStore((state) => state.results.size);
export const useSelectedResultCount = () => useAppStore((state) => state.selectedResultIds.size);
export const useActiveProjects = () =>
  useAppStore(
    (state) => Array.from(state.projects.values()).filter((p) => p.status === 'active'),
    (a, b) => a.length === b.length && a.every((p, i) => p.id === b[i].id)
  );
