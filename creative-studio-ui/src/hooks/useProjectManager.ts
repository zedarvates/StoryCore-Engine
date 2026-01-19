import { useCallback } from 'react';
import { useStore } from '@/store';
import {
  createEmptyProject,
  loadProjectFromFile,
  downloadProject,
  addRecentProject,
} from '@/utils/projectManager';

/**
 * Hook for managing project operations (save, load, create)
 */
export function useProjectManager() {
  const project = useStore((state) => state.project);
  const setProject = useStore((state) => state.setProject);
  const shots = useStore((state) => state.shots);
  const assets = useStore((state) => state.assets);

  /**
   * Creates a new empty project
   */
  const createProject = useCallback(
    (name: string) => {
      const newProject = createEmptyProject(name);
      setProject(newProject);

      // Add to recent projects
      addRecentProject({
        name,
        lastOpened: new Date().toISOString(),
      });

      return newProject;
    },
    [setProject]
  );

  /**
   * Loads a project from a file
   */
  const loadProject = useCallback(
    async (file: File) => {
      try {
        const loadedProject = await loadProjectFromFile(file);
        setProject(loadedProject);

        // Add to recent projects
        addRecentProject({
          name: loadedProject.project_name,
          lastOpened: new Date().toISOString(),
        });

        return loadedProject;
      } catch (error) {
        console.error('Failed to load project:', error);
        throw error;
      }
    },
    [setProject]
  );

  /**
   * Saves the current project to a file
   */
  const saveProject = useCallback(() => {
    if (!project) {
      throw new Error('No project to save');
    }

    // Update project with current shots and assets
    const updatedProject = {
      ...project,
      shots,
      assets,
      metadata: {
        ...project.metadata,
        updated_at: new Date().toISOString(),
      },
    };

    downloadProject(updatedProject);

    // Update recent projects
    addRecentProject({
      name: project.project_name,
      lastOpened: new Date().toISOString(),
    });
  }, [project, shots, assets]);

  /**
   * Closes the current project
   */
  const closeProject = useCallback(() => {
    setProject(null);
  }, [setProject]);

  return {
    project,
    createProject,
    loadProject,
    saveProject,
    closeProject,
  };
}
