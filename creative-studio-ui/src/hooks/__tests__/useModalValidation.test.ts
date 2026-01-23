/**
 * Tests for useModalValidation hook
 */

import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useModalValidation } from '../useModalValidation';
import type { ModalSchema } from '@/types/modal';

const mockSchema: ModalSchema = {
  id: 'test-validation',
  title: 'Test Validation',
  fields: [
    {
      id: 'name',
      label: 'Name',
      type: 'text',
      required: true,
      validation: [
        { type: 'required', message: 'Name is required' },
        { type: 'minLength', value: 2, message: 'Name must be at least 2 characters' },
        { type: 'maxLength', value: 50, message: 'Name must be at most 50 characters' },
      ],
    },
    {
      id: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      validation: [
        { type: 'required', message: 'Email is required' },
        { type: 'email', message: 'Invalid email format' },
      ],
    },
    {
      id: 'age',
      label: 'Age',
      type: 'number',
      validation: [
        { type: 'minLength', value: 0, message: 'Age must be positive' },
        { type: 'maxLength', value: 150, message: 'Age must be reasonable' },
      ],
    },
    {
      id: 'optional',
      label: 'Optional',
      type: 'text',
    },
  ],
};

describe('useModalValidation', () => {
  const { result } = renderHook(() => useModalValidation(mockSchema));
  const { validate, validateField, getValidationSummary } = result.current;

  describe('validate', () => {
    it('should pass validation for valid data', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        age: 25,
        optional: '',
      };

      const result = validate(data);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it('should fail validation for missing required fields', () => {
      const data = {
        name: '',
        email: '',
        age: 25,
        optional: '',
      };

      const result = validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('Name is required');
      expect(result.errors.email).toBe('Email is required');
    });

    it('should fail validation for invalid email', () => {
      const data = {
        name: 'John',
        email: 'invalid-email',
        age: 25,
        optional: '',
      };

      const result = validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.email).toBe('Invalid email format');
    });

    it('should fail validation for name too short', () => {
      const data = {
        name: 'J',
        email: 'john@example.com',
        age: 25,
        optional: '',
      };

      const result = validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('Name must be at least 2 characters');
    });

    it('should fail validation for name too long', () => {
      const data = {
        name: 'a'.repeat(51),
        email: 'john@example.com',
        age: 25,
        optional: '',
      };

      const result = validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.name).toBe('Name must be at most 50 characters');
    });

    it('should fail validation for age out of range', () => {
      const data = {
        name: 'John',
        email: 'john@example.com',
        age: 200,
        optional: '',
      };

      const result = validate(data);

      expect(result.isValid).toBe(false);
      expect(result.errors.age).toBe('Age must be reasonable');
    });

    it('should pass validation for empty optional fields', () => {
      const data = {
        name: 'John',
        email: 'john@example.com',
        age: 25,
        optional: '',
      };

      const result = validate(data);

      expect(result.isValid).toBe(true);
    });
  });

  describe('validateField', () => {
    it('should validate single field correctly', () => {
      const error = validateField('name', 'J', {
        name: 'J',
        email: 'john@example.com',
        age: 25,
        optional: '',
      });

      expect(error).toBe('Name must be at least 2 characters');
    });

    it('should return null for valid field', () => {
      const error = validateField('name', 'John', {
        name: 'John',
        email: 'john@example.com',
        age: 25,
        optional: '',
      });

      expect(error).toBeNull();
    });

    it('should return null for non-existent field', () => {
      const error = validateField('nonexistent', 'value', {});

      expect(error).toBeNull();
    });
  });

  describe('getValidationSummary', () => {
    it('should return correct summary for errors', () => {
      const errors = {
        name: 'Required',
        email: 'Invalid',
        age: 'Out of range',
      };

      const summary = getValidationSummary(errors);

      expect(summary.count).toBe(3);
      expect(summary.fields).toEqual(['name', 'email', 'age']);
    });

    it('should return empty summary for no errors', () => {
      const summary = getValidationSummary({});

      expect(summary.count).toBe(0);
      expect(summary.fields).toEqual([]);
    });
  });
});
