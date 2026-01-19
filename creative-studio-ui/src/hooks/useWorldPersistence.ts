import { useEffect } from 'react';
import { useStore } from '@/store';
import type { World } from '@/types/world';

// ============================================================================
// World Persistence Hook
// ============================================================================

/**
 * Hook to load and persist worlds from/to localStorage
 * Automatically loads worlds when project changes
 */
export function useWorldPersistence() {
  const project = useStore((state) => state.project);
  const worlds = useStore((state) => state.worlds);
  const addWorld = useStore((state) => state.addWorld);

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
        
        // Convert date strings back to Date objects
        const worldsWithDates = parsedWorlds.map((world) => ({
          ...world,
          createdAt: new Date(world.createdAt),
          updatedAt: new Date(world.updatedAt),
        }));

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
  }, [project?.project_name]); // Only re-run when project name changes

  return {
    worlds,
    project,
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
              createdAt: new Date(world.createdAt),
              updatedAt: new Date(),
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
