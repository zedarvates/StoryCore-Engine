import React from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { LipSyncWizard } from './LipSyncWizard';
import { useToast } from '@/hooks/use-toast';

export function LipSyncWizardModal() {
    const { 
        showLipSyncWizard, 
        setShowLipSyncWizard, 
        lipSyncContext,
        project,
        updateShot
    } = useAppStore();
    const { toast } = useToast();

    if (!showLipSyncWizard) return null;

    return (
        <LipSyncWizard
            isOpen={showLipSyncWizard}
            onClose={() => setShowLipSyncWizard(false)}
            projectId={project?.id || 'default'}
            preSelectedCharacterImage={lipSyncContext?.characterImage}
            preSelectedAudioFile={lipSyncContext?.audioFile}
            onComplete={(videoUrl) => {
                // If we have a shotId in the context, update that shot with the new video URL
                if (lipSyncContext?.shotId) {
                    console.log(`[LipSyncWizardModal] Updating shot ${lipSyncContext.shotId} with video:`, videoUrl);
                    updateShot(lipSyncContext.shotId, {
                        // In the Shot type, we might want to store this in 'image' (as a video result)
                        // or a more specific field if available. Looking at types/index.ts...
                        image: videoUrl,
                    });
                }

                toast({ 
                    title: "Lip Sync Complete", 
                    description: `Your video is ready and has been added to the project.` 
                });
            }}
        />
    );
}
