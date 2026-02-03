/**
 * Unit tests for Character Integration System UI state in useAppStore
 * 
 * Tests the character-specific UI state management including:
 * - Selected character IDs
 * - Character search query
 * - Character filters
 * - Character editor open/close state
 * 
 * Requirements: 4.2, 9.1, 9.2, 9.3
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '../useAppStore';
import type { CharacterFilters } from '../useAppStore';

describe('useAppStore - Character Integration System UI State', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    const store = useAppStore.getState();
    store.setSelectedCharacterIds([]);
    store.setCharacterSearchQuery('');
    store.setCharacterFilters({});
    store.closeCharacterEditor();
  });

  describe('selectedCharacterIds', () => {
    it('should initialize with empty array', () => {
      const { selectedCharacterIds } = useAppStore.getState();
      expect(selectedCharacterIds).toEqual([]);
    });

    it('should update selected character IDs', () => {
      const { setSelectedCharacterIds } = useAppStore.getState();
      const characterIds = ['char-1', 'char-2', 'char-3'];

      setSelectedCharacterIds(characterIds);

      const { selectedCharacterIds } = useAppStore.getState();
      expect(selectedCharacterIds).toEqual(characterIds);
    });

    it('should replace previous selection when setting new IDs', () => {
      const { setSelectedCharacterIds } = useAppStore.getState();

      setSelectedCharacterIds(['char-1', 'char-2']);
      setSelectedCharacterIds(['char-3', 'char-4']);

      const { selectedCharacterIds } = useAppStore.getState();
      expect(selectedCharacterIds).toEqual(['char-3', 'char-4']);
    });

    it('should handle empty array selection', () => {
      const { setSelectedCharacterIds } = useAppStore.getState();

      setSelectedCharacterIds(['char-1', 'char-2']);
      setSelectedCharacterIds([]);

      const { selectedCharacterIds } = useAppStore.getState();
      expect(selectedCharacterIds).toEqual([]);
    });
  });

  describe('characterSearchQuery', () => {
    it('should initialize with empty string', () => {
      const { characterSearchQuery } = useAppStore.getState();
      expect(characterSearchQuery).toBe('');
    });

    it('should update search query', () => {
      const { setCharacterSearchQuery } = useAppStore.getState();
      const query = 'hero';

      setCharacterSearchQuery(query);

      const { characterSearchQuery } = useAppStore.getState();
      expect(characterSearchQuery).toBe(query);
    });

    it('should handle empty search query', () => {
      const { setCharacterSearchQuery } = useAppStore.getState();

      setCharacterSearchQuery('hero');
      setCharacterSearchQuery('');

      const { characterSearchQuery } = useAppStore.getState();
      expect(characterSearchQuery).toBe('');
    });

    it('should handle special characters in search query', () => {
      const { setCharacterSearchQuery } = useAppStore.getState();
      const query = 'hero-123 @special';

      setCharacterSearchQuery(query);

      const { characterSearchQuery } = useAppStore.getState();
      expect(characterSearchQuery).toBe(query);
    });
  });

  describe('characterFilters', () => {
    it('should initialize with empty object', () => {
      const { characterFilters } = useAppStore.getState();
      expect(characterFilters).toEqual({});
    });

    it('should update archetype filter', () => {
      const { setCharacterFilters } = useAppStore.getState();
      const filters: CharacterFilters = {
        archetype: ['hero', 'mentor'],
      };

      setCharacterFilters(filters);

      const { characterFilters } = useAppStore.getState();
      expect(characterFilters).toEqual(filters);
    });

    it('should update age range filter', () => {
      const { setCharacterFilters } = useAppStore.getState();
      const filters: CharacterFilters = {
        ageRange: ['young-adult', 'adult'],
      };

      setCharacterFilters(filters);

      const { characterFilters } = useAppStore.getState();
      expect(characterFilters).toEqual(filters);
    });

    it('should update creation method filter', () => {
      const { setCharacterFilters } = useAppStore.getState();
      const filters: CharacterFilters = {
        creationMethod: ['wizard', 'manual'],
      };

      setCharacterFilters(filters);

      const { characterFilters } = useAppStore.getState();
      expect(characterFilters).toEqual(filters);
    });

    it('should update multiple filters at once', () => {
      const { setCharacterFilters } = useAppStore.getState();
      const filters: CharacterFilters = {
        archetype: ['hero', 'villain'],
        ageRange: ['adult'],
        creationMethod: ['wizard'],
      };

      setCharacterFilters(filters);

      const { characterFilters } = useAppStore.getState();
      expect(characterFilters).toEqual(filters);
    });

    it('should replace previous filters when setting new filters', () => {
      const { setCharacterFilters } = useAppStore.getState();

      setCharacterFilters({ archetype: ['hero'] });
      setCharacterFilters({ ageRange: ['adult'] });

      const { characterFilters } = useAppStore.getState();
      expect(characterFilters).toEqual({ ageRange: ['adult'] });
    });

    it('should handle empty filters object', () => {
      const { setCharacterFilters } = useAppStore.getState();

      setCharacterFilters({ archetype: ['hero'] });
      setCharacterFilters({});

      const { characterFilters } = useAppStore.getState();
      expect(characterFilters).toEqual({});
    });
  });

  describe('character editor state', () => {
    it('should initialize with editor closed', () => {
      const { isCharacterEditorOpen, editingCharacterId } = useAppStore.getState();
      expect(isCharacterEditorOpen).toBe(false);
      expect(editingCharacterId).toBeNull();
    });

    it('should open character editor with character ID', () => {
      const { openCharacterEditor } = useAppStore.getState();
      const characterId = 'char-123';

      openCharacterEditor(characterId);

      const { isCharacterEditorOpen, editingCharacterId } = useAppStore.getState();
      expect(isCharacterEditorOpen).toBe(true);
      expect(editingCharacterId).toBe(characterId);
    });

    it('should close character editor and clear editing ID', () => {
      const { openCharacterEditor, closeCharacterEditor } = useAppStore.getState();

      openCharacterEditor('char-123');
      closeCharacterEditor();

      const { isCharacterEditorOpen, editingCharacterId } = useAppStore.getState();
      expect(isCharacterEditorOpen).toBe(false);
      expect(editingCharacterId).toBeNull();
    });

    it('should replace editing character ID when opening editor for different character', () => {
      const { openCharacterEditor } = useAppStore.getState();

      openCharacterEditor('char-1');
      openCharacterEditor('char-2');

      const { isCharacterEditorOpen, editingCharacterId } = useAppStore.getState();
      expect(isCharacterEditorOpen).toBe(true);
      expect(editingCharacterId).toBe('char-2');
    });
  });

  describe('integration scenarios', () => {
    it('should maintain independent state for all character UI properties', () => {
      const {
        setSelectedCharacterIds,
        setCharacterSearchQuery,
        setCharacterFilters,
        openCharacterEditor,
      } = useAppStore.getState();

      // Set all character UI state
      setSelectedCharacterIds(['char-1', 'char-2']);
      setCharacterSearchQuery('hero');
      setCharacterFilters({ archetype: ['hero'] });
      openCharacterEditor('char-1');

      const state = useAppStore.getState();
      expect(state.selectedCharacterIds).toEqual(['char-1', 'char-2']);
      expect(state.characterSearchQuery).toBe('hero');
      expect(state.characterFilters).toEqual({ archetype: ['hero'] });
      expect(state.isCharacterEditorOpen).toBe(true);
      expect(state.editingCharacterId).toBe('char-1');
    });

    it('should not affect other store state when updating character UI state', () => {
      const {
        setSelectedCharacterIds,
        setShowChat,
        showChat,
      } = useAppStore.getState();

      // Set non-character state
      setShowChat(true);

      // Update character state
      setSelectedCharacterIds(['char-1']);

      // Verify non-character state is unchanged
      const state = useAppStore.getState();
      expect(state.showChat).toBe(true);
      expect(state.selectedCharacterIds).toEqual(['char-1']);
    });

    it('should handle rapid state updates correctly', () => {
      const { setCharacterSearchQuery } = useAppStore.getState();

      // Simulate rapid typing
      setCharacterSearchQuery('h');
      setCharacterSearchQuery('he');
      setCharacterSearchQuery('her');
      setCharacterSearchQuery('hero');

      const { characterSearchQuery } = useAppStore.getState();
      expect(characterSearchQuery).toBe('hero');
    });
  });
});
