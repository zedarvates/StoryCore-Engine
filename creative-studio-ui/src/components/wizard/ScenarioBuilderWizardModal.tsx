import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { ScenarioBuilderWizard } from './scenario-builder/ScenarioBuilderWizard';
import type { Story } from '@/types/story';
import './WizardModal.css';

export interface ScenarioBuilderWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (story: Partial<Story>) => void;
  initialData?: Partial<Story>;
}

export function ScenarioBuilderWizardModal({
  isOpen,
  onClose,
  onComplete,
  initialData,
}: ScenarioBuilderWizardModalProps) {
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
          <h2 className="wizard-modal-title">Scenario Builder</h2>
          <button
            className="wizard-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="wizard-modal-content">
          <ScenarioBuilderWizard
            onCancel={onClose}
            onComplete={onComplete || (() => {})}
            initialData={initialData}
          />
        </div>
      </div>
    </div>
  );
}
