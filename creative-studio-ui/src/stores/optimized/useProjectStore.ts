/**
 * Memoized Selectors for Zustand Stores
 * 
 * Requirements: 84
 * Performance Level: 🟡 HAUTE
 * 
 * Optimized selectors to prevent unnecessary re-renders
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { useShallow } from 'zustand/react/shallow';

// Example store with memoized selectors
interface ProjectState {
  projects: any[];
  selectedProjectId: string | null;
  filters: {
    status: string;
    type: string;
    search: string;
  };
  
  // Actions
  setProjects: (projects: any[]) => void;
  selectProject: (id: string | null) => void;
  setFilters: (filters: Partial<ProjectState['filters']>) => void;
}

export const useProjectStore = create<ProjectState>()(
  immer((set, get) => ({
    projects: [],
    selectedProjectId: null,
    filters: {
      status: 'all',
      type: 'all',
      search: '',
    },

    setProjects: (projects) => set({ projects }),
    selectProject: (id) => set({ selectedProjectId: id }),
    setFilters: (filters) => 
      set((state) => ({ 
        filters: { ...state.filters, ...filters } 
      })),
  }))
);

// Memoized selectors
export const useFilteredProjects = () => {
  return useProjectStore(
    useShallow((state) => {
      const { projects, filters } = state;
      
      return projects.filter((project) => {
        if (filters.status !== 'all' && project.status !== filters.status) {
          return false;
        }
        
        if (filters.type !== 'all' && project.type !== filters.type) {
          return false;
        }
        
        if (filters.search) {
          const search = filters.search.toLowerCase();
          return (
            project.name?.toLowerCase().includes(search) ||
            project.description?.toLowerCase().includes(search)
          );
        }
        
        return true;
      });
    })
  );
};

export const useSelectedProject = () => {
  return useProjectStore(
    useShallow((state) => 
      state.projects.find((p) => p.id === state.selectedProjectId))
  );
};

export const useProjectStats = () => {
  return useProjectStore(
    useShallow((state) => {
      const { projects } = state;
      
      return {
        total: projects.length,
        active: projects.filter((p) => p.status === 'active').length,
        completed: projects.filter((p) => p.status === 'completed').length,
        onHold: projects.filter((p) => p.status === 'on_hold').length,
      };
    })
  );
};

// Selector creator for derived state
export const createProjectSelector = <T,>(
  selector: (state: ProjectState) => T
) => {
  return (state: ProjectState) => selector(state);
};

// Example usage in components:
// const filteredProjects = useFilteredProjects();
// const selectedProject = useSelectedProject();
// const stats = useProjectStats();
