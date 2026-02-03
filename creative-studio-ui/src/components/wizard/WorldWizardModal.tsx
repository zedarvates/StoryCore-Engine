/**
 * World Wizard Modal Component
 * 
 * Modal wrapper for the World Creation Wizard
 * Integrates with app state and provides modal UI
 */

import React from 'react';
import { X } from 'lucide-react';
import { WorldWizard } from './world/WorldWizard';
import { LLMStatusBanner } from './LLMStatusBanner';
import { useAppStore } from '@/stores/useAppStore';
import type { World } from '@/types/world';
import './WizardModal.css';

export interface WorldWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: (world: World) => void;
  initialData?: Partial<World>;
}

export function WorldWizardModal({
  isOpen,
  onClose,
  onComplete,
  initialData,
}: WorldWizardModalProps) {
  const setShowLLMSettings = useAppStore((state) => state.setShowLLMSettings);

  console.log('[WorldWizardModal] Rendered with isOpen:', isOpen);

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
      <div className="wizard-modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="wizard-modal-header">
          <h2 className="wizard-modal-title">World Builder</h2>
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

          <WorldWizard
            onComplete={handleComplete}
            onCancel={handleCancel}
            initialData={initialData}
          />
        </div>
      </div>
    </div>
  );
}
