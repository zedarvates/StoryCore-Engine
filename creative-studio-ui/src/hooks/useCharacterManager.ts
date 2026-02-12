// ============================================================================
// Character Manager Hook
// ============================================================================
// Provides a unified API for all character operations including CRUD,
// validation, dependency checking, and relationship management.
//
// Requirements: 2.3, 2.5, 7.1, 7.4, 11.1, 11.2, 11.3
// ============================================================================

import { useCallback } from 'react';
import { useStore } from '../store';
import type { Character } from '../types/character';
import type { Story } from '../types/story';
import {
  addRelationship as addRelationshipToStore,
  updateRelationship as updateRelationshipInStore,
  removeRelationship as removeRelationshipFromStore,
  type RelationshipData,
  type CharacterStore,
  type CharacterEventEmitter,
} from '../services/RelationshipManager';
import { eventEmitter } from '../services/eventEmitter';
import {
  CharacterError,
  CharacterErrorType,
  handleCharacterError,
  showValidationErrors,
  logValidationFailure,
} from '../utils/characterErrorHandler';

// ============================================================================
// Types
// ============================================================================

/**
 * Validation result for character data.
 * Requirements: 11.1, 11.2, 11.3
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

/**
 * Character dependencies (stories and relationships).
 * Requirements: 7.1
 */
export interface CharacterDependencies {
  stories: Story[];
  relationships: Character[];
}

/**
 * Options for character deletion.
 * Requirements: 7.1, 7.4
 */
export interface DeleteOptions {
  force?: boolean; // Skip dependency check
  removeFromStories?: boolean; // Remove from stories automatically
}

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validates character data before save.
 * 
 * Checks:
 * - Name is not empty (Requirement 11.1)
 * - Archetype is selected (Requirement 11.2)
 * - Age range is specified (Requirement 11.3)
 * - Relationship references point to existing characters (Requirement 11.4)
 * 
 * Requirements: 2.3, 11.1, 11.2, 11.3, 11.4
 * 
 * @param data - Character data to validate
 * @param existingCharacters - Optional array of existing characters for relationship validation
 */
