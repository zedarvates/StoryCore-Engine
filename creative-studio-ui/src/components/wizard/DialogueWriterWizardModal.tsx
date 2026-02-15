import React from 'react';
import { useEditorStore } from '@/stores/editorStore';
import { useAppStore } from '@/stores/useAppStore';
import { DialogueWriterWizard } from './DialogueWriterWizard';
import { useToast } from '@/hooks/use-toast';

export function DialogueWriterWizardModal() {
    const { activeWizard, closeWizard } = useEditorStore();
    const { project, updateShot, selectedShotId } = useAppStore();
    const { toast } = useToast();

    const isOpen = activeWizard?.wizardId === 'dialogue-writer';

    if (!isOpen) return null;

    const characters = project?.characters?.map(c => ({
        id: c.character_id, // Ensure mapping matches DialogueWriterWizard expectation
        name: c.name
    })) || [];

    return (
        <DialogueWriterWizard
            isOpen={isOpen}
            onClose={closeWizard}
            characters={characters}
            initialData={activeWizard.formData}
            onComplete={(data, result) => {
                if (result && selectedShotId) {
                    updateShot(selectedShotId, { description: result });
                    toast({ title: "Dialogue saved", description: "Added to shot description." });
                }
                closeWizard();
            }}
        />
    );
}
