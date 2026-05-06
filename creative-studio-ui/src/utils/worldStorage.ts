/**
 * World Storage Utilities
 * 
 * Provides functions to save and load world data as JSON files in project directories.
 * Worlds are stored in: ./projects/{project_id}/worlds/{world_name}/world.json
 */

import type { World } from '@/types/world';

/**
 * Save result interface
 */
export interface SaveWorldResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

/**
 * Sanitize a name for use as a folder name
 */
function sanitizeFolderName(name: string): string {
  return name
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_') // Replace invalid characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 100); // Limit length
}

/**
 * Saves a world to the project's worlds directory
 * Creates a folder with the world's name and stores world.json inside
 * 
 * @param projectId - The project ID
 * @param worldId - The world UUID
 * @param worldData - The world data to save
 * @returns Promise<SaveWorldResult>
 */
export async function saveWorldToProject(
  projectId: string,
  worldId: string,
  worldData: World
): Promise<SaveWorldResult> {
  try {
    // Validate required fields
    if (!worldId) {
      return { success: false, error: 'World ID is required' };
    }

    if (!worldData.name) {
      return { success: false, error: 'World name is required' };
    }

    const sanitizedName = sanitizeFolderName(worldData.name);

    // Check if Electron API is available
    if (!window.electronAPI?.fs) {
      console.warn('[worldStorage] Electron API not available, falling back to localStorage');

      // Fallback: Save to localStorage
      const key = `project-${projectId}-worlds`;
      const existingWorlds = JSON.parse(localStorage.getItem(key) || '{}');
      existingWorlds[worldId] = worldData;
      localStorage.setItem(key, JSON.stringify(existingWorlds));

      return {
        success: true,
        filePath: `localStorage://${projectId}/worlds/${sanitizedName}/world.json`
      };
    }

    // Build file path with world name as folder
    const baseDir = (projectId.includes(':') || projectId.startsWith('/') || projectId.startsWith('\\'))
      ? projectId
      : `./projects/${projectId}`;
    const worldDir = `${baseDir}/worlds/${sanitizedName}`;
    const filePath = `${worldDir}/world.json`;

    // Ensure directory exists
    if (window.electronAPI.fs.mkdir) {
      await window.electronAPI.fs.mkdir(worldDir, { recursive: true });
    }

    // Create JSON content
    const jsonData = JSON.stringify(worldData, null, 2);

    // Write file
    await window.electronAPI.fs.writeFile(filePath, jsonData);

    console.log(`[worldStorage] World saved: ${filePath}`);

    return { success: true, filePath };
  } catch (error) {
    console.error('[worldStorage] Failed to save world:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Loads a world from a project file
 */
export async function loadWorldFromProject(
  projectId: string,
  worldId: string
): Promise<World | null> {
  try {
    if (!window.electronAPI?.fs) {
      // Fallback to localStorage
      const key = `project-${projectId}-worlds`;
      const existingWorlds = JSON.parse(localStorage.getItem(key) || '{}');
      return existingWorlds[worldId] || null;
    }

    const worldsBaseDir = (projectId.includes(':') || projectId.startsWith('/') || projectId.startsWith('\\'))
      ? `${projectId}/worlds`
      : `./projects/${projectId}/worlds`;

    // List all world folders
    const folders = await window.electronAPI.fs.readdir(worldsBaseDir);

    // Search for world.json in each folder
    for (const folder of folders) {
      const filePath = `${worldsBaseDir}/${folder}/world.json`;
      
      try {
        const exists = await window.electronAPI.fs.exists(filePath);
        if (!exists) continue;

        const fileContent = await window.electronAPI.fs.readFile(filePath);
        const decoder = new TextDecoder();
        const jsonData = decoder.decode(fileContent);
        const world = JSON.parse(jsonData) as World;

        // Check if this is the world we're looking for
        if (world.id === worldId) {
          return world;
        }
      } catch (error) {
        console.warn(`[worldStorage] Failed to read world from ${folder}:`, error);
      }
    }

    return null;
  } catch (error) {
    console.error('[worldStorage] Failed to load world:', error);
    return null;
  }
}

/**
 * Lists all worlds in a project
 */
export async function listWorldsInProject(
  projectId: string
): Promise<string[]> {
  try {
    if (!window.electronAPI?.fs) {
      // Fallback to localStorage
      const key = `project-${projectId}-worlds`;
      const existingWorlds = JSON.parse(localStorage.getItem(key) || '{}');
      return Object.keys(existingWorlds);
    }

    const worldsDir = (projectId.includes(':') || projectId.startsWith('/') || projectId.startsWith('\\'))
      ? `${projectId}/worlds`
      : `./projects/${projectId}/worlds`;

    const exists = await window.electronAPI.fs.exists(worldsDir);
    if (!exists) {
      return [];
    }

    const folders = await window.electronAPI.fs.readdir(worldsDir);
    const worldIds: string[] = [];

    // Read world.json from each folder to get the ID
    for (const folder of folders) {
      const filePath = `${worldsDir}/${folder}/world.json`;
      
      try {
        const exists = await window.electronAPI.fs.exists(filePath);
        if (!exists) continue;

        const fileContent = await window.electronAPI.fs.readFile(filePath);
        const decoder = new TextDecoder();
        const jsonData = decoder.decode(fileContent);
        const world = JSON.parse(jsonData) as World;
        
        worldIds.push(world.id);
      } catch (error) {
        console.warn(`[worldStorage] Failed to read world from ${folder}:`, error);
      }
    }

    return worldIds;
  } catch (error) {
    console.error('[worldStorage] Failed to list worlds:', error);
    return [];
  }
}

/**
 * Recursively delete a directory and all its contents
 */
async function deleteDirectoryRecursive(dirPath: string): Promise<void> {
  if (!window.electronAPI?.fs) {
    throw new Error('Electron API not available');
  }

  try {
    const exists = await window.electronAPI.fs.exists(dirPath);
    if (!exists) return;

    const items = await window.electronAPI.fs.readdir(dirPath);

    // Delete all files and subdirectories
    for (const item of items) {
      const itemPath = `${dirPath}/${item}`;
      const stats = await window.electronAPI.fs.stat(itemPath);

      if (stats.isDirectory) {
        // Recursively delete subdirectory
        await deleteDirectoryRecursive(itemPath);
      } else {
        // Delete file
        await window.electronAPI.fs.unlink(itemPath);
      }
    }

    console.log(`[worldStorage] Deleted directory: ${dirPath}`);
  } catch (error) {
    console.error(`[worldStorage] Failed to delete directory ${dirPath}:`, error);
    throw error;
  }
}

/**
 * Deletes a world from the project
 */
export async function deleteWorldFromProject(
  projectId: string,
  worldId: string
): Promise<boolean> {
  try {
    if (!window.electronAPI?.fs) {
      // Fallback to localStorage
      const key = `project-${projectId}-worlds`;
      const existingWorlds = JSON.parse(localStorage.getItem(key) || '{}');
      delete existingWorlds[worldId];
      localStorage.setItem(key, JSON.stringify(existingWorlds));
      return true;
    }

    const worldsBaseDir = (projectId.includes(':') || projectId.startsWith('/') || projectId.startsWith('\\'))
      ? `${projectId}/worlds`
      : `./projects/${projectId}/worlds`;
    const folders = await window.electronAPI.fs.readdir(worldsBaseDir);

    // Find the folder containing this world
    for (const folder of folders) {
      const filePath = `${worldsBaseDir}/${folder}/world.json`;
      
      try {
        const exists = await window.electronAPI.fs.exists(filePath);
        if (!exists) continue;

        const fileContent = await window.electronAPI.fs.readFile(filePath);
        const decoder = new TextDecoder();
        const jsonData = decoder.decode(fileContent);
        const world = JSON.parse(jsonData) as World;

        if (world.id === worldId) {
          // Delete the entire folder recursively
          const folderPath = `${worldsBaseDir}/${folder}`;
          await deleteDirectoryRecursive(folderPath);
          return true;
        }
      } catch (error) {
        console.warn(`[worldStorage] Failed to check world in ${folder}:`, error);
      }
    }

    return false;
  } catch (error) {
    console.error('[worldStorage] Failed to delete world:', error);
    return false;
  }
}
