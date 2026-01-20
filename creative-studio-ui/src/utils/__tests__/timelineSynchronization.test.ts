/**
 * Unit tests for timeline synchronization utilities
 * Tests Requirements 4.5, 7.1, 7.2, 7.4
 */

import { describe, it, expect } from 'vitest';
import {
  adjustPhrasesForShotTimeChange,
  scalePhrasesForShotDurationChange,
  detectOverlappingPhrases,
  preventOverlap,
  getAffectedPhrases,
  isPhraseWithinShotBoundaries,
  getPhraseRelativePosition,
} from '../timelineSynchronization';
import { DialoguePhrase, Shot } from '../../types/projectDashboard';

// Test data helpers
function createShot(id: string, startTime: number, duration: number): Shot {
  return {
    id,
    sequenceId: 'seq1',
    startTime,
    duration,
    prompt: 'Test prompt',
    metadata: {},
  };
}

function createPhrase(
  id: string,
  shotId: string,
  startTime: number,
  endTime: number
): DialoguePhrase {
  return {
    id,
    shotId,
    text: 'Test dialogue',
    startTime,
    endTime,
    metadata: {},
  };
}

describe('adjustPhrasesForShotTimeChange', () => {
  it('should shift phrases forward when shot start time increases', () => {
    const shot = createShot('shot1', 10, 5);
    const phrases = [
      createPhrase('p1', 'shot1', 10, 12),
      createPhrase('p2', 'shot1', 12, 15),
      createPhrase('p3', 'shot2', 20, 25),
    ];

    const result = adjustPhrasesForShotTimeChange('shot1', 5, phrases, [shot]);

    // Phrases in shot1 should be shifted by +5
    expect(result.find(p => p.id === 'p1')).toMatchObject({
      startTime: 15,
      endTime: 17,
    });
    expect(result.find(p => p.id === 'p2')).toMatchObject({
      startTime: 17,
      endTime: 20,
    });
    // Phrase in shot2 should be unchanged
    expect(result.find(p => p.id === 'p3')).toMatchObject({
      startTime: 20,
      endTime: 25,
    });
  });

  it('should shift phrases backward when shot start time decreases', () => {
    const shot = createShot('shot1', 10, 5);
    const phrases = [
      createPhrase('p1', 'shot1', 10, 12),
      createPhrase('p2', 'shot1', 12, 15),
    ];

    const result = adjustPhrasesForShotTimeChange('shot1', -3, phrases, [shot]);

    expect(result.find(p => p.id === 'p1')).toMatchObject({
      startTime: 7,
      endTime: 9,
    });
    expect(result.find(p => p.id === 'p2')).toMatchObject({
      startTime: 9,
      endTime: 12,
    });
  });

  it('should handle zero time delta', () => {
    const shot = createShot('shot1', 10, 5);
    const phrases = [createPhrase('p1', 'shot1', 10, 12)];

    const result = adjustPhrasesForShotTimeChange('shot1', 0, phrases, [shot]);

    expect(result.find(p => p.id === 'p1')).toMatchObject({
      startTime: 10,
      endTime: 12,
    });
  });

  it('should throw error for non-existent shot', () => {
    const shot = createShot('shot1', 10, 5);
    const phrases = [createPhrase('p1', 'shot1', 10, 12)];

    expect(() => {
      adjustPhrasesForShotTimeChange('nonexistent', 5, phrases, [shot]);
    }).toThrow('Shot with id nonexistent not found');
  });

  it('should not affect phrases from other shots', () => {
    const shots = [
      createShot('shot1', 10, 5),
      createShot('shot2', 20, 5),
    ];
    const phrases = [
      createPhrase('p1', 'shot1', 10, 12),
      createPhrase('p2', 'shot2', 20, 22),
      createPhrase('p3', 'shot2', 22, 25),
    ];

    const result = adjustPhrasesForShotTimeChange('shot1', 5, phrases, shots);

    // shot1 phrases shifted
    expect(result.find(p => p.id === 'p1')?.startTime).toBe(15);
    // shot2 phrases unchanged
    expect(result.find(p => p.id === 'p2')?.startTime).toBe(20);
    expect(result.find(p => p.id === 'p3')?.startTime).toBe(22);
  });
});

