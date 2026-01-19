/**
 * Project Export Service
 * 
 * Handles exporting the current project state to Data Contract v1 format
 * compatible with StoryCore-Engine backend.
 */

import type { Project, Shot, Asset } from '@/types';

/**
 * Export the current project to Data Contract v1 JSON format
 * 
 * @param projectName - Name of the project
 * @param shots - Array of shots in the project
 * @param assets - Array of assets in the project
 * @returns Project object in Data Contract v1 format
 */
export function exportProject(
  projectName: string,
  shots: Shot[],
  assets: Asset[]
): Project {
  // Sort shots by position to ensure correct sequence
  const sortedShots = [...shots].sort((a, b) => a.position - b.position);

  const project: Project = {
    schema_version: '1.0',
    project_name: projectName,
    shots: sortedShots,
    assets: assets,
    capabilities: {
      grid_generation: true,
      promotion_engine: true,
      qa_engine: true,
      autofix_engine: true,
    },
    generation_status: {
      grid: 'pending',
      promotion: 'pending',
    },
    metadata: {
      exported_at: new Date().toISOString(),
      total_duration: calculateTotalDuration(sortedShots),
      shot_count: sortedShots.length,
      asset_count: assets.length,
    },
  };

  return project;
}

/**
 * Export project to JSON string
 * 
 * @param projectName - Name of the project
 * @param shots - Array of shots in the project
 * @param assets - Array of assets in the project
 * @param pretty - Whether to format JSON with indentation (default: true)
 * @returns JSON string representation of the project
 */
export function exportProjectToJSON(
  projectName: string,
  shots: Shot[],
  assets: Asset[],
  pretty: boolean = true
): string {
  const project = exportProject(projectName, shots, assets);
  return pretty ? JSON.stringify(project, null, 2) : JSON.stringify(project);
}

/**
 * Download project as JSON file
 * 
 * @param projectName - Name of the project
 * @param shots - Array of shots in the project
 * @param assets - Array of assets in the project
 */
export function downloadProjectJSON(
  projectName: string,
  shots: Shot[],
  assets: Asset[]
): void {
  const json = exportProjectToJSON(projectName, shots, assets);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeFilename(projectName)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Validate project data before export
 * 
 * @param projectName - Name of the project
 * @param shots - Array of shots in the project
 * @returns Validation result with errors if any
 */
export function validateProjectForExport(
  projectName: string,
  shots: Shot[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Validate project name
  if (!projectName || projectName.trim().length === 0) {
    errors.push('Project name is required');
  }

  // Validate shots
  if (!shots || shots.length === 0) {
    errors.push('Project must contain at least one shot');
  }

  // Validate each shot
  shots.forEach((shot, index) => {
    if (!shot.id) {
      errors.push(`Shot ${index + 1}: ID is required`);
    }
    if (!shot.title || shot.title.trim().length === 0) {
      errors.push(`Shot ${index + 1}: Title is required`);
    }
    if (shot.duration <= 0) {
      errors.push(`Shot ${index + 1}: Duration must be greater than 0`);
    }
    if (typeof shot.position !== 'number') {
      errors.push(`Shot ${index + 1}: Position must be a number`);
    }
  });

  // Check for duplicate shot IDs
  const shotIds = shots.map(s => s.id);
  const duplicateIds = shotIds.filter((id, index) => shotIds.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate shot IDs found: ${duplicateIds.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Calculate total duration of all shots including transitions
 * 
 * @param shots - Array of shots
 * @returns Total duration in seconds
 */
function calculateTotalDuration(shots: Shot[]): number {
  return shots.reduce((total, shot) => {
    let duration = shot.duration;
    if (shot.transitionOut) {
      duration += shot.transitionOut.duration;
    }
    return total + duration;
  }, 0);
}

/**
 * Sanitize filename by removing invalid characters
 * 
 * @param filename - Original filename
 * @returns Sanitized filename
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-z0-9_\-]/gi, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
}

/**
 * Parse and validate imported project JSON
 * 
 * @param jsonString - JSON string to parse
 * @returns Parsed project or null if invalid
 */
export function importProjectFromJSON(jsonString: string): Project | null {
  try {
    const project = JSON.parse(jsonString) as Project;
    
    // Validate schema version
    if (project.schema_version !== '1.0') {
      console.error('Invalid schema version:', project.schema_version);
      return null;
    }
    
    // Validate required fields
    if (!project.project_name || !project.shots || !project.assets) {
      console.error('Missing required fields in project');
      return null;
    }
    
    // Validate capabilities
    if (!project.capabilities) {
      console.error('Missing capabilities in project');
      return null;
    }
    
    // Validate generation status
    if (!project.generation_status) {
      console.error('Missing generation_status in project');
      return null;
    }
    
    return project;
  } catch (error) {
    console.error('Failed to parse project JSON:', error);
    return null;
  }
}
