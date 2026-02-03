// ============================================================================
// RelationshipManager Tests
// ============================================================================
// Tests for bidirectional character relationship management utilities
// Requirements: 6.1, 6.2, 6.3
// ============================================================================

import {
  INVERSE_RELATIONSHIPS,
  getInverseRelationshipType,
  isSymmetricRelationship,
  getSupportedRelationshipTypes,
  isValidRelationshipType,
  detectRelationshipCycle,
  canAddRelationshipWithoutCycle,
  addRelationship,
  updateRelationship,
  removeRelationship,
  CycleDetectionResult,
} from '../RelationshipManager';

describe('RelationshipManager', () => {
  describe('INVERSE_RELATIONSHIPS constant', () => {
    it('should define inverse mappings for all relationship types', () => {
      expect(INVERSE_RELATIONSHIPS).toBeDefined();
      expect(Object.keys(INVERSE_RELATIONSHIPS).length).toBeGreaterThan(0);
    });

    it('should have symmetric relationships map to themselves', () => {
      const symmetricRelationships = [
        'friend',
        'sibling',
        'cousin',
        'spouse',
        'colleague',
        'partner',
        'coworker',
        'best friend',
        'acquaintance',
        'neighbor',
        'lover',
        'romantic partner',
        'ex-lover',
        'ex-partner',
        'enemy',
        'rival',
        'nemesis',
        'ally',
        'comrade',
        'companion',
      ];

      symmetricRelationships.forEach(type => {
        expect(INVERSE_RELATIONSHIPS[type]).toBe(type);
      });
    });

    it('should have asymmetric relationships map to different types', () => {
      const asymmetricPairs = [
        ['parent', 'child'],
        ['child', 'parent'],
        ['mentor', 'student'],
        ['student', 'mentor'],
        ['boss', 'employee'],
        ['employee', 'boss'],
        ['master', 'apprentice'],
        ['apprentice', 'master'],
        ['guardian', 'ward'],
        ['ward', 'guardian'],
        ['protector', 'protected'],
        ['protected', 'protector'],
        ['idol', 'fan'],
        ['fan', 'idol'],
        ['leader', 'follower'],
        ['follower', 'leader'],
      ];

      asymmetricPairs.forEach(([type, expectedInverse]) => {
        expect(INVERSE_RELATIONSHIPS[type]).toBe(expectedInverse);
      });
    });

    it('should have bidirectional consistency for asymmetric relationships', () => {
      // For every asymmetric relationship A->B, B->A should map back to A
      Object.entries(INVERSE_RELATIONSHIPS).forEach(([type, inverse]) => {
        if (type !== inverse) {
          // This is an asymmetric relationship
          expect(INVERSE_RELATIONSHIPS[inverse]).toBe(type);
        }
      });
    });
  });

  describe('getInverseRelationshipType', () => {
    describe('asymmetric relationships', () => {
      it('should return "child" for "parent"', () => {
        expect(getInverseRelationshipType('parent')).toBe('child');
      });

      it('should return "parent" for "child"', () => {
        expect(getInverseRelationshipType('child')).toBe('parent');
      });

      it('should return "student" for "mentor"', () => {
        expect(getInverseRelationshipType('mentor')).toBe('student');
      });

      it('should return "mentor" for "student"', () => {
        expect(getInverseRelationshipType('student')).toBe('mentor');
      });

      it('should return "employee" for "boss"', () => {
        expect(getInverseRelationshipType('boss')).toBe('employee');
      });

      it('should return "boss" for "employee"', () => {
        expect(getInverseRelationshipType('employee')).toBe('boss');
      });

      it('should return "ward" for "guardian"', () => {
        expect(getInverseRelationshipType('guardian')).toBe('ward');
      });

      it('should return "guardian" for "ward"', () => {
        expect(getInverseRelationshipType('ward')).toBe('guardian');
      });
    });

    describe('symmetric relationships', () => {
      it('should return "friend" for "friend"', () => {
        expect(getInverseRelationshipType('friend')).toBe('friend');
      });

      it('should return "sibling" for "sibling"', () => {
        expect(getInverseRelationshipType('sibling')).toBe('sibling');
      });

      it('should return "enemy" for "enemy"', () => {
        expect(getInverseRelationshipType('enemy')).toBe('enemy');
      });

      it('should return "rival" for "rival"', () => {
        expect(getInverseRelationshipType('rival')).toBe('rival');
      });

      it('should return "ally" for "ally"', () => {
        expect(getInverseRelationshipType('ally')).toBe('ally');
      });

      it('should return "colleague" for "colleague"', () => {
        expect(getInverseRelationshipType('colleague')).toBe('colleague');
      });

      it('should return "lover" for "lover"', () => {
        expect(getInverseRelationshipType('lover')).toBe('lover');
      });
    });

    describe('case insensitivity', () => {
      it('should handle uppercase relationship types', () => {
        expect(getInverseRelationshipType('PARENT')).toBe('child');
        expect(getInverseRelationshipType('FRIEND')).toBe('friend');
      });

      it('should handle mixed case relationship types', () => {
        expect(getInverseRelationshipType('PaReNt')).toBe('child');
        expect(getInverseRelationshipType('FrIeNd')).toBe('friend');
      });

      it('should handle relationship types with leading/trailing whitespace', () => {
        expect(getInverseRelationshipType('  parent  ')).toBe('child');
        expect(getInverseRelationshipType('  friend  ')).toBe('friend');
      });
    });

    describe('unknown relationship types', () => {
      it('should return the original type for unknown relationships', () => {
        expect(getInverseRelationshipType('custom-relationship')).toBe('custom-relationship');
        expect(getInverseRelationshipType('unknown')).toBe('unknown');
        expect(getInverseRelationshipType('made-up-type')).toBe('made-up-type');
      });

      it('should treat unknown relationships as symmetric', () => {
        const unknownType = 'custom-relationship';
        const inverse = getInverseRelationshipType(unknownType);
        expect(inverse).toBe(unknownType);
      });
    });

    describe('edge cases', () => {
      it('should handle empty string', () => {
        expect(getInverseRelationshipType('')).toBe('');
      });

      it('should handle relationship types with special characters', () => {
        expect(getInverseRelationshipType('best friend')).toBe('best friend');
        expect(getInverseRelationshipType('ex-lover')).toBe('ex-lover');
      });
    });
  });

  describe('isSymmetricRelationship', () => {
    it('should return true for symmetric relationships', () => {
      expect(isSymmetricRelationship('friend')).toBe(true);
      expect(isSymmetricRelationship('sibling')).toBe(true);
      expect(isSymmetricRelationship('enemy')).toBe(true);
      expect(isSymmetricRelationship('rival')).toBe(true);
      expect(isSymmetricRelationship('ally')).toBe(true);
      expect(isSymmetricRelationship('colleague')).toBe(true);
      expect(isSymmetricRelationship('lover')).toBe(true);
    });

    it('should return false for asymmetric relationships', () => {
      expect(isSymmetricRelationship('parent')).toBe(false);
      expect(isSymmetricRelationship('child')).toBe(false);
      expect(isSymmetricRelationship('mentor')).toBe(false);
      expect(isSymmetricRelationship('student')).toBe(false);
      expect(isSymmetricRelationship('boss')).toBe(false);
      expect(isSymmetricRelationship('employee')).toBe(false);
    });

    it('should handle case insensitivity', () => {
      expect(isSymmetricRelationship('FRIEND')).toBe(true);
      expect(isSymmetricRelationship('PARENT')).toBe(false);
    });

    it('should treat unknown relationships as symmetric', () => {
      expect(isSymmetricRelationship('custom-relationship')).toBe(true);
      expect(isSymmetricRelationship('unknown')).toBe(true);
    });
  });

  describe('getSupportedRelationshipTypes', () => {
    it('should return an array of relationship types', () => {
      const types = getSupportedRelationshipTypes();
      expect(Array.isArray(types)).toBe(true);
      expect(types.length).toBeGreaterThan(0);
    });

    it('should include common relationship types', () => {
      const types = getSupportedRelationshipTypes();
      expect(types).toContain('parent');
      expect(types).toContain('child');
      expect(types).toContain('friend');
      expect(types).toContain('sibling');
      expect(types).toContain('mentor');
      expect(types).toContain('student');
      expect(types).toContain('enemy');
      expect(types).toContain('rival');
      expect(types).toContain('ally');
    });

    it('should return all keys from INVERSE_RELATIONSHIPS', () => {
      const types = getSupportedRelationshipTypes();
      const expectedTypes = Object.keys(INVERSE_RELATIONSHIPS);
      expect(types).toEqual(expectedTypes);
    });
  });

  describe('isValidRelationshipType', () => {
    it('should return true for supported relationship types', () => {
      expect(isValidRelationshipType('parent')).toBe(true);
      expect(isValidRelationshipType('friend')).toBe(true);
      expect(isValidRelationshipType('mentor')).toBe(true);
      expect(isValidRelationshipType('sibling')).toBe(true);
    });

    it('should return false for unsupported relationship types', () => {
      expect(isValidRelationshipType('custom-relationship')).toBe(false);
      expect(isValidRelationshipType('unknown')).toBe(false);
      expect(isValidRelationshipType('made-up-type')).toBe(false);
    });

    it('should handle case insensitivity', () => {
      expect(isValidRelationshipType('PARENT')).toBe(true);
      expect(isValidRelationshipType('FrIeNd')).toBe(true);
      expect(isValidRelationshipType('UNKNOWN')).toBe(false);
    });

    it('should handle whitespace', () => {
      expect(isValidRelationshipType('  parent  ')).toBe(true);
      expect(isValidRelationshipType('  unknown  ')).toBe(false);
    });
  });

  describe('integration scenarios', () => {
    it('should correctly handle bidirectional relationship creation', () => {
      // Scenario: Character A is parent of Character B
      const relationshipAtoB = 'parent';
      const relationshipBtoA = getInverseRelationshipType(relationshipAtoB);
      
      expect(relationshipBtoA).toBe('child');
      
      // Verify bidirectional consistency
      expect(getInverseRelationshipType(relationshipBtoA)).toBe(relationshipAtoB);
    });

    it('should correctly handle symmetric relationship creation', () => {
      // Scenario: Character A is friend of Character B
      const relationshipAtoB = 'friend';
      const relationshipBtoA = getInverseRelationshipType(relationshipAtoB);
      
      expect(relationshipBtoA).toBe('friend');
      expect(isSymmetricRelationship(relationshipAtoB)).toBe(true);
    });

    it('should handle complex relationship chains', () => {
      // Scenario: A is parent of B, B is parent of C
      const AtoB = 'parent';
      const BtoA = getInverseRelationshipType(AtoB); // 'child'
      const BtoC = 'parent';
      const CtoB = getInverseRelationshipType(BtoC); // 'child'
      
      // A should be grandparent of C
      const AtoC = 'grandparent';
      const CtoA = getInverseRelationshipType(AtoC); // 'grandchild'
      
      expect(BtoA).toBe('child');
      expect(CtoB).toBe('child');
      expect(CtoA).toBe('grandchild');
    });

    it('should handle multiple relationship types between same characters', () => {
      // Scenario: Character A and B can have multiple relationships
      const relationships = [
        { type: 'colleague', inverse: 'colleague' },
        { type: 'friend', inverse: 'friend' },
        { type: 'mentor', inverse: 'student' },
      ];

      relationships.forEach(({ type, inverse }) => {
        expect(getInverseRelationshipType(type)).toBe(inverse);
      });
    });
  });

  describe('Requirements validation', () => {
    it('should satisfy Requirement 6.1: Create inverse relationship', () => {
      // When a relationship is added from A to B, the system should be able
      // to determine the inverse relationship type for B to A
      const relationshipType = 'mentor';
      const inverseType = getInverseRelationshipType(relationshipType);
      
      expect(inverseType).toBe('student');
      expect(inverseType).not.toBe(relationshipType);
    });

    it('should satisfy Requirement 6.2: Update both characters', () => {
      // The system should be able to determine inverse types for updates
      const originalType = 'mentor';
      const updatedType = 'friend';
      
      const originalInverse = getInverseRelationshipType(originalType);
      const updatedInverse = getInverseRelationshipType(updatedType);
      
      expect(originalInverse).toBe('student');
      expect(updatedInverse).toBe('friend');
    });

    it('should satisfy Requirement 6.3: Remove from both characters', () => {
      // The system should be able to determine inverse types for removal
      const relationshipType = 'parent';
      const inverseType = getInverseRelationshipType(relationshipType);
      
      expect(inverseType).toBe('child');
      // Both types should be valid for removal operations
      expect(isValidRelationshipType(relationshipType)).toBe(true);
      expect(isValidRelationshipType(inverseType)).toBe(true);
    });

    it('should handle symmetric relationships correctly (Requirement 6.1, 6.2, 6.3)', () => {
      // Symmetric relationships should have the same type in both directions
      const symmetricTypes = ['friend', 'sibling', 'enemy', 'rival', 'ally'];
      
      symmetricTypes.forEach(type => {
        const inverse = getInverseRelationshipType(type);
        expect(inverse).toBe(type);
        expect(isSymmetricRelationship(type)).toBe(true);
      });
    });
  });

  describe('Cycle Detection', () => {
    // Helper function to create a character with relationships
    function createCharacter(id: string, relationshipIds: string[] = []) {
      return {
        character_id: id,
        relationships: relationshipIds.map(relId => ({
          character_id: relId,
        })),
      };
    }

    describe('detectRelationshipCycle', () => {
      it('should detect self-referential relationship as a cycle', () => {
        const characters = new Map();
        characters.set('A', createCharacter('A'));

        const result = detectRelationshipCycle(characters, 'A', 'A');

        expect(result.hasCycle).toBe(true);
        expect(result.cyclePath).toEqual(['A', 'A']);
      });

      it('should detect simple two-character cycle (A→B, trying to add B→A)', () => {
        const characters = new Map();
        characters.set('A', createCharacter('A', ['B']));
        characters.set('B', createCharacter('B'));

        const result = detectRelationshipCycle(characters, 'B', 'A');

        expect(result.hasCycle).toBe(true);
        expect(result.cyclePath).toBeDefined();
        expect(result.cyclePath).toContain('A');
        expect(result.cyclePath).toContain('B');
      });

      it('should detect three-character cycle (A→B→C, trying to add C→A)', () => {
        const characters = new Map();
        characters.set('A', createCharacter('A', ['B']));
        characters.set('B', createCharacter('B', ['C']));
        characters.set('C', createCharacter('C'));

        const result = detectRelationshipCycle(characters, 'C', 'A');

        expect(result.hasCycle).toBe(true);
        expect(result.cyclePath).toBeDefined();
        expect(result.cyclePath!.length).toBeGreaterThanOrEqual(3);
      });

      it('should detect longer cycle (A→B→C→D, trying to add D→A)', () => {
        const characters = new Map();
        characters.set('A', createCharacter('A', ['B']));
        characters.set('B', createCharacter('B', ['C']));
        characters.set('C', createCharacter('C', ['D']));
        characters.set('D', createCharacter('D'));

        const result = detectRelationshipCycle(characters, 'D', 'A');

        expect(result.hasCycle).toBe(true);
        expect(result.cyclePath).toBeDefined();
      });

      it('should not detect cycle when adding non-circular relationship', () => {
        const characters = new Map();
        characters.set('A', createCharacter('A', ['B']));
        characters.set('B', createCharacter('B'));
        characters.set('C', createCharacter('C'));

        // Adding A→C should not create a cycle
        const result = detectRelationshipCycle(characters, 'A', 'C');

        expect(result.hasCycle).toBe(false);
        expect(result.cyclePath).toBeUndefined();
      });

      it('should not detect cycle in tree structure', () => {
        // Tree: A→B, A→C, B→D, B→E
        const characters = new Map();
        characters.set('A', createCharacter('A', ['B', 'C']));
        characters.set('B', createCharacter('B', ['D', 'E']));
        characters.set('C', createCharacter('C'));
        characters.set('D', createCharacter('D'));
        characters.set('E', createCharacter('E'));

        // Adding C→D should not create a cycle
        const result = detectRelationshipCycle(characters, 'C', 'D');

        expect(result.hasCycle).toBe(false);
      });

      it('should detect cycle in complex graph with multiple paths', () => {
        // Graph: A→B, A→C, B→D, C→D, trying to add D→A
        const characters = new Map();
        characters.set('A', createCharacter('A', ['B', 'C']));
        characters.set('B', createCharacter('B', ['D']));
        characters.set('C', createCharacter('C', ['D']));
        characters.set('D', createCharacter('D'));

        const result = detectRelationshipCycle(characters, 'D', 'A');

        expect(result.hasCycle).toBe(true);
      });

      it('should not detect cycle when adding relationship to disconnected component', () => {
        // Two separate components: A→B and C→D
        const characters = new Map();
        characters.set('A', createCharacter('A', ['B']));
        characters.set('B', createCharacter('B'));
        characters.set('C', createCharacter('C', ['D']));
        characters.set('D', createCharacter('D'));

        // Adding B→C connects the components but doesn't create a cycle
        const result = detectRelationshipCycle(characters, 'B', 'C');

        expect(result.hasCycle).toBe(false);
      });

      it('should detect cycle in middle of chain (A→B→C→D, trying to add C→B)', () => {
        const characters = new Map();
        characters.set('A', createCharacter('A', ['B']));
        characters.set('B', createCharacter('B', ['C']));
        characters.set('C', createCharacter('C', ['D']));
        characters.set('D', createCharacter('D'));

        const result = detectRelationshipCycle(characters, 'C', 'B');

        expect(result.hasCycle).toBe(true);
      });

      it('should handle empty character map', () => {
        const characters = new Map();

        const result = detectRelationshipCycle(characters, 'A', 'B');

        expect(result.hasCycle).toBe(false);
      });

      it('should handle character with no relationships', () => {
        const characters = new Map();
        characters.set('A', createCharacter('A'));
        characters.set('B', createCharacter('B'));

        const result = detectRelationshipCycle(characters, 'A', 'B');

        expect(result.hasCycle).toBe(false);
      });

      it('should handle character with empty relationships array', () => {
        const characters = new Map();
        characters.set('A', { character_id: 'A', relationships: [] });
        characters.set('B', { character_id: 'B', relationships: [] });

        const result = detectRelationshipCycle(characters, 'A', 'B');

        expect(result.hasCycle).toBe(false);
      });

      it('should detect cycle with multiple relationships per character', () => {
        // A has relationships to B and C, B has relationship to C, trying to add C→A
        const characters = new Map();
        characters.set('A', createCharacter('A', ['B', 'C']));
        characters.set('B', createCharacter('B', ['C']));
        characters.set('C', createCharacter('C'));

        const result = detectRelationshipCycle(characters, 'C', 'A');

        expect(result.hasCycle).toBe(true);
      });
    });

    describe('canAddRelationshipWithoutCycle', () => {
      function createCharacter(id: string, relationshipIds: string[] = []) {
        return {
          character_id: id,
          relationships: relationshipIds.map(relId => ({
            character_id: relId,
          })),
        };
      }

      it('should return false for self-referential relationship', () => {
        const characters = new Map();
        characters.set('A', createCharacter('A'));

        const canAdd = canAddRelationshipWithoutCycle(characters, 'A', 'A');

        expect(canAdd).toBe(false);
      });

      it('should return false when relationship would create cycle', () => {
        const characters = new Map();
        characters.set('A', createCharacter('A', ['B']));
        characters.set('B', createCharacter('B', ['C']));
        characters.set('C', createCharacter('C'));

        const canAdd = canAddRelationshipWithoutCycle(characters, 'C', 'A');

        expect(canAdd).toBe(false);
      });

      it('should return true when relationship would not create cycle', () => {
        const characters = new Map();
        characters.set('A', createCharacter('A', ['B']));
        characters.set('B', createCharacter('B'));
        characters.set('C', createCharacter('C'));

        const canAdd = canAddRelationshipWithoutCycle(characters, 'A', 'C');

        expect(canAdd).toBe(true);
      });

      it('should return true for first relationship in empty graph', () => {
        const characters = new Map();
        characters.set('A', createCharacter('A'));
        characters.set('B', createCharacter('B'));

        const canAdd = canAddRelationshipWithoutCycle(characters, 'A', 'B');

        expect(canAdd).toBe(true);
      });

      it('should return true when adding to tree structure', () => {
        const characters = new Map();
        characters.set('A', createCharacter('A', ['B', 'C']));
        characters.set('B', createCharacter('B'));
        characters.set('C', createCharacter('C'));
        characters.set('D', createCharacter('D'));

        const canAdd = canAddRelationshipWithoutCycle(characters, 'B', 'D');

        expect(canAdd).toBe(true);
      });
    });

    describe('Requirement 6.4: Prevent circular relationship dependencies', () => {
      function createCharacter(id: string, relationshipIds: string[] = []) {
        return {
          character_id: id,
          relationships: relationshipIds.map(relId => ({
            character_id: relId,
          })),
        };
      }

      it('should satisfy Requirement 6.4: Detect simple cycle A→B→A', () => {
        const characters = new Map();
        characters.set('A', createCharacter('A', ['B']));
        characters.set('B', createCharacter('B'));

        const result = detectRelationshipCycle(characters, 'B', 'A');

        expect(result.hasCycle).toBe(true);
        expect(result.cyclePath).toBeDefined();
      });

      it('should satisfy Requirement 6.4: Detect complex cycle A→B→C→A', () => {
        const characters = new Map();
        characters.set('A', createCharacter('A', ['B']));
        characters.set('B', createCharacter('B', ['C']));
        characters.set('C', createCharacter('C'));

        const result = detectRelationshipCycle(characters, 'C', 'A');

        expect(result.hasCycle).toBe(true);
        expect(result.cyclePath).toBeDefined();
        expect(result.cyclePath!.length).toBeGreaterThan(2);
      });

      it('should satisfy Requirement 6.4: Return cycle path when cycle detected', () => {
        const characters = new Map();
        characters.set('A', createCharacter('A', ['B']));
        characters.set('B', createCharacter('B', ['C']));
        characters.set('C', createCharacter('C'));

        const result = detectRelationshipCycle(characters, 'C', 'A');

        expect(result.hasCycle).toBe(true);
        expect(result.cyclePath).toBeDefined();
        expect(Array.isArray(result.cyclePath)).toBe(true);
        // The cycle path should contain the characters involved in the cycle
        expect(result.cyclePath).toContain('A');
      });

      it('should satisfy Requirement 6.4: Allow acyclic relationships', () => {
        const characters = new Map();
        characters.set('A', createCharacter('A', ['B']));
        characters.set('B', createCharacter('B', ['C']));
        characters.set('C', createCharacter('C'));
        characters.set('D', createCharacter('D'));

        // Adding C→D should be allowed (no cycle)
        const result = detectRelationshipCycle(characters, 'C', 'D');

        expect(result.hasCycle).toBe(false);
        expect(result.cyclePath).toBeUndefined();
      });

      it('should satisfy Requirement 6.4: Prevent self-loops', () => {
        const characters = new Map();
        characters.set('A', createCharacter('A'));

        const result = detectRelationshipCycle(characters, 'A', 'A');

        expect(result.hasCycle).toBe(true);
        expect(result.cyclePath).toEqual(['A', 'A']);
      });
    });
  });

  describe('addRelationship', () => {
    // Mock store implementation
    function createMockStore() {
      const characters = new Map<string, any>();

      return {
        characters,
        getCharacter: (id: string) => characters.get(id),
        updateCharacter: (id: string, updates: any) => {
          const char = characters.get(id);
          if (char) {
            characters.set(id, { ...char, ...updates });
          }
        },
        addCharacter: (char: any) => {
          characters.set(char.character_id, char);
        },
        getAllCharacters: () => Array.from(characters.values()),
      };
    }

    // Mock event emitter
    function createMockEventEmitter() {
      const events: Array<{ type: string; payload: any }> = [];

      return {
        events,
        emit: (type: string, payload: any) => {
          events.push({ type, payload });
        },
        getEvents: (type?: string) => {
          return type ? events.filter(e => e.type === type) : events;
        },
        clear: () => {
          events.length = 0;
        },
      };
    }

    // Helper to create a test character
    function createTestCharacter(id: string, name: string, relationships: any[] = []) {
      return {
        character_id: id,
        name,
        relationships,
      };
    }

    describe('validation', () => {
      it('should return error if source character does not exist', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-2', 'Character 2'));

        const result = addRelationship(
          store,
          eventEmitter,
          'char-1', // Does not exist
          'char-2',
          {
            relationship_type: 'friend',
            description: 'Best friends',
            dynamic: 'Supportive',
          }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Source character');
        expect(result.error).toContain('not found');
      });

      it('should return error if target character does not exist', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Character 1'));

        const result = addRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2', // Does not exist
          {
            relationship_type: 'friend',
            description: 'Best friends',
            dynamic: 'Supportive',
          }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Target character');
        expect(result.error).toContain('not found');
      });

      it('should return error if adding relationship would create a cycle', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        // Create A→B→C
        store.addCharacter(createTestCharacter('A', 'Character A', [
          { character_id: 'B', character_name: 'Character B', relationship_type: 'friend', description: '', dynamic: '' }
        ]));
        store.addCharacter(createTestCharacter('B', 'Character B', [
          { character_id: 'C', character_name: 'Character C', relationship_type: 'friend', description: '', dynamic: '' }
        ]));
        store.addCharacter(createTestCharacter('C', 'Character C'));

        // Try to add C→A (would create cycle)
        const result = addRelationship(
          store,
          eventEmitter,
          'C',
          'A',
          {
            relationship_type: 'friend',
            description: 'Friends',
            dynamic: 'Friendly',
          }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('circular dependency');
      });
    });

    describe('bidirectional sync', () => {
      it('should add relationship to source character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice'));
        store.addCharacter(createTestCharacter('char-2', 'Bob'));

        const result = addRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            relationship_type: 'mentor',
            description: 'Teaches magic',
            dynamic: 'Respectful',
          }
        );

        expect(result.success).toBe(true);

        const char1 = store.getCharacter('char-1');
        expect(char1.relationships).toHaveLength(1);
        expect(char1.relationships[0]).toMatchObject({
          character_id: 'char-2',
          character_name: 'Bob',
          relationship_type: 'mentor',
          description: 'Teaches magic',
          dynamic: 'Respectful',
        });
      });

      it('should create inverse relationship on target character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice'));
        store.addCharacter(createTestCharacter('char-2', 'Bob'));

        const result = addRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            relationship_type: 'mentor',
            description: 'Teaches magic',
            dynamic: 'Respectful',
          }
        );

        expect(result.success).toBe(true);

        const char2 = store.getCharacter('char-2');
        expect(char2.relationships).toHaveLength(1);
        expect(char2.relationships[0]).toMatchObject({
          character_id: 'char-1',
          character_name: 'Alice',
          relationship_type: 'student', // Inverse of mentor
          description: 'Teaches magic',
          dynamic: 'Respectful',
        });
      });

      it('should handle symmetric relationships correctly', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice'));
        store.addCharacter(createTestCharacter('char-2', 'Bob'));

        const result = addRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            relationship_type: 'friend',
            description: 'Best friends since childhood',
            dynamic: 'Supportive and loyal',
          }
        );

        expect(result.success).toBe(true);

        const char1 = store.getCharacter('char-1');
        const char2 = store.getCharacter('char-2');

        // Both should have 'friend' relationship (symmetric)
        expect(char1.relationships[0].relationship_type).toBe('friend');
        expect(char2.relationships[0].relationship_type).toBe('friend');
      });

      it('should update both characters in store', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice'));
        store.addCharacter(createTestCharacter('char-2', 'Bob'));

        const result = addRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            relationship_type: 'parent',
            description: 'Loving parent',
            dynamic: 'Caring',
          }
        );

        expect(result.success).toBe(true);
        expect(result.fromCharacter).toBeDefined();
        expect(result.toCharacter).toBeDefined();

        // Verify both characters are updated in store
        const char1 = store.getCharacter('char-1');
        const char2 = store.getCharacter('char-2');

        expect(char1.relationships).toHaveLength(1);
        expect(char2.relationships).toHaveLength(1);
      });
    });

    describe('event emission', () => {
      it('should emit update event for source character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice'));
        store.addCharacter(createTestCharacter('char-2', 'Bob'));

        addRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            relationship_type: 'friend',
            description: 'Friends',
            dynamic: 'Friendly',
          }
        );

        const updateEvents = eventEmitter.getEvents('character:updated');
        expect(updateEvents.length).toBeGreaterThanOrEqual(1);

        const char1UpdateEvent = updateEvents.find(e => e.payload.characterId === 'char-1');
        expect(char1UpdateEvent).toBeDefined();
        expect(char1UpdateEvent.payload.source).toBe('relationship-sync');
        expect(char1UpdateEvent.payload.changeType).toBe('relationship-sync');
      });

      it('should emit update event for target character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice'));
        store.addCharacter(createTestCharacter('char-2', 'Bob'));

        addRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            relationship_type: 'friend',
            description: 'Friends',
            dynamic: 'Friendly',
          }
        );

        const updateEvents = eventEmitter.getEvents('character:updated');
        expect(updateEvents.length).toBeGreaterThanOrEqual(1);

        const char2UpdateEvent = updateEvents.find(e => e.payload.characterId === 'char-2');
        expect(char2UpdateEvent).toBeDefined();
        expect(char2UpdateEvent.payload.source).toBe('relationship-sync');
      });

      it('should emit relationship added event', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice'));
        store.addCharacter(createTestCharacter('char-2', 'Bob'));

        addRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            relationship_type: 'mentor',
            description: 'Teaches magic',
            dynamic: 'Respectful',
          }
        );

        const relationshipEvents = eventEmitter.getEvents('character:relationship:added');
        expect(relationshipEvents).toHaveLength(1);

        const event = relationshipEvents[0];
        expect(event.payload).toMatchObject({
          fromCharacterId: 'char-1',
          toCharacterId: 'char-2',
          bidirectional: true,
        });
        expect(event.payload.relationship.relationship_type).toBe('mentor');
        expect(event.payload.inverseRelationship.relationship_type).toBe('student');
      });

      it('should emit all three events (2 updates + 1 relationship added)', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice'));
        store.addCharacter(createTestCharacter('char-2', 'Bob'));

        addRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            relationship_type: 'friend',
            description: 'Friends',
            dynamic: 'Friendly',
          }
        );

        const allEvents = eventEmitter.getEvents();
        expect(allEvents.length).toBe(3);

        const updateEvents = eventEmitter.getEvents('character:updated');
        const relationshipEvents = eventEmitter.getEvents('character:relationship:added');

        expect(updateEvents).toHaveLength(2);
        expect(relationshipEvents).toHaveLength(1);
      });
    });

    describe('requirement validation', () => {
      it('should satisfy Requirement 6.1: Add relationship to source character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice'));
        store.addCharacter(createTestCharacter('char-2', 'Bob'));

        addRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            relationship_type: 'friend',
            description: 'Best friends',
            dynamic: 'Supportive',
          }
        );

        const char1 = store.getCharacter('char-1');
        const hasRelationship = char1.relationships.some(
          (r: any) => r.character_id === 'char-2' && r.relationship_type === 'friend'
        );

        expect(hasRelationship).toBe(true);
      });

      it('should satisfy Requirement 6.1: Create inverse relationship on target character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice'));
        store.addCharacter(createTestCharacter('char-2', 'Bob'));

        addRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            relationship_type: 'mentor',
            description: 'Teaches magic',
            dynamic: 'Respectful',
          }
        );

        const char2 = store.getCharacter('char-2');
        const hasInverseRelationship = char2.relationships.some(
          (r: any) => r.character_id === 'char-1' && r.relationship_type === 'student'
        );

        expect(hasInverseRelationship).toBe(true);
      });

      it('should satisfy Requirement 6.1: Update both characters in store', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice'));
        store.addCharacter(createTestCharacter('char-2', 'Bob'));

        const result = addRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            relationship_type: 'friend',
            description: 'Friends',
            dynamic: 'Friendly',
          }
        );

        expect(result.success).toBe(true);
        expect(result.fromCharacter).toBeDefined();
        expect(result.toCharacter).toBeDefined();
        expect(result.fromCharacter?.relationships).toHaveLength(1);
        expect(result.toCharacter?.relationships).toHaveLength(1);
      });

      it('should satisfy Requirement 6.1: Emit update events for both characters', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice'));
        store.addCharacter(createTestCharacter('char-2', 'Bob'));

        addRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            relationship_type: 'friend',
            description: 'Friends',
            dynamic: 'Friendly',
          }
        );

        const updateEvents = eventEmitter.getEvents('character:updated');
        expect(updateEvents).toHaveLength(2);

        const char1Event = updateEvents.find(e => e.payload.characterId === 'char-1');
        const char2Event = updateEvents.find(e => e.payload.characterId === 'char-2');

        expect(char1Event).toBeDefined();
        expect(char2Event).toBeDefined();
      });
    });

    describe('edge cases', () => {
      it('should preserve existing relationships when adding new ones', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-3', character_name: 'Charlie', relationship_type: 'friend', description: '', dynamic: '' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob'));
        store.addCharacter(createTestCharacter('char-3', 'Charlie'));

        addRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            relationship_type: 'mentor',
            description: 'Teaches magic',
            dynamic: 'Respectful',
          }
        );

        const char1 = store.getCharacter('char-1');
        expect(char1.relationships).toHaveLength(2);
        
        // Should have both the existing and new relationship
        const hasExisting = char1.relationships.some((r: any) => r.character_id === 'char-3');
        const hasNew = char1.relationships.some((r: any) => r.character_id === 'char-2');

        expect(hasExisting).toBe(true);
        expect(hasNew).toBe(true);
      });

      it('should handle characters with no initial relationships', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', []));
        store.addCharacter(createTestCharacter('char-2', 'Bob', []));

        const result = addRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            relationship_type: 'friend',
            description: 'New friends',
            dynamic: 'Friendly',
          }
        );

        expect(result.success).toBe(true);
        expect(result.fromCharacter?.relationships).toHaveLength(1);
        expect(result.toCharacter?.relationships).toHaveLength(1);
      });
    });
  });

  describe('updateRelationship', () => {
    // Mock store implementation (reuse from addRelationship tests)
    function createMockStore() {
      const characters = new Map<string, any>();

      return {
        characters,
        getCharacter: (id: string) => characters.get(id),
        updateCharacter: (id: string, updates: any) => {
          const char = characters.get(id);
          if (char) {
            characters.set(id, { ...char, ...updates });
          }
        },
        addCharacter: (char: any) => {
          characters.set(char.character_id, char);
        },
        getAllCharacters: () => Array.from(characters.values()),
      };
    }

    // Mock event emitter
    function createMockEventEmitter() {
      const events: Array<{ type: string; payload: any }> = [];

      return {
        events,
        emit: (type: string, payload: any) => {
          events.push({ type, payload });
        },
        getEvents: (type?: string) => {
          return type ? events.filter(e => e.type === type) : events;
        },
        clear: () => {
          events.length = 0;
        },
      };
    }

    // Helper to create a test character
    function createTestCharacter(id: string, name: string, relationships: any[] = []) {
      return {
        character_id: id,
        name,
        relationships,
      };
    }

    describe('validation', () => {
      it('should return error if source character does not exist', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-2', 'Bob'));

        const result = updateRelationship(
          store,
          eventEmitter,
          'char-1', // Does not exist
          'char-2',
          {
            description: 'Updated description',
          }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Source character');
        expect(result.error).toContain('not found');
      });

      it('should return error if target character does not exist', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice'));

        const result = updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2', // Does not exist
          {
            description: 'Updated description',
          }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Target character');
        expect(result.error).toContain('not found');
      });

      it('should return error if relationship does not exist on source character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice'));
        store.addCharacter(createTestCharacter('char-2', 'Bob'));

        const result = updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            description: 'Updated description',
          }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('No relationship found');
        expect(result.error).toContain('Alice');
        expect(result.error).toContain('Bob');
      });

      it('should return error if inverse relationship does not exist on target character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        // Create char-1 with relationship to char-2, but char-2 without inverse
        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob')); // No inverse relationship

        const result = updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            description: 'Updated description',
          }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('No inverse relationship found');
        expect(result.error).toContain('Bob');
        expect(result.error).toContain('Alice');
      });
    });

    describe('bidirectional sync', () => {
      it('should update relationship description on source character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'mentor', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'student', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));

        const result = updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            description: 'Teaches advanced and dark magic',
          }
        );

        expect(result.success).toBe(true);

        const char1 = store.getCharacter('char-1');
        expect(char1.relationships[0].description).toBe('Teaches advanced and dark magic');
      });

      it('should update relationship description on target character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'mentor', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'student', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));

        const result = updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            description: 'Teaches advanced and dark magic',
          }
        );

        expect(result.success).toBe(true);

        const char2 = store.getCharacter('char-2');
        expect(char2.relationships[0].description).toBe('Teaches advanced and dark magic');
      });

      it('should update relationship dynamic on both characters', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Best friends', dynamic: 'Supportive' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Best friends', dynamic: 'Supportive' }
        ]));

        const result = updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            dynamic: 'Becoming tense and competitive',
          }
        );

        expect(result.success).toBe(true);

        const char1 = store.getCharacter('char-1');
        const char2 = store.getCharacter('char-2');

        expect(char1.relationships[0].dynamic).toBe('Becoming tense and competitive');
        expect(char2.relationships[0].dynamic).toBe('Becoming tense and competitive');
      });

      it('should update both description and dynamic simultaneously', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'mentor', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'student', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));

        const result = updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            description: 'Teaches forbidden magic',
            dynamic: 'Secretive and cautious',
          }
        );

        expect(result.success).toBe(true);

        const char1 = store.getCharacter('char-1');
        const char2 = store.getCharacter('char-2');

        expect(char1.relationships[0].description).toBe('Teaches forbidden magic');
        expect(char1.relationships[0].dynamic).toBe('Secretive and cautious');
        expect(char2.relationships[0].description).toBe('Teaches forbidden magic');
        expect(char2.relationships[0].dynamic).toBe('Secretive and cautious');
      });

      it('should update relationship type and inverse type when type is changed', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'mentor', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'student', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));

        const result = updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            relationship_type: 'friend',
          }
        );

        expect(result.success).toBe(true);

        const char1 = store.getCharacter('char-1');
        const char2 = store.getCharacter('char-2');

        expect(char1.relationships[0].relationship_type).toBe('friend');
        expect(char2.relationships[0].relationship_type).toBe('friend'); // Inverse of friend is friend
      });

      it('should preserve unchanged fields when updating', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'mentor', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'student', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));

        const result = updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            description: 'Updated description',
            // dynamic is not updated
          }
        );

        expect(result.success).toBe(true);

        const char1 = store.getCharacter('char-1');
        expect(char1.relationships[0].description).toBe('Updated description');
        expect(char1.relationships[0].dynamic).toBe('Respectful'); // Unchanged
        expect(char1.relationships[0].relationship_type).toBe('mentor'); // Unchanged
      });

      it('should update both characters in store', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));

        const result = updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            description: 'Best friends forever',
          }
        );

        expect(result.success).toBe(true);
        expect(result.fromCharacter).toBeDefined();
        expect(result.toCharacter).toBeDefined();

        // Verify both characters are updated in store
        const char1 = store.getCharacter('char-1');
        const char2 = store.getCharacter('char-2');

        expect(char1.relationships[0].description).toBe('Best friends forever');
        expect(char2.relationships[0].description).toBe('Best friends forever');
      });
    });

    describe('event emission', () => {
      it('should emit update event for source character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));

        updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            description: 'Updated description',
          }
        );

        const updateEvents = eventEmitter.getEvents('character:updated');
        expect(updateEvents.length).toBeGreaterThanOrEqual(1);

        const char1UpdateEvent = updateEvents.find(e => e.payload.characterId === 'char-1');
        expect(char1UpdateEvent).toBeDefined();
        expect(char1UpdateEvent.payload.source).toBe('relationship-sync');
        expect(char1UpdateEvent.payload.changeType).toBe('relationship-sync');
      });

      it('should emit update event for target character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));

        updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            description: 'Updated description',
          }
        );

        const updateEvents = eventEmitter.getEvents('character:updated');
        expect(updateEvents.length).toBeGreaterThanOrEqual(1);

        const char2UpdateEvent = updateEvents.find(e => e.payload.characterId === 'char-2');
        expect(char2UpdateEvent).toBeDefined();
        expect(char2UpdateEvent.payload.source).toBe('relationship-sync');
      });

      it('should emit relationship updated event', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'mentor', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'student', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));

        const updates = {
          description: 'Teaches advanced magic',
          dynamic: 'More competitive',
        };

        updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          updates
        );

        const relationshipEvents = eventEmitter.getEvents('character:relationship:updated');
        expect(relationshipEvents).toHaveLength(1);

        const event = relationshipEvents[0];
        expect(event.payload).toMatchObject({
          fromCharacterId: 'char-1',
          toCharacterId: 'char-2',
          bidirectional: true,
          updates,
        });
        expect(event.payload.relationship.description).toBe('Teaches advanced magic');
        expect(event.payload.inverseRelationship.description).toBe('Teaches advanced magic');
      });

      it('should emit all three events (2 updates + 1 relationship updated)', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));

        updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            description: 'Best friends',
          }
        );

        const allEvents = eventEmitter.getEvents();
        expect(allEvents.length).toBe(3);

        const updateEvents = eventEmitter.getEvents('character:updated');
        const relationshipEvents = eventEmitter.getEvents('character:relationship:updated');

        expect(updateEvents).toHaveLength(2);
        expect(relationshipEvents).toHaveLength(1);
      });
    });

    describe('requirement validation', () => {
      it('should satisfy Requirement 6.2: Update relationship on source character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));

        updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            description: 'Best friends',
            dynamic: 'Very supportive',
          }
        );

        const char1 = store.getCharacter('char-1');
        const relationship = char1.relationships.find((r: any) => r.character_id === 'char-2');

        expect(relationship.description).toBe('Best friends');
        expect(relationship.dynamic).toBe('Very supportive');
      });

      it('should satisfy Requirement 6.2: Update inverse relationship on target character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'mentor', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'student', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));

        updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            description: 'Teaches dark arts',
            dynamic: 'Secretive',
          }
        );

        const char2 = store.getCharacter('char-2');
        const inverseRelationship = char2.relationships.find((r: any) => r.character_id === 'char-1');

        expect(inverseRelationship.description).toBe('Teaches dark arts');
        expect(inverseRelationship.dynamic).toBe('Secretive');
        expect(inverseRelationship.relationship_type).toBe('student'); // Type unchanged
      });

      it('should satisfy Requirement 6.2: Persist both characters', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));

        const result = updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            description: 'Updated',
          }
        );

        expect(result.success).toBe(true);
        expect(result.fromCharacter).toBeDefined();
        expect(result.toCharacter).toBeDefined();

        // Verify persistence by retrieving from store
        const char1 = store.getCharacter('char-1');
        const char2 = store.getCharacter('char-2');

        expect(char1.relationships[0].description).toBe('Updated');
        expect(char2.relationships[0].description).toBe('Updated');
      });
    });

    describe('edge cases', () => {
      it('should preserve other relationships when updating one', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' },
          { character_id: 'char-3', character_name: 'Charlie', relationship_type: 'mentor', description: 'Teaches', dynamic: 'Respectful' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));
        store.addCharacter(createTestCharacter('char-3', 'Charlie'));

        updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            description: 'Best friends',
          }
        );

        const char1 = store.getCharacter('char-1');
        expect(char1.relationships).toHaveLength(2);

        // Updated relationship
        const updatedRel = char1.relationships.find((r: any) => r.character_id === 'char-2');
        expect(updatedRel.description).toBe('Best friends');

        // Unchanged relationship
        const unchangedRel = char1.relationships.find((r: any) => r.character_id === 'char-3');
        expect(unchangedRel.description).toBe('Teaches');
      });

      it('should handle empty updates object', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));

        const result = updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {} // Empty updates
        );

        expect(result.success).toBe(true);

        // Relationships should remain unchanged
        const char1 = store.getCharacter('char-1');
        expect(char1.relationships[0].description).toBe('Friends');
        expect(char1.relationships[0].dynamic).toBe('Friendly');
      });

      it('should handle updating only description', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));

        const result = updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            description: 'Close friends',
          }
        );

        expect(result.success).toBe(true);

        const char1 = store.getCharacter('char-1');
        expect(char1.relationships[0].description).toBe('Close friends');
        expect(char1.relationships[0].dynamic).toBe('Friendly'); // Unchanged
      });

      it('should handle updating only dynamic', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));

        const result = updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            dynamic: 'Tense',
          }
        );

        expect(result.success).toBe(true);

        const char1 = store.getCharacter('char-1');
        expect(char1.relationships[0].description).toBe('Friends'); // Unchanged
        expect(char1.relationships[0].dynamic).toBe('Tense');
      });

      it('should handle asymmetric relationship type update', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));

        const result = updateRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2',
          {
            relationship_type: 'mentor', // Change from friend to mentor
          }
        );

        expect(result.success).toBe(true);

        const char1 = store.getCharacter('char-1');
        const char2 = store.getCharacter('char-2');

        expect(char1.relationships[0].relationship_type).toBe('mentor');
        expect(char2.relationships[0].relationship_type).toBe('student'); // Inverse
      });
    });
  });

  describe('removeRelationship', () => {
    // Mock store implementation (reuse from previous tests)
    function createMockStore() {
      const characters = new Map<string, any>();

      return {
        characters,
        getCharacter: (id: string) => characters.get(id),
        updateCharacter: (id: string, updates: any) => {
          const char = characters.get(id);
          if (char) {
            characters.set(id, { ...char, ...updates });
          }
        },
        addCharacter: (char: any) => {
          characters.set(char.character_id, char);
        },
        getAllCharacters: () => Array.from(characters.values()),
      };
    }

    // Mock event emitter
    function createMockEventEmitter() {
      const events: Array<{ type: string; payload: any }> = [];

      return {
        events,
        emit: (type: string, payload: any) => {
          events.push({ type, payload });
        },
        getEvents: (type?: string) => {
          return type ? events.filter(e => e.type === type) : events;
        },
        clear: () => {
          events.length = 0;
        },
      };
    }

    // Helper to create a test character
    function createTestCharacter(id: string, name: string, relationships: any[] = []) {
      return {
        character_id: id,
        name,
        relationships,
      };
    }

    describe('validation', () => {
      it('should return error if source character does not exist', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-2', 'Bob'));

        const result = removeRelationship(
          store,
          eventEmitter,
          'char-1', // Does not exist
          'char-2'
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Source character');
        expect(result.error).toContain('not found');
      });

      it('should return error if target character does not exist', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice'));

        const result = removeRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2' // Does not exist
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('Target character');
        expect(result.error).toContain('not found');
      });

      it('should return error if relationship does not exist on source character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice'));
        store.addCharacter(createTestCharacter('char-2', 'Bob'));

        const result = removeRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2'
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('No relationship found');
        expect(result.error).toContain('Alice');
        expect(result.error).toContain('Bob');
      });

      it('should return error if inverse relationship does not exist on target character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        // Create char-1 with relationship to char-2, but char-2 without inverse
        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob')); // No inverse relationship

        const result = removeRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2'
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('No inverse relationship found');
        expect(result.error).toContain('Bob');
        expect(result.error).toContain('Alice');
      });
    });

    describe('bidirectional sync', () => {
      it('should remove relationship from source character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'mentor', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'student', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));

        const result = removeRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2'
        );

        expect(result.success).toBe(true);

        const char1 = store.getCharacter('char-1');
        expect(char1.relationships).toHaveLength(0);
      });

      it('should remove inverse relationship from target character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'mentor', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'student', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));

        const result = removeRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2'
        );

        expect(result.success).toBe(true);

        const char2 = store.getCharacter('char-2');
        expect(char2.relationships).toHaveLength(0);
      });

      it('should handle symmetric relationships correctly', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Best friends', dynamic: 'Supportive' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Best friends', dynamic: 'Supportive' }
        ]));

        const result = removeRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2'
        );

        expect(result.success).toBe(true);

        const char1 = store.getCharacter('char-1');
        const char2 = store.getCharacter('char-2');

        // Both should have no relationships
        expect(char1.relationships).toHaveLength(0);
        expect(char2.relationships).toHaveLength(0);
      });

      it('should update both characters in store', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'parent', description: 'Loving parent', dynamic: 'Caring' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'child', description: 'Loving parent', dynamic: 'Caring' }
        ]));

        const result = removeRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2'
        );

        expect(result.success).toBe(true);
        expect(result.fromCharacter).toBeDefined();
        expect(result.toCharacter).toBeDefined();

        // Verify both characters are updated in store
        const char1 = store.getCharacter('char-1');
        const char2 = store.getCharacter('char-2');

        expect(char1.relationships).toHaveLength(0);
        expect(char2.relationships).toHaveLength(0);
      });
    });

    describe('event emission', () => {
      it('should emit update event for source character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));

        removeRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2'
        );

        const updateEvents = eventEmitter.getEvents('character:updated');
        expect(updateEvents.length).toBeGreaterThanOrEqual(1);

        const char1UpdateEvent = updateEvents.find(e => e.payload.characterId === 'char-1');
        expect(char1UpdateEvent).toBeDefined();
        expect(char1UpdateEvent.payload.source).toBe('relationship-sync');
        expect(char1UpdateEvent.payload.changeType).toBe('relationship-sync');
      });

      it('should emit update event for target character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));

        removeRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2'
        );

        const updateEvents = eventEmitter.getEvents('character:updated');
        expect(updateEvents.length).toBeGreaterThanOrEqual(1);

        const char2UpdateEvent = updateEvents.find(e => e.payload.characterId === 'char-2');
        expect(char2UpdateEvent).toBeDefined();
        expect(char2UpdateEvent.payload.source).toBe('relationship-sync');
      });

      it('should emit relationship removed event', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'mentor', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'student', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));

        removeRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2'
        );

        const relationshipEvents = eventEmitter.getEvents('character:relationship:removed');
        expect(relationshipEvents).toHaveLength(1);

        const event = relationshipEvents[0];
        expect(event.payload).toMatchObject({
          fromCharacterId: 'char-1',
          toCharacterId: 'char-2',
          bidirectional: true,
        });
        expect(event.payload.relationship.relationship_type).toBe('mentor');
        expect(event.payload.inverseRelationship.relationship_type).toBe('student');
      });

      it('should emit all three events (2 updates + 1 relationship removed)', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));

        removeRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2'
        );

        const allEvents = eventEmitter.getEvents();
        expect(allEvents.length).toBe(3);

        const updateEvents = eventEmitter.getEvents('character:updated');
        const relationshipEvents = eventEmitter.getEvents('character:relationship:removed');

        expect(updateEvents).toHaveLength(2);
        expect(relationshipEvents).toHaveLength(1);
      });
    });

    describe('requirement validation', () => {
      it('should satisfy Requirement 6.3: Remove relationship from source character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Best friends', dynamic: 'Supportive' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Best friends', dynamic: 'Supportive' }
        ]));

        removeRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2'
        );

        const char1 = store.getCharacter('char-1');
        const hasRelationship = char1.relationships.some(
          (r: any) => r.character_id === 'char-2'
        );

        expect(hasRelationship).toBe(false);
      });

      it('should satisfy Requirement 6.3: Remove inverse relationship from target character', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'mentor', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'student', description: 'Teaches magic', dynamic: 'Respectful' }
        ]));

        removeRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2'
        );

        const char2 = store.getCharacter('char-2');
        const hasInverseRelationship = char2.relationships.some(
          (r: any) => r.character_id === 'char-1'
        );

        expect(hasInverseRelationship).toBe(false);
      });

      it('should satisfy Requirement 6.3: Persist both characters', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));

        const result = removeRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2'
        );

        expect(result.success).toBe(true);
        expect(result.fromCharacter).toBeDefined();
        expect(result.toCharacter).toBeDefined();

        // Verify persistence by retrieving from store
        const char1 = store.getCharacter('char-1');
        const char2 = store.getCharacter('char-2');

        expect(char1.relationships).toHaveLength(0);
        expect(char2.relationships).toHaveLength(0);
      });
    });

    describe('edge cases', () => {
      it('should preserve other relationships when removing one', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' },
          { character_id: 'char-3', character_name: 'Charlie', relationship_type: 'mentor', description: 'Teaches', dynamic: 'Respectful' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));
        store.addCharacter(createTestCharacter('char-3', 'Charlie', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'student', description: 'Teaches', dynamic: 'Respectful' }
        ]));

        removeRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2'
        );

        const char1 = store.getCharacter('char-1');
        expect(char1.relationships).toHaveLength(1);

        // Removed relationship should be gone
        const removedRel = char1.relationships.find((r: any) => r.character_id === 'char-2');
        expect(removedRel).toBeUndefined();

        // Other relationship should remain
        const remainingRel = char1.relationships.find((r: any) => r.character_id === 'char-3');
        expect(remainingRel).toBeDefined();
        expect(remainingRel.description).toBe('Teaches');
      });

      it('should handle removing the only relationship', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));

        const result = removeRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2'
        );

        expect(result.success).toBe(true);

        const char1 = store.getCharacter('char-1');
        const char2 = store.getCharacter('char-2');

        expect(char1.relationships).toHaveLength(0);
        expect(char2.relationships).toHaveLength(0);
      });

      it('should handle asymmetric relationship removal', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'parent', description: 'Loving parent', dynamic: 'Caring' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'child', description: 'Loving parent', dynamic: 'Caring' }
        ]));

        const result = removeRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2'
        );

        expect(result.success).toBe(true);

        const char1 = store.getCharacter('char-1');
        const char2 = store.getCharacter('char-2');

        // Both parent and child relationships should be removed
        expect(char1.relationships).toHaveLength(0);
        expect(char2.relationships).toHaveLength(0);
      });

      it('should handle removing relationship when target has multiple relationships', () => {
        const store = createMockStore();
        const eventEmitter = createMockEventEmitter();

        store.addCharacter(createTestCharacter('char-1', 'Alice', [
          { character_id: 'char-2', character_name: 'Bob', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' }
        ]));
        store.addCharacter(createTestCharacter('char-2', 'Bob', [
          { character_id: 'char-1', character_name: 'Alice', relationship_type: 'friend', description: 'Friends', dynamic: 'Friendly' },
          { character_id: 'char-3', character_name: 'Charlie', relationship_type: 'sibling', description: 'Brother', dynamic: 'Close' }
        ]));
        store.addCharacter(createTestCharacter('char-3', 'Charlie'));

        removeRelationship(
          store,
          eventEmitter,
          'char-1',
          'char-2'
        );

        const char1 = store.getCharacter('char-1');
        const char2 = store.getCharacter('char-2');

        // char-1 should have no relationships
        expect(char1.relationships).toHaveLength(0);

        // char-2 should still have relationship with char-3
        expect(char2.relationships).toHaveLength(1);
        expect(char2.relationships[0].character_id).toBe('char-3');
      });
    });
  });
});