describe('scalePhrasesForShotDurationChange', () => {
  it('should scale phrases proportionally when duration doubles', () => {
    const shot = createShot('shot1', 10, 10); // 10s to 20s
    const phrases = [
      createPhrase('p1', 'shot1', 10, 15), // First half
      createPhrase('p2', 'shot1', 15, 20), // Second half
    ];

    const result = scalePhrasesForShotDurationChange('shot1', 2.0, phrases, [shot]);

    // First phrase should be in first half of doubled duration
    expect(result.find(p => p.id === 'p1')).toMatchObject({
      startTime: 10,
      endTime: 20,
    });
    // Second phrase should be in second half
    expect(result.find(p => p.id === 'p2')).toMatchObject({
      startTime: 20,
      endTime: 30,
    });
  });

  it('should scale phrases proportionally when duration halves', () => {
    const shot = createShot('shot1', 10, 10); // 10s to 5s
    const phrases = [
      createPhrase('p1', 'shot1', 10, 15), // First half
      createPhrase('p2', 'shot1', 15, 20), // Second half
    ];

    const result = scalePhrasesForShotDurationChange('shot1', 0.5, phrases, [shot]);

    expect(result.find(p => p.id === 'p1')).toMatchObject({
      startTime: 10,
      endTime: 12.5,
    });
    expect(result.find(p => p.id === 'p2')).toMatchObject({
      startTime: 12.5,
      endTime: 15,
    });
  });

  it('should maintain relative positions within shot', () => {
    const shot = createShot('shot1', 0, 100);
    const phrases = [
      createPhrase('p1', 'shot1', 25, 50), // 25% to 50%
      createPhrase('p2', 'shot1', 75, 100), // 75% to 100%
    ];

    const result = scalePhrasesForShotDurationChange('shot1', 2.0, phrases, [shot]);

    // Should maintain 25%-50% and 75%-100% positions
    expect(result.find(p => p.id === 'p1')).toMatchObject({
      startTime: 50,
      endTime: 100,
    });
    expect(result.find(p => p.id === 'p2')).toMatchObject({
      startTime: 150,
      endTime: 200,
    });
  });

  it('should throw error for non-existent shot', () => {
    const shot = createShot('shot1', 10, 10);
    const phrases = [createPhrase('p1', 'shot1', 10, 15)];

    expect(() => {
      scalePhrasesForShotDurationChange('nonexistent', 2.0, phrases, [shot]);
    }).toThrow('Shot with id nonexistent not found');
  });

  it('should throw error for non-positive duration ratio', () => {
    const shot = createShot('shot1', 10, 10);
    const phrases = [createPhrase('p1', 'shot1', 10, 15)];

    expect(() => {
      scalePhrasesForShotDurationChange('shot1', 0, phrases, [shot]);
    }).toThrow('Duration ratio must be positive');

    expect(() => {
      scalePhrasesForShotDurationChange('shot1', -1, phrases, [shot]);
    }).toThrow('Duration ratio must be positive');
  });

  it('should not affect phrases from other shots', () => {
    const shots = [
      createShot('shot1', 0, 10),
      createShot('shot2', 20, 10),
    ];
    const phrases = [
      createPhrase('p1', 'shot1', 0, 5),
      createPhrase('p2', 'shot2', 20, 25),
    ];

    const result = scalePhrasesForShotDurationChange('shot1', 2.0, phrases, shots);

    // shot1 phrase scaled
    expect(result.find(p => p.id === 'p1')?.endTime).toBe(10);
    // shot2 phrase unchanged
    expect(result.find(p => p.id === 'p2')?.endTime).toBe(25);
  });
});

