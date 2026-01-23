/**
 * useModalValidation Hook
 *
 * Provides unified validation logic for modal forms based on schema configuration.
 * Supports built-in validation rules and custom validation functions.
 */

import { useCallback } from 'react';
import type { ModalSchema, ValidationRule, ValidationResult, ValidationContext } from '@/types/modal';

/**
 * Built-in validation functions
 */
const validationRules = {
  required: (value: unknown): boolean => {
    if (typeof value === 'string') return value.trim().length > 0;
    if (typeof value === 'number') return !isNaN(value);
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined;
  },

  minLength: (value: unknown, length: number): boolean => {
    if (typeof value === 'string') return value.length >= length;
    if (Array.isArray(value)) return value.length >= length;
    return false;
  },

  maxLength: (value: unknown, length: number): boolean => {
    if (typeof value === 'string') return value.length <= length;
    if (Array.isArray(value)) return value.length <= length;
    return false;
  },

  pattern: (value: unknown, pattern: string): boolean => {
    if (typeof value !== 'string') return false;
    const regex = new RegExp(pattern);
    return regex.test(value);
  },

  email: (value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },

  url: (value: unknown): boolean => {
    if (typeof value !== 'string') return false;
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  custom: (value: unknown, validator: (value: unknown) => boolean): boolean => {
    return validator(value);
  },
};

/**
 * Validate a single field
 */
function validateField(
  field: ModalSchema['fields'][0],
  value: unknown,
  context: ValidationContext
): string | null {
  // Check required validation first
  if (field.required && !validationRules.required(value)) {
    return 'Ce champ est requis';
  }

  // Skip other validations if field is empty and not required
  if (!validationRules.required(value) && !field.required) {
    return null;
  }

  // Apply field-specific validation rules
  if (field.validation) {
    for (const rule of field.validation) {
      const validator = validationRules[rule.type];

      if (!validator) {
        continue; // Unknown validation rule
      }

      let isValid: boolean;

      switch (rule.type) {
        case 'custom':
          isValid = validator(value, rule.value as (value: unknown) => boolean);
          break;
        case 'minLength':
        case 'maxLength':
          isValid = validator(value, rule.value as number);
          break;
        case 'pattern':
          isValid = validator(value, rule.value as string);
          break;
        default:
          isValid = validator(value);
      }

      if (!isValid) {
        return rule.message;
      }
    }
  }

  return null; // No errors
}

/**
 * Hook for form validation
 */
export function useModalValidation(schema: ModalSchema) {
  /**
   * Validate entire form
   */
  const validate = useCallback((data: Record<string, unknown>): ValidationResult => {
    const errors: Record<string, string> = {};
    let isValid = true;

    const context: ValidationContext = {
      data,
      schema,
    };

    for (const field of schema.fields) {
      const error = validateField(field, data[field.id], { ...context, field });

      if (error) {
        errors[field.id] = error;
        isValid = false;
      }
    }

    return { isValid, errors };
  }, [schema]);

  /**
   * Validate single field
   */
  const validateFieldById = useCallback((fieldId: string, value: unknown, data: Record<string, unknown>): string | null => {
    const field = schema.fields.find(f => f.id === fieldId);

    if (!field) {
      return null;
    }

    const context: ValidationContext = {
      data,
      field,
      schema,
    };

    return validateField(field, value, context);
  }, [schema]);

  /**
   * Get validation summary
   */
  const getValidationSummary = useCallback((errors: Record<string, string>): { count: number; fields: string[] } => {
    const fields = Object.keys(errors);
    return {
      count: fields.length,
      fields,
    };
  }, []);

  return {
    validate,
    validateField: validateFieldById,
    getValidationSummary,
  };
}
