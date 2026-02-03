/**
 * LLMConfigModal - Modal wrapper for LLM configuration
 * 
 * Wraps the existing LLMSettingsPanel component in a Modal dialog
 * for access from the Settings menu.
 * 
 * Validates Requirements: 2.2, 5.1
 */

import React from 'react';
import { Modal } from './Modal';
import { LLMSettingsPanel } from '@/components/settings/LLMSettingsPanel';
import type { LLMConfig } from '@/services/llmService';

export interface LLMConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig?: Partial<LLMConfig>;
  onSave?: (config: LLMConfig) => void | Promise<void>;
  onTestConnection?: (config: Partial<LLMConfig>) => Promise<boolean>;
}

/**
 * LLM Configuration Modal
 * 
 * Provides access to LLM configuration through the Settings menu.
 * Reuses the existing LLMSettingsPanel component for consistency.
 */
export function LLMConfigModal({
  isOpen,
  onClose,
  currentConfig,
  onSave,
  onTestConnection,
}: LLMConfigModalProps) {
  const handleSave = async (config: LLMConfig) => {
    if (onSave) {
      await onSave(config);
    }
    // Close modal after successful save
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="LLM StoryCore Assistant Configuration"
      size="xl"
    >
      <LLMSettingsPanel
        currentConfig={currentConfig}
        onSave={handleSave}
        onCancel={handleCancel}
        onTestConnection={onTestConnection}
      />
    </Modal>
  );
}
