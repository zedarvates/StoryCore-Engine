/**
 * UndoRedoExample - Comprehensive example of undo/redo system usage
 * 
 * This example demonstrates:
 * - Basic undo/redo with useUndoRedo hook
 * - Keyboard shortcuts integration
 * - UI toolbar with visual feedback
 * - Persistence with IndexedDB
 * - Save point tracking
 */

import React, { useEffect, useState } from 'react';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { useUndoRedoShortcuts } from '../hooks/useUndoRedoShortcuts';
import { UndoRedoToolbar } from '../components/undoRedo';
import { initializePersistence } from '../services/undoRedo';

// ============================================================================
// Type Definitions
// ============================================================================

interface Shot {
  id: string;
  name: string;
  duration: number;
  position: number;
}

interface TimelineState {
  shots: Shot[];
  selectedId: string | null;
}

// ============================================================================
// Example Component
// ============================================================================

/**
 * Example component demonstrating undo/redo functionality
 */
export const UndoRedoExample: React.FC = () => {
  // Initialize state with useUndoRedo hook
  const {
    state,
    execute,
    undo,
    redo,
    canUndo,
    canRedo,
    undoDescription,
    redoDescription,
    markAsSaved,
    hasUnsavedChanges,
    undoStackSize,
    redoStackSize
  } = useUndoRedo<TimelineState>(
    {
      shots: [],
      selectedId: null
    },
    {
      maxStackSize: 50,
      enablePersistence: true,
      storageKey: 'timeline-undo-redo'
    }
  );

  // Set up keyboard shortcuts
  useUndoRedoShortcuts({
    onUndo: undo,
    onRedo: redo,
    onShortcutTriggered: (action) => {
      console.log(`Keyboard shortcut triggered: ${action}`);
    }
  });

  // Initialize IndexedDB persistence
  const [persistenceReady, setPersistenceReady] = useState(false);

  useEffect(() => {
    initializePersistence({
      dbName: 'undoRedoExample',
      storeName: 'history',
      maxAgeDays: 30
    }).then(() => {
      setPersistenceReady(true);
      console.log('Persistence initialized');
    }).catch(error => {
      console.error('Failed to initialize persistence:', error);
    });
  }, []);

  // ============================================================================
  // Action Handlers
  // ============================================================================

  const handleAddShot = () => {
    const newShot: Shot = {
      id: `shot-${Date.now()}`,
      name: `Shot ${state.shots.length + 1}`,
      duration: 5,
      position: state.shots.length
    };

    execute(
      `Add shot: ${newShot.name}`,
      {
        ...state,
        shots: [...state.shots, newShot]
      }
    );
  };

  const handleDeleteShot = (id: string) => {
    const shot = state.shots.find(s => s.id === id);
    if (!shot) return;

    execute(
      `Delete shot: ${shot.name}`,
      {
        ...state,
        shots: state.shots.filter(s => s.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId
      }
    );
  };

  const handleUpdateShot = (id: string, updates: Partial<Shot>) => {
    const shot = state.shots.find(s => s.id === id);
    if (!shot) return;

    execute(
      `Update shot: ${shot.name}`,
      {
        ...state,
        shots: state.shots.map(s =>
          s.id === id ? { ...s, ...updates } : s
        )
      }
    );
  };

  const handleSelectShot = (id: string) => {
    execute(
      `Select shot`,
      {
        ...state,
        selectedId: id
      }
    );
  };

  const handleSave = () => {
    // Simulate save operation
    console.log('Saving state:', state);
    markAsSaved();
    alert('State saved!');
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Undo/Redo System Example</h1>

      {/* Toolbar */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <UndoRedoToolbar
          canUndo={canUndo}
          canRedo={canRedo}
          undoDescription={undoDescription}
          redoDescription={redoDescription}
          hasUnsavedChanges={hasUnsavedChanges}
          onUndo={undo}
          onRedo={redo}
          onSave={handleSave}
        />
      </div>

      {/* Status Panel */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h2 className="text-xl font-semibold mb-3">Status</h2>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium">Undo Stack:</span> {undoStackSize} actions
          </div>
          <div>
            <span className="font-medium">Redo Stack:</span> {redoStackSize} actions
          </div>
          <div>
            <span className="font-medium">Unsaved Changes:</span>{' '}
            <span className={hasUnsavedChanges ? 'text-orange-600' : 'text-green-600'}>
              {hasUnsavedChanges ? 'Yes' : 'No'}
            </span>
          </div>
          <div>
            <span className="font-medium">Persistence:</span>{' '}
            <span className={persistenceReady ? 'text-green-600' : 'text-gray-400'}>
              {persistenceReady ? 'Ready' : 'Initializing...'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions Panel */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-3">Actions</h2>
        <div className="flex gap-2">
          <button
            onClick={handleAddShot}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Add Shot
          </button>
        </div>
      </div>

      {/* Shots List */}
      <div className="p-4 bg-white rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-3">
          Shots ({state.shots.length})
        </h2>

        {state.shots.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No shots yet. Click "Add Shot" to get started.
          </p>
        ) : (
          <div className="space-y-2">
            {state.shots.map(shot => (
              <div
                key={shot.id}
                className={`
                  p-3 rounded border-2 transition-colors
                  ${state.selectedId === shot.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                  }
                `}
                onClick={() => handleSelectShot(shot.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <input
                      type="text"
                      value={shot.name}
                      onChange={(e) => handleUpdateShot(shot.id, { name: e.target.value })}
                      className="font-medium bg-transparent border-none outline-none"
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="text-sm text-gray-600">
                      Duration: {shot.duration}s | Position: {shot.position}
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteShot(shot.id);
                    }}
                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="mt-6 p-4 bg-gray-100 rounded-lg text-sm">
        <h3 className="font-semibold mb-2">Keyboard Shortcuts</h3>
        <ul className="space-y-1 text-gray-700">
          <li>• <kbd className="px-2 py-1 bg-white rounded">Ctrl+Z</kbd> or <kbd className="px-2 py-1 bg-white rounded">⌘Z</kbd> - Undo</li>
          <li>• <kbd className="px-2 py-1 bg-white rounded">Ctrl+Shift+Z</kbd> or <kbd className="px-2 py-1 bg-white rounded">⌘⇧Z</kbd> - Redo</li>
          <li>• <kbd className="px-2 py-1 bg-white rounded">Ctrl+Y</kbd> - Redo (Windows/Linux)</li>
        </ul>
      </div>
    </div>
  );
};

export default UndoRedoExample;
