/**
 * Project management service
 * 
 * Handles project creation, opening, and file system operations
 */

import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ProjectValidator, ProjectConfig, ValidationResult } from './ProjectValidator';
import { ProjectError, ProjectErrorCode, FileSystemError, FileSystemErrorCode } from './errors';

/**
 * Data for creating a new project
 */
export interface NewProjectData {
  name: string;
  location: string;
  template?: string;
}

/**
 * Complete project information
 */
export interface Project {
  id: string;
  name: string;
  path: string;
  version: string;
  createdAt: Date;
  modifiedAt: Date;
  config: ProjectConfig;
}

/**
 * Project template
 */
interface ProjectTemplate {
  name: string;
  description: string;
  config: Partial<ProjectConfig>;
  directories: string[];
  files: Record<string, string>;
}

/**
 * Default project template
 */
const DEFAULT_TEMPLATE: ProjectTemplate = {
  name: 'Empty Project',
  description: 'A blank StoryCore project',
  config: {
    schema_version: '1.0',
    capabilities: {
      grid_generation: true,
      promotion_engine: true,
      qa_engine: true,
      autofix_engine: true,
      character_system: true,
      world_building: true,
      casting_system: true,
    },
    generation_status: {
      grid: 'pending',
      promotion: 'pending',
    },
    settings: {
      default_resolution: '1920x1080',
      quality_threshold: 100,
    },
  },
  directories: ['scenes', 'characters', 'worlds', 'assets'],
  files: {
    'README.md': `# {PROJECT_NAME}

A StoryCore Creative Studio project.

## Getting Started

1. Open the project in StoryCore Creative Studio
2. Create your story using the wizards and tools
3. Generate your video content

## Project Structure

- \`scenes/\` - Scene definitions and storyboards
- \`characters/\` - Character data and assets
- \`worlds/\` - World building information
- \`assets/\` - Generated images, videos, and audio

## Documentation

For more information, visit: https://storycore.dev/docs
`,
  },
};

/**
 * Service for managing StoryCore projects
 */
export class ProjectService {
  private validator: ProjectValidator;

  constructor() {
    this.validator = new ProjectValidator();
  }

