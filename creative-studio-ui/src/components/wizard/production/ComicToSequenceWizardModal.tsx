import { useAppStore } from '@/stores/useAppStore';
import { ComicToSequenceWizard } from './ComicToSequenceWizard';
import { useToast } from '@/hooks/use-toast';

/**
 * Comic to Sequence Wizard Modal
 * 
 * Wrapper component that connects the ComicToSequenceWizard to the app state.
 */
export function ComicToSequenceWizardModal() {
  const { 
    showComicToSequenceWizard,
    closeComicToSequenceWizard 
  } = useAppStore();
  
  const { toast } = useToast();

  const handleComplete = (result: { totalDuration: number }) => {
    toast({
      title: 'Sequence Generated',
      description: `Successfully converted comic panels into a ${result.totalDuration}s sequence.`,
    });
    closeComicToSequenceWizard();
  };

  return (
    <ComicToSequenceWizard
      isOpen={showComicToSequenceWizard}
      onClose={closeComicToSequenceWizard}
      onComplete={handleComplete}
    />
  );
}
