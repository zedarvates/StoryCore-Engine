// ============================================================================
// Loading Hook - Unified Loading State Management
// ============================================================================
// Provides centralized loading state management for async operations
//
// Features:
// - Track multiple async operations
// - Named loading states
// - Progress tracking
// - Timeout handling
//
// Requirements: 7.1, 7.2, 7.3
// ============================================================================

import { useState, useCallback, useRef } from 'react';
import { Logger } from '../utils/logger';

// ============================================================================
// Types
// ============================================================================

export interface LoadingState {
  id: string;
  name: string;
  isLoading: boolean;
  progress: number;
  message?: string;
  startedAt: Date;
  error?: string;
}

export interface LoadingActions {
  startLoading: (name: string, message?: string) => string;
  updateProgress: (id: string, progress: number, message?: string) => void;
  stopLoading: (id: string, error?: string) => void;
  isLoading: (name: string) => boolean;
  getLoadingByName: (name: string) => LoadingState | undefined;
  clearAll: () => void;
}

// ============================================================================
// Loading Hook
// ============================================================================

/**
 * Hook that provides centralized loading state management
 * 
 * Features:
 * - Track multiple async operations
 * - Named loading states
 * - Progress tracking
 * - Automatic timeout handling
 */
export function useLoading() {
  const [loadingStates, setLoadingStates] = useState<LoadingState[]>([]);
  const timeoutRefs = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const startLoading = useCallback((name: string, message?: string): string => {
    const id = `loading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    Logger.info(`[useLoading] Starting: ${name}`);
    
    const newState: LoadingState = {
      id,
      name,
      isLoading: true,
      progress: 0,
      message,
      startedAt: new Date(),
    };

    setLoadingStates((prev) => [...prev, newState]);

    // Auto-timeout after 5 minutes
    const timeout = setTimeout(() => {
      Logger.warn(`[useLoading] Timeout for: ${name}`);
      stopLoading(id, 'Operation timed out');
    }, 5 * 60 * 1000);
    
    timeoutRefs.current.set(id, timeout);

    return id;
  }, []);

  const updateProgress = useCallback((id: string, progress: number, message?: string) => {
    setLoadingStates((prev) =>
      prev.map((state) =>
        state.id === id
          ? { ...state, progress: Math.min(100, Math.max(0, progress)), message: message ?? state.message }
          : state
      )
    );
  }, []);

  const stopLoading = useCallback((id: string, error?: string) => {
    // Clear timeout
    const timeout = timeoutRefs.current.get(id);
    if (timeout) {
      clearTimeout(timeout);
      timeoutRefs.current.delete(id);
    }

    setLoadingStates((prev) =>
      prev.map((state) =>
        state.id === id
          ? { ...state, isLoading: false, error }
          : state
      )
    );

    if (error) {
      Logger.error(`[useLoading] Failed: ${id} - ${error}`);
    } else {
      Logger.info(`[useLoading] Completed: ${id}`);
    }
  }, []);

  const isLoadingByName = useCallback((name: string) => {
    return loadingStates.some((state) => state.name === name && state.isLoading);
  }, [loadingStates]);

  const getLoadingByName = useCallback((name: string) => {
    return loadingStates.find((state) => state.name === name);
  }, [loadingStates]);

  const clearAll = useCallback(() => {
    // Clear all timeouts
    timeoutRefs.current.forEach((timeout) => clearTimeout(timeout));
    timeoutRefs.current.clear();
    
    setLoadingStates([]);
    Logger.info('[useLoading] Cleared all loading states');
  }, []);

  return {
    loadingStates,
    hasLoading: loadingStates.some((s) => s.isLoading),
    loadingCount: loadingStates.filter((s) => s.isLoading).length,
    startLoading,
    updateProgress,
    stopLoading,
    isLoading: isLoadingByName,
    getLoadingByName,
    clearAll,
  };
}

