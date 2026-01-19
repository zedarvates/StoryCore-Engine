/**
 * Character Wizard Modal Component
 * 
 * Modal wrapper for the Character Creation Wizard
 * Integrates with app state and provides modal UI
 */

import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CharacterWizard } from './character/CharacterWizard';
import type { Character } from '@/types/character';
import type { World } from '@/types/world';

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
  const handleComplete = (character: Character) => {
    onComplete?.(character);
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
        <CharacterWizard
          onComplete={handleComplete}
          onCancel={handleCancel}
          worldContext={worldContext}
          initialData={initialData}
        />
      </DialogContent>
    </Dialog>
  );
}
