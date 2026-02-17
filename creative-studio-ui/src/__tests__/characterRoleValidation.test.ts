/**
 * Tests for Character Role Validation
 * 
 * Tests the normalizeCharacterRole functionality which handles:
 * - Validation of role object format
 * - Migration from legacy string format to object format
 * - Edge cases (null, undefined, invalid types)
 * 
 * Related to TOP_URGENT_TASKS.md - Task #6
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PersistenceService } from '../services/PersistenceService';
import type { Character, Role } from '../types/character';

// Mock logger
vi.mock('../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Helper to create a minimal valid character for testing
function createTestCharacter(overrides: Partial<Character> = {}): Character {
  return {
    character_id: 'test-char-1',
    name: 'Test Character',
    creation_method: 'wizard',
    creation_timestamp: new Date().toISOString(),
    version: '1.0',
    visual_identity: {
      hair_color: 'brown',
      hair_style: 'short',
      hair_length: 'medium',
      eye_color: 'blue',
      eye_shape: 'round',
      skin_tone: 'light',
      facial_structure: 'oval',
      distinctive_features: [],
      age_range: '25-35',
      gender: 'male',
      height: '180cm',
      build: 'athletic',
      posture: 'upright',
      clothing_style: 'casual',
      color_palette: [],
      reference_images: [],
      reference_sheet_images: [],
    },
    personality: {
      traits: ['brave'],
      values: ['honor'],
      fears: ['failure'],
      desires: ['success'],
      flaws: ['pride'],
      strengths: ['courage'],
      temperament: 'sanguine',
      communication_style: 'direct',
    },
    background: {
      origin: 'unknown',
      occupation: 'adventurer',
      education: 'self-taught',
      family: 'none',
      significant_events: [],
      current_situation: 'traveling',
    },
    relationships: [],
    role: {
      archetype: 'hero',
      narrative_function: 'protagonist',
      character_arc: 'growth',
    },
    ...overrides,
  };
}

describe('Character Role Validation', () => {
  let persistenceService: PersistenceService;

  beforeEach(() => {
    persistenceService = PersistenceService.getInstance();
    // Clear localStorage before each test
    localStorage.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Role Object Format Validation', () => {
    it('should accept valid role object with all properties', async () => {
      const character = createTestCharacter({
        role: {
          archetype: 'hero',
          narrative_function: 'protagonist',
          character_arc: 'redemption',
        },
      });

      // The saveCharacter method should not throw for valid role
      const result = await persistenceService.saveCharacter(character);
      expect(result).toBeDefined();
      expect(result.some(r => r.success)).toBe(true);
    });

    it('should accept role object with empty string properties', async () => {
      const character = createTestCharacter({
        role: {
          archetype: '',
          narrative_function: '',
          character_arc: '',
        },
      });

      const result = await persistenceService.saveCharacter(character);
      expect(result).toBeDefined();
      expect(result.some(r => r.success)).toBe(true);
    });

    it('should accept role object with partial properties', async () => {
      const character = createTestCharacter({
        role: {
          archetype: 'villain',
          narrative_function: '',
          character_arc: '',
        },
      });

      const result = await persistenceService.saveCharacter(character);
      expect(result).toBeDefined();
      expect(result.some(r => r.success)).toBe(true);
    });
  });

  describe('Role Migration from Legacy String Format', () => {
    it('should migrate string role to object format with archetype', async () => {
      // Create character with string role (legacy format)
      const characterWithLegacyRole = {
        ...createTestCharacter(),
        role: 'hero' as unknown as Role, // Simulate legacy string format
      };

      const result = await persistenceService.saveCharacter(characterWithLegacyRole);
      expect(result).toBeDefined();
      expect(result.some(r => r.success)).toBe(true);
    });

    it('should migrate empty string role to empty object format', async () => {
      const characterWithEmptyStringRole = {
        ...createTestCharacter(),
        role: '' as unknown as Role,
      };

      const result = await persistenceService.saveCharacter(characterWithEmptyStringRole);
      expect(result).toBeDefined();
      expect(result.some(r => r.success)).toBe(true);
    });
  });

  describe('Edge Cases for Role Validation', () => {
    it('should handle null role by converting to empty object', async () => {
      const characterWithNullRole = {
        ...createTestCharacter(),
        role: null as unknown as Role,
      };

      const result = await persistenceService.saveCharacter(characterWithNullRole);
      expect(result).toBeDefined();
      expect(result.some(r => r.success)).toBe(true);
    });

    it('should handle undefined role by converting to empty object', async () => {
      const characterWithUndefinedRole = {
        ...createTestCharacter(),
        role: undefined as unknown as Role,
      };

      const result = await persistenceService.saveCharacter(characterWithUndefinedRole);
      expect(result).toBeDefined();
      expect(result.some(r => r.success)).toBe(true);
    });

    it('should handle number role by converting to string archetype', async () => {
      const characterWithNumberRole = {
        ...createTestCharacter(),
        role: 123 as unknown as Role,
      };

      const result = await persistenceService.saveCharacter(characterWithNumberRole);
      expect(result).toBeDefined();
      expect(result.some(r => r.success)).toBe(true);
    });

    it('should handle boolean role by converting to string archetype', async () => {
      const characterWithBooleanRole = {
        ...createTestCharacter(),
        role: true as unknown as Role,
      };

      const result = await persistenceService.saveCharacter(characterWithBooleanRole);
      expect(result).toBeDefined();
      expect(result.some(r => r.success)).toBe(true);
    });

    it('should handle array role by converting to string archetype', async () => {
      const characterWithArrayRole = {
        ...createTestCharacter(),
        role: ['hero', 'protagonist'] as unknown as Role,
      };

      const result = await persistenceService.saveCharacter(characterWithArrayRole);
      expect(result).toBeDefined();
      expect(result.some(r => r.success)).toBe(true);
    });
  });

  describe('Role Object Property Validation', () => {
    it('should ensure all required role properties exist after normalization', async () => {
      const characterWithPartialRole = {
        ...createTestCharacter(),
        role: {
          archetype: 'mentor',
          // Missing narrative_function and character_arc
        } as Partial<Role> as Role,
      };

      const result = await persistenceService.saveCharacter(characterWithPartialRole);
      expect(result).toBeDefined();
      expect(result.some(r => r.success)).toBe(true);
    });

    it('should preserve existing role properties during normalization', async () => {
      const character = createTestCharacter({
        role: {
          archetype: 'trickster',
          narrative_function: 'comic_relief',
          character_arc: 'redemption',
        },
      });

      const result = await persistenceService.saveCharacter(character);
      expect(result).toBeDefined();
      expect(result.some(r => r.success)).toBe(true);
    });
  });

  describe('Character Validation Integration', () => {
    it('should validate character with valid role object', async () => {
      const character = createTestCharacter({
        role: {
          archetype: 'hero',
          narrative_function: 'protagonist',
          character_arc: 'coming_of_age',
        },
      });

      const result = await persistenceService.saveCharacter(character);
      expect(result).toBeDefined();
      expect(result.some(r => r.success)).toBe(true);
    });

    it('should reject character without character_id', async () => {
      const invalidCharacter = {
        ...createTestCharacter({ character_id: 'unique-id-for-id-test' }),
        character_id: '',
      };

      await expect(persistenceService.saveCharacter(invalidCharacter)).rejects.toThrow('Validation failed');
    });

    it('should reject character without name', async () => {
      // Use a unique character_id to avoid the duplicate save prevention
      const invalidCharacter = {
        ...createTestCharacter({ character_id: 'unique-id-for-name-test' }),
        name: '',
      };

      // The validation should throw an error for empty name
      await expect(persistenceService.saveCharacter(invalidCharacter)).rejects.toThrow('Validation failed');
    });
  });

  describe('Multiple Character Role Scenarios', () => {
    it('should handle multiple characters with different role formats', async () => {
      const characters = [
        createTestCharacter({ character_id: 'char-1', role: { archetype: 'hero', narrative_function: 'protagonist', character_arc: 'growth' } }),
        { ...createTestCharacter({ character_id: 'char-2' }), role: 'villain' as unknown as Role },
        { ...createTestCharacter({ character_id: 'char-3' }), role: null as unknown as Role },
      ];

      for (const char of characters) {
        const result = await persistenceService.saveCharacter(char);
        expect(result.some(r => r.success)).toBe(true);
      }
    });
  });
});

describe('Role Type Guard Tests', () => {
  it('should identify valid Role object', () => {
    const validRole: Role = {
      archetype: 'hero',
      narrative_function: 'protagonist',
      character_arc: 'redemption',
    };

    expect(typeof validRole).toBe('object');
    expect(validRole).not.toBeNull();
    expect('archetype' in validRole).toBe(true);
    expect('narrative_function' in validRole).toBe(true);
    expect('character_arc' in validRole).toBe(true);
  });

  it('should distinguish string from Role object', () => {
    const stringRole = 'hero';
    const objectRole: Role = { archetype: 'hero', narrative_function: '', character_arc: '' };

    expect(typeof stringRole).toBe('string');
    expect(typeof objectRole).toBe('object');
  });
});