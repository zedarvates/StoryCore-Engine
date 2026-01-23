import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// useAutoSave Hook
// Sauvegarde automatique des données dans localStorage
// ============================================================================

interface DraftData<T> {
  data: T;
  timestamp: number;
  stepIndex: number;
}

interface UseAutoSaveOptions {
  storageKey: string;
  interval?: number;
  maxDrafts?: number;
}

/**
 * Hook pour la sauvegarde automatique des brouillons de wizard
 */
export function useAutoSave<T>(
  options: UseAutoSaveOptions
) {
  const { storageKey, interval = 30000, maxDrafts = 5 } = options;

  const [draft, setDraft] = useState<T | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getStorageKey = useCallback((stepIndex?: number) => {
    return stepIndex !== undefined 
      ? `${storageKey}_step_${stepIndex}`
      : storageKey;
  }, [storageKey]);

  const saveToStorage = useCallback((data: T, stepIndex: number) => {
    try {
      const storageKeyWithStep = getStorageKey(stepIndex);
      
      const draftData: DraftData<T> = {
        data,
        timestamp: Date.now(),
        stepIndex,
      };
      
      localStorage.setItem(storageKeyWithStep, JSON.stringify(draftData));
      
      // Gestion des anciens brouillons
      const allDrafts: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`${storageKey}_step_`)) {
          allDrafts.push(key);
        }
      }
      
      if (allDrafts.length > maxDrafts) {
        const sortedDrafts = allDrafts.sort((a, b) => {
          const timeA = parseInt(a.split('_').pop() || '0');
          const timeB = parseInt(b.split('_').pop() || '0');
          return timeA - timeB;
        });
        
        const toRemove = sortedDrafts.slice(0, allDrafts.length - maxDrafts);
        toRemove.forEach(key => localStorage.removeItem(key));
      }
      
      setLastSaved(new Date());
      setError(null);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde:', err);
      setError('Impossible de sauvegarder le brouillon');
    }
  }, [storageKey, maxDrafts, getStorageKey]);

  const saveNow = useCallback((data: T, stepIndex: number) => {
    setIsSaving(true);
    try {
      saveToStorage(data, stepIndex);
    } finally {
      setIsSaving(false);
    }
  }, [saveToStorage]);

  const restore = useCallback((stepIndex?: number): T | null => {
    try {
      const storageKeyWithStep = getStorageKey(stepIndex);
      const saved = localStorage.getItem(storageKeyWithStep);
      
      if (saved) {
        const parsed: DraftData<T> = JSON.parse(saved);
        setDraft(parsed.data);
        return parsed.data;
      }
      
      if (stepIndex === undefined) {
        const keys = Object.keys(localStorage).filter(k => 
          k.startsWith(`${storageKey}_step_`)
        );
        
        if (keys.length > 0) {
          const mostRecentKey = keys.sort((a, b) => {
            const timeA = parseInt(a.split('_').pop() || '0');
            const timeB = parseInt(b.split('_').pop() || '0');
            return timeB - timeA;
          })[0];
          
          const savedData = localStorage.getItem(mostRecentKey);
          if (savedData) {
            const parsed: DraftData<T> = JSON.parse(savedData);
            setDraft(parsed.data);
            return parsed.data;
          }
        }
      }
      
      return null;
    } catch (err) {
      console.error('Erreur lors de la restauration:', err);
      setError('Impossible de restaurer le brouillon');
      return null;
    }
  }, [storageKey, getStorageKey]);

  const clear = useCallback(() => {
    try {
      const keys = Object.keys(localStorage).filter(k => 
        k.startsWith(`${storageKey}_step_`)
      );
      
      keys.forEach(key => localStorage.removeItem(key));
      setDraft(null);
      setLastSaved(null);
      setError(null);
    } catch (err) {
      console.error('Erreur lors de la suppression:', err);
    }
  }, [storageKey]);

  return {
    draft,
    lastSaved,
    isSaving,
    error,
    saveNow,
    restore,
    clear,
    hasDraft: draft !== null,
  };
}

export default useAutoSave;

