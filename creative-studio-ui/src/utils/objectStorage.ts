/**
 * Object Storage Utilities
 * 
 * Provides functions to save and load story object data as JSON files in project directories.
 * Objects are stored in: ./projects/{project_id}/objects/{object_name}/object.json
 */

import type { StoryObject } from '@/types/object';

/**
 * Save result interface
 */
export interface SaveObjectResult {
    success: boolean;
    filePath?: string;
    error?: string;
}

/**
 * Sanitize a name for use as a folder name
 */
function sanitizeFolderName(name: string): string {
  return name
    // eslint-disable-next-line no-control-regex
    .trim()
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_') // Replace invalid characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 100); // Limit length
}

/**
 * Get the base directory for objects within a project.
 * Handles both absolute paths (for testing/dev) and relative paths.
 */
function getObjectsDir(projectId: string): string {
  // If it's an absolute path (e.g., C:\path or /path)
  if (projectId.match(/^[a-zA-Z]:[\\/]/) || projectId.startsWith('/')) {
    return `${projectId}/objects`;
  }
  // Otherwise, use the relative project path
  return `./projects/${projectId}/objects`;
}

/**
 * Saves an object to the project's objects directory
 * Creates a folder with the object's name and stores object.json inside
 * 
 * @param projectId - The project ID
 * @param objectId - The object UUID
 * @param objectData - The object data to save
 * @returns Promise<SaveObjectResult>
 */
