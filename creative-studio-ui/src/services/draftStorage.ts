/**
 * Draft Storage Service for Production Wizards
 * Handles saving and loading wizard drafts with Electron secure storage
 */

import { SequencePlan } from '../types/sequencePlan';
import { ProductionShot } from '../types/shot';

export interface DraftMetadata {
  id: string;
  wizardType: string;
  timestamp: number;
  preview: string;
  completionPercentage: number;
  lastModified: number;
}

// Union type for all production wizard data
export type ProductionWizardData = SequencePlan | ProductionShot;

/**
 * Storage interface for platform-specific implementations
 */
interface StorageAdapter {
  save(key: string, data: string): Promise<void>;
  load(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}

/**
 * Electron secure storage adapter
 */
class ElectronStorageAdapter implements StorageAdapter {
  private electronAPI: unknown;

  constructor() {
    // Get Electron API if available
    this.electronAPI = typeof window !== 'undefined' &&
                       (window as any).electron?.secureStorage;
  }

  async save(key: string, data: string): Promise<void> {
    if (this.electronAPI) {
      try {
        // Encrypt and save using Electron secure storage
        const encrypted = await this.electronAPI.encrypt(data);
        await this.electronAPI.set(`production-wizard-${key}`, encrypted);
      } catch (error) {
        throw new Error(`Failed to save draft to Electron storage: ${error}`);
      }
    } else {
      // Fallback to localStorage with basic obfuscation
      this.fallbackSave(key, data);
    }
  }

  async load(key: string): Promise<string | null> {
    if (this.electronAPI) {
      try {
        const encrypted = await this.electronAPI.get(`production-wizard-${key}`);
        if (!encrypted) return null;

        return await this.electronAPI.decrypt(encrypted);
      } catch (error) {
        throw new Error(`Failed to load draft from Electron storage: ${error}`);
      }
    } else {
      return this.fallbackLoad(key);
    }
  }

  async delete(key: string): Promise<void> {
    if (this.electronAPI) {
      try {
        await this.electronAPI.delete(`production-wizard-${key}`);
      } catch (error) {
        throw new Error(`Failed to delete draft from Electron storage: ${error}`);
      }
    } else {
      this.fallbackDelete(key);
    }
  }

  async list(prefix?: string): Promise<string[]> {
    if (this.electronAPI) {
      try {
        const allKeys = await this.electronAPI.list();
        const searchPrefix = prefix ? `production-wizard-${prefix}` : 'production-wizard-';
        return allKeys.filter((key: string) => key.startsWith(searchPrefix))
                     .map((key: string) => key.replace(searchPrefix, ''));
      } catch (error) {
        throw new Error(`Failed to list drafts from Electron storage: ${error}`);
      }
    } else {
      return this.fallbackList(prefix);
    }
  }

  // Fallback methods for non-Electron environments
  private fallbackSave(key: string, data: string): void {
    try {
      // Basic obfuscation (not secure, just prevents casual inspection)
      const obfuscated = btoa(encodeURIComponent(data));
      localStorage.setItem(`production-wizard-${key}`, obfuscated);
    } catch (error) {
      throw new Error(`Failed to save draft to localStorage: ${error}`);
    }
  }

  private fallbackLoad(key: string): string | null {
    try {
      const obfuscated = localStorage.getItem(`production-wizard-${key}`);
      if (!obfuscated) return null;

      return decodeURIComponent(atob(obfuscated));
    } catch (error) {
      throw new Error(`Failed to load draft from localStorage: ${error}`);
    }
  }

  private fallbackDelete(key: string): void {
    try {
      localStorage.removeItem(`production-wizard-${key}`);
    } catch (error) {
      throw new Error(`Failed to delete draft from localStorage: ${error}`);
    }
  }

  private fallbackList(prefix?: string): string[] {
    try {
      const keys: string[] = [];
      const searchPrefix = prefix ? `production-wizard-${prefix}` : 'production-wizard-';

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(searchPrefix)) {
          keys.push(key.replace(searchPrefix, ''));
        }
      }

      return keys;
    } catch (error) {
      throw new Error(`Failed to list drafts from localStorage: ${error}`);
    }
  }
}

/**
 * Draft Storage Service
 */
export class DraftStorageService {
  private storage: StorageAdapter;
  private maxDraftsPerType = 5;

  constructor() {
    this.storage = new ElectronStorageAdapter();
  }

  /**
   * Save a draft with encryption and metadata
   */
  async saveDraft<T extends ProductionWizardData>(
    wizardType: string,
    data: T
  ): Promise<string> {
    try {
      const draftId = this.generateDraftId();
      const timestamp = Date.now();

      const draftData = {
        id: draftId,
        wizardType,
        timestamp,
        data,
        version: '1.0', // For future migration support
      };

      const jsonData = JSON.stringify(draftData);
      await this.storage.save(`${wizardType}-${draftId}`, jsonData);

      // Clean up old drafts
      await this.enforceMaxDrafts(wizardType);

      return draftId;
    } catch (error) {
      console.error('Failed to save draft:', error);
      throw new Error(`Draft save failed: ${error}`);
    }
  }

