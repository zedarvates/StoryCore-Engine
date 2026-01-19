/**
 * Dialogue Writer Wizard Component
 *
 * Modal wizard for creating dialogue using the DialogueWriterForm
 * Provides a modal interface for dialogue generation
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DialogueWriterForm, DialogueWriterFormProps, DialogueInput } from './forms/DialogueWriterForm';

export interface DialogueWriterWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (data: DialogueInput) => void;
  characters: DialogueWriterFormProps['characters'];
  initialData?: Partial<DialogueInput>;
}

export function DialogueWriterWizard({
  isOpen,
  onClose,
  onComplete,
  characters,
  initialData,
}: DialogueWriterWizardProps) {
  const handleSubmit = (data: DialogueInput) => {
    onComplete(data);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dialogue Writer</DialogTitle>
        </DialogHeader>

        <div className="mt-4">
          <DialogueWriterForm
            initialData={initialData}
            characters={characters}
            onSubmit={handleSubmit}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}