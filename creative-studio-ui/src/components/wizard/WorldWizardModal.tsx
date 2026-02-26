/**
 * World Wizard Modal Component
 * 
 * Modal wrapper for the World Creation Wizard.
 * Now uses the refined WorldBuilderWizard for a simplified 3-step flow.
 */

import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { WorldBuilderWizard } from './world-builder/WorldBuilderWizard';
import { LLMStatusBanner } from './LLMStatusBanner';
import { useAppStore } from '@/stores/useAppStore';
import type { World } from '@/types/world';
import './WizardModal.css';

export interface WorldWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (world: World, nextAction?: string) => void;
  initialData?: Partial<World>;
}

export function WorldWizardModal({
  isOpen,
  onClose,
  onComplete,
  initialData,
}: WorldWizardModalProps) {
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);

  // Handle Escape key to close modal
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Add/remove keyboard event listener and handle body scroll
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

  const handleComplete = (world: World) => {
    onComplete?.(world);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="wizard-modal-overlay" onClick={handleCancel}>
      <div className="wizard-modal-container max-w-6xl" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-modal-header">
          <div className="flex items-center gap-2">
            <h2 className="wizard-modal-title">Assistant World Builder</h2>
            <LLMStatusBanner onConfigure={() => setShowLLMSettings(true)} />
          </div>
          <button
            className="wizard-modal-close"
            onClick={handleCancel}
            aria-label="Fermer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="wizard-modal-content">
          <WorldBuilderWizard
            onComplete={handleComplete}
            onCancel={handleCancel}
            initialData={initialData}
          />
        </div>
      </div>
    </div>
  );
}
