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
import { ProjectPersistenceService } from '../../../services/persistence/projectPersistence';
import { RecentProjectsService } from '../../../services/recentProjects/RecentProjectsService';
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

describe('Menu Actions Integration', () => {
  let mockPersistenceService: ProjectPersistenceService;
  let mockRecentProjectsService: RecentProjectsService;
  let mockNotificationService: NotificationService;
  let mockModalManager: any;
  let mockContext: ActionContext;
  let mockProject: Project;

  beforeEach(() => {
    // Create mock services
    mockPersistenceService = new ProjectPersistenceService();
    mockRecentProjectsService = new RecentProjectsService();
    mockNotificationService = new NotificationService();
    mockModalManager = {
      openModal: vi.fn(),
      closeModal: vi.fn(),
    };

    // Create mock project
    mockProject = {
      schema_version: '1.0',
      project_name: 'Test Project',
      shots: [
        {
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
        },
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
        persistence: mockPersistenceService,
        export: {
          exportJSON: vi.fn(),
          exportPDF: vi.fn(),
          exportVideo: vi.fn(),
        },
        recentProjects: mockRecentProjectsService,
        modal: mockModalManager,
        notification: mockNotificationService,
      },
    };
  });

  describe('saveProject', () => {
    it('should save project using persistence service', async () => {
      // Spy on persistence service
      const saveSpy = vi.spyOn(mockPersistenceService, 'saveProject');

      // Execute save action
      await fileActions.saveProject(mockContext);

      // Verify persistence service was called
      expect(saveSpy).toHaveBeenCalledWith(mockProject);
    });

    it('should add project to recent projects on successful save', async () => {
      // Spy on recent projects service
      const addProjectSpy = vi.spyOn(mockRecentProjectsService, 'addProject');

      // Execute save action
      await fileActions.saveProject(mockContext);

      // Verify project was added to recent projects
      expect(addProjectSpy).toHaveBeenCalled();
      const call = addProjectSpy.mock.calls[0][0];
      expect(call.name).toBe('Test Project');
    });

    it('should show success notification on successful save', async () => {
      // Spy on notification service
      const showSpy = vi.spyOn(mockNotificationService, 'show');

      // Execute save action
      await fileActions.saveProject(mockContext);

      // Verify success notification was shown
      expect(showSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'success',
          message: expect.stringContaining('saved successfully'),
        })
      );
    });

    it('should show error notification on save failure', async () => {
      // Mock persistence service to fail
      vi.spyOn(mockPersistenceService, 'saveProject').mockResolvedValue({
        success: false,
        error: new Error('Save failed'),
        timestamp: Date.now(),
      });

      // Spy on notification service
      const showSpy = vi.spyOn(mockNotificationService, 'show');

      // Execute save action
      await fileActions.saveProject(mockContext);

      // Verify error notification was shown
      expect(showSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Failed to save'),
        })
      );
    });

    it('should show warning when no project to save', async () => {
      // Set project to null
      mockContext.state.project = null;

      // Spy on notification service
      const showSpy = vi.spyOn(mockNotificationService, 'show');

      // Execute save action
      await fileActions.saveProject(mockContext);

      // Verify warning notification was shown
      expect(showSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          message: 'No project to save',
        })
      );
    });
  });

  describe('loadRecentProject', () => {
    it('should load project using persistence service', async () => {
      const projectId = 'test-project-id';

      // Mock persistence service to return success
      vi.spyOn(mockPersistenceService, 'loadProject').mockResolvedValue({
        success: true,
        project: mockProject,
      });

      // Mock validation to return true
      vi.spyOn(mockRecentProjectsService, 'validateProject').mockResolvedValue(true);

      // Spy on persistence service
      const loadSpy = vi.spyOn(mockPersistenceService, 'loadProject');

      // Execute load action
      await fileActions.loadRecentProject(mockContext, projectId);

      // Verify persistence service was called
      expect(loadSpy).toHaveBeenCalledWith(projectId);
    });

    it('should update recent projects on successful load', async () => {
      const projectId = 'test-project-id';

      // Mock persistence service to return success
      vi.spyOn(mockPersistenceService, 'loadProject').mockResolvedValue({
        success: true,
        project: mockProject,
      });

      // Mock validation to return true
      vi.spyOn(mockRecentProjectsService, 'validateProject').mockResolvedValue(true);

      // Spy on recent projects service
      const addProjectSpy = vi.spyOn(mockRecentProjectsService, 'addProject');

      // Execute load action
      await fileActions.loadRecentProject(mockContext, projectId);

      // Verify project was added to recent projects (moves to top)
      expect(addProjectSpy).toHaveBeenCalled();
    });

    it('should show error and remove project if validation fails', async () => {
      const projectId = 'test-project-id';

      // Mock validation to return false
      vi.spyOn(mockRecentProjectsService, 'validateProject').mockResolvedValue(false);

      // Spy on notification and remove
      const showSpy = vi.spyOn(mockNotificationService, 'show');
      const removeSpy = vi.spyOn(mockRecentProjectsService, 'removeProject');

      // Execute load action
      await fileActions.loadRecentProject(mockContext, projectId);

      // Verify error notification was shown
      expect(showSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('not found'),
        })
      );

      // Verify project was removed from recent projects
      expect(removeSpy).toHaveBeenCalledWith(projectId);
    });

    it('should remove project from recent list on load failure', async () => {
      const projectId = 'test-project-id';

      // Mock validation to return true
      vi.spyOn(mockRecentProjectsService, 'validateProject').mockResolvedValue(true);

      // Mock persistence service to fail
      vi.spyOn(mockPersistenceService, 'loadProject').mockResolvedValue({
        success: false,
        error: new Error('Load failed'),
      });

      // Spy on remove
      const removeSpy = vi.spyOn(mockRecentProjectsService, 'removeProject');

      // Execute load action
      await fileActions.loadRecentProject(mockContext, projectId);

      // Verify project was removed from recent projects
      expect(removeSpy).toHaveBeenCalledWith(projectId);
    });
  });

  describe('saveProjectAs', () => {
    it('should open save-as modal', async () => {
      // Execute save-as action
      await fileActions.saveProjectAs(mockContext);

      // Verify modal was opened
      expect(mockModalManager.openModal).toHaveBeenCalledWith(
        'save-as',
        expect.objectContaining({
          project: mockProject,
        })
      );
    });

    it('should show warning when no project to save', async () => {
      // Set project to null
      mockContext.state.project = null;

      // Spy on notification service
      const showSpy = vi.spyOn(mockNotificationService, 'show');

      // Execute save-as action
      await fileActions.saveProjectAs(mockContext);

      // Verify warning notification was shown
      expect(showSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'warning',
          message: 'No project to save',
        })
      );

      // Verify modal was not opened
      expect(mockModalManager.openModal).not.toHaveBeenCalled();
    });
  });

  describe('exportJSON', () => {
    it('should export project using export service', async () => {
      // Mock export service to return success
      const mockExportJSON = projectExportService.exportJSON as vi.Mock;
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
      const mockExportJSON = projectExportService.exportJSON as vi.Mock;
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
      const mockExportJSON = projectExportService.exportJSON as vi.Mock;
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
      const mockExportPDF = projectExportService.exportPDF as vi.Mock;
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
      const mockExportPDF = projectExportService.exportPDF as vi.Mock;
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
      const mockExportPDF = projectExportService.exportPDF as vi.Mock;
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
      const mockExportVideo = projectExportService.exportVideo as vi.Mock;
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
      const mockExportVideo = projectExportService.exportVideo as vi.Mock;
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
      const mockExportVideo = projectExportService.exportVideo as vi.Mock;
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
