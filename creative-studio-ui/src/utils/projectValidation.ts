/**
 * Project name validation utilities
 * 
 * This module provides validation functions that match the backend validation rules
 * from src/project_manager.py to ensure consistent validation across frontend and backend.
 */

// Windows path length limit (including drive letter and separators)
const WINDOWS_MAX_PATH_LENGTH = 260;

// OS-specific invalid characters for file/directory names
// Windows has the most restrictive set, so we use that as the baseline
const INVALID_FILENAME_CHARS = ['/', '\\', ':', '*', '?', '"', '<', '>', '|', '\0'];

// Additional Windows reserved names that cannot be used as filenames
const WINDOWS_RESERVED_NAMES = new Set([
  'CON', 'PRN', 'AUX', 'NUL',
  'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9',
  'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'
]);

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

/**
 * Validate project name for cross-platform compatibility.
 * 
 * This function checks for:
 * - Empty or whitespace-only names
 * - Path traversal attempts (..)
 * - OS-specific invalid characters
 * - Windows reserved names
 * - Path length limits (Windows 260 character limit)
 * - Leading/trailing spaces or periods (problematic on Windows)
 * 
 * @param projectName - The proposed project name
 * @param basePath - Base directory where project will be created (optional)
 * @returns Validation result with isValid flag and optional error message
 */
export function validateProjectName(
  projectName: string,
  basePath?: string
): ValidationResult {
  // Check for empty or whitespace-only names
  if (!projectName || !projectName.trim()) {
    return {
      isValid: false,
      error: 'Project name cannot be empty or contain only whitespace'
    };
  }

  // Check for path traversal attempts
  if (projectName.includes('..')) {
    return {
      isValid: false,
      error: "Project name cannot contain '..' (parent directory reference)"
    };
  }

  // Check for absolute path indicators
  if (projectName.startsWith('/') || projectName.startsWith('\\')) {
    return {
      isValid: false,
      error: 'Project name cannot start with path separators'
    };
  }

  // Check for drive letters (Windows absolute paths like C:)
  if (projectName.length >= 2 && projectName[1] === ':') {
    return {
      isValid: false,
      error: "Project name cannot contain drive letters (e.g., 'C:')"
    };
  }

  // Check for invalid characters
  const invalidFound = INVALID_FILENAME_CHARS.filter(char => projectName.includes(char));
  if (invalidFound.length > 0) {
    // Format null character for display
    const displayChars = invalidFound.map(c => c === '\0' ? '\\0' : c);
    return {
      isValid: false,
      error: `Project name contains invalid characters: ${displayChars.join(', ')}`
    };
  }

  // Check for Windows reserved names (case-insensitive)
  const nameUpper = projectName.toUpperCase();
  // Check both the full name and name without extension
  const nameWithoutExt = nameUpper.includes('.') ? nameUpper.split('.')[0] : nameUpper;
  if (WINDOWS_RESERVED_NAMES.has(nameUpper) || WINDOWS_RESERVED_NAMES.has(nameWithoutExt)) {
    return {
      isValid: false,
      error: `Project name '${projectName}' is a reserved system name on Windows`
    };
  }

  // Check for leading/trailing spaces or periods (problematic on Windows)
  if (projectName !== projectName.trim()) {
    return {
      isValid: false,
      error: 'Project name cannot have leading or trailing whitespace'
    };
  }

  if (projectName.endsWith('.')) {
    return {
      isValid: false,
      error: 'Project name cannot end with a period'
    };
  }

  // Check path length limits (Windows has the most restrictive limit)
  if (basePath) {
    try {
      // Calculate the full path length that would be created
      const fullProjectPath = `${basePath}/${projectName}`;
      
      // Add some buffer for subdirectories and files that will be created
      // (e.g., "assets/images/some_file.png")
      const maxSubpathLength = 50; // Reasonable estimate for deepest file path
      const estimatedMaxPath = `${fullProjectPath}/${'x'.repeat(maxSubpathLength)}`;
      
      // On Windows, check against the 260 character limit
      if (navigator.platform.toLowerCase().includes('win') && estimatedMaxPath.length > WINDOWS_MAX_PATH_LENGTH) {
        return {
          isValid: false,
          error: `Project path would exceed Windows maximum path length of ${WINDOWS_MAX_PATH_LENGTH} characters. ` +
                 `Current path would be approximately ${estimatedMaxPath.length} characters. ` +
                 `Please use a shorter project name or create the project in a directory with a shorter path.`
        };
      }
      
      // Even on non-Windows systems, extremely long paths can cause issues
      if (estimatedMaxPath.length > 4096) { // Most Unix systems support up to 4096
        return {
          isValid: false,
          error: `Project path would be too long (${estimatedMaxPath.length} characters). Please use a shorter name.`
        };
      }
    } catch (error) {
      // If we can't validate path length, log it but don't fail validation
      console.warn(`Could not validate path length for project '${projectName}':`, error);
    }
  }

  // All checks passed
  return { isValid: true };
}

/**
 * Check if a project name already exists in the given base path
 * 
 * @param projectName - The project name to check
 * @param basePath - Base directory where projects are stored
 * @param existingProjects - List of existing project paths or names
 * @returns Validation result
 */
export function checkDuplicateProject(
  projectName: string,
  basePath: string,
  existingProjects: string[]
): ValidationResult {
  // Normalize the project name for comparison
  const normalizedName = projectName.toLowerCase().trim();
  
  // Check if any existing project matches
  const isDuplicate = existingProjects.some(existingPath => {
    // Extract project name from path if it's a full path
    const existingName = existingPath.includes('/') || existingPath.includes('\\')
      ? existingPath.split(/[/\\]/).pop() || ''
      : existingPath;
    
    return existingName.toLowerCase().trim() === normalizedName;
  });

  if (isDuplicate) {
    return {
      isValid: false,
      error: `A project named '${projectName}' already exists in this location`
    };
  }

  return { isValid: true };
}

/**
 * Validate project path/location
 * 
 * @param projectPath - The project location path (optional - will use default if empty)
 * @returns Validation result
 */
export function validateProjectPath(projectPath: string): ValidationResult {
  // Empty path is valid - will use default Documents directory
  if (!projectPath || !projectPath.trim()) {
    return { isValid: true };
  }

  // Check for path length on Windows
  if (navigator.platform.toLowerCase().includes('win') && projectPath.length > 200) {
    return {
      isValid: false,
      error: 'Project location path is too long. Please choose a shorter path.'
    };
  }

  return { isValid: true };
}

/**
 * Comprehensive validation for project creation
 * 
 * @param projectName - The project name
 * @param projectPath - The project location
 * @param existingProjects - List of existing project paths
 * @returns Object with validation results for each field
 */
export function validateProjectCreation(
  projectName: string,
  projectPath: string,
  existingProjects: string[] = []
): {
  projectName?: string;
  projectPath?: string;
  isValid: boolean;
} {
  const errors: { projectName?: string; projectPath?: string } = {};

  // Validate project name
  const nameValidation = validateProjectName(projectName, projectPath);
  if (!nameValidation.isValid) {
    errors.projectName = nameValidation.error;
  }

  // Check for duplicates
  if (nameValidation.isValid && projectPath) {
    const duplicateCheck = checkDuplicateProject(projectName, projectPath, existingProjects);
    if (!duplicateCheck.isValid) {
      errors.projectName = duplicateCheck.error;
    }
  }

  // Validate project path
  const pathValidation = validateProjectPath(projectPath);
  if (!pathValidation.isValid) {
    errors.projectPath = pathValidation.error;
  }

  return {
    ...errors,
    isValid: Object.keys(errors).length === 0
  };
}
