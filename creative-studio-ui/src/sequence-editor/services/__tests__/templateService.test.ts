/**
 * Template Service Tests
 * 
 * Tests for template application, creation, and management.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  applySceneTemplate,
  applyNarrativePreset,
  createTemplateFromShots,
  createNarrativePreset,
  saveCustomTemplate,
  loadCustomTemplates,
  deleteCustomTemplate,
  saveNarrativePreset,
  loadNarrativePresets,
  deleteNarrativePreset,
  getBuiltInTemplates,
  getBuiltInPresets,
  type SceneTemplate,
  type NarrativePreset,
} from '../templateService';
import type { Shot } from '../../types';

describe('Template Service', () => {
  // Clear localStorage before each test
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('applySceneTemplate', () => {
    it('should create shots from template', () => {
      const template: SceneTemplate = {
        id: 'test-template',
        name: 'Test Template',
        description: 'Test description',
        shots: [
          {
            name: 'Shot 1',
            duration: 72,
            prompt: 'Test prompt 1',
            parameters: { denoising: 0.75 },
          },
          {
            name: 'Shot 2',
            duration: 48,
            prompt: 'Test prompt 2',
            parameters: { steps: 20 },
          },
        ],
        metadata: {
          shotCount: 2,
          totalDuration: 120,
          genre: 'test',
          complexity: 'simple',
        },
        tags: ['test'],
      };

      const shots = applySceneTemplate(template, 0);

      expect(shots).toHaveLength(2);
      expect(shots[0].name).toBe('Shot 1');
      expect(shots[0].duration).toBe(72);
      expect(shots[0].startTime).toBe(0);
      expect(shots[1].startTime).toBe(72);
    });

    it('should apply reference images from template', () => {
      const template: SceneTemplate = {
        id: 'test-template',
        name: 'Test Template',
        description: 'Test description',
        shots: [
          {
            name: 'Shot 1',
            duration: 72,
            prompt: 'Test prompt',
            parameters: {},
            referenceImages: ['image1.jpg', 'image2.jpg'],
          },
        ],
        metadata: {
          shotCount: 1,
          totalDuration: 72,
          genre: 'test',
          complexity: 'simple',
        },
        tags: [],
      };

      const shots = applySceneTemplate(template, 0);

      expect(shots[0].referenceImages).toHaveLength(2);
      expect(shots[0].referenceImages[0].url).toBe('image1.jpg');
    });
  });

  describe('applyNarrativePreset', () => {
    it('should apply preset parameters to shots', () => {
      const preset: NarrativePreset = {
        id: 'test-preset',
        name: 'Test Preset',
        description: 'Test description',
        styleParameters: {
          mood: 'cinematic',
        },
        shotDefaults: {
          denoising: 0.8,
          steps: 25,
          guidance: 8.0,
        },
        tags: [],
      };

      const shots: Shot[] = [
        {
          id: 'shot-1',
          name: 'Shot 1',
          startTime: 0,
          duration: 72,
          layers: [],
          referenceImages: [],
          prompt: 'Test prompt',
          parameters: {
            seed: 12345,
            denoising: 0.75,
            steps: 20,
            guidance: 7.5,
            sampler: 'euler_a',
            scheduler: 'normal',
          },
          generationStatus: 'pending',
        },
      ];

      const updatedShots = applyNarrativePreset(preset, shots);

      expect(updatedShots[0].parameters.denoising).toBe(0.8);
      expect(updatedShots[0].parameters.steps).toBe(25);
      expect(updatedShots[0].parameters.guidance).toBe(8.0);
      expect(updatedShots[0].prompt).toContain('cinematic mood');
    });
  });

  describe('createTemplateFromShots', () => {
    it('should create template from shots', () => {
      const shots: Shot[] = [
        {
          id: 'shot-1',
          name: 'Shot 1',
          startTime: 0,
          duration: 72,
          layers: [],
          referenceImages: [],
          prompt: 'Test prompt 1',
          parameters: {
            seed: 12345,
            denoising: 0.75,
            steps: 20,
            guidance: 7.5,
            sampler: 'euler_a',
            scheduler: 'normal',
          },
          generationStatus: 'pending',
        },
        {
          id: 'shot-2',
          name: 'Shot 2',
          startTime: 72,
          duration: 48,
          layers: [],
          referenceImages: [],
          prompt: 'Test prompt 2',
          parameters: {
            seed: 67890,
            denoising: 0.7,
            steps: 25,
            guidance: 8.0,
            sampler: 'euler_a',
            scheduler: 'normal',
          },
          generationStatus: 'pending',
        },
      ];

      const template = createTemplateFromShots(
        shots,
        'Test Template',
        'Test description',
        'test',
        ['tag1', 'tag2']
      );

      expect(template.name).toBe('Test Template');
      expect(template.shots).toHaveLength(2);
      expect(template.metadata.shotCount).toBe(2);
      expect(template.metadata.totalDuration).toBe(120);
      expect(template.tags).toEqual(['tag1', 'tag2']);
    });

    it('should determine complexity based on shot count', () => {
      const createShots = (count: number): Shot[] => {
        return Array.from({ length: count }, (_, i) => ({
          id: `shot-${i}`,
          name: `Shot ${i}`,
          startTime: i * 72,
          duration: 72,
          layers: [],
          referenceImages: [],
          prompt: `Prompt ${i}`,
          parameters: {
            seed: 12345,
            denoising: 0.75,
            steps: 20,
            guidance: 7.5,
            sampler: 'euler_a',
            scheduler: 'normal',
          },
          generationStatus: 'pending',
        }));
      };

      const simpleTemplate = createTemplateFromShots(
        createShots(3),
        'Simple',
        'Description',
        'test'
      );
      expect(simpleTemplate.metadata.complexity).toBe('simple');

      const moderateTemplate = createTemplateFromShots(
        createShots(7),
        'Moderate',
        'Description',
        'test'
      );
      expect(moderateTemplate.metadata.complexity).toBe('moderate');

      const complexTemplate = createTemplateFromShots(
        createShots(12),
        'Complex',
        'Description',
        'test'
      );
      expect(complexTemplate.metadata.complexity).toBe('complex');
    });
  });

  describe('createNarrativePreset', () => {
    it('should create narrative preset', () => {
      const preset = createNarrativePreset(
        'Test Preset',
        'Test description',
        {
          mood: 'cinematic',
          colorPalette: ['#FF0000', '#00FF00'],
        },
        {
          denoising: 0.8,
          steps: 25,
        },
        ['tag1', 'tag2']
      );

      expect(preset.name).toBe('Test Preset');
      expect(preset.styleParameters.mood).toBe('cinematic');
      expect(preset.shotDefaults.denoising).toBe(0.8);
      expect(preset.tags).toEqual(['tag1', 'tag2']);
    });
  });

  describe('Template Storage', () => {
    it('should save and load custom templates', () => {
      const template: SceneTemplate = {
        id: 'test-template',
        name: 'Test Template',
        description: 'Test description',
        shots: [],
        metadata: {
          shotCount: 0,
          totalDuration: 0,
          genre: 'test',
          complexity: 'simple',
        },
        tags: [],
      };

      saveCustomTemplate(template);
      const loaded = loadCustomTemplates();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('test-template');
    });

    it('should update existing template', () => {
      const template: SceneTemplate = {
        id: 'test-template',
        name: 'Test Template',
        description: 'Test description',
        shots: [],
        metadata: {
          shotCount: 0,
          totalDuration: 0,
          genre: 'test',
          complexity: 'simple',
        },
        tags: [],
      };

      saveCustomTemplate(template);
      
      const updatedTemplate = { ...template, name: 'Updated Template' };
      saveCustomTemplate(updatedTemplate);

      const loaded = loadCustomTemplates();
      expect(loaded).toHaveLength(1);
      expect(loaded[0].name).toBe('Updated Template');
    });

    it('should delete custom template', () => {
      const template: SceneTemplate = {
        id: 'test-template',
        name: 'Test Template',
        description: 'Test description',
        shots: [],
        metadata: {
          shotCount: 0,
          totalDuration: 0,
          genre: 'test',
          complexity: 'simple',
        },
        tags: [],
      };

      saveCustomTemplate(template);
      deleteCustomTemplate('test-template');

      const loaded = loadCustomTemplates();
      expect(loaded).toHaveLength(0);
    });
  });

  describe('Preset Storage', () => {
    it('should save and load narrative presets', () => {
      const preset: NarrativePreset = {
        id: 'test-preset',
        name: 'Test Preset',
        description: 'Test description',
        styleParameters: {},
        shotDefaults: {},
        tags: [],
      };

      saveNarrativePreset(preset);
      const loaded = loadNarrativePresets();

      expect(loaded).toHaveLength(1);
      expect(loaded[0].id).toBe('test-preset');
    });

    it('should delete narrative preset', () => {
      const preset: NarrativePreset = {
        id: 'test-preset',
        name: 'Test Preset',
        description: 'Test description',
        styleParameters: {},
        shotDefaults: {},
        tags: [],
      };

      saveNarrativePreset(preset);
      deleteNarrativePreset('test-preset');

      const loaded = loadNarrativePresets();
      expect(loaded).toHaveLength(0);
    });
  });

  describe('Built-in Templates and Presets', () => {
    it('should return built-in templates', () => {
      const templates = getBuiltInTemplates();
      expect(templates.length).toBeGreaterThan(0);
      expect(templates[0]).toHaveProperty('id');
      expect(templates[0]).toHaveProperty('name');
      expect(templates[0]).toHaveProperty('shots');
    });

    it('should return built-in presets', () => {
      const presets = getBuiltInPresets();
      expect(presets.length).toBeGreaterThan(0);
      expect(presets[0]).toHaveProperty('id');
      expect(presets[0]).toHaveProperty('name');
      expect(presets[0]).toHaveProperty('styleParameters');
    });
  });
});
