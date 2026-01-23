import { useState, useCallback } from 'react';
import { DialogueLine, ProductionShot } from '@/types/shot';
import { sapiService } from './SAPIService';

export interface DialogueState {
  dialogues: DialogueLine[];
  selectedDialogue: DialogueLine | null;
  isGenerating: boolean;
}

export const useDialogueManagement = () => {
  const [dialogueState, setDialogueState] = useState<DialogueState>({
    dialogues: [],
    selectedDialogue: null,
    isGenerating: false
  });

  const generateDialoguesForShot = useCallback(async (
    shot: ProductionShot,
    surroundMode: '5.1' | '7.1'
  ) => {
    setDialogueState(prev => ({ ...prev, isGenerating: true }));

    try {
      const dialogues = await sapiService.generateBulkDialogues(shot, surroundMode);
      setDialogueState(prev => ({
        ...prev,
        dialogues,
        isGenerating: false
      }));
      return dialogues;
    } catch (error) {
      console.error('Erreur lors de la génération des dialogues:', error);
      setDialogueState(prev => ({ ...prev, isGenerating: false }));
      return [];
    }
  }, []);

  const addManualDialogue = useCallback(async (
    characterId: string,
    text: string,
    shotPosition: { x: number; y: number; z: number },
    surroundMode: '5.1' | '7.1',
    emotionalTone?: DialogueLine['timing']['emotionalTone']
  ) => {
    setDialogueState(prev => ({ ...prev, isGenerating: true }));

    try {
      const dialogue = await sapiService.generateDialogue(
        characterId,
        text,
        shotPosition,
        surroundMode,
        emotionalTone
      );

      setDialogueState(prev => ({
        dialogues: [...prev.dialogues, dialogue],
        selectedDialogue: dialogue,
        isGenerating: false
      }));

      return dialogue;
    } catch (error) {
      console.error('Erreur lors de l\'ajout du dialogue manuel:', error);
      setDialogueState(prev => ({ ...prev, isGenerating: false }));
      return null;
    }
  }, []);

  const updateDialogue = useCallback((dialogueId: string, updates: Partial<DialogueLine>) => {
    setDialogueState(prev => ({
      ...prev,
      dialogues: prev.dialogues.map(d =>
        d.id === dialogueId ? { ...d, ...updates } : d
      ),
      selectedDialogue: prev.selectedDialogue?.id === dialogueId
        ? { ...prev.selectedDialogue, ...updates }
        : prev.selectedDialogue
    }));
  }, []);

  const updateDialogueSpatialization = useCallback((
    dialogueId: string,
    newPosition: { x: number; y: number; z: number },
    surroundMode: '5.1' | '7.1'
  ) => {
    const dialogue = dialogueState.dialogues.find(d => d.id === dialogueId);
    if (!dialogue) return;

    const updatedDialogue = sapiService.updateSpatialization(dialogue, newPosition, surroundMode);
    updateDialogue(dialogueId, updatedDialogue);
  }, [dialogueState.dialogues, updateDialogue]);

  const deleteDialogue = useCallback((dialogueId: string) => {
    setDialogueState(prev => ({
      ...prev,
      dialogues: prev.dialogues.filter(d => d.id !== dialogueId),
      selectedDialogue: prev.selectedDialogue?.id === dialogueId ? null : prev.selectedDialogue
    }));
  }, []);

  const selectDialogue = useCallback((dialogue: DialogueLine | null) => {
    setDialogueState(prev => ({ ...prev, selectedDialogue: dialogue }));
  }, []);

  const clearDialogues = useCallback(() => {
    setDialogueState({
      dialogues: [],
      selectedDialogue: null,
      isGenerating: false
    });
  }, []);

  return {
    dialogueState,
    generateDialoguesForShot,
    addManualDialogue,
    updateDialogue,
    updateDialogueSpatialization,
    deleteDialogue,
    selectDialogue,
    clearDialogues
  };
};