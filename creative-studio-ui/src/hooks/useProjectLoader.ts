/**
 * useProjectLoader Hook
 * 
 * Custom hook for loading and managing project data from multiple sources.
 * Orchestrates data loading from file system discovery and recent projects.
 * 
 * Implements Requirements 7.2, 7.3, 7.4
 * Tasks: 7.1, 7.2, 7.3
 */

import { useState, useCallback } from 'react';
import { MergedProject, mergeProjects } from '../utils/projectMerger';
import { RecentProjectsService } from '../services/recentProjects/RecentProjectsService';

/**
 * Project state interface
 */
export interface ProjectState {
  projects: MergedProject[];
  isLoading: boolean;
  error: string | null;
  lastRefresh: number;
}

/**
 * Hook return type
 */
export interface UseProjectLoaderReturn extends ProjectState {
  loadProjects: () => Promise<void>;
  refreshProjects: () => Promise<void>;
}

// Cache TTL: 30 seconds
const CACHE_TTL = 30000;

/**
 * Custom hook for loading projects from multiple sources
 * 
 * Features:
 * - Loads projects from file system discovery via Electron IPC
 * - Merges with recent projects from localStorage
 * - Implements caching with 30-second TTL
 * - Handles loading states and errors
 * - Provides manual refresh functionality
 * - Gracefully handles IPC unavailability
 * 
 * @returns Project state and loading functions
 */
export function useProjectLoader(): UseProjectLoaderReturn {
  const [state, setState] = useState<ProjectState>({
    projects: [],
    isLoading: true,
    error: null,
    lastRefresh: 0,
  });

  /**
   * Load projects from all sources
   * Implements Task 7.1 (parallel data loading) and Task 7.2 (validation and merging)
   */
  const loadProjects = useCallback(async (force = false) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Task 7.3: Check cache freshness
      const now = Date.now();
      const cacheAge = now - state.lastRefresh;
      
      if (!force && cacheAge < CACHE_TTL && state.projects.length > 0) {
        console.log(`[useProjectLoader] Using cached data (age: ${cacheAge}ms)`);
        setState(prev => ({ ...prev, isLoading: false }));
        return;
      }

      // Task 7.1: Check for Electron IPC availability
      const projectDiscovery = typeof window === 'undefined' ? undefined : window.electronAPI?.projectDiscovery;

      if (!projectDiscovery?.discoverProjects) {
        console.warn('[useProjectLoader] Electron IPC unavailable, showing recent projects only');
        
        // Fallback: Load only recent projects from localStorage
        const recentProjectsService = new RecentProjectsService();
        const recentProjects = recentProjectsService.getRecentProjects();
        
        // Convert recent projects to MergedProject format
        const mergedProjects: MergedProject[] = recentProjects.map(rp => ({
          name: rp.name,
          path: rp.path,
          lastModified: rp.lastModified,
          isValid: true,
          isRecent: true,
          lastAccessed: rp.lastModified,
        }));

        setState({
          projects: mergedProjects,
          isLoading: false,
          error: 'Running in browser mode. Showing recent projects only.',
          lastRefresh: now,
        });
        return;
      }

      // Task 7.1: Parallel data loading
      console.log('[useProjectLoader] Loading projects from file system and localStorage');
      
      // Load recent projects from localStorage
      const recentProjectsService = new RecentProjectsService();
      
      // Discover projects from file system via IPC
      const discoveryResult = await projectDiscovery.discoverProjects();
      
      console.log(`[useProjectLoader] Discovered ${discoveryResult.projects.length} projects with ${discoveryResult.errors.length} errors`);

      // Task 7.2: Validate and cleanup recent projects
      const validatedRecent = recentProjectsService.validateAndCleanup(discoveryResult.projects);
      
      console.log(`[useProjectLoader] Validated ${validatedRecent.length} recent projects`);

      // Task 7.2: Merge discovered and recent projects
      const discoveredProjects = discoveryResult.projects.map((entry) => ({
        ...entry,
        createdAt: entry.createdAt === undefined ? undefined : new Date(entry.createdAt),
      }));
      const mergedProjects = mergeProjects(discoveredProjects, validatedRecent);
      
      console.log(`[useProjectLoader] Merged ${mergedProjects.length} total projects`);

      // Update state with merged projects
      setState({
        projects: mergedProjects,
        isLoading: false,
        error: discoveryResult.errors.length > 0 
          ? `Loaded ${mergedProjects.length} projects with ${discoveryResult.errors.length} errors`
          : null,
        lastRefresh: now,
      });

    } catch (error) {
      console.error('[useProjectLoader] Failed to load projects:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load projects';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));
    }
  }, [state.lastRefresh, state.projects.length]);

  /**
   * Force refresh projects, bypassing cache
   * Implements Task 7.3 (manual refresh)
   */
  const refreshProjects = useCallback(() => loadProjects(true), [loadProjects]);

  return {
    ...state,
    loadProjects,
    refreshProjects,
  };
}
