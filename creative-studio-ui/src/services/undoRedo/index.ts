/**
 * Undo/Redo Service Module
 * 
 * Exports the UndoRedoManager and related utilities
 */

export { UndoRedoManager, createUndoRedoManager } from './UndoRedoManager';
export type { HistoryEntry, UndoRedoConfig } from './UndoRedoManager';

export {
  UndoRedoPersistence,
  getPersistenceInstance,
  initializePersistence
} from './UndoRedoPersistence';
export type { PersistedHistory, PersistenceConfig } from './UndoRedoPersistence';
