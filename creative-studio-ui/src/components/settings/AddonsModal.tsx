/**
 * AddonsModal - Modal pour la gestion des add-ons
 *
 * Fenêtre modale qui affiche le panneau de gestion des add-ons
 */

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AddonsPanel } from './AddonsPanel';
import { useAppStore } from '@/stores/useAppStore';

export interface AddonsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddonsModal({ isOpen, onClose }: AddonsModalProps) {
  const openAddonSettings = useAppStore(state => state.openAddonSettings);

  const handleOpenSettings = (addonId: string) => {
    openAddonSettings(addonId);
  };

  return (
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
  );
}
