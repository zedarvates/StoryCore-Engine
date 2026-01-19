import { describe, it, expect } from 'vitest';
import {
  createEmptyProject,
  validateProject,
  saveProjectToJSON,
  loadProjectFromJSON,
} from '../projectManager';

describe('projectManager', () => {
  describe('createEmptyProject', () => {
    it('should create a valid empty project', () => {
      const project = createEmptyProject('Test Project');

      expect(project.schema_version).toBe('1.0');
      expect(project.project_name).toBe('Test Project');
      expect(project.shots).toEqual([]);
      expect(project.assets).toEqual([]);
      expect(project.capabilities).toEqual({
        grid_generation: true,
        promotion_engine: true,
        qa_engine: true,
        autofix_engine: true,
      });
      expect(project.generation_status).toEqual({
        grid: 'pending',
        promotion: 'pending',
      });
    });
  });

  describe('validateProject', () => {
    it('should validate a correct project', () => {
      const project = createEmptyProject('Test');
      expect(validateProject(project)).toBe(true);
    });

    it('should reject invalid projects', () => {
      expect(validateProject(null)).toBe(false);
      expect(validateProject({})).toBe(false);
      expect(validateProject({ schema_version: '1.0' })).toBe(false);
    });
  });

  describe('saveProjectToJSON and loadProjectFromJSON', () => {
    it('should serialize and deserialize a project', () => {
      const original = createEmptyProject('Test Project');
      const json = saveProjectToJSON(original);
      const loaded = loadProjectFromJSON(json);

      expect(loaded.schema_version).toBe(original.schema_version);
      expect(loaded.project_name).toBe(original.project_name);
      expect(loaded.shots).toEqual(original.shots);
      expect(loaded.assets).toEqual(original.assets);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => loadProjectFromJSON('invalid json')).toThrow();
    });

    it('should throw error for invalid project format', () => {
      expect(() => loadProjectFromJSON('{}')).toThrow('Invalid project format');
    });
  });
});
