// ============================================================================
// Character Persistence Hook
// ============================================================================
// Handles saving and loading characters to/from localStorage
// Integrates with Zustand store for state management
// Note: Backend API integration can be added later for file system persistence

import { useCallback } from 'react';
import { useStore } from '../store';
import type { Character } from '../types/character';

// Helper function to generate UUID
function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback UUID generation
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================================================
// Character Persistence Hook
// ============================================================================

export function useCharacterPersistence() {
  const addCharacter = useStore((state) => state.addCharacter);
  const updateCharacter = useStore((state) => state.updateCharacter);
  const deleteCharacter = useStore((state) => state.deleteCharacter);
  const getAllCharacters = useStore((state) => state.getAllCharacters);

  /**
   * Save a character to JSON file and update store
   * Maps wizard data to character JSON schema
   */
  const saveCharacter = useCallback(
    async (characterData: Partial<Character>): Promise<Character> => {
      // Generate UUID if not provided
      const character_id = characterData.character_id || generateUUID();

      // Create complete character object with defaults
      const character: Character = {
        character_id,
        name: characterData.name || '',
        creation_method: characterData.creation_method || 'wizard',
        creation_timestamp: characterData.creation_timestamp || new Date().toISOString(),
        version: characterData.version || '1.0',
        visual_identity: {
          hair_color: characterData.visual_identity?.hair_color || '',
          hair_style: characterData.visual_identity?.hair_style || '',
          hair_length: characterData.visual_identity?.hair_length || '',
          eye_color: characterData.visual_identity?.eye_color || '',
          eye_shape: characterData.visual_identity?.eye_shape || '',
          skin_tone: characterData.visual_identity?.skin_tone || '',
          facial_structure: characterData.visual_identity?.facial_structure || '',
          distinctive_features: characterData.visual_identity?.distinctive_features || [],
          age_range: characterData.visual_identity?.age_range || '',
          height: characterData.visual_identity?.height || '',
          build: characterData.visual_identity?.build || '',
          posture: characterData.visual_identity?.posture || '',
          clothing_style: characterData.visual_identity?.clothing_style || '',
          color_palette: characterData.visual_identity?.color_palette || [],
        },
        personality: {
          traits: characterData.personality?.traits || [],
          values: characterData.personality?.values || [],
          fears: characterData.personality?.fears || [],
          desires: characterData.personality?.desires || [],
          flaws: characterData.personality?.flaws || [],
          strengths: characterData.personality?.strengths || [],
          temperament: characterData.personality?.temperament || '',
          communication_style: characterData.personality?.communication_style || '',
        },
        background: {
          origin: characterData.background?.origin || '',
          occupation: characterData.background?.occupation || '',
          education: characterData.background?.education || '',
          family: characterData.background?.family || '',
          significant_events: characterData.background?.significant_events || [],
          current_situation: characterData.background?.current_situation || '',
        },
        relationships: characterData.relationships || [],
        role: {
          archetype: characterData.role?.archetype || '',
          narrative_function: characterData.role?.narrative_function || '',
          character_arc: characterData.role?.character_arc || '',
        },
      };

      try {
        // Save directly to localStorage and Zustand store
        // (Backend API integration can be added later)
        
        const existingCharacters = getAllCharacters();
        const characterIndex = existingCharacters.findIndex(
          (c) => c.character_id === character_id
        );

        if (characterIndex >= 0) {
          // Update existing character
          updateCharacter(character_id, character);
        } else {
          // Add new character
          addCharacter(character);
        }

        // Save to localStorage for persistence
        localStorage.setItem(
          `character-${character_id}`,
          JSON.stringify(character)
        );

        // Also save to a master list for easy retrieval
        const allCharacterIds = JSON.parse(
          localStorage.getItem('character-ids') || '[]'
        ) as string[];
        
        if (!allCharacterIds.includes(character_id)) {
          allCharacterIds.push(character_id);
          localStorage.setItem('character-ids', JSON.stringify(allCharacterIds));
        }

        console.log('Character saved successfully:', character_id);
        return character;
      } catch (error) {
        console.error('Error saving character:', error);
        throw new Error('Failed to save character');
      }
    },
    [addCharacter, updateCharacter, getAllCharacters]
  );

  /**
   * Load a character from localStorage
   */
  const loadCharacter = useCallback(
    async (character_id: string): Promise<Character | null> => {
      try {
        const stored = localStorage.getItem(`character-${character_id}`);
        if (stored) {
          const character: Character = JSON.parse(stored);
          addCharacter(character);
          return character;
        }
        
        console.warn(`Character not found: ${character_id}`);
        return null;
      } catch (error) {
        console.error('Error loading character:', error);
        return null;
      }
    },
    [addCharacter]
  );

  /**
   * Load all characters from localStorage
   */
  const loadAllCharacters = useCallback(async (): Promise<Character[]> => {
    try {
      const characterIds = JSON.parse(
        localStorage.getItem('character-ids') || '[]'
      ) as string[];
      
      const characters: Character[] = [];
      
      for (const id of characterIds) {
        const stored = localStorage.getItem(`character-${id}`);
        if (stored) {
          try {
            const character = JSON.parse(stored);
            characters.push(character);
            addCharacter(character);
          } catch (parseError) {
            console.error(`Failed to parse character ${id}:`, parseError);
          }
        }
      }

      return characters;
    } catch (error) {
      console.error('Error loading characters:', error);
      return [];
    }
  }, [addCharacter]);

  /**
   * Delete a character from localStorage and store
   */
  const removeCharacter = useCallback(
    async (character_id: string): Promise<void> => {
      try {
        // Remove from Zustand store
        deleteCharacter(character_id);

        // Remove from localStorage
        localStorage.removeItem(`character-${character_id}`);

        // Update character IDs list
        const characterIds = JSON.parse(
          localStorage.getItem('character-ids') || '[]'
        ) as string[];
        
        const updatedIds = characterIds.filter((id) => id !== character_id);
        localStorage.setItem('character-ids', JSON.stringify(updatedIds));

        console.log('Character deleted successfully:', character_id);
      } catch (error) {
        console.error('Error deleting character:', error);
        throw new Error('Failed to delete character');
      }
    },
    [deleteCharacter]
  );

  return {
    saveCharacter,
    loadCharacter,
    loadAllCharacters,
    removeCharacter,
  };
}
