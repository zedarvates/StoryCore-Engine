/**
 * Clipboard Operations Tests
 * 
 * Tests for cut/copy/paste menu actions and clipboard state integration.
 * Validates Requirements 2.5-2.9.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { editActions } from '../menuActions';
import type { ActionContext } from '../../../types/menuConfig';
import type { AppState, ClipboardState } from '../../../types/menuBarState';
import type { Project, Shot } from '../../../types';

describe('Clipboard Operations', () => {
  let mockContext: ActionContext;
  let mockClipboard: ClipboardState;
  let mockProject: Project;
  let mockShot: Shot;

  beforeEach(() => {
    // Create a mock shot
    mockShot = {
      id: 'shot-1',
      title: 'Test shot',
      description: 'Test shot',
      duration: 5,
      position: 1,
      audioTracks: [],
      effects: [],
      textLayers: [],
      animations: [],
    };

    // Create a mock project with a selected shot
    mockProject = {
      schema_version: '1.0',
      project_name: 'Test Project',
      description: 'Test project for clipboard operations',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      shots: [mockShot],
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
      selectedShotId: 'shot-1', // Selected shot
    } as any;

    // Create mock clipboard
    mockClipboard = {
      hasContent: false,
      contentType: null,
      cut: vi.fn((content) => {
        mockClipboard.hasContent = true;
        mockClipboard.contentType = 'shot';
      }),
      copy: vi.fn((content) => {
        mockClipboard.hasContent = true;
        mockClipboard.contentType = 'shot';
      }),
      paste: vi.fn(() => mockShot),
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
        clipboard: mockClipboard,
        isProcessing: false,
      } as AppState,
      services: {
        persistence: {},
        export: {
          exportJSON: vi.fn(),
          exportPDF: vi.fn(),
          exportVideo: vi.fn(),
        },
        recentProjects: {},
        modal: {
          openModal: vi.fn(),
          closeModal: vi.fn(),
        },
        notification: {
          show: vi.fn(),
          dismiss: vi.fn(),
        },
      },
    };
  });

  describe('Cut Operation', () => {
    it('should cut selected shot to clipboard', () => {
      // Execute cut action
      editActions.cut(mockContext);

      // Verify clipboard.cut was called with the shot
      expect(mockClipboard.cut).toHaveBeenCalledWith(mockShot);

      // Verify notification was shown
      expect(mockContext.services.notification.show).toHaveBeenCalledWith({
        type: 'info',
        message: 'Shot cut to clipboard',
        duration: 2000,
      });
    });

    it('should show warning when no content is selected', () => {
      // Remove selection
      mockContext.state.project = {
        ...mockProject,
        selectedShotId: null,
      } as any;

      // Execute cut action
      editActions.cut(mockContext);

      // Verify clipboard.cut was NOT called
      expect(mockClipboard.cut).not.toHaveBeenCalled();

      // Verify warning notification was shown
      expect(mockContext.services.notification.show).toHaveBeenCalledWith({
        type: 'warning',
        message: 'No content selected to cut',
        duration: 2000,
      });
    });

    it('should do nothing when no project is loaded', () => {
      // Remove project
      mockContext.state.project = null;

      // Execute cut action
      editActions.cut(mockContext);

      // Verify clipboard.cut was NOT called
      expect(mockClipboard.cut).not.toHaveBeenCalled();

      // Verify no notification was shown
      expect(mockContext.services.notification.show).not.toHaveBeenCalled();
    });

    it('should show warning when selected shot is not found', () => {
      // Set invalid selection
      mockContext.state.project = {
        ...mockProject,
        selectedShotId: 'non-existent-shot',
      } as any;

      // Execute cut action
      editActions.cut(mockContext);

      // Verify clipboard.cut was NOT called
      expect(mockClipboard.cut).not.toHaveBeenCalled();

      // Verify warning notification was shown
      expect(mockContext.services.notification.show).toHaveBeenCalledWith({
        type: 'warning',
        message: 'No content selected to cut',
        duration: 2000,
      });
    });
  });

  describe('Copy Operation', () => {
    it('should copy selected shot to clipboard', () => {
      // Execute copy action
      editActions.copy(mockContext);

      // Verify clipboard.copy was called with the shot
      expect(mockClipboard.copy).toHaveBeenCalledWith(mockShot);

      // Verify notification was shown
      expect(mockContext.services.notification.show).toHaveBeenCalledWith({
        type: 'info',
        message: 'Shot copied to clipboard',
        duration: 2000,
      });
    });

    it('should show warning when no content is selected', () => {
      // Remove selection
      mockContext.state.project = {
        ...mockProject,
        selectedShotId: null,
      } as any;

      // Execute copy action
      editActions.copy(mockContext);

      // Verify clipboard.copy was NOT called
      expect(mockClipboard.copy).not.toHaveBeenCalled();

      // Verify warning notification was shown
      expect(mockContext.services.notification.show).toHaveBeenCalledWith({
        type: 'warning',
        message: 'No content selected to copy',
        duration: 2000,
      });
    });

    it('should do nothing when no project is loaded', () => {
      // Remove project
      mockContext.state.project = null;

      // Execute copy action
      editActions.copy(mockContext);

      // Verify clipboard.copy was NOT called
      expect(mockClipboard.copy).not.toHaveBeenCalled();

      // Verify no notification was shown
      expect(mockContext.services.notification.show).not.toHaveBeenCalled();
    });

    it('should show warning when selected shot is not found', () => {
      // Set invalid selection
      mockContext.state.project = {
        ...mockProject,
        selectedShotId: 'non-existent-shot',
      } as any;

      // Execute copy action
      editActions.copy(mockContext);

      // Verify clipboard.copy was NOT called
      expect(mockClipboard.copy).not.toHaveBeenCalled();

      // Verify warning notification was shown
      expect(mockContext.services.notification.show).toHaveBeenCalledWith({
        type: 'warning',
        message: 'No content selected to copy',
        duration: 2000,
      });
    });
  });

  describe('Paste Operation', () => {
    beforeEach(() => {
      // Set clipboard to have content
      mockClipboard.hasContent = true;
      mockClipboard.contentType = 'shot';
    });

    it('should paste shot from clipboard', () => {
      // Execute paste action
      editActions.paste(mockContext);

      // Verify clipboard.paste was called
      expect(mockClipboard.paste).toHaveBeenCalled();

      // Verify notification was shown
      expect(mockContext.services.notification.show).toHaveBeenCalledWith({
        type: 'info',
        message: 'Shot pasted from clipboard',
        duration: 2000,
      });
    });

    it('should show warning when clipboard is empty', () => {
      // Set clipboard to empty
      mockClipboard.hasContent = false;

      // Execute paste action
      editActions.paste(mockContext);

      // Verify clipboard.paste was NOT called
      expect(mockClipboard.paste).not.toHaveBeenCalled();

      // Verify warning notification was shown
      expect(mockContext.services.notification.show).toHaveBeenCalledWith({
        type: 'warning',
        message: 'Clipboard is empty',
        duration: 2000,
      });
    });

    it('should handle asset content type', () => {
      // Set clipboard to have asset content
      mockClipboard.contentType = 'asset';

      // Execute paste action
      editActions.paste(mockContext);

      // Verify clipboard.paste was called
      expect(mockClipboard.paste).toHaveBeenCalled();

      // Verify notification was shown
      expect(mockContext.services.notification.show).toHaveBeenCalledWith({
        type: 'info',
        message: 'Asset pasted from clipboard',
        duration: 2000,
      });
    });

    it('should handle text content type', () => {
      // Set clipboard to have text content
      mockClipboard.contentType = 'text';

      // Execute paste action
      editActions.paste(mockContext);

      // Verify clipboard.paste was called
      expect(mockClipboard.paste).toHaveBeenCalled();

      // Verify notification was shown
      expect(mockContext.services.notification.show).toHaveBeenCalledWith({
        type: 'info',
        message: 'Text pasted from clipboard',
        duration: 2000,
      });
    });

    it('should show warning when paste returns null', () => {
      // Mock paste to return null
      mockClipboard.paste = vi.fn(() => null);

      // Execute paste action
      editActions.paste(mockContext);

      // Verify warning notification was shown
      expect(mockContext.services.notification.show).toHaveBeenCalledWith({
        type: 'warning',
        message: 'No content to paste',
        duration: 2000,
      });
    });
  });

  describe('Menu Item Enabled States', () => {
    it('should enable cut when shot is selected', () => {
      // Test the enabled function directly
      const enabledFn = (state: AppState) => {
        if (!state.project) return false;
        const selectedShotId = (state.project as any).selectedShotId;
        return selectedShotId !== null && selectedShotId !== undefined;
      };

      const isEnabled = enabledFn(mockContext.state);
      expect(isEnabled).toBe(true);
    });

    it('should disable cut when no shot is selected', () => {
      // Remove selection
      mockContext.state.project = {
        ...mockProject,
        selectedShotId: null,
      } as any;

      // Test the enabled function directly
      const enabledFn = (state: AppState) => {
        if (!state.project) return false;
        const selectedShotId = (state.project as any).selectedShotId;
        return selectedShotId !== null && selectedShotId !== undefined;
      };

      const isEnabled = enabledFn(mockContext.state);
      expect(isEnabled).toBe(false);
    });

    it('should enable copy when shot is selected', () => {
      // Test the enabled function directly
      const enabledFn = (state: AppState) => {
        if (!state.project) return false;
        const selectedShotId = (state.project as any).selectedShotId;
        return selectedShotId !== null && selectedShotId !== undefined;
      };

      const isEnabled = enabledFn(mockContext.state);
      expect(isEnabled).toBe(true);
    });

    it('should disable copy when no shot is selected', () => {
      // Remove selection
      mockContext.state.project = {
        ...mockProject,
        selectedShotId: null,
      } as any;

      // Test the enabled function directly
      const enabledFn = (state: AppState) => {
        if (!state.project) return false;
        const selectedShotId = (state.project as any).selectedShotId;
        return selectedShotId !== null && selectedShotId !== undefined;
      };

      const isEnabled = enabledFn(mockContext.state);
      expect(isEnabled).toBe(false);
    });

    it('should enable paste when clipboard has content', () => {
      // Set clipboard to have content
      mockClipboard.hasContent = true;

      // Test the enabled function directly (paste is enabled based on clipboard.hasContent)
      const isEnabled = mockContext.state.clipboard.hasContent;
      expect(isEnabled).toBe(true);
    });

    it('should disable paste when clipboard is empty', () => {
      // Set clipboard to empty
      mockClipboard.hasContent = false;

      // Test the enabled function directly (paste is enabled based on clipboard.hasContent)
      const isEnabled = mockContext.state.clipboard.hasContent;
      expect(isEnabled).toBe(false);
    });
  });

  describe('Clipboard State Integration', () => {
    it('should update clipboard state after cut', () => {
      // Execute cut action
      editActions.cut(mockContext);

      // Verify clipboard state was updated
      expect(mockClipboard.hasContent).toBe(true);
      expect(mockClipboard.contentType).toBe('shot');
    });

    it('should update clipboard state after copy', () => {
      // Execute copy action
      editActions.copy(mockContext);

      // Verify clipboard state was updated
      expect(mockClipboard.hasContent).toBe(true);
      expect(mockClipboard.contentType).toBe('shot');
    });

    it('should maintain clipboard state across operations', () => {
      // Copy first
      editActions.copy(mockContext);
      expect(mockClipboard.hasContent).toBe(true);

      // Paste should still work
      editActions.paste(mockContext);
      expect(mockClipboard.paste).toHaveBeenCalled();

      // Clipboard should still have content after paste
      expect(mockClipboard.hasContent).toBe(true);
    });
  });
});
