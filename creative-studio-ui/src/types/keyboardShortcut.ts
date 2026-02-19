/**
 * Keyboard Shortcut System Types
 * 
 * Defines types for cross-platform keyboard shortcut handling
 * with platform-aware key matching and display text generation.
 */

import type { ProjectData } from './project';

/**
 * Platform types for keyboard shortcut handling
 */
export type Platform = 'mac' | 'windows' | 'linux';

/**
 * Keyboard shortcut definition
 * 
 * Defines a keyboard combination that triggers a menu action.
 * The system automatically translates Ctrl to Cmd on Mac.
 */
export interface KeyboardShortcut {
  /** Primary key (e.g., 's', 'Enter', 'ArrowDown') */
  key: string;

  /** Ctrl key (Windows/Linux) or Cmd key (Mac) */
  ctrl?: boolean;

  /** Shift key modifier */
  shift?: boolean;

  /** Alt key modifier */
  alt?: boolean;

  /** Meta key (Cmd on Mac, Windows key on Windows) */
  meta?: boolean;

  /** Custom display text override (e.g., "Ctrl+S" or "⌘S") */
  displayText?: string;
}

/**
 * View state for menu actions
 */
export interface ViewState {
  /** Timeline panel visibility */
  timelineVisible: boolean;

  /** Grid overlay visibility */
  gridVisible: boolean;

  /** Current zoom level (percentage) */
  zoomLevel: number;

  /** Panel visibility states */
  panelsVisible: {
    properties: boolean;
    assets: boolean;
    preview: boolean;
  };

  /** Full screen mode */
  fullScreen: boolean;
}

/**
 * Undo/redo stack interface
 */
export interface UndoStack {
  /** Whether undo is available */
  canUndo: boolean;

  /** Whether redo is available */
  canRedo: boolean;

  /** Perform undo operation */
  undo: () => void;

  /** Perform redo operation */
  redo: () => void;
}

/**
 * Clipboard state interface
 */
export interface ClipboardState {
  /** Whether clipboard has content */
  hasContent: boolean;

  /** Type of content in clipboard */
  contentType: 'shot' | 'asset' | 'text' | null;

  /** Cut content to clipboard */
  cut: (content: unknown) => void;

  /** Copy content to clipboard */
  copy: (content: unknown) => void;

  /** Paste content from clipboard */
  paste: () => unknown;
}

/**
 * Service interfaces for menu actions
 */
export interface MenuServices {
  /** Project persistence service */
  persistence: {
    saveProject: (project: ProjectData) => Promise<void>;
    loadProject: (projectId: string) => Promise<ProjectData>;
    openProject: () => Promise<ProjectData | null>;
  };

  /** Project export service */
  export: {
    exportJSON: (project: ProjectData) => Promise<{ success: boolean; filePath?: string; error?: Error }>;
    exportPDF: (project: ProjectData) => Promise<{ success: boolean; filePath?: string; error?: Error }>;
    exportVideo: (project: ProjectData) => Promise<{ success: boolean; filePath?: string; error?: Error }>;
    setProgressCallback?: (callback: (progress: number, message: string) => void) => void;
    clearProgressCallback?: () => void;
  };

  /** Recent projects service */
  recentProjects: {
    addProject: (project: ProjectData) => void;
    getRecentProjects: () => RecentProject[];
    removeProject: (projectId: string) => void;
  };

  /** Modal manager */
  modal: {
    open: (modalId: string, props?: unknown) => void;
    close: (modalId: string) => void;
  };
}

/**
 * Recent project entry
 */
export interface RecentProject {
  id: string;
  name: string;
  path: string;
  lastModified: number; // timestamp
  thumbnail?: string;
}

/**
 * Action context provided to menu action handlers
 * 
 * Contains all state and services needed to execute menu actions.
 */
export interface ActionContext {
  /** Current project (null if no project loaded) */
  project: ProjectData | null;

  /** Current view state */
  viewState: ViewState;

  /** Undo/redo stack */
  undoStack: UndoStack;

  /** Clipboard state */
  clipboard: ClipboardState;

  /** Service interfaces */
  services: MenuServices;
}

/**
 * Shortcut configuration for registration
 * 
 * Associates a keyboard shortcut with an action and enabled state.
 */
export interface ShortcutConfig {
  /** Unique identifier for the shortcut */
  id: string;

  /** Keyboard shortcut definition */
  shortcut: KeyboardShortcut;

  /** Action to execute when shortcut is triggered */
  action: () => void | Promise<void>;

  /** Function to check if shortcut is currently enabled */
  enabled: () => boolean;

  /** Optional description for documentation */
  description?: string;
}

/**
 * Keyboard event match result
 */
export interface KeyMatchResult {
  /** Whether the event matches the shortcut */
  matches: boolean;

  /** The matched shortcut config (if any) */
  config?: ShortcutConfig;
}
