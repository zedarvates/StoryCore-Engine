import React from 'react';
import { X } from 'lucide-react';

interface KeyboardShortcutsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsDialog({ isOpen, onClose }: KeyboardShortcutsDialogProps) {
  if (!isOpen) return null;

  const shortcuts = [
    { category: 'File', items: [
      { keys: ['Ctrl', 'N'], action: 'New Project' },
      { keys: ['Ctrl', 'O'], action: 'Open Project' },
      { keys: ['Ctrl', 'S'], action: 'Save Project' },
      { keys: ['Ctrl', 'Shift', 'S'], action: 'Export Project' },
    ]},
    { category: 'Edit', items: [
      { keys: ['Ctrl', 'Z'], action: 'Undo' },
      { keys: ['Ctrl', 'Y'], action: 'Redo' },
      { keys: ['Ctrl', 'X'], action: 'Cut' },
      { keys: ['Ctrl', 'C'], action: 'Copy' },
      { keys: ['Ctrl', 'V'], action: 'Paste' },
    ]},
    { category: 'View', items: [
      { keys: ['Ctrl', '1'], action: 'Toggle Asset Library' },
      { keys: ['Ctrl', '2'], action: 'Toggle Timeline' },
      { keys: ['Ctrl', '3'], action: 'Toggle Chat' },
      { keys: ['Ctrl', '4'], action: 'Toggle Task Queue' },
      { keys: ['Ctrl', '+'], action: 'Zoom In' },
      { keys: ['Ctrl', '-'], action: 'Zoom Out' },
      { keys: ['Ctrl', '0'], action: 'Reset Zoom' },
      { keys: ['Ctrl', 'G'], action: 'Toggle Grid' },
    ]},
    { category: 'Playback', items: [
      { keys: ['Space'], action: 'Play/Pause' },
      { keys: ['←'], action: 'Skip Back 5s' },
      { keys: ['→'], action: 'Skip Forward 5s' },
      { keys: ['Home'], action: 'Go to Start' },
      { keys: ['End'], action: 'Go to End' },
      { keys: ['I'], action: 'Set In Point' },
      { keys: ['O'], action: 'Set Out Point' },
      { keys: ['X'], action: 'Split Shot' },
    ]},
    { category: 'Selection', items: [
      { keys: ['Click'], action: 'Select Shot' },
      { keys: ['Ctrl', 'Click'], action: 'Multi-select' },
      { keys: ['Shift', 'Click'], action: 'Range Select' },
      { keys: ['Delete'], action: 'Delete Selected' },
      { keys: ['Esc'], action: 'Deselect All' },
      { keys: ['Ctrl', 'A'], action: 'Select All' },
    ]},
  ];

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Dialog */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-background rounded-lg shadow-2xl border border-border w-full max-w-lg max-h-[80vh] overflow-hidden z-50">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[60vh] p-4">
          <div className="space-y-6">
            {shortcuts.map((section) => (
              <div key={section.category}>
                <h3 className="text-sm font-semibold text-muted-foreground mb-2">
                  {section.category}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between py-1.5"
                    >
                      <span className="text-sm">{item.action}</span>
                      <div className="flex items-center gap-1">
                        {item.keys.map((key, keyIndex) => (
                          <React.Fragment key={keyIndex}>
                            <kbd className="px-2 py-0.5 bg-muted rounded text-xs font-mono">
                              {key}
                            </kbd>
                            {keyIndex < item.keys.length - 1 && (
                              <span className="text-muted-foreground">+</span>
                            )}
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-muted/50">
          <p className="text-xs text-muted-foreground text-center">
            Press <kbd className="px-1.5 py-0.5 bg-muted rounded">?</kbd> in Chat Panel for quick reference
          </p>
        </div>
      </div>
    </>
  );
}

