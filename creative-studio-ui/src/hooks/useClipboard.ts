/**
 * useClipboard Hook - React hook for clipboard operations
 * 
 * Provides easy access to clipboard functionality in React components
 * 
 * Requirements: 13.1, 13.2, 13.5, 13.7
 */

import { useState, useEffect, useCallback } from 'react';
import { clipboardManager, type ClipboardData, type PasteOptions, type PasteResult } from '../services/clipboard/ClipboardManager';
import type { Shot } from '../types';

export interface UseClipboardReturn {
  // State
  hasContent: boolean;
  count: number;
  operation: 'copy' | 'cut' | null;
  clipboardData: ClipboardData | null;

  // Actions
  copy: (shots: Shot[], sourceSequenceId?: string) => void;
  cut: (shots: Shot[], sourceSequenceId?: string) => void;
  paste: (options?: PasteOptions) => PasteResult;
  clear: () => void;

  // Cross-sequence support
  canPasteIntoSequence: (targetSequenceId: string) => {
    canPaste: boolean;
    errors?: string[];
  };
  getSourceSequenceId: () => string | undefined;
  isCrossSequencePaste: (targetSequenceId: string) => boolean;

  // Utilities
  exportToJSON: () => string | null;
  importFromJSON: (json: string) => boolean;
}

/**
 * Hook for clipboard operations
 */
export function useClipboard(): UseClipboardReturn {
  const [clipboardData, setClipboardData] = useState<ClipboardData | null>(
    clipboardManager.getContent()
  );

  // Subscribe to clipboard changes
  useEffect(() => {
    const unsubscribe = clipboardManager.subscribe((data) => {
      setClipboardData(data);
    });

    return unsubscribe;
  }, []);

  // Copy shots
  const copy = useCallback((shots: Shot[], sourceSequenceId?: string) => {
    clipboardManager.copy(shots, sourceSequenceId);
  }, []);

  // Cut shots
  const cut = useCallback((shots: Shot[], sourceSequenceId?: string) => {
    clipboardManager.cut(shots, sourceSequenceId);
  }, []);

  // Paste shots
  const paste = useCallback((options?: PasteOptions): PasteResult => {
    return clipboardManager.paste(options);
  }, []);

  // Clear clipboard
  const clear = useCallback(() => {
    clipboardManager.clear();
  }, []);

  // Export to JSON
  const exportToJSON = useCallback((): string | null => {
    return clipboardManager.exportToJSON();
  }, []);

  // Import from JSON
  const importFromJSON = useCallback((json: string): boolean => {
    return clipboardManager.importFromJSON(json);
  }, []);

  // Cross-sequence support
  const canPasteIntoSequence = useCallback((targetSequenceId: string) => {
    return clipboardManager.canPasteIntoSequence(targetSequenceId);
  }, []);

  const getSourceSequenceId = useCallback((): string | undefined => {
    return clipboardManager.getSourceSequenceId();
  }, []);

  const isCrossSequencePaste = useCallback((targetSequenceId: string): boolean => {
    return clipboardManager.isCrossSequencePaste(targetSequenceId);
  }, []);

  return {
    hasContent: clipboardData !== null && clipboardData.shots.length > 0,
    count: clipboardData?.shots.length || 0,
    operation: clipboardData?.operation || null,
    clipboardData,
    copy,
    cut,
    paste,
    clear,
    canPasteIntoSequence,
    getSourceSequenceId,
    isCrossSequencePaste,
    exportToJSON,
    importFromJSON,
  };
}

/**
 * Hook for listening to clipboard keyboard events
 */
export function useClipboardEvents(
  onCopy?: () => void,
  onCut?: () => void,
  onPaste?: () => void
) {
  useEffect(() => {
    const handleCopy = () => onCopy?.();
    const handleCut = () => onCut?.();
    const handlePaste = () => onPaste?.();

    window.addEventListener('clipboard:copy', handleCopy);
    window.addEventListener('clipboard:cut', handleCut);
    window.addEventListener('clipboard:paste', handlePaste);

    return () => {
      window.removeEventListener('clipboard:copy', handleCopy);
      window.removeEventListener('clipboard:cut', handleCut);
      window.removeEventListener('clipboard:paste', handlePaste);
    };
  }, [onCopy, onCut, onPaste]);
}
