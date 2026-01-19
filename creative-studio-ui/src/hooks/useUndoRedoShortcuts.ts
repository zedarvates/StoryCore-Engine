import { useEffect } from 'react';
import { setupUndoRedoShortcuts } from '../store/undoRedo';

/**
 * React hook to set up undo/redo keyboard shortcuts
 * 
 * Usage: Call this hook in your main App component
 * 
 * @example
 * function App() {
 *   useUndoRedoShortcuts();
 *   return <div>...</div>;
 * }
 */
export function useUndoRedoShortcuts(): void {
  useEffect(() => {
    // Set up keyboard shortcuts
    const cleanup = setupUndoRedoShortcuts();
    
    // Clean up on unmount
    return cleanup;
  }, []);
}
