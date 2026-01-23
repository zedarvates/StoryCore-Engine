import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface DialogueEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DialogueEditor({ isOpen, onClose }: DialogueEditorProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dialogue Editor</DialogTitle>
        </DialogHeader>
        <div className="p-4">
          <p className="text-muted-foreground">
            Dialogue editor functionality will be implemented here.
            This component integrates with the dialogue service for AI-powered dialogue generation and voice recording.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}