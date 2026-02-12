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

// Import middleware
import { historyMiddleware } from './middleware/historyMiddleware';
import { autoSaveMiddleware } from './middleware/autoSaveMiddleware';

// Configure the Redux store
export const store = configureStore({
  reducer: {
    project: projectReducer,
    timeline: timelineReducer,
    assets: assetsReducer,
    panels: panelsReducer,
    tools: toolsReducer,
    preview: previewReducer,
    history: historyReducer,
  },
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
    }).concat(historyMiddleware, autoSaveMiddleware), // Add history and auto-save middleware
  devTools: process.env.NODE_ENV !== 'production',
});

// Export store types
export type RootState = ReturnType<typeof store.getState>;
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
