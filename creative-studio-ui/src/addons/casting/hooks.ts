// ============================================================================
// React Hooks for Character Casting System
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { CastingManager } from './CastingManager';
import type { Avatar, CastingAnalytics } from './types';

/**
 * Hook for managing casting operations
 */
export function useCasting(manager: CastingManager) {
  const [assignments, setAssignments] = useState(manager.getAssignments());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync state when manager changes
  useEffect(() => {
    const syncAssignments = () => {
      setAssignments(manager.getAssignments());
    };

    // Initial sync
    syncAssignments();

    // In a real implementation, you might listen to manager events
    // For now, we'll rely on manual sync after operations
  }, [manager]);

  const assignActor = useCallback(async (characterId: string, avatarId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      manager.assignActor(characterId, avatarId);
      setAssignments(manager.getAssignments());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to assign actor');
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const replaceActor = useCallback(async (characterId: string, newAvatarId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      manager.replaceActor(characterId, newAvatarId);
      setAssignments(manager.getAssignments());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to replace actor');
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const unassignActor = useCallback(async (characterId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      manager.unassignActor(characterId);
      setAssignments(manager.getAssignments());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unassign actor');
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const undo = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const success = manager.undo();
      if (success) {
        setAssignments(manager.getAssignments());
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to undo');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const redo = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const success = manager.redo();
      if (success) {
        setAssignments(manager.getAssignments());
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to redo');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  return {
    assignments,
    assignActor,
    replaceActor,
    unassignActor,
    undo,
    redo,
    canUndo: manager.canUndo(),
    canRedo: manager.canRedo(),
    isLoading,
    error,
  };
}

/**
 * Hook for loading and managing avatars
 */
export function useAvatarLoader(manager: CastingManager) {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationCache, setValidationCache] = useState<Map<string, boolean>>(new Map());

  const loadAvatars = useCallback(async (assetsPath: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const loadedAvatars = await manager.loadAvatars(assetsPath);
      setAvatars(loadedAvatars);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load avatars');
    } finally {
      setIsLoading(false);
    }
  }, [manager]);

  const validateAvatar = useCallback(async (avatarPath: string) => {
    if (validationCache.has(avatarPath)) {
      return validationCache.get(avatarPath)!;
    }

    try {
      const result = await manager.validateAvatar(avatarPath);
      const isValid = result.isValid;
      setValidationCache(prev => new Map(prev).set(avatarPath, isValid));
      return isValid;
    } catch {
      setValidationCache(prev => new Map(prev).set(avatarPath, false));
      return false;
    }
  }, [manager, validationCache]);

  const filterAvatars = useCallback((query: string) => {
    return manager.filterAvatars(query);
  }, [manager]);

  return {
    avatars,
    loadAvatars,
    validateAvatar,
    filterAvatars,
    isLoading,
    error,
  };
}

/**
 * Hook for casting analytics
 */
export function useCastingAnalytics(manager: CastingManager) {
  const [analytics, setAnalytics] = useState<CastingAnalytics | null>(null);

  const refreshAnalytics = useCallback(() => {
    setAnalytics(manager.getAnalytics());
  }, [manager]);

  useEffect(() => {
    refreshAnalytics();
  }, [refreshAnalytics]);

  return {
    analytics,
    refreshAnalytics,
  };
}
