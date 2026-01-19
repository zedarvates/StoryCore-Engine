/**
 * useFormValidation Hook
 * 
 * Custom hook for managing form validation state
 */

import { useState, useCallback, useMemo } from 'react';

export interface ValidationRule<T = any> {
  field: keyof T;
  validate: (value: any, formData: T) => string | null;
  message?: string;
}

export interface UseFormValidationResult<T> {
  errors: Partial<Record<keyof T, string>>;
  isValid: boolean;
  validationErrors: string[];
  validate: (formData: T) => boolean;
  validateField: (field: keyof T, value: any, formData: T) => string | null;
  clearErrors: () => void;
  clearFieldError: (field: keyof T) => void;
  setFieldError: (field: keyof T, error: string) => void;
}

export function useFormValidation<T extends Record<string, any>>(
  rules: ValidationRule<T>[]
): UseFormValidationResult<T> {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const validateField = useCallback(
    (field: keyof T, value: any, formData: T): string | null => {
      const fieldRules = rules.filter(rule => rule.field === field);
      
      for (const rule of fieldRules) {
        const error = rule.validate(value, formData);
        if (error) {
          return error;
        }
      }
      
      return null;
    },
    [rules]
  );

  const validate = useCallback(
    (formData: T): boolean => {
      const newErrors: Partial<Record<keyof T, string>> = {};
      let hasErrors = false;

      for (const rule of rules) {
        const value = formData[rule.field];
        const error = rule.validate(value, formData);
        
        if (error) {
          newErrors[rule.field] = error;
          hasErrors = true;
        }
      }

      setErrors(newErrors);
      return !hasErrors;
    },
    [rules]
  );

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const clearFieldError = useCallback((field: keyof T) => {
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setErrors(prev => ({
      ...prev,
      [field]: error,
    }));
  }, []);

  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  const validationErrors = useMemo(() => {
    return Object.values(errors).filter((error): error is string => error !== undefined);
  }, [errors]);

  return {
    errors,
    isValid,
    validationErrors,
    validate,
    validateField,
    clearErrors,
    clearFieldError,
    setFieldError,
  };
}

/**
 * Common validation rules
 */
export const ValidationRules = {
  required: (message = 'This field is required') => (value: any) => {
    if (value === null || value === undefined || value === '') {
      return message;
    }
    return null;
  },

  url: (message = 'Please enter a valid URL') => (value: string) => {
    if (!value) return null;
    
    try {
      new URL(value);
      return null;
    } catch {
      return message;
    }
  },

  minLength: (min: number, message?: string) => (value: string) => {
    if (!value) return null;
    
    if (value.length < min) {
      return message || `Must be at least ${min} characters`;
    }
    return null;
  },

  maxLength: (max: number, message?: string) => (value: string) => {
    if (!value) return null;
    
    if (value.length > max) {
      return message || `Must be at most ${max} characters`;
    }
    return null;
  },

  pattern: (regex: RegExp, message = 'Invalid format') => (value: string) => {
    if (!value) return null;
    
    if (!regex.test(value)) {
      return message;
    }
    return null;
  },

  number: (message = 'Must be a valid number') => (value: any) => {
    if (value === null || value === undefined || value === '') return null;
    
    if (isNaN(Number(value))) {
      return message;
    }
    return null;
  },

  min: (min: number, message?: string) => (value: number) => {
    if (value === null || value === undefined) return null;
    
    if (value < min) {
      return message || `Must be at least ${min}`;
    }
    return null;
  },

  max: (max: number, message?: string) => (value: number) => {
    if (value === null || value === undefined) return null;
    
    if (value > max) {
      return message || `Must be at most ${max}`;
    }
    return null;
  },

  email: (message = 'Please enter a valid email address') => (value: string) => {
    if (!value) return null;
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return message;
    }
    return null;
  },

  custom: <T = any>(validator: (value: any, formData: T) => boolean, message: string) => 
    (value: any, formData: T) => {
      if (!validator(value, formData)) {
        return message;
      }
      return null;
    },
};
