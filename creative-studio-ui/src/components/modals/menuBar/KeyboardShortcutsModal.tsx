/**
 * KeyboardShortcutsModal - Modal displaying all keyboard shortcuts
 * 
 * Provides a reference guide for all available keyboard shortcuts
 * organized by category (File, Edit, View, etc.)
 * 
 * Requirements: 6.2, 7.1-7.13
 */

import React from 'react';
import { Modal } from '../Modal';
import { Button } from '@/components/ui/button';

export interface ShortcutItem {
  action: string;
  keys: string;
  description?: string;
}

export interface ShortcutCategory {
  name: string;
  shortcuts: ShortcutItem[];
}

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts?: ShortcutCategory[];
}

const defaultShortcuts: ShortcutCategory[] = [
  {
    name: 'File',
    shortcuts: [
      { action: 'New Project', keys: 'Ctrl+N', description: 'Create a new project' },
      { action: 'Open Project', keys: 'Ctrl+O', description: 'Open an existing project' },
      { action: 'Save Project', keys: 'Ctrl+S', description: 'Save current project' },
      { action: 'Save As', keys: 'Ctrl+Shift+S', description: 'Save project with new name' },
    ],
  },
  {
    name: 'Edit',
    shortcuts: [
      { action: 'Undo', keys: 'Ctrl+Z', description: 'Undo last action' },
      { action: 'Redo', keys: 'Ctrl+Y', description: 'Redo last undone action' },
      { action: 'Cut', keys: 'Ctrl+X', description: 'Cut selected content' },
      { action: 'Copy', keys: 'Ctrl+C', description: 'Copy selected content' },
      { action: 'Paste', keys: 'Ctrl+V', description: 'Paste clipboard content' },
    ],
  },
  {
    name: 'View',
    shortcuts: [
      { action: 'Zoom In', keys: 'Ctrl++', description: 'Increase zoom level' },
      { action: 'Zoom Out', keys: 'Ctrl+-', description: 'Decrease zoom level' },
      { action: 'Reset Zoom', keys: 'Ctrl+0', description: 'Reset zoom to 100%' },
      { action: 'Full Screen', keys: 'F11', description: 'Toggle full screen mode' },
    ],
  },
  {
    name: 'Navigation',
    shortcuts: [
      { action: 'Focus Menu Bar', keys: 'Alt', description: 'Focus first menu item' },
      { action: 'Navigate Menus', keys: 'Arrow Keys', description: 'Move between menu items' },
      { action: 'Activate Item', keys: 'Enter', description: 'Activate focused menu item' },
      { action: 'Close Menu', keys: 'Escape', description: 'Close current menu' },
    ],
  },
];

/**
 * KeyboardShortcutsModal component
 * 
 * Displays a comprehensive list of keyboard shortcuts organized by category.
 */
export function KeyboardShortcutsModal({
  isOpen,
  onClose,
  shortcuts = defaultShortcuts,
}: KeyboardShortcutsModalProps) {
  // Detect platform for display
  const isMac = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);
  
  // Replace Ctrl with Cmd for Mac
  const formatKeys = (keys: string): string => {
    if (isMac) {
      return keys.replace(/Ctrl/g, '⌘').replace(/Alt/g, '⌥').replace(/Shift/g, '⇧');
    }
    return keys;
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Keyboard Shortcuts"
      size="lg"
    >
      <div className="space-y-6">
        {/* Platform Note */}
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            {isMac
              ? 'Shortcuts shown for macOS. ⌘ = Command, ⌥ = Option, ⇧ = Shift'
              : 'Shortcuts shown for Windows/Linux. Use Ctrl key for most shortcuts.'}
          </p>
        </div>

        {/* Shortcuts by Category */}
        {shortcuts.map((category) => (
          <div key={category.name} className="space-y-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 border-b border-gray-200 dark:border-gray-800 pb-2">
              {category.name}
            </h3>
            <div className="space-y-2">
              {category.shortcuts.map((shortcut, index) => (
                <div
                  key={index}
                  className="flex items-start justify-between gap-4 py-2 px-3 rounded hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <div className="flex-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {shortcut.action}
                    </div>
                    {shortcut.description && (
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {shortcut.description}
                      </div>
                    )}
                  </div>
                  <div className="flex-shrink-0">
                    <kbd className="px-2 py-1 text-sm font-mono bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded">
                      {formatKeys(shortcut.keys)}
                    </kbd>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Actions */}
        <div className="flex justify-end pt-4">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </Modal>
  );
}
