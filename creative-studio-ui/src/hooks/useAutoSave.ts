/**
 * useAutoSave Hook - React hook for auto-save functionality
 * 
 * This hook provides:
 * - Configurable auto-save interval
 * - Automatic cleanup on unmount
 * - Last saved timestamp tracking
 * - Enable/disable toggle
 * 
 * Requirements: 15.7
 */

import { useEffect, useState, useCallback } from 'react';
import { versionControlService } from '../services/gridEditor';
import { GridConfiguration } from '../types/gridEditor';

// ============================================================================
// Type Definitions
// ============================================================================

export interface UseAutoSaveOptions {
  /**
   * Auto-save interval in milliseconds
   * Default: 5 minutes (300000ms)
   */
  interval?: number;

  /**
   * Whether auto-save is enabled by default
   * Default: false
   */
  enabled?: boolean;

  /**
   * Author name for auto-saved versions
   */
  author?: string;

  /**
   * Callback when auto-save completes
   */
  onAutoSave?: (timestamp: string) => void;

  /**
   * Callback when auto-save fails
   */
  onError?: (error: Error) => void;
}

export interface UseAutoSaveReturn {
  /**
   * Whether auto-save is currently enabled
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
   * Toggle auto-save on/off
   */
  toggle: () => void;

  /**
   * Current auto-save interval in milliseconds
   */
  interval: number;

  /**
   * Set auto-save interval
   */
  setInterval: (interval: number) => void;

  /**
   * Timestamp of last auto-save (ISO 8601 format)
   */
  lastSavedAt: string | null;

  /**
   * Manually trigger an auto-save
   */
  saveNow: () => void;
}

// ============================================================================
// useAutoSave Hook
// ============================================================================

/**
 * Hook for managing auto-save functionality
 * 
 * @example
 * ```tsx
 * const { isEnabled, toggle, lastSavedAt } = useAutoSave({
 *   interval: 5 * 60 * 1000, // 5 minutes
 *   enabled: true,
 *   author: 'Current User',
 *   onAutoSave: (timestamp) => {
 *     console.log('Auto-saved at:', timestamp);
 *   },
 * });
 * 
 * return (
 *   <div>
 *     <button onClick={toggle}>
 *       {isEnabled ? 'Disable' : 'Enable'} Auto-Save
 *     </button>
 *     {lastSavedAt && <span>Last saved: {lastSavedAt}</span>}
 *   </div>
 * );
 * ```
 */
export function useAutoSave(
  getConfiguration: () => GridConfiguration,
  options: UseAutoSaveOptions = {}
): UseAutoSaveReturn {
  const {
    interval: initialInterval = 5 * 60 * 1000, // 5 minutes default
    enabled: initialEnabled = false,
    author,
    onAutoSave,
    onError,
  } = options;

  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [interval, setIntervalState] = useState(initialInterval);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  // Start/stop auto-save based on enabled state
  useEffect(() => {
    if (isEnabled) {
      try {
        // Configure service with current interval
        const service = versionControlService;
        service.stopAutoSave(); // Stop any existing auto-save
        
        // Create a new service instance with custom interval
        const customService = new (versionControlService.constructor as any)({
          autoSaveInterval: interval,
        });

        // Start auto-save
        customService.startAutoSave(
          () => {
            try {
              const config = getConfiguration();
              const timestamp = new Date().toISOString();
              setLastSavedAt(timestamp);
              
              if (onAutoSave) {
                onAutoSave(timestamp);
              }
              
              return config;
            } catch (error) {
              if (onError) {
                onError(error as Error);
              }
              throw error;
            }
          },
          author
        );

        return () => {
          customService.stopAutoSave();
        };
      } catch (error) {
        console.error('Failed to start auto-save:', error);
        if (onError) {
          onError(error as Error);
        }
      }
    } else {
      versionControlService.stopAutoSave();
    }

    return () => {
      versionControlService.stopAutoSave();
    };
  }, [isEnabled, interval, getConfiguration, author, onAutoSave, onError]);

  // Enable auto-save
  const enable = useCallback(() => {
    setIsEnabled(true);
  }, []);

  // Disable auto-save
  const disable = useCallback(() => {
    setIsEnabled(false);
  }, []);

  // Toggle auto-save
  const toggle = useCallback(() => {
    setIsEnabled((prev) => !prev);
  }, []);

  // Set interval
  const setInterval = useCallback((newInterval: number) => {
    if (newInterval <= 0) {
      console.warn('Auto-save interval must be greater than 0');
      return;
    }
    setIntervalState(newInterval);
  }, []);

  // Manually trigger auto-save
  const saveNow = useCallback(() => {
    try {
      const config = getConfiguration();
      versionControlService.saveVersionAuto(config, author);
      const timestamp = new Date().toISOString();
      setLastSavedAt(timestamp);
      
      if (onAutoSave) {
        onAutoSave(timestamp);
      }
    } catch (error) {
      console.error('Failed to save version:', error);
      if (onError) {
        onError(error as Error);
      }
    }
  }, [getConfiguration, author, onAutoSave, onError]);

  return {
    isEnabled,
    enable,
    disable,
    toggle,
    interval,
    setInterval,
    lastSavedAt,
    saveNow,
  };
}

