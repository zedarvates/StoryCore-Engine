/**
 * Tests for useProjectExport Hook
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useProjectExport } from '../useProjectExport';
import { useAppStore } from '@/stores/useAppStore';
import type { Project, Shot, Asset } from '@/types';

// Mock the store
vi.mock('@/stores/useAppStore');

describe('useProjectExport', () => {
  let mockProject: Project;
  let mockShots: Shot[];
  let mockAssets: Asset[];
  let mockSetProject: ReturnType<typeof vi.fn>;
  let mockSetShots: ReturnType<typeof vi.fn>;

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
      },
    ];

    mockAssets = [
      {
        id: 'asset-1',
        name: 'Background Music',
        type: 'audio',
        url: '/assets/music.mp3',
      },
    ];

    mockProject = {
      schema_version: '1.0',
      project_name: 'Test Project',
      shots: mockShots,
      assets: mockAssets,
      capabilities: {
        grid_generation: true,
        promotion_engine: true,
        qa_engine: true,
        autofix_engine: true,
      },
      generation_status: {
        grid: 'pending',
        promotion: 'pending',
      },
    };

    mockSetProject = vi.fn();
    mockSetShots = vi.fn();

    (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      project: mockProject,
      shots: mockShots,
      assets: mockAssets,
      setProject: mockSetProject,
      setShots: mockSetShots,
    });
  });

  describe('exportCurrentProject', () => {
    it('should export current project', () => {
      const { result } = renderHook(() => useProjectExport());
      
      const exported = result.current.exportCurrentProject();
      
      expect(exported).not.toBeNull();
      expect(exported?.schema_version).toBe('1.0');
      expect(exported?.project_name).toBe('Test Project');
    });

    it('should return null when no project is loaded', () => {
      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        project: null,
        shots: [],
        assets: [],
        setProject: mockSetProject,
        setShots: mockSetShots,
      });

      const { result } = renderHook(() => useProjectExport());
      
      const exported = result.current.exportCurrentProject();
      
      expect(exported).toBeNull();
    });

    it('should return null when validation fails', () => {
      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        project: mockProject,
        shots: [], // Empty shots array will fail validation
        assets: mockAssets,
        setProject: mockSetProject,
        setShots: mockSetShots,
      });

      const { result } = renderHook(() => useProjectExport());
      
      const exported = result.current.exportCurrentProject();
      
      expect(exported).toBeNull();
    });

    it('should include all shots in export', () => {
      const { result } = renderHook(() => useProjectExport());
      
      const exported = result.current.exportCurrentProject();
      
      expect(exported?.shots).toHaveLength(2);
      expect(exported?.shots[0].id).toBe('shot-1');
      expect(exported?.shots[1].id).toBe('shot-2');
    });

    it('should include all assets in export', () => {
      const { result } = renderHook(() => useProjectExport());
      
      const exported = result.current.exportCurrentProject();
      
      expect(exported?.assets).toHaveLength(1);
      expect(exported?.assets[0].id).toBe('asset-1');
    });
  });

  describe('exportCurrentProjectToJSON', () => {
    it('should export project as JSON string', () => {
      const { result } = renderHook(() => useProjectExport());
      
      const json = result.current.exportCurrentProjectToJSON();
      
      expect(typeof json).toBe('string');
      expect(() => JSON.parse(json!)).not.toThrow();
    });

    it('should export pretty-printed JSON by default', () => {
      const { result } = renderHook(() => useProjectExport());
      
      const json = result.current.exportCurrentProjectToJSON();
      
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });

    it('should export minified JSON when pretty is false', () => {
      const { result } = renderHook(() => useProjectExport());
      
      const json = result.current.exportCurrentProjectToJSON(false);
      
      expect(json).not.toContain('\n  ');
    });

    it('should return null when no project is loaded', () => {
      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        project: null,
        shots: [],
        assets: [],
        setProject: mockSetProject,
        setShots: mockSetShots,
      });

      const { result } = renderHook(() => useProjectExport());
      
      const json = result.current.exportCurrentProjectToJSON();
      
      expect(json).toBeNull();
    });

    it('should return null when validation fails', () => {
      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        project: mockProject,
        shots: [],
        assets: mockAssets,
        setProject: mockSetProject,
        setShots: mockSetShots,
      });

      const { result } = renderHook(() => useProjectExport());
      
      const json = result.current.exportCurrentProjectToJSON();
      
      expect(json).toBeNull();
    });
  });

  describe('downloadCurrentProject', () => {
    beforeEach(() => {
      // Mock DOM methods
      global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = vi.fn();
      global.alert = vi.fn();
      
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      };
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
    });

    it('should trigger download', () => {
      const { result } = renderHook(() => useProjectExport());
      
      act(() => {
        result.current.downloadCurrentProject();
      });
      
      expect(document.createElement).toHaveBeenCalledWith('a');
    });

    it('should not download when no project is loaded', () => {
      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        project: null,
        shots: [],
        assets: [],
        setProject: mockSetProject,
        setShots: mockSetShots,
      });

      const { result } = renderHook(() => useProjectExport());
      
      act(() => {
        result.current.downloadCurrentProject();
      });
      
      expect(document.createElement).not.toHaveBeenCalled();
    });

    it('should show alert when validation fails', () => {
      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        project: mockProject,
        shots: [],
        assets: mockAssets,
        setProject: mockSetProject,
        setShots: mockSetShots,
      });

      const { result } = renderHook(() => useProjectExport());
      
      act(() => {
        result.current.downloadCurrentProject();
      });
      
      expect(global.alert).toHaveBeenCalled();
      expect(document.createElement).not.toHaveBeenCalled();
    });
  });

  describe('validateCurrentProject', () => {
    it('should validate valid project', () => {
      const { result } = renderHook(() => useProjectExport());
      
      const validation = result.current.validateCurrentProject();
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should return invalid when no project is loaded', () => {
      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        project: null,
        shots: [],
        assets: [],
        setProject: mockSetProject,
        setShots: mockSetShots,
      });

      const { result } = renderHook(() => useProjectExport());
      
      const validation = result.current.validateCurrentProject();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('No project loaded');
    });

    it('should return errors for invalid project', () => {
      (useAppStore as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
        project: mockProject,
        shots: [],
        assets: mockAssets,
        setProject: mockSetProject,
        setShots: mockSetShots,
      });

      const { result } = renderHook(() => useProjectExport());
      
      const validation = result.current.validateCurrentProject();
      
      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });

  describe('importProject', () => {
    it('should import valid project JSON', () => {
      const { result } = renderHook(() => useProjectExport());
      
      const validJSON = JSON.stringify(mockProject);
      const success = result.current.importProject(validJSON);
      
      expect(success).toBe(true);
      expect(mockSetProject).toHaveBeenCalledWith(mockProject);
      expect(mockSetShots).toHaveBeenCalledWith(mockProject.shots);
    });

    it('should return false for invalid JSON', () => {
      const { result } = renderHook(() => useProjectExport());
      
      const success = result.current.importProject('invalid json');
      
      expect(success).toBe(false);
      expect(mockSetProject).not.toHaveBeenCalled();
      expect(mockSetShots).not.toHaveBeenCalled();
    });

    it('should return false for wrong schema version', () => {
      const { result } = renderHook(() => useProjectExport());
      
      const invalidProject = { ...mockProject, schema_version: '2.0' };
      const success = result.current.importProject(JSON.stringify(invalidProject));
      
      expect(success).toBe(false);
      expect(mockSetProject).not.toHaveBeenCalled();
    });

    it('should update store with imported project', () => {
      const { result } = renderHook(() => useProjectExport());
      
      const validJSON = JSON.stringify(mockProject);
      result.current.importProject(validJSON);
      
      expect(mockSetProject).toHaveBeenCalledTimes(1);
      expect(mockSetShots).toHaveBeenCalledTimes(1);
    });
  });

  describe('importProjectFromFile', () => {
    it('should import project from file', async () => {
      const { result } = renderHook(() => useProjectExport());
      
      const validJSON = JSON.stringify(mockProject);
      const file = new File([validJSON], 'project.json', { type: 'application/json' });
      
      const success = await result.current.importProjectFromFile(file);
      
      expect(success).toBe(true);
      expect(mockSetProject).toHaveBeenCalled();
    });

    it('should return false for invalid file content', async () => {
      const { result } = renderHook(() => useProjectExport());
      
      const file = new File(['invalid json'], 'project.json', { type: 'application/json' });
      
      const success = await result.current.importProjectFromFile(file);
      
      expect(success).toBe(false);
      expect(mockSetProject).not.toHaveBeenCalled();
    });

    it('should handle file read errors', async () => {
      const { result } = renderHook(() => useProjectExport());
      
      const mockFile = {
        text: vi.fn().mockRejectedValue(new Error('Read error')),
      } as unknown as File;
      
      const success = await result.current.importProjectFromFile(mockFile);
      
      expect(success).toBe(false);
    });
  });

  describe('hook stability', () => {
    it('should maintain stable function references', () => {
      const { result, rerender } = renderHook(() => useProjectExport());
      
      const firstRender = {
        exportCurrentProject: result.current.exportCurrentProject,
        exportCurrentProjectToJSON: result.current.exportCurrentProjectToJSON,
        downloadCurrentProject: result.current.downloadCurrentProject,
        validateCurrentProject: result.current.validateCurrentProject,
        importProject: result.current.importProject,
        importProjectFromFile: result.current.importProjectFromFile,
      };
      
      rerender();
      
      expect(result.current.exportCurrentProject).toBe(firstRender.exportCurrentProject);
      expect(result.current.exportCurrentProjectToJSON).toBe(firstRender.exportCurrentProjectToJSON);
      expect(result.current.downloadCurrentProject).toBe(firstRender.downloadCurrentProject);
      expect(result.current.validateCurrentProject).toBe(firstRender.validateCurrentProject);
      expect(result.current.importProject).toBe(firstRender.importProject);
      expect(result.current.importProjectFromFile).toBe(firstRender.importProjectFromFile);
    });
  });
});
