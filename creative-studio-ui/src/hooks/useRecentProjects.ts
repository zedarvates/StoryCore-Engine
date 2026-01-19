/// <reference path="../types/electron.d.ts" />

import { useState, useEffect, useCallback } from 'react';
import type { RecentProject } from '@/utils/projectManager';

// ============================================================================
// Types
// ============================================================================

interface UseRecentProjectsReturn {
  // State
  projects: RecentProject[];
  isLoading: boolean;
  error: string | null;

  // Actions
  refresh: () => Promise<void>;
  remove: (projectPath: string) => Promise<void>;
  checkExistence: () => Promise<void>;
  cleanupMissing: () => Promise<void>;
}

// ============================================================================
// useRecentProjects Hook
// ============================================================================

export function useRecentProjects(autoLoad = true): UseRecentProjectsReturn {
  const [projects, setProjects] = useState<RecentProject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load recent projects
  const loadProjects = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (window.electronAPI) {
        const loadedProjects = await window.electronAPI.recentProjects.get();
        setProjects(loadedProjects);
      } else {
        // Demo mode - use mock data
        const mockProjects: RecentProject[] = [
          {
            id: '1',
            name: 'My First Story',
            path: 'C:/Users/Documents/StoryCore/my-first-story',
            lastAccessed: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
            exists: true,
          },
          {
            id: '2',
            name: 'Epic Adventure',
            path: 'C:/Users/Documents/StoryCore/epic-adventure',
            lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 2), // 2 hours ago
            exists: true,
          },
          {
            id: '3',
            name: 'Deleted Project',
            path: 'C:/Users/Documents/StoryCore/deleted-project',
            lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24), // 1 day ago
            exists: false,
          },
          {
            id: '4',
            name: 'Tutorial Project',
            path: 'C:/Users/Documents/StoryCore/tutorial',
            lastAccessed: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3), // 3 days ago
            exists: true,
          },
        ];
        setProjects(mockProjects);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load recent projects';
      setError(errorMessage);
      console.error('Failed to load recent projects:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Refresh projects list
  const refresh = useCallback(async () => {
    await loadProjects();
  }, [loadProjects]);

  // Remove a project from the list
  const remove = useCallback(
    async (projectPath: string) => {
      try {
        if (window.electronAPI) {
          await window.electronAPI.recentProjects.remove(projectPath);
          await loadProjects(); // Reload after removal
        } else {
          // Demo mode - remove from local state
          setProjects((prev) => prev.filter((p) => p.path !== projectPath));
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to remove project';
        setError(errorMessage);
        console.error('Failed to remove project:', err);
        throw err;
      }
    },
    [loadProjects]
  );

  // Check existence of all projects
  const checkExistence = useCallback(async () => {
    if (!window.electronAPI) {
      // Demo mode - no-op
      return;
    }

    try {
      // Check each project's existence
      const updatedProjects = await Promise.all(
        projects.map(async (project) => {
          try {
            const validation = await window.electronAPI!.project.validate(project.path);
            return {
              ...project,
              exists: validation.isValid,
            };
          } catch {
            return {
              ...project,
              exists: false,
            };
          }
        })
      );

      setProjects(updatedProjects);
    } catch (err) {
      console.error('Failed to check project existence:', err);
    }
  }, [projects]);

  // Clean up missing projects
  const cleanupMissing = useCallback(async () => {
    try {
      // First check existence
      await checkExistence();

      // Then remove missing projects
      const missingProjects = projects.filter((p) => p.exists === false);

      for (const project of missingProjects) {
        await remove(project.path);
      }

      // Reload to get fresh list
      await loadProjects();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cleanup missing projects';
      setError(errorMessage);
      console.error('Failed to cleanup missing projects:', err);
    }
  }, [projects, checkExistence, remove, loadProjects]);

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad) {
      loadProjects();
    }
  }, [autoLoad, loadProjects]);

  return {
    // State
    projects,
    isLoading,
    error,

    // Actions
    refresh,
    remove,
    checkExistence,
    cleanupMissing,
  };
}
