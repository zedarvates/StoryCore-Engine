/**
 * Unit tests for shot deletion functionality
 * 
 * Tests shot deletion logic, phrase handling, orphan detection,
 * and data integrity validation.
 * 
 * Requirements: 7.3
 */

import { describe, it, expect } from 'vitest';
import type { Project, Shot, DialoguePhrase } from '../types/projectDashboard';
import {
  validateShotDeletion,
  getAssociatedPhrases,
  detectOrphanedPhrases,
  validateNoOrphanedPhrases,
  simulateShotDeletion,
  getShotDeletionSummary,
  validateShotPhraseIntegrity,
} from '../utils/shotDeletion';

// ============================================================================
// Test Data Helpers
// ============================================================================

function createTestShot(id: string, startTime: number = 0, duration: number = 10): Shot {
  return {
    id,
    sequenceId: 'seq-1',
    startTime,
    duration,
    prompt: `Test prompt for ${id}`,
    metadata: {},
  };
}

function createTestPhrase(
  id: string,
  shotId: string,
  startTime: number = 0,
  endTime: number = 5
): DialoguePhrase {
  return {
    id,
    shotId,
    text: `Test phrase ${id}`,
    startTime,
    endTime,
    metadata: {},
  };
}

function createTestProject(
  shots: Shot[] = [],
  phrases: DialoguePhrase[] = []
): Project {
  return {
    id: 'test-project',
    name: 'Test Project',
    schemaVersion: '1.0',
    sequences: [
      {
        id: 'seq-1',
        name: 'Test Sequence',
        description: 'Test sequence',
        shotIds: shots.map(s => s.id),
        duration: 100,
      },
    ],
    shots,
    audioPhrases: phrases,
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

// ============================================================================
// Shot Deletion Validation Tests
// ============================================================================

describe('validateShotDeletion', () => {
  it('should allow deletion of shot without phrases', () => {
    const shot = createTestShot('shot-1');
    const project = createTestProject([shot], []);

    const result = validateShotDeletion('shot-1', project);

    expect(result.canDelete).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.associatedPhrases).toHaveLength(0);
  });

  it('should detect associated phrases', () => {
    const shot = createTestShot('shot-1');
    const phrase1 = createTestPhrase('phrase-1', 'shot-1');
    const phrase2 = createTestPhrase('phrase-2', 'shot-1');
    const project = createTestProject([shot], [phrase1, phrase2]);

    const result = validateShotDeletion('shot-1', project);

    expect(result.canDelete).toBe(true);
    expect(result.associatedPhrases).toHaveLength(2);
    expect(result.warnings).toContain('This shot has 2 associated dialogue phrases');
  });

  it('should detect affected sequences', () => {
    const shot = createTestShot('shot-1');
    const project = createTestProject([shot], []);

    const result = validateShotDeletion('shot-1', project);

    expect(result.canDelete).toBe(true);
    expect(result.affectedSequences).toContain('seq-1');
    expect(result.warnings.some(w => w.includes('sequence'))).toBe(true);
  });

  it('should return error for non-existent shot', () => {
    const project = createTestProject([], []);

    const result = validateShotDeletion('non-existent', project);

    expect(result.canDelete).toBe(false);
    expect(result.errors).toContain('Shot with id non-existent not found');
  });

  it('should handle single phrase correctly', () => {
    const shot = createTestShot('shot-1');
    const phrase = createTestPhrase('phrase-1', 'shot-1');
    const project = createTestProject([shot], [phrase]);

    const result = validateShotDeletion('shot-1', project);

    expect(result.warnings).toContain('This shot has 1 associated dialogue phrase');
  });
});

// ============================================================================
// Associated Phrases Tests
// ============================================================================

describe('getAssociatedPhrases', () => {
  it('should return phrases linked to shot', () => {
    const phrases = [
      createTestPhrase('phrase-1', 'shot-1'),
      createTestPhrase('phrase-2', 'shot-1'),
      createTestPhrase('phrase-3', 'shot-2'),
    ];

    const result = getAssociatedPhrases('shot-1', phrases);

    expect(result).toHaveLength(2);
    expect(result.map(p => p.id)).toEqual(['phrase-1', 'phrase-2']);
  });

  it('should return empty array for shot with no phrases', () => {
    const phrases = [createTestPhrase('phrase-1', 'shot-2')];

    const result = getAssociatedPhrases('shot-1', phrases);

    expect(result).toHaveLength(0);
  });

  it('should handle empty phrases array', () => {
    const result = getAssociatedPhrases('shot-1', []);

    expect(result).toHaveLength(0);
  });
});

// ============================================================================
// Orphaned Phrases Detection Tests
// ============================================================================

describe('detectOrphanedPhrases', () => {
  it('should detect phrases referencing non-existent shots', () => {
    const shot = createTestShot('shot-1');
    const phrase1 = createTestPhrase('phrase-1', 'shot-1'); // Valid
    const phrase2 = createTestPhrase('phrase-2', 'shot-999'); // Orphaned
    const project = createTestProject([shot], [phrase1, phrase2]);

    const orphaned = detectOrphanedPhrases(project);

    expect(orphaned).toHaveLength(1);
    expect(orphaned[0].id).toBe('phrase-2');
    expect(orphaned[0].shotId).toBe('shot-999');
  });

  it('should not flag unlinked phrases (empty shotId)', () => {
    const shot = createTestShot('shot-1');
    const phrase1 = createTestPhrase('phrase-1', 'shot-1');
    const phrase2 = createTestPhrase('phrase-2', ''); // Unlinked, not orphaned
    const project = createTestProject([shot], [phrase1, phrase2]);

    const orphaned = detectOrphanedPhrases(project);

    expect(orphaned).toHaveLength(0);
  });

  it('should return empty array when all phrases are valid', () => {
    const shot1 = createTestShot('shot-1');
    const shot2 = createTestShot('shot-2');
    const phrase1 = createTestPhrase('phrase-1', 'shot-1');
    const phrase2 = createTestPhrase('phrase-2', 'shot-2');
    const project = createTestProject([shot1, shot2], [phrase1, phrase2]);

    const orphaned = detectOrphanedPhrases(project);

    expect(orphaned).toHaveLength(0);
  });

  it('should handle project with no phrases', () => {
    const shot = createTestShot('shot-1');
    const project = createTestProject([shot], []);

    const orphaned = detectOrphanedPhrases(project);

    expect(orphaned).toHaveLength(0);
  });
});

describe('validateNoOrphanedPhrases', () => {
  it('should return true when no orphaned phrases exist', () => {
    const shot = createTestShot('shot-1');
    const phrase = createTestPhrase('phrase-1', 'shot-1');
    const project = createTestProject([shot], [phrase]);

    const result = validateNoOrphanedPhrases(project);

    expect(result).toBe(true);
  });

  it('should return false when orphaned phrases exist', () => {
    const shot = createTestShot('shot-1');
    const phrase = createTestPhrase('phrase-1', 'shot-999');
    const project = createTestProject([shot], [phrase]);

    const result = validateNoOrphanedPhrases(project);

    expect(result).toBe(false);
  });
});

// ============================================================================
// Shot Deletion Simulation Tests
// ============================================================================

describe('simulateShotDeletion', () => {
  it('should remove shot and delete associated phrases', () => {
    const shot = createTestShot('shot-1');
    const phrase = createTestPhrase('phrase-1', 'shot-1');
    const project = createTestProject([shot], [phrase]);

    const result = simulateShotDeletion('shot-1', project, {
      deletePhrases: true,
    });

    expect(result.shots).toHaveLength(0);
    expect(result.audioPhrases).toHaveLength(0);
  });

  it('should remove shot and unlink associated phrases', () => {
    const shot = createTestShot('shot-1');
    const phrase = createTestPhrase('phrase-1', 'shot-1');
    const project = createTestProject([shot], [phrase]);

    const result = simulateShotDeletion('shot-1', project, {
      deletePhrases: false,
    });

    expect(result.shots).toHaveLength(0);
    expect(result.audioPhrases).toHaveLength(1);
    expect(result.audioPhrases[0].shotId).toBe('');
  });

  it('should preserve phrases from other shots', () => {
    const shot1 = createTestShot('shot-1');
    const shot2 = createTestShot('shot-2');
    const phrase1 = createTestPhrase('phrase-1', 'shot-1');
    const phrase2 = createTestPhrase('phrase-2', 'shot-2');
    const project = createTestProject([shot1, shot2], [phrase1, phrase2]);

    const result = simulateShotDeletion('shot-1', project, {
      deletePhrases: true,
    });

    expect(result.shots).toHaveLength(1);
    expect(result.shots[0].id).toBe('shot-2');
    expect(result.audioPhrases).toHaveLength(1);
    expect(result.audioPhrases[0].id).toBe('phrase-2');
  });

  it('should remove shot from sequences', () => {
    const shot1 = createTestShot('shot-1');
    const shot2 = createTestShot('shot-2');
    const project = createTestProject([shot1, shot2], []);

    const result = simulateShotDeletion('shot-1', project, {
      deletePhrases: false,
    });

    expect(result.sequences[0].shotIds).toEqual(['shot-2']);
  });

  it('should not mutate original project', () => {
    const shot = createTestShot('shot-1');
    const phrase = createTestPhrase('phrase-1', 'shot-1');
    const project = createTestProject([shot], [phrase]);

    simulateShotDeletion('shot-1', project, { deletePhrases: true });

    // Original project should be unchanged
    expect(project.shots).toHaveLength(1);
    expect(project.audioPhrases).toHaveLength(1);
  });
});

// ============================================================================
// Shot Deletion Summary Tests
// ============================================================================

describe('getShotDeletionSummary', () => {
  it('should provide accurate summary with phrases', () => {
    const shot = createTestShot('shot-1');
    const phrase1 = createTestPhrase('phrase-1', 'shot-1');
    const phrase2 = createTestPhrase('phrase-2', 'shot-1');
    const project = createTestProject([shot], [phrase1, phrase2]);

    const summary = getShotDeletionSummary('shot-1', project, {
      deletePhrases: true,
    });

    expect(summary.shotId).toBe('shot-1');
    expect(summary.phraseCount).toBe(2);
    expect(summary.phrasesWillBeDeleted).toBe(true);
    expect(summary.sequenceCount).toBe(1);
  });

  it('should indicate when phrases will be kept', () => {
    const shot = createTestShot('shot-1');
    const phrase = createTestPhrase('phrase-1', 'shot-1');
    const project = createTestProject([shot], [phrase]);

    const summary = getShotDeletionSummary('shot-1', project, {
      deletePhrases: false,
    });

    expect(summary.phrasesWillBeDeleted).toBe(false);
  });

  it('should handle shot with no phrases', () => {
    const shot = createTestShot('shot-1');
    const project = createTestProject([shot], []);

    const summary = getShotDeletionSummary('shot-1', project, {
      deletePhrases: false,
    });

    expect(summary.phraseCount).toBe(0);
  });
});

// ============================================================================
// Shot-Phrase Integrity Tests
// ============================================================================

describe('validateShotPhraseIntegrity', () => {
  it('should pass validation for valid project', () => {
    const shot = createTestShot('shot-1');
    const phrase = createTestPhrase('phrase-1', 'shot-1');
    const project = createTestProject([shot], [phrase]);

    const result = validateShotPhraseIntegrity(project);

    expect(result.isValid).toBe(true);
    expect(result.orphanedPhrases).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail validation with orphaned phrases', () => {
    const shot = createTestShot('shot-1');
    const phrase = createTestPhrase('phrase-1', 'shot-999');
    const project = createTestProject([shot], [phrase]);

    const result = validateShotPhraseIntegrity(project);

    expect(result.isValid).toBe(false);
    expect(result.orphanedPhrases).toHaveLength(1);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('orphaned');
  });

  it('should provide detailed error messages', () => {
    const shot = createTestShot('shot-1');
    const phrase = createTestPhrase('phrase-1', 'shot-999');
    const project = createTestProject([shot], [phrase]);

    const result = validateShotPhraseIntegrity(project);

    expect(result.errors.some(e => e.includes('phrase-1'))).toBe(true);
    expect(result.errors.some(e => e.includes('shot-999'))).toBe(true);
  });

  it('should handle unlinked phrases correctly', () => {
    const shot = createTestShot('shot-1');
    const phrase1 = createTestPhrase('phrase-1', 'shot-1');
    const phrase2 = createTestPhrase('phrase-2', ''); // Unlinked
    const project = createTestProject([shot], [phrase1, phrase2]);

    const result = validateShotPhraseIntegrity(project);

    expect(result.isValid).toBe(true);
  });
});

// ============================================================================
// Edge Cases and Error Handling
// ============================================================================

describe('Edge Cases', () => {
  it('should handle empty project', () => {
    const project = createTestProject([], []);

    const validation = validateShotDeletion('shot-1', project);
    expect(validation.canDelete).toBe(false);

    const orphaned = detectOrphanedPhrases(project);
    expect(orphaned).toHaveLength(0);

    const integrity = validateShotPhraseIntegrity(project);
    expect(integrity.isValid).toBe(true);
  });

  it('should handle multiple orphaned phrases', () => {
    const shot = createTestShot('shot-1');
    const phrase1 = createTestPhrase('phrase-1', 'shot-999');
    const phrase2 = createTestPhrase('phrase-2', 'shot-888');
    const project = createTestProject([shot], [phrase1, phrase2]);

    const orphaned = detectOrphanedPhrases(project);
    expect(orphaned).toHaveLength(2);

    const integrity = validateShotPhraseIntegrity(project);
    expect(integrity.isValid).toBe(false);
    expect(integrity.errors.length).toBeGreaterThan(2);
  });

  it('should handle shot in multiple sequences', () => {
    const shot = createTestShot('shot-1');
    const project = createTestProject([shot], []);
    
    // Add shot to multiple sequences
    project.sequences.push({
      id: 'seq-2',
      name: 'Sequence 2',
      description: 'Second sequence',
      shotIds: ['shot-1'],
      duration: 50,
    });

    const validation = validateShotDeletion('shot-1', project);
    expect(validation.affectedSequences).toHaveLength(2);
  });
});
