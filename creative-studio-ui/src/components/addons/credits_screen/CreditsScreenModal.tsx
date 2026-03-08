import React from 'react';
import { Dialog, DialogContent } from '../../ui/dialog';
import { CreditsScreenEditor } from './CreditsScreenEditor';
import { useAppStore } from '@/stores/useAppStore';

export const CreditsScreenModal: React.FC = () => {
  const isOpen = useAppStore((state) => state.showCreditsScreen);
  const setIsOpen = useAppStore((state) => state.setShowCreditsScreen);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-4xl p-0 bg-transparent border-none">
        <CreditsScreenEditor />
      </DialogContent>
    </Dialog>
  );
};

export default CreditsScreenModal;
