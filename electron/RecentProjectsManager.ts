/**
 * Recent projects management
 * 
 * Manages a list of recently opened projects with LRU eviction
 */

import * as fs from 'fs';
import * as path from 'path';
import { DiscoveredProject } from './services/ProjectDiscoveryService';

/**
 * Recent project entry
 */
export interface RecentProject {
  id: string;
  name: string;
  path: string;
  lastAccessed: Date;
  exists?: boolean;
}

/**
 * Merged project entry combining discovered and recent project data
 */
export interface MergedProject {
  id?: string;
  name: string;
  path: string;
  lastModified: Date;
  createdAt?: Date;
  isRecent: boolean;
  lastOpened?: Date; // Only for recent projects
  exists?: boolean;
}

/**
 * Recent projects data structure
 */
interface RecentProjectsData {
  version: string;
  projects: Array<{
    id: string;
    name: string;
    path: string;
    lastAccessed: string;
  }>;
}

/**
 * Manager for recent projects list
 * 
 * Maintains a list of up to 10 recently accessed projects with LRU eviction
 */
export class RecentProjectsManager {
  private static readonly MAX_PROJECTS = 10;
  private static readonly DATA_VERSION = '1.0';
  
  private projects: RecentProject[] = [];
  private storageFilePath: string;

  /**
   * Create a new RecentProjectsManager
   * @param storageFilePath Path to the storage file
   */
  constructor(storageFilePath: string) {
    this.storageFilePath = storageFilePath;
    this.load();
  }

  /**
   * Add a project to the recent list
   * @param project Project to add
   */
  addProject(project: Omit<RecentProject, 'lastAccessed' | 'exists'>): void {
    // Remove existing entry if present
    this.projects = this.projects.filter(p => p.path !== project.path);

    // Add to front of list
    this.projects.unshift({
      ...project,
      lastAccessed: new Date(),
      exists: true,
    });

    // Enforce maximum limit with LRU eviction
    if (this.projects.length > RecentProjectsManager.MAX_PROJECTS) {
      this.projects = this.projects.slice(0, RecentProjectsManager.MAX_PROJECTS);
    }

    this.save();
  }

  /**
   * Remove a project from the recent list
   * @param projectPath Path of the project to remove
   */
  removeProject(projectPath: string): void {
    this.projects = this.projects.filter(p => p.path !== projectPath);
    this.save();
  }

  /**
   * Get all recent projects
   * @returns Array of recent projects
   */
  getProjects(): RecentProject[] {
    return [...this.projects];
  }

  /**
   * Get a specific project by path
   * @param projectPath Path of the project
   * @returns Project if found, undefined otherwise
   */
  getProject(projectPath: string): RecentProject | undefined {
    return this.projects.find(p => p.path === projectPath);
  }

  /**
   * Update the last accessed time for a project
   * @param projectPath Path of the project
   */
  updateLastAccessed(projectPath: string): void {
    const project = this.projects.find(p => p.path === projectPath);
    if (project) {
      // Remove and re-add to move to front
      this.projects = this.projects.filter(p => p.path !== projectPath);
      project.lastAccessed = new Date();
      this.projects.unshift(project);
      this.save();
    }
  }

  /**
   * Check existence of all projects and update their status
   * @returns Array of projects with updated existence status
   */
  async checkProjectsExistence(): Promise<RecentProject[]> {
    for (const project of this.projects) {
      try {
        const projectJsonPath = path.join(project.path, 'project.json');
        project.exists = fs.existsSync(projectJsonPath);
      } catch (error) {
        project.exists = false;
      }
    }
    return this.getProjects();
  }

  /**
   * Remove all projects that no longer exist on disk
   * This should be called before displaying the project list
   * @returns Number of removed projects
   */
  async cleanupMissingProjects(): Promise<number> {
    const initialCount = this.projects.length;
    await this.checkProjectsExistence();
    this.projects = this.projects.filter(p => p.exists !== false);
    const removedCount = initialCount - this.projects.length;
    if (removedCount > 0) {
      console.log(`[RecentProjectsManager] Cleaned up ${removedCount} missing projects`);
      this.save();
    }
    return removedCount;
  }

  /**
   * Clear all recent projects
   */
  clear(): void {
    this.projects = [];
    this.save();
  }

