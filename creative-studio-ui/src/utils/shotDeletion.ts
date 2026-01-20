/**
 * Shot Deletion Utilities
 * 
 * Provides helper functions for shot deletion operations, including
 * validation, phrase handling, and orphan detection.
 * 
 * Requirements: 7.3
 */

import type { Shot, DialoguePhrase, Project } from '../types/projectDashboard';

/**
 * Result of shot deletion validation
 */
export interface ShotDeletionValidation {
  canDelete: boolean;
  errors: string[];
  warnings: string[];
  associatedPhrases: DialoguePhrase[];
  affectedSequences: string[];
}

/**
 * Options for shot deletion
 */
export interface ShotDeletionOptions {
  /** Whether to delete associated phrases (true) or unlink them (false) */
  deletePhrases: boolean;
  /** Whether to skip confirmation dialog */
  skipConfirmation?: boolean;
}

/**
 * Validates that a shot can be deleted
 * Checks for associated phrases and sequences
 * 
 * Requirement 7.3: WHEN a user deletes a shot, THE Project_Dashboard SHALL 
 * prompt for confirmation and optionally remove associated dialogue phrases
 * 
 * @param shotId - ID of the shot to delete
 * @param project - Current project state
 * @returns Validation result with associated data
 */
export function validateShotDeletion(
  shotId: string,
  project: Project
): ShotDeletionValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check if shot exists
  const shot = project.shots.find(s => s.id === shotId);
  if (!shot) {
    errors.push(`Shot with id ${shotId} not found`);
    return {
      canDelete: false,
      errors,
      warnings,
      associatedPhrases: [],
      affectedSequences: [],
    };
  }

  // Find associated dialogue phrases
  const associatedPhrases = project.audioPhrases.filter(
    phrase => phrase.shotId === shotId
  );

  // Find sequences containing this shot
  const affectedSequences = project.sequences
    .filter(seq => seq.shotIds.includes(shotId))
    .map(seq => seq.id);

  // Add warnings
  if (associatedPhrases.length > 0) {
    warnings.push(
      `This shot has ${associatedPhrases.length} associated dialogue ${
        associatedPhrases.length === 1 ? 'phrase' : 'phrases'
      }`
    );
  }

  if (affectedSequences.length > 0) {
    warnings.push(
      `This shot is part of ${affectedSequences.length} ${
        affectedSequences.length === 1 ? 'sequence' : 'sequences'
      }`
    );
  }

  return {
    canDelete: errors.length === 0,
    errors,
    warnings,
    associatedPhrases,
    affectedSequences,
  };
}

/**
 * Gets all dialogue phrases associated with a shot
 * 
 * @param shotId - ID of the shot
 * @param phrases - All dialogue phrases in the project
 * @returns Array of associated phrases
 */
export function getAssociatedPhrases(
  shotId: string,
  phrases: DialoguePhrase[]
): DialoguePhrase[] {
  return phrases.filter(phrase => phrase.shotId === shotId);
}

/**
 * Checks for orphaned phrase references in the project
 * An orphaned phrase is one that references a non-existent shot
 * 
 * Requirement 7.3: Ensure no orphaned phrase references remain
 * 
 * @param project - Current project state
 * @returns Array of orphaned phrases
 */
export function detectOrphanedPhrases(project: Project): DialoguePhrase[] {
  const shotIds = new Set(project.shots.map(shot => shot.id));
  
  return project.audioPhrases.filter(phrase => {
    // Empty shotId is allowed (unlinked phrase)
    if (phrase.shotId === '') return false;
    
    // Check if referenced shot exists
    return !shotIds.has(phrase.shotId);
  });
}

/**
 * Validates that no orphaned phrases exist after a deletion operation
 * 
 * @param project - Project state after deletion
 * @returns True if no orphaned phrases exist
 */
export function validateNoOrphanedPhrases(project: Project): boolean {
  const orphanedPhrases = detectOrphanedPhrases(project);
  return orphanedPhrases.length === 0;
}

/**
 * Simulates shot deletion and returns the resulting project state
 * Useful for preview or validation before actual deletion
 * 
 * @param shotId - ID of the shot to delete
 * @param project - Current project state
 * @param options - Deletion options
 * @returns Simulated project state after deletion
 */
export function simulateShotDeletion(
  shotId: string,
  project: Project,
  options: ShotDeletionOptions
): Project {
  // Remove the shot
  const updatedShots = project.shots.filter(shot => shot.id !== shotId);

  // Handle associated phrases
  let updatedPhrases: DialoguePhrase[];
  
  if (options.deletePhrases) {
    // Delete all phrases linked to this shot
    updatedPhrases = project.audioPhrases.filter(
      phrase => phrase.shotId !== shotId
    );
  } else {
    // Unlink phrases by setting shotId to empty string
    updatedPhrases = project.audioPhrases.map(phrase =>
      phrase.shotId === shotId
        ? { ...phrase, shotId: '' }
        : phrase
    );
  }

  // Remove shot from sequences
  const updatedSequences = project.sequences.map(sequence => ({
    ...sequence,
    shotIds: sequence.shotIds.filter(id => id !== shotId),
  }));

  return {
    ...project,
    shots: updatedShots,
    audioPhrases: updatedPhrases,
    sequences: updatedSequences,
  };
}

/**
 * Gets a summary of what will be affected by shot deletion
 * Useful for displaying in confirmation dialogs
 * 
 * @param shotId - ID of the shot to delete
 * @param project - Current project state
 * @param options - Deletion options
 * @returns Summary object with counts and details
 */
export function getShotDeletionSummary(
  shotId: string,
  project: Project,
  options: ShotDeletionOptions
): {
  shotId: string;
  phraseCount: number;
  phrasesWillBeDeleted: boolean;
  sequenceCount: number;
  sequenceNames: string[];
} {
  const validation = validateShotDeletion(shotId, project);

  return {
    shotId,
    phraseCount: validation.associatedPhrases.length,
    phrasesWillBeDeleted: options.deletePhrases,
    sequenceCount: validation.affectedSequences.length,
    sequenceNames: project.sequences
      .filter(seq => validation.affectedSequences.includes(seq.id))
      .map(seq => seq.name),
  };
}

/**
 * Validates the integrity of shot-phrase relationships in a project
 * Ensures all phrase references are valid
 * 
 * @param project - Project to validate
 * @returns Validation result with any issues found
 */
export function validateShotPhraseIntegrity(project: Project): {
  isValid: boolean;
  orphanedPhrases: DialoguePhrase[];
  errors: string[];
} {
  const orphanedPhrases = detectOrphanedPhrases(project);
  const errors: string[] = [];

  if (orphanedPhrases.length > 0) {
    errors.push(
      `Found ${orphanedPhrases.length} orphaned phrase(s) referencing non-existent shots`
    );
    orphanedPhrases.forEach(phrase => {
      errors.push(
        `Phrase ${phrase.id} references non-existent shot ${phrase.shotId}`
      );
    });
  }

  return {
    isValid: orphanedPhrases.length === 0,
    orphanedPhrases,
    errors,
  };
}
