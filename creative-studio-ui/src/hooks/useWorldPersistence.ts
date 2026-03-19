import { useEffect, useCallback } from 'react';
import { useStore } from '@/store';
// import { useEditorStore } from '@/stores/editorStore';
// import { useAppStore } from '@/stores/useAppStore';
import type { World } from '@/types/world';
import { toast } from '@/utils/toast';
import { 
  saveWorldToProject, 
  loadWorldFromProject, 
  listWorldsInProject,
  deleteWorldFromProject 
} from '@/utils/worldStorage';

// ============================================================================
// World Persistence Hook
// ============================================================================

/**
 * Save a world to the project directory
 * Uses the new worldStorage utility
 */
async function saveWorldToProjectDirectory(world: World, projectId: string): Promise<void> {
  console.log('[useWorldPersistence] ============================================');
  console.log('[useWorldPersistence] Starting save to project directory...');
  console.log('[useWorldPersistence] projectId:', projectId);
  console.log('[useWorldPersistence] world.id:', world.id);
  console.log('[useWorldPersistence] world.name:', world.name);

  try {
    const result = await saveWorldToProject(projectId, world.id, world);
    
    if (!result.success) {
      throw new Error(result.error || 'Failed to save world');
    }
    
    console.log(`[useWorldPersistence] ✓ World saved successfully to: ${result.filePath}`);
    console.log('[useWorldPersistence] ============================================');
  } catch (error) {
    console.error('[useWorldPersistence] ============================================');
    console.error('[useWorldPersistence] FAILED to save world to project directory');
    console.error('[useWorldPersistence] Error:', error);
    console.error('[useWorldPersistence] Project ID:', projectId);
    console.error('[useWorldPersistence] World ID:', world.id);
    console.error('[useWorldPersistence] World name:', world.name);
    console.error('[useWorldPersistence] ============================================');
    throw error;
  }
}

/**
 * Load all worlds from the project directory
 */
async function loadWorldsFromProjectDirectory(projectId: string): Promise<World[]> {
  try {
    const worldIds = await listWorldsInProject(projectId);
    const worlds: World[] = [];

    for (const worldId of worldIds) {
      const world = await loadWorldFromProject(projectId, worldId);
      if (world) {
        worlds.push(world);
      }
    }

    return worlds;
  } catch (error) {
    console.error('[useWorldPersistence] Failed to load worlds from project directory:', error);
    return [];
  }
}

/**
 * Hook to load and persist worlds from/to localStorage and project directory
 * Automatically loads worlds when project changes and saves to project directory
 */
