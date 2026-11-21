import { useMemo } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { LipSyncWizard } from './LipSyncWizard';

export function LipSyncWizardModal() {
  const { showLipSyncWizard, setShowLipSyncWizard, lipSyncContext, project, shots, updateShot } = useAppStore();
  const context = useMemo(() => {
    if (!lipSyncContext) return undefined;
    const character = project?.characters?.find(
      (candidate) => candidate.character_id === lipSyncContext.characterId,
    );
    return {
      ...lipSyncContext,
      characterImage: lipSyncContext.characterImage ?? character?.visual_identity?.generated_portrait,
    };
  }, [lipSyncContext, project?.characters]);

  if (!showLipSyncWizard) return null;

  return (
    <LipSyncWizard
      isOpen={showLipSyncWizard}
      onClose={() => setShowLipSyncWizard(false)}
      projectId={project?.id || 'default'}
      context={context}
      onVideoReady={(shotId, videoUrl) => {
        const shot = shots.find((candidate) => candidate.id === shotId);
        if (shot) updateShot(shotId, { metadata: { ...shot.metadata, videoUrl } });
      }}
    />
  );
}
