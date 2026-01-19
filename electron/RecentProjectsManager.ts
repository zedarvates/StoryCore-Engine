/**
 * Recent projects management
 * 
 * Manages a list of recently opened projects with LRU eviction
 */

import * as fs from 'fs';
import * as path from 'path';

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
   * Remove all projects that no longer exist
   */
  async cleanupMissingProjects(): Promise<void> {
    await this.checkProjectsExistence();
    this.projects = this.projects.filter(p => p.exists !== false);
    this.save();
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
