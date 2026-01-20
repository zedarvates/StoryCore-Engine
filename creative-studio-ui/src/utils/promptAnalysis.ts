/**
 * Prompt analysis utilities for ProjectDashboardNew
 * Implements analysis logic for identifying missing/incomplete prompts
 * and generating improvement suggestions
 * 
 * Requirements: 6.1, 6.2
 */

import type { Project, Shot } from '../types/projectDashboard';
import { validatePrompt } from './promptValidation';

/**
 * Analysis result for a single shot
 */
export interface ShotAnalysis {
  shot: Shot;
  hasPrompt: boolean;
  isValid: boolean;
  issues: string[];
  suggestions: string[];
}

/**
 * Overall project prompt analysis result
 */
export interface ProjectPromptAnalysis {
  totalShots: number;
  completePrompts: number;
  incompletePrompts: number;
  invalidPrompts: number;
  shotAnalyses: ShotAnalysis[];
  overallSuggestions: string[];
}

/**
 * Analyzes all prompts in a project and identifies missing/incomplete prompts
 * 
 * Requirements:
 * - 6.1: Identify shots with missing or incomplete prompts
 * - 6.2: Display summary showing count of complete versus incomplete prompts
 * 
 * @param project - The project to analyze
 * @returns ProjectPromptAnalysis with detailed analysis results
 */
export function analyzeProjectPrompts(project: Project): ProjectPromptAnalysis {
  const shotAnalyses: ShotAnalysis[] = [];
  let completePrompts = 0;
  let incompletePrompts = 0;
  let invalidPrompts = 0;

  // Analyze each shot
  for (const shot of project.shots) {
    const validation = validatePrompt(shot.prompt);
    const hasPrompt = shot.prompt.trim().length > 0;
    const isValid = validation.isValid;

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Collect issues
    if (!hasPrompt) {
      issues.push('No prompt provided');
      suggestions.push('Add a descriptive prompt for this shot');
    } else if (!isValid) {
      issues.push(...validation.errors.map(e => e.message));
      suggestions.push(...validation.suggestions);
    }

    // Collect warnings as suggestions
    if (validation.warnings.length > 0) {
      suggestions.push(...validation.warnings.map(w => w.suggestion || w.message));
    }

    // Count status
    if (isValid) {
      completePrompts++;
    } else {
      incompletePrompts++;
      if (hasPrompt) {
        invalidPrompts++;
      }
    }

    shotAnalyses.push({
      shot,
      hasPrompt,
      isValid,
      issues,
      suggestions,
    });
  }

  // Generate overall suggestions
  const overallSuggestions: string[] = [];
  
  if (incompletePrompts > 0) {
    overallSuggestions.push(
      `${incompletePrompts} shot${incompletePrompts > 1 ? 's' : ''} need${incompletePrompts === 1 ? 's' : ''} attention before generation can proceed.`
    );
  }

  if (invalidPrompts > 0) {
    overallSuggestions.push(
      `${invalidPrompts} shot${invalidPrompts > 1 ? 's have' : ' has'} invalid prompts that need to be corrected.`
    );
  }

  if (completePrompts === project.shots.length && project.shots.length > 0) {
    overallSuggestions.push('All shots have valid prompts. Ready for generation!');
  }

  return {
    totalShots: project.shots.length,
    completePrompts,
    incompletePrompts,
    invalidPrompts,
    shotAnalyses,
    overallSuggestions,
  };
}

/**
 * Generates prompt improvement suggestions for a specific shot based on context
 * 
 * Requirements:
 * - 6.2: Suggest prompt improvements for shots that lack detail or consistency
 * 
 * @param shot - The shot to generate suggestions for
 * @param context - Optional context including surrounding shots and narrative info
 * @returns Array of suggestion strings
 */
