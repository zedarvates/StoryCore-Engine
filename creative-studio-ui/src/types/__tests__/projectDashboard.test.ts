/**
 * Tests for ProjectDashboard type definitions and validation
 * Verifies that all data models are properly defined and schemas work correctly
 */

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  isValidPrompt,
  isDialoguePhraseValid,
  hasValidPrompts,
  VoiceParametersSchema,
  PromptValidationSchema,
  ShotSchema,
  DialoguePhraseSchema,
  ProjectSchema,
  type Shot,
  type DialoguePhrase,
  type VoiceParameters,
  type PromptValidation,
  type Project,
} from '../projectDashboard';

describe('ProjectDashboard Type Definitions', () => {
  describe('Type Guards', () => {
    it('should validate prompts correctly', () => {
      // Valid prompts
      expect(isValidPrompt('This is a valid prompt with enough characters')).toBe(true);
      expect(isValidPrompt('A'.repeat(10))).toBe(true);
      expect(isValidPrompt('A'.repeat(500))).toBe(true);

      // Invalid prompts
      expect(isValidPrompt('')).toBe(false);
      expect(isValidPrompt('   ')).toBe(false);
      expect(isValidPrompt('Too short')).toBe(false);
      expect(isValidPrompt('A'.repeat(9))).toBe(false);
      expect(isValidPrompt('A'.repeat(501))).toBe(false);
    });

    it('should validate dialogue phrases correctly', () => {
      const validPhrase: DialoguePhrase = {
        id: '1',
        shotId: 'shot-1',
        text: 'Hello world',
        startTime: 0,
        endTime: 5,
        metadata: {},
      };
      expect(isDialoguePhraseValid(validPhrase)).toBe(true);

      const invalidPhrase: DialoguePhrase = {
        id: '2',
        shotId: 'shot-1',
        text: 'Hello world',
        startTime: 5,
        endTime: 0, // endTime before startTime
        metadata: {},
      };
      expect(isDialoguePhraseValid(invalidPhrase)).toBe(false);

      const emptyTextPhrase: DialoguePhrase = {
        id: '3',
        shotId: 'shot-1',
        text: '   ', // whitespace only
        startTime: 0,
        endTime: 5,
        metadata: {},
      };
      expect(isDialoguePhraseValid(emptyTextPhrase)).toBe(false);
    });

    it('should validate all shots have valid prompts', () => {
      const validShots: Shot[] = [
        {
          id: '1',
          sequenceId: 'seq-1',
          startTime: 0,
          duration: 10,
          prompt: 'This is a valid prompt with enough characters',
          metadata: {},
          position: 0,
        },
        {
          id: '2',
          sequenceId: 'seq-1',
          startTime: 10,
          duration: 10,
          prompt: 'Another valid prompt with sufficient length',
          metadata: {},
          position: 1,
        },
      ];
      expect(hasValidPrompts(validShots)).toBe(true);

      const invalidShots: Shot[] = [
        {
          id: '1',
          sequenceId: 'seq-1',
          startTime: 0,
          duration: 10,
          prompt: 'This is a valid prompt with enough characters',
          metadata: {},
          position: 0,
        },
        {
          id: '2',
          sequenceId: 'seq-1',
          startTime: 10,
          duration: 10,
          prompt: 'Short', // too short
          metadata: {},
          position: 1,
        },
      ];
      expect(hasValidPrompts(invalidShots)).toBe(false);
    });
  });

  describe('Zod Schemas', () => {
    it('should validate VoiceParameters schema', () => {
      const validParams: VoiceParameters = {
        voiceType: 'male',
        speed: 1.0,
        pitch: 0,
        language: 'en',
      };
      expect(() => VoiceParametersSchema.parse(validParams)).not.toThrow();

      const invalidSpeed = { ...validParams, speed: 3.0 }; // too high
      expect(() => VoiceParametersSchema.parse(invalidSpeed)).toThrow();

      const invalidPitch = { ...validParams, pitch: 20 }; // too high
      expect(() => VoiceParametersSchema.parse(invalidPitch)).toThrow();
    });

    it('should validate PromptValidation schema', () => {
      const validValidation: PromptValidation = {
        isValid: true,
        errors: [],
        warnings: [],
        suggestions: ['Consider adding more detail'],
      };
      expect(() => PromptValidationSchema.parse(validValidation)).not.toThrow();
    });

    it('should validate Shot schema', () => {
      const validShot: Shot = {
        id: 'shot-1',
        sequenceId: 'seq-1',
        startTime: 0,
        duration: 10,
        prompt: 'A beautiful landscape with mountains',
        metadata: {
          cameraAngle: 'wide',
          lighting: 'natural',
          mood: 'peaceful',
        },
        position: 0,
      };
      expect(() => ShotSchema.parse(validShot)).not.toThrow();

      const invalidShot = { ...validShot, duration: -5 }; // negative duration
      expect(() => ShotSchema.parse(invalidShot)).toThrow();
    });

    it('should validate DialoguePhrase schema', () => {
      const validPhrase: DialoguePhrase = {
        id: 'phrase-1',
        shotId: 'shot-1',
        text: 'Hello world',
        startTime: 0,
        endTime: 5,
        metadata: {},
      };
      expect(() => DialoguePhraseSchema.parse(validPhrase)).not.toThrow();

      const invalidPhrase = { ...validPhrase, endTime: -1 }; // endTime before startTime
      expect(() => DialoguePhraseSchema.parse(invalidPhrase)).toThrow();
    });

    it('should validate Project schema', () => {
      const validProject: Project = {
        id: 'project-1',
        name: 'Test Project',
        schemaVersion: '1.0',
        sequences: [],
        shots: [],
        audioPhrases: [],
        generationHistory: [],
        capabilities: {
          gridGeneration: true,
          promotionEngine: true,
          qaEngine: true,
          autofixEngine: true,
          voiceGeneration: true,
        },
      };
      expect(() => ProjectSchema.parse(validProject)).not.toThrow();
    });
  });

  describe('Property-Based Tests Setup', () => {
    it('should verify fast-check is working', () => {
      fc.assert(
        fc.property(fc.integer(), (n) => {
          return n + 0 === n;
        }),
        { numRuns: 10 }
      );
    });

    it('should generate valid prompt strings', () => {
      const promptGenerator = fc.string({ minLength: 10, maxLength: 500 });

      fc.assert(
        fc.property(promptGenerator, (prompt) => {
          const isValid = isValidPrompt(prompt);
          const trimmed = prompt.trim();
          const expectedValid = trimmed.length >= 10 && trimmed.length <= 500;
          return isValid === expectedValid;
        }),
        { numRuns: 100 }
      );
    });
  });
});
