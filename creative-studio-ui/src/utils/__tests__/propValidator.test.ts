/**
 * Prop Validator Tests
 */

import { describe, it, expect } from 'vitest';
import {
  validateRequired,
  validateFunction,
  validateString,
  validateArray,
  validateNonEmptyArray,
  validateReactNode,
} from '../propValidator';

describe('propValidator', () => {
  describe('validateRequired', () => {
    it('should return value if not null or undefined', () => {
      const value = 'test';
      expect(validateRequired(value, 'test')).toBe('test');
    });

    it('should throw error if value is null', () => {
      expect(() => validateRequired(null, 'test')).toThrow();
    });

    it('should throw error if value is undefined', () => {
      expect(() => validateRequired(undefined, 'test')).toThrow();
    });
  });

  describe('validateFunction', () => {
    it('should return function if valid', () => {
      const fn = () => {};
      expect(validateFunction(fn, 'test')).toBe(fn);
    });

    it('should throw error if not a function', () => {
      expect(() => validateFunction('not a function', 'test')).toThrow();
    });
  });

  describe('validateString', () => {
    it('should return string if valid', () => {
      const str = 'test';
      expect(validateString(str, 'test')).toBe('test');
    });

    it('should throw error if not a string', () => {
      expect(() => validateString(123, 'test')).toThrow();
    });
  });

  describe('validateArray', () => {
    it('should return array if valid', () => {
      const arr = [1, 2, 3];
      expect(validateArray(arr, 'test')).toBe(arr);
    });

    it('should throw error if not an array', () => {
      expect(() => validateArray('not an array', 'test')).toThrow();
    });
  });

  describe('validateNonEmptyArray', () => {
    it('should return array if not empty', () => {
      const arr = [1, 2, 3];
      expect(validateNonEmptyArray(arr, 'test')).toBe(arr);
    });

    it('should throw error if array is empty', () => {
      expect(() => validateNonEmptyArray([], 'test')).toThrow();
    });
  });

  describe('validateReactNode', () => {
    it('should return value if not null or undefined', () => {
      const node = <div>test</div>;
      expect(validateReactNode(node, 'test')).toBe(node);
    });

    it('should throw error if null', () => {
      expect(() => validateReactNode(null, 'test')).toThrow();
    });

    it('should throw error if undefined', () => {
      expect(() => validateReactNode(undefined, 'test')).toThrow();
    });
  });
});
