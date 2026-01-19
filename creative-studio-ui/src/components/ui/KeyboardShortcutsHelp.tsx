/**
 * Keyboard Shortcuts Help Component
 * 
 * Displays available keyboard shortcuts in a modal
 */

import { X, Keyboard } from 'lucide-react';
import type { KeyboardShortcut } from '../../hooks/useKeyboardShortcuts';
import { formatShortcut } from '../../hooks/useKeyboardShortcuts';
import './KeyboardShortcutsHelp.css';

export interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: KeyboardShortcut[];
  title?: string;
  className?: string;
}

export function KeyboardShortcutsHelp({
  isOpen,
  onClose,
  shortcuts,
  title = 'Keyboard Shortcuts',
  className = '',
}: KeyboardShortcutsHelpProps) {
  if (!isOpen) return null;

  // Group shortcuts by category (if description contains category)
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = 'General'; // Could be extracted from description
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  return (
    <div className="keyboard-shortcuts-overlay" onClick={onClose}>
      <div
        className={`keyboard-shortcuts-modal ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="keyboard-shortcuts-header">
          <div className="keyboard-shortcuts-title">
            <Keyboard className="keyboard-shortcuts-icon" />
            <h2>{title}</h2>
          </div>
          <button
            className="keyboard-shortcuts-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="keyboard-shortcuts-close-icon" />
          </button>
        </div>

        <div className="keyboard-shortcuts-content">
          {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
            <div key={category} className="keyboard-shortcuts-category">
              <h3 className="keyboard-shortcuts-category-title">{category}</h3>
              <div className="keyboard-shortcuts-list">
                {categoryShortcuts.map((shortcut, index) => (
                  <div key={index} className="keyboard-shortcut-item">
                    <span className="keyboard-shortcut-description">
                      {shortcut.description || 'No description'}
                    </span>
                    <kbd className="keyboard-shortcut-keys">
                      {formatShortcut(shortcut)}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="keyboard-shortcuts-footer">
          <p className="keyboard-shortcuts-hint">
            Press <kbd>?</kbd> or <kbd>F1</kbd> to toggle this help
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * Compact Keyboard Shortcut Badge
 * Shows a single shortcut inline
 */
export interface ShortcutBadgeProps {
  shortcut: KeyboardShortcut;
  className?: string;
}

export function ShortcutBadge({ shortcut, className = '' }: ShortcutBadgeProps) {
  return (
    <kbd className={`shortcut-badge ${className}`}>
      {formatShortcut(shortcut)}
    </kbd>
  );
}
