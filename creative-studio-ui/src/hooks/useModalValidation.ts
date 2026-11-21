/**
 * useModalValidation Hook
 *
 * Provides unified validation logic for modal forms based on schema configuration.
 * Supports built-in validation rules and custom validation functions.
 */

import { useCallback } from 'react';
import type { ModalSchema, ValidationResult, ValidationContext } from '@/types/modal';

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

};

/**
 * Validate a single field
 */
function validateField(
  field: ModalSchema['fields'][0],
  value: unknown,
  context: ValidationContext
): string | null {
  const hasValue = validationRules.required(value);
  if (field.required && !hasValue) {
    return 'Ce champ est requis';
  }

  if (field.validation) {
    for (const rule of field.validation) {
      if (!hasValue && rule.type !== 'required' && rule.type !== 'custom') continue;

      let isValid: boolean;
      switch (rule.type) {
        case 'custom':
          isValid = typeof rule.value === 'function' && rule.value(value, context);
          break;
        case 'minLength':
        case 'maxLength':
          isValid = typeof rule.value === 'number' && validationRules[rule.type](value, rule.value);
          break;
        case 'pattern':
          isValid = typeof rule.value === 'string' && validationRules.pattern(value, rule.value);
          break;
        case 'required':
        case 'email':
        case 'url':
          isValid = validationRules[rule.type](value);
          break;
        default:
          continue;
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