export async function saveObjectToProject(
    projectId: string,
    objectId: string,
    objectData: StoryObject
): Promise<SaveObjectResult> {
    try {
        // Validate required fields
        if (!objectId) {
            return { success: false, error: 'Object ID is required' };
        }

        if (!objectData.name) {
            return { success: false, error: 'Object name is required' };
        }

        const sanitizedName = sanitizeFolderName(objectData.name);

        // Check if Electron API is available
        if (!window.electronAPI?.fs) {
            console.warn('[objectStorage] Electron API not available, falling back to localStorage');

            // Fallback: Save to localStorage
            const key = `project-${projectId}-objects`;
            const existingObjects = JSON.parse(localStorage.getItem(key) || '{}');
            existingObjects[objectId] = objectData;
            localStorage.setItem(key, JSON.stringify(existingObjects));

            return {
                success: true,
                filePath: `localStorage://${projectId}/objects/${sanitizedName}/object.json`
            };
        }

        // Build file path with object name as folder
        const objectsBaseDir = getObjectsDir(projectId);
        const objectDir = `${objectsBaseDir}/${sanitizedName}`;
        const filePath = `${objectDir}/object.json`;

        // Ensure directory exists
        if (window.electronAPI.fs.mkdir) {
            await window.electronAPI.fs.mkdir(objectDir, { recursive: true });
        }

        // Create JSON content
        const jsonData = JSON.stringify(objectData, null, 2);

        // Write file
        await window.electronAPI.fs.writeFile(filePath, jsonData);

        console.log(`[objectStorage] Object saved: ${filePath}`);

        // Create subdirectories for resources
        try {
            await window.electronAPI.fs.mkdir(`${objectDir}/images`, { recursive: true });
            await window.electronAPI.fs.mkdir(`${objectDir}/models`, { recursive: true });
        } catch (error) {
            console.warn('[objectStorage] Could not create resource directories:', error);
        }

        return { success: true, filePath };
    } catch (error) {
        console.error('[objectStorage] Failed to save object:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Loads an object from a project file
 * Searches in object folders
 */
export async function loadObjectFromProject(
    projectId: string,
    objectId: string
): Promise<StoryObject | null> {
    try {
        if (!window.electronAPI?.fs) {
            // Fallback to localStorage
            const key = `project-${projectId}-objects`;
            const existingObjects = JSON.parse(localStorage.getItem(key) || '{}');
            return existingObjects[objectId] || null;
        }

        const objectsBaseDir = getObjectsDir(projectId);

        // List all object folders
        const exists = await window.electronAPI.fs.exists(objectsBaseDir);
        if (!exists) {
            return null;
        }

        const folders = await window.electronAPI.fs.readdir(objectsBaseDir);

        // Search for object.json in each folder
        for (const folder of folders) {
            const filePath = `${objectsBaseDir}/${folder}/object.json`;
            
            try {
                const fileExists = await window.electronAPI.fs.exists(filePath);
                if (!fileExists) continue;

                const fileContent = await window.electronAPI.fs.readFile(filePath);
                const decoder = new TextDecoder();
                const jsonData = decoder.decode(fileContent);
                const obj = JSON.parse(jsonData) as StoryObject;

                // Check if this is the object we're looking for
                if (obj.id === objectId) {
                    // Convert string dates back to numbers if needed (Store uses numbers)
                    return {
                        ...obj,
                        createdAt: typeof obj.createdAt === 'string' ? new Date(obj.createdAt).getTime() : obj.createdAt,
                        updatedAt: typeof obj.updatedAt === 'string' ? new Date(obj.updatedAt).getTime() : obj.updatedAt
                    } as StoryObject;
                }
            } catch (error) {
                console.warn(`[objectStorage] Failed to read object from ${folder}:`, error);
            }
        }

        return null;
    } catch (error) {
        console.error('[objectStorage] Failed to load object:', error);
        return null;
    }
}

/**
 * Lists all objects in a project
 * Searches through object folders
 */
export async function listObjectsInProject(
    projectId: string
): Promise<string[]> {
    try {
        if (!window.electronAPI?.fs) {
            // Fallback to localStorage
            const key = `project-${projectId}-objects`;
            const existingObjects = JSON.parse(localStorage.getItem(key) || '{}');
            return Object.keys(existingObjects);
        }

        const objectsDir = getObjectsDir(projectId);

        const exists = await window.electronAPI.fs.exists(objectsDir);
        if (!exists) {
            return [];
        }

        const folders = await window.electronAPI.fs.readdir(objectsDir);
        const objectIds: string[] = [];

        // Read object.json from each folder to get the ID
        for (const folder of folders) {
            const filePath = `${objectsDir}/${folder}/object.json`;
            
            try {
                const fileExists = await window.electronAPI.fs.exists(filePath);
                if (!fileExists) continue;

                const fileContent = await window.electronAPI.fs.readFile(filePath);
                const decoder = new TextDecoder();
                const jsonData = decoder.decode(fileContent);
                const obj = JSON.parse(jsonData) as StoryObject;
                
                if (obj.id && !objectIds.includes(obj.id)) {
                  objectIds.push(obj.id);
                }
            } catch (error) {
                console.warn(`[objectStorage] Failed to read object from ${folder}:`, error);
            }
        }

        return objectIds;
    } catch (error) {
        console.error('[objectStorage] Failed to list objects:', error);
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

    console.log(`[objectStorage] Deleted directory: ${dirPath}`);
  } catch (error) {
    console.error(`[objectStorage] Failed to delete directory ${dirPath}:`, error);
    throw error;
  }
}

/**
 * Deletes an object from the project
 * Deletes the entire object folder
 */
export async function deleteObjectFromProject(
    projectId: string,
    objectId: string
): Promise<boolean> {
    try {
        if (!window.electronAPI?.fs) {
            // Fallback to localStorage
            const key = `project-${projectId}-objects`;
            const existingObjects = JSON.parse(localStorage.getItem(key) || '{}');
            delete existingObjects[objectId];
            localStorage.setItem(key, JSON.stringify(existingObjects));
            return true;
        }

        const objectsBaseDir = getObjectsDir(projectId);
        const folders = await window.electronAPI.fs.readdir(objectsBaseDir);

        // Find the folder containing this object
        for (const folder of folders) {
            const filePath = `${objectsBaseDir}/${folder}/object.json`;
            
            try {
                const exists = await window.electronAPI.fs.exists(filePath);
                if (!exists) continue;

                const fileContent = await window.electronAPI.fs.readFile(filePath);
                const decoder = new TextDecoder();
                const jsonData = decoder.decode(fileContent);
                const obj = JSON.parse(jsonData) as StoryObject;

                if (obj.id === objectId) {
                    // Delete the entire folder recursively
                    const folderPath = `${objectsBaseDir}/${folder}`;
                    await deleteDirectoryRecursive(folderPath);
                    return true;
                }
            } catch (error) {
                console.warn(`[objectStorage] Failed to check object in ${folder}:`, error);
            }
        }

        return false;
    } catch (error) {
        console.error('[objectStorage] Failed to delete object:', error);
        return false;
    }
}
