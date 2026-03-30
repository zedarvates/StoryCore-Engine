import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import { StorageManager } from '@/utils/storageManager';
import { UnifiedProjectStore, HistoryEntry } from './project/types';
import { createProjectSlice } from './project/projectSlice';
import { createTimelineSlice } from './project/timelineSlice';
import { createHistorySlice } from './project/historySlice';
import type { Project } from '@/types';

/**
 * Unified Project Store - Single Source of Truth
 * 
 * This store consolidates the disparate Zustand stores into a single, efficient,
 * and reliable state management system for the entire application.
 * 
 * It uses the Slice pattern for maintainability.
 */
export const useProjectStore = create<UnifiedProjectStore>()(
  devtools(
    persist(
      (set, get, api) => {
        // Create individual slices
        const projectSlice = createProjectSlice(set, get, api);
        const timelineSlice = createTimelineSlice(set, get, api);
        const historySlice = createHistorySlice(set, get, api);

        return {
          // Spread all slices to combine them
          ...projectSlice,
          ...timelineSlice,
          ...historySlice,

          // Common actions that need access to multiple slices
          saveProjectToDisk: async () => {
            const state = get();
            if (!state.project?.path) return { success: false, errors: ['No project path defined'] };
            
            try {
              const { EnhancedProjectStorage } = await import('@/utils/EnhancedProjectStorage');
              const storage = new EnhancedProjectStorage(state.project.path);
              
              // Reconstruct full project data from store slices
              const projectData: Project = {
                ...state.project,
                shots: state.shots,
                worlds: state.worlds,
                characters: state.characters,
                locations: state.locations,
                objects: state.objects,
                stories: state.stories,
                sequencePlans: state.sequencePlans,
              } as Project;

              const projectViewState = {
                selectedShotId: state.selectedShotId,
                currentTime: state.currentTime,
              };
              
              const result = await storage.save(projectData, projectViewState);
              return result as { success: boolean; errors: string[] };
            } catch (error) {
              console.error('[ProjectStore] Failed to save project:', error);
              return { success: false, errors: [String(error)] };
            }
          },

          // Implementation for pushHistory if needed at root level
          // (Usually called within slices, but exposed here as well)
          pushHistory: (entry: HistoryEntry) => {
            historySlice.pushHistory(entry);
          }
        } as UnifiedProjectStore;
      },
      {
        name: 'storycore-project-storage',
        storage: createJSONStorage(() => ({
          getItem: (name) => StorageManager.getItem(name),
          setItem: async (name, value) => { await StorageManager.setItem(name, value); },
          removeItem: async (name) => StorageManager.removeItem(name),
        })),
        // Selective persistence
        partialize: (state) => ({
          project: state.project,
          selectedShotId: state.selectedShotId,
          currentTime: state.currentTime,
          panelSizes: state.panelSizes,
          showChat: state.showChat,
          showTaskQueue: state.showTaskQueue,
        }),
      }
    )
  )
);
