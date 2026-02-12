import { useAppStore } from '@/stores/useAppStore';
import { useAudioRemixStore } from '@/stores/audioRemixStore';
import { AudioProductionWizard } from './AudioProductionWizard';
import { useToast } from '@/hooks/use-toast';

/**
 * Audio Production Wizard Modal
 * 
 * Wrapper component that connects the AudioProductionWizard to the app state
 * and handles completion/cancellation logic.
 */
export function AudioProductionWizardModal() {
  const { 
    showAudioProductionWizard,
    audioProductionWizardContext,
    closeAudioProductionWizard 
  } = useAppStore();
  
  const { 
    loadTrack, 
    analyzeStructure, 
    executeRemix, 
    export: exportAudio,
    reset,
    ...storeState
  } = useAudioRemixStore();
  
  const { toast } = useToast();

  const handleComplete = async () => {
    try {
      if (!storeState.remixResult && !storeState.exportedUrl) {
        // If no remix exists yet, execute the remix first
        await executeRemix();
      }
      
      const exportUrl = await exportAudio('mp3');
      
      toast({
        title: 'Audio Production Complete',
        description: `Audio has been exported successfully.`,
      });
      
      closeAudioProductionWizard();
      reset();
    } catch (error) {
      console.error('Failed to complete audio production:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete audio production',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    closeAudioProductionWizard();
    reset();
  };

  return (
    <AudioProductionWizard
      isOpen={showAudioProductionWizard}
      onClose={handleClose}
      onComplete={handleComplete}
      initialAudioId={audioProductionWizardContext?.audioId}
      initialAudioUrl={audioProductionWizardContext?.audioUrl}
    />
  );
}
