/**
 * ComfyUIConfigModal - Modal wrapper for ComfyUI configuration
 * 
 * Wraps the existing ComfyUISettingsPanel component in a Modal dialog
 * for access from the Settings menu.
 * 
 * Validates Requirements: 2.4, 5.2
 */

import React from 'react';
import { Modal } from './Modal';
import { ComfyUISettingsPanel } from '@/components/settings/ComfyUISettingsPanel';
import type { ComfyUIConfig } from '@/services/comfyuiService';

export interface ComfyUIConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentConfig?: Partial<ComfyUIConfig>;
  onSave?: (config: ComfyUIConfig) => void | Promise<void>;
}

/**
 * ComfyUI Configuration Modal
 * 
 * Provides access to ComfyUI server configuration through the Settings menu.
 * Reuses the existing ComfyUISettingsPanel component for consistency.
 */
export function ComfyUIConfigModal({
  isOpen,
  onClose,
  currentConfig,
  onSave,
}: ComfyUIConfigModalProps) {
  const handleSave = async (config: ComfyUIConfig) => {
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
      title="ComfyUI Server Configuration"
      size="xl"
    >
      <ComfyUISettingsPanel
        currentConfig={currentConfig}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </Modal>
  );
}