  /**
   * Get the number of recent projects
   * @returns Number of projects
   */
  getCount(): number {
    return this.projects.length;
  }

  /**
   * Merges discovered projects with recent projects
   * Recent projects take precedence for duplicates
   * @param discoveredProjects Array of discovered projects from ProjectDiscoveryService
   * @returns Array of merged projects sorted by last modified date
   */
  async getMergedProjectList(discoveredProjects: DiscoveredProject[]): Promise<MergedProject[]> {
    const merged: MergedProject[] = [];
    const processedPaths = new Set<string>();

    // First, add all recent projects (they take precedence)
    for (const recentProject of this.projects) {
      // Get file system stats for lastModified
      let lastModified: Date;
      try {
        const projectJsonPath = path.join(recentProject.path, 'project.json');
        if (fs.existsSync(projectJsonPath)) {
          const stats = await fs.promises.stat(projectJsonPath);
          lastModified = stats.mtime;
        } else {
          // If project.json doesn't exist, use lastAccessed as fallback
          lastModified = recentProject.lastAccessed;
        }
      } catch (error) {
        // On error, use lastAccessed as fallback
        lastModified = recentProject.lastAccessed;
      }

      merged.push({
        id: recentProject.id,
        name: recentProject.name,
        path: recentProject.path,
        lastModified,
        isRecent: true,
        lastOpened: recentProject.lastAccessed,
        exists: recentProject.exists,
      });

      processedPaths.add(recentProject.path);
    }

    // Then, add discovered projects that aren't already in recent list
    for (const discoveredProject of discoveredProjects) {
      if (!this.isRecentProject(discoveredProject.path, processedPaths)) {
        merged.push({
          name: discoveredProject.name,
          path: discoveredProject.path,
          lastModified: new Date(discoveredProject.lastModified),
          createdAt: discoveredProject.createdAt,
          isRecent: false,
        });
      }
    }

    // Sort by last modified date (most recent first)
    return this.sortProjectsByDate(merged);
  }

  /**
   * Sorts projects by last modified date in descending order (most recent first)
   * @param projects Array of projects to sort
   * @returns Sorted array of projects
   */
  private sortProjectsByDate(projects: MergedProject[]): MergedProject[] {
    return projects.sort((a, b) => {
      // Sort by lastModified in descending order
      return b.lastModified.getTime() - a.lastModified.getTime();
    });
  }

  /**
   * Checks if a project path exists in recent projects
   * @param projectPath Path to check
   * @param processedPaths Optional set of already processed paths for optimization
   * @returns True if the project is in the recent list
   */
  private isRecentProject(projectPath: string, processedPaths?: Set<string>): boolean {
    if (processedPaths) {
      return processedPaths.has(projectPath);
    }
    return this.projects.some(p => p.path === projectPath);
  }

  /**
   * Load recent projects from storage
   */
  private load(): void {
    try {
      if (!fs.existsSync(this.storageFilePath)) {
        return;
      }

      const data = fs.readFileSync(this.storageFilePath, 'utf-8');
      const parsed: RecentProjectsData = JSON.parse(data);

      // Validate version
      if (parsed.version !== RecentProjectsManager.DATA_VERSION) {
        console.warn('Recent projects data version mismatch, clearing list');
        return;
      }

      // Convert stored data to RecentProject objects
      this.projects = parsed.projects.map(p => ({
        ...p,
        lastAccessed: new Date(p.lastAccessed),
        exists: undefined, // Will be checked on demand
      }));

      // Enforce maximum limit
      if (this.projects.length > RecentProjectsManager.MAX_PROJECTS) {
        this.projects = this.projects.slice(0, RecentProjectsManager.MAX_PROJECTS);
      }
    } catch (error) {
      console.error('Failed to load recent projects:', error);
      this.projects = [];
    }
  }

  /**
   * Save recent projects to storage
   */
  private save(): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.storageFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const data: RecentProjectsData = {
        version: RecentProjectsManager.DATA_VERSION,
        projects: this.projects.map(p => ({
          id: p.id,
          name: p.name,
          path: p.path,
          lastAccessed: p.lastAccessed.toISOString(),
        })),
      };

      fs.writeFileSync(this.storageFilePath, JSON.stringify(data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save recent projects:', error);
    }
  }
}