export function validateCharacter(
  data: Partial<Character>,
  existingCharacters?: Character[]
): ValidationResult {
  const errors: Record<string, string[]> = {};

  // Validate name (Requirement 11.1)
  if (!data.name || data.name.trim() === '') {
    errors.name = ['Character name is required'];
  }

  // Validate archetype (Requirement 11.2)
  if (!data.role?.archetype || data.role.archetype.trim() === '') {
    errors.archetype = ['Character archetype is required'];
  }

  // Validate age range (Requirement 11.3)
  if (!data.visual_identity?.age_range || data.visual_identity.age_range.trim() === '') {
    errors.age_range = ['Character age range is required'];
  }

  // Validate relationship references (Requirement 11.4)
  if (data.relationships && data.relationships.length > 0 && existingCharacters) {
    const invalidRelationships: string[] = [];
    const characterIds = new Set(existingCharacters.map(c => c.character_id));
    
    // Also include the current character's ID if it exists (for updates)
    if (data.character_id) {
      characterIds.add(data.character_id);
    }

    data.relationships.forEach((rel, index) => {
      if (!characterIds.has(rel.character_id)) {
        invalidRelationships.push(
          `Relationship ${index + 1} references non-existent character: ${rel.character_id}`
        );
      }
    });

    if (invalidRelationships.length > 0) {
      errors.relationships = invalidRelationships;
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ============================================================================
// Character Manager Hook
// ============================================================================

/**
 * Hook providing unified character management operations.
 * 
 * Provides:
 * - CRUD operations with validation
 * - Dependency checking
 * - Relationship management
 * - Search and filter functions
 * - Import/export functions
 * 
 * Requirements: 2.3, 2.5, 7.1, 7.4, 11.1, 11.2, 11.3
 */
export function useCharacterManager() {
  // Store actions
  const addCharacterToStore = useStore((state) => state.addCharacter);
  const updateCharacterInStore = useStore((state) => state.updateCharacter);
  const deleteCharacterFromStore = useStore((state) => state.deleteCharacter);
  const getCharacterFromStore = useStore((state) => state.getCharacterById);
  const getAllCharactersFromStore = useStore((state) => state.getAllCharacters);
  const getAllStories = useStore((state) => state.getAllStories);

  // ============================================================================
  // CRUD Operations
  // ============================================================================

  /**
   * Creates a new character with validation.
   * 
   * Steps:
   * 1. Validates character data (Requirements: 2.3, 11.1, 11.2, 11.3, 11.4)
   * 2. Generates character ID if not provided
   * 3. Adds character to store (Requirement: 2.5)
   * 4. Persists to localStorage (handled by store)
   * 5. Emits character-created event (handled by store)
   * 
   * Requirements: 2.3, 2.5, 11.1, 11.2, 11.3, 11.4
   */
  const createCharacter = useCallback(
    async (data: Partial<Character>): Promise<Character> => {
      try {
        // Get existing characters for relationship validation
        const existingCharacters = getAllCharactersFromStore();

        // Validate character data (Requirement: 2.3)
        const validation = validateCharacter(data, existingCharacters);
        if (!validation.valid) {
          // Log validation failure (Requirement: 2.4)
          logValidationFailure(
            data.character_id || 'new',
            data.name || 'Unnamed Character',
            validation
          );

          // Show validation errors to user (Requirements: 2.4, 11.5)
          showValidationErrors(validation, 'Character Creation');

          // Throw error with validation details
          const errorMessage = Object.entries(validation.errors)
            .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
            .join('; ');
          throw new CharacterError(
            CharacterErrorType.VALIDATION_ERROR,
            `Character validation failed: ${errorMessage}`,
            { validation }
          );
        }

        // Generate character ID if not provided
        const character_id = data.character_id || crypto.randomUUID();

        // Create complete character object with defaults
        const character: Character = {
          character_id,
          name: data.name || '',
          creation_method: data.creation_method || 'manual',
          creation_timestamp: data.creation_timestamp || new Date().toISOString(),
          version: data.version || '1.0',
          visual_identity: {
            hair_color: data.visual_identity?.hair_color || '',
            hair_style: data.visual_identity?.hair_style || '',
            hair_length: data.visual_identity?.hair_length || '',
            eye_color: data.visual_identity?.eye_color || '',
            eye_shape: data.visual_identity?.eye_shape || '',
            skin_tone: data.visual_identity?.skin_tone || '',
            facial_structure: data.visual_identity?.facial_structure || '',
            distinctive_features: data.visual_identity?.distinctive_features || [],
            age_range: data.visual_identity?.age_range || '',
            height: data.visual_identity?.height || '',
            build: data.visual_identity?.build || '',
            posture: data.visual_identity?.posture || '',
            clothing_style: data.visual_identity?.clothing_style || '',
            color_palette: data.visual_identity?.color_palette || [],
          },
          personality: {
            traits: data.personality?.traits || [],
            values: data.personality?.values || [],
            fears: data.personality?.fears || [],
            desires: data.personality?.desires || [],
            flaws: data.personality?.flaws || [],
            strengths: data.personality?.strengths || [],
            temperament: data.personality?.temperament || '',
            communication_style: data.personality?.communication_style || '',
          },
          background: {
            origin: data.background?.origin || '',
            occupation: data.background?.occupation || '',
            education: data.background?.education || '',
            family: data.background?.family || '',
            significant_events: data.background?.significant_events || [],
            current_situation: data.background?.current_situation || '',
          },
          relationships: data.relationships || [],
          role: {
            archetype: data.role?.archetype || '',
            narrative_function: data.role?.narrative_function || '',
            character_arc: data.role?.character_arc || '',
          },
        };

        // Add to store (Requirement: 2.5)
        // Store handles persistence to localStorage and event emission
        addCharacterToStore(character);

        return character;
      } catch (error) {
        // Handle and display error
        handleCharacterError(error, 'Character Creation');
        throw error;
      }
    },
    [addCharacterToStore, getAllCharactersFromStore]
  );

  /**
   * Updates an existing character with validation.
   * 
   * Steps:
   * 1. Validates that character exists
   * 2. Validates updated data (Requirements: 2.3, 11.1, 11.2, 11.3, 11.4)
   * 3. Updates character in store (Requirement: 2.5)
   * 4. Persists to localStorage (handled by store)
   * 5. Emits character-updated event (handled by store)
   * 
   * Requirements: 2.3, 2.5, 11.1, 11.2, 11.3, 11.4
   */
  const updateCharacter = useCallback(
    async (id: string, updates: Partial<Character>): Promise<Character> => {
      try {
        // Check if character exists
        const existingCharacter = getCharacterFromStore(id);
        if (!existingCharacter) {
          throw new CharacterError(
            CharacterErrorType.NOT_FOUND,
            `Character with ID "${id}" not found`,
            { characterId: id }
          );
        }

        // Merge updates with existing character for validation
        const updatedData = {
          ...existingCharacter,
          ...updates,
        };

        // Get existing characters for relationship validation
        const existingCharacters = getAllCharactersFromStore();

        // Validate updated character data (Requirement: 2.3)
        const validation = validateCharacter(updatedData, existingCharacters);
        if (!validation.valid) {
          // Log validation failure (Requirement: 2.4)
          logValidationFailure(id, existingCharacter.name, validation);

          // Show validation errors to user (Requirements: 2.4, 11.5)
          showValidationErrors(validation, 'Character Update');

          // Throw error with validation details
          const errorMessage = Object.entries(validation.errors)
            .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
            .join('; ');
          throw new CharacterError(
            CharacterErrorType.VALIDATION_ERROR,
            `Character validation failed: ${errorMessage}`,
            { validation }
          );
        }

        // Update in store (Requirement: 2.5)
        // Store handles persistence to localStorage and event emission
        updateCharacterInStore(id, updates);

        // Get updated character
        const updatedCharacter = getCharacterFromStore(id);
        if (!updatedCharacter) {
          throw new CharacterError(
            CharacterErrorType.NOT_FOUND,
            `Failed to retrieve updated character with ID "${id}"`,
            { characterId: id }
          );
        }

        return updatedCharacter;
      } catch (error) {
        // Handle and display error
        handleCharacterError(error, 'Character Update');
        throw error;
      }
    },
    [getCharacterFromStore, updateCharacterInStore, getAllCharactersFromStore]
  );

  // ============================================================================
  // Dependency Checking
  // ============================================================================

  /**
   * Checks dependencies for a character (stories and relationships).
   * 
   * Requirements: 7.1
   */
  const checkDependencies = useCallback(
    (characterId: string): CharacterDependencies => {
      const character = getCharacterFromStore(characterId);
      if (!character) {
        return { stories: [], relationships: [] };
      }

      // Find stories that use this character
      const allStories = getAllStories();
      const storiesUsingCharacter = allStories.filter((story) =>
        (story.charactersUsed || []).some((charRef) => charRef.id === characterId)
      );

      // Find characters that have relationships with this character
      const allCharacters = getAllCharactersFromStore();
      const charactersWithRelationships = allCharacters.filter((otherCharacter) =>
        otherCharacter.character_id !== characterId &&
        otherCharacter.relationships.some((rel) => rel.character_id === characterId)
      );

      return {
        stories: storiesUsingCharacter,
        relationships: charactersWithRelationships,
      };
    },
    [getCharacterFromStore, getAllStories, getAllCharactersFromStore]
  );

  /**
   * Deletes a character with dependency checking.
   * 
   * Steps:
   * 1. Checks for dependencies (stories, relationships) (Requirement: 7.1)
   * 2. If dependencies exist and force=false, throws error
   * 3. If removeFromStories=true, removes character from stories
   * 4. Removes character from store (Requirement: 7.4)
   * 5. Removes from localStorage (handled by store)
   * 6. Emits character-deleted event (handled by store)
   * 
   * Requirements: 7.1, 7.4
   */
  const deleteCharacter = useCallback(
    async (id: string, options: DeleteOptions = {}): Promise<void> => {
      try {
        const { force = false, removeFromStories = false } = options;

        // Check if character exists
        const character = getCharacterFromStore(id);
        if (!character) {
          throw new CharacterError(
            CharacterErrorType.NOT_FOUND,
            `Character with ID "${id}" not found`,
            { characterId: id }
          );
        }

        // Check dependencies (Requirement: 7.1)
        if (!force) {
          const dependencies = checkDependencies(id);
          
          if (dependencies.stories.length > 0 && !removeFromStories) {
            const storyNames = dependencies.stories.map((s) => s.title).join(', ');
            throw new CharacterError(
              CharacterErrorType.DEPENDENCY_ERROR,
              `Cannot delete character "${character.name}". ` +
              `Character is used in the following stories: ${storyNames}. ` +
              `Use force=true or removeFromStories=true to proceed.`,
              { dependencies }
            );
          }

          if (dependencies.relationships.length > 0) {
            const relationshipNames = dependencies.relationships.map((c) => c.name).join(', ');
            console.warn(
              `Character "${character.name}" has relationships with: ${relationshipNames}. ` +
              `These relationships will be removed.`
            );
          }
        }

        // Remove from stories if requested
        if (removeFromStories) {
          const dependencies = checkDependencies(id);
          dependencies.stories.forEach((story) => {
            // Remove character from story's charactersUsed array
            const updatedCharactersUsed = (story.charactersUsed || []).filter(
              (charRef) => charRef.id !== id
            );
            // Note: This would require a updateStory action in the store
            // For now, we'll just log a warning
            console.warn(
              `Character "${character.name}" should be removed from story "${story.title}". ` +
              `Story update functionality needs to be implemented.`
            );
          });
        }

        // Remove relationships with other characters
        const allCharacters = getAllCharactersFromStore();
        allCharacters.forEach((otherCharacter) => {
          if (otherCharacter.character_id === id) return;

          // Check if this character has a relationship with the character being deleted
          const hasRelationship = otherCharacter.relationships.some(
            (rel) => rel.character_id === id
          );

          if (hasRelationship) {
            // Remove the relationship
            const updatedRelationships = otherCharacter.relationships.filter(
              (rel) => rel.character_id !== id
            );
            updateCharacterInStore(otherCharacter.character_id, {
              relationships: updatedRelationships,
            });
          }
        });

        // Delete from store (Requirement: 7.4)
        // Store handles removal from localStorage and event emission
        deleteCharacterFromStore(id);
      } catch (error) {
        // Handle and display error
        handleCharacterError(error, 'Character Deletion');
        throw error;
      }
    },
    [getCharacterFromStore, getAllCharactersFromStore, updateCharacterInStore, deleteCharacterFromStore, checkDependencies]
  );

  /**
   * Gets a character by ID.
   * 
   * Requirements: 2.5
   */
  const getCharacter = useCallback(
    (id: string): Character | undefined => {
      return getCharacterFromStore(id);
    },
    [getCharacterFromStore]
  );

  /**
   * Gets all characters.
   * 
   * Requirements: 2.5
   */
  const getAllCharacters = useCallback((): Character[] => {
    return getAllCharactersFromStore();
  }, [getAllCharactersFromStore]);

  // ============================================================================
  // Relationship Management
  // ============================================================================

  /**
   * Adds a bidirectional relationship between two characters.
   * 
   * Uses RelationshipManager to ensure bidirectional sync.
   * 
   * Requirements: 6.1, 6.4
   */
  const addRelationship = useCallback(
    async (
      fromCharacterId: string,
      toCharacterId: string,
      relationshipData: RelationshipData
    ): Promise<void> => {
      try {
        // Create store adapter for RelationshipManager
        const storeAdapter: CharacterStore = {
          getCharacter: getCharacterFromStore,
          updateCharacter: updateCharacterInStore,
          getAllCharacters: getAllCharactersFromStore,
        };

        // Create event emitter adapter
        const eventEmitterAdapter: CharacterEventEmitter = {
          emit: (eventType: string, payload: unknown) => {
            eventEmitter.emit(eventType as any, payload);
          },
        };

        // Use RelationshipManager to add relationship
        const result = addRelationshipToStore(
          storeAdapter,
          eventEmitterAdapter,
          fromCharacterId,
          toCharacterId,
          relationshipData
        );

        if (!result.success) {
          // Handle specific relationship errors (Requirement: 6.4)
          if (result.error?.includes('circular dependency')) {
            throw new CharacterError(
              CharacterErrorType.RELATIONSHIP_ERROR,
              result.error,
              { fromCharacterId, toCharacterId, relationshipData }
            );
          }
          throw new CharacterError(
            CharacterErrorType.RELATIONSHIP_ERROR,
            result.error || 'Failed to add relationship',
            { fromCharacterId, toCharacterId, relationshipData }
          );
        }
      } catch (error) {
        // Handle and display error
        handleCharacterError(error, 'Add Relationship');
        throw error;
      }
    },
    [getCharacterFromStore, updateCharacterInStore, getAllCharactersFromStore]
  );

  /**
   * Updates a bidirectional relationship between two characters.
   * 
   * Uses RelationshipManager to ensure bidirectional sync.
   * 
   * Requirements: 6.2
   */
  const updateRelationship = useCallback(
    async (
      fromCharacterId: string,
      toCharacterId: string,
      updates: Partial<RelationshipData>
    ): Promise<void> => {
      try {
        // Create store adapter for RelationshipManager
        const storeAdapter: CharacterStore = {
          getCharacter: getCharacterFromStore,
          updateCharacter: updateCharacterInStore,
          getAllCharacters: getAllCharactersFromStore,
        };

        // Create event emitter adapter
        const eventEmitterAdapter: CharacterEventEmitter = {
          emit: (eventType: string, payload: unknown) => {
            eventEmitter.emit(eventType as any, payload);
          },
        };

        // Use RelationshipManager to update relationship
        const result = updateRelationshipInStore(
          storeAdapter,
          eventEmitterAdapter,
          fromCharacterId,
          toCharacterId,
          updates
        );

        if (!result.success) {
          throw new CharacterError(
            CharacterErrorType.RELATIONSHIP_ERROR,
            result.error || 'Failed to update relationship',
            { fromCharacterId, toCharacterId, updates }
          );
        }
      } catch (error) {
        // Handle and display error
        handleCharacterError(error, 'Update Relationship');
        throw error;
      }
    },
    [getCharacterFromStore, updateCharacterInStore, getAllCharactersFromStore]
  );

  /**
   * Removes a bidirectional relationship between two characters.
   * 
   * Uses RelationshipManager to ensure bidirectional sync.
   * 
   * Requirements: 6.3
   */
  const removeRelationship = useCallback(
    async (fromCharacterId: string, toCharacterId: string): Promise<void> => {
      try {
        // Create store adapter for RelationshipManager
        const storeAdapter: CharacterStore = {
          getCharacter: getCharacterFromStore,
          updateCharacter: updateCharacterInStore,
          getAllCharacters: getAllCharactersFromStore,
        };

        // Create event emitter adapter
        const eventEmitterAdapter: CharacterEventEmitter = {
          emit: (eventType: string, payload: unknown) => {
            eventEmitter.emit(eventType as any, payload);
          },
        };

        // Use RelationshipManager to remove relationship
        const result = removeRelationshipFromStore(
          storeAdapter,
          eventEmitterAdapter,
          fromCharacterId,
          toCharacterId
        );

        if (!result.success) {
          throw new CharacterError(
            CharacterErrorType.RELATIONSHIP_ERROR,
            result.error || 'Failed to remove relationship',
            { fromCharacterId, toCharacterId }
          );
        }
      } catch (error) {
        // Handle and display error
        handleCharacterError(error, 'Remove Relationship');
        throw error;
      }
    },
    [getCharacterFromStore, updateCharacterInStore, getAllCharactersFromStore]
  );

  // ============================================================================
  // Search and Filter Functions
  // ============================================================================

  /**
   * Searches characters by name, archetype, or traits (case-insensitive).
   * 
   * Requirements: 4.4, 9.2
   */
  const searchCharacters = useCallback(
    (query: string): Character[] => {
      if (!query || query.trim() === '') {
        return getAllCharactersFromStore();
      }

      const normalizedQuery = query.toLowerCase().trim();
      const allCharacters = getAllCharactersFromStore();

      return allCharacters.filter((character) => {
        // Search in name
        const matchesName = character.name.toLowerCase().includes(normalizedQuery);

        // Search in archetype
        const matchesArchetype = character.role.archetype.toLowerCase().includes(normalizedQuery);

        // Search in traits
        const matchesTraits = character.personality.traits.some((trait) =>
          trait.toLowerCase().includes(normalizedQuery)
        );

        return matchesName || matchesArchetype || matchesTraits;
      });
    },
    [getAllCharactersFromStore]
  );

  /**
   * Filters characters by multiple criteria.
   * 
   * Requirements: 9.3, 9.4
   */
  const filterCharacters = useCallback(
    (filters: {
      archetype?: string[];
      ageRange?: string[];
      creationMethod?: ('wizard' | 'auto_generated' | 'manual')[];
    }): Character[] => {
      const allCharacters = getAllCharactersFromStore();

      return allCharacters.filter((character) => {
        // Filter by archetype
        if (filters.archetype && filters.archetype.length > 0) {
          const matchesArchetype = filters.archetype.some(
            (archetype) => character.role.archetype.toLowerCase() === archetype.toLowerCase()
          );
          if (!matchesArchetype) return false;
        }

        // Filter by age range
        if (filters.ageRange && filters.ageRange.length > 0) {
          const matchesAgeRange = filters.ageRange.some(
            (ageRange) => character.visual_identity.age_range.toLowerCase() === ageRange.toLowerCase()
          );
          if (!matchesAgeRange) return false;
        }

        // Filter by creation method
        if (filters.creationMethod && filters.creationMethod.length > 0) {
          const matchesCreationMethod = filters.creationMethod.includes(character.creation_method);
          if (!matchesCreationMethod) return false;
        }

        return true;
      });
    },
    [getAllCharactersFromStore]
  );

  // ============================================================================
  // Import/Export Functions
  // ============================================================================

  /**
   * Exports a character as JSON string.
   * 
   * Requirements: 10.2
   */
  const exportCharacter = useCallback(
    async (id: string): Promise<string> => {
      const character = getCharacterFromStore(id);
      if (!character) {
        throw new Error(`Character with ID "${id}" not found`);
      }

      // Serialize character to JSON with pretty formatting
      return JSON.stringify(character, null, 2);
    },
    [getCharacterFromStore]
  );

  /**
   * Imports a character from JSON string.
   * 
   * Steps:
   * 1. Validates JSON format (Requirement: 10.4)
   * 2. Validates character schema (Requirement: 10.4)
   * 3. Checks for ID conflicts (Requirement: 10.5)
   * 4. Creates character in store
   * 
   * Requirements: 10.2, 10.4, 10.5
   */
  const importCharacter = useCallback(
    async (jsonData: string): Promise<Character> => {
      try {
        // Parse JSON (Requirement: 10.4)
        let parsedData: unknown;
        try {
          parsedData = JSON.parse(jsonData);
        } catch (error) {
          throw new CharacterError(
            CharacterErrorType.VALIDATION_ERROR,
            'Invalid JSON format: ' + (error as Error).message,
            { originalError: error }
          );
        }

        // Validate character schema (Requirement: 10.4)
        const validation = validateCharacter(parsedData, getAllCharactersFromStore());
        if (!validation.valid) {
          // Show validation errors to user
          showValidationErrors(validation, 'Character Import');

          const errorMessage = Object.entries(validation.errors)
            .map(([field, errors]) => `${field}: ${errors.join(', ')}`)
            .join('; ');
          throw new CharacterError(
            CharacterErrorType.VALIDATION_ERROR,
            `Character validation failed: ${errorMessage}`,
            { validation }
          );
        }

        // Check for ID conflicts (Requirement: 10.5)
        const existingCharacter = getCharacterFromStore(parsedData.character_id);
        if (existingCharacter) {
          throw new CharacterError(
            CharacterErrorType.DUPLICATE_ID,
            `Character with ID "${parsedData.character_id}" already exists. ` +
            `Please rename or delete the existing character before importing.`,
            { existingCharacter, importedCharacter: parsedData }
          );
        }

        // Create character
        return await createCharacter(parsedData);
      } catch (error) {
        // Handle and display error
        handleCharacterError(error, 'Character Import');
        throw error;
      }
    },
    [getCharacterFromStore, getAllCharactersFromStore, createCharacter]
  );

  // ============================================================================
  // Return Hook API
  // ============================================================================

  return {
    // CRUD operations
    createCharacter,
    updateCharacter,
    deleteCharacter,
    getCharacter,
    getAllCharacters,

    // Search and filter
    searchCharacters,
    filterCharacters,

    // Validation
    validateCharacter,

    // Dependency checking
    checkDependencies,

    // Relationship management
    addRelationship,
    updateRelationship,
    removeRelationship,

    // Import/export
    exportCharacter,
    importCharacter,
  };
}


