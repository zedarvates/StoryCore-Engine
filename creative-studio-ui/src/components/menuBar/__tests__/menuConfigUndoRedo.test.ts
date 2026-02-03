/**
 * Menu Configuration Undo/Redo Tests
 * 
 * Tests that the menu configuration properly connects undo/redo enabled states
 * to the undo stack.
 * 
 * Requirements: 2.1-2.4, 8.1
 */

import { describe, it, expect } from 'vitest';
import { menuBarConfig } from '../../../config/menuBarConfig';
import { evaluateEnabled } from '../../../types/menuConfig';
import type { AppState } from '../../../types/menuBarState';
import { DEFAULT_VIEW_STATE } from '../../../types/menuBarState';

describe('Menu Configuration - Undo/Redo Enabled States', () => {
  // Helper to create app state with specific undo/redo capabilities
  const createAppState = (canUndo: boolean, canRedo: boolean): AppState => ({
    project: null,
    hasUnsavedChanges: false,
    viewState: DEFAULT_VIEW_STATE,
    undoStack: {
      canUndo,
      canRedo,
      undo: () => {},
      redo: () => {},
    },
    clipboard: {
      hasContent: false,
      contentType: null,
      cut: () => {},
      copy: () => {},
      paste: () => {},
    },
    isProcessing: false,
  });

  // Find Edit menu in config
  const editMenu = menuBarConfig.find(menu => menu.id === 'edit');
  
  if (!editMenu) {
    throw new Error('Edit menu not found in menuBarConfig');
  }

  // Find undo and redo menu items
  const undoItem = editMenu.items.find(item => item.id === 'undo');
  const redoItem = editMenu.items.find(item => item.id === 'redo');

  if (!undoItem || !redoItem) {
    throw new Error('Undo or Redo menu item not found in Edit menu');
  }

  describe('Undo Menu Item', () => {
    it('should be enabled when canUndo is true', () => {
      // Arrange
      const state = createAppState(true, false);

      // Act
      const enabled = evaluateEnabled(undoItem.enabled, state);

      // Assert
      expect(enabled).toBe(true);
    });

    it('should be disabled when canUndo is false', () => {
      // Arrange
      const state = createAppState(false, false);

      // Act
      const enabled = evaluateEnabled(undoItem.enabled, state);

      // Assert
      expect(enabled).toBe(false);
    });

    it('should have correct configuration', () => {
      // Assert
      expect(undoItem.id).toBe('undo');
      expect(undoItem.label).toBe('menu.edit.undo');
      expect(undoItem.type).toBe('action');
      expect(undoItem.visible).toBe(true);
      expect(undoItem.shortcut).toEqual({ key: 'z', ctrl: true });
      expect(undoItem.action).toBeDefined();
    });
  });

  describe('Redo Menu Item', () => {
    it('should be enabled when canRedo is true', () => {
      // Arrange
      const state = createAppState(false, true);

      // Act
      const enabled = evaluateEnabled(redoItem.enabled, state);

      // Assert
      expect(enabled).toBe(true);
    });

    it('should be disabled when canRedo is false', () => {
      // Arrange
      const state = createAppState(false, false);

      // Act
      const enabled = evaluateEnabled(redoItem.enabled, state);

      // Assert
      expect(enabled).toBe(false);
    });

    it('should have correct configuration', () => {
      // Assert
      expect(redoItem.id).toBe('redo');
      expect(redoItem.label).toBe('menu.edit.redo');
      expect(redoItem.type).toBe('action');
      expect(redoItem.visible).toBe(true);
      expect(redoItem.shortcut).toEqual({ key: 'y', ctrl: true });
      expect(redoItem.action).toBeDefined();
    });
  });

  describe('Dynamic State Changes', () => {
    it('should update enabled state when undo stack changes', () => {
      // Arrange - Start with no undo available
      let state = createAppState(false, false);
      
      // Act & Assert - Initially disabled
      expect(evaluateEnabled(undoItem.enabled, state)).toBe(false);
      expect(evaluateEnabled(redoItem.enabled, state)).toBe(false);

      // Arrange - Simulate adding an operation (undo becomes available)
      state = createAppState(true, false);
      
      // Act & Assert - Undo enabled, redo still disabled
      expect(evaluateEnabled(undoItem.enabled, state)).toBe(true);
      expect(evaluateEnabled(redoItem.enabled, state)).toBe(false);

      // Arrange - Simulate undo operation (redo becomes available)
      state = createAppState(false, true);
      
      // Act & Assert - Undo disabled, redo enabled
      expect(evaluateEnabled(undoItem.enabled, state)).toBe(false);
      expect(evaluateEnabled(redoItem.enabled, state)).toBe(true);

      // Arrange - Simulate redo operation (back to undo available)
      state = createAppState(true, false);
      
      // Act & Assert - Undo enabled, redo disabled
      expect(evaluateEnabled(undoItem.enabled, state)).toBe(true);
      expect(evaluateEnabled(redoItem.enabled, state)).toBe(false);
    });

    it('should handle both undo and redo available simultaneously', () => {
      // Arrange - Both operations available (middle of undo stack)
      const state = createAppState(true, true);

      // Act & Assert
      expect(evaluateEnabled(undoItem.enabled, state)).toBe(true);
      expect(evaluateEnabled(redoItem.enabled, state)).toBe(true);
    });
  });

  describe('Menu Item Separation', () => {
    it('should have undo and redo as separate items', () => {
      // Assert
      expect(undoItem).not.toBe(redoItem);
      expect(undoItem.id).not.toBe(redoItem.id);
    });

    it('should have undo before redo in menu order', () => {
      // Find indices
      const undoIndex = editMenu.items.findIndex(item => item.id === 'undo');
      const redoIndex = editMenu.items.findIndex(item => item.id === 'redo');

      // Assert
      expect(undoIndex).toBeGreaterThanOrEqual(0);
      expect(redoIndex).toBeGreaterThanOrEqual(0);
      expect(undoIndex).toBeLessThan(redoIndex);
    });
  });

  describe('Requirements Validation', () => {
    it('should satisfy Requirement 2.1: Undo menu item reverts last action', () => {
      // Requirement 2.1: WHEN a user clicks "Edit > Undo", 
      // THE Menu_Bar SHALL revert the last action from the Undo_Stack
      
      // Assert - Undo item exists and has action
      expect(undoItem).toBeDefined();
      expect(undoItem.action).toBeDefined();
      expect(undoItem.label).toBe('menu.edit.undo');
    });

    it('should satisfy Requirement 2.2: Redo menu item reapplies last undone action', () => {
      // Requirement 2.2: WHEN a user clicks "Edit > Redo", 
      // THE Menu_Bar SHALL reapply the last undone action from the Undo_Stack
      
      // Assert - Redo item exists and has action
      expect(redoItem).toBeDefined();
      expect(redoItem.action).toBeDefined();
      expect(redoItem.label).toBe('menu.edit.redo');
    });

    it('should satisfy Requirement 2.3: Undo disabled when no actions available', () => {
      // Requirement 2.3: WHEN no undo actions are available, 
      // THE Menu_Bar SHALL disable the "Undo" menu item
      
      // Arrange
      const state = createAppState(false, false);

      // Act & Assert
      expect(evaluateEnabled(undoItem.enabled, state)).toBe(false);
    });

    it('should satisfy Requirement 2.4: Redo disabled when no actions available', () => {
      // Requirement 2.4: WHEN no redo actions are available, 
      // THE Menu_Bar SHALL disable the "Redo" menu item
      
      // Arrange
      const state = createAppState(false, false);

      // Act & Assert
      expect(evaluateEnabled(redoItem.enabled, state)).toBe(false);
    });
  });
});
