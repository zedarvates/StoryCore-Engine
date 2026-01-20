/**
 * Tests for prompt analysis utilities
 * Requirements: 6.1, 6.2
 */

import { describe, it, expect } from 'vitest';
import {
  analyzeProjectPrompts,
  generatePromptSuggestions,
  getShotsWithMissingPrompts,
  getShotsWithValidPrompts,
  getPromptCompletionPercentage,
} from '../promptAnalysis';
import type { Project, Shot } from '../../types/projectDashboard';

// ============================================================================
// Test Helpers
// ============================================================================

function createMockProject(shots: Shot[]): Project {
  return {
    id: 'test-project',
    name: 'Test Project',
    schemaVersion: '1.0',
    sequences: [],
    shots,
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
}

function createMockShot(id: string, prompt: string): Shot {
  return {
    id,
    sequenceId: 'seq-1',
    startTime: 0,
    duration: 5,
    prompt,
    metadata: {},
  };
}

// ============================================================================
// Tests
// ============================================================================

describe('analyzeProjectPrompts', () => {
  it('should correctly count complete and incomplete prompts', () => {
    const shots: Shot[] = [
      createMockShot('shot-1', 'A valid prompt with enough characters'),
      createMockShot('shot-2', ''),
      createMockShot('shot-3', 'Another valid prompt here'),
      createMockShot('shot-4', 'Short'),
    ];

    const project = createMockProject(shots);
    const analysis = analyzeProjectPrompts(project);

    expect(analysis.totalShots).toBe(4);
    expect(analysis.completePrompts).toBe(2);
    expect(analysis.incompletePrompts).toBe(2);
  });

  it('should identify shots with missing prompts', () => {
    const shots: Shot[] = [
      createMockShot('shot-1', ''),
      createMockShot('shot-2', '   '),
      createMockShot('shot-3', 'Valid prompt with enough characters'),
    ];

    const project = createMockProject(shots);
    const analysis = analyzeProjectPrompts(project);

    const shotsWithIssues = analysis.shotAnalyses.filter(sa => !sa.isValid);
    expect(shotsWithIssues).toHaveLength(2);
    expect(shotsWithIssues[0].shot.id).toBe('shot-1');
    expect(shotsWithIssues[1].shot.id).toBe('shot-2');
  });

  it('should provide suggestions for incomplete prompts', () => {
    const shots: Shot[] = [
      createMockShot('shot-1', ''),
      createMockShot('shot-2', 'Short'),
    ];

    const project = createMockProject(shots);
    const analysis = analyzeProjectPrompts(project);

    expect(analysis.shotAnalyses[0].suggestions.length).toBeGreaterThan(0);
    expect(analysis.shotAnalyses[1].suggestions.length).toBeGreaterThan(0);
  });

  it('should handle empty project', () => {
    const project = createMockProject([]);
    const analysis = analyzeProjectPrompts(project);

    expect(analysis.totalShots).toBe(0);
    expect(analysis.completePrompts).toBe(0);
    expect(analysis.incompletePrompts).toBe(0);
  });

  it('should provide overall suggestions when there are issues', () => {
    const shots: Shot[] = [
      createMockShot('shot-1', ''),
      createMockShot('shot-2', 'Valid prompt with enough characters'),
    ];

    const project = createMockProject(shots);
    const analysis = analyzeProjectPrompts(project);

    expect(analysis.overallSuggestions.length).toBeGreaterThan(0);
  });
});

describe('generatePromptSuggestions', () => {
  it('should provide basic suggestions for empty prompts', () => {
    const shot = createMockShot('shot-1', '');
    const suggestions = generatePromptSuggestions(shot);

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.toLowerCase().includes('subject'))).toBe(true);
  });

  it('should suggest more detail for short prompts', () => {
    const shot = createMockShot('shot-1', 'A short prompt');
    const suggestions = generatePromptSuggestions(shot);

    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('should provide context-based suggestions when previous shot is provided', () => {
    const shot = createMockShot('shot-1', '');
    const previousShot = createMockShot('shot-0', 'A cinematic wide shot of a forest');

    const suggestions = generatePromptSuggestions(shot, { previousShot });

    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.toLowerCase().includes('previous'))).toBe(true);
  });

  it('should suggest camera angle if not specified', () => {
    const shot = createMockShot('shot-1', 'A person walking');
    const suggestions = generatePromptSuggestions(shot);

    expect(suggestions.some(s => s.toLowerCase().includes('camera'))).toBe(true);
  });
});

describe('getShotsWithMissingPrompts', () => {
  it('should return only shots with invalid prompts', () => {
    const shots: Shot[] = [
      createMockShot('shot-1', 'Valid prompt with enough characters'),
      createMockShot('shot-2', ''),
      createMockShot('shot-3', 'Another valid prompt here'),
      createMockShot('shot-4', 'Short'),
    ];

    const project = createMockProject(shots);
    const missingShots = getShotsWithMissingPrompts(project);

    expect(missingShots).toHaveLength(2);
    expect(missingShots[0].id).toBe('shot-2');
    expect(missingShots[1].id).toBe('shot-4');
  });

  it('should return empty array when all prompts are valid', () => {
    const shots: Shot[] = [
      createMockShot('shot-1', 'Valid prompt with enough characters'),
      createMockShot('shot-2', 'Another valid prompt here'),
    ];

    const project = createMockProject(shots);
    const missingShots = getShotsWithMissingPrompts(project);

    expect(missingShots).toHaveLength(0);
  });
});

describe('getShotsWithValidPrompts', () => {
  it('should return only shots with valid prompts', () => {
    const shots: Shot[] = [
      createMockShot('shot-1', 'Valid prompt with enough characters'),
      createMockShot('shot-2', ''),
      createMockShot('shot-3', 'Another valid prompt here'),
    ];

    const project = createMockProject(shots);
    const validShots = getShotsWithValidPrompts(project);

    expect(validShots).toHaveLength(2);
    expect(validShots[0].id).toBe('shot-1');
    expect(validShots[1].id).toBe('shot-3');
  });
});

describe('getPromptCompletionPercentage', () => {
  it('should calculate correct completion percentage', () => {
    const shots: Shot[] = [
      createMockShot('shot-1', 'Valid prompt with enough characters'),
      createMockShot('shot-2', ''),
      createMockShot('shot-3', 'Another valid prompt here'),
      createMockShot('shot-4', 'Short'),
    ];

    const project = createMockProject(shots);
    const percentage = getPromptCompletionPercentage(project);

    expect(percentage).toBe(50); // 2 out of 4 valid
  });

  it('should return 100 for empty project', () => {
    const project = createMockProject([]);
    const percentage = getPromptCompletionPercentage(project);

    expect(percentage).toBe(100);
  });

  it('should return 100 when all prompts are valid', () => {
    const shots: Shot[] = [
      createMockShot('shot-1', 'Valid prompt with enough characters'),
      createMockShot('shot-2', 'Another valid prompt here'),
    ];

    const project = createMockProject(shots);
    const percentage = getPromptCompletionPercentage(project);

    expect(percentage).toBe(100);
  });

  it('should return 0 when no prompts are valid', () => {
    const shots: Shot[] = [
      createMockShot('shot-1', ''),
      createMockShot('shot-2', 'Short'),
    ];

    const project = createMockProject(shots);
    const percentage = getPromptCompletionPercentage(project);

    expect(percentage).toBe(0);
  });
});
