/**
 * File Polling Hook
 * Manages polling interval for file detection with cleanup and manual refresh
 */

import { useEffect, useRef, useCallback, useState } from 'react';

interface UseFilePollingOptions {
  /**
   * Callback function to execute on each poll
   */
  onPoll: () => void | Promise<void>;
  
  /**
   * Polling interval in milliseconds (default: 2000ms)
   */
  interval?: number;
  
  /**
   * Whether polling is enabled
   */
  enabled?: boolean;
  
  /**
   * Condition to stop polling (e.g., file detected)
   */
  stopCondition?: boolean;
}

interface UseFilePollingReturn {
  /**
   * Whether polling is currently active
   */
  isPolling: boolean;
  
  /**
   * Manually trigger a poll immediately
   */
  refresh: () => void;
  
  /**
   * Start polling
   */
  start: () => void;
  
  /**
   * Stop polling
   */
  stop: () => void;
}

/**
 * Custom hook for managing file polling with interval control
 * 
 * Features:
 * - 2-second polling interval (configurable)
 * - Automatic cleanup on unmount
 * - Manual refresh trigger
 * - Stops polling when file detected or wizard closed
 * 
 * @param options - Polling configuration options
 * @returns Polling control interface
 */
export const useFilePolling = ({
  onPoll,
  interval = 2000,
  enabled = true,
  stopCondition = false
}: UseFilePollingOptions): UseFilePollingReturn => {
  const [isPolling, setIsPolling] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPollingRef = useRef(false);

  /**
   * Stop polling and clear interval
   */
  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
    isPollingRef.current = false;
  }, []);

  /**
   * Start polling
   */
  const start = useCallback(() => {
    // Don't start if already polling or if stop condition is met
    if (isPollingRef.current || stopCondition) {
      return;
    }

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Set polling state
    setIsPolling(true);
    isPollingRef.current = true;

    // Start interval
    intervalRef.current = setInterval(() => {
      onPoll();
    }, interval);
  }, [onPoll, interval, stopCondition]);

  /**
   * Manually trigger a poll immediately
   */
  const refresh = useCallback(() => {
    onPoll();
  }, [onPoll]);

  /**
   * Effect to manage polling lifecycle
   */
  useEffect(() => {
    // Stop polling if disabled or stop condition is met
    if (!enabled || stopCondition) {
      stop();
      return;
    }

    // Start polling if enabled and not already polling
    if (enabled && !isPollingRef.current) {
      // Initial poll
      onPoll();
      
      // Start interval polling
      start();
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      stop();
    };
  }, [enabled, stopCondition, onPoll, start, stop]);

  return {
    isPolling,
    refresh,
    start,
    stop
  };
};
