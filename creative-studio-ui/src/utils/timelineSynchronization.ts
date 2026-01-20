/**
 * Timeline Synchronization Utilities
 * 
 * Provides functions for maintaining synchronization between shots and dialogue phrases
 * when timeline operations occur (shot timing changes, phrase moves, etc.)
 * 
 * Requirements: 4.5, 7.1, 7.2, 7.4
 */

import { DialoguePhrase, Shot } from '../types/projectDashboard';

/**
 * Represents an overlap between two dialogue phrases
 */
export interface PhraseOverlap {
  phrase1Id: string;
  phrase2Id: string;
  overlapStart: number;
  overlapEnd: number;
  overlapDuration: number;
}

/**
 * Represents a timeline operation that can be validated
 */
export interface TimelineOperation {
  type: 'move' | 'resize' | 'add' | 'shotTimeChange' | 'shotDurationChange';
  phraseId?: string;
  shotId?: string;
  newStartTime?: number;
  newEndTime?: number;
  newDuration?: number;
  timeDelta?: number;
  durationRatio?: number;
}

/**
 * Result of a timeline operation validation
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  affectedPhrases?: DialoguePhrase[];
}

/**
 * Adjusts dialogue phrases when a shot's start time changes
 * All phrases linked to the shot are shifted by the same time delta
 * 
 * Requirement 7.1: WHEN a user changes a shot's start time, 
 * THE Project_Dashboard SHALL adjust all dialogue phrases within that shot 
 * by the same time delta
 * 
 * @param shotId - ID of the shot whose start time changed
 * @param timeDelta - Change in start time (positive = later, negative = earlier)
 * @param phrases - All dialogue phrases in the project
 * @param shots - All shots in the project
 * @returns Updated phrases with adjusted timestamps
 */
export function adjustPhrasesForShotTimeChange(
  shotId: string,
  timeDelta: number,
  phrases: DialoguePhrase[],
  shots: Shot[]
): DialoguePhrase[] {
  // Find the shot to get its original timing
  const shot = shots.find(s => s.id === shotId);
  if (!shot) {
    throw new Error(`Shot with id ${shotId} not found`);
  }

  // Filter phrases that belong to this shot
  const shotPhrases = phrases.filter(p => p.shotId === shotId);
  const otherPhrases = phrases.filter(p => p.shotId !== shotId);

  // Adjust timestamps for phrases in this shot
  const adjustedPhrases = shotPhrases.map(phrase => ({
    ...phrase,
    startTime: phrase.startTime + timeDelta,
    endTime: phrase.endTime + timeDelta,
  }));

  // Return all phrases with adjusted ones
  return [...otherPhrases, ...adjustedPhrases];
}

/**
 * Scales dialogue phrases when a shot's duration changes
 * Phrases are scaled proportionally to maintain their relative positions within the shot
 * 
 * Requirement 7.2: WHEN a user changes a shot's duration, 
 * THE Project_Dashboard SHALL scale dialogue phrase timestamps proportionally 
 * within that shot
 * 
 * @param shotId - ID of the shot whose duration changed
 * @param durationRatio - Ratio of new duration to old duration (e.g., 2.0 = doubled)
 * @param phrases - All dialogue phrases in the project
 * @param shots - All shots in the project
 * @returns Updated phrases with scaled timestamps
 */
export function scalePhrasesForShotDurationChange(
  shotId: string,
  durationRatio: number,
  phrases: DialoguePhrase[],
  shots: Shot[]
): DialoguePhrase[] {
  // Find the shot to get its timing
  const shot = shots.find(s => s.id === shotId);
  if (!shot) {
    throw new Error(`Shot with id ${shotId} not found`);
  }

  if (durationRatio <= 0) {
    throw new Error('Duration ratio must be positive');
  }

  // Filter phrases that belong to this shot
  const shotPhrases = phrases.filter(p => p.shotId === shotId);
  const otherPhrases = phrases.filter(p => p.shotId !== shotId);

  // Scale timestamps for phrases in this shot
  // Maintain relative position within the shot
  const scaledPhrases = shotPhrases.map(phrase => {
    // Calculate relative position within shot (0 to 1)
    const relativeStart = (phrase.startTime - shot.startTime) / shot.duration;
    const relativeEnd = (phrase.endTime - shot.startTime) / shot.duration;

    // Apply scaling to maintain relative position
    const newDuration = shot.duration * durationRatio;
    const newStartTime = shot.startTime + (relativeStart * newDuration);
    const newEndTime = shot.startTime + (relativeEnd * newDuration);

    return {
      ...phrase,
      startTime: newStartTime,
      endTime: newEndTime,
    };
  });

  // Return all phrases with scaled ones
  return [...otherPhrases, ...scaledPhrases];
}

