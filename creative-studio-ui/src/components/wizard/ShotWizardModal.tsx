import { useAppStore } from '@/stores/useAppStore';
import { useEditorStore } from '@/stores/editorStore';
import { ShotWizard } from './shot/ShotWizard';
import { ProductionShot } from '@/types/shot';
import { useToast } from '@/hooks/use-toast';

/**
 * Shot Wizard Modal
 * 
 * Wrapper component that connects the ShotWizard to the app state
 * and handles completion/cancellation logic.
 */
export function ShotWizardModal() {
  const { 
    showShotWizard, 
    shotWizardContext,
    closeShotWizard 
  } = useAppStore();
  
  const { createShot, updateShot } = useEditorStore();
  const { toast } = useToast();

  const handleComplete = async (shot: ProductionShot) => {
    try {
      if (shotWizardContext?.mode === 'edit' && shotWizardContext.existingShot) {
        await updateShot(shotWizardContext.existingShot.id, shot);
        toast({
          title: 'Shot Updated',
          description: `Shot ${shot.number} has been updated successfully.`,
        });
      } else {
        await createShot(shot);
        toast({
          title: 'Shot Created',
          description: `Shot ${shot.number} has been created successfully.`,
        });
      }
      closeShotWizard();
    } catch (error) {
      console.error('Failed to save shot:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save shot',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    closeShotWizard();
  };

  return (
    <ShotWizard
      isOpen={showShotWizard}
      onClose={handleClose}
      onComplete={handleComplete}
      sequenceId={shotWizardContext?.sequenceId}
      sceneId={shotWizardContext?.sceneId}
      shotNumber={shotWizardContext?.shotNumber}
      initialTemplateId={shotWizardContext?.initialTemplateId}
      existingShot={shotWizardContext?.existingShot}
      quickMode={shotWizardContext?.quickMode}
    />
  );
}
