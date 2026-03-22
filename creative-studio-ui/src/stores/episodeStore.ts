import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Episode } from '../types';

interface EpisodeState {
  episodes: Episode[];
  activeEpisodeId: string | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  setEpisodes: (episodes: Episode[]) => void;
  fetchEpisodes: (projectId: string) => Promise<void>;
  addEpisode: (episode: Episode) => Promise<void>;
  updateEpisode: (id: string, updates: Partial<Episode>) => void;
  deleteEpisode: (id: string) => void;
  setActiveEpisode: (id: string | null) => void;
  
  // Helpers
  getEpisodeById: (id: string) => Episode | undefined;
  getActiveEpisode: () => Episode | undefined;
}

export const useEpisodeStore = create<EpisodeState>()(
  persist(
    (set, get) => ({
      episodes: [],
      activeEpisodeId: null,
      loading: false,
      error: null,

      setEpisodes: (episodes) => set({ episodes }),

      fetchEpisodes: async (projectId) => {
        if (!projectId) return;
        set({ loading: true });
        try {
          // If in Electron, we don't use the /api/ episodes endpoint
          if (window.electronAPI) {
            console.log('[EpisodeStore] Skipping remote fetch in Electron mode');
            set({ loading: false });
            return;
          }

          const response = await fetch(`/api/series/project/${projectId}/episodes`);
          if (response.ok) {
            const data = await response.json();
            set({ episodes: data });
          }
        } catch (_error) {
          console.warn('[EpisodeStore] Failed to fetch episodes:', _error);
          set({ error: 'Failed to fetch episodes' });
        } finally {
          set({ loading: false });
        }
      },

      addEpisode: async (episode) => {
        set({ loading: true });
        try {
          const response = await fetch('/api/series/episodes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(episode)
          });
          if (response.ok) {
            const newEp = await response.json();
            set((state) => ({ 
              episodes: [...state.episodes, { ...episode, id: newEp.id }] 
            }));
          }
        } catch (_error) {
          set({ error: 'Failed to add episode' });
        } finally {
          set({ loading: false });
        }
      },

      updateEpisode: (id, updates) => set((state) => ({
        episodes: state.episodes.map((ep) => 
          ep.id === id ? { ...ep, ...updates, updated_at: new Date().toISOString() } : ep
        )
      })),

      deleteEpisode: (id) => set((state) => ({
        episodes: state.episodes.filter((ep) => ep.id !== id),
        activeEpisodeId: state.activeEpisodeId === id ? null : state.activeEpisodeId
      })),

      setActiveEpisode: (id) => set({ activeEpisodeId: id }),

      getEpisodeById: (id) => get().episodes.find((ep) => ep.id === id),

      getActiveEpisode: () => {
        const { episodes, activeEpisodeId } = get();
        return episodes.find((ep) => ep.id === activeEpisodeId);
      },
    }),
    {
      name: 'storycore-episode-storage',
    }
  )
);
