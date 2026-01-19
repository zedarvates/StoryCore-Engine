/**
 * useKeyboardShortcuts Hook - Keyboard shortcut system for Grid Editor
 * 
 * Provides keyboard shortcuts for:
 * - Tool selection: V (select), C (crop), R (rotate), S (scale), A (annotate)
 * - Undo/Redo: Ctrl+Z (undo), Ctrl+Shift+Z (redo), Ctrl+Y (redo)
 * - Panel operations: Delete/Backspace (delete), Ctrl+D (duplicate), Ctrl+A (select all)
 * - Navigation: Space (pan), F (focus), [ and ] (cycle panels)
 * - Viewport: Escape (deselect all)
 * 
 * Requirements: 8.1-8.12
 */

import { useEffect, useCallback, useRef } from 'react';
import { useGridStore } from '../../stores/gridEditorStore';
import { useUndoRedoStore } from '../../stores/undoRedoStore';
import { useViewportStore } from '../../stores/viewportStore';

// ============================================================================
// Type Definitions
// ============================================================================

export interface KeyboardShortcutsConfig {
  /**
   * Enable/disable shortcuts globally
   */
  enabled?: boolean;

  /**
   * Callback when a shortcut is triggered
   */
  onShortcut?: (action: string, key: string) => void;

  /**
   * Grid bounds for focus mode
   */
  gridBounds?: { width: number; height: number };

  /**
   * Callback for delete action
   */
  onDelete?: () => void;

  /**
   * Callback for duplicate action
   */
  onDuplicate?: () => void;
}

// ============================================================================
// Keyboard Shortcuts Hook
// ============================================================================