export function useWorldPersistence() {
  const project = useStore((state) => state.project);
  const worlds = useStore((state) => state.worlds);
  const addWorld = useStore((state) => state.addWorld);
  const updateWorld = useStore((state) => state.updateWorld);
  const removeWorld = useStore((state) => state.deleteWorld);
  const projectId = project?.path || project?.id;

  /**
   * Save a world to localStorage and project directory
   */
  const saveWorld = useCallback(async (world: World): Promise<void> => {
    console.log('[useWorldPersistence] saveWorld called for:', world.name);
    console.log('[useWorldPersistence] projectId:', projectId);
    console.log('[useWorldPersistence] project:', project ? project.project_name : 'null');

    let localStorageSuccess = false;
    let projectDirectorySuccess = false;
    const errorMessages: string[] = [];

    // Save to localStorage
    if (project) {
      const storageKey = `project-${project.project_name}-worlds`;
      try {
        const existingWorlds = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const worldIndex = existingWorlds.findIndex((w: World) => w.id === world.id);

        const worldData = {
          ...world,
          createdAt: typeof world.createdAt === 'number' ? world.createdAt : new Date(world.createdAt).getTime(),
          updatedAt: Date.now(),
          creation_timestamp: typeof world.createdAt === 'number' ? new Date(world.createdAt).toISOString() : String(world.createdAt),
        };

        if (worldIndex >= 0) {
          existingWorlds[worldIndex] = worldData;
        } else {
          existingWorlds.push(worldData);
        }

        localStorage.setItem(storageKey, JSON.stringify(existingWorlds));
        localStorageSuccess = true;
        console.log('[useWorldPersistence] World saved to localStorage successfully');
      } catch (error) {
        const errorMsg = 'Failed to save world to localStorage';
        console.error('[useWorldPersistence]', errorMsg, error);
        errorMessages.push(errorMsg);
      }
    } else {
      console.warn('[useWorldPersistence] No project in store, localStorage save skipped');
    }

    // Save to project directory if available
    if (projectId) {
      console.log('[useWorldPersistence] Attempting to save to project directory...');
      console.log('[useWorldPersistence] Target path:', `./projects/${projectId}/worlds/${world.id}.json`);

      try {
        await saveWorldToProjectDirectory(world, projectId);
        projectDirectorySuccess = true;
        console.log('[useWorldPersistence] World saved to project directory successfully');

        toast.success(
          'World Saved',
          `World "${world.name}" saved to project`
        );
      } catch (error) {
        const errorMsg = `Failed to save to project folder: ${error instanceof Error ? error.message : 'Unknown error'}`;
        console.warn('[useWorldPersistence] Project directory save failed:', error);
        errorMessages.push(errorMsg);

        toast.error(
          'Save Failed',
          errorMsg
        );
      }
    } else {
      console.warn('[useWorldPersistence] No project ID available');
      console.warn('[useWorldPersistence] NOTE: To save to project folder, open or create a project first');

      // Show helpful message when no project is open
      toast.warning(
        'No Project Open',
        'World saved to localStorage. Open a project to save to disk.'
      );
    }

    // Summary
    console.log('[useWorldPersistence] Save summary:', {
      localStorage: localStorageSuccess ? 'success' : 'failed/skipped',
      projectDirectory: projectDirectorySuccess ? 'success' : 'failed/skipped',
      errors: errorMessages,
    });

    // Throw error if nothing was saved
    if (!localStorageSuccess && !projectDirectorySuccess) {
      throw new Error('World could not be saved anywhere. Check console for details.');
    }
  }, [project, projectId]);

  /**
   * Delete a world from localStorage and project directory
   */
  const deleteWorld = useCallback(async (worldId: string): Promise<void> => {
    // Remove from localStorage
    if (project) {
      const storageKey = `project-${project.project_name}-worlds`;
      try {
        const existingWorlds = JSON.parse(localStorage.getItem(storageKey) || '[]');
        const updatedWorlds = existingWorlds.filter((w: World) => w.id !== worldId);
        localStorage.setItem(storageKey, JSON.stringify(updatedWorlds));
      } catch (error) {
        console.error('Failed to remove world from localStorage:', error);
      }
    }

    // Remove from project directory if available
    if (projectId) {
      try {
        await deleteWorldFromProject(projectId, worldId);
      } catch (error) {
        console.warn('[useWorldPersistence] Failed to delete from project directory:', error);
      }
    }

    // Remove from store
    removeWorld(worldId);
  }, [project, projectId, removeWorld]);

  /**
   * Sync worlds from project directory to store
   */
  const syncWorldsFromProject = useCallback(async (): Promise<{ loaded: number; errors: number }> => {
    const currentState = useStore.getState();
    const currentProject = currentState.project;
    const currentProjectId = currentProject?.path || currentProject?.id;

    if (!currentProjectId) {
      console.log('[useWorldPersistence] No project path available for sync');
      return { loaded: 0, errors: 0 };
    }

    let loaded = 0;
    let errors = 0;

    try {
      const worldsList = await loadWorldsFromProjectDirectory(currentProjectId);

      for (const world of worldsList) {
        try {
          // Check if world already exists in store
          const existingWorlds = useStore.getState().worlds;
          const existingIndex = existingWorlds.findIndex((w) => w.id === world.id);

          if (existingIndex >= 0) {
            // Update existing world
            updateWorld(world.id, world);
          } else {
            // Add new world
            addWorld(world);
          }

          // Also save to localStorage
          if (currentProject) {
            const storageKey = `project-${currentProject.project_name}-worlds`;
            const existingWorldsStorage = JSON.parse(localStorage.getItem(storageKey) || '[]');
            const worldIndex = existingWorldsStorage.findIndex((w: World) => w.id === world.id);
            const worldData = {
              ...world,
              createdAt: typeof world.createdAt === 'number' ? world.createdAt : new Date(world.createdAt).getTime(),
              updatedAt: Date.now(),
              creation_timestamp: typeof world.createdAt === 'number' ? new Date(world.createdAt).toISOString() : String(world.createdAt),
            };

            if (worldIndex >= 0) {
              existingWorldsStorage[worldIndex] = worldData;
            } else {
              existingWorldsStorage.push(worldData);
            }
            localStorage.setItem(storageKey, JSON.stringify(existingWorldsStorage));
          }

          loaded++;
        } catch (error) {
          console.error(`[useWorldPersistence] Failed to sync world ${world.id}:`, error);
          errors++;
        }
      }

      if (loaded > 0) {
        toast.success(
          'Worlds Synchronized',
          `Loaded ${loaded} world${loaded > 1 ? 's' : ''} from project directory`
        );
      }

      return { loaded, errors };
    } catch (error) {
      console.error('[useWorldPersistence] Failed to sync worlds from project:', error);
      return { loaded, errors };
    }
  }, [addWorld, updateWorld]);

  // Load worlds from localStorage when project changes
  useEffect(() => {
    if (!project) {
      return;
    }

    const storageKey = `project-${project.project_name}-worlds`;

    try {
      const storedWorlds = localStorage.getItem(storageKey);

      if (storedWorlds) {
        const parsedWorlds: World[] = JSON.parse(storedWorlds);

        // Ensure timestamps are numbers
        const worldsWithDates = parsedWorlds.map((world) => ({
          ...world,
          createdAt: typeof world.createdAt === 'number' ? world.createdAt : new Date(world.createdAt).getTime(),
          updatedAt: typeof world.updatedAt === 'number' ? world.updatedAt : new Date(world.updatedAt).getTime(),
        }));

        console.log(`[useWorldPersistence] Loaded ${worldsWithDates.length} worlds from localStorage`);

        // Only load if store doesn't already have these worlds
        if (worlds.length === 0) {
          worldsWithDates.forEach((world) => {
            addWorld(world);
          });
        }
      }
    } catch (error) {
      console.error('Failed to load worlds from localStorage:', error);
    }
     
    // Only re-run when project name changes - worlds/addWorld should not trigger reload
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.project_name]);

  // Auto-sync from project directory when projectId changes
  useEffect(() => {
    if (projectId && project) {
      console.log('[useWorldPersistence] Project path changed, syncing worlds...');
      syncWorldsFromProject();
    }
     
    // syncWorldsFromProject is a callback - only run when project path/name changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, project?.project_name, syncWorldsFromProject]);

  return {
    worlds,
    project,
    saveWorld,
    deleteWorld,
    syncWorldsFromProject,
  };
}

/**
 * Hook to export worlds to JSON
 */
export function useWorldExport() {
  const worlds = useStore((state) => state.worlds);

  const exportWorlds = () => {
    const dataStr = JSON.stringify(worlds, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `worlds-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportWorld = (worldId: string) => {
    const world = worlds.find((w) => w.id === worldId);
    if (!world) {
      console.error('World not found:', worldId);
      return;
    }

    const dataStr = JSON.stringify(world, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `world-${world.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return {
    exportWorlds,
    exportWorld,
  };
}

/**
 * Hook to import worlds from JSON
 */
export function useWorldImport() {
  const addWorld = useStore((state) => state.addWorld);

  const importWorlds = (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const data = JSON.parse(content);

          // Handle both single world and array of worlds
          const worldsToImport: World[] = Array.isArray(data) ? data : [data];

          worldsToImport.forEach((world) => {
            // Generate new ID to avoid conflicts
            const importedWorld: World = {
              ...world,
              id: crypto.randomUUID(),
              createdAt: typeof world.createdAt === 'number' ? world.createdAt : (world.createdAt ? new Date(world.createdAt).getTime() : Date.now()),
              updatedAt: Date.now(),
            };

            addWorld(importedWorld);
          });

          resolve();
        } catch (error) {
          reject(new Error('Failed to parse world data: ' + (error as Error).message));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsText(file);
    });
  };

  return {
    importWorlds,
  };
}

/**
 * Hook to clear all worlds (with confirmation)
 */
export function useWorldClear() {
  const project = useStore((state) => state.project);
  const worlds = useStore((state) => state.worlds);
  const deleteWorld = useStore((state) => state.deleteWorld);

  const clearAllWorlds = () => {
    if (!project) {
      return;
    }

    // Delete all worlds
    worlds.forEach((world) => {
      deleteWorld(world.id);
    });

    // Clear localStorage
    const storageKey = `project-${project.project_name}-worlds`;
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Failed to clear worlds from localStorage:', error);
    }
  };

  return {
    clearAllWorlds,
    worldCount: worlds.length,
  };
}

