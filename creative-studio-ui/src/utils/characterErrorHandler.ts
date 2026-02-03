// ============================================================================
// Character Error Handler
// ============================================================================
// Centralized error handling for character operations
// Provides user-friendly error messages and logging
// Requirements: 2.4, 11.5
// ============================================================================

import { toast } from './toast';
import type { ValidationResult } from '../hooks/useCharacterManager';

/**
 * Error types for character operations
 */
export const CharacterErrorType = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE_ID: 'DUPLICATE_ID',
  PERSISTENCE_ERROR: 'PERSISTENCE_ERROR',
  RELATIONSHIP_ERROR: 'RELATIONSHIP_ERROR',
  DEPENDENCY_ERROR: 'DEPENDENCY_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type CharacterErrorType = typeof CharacterErrorType[keyof typeof CharacterErrorType];

/**
 * Character operation error with detailed information
 */
export class CharacterError extends Error {
  type: CharacterErrorType;
  details?: any;

  constructor(
    type: CharacterErrorType,
    message: string,
    details?: any
  ) {
    super(message);
    this.name = 'CharacterError';
    this.type = type;
    this.details = details;
  }
}

/**
 * Format validation errors for display
 * Requirements: 2.4, 11.5
 */
export function formatValidationErrors(validation: ValidationResult): string {
  if (validation.valid) {
    return '';
  }

  const errorMessages: string[] = [];
  
  Object.entries(validation.errors).forEach(([field, errors]) => {
    const fieldName = field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    errors.forEach((error) => {
      errorMessages.push(`${fieldName}: ${error}`);
    });
  });

  return errorMessages.join('\n');
}

/**
 * Display validation errors as toast notifications
 * Requirements: 2.4, 11.5
 */
export function showValidationErrors(validation: ValidationResult, context = 'Character'): void {
  if (validation.valid) {
    return;
  }

  const errorMessage = formatValidationErrors(validation);
  
  toast.error(
    `${context} Validation Failed`,
    errorMessage,
    7000 // Show for 7 seconds
  );

  // Log detailed errors for debugging
  console.error('Validation errors:', validation.errors);
}

/**
 * Handle character operation errors
 */
export function handleCharacterError(error: unknown, operation: string): void {
  console.error(`Character ${operation} error:`, error);

  if (error instanceof CharacterError) {
    switch (error.type) {
      case CharacterErrorType.VALIDATION_ERROR:
        toast.error(
          'Validation Error',
          error.message,
          7000
        );
        break;

      case CharacterErrorType.NOT_FOUND:
        toast.error(
          'Character Not Found',
          error.message,
          5000
        );
        break;

      case CharacterErrorType.DUPLICATE_ID:
        toast.error(
          'Duplicate Character',
          error.message,
          5000
        );
        break;

      case CharacterErrorType.PERSISTENCE_ERROR:
        toast.error(
          'Save Error',
          error.message,
          7000
        );
        break;

      case CharacterErrorType.RELATIONSHIP_ERROR:
        toast.error(
          'Relationship Error',
          error.message,
          7000
        );
        break;

      case CharacterErrorType.DEPENDENCY_ERROR:
        toast.warning(
          'Character In Use',
          error.message,
          7000
        );
        break;

      default:
        toast.error(
          'Operation Failed',
          error.message,
          5000
        );
    }
  } else if (error instanceof Error) {
    // Generic error
    toast.error(
      `${operation} Failed`,
      error.message,
      5000
    );
  } else {
    // Unknown error
    toast.error(
      `${operation} Failed`,
      'An unexpected error occurred. Please try again.',
      5000
    );
  }
}

/**
 * Log validation failure for debugging
 * Requirements: 2.4
 */
export function logValidationFailure(
  characterId: string,
  characterName: string,
  validation: ValidationResult
): void {
  console.group(`Validation Failed: ${characterName} (${characterId})`);
  console.error('Validation errors:', validation.errors);
  console.groupEnd();
}

/**
 * Create a user-friendly error message from validation result
 */
export function createValidationErrorMessage(validation: ValidationResult): string {
  if (validation.valid) {
    return '';
  }

  const errorCount = Object.keys(validation.errors).length;
  const firstError = Object.entries(validation.errors)[0];
  
  if (errorCount === 1 && firstError[1].length === 1) {
    // Single error - show it directly
    return firstError[1][0];
  } else if (errorCount === 1) {
    // Multiple errors for one field
    return `${firstError[0]}: ${firstError[1].join(', ')}`;
  } else {
    // Multiple fields with errors
    return `${errorCount} validation errors found. Please check all required fields.`;
  }
}
