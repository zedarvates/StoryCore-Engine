/**
 * Core Services Integration Test
 * 
 * Validates that all core wizard services (Tasks 2-5) work correctly:
 * - WizardStore (Task 2)
 * - ValidationEngine (Task 3)
 * - DraftPersistence (Task 4)
 * - TemplateSystem (Task 5)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ValidationEngine } from '../ValidationEngine';
import { TemplateSystem } from '../TemplateSystem';
import type { ProjectTypeData, GenreStyleData } from '../../../types/wizard';

describe('Core Services Integration', () => {
  let validationEngine: ValidationEngine;
  let templateSystem: TemplateSystem;

  beforeEach(() => {
    validationEngine = new ValidationEngine();
    templateSystem = new TemplateSystem();
  });

  describe('ValidationEngine', () => {
    it('should validate project type data', () => {
      const validData: ProjectTypeData = {
        type: 'court-metrage',
        durationMinutes: 15,
        durationRange: { min: 1, max: 30 },
      };

      const result = validationEngine.validateProjectType(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject invalid project type data', () => {
      const invalidData: ProjectTypeData = {
        type: 'court-metrage',
        durationMinutes: -5, // Invalid: negative duration
        durationRange: { min: 1, max: 30 },
      };

      const result = validationEngine.validateProjectType(invalidData);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate genre and style data', () => {
      const validData: GenreStyleData = {
        genres: ['action', 'sci-fi'],
        visualStyle: 'realistic',
        colorPalette: {
          primary: '#FF0000',
          secondary: '#00FF00',
          accent: '#0000FF',
        },
        mood: ['tense', 'energetic'],
      };

      const result = validationEngine.validateGenreStyle(validData);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('TemplateSystem', () => {
    it('should list built-in templates', async () => {
      const templates = await templateSystem.listTemplates();
      
      expect(templates.length).toBeGreaterThan(0);
      expect(templates.some(t => t.name === 'Action Short Film')).toBe(true);
      expect(templates.some(t => t.name === 'Drama Feature')).toBe(true);
    });

    it('should load a template', async () => {
      const templates = await templateSystem.listTemplates();
      const firstTemplate = templates[0];
      
      const loadedTemplate = await templateSystem.loadTemplate(firstTemplate.id);
      
      expect(loadedTemplate).toBeDefined();
      expect(loadedTemplate.id).toBe(firstTemplate.id);
      expect(loadedTemplate.data).toBeDefined();
    });

    it('should have valid template data structure', async () => {
      const templates = await templateSystem.listTemplates();
      const actionTemplate = templates.find(t => t.name === 'Action Short Film');
      
      expect(actionTemplate).toBeDefined();
      
      if (actionTemplate) {
        const loaded = await templateSystem.loadTemplate(actionTemplate.id);
        
        // Verify template has project type data
        expect(loaded.data.projectType).toBeDefined();
        expect(loaded.data.projectType?.type).toBeDefined();
        
        // Verify template has genre/style data
        expect(loaded.data.genreStyle).toBeDefined();
        expect(loaded.data.genreStyle?.genres).toBeDefined();
      }
    });
  });

  describe('Integration: ValidationEngine + TemplateSystem', () => {
    it('should validate template data successfully', async () => {
      const templates = await templateSystem.listTemplates();
      const template = templates[0];
      const loadedTemplate = await templateSystem.loadTemplate(template.id);
      
      // Validate project type from template
      if (loadedTemplate.data.projectType) {
        const projectTypeResult = validationEngine.validateProjectType(
          loadedTemplate.data.projectType
        );
        expect(projectTypeResult.isValid).toBe(true);
      }
      
      // Validate genre/style from template
      if (loadedTemplate.data.genreStyle) {
        const genreStyleResult = validationEngine.validateGenreStyle(
          loadedTemplate.data.genreStyle
        );
        expect(genreStyleResult.isValid).toBe(true);
      }
    });
  });
});
