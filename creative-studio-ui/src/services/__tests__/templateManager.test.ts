/**
 * Test Suite: Template Manager Service
 * Tests the TemplateManager for Production Wizards template operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TemplateManager } from '../templateManager';
import type { ShotTemplate } from '@/types/template';

// Mock localStorage for testing
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('TemplateManager', () => {
  let manager: TemplateManager;

  beforeEach(() => {
    manager = new TemplateManager();
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
  });

  describe('Sequence Template Operations', () => {
    it('should return all sequence templates including built-in', () => {
      const templates = manager.getAllSequenceTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.isBuiltIn)).toBe(true);
    });

    it('should get sequence template by ID', () => {
      const template = manager.getSequenceTemplate('3-act-narrative');

      expect(template).toBeDefined();
      expect(template?.id).toBe('3-act-narrative');
      expect(template?.isBuiltIn).toBe(true);
    });

    it('should return undefined for non-existent template', () => {
      const template = manager.getSequenceTemplate('non-existent');

      expect(template).toBeUndefined();
    });

    it('should get templates by category', () => {
      const narrativeTemplates = manager.getSequenceTemplatesByCategory('narrative');

      expect(narrativeTemplates.length).toBeGreaterThan(0);
      expect(narrativeTemplates.every(t => t.category === 'narrative')).toBe(true);
    });

    it('should create a custom sequence template', async () => {
      const newTemplate = {
        name: 'Custom Template',
        description: 'A custom template for testing',
        category: 'narrative' as const,
        structure: {
          acts: [{
            number: 1,
            title: 'Act 1',
            description: 'First act',
            targetDuration: 60,
            narrativePurpose: 'Setup',
          }],
          defaultSceneCount: 3,
          defaultShotCount: 10,
        },
        defaults: {
          frameRate: 30,
          resolution: { width: 1920, height: 1080 },
          targetDuration: 120,
        },
        tags: ['custom'],
      };

      const created = await manager.createSequenceTemplate(newTemplate);

      expect(created.id).toBeDefined();
      expect(created.name).toBe('Custom Template');
      expect(created.isBuiltIn).toBe(false);
    });

    it('should update a custom sequence template', async () => {
      // First create a template
      const newTemplate = {
        name: 'Test Template',
        description: 'Test description',
        category: 'narrative' as const,
        structure: {
          acts: [{
            number: 1,
            title: 'Act 1',
            description: 'First act',
            targetDuration: 60,
            narrativePurpose: 'Setup',
          }],
          defaultSceneCount: 3,
          defaultShotCount: 10,
        },
        defaults: {
          frameRate: 30,
          resolution: { width: 1920, height: 1080 },
          targetDuration: 120,
        },
        tags: ['test'],
      };

      const created = await manager.createSequenceTemplate(newTemplate);

      // Now update it
      const updated = await manager.updateSequenceTemplate(created.id, {
        name: 'Updated Template',
      });

      expect(updated.name).toBe('Updated Template');
      expect(updated.id).toBe(created.id);
    });

    it('should delete a custom sequence template', async () => {
      // Create a template
      const newTemplate = {
        name: 'Delete Test',
        description: 'Template to delete',
        category: 'narrative' as const,
        structure: {
          acts: [{
            number: 1,
            title: 'Act 1',
            description: 'First act',
            targetDuration: 60,
            narrativePurpose: 'Setup',
          }],
          defaultSceneCount: 1,
          defaultShotCount: 5,
        },
        defaults: {
          frameRate: 30,
          resolution: { width: 1920, height: 1080 },
          targetDuration: 60,
        },
        tags: ['delete-test'],
      };

      const created = await manager.createSequenceTemplate(newTemplate);

      // Delete it
      await manager.deleteSequenceTemplate(created.id);

      // Verify it's gone
      const retrieved = manager.getSequenceTemplate(created.id);
      expect(retrieved).toBeUndefined();
    });

    it('should prevent modification of built-in templates', async () => {
      await expect(
        manager.updateSequenceTemplate('3-act-narrative', { name: 'Modified' })
      ).rejects.toThrow('Cannot modify built-in templates');
    });

    it('should prevent deletion of built-in templates', async () => {
      await expect(
        manager.deleteSequenceTemplate('3-act-narrative')
      ).rejects.toThrow('Cannot delete built-in templates');
    });
  });

  describe('Shot Template Operations', () => {
    it('should return all shot templates including built-in', () => {
      const templates = manager.getAllShotTemplates();

      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.isBuiltIn)).toBe(true);
    });

    it('should get shot template by ID', () => {
      const template = manager.getShotTemplate('establishing-wide');

      expect(template).toBeDefined();
      expect(template?.id).toBe('establishing-wide');
      expect(template?.category).toBe('establishing');
    });

    it('should create a custom shot template', async () => {
      const newTemplate = {
        name: 'Custom Shot',
        description: 'A custom shot template',
        category: 'action',
        configuration: {
          type: 'wide' as const,
          category: 'action' as const,
          camera: {
            framing: 'wide' as const,
            angle: 'eye-level' as const,
            movement: { type: 'static' as const },
          },
          timing: {
            duration: 60,
            inPoint: 0,
            outPoint: 60,
            transition: 'cut' as const,
            transitionDuration: 0,
          },
          composition: {
            characterIds: [],
            characterPositions: [],
            environmentId: '',
            props: [],
            lightingMood: 'dramatic',
            timeOfDay: 'day',
          },
        },
        tags: ['custom'],
      } as Omit<ShotTemplate, 'id' | 'isBuiltIn'>;

      const created = await manager.createShotTemplate(newTemplate);

      expect(created.id).toBeDefined();
      expect(created.name).toBe('Custom Shot');
      expect(created.isBuiltIn).toBe(false);
    });
  });

  describe('Generation Preset Operations', () => {
    it('should return all generation presets including built-in', () => {
      const presets = manager.getAllGenerationPresets();

      expect(presets.length).toBeGreaterThan(0);
      expect(presets.some(p => p.isBuiltIn)).toBe(true);
    });

    it('should get generation preset by ID', () => {
      const preset = manager.getGenerationPreset('quality-balanced');

      expect(preset).toBeDefined();
      expect(preset?.id).toBe('quality-balanced');
      expect(preset?.category).toBe('quality');
    });

    it('should get presets by category', () => {
      const qualityPresets = manager.getGenerationPresetsByCategory('quality');

      expect(qualityPresets.length).toBeGreaterThan(0);
      expect(qualityPresets.every(p => p.category === 'quality')).toBe(true);
    });

    it('should create a custom generation preset', async () => {
      const newPreset = {
        name: 'Custom Preset',
        description: 'A custom generation preset',
        category: 'style' as const,
        parameters: {
          width: 1920,
          height: 1080,
          steps: 20,
          cfgScale: 8,
          sampler: 'Euler a',
          scheduler: 'normal',
        },
        estimatedTime: 60,
        qualityScore: 7,
      };

      const created = await manager.createGenerationPreset(newPreset);

      expect(created.id).toBeDefined();
      expect(created.name).toBe('Custom Preset');
      expect(created.isBuiltIn).toBe(false);
    });
  });

  describe('Template Validation', () => {
    it('should validate sequence template with required fields', () => {
      const invalidTemplate = {
        name: '',
        description: 'Test',
        category: 'narrative' as const,
      };

      const result = manager.validateSequenceTemplate(invalidTemplate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    it('should validate sequence template successfully', () => {
      const validTemplate = {
        name: 'Valid Template',
        description: 'A valid template',
        category: 'narrative' as const,
        structure: {
          acts: [{
            number: 1,
            title: 'Act 1',
            description: 'First act',
            targetDuration: 60,
            narrativePurpose: 'Setup',
          }],
          defaultSceneCount: 3,
          defaultShotCount: 10,
        },
        defaults: {
          frameRate: 30,
          resolution: { width: 1920, height: 1080 },
          targetDuration: 120,
        },
      };

      const result = manager.validateSequenceTemplate(validTemplate);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate shot template', () => {
      const invalidTemplate = {
        name: '',
        description: 'Test',
        category: 'action' as const,
      };

      const result = manager.validateShotTemplate(invalidTemplate);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });

    it('should validate generation preset', () => {
      const invalidPreset = {
        name: '',
        description: 'Test',
        category: 'quality' as const,
      };

      const result = manager.validateGenerationPreset(invalidPreset);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Name is required');
    });
  });

  describe('Import/Export Operations', () => {
    it('should export templates', () => {
      const exportData = manager.exportTemplates();

      expect(exportData).toHaveProperty('version');
      expect(exportData).toHaveProperty('exportDate');
      expect(exportData).toHaveProperty('sequenceTemplates');
      expect(exportData).toHaveProperty('shotTemplates');
      expect(exportData).toHaveProperty('generationPresets');
      expect(exportData).toHaveProperty('assetTemplates');
      expect(Array.isArray(exportData.sequenceTemplates)).toBe(true);
    });

    it('should import templates successfully', async () => {
      const importData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        sequenceTemplates: [],
        shotTemplates: [],
        generationPresets: [],
        assetTemplates: [],
      };

      const result = await manager.importTemplates(importData);

      expect(result.success).toBe(true);
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should handle import errors gracefully', async () => {
      const importData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        sequenceTemplates: [{
          id: 'test-invalid',
          name: '', // Invalid - missing name
          description: 'Invalid template',
          category: 'narrative' as const,
          isBuiltIn: false,
          structure: {
            acts: [],
            defaultSceneCount: 1,
            defaultShotCount: 1,
          },
          defaults: {
            frameRate: 30,
            resolution: { width: 1920, height: 1080 },
            targetDuration: 60,
          },
          tags: [],
        }],
        shotTemplates: [],
        generationPresets: [],
        assetTemplates: [],
      };

      const result = await manager.importTemplates(importData);

      expect(result.success).toBe(false);
      expect(result.imported).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
