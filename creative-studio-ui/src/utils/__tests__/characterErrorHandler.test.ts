// ============================================================================
// Character Error Handler Tests
// ============================================================================
// Tests for character error handling utilities
// ============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  CharacterError,
  CharacterErrorType,
  formatValidationErrors,
  createValidationErrorMessage,
} from '../characterErrorHandler';
import type { ValidationResult } from '../../hooks/useCharacterManager';

describe('CharacterError', () => {
  it('should create a CharacterError with type and message', () => {
    const error = new CharacterError(
      CharacterErrorType.VALIDATION_ERROR,
      'Test error message',
      { field: 'name' }
    );

    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('CharacterError');
    expect(error.type).toBe(CharacterErrorType.VALIDATION_ERROR);
    expect(error.message).toBe('Test error message');
    expect(error.details).toEqual({ field: 'name' });
  });
});

describe('formatValidationErrors', () => {
  it('should return empty string for valid validation result', () => {
    const validation: ValidationResult = {
      valid: true,
      errors: {},
    };

    const result = formatValidationErrors(validation);
    expect(result).toBe('');
  });

  it('should format single field error', () => {
    const validation: ValidationResult = {
      valid: false,
      errors: {
        name: ['Name is required'],
      },
    };

    const result = formatValidationErrors(validation);
    expect(result).toBe('Name: Name is required');
  });

  it('should format multiple field errors', () => {
    const validation: ValidationResult = {
      valid: false,
      errors: {
        name: ['Name is required'],
        archetype: ['Archetype must be selected'],
      },
    };

    const result = formatValidationErrors(validation);
    expect(result).toContain('Name: Name is required');
    expect(result).toContain('Archetype: Archetype must be selected');
  });

  it('should format multiple errors for same field', () => {
    const validation: ValidationResult = {
      valid: false,
      errors: {
        name: ['Name is required', 'Name must be at least 2 characters'],
      },
    };

    const result = formatValidationErrors(validation);
    expect(result).toContain('Name: Name is required');
    expect(result).toContain('Name: Name must be at least 2 characters');
  });

  it('should capitalize field names', () => {
    const validation: ValidationResult = {
      valid: false,
      errors: {
        age_range: ['Age range is required'],
      },
    };

    const result = formatValidationErrors(validation);
    expect(result).toContain('Age Range:');
  });
});

describe('createValidationErrorMessage', () => {
  it('should return empty string for valid validation result', () => {
    const validation: ValidationResult = {
      valid: true,
      errors: {},
    };

    const result = createValidationErrorMessage(validation);
    expect(result).toBe('');
  });

  it('should return single error message for single error', () => {
    const validation: ValidationResult = {
      valid: false,
      errors: {
        name: ['Name is required'],
      },
    };

    const result = createValidationErrorMessage(validation);
    expect(result).toBe('Name is required');
  });

  it('should return field and errors for multiple errors on one field', () => {
    const validation: ValidationResult = {
      valid: false,
      errors: {
        name: ['Name is required', 'Name must be at least 2 characters'],
      },
    };

    const result = createValidationErrorMessage(validation);
    expect(result).toContain('name:');
    expect(result).toContain('Name is required');
    expect(result).toContain('Name must be at least 2 characters');
  });

  it('should return count message for multiple fields with errors', () => {
    const validation: ValidationResult = {
      valid: false,
      errors: {
        name: ['Name is required'],
        archetype: ['Archetype must be selected'],
        age_range: ['Age range is required'],
      },
    };

    const result = createValidationErrorMessage(validation);
    expect(result).toContain('3 validation errors found');
  });
});
