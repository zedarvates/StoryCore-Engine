/**
 * useAutoSave — Auto-save hook avec debounce
 * Inspiré de LTX-Desktop VideoEditor auto-save.
 *
 * Surveille les changements du modèle éditeur et sauvegarde
 * automatiquement après 500ms d'inactivité.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useProjectStore } from '@/stores/useProjectStore';
import { useShallow } from 'zustand/react/shallow';
import { logger as Logger } from '@/utils/logger';

interface UseAutoSaveOptions {
  /** Délai de debounce en ms (default: 500) */
  debounceMs?: number;
  /** Activer l'auto-save (default: true) */
  enabled?: boolean;
}

export function useAutoSave(options: UseAutoSaveOptions = {}) {
  const { debounceMs = 500, enabled = true } = options;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);

  const { shots, tracks, saveProjectToDisk, historyLength, lastSavedIndex } = useProjectStore(useShallow(state => ({
    shots: state.shots,
    tracks: state.tracks,
    saveProjectToDisk: state.saveProjectToDisk,
    historyLength: state.history?.length ?? 0,
    lastSavedIndex: state.lastSavedIndex,
  })));

  // Détecter les changements
  const isDirty = historyLength > lastSavedIndex;

  const performSave = useCallback(async () => {
    if (!enabled) return;

    setSaveStatus('saving');
    Logger.debug('💾 [AutoSave] Saving...');

    try {
      const result = await saveProjectToDisk();
      if (result.success) {
        setSaveStatus('saved');
        setLastSaveTime(Date.now());
        Logger.debug('💾 [AutoSave] Saved successfully');
      } else {
        setSaveStatus('error');
        Logger.error('💾 [AutoSave] Failed:', result.errors);
      }
    } catch (err) {
      setSaveStatus('error');
      Logger.error('💾 [AutoSave] Error:', err);
    }
  }, [enabled, saveProjectToDisk]);

  // Debounced auto-save
  useEffect(() => {
    if (!enabled || !isDirty) return;

    // Montrer "unsaved"
    setSaveStatus('unsaved');

    // Clear le timer existant
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Démarrer un nouveau timer
    timerRef.current = setTimeout(() => {
      performSave();
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [shots, tracks, isDirty, debounceMs, enabled, performSave]);

  // Sauvegarde manuelle (Ctrl+S)
  const manualSave = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    await performSave();
  }, [performSave]);

  return {
    saveStatus,
    lastSaveTime,
    isDirty,
    manualSave,
  };
}

/**
 * SaveStatusIndicator — Badge visuel "Saved / Unsaved / Saving"
 * À intégrer dans la barre de statut.
 */
import React from 'react';
import { Check, Loader2, AlertCircle, Save } from 'lucide-react';

interface SaveStatusIndicatorProps {
  status: 'saved' | 'saving' | 'unsaved' | 'error';
  className?: string;
  onClickManualSave?: () => void;
}

export const SaveStatusIndicator: React.FC<SaveStatusIndicatorProps> = ({
  status,
  className = '',
  onClickManualSave,
}) => {
  const config = {
    saved: { icon: <Check className="w-3 h-3" />, color: '#22c55e', label: 'Saved' },
    saving: { icon: <Loader2 className="w-3 h-3 animate-spin" />, color: '#a78bfa', label: 'Saving...' },
    unsaved: { icon: <Save className="w-3 h-3" />, color: '#f59e0b', label: 'Unsaved' },
    error: { icon: <AlertCircle className="w-3 h-3" />, color: '#ef4444', label: 'Save Error' },
  }[status];

  return (
    <button
      onClick={status === 'unsaved' ? onClickManualSave : undefined}
      style={{
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '2px 8px', borderRadius: '4px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.05)',
        color: config.color,
        fontSize: '10px', fontWeight: 600,
        cursor: status === 'unsaved' ? 'pointer' : 'default',
      }}
      className={className}
      title={`Status: ${config.label}`}
    >
      {config.icon}
      <span>{config.label}</span>
    </button>
  );
};

export default useAutoSave;
