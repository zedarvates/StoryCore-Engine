import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { ObjectWizard } from './object/ObjectWizard';
import { LLMStatusBanner } from './LLMStatusBanner';
import { useAppStore } from '@/stores/useAppStore';
import type { StoryObject } from '@/types/object';
import './WizardModal.css';

export interface ObjectWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (object: Partial<StoryObject>) => void;
  initialData?: Partial<StoryObject>;
}

export function ObjectWizardModal({
  isOpen,
  onClose,
  onComplete,
  initialData,
}: ObjectWizardModalProps) {
  // Handle Escape key
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    },
    [onClose]
  );

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

  if (!isOpen) return null;

  return (
    <div className="wizard-modal-overlay" onClick={onClose}>
      <div className="wizard-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-modal-header">
          <div className="flex items-center gap-2">
            <h2 className="wizard-modal-title">Assistant de Création d'Objet</h2>
            <LLMStatusBanner />
          </div>
          <button
            className="wizard-modal-close"
            onClick={onClose}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="wizard-modal-content">
          <ObjectWizard
            onClose={onClose}
            onComplete={onComplete}
            initialData={initialData}
          />
        </div>
      </div>
    </div>
  );
}
