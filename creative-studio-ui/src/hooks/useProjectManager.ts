import { useCallback } from 'react';
import { useStore } from '@/store';
import {
  createEmptyProject,
  createProjectOnDisk,
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
   * Creates a new empty project and saves it to disk
   */
  const createProject = useCallback(
    async (name: string) => {
      try {
        // First, create the project on disk via Electron IPC
        const createdProject = await createProjectOnDisk({ name });

        console.log('[useProjectManager] Project created on disk:', createdProject.path);

        // Then create the in-memory representation
        const newProject = createEmptyProject(name);
        setProject(newProject);

        // Add to recent projects with the actual disk path
        addRecentProject({
          id: createdProject.id,
          name: createdProject.name,
          path: createdProject.path,
        });

        return createdProject;
      } catch (error) {
        console.error('[useProjectManager] Failed to create project:', error);
        // Still create the in-memory project even if disk creation fails
        // (useful for development mode)
        const newProject = createEmptyProject(name);
        setProject(newProject);
        throw error;
      }
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
          path: '', // Will be updated when project is saved to disk
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

    // Update recent projects (path will be empty since we're just downloading)
    addRecentProject({
      name: project.project_name,
      path: '',
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

