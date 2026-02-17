/**
 * CameraAngleEditorModal Component
 * 
 * Modal wrapper for the CameraAngleEditor.
 * Provides a full-screen modal experience with proper accessibility.
 * 
 * Usage:
 * ```tsx
 * <CameraAngleEditorModal
 *   isOpen={isModalOpen}
 *   onClose={() => setModalOpen(false)}
 *   initialImageId="image-123"
 *   initialImagePath="/path/to/image.jpg"
 * />
 * ```
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { XIcon } from 'lucide-react';
import { CameraAngleEditor } from './CameraAngleEditor';
import type { CameraAngleResult } from '@/types/cameraAngle';

// ============================================================================
// Types
// ============================================================================

export interface CameraAngleEditorModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when modal should close */
  onClose: () => void;
  /** Initial image ID (for reference) */
  initialImageId?: string;
  /** Initial image path or URL */
  initialImagePath?: string;
  /** Callback when generation completes */
  onGenerationComplete?: (results: CameraAngleResult[]) => void;
  /** Callback when generation fails */
  onGenerationError?: (error: string) => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export const CameraAngleEditorModal: React.FC<CameraAngleEditorModalProps> = ({
  isOpen,
  onClose,
  initialImageId,
  initialImagePath,
  onGenerationComplete,
  onGenerationError,
  className,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  /**
   * Handle Escape key press
   */
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, onClose]);

  /**
   * Focus management: trap focus within modal
   */
  useEffect(() => {
    if (isOpen) {
      // Store the currently focused element
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus the modal container
      if (modalRef.current) {
        modalRef.current.focus();
      }

      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';

      return () => {
        // Restore body scroll
        document.body.style.overflow = '';

        // Return focus to the previously focused element
        if (previousFocusRef.current) {
          previousFocusRef.current.focus();
        }
      };
    }
  }, [isOpen]);

  /**
   * Handle focus trap
   */
  useEffect(() => {
    if (!isOpen || !modalRef.current) return;

    const modal = modalRef.current;
    const focusableElements = modal.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab: moving backwards
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab: moving forwards
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    modal.addEventListener('keydown', handleTabKey);

    return () => {
      modal.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen]);

  /**
   * Handle backdrop click
   */
  const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      onClose();
    }
  };

  /**
   * Handle generation complete
   */
  const handleGenerationComplete = useCallback(
    (results: CameraAngleResult[]) => {
      onGenerationComplete?.(results);
    },
    [onGenerationComplete]
  );

  /**
   * Handle generation error
   */
  const handleGenerationError = useCallback(
    (error: string) => {
      onGenerationError?.(error);
    },
    [onGenerationError]
  );

  // Don't render if not open
  if (!isOpen) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={modalRef}
        className={`relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200 ${className || ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="camera-angle-editor-title"
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <h2
            id="camera-angle-editor-title"
            className="text-lg font-semibold text-gray-900 dark:text-gray-100"
          >
            Camera Angle Editor
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close modal"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <CameraAngleEditor
            initialImageId={initialImageId}
            initialImagePath={initialImagePath}
            onGenerationComplete={handleGenerationComplete}
            onGenerationError={handleGenerationError}
            showHeader={false}
            showOptions={true}
          />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Exports
// ============================================================================

export default CameraAngleEditorModal;