export function generatePromptSuggestions(
  shot: Shot,
  context?: {
    previousShot?: Shot;
    nextShot?: Shot;
    narrativeContext?: string;
  }
): string[] {
  const suggestions: string[] = [];
  const validation = validatePrompt(shot.prompt);

  // If prompt is empty, provide basic suggestions
  if (shot.prompt.trim().length === 0) {
    suggestions.push('Start with a description of the main subject or action in this shot');
    suggestions.push('Include details about the setting or environment');
    suggestions.push('Specify the camera angle or perspective');
    
    // Add context-based suggestions
    if (context?.previousShot && context.previousShot.prompt.trim().length > 0) {
      suggestions.push(`Consider continuity with the previous shot: "${context.previousShot.prompt.substring(0, 50)}..."`);
    }
    
    return suggestions;
  }

  // If prompt is too short but valid, suggest more detail
  if (shot.prompt.trim().length < 30) {
    suggestions.push('Add more descriptive details to improve generation quality');
    
    if (!shot.metadata.cameraAngle) {
      suggestions.push('Specify a camera angle (e.g., "wide shot", "close-up", "medium shot")');
    }
    
    if (!shot.metadata.lighting) {
      suggestions.push('Describe the lighting (e.g., "bright daylight", "moody shadows", "golden hour")');
    }
    
    if (!shot.metadata.mood) {
      suggestions.push('Include the mood or atmosphere (e.g., "tense", "peaceful", "dramatic")');
    }
  }

  // Check for consistency with surrounding shots
  if (context?.previousShot || context?.nextShot) {
    const currentPromptLower = shot.prompt.toLowerCase();
    
    // Check for style consistency
    if (context.previousShot) {
      const prevPromptLower = context.previousShot.prompt.toLowerCase();
      
      // Simple heuristic: check if previous shot mentions style/art direction
      const styleKeywords = ['style', 'cinematic', 'realistic', 'animated', 'artistic'];
      const prevHasStyle = styleKeywords.some(keyword => prevPromptLower.includes(keyword));
      const currentHasStyle = styleKeywords.some(keyword => currentPromptLower.includes(keyword));
      
      if (prevHasStyle && !currentHasStyle) {
        suggestions.push('Consider maintaining consistent visual style with previous shot');
      }
    }
    
    // Check for location/setting consistency
    if (context.previousShot && context.nextShot) {
      const prevPrompt = context.previousShot.prompt.toLowerCase();
      const nextPrompt = context.nextShot.prompt.toLowerCase();
      
      const locationKeywords = ['indoor', 'outdoor', 'room', 'street', 'forest', 'city', 'building'];
      const prevLocation = locationKeywords.find(kw => prevPrompt.includes(kw));
      const nextLocation = locationKeywords.find(kw => nextPrompt.includes(kw));
      
      if (prevLocation === nextLocation && prevLocation) {
        const currentHasLocation = locationKeywords.some(kw => currentPromptLower.includes(kw));
        if (!currentHasLocation) {
          suggestions.push(`Consider specifying the location to maintain continuity (surrounding shots are ${prevLocation})`);
        }
      }
    }
  }

  // Add narrative context suggestions
  if (context?.narrativeContext) {
    suggestions.push(`Narrative context: ${context.narrativeContext}`);
  }

  // Include validation suggestions
  if (validation.suggestions.length > 0) {
    suggestions.push(...validation.suggestions);
  }

  return suggestions;
}

/**
 * Gets shots with missing or incomplete prompts
 * Convenience function for filtering shots that need attention
 * 
 * @param project - The project to analyze
 * @returns Array of shots with missing or invalid prompts
 */
export function getShotsWithMissingPrompts(project: Project): Shot[] {
  return project.shots.filter(shot => {
    const validation = validatePrompt(shot.prompt);
    return !validation.isValid;
  });
}

/**
 * Gets shots with valid prompts
 * Convenience function for filtering completed shots
 * 
 * @param project - The project to analyze
 * @returns Array of shots with valid prompts
 */
export function getShotsWithValidPrompts(project: Project): Shot[] {
  return project.shots.filter(shot => {
    const validation = validatePrompt(shot.prompt);
    return validation.isValid;
  });
}

/**
 * Calculates completion percentage for project prompts
 * 
 * @param project - The project to analyze
 * @returns Completion percentage (0-100)
 */
export function getPromptCompletionPercentage(project: Project): number {
  if (project.shots.length === 0) {
    return 100; // No shots means 100% complete
  }

  const validShots = getShotsWithValidPrompts(project);
  return Math.round((validShots.length / project.shots.length) * 100);
}
