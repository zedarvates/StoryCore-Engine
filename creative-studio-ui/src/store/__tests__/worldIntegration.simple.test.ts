import { describe, it, expect, beforeEach } from 'vitest';
import type { World } from '@/types/world';

// Simple tests for world data structure and validation
describe('World Data Integration', () => {
  let testWorld: World;

  beforeEach(() => {
    testWorld = {
      id: 'world-1',
      name: 'Eldoria',
      genre: ['fantasy'],
      timePeriod: 'Medieval',
      tone: ['epic', 'dark'],
      locations: [
        {
          id: 'loc-1',
          name: 'The Capital',
          description: 'A grand city',
          significance: 'Center of power',
          atmosphere: 'Bustling and political',
        },
      ],
      rules: [
        {
          id: 'rule-1',
          category: 'magical',
          rule: 'Magic requires sacrifice',
          implications: 'Mages are feared and respected',
        },
      ],
      atmosphere: 'Mystical and dangerous',
      culturalElements: {
        languages: ['Eldorian', 'Old Tongue'],
        religions: ['The Old Gods'],
        traditions: ['Festival of Lights'],
        historicalEvents: ['The Great War'],
        culturalConflicts: ['Mages vs Non-mages'],
      },
      technology: 'Medieval with some magical enhancements',
      magic: 'Elemental magic system',
      conflicts: ['War of the Five Kingdoms'],
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };
  });

  describe('World Data Structure', () => {
    it('should have all required fields', () => {
      expect(testWorld.id).toBeDefined();
      expect(testWorld.name).toBeDefined();
      expect(testWorld.genre).toBeDefined();
      expect(testWorld.timePeriod).toBeDefined();
      expect(testWorld.tone).toBeDefined();
      expect(testWorld.locations).toBeDefined();
      expect(testWorld.rules).toBeDefined();
      expect(testWorld.atmosphere).toBeDefined();
      expect(testWorld.culturalElements).toBeDefined();
      expect(testWorld.technology).toBeDefined();
      expect(testWorld.magic).toBeDefined();
      expect(testWorld.conflicts).toBeDefined();
      expect(testWorld.createdAt).toBeDefined();
      expect(testWorld.updatedAt).toBeDefined();
    });

    it('should have valid genre array', () => {
      expect(Array.isArray(testWorld.genre)).toBe(true);
      expect(testWorld.genre.length).toBeGreaterThan(0);
    });

    it('should have valid tone array', () => {
      expect(Array.isArray(testWorld.tone)).toBe(true);
      expect(testWorld.tone.length).toBeGreaterThan(0);
    });

    it('should have valid locations array', () => {
      expect(Array.isArray(testWorld.locations)).toBe(true);
      testWorld.locations.forEach((location) => {
        expect(location.id).toBeDefined();
        expect(location.name).toBeDefined();
        expect(location.description).toBeDefined();
      });
    });

    it('should have valid rules array', () => {
      expect(Array.isArray(testWorld.rules)).toBe(true);
      testWorld.rules.forEach((rule) => {
        expect(rule.id).toBeDefined();
        expect(rule.category).toBeDefined();
        expect(rule.rule).toBeDefined();
        expect(['physical', 'social', 'magical', 'technological']).toContain(
          rule.category
        );
      });
    });

    it('should have valid cultural elements', () => {
      expect(testWorld.culturalElements).toBeDefined();
      expect(Array.isArray(testWorld.culturalElements.languages)).toBe(true);
      expect(Array.isArray(testWorld.culturalElements.religions)).toBe(true);
      expect(Array.isArray(testWorld.culturalElements.traditions)).toBe(true);
      expect(Array.isArray(testWorld.culturalElements.historicalEvents)).toBe(true);
      expect(Array.isArray(testWorld.culturalElements.culturalConflicts)).toBe(true);
    });
  });

  describe('World Serialization', () => {
    it('should serialize to JSON correctly', () => {
      const json = JSON.stringify(testWorld);
      expect(json).toBeDefined();
      expect(json.length).toBeGreaterThan(0);
    });

    it('should deserialize from JSON correctly', () => {
      const json = JSON.stringify(testWorld);
      const parsed = JSON.parse(json);
      
      expect(parsed.id).toBe(testWorld.id);
      expect(parsed.name).toBe(testWorld.name);
      expect(parsed.genre).toEqual(testWorld.genre);
      expect(parsed.locations).toHaveLength(testWorld.locations.length);
    });

    it('should handle date serialization', () => {
      const json = JSON.stringify(testWorld);
      const parsed = JSON.parse(json);
      
      // Dates are serialized as strings
      expect(typeof parsed.createdAt).toBe('string');
      expect(typeof parsed.updatedAt).toBe('string');
      
      // Can be converted back to Date
      const createdAt = new Date(parsed.createdAt);
      expect(createdAt).toBeInstanceOf(Date);
      expect(createdAt.getTime()).toBe(testWorld.createdAt.getTime());
    });
  });

  describe('World Validation', () => {
    it('should validate required fields', () => {
      const isValid =
        testWorld.name.trim() !== '' &&
        testWorld.genre.length > 0 &&
        testWorld.tone.length > 0 &&
        testWorld.timePeriod.trim() !== '';
      
      expect(isValid).toBe(true);
    });

    it('should detect missing required fields', () => {
      const invalidWorld = { ...testWorld, name: '' };
      const isValid = invalidWorld.name.trim() !== '';
      expect(isValid).toBe(false);
    });

    it('should detect empty genre array', () => {
      const invalidWorld = { ...testWorld, genre: [] };
      const isValid = invalidWorld.genre.length > 0;
      expect(isValid).toBe(false);
    });
  });

  describe('World Updates', () => {
    it('should update world properties', () => {
      const updated = {
        ...testWorld,
        name: 'New Eldoria',
        updatedAt: new Date(),
      };
      
      expect(updated.name).toBe('New Eldoria');
      expect(updated.updatedAt.getTime()).toBeGreaterThan(testWorld.updatedAt.getTime());
    });

    it('should preserve other properties when updating', () => {
      const updated = {
        ...testWorld,
        atmosphere: 'Bright and hopeful',
      };
      
      expect(updated.atmosphere).toBe('Bright and hopeful');
      expect(updated.name).toBe(testWorld.name);
      expect(updated.genre).toEqual(testWorld.genre);
    });
  });

  describe('LocalStorage Compatibility', () => {
    it('should be compatible with localStorage format', () => {
      const worlds = [testWorld];
      const stored = JSON.stringify(worlds);
      
      // Simulate localStorage
      const retrieved = JSON.parse(stored);
      
      expect(Array.isArray(retrieved)).toBe(true);
      expect(retrieved).toHaveLength(1);
      expect(retrieved[0].id).toBe(testWorld.id);
    });

    it('should handle multiple worlds in storage', () => {
      const world2: World = {
        ...testWorld,
        id: 'world-2',
        name: 'Cyberpunk City',
        genre: ['sci-fi', 'cyberpunk'],
      };
      
      const worlds = [testWorld, world2];
      const stored = JSON.stringify(worlds);
      const retrieved = JSON.parse(stored);
      
      expect(retrieved).toHaveLength(2);
      expect(retrieved[0].id).toBe('world-1');
      expect(retrieved[1].id).toBe('world-2');
    });
  });
});
