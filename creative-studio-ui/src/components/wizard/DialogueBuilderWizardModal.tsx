import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { DialogueBuilderWizard, DialogueBuilderData } from './dialogue-builder/DialogueBuilderWizard';
import './WizardModal.css';

/**
 * Dialogue Builder Wizard Modal Component
 */

export interface DialogueBuilderWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (data: DialogueBuilderData, result?: string) => void;
  initialData?: Partial<DialogueBuilderData>;
}

export function DialogueBuilderWizardModal({
  isOpen,
  onClose,
  onComplete,
  initialData,
}: DialogueBuilderWizardModalProps) {
  // Handle Escape key to close modal
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Add/remove keyboard event listener and body scroll lock
  useEffect(() => {
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    } else {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    }

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  const handleComplete = (data: DialogueBuilderData, result?: string) => {
    onComplete?.(data, result);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="wizard-modal-overlay" onClick={onClose}>
      <div className="wizard-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-modal-header">
          <h2 className="wizard-modal-title">Dialogue Builder</h2>
          <button
            className="wizard-modal-close"
            onClick={handleCancel}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="wizard-modal-content">
          <DialogueBuilderWizard
            onComplete={handleComplete}
            onCancel={handleCancel}
            initialData={initialData}
          />
        </div>
      </div>
    </div>
  );
}