// ============================================================================
// useAutoSaveStatus Hook
// ============================================================================

/**
 * Hook for displaying auto-save status
 * 
 * @example
 * ```tsx
 * const { lastSavedText, timeSinceLastSave } = useAutoSaveStatus(lastSavedAt);
 * 
 * return <span>{lastSavedText}</span>;
 * ```
 */
export function useAutoSaveStatus(lastSavedAt: string | null) {
  const [timeSinceLastSave, setTimeSinceLastSave] = useState<number>(0);

  useEffect(() => {
    if (!lastSavedAt) {
      setTimeSinceLastSave(0);
      return;
    }

    const updateTimeSince = () => {
      const now = Date.now();
      const savedTime = new Date(lastSavedAt).getTime();
      const diff = now - savedTime;
      setTimeSinceLastSave(diff);
    };

    updateTimeSince();
    const interval = setInterval(updateTimeSince, 1000); // Update every second

    return () => clearInterval(interval);
  }, [lastSavedAt]);

  const formatTimeSince = (ms: number): string => {
    if (ms < 60000) {
      return 'just now';
    } else if (ms < 3600000) {
      const minutes = Math.floor(ms / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else if (ms < 86400000) {
      const hours = Math.floor(ms / 3600000);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(ms / 86400000);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  const lastSavedText = lastSavedAt
    ? `Last saved ${formatTimeSince(timeSinceLastSave)}`
    : 'Not saved yet';

  return {
    lastSavedText,
    timeSinceLastSave,
    lastSavedDate: lastSavedAt ? new Date(lastSavedAt) : null,
  };
}

// ============================================================================
// useAutoSaveIndicator Hook
// ============================================================================

/**
 * Hook for showing auto-save indicator with animation
 * 
 * @example
 * ```tsx
 * const { isSaving, showSaved } = useAutoSaveIndicator(lastSavedAt);
 * 
 * return (
 *   <div>
 *     {isSaving && <span>Saving...</span>}
 *     {showSaved && <span>✓ Saved</span>}
 *   </div>
 * );
 * ```
 */
export function useAutoSaveIndicator(lastSavedAt: string | null) {
  const [isSaving, setIsSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [prevLastSavedAt, setPrevLastSavedAt] = useState<string | null>(null);

  useEffect(() => {
    if (lastSavedAt && lastSavedAt !== prevLastSavedAt) {
      // Show saving indicator
      setIsSaving(true);

      // After a short delay, show saved indicator
      const savingTimeout = setTimeout(() => {
        setIsSaving(false);
        setShowSaved(true);

        // Hide saved indicator after 3 seconds
        const savedTimeout = setTimeout(() => {
          setShowSaved(false);
        }, 3000);

        return () => clearTimeout(savedTimeout);
      }, 500);

      setPrevLastSavedAt(lastSavedAt);

      return () => clearTimeout(savingTimeout);
    }
  }, [lastSavedAt, prevLastSavedAt]);

  return {
    isSaving,
    showSaved,
  };
}
