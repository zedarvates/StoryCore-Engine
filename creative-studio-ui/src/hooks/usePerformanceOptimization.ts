/**
 * Performance Optimization Hooks for ProjectDashboardNew
 * 
 * Requirements: 82, 83
 * Performance Level: 🟡 HAUTE
 * 
 * Custom hooks to optimize expensive calculations and callbacks
 * in ProjectDashboardNew component
 */

import { useMemo, useCallback, useRef } from 'react';
import type { Shot, Character, Location, StoryObject } from '@/types';

/**
 * Memoized filter and search for projects
 */
export function useFilteredProjects(projects: any[], searchQuery: string, filters: any) {
  return useMemo(() => {
    if (!projects?.length) return [];

    return projects.filter((project) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch = 
          project.name?.toLowerCase().includes(query) ||
          project.description?.toLowerCase().includes(query) ||
          project.tags?.some((tag: string) => tag.toLowerCase().includes(query));
        
        if (!matchesSearch) return false;
      }

      // Status filter
      if (filters.status && project.status !== filters.status) {
        return false;
      }

      // Type filter
      if (filters.type && project.type !== filters.type) {
        return false;
      }

      // Date range filter
      if (filters.dateRange) {
        const projectDate = new Date(project.updatedAt || project.createdAt);
        if (projectDate < filters.dateRange.start || projectDate > filters.dateRange.end) {
          return false;
        }
      }

      return true;
    });
  }, [projects, searchQuery, filters]);
}

/**
 * Memoized calculation of project statistics
 */
export function useProjectStats(projects: any[]) {
  return useMemo(() => {
    if (!projects?.length) {
      return {
        total: 0,
        active: 0,
        completed: 0,
        onHold: 0,
        totalShots: 0,
        totalScenes: 0,
        averageCompletion: 0,
      };
    }

    const stats = projects.reduce(
      (acc, project) => {
        acc.total++;
        acc.totalShots += project.shots?.length || 0;
        acc.totalScenes += project.scenes?.length || 0;

        switch (project.status) {
          case 'active':
            acc.active++;
            break;
          case 'completed':
            acc.completed++;
            break;
          case 'on_hold':
            acc.onHold++;
            break;
        }

        return acc;
      },
      {
        total: 0,
        active: 0,
        completed: 0,
        onHold: 0,
        totalShots: 0,
        totalScenes: 0,
      }
    );

    stats.averageCompletion = stats.total > 0 
      ? Math.round((stats.completed / stats.total) * 100)
      : 0;

    return stats;
  }, [projects]);
}

/**
 * Memoized sorting of projects
 */
export function useSortedProjects(projects: any[], sortBy: string, sortOrder: 'asc' | 'desc') {
  return useMemo(() => {
    if (!projects?.length) return [];

    const sorted = [...projects];
    
    sorted.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      // Handle nested properties
      if (sortBy === 'stats.shots') {
        aValue = a.shots?.length || 0;
        bValue = b.shots?.length || 0;
      } else if (sortBy === 'stats.scenes') {
        aValue = a.scenes?.length || 0;
        bValue = b.scenes?.length || 0;
      }

      // Handle dates
      if (sortBy.includes('date') || sortBy === 'updatedAt' || sortBy === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [projects, sortBy, sortOrder]);
}

/**
 * Memoized character suggestions for autocomplete
 */
export function useCharacterSuggestions(characters: Character[], query: string) {
  return useMemo(() => {
    if (!query?.trim()) return [];
    
    const normalizedQuery = query.toLowerCase().trim();
    
    return characters
      .filter((char) => {
        const matchesName = char.name?.toLowerCase().includes(normalizedQuery);
        const matchesDescription = char.description?.toLowerCase().includes(normalizedQuery);
        const matchesTags = char.tags?.some((tag) => 
          tag.toLowerCase().includes(normalizedQuery)
        );
        
        return matchesName || matchesDescription || matchesTags;
      })
      .slice(0, 10); // Limit results
  }, [characters, query]);
}

/**
 * Memoized location suggestions
 */
export function useLocationSuggestions(locations: Location[], query: string) {
  return useMemo(() => {
    if (!query?.trim()) return [];
    
    const normalizedQuery = query.toLowerCase().trim();
    
    return locations
      .filter((loc) => {
        const matchesName = loc.name?.toLowerCase().includes(normalizedQuery);
        const matchesDescription = loc.description?.toLowerCase().includes(normalizedQuery);
        const matchesType = loc.type?.toLowerCase().includes(normalizedQuery);
        
        return matchesName || matchesDescription || matchesType;
      })
      .slice(0, 10);
  }, [locations, query]);
}

/**
 * Memoized object suggestions
 */
export function useObjectSuggestions(objects: StoryObject[], query: string) {
  return useMemo(() => {
    if (!query?.trim()) return [];
    
    const normalizedQuery = query.toLowerCase().trim();
    
    return objects
      .filter((obj) => {
        const matchesName = obj.name?.toLowerCase().includes(normalizedQuery);
        const matchesDescription = obj.description?.toLowerCase().includes(normalizedQuery);
        const matchesCategory = obj.category?.toLowerCase().includes(normalizedQuery);
        
        return matchesName || matchesDescription || matchesCategory;
      })
      .slice(0, 10);
  }, [objects, query]);
}

/**
 * Memoized shot calculations
 */
export function useShotCalculations(shots: Shot[]) {
  return useMemo(() => {
    if (!shots?.length) {
      return {
        totalDuration: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        totalScenes: 0,
      };
    }

    const durations = shots.map((shot) => shot.duration || 0);
    const totalDuration = durations.reduce((sum, dur) => sum + dur, 0);
    
    return {
      totalDuration,
      averageDuration: Math.round(totalDuration / shots.length),
      minDuration: Math.min(...durations),
      maxDuration: Math.max(...durations),
      totalScenes: shots.filter((shot) => shot.scenes?.length).length,
    };
  }, [shots]);
}

/**
 * Stable callback for expensive operations
 */
export function useExpensiveOperation<T, R>(
  operation: (item: T) => R,
  dependencies: any[]
) {
  const operationRef = useRef(operation);
  operationRef.current = operation;

  return useCallback((item: T) => {
    return operationRef.current(item);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);
}

/**
 * Batch processing with memoization
 */
export function useBatchProcessor<T, R>(
  items: T[],
  processor: (item: T) => R,
  batchSize: number = 10
) {
  return useMemo(() => {
    if (!items?.length) return [];

    const results: R[] = [];
    
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      batch.forEach((item) => {
        results.push(processor(item));
      });
    }

    return results;
  }, [items, processor, batchSize]);
}

/**
 * Memoized group by function
 */
export function useGroupBy<T>(
  items: T[],
  key: keyof T | ((item: T) => string)
) {
  return useMemo(() => {
    if (!items?.length) return new Map<string, T[]>();

    const groups = new Map<string, T[]>();
    
    items.forEach((item) => {
      const groupKey = typeof key === 'function' ? key(item) : String(item[key]);
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      
      groups.get(groupKey)?.push(item);
    });

    return groups;
  }, [items, key]);
}

/**
 * Memoized unique values extractor
 */
export function useUniqueValues<T>(
  items: T[],
  key: keyof T | ((item: T) => any)
) {
  return useMemo(() => {
    if (!items?.length) return [];

    const values = new Set();
    const unique: T[] = [];

    items.forEach((item) => {
      const value = typeof key === 'function' ? key(item) : item[key];
      
      if (!values.has(value)) {
        values.add(value);
        unique.push(item);
      }
    });

    return unique;
  }, [items, key]);
}
