/**
 * Object Wizard Modal
 * 
 * Modal wrapper for the Object Wizard that handles opening/closing
 * and completion logic.
 */

import React from 'react';
import { ObjectWizard } from './object/ObjectWizard';
import { useAppStore } from '@/stores/useAppStore';
import type { StoryObject } from '@/types/object';
import './WizardModal.css';

export interface ObjectWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (object: StoryObject) => void;
  initialData?: Partial<StoryObject>;
}

export function ObjectWizardModal({
  isOpen,
  onClose,
  onComplete,
  initialData,
}: ObjectWizardModalProps) {
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);

  console.log('[ObjectWizardModal] Rendered with isOpen:', isOpen);

  if (!isOpen) {
    return null;
  }

  const handleCancel = () => {
    console.log('[ObjectWizardModal] Wizard cancelled');
    onClose();
  };

  const handleComplete = (object: StoryObject) => {
    console.log('[ObjectWizardModal] Object completed:', object);
    onComplete(object);
    onClose();
  };

  return (
    <div className="wizard-modal-overlay">
      <div className="wizard-modal-container">
        <ObjectWizard
          onComplete={handleComplete}
          onCancel={handleCancel}
          initialData={initialData}
        />
      </div>
    </div>
  );
}

export default ObjectWizardModal;
