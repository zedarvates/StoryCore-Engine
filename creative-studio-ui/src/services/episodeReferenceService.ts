/**
 * EpisodeReferenceService - Manages previous episode references for sequels/spin-offs
 * 
 * Provides functionality for:
 * - Linking sequences to previous episodes
 * - Validating continuity with previous episodes
 * - Character/location continuity tracking
 * - Importing references from previous episodes
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  MasterReferenceSheet,
  CharacterAppearanceSheet,
  LocationAppearanceSheet,
  GlobalStyleSheet,
  SequenceReferenceSheet,
  PreviousEpisodeReference,
} from '../types/reference';
import { referenceSheetService, ReferenceSheetService } from './referenceSheetService';
import { consistencyEngine } from './consistencyEngine';
import type { ContinuityIssue } from './consistencyEngine';

// ============================================================================
// Type Definitions
// ============================================================================

export interface LinkedEpisode {
  episodeId: string;
  episodeName: string;
  linkedAt: Date;
  sequences: string[];
  importedCharacterIds: string[];
  importedLocationIds: string[];
  styleImported: boolean;
}

export interface ContinuityValidationResult {
  isValid: boolean;
  overallScore: number;
  characterScore: number;
  locationScore: number;
  styleScore: number;
  issues: ContinuityIssue[];
  suggestions: ContinuityFix[];
}

export interface CharacterContinuityStatus {
  characterId: string;
  characterName: string;
  lastAppearance: {
    episodeId: string;
    sequenceId: string;
    shotId: string;
    appearanceImageUrl: string;
  };
  consistencyScore: number;
  hasBreak: boolean;
}

export interface LocationContinuityStatus {
  locationId: string;
  locationName: string;
  lastAppearance: {
    episodeId: string;
    sequenceId: string;
    shotId: string;
    referenceImageUrl: string;
  };
  consistencyScore: number;
  hasBreak: boolean;
}

export interface ContinuityBreak {
  type: 'character' | 'location' | 'style';
  elementId: string;
  elementName: string;
  previousAppearance: {
    episodeId: string;
    sequenceId: string;
    shotId: string;
  };
  currentAppearance: {
    sequenceId: string;
    shotId: string;
  };
  suggestedFix: string;
}

export interface ContinuityFix {
  id: string;
  description: string;
  action: 'regenerate' | 'import_reference' | 'adjust_prompt' | 'manual_edit';
  targetShotId: string;
  referenceUrl?: string;
}

export interface ImportResult {
  success: boolean;
  importedCharacters: number;
  importedLocations: number;
  styleImported: boolean;
  errors: string[];
}

// ============================================================================
// EpisodeReferenceService Class
// ============================================================================

export class EpisodeReferenceService {
  private projectPath: string = '';
  private linkedEpisodes: Map<string, LinkedEpisode> = new Map();
  private referenceSheetService: ReferenceSheetService | null = null;
  private consistencyEngine: typeof consistencyEngine | null = null;

  /**
   * Initialize the service with required dependencies
   */
  async initialize(
    projectPath: string,
    refSheetService: ReferenceSheetService,
    consEngine: typeof consistencyEngine
  ): Promise<void> {
    this.projectPath = projectPath;
    this.referenceSheetService = refSheetService;
    this.consistencyEngine = consEngine;
    await this.loadLinkedEpisodes();
    console.log('[EpisodeReferenceService] Initialized');
  }

  /**
   * Set project path for file operations
   */
  setProjectPath(projectPath: string): void {
    this.projectPath = projectPath;
  }

  // ============================================================================
  // Episode Reference Management
  // ============================================================================

  /**
   * Link current sequence to previous episode
   */
  async linkToPreviousEpisode(
    sequenceId: string,
    episodeId: string,
    episodeName: string,
    referenceShotIds: string[] = [],
    continuityNotes: string[] = []
  ): Promise<void> {
    if (!this.projectPath) {
      throw new Error('Project path not set. Call initialize() first.');
    }

    const linkedEpisode: LinkedEpisode = {
      episodeId,
      episodeName,
      linkedAt: new Date(),
      sequences: [sequenceId],
      importedCharacterIds: [],
      importedLocationIds: [],
      styleImported: false,
    };

    // Check if episode is already linked
    const existingLink = this.findLinkedEpisode(episodeId);
    if (existingLink) {
      if (!existingLink.sequences.includes(sequenceId)) {
        existingLink.sequences.push(sequenceId);
      }
      this.linkedEpisodes.set(existingLink.episodeId, existingLink);
    } else {
      this.linkedEpisodes.set(episodeId, linkedEpisode);
    }

    // Add to sequence reference sheet
    await this.addEpisodeReferenceToSequence(sequenceId, episodeId, episodeName, referenceShotIds, continuityNotes);

    await this.saveLinkedEpisodes();
    console.log('[EpisodeReferenceService] Linked sequence', sequenceId, 'to episode', episodeId);
  }

  /**
   * Get previous episode references for a sequence
   */
  async getPreviousEpisodeReferences(sequenceId: string): Promise<PreviousEpisodeReference[]> {
    const sequenceSheet = await this.referenceSheetService?.getSequenceReferenceSheet(sequenceId);
    return sequenceSheet?.episodeReferences || [];
  }

  /**
   * Remove episode reference
   */
  async removeEpisodeReference(sequenceId: string, episodeId: string): Promise<void> {
    // Remove from linked episodes
    const linkedEpisode = this.linkedEpisodes.get(episodeId);
    if (linkedEpisode) {
      linkedEpisode.sequences = linkedEpisode.sequences.filter(id => id !== sequenceId);
      if (linkedEpisode.sequences.length === 0) {
        this.linkedEpisodes.delete(episodeId);
      } else {
        this.linkedEpisodes.set(episodeId, linkedEpisode);
      }
    }

    // Remove from sequence reference sheet
    const sequenceSheet = await this.referenceSheetService?.getSequenceReferenceSheet(sequenceId);
    if (sequenceSheet) {
      sequenceSheet.episodeReferences = sequenceSheet.episodeReferences.filter(
        (ref: PreviousEpisodeReference) => ref.episodeId !== episodeId
      );
      await this.referenceSheetService!.updateSequenceReferenceSheet(sequenceSheet);
    }

    await this.saveLinkedEpisodes();
    console.log('[EpisodeReferenceService] Removed reference to episode', episodeId, 'from sequence', sequenceId);
  }

  /**
   * Get all linked episodes in project
   */
  getAllLinkedEpisodes(projectId: string): LinkedEpisode[] {
    return Array.from(this.linkedEpisodes.values());
  }

  // ============================================================================
  // Continuity Validation
  // ============================================================================

  /**
   * Validate continuity with previous episode
   */
  async validateContinuity(currentSequenceId: string, episodeId: string): Promise<ContinuityValidationResult> {
    const characterIssues: ContinuityIssue[] = [];
    const locationIssues: ContinuityIssue[] = [];
    let styleScore = 100;

    // Validate character continuity
    const characterStatus = await this.getCharacterContinuityStatus(currentSequenceId, episodeId);
    for (const status of characterStatus) {
      if (status.hasBreak) {
        characterIssues.push({
          id: uuidv4(),
          shotId: status.lastAppearance.shotId,
          prevShotId: status.lastAppearance.shotId,
          issueType: 'visual',
          description: `Character "${status.characterName}" continuity break detected`,
          confidence: 1 - (status.consistencyScore / 100),
        });
      }
    }

    // Validate location continuity
    const locationStatus = await this.getLocationContinuityStatus(currentSequenceId, episodeId);
    for (const status of locationStatus) {
      if (status.hasBreak) {
        locationIssues.push({
          id: uuidv4(),
          shotId: status.lastAppearance.shotId,
          prevShotId: status.lastAppearance.shotId,
          issueType: 'visual',
          description: `Location "${status.locationName}" continuity break detected`,
          confidence: 1 - (status.consistencyScore / 100),
        });
      }
    }

    // Calculate scores
    const characterScore = characterStatus.length > 0
      ? characterStatus.reduce((sum, s) => sum + s.consistencyScore, 0) / characterStatus.length
      : 100;
    const locationScore = locationStatus.length > 0
      ? locationStatus.reduce((sum, s) => sum + s.consistencyScore, 0) / locationStatus.length
      : 100;
    const overallScore = (characterScore + locationScore + styleScore) / 3;

    // Generate suggestions
    const suggestions = this.generateContinuitySuggestions(
      characterIssues,
      locationIssues,
      currentSequenceId
    );

    return {
      isValid: overallScore >= 70,
      overallScore,
      characterScore,
      locationScore,
      styleScore,
      issues: [...characterIssues, ...locationIssues],
      suggestions,
    };
  }

  /**
   * Detect specific continuity issues
   */
  async detectContinuityIssues(currentSequenceId: string, episodeId: string): Promise<ContinuityIssue[]> {
    const issues: ContinuityIssue[] = [];

    // Check character continuity issues
    const characterStatus = await this.getCharacterContinuityStatus(currentSequenceId, episodeId);
    for (const status of characterStatus) {
      if (status.hasBreak) {
        issues.push({
          id: uuidv4(),
          shotId: status.lastAppearance.shotId,
          prevShotId: status.lastAppearance.shotId,
          issueType: 'visual',
          description: `Character "${status.characterName}" appearance mismatch`,
          confidence: 1 - (status.consistencyScore / 100),
        });
      }
    }

    // Check location continuity issues
    const locationStatus = await this.getLocationContinuityStatus(currentSequenceId, episodeId);
    for (const status of locationStatus) {
      if (status.hasBreak) {
        issues.push({
          id: uuidv4(),
          shotId: status.lastAppearance.shotId,
          prevShotId: status.lastAppearance.shotId,
          issueType: 'visual',
          description: `Location "${status.locationName}" environment mismatch`,
          confidence: 1 - (status.consistencyScore / 100),
        });
      }
    }

    return issues;
  }

  /**
   * Suggest fixes for continuity issues
   */
  suggestContinuityFixes(issue: ContinuityIssue): ContinuityFix[] {
    const fixes: ContinuityFix[] = [];

    switch (issue.issueType) {
      case 'visual':
        fixes.push({
          id: uuidv4(),
          description: 'Regenerate shot with improved character/location references',
          action: 'regenerate',
          targetShotId: issue.shotId,
        });
        fixes.push({
          id: uuidv4(),
          description: 'Import reference from previous episode for consistency',
          action: 'import_reference',
          targetShotId: issue.shotId,
          referenceUrl: issue.suggestedFrameMatch,
        });
        break;
      case 'temporal':
        fixes.push({
          id: uuidv4(),
          description: 'Adjust prompt to match temporal context',
          action: 'adjust_prompt',
          targetShotId: issue.shotId,
        });
        break;
      case 'spatial':
        fixes.push({
          id: uuidv4(),
          description: 'Manual editing required to adjust spatial continuity',
          action: 'manual_edit',
          targetShotId: issue.shotId,
        });
        break;
    }

    return fixes;
  }

  // ============================================================================
  // Character/Location Continuity
  // ============================================================================

  /**
   * Get character consistency status
   */
  async getCharacterContinuityStatus(
    sequenceId: string,
    episodeId: string
  ): Promise<CharacterContinuityStatus[]> {
    const statusList: CharacterContinuityStatus[] = [];

    const sequenceSheet = await this.referenceSheetService?.getSequenceReferenceSheet(sequenceId);
    if (!sequenceSheet) return statusList;

    const masterSheet = await this.referenceSheetService?.getMasterReferenceSheet(sequenceSheet.masterSheetId);
    if (!masterSheet) return statusList;

    for (const charSheet of masterSheet.characterSheets) {
      const lastAppearance = await this.findLastCharacterAppearance(charSheet.characterId, episodeId);
      const consistencyScore = lastAppearance ? await this.calculateCharacterConsistency(charSheet, lastAppearance) : 100;

      statusList.push({
        characterId: charSheet.characterId,
        characterName: charSheet.characterName,
        lastAppearance: lastAppearance || {
          episodeId: '',
          sequenceId: '',
          shotId: '',
          appearanceImageUrl: '',
        },
        consistencyScore,
        hasBreak: consistencyScore < 70,
      });
    }

    return statusList;
  }

  /**
   * Get location consistency status
   */
  async getLocationContinuityStatus(
    sequenceId: string,
    episodeId: string
  ): Promise<LocationContinuityStatus[]> {
    const statusList: LocationContinuityStatus[] = [];

    const sequenceSheet = await this.referenceSheetService?.getSequenceReferenceSheet(sequenceId);
    if (!sequenceSheet) return statusList;

    const masterSheet = await this.referenceSheetService?.getMasterReferenceSheet(sequenceSheet.masterSheetId);
    if (!masterSheet) return statusList;

    for (const locSheet of masterSheet.locationSheets) {
      const lastAppearance = await this.findLastLocationAppearance(locSheet.locationId, episodeId);
      const consistencyScore = lastAppearance ? await this.calculateLocationConsistency(locSheet, lastAppearance) : 100;

      statusList.push({
        locationId: locSheet.locationId,
        locationName: locSheet.locationName,
        lastAppearance: lastAppearance || {
          episodeId: '',
          sequenceId: '',
          shotId: '',
          referenceImageUrl: '',
        },
        consistencyScore,
        hasBreak: consistencyScore < 70,
      });
    }

    return statusList;
  }

  /**
   * Flag specific continuity breaks
   */
  async flagContinuityBreaks(sequenceId: string, episodeId: string): Promise<ContinuityBreak[]> {
    const breaks: ContinuityBreak[] = [];

    const characterStatus = await this.getCharacterContinuityStatus(sequenceId, episodeId);
    for (const status of characterStatus) {
      if (status.hasBreak) {
        breaks.push({
          type: 'character',
          elementId: status.characterId,
          elementName: status.characterName,
          previousAppearance: {
            episodeId: status.lastAppearance.episodeId,
            sequenceId: status.lastAppearance.sequenceId,
            shotId: status.lastAppearance.shotId,
          },
          currentAppearance: {
            sequenceId,
            shotId: '',
          },
          suggestedFix: `Import reference image from episode ${status.lastAppearance.episodeId} for character ${status.characterName}`,
        });
      }
    }

    const locationStatus = await this.getLocationContinuityStatus(sequenceId, episodeId);
    for (const status of locationStatus) {
      if (status.hasBreak) {
        breaks.push({
          type: 'location',
          elementId: status.locationId,
          elementName: status.locationName,
          previousAppearance: {
            episodeId: status.lastAppearance.episodeId,
            sequenceId: status.lastAppearance.sequenceId,
            shotId: status.lastAppearance.shotId,
          },
          currentAppearance: {
            sequenceId,
            shotId: '',
          },
          suggestedFix: `Import reference image from episode ${status.lastAppearance.episodeId} for location ${status.locationName}`,
        });
      }
    }

    return breaks;
  }

  // ============================================================================
  // Reference Import
  // ============================================================================

  /**
   * Import references from episode
   */
  async importReferencesFromEpisode(
    sourceEpisodeId: string,
    targetSequenceId: string,
    types: ('character' | 'location' | 'style')[]
  ): Promise<ImportResult> {
    const result: ImportResult = {
      success: true,
      importedCharacters: 0,
      importedLocations: 0,
      styleImported: false,
      errors: [],
    };

    try {
      // Get source episode's master sheet
      const sourceMasterSheet = await this.getEpisodeMasterSheet(sourceEpisodeId);
      if (!sourceMasterSheet) {
        result.errors.push(`Source episode ${sourceEpisodeId} not found`);
        result.success = false;
        return result;
      }

      // Get target sequence sheet
      const targetSequenceSheet = await this.referenceSheetService?.getSequenceReferenceSheet(targetSequenceId);
      if (!targetSequenceSheet) {
        result.errors.push(`Target sequence ${targetSequenceId} not found`);
        result.success = false;
        return result;
      }

      const targetMasterSheet = await this.referenceSheetService!.getMasterReferenceSheet(targetSequenceSheet.masterSheetId);
      if (!targetMasterSheet) {
        result.errors.push(`Target master sheet not found`);
        result.success = false;
        return result;
      }

      // Import characters
      if (types.includes('character')) {
        for (const charSheet of sourceMasterSheet.characterSheets) {
          const existingIndex = targetMasterSheet.characterSheets.findIndex(
            (c: CharacterAppearanceSheet) => c.characterId === charSheet.characterId
          );
          if (existingIndex === -1) {
            targetMasterSheet.characterSheets.push(charSheet);
            targetSequenceSheet.inheritedCharacters.push(charSheet.characterId);
            result.importedCharacters++;
          }
        }
      }

      // Import locations
      if (types.includes('location')) {
        for (const locSheet of sourceMasterSheet.locationSheets) {
          const existingIndex = targetMasterSheet.locationSheets.findIndex(
            (l: LocationAppearanceSheet) => l.locationId === locSheet.locationId
          );
          if (existingIndex === -1) {
            targetMasterSheet.locationSheets.push(locSheet);
            targetSequenceSheet.inheritedLocations.push(locSheet.locationId);
            result.importedLocations++;
          }
        }
      }

      // Import style
      if (types.includes('style')) {
        targetMasterSheet.styleSheet = sourceMasterSheet.styleSheet;
        targetSequenceSheet.sequenceStyle.styleOverrides.push('imported_from_episode');
        result.styleImported = true;
      }

      // Update target sheets
      await this.referenceSheetService!.updateMasterReferenceSheet(targetMasterSheet);
      await this.referenceSheetService!.updateSequenceReferenceSheet(targetSequenceSheet);

      // Update linked episode record
      await this.updateLinkedEpisode(sourceEpisodeId, targetSequenceId, result);

      console.log('[EpisodeReferenceService] Imported references from episode', sourceEpisodeId);
    } catch (error) {
      result.errors.push(`Import failed: ${error}`);
      result.success = false;
    }

    return result;
  }

  /**
   * Import specific character references
   */
  async importCharacterReferences(
    sourceEpisodeId: string,
    targetSequenceId: string,
    characterIds: string[]
  ): Promise<void> {
    const sourceMasterSheet = await this.getEpisodeMasterSheet(sourceEpisodeId);
    if (!sourceMasterSheet) {
      throw new Error(`Source episode ${sourceEpisodeId} not found`);
    }

    const targetSequenceSheet = await this.referenceSheetService?.getSequenceReferenceSheet(targetSequenceId);
    if (!targetSequenceSheet) {
      throw new Error(`Target sequence ${targetSequenceId} not found`);
    }

    const targetMasterSheet = await this.referenceSheetService!.getMasterReferenceSheet(targetSequenceSheet.masterSheetId);
    if (!targetMasterSheet) {
      throw new Error('Target master sheet not found');
    }

    for (const charSheet of sourceMasterSheet.characterSheets) {
      if (characterIds.includes(charSheet.characterId)) {
        const existingIndex = targetMasterSheet.characterSheets.findIndex(
          (c: CharacterAppearanceSheet) => c.characterId === charSheet.characterId
        );
        if (existingIndex === -1) {
          targetMasterSheet.characterSheets.push(charSheet);
          targetSequenceSheet.inheritedCharacters.push(charSheet.characterId);
        }
      }
    }

    await this.referenceSheetService!.updateMasterReferenceSheet(targetMasterSheet);
    await this.referenceSheetService!.updateSequenceReferenceSheet(targetSequenceSheet);
    console.log('[EpisodeReferenceService] Imported character references:', characterIds);
  }

  /**
   * Import specific location references
   */
  async importLocationReferences(
    sourceEpisodeId: string,
    targetSequenceId: string,
    locationIds: string[]
  ): Promise<void> {
    const sourceMasterSheet = await this.getEpisodeMasterSheet(sourceEpisodeId);
    if (!sourceMasterSheet) {
      throw new Error(`Source episode ${sourceEpisodeId} not found`);
    }

    const targetSequenceSheet = await this.referenceSheetService?.getSequenceReferenceSheet(targetSequenceId);
    if (!targetSequenceSheet) {
      throw new Error(`Target sequence ${targetSequenceId} not found`);
    }

    const targetMasterSheet = await this.referenceSheetService!.getMasterReferenceSheet(targetSequenceSheet.masterSheetId);
    if (!targetMasterSheet) {
      throw new Error('Target master sheet not found');
    }

    for (const locSheet of sourceMasterSheet.locationSheets) {
      if (locationIds.includes(locSheet.locationId)) {
        const existingIndex = targetMasterSheet.locationSheets.findIndex(
          (l: LocationAppearanceSheet) => l.locationId === locSheet.locationId
        );
        if (existingIndex === -1) {
          targetMasterSheet.locationSheets.push(locSheet);
          targetSequenceSheet.inheritedLocations.push(locSheet.locationId);
        }
      }
    }

    await this.referenceSheetService!.updateMasterReferenceSheet(targetMasterSheet);
    await this.referenceSheetService!.updateSequenceReferenceSheet(targetSequenceSheet);
    console.log('[EpisodeReferenceService] Imported location references:', locationIds);
  }

  /**
   * Import style sheet from episode
   */
  async importStyleReferences(sourceEpisodeId: string, targetSequenceId: string): Promise<void> {
    const sourceMasterSheet = await this.getEpisodeMasterSheet(sourceEpisodeId);
    if (!sourceMasterSheet) {
      throw new Error(`Source episode ${sourceEpisodeId} not found`);
    }

    const targetSequenceSheet = await this.referenceSheetService?.getSequenceReferenceSheet(targetSequenceId);
    if (!targetSequenceSheet) {
      throw new Error(`Target sequence ${targetSequenceId} not found`);
    }

    const targetMasterSheet = await this.referenceSheetService!.getMasterReferenceSheet(targetSequenceSheet.masterSheetId);
    if (!targetMasterSheet) {
      throw new Error('Target master sheet not found');
    }

    // Import style sheet
    targetMasterSheet.styleSheet = sourceMasterSheet.styleSheet;
    targetSequenceSheet.sequenceStyle.styleOverrides.push('imported_style_from_episode');

    await this.referenceSheetService!.updateMasterReferenceSheet(targetMasterSheet);
    await this.referenceSheetService!.updateSequenceReferenceSheet(targetSequenceSheet);
    console.log('[EpisodeReferenceService] Imported style references from episode', sourceEpisodeId);
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async loadLinkedEpisodes(): Promise<void> {
    // In a real implementation, this would load from file
    this.linkedEpisodes.clear();
  }

  private async saveLinkedEpisodes(): Promise<void> {
    // In a real implementation, this would save to file
    console.log('[EpisodeReferenceService] Saved linked episodes:', this.linkedEpisodes.size);
  }

  private findLinkedEpisode(episodeId: string): LinkedEpisode | undefined {
    return this.linkedEpisodes.get(episodeId);
  }

  private async addEpisodeReferenceToSequence(
    sequenceId: string,
    episodeId: string,
    episodeName: string,
    referenceShotIds: string[],
    continuityNotes: string[]
  ): Promise<void> {
    const sequenceSheet = await this.referenceSheetService?.getSequenceReferenceSheet(sequenceId);
    if (sequenceSheet) {
      const existingRef = sequenceSheet.episodeReferences.find((ref: PreviousEpisodeReference) => ref.episodeId === episodeId);
      if (!existingRef) {
        sequenceSheet.episodeReferences.push({
          episodeId,
          episodeName,
          referenceShotIds,
          continuityNotes,
        });
        await this.referenceSheetService!.updateSequenceReferenceSheet(sequenceSheet);
      }
    }
  }

  private async getEpisodeMasterSheet(episodeId: string): Promise<MasterReferenceSheet | null> {
    // In a real implementation, this would look up the episode's master sheet
    // For now, return null as placeholder
    console.log('[EpisodeReferenceService] Looking up master sheet for episode:', episodeId);
    return null;
  }

  private async updateLinkedEpisode(
    episodeId: string,
    sequenceId: string,
    result: ImportResult
  ): Promise<void> {
    const linkedEpisode = this.linkedEpisodes.get(episodeId);
    if (linkedEpisode) {
      if (!linkedEpisode.sequences.includes(sequenceId)) {
        linkedEpisode.sequences.push(sequenceId);
      }
      linkedEpisode.importedCharacterIds.push(...result.importedCharacters as unknown as string[]);
      linkedEpisode.importedLocationIds.push(...result.importedLocations as unknown as string[]);
      linkedEpisode.styleImported = result.styleImported || linkedEpisode.styleImported;
      this.linkedEpisodes.set(episodeId, linkedEpisode);
    }
  }

  private async findLastCharacterAppearance(
    characterId: string,
    episodeId: string
  ): Promise<{ episodeId: string; sequenceId: string; shotId: string; appearanceImageUrl: string } | null> {
    // Placeholder - would look up actual last appearance in episode data
    return null;
  }

  private async findLastLocationAppearance(
    locationId: string,
    episodeId: string
  ): Promise<{ episodeId: string; sequenceId: string; shotId: string; referenceImageUrl: string } | null> {
    // Placeholder - would look up actual last appearance in episode data
    return null;
  }

  private async calculateCharacterConsistency(
    charSheet: CharacterAppearanceSheet,
    lastAppearance: { appearanceImageUrl: string }
  ): Promise<number> {
    // Placeholder - would calculate actual consistency score
    return 85;
  }

  private async calculateLocationConsistency(
    locSheet: LocationAppearanceSheet,
    lastAppearance: { referenceImageUrl: string }
  ): Promise<number> {
    // Placeholder - would calculate actual consistency score
    return 85;
  }

  private generateContinuitySuggestions(
    characterIssues: ContinuityIssue[],
    locationIssues: ContinuityIssue[],
    sequenceId: string
  ): ContinuityFix[] {
    const suggestions: ContinuityFix[] = [];

    for (const issue of characterIssues) {
      suggestions.push({
        id: uuidv4(),
        description: `Fix character continuity: ${issue.description}`,
        action: 'import_reference',
        targetShotId: issue.shotId,
      });
    }

    for (const issue of locationIssues) {
      suggestions.push({
        id: uuidv4(),
        description: `Fix location continuity: ${issue.description}`,
        action: 'import_reference',
        targetShotId: issue.shotId,
      });
    }

    return suggestions;
  }
}

// Export singleton instance
export const episodeReferenceService = new EpisodeReferenceService();
