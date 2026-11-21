/**
 * Menu Actions Integration Tests
 * 
 * Tests the integration between menu actions and services:
 * - ProjectPersistenceService
 * - RecentProjectsService
 * - NotificationService
 * 
 * Requirements: 1.3, 1.7, 12.1
 */


import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fileActions } from '../menuActions';
import type { ActionContext } from '../../../types/menuConfig';
import type { Project } from '../../../types';
import { NotificationService } from '../../../services/menuBar/NotificationService';

// Mock the entire projectExportService module
vi.mock('../../../services/projectExportService', () => ({
  projectExportService: {
    exportJSON: vi.fn(),
    exportPDF: vi.fn(),
    exportVideo: vi.fn(),
  },
}));

// Import the mocked module
import { projectExportService } from '../../../services/projectExportService';
import { createShotFixture } from '@/__tests__/helpers/shotFactory';

describe('Menu Actions Integration', () => {
  let mockNotificationService: NotificationService;
  let mockContext: ActionContext;
  let mockProject: Project;

  beforeEach(() => {
    // Create mock services
    mockNotificationService = new NotificationService();

    // Create mock project
    mockProject = {
      id: 'test-project',
      schema_version: '1.0',
      project_name: 'Test Project',
      shots: [
        createShotFixture({
          id: 'shot-1',
          title: 'Test Shot',
          description: 'Test description',
          duration: 10,
          image: '',
          audioTracks: [],
          effects: [],
          textLayers: [],
          animations: [],
          position: 0,
        }),
      ],
      assets: [],
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

    // Create mock context
    mockContext = {
      state: {
        selectedShotId: null,
        project: mockProject,
        hasUnsavedChanges: false,
        viewState: {
          timelineVisible: true,
          gridVisible: false,
          zoomLevel: 100,
          minZoom: 25,
          maxZoom: 400,
          zoomStep: 25,
          panelsVisible: {
            properties: true,
            assets: true,
            preview: true,
          },
          fullScreen: false,
        },
        undoStack: {
          canUndo: false,
          canRedo: false,
          undo: vi.fn(),
          redo: vi.fn(),
        },
        clipboard: {
          hasContent: false,
          contentType: null,
          cut: vi.fn(),
          copy: vi.fn(),
          paste: vi.fn(),
        },
        isProcessing: false,
      },
      services: {
        persistence: {},
        export: {
          exportJSON: vi.fn(),
          exportPDF: vi.fn(),
          exportVideo: vi.fn(),
        },
        recentProjects: {},
        modal: {},
        notification: mockNotificationService,
      },
    };
  });

  it.each([fileActions.saveProject, fileActions.saveProjectAs])('warns when saving without a project', async (save) => {
    const show = vi.spyOn(mockNotificationService, 'show');
    mockContext.state.project = null;

    await save(mockContext);

    expect(show).toHaveBeenCalledWith({ type: 'warning', message: 'No project to save', duration: 3000 });
  });

  it('reports when Save As is unavailable for the current project', async () => {
    const show = vi.spyOn(mockNotificationService, 'show');

    await fileActions.saveProjectAs(mockContext);

    expect(show).toHaveBeenCalledWith({ type: 'info', message: 'Save as feature coming soon', duration: 3000 });
  });

  describe('exportJSON', () => {
    it('should export project using export service', async () => {
      // Mock export service to return success
      const mockExportJSON = vi.mocked(projectExportService.exportJSON);
      mockExportJSON.mockResolvedValue({
        success: true,
        filePath: 'test-project.json',
      });

      // Execute export action
      await fileActions.exportJSON(mockContext);

      // Verify export service was called
      expect(mockExportJSON).toHaveBeenCalledWith(mockProject);
    });

    it('should show success notification with file path on successful export', async () => {
      // Mock export service to return success
      const mockExportJSON = vi.mocked(projectExportService.exportJSON);
      mockExportJSON.mockResolvedValue({
        success: true,
        filePath: 'test-project.json',
      });

      // Spy on notification service
      const showSpy = vi.spyOn(mockNotificationService, 'show');

      // Execute export action
      await fileActions.exportJSON(mockContext);

      // Verify success notification was shown with file path
      expect(showSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: expect.stringContaining('test-project.json'),
        })
      );
    });

    it('should show error notification on export failure', async () => {
      // Mock export service to return failure
      const mockExportJSON = vi.mocked(projectExportService.exportJSON);
      mockExportJSON.mockResolvedValue({
        success: false,
        error: new Error('Export failed'),
      });

      // Spy on notification service
      const showSpy = vi.spyOn(mockNotificationService, 'show');

      // Execute export action
      await fileActions.exportJSON(mockContext);

      // Verify error notification was shown
      expect(showSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Export JSON failed'),
        })
      );
    });
  });

  describe('exportPDF', () => {
    it('should export project using export service', async () => {
      // Mock export service to return success
      const mockExportPDF = vi.mocked(projectExportService.exportPDF);
      mockExportPDF.mockResolvedValue({
        success: true,
        filePath: 'test-project_report.pdf',
      });

      // Execute export action
      await fileActions.exportPDF(mockContext);

      // Verify export service was called
      expect(mockExportPDF).toHaveBeenCalledWith(mockProject);
    });

    it('should show success notification with file path on successful export', async () => {
      // Mock export service to return success
      const mockExportPDF = vi.mocked(projectExportService.exportPDF);
      mockExportPDF.mockResolvedValue({
        success: true,
        filePath: 'test-project_report.pdf',
      });

      // Spy on notification service
      const showSpy = vi.spyOn(mockNotificationService, 'show');

      // Execute export action
      await fileActions.exportPDF(mockContext);

      // Verify success notification was shown with file path
      expect(showSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: expect.stringContaining('test-project_report.pdf'),
        })
      );
    });

    it('should show error notification on export failure', async () => {
      // Mock export service to return failure
      const mockExportPDF = vi.mocked(projectExportService.exportPDF);
      mockExportPDF.mockResolvedValue({
        success: false,
        error: new Error('PDF export failed'),
      });

      // Spy on notification service
      const showSpy = vi.spyOn(mockNotificationService, 'show');

      // Execute export action
      await fileActions.exportPDF(mockContext);

      // Verify error notification was shown
      expect(showSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Export PDF failed'),
        })
      );
    });
  });

  describe('exportVideo', () => {
    it('should export project using export service', async () => {
      // Mock export service to return success
      const mockExportVideo = vi.mocked(projectExportService.exportVideo);
      mockExportVideo.mockResolvedValue({
        success: true,
        filePath: 'test-project_sequence.mp4',
      });

      // Execute export action
      await fileActions.exportVideo(mockContext);

      // Verify export service was called
      expect(mockExportVideo).toHaveBeenCalledWith(mockProject);
    });

    it('should show success notification with file path on successful export', async () => {
      // Mock export service to return success
      const mockExportVideo = vi.mocked(projectExportService.exportVideo);
      mockExportVideo.mockResolvedValue({
        success: true,
        filePath: 'test-project_sequence.mp4',
      });

      // Spy on notification service
      const showSpy = vi.spyOn(mockNotificationService, 'show');

      // Execute export action
      await fileActions.exportVideo(mockContext);

      // Verify success notification was shown with file path
      expect(showSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: expect.stringContaining('test-project_sequence.mp4'),
        })
      );
    });

    it('should show error notification on export failure', async () => {
      // Mock export service to return failure
      const mockExportVideo = vi.mocked(projectExportService.exportVideo);
      mockExportVideo.mockResolvedValue({
        success: false,
        error: new Error('Video export failed'),
      });

      // Spy on notification service
      const showSpy = vi.spyOn(mockNotificationService, 'show');

      // Execute export action
      await fileActions.exportVideo(mockContext);

      // Verify error notification was shown
      expect(showSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Export Video failed'),
        })
      );
    });
  });
});
