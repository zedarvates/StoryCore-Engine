/**
 * Object Storage Utilities
 * 
 * Provides functions to save and load story object data as JSON files in project directories.
 * Objects are stored in: ./projects/{project_id}/objects/{object_id}.json
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
 * Saves an object to the project's objects directory
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
                filePath: `localStorage://${projectId}/objects/${objectId}.json`
            };
        }

        // Build file path
        const objectsDir = `./projects/${projectId}/objects`;
        const filePath = `${objectsDir}/${objectId}.json`;

        // Ensure directory exists
        if (window.electronAPI.fs.mkdir) {
            await window.electronAPI.fs.mkdir(objectsDir, { recursive: true });
        }

        // Create JSON content
        const jsonData = JSON.stringify(objectData, null, 2);

        // Write file
        await window.electronAPI.fs.writeFile(filePath, jsonData);

        console.log(`[objectStorage] Object saved: ${filePath}`);

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

        const filePath = `./projects/${projectId}/objects/${objectId}.json`;

        const exists = await window.electronAPI.fs.exists(filePath);
        if (!exists) {
            return null;
        }

        const fileContent = await window.electronAPI.fs.readFile(filePath);
        const decoder = new TextDecoder();
        const jsonData = decoder.decode(fileContent);

        const obj = JSON.parse(jsonData);

        // Convert string dates back to Date objects
        return {
            ...obj,
            createdAt: new Date(obj.createdAt),
            updatedAt: new Date(obj.updatedAt)
        } as StoryObject;
    } catch (error) {
        console.error('[objectStorage] Failed to load object:', error);
        return null;
    }
}

/**
 * Lists all objects in a project
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

        const objectsDir = `./projects/${projectId}/objects`;

        const exists = await window.electronAPI.fs.exists(objectsDir);
        if (!exists) {
            return [];
        }

        const files = await window.electronAPI.fs.readdir(objectsDir);
        return files
            .filter((file: string) => file.endsWith('.json'))
            .map((file: string) => file.replace('.json', ''));
    } catch (error) {
        console.error('[objectStorage] Failed to list objects:', error);
        return [];
    }
}

/**
 * Deletes an object from the project
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

        const filePath = `./projects/${projectId}/objects/${objectId}.json`;

        // Try to delete the file
        try {
            if (window.electronAPI.fs.unlink) {
                await window.electronAPI.fs.unlink(filePath);
            }
        } catch {
            // Ignore
        }

        return true;
    } catch (error) {
        console.error('[objectStorage] Failed to delete object:', error);
        return false;
    }
}
