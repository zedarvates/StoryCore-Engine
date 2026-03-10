/**
 * Director Mode Dialog Component
 * 
 * Dialog that hosts the NanoBananaDirector component.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { NanoBananaDirector } from '../DirectorMode/NanoBananaDirector';

export interface DirectorModeDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DirectorModeDialog: React.FC<DirectorModeDialogProps> = ({
  isOpen,
  onClose,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-5xl p-0 overflow-hidden bg-transparent border-none shadow-2xl"
        style={{
          backdropFilter: 'blur(10px)',
          borderRadius: '24px'
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Director Mode</DialogTitle>
        </DialogHeader>
        
        <div className="relative">
          <NanoBananaDirector />
        </div>
      </DialogContent>
    </Dialog>
  );
};