  /**
   * Load a draft by ID with decryption and validation
   */
  async loadDraft<T extends ProductionWizardData>(
    wizardType: string,
    draftId: string
  ): Promise<T | null> {
    try {
      const jsonData = await this.storage.load(`${wizardType}-${draftId}`);
      if (!jsonData) return null;

      const draftData = JSON.parse(jsonData);

      // Validate draft structure
      if (!this.isValidDraft(draftData)) {
        console.warn(`Corrupted draft detected: ${wizardType}-${draftId}`);
        await this.deleteDraft(wizardType, draftId);
        return null;
      }

      // Check if draft is too old (30 days)
      const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
      if (Date.now() - draftData.timestamp > maxAge) {
        console.info(`Draft expired: ${wizardType}-${draftId}`);
        await this.deleteDraft(wizardType, draftId);
        return null;
      }

      return draftData.data as T;
    } catch (error) {
      console.error('Failed to load draft:', error);
      // Attempt to clean up corrupted draft
      try {
        await this.deleteDraft(wizardType, draftId);
      } catch {
        // Ignore cleanup errors
      }
      return null;
    }
  }

  /**
   * List drafts with metadata
   */
  async listDrafts(wizardType?: string): Promise<DraftMetadata[]> {
    try {
      const keys = await this.storage.list(wizardType);
      const drafts: DraftMetadata[] = [];

      for (const key of keys) {
        try {
          const jsonData = await this.storage.load(wizardType ? `${wizardType}-${key}` : key);
          if (!jsonData) continue;

          const draftData = JSON.parse(jsonData);
          if (!this.isValidDraft(draftData)) continue;

          drafts.push({
            id: key,
            wizardType: draftData.wizardType,
            timestamp: draftData.timestamp,
            preview: this.generatePreview(draftData.data),
            completionPercentage: this.calculateCompletion(draftData.data),
            lastModified: draftData.timestamp,
          });
        } catch (error) {
          console.warn(`Skipping corrupted draft ${key}:`, error);
          // Continue with other drafts
        }
      }

      // Sort by timestamp (newest first)
      drafts.sort((a, b) => b.timestamp - a.timestamp);

      return drafts;
    } catch (error) {
      console.error('Failed to list drafts:', error);
      return [];
    }
  }

  /**
   * Delete a specific draft
   */
  async deleteDraft(wizardType: string, draftId: string): Promise<void> {
    try {
      await this.storage.delete(`${wizardType}-${draftId}`);
    } catch (error) {
      console.error('Failed to delete draft:', error);
      throw new Error(`Draft deletion failed: ${error}`);
    }
  }

  /**
   * Clear all drafts for a wizard type
   */
  async clearAllDrafts(wizardType: string): Promise<void> {
    try {
      const keys = await this.storage.list(wizardType);
      await Promise.all(
        keys.map(key => this.storage.delete(`${wizardType}-${key}`))
      );
    } catch (error) {
      console.error('Failed to clear all drafts:', error);
      throw new Error(`Clear all drafts failed: ${error}`);
    }
  }

  /**
   * Generate a unique draft ID
   */
  private generateDraftId(): string {
    return `draft-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Validate draft data structure
   */
  private isValidDraft(draftData: unknown): boolean {
    return (
      draftData &&
      typeof draftData === 'object' &&
      typeof draftData.id === 'string' &&
      typeof draftData.wizardType === 'string' &&
      typeof draftData.timestamp === 'number' &&
      draftData.data !== undefined &&
      draftData.version === '1.0'
    );
  }

  /**
   * Generate a preview string for the draft
   */
  private generatePreview(data: ProductionWizardData): string {
    if ('name' in data && data.name) {
      return data.name;
    }
    if ('id' in data) {
      return `Draft ${data.id.substring(0, 8)}`;
    }
    return 'Untitled Draft';
  }

  /**
   * Calculate completion percentage (simplified)
   */
  private calculateCompletion(data: ProductionWizardData): number {
    // This is a simplified calculation - can be made more sophisticated
    let filledFields = 0;
    let totalFields = 0;

    if ('name' in data) {
      totalFields += 3; // name, description, worldId
      if (data.name) filledFields++;
      if ('description' in data && data.description) filledFields++;
      if ('worldId' in data && data.worldId) filledFields++;
    }

    return totalFields > 0 ? Math.round((filledFields / totalFields) * 100) : 0;
  }

  /**
   * Enforce maximum drafts per wizard type
   */
  private async enforceMaxDrafts(wizardType: string): Promise<void> {
    try {
      const drafts = await this.listDrafts(wizardType);

      if (drafts.length > this.maxDraftsPerType) {
        const draftsToDelete = drafts.slice(this.maxDraftsPerType);

        for (const draft of draftsToDelete) {
          await this.deleteDraft(wizardType, draft.id);
        }
      }
    } catch (error) {
      console.warn('Failed to enforce max drafts limit:', error);
    }
  }

  /**
   * Set maximum drafts per type
   */
  setMaxDraftsPerType(max: number): void {
    this.maxDraftsPerType = max;
  }
}

// Export singleton instance
export const draftStorage = new DraftStorageService();


