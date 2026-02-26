import { useAppStore } from '@/stores/useAppStore';
import { MarketingWizard, type MarketingPlan } from './MarketingWizard';
import { useToast } from '@/hooks/use-toast';

/**
 * Marketing Content Wizard Modal
 * 
 * Wrapper component that connects the MarketingWizard to the app state.
 */
export function MarketingWizardModal() {
  const { 
    showMarketingWizard,
    marketingWizardContext,
    closeMarketingWizard 
  } = useAppStore();
  
  const { toast } = useToast();

  const handleComplete = (plan: MarketingPlan) => {
    toast({
      title: 'Marketing Plan Created',
      description: `Successfully created a ${plan.type} plan for ${marketingWizardContext?.projectName}.`,
    });
    // In a real app, you might save this plan to the project
    closeMarketingWizard();
  };

  if (!marketingWizardContext) return null;

  return (
    <MarketingWizard
      isOpen={showMarketingWizard}
      onClose={closeMarketingWizard}
      onComplete={handleComplete}
      projectData={marketingWizardContext}
    />
  );
}
