/**
 * Character Wizard Modal Component
 * 
 * Modal wrapper for the Character Creation Wizard
 * Integrates with app state and provides modal UI
 */

import React, { useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { CharacterWizard } from './character/CharacterWizard';
import { LLMStatusBanner } from './LLMStatusBanner';
import { useAppStore } from '@/stores/useAppStore';
import type { Character } from '@/types/character';
import type { World } from '@/types/world';
import './WizardModal.css';

export interface CharacterWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (character: Character) => void;
  worldContext?: World;
  initialData?: Partial<Character>;
}

export function CharacterWizardModal({
  isOpen,
  onClose,
  onComplete,
  worldContext,
  initialData,
}: CharacterWizardModalProps) {
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);

  console.log('[CharacterWizardModal] Rendered with isOpen:', isOpen);

  // Handle Escape key to close modal
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      console.log('[CharacterWizardModal] Escape key pressed, closing modal');
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

  const handleComplete = (character: Character) => {
    onComplete?.(character);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <div className="wizard-modal-overlay" onClick={handleCancel}>
      <div className="wizard-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-modal-header">
          <h2 className="wizard-modal-title">Character Creator</h2>
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

          <CharacterWizard
            onComplete={handleComplete}
            onCancel={handleCancel}
            worldContext={worldContext}
            initialData={initialData}
          />
        </div>
      </div>
    </div>
  );
}
