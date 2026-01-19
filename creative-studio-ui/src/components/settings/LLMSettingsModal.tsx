/**
 * LLM Settings Modal Component
 * 
 * Modal wrapper for the LLM Settings Panel
 * Integrates with app state and provides modal UI
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LLMSettingsPanel } from './LLMSettingsPanel';
import type { LLMConfig } from '@/services/llmService';
import { saveLLMSettings, loadLLMSettings } from '@/utils/secureStorage';
import { triggerLLMPropagation } from '@/services/settingsPropagation';

export interface LLMSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LLMSettingsModal({ isOpen, onClose }: LLMSettingsModalProps) {
  const [currentConfig, setCurrentConfig] = React.useState<Partial<LLMConfig> | undefined>();

  // Load current settings when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const loadSettings = async () => {
        try {
          const settings = await loadLLMSettings();
          setCurrentConfig(settings || undefined);
        } catch (error) {
          console.error('Failed to load LLM settings:', error);
        }
      };
      loadSettings();
    }
  }, [isOpen]);

  const handleSave = async (config: LLMConfig) => {
    try {
      await saveLLMSettings(config);
      // Propagate settings to dependent services
      await triggerLLMPropagation();
      onClose();
    } catch (error) {
      console.error('Failed to save LLM settings:', error);
      throw error;
    }
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>LLM Configuration</DialogTitle>
        </DialogHeader>
        <LLMSettingsPanel
          currentConfig={currentConfig}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
