/**
 * ProjectExportService Unit Tests
 * 
 * Tests the ProjectExportService class functionality:
 * - JSON export with validation
 * - PDF export with progress tracking
 * - Video export with error handling
 * - Progress callback integration
 * 
 * Requirements: 1.5, 13.1-13.6
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProjectExportService } from '../projectExportService';
import type { Project } from '@/types';

describe('ProjectExportService', () => {
  let exportService: ProjectExportService;
  let mockProject: Project;

  beforeEach(() => {
    exportService = ProjectExportService.getInstance();
    
    // Create mock project
    mockProject = {
      schema_version: '1.0',
      project_name: 'Test Project',
      shots: [
        {
          id: 'shot-1',
          title: 'Opening Scene',
          description: 'The story begins',
          duration: 3,
          position: 0,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
        {
          id: 'shot-2',
          title: 'Middle Scene',
          description: 'The plot thickens',
          duration: 5,
          position: 1,
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
        },
      ],
      assets: [
        {
          id: 'asset-1',
          name: 'Background Music',
          type: 'audio',
          url: '/assets/music.mp3',
        },
      ],
      capabilities: {
        grid_generation: true,
        promotion_engine: true,
        qa_engine: true,
        autofix_engine: true,
      },
      generation_status: {
        grid: 'done',
        promotion: 'done',
      },
    };
  });

  describe('exportJSON', () => {
    it('should export project as JSON successfully', async () => {
      const result = await exportService.exportJSON(mockProject);

      expect(result.success).toBe(true);
      expect(result.filePath).toBe('test_project.json');
      expect(result.error).toBeUndefined();
    });

    it('should validate project before export', async () => {
      // Create invalid project (no shots)
      const invalidProject = {
        ...mockProject,
        shots: [],
      };

      const result = await exportService.exportJSON(invalidProject);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Validation failed');
    });

    it('should call progress callback during export', async () => {
      const progressCallback = vi.fn();
      exportService.setProgressCallback(progressCallback);

      await exportService.exportJSON(mockProject);

      // Verify progress callback was called multiple times
      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(0, expect.any(String));
      expect(progressCallback).toHaveBeenCalledWith(100, 'Export complete');

      exportService.clearProgressCallback();
    });

    it('should handle export errors gracefully', async () => {
      // Create project with invalid name that will cause sanitization issues
      const projectWithInvalidName = {
        ...mockProject,
        project_name: '', // Empty name should fail validation
      };

      const result = await exportService.exportJSON(projectWithInvalidName);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('exportPDF', () => {
    it('should export project as PDF successfully', async () => {
      const result = await exportService.exportPDF(mockProject);

      expect(result.success).toBe(true);
      expect(result.filePath).toBe('test_project_report.pdf');
      expect(result.error).toBeUndefined();
    });

    it('should validate project before PDF export', async () => {
      // Create invalid project (no shots)
      const invalidProject = {
        ...mockProject,
        shots: [],
      };

      const result = await exportService.exportPDF(invalidProject);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Validation failed');
    });

    it('should call progress callback during PDF export', async () => {
      const progressCallback = vi.fn();
      exportService.setProgressCallback(progressCallback);

      await exportService.exportPDF(mockProject);

      // Verify progress callback was called
      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(0, expect.any(String));
      expect(progressCallback).toHaveBeenCalledWith(100, 'Export complete');

      exportService.clearProgressCallback();
    });
  });

  describe('exportVideo', () => {
    it('should export project as video successfully', async () => {
      // Add promoted panel paths to shots
      const projectWithPanels = {
        ...mockProject,
        shots: mockProject.shots.map(shot => ({
          ...shot,
          promoted_panel_path: `/panels/${shot.id}.png`,
        })),
      };

      const result = await exportService.exportVideo(projectWithPanels);

      expect(result.success).toBe(true);
      expect(result.filePath).toBe('test_project_sequence.mp4');
      expect(result.error).toBeUndefined();
    });

    it('should fail if no promoted panels exist', async () => {
      // Project without promoted panels
      const result = await exportService.exportVideo(mockProject);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('No promoted panels found');
    });

    it('should validate project before video export', async () => {
      // Create invalid project (no shots)
      const invalidProject = {
        ...mockProject,
        shots: [],
      };

      const result = await exportService.exportVideo(invalidProject);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should call progress callback during video export', async () => {
      // Add promoted panel paths to shots
      const projectWithPanels = {
        ...mockProject,
        shots: mockProject.shots.map(shot => ({
          ...shot,
          promoted_panel_path: `/panels/${shot.id}.png`,
        })),
      };

      const progressCallback = vi.fn();
      exportService.setProgressCallback(progressCallback);

      await exportService.exportVideo(projectWithPanels);

      // Verify progress callback was called
      expect(progressCallback).toHaveBeenCalled();
      expect(progressCallback).toHaveBeenCalledWith(0, expect.any(String));
      expect(progressCallback).toHaveBeenCalledWith(100, 'Export complete');

      exportService.clearProgressCallback();
    });
  });

  describe('progress callback management', () => {
    it('should set and clear progress callback', () => {
      const callback = vi.fn();

      exportService.setProgressCallback(callback);
      // Callback is set (no direct way to verify, but we can test it works)

      exportService.clearProgressCallback();
      // Callback is cleared
    });

    it('should not fail if no progress callback is set', async () => {
      // Ensure no callback is set
      exportService.clearProgressCallback();

      // Should not throw error
      const result = await exportService.exportJSON(mockProject);
      expect(result.success).toBe(true);
    });
  });

  describe('singleton pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ProjectExportService.getInstance();
      const instance2 = ProjectExportService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
