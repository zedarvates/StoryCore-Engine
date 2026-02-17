/**
 * Sequence Plan Wizard Modal
 * 
 * Wrapper component that renders the full Sequence Plan Wizard
 * 
 * Replaces the previous simple modal with the main production wizard.
 */

import React from 'react';
import { SequencePlanWizard } from './sequence-plan/SequencePlanWizard';
import { SequencePlan } from '@/types/sequencePlan';

interface SequencePlanWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (sequencePlan: SequencePlan) => void;
  initialTemplateId?: string;
  initialPlan?: SequencePlan;
  mode?: 'create' | 'edit';
}

export function SequencePlanWizardModal({
  isOpen,
  onClose,
  onComplete,
  initialTemplateId,
  initialPlan,
  mode
}: SequencePlanWizardModalProps) {
  // Map the props to what SequencePlanWizard expects
  return (
    <SequencePlanWizard
      isOpen={isOpen}
      onClose={onClose}
      onComplete={onComplete}
      initialTemplateId={initialTemplateId}
      existingSequencePlan={initialPlan}
    />
  );
}

export default SequencePlanWizardModal;
