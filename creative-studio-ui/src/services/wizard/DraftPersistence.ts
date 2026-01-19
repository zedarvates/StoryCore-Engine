/**
 * DraftPersistence Service
 * Handles saving and loading wizard drafts with support for both web and desktop environments
 * 
 * Requirements: 9.5, 9.6
 */

import type { WizardState } from '../../types/wizard';

/**
 * Draft metadata for listing and management
 */
export interface DraftMetadata {
  id: string;
  projectName: string;
  lastSaved: Date;
  currentStep: number;
  completedSteps: number[];
}

/**
 * Serializable wizard state for storage
 */
interface SerializableWizardState {
  currentStep: number;
  completedSteps: number[];
  isReviewMode: boolean;
  projectType: WizardState['projectType'];
  genreStyle: WizardState['genreStyle'];
  worldBuilding: WizardState['worldBuilding'];
  characters: WizardState['characters'];
  storyStructure: WizardState['storyStructure'];
  script: WizardState['script'];
  scenes: WizardState['scenes'];
  shots: WizardState['shots'];
  draftId: string | null;
  lastSaved: string | null;
  validationErrors: Array<[number, any[]]>;
}

/**
 * Storage interface for platform-specific implementations
 */
interface StorageAdapter {
  save(key: string, data: string): Promise<void>;
  load(key: string): Promise<string | null>;
  list(): Promise<string[]>;
  delete(key: string): Promise<void>;
}

/**
 * LocalStorage adapter for web environments
 */
class LocalStorageAdapter implements StorageAdapter {
  private prefix = 'wizard-draft-';

  async save(key: string, data: string): Promise<void> {
    try {
      localStorage.setItem(this.prefix + key, data);
    } catch (error) {
      throw new Error(`Failed to save draft to localStorage: ${error}`);
    }
  }

  async load(key: string): Promise<string | null> {
    try {
      return localStorage.getItem(this.prefix + key);
    } catch (error) {
      throw new Error(`Failed to load draft from localStorage: ${error}`);
    }
  }

  async list(): Promise<string[]> {
    try {
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.prefix)) {
          keys.push(key.substring(this.prefix.length));
        }
      }
      return keys;
    } catch (error) {
      throw new Error(`Failed to list drafts from localStorage: ${error}`);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      throw new Error(`Failed to delete draft from localStorage: ${error}`);
    }
  }
}

/**
 * File system adapter for desktop environments (Electron)
 * This is a placeholder that will use Electron's IPC when available
 */
class FileSystemAdapter implements StorageAdapter {
  private draftsDir = '.storycore/wizard-drafts';

  async save(key: string, data: string): Promise<void> {
    // Check if running in Electron
    if (typeof window !== 'undefined' && (window as any).electron) {
      try {
        await (window as any).electron.saveDraft(this.draftsDir, key, data);
      } catch (error) {
        throw new Error(`Failed to save draft to file system: ${error}`);
      }
    } else {
      // Fallback to localStorage if not in Electron
      const fallback = new LocalStorageAdapter();
      await fallback.save(key, data);
    }
  }

  async load(key: string): Promise<string | null> {
    if (typeof window !== 'undefined' && (window as any).electron) {
      try {
        return await (window as any).electron.loadDraft(this.draftsDir, key);
      } catch (error) {
        throw new Error(`Failed to load draft from file system: ${error}`);
      }
    } else {
      const fallback = new LocalStorageAdapter();
      return await fallback.load(key);
    }
  }

  async list(): Promise<string[]> {
    if (typeof window !== 'undefined' && (window as any).electron) {
      try {
        return await (window as any).electron.listDrafts(this.draftsDir);
      } catch (error) {
        throw new Error(`Failed to list drafts from file system: ${error}`);
      }
    } else {
      const fallback = new LocalStorageAdapter();
      return await fallback.list();
    }
  }

