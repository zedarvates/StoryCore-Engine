/**
 * Prompt validation utilities for ProjectDashboardNew
 * Implements validation logic for shot-level prompts
 * Requirements: 1.3, 2.1, 2.2
 */

import {
  PromptValidation,
  ValidationError,
  ValidationWarning,
} from '../types/projectDashboard';

/**
 * Validates a shot prompt according to the following rules:
 * - Must not be empty or whitespace-only
 * - Must be between 10 and 500 characters (after trimming)
 * 
 * @param prompt - The prompt text to validate
 * @returns PromptValidation object with errors, warnings, and suggestions
 * 
 * Requirements:
 * - 1.3: Validate that the prompt is non-empty and contains valid text
 * - 2.1: Validate that the prompt length is between 10 and 500 characters
 * - 2.2: Reject prompts containing only whitespace
 */
export function validatePrompt(prompt: string): PromptValidation {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];

  // Trim the prompt for validation
  const trimmedPrompt = prompt.trim();

  // Check for empty or whitespace-only prompts
  if (prompt.length === 0) {
    errors.push({
      type: 'empty',
      message: 'Prompt cannot be empty',
      field: 'prompt',
    });
  } else if (trimmedPrompt.length === 0) {
    errors.push({
      type: 'empty',
      message: 'Prompt cannot contain only whitespace',
      field: 'prompt',
    });
  }

  // Check length constraints (only if not empty)
  if (trimmedPrompt.length > 0) {
    if (trimmedPrompt.length < 10) {
      errors.push({
        type: 'too_short',
        message: `Prompt is too short (${trimmedPrompt.length} characters). Minimum length is 10 characters.`,
        field: 'prompt',
      });
      suggestions.push('Add more descriptive details to your prompt to reach the minimum length of 10 characters.');
    } else if (trimmedPrompt.length > 500) {
      errors.push({
        type: 'too_long',
        message: `Prompt is too long (${trimmedPrompt.length} characters). Maximum length is 500 characters.`,
        field: 'prompt',
      });
      suggestions.push('Shorten your prompt to 500 characters or less while keeping the essential details.');
    }
  }

  // Add warnings for prompts that are valid but could be improved
  if (trimmedPrompt.length >= 10 && trimmedPrompt.length <= 500) {
    // Warn if prompt is very short (but still valid)
    if (trimmedPrompt.length < 20) {
      warnings.push({
        type: 'vague',
        message: 'Prompt is quite short. Consider adding more details for better results.',
        suggestion: 'Include details about composition, lighting, mood, or specific visual elements.',
      });
    }

    // Warn if prompt is very long (but still valid)
    if (trimmedPrompt.length > 400) {
      warnings.push({
        type: 'missing_detail',
        message: 'Prompt is quite long. Consider focusing on the most important details.',
        suggestion: 'Very long prompts may dilute the focus. Try to be concise while maintaining clarity.',
      });
    }
  }

  // Determine if the prompt is valid (no errors)
  const isValid = errors.length === 0;

  return {
    isValid,
    errors,
    warnings,
    suggestions,
  };
}

/**
 * Checks if a prompt is valid without returning detailed validation results
 * Convenience function for quick validation checks
 * 
 * @param prompt - The prompt text to validate
 * @returns true if the prompt is valid, false otherwise
 */
export function isPromptValid(prompt: string): boolean {
  const validation = validatePrompt(prompt);
  return validation.isValid;
}

/**
 * Gets a human-readable error message from a validation result
 * Useful for displaying validation errors in the UI
 * 
 * @param validation - The validation result
 * @returns A formatted error message, or null if no errors
 */
export function getValidationErrorMessage(validation: PromptValidation): string | null {
  if (validation.errors.length === 0) {
    return null;
  }

  // Return the first error message
  return validation.errors[0].message;
}

/**
 * Gets all error messages from a validation result
 * 
 * @param validation - The validation result
 * @returns An array of error messages
 */
export function getAllValidationErrors(validation: PromptValidation): string[] {
  return validation.errors.map(error => error.message);
}

/**
 * Gets all warning messages from a validation result
 * 
 * @param validation - The validation result
 * @returns An array of warning messages
 */
export function getAllValidationWarnings(validation: PromptValidation): string[] {
  return validation.warnings.map(warning => warning.message);
}
