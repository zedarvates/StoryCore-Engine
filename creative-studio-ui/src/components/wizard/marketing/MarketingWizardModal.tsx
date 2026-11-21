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
    project,
    showMarketingWizard,
    marketingWizardContext,
    closeMarketingWizard 
  } = useAppStore();
  
  const { toast } = useToast();

  if (!showMarketingWizard || !project) return null;
  const projectId = marketingWizardContext?.projectId || project.id;
  if (projectId !== project.id) return null;
  const projectName = project.project_name;
  const projectData = {
    projectId,
    projectName,
    storySummary: project.stories?.find((story) => story.summary)?.summary,
    characters: project.characters?.map((character) => character.name),
  };

  const handleComplete = (plan: MarketingPlan) => {
    toast({
      title: 'Marketing Plan Created',
      description: `Successfully created a ${plan.type} plan for ${projectName}.`,
    });
    // In a real app, you might save this plan to the project
    closeMarketingWizard();
  };

  return (
    <MarketingWizard
      isOpen={showMarketingWizard}
      onClose={closeMarketingWizard}
      onComplete={handleComplete}
      projectData={projectData}
    />
  );
}
