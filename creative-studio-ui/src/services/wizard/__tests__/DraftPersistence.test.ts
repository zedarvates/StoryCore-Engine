/**
 * DraftPersistence Tests
 * Tests for draft save/load/delete functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { DraftPersistence } from '../DraftPersistence';
import type { WizardState } from '../../../types/wizard';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    },
  };
})();

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('DraftPersistence', () => {
  let draftPersistence: DraftPersistence;

  beforeEach(() => {
    localStorageMock.clear();
    draftPersistence = new DraftPersistence(false); // Use localStorage
  });

  afterEach(() => {
    draftPersistence.stopAutoSave();
  });

  describe('saveDraft', () => {
    it('should save a draft and return a draft ID', async () => {
      const wizardState: Partial<WizardState> = {
        currentStep: 2,
        completedSteps: new Set([1]),
        isReviewMode: false,
        projectType: {
          type: 'court-metrage',
          durationMinutes: 15,
        },
      };

      const draftId = await draftPersistence.saveDraft(wizardState);

      expect(draftId).toBeDefined();
      expect(draftId).toMatch(/^draft-\d+-[a-z0-9]+$/);
    });

    it('should reuse existing draft ID if provided', async () => {
      const existingDraftId = 'draft-123-abc';
      const wizardState: Partial<WizardState> = {
        currentStep: 2,
        draftId: existingDraftId,
        projectType: {
          type: 'court-metrage',
          durationMinutes: 15,
        },
      };

      const draftId = await draftPersistence.saveDraft(wizardState);

      expect(draftId).toBe(existingDraftId);
    });

    it('should update lastSaved timestamp', async () => {
      const wizardState: Partial<WizardState> = {
        currentStep: 2,
        projectType: {
          type: 'court-metrage',
          durationMinutes: 15,
        },
      };

      const beforeSave = Date.now();
      const draftId = await draftPersistence.saveDraft(wizardState);
      const afterSave = Date.now();

      const loaded = await draftPersistence.loadDraft(draftId);
      expect(loaded.lastSaved).toBeDefined();
      
      if (loaded.lastSaved) {
        const savedTime = loaded.lastSaved.getTime();
        expect(savedTime).toBeGreaterThanOrEqual(beforeSave);
        expect(savedTime).toBeLessThanOrEqual(afterSave);
      }
    });
  });

  describe('loadDraft', () => {
    it('should load a saved draft correctly', async () => {
      const wizardState: Partial<WizardState> = {
        currentStep: 3,
        completedSteps: new Set([1, 2]),
        isReviewMode: false,
        projectType: {
          type: 'long-metrage-standard',
          durationMinutes: 90,
        },
        genreStyle: {
          genres: ['action', 'sci-fi'],
          visualStyle: 'futuristic',
          colorPalette: {
            primary: '#0000FF',
            secondary: '#00FF00',
            accent: '#FF0000',
          },
          mood: ['tense', 'energetic'],
        },
      };

      const draftId = await draftPersistence.saveDraft(wizardState);
      const loaded = await draftPersistence.loadDraft(draftId);

      expect(loaded.currentStep).toBe(3);
      expect(loaded.completedSteps).toEqual(new Set([1, 2]));
      expect(loaded.isReviewMode).toBe(false);
      expect(loaded.projectType).toEqual(wizardState.projectType);
      expect(loaded.genreStyle).toEqual(wizardState.genreStyle);
    });

    it('should throw error for non-existent draft', async () => {
      await expect(draftPersistence.loadDraft('non-existent-id')).rejects.toThrow();
    });

    it('should correctly deserialize Set and Map types', async () => {
      const wizardState: Partial<WizardState> = {
        currentStep: 2,
        completedSteps: new Set([1]),
        validationErrors: new Map([[1, [{ field: 'test', message: 'error', severity: 'error' }]]]),
      };

      const draftId = await draftPersistence.saveDraft(wizardState);
      const loaded = await draftPersistence.loadDraft(draftId);

      expect(loaded.completedSteps).toBeInstanceOf(Set);
      expect(loaded.completedSteps).toEqual(new Set([1]));
      expect(loaded.validationErrors).toBeInstanceOf(Map);
      expect(loaded.validationErrors?.size).toBe(1);
    });
  });

  describe('listDrafts', () => {
    it('should return empty array when no drafts exist', async () => {
      const drafts = await draftPersistence.listDrafts();
      expect(drafts).toEqual([]);
    });

    it('should list all saved drafts with metadata', async () => {
      const state1: Partial<WizardState> = {
        currentStep: 2,
        completedSteps: new Set([1]),
        projectType: { type: 'court-metrage', durationMinutes: 15 },
      };

      const state2: Partial<WizardState> = {
        currentStep: 3,
        completedSteps: new Set([1, 2]),
        projectType: { type: 'long-metrage-standard', durationMinutes: 90 },
        storyStructure: {
          premise: 'A story about...',
          logline: 'Short summary',
          actStructure: '3-act',
          plotPoints: [],
          themes: [],
          motifs: [],
          narrativePerspective: 'third-person-limited',
        },
      };

      await draftPersistence.saveDraft(state1);
      await draftPersistence.saveDraft(state2);

      const drafts = await draftPersistence.listDrafts();

      expect(drafts).toHaveLength(2);
      expect(drafts[0]).toHaveProperty('id');
      expect(drafts[0]).toHaveProperty('projectName');
      expect(drafts[0]).toHaveProperty('lastSaved');
      expect(drafts[0]).toHaveProperty('currentStep');
      expect(drafts[0]).toHaveProperty('completedSteps');
    });

    it('should sort drafts by last saved date (newest first)', async () => {
      const state1: Partial<WizardState> = {
        currentStep: 1,
        projectType: { type: 'court-metrage', durationMinutes: 15 },
      };

      const state2: Partial<WizardState> = {
        currentStep: 2,
        projectType: { type: 'long-metrage-standard', durationMinutes: 90 },
      };

      const id1 = await draftPersistence.saveDraft(state1);
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const id2 = await draftPersistence.saveDraft(state2);

      const drafts = await draftPersistence.listDrafts();

      expect(drafts[0].id).toBe(id2); // Newest first
      expect(drafts[1].id).toBe(id1);
    });
  });

  describe('deleteDraft', () => {
    it('should delete a draft successfully', async () => {
      const wizardState: Partial<WizardState> = {
        currentStep: 2,
        projectType: { type: 'court-metrage', durationMinutes: 15 },
      };

      const draftId = await draftPersistence.saveDraft(wizardState);
      
      let drafts = await draftPersistence.listDrafts();
      expect(drafts).toHaveLength(1);

      await draftPersistence.deleteDraft(draftId);

      drafts = await draftPersistence.listDrafts();
      expect(drafts).toHaveLength(0);
    });

    it('should not throw when deleting non-existent draft', async () => {
      await expect(draftPersistence.deleteDraft('non-existent')).resolves.not.toThrow();
    });
  });

  describe('autoSave', () => {
    it('should auto-save at specified interval', async () => {
      let saveCount = 0;
      const wizardState: Partial<WizardState> = {
        currentStep: 2,
        projectType: { type: 'court-metrage', durationMinutes: 15 },
      };

      const getState = () => {
        saveCount++;
        return wizardState;
      };

      // Use short interval for testing (100ms)
      draftPersistence.autoSave(getState, 100);

      // Wait for multiple auto-saves
      await new Promise(resolve => setTimeout(resolve, 350));

      draftPersistence.stopAutoSave();

      // Should have auto-saved at least 3 times
      expect(saveCount).toBeGreaterThanOrEqual(3);
    });

    it('should not auto-save if on step 1', async () => {
      const wizardState: Partial<WizardState> = {
        currentStep: 1,
        projectType: { type: 'court-metrage', durationMinutes: 15 },
      };

      const getState = () => wizardState;

      draftPersistence.autoSave(getState, 100);

      await new Promise(resolve => setTimeout(resolve, 250));

      draftPersistence.stopAutoSave();

      const drafts = await draftPersistence.listDrafts();
      expect(drafts).toHaveLength(0);
    });

    it('should stop auto-save when stopAutoSave is called', async () => {
      let saveCount = 0;
      const wizardState: Partial<WizardState> = {
        currentStep: 2,
        projectType: { type: 'court-metrage', durationMinutes: 15 },
      };

      const getState = () => {
        saveCount++;
        return wizardState;
      };

      draftPersistence.autoSave(getState, 100);

      await new Promise(resolve => setTimeout(resolve, 150));

      draftPersistence.stopAutoSave();

      const countAfterStop = saveCount;

      await new Promise(resolve => setTimeout(resolve, 200));

      // Count should not increase after stop
      expect(saveCount).toBe(countAfterStop);
    });
  });

  describe('max drafts enforcement', () => {
    it('should enforce maximum draft limit', async () => {
      draftPersistence.setMaxDrafts(3);

      // Create 5 drafts
      for (let i = 0; i < 5; i++) {
        const state: Partial<WizardState> = {
          currentStep: i + 1,
          projectType: { type: 'court-metrage', durationMinutes: 15 },
        };
        await draftPersistence.saveDraft(state);
        // Small delay to ensure different timestamps
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      const drafts = await draftPersistence.listDrafts();

      // Should only keep 3 most recent drafts
      expect(drafts.length).toBeLessThanOrEqual(3);
    });
  });
});