  async delete(key: string): Promise<void> {
    if (typeof window !== 'undefined' && (window as any).electron) {
      try {
        await (window as any).electron.deleteDraft(this.draftsDir, key);
      } catch (error) {
        throw new Error(`Failed to delete draft from file system: ${error}`);
      }
    } else {
      const fallback = new LocalStorageAdapter();
      await fallback.delete(key);
    }
  }
}

/**
 * DraftPersistence class
 * Manages wizard draft persistence with auto-save functionality
 */
export class DraftPersistence {
  private storage: StorageAdapter;
  private autoSaveTimer: ReturnType<typeof setInterval> | null = null;
  private maxDrafts = 10;

  constructor(useFileSystem = false) {
    this.storage = useFileSystem ? new FileSystemAdapter() : new LocalStorageAdapter();
  }

  /**
   * Serialize wizard state for storage
   */
  private serializeState(state: Partial<WizardState>): SerializableWizardState {
    return {
      currentStep: state.currentStep ?? 1,
      completedSteps: Array.from(state.completedSteps ?? []),
      isReviewMode: state.isReviewMode ?? false,
      projectType: state.projectType ?? null,
      genreStyle: state.genreStyle ?? null,
      worldBuilding: state.worldBuilding ?? null,
      characters: state.characters ?? [],
      storyStructure: state.storyStructure ?? null,
      script: state.script ?? null,
      scenes: state.scenes ?? [],
      shots: state.shots ?? [],
      draftId: state.draftId ?? null,
      lastSaved: state.lastSaved ? state.lastSaved.toISOString() : null,
      validationErrors: Array.from(state.validationErrors?.entries() ?? []),
    };
  }

  /**
   * Deserialize stored data back to wizard state
   */
  private deserializeState(data: SerializableWizardState): Partial<WizardState> {
    return {
      currentStep: data.currentStep,
      completedSteps: new Set(data.completedSteps),
      isReviewMode: data.isReviewMode,
      projectType: data.projectType,
      genreStyle: data.genreStyle,
      worldBuilding: data.worldBuilding,
      characters: data.characters,
      storyStructure: data.storyStructure,
      script: data.script,
      scenes: data.scenes,
      shots: data.shots,
      draftId: data.draftId,
      lastSaved: data.lastSaved ? new Date(data.lastSaved) : null,
      validationErrors: new Map(data.validationErrors),
    };
  }

