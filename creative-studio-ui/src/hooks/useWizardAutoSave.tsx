/**
 * Wizard Auto-save Hook
 * 
 * Provides auto-save functionality for wizards using DraftPersistence.
 * Supports both web (localStorage) and desktop (file system) environments.
 * Includes crash recovery capabilities.
 * 
 * Requirements: 9.5, 9.6
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { draftPersistence, DraftMetadata } from '../services/wizard/DraftPersistence';

/**
 * Auto-save hook configuration
 */
export interface UseWizardAutoSaveConfig {
  /** Whether auto-save is enabled */
  enabled?: boolean;
  /** Auto-save interval in milliseconds (default: 30000 = 30s) */
  intervalMs?: number;
  /** Wizard type identifier */
  wizardType: string;
  /** Draft ID if resuming from existing draft */
  draftId?: string;
  /** Callback when save completes */
  onSave?: (draftId: string) => void;
  /** Callback when save fails */
  onSaveError?: (error: Error) => void;
  /** Callback when draft is recovered */
  onRecover?: (metadata: DraftMetadata) => void;
}

/**
 * Auto-save hook return type
 */
export interface UseWizardAutoSaveResult {
  /** Whether a save is in progress */
  isSaving: boolean;
  /** Whether there's unsaved changes */
  isDirty: boolean;
  /** Last saved timestamp */
  lastSaved: Date | null;
  /** Current draft ID */
  draftId: string | null;
  /** Save manually */
  save: () => Promise<void>;
  /** Clear saved draft */
  clear: () => Promise<void>;
  /** List all drafts */
  listDrafts: () => Promise<DraftMetadata[]>;
  /** Recover a specific draft */
  recover: (id: string) => Promise<Partial<any> | null>;
}

/**
 * Wizard state interface for auto-save
 */
export interface WizardAutoSaveState {
  currentStep: number;
  completedSteps: number[];
  isReviewMode: boolean;
  [key: string]: unknown;
}

/**
 * Hook for wizard auto-save functionality
 * 
 * @param getState - Function to get current wizard state
 * @param config - Configuration options
 * @returns Auto-save interface
 */
