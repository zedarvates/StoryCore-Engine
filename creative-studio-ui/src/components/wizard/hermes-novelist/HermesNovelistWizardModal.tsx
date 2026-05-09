import React from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { HermesNovelistWizard } from './HermesNovelistWizard';
import { useAppStore } from '@/stores/useAppStore';

export const HermesNovelistWizardModal: React.FC = () => {
  const showHermesWizard = useAppStore((state) => state.showHermesWizard);
  const setShowHermesWizard = useAppStore((state) => state.setShowHermesWizard);

  return (
    <Dialog open={showHermesWizard} onOpenChange={setShowHermesWizard}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] overflow-y-auto p-0 border-none shadow-2xl bg-background/95 backdrop-blur-md">
        <HermesNovelistWizard onClose={() => setShowHermesWizard(false)} />
      </DialogContent>
    </Dialog>
  );
};
