/**
 * ComfyUI Settings Modal Component
 * 
 * Modal wrapper for the ComfyUI Servers Panel
 * Integrates with app state and provides modal UI
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ComfyUIServersPanel } from './ComfyUIServersPanel';

export interface ComfyUISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ComfyUISettingsModal({ isOpen, onClose }: ComfyUISettingsModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>ComfyUI Configuration</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto p-6">
          <ComfyUIServersPanel />
        </div>
      </DialogContent>
    </Dialog>
  );
}
