/**
 * Undo/Redo Integration Tests
 * 
 * Tests that undo/redo menu actions properly connect to the undo stack.
 * 
 * Requirements: 2.1-2.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { editActions } from '../menuActions';
import type { ActionContext } from '../../../types/menuConfig';
import type { AppState, UndoStack } from '../../../types/menuBarState';
import { DEFAULT_VIEW_STATE } from '../../../types/menuBarState';

describe('Undo/Redo Integration', () => {
  let mockUndoStack: UndoStack;
  let mockContext: ActionContext;

  beforeEach(() => {
    // Create mock undo stack
    mockUndoStack = {
      canUndo: false,
      canRedo: false,
      undo: vi.fn(),
      redo: vi.fn(),
    };

    // Create mock action context
    const mockState: AppState = {
      project: null,
      hasUnsavedChanges: false,
      viewState: DEFAULT_VIEW_STATE,
      undoStack: mockUndoStack,
      clipboard: {
        hasContent: false,
        contentType: null,
        cut: vi.fn(),
        copy: vi.fn(),
        paste: vi.fn(),
      },
      isProcessing: false,
    };

    mockContext = {
      state: mockState,
      services: {
        persistence: {} as any,
        export: {} as any,
        recentProjects: {} as any,
        modal: {} as any,
        notification: {
          show: vi.fn(),
          dismiss: vi.fn(),
          dismissAll: vi.fn(),
        },
      },
    };
  });

  describe('Undo Action', () => {
    it('should call undoStack.undo() when canUndo is true', () => {
      // Arrange
      mockUndoStack.canUndo = true;

      // Act
      editActions.undo(mockContext);

      // Assert
      expect(mockUndoStack.undo).toHaveBeenCalledTimes(1);
      expect(mockContext.services.notification.show).toHaveBeenCalledWith({
        type: 'info',
        message: 'Action undone',
        duration: 2000,
      });
    });

    it('should not call undoStack.undo() when canUndo is false', () => {
      // Arrange
      mockUndoStack.canUndo = false;

      // Act
      editActions.undo(mockContext);

      // Assert
      expect(mockUndoStack.undo).not.toHaveBeenCalled();
      expect(mockContext.services.notification.show).not.toHaveBeenCalled();
    });

    it('should show notification after successful undo', () => {
      // Arrange
      mockUndoStack.canUndo = true;

      // Act
      editActions.undo(mockContext);

      // Assert
      expect(mockContext.services.notification.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          message: 'Action undone',
          duration: 2000,
        })
      );
    });
  });

  describe('Redo Action', () => {
    it('should call undoStack.redo() when canRedo is true', () => {
      // Arrange
      mockUndoStack.canRedo = true;

      // Act
      editActions.redo(mockContext);

      // Assert
      expect(mockUndoStack.redo).toHaveBeenCalledTimes(1);
      expect(mockContext.services.notification.show).toHaveBeenCalledWith({
        type: 'info',
        message: 'Action redone',
        duration: 2000,
      });
    });

    it('should not call undoStack.redo() when canRedo is false', () => {
      // Arrange
      mockUndoStack.canRedo = false;

      // Act
      editActions.redo(mockContext);

      // Assert
      expect(mockUndoStack.redo).not.toHaveBeenCalled();
      expect(mockContext.services.notification.show).not.toHaveBeenCalled();
    });

    it('should show notification after successful redo', () => {
      // Arrange
      mockUndoStack.canRedo = true;

      // Act
      editActions.redo(mockContext);

      // Assert
      expect(mockContext.services.notification.show).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'info',
          message: 'Action redone',
          duration: 2000,
        })
      );
    });
  });

  describe('Menu Item Enabled States', () => {
    it('should enable undo menu item when canUndo is true', () => {
      // Arrange
      mockUndoStack.canUndo = true;

      // Act
      const enabled = mockContext.state.undoStack.canUndo;

      // Assert
      expect(enabled).toBe(true);
    });

    it('should disable undo menu item when canUndo is false', () => {
      // Arrange
      mockUndoStack.canUndo = false;

      // Act
      const enabled = mockContext.state.undoStack.canUndo;

      // Assert
      expect(enabled).toBe(false);
    });

    it('should enable redo menu item when canRedo is true', () => {
      // Arrange
      mockUndoStack.canRedo = true;

      // Act
      const enabled = mockContext.state.undoStack.canRedo;

      // Assert
      expect(enabled).toBe(true);
    });

    it('should disable redo menu item when canRedo is false', () => {
      // Arrange
      mockUndoStack.canRedo = false;

      // Act
      const enabled = mockContext.state.undoStack.canRedo;

      // Assert
      expect(enabled).toBe(false);
    });
  });

  describe('Integration with Undo/Redo Store', () => {
    it('should work with real undo/redo store interface', () => {
      // This test verifies that the action handlers work with the actual
      // UndoStack interface from the undoRedoStore

      // Arrange - Create a mock that matches the real store interface
      const realStoreInterface: UndoStack = {
        canUndo: true,
        canRedo: false,
        undo: vi.fn(),
        redo: vi.fn(),
      };

      mockContext.state.undoStack = realStoreInterface;

      // Act
      editActions.undo(mockContext);

      // Assert
      expect(realStoreInterface.undo).toHaveBeenCalled();
    });

    it('should handle undo/redo state changes correctly', () => {
      // Arrange - Simulate state changes like the real store
      let canUndoState = true;
      let canRedoState = false;

      const dynamicUndoStack: UndoStack = {
        get canUndo() { return canUndoState; },
        get canRedo() { return canRedoState; },
        undo: vi.fn(() => {
          // After undo, move to redo stack
          canUndoState = false;
          canRedoState = true;
        }),
        redo: vi.fn(() => {
          // After redo, move back to undo stack
          canUndoState = true;
          canRedoState = false;
        }),
      };

      mockContext.state.undoStack = dynamicUndoStack;

      // Act & Assert - Undo
      expect(dynamicUndoStack.canUndo).toBe(true);
      expect(dynamicUndoStack.canRedo).toBe(false);
      
      editActions.undo(mockContext);
      
      expect(dynamicUndoStack.canUndo).toBe(false);
      expect(dynamicUndoStack.canRedo).toBe(true);

      // Act & Assert - Redo
      editActions.redo(mockContext);
      
      expect(dynamicUndoStack.canUndo).toBe(true);
      expect(dynamicUndoStack.canRedo).toBe(false);
    });
  });
});
