/**
 * AddonsModal - Modal pour la gestion des add-ons
 *
 * Fenêtre modale qui affiche le panneau de gestion des add-ons
 */

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AddonsPanel } from './AddonsPanel';
import { AddonSettingsModal } from './AddonSettingsModal';

export interface AddonsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddonsModal({ isOpen, onClose }: AddonsModalProps) {
  const [settingsModal, setSettingsModal] = useState<{
    isOpen: boolean;
    addonId: string;
    addonName: string;
  }>({
    isOpen: false,
    addonId: '',
    addonName: ''
  });

  const handleOpenSettings = (addonId: string, addonName: string) => {
    setSettingsModal({
      isOpen: true,
      addonId,
      addonName
    });
  };

  const handleCloseSettings = () => {
    setSettingsModal(prev => ({ ...prev, isOpen: false }));
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Gestion des Add-ons</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <AddonsPanel onOpenSettings={handleOpenSettings} className="h-full overflow-y-auto" />
        </div>
      </DialogContent>
      </Dialog>

      <AddonSettingsModal
        isOpen={settingsModal.isOpen}
        onClose={handleCloseSettings}
        addonId={settingsModal.addonId}
        addonName={settingsModal.addonName}
      />
    </>
  );
}