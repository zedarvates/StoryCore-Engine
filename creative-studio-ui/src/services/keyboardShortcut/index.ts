/**
 * Keyboard Shortcut Service
 * 
 * Exports keyboard shortcut handler and related utilities.
 */

export {
  KeyboardShortcutHandler,
  getGlobalKeyboardShortcutHandler,
  resetGlobalKeyboardShortcutHandler,
} from './KeyboardShortcutHandler';

export type {
  Platform,
  KeyboardShortcut,
  ShortcutConfig,
  ActionContext,
  ViewState,
  UndoStack,
  ClipboardState,
  MenuServices,
  RecentProject,
  KeyMatchResult,
} from '../../types/keyboardShortcut';
