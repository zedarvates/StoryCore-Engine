/**
 * useDragCopy Hook - Copy Mode Detection with Ctrl Key
 * 
 * Features:
 * - Detect Ctrl/Cmd key during drag
 * - Create copy instead of move
 * - Visual indicator for copy mode
 * 
 * Validates: Requirement 2.6
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ProductionShot } from '../types/shot';

interface UseDragCopyOptions {
  onCopy?: (items: ProductionShot[]) => ProductionShot[];
  onMove?: (items: ProductionShot[]) => void;
}

export function useDragCopy(options: UseDragCopyOptions = {}) {
  const [isCopyMode, setIsCopyMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Handle key down events
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Control' || event.key === 'Meta') {
      setIsCopyMode(true);
    }
  }, []);

  // Handle key up events
  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Control' || event.key === 'Meta') {
      setIsCopyMode(false);
    }
  }, []);

  // Set up event listeners
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
      };
    }
  }, [isDragging, handleKeyDown, handleKeyUp]);

  /**
   * Start drag operation
   */
  const startDrag = useCallback((event: React.DragEvent | DragEvent) => {
    setIsDragging(true);
    setIsCopyMode(event.ctrlKey || event.metaKey);
  }, []);

  /**
   * End drag operation
   */
  const endDrag = useCallback(
    (items: ProductionShot[]) => {
      if (isCopyMode && options.onCopy) {
        const copiedItems = options.onCopy(items);
        setIsDragging(false);
        setIsCopyMode(false);
        return copiedItems;
      } else if (options.onMove) {
        options.onMove(items);
      }

      setIsDragging(false);
      setIsCopyMode(false);
      return items;
    },
    [isCopyMode, options]
  );

  /**
   * Create a copy of a shot with new ID
   */
  const createCopy = useCallback((shot: ProductionShot): ProductionShot => {
    const newId = `${shot.id}-copy-${Date.now()}`;
    
    return {
      ...shot,
      id: newId,
      number: shot.number + 1, // Increment shot number
      status: 'planned' as const,
      thumbnailUrl: shot.thumbnailUrl,
      generatedAssetUrl: undefined, // Clear generated asset for copy
    };
  }, []);

  /**
   * Create copies of multiple shots
   */
  const createCopies = useCallback(
    (shots: ProductionShot[]): ProductionShot[] => {
      return shots.map(shot => createCopy(shot));
    },
    [createCopy]
  );

  return {
    isCopyMode,
    isDragging,
    startDrag,
    endDrag,
    createCopy,
    createCopies,
  };
}

/**
 * Copy Mode Indicator Component
 * 
 * Validates: Requirement 2.6 - Visual indicator for copy mode
 */
interface CopyModeIndicatorProps {
  isVisible: boolean;
  itemCount?: number;
}

export function CopyModeIndicator({ isVisible, itemCount = 1 }: CopyModeIndicatorProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            backgroundColor: '#3b82f6',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            zIndex: 9999,
            fontWeight: '600',
            fontSize: '14px',
          }}
        >
          {/* Copy Icon */}
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>

          {/* Text */}
          <span>
            Copy Mode {itemCount > 1 ? `(${itemCount} items)` : ''}
          </span>

          {/* Keyboard Hint */}
          <div
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: '4px 8px',
              borderRadius: '4px',
              fontSize: '12px',
              fontFamily: 'monospace',
            }}
          >
            Ctrl
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
