/**
 * Undo/Redo Store Integration Tests
 * 
 * Tests the complete integration between menu actions and the actual undo/redo store.
 * 
 * Requirements: 2.1-2.4
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { editActions } from '../menuActions';
import { useUndoRedoStore, createOperation } from '../../../stores/undoRedoStore';
import type { ActionContext } from '../../../types/menuConfig';
import type { AppState } from '../../../types/menuBarState';
import { DEFAULT_VIEW_STATE } from '../../../types/menuBarState';

describe('Undo/Redo Store Integration', () => {
  let mockContext: ActionContext;

  beforeEach(() => {
    // Clear the undo/redo store before each test
    useUndoRedoStore.getState().clearHistory();

    // Create mock action context with real store methods
    const store = useUndoRedoStore.getState();
    
    const mockState: AppState = {
      project: null,
      hasUnsavedChanges: false,
      viewState: DEFAULT_VIEW_STATE,
      undoStack: {
        canUndo: store.canUndo(),
        canRedo: store.canRedo(),
        undo: () => {
          const operation = store.undo();
          // Update the canUndo/canRedo flags after operation
          mockState.undoStack.canUndo = store.canUndo();
          mockState.undoStack.canRedo = store.canRedo();
          return operation;
        },
        redo: () => {
          const operation = store.redo();
          // Update the canUndo/canRedo flags after operation
          mockState.undoStack.canUndo = store.canUndo();
          mockState.undoStack.canRedo = store.canRedo();
          return operation;
        },
      },
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
        },
      },
    };
  });

  describe('Complete Undo/Redo Flow', () => {
    it('should handle complete undo/redo cycle with real store', () => {
      const store = useUndoRedoStore.getState();

      // Initially, no operations available
      expect(store.canUndo()).toBe(false);
      expect(store.canRedo()).toBe(false);

      // Add an operation to the store
      const operation1 = createOperation(
        'transform',
        'Move panel',
        'panel-1',
        { x: 0, y: 0 },
        { x: 100, y: 100 }
      );
      store.pushOperation(operation1);

      // Update context state
      mockContext.state.undoStack.canUndo = store.canUndo();
      mockContext.state.undoStack.canRedo = store.canRedo();

      // Now undo should be available
      expect(mockContext.state.undoStack.canUndo).toBe(true);
      expect(mockContext.state.undoStack.canRedo).toBe(false);

      // Perform undo via menu action
      editActions.undo(mockContext);

      // After undo, redo should be available
      expect(mockContext.state.undoStack.canUndo).toBe(false);
      expect(mockContext.state.undoStack.canRedo).toBe(true);

      // Verify notification was shown
      expect(mockContext.services.notification.show).toHaveBeenCalledWith({
        type: 'info',
        message: 'Action undone',
        duration: 2000,
      });

      // Perform redo via menu action
      editActions.redo(mockContext);

      // After redo, undo should be available again
      expect(mockContext.state.undoStack.canUndo).toBe(true);
      expect(mockContext.state.undoStack.canRedo).toBe(false);

      // Verify notification was shown
      expect(mockContext.services.notification.show).toHaveBeenCalledWith({
        type: 'info',
        message: 'Action redone',
        duration: 2000,
      });
    });

    it('should handle multiple operations in undo stack', () => {
      const store = useUndoRedoStore.getState();

      // Add multiple operations
      const operation1 = createOperation('transform', 'Move 1', 'panel-1', {}, {});
      const operation2 = createOperation('transform', 'Move 2', 'panel-1', {}, {});
      const operation3 = createOperation('transform', 'Move 3', 'panel-1', {}, {});

      store.pushOperation(operation1);
      store.pushOperation(operation2);
      store.pushOperation(operation3);

      // Update context
      mockContext.state.undoStack.canUndo = store.canUndo();
      mockContext.state.undoStack.canRedo = store.canRedo();

      // Should be able to undo
      expect(mockContext.state.undoStack.canUndo).toBe(true);
      expect(store.getUndoStack()).toHaveLength(3);

      // Undo first operation
      editActions.undo(mockContext);
      expect(store.getUndoStack()).toHaveLength(2);
      expect(store.getRedoStack()).toHaveLength(1);

      // Undo second operation
      mockContext.state.undoStack.canUndo = store.canUndo();
      editActions.undo(mockContext);
      expect(store.getUndoStack()).toHaveLength(1);
      expect(store.getRedoStack()).toHaveLength(2);

      // Undo third operation
      mockContext.state.undoStack.canUndo = store.canUndo();
      editActions.undo(mockContext);
      expect(store.getUndoStack()).toHaveLength(0);
      expect(store.getRedoStack()).toHaveLength(3);

      // Now undo should not be available
      mockContext.state.undoStack.canUndo = store.canUndo();
      expect(mockContext.state.undoStack.canUndo).toBe(false);

      // But redo should be available
      mockContext.state.undoStack.canRedo = store.canRedo();
      expect(mockContext.state.undoStack.canRedo).toBe(true);
    });

    it('should clear redo stack when new operation is added after undo', () => {
      const store = useUndoRedoStore.getState();

      // Add operations
      const operation1 = createOperation('transform', 'Move 1', 'panel-1', {}, {});
      const operation2 = createOperation('transform', 'Move 2', 'panel-1', {}, {});

      store.pushOperation(operation1);
      store.pushOperation(operation2);

      // Undo one operation
      mockContext.state.undoStack.canUndo = store.canUndo();
      editActions.undo(mockContext);

      // Verify redo is available
      mockContext.state.undoStack.canRedo = store.canRedo();
      expect(mockContext.state.undoStack.canRedo).toBe(true);
      expect(store.getRedoStack()).toHaveLength(1);

      // Add a new operation (should clear redo stack)
      const operation3 = createOperation('transform', 'Move 3', 'panel-1', {}, {});
      store.pushOperation(operation3);

      // Redo should no longer be available
      mockContext.state.undoStack.canRedo = store.canRedo();
      expect(mockContext.state.undoStack.canRedo).toBe(false);
      expect(store.getRedoStack()).toHaveLength(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle undo when stack is empty', () => {
      const store = useUndoRedoStore.getState();

      // Ensure stack is empty
      expect(store.canUndo()).toBe(false);
      mockContext.state.undoStack.canUndo = false;

      // Try to undo
      editActions.undo(mockContext);

      // Should not show notification
      expect(mockContext.services.notification.show).not.toHaveBeenCalled();
    });

    it('should handle redo when stack is empty', () => {
      const store = useUndoRedoStore.getState();

      // Ensure stack is empty
      expect(store.canRedo()).toBe(false);
      mockContext.state.undoStack.canRedo = false;

      // Try to redo
      editActions.redo(mockContext);

      // Should not show notification
      expect(mockContext.services.notification.show).not.toHaveBeenCalled();
    });

    it('should handle maximum stack size', () => {
      const store = useUndoRedoStore.getState();
      const maxSize = store.maxStackSize;

      // Add more operations than max size
      for (let i = 0; i < maxSize + 10; i++) {
        const operation = createOperation('transform', `Move ${i}`, 'panel-1', {}, {});
        store.pushOperation(operation);
      }

      // Stack should not exceed max size
      expect(store.getUndoStack().length).toBeLessThanOrEqual(maxSize);
      expect(store.getUndoStack().length).toBe(maxSize);
    });
  });

  describe('Notification Integration', () => {
    it('should show notification with correct message for undo', () => {
      const store = useUndoRedoStore.getState();
      
      // Add operation
      const operation = createOperation('transform', 'Move panel', 'panel-1', {}, {});
      store.pushOperation(operation);
      
      mockContext.state.undoStack.canUndo = store.canUndo();

      // Perform undo
      editActions.undo(mockContext);

      // Verify notification
      expect(mockContext.services.notification.show).toHaveBeenCalledWith({
        type: 'info',
        message: 'Action undone',
        duration: 2000,
      });
    });

    it('should show notification with correct message for redo', () => {
      const store = useUndoRedoStore.getState();
      
      // Add and undo operation
      const operation = createOperation('transform', 'Move panel', 'panel-1', {}, {});
      store.pushOperation(operation);
      mockContext.state.undoStack.canUndo = store.canUndo();
      editActions.undo(mockContext);
      
      mockContext.state.undoStack.canRedo = store.canRedo();

      // Clear previous notification calls
      vi.clearAllMocks();

      // Perform redo
      editActions.redo(mockContext);

      // Verify notification
      expect(mockContext.services.notification.show).toHaveBeenCalledWith({
        type: 'info',
        message: 'Action redone',
        duration: 2000,
      });
    });
  });
});
