/**
 * Project Persistence Service
 * 
 * Handles saving and loading project data with Data Contract v1 compliance.
 * Implements auto-save with debouncing and retry logic for error handling.
 * 
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

import type { Project } from '../../types';
import { z } from 'zod';
import { RoverBackend } from './RoverBackend';

// ============================================================================
// Project Schema for Validation
// ============================================================================

const ProjectSchema = z.object({
  id: z.string(),
  schema_version: z.string(),
  project_name: z.string(),
  path: z.string().optional(),
  shots: z.array(z.any()),
  assets: z.array(z.any()),
  worlds: z.array(z.any()).optional(),
  selectedWorldId: z.string().nullable().optional(),
  characters: z.array(z.any()).optional(),
  stories: z.array(z.any()).optional(),
  storyVersions: z.array(z.any()).optional(),
  objects: z.array(z.any()).optional(),

  // Dashboard / Generation metadata
  audio_phrases: z.array(z.any()).optional(),
  master_coherence_sheet: z.object({
    url: z.string(),
    generated_at: z.number(),
  }).optional(),
  generation_history: z.array(z.any()).optional(),

  capabilities: z.object({
    grid_generation: z.boolean(),
    promotion_engine: z.boolean(),
    qa_engine: z.boolean(),
    autofix_engine: z.boolean(),
    character_casting: z.boolean().optional(),
    voice_generation: z.boolean().optional(),
  }),
  generation_status: z.object({
    grid: z.enum(['pending', 'done', 'failed', 'passed']),
    promotion: z.enum(['pending', 'done', 'failed', 'passed']),
    wizard: z.enum(['pending', 'done', 'failed', 'passed']).optional(),
  }),
  casting: z.object({
    version: z.string(),
    assignments: z.array(z.object({
      character_id: z.string(),
      avatar_id: z.string(),
      assigned_at: z.string(),
    })),
    last_modified: z.string(),
  }).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  global_resume: z.string().optional(),
});

// ============================================================================
// Constants
// ============================================================================

const STORAGE_KEY_PREFIX = 'storycore_project_';
const AUTO_SAVE_DELAY_MS = 2000; // 2 seconds as per requirement 9.1
const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1000;

// ============================================================================
// Types
// ============================================================================

export interface PersistenceOptions {
  autoSave?: boolean;
  autoSaveDelay?: number;
  maxRetries?: number;
  retryDelay?: number;
  onSaveSuccess?: (projectId: string) => void;
  onSaveError?: (error: Error) => void;
  onLoadSuccess?: (project: Project) => void;
  onLoadError?: (error: Error) => void;
}

export interface SaveResult {
  success: boolean;
  error?: Error;
  timestamp: number;
}

export interface LoadResult {
  success: boolean;
  project?: Project;
  error?: Error;
}

// ============================================================================
// Storage Backend Interface
// ============================================================================

/**
 * Storage backend interface for different persistence strategies
 * Can be implemented for localStorage, IndexedDB, or backend API
 */
export interface StorageBackend {
  save(key: string, data: string): Promise<void>;
  load(key: string): Promise<string | null>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
  list(): Promise<string[]>;
}

// ============================================================================
// LocalStorage Backend Implementation
// ============================================================================

/**
 * LocalStorage implementation of StorageBackend
 * Uses browser localStorage for persistence
 */
class LocalStorageBackend implements StorageBackend {
  async save(key: string, data: string): Promise<void> {
    try {
      localStorage.setItem(key, data);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        throw new Error('Storage quota exceeded. Please free up space.');
      }
      throw error;
    }
  }

  async load(key: string): Promise<string | null> {
    return localStorage.getItem(key);
  }

  async exists(key: string): Promise<boolean> {
    return localStorage.getItem(key) !== null;
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(key);
  }

  async list(): Promise<string[]> {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_KEY_PREFIX)) {
        keys.push(key.replace(STORAGE_KEY_PREFIX, ''));
      }
    }
    return keys;
  }
}

// ============================================================================
// Project Persistence Service
// ============================================================================

