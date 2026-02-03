// ============================================================================
// Character Sync Hook - Unified Character State Management
// ============================================================================
// Ensures characters are stored in a SINGLE source of truth
// Prevents duplication between project.characters and store.characters
//
// Problem: Characters were being stored in two places causing:
// - Data inconsistency between project state and store state
// - Lost characters when switching projects
// - Duplicate characters in UI
//
// Solution: All characters go through the store, project references store characters
//
// Requirements: 8.1, 8.4
// ============================================================================

import { useEffect, useCallback, useMemo } from 'react';
import { useStore } from '../store';
import type { Character } from '../types/character';
import { Logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface CharacterSyncState {
  isLoading: boolean;
  error: string | null;
  lastSynced: Date | null;
}

export interface CharacterSyncActions {
  addCharacter: (character: Character) => void;
  updateCharacter: (id: string, updates: Partial<Character>) => void;
  deleteCharacter: (id: string) => void;
  getCharacterById: (id: string) => Character | undefined;
  getAllCharacters: () => Character[];
  initializeFromProject: (projectCharacters: Character[]) => void;
  clearAllCharacters: () => void;
  syncToProject: () => void;
  validateCharacters: () => { valid: Character[]; invalid: string[] };
}

export interface CharacterSyncResult extends CharacterSyncState, CharacterSyncActions {
  characters: Character[];
  characterCount: number;
  hasCharacters: boolean;
  projectHasCharacters: boolean;
  isInSync: boolean;
}

// ============================================================================
// Character Sync Hook
// ============================================================================

/**
 * Hook that provides unified character state management
 * Prevents duplication between project.characters and store.characters
 *
 * All character operations should go through this hook to ensure
 * a single source of truth.
 *
 * Requirements: 8.1, 8.4
 */
export function useCharacterSync(): CharacterSyncResult {
  // ============================================================================
  // Store Selectors
  // ============================================================================
  const characters = useStore((state) => state.characters);
  const project = useStore((state) => state.project);
  const setProject = useStore((state) => state.setProject);
  const addCharacterStore = useStore((state) => state.addCharacter);
  const updateCharacterStore = useStore((state) => state.updateCharacter);
  const deleteCharacterStore = useStore((state) => state.deleteCharacter);
  const getCharacterByIdStore = useStore((state) => state.getCharacterById);
  const setCharactersStore = useStore((state) => state.setCharacters);

  // ============================================================================
  // Local State for Sync Status
  // ============================================================================
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  // ============================================================================
  // Validation Helper
  // ============================================================================
  const validateCharacter = useCallback((char: unknown): char is Character => {
    if (!char || typeof char !== 'object') return false;
    
    const c = char as Record<string, unknown>;
    return (
      typeof c.character_id === 'string' &&
      typeof c.name === 'string' &&
      typeof c.creation_method === 'string' &&
      typeof c.creation_timestamp === 'string' &&
      typeof c.version === 'string' &&
      c.visual_identity !== null &&
      typeof c.visual_identity === 'object' &&
      c.personality !== null &&
      typeof c.personality === 'object' &&
      c.background !== null &&
      typeof c.background === 'object' &&
      c.role !== null &&
      typeof c.role === 'object' &&
      Array.isArray(c.relationships)
    );
  }, []);

  // ============================================================================
  // Sync Effect - Ensure project.characters matches store.characters
  // ============================================================================
  useEffect(() => {
    if (!project) return;

    // Check if sync is needed
    const needsSync = !project.characters ||
      project.characters.length !== characters.length ||
      project.characters.some(
        (c) => !characters.some((sc) => sc.character_id === c.character_id)
      );

    if (needsSync) {
      Logger.info('[useCharacterSync] Syncing characters to project:', characters.length);
      setProject({
        ...project,
        characters: characters,
      });
      setLastSynced(new Date());
    }
  }, [characters, project, setProject]);

  // ============================================================================
  // Character Operations
  // ============================================================================

  /**
   * Add a character to the store (single source of truth)
   * Automatically syncs to project.characters
   */
  const addCharacter = useCallback((character: Character) => {
    try {
      // Validate character before adding
      if (!validateCharacter(character)) {
        throw new Error('Invalid character data structure');
      }

      Logger.info('[useCharacterSync] Adding character:', character.name);
      addCharacterStore(character);
      setLastSynced(new Date());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add character';
      Logger.error('[useCharacterSync] Error adding character:', message);
      setError(message);
      throw err;
    }
  }, [addCharacterStore, validateCharacter]);

  /**
   * Update a character in the store
   */
  const updateCharacter = useCallback((id: string, updates: Partial<Character>) => {
    try {
      if (!id) {
        throw new Error('Character ID is required');
      }

      Logger.info('[useCharacterSync] Updating character:', id);
      updateCharacterStore(id, updates);
      setLastSynced(new Date());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update character';
      Logger.error('[useCharacterSync] Error updating character:', message);
      setError(message);
      throw err;
    }
  }, [updateCharacterStore]);

  /**
   * Delete a character from the store
   */
  const deleteCharacter = useCallback((id: string) => {
    try {
      if (!id) {
        throw new Error('Character ID is required');
      }

      Logger.info('[useCharacterSync] Deleting character:', id);
      deleteCharacterStore(id);
      setLastSynced(new Date());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete character';
      Logger.error('[useCharacterSync] Error deleting character:', message);
      setError(message);
      throw err;
    }
  }, [deleteCharacterStore]);

  /**
   * Get a character by ID from store
   */
  const getCharacterById = useCallback((id: string) => {
    if (!id) return undefined;
    return getCharacterByIdStore(id);
  }, [getCharacterByIdStore]);

  /**
   * Get all characters from store
   */
  const getAllCharacters = useCallback(() => {
    return characters;
  }, [characters]);

  /**
   * Initialize characters from project to store
   * Should be called when loading a project
   */
  const initializeFromProject = useCallback((projectCharacters: Character[]) => {
    setIsLoading(true);
    try {
      Logger.info('[useCharacterSync] Initializing from project:', projectCharacters.length, 'characters');

      // Validate all characters before adding
      const validCharacters: Character[] = [];
      const invalidIds: string[] = [];

      projectCharacters.forEach((char) => {
        if (validateCharacter(char)) {
          validCharacters.push(char);
        } else {
          invalidIds.push(char.character_id || 'unknown');
          Logger.warn('[useCharacterSync] Invalid character found:', char.character_id);
        }
      });

      if (invalidIds.length > 0) {
        Logger.warn('[useCharacterSync] Skipped', invalidIds.length, 'invalid characters');
        setError(`Skipped ${invalidIds.length} invalid characters`);
      }

      // Clear existing characters and add project characters
      setCharactersStore(validCharacters);
      setLastSynced(new Date());
      setError(null);
      
      Logger.info('[useCharacterSync] Successfully initialized', validCharacters.length, 'characters');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to initialize characters';
      Logger.error('[useCharacterSync] Error initializing characters:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [setCharactersStore, validateCharacter]);

  /**
   * Clear all characters from store
   * Should be called when closing a project
   */
  const clearAllCharacters = useCallback(() => {
    try {
      Logger.info('[useCharacterSync] Clearing all characters');
      setCharactersStore([]);
      setLastSynced(new Date());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear characters';
      Logger.error('[useCharacterSync] Error clearing characters:', message);
      setError(message);
      throw err;
    }
  }, [setCharactersStore]);

  /**
   * Force sync to project
   * Can be called manually to ensure project is in sync
   */
  const syncToProject = useCallback(() => {
    if (!project) {
      Logger.warn('[useCharacterSync] No project to sync to');
      return;
    }

    try {
      Logger.info('[useCharacterSync] Force syncing characters to project');
      setProject({
        ...project,
        characters: characters,
      });
      setLastSynced(new Date());
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to sync to project';
      Logger.error('[useCharacterSync] Error syncing to project:', message);
      setError(message);
      throw err;
    }
  }, [project, characters, setProject]);

  /**
   * Validate all characters in store
   * Returns valid and invalid character IDs
   */
  const validateCharacters = useCallback(() => {
    const valid: Character[] = [];
    const invalid: string[] = [];

    characters.forEach((char) => {
      if (validateCharacter(char)) {
        valid.push(char);
      } else {
        invalid.push(char.character_id);
      }
    });

    return { valid, invalid };
  }, [characters, validateCharacter]);

  // ============================================================================
  // Derived State
  // ============================================================================
  const characterCount = characters.length;
  const hasCharacters = characters.length > 0;
  const projectHasCharacters = (project?.characters?.length || 0) > 0;

  // Check if store and project are in sync
  const isInSync = useMemo(() => {
    if (!project) return true; // No project, always in sync
    if (!project.characters) return characters.length === 0;
    if (project.characters.length !== characters.length) return false;
    
    // Check if all characters match
    return characters.every(
      (char) => project.characters.some(
        (pc) => pc.character_id === char.character_id
      )
    );
  }, [characters, project]);

  // ============================================================================
  // Return
  // ============================================================================
  return {
    // State
    characters,
    characterCount,
    isLoading,
    error,
    lastSynced,
    hasCharacters,
    projectHasCharacters,
    isInSync,

    // Actions
    addCharacter,
    updateCharacter,
    deleteCharacter,
    getCharacterById,
    getAllCharacters,
    initializeFromProject,
    clearAllCharacters,
    syncToProject,
    validateCharacters,
  };
}

// Import useState at the top
import { useState } from 'react';

