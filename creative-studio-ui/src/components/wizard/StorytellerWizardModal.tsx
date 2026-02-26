import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { StorytellerWizard } from './storyteller/StorytellerWizard';
import { LLMStatusBanner } from './LLMStatusBanner';
import { useAppStore } from '@/stores/useAppStore';
import type { Story } from '@/types/story';
import './WizardModal.css';

/**
 * Storyteller Wizard Modal Component
 *
 * Modal wrapper for the Storyteller Wizard
 * Integrates with app state and provides modal UI
 */

export interface StorytellerWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (story: Story) => void;
  initialData?: Partial<Story>;
}

export function StorytellerWizardModal({
  isOpen,
  onClose,
  onComplete,
  initialData,
}: StorytellerWizardModalProps) {
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);

  console.log('[StorytellerWizardModal] Rendered with isOpen:', isOpen);

  // Handle Escape key to close modal
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      console.log('[StorytellerWizardModal] Escape key pressed, closing modal');
      onClose();
    }
  }, [onClose]);

  // Add/remove keyboard event listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) {
    return null;
  }

  const handleCancel = () => {
    console.log('[StorytellerWizardModal] Wizard cancelled');
    onClose();
  };

  const handleOverlayClick = () => {
    console.log('[StorytellerWizardModal] Overlay clicked, closing modal');
    onClose();
  };

  return (
    <div className="wizard-modal-overlay" onClick={handleOverlayClick}>
      <div className="wizard-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-modal-header">
          <h2 className="wizard-modal-title">Storyteller</h2>
          <button
            className="wizard-modal-close"
            onClick={handleCancel}
            aria-label="Close wizard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="wizard-modal-content">
          {/* LLM Status Banner */}
          <LLMStatusBanner onConfigure={() => setShowLLMSettings(true)} />

          <StorytellerWizard
            onComplete={(story) => {
              console.log('[StorytellerWizardModal] Story completed:', story);
              onComplete(story);
              onClose();
            }}
            onCancel={handleCancel}
            initialData={initialData}
          />
        </div>
      </div>
    </div>
  );
}
