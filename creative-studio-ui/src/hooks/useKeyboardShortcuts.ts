/**
 * useKeyboardShortcuts Hook
 * 
 * Custom hook for managing keyboard shortcuts
 */

import { useEffect, useCallback, useRef } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: (event: KeyboardEvent) => void;
  description?: string;
  preventDefault?: boolean;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  preventDefault?: boolean;
}

/**
 * Hook for registering keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  options: UseKeyboardShortcutsOptions = {}
) {
  const { enabled = true, preventDefault = true } = options;
  const shortcutsRef = useRef(shortcuts);

  // Update ref when shortcuts change
  useEffect(() => {
    shortcutsRef.current = shortcuts;
  }, [shortcuts]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      const matchingShortcut = shortcutsRef.current.find((shortcut) => {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrl ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.alt ? event.altKey : !event.altKey;
        const metaMatches = shortcut.meta ? event.metaKey : true;

        return keyMatches && ctrlMatches && shiftMatches && altMatches && metaMatches;
      });

      if (matchingShortcut) {
        if (matchingShortcut.preventDefault ?? preventDefault) {
          event.preventDefault();
        }
        matchingShortcut.handler(event);
      }
    },
    [enabled, preventDefault]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

/**
 * Common keyboard shortcuts
 */
export const CommonShortcuts = {
  save: { key: 's', ctrl: true, description: 'Save' },
  close: { key: 'Escape', description: 'Close' },
  cancel: { key: 'Escape', description: 'Cancel' },
  submit: { key: 'Enter', ctrl: true, description: 'Submit' },
  undo: { key: 'z', ctrl: true, description: 'Undo' },
  redo: { key: 'y', ctrl: true, description: 'Redo' },
  copy: { key: 'c', ctrl: true, description: 'Copy' },
  paste: { key: 'v', ctrl: true, description: 'Paste' },
  cut: { key: 'x', ctrl: true, description: 'Cut' },
  selectAll: { key: 'a', ctrl: true, description: 'Select All' },
  find: { key: 'f', ctrl: true, description: 'Find' },
  help: { key: 'F1', description: 'Help' },
  refresh: { key: 'F5', description: 'Refresh' },
};

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.meta) parts.push('Cmd');

  // Capitalize first letter of key
  const key = shortcut.key.charAt(0).toUpperCase() + shortcut.key.slice(1);
  parts.push(key);

  return parts.join('+');
}

/**
 * Hook for displaying keyboard shortcuts help
 */
export function useShortcutHelp(shortcuts: KeyboardShortcut[]) {
  const formattedShortcuts = shortcuts.map((shortcut) => ({
    shortcut: formatShortcut(shortcut),
    description: shortcut.description || 'No description',
  }));

  return formattedShortcuts;
}
