/**
 * ComfyUI Settings Modal Component
 * 
 * Modal wrapper for the ComfyUI Settings Panel
 * Integrates with app state and provides modal UI
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ComfyUISettingsPanel } from './ComfyUISettingsPanel';
import type { ComfyUIConfig } from '@/services/comfyuiService';
import { getDefaultComfyUIConfig } from '@/services/comfyuiService';
import { triggerComfyUIPropagation } from '@/services/settingsPropagation';

export interface ComfyUISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ComfyUISettingsModal({ isOpen, onClose }: ComfyUISettingsModalProps) {
  const [currentConfig, setCurrentConfig] = React.useState<Partial<ComfyUIConfig> | undefined>();

  // Load current settings when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const loadSettings = () => {
        try {
          // Load from localStorage or use defaults
          const stored = localStorage.getItem('comfyui-settings');
          if (stored) {
            setCurrentConfig(JSON.parse(stored));
          } else {
            setCurrentConfig(getDefaultComfyUIConfig());
          }
        } catch (error) {
          console.error('Failed to load ComfyUI settings:', error);
          setCurrentConfig(getDefaultComfyUIConfig());
        }
      };
      loadSettings();
    }
  }, [isOpen]);

  const handleSave = async (config: ComfyUIConfig) => {
    try {
      // Save to localStorage
      localStorage.setItem('comfyui-settings', JSON.stringify(config));
      // Propagate settings to dependent services
      await triggerComfyUIPropagation();
      onClose();
    } catch (error) {
      console.error('Failed to save ComfyUI settings:', error);
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
          <DialogTitle>ComfyUI Configuration</DialogTitle>
        </DialogHeader>
        <ComfyUISettingsPanel
          currentConfig={currentConfig}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </DialogContent>
    </Dialog>
  );
}
