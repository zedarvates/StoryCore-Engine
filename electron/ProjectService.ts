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
import { getDefaultProjectsDirectory } from './defaultPaths';

/**
 * Data for creating a new project
 */
export interface NewProjectData {
  name: string;
  location?: string; // Optional - defaults to Documents/StoryCore Projects
  template?: string;
  format?: any; // Project format configuration
  initialShots?: any[]; // Initial shots to create
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
  directories: ['sequences', 'scenes', 'characters', 'worlds', 'assets'],
  files: {
    'README.md': `# {PROJECT_NAME}

A StoryCore Creative Studio project.

## Getting Started

1. Open the project in StoryCore Creative Studio
2. Create your story using the wizards and tools
3. Generate your video content

## Project Structure

- \`sequences/\` - Sequence plans and shot definitions
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

      // Use default projects directory if location not provided
      const location = data.location || getDefaultProjectsDirectory();
      console.log(`Creating project "${data.name}" at location: ${location}`);

      // Validate and sanitize location path
      const sanitizedLocation = this.sanitizePath(location);
      
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
          console.log(`Created directory: ${dir}`);
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
        shots: data.initialShots || [],
        metadata: {
          id: uuidv4(),
          created_at: now,
          updated_at: now,
          format: data.format,
          sequences: data.initialShots ? new Set(data.initialShots.map(s => s.sequence_id)).size : 0,
          totalShots: data.initialShots?.length || 0,
        },
      } as ProjectConfig;

      const projectJsonPath = path.join(projectPath, 'project.json');
      try {
        fs.writeFileSync(projectJsonPath, JSON.stringify(projectConfig, null, 2), 'utf-8');
        console.log('Created project.json');
      } catch (error) {
        // Clean up on failure
        this.cleanupDirectory(projectPath);
        throw new FileSystemError(
          FileSystemErrorCode.CREATE_FAILED,
          `Failed to create project.json: ${error instanceof Error ? error.message : String(error)}`,
          projectJsonPath
        );
      }

      // Create sequence files if we have initial shots
      if (data.initialShots && data.initialShots.length > 0) {
        console.log(`Creating sequence files for ${data.initialShots.length} shots...`);
        
        const sequencesDir = path.join(projectPath, 'sequences');
        
        // Ensure sequences directory exists
        if (!fs.existsSync(sequencesDir)) {
          fs.mkdirSync(sequencesDir, { recursive: true });
          console.log('Created sequences directory');
        }

        // Group shots by sequence_id
        const sequenceMap = new Map<string, any[]>();
        data.initialShots.forEach(shot => {
          if (!sequenceMap.has(shot.sequence_id)) {
            sequenceMap.set(shot.sequence_id, []);
          }
          sequenceMap.get(shot.sequence_id)!.push(shot);
        });

        console.log(`Grouped into ${sequenceMap.size} sequences`);

        // Create a JSON file for each sequence
        let sequenceNumber = 1;
        for (const [sequenceId, shots] of sequenceMap.entries()) {
          const sequenceData = {
            id: sequenceId,
            name: `Sequence ${sequenceNumber}`,
            description: `Default sequence ${sequenceNumber}`,
            duration: shots.reduce((sum, shot) => sum + (shot.duration || 0), 0),
            shots: shots,
            order: sequenceNumber,
            metadata: {
              created_at: now,
              updated_at: now,
              status: 'draft',
            },
          };

          const sequenceFileName = `sequence_${sequenceNumber.toString().padStart(3, '0')}.json`;
          const sequenceFilePath = path.join(sequencesDir, sequenceFileName);
          
          try {
            fs.writeFileSync(sequenceFilePath, JSON.stringify(sequenceData, null, 2), 'utf-8');
            console.log(`Created sequence file: ${sequenceFileName}`);
          } catch (error) {
            console.warn(`Failed to create sequence file ${sequenceFileName}:`, error);
          }

          sequenceNumber++;
        }
        
        console.log(`Successfully created ${sequenceNumber - 1} sequence files`);
      } else {
        console.log('No initial shots provided, skipping sequence file creation');
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

      // Create project summary file if we have format info
      if (data.format) {
        const summaryContent = `# ${data.name} - Project Summary

## Format
- **Type**: ${data.format.name}
- **Duration**: ${data.format.duration}
- **Sequences**: ${data.format.sequences}
- **Shot Duration**: ${data.format.shotDuration}s

## Structure
- Total Sequences: ${data.initialShots ? new Set(data.initialShots.map((s: any) => s.sequence_id)).size : 0}
- Total Shots: ${data.initialShots?.length || 0}
- Estimated Duration: ~${data.format.durationMinutes} minutes

## Sequences
${data.initialShots ? 
  Array.from(new Set(data.initialShots.map((s: any) => s.sequence_id)))
    .map((seqId, idx) => {
      const seqShots = data.initialShots!.filter((s: any) => s.sequence_id === seqId);
      return `- Sequence ${idx + 1}: ${seqShots.length} shot(s), ${seqShots.reduce((sum: number, s: any) => sum + (s.duration || 0), 0)}s`;
    })
    .join('\n')
  : 'No sequences created'}

## Created
${now}

---
Generated by StoryCore Creative Studio
`;
        
        try {
          fs.writeFileSync(path.join(projectPath, 'PROJECT_SUMMARY.md'), summaryContent, 'utf-8');
        } catch (error) {
          console.warn('Failed to create PROJECT_SUMMARY.md:', error);
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

  /**
   * Update project metadata
   * @param projectPath Path to the project directory
   * @param metadata Metadata to update (partial)
   * @returns Updated project information
   */
  async updateMetadata(projectPath: string, metadata: Record<string, any>): Promise<Project> {
    try {
      // Validate and sanitize path
      const sanitizedPath = this.sanitizePath(projectPath);
      
      // Check if project exists
      const projectJsonPath = path.join(sanitizedPath, 'project.json');
      if (!fs.existsSync(projectJsonPath)) {
        throw new FileSystemError(
          FileSystemErrorCode.NOT_FOUND,
          'Project file not found',
          projectJsonPath
        );
      }

      // Read current project.json
      let projectConfig: ProjectConfig;
      try {
        const content = fs.readFileSync(projectJsonPath, 'utf-8');
        projectConfig = JSON.parse(content);
      } catch (error) {
        throw new ProjectError(
          ProjectErrorCode.CORRUPTED_CONFIG,
          `Failed to read project.json: ${error instanceof Error ? error.message : String(error)}`,
          projectJsonPath
        );
      }

      // Update metadata
      const now = new Date().toISOString();
      projectConfig.metadata = {
        ...projectConfig.metadata,
        ...metadata,
        updated_at: now,
      };
      projectConfig.modified_at = now;

      // Write updated project.json
      try {
        fs.writeFileSync(projectJsonPath, JSON.stringify(projectConfig, null, 2), 'utf-8');
        console.log('Project metadata updated successfully');
      } catch (error) {
        throw new FileSystemError(
          FileSystemErrorCode.WRITE_FAILED,
          `Failed to write project.json: ${error instanceof Error ? error.message : String(error)}`,
          projectJsonPath
        );
      }

      // Return updated project information
      return {
        id: (projectConfig.metadata as any)?.id || uuidv4(),
        name: projectConfig.project_name,
        path: sanitizedPath,
        version: projectConfig.storycore_version || '1.0.0',
        createdAt: projectConfig.created_at ? new Date(projectConfig.created_at) : new Date(),
        modifiedAt: new Date(now),
        config: projectConfig,
      };
    } catch (error) {
      if (error instanceof ProjectError || error instanceof FileSystemError) {
        throw error;
      }
      throw new ProjectError(
        ProjectErrorCode.INVALID_STRUCTURE,
        `Failed to update project metadata: ${error instanceof Error ? error.message : String(error)}`,
        projectPath
      );
    }
  }

  /**
   * Update a shot in a sequence file
   * @param projectPath Path to the project directory
   * @param sequenceId ID of the sequence containing the shot
   * @param shotId ID of the shot to update
   * @param updates Partial shot data to update
   */
  async updateShotInSequence(
    projectPath: string,
    sequenceId: string,
    shotId: string,
    updates: Record<string, any>
  ): Promise<void> {
    try {
      const sanitizedPath = this.sanitizePath(projectPath);
      const sequencesDir = path.join(sanitizedPath, 'sequences');
      
      // Check if sequences directory exists
      if (!fs.existsSync(sequencesDir)) {
        throw new FileSystemError(
          FileSystemErrorCode.NOT_FOUND,
          'Sequences directory not found',
          sequencesDir
        );
      }
      
      // Find the sequence file
      const files = fs.readdirSync(sequencesDir);
      let sequenceFile: string | null = null;
      let sequenceData: any = null;
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        try {
          const filePath = path.join(sequencesDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          
          if (data.id === sequenceId) {
            sequenceFile = file;
            sequenceData = data;
            break;
          }
        } catch (error) {
          console.warn(`Failed to read sequence file ${file}:`, error);
          continue;
        }
      }
      
      if (!sequenceFile || !sequenceData) {
        throw new FileSystemError(
          FileSystemErrorCode.NOT_FOUND,
          `Sequence ${sequenceId} not found`,
          sequencesDir
        );
      }
      
      // Find and update the shot
      const shotIndex = sequenceData.shots.findIndex((s: any) => s.id === shotId);
      if (shotIndex === -1) {
        throw new FileSystemError(
          FileSystemErrorCode.NOT_FOUND,
          `Shot ${shotId} not found in sequence ${sequenceId}`,
          path.join(sequencesDir, sequenceFile)
        );
      }
      
      // Update the shot
      sequenceData.shots[shotIndex] = {
        ...sequenceData.shots[shotIndex],
        ...updates,
      };
      
      // Update sequence metadata
      const now = new Date().toISOString();
      sequenceData.metadata = {
        ...sequenceData.metadata,
        updated_at: now,
      };
      
      // Write back to file
      const sequenceFilePath = path.join(sequencesDir, sequenceFile);
      try {
        fs.writeFileSync(sequenceFilePath, JSON.stringify(sequenceData, null, 2), 'utf-8');
        console.log(`Shot ${shotId} updated in sequence ${sequenceId}`);
      } catch (error) {
        throw new FileSystemError(
          FileSystemErrorCode.WRITE_FAILED,
          `Failed to write sequence file: ${error instanceof Error ? error.message : String(error)}`,
          sequenceFilePath
        );
      }
    } catch (error) {
      if (error instanceof FileSystemError) {
        throw error;
      }
      throw new FileSystemError(
        FileSystemErrorCode.WRITE_FAILED,
        `Failed to update shot in sequence: ${error instanceof Error ? error.message : String(error)}`,
        projectPath
      );
    }
  }

  /**
   * Get all shots from a sequence
   * @param projectPath Path to the project directory
   * @param sequenceId ID of the sequence
   * @returns Array of shots
   */
  async getShotsFromSequence(
    projectPath: string,
    sequenceId: string
  ): Promise<any[]> {
    try {
      const sanitizedPath = this.sanitizePath(projectPath);
      const sequencesDir = path.join(sanitizedPath, 'sequences');
      
      if (!fs.existsSync(sequencesDir)) {
        return [];
      }
      
      // Find the sequence file
      const files = fs.readdirSync(sequencesDir);
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        try {
          const filePath = path.join(sequencesDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          
          if (data.id === sequenceId) {
            return data.shots || [];
          }
        } catch (error) {
          console.warn(`Failed to read sequence file ${file}:`, error);
          continue;
        }
      }
      
      return [];
    } catch (error) {
      console.error('Failed to get shots from sequence:', error);
      return [];
    }
  }

  /**
   * Get all sequences from project
   * @param projectPath Path to the project directory
   * @returns Array of sequence data
   */
  async getAllSequences(projectPath: string): Promise<any[]> {
    try {
      const sanitizedPath = this.sanitizePath(projectPath);
      const sequencesDir = path.join(sanitizedPath, 'sequences');
      
      if (!fs.existsSync(sequencesDir)) {
        return [];
      }
      
      const files = fs.readdirSync(sequencesDir);
      const sequences: any[] = [];
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        try {
          const filePath = path.join(sequencesDir, file);
          const content = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(content);
          sequences.push(data);
        } catch (error) {
          console.warn(`Failed to read sequence file ${file}:`, error);
          continue;
        }
      }
      
      // Sort by order
      sequences.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      return sequences;
    } catch (error) {
      console.error('Failed to get all sequences:', error);
      return [];
    }
  }
}

