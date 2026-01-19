/**
 * Default paths configuration
 * 
 * Manages default directories for StoryCore projects
 */

import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

/**
 * Get the default projects directory
 * Creates it if it doesn't exist
 * 
 * @returns Path to the default projects directory
 */
export function getDefaultProjectsDirectory(): string {
  // Use Documents/StoryCore Projects as default
  const documentsPath = app.getPath('documents');
  const projectsPath = path.join(documentsPath, 'StoryCore Projects');

  // Create directory if it doesn't exist
  if (!fs.existsSync(projectsPath)) {
    try {
      fs.mkdirSync(projectsPath, { recursive: true });
      console.log(`Created default projects directory: ${projectsPath}`);
    } catch (error) {
      console.error(`Failed to create projects directory: ${error}`);
      // Fallback to documents folder if creation fails
      return documentsPath;
    }
  }

  return projectsPath;
}

/**
 * Get the default project path for a new project
 * 
 * @param projectName Name of the project
 * @returns Full path where the project should be created
 */
export function getDefaultProjectPath(projectName: string): string {
  const projectsDir = getDefaultProjectsDirectory();
  return path.join(projectsDir, projectName);
}

/**
 * Check if a path is within the default projects directory
 * 
 * @param projectPath Path to check
 * @returns True if the path is within the default projects directory
 */
export function isInDefaultProjectsDirectory(projectPath: string): boolean {
  const projectsDir = getDefaultProjectsDirectory();
  const normalizedPath = path.normalize(projectPath);
  const normalizedProjectsDir = path.normalize(projectsDir);
  
  return normalizedPath.startsWith(normalizedProjectsDir);
}
