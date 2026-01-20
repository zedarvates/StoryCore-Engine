/**
 * Generation State Persistence Service
 * 
 * Handles saving and loading generation state to enable background generation continuity.
 * Allows generation to continue when navigating away from dashboard and restores
 * status when returning.
 * 
 * Requirements: 10.5
 */

import type { GenerationStatus } from '../../types/projectDashboard';

// ============================================================================
// Constants
// ============================================================================

const GENERATION_STATE_KEY_PREFIX = 'storycore_generation_state_';
const STATE_UPDATE_INTERVAL_MS = 1000; // Update state every second

// ============================================================================
// Types
// ============================================================================

/**
 * Persisted generation state with additional metadata
 */
export interface PersistedGenerationState {
  projectId: string;
  status: GenerationStatus;
  timestamp: number;
  isActive: boolean;
}

/**
 * Generation state persistence options
 */
export interface GenerationStatePersistenceOptions {
  updateInterval?: number;
  onStateUpdate?: (state: PersistedGenerationState) => void;
  onStateError?: (error: Error) => void;
}

// ============================================================================
// Generation State Persistence Service
// ============================================================================

/**
 * Service for persisting generation state to enable background continuity
 * Requirements: 10.5
 */
export class GenerationStatePersistenceService {
  private options: Required<GenerationStatePersistenceOptions>;
  private updateTimers: Map<string, NodeJS.Timeout>;

  constructor(options: GenerationStatePersistenceOptions = {}) {
    this.options = {
      updateInterval: options.updateInterval ?? STATE_UPDATE_INTERVAL_MS,
      onStateUpdate: options.onStateUpdate ?? (() => {}),
      onStateError: options.onStateError ?? (() => {}),
    };
    this.updateTimers = new Map();
  }

