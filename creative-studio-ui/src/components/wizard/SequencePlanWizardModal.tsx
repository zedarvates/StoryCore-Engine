import { useAppStore } from '@/stores/useAppStore';
import { useSequencePlanActions } from '@/stores/sequencePlanStore';
import { SequencePlanWizard } from './sequence-plan/SequencePlanWizard';
import { SequencePlan } from '@/types/sequencePlan';
import { useToast } from '@/hooks/use-toast';

/**
 * Sequence Plan Wizard Modal
 * 
 * Wrapper component that connects the SequencePlanWizard to the app state
 * and handles completion/cancellation logic.
 */
export function SequencePlanWizardModal() {
  const { 
    showSequencePlanWizard, 
    sequencePlanWizardContext,
    closeSequencePlanWizard 
  } = useAppStore();
  
  const { createPlan, updatePlan } = useSequencePlanActions();
  const { toast } = useToast();

  const handleComplete = async (sequencePlan: SequencePlan) => {
    try {
      if (sequencePlanWizardContext?.mode === 'edit') {
        await updatePlan(sequencePlan.id, sequencePlan);
        toast({
          title: 'Sequence Plan Updated',
          description: `"${sequencePlan.name}" has been updated successfully.`,
        });
      } else {
        await createPlan(sequencePlan);
        toast({
          title: 'Sequence Plan Created',
          description: `"${sequencePlan.name}" has been created successfully.`,
        });
      }
      closeSequencePlanWizard();
    } catch (error) {
      console.error('Failed to save sequence plan:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save sequence plan',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    closeSequencePlanWizard();
  };

  return (
    <SequencePlanWizard
      isOpen={showSequencePlanWizard}
      onClose={handleClose}
      onComplete={handleComplete}
      initialTemplateId={sequencePlanWizardContext?.initialTemplateId}
      existingSequencePlan={sequencePlanWizardContext?.existingSequencePlan}
    />
  );
}
