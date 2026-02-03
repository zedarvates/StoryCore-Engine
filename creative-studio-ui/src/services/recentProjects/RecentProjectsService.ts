/**
 * Recent Projects Service
 * 
 * Manages the list of recently accessed projects with local storage persistence.
 * Implements Requirements 1.6, 1.7, 12.1-12.6.
 */

import { RecentProject } from '../../types/menuBarState';

/**
 * Service for managing recent projects list
 * 
 * Features:
 * - Maintains list of up to 10 most recent projects
 * - Persists to local storage
 * - Validates project file existence
 * - Automatic cleanup of invalid entries
 */
export class RecentProjectsService {
  /** Maximum number of recent projects to store */
  private static readonly MAX_RECENT = 10;
  
  /** Local storage key for recent projects */
  private static readonly STORAGE_KEY = 'storycore_recent_projects';
  
  /** In-memory cache of recent projects */
  private recentProjects: RecentProject[] = [];
  
  /** Change listeners */
  private listeners: Set<(projects: RecentProject[]) => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Add a project to the recent list
   * 
   * If the project already exists, it will be moved to the top.
   * If the list exceeds MAX_RECENT, the oldest entry will be removed.
   * 
   * @param project - Project to add to recent list
   */
  addProject(project: RecentProject): void {
    // Remove existing entry if present (to avoid duplicates)
    this.recentProjects = this.recentProjects.filter(p => p.id !== project.id);
    
    // Add to beginning of list
    this.recentProjects.unshift({
      ...project,
      lastModified: new Date(project.lastModified), // Ensure Date object
    });
    
    // Enforce maximum size limit
    if (this.recentProjects.length > RecentProjectsService.MAX_RECENT) {
      this.recentProjects = this.recentProjects.slice(0, RecentProjectsService.MAX_RECENT);
    }
    
    // Persist to storage
    this.saveToStorage();
    
    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Get the list of recent projects
   * 
   * @returns Array of recent projects, ordered by most recent first
   */
  getRecentProjects(): RecentProject[] {
    return [...this.recentProjects];
  }

  /**
   * Remove a project from the recent list
   * 
   * @param projectId - ID of project to remove
   */
  removeProject(projectId: string): void {
    const initialLength = this.recentProjects.length;
    this.recentProjects = this.recentProjects.filter(p => p.id !== projectId);
    
    // Only persist and notify if something was actually removed
    if (this.recentProjects.length !== initialLength) {
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Clear all recent projects
   */
  clearAll(): void {
    this.recentProjects = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Validate that a project file still exists
   * 
   * This is a placeholder for actual file system validation.
   * In a real implementation, this would check if the file exists.
   * 
   * @param projectId - ID of project to validate
   * @returns Promise resolving to true if project exists, false otherwise
   */
  async validateProject(projectId: string): Promise<boolean> {
    const project = this.recentProjects.find(p => p.id === projectId);
    
    if (!project) {
      return false;
    }
    
    // In a real implementation, this would check file system
    // For now, we'll assume the project exists if it's in the list
    // This can be enhanced with actual file system checks using Electron APIs
    
    try {
      // Check if we're in Electron environment
      if (window.electronAPI?.fs) {
        const exists = await window.electronAPI.fs.exists(project.path);
        
        // If file doesn't exist, remove from recent list
        if (!exists) {
          this.removeProject(projectId);
        }
        
        return exists;
      }
      
      // In browser environment, we can't validate file existence
      // Return true to avoid removing entries
      return true;
    } catch (error) {
      console.error('Error validating project:', error);
      return false;
    }
  }

  /**
   * Validate and cleanup recent projects against discovered projects
   * 
   * Cross-references recent projects with discovered projects by path.
   * Removes recent projects that no longer exist in the file system.
   * Updates localStorage with the cleaned list.
   * 
   * Implements Requirements 3.2, 3.3
   * 
   * @param discoveredProjects - Array of projects discovered in the file system
   * @returns Array of validated recent projects that still exist
   */
  validateAndCleanup(discoveredProjects: Array<{ path: string }>): RecentProject[] {
    // Create a Set of valid paths for O(1) lookup
    const validPaths = new Set(discoveredProjects.map(p => p.path));
    
    // Get current recent projects
    const currentRecent = this.getRecentProjects();
    
    // Filter to keep only projects that exist in discovered projects
    const validRecent = currentRecent.filter(recentProject => 
      validPaths.has(recentProject.path)
    );
    
    // Update internal state if any projects were removed
    if (validRecent.length !== currentRecent.length) {
      this.recentProjects = validRecent;
      this.saveToStorage();
      this.notifyListeners();
    }
    
    return validRecent;
  }

  /**
   * Subscribe to changes in recent projects list
   * 
   * @param listener - Callback function to invoke when list changes
   * @returns Unsubscribe function
   */
  subscribe(listener: (projects: RecentProject[]) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Load recent projects from local storage
   */
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(RecentProjectsService.STORAGE_KEY);
      
      if (stored) {
        const parsed = JSON.parse(stored);
        
        // Validate and convert dates
        if (Array.isArray(parsed)) {
          this.recentProjects = parsed.map(p => ({
            ...p,
            lastModified: new Date(p.lastModified),
          }));
          
          // Enforce size limit in case storage was manually edited
          if (this.recentProjects.length > RecentProjectsService.MAX_RECENT) {
            this.recentProjects = this.recentProjects.slice(0, RecentProjectsService.MAX_RECENT);
            this.saveToStorage();
          }
        }
      }
    } catch (error) {
      console.error('Error loading recent projects from storage:', error);
      this.recentProjects = [];
    }
  }

  /**
   * Save recent projects to local storage
   */
  private saveToStorage(): void {
    try {
      const serialized = JSON.stringify(this.recentProjects);
      localStorage.setItem(RecentProjectsService.STORAGE_KEY, serialized);
    } catch (error) {
      console.error('Error saving recent projects to storage:', error);
    }
  }

  /**
   * Notify all listeners of changes
   */
  private notifyListeners(): void {
    const projects = this.getRecentProjects();
    this.listeners.forEach(listener => {
      try {
        listener(projects);
      } catch (error) {
        console.error('Error in recent projects listener:', error);
      }
    });
  }
}

// Export singleton instance
export const recentProjectsService = new RecentProjectsService();
