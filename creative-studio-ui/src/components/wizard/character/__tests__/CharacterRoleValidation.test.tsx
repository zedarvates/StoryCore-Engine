// ============================================================================
// Character Role Validation Tests
// ============================================================================
// Tests for role object validation, migration, and edge cases
// Validates: Requirements 2.2, 2.3, 2.4, 2.5

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import type { Role } from '@/types/character';

// ============================================================================
// Role Validation Utilities
// ============================================================================

/**
 * Validates that a role object has all required fields with correct types
 */
export function validateRole(role: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (role === null || role === undefined) {
    errors.push('Role is null or undefined');
    return { valid: false, errors };
  }

  // Arrays are objects but not valid role objects
  if (Array.isArray(role)) {
    errors.push('Role cannot be an array');
    return { valid: false, errors };
  }

  if (typeof role !== 'object') {
    errors.push(`Role is not an object, got: ${typeof role}`);
    return { valid: false, errors };
  }

  const roleObj = role as Record<string, unknown>;

  if (typeof roleObj.archetype !== 'string') {
    errors.push('archetype field is missing or not a string');
  }

  if (typeof roleObj.narrative_function !== 'string') {
    errors.push('narrative_function field is missing or not a string');
  }

  if (typeof roleObj.character_arc !== 'string') {
    errors.push('character_arc field is missing or not a string');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Checks if role is in legacy string format and migrates to object format
 */
export function migrateLegacyRole(role: unknown): Role {
  // Handle legacy string format
  if (typeof role === 'string') {
    return {
      archetype: role,
      narrative_function: '',
      character_arc: '',
    };
  }

  // Handle object format
  if (role === null || role === undefined || typeof role !== 'object') {
    return {
      archetype: '',
      narrative_function: '',
      character_arc: '',
    };
  }

  const roleObj = role as Record<string, unknown>;

  return {
    archetype: typeof roleObj.archetype === 'string' ? roleObj.archetype : '',
    narrative_function: typeof roleObj.narrative_function === 'string' ? roleObj.narrative_function : '',
    character_arc: typeof roleObj.character_arc === 'string' ? roleObj.character_arc : '',
  };
}

/**
 * Checks if a role object is complete (all fields non-empty)
 */
export function isRoleComplete(role: Role): boolean {
  return !!(
    role.archetype &&
    role.narrative_function &&
    role.character_arc
  );
}

// ============================================================================
// Arbitraries for Property-Based Testing
// ============================================================================

const validArchetypes = [
  'Protagonist', 'Antagonist', 'Mentor', 'Sidekick', 'Love Interest',
  'Foil', 'Henchman', 'Supporting Character', 'Tritagonist', 'Narrator'
];

const validNarrativeFunctions = [
  'Hero', 'Villain', 'Guide', 'Threshold Guardian', 'Shadow',
  'Ally', 'Trickster', 'Shapeshifter', 'Herald', 'Heroine'
];

const validCharacterArcs = [
  'Growth', 'Fall', 'Transformation', 'Flat', 'Testing',
  'Rebirth', 'Corruption', 'Redeem', 'Decline', 'Rise'
];

/**
 * Generates a valid role object for property testing
 */
const validRoleArb = fc.record({
  archetype: fc.oneof(
    fc.string({ minLength: 1, maxLength: 50 }),
    fc.constantFrom(...validArchetypes)
  ),
  narrative_function: fc.oneof(
    fc.string({ minLength: 1, maxLength: 50 }),
    fc.constantFrom(...validNarrativeFunctions)
  ),
  character_arc: fc.oneof(
    fc.string({ minLength: 1, maxLength: 50 }),
    fc.constantFrom(...validCharacterArcs)
  ),
});

const legacyRoleStringArb = fc.oneof(
  fc.string({ minLength: 1, maxLength: 50 }),
  fc.constantFrom(...validArchetypes)
);

// ============================================================================
// Test Suites
// ============================================================================

describe('Character Role Validation - Property Tests', () => {
  describe('Task 1.2: Role Object Validation', () => {
    it('should validate complete role objects without errors', () => {
      fc.assert(
        fc.property(validRoleArb, (role: Record<string, string>) => {
          const result = validateRole(role);
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }),
        { numRuns: 100 }
      );
    });

    it('should validate object properties are strings', () => {
      fc.assert(
        fc.property(validRoleArb, (role: Record<string, string>) => {
          expect(typeof role.archetype).toBe('string');
          expect(typeof role.narrative_function).toBe('string');
          expect(typeof role.character_arc).toBe('string');
        }),
        { numRuns: 100 }
      );
    });

    it('should handle role with all valid archetype variations', () => {
      validArchetypes.forEach((archetype) => {
        const role: Role = {
          archetype,
          narrative_function: 'Hero',
          character_arc: 'Growth',
        };
        const result = validateRole(role);
        expect(result.valid).toBe(true);
      });
    });

    it('should handle role with all valid narrative function variations', () => {
      validNarrativeFunctions.forEach((narrative_function) => {
        const role: Role = {
          archetype: 'Protagonist',
          narrative_function,
          character_arc: 'Growth',
        };
        const result = validateRole(role);
        expect(result.valid).toBe(true);
      });
    });

    it('should handle role with all valid character arc variations', () => {
      validCharacterArcs.forEach((character_arc) => {
        const role: Role = {
          archetype: 'Protagonist',
          narrative_function: 'Hero',
          character_arc,
        };
        const result = validateRole(role);
        expect(result.valid).toBe(true);
      });
    });
  });

  describe('Task 1.3: Role Migration', () => {
    it('should migrate legacy string role to object format', () => {
      fc.assert(
        fc.property(legacyRoleStringArb, (legacyRole: string) => {
          const migrated = migrateLegacyRole(legacyRole);
          
          expect(migrated.archetype).toBe(legacyRole);
          expect(migrated.narrative_function).toBe('');
          expect(migrated.character_arc).toBe('');
          expect(typeof migrated.archetype).toBe('string');
          expect(typeof migrated.narrative_function).toBe('string');
          expect(typeof migrated.character_arc).toBe('string');
        }),
        { numRuns: 100 }
      );
    });

    it('should preserve original string value in archetype after migration', () => {
      const testValues = ['Protagonist', 'Antagonist', 'Mentor', 'Custom Archetype'];
      
      testValues.forEach((value) => {
        const migrated = migrateLegacyRole(value);
        expect(migrated.archetype).toBe(value);
      });
    });

    it('should handle object roles without modification', () => {
      const originalRole: Role = {
        archetype: 'Protagonist',
        narrative_function: 'Hero',
        character_arc: 'Growth',
      };
      
      const migrated = migrateLegacyRole(originalRole);
      
      expect(migrated.archetype).toBe(originalRole.archetype);
      expect(migrated.narrative_function).toBe(originalRole.narrative_function);
      expect(migrated.character_arc).toBe(originalRole.character_arc);
    });

    it('should maintain backward compatibility', () => {
      fc.assert(
        fc.property(
          fc.oneof(legacyRoleStringArb, validRoleArb),
          (role: string | Record<string, string>) => {
            const migrated = migrateLegacyRole(role);
            
            // Result should always be a valid Role object
            expect(typeof migrated.archetype).toBe('string');
            expect(typeof migrated.narrative_function).toBe('string');
            expect(typeof migrated.character_arc).toBe('string');
            
            // Validation should pass
            const validationResult = validateRole(migrated);
            expect(validationResult.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle null role during migration', () => {
      const migrated = migrateLegacyRole(null);
      
      expect(migrated.archetype).toBe('');
      expect(migrated.narrative_function).toBe('');
      expect(migrated.character_arc).toBe('');
    });

    it('should handle undefined role during migration', () => {
      const migrated = migrateLegacyRole(undefined);
      
      expect(migrated.archetype).toBe('');
      expect(migrated.narrative_function).toBe('');
      expect(migrated.character_arc).toBe('');
    });
  });

  describe('Task 1.4: Edge Cases', () => {
    describe('Null and Undefined Role', () => {
      it('should handle null role gracefully', () => {
        const result = validateRole(null);
        
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('null');
      });

      it('should handle undefined role gracefully', () => {
        const result = validateRole(undefined);
        
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.errors[0]).toContain('null');
      });
    });

    describe('Invalid Types', () => {
      it('should reject string role', () => {
        const result = validateRole('Protagonist' as unknown);
        
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('object'))).toBe(true);
      });

      it('should reject number role', () => {
        const result = validateRole(123 as unknown);
        
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('object'))).toBe(true);
      });

      it('should reject array role', () => {
        const result = validateRole(['Protagonist', 'Hero'] as unknown);
        
        expect(result.valid).toBe(false);
        // Arrays are objects, so the error message will say it's not an object
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should reject boolean role', () => {
        const result = validateRole(true as unknown);
        
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.includes('object'))).toBe(true);
      });
    });

    describe('Empty Object', () => {
      it('should reject empty object role', () => {
        const result = validateRole({});
        
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBe(3); // Missing all three fields
        expect(result.errors).toContain('archetype field is missing or not a string');
        expect(result.errors).toContain('narrative_function field is missing or not a string');
        expect(result.errors).toContain('character_arc field is missing or not a string');
      });
    });

    describe('Partial Objects', () => {
      it('should reject role with missing archetype', () => {
        const result = validateRole({
          narrative_function: 'Hero',
          character_arc: 'Growth',
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('archetype field is missing or not a string');
      });

      it('should reject role with missing narrative_function', () => {
        const result = validateRole({
          archetype: 'Protagonist',
          character_arc: 'Growth',
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('narrative_function field is missing or not a string');
      });

      it('should reject role with missing character_arc', () => {
        const result = validateRole({
          archetype: 'Protagonist',
          narrative_function: 'Hero',
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('character_arc field is missing or not a string');
      });

      it('should reject role with two missing fields', () => {
        const result = validateRole({
          archetype: 'Protagonist',
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBe(2);
      });
    });

    describe('Wrong Types', () => {
      it('should reject role with number instead of archetype', () => {
        const result = validateRole({
          archetype: 123 as unknown,
          narrative_function: 'Hero',
          character_arc: 'Growth',
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('archetype field is missing or not a string');
      });

      it('should reject role with array instead of narrative_function', () => {
        const result = validateRole({
          archetype: 'Protagonist',
          narrative_function: ['Hero', 'Guide'] as unknown,
          character_arc: 'Growth',
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('narrative_function field is missing or not a string');
      });

      it('should reject role with null instead of character_arc', () => {
        const result = validateRole({
          archetype: 'Protagonist',
          narrative_function: 'Hero',
          character_arc: null,
        });
        
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('character_arc field is missing or not a string');
      });
    });

    describe('Extra Fields', () => {
      it('should accept role with extra unexpected fields', () => {
        const roleWithExtra = {
          archetype: 'Protagonist',
          narrative_function: 'Hero',
          character_arc: 'Growth',
          custom_field: 'extra value',
          another_field: 123,
        };
        
        const result = validateRole(roleWithExtra);
        
        // Should still be valid since required fields are present and correct type
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept role with deeply nested extra fields', () => {
        const roleWithNestedExtra = {
          archetype: 'Protagonist',
          narrative_function: 'Hero',
          character_arc: 'Growth',
          metadata: {
            created_at: '2024-01-01',
            version: 1,
            tags: ['hero', 'main'],
          },
        };
        
        const result = validateRole(roleWithNestedExtra);
        
        expect(result.valid).toBe(true);
      });
    });

    describe('Deeply Nested Structures', () => {
      it('should handle role as nested object property', () => {
        const nestedData = {
          character: {
            info: {
              role: {
                archetype: 'Antagonist',
                narrative_function: 'Villain',
                character_arc: 'Fall',
              },
            },
          },
        };
        
        const result = validateRole(nestedData.character.info.role);
        
        expect(result.valid).toBe(true);
      });

      it('should handle deeply nested role validation errors', () => {
        const nestedData = {
          character: {
            info: {
              role: {
                archetype: 'Protagonist',
              },
            },
          },
        };
        
        const result = validateRole(nestedData.character.info.role);
        
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBe(2);
      });
    });

    describe('Empty Strings', () => {
      it('should accept role with empty strings', () => {
        const role: Role = {
          archetype: '',
          narrative_function: '',
          character_arc: '',
        };
        
        const result = validateRole(role);
        
        // Empty strings are valid types, just empty values
        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should distinguish between missing and empty', () => {
        const missingFieldResult = validateRole({
          narrative_function: 'Hero',
          character_arc: 'Growth',
        });
        
        const emptyStringResult = validateRole({
          archetype: '',
          narrative_function: 'Hero',
          character_arc: 'Growth',
        });
        
        expect(missingFieldResult.valid).toBe(false);
        expect(emptyStringResult.valid).toBe(true);
      });
    });
  });

  describe('Role Completeness Check', () => {
    it('should identify complete roles', () => {
      const completeRole: Role = {
        archetype: 'Protagonist',
        narrative_function: 'Hero',
        character_arc: 'Growth',
      };
      
      expect(isRoleComplete(completeRole)).toBe(true);
    });

    it('should identify incomplete roles', () => {
      const incompleteRole: Role = {
        archetype: 'Protagonist',
        narrative_function: '',
        character_arc: 'Growth',
      };
      
      expect(isRoleComplete(incompleteRole)).toBe(false);
    });

    it('should identify empty roles as incomplete', () => {
      const emptyRole: Role = {
        archetype: '',
        narrative_function: '',
        character_arc: '',
      };
      
      expect(isRoleComplete(emptyRole)).toBe(false);
    });
  });

  describe('Data Integrity After Migration', () => {
    it('should maintain all required fields after migration', () => {
      fc.assert(
        fc.property(
          fc.oneof(legacyRoleStringArb, validRoleArb),
          (role: string | Record<string, string>) => {
            const migrated = migrateLegacyRole(role);
            
            // Check all fields exist and are strings
            expect(migrated).toHaveProperty('archetype');
            expect(migrated).toHaveProperty('narrative_function');
            expect(migrated).toHaveProperty('character_arc');
            
            expect(typeof migrated.archetype).toBe('string');
            expect(typeof migrated.narrative_function).toBe('string');
            expect(typeof migrated.character_arc).toBe('string');
            
            // Validate migrated role
            const validationResult = validateRole(migrated);
            expect(validationResult.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should not mutate original data during migration', () => {
      const originalRole: Role = {
        archetype: 'Protagonist',
        narrative_function: 'Hero',
        character_arc: 'Growth',
      };
      
      const originalCopy = { ...originalRole };
      
      migrateLegacyRole(originalRole);
      
      expect(originalRole).toEqual(originalCopy);
    });

    it('should handle migration of various data types without errors', () => {
      const testCases = [
        'Protagonist',
        { archetype: 'Antagonist' },
        { archetype: 'Mentor', narrative_function: 'Guide' },
        { archetype: 'Protagonist', narrative_function: 'Hero', character_arc: 'Growth' },
        null,
        undefined,
        123,
        [],
      ];
      
      testCases.forEach((testCase) => {
        expect(() => {
          migrateLegacyRole(testCase);
        }).not.toThrow();
      });
    });
  });
});

describe('Character Role Validation - Integration Tests', () => {
  it('should validate role in character context', () => {
    const character = {
      character_id: 'test-123',
      name: 'Test Character',
      role: {
        archetype: 'Protagonist',
        narrative_function: 'Hero',
        character_arc: 'Growth',
      } as Role,
    };
    
    const result = validateRole(character.role);
    expect(result.valid).toBe(true);
  });

  it('should handle character with legacy role format', () => {
    const character = {
      character_id: 'test-123',
      name: 'Test Character',
      role: 'Protagonist' as unknown,
    };
    
    const migrated = migrateLegacyRole(character.role);
    
    expect(migrated.archetype).toBe('Protagonist');
    expect(migrated.narrative_function).toBe('');
    expect(migrated.character_arc).toBe('');
  });

  it('should validate migrated character role', () => {
    const character = {
      character_id: 'test-123',
      name: 'Test Character',
      role: 'Protagonist' as unknown,
    };
    
    const migrated = migrateLegacyRole(character.role);
    const result = validateRole(migrated);
    
    expect(result.valid).toBe(true);
  });
});
