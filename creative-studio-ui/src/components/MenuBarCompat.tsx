/**
 * MenuBar Compatibility Wrapper
 * 
 * Provides a backward-compatible interface for the new comprehensive MenuBar.
 * This wrapper provides default props and state management for applications
 * that don't yet have full integration with the new MenuBar's prop requirements.
 * 
 * For full functionality, use the MenuBar component directly from menuBar/MenuBar
 * and provide all required props.
 * 
 * @module components/MenuBarCompat
 */

import React, { useState, useCallback } from 'react';
import { MenuBar } from './menuBar';
import { DEFAULT_VIEW_STATE } from '../types/menuBarState';
import type { ViewState, UndoStack, ClipboardState } from '../types/menuBarState';
import type { Project } from '../types';

/**
 * MenuBarCompat Component
 * 
 * A backward-compatible wrapper for the new MenuBar that provides default props.
 * This allows existing code to continue working while migration to the full
 * MenuBar interface is in progress.
 * 
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <div>
 *       <MenuBarCompat />
 *       <MainContent />
 *     </div>
 *   );
 * }
 * ```
 */
export function MenuBarCompat(): React.ReactElement {
  // State management with defaults
  const [project, setProject] = useState<Project | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [viewState, setViewState] = useState<ViewState>(DEFAULT_VIEW_STATE);

  // Default undo/redo stack (no-op implementation)
  const undoStack: UndoStack = {
    canUndo: false,
    canRedo: false,
    undo: () => {
      console.warn('Undo not implemented in compatibility mode');
    },
    redo: () => {
      console.warn('Redo not implemented in compatibility mode');
    },
  };

  // Default clipboard state (no-op implementation)
  const clipboard: ClipboardState = {
    hasContent: false,
    contentType: null,
    cut: (content: unknown) => {
      console.warn('Cut not implemented in compatibility mode');
    },
    copy: (content: unknown) => {
      console.warn('Copy not implemented in compatibility mode');
    },
    paste: () => {
      console.warn('Paste not implemented in compatibility mode');
      return null;
    },
  };

  // Handle project changes
  const handleProjectChange = useCallback((newProject: Project | null) => {
    setProject(newProject);
    setHasUnsavedChanges(false);
  }, []);

  // Handle view state changes
  const handleViewStateChange = useCallback((changes: Partial<ViewState>) => {
    setViewState((prev) => ({ ...prev, ...changes }));
  }, []);

  return (
    <MenuBar
      project={project}
      hasUnsavedChanges={hasUnsavedChanges}
      onProjectChange={handleProjectChange}
      onViewStateChange={handleViewStateChange}
      viewState={viewState}
      undoStack={undoStack}
      clipboard={clipboard}
      isProcessing={false}
    />
  );
}

export default MenuBarCompat;

