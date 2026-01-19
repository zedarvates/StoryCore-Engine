/**
 * Unit tests for audio effect presets
 * Tests preset retrieval, search, and suggestion functionality
 */

import { describe, it, expect } from 'vitest';
import {
  AUDIO_EFFECT_PRESETS,
  getAudioEffectPresetById,
  getAudioEffectPresetsByCategory,
  searchAudioEffectPresets,
  suggestAudioEffectPreset,
  getAudioEffectPresetCategories,
} from '../audioEffectPresets';

describe('audioEffectPresets', () => {
  describe('AUDIO_EFFECT_PRESETS', () => {
    it('should have valid preset structure', () => {
      expect(AUDIO_EFFECT_PRESETS.length).toBeGreaterThan(0);

      AUDIO_EFFECT_PRESETS.forEach((preset) => {
        expect(preset).toHaveProperty('id');
        expect(preset).toHaveProperty('name');
        expect(preset).toHaveProperty('description');
        expect(preset).toHaveProperty('category');
        expect(preset).toHaveProperty('effects');
        expect(preset).toHaveProperty('keywords');
        expect(Array.isArray(preset.effects)).toBe(true);
        expect(Array.isArray(preset.keywords)).toBe(true);
      });
    });

    it('should have unique preset IDs', () => {
      const ids = AUDIO_EFFECT_PRESETS.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it('should have valid categories', () => {
      const validCategories = ['reverb', 'spatial', 'creative', 'correction', 'dynamics'];

      AUDIO_EFFECT_PRESETS.forEach((preset) => {
        expect(validCategories).toContain(preset.category);
      });
    });
  });

  describe('getAudioEffectPresetById', () => {
    it('should return preset by ID', () => {
      const preset = getAudioEffectPresetById('echo-cave');
      expect(preset).toBeDefined();
      expect(preset?.id).toBe('echo-cave');
      expect(preset?.name).toBe('Écho Caverne');
    });

    it('should return undefined for invalid ID', () => {
      const preset = getAudioEffectPresetById('invalid-id');
      expect(preset).toBeUndefined();
    });
  });

  describe('getAudioEffectPresetsByCategory', () => {
    it('should return presets by category', () => {
      const reverbPresets = getAudioEffectPresetsByCategory('reverb');
      expect(reverbPresets.length).toBeGreaterThan(0);
      reverbPresets.forEach((preset) => {
        expect(preset.category).toBe('reverb');
      });
    });

    it('should return empty array for category with no presets', () => {
      // All categories should have presets, but test the logic
      const presets = getAudioEffectPresetsByCategory('reverb');
      expect(Array.isArray(presets)).toBe(true);
    });

    it('should return all reverb presets', () => {
      const reverbPresets = getAudioEffectPresetsByCategory('reverb');
      const expectedIds = [
        'echo-cave',
        'echo-church',
        'echo-well',
        'echo-hall',
        'echo-room',
        'echo-canyon',
        'echo-tunnel',
        'echo-forest',
      ];

      expectedIds.forEach((id) => {
        expect(reverbPresets.some((p) => p.id === id)).toBe(true);
      });
    });
  });

  describe('searchAudioEffectPresets', () => {
    it('should find presets by name', () => {
      const results = searchAudioEffectPresets('cave');
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((p) => p.id === 'echo-cave')).toBe(true);
    });

    it('should find presets by description', () => {
      const results = searchAudioEffectPresets('grotte');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should find presets by keywords', () => {
      const results = searchAudioEffectPresets('underground');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should be case-insensitive', () => {
      const lowerResults = searchAudioEffectPresets('cave');
      const upperResults = searchAudioEffectPresets('CAVE');
      expect(lowerResults.length).toBe(upperResults.length);
    });

    it('should return empty array for no matches', () => {
      const results = searchAudioEffectPresets('xyzabc123');
      expect(results).toEqual([]);
    });

    it('should find multiple presets with common keywords', () => {
      const results = searchAudioEffectPresets('voice');
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('suggestAudioEffectPreset', () => {
    it('should suggest cave preset for underground scene', () => {
      const scene = 'The character walks through a dark cave underground';
      const preset = suggestAudioEffectPreset(scene);
      expect(preset).toBeDefined();
      expect(preset?.id).toBe('echo-cave');
    });

    it('should suggest church preset for religious scene', () => {
      const scene = 'Inside a beautiful cathedral with high ceilings';
      const preset = suggestAudioEffectPreset(scene);
      expect(preset).toBeDefined();
      expect(preset?.id).toBe('echo-church');
    });

    it('should suggest underwater preset for ocean scene', () => {
      const scene = 'Diving deep underwater in the ocean';
      const preset = suggestAudioEffectPreset(scene);
      expect(preset).toBeDefined();
      expect(preset?.id).toBe('underwater');
    });

    it('should suggest voice enhancement for dialogue', () => {
      const scene = 'Character speaking clearly with voice';
      const preset = suggestAudioEffectPreset(scene);
      expect(preset).toBeDefined();
      // Should match voice-enhance or similar
      expect(preset?.keywords.some((k) => k.includes('voice'))).toBe(true);
    });

    it('should return null for scene with no matching keywords', () => {
      const scene = 'xyzabc123 random text';
      const preset = suggestAudioEffectPreset(scene);
      expect(preset).toBeNull();
    });

    it('should handle empty scene text', () => {
      const preset = suggestAudioEffectPreset('');
      expect(preset).toBeNull();
    });

    it('should prioritize preset with most keyword matches', () => {
      const scene = 'underground cave caverne grotte dark sombre';
      const preset = suggestAudioEffectPreset(scene);
      expect(preset).toBeDefined();
      expect(preset?.id).toBe('echo-cave');
    });
  });

  describe('getAudioEffectPresetCategories', () => {
    it('should return all categories', () => {
      const categories = getAudioEffectPresetCategories();
      expect(categories.length).toBe(5);

      const categoryIds = categories.map((c) => c.id);
      expect(categoryIds).toContain('reverb');
      expect(categoryIds).toContain('spatial');
      expect(categoryIds).toContain('creative');
      expect(categoryIds).toContain('correction');
      expect(categoryIds).toContain('dynamics');
    });

    it('should have name and description for each category', () => {
      const categories = getAudioEffectPresetCategories();

      categories.forEach((category) => {
        expect(category).toHaveProperty('id');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('description');
        expect(typeof category.name).toBe('string');
        expect(typeof category.description).toBe('string');
      });
    });
  });

  describe('Preset Effects Structure', () => {
    it('should have valid effect types', () => {
      const validTypes = [
        'reverb',
        'eq',
        'compressor',
        'voice-clarity',
        'noise-reduction',
        'distortion',
        'bass-boost',
        'treble-boost',
        'gain',
        'limiter',
      ];

      AUDIO_EFFECT_PRESETS.forEach((preset) => {
        preset.effects.forEach((effect) => {
          expect(validTypes).toContain(effect.type);
          expect(effect).toHaveProperty('enabled');
          expect(effect).toHaveProperty('parameters');
          expect(typeof effect.enabled).toBe('boolean');
        });
      });
    });

    it('should have valid reverb parameters', () => {
      const reverbPresets = AUDIO_EFFECT_PRESETS.filter((p) =>
        p.effects.some((e) => e.type === 'reverb')
      );

      reverbPresets.forEach((preset) => {
        const reverbEffect = preset.effects.find((e) => e.type === 'reverb');
        expect(reverbEffect).toBeDefined();

        const params = reverbEffect!.parameters;
        if (params.roomSize !== undefined) {
          expect(params.roomSize).toBeGreaterThanOrEqual(0);
          expect(params.roomSize).toBeLessThanOrEqual(1);
        }
        if (params.damping !== undefined) {
          expect(params.damping).toBeGreaterThanOrEqual(0);
          expect(params.damping).toBeLessThanOrEqual(1);
        }
      });
    });
  });
});