export function useWizardAutoSave<T extends WizardAutoSaveState>(
  getState: () => T,
  config: UseWizardAutoSaveConfig
): UseWizardAutoSaveResult {
  const {
    enabled = true,
    intervalMs = 30000,
    wizardType,
    draftId: initialDraftId,
    onSave,
    onSaveError,
    onRecover,
  } = config;

  const [isSaving, setIsSaving] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(initialDraftId || null);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dirtyRef = useRef(false);

  // Get current state
  const getCurrentState = useCallback(() => {
    const state = getState();
    return {
      ...state,
      draftId: currentDraftId,
      lastSaved: new Date(),
    };
  }, [getState, currentDraftId]);

  /**
   * Save draft manually or via auto-save
   */
  const saveDraft = useCallback(async () => {
    if (isSaving) return;
    
    setIsSaving(true);
    
    try {
      const state = getCurrentState();
      const id = await draftPersistence.saveDraft(state);
      setCurrentDraftId(id);
      setLastSaved(new Date());
      setIsDirty(false);
      dirtyRef.current = false;
      
      if (onSave) {
        onSave(id);
      }
      
      console.log(`[useWizardAutoSave] Draft saved: ${id}`);
    } catch (error) {
      console.error('[useWizardAutoSave] Save failed:', error);
      if (onSaveError && error instanceof Error) {
        onSaveError(error);
      }
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, getCurrentState, onSave, onSaveError]);

  /**
   * Manual save trigger
   */
  const save = useCallback(async () => {
    await saveDraft();
  }, [saveDraft]);

  /**
   * Clear saved draft
   */
  const clear = useCallback(async () => {
    if (currentDraftId) {
      try {
        await draftPersistence.deleteDraft(currentDraftId);
        setCurrentDraftId(null);
        setLastSaved(null);
        setIsDirty(false);
        dirtyRef.current = false;
        console.log(`[useWizardAutoSave] Draft cleared: ${currentDraftId}`);
      } catch (error) {
        console.error('[useWizardAutoSave] Clear failed:', error);
      }
    }
  }, [currentDraftId]);

  /**
   * List all drafts for this wizard type
   */
  const listDrafts = useCallback(async (): Promise<DraftMetadata[]> => {
    try {
      const allDrafts = await draftPersistence.listDrafts();
      return allDrafts.filter(d => d.id.includes(wizardType));
    } catch (error) {
      console.error('[useWizardAutoSave] List drafts failed:', error);
      return [];
    }
  }, [wizardType]);

  /**
   * Recover a specific draft
   */
  const recover = useCallback(async (draftId: string): Promise<Partial<T> | null> => {
    try {
      const state = await draftPersistence.loadDraft(draftId);
      
      if (state) {
        setCurrentDraftId(draftId);
        setLastSaved(state.lastSaved || null);
        
        if (onRecover) {
          const metadata: DraftMetadata = {
            id: draftId,
            projectName: 'Recovered draft',
            lastSaved: state.lastSaved || new Date(),
            currentStep: state.currentStep || 1,
            completedSteps: Array.from(state.completedSteps || []),
          };
          onRecover(metadata);
        }
        
        console.log(`[useWizardAutoSave] Draft recovered: ${draftId}`);
      }
      
      return state as Partial<T>;
    } catch (error) {
      console.error('[useWizardAutoSave] Recovery failed:', error);
      return null;
    }
  }, [onRecover]);

  /**
   * Mark state as dirty (has unsaved changes)
   */
  const markDirty = useCallback(() => {
    if (!dirtyRef.current) {
      setIsDirty(true);
      dirtyRef.current = true;
    }
  }, []);

  // Set up auto-save interval
  useEffect(() => {
    if (!enabled) return;

    // Start auto-save timer
    intervalRef.current = setInterval(async () => {
      if (dirtyRef.current) {
        await saveDraft();
      }
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, intervalMs, saveDraft]);

  // Return interface
  return {
    isSaving,
    isDirty,
    lastSaved,
    draftId: currentDraftId,
    save,
    clear,
    listDrafts,
    recover,
    markDirty, // Expose for components to call when data changes
  };
}

/**
 * Hook for crash recovery functionality
 */
export function useWizardCrashRecovery(wizardType: string) {
  const [pendingRecovery, setPendingRecovery] = useState<{
    draftId: string;
    lastSaved: Date;
  } | null>(null);
  const [isRecovering, setIsRecovering] = useState(false);

  /**
   * Check for pending recovery on mount
   */
  useEffect(() => {
    const checkRecovery = async () => {
      try {
        const drafts = await draftPersistence.listDrafts();
        const wizardDrafts = drafts.filter(d => d.id.includes(wizardType));
        
        if (wizardDrafts.length > 0) {
          // Get most recent draft
          const latestDraft = wizardDrafts[0];
          
          // Check if draft is recent (within last 24 hours)
          const hoursSinceSave = (Date.now() - latestDraft.lastSaved.getTime()) / (1000 * 60 * 60);
          
          if (hoursSinceSave < 24) {
            setPendingRecovery({
              draftId: latestDraft.id,
              lastSaved: latestDraft.lastSaved,
            });
          }
        }
      } catch (error) {
        console.error('[useWizardCrashRecovery] Check failed:', error);
      }
    };

    checkRecovery();
  }, [wizardType]);

  /**
   * Accept recovery and load draft
   */
  const acceptRecovery = useCallback(async () => {
    if (!pendingRecovery) return null;
    
    setIsRecovering(true);
    
    try {
      const state = await draftPersistence.loadDraft(pendingRecovery.draftId);
      setPendingRecovery(null);
      return state;
    } catch (error) {
      console.error('[useWizardCrashRecovery] Recovery failed:', error);
      return null;
    } finally {
      setIsRecovering(false);
    }
  }, [pendingRecovery]);

  /**
   * Discard recovery and start fresh
   */
  const discardRecovery = useCallback(async () => {
    if (!pendingRecovery) return;
    
    try {
      await draftPersistence.deleteDraft(pendingRecovery.draftId);
      setPendingRecovery(null);
    } catch (error) {
      console.error('[useWizardCrashRecovery] Discard failed:', error);
    }
  }, [pendingRecovery]);

  return {
    pendingRecovery,
    isRecovering,
    acceptRecovery,
    discardRecovery,
    hasPendingRecovery: pendingRecovery !== null,
  };
}

/**
 * Component to display auto-save status
 */
export interface WizardAutoSaveIndicatorProps {
  isSaving: boolean;
  isDirty: boolean;
  lastSaved: Date | null;
  draftId: string | null;
}

export function WizardAutoSaveIndicator({
  isSaving,
  isDirty,
  lastSaved,
}: WizardAutoSaveIndicatorProps) {
  if (isSaving) {
    return (
      <span className="wizard-auto-save-indicator wizard-auto-save-indicator--saving">
        💾 Saving...
      </span>
    );
  }

  if (isDirty) {
    return (
      <span className="wizard-auto-save-indicator wizard-auto-save-indicator--dirty">
        ✏️ Unsaved changes
      </span>
    );
  }

  if (lastSaved) {
    const timeAgo = Math.round((Date.now() - lastSaved.getTime()) / 1000);
    let timeText: string;
    
    if (timeAgo < 60) {
      timeText = 'just now';
    } else if (timeAgo < 3600) {
      timeText = `${Math.round(timeAgo / 60)}m ago`;
    } else {
      timeText = `${Math.round(timeAgo / 3600)}h ago`;
    }

    return (
      <span className="wizard-auto-save-indicator wizard-auto-save-indicator--saved">
        ✅ Saved {timeText}
      </span>
    );
  }

  return null;
}

/**
 * Component to display crash recovery dialog
 */
export interface WizardRecoveryDialogProps {
  pendingRecovery: {
    draftId: string;
    lastSaved: Date;
  } | null;
  isRecovering: boolean;
  onAccept: () => void;
  onDiscard: () => void;
  projectName?: string;
}

export function WizardRecoveryDialog({
  pendingRecovery,
  isRecovering,
  onAccept,
  onDiscard,
  projectName = 'Your work',
}: WizardRecoveryDialogProps) {
  if (!pendingRecovery) return null;

  const lastSavedTime = new Date(pendingRecovery.lastSaved).toLocaleString();

  return (
    <div className="wizard-recovery-overlay">
      <div className="wizard-recovery-dialog">
        <h3>Recover unsaved work?</h3>
        <p>
          We found a recent draft of <strong>{projectName}</strong> from{' '}
          <strong>{lastSavedTime}</strong>.
        </p>
        <p>Would you like to continue where you left off?</p>
        
        <div className="wizard-recovery-actions">
          <button
            className="wizard-recovery-button wizard-recovery-button--discard"
            onClick={onDiscard}
            disabled={isRecovering}
          >
            Start Fresh
          </button>
          <button
            className="wizard-recovery-button wizard-recovery-button--accept"
            onClick={onAccept}
            disabled={isRecovering}
          >
            {isRecovering ? 'Recovering...' : 'Continue Editing'}
          </button>
        </div>
      </div>

      <style>{`
        .wizard-recovery-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }

        .wizard-recovery-dialog {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          max-width: 400px;
          text-align: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .wizard-recovery-dialog h3 {
          margin: 0 0 1rem;
          font-size: 1.25rem;
          color: #1a1a1a;
        }

        .wizard-recovery-dialog p {
          color: #666;
          margin: 0.5rem 0;
          line-height: 1.5;
        }

        .wizard-recovery-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
          justify-content: center;
        }

        .wizard-recovery-button {
          padding: 0.75rem 1.5rem;
          border: none;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .wizard-recovery-button--discard {
          background: #f5f5f5;
          color: #666;
        }

        .wizard-recovery-button--discard:hover {
          background: #e5e5e5;
        }

        .wizard-recovery-button--accept {
          background: #667eea;
          color: white;
        }

        .wizard-recovery-button--accept:hover {
          background: #5a6fd6;
        }

        .wizard-recovery-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .wizard-auto-save-indicator {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
        }

        .wizard-auto-save-indicator--saving {
          color: #667eea;
        }

        .wizard-auto-save-indicator--dirty {
          color: #f59e0b;
        }

        .wizard-auto-save-indicator--saved {
          color: #10b981;
        }
      `}</style>
    </div>
  );
}


