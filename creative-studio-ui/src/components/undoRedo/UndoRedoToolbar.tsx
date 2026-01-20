/**
 * UndoRedoToolbar Component - UI for undo/redo actions
 * 
 * This component provides:
 * - Undo/Redo buttons with enabled/disabled states
 * - Action descriptions on hover
 * - Keyboard shortcut hints
 * - Visual feedback for unsaved changes
 * 
 * Requirements: 7.6
 */

import React from 'react';
import { Undo2, Redo2, Save } from 'lucide-react';
import { getShortcutText } from '../../hooks/useUndoRedoShortcuts';

// ============================================================================
// Type Definitions
// ============================================================================

export interface UndoRedoToolbarProps {
  /** Whether undo is available */
  canUndo: boolean;
  
  /** Whether redo is available */
  canRedo: boolean;
  
  /** Description of the next undo action */
  undoDescription?: string | null;
  
  /** Description of the next redo action */
  redoDescription?: string | null;
  
  /** Whether there are unsaved changes */
  hasUnsavedChanges?: boolean;
  
  /** Callback when undo is clicked */
  onUndo: () => void;
  
  /** Callback when redo is clicked */
  onRedo: () => void;
  
  /** Optional callback when save is clicked */
  onSave?: () => void;
  
  /** Optional className for styling */
  className?: string;
  
  /** Show save button (default: true) */
  showSaveButton?: boolean;
  
  /** Show action descriptions (default: true) */
  showDescriptions?: boolean;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Toolbar component for undo/redo actions
 * 
 * Requirements: 7.6
 * 
 * @example
 * <UndoRedoToolbar
 *   canUndo={canUndo}
 *   canRedo={canRedo}
 *   undoDescription="Move shot"
 *   redoDescription="Delete shot"
 *   hasUnsavedChanges={true}
 *   onUndo={handleUndo}
 *   onRedo={handleRedo}
 *   onSave={handleSave}
 * />
 */
export const UndoRedoToolbar: React.FC<UndoRedoToolbarProps> = ({
  canUndo,
  canRedo,
  undoDescription,
  redoDescription,
  hasUnsavedChanges = false,
  onUndo,
  onRedo,
  onSave,
  className = '',
  showSaveButton = true,
  showDescriptions = true
}) => {
  // Get platform-specific shortcut text
  const undoShortcut = getShortcutText('undo');
  const redoShortcut = getShortcutText('redo');

  // Build tooltip text
  const undoTooltip = showDescriptions && undoDescription
    ? `Undo: ${undoDescription} (${undoShortcut})`
    : `Undo (${undoShortcut})`;

  const redoTooltip = showDescriptions && redoDescription
    ? `Redo: ${redoDescription} (${redoShortcut})`
    : `Redo (${redoShortcut})`;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Undo Button */}
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title={undoTooltip}
        className={`
          flex items-center gap-1 px-3 py-1.5 rounded
          transition-colors duration-200
          ${canUndo
            ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }
        `}
        aria-label={undoTooltip}
      >
        <Undo2 size={16} />
        <span className="text-sm font-medium">Undo</span>
      </button>

      {/* Redo Button */}
      <button
        onClick={onRedo}
        disabled={!canRedo}
        title={redoTooltip}
        className={`
          flex items-center gap-1 px-3 py-1.5 rounded
          transition-colors duration-200
          ${canRedo
            ? 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer'
            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }
        `}
        aria-label={redoTooltip}
      >
        <Redo2 size={16} />
        <span className="text-sm font-medium">Redo</span>
      </button>

      {/* Save Button (optional) */}
      {showSaveButton && onSave && (
        <>
          <div className="w-px h-6 bg-gray-300" />
          <button
            onClick={onSave}
            title="Save changes"
            className={`
              flex items-center gap-1 px-3 py-1.5 rounded
              transition-colors duration-200
              ${hasUnsavedChanges
                ? 'bg-green-500 hover:bg-green-600 text-white cursor-pointer'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }
            `}
            disabled={!hasUnsavedChanges}
            aria-label="Save changes"
          >
            <Save size={16} />
            <span className="text-sm font-medium">Save</span>
            {hasUnsavedChanges && (
              <span className="ml-1 w-2 h-2 bg-white rounded-full" />
            )}
          </button>
        </>
      )}

      {/* Status Text (optional) */}
      {showDescriptions && (
        <div className="ml-2 text-sm text-gray-600">
          {canUndo && undoDescription && (
            <span>Next: {undoDescription}</span>
          )}
          {!canUndo && <span className="text-gray-400">No actions to undo</span>}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Compact Variant
// ============================================================================

/**
 * Compact version of UndoRedoToolbar with icon-only buttons
 * 
 * @example
 * <UndoRedoToolbarCompact
 *   canUndo={canUndo}
 *   canRedo={canRedo}
 *   onUndo={handleUndo}
 *   onRedo={handleRedo}
 * />
 */
export const UndoRedoToolbarCompact: React.FC<Omit<UndoRedoToolbarProps, 'showDescriptions' | 'showSaveButton'>> = ({
  canUndo,
  canRedo,
  undoDescription,
  redoDescription,
  onUndo,
  onRedo,
  className = ''
}) => {
  const undoShortcut = getShortcutText('undo');
  const redoShortcut = getShortcutText('redo');

  const undoTooltip = undoDescription
    ? `Undo: ${undoDescription} (${undoShortcut})`
    : `Undo (${undoShortcut})`;

  const redoTooltip = redoDescription
    ? `Redo: ${redoDescription} (${redoShortcut})`
    : `Redo (${redoShortcut})`;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <button
        onClick={onUndo}
        disabled={!canUndo}
        title={undoTooltip}
        className={`
          p-2 rounded transition-colors duration-200
          ${canUndo
            ? 'hover:bg-gray-200 text-gray-700 cursor-pointer'
            : 'text-gray-300 cursor-not-allowed'
          }
        `}
        aria-label={undoTooltip}
      >
        <Undo2 size={18} />
      </button>

      <button
        onClick={onRedo}
        disabled={!canRedo}
        title={redoTooltip}
        className={`
          p-2 rounded transition-colors duration-200
          ${canRedo
            ? 'hover:bg-gray-200 text-gray-700 cursor-pointer'
            : 'text-gray-300 cursor-not-allowed'
          }
        `}
        aria-label={redoTooltip}
      >
        <Redo2 size={18} />
      </button>
    </div>
  );
};

export default UndoRedoToolbar;
