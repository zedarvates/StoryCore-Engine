import { useEffect, useCallback } from 'react';
import { useStore } from '@/store';
import { useEditorStore } from '@/stores/editorStore';
import type { World } from '@/types/world';
import { toast } from '@/hooks/use-toast';

// ============================================================================
// World Persistence Hook
// ============================================================================

/**
 * Save a world to the project directory
 * Uses Electron API if available, otherwise falls back to file picker
 */
async function saveWorldToProjectDirectory(world: World, projectPath: string): Promise<void> {
  console.log('[useWorldPersistence] ============================================');
  console.log('[useWorldPersistence] Starting save to project directory...');
  console.log('[useWorldPersistence] projectPath:', projectPath);
  console.log('[useWorldPersistence] world.id:', world.id);
  console.log('[useWorldPersistence] world.name:', world.name);

  // Check if Electron API is available
  if (!window.electronAPI) {
    console.error('[useWorldPersistence] ERROR: Electron API not available');
    console.error('[useWorldPersistence] This function requires Electron to be running');
    throw new Error('Electron API not available - please run the application in Electron mode');
  }

  if (!window.electronAPI.fs) {
    console.error('[useWorldPersistence] ERROR: Electron FS API not available');
    throw new Error('Electron file system API not available');
  }

  const worldsDir = `${projectPath}/worlds`;
  const fileName = `world_${world.id}.json`;
  const filePath = `${worldsDir}/${fileName}`;

  console.log('[useWorldPersistence] Target file path:', filePath);
  console.log('[useWorldPersistence] Directory will be:', worldsDir);

  try {
    // Create worlds directory if it doesn't exist
    console.log('[useWorldPersistence] Ensuring worlds directory exists...');
    if (window.electronAPI.fs.mkdir) {
      try {
        console.log('[useWorldPersistence] Creating directory with recursive option...');
        await window.electronAPI.fs.mkdir(worldsDir, { recursive: true });
        console.log('[useWorldPersistence] ✓ Worlds directory created/verified successfully');
      } catch (mkdirError) {
        console.error('[useWorldPersistence] ERROR creating directory:', mkdirError);
        console.warn('[useWorldPersistence] Continuing despite mkdir error...');
      }
    } else {
      console.warn('[useWorldPersistence] WARN: mkdir function not available');
    }

    // Prepare world data for saving
    const worldData = {
      ...world,
      createdAt: typeof world.createdAt === 'number' ? world.createdAt : new Date(world.createdAt).getTime(),
      updatedAt: Date.now(),
      creation_timestamp: typeof world.createdAt === 'number' ? new Date(world.createdAt).toISOString() : String(world.createdAt),
    };

    console.log('[useWorldPersistence] World data prepared, size:', JSON.stringify(worldData).length, 'bytes');

    // Write world file
    console.log('[useWorldPersistence] Writing world file...');

    if (window.electronAPI.fs.writeFile) {
      try {
        const jsonContent = JSON.stringify(worldData, null, 2);
        console.log('[useWorldPersistence] JSON content length:', jsonContent.length, 'chars');

        await window.electronAPI.fs.writeFile(filePath, jsonContent);
        console.log('[useWorldPersistence] ✓ World file written successfully to:', filePath);
      } catch (writeError) {
        console.error('[useWorldPersistence] ERROR writing world file:', writeError);
        console.error('[useWorldPersistence] File path:', filePath);
        throw writeError;
      }
    } else {
      console.error('[useWorldPersistence] ERROR: writeFile function not available');
      throw new Error('writeFile function not available');
    }

    // Verify the file was created
    if (window.electronAPI.fs.exists) {
      try {
        const exists = await window.electronAPI.fs.exists(filePath);
        console.log('[useWorldPersistence] File exists check:', exists);
        if (!exists) {
          console.warn('[useWorldPersistence] WARN: File was not created despite no errors');
          console.warn('[useWorldPersistence] This might indicate a permission issue');
        } else {
          console.log('[useWorldPersistence] ✓ File verified on disk');
        }
      } catch (existsError) {
        console.warn('[useWorldPersistence] Could not verify file creation:', existsError);
      }
    }

    console.log(`[useWorldPersistence] ✓ World saved successfully to: ${filePath}`);
    console.log('[useWorldPersistence] ============================================');
  } catch (error) {
    console.error('[useWorldPersistence] ============================================');
    console.error('[useWorldPersistence] FAILED to save world to project directory');
    console.error('[useWorldPersistence] Error:', error);
    console.error('[useWorldPersistence] Project path:', projectPath);
    console.error('[useWorldPersistence] World ID:', world.id);
    console.error('[useWorldPersistence] World name:', world.name);
    console.error('[useWorldPersistence] ============================================');
    throw error;
  }
}

