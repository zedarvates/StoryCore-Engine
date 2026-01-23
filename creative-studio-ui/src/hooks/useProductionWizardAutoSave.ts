/**
 * useProductionWizardAutoSave Hook
 * Auto-save functionality for Production Wizards with configurable interval
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { draftStorage, ProductionWizardData } from '../services/draftStorage';

export interface UseProductionWizardAutoSaveOptions {
  /**
   * Auto-save interval in milliseconds
   * Default: 30 seconds (30000ms)
   */
  interval?: number;

  /**
   * Whether auto-save is enabled
   * Default: true
   */
  enabled?: boolean;

  /**
   * Callback when auto-save completes
   */
  onSave?: () => void;

  /**
   * Callback when auto-save fails
   */
  onError?: (error: Error) => void;

  /**
   * Wizard type for draft identification
   */
  wizardType: string;

  /**
   * Minimum time between saves (debouncing)
   * Default: 5 seconds
   */
  debounceMs?: number;
}

export interface UseProductionWizardAutoSaveReturn {
  /**
   * Last saved timestamp (Unix timestamp)
   */
  lastSaved: number;

  /**
   * Whether currently saving
   */
  isSaving: boolean;

  /**
   * Whether auto-save is enabled
   */
  isEnabled: boolean;

  /**
   * Enable auto-save
   */
  enable: () => void;

  /**
   * Disable auto-save
   */
  disable: () => void;

  /**
   * Manually trigger a save
   */
  saveNow: () => Promise<void>;

  /**
   * Set auto-save interval
   */
  setInterval: (interval: number) => void;
}

/**
 * Hook for auto-saving production wizard data
 *
 * @param getData Function that returns current wizard data
 * @param options Configuration options
 * @returns Auto-save controls and status
 */
export function useProductionWizardAutoSave<T extends ProductionWizardData>(
  getData: () => T,
  options: UseProductionWizardAutoSaveOptions
): UseProductionWizardAutoSaveReturn {
  const {
    interval = 30000, // 30 seconds
    enabled = true,
    onSave,
    onError,
    wizardType,
    debounceMs = 5000, // 5 seconds
  } = options;

  const [lastSaved, setLastSaved] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isEnabled, setIsEnabled] = useState(enabled);
  const [currentInterval, setCurrentInterval] = useState(interval);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastDataRef = useRef<string>('');
  const lastSaveTimeRef = useRef<number>(0);

  /**
   * Perform the actual save operation
   */
  const performSave = useCallback(async (data: T): Promise<void> => {
    if (isSaving) return; // Prevent concurrent saves

    setIsSaving(true);

    try {
      const dataString = JSON.stringify(data);

      // Skip save if data hasn't changed
      if (dataString === lastDataRef.current) {
        setIsSaving(false);
        return;
      }

      await draftStorage.saveDraft(wizardType, data);
      const timestamp = Date.now();

      setLastSaved(timestamp);
      lastDataRef.current = dataString;
      lastSaveTimeRef.current = timestamp;

      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Auto-save failed:', error);

      if (onError) {
        onError(error as Error);
      }
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, wizardType, onSave, onError]);

  /**
   * Trigger auto-save with debouncing
   */
  const triggerAutoSave = useCallback(() => {
    if (!isEnabled) return;

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Check if minimum time has passed since last save
    const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;
    if (timeSinceLastSave < debounceMs) {
      return;
    }

    // Set new timeout
    timeoutRef.current = setTimeout(async () => {
      try {
        const data = getData();
        await performSave(data);
      } catch (error) {
        console.error('Auto-save trigger failed:', error);
      }
    }, currentInterval);
  }, [isEnabled, currentInterval, debounceMs, getData, performSave]);

  /**
   * Manually trigger a save
   */
  const saveNow = useCallback(async (): Promise<void> => {
    // Clear any pending auto-save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    try {
      const data = getData();
      await performSave(data);
    } catch (error) {
      console.error('Manual save failed:', error);
      throw error;
    }
  }, [getData, performSave]);

  /**
   * Enable auto-save
   */
  const enable = useCallback(() => {
    setIsEnabled(true);
  }, []);

  /**
   * Disable auto-save
   */
  const disable = useCallback(() => {
    setIsEnabled(false);

    // Clear any pending auto-save
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  /**
   * Set auto-save interval
   */
  const setInterval = useCallback((newInterval: number) => {
    if (newInterval < 1000) {
      console.warn('Auto-save interval must be at least 1000ms');
      return;
    }
    setCurrentInterval(newInterval);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Initialize lastDataRef with current data
  useEffect(() => {
    try {
      const data = getData();
      lastDataRef.current = JSON.stringify(data);
    } catch (error) {
      console.warn('Failed to initialize auto-save data:', error);
    }
  }, [getData]);

  return {
    lastSaved,
    isSaving,
    isEnabled,
    enable,
    disable,
    saveNow,
    setInterval,
  };
}

/**
 * Hook for formatting last saved time
 */
export function useLastSavedFormat(lastSaved: number) {
  const [formatted, setFormatted] = useState('');

  useEffect(() => {
    if (lastSaved === 0) {
      setFormatted('');
      return;
    }

    const updateFormatted = () => {
      const now = Date.now();
      const diff = now - lastSaved;

      if (diff < 60000) { // Less than 1 minute
        setFormatted('just now');
      } else if (diff < 3600000) { // Less than 1 hour
        const minutes = Math.floor(diff / 60000);
        setFormatted(`${minutes}m ago`);
      } else if (diff < 86400000) { // Less than 1 day
        const hours = Math.floor(diff / 3600000);
        setFormatted(`${hours}h ago`);
      } else {
        const date = new Date(lastSaved);
        setFormatted(date.toLocaleDateString());
      }
    };

    updateFormatted();

    // Update every minute for relative times
    const interval = setInterval(updateFormatted, 60000);

    return () => clearInterval(interval);
  }, [lastSaved]);

  return formatted;
}
