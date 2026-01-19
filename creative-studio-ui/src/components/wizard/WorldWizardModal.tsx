/**
 * World Wizard Modal Component
 * 
 * Modal wrapper for the World Creation Wizard
 * Integrates with app state and provides modal UI
 */

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { WorldWizard } from './world/WorldWizard';
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
  const handleComplete = (world: World) => {
    onComplete?.(world);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <WorldWizard
          onComplete={handleComplete}
          onCancel={handleCancel}
          initialData={initialData}
        />
      </DialogContent>
    </Dialog>
  );
}
