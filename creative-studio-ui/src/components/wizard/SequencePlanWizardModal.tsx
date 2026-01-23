import { useAppStore } from '@/stores/useAppStore';
import { useSequencePlanStore, updatePlan } from '@/stores/sequencePlanStore';
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
  const showSequencePlanWizard = useAppStore(state => state.showSequencePlanWizard);
  const sequencePlanWizardContext = useAppStore(state => state.sequencePlanWizardContext);
  const closeSequencePlanWizard = useAppStore(state => state.closeSequencePlanWizard);

  const createPlan = useSequencePlanStore(state => state.createPlan);
  const setCurrentPlan = useSequencePlanStore(state => state.selectPlan);
  // updatePlan is defined in the store as a standalone function
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
        // Create empty plan first
        await createPlan(sequencePlan.name, sequencePlan.description);

        // Get the newly created plan ID from the store
        const state = useSequencePlanStore.getState();
        const newPlanId = state.currentPlanId;
        
        if (!newPlanId) {
          throw new Error('Failed to get newly created plan ID');
        }


        // Then update it with all the wizard data
        const completePlan: SequencePlan = {
          ...sequencePlan,
          id: newPlanId, // Use the ID from the created plan
        };

        await updatePlan(newPlanId, completePlan);

        // Set as current plan (already done by createPlan, but ensure it)
        await setCurrentPlan(newPlanId);

        toast({
          title: 'Sequence Plan Created',
          description: `"${sequencePlan.name}" has been created and added to your project successfully.`,
        });
      }
      closeSequencePlanWizard();
    } catch (error) {
      console.error('SequencePlanWizardModal: Failed to save sequence plan:', error);
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