/**
 * Detects overlapping dialogue phrases in the timeline
 * Two phrases overlap if their time ranges intersect
 * 
 * Requirement 7.4: THE Project_Dashboard SHALL prevent timeline operations 
 * that would create overlapping dialogue phrases
 * 
 * @param phrases - All dialogue phrases to check for overlaps
 * @returns Array of detected overlaps
 */
export function detectOverlappingPhrases(phrases: DialoguePhrase[]): PhraseOverlap[] {
  const overlaps: PhraseOverlap[] = [];

  // Sort phrases by start time for efficient comparison
  const sortedPhrases = [...phrases].sort((a, b) => a.startTime - b.startTime);

  // Check each pair of phrases for overlap
  for (let i = 0; i < sortedPhrases.length; i++) {
    for (let j = i + 1; j < sortedPhrases.length; j++) {
      const phrase1 = sortedPhrases[i];
      const phrase2 = sortedPhrases[j];

      // If phrase2 starts after phrase1 ends, no more overlaps possible for phrase1
      if (phrase2.startTime >= phrase1.endTime) {
        break;
      }

      // Check for overlap: phrase2 starts before phrase1 ends
      if (phrase2.startTime < phrase1.endTime) {
        const overlapStart = Math.max(phrase1.startTime, phrase2.startTime);
        const overlapEnd = Math.min(phrase1.endTime, phrase2.endTime);
        const overlapDuration = overlapEnd - overlapStart;

        overlaps.push({
          phrase1Id: phrase1.id,
          phrase2Id: phrase2.id,
          overlapStart,
          overlapEnd,
          overlapDuration,
        });
      }
    }
  }

  return overlaps;
}

/**
 * Validates that a timeline operation won't create overlapping phrases
 * Returns validation result with errors if overlaps would occur
 * 
 * Requirement 7.4: THE Project_Dashboard SHALL prevent timeline operations 
 * that would create overlapping dialogue phrases
 * 
 * @param operation - The timeline operation to validate
 * @param phrases - Current dialogue phrases
 * @param shots - Current shots
 * @returns Validation result indicating if operation is safe
 */
export function preventOverlap(
  operation: TimelineOperation,
  phrases: DialoguePhrase[],
  shots: Shot[]
): ValidationResult {
  let updatedPhrases: DialoguePhrase[];

  try {
    // Apply the operation to get the resulting phrase state
    switch (operation.type) {
      case 'move':
        if (!operation.phraseId || operation.newStartTime === undefined) {
          return {
            isValid: false,
            errors: ['Invalid move operation: missing phraseId or newStartTime'],
            warnings: [],
          };
        }
        updatedPhrases = movePhraseForValidation(
          operation.phraseId,
          operation.newStartTime,
          phrases
        );
        break;

      case 'resize':
        if (!operation.phraseId || operation.newEndTime === undefined) {
          return {
            isValid: false,
            errors: ['Invalid resize operation: missing phraseId or newEndTime'],
            warnings: [],
          };
        }
        updatedPhrases = resizePhraseForValidation(
          operation.phraseId,
          operation.newEndTime,
          phrases
        );
        break;

      case 'add':
        if (!operation.phraseId) {
          return {
            isValid: false,
            errors: ['Invalid add operation: missing phraseId'],
            warnings: [],
          };
        }
        // For add operations, the phrase should already be in the phrases array
        updatedPhrases = phrases;
        break;

      case 'shotTimeChange':
        if (!operation.shotId || operation.timeDelta === undefined) {
          return {
            isValid: false,
            errors: ['Invalid shotTimeChange operation: missing shotId or timeDelta'],
            warnings: [],
          };
        }
        updatedPhrases = adjustPhrasesForShotTimeChange(
          operation.shotId,
          operation.timeDelta,
          phrases,
          shots
        );
        break;

      case 'shotDurationChange':
        if (!operation.shotId || operation.durationRatio === undefined) {
          return {
            isValid: false,
            errors: ['Invalid shotDurationChange operation: missing shotId or durationRatio'],
            warnings: [],
          };
        }
        updatedPhrases = scalePhrasesForShotDurationChange(
          operation.shotId,
          operation.durationRatio,
          phrases,
          shots
        );
        break;

      default:
        return {
          isValid: false,
          errors: [`Unknown operation type: ${operation.type}`],
          warnings: [],
        };
    }

    // Check for overlaps in the resulting state
    const overlaps = detectOverlappingPhrases(updatedPhrases);

    if (overlaps.length > 0) {
      const errors = overlaps.map(overlap =>
        `Phrases ${overlap.phrase1Id} and ${overlap.phrase2Id} would overlap ` +
        `(${overlap.overlapDuration.toFixed(2)}s overlap from ${overlap.overlapStart.toFixed(2)}s to ${overlap.overlapEnd.toFixed(2)}s)`
      );

      return {
        isValid: false,
        errors,
        warnings: [],
        affectedPhrases: updatedPhrases.filter(p =>
          overlaps.some(o => o.phrase1Id === p.id || o.phrase2Id === p.id)
        ),
      };
    }

    // Operation is valid
    return {
      isValid: true,
      errors: [],
      warnings: [],
      affectedPhrases: updatedPhrases,
    };

  } catch (error) {
    return {
      isValid: false,
      errors: [error instanceof Error ? error.message : 'Unknown error occurred'],
      warnings: [],
    };
  }
}