/**
 * ProjectPersistenceService handles all project data persistence operations
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export class ProjectPersistenceService {
  private backend: StorageBackend;
  private options: Required<PersistenceOptions>;
  private autoSaveTimers: Map<string, NodeJS.Timeout>;
  private saveInProgress: Map<string, Promise<SaveResult>>;

  constructor(
    backend?: StorageBackend,
    options: PersistenceOptions = {}
  ) {
    this.backend = backend || new LocalStorageBackend();
    this.options = {
      autoSave: options.autoSave ?? true,
      autoSaveDelay: options.autoSaveDelay ?? AUTO_SAVE_DELAY_MS,
      maxRetries: options.maxRetries ?? MAX_RETRY_ATTEMPTS,
      retryDelay: options.retryDelay ?? RETRY_DELAY_MS,
      onSaveSuccess: options.onSaveSuccess ?? (() => { }),
      onSaveError: options.onSaveError ?? (() => { }),
      onLoadSuccess: options.onLoadSuccess ?? (() => { }),
      onLoadError: options.onLoadError ?? (() => { }),
    };
    this.autoSaveTimers = new Map();
    this.saveInProgress = new Map();
  }

  /**
   * Set the storage backend dynamically
   */
  setBackend(backend: StorageBackend): void {
    this.backend = backend;
  }

  /**
   * Helper to switch to Rover backend for a specific project path
   */
  useRover(projectPath: string): void {
    this.setBackend(new RoverBackend(projectPath));
  }

  /**
   * Save project to storage with retry logic
   * Requirements: 9.1, 9.2, 9.3, 9.5
   */
  async saveProject(project: Project): Promise<SaveResult> {
    // Check if save is already in progress for this project
    const inProgress = this.saveInProgress.get(project.id);
    if (inProgress) {
      return inProgress;
    }

    // Create save promise
    const savePromise = this._saveProjectWithRetry(project);
    this.saveInProgress.set(project.id, savePromise);

    try {
      const result = await savePromise;
      return result;
    } finally {
      this.saveInProgress.delete(project.id);
    }
  }

  /**
   * Internal save with retry logic
   * Requirements: 9.5
   */
  private async _saveProjectWithRetry(
    project: Project,
    attempt: number = 1
  ): Promise<SaveResult> {
    try {
      // Validate project data against schema
      const validationResult = ProjectSchema.safeParse(project);
      if (!validationResult.success) {
        const error = new Error(
          `Project validation failed: ${validationResult.error.message}`
        );
        this.options.onSaveError(error);
        return {
          success: false,
          error,
          timestamp: Date.now(),
        };
      }

      // Serialize project data
      const serialized = JSON.stringify(project, null, 2);

      // Save to storage backend
      const storageKey = this._getStorageKey(project.id);
      await this.backend.save(storageKey, serialized);

      // Success
      const result: SaveResult = {
        success: true,
        timestamp: Date.now(),
      };

      this.options.onSaveSuccess(project.id);
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      // Retry if attempts remaining
      if (attempt < this.options.maxRetries) {
        console.warn(
          `Save attempt ${attempt} failed for project ${project.id}, retrying...`,
          err
        );

        // Wait before retry with exponential backoff
        await this._delay(this.options.retryDelay * attempt);

        return this._saveProjectWithRetry(project, attempt + 1);
      }

      // Max retries exceeded
      console.error(
        `Failed to save project ${project.id} after ${attempt} attempts`,
        err
      );

      this.options.onSaveError(err);

      return {
        success: false,
        error: err,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Load project from storage
   * Requirements: 9.3, 9.4
   */
  async loadProject(projectId: string): Promise<LoadResult> {
    try {
      const storageKey = this._getStorageKey(projectId);

      // Check if project exists
      const exists = await this.backend.exists(storageKey);
      if (!exists) {
        const error = new Error(`Project ${projectId} not found in storage`);
        this.options.onLoadError(error);
        return {
          success: false,
          error,
        };
      }

      // Load from storage
      const serialized = await this.backend.load(storageKey);
      if (!serialized) {
        const error = new Error(`Failed to load project ${projectId} data`);
        this.options.onLoadError(error);
        return {
          success: false,
          error,
        };
      }

      // Parse JSON
      let parsed: unknown;
      try {
        parsed = JSON.parse(serialized);
      } catch (parseError) {
        const error = new Error(
          `Failed to parse project ${projectId} data: ${parseError}`
        );
        this.options.onLoadError(error);
        return {
          success: false,
          error,
        };
      }

      // Validate against schema
      const validationResult = ProjectSchema.safeParse(parsed);
      if (!validationResult.success) {
        const error = new Error(
          `Project ${projectId} validation failed: ${validationResult.error.message}`
        );
        this.options.onLoadError(error);
        return {
          success: false,
          error,
        };
      }

      const project = validationResult.data as unknown as Project;
      this.options.onLoadSuccess(project);

      return {
        success: true,
        project,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`Failed to load project ${projectId}`, err);
      this.options.onLoadError(err);

      return {
        success: false,
        error: err,
      };
    }
  }

  /**
   * Schedule auto-save with debouncing
   * Requirements: 9.1, 9.2
   */
  scheduleAutoSave(project: Project): void {
    if (!this.options.autoSave) {
      return;
    }

    // Clear existing timer for this project
    const existingTimer = this.autoSaveTimers.get(project.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Schedule new auto-save
    const timer = setTimeout(() => {
      this.saveProject(project).catch(error => {
        console.error(`Auto-save failed for project ${project.id}`, error);
      });
      this.autoSaveTimers.delete(project.id);
    }, this.options.autoSaveDelay);

    this.autoSaveTimers.set(project.id, timer);
  }

  /**
   * Cancel pending auto-save for a project
   */
  cancelAutoSave(projectId: string): void {
    const timer = this.autoSaveTimers.get(projectId);
    if (timer) {
      clearTimeout(timer);
      this.autoSaveTimers.delete(projectId);
    }
  }

  /**
   * Check if project exists in storage
   * Requirements: 9.3
   */
  async projectExists(projectId: string): Promise<boolean> {
    const storageKey = this._getStorageKey(projectId);
    return this.backend.exists(storageKey);
  }

  /**
   * Delete project from storage
   */
  async deleteProject(projectId: string): Promise<void> {
    const storageKey = this._getStorageKey(projectId);
    await this.backend.delete(storageKey);
  }

  /**
   * List all project IDs in storage
   */
  async listProjects(): Promise<string[]> {
    return this.backend.list();
  }

  /**
   * Get storage key for project
   */
  private _getStorageKey(projectId: string): string {
    return `${STORAGE_KEY_PREFIX}${projectId}`;
  }

  /**
   * Delay helper for retry logic
   */
  private _delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup all pending timers
   */
  cleanup(): void {
    for (const timer of this.autoSaveTimers.values()) {
      clearTimeout(timer);
    }
    this.autoSaveTimers.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default singleton instance for convenience
 */
export const projectPersistence = new ProjectPersistenceService();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Save project to storage
 * Requirements: 9.1, 9.2, 9.3
 */
export async function saveProject(project: Project): Promise<SaveResult> {
  return projectPersistence.saveProject(project);
}

/**
 * Load project from storage
 * Requirements: 9.3, 9.4
 */
export async function loadProject(projectId: string): Promise<LoadResult> {
  return projectPersistence.loadProject(projectId);
}

/**
 * Schedule auto-save with debouncing
 * Requirements: 9.1, 9.2
 */
export function scheduleAutoSave(project: Project): void {
  projectPersistence.scheduleAutoSave(project);
}

/**
 * Check if project exists
 * Requirements: 9.3
 */
export async function projectExists(projectId: string): Promise<boolean> {
  return projectPersistence.projectExists(projectId);
}

/**
 * Delete project
 */
export async function deleteProject(projectId: string): Promise<void> {
  return projectPersistence.deleteProject(projectId);
}

/**
 * List all projects
 */
export async function listProjects(): Promise<string[]> {
  return projectPersistence.listProjects();
}
