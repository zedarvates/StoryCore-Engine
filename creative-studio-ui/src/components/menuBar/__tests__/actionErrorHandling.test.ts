/**
 * Action Error Handling Tests
 * 
 * Tests for comprehensive error handling in menu actions:
 * - Error notifications
 * - Rollback functionality
 * - Console logging
 * 
 * Requirements: 15.2, 15.6
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fileActions, editActions, projectActions, toolsActions, helpActions } from '../menuActions';
import type { ActionContext } from '../../../types/menuConfig';
import type { Project } from '../../../types';

// Mock console methods
const originalConsoleLog = console.log;
const originalConsoleError = console.error;

describe('Menu Action Error Handling', () => {
  let mockContext: ActionContext;
  let consoleLogSpy: ReturnType<typeof vi.fn>;
  let consoleErrorSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Set up console spies
    consoleLogSpy = vi.fn();
    consoleErrorSpy = vi.fn();
    console.log = consoleLogSpy;
    console.error = consoleErrorSpy;

    // Create mock context
    const mockProject: Project = {
      schema_version: '1.0',
      project_name: 'Test Project',
      shots: [],
      assets: [],
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
        persistence: {
          saveProject: vi.fn(),
          loadProject: vi.fn(),
        },
        export: {
          exportJSON: vi.fn(),
          exportPDF: vi.fn(),
          exportVideo: vi.fn(),
          setProgressCallback: vi.fn(),
          clearProgressCallback: vi.fn(),
        },
        recentProjects: {
          addProject: vi.fn(),
          getRecentProjects: vi.fn(),
          removeProject: vi.fn(),
          clearAll: vi.fn(),
          validateProject: vi.fn(),
        },
        modal: {
          openModal: vi.fn(),
          closeModal: vi.fn(),
          closeAll: vi.fn(),
          isOpen: vi.fn(),
        },
        notification: {
          show: vi.fn().mockReturnValue('notification-id'),
          dismiss: vi.fn(),
        },
      },
      onViewStateChange: vi.fn(),
    };
  });

  afterEach(() => {
    // Restore console methods
    console.log = originalConsoleLog;
    console.error = originalConsoleError;
    vi.clearAllMocks();
  });

  describe('Error Notifications', () => {
    it('should show error notification when save fails', async () => {
      // Mock save to fail
      mockContext.services.persistence.saveProject = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Disk full'),
      });

      await fileActions.saveProject(mockContext);

      // Verify error notification was shown
      expect(mockContext.services.notification.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('disk space'),
          duration: 5000,
        })
      );
    });

    it('should show error notification when export fails', async () => {
      // Mock export to fail
      mockContext.services.export.exportJSON = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Permission denied'),
      });

      await fileActions.exportJSON(mockContext);

      // Verify error notification was shown
      expect(mockContext.services.notification.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Permission denied'),
          duration: 5000,
        })
      );
    });

    it('should show error notification when project not found', async () => {
      // Mock load to fail with not found error
      mockContext.services.persistence.loadProject = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Project not found'),
      });
      mockContext.services.recentProjects.validateProject = vi.fn().mockResolvedValue(false);

      await fileActions.loadRecentProject(mockContext, 'test-project-id');

      // Verify error notification was shown
      expect(mockContext.services.notification.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('not found'),
          duration: 5000,
        })
      );
    });

    it('should show error notification when modal fails to open', async () => {
      // Mock modal to fail
      mockContext.services.modal.openModal = vi.fn().mockRejectedValue(
        new Error('Modal initialization failed')
      );

      await projectActions.settings(mockContext);

      // Verify error notification was shown
      expect(mockContext.services.notification.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('Failed to open project settings'),
          duration: 5000,
        })
      );
    });
  });

  describe('Rollback Functionality', () => {
    it('should clean up progress notification on export failure', async () => {
      // Mock export to fail
      mockContext.services.export.exportJSON = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Export failed'),
      });

      await fileActions.exportJSON(mockContext);

      // Verify progress notification was dismissed
      expect(mockContext.services.notification.dismiss).toHaveBeenCalled();
      
      // Verify progress callback was cleared
      expect(mockContext.services.export.clearProgressCallback).toHaveBeenCalled();
    });

    it('should remove project from recent list on load failure', async () => {
      const projectId = 'test-project-id';
      
      // Mock validation to fail
      mockContext.services.recentProjects.validateProject = vi.fn().mockResolvedValue(false);

      await fileActions.loadRecentProject(mockContext, projectId);

      // Verify project was removed from recent list
      expect(mockContext.services.recentProjects.removeProject).toHaveBeenCalledWith(projectId);
    });

    it('should log rollback attempt', async () => {
      // Mock save to fail
      mockContext.services.persistence.saveProject = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Save failed'),
      });

      await fileActions.saveProject(mockContext);

      // Verify rollback was logged
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rolling back')
      );
    });
  });

  describe('Console Logging', () => {
    it('should log action start', async () => {
      mockContext.services.persistence.saveProject = vi.fn().mockResolvedValue({
        success: true,
      });

      await fileActions.saveProject(mockContext);

      // Verify action start was logged
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MenuAction] Starting: saveProject'),
        expect.objectContaining({
          timestamp: expect.any(String),
          project: 'Test Project',
        })
      );
    });

    it('should log action success', async () => {
      mockContext.services.persistence.saveProject = vi.fn().mockResolvedValue({
        success: true,
      });

      await fileActions.saveProject(mockContext);

      // Verify action success was logged
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MenuAction] Success: saveProject'),
        expect.objectContaining({
          timestamp: expect.any(String),
        })
      );
    });

    it('should log action error with stack trace', async () => {
      const testError = new Error('Test error');
      mockContext.services.persistence.saveProject = vi.fn().mockResolvedValue({
        success: false,
        error: testError,
      });

      await fileActions.saveProject(mockContext);

      // Verify error was logged with details
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[MenuAction] Error: saveProject'),
        expect.objectContaining({
          timestamp: expect.any(String),
          error: testError,
          stack: expect.any(String),
          project: 'Test Project',
        })
      );
    });

    it('should log all async action invocations', async () => {
      // Test multiple actions
      mockContext.services.modal.openModal = vi.fn().mockResolvedValue(undefined);

      await projectActions.settings(mockContext);
      await projectActions.characters(mockContext);
      await toolsActions.llmAssistant(mockContext);

      // Verify all actions were logged
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('projectSettings'),
        expect.any(Object)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('characterManagement'),
        expect.any(Object)
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('llmAssistant'),
        expect.any(Object)
      );
    });
  });

  describe('Error Message Formatting', () => {
    it('should provide user-friendly message for disk full error', async () => {
      mockContext.services.persistence.saveProject = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('ENOSPC: no space left on device'),
      });

      await fileActions.saveProject(mockContext);

      expect(mockContext.services.notification.show).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('disk space'),
        })
      );
    });

    it('should provide user-friendly message for permission error', async () => {
      mockContext.services.persistence.saveProject = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('EACCES: permission denied'),
      });

      await fileActions.saveProject(mockContext);

      expect(mockContext.services.notification.show).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Permission denied'),
        })
      );
    });

    it('should provide user-friendly message for validation error', async () => {
      mockContext.services.persistence.saveProject = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Validation failed: missing required field'),
      });

      await fileActions.saveProject(mockContext);

      expect(mockContext.services.notification.show).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Invalid project data'),
        })
      );
    });

    it('should provide user-friendly message for network error', async () => {
      mockContext.services.export.exportJSON = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Network request failed'),
      });

      await fileActions.exportJSON(mockContext);

      expect(mockContext.services.notification.show).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Network error'),
        })
      );
    });
  });

  describe('Synchronous Action Error Handling', () => {
    it('should handle errors in synchronous actions', () => {
      // Mock window.open to throw
      const originalOpen = window.open;
      window.open = vi.fn().mockImplementation(() => {
        throw new Error('Popup blocked');
      });

      // Should not throw
      expect(() => helpActions.documentation()).not.toThrow();

      // Verify error was logged
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error opening documentation'),
        expect.any(Error)
      );

      // Restore
      window.open = originalOpen;
    });
  });

  describe('Multiple Error Scenarios', () => {
    it('should handle cascading errors gracefully', async () => {
      // Mock save to fail
      mockContext.services.persistence.saveProject = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Save failed'),
      });

      // Mock recent projects to also fail
      mockContext.services.recentProjects.addProject = vi.fn().mockImplementation(() => {
        throw new Error('Recent projects update failed');
      });

      await fileActions.saveProject(mockContext);

      // Should still show error notification
      expect(mockContext.services.notification.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
        })
      );
    });

    it('should handle rollback failures', async () => {
      // Mock export to fail
      mockContext.services.export.exportJSON = vi.fn().mockResolvedValue({
        success: false,
        error: new Error('Export failed'),
      });

      // Mock dismiss to also fail
      mockContext.services.notification.dismiss = vi.fn().mockImplementation(() => {
        throw new Error('Dismiss failed');
      });

      await fileActions.exportJSON(mockContext);

      // Should log rollback failure
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Rollback failed'),
        expect.any(Error)
      );

      // Should show additional notification about rollback failure
      expect(mockContext.services.notification.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'error',
          message: expect.stringContaining('rollback'),
        })
      );
    });
  });
});
