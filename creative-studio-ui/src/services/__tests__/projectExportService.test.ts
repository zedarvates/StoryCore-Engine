/**
 * Tests for Project Export Service
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  exportProject,
  exportProjectToJSON,
  downloadProjectJSON,
  validateProjectForExport,
  importProjectFromJSON,
} from '../projectExportService';
import type { Shot, Asset, Project } from '@/types';

describe('projectExportService', () => {
  let mockShots: Shot[];
  let mockAssets: Asset[];

  beforeEach(() => {
    mockShots = [
      {
        id: 'shot-1',
        title: 'Opening Scene',
        description: 'A beautiful sunrise',
        duration: 5,
        position: 0,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
      },
      {
        id: 'shot-2',
        title: 'Middle Scene',
        description: 'Action sequence',
        duration: 10,
        position: 1,
        audioTracks: [],
        effects: [],
        textLayers: [],
        animations: [],
        transitionOut: {
          id: 'trans-1',
          type: 'fade',
          duration: 1,
        },
      },
    ];

    mockAssets = [
      {
        id: 'asset-1',
        name: 'Background Music',
        type: 'audio',
        url: '/assets/music.mp3',
      },
      {
        id: 'asset-2',
        name: 'Logo',
        type: 'image',
        url: '/assets/logo.png',
      },
    ];
  });

  describe('exportProject', () => {
    it('should export project with correct schema version', () => {
      const project = exportProject('Test Project', mockShots, mockAssets);
      
      expect(project.schema_version).toBe('1.0');
    });

    it('should export project with correct project name', () => {
      const project = exportProject('My Video Project', mockShots, mockAssets);
      
      expect(project.project_name).toBe('My Video Project');
    });

    it('should export shots sorted by position', () => {
      const unsortedShots = [mockShots[1], mockShots[0]];
      const project = exportProject('Test', unsortedShots, mockAssets);
      
      expect(project.shots[0].id).toBe('shot-1');
      expect(project.shots[1].id).toBe('shot-2');
    });

    it('should export all assets', () => {
      const project = exportProject('Test', mockShots, mockAssets);
      
      expect(project.assets).toHaveLength(2);
      expect(project.assets[0].id).toBe('asset-1');
      expect(project.assets[1].id).toBe('asset-2');
    });

    it('should set all capabilities to true', () => {
      const project = exportProject('Test', mockShots, mockAssets);
      
      expect(project.capabilities.grid_generation).toBe(true);
      expect(project.capabilities.promotion_engine).toBe(true);
      expect(project.capabilities.qa_engine).toBe(true);
      expect(project.capabilities.autofix_engine).toBe(true);
    });

    it('should set generation status to pending', () => {
      const project = exportProject('Test', mockShots, mockAssets);
      
      expect(project.generation_status.grid).toBe('pending');
      expect(project.generation_status.promotion).toBe('pending');
    });

    it('should include metadata with export timestamp', () => {
      const project = exportProject('Test', mockShots, mockAssets);
      
      expect(project.metadata).toBeDefined();
      expect(project.metadata?.exported_at).toBeDefined();
      expect(typeof project.metadata?.exported_at).toBe('string');
    });

    it('should calculate total duration correctly', () => {
      const project = exportProject('Test', mockShots, mockAssets);
      
      // shot-1: 5s, shot-2: 10s + 1s transition = 16s total
      expect(project.metadata?.total_duration).toBe(16);
    });

    it('should include shot count in metadata', () => {
      const project = exportProject('Test', mockShots, mockAssets);
      
      expect(project.metadata?.shot_count).toBe(2);
    });

    it('should include asset count in metadata', () => {
      const project = exportProject('Test', mockShots, mockAssets);
      
      expect(project.metadata?.asset_count).toBe(2);
    });

    it('should handle empty assets array', () => {
      const project = exportProject('Test', mockShots, []);
      
      expect(project.assets).toHaveLength(0);
      expect(project.metadata?.asset_count).toBe(0);
    });

    it('should handle shots without transitions', () => {
      const shotsWithoutTransitions: Shot[] = [
        {
          id: 'shot-1',
          title: 'Scene 1',
          description: 'Test',
          duration: 5,
          position: 0,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
      ];
      
      const project = exportProject('Test', shotsWithoutTransitions, []);
      
      expect(project.metadata?.total_duration).toBe(5);
    });
  });

  describe('exportProjectToJSON', () => {
    it('should export project as JSON string', () => {
      const json = exportProjectToJSON('Test', mockShots, mockAssets);
      
      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should export pretty-printed JSON by default', () => {
      const json = exportProjectToJSON('Test', mockShots, mockAssets);
      
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });

    it('should export minified JSON when pretty is false', () => {
      const json = exportProjectToJSON('Test', mockShots, mockAssets, false);
      
      expect(json).not.toContain('\n  ');
    });

    it('should produce valid JSON that can be parsed', () => {
      const json = exportProjectToJSON('Test', mockShots, mockAssets);
      const parsed = JSON.parse(json) as Project;
      
      expect(parsed.schema_version).toBe('1.0');
      expect(parsed.project_name).toBe('Test');
      expect(parsed.shots).toHaveLength(2);
    });
  });

  describe('downloadProjectJSON', () => {
    beforeEach(() => {
      // Mock DOM methods
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      
      // Mock document methods
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
    });

    it('should create a download link', () => {
      downloadProjectJSON('Test Project', mockShots, mockAssets);
      
      expect(document.createElement).toHaveBeenCalledWith('a');
    });

    it('should trigger download with sanitized filename', () => {
      downloadProjectJSON('Test Project!@#', mockShots, mockAssets);
      
      const link = document.createElement('a');
      expect(link.download).toContain('.json');
    });

    it('should create and revoke blob URL', () => {
      downloadProjectJSON('Test', mockShots, mockAssets);
      
      expect(global.URL.createObjectURL).toHaveBeenCalled();
      expect(global.URL.revokeObjectURL).toHaveBeenCalled();
    });
  });

  describe('validateProjectForExport', () => {
    it('should validate valid project', () => {
      const result = validateProjectForExport('Test Project', mockShots);
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject empty project name', () => {
      const result = validateProjectForExport('', mockShots);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project name is required');
    });

    it('should reject whitespace-only project name', () => {
      const result = validateProjectForExport('   ', mockShots);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project name is required');
    });

    it('should reject empty shots array', () => {
      const result = validateProjectForExport('Test', []);
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Project must contain at least one shot');
    });

    it('should reject shot without ID', () => {
      const invalidShots: Shot[] = [
        {
          id: '',
          title: 'Test',
          description: 'Test',
          duration: 5,
          position: 0,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
      ];
      
      const result = validateProjectForExport('Test', invalidShots);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('ID is required'))).toBe(true);
    });

    it('should reject shot without title', () => {
      const invalidShots: Shot[] = [
        {
          id: 'shot-1',
          title: '',
          description: 'Test',
          duration: 5,
          position: 0,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
      ];
      
      const result = validateProjectForExport('Test', invalidShots);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Title is required'))).toBe(true);
    });

    it('should reject shot with zero duration', () => {
      const invalidShots: Shot[] = [
        {
          id: 'shot-1',
          title: 'Test',
          description: 'Test',
          duration: 0,
          position: 0,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
      ];
      
      const result = validateProjectForExport('Test', invalidShots);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duration must be greater than 0'))).toBe(true);
    });

    it('should reject shot with negative duration', () => {
      const invalidShots: Shot[] = [
        {
          id: 'shot-1',
          title: 'Test',
          description: 'Test',
          duration: -5,
          position: 0,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
      ];
      
      const result = validateProjectForExport('Test', invalidShots);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duration must be greater than 0'))).toBe(true);
    });

    it('should reject duplicate shot IDs', () => {
      const duplicateShots: Shot[] = [
        {
          id: 'shot-1',
          title: 'Test 1',
          description: 'Test',
          duration: 5,
          position: 0,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
        {
          id: 'shot-1',
          title: 'Test 2',
          description: 'Test',
          duration: 5,
          position: 1,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
      ];
      
      const result = validateProjectForExport('Test', duplicateShots);
      
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate shot IDs'))).toBe(true);
    });

    it('should collect multiple errors', () => {
      const invalidShots: Shot[] = [
        {
          id: '',
          title: '',
          description: 'Test',
          duration: 0,
          position: 0,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
      ];
      
      const result = validateProjectForExport('', invalidShots);
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });
  });

  describe('importProjectFromJSON', () => {
    let validProjectJSON: string;

    beforeEach(() => {
      const project = exportProject('Test Project', mockShots, mockAssets);
      validProjectJSON = JSON.stringify(project);
    });

    it('should import valid project JSON', () => {
      const project = importProjectFromJSON(validProjectJSON);
      
      expect(project).not.toBeNull();
      expect(project?.schema_version).toBe('1.0');
      expect(project?.project_name).toBe('Test Project');
    });

    it('should return null for invalid JSON', () => {
      const project = importProjectFromJSON('invalid json');
      
      expect(project).toBeNull();
    });

    it('should return null for wrong schema version', () => {
      const invalidProject = {
        schema_version: '2.0',
        project_name: 'Test',
        shots: [],
        assets: [],
        capabilities: {},
        generation_status: {},
      };
      
      const project = importProjectFromJSON(JSON.stringify(invalidProject));
      
      expect(project).toBeNull();
    });

    it('should return null for missing project_name', () => {
      const invalidProject = {
        schema_version: '1.0',
        shots: [],
        assets: [],
        capabilities: {},
        generation_status: {},
      };
      
      const project = importProjectFromJSON(JSON.stringify(invalidProject));
      
      expect(project).toBeNull();
    });

    it('should return null for missing shots', () => {
      const invalidProject = {
        schema_version: '1.0',
        project_name: 'Test',
        assets: [],
        capabilities: {},
        generation_status: {},
      };
      
      const project = importProjectFromJSON(JSON.stringify(invalidProject));
      
      expect(project).toBeNull();
    });

    it('should return null for missing assets', () => {
      const invalidProject = {
        schema_version: '1.0',
        project_name: 'Test',
        shots: [],
        capabilities: {},
        generation_status: {},
      };
      
      const project = importProjectFromJSON(JSON.stringify(invalidProject));
      
      expect(project).toBeNull();
    });

    it('should return null for missing capabilities', () => {
      const invalidProject = {
        schema_version: '1.0',
        project_name: 'Test',
        shots: [],
        assets: [],
        generation_status: {},
      };
      
      const project = importProjectFromJSON(JSON.stringify(invalidProject));
      
      expect(project).toBeNull();
    });

    it('should return null for missing generation_status', () => {
      const invalidProject = {
        schema_version: '1.0',
        project_name: 'Test',
        shots: [],
        assets: [],
        capabilities: {},
      };
      
      const project = importProjectFromJSON(JSON.stringify(invalidProject));
      
      expect(project).toBeNull();
    });

    it('should preserve all shot data', () => {
      const project = importProjectFromJSON(validProjectJSON);
      
      expect(project?.shots).toHaveLength(2);
      expect(project?.shots[0].id).toBe('shot-1');
      expect(project?.shots[0].title).toBe('Opening Scene');
      expect(project?.shots[0].duration).toBe(5);
    });

    it('should preserve all asset data', () => {
      const project = importProjectFromJSON(validProjectJSON);
      
      expect(project?.assets).toHaveLength(2);
      expect(project?.assets[0].id).toBe('asset-1');
      expect(project?.assets[0].name).toBe('Background Music');
    });
  });
});
