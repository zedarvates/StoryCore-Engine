
import { useCallback } from 'react';
import { useStore } from '../store';
import { useAppStore } from '../stores/useAppStore';
import { useEditorStore } from '../stores/editorStore';
import type { SequencePlan } from '../types';
import { 
  saveSequenceToProject, 
  listSequencesInProject, 
  deleteSequenceFromProject 
} from '../utils/sequenceStorage';
import { logger } from '../utils/logger';

export function useSequencePersistence() {
  const setSequencePlans = useStore((state) => state.setSequencePlans);
  const updateSequencePlan = useStore((state) => state.updateSequencePlan);
  const deleteSequencePlanStore = useStore((state) => state.deleteSequencePlan);
  
  const projectPath = useEditorStore((state) => state.projectPath);

  /**
   * Sync sequences from project directory to store
   */
  const loadAndSyncSequences = useCallback(async () => {
    const appState = useAppStore.getState();
    const currentProjectPath = projectPath || appState.project?.path || (appState.project?.metadata?.path as string);
    
    if (!currentProjectPath) {
      logger.warn('[useSequencePersistence] No project path available for sync');
      return { loaded: 0, errors: 0 };
    }

    try {
      const sequences = await listSequencesInProject(currentProjectPath);
      if (sequences && sequences.length > 0) {
        setSequencePlans(sequences as SequencePlan[]);
        logger.info(`[useSequencePersistence] Synced ${sequences.length} sequences from filesystem`);
        return { loaded: sequences.length, errors: 0 };
      }
      return { loaded: 0, errors: 0 };
    } catch (error) {
      logger.error('[useSequencePersistence] Failed to sync sequences:', error);
      return { loaded: 0, errors: 1 };
    }
  }, [projectPath, setSequencePlans]);

  /**
   * Save a sequence to the project
   */
  const saveSequence = useCallback(async (sequence: SequencePlan) => {
    const appState = useAppStore.getState();
    const currentProjectPath = projectPath || appState.project?.path || (appState.project?.metadata?.path as string);
    
    if (!currentProjectPath) {
      logger.error('[useSequencePersistence] Cannot save sequence: No project path');
      return;
    }

    try {
      // Update store
      updateSequencePlan(sequence.id, sequence);
      
      // Save to file
      await saveSequenceToProject(currentProjectPath, sequence);
    } catch (error) {
      logger.error('[useSequencePersistence] Failed to save sequence:', error);
    }
  }, [projectPath, updateSequencePlan]);

  /**
   * Delete a sequence
   */
  const deleteSequence = useCallback(async (sequenceId: string) => {
    const appState = useAppStore.getState();
    const currentProjectPath = projectPath || appState.project?.path || (appState.project?.metadata?.path as string);
    
    if (!currentProjectPath) return;

    try {
      deleteSequencePlanStore(sequenceId);
      await deleteSequenceFromProject(currentProjectPath, sequenceId);
    } catch (error) {
      logger.error('[useSequencePersistence] Failed to delete sequence:', error);
    }
  }, [projectPath, deleteSequencePlanStore]);

  return {
    loadAndSyncSequences,
    saveSequence,
    deleteSequence
  };
}