export const useKeyboardShortcuts = (config: KeyboardShortcutsConfig = {}) => {
  const {
    enabled = true,
    onShortcut,
    gridBounds,
    onDelete,
    onDuplicate,
  } = config;

  // ============================================================================
  // Store Hooks
  // ============================================================================

  const setActiveTool = useGridStore((state) => state.setActiveTool);
  const deselectAll = useGridStore((state) => state.deselectAll);
  const selectedPanelIds = useGridStore((state) => state.selectedPanelIds);
  const getAllPanels = useGridStore((state) => state.getAllPanels);
  const selectPanel = useGridStore((state) => state.selectPanel);

  const undo = useUndoRedoStore((state) => state.undo);
  const redo = useUndoRedoStore((state) => state.redo);
  const canUndo = useUndoRedoStore((state) => state.canUndo());
  const canRedo = useUndoRedoStore((state) => state.canRedo());

  const focusPanel = useViewportStore((state) => state.focusPanel);
  const exitFocusMode = useViewportStore((state) => state.exitFocusMode);
  const focusedPanelId = useViewportStore((state) => state.focusedPanelId);

  // ============================================================================
  // State
  // ============================================================================

  const isSpacePressed = useRef(false);

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Check if the event target is an input element
   */
  const isInputElement = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) {
      return false;
    }

    const tagName = target.tagName.toLowerCase();
    const isContentEditable = target.isContentEditable;

    return (
      tagName === 'input' ||
      tagName === 'textarea' ||
      tagName === 'select' ||
      isContentEditable
    );
  };

  /**
   * Cycle through panels in sequence
   */
  const cyclePanels = useCallback(
    (direction: 'next' | 'prev') => {
      const panels = getAllPanels();
      if (panels.length === 0) return;

      const currentIndex = selectedPanelIds.length > 0
        ? panels.findIndex((p) => p.id === selectedPanelIds[0])
        : -1;

      let nextIndex: number;
      if (direction === 'next') {
        nextIndex = currentIndex < panels.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : panels.length - 1;
      }

      const nextPanel = panels[nextIndex];
      if (nextPanel) {
        selectPanel(nextPanel.id, false);
        onShortcut?.('cycle_panel', direction);
      }
    },
    [getAllPanels, selectedPanelIds, selectPanel, onShortcut]
  );

  /**
   * Select all panels
   */
  const selectAllPanels = useCallback(() => {
    const panels = getAllPanels();
    panels.forEach((panel, index) => {
      selectPanel(panel.id, index > 0);
    });
    onShortcut?.('select_all', 'Ctrl+A');
  }, [getAllPanels, selectPanel, onShortcut]);

  /**
   * Handle focus mode toggle
   */
  const handleFocusToggle = useCallback(() => {
    if (focusedPanelId) {
      exitFocusMode();
      onShortcut?.('exit_focus', 'F');
    } else if (selectedPanelIds.length === 1 && gridBounds) {
      focusPanel(selectedPanelIds[0], gridBounds);
      onShortcut?.('enter_focus', 'F');
    }
  }, [focusedPanelId, selectedPanelIds, gridBounds, focusPanel, exitFocusMode, onShortcut]);

  // ============================================================================
  // Keyboard Event Handlers
  // ============================================================================

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when typing in input fields
      if (isInputElement(event.target)) return;

      const { key, ctrlKey, metaKey, shiftKey } = event;
      const isModifier = ctrlKey || metaKey;

      // ============================================================================
      // Tool Selection Shortcuts (Requirements 8.1-8.4)
      // ============================================================================

      if (!isModifier && !shiftKey) {
        switch (key.toLowerCase()) {
          case 'v':
            setActiveTool('select');
            onShortcut?.('tool_select', 'V');
            event.preventDefault();
            return;

          case 'c':
            setActiveTool('crop');
            onShortcut?.('tool_crop', 'C');
            event.preventDefault();
            return;

          case 'r':
            setActiveTool('rotate');
            onShortcut?.('tool_rotate', 'R');
            event.preventDefault();
            return;

          case 's':
            setActiveTool('scale');
            onShortcut?.('tool_scale', 'S');
            event.preventDefault();
            return;

          case 'a':
            setActiveTool('annotate');
            onShortcut?.('tool_annotate', 'A');
            event.preventDefault();
            return;
        }
      }

      // ============================================================================
      // Undo/Redo Shortcuts (Requirements 8.5, 8.6)
      // ============================================================================

      if (isModifier) {
        // Ctrl+Z or Cmd+Z - Undo
        if (key.toLowerCase() === 'z' && !shiftKey) {
          if (canUndo) {
            undo();
            onShortcut?.('undo', 'Ctrl+Z');
          }
          event.preventDefault();
          return;
        }

        // Ctrl+Shift+Z or Cmd+Shift+Z - Redo
        if (key.toLowerCase() === 'z' && shiftKey) {
          if (canRedo) {
            redo();
            onShortcut?.('redo', 'Ctrl+Shift+Z');
          }
          event.preventDefault();
          return;
        }

        // Ctrl+Y or Cmd+Y - Redo (alternative)
        if (key.toLowerCase() === 'y') {
          if (canRedo) {
            redo();
            onShortcut?.('redo', 'Ctrl+Y');
          }
          event.preventDefault();
          return;
        }

        // Ctrl+A or Cmd+A - Select All (Requirement 8.9)
        if (key.toLowerCase() === 'a') {
          selectAllPanels();
          event.preventDefault();
          return;
        }

        // Ctrl+D or Cmd+D - Duplicate (Requirement 8.8)
        if (key.toLowerCase() === 'd') {
          onDuplicate?.();
          onShortcut?.('duplicate', 'Ctrl+D');
          event.preventDefault();
          return;
        }
      }

      // ============================================================================
      // Delete Shortcut (Requirement 8.7)
      // ============================================================================

      if (key === 'Delete' || key === 'Backspace') {
        if (selectedPanelIds.length > 0) {
          onDelete?.();
          onShortcut?.('delete', key);
          event.preventDefault();
        }
        return;
      }

      // ============================================================================
      // Navigation Shortcuts (Requirements 8.10, 8.11, 8.12)
      // ============================================================================

      // Space - Pan tool (temporary activation)
      if (key === ' ') {
        if (!isSpacePressed.current) {
          isSpacePressed.current = true;
          setActiveTool('pan');
          onShortcut?.('pan_start', 'Space');
        }
        event.preventDefault();
        return;
      }

      // F - Focus mode toggle (Requirement 8.11)
      if (key.toLowerCase() === 'f' && !isModifier) {
        handleFocusToggle();
        event.preventDefault();
        return;
      }

      // [ - Cycle to previous panel (Requirement 8.12)
      if (key === '[' && !isModifier) {
        cyclePanels('prev');
        event.preventDefault();
        return;
      }

      // ] - Cycle to next panel (Requirement 8.12)
      if (key === ']' && !isModifier) {
        cyclePanels('next');
        event.preventDefault();
        return;
      }

      // Escape - Deselect all (Requirement 2.4)
      if (key === 'Escape') {
        if (focusedPanelId) {
          exitFocusMode();
          onShortcut?.('exit_focus', 'Escape');
        } else {
          deselectAll();
          onShortcut?.('deselect_all', 'Escape');
        }
        event.preventDefault();
        return;
      }
    },
    [
      enabled,
      setActiveTool,
      undo,
      redo,
      canUndo,
      canRedo,
      deselectAll,
      selectedPanelIds,
      focusedPanelId,
      exitFocusMode,
      onShortcut,
      onDelete,
      onDuplicate,
      selectAllPanels,
      cyclePanels,
      handleFocusToggle,
    ]
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Space - Release pan tool
      if (event.key === ' ') {
        if (isSpacePressed.current) {
          isSpacePressed.current = false;
          setActiveTool('select');
          onShortcut?.('pan_end', 'Space');
        }
        event.preventDefault();
      }
    },
    [enabled, setActiveTool, onShortcut]
  );

  // ============================================================================
  // Effect - Register Event Listeners
  // ============================================================================

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [enabled, handleKeyDown, handleKeyUp]);

  // ============================================================================
  // Return API
  // ============================================================================

  return {
    /**
     * Check if Space key is currently pressed
     */
    isSpacePressed: isSpacePressed.current,

    /**
     * Manually trigger a shortcut action
     */
    triggerShortcut: (action: string) => {
      switch (action) {
        case 'undo':
          if (canUndo) undo();
          break;
        case 'redo':
          if (canRedo) redo();
          break;
        case 'select_all':
          selectAllPanels();
          break;
        case 'deselect_all':
          deselectAll();
          break;
        case 'focus_toggle':
          handleFocusToggle();
          break;
        case 'cycle_next':
          cyclePanels('next');
          break;
        case 'cycle_prev':
          cyclePanels('prev');
          break;
        default:
          console.warn(`Unknown shortcut action: ${action}`);
      }
    },
  };
};

// ============================================================================
// Export
// ============================================================================

export default useKeyboardShortcuts;