  /**
   * Generate a unique draft ID
   */
  private generateDraftId(): string {
    return `draft-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Get project name from wizard state for metadata
   */
  private getProjectName(state: Partial<WizardState>): string {
    if (state.storyStructure?.logline) {
      // Use first 30 chars of logline as project name
      return state.storyStructure.logline.substring(0, 30).trim();
    }
    if (state.projectType?.type) {
      return `${state.projectType.type} project`;
    }
    return 'Untitled project';
  }

  /**
   * Save wizard state as a draft
   * @param wizardState - Current wizard state to save
   * @returns Draft ID
   */
  async saveDraft(wizardState: Partial<WizardState>): Promise<string> {
    try {
      // Generate or use existing draft ID
      const draftId = wizardState.draftId || this.generateDraftId();
      
      // Update state with draft metadata
      const stateToSave: Partial<WizardState> = {
        ...wizardState,
        draftId,
        lastSaved: new Date(),
      };

      // Serialize state
      const serializedState = this.serializeState(stateToSave);
      const dataString = JSON.stringify(serializedState);

      // Save to storage
      await this.storage.save(draftId, dataString);

      // Enforce max drafts limit
      await this.enforceMaxDrafts();

      return draftId;
    } catch (error) {
      console.error('Failed to save draft:', error);
      throw new Error(`Draft save failed: ${error}`);
    }
  }

  /**
   * Load a draft by ID
   * @param draftId - ID of the draft to load
   * @returns Wizard state from the draft
   */
  async loadDraft(draftId: string): Promise<Partial<WizardState>> {
    try {
      const dataString = await this.storage.load(draftId);
      
      if (!dataString) {
        throw new Error(`Draft not found: ${draftId}`);
      }

      const serializedState = JSON.parse(dataString) as SerializableWizardState;
      return this.deserializeState(serializedState);
    } catch (error) {
      console.error('Failed to load draft:', error);
      throw new Error(`Draft load failed: ${error}`);
    }
  }

  /**
   * List all available drafts with metadata
   * @returns Array of draft metadata
   */
  async listDrafts(): Promise<DraftMetadata[]> {
    try {
      const draftIds = await this.storage.list();
      const drafts: DraftMetadata[] = [];

      for (const draftId of draftIds) {
        try {
          const dataString = await this.storage.load(draftId);
          if (dataString) {
            const serializedState = JSON.parse(dataString) as SerializableWizardState;
            const state = this.deserializeState(serializedState);
            
            drafts.push({
              id: draftId,
              projectName: this.getProjectName(state),
              lastSaved: state.lastSaved || new Date(),
              currentStep: state.currentStep ?? 1,
              completedSteps: Array.from(state.completedSteps ?? []),
            });
          }
        } catch (error) {
          console.warn(`Failed to load metadata for draft ${draftId}:`, error);
          // Continue with other drafts
        }
      }

      // Sort by last saved date (newest first)
      drafts.sort((a, b) => b.lastSaved.getTime() - a.lastSaved.getTime());

      return drafts;
    } catch (error) {
      console.error('Failed to list drafts:', error);
      throw new Error(`Draft listing failed: ${error}`);
    }
  }

  /**
   * Delete a draft by ID
   * @param draftId - ID of the draft to delete
   */
  async deleteDraft(draftId: string): Promise<void> {
    try {
      await this.storage.delete(draftId);
    } catch (error) {
      console.error('Failed to delete draft:', error);
      throw new Error(`Draft deletion failed: ${error}`);
    }
  }

  /**
   * Enforce maximum number of drafts by deleting oldest ones
   */
  private async enforceMaxDrafts(): Promise<void> {
    try {
      const drafts = await this.listDrafts();
      
      if (drafts.length > this.maxDrafts) {
        // Delete oldest drafts beyond the limit
        const draftsToDelete = drafts.slice(this.maxDrafts);
        for (const draft of draftsToDelete) {
          await this.deleteDraft(draft.id);
        }
      }
    } catch (error) {
      console.warn('Failed to enforce max drafts limit:', error);
      // Non-critical error, continue
    }
  }

  /**
   * Start auto-save with debouncing
   * @param getState - Function to get current wizard state
   * @param intervalMs - Auto-save interval in milliseconds (default: 30000 = 30 seconds)
   */
  autoSave(getState: () => Partial<WizardState>, intervalMs: number = 30000): void {
    // Clear existing timer
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
    }

    // Set up new auto-save timer
    this.autoSaveTimer = setInterval(async () => {
      try {
        const state = getState();
        
        // Only auto-save if there's meaningful data
        if (state.currentStep && state.currentStep > 1) {
          await this.saveDraft(state);
          console.log('Auto-save completed');
        }
      } catch (error) {
        console.error('Auto-save failed:', error);
        // Don't throw - auto-save failures shouldn't interrupt user workflow
      }
    }, intervalMs);
  }

  /**
   * Stop auto-save
   */
  stopAutoSave(): void {
    if (this.autoSaveTimer) {
      clearInterval(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }
  }

  /**
   * Set maximum number of drafts to keep
   * @param max - Maximum number of drafts
   */
  setMaxDrafts(max: number): void {
    this.maxDrafts = max;
  }
}

/**
 * Create a singleton instance for the application
 */
export const draftPersistence = new DraftPersistence(
  // Use file system if running in Electron
  typeof window !== 'undefined' && !!(window as any).electron
);
