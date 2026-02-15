import type { StorageBackend } from './projectPersistence';
import type { Project } from '../../types';

/**
 * RoverBackend implementation of StorageBackend
 * Bridges the UI persistence to the Electron Rover Service
 */
export class RoverBackend implements StorageBackend {
    private projectPath: string;

    constructor(projectPath: string) {
        this.projectPath = projectPath;
    }

    /**
     * Save project data and create a Rover checkpoint
     */
    async save(key: string, data: string): Promise<void> {
        if (!window.electronAPI?.rover) {
            console.warn('[RoverBackend] Rover API not available, falling back to basic FS');
            if (window.electronAPI?.fs) {
                // Fallback to direct file write if rover is not available but FS is
                // We assume the key corresponds to the filename for simplicity in fallback
                await window.electronAPI.fs.writeFile(this.projectPath + '/project.json', data);
                return;
            }
            throw new Error('No persistence available');
        }

        try {
            const parsedData = JSON.parse(data) as Project;
            const projectId = parsedData.id;

            // We use 'Sync' as the primary save operation which also creates a history commit
            await window.electronAPI.rover.sync(
                this.projectPath,
                projectId,
                'Auto-save checkpoint',
                parsedData
            );

            // Also write the main project.json for compatibility with the rest of the app
            if (window.electronAPI.fs) {
                await window.electronAPI.fs.writeFile(pathJoin(this.projectPath, 'project.json'), data);
            }
        } catch (error) {
            console.error('[RoverBackend] Save failed:', error);
            throw error;
        }
    }

    /**
     * Load project data
     */
    async load(key: string): Promise<string | null> {
        if (!window.electronAPI?.fs) {
            throw new Error('FS API not available');
        }

        try {
            const filePath = pathJoin(this.projectPath, 'project.json');
            const exists = await window.electronAPI.fs.exists(filePath);

            if (!exists) return null;

            const buffer = await window.electronAPI.fs.readFile(filePath);
            return buffer.toString('utf-8');
        } catch (error) {
            console.error('[RoverBackend] Load failed:', error);
            return null;
        }
    }

    /**
     * Check if project exists
     */
    async exists(key: string): Promise<boolean> {
        if (!window.electronAPI?.fs) return false;
        return window.electronAPI.fs.exists(pathJoin(this.projectPath, 'project.json'));
    }

    /**
     * Delete project file
     * @param key - The key identifying the project (typically 'project.json')
     */
    async delete(key: string): Promise<void> {
        if (!window.electronAPI?.fs) {
            throw new Error('FS API not available for delete operation');
        }

        try {
            const filePath = pathJoin(this.projectPath, 'project.json');
            const exists = await window.electronAPI.fs.exists(filePath);

            if (exists) {
                await window.electronAPI.fs.unlink(filePath);
                console.log('[RoverBackend] Project deleted:', filePath);
            }
        } catch (error) {
            console.error('[RoverBackend] Delete failed:', error);
            throw error;
        }
    }

    /**
     * List projects (not supported via RoverBackend for now)
     */
    async list(): Promise<string[]> {
        return [];
    }
}

/**
 * Helper to join paths safely in the renderer
 */
function pathJoin(base: string, part: string): string {
    // Simple path joining for renderer (assumes forward or backward slashes depending on OS)
    const separator = base.includes('\\') ? '\\' : '/';
    return base.endsWith(separator) ? base + part : base + separator + part;
}
