/**
 * World Wizard Modal Component
 * 
 * Modal wrapper for the World Creation Wizard
 * Integrates with app state and provides modal UI
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { WorldWizard } from './world/WorldWizard';
import { LLMStatusBanner } from './LLMStatusBanner';
import { useAppStore } from '@/stores/useAppStore';
import type { World } from '@/types/world';

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

  const handleComplete = (world: World) => {
    onComplete?.(world);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 cyber-card border-primary/30 bg-card/95 backdrop-blur-sm">
        <DialogHeader className="sr-only">
          <DialogTitle>Create World</DialogTitle>
          <DialogDescription>
            Create a new world for your story with detailed settings and rules
          </DialogDescription>
        </DialogHeader>
        
        {/* LLM Status Banner */}
        <LLMStatusBanner onConfigure={() => setShowLLMSettings(true)} />
        
        <WorldWizard
          onComplete={handleComplete}
          onCancel={handleCancel}
          initialData={initialData}
        />
      </DialogContent>
    </Dialog>
  );
}
