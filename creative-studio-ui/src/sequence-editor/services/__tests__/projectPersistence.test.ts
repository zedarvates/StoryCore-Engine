/**
 * Project Persistence Service Tests
 * 
 * Tests for file-based project save/load operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  exportProjectToJSON,
  parseProjectFile,
  saveProjectToFile,
  loadProjectFromFile,
  generateProjectFilename,
  validateProjectCompatibility,
  type ProjectFile,
} from '../projectPersistence';
import type { RootState } from '../../store';

// Mock state
const mockState: RootState = {
  project: {
    metadata: {
      name: 'Test Project',
      path: '/test/project',
      created: new Date('2024-01-01'),
      modified: new Date('2024-01-02'),
      author: 'Test Author',
      description: 'Test Description',
    },
    settings: {
      resolution: { width: 1920, height: 1080 },
      format: 'mp4' as const,
      quality: 'preview' as const,
      fps: 30,
    },
    saveStatus: {
      state: 'saved' as const,
      lastSaveTime: new Date('2024-01-02'),
    },
    generationStatus: {
      state: 'idle' as const,
    },
  },
  timeline: {
    shots: [],
    tracks: [],
    playheadPosition: 0,
    zoomLevel: 1,
    selectedElements: [],
    duration: 0,
  },
  assets: {
    categories: [],
    activeCategory: 'characters',
    searchQuery: '',
  },
  panels: {
    layout: {},
    activePanel: null,
    shotConfigTarget: null,
  },
  tools: {
    activeTool: 'select' as const,
    toolSettings: {},
  },
  preview: {
    currentFrame: null,
    playbackState: 'stopped' as const,
    playbackSpeed: 1,
  },
  history: {
    undoStack: [],
    redoStack: [],
    maxStackSize: 50,
  },
};

describe('projectPersistence', () => {
  describe('exportProjectToJSON', () => {
    it('should export project state to JSON format', () => {
      const result = exportProjectToJSON(mockState);
      
      expect(result).toHaveProperty('version');
      expect(result).toHaveProperty('schema_version', '1.0');
      expect(result).toHaveProperty('project');
      expect(result).toHaveProperty('timeline');
      expect(result).toHaveProperty('assets');
      expect(result).toHaveProperty('panels');
      expect(result).toHaveProperty('tools');
    });
    
    it('should include all project metadata', () => {
      const result = exportProjectToJSON(mockState);
      
      expect(result.project.metadata.name).toBe('Test Project');
      expect(result.project.metadata.author).toBe('Test Author');
      expect(result.project.metadata.description).toBe('Test Description');
    });
    
    it('should include project settings', () => {
      const result = exportProjectToJSON(mockState);
      
      expect(result.project.settings.resolution).toEqual({ width: 1920, height: 1080 });
      expect(result.project.settings.format).toBe('mp4');
      expect(result.project.settings.fps).toBe(30);
    });
  });
  
  describe('parseProjectFile', () => {
    it('should parse valid project JSON', () => {
      const validProject: ProjectFile = {
        version: '1.0.0',
        schema_version: '1.0',
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-01-02T00:00:00.000Z',
        project: {
          ...mockState.project,
          metadata: {
            ...mockState.project.metadata,
            created: '2024-01-01T00:00:00.000Z' as any,
            modified: '2024-01-02T00:00:00.000Z' as any,
          },
          saveStatus: {
            ...mockState.project.saveStatus,
            lastSaveTime: '2024-01-02T00:00:00.000Z' as any,
          },
        } as any,
        timeline: mockState.timeline,
        assets: mockState.assets,
        panels: mockState.panels,
        tools: mockState.tools,
      };
      
      const jsonString = JSON.stringify(validProject);
      const result = parseProjectFile(jsonString);
      
      expect(result).toEqual(validProject);
    });
    
    it('should throw error for invalid JSON', () => {
      expect(() => parseProjectFile('invalid json')).toThrow('Invalid JSON format');
    });
    
    it('should throw error for missing version', () => {
      const invalidProject = {
        project: {},
        timeline: {},
        assets: {},
      };
      
      expect(() => parseProjectFile(JSON.stringify(invalidProject))).toThrow(
        'Invalid project file: missing version information'
      );
    });
    
    it('should throw error for unsupported schema version', () => {
      const invalidProject = {
        version: '1.0.0',
        schema_version: '2.0',
        project: {},
        timeline: {},
        assets: {},
      };
      
      expect(() => parseProjectFile(JSON.stringify(invalidProject))).toThrow(
        'Unsupported schema version: 2.0'
      );
    });
  });
  
  describe('generateProjectFilename', () => {
    it('should generate filename with project name and timestamp', () => {
      const filename = generateProjectFilename('My Project');
      
      expect(filename).toMatch(/^my-project-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/);
    });
    
    it('should sanitize project name', () => {
      const filename = generateProjectFilename('My Project! @#$%');
      
      expect(filename).toMatch(/^my-project-+\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/);
    });
  });
  
  describe('validateProjectCompatibility', () => {
    const validProject: ProjectFile = {
      version: '1.0.0',
      schema_version: '1.0',
      created: '2024-01-01T00:00:00.000Z',
      modified: '2024-01-02T00:00:00.000Z',
      project: mockState.project as any,
      timeline: mockState.timeline,
      assets: mockState.assets,
      panels: mockState.panels,
      tools: mockState.tools,
    };
    
    it('should validate compatible project', () => {
      const result = validateProjectCompatibility(validProject);
      
      expect(result.compatible).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should detect unsupported schema version', () => {
      const incompatibleProject = {
        ...validProject,
        schema_version: '2.0',
      };
      
      const result = validateProjectCompatibility(incompatibleProject);
      
      expect(result.compatible).toBe(false);
      expect(result.errors).toContain('Unsupported schema version: 2.0');
    });
    
    it('should detect missing sections', () => {
      const incompleteProject = {
        ...validProject,
        timeline: undefined as any,
      };
      
      const result = validateProjectCompatibility(incompleteProject);
      
      expect(result.compatible).toBe(false);
      expect(result.errors).toContain('Missing timeline section');
    });
    
    it('should warn about newer version', () => {
      const newerProject = {
        ...validProject,
        version: '2.0.0',
      };
      
      const result = validateProjectCompatibility(newerProject);
      
      expect(result.warnings).toContain('Project was created with a newer version (2.0.0)');
    });
  });
  
  describe('saveProjectToFile', () => {
    beforeEach(() => {
      // Mock DOM APIs
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();
    });
    
    it('should create download link with correct filename', () => {
      const mockClick = vi.fn();
      const mockLink = {
        href: '',
        download: '',
        click: mockClick,
      };
      
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      
      saveProjectToFile(mockState, 'test-project.json');
      
      expect(mockLink.download).toBe('test-project.json');
      expect(mockClick).toHaveBeenCalled();
    });
  });
  
  describe('loadProjectFromFile', () => {
    it('should load project from file', async () => {
      const validProject: ProjectFile = {
        version: '1.0.0',
        schema_version: '1.0',
        created: '2024-01-01T00:00:00.000Z',
        modified: '2024-01-02T00:00:00.000Z',
        project: {
          ...mockState.project,
          metadata: {
            ...mockState.project.metadata,
            created: '2024-01-01T00:00:00.000Z' as any,
            modified: '2024-01-02T00:00:00.000Z' as any,
          },
          saveStatus: {
            ...mockState.project.saveStatus,
            lastSaveTime: '2024-01-02T00:00:00.000Z' as any,
          },
        } as any,
        timeline: mockState.timeline,
        assets: mockState.assets,
        panels: mockState.panels,
        tools: mockState.tools,
      };
      
      const jsonString = JSON.stringify(validProject);
      const file = new File([jsonString], 'test.json', { type: 'application/json' });
      
      const result = await loadProjectFromFile(file);
      
      expect(result).toEqual(validProject);
    });
    
    it('should reject invalid file', async () => {
      const file = new File(['invalid json'], 'test.json', { type: 'application/json' });
      
      await expect(loadProjectFromFile(file)).rejects.toThrow();
    });
  });
});
