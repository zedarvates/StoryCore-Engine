/**
 * Ghost Tracker Wizard Modal
 * 
 * Wrapper for the Ghost Tracker wizard component.
 */

import React from 'react';
import { GhostTrackerWizard } from './GhostTrackerWizard';
import { useAppStore } from '@/stores/useAppStore';

export function GhostTrackerWizardModal() {
  const showGhostTrackerWizard = useAppStore((state) => state.showGhostTrackerWizard);
  const setShowGhostTrackerWizard = useAppStore((state) => state.setShowGhostTrackerWizard);

  if (!showGhostTrackerWizard) return null;

  return (
    <GhostTrackerWizard
      isOpen={showGhostTrackerWizard}
      onClose={() => setShowGhostTrackerWizard(false)}
    />
  );
}
