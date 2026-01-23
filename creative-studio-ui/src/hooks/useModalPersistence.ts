/**
 * useModalPersistence Hook
 *
 * Provides draft persistence functionality for modal forms.
 * Supports saving, loading, and managing form drafts.
 */

import { useCallback } from 'react';
import type { ModalSchema, ModalDraft, ModalPersistence } from '@/types/modal';

/**
 * Default localStorage-based persistence implementation
 */
const createLocalStoragePersistence = (storageKey: string): ModalPersistence => {
  const getStorageKey = (schemaId: string, draftId?: string) => {
    return draftId ? `${storageKey}_${schemaId}_${draftId}` : `${storageKey}_${schemaId}`;
  };

  return {
    save: async (schemaId: string, data: Record<string, unknown>): Promise<string> => {
      const draftId = `draft_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const draft: ModalDraft = {
        schemaId,
        data,
        timestamp: Date.now(),
        id: draftId,
      };

      try {
        localStorage.setItem(getStorageKey(schemaId, draftId), JSON.stringify(draft));
        return draftId;
      } catch (error) {
        throw new Error('Failed to save draft to localStorage');
      }
    },

    load: async (schemaId: string, draftId: string): Promise<Record<string, unknown>> => {
      try {
        const stored = localStorage.getItem(getStorageKey(schemaId, draftId));
        if (!stored) {
          throw new Error('Draft not found');
        }

        const draft: ModalDraft = JSON.parse(stored);
        return draft.data;
      } catch (error) {
        throw new Error('Failed to load draft from localStorage');
      }
    },

    list: async (schemaId?: string): Promise<ModalDraft[]> => {
      const drafts: ModalDraft[] = [];

      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith(storageKey)) {
            const stored = localStorage.getItem(key);
            if (stored) {
              try {
                const draft: ModalDraft = JSON.parse(stored);
                if (!schemaId || draft.schemaId === schemaId) {
                  drafts.push(draft);
                }
              } catch {
                // Skip invalid entries
              }
            }
          }
        }

        // Sort by timestamp (newest first)
        return drafts.sort((a, b) => b.timestamp - a.timestamp);
      } catch (error) {
        return [];
      }
    },

    delete: async (schemaId: string, draftId: string): Promise<void> => {
      try {
        localStorage.removeItem(getStorageKey(schemaId, draftId));
      } catch (error) {
        throw new Error('Failed to delete draft from localStorage');
      }
    },
  };
};

/**
 * Hook for modal persistence
 */
export function useModalPersistence(
  schema: ModalSchema,
  customPersistence?: ModalPersistence
) {
  const persistence = customPersistence || createLocalStoragePersistence('modal_drafts');

  /**
   * Save current form data as draft
   */
  const saveDraft = useCallback(async (data: Record<string, unknown>): Promise<string> => {
    return persistence.save(schema.id, data);
  }, [persistence, schema.id]);

  /**
   * Load draft data
   */
  const loadDraft = useCallback(async (draftId: string): Promise<Record<string, unknown>> => {
    return persistence.load(schema.id, draftId);
  }, [persistence, schema.id]);

  /**
   * List all drafts for this schema
   */
  const listDrafts = useCallback(async (): Promise<ModalDraft[]> => {
    return persistence.list(schema.id);
  }, [persistence, schema.id]);

  /**
   * Delete a specific draft
   */
  const deleteDraft = useCallback(async (draftId: string): Promise<void> => {
    return persistence.delete(schema.id, draftId);
  }, [persistence, schema.id]);

  /**
   * Clean up old drafts (keep only most recent N drafts)
   */
  const cleanupDrafts = useCallback(async (keepCount = 10): Promise<void> => {
    try {
      const drafts = await persistence.list(schema.id);

      if (drafts.length <= keepCount) {
        return;
      }

      // Sort by timestamp (oldest first)
      const sortedDrafts = drafts.sort((a, b) => a.timestamp - b.timestamp);

      // Delete oldest drafts
      const draftsToDelete = sortedDrafts.slice(0, drafts.length - keepCount);

      for (const draft of draftsToDelete) {
        await persistence.delete(schema.id, draft.id);
      }
    } catch (error) {
      // Silently fail cleanup
    }
  }, [persistence, schema.id]);

  return {
    saveDraft,
    loadDraft,
    listDrafts,
    deleteDraft,
    cleanupDrafts,
  };
}