  /**
   * Create a new project
   * @param data Project creation data
   * @returns Created project information
   */
  async createProject(data: NewProjectData): Promise<Project> {
    try {
      // Validate project name
      this.validateProjectName(data.name);

      // Validate and sanitize location path
      const sanitizedLocation = this.sanitizePath(data.location);
      
      // Create project directory
      const projectPath = path.join(sanitizedLocation, this.sanitizeFileName(data.name));
      
      // Check if directory already exists
      if (fs.existsSync(projectPath)) {
        throw new FileSystemError(
          FileSystemErrorCode.CREATE_FAILED,
          `Directory already exists: ${projectPath}`,
          projectPath
        );
      }

      // Create project directory
      try {
        fs.mkdirSync(projectPath, { recursive: true });
      } catch (error) {
        throw new FileSystemError(
          FileSystemErrorCode.CREATE_FAILED,
          `Failed to create project directory: ${error instanceof Error ? error.message : String(error)}`,
          projectPath
        );
      }

      // Get template
      const template = DEFAULT_TEMPLATE;

      // Create subdirectories
      for (const dir of template.directories) {
        const dirPath = path.join(projectPath, dir);
        try {
          fs.mkdirSync(dirPath, { recursive: true });
        } catch (error) {
          // Clean up on failure
          this.cleanupDirectory(projectPath);
          throw new FileSystemError(
            FileSystemErrorCode.CREATE_FAILED,
            `Failed to create directory ${dir}: ${error instanceof Error ? error.message : String(error)}`,
            dirPath
          );
        }
      }

      // Create project.json
      const now = new Date().toISOString();
      const projectConfig: ProjectConfig = {
        ...template.config,
        project_name: data.name,
        created_at: now,
        modified_at: now,
        storycore_version: '1.0.0',
        metadata: {
          id: uuidv4(),
          created_at: now,
          updated_at: now,
        },
      } as ProjectConfig;

      const projectJsonPath = path.join(projectPath, 'project.json');
      try {
        fs.writeFileSync(projectJsonPath, JSON.stringify(projectConfig, null, 2), 'utf-8');
      } catch (error) {
        // Clean up on failure
        this.cleanupDirectory(projectPath);
        throw new FileSystemError(
          FileSystemErrorCode.CREATE_FAILED,
          `Failed to create project.json: ${error instanceof Error ? error.message : String(error)}`,
          projectJsonPath
        );
      }

      // Create template files
      for (const [fileName, content] of Object.entries(template.files)) {
        const filePath = path.join(projectPath, fileName);
        const processedContent = content.replace(/{PROJECT_NAME}/g, data.name);
        
        try {
          fs.writeFileSync(filePath, processedContent, 'utf-8');
        } catch (error) {
          // Non-fatal error, just log it
          console.warn(`Failed to create ${fileName}:`, error);
        }
      }

      // Return project information
      return {
        id: projectConfig.metadata?.id as string,
        name: data.name,
        path: projectPath,
        version: projectConfig.storycore_version || '1.0.0',
        createdAt: new Date(now),
        modifiedAt: new Date(now),
        config: projectConfig,
      };
    } catch (error) {
      if (error instanceof FileSystemError || error instanceof ProjectError) {
        throw error;
      }
      throw new ProjectError(
        ProjectErrorCode.INVALID_STRUCTURE,
        `Failed to create project: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Open an existing project
   * @param projectPath Path to the project directory
   * @returns Project information
   */
  async openProject(projectPath: string): Promise<Project> {
    try {
      // Validate project structure
      const validation = await this.validator.validate(projectPath);
      
      if (!validation.isValid) {
        const errorMessage = this.validator.getErrorMessage(validation);
        throw new ProjectError(
          this.getErrorCodeFromValidation(validation),
          errorMessage,
          projectPath,
          validation.errors
        );
      }

      if (!validation.config) {
        throw new ProjectError(
          ProjectErrorCode.CORRUPTED_CONFIG,
          'Project configuration is missing',
          projectPath
        );
      }

      // Read project.json
      const config = validation.config;

      // Return project information
      return {
        id: (config.metadata as any)?.id || uuidv4(),
        name: config.project_name,
        path: projectPath,
        version: config.storycore_version || '1.0.0',
        createdAt: config.created_at ? new Date(config.created_at) : new Date(),
        modifiedAt: config.modified_at ? new Date(config.modified_at) : new Date(),
        config,
      };
    } catch (error) {
      if (error instanceof ProjectError) {
        throw error;
      }
      throw new ProjectError(
        ProjectErrorCode.INVALID_STRUCTURE,
        `Failed to open project: ${error instanceof Error ? error.message : String(error)}`,
        projectPath
      );
    }
  }

  /**
   * Validate a project directory
   * @param projectPath Path to validate
   * @returns Validation result
   */
  async validateProject(projectPath: string): Promise<ValidationResult> {
    return this.validator.validate(projectPath);
  }

  /**
   * Check if a project exists at the given path
   * @param projectPath Path to check
   * @returns True if project exists
   */
  async checkProjectExists(projectPath: string): Promise<boolean> {
    return this.validator.quickCheck(projectPath);
  }

  /**
   * Validate project name
   * @param name Project name to validate
   * @throws ProjectError if name is invalid
   */
  private validateProjectName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new ProjectError(
        ProjectErrorCode.INVALID_STRUCTURE,
        'Project name cannot be empty'
      );
    }

    if (name.length < 3) {
      throw new ProjectError(
        ProjectErrorCode.INVALID_STRUCTURE,
        'Project name must be at least 3 characters'
      );
    }

    if (name.length > 100) {
      throw new ProjectError(
        ProjectErrorCode.INVALID_STRUCTURE,
        'Project name must be less than 100 characters'
      );
    }

    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*\x00-\x1F]/;
    if (invalidChars.test(name)) {
      throw new ProjectError(
        ProjectErrorCode.INVALID_STRUCTURE,
        'Project name contains invalid characters'
      );
    }
  }

  /**
   * Sanitize a file path
   * @param filePath Path to sanitize
   * @returns Sanitized path
   */
  private sanitizePath(filePath: string): string {
    // Resolve to absolute path
    const resolved = path.resolve(filePath);
    
    // Check for path traversal attempts
    if (!resolved.startsWith(path.resolve(filePath))) {
      throw new FileSystemError(
        FileSystemErrorCode.INVALID_PATH,
        'Invalid path: path traversal detected',
        filePath
      );
    }

    // Check path length (Windows MAX_PATH is 260)
    if (process.platform === 'win32' && resolved.length > 250) {
      throw new FileSystemError(
        FileSystemErrorCode.PATH_TOO_LONG,
        'Path is too long',
        filePath
      );
    }

    return resolved;
  }

  /**
   * Sanitize a file name
   * @param fileName File name to sanitize
   * @returns Sanitized file name
   */
  private sanitizeFileName(fileName: string): string {
    // Remove invalid characters
    return fileName.replace(/[<>:"/\\|?*\x00-\x1F]/g, '_');
  }

  /**
   * Clean up a directory (delete it and all contents)
   * @param dirPath Directory to clean up
   */
  private cleanupDirectory(dirPath: string): void {
    try {
      if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true, force: true });
      }
    } catch (error) {
      console.error('Failed to clean up directory:', error);
    }
  }

  /**
   * Get error code from validation result
   * @param validation Validation result
   * @returns Error code
   */
  private getErrorCodeFromValidation(validation: ValidationResult): ProjectErrorCode {
    if (validation.errors.some(e => e.type === 'missing_file')) {
      return ProjectErrorCode.MISSING_FILES;
    }
    if (validation.errors.some(e => e.type === 'invalid_config')) {
      return ProjectErrorCode.CORRUPTED_CONFIG;
    }
    if (validation.errors.some(e => e.type === 'permission')) {
      return ProjectErrorCode.PERMISSION_DENIED;
    }
    return ProjectErrorCode.INVALID_STRUCTURE;
  }
}
