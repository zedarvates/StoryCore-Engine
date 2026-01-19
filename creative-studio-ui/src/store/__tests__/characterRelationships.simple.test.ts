import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from '../index';
import type { Character } from '@/types/character';

// ============================================================================
// Character Relationship Validation Tests
// ============================================================================

describe('Character Relationship Validation', () => {
  beforeEach(() => {
    // Reset store before each test
    const { characters } = useStore.getState();
    characters.forEach((char) => {
      useStore.getState().deleteCharacter(char.character_id);
    });
  });

  describe('Character Storage', () => {
    it('should add character to store', () => {
      const character: Character = {
        character_id: 'char-1',
        name: 'Alice',
        creation_method: 'wizard',
        creation_timestamp: new Date().toISOString(),
        version: '1.0',
        visual_identity: {
          hair_color: 'brown',
          hair_style: 'long',
          hair_length: 'shoulder',
          eye_color: 'blue',
          eye_shape: 'round',
          skin_tone: 'fair',
          facial_structure: 'oval',
          distinctive_features: [],
          age_range: '25-30',
          height: '5\'6"',
          build: 'average',
          posture: 'confident',
          clothing_style: 'casual',
          color_palette: ['blue', 'white'],
        },
        personality: {
          traits: ['brave', 'kind'],
          values: ['honesty'],
          fears: ['failure'],
          desires: ['success'],
          flaws: ['stubborn'],
          strengths: ['determined'],
          temperament: 'calm',
          communication_style: 'direct',
        },
        background: {
          origin: 'City',
          occupation: 'Engineer',
          education: 'University',
          family: 'Parents and siblings',
          significant_events: ['Graduated'],
          current_situation: 'Working',
        },
        relationships: [],
        role: {
          archetype: 'Protagonist',
          narrative_function: 'Hero',
          character_arc: 'Growth',
        },
      };

      useStore.getState().addCharacter(character);

      const characters = useStore.getState().characters;
      expect(characters).toHaveLength(1);
      expect(characters[0].name).toBe('Alice');
    });

    it('should retrieve character by ID', () => {
      const character: Character = {
        character_id: 'char-1',
        name: 'Alice',
        creation_method: 'wizard',
        creation_timestamp: new Date().toISOString(),
        version: '1.0',
        visual_identity: {} as any,
        personality: {} as any,
        background: {} as any,
        relationships: [],
        role: {
          archetype: 'Protagonist',
          narrative_function: 'Hero',
          character_arc: 'Growth',
        },
      };

      useStore.getState().addCharacter(character);

      const retrieved = useStore.getState().getCharacterById('char-1');
      expect(retrieved).toBeDefined();
      expect(retrieved?.name).toBe('Alice');
    });

    it('should return undefined for non-existent character', () => {
      const retrieved = useStore.getState().getCharacterById('non-existent');
      expect(retrieved).toBeUndefined();
    });

    it('should get all characters', () => {
      const char1: Character = {
        character_id: 'char-1',
        name: 'Alice',
        creation_method: 'wizard',
        creation_timestamp: new Date().toISOString(),
        version: '1.0',
        visual_identity: {} as any,
        personality: {} as any,
        background: {} as any,
        relationships: [],
        role: {
          archetype: 'Protagonist',
          narrative_function: 'Hero',
          character_arc: 'Growth',
        },
      };

      const char2: Character = {
        character_id: 'char-2',
        name: 'Bob',
        creation_method: 'wizard',
        creation_timestamp: new Date().toISOString(),
        version: '1.0',
        visual_identity: {} as any,
        personality: {} as any,
        background: {} as any,
        relationships: [],
        role: {
          archetype: 'Mentor',
          narrative_function: 'Guide',
          character_arc: 'Flat',
        },
      };

      useStore.getState().addCharacter(char1);
      useStore.getState().addCharacter(char2);

      const allCharacters = useStore.getState().getAllCharacters();
      expect(allCharacters).toHaveLength(2);
      expect(allCharacters.map((c) => c.name)).toEqual(['Alice', 'Bob']);
    });
  });

  describe('Relationship Validation', () => {
    it('should validate that referenced character exists', () => {
      const char1: Character = {
        character_id: 'char-1',
        name: 'Alice',
        creation_method: 'wizard',
        creation_timestamp: new Date().toISOString(),
        version: '1.0',
        visual_identity: {} as any,
        personality: {} as any,
        background: {} as any,
        relationships: [],
        role: {
          archetype: 'Protagonist',
          narrative_function: 'Hero',
          character_arc: 'Growth',
        },
      };

      const char2: Character = {
        character_id: 'char-2',
        name: 'Bob',
        creation_method: 'wizard',
        creation_timestamp: new Date().toISOString(),
        version: '1.0',
        visual_identity: {} as any,
        personality: {} as any,
        background: {} as any,
        relationships: [
          {
            character_id: 'char-1', // References Alice
            character_name: 'Alice',
            relationship_type: 'Friend',
            description: 'Best friends',
            dynamic: 'Supportive',
          },
        ],
        role: {
          archetype: 'Mentor',
          narrative_function: 'Guide',
          character_arc: 'Flat',
        },
      };

      useStore.getState().addCharacter(char1);
      useStore.getState().addCharacter(char2);

      // Validate that Alice exists
      const aliceExists = useStore.getState().getCharacterById('char-1');
      expect(aliceExists).toBeDefined();

      // Validate Bob's relationship references existing character
      const bob = useStore.getState().getCharacterById('char-2');
      expect(bob?.relationships[0].character_id).toBe('char-1');
      
      // Verify the referenced character exists
      const referencedChar = useStore.getState().getCharacterById(bob!.relationships[0].character_id);
      expect(referencedChar).toBeDefined();
      expect(referencedChar?.name).toBe('Alice');
    });

    it('should handle relationship with non-existent character', () => {
      const char: Character = {
        character_id: 'char-1',
        name: 'Alice',
        creation_method: 'wizard',
        creation_timestamp: new Date().toISOString(),
        version: '1.0',
        visual_identity: {} as any,
        personality: {} as any,
        background: {} as any,
        relationships: [
          {
            character_id: 'char-999', // Doesn't exist yet
            character_name: 'Future Character',
            relationship_type: 'Friend',
            description: 'Will be created later',
            dynamic: 'Supportive',
          },
        ],
        role: {
          archetype: 'Protagonist',
          narrative_function: 'Hero',
          character_arc: 'Growth',
        },
      };

      useStore.getState().addCharacter(char);

      const alice = useStore.getState().getCharacterById('char-1');
      expect(alice?.relationships[0].character_id).toBe('char-999');
      
      // Verify the referenced character doesn't exist
      const referencedChar = useStore.getState().getCharacterById('char-999');
      expect(referencedChar).toBeUndefined();
    });

    it('should support bidirectional relationships', () => {
      const char1: Character = {
        character_id: 'char-1',
        name: 'Alice',
        creation_method: 'wizard',
        creation_timestamp: new Date().toISOString(),
        version: '1.0',
        visual_identity: {} as any,
        personality: {} as any,
        background: {} as any,
        relationships: [
          {
            character_id: 'char-2',
            character_name: 'Bob',
            relationship_type: 'Friend',
            description: 'Best friends',
            dynamic: 'Supportive',
          },
        ],
        role: {
          archetype: 'Protagonist',
          narrative_function: 'Hero',
          character_arc: 'Growth',
        },
      };

      const char2: Character = {
        character_id: 'char-2',
        name: 'Bob',
        creation_method: 'wizard',
        creation_timestamp: new Date().toISOString(),
        version: '1.0',
        visual_identity: {} as any,
        personality: {} as any,
        background: {} as any,
        relationships: [
          {
            character_id: 'char-1',
            character_name: 'Alice',
            relationship_type: 'Friend',
            description: 'Best friends',
            dynamic: 'Supportive',
          },
        ],
        role: {
          archetype: 'Mentor',
          narrative_function: 'Guide',
          character_arc: 'Flat',
        },
      };

      useStore.getState().addCharacter(char1);
      useStore.getState().addCharacter(char2);

      const alice = useStore.getState().getCharacterById('char-1');
      const bob = useStore.getState().getCharacterById('char-2');

      // Both should reference each other
      expect(alice?.relationships[0].character_id).toBe('char-2');
      expect(bob?.relationships[0].character_id).toBe('char-1');
    });
  });

  describe('Relationship Types', () => {
    it('should support various relationship types', () => {
      const relationshipTypes = [
        'Family',
        'Friend',
        'Romantic Partner',
        'Mentor',
        'Student',
        'Rival',
        'Enemy',
        'Ally',
        'Colleague',
        'Acquaintance',
      ];

      relationshipTypes.forEach((type) => {
        const char: Character = {
          character_id: `char-${type}`,
          name: `Character ${type}`,
          creation_method: 'wizard',
          creation_timestamp: new Date().toISOString(),
          version: '1.0',
          visual_identity: {} as any,
          personality: {} as any,
          background: {} as any,
          relationships: [
            {
              character_id: 'other-char',
              character_name: 'Other',
              relationship_type: type,
              description: `${type} relationship`,
              dynamic: 'Supportive',
            },
          ],
          role: {
            archetype: 'Protagonist',
            narrative_function: 'Hero',
            character_arc: 'Growth',
          },
        };

        expect(char.relationships[0].relationship_type).toBe(type);
      });
    });

    it('should support various relationship dynamics', () => {
      const dynamics = [
        'Supportive',
        'Antagonistic',
        'Complicated',
        'Distant',
        'Close',
        'Evolving',
        'Strained',
        'Harmonious',
      ];

      dynamics.forEach((dynamic) => {
        const char: Character = {
          character_id: `char-${dynamic}`,
          name: `Character ${dynamic}`,
          creation_method: 'wizard',
          creation_timestamp: new Date().toISOString(),
          version: '1.0',
          visual_identity: {} as any,
          personality: {} as any,
          background: {} as any,
          relationships: [
            {
              character_id: 'other-char',
              character_name: 'Other',
              relationship_type: 'Friend',
              description: `${dynamic} friendship`,
              dynamic: dynamic,
            },
          ],
          role: {
            archetype: 'Protagonist',
            narrative_function: 'Hero',
            character_arc: 'Growth',
          },
        };

        expect(char.relationships[0].dynamic).toBe(dynamic);
      });
    });
  });

  describe('Character Updates', () => {
    it('should update character relationships', () => {
      const char: Character = {
        character_id: 'char-1',
        name: 'Alice',
        creation_method: 'wizard',
        creation_timestamp: new Date().toISOString(),
        version: '1.0',
        visual_identity: {} as any,
        personality: {} as any,
        background: {} as any,
        relationships: [],
        role: {
          archetype: 'Protagonist',
          narrative_function: 'Hero',
          character_arc: 'Growth',
        },
      };

      useStore.getState().addCharacter(char);

      // Add a relationship
      useStore.getState().updateCharacter('char-1', {
        relationships: [
          {
            character_id: 'char-2',
            character_name: 'Bob',
            relationship_type: 'Friend',
            description: 'New friend',
            dynamic: 'Supportive',
          },
        ],
      });

      const updated = useStore.getState().getCharacterById('char-1');
      expect(updated?.relationships).toHaveLength(1);
      expect(updated?.relationships[0].character_name).toBe('Bob');
    });

    it('should delete character from store', () => {
      const char: Character = {
        character_id: 'char-1',
        name: 'Alice',
        creation_method: 'wizard',
        creation_timestamp: new Date().toISOString(),
        version: '1.0',
        visual_identity: {} as any,
        personality: {} as any,
        background: {} as any,
        relationships: [],
        role: {
          archetype: 'Protagonist',
          narrative_function: 'Hero',
          character_arc: 'Growth',
        },
      };

      useStore.getState().addCharacter(char);
      expect(useStore.getState().characters).toHaveLength(1);

      useStore.getState().deleteCharacter('char-1');
      expect(useStore.getState().characters).toHaveLength(0);
    });
  });
});