/**
 * Load all worlds from the project directory
 */
async function loadWorldsFromProjectDirectory(projectPath: string): Promise<World[]> {
  if (!window.electronAPI?.fs?.readdir) {
    throw new Error('Electron file system API not available');
  }

  const worldsDir = `${projectPath}/worlds`;
  const worlds: World[] = [];

  try {
    // Check if directory exists
    try {
      if (window.electronAPI.fs.exists) {
        const exists = await window.electronAPI.fs.exists(worldsDir);
        if (!exists) {
          // Directory doesn't exist, return empty array
          return worlds;
        }
      }
    } catch {
      // Directory doesn't exist, return empty array
      return worlds;
    }

    // Read directory contents
    const files = await window.electronAPI.fs.readdir(worldsDir);

    // Filter for world files
    const worldFiles = files.filter((file: string) =>
      file.startsWith('world_') && file.endsWith('.json')
    );

    console.log(`[useWorldPersistence] Found ${worldFiles.length} world files in project`);

    // Load each world file
    for (const file of worldFiles) {
      try {
        const filePath = `${worldsDir}/${file}`;
        // Read file (returns Uint8Array/Buffer via IPC)
        const rawContent = await window.electronAPI.fs.readFile(filePath);

        let contentString = '';

        // Handle Buffer/Uint8Array from Electron IPC
        if (typeof rawContent !== 'string') {
          try {
            // TextDecoder handles Uint8Array and ArrayBuffer
            contentString = new TextDecoder('utf-8').decode(rawContent as any);
          } catch (e) {
            console.warn(`[useWorldPersistence] Failed to decode content for ${file}, trying string conversion`, e);
            contentString = String(rawContent);
          }
        } else {
          contentString = rawContent;
        }

        const worldData = JSON.parse(contentString.trim());

        // Validate and convert dates to timestamps (number)
        const world: World = {
          ...worldData,
          createdAt: typeof worldData.createdAt === 'number' ? worldData.createdAt : new Date(worldData.createdAt).getTime(),
          updatedAt: typeof worldData.updatedAt === 'number' ? worldData.updatedAt : new Date(worldData.updatedAt).getTime(),
        };

        worlds.push(world);
      } catch (error) {
        console.error(`[useWorldPersistence] Failed to load world from ${file}:`, error);
      }
    }

    return worlds;
  } catch (error) {
    console.error('[useWorldPersistence] Failed to load worlds from project directory:', error);
    return worlds;
  }
}

/**
 * Delete a world from the project directory
 */
