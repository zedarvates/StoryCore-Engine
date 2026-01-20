/**
 * Unit Tests: Prompt Validation Logic
 * Tests the validatePrompt function for ProjectDashboardNew
 * Requirements: 1.3, 2.1, 2.2
 */

import { describe, it, expect } from 'vitest';
import {
  validatePrompt,
  isPromptValid,
  getValidationErrorMessage,
  getAllValidationErrors,
  getAllValidationWarnings,
} from '../utils/promptValidation';

describe('Prompt Validation - validatePrompt function', () => {
  describe('Empty and Whitespace Validation (Requirement 2.2)', () => {
    it('should reject empty string', () => {
      const result = validatePrompt('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('empty');
      expect(result.errors[0].message).toBe('Prompt cannot be empty');
      expect(result.errors[0].field).toBe('prompt');
    });

    it('should reject whitespace-only string (spaces)', () => {
      const result = validatePrompt('   ');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('empty');
      expect(result.errors[0].message).toBe('Prompt cannot contain only whitespace');
      expect(result.errors[0].field).toBe('prompt');
    });

    it('should reject whitespace-only string (tabs)', () => {
      const result = validatePrompt('\t\t\t');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('empty');
    });

    it('should reject whitespace-only string (newlines)', () => {
      const result = validatePrompt('\n\n\n');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('empty');
    });

    it('should reject whitespace-only string (mixed)', () => {
      const result = validatePrompt('  \t\n  \t  ');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('empty');
    });
  });

  describe('Length Validation (Requirement 2.1)', () => {
    describe('Too Short - Below 10 characters', () => {
      it('should reject prompt with 9 characters', () => {
        const result = validatePrompt('123456789'); // 9 chars
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe('too_short');
        expect(result.errors[0].message).toContain('9 characters');
        expect(result.errors[0].message).toContain('Minimum length is 10 characters');
      });

      it('should reject prompt with 5 characters', () => {
        const result = validatePrompt('Hello');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe('too_short');
      });

      it('should reject prompt with 1 character', () => {
        const result = validatePrompt('A');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe('too_short');
      });

      it('should include suggestion for too short prompts', () => {
        const result = validatePrompt('Short');
        
        expect(result.suggestions).toHaveLength(1);
        expect(result.suggestions[0]).toContain('Add more descriptive details');
        expect(result.suggestions[0]).toContain('minimum length of 10 characters');
      });
    });

    describe('Valid Length - Between 10 and 500 characters', () => {
      it('should accept prompt with exactly 10 characters', () => {
        const result = validatePrompt('1234567890'); // 10 chars
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept prompt with exactly 500 characters', () => {
        const prompt = 'A'.repeat(500); // 500 chars
        const result = validatePrompt(prompt);
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept prompt with 50 characters', () => {
        const result = validatePrompt('A cinematic shot of a sunset over the mountains.');
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });

      it('should accept prompt with 250 characters', () => {
        const prompt = 'A'.repeat(250);
        const result = validatePrompt(prompt);
        
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    describe('Too Long - Above 500 characters', () => {
      it('should reject prompt with 501 characters', () => {
        const prompt = 'A'.repeat(501); // 501 chars
        const result = validatePrompt(prompt);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe('too_long');
        expect(result.errors[0].message).toContain('501 characters');
        expect(result.errors[0].message).toContain('Maximum length is 500 characters');
      });

      it('should reject prompt with 1000 characters', () => {
        const prompt = 'A'.repeat(1000);
        const result = validatePrompt(prompt);
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].type).toBe('too_long');
      });

      it('should include suggestion for too long prompts', () => {
        const prompt = 'A'.repeat(600);
        const result = validatePrompt(prompt);
        
        expect(result.suggestions).toHaveLength(1);
        expect(result.suggestions[0]).toContain('Shorten your prompt');
        expect(result.suggestions[0]).toContain('500 characters or less');
      });
    });
  });

  describe('Trimming Behavior', () => {
    it('should trim leading whitespace before validation', () => {
      const result = validatePrompt('   Valid prompt here');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should trim trailing whitespace before validation', () => {
      const result = validatePrompt('Valid prompt here   ');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should trim both leading and trailing whitespace', () => {
      const result = validatePrompt('   Valid prompt here   ');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should count trimmed length for validation', () => {
      // 5 chars + 10 spaces = 15 total, but only 5 after trim
      const result = validatePrompt('     Hello     ');
      
      expect(result.isValid).toBe(false);
      expect(result.errors[0].type).toBe('too_short');
    });

    it('should accept prompt at boundary after trimming', () => {
      // 10 chars with surrounding spaces
      const result = validatePrompt('   1234567890   ');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Warnings for Valid but Suboptimal Prompts', () => {
    it('should warn when prompt is very short (10-19 chars)', () => {
      const result = validatePrompt('Short text'); // 10 chars
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('vague');
      expect(result.warnings[0].message).toContain('quite short');
      expect(result.warnings[0].suggestion).toContain('Include details');
    });

    it('should not warn when prompt is 20+ characters', () => {
      const result = validatePrompt('A valid prompt with enough detail');
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn when prompt is very long (401-500 chars)', () => {
      const prompt = 'A'.repeat(450); // 450 chars
      const result = validatePrompt(prompt);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe('missing_detail');
      expect(result.warnings[0].message).toContain('quite long');
      expect(result.warnings[0].suggestion).toContain('concise');
    });

    it('should not warn when prompt is 400 characters or less', () => {
      const prompt = 'A'.repeat(400);
      const result = validatePrompt(prompt);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('Special Characters and Unicode', () => {
    it('should accept prompt with special characters', () => {
      const result = validatePrompt('A shot with "quotes" and (parentheses)!');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept prompt with unicode characters', () => {
      const result = validatePrompt('A cinematic shot with émotions and 日本語');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept prompt with emojis', () => {
      const result = validatePrompt('A happy scene 😊 with sunshine ☀️');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept prompt with numbers', () => {
      const result = validatePrompt('Scene 123 with 456 characters in frame');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Validation Result Structure', () => {
    it('should return all required fields', () => {
      const result = validatePrompt('Valid prompt');
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('suggestions');
      expect(Array.isArray(result.errors)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should have empty arrays when valid with no warnings', () => {
      const result = validatePrompt('A valid prompt with sufficient detail');
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
      expect(result.suggestions).toHaveLength(0);
    });

    it('should populate errors array when invalid', () => {
      const result = validatePrompt('');
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toHaveProperty('type');
      expect(result.errors[0]).toHaveProperty('message');
      expect(result.errors[0]).toHaveProperty('field');
    });
  });
});

describe('Prompt Validation - Helper Functions', () => {
  describe('isPromptValid', () => {
    it('should return true for valid prompt', () => {
      expect(isPromptValid('A valid prompt')).toBe(true);
    });

    it('should return false for invalid prompt', () => {
      expect(isPromptValid('')).toBe(false);
      expect(isPromptValid('Short')).toBe(false);
      expect(isPromptValid('A'.repeat(501))).toBe(false);
    });
  });

  describe('getValidationErrorMessage', () => {
    it('should return first error message when errors exist', () => {
      const validation = validatePrompt('');
      const message = getValidationErrorMessage(validation);
      
      expect(message).toBe('Prompt cannot be empty');
    });

    it('should return null when no errors', () => {
      const validation = validatePrompt('Valid prompt');
      const message = getValidationErrorMessage(validation);
      
      expect(message).toBeNull();
    });
  });

  describe('getAllValidationErrors', () => {
    it('should return array of error messages', () => {
      const validation = validatePrompt('');
      const errors = getAllValidationErrors(validation);
      
      expect(Array.isArray(errors)).toBe(true);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toBe('Prompt cannot be empty');
    });

    it('should return empty array when no errors', () => {
      const validation = validatePrompt('Valid prompt');
      const errors = getAllValidationErrors(validation);
      
      expect(errors).toHaveLength(0);
    });
  });

  describe('getAllValidationWarnings', () => {
    it('should return array of warning messages', () => {
      const validation = validatePrompt('Short text'); // Will trigger warning
      const warnings = getAllValidationWarnings(validation);
      
      expect(Array.isArray(warnings)).toBe(true);
      expect(warnings.length).toBeGreaterThan(0);
    });

    it('should return empty array when no warnings', () => {
      const validation = validatePrompt('A valid prompt with sufficient detail');
      const warnings = getAllValidationWarnings(validation);
      
      expect(warnings).toHaveLength(0);
    });
  });
});

describe('Edge Cases and Boundary Conditions', () => {
  it('should handle very long whitespace strings', () => {
    const result = validatePrompt(' '.repeat(1000));
    
    expect(result.isValid).toBe(false);
    expect(result.errors[0].type).toBe('empty');
  });

  it('should handle prompt at exact boundary (10 chars) with whitespace', () => {
    const result = validatePrompt('  1234567890  '); // 10 chars after trim
    
    expect(result.isValid).toBe(true);
  });

  it('should handle prompt at exact boundary (500 chars) with whitespace', () => {
    const prompt = '  ' + 'A'.repeat(500) + '  '; // 500 chars after trim
    const result = validatePrompt(prompt);
    
    expect(result.isValid).toBe(true);
  });

  it('should handle newlines and tabs in content', () => {
    const result = validatePrompt('A prompt\nwith\nnewlines\nand\ttabs');
    
    expect(result.isValid).toBe(true);
  });

  it('should handle mixed valid and invalid scenarios', () => {
    // Test that only one error is reported at a time
    const result = validatePrompt(''); // Empty
    
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].type).toBe('empty');
  });
});