/**
 * Helper function to move a phrase for validation purposes
 * Does not mutate the original phrases array
 */
function movePhraseForValidation(
  phraseId: string,
  newStartTime: number,
  phrases: DialoguePhrase[]
): DialoguePhrase[] {
  const phrase = phrases.find(p => p.id === phraseId);
  if (!phrase) {
    throw new Error(`Phrase with id ${phraseId} not found`);
  }

  const duration = phrase.endTime - phrase.startTime;
  const newEndTime = newStartTime + duration;

  return phrases.map(p =>
    p.id === phraseId
      ? { ...p, startTime: newStartTime, endTime: newEndTime }
      : p
  );
}

/**
 * Helper function to resize a phrase for validation purposes
 * Does not mutate the original phrases array
 */
function resizePhraseForValidation(
  phraseId: string,
  newEndTime: number,
  phrases: DialoguePhrase[]
): DialoguePhrase[] {
  const phrase = phrases.find(p => p.id === phraseId);
  if (!phrase) {
    throw new Error(`Phrase with id ${phraseId} not found`);
  }

  if (newEndTime <= phrase.startTime) {
    throw new Error('End time must be greater than start time');
  }

  return phrases.map(p =>
    p.id === phraseId
      ? { ...p, endTime: newEndTime }
      : p
  );
}

/**
 * Gets all phrases that would be affected by a shot timing change
 * Useful for UI feedback before applying changes
 * 
 * @param shotId - ID of the shot
 * @param phrases - All dialogue phrases
 * @returns Phrases linked to the shot
 */
export function getAffectedPhrases(
  shotId: string,
  phrases: DialoguePhrase[]
): DialoguePhrase[] {
  return phrases.filter(p => p.shotId === shotId);
}

/**
 * Validates that a phrase's timing is within its linked shot's boundaries
 * 
 * @param phrase - The dialogue phrase to validate
 * @param shot - The shot it's linked to
 * @returns True if phrase is within shot boundaries
 */
export function isPhraseWithinShotBoundaries(
  phrase: DialoguePhrase,
  shot: Shot
): boolean {
  const shotEnd = shot.startTime + shot.duration;
  return (
    phrase.startTime >= shot.startTime &&
    phrase.endTime <= shotEnd &&
    phrase.startTime < phrase.endTime
  );
}

/**
 * Calculates the relative position of a phrase within its shot
 * Returns values between 0 and 1 representing the position
 * 
 * @param phrase - The dialogue phrase
 * @param shot - The shot it's linked to
 * @returns Object with relative start and end positions (0-1)
 */
export function getPhraseRelativePosition(
  phrase: DialoguePhrase,
  shot: Shot
): { relativeStart: number; relativeEnd: number } {
  const relativeStart = (phrase.startTime - shot.startTime) / shot.duration;
  const relativeEnd = (phrase.endTime - shot.startTime) / shot.duration;

  return {
    relativeStart: Math.max(0, Math.min(1, relativeStart)),
    relativeEnd: Math.max(0, Math.min(1, relativeEnd)),
  };
}
