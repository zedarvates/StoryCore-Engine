/**
 * Project Discovery Service
 * 
 * Scans the default projects directory to discover all valid StoryCore projects.
 * Provides caching to optimize performance and reduce file system operations.
 */

import * as fs from 'fs';
import * as path from 'path';
import { getDefaultProjectsDirectory } from '../defaultPaths';
import { ProjectConfig } from '../ProjectValidator';

/**
 * Discovered project metadata
 */
export interface DiscoveredProject {
  name: string;
  path: string;
  lastModified: number;
  isValid: boolean;
  metadata?: {
    schema_version: string;
    project_name: string;
    capabilities: Record<string, boolean>;
  };
  createdAt?: Date;
  isRecent: boolean; // Always false for discovered projects
}

/**
 * Result of project discovery scan
 */
export interface DiscoveryResult {
  projects: DiscoveredProject[];
  scannedPath: string;
  timestamp: number;
  errors: Array<{ path: string; error: string }>;
}

/**
 * Scan options
 */
export interface ScanOptions {
  bypassCache?: boolean;
  maxDepth?: number; // Default: 1 (no nested scanning)
}

/**
 * Cache entry structure
 */
interface CacheEntry {
  results: DiscoveryResult;
  timestamp: number; // Unix timestamp in milliseconds
}

/**
 * Validation result for project.json
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  config?: Partial<ProjectConfig>;
}

/**
 * Service for discovering StoryCore projects in the default directory
 */
export class ProjectDiscoveryService {
  private cache: CacheEntry | null = null;
  private readonly CACHE_TTL = 30000; // 30 seconds

  /**
   * Scans the project directory and returns all valid projects
   * @param options Scan options
   * @returns Discovery result with projects and errors
   */
  async scanProjectDirectory(options?: ScanOptions): Promise<DiscoveryResult> {
    const bypassCache = options?.bypassCache ?? false;
    // const maxDepth = options?.maxDepth ?? 1; // TODO: Implement recursive scanning

    // Check cache if not bypassing
    if (!bypassCache && this.cache) {
      const now = Date.now();
      const age = now - this.cache.timestamp;
      
      if (age < this.CACHE_TTL) {
        console.log(`[ProjectDiscoveryService] Returning cached results (age: ${age}ms)`);
        return { ...this.cache.results }; // Return copy to prevent mutation
      }
    }

    console.log('[ProjectDiscoveryService] Performing fresh scan');

    const projectsDir = getDefaultProjectsDirectory();
    const errors: Array<{ path: string; error: string }> = [];

    try {
      // Check if directory exists
      if (!fs.existsSync(projectsDir)) {
        console.warn(`[ProjectDiscoveryService] Projects directory does not exist: ${projectsDir}`);
        const result: DiscoveryResult = {
          projects: [],
          scannedPath: projectsDir,
          timestamp: Date.now(),
          errors: [{ path: projectsDir, error: 'ENOENT: Directory does not exist' }],
        };
        return result;
      }

      // Read directory contents
      const entries = await fs.promises.readdir(projectsDir, { withFileTypes: true });
      
      // Filter for directories only
      const folders = entries.filter(entry => entry.isDirectory());
      
      // Scan each folder for valid projects
      const projects: DiscoveredProject[] = [];
      
      for (const folder of folders) {
        const folderPath = path.join(projectsDir, folder.name);
        
        try {
          // Check if it's a valid project
          const isValid = await this.isValidProject(folderPath);
          
          if (isValid) {
            const metadata = await this.extractProjectMetadata(folderPath);
            
            if (metadata) {
              projects.push(metadata);
            } else {
              errors.push({
                path: folderPath,
                error: 'Failed to extract project metadata',
              });
            }
          }
        } catch (error) {
          // Log error and add to errors array
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.warn(`[ProjectDiscoveryService] Error scanning folder ${folder.name}:`, error);
          errors.push({
            path: folderPath,
            error: errorMessage,
          });
        }
      }

      // Create result
      const result: DiscoveryResult = {
        projects,
        scannedPath: projectsDir,
        timestamp: Date.now(),
        errors,
      };

      // Update cache
      this.cache = {
        results: result,
        timestamp: Date.now(),
      };

      console.log(`[ProjectDiscoveryService] Found ${projects.length} valid projects with ${errors.length} errors`);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[ProjectDiscoveryService] Failed to scan project directory:', error);
      
      // Return error result
      const result: DiscoveryResult = {
        projects: [],
        scannedPath: projectsDir,
        timestamp: Date.now(),
        errors: [{ path: projectsDir, error: errorMessage }],
      };
      return result;
    }
  }

  /**
   * Validates a project.json file for Data Contract v1 compliance
   * @param projectJsonPath Path to the project.json file
   * @returns Validation result with error details
   */
  async validateProjectJson(projectJsonPath: string): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      // Check if file exists
      if (!fs.existsSync(projectJsonPath)) {
        errors.push('project.json file does not exist');
        return { isValid: false, errors };
      }

      // Read file content
      const content = await fs.promises.readFile(projectJsonPath, 'utf-8');
      
      // Parse JSON
      let config: Partial<ProjectConfig>;
      try {
        config = JSON.parse(content);
      } catch (parseError) {
        if (parseError instanceof SyntaxError) {
          errors.push(`Invalid JSON syntax: ${parseError.message}`);
        } else {
          errors.push('Failed to parse JSON');
        }
        return { isValid: false, errors };
      }

      // Validate required fields according to Data Contract v1
      
      // 1. schema_version (required, must be string)
      if (!config.schema_version) {
        errors.push('Missing required field: schema_version');
      } else if (typeof config.schema_version !== 'string') {
        errors.push('Invalid type for schema_version: expected string');
      }

