/**
 * StoryCore-Engine Integration Service
 * 
 * Handles communication with the StoryCore-Engine Python CLI
 * for sequence generation and pipeline execution.
 * 
 * Requirements: 7.2
 */

import type { GenerationStatus } from '../types';
import { bulkProductionService } from '../../services/BulkProductionService';
import { useProjectStore } from '../../stores/useProjectStore';

// ============================================================================
// Types
// ============================================================================

export interface PipelineProgress {
  stage: GenerationStatus['stage'];
  progress: number;
  message?: string;
}

export interface PipelineResult {
  success: boolean;
  outputPath?: string;
  error?: string;
}

export interface ProjectData {
  name: string;
  shots: Array<{
    id: string;
    prompt: string;
    parameters: Record<string, unknown>;
    referenceImages: string[];
  }>;
  settings: {
    resolution: { width: number; height: number };
    fps: number;
    format: string;
  };
}

// ============================================================================
// Pipeline Execution
// ============================================================================

/**
 * Execute the StoryCore-Engine pipeline for sequence generation
 * 
 * @param projectData - Project configuration and shots
 * @param onProgress - Callback for progress updates
 * @returns Promise with generation result
 */
export async function executeGenerationPipeline(
  projectData: ProjectData,
  onProgress: (progress: PipelineProgress) => void
): Promise<PipelineResult> {
  try {
    const store = useProjectStore.getState();
    const { project, shots, characters } = store;
    
    if (!project || shots.length === 0) {
      return { success: false, error: 'Project data or shots missing in store' };
    }

    // Execute real bulk production
    const result = await bulkProductionService.generateSequenceBulk(
      project,
      shots,
      characters,
      {
        concurrency: 2,
        coherenceLock: true,
        onProgress: (p) => {
          // Map bulk progress to pipeline stages
          // For simplicity, we use the progress % to advance stages
          let stage: GenerationStatus['stage'] = 'grid';
          if (p > 25) stage = 'promotion';
          if (p > 50) stage = 'qa';
          if (p > 75) stage = 'export';
          
          onProgress({ stage, progress: p, message: `Bulk rendering: ${p}%` });
        }
      }
    );

    if (result.failed.length > 0) {
      return {
        success: result.successful.length > 0,
        error: `${result.failed.length} shots failed to generate.`,
      };
    }

    return {
      success: true,
      outputPath: 'Bulk generation complete', // Path can be retrieved from shots
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}


// ============================================================================
// CLI Integration (for Electron environment)
// ============================================================================

/**
 * Execute StoryCore-Engine CLI command
 * This function should be called from Electron's main process
 * 
 * @param command - CLI command to execute
 * @param args - Command arguments
 * @param onOutput - Callback for stdout/stderr
 * @returns Promise with command result
 */
export async function executeStorycoreCLI(
  command: string,
  args: string[],
  _onOutput?: (output: string) => void
): Promise<{ success: boolean; output: string; error?: string }> {
  // This would be implemented in Electron's main process using child_process
  // Example implementation:
  /*
  const { spawn } = require('child_process');
  
  return new Promise((resolve) => {
    const process = spawn('python3', ['storycore.py', command, ...args]);
    let output = '';
    let error = '';
    
    process.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      if (onOutput) onOutput(text);
    });
    
    process.stderr.on('data', (data) => {
      error += data.toString();
    });
    
    process.on('close', (code) => {
      resolve({
        success: code === 0,
        output,
        error: code !== 0 ? error : undefined,
      });
    });
  });
  */
  
  // Placeholder for development
  return {
    success: true,
    output: `Executed: ${command} ${args.join(' ')}`,
  };
}

// ============================================================================
// Progress Parsing
// ============================================================================

/**
 * Parse StoryCore-Engine CLI output for progress information
 * 
 * @param output - CLI stdout/stderr output
 * @returns Parsed progress information
 */
export function parseProgressOutput(output: string): PipelineProgress | null {
  // Parse output patterns like:
  // "[GRID] Generating master coherence sheet... 25%"
  // "[PROMOTION] Processing panel 3/9... 33%"
  // "[QA] Analyzing quality... 75%"
  // "[EXPORT] Encoding video... 90%"
  
  const stagePatterns: Record<string, GenerationStatus['stage']> = {
    '\\[GRID\\]': 'grid',
    '\\[PROMOTION\\]': 'promotion',
    '\\[QA\\]': 'qa',
    '\\[EXPORT\\]': 'export',
  };

  for (const [pattern, stage] of Object.entries(stagePatterns)) {
    const regex = new RegExp(`${pattern}.*?(\\d+)%`, 'i');
    const match = output.match(regex);
    
    if (match) {
      return {
        stage,
        progress: parseInt(match[1], 10),
        message: output.trim(),
      };
    }
  }

  return null;
}

// ============================================================================
// Error Handling
// ============================================================================

/**
 * Convert CLI errors to user-friendly messages
 * 
 * @param error - Error message from CLI
 * @returns User-friendly error message
 */
export function formatPipelineError(error: string): string {
  const errorMappings: Record<string, string> = {
    'FileNotFoundError': 'Required files are missing. Please check your project configuration.',
    'PermissionError': 'Permission denied. Please check file permissions.',
    'ModuleNotFoundError': 'Required Python modules are missing. Please install dependencies.',
    'ComfyUI connection failed': 'Cannot connect to ComfyUI backend. Please ensure ComfyUI is running.',
    'Invalid prompt': 'Shot prompts contain invalid characters or formatting.',
    'Out of memory': 'Insufficient memory for generation. Try reducing resolution or shot count.',
    'CUDA out of memory': 'GPU memory exhausted. Try reducing batch size or resolution.',
  };

  for (const [pattern, message] of Object.entries(errorMappings)) {
    if (error.includes(pattern)) {
      return message;
    }
  }

  // Return original error if no mapping found
  return `Generation failed: ${error}`;
}

// ============================================================================
// Project Export
// ============================================================================

/**
 * Export project data to StoryCore-Engine format
 * 
 * @param projectData - Project configuration
 * @returns JSON string for StoryCore-Engine
 */
export function exportProjectToStorycore(projectData: ProjectData): string {
  // Convert to StoryCore-Engine Data Contract v1 format
  const storycoreProject = {
    schema_version: '1.0',
    project_name: projectData.name,
    capabilities: {
      grid_generation: true,
      promotion_engine: true,
      qa_engine: true,
      autofix_engine: true,
    },
    shots: projectData.shots.map((shot, index) => ({
      id: shot.id,
      index,
      prompt: shot.prompt,
      parameters: shot.parameters,
      reference_images: shot.referenceImages,
    })),
    settings: {
      resolution: projectData.settings.resolution,
      fps: projectData.settings.fps,
      format: projectData.settings.format,
    },
  };

  return JSON.stringify(storycoreProject, null, 2);
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate project data before generation
 * 
 * @param projectData - Project to validate
 * @returns Validation result with errors if any
 */
export function validateProjectForGeneration(
  projectData: ProjectData
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!projectData.name || projectData.name.trim() === '') {
    errors.push('Project name is required');
  }

  if (!projectData.shots || projectData.shots.length === 0) {
    errors.push('At least one shot is required');
  }

  projectData.shots.forEach((shot, index) => {
    if (!shot.prompt || shot.prompt.trim() === '') {
      errors.push(`Shot ${index + 1} is missing a prompt`);
    }
  });

  if (!projectData.settings.resolution.width || !projectData.settings.resolution.height) {
    errors.push('Invalid resolution settings');
  }

  if (!projectData.settings.fps || projectData.settings.fps <= 0) {
    errors.push('Invalid FPS setting');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

