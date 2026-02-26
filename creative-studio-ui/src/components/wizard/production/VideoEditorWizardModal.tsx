import { useAppStore } from '@/stores/useAppStore';
import { VideoEditorWizard } from './VideoEditorWizard';
import { useToast } from '@/hooks/use-toast';

/**
 * Video Editor Wizard Modal
 * 
 * Wrapper component that connects the VideoEditorWizard to the app state.
 */
export function VideoEditorWizardModal() {
  const { 
    showVideoEditorWizard,
    closeVideoEditorWizard 
  } = useAppStore();
  
  const { toast } = useToast();

  const handleComplete = (result: { totalDuration: number }) => {
    toast({
      title: 'Video Sequence Created',
      description: `Successfully edited sequence with ${result.totalDuration}s total duration.`,
    });
    closeVideoEditorWizard();
  };

  return (
    <VideoEditorWizard
      isOpen={showVideoEditorWizard}
      onClose={closeVideoEditorWizard}
      onComplete={handleComplete}
    />
  );
}
