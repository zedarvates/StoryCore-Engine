/**
 * useDragCancel Hook - Cancel Drag with Escape Key
 * 
 * Features:
 * - Detect Escape key during drag
 * - Restore initial state with animation
 * - Clean up drag operation
 * 
 * Validates: Requirement 2.8
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Position } from '../types/gridEditorAdvanced';

interface UseDragCancelOptions {
  onCancel?: () => void;
  animationDuration?: number;
}

interface DragCancelState {
  isDragging: boolean;
  initialPosition: Position | null;
  currentPosition: Position | null;
  isCancelling: boolean;
}

export function useDragCancel(options: UseDragCancelOptions = {}) {
  const { onCancel, animationDuration = 300 } = options;
  
  const [state, setState] = useState<DragCancelState>({
    isDragging: false,
    initialPosition: null,
    currentPosition: null,
    isCancelling: false,
  });

  const cancelTimeoutRef = useRef<number | null>(null);

  /**
   * Handle Escape key press
   */
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && state.isDragging && !state.isCancelling) {
      event.preventDefault();
      cancelDrag();
    }
  }, [state.isDragging, state.isCancelling]);

  /**
   * Set up event listeners
   */
  useEffect(() => {
    if (state.isDragging) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [state.isDragging, handleKeyDown]);

  /**
   * Clean up timeout on unmount
   */
  useEffect(() => {
    return () => {
      if (cancelTimeoutRef.current) {
        clearTimeout(cancelTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Start drag operation
   */
  const startDrag = useCallback((initialPosition: Position) => {
    setState({
      isDragging: true,
      initialPosition,
      currentPosition: initialPosition,
      isCancelling: false,
    });
  }, []);

  /**
   * Update current position during drag
   */
  const updatePosition = useCallback((position: Position) => {
    setState(prev => ({
      ...prev,
      currentPosition: position,
    }));
  }, []);

  /**
   * Cancel drag operation
   */
  const cancelDrag = useCallback(() => {
    if (!state.isDragging || state.isCancelling) return;

    setState(prev => ({
      ...prev,
      isCancelling: true,
    }));

    // Call cancel callback
    onCancel?.();

    // Reset state after animation
    cancelTimeoutRef.current = window.setTimeout(() => {
      setState({
        isDragging: false,
        initialPosition: null,
        currentPosition: null,
        isCancelling: false,
      });
    }, animationDuration);
  }, [state.isDragging, state.isCancelling, onCancel, animationDuration]);

  /**
   * End drag operation normally
   */
  const endDrag = useCallback(() => {
    setState({
      isDragging: false,
      initialPosition: null,
      currentPosition: null,
      isCancelling: false,
    });
  }, []);

  return {
    isDragging: state.isDragging,
    isCancelling: state.isCancelling,
    initialPosition: state.initialPosition,
    currentPosition: state.currentPosition,
    startDrag,
    updatePosition,
    cancelDrag,
    endDrag,
  };
}

/**
 * Cancel Animation Component
 * 
 * Validates: Requirement 2.8 - Restore initial state with animation
 */
interface CancelAnimationProps {
  isVisible: boolean;
  initialPosition: Position | null;
  currentPosition: Position | null;
  children: React.ReactNode;
}

export function CancelAnimation({
  isVisible,
  initialPosition,
  currentPosition,
  children,
}: CancelAnimationProps) {
  if (!isVisible || !initialPosition || !currentPosition) {
    return <>{children}</>;
  }

  const deltaX = initialPosition.x - currentPosition.x;
  const deltaY = initialPosition.y - currentPosition.y;

  return (
    <motion.div
      animate={{
        x: deltaX,
        y: deltaY,
        opacity: [1, 0.8, 1],
        scale: [1, 0.95, 1],
      }}
      transition={{
        duration: 0.3,
        ease: 'easeOut',
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Cancel Notification Component
 * 
 * Shows a brief notification when drag is cancelled
 */
interface CancelNotificationProps {
  isVisible: boolean;
}

export function CancelNotification({ isVisible }: CancelNotificationProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#6b7280',
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
          {/* Cancel Icon */}
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
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>

          {/* Text */}
          <span>Drag Cancelled</span>

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
            Esc
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
