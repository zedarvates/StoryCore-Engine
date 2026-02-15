/**
 * Redux Store Configuration for Sequence Editor Interface
 * 
 * This store manages the state for the professional sequence editing interface,
 * including timeline, assets, panels, tools, preview, and history management.
 * 
 * Requirements: 19.6, 20.1
 */

import { configureStore } from '@reduxjs/toolkit';
import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

// Import reducers
import projectReducer from './slices/projectSlice';
import timelineReducer from './slices/timelineSlice';
import assetsReducer from './slices/assetsSlice';
import panelsReducer from './slices/panelsSlice';
import toolsReducer from './slices/toolsSlice';
import previewReducer from './slices/previewSlice';
import historyReducer from './slices/historySlice';
import effectsReducer from './slices/effectsSlice'; // Phase 1 - R&D
import audioReducer from './slices/audioSlice'; // Phase 1 - R&D

// Import middleware
import { historyMiddleware } from './middleware/historyMiddleware';
import { autoSaveMiddleware } from './middleware/autoSaveMiddleware';

// Root reducer type - define before creating the store
export type RootReducerState = {
  project: ReturnType<typeof projectReducer>;
  timeline: ReturnType<typeof timelineReducer>;
  assets: ReturnType<typeof assetsReducer>;
  panels: ReturnType<typeof panelsReducer>;
  tools: ReturnType<typeof toolsReducer>;
  preview: ReturnType<typeof previewReducer>;
  history: ReturnType<typeof historyReducer>;
  effects: ReturnType<typeof effectsReducer>;
  audio: ReturnType<typeof audioReducer>;
};

// Configure the Redux store
const rootReducer = {
  project: projectReducer,
  timeline: timelineReducer,
  assets: assetsReducer,
  panels: panelsReducer,
  tools: toolsReducer,
  preview: previewReducer,
  history: historyReducer,
  effects: effectsReducer,
  audio: audioReducer,
};

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types for serialization checks
        ignoredActions: ['history/pushHistory'],
        // Ignore these field paths in all actions
        ignoredActionPaths: ['payload.timestamp', 'payload.currentFrame'],
        // Ignore these paths in the state
        ignoredPaths: ['preview.currentFrame', 'history.undoStack', 'history.redoStack'],
      },
    }).concat(historyMiddleware, autoSaveMiddleware),
  devTools: process.env.NODE_ENV !== 'production',
});

// Export store types
// Use RootReducerState (already defined above) to avoid circular dependency
export type RootState = RootReducerState;
export type AppDispatch = typeof store.dispatch;

// Export typed hooks for use throughout the application
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Export custom hooks
export { useUndoRedo } from './hooks/useUndoRedo';
export { useProjectPersistence } from './hooks/useProjectPersistence';
export { useSelectedShot } from './hooks/useSelectedShot';

// Export auto-save utilities
export { loadFromLocalStorage, clearAutoSave } from './middleware/autoSaveMiddleware';
