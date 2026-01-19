// ============================================================================
// Character Persistence Hook
// ============================================================================
// Handles saving and loading characters to/from JSON files in characters/ directory
// Integrates with Zustand store for state management

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
        // Save to JSON file in characters/ directory
        const response = await fetch('/api/characters/save', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(character),
        });

        if (!response.ok) {
          throw new Error(`Failed to save character: ${response.statusText}`);
        }

        // Update Zustand store
        if (characterData.character_id) {
          // Update existing character
          updateCharacter(character_id, character);
        } else {
          // Add new character
          addCharacter(character);
        }

        return character;
      } catch (error) {
        console.error('Error saving character:', error);
        
        // Fallback: Save to localStorage if API fails
        try {
          const existingCharacters = getAllCharacters();
          const characterIndex = existingCharacters.findIndex(
            (c) => c.character_id === character_id
          );

          if (characterIndex >= 0) {
            // Update existing
            updateCharacter(character_id, character);
          } else {
            // Add new
            addCharacter(character);
          }

          // Also save to localStorage as backup
          localStorage.setItem(
            `character-${character_id}`,
            JSON.stringify(character)
          );

          console.warn('Character saved to localStorage as fallback');
          return character;
        } catch (localError) {
          console.error('Failed to save character to localStorage:', localError);
          throw new Error('Failed to save character');
        }
      }
    },
    [addCharacter, updateCharacter, getAllCharacters]
  );

  /**
   * Load a character from JSON file
   */
  const loadCharacter = useCallback(
    async (character_id: string): Promise<Character | null> => {
      try {
        const response = await fetch(`/api/characters/${character_id}`);

        if (!response.ok) {
          throw new Error(`Failed to load character: ${response.statusText}`);
        }

        const character: Character = await response.json();

        // Update store
        addCharacter(character);

        return character;
      } catch (error) {
        console.error('Error loading character:', error);

        // Fallback: Try localStorage
        try {
          const stored = localStorage.getItem(`character-${character_id}`);
          if (stored) {
            const character: Character = JSON.parse(stored);
            addCharacter(character);
            return character;
          }
        } catch (localError) {
          console.error('Failed to load character from localStorage:', localError);
        }

        return null;
      }
    },
    [addCharacter]
  );

  /**
   * Load all characters from characters/ directory
   */
  const loadAllCharacters = useCallback(async (): Promise<Character[]> => {
    try {
      const response = await fetch('/api/characters');

      if (!response.ok) {
        throw new Error(`Failed to load characters: ${response.statusText}`);
      }

      const characters: Character[] = await response.json();

      // Update store with all characters
      characters.forEach((character) => {
        addCharacter(character);
      });

      return characters;
    } catch (error) {
      console.error('Error loading characters:', error);

      // Fallback: Try localStorage
      try {
        const characters: Character[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('character-')) {
            const stored = localStorage.getItem(key);
            if (stored) {
              characters.push(JSON.parse(stored));
            }
          }
        }

        characters.forEach((character) => {
          addCharacter(character);
        });

        return characters;
      } catch (localError) {
        console.error('Failed to load characters from localStorage:', localError);
        return [];
      }
    }
  }, [addCharacter]);

  /**
   * Delete a character from JSON file and store
   */
  const removeCharacter = useCallback(
    async (character_id: string): Promise<void> => {
      try {
        const response = await fetch(`/api/characters/${character_id}`, {
          method: 'DELETE',
        });

        if (!response.ok) {
          throw new Error(`Failed to delete character: ${response.statusText}`);
        }

        // Update store
        deleteCharacter(character_id);

        // Also remove from localStorage
        localStorage.removeItem(`character-${character_id}`);
      } catch (error) {
        console.error('Error deleting character:', error);

        // Fallback: Remove from localStorage
        try {
          deleteCharacter(character_id);
          localStorage.removeItem(`character-${character_id}`);
        } catch (localError) {
          console.error('Failed to delete character from localStorage:', localError);
          throw new Error('Failed to delete character');
        }
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