  /**
   * Save generation state to persistent storage
   * Requirements: 10.5
   */
  async saveGenerationState(
    projectId: string,
    status: GenerationStatus,
    isActive: boolean = true
  ): Promise<void> {
    try {
      const state: PersistedGenerationState = {
        projectId,
        status,
        timestamp: Date.now(),
        isActive,
      };

      const storageKey = this._getStorageKey(projectId);
      const serialized = JSON.stringify(state);

      localStorage.setItem(storageKey, serialized);

      this.options.onStateUpdate(state);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`Failed to save generation state for project ${projectId}`, err);
      this.options.onStateError(err);
    }
  }

  /**
   * Load generation state from persistent storage
   * Requirements: 10.5
   */
  async loadGenerationState(projectId: string): Promise<PersistedGenerationState | null> {
    try {
      const storageKey = this._getStorageKey(projectId);
      const serialized = localStorage.getItem(storageKey);

      if (!serialized) {
        return null;
      }

      const state: PersistedGenerationState = JSON.parse(serialized);

      // Validate state structure
      if (!state.projectId || !state.status || !state.timestamp) {
        console.warn(`Invalid generation state for project ${projectId}`);
        return null;
      }

      return state;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`Failed to load generation state for project ${projectId}`, err);
      this.options.onStateError(err);
      return null;
    }
  }

  /**
   * Check if generation is active for a project
   * Requirements: 10.5
   */
  async isGenerationActive(projectId: string): Promise<boolean> {
    const state = await this.loadGenerationState(projectId);
    
    if (!state) {
      return false;
    }

    // Check if generation is active and not too old (within last 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return state.isActive && state.timestamp > fiveMinutesAgo;
  }

  /**
   * Mark generation as complete and remove from storage
   * Requirements: 10.5
   */
  async completeGeneration(projectId: string): Promise<void> {
    try {
      const storageKey = this._getStorageKey(projectId);
      localStorage.removeItem(storageKey);

      // Cancel any pending update timers
      this.cancelPeriodicUpdates(projectId);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error(`Failed to complete generation for project ${projectId}`, err);
      this.options.onStateError(err);
    }
  }

  /**
   * Start periodic state updates during generation
   * Requirements: 10.5
   */
  startPeriodicUpdates(
    projectId: string,
    getStatus: () => GenerationStatus
  ): void {
    // Clear existing timer if any
    this.cancelPeriodicUpdates(projectId);

    // Create periodic update timer
    const timer = setInterval(() => {
      const status = getStatus();
      
      // Stop updates if generation is complete or errored
      if (status.stage === 'complete' || status.stage === 'error' || status.stage === 'idle') {
        this.cancelPeriodicUpdates(projectId);
        this.completeGeneration(projectId);
        return;
      }

      // Save current state
      this.saveGenerationState(projectId, status, true);
    }, this.options.updateInterval);

    this.updateTimers.set(projectId, timer);
  }

  /**
   * Cancel periodic state updates
   * Requirements: 10.5
   */
  cancelPeriodicUpdates(projectId: string): void {
    const timer = this.updateTimers.get(projectId);
    if (timer) {
      clearInterval(timer);
      this.updateTimers.delete(projectId);
    }
  }

  /**
   * Get all active generation states
   * Requirements: 10.5
   */
  async getAllActiveGenerations(): Promise<PersistedGenerationState[]> {
    const activeStates: PersistedGenerationState[] = [];

    try {
      // Iterate through localStorage to find all generation states
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        
        if (key && key.startsWith(GENERATION_STATE_KEY_PREFIX)) {
          const projectId = key.replace(GENERATION_STATE_KEY_PREFIX, '');
          const state = await this.loadGenerationState(projectId);
          
          if (state && state.isActive) {
            // Check if state is recent (within last 5 minutes)
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
            if (state.timestamp > fiveMinutesAgo) {
              activeStates.push(state);
            } else {
              // Clean up old state
              await this.completeGeneration(projectId);
            }
          }
        }
      }
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Failed to get active generations', err);
      this.options.onStateError(err);
    }

    return activeStates;
  }

  /**
   * Clean up all generation states (for testing/debugging)
   */
  async cleanupAllStates(): Promise<void> {
    try {
      const keys: string[] = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(GENERATION_STATE_KEY_PREFIX)) {
          keys.push(key);
        }
      }

      for (const key of keys) {
        localStorage.removeItem(key);
      }

      // Cancel all timers
      for (const timer of this.updateTimers.values()) {
        clearInterval(timer);
      }
      this.updateTimers.clear();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      console.error('Failed to cleanup generation states', err);
      this.options.onStateError(err);
    }
  }

  /**
   * Get storage key for project generation state
   */
  private _getStorageKey(projectId: string): string {
    return `${GENERATION_STATE_KEY_PREFIX}${projectId}`;
  }

  /**
   * Cleanup all pending timers
   */
  cleanup(): void {
    for (const timer of this.updateTimers.values()) {
      clearInterval(timer);
    }
    this.updateTimers.clear();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

/**
 * Default singleton instance for convenience
 */
export const generationStatePersistence = new GenerationStatePersistenceService();

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Save generation state
 * Requirements: 10.5
 */
export async function saveGenerationState(
  projectId: string,
  status: GenerationStatus,
  isActive: boolean = true
): Promise<void> {
  return generationStatePersistence.saveGenerationState(projectId, status, isActive);
}

/**
 * Load generation state
 * Requirements: 10.5
 */
export async function loadGenerationState(
  projectId: string
): Promise<PersistedGenerationState | null> {
  return generationStatePersistence.loadGenerationState(projectId);
}

/**
 * Check if generation is active
 * Requirements: 10.5
 */
export async function isGenerationActive(projectId: string): Promise<boolean> {
  return generationStatePersistence.isGenerationActive(projectId);
}

/**
 * Complete generation and cleanup state
 * Requirements: 10.5
 */
export async function completeGeneration(projectId: string): Promise<void> {
  return generationStatePersistence.completeGeneration(projectId);
}

/**
 * Get all active generations
 * Requirements: 10.5
 */
export async function getAllActiveGenerations(): Promise<PersistedGenerationState[]> {
  return generationStatePersistence.getAllActiveGenerations();
}
