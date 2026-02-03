/**
 * Project Merger Utility
 * 
 * Merges discovered projects with recent projects, handling deduplication and ordering.
 * Implements Requirements 4.1, 4.2, 4.4.
 */

import { DiscoveredProject } from '../../../electron/services/ProjectDiscoveryService';
import { RecentProject } from '../types/menuBarState';

/**
 * Merged project interface combining discovered and recent project data
 */
export interface MergedProject extends DiscoveredProject {
  /** Flag indicating if this project was recently accessed */
  isRecent: boolean;
  /** Timestamp of last access (only present for recent projects) */
  lastAccessed?: number;
}

/**
 * Merges discovered projects with recent projects
 * 
 * Merge Logic:
 * 1. Create a map of discovered projects by path for O(1) lookup
 * 2. Mark projects that appear in recent list with isRecent=true
 * 3. Add lastAccessed timestamp for recent projects
 * 4. Sort: recent projects first (by lastAccessed), then others (by lastModified)
 * 5. Return unified MergedProject array
 * 
 * Implements Requirements 4.1, 4.2, 4.4
 * 
 * @param discovered - Array of projects discovered in the file system
 * @param recent - Array of recently accessed projects from localStorage
 * @returns Unified array of merged projects with proper ordering
 */
export function mergeProjects(
  discovered: DiscoveredProject[],
  recent: RecentProject[]
): MergedProject[] {
  // Step 1: Create a map of discovered projects by path for O(1) lookup
  const discoveredMap = new Map<string, DiscoveredProject>();
  
  for (const project of discovered) {
    discoveredMap.set(project.path, project);
  }

  // Step 2 & 3: Create a map of recent projects by path with lastAccessed
  const recentMap = new Map<string, { lastAccessed: number }>();
  
  for (const recentProject of recent) {
    // Convert Date to timestamp if needed
    const lastAccessed = recentProject.lastModified instanceof Date
      ? recentProject.lastModified.getTime()
      : new Date(recentProject.lastModified).getTime();
    
    recentMap.set(recentProject.path, { lastAccessed });
  }

  // Step 4: Build merged project list
  const mergedProjects: MergedProject[] = [];

  // Process all discovered projects
  for (const [path, discoveredProject] of discoveredMap) {
    const recentInfo = recentMap.get(path);
    
    if (recentInfo) {
      // Project is both discovered and recent
      mergedProjects.push({
        ...discoveredProject,
        isRecent: true,
        lastAccessed: recentInfo.lastAccessed,
      });
    } else {
      // Project is only discovered (not recent)
      mergedProjects.push({
        ...discoveredProject,
        isRecent: false,
      });
    }
  }

  // Step 5: Sort the merged list
  // Recent projects first (by lastAccessed descending), then others (by lastModified descending)
  mergedProjects.sort((a, b) => {
    // Both are recent - sort by lastAccessed (most recent first)
    if (a.isRecent && b.isRecent) {
      return (b.lastAccessed || 0) - (a.lastAccessed || 0);
    }
    
    // Only a is recent - a comes first
    if (a.isRecent && !b.isRecent) {
      return -1;
    }
    
    // Only b is recent - b comes first
    if (!a.isRecent && b.isRecent) {
      return 1;
    }
    
    // Neither is recent - sort by lastModified (most recent first)
    return b.lastModified - a.lastModified;
  });

  return mergedProjects;
}
