/**
 * Project structure validation system
 * 
 * Validates StoryCore project directories to ensure they contain
 * all required files and have a valid structure.
 */

import * as fs from 'fs';
import * as path from 'path';
import { ValidationError } from './errors';

/**
 * Project configuration schema (Data Contract v1)
 */
export interface ProjectConfig {
  schema_version: string;
  project_name: string;
  created_at?: string;
  modified_at?: string;
  storycore_version?: string;
  
  capabilities: {
    grid_generation: boolean;
    promotion_engine: boolean;
    qa_engine: boolean;
    autofix_engine: boolean;
    character_system?: boolean;
    world_building?: boolean;
    casting_system?: boolean;
  };
  
  generation_status: {
    grid: 'pending' | 'done' | 'failed' | 'passed';
    promotion: 'pending' | 'done' | 'failed' | 'passed';
  };
  
  settings?: {
    default_resolution?: string;
    quality_threshold?: number;
    llm_provider?: string;
  };
  
  metadata?: Record<string, unknown>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  config?: ProjectConfig;
}

/**
 * Validation warning (non-fatal issues)
 */
export interface ValidationWarning {
  code: string;
  message: string;
  path?: string;
  suggestion?: string;
}

/**
 * Required project structure
 */
const PROJECT_STRUCTURE = {
  requiredFiles: ['project.json'],
  optionalFiles: ['package.json', 'README.md'],
  requiredDirs: [],
  optionalDirs: ['scenes', 'characters', 'worlds', 'assets'],
};

/**
 * Validates StoryCore project directories
 */
export class ProjectValidator {
  /**
   * Validate a project directory
   * @param projectPath Path to the project directory
   * @returns Validation result
   */
  async validate(projectPath: string): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    let config: ProjectConfig | undefined;

