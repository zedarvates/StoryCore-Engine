import { LegacyAny } from '@/types/legacy';
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
    async save(_key: string, data: string): Promise<void> {
        try {
            const parsedData = JSON.parse(data) as Project;
            const projectId = parsedData.id || (parsedData as LegacyAny).project_id;

            // Use Rover API if available
            if (window.electronAPI?.rover?.sync) {
                await window.electronAPI.rover.sync(
                    this.projectPath,
                    projectId,
                    'Auto-save checkpoint',
                    parsedData as unknown as Record<string, unknown>
                );
            } else {
                console.warn('[RoverBackend] Rover API sync not available, using basic FS');
            }

            // Ensure the project directory exists before writing
            const dirExists = await window.electronAPI.fs.exists(this.projectPath);
            if (!dirExists) {
                console.error(`[RoverBackend] Project directory does not exist: ${this.projectPath}`);
                throw new Error('ENOENT: project directory missing');
            }

            // Always write the main project.json for compatibility with the rest of the app
            if (window.electronAPI?.fs?.writeFile) {
                const filePath = pathJoin(this.projectPath, 'project.json');
                await window.electronAPI.fs.writeFile(filePath, data);
            } else {
                console.error('[RoverBackend] FS API not available for save');
                throw new Error('No persistence available');
            }
        } catch (error) {
            console.error('[RoverBackend] Save failed:', error);
            throw error;
        }
    }

    /**
     * Load project data
     */
    async load(_key: string): Promise<string | null> {
        if (!window.electronAPI?.fs?.readFile) {
            console.error('[RoverBackend] FS API not available for load');
            return null;
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
    async exists(_key: string): Promise<boolean> {
        if (!window.electronAPI?.fs?.exists) return false;
        try {
            return await window.electronAPI.fs.exists(pathJoin(this.projectPath, 'project.json'));
        } catch (_error) {
            return false;
        }
    }

    /**
     * Delete project file
     */
    async delete(_key: string): Promise<void> {
        if (!window.electronAPI?.fs?.unlink) {
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
    if (!base) return part;
    // Normalize slashes to the system preferred style
    const normalizedBase = base.replace(/\/|\\/g, base.includes('\\') ? '\\' : '/');
    const separator = normalizedBase.includes('\\') ? '\\' : '/';
    return normalizedBase.endsWith(separator) ? normalizedBase + part : normalizedBase + separator + part;
}
