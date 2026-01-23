/**
 * ModalOverlay Component
 *
 * Provides consistent overlay behavior with backdrop click handling,
 * keyboard navigation, and accessibility features.
 */

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { ModalOverlayProps } from '@/types/modal';

const ESC_KEY = 'Escape';

/**
 * Modal overlay with backdrop and close functionality
 */
export function ModalOverlay({
  isOpen,
  onClose,
  children,
  className = ''
}: ModalOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      // Store current focused element
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Focus the overlay
      if (overlayRef.current) {
        overlayRef.current.focus();
      }

      // Prevent body scroll
      document.body.style.overflow = 'hidden';
    } else {
      // Restore previous focus
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }

      // Restore body scroll
      document.body.style.overflow = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === ESC_KEY) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Backdrop click handler
  const handleBackdropClick = (event: React.MouseEvent) => {
    if (event.target === overlayRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm ${className}`}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      onClick={handleBackdropClick}
    >
      <div className="relative max-h-[90vh] max-w-[90vw] overflow-auto">
        {children}
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Close modal"
      >
        <X size={20} />
      </button>
    </div>
  );
}