      // 2. project_name (required, must be string)
      if (!config.project_name) {
        errors.push('Missing required field: project_name');
      } else if (typeof config.project_name !== 'string') {
        errors.push('Invalid type for project_name: expected string');
      }

      // 3. capabilities (required, must be object with boolean values)
      if (!config.capabilities) {
        errors.push('Missing required field: capabilities');
      } else if (typeof config.capabilities !== 'object' || config.capabilities === null) {
        errors.push('Invalid type for capabilities: expected object');
      } else {
        // Validate required capability fields
        const requiredCapabilities = [
          'grid_generation',
          'promotion_engine',
          'qa_engine',
          'autofix_engine'
        ];
        
        for (const cap of requiredCapabilities) {
          const value = (config.capabilities as any)[cap];
          if (value === undefined) {
            errors.push(`Missing required capability: ${cap}`);
          } else if (typeof value !== 'boolean') {
            errors.push(`Invalid type for capability ${cap}: expected boolean`);
          }
        }
      }

      // 4. generation_status (required, must be object with valid status values)
      if (!config.generation_status) {
        errors.push('Missing required field: generation_status');
      } else if (typeof config.generation_status !== 'object' || config.generation_status === null) {
        errors.push('Invalid type for generation_status: expected object');
      } else {
        const validStatuses = ['pending', 'done', 'failed', 'passed'];
        
        // Check grid status
        if (!config.generation_status.grid) {
          errors.push('Missing required field: generation_status.grid');
        } else if (!validStatuses.includes(config.generation_status.grid)) {
          errors.push(`Invalid value for generation_status.grid: must be one of ${validStatuses.join(', ')}`);
        }
        
        // Check promotion status
        if (!config.generation_status.promotion) {
          errors.push('Missing required field: generation_status.promotion');
        } else if (!validStatuses.includes(config.generation_status.promotion)) {
          errors.push(`Invalid value for generation_status.promotion: must be one of ${validStatuses.join(', ')}`);
        }
      }

      // Return validation result
      return {
        isValid: errors.length === 0,
        errors,
        config: errors.length === 0 ? config : undefined
      };

    } catch (error) {
      // Handle unexpected errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      errors.push(`Validation error: ${errorMessage}`);
      return { isValid: false, errors };
    }
  }

  /**
   * Validates if a folder contains a valid project.json
   * @param folderPath Path to the folder to check
   * @returns True if the folder contains a valid project
   */
  async isValidProject(folderPath: string): Promise<boolean> {
    try {
      // Check if folder exists
      if (!fs.existsSync(folderPath)) {
        return false;
      }

      // Check if it's a directory
      const stats = await fs.promises.stat(folderPath);
      if (!stats.isDirectory()) {
        return false;
      }

      // Check for project.json
      const projectJsonPath = path.join(folderPath, 'project.json');
      if (!fs.existsSync(projectJsonPath)) {
        return false;
      }

      // Use the new validateProjectJson method
      const validationResult = await this.validateProjectJson(projectJsonPath);
      
      // Log validation errors if any
      if (!validationResult.isValid) {
        console.warn(`[ProjectDiscoveryService] Invalid project.json in ${folderPath}:`);
        validationResult.errors.forEach(error => {
          console.warn(`  - ${error}`);
        });
      }

      return validationResult.isValid;
    } catch (error) {
      // Log unexpected errors
      console.warn(`[ProjectDiscoveryService] Error validating project ${folderPath}:`, error);
      return false;
    }
  }

  /**
   * Extracts metadata from a project.json file
   * @param projectPath Path to the project directory
   * @returns Project metadata or null if extraction fails
   */
  async extractProjectMetadata(projectPath: string): Promise<DiscoveredProject | null> {
    try {
      const projectJsonPath = path.join(projectPath, 'project.json');
      
      // Read and parse project.json
      const content = await fs.promises.readFile(projectJsonPath, 'utf-8');
      const config = JSON.parse(content) as ProjectConfig;

      // Get file system stats for lastModified
      const stats = await fs.promises.stat(projectJsonPath);

      // Extract metadata
      const metadata: DiscoveredProject = {
        name: config.project_name,
        path: projectPath,
        lastModified: stats.mtime.getTime(), // Convert to timestamp
        isValid: true,
        metadata: {
          schema_version: config.schema_version,
          project_name: config.project_name,
          capabilities: config.capabilities,
        },
        isRecent: false, // Discovered projects are not marked as recent
      };

      // Add createdAt if available
      if (config.created_at) {
        try {
          const createdDate = new Date(config.created_at);
          // Check if date is valid
          if (!isNaN(createdDate.getTime())) {
            metadata.createdAt = createdDate;
          }
        } catch (error) {
          console.warn(`[ProjectDiscoveryService] Invalid created_at date in ${projectPath}:`, error);
        }
      }

      return metadata;
    } catch (error) {
      console.error(`[ProjectDiscoveryService] Failed to extract metadata from ${projectPath}:`, error);
      return null;
    }
  }

  /**
   * Clears the cache (useful for manual refresh)
   */
  clearCache(): void {
    console.log('[ProjectDiscoveryService] Cache cleared');
    this.cache = null;
  }

  /**
   * Get cache status for debugging
   * @returns Cache information
   */
  getCacheStatus(): { cached: boolean; age?: number; count?: number } {
    if (!this.cache) {
      return { cached: false };
    }

    const age = Date.now() - this.cache.timestamp;
    return {
      cached: true,
      age,
      count: this.cache.results.projects.length,
    };
  }
}
