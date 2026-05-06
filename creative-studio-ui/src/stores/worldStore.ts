import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { World } from '@/types/world';
import { 
  listWorldsInProject, 
  loadWorldFromProject, 
  saveWorldToProject, 
  deleteWorldFromProject 
} from '@/utils/worldStorage';

interface WorldState {
  worlds: World[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchProjectWorlds: (projectId: string) => Promise<void>;
  addWorld: (projectId: string, world: World) => Promise<void>;
  updateWorld: (projectId: string, world: World) => Promise<void>;
  removeWorld: (projectId: string, worldId: string) => Promise<void>;
}

export const useWorldStore = create<WorldState>()(
  devtools(
    (set, _get) => ({
      worlds: [],
      isLoading: false,
      error: null,

      fetchProjectWorlds: async (projectId) => {
        set({ isLoading: true, error: null });
        try {
          const worldIds = await listWorldsInProject(projectId);
          const loadedWorlds: World[] = [];

          for (const id of worldIds) {
            const world = await loadWorldFromProject(projectId, id);
            if (world) loadedWorlds.push(world);
          }

          set({ worlds: loadedWorlds, isLoading: false });
        } catch (error) {
          console.error('Failed to fetch project worlds:', error);
          set({ error: 'Failed to load worlds', isLoading: false });
        }
      },

      addWorld: async (projectId, world) => {
        try {
          await saveWorldToProject(projectId, world.id, world);
          set((state) => ({
            worlds: [...state.worlds, world]
          }));
        } catch (error) {
          console.error('Failed to add world:', error);
          throw error;
        }
      },

      updateWorld: async (projectId, world) => {
        try {
          await saveWorldToProject(projectId, world.id, world);
          set((state) => ({
            worlds: state.worlds.map(w => w.id === world.id ? world : w)
          }));
        } catch (error) {
          console.error('Failed to update world:', error);
          throw error;
        }
      },

      removeWorld: async (projectId, worldId) => {
        try {
          await deleteWorldFromProject(projectId, worldId);
          set((state) => ({
            worlds: state.worlds.filter(w => w.id !== worldId)
          }));
        } catch (error) {
          console.error('Failed to remove world:', error);
          throw error;
        }
      },
    }),
    { name: 'WorldStore' }
  )
);