    try {
      // Check if path exists
      if (!fs.existsSync(projectPath)) {
        errors.push({
          type: 'missing_directory',
          path: projectPath,
          message: 'Project directory does not exist',
          suggestion: 'Select a valid project directory',
        });
        return { isValid: false, errors, warnings };
      }

      // Check if path is a directory
      const stats = fs.statSync(projectPath);
      if (!stats.isDirectory()) {
        errors.push({
          type: 'invalid_config',
          path: projectPath,
          message: 'Path is not a directory',
          suggestion: 'Select a directory, not a file',
        });
        return { isValid: false, errors, warnings };
      }

      // Check required files
      for (const file of PROJECT_STRUCTURE.requiredFiles) {
        const filePath = path.join(projectPath, file);
        if (!fs.existsSync(filePath)) {
          errors.push({
            type: 'missing_file',
            path: file,
            message: `Required file '${file}' is missing`,
            suggestion: `Create a ${file} file in the project directory`,
          });
        }
      }

      // Check optional files (warnings only)
      for (const file of PROJECT_STRUCTURE.optionalFiles) {
        const filePath = path.join(projectPath, file);
        if (!fs.existsSync(filePath)) {
          warnings.push({
            code: 'OPTIONAL_FILE_MISSING',
            path: file,
            message: `Optional file '${file}' is missing`,
            suggestion: `Consider adding a ${file} file`,
          });
        }
      }

      // Check required directories
      for (const dir of PROJECT_STRUCTURE.requiredDirs) {
        const dirPath = path.join(projectPath, dir);
        if (!fs.existsSync(dirPath)) {
          errors.push({
            type: 'missing_directory',
            path: dir,
            message: `Required directory '${dir}' is missing`,
            suggestion: `Create a ${dir} directory in the project`,
          });
        } else {
          const dirStats = fs.statSync(dirPath);
          if (!dirStats.isDirectory()) {
            errors.push({
              type: 'invalid_config',
              path: dir,
              message: `'${dir}' exists but is not a directory`,
              suggestion: `Remove the file and create a directory named ${dir}`,
            });
          }
        }
      }

      // Validate project.json if it exists
      const projectJsonPath = path.join(projectPath, 'project.json');
      if (fs.existsSync(projectJsonPath)) {
        try {
          const configResult = await this.validateProjectConfig(projectJsonPath);
          config = configResult.config;
          errors.push(...configResult.errors);
          warnings.push(...configResult.warnings);
        } catch (error) {
          errors.push({
            type: 'invalid_config',
            path: 'project.json',
            message: `Failed to validate project.json: ${error instanceof Error ? error.message : String(error)}`,
            suggestion: 'Check the project.json file for syntax errors',
          });
        }
      }

      // Check file permissions
      try {
        fs.accessSync(projectPath, fs.constants.R_OK | fs.constants.W_OK);
      } catch (error) {
        errors.push({
          type: 'permission',
          path: projectPath,
          message: 'Insufficient permissions to access project directory',
          suggestion: 'Run as administrator or change directory permissions',
        });
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        config,
      };
    } catch (error) {
      errors.push({
        type: 'invalid_config',
        path: projectPath,
        message: `Validation failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      return { isValid: false, errors, warnings };
    }
  }

  /**
   * Validate project.json configuration file
   * @param configPath Path to project.json
   * @returns Validation result with parsed config
   */
  private async validateProjectConfig(configPath: string): Promise<{
    config?: ProjectConfig;
    errors: ValidationError[];
    warnings: ValidationWarning[];
  }> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    try {
      // Read and parse JSON
      const content = fs.readFileSync(configPath, 'utf-8');
      let config: unknown;
      
      try {
        config = JSON.parse(content);
      } catch (parseError) {
        errors.push({
          type: 'invalid_config',
          path: 'project.json',
          message: 'Invalid JSON syntax',
          suggestion: 'Fix JSON syntax errors in project.json',
        });
        return { errors, warnings };
      }

      // Validate schema
      if (!config || typeof config !== 'object') {
        errors.push({
          type: 'invalid_config',
          path: 'project.json',
          message: 'project.json must be a JSON object',
        });
        return { errors, warnings };
      }

      const cfg = config as Partial<ProjectConfig>;

      // Check required fields
      if (!cfg.schema_version || typeof cfg.schema_version !== 'string') {
        errors.push({
          type: 'invalid_config',
          path: 'project.json',
          message: 'Missing or invalid schema_version',
          suggestion: 'Add "schema_version": "1.0" to project.json',
        });
      }

      if (!cfg.project_name || typeof cfg.project_name !== 'string') {
        errors.push({
          type: 'invalid_config',
          path: 'project.json',
          message: 'Missing or invalid project_name',
          suggestion: 'Add a valid project_name to project.json',
        });
      }

      if (!cfg.capabilities || typeof cfg.capabilities !== 'object') {
        errors.push({
          type: 'invalid_config',
          path: 'project.json',
          message: 'Missing or invalid capabilities object',
          suggestion: 'Add capabilities object with required boolean fields',
        });
      } else {
        // Validate capabilities
        const caps = cfg.capabilities;
        const requiredCaps = ['grid_generation', 'promotion_engine', 'qa_engine', 'autofix_engine'];
        
        for (const cap of requiredCaps) {
          if (typeof (caps as any)[cap] !== 'boolean') {
            errors.push({
              type: 'invalid_config',
              path: `project.json/capabilities/${cap}`,
              message: `Missing or invalid capability: ${cap}`,
              suggestion: `Set ${cap} to true or false`,
            });
          }
        }
      }

      if (!cfg.generation_status || typeof cfg.generation_status !== 'object') {
        errors.push({
          type: 'invalid_config',
          path: 'project.json',
          message: 'Missing or invalid generation_status object',
          suggestion: 'Add generation_status with grid and promotion fields',
        });
      } else {
        // Validate generation_status
        const status = cfg.generation_status;
        const validStatuses = ['pending', 'done', 'failed', 'passed'];
        
        if (!validStatuses.includes(status.grid)) {
          errors.push({
            type: 'invalid_config',
            path: 'project.json/generation_status/grid',
            message: 'Invalid grid status',
            suggestion: `Set grid to one of: ${validStatuses.join(', ')}`,
          });
        }
        
        if (!validStatuses.includes(status.promotion)) {
          errors.push({
            type: 'invalid_config',
            path: 'project.json/generation_status/promotion',
            message: 'Invalid promotion status',
            suggestion: `Set promotion to one of: ${validStatuses.join(', ')}`,
          });
        }
      }

      // Check version compatibility
      if (cfg.storycore_version && cfg.storycore_version !== '1.0.0') {
        warnings.push({
          code: 'VERSION_MISMATCH',
          path: 'project.json',
          message: `Project was created with StoryCore version ${cfg.storycore_version}`,
          suggestion: 'Project may need migration to current version',
        });
      }

      // If no errors, return the config
      if (errors.length === 0) {
        return {
          config: cfg as ProjectConfig,
          errors,
          warnings,
        };
      }

      return { errors, warnings };
    } catch (error) {
      errors.push({
        type: 'invalid_config',
        path: 'project.json',
        message: `Failed to read project.json: ${error instanceof Error ? error.message : String(error)}`,
      });
      return { errors, warnings };
    }
  }

  /**
   * Quick check if a directory looks like a StoryCore project
   * @param projectPath Path to check
   * @returns True if it looks like a project
   */
  async quickCheck(projectPath: string): Promise<boolean> {
    try {
      if (!fs.existsSync(projectPath)) {
        return false;
      }

      const stats = fs.statSync(projectPath);
      if (!stats.isDirectory()) {
        return false;
      }

      // Check for project.json
      const projectJsonPath = path.join(projectPath, 'project.json');
      return fs.existsSync(projectJsonPath);
    } catch {
      return false;
    }
  }

  /**
   * Get a user-friendly error message for validation errors
   * @param result Validation result
   * @returns Error message
   */
  getErrorMessage(result: ValidationResult): string {
    if (result.isValid) {
      return '';
    }

    if (result.errors.length === 0) {
      return 'Unknown validation error';
    }

    // Group errors by type
    const missingFiles = result.errors.filter(e => e.type === 'missing_file');
    const missingDirs = result.errors.filter(e => e.type === 'missing_directory');
    const configErrors = result.errors.filter(e => e.type === 'invalid_config');
    const permissionErrors = result.errors.filter(e => e.type === 'permission');

    const messages: string[] = [];

    if (missingFiles.length > 0) {
      messages.push(`Missing files: ${missingFiles.map(e => e.path).join(', ')}`);
    }

    if (missingDirs.length > 0) {
      messages.push(`Missing directories: ${missingDirs.map(e => e.path).join(', ')}`);
    }

    if (configErrors.length > 0) {
      messages.push(`Configuration errors: ${configErrors.length} issue(s)`);
    }

    if (permissionErrors.length > 0) {
      messages.push('Permission denied');
    }

    return messages.join('. ');
  }
}
