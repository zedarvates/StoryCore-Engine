/**
 * Menu Bar State Management Types
 * 
 * Defines all state types for the comprehensive menu bar restoration feature.
 * These types support Requirements 2.1-2.10, 3.1-3.9, 8.1-8.6.
 */

import { Project } from './index';

/**
 * View state for the application
 * Controls visibility and configuration of UI elements
 */
export interface ViewState {
  /** Whether the timeline panel is visible */
  timelineVisible: boolean;
  /** Whether the grid overlay is visible */
  gridVisible: boolean;
  /** Current zoom level (percentage: 25-400) */
  zoomLevel: number;
  /** Minimum allowed zoom level */
  minZoom: number;
  /** Maximum allowed zoom level */
  maxZoom: number;
  /** Zoom step increment/decrement */
  zoomStep: number;
  /** Panel visibility states */
  panelsVisible: {
    properties: boolean;
    assets: boolean;
    preview: boolean;
  };
  /** Whether the application is in full screen mode */
  fullScreen: boolean;
}

/**
 * Undo/Redo stack interface
 * Manages reversible actions in the application
 */
export interface UndoStack {
  /** Whether undo operation is available */
  canUndo: boolean;
  /** Whether redo operation is available */
  canRedo: boolean;
  /** Execute undo operation */
  undo: () => void;
  /** Execute redo operation */
  redo: () => void;
}

/**
 * Clipboard state interface
 * Manages cut/copy/paste operations
 */
export interface ClipboardState {
  /** Whether clipboard has content */
  hasContent: boolean;
  /** Type of content in clipboard */
  contentType: 'shot' | 'asset' | 'text' | null;
  /** Cut operation - removes content and places in clipboard */
  cut: (content: unknown) => void;
  /** Copy operation - copies content to clipboard */
  copy: (content: unknown) => void;
  /** Paste operation - inserts clipboard content */
  paste: () => unknown;
}

/**
 * Recent project entry
 */
export interface RecentProject {
  /** Unique project identifier */
  id: string;
  /** Project name */
  name: string;
  /** File system path to project */
  path: string;
  /** Last modified timestamp */
  lastModified: number; // timestamp
  /** Optional thumbnail URL */
  thumbnail?: string;
}

/**
 * Menu bar state
 * Manages the state of the menu bar UI
 */
export interface MenuBarState {
  /** Currently open menu (null if none) */
  openMenu: string | null;
  /** Focused menu item index within open menu */
  focusedItemIndex: number;
  /** Set of active modal IDs */
  activeModals: Set<string>;
  /** List of recent projects */
  recentProjects: RecentProject[];
}

/**
 * Application state
 * Complete application state passed to menu actions
 */
export interface AppState {
  /** Current project (null if none loaded) */
  project: Project | null;
  /** Whether current project has unsaved changes */
  hasUnsavedChanges: boolean;
  /** View state configuration */
  viewState: ViewState;
  /** Undo/redo stack */
  undoStack: UndoStack;
  /** Clipboard state */
  clipboard: ClipboardState;
  /** Whether a long-running operation is in progress */
  isProcessing: boolean;
}

/**
 * State change listener callback
 */
export type StateListener<T> = (state: T) => void;

/**
 * Default view state values
 */
export const DEFAULT_VIEW_STATE: ViewState = {
  timelineVisible: true,
  gridVisible: false,
  zoomLevel: 100,
  minZoom: 25,
  maxZoom: 400,
  zoomStep: 25,
  panelsVisible: {
    properties: true,
    assets: true,
    preview: true,
  },
  fullScreen: false,
};

/**
 * Default menu bar state values
 */
export const DEFAULT_MENU_BAR_STATE: MenuBarState = {
  openMenu: null,
  focusedItemIndex: -1,
  activeModals: new Set<string>(),
  recentProjects: [],
};