describe('detectOverlappingPhrases', () => {
  it('should detect no overlaps when phrases are sequential', () => {
    const phrases = [
      createPhrase('p1', 'shot1', 0, 5),
      createPhrase('p2', 'shot1', 5, 10),
      createPhrase('p3', 'shot1', 10, 15),
    ];

    const overlaps = detectOverlappingPhrases(phrases);
    expect(overlaps).toHaveLength(0);
  });

  it('should detect overlap between two phrases', () => {
    const phrases = [
      createPhrase('p1', 'shot1', 0, 10),
      createPhrase('p2', 'shot1', 5, 15),
    ];

    const overlaps = detectOverlappingPhrases(phrases);
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0]).toMatchObject({
      phrase1Id: 'p1',
      phrase2Id: 'p2',
      overlapStart: 5,
      overlapEnd: 10,
      overlapDuration: 5,
    });
  });

  it('should detect multiple overlaps', () => {
    const phrases = [
      createPhrase('p1', 'shot1', 0, 10),
      createPhrase('p2', 'shot1', 5, 15),
      createPhrase('p3', 'shot1', 8, 12),
    ];

    const overlaps = detectOverlappingPhrases(phrases);
    expect(overlaps.length).toBeGreaterThanOrEqual(2);
    
    // p1 overlaps with p2
    expect(overlaps.some(o => 
      (o.phrase1Id === 'p1' && o.phrase2Id === 'p2') ||
      (o.phrase1Id === 'p2' && o.phrase2Id === 'p1')
    )).toBe(true);
    
    // p1 overlaps with p3
    expect(overlaps.some(o => 
      (o.phrase1Id === 'p1' && o.phrase2Id === 'p3') ||
      (o.phrase1Id === 'p3' && o.phrase2Id === 'p1')
    )).toBe(true);
  });

  it('should detect complete overlap (one phrase contains another)', () => {
    const phrases = [
      createPhrase('p1', 'shot1', 0, 20),
      createPhrase('p2', 'shot1', 5, 10),
    ];

    const overlaps = detectOverlappingPhrases(phrases);
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0]).toMatchObject({
      overlapStart: 5,
      overlapEnd: 10,
      overlapDuration: 5,
    });
  });

  it('should handle phrases with same start time', () => {
    const phrases = [
      createPhrase('p1', 'shot1', 0, 10),
      createPhrase('p2', 'shot1', 0, 5),
    ];

    const overlaps = detectOverlappingPhrases(phrases);
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].overlapDuration).toBe(5);
  });

  it('should handle phrases with same end time', () => {
    const phrases = [
      createPhrase('p1', 'shot1', 0, 10),
      createPhrase('p2', 'shot1', 5, 10),
    ];

    const overlaps = detectOverlappingPhrases(phrases);
    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].overlapDuration).toBe(5);
  });

  it('should return empty array for single phrase', () => {
    const phrases = [createPhrase('p1', 'shot1', 0, 10)];
    const overlaps = detectOverlappingPhrases(phrases);
    expect(overlaps).toHaveLength(0);
  });

  it('should return empty array for empty input', () => {
    const overlaps = detectOverlappingPhrases([]);
    expect(overlaps).toHaveLength(0);
  });
});