async function deleteWorldFromProjectDirectory(worldId: string, projectPath: string): Promise<void> {
  if (!window.electronAPI?.fs?.unlink) {
    throw new Error('Electron file system API not available');
  }

  const filePath = `${projectPath}/worlds/world_${worldId}.json`;

  try {
    await window.electronAPI.fs.unlink(filePath);
    console.log(`[useWorldPersistence] World deleted: ${filePath}`);
  } catch (error) {
    console.error('[useWorldPersistence] Failed to delete world file:', error);
    throw error;
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
  const projectPath = useEditorStore((state) => state.projectPath);

  /**
   * Save a world to localStorage and project directory
   */
  const saveWorld = useCallback(async (world: World): Promise<void> => {
    console.log('[useWorldPersistence] saveWorld called for:', world.name);
    console.log('[useWorldPersistence] projectPath:', projectPath);
    console.log('[useWorldPersistence] project:', project ? project.project_name : 'null');

    let localStorageSuccess = false;
    let projectDirectorySuccess = false;
    let errorMessages: string[] = [];

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
    if (projectPath) {
      console.log('[useWorldPersistence] Attempting to save to project directory...');
      console.log('[useWorldPersistence] Target path:', `${projectPath}/worlds/world_${world.id}.json`);

      // Verify Electron API availability
      if (!window.electronAPI) {
        const errorMsg = 'Electron API not available - cannot save to project folder';
        console.error('[useWorldPersistence]', errorMsg);
        errorMessages.push(errorMsg + '. Please run the application in Electron mode.');

        toast({
          title: 'Save Warning',
          description: errorMsg,
          variant: 'warning',
        });
      } else {
        try {
          await saveWorldToProjectDirectory(world, projectPath);
          projectDirectorySuccess = true;
          console.log('[useWorldPersistence] World saved to project directory successfully');

          toast({
            title: 'World Saved',
            description: `World "${world.name}" saved to: ${projectPath}/worlds/`,
          });
        } catch (error) {
          const errorMsg = `Failed to save to project folder: ${error instanceof Error ? error.message : 'Unknown error'}`;
          console.warn('[useWorldPersistence] Project directory save failed:', error);
          errorMessages.push(errorMsg);

          toast({
            title: 'Save Failed',
            description: errorMsg,
            variant: 'destructive',
          });
        }
      }
    } else {
      console.warn('[useWorldPersistence] No project path available');
      console.warn('[useWorldPersistence] NOTE: To save to project folder, open or create a project first');

      // Show helpful message when no project is open
      toast({
        title: 'No Project Open',
        description: 'World saved to localStorage. Open a project to save to disk.',
        variant: 'warning',
      });
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
  }, [project, projectPath]);

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
    if (projectPath) {
      try {
        await deleteWorldFromProjectDirectory(worldId, projectPath);
      } catch (error) {
        console.warn('[useWorldPersistence] Failed to delete from project directory:', error);
      }
    }

    // Remove from store
    removeWorld(worldId);
  }, [project, projectPath, removeWorld]);

  /**
   * Sync worlds from project directory to store
   */
  const syncWorldsFromProject = useCallback(async (): Promise<{ loaded: number; errors: number }> => {
    if (!projectPath) {
      console.log('[useWorldPersistence] No project path available for sync');
      return { loaded: 0, errors: 0 };
    }

    let loaded = 0;
    let errors = 0;

    try {
      const worlds = await loadWorldsFromProjectDirectory(projectPath);

      for (const world of worlds) {
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
          if (project) {
            const storageKey = `project-${project.project_name}-worlds`;
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
        toast({
          title: 'Worlds Synchronized',
          description: `Loaded ${loaded} world${loaded > 1 ? 's' : ''} from project directory`,
        });
      }

      return { loaded, errors };
    } catch (error) {
      console.error('[useWorldPersistence] Failed to sync worlds from project:', error);
      return { loaded, errors };
    }
  }, [projectPath, project, addWorld, updateWorld]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // Only re-run when project name changes - worlds/addWorld should not trigger reload
  }, [project?.project_name]);

  // Auto-sync from project directory when projectPath changes
  useEffect(() => {
    if (projectPath && project) {
      console.log('[useWorldPersistence] Project path changed, syncing worlds...');
      syncWorldsFromProject();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    // syncWorldsFromProject is a callback - only run when project path/name changes
  }, [projectPath, project?.project_name]);

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

