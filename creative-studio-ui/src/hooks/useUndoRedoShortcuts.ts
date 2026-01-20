/**
 * useUndoRedoShortcuts Hook - Keyboard shortcuts for undo/redo
 * 
 * This hook provides:
 * - Ctrl+Z / Cmd+Z for undo
 * - Ctrl+Shift+Z / Cmd+Shift+Z for redo
 * - Ctrl+Y / Cmd+Y for redo (Windows/Linux alternative)
 * - Visual feedback in UI
 * 
 * Requirements: 7.2, 7.3, 7.6
 */

import { useEffect, useCallback } from 'react';

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Callback functions for undo/redo actions
 */
export interface UndoRedoCallbacks {
  /** Function to call when undo is triggered */
  onUndo: () => void;
  
  /** Function to call when redo is triggered */
  onRedo: () => void;
  
  /** Optional callback when shortcut is triggered (for UI feedback) */
  onShortcutTriggered?: (action: 'undo' | 'redo') => void;
}

/**
 * Configuration options for keyboard shortcuts
 */
export interface ShortcutOptions {
  /** Enable shortcuts (default: true) */
  enabled?: boolean;
  
  /** Prevent default browser behavior (default: true) */
  preventDefault?: boolean;
  
  /** Stop event propagation (default: false) */
  stopPropagation?: boolean;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * React hook to set up undo/redo keyboard shortcuts
 * 
 * Requirements: 7.2, 7.3, 7.6
 * 
 * @param callbacks - Undo/redo callback functions
 * @param options - Configuration options
 * 
 * @example
 * // Basic usage
 * useUndoRedoShortcuts({
 *   onUndo: () => manager.undo(),
 *   onRedo: () => manager.redo()
 * });
 * 
 * @example
 * // With UI feedback
 * useUndoRedoShortcuts({
 *   onUndo: () => manager.undo(),
 *   onRedo: () => manager.redo(),
 *   onShortcutTriggered: (action) => {
 *     toast.info(`${action === 'undo' ? 'Undoing' : 'Redoing'} action...`);
 *   }
 * });
 */
export function useUndoRedoShortcuts(
  callbacks: UndoRedoCallbacks,
  options: ShortcutOptions = {}
): void {
  const {
    enabled = true,
    preventDefault = true,
    stopPropagation = false
  } = options;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!enabled) return;

    // Check for Ctrl (Windows/Linux) or Cmd (Mac)
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    
    if (!isCtrlOrCmd) return;

    // Undo: Ctrl+Z / Cmd+Z (without Shift)
    if (event.key === 'z' && !event.shiftKey) {
      if (preventDefault) event.preventDefault();
      if (stopPropagation) event.stopPropagation();
      
      callbacks.onUndo();
      callbacks.onShortcutTriggered?.('undo');
      return;
    }

    // Redo: Ctrl+Shift+Z / Cmd+Shift+Z
    if (event.key === 'z' && event.shiftKey) {
      if (preventDefault) event.preventDefault();
      if (stopPropagation) event.stopPropagation();
      
      callbacks.onRedo();
      callbacks.onShortcutTriggered?.('redo');
      return;
    }

    // Redo: Ctrl+Y / Cmd+Y (Windows/Linux alternative)
    if (event.key === 'y') {
      if (preventDefault) event.preventDefault();
      if (stopPropagation) event.stopPropagation();
      
      callbacks.onRedo();
      callbacks.onShortcutTriggered?.('redo');
      return;
    }
  }, [callbacks, enabled, preventDefault, stopPropagation]);

  useEffect(() => {
    if (!enabled) return;

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);

    // Cleanup on unmount
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the platform-specific keyboard shortcut text
 * 
 * @param action - The action ('undo' or 'redo')
 * @returns Human-readable shortcut text
 * 
 * @example
 * getShortcutText('undo') // Returns "Ctrl+Z" on Windows, "⌘Z" on Mac
 */
export function getShortcutText(action: 'undo' | 'redo'): string {
  const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const modifier = isMac ? '⌘' : 'Ctrl+';

  if (action === 'undo') {
    return `${modifier}Z`;
  } else {
    return isMac ? `⌘⇧Z` : 'Ctrl+Shift+Z';
  }
}

/**
 * Check if the current platform is Mac
 * 
 * @returns True if running on Mac
 */
export function isMacPlatform(): boolean {
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
}

// ============================================================================
// Legacy Support
// ============================================================================

/**
 * Legacy function for backward compatibility
 * 
 * @deprecated Use useUndoRedoShortcuts hook instead
 */
export function setupUndoRedoShortcuts(
  onUndo: () => void,
  onRedo: () => void
): () => void {
  const handleKeyDown = (event: KeyboardEvent) => {
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    
    if (isCtrlOrCmd && event.key === 'z' && !event.shiftKey) {
      event.preventDefault();
      onUndo();
    }
    
    if (
      (isCtrlOrCmd && event.key === 'y') ||
      (isCtrlOrCmd && event.shiftKey && event.key === 'z')
    ) {
      event.preventDefault();
      onRedo();
    }
  };
  
  window.addEventListener('keydown', handleKeyDown);
  
  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}