describe('preventOverlap', () => {
  it('should validate move operation that creates no overlap', () => {
    const phrases = [
      createPhrase('p1', 'shot1', 0, 5),
      createPhrase('p2', 'shot1', 10, 15),
    ];

    const result = preventOverlap(
      { type: 'move', phraseId: 'p1', newStartTime: 20 },
      phrases,
      []
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject move operation that creates overlap', () => {
    const phrases = [
      createPhrase('p1', 'shot1', 0, 5),
      createPhrase('p2', 'shot1', 10, 15),
    ];

    const result = preventOverlap(
      { type: 'move', phraseId: 'p1', newStartTime: 8 },
      phrases,
      []
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('overlap');
  });

  it('should validate resize operation that creates no overlap', () => {
    const phrases = [
      createPhrase('p1', 'shot1', 0, 5),
      createPhrase('p2', 'shot1', 10, 15),
    ];

    const result = preventOverlap(
      { type: 'resize', phraseId: 'p1', newEndTime: 8 },
      phrases,
      []
    );

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject resize operation that creates overlap', () => {
    const phrases = [
      createPhrase('p1', 'shot1', 0, 5),
      createPhrase('p2', 'shot1', 10, 15),
    ];

    const result = preventOverlap(
      { type: 'resize', phraseId: 'p1', newEndTime: 12 },
      phrases,
      []
    );

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should validate shotTimeChange operation', () => {
    const shot = createShot('shot1', 10, 10);
    const phrases = [
      createPhrase('p1', 'shot1', 10, 15),
      createPhrase('p2', 'shot2', 25, 30),
    ];

    const result = preventOverlap(
      { type: 'shotTimeChange', shotId: 'shot1', timeDelta: 5 },
      phrases,
      [shot]
    );

    expect(result.isValid).toBe(true);
  });

  it('should reject shotTimeChange that creates overlap', () => {
    const shot = createShot('shot1', 0, 10);
    const phrases = [
      createPhrase('p1', 'shot1', 0, 5),
      createPhrase('p2', 'shot2', 10, 15),
    ];

    const result = preventOverlap(
      { type: 'shotTimeChange', shotId: 'shot1', timeDelta: 8 },
      phrases,
      [shot]
    );

    expect(result.isValid).toBe(false);
  });

  it('should validate shotDurationChange operation', () => {
    const shot = createShot('shot1', 0, 10);
    const phrases = [
      createPhrase('p1', 'shot1', 0, 5),
      createPhrase('p2', 'shot2', 20, 25),
    ];

    const result = preventOverlap(
      { type: 'shotDurationChange', shotId: 'shot1', durationRatio: 1.5 },
      phrases,
      [shot]
    );

    expect(result.isValid).toBe(true);
  });

  it('should return affected phrases when overlap detected', () => {
    const phrases = [
      createPhrase('p1', 'shot1', 0, 5),
      createPhrase('p2', 'shot1', 10, 15),
    ];

    const result = preventOverlap(
      { type: 'move', phraseId: 'p1', newStartTime: 8 },
      phrases,
      []
    );

    expect(result.affectedPhrases).toBeDefined();
    expect(result.affectedPhrases?.length).toBeGreaterThan(0);
  });

  it('should handle invalid operation parameters', () => {
    const result = preventOverlap(
      { type: 'move', phraseId: undefined, newStartTime: 5 },
      [],
      []
    );

    expect(result.isValid).toBe(false);
    expect(result.errors[0]).toContain('Invalid');
  });
});

describe('getAffectedPhrases', () => {
  it('should return phrases linked to the shot', () => {
    const phrases = [
      createPhrase('p1', 'shot1', 0, 5),
      createPhrase('p2', 'shot1', 5, 10),
      createPhrase('p3', 'shot2', 10, 15),
    ];

    const affected = getAffectedPhrases('shot1', phrases);
    expect(affected).toHaveLength(2);
    expect(affected.map(p => p.id)).toEqual(['p1', 'p2']);
  });

  it('should return empty array when no phrases linked', () => {
    const phrases = [createPhrase('p1', 'shot1', 0, 5)];
    const affected = getAffectedPhrases('shot2', phrases);
    expect(affected).toHaveLength(0);
  });
});

describe('isPhraseWithinShotBoundaries', () => {
  it('should return true when phrase is within shot', () => {
    const shot = createShot('shot1', 10, 10); // 10-20
    const phrase = createPhrase('p1', 'shot1', 12, 18);

    expect(isPhraseWithinShotBoundaries(phrase, shot)).toBe(true);
  });

  it('should return false when phrase starts before shot', () => {
    const shot = createShot('shot1', 10, 10);
    const phrase = createPhrase('p1', 'shot1', 8, 15);

    expect(isPhraseWithinShotBoundaries(phrase, shot)).toBe(false);
  });

  it('should return false when phrase ends after shot', () => {
    const shot = createShot('shot1', 10, 10);
    const phrase = createPhrase('p1', 'shot1', 15, 25);

    expect(isPhraseWithinShotBoundaries(phrase, shot)).toBe(false);
  });

  it('should return true when phrase exactly matches shot boundaries', () => {
    const shot = createShot('shot1', 10, 10);
    const phrase = createPhrase('p1', 'shot1', 10, 20);

    expect(isPhraseWithinShotBoundaries(phrase, shot)).toBe(true);
  });

  it('should return false when phrase has invalid timing', () => {
    const shot = createShot('shot1', 10, 10);
    const phrase = createPhrase('p1', 'shot1', 15, 12); // end before start

    expect(isPhraseWithinShotBoundaries(phrase, shot)).toBe(false);
  });
});

describe('getPhraseRelativePosition', () => {
  it('should calculate relative position correctly', () => {
    const shot = createShot('shot1', 0, 100);
    const phrase = createPhrase('p1', 'shot1', 25, 75);

    const position = getPhraseRelativePosition(phrase, shot);
    expect(position.relativeStart).toBe(0.25);
    expect(position.relativeEnd).toBe(0.75);
  });

  it('should handle phrase at shot start', () => {
    const shot = createShot('shot1', 10, 10);
    const phrase = createPhrase('p1', 'shot1', 10, 15);

    const position = getPhraseRelativePosition(phrase, shot);
    expect(position.relativeStart).toBe(0);
    expect(position.relativeEnd).toBe(0.5);
  });

  it('should handle phrase at shot end', () => {
    const shot = createShot('shot1', 10, 10);
    const phrase = createPhrase('p1', 'shot1', 15, 20);

    const position = getPhraseRelativePosition(phrase, shot);
    expect(position.relativeStart).toBe(0.5);
    expect(position.relativeEnd).toBe(1.0);
  });

  it('should clamp values to 0-1 range', () => {
    const shot = createShot('shot1', 10, 10);
    const phrase = createPhrase('p1', 'shot1', 5, 25); // Outside shot

    const position = getPhraseRelativePosition(phrase, shot);
    expect(position.relativeStart).toBeGreaterThanOrEqual(0);
    expect(position.relativeStart).toBeLessThanOrEqual(1);
    expect(position.relativeEnd).toBeGreaterThanOrEqual(0);
    expect(position.relativeEnd).toBeLessThanOrEqual(1);
  });
});
